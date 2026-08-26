"use server";

/**
 * Grant-matrix edits — Owner-only. The Owner tunes what each role may SEE (canView)
 * and DO (canAct) per domain, live, without a deploy. Every save:
 *   1. requireOwner() — ADMIN only + step-up 2FA (never via the grant table itself).
 *   2. Refuses to edit ADMIN (the Owner bypasses the table and can't be locked out).
 *   3. Enforces canAct ⇒ canView (you can't act on a domain you can't see).
 *   4. Persists via rbac.setRoleGrant, invalidates the cache (so it applies on the
 *      next request for that role), and writes a COMPLIANCE audit entry.
 */
import { revalidatePath } from "next/cache";
import { audit } from "@/lib/server/audit";
import { safeError } from "@/lib/server/safe-error";
import { requireOwner } from "@/lib/server/rbac-guard";
import {
  setRoleGrant, resetRoleGrantsToDefaults, invalidateGrantsCache,
  setRoleReadGrant, resetRoleReadGrantsToDefaults, invalidateReadGrantsCache,
} from "@/lib/server/rbac";
import {
  ADMIN_DOMAINS, EDITABLE_ROLES, STAFF_ROLES, READ_CLASSES, READ_CLASS_LABEL, isMaskable,
  type AdminDomain, type Role, type ReadClass, type ReadCell,
} from "@/lib/server/roles";

export async function setRoleGrantAction(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const officerId = (await requireOwner("setRoleGrant")).userId;
  const role = String(formData.get("role") ?? "");
  const domain = String(formData.get("domain") ?? "");
  const wantView = String(formData.get("canView") ?? "") === "true";
  const wantAct = String(formData.get("canAct") ?? "") === "true";

  if (role === "ADMIN") return { ok: false, error: "The Owner's access is fixed and cannot be edited." };
  if (!(EDITABLE_ROLES as readonly string[]).includes(role)) return { ok: false, error: "Unknown role." };
  if (!(ADMIN_DOMAINS as readonly string[]).includes(domain)) return { ok: false, error: "Unknown domain." };
  // canAct implies canView — a role can't act on a domain it can't even see.
  const canView = wantAct ? true : wantView;
  const canAct = wantAct;

  try {
    await setRoleGrant(role as Role, domain as AdminDomain, canView, canAct, officerId);
    invalidateGrantsCache(); // re-hydrate from the DB on the next read (authoritative)
    audit({
      category: "COMPLIANCE",
      action: "rbac.grant_changed",
      actorId: officerId,
      targetType: "Role",
      targetId: role,
      payload: { domain, canView, canAct },
    });
    revalidatePath("/admin/roles");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: safeError(err, "Grant update failed") };
  }
}

export async function resetRoleGrantsAction(): Promise<{ ok: true } | { ok: false; error: string }> {
  const officerId = (await requireOwner("resetRoleGrants")).userId;
  try {
    await resetRoleGrantsToDefaults();
    invalidateGrantsCache();
    audit({
      category: "COMPLIANCE",
      action: "rbac.grants_reset",
      actorId: officerId,
      targetType: "Role",
      targetId: "*",
      payload: {},
    });
    revalidatePath("/admin/roles");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: safeError(err, "Reset failed") };
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * READ_TIERS edits — the SECOND axis (docs/READ-TIERS.md). Same shape as the grant
 * edits above, with ONE deliberate difference.
 *
 * ⛔ ADMIN IS EDITABLE HERE. `setRoleGrantAction` refuses it, and correctly: the Owner
 * bypasses the DOMAIN table so a bad grant could never lock them out of the console.
 * Ruling D3 makes the READ axis the opposite — ADMIN resolves through the table like
 * everyone else, because ADMIN is the only account that exists on production and a
 * masking rule ADMIN skipped would have no possible witness. ⚠️ The Owner still cannot
 * lock itself out: the worst a bad READ edit does is put dots where a figure was, and
 * `/admin/roles` is reached through the DOMAIN axis, which still bypasses.
 * ──────────────────────────────────────────────────────────────────────────── */
export async function setRoleReadGrantAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const officerId = (await requireOwner("setRoleReadGrant")).userId;
  const role = String(formData.get("role") ?? "");
  const readClass = String(formData.get("readClass") ?? "");
  const cell = String(formData.get("cell") ?? "");

  if (!(STAFF_ROLES as readonly string[]).includes(role)) return { ok: false, error: "Unknown role." };
  if (!(READ_CLASSES as readonly string[]).includes(readClass)) return { ok: false, error: "Unknown read class." };
  if (!["read", "masked", "none"].includes(cell)) return { ok: false, error: "Unknown read level." };
  // ⛔ Refuse `masked` on a class with no masked form, and NAME the alternatives rather than
  // saying "invalid" — the same rule E-213's category refusal follows: an operator who is
  // refused must be able to tell a typo from a policy.
  if (cell === "masked" && !isMaskable(readClass as ReadClass)) {
    return {
      ok: false,
      error: `"${READ_CLASS_LABEL[readClass as ReadClass]}" has no masked form — choose Can reveal or Hidden.`,
    };
  }

  try {
    await setRoleReadGrant(role as Role, readClass as ReadClass, cell as ReadCell, officerId);
    invalidateReadGrantsCache();
    audit({
      category: "COMPLIANCE",
      action: "rbac.read_grant_changed",
      actorId: officerId,
      targetType: "Role",
      targetId: role,
      payload: { readClass, cell },
    });
    revalidatePath("/admin/roles");
    // ⚠️ The player page is where the change is actually VISIBLE. Without this the officer
    // flips a cell, opens a player, and sees the old masking from the router cache — and
    // concludes the matrix does not work.
    revalidatePath("/admin/players/[id]", "page");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: safeError(err, "Read grant update failed") };
  }
}

export async function resetRoleReadGrantsAction(): Promise<{ ok: true } | { ok: false; error: string }> {
  const officerId = (await requireOwner("resetRoleReadGrants")).userId;
  try {
    await resetRoleReadGrantsToDefaults();
    invalidateReadGrantsCache();
    audit({
      category: "COMPLIANCE",
      action: "rbac.read_grants_reset",
      actorId: officerId,
      targetType: "Role",
      targetId: "*",
      payload: {},
    });
    revalidatePath("/admin/roles");
    revalidatePath("/admin/players/[id]", "page");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: safeError(err, "Reset failed") };
  }
}
