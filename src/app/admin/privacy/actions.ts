"use server";

import { safeError } from "@/lib/server/safe-error";
import { revalidatePath } from "next/cache";
import { fileDsarRequest, fulfillDsarRequest, buildDsarBundle } from "@/lib/server/privacy";
import { getSession } from "@/lib/server/session";
import { db } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import { canAct } from "@/lib/server/rbac";
import { requireAdminTotp } from "@/lib/server/admin-guard";

// RBAC: authorization is data-driven — canAct checks the role's grant for `compliance`
// (Owner/ADMIN bypasses inside canAct). Kept as a soft {ok:false} return because this
// surface returns errors rather than redirecting; then step-up 2FA.
async function requireOfficer(): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in." };
  const u = await db.user.findById(session.userId);
  if (!u || !(u.role === "ADMIN" || (await canAct(u.role, "compliance")))) return { ok: false, error: "Not authorised." };
  await requireAdminTotp(session.userId, session.sessionId);
  return { ok: true, userId: session.userId };
}

export async function fileDsarAction(formData: FormData) {
  const auth = await requireOfficer();
  if (!auth.ok) return { ok: false, error: auth.error };
  const userId = String(formData.get("userId") || "").trim();
  const type = String(formData.get("type") || "ACCESS") as "ACCESS" | "ERASURE" | "CORRECTION" | "PORTABILITY";
  const reason = String(formData.get("reason") || "") || null;
  if (!userId) return { ok: false, error: "userId required" };
  try {
    fileDsarRequest({ userId, type, reason: reason ?? undefined });
    revalidatePath("/admin/privacy");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: safeError(err, "DSAR filing failed") };
  }
}

export async function fulfillDsarAction(formData: FormData) {
  const auth = await requireOfficer();
  if (!auth.ok) return { ok: false, error: auth.error };
  const id = String(formData.get("id") || "").trim();
  const exportRef = String(formData.get("exportRef") || "") || null;
  try {
    const r = fulfillDsarRequest({ id, officerId: auth.userId, exportRef });
    if (!r.ok) return { ok: false, error: r.error };
    revalidatePath("/admin/privacy");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: safeError(err, "Fulfillment failed") };
  }
}

export async function buildDsarBundleAction(formData: FormData) {
  const auth = await requireOfficer();
  if (!auth.ok) return { ok: false as const, error: auth.error };
  const userId = String(formData.get("userId") || "").trim();
  try {
    const bundle = await buildDsarBundle(userId);
    if (!bundle) return { ok: false as const, error: "User not found" };
    audit({ category: "COMPLIANCE", action: "privacy.dsar.exported", actorId: auth.userId, targetType: "User", targetId: userId });
    return { ok: true as const, bundle };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Bundle export failed") };
  }
}
