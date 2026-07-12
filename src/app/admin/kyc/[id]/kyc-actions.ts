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
import { CEREMONY } from "@/lib/admin-status-lexicon";
import { COMPLIANCE_ROLES } from "@/lib/server/roles";
import { reviewKyc } from "@/lib/server/kyc-service";
import { kycRiskScore, getApprovalRecommendation, KYC_MAKER_CHECKER_THRESHOLD } from "@/lib/server/kyc-risk";

type Result = { ok: true } | { ok: false; error: string };

const REJECT_REASONS: Record<string, string> = {
  document_unreadable: "Document unreadable — please re-upload a clear photo.",
  mismatch: "Details do not match the submitted ID.",
  expired: "The identity document has expired.",
  suspected_fraud: "The submission could not be verified.",
  other: "",
};

async function gate(action: string): Promise<{ userId: string; sessionId: string } | { error: string }> {
  const session = await currentSession();
  if (!session) redirect("/auth/admin");
  const user = await db.user.findById(session.userId);
  if (!user || !COMPLIANCE_ROLES.has(user.role)) {
    audit({ category: "SECURITY", action: "privilege_escalation_blocked", actorId: session.userId, targetType: "Action", targetId: action, payload: { role: user?.role ?? "unknown" } });
    return { error: "Forbidden: ADMIN or COMPLIANCE role required." };
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
    if (rec.officerId === g.userId) return { ok: false, error: `${CEREMONY.secondOfficerRequired.en} — you recommended this approval; a different officer must seal it.` };
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
  const base = REJECT_REASONS[code];
  if (base === undefined) return { ok: false, error: "Pick a rejection reason." };
  const reason = (code === "other" ? note : `${base}${note ? ` ${note}` : ""}`).trim();
  if (reason.length < 5) return { ok: false, error: "Add a short explanation (5+ characters)." };
  const r = await reviewKyc({ officerId: g.userId, userId, decision: "REJECT", reason });
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
