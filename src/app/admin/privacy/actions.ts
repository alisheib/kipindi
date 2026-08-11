"use server";

import { safeError } from "@/lib/server/safe-error";
import { revalidatePath } from "next/cache";
import { fileDsarRequest, fulfillDsarRequest, buildDsarBundle } from "@/lib/server/privacy";
import { audit } from "@/lib/server/audit";
import { softRequireStaff } from "@/lib/server/rbac-guard";

// RBAC: authorization is data-driven and lives in ONE place — `softRequireStaff` checks
// the role's grant for `compliance` (Owner/ADMIN bypasses inside canAct), AUDITS a refusal
// as `privilege_escalation_blocked`, then takes step-up 2FA.
//
// ⛔ THIS USED TO BE A LOCAL COPY, AND THE COPY HAD LOST THE AUDIT (finding A2). It returned
// "Not authorised." and recorded nothing, so a role without compliance canAct could click
// Export bundle on the DSAR queue and leave no trace of the attempt — measured 0 → 0 against
// the live counter while every other admin gate in the codebase wrote a row. **A DSAR export
// is precisely the attempt a regulator expects to find recorded, refused or not.**
async function requireOfficer(): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const g = await softRequireStaff("compliance", "privacy.dsar", "Not authorised.");
  return g.ok ? { ok: true, userId: g.userId } : g;
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
