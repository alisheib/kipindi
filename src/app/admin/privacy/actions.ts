"use server";

import { safeError } from "@/lib/server/safe-error";
import { revalidatePath } from "next/cache";
import { fileDsarRequest, fulfillDsarRequest, buildDsarBundle } from "@/lib/server/privacy";
import { getSession } from "@/lib/server/session";
import { db } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import { COMPLIANCE_ROLES } from "@/lib/server/roles";

const ADMIN_ROLES = COMPLIANCE_ROLES; // role tier — see @/lib/server/roles

async function requireOfficer(): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in." };
  const u = await db.user.findById(session.userId);
  if (!u || !ADMIN_ROLES.has(u.role)) return { ok: false, error: "Not authorised." };
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
