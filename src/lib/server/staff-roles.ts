/**
 * Pure staff-role helpers — the validation rules behind /admin/staff, split out of the
 * "use server" actions file so they're unit-testable (a "use server" module may export
 * async functions ONLY, so a sync validator can't live there). See scripts/staff-role.test.mts.
 *
 * ⭐ vb8 (2026-10-03) · THE FORMS READ THESE RULES TOO. `checkStaffPhone` and `checkStaffReason` are the one rule for
 * the add-by-phone number and the audited reason: both actions refuse with them, and both forms in `staff-forms.tsx`
 * check with them before the confirmation opens — so the browser and the server say the same sentence, under the same
 * field. Every refusal a control can fix names that control (`fieldError`), so the form can take the officer to it.
 * Pure and client-safe: `./roles` and `./field-error` import nothing, `./validators` imports only zod and
 * `@/lib/id-documents`, and `@/lib/contacts/contact-fields` is client-safe by its own header. None reaches the database.
 */
import { STAFF_ROLES, ROLE_LABEL, type Role } from "./roles";
import { fieldError, type ActionFailure } from "./field-error";
import { tzPhone } from "./validators";
import { charCount, cleanDisplayName, holdsPhoneRun } from "@/lib/contacts/contact-fields";

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

/* ══ THE PHONE AND THE REASON — one rule each, for the actions and the forms (vb8) ═══════════════ */

/** The audited reason's bounds, in characters as a person counts them (code points, `charCount`). */
export const STAFF_REASON_MIN = 5;
export const STAFF_REASON_MAX = 500;

export const STAFF_PHONE_EMPTY = "Enter the phone number of their 50pick account.";
export const STAFF_PHONE_INVALID = "Enter a valid Tanzanian mobile number: 9 digits after +255, starting with 6 or 7.";
export const STAFF_REASON_SHORT = `A reason is required (≥ ${STAFF_REASON_MIN} characters).`;
export const STAFF_REASON_LONG = `A reason can be at most ${STAFF_REASON_MAX} characters.`;
export const STAFF_REASON_PHONE = "A reason can't hold a phone number — remove the number and save again.";

export type StaffPhoneVerdict = { ok: true; phone: string } | { ok: false; error: string };

/**
 * The account an add-by-phone names. ⛔ `tzPhone`'s rule, unchanged: account phones stay on it (OD4). What this adds is
 * a sentence of its own for an empty box, and one home for both sentences. `phone` is the E.164 the account table is
 * keyed by (`db.user.findByPhone`).
 */
export function checkStaffPhone(raw: string): StaffPhoneVerdict {
  const text = String(raw ?? "").trim();
  if (text === "") return { ok: false, error: STAFF_PHONE_EMPTY };
  const parsed = tzPhone.safeParse(text);
  return parsed.success ? { ok: true, phone: parsed.data } : { ok: false, error: STAFF_PHONE_INVALID };
}

export type StaffReasonVerdict = { ok: true; reason: string } | { ok: false; error: string };

/**
 * ⭐ THE AUDITED REASON'S ONE RULE. The reason is written into the COMPLIANCE audit chain and printed in the staff
 * member's Role history, so:
 *   · it is cleaned as one line of text is (`cleanDisplayName`: NFC, control and invisible format characters out,
 *     spaces collapsed, trimmed). 🔴 A NUL used to reach the audit payload as typed, and Postgres' jsonb refuses one:
 *     the role change landed and its COMPLIANCE row was kept only in one process's memory;
 *   · it holds no phone number (`holdsPhoneRun`, the contact book's one detector): the chain is never pruned, and a
 *     reader of the log is not entitled to a number. Asked FIRST, as vb5 asks it of a name: a long reason holding a
 *     number is told about the number, not sent to trim it and refused again. Only a Tanzanian mobile number is
 *     refused (the vb5 review, m3), so a dotted date with a time (01.11.2026 7am) or a long ticket number passes and
 *     the sentence needs no way round;
 *   · it holds 5 to 500 characters. ⛔ REFUSED past 500, never cut: both actions used to `.slice(0, 500)`, so the log
 *     could keep a reason that ended mid-word, which no officer wrote.
 * `reason` is the cleaned text — the one the caller stores.
 */
export function checkStaffReason(raw: string): StaffReasonVerdict {
  const reason = cleanDisplayName(String(raw ?? "")) ?? "";
  if (holdsPhoneRun(reason)) return { ok: false, error: STAFF_REASON_PHONE };
  const length = charCount(reason);
  if (length < STAFF_REASON_MIN) return { ok: false, error: STAFF_REASON_SHORT };
  if (length > STAFF_REASON_MAX) return { ok: false, error: STAFF_REASON_LONG };
  return { ok: true, reason };
}

/**
 * The invariant checks for a role change, independent of auth/DB. The ADMIN-only gate,
 * step-up 2FA, session revocation and audit are the action's job (requireOwner); this is
 * the input-validation + self-demotion-block layer, kept pure so it can be locked by a test.
 * ⭐ vb8 · a refusal the form can fix names its field ("role" or "reason"), and success hands back the CLEANED
 * reason, so the action stores exactly what was checked.
 */
export function validateRoleChange(input: {
  actorId: string;
  targetId: string;
  prevRole: string;
  newRole: string;
  reason: string;
}): { ok: true; newRole: AssignableRole; reason: string } | ActionFailure {
  const { actorId, targetId, prevRole, newRole } = input;
  if (!targetId) return { ok: false, error: "Missing account id." };
  if (!isAssignableRole(newRole)) return fieldError("role", "Pick a valid role.");
  const reason = checkStaffReason(input.reason);
  if (!reason.ok) return fieldError("reason", reason.error);
  // Self-demotion block — the Owner can never change their OWN role (can't lock out). It names no field: no value on
  // the form fixes it, and the detail page draws no form on the Owner's own record.
  if (targetId === actorId) return { ok: false, error: "You cannot change your own role — ask another Owner." };
  if (prevRole === newRole) return fieldError("role", `Already ${ROLE_LABEL[newRole as Role] ?? newRole}.`);
  return { ok: true, newRole, reason: reason.reason };
}
