/**
 * HOW BIG AN EXCEL FILE MAY BE, WHAT ITS FIRST BYTES SAY IT IS, AND THE ONE SET OF SENTENCES THAT REFUSES IT —
 * U27a, 2026-10-01 (decisions C18 and M6; the reader that enforces these is U27b, the screen that says them U30).
 *
 * ⭐ THE CAP IS DERIVED, NOT CHOSEN. An Excel file reaches the server through ONE server action (OD29: no new
 * multipart endpoint), and Next caps a server action's WHOLE request body at 1 MB — the installed Next 16 sets
 * `defaultBodySizeLimit = '1 MB'` = 1024 * 1024 bytes in `next/dist/server/app-render/action-handler.js`, and
 * `next.config.ts` raises nothing (OD29 forbids it: the money forms inherit that ceiling). The file travels as
 * base64, which is 4 characters for every 3 bytes, inside a multipart envelope. So:
 *     base64LengthFor(700 KiB) = 955,736 characters, + an 8 KiB envelope allowance = 963,928 ≤ 1,048,576.
 * That leaves 84,648 bytes of the body unused; the largest file the 1 MB body could carry is about 762 KiB.
 * `test:contacts-boundary` §6 re-checks that sum, and fails loudly if a Next upgrade moves the default.
 * ⛔ Raising XLSX_MAX_BYTES past what the sum allows does not let a bigger file in: Next answers 413 with its own
 * framework error before any of these sentences can be shown.
 * ⭐ THE GATE IS EXACT (A1.4). 716,800, 716,801 and 716,802 bytes all encode to the same 955,736 base64 characters,
 * so a length compare lets two over-cap sizes reach the decoder. `xlsxBase64OverCap` reads the decoded size off the
 * length and the padding (3·len/4 − padding) and refuses anything above 716,800 bytes before a byte is decoded.
 *
 * ⭐ ONE SNIFFER, ONE COPY TABLE (decision C18). The CSV reader's format check (U25's detectFormat), the import
 * dialog (before it posts) and the server's reader all decide "is this a spreadsheet, and which kind" HERE, and
 * every refusal an officer reads about a spreadsheet comes from `xlsxRefusalSentence`. A second ".xls" sentence
 * anywhere else is the drift this file exists to prevent.
 *
 * ⛔ THE REMEDY CARRIES ITS OWN WARNING. "Save it as CSV" is the way past the cap — but Excel writes a 12-digit
 * number in General format to CSV as its DISPLAY, `2.55713E+11`, and the last digits are gone for good. So every
 * sentence here that sends an officer to CSV also carries the format step, `PHONE_FORMAT_REMEDY` — ONE clause
 * (A1.6), which the Phone column's hint and the shortened-number sentence read too, so the officer is never told
 * two different fixes for one problem. `test:contacts-boundary` §7.3 fails on a CSV sentence without it, and §2.7
 * on the clause spelled out anywhere else in the contacts code. ⛔ "A CSV has no file-size limit" is a PROMISE, said
 * PRECISELY (C3b, 2026-10-09): a CSV has no byte cap — the CSV path (U25, U29) must never add one — but one import
 * takes at most `XLSX_MAX_ROWS` rows (X28: `IMPORT_MAX_ROWS` IS this constant), and the sentence says that number,
 * formatted from the constant. So a workbook refused for its ROWS is never sent to CSV (a CSV of the same rows is
 * refused too): it is told to delete the empty rows or split the list.
 *
 * ⛔ PURE AND CLIENT-SAFE, AND IT IMPORTS NOTHING: the dialog shows the same sentence before posting that the
 * server would return after. No sentence ever quotes a cell; a sheet name is echoed only when it carries fewer
 * than seven digits however they are spaced (§5.14 — the file is personal data). `test:contacts-boundary` §2
 * holds the purity and `test:client-graph-safe` pins this file.
 */

// ── THE TRANSPORT ────────────────────────────────────────────────────────────────────────────────────────────

