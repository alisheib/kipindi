/**
 * UD-4 (ux-audit 2026-08) · ONE map from a bet-refusal `code` to the player's language.
 *
 * The service's error strings (market-service.ts) are API/audit truth — English, sometimes
 * bilingual EN·SW — and they used to be rendered verbatim in the failure toast, so a ZH
 * player got untranslated copy at the exact moment their money was refused. The client now
 * renders ITS OWN localized message keyed off `code`; the server string is demoted to a
 * fallback used only when a code is missing. ⛔ Do not translate the server; translate the
 * surface.
 *
 * Pure and in ONE file so the three quick-bet surfaces cannot drift (the same reason
 * `updown-pricing` and `updown-refund-reason` are single-home rules). Keys live in
 * `i18n-dict.ts` under `t.market` in all three locales.
 */

export type UdBetErrorCode =
  | "SELECTION_CLOSED" | "RATE_LIMITED" | "BUSY" | "SUSPENDED" | "INVALID" | "NOT_FOUND";

/** The exact dictionary slice this map needs — structural, so any `t.market` fits. */
type UdErrDict = {
  udErrSelectionClosed: string;
  udErrRateLimited: string;
  udErrBusy: string;
  udErrSuspended: string;
  udErrInvalid: string;
  udErrNotFound: string;
};

/** code → localized message, built from the caller's dictionary. */
export function udBetErrorMap(m: UdErrDict): Record<UdBetErrorCode, string> {
  return {
    SELECTION_CLOSED: m.udErrSelectionClosed,
    RATE_LIMITED: m.udErrRateLimited,
    BUSY: m.udErrBusy,
    SUSPENDED: m.udErrSuspended,
    INVALID: m.udErrInvalid,
    NOT_FOUND: m.udErrNotFound,
  };
}
