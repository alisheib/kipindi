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
  if (!result.ok) return { ok: false as const, error: result.error, code: result.code };
  if (result.data?.isNew) redirect("/profile/kyc");
  redirect("/");
}
