"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import { requireAdminTotp } from "@/lib/server/admin-guard";
import { COMPLIANCE_ROLES } from "@/lib/server/roles";
import { setConflictedResolutionAllowed, isConflictOverrideHardLocked } from "@/lib/server/test-overrides";

/**
 * Toggle the TESTING override that lets a conflicted officer (one who holds a
 * position in a market) resolve it anyway. Gated to ADMIN/COMPLIANCE + 2FA, and
 * the toggle itself is written to the COMPLIANCE audit trail by
 * setConflictedResolutionAllowed. Default is OFF.
 */
export async function toggleConflictOverrideAction(formData: FormData) {
  const session = await currentSession();
  if (!session) redirect("/auth/admin");
  const user = await db.user.findById(session.userId);
  if (!user || !COMPLIANCE_ROLES.has(user.role)) {
    audit({ category: "SECURITY", action: "privilege_escalation_blocked", actorId: session.userId, targetType: "Action", targetId: "toggleConflictOverride", payload: { role: user?.role ?? "unknown" } });
    return { ok: false as const, error: "Forbidden: ADMIN or COMPLIANCE role required." };
  }
  await requireAdminTotp(session.userId, session.sessionId);
  const enabled = String(formData.get("enabled") ?? "") === "true";
  // Real-money hard lock (POCA §16): you can always turn the override OFF, but you
  // can NEVER turn it ON once real money is live. Pre-launch (TEST_FUNDING=true) it
  // is permitted for testers. Defense-in-depth — getConflictedResolutionAllowed()
  // already forces the effect off, this just refuses the toggle honestly.
  if (enabled && isConflictOverrideHardLocked()) {
    audit({ category: "COMPLIANCE", action: "test.conflicted_resolution.enable_blocked", actorId: session.userId, targetType: "SystemFlag", targetId: "allowConflictedResolution", payload: { reason: "real-money live (TEST_FUNDING unset) — POCA §16 hard lock" } });
    return { ok: false as const, error: "Locked: real money is live. Solo resolution only works pre-launch (before TEST_FUNDING is unset) — POCA §16." };
  }
  await setConflictedResolutionAllowed(enabled, session.userId);
  revalidatePath("/admin/resolver-queue");
  return { ok: true as const, enabled };
}
