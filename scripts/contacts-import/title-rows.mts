/**
 * test:contacts-import · section "title-rows" — S15 · C3b-fix · D7 (G5): a title above the column names
 * (`src/lib/contacts/title-rows.ts`, `dropTitleRows`) leaves the data, said in ONE note that names rows only.
 *                                                                                                   (S15, 2026-10-09)
 *
 * ⭐ EXECUTED, NOT READ. Files as their readers return them are fed to the real function: a CSV with one title row, a
 * workbook with two title rows, a blank row and a wide title, a header on the tenth row and on the eleventh, a weak
 * "Namba" heading under a title, a file whose first row is a header or a contact, a second header lower down, a masked
 * export, a contact above a header, a vCard — and the rows kept, their REAL line numbers, the width, the blank count and
 * the note are asserted against LITERALS decided by hand. The readers calling it are sections "flow" and "xlsx".
 * ⭐ PROVED BY MUTATION. Every label is named by a red plant — the rule rebuilt in memory from the shipped pieces (U28's
 * header match, `titleRowsNote`) with ONE defect — and the runner requires each plant's OWN label among the reds.
 * ⛔ IN-PROCESS: this module reads two files and makes no file-changing call. ⛔ No escape text: none is needed here.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { decomment } from "../lib/decomment.mts";
import { REPO_ROOT } from "../lib/tracked-files.mts";
import type { ImportSection, RedPlant, SectionContext } from "../contacts-import.test.mts";
import { TITLE_ROWS_LOOKAHEAD, dropTitleRows, titleRowsNote } from "../../src/lib/contacts/title-rows.ts";
import { autoMapHeaders, matchHeader } from "../../src/lib/contacts/contact-fields.ts";
import { isParsedContactsFile, type ParsedContactsFile, type ParsedRow } from "../../src/lib/contacts/parsed-file.ts";

const LF = String.fromCharCode(10);
const CRLF = String.fromCharCode(13, 10);
const EN_DASH = String.fromCharCode(0x2013);
const SOURCE_PATH = "src/lib/contacts/title-rows.ts";
const PINNED_PATH = "scripts/client-graph-safe.test.mjs";

/* ══ THE BUNDLE UNDER TEST ══════════════════════════════════════════════════════════════════════ */

export type TitleRowsImpl = {
  readonly dropTitleRows: typeof dropTitleRows;
  /** title-rows.ts decommented (its imports and directives), and the client-graph-safe PINNED list as on disk. */
  readonly source: string;
  readonly pinned: string;
};

let cached: TitleRowsImpl | null = null;
function real(): TitleRowsImpl {
  if (cached) return cached;
  cached = {
    dropTitleRows,
    source: decomment(readFileSync(join(REPO_ROOT, SOURCE_PATH), "utf8")).split(CRLF).join(LF),
    pinned: readFileSync(join(REPO_ROOT, PINNED_PATH), "utf8"),
  };
  return cached;
}

/* ══ THE FILES — as their readers return them ═══════════════════════════════════════════════════ */

const fileOf = (format: ParsedContactsFile["format"], rows: ParsedRow[], extra: Partial<ParsedContactsFile> = {}): ParsedContactsFile => ({
  format, fileName: `orodha.${format === "xlsx" ? "xlsx" : "csv"}`, rows,
  width: rows.reduce((w, r) => Math.max(w, r.cells.length), 0), blankRows: 0, notes: [], unreadable: [], ...extra,
});

/** T1 · a CSV whose first row is a title, then the column names, then two contacts. */
const CSV_TITLED = fileOf("csv", [
  { line: 1, cells: ["Orodha ya wateja wa Oktoba"] },
  { line: 2, cells: ["Jina", "Simu", "Barua pepe"] },
  { line: 3, cells: ["Asha Juma", "0712 345 678", "asha@example.com"] },
  { line: 4, cells: ["Baraka Moshi", "0754 123 456", ""] },
]);
/** T2 · a workbook: a wide title, a subtitle with a date, a blank row (row 3), the column names on row 4. */
const XLSX_TITLED = fileOf("xlsx", [
  { line: 1, cells: ["Orodha ya wateja", "", "", "", "", "Oktoba"] },
  { line: 2, cells: ["Imeandaliwa na ofisi ya masoko, 09/10/2026"] },
  { line: 4, cells: ["Jina", "Simu ya mkononi"] },
  { line: 5, cells: ["Asha Juma", "0712 345 678"] },
  { line: 6, cells: ["Neema Kimaro", "0688 345 603"] },
], { blankRows: 1, notes: ["Read the sheet “Wateja” (sheet 2 of 2)."] });

/** T3 · the controls: the first row IS the header (a second header row lower down never moves it); the first row is a
 *  contact (S15-5); a vCard; a file of one row. */
