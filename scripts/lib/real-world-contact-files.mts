/**
 * REAL-WORLD CONTACT FILES — the files Tanzanian office staff will really try to import into /admin/contacts, made
 * deterministically, each with the ground truth a correct importer must reach.   (S15 · the contacts screen, 2026-10-09)
 *
 * ⭐ WHY THIS EXISTS. The owner has no sample files, and a reader proven only on fixtures its own author typed is proven
 * against that author's imagination. So this generator IS the test data: the importer's automated tests, its browser
 * drive and its stress test read these files, and the manifest says — for every record — what was written, which
 * number it is, what kind of refusal it earns and which earlier line it repeats.
 * ⛔ THE TRUTH IS NEVER READ BACK FROM A FILE. Each record's truth is built from the very values its bytes are written
 * from, so a reader's bug can never leak into the answer key.
 *
 * ── THE FILES — the real situation each one mimics, and what it proves ──────────────────────────────────────────
 * CSV
 *  1 excel-csv-utf8.csv ......... Excel "CSV UTF-8" (BOM, CRLF), 40 people: every way a number is really written,
 *                                 quoted names (a comma, doubled quotes), accents, Arabic, Chinese and an emoji, tag
 *                                 cells in every separator and case, three repeats written in other spellings.
 *  2 excel-semicolon-1252.csv ... Excel on a comma-decimal PC: ';' cells, Windows-1252 bytes (e-acute, the curly
 *                                 apostrophe 0x92, the en dash 0x96, the euro 0x80), no BOM — the encoding must be
 *                                 sniffed — and a comma-decimal shortened 2,55712E+11.
 *  3 excel-sep-hint.csv ......... Excel's "sep=;" first line: the separator is DECLARED, and that line is not a row.
 *  4 excel-shortened-numbers.csv  Numbers Excel already turned into numbers: the leading zero lost (recoverable) and
 *                                 2.55712E+11 / 7.12346E+08 (digits gone, never repaired) — two different numbers that
 *                                 shortened to the SAME text.
 *  5 google-contacts.csv ........ Google Contacts' export: the name in parts, "* myContacts ::: …" labels, two numbers
 *                                 joined by " ::: " in one cell, a mobile only in the second phone column (Phone 2).
 *  6 outlook-contacts.csv ....... Outlook's export: 92 quoted columns, ANSI bytes, numbers spread over Mobile /
 *                                 Business / Home / Primary / Car, a note with a line break, empty dates as 0/0/00.
 *  7 numbers-only.csv ........... A bare list out of a bulk-SMS tool: no header, 1,000 lines, ~5% repeats, blank lines.
 *  8 excel-unicode-text.txt ..... Excel "Unicode Text": UTF-16LE with its BOM, tab-separated, named .txt.
 *  9 messy-real-life.csv ........ The chaos file an office really sends: Swahili headers, a serial "Namba" column,
 *                                 unused and nameless columns, blank and space-only rows, every refusal parseTzNumber
 *                                 has, two numbers in one cell, formula names, a 300-character name, a quoted line
 *                                 break, a bad email, 40 tags — and LAST a quotation mark that never closes.
 * 10 empty.csv · header-only.csv · not-really-csv.csv (a PNG) · renamed-csv.xlsx (CSV text under an .xlsx name).
 * ⭐ C8c · the four files C3b-fix's review asked for (28–31, at the END of the makers' list — C3c adds to this file too):
 * 28 broken-quote-mid-file.csv .. A hand-kept list whose note opens a quotation mark in the MIDDLE and never closes it:
 *                                 the rows below are swallowed (D5 — their physical lines counted, `swallowedLines`).
 * 29 outlook-assistant-phones.csv Outlook's export with mobiles in Assistant's Phone and Company Main Phone — another
 *                                 person's line and the switchboard, never the person's number (D2).
 * 31 hand-typed-title.csv ....... A CSV typed by hand: a bare title and a sub-title (no separator at all), a blank line,
 *                                 then the column names (D7, and the vote that once read such a file as one column).
 * XLSX — written with exceljs, the library the server reads with
 * 11 excel-basic.xlsx ........... One sheet, phones as TEXT cells, 40 people.
 * 12 excel-number-cells.xlsx .... Phones stored as NUMBERS in every format Excel offers, a formula with its cached
 *                                 result, the number a re-saved 2.55712E+11 becomes, a date, a merged header cell, a
 *                                 hidden column.
 * 13 excel-multi-sheet.xlsx ..... A cover sheet first, the contacts second, a hidden sheet third.
 * 14 legacy-97.xls .............. The OLE2 magic and filler — an old-format file, refused with the save-as sentence.
 * 15 libreoffice.ods ............ A real STORE-only OpenDocument zip — a format the importer must NAME.
 * 30 excel-title-staff.xlsx ..... ⭐ C8c · a small staff sheet first, then the customers under a title row (D6 by the
 *                                 mobiles each sheet holds — `sheets` — and D7 below the title — `titleRows`).
 * vCARD
 * 16 iphone-export.vcf .......... iOS 3.0: item1 groups, X-ABLabel, type=pref, folded base64 PHOTOs ending "==".
 * 17 android-export.vcf ......... Android 2.1: QUOTED-PRINTABLE names cut by soft breaks exactly where AOSP cuts them.
 * 18 google-export.vcf .......... Google 3.0: TYPE=CELL, CATEGORIES:myContacts,Wateja.
 * 19 vcard4.vcf ................. 4.0: tel: URIs with ;ext= and quoted TYPE lists.
 * 20 truncated.vcf .............. Ten cards, the last cut off mid-line — a download that stopped.
 * 21 mixed-line-endings.vcf ..... CRLF, LF and a bare CR in one file — cards gathered from three systems.
 * PASTE
 * 22 paste-whatsapp.txt ......... What an officer pastes out of a chat.
 * BIG — only with --big
 * 23 big-150k.csv · 24 big-row-cap.csv (IMPORT_MAX_ROWS + 1 records) · 25 big-50k.xlsx (streamed) ·
 * 26 big-150k-cards.vcf and big-photos.vcf (5,000 cards with ~8 KB photos, ~40 MB — the file that rules out a direct
 *    upload). Aggregates only: records = validDistinct + duplicateRows + invalidRows.
 * PRODUCTION-SAFE — for a live check that is deleted afterwards
 * 27 prod-check-40.csv · prod-check-40.vcf · prod-check-40.xlsx — see the pattern below.
 *
 * ── THE GROUND TRUTH (`FileTruth[]`, returned by `writeRealWorldFiles`; the CLI writes it as manifest.json) ──────
 *  · `line` is the record's number in the file's OWN grid — the numbering `parsed-file.ts` promises: a CSV record with
 *    the header as line 1 (a quoted line break does not start a line, and Excel's sep= line is not one), an XLSX sheet
 *    row, a vCard's card ordinal, a pasted line. Blank records are listed (`blank: true`), because they are counted;
 *    a record a reader cannot finish is `broken: true`, and `brokenAtByte` is where it starts — the bytes before it
 *    are a complete file.
 *  · every phone VALUE as written — a cell, a TEL value, a number inside a pasted line — with its intended canonical
 *    key (the bare 255… twelve digits, or null) and its kind. `duplicateOf` is the first line that held the same key;
 *    only a value's own key counts (the numbers inside a refused two-number cell are listed in `holds`, not counted).
 * ⭐ THE TRUTH IS CHECKED BEFORE A BYTE IS WRITTEN. Every phone value is asked of `parseTzNumber` (Excel's shortened
 * form of `looksExcelShortened`), and a value whose verdict is not the kind it was built as stops the run, naming it:
 * a wrong answer key is worse than none — it marks a correct importer wrong and a wrong one right.
 * Valid numbers come only from the ranges `TZ_MOBILE_NDCS` marks sendable (the disputed 060 once per file that wants
 * it, never at random); the refused ones from the branches `parseTzNumber` refuses.
 *
 * ── THE PRODUCTION-SAFE PATTERN ──────────────────────────────────────────────────────────────────────────────────
 * The three prod-check-40 files hold the SAME 40 people: every row tagged qa-import-check, every name beginning
 * "QA Import — ". Their valid numbers follow ONE synthetic pattern: +255 710 000 0NN — national 7100000NN, key
 * 2557100000NN — with NN = 01 to 34, the lowest block of the 0710 range. ⚠️ Tanzania has no fictional range
 * (`sample-sheet.ts` says the same), so the pattern is how these rows are FOUND, not a promise that nobody holds the
 * numbers: never send to them, and delete them by the tag or by the pattern when the check is done. Three rows repeat
 * a number in another spelling and three are refused — too short, Ofcom's fictional +44 7700 900… drama range, and the
 * withdrawn 064 range. No other file draws from that block.
 *
 * ⛔ DETERMINISTIC. A seeded mulberry32 per file (seeded from the file's name), fixed workbook dates, and every zip
 * entry's DOS time pinned (exceljs's zip writers stamp the clock) — the same bytes on every run, no clock in content.
 * ⛔ SOURCE BYTES. This file holds no control character, no escape text and no backslash at all: every special byte
 * (BOMs, Windows-1252, UTF-16, magic numbers), every line end and every non-ASCII letter a file carries is built from
 * its code — the editing tools decode escape text into raw characters, and `test:source-bytes` refuses a raw control
 * character under scripts/. (Its sentences use plain dashes and ellipses, as the repo's own sentences do.)
 * ⛔ IMPORTING THIS FILE RUNS NOTHING. The CLI runs only when this file is the entry point, so a runner that loads every
 * module in this directory (`scripts/contacts-import.test.mts` does) writes no file. ⚠️ That runner also FAILS on a
 * module missing from its REGISTRY or exporting no section — and this is neither; its own header says helpers belong
 * in scripts/lib/. Moving this file there needs no change: every import is the same two levels up.
 *
 * Run:  tsx scripts/contacts-import/real-world-files.mts [outDir] [--big]
 *       (default outDir: .qa-shots/contacts-screen/files under the repo root; manifest.json is written beside them)
 */
