"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { loginWithPassword, requestLoginOtp, verifyOtpAndAuth, completeTwoFactorLogin } from "@/lib/server/auth-service";
import { signSession, verifySession } from "@/lib/server/crypto";
import { rateCheckAsync } from "@/lib/server/rate-limit";
import { verifyPlayer2faChallenge } from "@/lib/server/player-2fa";
// The same-origin rule for `next`, shared with the journey's pending-bet link (Vodacom plan S3).
import { isAdminPath, isAuthPath, isSafePath, sanitizeNext } from "@/lib/safe-next";
import { accountRefusalPath, landingAfterAuth } from "@/lib/auth-landing";
import { normalizeReferralCode } from "@/lib/referral-code";
import { phoneCodeSignInEnabled } from "@/lib/server/otp-door";

/** Short-lived, HMAC-signed pre-session token proving the password step passed. */
const PENDING_2FA_COOKIE = "kp_pending_2fa";
const PENDING_2FA_TTL_MS = 5 * 60 * 1000;

function signInPath(safeNext: string): string {
  return `/auth/login${safeNext ? `?next=${encodeURIComponent(safeNext)}` : ""}`;
}
/** The one copy of the pending-two-step token: signed, 5 minutes, then /auth/2fa. */
async function divertToTwoFactor(userId: string, safeNext: string): Promise<never> {
  const jar = await cookies();
  jar.set(PENDING_2FA_COOKIE, signSession({ p: "login-2fa", uid: userId, exp: Date.now() + PENDING_2FA_TTL_MS }), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: PENDING_2FA_TTL_MS / 1000,
  });
  redirect((`/auth/2fa${safeNext ? `?next=${encodeURIComponent(safeNext)}` : ""}`) as never);
}

/**
 * Phone + password sign-in — the only sign-in any form offers. The one-time-code SIGN-IN below is
 * dormant (`otp-door.ts`: OTP_ENABLED closes its page and every code action) and wired to no form;
 * it signs EXISTING accounts in only — no code creates an account. SMS is live (Blackball) and its
 * delivery is proven, so offering phone-code login is a product change, not a provider wait: a
 * "send me a code" option in EN/SW/ZH with its visual drives, then OTP_ENABLED=1.
 * See docs/BLACKBALL-SMS.md §7 step 6 (corrected 2026-09-25).
 */
