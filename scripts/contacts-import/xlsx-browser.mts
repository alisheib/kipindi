/**
 * test:contacts-import · section "xlsx-browser" — S15 · C3c: a workbook past 700 KB read in the officer's browser
 * (`src/lib/contacts/xlsx-read.ts`), the cell rules it shares with the server's exceljs reader
 * (`src/lib/contacts/xlsx-cells.ts`), and the door that routes it (`readContactsFile`, `import-read.ts`). (S15, 2026-10-09)
 *
 * ⭐ THE DIFFERENTIAL (B1–B3) — the guard that holds two readers to ONE meaning. Every workbook of a corpus is read by
 * the SERVER's reader (`readXlsxContacts`, exceljs, called directly — every corpus file is within its 700 KB cap) and by
 * the BROWSER's reader on the very same bytes, and the two must give the identical `ParsedContactsFile` — headers, every
 * row's line and cells, the unreadable list, the notes — or the identical refusal (the same refusal, wrong format and
 * sentence). The corpus: the generator's own workbooks (`realWorldWorkbooks()`, in memory), the xlsx section's own
 * fixtures (exceljs-written and hostile zips, shared through `xlsxSectionFixtures()`), and workbooks CRAFTED here as raw
 * XML parts in a zip this file assembles, written the way each real writer writes them (Excel 365, a Mac 1904 workbook,
 * Apache POI SXSSF, a phone's contacts-to-Excel app, LibreOffice, Google Sheets) and the zip mechanics real archivers
 * use (stored entries, data descriptors, a comment, absolute targets, macOS local extra fields).
 * ⭐ LITERALS (B4–B8). A defect in a SHARED rule (`xlsx-cells.ts`) moves both readers alike, so the differential cannot
 * see it: the cell semantics, the merges, the hidden sheets and the lines are also held to rows TYPED HERE, never
 * computed by the code under test. B4 pins the recorded divergence: what exceljs refuses (the Open XML SDK's x: prefixes,
 * rows with no r) or drops (CDATA), the browser reads — both sides asserted, so a change on either is seen.
 * ⭐ BIG (B9–B11). The generator's own big-50k.xlsx and big-150k.xlsx, built in memory by exceljs's streaming writer
 * (`bigXlsxInMemory`), read in the browser to the generator's truth; the row cap and the inflate budget refuse where
 * they must. Each big read happens once per rule set (a plant that leaves the rules alone reads from the cache).
 * ⭐ THE DOOR, THE OLD BROWSER, STOP (B12–B14) through `readContactsFile` and the reader's own options; the source (B15)
 * and the copy an officer reads (B16).
 * ⭐ PROVED BY MUTATION. Every label is named by a red plant — one RULE swapped in `buildXlsxBrowserReader` (the walk
 * itself unchanged), the door's wiring, the reader's options, or a source — and the runner requires each plant's OWN
 * label among the reds.
 * ⛔ IN-PROCESS: this module reads files and makes no file-changing call; every workbook is built in memory. ⛔ Every
 * control character is built from its code — the editing tools decode escape text into raw characters.
 */
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { crc32, deflateRawSync } from "node:zlib";
import { decomment } from "../lib/decomment.mts";
import { REPO_ROOT } from "../lib/tracked-files.mts";
import type { ImportSection, RedPlant, SectionContext } from "../contacts-import.test.mts";
import { bigXlsxInMemory, realWorldWorkbooks, type FileTruth } from "../lib/real-world-contact-files.mts";
import { xlsxSectionFixtures, type XlsxSectionFixtures } from "./xlsx.mts";
import { readXlsxContacts, type XlsxReadInput, type XlsxReadResult } from "../../src/lib/server/contacts/import-xlsx.ts";
import {
  XLSX_BROWSER_INFLATE_BUDGET,
  XLSX_BROWSER_RULES,
  buildXlsxBrowserReader,
  excelSerialToDate,
  type XlsxBrowserOptions,
  type XlsxBrowserResult,
  type XlsxBrowserRules,
} from "../../src/lib/contacts/xlsx-read.ts";
import { readContactsFile, type ReadOutcome } from "../../src/lib/contacts/import-read.ts";
import { PHONE_FORMAT_REMEDY, XLSX_MAX_BYTES, XLSX_MAX_ROWS, formatFileSize, xlsxRefusalSentence } from "../../src/lib/contacts/xlsx-limits.ts";
import { isParsedContactsFile, type ParsedContactsFile } from "../../src/lib/contacts/parsed-file.ts";
import { parseTzNumber } from "../../src/lib/tz-msisdn.ts";

/* ⛔ Control characters from their codes — the editing tools decode escape text into raw characters. */
const LF = String.fromCharCode(10);
const CR = String.fromCharCode(13);
const CRLF = CR + LF;

const READ_PATH = "src/lib/contacts/xlsx-read.ts";
const CELLS_PATH = "src/lib/contacts/xlsx-cells.ts";
const SERVER_PATH = "src/lib/server/contacts/import-xlsx.ts";
const COPY_PATH = "src/app/admin/contacts/import/import-copy.ts";
const PINNED_PATH = "scripts/client-graph-safe.test.mjs";

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const sha = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
const base64Of = (bytes: Uint8Array): string => Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("base64");
const utf8 = (s: string): Buffer => Buffer.from(s, "utf8");
const tidy = (raw: string): string => decomment(raw).split(CRLF).join(LF);

/* ══ THE BUNDLE UNDER TEST ══════════════════════════════════════════════════════════════════════════════════ */

type BrowserReader = (file: Blob, opts?: XlsxBrowserOptions) => Promise<XlsxBrowserResult>;

export type XlsxBrowserImpl = {
  /** The browser reader's rules — the shipped ones, or a plant's. */
  readonly rules: XlsxBrowserRules;
  /** A reader from rules: `buildXlsxBrowserReader`, or a plant's wrapping of it. */
  readonly build: (rules: XlsxBrowserRules) => BrowserReader;
  /** The server's reader — the differential's other side, never planted. */
  readonly server: (input: XlsxReadInput) => Promise<XlsxReadResult>;
  /** The door, as the import dialog calls it. */
  readonly readFile: typeof readContactsFile;
  /** The sources as the guards read them: raw (the byte scan) and decommented (imports, tokens). */
  readonly sources: {
    readonly readRaw: string;
    readonly cellsRaw: string;
    readonly read: string;
    readonly cells: string;
    readonly server: string;
    readonly copy: string;
  };
  /** scripts/client-graph-safe.test.mjs as on disk — its PINNED list. */
  readonly pinned: string;
};

let cached: XlsxBrowserImpl | null = null;
function real(): XlsxBrowserImpl {
  if (cached) return cached;
  const raw = (rel: string): string => readFileSync(join(REPO_ROOT, rel), "utf8");
  const readRaw = raw(READ_PATH);
  const cellsRaw = raw(CELLS_PATH);
  cached = {
    rules: XLSX_BROWSER_RULES,
    build: buildXlsxBrowserReader,
    server: readXlsxContacts,
    readFile: readContactsFile,
    sources: { readRaw, cellsRaw, read: tidy(readRaw), cells: tidy(cellsRaw), server: tidy(raw(SERVER_PATH)), copy: tidy(raw(COPY_PATH)) },
    pinned: raw(PINNED_PATH),
  };
  return cached;
}

/* ══ ZIPS, PART BY PART — as real archivers write them ══════════════════════════════════════════════════════ */

type ZipPart = {
  readonly name: string;
  readonly content: string | Uint8Array;
  /** Method 0 (stored) instead of 8 (deflated). */
  readonly stored?: boolean;
  /** General-purpose bit 3: zero CRC and sizes in the LOCAL header, the real ones in a data descriptor after the data
   *  and in the central directory (archiver, Java's ZipOutputStream, exceljs's streaming writer). */
  readonly descriptor?: boolean;
  /** Extra fields that differ between the local header and the central entry (macOS Archive Utility). */
  readonly localExtra?: Uint8Array;
  readonly centralExtra?: Uint8Array;
  /** A forged uncompressed size in both headers. */
  readonly declaredSize?: number;
};

const u16 = (n: number): Buffer => {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n, 0);
  return b;
};
const u32 = (n: number): Buffer => {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n >>> 0, 0);
  return b;
};

/** A zip: each local header and its data (and descriptor), then the central directory and the end record (and comment). */
function zipOf(parts: readonly ZipPart[], comment = ""): Buffer {
  const out: Buffer[] = [];
  const directory: Buffer[] = [];
  let offset = 0;
  for (const p of parts) {
    const raw = typeof p.content === "string" ? utf8(p.content) : Buffer.from(p.content);
    const data = p.stored ? raw : deflateRawSync(raw);
    const method = p.stored ? 0 : 8;
    const crc = crc32(raw) >>> 0;
    const size = p.declaredSize ?? raw.length;
    const flags = p.descriptor ? 0x0008 : 0;
    const name = utf8(p.name);
    const localExtra = Buffer.from(p.localExtra ?? new Uint8Array(0));
    const centralExtra = Buffer.from(p.centralExtra ?? new Uint8Array(0));
    const local = Buffer.concat([
      u32(0x04034b50), u16(20), u16(flags), u16(method), u16(0x6c00), u16(0x5b49),
      u32(p.descriptor ? 0 : crc), u32(p.descriptor ? 0 : data.length), u32(p.descriptor ? 0 : size),
      u16(name.length), u16(localExtra.length), name, localExtra,
    ]);
    const descriptor = p.descriptor ? Buffer.concat([u32(0x08074b50), u32(crc), u32(data.length), u32(size)]) : Buffer.alloc(0);
    out.push(local, data, descriptor);
    directory.push(Buffer.concat([
      u32(0x02014b50), u16(0x031e), u16(20), u16(flags), u16(method), u16(0x6c00), u16(0x5b49),
      u32(crc), u32(data.length), u32(size), u16(name.length), u16(centralExtra.length), u16(0), u16(0), u16(0),
      u32(0), u32(offset), name, centralExtra,
    ]));
    offset += local.length + data.length + descriptor.length;
  }
  const dir = Buffer.concat(directory);
  const note = utf8(comment);
  const end = Buffer.concat([
    u32(0x06054b50), u16(0), u16(0), u16(parts.length), u16(parts.length), u32(dir.length), u32(offset), u16(note.length), note,
  ]);
  return Buffer.concat([...out, dir, end]);
}