import { Buffer } from "node:buffer";
import { closeSync, mkdirSync, openSync, readFileSync, writeFileSync, writeSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ExcelJS from "exceljs";
import {
  CONTACT_FIELDS,
  CONTACT_LIMITS,
  normaliseHeader,
  type ContactFieldSpec,
  type ImportFieldKey,
} from "../../src/lib/contacts/contact-fields.ts";
import { IMPORT_MAX_ROWS } from "../../src/lib/contacts/import-limits.ts";
import { ODS_MIMETYPE, XLSX_MAX_BYTES, looksExcelShortened } from "../../src/lib/contacts/xlsx-limits.ts";
import { TZ_COUNTRY_CODE, TZ_MOBILE_NDCS, parseTzNumber, type TzVerdict } from "../../src/lib/tz-msisdn.ts";

/* ══ CHARACTERS AND BYTES — every one from its code ══════════════════════════════════════════════════════════════ */

const CR = String.fromCharCode(13);
const LF = String.fromCharCode(10);
const CRLF = CR + LF;
const TAB = String.fromCharCode(9);
const QUOTE = String.fromCharCode(34);
const BACKSLASH = String.fromCharCode(92);
/** The less-than sign, so no source line spells an XML tag's opening (house habit — `import-parse.ts` does the same). */
const LT = String.fromCharCode(60);
const cp = (...codes: number[]): string => String.fromCodePoint(...codes);
const E_ACUTE = cp(0xe9);
const E_DIAERESIS = cp(0xeb);
const EM_DASH = cp(0x2014);
const EN_DASH = cp(0x2013);
/** The curly apostrophe Word and Outlook type for you — byte 0x92 in Windows-1252. */
const RIGHT_QUOTE = cp(0x2019);
const EURO = cp(0x20ac);
/** Sparkles, U+2728: three UTF-8 bytes, E2 9C A8 — what an Android QP name carries as =E2=9C=A8. */
const SPARKLES = cp(0x2728);
/** Pot of food, U+1F372: four UTF-8 bytes, a surrogate pair in UTF-16. */
const POT_OF_FOOD = cp(0x1f372);
/** "Said" and "Abdallah" in Arabic script, as a Zanzibar phone stores them. */
const ARABIC_GIVEN = cp(0x633, 0x639, 0x64a, 0x62f);
const ARABIC_FAMILY = cp(0x639, 0x628, 0x62f, 0x627, 0x644, 0x644, 0x647);
const ARABIC_NAME = `${ARABIC_GIVEN} ${ARABIC_FAMILY}`;
/** Wang Xiaoming — the textbook placeholder name; family first, no space, as a Chinese phone writes it. */
const CHINESE_FAMILY = cp(0x738b);
const CHINESE_GIVEN = cp(0x5c0f, 0x660e);
const CHINESE_NAME = CHINESE_FAMILY + CHINESE_GIVEN;
const DESIRE = `D${E_ACUTE}sir${E_ACUTE}`;
const NOELLA = `No${E_DIAERESIS}lla`;
const RENEE = `Ren${E_ACUTE}e`;

const UTF8_BOM: readonly number[] = [0xef, 0xbb, 0xbf];
const UTF16LE_BOM: readonly number[] = [0xff, 0xfe];
/** The Compound File Binary signature every Excel 97–2003 workbook starts with. */
const OLE2_MAGIC: readonly number[] = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
/** The PNG signature, then a real IHDR chunk head — its length field 00 00 00 0D puts NUL bytes in the first 4 KB. */
const PNG_SIGNATURE: readonly number[] = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PNG_IHDR: readonly number[] = [
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x00, 0x08, 0x06, 0x00, 0x00, 0x00,
];
/** A JPEG/JFIF head and tail — the shape a contact photo's base64 decodes to. */
const JPEG_HEAD: readonly number[] = [
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00,
];
const JPEG_TAIL: readonly number[] = [0xff, 0xd9];

/* ══ THE TRUTH — exported, so a test asserts against types, not guesses ═══════════════════════════════════════════ */

/** How the importer should take a file — or that it must refuse it whole. */
export type FileFormat = "csv" | "xlsx" | "vcard" | "paste" | "unsupported";

/**
 * What a phone value IS, as built. `valid` and `leading_zero_lost` carry a key (both are numbers `parseTzNumber`
 * accepts — the second is a 712… whose zero a spreadsheet ate, recoverable). Every other kind is refused: `tollfree`
 * gets parseTzNumber's "landline" verdict with the toll-free sentence; `letters` is a look-alike letter typed for a
 * digit (too short once the letter drops out); `unallocated` is a range nobody holds or one with no live network;
 * `excel_scientific` is Excel's shortened form, digits gone (`lost` keeps the number it was); `none` holds no digit.
 */
export type PhoneKind =
  | "valid"
  | "foreign"
  | "landline"
  | "tollfree"
  | "short"
  | "long"
  | "letters"
  | "unallocated"
  | "excel_scientific"
  | "leading_zero_lost"
  | "none";

export type PhoneTruth = {
  /** The value exactly as written: the cell text, the TEL value (a tel: URI kept whole), the number in a pasted line.
   *  An XLSX number cell is its stored number's digits; a formula cell is its cached result. */
  readonly written: string;
  /** The intended canonical key — the bare 255… twelve digits — or null when no number can be recovered. */
  readonly key: string | null;
  readonly kind: PhoneKind;
  /** The first line that held this key, or null. */
  readonly duplicateOf: number | null;
  /** Where the value sits in a record with more than one phone place: the column header, or the vCard property head. */
  readonly source?: string;
  /** XLSX only: how the cell stores it. */
  readonly cell?: "text" | "number" | "formula";
  /** A cell that holds more than one number (parseTzNumber refuses it whole as too long; the importer takes a number out
   *  of it only when it holds exactly ONE distinct mobile — C3b-fix D3, `phone-cell.ts`): the keys of the numbers inside
   *  it, in the order written. */
  readonly holds?: readonly string[];
  /** `excel_scientific` only: the key Excel shortened away — what the file can no longer say. */
  readonly lost?: string;
};

export type PersonTruth = {
  readonly line: number;
  /** The name as a person reads it (a CSV cell unquoted, a vCard FN unescaped and decoded, First + Last joined). */
  readonly name: string | null;
  readonly phones: readonly PhoneTruth[];
  /** The first line holding any of this record's keys, or null. */
  readonly duplicateOf: number | null;
  /** Every cell empty or only spaces: counted by a reader, never a contact. */
  readonly blank: boolean;
  /** The record a reader cannot finish: an unterminated quotation mark, a card cut off before END:VCARD. */
  readonly broken: boolean;
  /** The email and tags cells as written, where the format has them. */
  readonly email?: string | null;
  readonly tags?: string | null;
  /** ⭐ C8c · C3b-fix · D5a · a broken CSV record only: the physical lines AFTER its first line that its open quotation
   *  mark swallowed — the M of "it and the M lines after it" (0 when the record is the file's last line). Counted from
   *  the lines the generator wrote inside the quote, never read back. */
  readonly swallowedLines?: number;
};

/**
 * Counts over the non-blank records (a broken one included). For the big files, where every record has one phone,
 * records = validDistinct + duplicateRows + invalidRows; a small file's record may hold two keys, so there it need not.
 */
export type FileAggregate = {
  readonly records: number;
  /** Distinct keys among the records' phone values. */
  readonly validDistinct: number;
  /** Records whose duplicateOf is set. */
  readonly duplicateRows: number;
  /** Records with no phone value that has a key — refused numbers only, or none. */
  readonly invalidRows: number;
};

export type FileEncoding = "utf-8" | "utf-8-bom" | "windows-1252" | "utf-16le-bom" | "binary" | "none";
export type LineEnding = "crlf" | "lf" | "mixed" | "none";
export type Delimiter = "comma" | "semicolon" | "tab";
/** `import-parse.ts`' own FormatRefusal names, for the files `detectFormat` must refuse whole. */
export type FormatRefusalKind = "empty" | "xls" | "ods" | "binary";

export type FileTruth = {
  readonly name: string;
  readonly format: FileFormat;
  /** One sentence: the real situation the file mimics. */
  readonly mimics: string;
  readonly bytes: number;
  readonly encoding: FileEncoding;
  readonly lineEnding: LineEnding;
  readonly delimiter: Delimiter | null;
  /** The header row's cells as written, or null when the file has none (a vCard, a bare list, a paste). */
  readonly header: readonly string[] | null;
  /** XLSX: the sheet `people` describes. */
  readonly sheet: string | null;
  /** For a file the importer must refuse whole: the refusal `detectFormat` should give. */
  readonly refusal: FormatRefusalKind | null;
  /** Where the broken record begins, in bytes from the start of the file (a BOM included); null when none is. */
  readonly brokenAtByte: number | null;
  /** What a test writer must know about the file, one sentence each: its traps, and the lines that hold them. */
  readonly notes: readonly string[];
  readonly aggregate: FileAggregate;
  /** Every record of a small file, in file order. Null for a big file (aggregates only). */
  readonly people: readonly PersonTruth[] | null;
  /** ⭐ Written only with --big (2026-10-09, the integrator): such a file belongs to `qa:contacts-import-big` alone — the
   *  every-small-file drive (`scripts/live/contacts-import-drive.mjs`) skips every entry carrying it. */
  readonly big: boolean;
  /** ⭐ C8c · C3b-fix · D7 · the non-blank rows ABOVE the column names (a title, a sub-title), each with its real row number
   *  and its text as written: a reader takes them out of the data with ONE note naming the rows, first to last ("Rows 1–2,
   *  above the column names, were not read — a title."), never what they say. Absent when the column names are the first
   *  row. A blank row among them is not listed: it is a blank row, counted as one. */
  readonly titleRows?: ReadonlyArray<{ readonly line: number; readonly text: string }>;
  /** ⭐ C8c · C3b-fix · D6 · a workbook's sheets in tab order — each one's name, whether Excel shows it, and how many of its
   *  cells were WRITTEN holding exactly one Tanzanian mobile (the count `chooseSheet` reads, as built) — so a test can
   *  restate the sheet choice instead of trusting the reader. Absent where no test needs it. */
  readonly sheets?: ReadonlyArray<{ readonly name: string; readonly visible: boolean; readonly mobiles: number }>;
};

export type RealWorldOptions = { readonly big?: boolean };

/* ══ THE PRNG — mulberry32, one stream per file ═══════════════════════════════════════════════════════════════════ */

const SEED = 20261009;

/** FNV-1a: a file's name to a 32-bit seed, so each file has its own stream and changing one never shifts another. */
function fnv1a(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

class Rng {
  private state: number;
  constructor(label: string) {
    this.state = (fnv1a(label) ^ SEED) >>> 0;
  }
  /** A uniform float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(n: number): number {
    return Math.floor(this.next() * n);
  }
  pick<T>(list: readonly T[]): T {
    return list[this.int(list.length)];
  }
  chance(p: number): boolean {
    return this.next() < p;
  }
  digits(n: number): string {
    let s = "";
    for (let i = 0; i < n; i++) s += String(this.int(10));
    return s;
  }
  bytes(n: number): number[] {
    const out: number[] = [];
    for (let i = 0; i < n; i++) out.push(this.int(256));
    return out;
  }
  hex(n: number): string {
    let s = "";
    for (let i = 0; i < n; i++) s += this.int(16).toString(16);
    return s;
  }
}

/* ══ THE NUMBERING FACTS — read from THE ONE TABLE, never retyped ═════════════════════════════════════════════════ */

const SENDABLE_ROWS = TZ_MOBILE_NDCS.filter((r) => r.sendable);
/** Where every random valid number comes from: sendable and undisputed. */
const RANDOM_NDCS: readonly string[] = SENDABLE_ROWS.filter((r) => r.disputed === undefined).map((r) => r.ndc);
/** Sendable ranges the regulator and the carriers disagree on (060 today) — accepted and flagged; used deliberately. */
const DISPUTED_NDCS: readonly string[] = SENDABLE_ROWS.filter((r) => r.disputed !== undefined).map((r) => r.ndc);
/** Allocated ranges with no live network (Telxer's 064 today) — refused as unallocated. */
const WITHDRAWN_NDCS: readonly string[] = TZ_MOBILE_NDCS.filter((r) => !r.sendable).map((r) => r.ndc);
/** TCRA's geographic fixed-line codes (tz-msisdn.ts keeps them private): a landline verdict for each. */
const FIXED_LINE_AREAS: readonly string[] = ["22", "23", "24", "25", "26", "27", "28"];
/** A national lead no plan holds — 011… is refused as "not part of Tanzania's numbering plan". */
const UNPLANNED_LEAD = "11";

/** The production-safe pattern (see the header): national 7100000NN, NN = 01–34. */
const QA_NDC = "71";
const QA_STEM = "7100000";
const QA_VALID_COUNT = 34;
const QA_TAG = "qa-import-check";
const QA_PREFIX = `QA Import ${EM_DASH} `;

const keyOf = (national: string): string => TZ_COUNTRY_CODE + national;
const pad2 = (n: number): string => String(n).padStart(2, "0");

function fieldSpec(key: ImportFieldKey): ContactFieldSpec {
  const f = CONTACT_FIELDS.find((x) => x.key === key);
  if (f === undefined) throw new Error(`real-world-files: CONTACT_FIELDS has no ${key} field`);
  return f;
}

/** The sample sheet's own numbers (`CONTACT_FIELDS` phone samples): U30 must refuse them, so no file draws one. */
const SAMPLE_NATIONALS: ReadonlySet<string> = new Set(
  fieldSpec("phone").samples.flatMap((s) => {
    const msisdn = parseTzNumber(s).msisdn;
    return msisdn === null ? [] : [msisdn.slice(TZ_COUNTRY_CODE.length)];
  }),
);

/** Never drawn at random: a sample number, the production-safe block, or one ending in six zeros (an XLSX reader
 *  writes a stored 255…000000 as Excel's shortened text — A1.3 — and that number must stay the deliberate case). */
const isReserved = (national: string): boolean =>
  SAMPLE_NATIONALS.has(national) || national.startsWith(QA_STEM) || national.endsWith("000000");

/**
 * A header cell exactly as written, PROVED to be one of the field's own spellings in `CONTACT_FIELDS` — so no file
 * here carries an alias someone invented. A renamed alias stops the generator instead of quietly un-mapping a column.
 */
function aliasHeader(key: ImportFieldKey, written: string, strength: "strong" | "weak" = "strong"): string {
  const f = fieldSpec(key);
  const list = strength === "strong" ? f.aliases : f.weakAliases;
  if (!list.includes(normaliseHeader(written))) {
    throw new Error(`real-world-files: "${written}" is not a ${strength} ${key} alias in CONTACT_FIELDS`);
  }
  return written;
}

/** A header cell PROVED to be no field's spelling — a column the importer must leave unread. */
function unknownHeader(written: string): string {
  const k = normaliseHeader(written);
  for (const f of CONTACT_FIELDS) {
    if (f.aliases.includes(k) || f.weakAliases.includes(k)) throw new Error(`real-world-files: "${written}" is a ${f.key} alias`);
  }
  return written;
}

/** Hands out national numbers, each at most once per file. */
class NumberBook {
  private readonly rng: Rng;
  private readonly used = new Set<string>();
  constructor(rng: Rng) {
    this.rng = rng;
  }
  claim(national: string): boolean {
    if (this.used.has(national) || isReserved(national)) return false;
    this.used.add(national);
    return true;
  }
  fresh(ndcs: readonly string[] = RANDOM_NDCS): string {
    for (;;) {
      const national = this.rng.pick(ndcs) + this.rng.digits(7);
      if (this.claim(national)) return national;
    }
  }
  /** A fresh number that starts with `prefix` (two numbers Excel shortens to ONE text share their first digits). */
  freshStarting(prefix: string): string {
    for (;;) {
      const national = prefix + this.rng.digits(9 - prefix.length);
      if (this.claim(national)) return national;
    }
  }
}

/* ══ SPELLINGS — how a Tanzanian really writes one number ═════════════════════════════════════════════════════════ */

/** The first nine are the brief's list, in its order; the last two are the commonest of all. */
const SPELLINGS = [
  "spaced", // 0712 345 678
  "plus", // +255712345678
  "bare255", // 255712345678
  "lostZero", // 712345678 — a spreadsheet ate the zero
  "parens", // (0712) 345-678
  "dashed", // 0712-345-678
  "dotted", // 0712.345.678
  "plusTrunk", // +255 (0)712 345 678 — the business-card spelling
  "idd", // 00255712345678
  "plusSpaced", // +255 712 345 678
  "compact", // 0712345678
] as const;
type Spelling = (typeof SPELLINGS)[number];

const SPELL: Readonly<Record<Spelling, (n: string, a: string, b: string, c: string) => string>> = {
  spaced: (_n, a, b, c) => `0${a} ${b} ${c}`,
  plus: (n) => `+${TZ_COUNTRY_CODE}${n}`,
  bare255: (n) => TZ_COUNTRY_CODE + n,
  lostZero: (n) => n,
  parens: (_n, a, b, c) => `(0${a}) ${b}-${c}`,
  dashed: (_n, a, b, c) => `0${a}-${b}-${c}`,
  dotted: (_n, a, b, c) => `0${a}.${b}.${c}`,
  plusTrunk: (_n, a, b, c) => `+${TZ_COUNTRY_CODE} (0)${a} ${b} ${c}`,
  idd: (n) => `00${TZ_COUNTRY_CODE}${n}`,
  plusSpaced: (_n, a, b, c) => `+${TZ_COUNTRY_CODE} ${a} ${b} ${c}`,
  compact: (n) => `0${n}`,
};

function spell(national: string, how: Spelling): string {
  return SPELL[how](national, national.slice(0, 3), national.slice(3, 6), national.slice(6));
}

/** Another spelling than `index`'s, never the same one. */
const otherSpelling = (index: number, rng: Rng): number => (index + 1 + rng.int(SPELLINGS.length - 1)) % SPELLINGS.length;

/* ══ PHONE VALUES — each one built as a kind ══════════════════════════════════════════════════════════════════════ */

type PhoneDraft = Omit<PhoneTruth, "duplicateOf">;

function mobile(national: string, how: Spelling): PhoneDraft {
  return { written: spell(national, how), key: keyOf(national), kind: how === "lostZero" ? "leading_zero_lost" : "valid" };
}

const at = (p: PhoneDraft, source: string): PhoneDraft => ({ ...p, source });

/** Kenya, Uganda, the US fictional 555-01xx block, Ofcom's fictional 07700 900xxx, Kenya through the IDD, Rwanda. */
function foreign(rng: Rng, variant: number = rng.int(6)): PhoneDraft {
  const d = (n: number): string => rng.digits(n);
  const written =
    variant === 0 ? `+254 7${d(2)} ${d(3)} ${d(3)}`
    : variant === 1 ? `+256 7${d(2)} ${d(3)} ${d(3)}`
    : variant === 2 ? `+1 (202) 555-01${d(2)}`
    : variant === 3 ? `+44 7700 900${d(3)}`
    : variant === 4 ? `00254 7${d(2)} ${d(3)} ${d(3)}`
    : `+250 78${d(1)} ${d(3)} ${d(3)}`;
  return { written, key: null, kind: "foreign" };
}

/** A fixed line: area code + seven digits, written at home (022 211 3456) or internationally (+255 22 211 3456). */
function landlineParts(rng: Rng): { readonly area: string; readonly rest: string } {
  return { area: rng.pick(FIXED_LINE_AREAS), rest: String(1 + rng.int(9)) + rng.digits(6) };
}
function landline(rng: Rng, international = false): PhoneDraft {
  const { area, rest } = landlineParts(rng);
  const tail = `${rest.slice(0, 3)} ${rest.slice(3)}`;
  return { written: international ? `+${TZ_COUNTRY_CODE} ${area} ${tail}` : `0${area} ${tail}`, key: null, kind: "landline" };
}

/** 0800 + six digits: parseTzNumber's toll-free branch (its verdict is "landline", its sentence names toll-free). */
function tollFree(rng: Rng): PhoneDraft {
  return { written: `0800 ${rng.digits(3)} ${rng.digits(3)}`, key: null, kind: "tollfree" };
}

/** The last digit lost: eight national digits. */
function tooShort(national: string): PhoneDraft {
  return { written: `0${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6, 8)}`, key: null, kind: "short" };
}

/** One digit too many: ten national digits. */
function tooLong(rng: Rng, national: string): PhoneDraft {
  return { written: `0${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}${rng.int(10)}`, key: null, kind: "long" };
}

/** A look-alike letter typed for one SUBSCRIBER digit (never the range): the letter drops out and eight digits remain. */
const LOOKALIKE: Readonly<Record<string, string>> = {
  "0": "O", "1": "l", "2": "Z", "3": "E", "4": "A", "5": "S", "6": "G", "7": "T", "8": "B", "9": "g",
};
function withLetter(rng: Rng, national: string): PhoneDraft {
  const i = 3 + rng.int(6);
  const s = national.slice(0, i) + LOOKALIKE[national.charAt(i)] + national.slice(i + 1);
  return { written: `0${s.slice(0, 3)} ${s.slice(3, 6)} ${s.slice(6)}`, key: null, kind: "letters" };
}

/** A range with no live network (the table's non-sendable row) or one no plan holds (011…). */
function unallocated(rng: Rng, which: "withdrawn" | "unplanned", subscriber: string = rng.digits(7)): PhoneDraft {
  const lead = which === "withdrawn" && WITHDRAWN_NDCS.length > 0 ? rng.pick(WITHDRAWN_NDCS) : UNPLANNED_LEAD;
  const n = lead + subscriber;
  return { written: `0${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`, key: null, kind: "unallocated" };
}

const NO_NUMBER_WORDS: readonly string[] = ["hakuna", "N/A", "-", "simu haina", "?", "atatuma baadaye"];
function noNumber(word: string): PhoneDraft {
  return { written: word, key: null, kind: "none" };
}

/** Two numbers in one cell, joined as offices join them (" / ") or as Google does (" ::: "): one value, too long for
 *  parseTzNumber — two DISTINCT mobiles here, so the importer refuses the row (C3b-fix D3), never taking one of them. */
function twoInOneCell(n1: string, s1: Spelling, n2: string, s2: Spelling, joiner: string): PhoneDraft {
  return { written: spell(n1, s1) + joiner + spell(n2, s2), key: null, kind: "long", holds: [keyOf(n1), keyOf(n2)] };
}

const TRAILING_ZEROS = /0+$/;
const TRAILING_POINT = /[.]$/;

/**
 * Excel's General display of a long number, and the number a re-saved CSV turns it back into: six significant
 * digits rounded half up (decimal arithmetic on the digits — never a float), trailing zeros dropped, a two-digit
 * exponent. 255712345678 reads 2.55712E+11 and comes back as 255712000000; 712345678 reads 7.12346E+08.
 */
function excelGeneral(digits: string): { readonly text: string; readonly stored: number } {
  const exp = digits.length - 1;
  const head = Number(digits.slice(0, 6)) + (Number(digits.charAt(6) || "0") >= 5 ? 1 : 0);
  const six = String(head);
  const mantissa = `${six.charAt(0)}.${six.slice(1)}`.replace(TRAILING_ZEROS, "").replace(TRAILING_POINT, "");
  return { text: `${mantissa}E+${String(exp).padStart(2, "0")}`, stored: head * 10 ** (exp - 5) };
}

/** Excel's shortened text for a key (12 digits) or a national number (9) — the decimal comma for a comma locale. */
function shortenedText(digits: string, decimalComma = false): PhoneDraft {
  const text = excelGeneral(digits).text;
  return {
    written: decimalComma ? text.replace(".", ",") : text,
    key: null,
    kind: "excel_scientific",
    lost: digits.length === 12 ? digits : keyOf(digits),
  };
}

/* ══ THE SELF-CHECK — the truth is asked of the code it describes before a byte is written ════════════════════════ */

const VALID_KEY = new RegExp(`^${TZ_COUNTRY_CODE}[67][0-9]{8}$`);
const NINE_DIGITS = /^[67][0-9]{8}$/;
const TEL_SCHEME = /^tel:/i;

/** A vCard 4.0 tel: URI's number — RFC 3966: the scheme off, the ;parameters cut. Any other value is itself. */
function telNumberText(written: string): string {
  if (!TEL_SCHEME.test(written)) return written;
  const rest = written.slice(4);
  const cut = rest.indexOf(";");
  return (cut < 0 ? rest : rest.slice(0, cut)).trim();
}

/** The verdict each kind must earn from parseTzNumber (null: judged by Excel's shortened-form detector instead). */
const VERDICT_OF: Readonly<Record<PhoneKind, TzVerdict | null>> = {
  valid: "ok",
  leading_zero_lost: "ok",
  foreign: "foreign",
  landline: "landline",
  tollfree: "landline",
  short: "too_short",
  long: "too_long",
  letters: "too_short",
  unallocated: "unallocated_prefix",
  none: "not_a_number",
  excel_scientific: null,
};

/** Why a phone value is not the kind it was built as — or null when parseTzNumber agrees. */
function phoneProblem(p: PhoneDraft): string | null {
  const keyed = p.kind === "valid" || p.kind === "leading_zero_lost";
  if (keyed && (p.key === null || !VALID_KEY.test(p.key))) return `built as ${p.kind} without a ${TZ_COUNTRY_CODE} key`;
  if (!keyed && p.key !== null) return `built as ${p.kind}, yet it carries a key`;
  if (p.kind === "leading_zero_lost" && !NINE_DIGITS.test(p.written)) return "a lost leading zero leaves exactly nine digits";
  const want = VERDICT_OF[p.kind];
  if (want === null) {
    if (p.cell === "number") {
      const n = Number(p.written);
      return n >= 1e11 && n % 1e6 === 0 ? null : "not the number a re-saved 2.55712E+11 becomes";
    }
    return looksExcelShortened(p.written) ? null : "not in Excel's shortened form";
  }
  const v = parseTzNumber(telNumberText(p.written));
  if (v.verdict !== want) return `parseTzNumber says ${v.verdict}; it was built as ${p.kind} (${want})`;
  if (keyed && v.msisdn !== p.key) return `parseTzNumber reads ${String(v.msisdn)}; it was built as ${String(p.key)}`;
  return null;
}

/** For the streamed files: stop at the first value whose verdict is not its kind. */
function assertPhone(file: string, line: number, p: PhoneDraft): void {
  const problem = phoneProblem(p);
  if (problem !== null) throw new Error(`real-world-files: ${file} line ${line}: "${p.written}" — ${problem}`);
}

/** The production-safe set's own promises: the tag, the name prefix and the documented pattern, on every row. */
function qaProblems(file: FileTruth): string[] {
  const out: string[] = [];
  for (const person of file.people ?? []) {
    if (person.tags !== QA_TAG) out.push(`line ${person.line}: not tagged ${QA_TAG}`);
    if (person.name === null || !person.name.startsWith(QA_PREFIX)) out.push(`line ${person.line}: the name lacks the QA prefix`);
    for (const p of person.phones) {
      if (p.key === null) continue;
      const nn = Number(p.key.slice(-2));
      if (!p.key.startsWith(keyOf(QA_STEM)) || nn < 1 || nn > QA_VALID_COUNT) out.push(`line ${person.line}: ${p.key} is outside the pattern`);
    }
  }
  return out;
}

/**
 * Every disagreement between a file's truth and the code it describes, one sentence each — empty when none. Run on
 * every small file before it is written; exported so a test can ask it of a manifest it loaded.
 */
export function checkFileTruth(file: FileTruth): string[] {
  const problems: string[] = [];
  for (const person of file.people ?? []) {
    for (const p of person.phones) {
      const problem = phoneProblem(p);
      if (problem !== null) problems.push(`line ${person.line}: "${p.written}" — ${problem}`);
    }
  }
  if (file.name.startsWith("prod-check-")) problems.push(...qaProblems(file));
  return problems;
}

/* ══ RECORDS → TRUTH ══════════════════════════════════════════════════════════════════════════════════════════════ */

type RecordDraft = {
  readonly name: string | null;
  readonly phones: readonly PhoneDraft[];
  readonly email?: string | null;
  readonly tags?: string | null;
  readonly blank?: boolean;
  readonly broken?: boolean;
  /** C8c · D5a · a broken record's swallowed physical lines (`PersonTruth.swallowedLines`). */
  readonly swallowedLines?: number;
};

const BLANK: RecordDraft = { name: null, phones: [], blank: true };

/** Lines in file order from `firstLine`, and every repeat pointed at the first line that held its key. */
function settlePeople(drafts: readonly RecordDraft[], firstLine: number): PersonTruth[] {
  const firstSeen = new Map<string, number>();
  const out: PersonTruth[] = [];
  for (let i = 0; i < drafts.length; i++) {
    const d = drafts[i];
    const line = firstLine + i;
    let recordDup: number | null = null;
    const phones: PhoneTruth[] = [];
    for (const p of d.phones) {
      let duplicateOf: number | null = null;
      if (p.key !== null) {
        const seen = firstSeen.get(p.key);
        if (seen === undefined) firstSeen.set(p.key, line);
        else if (seen !== line) {
          duplicateOf = seen;
          recordDup = recordDup === null ? seen : Math.min(recordDup, seen);
        }
      }
      phones.push({ ...p, duplicateOf });
    }
    out.push({
      line,
      name: d.name,
      phones,
      duplicateOf: recordDup,
      blank: d.blank === true,
      broken: d.broken === true,
      ...(d.email === undefined ? {} : { email: d.email }),
      ...(d.tags === undefined ? {} : { tags: d.tags }),
      ...(d.swallowedLines === undefined ? {} : { swallowedLines: d.swallowedLines }),
    });
  }
  return out;
}

function aggregateOf(people: readonly PersonTruth[]): FileAggregate {
  let records = 0;
  let duplicateRows = 0;
  let invalidRows = 0;
  const keys = new Set<string>();
  for (const p of people) {
    if (p.blank) continue;
    records++;
    if (p.duplicateOf !== null) duplicateRows++;
    let keyed = false;
    for (const ph of p.phones) {
      if (ph.key === null) continue;
      keys.add(ph.key);
      keyed = true;
    }
    if (!keyed) invalidRows++;
  }
  return { records, validDistinct: keys.size, duplicateRows, invalidRows };
}

/** A small file, built in memory: its bytes and everything its truth says but the counts. */
type Built = {
  readonly name: string;
  readonly format: FileFormat;
  readonly mimics: string;
  readonly data: Buffer;
  readonly encoding: FileEncoding;
  readonly lineEnding: LineEnding;
  readonly delimiter: Delimiter | null;
  readonly header: readonly string[] | null;
  readonly sheet: string | null;
  readonly refusal: FormatRefusalKind | null;
  readonly brokenAtByte: number | null;
  readonly notes: readonly string[];
  readonly people: readonly PersonTruth[];
  /** C8c · D7 / D6 · carried to the truth only when a maker sets them (`FileTruth.titleRows`, `FileTruth.sheets`). */
  readonly titleRows?: FileTruth["titleRows"];
  readonly sheets?: FileTruth["sheets"];
};

function settle(b: Built): FileTruth {
  return {
    name: b.name,
    format: b.format,
    mimics: b.mimics,
    bytes: b.data.length,
    encoding: b.encoding,
    lineEnding: b.lineEnding,
    delimiter: b.delimiter,
    header: b.header,
    sheet: b.sheet,
    refusal: b.refusal,
    brokenAtByte: b.brokenAtByte,
    notes: b.notes,
    aggregate: aggregateOf(b.people),
    people: b.people,
    big: false,
    // ⭐ C8c · after every other key, and only when set: every earlier file's manifest entry stays byte for byte as it was.
    ...(b.titleRows === undefined ? {} : { titleRows: b.titleRows }),
    ...(b.sheets === undefined ? {} : { sheets: b.sheets }),
  };
}

/* ══ TEXT ENCODINGS — the bytes Excel, Outlook and Windows really write ══════════════════════════════════════════ */

type TextEncoding = "utf-8" | "utf-8-bom" | "windows-1252" | "utf-16le-bom";

/** Windows-1252's 0x80–0x9F row — the one place it is not Latin-1 (0x81, 0x8D, 0x8F, 0x90 and 0x9D are unassigned). */
const CP1252_HIGH: ReadonlyMap<number, number> = new Map([
  [0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84], [0x2026, 0x85], [0x2020, 0x86], [0x2021, 0x87],
  [0x02c6, 0x88], [0x2030, 0x89], [0x0160, 0x8a], [0x2039, 0x8b], [0x0152, 0x8c], [0x017d, 0x8e], [0x2018, 0x91],
  [0x2019, 0x92], [0x201c, 0x93], [0x201d, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97], [0x02dc, 0x98],
  [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b], [0x0153, 0x9c], [0x017e, 0x9e], [0x0178, 0x9f],
]);

/** Text as an English-locale Windows PC saves it; a character the code page cannot hold stops the run. */
function encode1252(text: string): Buffer {
  const out: number[] = [];
  for (const ch of text) {
    const c = ch.codePointAt(0) ?? 0;
    if (c < 0x80 || (c >= 0xa0 && c <= 0xff)) {
      out.push(c);
      continue;
    }
    const b = CP1252_HIGH.get(c);
    if (b === undefined) throw new Error(`real-world-files: U+${c.toString(16).toUpperCase()} has no Windows-1252 byte`);
    out.push(b);
  }
  return Buffer.from(out);
}

function encodeText(text: string, enc: TextEncoding): Buffer {
  if (enc === "utf-8") return Buffer.from(text, "utf8");
  if (enc === "utf-8-bom") return Buffer.concat([Buffer.from(UTF8_BOM), Buffer.from(text, "utf8")]);
  if (enc === "utf-16le-bom") return Buffer.concat([Buffer.from(UTF16LE_BOM), Buffer.from(text, "utf16le")]);
  return encode1252(text);
}

/* ══ CSV — quoted the way the writer being mimicked quotes ════════════════════════════════════════════════════════ */

type CsvStyle = { readonly delimiter: string; readonly eol: string; readonly quoteAll: boolean };
/** Excel: a cell is quoted only when it holds the separator, a quotation mark or a line break. */
const EXCEL_COMMA: CsvStyle = { delimiter: ",", eol: CRLF, quoteAll: false };
const EXCEL_SEMICOLON: CsvStyle = { delimiter: ";", eol: CRLF, quoteAll: false };
const EXCEL_TAB: CsvStyle = { delimiter: TAB, eol: CRLF, quoteAll: false };
/** Outlook: every field quoted, the empty ones too. */
const OUTLOOK_STYLE: CsvStyle = { delimiter: ",", eol: CRLF, quoteAll: true };

function csvField(value: string, style: CsvStyle): string {
  const quote =
    style.quoteAll || value.includes(style.delimiter) || value.includes(QUOTE) || value.includes(CR) || value.includes(LF);
  return quote ? QUOTE + value.split(QUOTE).join(QUOTE + QUOTE) + QUOTE : value;
}

function csvLine(cells: readonly string[], style: CsvStyle): string {
  return cells.map((c) => csvField(c, style)).join(style.delimiter) + style.eol;
}

/** One record of a text file: its text exactly as written (line end included), and its truth. */
type TextRecord = { readonly text: string; readonly draft: RecordDraft };

type TextSpec = {
  readonly name: string;
  readonly format: "csv" | "paste" | "vcard";
  readonly mimics: string;
  readonly encoding: TextEncoding;
  readonly lineEnding: LineEnding;
  readonly delimiter: Delimiter | null;
  readonly header: readonly string[] | null;
  readonly notes: readonly string[];
  /** The text before the first record: Excel's sep= line and the header row (C8c: and a title above it). */
  readonly lead: string;
  readonly records: readonly TextRecord[];
  /** The first record's line: 2 under a header row, 1 without one. */
  readonly firstLine: number;
  /** C8c · D7 · the title rows the lead holds above the column names (`FileTruth.titleRows`). */
  readonly titleRows?: FileTruth["titleRows"];
};

function textBuilt(s: TextSpec): Built {
  let text = s.lead;
  let brokenAt: number | null = null;
  const drafts: RecordDraft[] = [];
  for (const r of s.records) {
    if (r.draft.broken === true && brokenAt === null) brokenAt = text.length;
    text += r.text;
    drafts.push(r.draft);
  }
  return {
    name: s.name,
    format: s.format,
    mimics: s.mimics,
    data: encodeText(text, s.encoding),
    encoding: s.encoding,
    lineEnding: s.lineEnding,
    delimiter: s.delimiter,
    header: s.header,
    sheet: null,
    refusal: null,
    brokenAtByte: brokenAt === null ? null : encodeText(text.slice(0, brokenAt), s.encoding).length,
    notes: s.notes,
    people: settlePeople(drafts, s.firstLine),
    ...(s.titleRows === undefined ? {} : { titleRows: s.titleRows }),
  };
}

/* ══ vCARD — escaping, folding and Android's quoted-printable ═════════════════════════════════════════════════════ */

/** vCard 3.0/4.0 TEXT escaping: the backslash, the comma, the semicolon and a line break, each behind a backslash. */
function vEscape(s: string): string {
  return s
    .split(BACKSLASH).join(BACKSLASH + BACKSLASH)
    .split(",").join(BACKSLASH + ",")
    .split(";").join(BACKSLASH + ";")
    .split(LF).join(BACKSLASH + "n");
}

const FOLD_OCTETS = 75;

function utf8Size(ch: string): number {
  const c = ch.codePointAt(0) ?? 0;
  return c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
}

function isPrintableAscii(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x20 || c > 0x7e) return false;
  }
  return true;
}

/**
 * One content line folded at 75 OCTETS (RFC 2425 §5.8.1, RFC 6350 §3.2): each continuation starts with one space.
 * A character is never split across a fold, and an escape pair (a backslash and its character) moves whole.
 */
function foldLine(line: string, eol: string): string {
  if (isPrintableAscii(line) && !line.includes(BACKSLASH)) {
    if (line.length <= FOLD_OCTETS) return line + eol;
    let out = line.slice(0, FOLD_OCTETS) + eol;
    for (let i = FOLD_OCTETS; i < line.length; i += FOLD_OCTETS - 1) out += ` ${line.slice(i, i + FOLD_OCTETS - 1)}${eol}`;
    return out;
  }
  const chars = Array.from(line);
  let out = "";
  let current = "";
  let octets = 0;
  let room = FOLD_OCTETS;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const need = ch === BACKSLASH && i + 1 < chars.length ? utf8Size(ch) + utf8Size(chars[i + 1]) : utf8Size(ch);
    if (current !== "" && octets + need > room) {
      out += `${current}${eol} `;
      current = "";
      octets = 0;
      room = FOLD_OCTETS - 1;
    }
    current += ch;
    octets += utf8Size(ch);
  }
  return out + current + eol;
}

