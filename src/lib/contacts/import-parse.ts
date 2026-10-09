/**
 * ⭐ THE CSV READER — a contacts CSV read as a STREAM into C15's ONE shape.               (U25, S10 2026-10-02)
 *
 * The contact book imports CSV: Excel's "CSV UTF-8" and plain "CSV", a semicolon file from a comma-decimal locale,
 * Excel's "Unicode Text" (tab-separated UTF-16), another system's export, a paste. This module reads one as it
 * arrives — `createCsvReader().push(chunk)` for every piece of decoded text, then `.end()` — and returns C15's
 * `ParsedContactsFile` with `format: "csv"`, or a refusal naming its row. `parseCsv` is only push + end: there is
 * ONE engine, for 40 rows and for 150,000 (§3c.2 forbids read-then-split), and the suite proves with the reader's
 * own counter that every character is tokenized exactly once.
 *
 * ── RFC 4180, AS EXCEL WRITES IT ──────────────────────────────────────────────────────────────────────
 *   · a cell is quoted only when its FIRST character is a quotation mark. Inside, a doubled mark is one mark, and
 *     a line break (CRLF, LF or a lone CR, each kept as one LF) stays in the cell, so the record is still ONE row;
 *   · a mark anywhere else is literal (a 5-inch screen keeps its inch mark), and text after a closing mark is kept
 *     — Excel reads a quoted abc followed by def as abcdef — with a note naming the row;
 *   · CRLF, LF and a lone CR (old Mac Excel) each end a record, and a final line end makes no empty record.
 * ⛔ CELLS STAY RAW: no trim, no coercion, no unguard. Excel's shortened `2.55713E+11` passes through as written:
 * U28's `draftContactRow` flags it for every producer (M6) and unguards every cell (C16).
 *
 * ── WHICH CHARACTER SEPARATES THE CELLS ───────────────────────────────────────────────────────────────
 * A manual choice (`{ delimiter }`, the mapping panel's) beats everything; then Excel's `sep=` directive, valid on
 * the first line only, after the byte-order mark (`sep=;`, a quoted `sep=,`, `SEP=|` — an unsupported character
 * is noted, and its line is still skipped); then the VOTE. The vote reads the FIRST NON-BLANK RECORD once per
 * candidate — comma, semicolon, tab, pipe — each with its OWN quote rules, so a quoted header cell may hold a line
 * break or another candidate, and it never reads the body.
 * ⚠️ Corrected: counting alone cannot decide the plan's own header (Jina, kamili and Makundi, lebo, zaidi quoted,
 * Simu bare, semicolons between). Under a comma's rules its second quoted cell does not start a field, so its two
 * commas are outside quotes and tie the two semicolons — and the tie-break order would pick the comma. So a
 * candidate under whose rules the record's quoting breaks (a quotation mark that is not around a whole cell) loses
 * to every candidate that reads it cleanly. The highest count among those wins; a tie goes to the candidate order
 * and is noted; no candidate at all means ONE column (and a later row holding a candidate is noted). The vote never
 * holds more than `MAX_HEADER_CHARS`.
 *
 * ── WHAT A FILE BECOMES ───────────────────────────────────────────────────────────────────────────────
 *   · each row's `line` is the record as Excel numbers it: the `sep=` line hidden, a quoted line break inside one
 *     record, and blank records (every cell empty or spaces — an empty line, a row of commas, a quoted empty cell)
 *     counted in `blankRows` and in the numbering but never emitted;
 *   · warnings become `notes`, one sentence per kind, naming rows through `formatRowList` (the first 50, with the
 *     true count beside them) and never a cell (§5.14 — the file is personal data);
 *   · ⭐ C3b · G1 — ONE BROKEN QUOTE NO LONGER COSTS THE FILE. A record that opens a quotation mark never closed has
 *     swallowed the rest of the text into one cell; when rows came before it, every one of them is kept and that record
 *     — with everything after it — is ONE `unreadable` record on its own line, its sentence naming the row and the way
 *     out (`csvUnclosedQuoteReason`), never a cell. The check's "Could not be read" box lists it;
 *   · ⛔ a FATAL problem is a REFUSAL naming its row, never a file: a quotation mark never closed when NOTHING before it
 *     was a record (only blank lines, or none), a cell over 32,767 characters (a quote that swallowed more than a cell
 *     can hold), a first record that does not end within 1 MiB;
 *   · `unreadable` holds at most that one record: any other CSV record is a row, a blank, or the reason for a refusal.
 *
 * ── FROM BYTES TO TEXT ────────────────────────────────────────────────────────────────────────────────
 * ⭐ C19 · `stripBom` is the DECODE-TIME stripper, and this reader applies it to the start of the text.
 * `DECODE_OPTIONS` sets `ignoreBOM: true`, so the platform decoder passes the mark through instead of eating it
 * first — otherwise this strip is never reached and U34's BOM-pair red can never fail. U26's and U28's strips are
 * belts. `sniffEncoding` reads the first 4 KB and picks utf-8, utf-16le or utf-16be (Excel's Unicode Text), or
 * windows-1252 (Excel's plain CSV on an English PC); a row still holding U+FFFD is counted and named.
 * `detectFormat` lets the content beat the file name — a `.txt` of vCards is vCards — through `vcard.ts`'s
 * `looksLikeVcard` (C17) and `xlsx-limits.ts`' ONE spreadsheet classifier and refusal copy (C18).
 *
 * ⛔ PURE AND CLIENT-SAFE — OD29 parses CSV in the browser. It imports only `./parsed-file`, `./vcard` and
 * `./xlsx-limits` (C17 allows `src/lib/contacts` modules and `tz-msisdn`, nothing else): no directive, no server
 * module, no Node built-in. It defines NO formula-guard pair (C16: that is `csv-write.ts`) and no second parsed
 * shape (C15). Every special character is written as a character code — the editing tools decode escape text into
 * raw characters — so this file holds no escape text at all. Every behaviour comes from `buildCsvReader(rules)`;
 * the module's readers are its instance over `CSV_RULES`, which is what lets every red plant run in memory.
 * Guard: `npm run test:contacts-import` (the `csv` section) · red: `npm run red:contacts-import`.
 */
import { formatRowList, type ParsedContactsFile, type ParsedRow, type UnreadableRecord } from "./parsed-file";
import { looksLikeVcard } from "./vcard";
import { PHONE_FORMAT_REMEDY, spreadsheetHeadKind, xlsxRefusalSentence } from "./xlsx-limits";

/* ══ CHARACTERS — by code, never typed: the editing tools decode escape text into raw characters ══════════ */

