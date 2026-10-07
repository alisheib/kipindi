/**
 * Password reset — stateless HMAC-signed token approach (same pattern as
 * email verification). No DB row for the token itself:
 *   - Token embeds userId + email + exp
 *   - Changing email invalidates all outstanding reset links
 *   - HMAC prevents forgery; exp prevents replay
 *
 * Two entry points:
 *   1. Player-initiated: /auth/forgot-password → a phone OR an email (sign-in's
 *      own resolveLoginIdentifier) → a link to the address the ACCOUNT holds, or
 *      to the address typed when it names that account. Never PHONE_EMAIL_MAP
 *      (retired from recovery 2026-10-06). Every branch - unknown number, unknown
 *      address, an account with no email - answers the same, in the same time:
 *      the mail leaves after the reply (requestPasswordReset).
 *   2. Admin-initiated: officer generates a temporary password directly
 *      (for support requests from users without email).
 */
import { runOutsideLock } from "./locks";
import { revokeUserSessions } from "./session-registry";
import { appUrl } from "@/lib/app-url";
import { createHash } from "node:crypto";
import { db } from "./store";
import { signSession, verifySession, hashPassword, randomId } from "./crypto";
import { audit } from "./audit";
import { sendEmail, sendEmailToUser, passwordResetHtml, passwordChangedHtml } from "./email";
import { boundedNext } from "@/lib/safe-next";
import { verifyCurrentPassword } from "./reauth";
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
// ⭐ THE BASE URL HAS ONE HOME: `appUrl()` (`src/lib/app-url.ts`).
// 🔴 This file carried a private `BASE_URL` defaulting to `kipindi-production.up.railway.app`
// until 2026-09-07 — a RETIRED host, and precisely the failure `app-url.ts` exists to prevent:
// its own header says the old default "meant any environment that forgot the env var would email
// people a railway.app link". Five files kept a copy of the bug beside the fix.

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
  /** Where the player was going (B1, 2026-10-06): bound at issue, re-checked at use (boundedNext); absent on links
   *  issued before this field. */
  next?: string;
  exp: number;
};

/** Short, non-reversible fingerprint of the current password hash (or "" for
 *  password-less / OTP-only accounts — any reset then sets one, changing it). */
export function passwordFingerprint(passwordHash: string | null | undefined): string {
  return createHash("sha256").update(passwordHash ?? "").digest("hex").slice(0, 16);
}

/** Build a signed reset URL for a user. `next` (already bounded by the caller) rides INSIDE the signed token: the link
 *  opens in a mail app's browser, where nothing outside the token survives the hop (B1, 2026-10-06). */
