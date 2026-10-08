/**
 * A SENTENCE NEVER ENDS ON ONE WORD ALONE — its last two words break together (round 3 of the visual pass, 2026-10-09).
 *
 * The tiles found the same defect on five surfaces: a short sentence wrapped one word short and left that word on a line
 * of its own — "…itakueleza" / "kinachofuata." (the held Wallet, 092), "Kwa simu tu. Hakuna" / "kinachofichwa." (the hub's
 * card-size hint, 124 294 295), "…hadi" / "lifungwe." (the fairness lead, 187 204).
 *
 * ⛔ WHY NOT `text-wrap: pretty` ALONE: it chooses WHICH break to take, by a heuristic each engine sets for itself, and
 * Firefox does not ship it; a guard cannot prove what it will pick. ⛔ AND WHY NOT A NO-BREAK SPACE: it travels into the
 * copied text and the find-in-page match. ⭐ So, as `keepUnits` does for a number and its unit, the last two words go in
 * a `white-space: nowrap` span — what every engine honours — and the text itself (the accessible name, a copy, a search
 * hit) is unchanged. Every other break is left alone, so a sentence that fits on its lines wraps exactly as it did.
 *
 * ⚠️ Only for SHORT closing words, on surfaces whose line is always wider than them (each call site says why): the pair
 * cannot break, so on a line narrower than it would overflow. ⚠️ Text with an ideograph is returned untouched — Chinese
 * breaks between characters, and its own rules (`keep-all` at punctuation, `text-pretty`) govern it — and so is text of
 * fewer than three words, which has no word to strand.
 * ⛔ Deterministic, one regular expression, so the server and the browser agree and hydration cannot mismatch.
 */
import type { ReactNode } from "react";

const IDEOGRAPH = /[㐀-䶿一-鿿豈-﫿]/;
/** The last two whitespace-separated words, with any trailing space. */
const LAST_TWO = /\S+\s+\S+\s*$/;

export function keepLastWords(text: string): ReactNode {
  if (IDEOGRAPH.test(text)) return text;
  const at = text.search(LAST_TWO);
  // ⛔ `at <= 0`: the whole text is two words or fewer (or one word), so nothing can be stranded.
  if (at <= 0) return text;
  return [text.slice(0, at), <span key="last-words" className="whitespace-nowrap">{text.slice(at)}</span>];
}