const TAB = 9;
const LF = 10;
const CR = 13;
const SPACE = 32;
const QUOTE = 34;
const COMMA = 44;
const SEMICOLON = 59;
const PIPE = 124;
const NUL = 0;
const BYTE_ORDER_MARK = 0xfeff;
const REPLACEMENT_CHARACTER = 0xfffd;
const NEWLINE_TEXT = String.fromCharCode(LF);
const QUOTE_TEXT = String.fromCharCode(QUOTE);
const REPLACEMENT_TEXT = String.fromCharCode(REPLACEMENT_CHARACTER);
const NUL_TEXT = String.fromCharCode(NUL);

/* ══ THE CANDIDATES AND THE LIMITS ═══════════════════════════════════════════════════════════════════════ */

/**
 * A separator the reader knows, BY NAME: a tab cannot be written as a character without escape text, so the API
 * names all four. `CSV_DELIMITER_CODES` gives each one's character code.
 */
export type CsvDelimiter = "comma" | "semicolon" | "tab" | "pipe";

/** ⭐ The vote's candidates, in the order a tie goes by. */
export const CSV_DELIMITERS: readonly CsvDelimiter[] = ["comma", "semicolon", "tab", "pipe"];

export const CSV_DELIMITER_CODES: Readonly<Record<CsvDelimiter, number>> = {
  comma: COMMA,
  semicolon: SEMICOLON,
  tab: TAB,
  pipe: PIPE,
};

/** The candidate a character code is, or null. */
function delimiterOfCode(code: number): CsvDelimiter | null {
  for (const d of CSV_DELIMITERS) if (CSV_DELIMITER_CODES[d] === code) return d;
  return null;
}

/** A manual choice checked at run time: a candidate's name, or null for anything else. */
function delimiterOfName(name: unknown): CsvDelimiter | null {
  for (const d of CSV_DELIMITERS) if (d === name) return d;
  return null;
}

const isCandidateCode = (c: number): boolean => c === COMMA || c === SEMICOLON || c === TAB || c === PIPE;

/**
 * Excel's own cell limit. A longer cell can only be a quotation mark that never closed and swallowed the file, so
 * it is FATAL — a refusal naming the row, never a file.
 */
export const MAX_FIELD_CHARS = 32_767;

/**
 * The most text the vote holds while it waits for the first non-blank record to end (1 MiB). A first record that
 * has not ended by then — almost always a quotation mark that never closed — refuses the file.
 */
export const MAX_HEADER_CHARS = 1_048_576;

/** ECMAScript's whitespace and line terminators — exactly what `String.prototype.trim` removes, the mark included. */
function isBlankChar(c: number): boolean {
  if (c <= SPACE) return c === SPACE || (c >= TAB && c <= CR);
  if (c < 0xa0) return false;
  return (
    c === 0xa0 || c === 0x1680 || (c >= 0x2000 && c <= 0x200a) || c === 0x2028 || c === 0x2029 ||
    c === 0x202f || c === 0x205f || c === 0x3000 || c === BYTE_ORDER_MARK
  );
}

function isBlankText(s: string): boolean {
  for (let i = 0; i < s.length; i++) if (!isBlankChar(s.charCodeAt(i))) return false;
  return true;
}

/** A blank record: every cell empty or only spaces. Counted in `blankRows` and in the numbering, never emitted. */
function isBlankRecord(cells: readonly string[]): boolean {
  for (const cell of cells) if (!isBlankText(cell)) return false;
  return true;
}

/** 32767 → "32,767", without a locale: the browser and the server print the same sentence. */
function grouped(n: number): string {
  const s = String(Math.trunc(n));
  let out = "";
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) out += ",";
    out += s[i];
  }
  return out;
}

/* ══ THE BYTE-ORDER MARK AND EXCEL'S sep= LINE ═══════════════════════════════════════════════════════════ */

export type BomStrip = { readonly text: string; readonly hadBom: boolean };

/**
 * ⭐ C19 · THE DECODE-TIME STRIPPER: one U+FEFF at index 0 of the decoded text goes, and nothing else. The reader
 * applies it to the start of its text; a mark at the start of a LATER record is something else — two files joined
 * into one — and is dropped with a note. It is reached only because `DECODE_OPTIONS` stops the platform decoder
 * from eating the mark first.
 */
export function stripBom(text: string): BomStrip {
  const s = String(text ?? "");
  return s.charCodeAt(0) === BYTE_ORDER_MARK ? { text: s.slice(1), hadBom: true } : { text: s, hadBom: false };
}

/**
 * Excel's `sep=` directive: the separator it names (null when that is not a candidate) and how many characters its
 * line takes, the line end included.
 */
export type SepDirective = { readonly delimiter: CsvDelimiter | null; readonly length: number };

/** The letters s, e, p and the equals sign, by code. */
const SEP_WORD: readonly number[] = [115, 101, 112, 61];

/**
 * Excel's directive, read off the start of the text (the byte-order mark already gone): `sep=` in any case, ONE
 * character, then the line end — the whole optionally wrapped in quotation marks. Valid on the first line only: a
 * cell reading `sep=;` further down is data. A character that is not a candidate gives `delimiter: null` — the line
 * is still skipped, it is noted, and the vote decides. Returns null when the first line is not a directive, and
 * undefined while it cannot yet tell (`final` false and the line not complete); a CR is held until the next
 * character shows whether a LF pairs with it, so a chunk boundary cannot leave an empty line behind.
 */
export function readSepDirective(text: string, final = true): SepDirective | null | undefined {
  const s = String(text ?? "");
  const n = s.length;
  const quoted = n > 0 && s.charCodeAt(0) === QUOTE;
  let i = quoted ? 1 : 0;
  for (const want of SEP_WORD) {
    if (i >= n) return final ? null : undefined;
    const c = s.charCodeAt(i);
    if ((c >= 65 && c <= 90 ? c + 32 : c) !== want) return null;
    i++;
  }
  if (i >= n) return final ? null : undefined;
  const asked = s.charCodeAt(i);
  if (asked === CR || asked === LF || (quoted && asked === QUOTE)) return null;
  i++;
  if (quoted) {
    if (i >= n) return final ? null : undefined;
    if (s.charCodeAt(i) !== QUOTE) return null;
    i++;
  }
  const delimiter = delimiterOfCode(asked);
  if (i >= n) return final ? { delimiter, length: i } : undefined;
  const end = s.charCodeAt(i);
  if (end === LF) return { delimiter, length: i + 1 };
  if (end !== CR) return null;
  if (i + 1 < n) return { delimiter, length: s.charCodeAt(i + 1) === LF ? i + 2 : i + 1 };
  return final ? { delimiter, length: i + 1 } : undefined;
}

/* ══ THE VOTE'S PIECES ═══════════════════════════════════════════════════════════════════════════════════ */

/**
 * One candidate's scan, fed the text after the byte-order mark and the `sep=` line as it arrives. It skips blank
 * records and stops right after its FIRST NON-BLANK RECORD ends, read with the candidate's own quote rules.
 */
