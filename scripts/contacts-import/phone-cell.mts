/**
 * test:contacts-import · section "phone-cell" — S15 · C3b · G3 and the review round C3b-fix (D1, D3, D4, D10): the ONE
 * phone-cell rule (`src/lib/contacts/phone-cell.ts`) and the server's three callers of it — staging's key, the check's
 * sentence, the commit's raw text.                                                                  (S15, 2026-10-09)
 *
 * ⭐ EXECUTED, NOT READ. Every separator a person puts between two numbers in one phone cell is fed to the real rule and
 * must cut the cell in two; ⛔ D3 — a cell holding two DISTINCT mobiles yields NONE, its sentence the several-mobiles one,
 * while a cell holding exactly ONE distinct mobile among other numbers (a Kenyan, a landline, a number cut short, a
 * withdrawn range, labels, the same mobile again) yields it whichever comes first; a cell of only foreign or landline
 * numbers yields none, with its first number's own sentence (never "keep one"); two numbers kept apart by spaces alone are
 * never joined, and every key a cell yields is the key of the whole cell or of one of its parts (D10); a cell that IS one
 * number — whatever joins its digit groups, Excel's thousands commas included — stays that number; ⛔ D4 — a bare
 * nine-digit part is never a mobile ("+254, 712 345 678" never becomes a stranger's +255 number) while a WHOLE cell of
 * bare nine digits keeps its reading. Then the server: `stagedRowFrom` stages a one-mobile cell's key while `rawPhone`
 * keeps the whole cell, a two-mobile cell stages none, the check's classifier words both through the rule, and a REAL
 * check, start and commit step on the memory twin (`scripts/lib/contacts-import-world.mts`) creates ONE contact whose raw
 * text is the number it was read from — nobody else's number rides into it, and a two-mobile row creates nobody.
 * ⛔ C3b-fix · D1 — THE COST: every function is timed on a 200,000-space cell (asked in growing runs, so a quadratic plant
 * is caught at 40,000 instead of holding the run for minutes) and on Excel's longest cell of "a a a …" (H9), and a cell
 * longer than the phone field's limit is never split (H10, at the limit and one character past it).
 * ⭐ PROVED BY MUTATION. Every label is named by a red plant — a replacement bundle built in memory around the shipped
 * function, or the rule rebuilt from the shipped cut with ONE defect — and the runner requires each plant's OWN label
 * among the reds.
 * ⛔ IN-PROCESS: this module reads two files and makes no file-changing call; the end-to-end case runs on an emptied memory
 * twin and puts every map back. ⛔ Every control character is built from its code.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { decomment } from "../lib/decomment.mts";
import { REPO_ROOT } from "../lib/tracked-files.mts";
import type { ImportSection, RedPlant, SectionContext } from "../contacts-import.test.mts";
import type { ImportCommitDeps } from "../../src/lib/server/contacts/import-commit.ts";
import type { StoredContactImportRow, StoredMarketingContact } from "../../src/lib/server/store.ts";
import {
  SEVERAL_MOBILES_SENTENCE, cutsCell, firstMobileIn, firstMobileIndex, mobilesIn, phoneCellParts, phoneCellPieces, phoneCellRefusal,
  type CellMobile,
} from "../../src/lib/contacts/phone-cell.ts";
import { CONTACT_LIMITS } from "../../src/lib/contacts/contact-fields.ts";
import { parseTzNumber, readAsciiDigits } from "../../src/lib/tz-msisdn.ts";
import { adjustTally } from "../../src/lib/contacts/import-decide.ts";
import {
  NOW, OFFICER, TEST_REFUSAL_AUDIT, captureAudit, checkModule, commitModule, inFreshStore, mem, stageFile, staging,
} from "../lib/contacts-import-world.mts";

/* ⛔ Control characters from their codes — the editing tools decode escape text into raw characters. */
const LF = String.fromCharCode(10);
const CR = String.fromCharCode(13);
const CRLF = CR + LF;

const SOURCE_PATH = "src/lib/contacts/phone-cell.ts";
const PINNED_PATH = "scripts/client-graph-safe.test.mjs";
const AT = NOW.toISOString();
/** A run as staging drafts a row against it: Phone in column A, Name in column B. */
const RUN = { id: "ci_abcdefghijklmnopqrst", mapping: { phone: 0, name: 1 } };

/* ══ THE BUNDLE UNDER TEST ══════════════════════════════════════════════════════════════════════ */

export type PhoneCellImpl = {
  readonly mobilesIn: typeof mobilesIn;
  readonly firstMobileIn: typeof firstMobileIn;
  readonly phoneCellParts: typeof phoneCellParts;
  /** C8c · M1 · the cut itself, every piece kept (the labels too). */
  readonly phoneCellPieces: typeof phoneCellPieces;
  readonly firstMobileIndex: typeof firstMobileIndex;
  /** C8c · the list paste's question, asked of the cut itself. */
  readonly cutsCell: typeof cutsCell;
  readonly phoneCellRefusal: typeof phoneCellRefusal;
  /** Staging's ONE row builder (`import-staging.ts`). */
  readonly stagedRowFrom: typeof staging.stagedRowFrom;
  /** The check's ONE classifier (`import-check.ts`). */
  readonly classify: typeof checkModule.classifyStagedRow;
  /** The commit's dependencies for the end-to-end case: the shipped ones, the audit captured and the clock fixed. */
  readonly commitDeps: ImportCommitDeps;
  /** phone-cell.ts exactly as on disk (the character scan) and decommented (the imports). */
  readonly rawSource: string;
  readonly source: string;
  /** scripts/client-graph-safe.test.mjs as on disk — its PINNED list. */
  readonly pinned: string;
};

const { IMPORT_COMMIT_DEPS, commitContactImportStep, startContactImport } = commitModule;
const { checkContactImport } = checkModule;

