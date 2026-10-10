/**
 * A SENTENCE NEVER ENDS ON ONE WORD ALONE — its last two words break together (round 3 of the visual pass, 2026-10-09).
 *
 * The tiles found the same defect on five surfaces: a short sentence wrapped one word short and left that word on a line
 * of its own — "…itakueleza" / "kinachofuata." (the held Wallet, 092), "Kwa simu tu. Hakuna" / "kinachofichwa." (the hub's
 * card-size hint, 124 294 295), "…hadi" / "lifungwe." (the fairness lead, 187 204).
 *
 * ⛔ WHY NOT `text-wrap: pretty` ALONE: it chooses WHICH break to take, by a heuristic each engine sets for itself, and
 * Firefox does not ship it; a guard cannot prove what it will pick. ⛔ AND WHY NOT A NO-BREAK SPACE: it travels into the
 * copied text and the find-in-page match. ⭐ So, as `keepFigures` below does for a number and its unit, the last two words
 * go in a `white-space: nowrap` span — what every engine honours — and the text itself (the accessible name, a copy, a
 * search hit) is unchanged. Every other break is left alone, so a sentence that fits on its lines wraps exactly as it did.
 *
 * ⚠️ Only for SHORT closing words, on surfaces whose line is always wider than them (each call site says why): the pair
 * cannot break, so on a line narrower than it would overflow. ⚠️ Text with an ideograph is returned untouched — Chinese
 * breaks between characters, and its own rules (`keep-all` at punctuation, `text-pretty`) govern it — and so is text of
 * fewer than three words, which has no word to strand.
 * ⛔ Deterministic, one regular expression, so the server and the browser agree and hydration cannot mismatch.
 */
import type { ReactNode } from "react";
import { regulatorSplit } from "@/lib/regulator-name";
import { connectiveRanges, splitLeadConnective } from "@/lib/connectives";
// The connective rule has one pure home (the offline document reads it too); keep-run.tsx and the titles take it from here.
export { connectiveRanges, splitLeadConnective };

const IDEOGRAPH = /[㐀-䶿一-鿿豈-﫿]/;
/**
 * ⭐ THE WHITE SPACE A KEPT RUN MAY HOLD (round 5, 2026-10-09, review 3 H2 — one rule for every keep helper): any run of
 * collapsible spaces, which renders as one, and at most ONE other white space (a no-break space, an ideographic space).
 * A run held across `\s+` could hold any number of U+3000 or U+2003 — "dakika" + 37 ideographic spaces + "28:00" is one
 * unbreakable run some 600px wide — so where the gap is wider than that the words are left to wrap as words do.
 * `KEPT_GAP` may be empty; `KEPT_SPACE` is the same with at least one white space.
 */
export const KEPT_GAP = "[\\t\\n\\f\\r ]*(?:[^\\S\\t\\n\\f\\r ][\\t\\n\\f\\r ]*)?";
export const KEPT_SPACE = `(?=\\s)${KEPT_GAP}`;
const SPACE_KEPT = new RegExp(`^${KEPT_SPACE}$`);
const WHITE = /\s/;