const HEADER_FIRST = fileOf("csv", [
  { line: 1, cells: ["Name", "Phone"] },
  { line: 2, cells: ["Wateja wa Dar es Salaam"] },
  { line: 3, cells: ["Name", "Phone"] },
  { line: 4, cells: ["Baraka Moshi", "0754 123 456"] },
]);
const CONTACT_FIRST = fileOf("csv", [
  { line: 1, cells: ["Asha Juma", "0712 345 678"] },
  { line: 2, cells: ["Jina", "Simu"] },
  { line: 3, cells: ["Baraka Moshi", "0754 123 456"] },
]);
const VCARD = fileOf("vcard", [
  { line: 1, cells: ["Simu", "Asha Juma", "", "", ""] },
  { line: 2, cells: ["0712 345 678", "Baraka Moshi", "", "", ""] },
]);
const ONE_ROW = fileOf("csv", [{ line: 1, cells: ["Orodha ya wateja"] }]);

/** T4 · a WEAK phone heading ("Namba" — often a serial) under a title is never taken for the column names; the column
 *  names on the 10th non-empty row are found, on the 11th they are not. */
const WEAK_UNDER_TITLE = fileOf("csv", [
  { line: 1, cells: ["Orodha ya wateja"] },
  { line: 2, cells: ["Namba", "Jina"] },
  { line: 3, cells: ["1", "Asha Juma"] },
]);
const titleThenHeaderAt = (headerRow: number): ParsedContactsFile => fileOf("csv", [
  ...Array.from({ length: headerRow - 1 }, (_, i): ParsedRow => ({ line: i + 1, cells: [`Maelezo ya ${i + 1}`] })),
  { line: headerRow, cells: ["Jina", "Simu"] },
  { line: headerRow + 1, cells: ["Asha Juma", "0712 345 678"] },
]);
const HEADER_ON_10 = titleThenHeaderAt(10);
const HEADER_ON_11 = titleThenHeaderAt(11);

/** T5 · ⛔ a masked export's refused header is never a title; ⛔ a contact above the column names ends the search. */
const MASKED = fileOf("csv", [
  { line: 1, cells: ["phone_masked", "name", "email_masked"] },
  { line: 2, cells: ["+255••••01", "Asha Juma", "a••••@example.com"] },
  { line: 3, cells: ["Phone", "Name"] },
]);
const CONTACT_ABOVE = fileOf("csv", [
  { line: 1, cells: ["Orodha ya wateja"] },
  { line: 2, cells: ["Asha Juma", "0712 345 678"] },
  { line: 3, cells: ["Jina", "Simu"] },
  { line: 4, cells: ["Baraka Moshi", "0754 123 456"] },
]);

/** The notes — LITERALS. */
const NOTE_ONE = "Row 1, above the column names, was not read — a title.";
const NOTE_TWO = `Rows 1${EN_DASH}2, above the column names, were not read — a title.`;
const NOTE_NINE = `Rows 1${EN_DASH}9, above the column names, were not read — a title.`;

/* ══ THE LABELS ═════════════════════════════════════════════════════════════════════════════════ */

export const L = {
  T1: "T1 · ⭐ D7 · a CSV whose first row is a title: the column names (row 2) become the first row, the title leaves the data, ONE note says \"Row 1, above the column names, was not read — a title.\", every line keeps its REAL row number and the file stays a valid parsed file",
  T2: "T2 · ⭐ a workbook with two title rows and a blank row above its column names (row 4): rows 4–6 kept, the blank count kept, the width now the widest row LEFT (2, not the wide title's 6), the reader's own note kept and \"Rows 1–2 …\" added after it",
  T3: "T3 · ⛔ NOTHING CHANGES for a file whose first row is the header (a second header lower down never moves it), whose first row is a contact (S15-5), for a vCard, or for a file of one row — the very same file comes back",
  T4: "T4 · ⛔ only a STRONG phone heading makes a header: a weak \"Namba\" under a title changes nothing; the column names on the 10th non-empty row (the 9th below the first) are found (\"Rows 1–9\"), on the 11th they are not",
  T5: "T5 · ⛔ a masked export's refused header is never a title (its refusal must stand), and a contact above the column names is never dropped as one — both files come back unchanged",
  T6: "T6 · ⛔ §5.14 — the note names rows only: never a word of the rows it drops (no title, no date, no cell)",
  T7: "T7 · ⛔ PURE — title-rows.ts imports ./contact-fields and ./parsed-file alone, carries no directive, and is pinned in client-graph-safe",
} as const;

/* ══ THE RUN ════════════════════════════════════════════════════════════════════════════════════ */