/** A card's lines, each ended by `eol`; folded for 3.0 and 4.0, never for Android's 2.1. */
function cardText(lines: readonly string[], eol: string, fold: boolean): string {
  return lines.map((l) => (fold ? foldLine(l, eol) : l + eol)).join("");
}

/**
 * ⭐ AOSP's `VCardUtils.toQuotedPrintable`, byte for byte: EVERY UTF-8 byte as =XX, and after every 23rd byte a soft
 * line break ("=" and CRLF) — even after the LAST byte, which leaves a blank line behind the property when its value is
 * exactly 23 bytes long. Both are what an Android phone really exports, and both are what the reader must survive.
 */
function aospQuotedPrintable(text: string): string {
  let out = "";
  let count = 0;
  for (const b of Buffer.from(text, "utf8")) {
    out += `=${b.toString(16).toUpperCase().padStart(2, "0")}`;
    count += 3;
    if (count >= 67) {
      out += `=${CRLF}`;
      count = 0;
    }
  }
  return out;
}

/** A 2.1 name as Android writes it: plain when every part is printable ASCII, every part QP-encoded otherwise. */
function androidNameLines(given: string, family: string, fn: string): string[] {
  if (isPrintableAscii(given) && isPrintableAscii(family) && isPrintableAscii(fn)) return [`N:${family};${given};;;`, `FN:${fn}`];
  return [
    `N;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:${aospQuotedPrintable(family)};${aospQuotedPrintable(given)};;;`,
    `FN;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:${aospQuotedPrintable(fn)}`,
  ];
}

/** A contact photo's bytes: a JFIF head, filler and the end marker. A length of 3k+1 makes its base64 end "==". */
function jpegLike(rng: Rng, size: number): Buffer {
  return Buffer.from([...JPEG_HEAD, ...rng.bytes(size - JPEG_HEAD.length - JPEG_TAIL.length), ...JPEG_TAIL]);
}

/* ══ ZIP — a STORE-only writer for the .ods, and the clock pinned out of exceljs's zips ═══════════════════════════ */

const SIG_LOCAL = 0x04034b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_END = 0x06054b50;
/** 2026-10-01 08:00:00 in MS-DOS form — every zip entry here carries it. */
const DOS_TIME = 8 << 11;
const DOS_DATE = ((2026 - 1980) << 9) | (10 << 5) | 1;
/** The workbook dates exceljs writes into docProps/core.xml (it would write the clock otherwise). */
const WORKBOOK_DATE = new Date(Date.UTC(2026, 9, 1, 8, 0, 0));

const CRC_TABLE: readonly number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t.push(c >>> 0);
  }
  return t;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * A zip of STORED entries: a local header and the bytes for each, then the central directory and the end record. ODF
 * wants its first entry to be `mimetype`, stored, with no extra field — exactly what `headIsOdsZip` reads.
 */