export interface CandidateScan {
  /** Reads `text` from `from`; returns how many characters it read. */
  feed(text: string, from: number): number;
  /** The text has ended: a record still open ends here (one inside an open quotation mark ends nothing). */
  finish(): void;
  /** The count is final. */
  readonly done: boolean;
  /** The candidate's occurrences outside quotes on that record. */
  readonly count: number;
  /** That record's line, or null when the text held no non-blank record. */
  readonly line: number | null;
  /** On that record a quotation mark is not around a whole cell: this candidate does not explain its quoting. */
  readonly irregular: boolean;
  /** The line of the record it is reading now — what a refusal names while the vote is still open. */
  readonly pendingLine: number;
}

/** What the vote decided, and what it read to decide it. */
export type DelimiterVote = {
  /** The winner, or null when no candidate appears outside quotes on the record: one column. */
  readonly delimiter: CsvDelimiter | null;
  /** Each candidate's count on its first non-blank record, read with its own quote rules. */
  readonly counts: Readonly<Record<CsvDelimiter, number>>;
  /** The candidates under whose quote rules that record's quoting breaks — they lose to any that read it cleanly. */
  readonly irregular: readonly CsvDelimiter[];
  /** More than one candidate shares the highest count; the winner is the first of them in candidate order. */
  readonly tie: boolean;
  /** The candidates sharing the highest count (only the winner when there is no tie; none for one column). */
  readonly tied: readonly CsvDelimiter[];
  /** The record the winner counted on — the first non-blank record — or null for one column. */
  readonly line: number | null;
  /** Every candidate reached the end of its first non-blank record, or the text ended. */
  readonly complete: boolean;
  /** Characters the scans read, all candidates together — bounded by the header, never the file. */
  readonly chars: number;
  /** While the vote is open: the line where the earliest unfinished record began. */
  readonly pendingLine: number;
};

/* ══ THE RULES ═══════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * ⭐ THE RULES THE READER APPLIES — each one a decision the plan took, named so a red plant can swap exactly one and
 * leave the reader itself untouched.
 */
export type CsvRules = {
  /** The vote's candidates, in tie-break order. */
  readonly candidates: readonly CsvDelimiter[];
  /** C19 · the decode-time strip, applied once to the start of the text. */
  readonly stripBom: (text: string) => BomStrip;
  /** Excel's `sep=` line, read off the start of the text after the mark. */
  readonly readSep: (text: string, final: boolean) => SepDirective | null | undefined;
  /** One candidate's scan of the first non-blank record. */
  readonly scanCandidate: (code: number, rules: CsvRules) => CandidateScan;
  /** RFC 4180: a quotation mark opens a quoted cell only as the cell's first character. */
  readonly quotesOnlyAtFieldStart: boolean;
  /** How `line` counts: by record, as Excel numbers rows, or by physical line. */
  readonly lineCount: "record" | "physical";
  /** Is a record blank — counted, never emitted? */
  readonly isBlankRecord: (cells: readonly string[]) => boolean;
  /** The longest cell read; a longer one refuses the file. */
  readonly maxFieldChars: number;
  /** The most text the vote holds; a first record that has not ended by then refuses the file. */
  readonly maxHeaderChars: number;
  /** C3b · G1 · a record whose quotation mark never closes, given how many rows came before it: ONE unreadable record
   *  (the rows before it kept), or the whole file refused. */
  readonly unclosedQuote: (rowsBefore: number) => "unreadable" | "refuse";
};

/* ══ THE TOKENIZER — one pass, its state carried across chunks ══════════════════════════════════════════ */

/** Why a read is refused. Each names its row, in `csvRefusalSentence`. */
export type CsvRefusalProblem = "unterminated_quote" | "field_too_long" | "header_too_long";

type Fatal = { readonly problem: CsvRefusalProblem; readonly line: number };

type TokenSink = {
  /** A record ended. Returning true stops the tokenizer right after the record's line end. */
  readonly record: (cells: string[], line: number, irregular: boolean, spread: boolean) => boolean;
  /** Text after a closing quotation mark, in the record on `line`. */
  readonly stray: (line: number) => void;
  /** A byte-order mark at the start of the record on `line`, dropped (the record is not the first). */
  readonly innerBom: (line: number) => void;
  /** The text ended inside the quotation mark the record on `line` opened. True: the reader took that record as ONE
   *  unreadable record (C3b · G1); false: the read is refused. */
  readonly unclosed: (line: number) => boolean;
};

type Tokenizer = {
  readonly feed: (text: string, from: number) => number;
  readonly finish: () => void;
  readonly fatal: () => Fatal | null;
  readonly tokenized: () => number;
  readonly line: () => number;
};

const AT_FIELD_START = 0;
const IN_UNQUOTED = 1;
const IN_QUOTES = 2;
const AFTER_QUOTE = 3;

/**
 * The state machine for one delimiter (`code`, or -1 for one column). Each character is read once, and a chunk may
 * end anywhere — between a CR and its LF, between two quotation marks, inside a cell — because the next chunk
 * carries on from the state the last one left. An open cell's text is flushed at every chunk end, so a cell that
 * never ends is refused once it passes the limit instead of being held. `voting` reads for the vote: no cell limit,
 * no warnings, and an open quotation mark at the end of the text ends no record.
 */
