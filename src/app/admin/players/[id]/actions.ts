"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import { buildDsarBundle } from "@/lib/server/privacy";

/**
 * Privileged player-management actions. Each one:
 *   1. Authenticates via currentSession() and gates on ADMIN_ROLES
 *      (defence-in-depth — the /admin layout already blocks, but
 *      a leaked action ID must not escalate from a player session).
 *   2. Requires a reason string (≥ 5 chars) to satisfy the audit
 *      requirement printed on the page.
 *   3. Mutates user.status and writes an ADMIN-category audit entry
 *      so the change is traceable end-to-end.
 *
 * For phase 1 we wire suspend + restore. The other placeholder
 * actions (close-account, freeze-wallet, refund) need the
 * two-officer flow and stay disabled until that's wired separately.
 */

const ADMIN_ROLES = new Set(["ADMIN", "COMPLIANCE", "MODERATOR"]);

async function requireAdmin(action: string): Promise<string> {
  const session = await currentSession();
  if (!session) redirect("/auth/login");
  const me = await db.user.findById(session.userId);
  if (!me || !ADMIN_ROLES.has(me.role)) {
    audit({
      category: "SECURITY",
      action: "privilege_escalation_blocked",
      actorId: session.userId,
      targetType: "Action",
      targetId: action,
      payload: { role: me?.role ?? "unknown" },
    });
    throw new Error("Forbidden: admin role required.");
  }
  return session.userId;
}

/**
 * GDPR Art. 15 export — returns the player's full data bundle as a JSON
 * string the client turns into a download. Officer-gated + audited.
 */
export async function exportPlayerDataAction(userId: string): Promise<
  { ok: true; payload: string; filename: string } | { ok: false; error: string }
> {
  const officerId = await requireAdmin("exportPlayerDataAction");
  if (!userId) return { ok: false, error: "Missing user id." };
  const bundle = await buildDsarBundle(userId);
  if (!bundle) return { ok: false, error: "Player not found." };
  audit({
    category: "COMPLIANCE",
    action: "player.data_exported",
    actorId: officerId,
    targetType: "User",
    targetId: userId,
    payload: { article: "GDPR Art 15" },
  });
  return {
    ok: true,
    payload: JSON.stringify(bundle, null, 2),
    filename: `player-${userId}-dsar.json`,
  };
}

export async function suspendPlayerAction(formData: FormData) {
  const officerId = await requireAdmin("suspendPlayerAction");
  const userId = String(formData.get("userId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);
  if (!userId) return { ok: false as const, error: "Missing user id." };
  if (reason.length < 5) return { ok: false as const, error: "Reason is required (≥ 5 chars)." };

  const target = await db.user.findById(userId);
  if (!target) return { ok: false as const, error: "Player not found." };
  if (target.status === "SUSPENDED") return { ok: false as const, error: "Player is already suspended." };
  if (target.status === "CLOSED") return { ok: false as const, error: "Player account is closed." };

  const prevStatus = target.status;
  await db.user.update(userId, { status: "SUSPENDED" });
  audit({
    category: "ADMIN",
    action: "player.suspended",
    actorId: officerId,
    targetType: "User",
    targetId: userId,
    payload: { reason, prevStatus },
  });
  revalidatePath(`/admin/players/${userId}`);
  revalidatePath("/admin/players");
  return { ok: true as const };
}

export async function restorePlayerAction(formData: FormData) {
  const officerId = await requireAdmin("restorePlayerAction");
  const userId = String(formData.get("userId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);
  if (!userId) return { ok: false as const, error: "Missing user id." };
  if (reason.length < 5) return { ok: false as const, error: "Reason is required (≥ 5 chars)." };

  const target = await db.user.findById(userId);
  if (!target) return { ok: false as const, error: "Player not found." };
  if (target.status !== "SUSPENDED") {
    return { ok: false as const, error: `Cannot restore — current status is ${target.status}.` };
  }

  await db.user.update(userId, { status: "ACTIVE" });
  audit({
    category: "ADMIN",
    action: "player.restored",
    actorId: officerId,
    targetType: "User",
    targetId: userId,
    payload: { reason },
  });
  revalidatePath(`/admin/players/${userId}`);
  revalidatePath("/admin/players");
  return { ok: true as const };
}

// ─── KYC review (officer decision on a pending submission) ──────────────────

export async function approveKycAction(formData: FormData) {
  const officerId = await requireAdmin("approveKycAction");
  const userId = String(formData.get("userId") ?? "");
  const { reviewKyc } = await import("@/lib/server/kyc-service");
  const r = await reviewKyc({ officerId, userId, decision: "APPROVE" });
  if (r.ok) {
    revalidatePath(`/admin/players/${userId}`);
    revalidatePath("/admin/approvals");
  }
  return r.ok ? { ok: true as const } : { ok: false as const, error: r.error };
}

export async function rejectKycAction(formData: FormData) {
  const officerId = await requireAdmin("rejectKycAction");
  const userId = String(formData.get("userId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);
  const { reviewKyc } = await import("@/lib/server/kyc-service");
  const r = await reviewKyc({ officerId, userId, decision: "REJECT", reason });
  if (r.ok) {
    revalidatePath(`/admin/players/${userId}`);
    revalidatePath("/admin/approvals");
  }
  return r.ok ? { ok: true as const } : { ok: false as const, error: r.error };
}

/** Ask the player for more / clearer documents or extra info. Keeps the
 *  submission open (ADDITIONAL_INFO_REQUIRED) so they can update + resubmit. */
export async function requestKycInfoAction(formData: FormData) {
  const officerId = await requireAdmin("requestKycInfoAction");
  const userId = String(formData.get("userId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);
  // Optional extra-document requests: a JSON array of non-empty descriptions.
  let requestedDocs: string[] = [];
  try {
    const raw = JSON.parse(String(formData.get("requestedDocs") ?? "[]"));
    if (Array.isArray(raw)) requestedDocs = raw.map((d) => String(d).trim()).filter((d) => d.length > 0).slice(0, 10);
  } catch { /* ignore malformed — treated as none */ }
  const { reviewKyc } = await import("@/lib/server/kyc-service");
  const r = await reviewKyc({ officerId, userId, decision: "REQUEST_INFO", reason, requestedDocs });
  if (r.ok) {
    revalidatePath(`/admin/players/${userId}`);
    revalidatePath("/admin/approvals");
  }
  return r.ok ? { ok: true as const } : { ok: false as const, error: r.error };
}