/**
 * ⭐ THE WHITE SPACE AFTER A KEPT RUN IS A TEXT NODE OF ITS OWN (round 7 of the visual pass, 2026-10-10, R6-1 — a
 * regression since round 5's H4, tile 244). "Pick a question, tap YES or NO — your ticket shows up here." broke "…YES or
 * NO — your" / "ticket shows up here." (128 / 234px) at en 390, where round 5 broke "…YES or NO —" / "your ticket shows up
 * here." (159 / 202px): the line after the dash, which a balanced paragraph should take, was never offered.
 * 🔴 THE CAUSE IS IN CHROMIUM, read in its source (third_party/blink/renderer/core/layout/inline, main, 2026-10-10):
 * `text-wrap: balance` (and `pretty`) is the score line breaker, which first collects every break opportunity —
 * `LineBreaker::AppendCandidates` (line_breaker.cc). For a text item, that function handles the item's LEADING white
 * space before it sets the item's own style (`SetCurrentStyle`), so it judges the break after that space with the
 * `auto_wrap_` the PREVIOUS text item left — and when that item was a `white-space: nowrap` run, the break after the
 * space is recorded mid-word: the candidate is lost. The greedy pass does break there (`HandleTrailingSpaces`: "Make the
 * last item breakable after, even if it was nowrap"), so only a balanced (or pretty) paragraph loses it, and only where
 * the greedy layout keeps the run mid-line — which is why every other empty-state tile kept round 5's lines.
 * ⭐ THE ANSWER: the white space that follows a kept run is drawn as its own text node (React keeps adjacent strings
 * apart). Chromium then meets an item that is ONLY white space, takes the branch that reads the item's own
 * `can_break_after` (true: a break after a space before a word), and the candidate is there again — the very
 * opportunity the inserted no-break characters of round 3 left. Nothing is inserted, the text and every engine's break
 * opportunities are unchanged, and WebKit and Gecko, which judge a space by its own box, draw the same lines.
 * One rule for every helper that draws a kept run before more text: `keepRanges` (keep-run.tsx: the empty states and
 * every `keepText` sentence), `keepFigures` (every market title), `keepYears`, `keepRegulator`, /live's `KeepHyphenated`.
 * `test:visual-pass-r7a` §1 renders each and fails on a kept run followed by a text node that opens with white space.
 */
const LEADING_WHITE = /^[\t\n\f\r ]+/;
/** The text after a kept run, its leading white space (if any, and if more follows) split off as its own string. */
export function afterRun(rest: string): string[] {
  const lead = LEADING_WHITE.exec(rest)?.[0].length ?? 0;
  return lead > 0 && lead < rest.length ? [rest.slice(0, lead), rest.slice(lead)] : [rest];
}

/**
 * The last two whitespace-separated words of `text` — the space between them a kept one (`KEPT_SPACE`) — as [where the
 * first starts, where the second ends], or null. `trail` is the white space after them: `"kept"` when the caller draws it
 * inside the span (it must be a kept space too), `"any"` when the span leaves it out.
 * ⛔ READ FROM THE END, word by word — linear. The pattern it replaces ("word, space, word, end"), tried at every place,
 * backtracked over every long word before it failed: quadratic, a quarter of a second on 10,000 letters (round 5).
 */
export function lastTwo(text: string, trail: "kept" | "any"): [number, number] | null {
  let end = text.length;
  while (end > 0 && WHITE.test(text[end - 1])) end--;
  if (trail === "kept" && end < text.length && !SPACE_KEPT.test(text.slice(end))) return null;
  let second = end;
  while (second > 0 && !WHITE.test(text[second - 1])) second--;
  let gap = second;
  while (gap > 0 && WHITE.test(text[gap - 1])) gap--;
  let first = gap;
  while (first > 0 && !WHITE.test(text[first - 1])) first--;
  if (second === end || first === gap || !SPACE_KEPT.test(text.slice(gap, second))) return null;
  return [first, end];
}

