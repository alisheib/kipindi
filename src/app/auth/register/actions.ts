"use server";

import { redirect } from "next/navigation";
import { registerWithPassword, requestRegisterOtp } from "@/lib/server/auth-service";

/**
 * Phone + password registration. The OTP-only path
 * `requestRegisterOtp` is preserved below — flip back when the SMS
 * provider contract is signed by routing the form to it again.
 */
export async function startRegisterAction(formData: FormData) {
  const phone = String(formData.get("phone") ?? "");
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");
  const dob = String(formData.get("dob") ?? "");
  const acceptTerms = formData.get("acceptTerms") === "on" || formData.get("acceptTerms") === "true";
  const acceptAge = formData.get("acceptAge") === "on" || formData.get("acceptAge") === "true";
  const marketingOptIn = formData.get("marketingOptIn") === "on";
  const referralCode = String(formData.get("ref") ?? "").trim().slice(0, 16) || undefined;

  const result = await registerWithPassword({
    phone, password, passwordConfirm, dob,
    acceptTerms, acceptAge, marketingOptIn, referralCode,
  });

  if (!result.ok) {
    const params = new URLSearchParams({
      phone,
      error: result.code === "ALREADY_EXISTS" ? "exists"
        : result.code === "RATE_LIMITED" ? "rate_limited"
        : "invalid",
    });
    redirect(`/auth/register?${params.toString()}`);
  }

  // Bootstrap admin (phone in ADMIN_BOOTSTRAP_PHONES) lands directly in
  // the operator console — no KYC nag, status is already ACTIVE.
  if (result.data?.role && result.data.role !== "PLAYER" && result.data.role !== "AGENT") {
    redirect("/admin");
  }
  redirect("/profile/kyc?welcome=new");
}

/** Legacy OTP-driven registration — re-enable once SMS provider goes live. */
export async function startRegisterOtpAction(formData: FormData) {
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
