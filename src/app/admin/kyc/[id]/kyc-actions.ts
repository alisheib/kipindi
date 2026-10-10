"use server";

/**
 * ADM3 — KYC/AML workstation actions.
 *
 * All decisions flow through the money/compliance-tested `kyc-service.ts`. The
 * workstation adds: reason-code rejects, an escalate-to-AML audit hook, and a
 * maker-checker gate for HIGH-RISK approvals (risk ≥ threshold requires a
 * second officer — the recommender cannot also approve). Nothing is fabricated;
 * every step is gated (ADMIN/COMPLIANCE + 2FA) and audited.
 *
 * ⭐ ONE DOOR FOR IDENTITY DECISIONS (2026-10-10). Players now verify with typed details and are
 * approved automatically when the checks pass (docs/COMPLIANCE-DECISIONS.md, "2026-10-10 · Players
 * verify identity with typed details"); officers act on the cases routed to them, on agent photo
 * cases, and AFTERWARDS on automatic approvals. Every officer decision is made here — the player
 * page's one-click approve / reject / request-info / force re-verify were deleted the same day, so a
 * decision can no longer be taken on a screen that does not show the checks it rests on.
 *
 * ⛔ EVERY FORM POSTS THE ROW VERSION IT SHOWED (`kycRowVersion`, = `updatedAt`). The service refuses a
 * decision on a row that changed since — a player who corrected their details between the officer
 * opening the case and pressing a button would otherwise be decided on details nobody read. A
 * maker's recommendation is bound to that version too (`getApprovalRecommendation`), so it can never
 * seal a case that changed after it was recommended.
 */
import { revalidatePath } from "next/cache";
import { db } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import { twoOfficerGate } from "@/lib/server/two-officer";
import { softRequireStaff } from "@/lib/server/rbac-guard";
import { canView } from "@/lib/server/rbac";
import type { Role } from "@/lib/server/roles";
import { fieldError } from "@/lib/server/field-error";
import {
  reviewKyc,
  askForCorrections,
  markPostChecked,
  correctDateOfBirth,
  kycRowVersion,
  CORRECTIONS_NOTE_MIN,
  DOB_CORRECTION_REASON_MIN,
} from "@/lib/server/kyc-service";
import { kycRiskScore, getApprovalRecommendation, KYC_MAKER_CHECKER_THRESHOLD } from "@/lib/server/kyc-risk";
import { parseAttestations, isKycAttestationMode, type KycAttestationMode } from "@/lib/kyc-attestations";
import { photoSetComplete } from "@/lib/id-documents";

/** ⭐ DG-S-05 — `field` is optional and additive: every existing refusal below still satisfies
 *  this shape and still renders exactly as it does today. */
type Result = { ok: true } | { ok: false; error: string; field?: string };
type RejectCode = NonNullable<Parameters<typeof reviewKyc>[0]["rejectCode"]>;

/** The freeze reason's floor — `OFFICER_FREEZE_REASON_MIN` in wallet-freeze.ts; the service re-checks it. */
const FREEZE_REASON_MIN = 5;

/** The refusal an officer form gets when it carried no version — the page always posts one. */
const NO_VERSION = "This case changed since you opened it. Reload it and decide again.";

/** The rail's reason codes → the stored `KycRejectReason`, and a fallback
 *  sentence for the codes that have no category to show.
 *
 *  The enum member is what compliance reporting counts and what the player's own
 *  language is looked up from, so it must follow the officer's choice — it used
 *  to be hard-coded OTHER for every rejection.
 *
 *  ⚠️ `text` is used ONLY when the member is `OTHER`. `humanizeRejectReason`
 *  prints nothing for OTHER, so without a sentence the player would be told they
 *  were rejected and nothing else. For every other member the player already
 *  reads a translated category, and prepending this English sentence printed the
 *  reason TWICE — once in Swahili, once in ours (campaign §6 E-6). The officer's own
 *  note still goes through verbatim; it is theirs to write, in any language.
 *
 *  `suspected_fraud` maps to OTHER on purpose: the enum has no fraud member,
 *  and a suspected fraudster must not be told what we suspect. Its sentence is
 *  deliberately uninformative for the same reason.
 *
 *  ⛔ "Document unreadable" (`BLURRY_DOC`) LEFT THE PICKER ON 2026-10-10. A typed case has no image to be
 *  unreadable, and the service refuses the code for a new decision (`isDecidableRefusalCode`); the enum
 *  member stays so the refusals already on file keep their words. */
