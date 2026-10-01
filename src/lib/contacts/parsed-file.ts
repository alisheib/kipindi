/**
 * THE ONE SHAPE EVERY CONTACTS-FILE READER RETURNS — U27a, 2026-10-01 (decision C15, amended by A1.8).
 *
 * ⭐ FOUR PRODUCERS, ONE SHAPE. The CSV reader (U25), the vCard reader (U26), the server's XLSX reader (U27b) and
 * the paste box (U30) each turn a file into rows, and everything downstream — the column mapping (U28), the
 * staging batches (U29), the preview and its row numbers (U30) — reads only this. Three specs once described
 * three different shapes; the decisions file settled on this one, and `test:contacts-boundary` §2.6 holds that it
 * is declared exactly ONCE in `src` — here. Never declare a second one beside a producer: import this one.
 *
 * ⭐ WHAT THE FIELDS PROMISE, which is the part a type cannot say:
 *   · `rows` is every NON-blank row in file order, never sorted, the first one included — deciding whether row 1
 *     is a header is U28's job, and a headerless list of bare numbers is a real file. A row whose every cell is
 *     empty is blank by every producer's rule, so it is never emitted. (The CSV reader also counts a row of only
 *     spaces as blank, but a producer whose rule stops at empty cells may emit one, so the validator holds every
 *     producer to the shared floor only: at least one cell that is not empty.)
 *   · `line` is the row's number in the file's UNFILTERED grid, 1-based (xlsx: the sheet row; csv: the record,
 *     header included; vcard: the card; paste: the pasted line). A blank row is skipped but still numbered, so
 *     "row 14" in a refusal is row 14 in the officer's own spreadsheet. Lines therefore strictly increase.
 *   · `blankRows` is COUNTED, never silently dropped: the preview says how many it skipped.
 *   · `unreadable` (A1.8, X19) is every record the reader saw but could not turn into a row — a vCard cut off
 *     before its end, a card with no phone — each with its `line` on the same numbering and one sentence saying
 *     why. U29 stages each as a row with a read error and U30 counts and lists them, so a record is never lost
 *     between "read" and "shown". Its lines strictly increase too, and none is also a row's line: a record is a
 *     row OR unreadable, never both (U29 keys a staged row by its line).
 *   · `width` is the widest row's cell count, so the mapping panel can draw every column a row reaches.
 *   · `notes` are whole sentences for the officer (a hidden sheet ignored, cells read as blank). ⛔ A note — and an
 *     unreadable reason — never quotes a cell: it names rows and columns, never what was in them (§5.14 — the
 *     file is personal data).
 *
 * ⛔ PURE AND CLIENT-SAFE, AND IT IMPORTS NOTHING. The import dialog validates the server's reply with
 * `isParsedContactsFile` in the browser, while the server builds the same shape. A `"use client"` directive here
 * would turn every export into a client reference on the server (the 2026-09-05 `kycGateState` outage); a server
 * import would drag the server graph into the admin chunk. `test:contacts-boundary` §2 refuses both, and
 * `test:client-graph-safe` pins this file.
 */

/** Where the rows came from. `paste` is the paste box (U30): an Excel copy is tab-separated text. */
export type ContactsFileFormat = "csv" | "xlsx" | "vcard" | "paste";

/** Every format, for the runtime check — complete by construction (a new format without an entry fails to compile). */
const FORMAT_SET: Record<ContactsFileFormat, true> = { csv: true, xlsx: true, vcard: true, paste: true };
export const CONTACTS_FILE_FORMATS = Object.keys(FORMAT_SET) as readonly ContactsFileFormat[];

/** One non-blank row: its 1-based line in the unfiltered grid, and its cells as text. */
export type ParsedRow = { line: number; cells: string[] };

/** One record the reader could not read (A1.8): its line on the rows' numbering, and why, in one sentence. */
export type UnreadableRecord = { line: number; reason: string };

/** ⭐ THE shape (decision C15, plus `unreadable` from A1.8). See the header for what each field promises. */
export type ParsedContactsFile = {
  format: ContactsFileFormat;
  fileName: string | null;
  rows: ParsedRow[];
  width: number;
  blankRows: number;
  notes: string[];
  unreadable: UnreadableRecord[];
};

/** A note that lists rows names at most this many, with the true count beside them ("… and 948 more"). */
export const NOTE_LIST_CAP = 50;

/**
 * Rows named the same way in every producer's notes: "row 4", "rows 4 and 9", "rows 4, 9 and 12", and past
 * `NOTE_LIST_CAP` the first fifty followed by "and N more". The caller passes the lines in file order.
 */
export function formatRowList(lines: readonly number[]): string {
  if (lines.length === 0) return "no rows";
  if (lines.length === 1) return `row ${lines[0]}`;
  if (lines.length > NOTE_LIST_CAP) {
    return `rows ${lines.slice(0, NOTE_LIST_CAP).join(", ")} and ${lines.length - NOTE_LIST_CAP} more`;
  }
  return `rows ${lines.slice(0, -1).join(", ")} and ${lines[lines.length - 1]}`;
}

const isFormat = (v: unknown): v is ContactsFileFormat =>
  typeof v === "string" && (CONTACTS_FILE_FORMATS as readonly string[]).includes(v);

const isCount = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** A line number that can follow `previous`: a whole number ≥ 1 and strictly greater. */
const isNextLine = (v: unknown, previous: number): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 1 && v > previous;

/**
 * Is `x` a well-formed `ParsedContactsFile`? The import dialog asks this of the server's reply before it shows a
 * single row (a framework error page or a stale build's reply must read as an error, never as an empty file).
 *
 * It checks the promises in the header that can be checked: the format is one of the four; `fileName` is text or
 * null; every line is a whole number ≥ 1 and STRICTLY greater than the one before (a renumbered or re-sorted grid
 * fails here, because its row numbers no longer match the officer's spreadsheet); every cell is a string; no row
 * is blank (every cell empty — a producer that pushed one instead of counting it in `blankRows`); `width` is
 * exactly the widest row; `blankRows` is a whole number ≥ 0; every note is a string; `unreadable` is a list whose
 * lines strictly increase, whose every reason is a non-empty sentence, and none of whose lines is a row's line.
 */
export function isParsedContactsFile(x: unknown): x is ParsedContactsFile {
  if (!isRecord(x)) return false;
  const f = x;
  if (!isFormat(f.format)) return false;
  if (f.fileName !== null && typeof f.fileName !== "string") return false;
  if (!isCount(f.blankRows) || !isCount(f.width)) return false;
  if (!Array.isArray(f.notes) || !f.notes.every((n) => typeof n === "string")) return false;
  if (!Array.isArray(f.rows) || !Array.isArray(f.unreadable)) return false;
  let previous = 0;
  let widest = 0;
  const rowLines = new Set<number>();
  for (const row of f.rows as unknown[]) {
    if (!isRecord(row)) return false;
    if (!isNextLine(row.line, previous)) return false;
    if (!Array.isArray(row.cells) || !row.cells.every((c) => typeof c === "string")) return false;
    if (!row.cells.some((c) => c !== "")) return false;
    previous = row.line;
    rowLines.add(row.line);
    if (row.cells.length > widest) widest = row.cells.length;
  }
  let previousUnreadable = 0;
  for (const record of f.unreadable as unknown[]) {
    if (!isRecord(record)) return false;
    if (!isNextLine(record.line, previousUnreadable) || rowLines.has(record.line)) return false;
    if (typeof record.reason !== "string" || record.reason.trim() === "") return false;
    previousUnreadable = record.line;
  }
  return f.width === widest;
}
