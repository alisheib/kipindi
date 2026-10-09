/**
 * test:contacts-import · section "xlsx" — U27b: the server's XLSX reader (`src/lib/server/contacts/import-xlsx.ts`)
 * and its officer wrapper (`import-xlsx-run.ts`).                                              (S10, 2026-10-02)
 *
 * ⭐ EXECUTED, NOT READ. Every behaviour runs through the real reader, on workbooks BUILT HERE IN MEMORY: the readable
 * ones with exceljs's own `writeBuffer()` (the library the reader loads with, so a written cell reads back the way
 * Excel's would), the hostile ones zip byte by zip byte with `node:zlib` — a bomb, the same bomb with a forged size,
 * zip64, an encrypted entry, .xlsb, an OpenDocument zip, Strict Open XML, a broken sheet, the parity cases. No
 * fixture touches the disk. The SOURCE is read only for what only the source can show: what the two modules import
 * (§X27), that the reader names no shortened-number detector (§X25), and that no src file but xlsx-limits.ts
 * defines one (§X26, over `srcFiles()` — the repo's one src walker).
 *
 * ⭐ THE PLAN'S SENTENCES, ASSERTED (§9 U27 and DECISIONS-U21-U28): the exact size gate and its Accept (A1.4 — §X1);
 * the zip pre-pass before exceljs loads — zip64, encryption, .xlsb, .ods, Strict, a bomb, a forged size, the caps,
 * parity (§X4–§X11); one typed cell switch — integers exact, float noise rounded, decimals kept, a Date as ISO, a
 * formula as its cached result (§X14–§X19); Excel's numeric shortened form and its Accept (A1.3 — §X13); C15's
 * shape with format xlsx (§X20); 1-based sheet rows (§X21); a VISIBLE sheet (§X22) — since C3b-fix · D6 the one whose
 * first rows hold the most mobile numbers (`chooseSheet`), said in a note counting the visible sheets only, never a hidden
 * one (§X32, its control and D8's flag §X33), and D7's title above the column names left out (§X34); the measured caps
 * (§X24); M6 — the reader flags nothing and the detector exists once (§X25, §X26); server-only and in memory (§X27);
 * one read in flight and a counts-only audit row (§X28, §X29); §5.14 (§X30); and the ONE remedy clause on every
 * refusal that sends the officer to CSV (A1.6 — §X31).
 *
 * ⭐ PROVED BY MUTATION. Every label is named by at least one red plant. A plant is ONE rule swapped in
 * `buildXlsxReader` (the walk itself unchanged — the faithful defect), an inspection that waves one class of zip
 * through to exceljs, an output map (a shape defect), a swapped source or tree, the officer's wiring, or a cap. The
 * runner requires each plant's OWN label among the reds.
 *
 * ⚠️ THE LARGE FIXTURES ARE MEASURED ONCE. The realistic and densest ~690 KB workbooks (§X24) are written, read through
 * the SHIPPED reader and measured once per process — the measurement is a property of the shipped caps, which is
 * what §X24 holds; its plant swaps the caps. Every other fixture is built once and READ by every plant's reader.
 * ⚠️ A PLANT THAT WAVES A HOSTILE FILE THROUGH TO EXCELJS STUBS THAT ONE LOAD: the proof is that the load was REACHED
 * (the spy counts it), and letting exceljs build a million cells or inflate 48 MiB again on the machine running the
 * proof would prove nothing more. Every other file in that plant's run loads for real.
 *
 * ⛔ IN-PROCESS. Every plant is a bundle built in memory; this module reads files and makes no file-changing call.
 * ⛔ Every control character and every backslash a planted source needs is built from its code — the editing tools
 * decode escape text into raw characters.
 */
import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { crc32, deflateRawSync, inflateRawSync } from "node:zlib";
import ExcelJS from "exceljs";
import { decomment } from "../lib/decomment.mts";
import { REPO_ROOT, srcFiles } from "../lib/tracked-files.mts";
import type { ImportSection, RedPlant, SectionContext } from "../contacts-import.test.mts";
import {
  XLSX_MAX_CELL_ELEMENTS,
  XLSX_MAX_GRID_CELLS,
  XLSX_READER_RULES,
  buildXlsxReader,
  inspectXlsxZip,
  measureZipEntry,
  readXlsxContacts,
  xlsxCellText,
  xlsxNumberText,
  type NumberText,
  type XlsxInspection,
  type XlsxReadInput,
  type XlsxReadResult,
  type XlsxReaderRules,
} from "../../src/lib/server/contacts/import-xlsx.ts";
import {
  OFFICER_XLSX_DEPS,
  XLSX_AUDIT_TARGET_ID,
  XLSX_AUDIT_TARGET_TYPE,
  XLSX_READ_ACTION,
  XLSX_REFUSED_ACTION,
  createOfficerXlsxReader,
  readXlsxForOfficer,
} from "../../src/lib/server/contacts/import-xlsx-run.ts";
import { audit, getAuditForTarget } from "../../src/lib/server/audit.ts";
import {
  ODS_MIMETYPE,
  PHONE_FORMAT_REMEDY,
  WRONG_FORMAT_KINDS,
  XLSX_MAX_BASE64_CHARS,
  XLSX_MAX_BYTES,
  XLSX_MAX_INFLATED_BYTES,
  XLSX_MAX_MERGES,
  XLSX_MAX_ROWS,
  XLSX_REFUSALS,
  excelShortenedSentence,
  formatFileSize,
  looksExcelShortened,
  xlsxRefusalSentence,
  type WrongFormatKind,
  type XlsxRefusal,
} from "../../src/lib/contacts/xlsx-limits.ts";
import { isParsedContactsFile } from "../../src/lib/contacts/parsed-file.ts";
import { chooseSheet, mobileCellsIn } from "../../src/lib/contacts/sheet-choice.ts";
import { dropTitleRows } from "../../src/lib/contacts/title-rows.ts";
import { autoMapFile, draftContactRow } from "../../src/lib/contacts/contact-fields.ts";
import { firstLines } from "../../src/lib/contacts/import-decide.ts";
import { parseTzNumber } from "../../src/lib/tz-msisdn.ts";

/* ⛔ Every control character and the backslash from its code — the editing tools decode escape text. */
const LF = String.fromCharCode(10);
const CRLF = String.fromCharCode(13, 10);
const BACKSLASH = String.fromCharCode(92);

const READER_PATH = "src/lib/server/contacts/import-xlsx.ts";
const RUN_PATH = "src/lib/server/contacts/import-xlsx-run.ts";
const LIMITS_PATH = "src/lib/contacts/xlsx-limits.ts";
/** A file name that is itself a phone number: it may come back in the parsed file, and must never reach the audit row. */
const FILE_NAME = "kitabu-255712345678.xlsx";
const ACTOR_A = "usr_u27b_officer_a";
const ACTOR_B = "usr_u27b_officer_b";
/** Excel's last column, XFD, and its last row — the grid a merge ref cannot exceed. */
const LAST_COLUMN = 16384;
const EXCEL_LAST_ROW = 1048576;
/** The 40-row fixture: a header and forty contacts. */
const FORTY_ROWS = 41;

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const message = (e: unknown): string => (e instanceof Error ? e.message : String(e));
/** A source as the guards read it: comments stripped, CRLF normalised (core.autocrlf=true). */
const tidy = (raw: string): string => decomment(raw).split(CRLF).join(LF);
const readSource = (rel: string): string => tidy(readFileSync(join(REPO_ROOT, rel), "utf8"));
/** A run of seven or more digits once the characters a phone number is written with are taken out (§5.14). */
const digitRun = (s: string): boolean => /\d{7,}/.test(s.replace(/[\s\-.()+\/]/g, ""));
const base64Of = (bytes: Uint8Array): string => Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("base64");
const utf8 = (s: string): Buffer => Buffer.from(s, "utf8");

/* ══ THE BUNDLE UNDER TEST ══════════════════════════════════════════════════════════════════════ */

type Spy = { decode: number; load: number };
type Reader = (input: XlsxReadInput) => Promise<XlsxReadResult>;
type Officer = (actorId: string, input: XlsxReadInput) => Promise<XlsxReadResult>;
type Source = { readonly path: string; readonly text: string };
type Refused = Extract<XlsxReadResult, { ok: false }>;

/** One large fixture, measured once through the SHIPPED reader. */
type Measured = {
  readonly name: string;
  readonly bytes: number;
  readonly expected: number;
  readonly rows: number;
  readonly rowElements: number;
  readonly cellElements: number;
  readonly inflated: number;
  readonly ms: number;
  readonly heap: number;
  readonly refusal: string | null;
};

export type XlsxImpl = {
  /** A reader, its decode and load counted by `spy` when one is passed. */
  readonly make: (spy?: Spy) => Reader;
  /** The zip pre-pass alone — §X9's exact-cap case, which must not cost a 200,000-row exceljs load per plant. */
  readonly inspect: (bytes: Uint8Array) => XlsxInspection;
  readonly officer: Officer;
  readonly caps: { readonly inflatedBytes: number; readonly rows: number; readonly cells: number };
  readonly measure: () => Promise<readonly Measured[]>;
  /** The two modules as the guards read them. */
  readonly sources: { readonly reader: string; readonly run: string };
  /** Every src file whose raw text names the detector or holds a backslash-plus, decommented — §X26's population. */
  readonly srcScan: { readonly files: readonly Source[]; readonly scanned: number };
};

/** The rules with their decode and load counted. */
const spied = (rules: XlsxReaderRules, spy?: Spy): XlsxReaderRules =>
  spy === undefined
    ? rules
    : {
        ...rules,
        decode: (field) => {
          spy.decode++;
          return rules.decode(field);
        },
        load: (bytes) => {
          spy.load++;
          return rules.load(bytes);
        },
      };

/** Cheap filter before a src file is decommented and scanned for a second detector. */
const MENTIONS_DETECTOR = /looksExcelShortened|EXCEL_SHORTENED|\\\+/;

let cached: XlsxImpl | null = null;

/** The SHIPPED bundle: the module's own rules and wiring, the real sources and tree. Built once. */
function real(): XlsxImpl {
  if (cached) return cached;
  const paths = srcFiles();
  const files: Source[] = [];
  for (const path of paths) {
    const raw = readFileSync(join(REPO_ROOT, path), "utf8");
    if (MENTIONS_DETECTOR.test(raw)) files.push({ path, text: tidy(raw) });
  }
  cached = {
    make: (spy) => buildXlsxReader(spied(XLSX_READER_RULES, spy)),
    inspect: (bytes) => inspectXlsxZip(bytes, measureZipEntry),
    officer: readXlsxForOfficer,
    caps: { inflatedBytes: XLSX_MAX_INFLATED_BYTES, rows: XLSX_MAX_ROWS, cells: XLSX_MAX_CELL_ELEMENTS },
    measure: measureLarge,
    sources: { reader: readSource(READER_PATH), run: readSource(RUN_PATH) },
    srcScan: { files, scanned: paths.length },
  };
  return cached;
}

/* ══ ZIPS, BYTE BY BYTE ═════════════════════════════════════════════════════════════════════════ */

/** One entry: its stored bytes, its method, and the size and CRC its headers DECLARE (a plant overrides one). */
type Part = {
  readonly name: string;
  readonly data: Uint8Array;
  readonly method: number;
  readonly size: number;
  readonly crc: number;
  readonly flags?: number;
  /** The local header names a different file (the parity case). */
  readonly localName?: string;
};

function partOf(name: string, content: string | Buffer, method: 0 | 8 = 8): Part {
  const raw = typeof content === "string" ? utf8(content) : content;
  return { name, data: method === 8 ? deflateRawSync(raw) : raw, method, size: raw.length, crc: crc32(raw) };
}

type ZipOptions = { readonly maxedCounts?: boolean; readonly zip64Locator?: boolean; readonly trailing?: number };

/** A zip: local headers and data, the central directory, (a zip64 locator), the end record, (trailing bytes). */
function zipOf(parts: readonly Part[], opts: ZipOptions = {}): Buffer {
  const out: Buffer[] = [];
  const directory: Buffer[] = [];
  let offset = 0;
  for (const p of parts) {
    const name = utf8(p.name);
    const localName = utf8(p.localName ?? p.name);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(p.flags ?? 0, 6);
    local.writeUInt16LE(p.method, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0x21, 12);
    local.writeUInt32LE(p.crc >>> 0, 14);
    local.writeUInt32LE(p.data.length, 18);
    local.writeUInt32LE(p.size, 22);
    local.writeUInt16LE(localName.length, 26);
    local.writeUInt16LE(0, 28);
    out.push(local, localName, Buffer.from(p.data));
    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(p.flags ?? 0, 8);
    entry.writeUInt16LE(p.method, 10);
    entry.writeUInt16LE(0, 12);
    entry.writeUInt16LE(0x21, 14);
    entry.writeUInt32LE(p.crc >>> 0, 16);
    entry.writeUInt32LE(p.data.length, 20);
    entry.writeUInt32LE(p.size, 24);
    entry.writeUInt16LE(name.length, 28);
    entry.writeUInt32LE(offset, 42);
    directory.push(entry, name);
    offset += 30 + localName.length + p.data.length;
  }
  const dir = Buffer.concat(directory);
  const tail: Buffer[] = [];
  if (opts.zip64Locator) {
    const locator = Buffer.alloc(20);
    locator.writeUInt32LE(0x07064b50, 0);
    locator.writeBigUInt64LE(BigInt(offset + dir.length), 8);
    locator.writeUInt32LE(1, 16);
    tail.push(locator);
  }
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  const count = opts.maxedCounts ? 0xffff : parts.length;
  end.writeUInt16LE(count, 8);
  end.writeUInt16LE(count, 10);
  end.writeUInt32LE(dir.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...out, dir, ...tail, end, Buffer.alloc(opts.trailing ?? 0, 0x58)]);
}

