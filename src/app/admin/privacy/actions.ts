"use server";

import { safeError } from "@/lib/server/safe-error";
import { revalidatePath } from "next/cache";
import { fileDsarRequest, fulfillDsarRequest, buildDsarBundle, hasOpenRequest, asRequestableType } from "@/lib/server/privacy";
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

/**
 * File a request on a player's behalf — walk-in, letter, telephone.
 *
 * 🔴 THIS HAD NO CALLER UNTIL 2026-08-21 (E-33), and that was the whole defect: nothing on the
 * platform could put a request INTO the register, so this page read *"No data-subject access
 * requests are on file"* permanently — not because nobody had asked, but because asking was
 * unrecordable, and **the statutory clock runs from the ask**. Its caller is
 * `FileDsarOnBehalfButton` in `dsar-controls.tsx`; the player's own door is
 * `filePrivacyRequestAction` in `src/app/profile/account/actions.ts`.
 */
export async function fileDsarAction(formData: FormData) {
  const auth = await requireOfficer();
  if (!auth.ok) return { ok: false, error: auth.error };
  const userId = String(formData.get("userId") || "").trim();
  // ⛔ AN ALLOWLIST, NOT A CAST, AND NOT DEFAULTING TO "ACCESS". The old line took whatever the
  // form said `as DsarType` and fell back to ACCESS — the one right that needs no request at
  // all, because `buildDsarBundleAction` serves it immediately from this same card. Filing one
  // opens a 30-day statutory obligation for work the officer has just finished doing, and a
  // queue full of already-answered requests is how a real one gets missed. One narrower,
  // shared with the player's door.
  const type = asRequestableType(formData.get("type"));
  if (!type) {
    return { ok: false, error: "Type must be ERASURE or CORRECTION — access and portability are served by Export bundle." };
  }
  const reason = String(formData.get("reason") || "") || null;
  if (!userId) return { ok: false, error: "userId required" };
  try {
    // ⛔ The SAME cap the player's door uses. A double-click, or two officers taking the same
    // walk-in, must not file the request twice — see `hasOpenRequest`.
    if (hasOpenRequest(userId, type)) {
      revalidatePath("/admin/privacy");
      return { ok: true, duplicate: true };
    }
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
    const r = await fulfillDsarRequest({ id, officerId: auth.userId, exportRef });
    if (!r.ok) return { ok: false, error: r.error };
    revalidatePath("/admin/privacy");
    // ⭐ An ERASURE that only PARTIALLY completed must say so to the officer who pressed the
    // button. A bare `{ ok: true }` reads as "done" on a compliance action whose whole point
    // is that a statutory hold is still running.
    if (r.request.status === "PARTIAL") {
      return {
        ok: true,
        notice: `Personal data erased. Identity documents are held under POCA Cap 423 §16 `
          + `until ${r.request.erasureHeldUntil}; the request stays in the queue until then.`,
      };
    }
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
