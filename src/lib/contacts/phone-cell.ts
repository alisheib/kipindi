/**
 * ⭐ ONE NUMBER OUT OF A PHONE CELL THAT HOLDS SEVERAL — the importer's ONE rule for it (S15-4: one number per person).
 *                                        (S15 · C3b · G3, 2026-10-09 · docs/CONTACTS-SCREEN-PLAN.md §1 row C3b)
 *
 * People write two numbers in one phone cell: Google Contacts joins one label's numbers with " ::: ", an office types
 * "0712 345 678 / 0754 111 222", others use a semicolon, a comma, a vertical line, an ampersand, a line break inside the
 * cell, or a word — "or", the Swahili "au" (or) and "na" (and), "and". `parseTzNumber` rightly refuses such a cell whole
 * (too long — "It may hold more than one number. Keep one."), and the person was lost. So:
 *   · a cell `parseTzNumber` reads as ONE number is that number — the whole cell is asked first, and nothing here
 *     changes what it says;
 *   · otherwise the cell is split on those separators ONLY — never on a space, a dash, a full stop or a bracket, which
 *     join the digit groups of ONE number — and the FIRST part THE ONE NUMBER RULE reads as a Tanzanian mobile is the
 *     person's number (`firstMobileIn`): a foreign, landline or mistyped number written before it is passed over;
 *   · a cell with no Tanzanian mobile in any part yields none, and its sentence (`phoneCellRefusal`) is the FIRST
 *     number's own — never "keep one", which would not make it importable.
 * ⛔ NEVER A JOIN. Each part is parsed on its own, so the digits of two numbers are never read as one number of twelve
 * digits or more; and a cell of two numbers kept apart by spaces alone is not split at all — it stays refused as too long.
 * ⭐ ONE RULE, NEVER TWO. The server's staging asks it for a row's key (`stagedRowFrom`), the commit for the number's own
 * text (the new contact's `rawInput`, so another person's number never rides into it), the check for the sentence of a
 * cell that yields no number (`classifyStagedRow`), the browser for its first-mobile phone column (G4, `import-read.ts`),
 * and the list paste chooses the first number on a line through `firstMobileIndex`. The drafted `rawPhone` — the staged
 * row's raw cell — keeps the whole cell; the staged key is the first mobile's.
 *
 * ⛔ PURE AND CLIENT-SAFE: it imports `../tz-msisdn` alone, and is pinned, like it, in `test:client-graph-safe`. No escape
 * text and no control character is typed here: every special character is built from its code.
 * Guard: `npm run test:contacts-import` (section "phone-cell") · red: `npm run red:contacts-import`.
 */
import { parseTzNumber, type TzNumber } from "../tz-msisdn";

/* ══ CHARACTERS — by code, never typed ═══════════════════════════════════════════════════════════════════ */

const TAB = 9;
const LF = 10;
const CR = 13;
const SPACE = 32;
const AMPERSAND = 38;
const COMMA = 44;
const SOLIDUS = 47;
const COLON = 58;
const SEMICOLON = 59;
const VERTICAL_LINE = 124;

/** One character that stands between two numbers in a cell. ⛔ Never a space, a dash, a full stop or a bracket. */
const SEPARATOR_CHARS: ReadonlySet<number> = new Set([LF, CR, AMPERSAND, COMMA, SOLIDUS, SEMICOLON, VERTICAL_LINE]);
/** Google's separator is three colons (" ::: "); one or two colons belong to a label ("Mobile: 0712…"). */
const GOOGLE_COLONS = 3;
/** Words that join two numbers, read whole and with a space on each side: English "or" and "and", Swahili "au" and "na". */
const SEPARATOR_WORDS: ReadonlySet<string> = new Set(["or", "and", "au", "na"]);
/** A digit in any script — a part with none is a label ("home", "Simu ya ofisi"), never a number. */
const ANY_DIGIT = new RegExp(`${String.fromCharCode(92)}p{Nd}`, "u");

/** Whitespace between words: spaces, a tab and the no-break spaces (a line break is a separator of its own). */
function isBlank(c: number): boolean {
  return c === SPACE || c === TAB || c === 0xa0 || c === 0x202f || (c >= 0x2000 && c <= 0x200a);
}