/** Next's default server-action body ceiling, whole request, multipart included. */
export const NEXT_ACTION_BODY_LIMIT_BYTES = 1024 * 1024;

/** Room left for the multipart boundary, the action id and the flight envelope around the base64 field. */
export const XLSX_ENVELOPE_ALLOWANCE = 8 * 1024;

/** ⭐ The largest Excel file accepted: 700 KiB = 716,800 bytes ("700 KB" on screen). */
export const XLSX_MAX_BYTES = 700 * 1024;

/** The length of the base64 text for `bytes` bytes: 4 characters for every 3 bytes, padded. */
export function base64LengthFor(bytes: number): number {
  const n = Number.isFinite(bytes) && bytes > 0 ? Math.ceil(bytes) : 0;
  return 4 * Math.ceil(n / 3);
}

/**
 * The longest base64 field that could still be within the cap. ⛔ NOT THE GATE: the last base64 group carries one,
 * two or three bytes, so 700 KiB + 1 and + 2 bytes are this length too. The gate is `xlsxBase64OverCap`.
 */
export const XLSX_MAX_BASE64_CHARS = base64LengthFor(XLSX_MAX_BYTES);

/**
 * The EXACT number of bytes a base64 text decodes to, read off its length alone (A1.4): 3 bytes for every 4
 * characters, less one byte for each trailing `=`; an unpadded tail of 2 or 3 characters carries 1 or 2 bytes.
 * Pass the bare payload — no `data:…;base64,` prefix and no line breaks (a browser's data URL has none); either one
 * only makes the count larger, which errs toward refusing. It never reads the alphabet, so it costs nothing on a
 * hostile field; a malformed one is the decoder's `not_base64`, after this gate.
 */
export function base64DecodedBytes(base64: string): number {
  const len = base64.length;
  let padding = 0;
  if (len > 0 && base64.charCodeAt(len - 1) === 61) padding++;
  if (len > 1 && base64.charCodeAt(len - 2) === 61) padding++;
  return Math.floor(((len - padding) * 3) / 4);
}

/**
 * ⭐ THE size gate (A1.4) — the server's first check once any `data:` prefix is stripped, before any decode: true
 * when the field decodes to more than XLSX_MAX_BYTES, so 700 KiB passes and 700 KiB + 1 byte refuses. Refuse with
 * `xlsxRefusalSentence("too_large", { bytes: base64DecodedBytes(base64) })`.
 */
export function xlsxBase64OverCap(base64: string): boolean {
  return base64DecodedBytes(base64) > XLSX_MAX_BYTES;
}

/**
 * ⚠️ PROVISIONAL (U27b measures them). The most a workbook may inflate to, across every zip entry, and the most
 * rows its sheets may hold. A 700 KB zip can expand a thousandfold (a zip bomb), and the in-memory reader holds
 * the whole workbook on the one instance that also takes bets. U27b's suite measures the densest realistic
 * ~690 KB fixture and asserts each cap is at least twice what it measured.
 */
export const XLSX_MAX_INFLATED_BYTES = 48 * 1024 * 1024;
export const XLSX_MAX_ROWS = 200_000;

/** The most zip entries a workbook may carry; a real contact sheet has a few dozen. */
export const XLSX_MAX_ENTRIES = 1000;

// ── THE SNIFFER ──────────────────────────────────────────────────────────────────────────────────────────────

/** What a file's first bytes say its container is. Content beats the file name. */
export type SpreadsheetSniff = "zip" | "cfb" | "other";

/** A zip's local file header: "PK", 3, 4. Every .xlsx, .xlsb and .ods file starts with it. */
const ZIP_MAGIC: readonly number[] = [0x50, 0x4b, 0x03, 0x04];
/** The Compound File Binary header: a legacy .xls, or a password-protected .xlsx (which Excel wraps in CFB). */
const CFB_MAGIC: readonly number[] = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

