/**
 * THE XLSX READER — the one place an uploaded Excel workbook becomes rows. U27b, 2026-10-02 (decisions C15 · C18 ·
 * C24 · M3 · M6 · A1.3 · A1.4 · A1.6 · A1.8; the shared contract it enforces is U27a's `xlsx-limits.ts`).
 *
 * ⛔ SERVER-ONLY, BY PLACE. It lives under `src/lib/server/`, which `test:contacts-boundary` §1 keeps out of every
 * client graph — the repo carries no `server-only` package, so the directory and that guard are the marker. It is a
 * FUNCTION OF THE BYTES: it reaches no store, Prisma, audit or session module (§5.1 — a parse can never become a
 * membership oracle) and never touches the disk (§5.2): exceljs is loaded IN MEMORY with `xlsx.load`, never through
 * its streaming reader, which spools every sheet to a temp file. One read in flight and the audit row belong to the
 * officer's wrapper, `import-xlsx-run.ts`. The server ACTION ships with its caller in U30's `import-actions.ts` (C24):
 * alone it would red `test:orphan-actions`.
 *
 * ⭐ THE ORDER IS LOAD-BEARING. Every refusal before step 7 is reached without exceljs seeing a byte.
 *   1. A `data:…;base64,` prefix is stripped; a data URL that is not base64 is not ours.
 *   2. ⛔ THE SIZE GATE (A1.4). `xlsxBase64OverCap` reads the EXACT decoded size off the length and the padding and
 *      refuses above 716,800 bytes BEFORE ANY DECODE. A length compare lets 700 KiB + 1 and + 2 bytes through:
 *      716,800, 716,801 and 716,802 bytes all encode to the same 955,736 characters.
 *   3. The alphabet, and a length that is a multiple of 4 — still before any decode.
 *   4. The decode (at most 716,800 bytes by now; the decoded length is checked against the cap again, as a belt).
 *   5. What the bytes ARE, by C18's one classifier (`spreadsheetHeadKind`): a legacy .xls, a password-protected
 *      workbook (Excel wraps one in CFB), an OpenDocument head or plain text is refused with its own sentence.
 *   6. ⭐ THE ZIP PRE-PASS (`inspectXlsxZip`). The zip is walked the way JSZip — exceljs's unzipper — walks it, and
 *      refused wherever the two could see different files: zip64, more than one disk, a local header that names
 *      another file, a name JSZip would resolve to another, a folder that holds data, a duplicate name, bytes after
 *      the end record, an unknown method. An encrypted entry is "protected". .xlsb is told apart by name. Then EVERY
 *      entry is INFLATED FOR REAL under ONE cap shared by the whole workbook, so a bomb — and a bomb whose headers
 *      declare 1 KB — is refused by what it inflates to, never by what it declares; a size its inflation does not
 *      match is refused, as JSZip would refuse it, but here before the whole of it is held; .ods and Strict Open XML
 *      are read off their content; and every `<row` and `<c` element in the workbook is counted against the row cap
 *      and the cell cap — the inflate cap bounds bytes, and exceljs builds an object for every styled cell.
 *   7. exceljs `xlsx.load`, in memory, in a try. A workbook it cannot parse is "unreadable" with the FIXED sentence —
 *      exceljs's own message can quote the file, and it is never surfaced.
 *   8. ⭐ C3b · G2 · THE SHEET: the FIRST VISIBLE sheet, in tab order, whose header row — its first row with anything in
 *      it, read through the one cell switch — U28 maps a Phone column in (`autoMapHeaders`: a phone heading, or a first
 *      row that is itself a contact); else the first visible sheet, as before. A cover page before the contacts is
 *      passed over and the note names the sheet read and its place (`xlsxChosenSheetNote`). ⛔ A hidden sheet is never
 *      read, whatever its columns. Every sheet hidden is `no_visible_sheet`.
 *   9. The rows: ONE typed switch per cell (`xlsxCellText`), the 1-based SHEET row as `line`, blank rows counted,
 *      trailing empty cells trimmed, the sheet's grid capped — both caps before a row's cells are laid out.
 *
 * ⭐ ONE TYPED SWITCH, NEVER `cell.text` (§9 U27's premise was false). exceljs 4.4.0's `cell.text` of a number IS
 * exact, but it renders a Date as `Thu Oct 01 2026 …` and drops a formula result of 0 (`model.result ? … : ''`), and
 * `cell.value` drops it too (`_copyModel` keeps only truthy fields) — so a formula is read from `cell.result`.
 * Integers are written exactly; float noise past Excel's own 15 significant digits is rounded; a genuine decimal is
 * kept (Math.round on every number would corrupt a 3.5 in a column the reader cannot know is not the phone's); a
 * Date reads as ISO; rich text is joined; a hyperlink reads its display text; a boolean reads TRUE or FALSE; an
 * error value, a formula whose saved value is empty or missing, and the covered cells of a merge read blank, with a
 * note naming their rows.
 * ⭐ C3c (2026-10-09) · THOSE RULES LIVE ONCE, IN `src/lib/contacts/xlsx-cells.ts` (`xlsxValueText`, `xlsxNumberText`,
 * the notes): a workbook past 700 KB is read in the officer's browser by `xlsx-read.ts`, which imports the same
 * functions, and `test:contacts-import`'s xlsx-browser section reads a corpus through both readers and requires the
 * identical file. This reader's own steps — the size gate, the pre-pass, exceljs, the sheet — are unchanged.
 *
 * 🔴 EXCEL'S NUMERIC SHORTENED FORM (A1.3). A CSV holding Excel's display of a 12-digit number, re-saved as .xlsx,
 * stores the NUMBER 255713000000 — a valid-looking number that belongs to a stranger. So a NUMERIC value that is an
 * integer of at least 1e11 and divisible by 1e6 is written as Excel's scientific text (255713000000 reads
 * `2.55713E+11`), and a TEXT cell already in that form is kept verbatim: U28's one detector, applied in
 * `draftContactRow`, then makes the row invalid with the shortened-number sentence. ⛔ THE READER FLAGS NOTHING
 * ITSELF (M6) — one detector, one sentence, one place. A genuine number ending in six zeros is refused too: the safe
 * side, and the sentence sends the officer back to the formatted column.
 *
 * ⛔ NOTHING HERE QUOTES THE FILE (§5.14). Every refusal is `xlsxRefusalSentence`, the ONE copy table, whose CSV
 * sentences all carry the ONE phone-format remedy (A1.6); a note names rows, never what was in them — and a sheet's
 * title only in G2's note, through the copy table's one sheet-name rule (seven or more digits are never echoed).
 * `XlsxReadStats` is counts only — the audit row is built from it.
 *
 * ⭐ EVERY STEP IS A SEAM (`XLSX_READER_RULES`). `test:contacts-import`'s `xlsx` section plants its in-memory red
 * defects by swapping ONE rule in `buildXlsxReader`, the walk itself unchanged.
 */
