"use server";

import { redirect } from "next/navigation";
import { registerWithPassword, requestRegisterOtp } from "@/lib/server/auth-service";
import { normalizeReferralCode } from "@/lib/server/affiliate-service";

/**
 * Phone + password registration. The OTP-only path
 * `requestRegisterOtp` is preserved below — flip back when the SMS
 * provider contract is signed by routing the form to it again.
 */
export async function startRegisterAction(formData: FormData) {
  const phone = String(formData.get("phone") ?? "");
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");
  const dob = String(formData.get("dob") ?? "");
  const acceptTerms = formData.get("acceptTerms") === "on" || formData.get("acceptTerms") === "true";
  const acceptAge = formData.get("acceptAge") === "on" || formData.get("acceptAge") === "true";
  const marketingOptIn = formData.get("marketingOptIn") === "on";
  // ⛔ NEVER `.slice(0, 16)` — see `MAX_REFERRAL_CODE_LEN` in affiliate-service. Refuse, never
  // truncate: a cut prefix can match a different partner's code.
  const referralCode = normalizeReferralCode(String(formData.get("ref") ?? "")) ?? undefined;
  const inviteCode = String(formData.get("invite") ?? "").trim().slice(0, 24) || undefined;
  // Safe post-auth destination (the market the player tapped, etc.). Validated
  // same-origin relative, never an /auth/* loop.
  const nextRaw = String(formData.get("next") ?? "").trim();
  const safeNext = /^\/(?![/\\])/.test(nextRaw) && !nextRaw.startsWith("/auth/") ? nextRaw : "";

  const result = await registerWithPassword({
    phone, email, password, passwordConfirm, dob,
    acceptTerms, acceptAge, marketingOptIn, referralCode, inviteCode,
  });

  if (!result.ok) {
    const params = new URLSearchParams({
      phone,
      // Carry the email back so a failed sign-up doesn't make the player retype it.
      email,
      error: result.code === "ALREADY_EXISTS" ? "exists"
        : result.code === "EMAIL_EXISTS" ? "email_exists"
        : result.code === "RATE_LIMITED" ? "rate_limited"
        : "invalid",
    });
    if (result.error && result.code !== "ALREADY_EXISTS" && result.code !== "EMAIL_EXISTS" && result.code !== "RATE_LIMITED") {
      params.set("message", result.error);
    }
    if (safeNext) params.set("next", safeNext); // don't lose intent on a retry
    redirect(`/auth/register?${params.toString()}`);
  }

  // Bootstrap admin (phone in ADMIN_BOOTSTRAP_PHONES) lands directly in
  // the operator console — no KYC nag, status is already ACTIVE.
  if (result.data?.role && result.data.role !== "PLAYER" && result.data.role !== "AGENT") {
    redirect("/admin");
  }
  // ⭐ A NEW PLAYER GOES WHERE THEY WERE GOING, OR TO ADD MONEY — 2026-09-13.
  //
  // ⛔ NOT TO VERIFICATION. From 2026-09-05 to 2026-09-13 every new player was sent to
  // `/profile/kyc?welcome=new`, because identity then gated depositing and staking and the market
  // they wanted would have greeted them with a wall. That was the old ladder made literal — the
  // ID-upload form as the first screen of a brand-new account — and it is precisely the friction the
  // 2026-09-13 ruling removed: identity is now asked before a WITHDRAWAL and before nothing else.
  //
  // ⭐ SO THEIR INTENT IS HONOURED AGAIN. With a safe `next`, they land on the market they came from;
  // without one, on `/wallet/deposit`, whose only remaining errand is confirming the email we just
  // sent. `welcome=new` rides along either way so `AuthFlash` greets them wherever they land.
  if (safeNext) {
    const [path, query = ""] = safeNext.split("?");
    const qs = new URLSearchParams(query);
    qs.set("welcome", "new");
    redirect(`${path}?${qs.toString()}` as never);
  }
  redirect("/wallet/deposit?welcome=new" as never);
}

/** Legacy OTP-driven registration — re-enable once SMS provider goes live. */
export async function startRegisterOtpAction(formData: FormData) {
  const phone = String(formData.get("phone") ?? "");
  const dob = String(formData.get("dob") ?? "");
  const acceptTerms = formData.get("acceptTerms") === "on" || formData.get("acceptTerms") === "true";
  const acceptAge = formData.get("acceptAge") === "on" || formData.get("acceptAge") === "true";
  const marketingOptIn = formData.get("marketingOptIn") === "on";
  const nextRaw = String(formData.get("next") ?? "").trim();
  const safeNext = /^\/(?![/\\])/.test(nextRaw) && !nextRaw.startsWith("/auth/") ? nextRaw : "";

  const result = await requestRegisterOtp({
    phone, email: String(formData.get("email") ?? "").trim(), dob,
    acceptTerms: acceptTerms as true,
    acceptAge: acceptAge as true,
    marketingOptIn,
  });
  if (!result.ok) return { ok: false as const, error: result.error, code: result.code };
  const otpParams = new URLSearchParams({ purpose: "register", phone: result.data!.phone });
  if (safeNext) otpParams.set("next", safeNext);
  // B-27 — anchor the OTP page's countdown to the code's real expiry.
  otpParams.set("exp", result.data!.expiresAt);
  redirect(`/auth/otp?${otpParams.toString()}`);
}
