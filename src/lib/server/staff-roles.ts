/**
 * Pure staff-role helpers — the validation rules behind /admin/staff, split out of the
 * "use server" actions file so they're unit-testable (a "use server" module may export
 * async functions ONLY, so a sync validator can't live there). See scripts/staff-role.test.mts.
 */
import { STAFF_ROLES, ROLE_LABEL, type Role } from "./roles";

/** Roles the Owner may ASSIGN: the 7 staff roles + PLAYER (to revoke staff access).
 *  AGENT is a separate non-staff role and is deliberately NOT assignable here. */
export const ASSIGNABLE_ROLES = [...STAFF_ROLES, "PLAYER"] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export function isAssignableRole(r: string): r is AssignableRole {
  return (ASSIGNABLE_ROLES as readonly string[]).includes(r);
}

/** Only STAFF roles (no PLAYER) may be used when ADDING staff by phone. */
export function isStaffAssignable(r: string): r is Role {
  return (STAFF_ROLES as readonly string[]).includes(r);
}

/**
 * The invariant checks for a role change, independent of auth/DB. The ADMIN-only gate,
 * step-up 2FA, session revocation and audit are the action's job (requireOwner); this is
 * the input-validation + self-demotion-block layer, kept pure so it can be locked by a test.
 */
export function validateRoleChange(input: {
  actorId: string;
  targetId: string;
  prevRole: string;
  newRole: string;
  reason: string;
}): { ok: true; newRole: AssignableRole } | { ok: false; error: string } {
  const { actorId, targetId, prevRole, newRole, reason } = input;
  if (!targetId) return { ok: false, error: "Missing account id." };
  if (!isAssignableRole(newRole)) return { ok: false, error: "Pick a valid role." };
  if (reason.trim().length < 5) return { ok: false, error: "A reason is required (≥ 5 characters)." };
  // Self-demotion block — the Owner can never change their OWN role (can't lock out).
  if (targetId === actorId) return { ok: false, error: "You cannot change your own role — ask another Owner." };
  if (prevRole === newRole) return { ok: false, error: `Already ${ROLE_LABEL[newRole as Role] ?? newRole}.` };
  return { ok: true, newRole };
}