/** A macOS "UT" extended-timestamp extra field: 13 bytes in the local header, 9 in the central one (only the mtime). */
const macLocalExtra = Buffer.concat([u16(0x5455), u16(9), Buffer.from([3]), u32(1759309200), u32(1759309200)]);
const macCentralExtra = Buffer.concat([u16(0x5455), u16(5), Buffer.from([3]), u32(1759309200)]);

/* ══ WORKBOOKS AS THE REAL WRITERS WRITE THEM ═══════════════════════════════════════════════════════════════ */

const HEAD = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${CRLF}`;
const NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PKG_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
const MC_NS = "http://schemas.openxmlformats.org/markup-compatibility/2006";
const X14AC_NS = "http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac";
const X15_NS = "http://schemas.microsoft.com/office/spreadsheetml/2010/11/main";
const REL = (type: string): string => `${R_NS}/${type}`;
const CONTENT_TYPES = `${HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/></Types>`;
const ROOT_RELS = `${HEAD}<Relationships xmlns="${PKG_NS}"><Relationship Id="rId1" Type="${REL("officeDocument")}" Target="xl/workbook.xml"/></Relationships>`;

type SheetSpec = { readonly name: string; readonly state?: "hidden" | "veryHidden"; readonly xml: string; readonly rels?: string };
type BookSpec = {
  readonly sheets: readonly SheetSpec[];
  readonly sharedStrings?: string;
  readonly styles?: string;
  /** Everything between the root element's opening and `<sheets>`: fileVersion, workbookPr, bookViews… */
  readonly before?: string;
  /** Everything after `</sheets>`: calcPr, extLst… */
  readonly after?: string;
  readonly absoluteTargets?: boolean;
  readonly zip?: { readonly stored?: boolean; readonly descriptor?: boolean; readonly comment?: string; readonly macExtras?: boolean };
};

/** A workbook: its parts in the order Excel writes them, zipped as the spec says. */
function bookOf(spec: BookSpec): Buffer {
  const target = (path: string): string => (spec.absoluteTargets ? `/xl/${path}` : path);
  const rels: string[] = [];
  const sheetEls: string[] = [];
  spec.sheets.forEach((s, i) => {
    rels.push(`<Relationship Id="rId${i + 1}" Type="${REL("worksheet")}" Target="${target(`worksheets/sheet${i + 1}.xml`)}"/>`);
    sheetEls.push(`<sheet name="${s.name}" sheetId="${i + 1}"${s.state ? ` state="${s.state}"` : ""} r:id="rId${i + 1}"/>`);
  });
  const n = spec.sheets.length;
  if (spec.styles !== undefined) rels.push(`<Relationship Id="rId${n + 1}" Type="${REL("styles")}" Target="${target("styles.xml")}"/>`);
  if (spec.sharedStrings !== undefined) rels.push(`<Relationship Id="rId${n + 2}" Type="${REL("sharedStrings")}" Target="${target("sharedStrings.xml")}"/>`);
  const workbook = `${HEAD}<workbook xmlns="${NS}" xmlns:r="${R_NS}">${spec.before ?? ""}<sheets>${sheetEls.join("")}</sheets>${spec.after ?? ""}</workbook>`;
  const parts: Array<{ name: string; content: string }> = [
    { name: "[Content_Types].xml", content: CONTENT_TYPES },
    { name: "_rels/.rels", content: ROOT_RELS },
    { name: "xl/workbook.xml", content: workbook },
    { name: "xl/_rels/workbook.xml.rels", content: `${HEAD}<Relationships xmlns="${PKG_NS}">${rels.join("")}</Relationships>` },
  ];
  if (spec.styles !== undefined) parts.push({ name: "xl/styles.xml", content: spec.styles });
  if (spec.sharedStrings !== undefined) parts.push({ name: "xl/sharedStrings.xml", content: spec.sharedStrings });
  spec.sheets.forEach((s, i) => {
    parts.push({ name: `xl/worksheets/sheet${i + 1}.xml`, content: s.xml });
    if (s.rels !== undefined) parts.push({ name: `xl/worksheets/_rels/sheet${i + 1}.xml.rels`, content: s.rels });
  });
  const z = spec.zip ?? {};
  return zipOf(
    parts.map((p, i) => ({
      ...p,
      stored: z.stored === true && i % 2 === 0,
      descriptor: z.descriptor === true,
      localExtra: z.macExtras ? macLocalExtra : undefined,
      centralExtra: z.macExtras ? macCentralExtra : undefined,
    })),
    z.comment ?? "",
  );
}

/** A worksheet as Excel 365 writes one around `rows` (its sheetData's inside) and `tail` (merges, hyperlinks). */
const excelSheet = (rows: string, tail = ""): string =>
  `${HEAD}<worksheet xmlns="${NS}" xmlns:r="${R_NS}" xmlns:mc="${MC_NS}" mc:Ignorable="x14ac" xmlns:x14ac="${X14AC_NS}">`
  + `<dimension ref="A1:D8"/><sheetViews><sheetView tabSelected="1" workbookViewId="0"><selection activeCell="B2" sqref="B2"/></sheetView></sheetViews>`
  + `<sheetFormatPr defaultRowHeight="14.5" x14ac:dyDescent="0.35"/><cols><col min="1" max="1" width="18" customWidth="1"/></cols>`
  + `<sheetData>${rows}</sheetData>${tail}<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/></worksheet>`;

/** Excel 365's styles: fonts, fills, borders, a custom date format and four cell styles (General, 14, dd/mm/yyyy, @). */
const EXCEL_STYLES = `${HEAD}<styleSheet xmlns="${NS}" xmlns:mc="${MC_NS}" mc:Ignorable="x14ac" xmlns:x14ac="${X14AC_NS}">`
  + `<numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts>`
  + `<fonts count="2" x14ac:knownFonts="1"><font><sz val="11"/><color theme="1"/><name val="Aptos Narrow"/><family val="2"/><scheme val="minor"/></font><font><sz val="9"/><name val="Yu Gothic"/><family val="3"/></font></fonts>`
  + `<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>`
  + `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>`
  + `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>`
  + `<cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="14" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>`
  + `<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>`
  + `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="0"/>`
  + `<tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/></styleSheet>`;

const inline = (ref: string, text: string): string => `<c r="${ref}" t="inlineStr"><is><t>${text}</t></is></c>`;
const shared = (ref: string, index: number, s = ""): string => `<c r="${ref}"${s} t="s"><v>${index}</v></c>`;

/** Excel 365's shared strings for the cell fixture: a rich string with a PHONETIC run, `_x000D_`, spaces kept. */
const EXCEL_STRINGS = `${HEAD}<sst xmlns="${NS}" count="13" uniqueCount="12">`
  + `<si><t>Name</t></si><si><t>Phone</t></si><si><t>Notes</t></si><si><t>Extra</t></si><si><t>Asha</t></si><si><t>x</t></si>`
  + `<si><r><t>Bara</t></r><r><rPr><b/><sz val="11"/><color theme="1"/><rFont val="Aptos Narrow"/><family val="2"/><scheme val="minor"/></rPr><t>ka</t></r>`
  + `<rPh sb="0" eb="1"><t>BARAKA</t></rPh><phoneticPr fontId="1"/></si>`
  + `<si><t>2.55713E+11</t></si><si><t>Juma</t></si><si><t>a_x000D_b</t></si><si><t>Zawadi</t></si><si><t xml:space="preserve">  Mwanaisha  </t></si></sst>`;

/** The cell fixture's rows — every cell type, one behaviour per cell (see `CELLS_ROWS` for what each reads as). */
const EXCEL_CELL_ROWS = [
  `<row r="1" spans="1:4" x14ac:dyDescent="0.35">${shared("A1", 0)}${shared("B1", 1)}${shared("C1", 2)}${shared("D1", 3)}</row>`,
  `<row r="2" spans="1:4" x14ac:dyDescent="0.35">${shared("A2", 4)}<c r="B2"><v>255712345678</v></c><c r="C2" s="1"><v>45931</v></c>${shared("D2", 5)}</row>`,
  `<row r="3" spans="1:4" x14ac:dyDescent="0.35">${shared("A3", 6)}<c r="B3"><v>712345678</v></c><c r="C3" s="2"><v>45931.5</v></c><c r="D3" t="b"><v>1</v></c></row>`,
  `<row r="5" spans="1:4" x14ac:dyDescent="0.35">${inline("A5", "Neema")}<c r="B5"><v>255713000000</v></c>${shared("C5", 7)}<c r="D5" t="b"><v>0</v></c></row>`,
  `<row r="6" spans="1:4" x14ac:dyDescent="0.35">${shared("A6", 8)}<c r="B6"><f>B2</f><v>255712345678</v></c>${shared("C6", 9)}<c r="D6" t="e"><v>#N/A</v></c></row>`,
  `<row r="7" spans="1:4" x14ac:dyDescent="0.35">${shared("A7", 10)}<c r="B7"><f>B3+1</f></c><c r="C7"><f>B2*0</f><v>0</v></c><c r="D7" t="str"><f>"R"&amp;"D"</f><v>R&amp;amp;D</v></c></row>`,
  `<row r="8" spans="1:4" x14ac:dyDescent="0.35">${shared("A8", 11)}${inline("B8", "0757 300 071")}<c r="C8"><f>NOW()</f></c><c r="D8" s="3"><v>5</v></c></row>`,
].join("");
const HYPERLINK_TAIL = `<hyperlinks><hyperlink ref="C8" r:id="rId1" display="https://example.com/sasa"/></hyperlinks>`;
const HYPERLINK_RELS = `${HEAD}<Relationships xmlns="${PKG_NS}"><Relationship Id="rId1" Type="${REL("hyperlink")}" Target="https://example.com/sasa" TargetMode="External"/></Relationships>`;
/** Excel 2013+ writes an x15:workbookPr inside extLst — its LOCAL name is workbookPr, and it says nothing of 1904. */
const EXCEL_EXT = `<calcPr calcId="191029"/><extLst><ext uri="{140A7094-0E35-4892-8432-C4D2E57EDEB5}" xmlns:x15="${X15_NS}"><x15:workbookPr chartTrackingRefBase="1"/></ext></extLst>`;
const excelBefore = (date1904: boolean): string =>
  `<fileVersion appName="xl" lastEdited="7" lowestEdited="7" rupBuild="27425"/><workbookPr${date1904 ? ' date1904="1"' : ""} defaultThemeVersion="202300"/>`
  + `<bookViews><workbookView xWindow="-110" yWindow="-110" windowWidth="19420" windowHeight="10300"/></bookViews>`;

