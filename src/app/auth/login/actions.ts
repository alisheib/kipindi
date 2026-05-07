"use server";

import { redirect } from "next/navigation";
import { requestLoginOtp, verifyOtpAndAuth } from "@/lib/server/auth-service";

/** Combine the country-code dropdown + national number into E.164. */
function joinPhone(formData: FormData): string {
  const cc = String(formData.get("phone-cc") ?? "+255").trim();
  const local = String(formData.get("phone") ?? "").trim().replace(/[\s-]/g, "");
  // Strip a leading 0 from the national number (legacy local format).
  const stripped = local.startsWith("0") ? local.slice(1) : local;
  // If the user already typed the +cc (e.g. paste), trust that.
  if (local.startsWith("+")) return local;
  return `${cc}${stripped}`;
}

export async function startLoginAction(formData: FormData) {
  const phoneRaw = joinPhone(formData);
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