const TRANSITIONAL = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const TRANSITIONAL_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const STRICT = "http://purl.oclc.org/ooxml/spreadsheetml/main";
const STRICT_R = "http://purl.oclc.org/ooxml/officeDocument/relationships";
const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const CONTENT_TYPES = `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`;
const ROOT_RELS = `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
const WORKBOOK_RELS = `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`;
const workbookXml = (ns: string, rel: string): string =>
  `${XML_HEAD}<workbook xmlns="${ns}" xmlns:r="${rel}"><sheets><sheet name="Contacts" sheetId="1" r:id="rId1"/></sheets></workbook>`;
const sheetXml = (rows: string): string => `${XML_HEAD}<worksheet xmlns="${TRANSITIONAL}"><sheetData>${rows}</sheetData></worksheet>`;
/** ⛔ A close tag that matches no open element — exceljs's SAX parser fails on it mid-write. It holds a phone number. */
const BROKEN_SHEET = `${XML_HEAD}<worksheet xmlns="${TRANSITIONAL}"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>255712345678</t></is></c></row></sheetData></sheetdata></worksheet>`;
const ODS_MANIFEST = `${XML_HEAD}<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2"/>`;
const ODS_CONTENT = `${XML_HEAD}<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"/>`;
const DOCX_BODY = `${XML_HEAD}<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>`;

/** A minimal workbook around `sheet`, its parts in the order Excel writes them. */
function workbookParts(sheet: Part, ns: string = TRANSITIONAL, rel: string = TRANSITIONAL_R): Part[] {
  return [
    partOf("[Content_Types].xml", CONTENT_TYPES),
    partOf("_rels/.rels", ROOT_RELS),
    partOf("xl/workbook.xml", workbookXml(ns, rel)),
    partOf("xl/_rels/workbook.xml.rels", WORKBOOK_RELS),
    sheet,
  ];
}

/** A zip whose FIRST local entry is `name` holding `data`, stored — an OpenDocument head, as the classifier sees one. */
function zipHead(name: string, data: string): Buffer {
  const n = Array.from(name, (ch) => ch.charCodeAt(0));
  const d = Array.from(data, (ch) => ch.charCodeAt(0));
  const lo = d.length & 255;
  const hi = (d.length >> 8) & 255;
  const header = [0x50, 0x4b, 0x03, 0x04, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, lo, hi, 0, 0, lo, hi, 0, 0, n.length, 0, 0, 0];
  return Buffer.from([...header, ...n, ...d]);
}

const CFB_HEAD = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const utf16le = (s: string): number[] => Array.from(s).flatMap((ch) => [ch.charCodeAt(0), 0]);

/* ══ WORKBOOKS, WRITTEN BY EXCELJS ══════════════════════════════════════════════════════════════ */

async function workbookBytes(build: (wb: ExcelJS.Workbook) => void): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  build(wb);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

/** A seeded generator, so every fixture is the same on every run. */
const lcg = (seed: number): (() => number) => {
  let x = seed >>> 0;
  return () => (x = (Math.imul(x, 1664525) + 1013904223) >>> 0);
};

const NDCS = [61, 62, 65, 67, 68, 69, 71, 73, 74, 75, 76, 77, 78] as const;
/** A realistic numeric phone, 2557XXXXXXXX or 2556XXXXXXXX — a NUMBER, the shape that carries Excel's hazard. */
const phoneOf = (next: () => number): number =>
  255_000_000_000 + NDCS[(next() >>> 8) % NDCS.length] * 10_000_000 + ((next() >>> 4) % 10_000_000);

const NOISE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
/** Text that deflate cannot shrink much (six bits a character), so a workbook's size can be steered. */
function noise(length: number, seed: number): string {
  const next = lcg(seed);
  const out = new Array<string>(length);
  for (let i = 0; i < length; i++) out[i] = NOISE_ALPHABET[next() >>> 26];
  return out.join("");
}

/** The writer's zip with an end-record comment of `pad` spaces — the one way to reach an exact size untouched. */
function withComment(zip: Buffer, pad: number): Buffer {
  const at = zip.length - 22;
  if (zip.readUInt32LE(at) !== 0x06054b50 || zip.readUInt16LE(at + 20) !== 0) {
    throw new Error("the writer's zip does not end in a bare end record, so it cannot be padded to an exact size");
  }
  const out = Buffer.concat([zip, Buffer.alloc(pad, 0x20)]);
  out.writeUInt16LE(pad, at + 20);
  return out;
}

/** ⭐ EXACTLY 716,800 bytes, readable: a contact sheet with long notes, padded to the byte by its end-record comment. */
async function exactCapFixture(): Promise<{ readonly field: string; readonly rows: number }> {
  let notes = 30;
  for (let attempt = 0; attempt < 6; attempt++) {
    const count = notes;
    const zip = await workbookBytes((wb) => {
      const ws = wb.addWorksheet("Contacts");
      ws.addRow(["Name", "Phone", "Notes"]);
      ws.addRow(["Asha", 255712345601, "vip"]);
      ws.addRow(["Baraka", 255754345602, "customer"]);
      ws.addRow(["Neema", 255678345603, "dodoma"]);
      for (let i = 0; i < count; i++) ws.addRow(["Mteja", 255712345700 + i, noise(30_000, 7919 + i)]);
    });
    const pad = XLSX_MAX_BYTES - zip.length;
    if (pad >= 0 && pad <= 0xffff) return { field: base64Of(withComment(zip, pad)), rows: 4 + count };
    notes = Math.max(1, Math.round((count * (XLSX_MAX_BYTES - 30_000)) / zip.length));
  }
  throw new Error("the exact-cap fixture could not be sized to 716,800 bytes");
}

const DENSE_TARGET = 690 * 1024;
const DENSE_FLOOR = 670 * 1024;

/** A workbook of `n` data rows built by `build`, steered into 670–700 KB. */
async function sizedWorkbook(build: (n: number) => (wb: ExcelJS.Workbook) => void, firstGuess: number): Promise<{ readonly bytes: Buffer; readonly rows: number }> {
  let n = firstGuess;
  for (let attempt = 0; attempt < 6; attempt++) {
    const bytes = await workbookBytes(build(n));
    if (bytes.length >= DENSE_FLOOR && bytes.length <= XLSX_MAX_BYTES) return { bytes, rows: n + 1 };
    n = Math.max(100, Math.round((n * DENSE_TARGET) / bytes.length));
  }
  throw new Error("a ~690 KB fixture could not be sized inside 670-700 KB");
}

/** The densest realistic sheet: one column of numeric phones under a header. */
const densestSheet = (n: number) => (wb: ExcelJS.Workbook): void => {
  const ws = wb.addWorksheet("Contacts");
  ws.addRow(["Phone"]);
  const next = lcg(20261002);
  for (let i = 0; i < n; i++) ws.addRow([phoneOf(next)]);
};

const TAG_CELLS = ["vip", "dar es salaam", "arusha", "customer", "dodoma"] as const;
/** A realistic contact sheet: a name, a numeric phone and a tag on every row. */
const realisticSheet = (n: number) => (wb: ExcelJS.Workbook): void => {
  const ws = wb.addWorksheet("Contacts");
  ws.addRow(["Name", "Phone", "Tags"]);
  const next = lcg(1002);
  for (let i = 0; i < n; i++) ws.addRow([`Mteja ${String(i + 1).padStart(6, "0")}`, phoneOf(next), TAG_CELLS[next() % TAG_CELLS.length]]);
};

let measuredOnce: Promise<readonly Measured[]> | null = null;

/** ⭐ §3's numbers: each large fixture read once through the SHIPPED reader, its size, inflation, rows, time, heap. */
function measureLarge(): Promise<readonly Measured[]> {
  measuredOnce ??= (async () => {
    const out: Measured[] = [];
    const large: ReadonlyArray<readonly [string, (n: number) => (wb: ExcelJS.Workbook) => void, number]> = [
      ["densest (one column of numeric phones)", densestSheet, 50_000],
      ["realistic (name, numeric phone, tag)", realisticSheet, 30_000],
    ];
    for (const [name, build, guess] of large) {
      const fixture = await sizedWorkbook(build, guess);
      const inspected = inspectXlsxZip(fixture.bytes, measureZipEntry);
      const heapBefore = process.memoryUsage().heapUsed;
      const t0 = Date.now();
      const r = await readXlsxContacts({ base64: base64Of(fixture.bytes), fileName: null });
      const ms = Date.now() - t0;
      out.push({
        name,
        bytes: fixture.bytes.length,
        expected: fixture.rows,
        rows: r.ok ? r.file.rows.length : -1,
        rowElements: inspected.ok ? inspected.rowElements : -1,
        cellElements: inspected.ok ? inspected.cellElements : -1,
        inflated: r.stats.inflatedBytes,
        ms,
        heap: process.memoryUsage().heapUsed - heapBefore,
        refusal: r.ok ? null : r.refusal,
      });
    }
    return out;
  })();
  return measuredOnce;
}

/* ══ THE FIXTURES — built once, read by every plant ═════════════════════════════════════════════ */

type Fixtures = {
  readonly cells: string;
  readonly a13: string;
  readonly lines: string;
  readonly sheets: string;
  /** C3b · G2 · a cover page, a HIDDEN sheet with a phone column, the contacts, and a later sheet with a phone column. */
  readonly coverFirst: string;
  /** C3b · G2 · a cover page, then the contacts on a sheet whose NAME is a phone number. */
  readonly coverDigits: string;
  /** C3b · G2 · a cover page and a sheet with no phone column either: the first visible sheet is read, as before. */
  readonly noPhoneSheet: string;
  /** C3b-fix · D6 + D7 · a small staff sheet first, then the customers under a title row (and a blank row). */
  readonly staffThenTitled: string;
  /** C3b-fix · D6 · two sheets holding as many mobiles as each other. */
  readonly twoPhoneSheets: string;
  /** C3b-fix · D6 · a sheet whose header names a Phone column and holds nothing under it, before the data. */
  readonly headerOnlyFirst: string;
  readonly allHidden: string;
  readonly empty: string;
  readonly forty: string;
  readonly wide: string;
  readonly rowPast: string;
  readonly exact: { readonly field: string; readonly rows: number };
  readonly xls: string;
  readonly protectedCfb: string;
  readonly odsHead: string;
  readonly text: string;
  readonly zip64Maxed: string;
  readonly zip64Locator: string;
  readonly encrypted: string;
  readonly xlsb: string;
  readonly odsLate: string;
  readonly strict: string;
  readonly docx: string;
  readonly bomb: string;
  readonly forged: string;
  readonly rowsOver: string;
  readonly rowsAt: Buffer;
  readonly cellsOver: string;
  readonly cellsAt: Buffer;
  readonly method12: string;
  readonly duplicate: string;
  readonly nameMismatch: string;
  readonly unresolvedName: string;
  readonly folderWithData: string;
  readonly trailing: string;
  readonly sizeMismatch: string;
  readonly broken: string;
  /** C3c-merge-guard · the integrator's own example: a few-KB workbook with one vast `<mergeCell ref="A1:XFD1048576"/>`. */
  readonly mergeBomb: string;
  /** A single merge of exactly XLSX_MAX_CELL_ELEMENTS covered cells (inspected — the pre-pass passes), and one cell more (read — refused). */
  readonly mergeAreaAt: Buffer;
  readonly mergeAreaOver: string;
  /** Exactly XLSX_MAX_MERGES tiny disjoint merges (inspected — the pre-pass passes), and one more (read — refused). */
  readonly mergeCountAt: Buffer;
  readonly mergeCountOver: string;
};

