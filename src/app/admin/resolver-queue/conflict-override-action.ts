"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import { requireAdminTotp } from "@/lib/server/admin-guard";
import { COMPLIANCE_ROLES } from "@/lib/server/roles";
import { setConflictedResolutionAllowed } from "@/lib/server/test-overrides";

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
  await setConflictedResolutionAllowed(enabled, session.userId);
  revalidatePath("/admin/resolver-queue");
  return { ok: true as const, enabled };
}