const REJECT_REASONS: Record<string, { text: string; code: RejectCode }> = {
  mismatch: { text: "", code: "DETAILS_MISMATCH" },
  expired: { text: "", code: "EXPIRED_ID" },
  suspected_fraud: { text: "The submission could not be verified.", code: "OTHER" },
  other: { text: "", code: "OTHER" },
  // ⭐ THE THREE FINAL CODES (2026-09-13). Until then the workstation could not produce any of them,
  // so an officer holding a sixteen-year-old's document could only refuse it as "other" — recoverable,
  // wallet untouched, document released. `reviewKyc` freezes the wallet and keeps the number reserved
  // for exactly these members (`src/lib/kyc-refusal.ts`). Each is a translated category on the
  // player's screen, so no English sentence is prepended (§6 E-6) — and SANCTIONED says nothing about a list.
  underage: { text: "", code: "UNDERAGE" },
  sanctioned: { text: "", code: "SANCTIONED" },
  duplicate_identity: { text: "", code: "DUPLICATE_IDENTITY" },
};

// ⛔ ONE GATE, NOT A COPY — see the note in `payment-actions.ts` and finding A2. It is the compliance
// grant AND the step-up second factor (`softRequireStaff`), for every action on this page.
async function gate(action: string): Promise<{ userId: string; sessionId: string } | { error: string }> {
  const g = await softRequireStaff("compliance", action, "Forbidden: compliance access is required.");
  return g.ok ? { userId: g.userId, sessionId: g.sessionId } : { error: g.error };
}

/** Which attestation set THIS case takes — decided from the row on the server, never from the form. */
function caseMode(kyc: { idType?: string | null; documents?: ReadonlyArray<{ docType: string }> | null }): KycAttestationMode {
  return photoSetComplete(kyc.idType, (kyc.documents ?? []).map((d) => d.docType)) ? "photo" : "typed";
}

/** "Also freeze the wallet" as the form posted it — validated before anything is decided. */
function freezeFromForm(formData: FormData): { alsoFreeze: boolean; freezeReason: string } {
  return {
    alsoFreeze: String(formData.get("alsoFreeze") ?? "") === "1",
    freezeReason: String(formData.get("freezeReason") ?? "").trim().slice(0, 300),
  };
}

/** Every page that shows this case's state. */
function revalidateCase(userId: string): void {
  revalidatePath(`/admin/kyc/${userId}`);
  revalidatePath("/admin/kyc");
  revalidatePath("/admin/approvals");
  revalidatePath(`/admin/players/${userId}`);
}