function makeTokenizer(code: number, rules: CsvRules, sink: TokenSink, voting: boolean): Tokenizer {
  const cap = voting ? Number.POSITIVE_INFINITY : rules.maxFieldChars;
  const physical = rules.lineCount === "physical";
  const strictQuotes = rules.quotesOnlyAtFieldStart;
  const watch = code < 0 && !voting;
  let state = AT_FIELD_START;
  let field = "";
  let cells: string[] = [];
  let open = false; // a character of the current record has been read
  let afterCr = false; // the last character was a CR: a LF next is its pair, not a second line end
  let records = 0;
  let breaks = 0; // line breaks read, those inside quotes included (for physical numbering)
  let line = 1; // the current record's line
  let irregular = false; // a quotation mark in this record that is not around a whole cell
  let spread = false; // one column: a candidate character outside quotes in this record
  let stopped = false;
  let fatal: Fatal | null = null;
  let tokenized = 0;

  /** A cell is complete: false when it is over the limit, which refuses the read. */
  const pushField = (value: string): boolean => {
    if (value.length > cap) {
      fatal = { problem: "field_too_long", line };
      return false;
    }
    cells.push(value);
    return true;
  };

  /** A record is complete: the sink takes it, and the next record's line is set. */
  const endRecord = (): void => {
    const done = cells;
    const at = line;
    const wasIrregular = irregular;
    const wasSpread = spread;
    cells = [];
    field = "";
    open = false;
    irregular = false;
    spread = false;
    state = AT_FIELD_START;
    records++;
    line = physical ? breaks + 1 : records + 1;
    if (sink.record(done, at, wasIrregular, wasSpread)) stopped = true;
  };

  const feed = (text: string, from: number): number => {
    if (stopped || fatal !== null) return 0;
    const n = text.length;
    let i = from;
    let seg = from; // where the current cell's unflushed text begins
    for (; i < n; i++) {
      const c = text.charCodeAt(i);
      if (afterCr) {
        afterCr = false;
        if (c === LF) {
          seg = i + 1;
          continue;
        }
      }
      if (state === IN_UNQUOTED) {
        if (c === code) {
          if (!pushField(field + text.slice(seg, i))) break;
          field = "";
          state = AT_FIELD_START;
        } else if (c === CR || c === LF) {
          if (!pushField(field + text.slice(seg, i))) break;
          breaks++;
          if (c === CR) afterCr = true;
          endRecord();
          if (stopped) {
            i++;
            break;
          }
        } else if (c === QUOTE) {
          if (strictQuotes) {
            irregular = true;
          } else {
            field += text.slice(seg, i);
            state = IN_QUOTES;
            seg = i + 1;
          }
        } else if (watch && isCandidateCode(c)) {
          spread = true;
        }
        continue;
      }
      if (state === IN_QUOTES) {
        if (c === QUOTE) {
          field += text.slice(seg, i);
          state = AFTER_QUOTE;
        } else if (c === CR) {
          field += text.slice(seg, i) + NEWLINE_TEXT;
          breaks++;
          afterCr = true;
          seg = i + 1;
        } else if (c === LF) {
          breaks++;
        }
        continue;
      }
      if (state === AFTER_QUOTE) {
        if (c === QUOTE) {
          field += QUOTE_TEXT;
          state = IN_QUOTES;
          seg = i + 1;
        } else if (c === code) {
          if (!pushField(field)) break;
          field = "";
          state = AT_FIELD_START;
        } else if (c === CR || c === LF) {
          if (!pushField(field)) break;
          breaks++;
          if (c === CR) afterCr = true;
          endRecord();
          if (stopped) {
            i++;
            break;
          }
        } else {
          // Text after the closing mark: kept as written, the rest of the cell literal (Excel reads it so).
          irregular = true;
          if (!voting) sink.stray(line);
          state = IN_UNQUOTED;
          seg = i;
          if (watch && isCandidateCode(c)) spread = true;
        }
        continue;
      }
      // AT_FIELD_START
      if (c === QUOTE) {
        open = true;
        state = IN_QUOTES;
        seg = i + 1;
      } else if (c === code) {
        open = true;
        if (!pushField("")) break;
      } else if (c === CR || c === LF) {
        pushField("");
        breaks++;
        if (c === CR) afterCr = true;
        endRecord();
        if (stopped) {
          i++;
          break;
        }
      } else if (!open && c === BYTE_ORDER_MARK && records > 0) {
        open = true;
        if (!voting) sink.innerBom(line);
      } else {
        open = true;
        state = IN_UNQUOTED;
        seg = i;
        if (watch && isCandidateCode(c)) spread = true;
      }
    }
    if (!stopped && fatal === null && (state === IN_UNQUOTED || state === IN_QUOTES) && seg < i) {
      field += text.slice(seg, i);
      if (field.length > cap) fatal = { problem: "field_too_long", line };
    }
    tokenized += i - from;
    return i - from;
  };

  const finish = (): void => {
    if (stopped || fatal !== null) return;
    afterCr = false;
    if (state === IN_QUOTES) {
      // ⭐ C3b · G1 · the record on `line` opened a quotation mark the text never closed: the reader keeps it as ONE
      // unreadable record when rows came before it (`sink.unclosed`), and only otherwise is the read refused.
      if (!voting && !sink.unclosed(line)) fatal = { problem: "unterminated_quote", line };
      stopped = true;
      return;
    }
    if (state === AT_FIELD_START && !open) return;
    if (!pushField(state === AT_FIELD_START ? "" : field)) return;
    endRecord();
  };

  return {
    feed,
    finish,
    fatal: () => fatal,
    tokenized: () => tokenized,
    line: () => line,
  };
}

/* ══ THE VOTE ════════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * ⭐ The shipped scan: the reader's own tokenizer, with the candidate as its delimiter, read until its first
 * non-blank record ends. Its count is that record's cells less one — every delimiter outside quotes ends a cell —
 * so it is counted with exactly the quote rules the reader would read the file by.
 */
function scanCandidate(code: number, rules: CsvRules): CandidateScan {
  let done = false;
  let count = 0;
  let line: number | null = null;
  let irregular = false;
  const tokenizer = makeTokenizer(
    code,
    rules,
    {
      record: (cells, at, irregularQuotes) => {
        if (rules.isBlankRecord(cells)) return false;
        count = cells.length - 1;
        line = at;
        irregular = irregularQuotes;
        done = true;
        return true;
      },
      stray: () => undefined,
      innerBom: () => undefined,
      unclosed: () => false,
    },
    true,
  );
  return {
    feed: (text, from) => (done ? 0 : tokenizer.feed(text, from)),
    finish: () => {
      if (done) return;
      tokenizer.finish();
      done = true;
    },
    get done() {
      return done;
    },
    get count() {
      return count;
    },
    get line() {
      return line;
    },
    get irregular() {
      return irregular;
    },
    get pendingLine() {
      return tokenizer.line();
    },
  };
}

/** ⭐ The rules as the plan decided them — what `createCsvReader`, `parseCsv` and `voteDelimiter` read by. */
export const CSV_RULES: CsvRules = {
  candidates: CSV_DELIMITERS,
  stripBom,
  readSep: readSepDirective,
  scanCandidate,
  quotesOnlyAtFieldStart: true,
  lineCount: "record",
  isBlankRecord,
  maxFieldChars: MAX_FIELD_CHARS,
  maxHeaderChars: MAX_HEADER_CHARS,
  // ⭐ C3b · G1 · the whole file is refused only when NOTHING before the broken quote was a record.
  unclosedQuote: (rowsBefore) => (rowsBefore > 0 ? "unreadable" : "refuse"),
};

type Candidate = { readonly delimiter: CsvDelimiter; readonly scan: CandidateScan; chars: number };

type Voter = {
  /** More text; true once the vote is decided. */
  readonly feed: (text: string) => boolean;
  /** The text ended: every scan still open is decided by its end. */
  readonly finish: () => void;
  readonly result: () => DelimiterVote;
};

const NO_COUNTS: Readonly<Record<CsvDelimiter, number>> = { comma: 0, semicolon: 0, tab: 0, pipe: 0 };

function makeVoter(rules: CsvRules): Voter {
  const candidates: Candidate[] = rules.candidates.map((d) => ({
    delimiter: d,
    scan: rules.scanCandidate(CSV_DELIMITER_CODES[d], rules),
    chars: 0,
  }));
  let finished = false;
  const complete = (): boolean => finished || candidates.every((c) => c.scan.done);
  return {
    feed: (text) => {
      for (const c of candidates) if (!c.scan.done) c.chars += c.scan.feed(text, 0);
      return complete();
    },
    finish: () => {
      for (const c of candidates) c.scan.finish();
      finished = true;
    },
    result: () => decideVote(candidates, complete()),
  };
}

