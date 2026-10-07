"use server";

import { redirect } from "next/navigation";
import { requestPasswordReset } from "@/lib/server/password-reset";
import { rateCheckAsync } from "@/lib/server/rate-limit";
import { clientMeta, resolveLoginIdentifier } from "@/lib/server/auth-service";
import { audit } from "@/lib/server/audit";
import { boundedNext } from "@/lib/safe-next";

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
 *
 * ⛔ NEUTRAL IN TIME AS WELL AS IN WORDS (A2, 2026-10-06). Every branch lands on
 * the same "sent" page, and `requestPasswordReset` no longer waits for the mail,
 * so a hit answers as fast as a miss. A second bucket per network
 * (`password_reset.ip`) bounds a script walking numbers, and the mail it costs us.
 * A rate-limited reply carries `retry=`, the seconds the bucket really needs, so
 * the page counts down instead of saying "wait a moment" for five minutes (A6).
 */
export async function requestResetAction(formData: FormData) {
  const raw = String(formData.get("identifier") ?? formData.get("phone") ?? "").trim();
  // B1 · the destination rides every hop - the same suffix on each, so no branch is distinguishable.
  const next = boundedNext(String(formData.get("next") ?? "").trim());
  const nextQs = next ? `&next=${encodeURIComponent(next)}` : "";
  if (!raw) redirect(`/auth/forgot-password?error=identifier_required${nextQs}` as never);

  // ⭐ ONE resolver, shared with sign-in: a literal `@` picks the email branch,
  // anything else goes through the canonical TZ phone parser (which normalises
  // 0…/255…/+255…/9-digit alike, so a reset lookup never misses on formatting).
  const resolved = resolveLoginIdentifier(raw);
  if (!resolved) redirect(`/auth/forgot-password?error=identifier_required&identifier=${encodeURIComponent(raw)}${nextQs}` as never);

  // Rate-limit on the NORMALISED value, so "0712345678", "+255712345678" and
  // "712 345 678" share one bucket instead of three, and an address is bucketed
  // lower-cased. Same key shape sign-in uses.
  const rl = await rateCheckAsync(resolved.value, "password_reset");
  if (!rl.allowed) redirect(`/auth/forgot-password?error=rate_limited&retry=${Math.max(1, Math.ceil(rl.retryAfterSec))}&identifier=${encodeURIComponent(raw)}${nextQs}` as never);
  // A2 · then the per-network bucket - sign-in's order, so one player retrying one number never drains a shared NAT budget.
  const { ip } = await clientMeta();
  if (ip) {
    const rlIp = await rateCheckAsync(ip, "password_reset.ip");
    if (!rlIp.allowed) {
      audit({ category: "SECURITY", action: "password_reset.ip_rate_limited", actorId: null, targetType: "Ip", targetId: ip });
      redirect(`/auth/forgot-password?error=rate_limited&retry=${Math.max(1, Math.ceil(rlIp.retryAfterSec))}&identifier=${encodeURIComponent(raw)}${nextQs}` as never);
    }
  }

  await requestPasswordReset(resolved.value, { next });
  // ⛔ ALWAYS "sent", on every branch — unknown number, unknown address, or a
  // real account with no email on file must be indistinguishable from a hit.
  // The page's own copy states the precondition rather than this redirect
  // implying a link is definitely on its way.
  redirect(`/auth/forgot-password?sent=1&identifier=${encodeURIComponent(raw)}${nextQs}` as never);
}