/** Maker step (high-risk only): recommend approval for a second officer to seal. */
export async function recommendKycApprovalAction(formData: FormData): Promise<Result> {
  const g = await gate("recommendKycApproval");
  if ("error" in g) return { ok: false, error: g.error };
  const userId = String(formData.get("userId") ?? "");
  const version = String(formData.get("version") ?? "");
  if (!userId || userId === g.userId) return { ok: false, error: "Cannot recommend on your own submission." };
  if (!version) return { ok: false, error: NO_VERSION };
  const kyc = await db.kyc.findByUserId(userId);
  // ⛔ PENDING_REVIEW ONLY (2026-10-10). A file we asked corrections of is the PLAYER's move; it used to be
  // recommendable here while `reviewKyc` refused to approve it, so a recommendation could wait for a case it never fit.
  if (!kyc || kyc.status !== "PENDING_REVIEW") {
    return { ok: false, error: "Only a submission awaiting review can be recommended." };
  }
  if (kycRowVersion(kyc) !== version) return { ok: false, error: NO_VERSION };
  // E-4: the MAKER attests too. The rail arms "Recommend approval" on the same four
  // checks, and a recommendation is what a second officer relies on — so it must
  // carry the same evidence, or the maker-checker gate rests on an unrecorded claim.
  const mode = caseMode(kyc);
  const attest = parseAttestations(formData.get("attestations"), mode);
  if (!attest.ok) {
    audit({ category: "SECURITY", action: "kyc.approve.attestations_missing", actorId: g.userId, targetType: "User", targetId: userId, payload: { reason: attest.error, step: "recommend", mode } });
    return { ok: false, error: attest.error };
  }
  // ⭐ BOUND TO THE VERSION (2026-10-10). `getApprovalRecommendation(userId, version)` only ever finds a recommendation
  // whose `payload.version` is the row the sealing officer is looking at — any write to the case moves `updatedAt`, so
  // a recommendation made before the player corrected a detail can never seal the corrected case.
  audit({ category: "COMPLIANCE", action: "kyc.approve.recommended", actorId: g.userId, targetType: "User", targetId: userId, payload: { kycId: kyc.id, version: kycRowVersion(kyc), attestationSet: attest.setId, attestations: attest.attested } });
  revalidatePath(`/admin/kyc/${userId}`);
  return { ok: true };
}

/** Approve — enforces the maker-checker gate for high-risk submissions. */
export async function approveKycWorkstationAction(formData: FormData): Promise<Result> {
  const g = await gate("approveKycWorkstation");
  if ("error" in g) return { ok: false, error: g.error };
  const userId = String(formData.get("userId") ?? "");
  const version = String(formData.get("version") ?? "");
  const postedMode = String(formData.get("mode") ?? "");
  if (!userId) return { ok: false, error: "Missing user." };
  if (!version) return { ok: false, error: NO_VERSION };
  const kyc = await db.kyc.findByUserId(userId);
  if (!kyc) return { ok: false, error: "No KYC submission for this user." };
  // ⛔ THE CASE DECIDES THE SET, NOT THE FORM. A form that posts "typed" for a case whose photos are on file (or the
  // reverse) was rendered for a different case — the photos arrived, or a restart cleared them, since it was opened.
  const mode = caseMode(kyc);
  if (!isKycAttestationMode(postedMode) || postedMode !== mode) {
    return { ok: false, error: `This is a ${mode} case now — reload it and confirm the ${mode} checks.` };
  }

  // E-4. The four officer attestations are REQUIRED here, not merely collected.
  // They used to gate the Approve button client-side only, so this action would
  // approve an identity — opening the withdrawal rail — on a request carrying
  // nothing but a userId. A missing attestation on an approve is either a client
  // bug or a bypass attempt, so it is a SECURITY audit event, not a silent 400.
  const attest = parseAttestations(formData.get("attestations"), mode);
  if (!attest.ok) {
    audit({ category: "SECURITY", action: "kyc.approve.attestations_missing", actorId: g.userId, targetType: "User", targetId: userId, payload: { reason: attest.error, mode } });
    return { ok: false, error: attest.error };
  }

  const risk = await kycRiskScore(userId).catch(() => null);
  // ⛔ A risk score that cannot be read is not a low one — the two-officer rule would silently not apply.
  if (!risk) return { ok: false, error: "The risk score could not be read, so the two-officer rule cannot be checked. Try again." };
  if (risk.score >= KYC_MAKER_CHECKER_THRESHOLD) {
    const rec = await getApprovalRecommendation(userId, version);
    if (!rec) return { ok: false, error: `High-risk (score ${risk.score}) — a second officer must first recommend approval of this version of the case.` };
    const conflict = twoOfficerGate({
      makerId: rec.officerId,
      checkerId: g.userId,
      reason: "you recommended this approval; a different officer must seal it.",
      audit: { action: "kyc.approve.conflict_blocked", targetType: "User", targetId: userId, payload: { recommendedBy: rec.officerId } },
    });
    if (conflict) return { ok: false, error: conflict.error };
  }
  const r = await reviewKyc({ officerId: g.userId, userId, decision: "APPROVE", version, mode, attestations: attest.attested, via: "workstation" });
  if (!r.ok) return { ok: false, error: r.error ?? "Could not approve." };
  audit({ category: "COMPLIANCE", action: "kyc.workstation.approved", actorId: g.userId, targetType: "User", targetId: userId, payload: { riskScore: risk.score, makerChecker: risk.score >= KYC_MAKER_CHECKER_THRESHOLD, attestationSet: attest.setId, attestations: attest.attested } });
  revalidateCase(userId);
  return { ok: true };
}

