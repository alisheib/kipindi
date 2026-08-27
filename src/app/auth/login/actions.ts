"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { loginWithPassword, requestLoginOtp, verifyOtpAndAuth, completeTwoFactorLogin } from "@/lib/server/auth-service";
import { signSession, verifySession } from "@/lib/server/crypto";
import { rateCheckAsync } from "@/lib/server/rate-limit";
import { verifyPlayer2faChallenge } from "@/lib/server/player-2fa";

/** Short-lived, HMAC-signed pre-session token proving the password step passed. */
const PENDING_2FA_COOKIE = "kp_pending_2fa";
const PENDING_2FA_TTL_MS = 5 * 60 * 1000;

function sanitizeNext(raw: string): string {
  const next = /^\/(?![/\\])/.test(raw) ? raw : "";
  return next && !next.startsWith("/auth/") ? next : "";
}

/**
 * Phone + password sign-in. The OTP path below is preserved verbatim;
 * route /auth/login back to startLoginOtpAction once SMS provider is
 * signed and the OTP delivery is reliable.
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
  const next = /^\/(?![/\\])/.test(nextRaw) ? nextRaw : "";
  // And never let `next` send the user back to the auth pages themselves.
  const safeNext = next && !next.startsWith("/auth/") ? next : "";

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
    redirect(`/auth/login?${params.toString()}`);
  }
  // 2FA gate — the password was correct but the player has TOTP enabled. No
  // session was minted; issue a short-lived signed pending token and divert to
  // the challenge. The token is HMAC-signed (unforgeable) + expires in 5 min.
  if (result.data?.twoFactorRequired && result.data.userId) {
    const jar = await cookies();
    jar.set(PENDING_2FA_COOKIE, signSession({ p: "login-2fa", uid: result.data.userId, exp: Date.now() + PENDING_2FA_TTL_MS }), {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: PENDING_2FA_TTL_MS / 1000,
    });
    redirect((`/auth/2fa${safeNext ? `?next=${encodeURIComponent(safeNext)}` : ""}`) as never);
  }
  // Admins land directly in /admin; players honour the proxy's `next`
  // round-trip when present so the visitor lands back on the page they
  // tried to reach (e.g. /wallet, /positions). Falls back to home.
  if (result.data?.role && result.data.role !== "PLAYER" && result.data.role !== "AGENT") {
    redirect((safeNext.startsWith("/admin") ? safeNext : "/admin") as never);
  }
  redirect((safeNext || "/?welcome=back") as never);
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
    redirect((`/auth/2fa?error=rate_limited${nextParam}`) as never);
  }
  const proof = await verifyPlayer2faChallenge(userId, code);
  if (!proof) {
    redirect((`/auth/2fa?error=invalid${nextParam}`) as never);
  }
  const done = await completeTwoFactorLogin(userId);
  jar.delete(PENDING_2FA_COOKIE);
  if (!done.ok) {
    redirect("/auth/login?error=blocked");
  }
  if (done.data?.role && done.data.role !== "PLAYER" && done.data.role !== "AGENT") {
    redirect((safeNext.startsWith("/admin") ? safeNext : "/admin") as never);
  }
  redirect((safeNext || "/?welcome=back") as never);
}

/** Legacy OTP login — re-enable once SMS goes live. */
export async function startLoginOtpAction(formData: FormData) {
  const phoneRaw = String(formData.get("phone") ?? "");
  const nextRaw = String(formData.get("next") ?? "").trim();
  const safeNext = /^\/(?![/\\])/.test(nextRaw) && !nextRaw.startsWith("/auth/") ? nextRaw : "";
  const result = await requestLoginOtp({ phone: phoneRaw });
  if (!result.ok) {
    const params = new URLSearchParams({
      phone: phoneRaw,
      error: result.code === "NOT_FOUND" ? "no_account" : result.code === "RATE_LIMITED" ? "rate_limited" : "blocked",
    });
    if (safeNext) params.set("next", safeNext);
    redirect(`/auth/login?${params.toString()}`);
  }
  const otpParams = new URLSearchParams({ purpose: "login", phone: phoneRaw });
  if (safeNext) otpParams.set("next", safeNext);
  // B-27 — carry the code's REAL expiry so the countdown is anchored truth,
  // not a client-invented 5:00 that restarts on every reload.
  if (result.data?.expiresAt) otpParams.set("exp", result.data.expiresAt);
  redirect(`/auth/otp?${otpParams.toString()}`);
}

/**
 * Resend an OTP for the login-class purposes (login/withdraw/reauth), which
 * only need the phone number. Register OTPs require the full sign-up payload,
 * so those are handled by sending the user back to /auth/register instead.
 */
export async function resendOtpAction(formData: FormData) {
  const phone = String(formData.get("phone") ?? "");
  const purpose = String(formData.get("purpose") ?? "login") as "login" | "register" | "withdraw" | "reauth" | "self_exclusion";
  // B-14 — the resend hop used to rebuild the OTP URL without `next`, dropping
  // the destination the whole funnel had carried up to that point.
  const safeNext = sanitizeNext(String(formData.get("next") ?? ""));
  const result = await requestLoginOtp({ phone });
  const params = new URLSearchParams({ purpose, phone });
  if (safeNext) params.set("next", safeNext);
  if (!result.ok) {
    params.set("error", result.code === "NOT_FOUND" ? "no_account" : result.code === "RATE_LIMITED" ? "rate_limited" : "failed");
    if (result.code === "RATE_LIMITED" && result.retryAfterSec) params.set("retry", String(result.retryAfterSec));
  } else {
    params.set("sent", "1");
    // B-27 — the fresh code's real expiry re-anchors the countdown.
    if (result.data?.expiresAt) params.set("exp", result.data.expiresAt);
  }
  redirect(`/auth/otp?${params.toString()}`);
}

export async function verifyLoginOtpAction(formData: FormData) {
  const phone = String(formData.get("phone") ?? "");
  const code = String(formData.get("code") ?? "");
  const purpose = String(formData.get("purpose") ?? "login") as "login" | "register" | "withdraw" | "reauth" | "self_exclusion";
  // B-14 — read `next` up front: the FAILURE hop used to drop it, so one wrong
  // code cost the player their destination for the rest of the funnel.
  const nextRaw = String(formData.get("next") ?? "").trim();
  const safeNext = /^\/(?![/\\])/.test(nextRaw) && !nextRaw.startsWith("/auth/") ? nextRaw : "";
  const result = await verifyOtpAndAuth({ phone, code, purpose });
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
      purpose,
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
  // Success — fire a "welcome" flash on the destination so the user
  // gets clear confirmation that the auth completed.
  // Honor a safe ?next= (same rules as the password path) so a gated OTP login
  // lands back where the player intended, not always home.
  if (result.data?.isNew) redirect(`/profile/kyc?welcome=new${safeNext ? `&next=${encodeURIComponent(safeNext)}` : ""}`);
  redirect((safeNext || "/?welcome=back") as never);
}