const excelCells = (date1904: boolean): Buffer =>
  bookOf({
    sheets: [{ name: "Wateja", xml: excelSheet(EXCEL_CELL_ROWS, HYPERLINK_TAIL), rels: HYPERLINK_RELS }],
    sharedStrings: EXCEL_STRINGS,
    styles: EXCEL_STYLES,
    before: excelBefore(date1904),
    after: EXCEL_EXT,
  });

/** B5 — the cell fixture's rows, typed here as LITERALS (1900 dates; `CELLS_ROWS_1904` moves the two dates). */
const CELLS_ROWS = [
  { line: 1, cells: ["Name", "Phone", "Notes", "Extra"] },
  { line: 2, cells: ["Asha", "255712345678", "2025-10-01", "x"] },
  { line: 3, cells: ["Baraka", "712345678", "2025-10-01T12:00:00", "TRUE"] },
  { line: 5, cells: ["Neema", "2.55713E+11", "2.55713E+11", "FALSE"] },
  { line: 6, cells: ["Juma", "255712345678", `a${CR}b`] },
  { line: 7, cells: ["Zawadi", "", "0", "R&D"] },
  { line: 8, cells: ["  Mwanaisha  ", "0757 300 071", "", "5"] },
];
const CELLS_ROWS_1904 = CELLS_ROWS.map((r) =>
  r.line === 2 ? { line: 2, cells: ["Asha", "255712345678", "2029-10-02", "x"] }
  : r.line === 3 ? { line: 3, cells: ["Baraka", "712345678", "2029-10-02T12:00:00", "TRUE"] }
  : r);
const CELLS_NOTES = [
  "Row 7 has a formula whose saved value is empty or missing, so it was read as blank. If it should hold something, open the file in Excel, save it, and choose it again.",
  "Row 6 holds an error value (like #N/A), so it was read as blank.",
];

/** B6 — merges: a tags cell merged down three rows (its covered C3 holding a value of its own), and a block A6:B7
 *  over a row the sheet never wrote. */
const MERGES_BOOK = bookOf({
  sheets: [{
    name: "Wateja",
    xml: excelSheet(
      `<row r="1">${inline("A1", "Name")}${inline("B1", "Phone")}${inline("C1", "Tags")}</row>`
      + `<row r="2">${inline("A2", "Asha")}${inline("B2", "0757 300 051")}${inline("C2", "vip")}</row>`
      + `<row r="3">${inline("A3", "Baraka")}${inline("B3", "0757 300 052")}${inline("C3", "vip-copy")}</row>`
      + `<row r="4">${inline("A4", "Neema")}${inline("B4", "0757 300 053")}</row>`
      + `<row r="6">${inline("A6", "Kundi la mwisho")}${inline("B6", "x")}</row>`,
      `<mergeCells count="2"><mergeCell ref="C2:C4"/><mergeCell ref="A6:B7"/></mergeCells>`,
    ),
  }],
  styles: EXCEL_STYLES,
});
const MERGES_ROWS = [
  { line: 1, cells: ["Name", "Phone", "Tags"] },
  { line: 2, cells: ["Asha", "0757 300 051", "vip"] },
  { line: 3, cells: ["Baraka", "0757 300 052"] },
  { line: 4, cells: ["Neema", "0757 300 053"] },
  { line: 6, cells: ["Kundi la mwisho"] },
];
const MERGES_NOTES = ["Rows 3, 4, 6 and 7 have merged cells; only the first cell of each merge holds its value, so the others were read as blank."];

/** B7 — a cover page, a hidden and a very hidden sheet holding the MOST mobiles, the contacts, and a later sheet. */
const mobilesSheet = (rows: ReadonlyArray<readonly [string, string]>): string =>
  excelSheet([`<row r="1">${inline("A1", "Jina")}${inline("B1", "Simu")}</row>`, ...rows.map(([name, phone], i) => `<row r="${i + 2}">${inline(`A${i + 2}`, name)}${inline(`B${i + 2}`, phone)}</row>`)].join(""));
const SHEETS_BOOK = bookOf({
  sheets: [
    { name: "Jalada", xml: excelSheet(`<row r="1">${inline("A1", "Orodha ya wateja")}</row><row r="3">${inline("A3", "Imeandaliwa na ofisi ya masoko")}</row>`) },
    { name: "Siri", state: "hidden", xml: mobilesSheet([["S1", "0757 300 101"], ["S2", "0757 300 102"], ["S3", "0757 300 103"], ["S4", "0757 300 104"], ["S5", "0757 300 105"]]) },
    { name: "Kificho", state: "veryHidden", xml: mobilesSheet([["K1", "0757 300 111"], ["K2", "0757 300 112"], ["K3", "0757 300 113"], ["K4", "0757 300 114"], ["K5", "0757 300 115"]]) },
    { name: "Wateja", xml: mobilesSheet([["Amani", "0757 300 121"], ["Bahati", "0757 300 122"]]) },
    { name: "Mengine", xml: mobilesSheet([["Chiku", "0757 300 131"]]) },
  ],
  styles: EXCEL_STYLES,
});
const SHEETS_ROWS = [
  { line: 1, cells: ["Jina", "Simu"] },
  { line: 2, cells: ["Amani", "0757 300 121"] },
  { line: 3, cells: ["Bahati", "0757 300 122"] },
];
const ALL_HIDDEN_BOOK = bookOf({
  sheets: [
    { name: "Moja", state: "hidden", xml: mobilesSheet([["A", "0757 300 141"]]) },
    { name: "Mbili", state: "veryHidden", xml: mobilesSheet([["B", "0757 300 142"]]) },
  ],
});

/** B8 — the lines: a header on row 3, rows out of file order, a repeated row 8 (the later one wins whole), trailing
 *  empty cells (a styled empty cell, an empty shared string), a row of only a styled empty cell. */
const LINES_BOOK = bookOf({
  sheets: [{
    name: "Wateja",
    xml: excelSheet(
      `<row r="3">${shared("A3", 0)}${shared("B3", 1)}</row>`
      + `<row r="6">${inline("A6", "Baraka")}${inline("B6", "0757 300 082")}</row>`
      + `<row r="4">${inline("A4", "Asha")}${inline("B4", "0757 300 081")}<c r="D4" s="1"/>${shared("E4", 2)}</row>`
      + `<row r="8">${inline("A8", "Wa kwanza")}${inline("B8", "0757 300 083")}${inline("C8", "itapotea")}</row>`
      + `<row r="8">${inline("A8", "Neema")}${inline("B8", "0757 300 084")}</row>`
      + `<row r="9"><c r="A9" s="1"/></row>`,
    ),
  }],
  sharedStrings: `${HEAD}<sst xmlns="${NS}" count="3" uniqueCount="3"><si><t>Name</t></si><si><t>Phone</t></si><si><t/></si></sst>`,
  styles: EXCEL_STYLES,
});
const LINES_ROWS = [
  { line: 3, cells: ["Name", "Phone"] },
  { line: 4, cells: ["Asha", "0757 300 081"] },
  { line: 6, cells: ["Baraka", "0757 300 082"] },
  { line: 8, cells: ["Neema", "0757 300 084"] },
];

/** B4 — the Open XML SDK: x:-prefixed parts, no r on any row or cell, a placeholder cell, a CDATA name; an absolute
 *  target, the SDK's own relationship id and a space before every "/>". */
const SDK_BOOK = zipOf([
  { name: "[Content_Types].xml", content: CONTENT_TYPES },
  { name: "_rels/.rels", content: ROOT_RELS },
  { name: "xl/workbook.xml", content: `<?xml version="1.0" encoding="utf-8"?><x:workbook xmlns:r="${R_NS}" xmlns:x="${NS}"><x:sheets><x:sheet name="Wateja" sheetId="1" r:id="R5b3c1a2e9f0d4c7a" /></x:sheets></x:workbook>` },
  { name: "xl/_rels/workbook.xml.rels", content: `<?xml version="1.0" encoding="utf-8"?><Relationships xmlns="${PKG_NS}"><Relationship Type="${REL("worksheet")}" Target="/xl/worksheets/sheet1.xml" Id="R5b3c1a2e9f0d4c7a" /></Relationships>` },
  {
    name: "xl/worksheets/sheet1.xml",
    content: `<?xml version="1.0" encoding="utf-8"?><x:worksheet xmlns:x="${NS}"><x:sheetData>`
      + `<x:row><x:c t="inlineStr"><x:is><x:t>Name</x:t></x:is></x:c><x:c t="inlineStr"><x:is><x:t>Phone</x:t></x:is></x:c><x:c t="inlineStr"><x:is><x:t>Tags</x:t></x:is></x:c></x:row>`
      + `<x:row><x:c t="inlineStr"><x:is><x:t>Asha</x:t></x:is></x:c><x:c t="inlineStr"><x:is><x:t>0757 300 061</x:t></x:is></x:c><x:c t="inlineStr"><x:is><x:t>vip</x:t></x:is></x:c></x:row>`
      + `<x:row><x:c t="inlineStr"><x:is><x:t>Baraka</x:t></x:is></x:c><x:c /><x:c t="inlineStr"><x:is><x:t>dar</x:t></x:is></x:c></x:row>`
      + `<x:row><x:c t="inlineStr"><x:is><x:t><![CDATA[Neema & co]]></x:t></x:is></x:c><x:c><x:v>255757300063</x:v></x:c></x:row>`
      + `</x:sheetData></x:worksheet>`,
  },
]);
const SDK_ROWS = [
  { line: 1, cells: ["Name", "Phone", "Tags"] },
  { line: 2, cells: ["Asha", "0757 300 061", "vip"] },
  { line: 3, cells: ["Baraka", "", "dar"] },
  { line: 4, cells: ["Neema & co", "255757300063"] },
];
/** B4 — CDATA in an unprefixed workbook exceljs CAN read: it drops the CDATA name, the browser keeps it. */
const CDATA_BOOK = bookOf({
  sheets: [{
    name: "Wateja",
    xml: excelSheet(`<row r="1">${inline("A1", "Name")}${inline("B1", "Phone")}</row><row r="2"><c r="A2" t="inlineStr"><is><t><![CDATA[Asha & Sons]]></t></is></c>${inline("B2", "0757 300 064")}</row>`),
  }],
});
const CDATA_BROWSER_ROWS = [{ line: 1, cells: ["Name", "Phone"] }, { line: 2, cells: ["Asha & Sons", "0757 300 064"] }];
const CDATA_SERVER_ROWS = [{ line: 1, cells: ["Name", "Phone"] }, { line: 2, cells: ["", "0757 300 064"] }];