export function keepLastWords(text: string): ReactNode {
  if (IDEOGRAPH.test(text)) return text;
  const at = lastTwo(text, "kept")?.[0] ?? -1;
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
 * ⛔ Found from the year's space (where a word ends) and the word read back from it — linear (round 5: "word, space,
 * year" tried at every place was quadratic on a long word, and a space tried at every place on a long run of spaces);
 * the space is `KEPT_SPACE`.
 */
const SPACE_YEAR = new RegExp(`\\S(${KEPT_SPACE}(?:1[89]|2\\d)\\d{2})(?=$|[\\s.,;:!?)\\]。，；：])`, "g");

export function keepYears(text: string): ReactNode {
  const out: ReactNode[] = [];
  let from = 0;
  for (const m of text.matchAll(SPACE_YEAR)) {
    const space = (m.index ?? 0) + 1;
    // The word before the space, never reaching into the run before it.
    let at = space;
    while (at > from && !WHITE.test(text[at - 1])) at--;
    if (at === space) continue;
    // After a run, its white space is a text node of its own (`afterRun`, round 7).
    out.push(...(from > 0 ? afterRun(text.slice(from, at)) : [text.slice(from, at)]), <span key={`y${out.length}`} className="whitespace-nowrap">{text.slice(at, space + m[1].length)}</span>);
    from = space + m[1].length;
  }
  if (out.length === 0) return text;
  out.push(...afterRun(text.slice(from)));
  return out;
}

/**
 * A MARKET TITLE'S FIGURES STAY WHOLE (round 4 of the visual pass, 2026-10-09, edges tiles 197 199 253 255 256): a season
 * never breaks at its hyphen — the Chinese page read "辛巴俱乐部赢得2026-" / "27赛季NBC超级联赛" — and a number never parts
 * from its unit — the Swahili page read "atavunja dakika" / "28:00 kwenye 10K". Titles are data, so the words are never
 * touched: each figure run goes in a `white-space: nowrap` span (what every engine honours, and the text a reader copies or
 * a screen reader names is unchanged — no no-break space, no word joiner).
 * A RUN is a number — digits with their own separators (2,650 · 5.5 · 28:00), a currency sign before them, a range after
 * them (2026-27 · 24/7 · 2026–27), a % — together with its unit on ONE side:
 *   · a Chinese unit straight after it, from the closed list `ZH_UNIT`, longest first ("200毫米", "15万美元", "27赛季", and
 *     "8月1日" — a month with its day, the twin of "1 Agosti" below);
 *   · a hyphenated unit ("30-day", "7-day", "30-Day");
 *   · a unit word after it ("28 minutes", "$5.5 bilioni") or before it ("dakika 28:00", "nyuzi 32", "TZS 10,000"), from the
 *     closed lists below — a measure noun, a magnitude, a currency code — and a month on either side of a day ("1 Agosti",
 *     "April 15"; never a year — round 5: "December 2026" was kept, `DAY` below). Where a word stands on both sides, the
 *     month or the unit after wins and the word before stays plain text ("tarehe 1 Agosti" keeps "1 Agosti"), so a run is
 *     never more than one word and its number — except a CURRENCY CODE, which is part of the figure itself: "TZS 1
 *     bilioni", "TZS 4,200" in "TZS 4,200以上" (round 5, H1: the code was left behind whenever a unit followed).
 * ⭐ ROUND 5 (2026-10-09, review 3 H1): the Chinese unit was "one or two ideographs, whatever they are" (`keepUnits`' rule),
 * so the run took the next word's first character — "[7月降]雨量", "[2026年坦]桑尼亚" (the good break 年|坦 lost),
 * "[1日收]于", "超过[15万美]元？" (美元 cut). The closed list ends the run at the unit; `keepUnits` itself, which nothing
 * imported any more, is gone. A lower-case unit word also opens a sentence ("Dakika 90 za mwisho", "Saa 3 usiku"): the same
 * pair, capitalised. ⛔ NOT a Swahili word AFTER the number ("28:00 dakika"): Swahili names the unit first, and a noun after
 * a number usually opens the next phrase ("mabao 2 siku ya mwisho"), so such a pair is left to wrap as words do.
 * A bare number with no unit and no range ("2,650", "28:00") has no break inside it to protect and stays plain text, so a
 * title without a run renders byte for byte as before. ⚠️ Proper nouns are data and are never joined ("World Athletics",
 * "NBC Premier League"). ⚠️ The lists are closed on purpose: a run cannot grow past a figure and its one unit, where an
 * open rule ("a number keeps the word before it") would join "ya 2,650" and "on 1". The narrowest title line is the market
 * page's h1 at 320 — 220px at 28px bold, about 13 characters — and `test:visual-pass-r5e` §9 measures every seeded title's
 * runs and the platform's money phrasings against it ("TZS 2.5 bilioni" 195px, "TZS 1,000,000" 208px); a 14-character
 * figure ("TZS 10,000,000", 229px) is wider, as a 14-letter word is (round 5's report names it). ⛔ Deterministic, no
 * lookbehind (a client bundle holding one fails to parse on Safari before 16.4), CJK-safe: the unit words are Latin, and a
 * Chinese unit is one of the listed words.
 */
const MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December|Januari|Februari|Machi|Aprili|Mei|Juni|Julai|Agosti|Septemba|Oktoba|Novemba|Desemba";
/** A lower-case unit word with its capital too ("dakika" | "Dakika"), for the one that opens a sentence. */
const capital = (words: string) => words.split("|").map((w) => `[${w[0]}${w[0].toUpperCase()}]${w.slice(1)}`).join("|");
const UNIT_BEFORE = `${capital("dakika|saa|sekunde|siku|wiki|mwezi|miezi|mwaka|miaka|nyuzi|asilimia|tarehe|milioni|bilioni")}|TZS|USD|KES|${MONTHS}`;
const UNIT_AFTER = `${capital("minutes?|hours?|seconds?|days?|weeks?|months?|years?|degrees?|percent|million|billion|milioni|bilioni")}|${MONTHS}`;
/** A currency code is part of the figure, so it stays the run's head even when a unit follows ("TZS 1 bilioni"). */
const CURRENCY = /^(?:TZS|USD|KES)$/;
/** A month keeps its DAY ("1 Agosti", "April 15", "Mei 31"), never a year: "December 2026" is 225px at the market page's
 *  28px h1, wider than that h1's 220px line at 320 (test:visual-pass-r5e §9), and a month and its year read whole on two
 *  lines as two words do. */
const MONTH = new RegExp(`^(?:${MONTHS})$`);
const DAY = /^(?:0?[1-9]|[12]\d|3[01])$/;
/** The Chinese units a number keeps, longest first, so "万美元" is taken before "万" and the next word never joins. */
const ZH_UNIT = "月\\d{1,2}[日号]|万美元|亿美元|万先令|亿先令|美元|先令|欧元|英镑|毫米|厘米|公里|千米|公斤|千克|毫升|分钟|小时|赛季|季度|百分点|摄氏度|个月|年底|年初|月底|月初|月中|[年月日号时分秒天周岁米克吨升元万亿场球届次名个度轮局倍]";
/** Groups: 1 the word before + 2 its space · 3 the number · 4 a Chinese unit · 5 a hyphenated unit · 6 a space + 7 the word
 *  after. The spaces are `KEPT_SPACE` (round 5, H2's rule): never an unbounded run of wide white space inside a run. */
const FIGURE = new RegExp(
  `(?:\\b(${UNIT_BEFORE})(${KEPT_SPACE}))?([$€£]?\\d+(?:[.,:]\\d+)*(?:[-–/]\\d+(?:[.,:]\\d+)*)*%?)`
    + `(?:(\\s?(?:${ZH_UNIT}))|(-[A-Za-z][a-z]*)\\b|(${KEPT_SPACE})(${UNIT_AFTER})\\b)?`,
  "g",
);
/** A break could fall inside the run: a space, a range's mark, or an ideograph (UAX #14 lets a line end before one). */
const BREAKABLE = /[\s\-–/㐀-䶿一-鿿豈-﫿]/;

/** Each figure run of `text` as a [start, end) span, in order (the rule above). */
export function figureRanges(text: string): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  if (!/\d/.test(text)) return out;
  for (const m of text.matchAll(FIGURE)) {
    const [, before, gap, num, ideo, hyph, space, after] = m;
    // A month on either side holds a day only.
    const day = DAY.test(num);
    const afterHeld = after !== undefined && (day || !MONTH.test(after));
    const beforeHeld = before !== undefined && (day || !MONTH.test(before));
    // One side only: a unit after the number wins, and the word before then stays plain text — unless it is a currency.
    const tail = ideo ?? hyph ?? (afterHeld ? space + after : "");
    const head = beforeHeld && (tail === "" || CURRENCY.test(before)) ? before + gap : "";
    const start = (m.index ?? 0) + (before !== undefined && head === "" ? before.length + gap.length : 0);
    const run = head + num + tail;
    // A run with no break inside it (a bare "2,650") is left as text.
    if (BREAKABLE.test(run)) out.push([start, start + run.length]);
  }
  return out;
}

