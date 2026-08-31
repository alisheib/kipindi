"use server";

/**
 * Staff management — Owner-only. Assign a role to a staffer, or promote an existing
 * account to staff by phone. Every path:
 *   1. requireOwner() — ADMIN (Owner) only, hardcoded (never via the grant table, so
 *      no role can grant itself staff-management), + step-up 2FA.
 *   2. validateRoleChange() — mandatory reason, valid role, and the SELF-DEMOTION BLOCK
 *      (the Owner can never change their OWN role → can't lock themselves out).
 *   3. revokeUserSessions(target) — the role is cached in the session cookie, so a change
 *      only takes effect once their session is re-minted; revoking forces a fresh login.
 *   4. A COMPLIANCE audit entry (immutable, hash-chained) is the authoritative record.
 *
 * The pure validation lives in ../../../lib/server/staff-roles.ts so it can be unit-tested.
 */
import { revalidatePath } from "next/cache";
import { db } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import { revokeUserSessions } from "@/lib/server/session-registry";
import { requireOwner } from "@/lib/server/rbac-guard";
import { fieldError } from "@/lib/server/field-error";
import { sendEmailToUser, staffRoleChangedHtml } from "@/lib/server/email";
import { ROLE_LABEL, type Role } from "@/lib/server/roles";
import { validateRoleChange, isStaffAssignable, type AssignableRole } from "@/lib/server/staff-roles";
import { tzPhone } from "@/lib/server/validators";
import { safeError } from "@/lib/server/safe-error";

async function applyRoleChange(
  officerId: string,
  target: { id: string; role: string; displayName?: string | null },
  newRole: AssignableRole,
  reason: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const prevRole = target.role;
  try {
    await db.user.update(target.id, { role: newRole });
    // Role lives in the signed session cookie — revoke so the next request re-mints it
    // with the new role (nav/route/action gates then apply immediately).
    await revokeUserSessions(target.id);
    audit({
      category: "COMPLIANCE",
      action: "staff.role_changed",
      actorId: officerId,
      targetType: "User",
      targetId: target.id,
      payload: { prevRole, newRole, reason },
    });
    // Notify the person by email (fire-and-forget; sendEmailToUser no-ops cleanly when
    // there's no address on file, so a staffer without an email never blocks the change).
    const isStaff = newRole !== "PLAYER";
    void sendEmailToUser(target.id, (email) => ({
      to: email,
      subject: isStaff ? `Your 50pick role is now ${ROLE_LABEL[newRole as Role]}` : "Your 50pick staff access was removed",
      html: staffRoleChangedHtml({ name: target.displayName || "there", roleLabel: ROLE_LABEL[newRole as Role] ?? newRole, isStaff }),
      tag: "staff-role-change",
    }));
    revalidatePath("/admin/staff");
    revalidatePath(`/admin/staff/${target.id}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: safeError(err, "Role change failed") };
  }
}

/** Change an existing staffer's (or any account's) role. */
export async function setStaffRoleAction(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const officerId = (await requireOwner("setStaffRole")).userId;
  const targetId = String(formData.get("userId") ?? "").trim();
  const newRole = String(formData.get("role") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);

  const target = targetId ? await db.user.findById(targetId) : null;
  const v = validateRoleChange({ actorId: officerId, targetId, prevRole: target?.role ?? "", newRole, reason });
  if (!v.ok) return v;
  if (!target) return { ok: false, error: "Account not found." };
  return applyRoleChange(officerId, target, v.newRole, reason);
}

/** Promote an existing account (looked up by phone) to a staff role. The person must
 *  already have a normal 50pick account — we never create logins here. */
export async function addStaffByPhoneAction(formData: FormData): Promise<{ ok: true; userId: string } | { ok: false; error: string; field?: string }> {
  const officerId = (await requireOwner("addStaffByPhone")).userId;
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const newRole = String(formData.get("role") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);

  /* ⭐ DG-S-05 — every refusal below names the control whose VALUE has to change, which on a
     three-field form is not guessable from the sentence alone: "That's your own account" and
     "Already SUPPORT" are both about the person, but one is fixed at the phone and the other
     at the role. §F4 asks for the reason AND the next step; `field` is the next step. */
  const parsed = tzPhone.safeParse(phoneRaw);
  if (!parsed.success) return fieldError("phone", "Enter a valid Tanzanian phone (+255…).");
  if (!isStaffAssignable(newRole)) return fieldError("role", "Pick a staff role.");
  if (reason.length < 5) return fieldError("reason", "A reason is required (≥ 5 characters).");

  const target = await db.user.findByPhone(parsed.data);
  if (!target) return fieldError("phone", "No account with that phone. Ask them to register a normal account first, then add them.");
  if (target.id === officerId) return fieldError("phone", "That's your own account.");
  if (target.role === newRole) return fieldError("role", `Already ${ROLE_LABEL[newRole as Role]}.`);

  const r = await applyRoleChange(officerId, target, newRole as AssignableRole, reason);
  return r.ok ? { ok: true, userId: target.id } : r;
}
