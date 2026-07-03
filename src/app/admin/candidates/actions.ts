"use server";

import { safeError } from "@/lib/server/safe-error";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import {
  approveCandidate,
  rejectCandidate,
  markPublished,
  getCandidate,
  type RejectReason,
} from "@/lib/server/market-candidate";
import { createMarket } from "@/lib/server/market-service";
import { isSourceTrusted, seedDefaultSources } from "@/lib/server/source-registry";
import { MARKET_OPS_ROLES } from "@/lib/server/roles";
import { requireAdminTotp } from "@/lib/server/admin-guard";

const ADMIN_ROLES = MARKET_OPS_ROLES; // role tier — see @/lib/server/roles

async function requireAdmin(action: string): Promise<string> {
  const session = await currentSession();
  if (!session) redirect("/auth/admin");
  const u = await db.user.findById(session.userId);
  if (!u || !ADMIN_ROLES.has(u.role)) {
    audit({
      category: "SECURITY", action: "privilege_escalation_blocked",
      actorId: session.userId, targetType: "Action", targetId: action,
      payload: { role: u?.role ?? "unknown" },
    });
    throw new Error("Forbidden: admin role required.");
  }
  await requireAdminTotp(session.userId, session.sessionId);
  return session.userId;
}

export async function approveCandidateAction(formData: FormData) {
  const officerId = await requireAdmin("approveCandidateAction");
  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("note") ?? "");
  try {
    const c = await approveCandidate(id, { officerId, note: note || undefined });
    if (!c) return { ok: false as const, error: "Candidate not found or not in review state." };
    revalidatePath("/admin/candidates");
    return { ok: true as const, candidate: c };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Approve failed") };
  }
}

export async function rejectCandidateAction(formData: FormData) {
  const officerId = await requireAdmin("rejectCandidateAction");
  const id = String(formData.get("id") ?? "");
  const reason = String(formData.get("reason") ?? "officer_decision") as RejectReason;
  const note = String(formData.get("note") ?? "");
  try {
    const c = await rejectCandidate(id, { officerId, reason, note: note || undefined });
    if (!c) return { ok: false as const, error: "Candidate not found." };
    revalidatePath("/admin/candidates");
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Reject failed") };
  }
}

export async function publishCandidateAction(formData: FormData) {
  const officerId = await requireAdmin("publishCandidateAction");
  const id = String(formData.get("id") ?? "");
  try {
    const c = await getCandidate(id);
    if (!c) return { ok: false as const, error: "Candidate not found." };
    if (c.state !== "APPROVED") return { ok: false as const, error: "Candidate is not approved." };
    if (c.sources.length === 0) return { ok: false as const, error: "Candidate has no source URL." };

    await seedDefaultSources();
    const primary = c.sources[0];
    const trust = await isSourceTrusted(primary.url, c.category === "infrastructure" ? "macro" : c.category);
    if (!trust.ok) {
      return { ok: false as const, error: `Source not approved · ${trust.reason}.` };
    }

    const market = await createMarket({
      titleEn: c.proposedTitleEn,
      titleSw: c.proposedTitleSw ?? c.proposedTitleEn,
      titleZh: c.proposedTitleZh ?? null,
      category: c.category === "infrastructure" ? "macro" : c.category,
      sourceUrl: primary.url,
      resolutionCriterion: c.resolutionCriterion,
      resolutionAt: c.resolutionAt,
      proposedBy: officerId,
    });
    await markPublished(c.id, market.id, officerId);
    revalidatePath("/admin/candidates");
    revalidatePath("/admin/markets");
    return { ok: true as const, marketId: market.id };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Publish failed") };
  }
}
