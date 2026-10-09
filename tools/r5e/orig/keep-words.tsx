/* @jsxRuntime automatic */
/* @jsxImportSource react */
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

/**
 * A MARKET TITLE'S FIGURES STAY WHOLE (round 4 of the visual pass, 2026-10-09, edges tiles 197 199 253 255 256): a season
 * never breaks at its hyphen — the Chinese page read "辛巴俱乐部赢得2026-" / "27赛季NBC超级联赛" — and a number never parts
 * from its unit — the Swahili page read "atavunja dakika" / "28:00 kwenye 10K". Titles are data, so the words are never
 * touched: each figure run goes in a `white-space: nowrap` span (the reason `keepUnits` gives: what every engine honours,
 * and the text a reader copies or a screen reader names is unchanged).
 * A RUN is a number — digits with their own separators (2,650 · 5.5 · 28:00), a currency sign before them, a range after
 * them (2026-27 · 24/7 · 2026–27), a % — together with its unit on ONE side:
 *   · a Chinese unit of one or two ideographs straight after it ("200毫米", "27赛季" — `keepUnits`' rule, kept);
 *   · a hyphenated unit ("30-day", "7-day");
 *   · a unit word after it ("28 minutes", "$5.5 bilioni") or before it ("dakika 28:00", "nyuzi 32", "TZS 10,000"), from the
 *     closed lists below — a measure noun, a magnitude, a currency code — and a month on either side of a day ("1 Agosti",
 *     "April 15"). Where a word stands on both sides, the month or the unit after wins and the word before stays plain text
 *     ("tarehe 1 Agosti" keeps "1 Agosti"), so a run is never more than one word and its number.
 * A bare number with no unit and no range ("2,650", "28:00") has no break inside it to protect and stays plain text, so a
 * title without a run renders byte for byte as before. ⚠️ Proper nouns are data and are never joined ("World Athletics",
 * "NBC Premier League"). ⚠️ The lists are closed on purpose: a run cannot grow past a word and a number (≤ 20 characters in
 * every seeded title), which fits the narrowest title line on every surface, where an open rule ("a number keeps the word
 * before it") would join "ya 2,650" and "on 1" and could not promise that. ⛔ Deterministic, no lookbehind (a client
 * bundle holding one fails to parse on Safari before 16.4), CJK-safe: the unit words are Latin, the ideograph rule is
 * `keepUnits`' own.
 */
const MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December|Januari|Februari|Machi|Aprili|Mei|Juni|Julai|Agosti|Septemba|Oktoba|Novemba|Desemba";
const UNIT_BEFORE = `dakika|saa|sekunde|siku|wiki|mwezi|miezi|mwaka|miaka|nyuzi|asilimia|tarehe|milioni|bilioni|TZS|USD|KES|${MONTHS}`;
const UNIT_AFTER = `minutes?|hours?|seconds?|days?|weeks?|months?|years?|degrees?|percent|million|billion|milioni|bilioni|${MONTHS}`;
/** Groups: 1 the word before + 2 its space · 3 the number · 4 an ideograph unit · 5 a hyphenated unit · 6 a space + 7 the word after. */
const FIGURE = new RegExp(
  `(?:\\b(${UNIT_BEFORE})(\\s+))?([$€£]?\\d+(?:[.,:]\\d+)*(?:[-–/]\\d+(?:[.,:]\\d+)*)*%?)`
    + `(?:(\\s?[㐀-䶿一-鿿豈-﫿]{1,2})|(-[a-z]+)\\b|(\\s+)(${UNIT_AFTER})\\b)?`,
  "g",
);
/** A break could fall inside the run: a space, a range's mark, or an ideograph (UAX #14 lets a line end before one). */
const BREAKABLE = /[\s\-–/㐀-䶿一-鿿豈-﫿]/;

export function keepFigures(text: string): ReactNode {
  if (!/\d/.test(text)) return text;
  const out: ReactNode[] = [];
  let from = 0;
  for (const m of text.matchAll(FIGURE)) {
    const [, before, gap, num, ideo, hyph, space, after] = m;
    // One side only: a unit after the number wins, and the word before then stays plain text.
    const tail = ideo ?? hyph ?? (after !== undefined ? space + after : "");
    const head = tail === "" && before !== undefined ? before + gap : "";
    const start = (m.index ?? 0) + (before !== undefined && head === "" ? before.length + gap.length : 0);
    const run = head + num + tail;
    // A run with no break inside it (a bare "2,650") is left as text.
    if (!BREAKABLE.test(run)) continue;
    out.push(text.slice(from, start), <span key={`f${out.length}`} className="whitespace-nowrap">{run}</span>);
    from = start + run.length;
  }
  if (out.length === 0) return text;
  out.push(text.slice(from));
  return out;
}

/**
 * A NAME NEVER ENDS ON ONE CHARACTER ALONE (round 4 of the visual pass, 2026-10-09, edges tiles 236 240 244): the hub's
 * 40-character Chinese name broke 13 · 13 · 13 · 1 at 360, its last character alone on a fourth line, and an unbroken
 * 40-letter name that must break anywhere could leave one letter the same way. The name's last two characters (and the
 * space between them, if any) go in one nowrap span, so a last line holds two at least. Two characters always fit a line,
 * so this can never overflow — unlike `keepLastWords`, whose pair of words a long name could make wider than its column.
 * A name of two characters or fewer is returned untouched; the text itself is unchanged.
 */
const NAME_END = /\S\s*\S\s*$/u;

export function keepNameEnd(name: string): ReactNode {
  const at = name.search(NAME_END);
  if (at <= 0) return name;
  return [name.slice(0, at), <span key="name-end" className="whitespace-nowrap">{name.slice(at)}</span>];
}

/**
 * AN ID BREAKS IN WHOLE RUNS OF FOUR (round 4 of the visual pass, 2026-10-09, S9's note G20): on the deposit's return
 * receipt at 390 a long transaction id or gateway reference broke under `break-all` wherever its line ran out, leaving
 * one or two characters alone on a second line. Now the id is cut into runs of four, each one nowrap, with a `<wbr>`
 * between them — the only places a line may end — and a short last run (fewer than four) joins the run before it, so a
 * second line always holds four characters or more. `txn_` + 12 is four whole runs. The characters are unchanged and
 * `<wbr>` carries no text, so a copy, a search and a screen reader read the id exactly. The caller balances the lines.
 */
export function keepIdRuns(id: string): ReactNode {
  const chars = Array.from(id);
  if (chars.length <= 7) return id;
  const runs: string[] = [];
  for (let i = 0; i < chars.length; i += 4) runs.push(chars.slice(i, i + 4).join(""));
  // More than seven characters make two runs at least, so a short tail always has a run to join.
  const tail = runs[runs.length - 1];
  if (Array.from(tail).length < 4) { runs.pop(); runs[runs.length - 1] += tail; }
  return runs.flatMap((r, i) => {
    const run = <span key={`r${i}`} className="whitespace-nowrap">{r}</span>;
    return i === 0 ? [run] : [<wbr key={`w${i}`} />, run];
  });
}
