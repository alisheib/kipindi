/**
 * HOW BIG ONE STAGING BATCH MAY BE, HOW BIG ONE IMPORT MAY BE, AND THE ONE WAY A PARSED FILE BECOMES BATCHES —
 * U29b, 2026-10-02 (decisions X2 · X19 · X20 · X28; the server that re-checks every figure here is
 * `src/lib/server/contacts/import-staging.ts`).
 *
 * ⭐ TWO CAPS, BOTH RE-CHECKED ON THE SERVER. A batch is at most STAGE_BATCH_MAX_ROWS rows AND at most
 * STAGE_BATCH_MAX_BYTES of UTF-8 JSON. The row cap alone was never enough: "2,000 rows ≈ 200 KB" holds only near 100
 * bytes a row, and a row at U28's field limits in a multibyte script runs to several kilobytes — 2,000 of those would
 * be many times the 1 MB a server action may carry (`NEXT_ACTION_BODY_LIMIT_BYTES`, imported from xlsx-limits.ts: one
 * constant each, X28). 200 KiB is 5.12 times under that ceiling, and it bounds the database write too: 2,000 rows × 12
 * staged columns is 24,000 bind parameters, under the 65,535 one Postgres statement may carry.
 * ⭐ ONE RUN HOLDS AT MOST IMPORT_MAX_ROWS RECORDS — xlsx-limits' 200,000-row cap, imported, never retyped (X28).
 * ⛔ NOTHING HERE CLIPS A FIELD (X20). A cell over its limit travels whole and the server's `draftContactRow` REPORTS it,
 * naming the field; only a row too large for ANY batch is sent as an unreadable record — said, never silently cut.
 * ⭐ THE ORDER IS THE FILE'S. `stageRowsOf` interleaves the parsed rows and the unreadable records by `line`, so the
 * ordinal a record is staged at is the same on every re-read of the same file — which is what lets a closed tab, a
 * reload or a redeploy resume at the server's `stagedThrough + 1` (`test:contacts-staging`).
 *
 * ⛔ PURE AND CLIENT-SAFE: the import dialog packs with it in the browser and the server measures with it. It imports two
 * constants from xlsx-limits.ts and TYPES from contact-fields.ts and parsed-file.ts, and nothing else — no src/lib/server,
 * no node:, no React, no directive. `test:contacts-boundary` §2 holds that, and `test:client-graph-safe` pins this file.
 */
import { NEXT_ACTION_BODY_LIMIT_BYTES, XLSX_MAX_ROWS } from "./xlsx-limits";
import type { ColumnMapping } from "./contact-fields";
import type { ParsedContactsFile, ParsedRow } from "./parsed-file";

/** The most rows one staging batch may carry. */
export const STAGE_BATCH_MAX_ROWS = 2_000;

/** The most UTF-8 bytes of JSON one staging batch may carry: 200 KiB. */
export const STAGE_BATCH_MAX_BYTES = 200 * 1024;

/** How many times a full batch fits under Next's action body ceiling — 5.12, held at five or more by the suite. */
export const STAGE_BATCH_BODY_MARGIN = NEXT_ACTION_BODY_LIMIT_BYTES / STAGE_BATCH_MAX_BYTES;

/** ⭐ X28 — ONE constant: the most records one import may hold IS xlsx-limits' row cap, imported, never retyped. */
export const IMPORT_MAX_ROWS: number = XLSX_MAX_ROWS;

/**
 * One record as the browser posts it: a parsed row's cells (the mapped columns kept at their own positions, every other
 * cell blank), or a record the reader could not read, with its one sentence. `line` is the record's row in the
 * officer's own file (C15). ⛔ No key, no verdict, no outcome: the server derives each one, and ignores any a request
 * carries.
 */
export type StageRowInput =
  | { readonly line: number; readonly cells: readonly string[] }
  | { readonly line: number; readonly readError: string };

/** The sentence for a row too large for any batch — staged as unreadable, so it is listed, never silently dropped. */
export const STAGE_ROW_TOO_LARGE =
  `This row holds more text than one upload can carry (${STAGE_BATCH_MAX_BYTES / 1024} KB), so it was not read. Shorten its cells and import it again.`;

/**
 * The UTF-8 length of a string without encoding it: one byte up to U+007F, two up to U+07FF, four for a surrogate pair
 * and three otherwise — a lone surrogate counts three, as TextEncoder writes it (U+FFFD).
 */
export function utf8Length(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x80) n += 1;
    else if (c < 0x800) n += 2;
    else if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) {
      const d = s.charCodeAt(i + 1);
      if (d >= 0xdc00 && d <= 0xdfff) {
        n += 4;
        i++;
      } else n += 3;
    } else n += 3;
  }
  return n;
}

/** ⭐ THE ONE MEASURE, on both sides of the wire: the UTF-8 bytes of a batch exactly as `JSON.stringify` writes it. */
export function stageBatchBytes(rows: readonly unknown[]): number {
  return utf8Length(JSON.stringify(rows));
}

/**
 * The same measure, WITH A STOP (U29 review F9) — what the server asks. A server action's body may refer to ONE value
 * many times, so a forged ~160 KB body whose 2,000 rows all point at one large `cells` array would become a string
 * of hundreds of megabytes if it were stringified whole before the cap could refuse it. This walks the batch value
 * by value and stops as soon as the running size passes `cap`: exactly `stageBatchBytes(rows)` for any batch of plain
 * JSON data within the cap (what the browser sends); past the cap, some number above it.
 */