type Ctx = SectionContext<TitleRowsImpl>;
const json = (v: unknown): string => JSON.stringify(v);
const linesOf = (f: ParsedContactsFile): number[] => f.rows.map((r) => r.line);
const DROPPED_WORDS = ["Orodha", "Oktoba", "Imeandaliwa", "09/10/2026", "Maelezo"];

function run({ impl, ok, log }: Ctx): void {
  // ── T1 · one title row ──
  const t1 = impl.dropTitleRows(CSV_TITLED);
  ok(L.T1, json(linesOf(t1)) === json([2, 3, 4]) && json(t1.rows[0]?.cells) === json(["Jina", "Simu", "Barua pepe"]) && json(t1.notes) === json([NOTE_ONE])
    && t1.width === 3 && t1.blankRows === 0 && isParsedContactsFile(t1) && json(CSV_TITLED.rows.map((r) => r.line)) === json([1, 2, 3, 4]),
    `lines ${json(linesOf(t1))} · notes ${json(t1.notes)}`);

  // ── T2 · two title rows, a blank, a wide title ──
  const t2 = impl.dropTitleRows(XLSX_TITLED);
  ok(L.T2, json(linesOf(t2)) === json([4, 5, 6]) && t2.width === 2 && t2.blankRows === 1
    && json(t2.notes) === json(["Read the sheet “Wateja” (sheet 2 of 2).", NOTE_TWO]) && isParsedContactsFile(t2) && t2.format === "xlsx",
    `lines ${json(linesOf(t2))} · width ${t2.width} · blank ${t2.blankRows} · notes ${json(t2.notes)}`);

  // ── T3 · nothing changes ──
  const controls = [HEADER_FIRST, CONTACT_FIRST, VCARD, ONE_ROW].map((f) => ({ f, out: impl.dropTitleRows(f) }));
  const moved = controls.filter(({ f, out }) => out !== f && json(out) !== json(f));
  ok(L.T3, moved.length === 0, moved.map(({ f, out }) => `${f.format} ${json(linesOf(f))} → ${json(linesOf(out))}`).join(" | ") || `${controls.length} files unchanged`);

  // ── T4 · strong only, nine rows below ──
  const weak = impl.dropTitleRows(WEAK_UNDER_TITLE);
  const on10 = impl.dropTitleRows(HEADER_ON_10);
  const on11 = impl.dropTitleRows(HEADER_ON_11);
  ok(L.T4, json(weak) === json(WEAK_UNDER_TITLE) && json(linesOf(on10)) === json([10, 11]) && json(on10.notes) === json([NOTE_NINE])
    && json(on11) === json(HEADER_ON_11) && TITLE_ROWS_LOOKAHEAD === 9,
    `weak ${json(linesOf(weak))} · header on 10 → ${json(linesOf(on10))} ${json(on10.notes)} · on 11 → ${json(linesOf(on11))}`);

  // ── T5 · a masked export, a contact above ──
  const masked = impl.dropTitleRows(MASKED);
  const contactAbove = impl.dropTitleRows(CONTACT_ABOVE);
  ok(L.T5, json(masked) === json(MASKED) && json(contactAbove) === json(CONTACT_ABOVE),
    `masked → ${json(linesOf(masked))} · contact above → ${json(linesOf(contactAbove))}`);

  // ── T6 · the note's words ──
  const notes = [t1, t2, on10].flatMap((f) => f.notes).filter((n) => n.includes("above the column names"));
  const quoted = notes.filter((n) => DROPPED_WORDS.some((w) => n.includes(w)));
  ok(L.T6, notes.length === 3 && quoted.length === 0 && titleRowsNote(1, 1) === NOTE_ONE && titleRowsNote(1, 2) === NOTE_TWO,
    `${notes.length} note(s) · quoting ${json(quoted)}`);

  // ── T7 · the source ──
  const specs = [...impl.source.matchAll(/^\s*import\b[^;]*?from\s*["']([^"']+)["']/gm)].map((m) => m[1]);
  const pinned = impl.pinned.includes(`"lib/contacts/title-rows.ts"`);
  ok(L.T7, json(specs) === json(["./contact-fields", "./parsed-file"]) && !/^\s*["']use (?:client|server)["']/m.test(impl.source) && pinned,
    `imports ${json(specs)} · pinned ${pinned}`);
  log(`title-rows: ${controls.length + 7} files read`);
}

/* ══ THE RED PLANTS — the rule rebuilt in memory with ONE defect each ════════════════════════════════ */

type Twist = {
  /** The first row is never asked: a header or a contact on row 1 is dropped too when a later row names Phone. */
  readonly anyFirst?: boolean;
  /** A weak heading ("Namba") counts as the column names. */
  readonly weak?: boolean;
  /** How far below the first row the column names are looked for. */
  readonly lookahead?: number;
  /** A masked export's refused header may be a title. */
  readonly refusedToo?: boolean;
  /** A contact does not end the search. */
  readonly contactsToo?: boolean;
  /** The kept rows renumbered from 1. */
  readonly renumber?: boolean;
  /** No note. */
  readonly noNote?: boolean;
  /** The width kept from the file as read. */
  readonly keepWidth?: boolean;
  /** The note quotes the first dropped row. */
  readonly quote?: boolean;
};

/** ⭐ The rule, rebuilt from the shipped pieces — U28's header match and `titleRowsNote` — with one twist. */
function dropWith(twist: Twist): typeof dropTitleRows {
  const header = (cells: readonly string[]): boolean => {
    const read = autoMapHeaders(cells);
    const at = read.mapping.phone;
    if (at === undefined || read.headerless) return false;
    const m = matchHeader(cells[at] ?? "");
    return m.kind === "field" && m.field === "phone" && (twist.weak === true || m.strength === "strong");
  };
  return (file) => {
    const rows = file.rows;
    if (file.format === "vcard" || rows.length < 2) return file;
    const first = autoMapHeaders(rows[0].cells);
    if (twist.anyFirst !== true && (first.mapping.phone !== undefined || first.headerless)) return file;
    if (twist.refusedToo !== true && first.refusal !== null && first.columns.some((c) => c.status === "notImported" && c.note === first.refusal)) return file;
    const last = Math.min(rows.length - 1, twist.lookahead ?? TITLE_ROWS_LOOKAHEAD);
    for (let k = 1; k <= last; k++) {
      if (header(rows[k].cells)) {
        const kept = rows.slice(k).map((r, i) => (twist.renumber === true ? { line: i + 1, cells: r.cells } : r));
        const width = twist.keepWidth === true ? file.width : kept.reduce((w, r) => Math.max(w, r.cells.length), 0);
        const note = twist.quote === true
          ? `${titleRowsNote(rows[0].line, rows[k - 1].line).slice(0, -1)}: ${rows[0].cells[0]}.`
          : titleRowsNote(rows[0].line, rows[k - 1].line);
        return { ...file, rows: kept, width, notes: twist.noNote === true ? [...file.notes] : [...file.notes, note] };
      }
      if (twist.contactsToo !== true && autoMapHeaders(rows[k].cells).headerless) return file;
    }
    return file;
  };
}

const PLANTS: readonly RedPlant<TitleRowsImpl>[] = [
  { name: "D7 undone — the title read as the column names, the file as read", expect: L.T1, impl: () => ({ ...real(), dropTitleRows: (f) => f }) },
  { name: "the title rows dropped with no note — the officer never told", expect: L.T1, impl: () => ({ ...real(), dropTitleRows: dropWith({ noNote: true }) }) },
  { name: "the kept rows renumbered from 1 — no longer the officer's own row numbers", expect: L.T1, impl: () => ({ ...real(), dropTitleRows: dropWith({ renumber: true }) }) },
  { name: "the width kept from the wide title — a file the shape check refuses", expect: L.T2, impl: () => ({ ...real(), dropTitleRows: dropWith({ keepWidth: true }) }) },
  { name: "the first row is never asked — a real header dropped when a second header comes lower down", expect: L.T3, impl: () => ({ ...real(), dropTitleRows: dropWith({ anyFirst: true }) }) },
  { name: "a weak \"Namba\" heading taken for the column names", expect: L.T4, impl: () => ({ ...real(), dropTitleRows: dropWith({ weak: true }) }) },
  { name: "the column names looked for past the ninth row below — a page of data taken for a title", expect: L.T4, impl: () => ({ ...real(), dropTitleRows: dropWith({ lookahead: 20 }) }) },
  { name: "a masked export's refused header taken for a title — its refusal lost", expect: L.T5, impl: () => ({ ...real(), dropTitleRows: dropWith({ refusedToo: true }) }) },
  { name: "a contact above the column names dropped as a title", expect: L.T5, impl: () => ({ ...real(), dropTitleRows: dropWith({ contactsToo: true }) }) },
  { name: "the note quotes the title it dropped", expect: L.T6, impl: () => ({ ...real(), dropTitleRows: dropWith({ quote: true }) }) },
  {
    name: "title-rows.ts imports the server store",
    expect: L.T7,
    impl: () => ({ ...real(), source: `import { db } from "@/lib/server/store";${LF}${real().source}` }),
  },
];

export const titleRowsSection: ImportSection<TitleRowsImpl> = {
  name: "title-rows",
  owner: "S15",
  real,
  run,
  plants: PLANTS,
};
