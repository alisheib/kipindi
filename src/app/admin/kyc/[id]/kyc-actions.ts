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
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import { requireAdminTotp } from "@/lib/server/admin-guard";
import { twoOfficerGate } from "@/lib/server/two-officer";
import { canAct } from "@/lib/server/rbac";
import { reviewKyc } from "@/lib/server/kyc-service";
import { kycRiskScore, getApprovalRecommendation, KYC_MAKER_CHECKER_THRESHOLD } from "@/lib/server/kyc-risk";

type Result = { ok: true } | { ok: false; error: string };
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
};

async function gate(action: string): Promise<{ userId: string; sessionId: string } | { error: string }> {
  const session = await currentSession();
  if (!session) redirect("/auth/admin");
  const user = await db.user.findById(session.userId);
  if (!user || !(user.role === "ADMIN" || (await canAct(user.role, "compliance")))) {
    audit({ category: "SECURITY", action: "privilege_escalation_blocked", actorId: session.userId, targetType: "Action", targetId: action, payload: { role: user?.role ?? "unknown", domain: "compliance" } });
    return { error: "Forbidden: compliance access is required." };
  }
  await requireAdminTotp(session.userId, session.sessionId);
  return { userId: session.userId, sessionId: session.sessionId };
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
  audit({ category: "COMPLIANCE", action: "kyc.approve.recommended", actorId: g.userId, targetType: "User", targetId: userId, payload: { kycId: kyc.id } });
  revalidatePath(`/admin/kyc/${userId}`);
  return { ok: true };
}

/** Approve — enforces the maker-checker gate for high-risk submissions. */
export async function approveKycWorkstationAction(formData: FormData): Promise<Result> {
  const g = await gate("approveKycWorkstation");
  if ("error" in g) return { ok: false, error: g.error };
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return { ok: false, error: "Missing user." };

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
  audit({ category: "COMPLIANCE", action: "kyc.workstation.approved", actorId: g.userId, targetType: "User", targetId: userId, payload: { riskScore: risk.score, makerChecker: risk.score >= KYC_MAKER_CHECKER_THRESHOLD } });
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
  if (picked === undefined) return { ok: false, error: "Pick a rejection reason." };
  // `picked.text` is empty for every code that maps to a translated enum member
  // — the player reads the category in their OWN language, so prepending our
  // English sentence printed the reason twice (§6 E-6). It is non-empty only for
  // OTHER, which shows no category at all.
  const reason = `${picked.text}${picked.text && note ? " " : ""}${note}`.trim();
  // A rejection must leave the player something they can read. A categorised
  // one already does, in their language, so the officer's note is optional
  // there; an OTHER rejection has nothing else, so it still needs words.
  if (picked.code === "OTHER" && reason.length < 5) {
    return { ok: false, error: "Add a short explanation (5+ characters)." };
  }
  const r = await reviewKyc({ officerId: g.userId, userId, decision: "REJECT", reason, rejectCode: picked.code });
  if (!r.ok) return { ok: false, error: r.error ?? "Could not reject." };
  revalidatePath(`/admin/kyc/${userId}`);
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
