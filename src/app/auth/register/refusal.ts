/**
 * A REFUSED SIGN-UP RETURNS TO THE FORM IT CAME FROM (route audit C1 / C3 / C-X1, 2026-10-06).
 *
 * 🔴 WHY THIS MODULE EXISTS. Every sign-up refusal used to be an action redirect back to `/auth/register?error=…`, and
 * Next remounts the page after an action redirect: the date of birth, both passwords and all three ticks came back
 * EMPTY (the SMS-offers tick silently), while the phone and the email rode back in the URL. ⭐ Now `startRegisterAction`
 * RETURNS this object to the still-mounted form (`register-form.tsx`, `useActionState`): nothing is restored because
 * nothing is lost, and nothing personal rides in a URL.
 *
 * ⛔ IT ECHOES NO TICK AND NO BIRTH DATE. A consent box is evidence of what the person did on THIS screen (the consent
 * ledger stores the sentence beside it), so a refusal that carried a tick back could re-tick a box nobody ticked. The
 * shape is the refusal's code, its registry reason, the wait, and the phone and email the panel's sign-in link needs,
 * and never anything else (`test:marketing-consent-ledger` 7h, `test:auth-email` section 7).
 *
 * Pure and client-safe: a type and the phone normaliser, which imports nothing.
 */
import type { FailureReason } from "@/lib/failure-reasons";
import { normalizeTzLocalDigits } from "@/lib/phone-normalize";

/** The registry reasons a sign-up refusal may name: each has its own sentence in every language (`t.error`). */
export const REGISTER_INVALID_REASONS = ["password_weak", "password_mismatch", "email_invalid"] as const satisfies readonly FailureReason[];
export type RegisterInvalidReason = (typeof REGISTER_INVALID_REASONS)[number];

export type RegisterRefusal = {
  code: "exists" | "email_exists" | "rate_limited" | "invalid";
  reason: RegisterInvalidReason | null;
  retryAfterSec: number | null;
  phone: string;
  email: string;
  at: number;
};

const isRegisterInvalidReason = (r: unknown): r is RegisterInvalidReason =>
  typeof r === "string" && (REGISTER_INVALID_REASONS as readonly string[]).includes(r);

/**
 * The refusal the form shows, from the service's result and what was posted. `at` tells two refusals apart, so the
 * same refusal twice is announced twice. The wait is whole seconds and at least one, with no cap: the service's own
 * bucket decides it, and the countdown must not end before the bucket does.
 */
export function registerRefusalOf(
  result: { code?: string; reason?: string; retryAfterSec?: number },
  posted: { phone: string; email: string },
  now: number = Date.now(),
): RegisterRefusal {
  const code: RegisterRefusal["code"] = result.code === "ALREADY_EXISTS" ? "exists"
    : result.code === "EMAIL_EXISTS" ? "email_exists"
    : result.code === "RATE_LIMITED" ? "rate_limited"
    : "invalid";
  const wait = result.retryAfterSec;
  return {
    code,
    reason: code === "invalid" && isRegisterInvalidReason(result.reason) ? result.reason : null,
    retryAfterSec: code === "rate_limited" && typeof wait === "number" && Number.isFinite(wait) && wait > 0
      ? Math.max(1, Math.ceil(wait))
      : null,
    phone: normalizeTzLocalDigits(posted.phone),
    email: posted.email.trim().slice(0, 254),
    at: now,
  };
}

/** The ONE field a refusal is about, or null: a taken phone marks the phone, a taken or malformed email the email. */
export function refusalField(r: RegisterRefusal | null): "phone" | "email" | null {
  if (!r) return null;
  if (r.code === "exists") return "phone";
  if (r.code === "email_exists" || (r.code === "invalid" && r.reason === "email_invalid")) return "email";
  return null;
}
