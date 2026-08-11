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
import { requireStaff } from "@/lib/server/rbac-guard";

// RBAC: authorization is data-driven — requireStaff checks canAct for `trading`
// (Owner/ADMIN bypasses), audits a blocked attempt, then enforces step-up 2FA.
async function requireAdmin(action: string): Promise<string> {
  return (await requireStaff("trading", action)).userId;
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
      // ⚠️ THE SECOND PUBLISH PATH, and it is easy to miss. `/admin/candidates`
      // creates markets independently of `/admin/ai-polls`; fixing only the one the
      // finding named would leave every candidate-published poll untranslated.
      resolutionCriterionSw: c.resolutionCriterionSw,
      resolutionCriterionZh: c.resolutionCriterionZh,
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
