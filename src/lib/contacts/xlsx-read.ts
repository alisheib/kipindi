/**
 * THE BROWSER'S EXCEL READER — a workbook past 700 KB becomes C15's ONE shape in the officer's own browser, the way a
 * CSV or a vCard already does.                       (S15 · C3c, 2026-10-09 · docs/CONTACTS-SCREEN-PLAN.md §4.2 step 3)
 *
 * ⭐ WHY THIS EXISTS. An Excel file reaches the server through ONE server action, whose whole body Next caps at 1 MB, so
 * U27 capped a workbook at 700 KB (`xlsx-limits.ts` derives it) — about 25,000 contacts. Past it the only way on was
 * "save it as CSV", and that remedy is a trap: Excel writes a 12-digit General number to CSV as `2.55713E+11`, and the
 * last digits are gone for good. Ali's requirement is that any normal-life file "just works". So a workbook OVER
 * `XLSX_MAX_BYTES` is read HERE, streamed, and handed on as `{ kind: "parsed" }` exactly like a CSV: columns → upload in
 * batches → check → import. A workbook of 700 KB or less keeps TODAY's path (the server's exceljs reader, proven and
 * audited) — so a defect here can only touch files that were refused before C3c.
 *
 * ⭐ ONE MEANING, TWO READERS. The two are held together by (a) the cell rules they SHARE — `xlsx-cells.ts`: the value →
 * text rule, the number rule (A1.3 included), the date and boolean text, the flags and the notes — and (b) THE
 * DIFFERENTIAL: `test:contacts-import` section "xlsx-browser" reads a corpus (the generator's workbooks, the xlsx
 * section's fixtures, workbooks crafted as the real writers write them) through BOTH readers and requires the identical
 * `ParsedContactsFile`, or the identical refusal. To make that possible this reader REPLICATES exceljs 4.4.0, which the
 * server reads with, to the letter — read off its sources (`lib/xlsx/xform/sheet/cell-xform.js` parseOpen/parseText/
 * parseClose/reconcile, `lib/utils/utils.js` isDateFmt/excelToDate/xmlDecode, `lib/xlsx/defaultnumformats.js`, the
 * text, rich-text, shared-string, style and workbook xforms, `doc/row.js`, `doc/worksheet.js`) and proven by probes:
 *   · a cell is `t="s"` a shared string (no shared-strings part: its index, as a number) · `t="str"` text decoded TWICE
 *     (exceljs runs `xmlDecode` over what the XML parser already decoded) · `t="inlineStr"` its text, or its rich runs
 *     joined · `t="b"` parseInt ≠ 0 · `t="e"` an error · anything else — `n`, `d`, none — `parseFloat` of its text (so a
 *     `t="d"` ISO date reads as its year: exceljs's own reading);
 *   · a NUMBER becomes a DATE when its style's number format is a date format by exceljs's `isDateFmt` (brackets and
 *     quoted text removed, then any of y m d h M s b) — the style found through `cellXfs[s]`, its `numFmtId` through
 *     the workbook's own `numFmts` (backslash escapes removed, as exceljs removes them) or exceljs's built-in table; a
 *     style index of 0 never dates (exceljs tests the index for truth); `date1904` only when written exactly "1";
 *   · a FORMULA (a non-empty `<f>`, or an `<f>` with a `t`) is its cached value typed by `t`, dated by its style too —
 *     whatever that value is (a text or an error in a date-styled cell reads blank, as there) — or, with no value,
 *     blank and flagged; a formula cell that carries a hyperlink loses its formula and reads its value, unflagged;
 *   · `_xHHHH_` escapes are decoded in shared strings and rich-text runs (exceljs's text xform, upper-case hex only) but
 *     NOT in an inline string's plain text; a shared string's PHONETIC runs (`<rPh>`) are never part of its text, and a
 *     string's last plain `<t>` wins;
 *   · a cell COVERED by a merge (`<mergeCells>`, which comes after `<sheetData>`) is blank and flagged, its row created
 *     if the sheet had none there; a cell with no value and no style does not exist; a styled empty cell is empty;
 *   · rows are read in row-number order whatever the file's order, a repeated row number REPLACES the earlier row whole,
 *     and a cell's column comes from its own address (its row is the row element's);
 *   · the sheets are the workbook's `<sheet>`s in tab order whose relationship resolves to a worksheet part (relative or
 *     absolute targets); `state` absent or "visible" is visible; the name is decoded twice, as exceljs does.
 * ⭐ WHERE IT DEPARTS — only where exceljs REFUSES a file a real writer makes, or misreads one (each pinned by the suite,
 *   the server's side asserted as it is today, so a change there is seen): the Open XML SDK's `x:`-prefixed elements
 *   (matched here by LOCAL name, at the place OOXML puts them — exceljs throws); rows and cells with no `r` (placed
 *   sequentially, every `<c>` taking a column, as Excel reads them — exceljs throws, or drops a placeholder cell); CDATA
 *   (text here — exceljs drops it); an inline string's phonetic run (excluded here — exceljs's state machine derails on
 *   it and loses the rest of the sheet); a worksheet part not named `sheetN.xml` (found through its relationship here —
 *   exceljs never sees it); and the server's own crash cases (a sheet name longer than 31 characters, a styles part
 *   without fonts, a dangling hyperlink relationship), which read here. Hidden sheets are never opened at all, so a
 *   broken hidden sheet does not refuse the file here.
 *
 * ⭐ THE SHEET (C3b-fix · D6). Every VISIBLE sheet is read whole, in tab order, before one is chosen — so the choice can
 * see what each holds without a second read; the choice is the ONE function both readers call, `chooseSheet`
 * (sheet-choice.ts), of each sheet's name, visibility and first 200 non-empty rows as read here; the chosen sheet's rows
 * become the file. A hidden or very hidden sheet is NEVER opened (its sample is empty); all hidden → `no_visible_sheet`.
 * ⭐ A TITLE ABOVE THE COLUMN NAMES (C3b-fix · D7) leaves the data through the ONE rule every reader's file goes through,
 * `dropTitleRows` (title-rows.ts), on the file as read — rows only, the real line numbers kept, one note.
 * ⭐ THE CAPS, the server's own: `XLSX_MAX_ROWS` (a sheet past that many row elements stops being read at once, and a
 * non-blank row past it refuses — `too_many_rows`), `XLSX_MAX_GRID_CELLS` (the chosen sheet laid out densely — the
 * server's grid rule, `too_big_inflated`), `XLSX_MAX_ENTRIES`, and (C3c-merge-guard) the THREE merge caps charged the
 * same way as the server, across the VISIBLE sheets, as each `<mergeCell>` is read (`addMerge`, through the ONE shared
 * rule `xlsxMergeArea`): `XLSX_MAX_MERGES` ranges, `XLSX_MAX_MERGED_CELLS` covered cells, and `XLSX_MAX_ROWS` spanned
 * rows — past any, `too_big_inflated`, before the overlap check, the merge index or `mergedRows` ever runs. So a vast
 * `A1:XFD1048576`, a tall `A1:A1048576`, an out-of-grid corner or a flood of merges cannot freeze the officer's tab;
 * `mergedRows` then builds at most the row cap, once, in milliseconds, and the per-cell merge lookup is a binary search
 * over column-disjoint ranges, never a scan of all of them. Two more of this reader's own, each a guard of WORK or MEMORY:
 *   · ⭐ THE INFLATE BUDGET, `XLSX_BROWSER_INFLATE_BUDGET` = 1 GiB of inflated bytes across EVERY part read (the
 *     workbook, its relationships, the styles, the shared strings, every visible sheet). WHY 1 GiB: the largest
 *     legitimate workbook this reader can be asked for is bounded by the import's own caps — 200,000 rows and 4,000,000
 *     grid cells — and at Excel's most verbose (about 45 bytes of sheet XML a cell, 32 a shared string) that inflates to
 *     300–400 MB; 1 GiB is two and a half times that. Past it the file is a bomb, refused by what it INFLATES to — never
 *     by the sizes its headers declare (a declared size is checked only after the part is read, as the server does).
 *     It is a budget of WORK: the parts are streamed, never held inflated.
 *   · the MEMORY guard, `XLSX_BROWSER_MAX_STORED_CELLS` = twice the grid cap: the cells kept across the visible sheets
 *     before one is chosen (only a forged file reaches it — the server refuses such a file at a million cell elements).
 *   · one text value, or one XML token, longer than `XLSX_BROWSER_MAX_TEXT` characters (256 times Excel's own cell limit)
 *     is `too_big_inflated` too.
 * ⭐ PROGRESS, STOP, AND THE EVENT LOOP. The bar's `read` is inflated bytes so far, its `total` the inflated sizes the
 * central directory declares for the parts this read opens, and `rows` the row elements read; reported at most every
 * 80 ms and once at the end. Between chunks the reader yields to the event loop (so the bar paints and Stop is heard)
 * and reads the AbortSignal: a stopped read returns `aborted` and keeps nothing.
 * ⭐ AN OLD BROWSER — no `DecompressionStream`, or one without `"deflate-raw"` (constructing it throws: Chrome before
 * 103, Safari before 16.4, Firefox before 113) — gets TODAY'S answer for a big workbook: the `too_large` refusal with its
 * save-as-CSV remedy, before a byte is read. Never a crash, never a half-read file.
 * ⭐ EVERY RULE IS A SEAM (`XLSX_BROWSER_RULES`): the suite plants a defect by swapping one rule in
 * `buildXlsxBrowserReader`, the walk itself unchanged.
 *
 * ⛔ PURE AND CLIENT-SAFE: browser APIs only — `Blob.slice`, `ReadableStream`, `DecompressionStream("deflate-raw")`,
 * `TextDecoder` (Node 24 has all of them, so the suites run it as it is) — no Buffer, no Node built-in, no React, no
 * directive, no src/lib/server; it imports src/lib/contacts modules alone (`test:contacts-boundary` §2 · pinned in
 * `test:client-graph-safe`). ⛔ NOTHING HERE QUOTES A CELL (§5.14): refusals are the copy table's sentences
 * (`xlsxRefusalSentence` — never a new one), notes name rows, and a sheet's title is said only through the copy table's
 * one sheet-name rule. ⛔ No control character, no backslash and no escape text is typed in this file: every special
 * character is built from its code. No `DOMParser` (absent in Node, and it holds the whole document).
 */
import type { ParsedContactsFile, ParsedRow } from "./parsed-file";
import {
  ODS_MIMETYPE,
  XLSX_MAX_ENTRIES,
  XLSX_MAX_GRID_CELLS,
  XLSX_MAX_MERGED_CELLS,
  XLSX_MAX_MERGES,
  XLSX_MAX_ROWS,
  xlsxMergeArea,
  xlsxRefusalSentence,
  type WrongFormatKind,
  type XlsxRefusal,
  type XlsxRefusalContext,
} from "./xlsx-limits";
import { xlsxCellNotes, xlsxNumberText, xlsxValueText, type CellFlag, type NumberText } from "./xlsx-cells";
import { SHEET_SAMPLE_ROWS, chooseSheet, mobileCellsIn, type SheetChoice, type SheetSample } from "./sheet-choice";
import { dropTitleRows } from "./title-rows";

/* ══ CHARACTERS — by code, never typed ════════════════════════════════════════════════════════════════════════ */

const TAB = 9;
const LF = 10;
const CR = 13;
const SPACE = 32;
const BANG = 33;
const DQUOTE = 34;
const HASH = 35;
const DOLLAR = 36;
const SQUOTE = 39;
const SLASH = 47;
const SEMICOLON = 59;
const EQUALS = 61;
const GT = 62;
const QMARK = 63;
const OPEN_BRACKET = 91;
const BACKSLASH = 92;
const CLOSE_BRACKET = 93;
const UNDERSCORE = 95;
const LOWER_X = 120;
const LINE_SEPARATOR = 0x2028;
const PARAGRAPH_SEPARATOR = 0x2029;

