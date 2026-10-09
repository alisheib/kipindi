/**
 * test:contacts-import · section "sheet-choice" — S15 · C3b-fix · D6: the ONE choice of the sheet a workbook is read from
 * (`src/lib/contacts/sheet-choice.ts`) — chosen by the mobile numbers its first rows HOLD, never by a header row.
 *                                                                                                   (S15, 2026-10-09)
 *
 * ⭐ EXECUTED, NOT READ. Workbooks as a reader hands them over (`SheetSample`s, tab order) are fed to the real function:
 * a small staff sheet before the customers, a cover page, a sheet with a Phone header and nothing under it, two sheets
 * holding as many mobiles as each other, a hidden sheet holding the most, a sheet named for a phone number, samples past
 * the 200-row cap — and the sheet chosen, its place among the VISIBLE sheets and every word of the note are asserted
 * against LITERALS decided by hand. The server's reader calling it is section "xlsx"'s business; this one holds the rule.
 * ⭐ PROVED BY MUTATION. Every label is named by a red plant — the defect rebuilt in memory around the shipped pieces
 * (`mobileCellsIn`, `xlsxSheetChoiceNote`) — and the runner requires each plant's OWN label among the reds.
 * ⛔ IN-PROCESS: this module reads two files and makes no file-changing call. ⛔ No escape text: none is needed here.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { decomment } from "../lib/decomment.mts";
import { REPO_ROOT } from "../lib/tracked-files.mts";
import type { ImportSection, RedPlant, SectionContext } from "../contacts-import.test.mts";
import { SHEET_SAMPLE_ROWS, chooseSheet, mobileCellsIn, type SheetSample } from "../../src/lib/contacts/sheet-choice.ts";
import { xlsxSheetChoiceNote, type NotedSheet } from "../../src/lib/contacts/xlsx-limits.ts";

const LF = String.fromCharCode(10);
const CRLF = String.fromCharCode(13, 10);
const SOURCE_PATH = "src/lib/contacts/sheet-choice.ts";
const PINNED_PATH = "scripts/client-graph-safe.test.mjs";

/* ══ THE BUNDLE UNDER TEST ══════════════════════════════════════════════════════════════════════ */

export type SheetChoiceImpl = {
  readonly chooseSheet: typeof chooseSheet;
  readonly mobileCellsIn: typeof mobileCellsIn;
  /** sheet-choice.ts decommented (its imports and directives), and the client-graph-safe PINNED list as on disk. */
  readonly source: string;
  readonly pinned: string;
};

let cached: SheetChoiceImpl | null = null;
function real(): SheetChoiceImpl {
  if (cached) return cached;
  cached = {
    chooseSheet,
    mobileCellsIn,
    source: decomment(readFileSync(join(REPO_ROOT, SOURCE_PATH), "utf8")).split(CRLF).join(LF),
    pinned: readFileSync(join(REPO_ROOT, PINNED_PATH), "utf8"),
  };
  return cached;
}

/* ══ THE WORKBOOKS — each sheet as a reader hands it over ═══════════════════════════════════════ */

/** The n-th test mobile, written as an office writes it: 0757 300 001, 0757 300 002 … (Vodacom's range). */
const mobile = (n: number): string => `0757 ${String(300 + Math.floor(n / 1000)).padStart(3, "0")} ${String(n % 1000).padStart(3, "0")}`;
/** `n` contact rows — a name cell (never a number) and a mobile — numbered from `from`. */
const people = (from: number, n: number, who: string): string[][] => Array.from({ length: n }, (_, i) => [`${who} ${i + 1}`, mobile(from + i)]);
const sheet = (name: string, sample: string[][], visible = true): SheetSample => ({ name, visible, sample });