const REAL_DEPS: ImportCommitDeps = {
  ...IMPORT_COMMIT_DEPS,
  audit: captureAudit,
  refusalAudit: TEST_REFUSAL_AUDIT,
  now: () => NOW,
  stagingDeps: { ...IMPORT_COMMIT_DEPS.stagingDeps, audit: captureAudit, refusalAudit: TEST_REFUSAL_AUDIT, now: () => NOW },
};

let cached: PhoneCellImpl | null = null;
function real(): PhoneCellImpl {
  if (cached) return cached;
  const raw = readFileSync(join(REPO_ROOT, SOURCE_PATH), "utf8");
  cached = {
    mobilesIn,
    firstMobileIn,
    phoneCellParts,
    phoneCellPieces,
    firstMobileIndex,
    cutsCell,
    phoneCellRefusal,
    stagedRowFrom: staging.stagedRowFrom,
    classify: checkModule.classifyStagedRow,
    commitDeps: REAL_DEPS,
    rawSource: raw,
    source: decomment(raw).split(CRLF).join(LF),
    pinned: readFileSync(join(REPO_ROOT, PINNED_PATH), "utf8"),
  };
  return cached;
}

/* ══ THE FIXTURES — every number goes through the real parser in the assertions ═════════════════ */

/** H1 · each separator between two DISTINCT mobiles: 0757 300 001 and 0757 300 002 — two people's worth. */
const SEPARATED: ReadonlyArray<readonly [string, string]> = [
  ["Google's ' ::: '", "+255 757 300 001 ::: +255 757 300 002"],
  ["a solidus", "0757 300 001 / 0757 300 002"],
  ["a semicolon", "0757 300 001; 0757 300 002"],
  ["a comma", "0757300001, 0757300002"],
  ["a vertical line", "0757 300 001 | 0757 300 002"],
  ["an ampersand", "0757 300 001 & 0757 300 002"],
  ["a line break (LF)", `0757 300 001${LF}0757 300 002`],
  ["a line break (CRLF)", `0757 300 001${CRLF}0757 300 002`],
  ["'or'", "0757 300 001 or 0757 300 002"],
  ["'OR' in capitals", "0757 300 001 OR 0757 300 002"],
  ["the Swahili 'au' (or)", "0757 300 001 au 0757 300 002"],
  ["the Swahili 'na' (and)", "0757 300 001 na 0757 300 002"],
  ["'and'", "0757 300 001 and 0757 300 002"],
];
const TWO_KEYS = ["255757300001", "255757300002"];

/** H2 · exactly ONE distinct mobile among other numbers — before them or after them — and the SAME mobile written twice. */
const ONE_AMONG: ReadonlyArray<readonly [string, string, string]> = [
  ["a Kenyan number first", "+254 712 345 678 / 0757 300 003", "255757300003"],
  ["a landline first", "022 211 3456; 0757 300 004", "255757300004"],
  ["a number cut short first", "0757 300 05 / 0757 300 006", "255757300006"],
  ["a withdrawn 064 number first", "0642 123 456 / 0757 300 007", "255757300007"],
  ["labels beside the numbers", "Ofisi: 022 211 3456 / Simu: 0757 300 008", "255757300008"],
  ["the mobile FIRST, a landline after it", "0757 300 017 / 022 211 3456", "255757300017"],
  ["the same mobile twice, in two spellings", "0757 300 015 / +255 757 300 015", "255757300015"],
  ["the same mobile twice and a landline", "0757300016, 022 211 3456, 255757300016", "255757300016"],
];

/** H3 · no Tanzanian mobile in any part: no number, and the FIRST number's own sentence. */
const NO_MOBILE: ReadonlyArray<readonly [string, string, string]> = [
  ["two foreign numbers", "+254 712 345 678 / +256 772 123 456", "+254 712 345 678"],
  ["two landlines", "022 211 3456 ; 022 211 3457", "022 211 3456"],
];

/** H4 · two numbers kept apart by spaces alone — never split, never joined. */
const SPACES_ONLY = ["0757 300 001 0757 300 002", "0757300001 0757300002"];
/** H4 · (D10) cells only H4 asks about: a mobile written with an extra digit, then a landline — no key may be cut out of it. */
const CUT_PROBES = ["0757 300 0012 / 022 211 3456", "+255 757 300 0123 ; 022 211 3457"];

/** H5 · one number, however its groups are joined — and two cells with no number. */
const ONE_NUMBER: ReadonlyArray<readonly [string, string]> = [
  ["spaced", "0757 300 009"],
  ["bracketed and dashed", "(0757) 300-010"],
  ["the business-card trunk zero", "+255 (0)757 300 011"],
  ["dotted", "0757.300.012"],
  ["the export's apostrophe guard", "'+255 757 300 013"],
  ["Excel's thousands commas (#,##0)", "255,757,300,014"],
];
const ONE_KEYS = ["255757300009", "255757300010", "255757300011", "255757300012", "255757300013", "255757300014"];

/** H9 · D1 · the time budget for ONE call on a hostile cell, and the cells: runs of spaces asked in growing sizes (a
 *  function already over budget on a smaller run is never handed a bigger one — a quadratic plant would hold the run
 *  for minutes), and Excel's longest cell (32,767 characters) of "a a a …", a blank before every letter. */
const BUDGET_MS = 50;
const SPACE_RUNS = [2_000, 40_000, 200_000];
const A_A_A = Array.from({ length: 16_384 }, () => "a").join(" ");

/** H10 · D1b · one mobile beside a landline, written in EXACTLY the phone field's limit — and one character longer. */
const AT_LIMIT = "Ofisi: 022 211 3456 / Simu: 0757 300 008";
const PAST_LIMIT = "Ofisi: 022 211 3456 / Simu:  0757 300 008";

