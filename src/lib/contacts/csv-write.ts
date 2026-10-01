/**
 * ⭐ THE CONTACT BOOK'S ONE CSV WRITER, AND THE IMPORTER'S REVERSE OF ITS FORMULA GUARD — in ONE file, so
 * the pair cannot drift apart.                                      (U28a, S10 2026-10-01 · decision C16)
 *
 * The export (U34) and the sample sheet (`sample-sheet.ts`) write through `toCsv`; the importer
 * (`draftContactRow` in `contact-fields.ts`) reads every mapped cell through `unguardCell`.
 * ⛔ U34 imports this file. It never copies the transactions route's private `cell()`.
 *
 * ── THE GUARD, AND WHY IT HAS ONE MORE LEAD CHARACTER THAN THE TRANSACTIONS EXPORT ──────────────────
 * A cell that starts with = + - @ TAB or CR is a formula to a spreadsheet, so it is written with a leading
 * apostrophe — the transactions export's rule (`api/admin/transactions/export/route.ts`). 🔴 That rule alone
 * is NOT reversible: a value that really starts with `'=` is written unchanged and read back as `=…`, so an
 * apostrophe the person typed is lost on every round trip. The contacts pair therefore adds the apostrophe
 * itself to the lead set — a value starting with `'` is guarded too — and `unguardCell(guardCell(s)) === s`
 * holds for EVERY string. `test:contacts-import` §F15 drives that over a corpus, and plants the
 * transactions-style guard to prove the assertion can fail. The transactions route is left as it is: it
 * exports and never re-imports.
 *
 * ⚠️ `unguardCell` also runs on FOREIGN files, so a cell someone really typed as `'+255…` loses that one
 * apostrophe. Harmless for a number (`parseTzNumber` strips leading apostrophes anyway) and negligible for a
 * name — said here rather than discovered.
 *
 * ── THE ENVELOPE ─────────────────────────────────────────────────────────────────────────────────
 * Every cell is quoted (RFC 4180, quotes doubled), every line ends CRLF including the last, and the BOM is
 * optional. ⭐ The BOM is what makes Excel read the file as UTF-8 — without it a "—" or an "Ñ" arrives as
 * mojibake — so the contacts export and every sample CSV write it (the transactions export writes none).
 * `delimiter: ";"` writes Excel's `sep=;` line after the BOM, for locales whose list separator is a
 * semicolon. ⚠️ Excel is reported to ignore the BOM when a `sep=` line is present, so the sample button never
 * offers that variant; the suite drives it so the readers are proven against it.
 *
 * ⛔ CONTROL CHARACTERS AND THE BOM ARE BUILT FROM CHAR CODES, never typed as escape text: the editing tools
 * decode escape text into raw invisible characters (repo memory), and a raw BOM in source cannot be seen.
 *
 * Pure: no imports at all.
 * Guard: `npm run test:contacts-import` · red: `npm run red:contacts-import`.
 */

const TAB = String.fromCharCode(9);
const CR = String.fromCharCode(13);
const APOSTROPHE = "'";
const QUOTE = '"';

/** The byte-order mark, U+FEFF — built from its code, never typed (see the header). */
export const CSV_BOM: string = String.fromCharCode(0xfeff);

/** Every line of every CSV this tree writes ends with this, the last line included. */
export const CSV_EOL: string = String.fromCharCode(13, 10);

/**
 * The characters that make a leading cell a formula — exactly the transactions export's set — plus the
 * apostrophe itself, which is what makes the guard reversible (see the header). `test:contacts-import`
 * §F15b reads the transactions route's set out of its source and requires this one to be EXACTLY that set plus
 * `'` — set equality, so an extra lead is caught as surely as a missing one.
 */
export const CSV_GUARD_LEADS: readonly string[] = ["=", "+", "-", "@", TAB, CR, APOSTROPHE];

const LEADS: ReadonlySet<string> = new Set(CSV_GUARD_LEADS);

/** Neutralise a formula: a value whose first character is in `CSV_GUARD_LEADS` gets one leading `'`. */
export function guardCell(s: string): string {
  const v = String(s ?? "");
  return v.length > 0 && LEADS.has(v[0]) ? APOSTROPHE + v : v;
}

/**
 * The exact inverse of `guardCell`: drops ONE leading `'` when the character after it is in the lead set.
 * `'Asha` is left alone (an apostrophe before a letter was never ours).
 */
export function unguardCell(s: string): string {
  const v = String(s ?? "");
  return v.length > 1 && v[0] === APOSTROPHE && LEADS.has(v[1]) ? v.slice(1) : v;
}

/** One cell, guarded and quoted. `null` and `undefined` write an empty quoted cell. */
export function csvCell(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  return QUOTE + guardCell(s).split(QUOTE).join(QUOTE + QUOTE) + QUOTE;
}

export type CsvWriteOptions = {
  /** Write the UTF-8 byte-order mark first. */
  readonly bom?: boolean;
  /** "," (the default), or ";" — which also writes the `sep=;` line after the BOM. */
  readonly delimiter?: "," | ";";
};

/** A whole CSV: every row through `csvCell`, CRLF after every line. */
export function toCsv(
  rows: ReadonlyArray<ReadonlyArray<string | number | null | undefined>>,
  opts: CsvWriteOptions = {},
): string {
  const delimiter = opts.delimiter === ";" ? ";" : ",";
  let out = opts.bom ? CSV_BOM : "";
  if (delimiter === ";") out += "sep=;" + CSV_EOL;
  for (const row of rows) out += row.map(csvCell).join(delimiter) + CSV_EOL;
  return out;
}