/** A small staff sheet: its header and three staff with their mobiles. */
const STAFF = sheet("Staff", [["Jina", "Simu", "Cheo"], ...people(1, 3, "Mfanyakazi").map((r) => [...r, "Mhasibu"])]);
/** The customers: a title, the header, ten customers. */
const WATEJA = sheet("Wateja", [["Orodha ya wateja"], ["Jina", "Simu"], ...people(11, 10, "Mteja")]);
/** A cover page: words only. */
const JALADA = sheet("Jalada", [["Orodha ya wateja"], ["Imeandaliwa na ofisi ya masoko"]]);
/** ⭐ A sheet whose header names a Phone column and holds nothing under it — C3b's header rule read it first. */
const HEADER_ONLY = sheet("Contacts", [["Phone", "Name", "Email"]]);
/** Two sheets holding as many mobiles as each other. */
const MAUZO = sheet("Mauzo", [["Jina", "Simu"], ...people(31, 5, "Mnunuzi")]);
const MENGINE = sheet("Mengine", [["Jina", "Simu"], ...people(41, 5, "Mwingine")]);
/** ⛔ A hidden sheet holding the most mobiles of all — never read, never counted. */
const SIRI = sheet("Siri", [["Jina", "Simu"], ...people(51, 50, "Siri")], false);
/** A sheet named for a phone number (its name is never echoed) holding four mobiles. */
const DIGITS = sheet("0757 300 045", [["Jina", "Simu"], ...people(101, 4, "Namba")]);
/** ⭐ The 200-row cap: 250 and 300 rows of one mobile each — both count 200, a tie the earlier one wins. */
const ROWS_250 = sheet("Mia mbili hamsini", people(301, 250, "Mteja"));
const ROWS_300 = sheet("Mia tatu", people(601, 300, "Mteja"));

/* ══ THE NOTES — LITERALS, decided by hand ══════════════════════════════════════════════════════ */

const NOTE_STAFF_FIRST = "Read the sheet “Wateja” (sheet 2 of 2). The sheet “Staff” also holds mobile numbers and was not read: to import it, save it as its own file.";
const NOTE_TWINS = "Read the sheet “Mauzo” (sheet 1 of 2). The sheet “Mengine” holds as many mobile numbers and was not read: to import it, move it to the first place in Excel, or save it as its own file.";
const NOTE_COVER = "Read the sheet “Wateja” (sheet 2 of 2).";
const NOTE_TWO_FEWER = "Read the sheet “Wateja” (sheet 2 of 3). The sheets “Staff” and “Mauzo” also hold mobile numbers and were not read: to import one, save it as its own file.";
const NOTE_HIDDEN = "Read the sheet “Wateja” (sheet 2 of 2). The workbook's hidden sheet was not read.";
const NOTE_NONE = "Read the sheet “Jalada” (sheet 1 of 2).";
const NOTE_NONE_HIDDEN = "Read the sheet “Jalada” (sheet 1 of 1). The workbook's hidden sheet was not read.";
const NOTE_DIGITS_READ = "Read sheet 2 of 2.";
const NOTE_DIGITS_LEFT = "Read the sheet “Wateja” (sheet 2 of 2). Sheet 1 also holds mobile numbers and was not read: to import it, save it as its own file.";

/* ══ THE LABELS ═════════════════════════════════════════════════════════════════════════════════ */