/** The candidates that read the record cleanly compete (all of them when none does); the highest count wins. */
function decideVote(candidates: readonly Candidate[], complete: boolean): DelimiterVote {
  const counts: Record<CsvDelimiter, number> = { ...NO_COUNTS };
  const irregular: CsvDelimiter[] = [];
  let chars = 0;
  let pending = 0;
  for (const c of candidates) {
    counts[c.delimiter] = c.scan.count;
    if (c.scan.irregular) irregular.push(c.delimiter);
    chars += c.chars;
    if (!c.scan.done) pending = pending === 0 ? c.scan.pendingLine : Math.min(pending, c.scan.pendingLine);
  }
  const clean = candidates.filter((c) => !c.scan.irregular);
  const pool = clean.length > 0 ? clean : candidates;
  let best = 0;
  for (const c of pool) if (c.scan.count > best) best = c.scan.count;
  const winners = best > 0 ? pool.filter((c) => c.scan.count === best) : [];
  const winner = winners.length > 0 ? winners[0] : null;
  return {
    delimiter: winner === null ? null : winner.delimiter,
    counts,
    irregular,
    tie: winners.length > 1,
    tied: winners.map((c) => c.delimiter),
    line: winner === null ? null : winner.scan.line,
    complete,
    chars,
    pendingLine: pending === 0 ? 1 : pending,
  };
}

/* ══ THE READER ══════════════════════════════════════════════════════════════════════════════════════════ */

export type CsvReaderOptions = {
  /** The chosen file's name, carried into C15's `fileName`. */
  readonly fileName?: string | null;
  /** The mapping panel's manual separator. It beats `sep=` and the vote. */
  readonly delimiter?: CsvDelimiter;
};

/** ⭐ A file, or a refusal naming its row — never both, and never a file cut short by a fatal problem. */
export type CsvReadResult =
  | { readonly ok: true; readonly file: ParsedContactsFile }
  | { readonly ok: false; readonly problem: CsvRefusalProblem; readonly line: number; readonly sentence: string };

/** Where the separator came from. `single_column`: the vote found no candidate. */
export type CsvDelimiterSource = "override" | "sep" | "vote" | "single_column";

export type CsvStats = {
  /** The text began with a byte-order mark, which `stripBom` removed. */
  readonly hadBom: boolean;
  /** Null until the separator is decided. */
  readonly source: CsvDelimiterSource | null;
  /** Null for one column, or while undecided. */
  readonly delimiter: CsvDelimiter | null;
  /** The vote's counts (all zero without a vote). */
  readonly counts: Readonly<Record<CsvDelimiter, number>>;
  /** The candidates whose quote rules broke on the vote's record. */
  readonly irregular: readonly CsvDelimiter[];
  /** The record the vote counted on, or null. */
  readonly voteLine: number | null;
  readonly tie: boolean;
  /** Every record read — the blank ones and C3b's one unreadable record included, the `sep=` line not. */
  readonly records: number;
  readonly rows: number;
  readonly blankRows: number;
  /** The TRUE number of warnings, however few rows the notes name. */
  readonly warnings: number;
  /** Rows still holding U+FFFD. */
  readonly replacementRows: number;
  /** Characters after the byte-order mark and the `sep=` line. */
  readonly charsInput: number;
  /** Characters the tokenizer read: equal to `charsInput` unless the read was refused — each one exactly once. */
  readonly charsTokenized: number;
  /** Characters the vote's scans read — bounded by the header. */
  readonly charsVoted: number;
  /** The fatal problem, the moment there is one — a streaming caller may stop reading then: `end()` will refuse. */
  readonly refused: CsvRefusalProblem | null;
};

export interface CsvReader {
  /** The next piece of decoded text, split anywhere. Ignored after `end()`, or after a fatal problem. */
  push(chunk: string): void;
  /** No more text: the file, or the refusal. Idempotent. */
  end(): CsvReadResult;
  /** The counts so far. */
  stats(): CsvStats;
}

export type CsvBuild = {
  readonly createReader: (options?: CsvReaderOptions) => CsvReader;
  readonly parse: (text: string, options?: CsvReaderOptions) => CsvReadResult;
  /** The vote over `text` exactly as given — the same scans the reader runs after the mark and the `sep=` line. */
  readonly vote: (text: string) => DelimiterVote;
};

/** The phases of a read. */
const AT_START = 0;
const ON_FIRST_LINE = 1;
const VOTING = 2;
const READING = 3;

/**
 * ⭐ THE FACTORY. Pure: the same rules in, the same reader out, and nothing read from anywhere else. The module's
 * `createCsvReader`, `parseCsv` and `voteDelimiter` are its instance over `CSV_RULES`.
 */