const startsWith = (head: Uint8Array, magic: readonly number[]): boolean =>
  head.length >= magic.length && magic.every((b, i) => head[i] === b);

/**
 * The container, from the magic bytes alone. ⛔ The FULL four-byte zip signature, never just "PK": a CSV whose
 * first cell starts with the letters P and K is text, not a workbook.
 */
export function sniffSpreadsheetBytes(head: Uint8Array): SpreadsheetSniff {
  if (startsWith(head, ZIP_MAGIC)) return "zip";
  if (startsWith(head, CFB_MAGIC)) return "cfb";
  return "other";
}

/** The `mimetype` an OpenDocument spreadsheet declares (a template adds "-template", and is refused the same way). */
export const ODS_MIMETYPE = "application/vnd.oasis.opendocument.spreadsheet";

/**
 * Is this zip an OpenDocument spreadsheet? ODF requires its FIRST entry to be a STORED file named `mimetype`
 * holding the media type, so the head decides it without unzipping anything.
 */
export function headIsOdsZip(head: Uint8Array): boolean {
  if (sniffSpreadsheetBytes(head) !== "zip" || head.length < 30) return false;
  const u16 = (at: number) => head[at] | (head[at + 1] << 8);
  const method = u16(8);
  const nameLength = u16(26);
  const extraLength = u16(28);
  const name = "mimetype";
  if (method !== 0 || nameLength !== name.length) return false;
  for (let i = 0; i < name.length; i++) if (head[30 + i] !== name.charCodeAt(i)) return false;
  const dataAt = 30 + nameLength + extraLength;
  if (head.length < dataAt + ODS_MIMETYPE.length) return false;
  for (let i = 0; i < ODS_MIMETYPE.length; i++) if (head[dataAt + i] !== ODS_MIMETYPE.charCodeAt(i)) return false;
  return true;
}

/** "EncryptionInfo" as a CFB directory entry spells it: UTF-16LE, a zero byte after each letter. */
const ENCRYPTION_INFO_UTF16LE: readonly number[] = Array.from("EncryptionInfo").flatMap((ch) => [ch.charCodeAt(0), 0]);

/**
 * Does this CFB file hold an `EncryptionInfo` stream? A password-protected workbook is a CFB container with
 * EncryptionInfo and EncryptedPackage streams (MS-OFFCRYPTO), while a legacy .xls is not. ⚠️ The directory can sit
 * anywhere in the file, so pass the WHOLE file (it is at most 700 KB by then); a 4 KB head may miss it and call a
 * protected workbook an old .xls.
 */
export function cfbLooksEncrypted(bytes: Uint8Array): boolean {
  const needle = ENCRYPTION_INFO_UTF16LE;
  let at = bytes.indexOf(needle[0]);
  while (at !== -1 && at <= bytes.length - needle.length) {
    let k = 1;
    while (k < needle.length && bytes[at + k] === needle[k]) k++;
    if (k === needle.length) return true;
    at = bytes.indexOf(needle[0], at + 1);
  }
  return false;
}

/**
 * What kind of spreadsheet the bytes are, as far as the bytes alone can tell — the ONE classifier (C18).
 *   · "xlsx" — an Office Open XML zip that MAY be a workbook. Only the server's zip walk (U27b) can tell a real
 *     .xlsx from a .xlsb or a Strict Open XML file, so this is "send it to the reader", never "it is valid".
 *   · "ods" / "xls" / "protected" — refuse with `xlsxRefusalSentence("wrong_format", { kind })`.
 *   · null — not a spreadsheet container at all; a text reader (CSV, vCard) takes it from here.
 * ⛔ PASS THE WHOLE FILE (it is at most 700 KB by the time anything classifies it), never a head. A head can tell
 * zip from CFB and spot an ODS, but "protected" lives in the CFB directory, which usually sits near the END of the
 * file: given only its first 4 KB, a password-protected workbook comes back "xls" and the officer is shown the
 * wrong fix. U25's detectFormat and U32's dialog both call this with the whole file.
 */