async function buildFixtures(): Promise<Fixtures> {
  /** Every cell type the switch handles, one row per behaviour; row 4 is left blank. */
  const cells = await workbookBytes((wb) => {
    const ws = wb.addWorksheet("Contacts");
    ws.getCell("A1").value = "Name";
    ws.getCell("B1").value = "Phone";
    ws.getCell("C1").value = "Note";
    ws.getCell("A2").value = "Asha";
    ws.getCell("B2").value = 255712345678;
    ws.getCell("C2").value = "plain";
    ws.getCell("A3").value = "Baraka";
    ws.getCell("B3").value = 712345678;
    ws.getCell("C3").value = 3.5;
    ws.getCell("A5").value = "Neema";
    ws.getCell("B5").value = 712345678.0000001;
    ws.getCell("C5").value = 1234.5;
    ws.getCell("A6").value = "Juma";
    ws.getCell("B6").value = 255713000000;
    ws.getCell("C6").value = "2.55713E+11";
    ws.getCell("A7").value = "Date";
    ws.getCell("B7").value = new Date(Date.UTC(2026, 9, 1));
    ws.getCell("C7").value = new Date(Date.UTC(2026, 9, 1, 14, 30));
    ws.getCell("A8").value = "Formula";
    ws.getCell("B8").value = { formula: "B2", result: 255712345678 };
    ws.getCell("C8").value = { formula: "B2*0", result: 0 };
    ws.getCell("A9").value = "NoValue";
    ws.getCell("B9").value = { formula: "B2+1" };
    ws.getCell("C9").value = { formula: "C2", result: "plain" };
    ws.getCell("A10").value = { richText: [{ text: "Asha" }, { text: "-", font: { bold: true } }, { text: "Mwakalinga" }] };
    ws.getCell("B10").value = { text: "Link", hyperlink: "https://example.com/contact" };
    ws.getCell("C10").value = true;
    ws.getCell("A11").value = "Errors";
    ws.getCell("B11").value = { error: "#N/A" };
    ws.getCell("C11").value = false;
    ws.getCell("A12").value = "Merge";
    ws.mergeCells("B12:C12");
    ws.getCell("B12").value = "Merged";
    ws.getCell("A13").value = "Ints";
    ws.getCell("B13").value = 0;
    ws.getCell("C13").value = -5;
    ws.getCell("D13").value = 0.1 + 0.2;
  });
  /** A1.3: a numeric 255713000000, the text 2.55713E+11, and a clean number. */
  const a13 = await workbookBytes((wb) => {
    const ws = wb.addWorksheet("Contacts");
    ws.addRow(["Name", "Phone"]);
    ws.addRow(["Juma", 255713000000]);
    ws.addRow(["Neema", "2.55713E+11"]);
    ws.addRow(["Asha", 255712345678]);
  });
  /** Data from row 3, row 5 blank. */
  const lines = await workbookBytes((wb) => {
    const ws = wb.addWorksheet("Contacts");
    ws.getCell("A3").value = "Name";
    ws.getCell("B3").value = "Phone";
    ws.getCell("A4").value = "Asha";
    ws.getCell("B4").value = 712345678;
    ws.getCell("A6").value = "Baraka";
    ws.getCell("B6").value = 754345678;
  });
  /** A hidden and a very hidden sheet before the first visible one, and a visible one after it. */
  const sheets = await workbookBytes((wb) => {
    const hidden = wb.addWorksheet("Hidden", { state: "hidden" });
    hidden.getCell("A1").value = "Siri";
    hidden.getCell("B1").value = 255700000001;
    wb.addWorksheet("Secret", { state: "veryHidden" }).getCell("A1").value = "Siri";
    const contacts = wb.addWorksheet("Contacts");
    contacts.getCell("A1").value = "Name";
    contacts.getCell("B1").value = "Phone";
    contacts.getCell("A2").value = "Asha";
    contacts.getCell("B2").value = 712345678;
    wb.addWorksheet("Later").getCell("A1").value = "Baadaye";
  });
  /** C3b · G2 · the cover page first; a hidden sheet WITH a phone column before the contacts (never read); the contacts on
   *  sheet 3 of 4; a later visible sheet with a phone column too (passed over: the FIRST one with a phone column wins). */
  const coverFirst = await workbookBytes((wb) => {
    const cover = wb.addWorksheet("Jalada");
    cover.getCell("A1").value = "Orodha ya wateja";
    cover.getCell("A3").value = "Imeandaliwa na ofisi ya masoko";
    const hidden = wb.addWorksheet("Hesabu", { state: "hidden" });
    hidden.addRow(["Phone", "Name"]);
    hidden.addRow(["0757 300 041", "Kificho"]);
    const contacts = wb.addWorksheet("Wateja");
    contacts.addRow(["Jina", "Simu"]);
    contacts.addRow(["Amani", "0757 300 042"]);
    contacts.addRow(["Bahati", "0757 300 043"]);
    const later = wb.addWorksheet("Mengine");
    later.addRow(["Name", "Phone"]);
    later.addRow(["Chiku", "0757 300 044"]);
  });
  /** C3b · G2 · the contacts' sheet is named for a phone number: the note says its place, never its name. */
  const coverDigits = await workbookBytes((wb) => {
    wb.addWorksheet("Jalada").getCell("A1").value = "Orodha ya wateja";
    const contacts = wb.addWorksheet("0757 300 045");
    contacts.addRow(["Jina", "Simu"]);
    contacts.addRow(["Amani", "0757 300 046"]);
  });
  /** C3b · G2 · no visible sheet has a phone column: the first visible one is read, with the note it always had. */
  const noPhoneSheet = await workbookBytes((wb) => {
    const cover = wb.addWorksheet("Jalada");
    cover.getCell("A1").value = "Orodha ya wateja";
    cover.getCell("A3").value = "Imeandaliwa na ofisi ya masoko";
    const data = wb.addWorksheet("Data");
    data.addRow(["Jina", "Mahali"]);
    data.addRow(["Amani", "Arusha"]);
  });
  /** C3b-fix · D6 + D7 · three staff with their mobiles on the first sheet; the customers on the second, under a title in
   *  row 1 and a blank row 2 — their column names on row 3, ten customers below. */
  const staffThenTitled = await workbookBytes((wb) => {
    const staff = wb.addWorksheet("Staff");
    staff.addRow(["Jina", "Simu", "Cheo"]);
    for (let i = 1; i <= 3; i++) staff.addRow([`Mfanyakazi ${i}`, `0757 300 0${50 + i}`, "Mhasibu"]);
    const customers = wb.addWorksheet("Wateja");
    customers.getCell("A1").value = "Orodha ya wateja wa Oktoba";
    customers.getCell("A3").value = "Jina";
    customers.getCell("B3").value = "Simu";
    for (let i = 1; i <= 10; i++) {
      customers.getCell(3 + i, 1).value = `Mnunuzi ${i}`;
      customers.getCell(3 + i, 2).value = `0757 300 ${String(60 + i).padStart(3, "0")}`;
    }
  });
  /** C3b-fix · D6 · two sheets of five mobiles each — the earlier one is read, the later named with both ways. */
  const twoPhoneSheets = await workbookBytes((wb) => {
    for (const [name, from] of [["Mauzo", 71], ["Mengine", 81]] as const) {
      const ws = wb.addWorksheet(name);
      ws.addRow(["Jina", "Simu"]);
      for (let i = 0; i < 5; i++) ws.addRow([`Mnunuzi ${from + i}`, `0757 300 0${from + i}`]);
    }
  });
  /** C3b-fix · D6 · a header naming Phone with nothing under it (C3b's header rule read it), then the data. */
  const headerOnlyFirst = await workbookBytes((wb) => {
    wb.addWorksheet("Contacts").addRow(["Phone", "Name", "Email"]);
    const data = wb.addWorksheet("Data");
    data.addRow(["Name", "Phone"]);
    for (let i = 1; i <= 4; i++) data.addRow([`Mnunuzi ${90 + i}`, `0757 300 0${90 + i}`]);
  });
  const allHidden = await workbookBytes((wb) => {
    wb.addWorksheet("One", { state: "hidden" }).getCell("A1").value = "Siri";
    wb.addWorksheet("Two", { state: "hidden" }).getCell("A1").value = "Siri";
  });
  /** A visible sheet whose only cell is a formula with no saved value — nothing to read. */
  const empty = await workbookBytes((wb) => {
    wb.addWorksheet("Contacts").getCell("A1").value = { formula: "1+1" };
  });
  const forty = await workbookBytes((wb) => {
    const ws = wb.addWorksheet("Contacts");
    ws.addRow(["Name", "Phone", "Tags"]);
    for (let i = 1; i <= 40; i++) ws.addRow([`Mteja ${String(i).padStart(2, "0")}`, 255712000100 + i, "vip"]);
  });
  /** One cell in the last column of every row — enough rows to pass the grid cap. */
  const wide = await workbookBytes((wb) => {
    const ws = wb.addWorksheet("Contacts");
    const rows = Math.ceil(XLSX_MAX_GRID_CELLS / LAST_COLUMN) + 1;
    for (let r = 1; r <= rows; r++) ws.getCell(r, LAST_COLUMN).value = "x";
  });
  /** A single value on sheet row XLSX_MAX_ROWS + 1. */
  const rowPast = await workbookBytes((wb) => {
    wb.addWorksheet("Contacts").getCell(XLSX_MAX_ROWS + 1, 1).value = "x";
  });

  const okSheet = partOf("xl/worksheets/sheet1.xml", sheetXml('<row r="1"><c r="A1" t="inlineStr"><is><t>Asha</t></is></c></row>'));
  // The bomb: 48 MiB + 1 KiB of spaces — deflate shrinks it a thousandfold, and a plant that inflates it whole finds
  // no element to count in it.
  const bombPart = partOf("xl/worksheets/sheet1.xml", Buffer.alloc(XLSX_MAX_INFLATED_BYTES + 1024, 0x20));
  const rowsBody = Array.from({ length: XLSX_MAX_ROWS }, (_, i) => `<row r="${i + 1}"/>`).join("");
  /** Styled empty cells with no address — exceljs makes a Cell object for each; deflate shrinks them a thousandfold. */
  const styledCells = (n: number): string => sheetXml(`<row r="1">${'<c s="1"/>'.repeat(n)}</row>`);
  /** C3c-merge-guard · a worksheet carrying `<mergeCells>` (after `<sheetData>`, where Excel writes it), no data of its own. */
  const mergeSheet = (refs: readonly string[]): string =>
    `${XML_HEAD}<worksheet xmlns="${TRANSITIONAL}"><sheetData/><mergeCells count="${refs.length}">`
    + `${refs.map((ref) => `<mergeCell ref="${ref}"/>`).join("")}</mergeCells></worksheet>`;
  const mergeBook = (refs: readonly string[]): Buffer => zipOf(workbookParts(partOf("xl/worksheets/sheet1.xml", mergeSheet(refs))));
  // Tiny disjoint merges (two cells each, three rows apart) — only their COUNT bites, never their area.
  const tinyMerges = (n: number): string[] => Array.from({ length: n }, (_, i) => `A${3 * i + 1}:A${3 * i + 2}`);

  return {
    cells: base64Of(cells),
    a13: base64Of(a13),
    lines: base64Of(lines),
    sheets: base64Of(sheets),
    coverFirst: base64Of(coverFirst),
    coverDigits: base64Of(coverDigits),
    noPhoneSheet: base64Of(noPhoneSheet),
    staffThenTitled: base64Of(staffThenTitled),
    twoPhoneSheets: base64Of(twoPhoneSheets),
    headerOnlyFirst: base64Of(headerOnlyFirst),
    allHidden: base64Of(allHidden),
    empty: base64Of(empty),
    forty: base64Of(forty),
    wide: base64Of(wide),
    rowPast: base64Of(rowPast),
    exact: await exactCapFixture(),
    xls: base64Of(Buffer.from([...CFB_HEAD, ...new Array<number>(504).fill(0), ...utf16le("Workbook")])),
    protectedCfb: base64Of(Buffer.from([...CFB_HEAD, ...new Array<number>(4096).fill(0), ...utf16le("EncryptionInfo")])),
    odsHead: base64Of(zipHead("mimetype", ODS_MIMETYPE)),
    text: base64Of(utf8(`Name,Phone${CRLF}Asha,0712345678${CRLF}`)),
    zip64Maxed: base64Of(zipOf(workbookParts(okSheet), { maxedCounts: true })),
    zip64Locator: base64Of(zipOf(workbookParts(okSheet), { zip64Locator: true })),
    encrypted: base64Of(zipOf(workbookParts(okSheet).map((p) => (p.name === "xl/workbook.xml" ? { ...p, flags: 1 } : p)))),
    xlsb: base64Of(zipOf([partOf("[Content_Types].xml", CONTENT_TYPES), partOf("xl/workbook.bin", Buffer.from([0x83, 0x01, 0x00]), 0)])),
    odsLate: base64Of(zipOf([partOf("META-INF/manifest.xml", ODS_MANIFEST), partOf("mimetype", ODS_MIMETYPE, 0), partOf("content.xml", ODS_CONTENT)])),
    strict: base64Of(zipOf(workbookParts(okSheet, STRICT, STRICT_R))),
    docx: base64Of(zipOf([partOf("[Content_Types].xml", CONTENT_TYPES), partOf("word/document.xml", DOCX_BODY)])),
    bomb: base64Of(zipOf(workbookParts(bombPart))),
    forged: base64Of(zipOf(workbookParts({ ...bombPart, size: 1024 }))),
    rowsOver: base64Of(zipOf(workbookParts(partOf("xl/worksheets/sheet1.xml", sheetXml(`${rowsBody}<row r="${XLSX_MAX_ROWS + 1}"/>`))))),
    rowsAt: zipOf(workbookParts(partOf("xl/worksheets/sheet1.xml", sheetXml(rowsBody)))),
    cellsOver: base64Of(zipOf(workbookParts(partOf("xl/worksheets/sheet1.xml", styledCells(XLSX_MAX_CELL_ELEMENTS + 1))))),
    cellsAt: zipOf(workbookParts(partOf("xl/worksheets/sheet1.xml", styledCells(XLSX_MAX_CELL_ELEMENTS)))),
    method12: base64Of(zipOf(workbookParts({ ...okSheet, method: 12 }))),
    duplicate: base64Of(zipOf([...workbookParts(okSheet), partOf("xl/workbook.xml", workbookXml(TRANSITIONAL, TRANSITIONAL_R))])),
    nameMismatch: base64Of(zipOf(workbookParts(okSheet).map((p) => (p.name === "xl/workbook.xml" ? { ...p, localName: "xl/workbook.bin" } : p)))),
    unresolvedName: base64Of(zipOf([...workbookParts(okSheet), partOf("xl/./workbook.xml", workbookXml(STRICT, STRICT_R))])),
    folderWithData: base64Of(zipOf([...workbookParts(okSheet), partOf("xl/stash/", "<x/>")])),
    trailing: base64Of(zipOf(workbookParts(okSheet), { trailing: 3 })),
    sizeMismatch: base64Of(zipOf(workbookParts({ ...okSheet, size: okSheet.size + 5 }))),
    broken: base64Of(zipOf(workbookParts(partOf("xl/worksheets/sheet1.xml", BROKEN_SHEET)))),
    mergeBomb: base64Of(mergeBook([`A1:XFD${EXCEL_LAST_ROW}`])),
    mergeAreaAt: mergeBook([`A1:A${XLSX_MAX_CELL_ELEMENTS}`]),
    mergeAreaOver: base64Of(mergeBook([`A1:A${XLSX_MAX_CELL_ELEMENTS + 1}`])),
    mergeCountAt: mergeBook(tinyMerges(XLSX_MAX_MERGES)),
    mergeCountOver: base64Of(mergeBook(tinyMerges(XLSX_MAX_MERGES + 1))),
  };
}

let fixturesOnce: Promise<Fixtures> | null = null;
const fixtures = (): Promise<Fixtures> => (fixturesOnce ??= buildFixtures());

/** C3c · the fixtures above, shared with the xlsx-browser section's differential (the browser's reader on the very same
 *  bytes) — built once per process, whichever section asks first. */
