/**
 * THE IMPORT'S READER — a chosen file, or a paste, becomes C15's ONE shape in the browser.
 *                                                (S15 · C3, 2026-10-09 · docs/CONTACTS-SCREEN-PLAN.md §4.2 steps 2–4)
 *
 * ⭐ ONE DOOR FOR EVERY SOURCE. The import dialog hands this module a `File` (picked or dropped) or the text of the paste
 * box and gets back C15's `ParsedContactsFile` with the file's sha-256 — or, for an Excel workbook, the bytes the server
 * reads (U27b) — or ONE sentence that says what is wrong and what to do. It reads; it never decides a row: every verdict
 * on a number, a field or a repeat is the server's (U29's `draftContactRow`, the check, decide()).
 *
 * ⛔ STREAMED, NEVER READ-THEN-SPLIT (§3c.2). A CSV or a vCard goes through `File.stream()`, a byte counter, a
 * `TextDecoderStream` in the sniffed encoding with `DECODE_OPTIONS` (or a `TextDecoder` in stream mode where the platform
 * has no stream decoder for it), and U25's or U26's push reader, one chunk at a time — 40 rows and 150,000 rows take the
 * same path, and the bar moves on bytes actually read. A CSV the reader has already refused stops being read at once.
 * ⛔ A RECORD COUNT PAST THE RUN'S CAP STOPS THE READ (crash control): a file of a million rows is not held in the
 * browser only for the server to refuse it — `READ_TOO_MANY_ROWS` says so, and how to split the file.
 * ⛔ AN EXCEL FILE OVER THE CAP IS REFUSED BEFORE A BYTE IS UPLOADED, in xlsx-limits' own words (C18), and so is every
 * file no reader takes (an old .xls, an .ods, a protected workbook, a PDF, a picture, an Apple Numbers file) — each
 * sentence names the format and the way to save it as .xlsx or CSV. CONTENT BEATS THE NAME (`detectFormat`).
 *
 * ⭐ THE PASTE (U30). Text holding a tab is an Excel or Sheets copy: read by U25's own reader with the tab as the
 * separator (quoted cells and line breaks inside them as Excel writes them), the first row header-matched like any file
 * — and a quotation mark that never closes splits the paste by hand instead (C3b: a paste is never cut by U25's one
 * unreadable record). Text with no tab is a LIST — a chat, a phone's share, a typed list: each line is one contact, its
 * first phone number the Phone cell and the rest of the line the Name cell. A line with no number is listed as unreadable
 * with its row; a line with a second number keeps the first and the paste's note names those rows (S15-4). ⭐ "First" is
 * the first Tanzanian mobile number on the line, chosen by the ONE phone-cell rule (`firstMobileIndex`,
 * `phone-cell.ts` — the staging's and the check's rule too): one person, one number.
 * ⭐ C3b · G4 · SEVERAL PHONE COLUMNS. A file whose header carries two or more phone columns — any U28 reads as Phone,
 * Outlook's Business / Home / Primary / Car / Other Phone, Google's Phone 2 - Value — and in which some row holds its
 * Tanzanian mobile ONLY outside the main Phone column gains ONE column, "Phone (first mobile of: …)", read as Phone:
 * each row's first cell among those columns (the main one first) that holds a Tanzanian mobile (`firstMobileIn`), else
 * the main column's own cell, so a row with no mobile anywhere reads exactly as before. The original columns stay on the
 * panel as "Not used", each saying why; the server stays unchanged — the new column is one more cell (`mappingFor`).
 * ⭐ S15-5 · A FILE WITH NO HEADER ROW IS READ, NOT REFUSED. When the first row reads as a contact (`headerless`),
 * `mappingFor` names the columns "Column A", "Column B"… (the letters the officer's spreadsheet shows them by), finds the
 * phone column — the one whose cells most often parse as a Tanzanian mobile number — and the name and email columns by
 * their shape, and stages from the first row. The officer sees it said and can change any column.
 * ⛔ NO NUMBER IS SHOWN WHOLE (§5.14, OD25). `previewCell` is the mapping panel's ONLY way to a cell: a number becomes
 * `maskPhone`'s `+255••••NN`, and any other run of nine digits inside text becomes four bullets and its last two.
 *
 * ⛔ PURE AND CLIENT-SAFE: it imports src/lib/contacts modules, `tz-msisdn` and `phone-normalize` — no React, no
 * directive, no src/lib/server, no src/app, no Node built-in (`test:contacts-boundary` §2 · `test:client-graph-safe`).
 * Its sentences are a READER's (notes and refusals about a file, like U25's and U26's): they name rows, never a cell.
 * ⛔ No control character and no escape text is typed in this file: every special character is built from its code.
 * Guard: `scripts/contacts-import/flow.mts` (section "flow").
 */
import { formatRowList, type ParsedContactsFile, type ParsedRow, type UnreadableRecord } from "./parsed-file";
import { DECODE_OPTIONS, createCsvReader, detectFormat, parseCsv, stripBom, type TextEncodingLabel } from "./import-parse";
import { createVcardReader } from "./vcard";
import { XLSX_MAX_BYTES, spreadsheetHeadKind, xlsxRefusalSentence } from "./xlsx-limits";
import {
  CONTACT_FIELDS, autoMapFile, matchHeader, normaliseHeader, scrubPhoneRuns,
  type AutoMapResult, type ColumnMapping, type ImportFieldKey, type MappedColumn,
} from "./contact-fields";
import { IMPORT_MAX_ROWS } from "./import-limits";
import { firstMobileIn, firstMobileIndex, phoneCellParts } from "./phone-cell";
import { isSendableTzNumber, parseTzNumber, readAsciiDigits } from "../tz-msisdn";
import { maskPhone } from "../phone-normalize";

/* ══ CHARACTERS — by code, never typed ════════════════════════════════════════════════════════════ */