/** H11 · D4 · a bare nine-digit part after a split: the tail of a Kenyan number — never a stranger's +255 number. */
const BARE_TAILS: ReadonlyArray<readonly [string, string]> = [
  ["'+254,' then the rest", "+254, 712 345 678"],
  ["'254/' then the rest", "254/712345678"],
  ["'+254 /' then the rest", "+254 / 712 345 678"],
  ["two bare nine-digit numbers", "712345678 / 754345678"],
];

/* ══ THE LABELS ═════════════════════════════════════════════════════════════════════════════════ */

export const L = {
  H1: "H1 · ⭐ every separator cuts a phone cell in two — Google's ' ::: ', a solidus, a semicolon, a comma, a vertical line, an ampersand, a line break (LF and CRLF), 'or' in any case, the Swahili 'au' and 'na', 'and' — and ⛔ D3: a cell holding two DISTINCT mobiles yields NONE (mobilesIn names both), its sentence the several-mobiles one, never a number",
  H2: "H2 · ⭐ D3 · a cell holding exactly ONE distinct mobile yields it — a Kenyan, landline, cut-short or withdrawn number or a label written before it or after it, or the same mobile written again in another spelling, never stops it; firstMobileIndex (the list paste's choice) names the first mobile of a list, or -1",
  H3: "H3 · ⛔ a cell of only foreign or only landline numbers yields NO number, and its sentence is its FIRST number's own (parseTzNumber's) — never 'keep one'; a cell of one such number keeps its whole-cell sentence",
  H4: "H4 · ⛔ NEVER A JOIN — two numbers kept apart by spaces alone are not split and yield nothing; and (D10) every key any cell yields is the key of the WHOLE cell or of one of its parts as written — never digits cut out of a number",
  H5: "H5 · a cell that IS one number is that number — spaced, bracketed, dashed, dotted, the trunk zero, the apostrophe guard, Excel's thousands commas — with the whole trimmed cell as its text; an empty cell and a word yield nothing, with parseTzNumber's own sentence",
  H6: "H6 · ⭐ ONE RULE ON THE SERVER — stagedRowFrom stages a cell of one mobile and a landline with the mobile's key while rawPhone keeps the whole cell (decidable); a cell of two distinct mobiles stages NO key and is invalid with the several-mobiles sentence; a cell of two foreign numbers, and one of two landlines (whose whole cell would read 'keep one'), stage no key and are invalid with their first number's sentence",
  H7: "H7 · ⛔ PURE — phone-cell.ts imports ../tz-msisdn and ./contact-fields alone (the phone field's limit read as CONTACT_LIMITS.phone, never a second literal), carries no directive, no backslash and no raw control character but its line ends, and is pinned in client-graph-safe",
  H8: "H8 · ⭐ END TO END on the memory twin — a mobile-and-landline cell, a two-foreign cell and a two-mobile cell are checked (1 new · 2 not a mobile, with the first foreign number's and the several-mobiles sentences), started with KEEP and committed in one step: ONE contact is created, on the one mobile, its raw text the number it was read from; no book row holds the landline or either of the two mobiles",
  H9: "H9 · ⛔ C3b-fix · D1 — LINEAR AND BOUNDED: every function of phone-cell.ts returns within 50 ms on a cell of 2,000, 40,000 and 200,000 spaces and on Excel's longest cell (32,767 characters) of \"a a a …\" (the cut reading each run of blanks once)",
  H10: "H10 · ⛔ C3b-fix · D1b — a cell longer than the phone field's limit (CONTACT_LIMITS.phone) is NEVER split: one mobile beside a landline in exactly the limit yields the mobile, one character more yields nothing, its sentence the whole cell's — and staging refuses it for its length",
  H11: "H11 · ⛔ C3b-fix · D4 — a bare nine-digit part is never a mobile: '+254, 712 345 678', '254/712345678', '+254 / 712 345 678' and two bare numbers yield nothing (their sentence the first complete number's, else the whole cell's), a bare part beside a mobile is not a second one — while a WHOLE cell of bare nine digits keeps its reading (Excel drops a number cell's 0)",
  H12: "H12 · ⛔ C8c · THE LIST PASTE'S QUESTION, asked of the cut itself — cutsCell is true for the text between two numbers that the rule cuts at (a comma, a solidus, a semicolon, a vertical line, an ampersand, Google's ' ::: ', 'or', 'au', 'na', 'and', blanks around any of them, two separators meeting) and false for every gap it does not (a space alone, a dash, a full stop, a bracket, one or two colons, a letter, a name, a digit, nothing at all — and, M1, a WORD between two separators: ', Asha, ', ' | Asha | ', '; Asha; '); the cut keeps every piece, labels too (phoneCellPieces), and the parts are its pieces holding a digit; firstMobileIndex reads CELLS by the one rule — a cell holding a mobile among other numbers counts, a Kenyan cell does not",
} as const;

/* ══ THE RUN ════════════════════════════════════════════════════════════════════════════════════ */

type Ctx = SectionContext<PhoneCellImpl>;
const json = (v: unknown): string => JSON.stringify(v);

/** ⭐ D10 · the keys a cell may yield: its WHOLE cell's, or one of its parts' as written — read with the SHIPPED cut and
 *  the parser, never with the bundle under test. */
function allowedKeys(cell: string): Set<string> {
  const out = new Set<string>();
  for (const text of [cell, ...phoneCellParts(cell)]) {
    const n = parseTzNumber(text);
    if (n.verdict === "ok" && n.msisdn !== null) out.add(n.msisdn);
  }
  return out;
}

