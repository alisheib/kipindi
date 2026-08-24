"use server";

import { redirect } from "next/navigation";
import { requestPasswordReset } from "@/lib/server/password-reset";
import { rateCheckAsync } from "@/lib/server/rate-limit";
import { resolveLoginIdentifier } from "@/lib/server/auth-service";

/**
 * Recovery accepts a PHONE **or** an EMAIL — the same two credentials sign-in
 * accepts, resolved by the same function.
 *
 * 🔴 It used to accept a phone only. `tzPhone.safeParse` ran on whatever was
 * typed, so an address failed the parse and bounced back as "enter your phone
 * number" — a player who registered with an email and remembered only that had
 * no route back into their account, while the sign-in page one click away
 * offered them a Phone/Email switcher. 66 of 100 production accounts carry an
 * email. (`requestPasswordReset` carries the rest of the reasoning.)
 *
 * ⚠️ `identifier` is the field name; `phone` is still read as a fallback so a
 * cached page, a bookmarked form or a password manager autofilling the legacy
 * name keeps working — exactly the allowance `startLoginAction` makes.
 */
export async function requestResetAction(formData: FormData) {
  const raw = String(formData.get("identifier") ?? formData.get("phone") ?? "").trim();
  if (!raw) redirect("/auth/forgot-password?error=identifier_required");

  // ⭐ ONE resolver, shared with sign-in: a literal `@` picks the email branch,
  // anything else goes through the canonical TZ phone parser (which normalises
  // 0…/255…/+255…/9-digit alike, so a reset lookup never misses on formatting).
  const resolved = resolveLoginIdentifier(raw);
  if (!resolved) {
    redirect(`/auth/forgot-password?error=identifier_required&identifier=${encodeURIComponent(raw)}`);
  }

  // Rate-limit on the NORMALISED value, so "0712345678", "+255712345678" and
  // "712 345 678" share one bucket instead of three, and an address is bucketed
  // lower-cased. Same key shape sign-in uses.
  const rl = await rateCheckAsync(resolved.value, "password_reset");
  if (!rl.allowed) {
    redirect(`/auth/forgot-password?error=rate_limited&identifier=${encodeURIComponent(raw)}`);
  }

  await requestPasswordReset(resolved.value);
  // ⛔ ALWAYS "sent", on every branch — unknown number, unknown address, or a
  // real account with no email on file must be indistinguishable from a hit.
  // The page's own copy states the precondition rather than this redirect
  // implying a link is definitely on its way.
  redirect(`/auth/forgot-password?sent=1&identifier=${encodeURIComponent(raw)}`);
}