export async function startLoginAction(formData: FormData) {
  // One field, either credential. `phone` is still read as a fallback so any
  // cached/older form markup (or a password manager that autofills the legacy
  // field name) keeps working.
  const identifier = String(formData.get("identifier") ?? formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nextRaw = String(formData.get("next") ?? "");
  // Open-redirect safety: only accept a same-origin path. Reject any
  // protocol-relative ("//evil.com"), absolute URL, or empty value.
  // Also keep the user on the auth surface forwarded by the proxy
  // ONLY when it points at an in-app destination.
  const next = isSafePath(nextRaw) ? nextRaw : "";
  // And never let `next` send the user back to the auth pages themselves.
  // E-381 §6 item 14 — a position permalink's `#pos_…` fragment, read by `NextHashField` (a fragment never reaches the
  // server), re-attached after its shape is checked, so every redirect below that carries `next` carries it too.
  const hashRaw = String(formData.get("nextHash") ?? "");
  const safeHash = /^#[A-Za-z0-9_-]{1,80}$/.test(hashRaw) ? hashRaw : "";
  const safeNext = next && !isAuthPath(next) ? (next.includes("#") ? next : next + safeHash) : "";

  const result = await loginWithPassword({ identifier, password });
  if (!result.ok) {
    // B-13 — two states used to collapse into dead-ends:
    //  · every SUSPENDED became the generic "blocked · contact support", which
    //    told a self-excluded player nothing (the ?excluded=1 panel existed but
    //    was unreachable from login);
    //  · the brute-force LOCKOUT (a RATE_LIMITED with lockout wording) rendered
    //    as ordinary rate-limiting, hiding the "reset your password" way out.
    // The service's code union is shared platform-wide, so the refinement reads
    // the refusal's own stable phrase — the UD-4 doctrine.
    // 🔴 SWITCH ON THE MACHINE TOKEN, NOT ON THE SENTENCE (`E-240`).
    //
    // This read `/self-exclusion/i` over the refusal's English prose, and the comment above
    // called that "the UD-4 doctrine" — but `failure-reasons.ts` is explicit that a phrase test
    // on prose is the thing being retired, and this one broke the moment the gate's wording
    // improved. Measured on production before the fix: a player whose period had ENDED matched,
    // and was shown *"you will not be able to sign in until the period ends"* about a period
    // that ended an hour earlier; a player still SERVING did NOT match (their sentence says
    // "self-excluded", not "self-exclusion") and fell through to the generic blocked screen.
    // Both wrong, in opposite directions, from one regex.
    // B4 · a CLOSED account is told it is closed (the login page's closed=1 panel), never "blocked".
    if (result.code === "SUSPENDED" && result.detail?.accountClosed) redirect(accountRefusalPath(result.detail, safeNext) as never);
    const standing = result.detail?.standing;
    if (result.code === "SUSPENDED" && standing && standing !== "diverged") {
      const until = standing === "serving" && result.detail?.until
        ? `&until=${encodeURIComponent(result.detail.until.slice(0, 10))}` : "";
      redirect(`/auth/login?excluded=${standing}${until}${safeNext ? `&next=${encodeURIComponent(safeNext)}` : ""}`);
    }
    const isLockout = result.code === "RATE_LIMITED" && /locked/i.test(result.error);
    const params = new URLSearchParams({
      identifier,
      error: result.code === "NOT_FOUND" ? "no_account"
        : isLockout ? "locked"
        : result.code === "RATE_LIMITED" ? "rate_limited"
        : result.code === "SUSPENDED" ? "blocked"
        : "wrong_credentials",
    });
    if (result.code === "RATE_LIMITED" && result.retryAfterSec) {
      params.set("retry", String(Math.max(1, Math.ceil(result.retryAfterSec))));
    }
    if (safeNext) params.set("next", safeNext);
    // B3: the referral code rides back on the failure hop only; the excluded, closed and 2FA hops concern existing accounts
    const ref = normalizeReferralCode(String(formData.get("ref") ?? ""));
    if (ref) params.set("ref", ref);
    redirect(`/auth/login?${params.toString()}`);
  }
  // 2FA gate — the password was correct but the player has TOTP enabled. No
  // session was minted; issue a short-lived signed pending token and divert to
  // the challenge. The token is HMAC-signed (unforgeable) + expires in 5 min.
  if (result.data?.twoFactorRequired && result.data.userId) {
    await divertToTwoFactor(result.data.userId, safeNext);
  }
  // THE ONE LANDING RULE (`landingAfterAuth`, src/lib/auth-landing.ts), shared by every sign-in and sign-up door: staff
  // land on an /admin next, else /admin; a player or agent on the safe next (never an /admin one) or home, greeted
  // before any #fragment.
  redirect(landingAfterAuth({ role: result.data?.role, next: safeNext, kind: "back" }) as never);
}

/**
 * Verify the login-time 2FA challenge (TOTP or a one-time backup code). Reads the
 * signed pending token (proof the password step passed), rate-limits the attempt,
 * verifies the code, and ONLY THEN mints the real session. No authenticated
 * cookie exists until this succeeds.
 */
export async function verifyLogin2faAction(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const safeNext = sanitizeNext(String(formData.get("next") ?? ""));
  // A mistyped BACKUP code stays on the backup box: the failure hops carry the mode back (they flipped to the 6-digit box).
  const modeParam = String(formData.get("mode") ?? "") === "backup" ? "&mode=backup" : "";
  const jar = await cookies();
  const payload = verifySession<{ p?: string; uid?: string }>(jar.get(PENDING_2FA_COOKIE)?.value);
  if (!payload || payload.p !== "login-2fa" || !payload.uid) {
    // B-14 — keep the destination through the expiry hop so a re-login still
    // lands where the player was heading (B-13 gave this error its panel).
    redirect(`/auth/login?error=session_expired${safeNext ? `&next=${encodeURIComponent(safeNext)}` : ""}`);
  }
  const userId = payload!.uid!;
  const nextParam = safeNext ? `&next=${encodeURIComponent(safeNext)}` : "";
  const rl = await rateCheckAsync(userId, "totp.verify");
  if (!rl.allowed) {
    redirect((`/auth/2fa?error=rate_limited${modeParam}${nextParam}`) as never);
  }
  const proof = await verifyPlayer2faChallenge(userId, code);
  if (!proof) {
    redirect((`/auth/2fa?error=invalid${modeParam}${nextParam}`) as never);
  }
  const done = await completeTwoFactorLogin(userId);
  jar.delete(PENDING_2FA_COOKIE);
  // An account refusal gets the login page's own panel (closed, the exclusion standings, else blocked), next kept.
  if (!done.ok) redirect(accountRefusalPath(done.detail, safeNext) as never);
  // THE ONE LANDING RULE — `landingAfterAuth`, the same as the password door.
  redirect(landingAfterAuth({ role: done.data?.role, next: safeNext, kind: "back" }) as never);
}

/** OTP login: built, and the SMS rail is live (Blackball), but wired to no form. Offering it is a product change (docs/BLACKBALL-SMS.md §7 step 6). */
export async function startLoginOtpAction(formData: FormData) {
  const phoneRaw = String(formData.get("phone") ?? "");
  const nextRaw = String(formData.get("next") ?? "").trim();
  const safeNext = sanitizeNext(nextRaw);
  if (!phoneCodeSignInEnabled()) redirect(signInPath(safeNext) as never);
  const result = await requestLoginOtp({ phone: phoneRaw });
  if (!result.ok) {
    const params = new URLSearchParams({
      phone: phoneRaw,
      // SMS_UNDELIVERABLE is its own hop. Sending the player to /auth/otp for a code
      // that was never sent is the dead-screen failure this whole change is against.
      error: result.code === "NOT_FOUND" ? "no_account" : result.code === "SMS_UNDELIVERABLE" ? "sms_down" : result.code === "RATE_LIMITED" ? "rate_limited" : "blocked",
    });
    if (safeNext) params.set("next", safeNext);
    redirect(`/auth/login?${params.toString()}`);
  }
  const otpParams = new URLSearchParams({ phone: phoneRaw });
  if (safeNext) otpParams.set("next", safeNext);
  // B-27 — carry the code's REAL expiry so the countdown is anchored truth,
  // not a client-invented 5:00 that restarts on every reload.
  if (result.data?.expiresAt) otpParams.set("exp", result.data.expiresAt);
  redirect(`/auth/otp?${otpParams.toString()}`);
}

/** Resend a sign-in code (the only kind of code there is). */
export async function resendOtpAction(formData: FormData) {
  const phone = String(formData.get("phone") ?? "");
  // B-14 — the resend hop used to rebuild the OTP URL without `next`, dropping
  // the destination the whole funnel had carried up to that point.
  const safeNext = sanitizeNext(String(formData.get("next") ?? ""));
  if (!phoneCodeSignInEnabled()) redirect(signInPath(safeNext) as never);
  const result = await requestLoginOtp({ phone });
  const params = new URLSearchParams({ phone });
  if (safeNext) params.set("next", safeNext);
  if (!result.ok) {
    params.set("error", result.code === "NOT_FOUND" ? "no_account" : result.code === "SMS_UNDELIVERABLE" ? "sms_down" : result.code === "RATE_LIMITED" ? "rate_limited" : "failed");
    if (result.code === "RATE_LIMITED" && result.retryAfterSec) params.set("retry", String(result.retryAfterSec));
  } else {
    params.set("sent", "1");
    // B-27 — the fresh code's real expiry re-anchors the countdown.
    if (result.data?.expiresAt) params.set("exp", result.data.expiresAt);
  }
  redirect(`/auth/otp?${params.toString()}`);
}

export async function verifyLoginOtpAction(formData: FormData) {
  // B-14 — read `next` up front: the FAILURE hop used to drop it, so one wrong
  // code cost the player their destination for the rest of the funnel.
  const safeNext = sanitizeNext(String(formData.get("next") ?? "").trim());
  if (!phoneCodeSignInEnabled()) redirect(signInPath(safeNext) as never);
  const phone = String(formData.get("phone") ?? "");
  const code = String(formData.get("code") ?? "");
  // The purpose is the server's (verifyOtpAndAuth consumes a LOGIN code only): nothing the browser names is read.
  const result = await verifyOtpAndAuth({ phone, code });
  if (!result.ok) {
    // 🔴 `E-244` · AN ACCOUNT-STATUS REFUSAL IS NOT AN OTP ERROR, AND THIS HOP USED TO FLATTEN
    // IT INTO ONE. `E-240` moved the self-exclusion check off the OTP REQUEST (where it was
    // answering a gambling-harm status to anyone who typed a phone number) onto the VERIFY,
    // where ownership has been proven. That is right — but everything below maps an unknown
    // code to `error=failed`, so the player who had just proved the number was theirs was told
    // only *"that didn't work"*, with no mention of the exclusion, no end date, and no way back.
    // ⛔ THE FIX FOR ONE SCREEN MUST NOT DARKEN THE ONE BESIDE IT. A SUSPENDED refusal goes to
    // the same three banners the password door uses, off the same machine token.
    if (result.code === "SUSPENDED") {
      if (result.detail?.accountClosed) redirect(accountRefusalPath(result.detail, safeNext) as never);
      const standing = result.detail?.standing;
      if (standing && standing !== "diverged") {
        const until = standing === "serving" && result.detail?.until
          ? `&until=${encodeURIComponent(result.detail.until.slice(0, 10))}` : "";
        redirect(`/auth/login?excluded=${standing}${until}${safeNext ? `&next=${encodeURIComponent(safeNext)}` : ""}`);
      }
      redirect(`/auth/login?error=blocked${safeNext ? `&next=${encodeURIComponent(safeNext)}` : ""}`);
    }
    // Surface OTP errors back on the OTP page via query-param flash so
    // the user sees what went wrong (wrong code / expired / rate-limited).
    const params = new URLSearchParams({
      phone,
      error: result.code === "INVALID" ? "wrong_code"
        : result.code === "EXPIRED" ? "expired"
        : result.code === "TOO_MANY_ATTEMPTS" ? "too_many"
        : result.code === "RATE_LIMITED" ? "rate_limited"
        : "failed",
    });
    if (safeNext) params.set("next", safeNext);
    // B-27 — the failed-verify hop keeps the code's real expiry anchor.
    const expRaw = String(formData.get("exp") ?? "");
    if (expRaw && Number.isFinite(Date.parse(expRaw))) params.set("exp", expRaw);
    redirect(`/auth/otp?${params.toString()}`);
  }
  // A staff account proved the number, never the password: it is sent to the staff form, an /admin next kept.
  if (result.data?.passwordRequired) redirect((`/auth/admin${isAdminPath(safeNext) ? `?next=${encodeURIComponent(safeNext)}` : ""}`) as never);
  // The code stood in for the password only: a two-step account still answers its authenticator.
  if (result.data?.twoFactorRequired && result.data.userId) await divertToTwoFactor(result.data.userId, safeNext);
  // THE ONE LANDING RULE — `landingAfterAuth`; this door signs existing accounts in only, so it greets them back.
  redirect(landingAfterAuth({ role: result.data?.role, next: safeNext, kind: "back" }) as never);
}