/** The figure runs themselves — for a sentence that `keepText` draws (keep-run.tsx), which takes its runs as words. */
export function figureRuns(text: string): string[] {
  return figureRanges(text).map(([a, b]) => text.slice(a, b));
}

export function keepFigures(text: string): ReactNode {
  const ranges = figureRanges(text);
  if (ranges.length === 0) return text;
  const out: ReactNode[] = [];
  let from = 0;
  for (const [a, b] of ranges) {
    // After a run, its white space is a text node of its own (`afterRun`, round 7): "TZS 1 bilioni" + " " + "msimu huu?".
    out.push(...(from > 0 ? afterRun(text.slice(from, a)) : [text.slice(from, a)]), <span key={`f${out.length}`} className="whitespace-nowrap">{text.slice(a, b)}</span>);
    from = b;
  }
  out.push(...afterRun(text.slice(from)));
  return out;
}

/**
 * A NAME NEVER ENDS ON ONE CHARACTER ALONE (round 4 of the visual pass, 2026-10-09, edges tiles 236 240 244): the hub's
 * 40-character Chinese name broke 13 · 13 · 13 · 1 at 360, its last character alone on a fourth line, and an unbroken
 * 40-letter name that must break anywhere could leave one letter the same way. The name's last two characters (and the
 * space between them, if any) go in one nowrap span, so a last line holds two at least. Two characters always fit a line,
 * so this can never overflow — unlike `keepLastWords`, whose pair of words a long name could make wider than its column.
 * A name of two characters or fewer is returned untouched; the text itself is unchanged.
 * ⭐ ROUND 5 (2026-10-09, review 3 H2 H3) · A CHARACTER IS WHAT A READER SEES, AND THE GAP IS BOUNDED:
 *   · "two characters" were two code points, so the cut landed INSIDE one emoji — "Neema" and the technologist emoji
 *     (👩 ZWJ 💻) drew "Neema 👩" outside the span and the ZWJ and 💻 inside it, the sequence parted by an element
 *     boundary (an engine that shapes per element draws two glyphs). A character is now a whole extended grapheme
 *     cluster (`CHARACTER`): a flag's two regional indicators, a letter with its marks, a skin tone, a tag sequence, a
 *     ZWJ sequence, an Indic conjunct (Unicode 15.1's GB9c), Thai and Lao AM, Hangul jamo, a prepended mark with its
 *     base — read LEFT TO RIGHT, so the flags of "🇹🇿🇰🇪" pair as the text does. Checked code point by code point against
 *     ICU's own segmentation (Node 24: ICU 78, Unicode 17) the pattern never parts what ICU keeps together; where the two
 *     differ it joins MORE (a Myanmar vowel sign, any letter after a virama), which only keeps one more character with
 *     the end;
 *   · the space between the two (and after the last) was any `\s`, so "AB" + 37 × U+3000 + "C" (40 units, which the
 *     name's max(40) accepts) became one unbreakable 39-character run, ~663px in the hub. Now only collapsible spaces
 *     (a run of them renders as one) and at most ONE other white space may stand there, so the kept end is two
 *     characters and a gap of a few ems at most; a name whose end is wider is returned as it came.
 * ⛔ A REGULAR EXPRESSION, NOT `Intl.Segmenter`: Firefox has it only from 125, and its clusters follow each engine's own
 * ICU data — Node's on the server, the browser's in the client (GB9c, for one, is Unicode 15.1) — so the name editor (a
 * client component) could draw its span in one place on the server and another in the browser, and hydration would
 * mismatch. The pattern is the same text on both sides, and it uses only general categories and `\p{RI}` (Unicode
 * property escapes: Chrome 64, Safari 11.1, Firefox 78), no lookbehind. `test:visual-pass-r5e` holds its cut to Node's
 * own grapheme boundaries.
 * ⚠️ THE SAME TEXT IS NOT THE SAME TABLES (review 6, B-4): `\p{M}` and `\p{L}` are each engine's Unicode version, so a
 * character newer than the browser's tables can still be cut in two places. So the cut is decided ONCE, on the server,
 * and handed to the client that draws the name again (`nameEndAt` / `nameWithEnd`, below) — the browser never re-derives it.
 */