import ExcelJS from "exceljs";
import { inflateRawSync } from "node:zlib";
import type { ParsedContactsFile, ParsedRow } from "@/lib/contacts/parsed-file";
import { autoMapHeaders } from "@/lib/contacts/contact-fields";
// ⭐ C3c · the cell rules and the notes live ONCE in the client-safe `xlsx-cells.ts`: the browser's reader of a workbook
// past 700 KB (`xlsx-read.ts`) imports the very same functions, and `test:contacts-import`'s xlsx-browser section holds
// the two readers to one reading of the same bytes.
import {
  xlsxCellNotes,
  xlsxNumberText,
  xlsxOtherSheetsNote,
  xlsxValueText,
  type CellFlag,
  type CellRead,
  type NumberText,
} from "@/lib/contacts/xlsx-cells";
import {
  ODS_MIMETYPE,
  XLSX_MAX_BYTES,
  XLSX_MAX_ENTRIES,
  XLSX_MAX_INFLATED_BYTES,
  XLSX_MAX_ROWS,
  base64DecodedBytes,
  spreadsheetHeadKind,
  xlsxBase64OverCap,
  xlsxChosenSheetNote,
  xlsxRefusalSentence,
} from "@/lib/contacts/xlsx-limits";
import type { SpreadsheetHeadKind, WrongFormatKind, XlsxRefusal, XlsxRefusalContext } from "@/lib/contacts/xlsx-limits";

/* ══ WHAT A READ RETURNS ═════════════════════════════════════════════════════════════════════════ */

/** What reaches the reader: the file as base64 (a browser's `data:…;base64,` URL is taken as it is) and its name. */
export type XlsxReadInput = { readonly base64: string; readonly fileName?: string | null };

/**
 * ⛔ COUNTS ONLY. The audit row is built from this and nothing else, so a file name, a sheet title or a cell can never
 * ride along. `bytes` is the decoded size — read off the base64 length when the gate refused before any decode.
 */
export type XlsxReadStats = {
  readonly bytes: number;
  readonly inflatedBytes: number;
  readonly entries: number;
  readonly rows: number;
  readonly blankRows: number;
  readonly width: number;
  readonly sheets: number;
  readonly ms: number;
};

/** The stats of a read that never began (busy, forbidden). */
export const XLSX_ZERO_STATS: XlsxReadStats = { bytes: 0, inflatedBytes: 0, entries: 0, rows: 0, blankRows: 0, width: 0, sheets: 0, ms: 0 };

/**
 * A read: the file, or the refusal. `message` is the one sentence the officer sees (`xlsxRefusalSentence`); `kind` is
 * the wrong format, when that is the refusal; `detail` is a fixed word for the audit row and the suite — never shown.
 */