const TAB_TEXT = String.fromCharCode(TAB);
const LF_TEXT = String.fromCharCode(LF);
const CR_TEXT = String.fromCharCode(CR);
const CRLF_TEXT = CR_TEXT + LF_TEXT;
const DQUOTE_TEXT = String.fromCharCode(DQUOTE);
const SQUOTE_TEXT = String.fromCharCode(SQUOTE);
const BACKSLASH_TEXT = String.fromCharCode(BACKSLASH);
const CDATA_OPEN = "<![CDATA[";
const CDATA_CLOSE = "]]>";
const COMMENT_OPEN = "<!--";
const DOCTYPE_OPEN = "<!DOCTYPE";

/** XML 1.0 forbids these in a document (a parser refuses them, as the server's does): C0 controls but TAB, LF and CR,
 *  and U+FFFE / U+FFFF. Built from their codes. */
const DISALLOWED_CHAR = new RegExp(
  `[${String.fromCharCode(0)}-${String.fromCharCode(8)}${String.fromCharCode(11)}${String.fromCharCode(12)}` +
    `${String.fromCharCode(14)}-${String.fromCharCode(31)}${String.fromCharCode(0xfffe)}${String.fromCharCode(0xffff)}]`,
);

const isSpace = (c: number): boolean => c === SPACE || c === TAB || c === LF || c === CR;

/* ══ THE CAPS — the server's, and this reader's own ═══════════════════════════════════════════════════════════ */

/** ⭐ 1 GiB of inflated bytes across every part read — see the header for why. */
export const XLSX_BROWSER_INFLATE_BUDGET = 1024 * 1024 * 1024;
/** The cells kept across the visible sheets before one is chosen: twice the grid cap (a memory guard). */
export const XLSX_BROWSER_MAX_STORED_CELLS = 2 * XLSX_MAX_GRID_CELLS;
/** One text value, or one XML token, at most this many characters: 256 times Excel's 32,767-character cell. */
export const XLSX_BROWSER_MAX_TEXT = 8 * 1024 * 1024;
/** A central directory larger than this is no workbook's: refused before it is read. */
const DIRECTORY_MAX_BYTES = 64 * 1024 * 1024;
/** How often (ms) the bar is told; the last report always arrives. */
const PROGRESS_EVERY_MS = 80;
/** How long (ms) the reader works between two yields to the event loop. */
const YIELD_EVERY_MS = 25;

/* ══ WHAT A READ RETURNS ══════════════════════════════════════════════════════════════════════════════════════ */

/** ⛔ COUNTS ONLY — never a name, a sheet title or a cell. */
export type XlsxBrowserStats = {
  readonly bytes: number;
  readonly inflatedBytes: number;
  readonly entries: number;
  readonly rows: number;
  readonly blankRows: number;
  readonly width: number;
  readonly sheets: number;
  readonly ms: number;
};

/**
 * A read: the file; or the refusal — `message` is the copy table's ONE sentence (`xlsxRefusalSentence`), `wrongFormat`
 * the wrong format when that is the refusal, `detail` a fixed word for the suite (never shown); or a read Stop ended.
 */
export type XlsxBrowserResult =
  /** `noMobileSheet` (C3b-fix · D8, the server's own word): no visible sheet's first rows hold a Tanzanian mobile, so the
   *  first visible sheet was read — the columns step shows its sheet hint on this alone. */
  | { readonly kind: "read"; readonly file: ParsedContactsFile; readonly stats: XlsxBrowserStats; readonly noMobileSheet: boolean }
  | {
      readonly kind: "refused";
      readonly refusal: XlsxRefusal;
      readonly wrongFormat: WrongFormatKind | null;
      readonly detail: string;
      readonly message: string;
      readonly stats: XlsxBrowserStats;
    }
  | { readonly kind: "aborted" };

/** `read` and `total` are inflated BYTES (the bar's fraction), `rows` the row elements read so far (the caption). */
export type XlsxBrowserProgress = (read: number, total: number | null, rows: number) => void;

export type XlsxBrowserOptions = {
  readonly fileName?: string | null;
  readonly onProgress?: XlsxBrowserProgress;
  readonly signal?: AbortSignal;
};

/* ══ EXCELJS 4.4.0, TO THE LETTER — the pieces of its reading this reader must reproduce ══════════════════════ */

/** exceljs's `utils.excelToDate`: the serial (whatever it is — `-` coerces, as there) to a Date, 1900 or 1904 based. */
export function excelSerialToDate(serial: unknown, date1904: boolean): Date {
  return new Date(Math.round((Number(serial) - 25569 + (date1904 ? 1462 : 0)) * 24 * 3600 * 1000));
}

/** Removes every `open…close` stretch the way exceljs's regular expressions do (an unclosed opener stays). */
function removeStretches(s: string, open: string, close: string): string {
  let out = "";
  let at = 0;
  for (;;) {
    const start = s.indexOf(open, at);
    if (start < 0) break;
    const end = s.indexOf(close, start + 1);
    if (end < 0) break;
    out += s.slice(at, start);
    at = end + 1;
  }
  return out + s.slice(at);
}

/** y m d h M s b — the letters exceljs's `isDateFmt` looks for. */
const DATE_LETTERS: ReadonlySet<number> = new Set(Array.from("ymdhMsb", (ch) => ch.charCodeAt(0)));

/** exceljs's `utils.isDateFmt`: square-bracketed and double-quoted stretches removed, then any date letter. */
export function excelIsDateFormat(format: string | undefined): boolean {
  if (!format) return false;
  const bare = removeStretches(removeStretches(format, "[", "]"), DQUOTE_TEXT, DQUOTE_TEXT);
  for (let i = 0; i < bare.length; i++) if (DATE_LETTERS.has(bare.charCodeAt(i))) return true;
  return false;
}

/**
 * exceljs's built-in number formats (`lib/xlsx/defaultnumformats.js`), the ids that carry a format of their own — the
 * locale-only ids (27–36, 50–81) have none there, so they never date.
 */
const BUILT_IN_FORMATS: ReadonlyMap<number, string> = new Map([
  [0, "General"], [1, "0"], [2, "0.00"], [3, "#,##0"], [4, "#,##0.00"], [9, "0%"], [10, "0.00%"], [11, "0.00E+00"],
  [12, "# ?/?"], [13, "# ??/??"], [14, "mm-dd-yy"], [15, "d-mmm-yy"], [16, "d-mmm"], [17, "mmm-yy"], [18, "h:mm AM/PM"],
  [19, "h:mm:ss AM/PM"], [20, "h:mm"], [21, "h:mm:ss"], [22, `m/d/yy ${DQUOTE_TEXT}h${DQUOTE_TEXT}:mm`],
  [37, "#,##0 ;(#,##0)"], [38, "#,##0 ;[Red](#,##0)"], [39, "#,##0.00 ;(#,##0.00)"], [40, "#,##0.00 ;[Red](#,##0.00)"],
  [45, "mm:ss"], [46, "[h]:mm:ss"], [47, "mmss.0"], [48, "##0.0E+0"], [49, "@"],
]);

const isLineTerminator = (c: number): boolean => c === LF || c === CR || c === LINE_SEPARATOR || c === PARAGRAPH_SEPARATOR;

/** exceljs's numFmt reading: every backslash escape removed, keeping the character it escaped (not a line end). */
function unescapeFormatCode(code: string): string {
  if (code.indexOf(BACKSLASH_TEXT) < 0) return code;
  let out = "";
  for (let i = 0; i < code.length; i++) {
    const c = code.charCodeAt(i);
    if (c === BACKSLASH && i + 1 < code.length && !isLineTerminator(code.charCodeAt(i + 1))) {
      out += code.charAt(i + 1);
      i++;
    } else out += code.charAt(i);
  }
  return out;
}

/** exceljs's `utils.xmlDecode`, run over text the XML parser already decoded (a `t="str"` value, a sheet's name). */
function excelXmlDecode(text: string): string {
  if (text.indexOf("&") < 0) return text;
  let out = "";
  let at = 0;
  for (;;) {
    const amp = text.indexOf("&", at);
    if (amp < 0) break;
    let j = amp + 1;
    while (j < text.length && text.charCodeAt(j) >= 97 && text.charCodeAt(j) <= 122) j++;
    if (j < text.length && text.charCodeAt(j) === SEMICOLON) {
      const name = text.slice(amp + 1, j);
      const value = name === "lt" ? "<" : name === "gt" ? ">" : name === "amp" ? "&" : name === "apos" ? SQUOTE_TEXT : name === "quot" ? DQUOTE_TEXT : null;
      out += text.slice(at, amp) + (value ?? text.slice(amp, j + 1));
      at = j + 1;
    } else {
      out += text.slice(at, amp + 1);
      at = amp + 1;
    }
  }
  return out + text.slice(at);
}

const isUpperHex = (c: number): boolean => (c >= 48 && c <= 57) || (c >= 65 && c <= 70);

/** exceljs's text xform: every `_xHHHH_` (upper-case hex) becomes its character — shared strings and rich runs only. */
function decodeOoxmlEscapes(text: string): string {
  if (text.indexOf("_x") < 0) return text;
  let out = "";
  let at = 0;
  for (;;) {
    const start = text.indexOf("_x", at);
    if (start < 0 || start + 7 > text.length) break;
    let hex = true;
    for (let k = start + 2; k < start + 6; k++) if (!isUpperHex(text.charCodeAt(k))) hex = false;
    if (hex && text.charCodeAt(start + 6) === UNDERSCORE) {
      out += text.slice(at, start) + String.fromCharCode(parseInt(text.slice(start + 2, start + 6), 16));
      at = start + 7;
    } else {
      out += text.slice(at, start + 1);
      at = start + 1;
    }
  }
  return out + text.slice(at);
}

/** A cell address's column, exceljs's `colCache.decodeAddress`: upper-case letters before the digits, `$` skipped. */
function decodeColumn(address: string): number | undefined {
  let col = 0;
  let hasCol = false;
  let hasRow = false;
  for (let i = 0; i < address.length; i++) {
    const c = address.charCodeAt(i);
    if (!hasRow && c >= 65 && c <= 90) {
      hasCol = true;
      col = col * 26 + c - 64;
    } else if (c >= 48 && c <= 57) hasRow = true;
    else if (hasRow && hasCol && c !== DOLLAR) break;
  }
  return hasCol ? col : undefined;
}

/** A cell address's row, the same walk (exceljs reads a merge's corners so). */
function decodeRow(address: string): number | undefined {
  let row = 0;
  let hasCol = false;
  let hasRow = false;
  for (let i = 0; i < address.length; i++) {
    const c = address.charCodeAt(i);
    if (!hasRow && c >= 65 && c <= 90) hasCol = true;
    else if (c >= 48 && c <= 57) {
      hasRow = true;
      row = row * 10 + c - 48;
    } else if (hasRow && hasCol && c !== DOLLAR) break;
  }
  return hasRow ? row : undefined;
}

/** The last column Excel has (XFD). exceljs refuses an address past it. */
const LAST_COLUMN = 16384;

/* ══ THE RULES — every step a seam ════════════════════════════════════════════════════════════════════════════ */

/** A transform from compressed bytes to inflated bytes. */
export type InflatePair = { readonly readable: ReadableStream<Uint8Array>; readonly writable: WritableStream<Uint8Array> };

