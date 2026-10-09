/**
 * THE CELL RULES BOTH EXCEL READERS SHARE — what a workbook cell's value READS AS, and the notes that name the rows a
 * reader read as blank.                                       (S15 · C3c, 2026-10-09 · docs/CONTACTS-SCREEN-PLAN.md §4)
 *
 * ⭐ WHY THIS FILE EXISTS. Since C3c a workbook reaches the importer by one of TWO readers: up to 700 KB the SERVER reads
 * it with exceljs (`src/lib/server/contacts/import-xlsx.ts`, U27b — proven, audited, unchanged in what it decides), and
 * past that the BROWSER reads it itself (`xlsx-read.ts`), because the only way past the 700 KB upload cap used to be
 * "save it as CSV" — and Excel writes a 12-digit General number to CSV as `2.55713E+11`, its last digits gone for good.
 * Two readers may never mean two things. So every rule that turns a cell's VALUE into the text the importer sees, and
 * every note sentence about cells read as blank, lives HERE, ONCE, and both readers import it: the server's switch
 * (`xlsxCellText`) hands exceljs's value to `xlsxValueText`; the browser reader builds the very value shapes exceljs
 * 4.4.0 builds (a number, a string, a boolean, a Date, `{ error }`, `{ richText }`) and hands them to the same function.
 * ⭐ THE GUARD THAT HOLDS THE TWO TOGETHER is not this file alone: `test:contacts-import` section "xlsx-browser" reads
 * every workbook of a corpus through BOTH readers and requires the identical `ParsedContactsFile` (or the identical
 * refusal) — the differential — and plants a defect in each shared rule to prove the literal checks see it.
 *
 * THE RULES (moved here verbatim from the server reader, where U27b wrote and proved them — §X13–§X19):
 *   · A NUMBER reads as text: an integer exactly; float noise past Excel's own 15 significant digits rounded away
 *     (712345678.0000001 reads 712345678, 0.1 + 0.2 reads 0.3); a genuine decimal kept (3.5) — Math.round on every
 *     number would corrupt a 3.5 in a column the reader cannot know is not the phone's.
 *   · 🔴 A1.3 · EXCEL'S NUMERIC SHORTENED FORM. A CSV holding Excel's display of a 12-digit number, re-saved as .xlsx,
 *     stores the NUMBER 255713000000 — a valid-looking number that belongs to a stranger. So an integer of at least 1e11
 *     that is divisible by 1e6 reads as Excel's scientific text (`2.55713E+11`), and U28's one detector (applied in
 *     `draftContactRow`, never here — M6) makes the row invalid with the shortened-number sentence.
 *   · A DATE reads as ISO: the day alone at midnight, else the day and the time to the second (exceljs reads a serial as
 *     UTC wall time; an invalid date reads blank).
 *   · A BOOLEAN reads TRUE or FALSE. Rich text is its runs joined. A hyperlink reads its display text.
 *   · An ERROR value, a FORMULA whose saved value is empty or missing, and a cell COVERED by a merge read blank, each with
 *     its flag — and each flag becomes ONE note naming the rows (never what was in them).
 *   · A string is kept VERBATIM — never trimmed, never "repaired": `2.55713E+11` stays exactly that.
 *
 * ⛔ PURE AND CLIENT-SAFE: it imports `parsed-file.ts` alone — no React, no directive, no src/lib/server, no exceljs, no
 * Node built-in (`test:contacts-boundary` §2 · pinned in `test:client-graph-safe`). ⛔ NOTHING HERE QUOTES A CELL (§5.14):
 * the notes name rows. ⛔ No control character and no escape text is typed in this file.
 */
import { formatRowList } from "./parsed-file";

/* ══ WHAT A CELL READS AS ══════════════════════════════════════════════════════════════════════════════════════ */

/** Why a cell read as blank although it held something — each becomes a note naming its rows. */
export type CellFlag = "formula_without_result" | "error" | "merged";

/** One cell, read: its text (verbatim) and, when it read blank for a reason, that reason. */
export type CellRead = { readonly text: string; readonly flag: CellFlag | null };

/** A number to its text — `xlsxNumberText` in production; a seam the suites plant a defect through. */
export type NumberText = (v: number) => string;

/** Every flag, in the order its note is written. */
export const CELL_FLAGS: readonly CellFlag[] = ["formula_without_result", "error", "merged"];

/** Excel holds 15 significant digits; whatever a double carries past them is binary noise, never data. */
const EXCEL_DIGITS = 15;

/**
 * A number as text: an integer exactly; float noise past Excel's 15 significant digits rounded away (712345678.0000001
 * reads 712345678, 0.1 + 0.2 reads 0.3); a genuine decimal kept (3.5). 🔴 A1.3 — an integer of at least 1e11 that is
 * divisible by 1e6 is written as Excel's scientific text, so U28's one detector refuses it: it is what a re-saved
 * `2.55713E+11` becomes, and as digits it reads as a stranger's valid number.
 */