export type XlsxReadResult =
  | { readonly ok: true; readonly file: ParsedContactsFile; readonly stats: XlsxReadStats }
  | {
      readonly ok: false;
      readonly refusal: XlsxRefusal;
      readonly kind: WrongFormatKind | null;
      readonly detail: string | null;
      readonly message: string;
      readonly stats: XlsxReadStats;
    };

/**
 * A refusal, its sentence read from the ONE copy table. ⭐ U30's action builds its `forbidden` reply with this, and the
 * officer wrapper its `busy` one. `message` overrides the sentence only for a seam the suite plants.
 */
export function xlsxRefusalResult(
  refusal: XlsxRefusal,
  ctx: XlsxRefusalContext = {},
  detail: string | null = null,
  stats: XlsxReadStats = XLSX_ZERO_STATS,
  message: string = xlsxRefusalSentence(refusal, ctx),
): XlsxReadResult {
  return { ok: false, refusal, kind: refusal === "wrong_format" ? ctx.kind ?? "other" : null, detail, message, stats };
}

/* ══ THE ZIP PRE-PASS — what exceljs's unzipper would see, measured before it sees it ═════════════ */

/** One central-directory entry, as the walk read it. ⛔ `declaredSize` is what the headers SAY, and is never trusted. */
export type ZipEntryInfo = {
  readonly name: string;
  readonly flags: number;
  readonly method: number;
  readonly compressedSize: number;
  readonly declaredSize: number;
  readonly dataStart: number;
};

/** What one entry measured: its inflated bytes, past the budget, or not inflatable at all. */
export type EntryMeasure =
  | { readonly kind: "ok"; readonly bytes: Uint8Array }
  | { readonly kind: "over" }
  | { readonly kind: "corrupt" };

/** Measures one entry against what is left of the whole workbook's budget. */
export type MeasureEntry = (entry: ZipEntryInfo, data: Uint8Array, budget: number) => EntryMeasure;

/** The pre-pass's verdict. `detail` is a fixed word for the audit row and the suite — never shown to an officer. */
export type XlsxInspection =
  | { readonly ok: true; readonly entries: number; readonly inflatedBytes: number; readonly rowElements: number; readonly cellElements: number }
  | {
      readonly ok: false;
      readonly refusal: XlsxRefusal;
      readonly kind: WrongFormatKind | null;
      readonly detail: string;
      readonly entries: number;
      readonly inflatedBytes: number;
    };

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
/** The DOS directory attribute: JSZip calls any entry carrying it a folder, and exceljs skips folders. */
const EXTERNAL_DOS_DIRECTORY = 0x0010;
const METHOD_STORED = 0;
const METHOD_DEFLATED = 8;
const METHOD_AES = 99;
/** exceljs reads the workbook part by this exact name, after dropping one leading slash. */
const WORKBOOK_XML = "xl/workbook.xml";
/** Where Excel's binary workbook keeps its workbook part. */
const WORKBOOK_BIN = "xl/workbook.bin";
const MIMETYPE_ENTRY = "mimetype";
/** The SpreadsheetML namespace a Strict Open XML workbook declares (transitional is schemas.openxmlformats.org). */
const STRICT_NAMESPACE = "purl.oclc.org/ooxml/spreadsheetml/main";
const ROW_OPEN = Buffer.from("<row", "latin1");
const CELL_OPEN = Buffer.from("<c", "latin1");

/**
 * ⚠️ PROVISIONAL, like the caps in xlsx-limits.ts (the suite asserts it is at least twice the densest realistic
 * fixture's count): the most cell elements a workbook may hold — five a row across XLSX_MAX_ROWS. The inflate cap
 * bounds BYTES, not what exceljs builds from them: it makes a Cell object for every `<c>` that carries a style,
 * even an empty one, and a forged sheet of identical `<c s="1"/>` elements deflates a thousandfold — about 290 rows
 * of 16,384 such cells fit under the inflate cap and would ask exceljs for 4.75 million objects. A real 700 KB sheet
 * carries a few hundred thousand cells at most: each one's varying address costs it compressed bytes.
 */
export const XLSX_MAX_CELL_ELEMENTS = XLSX_MAX_ROWS * 5;

/**
 * ⭐ THE REAL MEASURE — a capped inflate. `maxOutputLength` stops zlib one byte past the budget, so a bomb costs at most
 * the budget to discover, and the size the headers declare plays no part in it.
 */
export const measureZipEntry: MeasureEntry = (entry, data, budget) => {
  if (entry.method === METHOD_STORED) return data.length > budget ? { kind: "over" } : { kind: "ok", bytes: data };
  try {
    const out = inflateRawSync(data, { maxOutputLength: Math.max(1, budget + 1) });
    return out.length > budget ? { kind: "over" } : { kind: "ok", bytes: out };
  } catch (error) {
    return isBufferTooLarge(error) ? { kind: "over" } : { kind: "corrupt" };
  }
};