const TAB = String.fromCharCode(9);
const LF = String.fromCharCode(10);
const CR = String.fromCharCode(13);
/** CRLF, a lone CR (old Mac Excel) and LF each end a pasted line. */
const LINE_BREAK = new RegExp(`${CR}${LF}|${CR}|${LF}`);
const SPACE = 32;
const PLUS = 43;
const OPEN_PAREN = 40;
const CLOSE_PAREN = 41;
const OPEN_BRACKET = 91;
const CLOSE_BRACKET = 93;
const FULL_STOP = 46;
/** What may stand between two digit groups of one number: spaces (the no-break ones too), a full stop, every dash and
 *  the brackets. ⛔ Never a solidus or a comma — a date written 12/03/2026 or "12, 14" is not a number. */
const JOINERS: ReadonlySet<number> = new Set([
  SPACE, 0xa0, 0x2007, 0x2009, 0x202f, FULL_STOP, 45, 0x2010, 0x2011, 0x2012, 0x2013, 0x2014, OPEN_PAREN, CLOSE_PAREN,
]);
/** What a name loses at its two ends once the number is out of the line: spaces and the separators a list uses. */
const EDGE_SEPARATORS: ReadonlySet<number> = new Set([
  SPACE, 9, 0xa0, 0x202f, 58, 44, 59, 45, 0x2013, 0x2014, 124, 47, 126, FULL_STOP, 61, 62, 60, 42, 0x2022,
]);
/** What a chat's date-and-time prefix is made of ("12/03/2026, 10:15"). */
const STAMP_CHARS: ReadonlySet<number> = new Set([SPACE, 47, FULL_STOP, 58, 44, 45]);
const isDigit = (c: number): boolean => c >= 48 && c <= 57;

/** The most digits one Tanzanian mobile number is written with (00, 255 and nine). */
const NUMBER_DIGITS_MAX = 14;
/** The fewest digits a run needs to be phone-shaped at all. */
const NUMBER_DIGITS_MIN = 9;
/** A CFB file past the Excel cap is read whole to tell a protected workbook from an old .xls — up to this size. */
const CFB_FULL_READ_MAX = 32 * 1024 * 1024;
/** How often (ms) a streamed read reports its progress; the last report always arrives. */
const PROGRESS_EVERY_MS = 80;
/** How many data rows `mappingFor` samples to find a headerless file's columns. */
const GUESS_SAMPLE_ROWS = 1000;

/** 12345 → "12,345", without a locale: the browser and a test print the same sentence. */
function grouped(n: number): string {
  const s = String(Math.trunc(n));
  let out = "";
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) out += ",";
    out += s[i];
  }
  return out;
}

/* ══ THE READER'S SENTENCES — rows named, never a cell ════════════════════════════════════════════ */

/** ⛔ The run's cap, said before a byte is uploaded: the server refuses such a file at open, in these words. */
export const READ_TOO_MANY_ROWS =
  `This file has more than ${grouped(IMPORT_MAX_ROWS)} rows — the most one import can take. Split it into files of at most ${grouped(IMPORT_MAX_ROWS)} rows and import each one.`;
/** A pasted line with no phone number in it (list mode). ⛔ Never quotes the line. */
export const PASTE_LINE_NO_NUMBER = "This line has no phone number in it, so it was not read.";
/** The list paste's own note — the officer is told how a line was read before anything is uploaded. */
export const PASTE_LIST_NOTE =
  "Each line was read as one contact: its first phone number as the phone, and the rest of the line as the name.";

/** Where S15-4's count was taken: a vCard's cards, a list paste's lines, or (C3b) a file's rows — its phone cell and its
 *  other phone columns. */
export type ExtraNumbersUnit = "card" | "line" | "row";
/** The fewest digits a part of a phone cell needs to count as a number of its own (any country's number has more). */
const PHONE_LIKE_DIGITS = 7;
/** Every character that is not an ASCII digit — module-level, used only with `replace`. */
const NOT_A_DIGIT = /[^0-9]/g;

/** ⭐ S15-4 · how many people in this file had another number that is not imported — counts, never a value. */
export function extraNumbersNote(count: number, unit: ExtraNumbersUnit): string | null {
  if (!Number.isSafeInteger(count) || count <= 0) return null;
  if (unit === "card") {
    return `${grouped(count)} ${count === 1 ? "card holds" : "cards hold"} more than one phone number. One number per person is imported — the mobile number where there is one — and the others are not.`;
  }
  if (unit === "row") {
    return `${grouped(count)} ${count === 1 ? "row holds" : "rows hold"} more than one phone number. One number per person is imported — the first mobile number — and the others are not.`;
  }
  return `${grouped(count)} ${count === 1 ? "line holds" : "lines hold"} more than one phone number. The first number on each line is imported, and the others are not.`;
}

/**
 * ⭐ S15-4 · C3b · how many of a reading's data rows held more than one phone number — the person's other numbers are not
 * imported, and the result says how many people that was (`extraNumbersNote(…, "row")`). A row counts when its phone cell
 * holds several numbers (G3, `phoneCellParts`), or — when Phone is the first-mobile column (G4) — when the phone columns
 * it reads hold more than one number between them. A part counts as a number only with seven digits or more (a serial
 * "3" or an "ext 12" is none). Counts only: no number is read out.
 */
export function extraNumbersOf(reading: {
  readonly file: ParsedContactsFile;
  readonly headers: readonly string[];
  readonly mapping: ColumnMapping;
  readonly headerRows: 0 | 1;
}): number {
  const phoneAt = reading.mapping.phone;
  if (phoneAt === undefined) return 0;
  const firstMobile = (reading.headers[phoneAt] ?? "").startsWith(FIRST_MOBILE_HEADER_START);
  const columns = firstMobile
    ? reading.headers.slice(0, phoneAt).flatMap((h, i) => (isPhoneColumnHeader(h) ? [i] : []))
    : [phoneAt];
  const phoneLike = (part: string): boolean => readAsciiDigits(part).replace(NOT_A_DIGIT, "").length >= PHONE_LIKE_DIGITS;
  let extra = 0;
  for (const row of reading.file.rows.slice(reading.headerRows)) {
    let numbers = 0;
    for (const i of columns) numbers += phoneCellParts(row.cells[i] ?? "").filter(phoneLike).length;
    if (numbers > 1) extra++;
  }
  return extra;
}