export function xlsxNumberText(v: number): string {
  if (!Number.isFinite(v)) return "";
  const n = Number.isInteger(v) ? v : Number(v.toPrecision(EXCEL_DIGITS));
  if (!Number.isInteger(n)) return String(n);
  if (n >= 1e11 && n % 1e6 === 0) return n.toExponential().toUpperCase();
  return Number.isSafeInteger(n) ? String(n) : BigInt(n).toString();
}

/** A Date as ISO: the day alone at midnight, else the day and the time (exceljs reads the serial as UTC wall time). */
export function xlsxDateText(d: Date): string {
  if (!Number.isFinite(d.getTime())) return "";
  const iso = d.toISOString();
  return iso.endsWith("T00:00:00.000Z") ? iso.slice(0, 10) : iso.slice(0, 19);
}

/** A boolean as Excel shows it. */
export function xlsxBooleanText(b: boolean): string {
  return b ? "TRUE" : "FALSE";
}

/** A cell with nothing to read. */
export const XLSX_BLANK_CELL: CellRead = { text: "", flag: null };

const runText = (run: unknown): string =>
  typeof run === "object" && run !== null && typeof (run as { text?: unknown }).text === "string" ? (run as { text: string }).text : "";

/**
 * ⭐ THE value → text rule, for every value shape exceljs 4.4.0 gives a cell (and the browser reader builds the same
 * shapes): nothing → blank; a number through `numberText`; a string verbatim; a boolean TRUE/FALSE; a Date as ISO;
 * `{ error }` → blank, flagged; `{ richText }` → its runs joined; `{ hyperlink, text }` → its display text; a formula
 * object → its result, or blank flagged when it has none. Any other shape reads blank.
 */
export function xlsxValueText(v: unknown, numberText: NumberText = xlsxNumberText): CellRead {
  if (v === null || v === undefined) return XLSX_BLANK_CELL;
  if (typeof v === "number") return { text: numberText(v), flag: null };
  if (typeof v === "string") return { text: v, flag: null };
  if (typeof v === "boolean") return { text: xlsxBooleanText(v), flag: null };
  if (v instanceof Date) return { text: xlsxDateText(v), flag: null };
  if (typeof v !== "object") return XLSX_BLANK_CELL;
  const o = v as Record<string, unknown>;
  if ("error" in o) return { text: "", flag: "error" };
  if (Array.isArray(o.richText)) return { text: o.richText.map(runText).join(""), flag: null };
  if ("hyperlink" in o) return xlsxValueText(o.text, numberText);
  if ("formula" in o || "sharedFormula" in o) {
    return o.result === undefined || o.result === null ? { text: "", flag: "formula_without_result" } : xlsxValueText(o.result, numberText);
  }
  return XLSX_BLANK_CELL;
}

/* ══ THE NOTES — rows named, never a cell ══════════════════════════════════════════════════════════════════════ */

const capital = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Rows holding a formula with no saved value. ⚠️ exceljs cannot tell a formula whose saved value is an empty text
 * (`=IF(A2="","",A2)`, written with an empty value) from one never calculated (a file written by a library) — and the
 * browser reader reads them the same way — so the sentence names both and makes the re-save conditional.
 */
export function xlsxFormulaNote(lines: readonly number[]): string {
  const one = lines.length === 1;
  return `${capital(formatRowList(lines))} ${one ? "has a formula whose saved value is" : "have formulas whose saved values are"} empty or missing, so ${one ? "it was" : "they were"} read as blank. If ${one ? "it" : "they"} should hold something, open the file in Excel, save it, and choose it again.`;
}

/** Rows holding an error value (like #N/A). */
export function xlsxErrorNote(lines: readonly number[]): string {
  const one = lines.length === 1;
  return `${capital(formatRowList(lines))} ${one ? "holds an error value" : "hold error values"} (like #N/A), so ${one ? "it was" : "they were"} read as blank.`;
}

/** Rows with cells covered by a merge: only a merge's first cell holds its value. */
export function xlsxMergedNote(lines: readonly number[]): string {
  return `${capital(formatRowList(lines))} ${lines.length === 1 ? "has" : "have"} merged cells; only the first cell of each merge holds its value, so the others were read as blank.`;
}

/** A workbook with more than one sheet, read from its FIRST visible one: how many others it has, hidden ones counted. */
export function xlsxOtherSheetsNote(others: number, hidden: number): string {
  return `This workbook has ${others} other ${others === 1 ? "sheet" : "sheets"}${hidden > 0 ? ` (${hidden} hidden)` : ""}; only the first visible sheet was read.`;
}

/** ⭐ The cell notes of a read sheet, in their ONE order — formulas, errors, merges — each only when it names a row. */
export function xlsxCellNotes(flagged: Readonly<Record<CellFlag, readonly number[]>>): string[] {
  const notes: string[] = [];
  if (flagged.formula_without_result.length > 0) notes.push(xlsxFormulaNote(flagged.formula_without_result));
  if (flagged.error.length > 0) notes.push(xlsxErrorNote(flagged.error));
  if (flagged.merged.length > 0) notes.push(xlsxMergedNote(flagged.merged));
  return notes;
}