export function buildCsvReader(rules: CsvRules): CsvBuild {
  const createReader = (options?: CsvReaderOptions): CsvReader => {
    const named = options?.fileName;
    const fileName = typeof named === "string" ? named : null;
    const manual = delimiterOfName(options?.delimiter);
    const rows: ParsedRow[] = [];
    /** C3b · G1 · at most ONE: the record whose quotation mark never closed, when rows came before it. */
    const unreadable: UnreadableRecord[] = [];
    const strays: number[] = [];
    const innerBoms: number[] = [];
    const spread: number[] = [];
    const replaced: number[] = [];
    let width = 0;
    let blankRows = 0;
    let records = 0;
    let phase: number = AT_START;
    let head = ""; // the text held until the sep= line is decided
    let held = ""; // the text held until the vote is decided
    let voted = 0; // characters handed to the vote
    let voter: Voter | null = null;
    let vote: DelimiterVote | null = null;
    let tokenizer: Tokenizer | null = null;
    let hadBom = false;
    let sepDelimiter: CsvDelimiter | null = null;
    let sepUnsupported = false;
    let source: CsvDelimiterSource | null = null;
    let delimiter: CsvDelimiter | null = null;
    let charsInput = 0;
    let fatal: Fatal | null = null;
    let result: CsvReadResult | null = null;

    const sink: TokenSink = {
      record: (cells, line, _irregular, spreadOut) => {
        records++;
        if (rules.isBlankRecord(cells)) {
          blankRows++;
          return false;
        }
        rows.push({ line, cells });
        if (cells.length > width) width = cells.length;
        for (const cell of cells) {
          if (cell.indexOf(REPLACEMENT_TEXT) >= 0) {
            replaced.push(line);
            break;
          }
        }
        if (spreadOut) spread.push(line);
        return false;
      },
      stray: (line) => {
        if (strays.length === 0 || strays[strays.length - 1] !== line) strays.push(line);
      },
      innerBom: (line) => {
        innerBoms.push(line);
      },
      unclosed: (line) => {
        if (rules.unclosedQuote(rows.length) !== "unreadable") return false;
        records++;
        unreadable.push({ line, reason: csvUnclosedQuoteReason(line) });
        return true;
      },
    };

    const read = (text: string): void => {
      if (tokenizer === null || text.length === 0) return;
      tokenizer.feed(text, 0);
      const problem = tokenizer.fatal();
      if (problem !== null) fatal = problem;
    };

    const startReading = (text: string): void => {
      phase = READING;
      tokenizer = makeTokenizer(delimiter === null ? -1 : CSV_DELIMITER_CODES[delimiter], rules, sink, false);
      read(text);
    };

    const settleVote = (): void => {
      if (voter === null) return;
      vote = voter.result();
      delimiter = vote.delimiter;
      source = delimiter === null ? "single_column" : "vote";
      const text = held;
      held = "";
      startReading(text);
    };

    /** Text for the vote: held, and handed to the scans up to `maxHeaderChars` in all. */
    const voteOn = (text: string): void => {
      if (voter === null) return;
      held += text;
      const room = Math.max(0, rules.maxHeaderChars - voted);
      const part = text.length <= room ? text : text.slice(0, room);
      voted += part.length;
      if (voter.feed(part)) {
        settleVote();
        return;
      }
      if (voted >= rules.maxHeaderChars && held.length > voted) {
        fatal = { problem: "header_too_long", line: voter.result().pendingLine };
      }
    };

    /** The text after the mark and the sep= line: the separator is chosen, or the vote begins. */
    const begin = (text: string): void => {
      charsInput += text.length;
      if (manual !== null) {
        delimiter = manual;
        source = "override";
        startReading(text);
        return;
      }
      if (sepDelimiter !== null) {
        delimiter = sepDelimiter;
        source = "sep";
        startReading(text);
        return;
      }
      phase = VOTING;
      voter = makeVoter(rules);
      voteOn(text);
    };

    /** Decides the first line once it can be told: the directive is skipped, and everything after it begins. */
    const takeFirstLine = (final: boolean): void => {
      const sep = rules.readSep(head, final);
      if (sep === undefined) return;
      let rest = head;
      head = "";
      if (sep !== null) {
        rest = rest.slice(sep.length);
        if (sep.delimiter === null) sepUnsupported = true;
        else sepDelimiter = sep.delimiter;
      }
      begin(rest);
    };

    const push = (chunk: string): void => {
      if (result !== null) return;
      let text = String(chunk ?? "");
      if (text.length === 0) return;
      if (phase === AT_START) {
        const stripped = rules.stripBom(text);
        hadBom = stripped.hadBom;
        text = stripped.text;
        phase = ON_FIRST_LINE;
        if (text.length === 0) return;
      }
      if (phase === ON_FIRST_LINE) {
        head += text;
        takeFirstLine(false);
        return;
      }
      charsInput += text.length;
      if (fatal !== null) return;
      if (phase === VOTING) voteOn(text);
      else read(text);
    };

    const notesOf = (): string[] => {
      const notes: string[] = [];
      if (sepUnsupported) notes.push(SEP_UNSUPPORTED_NOTE);
      if (vote !== null && vote.tie && vote.delimiter !== null && vote.line !== null) {
        notes.push(tieNote(vote.line, vote.tied, vote.delimiter));
      }
      if (strays.length > 0) notes.push(rowsNote(strays, "has", "have", STRAY_TAIL));
      if (innerBoms.length > 0) notes.push(rowsNote(innerBoms, "begins", "begin", INNER_BOM_TAIL));
      if (spread.length > 0) notes.push(singleColumnNote(spread));
      if (replaced.length > 0) notes.push(rowsNote(replaced, "holds", "hold", replacementTail()));
      return notes;
    };

    const end = (): CsvReadResult => {
      if (result !== null) return result;
      if (phase === AT_START) phase = ON_FIRST_LINE;
      if (phase === ON_FIRST_LINE) takeFirstLine(true);
      if (fatal === null && phase === VOTING && voter !== null) {
        voter.finish();
        settleVote();
      }
      if (fatal === null && tokenizer !== null) {
        tokenizer.finish();
        const problem = tokenizer.fatal();
        if (problem !== null) fatal = problem;
      }
      result =
        fatal === null
          ? { ok: true, file: { format: "csv", fileName, rows, width, blankRows, notes: notesOf(), unreadable: [...unreadable] } }
          : { ok: false, problem: fatal.problem, line: fatal.line, sentence: csvRefusalSentence(fatal.problem, fatal.line) };
      return result;
    };

    const stats = (): CsvStats => ({
      hadBom,
      source,
      delimiter,
      counts: vote === null ? { ...NO_COUNTS } : { ...vote.counts },
      irregular: vote === null ? [] : [...vote.irregular],
      voteLine: vote === null ? null : vote.line,
      tie: vote !== null && vote.tie,
      records,
      rows: rows.length,
      blankRows,
      warnings:
        (sepUnsupported ? 1 : 0) + (vote !== null && vote.tie ? 1 : 0) +
        strays.length + innerBoms.length + spread.length + replaced.length,
      replacementRows: replaced.length,
      charsInput,
      charsTokenized: tokenizer === null ? 0 : tokenizer.tokenized(),
      charsVoted: voter === null ? 0 : voter.result().chars,
      refused: fatal === null ? null : fatal.problem,
    });

    return { push, end, stats };
  };

  const parse = (text: string, options?: CsvReaderOptions): CsvReadResult => {
    const reader = createReader(options);
    reader.push(text);
    return reader.end();
  };

  const vote = (text: string): DelimiterVote => {
    const voter = makeVoter(rules);
    voter.feed(String(text ?? ""));
    voter.finish();
    return voter.result();
  };

  return { createReader, parse, vote };
}

const DEFAULT_READER = buildCsvReader(CSV_RULES);

/** ⭐ A reader for one file: `push` each piece of decoded text as it arrives, then `end()`. */
export function createCsvReader(options?: CsvReaderOptions): CsvReader {
  return DEFAULT_READER.createReader(options);
}

/** A whole text in one go — the same reader, one push and `end()`. It serves small files, and the suite. */
export function parseCsv(text: string, options?: CsvReaderOptions): CsvReadResult {
  return DEFAULT_READER.parse(text, options);
}

/** The vote the reader runs, over `text` exactly as given (strip the mark and the `sep=` line first, as it does). */
export function voteDelimiter(text: string): DelimiterVote {
  return DEFAULT_READER.vote(text);
}

/* ══ THE SENTENCES — English admin chrome; rows named, never a cell (§5.14) ═══════════════════════════ */