async function run({ impl, ok, log }: Ctx): Promise<void> {
  /** Every (cell, key) a cell yielded — H4's population. */
  const yielded: Array<readonly [string, string]> = [];
  const keyOf = (cell: string): string | null => {
    const found = impl.firstMobileIn(cell);
    const key = found === null ? null : found.number.msisdn;
    if (key !== null) yielded.push([cell, key]);
    return key;
  };

  // ── H1 · every separator; two distinct mobiles yield none ──
  const h1 = SEPARATED.flatMap(([what, cell]) => {
    const key = keyOf(cell);
    const parts = impl.phoneCellParts(cell);
    const both = impl.mobilesIn(cell).map((m) => m.number.msisdn);
    const said = impl.phoneCellRefusal(cell);
    return key === null && parts.length === 2 && json(both) === json(TWO_KEYS) && said === SEVERAL_MOBILES_SENTENCE
      ? [] : [`${what}: ${key ?? "none"} · ${parts.length} part(s) · mobiles ${json(both)} · "${said}"`];
  });
  ok(L.H1, h1.length === 0 && /more than one mobile number/.test(SEVERAL_MOBILES_SENTENCE) && !/[0-9]/.test(SEVERAL_MOBILES_SENTENCE),
    h1.join(" | ") || `${SEPARATED.length} separators: each cuts the cell in two, and two mobiles yield none`);

  // ── H2 · exactly one distinct mobile ──
  const h2 = ONE_AMONG.flatMap(([what, cell, want]) => {
    const key = keyOf(cell);
    const text = impl.firstMobileIn(cell)?.text ?? "";
    return key === want && parseTzNumber(text).msisdn === want ? [] : [`${what}: ${key} from "${text}" (want ${want})`];
  });
  const index = [
    impl.firstMobileIndex(["+254 712 345 678", "022 211 3456", "0757 300 003", "0757 300 004"]),
    impl.firstMobileIndex(["022 211 3456", "+254 712 345 678"]),
    impl.firstMobileIndex([]),
  ];
  ok(L.H2, h2.length === 0 && json(index) === json([2, -1, -1]), [...h2, `firstMobileIndex ${json(index)}`].join(" | "));

  // ── H3 · no mobile anywhere ──
  const h3 = NO_MOBILE.flatMap(([what, cell, first]) => {
    const key = keyOf(cell);
    const said = impl.phoneCellRefusal(cell);
    return key === null && said === parseTzNumber(first).reason && !said.includes("Keep one") ? [] : [`${what}: ${key} · "${said}"`];
  });
  const single = "+254 712 345 678";
  if (impl.phoneCellRefusal(single) !== parseTzNumber(single).reason) h3.push("a cell of ONE foreign number lost its whole-cell sentence");
  ok(L.H3, h3.length === 0, h3.join(" | ") || `${NO_MOBILE.length} cells refused with their first number's sentence`);

  // ── H5 · one number stays one ──
  const h5 = ONE_NUMBER.flatMap(([what, cell], i) => {
    const key = keyOf(cell);
    const text = impl.firstMobileIn(` ${cell} `)?.text ?? "";
    return key === ONE_KEYS[i] && text === cell ? [] : [`${what}: ${key} from "${text}" (want ${ONE_KEYS[i]})`];
  });
  for (const cell of ["", "hakuna"]) {
    if (keyOf(cell) !== null || impl.phoneCellRefusal(cell) !== parseTzNumber(cell).reason) h5.push(`"${cell}" read as a number, or its sentence changed`);
  }
  ok(L.H5, h5.length === 0, h5.join(" | ") || `${ONE_NUMBER.length} spellings of one number, each whole`);

  // ── H11 · D4 · a bare part is never a mobile ──
  const h11 = BARE_TAILS.flatMap(([what, cell]) => {
    const key = keyOf(cell);
    const said = impl.phoneCellRefusal(cell);
    const parts = phoneCellParts(cell);
    const want = /^[+0]/.test(parts[0] ?? "") ? parseTzNumber(parts[0]).reason : parseTzNumber(cell).reason;
    return key === null && impl.mobilesIn(cell).length === 0 && said === want ? [] : [`${what}: ${key ?? "none"} · "${said}"`];
  });
  const beside = keyOf("0757 300 041 / 754 345 678");
  const wholeBare = [keyOf("712345678"), keyOf("712 345 678")];
  ok(L.H11, h11.length === 0 && beside === "255757300041" && json(wholeBare) === json(["255712345678", "255712345678"]),
    [...h11, `a bare part beside a mobile → ${beside}`, `whole bare cells → ${json(wholeBare)}`].join(" | "));

  // ── H4 · never a join, never a cut ──
  const h4 = SPACES_ONLY.flatMap((cell) => {
    const key = keyOf(cell);
    return key === null && impl.phoneCellParts(cell).length === 1 ? [] : [`"${cell}" → ${key}, ${impl.phoneCellParts(cell).length} part(s)`];
  });
  for (const cell of CUT_PROBES) keyOf(cell);
  const cut = yielded.filter(([cell, key]) => !allowedKeys(cell).has(key));
  ok(L.H4, h4.length === 0 && cut.length === 0 && yielded.length >= 16,
    [...h4, ...cut.map(([cell, key]) => `"${cell}" → ${key}, the key of neither the cell nor a part`)].join(" | ")
      || `${yielded.length} key(s) yielded, each the whole cell's or a part's`);

  // ── H6 · the server's two readers ──
  const one = impl.stagedRowFrom({ line: 2, cells: ["0757 300 001 / 022 211 3456", "Upendo Swai"] }, 1, RUN, AT);
  const two = impl.stagedRowFrom({ line: 3, cells: ["0757 300 001 / 0757 300 002", "Neema Kimaro"] }, 2, RUN, AT);
  const none = impl.stagedRowFrom({ line: 4, cells: ["+254 712 345 678 / +256 772 123 456", "Wanjiru Kamau"] }, 3, RUN, AT);
  // ⛔ Two landlines: their whole cell is nineteen digits, which parseTzNumber words "Keep one" — so this row, unlike the
  // two foreign numbers (whose whole cell and first number share the "+254…" sentence), tells the rule's sentence apart.
  const lines = impl.stagedRowFrom({ line: 5, cells: ["022 211 3456 / 022 211 3457", "Ofisi Kuu"] }, 4, RUN, AT);
  const classOf = (row: StoredContactImportRow | null) => (row === null ? null : impl.classify(row, () => false));
  const [oneClass, twoClass, noneClass, linesClass] = [one, two, none, lines].map(classOf);
  const sentenceOf = (c: ReturnType<typeof classOf>): string => (c?.kind === "invalid" ? c.sentence : "");
  ok(L.H6, one !== null && one.msisdn === "255757300001" && one.rawPhone === "0757 300 001 / 022 211 3456" && oneClass?.kind === "decidable"
    && two !== null && two.msisdn === null && two.rawPhone === "0757 300 001 / 0757 300 002" && sentenceOf(twoClass) === SEVERAL_MOBILES_SENTENCE
    && none !== null && none.msisdn === null && sentenceOf(noneClass) === parseTzNumber("+254 712 345 678").reason
    && lines !== null && lines.msisdn === null && sentenceOf(linesClass) === parseTzNumber("022 211 3456").reason
    && !sentenceOf(linesClass).includes("Keep one"),
    `one mobile → ${one?.msisdn ?? "no key"} (${oneClass?.kind ?? "-"}) · two mobiles → ${two?.msisdn ?? "no key"} (${sentenceOf(twoClass)})`
    + ` · two foreign → ${none?.msisdn ?? "no key"} (${sentenceOf(noneClass)}) · two landlines → ${lines?.msisdn ?? "no key"} (${sentenceOf(linesClass)})`);

  // ── H7 · the source ──
  const specs = [...impl.source.matchAll(/^\s*import\b[^;]*?from\s*["']([^"']+)["']/gm)].map((m) => m[1]);
  const rawBad: string[] = [];
  for (let i = 0; i < impl.rawSource.length && rawBad.length < 5; i++) {
    const c = impl.rawSource.charCodeAt(i);
    if (c === 92) rawBad.push(`a backslash at ${i}`);
    else if ((c < 32 && c !== 10 && c !== 13) || c === 127) rawBad.push(`control ${c} at ${i}`);
  }
  const pinned = impl.pinned.includes(`"lib/contacts/phone-cell.ts"`);
  const limitRead = impl.source.includes("CONTACT_LIMITS.phone") && !new RegExp(`(?<![0-9a-zA-Z_])${CONTACT_LIMITS.phone}(?![0-9])`).test(impl.source);
  ok(L.H7, json(specs) === json(["../tz-msisdn", "./contact-fields"]) && !/^\s*["']use (?:client|server)["']/m.test(impl.source) && rawBad.length === 0 && pinned && limitRead,
    `imports ${json(specs)} · ${rawBad.join(" | ") || "no backslash, no control character"} · pinned ${pinned} · the limit read from CONTACT_LIMITS ${limitRead}`);

  // ── H9 · D1 · linear and bounded ──
  const fns: ReadonlyArray<readonly [string, (cell: string) => unknown]> = [
    ["phoneCellParts", (c) => impl.phoneCellParts(c)],
    ["mobilesIn", (c) => impl.mobilesIn(c)],
    ["firstMobileIn", (c) => impl.firstMobileIn(c)],
    ["phoneCellRefusal", (c) => impl.phoneCellRefusal(c)],
    ["firstMobileIndex", (c) => impl.firstMobileIndex([c])],
    // C8c · the list paste's question is a function of phone-cell.ts too — and (M1) the cut it reads.
    ["cutsCell", (c) => impl.cutsCell(c)],
    ["phoneCellPieces", (c) => impl.phoneCellPieces(c)],
  ];
  const slowest = (f: (cell: string) => unknown, cell: string): number => {
    let best = Number.POSITIVE_INFINITY;
    for (let k = 0; k < 3; k++) {
      const t0 = performance.now();
      f(cell);
      best = Math.min(best, performance.now() - t0);
    }
    return best;
  };
  const h9: string[] = [];
  const h9Times: string[] = [];
  for (const [what, f] of fns) {
    for (const n of SPACE_RUNS) {
      const ms = slowest(f, " ".repeat(n));
      h9Times.push(`${what}(${n} spaces) ${ms.toFixed(1)} ms`);
      if (ms > BUDGET_MS) {
        h9.push(`${what} took ${ms.toFixed(0)} ms on ${n} spaces`);
        break;
      }
    }
    const ms = slowest(f, A_A_A);
    h9Times.push(`${what}(a a a) ${ms.toFixed(1)} ms`);
    if (ms > BUDGET_MS) h9.push(`${what} took ${ms.toFixed(0)} ms on ${A_A_A.length} characters of "a a a"`);
  }
  log(`H9: ${h9Times.join(" · ")}`);
  ok(L.H9, h9.length === 0 && A_A_A.length === 32_767, h9.join(" | ") || `${fns.length} functions × ${SPACE_RUNS.length + 1} cells, each within ${BUDGET_MS} ms`);

  // ── H10 · D1b · never split past the limit ──
  const atLimit = impl.firstMobileIn(AT_LIMIT);
  const pastLimit = impl.firstMobileIn(PAST_LIMIT);
  const pastStaged = impl.stagedRowFrom({ line: 6, cells: [PAST_LIMIT, "Ofisi Kuu"] }, 5, RUN, AT);
  const pastClass = classOf(pastStaged);
  ok(L.H10, AT_LIMIT.length === CONTACT_LIMITS.phone && PAST_LIMIT.length === CONTACT_LIMITS.phone + 1
    && atLimit?.number.msisdn === "255757300008" && pastLimit === null && impl.mobilesIn(PAST_LIMIT).length === 0
    && impl.phoneCellRefusal(PAST_LIMIT) === parseTzNumber(PAST_LIMIT).reason
    && pastStaged !== null && pastStaged.msisdn === null && pastClass?.kind === "invalid" && pastClass.sentence.includes(`longer than ${CONTACT_LIMITS.phone}`),
    `at the limit → ${atLimit?.number.msisdn ?? "none"} · past it → ${pastLimit?.number.msisdn ?? "none"} · staged ${pastStaged?.msisdn ?? "no key"} (${sentenceOf(pastClass)})`);

  // ── H12 · C8c · the list paste's question ──
  const CUTS = [",", ", ", " / ", "/", ";", " | ", "&", " ::: ", " or ", " OR ", " au ", " na ", " and ", " ,  ", ",,", " / , "];
  // ⭐ C8c · M1 · a WORD between two separators is a piece of its own — never a cut (", Asha, " lost a pasted name).
  const NO_CUT = [
    " ", "  ", "-", " - ", ".", ". ", "(", ")", ":", "::", " : ", " Asha ", ", Asha ", "or", " or", "x", " 1 ", "", "] Juma: ",
    ", Asha, ", " | Asha | ", "; Asha; ",
  ];
  const wrongCut = CUTS.filter((g) => !impl.cutsCell(g)).map((g) => json(g));
  const wrongKept = NO_CUT.filter((g) => impl.cutsCell(g)).map((g) => json(g));
  const cellIndex = [
    impl.firstMobileIndex(["+254, 712 345 678", "022 211 3456; 0757 300 051"]),
    impl.firstMobileIndex(["254/712345678", "00254; 712345678"]),
    impl.firstMobileIndex(["712 345 678"]),
  ];
  // ⭐ M1 · the cut keeps EVERY piece (the labels, and the empty one where separators meet); the parts are its pieces that
  // hold a digit — one cut, read two ways.
  const PIECES_OF = "home: 0712 345 678 / ofisi, ,";
  const pieces = impl.phoneCellPieces(PIECES_OF);
  const piecesRight = json(pieces) === json(["home: 0712 345 678", "ofisi", "", ""])
    && json(impl.phoneCellParts(PIECES_OF)) === json(pieces.filter((p) => /[0-9]/.test(p)));
  ok(L.H12, wrongCut.length === 0 && wrongKept.length === 0 && json(cellIndex) === json([1, -1, 0]) && piecesRight,
    `${wrongCut.length ? `not cut: ${wrongCut.join(" ")}` : `${CUTS.length} cuts`} · ${wrongKept.length ? `cut wrongly: ${wrongKept.join(" ")}` : `${NO_CUT.length} kept whole`} · firstMobileIndex ${json(cellIndex)} · pieces ${json(pieces)}`);

  // ── H8 · end to end: check, start, one commit step ──
  await inFreshStore(async () => {
    const deps = impl.commitDeps;
    const runId = await stageFile(OFFICER, [
      { line: 2, cells: ["0757 300 021 / 022 211 3456", "Upendo Swai", "", "", ""] },
      { line: 3, cells: ["+254 712 345 678 / +256 772 123 456", "Wanjiru Kamau", "", "", ""] },
      { line: 4, cells: ["0757 300 031 / 0757 300 032", "Neema Kimaro", "", "", ""] },
    ]);
    const checked = await checkContactImport(OFFICER, runId, deps);
    if (!checked.ok) {
      ok(L.H8, false, `the check refused: ${checked.reason}`);
      return;
    }
    const p = checked.preflight;
    const label = adjustTally(p.byChoice, [], "KEEP", {});
    const start = await startContactImport(OFFICER, {
      runId, choice: "KEEP", exceptions: {}, list: { kind: "none" },
      expected: { create: label.create, update: label.update, keep: label.keep }, checkedAt: p.checkedAt,
    }, deps);
    const step = start.ok ? await commitContactImportStep(OFFICER, { runId, fromCursor: 0 }, deps) : null;
    const book = [...mem().marketingContacts.values()] as StoredMarketingContact[];
    const created = book.find((c) => c.msisdn === "255757300021");
    const bookText = json(book);
    const sentences = p.invalid.rows.map((r) => `${r.line}:${r.sentence}`);
    log(`H8: counts ${json(p.counts)} · start ${start.ok ? "ok" : start.reason} · step ${step === null ? "-" : step.ok ? step.kind : step.reason} · book ${book.length}`);
    ok(L.H8, json(p.counts) === json({ new: 1, inBook: 0, repeated: 0, invalid: 2, unreadable: 0 })
      && json(sentences) === json([`3:${parseTzNumber("+254 712 345 678").reason}`, `4:${SEVERAL_MOBILES_SENTENCE}`])
      && start.ok && step !== null && step.ok && step.kind === "done" && book.length === 1 && created !== undefined
      && created.rawInput === "0757 300 021" && !bookText.includes("022 211 3456")
      && !book.some((c) => c.msisdn === "255757300031" || c.msisdn === "255757300032") && !bookText.includes("0757 300 03"),
      `created ${created ? `${created.msisdn} "${created.rawInput}"` : "none"} · book ${book.map((c) => c.msisdn).join(",")} · ${json(sentences)}`);
  });
}

/* ══ THE RED PLANTS — each defect wrapped around the shipped function, in memory ═════════════════════ */

/** A digit in any script, built from its code (the editing tools decode escape text). */
const ANY_DIGIT = new RegExp(`${String.fromCharCode(92)}p{Nd}`, "u");

/**
 * ⛔ D1's defect, restored for the red plant: C3b's cut AS IT SHIPPED (579f194d) — its word test walks a run of blanks
 * again from EVERY blank in it, so a cell of n spaces costs about n²/2 steps.
 */
function c3bRescanParts(cell: string): string[] {
  const s = String(cell ?? "");
  const blank = (c: number): boolean => c === 32 || c === 9 || c === 0xa0 || c === 0x202f || (c >= 0x2000 && c <= 0x200a);
  const letter = (c: number): boolean => (c >= 65 && c <= 90) || (c >= 97 && c <= 122);
  const words: ReadonlySet<string> = new Set(["or", "and", "au", "na"]);
  const separators: ReadonlySet<number> = new Set([10, 13, 38, 44, 47, 59, 124]);
  const wordAt = (i: number): number => {
    let j = i;
    while (j < s.length && blank(s.charCodeAt(j))) j++;
    let k = j;
    while (k < s.length && letter(s.charCodeAt(k))) k++;
    if (k === j || k >= s.length || !blank(s.charCodeAt(k))) return 0;
    if (!words.has(s.slice(j, k).toLowerCase())) return 0;
    let m = k;
    while (m < s.length && blank(s.charCodeAt(m))) m++;
    return m - i;
  };
  const pieces: string[] = [];
  let start = 0;
  let i = 0;
  while (i < s.length) {
    const c = s.charCodeAt(i);
    let cut = 0;
    if (separators.has(c)) cut = 1;
    else if (c === 58) {
      let run = 0;
      while (i + run < s.length && s.charCodeAt(i + run) === 58) run++;
      if (run < 3) {
        i += run;
        continue;
      }
      cut = run;
    } else if (blank(c)) cut = wordAt(i);
    if (cut === 0) {
      i++;
      continue;
    }
    pieces.push(s.slice(start, i));
    i += cut;
    start = i;
  }
  pieces.push(s.slice(start));
  return pieces.map((p) => p.trim()).filter((p) => ANY_DIGIT.test(p));
}

/** How one plant bends the rule rebuilt below. */
type RuleTwist = {
  /** D3 undone: the FIRST of several distinct mobiles is taken (C3b's rule). */
  readonly firstOfMany?: boolean;
  /** The same mobile written twice counted as two. */
  readonly noDedupe?: boolean;
  /** D4 undone: a bare nine-digit part read as a mobile. */
  readonly bare?: boolean;
  /** The cell split BEFORE the whole is asked. */
  readonly splitFirst?: boolean;
  /** D1b undone: a cell longer than the phone field's limit split all the same. */
  readonly noLimit?: boolean;
  /** A part with an extra digit read by its first ten digits — a number made to fit after a split. */
  readonly cutToTen?: boolean;
};

/**
 * ⭐ The rule rebuilt from the SHIPPED cut (`phoneCellParts`) and parser, with one twist — what each plant below plants.
 * Untwisted it is the shipped rule: the whole cell first, the limit, the complete parts (D4), the distinct mobiles (D3).
 */
function rebuiltRule(t: RuleTwist): Pick<PhoneCellImpl, "mobilesIn" | "firstMobileIn" | "phoneCellRefusal"> {
  const complete = (part: string): boolean => {
    const text = readAsciiDigits(part);
    let digits = "";
    for (let i = 0; i < text.length && digits.length < 3; i++) {
      const c = text.charCodeAt(i);
      if (c >= 48 && c <= 57) digits += text.charAt(i);
      else if (c === 43 && digits === "") return true;
    }
    return digits.charAt(0) === "0" || digits === "255";
  };
  const tooLong = (text: string): boolean => t.noLimit !== true && Array.from(text.trim()).length > CONTACT_LIMITS.phone;
  const mobiles = (cell: string): CellMobile[] => {
    const text = String(cell ?? "");
    const whole = parseTzNumber(text);
    if (t.splitFirst !== true && whole.verdict === "ok") return [{ number: whole, text: text.trim() }];
    if (tooLong(text)) return [];
    const found: CellMobile[] = [];
    const parts = phoneCellParts(text);
    for (const part of parts) {
      if (t.bare !== true && !complete(part)) continue;
      let number = parseTzNumber(part);
      if (t.cutToTen === true && parts.length >= 2 && number.verdict === "too_long") {
        number = parseTzNumber(readAsciiDigits(part).split("").filter((ch) => ch >= "0" && ch <= "9").join("").slice(0, 10));
      }
      if (number.verdict !== "ok" || number.msisdn === null) continue;
      if (t.noDedupe !== true && found.some((m) => m.number.msisdn === number.msisdn)) continue;
      found.push({ number, text: part });
    }
    return found;
  };
  const first = (cell: string): CellMobile | null => {
    const found = mobiles(cell);
    if (t.firstOfMany === true) return found[0] ?? null;
    return found.length === 1 ? found[0] : null;
  };
  const refusal = (cell: string): string => {
    const text = String(cell ?? "");
    const whole = parseTzNumber(text);
    if (whole.verdict === "ok" || tooLong(text)) return whole.reason;
    const found = mobiles(text);
    if (found.length >= 2) return SEVERAL_MOBILES_SENTENCE;
    const parts = phoneCellParts(text);
    if (found.length === 0 && parts.length >= 2 && complete(parts[0])) return parseTzNumber(parts[0]).reason;
    return whole.reason;
  };
  return { mobilesIn: mobiles, firstMobileIn: first, phoneCellRefusal: refusal };
}

const PLANTS: readonly RedPlant<PhoneCellImpl>[] = [
  {
    name: "C3b-fix D3 undone — C3b's rule: the FIRST of two distinct mobiles is taken (another person's number may be the one left out)",
    expect: L.H1,
    impl: () => ({ ...real(), ...rebuiltRule({ firstOfMany: true }) }),
  },
  {
    name: "the separators cut nothing — a two-number cell is one part",
    expect: L.H1,
    impl: () => ({ ...real(), phoneCellParts: (cell) => { const t = String(cell).trim(); return t === "" ? [] : [t]; } }),
  },
  {
    name: "two distinct mobiles refused with the whole cell's 'Keep one' — the several-mobiles sentence never said",
    expect: L.H1,
    impl: () => ({ ...real(), phoneCellRefusal: (cell) => (mobilesIn(cell).length >= 2 ? parseTzNumber(cell).reason : phoneCellRefusal(cell)) }),
  },
  {
    name: "the first PART is the number, whatever it is — a foreign number written first ends the reading",
    expect: L.H2,
    impl: () => ({
      ...real(),
      firstMobileIn: (cell) => {
        const whole = parseTzNumber(cell);
        if (whole.verdict === "ok") return { number: whole, text: String(cell).trim() };
        const first = phoneCellParts(cell)[0];
        const n = first === undefined ? null : parseTzNumber(first);
        return n !== null && n.verdict === "ok" ? { number: n, text: first } : null;
      },
    }),
  },
  {
    name: "the same mobile written twice counted as two — the person refused for holding their own number twice",
    expect: L.H2,
    impl: () => ({ ...real(), ...rebuiltRule({ noDedupe: true }) }),
  },
  {
    name: "the refusal keeps the whole cell's 'keep one' for a cell with no mobile in it",
    expect: L.H3,
    impl: () => ({ ...real(), phoneCellRefusal: (cell) => (mobilesIn(cell).length >= 2 ? SEVERAL_MOBILES_SENTENCE : parseTzNumber(cell).reason) }),
  },
  {
    name: "two numbers kept apart by spaces read by their first ten digits — a number made to fit",
    expect: L.H4,
    impl: () => ({
      ...real(),
      firstMobileIn: (cell) => {
        const found = firstMobileIn(cell);
        if (found !== null) return found;
        const digits = String(cell).split("").filter((ch) => ch >= "0" && ch <= "9").join("");
        const n = parseTzNumber(digits.slice(0, 10));
        return n.verdict === "ok" ? { number: n, text: digits.slice(0, 10) } : null;
      },
    }),
  },
  {
    name: "C3b-fix D10 · a part with an extra digit read by its first ten digits — a key cut out of a number after a split",
    expect: L.H4,
    impl: () => ({ ...real(), ...rebuiltRule({ cutToTen: true }) }),
  },
  {
    name: "the cell split BEFORE the whole is asked — Excel's thousands commas cut one number into four",
    expect: L.H5,
    impl: () => ({ ...real(), ...rebuiltRule({ splitFirst: true }) }),
  },
  {
    name: "staging keeps the whole-cell key — a cell of one mobile and a landline staged with no key",
    expect: L.H6,
    impl: () => ({
      ...real(),
      stagedRowFrom: (raw, ordinal, run, at) => {
        const row = staging.stagedRowFrom(raw, ordinal, run, at);
        if (row === null) return row;
        const n = parseTzNumber(row.rawPhone);
        return { ...row, msisdn: n.verdict === "ok" ? n.msisdn : null };
      },
    }),
  },
  {
    name: "the check words a no-mobile cell by the whole cell — 'keep one' for two mobiles and for two landlines",
    expect: L.H6,
    impl: () => ({
      ...real(),
      classify: (row: StoredContactImportRow, isSample: (msisdn: string) => boolean) => {
        const c = checkModule.classifyStagedRow(row, isSample);
        return c.kind === "invalid" && row.problems.length === 0 && row.readError === null ? { ...c, sentence: parseTzNumber(row.rawPhone).reason } : c;
      },
    }),
  },
  {
    name: "phone-cell.ts imports the server store",
    expect: L.H7,
    impl: () => ({ ...real(), source: `import { db } from "@/lib/server/store";${LF}${real().source}` }),
  },
  {
    name: "the new contact keeps the WHOLE staged cell as its raw text — the landline beside the mobile rides into it",
    expect: L.H8,
    impl: () => ({
      ...real(),
      commitDeps: {
        ...REAL_DEPS,
        newRow: (fields, id) => {
          const staged = [...mem().contactImportRows.values()].flatMap((rows) => [...rows.values()])
            .find((r) => r.msisdn === fields.number.msisdn);
          return REAL_DEPS.newRow({ ...fields, rawInput: staged?.rawPhone ?? fields.rawInput }, id);
        },
      },
    }),
  },
  {
    name: "C3b-fix D1a undone — C3b's cut restored: the word test rescans a run of blanks from every blank in it",
    expect: L.H9,
    impl: () => ({ ...real(), phoneCellParts: c3bRescanParts }),
  },
  {
    name: "C3b-fix D1b undone — a cell longer than the phone field's limit is split all the same",
    expect: L.H10,
    impl: () => ({ ...real(), ...rebuiltRule({ noLimit: true }) }),
  },
  {
    name: "C3b-fix D4 undone — a bare nine-digit part read as a mobile: '+254, 712 345 678' becomes a stranger's +255 number",
    expect: L.H11,
    impl: () => ({ ...real(), ...rebuiltRule({ bare: true }) }),
  },
  {
    // 🔴 C8c · the paste's question answered by a rule of its own: a gap of blanks alone "cuts", so a name's spaces would
    // join two numbers written apart into one cell.
    name: "C8c · the paste's cut question cuts at a space too — two numbers kept apart by blanks read as one cell",
    expect: L.H12,
    impl: () => ({ ...real(), cutsCell: (g) => (g.length > 0 && g.trim() === "" ? true : cutsCell(g)) }),
  },
  {
    // 🔴 C8c · the list paste's choice as it shipped: parseTzNumber of each text WHOLE — a cell of a landline and a mobile
    // (or a bare tail the reader cut off) is judged by its whole text, never by the one rule's parts.
    name: "C8c · firstMobileIndex asks parseTzNumber of each cell whole again — a mobile beside a landline in one cell is missed",
    expect: L.H12,
    impl: () => ({ ...real(), firstMobileIndex: (cells) => cells.findIndex((c) => parseTzNumber(c).verdict === "ok") }),
  },
];

export const phoneCellSection: ImportSection<PhoneCellImpl> = {
  name: "phone-cell",
  owner: "S15",
  real,
  run,
  plants: PLANTS,
};