function isBufferTooLarge(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "ERR_BUFFER_TOO_LARGE";
}

type ZipWalk =
  | { readonly ok: true; readonly entries: readonly ZipEntryInfo[] }
  | { readonly ok: false; readonly refusal: XlsxRefusal; readonly kind: WrongFormatKind | null; readonly detail: string };

const walkRefusal = (refusal: XlsxRefusal, detail: string, kind: WrongFormatKind | null = null): ZipWalk =>
  ({ ok: false, refusal, kind, detail });

function sameBytes(bytes: Uint8Array, a: number, b: number, length: number): boolean {
  for (let i = 0; i < length; i++) if (bytes[a + i] !== bytes[b + i]) return false;
  return true;
}

/** JSZip's own path resolution (`utils.resolve`, applied to every name it loads): `.` and empty middle segments drop, `..` pops. */
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
 * The structure, read the way JSZip reads it — and refused wherever the two could disagree, so any zip this accepts
 * is the zip exceljs will see: the LAST end record in the file (JSZip's `lastIndexOfSignature`), ending the file
 * exactly; the central directory filling exactly the bytes between its offset and that record, with exactly the
 * record's count of entries (JSZip reads entries until a signature fails, not by the count); every local header
 * before the directory, naming the same file as its central entry (JSZip takes the LOCAL name); every name already
 * in the form JSZip resolves it to (`xl/./workbook.xml` would land on `xl/workbook.xml` there and overwrite it); no
 * folder entry that holds data (exceljs skips folders); no zip64, no second disk, no unicode-path field, no
 * duplicate name (one leading slash ignored, as exceljs ignores it), only stored or deflated data.
 */
function walkZip(bytes: Uint8Array): ZipWalk {
  const length = bytes.length;
  if (length < EOCD_SIZE) return walkRefusal("unreadable", "no_end_record");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u16 = (at: number): number => view.getUint16(at, true);
  const u32 = (at: number): number => view.getUint32(at, true);

  let eocd = -1;
  for (let i = length - 4; i >= 0; i--) {
    if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x05 && bytes[i + 3] === 0x06) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0 || eocd + EOCD_SIZE > length) return walkRefusal("unreadable", "no_end_record");
  const disk = u16(eocd + 4);
  const directoryDisk = u16(eocd + 6);
  const onThisDisk = u16(eocd + 8);
  const total = u16(eocd + 10);
  const directorySize = u32(eocd + 12);
  const directoryOffset = u32(eocd + 16);
  const commentLength = u16(eocd + 20);
  if (disk === U16_MAX || directoryDisk === U16_MAX || onThisDisk === U16_MAX || total === U16_MAX
    || directorySize === U32_MAX || directoryOffset === U32_MAX) {
    return walkRefusal("unreadable", "zip64");
  }
  if (disk !== 0 || directoryDisk !== 0 || onThisDisk !== total) return walkRefusal("unreadable", "multi_disk");
  if (eocd + EOCD_SIZE + commentLength !== length) return walkRefusal("unreadable", "layout");
  if (directoryOffset + directorySize !== eocd) {
    const locator = eocd >= ZIP64_LOCATOR_SIZE && u32(eocd - ZIP64_LOCATOR_SIZE) === SIG_ZIP64_LOCATOR;
    return walkRefusal("unreadable", locator ? "zip64" : "layout");
  }
  if (total > XLSX_MAX_ENTRIES) return walkRefusal("too_big_inflated", "entries");

  const entries: ZipEntryInfo[] = [];
  const names = new Set<string>();
  let at = directoryOffset;
  while (at + 4 <= eocd && u32(at) === SIG_CENTRAL) {
    if (entries.length >= XLSX_MAX_ENTRIES) return walkRefusal("too_big_inflated", "entries");
    if (at + CENTRAL_SIZE > eocd) return walkRefusal("unreadable", "layout");
    const flags = u16(at + 8);
    const method = u16(at + 10);
    const compressedSize = u32(at + 20);
    const declaredSize = u32(at + 24);
    const nameLength = u16(at + 28);
    const extraLength = u16(at + 30);
    const entryCommentLength = u16(at + 32);
    const diskStart = u16(at + 34);
    const external = u32(at + 38);
    const localOffset = u32(at + 42);
    const nameAt = at + CENTRAL_SIZE;
    const extraAt = nameAt + nameLength;
    const next = extraAt + extraLength + entryCommentLength;
    if (next > eocd) return walkRefusal("unreadable", "layout");
    if (compressedSize === U32_MAX || declaredSize === U32_MAX || localOffset === U32_MAX || diskStart === U16_MAX) {
      return walkRefusal("unreadable", "zip64");
    }
    for (let p = extraAt; p + 4 <= extraAt + extraLength; p += 4 + u16(p + 2)) {
      const id = u16(p);
      if (id === EXTRA_ZIP64) return walkRefusal("unreadable", "zip64");
      if (id === EXTRA_UNICODE_PATH) return walkRefusal("unreadable", "unicode_path");
    }
    if ((flags & (FLAG_ENCRYPTED | FLAG_STRONG_ENCRYPTION)) !== 0 || method === METHOD_AES) {
      return walkRefusal("wrong_format", "encrypted", "protected");
    }
    if (method !== METHOD_STORED && method !== METHOD_DEFLATED) return walkRefusal("unreadable", "method");
    if (diskStart !== 0) return walkRefusal("unreadable", "multi_disk");
    if (localOffset + LOCAL_SIZE > directoryOffset || u32(localOffset) !== SIG_LOCAL) return walkRefusal("unreadable", "layout");
    const localNameLength = u16(localOffset + 26);
    const localExtraLength = u16(localOffset + 28);
    const dataStart = localOffset + LOCAL_SIZE + localNameLength + localExtraLength;
    if (dataStart + compressedSize > directoryOffset) return walkRefusal("unreadable", "layout");
    if (localNameLength !== nameLength || !sameBytes(bytes, nameAt, localOffset + LOCAL_SIZE, nameLength)) {
      return walkRefusal("unreadable", "name_mismatch");
    }
    const name = Buffer.from(bytes.buffer, bytes.byteOffset + nameAt, nameLength).toString("utf8");
    if (jszipResolve(name) !== name) return walkRefusal("unreadable", "name");
    const folder = (external & EXTERNAL_DOS_DIRECTORY) !== 0 || name.endsWith("/");
    if (folder && (compressedSize !== 0 || declaredSize !== 0)) return walkRefusal("unreadable", "folder");
    const key = name.startsWith("/") ? name.slice(1) : name;
    if (names.has(key)) return walkRefusal("unreadable", "duplicate");
    names.add(key);
    entries.push({ name, flags, method, compressedSize, declaredSize, dataStart });
    at = next;
  }
  if (at !== eocd || entries.length !== total) return walkRefusal("unreadable", "layout");
  return { ok: true, entries };
}