/** The list paste's rows with a second number, named by the one shared list ("rows 4, 9 and 12"). */
function multiNumberNote(lines: readonly number[]): string {
  const list = formatRowList(lines);
  return `${list.charAt(0).toUpperCase()}${list.slice(1)} ${lines.length === 1 ? "holds" : "hold"} more than one phone number — only the first one on ${lines.length === 1 ? "it" : "each"} is read.`;
}

/* ══ BYTES — the digest and the Excel upload ══════════════════════════════════════════════════════ */

const HEX = "0123456789abcdef";

/** sha-256 of the bytes, 64 lower-case hex — what U29's open compares ("the same digest adopts"). */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", copy.buffer));
  let out = "";
  for (const b of digest) out += HEX[b >> 4] + HEX[b & 15];
  return out;
}

/** A paste's digest: sha-256 of its UTF-8 text (import-flow's `OpenImportInput.fileDigest`). */
export function textDigest(text: string): Promise<string> {
  return sha256Hex(new TextEncoder().encode(String(text ?? "")));
}

/** Bytes → base64, in slices, so a 700 KB workbook never meets the argument limit of one `fromCharCode` call. */
export function bytesToBase64(bytes: Uint8Array): string {
  const SLICE = 0x8000;
  let binary = "";
  for (let at = 0; at < bytes.length; at += SLICE) {
    binary += String.fromCharCode(...bytes.subarray(at, Math.min(bytes.length, at + SLICE)));
  }
  return btoa(binary);
}

/* ══ readContactsFile — a File, streamed ══════════════════════════════════════════════════════════ */

/** `read` and `total` are BYTES (the bar's fraction — the file's size is known, its row count is not until the end);
 *  `rows` is the records read so far (the caption). */
export type ReadProgress = (read: number, total: number | null, rows: number) => void;
export type ReadOptions = { readonly onProgress: ReadProgress; readonly signal?: AbortSignal };

/** Why a file was refused: not a kind any reader takes ("format"), a CSV whose structure the reader refused ("csv": a
 *  quotation mark never closed, a cell past Excel's limit), or past a cap ("size"). The dialog adds its way on for each. */
export type ReadRefusalCause = "format" | "csv" | "size";

export type ReadOutcome =
  | { readonly kind: "parsed"; readonly file: ParsedContactsFile; readonly digest: string; readonly extraNumbers: number }
  | { readonly kind: "xlsx"; readonly base64: string; readonly digest: string; readonly fileName: string }
  | { readonly kind: "refused"; readonly sentence: string; readonly cause: ReadRefusalCause }
  /** The caller's signal stopped the read (the officer pressed Stop, or closed the dialog). Nothing is kept. */
  | { readonly kind: "aborted" };

const refused = (sentence: string, cause: ReadRefusalCause = "format"): ReadOutcome => ({ kind: "refused", sentence, cause });

/** A file named for Apple Numbers. Its bytes are a zip, which only the server's zip walk could tell from a workbook, so
 *  the name decides — in the copy table's own words for a file that is not a workbook (C18). */
function namedNumbers(name: string | null): boolean {
  return typeof name === "string" && name.toLowerCase().endsWith(".numbers");
}

/**
 * Decoded text in chunks, counting the bytes as they pass. ⭐ `TextDecoderStream` with the sniffed encoding and
 * `DECODE_OPTIONS` (C19: the mark passes through, and `stripBom` in the reader removes it); where the platform has no
 * stream decoder for that encoding, a `TextDecoder` in stream mode does the same job — and a label no decoder knows
 * falls back to UTF-8, whose replacement characters the CSV reader counts and names (a refusal here would be a dead end
 * for a file the reader can still read).
 */
function decodedText(file: Blob, encoding: TextEncodingLabel, onBytes: (n: number) => void): ReadableStream<string> {
  const counted = file.stream().pipeThrough(
    new TransformStream<Uint8Array<ArrayBuffer>, Uint8Array<ArrayBuffer>>({
      transform(chunk, controller) {
        onBytes(chunk.byteLength);
        controller.enqueue(chunk);
      },
    }),
  );
  if (typeof TextDecoderStream === "function") {
    let stream: TextDecoderStream | null = null;
    try {
      stream = new TextDecoderStream(encoding, DECODE_OPTIONS);
    } catch {
      stream = null; // an encoding this platform's stream decoder lacks — the plain decoder below
    }
    if (stream !== null) return counted.pipeThrough(stream);
  }
  let decoder: TextDecoder;
  try {
    decoder = new TextDecoder(encoding, DECODE_OPTIONS);
  } catch {
    decoder = new TextDecoder("utf-8", DECODE_OPTIONS);
  }
  return counted.pipeThrough(
    new TransformStream<Uint8Array<ArrayBuffer>, string>({
      transform(chunk, controller) {
        const text = decoder.decode(chunk, { stream: true });
        if (text !== "") controller.enqueue(text);
      },
      flush(controller) {
        const text = decoder.decode();
        if (text !== "") controller.enqueue(text);
      },
    }),
  );
}

/**
 * ⭐ READ ONE FILE. The format from its bytes (`detectFormat` over the whole file up to the Excel cap — a protected
 * workbook's marker can sit past the first 4 KB), then: a workbook within the cap comes back as base64 for the server's
 * reader; a CSV or a vCard is streamed into its reader; anything else is refused with its sentence. The digest is over
 * the file's exact bytes.
 */
