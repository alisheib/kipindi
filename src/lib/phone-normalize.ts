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
