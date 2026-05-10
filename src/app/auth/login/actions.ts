"use server";

import { redirect } from "next/navigation";
import { loginWithPassword, requestLoginOtp, verifyOtpAndAuth } from "@/lib/server/auth-service";

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
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "";
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
  // Admins land directly in /admin; players honour the proxy's `next`
  // round-trip when present so the visitor lands back on the page they
  // tried to reach (e.g. /wallet, /positions). Falls back to home.
  if (result.data?.role && result.data.role !== "PLAYER" && result.data.role !== "AGENT") {
    redirect(safeNext.startsWith("/admin") ? safeNext : "/admin");
  }
  redirect(safeNext || "/?welcome=back");
}

/** Legacy OTP login — re-enable once SMS goes live. */
export async function startLoginOtpAction(formData: FormData) {
  const phoneRaw = String(formData.get("phone") ?? "");
  const result = await requestLoginOtp({ phone: phoneRaw });
  if (!result.ok) {
    const params = new URLSearchParams({
      phone: phoneRaw,
      error: result.code === "NOT_FOUND" ? "no_account" : result.code === "RATE_LIMITED" ? "rate_limited" : "blocked",
    });
    redirect(`/auth/login?${params.toString()}`);
  }
  redirect(`/auth/otp?purpose=login&phone=${encodeURIComponent(phoneRaw)}`);
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
  if (result.data?.isNew) redirect("/profile/kyc?welcome=new");
  redirect("/?welcome=back");
}
