"use server";

import { redirect } from "next/navigation";
import { consumeResetToken } from "@/lib/server/password-reset";

export async function resetPasswordAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!token) redirect("/auth/forgot-password");
  if (password !== confirm) {
    redirect(`/auth/reset-password?token=${encodeURIComponent(token)}&error=${encodeURIComponent("Passwords do not match. · Nenosiri hazilingani.")}` as never);
  }

  const result = await consumeResetToken(token, password);
  if (!result.ok) {
    redirect(`/auth/reset-password?token=${encodeURIComponent(token)}&error=${encodeURIComponent(result.error)}` as never);
  }
  redirect("/auth/login?reset=1" as never);
}