/** Marks that open a cluster: Unicode's Prepend class (Arabic number signs and their kin; U+113D1 since Unicode 16). */
const PREPEND = "\\u0600-\\u0605\\u06DD\\u070F\\u0890\\u0891\\u08E2\\u0D4E\\u{110BD}\\u{110CD}\\u{111C2}\\u{111C3}\\u{113D1}\\u{1193F}\\u{11941}\\u{11A3A}\\u{11A84}-\\u{11A89}\\u{11D46}\\u{11F02}";
/** The viramas that join two consonants into one conjunct (GB9c): Devanagari, Bengali, Gujarati, Oriya, Telugu, Malayalam. */
const LINKER = "\\u094D\\u09CD\\u0ACD\\u0B4D\\u0C4D\\u0D4D";
/** What joins the character before it: every mark, and the joiners and vowels Unicode joins that are not marks — ZWNJ
 *  and ZWJ, Thai and Lao AM (ำ ຳ), the half-width voiced marks (ﾞ ﾟ), skin tones, emoji tags, Hangul vowel and final
 *  jamo (and Kirat Rai's, which Unicode 16 classes with them). */
const EXTEND = "\\p{M}\\u200C\\u200D\\u0E33\\u0EB3\\uFF9E\\uFF9F\\u{1F3FB}-\\u{1F3FF}\\u{E0020}-\\u{E007F}\\u1160-\\u11FF\\uD7B0-\\uD7FF\\u{16D63}\\u{16D67}-\\u{16D6A}";
/** Hangul leading jamo, which join each other and the syllable after them (old Hangul). */
const L_JAMO = "\\u1100-\\u115F\\uA960-\\uA97C";
/** Where a cluster opens: a flag's two regional indicators, a prepended mark and its base, leading jamo and their
 *  syllable, or any other character that is not white space. */