export type XlsxBrowserRules = {
  /** The raw-deflate inflater — `new DecompressionStream("deflate-raw")`; an old browser's constructor throws. */
  readonly inflater: () => InflatePair;
  /** Can this platform inflate at all? Asked ONCE, before a byte is read — an old browser gets today's answer. */
  readonly platformReady: (inflater: () => InflatePair) => boolean;
  /** The name an element is matched by: its LOCAL name (the Open XML SDK writes `x:row`, `x:c`). */
  readonly localName: (qualified: string) => string;
  /** Is a sheet with this `state` visible? exceljs: absent or "visible". */
  readonly isVisible: (state: string | undefined) => boolean;
  /** exceljs's serial → Date. */
  readonly serialToDate: (serial: unknown, date1904: boolean) => Date;
  /** exceljs's `isDateFmt`. */
  readonly isDateFormat: (format: string | undefined) => boolean;
  /** The ONE number rule (xlsx-cells.ts). */
  readonly numberText: NumberText;
  /** A `t="str"` value (and a formula's cached text): exceljs's `xmlDecode` over the parser's own decoding. */
  readonly strText: (text: string) => string;
  /** Is the read past the inflate budget? */
  readonly overBudget: (inflated: number, budget: number) => boolean;
  /** One chunk of a part's bytes to text — STREAMED, so a character a chunk cuts in two is kept whole; `null` flushes. */
  readonly decodeChunk: (decoder: TextDecoder, chunk: Uint8Array | null) => string;
  /** Is a shared string's phonetic run (`<rPh>`) part of its text? Never. */
  readonly phoneticRuns: boolean;
  /** What a formula with no saved value reads as: nothing (blank, flagged). */
  readonly missingFormulaValue: () => unknown;
  /** What a cell covered by a merge reads as: blank (the master's text is offered, and not taken). */
  readonly coveredText: (master: () => string) => string;
  /** ⭐ THE sheet choice — `chooseSheet` (sheet-choice.ts), the ONE function both readers call. */
  readonly chooseSheet: (sheets: ReadonlyArray<SheetSample>) => SheetChoice;
  /** How many cells of a sample yield a mobile — `mobileCellsIn` (sheet-choice.ts): 0 for the sheet read is D8's word. */
  readonly mobileCells: (sample: ReadonlyArray<ReadonlyArray<string>>) => number;
  /** ⭐ A title above the column names — `dropTitleRows` (title-rows.ts), the ONE rule every reader's file goes through. */
  readonly titleRows: (file: ParsedContactsFile) => ParsedContactsFile;
  /** Are a row's trailing empty cells trimmed? Always. */
  readonly trimTrailing: boolean;
  readonly maxRows: number;
  readonly maxGridCells: number;
  /** ⭐ C3c-merge-guard · the ONE merge-ref rule (`xlsxMergeArea`, shared with the server): a `ref` → the cells and rows
   *  it covers, always finite, worst-cased for a bad or out-of-grid ref. A seam the suite plants to prove the charge. */
  readonly mergeArea: (ref: string) => { readonly cells: number; readonly rows: number };
  /** ⭐ C3c-merge-guard · the caps a merge is charged against, across the VISIBLE sheets: the ranges (XLSX_MAX_MERGES —
   *  past it exceljs's O(merges²) and this reader's merge handling would run away), the covered cells (XLSX_MAX_MERGED_CELLS)
   *  and the covered rows (maxRows). Past any one the read is `too_big_inflated`, so a forged flood cannot freeze the tab. */
  readonly maxMerges: number;
  readonly maxMergedCells: number;
  readonly maxStoredCells: number;
  readonly inflateBudget: number;
  readonly maxText: number;
  /** One yield to the event loop. */
  readonly yieldNow: () => Promise<void>;
  readonly now: () => number;
};

const defaultInflater = (): InflatePair => new DecompressionStream("deflate-raw") as unknown as InflatePair;

/** ⭐ THE SHIPPED RULES. */
export const XLSX_BROWSER_RULES: XlsxBrowserRules = {
  inflater: defaultInflater,
  platformReady: (inflater) => {
    try {
      inflater();
      return true;
    } catch {
      return false;
    }
  },
  localName: (qualified) => {
    const colon = qualified.indexOf(":");
    return colon < 0 ? qualified : qualified.slice(colon + 1);
  },
  isVisible: (state) => !state || state === "visible",
  serialToDate: excelSerialToDate,
  isDateFormat: excelIsDateFormat,
  numberText: xlsxNumberText,
  strText: excelXmlDecode,
  overBudget: (inflated, budget) => inflated > budget,
  decodeChunk: (decoder, chunk) => (chunk === null ? decoder.decode() : decoder.decode(chunk, { stream: true })),
  phoneticRuns: false,
  missingFormulaValue: () => undefined,
  coveredText: () => "",
  chooseSheet,
  mobileCells: mobileCellsIn,
  titleRows: dropTitleRows,
  trimTrailing: true,
  maxRows: XLSX_MAX_ROWS,
  maxGridCells: XLSX_MAX_GRID_CELLS,
  mergeArea: xlsxMergeArea,
  maxMerges: XLSX_MAX_MERGES,
  maxMergedCells: XLSX_MAX_MERGED_CELLS,
  maxStoredCells: XLSX_BROWSER_MAX_STORED_CELLS,
  inflateBudget: XLSX_BROWSER_INFLATE_BUDGET,
  maxText: XLSX_BROWSER_MAX_TEXT,
  yieldNow: () => new Promise((resolve) => setTimeout(resolve, 0)),
  now: () => Date.now(),
};

/* ══ STOPPING — a refusal, a Stop, or "enough read" ═══════════════════════════════════════════════════════════ */

/** Thrown inside the walk and caught at its top: never escapes the reader. */
class ReadStop {
  constructor(
    readonly why: "refused" | "aborted" | "enough",
    readonly refusal: XlsxRefusal = "unreadable",
    readonly detail: string = "reader",
    readonly ctx: XlsxRefusalContext = {},
  ) {}
}

const refuseWith = (refusal: XlsxRefusal, detail: string, ctx: XlsxRefusalContext = {}): ReadStop => new ReadStop("refused", refusal, detail, ctx);
const xmlFault = (detail: string): ReadStop => refuseWith("unreadable", `xml_${detail}`);

/* ══ XML — a small streaming scanner ══════════════════════════════════════════════════════════════════════════ */

/** What a part's reader hears: an element opened (its LOCAL name and its attributes, flat: name, value, …), an element
 *  closed, a run of text (entities decoded, line ends normalised, CDATA included). */
type XmlHandler = {
  open(local: string, attrs: readonly string[], count: number): void;
  close(local: string): void;
  text(text: string): void;
};

const isXmlChar = (c: number): boolean =>
  c === TAB || c === LF || c === CR || (c >= 0x20 && c <= 0xd7ff) || (c >= 0xe000 && c <= 0xfffd) || (c >= 0x10000 && c <= 0x10ffff);

function allDigits(s: string, hex: boolean): boolean {
  if (s.length === 0) return false;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    const digit = c >= 48 && c <= 57;
    if (!(digit || (hex && ((c >= 65 && c <= 70) || (c >= 97 && c <= 102))))) return false;
  }
  return true;
}

/** XML's five entities and its character references; anything else is not XML. */
function decodeXml(text: string): string {
  let out = "";
  let at = 0;
  for (;;) {
    const amp = text.indexOf("&", at);
    if (amp < 0) break;
    const semi = text.indexOf(";", amp + 1);
    if (semi < 0) throw xmlFault("entity");
    const name = text.slice(amp + 1, semi);
    let value: string;
    if (name === "lt") value = "<";
    else if (name === "gt") value = ">";
    else if (name === "amp") value = "&";
    else if (name === "quot") value = DQUOTE_TEXT;
    else if (name === "apos") value = SQUOTE_TEXT;
    else if (name.charCodeAt(0) === HASH) {
      const hex = name.charCodeAt(1) === LOWER_X;
      const digits = name.slice(hex ? 2 : 1);
      if (!allDigits(digits, hex)) throw xmlFault("char_ref");
      const code = parseInt(digits, hex ? 16 : 10);
      if (!isXmlChar(code)) throw xmlFault("char_ref");
      value = String.fromCodePoint(code);
    } else throw xmlFault("entity");
    out += text.slice(at, amp) + value;
    at = semi + 1;
  }
  return out + text.slice(at);
}

function isAllSpace(text: string): boolean {
  for (let i = 0; i < text.length; i++) if (!isSpace(text.charCodeAt(i))) return false;
  return true;
}

/** An attribute's value as XML reads it: a literal tab or line end is a space, then the entities. */
function attributeValue(raw: string): string {
  let v = raw;
  if (v.indexOf(TAB_TEXT) >= 0) v = v.split(TAB_TEXT).join(" ");
  if (v.indexOf(LF_TEXT) >= 0) v = v.split(LF_TEXT).join(" ");
  if (v.indexOf(CR_TEXT) >= 0) v = v.split(CR_TEXT).join(" ");
  return v.indexOf("&") >= 0 ? decodeXml(v) : v;
}

/**
 * ⭐ THE SCANNER — fed decoded text in chunks of any size, it hands elements and text to one part's reader. It keeps
 * only what a chunk cut short (an unfinished tag, an entity cut in half), checks what an XML parser checks that a
 * workbook could get wrong — an end tag that closes another element, an element left open, a second root, text outside
 * the root, an unknown entity, a bad character reference, a duplicate attribute — and refuses each as `unreadable`.
 */
class XmlScanner {
  private pending = "";
  private readonly stack: string[] = [];
  private seenRoot = false;
  private readonly attrs: string[] = [];

  constructor(
    private readonly handler: XmlHandler,
    private readonly localName: (qualified: string) => string,
    private readonly maxToken: number,
  ) {}

  feed(chunk: string): void {
    const buf = this.pending === "" ? chunk : this.pending + chunk;
    const len = buf.length;
    let pos = 0;
    while (pos < len) {
      const lt = buf.indexOf("<", pos);
      if (lt < 0) {
        // Text to the end of what has arrived — all of it but an entity a chunk cut in half.
        const amp = buf.lastIndexOf("&");
        const end = amp >= pos && buf.indexOf(";", amp) < 0 ? amp : len;
        if (end > pos) this.text(buf, pos, end);
        pos = end;
        break;
      }
      if (lt > pos) this.text(buf, pos, lt);
      const next = this.markup(buf, lt);
      if (next < 0) {
        pos = lt;
        break;
      }
      pos = next;
    }
    this.pending = pos >= len ? "" : buf.slice(pos);
    if (this.pending.length > this.maxToken) throw refuseWith("too_big_inflated", "token");
  }

  end(): void {
    if (this.pending !== "") {
      if (this.pending.indexOf("<") >= 0) throw xmlFault("cut");
      this.text(this.pending, 0, this.pending.length);
      this.pending = "";
    }
    if (this.stack.length > 0) throw xmlFault("unclosed");
    if (!this.seenRoot) throw xmlFault("no_root");
  }

  private text(buf: string, start: number, end: number): void {
    const raw = buf.slice(start, end);
    const text = raw.indexOf("&") >= 0 ? decodeXml(raw) : raw;
    if (this.stack.length === 0) {
      if (!isAllSpace(text)) throw xmlFault("text_outside_root");
      return;
    }
    this.handler.text(text);
  }

  private markup(buf: string, lt: number): number {
    if (lt + 1 >= buf.length) return -1;
    const c = buf.charCodeAt(lt + 1);
    if (c === QMARK) {
      const end = buf.indexOf("?>", lt + 2);
      return end < 0 ? -1 : end + 2;
    }
    if (c === BANG) return this.bang(buf, lt);
    if (c === SLASH) return this.closeTag(buf, lt);
    return this.openTag(buf, lt);
  }

