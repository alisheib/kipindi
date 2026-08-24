/**
 * Password reset — stateless HMAC-signed token approach (same pattern as
 * email verification). No DB row for the token itself:
 *   - Token embeds userId + email + exp
 *   - Changing email invalidates all outstanding reset links
 *   - HMAC prevents forgery; exp prevents replay
 *
 * Two entry points:
 *   1. Player-initiated: /auth/forgot-password → enters phone → if email on
 *      file, sends a reset link. If no email → "contact support" message.
 *   2. Admin-initiated: officer generates a temporary password directly
 *      (for support requests from users without email).
 */
import { createHash } from "node:crypto";
import { db } from "./store";
import { signSession, verifySession, hashPassword, randomId } from "./crypto";
import { audit } from "./audit";
import { sendEmail, sendEmailToUser, passwordResetHtml, passwordChangedHtml } from "./email";
import { resolvePhoneEmail } from "./email-map";
import { validatePasswordStrength } from "./password-policy";
// ⭐ ONE definition of "is this an email or a phone", shared with sign-in. See
// requestPasswordReset — a second parser here would be a second answer.
import { resolveLoginIdentifier } from "./auth-service";
import { notifyPasswordChanged } from "./notification-service";
import type { FailureReason } from "@/lib/failure-reasons";

/** Security alert on any password change — in-app (always seen, even for
 *  email-less users) + email (durable record). Best-effort; never blocks. */
function alertPasswordChanged(userId: string, method: string): void {
  notifyPasswordChanged(userId).catch(() => {});
  sendEmailToUser(userId, (email) => ({
    to: email,
    subject: "Your 50pick password was changed",
    html: passwordChangedHtml({ time: new Date().toUTCString(), method }),
    tag: "password-changed",
  })).catch(() => {});
}

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Mirrors `EMAIL_CANDIDATE_CAP` in auth-service: this is an UNAUTHENTICATED
 *  endpoint, so the work one request can cause must be bounded by a constant
 *  rather than by how many accounts happen to share an address. */
const RESET_EMAIL_CANDIDATE_CAP = 5;

/** Masked address for audit rows — never persist a raw player address (F-06).
 *  `maria.k@hotmail.com` → `ma***@hotmail.com`. */
function maskEmailForReset(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  return `${local.slice(0, 2)}***@${domain}`;
}
const BASE_URL = () => process.env.NEXT_PUBLIC_APP_URL || "https://kipindi-production.up.railway.app";

type ResetTokenPayload = {
  purpose: "password-reset";
  userId: string;
  /** Bound to the current email so a changed address invalidates the link. */
  email: string;
  /** Fingerprint of the password hash *at issue time*. Because a successful
   *  reset rotates the hash, this makes the link single-use: re-clicking it
   *  (or using an intercepted copy after the password changed) fails the
   *  fingerprint check even though the email still matches. */
  pwh: string;
  exp: number;
};

/** Short, non-reversible fingerprint of the current password hash (or "" for
 *  password-less / OTP-only accounts — any reset then sets one, changing it). */
export function passwordFingerprint(passwordHash: string | null | undefined): string {
  return createHash("sha256").update(passwordHash ?? "").digest("hex").slice(0, 16);
}

/** Build a signed reset URL for a user. */
function buildResetUrl(userId: string, email: string, passwordHash: string | null | undefined): string {
  const token = signSession({
    purpose: "password-reset",
    userId,
    email,
    pwh: passwordFingerprint(passwordHash),
    exp: Date.now() + RESET_TTL_MS,
  } satisfies ResetTokenPayload);
  return `${BASE_URL()}/auth/reset-password?token=${encodeURIComponent(token)}`;
}

/**
 * Player-initiated reset: look up by phone, resolve their email, send the
 * reset link. Returns a generic "if an account exists…" message to avoid
 * phone enumeration.
 */
