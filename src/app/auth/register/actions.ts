"use server";

import { redirect } from "next/navigation";
import { requestRegisterOtp } from "@/lib/server/auth-service";

export async function startRegisterAction(formData: FormData) {
  const phone = String(formData.get("phone") ?? "");
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