const isAsciiLetter = (c: number): boolean => (c >= 65 && c <= 90) || (c >= 97 && c <= 122);

/** How many characters a separator WORD takes from `i` (a blank), its spaces on both sides included — or 0. */
function wordSeparatorAt(s: string, i: number): number {
  let j = i;
  while (j < s.length && isBlank(s.charCodeAt(j))) j++;
  let k = j;
  while (k < s.length && isAsciiLetter(s.charCodeAt(k))) k++;
  if (k === j || k >= s.length || !isBlank(s.charCodeAt(k))) return 0;
  if (!SEPARATOR_WORDS.has(s.slice(j, k).toLowerCase())) return 0;
  let m = k;
  while (m < s.length && isBlank(s.charCodeAt(m))) m++;
  return m - i;
}

/* ══ THE PARTS, AND THE ONE CHOICE ═══════════════════════════════════════════════════════════════════════ */

/**
 * The numbers a cell holds as written, in order: the cell cut at every separator (see the header), each piece trimmed,
 * and only the pieces holding a digit kept. One piece for a cell that holds one number — or none.
 */
export function phoneCellParts(cell: string): string[] {
  const s = String(cell ?? "");
  const pieces: string[] = [];
  let start = 0;
  let i = 0;
  while (i < s.length) {
    const c = s.charCodeAt(i);
    let cut = 0;
    if (SEPARATOR_CHARS.has(c)) cut = 1;
    else if (c === COLON) {
      let run = 0;
      while (i + run < s.length && s.charCodeAt(i + run) === COLON) run++;
      if (run < GOOGLE_COLONS) {
        i += run;
        continue;
      }
      cut = run;
    } else if (isBlank(c)) cut = wordSeparatorAt(s, i);
    if (cut === 0) {
      i++;
      continue;
    }
    pieces.push(s.slice(start, i));
    i += cut;
    start = i;
  }
  pieces.push(s.slice(start));
  return pieces.map((p) => p.trim()).filter((p) => ANY_DIGIT.test(p));
}

/**
 * ⭐ S15-4 · THE ONE CHOICE among several numbers written in order: the index of the FIRST one THE ONE NUMBER RULE
 * (`parseTzNumber`) reads as a Tanzanian mobile number, or -1 when none is. A cell's parts (`firstMobileIn`) and a pasted
 * line's numbers (`import-read.ts`) are both chosen here.
 */
export function firstMobileIndex(texts: readonly string[]): number {
  for (let i = 0; i < texts.length; i++) if (parseTzNumber(texts[i]).verdict === "ok") return i;
  return -1;
}

/** The number a phone cell yields, and the text it was written as: the whole cell when it IS one number, else the part. */
export type CellMobile = { readonly number: TzNumber; readonly text: string };

/**
 * ⭐ THE NUMBER A PHONE CELL YIELDS — or null. The whole cell when `parseTzNumber` reads it as a Tanzanian mobile; else
 * the FIRST of its separated parts that is one (`phoneCellParts`, `firstMobileIndex`). Its `number` is always `ok`.
 */
export function firstMobileIn(cell: string): CellMobile | null {
  const text = String(cell ?? "");
  const whole = parseTzNumber(text);
  if (whole.verdict === "ok") return { number: whole, text: text.trim() };
  const parts = phoneCellParts(text);
  const at = firstMobileIndex(parts);
  return at < 0 ? null : { number: parseTzNumber(parts[at]), text: parts[at] };
}

/**
 * ⭐ THE SENTENCE FOR A PHONE CELL THAT YIELDS NO NUMBER — the check's and the commit's, never the cell. A cell of several
 * numbers none of which is a Tanzanian mobile is told about its FIRST number (the one S15-4 would have taken); every other
 * cell gets `parseTzNumber`'s own sentence for the whole cell, exactly as before C3b.
 */
export function phoneCellRefusal(cell: string): string {
  const text = String(cell ?? "");
  const whole = parseTzNumber(text);
  if (whole.verdict !== "ok") {
    const parts = phoneCellParts(text);
    if (parts.length >= 2 && firstMobileIndex(parts) < 0) return parseTzNumber(parts[0]).reason;
  }
  return whole.reason;
}
