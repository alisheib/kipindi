/**
 * ⭐ A SERVER ACTION'S REDIRECT IS A NAVIGATION, NEVER A FAILURE (live fix L3, the Vodacom plan's S8-PLAN A23 item 2).
 *
 * A money action whose session has ended — signed in on another device, or expired — answers with a redirect to the
 * sign-in door that names the page (`signInPathForAction`: `buyPositionAction`, `cashOutPositionAction`). In Next 16 the
 * client's call to such an action REJECTS with that redirect (`server-action-reducer.js`: `reject(redirectError)`, the
 * error marked `handled`), while the router is already on its way to the sign-in page. It never resolves to nothing.
 *
 * 🔴 SO EVERY `r == null` "auth loss" test on the money controls was dead code. The rejection reached the catch that
 * maps a thrown call to an unknown outcome, and the player was shown a failure on top of the sign-in page — measured on
 * a dev server at `6da7f936`: the dial's "Could not place — Something went wrong at our end", the sell button's
 * "Couldn't cash out — We're busy right now" with its "CASH-OUT FAILED" result, the quick bet's "Bet not placed". Each
 * sticky (a money refusal stays until read), each false: the server ran nothing (the redirect comes before the money
 * path), and the toast outlived the page it was about.
 *
 * ⛔ Test it FIRST in every catch around a money action, before any failure is shown, and do not rethrow: the reducer
 * has navigated, and the redirect boundary only records an error it was handed (`redirect-boundary.js`, `handled`).
 * ⭐ The same rule as Next's own `isRedirectError` (`redirect-error.js`), written here because `src/` never imports
 * `next/dist`: a `digest` of `NEXT_REDIRECT;<push|replace>;<url>;<303|307|308>;`. `test:action-redirect` holds the two
 * equal over real redirect errors and the near misses, and reads the reducer for the rejection this file assumes.
 */
export function isActionRedirect(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("digest" in error)) return false;
  const digest = (error as { digest?: unknown }).digest;
  if (typeof digest !== "string") return false;
  const parts = digest.split(";");
  const status = Number(parts.at(-2));
  return parts[0] === "NEXT_REDIRECT" && (parts[1] === "push" || parts[1] === "replace") && (status === 303 || status === 307 || status === 308);
}