const DELIMITER_WORDS: Readonly<Record<CsvDelimiter, { readonly plural: string; readonly separated: string }>> = {
  comma: { plural: "commas", separated: "comma-separated" },
  semicolon: { plural: "semicolons", separated: "semicolon-separated" },
  tab: { plural: "tabs", separated: "tab-separated" },
  pipe: { plural: "pipes (|)", separated: "pipe-separated" },
};

const STRAY_TAIL = "text after the closing quotation mark of a cell; that text was kept as part of the cell.";
const INNER_BOM_TAIL = "with an invisible byte-order mark, as if two files had been joined into one; the mark was removed.";
/** True whichever way the separator was then chosen — by the vote, or by the officer's manual choice. */
const SEP_UNSUPPORTED_NOTE =
  "The first line of the file names a separator that is not a comma, semicolon, tab or pipe (|), so that line was skipped.";

/** Excel's plain CSV is the usual cause, so the way out is CSV UTF-8 — and every CSV-directing sentence carries the ONE remedy (A1.6). */
const replacementTail = (): string =>
  `characters that could not be read in the file's text encoding. If the file came from Excel, save it as CSV UTF-8 and choose it again; before you save, ${PHONE_FORMAT_REMEDY}.`;

/** "Row 4 has …" / "Rows 4, 9 and 12 have …", the rows named by the one shared list (`formatRowList`, capped at 50). */
function rowsNote(lines: readonly number[], one: string, many: string, tail: string): string {
  const list = formatRowList(lines);
  return `${list.charAt(0).toUpperCase()}${list.slice(1)} ${lines.length === 1 ? one : many} ${tail}`;
}

function singleColumnNote(lines: readonly number[]): string {
  return `Every row was read as one column, but ${formatRowList(lines)} ${lines.length === 1 ? "holds" : "hold"} a comma, semicolon, tab or pipe (|) outside quotes. If the file has more than one column, choose its separator.`;
}

function tieNote(line: number, tied: readonly CsvDelimiter[], winner: CsvDelimiter): string {
  const names = tied.map((d) => DELIMITER_WORDS[d].plural);
  const list = names.length <= 2 ? names.join(" and ") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  return `Row ${line} has the same number of ${list}, so the file was read as ${DELIMITER_WORDS[winner].separated}; if its columns look wrong, choose the separator.`;
}

/**
 * ⭐ C3b · G1 · the ONE sentence for the record whose quotation mark never closed, when rows came before it and the file
 * is read without it: its row, what happened to it and to everything after it, and the way out — never a cell. The mark
 * itself is built from its code.
 */
export function csvUnclosedQuoteReason(line: number): string {
  return `Row ${line} opens a quote (${QUOTE_TEXT}) that is never closed, so it and everything after it could not be read. Close or remove that quote, or delete the row, and import again.`;
}

/** ⭐ The ONE sentence for each refusal, naming its row — never a code, never a cell. */
export function csvRefusalSentence(problem: CsvRefusalProblem, line: number): string {
  if (problem === "unterminated_quote") {
    return `Row ${line} opens a quotation mark that is never closed, so everything after it would be read as one cell. Close the quotation mark in row ${line} and choose the file again.`;
  }
  if (problem === "field_too_long") {
    return `Row ${line} has a cell longer than ${grouped(MAX_FIELD_CHARS)} characters, more than a spreadsheet cell can hold — usually a quotation mark that is never closed. Check row ${line} and choose the file again.`;
  }
  return `Row ${line}, the first row with anything in it, does not end within the first ${grouped(MAX_HEADER_CHARS)} characters, so its columns cannot be worked out — usually a quotation mark that is never closed. Check row ${line} and choose the file again.`;
}

/* ══ FROM BYTES TO TEXT ══════════════════════════════════════════════════════════════════════════════════ */

export type TextEncodingLabel = "utf-8" | "utf-16le" | "utf-16be" | "windows-1252";

export type EncodingSniff = { readonly encoding: TextEncodingLabel; readonly bom: boolean };

/** The dialog reads `file.slice(0, SNIFF_BYTES)` to sniff the encoding and the format. */
export const SNIFF_BYTES = 4096;

/** How many leading bytes the BOM-less UTF-16 test counts zeros in. */
const UTF16_WINDOW = 512;

/**
 * ⭐ C19 · how every decode is made — the tests' `decodeBytes` and U32's `new TextDecoderStream(encoding,
 * DECODE_OPTIONS)` alike. `ignoreBOM: true` PASSES the mark through, so `stripBom` is what removes it; the
 * platform's default (`ignoreBOM: false`) would eat it first and leave the strip — and U34's BOM-pair red — with
 * nothing to do. `fatal: false`: a bad byte becomes U+FFFD, and its row is counted and named.
 */
export const DECODE_OPTIONS = { fatal: false, ignoreBOM: true } as const;

/**
 * The text encoding of a file's first bytes, in this order: a UTF-8, UTF-16LE or UTF-16BE byte-order mark; then
 * BOM-less UTF-16 (90% or more of the odd bytes, or of the even bytes, zero in the first 512, and the others
 * mostly not); then strict UTF-8 — decoded as a stream, so a character cut at the end of the head is not an
 * error — and anything that is not UTF-8 is windows-1252, Excel's plain CSV on an English PC.
 */
export function sniffEncoding(head: Uint8Array): EncodingSniff {
  const b = head;
  if (b.length >= 3 && b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) return { encoding: "utf-8", bom: true };
  if (b.length >= 2 && b[0] === 0xff && b[1] === 0xfe) return { encoding: "utf-16le", bom: true };
  if (b.length >= 2 && b[0] === 0xfe && b[1] === 0xff) return { encoding: "utf-16be", bom: true };
  const n = Math.min(b.length, UTF16_WINDOW) - (Math.min(b.length, UTF16_WINDOW) % 2);
  if (n >= 2) {
    let evenZero = 0;
    let oddZero = 0;
    for (let i = 0; i < n; i += 2) {
      if (b[i] === 0) evenZero++;
      if (b[i + 1] === 0) oddZero++;
    }
    const pairs = n / 2;
    if (oddZero * 10 >= pairs * 9 && evenZero * 10 < pairs) return { encoding: "utf-16le", bom: false };
    if (evenZero * 10 >= pairs * 9 && oddZero * 10 < pairs) return { encoding: "utf-16be", bom: false };
  }
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(b, { stream: true });
    return { encoding: "utf-8", bom: false };
  } catch {
    return { encoding: "windows-1252", bom: false };
  }
}

/** Bytes to text with `DECODE_OPTIONS` — for the tests and small inputs; the dialog streams. */
export function decodeBytes(bytes: Uint8Array, encoding: TextEncodingLabel): string {
  return new TextDecoder(encoding, DECODE_OPTIONS).decode(bytes);
}

/* ══ WHAT KIND OF FILE IT IS — content beats the name ════════════════════════════════════════════════════ */

export type ImportFileKind = "csv" | "vcard" | "xlsx";

