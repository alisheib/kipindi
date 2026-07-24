"use server";

/**
 * The ONE server action behind the "Two-admin authorization" toggle (resolver-queue
 * header). Sets the single `requireTwoOfficer` flag (resolution-policy.ts). Gated to
 * ADMIN/COMPLIANCE + 2FA; the flag change is COMPLIANCE-audited inside
 * setRequireTwoOfficerResolution.
 *
 * ⛔ One control, one place: this flag is set ONLY here. Do not expose it elsewhere.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import { safeError } from "@/lib/server/safe-error";
import { requireAdminTotp } from "@/lib/server/admin-guard";
import { COMPLIANCE_ROLES } from "@/lib/server/roles";
import { setRequireTwoOfficerResolution } from "@/lib/server/resolution-policy";

export async function setTwoAdminAuthAction(formData: FormData): Promise<
  { ok: true; enabled: boolean } | { ok: false; error: string }
> {
  const session = await currentSession();
  if (!session) redirect("/auth/admin");
  const user = await db.user.findById(session.userId);
  if (!user || !COMPLIANCE_ROLES.has(user.role)) {
    audit({
      category: "SECURITY", action: "privilege_escalation_blocked",
      actorId: session.userId, targetType: "Action", targetId: "setTwoAdminAuth",
      payload: { role: user?.role ?? "unknown" },
    });
    return { ok: false, error: "Forbidden: ADMIN or COMPLIANCE role required." };
  }
  await requireAdminTotp(session.userId, session.sessionId);

  const enabled = String(formData.get("enabled") ?? "") === "true";
  try {
    await setRequireTwoOfficerResolution(enabled, session.userId);
    revalidatePath("/admin/resolver-queue");
    return { ok: true, enabled };
  } catch (err) {
    return { ok: false, error: safeError(err, "Could not change two-admin authorization") };
  }
}
