"use server";

import { redirect } from "next/navigation";
import { requestPasswordReset } from "@/lib/server/password-reset";
import { rateCheckAsync } from "@/lib/server/rate-limit";
import { tzPhone } from "@/lib/server/validators";

export async function requestResetAction(formData: FormData) {
  const phone = String(formData.get("phone") ?? "").trim();
  if (!phone) redirect("/auth/forgot-password?error=phone_required");

  // Normalize via the canonical TZ phone parser — handles spaces/dashes and the
  // 0…/255…/+255…/9-digit shapes identically to login/registration, so a reset
  // lookup never silently misses on a differently-formatted number.
  const parsed = tzPhone.safeParse(phone);
  if (!parsed.success) redirect(`/auth/forgot-password?error=phone_required&phone=${encodeURIComponent(phone)}`);
  const normalized = parsed.data;

  const rl = await rateCheckAsync(normalized, "password_reset");
  if (!rl.allowed) {
    redirect(`/auth/forgot-password?error=rate_limited&phone=${encodeURIComponent(phone)}`);
  }

  await requestPasswordReset(normalized);
  // Always show "sent" regardless of whether the phone exists or has email
  // to prevent phone enumeration.
  redirect(`/auth/forgot-password?sent=1&phone=${encodeURIComponent(phone)}`);
}
