/**
 * test:contacts-import · section "csv" — U25: the CSV reader (`src/lib/contacts/import-parse.ts`).   (S10, 2026-10-02)
 *
 * ⭐ EXECUTED, NOT READ. Every behaviour runs through the real reader, sniffer and detector, on fixtures BUILT HERE in
 * code — there is no `.csv` on disk (`core.autocrlf=true` would rewrite a fixture file's line endings), and every CR,
 * LF, TAB, byte-order mark, U+FFFD and raw byte is made from its code (the editing tools decode escape text into raw
 * characters). The SOURCE is read only for what only the source can show: what import-parse.ts imports, how it writes
 * its special characters, and what it does NOT own (§C8).
 *
 * ⭐ THE PLAN'S SENTENCES, ASSERTED (§9 U25 and DECISIONS-U21-U28 C15–C19 · M6): quotes, doubled quotes and embedded
 * line breaks (§C1b–§C1d); CRLF and the lone CR (§C1f, §C1g); `line` as Excel numbers records (§C1e, §C1i, §C2b);
 * cells raw (§C1n); C3b's G1 — a quotation mark never closed after rows costs ONE unreadable record, not the file
 * (§C1l), and refuses the file when nothing came before it (§C1lb); the refusals naming their row (§C1lb, §C1m, §C1o);
 * the BOM stripped at decode time (§C2a,
 * §C5d); `sep=` on the first line after the mark (§C2b–§C2d); the vote on the FIRST NON-BLANK RECORD, once per
 * candidate with its own quote rules (§C3a–§C3g), beaten by a manual choice (§C3h) and consistent with
 * `voteDelimiter` (§C3i); STREAMING — every split equals one push (§C4a), each character tokenized once by the
 * reader's own counter (§C4b), the Accept line's 150,000 rows in 4,093-character chunks (§C4c), the 40-row small end
 * (§C4d); the encoding sniff and the U+FFFD rows (§C5); content beating the name through vcard.ts' sniff and
 * xlsx-limits' classifier and copy (§C6); notes capped at 50 with the true count (§C7a) and every sentence a sentence
 * (§C7b); purity and ownership (§C8).
 *
 * ⚠️ A PREMISE CORRECTED, AND PINNED. A vote counted "once per candidate with that candidate's own quote rules" TIES the
 * plan's own header (two commas outside a comma's quotes, two semicolons), and the tie-break order would pick the
 * comma. The reader therefore drops a candidate under whose rules the record's quoting breaks; §C3a asserts the exact
 * counts (comma 2, semicolon 2) and the irregular candidates, so the correction cannot quietly regress.
 *
 * ⭐ PROVED BY MUTATION. Every label below is named by at least one red plant. A plant is one of: a RULE swapped in
 * `buildCsvReader` (the reader itself unchanged — the faithful defect); a pass over the WHOLE text before the real
 * reader (the chunks gathered first, so chunked and whole reads stay equal and only the targeted assertion moves); a
 * chunk wrapper; an output map (a shape or wording defect); or a swapped function, detector or source. The runner
 * requires each plant's OWN label among the reds.
 *
 * ⛔ IN-PROCESS. Every plant is a replacement bundle built in memory; this module reads files and makes no
 * file-changing call.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { decomment } from "../lib/decomment.mts";
import { REPO_ROOT } from "../lib/tracked-files.mts";
import type { ImportSection, RedPlant, SectionContext } from "../contacts-import.test.mts";
import {
  CSV_RULES,
  DECODE_OPTIONS,
  MAX_FIELD_CHARS,
  MAX_HEADER_CHARS,
  SNIFF_BYTES,
  buildCsvReader,
  buildFormatDetector,
  createCsvReader,
  decodeBytes,
  detectFormat,
  parseCsv,
  sniffEncoding,
  voteDelimiter,
  type CandidateScan,
  type CsvReadResult,
  type CsvReader,
  type CsvReaderOptions,
  type CsvRules,
  type CsvStats,
  type DelimiterVote,
  type DetectedFormat,
  type EncodingSniff,
  type TextEncodingLabel,
} from "../../src/lib/contacts/import-parse.ts";
import { isParsedContactsFile, type ParsedContactsFile, type ParsedRow } from "../../src/lib/contacts/parsed-file.ts";
import { ODS_MIMETYPE, PHONE_FORMAT_REMEDY, xlsxRefusalSentence } from "../../src/lib/contacts/xlsx-limits.ts";
import { unguardCell } from "../../src/lib/contacts/csv-write.ts";

/* ⛔ Every special character from its code — the editing tools decode escape text into raw characters. */
const TAB = String.fromCharCode(9);
const LF = String.fromCharCode(10);
const CR = String.fromCharCode(13);
const CRLF = CR + LF;
const BOM = String.fromCharCode(0xfeff);
const FFFD = String.fromCharCode(0xfffd);
const QUOTE = String.fromCharCode(34);

const IMPORT_PARSE_PATH = "src/lib/contacts/import-parse.ts";

/** Lines, each followed by `eol` (CRLF by default). */
const lines = (rows: readonly string[], eol: string = CRLF): string => rows.map((l) => l + eol).join("");
const chunked = (text: string, size: number): string[] => {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out;
};
const pad = (n: number, width: number): string => String(n).padStart(width, "0");
/** Deep equality with object keys sorted (array order still counts). */
const stable = (v: unknown): string =>
  JSON.stringify(v, (_k, x: unknown) =>
    x !== null && typeof x === "object" && !Array.isArray(x)
      ? Object.fromEntries(Object.entries(x as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : x) ?? "undefined";
const same = (a: unknown, b: unknown): boolean => stable(a) === stable(b);
/** A detail with every control and format character spelled out, so a failure never prints one raw. */
const visible = (x: unknown): string =>
  Array.from(typeof x === "string" ? x : String(JSON.stringify(x)))
    .map((ch) => {
      const c = ch.codePointAt(0) ?? 0;
      return c < 32 || c === 127 || (c >= 0x2000 && c <= 0x206f) || c === 0xfeff || c === 0xfffd
        ? `<U+${c.toString(16).toUpperCase()}>`
        : ch;
    })
    .join("");
const utf8 = (s: string): Uint8Array => new TextEncoder().encode(s);
const bytes = (list: readonly number[]): Uint8Array => Uint8Array.from(list);
/** ASCII text as its bytes. */
const ascii = (s: string): number[] => Array.from(s, (ch) => ch.charCodeAt(0));
const utf16le = (s: string): number[] => {
  const out: number[] = [];
  for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i) & 255, s.charCodeAt(i) >> 8);
  return out;
};
const utf16be = (s: string): number[] => {
  const out: number[] = [];
  for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i) >> 8, s.charCodeAt(i) & 255);
  return out;
};
const countChar = (s: string, ch: string): number => s.split(ch).length - 1;
const endsWithBreak = (s: string): boolean => s.endsWith(LF) || s.endsWith(CR);

/* ══ THE BUNDLE UNDER TEST ══════════════════════════════════════════════════════════════════════ */

type Read = { readonly result: CsvReadResult; readonly stats: CsvStats };

export type CsvImpl = {
  readonly createReader: (options?: CsvReaderOptions) => CsvReader;
  readonly parse: (text: string, options?: CsvReaderOptions) => CsvReadResult;
  readonly vote: (text: string) => DelimiterVote;
  readonly sniff: (head: Uint8Array) => EncodingSniff;
  readonly decodeOptions: { readonly fatal: boolean; readonly ignoreBOM: boolean };
  readonly decode: (bytes: Uint8Array, encoding: TextEncodingLabel) => string;
  readonly detect: (head: Uint8Array, fileName: string | null) => DetectedFormat;
  /** import-parse.ts as the guards read it: comments stripped, CRLF normalised. */
  readonly source: string;
  /** import-parse.ts exactly as on disk, comments included — §C8b's character scan. */
  readonly rawSource: string;
};

let cached: CsvImpl | null = null;

/** The SHIPPED bundle: the module's own reader, vote, sniffer, decoder and detector, and the real source. Built once. */
function real(): CsvImpl {
  if (cached) return cached;
  const raw = readFileSync(join(REPO_ROOT, IMPORT_PARSE_PATH), "utf8");
  cached = {
    createReader: createCsvReader,
    parse: parseCsv,
    vote: voteDelimiter,
    sniff: sniffEncoding,
    decodeOptions: DECODE_OPTIONS,
    decode: decodeBytes,
    detect: detectFormat,
    source: decomment(raw).split(CRLF).join(LF),
    rawSource: raw,
  };
  return cached;
}

/** Feeds `chunks` to a fresh reader from the bundle, ends it, and returns the result with its counts. */
function readChunks(impl: CsvImpl, chunks: readonly string[], options?: CsvReaderOptions): Read {
  const reader = impl.createReader(options);
  for (const chunk of chunks) reader.push(chunk);
  const result = reader.end();
  return { result, stats: reader.stats() };
}
const readText = (impl: CsvImpl, text: string, options?: CsvReaderOptions): Read => readChunks(impl, [text], options);
const fileOf = (r: Read): ParsedContactsFile | null => (r.result.ok ? r.result.file : null);
const rowsOf = (r: Read): ParsedRow[] => (r.result.ok ? r.result.file.rows : []);
const cellsOf = (r: Read): string[][] => rowsOf(r).map((x) => x.cells);
const linesOf = (r: Read): number[] => rowsOf(r).map((x) => x.line);
/** Everything a read shows but the work counter, which §C4b owns: what a chunking must never change. */
const observable = (r: Read): string => JSON.stringify({ result: r.result, stats: { ...r.stats, charsTokenized: 0 } });
const brief = (r: Read): string =>
  r.result.ok
    ? `lines ${linesOf(r).join(",") || "none"} · ${r.stats.delimiter ?? "one column"} by ${r.stats.source ?? "nothing"} · ${r.result.file.notes.length} note(s)`
    : `refused ${r.result.problem} at row ${r.result.line}`;

/* ══ THE FIXTURES — built here, in code ═════════════════════════════════════════════════════════ */

/** C1a — a plain comma file. */
const PLAIN = lines(["Name,Phone,Email", "Asha Juma,0712345601,asha@example.com", "Baraka Mwakyusa,0754345602,"]);
const PLAIN_FILE = {
  format: "csv",
  fileName: "orodha.csv",
  rows: [
    { line: 1, cells: ["Name", "Phone", "Email"] },
    { line: 2, cells: ["Asha Juma", "0712345601", "asha@example.com"] },
    { line: 3, cells: ["Baraka Mwakyusa", "0754345602", ""] },
  ],
  width: 3,
  blankRows: 0,
  notes: [],
  unreadable: [],
};

/** C1b, C1c — a quoted comma, and doubled quotation marks. */
const QUOTED_COMMA = lines(["Name,Phone", '"Mwanaisha, Mama",0712 345 678']);
const DOUBLED = lines(["Name,Phone", '"Asha ""Mama"" Juma",0712345603']);

/** C1d, C1e — a line break inside quotes, as LF and as CRLF. */
const EMBED_LF = "Name,Notes" + LF + '"Asha","Line one' + LF + 'line two"' + LF + "Baraka,ok" + LF;
const EMBED_CRLF = "Name,Notes" + CRLF + '"Asha","Line one' + CRLF + 'line two"' + CRLF + "Baraka,ok" + CRLF;
const EMBED_CELLS = [["Name", "Notes"], ["Asha", "Line one" + LF + "line two"], ["Baraka", "ok"]];

/** C1g — old Mac Excel: a lone CR after every record. */
const MAC = lines(["Name,Phone", "Asha,0712345604", "Baraka,0754345605"], CR);

/** C1h — the same two records with and without a final line end. */
const T_WITH = "Name,Phone" + CRLF + "Asha,0712345606" + CRLF;
const T_WITHOUT = "Name,Phone" + CRLF + "Asha,0712345606";
const T_ROWS = [{ line: 1, cells: ["Name", "Phone"] }, { line: 2, cells: ["Asha", "0712345606"] }];

/** C1i — an empty line, a row of commas, a quoted empty cell and a row of spaces between two rows. */
const BLANKS = lines(["Name,Phone", "Asha,0712345607", "", ",,", QUOTE + QUOTE, " , ", "Baraka,0754345608"]);