export type SpreadsheetHeadKind = "xlsx" | "ods" | "xls" | "protected" | null;

export function spreadsheetHeadKind(bytes: Uint8Array): SpreadsheetHeadKind {
  const sniff = sniffSpreadsheetBytes(bytes);
  if (sniff === "cfb") return cfbLooksEncrypted(bytes) ? "protected" : "xls";
  if (sniff === "zip") return headIsOdsZip(bytes) ? "ods" : "xlsx";
  return null;
}

// ── THE ONE COPY TABLE ───────────────────────────────────────────────────────────────────────────────────────

/** Which wrong format a refused file is; each one names its format and the fix. */
export type WrongFormatKind = "xls" | "protected" | "xlsb" | "ods" | "strict" | "other";

/** Every way an Excel file can be refused, client-side check and server read alike. */
export type XlsxRefusal =
  | "too_large"
  | "not_base64"
  | "wrong_format"
  | "too_big_inflated"
  | "too_many_rows"
  | "no_visible_sheet"
  | "empty"
  | "unreadable"
  | "busy"
  | "forbidden";
/** Every refusal, complete by construction: a new member of the union without an entry here fails to compile. */
const REFUSAL_SET: Record<XlsxRefusal, true> = {
  too_large: true, not_base64: true, wrong_format: true, too_big_inflated: true, too_many_rows: true,
  no_visible_sheet: true, empty: true, unreadable: true, busy: true, forbidden: true,
};
export const XLSX_REFUSALS = Object.keys(REFUSAL_SET) as readonly XlsxRefusal[];

/**
 * A file size as an officer reads it: "702 KB", "1.4 MB" (1 KB = 1024 bytes, matching "700 KB" for the cap).
 * ⭐ IT ROUNDS UP, so a file one byte over the cap reads "701 KB" — never "700 KB", which would make the refusal
 * "This spreadsheet is 700 KB — an Excel file can be up to 700 KB" read as nonsense.
 */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  const kb = Math.ceil(bytes / 1024);
  if (kb < 1000) return `${kb} KB`;
  const mb = Math.ceil((bytes / (1024 * 1024)) * 10) / 10;
  return `${mb.toFixed(1).replace(/\.0$/, "")} MB`;
}

/** 200000 → "200,000", without a locale (the server and the browser must print the same sentence). */
const groupThousands = (n: number): string => String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/**
 * ⭐ THE ONE PHONE-FORMAT REMEDY (A1.6) — a clause, written to sit inside a sentence ("Before you save, …"). Every
 * sentence that sends an officer to CSV carries it, and so must the Phone column's hint (`contact-fields.ts`) and
 * the shortened-number sentence below: import it, never retype it.
 */
export const PHONE_FORMAT_REMEDY = "format the phone column as Number with 0 decimal places";

const SHORTENS = "or Excel will shorten long numbers to 2.55713E+11.";
/** ⭐ The way past the BYTE cap, said precisely: a CSV has no file-size limit, and one import takes at most XLSX_MAX_ROWS
 *  rows (X28's IMPORT_MAX_ROWS is that constant) — the number formatted from the constant, never typed. */
const SAVE_AS_CSV = `Save it as CSV instead — a CSV has no file-size limit (up to ${groupThousands(XLSX_MAX_ROWS)} rows in one import).`;
/** For a refusal whose ONLY way forward is CSV. */
const KEEP_EVERY_DIGIT = `Before you save, ${PHONE_FORMAT_REMEDY}, ${SHORTENS}`;
/** For a refusal that offers CSV as one of two ways forward (.xlsx being the other, which keeps every digit). */
const IF_CSV_KEEP_EVERY_DIGIT = `If you choose CSV, first ${PHONE_FORMAT_REMEDY}, ${SHORTENS}`;
const RESAVE = `Open it in Excel and save it as an Excel Workbook (.xlsx) or as CSV, then choose it again. ${IF_CSV_KEEP_EVERY_DIGIT}`;