export async function readContactsFile(file: File, opts: ReadOptions): Promise<ReadOutcome> {
  const signal = opts.signal;
  const name = typeof file.name === "string" && file.name.trim() !== "" ? file.name : null;
  const size = file.size;
  if (signal?.aborted) return { kind: "aborted" };

  const head = new Uint8Array(await file.slice(0, Math.min(size, XLSX_MAX_BYTES)).arrayBuffer());
  if (signal?.aborted) return { kind: "aborted" };
  const detected = detectFormat(head, name);
  if (!detected.ok) {
    // A compound file past the cap: "protected" lives in its directory, often near the END — read it whole (bounded) so
    // a password-protected workbook is never told it is an old .xls (a different fix).
    if (detected.refusal === "xls" && size > XLSX_MAX_BYTES && size <= CFB_FULL_READ_MAX) {
      const whole = new Uint8Array(await file.arrayBuffer());
      if (spreadsheetHeadKind(whole) === "protected") return refused(xlsxRefusalSentence("wrong_format", { kind: "protected" }));
    }
    return refused(detected.sentence);
  }

  if (detected.kind === "xlsx") {
    if (namedNumbers(name)) return refused(xlsxRefusalSentence("wrong_format", { kind: "other" }));
    // ⛔ OVER THE CAP: refused here, before a byte is uploaded — the server would answer 413 in Next's own words.
    if (size > XLSX_MAX_BYTES) return refused(xlsxRefusalSentence("too_large", { bytes: size }), "size");
    opts.onProgress(size, size, 0);
    return { kind: "xlsx", base64: bytesToBase64(head), digest: await sha256Hex(head), fileName: name ?? "workbook.xlsx" };
  }

  const encoding: TextEncodingLabel = detected.encoding ?? "utf-8";
  const csvReader = detected.kind === "vcard" ? null : createCsvReader({ fileName: name });
  const cardReader = detected.kind === "vcard" ? createVcardReader({ fileName: name }) : null;
  const recordsSoFar = (): number => {
    if (cardReader !== null) return cardReader.stats().cards;
    return csvReader === null ? 0 : csvReader.stats().rows;
  };

  let bytesRead = 0;
  let lastReport = 0;
  const report = (force: boolean): void => {
    const now = Date.now();
    if (!force && now - lastReport < PROGRESS_EVERY_MS) return;
    lastReport = now;
    opts.onProgress(bytesRead, size, recordsSoFar());
  };
  report(true);

  const reader = decodedText(file, encoding, (n) => {
    bytesRead += n;
  }).getReader();
  let stopped: ReadOutcome | null = null;
  let finished = false;
  try {
    for (;;) {
      if (signal?.aborted) {
        stopped = { kind: "aborted" };
        break;
      }
      const next = await reader.read();
      if (next.done) {
        finished = true;
        break;
      }
      if (cardReader !== null) cardReader.push(next.value);
      else if (csvReader !== null) {
        csvReader.push(next.value);
        // ⭐ A fatal problem stops the read at once: `end()` refuses with the row named.
        if (csvReader.stats().refused !== null) break;
      }
      // ⛔ CRASH CONTROL — past the run's cap (a header row allowed for), the read stops and says why.
      if (recordsSoFar() > IMPORT_MAX_ROWS + 1) {
        stopped = refused(READ_TOO_MANY_ROWS, "size");
        break;
      }
      report(false);
    }
  } finally {
    if (finished) reader.releaseLock();
    else await reader.cancel().catch(() => undefined);
  }
  if (stopped !== null) return stopped;
  if (signal?.aborted) return { kind: "aborted" };
  report(true);

  let parsed: ParsedContactsFile;
  let extraNumbers = 0;
  if (cardReader !== null) {
    const card = cardReader.end();
    extraNumbers = cardReader.stats().extraPhones;
    const note = extraNumbersNote(extraNumbers, "card");
    parsed = { ...card, notes: note === null ? [...card.notes] : [...card.notes, note] };
  } else if (csvReader !== null) {
    const result = csvReader.end();
    if (!result.ok) return refused(result.sentence, "csv");
    parsed = result.file;
  } else {
    return refused(xlsxRefusalSentence("wrong_format", { kind: "other" }));
  }
  if (parsed.rows.length + parsed.unreadable.length > IMPORT_MAX_ROWS + 1) return refused(READ_TOO_MANY_ROWS, "size");

  // ⭐ THE DIGEST IS OVER THE EXACT BYTES — read once more, whole, after the streamed parse: `crypto.subtle` has no
  // incremental digest, and a second read of the same File is the same bytes.
  if (signal?.aborted) return { kind: "aborted" };
  const digest = await sha256Hex(new Uint8Array(await file.arrayBuffer()));
  return { kind: "parsed", file: parsed, digest, extraNumbers };
}

/* ══ parsePastedText — the paste box ══════════════════════════════════════════════════════════════ */

/** Does this paste read as a LIST (one contact per line), not as cells copied from a sheet? A tab decides. */
export function isListPaste(text: string): boolean {
  return !String(text ?? "").includes(TAB);
}

/** A digit group inside a run, by its offsets in the line. */
type Group = { readonly start: number; readonly end: number; readonly digits: string };
/** A phone-shaped run: an optional + or bracket, then digits and joiners. */
type Run = { readonly start: number; readonly end: number; readonly groups: readonly Group[]; readonly digits: number };
/** One number found in a line: its offsets and text, and whether it is a number this platform can send to. */
type Found = { readonly start: number; readonly end: number; readonly text: string; readonly sendable: boolean };

/** Every run of digits and joiners in a line (a + opens one only at its start). Shape only — no verdict. */
function runsOf(line: string): Run[] {
  const runs: Run[] = [];
  let i = 0;
  while (i < line.length) {
    const c = line.charCodeAt(i);
    if (!isDigit(c) && c !== PLUS && c !== OPEN_PAREN) {
      i++;
      continue;
    }
    const groups: Group[] = [];
    let groupStart = -1;
    let j = i;
    while (j < line.length) {
      const d = line.charCodeAt(j);
      if (isDigit(d)) {
        if (groupStart < 0) groupStart = j;
        j++;
        continue;
      }
      if (groupStart >= 0) {
        groups.push({ start: groupStart, end: j, digits: line.slice(groupStart, j) });
        groupStart = -1;
      }
      if (JOINERS.has(d) || (d === PLUS && j === i)) {
        j++;
        continue;
      }
      break;
    }
    if (groupStart >= 0) groups.push({ start: groupStart, end: j, digits: line.slice(groupStart, j) });
    if (groups.length > 0) {
      let digits = 0;
      for (const g of groups) digits += g.digits.length;
      runs.push({ start: i, end: groups[groups.length - 1].end, groups, digits });
    }
    i = Math.max(j, i + 1);
  }
  return runs;
}

/**
 * The numbers a phone-shaped run holds: each stretch of its consecutive digit groups that THE ONE NUMBER RULE reads as a
 * Tanzanian mobile number, in order (two numbers written side by side are two). A run holding none is ONE number as
 * written — a foreign or mistyped one — so the server can say why it is refused.
 * ⛔ A NUMBER FOUND MID-RUN MUST START LIKE ONE — with the trunk 0 or the country code 255. Only the run's own first group
 * may be a bare nine-digit national number: inside "+254 712 345 678" the groups "712 345 678" read as a Tanzanian
 * number, and taking them would import a STRANGER's number in place of a Kenyan one the server would have refused.
 */
