import { Fragment, cloneElement, isValidElement, type ReactNode } from "react";
import { keepRanges, keptRanges, mergeRanges } from "@/components/ui/keep-run";
import { moneyRuns } from "@/lib/fill-nodes";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n-dict";

/**
 * MILLIONEA'S FACT LINES — the S5 tile read's A1, built once (MASWALI-BUILD S5 · VIS-P; S5-VIS-FINDINGS §A A1).
 *
 * 🔴 WHAT THE TILES SHOWED: a "·"-joined line that wrapped put its separator at a line's start or end ("…TZS 1,000,000" /
 * "· shared equally…", "Main 0/10 ·" / "Reserve 0/5", the stamp's "…(main balance) ·"), and phrases tore inside —
 * "Friday 18:00" / "EAT", "Sunday" / "– Monday", "13% fee" / "at payout" split to "13%" / "费用", "A1 hadi" / "A5".
 *
 * ⭐ TWO HALVES, ONE MODULE:
 *   · `MaswaliFacts` lays the facts out. Facts that fit share a line with "·" between them; a fact that does not fit moves
 *     WHOLE to the next line, so a joined line that would wrap becomes separate lines with no separator; a fact longer than
 *     its line wraps inside itself between its words, so nothing can overflow at 320. The separator is each fact's own
 *     leading mark in the gap before it (`.kp-mln-fact::before`); the list is pulled back by that gap and clipped there, so
 *     the mark of every fact that opens a line falls outside the clip — no line starts with "·" — and since a mark always
 *     LEADS its fact, none ever ends one. `stack` sets one fact per line at every width (the stamp's centred lines),
 *     `phone` below 768 (the card's "one fact per line at phone widths", P3). The rules are `.kp-mln-facts` in globals.css.
 *   · `keepFact` keeps a fact's phrases whole, the platform's way (keep-run.tsx): each run in a `white-space: nowrap`
 *     span, the words untouched (no no-break space, no word joiner — a copy and a screen reader read the dictionary's
 *     text). Its runs are the platform's (`keptRanges`: a spaced dash held to the word before it, a possessive with its
 *     noun, the last two words) and Millionea's own, below.
 * ⛔ The list's text is the same text as before for everything but the eye: each separator is also in the DOM as a
 *    screen-reader-only " · " (`sr-only`), so an accessible name, a copy and a search read "A · B · C" exactly as the old
 *    joined string did; the drawn mark is generated content with empty alternative text, read by nobody twice.
 * ⭐ EVERY NUMERAL IN A FACT IS SET AS A NUMERAL (DESIGN_AUTHORITY §T5: "every numeral … no exceptions, including numbers
 *    inside body sentences when they are data"; the lead's ruling of 2026-10-21, after L7 set the card's clock `.mono` and
 *    left "3 kati ya 10" beside it in the body face): a count ("3 kati ya 10", "15 个"), a percentage ("13%"), the perfect
 *    ticket's "10/10", a week's number ("Wiki 47", "第49周"), a date's numbers and a clock — each a `.mono` run (JetBrains
 *    Mono, tabular figures), the words around it in the sentence's face; a money figure `.amount` whole ("TZS 601,000",
 *    `moneyRuns`), never "TZS" in one face and its digits in another. ONCE, HERE: `keepFact` sets the numerals of its own
 *    text (`numeralRuns`), and `MaswaliFacts` sets every numeral still bare in a fact however the fact was made (a plain
 *    string, `fillNodes`, a fragment) — descending only into the page's own markup, never into a component (its children
 *    are its own contract), and never into a `.mono` or `.amount` already set, so nothing is set twice. The words, the
 *    kept runs and the spacing are unchanged: a run sits inside its nowrap span, and only the face of its digits moves.
 *    ⛔ A HEADING IN THE DISPLAY FACE IS NOT A FACT LINE (the ruling's exception): its numerals keep its face —
 *    `numerals={false}` and `keepFact(…, { numerals: false })` (the home card's title, "Millionea · Wiki 47").
 */

/** How a list lays its facts out: side by side, wrapping whole (`flow`); one per line everywhere (`stack`); one per line
 *  below 768 and side by side from 768 (`phone`). */
export type FactsLayout = "flow" | "stack" | "phone";