function buildResetUrl(userId: string, email: string, passwordHash: string | null | undefined, next = ""): string {
  const token = signSession({
    purpose: "password-reset",
    userId,
    email,
    pwh: passwordFingerprint(passwordHash),
    ...(next ? { next } : {}),
    exp: Date.now() + RESET_TTL_MS,
  } satisfies ResetTokenPayload);
  return `${appUrl()}/auth/reset-password?token=${encodeURIComponent(token)}`;
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
 * ⛔ ENUMERATION-NEUTRAL, ON EVERY BRANCH - IN SHAPE AND IN TIME. Unknown phone,
 * unknown address, known account with no email on file: all return `{ ok: true }`
 * and the page says the same sentence. A caller must never be able to tell which
 * happened. That is why this returns no count and no status - and why the mail is
 * NOT awaited (A2, 2026-10-06): a hit used to wait for the Postmark round trip and
 * a miss did not, so the reply's timing said which numbers have an account. The
 * mail now leaves after the reply, so a hit answers as fast as a miss. No padding.
 *
 * ⭐ `opts.next` (B1, 2026-10-06): where the player was going. Bounded here
 * (`boundedNext`: same-origin, not an /auth page, capped) and bound INSIDE each
 * signed token, so it survives the mail app's browser; re-checked at use.
 */
export async function requestPasswordReset(identifier: string, opts: { next?: string } = {}): Promise<{ ok: true }> {
  const resolved = resolveLoginIdentifier(identifier);
  // Not a valid phone OR address. Say nothing — the action has already decided
  // what the player sees, and an error here would be an existence oracle.
  if (!resolved) return { ok: true };
  const next = boundedNext((opts.next ?? "").trim());

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
    // ⭐ The link goes ONLY to the address the account holds - or, when the player
    // typed an address, to that one, which matched this account. ⛔ PHONE_EMAIL_MAP
    // is never a recovery address (A4, 2026-10-06): the account does not hold a
    // mapped address, so `validateResetToken` refused every link sent there - a dead
    // link, in an inbox the account never named. An account with no address falls
    // to the `password_reset.no_email` audit below and the page's support card.
    const email = resolved.kind === "email" ? resolved.value : user.email;
    if (!email) {
      // No email on file — can't send a link. The page already states this
      // precondition ("if an account WITH an email exists…"), so the player is
      // not told a link is on its way with no qualification. Still ok: silence
      // here and silence for an unknown number must be indistinguishable.
      audit({ category: "AUTH", action: "password_reset.no_email", actorId: user.id, targetType: "User", targetId: user.id });
      continue;
    }

    const resetLink = buildResetUrl(user.id, email, user.passwordHash, next);
    // NOT AWAITED (A2): the reply must take the same time whether or not an account exists; the mail leaves after it
    void sendEmail({
      to: email,
      subject: "Reset your password · 50pick",
      html: passwordResetHtml({ resetLink }),
      tag: "password-reset",
      trackLinks: false, // don't rewrite the reset link through Postmark tracking
    })
      .then((r) => { if (!r.ok) console.warn("[password-reset] reset mail not delivered (" + r.reason + ")"); })
      .catch((err) => console.error("[password-reset] send failed:", (err as Error)?.message));

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

/** Why a reset link cannot be used. The reset page picks its panel from it; `consumeResetToken` needs only "not ok". */
export type ResetTokenState = "expired" | "invalid" | "email_changed" | "used";

/**
 * Validate a reset token without consuming it: checks HMAC + expiry + that the
 * email and password-hash fingerprint still match what the link was issued
 * against. Used by the reset page (to pick its panel) and by consumeResetToken,
 * so the two can never disagree. Single-use is enforced by
 * the `pwh` fingerprint: a completed reset rotates the hash, so the link fails.
 *
 * 🔴 A5 (2026-10-06): the page carried its own copy of this check, and the two
 * disagreed on a token with NO fingerprint - the page drew the form, the action
 * refused it. There is one check now; a missing `pwh` is `used`, here, for both.
 * The error sentences are unchanged: `scripts/ops-reset-password.mts` prints them.
 *
 * ⭐ `next` (B1) is returned on every branch that read a payload, re-checked with
 * `boundedNext`, so a dead link still offers a new one that keeps the destination.
 */
export async function validateResetToken(
  token: string,
): Promise<
  | { ok: true; user: ResolvedUser; next: string }
  | { ok: false; error: string; state: ResetTokenState; next: string }
> {
  const payload = verifySession<ResetTokenPayload>(token);
  if (!payload) {
    return { ok: false, error: "Invalid or expired reset link. Request a new one.", state: "expired", next: "" };
  }
  if (payload.purpose !== "password-reset" || !payload.userId || !payload.email) {
    return { ok: false, error: "Invalid or expired reset link. Request a new one.", state: "invalid", next: "" };
  }
  const next = boundedNext((payload.next ?? "").trim());

  const user = await db.user.findById(payload.userId);
  if (!user) return { ok: false, error: "Account not found.", state: "invalid", next };

  // Email must not have changed since the link was issued.
  const currentEmail = (user.email ?? "").trim().toLowerCase();
  if (currentEmail !== payload.email.trim().toLowerCase()) {
    return { ok: false, error: "This reset link is no longer valid. Request a new one.", state: "email_changed", next };
  }

  // Single-use: the password must not have changed since the link was issued - and a token with no fingerprint
  // at all is refused here too (A5), never waved through.
  if (passwordFingerprint(user.passwordHash) !== payload.pwh) {
    return { ok: false, error: "This reset link has already been used. Request a new one.", state: "used", next };
  }

  return { ok: true, user, next };
}

/**
 * Consume a reset token: validate it (HMAC + expiry + email + single-use), then
 * set the new password. The reset rotates the password hash, which invalidates
 * this token for any subsequent use. Returns the destination bound inside the
 * token (B1; "" when none), for the action's sign-in redirect.
 */
export async function consumeResetToken(
  token: string,
  newPassword: string,
): Promise<{ ok: true; next: string } | { ok: false; error: string; code: "PW_WEAK" | "LINK_INVALID" }> {
  // ⭐ THE CODE TELLS THE PAGE WHICH IT WAS (2026-10-06). The action turned every failure into "that reset link is no
  // longer valid", and the strength check runs FIRST — so a password like "password123" was reported as a dead link,
  // above a form that still worked, and every new link said the same.
  const pwError = validatePasswordStrength(newPassword);
  if (pwError) return { ok: false, error: pwError, code: "PW_WEAK" };

  const check = await validateResetToken(token);
  if (!check.ok) return { ok: false, error: check.error, code: "LINK_INVALID" };
  const user = check.user;

  const salt = randomId(32);
  const hash = await hashPassword(newPassword, salt);
  // ⛔ The history columns ride in the SAME update as the hash (04 A4): the audit below is not awaited, and
  // a house-bot consent check that read it instead would wave through a password it never saw set.
  // ⭐ 2026-10-06 · THE RESET ALSO LIFTS THE WRONG-PASSWORD LOCK. The lockout screen offers exactly this way out
  // ("…or reset your password now"), and the lock — checked before the password — went on refusing the NEW password
  // for the rest of its 30 minutes. Proving the inbox is a stronger proof than the lock was waiting for.
  await db.user.update(user.id, {
    passwordHash: hash, passwordSalt: salt, passwordSetAt: new Date().toISOString(), passwordSetVia: "RESET_LINK",
    lockedUntil: null, failedLoginCount: 0,
  });
  // ⭐ 2026-10-06 · AND IT SIGNS OUT EVERY DEVICE. A reset is what an owner does when they fear someone else is in. It
  // used to rotate the password and leave the one live session — possibly the intruder's — betting the balance until
  // the owner's next sign-in displaced it (up to seven days). A missing registry row is a signed-out session
  // (`session.ts`, case c), so this ends it on its next request.
  await revokeUserSessions(user.id);
  // A2 · the holder hook: a house bot on this account stops, or records the change (C4-SPEC ruling 127).
  runOutsideLock(() => {
    void import("./house-bot/holder-hook").then((m) => m.onHolderAccountChanged(user.id, "PASSWORD_RESET_LINK")).catch(() => {});
  });

  audit({
    category: "AUTH",
    action: "password_reset.completed",
    actorId: user.id,
    targetType: "User",
    targetId: user.id,
  });
  alertPasswordChanged(user.id, "password reset link");
  return { ok: true, next: check.next };
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
  // OFFICER_TEMP in the same update (04 A4): support's password is not the holder's consent, and the
  // audit below is fire-and-forget.
  await db.user.update(userId, {
    passwordHash: hash, passwordSalt: salt, passwordSetAt: new Date().toISOString(), passwordSetVia: "OFFICER_TEMP",
    lockedUntil: null, failedLoginCount: 0,
  });
  // ⭐ 2026-10-06 · the same as a reset link: the wrong-password lock is lifted so the temporary password works, and
  // whoever held the old password's session is signed out.
  await revokeUserSessions(userId);
  // A2 · the holder hook: a house bot on this account stops, or records the change (C4-SPEC ruling 127).
  runOutsideLock(() => {
    void import("./house-bot/holder-hook").then((m) => m.onHolderAccountChanged(userId, "PASSWORD_OFFICER_TEMP")).catch(() => {});
  });

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
  | { ok: false; error: string; code: "RATE_LIMITED"; retryAfterSec: number }
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

  // 🔴 A-X1 (2026-10-06) · the current password was checked here with NO limit: an unlimited current-password oracle for
  // anyone holding a session. It now goes through the one re-auth check (`reauth.ts`) and its own per-account bucket
  // (`auth.reauth`) - never the sign-in lock, so a session holder cannot lock the owner out of sign-in. A weak new
  // password (above) spends nothing; every attempt here spends a token, a correct one included.
  if (user.passwordHash && user.passwordSalt) {
    const re = await verifyCurrentPassword(userId, currentPassword, "password_change");
    if (!re.ok) {
      if (re.code === "RATE_LIMITED") return { ok: false, error: re.error, code: "RATE_LIMITED", retryAfterSec: re.retryAfterSec };
      return { ok: false, error: "Current password is incorrect.", code: "PW_CURRENT_WRONG", reason: "password_wrong" };
    }
  }

  const salt = randomId(32);
  const hash = await hashPassword(newPassword, salt);
  await db.user.update(userId, { passwordHash: hash, passwordSalt: salt, passwordSetAt: new Date().toISOString(), passwordSetVia: "SELF_CHANGE" });
  // A2 · the holder hook: a house bot on this account stops, or records the change (C4-SPEC ruling 127).
  runOutsideLock(() => {
    void import("./house-bot/holder-hook").then((m) => m.onHolderAccountChanged(userId, "PASSWORD_SELF_CHANGE")).catch(() => {});
  });

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