function numbersIn(line: string, run: Run): Found[] {
  const out: Found[] = [];
  const gs = run.groups;
  const opensWithPlus = line.charCodeAt(run.start) === PLUS;
  let i = 0;
  while (i < gs.length) {
    let found = -1;
    let digits = "";
    const startsLikeANumber = i === 0 || gs[i].digits.startsWith("0") || gs[i].digits.startsWith("255");
    for (let j = i; startsLikeANumber && j < gs.length; j++) {
      digits += gs[j].digits;
      if (digits.length > NUMBER_DIGITS_MAX) break;
      if (digits.length >= NUMBER_DIGITS_MIN && isSendableTzNumber((i === 0 && opensWithPlus ? "+" : "") + digits)) {
        found = j;
        break;
      }
    }
    if (found < 0) {
      i++;
      continue;
    }
    const start = i === 0 ? run.start : gs[i].start;
    out.push({ start, end: gs[found].end, text: line.slice(start, gs[found].end).trim(), sendable: true });
    i = found + 1;
  }
  if (out.length === 0) out.push({ start: run.start, end: run.end, text: line.slice(run.start, run.end).trim(), sendable: false });
  return out;
}

/** Every number in a line, in order — from its phone-shaped runs only (a date, a time or a small count is not one). */
function numbersOf(line: string): Found[] {
  const out: Found[] = [];
  for (const run of runsOf(line)) if (run.digits >= NUMBER_DIGITS_MIN) out.push(...numbersIn(line, run));
  return out;
}

/** How much of a name's start is not the name: a list's enumeration ("12. ", "3) "), a chat's bracketed stamp
 *  ("[12/03/2026, 10:15] ") or a chat's dash-led stamp ("12/03/2026, 10:15 - "). */
function prefixLength(text: string): number {
  let i = 0;
  while (i < text.length && text.charCodeAt(i) === SPACE) i++;
  const from = i;
  // A bracketed stamp holds a digit; a bracketed word ("[VIP]") is part of the name.
  if (text.charCodeAt(i) === OPEN_BRACKET) {
    const close = text.indexOf(String.fromCharCode(CLOSE_BRACKET), i);
    if (close > i) {
      let stamp = false;
      for (let k = i + 1; k < close; k++) if (isDigit(text.charCodeAt(k))) stamp = true;
      if (stamp) return close + 1;
    }
    return 0;
  }
  // A dash-led stamp: only digits and / . : , - and spaces before " - ", within the first 25 characters.
  const dash = text.indexOf(" - ", i);
  if (dash > i && dash - i <= 25 && isDigit(text.charCodeAt(i))) {
    let stamp = true;
    for (let k = i; k < dash; k++) {
      const c = text.charCodeAt(k);
      if (!isDigit(c) && !STAMP_CHARS.has(c)) stamp = false;
    }
    if (stamp) return dash + 3;
  }
  // An enumeration: up to four digits, then "." or ")", then a space.
  while (i < text.length && isDigit(text.charCodeAt(i)) && i - from < 4) i++;
  if (i === from || i >= text.length) return 0;
  const mark = text.charCodeAt(i);
  if (mark !== FULL_STOP && mark !== CLOSE_PAREN) return 0;
  i++;
  if (i < text.length && text.charCodeAt(i) !== SPACE) return 0;
  return i;
}

/** What is left of a line once its numbers are out: a leading enumeration or chat stamp dropped, separators trimmed at
 *  both ends, spaces collapsed, an emptied pair of brackets dropped and a fully bracketed remainder unwrapped. */
function nameOf(line: string, numbers: readonly Found[]): string {
  let text = "";
  let at = 0;
  for (const n of numbers) {
    text += line.slice(at, n.start) + " ";
    at = n.end;
  }
  text += line.slice(at);
  text = text.slice(prefixLength(text));
  let start = 0;
  let end = text.length;
  while (start < end && EDGE_SEPARATORS.has(text.charCodeAt(start))) start++;
  while (end > start && EDGE_SEPARATORS.has(text.charCodeAt(end - 1))) end--;
  let name = text.slice(start, end).split(" ").filter((w) => w !== "").join(" ");
  name = name.split("()").join("").split(" ").filter((w) => w !== "").join(" ");
  if (name.length >= 2 && name.charCodeAt(0) === OPEN_PAREN && name.charCodeAt(name.length - 1) === CLOSE_PAREN) {
    name = name.slice(1, -1).trim();
  }
  return name;
}

/** The pasted lines, a final line end making no empty last line. */
function pastedLines(text: string): string[] {
  const lines = text.split(LINE_BREAK);
  return lines.length > 1 && lines[lines.length - 1] === "" ? lines.slice(0, -1) : lines;
}

/** A paste's lines and cells split by hand — the fallback for a tab-separated paste U25's reader refuses (a quote that
 *  never closes): a paste is never refused, and its quotation marks are kept as typed. */
function plainTable(text: string): ParsedContactsFile {
  const rows: ParsedRow[] = [];
  let blankRows = 0;
  let width = 0;
  pastedLines(text).forEach((raw, index) => {
    const cells = raw.split(TAB);
    if (cells.every((c) => c.trim() === "")) {
      blankRows++;
      return;
    }
    rows.push({ line: index + 1, cells });
    if (cells.length > width) width = cells.length;
  });
  return { format: "paste", fileName: null, rows, width, blankRows, notes: [], unreadable: [] };
}

/**
 * ⭐ THE PASTE BOX'S TEXT → C15's shape (`format: "paste"`, no file name). With a tab: an Excel or Sheets copy, read by
 * U25's own reader with the tab as separator (its notes kept), the first row header-matched by `mappingFor` like any
 * file. Without one: a LIST, one contact per line — `[phone, name]` — its lines numbered as pasted, blank lines counted,
 * a line with no number listed as unreadable, and a line with a second number keeping the first (S15-4, said in a note).
 */