/** Excel's own limit on a sheet name. */
const SHEET_NAME_MAX = 31;

/** A digit in any script — "0712 345 678" and its Arabic-Indic spelling alike. */
const ANY_DIGIT = /\p{Nd}/gu;

/**
 * A sheet name fit to echo, or null. Control and direction-override characters are dropped, spaces collapsed, the
 * length held to Excel's 31, and ⛔ a name carrying SEVEN OR MORE DIGITS, however they are spaced, is NOT echoed:
 * a sheet named "0712 345 678" or "+255 712-345-678" would put that number in a sentence (and in any screenshot of
 * it). Counting every digit, not the longest unbroken run, is what catches the spaced and dashed spellings.
 */
function sheetLabel(sheet: string | undefined): string | null {
  if (typeof sheet !== "string") return null;
  const kept = Array.from(sheet)
    .filter((ch) => {
      const c = ch.codePointAt(0) ?? 0;
      return c >= 32 && c !== 127 && c !== 34 && !(c >= 0x202a && c <= 0x202e) && !(c >= 0x2066 && c <= 0x2069);
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  const label = Array.from(kept).slice(0, SHEET_NAME_MAX).join("");
  if (!label || (label.match(ANY_DIGIT) ?? []).length >= 7) return null;
  return label;
}

const WRONG_FORMAT_SENTENCE: Record<WrongFormatKind, string> = {
  xls: `This looks like an old-style Excel file (.xls). ${RESAVE}`,
  protected: "This spreadsheet is protected with a password, so it can't be read. Open it in Excel, remove the password, save it, and choose it again.",
  xlsb: `This is an Excel Binary Workbook (.xlsb). ${RESAVE}`,
  ods: `This is an OpenDocument spreadsheet (.ods). Save it as an Excel Workbook (.xlsx) or as CSV, then choose it again. ${IF_CSV_KEEP_EVERY_DIGIT}`,
  strict: `This workbook is saved as Strict Open XML, which can't be read here. ${RESAVE}`,
  other: `This file isn't an Excel workbook. Choose an .xlsx file, or save the list as CSV. ${IF_CSV_KEEP_EVERY_DIGIT}`,
};

/** Every wrong-format kind, read off the table above, so a kind cannot exist without its sentence. */
export const WRONG_FORMAT_KINDS = Object.keys(WRONG_FORMAT_SENTENCE) as readonly WrongFormatKind[];

/** What a refusal sentence may be told: the measured size, the wrong format, the sheet that was read. */
export type XlsxRefusalContext = { bytes?: number; kind?: WrongFormatKind; sheet?: string };

/**
 * ⭐ THE sentence for a refused Excel file — the dialog's client-side check and the server's reply both read it
 * from here, so the officer sees one wording whichever side refused. Never a cell, never exceljs's own message.
 */
export function xlsxRefusalSentence(r: XlsxRefusal, ctx: XlsxRefusalContext = {}): string {
  const cap = formatFileSize(XLSX_MAX_BYTES);
  switch (r) {
    case "too_large": {
      const size = typeof ctx.bytes === "number" && Number.isFinite(ctx.bytes) && ctx.bytes > 0 ? formatFileSize(ctx.bytes) : null;
      const opening = size
        ? `This spreadsheet is ${size} — an Excel file can be up to ${cap} here.`
        : `This spreadsheet is too large — an Excel file can be up to ${cap} here.`;
      return `${opening} ${SAVE_AS_CSV} ${KEEP_EVERY_DIGIT}`;
    }
    case "too_big_inflated":
      return `This spreadsheet holds more data than an Excel file can carry here. ${SAVE_AS_CSV} ${KEEP_EVERY_DIGIT}`;
    case "too_many_rows":
      // ⛔ C3b · never "save it as CSV": a CSV of the same rows is refused too (X28 — one import's row cap IS this one).
      return `This spreadsheet has more than ${groupThousands(XLSX_MAX_ROWS)} rows — the most one import can take. Delete any empty rows below the contacts, or split the list into files of at most ${groupThousands(XLSX_MAX_ROWS)} rows, then save it and choose it again.`;
    case "not_base64":
      return "The file didn't arrive in one piece. Choose it again.";
    case "wrong_format":
      return WRONG_FORMAT_SENTENCE[ctx.kind ?? "other"] ?? WRONG_FORMAT_SENTENCE.other;
    case "no_visible_sheet":
      return "Every sheet in this workbook is hidden. Open it in Excel, unhide the sheet with the contacts, save it, and choose it again.";
    case "empty": {
      const sheet = sheetLabel(ctx.sheet);
      const opening = sheet ? `The sheet "${sheet}" has no rows to read.` : "This spreadsheet has no rows to read.";
      return `${opening} Put the contacts on the first visible sheet, save it, and choose it again.`;
    }
    case "unreadable":
      // ⭐ A DEPARTURE FROM U27's FIXED TEXT, on purpose (A1.6): the spec's sentence ended at "or save it as CSV.",
      // which sends the officer to CSV without the format step. Still fixed — never exceljs's own message.
      return `We couldn't read this file as an Excel workbook. Open it in Excel and save it again as .xlsx, or save it as CSV. ${IF_CSV_KEEP_EVERY_DIGIT}`;
    case "busy":
      return "Another spreadsheet is being read right now. Try again in a moment.";
    case "forbidden":
      return "Your role cannot import contacts.";
    default:
      return unknownRefusal(r);
  }
}

/** A new refusal added to the union without a sentence fails to compile here; a stray value at runtime reads as unreadable. */
function unknownRefusal(_r: never): string {
  return xlsxRefusalSentence("unreadable");
}

/**
 * ⭐ C3b · G2 · THE NOTE for a workbook read from a sheet that is NOT its first visible one — the first visible sheet whose
 * header row has a phone column (a cover page before the contacts): the sheet named through the ONE sheet-name rule
 * (`sheetLabel` — a name carrying seven or more digits is never echoed, and then only its place is said), and where it
 * sits among ALL the workbook's sheets, hidden ones counted.
 */
export function xlsxChosenSheetNote(sheet: string | undefined, position: number, total: number): string {
  const label = sheetLabel(sheet);
  const where = `sheet ${position} of ${total}`;
  return label !== null
    ? `Read the sheet “${label}” — the first sheet with a phone column (${where}).`
    : `Read ${where} — the first sheet with a phone column.`;
}

// ── EXCEL'S SHORTENED NUMBERS (decision M6) ──────────────────────────────────────────────────────────────────

/**
 * A cell Excel has already shortened to scientific form: `2.55713E+11` (or `2,55713E+11` from a comma-decimal
 * Excel, or `2.55713e+11` from other tools). The digits after the sixth are GONE — this is Excel's display of a
 * 12-digit number, written into CSV or copied to the clipboard. ⛔ Never "repair" it by expanding it: the result
 * (255713000000) is a valid-looking number that belongs to a stranger.
 * ⭐ U28's `draftContactRow` is the ONE place that applies it, for every producer (M6); this is only the detector.
 */
export const EXCEL_SHORTENED_TEXT = /^\s*[+-]?\d(?:[.,]\d+)?E\+\d{1,2}\s*$/i;

export function looksExcelShortened(text: string): boolean {
  return EXCEL_SHORTENED_TEXT.test(text);
}

/** The sentence beside a shortened phone cell. Same remedy as the size refusals — the ONE clause — then export. */
export function excelShortenedSentence(): string {
  return `Excel shortened this number to scientific form (like 2.55713E+11) and its last digits are lost. Go back to the original spreadsheet, ${PHONE_FORMAT_REMEDY}, and export it again.`;
}