/** Reject with a reason code (medium confirm tier in the UI) — recoverable or FINAL, with an optional freeze. ⭐ Since
 *  2026-10-10 also from "corrections asked" (the rail's `with_player` stage), and the freeze is REQUIRED on a recoverable
 *  reject of an automatic approval no officer has checked — the rail ticks and locks it; `reviewKyc` refuses one without. */
export async function rejectKycWorkstationAction(formData: FormData): Promise<Result> {
  const g = await gate("rejectKycWorkstation");
  if ("error" in g) return { ok: false, error: g.error };
  const userId = String(formData.get("userId") ?? "");
  const version = String(formData.get("version") ?? "");
  const code = String(formData.get("reasonCode") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const { alsoFreeze, freezeReason } = freezeFromForm(formData);
  if (!version) return { ok: false, error: NO_VERSION };
  const picked = REJECT_REASONS[code];
  if (picked === undefined) return fieldError("reasonCode", "Pick a rejection reason.");
  // `picked.text` is empty for every code that maps to a translated enum member
  // — the player reads the category in their OWN language, so prepending our
  // English sentence printed the reason twice (§6 E-6). It is non-empty only for
  // OTHER, which shows no category at all.
  const reason = `${picked.text}${picked.text && note ? " " : ""}${note}`.trim();
  // A rejection must leave the player something they can read. A categorised
  // one already does, in their language, so the officer's note is optional
  // there; an OTHER rejection has nothing else, so it still needs words.
  if (picked.code === "OTHER" && reason.length < 5) {
    /* ⭐ The address is the NOTE, not the reason code: the code is already correct (it is
       OTHER), and it is the note that is missing. A refusal that pointed at the select would
       send the officer to the one field they had filled in properly. */
    return fieldError("note", "Add a short explanation (5+ characters).");
  }
  if (alsoFreeze && freezeReason.length < FREEZE_REASON_MIN) return fieldError("freezeReason", `Say why the wallet is frozen (${FREEZE_REASON_MIN}+ characters).`);
  const r = await reviewKyc({ officerId: g.userId, userId, decision: "REJECT", version, reason, rejectCode: picked.code, alsoFreeze, freezeReason });
  if (!r.ok) return { ok: false, error: r.error ?? "Could not reject." };
  revalidateCase(userId);
  return { ok: true };
}

/**
 * ⭐ ASK FOR CORRECTIONS (2026-10-10) — the one ask an officer has of a player now: correct the typed details, with a
 * note the player reads. It replaces "request more info" (extra documents) and "force re-verify". It moves NO money;
 * "Also freeze the wallet" is offered on the same form for an officer who needs money to stop.
 */
export async function askForCorrectionsAction(formData: FormData): Promise<Result> {
  const g = await gate("askForCorrections");
  if ("error" in g) return { ok: false, error: g.error };
  const userId = String(formData.get("userId") ?? "");
  const version = String(formData.get("version") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);
  const { alsoFreeze, freezeReason } = freezeFromForm(formData);
  if (!userId) return { ok: false, error: "Missing player." };
  if (!version) return { ok: false, error: NO_VERSION };
  if (note.length < CORRECTIONS_NOTE_MIN) return fieldError("note", `Tell the player what to correct (${CORRECTIONS_NOTE_MIN}+ characters).`);
  if (alsoFreeze && freezeReason.length < FREEZE_REASON_MIN) return fieldError("freezeReason", `Say why the wallet is frozen (${FREEZE_REASON_MIN}+ characters).`);
  const r = await askForCorrections(g.userId, userId, { note, version, alsoFreeze, freezeReason });
  if (!r.ok) return { ok: false, error: r.error ?? "Could not ask for corrections." };
  revalidateCase(userId);
  return { ok: true };
}

/**
 * ⭐ MARK AN AUTOMATIC APPROVAL CHECKED (2026-10-10) — the officer's after-the-fact look at an identity the checks
 * approved on their own. The TYPED attestation set is required (it acknowledges the number's flags); a case that
 * should never have been approved is refused by the service, and the officer rejects it or asks for corrections.
 */
export async function markPostCheckedAction(formData: FormData): Promise<Result> {
  const g = await gate("markPostChecked");
  if ("error" in g) return { ok: false, error: g.error };
  const userId = String(formData.get("userId") ?? "");
  const version = String(formData.get("version") ?? "");
  if (!userId) return { ok: false, error: "Missing player." };
  if (!version) return { ok: false, error: NO_VERSION };
  const attest = parseAttestations(formData.get("attestations"), "typed");
  if (!attest.ok) {
    audit({ category: "SECURITY", action: "kyc.post_check.attestations_missing", actorId: g.userId, targetType: "User", targetId: userId, payload: { reason: attest.error } });
    return { ok: false, error: attest.error };
  }
  const r = await markPostChecked(g.userId, userId, { version, attestations: attest.attested });
  if (!r.ok) return { ok: false, error: r.error ?? "Could not mark this approval checked." };
  revalidateCase(userId);
  return { ok: true };
}

/**
 * ⭐ CORRECT THE ACCOUNT'S DATE OF BIRTH (2026-10-10) — the only fix for a wrong sign-up date, now that the identity
 * step takes the account's date instead of asking for one. Compliance grant + step-up (`gate`), a written reason; the
 * service re-runs the age gate (under 18 → the FINAL refusal path) and otherwise sends the identity to an officer.
 * ⛔ The date never enters the audit chain; only the reason's length does (`kyc.dob_corrected`).
 */
export async function correctDateOfBirthAction(formData: FormData): Promise<Result> {
  const g = await gate("correctDateOfBirth");
  if ("error" in g) return { ok: false, error: g.error };
  const userId = String(formData.get("userId") ?? "");
  const version = String(formData.get("version") ?? "");
  const dob = String(formData.get("dob") ?? "").trim().slice(0, 10);
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);
  if (!userId) return { ok: false, error: "Missing player." };
  if (!version) return { ok: false, error: NO_VERSION };
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(dob)) return fieldError("dob", "Enter the date of birth in full.");
  if (reason.length < DOB_CORRECTION_REASON_MIN) return fieldError("reason", `A reason of at least ${DOB_CORRECTION_REASON_MIN} characters is required.`);
  const r = await correctDateOfBirth(g.userId, userId, { dob, reason, version });
  if (!r.ok) return { ok: false, error: r.error ?? "Could not correct the date of birth." };
  revalidateCase(userId);
  return { ok: true };
}

