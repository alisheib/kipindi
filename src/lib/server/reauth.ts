/**
 * THE ONE CURRENT-PASSWORD CHECK OUTSIDE SIGN-IN (route audit 2026-10-06, cluster A). Asked by every change to a sign-in or
 * recovery factor: the contact email (add, change, remove), the password in settings, a confirmation link opened away from
 * the account's own session, turning on two-step. Its OWN per-account bucket (`auth.reauth`), never the sign-in lock
 * (failedLoginCount / lockedUntil): a shared lock would let anyone who knows a phone number freeze the owner's settings, and a
 * session holder lock the owner out of sign-in. Every call spends a token, a correct password included. The password is never
 * logged, audited or returned, and never trimmed.
 */
import { db } from "./store";
import { verifyPassword } from "./crypto";
import { rateCheckAsync } from "./rate-limit";
import { audit } from "./audit";

export type ReauthPurpose = "email_change" | "password_change" | "email_confirm" | "two_factor_enable";
export type ReauthResult =
  | { ok: true }
  | { ok: false; code: "RATE_LIMITED"; retryAfterSec: number; error: string }
  | { ok: false; code: "PW_CURRENT_WRONG"; reason: "password_wrong"; error: string }
  | { ok: false; code: "PW_NOT_SET"; error: string }
  | { ok: false; code: "NOT_FOUND"; reason: "not_found"; error: string };

export async function verifyCurrentPassword(userId: string, password: unknown, purpose: ReauthPurpose): Promise<ReauthResult> {
  const rl = await rateCheckAsync(userId, "auth.reauth");
  if (!rl.allowed) {
    audit({ category: "SECURITY", action: "auth.reauth.rate_limited", actorId: userId, targetType: "User", targetId: userId, payload: { purpose } });
    return { ok: false, code: "RATE_LIMITED", retryAfterSec: Math.max(1, Math.ceil(rl.retryAfterSec)), error: "Too many attempts. Please wait." };
  }
  const user = await db.user.findById(userId);
  if (!user) return { ok: false, code: "NOT_FOUND", reason: "not_found", error: "User not found." };
  // The CALLER decides what a password-less account (the dormant OTP era) means.
  if (!user.passwordHash || !user.passwordSalt) return { ok: false, code: "PW_NOT_SET", error: "No password is set on this account." };
  const pw = typeof password === "string" ? password : "";
  if (!pw || !(await verifyPassword(pw, user.passwordSalt, user.passwordHash))) {
    audit({ category: "SECURITY", action: "auth.reauth.bad_password", actorId: userId, targetType: "User", targetId: userId, payload: { purpose } });
    return { ok: false, code: "PW_CURRENT_WRONG", reason: "password_wrong", error: "Current password is incorrect." };
  }
  return { ok: true };
}
