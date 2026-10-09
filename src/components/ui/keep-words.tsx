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

/**
 * A SHORT TEXT OF SEVERAL SENTENCES BREAKS ONLY BETWEEN THEM (round 4 of the visual pass, 2026-10-09, tile 259): "Phones
 * only." / "Nothing is hidden.", never "Phones only. Nothing" / "is hidden.". Each sentence is one nowrap span and the
 * spaces between them stay plain text, so those spaces are the only places a line can end; the words are unchanged.
 * ⚠️ Only where every sentence is shorter than the narrowest line it can get (the call site measures it): a sentence
 * cannot break, so a longer one would overflow. ⚠️ A text of one sentence falls back to `keepLastWords`, and text with an
 * ideograph is returned untouched, as above. ⛔ No lookbehind in the pattern: a client bundle that holds one fails to
 * parse on Safari before 16.4, and this runs in the browser.
 */
const SENTENCE_GAP = /[.!?](\s+)(?=\S)/g;

export function keepSentences(text: string): ReactNode {
  if (IDEOGRAPH.test(text)) return text;
  const out: ReactNode[] = [];
  let from = 0;
  for (const m of text.matchAll(SENTENCE_GAP)) {
    const end = (m.index ?? 0) + 1;
    out.push(<span key={`s${out.length}`} className="whitespace-nowrap">{text.slice(from, end)}</span>, m[1]);
    from = end + m[1].length;
  }
  if (out.length === 0) return keepLastWords(text);
  out.push(<span key={`s${out.length}`} className="whitespace-nowrap">{text.slice(from)}</span>);
  return out;
}

/**
 * A YEAR STAYS WITH THE WORD BEFORE IT (round 4 of the visual pass, 2026-10-09, tile 210): the privacy notice's version
 * line read "…Personal Data Protection Act" / "2022 na kanuni…", the Act's name on one line and its year on the next.
 * "Act 2022" is now one nowrap span; every other break is left alone and the text is unchanged. A year is four digits
 * (1800–2999) standing as a word — followed by a space, the end, or punctuation — so a date ("2026-10-07") and a longer
 * number ("16221") are not years. It applies inside Chinese text too: the Latin name it binds is not broken by keep-all.
 */
const WORD_YEAR = /\S+\s+(?:1[89]|2\d)\d{2}(?=$|[\s.,;:!?)\]。，；：])/g;

export function keepYears(text: string): ReactNode {
  const out: ReactNode[] = [];
  let from = 0;
  for (const m of text.matchAll(WORD_YEAR)) {
    const at = m.index ?? 0;
    out.push(text.slice(from, at), <span key={`y${out.length}`} className="whitespace-nowrap">{m[0]}</span>);
    from = at + m[0].length;
  }
  if (out.length === 0) return text;
  out.push(text.slice(from));
  return out;
}
