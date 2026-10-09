/**
 * ⭐ ONE NUMBER OUT OF A PHONE CELL THAT HOLDS SEVERAL — the importer's ONE rule for it (S15-4: one number per person).
 *                  (S15 · C3b · G3, and the review round C3b-fix · D1 D3 D4, 2026-10-09 · docs/CONTACTS-SCREEN-PLAN.md §1)
 *
 * People write two numbers in one phone cell: Google Contacts joins one label's numbers with " ::: ", an office types
 * "0712 345 678 / 0754 111 222", others use a semicolon, a comma, a vertical line, an ampersand, a line break inside the
 * cell, or a word — "or", the Swahili "au" (or) and "na" (and), "and". `parseTzNumber` rightly refuses such a cell whole
 * (too long — "It may hold more than one number. Keep one."). So:
 *   · a cell `parseTzNumber` reads as ONE number is that number — the whole cell is asked first, and nothing here
 *     changes what it says (a whole cell of bare nine digits too: Excel drops a number cell's 0);
 *   · otherwise — within the phone field's limit (D1b) — the cell is split on those separators ONLY, never on a space, a
 *     dash, a full stop or a bracket, which join the digit groups of ONE number, and each part is read by THE ONE NUMBER
 *     RULE on its own (`mobilesIn`);
 *   · ⛔ D4 · A PART COUNTS ONLY WHEN IT IS A COMPLETE NUMBER: its digits begin with 0 (the trunk zero, or 00) or 255, or a
 *     "+" stands before them. A bare nine-digit part is never a mobile — in "+254, 712 345 678" or "254/712345678" it is
 *     a Kenyan number's tail, and read alone it would import a STRANGER as +255 712 345 678;
 *   · ⛔ D3 · ONE MOBILE, OR NONE (decision S15-14, the review of 2026-10-09). A row is one person, and the platform cannot
 *     check a person's OTHER number against the stop list or an erasure when that number never reaches the server — so,
 *     until step C3e designs that look-up for every format, a number is taken out of several ONLY when the cell holds
 *     exactly ONE DISTINCT Tanzanian mobile (`firstMobileIn`): the others landlines, foreign numbers, labels, or the SAME
 *     mobile again. A cell holding two or more DISTINCT mobiles yields none, and its sentence says so in words
 *     (`SEVERAL_MOBILES_SENTENCE`) — never a number;
 *   · a cell with no Tanzanian mobile in any part yields none, and its sentence (`phoneCellRefusal`) is its FIRST
 *     number's own when that number is complete — never "keep one", which would not make it importable — and otherwise
 *     the whole cell's (an incomplete part has no sentence of its own: it may be the tail of the number before it).
 * ⛔ NEVER A JOIN. Each part is parsed on its own, so the digits of two numbers are never read as one number of twelve
 * digits or more; and a cell of two numbers kept apart by spaces alone is not split at all — it stays refused as too long.
 * ⭐ ONE RULE, NEVER TWO. The server's staging asks it for a row's key (`stagedRowFrom`), the commit for the number's own
 * text (the new contact's `rawInput`, so another person's number never rides into it), the check for the sentence of a
 * cell that yields no number (`classifyStagedRow`), the browser for the phone column it adds from a row's other phone
 * columns (G4, `import-read.ts` — it carries every distinct mobile of those columns, so this rule decides there too) and
 * for the sheet a workbook is read from (`sheet-choice.ts`), and the list paste chooses the first number on a line
 * through `firstMobileIndex`. The drafted `rawPhone` — the staged row's raw cell — keeps the whole cell; the staged key
 * is its one mobile's.
 * ⛔ C3b-fix · D1 — THE COST IS LINEAR AND BOUNDED, on the live money server (the review, 2026-10-09: a phone cell of
 * 200,000 spaces cost about 2·10¹⁰ steps, because the word test rescanned a run of blanks from EVERY blank in it):
 *   (a) `phoneCellParts` reads each run of blanks ONCE — when the separator-word test fails at a blank it would fail at
 *       every later blank of the same run (the same word follows them all), so the cut jumps past the whole run; and a
 *       word is read only as long as the longest separator word. The cut is linear in the cell's length, however long;
 *   (b) a cell longer than the phone field's own limit (`CONTACT_LIMITS.phone` — ONE number, imported, never typed) is
 *       NEVER SPLIT: such a cell is already invalid ("The Phone cell is longer than N characters", `draftContactRow`), so
 *       `mobilesIn`, `firstMobileIn` and `phoneCellRefusal` answer it from the whole cell only, as before C3b. The length
 *       is counted as the field's own check counts it: the trimmed cell, in characters.
 *   (c) the other loops C3b added were read for the same shape — the browser's G4 scan asks this rule once per cell, and
 *       the CSV reader's G1 path counts as it reads — and none rescans.
 * `test:contacts-import` "phone-cell" H9 feeds 200,000 spaces and Excel's longest cell of "a a a …" to every function
 * here and holds each to 50 ms; its red plant restores the rescan and fails on time.
 *
 * ⛔ PURE AND CLIENT-SAFE: it imports `../tz-msisdn` and `./contact-fields` (the phone field's limit) alone — both
 * client-safe — and is pinned in `test:client-graph-safe`. No escape text and no control character is typed here: every
 * special character is built from its code.
 * Guard: `npm run test:contacts-import` (section "phone-cell") · red: `npm run red:contacts-import`.
 */
