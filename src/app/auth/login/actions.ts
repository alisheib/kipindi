"use server";

import { redirect } from "next/navigation";
import { requestLoginOtp, verifyOtpAndAuth } from "@/lib/server/auth-service";

export async function startLoginAction(formData: FormData) {
  const phoneRaw = String(formData.get("phone") ?? "");
  const result = await requestLoginOtp({ phone: phoneRaw });
  if (!result.ok) {
    // Surface the no-account case via redirect-with-flash so the login
    // page can render a clear "Create one" link. Other errors fall back
    // to the same query-param channel.
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
