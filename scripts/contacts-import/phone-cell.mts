/**
 * test:contacts-import · section "phone-cell" — S15 · C3b · G3: the ONE phone-cell rule (`src/lib/contacts/phone-cell.ts`)
 * and the server's three callers of it — staging's key, the check's sentence, the commit's raw text.   (S15, 2026-10-09)
 *
 * ⭐ EXECUTED, NOT READ. Every separator a person puts between two numbers in one phone cell is fed to the real rule and
 * must yield the FIRST number as the cell's mobile; a foreign, landline, short or withdrawn number written first must be
 * passed over for the Tanzanian one after it; a cell of only foreign or landline numbers must yield none, with its first
 * number's own sentence (never "keep one"); two numbers kept apart by spaces alone must never be joined into one; and a
 * cell that IS one number — whatever joins its digit groups, Excel's thousands commas included — must stay that number.
 * Then the server: `stagedRowFrom` stages the first mobile's key while `rawPhone` keeps the whole cell, the check's
 * classifier words a no-mobile cell through the rule, and a REAL check, start and commit step on the memory twin
 * (`scripts/lib/contacts-import-world.mts`) creates ONE contact whose raw text is the number it was read from — the
 * other person's number never rides into it.
 * ⛔ C3b-fix · D1 — THE COST: every function is timed on a 200,000-space cell (asked in growing runs, so a quadratic plant
 * is caught at 40,000 instead of holding the run for minutes) and on Excel's longest cell of "a a a …" (H9), and a cell
 * longer than the phone field's limit is never split (H10, at the limit and one character past it).
 * ⭐ PROVED BY MUTATION. Every label is named by a red plant — a replacement bundle built in memory around the shipped
 * function — and the runner requires each plant's OWN label among the reds.
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
import { firstMobileIn, firstMobileIndex, phoneCellParts, phoneCellRefusal } from "../../src/lib/contacts/phone-cell.ts";
import { CONTACT_LIMITS } from "../../src/lib/contacts/contact-fields.ts";
import { parseTzNumber } from "../../src/lib/tz-msisdn.ts";
import { adjustTally } from "../../src/lib/contacts/import-decide.ts";
import { NOW, OFFICER, captureAudit, checkModule, commitModule, inFreshStore, mem, stageFile, staging } from "../lib/contacts-import-world.mts";

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
  readonly firstMobileIn: typeof firstMobileIn;
  readonly phoneCellParts: typeof phoneCellParts;
  readonly firstMobileIndex: typeof firstMobileIndex;
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
  now: () => NOW,
  stagingDeps: { ...IMPORT_COMMIT_DEPS.stagingDeps, audit: captureAudit, now: () => NOW },
};

let cached: PhoneCellImpl | null = null;
function real(): PhoneCellImpl {
  if (cached) return cached;
  const raw = readFileSync(join(REPO_ROOT, SOURCE_PATH), "utf8");
  cached = {
    firstMobileIn,
    phoneCellParts,
    firstMobileIndex,
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

/** H1 · each separator between the SAME two numbers: the first, 0757 300 001, is the cell's mobile. */
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
const FIRST_KEY = "255757300001";

/** H2 · a number that is not a Tanzanian mobile, written FIRST, then the mobile: the mobile is the key. */
const PASSED_OVER: ReadonlyArray<readonly [string, string, string]> = [
  ["a Kenyan number first", "+254 712 345 678 / 0757 300 003", "255757300003"],
  ["a landline first", "022 211 3456; 0757 300 004", "255757300004"],
  ["a number cut short first", "0757 300 05 / 0757 300 006", "255757300006"],
  ["a withdrawn 064 number first", "0642 123 456 / 0757 300 007", "255757300007"],
  ["labels beside the numbers", "Ofisi: 022 211 3456 / Simu: 0757 300 008", "255757300008"],
];

/** H3 · no Tanzanian mobile in any part: no number, and the FIRST number's own sentence. */
const NO_MOBILE: ReadonlyArray<readonly [string, string, string]> = [
  ["two foreign numbers", "+254 712 345 678 / +256 772 123 456", "+254 712 345 678"],
  ["two landlines", "022 211 3456 ; 022 211 3457", "022 211 3456"],
];

/** H4 · two numbers kept apart by spaces alone — never split, never joined. */
const SPACES_ONLY = ["0757 300 001 0757 300 002", "0757300001 0757300002"];

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