/** C1j, C1k — an inch mark inside an unquoted cell; text after a closing quotation mark. */
const INCH = lines(["Item,Phone", '5" screen,0712345609', "Redio,0754345610"]);
const STRAY = lines(["Name,Phone", '"abc"def,0712345611', "Juma,0754345612"]);
const STRAY_NOTE = "Row 2 has text after the closing quotation mark of a cell; that text was kept as part of the cell.";

/** C1l — ⭐ C3b · G1: row 4 opens a quotation mark and never closes it; three records came before it. */
const UNTERMINATED = lines(["Name,Phone", "Asha,0712345613", "Baraka,0754345614", '"Neema,0688345615', "Juma,0712345616"]);
/** The one sentence for the broken record, typed here as a LITERAL (the quotation mark from its code). */
const unclosedReason = (line: number): string =>
  `Row ${line} opens a quote (${QUOTE}) that is never closed, so it and everything after it could not be read. Close or remove that quote, or delete the row, and import again.`;
const UNTERMINATED_FILE = {
  format: "csv",
  fileName: null,
  rows: [
    { line: 1, cells: ["Name", "Phone"] },
    { line: 2, cells: ["Asha", "0712345613"] },
    { line: 3, cells: ["Baraka", "0754345614"] },
  ],
  width: 2,
  blankRows: 0,
  notes: [],
  unreadable: [{ line: 4, reason: unclosedReason(4) }],
};
/** C1l — the messy file's own shape: a quoted line break and a blank line before a record whose THIRD cell opens a
 *  quotation mark that never closes (line 5), and a record after it that the quote swallowed. */
const G1_MID =
  "Name,Phone,Notes" + CRLF + 'Asha,0712345613,"Line one' + CRLF + 'line two"' + CRLF + "Baraka,0754345614,ok" + CRLF + CRLF
  + 'Neema,0688345615,"never closed' + CRLF + "Juma,0712345616,ok" + CRLF;
const G1_MID_FILE = {
  format: "csv",
  fileName: null,
  rows: [
    { line: 1, cells: ["Name", "Phone", "Notes"] },
    { line: 2, cells: ["Asha", "0712345613", "Line one" + LF + "line two"] },
    { line: 3, cells: ["Baraka", "0754345614", "ok"] },
  ],
  width: 3,
  blankRows: 1,
  notes: [],
  unreadable: [{ line: 5, reason: unclosedReason(5) }],
};
/** C1lb — the CONTROLS: nothing before the broken quote was a record, so the file is still refused whole. */
const FIRST_BROKEN = QUOTE + "Name,Phone" + CRLF + "Asha,0712345613" + CRLF;
const BLANKS_THEN_BROKEN = CRLF + CRLF + QUOTE + "Neema,0688345615" + CRLF + "Juma,0712345616" + CRLF;
const unterminatedRefusal = (line: number) => ({
  ok: false,
  problem: "unterminated_quote",
  line,
  sentence:
    `Row ${line} opens a quotation mark that is never closed, so everything after it would be read as one cell. Close the quotation mark in row ${line} and choose the file again.`,
});

/** C1m — Excel's cell limit, literally: 32,767 characters is read, 32,768 is refused. */
const CELL_LIMIT = 32_767;
const longCell = (size: number): string => "Name,Notes" + CRLF + "Asha," + "x".repeat(size) + CRLF + "Juma,ok" + CRLF;
const LONG_OVER = longCell(CELL_LIMIT + 1);
const LONG_AT = longCell(CELL_LIMIT);
const OVER_REFUSAL = {
  ok: false,
  problem: "field_too_long",
  line: 2,
  sentence:
    "Row 2 has a cell longer than 32,767 characters, more than a spreadsheet cell can hold — usually a quotation mark that is never closed. Check row 2 and choose the file again.",
};

/** C1n — cells a reader must not touch: spaces, a leading zero, an apostrophe guard, Excel's shortened number. */
const RAW = lines(["Phone,Name", '" 0712 345 678 ",  Asha  ', "0712345617,'=1+2", "007,2.55713E+11"]);

/** C1o — the vote's cap, literally 1 MiB: a first record that is one quoted cell of 1,048,576 characters. */
const HEADER_LIMIT = 1_048_576;
let hugeText: string | null = null;
const huge = (): string => (hugeText ??= QUOTE + "a".repeat(HEADER_LIMIT) + QUOTE + CRLF + "b" + CRLF);
const HEADER_REFUSAL = {
  ok: false,
  problem: "header_too_long",
  line: 1,
  sentence:
    "Row 1, the first row with anything in it, does not end within the first 1,048,576 characters, so its columns cannot be worked out — usually a quotation mark that is never closed. Check row 1 and choose the file again.",
};

/** C2 — the byte-order mark and Excel's sep= line. */
const BOM_TEXT = BOM + "Name,Phone" + CRLF + "Asha,0712345618" + CRLF;
const NO_BOM = "Name,Phone" + CRLF + "Asha,0712345618" + CRLF;
const BOM_SEP = BOM + "sep=;" + CRLF + "Name;Phone" + CRLF + "Asha;0712345619" + CRLF;
const SEP_BEATS = "sep=;" + LF + "Name,Phone,Tags;Notes" + LF + "Asha,0712345620,vip;ok" + LF;
const QUOTED_SEP = QUOTE + "sep=," + QUOTE + CRLF + "Name,Phone" + CRLF + "Asha,0712345621" + CRLF;
const UPPER_SEP = "SEP=|" + LF + "Name|Phone" + LF + "Asha|0712345622" + LF;
const COLON_SEP = "sep=:" + CRLF + "Name;Phone" + CRLF + "Asha;0712345623" + CRLF;
const DATA_SEP = "Name,Phone" + CRLF + "Asha,0712345624" + CRLF + "sep=;" + CRLF;
const SEP_NOTE =
  "The first line of the file names a separator that is not a comma, semicolon, tab or pipe (|), so that line was skipped.";

/** C3a — ⭐ THE PLAN'S RED: the embedded-comma header, and a data row of the same shape. */
const ACCEPT = lines(['"Jina, kamili";Simu;"Makundi, lebo, zaidi"', '"Amina Juma, Mama";0712 345 625;"vip, Dar"']);
const ACCEPT_CELLS = [["Jina, kamili", "Simu", "Makundi, lebo, zaidi"], ["Amina Juma, Mama", "0712 345 625", "vip, Dar"]];

/** C3b — a semicolon file whose notes hold more bare commas (7) than the whole file holds semicolons (6). */
const WHOLE_FILE = lines([
  "Name;Phone;Notes",
  "Asha;0712345626;mpira, muziki, sinema, safari, chakula",
  "Baraka;0754345627;jioni, asubuhi, mchana, usiku",
]);
const WHOLE_FILE_CELLS = [
  ["Name", "Phone", "Notes"],
  ["Asha", "0712345626", "mpira, muziki, sinema, safari, chakula"],
  ["Baraka", "0754345627", "jioni, asubuhi, mchana, usiku"],
];

/** C3c–C3h. */
const TABS = lines(["Jina" + TAB + "Simu" + TAB + "Barua pepe", "Asha" + TAB + "0712345628" + TAB + "asha@example.com"]);
const PIPES = lines(["Name|Phone|Tags", "Asha|0712345629|vip"], LF);
const SINGLE = lines(["Phone", "0712345630", "0754345631,Asha", "0688345632"]);
const SINGLE_NOTE =
  "Every row was read as one column, but row 3 holds a comma, semicolon, tab or pipe (|) outside quotes. If the file has more than one column, choose its separator.";
const TIE = lines(["a,b;c", "1,2;3"], LF);
const TIE_NOTE =
  "Row 1 has the same number of commas and semicolons, so the file was read as comma-separated; if its columns look wrong, choose the separator.";
const LEAD_BLANKS = CRLF + CRLF + "Name;Phone" + CRLF + "Asha;0712345633" + CRLF;
const QNL_HEADER = QUOTE + "Jina" + LF + "la kwanza" + QUOTE + ";Simu;Maelezo" + CRLF + "Asha;0712345634;ok" + CRLF;
const OV_SEP = "sep=;" + CRLF + "a|b;c" + CRLF + "1|2;3" + CRLF;
const OV_VOTE = "a,b|c" + LF + "1,2|3" + LF;

/** C4 — the small end, and the Accept line's corpus. */
const FORTY = lines([
  "Name,Phone,Notes",
  ...Array.from({ length: 39 }, (_, k) => `"Mteja ${k + 1}, Mama",0712${pad(k + 1, 6)},note ${k + 1}`),
]);
const CHUNK = 4_093;
const CORPUS_HEADER = "Name,Phone,Notes";
const CORPUS_DATA_ROWS = 149_999;
const CORPUS_ROWS = 150_000;
const CORPUS_BLANKS = 5;
const CORPUS_RECORDS = 150_005;
let corpusText: string | null = null;
/** The header, then data row i: a quoted name holding a comma, a phone, a note; a blank line after every 25,000th. */
const corpus = (): string => {
  if (corpusText !== null) return corpusText;
  const parts: string[] = [CORPUS_HEADER + CRLF];
  for (let i = 1; i <= CORPUS_DATA_ROWS; i++) {
    parts.push(`"Mteja ${pad(i, 6)}, Dar",0712${pad(i, 6)},note ${i}${CRLF}`);
    if (i % 25_000 === 0 && i < CORPUS_DATA_ROWS) parts.push(CRLF);
  }
  corpusText = parts.join("");
  return corpusText;
};
/** Emitted row k (1-based) as it must read — computed from how the corpus was written, never by a parser. */
const corpusRow = (k: number): ParsedRow => {
  if (k === 1) return { line: 1, cells: ["Name", "Phone", "Notes"] };
  const i = k - 1;
  return { line: 1 + i + Math.floor((i - 1) / 25_000), cells: [`Mteja ${pad(i, 6)}, Dar`, `0712${pad(i, 6)}`, `note ${i}`] };
};
const CHECKPOINTS = [1, 2, ...Array.from({ length: 15 }, (_, k) => (k + 1) * 10_000)];

/** C5 — Excel's Unicode Text, and a windows-1252 file decoded as UTF-8. */
const UNICODE_TEXT = lines(["Jina" + TAB + "Simu" + TAB + "Makundi", "Asha" + TAB + "0712345636" + TAB + "vip"]);
const REPLACEMENT_NOTE = `Rows 2 and 4 hold characters that could not be read in the file's text encoding. If the file came from Excel, save it as CSV UTF-8 and choose it again; before you save, ${PHONE_FORMAT_REMEDY}.`;

/** C6 — heads. */
const VCARD_TEXT = lines(["BEGIN:VCARD", "VERSION:3.0", "FN:Asha Mwakalinga", "TEL;TYPE=CELL:0712345641", "END:VCARD"]);
const CFB_HEAD = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const PNG_HEAD = [
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x10, 0x08, 0x06, 0x00, 0x00, 0x00,
];
const EMPTY_SENTENCE = "This file is empty, so there is nothing to import. Choose the file that holds the contacts.";
/** A zip whose FIRST local entry is `name` holding `data`, stored (method 0) — enough head for the classifier. */
function zipHead(name: string, data: string): Uint8Array {
  const n = ascii(name);
  const d = ascii(data);
  const lo = d.length & 255;
  const hi = (d.length >> 8) & 255;
  const header = [0x50, 0x4b, 0x03, 0x04, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, lo, hi, 0, 0, lo, hi, 0, 0, n.length, 0, 0, 0];
  return Uint8Array.from([...header, ...n, ...d]);
}

/** C7 — 60 rows with text after a closing quotation mark. */
const SIXTY = lines(["Name,Phone", ...Array.from({ length: 60 }, (_, k) => `"a"b,07123456${pad(k, 2)}`)]);
const SIXTY_NOTE = `Rows ${Array.from({ length: 50 }, (_, k) => k + 2).join(", ")} and 10 more have text after the closing quotation mark of a cell; that text was kept as part of the cell.`;
/** Cells §C7b's sentences must never carry. */
const CELL_PROBES = ["abcdef", "Neema", "0688345615", "0712345611"];