/** B3 — Apache POI SXSSF: inline strings, no shared strings, a Java double "2.55757300072E11", date1904="false". */
const POI_BOOK = (() => {
  const row = (r: number, cells: string): string => `<row r="${r}">${cells}</row>`;
  const xml = `${HEAD}<worksheet xmlns="${NS}"><dimension ref="A1"/><sheetViews><sheetView workbookViewId="0" tabSelected="true"/></sheetViews><sheetFormatPr defaultRowHeight="15.0"/><sheetData>`
    + row(1, `${inline("A1", "Name")}${inline("B1", "Phone")}${inline("C1", "Email")}`)
    + row(2, `${inline("A2", "Asha Mwakalinga")}<c r="B2" t="n"><v>2.55757300072E11</v></c>${inline("C2", "asha@example.com")}`)
    + row(3, `${inline("A3", "Baraka Mushi")}${inline("B3", "+255 757 300 073")}`)
    + `</sheetData><pageMargins bottom="0.75" footer="0.3" header="0.3" left="0.7" right="0.7" top="0.75"/></worksheet>`;
  const styles = `${HEAD}<styleSheet xmlns="${NS}"><numFmts count="0"/><fonts count="1"><font><sz val="11.0"/><color indexed="8"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font></fonts>`
    + `<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="darkGray"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>`
    + `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs></styleSheet>`;
  return bookOf({ sheets: [{ name: "Contacts", xml }], styles, before: `<workbookPr date1904="false"/><bookViews><workbookView activeTab="0"/></bookViews>` });
})();

/** B3 — a phone's "contacts to Excel" app: no styles, no shared strings, an emoji in a name (four UTF-8 bytes). */
const PHONE_APP_BOOK = bookOf({
  sheets: [{
    name: "Contacts",
    xml: `${HEAD}<worksheet xmlns="${NS}"><sheetData><row r="1" spans="1:3">${inline("A1", "Display Name")}${inline("B1", "Mobile Phone")}${inline("C1", "Group")}</row>`
      + `<row r="2" spans="1:3">${inline("A2", `Mama Ntilie ${String.fromCodePoint(0x1f372)}`)}${inline("B2", "+255 757 300 091")}${inline("C2", "Wateja")}</row>`
      + `<row r="3" spans="1:3">${inline("A3", "Duka la Kona")}${inline("B3", "0757300092")}</row></sheetData></worksheet>`,
  }],
});

/** B3 — LibreOffice Calc: explicit state="visible", date1904="false", t="n" numbers, a DD/MM/YYYY date (upper case),
 *  every row's attribute set, a header/footer. */
const LIBREOFFICE_BOOK = bookOf({
  sheets: [{
    name: "Orodha",
    xml: `${HEAD}<worksheet xmlns="${NS}" xmlns:r="${R_NS}"><sheetPr filterMode="false"><pageSetUpPr fitToPage="false"/></sheetPr><dimension ref="A1:C3"/>`
      + `<sheetViews><sheetView showFormulas="false" showGridLines="true" showRowColHeaders="true" showZeros="true" rightToLeft="false" tabSelected="true" showOutlineSymbols="true" defaultGridColor="true" view="normal" topLeftCell="A1" colorId="64" zoomScale="100" zoomScaleNormal="100" zoomScalePageLayoutView="100" workbookViewId="0"><selection pane="topLeft" activeCell="A1" activeCellId="0" sqref="A1"/></sheetView></sheetViews>`
      + `<sheetFormatPr defaultColWidth="11.53515625" defaultRowHeight="12.8" zeroHeight="false" outlineLevelRow="0" outlineLevelCol="0"/><sheetData>`
      + `<row r="1" customFormat="false" ht="12.8" hidden="false" customHeight="false" outlineLevel="0" collapsed="false"><c r="A1" s="0" t="s"><v>0</v></c><c r="B1" s="0" t="s"><v>1</v></c><c r="C1" s="0" t="s"><v>2</v></c></row>`
      + `<row r="2" customFormat="false" ht="12.8" hidden="false" customHeight="false" outlineLevel="0" collapsed="false"><c r="A2" s="0" t="s"><v>3</v></c><c r="B2" s="0" t="n"><v>255757300101</v></c><c r="C2" s="1" t="n"><v>45900</v></c></row>`
      + `<row r="3" customFormat="false" ht="12.8" hidden="false" customHeight="false" outlineLevel="0" collapsed="false"><c r="A3" s="0" t="s"><v>4</v></c><c r="B3" s="0" t="s"><v>5</v></c></row>`
      + `</sheetData><printOptions headings="false" gridLines="false" gridLinesSet="true" horizontalCentered="false" verticalCentered="false"/>`
      + `<pageMargins left="0.7875" right="0.7875" top="1.05277777777778" bottom="1.05277777777778" header="0.7875" footer="0.7875"/>`
      + `<headerFooter differentFirst="false" differentOddEven="false"><oddHeader>&amp;C&amp;"Times New Roman,Regular"&amp;12&amp;A</oddHeader><oddFooter>&amp;C&amp;"Times New Roman,Regular"&amp;12Page &amp;P</oddFooter></headerFooter></worksheet>`,
  }],
  sharedStrings: `${HEAD}<sst xmlns="${NS}" count="6" uniqueCount="6"><si><t xml:space="preserve">Jina</t></si><si><t xml:space="preserve">Simu</t></si><si><t xml:space="preserve">Tarehe</t></si><si><t xml:space="preserve">Amani Lyimo</t></si><si><t xml:space="preserve">Bahati Swai</t></si><si><t xml:space="preserve">0757 300 102</t></si></sst>`,
  styles: `${HEAD}<styleSheet xmlns="${NS}"><numFmts count="1"><numFmt numFmtId="164" formatCode="DD/MM/YYYY"/></numFmts><fonts count="1"><font><sz val="10"/><name val="Arial"/><family val="2"/></font></fonts>`
    + `<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border diagonalUp="false" diagonalDown="false"><left/><right/><top/><bottom/><diagonal/></border></borders>`
    + `<cellStyleXfs count="1"><xf numFmtId="164" fontId="0" fillId="0" borderId="0" applyFont="true" applyBorder="true" applyAlignment="true" applyProtection="true"><alignment horizontal="general" vertical="bottom" textRotation="0" wrapText="false" indent="0" shrinkToFit="false"/><protection locked="true" hidden="false"/></xf></cellStyleXfs>`
    + `<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyFont="false" applyBorder="false" applyAlignment="false" applyProtection="false"><alignment horizontal="general" vertical="bottom" textRotation="0" wrapText="false" indent="0" shrinkToFit="false"/><protection locked="true" hidden="false"/></xf>`
    + `<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyFont="false" applyBorder="false" applyAlignment="false" applyProtection="false"/></cellXfs>`
    + `<cellStyles count="1"><cellStyle name="Default" xfId="0" builtinId="0"/></cellStyles></styleSheet>`,
  before: `<fileVersion appName="Calc"/><workbookPr backupFile="false" showObjects="all" date1904="false"/><workbookProtection/><bookViews><workbookView showHorizontalScroll="true" showVerticalScroll="true" showSheetTabs="true" xWindow="0" yWindow="0" windowWidth="16384" windowHeight="8192" tabRatio="500" firstSheet="0" activeTab="0"/></bookViews>`,
  after: `<calcPr iterateCount="100" refMode="A1" iterate="false" iterateDelta="0.001"/>`,
});

/** B3 — Google Sheets: state="visible" first, an empty workbookPr and definedNames, s="1" on every cell, d/m/yyyy. */
const GOOGLE_BOOK = bookOf({
  sheets: [{
    name: "Sheet1",
    xml: `${HEAD}<worksheet xmlns="${NS}" xmlns:r="${R_NS}"><sheetPr><outlinePr summaryBelow="0" summaryRight="0"/></sheetPr><sheetViews><sheetView workbookViewId="0"/></sheetViews>`
      + `<sheetFormatPr customHeight="1" defaultColWidth="12.63" defaultRowHeight="15.75"/><sheetData>`
      + `<row r="1"><c r="A1" s="1" t="s"><v>0</v></c><c r="B1" s="1" t="s"><v>1</v></c><c r="C1" s="1" t="s"><v>2</v></c></row>`
      + `<row r="2"><c r="A2" s="1" t="s"><v>3</v></c><c r="B2" s="1"><v>757300111</v></c><c r="C2" s="2"><v>45930</v></c></row>`
      + `<row r="3"><c r="A3" s="1" t="s"><v>4</v></c><c r="B3" s="1" t="s"><v>5</v></c></row>`
      + `</sheetData></worksheet>`,
  }],
  sharedStrings: `${HEAD}<sst xmlns="${NS}" count="6" uniqueCount="6"><si><t>Name</t></si><si><t>Phone</t></si><si><t>Joined</t></si><si><t>Rehema Kimaro</t></si><si><t>Saidi Temba</t></si><si><t>+255757300112</t></si></sst>`,
  styles: `${HEAD}<styleSheet xmlns="${NS}" xmlns:x14ac="${X14AC_NS}" xmlns:mc="${MC_NS}"><numFmts count="1"><numFmt numFmtId="164" formatCode="d/m/yyyy"/></numFmts><fonts count="2"><font><sz val="10.0"/><color rgb="FF000000"/><name val="Arial"/><scheme val="minor"/></font><font><color theme="1"/><name val="Arial"/><scheme val="minor"/></font></fonts>`
    + `<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="lightGray"/></fill></fills><borders count="1"><border/></borders>`
    + `<cellStyleXfs count="1"><xf borderId="0" fillId="0" fontId="0" numFmtId="0" applyAlignment="1" applyFont="1"/></cellStyleXfs>`
    + `<cellXfs count="3"><xf borderId="0" fillId="0" fontId="0" numFmtId="0" xfId="0" applyAlignment="1" applyFont="1"><alignment readingOrder="0" shrinkToFit="0" vertical="bottom" wrapText="0"/></xf>`
    + `<xf borderId="0" fillId="0" fontId="1" numFmtId="0" xfId="0" applyAlignment="1" applyFont="1"><alignment readingOrder="0"/></xf><xf borderId="0" fillId="0" fontId="1" numFmtId="164" xfId="0" applyAlignment="1" applyFont="1" applyNumberFormat="1"><alignment readingOrder="0"/></xf></cellXfs>`
    + `<cellStyles count="1"><cellStyle xfId="0" name="Normal" builtinId="0"/></cellStyles><dxfs count="0"/></styleSheet>`,
  before: `<workbookPr/>`,
  after: `<definedNames/><calcPr/>`,
});