export function MaswaliFacts({ facts, layout = "flow", className, id, ids, numerals = true }: {
  facts: ReadonlyArray<ReactNode>;
  layout?: FactsLayout;
  className?: string;
  /** The list's own id, and each fact's (aligned with `facts`, an empty fact's dropped with it): what a link's
   *  `aria-labelledby` / `aria-describedby` name (the home card, S5-DESIGN-DOORS L11). Absent, nothing is written. */
  id?: string;
  ids?: ReadonlyArray<string | undefined>;
  /** Every bare numeral in the facts set `.mono` (§T5) — `false` only for a heading in the display face (its own face). */
  numerals?: boolean;
}) {
  const shown = facts.map((f, i) => [f, ids?.[i]] as const).filter(([f]) => f !== null && f !== undefined && f !== false && f !== "");
  return (
    <span id={id} className={cn("kp-mln-facts", layout === "stack" && "kp-mln-facts--stack", layout === "phone" && "kp-mln-facts--phone", className)}>
      {shown.map(([f, factId], i) => (
        <span key={i} id={factId} className="kp-mln-fact">
          {numerals ? numeralNodes(f) : f}
          {i < shown.length - 1 && <span className="sr-only">{" · "}</span>}
        </span>
      ))}
    </span>
  );
}

/**
 * The facts a dictionary line holds: Millionea writes a fact list as its facts joined by " · " (the R-HEADLINE, the
 * strip's "Mauzo · {range} EAT", the cap rule), in every language — so a line is split where it says so, never guessed.
 */
export function factsOf(line: string): string[] {
  return line.split(" · ").filter((s) => s !== "");
}

/**
 * MILLIONEA'S OWN RUNS — the phrases A1 names, read from the text in the reader's language:
 *   · a week and its number, with what is joined to it ("Week 47's", "Wiki 47"; 第47周 holds itself under keep-all);
 *   · a clock with the word before it and its zone ("Friday 18:00 EAT", "Ijumaa 18:00", "周五 18:00");
 *   · a reserve range ("A1–A5", "A1 to A5", "A1 hadi A5", "A1 至 A5");
 *   · a count of a cap ("1 of 10", "1 kati ya 10");
 *   · a number and its noun — English and Chinese name the unit after the number ("13% fee", "5 reserve", "13% 费用",
 *     "15 题"), Swahili before it ("ada 13%", "akiba 5", "maswali 15").
 * ⚠️ Every run is a few words, narrower than the narrowest line it is drawn in (the home card's text column at 320, about
 * 180px): a kept run cannot break, so a wider one would overflow. `test:maswali-design` §4 holds the rule.
 * ⛔ No lookbehind (Safari before 16.4 cannot parse one) and one plain scan per rule: the server and the browser draw the
 * same spans, so hydration cannot mismatch.
 */
/** A word: Latin letters (with an apostrophe or a hyphen inside), or one to three ideographs — Chinese has no spaces, so
 *  "the word" after a number is its unit ("13% 费用", "15 题"), never the rest of the clause. */
const WORD = "(?:[A-Za-z][A-Za-z'’-]*|[㐀-䶿一-鿿豈-﫿]{1,3})";
const NUMBER = "\\d+(?:[.,/]\\d+)*%?";
const WEEK = /\b(?:Week|Wiki) \d+\S*/g;
const CLOCK = new RegExp(`(?:${WORD} )?\\d{1,2}:\\d{2}(?: EAT\\b)?`, "g");
const RESERVES = /\bA\d(?:[–-]A\d| \S{1,5} A\d)\b/g;
const OF_CAP = /\b\d+ (?:of|kati ya) \d+\b/g;
const NUMBER_THEN_NOUN = new RegExp(`\\b${NUMBER} ${WORD}`, "g");
const NOUN_THEN_NUMBER = new RegExp(`${WORD} ${NUMBER}`, "g");

export function factRuns(locale: Locale, text: string): string[] {
  const all = (re: RegExp) => [...text.matchAll(re)].map((m) => m[0]);
  return [
    ...all(WEEK), ...all(CLOCK), ...all(RESERVES), ...all(OF_CAP),
    ...all(locale === "sw" ? NOUN_THEN_NUMBER : NUMBER_THEN_NOUN),
  ];
}