function storeZip(entries: ReadonlyArray<{ readonly name: string; readonly data: Buffer }>): Buffer {
  const parts: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const e of entries) {
    const name = Buffer.from(e.name, "utf8");
    const crc = crc32(e.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(SIG_LOCAL, 0);
    local.writeUInt16LE(10, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(e.data.length, 18);
    local.writeUInt32LE(e.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    parts.push(local, name, e.data);
    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(SIG_CENTRAL, 0);
    dir.writeUInt16LE(20, 4);
    dir.writeUInt16LE(10, 6);
    dir.writeUInt16LE(0, 8);
    dir.writeUInt16LE(0, 10);
    dir.writeUInt16LE(DOS_TIME, 12);
    dir.writeUInt16LE(DOS_DATE, 14);
    dir.writeUInt32LE(crc, 16);
    dir.writeUInt32LE(e.data.length, 20);
    dir.writeUInt32LE(e.data.length, 24);
    dir.writeUInt16LE(name.length, 28);
    dir.writeUInt32LE(offset, 42);
    central.push(dir, name);
    offset += local.length + name.length + e.data.length;
  }
  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(SIG_END, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, directory, end]);
}

/**
 * exceljs's two zip writers (JSZip for `writeBuffer`, archiver for the streaming writer) stamp every entry with the
 * clock. Every local header and central-directory entry gets the fixed DOS time and date instead — a header field
 * outside every CRC, so nothing else changes. A zip64 archive is refused rather than half-pinned.
 */
function pinZipTimes(zip: Buffer): Buffer {
  const out = Buffer.from(zip);
  let end = -1;
  for (let i = out.length - 22; i >= 0 && i >= out.length - 22 - 0xffff; i--) {
    if (out.readUInt32LE(i) === SIG_END) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new Error("real-world-files: no zip end record to pin");
  const entries = out.readUInt16LE(end + 10);
  let at = out.readUInt32LE(end + 16);
  if (entries === 0xffff || at === 0xffffffff) throw new Error("real-world-files: a zip64 archive cannot be pinned");
  for (let k = 0; k < entries; k++) {
    if (out.readUInt32LE(at) !== SIG_CENTRAL) throw new Error("real-world-files: a broken central directory");
    out.writeUInt16LE(DOS_TIME, at + 12);
    out.writeUInt16LE(DOS_DATE, at + 14);
    const local = out.readUInt32LE(at + 42);
    if (out.readUInt32LE(local) !== SIG_LOCAL) throw new Error("real-world-files: a central entry points at no local header");
    out.writeUInt16LE(DOS_TIME, local + 10);
    out.writeUInt16LE(DOS_DATE, local + 12);
    at += 46 + out.readUInt16LE(at + 28) + out.readUInt16LE(at + 30) + out.readUInt16LE(at + 32);
  }
  return out;
}

function newWorkbook(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Ofisi ya Masoko";
  wb.lastModifiedBy = "Ofisi ya Masoko";
  wb.created = WORKBOOK_DATE;
  wb.modified = WORKBOOK_DATE;
  return wb;
}

async function workbookBytes(wb: ExcelJS.Workbook): Promise<Buffer> {
  return pinZipTimes(Buffer.from(await wb.xlsx.writeBuffer()));
}

/* ══ PEOPLE — invented: common Tanzanian given names and surnames, combined at random ═════════════════════════════ */

const GIVEN: readonly string[] = [
  "Amina", "Baraka", "Neema", "Juma", "Zawadi", "Rehema", "Hamisi", "Mwanaisha", "Saidi", "Halima", "Faraji", "Upendo",
  "Tumaini", "Imani", "Pendo", "Daudi", "Mussa", "Salma", "Rashidi", "Bahati", "Subira", "Asha", "Kassim", "Mariamu",
  "Yusufu", "Esther", "Godfrey", "Furaha", "Shabani", "Ramadhani", "Mwajuma", "Abdallah", "Hadija", "Khamis", "Fatuma",
  "Selemani", "Agnes", "Emmanuel", "Lucy", "Petro", "Yohana", "Zuhura", "Zainabu", "Omari", "Hassani", "Idrisa", "Eliya",
  "Witness", "Happiness", "Elisha", "Tatu", "Mwanahawa", "Kheri", "Nuru", "Sharifa", "Jabiri", "Doto", "Kulwa", "Shukuru",
];
const FAMILY: readonly string[] = [
  "Mwakalinga", "Mushi", "Kimaro", "Massawe", "Mrema", "Lyimo", "Swai", "Temba", "Shirima", "Mollel", "Laizer", "Kileo",
  "Minja", "Mwamba", "Njau", "Kweka", "Urassa", "Tarimo", "Mbwambo", "Kisanga", "Mfinanga", "Haule", "Nyoni", "Komba",
  "Mbilinyi", "Chaula", "Mwakyusa", "Sanga", "Kyando", "Mapunda", "Ngonyani", "Mhagama", "Chande", "Bakari", "Nassoro",
  "Kombo", "Makame", "Hamad", "Seif", "Ally", "Msuya", "Kessy", "Malisa", "Mtei", "Ndossi", "Kavishe", "Lema", "Massao",
];
const NOTES: readonly string[] = [
  "", "", "Anapenda ujumbe wa Kiswahili.", "", "Mteja wa zamani, Kariakoo.", `Usimpigie simu ${EM_DASH} SMS tu.`, "",
  "Alikuja stendi ya Mlimani City.",
];
const NICKNAMES: readonly string[] = ["Mama J", "Bro", "Dada", "Mzee", "JJ", "Shangazi"];
const ORGS: readonly string[] = ["Duka la Mama Ntilie", "Usafirishaji Ubungo", "Saluni ya Neema", "Kariakoo Electronics"];
/** Forty distinct tags for one cell — twice CONTACT_LIMITS.tags. */
const FORTY_TAGS: readonly string[] = [
  "wateja", "vip", "dar", "arusha", "mwanza", "dodoma", "mbeya", "tanga", "moshi", "morogoro", "iringa", "tabora", "kigoma",
  "mtwara", "lindi", "songea", "musoma", "bukoba", "shinyanga", "singida", "sumbawanga", "njombe", "geita", "babati",
  "bariadi", "mpanda", "kibaha", "zanzibar", "pemba", "mafia", "wakala", "mchezaji", "mpya", "zamani", "promo", "oktoba",
  "jumamosi", "jumapili", "usiku", "asubuhi",
];
/** A 300-character name with no digit in it: "Mwanaisha binti Saidi " repeated and cut, so it ends mid-word. */
const LONG_NAME = "Mwanaisha binti Saidi ".repeat(14).slice(0, 300);
const LONG_NOTE =
  "Alikutana nasi kwenye stendi ya Mlimani City, anapenda ujumbe wa Kiswahili; anaomba tusimpigie simu wikendi.";

type Who = { readonly given: string; readonly family: string; readonly name: string; readonly email: string };

function someone(rng: Rng): Who {
  const given = rng.pick(GIVEN);
  const family = rng.pick(FAMILY);
  return { given, family, name: `${given} ${family}`, email: `${given}.${family}@example.com`.toLowerCase() };
}

/** An email cell as offices fill them: often empty, sometimes in mixed case; always @example.com (RFC 2606). */
function emailCell(rng: Rng, who: Who): string {
  const r = rng.next();
  if (r < 0.35) return "";
  if (r < 0.45) return `${who.given}.${who.family}@Example.com`;
  return who.email;
}

/** The five columns the export writes, spelled as the export spells its labels — each proved an alias. */
const LABEL_HEADER: readonly string[] = [
  aliasHeader("phone", "Phone"),
  aliasHeader("name", "Name"),
  aliasHeader("email", "Email"),
  aliasHeader("tags", "Tags"),
  aliasHeader("notes", "Notes"),
];

/* ══ CSV FAMILY ═══════════════════════════════════════════════════════════════════════════════════════════════════ */

/** 1 · Excel "CSV UTF-8 (Comma delimited)": a BOM, CRLF, a cell quoted only when it must be. */
function makeExcelCsvUtf8(): Built {
  const name = "excel-csv-utf8.csv";
  const rng = new Rng(name);
  const book = new NumberBook(rng);
  const NAMES = new Map<number, string>([
    [3, "Asha Mwakalinga"], [5, "Grace O'Neill"], [8, 'Juma "JJ" Bakari'], [9, "Halima Said"], [12, "Mwakalinga, Asha"],
    [15, `${DESIRE} Kabeya`], [18, `Mama Ntilie ${POT_OF_FOOD}`], [21, ARABIC_NAME], [25, "Halima S."], [27, CHINESE_NAME],
  ]);
  /** person → the earlier person whose number it repeats, in another spelling. */
  const REPEATS = new Map<number, number>([[12, 3], [25, 9], [33, 3]]);
  const DISPUTED_AT = 30;
  const TAGS = ["vip; dar", "Dar, VIP", "VIP|Arusha", "wateja", "", "mawakala", "", "promo oktoba", "wachezaji; mwanza", ""];
  const nationals: string[] = [];
  const records: TextRecord[] = [];
  for (let i = 1; i <= 40; i++) {
    const who = someone(rng);
    const repeatOf = REPEATS.get(i);
    let national: string;
    let how: Spelling;
    if (repeatOf !== undefined) {
      national = nationals[repeatOf - 1];
      how = SPELLINGS[(repeatOf - 1 + 4) % SPELLINGS.length];
    } else {
      national = i === DISPUTED_AT && DISPUTED_NDCS.length > 0 ? book.fresh(DISPUTED_NDCS) : book.fresh();
      how = SPELLINGS[(i - 1) % SPELLINGS.length];
    }
    nationals.push(national);
    const special = NAMES.get(i);
    const person = special ?? who.name;
    const email = special === undefined ? emailCell(rng, who) : i === 5 ? "grace.oneill@example.com" : "";
    const tags = TAGS[(i - 1) % TAGS.length];
    const phone = mobile(national, how);
    records.push({
      text: csvLine([phone.written, person, email, tags, rng.pick(NOTES)], EXCEL_COMMA),
      draft: { name: person, phones: [phone], email, tags },
    });
  }
  const notes = [
    "Every phone is a Tanzanian mobile number. The spellings rotate through 0712 345 678, +255712345678, 255712345678, " +
      "712345678 (the leading zero lost — kind leading_zero_lost, still recoverable), (0712) 345-678, 0712-345-678, " +
      "0712.345.678, +255 (0)712 345 678, 00255712345678, +255 712 345 678 and 0712345678.",
    `Lines ${[...REPEATS.keys()].map((i) => i + 1).join(", ")} repeat an earlier number in another spelling; duplicateOf names the first.`,
    "Names: a comma inside quotes, doubled quotation marks, an apostrophe, accents, an emoji, Arabic and Chinese.",
  ];
  if (DISPUTED_NDCS.length > 0) {
    notes.push(`Line ${DISPUTED_AT + 1} is in the disputed 0${DISPUTED_NDCS[0]} range: tz-msisdn.ts accepts it and flags it.`);
  }
  return textBuilt({
    name,
    format: "csv",
    mimics: 'Excel "CSV UTF-8 (Comma delimited)" from an office contact sheet: BOM, CRLF, 40 people.',
    encoding: "utf-8-bom",
    lineEnding: "crlf",
    delimiter: "comma",
    header: LABEL_HEADER,
    notes,
    lead: csvLine(LABEL_HEADER, EXCEL_COMMA),
    records,
    firstLine: 2,
  });
}

/** 2 · Excel's plain "CSV" on a PC whose list separator is ';' — Windows-1252 bytes, no BOM. */
function makeSemicolon1252(): Built {
  const name = "excel-semicolon-1252.csv";
  const rng = new Rng(name);
  const book = new NumberBook(rng);
  const header = [
    aliasHeader("phone", "Mobile"),
    aliasHeader("name", "Full name"),
    aliasHeader("email", "E-mail"),
    aliasHeader("tags", "Categories"),
    aliasHeader("notes", "Comments"),
  ];
  const NAMES = new Map<number, string>([
    [2, `${DESIRE} Kabeya`], [5, `${NOELLA} Mrema`], [9, `Anita D${RIGHT_QUOTE}Souza`], [14, "Zuhura Ally"], [26, `${NOELLA} M.`],
  ]);
  const NOTE_AT = new Map<number, string>([
    [2, `Malipo ${EURO}5 ${EN_DASH} Oktoba`], [14, `Caf${E_ACUTE} ya Mama Zuhura, Kariakoo`], [17, `Alilipa ${EURO}20 ${EN_DASH} Septemba`],
  ]);
  const SHORTENED_AT = 21;
  const REPEAT_AT = 26;
  const REPEAT_OF = 5;
  const TAGS = ["vip; dar", "Dar, VIP", "wateja", "", "mawakala"];
  const HOW: readonly Spelling[] = ["spaced", "compact", "plusSpaced", "dashed"];
  const records: TextRecord[] = [];
  let noella = "";
  for (let i = 1; i <= 30; i++) {
    const who = someone(rng);
    let phone: PhoneDraft;
    if (i === SHORTENED_AT) phone = shortenedText(keyOf(book.fresh()), true);
    else if (i === REPEAT_AT) phone = mobile(noella, "plusSpaced");
    else {
      const national = book.fresh();
      if (i === REPEAT_OF) noella = national;
      phone = mobile(national, i === REPEAT_OF ? "spaced" : HOW[i % HOW.length]);
    }
    const special = NAMES.get(i);
    const person = special ?? who.name;
    const email = special === undefined ? emailCell(rng, who) : "";
    const tags = TAGS[i % TAGS.length];
    records.push({
      text: csvLine([phone.written, person, email, tags, NOTE_AT.get(i) ?? ""], EXCEL_SEMICOLON),
      draft: { name: person, phones: [phone], email, tags },
    });
  }
  return textBuilt({
    name,
    format: "csv",
    mimics: "Excel's plain CSV on a comma-decimal Windows PC: semicolon-separated, Windows-1252, CRLF, no BOM, 30 people.",
    encoding: "windows-1252",
    lineEnding: "crlf",
    delimiter: "semicolon",
    header,
    notes: [
      `Windows-1252 bytes from line 3: e-acute 0xE9, e-diaeresis 0xEB, the curly apostrophe 0x92, the euro 0x80, the en dash 0x96 — ` +
        "inside the first 4 KB, so the encoding sniff must choose windows-1252 (strict UTF-8 fails on them).",
      `Line ${SHORTENED_AT + 1} holds a comma-decimal Excel's shortened number (2,55…E+11): its digits are gone.`,
      `Line ${REPEAT_AT + 1} repeats line ${REPEAT_OF + 1}'s number in another spelling.`,
      "The headers are English aliases other than the export's labels: Mobile, Full name, E-mail, Categories, Comments.",
    ],
    lead: csvLine(header, EXCEL_SEMICOLON),
    records,
    firstLine: 2,
  });
}

/** 3 · "sep=;" on the first line — the hint a system writes so Excel opens its file in the right columns. */
function makeSepHint(): Built {
  const name = "excel-sep-hint.csv";
  const rng = new Rng(name);
  const book = new NumberBook(rng);
  const header = [aliasHeader("phone", "Simu"), aliasHeader("name", "Jina"), aliasHeader("tags", "Makundi"), aliasHeader("notes", "Maelezo")];
  const TAGS = ["Dar, VIP", "vip; dar", "wateja", ""];
  const NOTE_CELLS = ["", "Anapenda ujumbe wa Kiswahili.", "Mteja mpya, Mwanza.", ""];
  const REPEAT_AT = 11;
  const REPEAT_OF = 4;
  const nationals: string[] = [];
  const records: TextRecord[] = [];
  for (let i = 1; i <= 15; i++) {
    const who = someone(rng);
    const national = i === REPEAT_AT ? nationals[REPEAT_OF - 1] : book.fresh();
    nationals.push(national);
    const phone = mobile(national, i === REPEAT_AT ? "plusSpaced" : i % 2 === 0 ? "compact" : "spaced");
    const tags = TAGS[i % TAGS.length];
    records.push({
      text: csvLine([phone.written, who.name, tags, NOTE_CELLS[i % NOTE_CELLS.length]], EXCEL_SEMICOLON),
      draft: { name: who.name, phones: [phone], tags },
    });
  }
  return textBuilt({
    name,
    format: "csv",
    mimics: "A system export made for Excel: the sep=; directive on the first line, then semicolon-separated rows, UTF-8, CRLF.",
    encoding: "utf-8",
    lineEnding: "crlf",
    delimiter: "semicolon",
    header,
    notes: [
      "The sep=; line is not a row: every line number here is as Excel shows the file — the header is line 1.",
      "Commas inside cells are data, not separators; a cell holding a semicolon is quoted.",
      `Line ${REPEAT_AT + 1} repeats line ${REPEAT_OF + 1}'s number in another spelling.`,
    ],
    lead: `sep=;${CRLF}${csvLine(header, EXCEL_SEMICOLON)}`,
    records,
    firstLine: 2,
  });
}

/** 4 · A General-format phone column saved by Excel: the zero eaten, or the digits shortened to scientific form. */
function makeShortened(): Built {
  const name = "excel-shortened-numbers.csv";
  const rng = new Rng(name);
  const book = new NumberBook(rng);
  const header = [aliasHeader("phone", "Phone"), aliasHeader("name", "Name")];
  type Style = "sci12" | "twin" | "sci9" | "bare255" | "lostZero" | "spaced" | "plusSpaced";
  const PLAN: readonly Style[] = [
    "twin", "bare255", "lostZero", "sci9", "twin", "spaced", "bare255", "lostZero", "sci12", "sci9", "plusSpaced", "sci12",
    "lostZero", "bare255", "sci9",
  ];
  /** Two different numbers whose keys share the first six significant digits, the seventh below 5: ONE shortened text. */
  const twinPrefix = `712${rng.int(5)}`;
  const records: TextRecord[] = [];
  const twinLines: number[] = [];
  for (const [index, style] of PLAN.entries()) {
    const who = someone(rng);
    let phone: PhoneDraft;
    if (style === "twin") {
      phone = shortenedText(keyOf(book.freshStarting(twinPrefix)));
      twinLines.push(index + 2);
    } else if (style === "sci12") phone = shortenedText(keyOf(book.fresh()));
    else if (style === "sci9") phone = shortenedText(book.fresh());
    else phone = mobile(book.fresh(), style);
    records.push({ text: csvLine([phone.written, who.name], EXCEL_COMMA), draft: { name: who.name, phones: [phone] } });
  }
  return textBuilt({
    name,
    format: "csv",
    mimics: "A phone column left in General format and saved from Excel as CSV UTF-8: numbers already coerced before the import.",
    encoding: "utf-8-bom",
    lineEnding: "crlf",
    delimiter: "comma",
    header,
    notes: [
      "Recoverable: leading_zero_lost (712345678 — nine digits, the zero gone) and bare 255… twelve digits.",
      "NOT recoverable: excel_scientific (2.55712E+11, 7.12346E+08) — six significant digits survive; `lost` holds the number it was.",
      `Lines ${twinLines.join(" and ")} read the same shortened text but were two different numbers — why a shortened number is never repaired.`,
    ],
    lead: csvLine(header, EXCEL_COMMA),
    records,
    firstLine: 2,
  });
}

/** Google Contacts' current CSV header, as many Phone/E-mail/Address groups as the export needs (here: two phones). */
const GOOGLE_HEADER: readonly string[] = [
  "First Name", "Middle Name", "Last Name", "Phonetic First Name", "Phonetic Middle Name", "Phonetic Last Name",
  "Name Prefix", "Name Suffix", "Nickname", "File As", "Organization Name", "Organization Title",
  "Organization Department", "Birthday", "Notes", "Photo", "Labels", "E-mail 1 - Label", "E-mail 1 - Value",
  "Phone 1 - Label", "Phone 1 - Value", "Phone 2 - Label", "Phone 2 - Value", "Address 1 - Label",
  "Address 1 - Formatted", "Address 1 - Street", "Address 1 - City", "Address 1 - PO Box", "Address 1 - Region",
  "Address 1 - Postal Code", "Address 1 - Country", "Address 1 - Extended Address", "Website 1 - Label",
  "Website 1 - Value",
];
const GOOGLE_LABELS: readonly string[] = ["* myContacts", "* myContacts ::: Wateja", "* starred ::: * myContacts", "* myContacts ::: VIP Dar"];

/** 5 · contacts.google.com → Export → Google CSV. */
function makeGoogleCsv(): Built {
  const name = "google-contacts.csv";
  const rng = new Rng(name);
  const book = new NumberBook(rng);
  // The five columns the importer maps, proved to be aliases exactly as Google spells them.
  aliasHeader("first_name", "First Name");
  aliasHeader("last_name", "Last Name");
  aliasHeader("email", "E-mail 1 - Value");
  aliasHeader("phone", "Phone 1 - Value");
  aliasHeader("notes", "Notes");
  const P1 = "Phone 1 - Value";
  const P2 = "Phone 2 - Value";
  const TWO_IN_ONE = [3, 17];
  const MOBILE_IN_COLUMN_2 = 11;
  const NO_PHONE = 20;
  const REPEAT_AT = 23;
  const REPEAT_OF = 5;
  let repeated = "";
  const records: TextRecord[] = [];
  for (let i = 1; i <= 25; i++) {
    const who = someone(rng);
    const cell = new Map<string, string>([
      ["First Name", who.given],
      ["Last Name", who.family],
      ["Labels", GOOGLE_LABELS[i % GOOGLE_LABELS.length]],
    ]);
    const phones: PhoneDraft[] = [];
    const put = (label: string, column: string, p: PhoneDraft): void => {
      cell.set(column === P1 ? "Phone 1 - Label" : "Phone 2 - Label", label);
      cell.set(column, p.written);
      phones.push(at(p, column));
    };
    if (TWO_IN_ONE.includes(i)) {
      put("Mobile", P1, twoInOneCell(book.fresh(), i === 3 ? "plusSpaced" : "spaced", book.fresh(), i === 3 ? "plusSpaced" : "compact", " ::: "));
    } else if (i === MOBILE_IN_COLUMN_2) {
      put("Work", P1, landline(rng));
      put("Mobile", P2, mobile(book.fresh(), "plusSpaced"));
    } else if (i === 14) {
      put("Mobile", P1, foreign(rng, 0));
    } else if (i === REPEAT_AT) {
      put("Mobile", P1, mobile(repeated, "spaced"));
    } else if (i !== NO_PHONE) {
      const national = book.fresh();
      if (i === REPEAT_OF) repeated = national;
      put("Mobile", P1, mobile(national, i === REPEAT_OF ? "plusSpaced" : rng.pick<Spelling>(["plusSpaced", "plusSpaced", "spaced", "compact"])));
      if (i === 8) put("Work", P2, landline(rng, true));
    }
    let email = "";
    if (rng.chance(0.6) || i === NO_PHONE) {
      email = who.email;
      cell.set("E-mail 1 - Label", "* Home");
      cell.set("E-mail 1 - Value", email);
    }
    if (i % 6 === 0) cell.set("Organization Name", rng.pick(ORGS));
    if (i % 7 === 0) cell.set("Birthday", `19${70 + rng.int(30)}-0${1 + rng.int(9)}-1${rng.int(10)}`);
    if (i % 9 === 0) cell.set("Birthday", `--08-2${rng.int(10)}`);
    if (i === 8) cell.set("Notes", "Mteja wa zamani, analipa kwa M-Pesa");
    records.push({
      text: csvLine(GOOGLE_HEADER.map((h) => cell.get(h) ?? ""), EXCEL_COMMA),
      draft: { name: who.name, phones, email },
    });
  }
  return textBuilt({
    name,
    format: "csv",
    mimics: "A Google Contacts export (Google CSV): the name in parts, labels, phones in Label/Value pairs, 25 people.",
    encoding: "utf-8",
    lineEnding: "crlf",
    delimiter: "comma",
    header: GOOGLE_HEADER,
    notes: [
      "The mapped columns: First Name + Last Name (no Name column — the name is composed), E-mail 1 - Value, Phone 1 - Value, Notes.",
      "Phone 2 - Value is no alias of its own: since C3b (G4) the browser reads it through ONE added column, Phone (read from: Phone 1 - Value, Phone 2 - Value), mapped as Phone — only for a row whose Phone 1 yields no mobile (C3b-fix D3). Labels is Google's label column — recognised and not read (A1.5).",
      `Lines ${TWO_IN_ONE.map((i) => i + 1).join(" and ")}: two DISTINCT mobiles joined by " ::: " in Phone 1 - Value — holds names both; under C3b-fix D3 such a row is refused (one person, one number), never one of them imported.`,
      `Line ${MOBILE_IN_COLUMN_2 + 1}: a landline in Phone 1, the mobile only in Phone 2 (imported since C3b, G4). Line ${NO_PHONE + 1}: no phone at all.`,
      `Line ${REPEAT_AT + 1} repeats line ${REPEAT_OF + 1}'s number in another spelling.`,
    ],
    lead: csvLine(GOOGLE_HEADER, EXCEL_COMMA),
    records,
    firstLine: 2,
  });
}

/** Outlook's "Comma Separated Values" export header — all 92 columns, in Outlook's order. */
const OUTLOOK_HEADER: readonly string[] = [
  "Title", "First Name", "Middle Name", "Last Name", "Suffix", "Company", "Department", "Job Title", "Business Street",
  "Business Street 2", "Business Street 3", "Business City", "Business State", "Business Postal Code",
  "Business Country/Region", "Home Street", "Home Street 2", "Home Street 3", "Home City", "Home State",
  "Home Postal Code", "Home Country/Region", "Other Street", "Other Street 2", "Other Street 3", "Other City",
  "Other State", "Other Postal Code", "Other Country/Region", "Assistant's Phone", "Business Fax", "Business Phone",
  "Business Phone 2", "Callback", "Car Phone", "Company Main Phone", "Home Fax", "Home Phone", "Home Phone 2", "ISDN",
  "Mobile Phone", "Other Fax", "Other Phone", "Pager", "Primary Phone", "Radio Phone", "TTY/TDD Phone", "Telex",
  "Account", "Anniversary", "Assistant's Name", "Billing Information", "Birthday", "Business Address PO Box",
  "Categories", "Children", "Directory Server", "E-mail Address", "E-mail Type", "E-mail Display Name",
  "E-mail 2 Address", "E-mail 2 Type", "E-mail 2 Display Name", "E-mail 3 Address", "E-mail 3 Type",
  "E-mail 3 Display Name", "Gender", "Government ID Number", "Hobby", "Home Address PO Box", "Initials",
  "Internet Free Busy", "Keywords", "Language", "Location", "Manager's Name", "Mileage", "Notes", "Office Location",
  "Organizational ID Number", "Other Address PO Box", "Priority", "Private", "Profession", "Referred By", "Sensitivity",
  "Spouse", "User 1", "User 2", "User 3", "User 4", "Web Page",
];

/** 6 · Outlook (desktop) → Export to a File → Comma Separated Values. */
function makeOutlook(): Built {
  const name = "outlook-contacts.csv";
  const rng = new Rng(name);
  const book = new NumberBook(rng);
  aliasHeader("first_name", "First Name");
  aliasHeader("last_name", "Last Name");
  aliasHeader("phone", "Mobile Phone");
  aliasHeader("email", "E-mail Address");
  aliasHeader("tags", "Categories");
  aliasHeader("notes", "Notes");
  const CATEGORIES = ["Wateja;VIP", "Wateja", "", "Mawakala", ""];
  const REPEAT_AT = 12;
  const REPEAT_OF = 3;
  let repeated = "";
  const records: TextRecord[] = [];
  for (let i = 1; i <= 20; i++) {
    const who = someone(rng);
    const given = i === 1 ? RENEE : who.given;
    const person = `${given} ${who.family}`;
    const cell = new Map<string, string>([
      ["First Name", given],
      ["Last Name", who.family],
      ["Anniversary", "0/0/00"],
      ["Birthday", i % 5 === 0 ? `${1 + rng.int(12)}/${1 + rng.int(28)}/19${70 + rng.int(30)}` : "0/0/00"],
      ["Gender", "Unspecified"],
      ["Initials", `${given.charAt(0)}.${who.family.charAt(0)}.`],
      ["Priority", "Normal"],
      ["Private", "False"],
      ["Sensitivity", "Normal"],
    ]);
    const phones: PhoneDraft[] = [];
    const put = (column: string, p: PhoneDraft): void => {
      cell.set(column, p.written);
      phones.push(at(p, column));
    };
    const how: Spelling = rng.pick<Spelling>(["plusSpaced", "spaced", "compact"]);
    if (i === 4) put("Business Phone", mobile(book.fresh(), how));
    else if (i === 7) {
      put("Home Phone", landline(rng));
      put("Mobile Phone", mobile(book.fresh(), how));
    } else if (i === 10) put("Primary Phone", mobile(book.fresh(), how));
    else if (i === 13) put("Mobile Phone", foreign(rng, 0));
    else if (i === REPEAT_AT) put("Mobile Phone", mobile(repeated, "compact"));
    else if (i === 19) {
      put("Car Phone", mobile(book.fresh(), "spaced"));
      put("Mobile Phone", mobile(book.fresh(), how));
    } else {
      const national = book.fresh();
      if (i === REPEAT_OF) repeated = national;
      put("Mobile Phone", mobile(national, i === REPEAT_OF ? "plusSpaced" : how));
      if (i % 6 === 2) put("Business Phone", landline(rng, true));
    }
    let email = "";
    if (rng.chance(0.55)) {
      email = who.email;
      cell.set("E-mail Address", email);
      cell.set("E-mail Type", "SMTP");
      cell.set("E-mail Display Name", `${person} (${email})`);
    }
    const tags = CATEGORIES[i % CATEGORIES.length];
    cell.set("Categories", tags);
    if (i % 4 === 0) {
      cell.set("Company", rng.pick(ORGS));
      cell.set("Job Title", rng.pick(["Meneja", "Mhasibu", "Afisa Mauzo"]));
    }
    if (i % 3 === 0) {
      cell.set("Home City", rng.pick(["Dar es Salaam", "Arusha", "Mwanza", "Dodoma"]));
      cell.set("Home Country/Region", "Tanzania");
    }
    if (i === 16) cell.set("Notes", `Alikuja ofisini Jumatatu.${CRLF}Anapenda SMS za Kiswahili.`);
    records.push({
      text: csvLine(OUTLOOK_HEADER.map((h) => cell.get(h) ?? ""), OUTLOOK_STYLE),
      draft: { name: person, phones, email, tags },
    });
  }
  return textBuilt({
    name,
    format: "csv",
    mimics: "Outlook desktop's CSV export: 92 columns, every field quoted, the ANSI code page (Windows-1252), CRLF, 20 people.",
    encoding: "windows-1252",
    lineEnding: "crlf",
    delimiter: "comma",
    header: OUTLOOK_HEADER,
    notes: [
      "Only Mobile Phone is a phone alias: since C3b (G4) the browser adds ONE column, Phone (read from: Mobile Phone, …), mapped as Phone — the Mobile Phone cell when it yields a mobile, else the ONE mobile of the person's own other phone columns (C3b-fix D2, D3; two or more are refused).",
      "Line 2's first name has an e-acute (byte 0xE9) inside the first 4 KB, so the sniff chooses windows-1252.",
      "Line 5: the mobile is only in Business Phone. Line 8: a Home Phone landline beside the mobile. Line 11: only in Primary Phone. " +
        "Line 14: a Kenyan mobile. Line 20: a Car Phone mobile beside a different Mobile Phone one. Lines 3, 9, 15 and 21 add a landline written +255 2… in Business Phone.",
      `Line 17's Notes cell holds a CRLF inside its quotes: one record over two physical lines. Line ${REPEAT_AT + 1} repeats line ${REPEAT_OF + 1}'s number.`,
      "Empty dates are written 0/0/00, as Outlook writes them; Gender, Priority, Private and Sensitivity are filled on every row.",
    ],
    lead: csvLine(OUTLOOK_HEADER, OUTLOOK_STYLE),
    records,
    firstLine: 2,
  });
}

/** 7 · A bare number list (a bulk-SMS tool's export, or numbers pasted into Notepad): no header, LF. */
function makeNumbersOnly(): Built {
  const name = "numbers-only.csv";
  const rng = new Rng(name);
  const book = new NumberBook(rng);
  const BLANK_LINES = new Set([41, 42, 333, 512, 768, 999]);
  const nationals: string[] = [];
  const spellings: number[] = [];
  const records: TextRecord[] = [];
  for (let line = 1; line <= 1000; line++) {
    if (BLANK_LINES.has(line)) {
      records.push({ text: LF, draft: BLANK });
      continue;
    }
    let phone: PhoneDraft;
    if (nationals.length > 20 && rng.chance(0.05)) {
      const k = rng.int(nationals.length);
      phone = mobile(nationals[k], SPELLINGS[otherSpelling(spellings[k], rng)]);
    } else {
      const national = book.fresh();
      const s = rng.int(SPELLINGS.length);
      nationals.push(national);
      spellings.push(s);
      phone = mobile(national, SPELLINGS[s]);
    }
    records.push({ text: phone.written + LF, draft: { name: null, phones: [phone] } });
  }
  return textBuilt({
    name,
    format: "csv",
    mimics: "A bare list of numbers from a bulk-SMS tool: no header, one number per line in every spelling, LF, no BOM.",
    encoding: "utf-8",
    lineEnding: "lf",
    delimiter: null,
    header: null,
    notes: [
      "No header row: line 1 is a number. A reader keeps it as a row (C15); autoMapHeaders refuses a first row that reads as a contact (the headerless sentence).",
      `Lines ${[...BLANK_LINES].join(", ")} are blank. About 5% of the lines repeat an earlier number in another spelling.`,
    ],
    lead: "",
    records,
    firstLine: 1,
  });
}

/** 8 · Excel → Save As → "Unicode Text (*.txt)": UTF-16LE with its BOM, tab-separated, CRLF. */
function makeUnicodeText(): Built {
  const name = "excel-unicode-text.txt";
  const rng = new Rng(name);
  const book = new NumberBook(rng);
  const NAMES = new Map<number, string>([
    [3, ARABIC_NAME], [6, CHINESE_NAME], [9, `Mama Ntilie ${POT_OF_FOOD}`], [12, `${DESIRE} Kabeya`], [15, "Said Abdallah"],
  ]);
  const REPEAT_AT = 15;
  const REPEAT_OF = 3;
  const TAGS = ["Dar, VIP", "vip; dar", "wateja", ""];
  const nationals: string[] = [];
  const records: TextRecord[] = [];
  for (let i = 1; i <= 20; i++) {
    const who = someone(rng);
    const national = i === REPEAT_AT ? nationals[REPEAT_OF - 1] : book.fresh();
    nationals.push(national);
    const phone = mobile(national, i === REPEAT_AT ? "compact" : "spaced");
    const person = NAMES.get(i) ?? who.name;
    const email = NAMES.has(i) ? "" : emailCell(rng, who);
    const tags = TAGS[i % TAGS.length];
    const note = i === 7 ? 'Anasema "asante" kila siku' : rng.pick(NOTES);
    records.push({ text: csvLine([phone.written, person, email, tags, note], EXCEL_TAB), draft: { name: person, phones: [phone], email, tags } });
  }
  return textBuilt({
    name,
    format: "csv",
    mimics: `Excel's "Unicode Text (*.txt)" save: UTF-16LE with a BOM, tab-separated, CRLF, 20 people in four scripts.`,
    encoding: "utf-16le-bom",
    lineEnding: "crlf",
    delimiter: "tab",
    header: LABEL_HEADER,
    notes: [
      "detectFormat reads a .txt as CSV; the FF FE mark makes the sniff choose utf-16le, and the vote chooses the tab.",
      "Line 8's note holds quotation marks, so that cell is quoted with the marks doubled; commas and semicolons are plain data here.",
      `Line ${REPEAT_AT + 1} repeats line ${REPEAT_OF + 1}'s number — the same person, written in Latin letters.`,
    ],
    lead: csvLine(LABEL_HEADER, EXCEL_TAB),
    records,
    firstLine: 2,
  });
}

/** 9 · The chaos file a real office sends. Every row is one thing a reader or the rules must survive. */
function makeMessy(): Built {
  const name = "messy-real-life.csv";
  const rng = new Rng(name);
  const book = new NumberBook(rng);
  const header = [
    aliasHeader("phone", "Namba", "weak"),
    aliasHeader("name", "Jina kamili"),
    aliasHeader("phone", "Simu ya Mkononi"),
    aliasHeader("email", "Barua pepe"),
    aliasHeader("tags", "Makundi"),
    aliasHeader("notes", "Maelezo"),
    unknownHeader("Mkoa"),
    unknownHeader("Kiasi (TSh)"),
    "",
    "",
  ];
  if (LONG_NAME.length <= CONTACT_LIMITS.displayName) throw new Error("real-world-files: the long name no longer passes the name limit");
  if (FORTY_TAGS.length <= CONTACT_LIMITS.tags) throw new Error("real-world-files: forty tags no longer pass the tag limit");
  const records: TextRecord[] = [];
  const lineOfNext = (): number => records.length + 2;
  const at2: Record<string, number> = {};
  let serial = 0;
  type Row = { person: string; phone: PhoneDraft | null; email?: string; tags?: string; notes?: string; region?: string; amount?: string };
  const put = (label: string, r: Row): void => {
    at2[label] = lineOfNext();
    serial += 1;
    const email = r.email ?? "";
    const tags = r.tags ?? "";
    const cells = [String(serial), r.person, r.phone === null ? "" : r.phone.written, email, tags, r.notes ?? "", r.region ?? "", r.amount ?? "", "", ""];
    records.push({ text: csvLine(cells, EXCEL_COMMA), draft: { name: r.person, phones: r.phone === null ? [] : [r.phone], email, tags } });
  };
  const blankRow = (label: string, cells: readonly string[]): void => {
    at2[label] = lineOfNext();
    records.push({ text: csvLine(cells, EXCEL_COMMA), draft: BLANK });
  };

  const amina = book.fresh();
  put("first", { person: "Amina Juma", phone: mobile(amina, "spaced"), email: "amina.juma@example.com", tags: "vip", region: "Dar es Salaam", amount: "50,000" });
  put("plus", { person: "Baraka Mwakyusa", phone: mobile(book.fresh(), "plusSpaced"), tags: "wateja, dar", region: "Dar es Salaam", amount: "TSh 20,000" });
  blankRow("blank", ["", "", "", "", "", "", "", "", "", ""]);
  blankRow("spaces", ["   ", " ", "  ", "", "", "", "", "", "", ""]);
  put("kenya", { person: "Wanjiru Kamau", phone: foreign(rng, 0), region: "Arusha" });
  put("uganda", { person: "Okello Opio", phone: foreign(rng, 1), region: "Mwanza" });
  put("usa", { person: "Mike Johnson", phone: foreign(rng, 2) });
  put("landline", { person: "Ofisi ya Kariakoo", phone: landline(rng), region: "Dar es Salaam" });
  put("tollfree", { person: "Huduma kwa Wateja", phone: tollFree(rng) });
  put("short", { person: "Saidi Hamisi", phone: tooShort(book.fresh()) });
  put("long", { person: "Halima Said", phone: tooLong(rng, book.fresh()) });
  put("letters", { person: "Faraji Mushi", phone: withLetter(rng, book.fresh()) });
  put("withdrawn", { person: "Rehema Kileo", phone: unallocated(rng, "withdrawn") });
  put("unplanned", { person: "Mzee Kassim", phone: unallocated(rng, "unplanned") });
  put("two", { person: "Upendo Swai", phone: twoInOneCell(book.fresh(), "spaced", book.fresh(), "spaced", " / ") });
  put("hyperlink", { person: `=HYPERLINK("http://example.com/wateja","Bonyeza hapa")`, phone: mobile(book.fresh(), "spaced") });
  put("sum", { person: "+SUM(1)", phone: mobile(book.fresh(), "compact") });
  put("at", { person: "@cmd", phone: mobile(book.fresh(), "spaced") });
  put("minus", { person: "-2+3", phone: mobile(book.fresh(), "dashed") });
  put("longName", { person: LONG_NAME, phone: mobile(book.fresh(), "spaced") });
  put("lineBreak", { person: "Mwanaisha Juma", phone: mobile(book.fresh(), "spaced"), notes: `Anapenda ujumbe wa Kiswahili.${LF}Anaishi Mbezi.` });
  put("badEmail", { person: "Baraka Temba", phone: mobile(book.fresh(), "spaced"), email: "baraka.temba@gmail" });
  put("fortyTags", { person: "Zawadi Massawe", phone: mobile(book.fresh(), "spaced"), tags: FORTY_TAGS.join(", ") });
  put("none", { person: "Neema Kimaro", phone: noNumber("hakuna") });
  put("repeat", { person: "Amina J.", phone: mobile(amina, "plusSpaced") });
  const guardedNational = book.fresh();
  put("guard", { person: "Joseph Lyimo", phone: { ...mobile(guardedNational, "plusSpaced"), written: `'${spell(guardedNational, "plusSpaced")}` } });
  put("empty", { person: "Bahati Mollel", phone: null });

  // LAST: a quotation mark that opens the Maelezo cell and never closes — everything to the end of the file is inside it.
  // ⭐ C8c · D5a · the physical lines after the record's first line, as written — what `swallowedLines` counts.
  const mama = mobile(book.fresh(), "spaced");
  const swallowed = ["Mkoa: Dar es Salaam"];
  serial += 1;
  at2.broken = lineOfNext();
  records.push({
    text: `${[String(serial), "Mama Ntilie", mama.written, "", ""].join(",")},${QUOTE}Analipa kila Ijumaa, anakopa vitu dukani${CRLF}${swallowed.map((l) => l + CRLF).join("")}`,
    draft: { name: "Mama Ntilie", phones: [mama], email: "", tags: "", broken: true, swallowedLines: swallowed.length },
  });

  return textBuilt({
    name,
    format: "csv",
    mimics: "The list an office really sends: Swahili headers, a serial column, stray columns, and every mistake a hand-kept sheet collects.",
    encoding: "utf-8",
    lineEnding: "crlf",
    delimiter: "comma",
    header,
    notes: [
      `Line ${at2.broken} opens a quotation mark that never closes: since C3b (G1) the CSV reader keeps every record above it and lists line ${at2.broken} ` +
        "— with everything it swallowed — as ONE unreadable record. The bytes before brokenAtByte are a complete file. " +
        `The quote swallows ${swallowed.length} physical line after the record's first (swallowedLines — C3b-fix D5: "it and the line after it").`,
      "Namba (column 1) is the row serial — a WEAK phone alias; Simu ya Mkononi (column 3) is a STRONG one and must win. " +
        "Mkoa and Kiasi (TSh) are not contact fields; the last two columns have no header.",
      `Line ${at2.blank} is empty and line ${at2.spaces} holds only spaces: both blank.`,
      `Refused numbers: foreign lines ${at2.kenya}, ${at2.uganda}, ${at2.usa}; landline ${at2.landline}; toll-free ${at2.tollfree}; too short ${at2.short}; ` +
        `too long ${at2.long}; a letter for a digit ${at2.letters}; unallocated ${at2.withdrawn} (${WITHDRAWN_NDCS.length > 0 ? `the withdrawn 0${WITHDRAWN_NDCS[0]}` : "011"}) and ${at2.unplanned} (011); no digits ${at2.none}.`,
      `Line ${at2.two} holds two DISTINCT mobiles in one cell (under C3b-fix D3 the row is refused, neither imported). Lines ${at2.hyperlink}–${at2.minus} have formula names (= + @ -). Line ${at2.longName}'s name is ${LONG_NAME.length} characters.`,
      `Line ${at2.lineBreak}'s Maelezo cell holds a line break inside quotes: one record, two physical lines. Line ${at2.badEmail}: an email with no dot in its domain. ` +
        `Line ${at2.fortyTags}: ${FORTY_TAGS.length} tags in one cell.`,
      `Line ${at2.repeat} repeats line ${at2.first}'s number; line ${at2.guard}'s number carries the export's leading apostrophe ('+255…); line ${at2.empty} has no number.`,
    ],
    lead: csvLine(header, EXCEL_COMMA),
    records,
    firstLine: 2,
  });
}

/* ── 10 · the files that are not what they seem ─────────────────────────────────────────────────────────────────── */

function unsupportedBuilt(name: string, mimics: string, data: Buffer, encoding: FileEncoding, refusal: FormatRefusalKind, notes: readonly string[]): Built {
  return {
    name,
    format: "unsupported",
    mimics,
    data,
    encoding,
    lineEnding: "none",
    delimiter: null,
    header: null,
    sheet: null,
    refusal,
    brokenAtByte: null,
    notes,
    people: [],
  };
}

function makeEmpty(): Built {
  return unsupportedBuilt("empty.csv", "A CSV saved with nothing in it — the wrong file chosen.", Buffer.alloc(0), "none", "empty", [
    "Zero bytes: detectFormat refuses it as empty before any reader runs.",
  ]);
}

function makeHeaderOnly(): Built {
  return textBuilt({
    name: "header-only.csv",
    format: "csv",
    mimics: "The sample sheet saved before anyone typed a contact: the header row and nothing else.",
    encoding: "utf-8-bom",
    lineEnding: "crlf",
    delimiter: "comma",
    header: LABEL_HEADER,
    notes: ["One row — the header — and no record under it."],
    lead: csvLine(LABEL_HEADER, EXCEL_COMMA),
    records: [],
    firstLine: 2,
  });
}

function makeNotReallyCsv(): Built {
  const rng = new Rng("not-really-csv.csv");
  const data = Buffer.from([...PNG_SIGNATURE, ...PNG_IHDR, ...rng.bytes(4), ...rng.bytes(2000)]);
  return unsupportedBuilt("not-really-csv.csv", "A phone screenshot renamed .csv: PNG bytes under a CSV name.", data, "binary", "binary", [
    "Not a zip, not CFB, not a PDF: strict UTF-8 fails, it decodes as windows-1252, and the IHDR length bytes put NULs in it — binary.",
  ]);
}

function makeRenamedCsv(): Built {
  const name = "renamed-csv.xlsx";
  const rng = new Rng(name);
  const book = new NumberBook(rng);
  const records: TextRecord[] = [];
  for (let i = 1; i <= 6; i++) {
    const who = someone(rng);
    const phone = mobile(book.fresh(), i % 2 === 0 ? "plusSpaced" : "spaced");
    const email = emailCell(rng, who);
    records.push({ text: csvLine([phone.written, who.name, email, "wateja", ""], EXCEL_COMMA), draft: { name: who.name, phones: [phone], email, tags: "wateja" } });
  }
  return textBuilt({
    name,
    format: "csv",
    mimics: "A CSV whose name someone changed to .xlsx so the upload box would take it.",
    encoding: "utf-8-bom",
    lineEnding: "crlf",
    delimiter: "comma",
    header: LABEL_HEADER,
    notes: ["Named .xlsx, but its bytes are CSV text: detectFormat reads the content (csv) and reports the mismatch with the name."],
    lead: csvLine(LABEL_HEADER, EXCEL_COMMA),
    records,
    firstLine: 2,
  });
}

/* ══ XLSX FAMILY — real workbooks, written by exceljs ═════════════════════════════════════════════════════════════ */

function xlsxBuilt(name: string, mimics: string, data: Buffer, header: readonly string[], sheet: string, notes: readonly string[], people: readonly PersonTruth[]): Built {
  return {
    name,
    format: "xlsx",
    mimics,
    data,
    encoding: "binary",
    lineEnding: "none",
    delimiter: null,
    header,
    sheet,
    refusal: null,
    brokenAtByte: null,
    notes,
    people,
  };
}

/** 11 · A workbook typed by hand, the phone column formatted as Text first — the careful office. */
async function makeExcelBasic(): Promise<Built> {
  const name = "excel-basic.xlsx";
  const rng = new Rng(name);
  const book = new NumberBook(rng);
  const wb = newWorkbook();
  const ws = wb.addWorksheet("Sheet1");
  ws.addRow([...LABEL_HEADER]);
  [16, 24, 30, 18, 36].forEach((width, i) => {
    ws.getColumn(i + 1).width = width;
  });
  const NAMES = new Map<number, string>([[8, `${DESIRE} Kabeya`], [14, ARABIC_NAME], [22, CHINESE_NAME]]);
  const REPEATS = new Map<number, number>([[17, 5], [33, 12]]);
  const LANDLINE_AT = 20;
  const SHORT_AT = 31;
  const HOW: readonly Spelling[] = ["spaced", "plusSpaced", "compact", "dashed", "plus"];
  const TAGS = ["wateja", "vip", "", "dar, vip", "mawakala"];
  const nationals: string[] = [];
  const drafts: RecordDraft[] = [];
  for (let i = 1; i <= 40; i++) {
    const who = someone(rng);
    const repeatOf = REPEATS.get(i);
    let phone: PhoneDraft;
    if (repeatOf !== undefined) {
      nationals.push(nationals[repeatOf - 1]);
      phone = mobile(nationals[repeatOf - 1], "plusSpaced");
    } else {
      const national = book.fresh();
      nationals.push(national);
      phone = i === LANDLINE_AT ? landline(rng) : i === SHORT_AT ? tooShort(national) : mobile(national, HOW[i % HOW.length] === "plusSpaced" ? "spaced" : HOW[i % HOW.length]);
    }
    const person = NAMES.get(i) ?? who.name;
    const email = NAMES.has(i) ? "" : emailCell(rng, who);
    const tags = TAGS[i % TAGS.length];
    const row = ws.addRow([phone.written, person, email, tags, rng.pick(NOTES)]);
    row.getCell(1).numFmt = "@";
    drafts.push({ name: person, phones: [{ ...phone, cell: "text" }], email, tags });
  }
  return xlsxBuilt(
    name,
    "A workbook typed by hand with the phone column formatted as Text: every spelling survives as written, 40 people.",
    await workbookBytes(wb),
    LABEL_HEADER,
    "Sheet1",
    [
      "Phones are TEXT cells (number format @), so every spelling survives exactly as typed.",
      `Lines ${[...REPEATS.keys()].map((i) => i + 1).join(" and ")} repeat an earlier number written +255 …; ` +
        `line ${LANDLINE_AT + 1} is a landline and line ${SHORT_AT + 1} is too short.`,
    ],
    settlePeople(drafts, 2),
  );
}

/** 12 · A phone column Excel was allowed to treat as numbers — every way a number cell can hold a phone. */
async function makeExcelNumberCells(): Promise<Built> {
  const name = "excel-number-cells.xlsx";
  const rng = new Rng(name);
  const book = new NumberBook(rng);
  const wb = newWorkbook();
  const ws = wb.addWorksheet("Wateja");
  const header = [aliasHeader("phone", "Phone"), aliasHeader("name", "Name"), "", aliasHeader("tags", "Tags"), aliasHeader("notes", "Notes"), unknownHeader("Ref")];
  ws.mergeCells("B1:C1");
  ws.getCell("A1").value = header[0];
  ws.getCell("B1").value = header[1];
  ws.getCell("D1").value = header[3];
  ws.getCell("E1").value = header[4];
  ws.getCell("F1").value = header[5];
  ws.getColumn(1).width = 18;
  ws.getColumn(6).hidden = true;
  const drafts: RecordDraft[] = [];
  const explained: string[] = [];
  let line = 2;
  const put = (phone: PhoneDraft, write: (cell: ExcelJS.Cell) => void, says: string, notesCell?: (cell: ExcelJS.Cell) => void): void => {
    const who = someone(rng);
    write(ws.getCell(line, 1));
    ws.getCell(line, 2).value = who.given;
    ws.getCell(line, 3).value = who.family;
    const tags = rng.pick(["wateja", "vip", "", "dar"]);
    ws.getCell(line, 4).value = tags;
    if (notesCell !== undefined) notesCell(ws.getCell(line, 5));
    ws.getCell(line, 6).value = `MT-${String(line - 1).padStart(4, "0")}`;
    drafts.push({ name: who.name, phones: [phone], tags });
    explained.push(`line ${line} ${says}`);
    line += 1;
  };
  const n1 = book.fresh();
  put({ ...mobile(n1, "lostZero"), cell: "number" }, (c) => { c.value = Number(n1); }, "a NUMBER 7…: typed 07… into a General cell, the zero gone");
  const n2 = book.fresh();
  put({ ...mobile(n2, "bare255"), cell: "number" }, (c) => { c.value = Number(keyOf(n2)); }, "a NUMBER 255… in General format (Excel shows 2.55…E+11; the stored value is exact)",
    (c) => { c.value = new Date(Date.UTC(2026, 8, 12)); c.numFmt = "dd/mm/yyyy"; });
  const n3 = book.fresh();
  put({ ...mobile(n3, "bare255"), cell: "number" }, (c) => { c.value = Number(keyOf(n3)); c.numFmt = "0"; }, "a NUMBER 255… with the 0 format");
  const n4 = book.fresh();
  put({ ...mobile(n4, "bare255"), cell: "number" }, (c) => { c.value = Number(keyOf(n4)); c.numFmt = "0.00E+00"; }, "a NUMBER 255… shown in scientific format (2.56E+11), stored exact");
  const n5 = book.fresh();
  put({ ...mobile(n5, "compact"), cell: "formula" }, (c) => { c.value = { formula: `"0"&"${n5}"`, result: `0${n5}` }; }, `a formula ="0"&"…" whose cached result is the text 0…`);
  const n6 = book.fresh();
  const resaved = excelGeneral(keyOf(n6)).stored;
  put({ written: String(resaved), key: null, kind: "excel_scientific", lost: keyOf(n6), cell: "number" }, (c) => { c.value = resaved; },
    "the NUMBER a re-saved 2.55…E+11 becomes (…000000): its digits are gone (A1.3 — the reader writes it back as scientific text)");
  const n7 = book.fresh();
  put({ ...mobile(n7, "spaced"), cell: "text" }, (c) => { c.value = spell(n7, "spaced"); c.numFmt = "@"; }, "TEXT, for contrast");
  const n8 = book.fresh();
  put({ ...mobile(n8, "lostZero"), cell: "number" }, (c) => { c.value = Number(n8); c.numFmt = "0000000000"; }, "a NUMBER 7… whose 0000000000 format SHOWS the zero it lost");
  const n9 = book.fresh();
  put({ ...mobile(n9, "bare255"), cell: "number" }, (c) => { c.value = Number(keyOf(n9)); c.numFmt = "#,##0"; }, "a NUMBER 255… in the #,##0 format (shown 255,7…)");
  return xlsxBuilt(
    name,
    "A phone column Excel was allowed to read as numbers: number formats, a formula, a re-saved shortened number, a merged header, a hidden column.",
    await workbookBytes(wb),
    header,
    "Wateja",
    [
      "The Name header is merged across B1:C1: given names are in column B, family names in column C, whose header cell is covered by the merge (a reader sees it blank).",
      "Column F (Ref) is hidden and holds no contact field. Line 3's Notes cell is a DATE (2026-09-12).",
      ...explained,
    ],
    settlePeople(drafts, 2),
  );
}

/** 13 · A workbook with a cover sheet: the contacts are on the SECOND sheet, and a third is hidden. */
async function makeExcelMultiSheet(): Promise<Built> {
  const name = "excel-multi-sheet.xlsx";
  const rng = new Rng(name);
  const book = new NumberBook(rng);
  const wb = newWorkbook();
  const cover = wb.addWorksheet("Maelezo");
  cover.getCell("A1").value = `Orodha ya wateja ${EM_DASH} Oktoba 2026`;
  cover.getCell("A3").value = "Imeandaliwa na: Ofisi ya Masoko, Dar es Salaam";
  cover.getCell("A4").value = "Tafadhali usibadilishe karatasi ya Wateja.";
  const ws = wb.addWorksheet("Wateja");
  const header = [aliasHeader("phone", "Simu"), aliasHeader("name", "Jina"), aliasHeader("tags", "Makundi")];
  ws.addRow(header);
  const REPEAT_AT = 15;
  const REPEAT_OF = 6;
  const nationals: string[] = [];
  const drafts: RecordDraft[] = [];
  for (let i = 1; i <= 20; i++) {
    const who = someone(rng);
    const national = i === REPEAT_AT ? nationals[REPEAT_OF - 1] : book.fresh();
    nationals.push(national);
    const phone: PhoneDraft = { ...mobile(national, i === REPEAT_AT ? "plusSpaced" : "spaced"), cell: "text" };
    const tags = rng.pick(["wateja", "vip", "", "mawakala"]);
    ws.addRow([phone.written, who.name, tags]);
    drafts.push({ name: who.name, phones: [phone], tags });
  }
  const hidden = wb.addWorksheet("Hesabu", { state: "hidden" });
  hidden.addRow(["Mwezi", "Mauzo (TSh)"]);
  for (const month of ["Julai", "Agosti", "Septemba"]) hidden.addRow([month, 1_000_000 + rng.int(9_000_000)]);
  return xlsxBuilt(
    name,
    "A workbook with a cover sheet first, the contacts on the second sheet and a hidden third sheet of sales figures.",
    await workbookBytes(wb),
    header,
    "Wateja",
    [
      "people describes the SECOND sheet, Wateja. Since C3b-fix (D6) the reader reads the VISIBLE sheet whose first rows hold the most mobiles — " +
        "Wateja, not the cover page Maelezo — and says so in a note naming it (sheet 2 of 2: the hidden Hesabu is never counted).",
      `Hesabu is hidden. Line ${REPEAT_AT + 1} of Wateja repeats line ${REPEAT_OF + 1}'s number.`,
    ],
    settlePeople(drafts, 2),
  );
}

/** 14 · An Excel 97–2003 workbook — only its signature is real; the rest is filler. */
function makeLegacyXls(): Built {
  const rng = new Rng("legacy-97.xls");
  const data = Buffer.from([...OLE2_MAGIC, ...rng.bytes(8192 - OLE2_MAGIC.length)]);
  // A password-protected .xlsx is ALSO a CFB file, told apart by an EncryptionInfo stream: none may appear by chance.
  if (data.includes(Buffer.from("EncryptionInfo", "utf16le"))) throw new Error("real-world-files: the .xls filler spells EncryptionInfo");
  return unsupportedBuilt("legacy-97.xls", "An Excel 97–2003 workbook from an old office PC.", data, "binary", "xls", [
    "The OLE2 signature D0 CF 11 E0 A1 B1 1A E1 and 8,184 bytes of filler, no EncryptionInfo stream: refused as xls, with the save-as-.xlsx-or-CSV sentence.",
  ]);
}

/** 15 · A LibreOffice Calc spreadsheet: a real OpenDocument zip, STORE only. */
function makeOds(): Built {
  const rows: readonly string[][] = [["Simu", "Jina"], ["0754 000 000", "Mfano Mmoja"], ["0655 000 000", "Mfano Wawili"]];
  const xml = (s: string): string => s.split("&").join("&amp;").split(LT).join("&lt;").split(">").join("&gt;");
  const cellXml = (c: string): string => `${LT}table:table-cell office:value-type="string">${LT}text:p>${xml(c)}${LT}/text:p>${LT}/table:table-cell>`;
  const content = [
    `${LT}?xml version="1.0" encoding="UTF-8"?>`,
    `${LT}office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" ` +
      `xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" office:version="1.3">`,
    `${LT}office:body>${LT}office:spreadsheet>${LT}table:table table:name="Wateja">`,
    ...rows.map((r) => `${LT}table:table-row>${r.map(cellXml).join("")}${LT}/table:table-row>`),
    `${LT}/table:table>${LT}/office:spreadsheet>${LT}/office:body>${LT}/office:document-content>`,
  ].join(LF);
  const manifest = [
    `${LT}?xml version="1.0" encoding="UTF-8"?>`,
    `${LT}manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3">`,
    ` ${LT}manifest:file-entry manifest:full-path="/" manifest:version="1.3" manifest:media-type="${ODS_MIMETYPE}"/>`,
    ` ${LT}manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>`,
    `${LT}/manifest:manifest>`,
  ].join(LF);
  const data = storeZip([
    { name: "mimetype", data: Buffer.from(ODS_MIMETYPE, "utf8") },
    { name: "content.xml", data: Buffer.from(content, "utf8") },
    { name: "META-INF/manifest.xml", data: Buffer.from(manifest, "utf8") },
  ]);
  return unsupportedBuilt("libreoffice.ods", "A LibreOffice Calc spreadsheet saved in its own format.", data, "binary", "ods", [
    "A STORE-only zip whose first entry is mimetype = application/vnd.oasis.opendocument.spreadsheet, no extra field: headIsOdsZip reads it from the head; refused as ods.",
    "Its two example numbers end in 000 000 and appear in no other file; nothing in it is read.",
  ]);
}

/* ══ vCARD FAMILY ═════════════════════════════════════════════════════════════════════════════════════════════════ */

function vcardBuilt(name: string, mimics: string, lineEnding: LineEnding, notes: readonly string[], cards: readonly TextRecord[]): Built {
  return textBuilt({ name, format: "vcard", mimics, encoding: "utf-8", lineEnding, delimiter: null, header: null, notes, lead: "", records: cards, firstLine: 1 });
}

/** The lines every card shares, and a TEL writer that records each value with its property head. */
function cardStart(version: "2.1" | "3.0" | "4.0"): { readonly lines: string[]; readonly phones: PhoneDraft[]; readonly tel: (head: string, p: PhoneDraft) => void } {
  const lines = ["BEGIN:VCARD", `VERSION:${version}`];
  const phones: PhoneDraft[] = [];
  const tel = (head: string, p: PhoneDraft): void => {
    lines.push(`${head}:${p.written}`);
    phones.push(at(p, head));
  };
  return { lines, phones, tel };
}

/** 16 · iPhone → Contacts → share / export, 60 cards: what iOS 17 writes. */
function makeIphone(): Built {
  const name = "iphone-export.vcf";
  const rng = new Rng(name);
  const book = new NumberBook(rng);
  const HOW: readonly Spelling[] = ["plusSpaced", "spaced", "compact", "plusSpaced", "plus"];
  const PREF_CELL = "TEL;type=CELL;type=VOICE;type=pref";
  const ONLY_LANDLINE = 14;
  const ONLY_FOREIGN = 21;
  const NO_TEL = 28;
  const TWIN_FIRST = 33;
  const TWIN_AGAIN = 47;
  const LANDLINE_PREFERRED = 40;
  const DISPUTED_AT = 52;
  let twin: { readonly who: Who; readonly national: string } | null = null;
  const cards: TextRecord[] = [];
  for (let i = 1; i <= 60; i++) {
    const drawn = someone(rng);
    const who = i === TWIN_AGAIN && twin !== null ? twin.who : drawn;
    let given = who.given;
    let family = who.family;
    let fn = who.name;
    if (i === 11) [given, family, fn] = ["Mama", "Ntilie", `Mama Ntilie ${POT_OF_FOOD}`];
    if (i === 44) [given, family, fn] = [DESIRE, "Kabeya", `${DESIRE} Kabeya`];
    const card = cardStart("3.0");
    card.lines.push("PRODID:-//Apple Inc.//iPhone OS 17.5//EN", `N:${vEscape(family)};${vEscape(given)};;;`, `FN:${vEscape(fn)}`);
    if (i === 17) card.lines.push(`ORG:${vEscape("Duka la Asha, Kariakoo")};`);
    let email: string | null = null;
    if (rng.chance(0.45)) {
      email = who.email;
      card.lines.push(`EMAIL;type=INTERNET;type=HOME;type=pref:${email}`);
    }
    const how = HOW[i % HOW.length];
    if (i === ONLY_LANDLINE) card.tel("TEL;type=WORK;type=VOICE;type=pref", landline(rng));
    else if (i === ONLY_FOREIGN) card.tel(PREF_CELL, foreign(rng, 1));
    else if (i === LANDLINE_PREFERRED) {
      card.tel("TEL;type=WORK;type=VOICE;type=pref", landline(rng));
      card.tel("TEL;type=CELL;type=VOICE", mobile(book.fresh(), how));
    } else if (i === TWIN_AGAIN && twin !== null) card.tel(PREF_CELL, mobile(twin.national, "compact"));
    else if (i !== NO_TEL) {
      const national = i === DISPUTED_AT && DISPUTED_NDCS.length > 0 ? book.fresh(DISPUTED_NDCS) : book.fresh();
      if (i === TWIN_FIRST) twin = { who, national };
      card.tel(PREF_CELL, mobile(national, i === TWIN_FIRST ? "plusSpaced" : how));
      if (i === 5) {
        card.tel("item1.TEL", mobile(book.fresh(), "spaced"));
        card.lines.push("item1.X-ABLabel:Biashara");
      }
      if (i === 9) card.tel("TEL;type=IPHONE;type=CELL;type=VOICE", mobile(book.fresh(), "compact"));
      if (i % 7 === 3) card.tel("TEL;type=HOME;type=VOICE", landline(rng));
      if (i === 12) {
        // iOS spells its built-in labels inside _$!< >!$_ — an item group whose label is not a custom word.
        card.tel("item1.TEL", mobile(book.fresh(), "plusSpaced"));
        card.lines.push(`item1.X-ABLabel:_$!${LT}Other>!$_`);
      }
    }
    if (i === 56) card.lines.push(`NOTE:${vEscape(LONG_NOTE)}`);
    if (i % 4 === 0) card.lines.push(`PHOTO;ENCODING=b;TYPE=JPEG:${jpegLike(rng, 2998).toString("base64")}`);
    card.lines.push("END:VCARD");
    cards.push({ text: cardText(card.lines, CRLF, true), draft: { name: fn, phones: card.phones, ...(email === null ? {} : { email }) } });
  }
  return vcardBuilt(name, "An iPhone's contacts exported as one .vcf (vCard 3.0, iOS 17), 60 cards.", "crlf", [
    "Every fourth card ends with a PHOTO folded at 75 octets whose base64 ends in == — the line before END:VCARD.",
    "Cards 5, 9 and 12 hold two mobiles (an item1.TEL labelled Biashara; an IPHONE-typed TEL; an item1.TEL labelled _$!" + LT + "Other>!$_). " +
      `Every seventh card from card 3 adds a HOME landline. Card ${ONLY_LANDLINE}: only a landline. ` +
      `Card ${ONLY_FOREIGN}: only a Kenyan number. Card ${NO_TEL}: no TEL at all (unreadable: no phone).`,
    `Card ${LANDLINE_PREFERRED}: a PREFERRED work landline before a mobile — the importer must choose the mobile. ` +
      `Card ${TWIN_AGAIN} is card ${TWIN_FIRST}'s person again, the number in another spelling.`,
    `Card 11's name has an emoji, card 44 accents, card 17 an ORG with an escaped comma, card 56 a long NOTE folded mid-line` +
      (DISPUTED_NDCS.length > 0 ? `; card ${DISPUTED_AT} is in the disputed 0${DISPUTED_NDCS[0]} range.` : "."),
  ], cards);
}

/** 17 · Android → Contacts → Export to .vcf: vCard 2.1, quoted-printable names, CRLF. */
function makeAndroid(): Built {
  const name = "android-export.vcf";
  const rng = new Rng(name);
  const book = new NumberBook(rng);
  const HOW: readonly Spelling[] = ["spaced", "compact", "plus", "dashed", "compact"];
  const NAMES = new Map<number, readonly [string, string, string]>([
    [7, [`Neema ${SPARKLES}`, "Kimaro", `Neema ${SPARKLES} Kimaro`]],
    [18, [`Selemani ${SPARKLES}`, "Mwakalinga", `Selemani ${SPARKLES} Mwakalinga`]],
    [26, [`Mwajuma Mwanahawa Ali ${SPARKLES}`, "Kimaro", `Mwajuma Mwanahawa Ali ${SPARKLES} Kimaro`]],
    [35, [DESIRE, "Kabeya", `${DESIRE} Kabeya`]],
    [44, [ARABIC_GIVEN, ARABIC_FAMILY, ARABIC_NAME]],
    [50, [CHINESE_GIVEN, CHINESE_FAMILY, CHINESE_NAME]],
  ]);
  const NO_TEL = 22;
  const TWIN_FIRST = 30;
  const TWIN_AGAIN = 41;
  let twin: { readonly who: Who; readonly national: string } | null = null;
  const cards: TextRecord[] = [];
  for (let i = 1; i <= 60; i++) {
    const drawn = someone(rng);
    const who = i === TWIN_AGAIN && twin !== null ? twin.who : drawn;
    const special = NAMES.get(i);
    const [given, family, fn] = special ?? [who.given, who.family, who.name];
    const card = cardStart("2.1");
    card.lines.push(...androidNameLines(given, family, fn));
    const how = HOW[i % HOW.length];
    if (i === 4) {
      card.tel("TEL;CELL;PREF", mobile(book.fresh(), "plus"));
      card.tel("TEL;CELL", mobile(book.fresh(), how));
    } else if (i === 10) {
      card.tel("TEL;WORK", landline(rng));
      card.tel("TEL;CELL", mobile(book.fresh(), how));
    } else if (i === 15) card.tel("TEL;CELL", foreign(rng, 1));
    else if (i === TWIN_AGAIN && twin !== null) card.tel("TEL;CELL", mobile(twin.national, "dashed"));
    else if (i !== NO_TEL) {
      const national = book.fresh();
      if (i === TWIN_FIRST) twin = { who, national };
      card.tel(i % 9 === 0 ? "TEL;CELL;PREF" : "TEL;CELL", mobile(national, i === TWIN_FIRST ? "spaced" : how));
      if (i % 8 === 0) card.tel("TEL;HOME", landline(rng));
    }
    let email: string | null = null;
    if (special === undefined && rng.chance(0.4)) {
      email = who.email;
      card.lines.push(`EMAIL;HOME:${email}`);
    }
    if (i % 5 === 0) card.lines.push(`X-ANDROID-CUSTOM:vnd.android.cursor.item/nickname;${rng.pick(NICKNAMES)};1;;;;;;;;;;;;;`);
    card.lines.push("END:VCARD");
    cards.push({ text: cardText(card.lines, CRLF, false), draft: { name: fn, phones: card.phones, ...(email === null ? {} : { email }) } });
  }
  return vcardBuilt(name, "An Android phone's contacts exported as one .vcf (vCard 2.1, AOSP's writer), 60 cards.", "crlf", [
    "A name with any non-ASCII character is written N;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE and FN the same: every byte as =XX, " +
      "a soft line break (= at the line's end) after every 23 bytes — AOSP's own rule.",
    "Card 26: the sparkles' three bytes (=E2=9C=A8) are split across a soft break in N and in FN. Cards 18 and 44: FN is exactly 23 bytes, " +
      "so its value ends in a soft break and a BLANK line follows it, as on a real phone.",
    `Card 4: two mobiles (one PREF). Card 10: a work landline before the mobile. Card 15: only a Ugandan number. Card ${NO_TEL}: no TEL. ` +
      `Card ${TWIN_AGAIN} repeats card ${TWIN_FIRST}'s person and number. X-ANDROID-CUSTOM lines on every fifth card.`,
  ], cards);
}

/** 18 · contacts.google.com → Export → vCard. */
function makeGoogleVcf(): Built {
  const name = "google-export.vcf";
  const rng = new Rng(name);
  const book = new NumberBook(rng);
  const CATEGORIES = ["myContacts", "myContacts,Wateja", "starred,myContacts"];
  const TWIN_FIRST = 4;
  const TWIN_AGAIN = 18;
  let twin: { readonly who: Who; readonly national: string } | null = null;
  const cards: TextRecord[] = [];
  for (let i = 1; i <= 25; i++) {
    const drawn = someone(rng);
    const who = i === TWIN_AGAIN && twin !== null ? twin.who : drawn;
    const card = cardStart("3.0");
    card.lines.push(`FN:${vEscape(who.name)}`, `N:${vEscape(who.family)};${vEscape(who.given)};;;`);
    let email: string | null = null;
    if (rng.chance(0.6)) {
      email = who.email;
      card.lines.push(`EMAIL;TYPE=INTERNET;TYPE=HOME:${email}`);
    }
    if (i === 3) {
      card.tel("TEL;TYPE=CELL", mobile(book.fresh(), "plusSpaced"));
      card.tel("TEL;TYPE=CELL", mobile(book.fresh(), "spaced"));
    } else if (i === 6) {
      card.tel("TEL;TYPE=WORK", landline(rng, true));
      card.tel("TEL;TYPE=CELL", mobile(book.fresh(), "plusSpaced"));
    } else if (i === 9) {
      card.tel("item1.TEL", mobile(book.fresh(), "compact"));
      card.lines.push("item1.X-ABLabel:Biashara");
    } else if (i === 15) card.tel("TEL", foreign(rng, 4));
    else if (i === TWIN_AGAIN && twin !== null) card.tel("TEL;TYPE=CELL", mobile(twin.national, "compact"));
    else if (i !== 12) {
      const national = book.fresh();
      if (i === TWIN_FIRST) twin = { who, national };
      card.tel("TEL;TYPE=CELL", mobile(national, i % 3 === 0 ? "spaced" : "plusSpaced"));
    }
    if (i % 5 === 0) card.lines.push(`ORG:${vEscape(rng.pick(ORGS))}`);
    if (i === 21) card.lines.push(`NOTE:${vEscape(LONG_NOTE)}`);
    const tags = CATEGORIES[i % CATEGORIES.length];
    card.lines.push(`CATEGORIES:${tags}`, "END:VCARD");
    cards.push({ text: cardText(card.lines, CRLF, true), draft: { name: who.name, phones: card.phones, tags, ...(email === null ? {} : { email }) } });
  }
  return vcardBuilt(name, "A Google Contacts export as vCard 3.0, 25 cards.", "crlf", [
    "CATEGORIES carry Google's system groups (myContacts, starred) and a user label (Wateja); tags holds the value as written.",
    `Card 3: two CELL numbers. Card 6: a work landline written +255 2… before the mobile. Card 9: an item1.TEL with a custom label. Card 12: no TEL. ` +
      `Card 15: a Kenyan number through the 00 prefix, no TYPE. Card ${TWIN_AGAIN} repeats card ${TWIN_FIRST}.`,
  ], cards);
}

/** A vCard 4.0 tel: URI, written the RFC 3966 way: +255-712-345-678. */
const telUri = (n: string): string => `tel:+${TZ_COUNTRY_CODE}-${n.slice(0, 3)}-${n.slice(3, 6)}-${n.slice(6)}`;

/** 19 · vCard 4.0 (RFC 6350): what newer address books and CRMs write. */
function makeVcard4(): Built {
  const name = "vcard4.vcf";
  const rng = new Rng(name);
  const book = new NumberBook(rng);
  const cards: TextRecord[] = [];
  let first = "";
  for (let i = 1; i <= 12; i++) {
    const who = someone(rng);
    const card = cardStart("4.0");
    card.lines.push(
      `UID:urn:uuid:${rng.hex(8)}-${rng.hex(4)}-4${rng.hex(3)}-a${rng.hex(3)}-${rng.hex(12)}`,
      `FN:${vEscape(who.name)}`,
      `N:${vEscape(who.family)};${vEscape(who.given)};;;`,
    );
    const valid = (n: string, written: string): PhoneDraft => ({ written, key: keyOf(n), kind: "valid" });
    if (i === 1) {
      first = book.fresh();
      card.tel(`TEL;VALUE=uri;TYPE="cell,voice"`, valid(first, telUri(first)));
    } else if (i === 2) {
      const { area, rest } = landlineParts(rng);
      card.tel(`TEL;VALUE=uri;PREF=1;TYPE="work,voice"`, { written: `tel:+${TZ_COUNTRY_CODE}-${area}-${rest.slice(0, 3)}-${rest.slice(3)};ext=101`, key: null, kind: "landline" });
      const n = book.fresh();
      card.tel("TEL;VALUE=uri;TYPE=cell", valid(n, telUri(n)));
    } else if (i === 3) {
      card.tel("TEL;VALUE=uri;TYPE=cell", { written: `tel:+254-7${rng.digits(2)}-${rng.digits(3)}-${rng.digits(3)}`, key: null, kind: "foreign" });
    } else if (i === 4) {
      const n = book.fresh();
      card.tel("TEL;VALUE=uri;TYPE=cell", valid(n, `tel:0${n}`));
    } else if (i === 5) {
      card.tel("TEL;TYPE=cell", mobile(book.fresh(), "plusSpaced"));
    } else if (i === 6) {
      const n = book.fresh();
      card.tel("TEL;VALUE=uri;TYPE=cell", valid(n, `${telUri(n)};ext=5`));
    } else if (i === 8) {
      const n = book.fresh();
      card.tel(`TEL;VALUE=uri;TYPE="voice,cell";PREF=1`, valid(n, telUri(n)));
    } else if (i === 9) {
      card.tel("TEL;VALUE=uri", valid(first, `tel:+${TZ_COUNTRY_CODE}${first}`));
    } else if (i !== 7) {
      const n = book.fresh();
      card.tel("TEL;VALUE=uri;TYPE=cell", valid(n, telUri(n)));
    }
    let email: string | null = null;
    if (i % 2 === 0) {
      email = who.email;
      card.lines.push(`EMAIL;TYPE=work:${email}`);
    }
    card.lines.push("END:VCARD");
    cards.push({ text: cardText(card.lines, CRLF, true), draft: { name: who.name, phones: card.phones, ...(email === null ? {} : { email }) } });
  }
  return vcardBuilt(name, "Contacts exported as vCard 4.0 by a newer address book or CRM, 12 cards.", "crlf", [
    "TEL values are tel: URIs; written keeps the URI whole. Its number is the URI without the scheme and cut at the first ; (RFC 3966) — " +
      "card 2's preferred landline carries ;ext=101, card 6's mobile ;ext=5.",
    "Card 2 prefers a work landline (PREF=1) over a mobile; card 3 is a Kenyan +254 URI; card 4 a local tel:0… URI; card 5 a plain text TEL; " +
      "card 7 has no TEL; card 8 a quoted TYPE list with PREF=1; card 9 repeats card 1's number, written without dashes.",
  ], cards);
}

/** 20 · A .vcf whose download stopped: the tenth card is cut off in the middle of a line. */
function makeTruncated(): Built {
  const name = "truncated.vcf";
  const rng = new Rng(name);
  const book = new NumberBook(rng);
  const cards: TextRecord[] = [];
  for (let i = 1; i <= 10; i++) {
    const who = someone(rng);
    const card = cardStart("3.0");
    card.lines.push(`N:${vEscape(who.family)};${vEscape(who.given)};;;`, `FN:${vEscape(who.name)}`);
    card.tel("TEL;TYPE=CELL", mobile(book.fresh(), i % 2 === 0 ? "plusSpaced" : "spaced"));
    if (i < 10) {
      card.lines.push(`EMAIL;TYPE=INTERNET:${who.email}`, "END:VCARD");
      cards.push({ text: cardText(card.lines, CRLF, true), draft: { name: who.name, phones: card.phones, email: who.email } });
    } else {
      // The TEL line is whole; the EMAIL line stops after four characters, with no line end and no END:VCARD.
      cards.push({ text: `${cardText(card.lines, CRLF, true)}EMAIL;TYPE=INTERNET:${who.email.slice(0, 4)}`, draft: { name: who.name, phones: card.phones, broken: true } });
    }
  }
  return vcardBuilt(name, "A .vcf whose download stopped part-way: ten cards, the last cut off mid-line.", "crlf", [
    "Card 10 has a complete, valid TEL, but the file ends inside its EMAIL line: no END:VCARD, so the card is cut off (unreadable) and is no row.",
    "brokenAtByte is where card 10's BEGIN:VCARD starts; the bytes before it are nine whole cards.",
  ], cards);
}

/** 21 · Cards gathered from three systems and pasted into one file: CRLF, LF and an old Mac's bare CR. */
function makeMixedLineEndings(): Built {
  const name = "mixed-line-endings.vcf";
  const rng = new Rng(name);
  const book = new NumberBook(rng);
  const EOLS: readonly string[] = [CRLF, CRLF, LF, LF, CR, CRLF, LF, CRLF];
  const cards: TextRecord[] = [];
  EOLS.forEach((eol, index) => {
    const who = someone(rng);
    const card = cardStart("3.0");
    card.lines.push(`N:${vEscape(who.family)};${vEscape(who.given)};;;`, `FN:${vEscape(who.name)}`);
    card.tel("TEL;TYPE=CELL", mobile(book.fresh(), index % 2 === 0 ? "spaced" : "plusSpaced"));
    card.lines.push("END:VCARD");
    cards.push({ text: cardText(card.lines, eol, true), draft: { name: who.name, phones: card.phones } });
  });
  return vcardBuilt(name, "Eight cards from three systems in one file: Windows CRLF, Unix LF and one old-Mac bare CR.", "mixed", [
    "Cards 1, 2, 6 and 8 end their lines with CRLF; cards 3, 4 and 7 with LF; card 5 with a bare CR. Every card is whole.",
  ], cards);
}

/* ══ PASTE ════════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** 22 · Text an officer copies out of a WhatsApp chat and pastes into the paste box. */
function makePaste(): Built {
  const name = "paste-whatsapp.txt";
  const rng = new Rng(name);
  const book = new NumberBook(rng);
  const records: TextRecord[] = [];
  const line = (text: string, draft: RecordDraft): void => {
    records.push({ text: text + LF, draft });
  };
  const a = book.fresh();
  const p1 = mobile(a, "plusSpaced");
  line(p1.written, { name: null, phones: [p1] });
  const p2 = mobile(a, "spaced");
  line(`Neema: ${p2.written}`, { name: "Neema", phones: [p2] });
  const p3 = mobile(book.fresh(), "compact");
  const p4 = mobile(book.fresh(), "spaced");
  line(`${p3.written}, ${p4.written}`, { name: null, phones: [p3, p4] });
  line("", BLANK);
  line("Tafadhali waongeze hawa kwenye orodha ya wateja wa Mwanza", { name: null, phones: [] });
  const p5 = mobile(book.fresh(), "spaced");
  line(`Baraka Mwakyusa - ${p5.written}`, { name: "Baraka Mwakyusa", phones: [p5] });
  const p6 = mobile(book.fresh(), "spaced");
  line(`Mama Ntilie ${p6.written}`, { name: "Mama Ntilie", phones: [p6] });
  line("", BLANK);
  const p7 = foreign(rng, 0);
  line(`${p7.written} (Nairobi)`, { name: null, phones: [p7] });
  const p8 = mobile(book.fresh(), "dashed");
  line(`${p8.written} Zawadi`, { name: "Zawadi", phones: [p8] });
  const p9 = landline(rng);
  line(`Namba ya ofisi: ${p9.written}`, { name: null, phones: [p9] });
  const p10 = mobile(book.fresh(), "spaced");
  line(`*Rehema* ${p10.written}`, { name: "*Rehema*", phones: [p10] });
  const p11 = tooShort(book.fresh());
  line(`Juma ${p11.written}`, { name: "Juma", phones: [p11] });
  return textBuilt({
    name,
    format: "paste",
    mimics: "Lines copied out of a WhatsApp chat into the paste box: numbers with names, two on a line, blank lines, plain text.",
    encoding: "utf-8",
    lineEnding: "lf",
    delimiter: null,
    header: null,
    notes: [
      "Each phone's written is the number as it stands inside its line; name is the person the line names (null when none).",
      "Line 2 repeats line 1's number; line 3 holds two numbers; lines 4 and 8 are blank; line 5 has no number; " +
        "line 9 is Kenyan, line 11 a landline, line 13 too short; line 12's name keeps WhatsApp's bold asterisks.",
    ],
    lead: "",
    records,
    firstLine: 1,
  });
}

/* ══ THE PRODUCTION-SAFE SET — the same 40 people in three formats ═══════════════════════════════════════════════ */

type QaPerson = { readonly name: string; readonly phone: PhoneDraft };

/** The 40 people (see the header): 34 valid numbers 01–34 of the pattern, 3 repeats, 3 refused. */
function qaPeople(): QaPerson[] {
  const row = TZ_MOBILE_NDCS.find((r) => r.ndc === QA_NDC);
  if (row === undefined || !row.sendable || !keyOf(QA_STEM).startsWith(TZ_COUNTRY_CODE + QA_NDC)) {
    throw new Error(`real-world-files: the QA pattern's range 0${QA_NDC} is no longer sendable — document another pattern`);
  }
  const rng = new Rng("prod-check-40");
  const HOW: readonly Spelling[] = ["spaced", "plusSpaced", "compact", "plus"];
  const REPEATS = new Map<number, number>([[12, 3], [25, 9], [38, 20]]);
  const nnOf = new Map<number, number>();
  const out: QaPerson[] = [];
  let nn = 0;
  for (let i = 1; i <= 40; i++) {
    const who = someone(rng);
    const repeatOf = REPEATS.get(i);
    let phone: PhoneDraft;
    if (i === 7) phone = tooShort(QA_STEM + pad2(i));
    else if (i === 18) phone = { written: `+44 7700 900${String(i).padStart(3, "0")}`, key: null, kind: "foreign" };
    else if (i === 29) phone = unallocated(rng, "withdrawn", `00000${pad2(i)}`);
    else if (repeatOf !== undefined) phone = mobile(QA_STEM + pad2(nnOf.get(repeatOf) ?? 0), HOW[(repeatOf + 1) % HOW.length]);
    else {
      nn += 1;
      nnOf.set(i, nn);
      phone = mobile(QA_STEM + pad2(nn), HOW[i % HOW.length]);
    }
    out.push({ name: QA_PREFIX + who.name, phone });
  }
  if (nn !== QA_VALID_COUNT) throw new Error(`real-world-files: the QA set holds ${nn} valid numbers, not ${QA_VALID_COUNT}`);
  return out;
}

const QA_MIMICS = "A small, findable set for a LIVE import check that is deleted afterwards: 40 people, every row tagged qa-import-check.";
const QA_NOTES: readonly string[] = [
  `Every row is tagged ${QA_TAG} and every name begins "QA Import — ". Valid numbers: +255 710 000 0NN (key 2557100000NN), NN = 01–${QA_VALID_COUNT}.`,
  "Tanzania has no fictional range: never send to these numbers; delete the rows by the tag or the pattern when the check is done.",
  "Lines (cards) 12, 25 and 38 repeat the numbers of 3, 9 and 20 in another spelling (CSV/XLSX lines are one higher: the header is line 1). " +
    "Refused: 7 too short, 18 the UK drama range +44 7700 900…, 29 the withdrawn 064 range.",
  "The three files hold the SAME people — importing a second one meets every number already in the book.",
];
const QA_HEADER: readonly string[] = [aliasHeader("phone", "Phone"), aliasHeader("name", "Name"), aliasHeader("tags", "Tags")];

function makeProdCsv(): Built {
  const records: TextRecord[] = qaPeople().map((p) => ({
    text: csvLine([p.phone.written, p.name, QA_TAG], EXCEL_COMMA),
    draft: { name: p.name, phones: [p.phone], tags: QA_TAG },
  }));
  return textBuilt({
    name: "prod-check-40.csv",
    format: "csv",
    mimics: QA_MIMICS,
    encoding: "utf-8-bom",
    lineEnding: "crlf",
    delimiter: "comma",
    header: QA_HEADER,
    notes: QA_NOTES,
    lead: csvLine(QA_HEADER, EXCEL_COMMA),
    records,
    firstLine: 2,
  });
}

function makeProdVcf(): Built {
  const cards: TextRecord[] = qaPeople().map((p) => {
    // The repo's own sample convention: FN carries the whole name and N stays empty, so no reader splits it.
    const lines = ["BEGIN:VCARD", "VERSION:3.0", "N:;;;;", `FN:${vEscape(p.name)}`, `TEL;TYPE=CELL:${p.phone.written}`, `CATEGORIES:${QA_TAG}`, "END:VCARD"];
    return { text: cardText(lines, CRLF, true), draft: { name: p.name, phones: [at(p.phone, "TEL;TYPE=CELL")], tags: QA_TAG } };
  });
  return vcardBuilt("prod-check-40.vcf", QA_MIMICS, "crlf", QA_NOTES, cards);
}

async function makeProdXlsx(): Promise<Built> {
  const wb = newWorkbook();
  const ws = wb.addWorksheet("QA");
  ws.addRow([...QA_HEADER]);
  ws.getColumn(1).width = 18;
  ws.getColumn(2).width = 36;
  const drafts: RecordDraft[] = [];
  for (const p of qaPeople()) {
    ws.addRow([p.phone.written, p.name, QA_TAG]).getCell(1).numFmt = "@";
    drafts.push({ name: p.name, phones: [{ ...p.phone, cell: "text" }], tags: QA_TAG });
  }
  return xlsxBuilt("prod-check-40.xlsx", QA_MIMICS, await workbookBytes(wb), QA_HEADER, "QA", QA_NOTES, settlePeople(drafts, 2));
}

/* ══ C8c · THE FOUR FILES C3b-FIX'S REVIEW ASKED FOR (28–31) ═════════════════════════════════════════════════════
 * The review round (C3b-fix, 2026-10-09) decided D2, D5, D6 and D7 and proved them on hand-made fixtures; its builder did
 * not reach the real-world files that hold each shape. These four are those files — each with its truth, each run past
 * the self-check like every other — and `scripts/live/contacts-import-drive.mjs` restates each decision over them. */

/** The records of a file the rows' truth says nothing about (a quote's swallowed lines, another sheet): their phones are
 *  still asked of the code they describe, so no file here carries a value that is not the kind it was built as. */
function assertWrittenPhones(file: string, phones: readonly PhoneDraft[]): void {
  phones.forEach((p, i) => assertPhone(file, i + 1, p));
}

/** 28 · ⭐ C3b-fix · D5 · a quotation mark opened in the MIDDLE of a hand-kept list and never closed. */
function makeBrokenMidFile(): Built {
  const name = "broken-quote-mid-file.csv";
  const rng = new Rng(name);
  const book = new NumberBook(rng);
  const header = [aliasHeader("phone", "Phone"), aliasHeader("name", "Name"), aliasHeader("notes", "Notes")];
  /** The records above the broken one; and the would-be records below it, which its open quotation mark swallows. */
  const BEFORE = 12;
  const AFTER = 11;
  const LANDLINE_AT = 6;
  const REPEAT_AT = 10;
  const REPEAT_OF = 3;
  const NOTE_CELLS = ["", "Mteja wa zamani", "", "Anapenda SMS za Kiswahili", ""];
  const nationals = new Map<number, string>();
  const records: TextRecord[] = [];
  for (let i = 1; i <= BEFORE; i++) {
    const who = someone(rng);
    let phone: PhoneDraft;
    if (i === LANDLINE_AT) phone = landline(rng);
    else if (i === REPEAT_AT) {
      const first = nationals.get(REPEAT_OF);
      if (first === undefined) throw new Error(`real-world-files: ${name} — the repeated person has no number yet`);
      phone = mobile(first, "plusSpaced");
    } else {
      const national = book.fresh();
      nationals.set(i, national);
      phone = mobile(national, i % 2 === 0 ? "compact" : "spaced");
    }
    records.push({ text: csvLine([phone.written, who.name, NOTE_CELLS[i % NOTE_CELLS.length]], EXCEL_COMMA), draft: { name: who.name, phones: [phone] } });
  }
  // ⭐ THE BREAK: the Notes cell opens a quotation mark and never closes it, so every line below sits INSIDE that one cell —
  // a person reading the file sees AFTER more people; a correct reader sees none of them. ⛔ No swallowed line may hold a
  // quotation mark (a cell the writer quotes would): one would CLOSE the quote, and the file would be another file.
  const mama = mobile(book.fresh(), "spaced");
  const swallowed: string[] = [];
  const swallowedPhones: PhoneDraft[] = [];
  for (let i = 1; i <= AFTER; i++) {
    const phone = mobile(book.fresh(), i % 2 === 0 ? "compact" : "spaced");
    const text = csvLine([phone.written, someone(rng).name, ""], EXCEL_COMMA);
    if (text.includes(QUOTE)) throw new Error(`real-world-files: ${name} — a swallowed line holds a quotation mark, which would close the quote`);
    swallowedPhones.push(phone);
    swallowed.push(text);
  }
  assertWrittenPhones(name, swallowedPhones);
  const brokenLine = BEFORE + 2;
  records.push({
    text: `${[mama.written, "Mama Pendo"].join(",")},${QUOTE}Analipa kila Ijumaa${CRLF}${swallowed.join("")}`,
    draft: { name: "Mama Pendo", phones: [mama], broken: true, swallowedLines: swallowed.length },
  });
  return textBuilt({
    name,
    format: "csv",
    mimics: "A list kept by hand: one note in the middle opens a quotation mark that is never closed, so every row below it sits inside that one cell.",
    encoding: "utf-8",
    lineEnding: "crlf",
    delimiter: "comma",
    header,
    notes: [
      `Line ${brokenLine} opens a quotation mark in its Notes cell that never closes: the ${swallowed.length} physical lines after it — ` +
        `${swallowed.length} more people, as a person reads the file — sit INSIDE that one cell (swallowedLines), so no reader can read them as rows. ` +
        "The end-of-file case is messy-real-life.csv.",
      `A correct reader keeps the ${BEFORE} records above line ${brokenLine} (C3b G1: a data row came before it, so the file is not refused — ` +
        `C3b-fix D5e) and lists line ${brokenLine} as ONE record that could not be read — it and the ${swallowed.length} lines after it (D5b) — said ` +
        `once on the columns step (D5c); the check's and the result's sum lines say the ${swallowed.length} lines after row ${brokenLine} were not ` +
        "read, never that every row of the file was counted (D5d).",
      `Line ${LANDLINE_AT + 1} is a landline; line ${REPEAT_AT + 1} repeats line ${REPEAT_OF + 1}'s number in another spelling.`,
    ],
    lead: csvLine(header, EXCEL_COMMA),
    records,
    firstLine: 2,
  });
}

/** 29 · ⭐ C3b-fix · D2 · Outlook's export of an office's address book: the assistant's line and the switchboard filled in. */
function makeOutlookAssistant(): Built {
  const name = "outlook-assistant-phones.csv";
  const rng = new Rng(name);
  const book = new NumberBook(rng);
  aliasHeader("first_name", "First Name");
  aliasHeader("last_name", "Last Name");
  aliasHeader("phone", "Mobile Phone");
  // ⛔ D2 · another person's line and a shared one — proved to be no field's spelling: no reader may take either.
  const ASSISTANT = unknownHeader("Assistant's Phone");
  const SWITCHBOARD = unknownHeader("Company Main Phone");
  const MOBILE = "Mobile Phone";
  const OWN_COLUMNS = ["Business Phone", "Home Phone"] as const;
  for (const column of [ASSISTANT, SWITCHBOARD, MOBILE, ...OWN_COLUMNS]) {
    if (!OUTLOOK_HEADER.includes(column)) throw new Error(`real-world-files: ${name} — Outlook's header has no ${column} column`);
  }
  /** One row each: what Mobile Phone holds, the person's own other column (G4), the assistant's mobile, the switchboard. */
  type Plan = {
    readonly mobile?: "mobile" | "landline";
    readonly own?: (typeof OWN_COLUMNS)[number];
    readonly assistant?: true;
    readonly switchboard?: "mobile" | "landline";
  };
  const PLAN: readonly Plan[] = [
    { mobile: "mobile", assistant: true },
    { assistant: true },
    { mobile: "mobile", switchboard: "mobile" },
    { switchboard: "mobile" },
    { own: "Business Phone", assistant: true },
    { mobile: "mobile", switchboard: "landline" },
    { own: "Home Phone", switchboard: "mobile" },
    { assistant: true, switchboard: "mobile" },
    { mobile: "landline", assistant: true },
    { mobile: "mobile" },
    { mobile: "mobile", assistant: true, switchboard: "mobile" },
    { mobile: "mobile" },
  ];
  const linesWhere = (test: (p: Plan) => boolean): string => PLAN.flatMap((p, i) => (test(p) ? [String(i + 2)] : [])).join(", ");
  const records: TextRecord[] = PLAN.map((p) => {
    const who = someone(rng);
    const cell = new Map<string, string>([
      ["First Name", who.given],
      ["Last Name", who.family],
      ["Company", rng.pick(ORGS)],
      ["Job Title", rng.pick(["Meneja", "Mhasibu", "Afisa Mauzo"])],
      ["Anniversary", "0/0/00"],
      ["Birthday", "0/0/00"],
      ["Gender", "Unspecified"],
      ["Initials", `${who.given.charAt(0)}.${who.family.charAt(0)}.`],
      ["Priority", "Normal"],
      ["Private", "False"],
      ["Sensitivity", "Normal"],
    ]);
    const phones: PhoneDraft[] = [];
    const put = (column: string, ph: PhoneDraft): void => {
      cell.set(column, ph.written);
      phones.push(at(ph, column));
    };
    if (p.mobile === "mobile") put(MOBILE, mobile(book.fresh(), "plusSpaced"));
    if (p.mobile === "landline") put(MOBILE, landline(rng, true));
    if (p.own !== undefined) put(p.own, mobile(book.fresh(), "spaced"));
    if (p.assistant === true) {
      put(ASSISTANT, mobile(book.fresh(), "compact"));
      cell.set("Assistant's Name", someone(rng).name);
    }
    if (p.switchboard === "mobile") put(SWITCHBOARD, mobile(book.fresh(), "spaced"));
    if (p.switchboard === "landline") put(SWITCHBOARD, landline(rng));
    return { text: csvLine(OUTLOOK_HEADER.map((h) => cell.get(h) ?? ""), OUTLOOK_STYLE), draft: { name: who.name, phones } };
  });
  return textBuilt({
    name,
    format: "csv",
    mimics: "Outlook desktop's CSV export of an office's address book: the assistant's line and the company switchboard filled in beside — or instead of — the person's own mobile.",
    encoding: "windows-1252",
    lineEnding: "crlf",
    delimiter: "comma",
    header: OUTLOOK_HEADER,
    notes: [
      "C3b-fix D2: Assistant's Phone is another person's line and Company Main Phone the office switchboard — never the person's own number, " +
        "so no reader takes either, whatever it holds. Only Mobile Phone is a phone alias; G4 reads the person's OWN other phone columns " +
        "(Business Phone, Home Phone …) only for a row whose Mobile Phone yields no mobile. Every byte is ASCII, so either decode reads it the same.",
      `No number — the only mobiles are the assistant's or the switchboard's: lines ${linesWhere((p) => p.mobile === undefined && p.own === undefined)}. ` +
        `A landline in Mobile Phone beside the assistant's mobile: line ${linesWhere((p) => p.mobile === "landline")} (the landline's own refusal).`,
      `Imported through G4 — Mobile Phone empty, ONE mobile in Business Phone or Home Phone beside a different one in Assistant's Phone or Company ` +
        `Main Phone: lines ${linesWhere((p) => p.own !== undefined)}. A reader that took the assistant's or the switchboard's line would find two ` +
        "mobiles in the row and refuse it (D3).",
      `Mobile Phone's own mobile with another in Assistant's Phone or Company Main Phone beside it: lines ${linesWhere((p) => p.mobile === "mobile" && (p.assistant === true || p.switchboard === "mobile"))} — ` +
        "the person's number is Mobile Phone's. The added column reads Phone (read from: Mobile Phone, Business Phone, Home Phone), never naming " +
        "Assistant's Phone or Company Main Phone.",
      "The aggregate counts every mobile WRITTEN, the assistants' and the switchboards' too; which rows have a number is the rule's (the drive restates it, c3bExpectations).",
    ],
    lead: csvLine(OUTLOOK_HEADER, OUTLOOK_STYLE),
    records,
    firstLine: 2,
  });
}

/** 30 · ⭐ C3b-fix · D6 + D7 · a small staff sheet first, then the customers under a title row. */
async function makeExcelTitleStaff(): Promise<Built> {
  const name = "excel-title-staff.xlsx";
  const rng = new Rng(name);
  const book = new NumberBook(rng);
  const wb = newWorkbook();
  // Sheet 1 — the office's own staff, their column names on row 1: five mobiles, a Phone column by a strong heading.
  const STAFF = "Wafanyakazi";
  const staff = wb.addWorksheet(STAFF);
  staff.addRow([aliasHeader("name", "Jina"), aliasHeader("phone", "Simu"), unknownHeader("Cheo")]);
  staff.getColumn(1).width = 26;
  staff.getColumn(2).width = 18;
  const staffPhones: PhoneDraft[] = [];
  for (const role of ["Meneja", "Mhasibu", "Afisa Mauzo", "Mlinzi", "Dereva"]) {
    const phone = mobile(book.fresh(), "spaced");
    staffPhones.push(phone);
    staff.addRow([someone(rng).name, phone.written, role]).getCell(2).numFmt = "@";
  }
  assertWrittenPhones(name, staffPhones);
  // Sheet 2 — the customers: a title on row 1, row 2 empty, the column names on row 3, the people from row 4.
  const CUSTOMERS = "Wateja";
  const ws = wb.addWorksheet(CUSTOMERS);
  const TITLE = `Orodha ya wateja ${EM_DASH} Oktoba 2026`;
  ws.getCell("A1").value = TITLE;
  const header = [aliasHeader("phone", "Simu"), aliasHeader("name", "Jina"), aliasHeader("tags", "Makundi")];
  const HEADER_ROW = 3;
  header.forEach((h, i) => {
    ws.getCell(HEADER_ROW, i + 1).value = h;
  });
  ws.getColumn(1).width = 18;
  ws.getColumn(2).width = 28;
  const CUSTOMERS_N = 30;
  const LANDLINE_AT = 9;
  const REPEAT_AT = 20;
  const REPEAT_OF = 5;
  const nationals = new Map<number, string>();
  const drafts: RecordDraft[] = [];
  let customerMobiles = 0;
  for (let i = 1; i <= CUSTOMERS_N; i++) {
    const who = someone(rng);
    let phone: PhoneDraft;
    if (i === LANDLINE_AT) phone = landline(rng);
    else if (i === REPEAT_AT) {
      const first = nationals.get(REPEAT_OF);
      if (first === undefined) throw new Error(`real-world-files: ${name} — the repeated customer has no number yet`);
      phone = mobile(first, "plusSpaced");
    } else {
      const national = book.fresh();
      nationals.set(i, national);
      phone = mobile(national, i % 3 === 0 ? "compact" : "spaced");
    }
    // D6 counts CELLS that hold one mobile — a repeated number's cell is one more.
    if (phone.key !== null) customerMobiles++;
    const tags = rng.pick(["wateja", "vip", "", "mawakala"]);
    const row = HEADER_ROW + i;
    ws.getCell(row, 1).value = phone.written;
    ws.getCell(row, 1).numFmt = "@";
    ws.getCell(row, 2).value = who.name;
    if (tags !== "") ws.getCell(row, 3).value = tags;
    drafts.push({ name: who.name, phones: [{ ...phone, cell: "text" }], tags });
  }
  // ⛔ The file's point: the customers' sheet holds MORE mobiles than the staff sheet before it.
  if (customerMobiles <= staffPhones.length) throw new Error(`real-world-files: ${name} — the customers no longer outnumber the staff`);
  const built = xlsxBuilt(
    name,
    "An office workbook: a small staff sheet first, then the customers under a title row — the shape C3b's header rule lost to the staff list.",
    await workbookBytes(wb),
    header,
    CUSTOMERS,
    [
      `people describes the SECOND sheet, ${CUSTOMERS}: its title on row 1, row 2 empty, its column names on row ${HEADER_ROW}, ${CUSTOMERS_N} customers ` +
        `from row ${HEADER_ROW + 1}. The first sheet, ${STAFF}, is the office's ${staffPhones.length} staff with their mobiles under column names on row 1.`,
      `C3b-fix D6: the reader reads the VISIBLE sheet whose first rows hold the most mobiles — ${CUSTOMERS} (${customerMobiles} against ` +
        `${staffPhones.length}; sheets), though ${STAFF} comes first and names its Phone column on row 1 (C3b's header rule read the staff) — and ` +
        `its note names ${STAFF} as NOT read, with the way to import it (save it as its own file).`,
      "C3b-fix D7: row 1's title leaves the data with ONE note naming row 1 (titleRows), never what it says; row 2 stays a counted blank " +
        "row, and every row keeps its sheet row number.",
      `Line ${HEADER_ROW + LANDLINE_AT} is a landline; line ${HEADER_ROW + REPEAT_AT} repeats line ${HEADER_ROW + REPEAT_OF}'s number in another spelling.`,
    ],
    settlePeople(drafts, HEADER_ROW + 1),
  );
  return {
    ...built,
    titleRows: [{ line: 1, text: TITLE }],
    sheets: [
      { name: STAFF, visible: true, mobiles: staffPhones.length },
      { name: CUSTOMERS, visible: true, mobiles: customerMobiles },
    ],
  };
}

/** 31 · ⭐ C3b-fix · D7 · a CSV typed by hand: a bare title and a sub-title above the column names, no separator at all. */
function makeHandTypedTitle(): Built {
  const name = "hand-typed-title.csv";
  const rng = new Rng(name);
  const book = new NumberBook(rng);
  const TITLE = "Wateja wa Oktoba 2026";
  const SUBTITLE = "Imeandaliwa na Ofisi ya Masoko Dar es Salaam";
  // ⛔ UNPADDED: typed, never saved by a spreadsheet — no separator a CSV reader could vote for, and no quotation mark.
  for (const t of [TITLE, SUBTITLE]) {
    if ([",", ";", TAB, "|", QUOTE].some((c) => t.includes(c))) throw new Error(`real-world-files: ${name} — a title row holds a separator; it must be bare`);
  }
  const header = [aliasHeader("phone", "Simu"), aliasHeader("name", "Jina"), aliasHeader("tags", "Makundi")];
  /** Line 3 is blank; the column names are on line 4. */
  const HEADER_LINE = 4;
  const PEOPLE = 15;
  const LANDLINE_AT = 7;
  const REPEAT_AT = 12;
  const REPEAT_OF = 4;
  const TAGS = ["wateja", "", "vip", "", "dar"];
  const nationals = new Map<number, string>();
  const records: TextRecord[] = [];
  for (let i = 1; i <= PEOPLE; i++) {
    const who = someone(rng);
    let phone: PhoneDraft;
    if (i === LANDLINE_AT) phone = landline(rng);
    else if (i === REPEAT_AT) {
      const first = nationals.get(REPEAT_OF);
      if (first === undefined) throw new Error(`real-world-files: ${name} — the repeated person has no number yet`);
      phone = mobile(first, "compact");
    } else {
      const national = book.fresh();
      nationals.set(i, national);
      phone = mobile(national, i % 2 === 0 ? "spaced" : "plusSpaced");
    }
    const tags = TAGS[i % TAGS.length];
    records.push({ text: csvLine([phone.written, who.name, tags], EXCEL_COMMA), draft: { name: who.name, phones: [phone], tags } });
  }
  return textBuilt({
    name,
    format: "csv",
    mimics: "A list typed by hand in Notepad: a title and a sub-title on their own lines with no separator, a blank line, then the column names.",
    encoding: "utf-8",
    lineEnding: "crlf",
    delimiter: "comma",
    header,
    notes: [
      `Lines 1 and 2 are a title and a sub-title typed with NO separator (unpadded: no spreadsheet saved this file), line 3 is blank and line ${HEADER_LINE} ` +
        "holds the column names. Before C8c the CSV reader's vote read line 1 alone, found no separator and read the WHOLE file as one column, " +
        "so D7 had no column names to find (C3b-fix's open find).",
      `A correct reader votes past the bare title rows (D7's own first-row test), reads the file comma-separated, and D7 takes rows 1${EN_DASH}2 ` +
        "out of the data with ONE note naming them (titleRows), never what they say; line 3 stays a counted blank row and every row keeps its real number.",
      `Line ${HEADER_LINE + LANDLINE_AT} is a landline; line ${HEADER_LINE + REPEAT_AT} repeats line ${HEADER_LINE + REPEAT_OF}'s number in another spelling.`,
    ],
    lead: `${TITLE}${CRLF}${SUBTITLE}${CRLF}${CRLF}${csvLine(header, EXCEL_COMMA)}`,
    records,
    firstLine: HEADER_LINE + 1,
    titleRows: [{ line: 1, text: TITLE }, { line: 2, text: SUBTITLE }],
  });
}

/* ══ THE BIG FILES (--big) — streamed to disk, aggregates only ════════════════════════════════════════════════════ */

const BIG_DUPLICATE_SHARE = 0.06;
const BIG_INVALID_SHARE = 0.02;
const SUBSCRIBERS = 10_000_000;
/** A prime coprime with 10^7: (c * 7919 + offset) mod 10^7 never repeats for c below 10^7 — unique numbers, no Set. */
const PERMUTE_STEP = 7_919;
const BIG_TAGS: readonly string[] = ["", "", "wateja", "vip", "dar", "promo", "mawakala"];
/** Text is written in pieces of about a million characters — the file is never held whole. */
const SINK_CHUNK = 1 << 20;

/** One phone a row: ~2% refused, ~6% an earlier number in another spelling, the rest new. Counts as it goes. */
class BigStream {
  private readonly rng: Rng;
  private readonly offset: number;
  private cursor = 0;
  private readonly nationals: string[] = [];
  private readonly spellings: number[] = [];
  private records = 0;
  private duplicateRows = 0;
  private invalidRows = 0;
  constructor(label: string) {
    this.rng = new Rng(label);
    this.offset = this.rng.int(SUBSCRIBERS);
  }
  private fresh(): string {
    for (;;) {
      const c = this.cursor++;
      const national = RANDOM_NDCS[c % RANDOM_NDCS.length] + String((c * PERMUTE_STEP + this.offset) % SUBSCRIBERS).padStart(7, "0");
      if (!isReserved(national)) return national;
    }
  }
  phone(): PhoneDraft {
    this.records++;
    const r = this.rng.next();
    if (r < BIG_INVALID_SHARE) {
      this.invalidRows++;
      const n = this.rng.pick(RANDOM_NDCS) + this.rng.digits(7);
      const pick = this.rng.int(8);
      if (pick === 0) return foreign(this.rng);
      if (pick === 1) return landline(this.rng, this.rng.chance(0.3));
      if (pick === 2) return tollFree(this.rng);
      if (pick === 3) return tooShort(n);
      if (pick === 4) return tooLong(this.rng, n);
      if (pick === 5) return withLetter(this.rng, n);
      if (pick === 6) return unallocated(this.rng, this.rng.chance(0.5) ? "withdrawn" : "unplanned");
      return noNumber(this.rng.pick(NO_NUMBER_WORDS));
    }
    if (r < BIG_INVALID_SHARE + BIG_DUPLICATE_SHARE && this.nationals.length > 0) {
      this.duplicateRows++;
      const k = this.rng.int(this.nationals.length);
      return mobile(this.nationals[k], SPELLINGS[otherSpelling(this.spellings[k], this.rng)]);
    }
    const national = this.fresh();
    const s = this.rng.int(SPELLINGS.length);
    this.nationals.push(national);
    this.spellings.push(s);
    return mobile(national, SPELLINGS[s]);
  }
  who(): Who {
    return someone(this.rng);
  }
  tags(): string {
    return this.rng.pick(BIG_TAGS);
  }
  aggregate(): FileAggregate {
    return { records: this.records, validDistinct: this.nationals.length, duplicateRows: this.duplicateRows, invalidRows: this.invalidRows };
  }
}

/** Synchronous writes in large pieces: memory stays flat however many rows go through. */
class FileSink {
  private readonly fd: number;
  private parts: string[] = [];
  private pending = 0;
  private total = 0;
  constructor(path: string) {
    this.fd = openSync(path, "w");
  }
  text(s: string): void {
    this.parts.push(s);
    this.pending += s.length;
    if (this.pending >= SINK_CHUNK) this.flush();
  }
  bytes(b: Uint8Array): void {
    this.flush();
    this.put(b);
  }
  close(): number {
    this.flush();
    closeSync(this.fd);
    return this.total;
  }
  private flush(): void {
    if (this.parts.length === 0) return;
    const buf = Buffer.from(this.parts.join(""), "utf8");
    this.parts = [];
    this.pending = 0;
    this.put(buf);
  }
  private put(b: Uint8Array): void {
    let done = 0;
    while (done < b.length) done += writeSync(this.fd, b, done, b.length - done);
    this.total += b.length;
  }
}

type BigSpec = {
  readonly name: string;
  readonly format: "csv" | "xlsx" | "vcard";
  readonly mimics: string;
  readonly encoding: FileEncoding;
  readonly lineEnding: LineEnding;
  readonly delimiter: Delimiter | null;
  readonly header: readonly string[] | null;
  readonly sheet: string | null;
};

function bigTruth(spec: BigSpec, bytes: number, aggregate: FileAggregate, notes: readonly string[]): FileTruth {
  return { ...spec, bytes, refusal: null, brokenAtByte: null, notes, aggregate, people: null, big: true };
}

const BIG_HEADER: readonly string[] = [aliasHeader("phone", "Phone"), aliasHeader("name", "Name"), aliasHeader("tags", "Tags")];

function writeBigCsv(dir: string, name: string, rows: number, mimics: string, notes: readonly string[]): FileTruth {
  const stream = new BigStream(name);
  const sink = new FileSink(join(dir, name));
  let bytes = 0;
  try {
    sink.bytes(Buffer.from(UTF8_BOM));
    sink.text(csvLine(BIG_HEADER, EXCEL_COMMA));
    for (let i = 0; i < rows; i++) {
      const phone = stream.phone();
      assertPhone(name, i + 2, phone);
      sink.text(csvLine([phone.written, stream.who().name, stream.tags()], EXCEL_COMMA));
    }
  } finally {
    bytes = sink.close();
  }
  const spec: BigSpec = { name, format: "csv", mimics, encoding: "utf-8-bom", lineEnding: "crlf", delimiter: "comma", header: BIG_HEADER, sheet: null };
  return bigTruth(spec, bytes, stream.aggregate(), notes);
}

function writeBigVcards(dir: string, name: string, cards: number, withPhotos: boolean, mimics: string, notes: readonly string[]): FileTruth {
  const stream = new BigStream(name);
  const photoRng = new Rng(`${name}#photos`);
  // Eight folded PHOTO lines of ~8 KB each, reused in turn: 6,001 bytes of JPEG is 8,004 base64 characters, ending ==.
  const photos = withPhotos
    ? Array.from({ length: 8 }, () => foldLine(`PHOTO;ENCODING=b;TYPE=JPEG:${jpegLike(photoRng, 6001).toString("base64")}`, CRLF))
    : [];
  const sink = new FileSink(join(dir, name));
  let bytes = 0;
  try {
    for (let i = 0; i < cards; i++) {
      const phone = stream.phone();
      assertPhone(name, i + 1, phone);
      const who = stream.who();
      sink.text(
        `BEGIN:VCARD${CRLF}VERSION:3.0${CRLF}N:${who.family};${who.given};;;${CRLF}FN:${who.name}${CRLF}` +
          `TEL;TYPE=CELL:${phone.written}${CRLF}${photos.length > 0 ? photos[i % photos.length] : ""}END:VCARD${CRLF}`,
      );
    }
  } finally {
    bytes = sink.close();
  }
  const spec: BigSpec = { name, format: "vcard", mimics, encoding: "utf-8", lineEnding: "crlf", delimiter: null, header: null, sheet: null };
  return bigTruth(spec, bytes, stream.aggregate(), notes);
}

async function writeBigXlsx(dir: string, name: string, rows: number): Promise<FileTruth> {
  const path = join(dir, name);
  const stream = new BigStream(name);
  // exceljs's STREAMING writer: each row is committed and released, so 50,000 rows never sit in memory as a workbook.
  const wb = new ExcelJS.stream.xlsx.WorkbookWriter({ filename: path, useSharedStrings: true, useStyles: false });
  wb.creator = "Ofisi ya Masoko";
  wb.created = WORKBOOK_DATE;
  wb.modified = WORKBOOK_DATE;
  const ws = wb.addWorksheet("Sheet1");
  ws.addRow([...BIG_HEADER]).commit();
  for (let i = 0; i < rows; i++) {
    const phone = stream.phone();
    assertPhone(name, i + 2, phone);
    ws.addRow([phone.written, stream.who().name, stream.tags()]).commit();
  }
  ws.commit();
  await wb.commit();
  const pinned = pinZipTimes(readFileSync(path));
  writeFileSync(path, pinned);
  const over = pinned.length > XLSX_MAX_BYTES;
  const spec: BigSpec = { name, format: "xlsx", mimics: `${grouped(rows)} rows streamed into one sheet: Phone, Name, Tags.`, encoding: "binary", lineEnding: "none", delimiter: null, header: BIG_HEADER, sheet: "Sheet1" };
  return bigTruth(spec, pinned.length, stream.aggregate(), [
    `${grouped(pinned.length)} bytes against XLSX_MAX_BYTES (${grouped(XLSX_MAX_BYTES)}): ` +
      (over ? "OVER — the XLSX path refuses it as too_large, the case that sends an officer to CSV." : "within the cap."),
    "Phones are text cells in every spelling; ~6% repeat an earlier number, ~2% are refused.",
  ]);
}

/* ══ THE ONE ENTRY POINT ══════════════════════════════════════════════════════════════════════════════════════════ */

function grouped(n: number): string {
  const s = String(Math.trunc(n));
  let out = "";
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) out += ",";
    out += s.charAt(i);
  }
  return out;
}