const OPENER = `\\p{RI}\\p{RI}|[${PREPEND}]*(?:[${L_JAMO}]+[\\uAC00-\\uD7A3]?|\\S)`;
/** One user-perceived character: an opener (or a white space that a mark follows), then its marks, a conjunct's next
 *  consonant (a few marks may stand between, ≤ 4 so no input can make the pattern backtrack far), and each ZWJ with
 *  the whole character it joins. */
const CHARACTER = new RegExp(
  `(?:${OPENER}|\\s(?=[${EXTEND}]))(?:[${LINKER}][\\p{M}\\u200D]{0,4}\\p{L}|\\u200D(?:${OPENER})|[${EXTEND}])*`,
  "gu",
);
/** What may stand between the last two characters, and after the last: collapsible spaces and at most one other (`KEPT_GAP`). */
const NAME_GAP = new RegExp(`^${KEPT_GAP}$`);

/** Each user-perceived character of `text` as a [start, end) span, left to right — white space between them left out. */
export function characterSpans(text: string): Array<[number, number]> {
  return [...text.matchAll(CHARACTER)].map((m): [number, number] => [m.index ?? 0, (m.index ?? 0) + m[0].length]);
}

/**
 * ⭐ THE CUT IS DECIDED ONCE, WHERE THE NAME IS FIRST DRAWN (review 6, B-4 · 2026-10-09). `CHARACTER`'s classes are the
 * engine's own Unicode tables (`\p{M}`, `\p{L}`): a mark new in Unicode 16 — U+0897 ARABIC PEPET — is a mark to Node and
 * an unassigned character to a browser whose tables are older, so the two cut "Neema Juma" + U+0897 one character apart,
 * and the name editor — a client component, drawn on the server and again in the browser — drew its span in two places:
 * a hydration mismatch on /profile. So the cut is a value: `nameEndAt` says where the kept end starts (−1: the name as it
 * came); the server reads it, and a client that draws the name again is HANDED it (`nameWithEnd`) and never re-derives
 * it. `keepNameEnd` is the two together, for a name drawn on the server alone (the hub, `account/page.tsx`).
 */