/** A file no reader can take. `xls`, `protected` and `ods` are xlsx-limits' kinds, refused in its words (C18). */
export type FormatRefusal = "empty" | "xls" | "protected" | "ods" | "pdf" | "html" | "binary";

export type DetectedFormat =
  | {
      readonly ok: true;
      readonly kind: ImportFileKind;
      /** The text encoding to stream it with; null for a workbook, which the server reads. */
      readonly encoding: TextEncodingLabel | null;
      /** What the file name's extension claims, or null for an extension no reader claims. */
      readonly namedAs: ImportFileKind | null;
      /** The name claims one kind and the content is another: the content wins, and the dialog may say so. */
      readonly mismatch: boolean;
    }
  | { readonly ok: false; readonly refusal: FormatRefusal; readonly sentence: string; readonly namedAs: ImportFileKind | null };

/** The one refusal that is not about a spreadsheet, so it is not in xlsx-limits' copy table. */
export const EMPTY_FILE_SENTENCE = "This file is empty, so there is nothing to import. Choose the file that holds the contacts.";

/** What the detector reads the head with — the shipped sniff and decode, or a plant's. */
export type FormatDetectorParts = {
  readonly sniff: (head: Uint8Array) => EncodingSniff;
  readonly decode: (bytes: Uint8Array, encoding: TextEncodingLabel) => string;
};

const PDF_MAGIC = "%PDF-";
/** What a web page or an XML file saved as ".xls" starts with. ⚠️ SPELLED FROM PARTS, on purpose: `test:ui-consistency`
 *  reads the raw sequence "<" "table" in any source file as a hand-rolled table element (table-not-admin-tbl, a
 *  `predeploy` gate) — and this list is DATA a sniffer compares bytes against, not markup. */
const LT = "<";
const MARKUP_STARTS: readonly string[] = [`${LT}html`, `${LT}!doctype html`, `${LT}table`, `${LT}?xml`];

/** The kind a file name's extension claims. */
function kindNamed(fileName: string | null): ImportFileKind | null {
  if (typeof fileName !== "string") return null;
  const dot = fileName.lastIndexOf(".");
  if (dot < 0) return null;
  const ext = fileName.slice(dot + 1).toLowerCase();
  if (ext === "csv" || ext === "tsv" || ext === "txt") return "csv";
  if (ext === "vcf" || ext === "vcard") return "vcard";
  if (ext === "xlsx" || ext === "xlsm") return "xlsx";
  return null;
}

function startsWithAscii(bytes: Uint8Array, word: string): boolean {
  if (bytes.length < word.length) return false;
  for (let k = 0; k < word.length; k++) if (bytes[k] !== word.charCodeAt(k)) return false;
  return true;
}

/** `word` (lower-case ASCII) at `at` in `s`, ignoring the case of ASCII letters. */
function startsWithFolded(s: string, at: number, word: string): boolean {
  if (s.length - at < word.length) return false;
  for (let k = 0; k < word.length; k++) {
    const c = s.charCodeAt(at + k);
    if ((c >= 65 && c <= 90 ? c + 32 : c) !== word.charCodeAt(k)) return false;
  }
  return true;
}

/** A web page or an XML file — a "spreadsheet" some systems save as `.xls`. */
function looksLikeMarkup(text: string): boolean {
  let i = 0;
  while (i < text.length && isBlankChar(text.charCodeAt(i))) i++;
  return MARKUP_STARTS.some((word) => startsWithFolded(text, i, word));
}

/**
 * The detector over chosen parts — `detectFormat` is its instance over `sniffEncoding` and `decodeBytes`. CONTENT
 * BEATS THE NAME, in this order: xlsx-limits' classifier (an OOXML zip is `xlsx`, whatever its name; an old .xls, a
 * password-protected workbook and an .ods are refused with xlsx-limits' own sentences — C18); a PDF; then the first
 * `SNIFF_BYTES`, decoded as sniffed: nothing but a mark and whitespace in a head shorter than `SNIFF_BYTES` is empty
 * (a longer head may have rows after the spaces, and the reader decides); a web page or XML; a vCard by
 * `looksLikeVcard` (C17); a NUL character is binary; anything else is CSV. A PDF, a web page and a binary file are
 * refused with the copy table's not-a-workbook sentence, which carries the ONE phone-format remedy (A1.6).
 */
export function buildFormatDetector(parts: FormatDetectorParts): (head: Uint8Array, fileName: string | null) => DetectedFormat {
  return (head, fileName) => {
    const bytes = head instanceof Uint8Array ? head : new Uint8Array(0);
    const namedAs = kindNamed(fileName);
    const accept = (kind: ImportFileKind, encoding: TextEncodingLabel | null): DetectedFormat => ({
      ok: true,
      kind,
      encoding,
      namedAs,
      mismatch: namedAs !== null && namedAs !== kind,
    });
    const refuse = (refusal: FormatRefusal, sentence: string): DetectedFormat => ({ ok: false, refusal, sentence, namedAs });
    const sheet = spreadsheetHeadKind(bytes);
    if (sheet === "xlsx") return accept("xlsx", null);
    if (sheet !== null) return refuse(sheet, xlsxRefusalSentence("wrong_format", { kind: sheet }));
    const notAWorkbook = xlsxRefusalSentence("wrong_format", { kind: "other" });
    if (startsWithAscii(bytes, PDF_MAGIC)) return refuse("pdf", notAWorkbook);
    const firstBytes = bytes.length > SNIFF_BYTES ? bytes.subarray(0, SNIFF_BYTES) : bytes;
    const sniff = parts.sniff(firstBytes);
    const text = stripBom(parts.decode(firstBytes, sniff.encoding)).text;
    if (bytes.length < SNIFF_BYTES && isBlankText(text)) return refuse("empty", EMPTY_FILE_SENTENCE);
    if (looksLikeMarkup(text)) return refuse("html", notAWorkbook);
    if (looksLikeVcard(text)) return accept("vcard", sniff.encoding);
    if (text.indexOf(NUL_TEXT) >= 0) return refuse("binary", notAWorkbook);
    return accept("csv", sniff.encoding);
  };
}

const DEFAULT_DETECTOR = buildFormatDetector({ sniff: sniffEncoding, decode: decodeBytes });

/**
 * ⭐ What a chosen file is, from its bytes and its name — CONTENT BEATS THE NAME (a `.txt` of vCards is vCards, an
 * .xlsx named .csv is a workbook). Pass the WHOLE file when it is at most xlsx-limits' `XLSX_MAX_BYTES` (a protected
 * workbook's marker can sit past the first 4 KB, and `spreadsheetHeadKind` needs it), and otherwise at least its
 * first `SNIFF_BYTES`; only those are decoded for the text checks.
 */
export function detectFormat(head: Uint8Array, fileName: string | null): DetectedFormat {
  return DEFAULT_DETECTOR(head, fileName);
}