type Maker = () => Built | Promise<Built>;

/** The small files, in the order the brief lists them. */
const SMALL_MAKERS: readonly Maker[] = [
  makeExcelCsvUtf8, makeSemicolon1252, makeSepHint, makeShortened, makeGoogleCsv, makeOutlook, makeNumbersOnly,
  makeUnicodeText, makeMessy, makeEmpty, makeHeaderOnly, makeNotReallyCsv, makeRenamedCsv, makeExcelBasic,
  makeExcelNumberCells, makeExcelMultiSheet, makeLegacyXls, makeOds, makeIphone, makeAndroid, makeGoogleVcf, makeVcard4,
  makeTruncated, makeMixedLineEndings, makePaste, makeProdCsv, makeProdVcf, makeProdXlsx,
  // ⭐ C8c · 28–31, the four files C3b-fix's review asked for — at the END of the list (C3c adds to this file too).
  makeBrokenMidFile, makeOutlookAssistant, makeExcelTitleStaff, makeHandTypedTitle,
];

/**
 * ⭐ Writes every file into `outDir` (created if missing) and returns the truth for each, in order. A small file is
 * checked against the code it describes BEFORE it is written (`checkFileTruth`); a big one value by value as it streams.
 * Either way a disagreement stops the run with the file, the line and the value. `big` adds the five big files.
 */