export const L = {
  S1: "S1 · ⭐ D6 · the VISIBLE sheet whose first rows hold the MOST mobile numbers is read, by its index in tab order — the customers after a small staff sheet, after a cover page, and after a sheet whose Phone header holds nothing under it (C3b's header rule read that one)",
  S2: "S2 · ⭐ a tie goes to the EARLIEST visible sheet in tab order (two sheets of five mobiles; the same two after a cover page)",
  S3: "S3 · no visible sheet holds a mobile → the FIRST visible sheet is read, as before C3b (a cover page and a header-only sheet; a hidden sheet before the cover); a workbook with no visible sheet (or none at all) is index -1 with no note",
  S4: "S4 · ⛔ a hidden sheet is NEVER read, though it holds the most mobiles of all, and is never counted in \"sheet N of M\" — the note counts the VISIBLE sheets and says the hidden one was not read",
  S5: "S5 · ⭐ the note names the sheet read and its place among the visible sheets, and every OTHER visible sheet holding mobiles as NOT read with the way that works — as many (a tie): move it to the first place or save it as its own file; fewer: save it as its own file — a sheet holding none is not named, and a workbook of one sheet has no note",
  S6: "S6 · ⛔ §5.14 — a sheet named for a phone number is never echoed, read (its place alone) or not read (\"Sheet 1\"), and no note holds a run of seven digits or a cell's text",
  S7: "S7 · ⭐ the sample is read to its first 200 non-empty rows and no further: 250 and 300 rows of mobiles count 200 each, so the earlier sheet is read; mobileCellsIn counts the cells that yield a mobile (a name cell never)",
  S8: "S8 · ⛔ PURE — sheet-choice.ts imports ./phone-cell and ./xlsx-limits alone, carries no directive, and is pinned in client-graph-safe (the browser's reader for big workbooks runs it)",
} as const;

/* ══ THE RUN ════════════════════════════════════════════════════════════════════════════════════ */

type Ctx = SectionContext<SheetChoiceImpl>;
const json = (v: unknown): string => JSON.stringify(v);
const SEVEN_DIGITS = /[0-9]{7,}/;
/** The cells the fixtures hold — no note may repeat one. */
const CELL_PROBES = ["Mfanyakazi", "Mhasibu", "Mteja 1", "Orodha ya wateja", "Imeandaliwa", "0757 300", "757300"];

