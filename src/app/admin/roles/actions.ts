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
import { setRoleGrant, resetRoleGrantsToDefaults, invalidateGrantsCache } from "@/lib/server/rbac";
import { ADMIN_DOMAINS, EDITABLE_ROLES, type AdminDomain, type Role } from "@/lib/server/roles";

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
