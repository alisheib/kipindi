"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { loginWithPassword, requestLoginOtp, verifyOtpAndAuth, completeTwoFactorLogin } from "@/lib/server/auth-service";
import { signSession, verifySession } from "@/lib/server/crypto";
import { rateCheck } from "@/lib/server/rate-limit";
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
  const phone = String(formData.get("phone") ?? "");
  const password = String(formData.get("password") ?? "");
  const nextRaw = String(formData.get("next") ?? "");
  // Open-redirect safety: only accept a same-origin path. Reject any
  // protocol-relative ("//evil.com"), absolute URL, or empty value.
  // Also keep the user on the auth surface forwarded by the proxy
  // ONLY when it points at an in-app destination.
  const next = /^\/(?![/\\])/.test(nextRaw) ? nextRaw : "";
  // And never let `next` send the user back to the auth pages themselves.
  const safeNext = next && !next.startsWith("/auth/") ? next : "";

  const result = await loginWithPassword({ phone, password });
  if (!result.ok) {
    const params = new URLSearchParams({
      phone,
      error: result.code === "NOT_FOUND" ? "no_account"
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
    redirect("/auth/login?error=session_expired");
  }
  const userId = payload!.uid!;
  const nextParam = safeNext ? `&next=${encodeURIComponent(safeNext)}` : "";
  const rl = rateCheck(userId, "totp.verify");
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
  const result = await requestLoginOtp({ phone });
  const params = new URLSearchParams({ purpose, phone });
  if (!result.ok) {
    params.set("error", result.code === "NOT_FOUND" ? "no_account" : result.code === "RATE_LIMITED" ? "rate_limited" : "failed");
    if (result.code === "RATE_LIMITED" && result.retryAfterSec) params.set("retry", String(result.retryAfterSec));
  } else {
    params.set("sent", "1");
  }
  redirect(`/auth/otp?${params.toString()}`);
}

export async function verifyLoginOtpAction(formData: FormData) {
  const phone = String(formData.get("phone") ?? "");
  const code = String(formData.get("code") ?? "");
  const purpose = String(formData.get("purpose") ?? "login") as "login" | "register" | "withdraw" | "reauth" | "self_exclusion";
  const result = await verifyOtpAndAuth({ phone, code, purpose });
  if (!result.ok) {
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
    redirect(`/auth/otp?${params.toString()}`);
  }
  // Success — fire a "welcome" flash on the destination so the user
  // gets clear confirmation that the auth completed.
  // Honor a safe ?next= (same rules as the password path) so a gated OTP login
  // lands back where the player intended, not always home.
  const nextRaw = String(formData.get("next") ?? "").trim();
  const safeNext = /^\/(?![/\\])/.test(nextRaw) && !nextRaw.startsWith("/auth/") ? nextRaw : "";
  if (result.data?.isNew) redirect(`/profile/kyc?welcome=new${safeNext ? `&next=${encodeURIComponent(safeNext)}` : ""}`);
  redirect((safeNext || "/?welcome=back") as never);
}