export function nameEndAt(name: string): number {
  // The last two characters, read left to right (`characterSpans`' pattern), keeping only the last two.
  let a: [number, number] | null = null, b: [number, number] | null = null;
  for (const m of name.matchAll(CHARACTER)) { a = b; b = [m.index ?? 0, (m.index ?? 0) + m[0].length]; }
  if (!a || !b || a[0] <= 0 || !NAME_GAP.test(name.slice(a[1], b[0])) || !NAME_GAP.test(name.slice(b[1]))) return -1;
  return a[0];
}

/** The name with its last two characters kept together from `at` — `nameEndAt`'s answer, decided where the name was first
 *  drawn: exactly `keepNameEnd`'s markup. An `at` that cuts nothing (−1, or outside the name) draws the name as it came. */
export function nameWithEnd(name: string, at: number): ReactNode {
  if (!Number.isInteger(at) || at <= 0 || at >= name.length) return name;
  return [name.slice(0, at), <span key="name-end" className="whitespace-nowrap">{name.slice(at)}</span>];
}

export function keepNameEnd(name: string): ReactNode {
  return nameWithEnd(name, nameEndAt(name));
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

/**
 * THE REGULATOR'S NAME IS ONE NAME, WHERE ITS LINE CAN HOLD IT (round 5 of the visual pass, 2026-10-09, F18 — tile 307):
 * the journey footer at en 1024 read "Licensed by the Gaming" / "Board of Tanzania.", the Board's name torn in two, where
 * "Licensed by the" / "Gaming Board of Tanzania." fits its 216px column (164.7px for the name and its full stop). The
 * name — as `footer.licensedByGbt` writes it in each language — goes in a `.kp-gbt-name` span; the sentence's own
 * element wears `.kp-gbt`, a size container, and the span is `nowrap` only where that container is at least as wide as
 * the name in its language (globals.css): a column narrower than the name lets it wrap as before, so it can never
 * overflow. The text is unchanged (the zh name keeps its zero-width break hint, which `nowrap` simply does not take).
 * A sentence without the name is returned untouched.
 * ⭐ The name's pattern has one home since R5-G (G-5, 2026-10-09), `lib/regulator-name.ts`, which the offline document —
 * a string that may import no component — reads too; the zh name's zero-width break hint is matched there as any format
 * character (`\p{Cf}`), so no source names an invisible character (test:visual-pass-r5e §6.5, round 5's census).
 */
export function keepRegulator(text: string): ReactNode {
  const cut = regulatorSplit(text);
  if (!cut) return text;
  // ⭐ ROUND 7 (2026-10-10, the owner's item 37 — a line never ends on a connective): "Leseni ya" / "Bodi ya Michezo ya
  // Kubahatisha Tanzania." kept the name whole by ending the line above it on "ya". The connective that introduces the
  // name now travels with it — "Leseni" / "ya Bodi ya Michezo ya Kubahatisha Tanzania." where the line holds the run
  // (277.4px in Inter 13px, so the sw container condition is 281px, globals.css) — and a line narrower than that wraps
  // the sentence with each connective held to the word after it ("Leseni ya Bodi ya Michezo" / "ya Kubahatisha
  // Tanzania."), never splitting after "ya". en ("Licensed by the") and zh have no connective before the name.
  const [before, lead] = splitLeadConnective(cut[0]);
  const name = lead + cut[1];
  return [before, <span key="gbt" className="kp-gbt-name">{drawRuns(name, connectiveRanges(name), "c")}</span>, ...afterRun(cut[2])];
}

/** `text` with each [start, end) range (sorted, disjoint) one nowrap run, the white space after a run its own text node
 *  (`afterRun`) — `keepRanges` (keep-run.tsx) without its `piece` hook, for a helper here, which keep-run.tsx imports. */
function drawRuns(text: string, ranges: ReadonlyArray<readonly [number, number]>, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  let from = 0;
  for (const [a, b] of ranges) {
    if (a > from) out.push(...(from > 0 ? afterRun(text.slice(from, a)) : [text.slice(from, a)]));
    out.push(<span key={`${key}${a}`} className="whitespace-nowrap">{text.slice(a, b)}</span>);
    from = b;
  }
  if (from < text.length) out.push(...(from > 0 ? afterRun(text.slice(from)) : [text.slice(from)]));
  return out;
}