export type XlsxSectionFixtures = Fixtures;
export const xlsxSectionFixtures = (): Promise<XlsxSectionFixtures> => fixtures();

/* ══ THE LITERAL EXPECTATIONS ═══════════════════════════════════════════════════════════════════ */

/** The cell fixture, row by row — typed here as LITERALS, never computed by the code under test. */
const CELLS_ROWS: ReadonlyArray<{ readonly line: number; readonly cells: readonly string[] }> = [
  { line: 1, cells: ["Name", "Phone", "Note"] },
  { line: 2, cells: ["Asha", "255712345678", "plain"] },
  { line: 3, cells: ["Baraka", "712345678", "3.5"] },
  { line: 5, cells: ["Neema", "712345678", "1234.5"] },
  { line: 6, cells: ["Juma", "2.55713E+11", "2.55713E+11"] },
  { line: 7, cells: ["Date", "2026-10-01", "2026-10-01T14:30:00"] },
  { line: 8, cells: ["Formula", "255712345678", "0"] },
  { line: 9, cells: ["NoValue", "", "plain"] },
  { line: 10, cells: ["Asha-Mwakalinga", "Link", "TRUE"] },
  { line: 11, cells: ["Errors", "", "FALSE"] },
  { line: 12, cells: ["Merge", "Merged"] },
  { line: 13, cells: ["Ints", "0", "-5", "0.3"] },
];
const FORMULA_NOTE = "Row 9 has a formula whose saved value is empty or missing, so it was read as blank. If it should hold something, open the file in Excel, save it, and choose it again.";
const ERROR_NOTE = "Row 11 holds an error value (like #N/A), so it was read as blank.";
const MERGED_NOTE = "Row 12 has merged cells; only the first cell of each merge holds its value, so the others were read as blank.";
const CELLS_NOTES = [FORMULA_NOTE, ERROR_NOTE, MERGED_NOTE];
const SHEETS_ROWS = [
  { line: 1, cells: ["Name", "Phone"] },
  { line: 2, cells: ["Asha", "712345678"] },
];
/** C3b-fix · D6 — every sheet note and row set below is a LITERAL, decided by hand: the sheet read, its place among the
 *  VISIBLE sheets, the visible sheets with mobiles left unread and the way that works, the hidden ones counted. */
const SHEETS_NOTE = "Read the sheet “Contacts” (sheet 1 of 2). The workbook's 2 hidden sheets were not read.";
/** The cover-page workbook (Jalada, a hidden Hesabu, Wateja, Mengine): Wateja holds the most — sheet 2 of 3 VISIBLE. */
const COVER_ROWS = [
  { line: 1, cells: ["Jina", "Simu"] },
  { line: 2, cells: ["Amani", "0757 300 042"] },
  { line: 3, cells: ["Bahati", "0757 300 043"] },
];
const COVER_NOTE = "Read the sheet “Wateja” (sheet 2 of 3). The sheet “Mengine” also holds mobile numbers and was not read: to import it, save it as its own file. The workbook's hidden sheet was not read.";
const COVER_DIGITS_NOTE = "Read sheet 2 of 2.";
const NO_PHONE_ROWS = [{ line: 1, cells: ["Orodha ya wateja"] }, { line: 3, cells: ["Imeandaliwa na ofisi ya masoko"] }];
const NO_PHONE_NOTE = "Read the sheet “Jalada” (sheet 1 of 2).";
/** The staff sheet first, the titled customers second: the customers read, from their column names on row 3. */
const STAFF_NOTE = "Read the sheet “Wateja” (sheet 2 of 2). The sheet “Staff” also holds mobile numbers and was not read: to import it, save it as its own file.";
const TITLE_NOTE = "Row 1, above the column names, was not read — a title.";
const TITLED_LINES = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
const TWINS_NOTE = "Read the sheet “Mauzo” (sheet 1 of 2). The sheet “Mengine” holds as many mobile numbers and was not read: to import it, move it to the first place in Excel, or save it as its own file.";
const HEADER_ONLY_NOTE = "Read the sheet “Data” (sheet 2 of 2).";
/** Text the fixtures carry that no note and no refusal may ever repeat. */
const CELL_STRINGS = ["Asha", "Baraka", "Neema", "Mwakalinga", "Juma", "Siri", "Baadaye", "Mteja", "255712345678", "712345678", "kitabu"];

/* ══ THE SCANNERS (§X25–§X27) — the same functions run over the real sources and every plant ═══ */

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
/** C3c · `xlsx-cells.ts` joined the list: the cell rules and the notes moved there, shared with the browser's reader. */
const READER_IMPORTS = [
  "exceljs", "node:zlib", "@/lib/contacts/parsed-file", "@/lib/contacts/xlsx-limits", "@/lib/contacts/sheet-choice", "@/lib/contacts/title-rows",
  "@/lib/contacts/xlsx-cells",
];
const RUN_IMPORTS = ["@/lib/server/audit", "./import-xlsx", "@/lib/contacts/xlsx-limits"];
const DIRECTIVE = /^\s*["']use (?:client|server)["']/;
const NEVER_IN_READER = ["WorkbookReader", "stream.xlsx", "readFile", "console."];
/** A definition of the detector, under its own name or its pattern's. */
const DEFINES_DETECTOR = /\bfunction\s+looksExcelShortened\b|\b(?:const|let|var)\s+(?:looksExcelShortened|EXCEL_SHORTENED_TEXT)\b|\blooksExcelShortened\s*[:=](?!=)/;
/** The detector's core, under any name: an escaped plus after an E (or after a character class holding one). */
const SHORTENED_SHAPE = /(?:[Ee]|\[[^\]\n]*[Ee][^\]\n]*\])\\\+/;
/** What the reader may never say in a note: it flags nothing itself (M6). */
const SHORTENED_WORDS = /shorten|scientific|E\+\d/i;
const NAMES_A_DETECTOR = /\b(?:looksExcelShortened|excelShortenedSentence|EXCEL_SHORTENED_TEXT)\b/;

/* ══ THE ASSERTION LABELS — one place, so a plant names exactly the line it must turn red ═══════════ */

export const L = {
  X1: "X1 · ⭐ A1.4 ACCEPT — base64 for 700 KiB + 1 byte and + 2 bytes is refused too_large BEFORE ANY DECODE (the decode and load spies never called, the sentence naming the size, CSV and the remedy clause), junk too long to fit is too_large by its length alone, and exactly 716,800 bytes is decoded once, loaded once and read",
  X2: "X2 · the field: a data: URL prefix is read, and '@@@', '@@@@', a length that is not a multiple of 4, a line break and a data URL that is not base64 are not_base64 — none decoded, none loaded",
  X3: "X3 · C18's one classifier runs first: a legacy .xls, a password-protected workbook (EncryptionInfo past the first 4 KB), an OpenDocument head and plain text are each wrong_format with their own kind, never loaded",
  X4: "X4 · zip64 — maxed end-record fields, or a zip64 locator before the end record — is unreadable, never loaded",
  X5: "X5 · an encrypted zip entry (general-purpose bit 0) is wrong_format 'protected', never loaded",
  X6: "X6 · .xlsb (xl/workbook.bin), an OpenDocument zip whose mimetype entry is not first, Strict Open XML and a zip that is no workbook are each wrong_format with their own kind, never loaded",
  X7: "X7 · ⭐ a zip bomb — one entry inflating past XLSX_MAX_INFLATED_BYTES — is too_big_inflated by a real, capped inflate, never loaded",
  X8: "X8 · ⭐ the SAME bomb with a FORGED declared size of 1 KB is still too_big_inflated, never loaded: the cap is what an entry inflates to, never what its headers say",
  X9: "X9 · XLSX_MAX_ROWS + 1 row elements are too_many_rows before exceljs loads, exactly XLSX_MAX_ROWS pass the pre-pass with every one counted, and a value on sheet row XLSX_MAX_ROWS + 1 is too_many_rows after the load",
  X10: "X10 · the cells: XLSX_MAX_CELL_ELEMENTS + 1 styled empty cells are too_big_inflated before exceljs builds an object for each (exactly XLSX_MAX_CELL_ELEMENTS pass the pre-pass, every one counted), and a sheet whose cells reach past XLSX_MAX_GRID_CELLS (one in the last column of every row) is too_big_inflated before its grid is laid out",
  X11: "X11 · zip parity with exceljs's unzipper: an unknown method, a duplicate name, a local header naming another file, a name JSZip would resolve onto another, a folder holding data, bytes after the end record and a size its inflation does not match are each unreadable, never loaded",
  X12: "X12 · a workbook exceljs cannot parse (a malformed sheet holding a phone number) is unreadable with the FIXED sentence — never exceljs's own message — after exactly one load",
  X13: "X13 · ⭐ A1.3 ACCEPT — a NUMERIC 255713000000 reads as Excel's scientific text 2.55713E+11 and the TEXT 2.55713E+11 is kept verbatim, so U28's one detector drafts both rows invalid with the shortened-number sentence and neither claims a number (never a contact) while 255712345678 drafts clean — and the control: 255713000000 as digits would parse as a valid number",
  X14: "X14 · integers are exact — numeric 255712345678, 712345678, 0 and -5 read as their digits, and the two phones parse",
  X15: "X15 · float noise past Excel's 15 significant digits is rounded (712345678.0000001 → 712345678, 0.1 + 0.2 → 0.3) and genuine decimals are kept (3.5, 1234.5)",
  X16: "X16 · a Date reads as ISO — 2026-10-01, and 2026-10-01T14:30:00 with a time — never Date.toString()",
  X17: "X17 · a formula reads as its CACHED result — the digits, 0 for a result of 0, the text of a text result — and one with no saved value is blank with a note naming its row",
  X18: "X18 · rich text is joined, a hyperlink reads its display text, a boolean reads TRUE or FALSE, and an error value is blank with a note naming its row",
  X19: "X19 · a merged range keeps its value in its first cell only — the covered cell is blank, never the value repeated — with a note naming the row",
  X20: "X20 · ⭐ C15's shape — a valid ParsedContactsFile, format xlsx, the file name passed through, every row non-blank with its trailing empty cells trimmed, width the widest row — and the cell fixture reads to its literal rows, blank count and notes",
  X21: "X21 · ⭐ lines are the 1-based SHEET rows of the unfiltered grid: data from row 3 with row 5 blank reads lines 3, 4 and 6 with 3 blank rows counted — never renumbered",
  X22: "X22 · ⭐ C3b-fix · D6 — a VISIBLE sheet is read, chosen by what it holds: a hidden and a very hidden sheet before it (one holding a mobile) never read, the note naming the sheet read as sheet 1 of the 2 VISIBLE ones and counting the hidden — and a workbook whose every sheet is hidden is no_visible_sheet",
  X32: "X32 · ⭐ C3b-fix · D6 through the reader — the visible sheet holding the MOST mobiles is read: the customers after a small staff sheet (the staff sheet named, not read, with the way that works), the earlier of two sheets holding as many (the other named: move it first, or save it alone), the data after a sheet whose Phone header holds nothing (C3b's header rule read that one), the contacts after a cover page and a HIDDEN sheet never counted in \"sheet N of M\" (2 of 3), and a sheet named for a phone number never echoed (its place alone)",
  X33: "X33 · ⛔ CONTROL · D6 and ⭐ D8 — a one-sheet workbook reads with no sheet note; a workbook with no mobile on any visible sheet is read from its FIRST visible sheet, says so in its note, and the READ carries noMobileSheet (the columns step's hint is shown on it alone), while every read that found a sheet of mobiles carries it false",
  X34: "X34 · ⭐ C3b-fix · D7 through the reader — the customers' title (row 1, a blank row 2 under it) leaves the data: the rows begin at their column names on row 3 with the sheet's own line numbers, ONE note says \"Row 1, above the column names, was not read — a title.\" after the sheet note, the blank row stays counted, and the stats count the rows read",
  X23: "X23 · a visible sheet with nothing to read is refused empty with the sentence that names it",
  X24: "X24 · the 40-row fixture and the realistic and densest ~690 KB fixtures read to their EXACT row counts, and XLSX_MAX_INFLATED_BYTES, XLSX_MAX_ROWS and XLSX_MAX_CELL_ELEMENTS are each at least twice the densest measurement",
  X25: "X25 · ⛔ M6 — the reader flags nothing itself: no note speaks of a shortened number, and import-xlsx.ts names neither looksExcelShortened nor excelShortenedSentence",
  X26: "X26 · ⛔ ONE DETECTOR (M6, C18) — no src file but xlsx-limits.ts defines looksExcelShortened or holds a shortened-number pattern",
  X27: "X27 · ⛔ SERVER-ONLY AND IN MEMORY — import-xlsx.ts imports exactly exceljs, node:zlib, the two contacts foundations, (C3b-fix · D6, D7) the two shared reading rules, sheet-choice and title-rows, and (C3c) the shared cell rules of xlsx-cells.ts, loads with xlsx.load (no streaming reader, no file read, no console) and carries no directive; the officer wrapper imports no exceljs",
  X28: "X28 · ONE READ IN FLIGHT — of two concurrent officer reads exactly one is busy and never decoded, and the slot is free again after a read, a refusal and a reader that throws",
  X29: "X29 · ⛔ ONE AUDIT ROW PER ASK, COUNTS ONLY — every officer call, busy included, writes exactly one ContactImport row (xlsx_read or xlsx_refused) whose payload is counts and fixed words: no file name, no sheet name, no cell",
  X30: "X30 · ⛔ §5.14 — no note and no refusal holds a run of 7+ digits or any cell's text, though the fixtures are full of phone numbers",
  X31: "X31 · ⛔ A1.6 — every refusal that sends the officer to CSV carries PHONE_FORMAT_REMEDY (too_large, too_big_inflated, unreadable and wrong_format all observed) — and (C3b) too_many_rows sends no one to CSV, whose import takes no more rows: it says to split the list",
  X35: "X35 · ⛔ C3c-merge-guard · THE MERGE PRE-PASS — a few-KB workbook with one vast merge (A1:XFD1048576) is too_big_inflated (merge_area) and a flood of merge elements too_big_inflated (merges), each before exceljs loads a byte; a merge covering exactly XLSX_MAX_CELL_ELEMENTS cells and exactly XLSX_MAX_MERGES merge elements pass the pre-pass (and one more of each is refused); and an ordinary merge (the cell fixture's B12:C12) is counted — one merge, two cells — and read exactly as before",
} as const;