import { parseTzNumber, readAsciiDigits, type TzNumber } from "../tz-msisdn";
import { CONTACT_LIMITS } from "./contact-fields";

/* ══ CHARACTERS — by code, never typed ═══════════════════════════════════════════════════════════════════ */

const TAB = 9;
const LF = 10;
const CR = 13;
const SPACE = 32;
const PLUS = 43;
const DIGIT_0 = 48;
const DIGIT_9 = 57;
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
/** The longest separator word, in letters — a longer word is never asked about (D1a: a word is read no further). */
const SEPARATOR_WORD_MAX = Math.max(...[...SEPARATOR_WORDS].map((w) => w.length));
/** A digit in any script — a part with none is a label ("home", "Simu ya ofisi"), never a number. */
const ANY_DIGIT = new RegExp(`${String.fromCharCode(92)}p{Nd}`, "u");

/**
 * ⭐ D1b · the longest cell that is ever SPLIT: the phone field's own limit, read from THE ONE LIMITS TABLE — never a
 * second literal. A longer cell is refused by `draftContactRow` for its length, so splitting it could only cost time.
 */
const SPLIT_MAX_CHARS: number = CONTACT_LIMITS.phone;

/** Whitespace between words: spaces, a tab and the no-break spaces (a line break is a separator of its own). */
function isBlank(c: number): boolean {
  return c === SPACE || c === TAB || c === 0xa0 || c === 0x202f || (c >= 0x2000 && c <= 0x200a);
}

const isAsciiLetter = (c: number): boolean => (c >= 65 && c <= 90) || (c >= 97 && c <= 122);

/** Where the run of blanks that starts at `i` ends: the first character after it that is not a blank. */
function blankRunEnd(s: string, i: number): number {
  let j = i;
  while (j < s.length && isBlank(s.charCodeAt(j))) j++;
  return j;
}

/**
 * How many characters a separator WORD takes from `i` (a blank whose run ends at `runEnd`), its spaces on both sides
 * included — or 0. ⛔ D1a · the run of blanks is measured ONCE by the caller and handed in, and the word is read no
 * further than the longest separator word: nothing here walks a run twice.
 */
function wordSeparatorAt(s: string, i: number, runEnd: number): number {
  let k = runEnd;
  while (k < s.length && k - runEnd <= SEPARATOR_WORD_MAX && isAsciiLetter(s.charCodeAt(k))) k++;
  const letters = k - runEnd;
  if (letters === 0 || letters > SEPARATOR_WORD_MAX || k >= s.length || !isBlank(s.charCodeAt(k))) return 0;
  if (!SEPARATOR_WORDS.has(s.slice(runEnd, k).toLowerCase())) return 0;
  return blankRunEnd(s, k) - i;
}

/**
 * ⭐ D1b · is this cell longer than the phone field's limit, counted as `draftContactRow` counts it — the trimmed cell, in
 * characters (code points)? Stops counting once past the limit.
 */
function longerThanSplitLimit(text: string): boolean {
  const t = text.trim();
  if (t.length <= SPLIT_MAX_CHARS) return false;
  let chars = 0;
  for (let i = 0; i < t.length; i++) {
    const c = t.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff && i + 1 < t.length) {
      const d = t.charCodeAt(i + 1);
      if (d >= 0xdc00 && d <= 0xdfff) i++;
    }
    chars++;
    if (chars > SPLIT_MAX_CHARS) return true;
  }
  return false;
}

/* ══ THE PARTS, AND THE ONE CHOICE ═══════════════════════════════════════════════════════════════════════ */