/**
 * Elements opening with `open` and followed by whitespace, `>` or `/`: `<row` is a row, never `<rowBreaks>`; `<c` is
 * a cell, never `<col>`, `<cfRule>`, `<cellXfs>` or a chart's `<c:…>`.
 */
function countElements(content: Buffer, open: Buffer): number {
  let count = 0;
  for (let at = content.indexOf(open); at !== -1; at = content.indexOf(open, at + open.length)) {
    const after = content[at + open.length];
    if (after === 0x20 || after === 0x09 || after === 0x0a || after === 0x0d || after === 0x3e || after === 0x2f) count++;
  }
  return count;
}

/**
 * ⭐ THE PRE-PASS (step 6). Walks the zip, refuses .xlsb and a zip that is no workbook by name, inflates EVERY entry for
 * real under one budget for the whole workbook — counting row and cell elements across every entry, whatever it is
 * named, because exceljs's own sheet pattern is unanchored — and then reads .ods and Strict Open XML off the content.
 */
export function inspectXlsxZip(bytes: Uint8Array, measure: MeasureEntry = measureZipEntry): XlsxInspection {
  const walked = walkZip(bytes);
  if (!walked.ok) return { ok: false, refusal: walked.refusal, kind: walked.kind, detail: walked.detail, entries: 0, inflatedBytes: 0 };
  const entries = walked.entries;
  const partName = (e: ZipEntryInfo): string => (e.name.startsWith("/") ? e.name.slice(1) : e.name);
  const loweredName = (e: ZipEntryInfo): string => partName(e).toLowerCase();
  const refused = (refusal: XlsxRefusal, detail: string, kind: WrongFormatKind | null, inflatedBytes: number): XlsxInspection =>
    ({ ok: false, refusal, kind, detail, entries: entries.length, inflatedBytes });

  if (entries.some((e) => loweredName(e) === WORKBOOK_BIN)) return refused("wrong_format", "xlsb", "xlsb", 0);
  const hasWorkbook = entries.some((e) => partName(e) === WORKBOOK_XML);
  const hasMimetype = entries.some((e) => loweredName(e) === MIMETYPE_ENTRY);
  if (!hasWorkbook && !hasMimetype) return refused("wrong_format", "not_a_workbook", "other", 0);

  let used = 0;
  let rowElements = 0;
  let cellElements = 0;
  let ods = false;
  let strict = false;
  for (const e of entries) {
    const measured = measure(e, bytes.subarray(e.dataStart, e.dataStart + e.compressedSize), XLSX_MAX_INFLATED_BYTES - used);
    if (measured.kind === "over") return refused("too_big_inflated", "bomb", null, used);
    if (measured.kind === "corrupt") return refused("unreadable", "inflate", null, used);
    if (measured.bytes.length !== e.declaredSize) return refused("unreadable", "size_mismatch", null, used);
    used += measured.bytes.length;
    const content = Buffer.from(measured.bytes.buffer, measured.bytes.byteOffset, measured.bytes.byteLength);
    rowElements += countElements(content, ROW_OPEN);
    cellElements += countElements(content, CELL_OPEN);
    if (loweredName(e) === MIMETYPE_ENTRY && content.subarray(0, ODS_MIMETYPE.length).toString("latin1") === ODS_MIMETYPE) ods = true;
    if (partName(e) === WORKBOOK_XML && content.indexOf(STRICT_NAMESPACE) !== -1) strict = true;
  }
  if (ods) return refused("wrong_format", "ods", "ods", used);
  if (!hasWorkbook) return refused("wrong_format", "not_a_workbook", "other", used);
  if (strict) return refused("wrong_format", "strict", "strict", used);
  if (rowElements > XLSX_MAX_ROWS) return refused("too_many_rows", "rows", null, used);
  if (cellElements > XLSX_MAX_CELL_ELEMENTS) return refused("too_big_inflated", "cells", null, used);
  return { ok: true, entries: entries.length, inflatedBytes: used, rowElements, cellElements };
}

