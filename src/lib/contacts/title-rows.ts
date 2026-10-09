/**
 * ⭐ A TITLE ABOVE THE COLUMN NAMES — the rows above a file's real header row leave the data, and a note says so.
 *                                   (S15 · C3b-fix · D7 · G5, 2026-10-09 · docs/CONTACTS-SCREEN-PLAN.md §1 row C3b)
 *
 * An office's list often opens with a title — "Orodha ya wateja", a date, "Imeandaliwa na ofisi ya masoko" — and only
 * then the column names. The mapping reads the FIRST row as the header, so such a file read its title as the column
 * names, found no Phone column, and its real header became a contact row that could never import. D7: ONE pure function
 * over a file as its reader returned it — the browser's CSV reader and the TAB paste (`import-read.ts`), the server's
 * workbook reader (`import-xlsx.ts`) and the browser's reader for big workbooks (step C3c) all call `dropTitleRows`:
 *   · when the file's FIRST non-empty row maps NO Phone column and is not itself a contact (S15-5's test,
 *     `autoMapHeaders().headerless`), and one of the next `TITLE_ROWS_LOOKAHEAD` non-empty rows maps a Phone column by a
 *     STRONG heading (`matchHeader` — "Phone", "Simu", "Mobile Phone"…, never a weak "Namba" that may be a serial), that
 *     row becomes the header: the rows above it leave the data, and ONE note says which ("Rows 1–2, above the column
 *     names, were not read — a title."), naming rows only — ⛔ never what they said (§5.14);
 *   · ⛔ NOTHING CHANGES for a file whose first row is a header (any Phone column, strong or weak) or a contact, for a vCard
 *     (it has no header), or for a masked export (its refused header is never taken for a title: the refusal must stand);
 *   · ⛔ A CONTACT IS NEVER A TITLE: the search stops at a row that is itself a contact, so a list that opens with its data
 *     is never cut down to a later row that happens to read "Phone";
 *   · lines keep their REAL row numbers (C15: "row 14" is row 14 in the officer's own spreadsheet), the blank rows stay
 *     counted, and `width` is the widest row left;
 *   · ⭐ C8c · AN UNPADDED TITLE IN A HAND-TYPED CSV ("Contacts October" alone on line 1, the column names on line 3) once
 *     made the CSV reader decide the whole file was ONE column, and this rule then had no column names to find. The
 *     reader's vote now asks this file's own first-row test (`mayBeTitleRow`) of a first record that is one cell under
 *     every separator and looks past it — at most `TITLE_ROWS_LOOKAHEAD` such records — so the file is read with its
 *     real separator and the title leaves here with the same note, never quoted, its row numbers real.
 *
 * ⛔ PURE AND CLIENT-SAFE: it imports `./contact-fields` (U28's one field list — the header match) and the parsed shape's
 * type alone, and is pinned in `test:client-graph-safe`. No directive, no server module, no builtin.
 * Guard: `npm run test:contacts-import` (section "title-rows"; its readers: sections "flow" and "xlsx") · red:
 * `npm run red:contacts-import`.
 */
import { autoMapHeaders, matchHeader } from "./contact-fields";
import type { ParsedContactsFile, ParsedRow } from "./parsed-file";

/** ⭐ How many non-empty rows BELOW the first may hold the column names: a title is a few rows, never a page. */
export const TITLE_ROWS_LOOKAHEAD = 9;

/** The en dash a range of rows is written with ("Rows 1–2") — built from its code. */
const EN_DASH = String.fromCharCode(0x2013);

/** Does this row read as column names whose Phone column is named by a STRONG heading (never a contact)? */
function strongPhoneHeader(cells: readonly string[]): boolean {
  const read = autoMapHeaders(cells);
  const at = read.mapping.phone;
  if (at === undefined || read.headerless) return false;
  const match = matchHeader(cells[at] ?? "");
  return match.kind === "field" && match.field === "phone" && match.strength === "strong";
}

/**
 * ⭐ D7's FIRST-ROW TEST, ONE function (C8c): may this row be a title ABOVE the column names? It maps NO Phone column (by
 * any heading, strong or weak), it is not itself a contact (S15-5's test, `autoMapHeaders().headerless`), and it is not a
 * masked export's refused header (that refusal must reach the columns step). `dropTitleRows` asks it of a file's first
 * row; ⭐ the CSV reader's vote asks it of a first record that is ONE CELL under every separator — a bare title typed
 * with no separator, "Contacts October" — before it decides the file is one column (`import-parse.ts`, `voteLooksPast`):
 * an UNPADDED title no longer turns a whole hand-typed CSV into one column, so this file can find its column names.
 */
export function mayBeTitleRow(cells: readonly string[]): boolean {
  const read = autoMapHeaders(cells);
  if (read.mapping.phone !== undefined || read.headerless) return false;
  // ⛔ A masked export's refused header (phone_masked) is never a title: its refusal must reach the columns step.
  return !(read.refusal !== null && read.columns.some((c) => c.status === "notImported" && c.note === read.refusal));
}

/** ⭐ The ONE note for the rows a title took — rows named, never what they hold. */
export function titleRowsNote(first: number, last: number): string {
  return first === last
    ? `Row ${first}, above the column names, was not read — a title.`
    : `Rows ${first}${EN_DASH}${last}, above the column names, were not read — a title.`;
}

/**
 * ⭐ THE FILE WITHOUT THE TITLE ABOVE ITS COLUMN NAMES (D7) — or the file itself, unchanged, when its first row is a
 * header or a contact, when no row among the next `TITLE_ROWS_LOOKAHEAD` names a Phone column by a strong heading, when
 * a contact comes first, or when the file is a vCard or a masked export. See the header for the rule and its guards.
 */
export function dropTitleRows(file: ParsedContactsFile): ParsedContactsFile {
  const rows: readonly ParsedRow[] = file.rows;
  if (file.format === "vcard" || rows.length < 2) return file;
  if (!mayBeTitleRow(rows[0].cells)) return file;
  const last = Math.min(rows.length - 1, TITLE_ROWS_LOOKAHEAD);
  for (let k = 1; k <= last; k++) {
    const cells = rows[k].cells;
    if (strongPhoneHeader(cells)) {
      const kept = rows.slice(k);
      const width = kept.reduce((widest, row) => Math.max(widest, row.cells.length), 0);
      return { ...file, rows: kept, width, notes: [...file.notes, titleRowsNote(rows[0].line, rows[k - 1].line)] };
    }
    // ⛔ A contact is never a title: a row that is itself a contact ends the search.
    if (autoMapHeaders(cells).headerless) return file;
  }
  return file;
}