function run({ impl, ok, log }: Ctx): void {
  const notes: string[] = [];
  const pick = (sheets: readonly SheetSample[]) => {
    const c = impl.chooseSheet(sheets);
    if (typeof c.note === "string") notes.push(c.note);
    return c;
  };

  // ── S1 · the most mobiles ──
  const s1 = [pick([STAFF, WATEJA]), pick([JALADA, WATEJA]), pick([HEADER_ONLY, WATEJA]), pick([JALADA, STAFF, HEADER_ONLY])];
  ok(L.S1, json(s1.map((c) => c.index)) === json([1, 1, 1, 1]), json(s1.map((c) => c.index)));

  // ── S2 · a tie ──
  const s2 = [pick([MAUZO, MENGINE]), pick([JALADA, MENGINE, MAUZO])];
  ok(L.S2, json(s2.map((c) => c.index)) === json([0, 1]), json(s2.map((c) => c.index)));

  // ── S3 · none anywhere ──
  const none = pick([JALADA, HEADER_ONLY]);
  const noneHidden = pick([SIRI, JALADA]);
  const noVisible = pick([SIRI]);
  const empty = pick([]);
  ok(L.S3, none.index === 0 && none.note === NOTE_NONE && noneHidden.index === 1 && noneHidden.note === NOTE_NONE_HIDDEN
    && noVisible.index === -1 && noVisible.note === null && empty.index === -1 && empty.note === null,
    json({ none, noneHidden, noVisible, empty }));

  // ── S4 · hidden never ──
  const hidden = pick([JALADA, SIRI, WATEJA]);
  ok(L.S4, hidden.index === 2 && hidden.note === NOTE_HIDDEN, json(hidden));

  // ── S5 · the note ──
  const s5 = { staff: pick([STAFF, WATEJA]), twins: pick([MAUZO, MENGINE]), cover: pick([JALADA, WATEJA]), two: pick([STAFF, WATEJA, MAUZO]), one: pick([WATEJA]) };
  ok(L.S5, s5.staff.note === NOTE_STAFF_FIRST && s5.twins.note === NOTE_TWINS && s5.cover.note === NOTE_COVER && s5.two.note === NOTE_TWO_FEWER
    && s5.one.index === 0 && s5.one.note === null,
    Object.entries(s5).map(([k, c]) => `${k}: ${c.index} "${c.note}"`).join(" | "));

  // ── S6 · a name that is a number, and the notes' words ──
  const digitsRead = pick([JALADA, DIGITS]);
  const digitsLeft = pick([DIGITS, WATEJA]);
  const leaks = notes.filter((n) => SEVEN_DIGITS.test(n.split(" ").join("")) || CELL_PROBES.some((p) => n.includes(p)) || n.includes("0757"));
  ok(L.S6, digitsRead.index === 1 && digitsRead.note === NOTE_DIGITS_READ && digitsLeft.index === 1 && digitsLeft.note === NOTE_DIGITS_LEFT
    && leaks.length === 0 && notes.length >= 10,
    `read "${digitsRead.note}" · left "${digitsLeft.note}" · ${leaks.length} leak(s) of ${notes.length} note(s) ${json(leaks.slice(0, 2))}`);

  // ── S7 · the cap ──
  const capped = pick([ROWS_250, ROWS_300]);
  const counts = [impl.mobileCellsIn(ROWS_250.sample), impl.mobileCellsIn(ROWS_300.sample), impl.mobileCellsIn(WATEJA.sample), impl.mobileCellsIn(STAFF.sample), impl.mobileCellsIn(JALADA.sample)];
  ok(L.S7, capped.index === 0 && json(counts) === json([SHEET_SAMPLE_ROWS, SHEET_SAMPLE_ROWS, 10, 3, 0]) && SHEET_SAMPLE_ROWS === 200,
    `index ${capped.index} · counts ${json(counts)}`);

  // ── S8 · the source ──
  const specs = [...impl.source.matchAll(/^\s*import\b[^;]*?from\s*["']([^"']+)["']/gm)].map((m) => m[1]);
  const pinned = impl.pinned.includes(`"lib/contacts/sheet-choice.ts"`);
  ok(L.S8, json(specs) === json(["./phone-cell", "./xlsx-limits"]) && !/^\s*["']use (?:client|server)["']/m.test(impl.source) && pinned,
    `imports ${json(specs)} · pinned ${pinned}`);
  log(`sheet-choice: ${notes.length} note(s) read`);
}

/* ══ THE RED PLANTS — the rule rebuilt in memory with ONE defect each ════════════════════════════════ */

/** How one plant bends the rule. */
type Twist = {
  /** A tie goes to the last of the sheets holding the most. */
  readonly tieLast?: boolean;
  /** No visible sheet holds a mobile → the LAST visible sheet. */
  readonly noneLast?: boolean;
  /** Hidden sheets are read like visible ones. */
  readonly readHidden?: boolean;
  /** Places and the total counted over EVERY sheet, hidden ones included. */
  readonly placesOverAll?: boolean;
  /** Every other sheet holding mobiles is told to move to the first place, fewer or not. */
  readonly allTied?: boolean;
  /** The sample read to the end, past the cap. */
  readonly uncapped?: boolean;
};

/** A note cut to its first sentence — the sheet read, and nothing about the others. */
const firstSentence = (note: string): string => {
  const at = note.indexOf(". ");
  return at < 0 ? note : note.slice(0, at + 1);
};

/** Cells yielding a mobile over EVERY row — the cap undone. */
const countAll = (sample: ReadonlyArray<ReadonlyArray<string>>): number =>
  sample.reduce((n, row) => n + row.filter((cell) => mobileCellsIn([[cell]]) > 0).length, 0);

/** ⭐ The rule, rebuilt from the shipped pieces — `mobileCellsIn` and `xlsxSheetChoiceNote` — with one twist. */
function chooser(twist: Twist): typeof chooseSheet {
  return (sheets) => {
    const all = [...sheets];
    const pool = all.map((s, index) => ({ s, index })).filter(({ s }) => s.visible || twist.readHidden === true);
    if (pool.length === 0) return { index: -1, note: null };
    const scored = pool.map(({ s, index }, i) => ({
      index,
      count: twist.uncapped === true ? countAll(s.sample) : mobileCellsIn(s.sample),
      at: { name: s.name, position: twist.placesOverAll === true ? index + 1 : i + 1 } as NotedSheet,
    }));
    const max = Math.max(...scored.map((x) => x.count));
    const best = scored.filter((x) => x.count === max);
    const chosen = max === 0 ? (twist.noneLast === true ? scored[scored.length - 1] : scored[0]) : twist.tieLast === true ? best[best.length - 1] : best[0];
    if (all.length === 1) return { index: chosen.index, note: null };
    const others = scored.filter((x) => x !== chosen && x.count > 0);
    const tied = others.filter((x) => twist.allTied === true || x.count === chosen.count).map((x) => x.at);
    const fewer = twist.allTied === true ? [] : others.filter((x) => x.count < chosen.count).map((x) => x.at);
    const hiddenCount = all.filter((s) => !s.visible).length;
    const total = twist.placesOverAll === true ? all.length : scored.length;
    return { index: chosen.index, note: xlsxSheetChoiceNote(chosen.at, total, twist.readHidden === true ? 0 : hiddenCount, tied, fewer) };
  };
}

const PLANTS: readonly RedPlant<SheetChoiceImpl>[] = [
  {
    name: "D6 undone — the FIRST visible sheet is always read (the cover page, the staff sheet, the empty Phone header)",
    expect: L.S1,
    impl: () => ({ ...real(), chooseSheet: (sheets) => ({ ...chooseSheet(sheets), index: sheets.findIndex((s) => s.visible) }) }),
  },
  {
    name: "a tie goes to the LAST of the sheets holding the most",
    expect: L.S2,
    impl: () => ({ ...real(), chooseSheet: chooser({ tieLast: true }) }),
  },
  {
    name: "a workbook with no mobile on any visible sheet is read from its LAST visible sheet",
    expect: L.S3,
    impl: () => ({ ...real(), chooseSheet: chooser({ noneLast: true }) }),
  },
  {
    name: "a hidden sheet holding the most mobiles is read",
    expect: L.S4,
    impl: () => ({ ...real(), chooseSheet: chooser({ readHidden: true }) }),
  },
  {
    name: "the note counts the hidden sheets in \"sheet N of M\"",
    expect: L.S4,
    impl: () => ({ ...real(), chooseSheet: chooser({ placesOverAll: true }) }),
  },
  {
    name: "the note never names the other sheets that hold mobiles",
    expect: L.S5,
    impl: () => ({ ...real(), chooseSheet: (sheets) => { const c = chooseSheet(sheets); return { ...c, note: c.note === null ? null : firstSentence(c.note) }; } }),
  },
  {
    name: "a sheet holding FEWER mobiles is told to move to the first place — which would read the same sheet again",
    expect: L.S5,
    impl: () => ({ ...real(), chooseSheet: chooser({ allTied: true }) }),
  },
  {
    name: "the note echoes a sheet named for a phone number",
    expect: L.S6,
    impl: () => ({
      ...real(),
      chooseSheet: (sheets) => {
        const c = chooseSheet(sheets);
        return c.note === NOTE_DIGITS_READ ? { ...c, note: "Read the sheet “0757 300 045” (sheet 2 of 2)." } : c;
      },
    }),
  },
  {
    name: "the sample read past its 200 rows — the longer sheet wins on rows no reader samples",
    expect: L.S7,
    impl: () => ({ ...real(), chooseSheet: chooser({ uncapped: true }), mobileCellsIn: countAll }),
  },
  {
    name: "sheet-choice.ts imports the server store",
    expect: L.S8,
    impl: () => ({ ...real(), source: `import { db } from "@/lib/server/store";${LF}${real().source}` }),
  },
];

export const sheetChoiceSection: ImportSection<SheetChoiceImpl> = {
  name: "sheet-choice",
  owner: "S15",
  real,
  run,
  plants: PLANTS,
};