  private bang(buf: string, lt: number): number {
    if (buf.startsWith(COMMENT_OPEN, lt)) {
      const end = buf.indexOf("-->", lt + COMMENT_OPEN.length);
      return end < 0 ? -1 : end + 3;
    }
    if (buf.startsWith(CDATA_OPEN, lt)) {
      const end = buf.indexOf(CDATA_CLOSE, lt + CDATA_OPEN.length);
      if (end < 0) return -1;
      if (this.stack.length === 0) throw xmlFault("cdata_outside_root");
      // ⚠️ CDATA is TEXT here, as XML says; exceljs drops it (its parser hears no CDATA event) — a recorded divergence.
      const raw = buf.slice(lt + CDATA_OPEN.length, end);
      if (raw !== "") this.handler.text(raw);
      return end + CDATA_CLOSE.length;
    }
    if (buf.startsWith(DOCTYPE_OPEN, lt)) {
      let quote = 0;
      let depth = 0;
      for (let i = lt + DOCTYPE_OPEN.length; i < buf.length; i++) {
        const c = buf.charCodeAt(i);
        if (quote !== 0) {
          if (c === quote) quote = 0;
        } else if (c === DQUOTE || c === SQUOTE) quote = c;
        else if (c === OPEN_BRACKET) depth++;
        else if (c === CLOSE_BRACKET) depth--;
        else if (c === GT && depth <= 0) return i + 1;
      }
      return -1;
    }
    const head = buf.slice(lt, Math.min(buf.length, lt + DOCTYPE_OPEN.length));
    if (COMMENT_OPEN.startsWith(head) || CDATA_OPEN.startsWith(head) || DOCTYPE_OPEN.startsWith(head)) return -1;
    throw xmlFault("markup");
  }

  private closeTag(buf: string, lt: number): number {
    const gt = buf.indexOf(">", lt + 2);
    if (gt < 0) return -1;
    let end = gt;
    while (end > lt + 2 && isSpace(buf.charCodeAt(end - 1))) end--;
    const qualified = buf.slice(lt + 2, end);
    const open = this.stack.pop();
    if (open === undefined || open !== qualified) throw xmlFault("close");
    this.handler.close(this.localName(qualified));
    return gt + 1;
  }

  private openTag(buf: string, lt: number): number {
    const len = buf.length;
    let i = lt + 1;
    while (i < len) {
      const c = buf.charCodeAt(i);
      if (isSpace(c) || c === GT || c === SLASH) break;
      i++;
    }
    if (i >= len) return -1;
    if (i === lt + 1) throw xmlFault("name");
    const qualified = buf.slice(lt + 1, i);
    const attrs = this.attrs;
    let count = 0;
    let selfClosing = false;
    for (;;) {
      while (i < len && isSpace(buf.charCodeAt(i))) i++;
      if (i >= len) return -1;
      const c = buf.charCodeAt(i);
      if (c === GT) {
        i++;
        break;
      }
      if (c === SLASH) {
        if (i + 1 >= len) return -1;
        if (buf.charCodeAt(i + 1) !== GT) throw xmlFault("tag");
        i += 2;
        selfClosing = true;
        break;
      }
      const nameStart = i;
      while (i < len) {
        const n = buf.charCodeAt(i);
        if (n === EQUALS || isSpace(n) || n === GT || n === SLASH) break;
        i++;
      }
      if (i >= len) return -1;
      if (i === nameStart) throw xmlFault("attribute");
      const name = buf.slice(nameStart, i);
      while (i < len && isSpace(buf.charCodeAt(i))) i++;
      if (i >= len) return -1;
      if (buf.charCodeAt(i) !== EQUALS) throw xmlFault("attribute");
      i++;
      while (i < len && isSpace(buf.charCodeAt(i))) i++;
      if (i >= len) return -1;
      const quote = buf.charCodeAt(i);
      if (quote !== DQUOTE && quote !== SQUOTE) throw xmlFault("attribute");
      const close = buf.indexOf(quote === DQUOTE ? DQUOTE_TEXT : SQUOTE_TEXT, i + 1);
      if (close < 0) return -1;
      const raw = buf.slice(i + 1, close);
      if (raw.indexOf("<") >= 0) throw xmlFault("attribute");
      for (let k = 0; k < count; k++) if (attrs[2 * k] === name) throw xmlFault("duplicate_attribute");
      attrs[2 * count] = name;
      attrs[2 * count + 1] = attributeValue(raw);
      count++;
      i = close + 1;
      if (i < len) {
        const after = buf.charCodeAt(i);
        if (!isSpace(after) && after !== GT && after !== SLASH) throw xmlFault("attribute");
      }
    }
    if (this.stack.length === 0) {
      if (this.seenRoot) throw xmlFault("second_root");
      this.seenRoot = true;
    }
    const local = this.localName(qualified);
    this.handler.open(local, attrs, count);
    if (selfClosing) this.handler.close(local);
    else this.stack.push(qualified);
    return i;
  }
}

/** An attribute by its exact (unprefixed) name — OOXML's attributes carry no prefix, whatever the elements carry. */
function attr(attrs: readonly string[], count: number, name: string): string | undefined {
  for (let k = 0; k < count; k++) if (attrs[2 * k] === name) return attrs[2 * k + 1];
  return undefined;
}

/** A relationship id: the first PREFIXED attribute whose local name is `id` (`r:id`, whatever the prefix). */
function relationshipId(attrs: readonly string[], count: number): string | undefined {
  for (let k = 0; k < count; k++) {
    const name = attrs[2 * k];
    const colon = name.indexOf(":");
    if (colon > 0 && name.slice(colon + 1) === "id") return attrs[2 * k + 1];
  }
  return undefined;
}

/* ══ THE ZIP ══════════════════════════════════════════════════════════════════════════════════════════════════ */

const SIG_LOCAL = 0x04034b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_ZIP64_LOCATOR = 0x07064b50;
const EOCD_SIZE = 22;
const LOCAL_SIZE = 30;
const CENTRAL_SIZE = 46;
const ZIP64_LOCATOR_SIZE = 20;
const U16_MAX = 0xffff;
const U32_MAX = 0xffffffff;
const EXTRA_ZIP64 = 0x0001;
const EXTRA_UNICODE_PATH = 0x7075;
const FLAG_ENCRYPTED = 0x0001;
const FLAG_STRONG_ENCRYPTION = 0x0040;
const EXTERNAL_DOS_DIRECTORY = 0x0010;
const METHOD_STORED = 0;
const METHOD_DEFLATED = 8;
const METHOD_AES = 99;
const WORKBOOK_XML = "xl/workbook.xml";
const WORKBOOK_BIN = "xl/workbook.bin";
const WORKBOOK_RELS = "xl/_rels/workbook.xml.rels";
const SHARED_STRINGS_XML = "xl/sharedStrings.xml";
const STYLES_XML = "xl/styles.xml";
const MIMETYPE_ENTRY = "mimetype";
/** The SpreadsheetML namespace a Strict Open XML workbook declares — the server's own test, on the workbook part. */
const STRICT_NAMESPACE = "purl.oclc.org/ooxml/spreadsheetml/main";

/** One entry, as the walk read it: the sizes are the CENTRAL DIRECTORY's (a data-descriptor entry's local ones are 0),
 *  the data's start is read off its LOCAL header (whose extra field may differ from the central one — macOS). */
type ZipEntry = {
  readonly name: string;
  /** The name with one leading slash dropped, as exceljs and the server key a part. */
  readonly key: string;
  readonly method: number;
  readonly compressedSize: number;
  readonly size: number;
  readonly dataStart: number;
};

async function bytesOf(file: Blob, start: number, end: number): Promise<Uint8Array> {
  return new Uint8Array(await file.slice(start, end).arrayBuffer());
}

/** JSZip's own path resolution: `.` and empty middle segments drop, `..` pops (the server refuses a name it changes). */
function jszipResolve(path: string): string {
  const parts = path.split("/");
  const out: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part === "." || (part === "" && i !== 0 && i !== parts.length - 1)) continue;
    if (part === "..") out.pop();
    else out.push(part);
  }
  return out.join("/");
}

/**
 * ⭐ THE ZIP, WALKED AS THE SERVER WALKS IT — and refused where it refuses, in the same words: the LAST end record in the
 * file, which must end it exactly (a trailing comment allowed); no zip64, no second disk; the central directory filling
 * exactly the bytes up to the end record, with exactly its count of entries (at most `XLSX_MAX_ENTRIES`); every entry
 * stored or deflated, none encrypted ("protected"), no zip64 or unicode-path extra field, no duplicate name, no folder
 * holding data, no name JSZip would resolve to another; and each entry's LOCAL header before the directory, naming the
 * same file. Only the end of the file, the directory and the local headers are read — never the data.
 */