/** B3 — the zip mechanics on Excel's own parts: stored and deflated entries, data descriptors, macOS local extra fields
 *  that differ from the central ones, a zip comment, absolute relationship targets. */
const ZIP_MECHANICS_BOOK = bookOf({
  sheets: [{ name: "Wateja", xml: excelSheet(EXCEL_CELL_ROWS, HYPERLINK_TAIL), rels: HYPERLINK_RELS }],
  sharedStrings: EXCEL_STRINGS,
  styles: EXCEL_STYLES,
  before: excelBefore(false),
  absoluteTargets: true,
  zip: { stored: true, descriptor: true, comment: "Imeandaliwa na ofisi ya masoko", macExtras: true },
});

/** B3 — Excel 365 with a hidden lookup sheet and a very hidden one beside the contacts. */
const EXCEL_HIDDEN_BOOK = bookOf({
  sheets: [
    { name: "Wateja", xml: excelSheet(EXCEL_CELL_ROWS, HYPERLINK_TAIL), rels: HYPERLINK_RELS },
    { name: "Orodha", state: "hidden", xml: mobilesSheet([["H1", "0757 300 151"]]) },
    { name: "Mfumo", state: "veryHidden", xml: mobilesSheet([["H2", "0757 300 152"]]) },
  ],
  sharedStrings: EXCEL_STRINGS,
  styles: EXCEL_STYLES,
  before: excelBefore(false),
  after: EXCEL_EXT,
});

/** The crafted corpus the differential reads (B3), each by name. */
const CRAFTED: ReadonlyArray<readonly [string, Buffer]> = [
  ["excel-365-cells", excelCells(false)],
  ["excel-mac-1904", excelCells(true)],
  ["excel-365-hidden-sheets", EXCEL_HIDDEN_BOOK],
  ["excel-merges", MERGES_BOOK],
  ["excel-cover-and-hidden", SHEETS_BOOK],
  ["excel-lines", LINES_BOOK],
  ["apache-poi-sxssf", POI_BOOK],
  ["phone-contacts-app", PHONE_APP_BOOK],
  ["libreoffice-calc", LIBREOFFICE_BOOK],
  ["google-sheets", GOOGLE_BOOK],
  ["zip-mechanics", ZIP_MECHANICS_BOOK],
  ["all-hidden", ALL_HIDDEN_BOOK],
];

/* ══ THE CAPS' WORKBOOKS ════════════════════════════════════════════════════════════════════════════════════ */

/** One sheet of `rows` rows, a phone in each — written as SXSSF writes them, deflated small. */
function rowsBook(rows: number): Buffer {
  const parts: string[] = [`<row r="1">${inline("A1", "Phone")}</row>`];
  for (let r = 2; r <= rows; r++) parts.push(`<row r="${r}"><c r="A${r}"><v>${757000000 + r}</v></c></row>`);
  return bookOf({ sheets: [{ name: "Wateja", xml: `${HEAD}<worksheet xmlns="${NS}"><sheetData>${parts.join("")}</sheetData></worksheet>` }] });
}