/* ══ THE ONE CELL SWITCH ═════════════════════════════════════════════════════════════════════════ */

/**
 * The part of an exceljs cell the switch may read: its type, its value and a formula's cached result. ⛔ `text` is
 * here only so the suite can plant the reader that reads it; the real switch never does.
 */
export type XlsxCellLike = { readonly type: number; readonly value: unknown; readonly result?: unknown; readonly text: string };

// ⭐ C3c · the shared rules, re-exported where the server's callers and `test:contacts-import`'s xlsx section import them.
export { xlsxNumberText };
export type { CellFlag, CellRead, NumberText };

/**
 * ⭐ THE switch — one cell to its text. A covered merge cell is blank (its value is the first cell's, and repeating it
 * would put one number on two lines); a formula is its CACHED result, read from `result` because exceljs's `value`
 * copy drops a result of 0; everything else by the shape of its value, through the ONE value rule both readers share
 * (`xlsxValueText`, xlsx-cells.ts). A string is kept verbatim — never trimmed, never "repaired": `2.55713E+11` stays
 * exactly that, for U28's one detector.
 */
export function xlsxCellText(cell: XlsxCellLike, numberText: NumberText = xlsxNumberText): CellRead {
  if (cell.type === ExcelJS.ValueType.Merge) return { text: "", flag: "merged" };
  if (cell.type === ExcelJS.ValueType.Formula) {
    const result = cell.result;
    return result === undefined || result === null ? { text: "", flag: "formula_without_result" } : xlsxValueText(result, numberText);
  }
  return xlsxValueText(cell.value, numberText);
}

/* ══ THE RULES — every step a seam ═══════════════════════════════════════════════════════════════ */

/**
 * ⚠️ The most cells the read sheet may span, counted to each row's LAST non-empty cell: twenty columns a row across
 * XLSX_MAX_ROWS. A row with one cell in the last column (16,384) spans 16,384, and the grid is laid out densely, so
 * without it 700 KB of far-right cells would ask for gigabytes. Real contact sheets are far inside it.
 */
export const XLSX_MAX_GRID_CELLS = XLSX_MAX_ROWS * 20;

/** Every base64 character, and at most two `=` of padding. */
const BASE64_SHAPE = /^[A-Za-z0-9+/]*={0,2}$/;

/** ⭐ exceljs, IN MEMORY — `xlsx.load` holds the workbook in the heap; its streaming reader spools sheets to tmp. */
export async function loadWorkbookInMemory(bytes: Buffer): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes as unknown as ExcelJS.Buffer);
  return workbook;
}

export type XlsxReaderRules = {
  /** ⛔ A1.4 — the EXACT decoded size from the length and padding, before a byte is decoded. */
  readonly overCap: (base64: string) => boolean;
  /** The alphabet and a length that is a multiple of 4. */
  readonly wellFormed: (base64: string) => boolean;
  readonly decode: (base64: string) => Buffer;
  /** C18's one classifier. */
  readonly sniff: (bytes: Uint8Array) => SpreadsheetHeadKind;
  readonly inspect: (bytes: Uint8Array, measure: MeasureEntry) => XlsxInspection;
  readonly measureEntry: MeasureEntry;
  readonly load: (bytes: Buffer) => Promise<ExcelJS.Workbook>;
  /** The sheet that is read, from the sheets in tab order — ⭐ C3b · G2: `hasPhone` says whether a sheet's header row maps
   *  a Phone column (`hasPhoneColumn` over the sheet's first row with anything in it). */
  readonly pickSheet: (
    sheets: readonly ExcelJS.Worksheet[],
    hasPhone: (sheet: ExcelJS.Worksheet) => boolean,
  ) => ExcelJS.Worksheet | undefined;
  /** ⭐ C3b · G2 · does this header row map a Phone column? U28's own reading (`autoMapHeaders`): a phone heading, or a
   *  first row that is itself a contact (S15-5). */
  readonly hasPhoneColumn: (header: readonly string[]) => boolean;
  readonly cellText: (cell: XlsxCellLike, numberText: NumberText) => CellRead;
  readonly numberText: NumberText;
  readonly maxGridCells: number;
  /** The sentence for a workbook exceljs could not parse — ⛔ fixed, whatever exceljs said. */
  readonly loadFailure: (error: unknown) => string;
};