/* ══ THE ASSERTIONS ═════════════════════════════════════════════════════════════════════════════ */

const isRefused = (r: XlsxReadResult): r is Refused => !r.ok;
const refusedAs = (r: XlsxReadResult, refusal: XlsxRefusal, detail?: string, kind?: WrongFormatKind): boolean =>
  !r.ok && r.refusal === refusal && (detail === undefined || r.detail === detail) && (kind === undefined || r.kind === kind);
const brief = (r: XlsxReadResult): string =>
  r.ok
    ? `ok · ${r.file.rows.length} row(s) on lines ${r.file.rows.map((x) => x.line).slice(0, 8).join(",")}${r.file.rows.length > 8 ? "…" : ""}`
    : `${r.refusal}${r.kind ? `/${r.kind}` : ""} (${r.detail ?? "no detail"})`;

async function run(ctx: SectionContext<XlsxImpl>): Promise<void> {
  const { impl, ok, log } = ctx;
  // ⛔ The audit ring, never a database: a suite must not append to a real chain.
  delete process.env.DATABASE_URL;
  const fx = await fixtures();
  const seen: XlsxReadResult[] = [];
  const read = async (field: string, spy?: Spy, fileName: string | null = FILE_NAME): Promise<XlsxReadResult> => {
    const r = await impl.make(spy)({ base64: field, fileName });
    seen.push(r);
    return r;
  };
  /** Each case read with a fresh spy; a fault names the case. */
  const refusedCases = async (
    cases: ReadonlyArray<readonly [string, string, XlsxRefusal, string | undefined, WrongFormatKind | undefined]>,
    loads: number,
  ): Promise<string[]> => {
    const faults: string[] = [];
    for (const [what, field, refusal, detail, kind] of cases) {
      const spy: Spy = { decode: 0, load: 0 };
      const r = await read(field, spy);
      if (!refusedAs(r, refusal, detail, kind) || spy.load !== loads) faults.push(`${what} → ${brief(r)}, loaded ${spy.load}×`);
    }
    return faults;
  };

  // ── X1 · A1.4, THE EXACT SIZE GATE ──────────────────────────────────────────────────────────
  const x1: string[] = [];
  const over = [XLSX_MAX_BYTES + 1, XLSX_MAX_BYTES + 2].map((n) => ({ n, field: Buffer.alloc(n, 0x41).toString("base64") }));
  for (const { n, field } of over) {
    const spy: Spy = { decode: 0, load: 0 };
    const r = await read(field, spy);
    const said = r.ok ? "" : r.message;
    if (!refusedAs(r, "too_large") || spy.decode !== 0 || spy.load !== 0 || r.stats.bytes !== n
      || !said.includes(formatFileSize(n)) || !said.includes("CSV") || !said.includes(PHONE_FORMAT_REMEDY)) {
      x1.push(`${n} bytes → ${brief(r)}, decoded ${spy.decode}×, loaded ${spy.load}×, measured ${r.stats.bytes}`);
    }
  }
  const junkSpy: Spy = { decode: 0, load: 0 };
  const junk = await read("!".repeat(XLSX_MAX_BASE64_CHARS + 4), junkSpy);
  if (!refusedAs(junk, "too_large") || junkSpy.decode !== 0) x1.push(`junk too long to fit → ${brief(junk)}, decoded ${junkSpy.decode}×`);
  const exactSpy: Spy = { decode: 0, load: 0 };
  const exact = await read(fx.exact.field, exactSpy);
  if (!exact.ok || exact.file.rows.length !== fx.exact.rows || exactSpy.decode !== 1 || exactSpy.load !== 1 || exact.stats.bytes !== XLSX_MAX_BYTES) {
    x1.push(`exactly ${XLSX_MAX_BYTES} bytes → ${brief(exact)}, decoded ${exactSpy.decode}×, loaded ${exactSpy.load}×, measured ${exact.stats.bytes}`);
  }
  if (fx.exact.field.length !== XLSX_MAX_BASE64_CHARS || over.some((o) => o.field.length !== XLSX_MAX_BASE64_CHARS)) {
    x1.push("control: 700 KiB, + 1 and + 2 bytes no longer share one base64 length — the case proves nothing");
  }
  ok(L.X1, x1.length === 0, x1.join(" | ") || `+1 and +2 refused by their length (decoded 0×, loaded 0×) · ${XLSX_MAX_BYTES} bytes read as ${exact.ok ? exact.file.rows.length : 0} rows`);

  // ── X2 · THE FIELD ──────────────────────────────────────────────────────────────────────────
  const x2: string[] = [];
  const malformed: ReadonlyArray<readonly [string, string]> = [
    ["'@@@'", "@@@"],
    ["'@@@@'", "@@@@"],
    ["a length that is not a multiple of 4", `${fx.forty}A`],
    ["a line break inside the field", `${fx.forty.slice(0, 76)}${LF}${fx.forty.slice(76)}`],
    ["a data URL that is not base64", "data:text/plain,Name"],
  ];
  for (const [what, field] of malformed) {
    const spy: Spy = { decode: 0, load: 0 };
    const r = await read(field, spy);
    if (!refusedAs(r, "not_base64") || spy.decode !== 0 || spy.load !== 0) x2.push(`${what} → ${brief(r)}, decoded ${spy.decode}×`);
  }
  const dataUrl = await read(`data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${fx.forty}`);
  if (!dataUrl.ok || dataUrl.file.rows.length !== FORTY_ROWS) x2.push(`a data: URL prefix → ${brief(dataUrl)}`);
  ok(L.X2, x2.length === 0, x2.join(" | ") || `${malformed.length} malformed fields refused before any decode · the data: prefix read`);

  // ── X3 · C18's CLASSIFIER ───────────────────────────────────────────────────────────────────
  const x3 = await refusedCases([
    ["a legacy .xls", fx.xls, "wrong_format", undefined, "xls"],
    ["a password-protected workbook", fx.protectedCfb, "wrong_format", undefined, "protected"],
    ["an OpenDocument head", fx.odsHead, "wrong_format", undefined, "ods"],
    ["plain text", fx.text, "wrong_format", undefined, "other"],
  ], 0);
  ok(L.X3, x3.length === 0, x3.join(" | ") || "xls · protected · ods · other — none loaded");

  // ── X4–X6 · THE PRE-PASS: STRUCTURE AND KIND ────────────────────────────────────────────────
  const x4 = await refusedCases([
    ["maxed end-record fields", fx.zip64Maxed, "unreadable", "zip64", undefined],
    ["a zip64 locator before the end record", fx.zip64Locator, "unreadable", "zip64", undefined],
  ], 0);
  ok(L.X4, x4.length === 0, x4.join(" | ") || "both zip64 shapes refused, none loaded");
  const x5 = await refusedCases([["an encrypted entry", fx.encrypted, "wrong_format", "encrypted", "protected"]], 0);
  ok(L.X5, x5.length === 0, x5.join(" | ") || "protected, not loaded");
  const x6 = await refusedCases([
    [".xlsb", fx.xlsb, "wrong_format", "xlsb", "xlsb"],
    ["an OpenDocument zip, mimetype not first", fx.odsLate, "wrong_format", "ods", "ods"],
    ["Strict Open XML", fx.strict, "wrong_format", "strict", "strict"],
    ["a zip that is no workbook", fx.docx, "wrong_format", "not_a_workbook", "other"],
  ], 0);
  ok(L.X6, x6.length === 0, x6.join(" | ") || "xlsb · ods · strict · other — none loaded");

  // ── X7–X10 · THE CAPS ───────────────────────────────────────────────────────────────────────
  const bombSpy: Spy = { decode: 0, load: 0 };
  const bomb = await read(fx.bomb, bombSpy);
  ok(L.X7, refusedAs(bomb, "too_big_inflated", "bomb") && bombSpy.load === 0,
    `${brief(bomb)} after ${bomb.stats.inflatedBytes} byte(s) inflated, loaded ${bombSpy.load}×`);
  const forgedSpy: Spy = { decode: 0, load: 0 };
  const forged = await read(fx.forged, forgedSpy);
  ok(L.X8, refusedAs(forged, "too_big_inflated", "bomb") && forgedSpy.load === 0,
    `declared 1,024 bytes → ${brief(forged)}, loaded ${forgedSpy.load}×`);

  const x9: string[] = [];
  x9.push(...(await refusedCases([["XLSX_MAX_ROWS + 1 row elements", fx.rowsOver, "too_many_rows", "rows", undefined]], 0)));
  const atCap = impl.inspect(fx.rowsAt);
  if (!atCap.ok || atCap.rowElements !== XLSX_MAX_ROWS) x9.push(`exactly XLSX_MAX_ROWS → ${atCap.ok ? `${atCap.rowElements} counted` : atCap.detail}`);
  x9.push(...(await refusedCases([["a value on row XLSX_MAX_ROWS + 1", fx.rowPast, "too_many_rows", "row_number", undefined]], 1)));
  ok(L.X9, x9.length === 0, x9.join(" | ") || `${XLSX_MAX_ROWS + 1} refused unloaded · ${XLSX_MAX_ROWS} counted · row ${XLSX_MAX_ROWS + 1} refused after the load`);

  const x10: string[] = [];
  x10.push(...(await refusedCases([["XLSX_MAX_CELL_ELEMENTS + 1 styled empty cells", fx.cellsOver, "too_big_inflated", "cells", undefined]], 0)));
  const cellsAtCap = impl.inspect(fx.cellsAt);
  if (!cellsAtCap.ok || cellsAtCap.cellElements !== XLSX_MAX_CELL_ELEMENTS) {
    x10.push(`exactly XLSX_MAX_CELL_ELEMENTS → ${cellsAtCap.ok ? `${cellsAtCap.cellElements} counted` : cellsAtCap.detail}`);
  }
  x10.push(...(await refusedCases([["a last-column cell on every row", fx.wide, "too_big_inflated", "grid", undefined]], 1)));
  ok(L.X10, x10.length === 0, x10.join(" | ") || `${XLSX_MAX_CELL_ELEMENTS + 1} cells refused unloaded · ${XLSX_MAX_CELL_ELEMENTS} counted · refused past ${XLSX_MAX_GRID_CELLS} grid cells`);

  // ── X11 · PARITY WITH EXCELJS'S UNZIPPER ────────────────────────────────────────────────────
  const x11 = await refusedCases([
    ["an unknown method", fx.method12, "unreadable", "method", undefined],
    ["a duplicate name", fx.duplicate, "unreadable", "duplicate", undefined],
    ["a local header naming another file", fx.nameMismatch, "unreadable", "name_mismatch", undefined],
    ["a name JSZip resolves onto another (xl/./workbook.xml)", fx.unresolvedName, "unreadable", "name", undefined],
    ["a folder entry holding data", fx.folderWithData, "unreadable", "folder", undefined],
    ["bytes after the end record", fx.trailing, "unreadable", "layout", undefined],
    ["a declared size its inflation does not match", fx.sizeMismatch, "unreadable", "size_mismatch", undefined],
  ], 0);
  ok(L.X11, x11.length === 0, x11.join(" | ") || "seven parity cases refused, none loaded");

  // ── X12 · A WORKBOOK EXCELJS CANNOT PARSE ───────────────────────────────────────────────────
  const brokenSpy: Spy = { decode: 0, load: 0 };
  const broken = await read(fx.broken, brokenSpy);
  ok(L.X12, refusedAs(broken, "unreadable", "load") && broken.message === xlsxRefusalSentence("unreadable") && brokenSpy.load === 1 && !digitRun(broken.message),
    `${brief(broken)}, loaded ${brokenSpy.load}× · said: ${broken.ok ? "" : broken.message}`);

  // ── X13 · A1.3, THROUGH U28 ─────────────────────────────────────────────────────────────────
  const a13 = await read(fx.a13);
  let x13 = false;
  let x13Detail = brief(a13);
  if (a13.ok && a13.file.rows.length > 0) {
    const header = a13.file.rows[0];
    const mapped = autoMapFile("xlsx", header.cells);
    const drafts = a13.file.rows.slice(mapped.headerRows).map((row) => ({ line: row.line, draft: draftContactRow(row.cells, mapped.mapping) }));
    const invalid = drafts
      .filter((d) => d.draft.problems.some((p) => p.field === "phone" && p.sentence === excelShortenedSentence()))
      .map((d) => d.line);
    const claimed = firstLines(drafts.map((d) => ({ line: d.line, msisdn: parseTzNumber(d.draft.rawPhone).msisdn, problems: d.draft.problems })));
    const phoneOn = (line: number): string => a13.file.rows.find((r) => r.line === line)?.cells[1] ?? "";
    const control = parseTzNumber("255713000000");
    x13 = mapped.headerRows === 1 && mapped.mapping.phone === 1
      && phoneOn(2) === "2.55713E+11" && phoneOn(3) === "2.55713E+11" && phoneOn(4) === "255712345678"
      && same(invalid, [2, 3])
      && claimed.size === 1 && claimed.get("255712345678") === 4 && !claimed.has("255713000000")
      && control.verdict === "ok" && control.msisdn === "255713000000";
    x13Detail = `phone cells ${[2, 3, 4].map(phoneOn).join(" | ")} · drafted invalid on rows ${invalid.join(",") || "none"} · numbers claimed ${[...claimed.keys()].length} · the control as digits parses ${control.verdict}`;
  }
  ok(L.X13, x13, x13Detail);

  // ── X14–X20 · THE ONE SWITCH, ON THE CELL FIXTURE ───────────────────────────────────────────
  const cells = await read(fx.cells);
  const at = (line: number, column: number): string | undefined => (cells.ok ? cells.file.rows.find((r) => r.line === line)?.cells[column] : undefined);
  const cellNotes = cells.ok ? cells.file.notes : [];
  const show = (pairs: ReadonlyArray<readonly [number, number]>): string => pairs.map(([l, c]) => `${l}:${c}=${String(at(l, c))}`).join(" · ");
  ok(L.X14, at(2, 1) === "255712345678" && at(3, 1) === "712345678" && at(13, 1) === "0" && at(13, 2) === "-5"
    && parseTzNumber(at(2, 1) ?? "").verdict === "ok" && parseTzNumber(at(3, 1) ?? "").verdict === "ok",
    show([[2, 1], [3, 1], [13, 1], [13, 2]]));
  ok(L.X15, at(5, 1) === "712345678" && at(13, 3) === "0.3" && at(3, 2) === "3.5" && at(5, 2) === "1234.5",
    show([[5, 1], [13, 3], [3, 2], [5, 2]]));
  ok(L.X16, at(7, 1) === "2026-10-01" && at(7, 2) === "2026-10-01T14:30:00", show([[7, 1], [7, 2]]));
  ok(L.X17, at(8, 1) === "255712345678" && at(8, 2) === "0" && at(9, 1) === "" && at(9, 2) === "plain" && cellNotes.includes(FORMULA_NOTE),
    `${show([[8, 1], [8, 2], [9, 1], [9, 2]])} · note ${cellNotes.includes(FORMULA_NOTE) ? "present" : "MISSING"}`);
  ok(L.X18, at(10, 0) === "Asha-Mwakalinga" && at(10, 1) === "Link" && at(10, 2) === "TRUE" && at(11, 1) === "" && at(11, 2) === "FALSE"
    && cellNotes.includes(ERROR_NOTE),
    `${show([[10, 0], [10, 1], [10, 2], [11, 1], [11, 2]])} · note ${cellNotes.includes(ERROR_NOTE) ? "present" : "MISSING"}`);
  const row12 = cells.ok ? cells.file.rows.find((r) => r.line === 12)?.cells ?? [] : [];
  ok(L.X19, same(row12, ["Merge", "Merged"]) && row12.filter((c) => c === "Merged").length === 1 && cellNotes.includes(MERGED_NOTE),
    `row 12 ${JSON.stringify(row12)} · note ${cellNotes.includes(MERGED_NOTE) ? "present" : "MISSING"}`);

  const x20: string[] = [];
  if (!cells.ok) x20.push(`the cell fixture → ${brief(cells)}`);
  else {
    const f = cells.file;
    if (!isParsedContactsFile(f)) x20.push("not a valid ParsedContactsFile");
    if (f.format !== "xlsx") x20.push(`format ${f.format}`);
    if (f.fileName !== FILE_NAME) x20.push("the file name did not come back");
    if (!f.rows.every((r) => r.cells.length > 0 && r.cells[r.cells.length - 1] !== "")) x20.push("a blank row, or a trailing empty cell, was emitted");
    if (f.width !== Math.max(...f.rows.map((r) => r.cells.length)) || f.width !== 4) x20.push(`width ${f.width}`);
    if (!same(f.rows, CELLS_ROWS)) x20.push(`rows ${JSON.stringify(f.rows.map((r) => r.cells)).slice(0, 160)}…`);
    if (f.blankRows !== 1) x20.push(`blankRows ${f.blankRows}`);
    if (!same(f.notes, CELLS_NOTES)) x20.push(`notes ${JSON.stringify(f.notes)}`);
  }
  const invalidFiles = seen.filter((r) => r.ok && !isParsedContactsFile(r.file)).length;
  if (invalidFiles > 0) x20.push(`${invalidFiles} read(s) failed isParsedContactsFile`);
  ok(L.X20, x20.length === 0, x20.join(" | ") || `${seen.filter((r) => r.ok).length} ok read(s), every one a valid file`);

  // ── X21–X23 · LINES AND SHEETS ──────────────────────────────────────────────────────────────
  const lined = await read(fx.lines);
  ok(L.X21, lined.ok && same(lined.file.rows.map((r) => r.line), [3, 4, 6]) && lined.file.blankRows === 3,
    `${brief(lined)} · blank rows ${lined.ok ? lined.file.blankRows : "-"}`);
  const sheeted = await read(fx.sheets);
  const allHidden = await read(fx.allHidden);
  ok(L.X22, sheeted.ok && same(sheeted.file.rows, SHEETS_ROWS) && same(sheeted.file.notes, [SHEETS_NOTE]) && refusedAs(allHidden, "no_visible_sheet"),
    `${brief(sheeted)}${sheeted.ok ? ` · notes ${JSON.stringify(sheeted.file.notes)}` : ""} · every sheet hidden → ${brief(allHidden)}`);
  const emptied = await read(fx.empty);
  ok(L.X23, refusedAs(emptied, "empty", "no_rows") && !emptied.ok && emptied.message === xlsxRefusalSentence("empty", { sheet: "Contacts" })
    && emptied.message.includes('"Contacts"'), `${brief(emptied)} · said: ${emptied.ok ? "" : emptied.message}`);

  // ── X32–X34 · C3b-fix · D6, D7, D8 — THE SHEET THAT HOLDS THE MOBILES, ITS TITLE, THE READER'S WORD ──────
  const notesOf = (r: XlsxReadResult): string => (r.ok ? JSON.stringify(r.file.notes) : brief(r));
  const staffFirst = await read(fx.staffThenTitled);
  const twins = await read(fx.twoPhoneSheets);
  const headerOnly = await read(fx.headerOnlyFirst);
  const cover = await read(fx.coverFirst);
  const coverDigits = await read(fx.coverDigits);
  const firstCells = (r: XlsxReadResult): string[] => (r.ok ? r.file.rows.map((row) => row.cells.join("|")) : []);
  ok(L.X32, staffFirst.ok && staffFirst.file.notes[0] === STAFF_NOTE && firstCells(staffFirst)[0] === "Jina|Simu"
    && twins.ok && same(twins.file.notes, [TWINS_NOTE]) && firstCells(twins)[1] === "Mnunuzi 71|0757 300 071"
    && headerOnly.ok && same(headerOnly.file.notes, [HEADER_ONLY_NOTE]) && headerOnly.file.rows.length === 5
    && cover.ok && same(cover.file.rows, COVER_ROWS) && same(cover.file.notes, [COVER_NOTE])
    && coverDigits.ok && coverDigits.file.rows.length === 2 && same(coverDigits.file.notes, [COVER_DIGITS_NOTE]),
    `staff first: ${notesOf(staffFirst)} · twins: ${notesOf(twins)} · header only first: ${notesOf(headerOnly)} · cover: ${notesOf(cover)} · named for a number: ${notesOf(coverDigits)}`);
  const oneSheet = await read(fx.forty);
  const noPhone = await read(fx.noPhoneSheet);
  const flagOf = (r: XlsxReadResult): boolean | null => (r.ok ? r.noMobileSheet : null);
  const flags = [oneSheet, noPhone, staffFirst, twins, headerOnly, cover, coverDigits, sheeted].map(flagOf);
  ok(L.X33, oneSheet.ok && same(oneSheet.file.notes, []) && oneSheet.file.rows.length === FORTY_ROWS
    && noPhone.ok && same(noPhone.file.rows, NO_PHONE_ROWS) && same(noPhone.file.notes, [NO_PHONE_NOTE])
    && same(flags, [false, true, false, false, false, false, false, false]),
    `one sheet: ${notesOf(oneSheet)} · no mobile anywhere: ${brief(noPhone)} ${notesOf(noPhone)} · noMobileSheet ${JSON.stringify(flags)}`);
  const titledLines = staffFirst.ok ? staffFirst.file.rows.map((row) => row.line) : [];
  ok(L.X34, staffFirst.ok && same(staffFirst.file.notes, [STAFF_NOTE, TITLE_NOTE]) && same(titledLines, TITLED_LINES)
    && staffFirst.file.blankRows === 1 && staffFirst.file.width === 2 && isParsedContactsFile(staffFirst.file)
    && staffFirst.stats.rows === TITLED_LINES.length && !staffFirst.file.notes.some((n) => n.includes("Orodha")),
    `lines ${JSON.stringify(titledLines)} · notes ${notesOf(staffFirst)} · blank ${staffFirst.ok ? staffFirst.file.blankRows : "-"} · stats ${staffFirst.stats.rows}`);

  // ── X24 · THE ROW COUNTS, AND THE CAPS AGAINST THE DENSEST FIXTURE ──────────────────────────
  const x24: string[] = [];
  const fortyRead = await read(fx.forty);
  if (!fortyRead.ok || fortyRead.file.rows.length !== FORTY_ROWS || !same(fortyRead.file.rows.map((r) => r.line), Array.from({ length: FORTY_ROWS }, (_, i) => i + 1))
    || fortyRead.file.width !== 3) x24.push(`the 40-row fixture → ${brief(fortyRead)}`);
  let measured: readonly Measured[] = [];
  try {
    measured = await impl.measure();
  } catch (e) {
    x24.push(`the large fixtures could not be built: ${message(e)}`);
  }
  for (const m of measured) {
    log(`X24 · ${m.name}: ${m.bytes.toLocaleString("en-US")} bytes → ${m.inflated.toLocaleString("en-US")} inflated · ${m.rows.toLocaleString("en-US")} rows (${m.rowElements.toLocaleString("en-US")} row elements, ${m.cellElements.toLocaleString("en-US")} cell elements) · ${m.ms} ms · heap ${m.heap >= 0 ? "+" : ""}${Math.round(m.heap / 1048576)} MB`);
    if (m.refusal !== null || m.rows !== m.expected || m.rowElements !== m.expected) x24.push(`${m.name}: ${m.refusal ?? `${m.rows} rows read, ${m.rowElements} counted, ${m.expected} written`}`);
  }
  const densestInflated = Math.max(0, ...measured.map((m) => m.inflated));
  const densestRows = Math.max(0, ...measured.map((m) => m.rowElements));
  const densestCells = Math.max(0, ...measured.map((m) => m.cellElements));
  if (measured.length !== 2) x24.push(`${measured.length} large fixture(s) measured, 2 expected`);
  if (impl.caps.inflatedBytes < 2 * densestInflated) x24.push(`XLSX_MAX_INFLATED_BYTES ${impl.caps.inflatedBytes} < 2 × ${densestInflated}`);
  if (impl.caps.rows < 2 * densestRows) x24.push(`XLSX_MAX_ROWS ${impl.caps.rows} < 2 × ${densestRows}`);
  if (impl.caps.cells < 2 * densestCells) x24.push(`XLSX_MAX_CELL_ELEMENTS ${impl.caps.cells} < 2 × ${densestCells}`);
  ok(L.X24, x24.length === 0, x24.join(" | ")
    || `densest: ${densestInflated} bytes inflated, ${densestRows} rows, ${densestCells} cells — caps ${impl.caps.inflatedBytes}, ${impl.caps.rows} and ${impl.caps.cells}`);

  // ── X25–X27 · THE SOURCE: M6, ONE DETECTOR, SERVER-ONLY AND IN MEMORY ───────────────────────
  const a13Notes = a13.ok ? a13.file.notes : [];
  const flagsItself = a13Notes.filter((n) => SHORTENED_WORDS.test(n));
  const namesDetector = NAMES_A_DETECTOR.test(impl.sources.reader);
  ok(L.X25, a13.ok && flagsItself.length === 0 && !namesDetector,
    `${flagsItself.length} note(s) about a shortened number${namesDetector ? " · import-xlsx.ts names the detector" : ""}`);

  const offenders: string[] = [];
  let limitsSeen = false;
  for (const f of impl.srcScan.files) {
    const defines = DEFINES_DETECTOR.test(f.text);
    const shape = SHORTENED_SHAPE.test(f.text);
    if (f.path === LIMITS_PATH) {
      limitsSeen = defines && shape;
      continue;
    }
    if (defines || shape) offenders.push(`${f.path}${defines ? " (defines it)" : ""}${shape ? " (holds the pattern)" : ""}`);
  }
  log(`X26 population (srcFiles): ${impl.srcScan.scanned} src file(s) walked; ${impl.srcScan.files.length} name the detector or hold a backslash-plus`);
  ok(L.X26, impl.srcScan.scanned >= 500 && limitsSeen && offenders.length === 0,
    offenders.join(" | ") || `${impl.srcScan.files.length} file(s) scanned, ${LIMITS_PATH} excepted${limitsSeen ? "" : " — and its detector NOT seen, so the scan is blind"}`);

  const x27: string[] = [];
  const readerSpecs = new Set(specifiers(impl.sources.reader));
  const runSpecs = new Set(specifiers(impl.sources.run));
  for (const s of readerSpecs) if (!READER_IMPORTS.includes(s)) x27.push(`import-xlsx.ts imports ${s}`);
  for (const need of READER_IMPORTS) if (!readerSpecs.has(need)) x27.push(`import-xlsx.ts does not import ${need}`);
  if (!impl.sources.reader.includes(".xlsx.load(")) x27.push("import-xlsx.ts never calls xlsx.load");
  for (const token of NEVER_IN_READER) if (impl.sources.reader.includes(token)) x27.push(`import-xlsx.ts names ${token}`);
  if (DIRECTIVE.test(impl.sources.reader)) x27.push("import-xlsx.ts carries a directive");
  for (const s of runSpecs) if (!RUN_IMPORTS.includes(s)) x27.push(`import-xlsx-run.ts imports ${s}`);
  if (impl.sources.run.includes("console.")) x27.push("import-xlsx-run.ts writes to the console");
  if (DIRECTIVE.test(impl.sources.run)) x27.push("import-xlsx-run.ts carries a directive");
  ok(L.X27, x27.length === 0, x27.join(" | ") || `reader → ${[...readerSpecs].join(", ")} · wrapper → ${[...runSpecs].join(", ")}`);

  // ── X28–X29 · THE OFFICER: ONE READ IN FLIGHT, ONE AUDIT ROW PER ASK ────────────────────────
  const auditRows = () => getAuditForTarget(XLSX_AUDIT_TARGET_TYPE, XLSX_AUDIT_TARGET_ID, 100_000);
  const rowsBefore = auditRows().length;
  const good: XlsxReadInput = { base64: fx.forty, fileName: FILE_NAME };
  const pair = await Promise.all([impl.officer(ACTOR_A, good), impl.officer(ACTOR_B, good)]);
  const busy = pair.filter((r) => refusedAs(r, "busy"));
  const pairRead = pair.filter((r) => r.ok).length;
  const afterRead = await impl.officer(ACTOR_A, good);
  const refusedCall = await impl.officer(ACTOR_A, { base64: "@@@", fileName: FILE_NAME });
  const afterRefusal = await impl.officer(ACTOR_B, good);
  const throwing = createOfficerXlsxReader({
    ...OFFICER_XLSX_DEPS,
    read: async () => {
      throw new Error("exceljs said row 4 holds 255712345678");
    },
  });
  const thrown = await throwing(ACTOR_A, good);
  const afterThrow = await impl.officer(ACTOR_B, good);
  seen.push(...pair, afterRead, refusedCall, afterRefusal, thrown, afterThrow);
  const x28 = busy.length === 1 && pairRead === 1 && busy[0].stats.bytes === 0
    && afterRead.ok && refusedAs(refusedCall, "not_base64") && afterRefusal.ok
    && refusedAs(thrown, "unreadable", "reader_threw") && !thrown.ok && thrown.message === xlsxRefusalSentence("unreadable") && afterThrow.ok;
  ok(L.X28, x28, `concurrent: ${pair.map(brief).join(" + ")} · after a read ${brief(afterRead)} · a refusal ${brief(refusedCall)}, then ${brief(afterRefusal)} · a throw ${brief(thrown)}, then ${brief(afterThrow)}`);

  const all = auditRows();
  const fresh = all.slice(0, Math.max(0, all.length - rowsBefore));
  const PAYLOAD_KEYS = ["bytes", "inflatedBytes", "entries", "rows", "blankRows", "width", "sheets", "ms", "refusal", "kind", "detail"];
  const COUNTS = PAYLOAD_KEYS.slice(0, 8);
  const x29: string[] = [];
  for (const row of fresh) {
    const p = (row.payload ?? {}) as Record<string, unknown>;
    const faults: string[] = [];
    for (const k of Object.keys(p)) if (!PAYLOAD_KEYS.includes(k)) faults.push(`key ${k}`);
    for (const k of COUNTS) if (typeof p[k] !== "number" || !Number.isFinite(p[k] as number)) faults.push(`${k} is not a count`);
    if (p.refusal !== null && !(XLSX_REFUSALS as readonly unknown[]).includes(p.refusal)) faults.push("refusal is not a refusal");
    if (p.kind !== null && !(WRONG_FORMAT_KINDS as readonly unknown[]).includes(p.kind)) faults.push("kind is not a wrong-format kind");
    if (p.detail !== null && !(typeof p.detail === "string" && /^[a-z][a-z0-9_]{0,31}$/.test(p.detail))) faults.push("detail is not a fixed word");
    const json = JSON.stringify(p);
    if (json.includes("kitabu") || json.includes("255712345678") || json.includes("Contacts")) faults.push("the payload quotes the file");
    if ((row.action === XLSX_READ_ACTION) !== (p.refusal === null)) faults.push(`action ${row.action} disagrees with refusal ${String(p.refusal)}`);
    if (row.category !== "ADMIN" || row.targetType !== XLSX_AUDIT_TARGET_TYPE || row.targetId !== XLSX_AUDIT_TARGET_ID) faults.push("not the import's row");
    x29.push(...faults.map((f) => `${row.action}: ${f}`));
  }
  const readRows = fresh.filter((row) => row.action === XLSX_READ_ACTION).length;
  const refusedRows = fresh.filter((row) => row.action === XLSX_REFUSED_ACTION).length;
  if (fresh.length !== 7 || readRows !== 4 || refusedRows !== 3) x29.unshift(`${fresh.length} row(s) for 7 calls — ${readRows} read, ${refusedRows} refused (want 4 and 3)`);
  ok(L.X29, x29.length === 0, x29.slice(0, 4).join(" | ") || `${fresh.length} rows for 7 calls: ${readRows} read, ${refusedRows} refused, counts only`);

  // ── X30–X31 · WHAT EVERY RESULT MAY SAY ─────────────────────────────────────────────────────
  const said = seen.flatMap((r) => (r.ok ? r.file.notes : [r.message]));
  const longRuns = said.filter(digitRun);
  const quoting = said.filter((s) => CELL_STRINGS.some((c) => s.includes(c)));
  ok(L.X30, said.length >= 20 && longRuns.length === 0 && quoting.length === 0,
    [...longRuns.map((s) => `a digit run: ${s}`), ...quoting.map((s) => `quotes a cell: ${s}`)].slice(0, 3).join(" | ")
      || `${said.length} note(s) and refusal(s), none with a digit run or a cell`);

  const csvRefusals = seen.filter(isRefused).filter((r) => /\bCSV\b/.test(r.message));
  const withoutRemedy = csvRefusals.filter((r) => !r.message.includes(PHONE_FORMAT_REMEDY));
  const observed = new Set(csvRefusals.map((r) => r.refusal));
  const needed: readonly XlsxRefusal[] = ["too_large", "too_big_inflated", "unreadable", "wrong_format"];
  const unobserved = needed.filter((n) => !observed.has(n));
  // C3b · a workbook refused for its ROWS is never sent to CSV — one import of a CSV takes no more rows than this.
  const rowRefusals = seen.filter(isRefused).filter((r) => r.refusal === "too_many_rows");
  const rowsToCsv = rowRefusals.filter((r) => /\bCSV\b/.test(r.message) || !r.message.includes("split the list"));
  ok(L.X31, withoutRemedy.length === 0 && unobserved.length === 0 && csvRefusals.length >= 10 && rowRefusals.length >= 2 && rowsToCsv.length === 0,
    [
      ...withoutRemedy.map((r) => `${r.refusal} without the remedy: ${r.message}`), ...unobserved.map((n) => `${n} never observed`),
      ...rowsToCsv.map((r) => `too_many_rows sends to CSV or never says to split: ${r.message}`),
      rowRefusals.length >= 2 ? "" : `${rowRefusals.length} too_many_rows refusal(s) observed`,
    ].filter((x) => x !== "").slice(0, 3).join(" | ")
      || `${csvRefusals.length} refusal(s) sending the officer to CSV, every one with the remedy (${[...observed].join(", ")}) · ${rowRefusals.length} too_many_rows, none sent to CSV`);

  // ── X35 · C3c-merge-guard · THE MERGE PRE-PASS ──────────────────────────────────────────────
  const x35: string[] = [];
  // A few-KB workbook whose merge (vast, or a flood of them) would exhaust the load — refused by the pre-pass, unloaded.
  x35.push(...(await refusedCases([
    ["one vast merge A1:XFD1048576", fx.mergeBomb, "too_big_inflated", "merge_area", undefined],
    ["a merge of XLSX_MAX_CELL_ELEMENTS + 1 covered cells", fx.mergeAreaOver, "too_big_inflated", "merge_area", undefined],
    ["XLSX_MAX_MERGES + 1 merge elements", fx.mergeCountOver, "too_big_inflated", "merges", undefined],
  ], 0)));
  // The boundary: exactly the caps pass the pre-pass (never exceljs — the bomb would hang it), one over is refused above.
  const areaAt = impl.inspect(fx.mergeAreaAt);
  if (!areaAt.ok || areaAt.mergeCount !== 1 || areaAt.mergedCells !== XLSX_MAX_CELL_ELEMENTS) {
    x35.push(`exactly XLSX_MAX_CELL_ELEMENTS covered → ${areaAt.ok ? `${areaAt.mergedCells} cells, ${areaAt.mergeCount} merge(s)` : areaAt.detail}`);
  }
  const countAt = impl.inspect(fx.mergeCountAt);
  if (!countAt.ok || countAt.mergeCount !== XLSX_MAX_MERGES) {
    x35.push(`exactly XLSX_MAX_MERGES → ${countAt.ok ? `${countAt.mergeCount} counted` : countAt.detail}`);
  }
  // An ordinary merge (the cell fixture's B12:C12): counted — one merge, two cells — passes, and X20 reads it as before.
  const ordinary = impl.inspect(Buffer.from(fx.cells, "base64"));
  if (!ordinary.ok || ordinary.mergeCount !== 1 || ordinary.mergedCells !== 2) {
    x35.push(`the cell fixture's B12:C12 → ${ordinary.ok ? `${ordinary.mergeCount} merge(s), ${ordinary.mergedCells} cell(s)` : ordinary.detail}`);
  }
  ok(L.X35, x35.length === 0, x35.slice(0, 4).join(" | ")
    || `A1:XFD1048576 and a merge flood refused unloaded · ${XLSX_MAX_CELL_ELEMENTS} covered cells and ${XLSX_MAX_MERGES} merges pass the pre-pass · B12:C12 counted (1 merge, 2 cells)`);
}