/** B11's mechanism — a sheet whose XML inflates to `bytes` bytes of spaces inside its root, its declared size forged. */
function bombBook(bytes: number): Buffer {
  const xml = `${HEAD}<worksheet xmlns="${NS}"><sheetData>${" ".repeat(bytes)}</sheetData></worksheet>`;
  return zipOf([
    { name: "xl/workbook.xml", content: `${HEAD}<workbook xmlns="${NS}" xmlns:r="${R_NS}"><sheets><sheet name="Wateja" sheetId="1" r:id="rId1"/></sheets></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", content: `${HEAD}<Relationships xmlns="${PKG_NS}"><Relationship Id="rId1" Type="${REL("worksheet")}" Target="worksheets/sheet1.xml"/></Relationships>` },
    { name: "xl/worksheets/sheet1.xml", content: xml, declaredSize: 1024 },
  ]);
}
const BOMB_BUDGET = 4 * 1024 * 1024;

/** B13 — a big zip that is no workbook (a Word document padded past the cap with a stored picture). */
function bigDocx(): Buffer {
  const noise = Buffer.alloc(XLSX_MAX_BYTES + 4096);
  let x = 20261009;
  for (let i = 0; i < noise.length; i++) {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    noise[i] = x >>> 24;
  }
  return zipOf([
    { name: "[Content_Types].xml", content: CONTENT_TYPES },
    { name: "word/document.xml", content: `${HEAD}<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>` },
    { name: "word/media/image1.png", content: noise, stored: true },
  ]);
}

/* ══ ONCE PER PROCESS — the server's readings, the generator's workbooks, the big files ═════════════════════ */

type Corpus = { readonly name: string; readonly bytes: Uint8Array };
/** The file name both readers are handed for a corpus file: its own name, given an extension when it has none. */
const fileNameOf = (name: string): string => (/[.](xlsx|ods)$/.test(name) ? name : `${name}.xlsx`);

let generatorOnce: Promise<ReadonlyArray<{ readonly name: string; readonly data: Buffer; readonly truth: FileTruth }>> | null = null;
const generatorBooks = () => (generatorOnce ??= realWorldWorkbooks());
let big50Once: Promise<{ readonly data: Buffer; readonly truth: FileTruth }> | null = null;
let big150Once: Promise<{ readonly data: Buffer; readonly truth: FileTruth }> | null = null;
const big50 = () => (big50Once ??= bigXlsxInMemory("big-50k.xlsx", 50_000));
const big150 = () => (big150Once ??= bigXlsxInMemory("big-150k.xlsx", 150_000));
let capOnce: { readonly over: Buffer; readonly at: Buffer } | null = null;
const capBooks = () => (capOnce ??= { over: rowsBook(XLSX_MAX_ROWS + 1), at: rowsBook(XLSX_MAX_ROWS) });

/** The server's reading of each corpus file — the server is never planted, so it is read once. */
const serverReadings = new Map<string, Promise<XlsxReadResult>>();
function serverRead(impl: XlsxBrowserImpl, c: Corpus): Promise<XlsxReadResult> {
  let p = serverReadings.get(c.name);
  if (p === undefined) {
    p = impl.server({ base64: base64Of(c.bytes), fileName: fileNameOf(c.name) });
    serverReadings.set(c.name, p);
  }
  return p;
}

/** The big readings, once per rule set: a plant that leaves the rules alone reads from the cache. */
const bigReadings = new WeakMap<XlsxBrowserRules, Map<string, Promise<XlsxBrowserResult>>>();
function bigRead(impl: XlsxBrowserImpl, name: string, bytes: Uint8Array): Promise<XlsxBrowserResult> {
  let byName = bigReadings.get(impl.rules);
  if (byName === undefined) {
    byName = new Map();
    bigReadings.set(impl.rules, byName);
  }
  let p = byName.get(name);
  if (p === undefined) {
    p = impl.build(impl.rules)(new Blob([bytes]), { fileName: name });
    byName.set(name, p);
  }
  return p;
}

/* ══ THE LABELS ═════════════════════════════════════════════════════════════════════════════════════════════ */

export const L = {
  B1: "B1 · ⭐ THE DIFFERENTIAL · the generator's own workbooks (excel-basic, excel-number-cells, excel-multi-sheet, prod-check-40.xlsx, and libreoffice.ods) read by the server's reader and the browser's reader on the SAME bytes give the identical ParsedContactsFile — or the identical refusal — and every read keeps each non-blank record of the generator's truth on its own line",
  B2: "B2 · ⭐ THE DIFFERENTIAL · the xlsx section's own workbooks — every cell type exceljs writes, A1.3, lines, hidden and cover sheets, an empty sheet, the grid and the row caps, and every hostile zip (zip64 twice, encrypted, .xlsb, an .ods, Strict, not a workbook, an unknown method, a duplicate name, a renamed local header, an unresolved name, a folder holding data, trailing bytes, a size mismatch, a broken sheet, 200,001 row elements) — read or refused identically",
  B3: "B3 · ⭐ THE DIFFERENTIAL · workbooks crafted as real writers write them — Excel 365 (shared strings, rich text with a phonetic run, _x000D_, dates by a built-in and a custom format, a formula's cached text decoded twice as exceljs does, a hyperlinked formula, hidden and very hidden sheets), a Mac 1904 workbook, Apache POI SXSSF (inline strings, a Java double), a phone's contacts-to-Excel app (no styles, no shared strings, an emoji), LibreOffice, Google Sheets, merges, lines, a cover page, every sheet hidden, and the zip mechanics (stored entries, data descriptors, a zip comment, absolute targets, macOS local extra fields) — identical",
  B4: "B4 · ⭐ BEYOND THE SERVER · the Open XML SDK's x:-prefixed parts with rows and cells that carry no r (a placeholder cell keeping its column) and a CDATA name read in the browser to their literal rows — while the server's exceljs refuses that workbook as unreadable and reads a CDATA cell blank: the recorded divergence, both sides asserted",
  B5: "B5 · ⭐ THE CELL RULES, LITERALLY — dates by a built-in and a custom format as ISO and the SAME serials 1,462 days later under date1904, TRUE and FALSE, a 12-digit phone stored as a NUMBER as its digits, 255713000000 as 2.55713E+11 and that text verbatim, rich runs joined WITHOUT the phonetic run, _x000D_ as a carriage return, spaces kept, a formula's cached 0 as 0, a cached text decoded twice (R&D), a text-format number as itself, and an error and a value-less formula blank with ONE note each naming its row (a hyperlinked value-less formula unflagged)",
  B6: "B6 · ⭐ MERGES — a covered cell reads blank, never the first cell's value repeated (one holding a value of its own too), the first cell keeps its value, and ONE note names every row holding a covered cell, a row the sheet never wrote included",
  B7: "B7 · ⭐ HIDDEN SHEETS — a hidden and a very hidden sheet holding the MOST mobiles are never read nor chosen: the cover page is passed over for the visible sheet with the most mobiles, its note naming that sheet, the other visible sheet holding mobiles and the hidden count — and a workbook whose every sheet is hidden is no_visible_sheet",
  B8: "B8 · LINES — the sheet's own row numbers (a header on row 3, blank rows counted), rows out of file order put in order, a repeated row number replacing the earlier row whole, and every row's trailing empty cells trimmed (a styled empty cell, an empty shared string)",
  B9: "B9 · ⭐ BIG — the generator's big-50k.xlsx and big-150k.xlsx (exceljs's streaming writer, data descriptors, both past 700 KB) read in the browser to every record on its own line, and their phone cells give the generator's truth exactly: distinct numbers, repeats and refusals",
  B10: "B10 · ⛔ THE ROW CAP — a workbook of XLSX_MAX_ROWS + 1 rows is refused too_many_rows in the copy table's words (never sent to CSV), the read stopped at the first row past the cap; exactly XLSX_MAX_ROWS rows are read whole",
  B11: "B11 · ⛔ THE INFLATE BUDGET — 1 GiB of inflated bytes across every part read is the shipped budget, and a sheet that inflates past the budget — its declared size forged to 1 KB — is too_big_inflated by what it inflated to, never read on",
  B12: "B12 · ⛔ AN OLD BROWSER — a DecompressionStream without deflate-raw (its constructor throws) gets today's too_large answer with the file's size, CSV and the remedy clause, before a byte is inflated — from the reader, and through readContactsFile",
  B13: "B13 · ⭐ THE DOOR — readContactsFile reads a workbook past 700 KB in the browser: parsed, format xlsx, the reader's rows, the sha-256 of its exact bytes, extraNumbers 0; a big zip the reader refuses comes back refused in the copy table's words; a workbook within the cap still goes to the server as base64",
  B14: "B14 · STOP AND THE BAR — the reader's last report is its whole total with every row element counted, its reports never move backwards, and a read stopped by the signal returns aborted, nothing read on",
  B15: "B15 · ⛔ PURE AND ONE COPY — xlsx-cells.ts and xlsx-read.ts carry no directive, import only src/lib/contacts modules, name no Buffer, Node built-in, require or DOMParser, hold no backslash and no raw control character but line ends, and are pinned in client-graph-safe; and import-xlsx.ts takes its cell rules from xlsx-cells.ts, keeping no copy of its own",
  B16: "B16 · ⛔ THE COPY — nothing at the import's entrance says an Excel file over 700 KB is refused or must be saved as CSV (its limits line names no Excel size; import-copy.ts names no XLSX_MAX_BYTES), while too_large keeps its sentence — the size, CSV and the remedy — for a direct post over the cap and an old browser",
} as const;

/* ══ THE RUN ════════════════════════════════════════════════════════════════════════════════════════════════ */

type Ctx = SectionContext<XlsxBrowserImpl>;

const brief = (r: XlsxReadResult | XlsxBrowserResult): string => {
  if ("ok" in r) return r.ok ? `read ${r.file.rows.length} row(s)` : `refused ${r.refusal}${r.kind ? `/${r.kind}` : ""} (${r.detail ?? "-"})`;
  return r.kind === "read" ? `read ${r.file.rows.length} row(s)` : r.kind === "refused" ? `refused ${r.refusal}${r.wrongFormat ? `/${r.wrongFormat}` : ""} (${r.detail})` : "aborted";
};

/** Where the two readers part, or null when they read the same: the same file, or the same refusal in the same words. */
function parting(server: XlsxReadResult, browser: XlsxBrowserResult): string | null {
  if (server.ok && browser.kind === "read") {
    if (same(server.file, browser.file)) return null;
    const s = server.file;
    const b = browser.file;
    if (!same(s.rows, b.rows)) {
      const k = s.rows.findIndex((row, i) => !same(row, b.rows[i]));
      return `row ${k}: server ${JSON.stringify(s.rows[k] ?? null)} · browser ${JSON.stringify(b.rows[k] ?? null)}`;
    }
    return `notes/shape: server ${JSON.stringify({ ...s, rows: s.rows.length })} · browser ${JSON.stringify({ ...b, rows: b.rows.length })}`;
  }
  if (!server.ok && browser.kind === "refused") {
    return server.refusal === browser.refusal && server.kind === browser.wrongFormat && server.message === browser.message
      ? null
      : `server ${brief(server)} · browser ${brief(browser)}`;
  }
  return `server ${brief(server)} · browser ${brief(browser)}`;
}

async function differential(impl: XlsxBrowserImpl, corpus: readonly Corpus[]): Promise<string[]> {
  const read = impl.build(impl.rules);
  const faults: string[] = [];
  for (const c of corpus) {
    const server = await serverRead(impl, c);
    const browser = await read(new Blob([c.bytes]), { fileName: fileNameOf(c.name) });
    const why = parting(server, browser);
    if (why !== null) faults.push(`${c.name}: ${why}`);
  }
  return faults;
}

/** The phone cells' verdicts, counted as the generator counts its truth: distinct numbers, repeats, refusals. */
function verdicts(file: ParsedContactsFile): { readonly records: number; readonly validDistinct: number; readonly duplicateRows: number; readonly invalidRows: number } {
  const keys = new Set<string>();
  let duplicateRows = 0;
  let invalidRows = 0;
  for (const row of file.rows.slice(1)) {
    const n = parseTzNumber(row.cells[0] ?? "");
    const key = n.verdict === "ok" ? n.msisdn : null;
    if (key === null) invalidRows++;
    else if (keys.has(key)) duplicateRows++;
    else keys.add(key);
  }
  return { records: file.rows.length - 1, validDistinct: keys.size, duplicateRows, invalidRows };
}

async function run({ impl, ok, log }: Ctx): Promise<void> {
  const read = impl.build(impl.rules);
  const blob = (bytes: Uint8Array): Blob => new Blob([bytes]);

  // ── B1 · the generator's workbooks ──
  const books = await generatorBooks();
  const b1 = await differential(impl, books.map((b) => ({ name: b.name, bytes: b.data })));
  for (const b of books) {
    if (b.truth.format !== "xlsx") continue;
    const r = await read(blob(b.data), { fileName: b.name });
    const want = (b.truth.people ?? []).filter((p) => !p.blank).map((p) => p.line);
    const got = r.kind === "read" ? r.file.rows.slice(1).map((row) => row.line) : [];
    if (!same(got, want)) b1.push(`${b.name}: lines ${JSON.stringify(got).slice(0, 80)} · truth ${JSON.stringify(want).slice(0, 80)}`);
  }
  ok(L.B1, b1.length === 0 && books.length === 5, b1.slice(0, 4).join(" | ") || `${books.length} workbooks, every one the same through both readers`);

  // ── B2 · the xlsx section's fixtures ──
  const fx: XlsxSectionFixtures = await xlsxSectionFixtures();
  const fromBase64 = (field: string): Uint8Array => new Uint8Array(Buffer.from(field, "base64"));
  const sectionCorpus: Corpus[] = ([
    "cells", "a13", "lines", "sheets", "coverFirst", "coverDigits", "noPhoneSheet", "allHidden", "empty", "forty", "wide", "rowPast",
    "xlsb", "odsLate", "strict", "docx", "zip64Maxed", "zip64Locator", "encrypted", "method12", "duplicate", "nameMismatch",
    "unresolvedName", "folderWithData", "trailing", "sizeMismatch", "broken", "rowsOver",
  ] as const).map((name) => ({ name: `xlsx-section-${name}`, bytes: fromBase64(fx[name]) }));
  sectionCorpus.push({ name: "xlsx-section-exact", bytes: fromBase64(fx.exact.field) });
  const b2 = await differential(impl, sectionCorpus);
  ok(L.B2, b2.length === 0, b2.slice(0, 4).join(" | ") || `${sectionCorpus.length} fixtures, every one the same through both readers`);

  // ── B3 · the crafted corpus ──
  const b3 = await differential(impl, CRAFTED.map(([name, bytes]) => ({ name, bytes })));
  ok(L.B3, b3.length === 0, b3.slice(0, 4).join(" | ") || `${CRAFTED.length} crafted workbooks, every one the same through both readers`);

  // ── B4 · beyond the server ──
  const sdkBrowser = await read(blob(SDK_BOOK), { fileName: "sdk.xlsx" });
  const sdkServer = await serverRead(impl, { name: "open-xml-sdk", bytes: SDK_BOOK });
  const cdataBrowser = await read(blob(CDATA_BOOK), { fileName: "cdata.xlsx" });
  const cdataServer = await serverRead(impl, { name: "cdata", bytes: CDATA_BOOK });
  ok(L.B4, sdkBrowser.kind === "read" && same(sdkBrowser.file.rows, SDK_ROWS) && sdkBrowser.file.width === 3 && same(sdkBrowser.file.notes, [])
    && !sdkServer.ok && sdkServer.refusal === "unreadable" && sdkServer.message === xlsxRefusalSentence("unreadable")
    && cdataBrowser.kind === "read" && same(cdataBrowser.file.rows, CDATA_BROWSER_ROWS)
    && cdataServer.ok && same(cdataServer.file.rows, CDATA_SERVER_ROWS),
    `SDK: browser ${sdkBrowser.kind === "read" ? JSON.stringify(sdkBrowser.file.rows) : brief(sdkBrowser)} · server ${brief(sdkServer)} · CDATA: browser ${cdataBrowser.kind === "read" ? JSON.stringify(cdataBrowser.file.rows[1]) : brief(cdataBrowser)} · server ${cdataServer.ok ? JSON.stringify(cdataServer.file.rows[1]) : brief(cdataServer)}`);

  // ── B5 · the cell rules, literally ──
  const c1900 = await read(blob(excelCells(false)), { fileName: "cells.xlsx" });
  const c1904 = await read(blob(excelCells(true)), { fileName: "cells-1904.xlsx" });
  const b5: string[] = [];
  if (c1900.kind !== "read" || !same(c1900.file.rows, CELLS_ROWS)) b5.push(`1900: ${c1900.kind === "read" ? JSON.stringify(c1900.file.rows).slice(0, 400) : brief(c1900)}`);
  else if (!same(c1900.file.notes, CELLS_NOTES) || c1900.file.blankRows !== 1 || c1900.file.width !== 4) b5.push(`1900 notes ${JSON.stringify(c1900.file.notes)} · blank ${c1900.file.blankRows} · width ${c1900.file.width}`);
  if (c1904.kind !== "read" || !same(c1904.file.rows, CELLS_ROWS_1904) || !same(c1904.file.notes, CELLS_NOTES)) b5.push(`1904: ${c1904.kind === "read" ? JSON.stringify(c1904.file.rows.slice(1, 3)) : brief(c1904)}`);
  ok(L.B5, b5.length === 0, b5.join(" | ") || "every cell its literal, both date systems");

  // ── B6 · merges ──
  const merged = await read(blob(MERGES_BOOK), { fileName: "merges.xlsx" });
  ok(L.B6, merged.kind === "read" && same(merged.file.rows, MERGES_ROWS) && same(merged.file.notes, MERGES_NOTES) && merged.file.blankRows === 1,
    merged.kind === "read" ? `${JSON.stringify(merged.file.rows)} · ${JSON.stringify(merged.file.notes)}` : brief(merged));

  // ── B7 · hidden sheets ──
  const sheets = await read(blob(SHEETS_BOOK), { fileName: "sheets.xlsx" });
  const allHidden = await read(blob(ALL_HIDDEN_BOOK), { fileName: "hidden.xlsx" });
  const sheetNote = sheets.kind === "read" ? sheets.file.notes.join(" ") : "";
  ok(L.B7, sheets.kind === "read" && same(sheets.file.rows, SHEETS_ROWS) && sheets.file.notes.length === 1
    && sheetNote.includes("Wateja") && sheetNote.includes("Mengine") && sheetNote.includes("2 hidden")
    && !sheetNote.includes("Siri") && !sheetNote.includes("Kificho") && !sheetNote.includes("Jalada")
    && allHidden.kind === "refused" && allHidden.refusal === "no_visible_sheet" && allHidden.message === xlsxRefusalSentence("no_visible_sheet"),
    `${sheets.kind === "read" ? `${JSON.stringify(sheets.file.rows)} · ${JSON.stringify(sheets.file.notes)}` : brief(sheets)} · every sheet hidden: ${brief(allHidden)}`);

  // ── B8 · lines ──
  const lines = await read(blob(LINES_BOOK), { fileName: "lines.xlsx" });
  ok(L.B8, lines.kind === "read" && same(lines.file.rows, LINES_ROWS) && lines.file.blankRows === 4 && lines.file.width === 2 && isParsedContactsFile(lines.file),
    lines.kind === "read" ? `${JSON.stringify(lines.file.rows)} · blank ${lines.file.blankRows} · width ${lines.file.width}` : brief(lines));

  // ── B9 · big ──
  const b9: string[] = [];
  for (const [name, make] of [["big-50k.xlsx", big50], ["big-150k.xlsx", big150]] as const) {
    const big = await make();
    const r = await bigRead(impl, name, big.data);
    if (r.kind !== "read") {
      b9.push(`${name}: ${brief(r)}`);
      continue;
    }
    const counted = verdicts(r.file);
    const truth = big.truth.aggregate;
    const lineRun = r.file.rows.every((row, i) => row.line === i + 1);
    log(`B9 · ${name}: ${big.data.length.toLocaleString("en-US")} bytes · ${r.file.rows.length.toLocaleString("en-US")} rows in ${r.stats.ms} ms · ${r.stats.inflatedBytes.toLocaleString("en-US")} bytes inflated · ${JSON.stringify(counted)}`);
    if (big.data.length <= XLSX_MAX_BYTES || !lineRun || r.file.blankRows !== 0 || !isParsedContactsFile(r.file)
      || counted.records !== truth.records || counted.validDistinct !== truth.validDistinct
      || counted.duplicateRows !== truth.duplicateRows || counted.invalidRows !== truth.invalidRows) {
      b9.push(`${name}: ${big.data.length} bytes · ${JSON.stringify(counted)} · truth ${JSON.stringify(truth)} · lines in order ${lineRun}`);
    }
  }
  ok(L.B9, b9.length === 0, b9.join(" | ") || "both big workbooks read to the generator's truth");

  // ── B10 · the row cap ──
  const caps = capBooks();
  const over = await bigRead(impl, "rows-over", caps.over);
  const atCap = await bigRead(impl, "rows-at", caps.at);
  const sheetBytes = XLSX_MAX_ROWS * 40;
  ok(L.B10, over.kind === "refused" && over.refusal === "too_many_rows" && over.message === xlsxRefusalSentence("too_many_rows")
    && !over.message.includes("CSV") && over.stats.inflatedBytes < sheetBytes * 2
    && atCap.kind === "read" && atCap.file.rows.length === XLSX_MAX_ROWS,
    `${XLSX_MAX_ROWS + 1} rows → ${brief(over)} after ${over.kind === "refused" ? over.stats.inflatedBytes : "-"} bytes · ${XLSX_MAX_ROWS} rows → ${brief(atCap)}`);

  // ── B11 · the inflate budget ──
  const bomb = await impl.build({ ...impl.rules, inflateBudget: BOMB_BUDGET })(blob(bombBook(BOMB_BUDGET * 2)), { fileName: "bomb.xlsx" });
  ok(L.B11, impl.rules.inflateBudget === XLSX_BROWSER_INFLATE_BUDGET && XLSX_BROWSER_INFLATE_BUDGET === 1024 * 1024 * 1024
    && bomb.kind === "refused" && bomb.refusal === "too_big_inflated" && bomb.detail === "bomb"
    && bomb.stats.inflatedBytes > BOMB_BUDGET && bomb.stats.inflatedBytes < BOMB_BUDGET * 2,
    `the budget ${impl.rules.inflateBudget} · a sheet inflating to ${BOMB_BUDGET * 2} bytes (declared 1,024) under ${BOMB_BUDGET} → ${brief(bomb)} after ${bomb.kind === "refused" ? bomb.stats.inflatedBytes : "-"} bytes`);

  // ── B12 · an old browser ──
  const bigBook = (await big50()).data;
  const throwing = (): never => {
    throw new TypeError("Unsupported compression format: 'deflate-raw'");
  };
  const old = await impl.build({ ...impl.rules, inflater: throwing })(blob(bigBook), { fileName: "big-50k.xlsx" });
  const tooLarge = xlsxRefusalSentence("too_large", { bytes: bigBook.length });
  const original = globalThis.DecompressionStream;
  class OldBrowserDecompressionStream {
    constructor(format: string) {
      if (format === "deflate-raw") throw new TypeError("Unsupported compression format: 'deflate-raw'");
      return new original(format as CompressionFormat);
    }
  }
  let door: ReadOutcome;
  (globalThis as { DecompressionStream: unknown }).DecompressionStream = OldBrowserDecompressionStream;
  try {
    door = await impl.readFile(new File([bigBook], "big-50k.xlsx"), { onProgress: () => undefined });
  } finally {
    (globalThis as { DecompressionStream: unknown }).DecompressionStream = original;
  }
  ok(L.B12, old.kind === "refused" && old.refusal === "too_large" && old.message === tooLarge && old.stats.inflatedBytes === 0
    && tooLarge.includes(formatFileSize(bigBook.length)) && tooLarge.includes("CSV") && tooLarge.includes(PHONE_FORMAT_REMEDY)
    && door.kind === "refused" && door.sentence === tooLarge,
    `the reader: ${brief(old)} · the door: ${door.kind === "refused" ? door.sentence.slice(0, 90) : door.kind}`);

  // ── B13 · the door ──
  const bigFile = new File([bigBook], "big-50k.xlsx");
  const viaDoor = await impl.readFile(bigFile, { onProgress: () => undefined });
  const direct = await bigRead(impl, "big-50k.xlsx", bigBook);
  const refusedDoor = await impl.readFile(new File([bigDocx()], "barua.xlsx"), { onProgress: () => undefined });
  const small = books.find((b) => b.name === "excel-basic.xlsx");
  const smallDoor = small === undefined ? null : await impl.readFile(new File([small.data], small.name), { onProgress: () => undefined });
  ok(L.B13, viaDoor.kind === "parsed" && viaDoor.file.format === "xlsx" && viaDoor.digest === sha(bigBook) && viaDoor.extraNumbers === 0
    && direct.kind === "read" && same(viaDoor.file.rows, direct.file.rows) && viaDoor.file.fileName === "big-50k.xlsx"
    && refusedDoor.kind === "refused" && refusedDoor.sentence === xlsxRefusalSentence("wrong_format", { kind: "other" })
    && smallDoor !== null && smallDoor.kind === "xlsx" && small !== undefined && smallDoor.base64 === base64Of(small.data),
    `big: ${viaDoor.kind === "parsed" ? `${viaDoor.file.rows.length} rows, digest ${viaDoor.digest.slice(0, 12)}…` : viaDoor.kind === "refused" ? viaDoor.sentence.slice(0, 90) : viaDoor.kind} · a big docx: ${refusedDoor.kind} · a small workbook: ${smallDoor?.kind ?? "-"}`);

  // ── B14 · Stop and the bar ──
  const reports: Array<readonly [number, number | null, number]> = [];
  await impl.build(impl.rules)(blob(bigBook), { fileName: "big-50k.xlsx", onProgress: (r, t, rows) => reports.push([r, t, rows]) });
  const last = reports[reports.length - 1] ?? [0, null, 0];
  const forward = reports.every((p, i) => i === 0 || (p[0] >= reports[i - 1][0] && p[2] >= reports[i - 1][2]));
  const stop = new AbortController();
  const stopped = await impl.build(impl.rules)(blob(bigBook), {
    fileName: "big-50k.xlsx",
    signal: stop.signal,
    onProgress: (_r, total) => {
      if (total !== null) stop.abort();
    },
  });
  ok(L.B14, reports.length >= 2 && last[1] !== null && last[0] === last[1] && last[2] === 50_001 && forward && stopped.kind === "aborted",
    `${reports.length} report(s), the last ${JSON.stringify(last)} · moving forward ${forward} · stopped → ${brief(stopped)}`);

  // ── B15 · pure, and one copy ──
  const specs = (src: string): string[] => [...src.matchAll(/^\s*(?:import|export)\b[^;]*?\bfrom\s*["']([^"']+)["']/gm)].map((m) => m[1]);
  const b15: string[] = [];
  const readSpecs = new Set(specs(impl.sources.read));
  const cellsSpecs = new Set(specs(impl.sources.cells));
  const READ_ALLOWED = ["./parsed-file", "./xlsx-limits", "./xlsx-cells", "./sheet-choice", "./title-rows"];
  for (const s of readSpecs) if (!READ_ALLOWED.includes(s)) b15.push(`xlsx-read.ts imports ${s}`);
  for (const s of cellsSpecs) if (s !== "./parsed-file") b15.push(`xlsx-cells.ts imports ${s}`);
  for (const [file, src] of [["xlsx-read.ts", impl.sources.read], ["xlsx-cells.ts", impl.sources.cells]] as const) {
    if (/^\s*["']use (?:client|server)["']/m.test(src)) b15.push(`${file} carries a directive`);
    for (const token of [/\bBuffer\b/, /\bnode:/, /\brequire\s*\(/, /\bDOMParser\b/, /\bprocess\./]) if (token.test(src)) b15.push(`${file} names ${token.source}`);
  }
  for (const [file, raw] of [["xlsx-read.ts", impl.sources.readRaw], ["xlsx-cells.ts", impl.sources.cellsRaw]] as const) {
    for (let i = 0; i < raw.length; i++) {
      const c = raw.charCodeAt(i);
      if (c === 92 || (c < 32 && c !== 10 && c !== 13) || c === 127) {
        b15.push(`${file}: character ${c} at ${i}`);
        break;
      }
    }
  }
  for (const pin of ["lib/contacts/xlsx-cells.ts", "lib/contacts/xlsx-read.ts"]) if (!impl.pinned.includes(`"${pin}"`)) b15.push(`${pin} is not pinned`);
  if (!specs(impl.sources.server).includes("@/lib/contacts/xlsx-cells")) b15.push("import-xlsx.ts does not import xlsx-cells");
  for (const copy of ["toPrecision(", "toExponential(", "toISOString(", "saved value is", "merged cells; only", "holds an error value", "other sheet"]) {
    if (impl.sources.server.includes(copy)) b15.push(`import-xlsx.ts keeps its own copy (${copy})`);
  }
  ok(L.B15, b15.length === 0, b15.slice(0, 4).join(" | ") || `xlsx-read → ${[...readSpecs].join(", ")} · xlsx-cells → ${[...cellsSpecs].join(", ")} · the server's rules come from xlsx-cells`);

  // ── B16 · the copy ──
  const limitsAt = impl.sources.copy.indexOf("limits:");
  const limits = limitsAt < 0 ? "" : impl.sources.copy.slice(limitsAt, impl.sources.copy.indexOf("as readonly Part[]", limitsAt));
  const tooLargeAgain = xlsxRefusalSentence("too_large", { bytes: 2 * XLSX_MAX_BYTES });
  ok(L.B16, limits !== "" && !/700|XLSX_MAX_BYTES|formatFileSize|Excel file can be/.test(limits) && limits.includes("IMPORT_MAX_ROWS")
    && !impl.sources.copy.includes("XLSX_MAX_BYTES") && !impl.sources.copy.includes("formatFileSize")
    && tooLargeAgain.includes("CSV") && tooLargeAgain.includes(PHONE_FORMAT_REMEDY) && tooLargeAgain.includes(formatFileSize(2 * XLSX_MAX_BYTES)),
    `the limits line: ${limits.split(LF).join(" ").slice(0, 160)}`);
}

/* ══ THE RED PLANTS — each a defect somebody could plausibly write, built in memory ═════════════════════════ */

/** One RULE swapped in the real factory — the walk itself unchanged. */
const withRules = (patch: Partial<XlsxBrowserRules>): XlsxBrowserImpl => ({ ...real(), rules: { ...real().rules, ...patch } });

/** xlsxNumberText without A1.3, in the BROWSER alone: every integer as its digits. */
const exactDigits = (v: number): string => {
  if (!Number.isFinite(v)) return "";
  const n = Number.isInteger(v) ? v : Number(v.toPrecision(15));
  if (!Number.isInteger(n)) return String(n);
  return Number.isSafeInteger(n) ? String(n) : BigInt(n).toString();
};

const PLANTS: readonly RedPlant<XlsxBrowserImpl>[] = [
  {
    name: "A1.3 dropped in the browser alone — a numeric 255713000000 written as its digits there, the server unchanged",
    expect: L.B1,
    impl: () => withRules({ numberText: exactDigits }),
  },
  {
    name: "exceljs's isDateFmt not replicated — every date-formatted serial read as its number",
    expect: L.B2,
    impl: () => withRules({ isDateFormat: () => false }),
  },
  {
    name: "a t=str value decoded once — exceljs's second decoding not replicated",
    expect: L.B3,
    impl: () => withRules({ strText: (text) => text }),
  },
  {
    name: "elements matched by their qualified name — the Open XML SDK's x:row and x:c unseen",
    expect: L.B4,
    impl: () => withRules({ localName: (qualified) => qualified }),
  },
  {
    name: "the date rule off by the 1904 offset — a date1904 workbook's serials read as 1900 ones",
    expect: L.B5,
    impl: () => withRules({ serialToDate: (serial) => excelSerialToDate(serial, false) }),
  },
  {
    name: "phonetic runs joined into the shared string",
    expect: L.B5,
    impl: () => withRules({ phoneticRuns: true }),
  },
  {
    name: "a formula's missing value read as 0",
    expect: L.B5,
    impl: () => withRules({ missingFormulaValue: () => 0 }),
  },
  {
    name: "a merge's covered cell repeats its first cell's value",
    expect: L.B6,
    impl: () => withRules({ coveredText: (master) => master() }),
  },
  {
    name: "a hidden sheet read — every sheet taken as visible",
    expect: L.B7,
    impl: () => withRules({ isVisible: () => true }),
  },
  {
    name: "trailing cells not trimmed",
    expect: L.B8,
    impl: () => withRules({ trimTrailing: false }),
  },
  {
    name: "the row cap set at 100,000 — Ali's 150,000-row workbook refused",
    expect: L.B9,
    impl: () => withRules({ maxRows: 100_000 }),
  },
  {
    name: "the row cap not enforced",
    expect: L.B10,
    impl: () => withRules({ maxRows: Number.POSITIVE_INFINITY }),
  },
  {
    name: "the inflate budget raised to 4 GiB",
    expect: L.B11,
    impl: () => withRules({ inflateBudget: 4 * 1024 * 1024 * 1024 }),
  },
  {
    name: "the budget never checked — a bomb inflated to its end",
    expect: L.B11,
    impl: () => withRules({ overBudget: () => false }),
  },
  {
    name: "the platform never probed — an old browser's throwing constructor surfaces mid-read as unreadable",
    expect: L.B12,
    impl: () => withRules({ platformReady: () => true }),
  },
  {
    name: "the big branch still refusing — a workbook past 700 KB told to save it as CSV",
    expect: L.B13,
    impl: () => ({
      ...real(),
      readFile: async (f, o) =>
        f.size > XLSX_MAX_BYTES && f.name.endsWith(".xlsx")
          ? { kind: "refused", sentence: xlsxRefusalSentence("too_large", { bytes: f.size }), cause: "size" }
          : readContactsFile(f, o),
    }),
  },
  {
    name: "the reader deaf to Stop and silent on the bar",
    expect: L.B14,
    impl: () => ({
      ...real(),
      build: (rules) => {
        const reader = buildXlsxBrowserReader(rules);
        return (file, opts) => reader(file, { fileName: opts?.fileName });
      },
    }),
  },
  {
    name: "xlsx-read.ts imports node:zlib",
    expect: L.B15,
    impl: () => ({ ...real(), sources: { ...real().sources, read: `import { inflateRawSync } from "node:zlib";${LF}${real().sources.read}` } }),
  },
  {
    name: "the server's reader keeps its own copy of the number rule",
    expect: L.B15,
    impl: () => ({
      ...real(),
      sources: { ...real().sources, server: `${real().sources.server}${LF}function ownNumberText(v: number): string { return String(Number(v.toPrecision(15))); }${LF}` },
    }),
  },
  {
    name: "the entrance still says an Excel file can be up to 700 KB",
    expect: L.B16,
    impl: () => ({
      ...real(),
      sources: {
        ...real().sources,
        copy: real().sources.copy.replace("limits:", "limits: [`An Excel file can be up to ${formatFileSize(XLSX_MAX_BYTES)}; `] as readonly Part[], oldLimits:"),
      },
    }),
  },
];

export const xlsxBrowserSection: ImportSection<XlsxBrowserImpl> = {
  name: "xlsx-browser",
  owner: "S15",
  real,
  run,
  plants: PLANTS,
};
