/**
 * ONE CSV CELL — RFC-4180 quoting plus spreadsheet-formula neutralisation, for every CSV the console hands out
 * (C5-SPEC ruling 186 (3)).
 *
 * Every value is quoted and its quotes doubled. A value that starts with `=`, `+`, `-`, `@`, a tab or a carriage return
 * gets a leading apostrophe, so a cell opened in Excel or Sheets is text and can never run as a formula (CSV injection).
 * Moved unchanged from the transactions export route, so the regulator CSV and every later export escape the same way.
 */
export function csvCell(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}
