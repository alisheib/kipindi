/**
 * One place that turns a `resendEmailVerificationAction` CODE into words.
 *
 * The action deliberately returns codes rather than prose (it is a server
 * action rendered on trilingual player surfaces). Its consumers — the withdraw
 * screen's email step and the account page's editor (the deposit gate and the
 * app-wide bar that once used it were deleted on 2026-10-07) — would drift the
 * moment a new code appeared if each mapped the codes itself. This is the mapper.
 *
 * An UNKNOWN code falls back to the generic send-failure line rather than
 * printing the raw code at a player: a stray identifier on screen reads as a
 * crash, and on the flow that unlocks withdrawing (depositing, until 2026-10-07) that costs real trust.
 */
import type { Dict } from "@/lib/i18n-dict";

export function verifyErrorMessage(
  t: Dict,
  code: string,
  retryAfterSec?: number,
): string {
  switch (code) {
    case "NOT_SIGNED_IN":     return t.wallet.verifyErrNotSignedIn;
    case "USER_NOT_FOUND":    return t.wallet.verifyErrUserNotFound;
    case "NO_EMAIL":          return t.wallet.verifyErrNoEmail;
    case "RATE_LIMITED":      return t.wallet.verifyErrRateLimited.replace("{sec}", String(retryAfterSec ?? 60));
    case "EMAIL_SUPPRESSED":  return t.wallet.verifyErrSuppressed;
    case "EMAIL_SEND_FAILED": return t.wallet.verifyErrSendFailed;
    default:                  return t.wallet.verifyErrSendFailed;
  }
}
