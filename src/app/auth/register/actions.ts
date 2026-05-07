"use server";

import { redirect } from "next/navigation";
import { requestRegisterOtp } from "@/lib/server/auth-service";

/** Combine the country-code dropdown + national number into E.164. */
function joinPhone(formData: FormData): string {
  const cc = String(formData.get("phone-cc") ?? "+255").trim();
  const local = String(formData.get("phone") ?? "").trim().replace(/[\s-]/g, "");
  if (local.startsWith("+")) return local;
  const stripped = local.startsWith("0") ? local.slice(1) : local;
  return `${cc}${stripped}`;
}

export async function startRegisterAction(formData: FormData) {
  const phone = joinPhone(formData);
  const dob = String(formData.get("dob") ?? "");
  const acceptTerms = formData.get("acceptTerms") === "on" || formData.get("acceptTerms") === "true";
  const acceptAge = formData.get("acceptAge") === "on" || formData.get("acceptAge") === "true";
  const marketingOptIn = formData.get("marketingOptIn") === "on";

  const result = await requestRegisterOtp({
    phone, dob,
    acceptTerms: acceptTerms as true,
    acceptAge: acceptAge as true,
    marketingOptIn,
  });
  if (!result.ok) return { ok: false as const, error: result.error, code: result.code };
  redirect(`/auth/otp?purpose=register&phone=${encodeURIComponent(result.data!.phone)}`);
}
