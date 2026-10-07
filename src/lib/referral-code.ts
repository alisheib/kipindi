/**
 * THE ONE RULE FOR A REFERRAL CODE: its length, its shape, and how an inbound one is normalised. Shared by the register
 * page and action, `bindRecruit`, `resolveReferralPreview`, the market page and (from 2026-10-06) the login page and the
 * guest header. Moved here from `src/lib/server/affiliate-service.ts`, which re-exports it so its importers compile
 * unchanged.
 *
 * Pure and client-safe: it imports nothing, so the client header can import it.
 */

/**
 * 🔴 THE LENGTH THAT USED TO SILENTLY EAT AN AGENT'S ATTRIBUTION.
 *
 * `/auth/register` sliced an incoming `?ref=` to SIXTEEN characters, in two places — the page
 * and the server action. `50PICK-AG-` is already ten, leaving six for the id, so a
 * `50PICK-AG-ABC123` code fitted by exactly nothing and anything longer was cut with no
 * error, no audit row, and no ribbon: the attribution was simply lost, permanently, because
 * `recruitedBy` is written once and `already_bound` means it is never re-attributed.
 *
 * ⛔ AND TRUNCATION IS THE WRONG REPAIR EVEN AT A LARGER NUMBER. A cut prefix can MATCH
 * SOMEBODY ELSE'S CODE, which is worse than losing the bind: it is a permanent mis-bind to a
 * partner who did no work. `normalizeReferralCode` therefore REFUSES an over-length input
 * rather than shortening it — an unrecognised code degrades to "no code", which every caller
 * already handles.
 */
export const MAX_REFERRAL_CODE_LEN = 32;

/** The shape a referral code may take: the player alphabet, plus the agent prefix's
 *  `50PICK-AG-` characters (digits and the hyphen). */
const REFERRAL_CODE_RE = /^[A-Z0-9-]{4,32}$/;

/**
 * Normalise an inbound referral code, or return `null` if it cannot be one.
 *
 * ⭐ ONE HOME, consumed by the register page, the register action, `bindRecruit` and
 * `resolveReferralPreview` — so the ribbon and the bind can never disagree about whether a
 * code is valid, which is the promise `resolveReferralPreview`'s own header makes.
 */
export function normalizeReferralCode(raw: string | null | undefined): string | null {
  const code = (raw ?? "").trim().toUpperCase();
  if (!code) return null;
  // ⛔ REFUSE, never truncate — see MAX_REFERRAL_CODE_LEN.
  if (code.length > MAX_REFERRAL_CODE_LEN) return null;
  if (!REFERRAL_CODE_RE.test(code)) return null;
  return code;
}