export function parsePastedText(text: string): ParsedContactsFile {
  const source = stripBom(String(text ?? "")).text;
  if (!isListPaste(source)) {
    const read = parseCsv(source, { delimiter: "tab" });
    // A quotation mark that never closes — refused, or (C3b · G1) read as one unreadable record that swallowed the rest:
    // a paste is never cut, so its lines are split by hand, every one kept, its quotation marks as typed.
    if (!read.ok || read.file.unreadable.length > 0) return plainTable(source);
    return { ...read.file, format: "paste", fileName: null };
  }
  const rows: ParsedRow[] = [];
  const unreadable: UnreadableRecord[] = [];
  const multi: number[] = [];
  let blankRows = 0;
  pastedLines(source).forEach((line, index) => {
    const lineNo = index + 1;
    if (line.trim() === "") {
      blankRows++;
      return;
    }
    const numbers = numbersOf(line);
    if (numbers.length === 0) {
      unreadable.push({ line: lineNo, reason: PASTE_LINE_NO_NUMBER });
      return;
    }
    // ⭐ S15-4 · the ONE choice (`firstMobileIndex`, phone-cell.ts): the first Tanzanian mobile on the line, else the first.
    const at = firstMobileIndex(numbers.map((n) => n.text));
    const first = numbers[at >= 0 ? at : 0];
    if (numbers.length > 1) multi.push(lineNo);
    rows.push({ line: lineNo, cells: [first.text, nameOf(line, numbers)] });
  });
  const notes = rows.length > 0 ? [PASTE_LIST_NOTE] : [];
  if (multi.length > 0) notes.push(multiNumberNote(multi));
  return { format: "paste", fileName: null, rows, width: rows.length > 0 ? 2 : 0, blankRows, notes, unreadable };
}

/** How many lines of a list paste held a second number (the result's S15-4 line); 0 for a table paste. */
export function pasteExtraNumbers(text: string): number {
  const source = stripBom(String(text ?? "")).text;
  if (!isListPaste(source)) return 0;
  let extra = 0;
  for (const line of pastedLines(source)) if (line.trim() !== "" && numbersOf(line).length > 1) extra++;
  return extra;
}

/* ══ mappingFor — the columns, as the mapping panel starts them ═══════════════════════════════════ */

export type FileMapping = {
  /** The header row the mapping is made against — the file's own (padded to its widest row), or synthetic: "Column A…"
   *  for a headerless file, the field labels for a list paste and a vCard. Posted to open as `headers`. */
  readonly headers: string[];
  readonly mapping: ColumnMapping;
  /** Leading rows that are column names: 1 for a file with a header row, 0 for a vCard, a list paste and a headerless file. */
  readonly headerRows: 0 | 1;
  /** S15-5 · the first row reads as a contact, so it is imported too. */
  readonly headerless: boolean;
  /** The headers are this module's, not the file's (headerless, list paste, vCard). */
  readonly synthetic: boolean;
  /** A refusal no column choice can fix (a masked export), in U28's words — or null. */
  readonly refusal: string | null;
  /** No column was recognised as the phone number: U28's own sentence for it (it names the columns found, which is how
   *  an officer recognises a cover sheet read in place of the contacts) — or null. NOT a refusal: the officer may pick
   *  the column on the panel; `validateMapping` holds Next until one is chosen. */
  readonly phoneProblem: string | null;
  /** Each column as the panel first draws it: its status and U28's note. */
  readonly columns: readonly MappedColumn[];
  /** ⭐ C3b · G4 · the file AS THIS READING STAGES IT: the file itself — or, when it has several phone columns, the file
   *  with ONE more column, "Phone (first mobile of: …)", on every row. The panel's samples and the staged rows come from
   *  this file (`stageRowsOf(reading.file, …)`); a reading is always made from the file AS READ, never from this one. */
  readonly file: ParsedContactsFile;
};

export type MappingOptions = {
  /** The file is a LIST paste (`isListPaste`): its two columns are the phone and the name, with no header row. */
  readonly list?: boolean;
  /** The officer's own word on the first row, over the automatic reading: "contact" reads it as data (S15-5's synthetic
   *  columns), "header" as column names. Omitted: the first row decides (`autoMapHeaders().headerless`). */
  readonly firstRow?: "header" | "contact";
};