async function readZipDirectory(file: Blob): Promise<ZipEntry[]> {
  const length = file.size;
  if (length < EOCD_SIZE) throw refuseWith("unreadable", "no_end_record");
  const tailStart = Math.max(0, length - (EOCD_SIZE + U16_MAX) - ZIP64_LOCATOR_SIZE);
  const tail = await bytesOf(file, tailStart, length);
  let found = -1;
  for (let i = tail.length - 4; i >= 0; i--) {
    if (tail[i] === 0x50 && tail[i + 1] === 0x4b && tail[i + 2] === 0x05 && tail[i + 3] === 0x06) {
      found = i;
      break;
    }
  }
  if (found < 0 || found + EOCD_SIZE > tail.length) throw refuseWith("unreadable", "no_end_record");
  const eocd = tailStart + found;
  const view = new DataView(tail.buffer, tail.byteOffset, tail.byteLength);
  const disk = view.getUint16(found + 4, true);
  const directoryDisk = view.getUint16(found + 6, true);
  const onThisDisk = view.getUint16(found + 8, true);
  const total = view.getUint16(found + 10, true);
  const directorySize = view.getUint32(found + 12, true);
  const directoryOffset = view.getUint32(found + 16, true);
  const commentLength = view.getUint16(found + 20, true);
  if (disk === U16_MAX || directoryDisk === U16_MAX || onThisDisk === U16_MAX || total === U16_MAX
    || directorySize === U32_MAX || directoryOffset === U32_MAX) {
    throw refuseWith("unreadable", "zip64");
  }
  if (disk !== 0 || directoryDisk !== 0 || onThisDisk !== total) throw refuseWith("unreadable", "multi_disk");
  if (eocd + EOCD_SIZE + commentLength !== length) throw refuseWith("unreadable", "layout");
  if (directoryOffset + directorySize !== eocd) {
    const locatorAt = found - ZIP64_LOCATOR_SIZE;
    const locator = locatorAt >= 0 && view.getUint32(locatorAt, true) === SIG_ZIP64_LOCATOR;
    throw refuseWith("unreadable", locator ? "zip64" : "layout");
  }
  if (total > XLSX_MAX_ENTRIES) throw refuseWith("too_big_inflated", "entries");
  if (directorySize > DIRECTORY_MAX_BYTES) throw refuseWith("unreadable", "layout");

  const dir = await bytesOf(file, directoryOffset, eocd);
  const d = new DataView(dir.buffer, dir.byteOffset, dir.byteLength);
  const end = dir.length;
  const names = new TextDecoder("utf-8");
  const entries: ZipEntry[] = [];
  const keys = new Set<string>();
  let at = 0;
  while (at + 4 <= end && d.getUint32(at, true) === SIG_CENTRAL) {
    if (entries.length >= XLSX_MAX_ENTRIES) throw refuseWith("too_big_inflated", "entries");
    if (at + CENTRAL_SIZE > end) throw refuseWith("unreadable", "layout");
    const flags = d.getUint16(at + 8, true);
    const method = d.getUint16(at + 10, true);
    const compressedSize = d.getUint32(at + 20, true);
    const size = d.getUint32(at + 24, true);
    const nameLength = d.getUint16(at + 28, true);
    const extraLength = d.getUint16(at + 30, true);
    const entryCommentLength = d.getUint16(at + 32, true);
    const diskStart = d.getUint16(at + 34, true);
    const external = d.getUint32(at + 38, true);
    const localOffset = d.getUint32(at + 42, true);
    const nameAt = at + CENTRAL_SIZE;
    const extraAt = nameAt + nameLength;
    const next = extraAt + extraLength + entryCommentLength;
    if (next > end) throw refuseWith("unreadable", "layout");
    if (compressedSize === U32_MAX || size === U32_MAX || localOffset === U32_MAX || diskStart === U16_MAX) {
      throw refuseWith("unreadable", "zip64");
    }
    for (let p = extraAt; p + 4 <= extraAt + extraLength; p += 4 + d.getUint16(p + 2, true)) {
      const id = d.getUint16(p, true);
      if (id === EXTRA_ZIP64) throw refuseWith("unreadable", "zip64");
      if (id === EXTRA_UNICODE_PATH) throw refuseWith("unreadable", "unicode_path");
    }
    if ((flags & (FLAG_ENCRYPTED | FLAG_STRONG_ENCRYPTION)) !== 0 || method === METHOD_AES) {
      throw refuseWith("wrong_format", "encrypted", { kind: "protected" });
    }
    if (method !== METHOD_STORED && method !== METHOD_DEFLATED) throw refuseWith("unreadable", "method");
    if (diskStart !== 0) throw refuseWith("unreadable", "multi_disk");
    if (localOffset + LOCAL_SIZE > directoryOffset) throw refuseWith("unreadable", "layout");
    const local = await bytesOf(file, localOffset, Math.min(directoryOffset, localOffset + LOCAL_SIZE + nameLength));
    const l = new DataView(local.buffer, local.byteOffset, local.byteLength);
    if (local.length < LOCAL_SIZE || l.getUint32(0, true) !== SIG_LOCAL) throw refuseWith("unreadable", "layout");
    const localNameLength = l.getUint16(26, true);
    const localExtraLength = l.getUint16(28, true);
    const dataStart = localOffset + LOCAL_SIZE + localNameLength + localExtraLength;
    if (dataStart + compressedSize > directoryOffset) throw refuseWith("unreadable", "layout");
    let sameName = localNameLength === nameLength && local.length >= LOCAL_SIZE + nameLength;
    for (let k = 0; sameName && k < nameLength; k++) if (local[LOCAL_SIZE + k] !== dir[nameAt + k]) sameName = false;
    if (!sameName) throw refuseWith("unreadable", "name_mismatch");
    const name = names.decode(dir.subarray(nameAt, nameAt + nameLength));
    if (jszipResolve(name) !== name) throw refuseWith("unreadable", "name");
    const folder = (external & EXTERNAL_DOS_DIRECTORY) !== 0 || name.endsWith("/");
    if (folder && (compressedSize !== 0 || size !== 0)) throw refuseWith("unreadable", "folder");
    const key = name.startsWith("/") ? name.slice(1) : name;
    if (keys.has(key)) throw refuseWith("unreadable", "duplicate");
    keys.add(key);
    if (!folder) entries.push({ name, key, method, compressedSize, size, dataStart });
    else entries.push({ name, key, method, compressedSize: 0, size: 0, dataStart });
    at = next;
  }
  if (at !== end || entries.length !== total) throw refuseWith("unreadable", "layout");
  return entries;
}

/* ══ ONE READ — its state, its budget, its bar, its Stop ══════════════════════════════════════════════════════ */

type Run = {
  readonly file: Blob;
  readonly rules: XlsxBrowserRules;
  readonly signal: AbortSignal | undefined;
  readonly onProgress: XlsxBrowserProgress | undefined;
  inflated: number;
  total: number | null;
  rowElements: number;
  storedCells: number;
  /** ⭐ C3c-merge-guard · the merges read across the VISIBLE sheets so far, and the cells and rows their rectangles cover
   *  (the Cell and Row objects exceljs would allocate) — charged against their caps as each `<mergeCell>` is read. */
  mergeCount: number;
  mergedCells: number;
  mergedRows: number;
  lastReport: number;
  lastYield: number;
};

function report(run: Run, force: boolean): void {
  if (run.onProgress === undefined) return;
  const now = run.rules.now();
  if (!force && now - run.lastReport < PROGRESS_EVERY_MS) return;
  run.lastReport = now;
  run.onProgress(run.inflated, run.total, run.rowElements);
}

function checkStop(run: Run): void {
  if (run.signal?.aborted) throw new ReadStop("aborted");
}

/** Normalises line ends as XML does (CRLF and a lone CR become LF), a CR at a chunk's end carried to the next. */
class LineEnds {
  private carried = false;
  take(text: string): string {
    let t = text;
    if (this.carried) {
      this.carried = false;
      t = CR_TEXT + t;
    }
    if (t.endsWith(CR_TEXT)) {
      this.carried = true;
      t = t.slice(0, -1);
    }
    if (t.indexOf(CR_TEXT) < 0) return t;
    return t.split(CRLF_TEXT).join(LF_TEXT).split(CR_TEXT).join(LF_TEXT);
  }
  flush(): string {
    if (!this.carried) return "";
    this.carried = false;
    return LF_TEXT;
  }
}

/**
 * ⭐ ONE PART, STREAMED: its bytes off the file, inflated (unless stored), decoded as UTF-8 and line-normalised, chunk by
 * chunk into `onText`. Every inflated byte is counted against the ONE budget; between chunks the reader yields, tells
 * the bar and reads Stop. A part read to its end must inflate to exactly the size the directory declares (the server's
 * rule). `onText` may end the read early by throwing "enough" — the stream is cancelled, and nothing else is read.
 */
async function streamPart(run: Run, entry: ZipEntry, onText: (text: string) => void): Promise<boolean> {
  const raw = run.file.slice(entry.dataStart, entry.dataStart + entry.compressedSize).stream() as ReadableStream<Uint8Array>;
  let stream: ReadableStream<Uint8Array>;
  try {
    stream = entry.method === METHOD_DEFLATED ? raw.pipeThrough(run.rules.inflater()) : raw;
  } catch {
    throw refuseWith("unreadable", "inflate");
  }
  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8");
  const lines = new LineEnds();
  let entryBytes = 0;
  let done = false;
  const deliver = (text: string): void => {
    if (text === "") return;
    if (DISALLOWED_CHAR.test(text)) throw xmlFault("character");
    onText(text);
  };
  try {
    for (;;) {
      checkStop(run);
      let next: ReadableStreamReadResult<Uint8Array>;
      try {
        next = await reader.read();
      } catch {
        throw refuseWith("unreadable", "inflate");
      }
      if (next.done) break;
      const chunk = next.value;
      entryBytes += chunk.byteLength;
      run.inflated += chunk.byteLength;
      if (run.rules.overBudget(run.inflated, run.rules.inflateBudget)) throw refuseWith("too_big_inflated", "bomb");
      deliver(lines.take(run.rules.decodeChunk(decoder, chunk)));
      report(run, false);
      const now = run.rules.now();
      if (now - run.lastYield >= YIELD_EVERY_MS) {
        await run.rules.yieldNow();
        run.lastYield = run.rules.now();
      }
    }
    deliver(lines.take(run.rules.decodeChunk(decoder, null)));
    deliver(lines.flush());
    done = true;
  } catch (e) {
    await reader.cancel().catch(() => undefined);
    if (e instanceof ReadStop && e.why === "enough") return false;
    throw e;
  }
  if (done && entryBytes !== entry.size) throw refuseWith("unreadable", "size_mismatch");
  return true;
}

/** A whole small part as bytes (the `mimetype` entry). */
async function partBytes(run: Run, entry: ZipEntry): Promise<Uint8Array> {
  const raw = run.file.slice(entry.dataStart, entry.dataStart + entry.compressedSize).stream() as ReadableStream<Uint8Array>;
  let stream: ReadableStream<Uint8Array>;
  try {
    stream = entry.method === METHOD_DEFLATED ? raw.pipeThrough(run.rules.inflater()) : raw;
  } catch {
    throw refuseWith("unreadable", "inflate");
  }
  const reader = stream.getReader();
  const parts: Uint8Array[] = [];
  let length = 0;
  for (;;) {
    let next: ReadableStreamReadResult<Uint8Array>;
    try {
      next = await reader.read();
    } catch {
      throw refuseWith("unreadable", "inflate");
    }
    if (next.done) break;
    length += next.value.byteLength;
    run.inflated += next.value.byteLength;
    if (run.rules.overBudget(run.inflated, run.rules.inflateBudget)) {
      await reader.cancel().catch(() => undefined);
      throw refuseWith("too_big_inflated", "bomb");
    }
    parts.push(next.value);
  }
  if (length !== entry.size) throw refuseWith("unreadable", "size_mismatch");
  const out = new Uint8Array(length);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.byteLength;
  }
  return out;
}

/** A part read through the scanner, its reader handed every element and text run. */
async function scanPart(run: Run, entry: ZipEntry, handler: XmlHandler): Promise<boolean> {
  const scanner = new XmlScanner(handler, run.rules.localName, run.rules.maxText);
  const whole = await streamPart(run, entry, (text) => scanner.feed(text));
  if (whole) scanner.end();
  return whole;
}

/* ══ THE PARTS ════════════════════════════════════════════════════════════════════════════════════════════════ */

/** Where an element sits, for the parts' readers: each knows only the places OOXML puts what it reads. */
const AT_OTHER = 0;
const AT_ROOT = 1;

type WorkbookSheet = { readonly name: string | undefined; readonly sheetId: number; readonly state: string | undefined; readonly rId: string | undefined };

/** xl/workbook.xml: the sheets in tab order, and `date1904` (exceljs: only when written "1"; the last one wins). */
class WorkbookPart implements XmlHandler {
  private readonly at: number[] = [];
  sheets: WorkbookSheet[] = [];
  date1904 = false;
  rooted = false;
  open(local: string, attrs: readonly string[], count: number): void {
    const depth = this.at.length;
    const parent = depth === 0 ? -1 : this.at[depth - 1];
    let here = AT_OTHER;
    if (depth === 0) {
      if (local === "workbook") {
        here = AT_ROOT;
        this.rooted = true;
      }
    } else if (parent === AT_ROOT && local === "workbookPr") {
      this.date1904 = attr(attrs, count, "date1904") === "1";
    } else if (parent === AT_ROOT && local === "sheets") {
      here = 2;
      this.sheets = [];
    } else if (parent === 2 && local === "sheet") {
      this.sheets.push({
        name: attr(attrs, count, "name"),
        sheetId: parseInt(attr(attrs, count, "sheetId") ?? "", 10),
        state: attr(attrs, count, "state"),
        rId: relationshipId(attrs, count),
      });
    }
    this.at.push(here);
  }
  close(): void {
    this.at.pop();
  }
  text(): void {}
}

/** A relationships part: each `Relationship`'s id → its target and type (the last of an id wins, as exceljs reads them). */
class RelsPart implements XmlHandler {
  private depth = 0;
  readonly rels = new Map<string, { readonly target: string; readonly type: string }>();
  open(local: string, attrs: readonly string[], count: number): void {
    if (this.depth === 1 && local === "Relationship") {
      const id = attr(attrs, count, "Id");
      if (id !== undefined) this.rels.set(id, { target: attr(attrs, count, "Target") ?? "", type: attr(attrs, count, "Type") ?? "" });
    }
    this.depth++;
  }
  close(): void {
    this.depth--;
  }
  text(): void {}
}

const SST_SI = 2;
const SST_T = 3;
const SST_R = 4;
const SST_R_T = 5;
const SST_SKIP = 6;