/**
 * Send a reset link for whichever account(s) the identifier names.
 *
 * ⭐ PHONE **OR** EMAIL, and the discrimination is NOT decided here. It reuses
 * `resolveLoginIdentifier` — the same exported, pure function sign-in uses — so
 * the two doors can never disagree about what counts as an email or a valid
 * MSISDN. A second parser in this file would be a second answer to one question.
 *
 * 🔴 WHY EMAIL WAS ADDED (2026-08-25). This function took a PHONE and nothing
 * else, so a player who had registered with an email and remembered only that
 * had no route back into their account at all — the sign-in page offered them a
 * Phone/Email switcher and the recovery page then demanded the one credential
 * they had come to recover. Measured on production: **66 of 100 accounts carry
 * an email.**
 *
 * ⚠️ AN ADDRESS CAN NAME MORE THAN ONE ACCOUNT, and on this platform it does —
 * one production address is on **4** accounts. `db.user.email` is not unique and
 * the DAL says so beside `findByEmail`. Sign-in resolves that ambiguity with the
 * PASSWORD (`resolveEmailAccount`); recovery has no password to resolve it with,
 * so it sends a link for EVERY matching account, capped. Each token is bound to
 * its own `userId` and its own password fingerprint, so the links are
 * independent, individually single-use, and one being spent does not spend the
 * others. The alternative — picking "the first" account — would silently strand
 * every other owner of that address.
 *
 * ⛔ ENUMERATION-NEUTRAL, ON EVERY BRANCH. Unknown phone, unknown address, known
 * account with no email on file: all return `{ ok: true }` and the page says the
 * same sentence. A caller must never be able to tell which happened. That is why
 * this returns no count and no status.
 */
export async function requestPasswordReset(identifier: string): Promise<{ ok: true }> {
  const resolved = resolveLoginIdentifier(identifier);
  // Not a valid phone OR address. Say nothing — the action has already decided
  // what the player sees, and an error here would be an existence oracle.
  if (!resolved) return { ok: true };

  const users =
    resolved.kind === "email"
      ? await db.user.findAllByEmail(resolved.value, RESET_EMAIL_CANDIDATE_CAP)
      : [await db.user.findByPhone(resolved.value)].filter(Boolean as unknown as (u: unknown) => boolean);

  if (!users.length) {
    // Don't leak whether the phone or the address exists.
    return { ok: true };
  }

  if (resolved.kind === "email" && users.length > 1) {
    // A shared address is a data defect an operator should be able to SEE rather
    // than infer from support tickets. Masked — never the raw address (audit F-06).
    audit({
      category: "AUTH",
      action: "password_reset.email_ambiguous",
      actorId: null,
      targetType: "Email",
      targetId: maskEmailForReset(resolved.value),
      payload: { candidates: users.length },
    });
  }

  for (const user of users as NonNullable<Awaited<ReturnType<typeof db.user.findById>>>[]) {
    // ⚠️ When the player typed an ADDRESS, send to THAT address — not to
    // `resolvePhoneEmail`, whose job is to find a fallback address for a
    // phone-only account. Sending a link somewhere the player did not name
    // would be a link they never receive.
    const email = resolved.kind === "email" ? resolved.value : (user.email || resolvePhoneEmail(user.phoneE164));
    if (!email) {
      // No email on file — can't send a link. The page already states this
      // precondition ("if an account WITH an email exists…"), so the player is
      // not told a link is on its way with no qualification. Still ok: silence
      // here and silence for an unknown number must be indistinguishable.
      audit({ category: "AUTH", action: "password_reset.no_email", actorId: user.id, targetType: "User", targetId: user.id });
      continue;
    }

    const resetLink = buildResetUrl(user.id, email, user.passwordHash);
    await sendEmail({
      to: email,
      subject: "Reset your password · 50pick",
      html: passwordResetHtml({ resetLink }),
      tag: "password-reset",
      trackLinks: false, // don't rewrite the reset link through Postmark tracking
    }).catch((err) => console.error("[password-reset] send failed:", (err as Error)?.message));

    audit({
      category: "AUTH",
      action: "password_reset.requested",
      actorId: user.id,
      targetType: "User",
      targetId: user.id,
      payload: { via: resolved.kind },
    });
  }
  return { ok: true };
}

type ResolvedUser = NonNullable<Awaited<ReturnType<typeof db.user.findById>>>;

/**
 * Validate a reset token without consuming it: checks HMAC + expiry + that the
 * email and password-hash fingerprint still match what the link was issued
 * against. Used by the reset page (to decide whether to render the form) and by
 * `consumeResetToken` (so the two can never disagree). Single-use is enforced by
 * the `pwh` fingerprint: a completed reset rotates the hash, so the link fails.
 */
export async function validateResetToken(
  token: string,
): Promise<{ ok: true; user: ResolvedUser } | { ok: false; error: string }> {
  const payload = verifySession<ResetTokenPayload>(token);
  if (!payload || payload.purpose !== "password-reset" || !payload.userId || !payload.email) {
    return { ok: false, error: "Invalid or expired reset link. Request a new one." };
  }

  const user = await db.user.findById(payload.userId);
  if (!user) return { ok: false, error: "Account not found." };

  // Email must not have changed since the link was issued.
  const currentEmail = (user.email ?? "").trim().toLowerCase();
  if (currentEmail !== payload.email.trim().toLowerCase()) {
    return { ok: false, error: "This reset link is no longer valid. Request a new one." };
  }

  // Single-use: the password must not have changed since the link was issued.
  if (passwordFingerprint(user.passwordHash) !== payload.pwh) {
    return { ok: false, error: "This reset link has already been used. Request a new one." };
  }

  return { ok: true, user };
}