/** Each money figure's [start, end) in `text`, read by the platform's one money reader (`moneyRuns`) — never a second
 *  pattern — so a kept run that touches a figure takes the whole figure and its `.amount` span is never cut. */
function moneyRanges(text: string): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  let at = 0;
  for (const node of moneyRuns(text)) {
    if (typeof node === "string") { at += node.length; continue; }
    const figure = isValidElement<{ children?: unknown }>(node) ? String(node.props.children ?? "") : "";
    out.push([at, at + figure.length]);
    at += figure.length;
  }
  return out;
}

/** A token that holds a digit, with the separators inside it: "10/10", "13%", "18:00", "1,000", "A1", "fifa2026". One plain
 *  scan, no lookbehind (see above) — whether it is a numeral is `IS_NUMERAL`'s question, asked of the whole token. */
const NUMERAL_TOKEN = /[A-Za-z0-9]*\d[A-Za-z0-9]*(?:[.,:/][A-Za-z0-9]*\d[A-Za-z0-9]*)*%?/g;
/** A numeral: digits with their own separators ("10/10", "13%", "18:00", "1,000", "2026"), or an identifier's one capital
 *  and its digits ("A1", "W48"). Digits inside a Latin word ("fifa2026", "3x") are the word's, and keep its face. */
const IS_NUMERAL = /^(?:\d+(?:[.,:/]\d+)*%?|[A-Z]\d+)$/;

/** A text's figures and numerals as the platform sets them (§M4, §T5): each money figure `.amount` (`moneyRuns`, first, so
 *  a figure is never cut), each other numeral `.mono`; the words around them untouched, in the sentence's face. */
export function numeralRuns(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let k = 0;
  for (const node of moneyRuns(text)) {
    if (typeof node !== "string") { out.push(node); continue; }
    let last = 0;
    for (const m of node.matchAll(NUMERAL_TOKEN)) {
      if (!IS_NUMERAL.test(m[0])) continue;
      const at = m.index ?? 0;
      if (at > last) out.push(node.slice(last, at));
      out.push(<span key={`n${k++}`} className="mono">{m[0]}</span>);
      last = at + m[0].length;
    }
    if (last < node.length) out.push(node.slice(last));
  }
  return out;
}

/** A class that already sets its face: a numeral, a money figure — or the screen reader's separator. */
const FACE_SET = /(?:^|\s)(?:mono|amount|sr-only)(?:\s|$)/;
/** Every numeral still bare in a fact, set `.mono` (`numeralRuns`) — through the page's own markup (a host element, a
 *  fragment), never a component's children and never an element whose face is already set. Unchanged, it is the same node. */
function numeralNodes(node: ReactNode): ReactNode {
  if (typeof node === "string" || typeof node === "number") {
    const text = String(node);
    const runs = numeralRuns(text);
    return runs.length === 1 && runs[0] === text ? node : runs;
  }
  if (Array.isArray(node)) {
    let changed = false;
    const out = node.map((n) => { const r = numeralNodes(n as ReactNode); if (r !== n) changed = true; return r; });
    return changed ? out : node;
  }
  if (!isValidElement<{ className?: unknown; children?: ReactNode }>(node)) return node;
  if (typeof node.type !== "string" && node.type !== Fragment) return node;
  const { className, children } = node.props;
  if ((typeof className === "string" && FACE_SET.test(className)) || children === undefined || children === null) return node;
  const next = numeralNodes(children);
  return next === children ? node : cloneElement(node, undefined, next);
}

/**
 * One fact with its phrases kept whole and its figures in the money face: the platform's kept runs (`keptRanges`) and
 * Millionea's (`factRuns`), plus any run the caller names, each a `white-space: nowrap` span; every money figure an
 * `.amount` and every other numeral `.mono` (`numeralRuns`, §T5) — but in a heading in the display face (`numerals:
 * false`), where a numeral keeps the heading's face. The words are never changed.
 */
export function keepFact(locale: Locale, text: string, runs: readonly string[] = [], opts: { numerals?: boolean } = {}): ReactNode {
  const ranges = mergeRanges([...keptRanges(text, [...runs, ...factRuns(locale, text)]), ...moneyRanges(text)]);
  return keepRanges(text, ranges, opts.numerals === false ? (part) => moneyRuns(part) : (part) => numeralRuns(part));
}