/** A spreadsheet's column letter: 0 → A, 25 → Z, 26 → AA. */
export function columnLetter(index: number): string {
  let n = Math.max(0, Math.trunc(index)) + 1;
  let out = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    out = String.fromCharCode(65 + r) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

/** A headerless file's column name — the letter the officer's spreadsheet shows it by. */
export function syntheticHeader(index: number): string {
  return `Column ${columnLetter(index)}`;
}

const labelOf = (key: ImportFieldKey): string => CONTACT_FIELDS.find((f) => f.key === key)?.label ?? key;

/** Only digits, spaces and the punctuation a number is written with — U28's own test for "this cell IS a number". */
const NUMBER_SHAPED = /^[\s'+().\d-]+$/;
const isNumberCell = (cell: string): boolean => NUMBER_SHAPED.test(cell.trim()) && isSendableTzNumber(cell);
const isEmailCell = (cell: string): boolean => {
  const t = cell.trim();
  const at = t.indexOf("@");
  return at > 0 && at === t.lastIndexOf("@") && t.indexOf(".", at) > at + 1 && !t.includes(" ");
};
const LETTER = /\p{L}/u;
const DIGIT_RUN = /\d{6,}/;
const isNameCell = (cell: string): boolean => {
  const t = cell.trim();
  return t !== "" && LETTER.test(t) && !t.includes("@") && !DIGIT_RUN.test(t);
};

/** S15-5 · a headerless file's columns, guessed from their cells: the phone column first (the most cells that ARE a
 *  Tanzanian mobile number), then the email and name columns by shape — each only where most filled cells fit it. */
function guessHeaderless(file: ParsedContactsFile): ColumnMapping {
  const sample = file.rows.slice(0, GUESS_SAMPLE_ROWS);
  const width = Math.max(0, file.width);
  const score = (test: (cell: string) => boolean): number[] => {
    const counts = new Array<number>(width).fill(0);
    for (const row of sample) {
      for (let i = 0; i < row.cells.length && i < width; i++) if (test(row.cells[i])) counts[i]++;
    }
    return counts;
  };
  const filled = score((cell) => cell.trim() !== "");
  const best = (counts: readonly number[], taken: ReadonlySet<number>, needHalf: boolean): number | null => {
    let at = -1;
    for (let i = 0; i < counts.length; i++) {
      if (taken.has(i) || counts[i] === 0) continue;
      if (needHalf && counts[i] * 2 < filled[i]) continue;
      if (at < 0 || counts[i] > counts[at]) at = i;
    }
    return at < 0 ? null : at;
  };
  const mapping: ColumnMapping = {};
  const taken = new Set<number>();
  const phone = best(score(isNumberCell), taken, false);
  if (phone !== null) {
    mapping.phone = phone;
    taken.add(phone);
  }
  const email = best(score(isEmailCell), taken, true);
  if (email !== null) {
    mapping.email = email;
    taken.add(email);
  }
  const name = best(score(isNameCell), taken, true);
  if (name !== null) mapping.name = name;
  return mapping;
}

/** The panel's columns for a mapping this module made (synthetic headers): mapped, or not read. */
function columnsFor(headers: readonly string[], mapping: ColumnMapping): MappedColumn[] {
  return headers.map((header, index): MappedColumn => {
    const field = (Object.keys(mapping) as ImportFieldKey[]).find((k) => mapping[k] === index) ?? null;
    return field !== null
      ? { index, header, status: "mapped", field, note: null }
      : { index, header, status: "unknown", field: null, note: null };
  });
}

/* ══ C3b · G4 — SEVERAL PHONE COLUMNS: the first mobile among them, as ONE column ═══════════════════ */

/** Outlook's and Google's other phone columns and the Swahili "second phone", as `normaliseHeader` writes them. ⛔ Each
 *  is read ONLY into the first-mobile column, never mapped on its own: a person's number may sit in any of them. */
const OTHER_PHONE_HEADERS: ReadonlySet<string> = new Set([
  "business phone", "business phone 2", "home phone", "home phone 2", "primary phone", "other phone", "car phone",
  "company main phone", "assistant's phone", "radio phone", "callback", "simu ya pili", "simu nyingine", "namba ya pili",
]);
const DIGITS_ONLY = /^[0-9]+$/;

/** ⭐ The first-mobile column's header begins so — and a file that already carries one is never extended again. */
export const FIRST_MOBILE_HEADER_START = "Phone (first mobile of: ";
/** How many phone columns the header names before it says how many more. */
const FIRST_MOBILE_HEADER_NAMES = 3;
/** The note under each phone column the first-mobile column reads — why it says "Not used". */
export const FIRST_MOBILE_SOURCE_NOTE =
  "One number per person: the last column takes the first mobile number among the phone columns, so this one is not read on its own.";

/** The first-mobile column's header, naming the phone columns it reads — the file's own names, the main one first. */
export function firstMobileHeader(names: readonly string[]): string {
  const shown = names.slice(0, FIRST_MOBILE_HEADER_NAMES);
  const more = names.length - shown.length;
  return `${FIRST_MOBILE_HEADER_START}${shown.join(", ")}${more > 0 ? ` and ${more} more` : ""})`;
}

/**
 * Is this header one of a person's phone columns? Any header U28 reads as Phone (a strong spelling or a weak one —
 * `autoMapHeaders`' phone-ish columns), Outlook's and Google's other phone columns, and a numbered phone column ("Phone
 * 2", "Simu 2", Google's "Phone 2 - Value").
 */
export function isPhoneColumnHeader(header: string): boolean {
  const match = matchHeader(header);
  if (match.kind === "field" && match.field === "phone") return true;
  const normal = normaliseHeader(header);
  if (OTHER_PHONE_HEADERS.has(normal)) return true;
  const words = normal.split(" ");
  if (words.length === 3 && words[0] === "phone" && DIGITS_ONLY.test(words[1]) && words[2] === "value") return true;
  if (words.length < 2 || !DIGITS_ONLY.test(words[words.length - 1])) return false;
  const base = matchHeader(words.slice(0, -1).join(" "));
  return base.kind === "field" && base.field === "phone" && base.strength === "strong";
}

type FirstMobileReading = {
  readonly file: ParsedContactsFile;
  readonly headers: string[];
  readonly mapping: ColumnMapping;
  readonly columns: MappedColumn[];
};

/**
 * ⭐ C3b · G4 · the header reading with ONE more column — or null when it would add nothing. The phone columns are the one
 * U28 maps as Phone (the MAIN one, first) and every other phone column, left to right (`isPhoneColumnHeader`). Each data
 * row's new cell is the first of their cells that holds a Tanzanian mobile (`firstMobileIn` — the ONE phone-cell rule),
 * else the main column's own cell, so a row with no mobile anywhere reads exactly as it did. ⛔ The column is added only
 * when some row holds its mobile OUTSIDE the main column (or nothing was mapped as Phone at all): a serial "Namba" beside
 * a "Simu" never adds a column that would change nothing.
 */
function withFirstMobileColumn(file: ParsedContactsFile, headers: readonly string[], auto: AutoMapResult): FirstMobileReading | null {
  if (file.rows.length < 2 || headers.some((h) => h.startsWith(FIRST_MOBILE_HEADER_START))) return null;
  const phoneColumns = headers.flatMap((h, i) => (isPhoneColumnHeader(h) ? [i] : []));
  const main = auto.mapping.phone ?? phoneColumns[0];
  if (main === undefined) return null;
  const order = [main, ...phoneColumns.filter((i) => i !== main)];
  if (order.length < 2) return null;
  const holding = new Set<number>([main]);
  let adds = auto.mapping.phone === undefined;
  const picks = file.rows.slice(1).map((row) => {
    let pick: number | null = null;
    for (const i of order) {
      const cell = row.cells[i] ?? "";
      if (cell.trim() === "") continue;
      holding.add(i);
      if (pick === null && firstMobileIn(cell) !== null) pick = i;
    }
    if (pick !== null && pick !== main) adds = true;
    return row.cells[pick ?? main] ?? "";
  });
  if (!adds) return null;
  const width = headers.length;
  const nameOf = (i: number): string => {
    const named = (auto.columns[i]?.header ?? headers[i] ?? "").trim();
    return named === "" ? syntheticHeader(i) : named;
  };
  const header = firstMobileHeader(order.filter((i) => holding.has(i)).map(nameOf));
  const padTo = (cells: readonly string[]): string[] => Array.from({ length: width }, (_, i) => cells[i] ?? "");
  const rows: ParsedRow[] = file.rows.map((row, r) => ({ line: row.line, cells: [...padTo(row.cells), r === 0 ? header : picks[r - 1]] }));
  const sources = new Set(order);
  return {
    file: { ...file, rows, width: width + 1 },
    headers: [...headers, header],
    mapping: { ...auto.mapping, phone: width },
    columns: [
      ...auto.columns.map((c): MappedColumn =>
        (sources.has(c.index) ? { index: c.index, header: c.header, status: "unused", field: "phone", note: FIRST_MOBILE_SOURCE_NOTE } : c)),
      { index: width, header, status: "mapped", field: "phone", note: null },
    ],
  };
}

/**
 * ⭐ THE MAPPING PANEL'S STARTING POINT, for a whole parsed file. A list paste: Phone and Name, no header row. A vCard:
 * U28's fixed grid (A1.2). Anything else: U28's header match over the first row, padded to the widest row
 * (`autoMapFile`) — and, S15-5, when that row reads as a contact, synthetic "Column A…" headers, the phone, email and
 * name columns found from the cells, and no header row; and, C3b · G4, when the header carries several phone columns
 * and a row's mobile sits outside the main one, ONE more column read as Phone (`withFirstMobileColumn` — its `file` is
 * the one staged). A masked export stays refused (`refusal`); a missing phone column is NOT a refusal here — the officer
 * picks it on the panel, and `validateMapping` holds Next until one is chosen.
 */
export function mappingFor(file: ParsedContactsFile, opts: MappingOptions = {}): FileMapping {
  if (opts.list === true && file.format === "paste") {
    const headers = [labelOf("phone"), labelOf("name")];
    const mapping: ColumnMapping = { phone: 0, name: 1 };
    return {
      headers, mapping, headerRows: 0, headerless: false, synthetic: true, refusal: null, phoneProblem: null, columns: columnsFor(headers, mapping),
      file,
    };
  }
  const firstRow = file.rows[0]?.cells ?? [];
  if (file.format === "vcard") {
    const auto = autoMapFile("vcard", firstRow);
    const headers = auto.columns.map((c) => c.header);
    return {
      headers, mapping: { ...auto.mapping }, headerRows: 0, headerless: false, synthetic: true, refusal: auto.refusal, phoneProblem: null,
      columns: auto.columns, file,
    };
  }
  const width = Math.max(file.width, firstRow.length);
  const padded = Array.from({ length: width }, (_, i) => firstRow[i] ?? "");
  const auto = autoMapFile(file.format, padded);
  // ⛔ Only a refused (masked) column is a refusal here: its own note IS the refusal, while "no Phone column" is a
  // choice the panel asks the officer for. It holds whatever the officer says about the first row — a masked export
  // read "as contacts" would only stage masked numbers as rows.
  const hard = auto.refusal !== null && auto.columns.some((c) => c.status === "notImported" && c.note === auto.refusal) ? auto.refusal : null;
  const headerless = hard === null && (opts.firstRow === "contact" || (opts.firstRow !== "header" && auto.headerless));
  if (headerless) {
    const headers = Array.from({ length: width }, (_, i) => syntheticHeader(i));
    const mapping = guessHeaderless(file);
    return {
      headers, mapping, headerRows: 0, headerless: true, synthetic: true, refusal: null, phoneProblem: null, columns: columnsFor(headers, mapping),
      file,
    };
  }
  // ⭐ C3b · G4 · several phone columns, and a mobile outside the main one: ONE more column, read as Phone.
  const firstMobile = hard === null ? withFirstMobileColumn(file, padded, auto) : null;
  if (firstMobile !== null) {
    return {
      headers: firstMobile.headers, mapping: firstMobile.mapping, headerRows: 1, headerless: false, synthetic: false, refusal: null,
      phoneProblem: null, columns: firstMobile.columns, file: firstMobile.file,
    };
  }
  // U28's "no Phone column" sentence, kept as the reason Next waits — never its headerless sentence, which only reads
  // when the officer has said the first row IS column names.
  const phoneProblem = hard === null && auto.mapping.phone === undefined && !auto.headerless ? auto.refusal : null;
  return {
    headers: padded, mapping: { ...auto.mapping }, headerRows: 1, headerless: false, synthetic: false, refusal: hard, phoneProblem,
    columns: auto.columns, file,
  };
}

/* ══ THE PREVIEW — the only way the panel shows a cell ════════════════════════════════════════════ */

/** The longest preview a cell gets, in characters. */
const PREVIEW_CHARS = 32;

/**
 * ⛔ A cell as the mapping panel may show it: a cell that IS a Tanzanian mobile number becomes `+255••••NN`; any other
 * run of nine or more digits inside the text becomes four bullets and its last two (`scrubPhoneRuns`); clipped to a
 * short preview. No phone number is ever drawn whole, whichever column it sits in and however the columns are mapped.
 */
export function previewCell(cell: string): string {
  const raw = String(cell ?? "").trim();
  if (raw === "") return "";
  const parsed = parseTzNumber(raw);
  const shown = parsed.verdict === "ok" && parsed.e164 !== null && NUMBER_SHAPED.test(raw) ? maskPhone(parsed.e164) : scrubPhoneRuns(raw);
  const chars = Array.from(shown);
  return chars.length <= PREVIEW_CHARS ? shown : `${chars.slice(0, PREVIEW_CHARS - 1).join("")}…`;
}

/** A column's first few filled values below the header rows, each through `previewCell`. */
export function columnSamples(file: ParsedContactsFile, headerRows: 0 | 1, column: number, n = 3): string[] {
  const out: string[] = [];
  for (let i = headerRows; i < file.rows.length && out.length < n; i++) {
    const cell = file.rows[i].cells[column];
    if (typeof cell === "string" && cell.trim() !== "") out.push(previewCell(cell));
  }
  return out;
}