export async function writeRealWorldFiles(outDir: string, opts: RealWorldOptions = {}): Promise<FileTruth[]> {
  const dir = resolve(outDir);
  mkdirSync(dir, { recursive: true });
  const manifest: FileTruth[] = [];
  for (const make of SMALL_MAKERS) {
    const built = await make();
    const truth = settle(built);
    const problems = checkFileTruth(truth);
    if (problems.length > 0) {
      throw new Error(`real-world-files: ${built.name} — its truth disagrees with the code it describes:${LF}  ${problems.slice(0, 20).join(`${LF}  `)}`);
    }
    writeFileSync(join(dir, built.name), built.data);
    manifest.push(truth);
  }
  if (opts.big === true) {
    manifest.push(
      writeBigCsv(dir, "big-150k.csv", 150_000, "A 150,000-row export from a bulk-SMS or CRM system, saved as CSV UTF-8.", [
        "150,000 records: ~6% repeat an earlier number in another spelling, ~2% are refused numbers. Aggregates only.",
      ]),
      writeBigCsv(dir, "big-row-cap.csv", IMPORT_MAX_ROWS + 1, "One record more than one import may hold.", [
        `${grouped(IMPORT_MAX_ROWS + 1)} records: one more than IMPORT_MAX_ROWS (${grouped(IMPORT_MAX_ROWS)}, import-limits.ts) — the row-cap refusal.`,
      ]),
      await writeBigXlsx(dir, "big-50k.xlsx", 50_000),
      writeBigVcards(dir, "big-150k-cards.vcf", 150_000, false, "A whole phone book exported as vCard 3.0: 150,000 cards, no photos.", [
        "150,000 cards, one TEL each: ~6% repeat an earlier number, ~2% are refused. Aggregates only.",
      ]),
      writeBigVcards(dir, "big-photos.vcf", 5_000, true, "5,000 cards each carrying a ~8 KB folded PHOTO — about 40 MB.", [
        "Each card's PHOTO is ~8 KB of folded base64 that no field reads: the file that rules out a direct upload, and proves a photo is never held.",
      ]),
    );
  }
  return manifest;
}