/** ⭐ THE SHIPPED RULES. */
export const XLSX_READER_RULES: XlsxReaderRules = {
  overCap: xlsxBase64OverCap,
  wellFormed: (base64) => base64.length % 4 === 0 && BASE64_SHAPE.test(base64),
  decode: (base64) => Buffer.from(base64, "base64"),
  sniff: spreadsheetHeadKind,
  inspect: inspectXlsxZip,
  measureEntry: measureZipEntry,
  load: loadWorkbookInMemory,
  // ⭐ C3b · G2 · the first VISIBLE sheet whose header row maps a Phone column, else the first visible one; never a hidden one.
  pickSheet: (sheets, hasPhone) => {
    const visible = sheets.filter((sheet) => sheet.state === "visible");
    return visible.find(hasPhone) ?? visible[0];
  },
  hasPhoneColumn: (header) => {
    const read = autoMapHeaders(header);
    return read.mapping.phone !== undefined || read.headerless;
  },
  cellText: xlsxCellText,
  numberText: xlsxNumberText,
  maxGridCells: XLSX_MAX_GRID_CELLS,
  loadFailure: () => xlsxRefusalSentence("unreadable"),
};

/* ══ THE READER ══════════════════════════════════════════════════════════════════════════════════ */

/** The field without a browser's data-URL prefix — or null for a data URL that is not base64. */
function stripDataUrl(field: string): string | null {
  if (!field.startsWith("data:")) return field;
  const comma = field.indexOf(",");
  if (comma < 0) return null;
  return field.slice(5, comma).toLowerCase().endsWith(";base64") ? field.slice(comma + 1) : null;
}

/*
 * The notes name ROWS — never a cell's value, and a sheet's title only in G2's note, through the copy table's one
 * sheet-name rule (`xlsxChosenSheetNote` — §5.14). ⭐ C3c · their sentences live in `xlsx-cells.ts` (`xlsxCellNotes`,
 * `xlsxOtherSheetsNote`), shared with the browser's reader, so a workbook says the same thing whichever reader read it.
 */

/**
 * ⭐ C3b · G2 · a sheet's HEADER ROW as U28 needs it to tell a contacts sheet from a cover page: the texts of its first row
 * with anything in it, each cell through the ONE switch, in column order. Whether a Phone column is among them is all
 * that is asked, so the empty cells are left out — ⛔ no row is laid out densely (a cell in column XFD would otherwise
 * ask for 16,384 slots on every sheet), and the work stays inside the pre-pass's row and cell caps.
 */
function headerRowOf(sheet: ExcelJS.Worksheet, rules: XlsxReaderRules): string[] {
  const found: { header: string[] | null } = { header: null };
  sheet.eachRow((row) => {
    if (found.header !== null) return;
    const texts: string[] = [];
    row.eachCell((cell) => {
      const text = rules.cellText(cell, rules.numberText).text;
      if (text !== "") texts.push(text);
    });
    if (texts.length > 0) found.header = texts;
  });
  return found.header ?? [];
}

