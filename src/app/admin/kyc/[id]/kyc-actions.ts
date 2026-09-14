"use server";

/**
 * ADM3 — KYC/AML workstation actions.
 *
 * All decisions flow through the money/compliance-tested `reviewKyc`. The
 * workstation adds: reason-code rejects, an escalate-to-AML audit hook, and a
 * maker-checker gate for HIGH-RISK approvals (risk ≥ threshold requires a
 * second officer — the recommender cannot also approve). Nothing is fabricated;
 * every step is gated (ADMIN/COMPLIANCE + 2FA) and audited.
 */
import { revalidatePath } from "next/cache";
import { db } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import { twoOfficerGate } from "@/lib/server/two-officer";
import { softRequireStaff } from "@/lib/server/rbac-guard";
import { canView } from "@/lib/server/rbac";
import type { Role } from "@/lib/server/roles";
import { fieldError } from "@/lib/server/field-error";
import { reviewKyc } from "@/lib/server/kyc-service";
import { kycRiskScore, getApprovalRecommendation, KYC_MAKER_CHECKER_THRESHOLD } from "@/lib/server/kyc-risk";
import { parseAttestations } from "@/lib/kyc-attestations";

/** ⭐ DG-S-05 — `field` is optional and additive: every existing refusal below still satisfies
 *  this shape and still renders exactly as it does today. */
type Result = { ok: true } | { ok: false; error: string; field?: string };
type RejectCode = NonNullable<Parameters<typeof reviewKyc>[0]["rejectCode"]>;

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
 *  reason TWICE — once in Swahili, once in ours: "Sababu: Picha ya kitambulisho
 *  ina ukungu au ni nyeusi sana. Document unreadable — please re-upload a clear
 *  photo." 44 of 46 live users are Swahili (campaign §6 E-6). The officer's own
 *  note still goes through verbatim; it is theirs to write, in any language.
 *
 *  `suspected_fraud` maps to OTHER on purpose: the enum has no fraud member,
 *  and a suspected fraudster must not be told what we suspect. Its sentence is
 *  deliberately uninformative for the same reason. */
const REJECT_REASONS: Record<string, { text: string; code: RejectCode }> = {
  document_unreadable: { text: "", code: "BLURRY_DOC" },
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

// ⛔ ONE GATE, NOT A COPY — see the note in `payment-actions.ts` and finding A2.
async function gate(action: string): Promise<{ userId: string; sessionId: string } | { error: string }> {
  const g = await softRequireStaff("compliance", action, "Forbidden: compliance access is required.");
  return g.ok ? { userId: g.userId, sessionId: g.sessionId } : { error: g.error };
}

/** Maker step (high-risk only): recommend approval for a second officer to seal. */
export async function recommendKycApprovalAction(formData: FormData): Promise<Result> {
  const g = await gate("recommendKycApproval");
  if ("error" in g) return { ok: false, error: g.error };
  const userId = String(formData.get("userId") ?? "");
  if (!userId || userId === g.userId) return { ok: false, error: "Cannot recommend on your own submission." };
  const kyc = await db.kyc.findByUserId(userId);
  if (!kyc || (kyc.status !== "PENDING_REVIEW" && kyc.status !== "ADDITIONAL_INFO_REQUIRED")) {
    return { ok: false, error: "Only a submission awaiting review can be recommended." };
  }
  // E-4: the MAKER attests too. The rail arms "Recommend approval" on the same four
  // checks, and a recommendation is what a second officer relies on — so it must
  // carry the same evidence, or the maker-checker gate rests on an unrecorded claim.
  const attest = parseAttestations(formData.get("attestations"));
  if (!attest.ok) {
    audit({ category: "SECURITY", action: "kyc.approve.attestations_missing", actorId: g.userId, targetType: "User", targetId: userId, payload: { reason: attest.error, step: "recommend" } });
    return { ok: false, error: attest.error };
  }
  audit({ category: "COMPLIANCE", action: "kyc.approve.recommended", actorId: g.userId, targetType: "User", targetId: userId, payload: { kycId: kyc.id, attestations: attest.attested } });
  revalidatePath(`/admin/kyc/${userId}`);
  return { ok: true };
}

/** Approve — enforces the maker-checker gate for high-risk submissions. */
export async function approveKycWorkstationAction(formData: FormData): Promise<Result> {
  const g = await gate("approveKycWorkstation");
  if ("error" in g) return { ok: false, error: g.error };
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return { ok: false, error: "Missing user." };

  // E-4. The four officer attestations are REQUIRED here, not merely collected.
  // They used to gate the Approve button client-side only, so this action would
  // approve an identity — opening the withdrawal rail — on a request carrying
  // nothing but a userId. A missing attestation on an approve is either a client
  // bug or a bypass attempt, so it is a SECURITY audit event, not a silent 400.
  const attest = parseAttestations(formData.get("attestations"));
  if (!attest.ok) {
    audit({ category: "SECURITY", action: "kyc.approve.attestations_missing", actorId: g.userId, targetType: "User", targetId: userId, payload: { reason: attest.error } });
    return { ok: false, error: attest.error };
  }

  const risk = await kycRiskScore(userId);
  if (risk.score >= KYC_MAKER_CHECKER_THRESHOLD) {
    const rec = await getApprovalRecommendation(userId);
    if (!rec) return { ok: false, error: `High-risk (score ${risk.score}) — a second officer must first recommend approval.` };
    const conflict = twoOfficerGate({
      makerId: rec.officerId,
      checkerId: g.userId,
      reason: "you recommended this approval; a different officer must seal it.",
      audit: { action: "kyc.approve.conflict_blocked", targetType: "User", targetId: userId, payload: { recommendedBy: rec.officerId } },
    });
    if (conflict) return { ok: false, error: conflict.error };
  }
  const r = await reviewKyc({ officerId: g.userId, userId, decision: "APPROVE" });
  if (!r.ok) return { ok: false, error: r.error ?? "Could not approve." };
  audit({ category: "COMPLIANCE", action: "kyc.workstation.approved", actorId: g.userId, targetType: "User", targetId: userId, payload: { riskScore: risk.score, makerChecker: risk.score >= KYC_MAKER_CHECKER_THRESHOLD, attestations: attest.attested } });
  revalidatePath(`/admin/kyc/${userId}`);
  return { ok: true };
}

/** Reject with a reason code (medium confirm tier in the UI). */
export async function rejectKycWorkstationAction(formData: FormData): Promise<Result> {
  const g = await gate("rejectKycWorkstation");
  if ("error" in g) return { ok: false, error: g.error };
  const userId = String(formData.get("userId") ?? "");
  const code = String(formData.get("reasonCode") ?? "");
  const note = String(formData.get("note") ?? "").trim();
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
  const r = await reviewKyc({ officerId: g.userId, userId, decision: "REJECT", reason, rejectCode: picked.code });
  if (!r.ok) return { ok: false, error: r.error ?? "Could not reject." };
  revalidatePath(`/admin/kyc/${userId}`);
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
