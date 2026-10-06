"use server";

import { redirect } from "next/navigation";
import { consumeResetToken } from "@/lib/server/password-reset";

export async function resetPasswordAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!token) redirect("/auth/forgot-password");
  if (password !== confirm) {
    redirect(`/auth/reset-password?token=${encodeURIComponent(token)}&reason=password_mismatch` as never);
  }

  const result = await consumeResetToken(token, password);
  if (!result.ok) {
    // A weak password is not a dead link (2026-10-06): the form stays usable and says what to change. Each reason is
    // written out literally — `test:failure-reasons` §9d proves every reason row is reachable by finding it emitted.
    if (result.code === "PW_WEAK") {
      redirect(`/auth/reset-password?token=${encodeURIComponent(token)}&reason=password_weak` as never);
    }
    redirect(`/auth/reset-password?token=${encodeURIComponent(token)}&reason=reset_link_invalid` as never);
  }
  // B1 · the destination bound inside the token (re-checked by the validator) rides on to sign-in, so the player ends
  // up where they were going. The failure redirects above carry the token, which carries it.
  redirect(`/auth/login?reset=1${result.next ? `&next=${encodeURIComponent(result.next)}` : ""}` as never);
}