/**
 * Consume a reset token: validate it (HMAC + expiry + email + single-use), then
 * set the new password. The reset rotates the password hash, which invalidates
 * this token for any subsequent use.
 */
export async function consumeResetToken(
  token: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const pwError = validatePasswordStrength(newPassword);
  if (pwError) return { ok: false, error: pwError };

  const check = await validateResetToken(token);
  if (!check.ok) return check;
  const user = check.user;

  const salt = randomId(32);
  const hash = await hashPassword(newPassword, salt);
  await db.user.update(user.id, { passwordHash: hash, passwordSalt: salt });

  audit({
    category: "AUTH",
    action: "password_reset.completed",
    actorId: user.id,
    targetType: "User",
    targetId: user.id,
  });
  alertPasswordChanged(user.id, "password reset link");
  return { ok: true };
}

/**
 * Admin-initiated password reset: officer generates a temporary password for
 * a user who contacted support. The user must change it on next login (not
 * enforced in code yet — just strongly recommended in the UI copy).
 */
export async function adminResetPassword(
  officerId: string,
  userId: string,
): Promise<{ ok: true; tempPassword: string } | { ok: false; error: string }> {
  const user = await db.user.findById(userId);
  if (!user) return { ok: false, error: "Player not found." };

  // Generate a random 12-char temporary password.
  const tempPassword = randomId(12);
  const salt = randomId(32);
  const hash = await hashPassword(tempPassword, salt);
  await db.user.update(userId, { passwordHash: hash, passwordSalt: salt });

  audit({
    category: "ADMIN",
    action: "player.password_reset_by_officer",
    actorId: officerId,
    targetType: "User",
    targetId: userId,
    payload: { method: "temp_password" },
  });
  alertPasswordChanged(userId, "temporary password issued by support");
  return { ok: true, tempPassword };
}

/**
 * Authenticated password change: user provides current password + new password.
 * For users without a password (OTP-only accounts), currentPassword can be empty.
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<
  | { ok: true }
  | { ok: false; error: string; code: "PW_WEAK" | "NOT_FOUND" | "PW_CURRENT_WRONG"; reason: FailureReason }
> {
  // ⛔ THE CODE IS MINTED HERE, NOT IN THE ACTION. `profile/account/actions.ts` used to recover
  // it by matching this function's OWN English back out of the string it had just returned:
  //
  //     /current password is incorrect/i.test(r.error) ? "PW_CURRENT_WRONG"
  //       : /not found/i.test(r.error) ? "NOT_FOUND" : "PW_WEAK";
  //
  // ⛔ TWO SEPARATE DEFECTS IN FOUR LINES, AND THE SECOND IS THE WORSE ONE. First, it is the
  // §1.6 hazard one layer up: reword any sentence here and the action silently mints the wrong
  // code, with nothing red anywhere. Second, `PW_WEAK` was the FALLBACK — so ANY refusal the
  // two patterns missed was reported to the player as *"choose a stronger password"*. A
  // password-strength complaint is the one answer that makes the player change a field that
  // was never the problem, and `validatePasswordStrength` returns SIX different sentences
  // (length, common-list, …) of which the patterns matched none — they landed on the right
  // code only because the ordering happened to leave them last.
  const pwError = validatePasswordStrength(newPassword);
  if (pwError) return { ok: false, error: pwError, code: "PW_WEAK", reason: "password_weak" };

  const user = await db.user.findById(userId);
  if (!user) return { ok: false, error: "User not found.", code: "NOT_FOUND", reason: "not_found" };

  // If the user already has a password, verify the current one.
  if (user.passwordHash && user.passwordSalt) {
    const { verifyPassword } = await import("./crypto");
    const valid = await verifyPassword(currentPassword, user.passwordSalt, user.passwordHash);
    if (!valid) return { ok: false, error: "Current password is incorrect.", code: "PW_CURRENT_WRONG", reason: "password_wrong" };
  }

  const salt = randomId(32);
  const hash = await hashPassword(newPassword, salt);
  await db.user.update(userId, { passwordHash: hash, passwordSalt: salt });

  audit({
    category: "AUTH",
    action: "password.changed",
    actorId: userId,
    targetType: "User",
    targetId: userId,
  });
  alertPasswordChanged(userId, "changed in account settings");
  return { ok: true };
}
