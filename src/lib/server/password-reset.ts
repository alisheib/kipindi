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
import { notifyPasswordChanged } from "./notification-service";

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
export async function requestPasswordReset(phone: string): Promise<{ ok: true }> {
  const user = await db.user.findByPhone(phone);
  if (!user) {
    // Don't leak whether the phone exists.
    return { ok: true };
  }
  const email = user.email || resolvePhoneEmail(user.phoneE164);
  if (!email) {
    // No email on file — can't send a reset link. The UI tells the user to
    // contact support. Still return ok to avoid phone enumeration.
    audit({ category: "AUTH", action: "password_reset.no_email", actorId: user.id, targetType: "User", targetId: user.id });
    return { ok: true };
  }

  const resetLink = buildResetUrl(user.id, email, user.passwordHash);
  await sendEmail({
    to: email,
    subject: "Reset your password · 50pick",
    html: passwordResetHtml({ resetLink }),
    tag: "password-reset",
    trackLinks: false, // don't rewrite the reset link through Postmark tracking
  }).catch((err) => console.error("[password-reset] send failed:", (err as Error)?.message));

  audit({ category: "AUTH", action: "password_reset.requested", actorId: user.id, targetType: "User", targetId: user.id });
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
): Promise<{ ok: true } | { ok: false; error: string }> {
  const pwError = validatePasswordStrength(newPassword);
  if (pwError) return { ok: false, error: pwError };

  const user = await db.user.findById(userId);
  if (!user) return { ok: false, error: "User not found." };

  // If the user already has a password, verify the current one.
  if (user.passwordHash && user.passwordSalt) {
    const { verifyPassword } = await import("./crypto");
    const valid = await verifyPassword(currentPassword, user.passwordSalt, user.passwordHash);
    if (!valid) return { ok: false, error: "Current password is incorrect." };
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