/**
 * ⭐ S1 — decide a finally-refused player's balance (owner ruling, Ali, 2026-09-13).
 * The gate is the same compliance grant + step-up as every decision on this page; the rules — which
 * outcomes exist, what each moves, the justification, the ordering of money — all live in
 * `refused-funds.ts`, which re-reads the position fresh before anything moves. ⛔ It takes NO lock (a
 * nested lock would hold one transaction open across the gateway call): two officers at once are made
 * safe by the forfeit's compare-and-swap and `withdraw()`'s per-decision idempotency key.
 */
export async function decideRefusedFundsAction(formData: FormData): Promise<{ ok: true; payoutError: string | null } | { ok: false; error: string; field?: string }> {
  const g = await gate("decideRefusedFunds");
  if ("error" in g) return { ok: false, error: g.error };
  const userId = String(formData.get("userId") ?? "");
  // ⛔ A ROLE THAT MAY NOT SEE A BALANCE MAY NOT MOVE ONE (audit session 95, 2026-09-14). The compliance grant alone
  // let a role without money rights return or forfeit a balance its own case page does not show it. Money rights are
  // the question every money surface asks before it renders a shilling (view on the accounting domain), asked again
  // here because the page is manners and this action is the law. A refused attempt is a SECURITY row, like every
  // bypass this file records.
  const officer = await db.user.findById(g.userId);
  if (!officer || !(await canView(officer.role as Role, "accounting"))) {
    audit({ category: "SECURITY", action: "kyc.refused_funds.money_rights_blocked", actorId: g.userId, targetType: "User", targetId: userId, payload: { role: officer?.role ?? null, domain: "accounting", action: "decideRefusedFunds" } });
    return { ok: false, error: "Deciding a refused player's balance needs money rights as well as compliance. Your role cannot see balances, so it cannot move one — ask an officer whose role can." };
  }
  const outcome = String(formData.get("outcome") ?? "");
  const justification = String(formData.get("justification") ?? "");
  const provider = String(formData.get("provider") ?? "") || null;
  if (!userId) return { ok: false, error: "Missing player." };
  const { decideRefusedFunds } = await import("@/lib/server/refused-funds");
  const { REFUSED_FUNDS_JUSTIFICATION_MIN, isRefusedFundsOutcome, RETURNS_MONEY } = await import("@/lib/refused-funds-outcomes");
  if (!isRefusedFundsOutcome(outcome)) return fieldError("outcome", "Choose an outcome.");
  if (justification.trim().length < REFUSED_FUNDS_JUSTIFICATION_MIN) return fieldError("justification", `Write a justification of at least ${REFUSED_FUNDS_JUSTIFICATION_MIN} characters.`);
  if (RETURNS_MONEY.has(outcome) && !provider) return fieldError("provider", "Choose the network to return the money on.");
  const r = await decideRefusedFunds({ officerId: g.userId, userId, outcome, justification, provider });
  if (!r.ok) return { ok: false, error: r.error };
  revalidatePath(`/admin/kyc/${userId}`);
  revalidatePath("/admin/kyc");
  revalidatePath("/admin/kyc/refused");
  revalidatePath(`/admin/players/${userId}`);
  return { ok: true, payoutError: r.payoutError };
}