/**
 * xl/sharedStrings.xml, as exceljs's shared-string xform reads it: each `si` is its LAST plain `t` (escapes decoded), or
 * its rich runs joined (a run's last `t`); a phonetic run is never part of it; an `si` with neither is empty. Kept as
 * the text each one reads as — every shared-string cell reads through the value rule as exactly this text.
 */
class SharedStringsPart implements XmlHandler {
  private readonly at: number[] = [];
  readonly strings: string[] = [];
  private plain: string | null = null;
  private runs: string[] | null = null;
  private runText: string | null = null;
  private buffer = "";
  constructor(private readonly rules: XlsxBrowserRules) {}
  open(local: string): void {
    const depth = this.at.length;
    const parent = depth === 0 ? -1 : this.at[depth - 1];
    let here = AT_OTHER;
    if (depth === 0) here = local === "sst" ? AT_ROOT : AT_OTHER;
    else if (parent === AT_ROOT && local === "si") {
      here = SST_SI;
      this.plain = null;
      this.runs = null;
    } else if (parent === SST_SI && local === "t") {
      here = SST_T;
      this.buffer = "";
    } else if (parent === SST_SI && (local === "r" || (local === "rPh" && this.rules.phoneticRuns))) {
      here = SST_R;
      this.runText = null;
    } else if (parent === SST_R && local === "t") {
      here = SST_R_T;
      this.buffer = "";
    } else if (parent === SST_SI || parent === SST_SKIP) here = SST_SKIP;
    this.at.push(here);
  }
  close(): void {
    const here = this.at.pop();
    if (here === SST_T) {
      this.plain = decodeOoxmlEscapes(this.buffer);
      this.runs = null;
    } else if (here === SST_R_T) this.runText = decodeOoxmlEscapes(this.buffer);
    else if (here === SST_R) {
      // exceljs pushes a run onto `richText` of a model that is already a plain string: its strict-mode class throws.
      if (this.plain !== null) throw refuseWith("unreadable", "shared_string_mixed");
      (this.runs ??= []).push(this.runText ?? "");
    } else if (here === SST_SI) {
      this.strings.push(this.plain ?? (this.runs === null ? "" : this.runs.join("")));
    }
  }
  text(text: string): void {
    const here = this.at[this.at.length - 1];
    if (here !== SST_T && here !== SST_R_T) return;
    this.buffer += text;
    if (this.buffer.length > this.rules.maxText) throw refuseWith("too_big_inflated", "text");
  }
}

const ST_NUMFMTS = 2;
const ST_CELLXFS = 3;

/** xl/styles.xml: the workbook's own number formats (backslash escapes removed) and each cell style's `numFmtId`. */
class StylesPart implements XmlHandler {
  private readonly at: number[] = [];
  formats = new Map<number, string>();
  cellXfs: number[] = [];
  open(local: string, attrs: readonly string[], count: number): void {
    const depth = this.at.length;
    const parent = depth === 0 ? -1 : this.at[depth - 1];
    let here = AT_OTHER;
    if (depth === 0) here = local === "styleSheet" ? AT_ROOT : AT_OTHER;
    else if (parent === AT_ROOT && local === "numFmts") {
      here = ST_NUMFMTS;
      this.formats = new Map();
    } else if (parent === AT_ROOT && local === "cellXfs") {
      here = ST_CELLXFS;
      this.cellXfs = [];
    } else if (parent === ST_NUMFMTS && local === "numFmt") {
      const code = attr(attrs, count, "formatCode");
      if (code !== undefined) this.formats.set(parseInt(attr(attrs, count, "numFmtId") ?? "", 10), unescapeFormatCode(code));
    } else if (parent === ST_CELLXFS && local === "xf") {
      this.cellXfs.push(parseInt(attr(attrs, count, "numFmtId") ?? "", 10));
    }
    this.at.push(here);
  }
  close(): void {
    this.at.pop();
  }
  text(): void {}
}

/* ══ THE SHEET — read into rows, kept sparse until one is chosen ══════════════════════════════════════════════ */

const FLAG_NONE = 0;
const FLAG_FORMULA = 1;
const FLAG_ERROR = 2;

/** One row as read: its cells in arrival order (a later cell of the same column wins). */
type RowRecord = {
  readonly cols: number[];
  readonly texts: string[];
  /** Parallel to `cols` once any cell is flagged (formula without a value, or an error). */
  flags: number[] | null;
  /** A flagged formula cell's own address, by its index — a hyperlink on that address lifts the flag. */
  formulaAt: Map<number, string> | null;
};

type MergeRange = { readonly top: number; readonly left: number; readonly bottom: number; readonly right: number };

type SheetRead = {
  readonly name: string;
  readonly rows: Map<number, RowRecord>;
  ordered: boolean;
  readonly merges: MergeRange[];
  readonly hyperlinks: Set<string>;
  rowElements: number;
  /** Past `maxRows` row elements: no more of it was read. */
  over: boolean;
};

const WS_SHEETDATA = 2;
const WS_ROW = 3;
const WS_CELL = 4;
const WS_V = 5;
const WS_F = 6;
const WS_IS = 7;
const WS_T = 8;
const WS_R = 9;
const WS_R_T = 10;
const WS_SKIP = 11;
const WS_MERGES = 12;
const WS_LINKS = 13;

/** Everything a workbook says about how its cells read, beside the sheet itself. */
type WorkbookFacts = {
  readonly strings: readonly string[] | null;
  readonly styles: StylesPart | null;
  readonly date1904: boolean;
};

/** One cell while it is being read. */
type CellDraft = {
  r: string | undefined;
  t: string | undefined;
  s: string | undefined;
  formula: boolean;
  formulaType: string | undefined;
  value: string | undefined;
  runs: string[] | null;
  runText: string | null;
  buffer: string;
};

/**
 * ⭐ A WORKSHEET, as exceljs's worksheet, row and cell xforms and its Row and Worksheet models read it — every rule in
 * the header — into `SheetRead`: the rows by number (a repeated number replaces the row whole), each cell's TEXT and
 * flag already through the ONE value rule, and the merges and hyperlinked addresses that only the end of the sheet
 * holds. The row-element cap ends the read of a sheet at once ("enough").
 */
class SheetPart implements XmlHandler {
  private readonly at: number[] = [];
  private previousRow = 0;
  private maxRowSeen = 0;
  private previousColumn = 0;
  private row: RowRecord | null = null;
  private readonly cell: CellDraft = { r: undefined, t: undefined, s: undefined, formula: false, formulaType: undefined, value: undefined, runs: null, runText: null, buffer: "" };
  private readonly dateStyles = new Map<number, boolean>();
  rooted = false;

  constructor(
    readonly sheet: SheetRead,
    private readonly facts: WorkbookFacts,
    private readonly run: Run,
  ) {}

  open(local: string, attrs: readonly string[], count: number): void {
    const depth = this.at.length;
    const parent = depth === 0 ? -1 : this.at[depth - 1];
    let here = AT_OTHER;
    switch (parent) {
      case -1:
        if (local === "worksheet") {
          here = AT_ROOT;
          this.rooted = true;
        }
        break;
      case AT_ROOT:
        if (local === "sheetData") here = WS_SHEETDATA;
        else if (local === "mergeCells") here = WS_MERGES;
        else if (local === "hyperlinks") here = WS_LINKS;
        break;
      case WS_SHEETDATA:
        if (local === "row") {
          here = WS_ROW;
          this.startRow(attr(attrs, count, "r"));
        }
        break;
      case WS_ROW:
        if (local === "c") {
          here = WS_CELL;
          const c = this.cell;
          c.r = attr(attrs, count, "r");
          c.t = attr(attrs, count, "t");
          c.s = attr(attrs, count, "s");
          c.formula = false;
          c.formulaType = undefined;
          c.value = undefined;
          c.runs = null;
        }
        break;
      case WS_CELL:
        if (local === "v") here = WS_V;
        else if (local === "f") {
          here = WS_F;
          this.cell.formulaType = attr(attrs, count, "t");
        } else if (local === "is") here = WS_IS;
        else if (local === "t") here = WS_T;
        else if (local === "r") {
          here = WS_R;
          this.cell.runText = null;
        }
        break;
      case WS_IS:
        if (local === "t") here = WS_T;
        else if (local === "r") {
          here = WS_R;
          this.cell.runText = null;
        } else here = WS_SKIP; // a phonetic run (`rPh`) and anything else an inline string holds: never its text
        break;
      case WS_R:
        if (local === "t") {
          here = WS_R_T;
          this.cell.buffer = "";
        }
        break;
      case WS_MERGES:
        if (local === "mergeCell") this.addMerge(attr(attrs, count, "ref") ?? "");
        break;
      case WS_LINKS:
        if (local === "hyperlink") {
          const ref = attr(attrs, count, "ref");
          if (ref !== undefined && relationshipId(attrs, count)) this.sheet.hyperlinks.add(ref);
        }
        break;
      default:
        break;
    }
    this.at.push(here);
  }

  close(): void {
    const here = this.at.pop();
    if (here === WS_CELL) this.endCell();
    else if (here === WS_R_T) this.cell.runText = decodeOoxmlEscapes(this.cell.buffer);
    else if (here === WS_R) {
      // exceljs makes a rich value of a value that is already text: its strict-mode class throws on it.
      if (this.cell.value !== undefined) throw refuseWith("unreadable", "inline_mixed");
      (this.cell.runs ??= []).push(this.cell.runText ?? "");
    }
  }

  text(text: string): void {
    const here = this.at[this.at.length - 1];
    const c = this.cell;
    if (here === WS_V || here === WS_T) {
      if (c.runs !== null) return; // exceljs files text after rich runs where nothing reads it
      c.value = c.value === undefined ? text : c.value + text;
      if (c.value.length > this.run.rules.maxText) throw refuseWith("too_big_inflated", "text");
    } else if (here === WS_F) {
      if (text !== "") c.formula = true;
    } else if (here === WS_R_T) {
      c.buffer += text;
      if (c.buffer.length > this.run.rules.maxText) throw refuseWith("too_big_inflated", "text");
    }
  }

  private startRow(r: string | undefined): void {
    const parsed = r === undefined ? Number.NaN : parseInt(r, 10);
    const n = Number.isFinite(parsed) ? parsed : this.previousRow + 1;
    this.previousRow = n;
    this.previousColumn = 0;
    const sheet = this.sheet;
    sheet.rowElements++;
    this.run.rowElements++;
    if (sheet.rowElements > this.run.rules.maxRows) {
      sheet.over = true;
      throw new ReadStop("enough");
    }
    if (n < 1) {
      // exceljs files a row numbered 0 or less where no row is ever read.
      this.row = null;
      return;
    }
    if (n <= this.maxRowSeen) sheet.ordered = false;
    else this.maxRowSeen = n;
    const record: RowRecord = { cols: [], texts: [], flags: null, formulaAt: null };
    sheet.rows.set(n, record);
    this.row = record;
  }