/* ══ THE LABELS ═════════════════════════════════════════════════════════════════════════════════ */

export const L = {
  H1: "H1 · ⭐ every separator between two numbers in one phone cell — Google's ' ::: ', a solidus, a semicolon, a comma, a vertical line, an ampersand, a line break (LF and CRLF), 'or' in any case, the Swahili 'au' and 'na', 'and' — yields the FIRST number as the cell's mobile, its text that part, and the cell holds two parts",
  H2: "H2 · ⭐ the FIRST TANZANIAN MOBILE is taken: a Kenyan, landline, cut-short or withdrawn number written before it — or a label beside it — is passed over for the mobile after it; firstMobileIndex names the first mobile of a list, or -1",
  H3: "H3 · ⛔ a cell of only foreign or only landline numbers yields NO number, and its sentence is its FIRST number's own (parseTzNumber's) — never 'keep one'; a cell of one such number keeps its whole-cell sentence",
  H4: "H4 · ⛔ NEVER A JOIN — two numbers kept apart by spaces alone are not split and yield nothing, and every key any cell yields is exactly 255 and nine digits",
  H5: "H5 · a cell that IS one number is that number — spaced, bracketed, dashed, dotted, the trunk zero, the apostrophe guard, Excel's thousands commas — with the whole trimmed cell as its text; an empty cell and a word yield nothing, with parseTzNumber's own sentence",
  H6: "H6 · ⭐ ONE RULE ON THE SERVER — stagedRowFrom stages a two-number cell with the FIRST mobile's key while rawPhone keeps the whole cell, and the check's classifier reads it decidable; a cell of two foreign numbers, and one of two landlines (whose whole cell would read 'keep one'), stage no key and are invalid with their first number's sentence",
  H7: "H7 · ⛔ PURE — phone-cell.ts imports ../tz-msisdn and ./contact-fields alone (the phone field's limit read as CONTACT_LIMITS.phone, never a second literal), carries no directive, no backslash and no raw control character but its line ends, and is pinned in client-graph-safe",
  H8: "H8 · ⭐ END TO END on the memory twin — a two-number cell and a two-foreign cell are checked (1 new · 1 not a mobile, its sentence the first number's), started with KEEP and committed in one step: ONE contact is created on the first number, its raw text the number it was read from, and no book row holds the second number",
  H9: "H9 · ⛔ C3b-fix · D1 — LINEAR AND BOUNDED: every function of phone-cell.ts returns within 50 ms on a cell of 2,000, 40,000 and 200,000 spaces and on Excel's longest cell (32,767 characters) of \"a a a …\" (the cut reading each run of blanks once)",
  H10: "H10 · ⛔ C3b-fix · D1b — a cell longer than the phone field's limit (CONTACT_LIMITS.phone) is NEVER split: one mobile beside a landline in exactly the limit yields the mobile, one character more yields nothing, its sentence the whole cell's — and staging refuses it for its length",
} as const;

/* ══ THE RUN ════════════════════════════════════════════════════════════════════════════════════ */

type Ctx = SectionContext<PhoneCellImpl>;
const json = (v: unknown): string => JSON.stringify(v);
const KEY_SHAPE = /^255[67][0-9]{8}$/;