/** Re-open a FINAL refusal that was wrong — the only door back after one (S2). */
export async function reopenFinalRefusalWorkstationAction(formData: FormData): Promise<Result> {
  const g = await gate("reopenFinalRefusal");
  if ("error" in g) return { ok: false, error: g.error };
  const userId = String(formData.get("userId") ?? "");
  const reason = String(formData.get("reason") ?? "");
  if (!userId) return { ok: false, error: "Missing player." };
  const { reopenFinalRefusal, REOPEN_FINAL_REFUSAL_REASON_MIN } = await import("@/lib/server/kyc-service");
  if (reason.trim().length < REOPEN_FINAL_REFUSAL_REASON_MIN) return fieldError("reason", `A reason of at least ${REOPEN_FINAL_REFUSAL_REASON_MIN} characters is required.`);
  const r = await reopenFinalRefusal(g.userId, userId, reason);
  if (!r.ok) return { ok: false, error: r.error ?? "Could not re-open." };
  revalidatePath(`/admin/kyc/${userId}`);
  revalidatePath("/admin/kyc");
  revalidatePath("/admin/kyc/refused");
  revalidatePath(`/admin/players/${userId}`);
  return { ok: true };
}

/** Escalate to the AML team — records a compliance-trail event; keeps KYC open. */
export async function escalateKycToAmlAction(formData: FormData): Promise<Result> {
  const g = await gate("escalateKycToAml");
  if ("error" in g) return { ok: false, error: g.error };
  const userId = String(formData.get("userId") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);
  const kyc = await db.kyc.findByUserId(userId);
  if (!kyc) return { ok: false, error: "No KYC submission for this user." };
  audit({ category: "COMPLIANCE", action: "kyc.escalated_to_aml", actorId: g.userId, targetType: "User", targetId: userId, payload: { kycId: kyc.id, note: note || null } });
  revalidatePath(`/admin/kyc/${userId}`);
  return { ok: true };
}