/** A reader built from `rules`. ⛔ It never throws: anything unforeseen is the FIXED unreadable sentence. */
export function buildXlsxReader(rules: XlsxReaderRules): (input: XlsxReadInput) => Promise<XlsxReadResult> {
  return async (input) => {
    const started = Date.now();
    const tally = { bytes: 0, inflatedBytes: 0, entries: 0, rows: 0, blankRows: 0, width: 0, sheets: 0 };
    const stats = (): XlsxReadStats => ({ ...tally, ms: Date.now() - started });
    const refuse = (refusal: XlsxRefusal, ctx: XlsxRefusalContext, detail: string, message?: string): XlsxReadResult =>
      xlsxRefusalResult(refusal, ctx, detail, stats(), message ?? xlsxRefusalSentence(refusal, ctx));
    try {
      // 1 · the field
      const field = stripDataUrl(typeof input?.base64 === "string" ? input.base64 : "");
      if (field === null) return refuse("not_base64", {}, "data_url");
      // 2 · ⛔ A1.4 — THE size gate: the exact decoded size from the length alone, before any decode
      tally.bytes = base64DecodedBytes(field);
      if (rules.overCap(field)) return refuse("too_large", { bytes: tally.bytes }, "size");
      // 3 · the alphabet — still before any decode
      if (!rules.wellFormed(field)) return refuse("not_base64", {}, "alphabet");
      // 4 · the decode, and the cap once more on the real bytes
      const bytes = rules.decode(field);
      tally.bytes = bytes.length;
      if (bytes.length > XLSX_MAX_BYTES) return refuse("too_large", { bytes: bytes.length }, "size");
      if (bytes.length === 0) return refuse("empty", {}, "no_bytes");
      // 5 · what the bytes are (C18)
      const head = rules.sniff(bytes);
      if (head !== "xlsx") return refuse("wrong_format", { kind: head ?? "other" }, `sniff_${head ?? "other"}`);
      // 6 · the zip pre-pass
      const inspection = rules.inspect(bytes, rules.measureEntry);
      tally.entries = inspection.entries;
      tally.inflatedBytes = inspection.inflatedBytes;
      if (!inspection.ok) return refuse(inspection.refusal, inspection.kind === null ? {} : { kind: inspection.kind }, inspection.detail);
      // 7 · exceljs, in memory
      let workbook: ExcelJS.Workbook;
      try {
        workbook = await rules.load(bytes);
      } catch (error) {
        return refuse("unreadable", {}, "load", rules.loadFailure(error));
      }
      // 8 · ⭐ C3b · G2 — the first VISIBLE sheet whose header row maps a Phone column, else the first visible one
      const sheets = workbook.worksheets;
      tally.sheets = sheets.length;
      if (sheets.length === 0) return refuse("empty", {}, "no_sheets");
      const sheet = rules.pickSheet(sheets, (candidate) => rules.hasPhoneColumn(headerRowOf(candidate, rules)));
      if (sheet === undefined) return refuse("no_visible_sheet", {}, "all_hidden");
      // 9 · the rows — sheet rows in order, each cell through the ONE switch
      const rows: ParsedRow[] = [];
      const flagged: Record<CellFlag, number[]> = { formula_without_result: [], error: [], merged: [] };
      const halt: { why: "rows" | "grid" | null } = { why: null };
      let grid = 0;
      sheet.eachRow((row, line) => {
        if (halt.why !== null) return;
        const found: Array<readonly [number, string]> = [];
        const rowFlags = new Set<CellFlag>();
        let last = 0;
        row.eachCell((cell, column) => {
          const read = rules.cellText(cell, rules.numberText);
          if (read.flag !== null) rowFlags.add(read.flag);
          if (read.text !== "") {
            found.push([column, read.text]);
            if (column > last) last = column;
          }
        });
        for (const flag of rowFlags) flagged[flag].push(line);
        if (last === 0) return; // blank: every cell empty — counted below from the gaps in the lines
        if (line > XLSX_MAX_ROWS) {
          halt.why = "rows";
          return;
        }
        grid += last;
        if (grid > rules.maxGridCells) {
          halt.why = "grid";
          return;
        }
        const cells = new Array<string>(last).fill("");
        for (const [column, text] of found) cells[column - 1] = text;
        rows.push({ line, cells });
      });
      if (halt.why === "rows") return refuse("too_many_rows", {}, "row_number");
      if (halt.why === "grid") return refuse("too_big_inflated", {}, "grid");
      if (rows.length === 0) return refuse("empty", { sheet: sheet.name }, "no_rows");

      const notes: string[] = [];
      // ⭐ C3b · G2 · a sheet past the first visible one was read (a cover page before it): the note names it and its place.
      if (sheet !== sheets.find((s) => s.state === "visible")) {
        notes.push(xlsxChosenSheetNote(sheet.name, sheets.indexOf(sheet) + 1, sheets.length));
      } else if (sheets.length > 1) {
        notes.push(xlsxOtherSheetsNote(sheets.length - 1, sheets.filter((s) => s !== sheet && s.state !== "visible").length));
      }
      notes.push(...xlsxCellNotes(flagged));

      const blankRows = rows[rows.length - 1].line - rows.length;
      const width = rows.reduce((widest, r) => Math.max(widest, r.cells.length), 0);
      tally.rows = rows.length;
      tally.blankRows = blankRows;
      tally.width = width;
      const fileName = typeof input.fileName === "string" && input.fileName.trim() !== "" ? input.fileName : null;
      const file: ParsedContactsFile = { format: "xlsx", fileName, rows, width, blankRows, notes, unreadable: [] };
      return { ok: true, file, stats: stats() };
    } catch {
      return refuse("unreadable", {}, "reader");
    }
  };
}

/** ⭐ THE reader, on the shipped rules. The officer reaches it through `readXlsxForOfficer` (`import-xlsx-run.ts`). */
export const readXlsxContacts: (input: XlsxReadInput) => Promise<XlsxReadResult> = buildXlsxReader(XLSX_READER_RULES);
