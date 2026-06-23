"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import { notifySof } from "@/lib/server/notification-service";
import { withLock } from "@/lib/server/locks";

const ADMIN_ROLES = new Set(["ADMIN", "COMPLIANCE", "MODERATOR"]);

async function requireOfficer() {
  const session = await currentSession();
  if (!session) redirect("/auth/admin");
  const u = await db.user.findById(session.userId);
  if (!(u && ADMIN_ROLES.has(u.role))) redirect("/auth/admin");
  return session;
}

/**
 * Review a player's source-of-funds declaration.
 *
 * Until now SOF declarations were created PENDING with no way to clear them, so
 * any player who tripped the SOF threshold (single deposit ≥ TZS 1M, or rolling
 * 30-day ≥ TZS 5M) was permanently unable to deposit — the deposit gate
 * (wallet-service) requires reviewStatus === "ACCEPTED". This action is that
 * missing decision step. Single-officer (SOF is not on the two-person list);
 * both outcomes are audited under COMPLIANCE.
 */
export async function reviewSofAction(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireOfficer();
  const userId = String(formData.get("userId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);

  if (!userId) return { ok: false, error: "Missing user id." };
  if (decision !== "ACCEPT" && decision !== "REJECT") return { ok: false, error: "Invalid decision." };
  // An officer must never clear their own declaration (separation of duties).
  if (session.userId === userId) return { ok: false, error: "You cannot review your own source-of-funds declaration." };
  if (decision === "REJECT" && reason.length < 5) return { ok: false, error: "A rejection reason (≥ 5 characters) is required." };

  return withLock(`sof-review:${userId}`, async () => {
    const sof = await db.sourceOfFunds.get(userId);
    if (!sof) return { ok: false as const, error: "No source-of-funds declaration on file for this user." };
    if (sof.reviewStatus !== "PENDING") return { ok: false as const, error: `Already ${sof.reviewStatus.toLowerCase()}.` };

    const now = new Date().toISOString();
    await db.sourceOfFunds.upsert({
      ...sof,
      reviewStatus: decision === "ACCEPT" ? "ACCEPTED" : "REJECTED",
      reviewerId: session.userId,
      reviewedAt: now,
    });

    audit({
      category: "COMPLIANCE",
      action: decision === "ACCEPT" ? "sof.accepted" : "sof.rejected",
      actorId: session.userId,
      targetType: "User",
      targetId: userId,
      payload: { declaredSource: sof.declaredSource, declaredAnnualIncomeBand: sof.declaredAnnualIncomeBand, reason: reason || null },
    });

    notifySof(userId, decision === "ACCEPT" ? "ACCEPTED" : "REJECTED");

    revalidatePath("/admin/approvals");
    return { ok: true as const };
  });
}
