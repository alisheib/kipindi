/**
 * ONE definition of "reduce whatever a Tanzanian typed to the canonical 9 digits".
 *
 * The server's `tzPhone` (src/lib/server/validators.ts) accepts four shapes:
 *   0712 000 101 · 255712000101 · +255712000101 · 712000101
 * The sign-in / registration widget used to accept only the last one: it stripped
 * non-digits and truncated to 9, so `0712000101` silently became `071200010`
 * ("Enter a valid Tanzania mobile number", with no hint that the leading zero was
 * the problem) and a pasted `+255712000101` became `255712000` — a different
 * number. Four of the five natural entry shapes could not be typed at all, on the
 * two screens every player must pass through.
 *
 * Lives here rather than inside the component so the widget, the admin sign-in
 * and any future caller cannot drift apart — and so it is testable without React.
 *
 * A Tanzanian mobile subscriber number is `[67]\d{8}`, so neither a leading `0`
 * nor a leading `255` can be part of it; stripping them is unambiguous.
 */

/**
 * WHAT THE MONEY FORMS SHOULD SHOW IN THE NUMBER FIELD — Jay (Gaming Board) item #8.
 *
 * The deposit and withdraw pages used to open with an EMPTY field behind the placeholder
 * `712 345 678`, so every player retyped their own number every time. ⛔ A placeholder must
 * never become a value (finding A-5), so the fix is a real default, not a greyed hint.
 *
 * ⭐ THE SUBTLETY IS THE ERROR ROUND-TRIP, AND A NAIVE `??` GETS IT WRONG. Both actions
 * carry the submitted values back on failure, but only when they are truthy —
 * `withdraw/actions.ts:90` and `deposit/actions.ts:46` both omit an EMPTY msisdn. So
 * `sp.msisdn ?? account` would silently replace a field the player had deliberately
 * CLEARED with their account number, on the screen where the number decides where money
 * goes. Keying on the error instead is exact: a fresh visit prefills, a returning one shows
 * precisely what came back.
 *
 * ⚠️ WITHDRAWALS ARE THE SENSITIVE HALF. A defaulted payout destination is a CONVENIENCE,
 * never an assumption — this changes what is displayed and nothing else. Every destination
 * validation the action already runs still runs, and the field stays editable.
 *
 * PURE and EXPORTED so a suite can drive it; a decision inside a render is one nothing can
 * drive. Guard: `npm run test:msisdn-prefill`.
 */
export function moneyFormMsisdn(
  accountPhoneE164: string,
  submitted: string | undefined,
  hadError: boolean,
): string {
  if (hadError) return normalizeTzLocalDigits(submitted ?? "");
  return normalizeTzLocalDigits(accountPhoneE164);
}

/** Canonical 9-digit local part, or as much of it as has been typed so far. */
export function normalizeTzLocalDigits(raw: string): string {
  let d = (raw ?? "").replace(/\D+/g, "");
  if (d.startsWith("255")) d = d.slice(3);              // +255 / 255 country code
  else if (d.startsWith("0")) d = d.replace(/^0+/, ""); // local trunk prefix
  return d.slice(0, 9);
}

/**
 * ⭐ THE ONE DEFINITION OF A MASKED PHONE NUMBER. Added 2026-09-06.
 *
 * 🔴 There were SEVEN hand-written masks across the admin console before this, in THREE
 * different shapes — `+255****01`, `+255*****01` and `+255••••01` — so the same player's number
 * read differently on the roster, the drill-down and the KYC workstation, and nothing could
 * assert that any of them masked at all. `docs/READ-TIERS.md` §7's drift ratchet was blind to
 * every one of them because `phoneE164` was not in its governed set.
 *
 * ⛔ IT LIVES HERE, IN A MODULE WITH NO IMPORTS, AND NOT IN `sensitive-fields.ts`. That file
 * imports the store; client components mask phones too (`app-shell.tsx`, `auth/otp`), and
 * importing a server module from them drags Prisma into a browser chunk. This is the same
 * client/server boundary that took down every page once — a `"use client"` helper reached from
 * a server graph, invisible to both `tsc` and `next build`.
 *
 * ── THE SHAPE, AND WHY EXACTLY THIS MUCH ─────────────────────────────────────
 * `+255••••01` — the country code, four dots, the last two digits.
 *
 * · DOTS, NOT STARS. `maskEmail`, `maskRegion` and `maskDob` (`sensitive-fields.ts`) all use
 *   `••••`; `*` is this codebase's AUDIT-LOG vocabulary (`maskPhoneForAudit`, `sms.ts`,
 *   `payments.ts`) and stays there. A reader should be able to tell a masked FIELD from a
 *   redacted LOG at a glance.
 * · FIRST FOUR AND LAST TWO — deliberately EXACTLY what the console already exposed, so this is
 *   a change of vocabulary and not a change of policy. READ_TIERS §3.2's test is that a mask
 *   preserve enough shape to CONFIRM a number a caller reads out, and not enough to HARVEST a
 *   list of them: `+255` is a country code carrying no discriminating information at all, and
 *   two trailing digits is one in a hundred.
 * · FIXED-WIDTH DOTS. Four regardless of length, so the mask does not leak how long the number
 *   is — the same reason `maskEmail` refuses to let a one-character local part become a bare
 *   `@domain`.
 *
 * ⛔ A SHORT OR MALFORMED VALUE MASKS TO DOTS AND IS NEVER ECHOED. Six of the seven hand-written
 * masks read `phone.length > 6 ? masked : phone` — so the one input class most likely to be
 * junk, a truncated or corrupt row, was the one printed IN FULL. A mask whose failure mode is
 * "show everything" is not a mask.
 */
export function maskPhone(raw: string | null | undefined): string {
  // ⛔ THE FLOOR IS 10, NOT 7, AND IT IS MEASURED. The mask shows six characters (four + two), so
  // a value shorter than ten hides fewer than four — at length 7 it would hide exactly ONE, which
  // is a mask in name only. Measured on production 2026-09-06: **every** stored value is exactly
  // 13 characters (146 `Transaction.msisdn`, 108 `User.phoneE164`), so nothing real is affected
  // and the only inputs this refuses are malformed — which is precisely the class that must not
  // be echoed.
  if (!raw || raw.length < 10) return "••••";
  return `${raw.slice(0, 4)}••••${raw.slice(-2)}`;
}