/** The repository root, from this file's own place (two levels under it — here, or in scripts/lib/). */
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const REAL_WORLD_DEFAULT_OUT_DIR = join(REPO_ROOT, ".qa-shots", "contacts-screen", "files");

/** manifest.json beside the files: the generator, the seed, whether the big files are in, and every file's truth. */
export function writeManifest(outDir: string, files: readonly FileTruth[], big: boolean): string {
  const path = join(resolve(outDir), "manifest.json");
  const generator = relative(REPO_ROOT, fileURLToPath(import.meta.url)).split(sep).join("/");
  writeFileSync(path, `${JSON.stringify({ generator, seed: SEED, big, files }, null, 2)}${LF}`, "utf8");
  return path;
}

/* ══ THE CLI — only when this file is the entry point ═════════════════════════════════════════════════════════════ */

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const big = args.includes("--big");
  const positional = args.filter((a) => !a.startsWith("--"));
  const outDir = positional.length > 0 ? resolve(process.cwd(), positional[0]) : REAL_WORLD_DEFAULT_OUT_DIR;
  const files = await writeRealWorldFiles(outDir, { big });
  const width = Math.max(...files.map((f) => f.name.length));
  for (const f of files) {
    console.log(`${f.name.padEnd(width)}  ${grouped(f.bytes).padStart(12)} bytes  ${grouped(f.aggregate.records).padStart(9)} records`);
  }
  console.log(`manifest: ${writeManifest(outDir, files, big)} · ${files.length} files${big ? "" : " (add --big for the five big ones)"}`);
}

// ⛔ Compared as URLs, never by glueing a path onto "file://" (ops-updown-profile.mts: that never matched on Windows).
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    await main();
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  }
}