  private addMerge(ref: string): void {
    // ⭐ C3c-merge-guard (MAJOR 4) · charge this merge the SAME way the server does, through the ONE shared rule
    // (`xlsxMergeArea`), across every VISIBLE sheet of the run: the cells and rows exceljs would allocate, and the
    // count. Past any cap the read stops at once (too_big_inflated) — so a vast `A1:XFD1048576`, a tall `A1:A1048576`
    // (MAJOR 10: a Row bomb), a flood of merges, or an out-of-grid corner never reaches the layout or freezes the tab.
    const extent = this.run.rules.mergeArea(ref);
    const run = this.run;
    run.mergeCount = Math.min(run.mergeCount + 1, run.rules.maxMerges + 1);
    run.mergedCells = Math.min(run.mergedCells + extent.cells, run.rules.maxMergedCells + 1);
    run.mergedRows = Math.min(run.mergedRows + extent.rows, run.rules.maxRows + 1);
    if (run.mergeCount > run.rules.maxMerges) throw refuseWith("too_big_inflated", "merges");
    if (run.mergedCells > run.rules.maxMergedCells) throw refuseWith("too_big_inflated", "merge_area");
    if (run.mergedRows > run.rules.maxRows) throw refuseWith("too_big_inflated", "merge_rows");
    // The rectangle for layout: built only for an in-grid ref (an out-of-grid one is refused above), so these decode to
    // finite, in-grid corners; `one` keeps a degenerate corner at 1.
    const parts = ref.split(":");
    const a = parts[0] ?? "";
    const b = parts.length > 1 ? parts[1] : a;
    const one = (v: number): number => (Number.isFinite(v) && v > 0 ? v : 1);
    const rowA = decodeRow(a) ?? Number.NaN;
    const rowB = decodeRow(b) ?? Number.NaN;
    const colA = decodeColumn(a) ?? Number.NaN;
    const colB = decodeColumn(b) ?? Number.NaN;
    this.sheet.merges.push({
      top: one(Math.min(rowA, rowB)),
      left: one(Math.min(colA, colB)),
      bottom: one(Math.max(rowA, rowB)),
      right: one(Math.max(colA, colB)),
    });
  }

  private isDateStyle(styleId: number): boolean {
    const known = this.dateStyles.get(styleId);
    if (known !== undefined) return known;
    const styles = this.facts.styles;
    let dated = false;
    if (styles !== null && styleId < styles.cellXfs.length) {
      const numFmtId = styles.cellXfs[styleId];
      if (numFmtId) dated = this.run.rules.isDateFormat(styles.formats.get(numFmtId) || BUILT_IN_FORMATS.get(numFmtId));
    }
    this.dateStyles.set(styleId, dated);
    return dated;
  }

  /** ⭐ exceljs's cell, closed: its parseClose, then its reconcile — and then the ONE value rule. */
  private endCell(): void {
    const c = this.cell;
    const rules = this.run.rules;
    // The column: the cell's own address, else the next column (every `<c>` takes one, as Excel reads them).
    let col = c.r === undefined ? undefined : decodeColumn(c.r);
    if (col === undefined) col = this.previousColumn + 1;
    if (col > LAST_COLUMN) throw refuseWith("unreadable", "column");
    this.previousColumn = col;
    const row = this.row;
    if (row === null) return;
    const styleId = c.s ? parseInt(c.s, 10) : Number.NaN;
    const dated = (): boolean => Boolean(styleId) && this.isDateStyle(styleId);
    const value: string | { richText: { text: string }[] } | undefined =
      c.runs !== null ? { richText: c.runs.map((text) => ({ text })) } : c.value;
    let text: string;
    let flag = FLAG_NONE;
    if (c.formula || c.formulaType) {
      let result: unknown = undefined;
      if (value) {
        if (c.t === "str") {
          if (typeof value !== "string") throw refuseWith("unreadable", "formula_rich");
          result = rules.strText(value);
        } else if (c.t === "b") result = parseInt(String(value), 10) !== 0;
        else if (c.t === "e") result = { error: value };
        else result = parseFloat(String(value));
      } else result = rules.missingFormulaValue();
      if (result !== undefined && dated()) result = rules.serialToDate(result, this.facts.date1904);
      if (result === undefined || result === null) {
        text = "";
        flag = FLAG_FORMULA;
      } else {
        const read = xlsxValueText(result, rules.numberText);
        text = read.text;
        flag = read.flag === "error" ? FLAG_ERROR : FLAG_NONE;
      }
    } else if (value !== undefined) {
      let v: unknown;
      switch (c.t) {
        case "s": {
          const index = parseInt(String(value), 10);
          if (this.facts.strings === null) v = index;
          else {
            const shared = this.facts.strings[index];
            // exceljs reads `.richText` of the missing string: it throws.
            if (shared === undefined) throw refuseWith("unreadable", "shared_string_index");
            v = shared;
          }
          break;
        }
        case "str":
          if (typeof value !== "string") throw refuseWith("unreadable", "inline_rich");
          v = rules.strText(value);
          break;
        case "inlineStr":
          v = value;
          break;
        case "b":
          v = parseInt(String(value), 10) !== 0;
          break;
        case "e":
          v = { error: value };
          break;
        default: {
          const n = parseFloat(String(value));
          v = dated() ? rules.serialToDate(n, this.facts.date1904) : n;
          break;
        }
      }
      const read = xlsxValueText(v, rules.numberText);
      text = read.text;
      flag = read.flag === "error" ? FLAG_ERROR : FLAG_NONE;
    } else if (styleId) {
      text = ""; // a styled empty cell: it exists, and it is empty
    } else return; // no value, no style: exceljs never makes this cell
    const index = row.cols.length;
    row.cols.push(col);
    row.texts.push(text);
    if (flag !== FLAG_NONE || row.flags !== null) {
      if (row.flags === null) row.flags = new Array<number>(index).fill(FLAG_NONE);
      row.flags.push(flag);
    }
    if (flag === FLAG_FORMULA && c.r !== undefined) (row.formulaAt ??= new Map()).set(index, c.r);
    this.run.storedCells++;
    if (this.run.storedCells > rules.maxStoredCells) throw refuseWith("too_big_inflated", "cells");
  }
}

/* ══ THE ROWS, LAID OUT — merges and hyperlinks applied, as exceljs's Worksheet model holds them ══════════════ */

type Laid = {
  readonly rows: ParsedRow[];
  readonly flagged: Record<CellFlag, number[]>;
};

/** The rows holding a cell a merge covers, in order: a merge's covered cells are all but its first. ⭐ C3c-merge-guard
 *  (MAJOR 4) · BOUNDED: the merge-row guard (`addMerge`) has already refused any workbook whose merges span more than
 *  `limit` (= XLSX_MAX_ROWS) rows, so this list can never exceed `limit`; the `n > limit` stop is a belt that keeps a
 *  future change from ever materialising more than the row cap synchronously (never the 10^11 of an unbounded ref). */
function mergedRows(merges: readonly MergeRange[], limit: number): number[] {
  const spans = merges
    .map((m) => (m.right > m.left ? [m.top, m.bottom] : m.bottom > m.top ? [m.top + 1, m.bottom] : null))
    .filter((s): s is number[] => s !== null)
    .sort((a, b) => a[0] - b[0]);
  const lines: number[] = [];
  let upTo = 0;
  for (const [from, to] of spans) {
    for (let n = Math.max(from, upTo + 1); n <= to && lines.length <= limit; n++) lines.push(n);
    if (to > upTo) upTo = to;
    if (lines.length > limit) break;
  }
  return lines;
}

/** exceljs refuses a merge over a merged cell ("Cannot merge already merged cells"); so does this reader. */
function mergesOverlap(merges: readonly MergeRange[]): boolean {
  const sorted = [...merges].sort((a, b) => a.top - b.top);
  const active: MergeRange[] = [];
  for (const m of sorted) {
    for (let k = active.length - 1; k >= 0; k--) if (active[k].bottom < m.top) active.splice(k, 1);
    for (const o of active) if (!(o.right < m.left || o.left > m.right)) return true;
    active.push(m);
  }
  return false;
}

/**
 * ⭐ A SHEET'S ROWS IN ROW ORDER, as the server iterates them: each row's cells (a later cell of a column wins), a cell
 * covered by a merge blank, a hyperlinked formula unflagged, the trailing empty cells trimmed, a blank row skipped but
 * still counted by its number. With `caps` the server's two caps apply as it applies them, row by row (a non-blank row
 * past `maxRows`; the grid past `maxGridCells`); with `limit` the walk stops at that many non-blank rows (a sample).
 * ⛔ A SAMPLE (`caps` off — the rows `chooseSheet` reads) IS NEVER LAID OUT DENSELY: each of its rows is its non-empty
 * texts in column order, exactly as the server's sampler hands them over (`sheetSample`, import-xlsx.ts) — the choice
 * counts cells, never places (sheet-choice.ts) — so a forged sheet whose rows each end in column XFD costs its cells,
 * never 16,384 slots a row on every visible sheet before any guard could see them. Its merge note is never built.
 */
function layOut(sheet: SheetRead, rules: XlsxBrowserRules, opts: { readonly caps: boolean; readonly limit: number }): Laid {
  const numbers = [...sheet.rows.keys()];
  if (!sheet.ordered) numbers.sort((a, b) => a - b);
  const merges = [...sheet.merges].sort((a, b) => a.top - b.top);
  // ⭐ C3c-merge-guard · the merges spanning the current line, kept sorted by LEFT. They are column-DISJOINT (an overlap
  // is refused before layout), so a cell's one covering merge is found by binary search — O(log) a cell, never
  // O(merges) — and the set is pruned LAZILY: it is scanned only when the line passes the earliest bottom, so a tall
  // merge costs no per-row work. Both keep a forged many-merge sheet (up to `maxMerges`) from freezing the officer's tab.
  const active: MergeRange[] = [];
  let next = 0;
  let minBottom = Number.POSITIVE_INFINITY;
  const activate = (m: MergeRange): void => {
    let lo = 0;
    let hi = active.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (active[mid].left < m.left) lo = mid + 1;
      else hi = mid;
    }
    active.splice(lo, 0, m);
    if (m.bottom < minBottom) minBottom = m.bottom;
  };
  /** The one merge covering `col` among the active (disjoint) ranges, or null: the rightmost whose left ≤ col, if its right ≥ col. */
  const covering = (col: number): MergeRange | null => {
    let lo = 0;
    let hi = active.length - 1;
    let at = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (active[mid].left <= col) {
        at = mid;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    return at >= 0 && active[at].right >= col ? active[at] : null;
  };
  const rows: ParsedRow[] = [];
  const flagged: Record<CellFlag, number[]> = { formula_without_result: [], error: [], merged: [] };
  let grid = 0;
  const textAt = (line: number, col: number): string => {
    const record = sheet.rows.get(line);
    if (record === undefined) return "";
    let found = "";
    for (let k = 0; k < record.cols.length; k++) if (record.cols[k] === col) found = record.texts[k];
    return found;
  };
  for (const line of numbers) {
    while (next < merges.length && merges[next].top <= line) activate(merges[next++]);
    if (line > minBottom) {
      for (let k = active.length - 1; k >= 0; k--) if (active[k].bottom < line) active.splice(k, 1);
      minBottom = Number.POSITIVE_INFINITY;
      for (const m of active) if (m.bottom < minBottom) minBottom = m.bottom;
    }
    const record = sheet.rows.get(line);
    if (record === undefined) continue;
    const { cols, texts, flags, formulaAt } = record;
    let order: number[] | null = null;
    for (let k = 1; k < cols.length; k++) {
      if (cols[k] <= cols[k - 1]) {
        const last = new Map<number, number>();
        for (let j = 0; j < cols.length; j++) last.set(cols[j], j);
        order = [...last.values()].sort((x, y) => cols[x] - cols[y]);
        break;
      }
    }
    const count = order === null ? cols.length : order.length;
    const found: Array<readonly [number, string]> = [];
    let lastColumn = 0;
    let formulaFlag = false;
    let errorFlag = false;
    for (let j = 0; j < count; j++) {
      const k = order === null ? j : order[j];
      const col = cols[k];
      let text = texts[k];
      let flag = flags === null ? FLAG_NONE : flags[k];
      const m = covering(col);
      if (m !== null && !(line === m.top && col === m.left)) {
        text = rules.coveredText(() => textAt(m.top, m.left));
        flag = FLAG_NONE;
      }
      if (flag === FLAG_FORMULA && formulaAt !== null) {
        const address = formulaAt.get(k);
        if (address !== undefined && sheet.hyperlinks.has(address)) flag = FLAG_NONE;
      }
      if (flag === FLAG_FORMULA) formulaFlag = true;
      else if (flag === FLAG_ERROR) errorFlag = true;
      if (text !== "") {
        found.push([col, text]);
        if (col > lastColumn) lastColumn = col;
      } else if (!rules.trimTrailing && col > lastColumn) lastColumn = col;
    }
    if (formulaFlag) flagged.formula_without_result.push(line);
    if (errorFlag) flagged.error.push(line);
    if (lastColumn === 0 || found.length === 0) continue; // blank — counted from the gaps in the lines
    if (opts.caps) {
      if (line > rules.maxRows) throw refuseWith("too_many_rows", "row_number");
      grid += lastColumn;
      if (grid > rules.maxGridCells) throw refuseWith("too_big_inflated", "grid");
      const cells = new Array<string>(lastColumn).fill("");
      for (const [col, text] of found) cells[col - 1] = text;
      rows.push({ line, cells });
    } else rows.push({ line, cells: found.map(([, text]) => text) }); // a sample: the non-empty texts alone
    if (rows.length >= opts.limit) break;
  }
  if (opts.caps) flagged.merged = mergedRows(sheet.merges, rules.maxRows);
  return { rows, flagged };
}