/* ══ THE RED PLANTS — each a defect somebody could plausibly write, built in memory ═════════════════ */

/** One RULE swapped in the real factory — the walk itself unchanged. */
const withRules = (patch: Partial<XlsxReaderRules>): XlsxImpl => ({
  ...real(),
  make: (spy) => buildXlsxReader(spied({ ...XLSX_READER_RULES, ...patch }, spy)),
});

/** Every result passes through `map` — a SHAPE defect. */
const withOutput = (map: (r: XlsxReadResult) => XlsxReadResult): XlsxImpl => {
  const base = real();
  return {
    ...base,
    make: (spy) => {
      const inner = base.make(spy);
      return async (input) => map(await inner(input));
    },
  };
};

/** The load a plant stubs for the file it waved through — reaching it is the proof, and the spy counts it. */
const stubbedLoad = (): Promise<ExcelJS.Workbook> =>
  Promise.reject(new Error("this plant waved a hostile file through to exceljs; that one load is stubbed"));

/** The pre-pass waves one class of zip through to exceljs, whose load — for that file alone — is stubbed. */
const withInspection = (waved: readonly string[]): XlsxImpl => {
  const through = new WeakSet<object>();
  return withRules({
    inspect: (bytes, measure) => {
      const r = inspectXlsxZip(bytes, measure);
      if (r.ok || !waved.includes(r.detail)) return r;
      through.add(bytes);
      return { ok: true, entries: r.entries, inflatedBytes: r.inflatedBytes, rowElements: 0, cellElements: 0, mergeCount: 0, mergedCells: 0 };
    },
    load: (bytes) => (through.has(bytes) ? stubbedLoad() : XLSX_READER_RULES.load(bytes)),
  });
};