/* ══ THE SCANNERS (§C8) ═════════════════════════════════════════════════════════════════════════ */

const IMPORT_FORMS = [
  /^\s*(?:import|export)\b[^;=]*?\bfrom\s*["']([^"']+)["']/gm,
  /^\s*import\s*["']([^"']+)["']/gm,
  /\bimport\s*\(\s*["']([^"']+)["']/g,
  /\brequire\s*\(\s*["']([^"']+)["']/g,
];
function specifiers(src: string): string[] {
  const out: string[] = [];
  for (const form of IMPORT_FORMS) for (const m of src.matchAll(form)) out.push(m[1]);
  return out;
}
/** C17 · a sibling in src/lib/contacts, or tz-msisdn — nothing else. */
const permittedImport = (s: string): boolean => (s.startsWith("./") && !s.slice(2).includes("/")) || s === "../tz-msisdn";
const NEEDED_IMPORTS = ["./parsed-file", "./vcard", "./xlsx-limits"];
const DIRECTIVE = /^\s*["']use (?:client|server)["']/;
const SERVER_ONLY = /["']server-only["']/;
const NODE_BUILTIN = /["']node:/;
const CONSOLE = /\bconsole\s*\./;
const LOWER_INCLUDES = /\.toLowerCase\(\)\s*\.includes\(/;
const importsName = (src: string, name: string, from: string): boolean =>
  [...src.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']([^"']+)["']/g)].some(
    (m) => m[2] === from && m[1].split(",").some((part) => part.trim().replace(/^type\s+/, "") === name),
  );

/* ══ THE ASSERTION LABELS — one place, so a plant names exactly the line it must turn red ═══════════ */

export const L = {
  C1a: "C1a · a plain comma file gives the exact C15 file — every cell and line, width 3, no blank rows, no notes, format csv, its file name — and isParsedContactsFile holds",
  C1b: "C1b · a quoted cell keeps its comma: the quoted 'Mwanaisha, Mama' beside 0712 345 678 is two cells (a quote-blind splitter makes three)",
  C1c: "C1c · a doubled quotation mark inside a quoted cell reads as ONE mark",
  C1d: "C1d · a line break inside quotes — LF or CRLF — stays in ONE cell as a single LF, and the record is one row",
  C1e: "C1e · ⭐ line is the record as Excel numbers it: the record after a quoted line break is +1, not +2 (physical-line numbering is the plan's RED)",
  C1f: "C1f · with CRLF line ends no cell anywhere holds a CR",
  C1g: "C1g · a lone CR (old Mac Excel) ends a record",
  C1h: "C1h · a final line end adds no record, blank or not, and a missing one still keeps the last record",
  C1i: "C1i · blank records — an empty line, a row of commas, a quoted empty cell, spaces — are never emitted, are counted in blankRows, and keep their numbers: the row after four of them is on line 7",
  C1j: "C1j · a quotation mark inside an unquoted cell is literal: the 5-inch screen keeps its mark in one cell, and no note is written",
  C1k: "C1k · text after a closing quotation mark is kept (a quoted abc then def reads abcdef) with ONE note naming row 2",
  C1l: "C1l · ⭐ C3b · G1 — ONE broken quote no longer costs the file: every record BEFORE the record that opens a quotation mark never closed is kept (rows 1–3 of a five-line file; rows 1–3 after a quoted line break, with a blank line counted), and that record with everything it swallowed is ONE unreadable record on its own line (4; 5), its sentence naming the row and the way out, never a cell — the records count holds it, no swallowed cell becomes a row, and isParsedContactsFile holds",
  C1lb: "C1lb · ⛔ CONTROL · G1 — when NOTHING before the broken quote was a record (it opens the first record; or only blank lines come before it) the file is still a REFUSAL naming that row (1; 3), never a file",
  C1m: "C1m · ⛔ a cell of 32,768 characters is a refusal naming its row, in one chunk or in 1,000-character chunks, while 32,767 characters is read",
  C1n: "C1n · cells stay RAW — spaces, a leading zero, an apostrophe guard and Excel's 2.55713E+11 as written: no trim, no coercion, no unguard",
  C1o: "C1o · ⛔ a first record that does not end within 1 MiB is a refusal naming row 1, in one chunk or in 64 KB chunks",
  C2a: "C2a · ⭐ the byte-order mark is stripped (C19): the first cell is exactly Name, hadBom is true, the file equals the one without the mark, and no note is written",
  C2b: "C2b · a BOM then sep=; gives the semicolon from the directive, and the header is row 1 — Excel hides the sep= line",
  C2c: "C2c · sep=; beats a header whose own vote says comma (sep= ignored is the plan's RED)",
  C2d: "C2d · the quoted and the upper-case directives are honoured, sep=: is noted and skipped with the vote deciding, and sep=; in row 3 is plain data",
  C3a: "C3a · ⭐ THE PLAN'S RED — the embedded-comma header (Jina, kamili and Makundi, lebo, zaidi quoted; Simu bare; semicolons between) reads as semicolon-separated: its quoting breaks under a comma, the two candidates count 2 each, and it gives exactly 3 cells with 'Jina, kamili' intact — its data row too",
  C3b: "C3b · the vote reads the header only: a semicolon file whose notes hold more bare commas than the whole file holds semicolons is still semicolon-separated (a whole-file vote is the plan's RED)",
  C3c: "C3c · a tab file (an Excel paste, Unicode Text) votes tab, and a pipe file votes pipe",
  C3d: "C3d · a header with no candidate gives ONE column, and a later row holding a comma is named in a note",
  C3e: "C3e · a tie (a,b;c) goes to the candidate order — comma — and is named in a note",
  C3f: "C3f · two leading blank lines put the vote on the FIRST NON-BLANK record: voteLine 3, and the first row on line 3",
  C3g: "C3g · a header whose first cell is quoted across a line break completes the vote across it",
  C3h: "C3h · a manual delimiter beats sep= and the vote, and the sep= line stays hidden",
  C3i: "C3i · self-consistency: for every fixture without sep= or a manual choice, the reader's delimiter and vote line are voteDelimiter's, and the vote line is the first row's",
  C4a: "C4a · ⭐ STREAMING — every two-chunk split and 1-character chunks of every sweep fixture read exactly as one push (rows, lines, notes, refusals and every count but the work counter), and parseCsv is that one push",
  C4b: "C4b · ⭐ ACCEPT — each character is tokenized ONCE, by the reader's own counter: the 40-row fixture in 1-character chunks and the 150,000-row corpus in 4,093-character chunks tokenize exactly their length, and the vote reads only the header",
  C4c: "C4c · ⭐ ACCEPT — the 150,000-row corpus in 4,093-character chunks equals its one-chunk parse: 150,000 rows, the last on line 150,005 = the records counted, 5 blank rows, every 10,000th row exact",
  C4d: "C4d · the small end is the same path: the 40-row fixture is ONE synchronous parseCsv call (no Promise) giving 40 rows, equal to the reader fed 1 character at a time",
  C5a: "C5a · sniffEncoding: the three BOMs; ASCII is utf-8; a 0xE9 or a 0x92 byte is windows-1252; a 3-byte character cut at byte 4,096 is still utf-8; BOM-less UTF-16 is found either way round; zeros alone are not UTF-16",
  C5b: "C5b · Excel's Unicode Text (FF FE, UTF-16LE, tabs, CRLF) built in memory reads as 3 tab-separated columns whose first cell is exactly Jina, with hadBom true",
  C5c: "C5c · rows still holding U+FFFD after the decode are counted and named in ONE note that carries the one phone-format remedy",
  C5d: "C5d · ⭐ ONE decode-time stripper: DECODE_OPTIONS is fatal false, ignoreBOM true, so decodeBytes passes the mark through (EF BB BF 41 and FF FE 41 00 are U+FEFF then A) and the reader strips it — while the platform default eats it (the control)",
  C6a: "C6a · ⭐ content beats the name: contacts.txt holding a vCard is vcard (named csv, mismatch), x.vcf holding CSV lines is csv (named vcard, mismatch), and kadi.vcf holding a vCard is no mismatch",
  C6b: "C6b · spreadsheets go through xlsx-limits' ONE classifier and copy (C18): an OOXML zip named .csv is xlsx; a CSV starting PK is text; an old .xls, a protected workbook (its marker past 4 KB) and an .ods are refused with xlsxRefusalSentence's own sentences",
  C6c: "C6c · a PDF, a web page saved as .xls, an XML file and a picture are refused with the copy table's not-a-workbook sentence; nothing, a lone BOM or only spaces is empty — but 4 KB of spaces then rows is CSV",
  C6d: "C6d · the sniffed encoding decides the text checks: a BOM'd UTF-8 file of lower-case vCards behind blank lines, UTF-16LE CSV and UTF-16LE vCards are each recognised",
  C7a: "C7a · notes are capped: 60 rows with text after a closing mark make ONE note naming the first 50 rows and the 10 more, while warnings counts all 60",
  C7b: "C7b · every note, refusal and detection sentence the run produced is a sentence — it ends with a period, carries no code word and no 7-digit run, and never a cell's text (§5.14)",
  C8a: "C8a · ⛔ PURITY (C17) — import-parse.ts imports only src/lib/contacts modules (./parsed-file, ./vcard, ./xlsx-limits): no directive, no server-only, no node:, no console, no .toLowerCase().includes(",
  C8b: "C8b · ⛔ every special character is a char code: the source holds no backslash, no raw control character but its line ends, no BOM, no U+FFFD and no no-break space",
  C8c: "C8c · ⛔ ONE OF EACH — no guard pair (C16), no second ParsedContactsFile (C15), no own vCard sniff (C17), no own spreadsheet magic or sentence (C18), no shortened-number detector (M6); the shared ones are imported",
} as const;

/* ══ THE ASSERTIONS ═════════════════════════════════════════════════════════════════════════════ */

function run(ctx: SectionContext<CsvImpl>): void {
  const { impl, ok, log } = ctx;
  const reads: Read[] = [];
  const read = (text: string, options?: CsvReaderOptions): Read => {
    const r = readText(impl, text, options);
    reads.push(r);
    return r;
  };
  const readIn = (chunks: readonly string[], options?: CsvReaderOptions): Read => {
    const r = readChunks(impl, chunks, options);
    reads.push(r);
    return r;
  };
  const detected: string[] = [];
  const detect = (head: Uint8Array, fileName: string | null): DetectedFormat => {
    const d = impl.detect(head, fileName);
    if (!d.ok) detected.push(d.sentence);
    return d;
  };

  // ── C1 · RFC 4180, AS EXCEL WRITES IT ──────────────────────────────────────────────────────────
  const plain = read(PLAIN, { fileName: "orodha.csv" });
  ok(L.C1a, same(fileOf(plain), PLAIN_FILE) && isParsedContactsFile(fileOf(plain))
    && plain.stats.delimiter === "comma" && plain.stats.source === "vote", brief(plain));

  const quotedComma = read(QUOTED_COMMA);
  ok(L.C1b, same(cellsOf(quotedComma), [["Name", "Phone"], ["Mwanaisha, Mama", "0712 345 678"]]), visible(cellsOf(quotedComma)));

  const doubled = read(DOUBLED);
  ok(L.C1c, same(cellsOf(doubled), [["Name", "Phone"], ['Asha "Mama" Juma', "0712345603"]]), visible(cellsOf(doubled)));

  const embedLf = read(EMBED_LF);
  const embedCrlf = read(EMBED_CRLF);
  ok(L.C1d, same(cellsOf(embedLf), EMBED_CELLS) && same(cellsOf(embedCrlf), EMBED_CELLS),
    `LF ${visible(cellsOf(embedLf))} · CRLF ${visible(cellsOf(embedCrlf))}`);
  ok(L.C1e, same(linesOf(embedLf), [1, 2, 3]) && same(linesOf(embedCrlf), [1, 2, 3]),
    `LF lines ${linesOf(embedLf).join(",")} · CRLF lines ${linesOf(embedCrlf).join(",")}`);

  const blanks = read(BLANKS);
  const crCells = [plain, embedCrlf, blanks].flatMap((r) => cellsOf(r).flat()).filter((c) => c.includes(CR));
  ok(L.C1f, crCells.length === 0 && rowsOf(plain).length === 3 && rowsOf(embedCrlf).length === 3 && rowsOf(blanks).length === 3,
    crCells.length ? `cells with a CR: ${visible(crCells.slice(0, 3))}` : "no CR in any cell");

  const mac = read(MAC);
  ok(L.C1g, same(rowsOf(mac), [
    { line: 1, cells: ["Name", "Phone"] },
    { line: 2, cells: ["Asha", "0712345604"] },
    { line: 3, cells: ["Baraka", "0754345605"] },
  ]) && mac.stats.records === 3, `${brief(mac)} · ${visible(cellsOf(mac))}`);

  const withEnd = read(T_WITH);
  const withoutEnd = read(T_WITHOUT);
  ok(L.C1h, same(rowsOf(withEnd), T_ROWS) && same(rowsOf(withoutEnd), T_ROWS)
    && withEnd.stats.records === 2 && withoutEnd.stats.records === 2
    && fileOf(withEnd)?.blankRows === 0 && fileOf(withoutEnd)?.blankRows === 0,
    `with ${brief(withEnd)}, ${withEnd.stats.records} record(s), ${fileOf(withEnd)?.blankRows ?? "?"} blank · without ${brief(withoutEnd)}, ${withoutEnd.stats.records} record(s)`);

  ok(L.C1i, same(linesOf(blanks), [1, 2, 7]) && fileOf(blanks)?.blankRows === 4 && blanks.stats.records === 7
    && same(cellsOf(blanks)[2], ["Baraka", "0754345608"]) && isParsedContactsFile(fileOf(blanks)),
    `${brief(blanks)} · ${fileOf(blanks)?.blankRows ?? "?"} blank of ${blanks.stats.records} record(s)`);

  const inch = read(INCH);
  ok(L.C1j, same(cellsOf(inch), [["Item", "Phone"], ['5" screen', "0712345609"], ["Redio", "0754345610"]])
    && same(fileOf(inch)?.notes, []), `${brief(inch)} · ${visible(cellsOf(inch))}`);

  const stray = read(STRAY);
  ok(L.C1k, same(cellsOf(stray)[1], ["abcdef", "0712345611"]) && same(fileOf(stray)?.notes, [STRAY_NOTE])
    && stray.stats.warnings === 1, `${visible(cellsOf(stray)[1])} · notes ${visible(fileOf(stray)?.notes ?? [])} · ${stray.stats.warnings} warning(s)`);

  const unterminated = read(UNTERMINATED);
  const midBroken = read(G1_MID);
  const swallowed = [unterminated, midBroken].flatMap((r) => cellsOf(r).flat()).filter((c) => c.includes("Neema") || c.includes("Juma"));
  const g1Faults = [
    same(fileOf(unterminated), UNTERMINATED_FILE) && unterminated.stats.records === 4 && unterminated.stats.refused === null
      ? "" : `the five-line file: ${brief(unterminated)} · ${visible(fileOf(unterminated)?.unreadable ?? [])} · ${unterminated.stats.records} record(s)`,
    same(fileOf(midBroken), G1_MID_FILE) && midBroken.stats.records === 5
      ? "" : `the quoted-break file: ${brief(midBroken)} · ${visible(fileOf(midBroken)?.unreadable ?? [])} · ${midBroken.stats.records} record(s)`,
    isParsedContactsFile(fileOf(unterminated)) && isParsedContactsFile(fileOf(midBroken)) ? "" : "not a valid ParsedContactsFile",
    swallowed.length === 0 ? "" : `a swallowed cell became a row: ${visible(swallowed)}`,
  ].filter((x) => x !== "");
  ok(L.C1l, g1Faults.length === 0, g1Faults.join(" | ") || `${brief(unterminated)} · ${brief(midBroken)}`);

  const firstBroken = read(FIRST_BROKEN);
  const blanksBroken = read(BLANKS_THEN_BROKEN);
  ok(L.C1lb, same(firstBroken.result, unterminatedRefusal(1)) && same(blanksBroken.result, unterminatedRefusal(3)),
    `first record: ${brief(firstBroken)} · after two blank lines: ${brief(blanksBroken)}`);

  const over = read(LONG_OVER);
  const overChunked = readIn(chunked(LONG_OVER, 1000));
  const atLimit = read(LONG_AT);
  ok(L.C1m, MAX_FIELD_CHARS === CELL_LIMIT && same(over.result, OVER_REFUSAL) && same(overChunked.result, OVER_REFUSAL)
    && atLimit.result.ok && rowsOf(atLimit).length === 3 && rowsOf(atLimit)[1]?.cells[1]?.length === CELL_LIMIT,
    `over: ${brief(over)} · over in 1,000s: ${brief(overChunked)} · at the limit: ${brief(atLimit)}`);

  const raw = read(RAW);
  ok(L.C1n, same(cellsOf(raw), [["Phone", "Name"], [" 0712 345 678 ", "  Asha  "], ["0712345617", "'=1+2"], ["007", "2.55713E+11"]]),
    visible(cellsOf(raw)));

  const hugeOne = read(huge());
  const hugeChunked = readIn(chunked(huge(), 65_536));
  ok(L.C1o, MAX_HEADER_CHARS === HEADER_LIMIT && same(hugeOne.result, HEADER_REFUSAL) && same(hugeChunked.result, HEADER_REFUSAL),
    `one chunk: ${brief(hugeOne)} · 64 KB chunks: ${brief(hugeChunked)}`);

  // ── C2 · THE BYTE-ORDER MARK AND sep= ──────────────────────────────────────────────────────────
  const bom = read(BOM_TEXT);
  const noBom = read(NO_BOM);
  ok(L.C2a, rowsOf(bom)[0]?.cells[0] === "Name" && bom.stats.hadBom && !noBom.stats.hadBom
    && same(fileOf(bom), fileOf(noBom)) && same(fileOf(bom)?.notes, []),
    `first cell ${visible(rowsOf(bom)[0]?.cells[0] ?? "none")} · hadBom ${bom.stats.hadBom} · notes ${visible(fileOf(bom)?.notes ?? [])}`);

  const bomSep = read(BOM_SEP);
  ok(L.C2b, same(rowsOf(bomSep), [{ line: 1, cells: ["Name", "Phone"] }, { line: 2, cells: ["Asha", "0712345619"] }])
    && bomSep.stats.source === "sep" && bomSep.stats.delimiter === "semicolon" && bomSep.stats.records === 2 && bomSep.stats.hadBom,
    brief(bomSep));

  const sepBeats = read(SEP_BEATS);
  const headerVote = impl.vote("Name,Phone,Tags;Notes" + LF);
  ok(L.C2c, headerVote.delimiter === "comma" && sepBeats.stats.source === "sep" && sepBeats.stats.delimiter === "semicolon"
    && same(rowsOf(sepBeats), [{ line: 1, cells: ["Name,Phone,Tags", "Notes"] }, { line: 2, cells: ["Asha,0712345620,vip", "ok"] }]),
    `the header alone votes ${headerVote.delimiter ?? "nothing"} · ${brief(sepBeats)} · ${visible(cellsOf(sepBeats))}`);

  const quotedSep = read(QUOTED_SEP);
  const upperSep = read(UPPER_SEP);
  const colonSep = read(COLON_SEP);
  const dataSep = read(DATA_SEP);
  const sepFaults = [
    quotedSep.stats.source === "sep" && quotedSep.stats.delimiter === "comma"
      && same(rowsOf(quotedSep), [{ line: 1, cells: ["Name", "Phone"] }, { line: 2, cells: ["Asha", "0712345621"] }])
      ? "" : `quoted: ${brief(quotedSep)}`,
    upperSep.stats.source === "sep" && upperSep.stats.delimiter === "pipe"
      && same(rowsOf(upperSep), [{ line: 1, cells: ["Name", "Phone"] }, { line: 2, cells: ["Asha", "0712345622"] }])
      ? "" : `upper case: ${brief(upperSep)}`,
    colonSep.stats.source === "vote" && colonSep.stats.delimiter === "semicolon"
      && same(rowsOf(colonSep), [{ line: 1, cells: ["Name", "Phone"] }, { line: 2, cells: ["Asha", "0712345623"] }])
      && same(fileOf(colonSep)?.notes, [SEP_NOTE])
      ? "" : `sep=: ${brief(colonSep)}`,
    dataSep.stats.delimiter === "comma" && same(rowsOf(dataSep)[2], { line: 3, cells: ["sep=;"] }) ? "" : `data: ${brief(dataSep)}`,
  ].filter((x) => x !== "");
  ok(L.C2d, sepFaults.length === 0, sepFaults.join(" | ") || "4 directives");

  // ── C3 · THE VOTE ──────────────────────────────────────────────────────────────────────────────
  const accept = read(ACCEPT);
  ok(L.C3a, accept.stats.delimiter === "semicolon" && accept.stats.source === "vote"
    && same(accept.stats.counts, { comma: 2, semicolon: 2, tab: 0, pipe: 0 }) && same(accept.stats.irregular, ["comma", "tab", "pipe"])
    && same(cellsOf(accept), ACCEPT_CELLS) && fileOf(accept)?.width === 3 && same(fileOf(accept)?.notes, []),
    `${brief(accept)} · counts ${visible(accept.stats.counts)} · irregular ${accept.stats.irregular.join(",") || "none"} · ${visible(cellsOf(accept))}`);

  const wholeFile = read(WHOLE_FILE);
  const commas = countChar(WHOLE_FILE, ",");
  const semicolons = countChar(WHOLE_FILE, ";");
  ok(L.C3b, commas > semicolons && wholeFile.stats.delimiter === "semicolon" && same(cellsOf(wholeFile), WHOLE_FILE_CELLS),
    `the file holds ${commas} commas and ${semicolons} semicolons · ${brief(wholeFile)}`);

  const tabs = read(TABS);
  const pipes = read(PIPES);
  ok(L.C3c, tabs.stats.delimiter === "tab" && same(cellsOf(tabs), [["Jina", "Simu", "Barua pepe"], ["Asha", "0712345628", "asha@example.com"]])
    && pipes.stats.delimiter === "pipe" && same(cellsOf(pipes), [["Name", "Phone", "Tags"], ["Asha", "0712345629", "vip"]]),
    `tabs: ${brief(tabs)} · pipes: ${brief(pipes)}`);

  const single = read(SINGLE);
  ok(L.C3d, single.stats.source === "single_column" && single.stats.delimiter === null
    && same(rowsOf(single), [
      { line: 1, cells: ["Phone"] },
      { line: 2, cells: ["0712345630"] },
      { line: 3, cells: ["0754345631,Asha"] },
      { line: 4, cells: ["0688345632"] },
    ]) && same(fileOf(single)?.notes, [SINGLE_NOTE]),
    `${brief(single)} · notes ${visible(fileOf(single)?.notes ?? [])}`);

  const tie = read(TIE);
  ok(L.C3e, tie.stats.delimiter === "comma" && tie.stats.tie && same(cellsOf(tie), [["a", "b;c"], ["1", "2;3"]])
    && same(fileOf(tie)?.notes, [TIE_NOTE]), `${brief(tie)} · tie ${tie.stats.tie} · notes ${visible(fileOf(tie)?.notes ?? [])}`);

  const leadBlanks = read(LEAD_BLANKS);
  ok(L.C3f, leadBlanks.stats.voteLine === 3 && same(linesOf(leadBlanks), [3, 4]) && leadBlanks.stats.delimiter === "semicolon"
    && fileOf(leadBlanks)?.blankRows === 2 && leadBlanks.stats.records === 4,
    `voteLine ${leadBlanks.stats.voteLine ?? "none"} · ${brief(leadBlanks)}`);

  const qnl = read(QNL_HEADER);
  ok(L.C3g, qnl.stats.delimiter === "semicolon" && same(rowsOf(qnl), [
    { line: 1, cells: ["Jina" + LF + "la kwanza", "Simu", "Maelezo"] },
    { line: 2, cells: ["Asha", "0712345634", "ok"] },
  ]), `${brief(qnl)} · ${visible(cellsOf(qnl))}`);

  const ovSep = read(OV_SEP, { delimiter: "pipe" });
  const ovVote = read(OV_VOTE, { delimiter: "pipe" });
  ok(L.C3h, ovSep.stats.source === "override" && ovSep.stats.delimiter === "pipe"
    && same(rowsOf(ovSep), [{ line: 1, cells: ["a", "b;c"] }, { line: 2, cells: ["1", "2;3"] }])
    && ovVote.stats.source === "override" && same(cellsOf(ovVote), [["a,b", "c"], ["1,2", "3"]]),
    `over sep=: ${brief(ovSep)} · over the vote: ${brief(ovVote)}`);

  const SELF: ReadonlyArray<readonly [string, string]> = [
    ["plain", PLAIN], ["quoted comma", QUOTED_COMMA], ["doubled", DOUBLED], ["embedded LF", EMBED_LF],
    ["embedded CRLF", EMBED_CRLF], ["blanks", BLANKS], ["accept", ACCEPT], ["whole file", WHOLE_FILE], ["tabs", TABS],
    ["pipes", PIPES], ["single column", SINGLE], ["tie", TIE], ["leading blanks", LEAD_BLANKS],
    ["quoted header line break", QNL_HEADER], ["lone CR", MAC], ["stray", STRAY], ["inch", INCH], ["bom", BOM_TEXT],
  ];
  const selfMisses: string[] = [];
  for (const [name, text] of SELF) {
    const r = readText(impl, text);
    const v = impl.vote(text);
    const first = rowsOf(r)[0]?.line ?? null;
    if (!(r.stats.delimiter === v.delimiter && r.stats.voteLine === v.line && (v.delimiter === null || first === v.line))) {
      selfMisses.push(`${name}: reader ${r.stats.delimiter ?? "one column"} on ${r.stats.voteLine ?? "-"}, vote ${v.delimiter ?? "one column"} on ${v.line ?? "-"}, first row ${first ?? "-"}`);
    }
  }
  ok(L.C3i, selfMisses.length === 0, selfMisses.slice(0, 3).join(" | ") || `${SELF.length} fixtures agree`);

  // ── C4 · STREAMING, BOTH ENDS ──────────────────────────────────────────────────────────────────
  const SWEEP: ReadonlyArray<readonly [string, string]> = [
    ["plain", PLAIN], ["doubled", DOUBLED], ["embedded CRLF", EMBED_CRLF], ["embedded LF", EMBED_LF], ["blanks", BLANKS],
    ["accept", ACCEPT], ["BOM and sep=;", BOM_SEP], ["quoted sep=", QUOTED_SEP], ["sep=:", COLON_SEP],
    ["quoted header line break", QNL_HEADER], ["lone CR", MAC], ["stray", STRAY], ["unterminated", UNTERMINATED],
    ["unterminated after a quoted line break", G1_MID], ["the first record unterminated", FIRST_BROKEN],
    ["leading blanks", LEAD_BLANKS], ["tie", TIE], ["single column", SINGLE],
  ];
  const sweepMisses: string[] = [];
  let splits = 0;
  for (const [name, text] of SWEEP) {
    const whole = readText(impl, text);
    const key = observable(whole);
    if (JSON.stringify(impl.parse(text)) !== JSON.stringify(whole.result)) sweepMisses.push(`${name}: parseCsv differs from one push`);
    for (let k = 0; k <= text.length; k++) {
      splits++;
      if (observable(readChunks(impl, [text.slice(0, k), text.slice(k)])) !== key) {
        sweepMisses.push(`${name}: split at ${k} of ${text.length}`);
        break;
      }
    }
    if (observable(readChunks(impl, text.split(""))) !== key) sweepMisses.push(`${name}: 1-character chunks`);
  }
  ok(L.C4a, sweepMisses.length === 0,
    sweepMisses.slice(0, 4).join(" | ") || `${SWEEP.length} fixtures, ${splits} two-chunk splits and 1-character chunks, all equal`);

  const fortyByChar = readChunks(impl, FORTY.split(""));
  const corpusChunks = chunked(corpus(), CHUNK);
  const corpusChunked = readChunks(impl, corpusChunks);
  log(`C4 corpus: ${corpus().length} characters in ${corpusChunks.length} chunks of ${CHUNK} · the 40-row fixture is ${FORTY.length} characters`);
  ok(L.C4b, fortyByChar.result.ok && fortyByChar.stats.charsInput === FORTY.length && fortyByChar.stats.charsTokenized === FORTY.length
    && corpusChunked.result.ok && corpusChunked.stats.charsInput === corpus().length && corpusChunked.stats.charsTokenized === corpus().length
    && corpusChunked.stats.charsVoted > 0 && corpusChunked.stats.charsVoted <= 4 * (CORPUS_HEADER.length + 2),
    `40 rows by the character: ${fortyByChar.stats.charsTokenized} tokenized of ${fortyByChar.stats.charsInput} input (${FORTY.length}) · ` +
    `corpus: ${corpusChunked.stats.charsTokenized} tokenized of ${corpusChunked.stats.charsInput} input (${corpus().length}), the vote read ${corpusChunked.stats.charsVoted}`);

  const corpusWhole = readText(impl, corpus());
  const chunkRows = rowsOf(corpusChunked);
  let wrongRow = -1;
  for (const k of CHECKPOINTS) {
    if (!same(chunkRows[k - 1], corpusRow(k))) {
      wrongRow = k;
      break;
    }
  }
  const lastRow = chunkRows[chunkRows.length - 1];
  ok(L.C4c, corpusChunked.result.ok && corpusWhole.result.ok && chunkRows.length === CORPUS_ROWS
    && lastRow !== undefined && lastRow.line === corpusChunked.stats.records && corpusChunked.stats.records === CORPUS_RECORDS
    && fileOf(corpusChunked)?.blankRows === CORPUS_BLANKS && wrongRow < 0 && observable(corpusChunked) === observable(corpusWhole),
    `${chunkRows.length} rows, last on line ${lastRow?.line ?? "none"}, ${corpusChunked.stats.records} records, ${fileOf(corpusChunked)?.blankRows ?? "?"} blank · ` +
    `first wrong checkpoint ${wrongRow < 0 ? "none" : wrongRow} · chunked ${observable(corpusChunked) === observable(corpusWhole) ? "equals" : "DIFFERS FROM"} one chunk`);

  const small = impl.parse(FORTY);
  const promised = typeof (small as unknown as { then?: unknown }).then === "function";
  ok(L.C4d, !promised && small.ok && small.file.rows.length === 40 && JSON.stringify(small) === JSON.stringify(fortyByChar.result),
    `${promised ? "a Promise" : "synchronous"} · ${small.ok ? `${small.file.rows.length} rows` : "refused"} · ${JSON.stringify(small) === JSON.stringify(fortyByChar.result) ? "equal" : "NOT equal"} to the 1-character feed`);

  // ── C5 · FROM BYTES TO TEXT ────────────────────────────────────────────────────────────────────
  const SNIFFS: ReadonlyArray<readonly [string, Uint8Array, TextEncodingLabel, boolean]> = [
    ["the UTF-8 BOM", bytes([0xef, 0xbb, 0xbf, 0x41]), "utf-8", true],
    ["the UTF-16LE BOM", bytes([0xff, 0xfe, 0x41, 0x00]), "utf-16le", true],
    ["the UTF-16BE BOM", bytes([0xfe, 0xff, 0x00, 0x41]), "utf-16be", true],
    ["plain ASCII", utf8("Name,Phone" + CRLF), "utf-8", false],
    ["a windows-1252 0xE9", bytes([...ascii("Jos"), 0xe9, ...ascii(",0712345635" + CRLF)]), "windows-1252", false],
    ["a windows-1252 0x92", bytes([...ascii("Mama"), 0x92, ...ascii("s shop" + CRLF)]), "windows-1252", false],
    ["a 3-byte character cut at byte 4,096", bytes([...new Array<number>(4094).fill(0x41), 0xe2, 0x80]), "utf-8", false],
    ["BOM-less UTF-16LE", bytes(utf16le("Name,Phone" + CRLF)), "utf-16le", false],
    ["BOM-less UTF-16BE", bytes(utf16be("Name,Phone" + CRLF)), "utf-16be", false],
    ["zeros alone", new Uint8Array(16), "utf-8", false],
  ];
  const sniffMisses = SNIFFS.filter(([, head, encoding, bom]) => {
    const s = impl.sniff(head);
    return s.encoding !== encoding || s.bom !== bom;
  }).map(([name, head]) => `${name} → ${visible(impl.sniff(head))}`);
  ok(L.C5a, sniffMisses.length === 0, sniffMisses.join(" | ") || `${SNIFFS.length} heads`);

  const unicodeBytes = bytes([0xff, 0xfe, ...utf16le(UNICODE_TEXT)]);
  const unicodeSniff = impl.sniff(unicodeBytes);
  const unicode = read(impl.decode(unicodeBytes, unicodeSniff.encoding));
  ok(L.C5b, unicodeSniff.encoding === "utf-16le" && unicodeSniff.bom && unicode.stats.hadBom && unicode.stats.delimiter === "tab"
    && same(cellsOf(unicode), [["Jina", "Simu", "Makundi"], ["Asha", "0712345636", "vip"]]),
    `sniffed ${visible(unicodeSniff)} · ${brief(unicode)} · ${visible(cellsOf(unicode))}`);

  const replacementBytes = bytes([
    ...ascii("Name,Phone" + CRLF + "Jos"), 0xe9, ...ascii(",0712345637" + CRLF + "Asha,0754345638" + CRLF + "M"), 0xe9,
    ...ascii("ma,0688345639" + CRLF),
  ]);
  const replacementText = impl.decode(replacementBytes, "utf-8");
  const replaced = read(replacementText);
  ok(L.C5c, replacementText.includes(FFFD) && replaced.stats.replacementRows === 2 && cellsOf(replaced)[1]?.[0] === "Jos" + FFFD
    && same(fileOf(replaced)?.notes, [REPLACEMENT_NOTE]),
    `${replaced.stats.replacementRows} row(s) counted · notes ${visible(fileOf(replaced)?.notes ?? [])}`);

  const decodedUtf8 = impl.decode(bytes([0xef, 0xbb, 0xbf, 0x41]), "utf-8");
  const decodedUtf16 = impl.decode(bytes([0xff, 0xfe, 0x41, 0x00]), "utf-16le");
  const platformDefault = new TextDecoder("utf-8").decode(bytes([0xef, 0xbb, 0xbf, 0x41]));
  const bomDecoded = read(impl.decode(utf8(BOM + "Name,Phone" + CRLF + "Asha,0712345640" + CRLF), "utf-8"));
  ok(L.C5d, same(impl.decodeOptions, { fatal: false, ignoreBOM: true }) && decodedUtf8 === BOM + "A" && decodedUtf16 === BOM + "A"
    && platformDefault === "A" && bomDecoded.stats.hadBom && rowsOf(bomDecoded)[0]?.cells[0] === "Name",
    `options ${visible(impl.decodeOptions)} · UTF-8 ${visible(decodedUtf8)} · UTF-16 ${visible(decodedUtf16)} · platform default ${visible(platformDefault)} · hadBom ${bomDecoded.stats.hadBom}`);

  // ── C6 · WHAT KIND OF FILE — content beats the name ────────────────────────────────────────────
  const vcardBytes = utf8(VCARD_TEXT);
  const vcardAsTxt = detect(vcardBytes, "contacts.txt");
  const csvAsVcf = detect(utf8("Name,Phone" + CRLF + "Asha,0712345642" + CRLF), "x.vcf");
  const vcardAsVcf = detect(vcardBytes, "kadi.vcf");
  ok(L.C6a, same(vcardAsTxt, { ok: true, kind: "vcard", encoding: "utf-8", namedAs: "csv", mismatch: true })
    && same(csvAsVcf, { ok: true, kind: "csv", encoding: "utf-8", namedAs: "vcard", mismatch: true })
    && same(vcardAsVcf, { ok: true, kind: "vcard", encoding: "utf-8", namedAs: "vcard", mismatch: false }),
    `contacts.txt ${visible(vcardAsTxt)} · x.vcf ${visible(csvAsVcf)} · kadi.vcf ${visible(vcardAsVcf)}`);

  const NOT_A_WORKBOOK = xlsxRefusalSentence("wrong_format", { kind: "other" });
  const ooxml = detect(zipHead("[Content_Types].xml", "<?xml version"), "list.csv");
  const pkText = detect(utf8("PK,phone" + CRLF + "0712345643" + CRLF), "data.csv");
  const oldXls = detect(bytes([...CFB_HEAD, ...utf16le("Workbook")]), "old.xls");
  const locked = detect(bytes([...CFB_HEAD, ...new Array<number>(4096).fill(0), ...utf16le("EncryptionInfo")]), "locked.xlsx");
  const ods = detect(zipHead("mimetype", ODS_MIMETYPE), "sheet.ods");
  ok(L.C6b, same(ooxml, { ok: true, kind: "xlsx", encoding: null, namedAs: "csv", mismatch: true })
    && same(pkText, { ok: true, kind: "csv", encoding: "utf-8", namedAs: "csv", mismatch: false })
    && same(oldXls, { ok: false, refusal: "xls", sentence: xlsxRefusalSentence("wrong_format", { kind: "xls" }), namedAs: null })
    && same(locked, { ok: false, refusal: "protected", sentence: xlsxRefusalSentence("wrong_format", { kind: "protected" }), namedAs: "xlsx" })
    && same(ods, { ok: false, refusal: "ods", sentence: xlsxRefusalSentence("wrong_format", { kind: "ods" }), namedAs: null }),
    `zip ${visible(ooxml)} · PK text ${visible(pkText)} · .xls ${oldXls.ok ? "accepted" : oldXls.refusal} · protected ${locked.ok ? "accepted" : locked.refusal} · .ods ${ods.ok ? "accepted" : ods.refusal}`);

  const pdf = detect(utf8("%PDF-1.7" + LF + "%binary" + LF), "a.csv");
  const webPage = detect(utf8("<html><body><table><tr><td>Asha</td></tr></table></body></html>"), "export.xls");
  const xml = detect(utf8("  <?xml version='1.0'?><Workbook/>"), "book.xml");
  const png = detect(bytes(PNG_HEAD), "pic.csv");
  const nothing = detect(new Uint8Array(0), "empty.csv");
  const loneBom = detect(bytes([0xef, 0xbb, 0xbf]), "bom.csv");
  const spaces = detect(utf8("  " + CRLF + TAB), "blank.txt");
  const spacesThenRows = detect(utf8(" ".repeat(SNIFF_BYTES) + "Name,Phone" + CRLF), "late.csv");
  const refusedAs = (d: DetectedFormat): string => (d.ok ? `accepted as ${d.kind}` : d.refusal);
  ok(L.C6c, same(pdf, { ok: false, refusal: "pdf", sentence: NOT_A_WORKBOOK, namedAs: "csv" })
    && same(webPage, { ok: false, refusal: "html", sentence: NOT_A_WORKBOOK, namedAs: null })
    && same(xml, { ok: false, refusal: "html", sentence: NOT_A_WORKBOOK, namedAs: null })
    && same(png, { ok: false, refusal: "binary", sentence: NOT_A_WORKBOOK, namedAs: "csv" })
    && same(nothing, { ok: false, refusal: "empty", sentence: EMPTY_SENTENCE, namedAs: "csv" })
    && same(loneBom, { ok: false, refusal: "empty", sentence: EMPTY_SENTENCE, namedAs: "csv" })
    && same(spaces, { ok: false, refusal: "empty", sentence: EMPTY_SENTENCE, namedAs: "csv" })
    && same(spacesThenRows, { ok: true, kind: "csv", encoding: "utf-8", namedAs: "csv", mismatch: false }),
    `pdf ${refusedAs(pdf)} · web page ${refusedAs(webPage)} · xml ${refusedAs(xml)} · png ${refusedAs(png)} · nothing ${refusedAs(nothing)} · ` +
    `lone BOM ${refusedAs(loneBom)} · spaces ${refusedAs(spaces)} · 4 KB of spaces then rows ${refusedAs(spacesThenRows)}`);

  const lowerVcards = detect(utf8(BOM + CRLF + CRLF + lines(["begin:vcard", "version:3.0", "fn:Asha", "end:vcard"])), "a.txt");
  const utf16Csv = detect(bytes([0xff, 0xfe, ...utf16le(lines(["Jina" + TAB + "Simu", "Asha" + TAB + "0712345644"]))]), "orodha.txt");
  const utf16Vcards = detect(bytes([0xff, 0xfe, ...utf16le(lines(["BEGIN:VCARD", "VERSION:3.0", "END:VCARD"]))]), "kadi.vcf");
  ok(L.C6d, same(lowerVcards, { ok: true, kind: "vcard", encoding: "utf-8", namedAs: "csv", mismatch: true })
    && same(utf16Csv, { ok: true, kind: "csv", encoding: "utf-16le", namedAs: "csv", mismatch: false })
    && same(utf16Vcards, { ok: true, kind: "vcard", encoding: "utf-16le", namedAs: "vcard", mismatch: false }),
    `lower-case vCards ${visible(lowerVcards)} · UTF-16 CSV ${visible(utf16Csv)} · UTF-16 vCards ${visible(utf16Vcards)}`);

  // ── C7 · WHAT A RESULT MAY SAY ─────────────────────────────────────────────────────────────────
  const sixty = read(SIXTY);
  ok(L.C7a, same(fileOf(sixty)?.notes, [SIXTY_NOTE]) && sixty.stats.warnings === 60 && rowsOf(sixty).length === 61,
    `notes ${visible(fileOf(sixty)?.notes ?? [])} · ${sixty.stats.warnings} warning(s)`);

  // C3b · G1 · an unreadable record's sentence is held to the same rules as a note and a refusal.
  const said = [
    ...reads.flatMap((r) => (r.result.ok ? [...r.result.file.notes, ...r.result.file.unreadable.map((u) => u.reason)] : [r.result.sentence])),
    ...detected,
  ];
  const badSentences = said.filter((s) =>
    typeof s !== "string" || s.length < 20 || !s.endsWith(".") || s.includes("_") || /[0-9]{7,}/.test(s.split(" ").join(""))
    || CELL_PROBES.some((probe) => s.includes(probe)));
  ok(L.C7b, said.length >= 15 && badSentences.length === 0,
    badSentences.length ? `bad: ${visible(badSentences.slice(0, 2))}` : `${said.length} sentence(s)`);

  // ── C8 · THE SOURCE ────────────────────────────────────────────────────────────────────────────
  const specs = specifiers(impl.source);
  const impure: string[] = [];
  for (const s of specs) if (!permittedImport(s)) impure.push(`imports ${s}`);
  for (const need of NEEDED_IMPORTS) if (!specs.includes(need)) impure.push(`does not import ${need}`);
  if (DIRECTIVE.test(impl.source)) impure.push("carries a directive");
  if (SERVER_ONLY.test(impl.source)) impure.push("imports server-only");
  if (NODE_BUILTIN.test(impl.source)) impure.push("names a node: module");
  if (CONSOLE.test(impl.source)) impure.push("writes to the console");
  if (LOWER_INCLUDES.test(impl.source)) impure.push("hand-rolls a .toLowerCase().includes( search");
  ok(L.C8a, impure.length === 0, impure.join(" | ") || `imports ${specs.join(", ")}`);

  const rawBad: string[] = [];
  for (let i = 0; i < impl.rawSource.length && rawBad.length < 5; i++) {
    const c = impl.rawSource.charCodeAt(i);
    if (c === 92) rawBad.push(`a backslash at ${i}`);
    else if ((c < 32 && c !== 10 && c !== 13) || c === 127) rawBad.push(`control ${c} at ${i}`);
    else if (c === 0xfeff || c === 0xfffd || c === 0xa0) rawBad.push(`U+${c.toString(16).toUpperCase()} at ${i}`);
  }
  ok(L.C8b, impl.rawSource.length > 10_000 && impl.rawSource.includes("String.fromCharCode") && rawBad.length === 0,
    rawBad.join(" | ") || `${impl.rawSource.length} characters scanned`);

  const src = impl.source;
  const owned: string[] = [];
  if (/\b(?:function|const|let|var)\s+(?:guardCell|unguardCell|csvCell)\b/.test(src)) owned.push("defines a formula-guard function (C16: csv-write.ts owns the pair)");
  if (/\b(?:type|interface)\s+ParsedContactsFile\s*(?:=|<|\{|extends)/.test(src)) owned.push("declares ParsedContactsFile (C15: parsed-file.ts owns it)");
  if (!importsName(src, "ParsedContactsFile", "./parsed-file")) owned.push("does not import ParsedContactsFile from ./parsed-file");
  if (/\b(?:function|const|let|var)\s+looksLikeVcard\b/.test(src) || /begin:vcard/i.test(src)) owned.push("holds its own vCard sniff (C17)");
  if (!importsName(src, "looksLikeVcard", "./vcard")) owned.push("does not import looksLikeVcard from ./vcard");
  if (/0x50\s*,\s*0x4b|0xd0\s*,\s*0xcf/i.test(src) || /old-style Excel|OpenDocument spreadsheet|Excel Binary Workbook/.test(src)) {
    owned.push("holds its own spreadsheet magic bytes or sentence (C18)");
  }
  if (!importsName(src, "spreadsheetHeadKind", "./xlsx-limits") || !importsName(src, "xlsxRefusalSentence", "./xlsx-limits")) {
    owned.push("does not import xlsx-limits' classifier and copy table");
  }
  if (/\b(?:function|const|let|var)\s+(?:looksExcelShortened|EXCEL_SHORTENED_TEXT|excelShortenedSentence)\b/.test(src)) owned.push("defines the shortened-number detector (M6)");
  ok(L.C8c, owned.length === 0, owned.join(" | ") || "the shared pieces imported, none redefined");
}

/* ══ THE RED PLANTS — each a defect somebody could plausibly write, built in memory ═════════════════ */

const EMPTY_STATS: CsvStats = createCsvReader().stats();

/** A reader that gathers every chunk and ends with `finish(text)` — the shape every whole-text plant shares. */
function gathering(finish: (text: string, options?: CsvReaderOptions) => Read): (options?: CsvReaderOptions) => CsvReader {
  return (options?: CsvReaderOptions): CsvReader => {
    const parts: string[] = [];
    let done: Read | null = null;
    return {
      push: (chunk: string) => {
        if (done === null) parts.push(chunk);
      },
      end: () => {
        if (done === null) done = finish(parts.join(""), options);
        return done.result;
      },
      stats: () => (done === null ? EMPTY_STATS : done.stats),
    };
  };
}

/** One RULE swapped in the real factory — the reader itself unchanged. */
function withRules(patch: Partial<CsvRules>): CsvImpl {
  const built = buildCsvReader({ ...CSV_RULES, ...patch });
  return { ...real(), createReader: built.createReader, parse: built.parse, vote: built.vote };
}

/** A pass over the WHOLE text, then the real reader. */
function withTextPass(pass: (text: string) => string): CsvImpl {
  const base = real();
  return {
    ...base,
    createReader: gathering((text, options) => readText(base, pass(text), options)),
    parse: (text, options) => readText(base, pass(text), options).result,
  };
}

/** Every result passes through `map`, which also sees the whole text — a shape or wording defect. */
function withOutput(map: (r: Read, text: string) => Read): CsvImpl {
  const base = real();
  return {
    ...base,
    createReader: gathering((text, options) => map(readText(base, text, options), text)),
    parse: (text, options) => map(readText(base, text, options), text).result,
  };
}

/** The chunks reach the real reader through `wrap`; the whole-text parse stays the shipped one. */
function withChunks(wrap: (inner: CsvReader) => { push: (chunk: string) => void; flush: () => void }): CsvImpl {
  const base = real();
  const createReader = (options?: CsvReaderOptions): CsvReader => {
    const inner = base.createReader(options);
    const wrapped = wrap(inner);
    let flushed = false;
    return {
      push: (chunk: string) => wrapped.push(chunk),
      end: () => {
        if (!flushed) {
          flushed = true;
          wrapped.flush();
        }
        return inner.end();
      },
      stats: () => inner.stats(),
    };
  };
  return { ...base, createReader };
}

/** A chunk boundary read as a record end: every chunk but the last reaches the reader with a LF after it. */
const recordEndAtChunkEnd = (inner: CsvReader): { push: (chunk: string) => void; flush: () => void } => {
  let held: string | null = null;
  return {
    push: (chunk: string) => {
      if (held !== null) inner.push(held + LF);
      held = chunk;
    },
    flush: () => {
      if (held !== null) inner.push(held);
      held = null;
    },
  };
};

const mapFile = (r: Read, f: (file: ParsedContactsFile) => ParsedContactsFile): Read =>
  r.result.ok ? { result: { ok: true, file: f(r.result.file) }, stats: r.stats } : r;
const mapRows = (r: Read, f: (row: ParsedRow) => ParsedRow): Read => mapFile(r, (file) => ({ ...file, rows: file.rows.map(f) }));
const mapCells = (r: Read, f: (cell: string) => string): Read => mapRows(r, (row) => ({ line: row.line, cells: row.cells.map(f) }));

/** invite-service.ts' shape: the text split on line ends, then each line on commas — quotes never looked at. */
function naiveRead(text: string, options?: CsvReaderOptions): Read {
  const physical = text.split(CRLF).join(LF).split(CR).join(LF).split(LF);
  const rows: ParsedRow[] = [];
  physical.forEach((line, i) => {
    if (line !== "") rows.push({ line: i + 1, cells: line.split(",") });
  });
  const file: ParsedContactsFile = {
    format: "csv",
    fileName: options?.fileName ?? null,
    rows,
    width: rows.reduce((w, r) => Math.max(w, r.cells.length), 0),
    blankRows: 0,
    notes: [],
    unreadable: [],
  };
  return { result: { ok: true, file }, stats: EMPTY_STATS };
}

/** A lone CR turned into a space before the real reader — a reader for which only LF ends a record. */
const loneCrToSpace = (t: string): string => {
  let out = "";
  for (let i = 0; i < t.length; i++) out += t[i] === CR && t[i + 1] !== LF ? " " : t[i];
  return out;
};

/** A scan whose count is final at once and zero: no record ever votes, so every file is one column. */
const silentScan = (): CandidateScan => ({
  feed: () => 0,
  finish: () => undefined,
  done: true,
  count: 0,
  line: null,
  irregular: false,
  pendingLine: 1,
});

/** A quote-blind scan: the candidate's occurrences on the first non-blank PHYSICAL line, quotes never looked at. */
function quoteBlindScan(code: number): CandidateScan {
  let done = false;
  let count = 0;
  let seenText = false;
  let line = 1;
  let voteLine: number | null = null;
  let afterCr = false;
  return {
    feed: (text: string, from: number) => {
      if (done) return 0;
      let i = from;
      for (; i < text.length; i++) {
        const c = text.charCodeAt(i);
        if (afterCr) {
          afterCr = false;
          if (c === 10) continue;
        }
        if (c === 13 || c === 10) {
          if (c === 13) afterCr = true;
          if (seenText) {
            done = true;
            voteLine = line;
            i++;
            break;
          }
          count = 0;
          line++;
          continue;
        }
        if (c === code) count++;
        if (c !== 32 && c !== 9) seenText = true;
      }
      return i - from;
    },
    finish: () => {
      if (done) return;
      done = true;
      if (seenText) voteLine = line;
    },
    get done() {
      return done;
    },
    get count() {
      return count;
    },
    get line() {
      return voteLine;
    },
    get irregular() {
      return false;
    },
    get pendingLine() {
      return line;
    },
  };
}

/** The candidate's occurrences on the first physical line, blank or not. */
function firstLineScan(code: number): CandidateScan {
  let done = false;
  let count = 0;
  return {
    feed: (text: string, from: number) => {
      if (done) return 0;
      let i = from;
      for (; i < text.length; i++) {
        const c = text.charCodeAt(i);
        if (c === 13 || c === 10) {
          done = true;
          i++;
          break;
        }
        if (c === code) count++;
      }
      return i - from;
    },
    finish: () => {
      done = true;
    },
    get done() {
      return done;
    },
    get count() {
      return count;
    },
    get line() {
      return 1;
    },
    get irregular() {
      return false;
    },
    get pendingLine() {
      return 1;
    },
  };
}

/** The REAL scan, handed only the first non-blank physical line: a quoted line break ends the header. */
function firstPhysicalLineOnly(code: number, rules: CsvRules): CandidateScan {
  const inner = CSV_RULES.scanCandidate(code, rules);
  let cut = false;
  let seenText = false;
  return {
    feed: (text: string, from: number) => {
      if (cut || inner.done) return 0;
      let i = from;
      for (; i < text.length; i++) {
        const c = text.charCodeAt(i);
        if ((c === 13 || c === 10) && seenText) {
          cut = true;
          break;
        }
        if (c !== 13 && c !== 10 && c !== 32 && c !== 9) seenText = true;
      }
      inner.feed(text.slice(0, i), from);
      if (cut) inner.finish();
      return i - from;
    },
    finish: () => inner.finish(),
    get done() {
      return cut || inner.done;
    },
    get count() {
      return inner.count;
    },
    get line() {
      return inner.line;
    },
    get irregular() {
      return inner.irregular;
    },
    get pendingLine() {
      return inner.pendingLine;
    },
  };
}

/** The REAL scan restarted after every record and summed: a vote over the whole file, decided only at its end. */
function wholeFileScan(code: number, rules: CsvRules): CandidateScan {
  let inner = CSV_RULES.scanCandidate(code, rules);
  let total = 0;
  let first: number | null = null;
  let finished = false;
  const settle = (): void => {
    if (inner.done && inner.line !== null) {
      total += inner.count;
      if (first === null) first = inner.line;
    }
  };
  return {
    feed: (text: string, from: number) => {
      if (finished) return 0;
      let at = from;
      while (at < text.length) {
        const used = inner.feed(text, at);
        at += used;
        if (!inner.done) break;
        settle();
        inner = CSV_RULES.scanCandidate(code, rules);
        if (used === 0) break;
      }
      return at - from;
    },
    finish: () => {
      if (finished) return;
      inner.finish();
      settle();
      finished = true;
    },
    get done() {
      return finished;
    },
    get count() {
      return total;
    },
    get line() {
      return first;
    },
    get irregular() {
      return false;
    },
    get pendingLine() {
      return inner.pendingLine;
    },
  };
}

/** Each chunk read by a reader of its own, the rows concatenated — what a reader keeping no state returns. */
function statelessChunks(): CsvImpl {
  const base = real();
  const createReader = (options?: CsvReaderOptions): CsvReader => {
    const parts: Read[] = [];
    let done: Read | null = null;
    return {
      push: (chunk: string) => {
        if (done === null && chunk.length > 0) parts.push(readText(base, chunk, options));
      },
      end: () => {
        if (done === null) done = joinReads(parts, options);
        return done.result;
      },
      stats: () => (done === null ? EMPTY_STATS : done.stats),
    };
  };
  return { ...base, createReader };
}

function joinReads(parts: readonly Read[], options?: CsvReaderOptions): Read {
  if (parts.length === 0) return readText(real(), "", options);
  if (parts.length === 1) return parts[0];
  const refused = parts.find((p) => !p.result.ok);
  if (refused !== undefined) return refused;
  const files = parts.map(fileOf).filter((f): f is ParsedContactsFile => f !== null);
  const rows = files.flatMap((f) => f.rows);
  const file: ParsedContactsFile = {
    format: "csv",
    fileName: files[0]?.fileName ?? null,
    rows,
    width: rows.reduce((w, r) => Math.max(w, r.cells.length), 0),
    blankRows: files.reduce((n, f) => n + f.blankRows, 0),
    notes: files.flatMap((f) => f.notes),
    unreadable: [],
  };
  return { result: { ok: true, file }, stats: parts[parts.length - 1].stats };
}

/** ⛔ The re-read is REAL while the work stays under this budget; past it the same work is counted without being done,
 *  so the plant cannot hang the run. The 40-row fixture is re-read for real at every push. */
const REPARSE_BUDGET = 4_000_000;

/** Every push re-reads the whole buffer from the start, adding up the characters each read tokenized. */
function bufferAndReparse(): CsvImpl {
  const base = real();
  const createReader = (options?: CsvReaderOptions): CsvReader => {
    let buffer = "";
    let work = 0;
    let done: Read | null = null;
    return {
      push: (chunk: string) => {
        if (done !== null || chunk.length === 0) return;
        buffer += chunk;
        if (work + buffer.length <= REPARSE_BUDGET) work += readText(base, buffer, options).stats.charsTokenized;
        else work += buffer.length;
      },
      end: () => {
        if (done === null) {
          const last = readText(base, buffer, options);
          done = { result: last.result, stats: { ...last.stats, charsTokenized: work + last.stats.charsTokenized } };
        }
        return done.result;
      },
      stats: () => (done === null ? EMPTY_STATS : done.stats),
    };
  };
  return { ...base, createReader };
}

/** The detector trusts the name: a known extension decides the kind. */
function trustTheName(): CsvImpl {
  const base = real();
  return {
    ...base,
    detect: (head, fileName) => {
      const found = base.detect(head, fileName);
      if (found.namedAs === null) return found;
      return { ok: true, kind: found.namedAs, encoding: found.ok ? found.encoding : "utf-8", namedAs: found.namedAs, mismatch: false };
    },
  };
}

/** The platform's own decoder settings: ignoreBOM false, so the mark is eaten before stripBom sees it. */
function platformDecoder(): CsvImpl {
  const options = { fatal: false, ignoreBOM: false };
  return { ...real(), decodeOptions: options, decode: (b, encoding) => new TextDecoder(encoding, options).decode(b) };
}

const PLANTS: readonly RedPlant<CsvImpl>[] = [
  // ── RFC 4180 ──
  {
    name: "every line read as one column — the vote never finds a separator",
    expect: L.C1a,
    impl: () => withRules({ scanCandidate: () => silentScan() }),
  },
  {
    name: "a quote-blind splitter — invite-service.ts' line.split(',') over lines split on line ends",
    expect: L.C1b,
    impl: () => ({ ...real(), createReader: gathering((text, options) => naiveRead(text, options)), parse: (text, options) => naiveRead(text, options).result }),
  },
  {
    name: "doubled quotation marks never collapsed",
    expect: L.C1c,
    impl: () => withOutput((r) => mapCells(r, (cell) => cell.split(QUOTE).join(QUOTE + QUOTE))),
  },
  {
    name: "a CRLF inside a quoted cell kept whole",
    expect: L.C1d,
    impl: () => withOutput((r, text) => (text.includes(CRLF) ? mapCells(r, (cell) => cell.split(LF).join(CRLF)) : r)),
  },
  {
    name: "physical-line numbering — a quoted line break advances the row number (the plan's RED)",
    expect: L.C1e,
    impl: () => withRules({ lineCount: "physical" }),
  },
  {
    name: "an LF-only record end — the CR of every CRLF left on the last cell",
    expect: L.C1f,
    impl: () => withOutput((r, text) => (text.includes(CRLF)
      ? mapRows(r, (row) => ({ line: row.line, cells: row.cells.map((cell, i) => (i === row.cells.length - 1 ? cell + CR : cell)) }))
      : r)),
  },
  {
    name: "a lone CR is not a record end",
    expect: L.C1g,
    impl: () => withTextPass(loneCrToSpace),
  },
  {
    name: "the last record dropped when the text has no final line end",
    expect: L.C1h,
    impl: () => withOutput((r, text) => (endsWithBreak(text) ? r : mapFile(r, (file) => ({ ...file, rows: file.rows.slice(0, -1) })))),
  },
  {
    name: "a final line end counted as one more, blank, record",
    expect: L.C1h,
    impl: () => withOutput((r, text) => (endsWithBreak(text) && r.result.ok
      ? { result: { ok: true, file: { ...r.result.file, blankRows: r.result.file.blankRows + 1 } }, stats: { ...r.stats, records: r.stats.records + 1, blankRows: r.stats.blankRows + 1 } }
      : r)),
  },
  {
    name: "blank records emitted as rows",
    expect: L.C1i,
    impl: () => withRules({ isBlankRecord: () => false }),
  },
  {
    name: "rows numbered as they are emitted — the blank records lose their numbers",
    expect: L.C1i,
    impl: () => withOutput((r) => mapFile(r, (file) => ({ ...file, rows: file.rows.map((row, i) => ({ line: i + 1, cells: row.cells })) }))),
  },
  {
    name: "a quotation mark opens a quoted cell anywhere — the inch mark swallows the rest of the file",
    expect: L.C1j,
    impl: () => withRules({ quotesOnlyAtFieldStart: false }),
  },
  {
    name: "text after a closing quotation mark kept silently — no note",
    expect: L.C1k,
    impl: () => withOutput((r) => mapFile(r, (file) => ({ ...file, notes: [] }))),
  },
  {
    name: "a quotation mark never closed is closed at the end of the file — the rest swallowed into one cell, read as a row",
    expect: L.C1l,
    impl: () => {
      const base = real();
      const finish = (text: string, options?: CsvReaderOptions): Read => {
        const r = readText(base, text, options);
        const broken = r.result.ok ? r.result.file.unreadable.length > 0 : r.result.problem === "unterminated_quote";
        return broken ? readText(base, text + QUOTE, options) : r;
      };
      return { ...base, createReader: gathering(finish), parse: (text, options) => finish(text, options).result };
    },
  },
  {
    name: "C3b G1 undone — one broken quote refuses the whole file again, the rows before it lost",
    expect: L.C1l,
    impl: () => withRules({ unclosedQuote: () => "refuse" }),
  },
  {
    name: "the broken record dropped silently — the rows before it kept, nothing listed as unreadable",
    expect: L.C1l,
    impl: () => withOutput((r) => mapFile(r, (file) => ({ ...file, unreadable: [] }))),
  },
  {
    name: "a first record that never closes let through as a file with no rows — the refusal's control undone",
    expect: L.C1lb,
    impl: () => withRules({ unclosedQuote: () => "unreadable" }),
  },
  {
    name: "the broken record's sentence quotes what it swallowed",
    expect: L.C7b,
    impl: () => withOutput((r, text) => mapFile(r, (file) => ({
      ...file,
      unreadable: file.unreadable.map((u) => ({
        ...u,
        reason: `${u.reason} It began: ${text.slice(text.lastIndexOf(QUOTE) + 1, text.lastIndexOf(QUOTE) + 13)}.`,
      })),
    }))),
  },
  {
    name: "no cell limit — a 32,768-character cell is read",
    expect: L.C1m,
    impl: () => withRules({ maxFieldChars: Number.POSITIVE_INFINITY }),
  },
  {
    name: "cells trimmed",
    expect: L.C1n,
    impl: () => withOutput((r) => mapCells(r, (cell) => cell.trim())),
  },
  {
    name: "cells unguarded by the reader — the apostrophe guard dropped before U28 sees it",
    expect: L.C1n,
    impl: () => withOutput((r) => mapCells(r, unguardCell)),
  },
  {
    name: "no header cap — the vote holds past 1 MiB, and a different refusal comes out",
    expect: L.C1o,
    impl: () => withRules({ maxHeaderChars: Number.POSITIVE_INFINITY }),
  },
  // ── the byte-order mark and sep= ──
  {
    name: "no BOM strip — the mark stays on the first cell (the plan's RED)",
    expect: L.C2a,
    impl: () => withRules({ stripBom: (text) => ({ text, hadBom: false }) }),
  },
  {
    name: "the sep= line numbered as a row, as LibreOffice shows it",
    expect: L.C2b,
    impl: () => withOutput((r) => (r.stats.source === "sep"
      ? mapFile(r, (file) => ({ ...file, rows: file.rows.map((row) => ({ line: row.line + 1, cells: row.cells })) }))
      : r)),
  },
  {
    name: "sep= ignored — the directive read as data and the vote deciding (the plan's RED)",
    expect: L.C2c,
    impl: () => withRules({ readSep: () => null }),
  },
  {
    name: "only the lower-case, unquoted sep= spelling understood",
    expect: L.C2d,
    impl: () => withRules({
      readSep: (text, final) => (text.length === 0 ? (final ? null : undefined) : text.charCodeAt(0) === 115 ? CSV_RULES.readSep(text, final) : null),
    }),
  },
  // ── the vote ──
  {
    name: "the delimiter counted inside quotes — a quote-blind vote (the plan's RED)",
    expect: L.C3a,
    impl: () => withRules({ scanCandidate: (code) => quoteBlindScan(code) }),
  },
  {
    name: "a whole-file vote — every record counted (the plan's RED)",
    expect: L.C3b,
    impl: () => withRules({ scanCandidate: (code, rules) => wholeFileScan(code, rules) }),
  },
  {
    name: "tab and pipe never voted",
    expect: L.C3c,
    impl: () => withRules({ candidates: ["comma", "semicolon"] }),
  },
  {
    name: "one column read silently — no note for the commas in it",
    expect: L.C3d,
    impl: () => withOutput((r) => mapFile(r, (file) => ({ ...file, notes: file.notes.filter((n) => !n.startsWith("Every row was read as one column")) }))),
  },
  {
    name: "the tie-break order reversed — a,b;c read as semicolon-separated",
    expect: L.C3e,
    impl: () => withRules({ candidates: ["pipe", "tab", "semicolon", "comma"] }),
  },
  {
    name: "the vote counted on the first physical line, blank or not",
    expect: L.C3f,
    impl: () => withRules({ scanCandidate: (code) => firstLineScan(code) }),
  },
  {
    name: "the vote handed only the header's first physical line — a quoted line break ends it",
    expect: L.C3g,
    impl: () => withRules({ scanCandidate: (code, rules) => firstPhysicalLineOnly(code, rules) }),
  },
  {
    name: "the manual delimiter ignored",
    expect: L.C3h,
    impl: () => {
      const base = real();
      const drop = (options?: CsvReaderOptions): CsvReaderOptions | undefined => (options === undefined ? undefined : { fileName: options.fileName });
      return { ...base, createReader: (options) => base.createReader(drop(options)), parse: (text, options) => base.parse(text, drop(options)) };
    },
  },
  {
    name: "a second vote — voteDelimiter counts quote-blind while the reader does not",
    expect: L.C3i,
    impl: () => ({ ...real(), vote: buildCsvReader({ ...CSV_RULES, scanCandidate: (code) => quoteBlindScan(code) }).vote }),
  },
  // ── streaming ──
  {
    name: "a stateless chunk parser — each chunk parsed on its own (the plan's RED)",
    expect: L.C4a,
    impl: statelessChunks,
  },
  {
    name: "buffer-and-reparse — every push re-reads the whole buffer (the plan's RED)",
    expect: L.C4b,
    impl: bufferAndReparse,
  },
  {
    name: "a 4,093-character chunk end read as a record end",
    expect: L.C4c,
    impl: () => withChunks(recordEndAtChunkEnd),
  },
  {
    name: "a second path for small texts — lines split on commas",
    expect: L.C4d,
    impl: () => ({ ...real(), parse: (text, options) => (text.length < 4096 ? naiveRead(text, options).result : real().parse(text, options)) }),
  },
  // ── bytes to text ──
  {
    name: "windows-1252 never chosen — invalid UTF-8 called UTF-8",
    expect: L.C5a,
    impl: () => ({
      ...real(),
      sniff: (head) => {
        const s = sniffEncoding(head);
        return s.encoding === "windows-1252" ? { encoding: "utf-8", bom: false } : s;
      },
    }),
  },
  {
    name: "no UTF-16 branch — Unicode Text read as windows-1252",
    expect: L.C5b,
    impl: () => ({
      ...real(),
      sniff: (head) => {
        const s = sniffEncoding(head);
        return s.encoding === "utf-16le" || s.encoding === "utf-16be" ? { encoding: "windows-1252", bom: false } : s;
      },
    }),
  },
  {
    name: "U+FFFD rows neither counted nor named",
    expect: L.C5c,
    impl: () => withOutput((r) => ({
      result: r.result.ok ? { ok: true, file: { ...r.result.file, notes: r.result.file.notes.filter((n) => !n.includes("could not be read")) } } : r.result,
      stats: { ...r.stats, replacementRows: 0 },
    })),
  },
  {
    name: "the platform-default decoder — ignoreBOM false eats the mark before stripBom (the plan's RED)",
    expect: L.C5d,
    impl: platformDecoder,
  },
  // ── the format ──
  {
    name: "an extension-trusting detector — the name decides (the plan's RED)",
    expect: L.C6a,
    impl: trustTheName,
  },
  {
    name: "detectFormat's own sniffer, checking only 'PK' — a CSV starting PK refused as a workbook",
    expect: L.C6b,
    impl: () => {
      const base = real();
      return {
        ...base,
        detect: (head, fileName): DetectedFormat => {
          if (!(head.length >= 2 && head[0] === 0x50 && head[1] === 0x4b)) return base.detect(head, fileName);
          const namedAs = base.detect(head, fileName).namedAs;
          return { ok: true, kind: "xlsx", encoding: null, namedAs, mismatch: namedAs !== null && namedAs !== "xlsx" };
        },
      };
    },
  },
  {
    name: "detectFormat words its own .xls sentence — a second copy table",
    expect: L.C6b,
    impl: () => {
      const base = real();
      return {
        ...base,
        detect: (head, fileName): DetectedFormat => {
          const d = base.detect(head, fileName);
          return !d.ok && d.refusal === "xls" ? { ...d, sentence: "This is an old Excel file. Save it as CSV and choose it again." } : d;
        },
      };
    },
  },
  {
    name: "no refusal for a PDF, a web page or a picture — each read as CSV",
    expect: L.C6c,
    impl: () => {
      const base = real();
      return {
        ...base,
        detect: (head, fileName): DetectedFormat => {
          const d = base.detect(head, fileName);
          if (d.ok || (d.refusal !== "pdf" && d.refusal !== "html" && d.refusal !== "binary")) return d;
          return { ok: true, kind: "csv", encoding: "utf-8", namedAs: d.namedAs, mismatch: d.namedAs !== null && d.namedAs !== "csv" };
        },
      };
    },
  },
  {
    name: "the head decoded as UTF-8 whatever the bytes — UTF-16 files misread",
    expect: L.C6d,
    impl: () => ({ ...real(), detect: buildFormatDetector({ sniff: () => ({ encoding: "utf-8", bom: false }), decode: decodeBytes }) }),
  },
  // ── what a result says ──
  {
    name: "the row list capped at 50 without the true count beside it",
    expect: L.C7a,
    impl: () => withOutput((r) => mapFile(r, (file) => ({
      ...file,
      notes: file.notes.map((n) => {
        const at = n.indexOf(" more have ");
        if (at < 0) return n;
        const and = n.lastIndexOf(" and ", at);
        return and < 0 ? n : n.slice(0, and) + n.slice(at + " more".length);
      }),
    }))),
  },
  {
    name: "a refusal that says its code",
    expect: L.C7b,
    impl: () => withOutput((r) => (r.result.ok ? r : { result: { ...r.result, sentence: `${r.result.problem} at row ${r.result.line}.` }, stats: r.stats })),
  },
  // ── the source ──
  {
    name: "import-parse.ts imports the server store",
    expect: L.C8a,
    impl: () => ({ ...real(), source: `${real().source}${LF}import "@/lib/server/store";${LF}` }),
  },
  {
    name: "a raw byte-order mark typed into a string",
    expect: L.C8b,
    impl: () => ({ ...real(), rawSource: `${real().rawSource}${LF}const MARK = "${BOM}";${LF}` }),
  },
  {
    name: "import-parse.ts defines its own guardCell (C16: the pair is csv-write.ts')",
    expect: L.C8c,
    impl: () => ({ ...real(), source: `${real().source}${LF}export function guardCell(s: string): string { return s; }${LF}` }),
  },
];

export const csvSection: ImportSection<CsvImpl> = {
  name: "csv",
  owner: "U25",
  real,
  run,
  plants: PLANTS,
};
