"use server";

import { redirect } from "next/navigation";
import { requestPasswordReset } from "@/lib/server/password-reset";
import { rateCheck } from "@/lib/server/rate-limit";

export async function requestResetAction(formData: FormData) {
  const phone = String(formData.get("phone") ?? "").trim();
  if (!phone) redirect("/auth/forgot-password?error=phone_required");

  // Normalize: accept "0712345678" or "+255712345678"
  const normalized = phone.startsWith("0")
    ? `+255${phone.slice(1)}`
    : phone.startsWith("+")
      ? phone
      : `+255${phone}`;

  const rl = rateCheck(normalized, "password_reset");
  if (!rl.allowed) {
    redirect(`/auth/forgot-password?error=rate_limited&phone=${encodeURIComponent(phone)}`);
  }

  await requestPasswordReset(normalized);
  // Always show "sent" regardless of whether the phone exists or has email
  // to prevent phone enumeration.
  redirect(`/auth/forgot-password?sent=1&phone=${encodeURIComponent(phone)}`);
}