/* ══ THE READER ═══════════════════════════════════════════════════════════════════════════════════════════════ */

/** A relationship's target as a part name: absolute from the package root, else relative to `xl/`. */
function partOf(target: string): string {
  const t = target.trim();
  const joined = t.startsWith("/") ? t.slice(1) : `xl/${t}`;
  const out: string[] = [];
  for (const part of joined.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") out.pop();
    else out.push(part);
  }
  return out.join("/");
}

const WORKSHEET_TYPE_END = "/worksheet";
const WORKSHEETS_FOLDER = "xl/worksheets/";

/** A workbook's sheet, resolved to its part: the sheets exceljs would list, in tab order. */
type ResolvedSheet = { readonly name: string; readonly visible: boolean; readonly entry: ZipEntry; readonly order: number };

const emptyStats = (bytes: number): XlsxBrowserStats => ({ bytes, inflatedBytes: 0, entries: 0, rows: 0, blankRows: 0, width: 0, sheets: 0, ms: 0 });

/** A reader built from `rules`. ⛔ It never throws: anything unforeseen is the copy table's unreadable sentence. */
export function buildXlsxBrowserReader(rules: XlsxBrowserRules): (file: Blob, opts?: XlsxBrowserOptions) => Promise<XlsxBrowserResult> {
  return async (file, opts = {}) => {
    const started = rules.now();
    const tally = { entries: 0, rows: 0, blankRows: 0, width: 0, sheets: 0 };
    const run: Run = {
      file, rules, signal: opts.signal, onProgress: opts.onProgress,
      inflated: 0, total: null, rowElements: 0, storedCells: 0,
      mergeCount: 0, mergedCells: 0, mergedRows: 0, lastReport: 0, lastYield: started,
    };
    const stats = (): XlsxBrowserStats => ({ bytes: file.size, inflatedBytes: run.inflated, ...tally, ms: rules.now() - started });
    const refused = (refusal: XlsxRefusal, detail: string, ctx: XlsxRefusalContext = {}): XlsxBrowserResult => ({
      kind: "refused",
      refusal,
      wrongFormat: refusal === "wrong_format" ? ctx.kind ?? "other" : null,
      detail,
      message: xlsxRefusalSentence(refusal, ctx),
      stats: stats(),
    });
    try {
      if (opts.signal?.aborted) return { kind: "aborted" };
      // 0 · ⭐ AN OLD BROWSER: no raw-deflate inflater — today's answer for a big workbook, before a byte is read.
      if (!rules.platformReady(rules.inflater)) return refused("too_large", "no_inflate", { bytes: file.size });

      // 1 · the zip, walked as the server walks it
      const entries = await readZipDirectory(file);
      tally.entries = entries.length;
      const byKey = new Map<string, ZipEntry>();
      for (const e of entries) byKey.set(e.key, e);
      checkStop(run);

      // 2 · what the zip IS — the server's order: .xlsb, no workbook at all, OpenDocument, no workbook, Strict
      if (entries.some((e) => e.key.toLowerCase() === WORKBOOK_BIN)) return refused("wrong_format", "xlsb", { kind: "xlsb" });
      const workbookEntry = byKey.get(WORKBOOK_XML);
      const mimetypes = entries.filter((e) => e.key.toLowerCase() === MIMETYPE_ENTRY);
      if (workbookEntry === undefined && mimetypes.length === 0) return refused("wrong_format", "not_a_workbook", { kind: "other" });
      for (const m of mimetypes) {
        const bytes = await partBytes(run, m);
        let ods = bytes.length >= ODS_MIMETYPE.length;
        for (let k = 0; ods && k < ODS_MIMETYPE.length; k++) if (bytes[k] !== ODS_MIMETYPE.charCodeAt(k)) ods = false;
        if (ods) return refused("wrong_format", "ods", { kind: "ods" });
      }
      if (workbookEntry === undefined) return refused("wrong_format", "not_a_workbook", { kind: "other" });

      // 3 · the workbook: Strict refused off its text (the server's test), then its sheets and date1904
      const workbook = new WorkbookPart();
      let workbookText = "";
      const workbookScanner = new XmlScanner(workbook, rules.localName, rules.maxText);
      await streamPart(run, workbookEntry, (text) => {
        workbookText += text;
        if (workbookText.length > rules.maxText) throw refuseWith("too_big_inflated", "token");
      });
      if (workbookText.indexOf(STRICT_NAMESPACE) >= 0) return refused("wrong_format", "strict", { kind: "strict" });
      workbookScanner.feed(workbookText);
      workbookScanner.end();
      if (!workbook.rooted) return refused("unreadable", "workbook");

      // 4 · its relationships, and the sheets exceljs would list: those whose relationship reaches a worksheet part
      const rels = new RelsPart();
      const relsEntry = byKey.get(WORKBOOK_RELS);
      if (relsEntry !== undefined) await scanPart(run, relsEntry, rels);
      const resolved = new Map<string, ResolvedSheet>();
      workbook.sheets.forEach((sheet, order) => {
        if (!Number.isFinite(sheet.sheetId) || sheet.sheetId < 1 || sheet.rId === undefined) return;
        const rel = rels.rels.get(sheet.rId);
        if (rel === undefined) return;
        const key = partOf(rel.target);
        const entry = byKey.get(key);
        if (entry === undefined || !(rel.type.endsWith(WORKSHEET_TYPE_END) || key.startsWith(WORKSHEETS_FOLDER))) return;
        if (sheet.name === undefined) throw refuseWith("unreadable", "sheet_name");
        // exceljs gives one part to the LAST sheet that names it.
        resolved.set(key, { name: excelXmlDecode(sheet.name), visible: rules.isVisible(sheet.state), entry, order });
      });
      const sheets = [...resolved.values()].sort((a, b) => a.order - b.order);
      tally.sheets = sheets.length;
      if (sheets.length === 0) return refused("empty", "no_sheets");
      if (!sheets.some((s) => s.visible)) return refused("no_visible_sheet", "all_hidden");

      // 5 · the bar's total: every part this read opens, as the directory declares it
      const stylesEntry = byKey.get(STYLES_XML) ?? null;
      const stringsEntry = byKey.get(SHARED_STRINGS_XML) ?? null;
      run.total = run.inflated
        + (stylesEntry?.size ?? 0) + (stringsEntry?.size ?? 0)
        + sheets.filter((s) => s.visible).reduce((sum, s) => sum + s.entry.size, 0);
      report(run, true);

      // 6 · the styles and the shared strings, when the workbook has them (exceljs finds both by these names)
      let styles: StylesPart | null = null;
      if (stylesEntry !== null) {
        styles = new StylesPart();
        await scanPart(run, stylesEntry, styles);
      }
      let strings: string[] | null = null;
      if (stringsEntry !== null) {
        const part = new SharedStringsPart(rules);
        await scanPart(run, stringsEntry, part);
        strings = part.strings;
      }
      const facts: WorkbookFacts = { strings, styles, date1904: workbook.date1904 };

      // 7 · ⭐ every VISIBLE sheet, read whole in tab order (a hidden one is never opened)
      const read: Array<SheetRead | null> = [];
      for (const s of sheets) {
        if (!s.visible) {
          read.push(null);
          continue;
        }
        const sheet: SheetRead = { name: s.name, rows: new Map(), ordered: true, merges: [], hyperlinks: new Set(), rowElements: 0, over: false };
        const part = new SheetPart(sheet, facts, run);
        const whole = await scanPart(run, s.entry, part);
        if (whole && !part.rooted) throw refuseWith("unreadable", "worksheet");
        if (mergesOverlap(sheet.merges)) throw refuseWith("unreadable", "merge_overlap");
        read.push(sheet);
        checkStop(run);
      }
      report(run, true);

      // 8 · ⭐ THE CHOICE (C3b-fix · D6) — each sheet's name, visibility and first non-empty rows (a hidden sheet's never
      // read: an empty sample), handed to the ONE function the server's reader calls too
      const samples: SheetSample[] = sheets.map((s, i) => {
        const sheet = read[i];
        const sample = sheet === null ? [] : layOut(sheet, rules, { caps: false, limit: SHEET_SAMPLE_ROWS }).rows.map((r) => r.cells);
        return { name: s.name, visible: s.visible, sample };
      });
      const choice = rules.chooseSheet(samples);
      const chosen = choice.index >= 0 && choice.index < read.length ? read[choice.index] : null;
      if (chosen === null) return refused("no_visible_sheet", "all_hidden");
      // ⭐ D8 · the sheet read holds the most mobiles of all, so none in its sample means none in any visible sheet's.
      const noMobileSheet = rules.mobileCells(samples[choice.index].sample) === 0;

      // 9 · the chosen sheet's rows, the server's caps applied as it applies them
      if (chosen.over) return refused("too_many_rows", "rows");
      const laid = layOut(chosen, rules, { caps: true, limit: Number.POSITIVE_INFINITY });
      if (laid.rows.length === 0) return refused("empty", "no_rows", { sheet: chosen.name });
      const notes: string[] = [];
      if (choice.note !== null) notes.push(choice.note);
      notes.push(...xlsxCellNotes(laid.flagged));
      const rows = laid.rows;
      const blankRows = rows[rows.length - 1].line - rows.length;
      const width = rows.reduce((widest, r) => Math.max(widest, r.cells.length), 0);
      const fileName = typeof opts.fileName === "string" && opts.fileName.trim() !== "" ? opts.fileName : null;
      // 10 · ⭐ C3b-fix · D7 · a title above the column names leaves the data — the ONE rule, on the file as read.
      const parsed = rules.titleRows({ format: "xlsx", fileName, rows, width, blankRows, notes, unreadable: [] });
      tally.rows = parsed.rows.length;
      tally.blankRows = parsed.blankRows;
      tally.width = parsed.width;
      return { kind: "read", file: parsed, stats: stats(), noMobileSheet };
    } catch (e) {
      if (e instanceof ReadStop) {
        if (e.why === "aborted") return { kind: "aborted" };
        if (e.why === "refused") return refused(e.refusal, e.detail, e.ctx);
      }
      return refused("unreadable", "reader");
    }
  };
}

/** ⭐ THE browser reader, on the shipped rules. `import-read.ts` calls it for a workbook past `XLSX_MAX_BYTES`. */
export const readXlsxInBrowser: (file: Blob, opts?: XlsxBrowserOptions) => Promise<XlsxBrowserResult> = buildXlsxBrowserReader(XLSX_BROWSER_RULES);

/** The stats of a read that never began. */
export const XLSX_BROWSER_ZERO_STATS: XlsxBrowserStats = emptyStats(0);