/** A virtual src file in §X26's population. */
const withTree = (path: string, text: string): XlsxImpl => {
  const base = real();
  return { ...base, srcScan: { files: [...base.srcScan.files, { path, text: tidy(text) }], scanned: base.srcScan.scanned } };
};

/** Excel's scientific display, in the test's own words — the plant that "repairs" it needs one. */
const SCIENTIFIC_TEXT = /^\s*[+-]?\d(?:[.,]\d+)?E\+\d{1,2}\s*$/i;

/** xlsxNumberText without A1.3: every integer as its digits. */
const exactDigits: NumberText = (v) => {
  if (!Number.isFinite(v)) return "";
  const n = Number.isInteger(v) ? v : Number(v.toPrecision(15));
  if (!Number.isInteger(n)) return String(n);
  return Number.isSafeInteger(n) ? String(n) : BigInt(n).toString();
};

/** A planted second detector, and a planted second pattern under another name — backslashes built from their code. */
const PLANTED_DETECTOR = `export const looksExcelShortened = (s: string): boolean => /^${BACKSLASH}d${BACKSLASH}.${BACKSLASH}d+E${BACKSLASH}+${BACKSLASH}d+$/i.test(s);${LF}`;
const PLANTED_PATTERN = `export const SCIENTIFIC = /^${BACKSLASH}d(?:${BACKSLASH}.${BACKSLASH}d+)?E${BACKSLASH}+${BACKSLASH}d{1,2}$/i;${LF}`;