/**
 * The numbers a cell holds as written, in order: the cell cut at every separator (see the header), each piece trimmed,
 * and only the pieces holding a digit kept. One piece for a cell that holds one number — or none.
 * ⭐ THE CUT ALONE, LINEAR IN THE CELL'S LENGTH WHATEVER ITS LENGTH (D1a): each run of blanks and each run of colons is
 * read once. ⛔ It decides nothing: the functions below that choose a number never hand it a cell longer than the phone
 * field's limit (D1b) — they answer such a cell whole.
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
    } else if (isBlank(c)) {
      const runEnd = blankRunEnd(s, i);
      cut = wordSeparatorAt(s, i, runEnd);
      if (cut === 0) {
        // ⛔ D1a · the word test would fail at every later blank of this run too: the run is passed over whole.
        i = runEnd;
        continue;
      }
    }
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
 * ⭐ S15-4 · the index of the FIRST of several numbers written in order that THE ONE NUMBER RULE (`parseTzNumber`) reads
 * as a Tanzanian mobile number, or -1 when none is — the list paste's choice for a pasted line (`import-read.ts`, whose
 * own reader finds the numbers on the line). ⛔ A phone CELL is never chosen here: `firstMobileIn` takes a number out of
 * a cell only when it holds exactly one distinct mobile (D3).
 */
export function firstMobileIndex(texts: readonly string[]): number {
  for (let i = 0; i < texts.length; i++) if (parseTzNumber(texts[i]).verdict === "ok") return i;
  return -1;
}

/** A mobile a phone cell holds, and the text it was written as: the whole cell when it IS one number, else the part. */
export type CellMobile = { readonly number: TzNumber; readonly text: string };

/** ⭐ D3 · the ONE sentence for a phone cell — or, through G4's added column, a row's phone columns — holding two or more
 *  DISTINCT Tanzanian mobiles. It names no number and no column, and says the way on. */
export const SEVERAL_MOBILES_SENTENCE =
  "This row holds more than one mobile number. Keep one (one number per person) and import again.";

/**
 * ⛔ D4 · is this part a COMPLETE number? Its digits begin with 0 (the trunk zero, or 00) or 255, or a "+" stands before
 * them — read the parser's way (`readAsciiDigits`), at most three digits looked at. A bare nine-digit part is not.
 */
function completePart(part: string): boolean {
  const text = readAsciiDigits(part);
  let digits = "";
  for (let i = 0; i < text.length && digits.length < 3; i++) {
    const c = text.charCodeAt(i);
    if (c >= DIGIT_0 && c <= DIGIT_9) digits += text.charAt(i);
    else if (c === PLUS && digits === "") return true;
  }
  return digits.charAt(0) === "0" || digits === "255";
}

/**
 * ⭐ D3 · EVERY DISTINCT TANZANIAN MOBILE A PHONE CELL HOLDS, in the order written, each with the text it was written as:
 * the whole cell when `parseTzNumber` reads it as ONE number; else — for a cell within the phone field's limit (D1b) —
 * every COMPLETE part (D4) the ONE NUMBER RULE reads as a mobile, the same number written twice counted once. Empty for
 * a cell holding none, and for a longer cell that is not one number. Each `number` is `ok`.
 */
export function mobilesIn(cell: string): CellMobile[] {
  const text = String(cell ?? "");
  const whole = parseTzNumber(text);
  if (whole.verdict === "ok") return [{ number: whole, text: text.trim() }];
  if (longerThanSplitLimit(text)) return [];
  const found: CellMobile[] = [];
  const seen = new Set<string>();
  for (const part of phoneCellParts(text)) {
    if (!completePart(part)) continue;
    const number = parseTzNumber(part);
    if (number.verdict !== "ok" || number.msisdn === null || seen.has(number.msisdn)) continue;
    seen.add(number.msisdn);
    found.push({ number, text: part });
  }
  return found;
}

/**
 * ⭐ THE NUMBER A PHONE CELL YIELDS — its ONE distinct Tanzanian mobile (`mobilesIn`), or null: none, or two and more
 * (D3 — never a number taken out of two people's worth). The name is C3b's; under D3 it is the cell's only mobile.
 */
export function firstMobileIn(cell: string): CellMobile | null {
  const found = mobilesIn(cell);
  return found.length === 1 ? found[0] : null;
}

/**
 * ⭐ THE SENTENCE FOR A PHONE CELL THAT YIELDS NO NUMBER — the check's and the commit's, never the cell. Two or more
 * distinct mobiles: `SEVERAL_MOBILES_SENTENCE` (D3). Several numbers none of which is a mobile: the FIRST number's own,
 * when it is complete (D4) — else the whole cell's. Every other cell — and every cell longer than the phone field's limit
 * (D1b), which is never split — gets `parseTzNumber`'s own sentence for the whole cell, exactly as before C3b.
 */
export function phoneCellRefusal(cell: string): string {
  const text = String(cell ?? "");
  const whole = parseTzNumber(text);
  if (whole.verdict === "ok" || longerThanSplitLimit(text)) return whole.reason;
  const found = mobilesIn(text);
  if (found.length >= 2) return SEVERAL_MOBILES_SENTENCE;
  if (found.length === 0) {
    const parts = phoneCellParts(text);
    if (parts.length >= 2 && completePart(parts[0])) return parseTzNumber(parts[0]).reason;
  }
  return whole.reason;
}
