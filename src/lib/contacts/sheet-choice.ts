/**
 * ⭐ WHICH SHEET OF A WORKBOOK IS READ — chosen by what its first rows HOLD, through ONE function every reader calls.
 *                                   (S15 · C3b-fix · D6 · G2, 2026-10-09 · docs/CONTACTS-SCREEN-PLAN.md §1 row C3b)
 *
 * A workbook carries more than its contacts: a cover page first, a small staff sheet before the customers, a sheet whose
 * header names a Phone column and holds nothing under it. C3b chose the first visible sheet whose HEADER ROW mapped a
 * Phone column — and so read a header-only sheet, or a staff list of five, ahead of the customers, and read nothing at
 * all past a title row above the column names. The review (2026-10-09) decided D6: the sheet is chosen by its CONTENT.
 *   · Per VISIBLE sheet, the cells of its first `SHEET_SAMPLE_ROWS` non-empty rows that yield a Tanzanian mobile number
 *     are counted (`mobileCellsIn` — the ONE phone-cell rule, `firstMobileIn`: a cell yields one only when it holds
 *     exactly one distinct mobile). The visible sheet with the MOST is read; a tie goes to the earliest in tab order;
 *     when no visible sheet holds one, the first visible sheet is read, as before C3b.
 *   · ⛔ A hidden or veryHidden sheet is never read, whatever it holds — and never counted in "sheet N of M".
 *   · The note (`xlsxSheetChoiceNote`, the copy table — its ONE sheet-name rule echoes no name carrying seven or more
 *     digits) names the sheet read and its place among the VISIBLE sheets, and names every other visible sheet whose
 *     sample holds mobile numbers as NOT read, with the way to import it that works. A workbook of one sheet has no note.
 * ⭐ ONE FUNCTION, TWO READERS: the server's reader (`src/lib/server/contacts/import-xlsx.ts`, a workbook within 700 KB)
 * and the browser's reader for big workbooks (step C3c) both call `chooseSheet` with the same `SheetSample`s — the sheet
 * read never depends on which reader read it. ⛔ ITS SIGNATURE IS THAT CONTRACT: `chooseSheet(sheets)` →
 * `{ index, note }`; a change to it is a change to both readers.
 *
 * ⛔ PURE AND CLIENT-SAFE: it imports `./phone-cell` and `./xlsx-limits` alone (both client-safe, both pinned), and is
 * pinned in `test:client-graph-safe` itself — the browser's reader runs it. No directive, no server module, no builtin.
 * Guard: `npm run test:contacts-import` (section "sheet-choice"; the server reader's use of it: section "xlsx") · red:
 * `npm run red:contacts-import`.
 */
import { firstMobileIn } from "./phone-cell";
import { xlsxSheetChoiceNote, type NotedSheet } from "./xlsx-limits";

/** ⭐ The most NON-EMPTY rows of a sheet `chooseSheet` reads: a sheet's first 200 rows say what it holds. */
export const SHEET_SAMPLE_ROWS = 200;

/**
 * One sheet of a workbook, in tab order, as a reader hands it over. `sample` is its first ≤ `SHEET_SAMPLE_ROWS`
 * non-empty rows, each as its cells' texts — read through the reader's own cell switch, so the sheet is judged on exactly
 * the text it would import; empty cells may be left out (only the cells that yield a mobile are counted, never a place).
 */
export type SheetSample = {
  /** The sheet's name as the workbook stores it — echoed only through the copy table's sheet-name rule. */
  readonly name: string;
  /** Visible in Excel. A hidden or veryHidden sheet is false — and is never read. */
  readonly visible: boolean;
  readonly sample: ReadonlyArray<ReadonlyArray<string>>;
};

/**
 * The sheet to read — its index in the list handed in (tab order, hidden sheets included), or -1 when no sheet is
 * visible (the reader refuses such a workbook: every sheet hidden) — and the note that says which sheet was read and
 * which were not, or null for a workbook of one sheet.
 */
export type SheetChoice = { readonly index: number; readonly note: string | null };

/**
 * ⭐ How many cells of a sheet's sample yield a Tanzanian mobile number — `firstMobileIn`, the ONE phone-cell rule — over
 * its first `SHEET_SAMPLE_ROWS` non-empty rows (a longer sample is read no further). Exported for a reader that must say
 * whether the sheet it read holds any (the columns step's sheet hint, D8): `chooseSheet` reads the sheet with the most,
 * so 0 here for the sheet read means no visible sheet holds one.
 */
export function mobileCellsIn(sample: ReadonlyArray<ReadonlyArray<string>>): number {
  let rows = 0;
  let mobiles = 0;
  for (const row of Array.isArray(sample) ? sample : []) {
    if (rows >= SHEET_SAMPLE_ROWS) break;
    let filled = false;
    for (const cell of Array.isArray(row) ? row : []) {
      const text = typeof cell === "string" ? cell : "";
      if (text.trim() === "") continue;
      filled = true;
      if (firstMobileIn(text) !== null) mobiles++;
    }
    if (filled) rows++;
  }
  return mobiles;
}

/**
 * ⭐ THE ONE CHOICE OF SHEET (D6). The visible sheet whose sample holds the MOST cells that yield a mobile; a tie → the
 * earliest in tab order; none anywhere → the first visible sheet. ⛔ A hidden or veryHidden sheet is never chosen and
 * never counted. The note: the sheet read and its place among the visible sheets; every other visible sheet holding
 * mobiles, named NOT read — `tied` (as many as the one read: moving it first reads it) or `fewer` (only its own file
 * reads it); the hidden sheets, counted. Null for a workbook of one sheet.
 */
export function chooseSheet(sheets: ReadonlyArray<SheetSample>): SheetChoice {
  const list = Array.isArray(sheets) ? sheets : [];
  const visible: Array<{ readonly index: number; readonly at: NotedSheet; readonly count: number }> = [];
  let hidden = 0;
  list.forEach((sheet, index) => {
    if (sheet?.visible !== true) {
      hidden++;
      return;
    }
    const at: NotedSheet = { name: typeof sheet.name === "string" ? sheet.name : "", position: visible.length + 1 };
    visible.push({ index, at, count: mobileCellsIn(sheet.sample) });
  });
  if (visible.length === 0) return { index: -1, note: null };
  let chosen = visible[0];
  for (const v of visible) if (v.count > chosen.count) chosen = v;
  if (list.length === 1) return { index: chosen.index, note: null };
  const others = visible.filter((v) => v !== chosen && v.count > 0);
  const tied = others.filter((v) => v.count === chosen.count).map((v) => v.at);
  const fewer = others.filter((v) => v.count < chosen.count).map((v) => v.at);
  return { index: chosen.index, note: xlsxSheetChoiceNote(chosen.at, visible.length, hidden, tied, fewer) };
}