const PLANTS: readonly RedPlant<XlsxImpl>[] = [
  // ── the plan's RED line (red:contacts-import) ──
  {
    name: "cell.text everywhere — the obvious implementation: a Date reads Date.toString(), a formula's 0 vanishes, a merge repeats",
    expect: L.X16,
    impl: () => withRules({ cellText: (cell) => ({ text: cell.text, flag: null }) }),
  },
  {
    name: "Math.round on every number — the plan's literal expression applied to the whole grid (3.5 reads 4)",
    expect: L.X15,
    impl: () => withRules({ cellText: (cell) => ({ text: typeof cell.value === "number" ? String(Math.round(cell.value)) : cell.text, flag: null }) }),
  },
  {
    name: "scientific text 'repaired' — 2.55713E+11 expanded to 255713000000, a stranger's number",
    expect: L.X13,
    impl: () => withRules({
      cellText: (cell, numberText) => {
        const read = xlsxCellText(cell, numberText);
        return SCIENTIFIC_TEXT.test(read.text) ? { ...read, text: String(Number(read.text.trim().replace(",", "."))) } : read;
      },
    }),
  },
  {
    name: "declared sizes trusted — the inflate cap read off the central directory, then an uncapped inflate",
    expect: L.X8,
    impl: () => withRules({
      measureEntry: (entry, data, budget) =>
        entry.declaredSize > budget ? { kind: "over" } : { kind: "ok", bytes: entry.method === 0 ? data : inflateRawSync(data) },
    }),
  },
  {
    name: "a numeric 255713000000 written as its exact digits (A1.3 dropped)",
    expect: L.X13,
    impl: () => withRules({ numberText: exactDigits }),
  },
  {
    name: "a length-only base64 gate (A1.4) — 700 KiB + 1 and + 2 bytes share 700 KiB's length and reach the decoder",
    expect: L.X1,
    impl: () => withRules({ overCap: (field) => field.length > XLSX_MAX_BASE64_CHARS }),
  },
  {
    name: "a second looksExcelShortened — the reader keeps its own detector to flag cells (M6)",
    expect: L.X26,
    impl: () => withTree(READER_PATH, PLANTED_DETECTOR),
  },
  // ── the field and the classifier ──
  {
    name: "a second shortened-number pattern under another name",
    expect: L.X26,
    impl: () => withTree("src/lib/contacts/import-parse.ts", PLANTED_PATTERN),
  },
  {
    name: "the alphabet check skipped — Buffer.from silently drops whatever is not base64",
    expect: L.X2,
    impl: () => withRules({ wellFormed: () => true }),
  },
  {
    name: "the classifier skipped — every file walked as an xlsx zip",
    expect: L.X3,
    impl: () => withRules({ sniff: () => "xlsx" }),
  },
  // ── the pre-pass ──
  {
    name: "zip64 handed to exceljs",
    expect: L.X4,
    impl: () => withInspection(["zip64"]),
  },
  {
    name: "an encrypted entry handed to exceljs",
    expect: L.X5,
    impl: () => withInspection(["encrypted"]),
  },
  {
    name: ".xlsb, .ods, Strict and a zip that is no workbook handed to exceljs",
    expect: L.X6,
    impl: () => withInspection(["xlsb", "ods", "strict", "not_a_workbook"]),
  },
  {
    name: "the bomb inflated whole — no cap on the inflate",
    expect: L.X7,
    impl: () => {
      const overCap = new WeakSet<object>();
      return withRules({
        measureEntry: (entry, data) => ({ kind: "ok", bytes: entry.method === 0 ? data : inflateRawSync(data) }),
        inspect: (bytes, measure) => {
          const r = inspectXlsxZip(bytes, measure);
          if (r.inflatedBytes > XLSX_MAX_INFLATED_BYTES) overCap.add(bytes);
          return r;
        },
        load: (bytes) => (overCap.has(bytes) ? stubbedLoad() : XLSX_READER_RULES.load(bytes)),
      });
    },
  },
  {
    name: "the row elements never counted — the row cap left to exceljs",
    expect: L.X9,
    impl: () => withInspection(["rows"]),
  },
  {
    name: "the cell elements never counted — exceljs builds an object for every styled empty cell",
    expect: L.X10,
    impl: () => withInspection(["cells"]),
  },
  {
    name: "no grid cap — a last-column cell on every row lays out the whole grid",
    expect: L.X10,
    impl: () => withRules({ maxGridCells: Number.POSITIVE_INFINITY }),
  },
  {
    name: "zip parity dropped — an unknown method, a duplicate, a renamed local header, an unresolved name, a folder with data, trailing bytes and a size mismatch handed to exceljs",
    expect: L.X11,
    impl: () => withInspection(["method", "duplicate", "name_mismatch", "name", "folder", "layout", "size_mismatch"]),
  },
  {
    name: "C3c-merge-guard · the merge area never counted — a vast merge rectangle handed to exceljs to allocate a Cell for every covered cell",
    expect: L.X35,
    impl: () => withInspection(["merge_area"]),
  },
  {
    name: "C3c-merge-guard · the merge count cap lifted — a flood of merge elements handed to exceljs to reconcile O(merges²)",
    expect: L.X35,
    impl: () => withInspection(["merges"]),
  },
  {
    name: "the unreadable refusal surfaces exceljs's own message",
    expect: L.X12,
    impl: () => withRules({ loadFailure: (error) => message(error) }),
  },
  // ── the switch ──
  {
    name: "General display — numbers written as Excel shows them (toPrecision(6), SheetJS's 'w' reading)",
    expect: L.X14,
    impl: () => withRules({ numberText: (v) => (Math.abs(v) >= 1e11 ? v.toPrecision(6) : String(v)) }),
  },
  {
    name: "float noise kept — 712345678.0000001 reads with its noise",
    expect: L.X15,
    impl: () => withRules({ numberText: (v) => (Number.isInteger(v) ? xlsxNumberText(v) : String(v)) }),
  },
  {
    name: "a formula read from cell.value — exceljs's copy drops a result of 0",
    expect: L.X17,
    impl: () => withRules({
      cellText: (cell, numberText) =>
        cell.type === ExcelJS.ValueType.Formula
          ? xlsxCellText({ type: cell.type, value: cell.value, result: (cell.value as { result?: unknown } | null)?.result, text: cell.text }, numberText)
          : xlsxCellText(cell, numberText),
    }),
  },
  {
    name: "rich text read as the object it is",
    expect: L.X18,
    impl: () => withRules({
      cellText: (cell, numberText) =>
        typeof cell.value === "object" && cell.value !== null && "richText" in cell.value ? { text: String(cell.value), flag: null } : xlsxCellText(cell, numberText),
    }),
  },
  {
    name: "a covered merge cell reads its first cell's value",
    expect: L.X19,
    impl: () => withRules({
      cellText: (cell, numberText) => (cell.type === ExcelJS.ValueType.Merge ? { text: cell.text, flag: null } : xlsxCellText(cell, numberText)),
    }),
  },
  // ── the shape, the lines, the sheet ──
  {
    name: "a parsed workbook labelled csv",
    expect: L.X20,
    impl: () => withOutput((r) => (r.ok ? { ...r, file: { ...r.file, format: "csv" } } : r)),
  },
  {
    name: "rows renumbered 1, 2, 3 — the reader's index, not the sheet row",
    expect: L.X21,
    impl: () => withOutput((r) => (r.ok ? { ...r, file: { ...r.file, rows: r.file.rows.map((row, i) => ({ line: i + 1, cells: row.cells })), blankRows: 0 } } : r)),
  },
  {
    name: "the first sheet read, whatever its state",
    expect: L.X22,
    impl: () => withRules({ chooseSheet: (sheets) => ({ index: sheets.length > 0 ? 0 : -1, note: null }) }),
  },
  {
    name: "C3b-fix D6 undone — the first visible sheet read, whatever it holds (the staff sheet, the cover page, the empty Phone header)",
    expect: L.X32,
    impl: () => withRules({ chooseSheet: (sheets) => ({ ...chooseSheet(sheets), index: sheets.findIndex((s) => s.visible) }) }),
  },
  {
    name: "C3b's header rule restored — the first visible sheet whose header row names Phone, a header with nothing under it included",
    expect: L.X32,
    impl: () => withRules({
      chooseSheet: (sheets) => {
        const choice = chooseSheet(sheets);
        const named = sheets.findIndex((s) => s.visible && autoMapFile("csv", [...(s.sample[0] ?? [])]).mapping.phone !== undefined);
        return named < 0 ? choice : { ...choice, index: named };
      },
    }),
  },
  {
    name: "a tie goes to the LAST of the sheets holding the most",
    expect: L.X32,
    impl: () => withRules({
      chooseSheet: (sheets) => {
        const choice = chooseSheet(sheets);
        if (choice.index < 0) return choice;
        const most = mobileCellsIn(sheets[choice.index].sample);
        let last = choice.index;
        sheets.forEach((s, i) => {
          if (s.visible && mobileCellsIn(s.sample) === most) last = i;
        });
        return { ...choice, index: last };
      },
    }),
  },
  {
    name: "the sheet read and the sheets left unread are never said",
    expect: L.X32,
    impl: () => withRules({ chooseSheet: (sheets) => ({ ...chooseSheet(sheets), note: null }) }),
  },
  {
    name: "the note echoes a sheet named for a phone number",
    expect: L.X32,
    impl: () => withOutput((r) => (r.ok
      ? { ...r, file: { ...r.file, notes: r.file.notes.map((n) => (n === COVER_DIGITS_NOTE ? "Read the sheet “0757 300 045” (sheet 2 of 2)." : n)) } }
      : r)),
  },
  {
    name: "a sheet note on every workbook, a one-sheet workbook included",
    expect: L.X33,
    impl: () => withOutput((r) => (r.ok && !r.file.notes.some((n) => n.startsWith("Read "))
      ? { ...r, file: { ...r.file, notes: [...r.file.notes, "Read the sheet “Contacts” (sheet 1 of 1)."] } }
      : r)),
  },
  {
    name: "C3b-fix D8 undone — the reader never says that no sheet holds a mobile (the hint left to the column choice)",
    expect: L.X33,
    impl: () => withOutput((r) => (r.ok ? { ...r, noMobileSheet: false } : r)),
  },
  {
    name: "the reader says no sheet holds a mobile on every read",
    expect: L.X33,
    impl: () => withOutput((r) => (r.ok ? { ...r, noMobileSheet: true } : r)),
  },
  {
    name: "C3b-fix D7 undone in the reader — the customers' title read as their column names",
    expect: L.X34,
    impl: () => withRules({ dropTitleRows: (file) => file }),
  },
  {
    name: "the title leaves the data unsaid — no note names its row",
    expect: L.X34,
    impl: () => withRules({ dropTitleRows: (file) => { const out = dropTitleRows(file); return { ...out, notes: [...file.notes] }; } }),
  },
  {
    name: "the empty sheet's refusal loses the sheet's name",
    expect: L.X23,
    impl: () => withOutput((r) => (!r.ok && r.refusal === "empty" ? { ...r, message: xlsxRefusalSentence("empty") } : r)),
  },
  {
    name: "the row cap set below twice the densest measurement",
    expect: L.X24,
    impl: () => ({ ...real(), caps: { ...real().caps, rows: 1 } }),
  },
  // ── the source ──
  {
    name: "the reader flags a shortened cell itself — a second flag beside U28's (M6)",
    expect: L.X25,
    impl: () => withOutput((r) => {
      if (!r.ok) return r;
      const lines = r.file.rows.filter((row) => row.cells.some((c) => looksExcelShortened(c))).map((row) => row.line);
      return lines.length === 0 ? r : { ...r, file: { ...r.file, notes: [...r.file.notes, "Some numbers in this sheet were shortened by Excel to scientific form."] } };
    }),
  },
  {
    name: "the reader imports the shortened-number detector",
    expect: L.X25,
    impl: () => ({ ...real(), sources: { ...real().sources, reader: `import { looksExcelShortened } from "@/lib/contacts/xlsx-limits";${LF}${real().sources.reader}` } }),
  },
  {
    name: "the reader imports the store — the parse could consult the book",
    expect: L.X27,
    impl: () => ({ ...real(), sources: { ...real().sources, reader: `import { db } from "@/lib/server/store";${LF}${real().sources.reader}` } }),
  },
  {
    name: "the reader switches to exceljs's streaming WorkbookReader, which spools sheets to temp files",
    expect: L.X27,
    impl: () => ({
      ...real(),
      sources: { ...real().sources, reader: `${real().sources.reader}${LF}export const streaming = () => new ExcelJS.stream.xlsx.WorkbookReader("upload.xlsx");${LF}` },
    }),
  },
  // ── the officer ──
  {
    name: "no slot — two concurrent officer reads both parse",
    expect: L.X28,
    impl: () => ({ ...real(), officer: createOfficerXlsxReader({ ...OFFICER_XLSX_DEPS, slot: { take: () => true, release: () => undefined } }) }),
  },
  {
    name: "a busy refusal never audited",
    expect: L.X29,
    impl: () => ({
      ...real(),
      officer: createOfficerXlsxReader({
        ...OFFICER_XLSX_DEPS,
        record: (entry) => (entry.payload.refusal === "busy" ? Promise.resolve(null) : OFFICER_XLSX_DEPS.record(entry)),
      }),
    }),
  },
  {
    name: "the audit payload names the file",
    expect: L.X29,
    impl: () => ({
      ...real(),
      officer: createOfficerXlsxReader({
        ...OFFICER_XLSX_DEPS,
        record: (entry) => audit({ ...entry, payload: { ...entry.payload, fileName: FILE_NAME } }),
      }),
    }),
  },
  // ── what a result may say ──
  {
    name: "a note that quotes a cell",
    expect: L.X30,
    impl: () => withOutput((r) =>
      r.ok && r.file.rows.length > 1 ? { ...r, file: { ...r.file, notes: [...r.file.notes, `Row ${r.file.rows[1].line} reads ${r.file.rows[1].cells.join(" ")}.`] } } : r),
  },
  {
    name: "a too_large sentence of the reader's own, without the remedy (A1.6)",
    expect: L.X31,
    impl: () => withOutput((r) =>
      !r.ok && r.refusal === "too_large"
        ? { ...r, message: "This spreadsheet is too large for an Excel upload. Save it as CSV instead — a CSV has no file-size limit (up to 200,000 rows in one import)." }
        : r),
  },
  {
    name: "too_many_rows sends the officer to CSV again — whose import of the same rows is refused too",
    expect: L.X31,
    impl: () => withOutput((r) =>
      !r.ok && r.refusal === "too_many_rows"
        ? { ...r, message: `This spreadsheet has more than 200,000 rows — the most an Excel file can hold here. Save it as CSV instead — a CSV has no file-size limit (up to 200,000 rows in one import). Before you save, ${PHONE_FORMAT_REMEDY}, or Excel will shorten long numbers to 2.55713E+11.` }
        : r),
  },
];

export const xlsxSection: ImportSection<XlsxImpl> = {
  name: "xlsx",
  owner: "U27b",
  real,
  run,
  plants: PLANTS,
};
