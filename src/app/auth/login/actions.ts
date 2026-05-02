"use server";

import { redirect } from "next/navigation";
import { requestLoginOtp, verifyOtpAndAuth } from "@/lib/server/auth-service";

export async function startLoginAction(formData: FormData) {
  const phone = String(formData.get("phone") ?? "");
  const result = await requestLoginOtp({ phone });
  if (!result.ok) return { ok: false as const, error: result.error, code: result.code };
  redirect(`/auth/otp?purpose=login&phone=${encodeURIComponent(phone)}`);
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
