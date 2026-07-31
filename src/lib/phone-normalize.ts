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

/** Canonical 9-digit local part, or as much of it as has been typed so far. */
export function normalizeTzLocalDigits(raw: string): string {
  let d = (raw ?? "").replace(/\D+/g, "");
  if (d.startsWith("255")) d = d.slice(3);              // +255 / 255 country code
  else if (d.startsWith("0")) d = d.replace(/^0+/, ""); // local trunk prefix
  return d.slice(0, 9);
}