export function stageBatchBytesUpTo(rows: readonly unknown[], cap: number): number {
  return jsonBytesUpTo(rows, cap);
}

/** `JSON.stringify(v)`'s UTF-8 size, stopping once it passes `room` (undefined, a function or a symbol inside an
 *  array is written as null, and an object member holding one is skipped, as JSON.stringify does). */
function jsonBytesUpTo(v: unknown, room: number): number {
  if (typeof v === "string") return utf8Length(JSON.stringify(v));
  if (Array.isArray(v)) {
    let n = 2;
    for (let i = 0; i < v.length; i++) {
      if (i > 0) n += 1;
      const x: unknown = v[i];
      n += x === undefined || typeof x === "function" || typeof x === "symbol" ? 4 : jsonBytesUpTo(x, room - n);
      if (n > room) return n;
    }
    return n;
  }
  if (v !== null && typeof v === "object") {
    let n = 2;
    let first = true;
    for (const key of Object.keys(v)) {
      const x: unknown = (v as Record<string, unknown>)[key];
      if (x === undefined || typeof x === "function" || typeof x === "symbol") continue;
      if (!first) n += 1;
      first = false;
      n += utf8Length(JSON.stringify(key)) + 1 + jsonBytesUpTo(x, room - n);
      if (n > room) return n;
    }
    return n;
  }
  const s = JSON.stringify(v);
  return utf8Length(s === undefined ? "null" : s);
}

/**
 * One parsed row → what the browser posts: the cells of the MAPPED columns at their own positions, every other cell
 * blank and the trailing blanks dropped — so the server, drafting with the run's stored mapping, reads exactly what the
 * officer mapped and nothing more crosses the wire. A row too large for any batch becomes an unreadable record.
 */
export function stageRowFor(row: ParsedRow, mapping: ColumnMapping): StageRowInput {
  const wanted = new Set<number>();
  for (const index of Object.values(mapping)) if (typeof index === "number") wanted.add(index);
  let width = 0;
  for (const index of wanted) if (index + 1 > width) width = index + 1;
  const cells: string[] = [];
  for (let i = 0; i < width; i++) cells.push(wanted.has(i) ? (row.cells[i] ?? "") : "");
  while (cells.length > 0 && cells[cells.length - 1] === "") cells.pop();
  const input: StageRowInput = { line: row.line, cells };
  return stageBatchBytes([input]) > STAGE_BATCH_MAX_BYTES ? { line: row.line, readError: STAGE_ROW_TOO_LARGE } : input;
}

/**
 * ⭐ THE ONE SEQUENCE a parsed file is staged in: the rows after the header row (`headerRows` — 1 for CSV, XLSX and
 * paste, 0 for a vCard; `autoMapFile` says which) and every unreadable record (X19), interleaved by `line`. A record's
 * ordinal is its place in this list, on every re-read of the same file.
 */
export function stageRowsOf(file: ParsedContactsFile, mapping: ColumnMapping, headerRows: 0 | 1): StageRowInput[] {
  const rows = file.rows.slice(headerRows).map((row) => stageRowFor(row, mapping));
  const unreadable: StageRowInput[] = file.unreadable.map((u) => ({ line: u.line, readError: u.reason }));
  const out: StageRowInput[] = [];
  let i = 0;
  let j = 0;
  while (i < rows.length || j < unreadable.length) {
    if (j >= unreadable.length || (i < rows.length && rows[i].line < unreadable[j].line)) out.push(rows[i++]);
    else out.push(unreadable[j++]);
  }
  return out;
}

/** The browser's two figures for a staged sequence, as the open call declares them: every record, and how many of them
 *  the reader could not read. The server holds the run to both. */
export type StageFigures = { readonly totalRows: number; readonly unreadable: number };

export function stageFigures(rows: readonly StageRowInput[]): StageFigures {
  let unreadable = 0;
  for (const row of rows) if ("readError" in row) unreadable++;
  return { totalRows: rows.length, unreadable };
}

/**
 * ⭐ GREEDY AND ORDER-PRESERVING: each batch takes records in sequence until the next would pass EITHER cap, so the
 * batches concatenate to the input and every batch is within both caps (a record too large for any batch would go alone
 * and be refused — `stageRowFor` already sent such a row as unreadable). A 40-row file is ONE batch: no queue, no poll.
 * The running size is exact: `JSON.stringify` of an array is its elements joined by commas, inside two brackets.
 */
export function packStageBatches(rows: readonly StageRowInput[]): StageRowInput[][] {
  const batches: StageRowInput[][] = [];
  let current: StageRowInput[] = [];
  let bytes = 2;
  for (const row of rows) {
    const size = utf8Length(JSON.stringify(row));
    if (current.length > 0 && (current.length >= STAGE_BATCH_MAX_ROWS || bytes + 1 + size > STAGE_BATCH_MAX_BYTES)) {
      batches.push(current);
      current = [];
      bytes = 2;
    }
    bytes += current.length === 0 ? size : size + 1;
    current.push(row);
  }
  if (current.length > 0) batches.push(current);
  return batches;
}