async function run({ impl, ok, log }: Ctx): Promise<void> {
  const keys: string[] = [];
  const keyOf = (cell: string): string | null => {
    const found = impl.firstMobileIn(cell);
    const key = found === null ? null : found.number.msisdn;
    if (key !== null) keys.push(key);
    return key;
  };

  // ── H1 · every separator ──
  const h1 = SEPARATED.flatMap(([what, cell]) => {
    const key = keyOf(cell);
    const text = impl.firstMobileIn(cell)?.text ?? "";
    const parts = impl.phoneCellParts(cell);
    return key === FIRST_KEY && parseTzNumber(text).msisdn === FIRST_KEY && parts.length === 2 ? [] : [`${what}: ${key} from "${text}", ${parts.length} part(s)`];
  });
  ok(L.H1, h1.length === 0, h1.join(" | ") || `${SEPARATED.length} separators, each yields ${FIRST_KEY}`);

  // ── H2 · the first Tanzanian mobile ──
  const h2 = PASSED_OVER.flatMap(([what, cell, want]) => {
    const key = keyOf(cell);
    return key === want ? [] : [`${what}: ${key} (want ${want})`];
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

  // ── H4 · never a join ──
  const h4 = SPACES_ONLY.flatMap((cell) => {
    const key = keyOf(cell);
    return key === null && impl.phoneCellParts(cell).length === 1 ? [] : [`"${cell}" → ${key}, ${impl.phoneCellParts(cell).length} part(s)`];
  });

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

  // H4's second half: every key any cell above yielded is one number's key, never digits taken across a separator.
  const badKeys = keys.filter((k) => !KEY_SHAPE.test(k));
  ok(L.H4, h4.length === 0 && badKeys.length === 0 && keys.length >= 20, [...h4, ...badKeys.map((k) => `key ${k}`)].join(" | ") || `${keys.length} key(s), each 255 and nine digits`);

  // ── H6 · the server's two readers ──
  const two = impl.stagedRowFrom({ line: 2, cells: ["0757 300 001 / 0757 300 002", "Upendo Swai"] }, 1, RUN, AT);
  const none = impl.stagedRowFrom({ line: 3, cells: ["+254 712 345 678 / +256 772 123 456", "Wanjiru Kamau"] }, 2, RUN, AT);
  // ⛔ Two landlines: their whole cell is nineteen digits, which parseTzNumber words "Keep one" — so this row, unlike the
  // two foreign numbers (whose whole cell and first number share the "+254…" sentence), tells the rule's sentence apart.
  const lines = impl.stagedRowFrom({ line: 4, cells: ["022 211 3456 / 022 211 3457", "Ofisi Kuu"] }, 3, RUN, AT);
  const twoClass = two === null ? null : impl.classify(two, () => false);
  const noneClass = none === null ? null : impl.classify(none, () => false);
  const linesClass = lines === null ? null : impl.classify(lines, () => false);
  const sentenceOf = (c: typeof noneClass): string => (c?.kind === "invalid" ? c.sentence : "");
  ok(L.H6, two !== null && two.msisdn === FIRST_KEY && two.rawPhone === "0757 300 001 / 0757 300 002" && twoClass?.kind === "decidable"
    && none !== null && none.msisdn === null && noneClass?.kind === "invalid" && noneClass.sentence === parseTzNumber("+254 712 345 678").reason
    && lines !== null && lines.msisdn === null && linesClass?.kind === "invalid" && linesClass.sentence === parseTzNumber("022 211 3456").reason
    && !linesClass.sentence.includes("Keep one"),
    `two numbers → ${two?.msisdn ?? "no key"} (${twoClass?.kind ?? "-"}) · two foreign → ${none?.msisdn ?? "no key"} (${noneClass?.kind ?? "-"}: ${sentenceOf(noneClass)})`
    + ` · two landlines → ${lines?.msisdn ?? "no key"} (${linesClass?.kind ?? "-"}: ${sentenceOf(linesClass)})`);

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
    ["firstMobileIn", (c) => impl.firstMobileIn(c)],
    ["phoneCellRefusal", (c) => impl.phoneCellRefusal(c)],
    ["firstMobileIndex", (c) => impl.firstMobileIndex([c])],
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
  const pastStaged = impl.stagedRowFrom({ line: 5, cells: [PAST_LIMIT, "Ofisi Kuu"] }, 4, RUN, AT);
  const pastClass = pastStaged === null ? null : impl.classify(pastStaged, () => false);
  ok(L.H10, AT_LIMIT.length === CONTACT_LIMITS.phone && PAST_LIMIT.length === CONTACT_LIMITS.phone + 1
    && atLimit?.number.msisdn === "255757300008" && pastLimit === null && impl.phoneCellRefusal(PAST_LIMIT) === parseTzNumber(PAST_LIMIT).reason
    && pastStaged !== null && pastStaged.msisdn === null && pastClass?.kind === "invalid" && pastClass.sentence.includes(`longer than ${CONTACT_LIMITS.phone}`),
    `at the limit → ${atLimit?.number.msisdn ?? "none"} · past it → ${pastLimit?.number.msisdn ?? "none"} · staged ${pastStaged?.msisdn ?? "no key"} (${pastClass?.kind === "invalid" ? pastClass.sentence : pastClass?.kind ?? "-"})`);

  // ── H8 · end to end: check, start, one commit step ──
  await inFreshStore(async () => {
    const deps = impl.commitDeps;
    const runId = await stageFile(OFFICER, [
      { line: 2, cells: ["0757 300 021 / 0757 300 022", "Upendo Swai", "", "", ""] },
      { line: 3, cells: ["+254 712 345 678 / +256 772 123 456", "Wanjiru Kamau", "", "", ""] },
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
    log(`H8: counts ${json(p.counts)} · start ${start.ok ? "ok" : start.reason} · step ${step === null ? "-" : step.ok ? step.kind : step.reason} · book ${book.length}`);
    ok(L.H8, json(p.counts) === json({ new: 1, inBook: 0, repeated: 0, invalid: 1, unreadable: 0 })
      && p.invalid.rows.length === 1 && p.invalid.rows[0].line === 3 && p.invalid.rows[0].sentence === parseTzNumber("+254 712 345 678").reason
      && start.ok && step !== null && step.ok && step.kind === "done" && book.length === 1 && created !== undefined
      && created.rawInput === "0757 300 021" && !book.some((c) => c.msisdn === "255757300022") && !bookText.includes("0757 300 022"),
      `created ${created ? `${created.msisdn} "${created.rawInput}"` : "none"} · book ${book.map((c) => c.msisdn).join(",")}`);
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

/** ⛔ D1b's defect, for the red plant: C3b's choice, which splits a cell however long it is. */
const unguardedFirstMobile: typeof firstMobileIn = (cell) => {
  const whole = parseTzNumber(cell);
  if (whole.verdict === "ok") return { number: whole, text: String(cell).trim() };
  const parts = phoneCellParts(cell);
  const at = firstMobileIndex(parts);
  return at < 0 ? null : { number: parseTzNumber(parts[at]), text: parts[at] };
};

/** The plants' own chooser over a cell's parts: `pick` gets the parsed parts that read as mobiles, in order. */
const choosing = (pick: (mobiles: ReadonlyArray<{ number: ReturnType<typeof parseTzNumber>; text: string }>) => number): typeof firstMobileIn =>
  (cell) => {
    const whole = parseTzNumber(cell);
    if (whole.verdict === "ok") return { number: whole, text: String(cell).trim() };
    const mobiles = phoneCellParts(cell).map((text) => ({ number: parseTzNumber(text), text })).filter((m) => m.number.verdict === "ok");
    const at = mobiles.length === 0 ? -1 : pick(mobiles);
    return at < 0 ? null : mobiles[at];
  };

const PLANTS: readonly RedPlant<PhoneCellImpl>[] = [
  {
    name: "C3b G3 undone — only a WHOLE cell is a number: a two-number cell yields nothing",
    expect: L.H1,
    impl: () => ({ ...real(), firstMobileIn: (cell) => { const n = parseTzNumber(cell); return n.verdict === "ok" ? { number: n, text: String(cell).trim() } : null; } }),
  },
  {
    name: "the LAST mobile of the cell is taken",
    expect: L.H1,
    impl: () => ({ ...real(), firstMobileIn: choosing((mobiles) => mobiles.length - 1) }),
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
    name: "the refusal keeps the whole cell's 'keep one' for a cell with no mobile in it",
    expect: L.H3,
    impl: () => ({ ...real(), phoneCellRefusal: (cell) => parseTzNumber(cell).reason }),
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
    name: "the cell split BEFORE the whole is asked — Excel's thousands commas cut one number into four",
    expect: L.H5,
    impl: () => ({
      ...real(),
      firstMobileIn: (cell) => {
        const parts = phoneCellParts(cell);
        const at = firstMobileIndex(parts);
        return at < 0 ? null : { number: parseTzNumber(parts[at]), text: parts[at] };
      },
    }),
  },
  {
    name: "staging keeps the whole-cell key — a two-number row staged with no key",
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
    name: "the check words a no-mobile cell by the whole cell — 'keep one' for two landlines",
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
    name: "C3b-fix D1a undone — C3b's cut restored: the word test rescans a run of blanks from every blank in it",
    expect: L.H9,
    impl: () => ({ ...real(), phoneCellParts: c3bRescanParts }),
  },
  {
    name: "C3b-fix D1b undone — a cell longer than the phone field's limit is split all the same",
    expect: L.H10,
    impl: () => ({ ...real(), firstMobileIn: unguardedFirstMobile }),
  },
  {
    name: "the new contact keeps the WHOLE staged cell as its raw text — the other person's number rides into it",
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
];

export const phoneCellSection: ImportSection<PhoneCellImpl> = {
  name: "phone-cell",
  owner: "S15",
  real,
  run,
  plants: PLANTS,
};
