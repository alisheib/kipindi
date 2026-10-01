/**
 * test:contacts-import · section "decide" — U31-A: the ONE import rule (`src/lib/contacts/import-decide.ts`) and the
 * erasure mark it reads (`src/lib/marketing/erasure-mark.ts`, re-exported by `erase.ts`).        (S10, 2026-10-01)
 *
 * ⭐ EXECUTED, NOT READ. Every behaviour runs against the real `decide()`: a matrix of fourteen number states × the
 * three choices × four override variants (§D0) with a LITERAL expectation per cell, then one assertion per rule —
 * the default, the stop list, the erasure mark, the consent seam (X5), the file-row key, precedence, the two
 * non-KEEP choices, no_change, the tag cap, the first row (OD33), the label = request (§D11, against literal
 * counts), the one outcome union (X4), and what may reach a browser (D19, X22). The SOURCE is read only for what only
 * the source can show: what the two modules import (§D16), ONE binding for the mark (§D3d), and that no other src
 * file spells the choices (§D10).
 *
 * ⭐ THE DECISIONS ARE ASSERTED HERE (`DECISIONS-U29-U40`): X4 the one outcome union (§D12), X5 consent writable only
 * for a number with no ledger row, no stop and no player (§D4e), X19 the row key is `line` (§D5), X21 tags by
 * `tagKey` (§D6, §D8), X22 erasure never disclosed (§D14b).
 *
 * ⛔ COMMIT A IS PURE. The executed-against-the-store half (the conditional write, the re-decide, the ledger
 * untouched after a real erasure — the spec's D2/D3/D4/D9/D11–D13 on the memory twin) lands with U31-B and U32's
 * `commitBatch`, which own the writer (X3). Nothing here imports the store.
 *
 * ⛔ IN-PROCESS. Every plant below is a replacement bundle built in memory; this module reads files and makes no
 * file-changing call.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "../lib/decomment.mts";
import type { ImportSection, RedPlant, SectionContext } from "../contacts-import.test.mts";
import { ERASURE_EVIDENCE } from "../../src/lib/marketing/erasure-mark.ts";
import {
  DECIDE_KEEP_REASONS,
  DEFAULT_IMPORT_CHOICE,
  IMPORT_CHOICES,
  IMPORT_OUTCOMES,
  IMPORT_OUTCOME_OF_REASON,
  IMPORT_OUTCOME_REASONS,
  IMPORT_PATCH_KEYS,
  NO_OVERRIDES,
  adjustTally,
  decide,
  decideRows,
  effectiveChoice,
  firstLines,
  isImportOutcomeRow,
  mergeTags,
  outcomeOf,
  parseImportChoice,
  parseRowOverrides,
  planImportRows,
  previewFor,
  repeatOf,
  shownTally,
  tallyDecisions,
  type BookSnapshot,
  type DecideFacts,
  type FactsByNumber,
  type ImportCandidate,
  type ImportChoice,
  type ImportDecision,
  type ImportPatch,
  type LedgerWord,
  type NumberFacts,
  type RowOverrides,
  type ShownTally,
} from "../../src/lib/contacts/import-decide.ts";
import {
  CONTACT_FIELDS,
  CONTACT_NOT_IMPORTED,
  draftContactRow,
  type ColumnMapping,
  type ContactDraft,
  type ContactFieldSpec,
} from "../../src/lib/contacts/contact-fields.ts";
import { parseTzNumber } from "../../src/lib/tz-msisdn.ts";

/* ⛔ Control characters and the backtick are built from their codes: the editing tools decode escape text into raw
 * characters (repo memory). */
const LF = String.fromCharCode(10);
const CRLF = String.fromCharCode(13, 10);
const BACKTICK = String.fromCharCode(96);

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
/** A source as the guards read it: comments stripped, CRLF normalised (core.autocrlf=true). */
const tidy = (raw: string): string => decomment(raw).split(CRLF).join(LF);
const read = (rel: string): string => tidy(readFileSync(join(ROOT, rel), "utf8"));
/** Deep equality with object keys sorted (array order still counts). */
const stable = (v: unknown): string =>
  JSON.stringify(v, (_k, x: unknown) =>
    x !== null && typeof x === "object" && !Array.isArray(x)
      ? Object.fromEntries(Object.entries(x as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : x);
const same = (a: unknown, b: unknown): boolean => stable(a) === stable(b);

/* ══ THE BUNDLE UNDER TEST ══════════════════════════════════════════════════════════════════════ */

type Source = { readonly path: string; readonly text: string };

export type DecideImpl = {
  readonly defaultChoice: ImportChoice;
  readonly decide: typeof decide;
  readonly decideRows: typeof decideRows;
  readonly previewFor: typeof previewFor;
  readonly plan: typeof planImportRows;
  readonly adjustTally: typeof adjustTally;
  readonly parseOverrides: typeof parseRowOverrides;
  readonly parseChoice: typeof parseImportChoice;
  readonly mergeTags: typeof mergeTags;
  readonly outcomeOf: typeof outcomeOf;
  readonly outcomeOfReason: Readonly<Record<string, string>>;
  readonly fields: readonly ContactFieldSpec[];
  readonly draft: (cells: readonly string[], mapping: ColumnMapping) => ContactDraft;
  readonly sources: { readonly decide: string; readonly mark: string; readonly erase: string };
  /** Every src code file whose text mentions TAKE_FILE or FILL_BLANKS at all — §D10's population. */
  readonly srcMentions: readonly Source[];
  readonly srcFilesScanned: number;
};

const PATHS = {
  decide: "src/lib/contacts/import-decide.ts",
  mark: "src/lib/marketing/erasure-mark.ts",
  erase: "src/lib/server/marketing/erase.ts",
} as const;

const CODE_FILE = /\.(?:ts|tsx|mts|js|jsx|mjs)$/;

function walkSrc(): { scanned: number; mentions: Source[] } {
  let scanned = 0;
  const mentions: Source[] = [];
  const visit = (rel: string): void => {
    for (const entry of readdirSync(join(ROOT, rel), { withFileTypes: true })) {
      const child = `${rel}/${entry.name}`;
      if (entry.isDirectory()) visit(child);
      else if (CODE_FILE.test(entry.name)) {
        scanned++;
        const raw = readFileSync(join(ROOT, child), "utf8");
        if (raw.includes("TAKE_FILE") || raw.includes("FILL_BLANKS")) mentions.push({ path: child, text: tidy(raw) });
      }
    }
  };
  visit("src");
  return { scanned, mentions };
}

let cached: DecideImpl | null = null;

/** The SHIPPED bundle: the module's own functions and the real sources. Built once. */
function real(): DecideImpl {
  if (cached) return cached;
  const tree = walkSrc();
  cached = {
    defaultChoice: DEFAULT_IMPORT_CHOICE,
    decide,
    decideRows,
    previewFor,
    plan: planImportRows,
    adjustTally,
    parseOverrides: parseRowOverrides,
    parseChoice: parseImportChoice,
    mergeTags,
    outcomeOf,
    outcomeOfReason: IMPORT_OUTCOME_OF_REASON,
    fields: CONTACT_FIELDS,
    draft: draftContactRow,
    sources: { decide: read(PATHS.decide), mark: read(PATHS.mark), erase: read(PATHS.erase) },
    srcMentions: tree.mentions,
    srcFilesScanned: tree.scanned,
  };
  return cached;
}

/* ══ FIXTURES ═══════════════════════════════════════════════════════════════════════════════════ */

const RUN = "imp_run_now";
const OTHER_RUN = "imp_run_before";
const AT = "2026-10-01T08:00:00.000Z";

/** ⛔ Every fixture number goes through the real parser — a number that does not parse is a broken fixture. */
function msisdnOf(local: string): string {
  const p = parseTzNumber(local);
  if (p.verdict !== "ok" || !p.msisdn) throw new Error(`decide fixture ${local} does not parse`);
  return p.msisdn;
}

const BOOK_FULL = { displayName: "Asha Mwakalinga", email: "asha@example.com", notes: "Met at the stand.", tags: ["vip", "dar"] };
/** What the file carries: a different name, email and note, and one tag the book has ("Dar") plus one it lacks. */
const FILE_ROW = { displayName: "Asha M. Mwakalinga", email: "asha.m@example.com", notes: "Prefers Swahili.", tags: ["Dar", "weekend"] };
/** FILE_ROW as the book would store it (tags lower case — C11). */
const FILE_ROW_STORED = { displayName: "Asha M. Mwakalinga", email: "asha.m@example.com", notes: "Prefers Swahili.", tags: ["dar", "weekend"] };
/** The shape `eraseMarketingFor` leaves (erase.ts): emptied, no import reference, marked. */
const ERASED: Partial<BookSnapshot> = { displayName: null, email: null, notes: null, tags: [], sourceRef: ERASURE_EVIDENCE, importId: null };

function bookRow(id: string, patch: Partial<BookSnapshot> = {}): BookSnapshot {
  return { id, ...BOOK_FULL, sourceRef: null, importId: null, updatedAt: AT, ...patch };
}
function cand(line: number, local: string, patch: Partial<ImportCandidate> = {}): ImportCandidate {
  return { line, msisdn: msisdnOf(local), ...FILE_ROW, ...patch };
}
function numberFacts(patch: Partial<NumberFacts> = {}): NumberFacts {
  return { book: null, suppressed: false, ledgerLatest: null, heldByPlayer: false, ...patch };
}
function facts(patch: Partial<DecideFacts> = {}): DecideFacts {
  return { ...numberFacts(), repeatOf: null, ...patch };
}

const GIVEN: LedgerWord = { status: "GIVEN", evidence: null };
const WITHDRAWN: LedgerWord = { status: "WITHDRAWN", evidence: null };
const ERASURE_WORD: LedgerWord = { status: "WITHDRAWN", evidence: ERASURE_EVIDENCE };

/* ── §D0's matrix: one row (line 5), fourteen states, a literal verdict per state and choice ─────── */

type Verdict = string;
const verdictOf = (d: ImportDecision): Verdict => (d.kind === "keep" ? `keep:${d.reason}` : d.kind);
const allThree = (v: Verdict): Record<ImportChoice, Verdict> => ({ KEEP: v, TAKE_FILE: v, FILL_BLANKS: v });

const MATRIX_LINE = 5;
const MATRIX_LOCAL = "0712 400 501";
const MATRIX_ROW = cand(MATRIX_LINE, MATRIX_LOCAL);

type State = { readonly name: string; readonly facts: DecideFacts; readonly expect: Readonly<Record<ImportChoice, Verdict>> };
const STATES: readonly State[] = [
  { name: "absent", facts: facts(), expect: allThree("create") },
  { name: "absent · ledger GIVEN", facts: facts({ ledgerLatest: GIVEN }), expect: allThree("create") },
  { name: "absent · ledger WITHDRAWN", facts: facts({ ledgerLatest: WITHDRAWN }), expect: allThree("create") },
  { name: "absent · erased (ledger)", facts: facts({ ledgerLatest: ERASURE_WORD }), expect: allThree("keep:erased") },
  { name: "absent · on the stop list", facts: facts({ suppressed: true }), expect: allThree("create") },
  { name: "absent · a player's number", facts: facts({ heldByPlayer: true }), expect: allThree("create") },
  { name: "absent · repeat of line 2", facts: facts({ repeatOf: 2 }), expect: allThree("keep:same_run") },
  { name: "in book", facts: facts({ book: bookRow("mc_plain") }), expect: { KEEP: "keep:chosen_keep", TAKE_FILE: "update", FILL_BLANKS: "keep:no_change" } },
  {
    name: "in book · blanks",
    facts: facts({ book: bookRow("mc_blanks", { email: null, notes: null, tags: [] }) }),
    expect: { KEEP: "keep:chosen_keep", TAKE_FILE: "update", FILL_BLANKS: "update" },
  },
  { name: "in book · erased", facts: facts({ book: bookRow("mc_erased", ERASED) }), expect: allThree("keep:erased") },
  { name: "in book · on the stop list", facts: facts({ book: bookRow("mc_stop"), suppressed: true }), expect: allThree("keep:suppressed") },
  {
    name: "in book · created this run",
    facts: facts({ book: bookRow("mc_this_run", { importId: RUN, sourceRef: RUN }) }),
    expect: allThree("keep:same_run"),
  },
  {
    name: "in book · created by another run",
    facts: facts({ book: bookRow("mc_other_run", { importId: OTHER_RUN, sourceRef: OTHER_RUN }) }),
    expect: { KEEP: "keep:chosen_keep", TAKE_FILE: "update", FILL_BLANKS: "keep:no_change" },
  },
  { name: "in book · repeat of line 2", facts: facts({ book: bookRow("mc_repeat"), repeatOf: 2 }), expect: allThree("keep:same_run") },
];
const OVERRIDE_VARIANTS: readonly (ImportChoice | null)[] = [null, "KEEP", "TAKE_FILE", "FILL_BLANKS"];
/** 14 states × 3 choices × 4 override variants — typed, never computed, so a shrinking matrix is seen. */
const MATRIX_CELLS = 168;

function state(name: string): State {
  const s = STATES.find((x) => x.name === name);
  if (!s) throw new Error(`no state ${name}`);
  return s;
}
const on = (choice: ImportChoice, line: number = MATRIX_LINE): RowOverrides => ({ [line]: choice });

type Cell = { readonly state: string; readonly bulk: ImportChoice; readonly override: ImportChoice | null; readonly decision: ImportDecision; readonly expected: Verdict };

function matrix(impl: DecideImpl): Cell[] {
  const cells: Cell[] = [];
  for (const s of STATES) {
    for (const bulk of IMPORT_CHOICES) {
      for (const override of OVERRIDE_VARIANTS) {
        const ov = override === null ? NO_OVERRIDES : on(override);
        cells.push({ state: s.name, bulk, override, decision: impl.decide(MATRIX_ROW, s.facts, bulk, ov, RUN), expected: s.expect[override ?? bulk] });
      }
    }
  }
  return cells;
}

/* ── §D11's file: twelve rows, each a different reason, one number repeated ─────────────────────── */

const N = {
  clean: "0712 401 002",
  plain: "0712 401 003",
  blanks: "0712 401 004",
  erased: "0712 401 005",
  stop: "0754 401 006",
  erasedLedger: "0754 401 007",
  newStop: "0754 401 008",
  thisRun: "0621 401 010",
  otherRun: "0621 401 011",
  identical: "0621 401 012",
  player: "0786 401 013",
};
const FILE_SET: readonly ImportCandidate[] = [
  cand(2, N.clean),
  cand(3, N.plain),
  cand(4, N.blanks),
  cand(5, N.erased),
  cand(6, N.stop),
  cand(7, N.erasedLedger),
  cand(8, N.newStop),
  cand(9, N.clean), // repeats line 2 — the first row wins (OD33)
  cand(10, N.thisRun),
  cand(11, N.otherRun),
  cand(12, N.identical),
  cand(13, N.player),
];
const FILE_FACTS: FactsByNumber = new Map<string, NumberFacts>([
  [msisdnOf(N.clean), numberFacts()],
  [msisdnOf(N.plain), numberFacts({ book: bookRow("mc_f3") })],
  [msisdnOf(N.blanks), numberFacts({ book: bookRow("mc_f4", { email: null, notes: null, tags: [] }) })],
  [msisdnOf(N.erased), numberFacts({ book: bookRow("mc_f5", ERASED) })],
  [msisdnOf(N.stop), numberFacts({ book: bookRow("mc_f6"), suppressed: true })],
  [msisdnOf(N.erasedLedger), numberFacts({ ledgerLatest: ERASURE_WORD })],
  [msisdnOf(N.newStop), numberFacts({ suppressed: true })],
  [msisdnOf(N.thisRun), numberFacts({ book: bookRow("mc_f10", { importId: RUN, sourceRef: RUN }) })],
  [msisdnOf(N.otherRun), numberFacts({ book: bookRow("mc_f11", { importId: OTHER_RUN, sourceRef: OTHER_RUN }) })],
  [msisdnOf(N.identical), numberFacts({ book: bookRow("mc_f12", { ...FILE_ROW_STORED }) })],
  [msisdnOf(N.player), numberFacts({ heldByPlayer: true })],
]);

/**
 * ⭐ The Apply label for FILE_SET, typed here as LITERALS (worked out by hand from the rule, never by the code under
 * test). Creates: lines 2, 8, 13. Erased (shown as no_change): 5, 7. Stop list: 6. Same run: 9, 10.
 * KEEP keeps 3, 4, 11, 12 as chosen. TAKE_FILE updates 3, 4, 11 (each replaces a name) and finds 12 unchanged.
 * FILL_BLANKS updates 4 alone and finds 3, 11, 12 unchanged.
 */
const EXPECTED_SHOWN: Readonly<Record<ImportChoice, ShownTally>> = {
  KEEP: { create: 3, update: 0, keep: 9, overwrites: 0, keepBy: { chosen_keep: 4, suppressed: 1, same_run: 2, no_change: 2 } },
  TAKE_FILE: { create: 3, update: 3, keep: 6, overwrites: 3, keepBy: { chosen_keep: 0, suppressed: 1, same_run: 2, no_change: 3 } },
  FILL_BLANKS: { create: 3, update: 1, keep: 8, overwrites: 0, keepBy: { chosen_keep: 0, suppressed: 1, same_run: 2, no_change: 5 } },
};

/* ══ THE SCANNERS (§D3d, §D10, §D16) — the same functions run over the real sources and every plant ═════ */

const IMPORT_FORMS = [
  /^\s*(?:import|export)\b[^;=]*?\bfrom\s*["']([^"']+)["']/gm,
  /^\s*import\s*["']([^"']+)["']/gm,
  /\bimport\s*\(\s*["']([^"']+)["']/g,
  /\brequire\s*\(\s*["']([^"']+)["']/g,
];
function specifiers(src: string): string[] {
  const out: string[] = [];
  for (const form of IMPORT_FORMS) for (const m of src.matchAll(form)) out.push(m[1]);
  return out;
}
const DIRECTIVE = /^\s*["']use (?:client|server)["']/;
const SERVER_ONLY = /["']server-only["']/;
const QUOTED_ERASURE = new RegExp(`["'${BACKTICK}]erasure["'${BACKTICK}]`);
const QUOTED_CHOICE = new RegExp(`["'${BACKTICK}](?:TAKE_FILE|FILL_BLANKS)["'${BACKTICK}]`);
const spellersOf = (files: readonly Source[]): string[] => files.filter((f) => QUOTED_CHOICE.test(f.text)).map((f) => f.path);

/** Where the choices may be spelled (plan §9 U31 D10): the rule, its copy, and the run row's type and mapper. */
const ALLOWED_SPELLERS = [
  "src/lib/contacts/import-decide.ts",
  "src/app/admin/contacts/import-copy.ts",
  "src/lib/server/store.ts",
  "src/lib/server/prisma-dal.ts",
];

/** OD10's consent words, as a header or alias would carry them. */
const CONSENT_WORD = /consent|opt.?in|ridhaa|kibali|idhini/i;

/* ══ THE ASSERTION LABELS — one place, so a plant names exactly the line it must turn red ═══════════ */

export const L = {
  D0: "D0 · CONTROL · the matrix — 14 number states × 3 choices × 4 override variants, one decision per cell, each the literal verdict",
  D1: "D1 · ⭐ KEEP is the default — DEFAULT_IMPORT_CHOICE is KEEP, and a differing in-book row with no override is kept (chosen_keep)",
  D2: "D2 · ⛔ an ACTIVE stop collapses an in-book row to keep under every choice and every override; CONTROL: with no stop, TAKE_FILE and FILL_BLANKS update it",
  D3: "D3 · ⛔ a row marked ERASURE_EVIDENCE collapses to keep under TAKE_FILE, FILL_BLANKS and either override; CONTROL: the same emptied row marked by another run updates",
  D3d: "D3d · ONE binding — erasure-mark declares ERASURE_EVIDENCE = \"erasure\" and imports nothing; erase.ts imports and re-exports it and declares none; import-decide imports it and spells no \"erasure\" literal",
  D3e: "D3e · a NEW number whose latest ledger word is the erasure withdrawal is kept, under every choice, naming no contact; CONTROL: a later GIVEN, or a plain WITHDRAWN, creates",
  D4d: "D4d · ⛔ every update patch across the matrix uses only IMPORT_PATCH_KEYS — no consent, stop, link, source, run or raw key",
  D4e: "D4e · ⛔ X5 — consentWritable only for a created number with NO ledger row, no active stop and no player; no existing-row decision carries it; CONTROL: a clean new number is writable",
  D5: "D5 · ⭐ overrides are keyed by FILE ROW, never by array index — rows 2, 3, 6, 7: {6} updates only row 6, {2} only row 2, a dropped row's {4} nobody",
  D5b: "D5b · parseRowOverrides refuses an array, 1.5, 0, 06, -1, a fourth choice, a lower-case choice, a row outside the file, a Map, __proto__ and non-objects; CONTROL: {\"6\":\"TAKE_FILE\"} and {} are read; parseImportChoice takes exactly the three",
  D5c: "D5c · precedence — an override beats the bulk choice; erasure, the stop list and the same run beat the override; erasure beats the stop list, the stop list beats the same run",
  D6: "D6 · TAKE_FILE — a differing non-blank value replaces the book's, a blank cell NEVER blanks one, tags MERGE by tagKey, and the overwrite lines name email and notes without their values",
  D7: "D7 · FILL_BLANKS — only blank book fields are filled, tags only when the book has none, and no FILL_BLANKS update across the matrix lists an overwrite or touches a filled field",
  D8: "D8 · no_change — the book's own values re-imported (re-spaced, an email's case, CRLF, tags as a set, legacy tag case) keep under TAKE_FILE and FILL_BLANKS",
  D8b: "D8b · ⛔ C11 — a merge never takes a contact past 20 tags; the tags that do not fit are LISTED, never silently dropped",
  D9: "D9 · ⭐ OD33 — the first row wins: a number this run created or an earlier line already carries is kept (same_run), for a new number AND an in-book one, in any arrival order and across batches; CONTROL: another run's row updates",
  D10: "D10 · ⛔ ONE rule — outside the allowlist no src file spells \"TAKE_FILE\" or \"FILL_BLANKS\"; CONTROL: the scan finds import-decide.ts and reports a planted speller",
  D11: "D11 · ⭐ label = request — planImportRows' byChoice is decide()'s own tally for each choice and equals the literal counts; adjustTally over the previews equals decide() with those overrides",
  D11b: "D11b · planImportRows THROWS when a number's facts were not loaded (never a silent \"new\"), and the message names the row, not the number",
  D12: "D12 · ⭐ X4 — ONE outcome union: the decided outcome and reason lists, every reason in exactly one outcome, decide()'s reasons are keeps, and outcomeOf() writes a valid row pair for every decision",
  D14: "D14 · ⛔ D19 — a create preview is exactly {line, kind}, and no preview or plan carries consentWritable, heldByPlayer, a ledger fact or the word player",
  D14b: "D14b · ⛔ X22/C3 — erasure is never disclosed: an erased row's preview is {line, keep, no_change} naming no contact, and no plan carries 'erased'; CONTROL: the server truth still counts it",
  D15: "D15 · ⛔ OD10 — a drafted row's writable keys are exactly IMPORT_PATCH_KEYS (plus the phone), and no field key, label or alias is a consent word; CONTROL: the word test matches the not-imported consent column",
  D16: "D16 · ⛔ PURITY — import-decide imports exactly ./contact-fields and ../marketing/erasure-mark, erasure-mark imports nothing, and neither carries a directive or server-only",
} as const;

/* ══ THE ASSERTIONS ═════════════════════════════════════════════════════════════════════════════ */

function run(ctx: SectionContext<DecideImpl>): void {
  const { impl, ok, log } = ctx;
  const cells = matrix(impl);
  log(`matrix: ${cells.length} cells · file: ${FILE_SET.length} rows · src scanned: ${impl.srcFilesScanned} files, ${impl.srcMentions.length} mention the choices`);

  // ── D0 · the matrix ────────────────────────────────────────────────────────────────────────────
  const wrong = cells.filter((x) => verdictOf(x.decision) !== x.expected || x.decision.line !== MATRIX_LINE);
  ok(L.D0, cells.length === MATRIX_CELLS && wrong.length === 0,
    wrong.slice(0, 4).map((x) => `${x.state} · ${x.bulk}${x.override ? ` + row ${x.override}` : ""} → ${verdictOf(x.decision)}, not ${x.expected}`).join(" | ")
      || `${cells.length} cells`);

  // ── D1 · KEEP is the default ───────────────────────────────────────────────────────────────────
  const plain = state("in book").facts;
  const byDefault = impl.decide(MATRIX_ROW, plain, impl.defaultChoice, NO_OVERRIDES, RUN);
  const differs = impl.decide(MATRIX_ROW, plain, "TAKE_FILE", NO_OVERRIDES, RUN);
  ok(L.D1,
    impl.defaultChoice === "KEEP" && DEFAULT_IMPORT_CHOICE === "KEEP"
      && byDefault.kind === "keep" && byDefault.reason === "chosen_keep" && byDefault.contactId === "mc_plain"
      && differs.kind === "update",
    `default ${impl.defaultChoice} → ${verdictOf(byDefault)} · control under TAKE_FILE → ${verdictOf(differs)}`);

  // ── D2 · the stop list ─────────────────────────────────────────────────────────────────────────
  const stopped = facts({ book: bookRow("mc_d2", { email: null, notes: null, tags: [] }), suppressed: true });
  const stopCells = IMPORT_CHOICES.flatMap((bulk) =>
    OVERRIDE_VARIANTS.map((o) => impl.decide(MATRIX_ROW, stopped, bulk, o === null ? NO_OVERRIDES : on(o), RUN)));
  const lifted: DecideFacts = { ...stopped, suppressed: false };
  const liftedTake = impl.decide(MATRIX_ROW, lifted, "TAKE_FILE", NO_OVERRIDES, RUN);
  const liftedFill = impl.decide(MATRIX_ROW, lifted, "FILL_BLANKS", NO_OVERRIDES, RUN);
  ok(L.D2,
    stopCells.length === 12 && stopCells.every((d) => d.kind === "keep" && d.reason === "suppressed" && d.contactId === "mc_d2")
      && liftedTake.kind === "update" && liftedFill.kind === "update",
    `${stopCells.map(verdictOf).filter((v) => v !== "keep:suppressed").join(", ") || "all kept"} · lifted → ${verdictOf(liftedTake)} / ${verdictOf(liftedFill)}`);

  // ── D3 · the erasure mark on a book row ────────────────────────────────────────────────────────
  const erasedBook = facts({ book: bookRow("mc_d3", ERASED) });
  const erasedCalls = [
    impl.decide(MATRIX_ROW, erasedBook, "TAKE_FILE", NO_OVERRIDES, RUN),
    impl.decide(MATRIX_ROW, erasedBook, "FILL_BLANKS", NO_OVERRIDES, RUN),
    impl.decide(MATRIX_ROW, erasedBook, "KEEP", on("TAKE_FILE"), RUN),
    impl.decide(MATRIX_ROW, erasedBook, "KEEP", on("FILL_BLANKS"), RUN),
  ];
  const otherMark = facts({ book: bookRow("mc_d3c", { ...ERASED, sourceRef: "imp_other" }) });
  const otherTake = impl.decide(MATRIX_ROW, otherMark, "TAKE_FILE", NO_OVERRIDES, RUN);
  const otherFill = impl.decide(MATRIX_ROW, otherMark, "FILL_BLANKS", NO_OVERRIDES, RUN);
  ok(L.D3,
    erasedCalls.every((d) => d.kind === "keep" && d.reason === "erased") && otherTake.kind === "update" && otherFill.kind === "update",
    `${erasedCalls.map(verdictOf).join(", ")} · control → ${verdictOf(otherTake)} / ${verdictOf(otherFill)}`);

  // ── D3d · one binding ──────────────────────────────────────────────────────────────────────────
  const { decide: decideSrc, mark: markSrc, erase: eraseSrc } = impl.sources;
  const markOk = /export const ERASURE_EVIDENCE = "erasure"(?: as const)?;/.test(markSrc) && specifiers(markSrc).length === 0 && ERASURE_EVIDENCE === "erasure";
  const eraseOk = eraseSrc.includes('import { ERASURE_EVIDENCE } from "@/lib/marketing/erasure-mark";')
    && /export \{ ERASURE_EVIDENCE \};/.test(eraseSrc) && !/\bERASURE_EVIDENCE\s*=(?!=)/.test(eraseSrc) && !QUOTED_ERASURE.test(eraseSrc);
  const decideOk = specifiers(decideSrc).some((s) => s === "../marketing/erasure-mark" || s === "@/lib/marketing/erasure-mark")
    && /\bERASURE_EVIDENCE\b/.test(decideSrc) && !QUOTED_ERASURE.test(decideSrc);
  ok(L.D3d, markOk && eraseOk && decideOk, `mark ${markOk} · erase.ts ${eraseOk} · import-decide ${decideOk}`);

  // ── D3e · a new number, erased ─────────────────────────────────────────────────────────────────
  const newErased = IMPORT_CHOICES.map((ch) => impl.decide(MATRIX_ROW, facts({ ledgerLatest: ERASURE_WORD }), ch, NO_OVERRIDES, RUN));
  const laterGiven = impl.decide(MATRIX_ROW, facts({ ledgerLatest: GIVEN }), "KEEP", NO_OVERRIDES, RUN);
  const plainWithdrawn = impl.decide(MATRIX_ROW, facts({ ledgerLatest: WITHDRAWN }), "KEEP", NO_OVERRIDES, RUN);
  ok(L.D3e,
    newErased.every((d) => d.kind === "keep" && d.reason === "erased" && d.contactId === null)
      && laterGiven.kind === "create" && plainWithdrawn.kind === "create",
    `${newErased.map(verdictOf).join(", ")} · GIVEN → ${verdictOf(laterGiven)} · WITHDRAWN → ${verdictOf(plainWithdrawn)}`);

  // ── D4d · the patch keys ───────────────────────────────────────────────────────────────────────
  const patchKeys = IMPORT_PATCH_KEYS as readonly string[];
  const updates = cells.map((x) => x.decision).filter((d): d is Extract<ImportDecision, { kind: "update" }> => d.kind === "update");
  const strayKeys = [...new Set(updates.flatMap((d) => Object.keys(d.patch).filter((k) => !patchKeys.includes(k))))];
  ok(L.D4d, updates.length > 0 && strayKeys.length === 0, `${updates.length} updates · stray keys: ${strayKeys.join(", ") || "none"}`);

  // ── D4e · X5, the consent seam ─────────────────────────────────────────────────────────────────
  const writable = (f: DecideFacts): boolean | string => {
    const d = impl.decide(MATRIX_ROW, f, "KEEP", NO_OVERRIDES, RUN);
    return d.kind === "create" ? d.consentWritable : `not a create (${verdictOf(d)})`;
  };
  const w = {
    clean: writable(facts()),
    given: writable(facts({ ledgerLatest: GIVEN })),
    withdrawn: writable(facts({ ledgerLatest: WITHDRAWN })),
    stop: writable(facts({ suppressed: true })),
    player: writable(facts({ heldByPlayer: true })),
  };
  const carriers = cells.filter((x) => x.decision.kind !== "create" && "consentWritable" in x.decision).length;
  ok(L.D4e,
    w.clean === true && w.given === false && w.withdrawn === false && w.stop === false && w.player === false && carriers === 0,
    `${JSON.stringify(w)} · existing rows carrying the flag: ${carriers}`);

  // ── D5 · the file-row key ──────────────────────────────────────────────────────────────────────
  const d5Rows = [cand(2, "0712 400 602"), cand(3, "0712 400 603"), cand(6, "0712 400 606"), cand(7, "0712 400 607")];
  const d5Facts: FactsByNumber = new Map(d5Rows.map((c, i): [string, NumberFacts] => [c.msisdn, numberFacts({ book: bookRow(`mc_d5_${i}`) })]));
  const updatedLines = (ov: RowOverrides): string =>
    impl.decideRows(d5Rows, d5Facts, "KEEP", ov, RUN).filter((d) => d.kind === "update").map((d) => d.line).join(",");
  const six = updatedLines(on("TAKE_FILE", 6));
  const two = updatedLines(on("TAKE_FILE", 2));
  const four = updatedLines(on("TAKE_FILE", 4));
  ok(L.D5, six === "6" && two === "2" && four === "", `{6} → ${six || "none"} · {2} → ${two || "none"} · {4} → ${four || "none"}`);

  // ── D5b · the wire ─────────────────────────────────────────────────────────────────────────────
  const known = new Set([2, 3, 6, 7]);
  const refusedInputs: unknown[] = [
    ["TAKE_FILE"],
    { "1.5": "TAKE_FILE" },
    { "0": "TAKE_FILE" },
    { "06": "TAKE_FILE" },
    { "-1": "TAKE_FILE" },
    { "6": "OVERWRITE" },
    { "6": "take_file" },
    { "9": "TAKE_FILE" },
    new Map([[6, "TAKE_FILE"]]),
    JSON.parse('{"__proto__":"TAKE_FILE"}'),
    null,
    "6",
    6,
  ];
  const leaked = refusedInputs.filter((raw) => impl.parseOverrides(raw, known) !== null).map((raw) => stable(raw));
  const read6 = impl.parseOverrides({ "6": "TAKE_FILE" }, known);
  const readEmpty = impl.parseOverrides({}, known);
  const choicesOk = impl.parseChoice("KEEP") === "KEEP" && impl.parseChoice("TAKE_FILE") === "TAKE_FILE" && impl.parseChoice("FILL_BLANKS") === "FILL_BLANKS"
    && [" KEEP", "keep", "", null, "OVERWRITE", ["KEEP"], 0].every((raw) => impl.parseChoice(raw) === null);
  ok(L.D5b, leaked.length === 0 && read6 !== null && same(read6, { 6: "TAKE_FILE" }) && readEmpty !== null && same(readEmpty, {}) && choicesOk,
    `accepted what it must refuse: ${leaked.join(" ; ") || "none"} · {"6"} → ${stable(read6)} · choices ${choicesOk}`);

  // ── D5c · precedence ───────────────────────────────────────────────────────────────────────────
  const verdict = (f: DecideFacts, bulk: ImportChoice, ov: RowOverrides): Verdict => verdictOf(impl.decide(MATRIX_ROW, f, bulk, ov, RUN));
  const precedence: Record<string, boolean> = {
    overrideKeepBeatsBulk: verdict(plain, "TAKE_FILE", on("KEEP")) === "keep:chosen_keep",
    overrideTakeBeatsBulk: verdict(plain, "KEEP", on("TAKE_FILE")) === "update",
    erasedBeatsOverride: verdict(state("in book · erased").facts, "KEEP", on("TAKE_FILE")) === "keep:erased",
    stopBeatsOverride: verdict(state("in book · on the stop list").facts, "KEEP", on("TAKE_FILE")) === "keep:suppressed",
    sameRunBeatsOverride: verdict(state("in book · created this run").facts, "KEEP", on("TAKE_FILE")) === "keep:same_run",
    erasedBeatsStop: verdict(facts({ book: bookRow("mc_d5c", ERASED), suppressed: true }), "TAKE_FILE", NO_OVERRIDES) === "keep:erased",
    stopBeatsSameRun: verdict(facts({ book: bookRow("mc_d5d", { importId: RUN }), suppressed: true }), "TAKE_FILE", NO_OVERRIDES) === "keep:suppressed",
    anotherRowsOverrideIgnored: verdict(plain, "KEEP", on("TAKE_FILE", MATRIX_LINE + 1)) === "keep:chosen_keep",
  };
  const broken = Object.entries(precedence).filter(([, good]) => !good).map(([k]) => k);
  ok(L.D5c, broken.length === 0, broken.join(", ") || "all eight hold");

  // ── D6 · TAKE_FILE ─────────────────────────────────────────────────────────────────────────────
  const full = facts({ book: bookRow("mc_d6") });
  const take = impl.decide(MATRIX_ROW, full, "TAKE_FILE", NO_OVERRIDES, RUN);
  const expectPatch = { displayName: "Asha M. Mwakalinga", email: "asha.m@example.com", notes: "Prefers Swahili.", tags: ["vip", "dar", "weekend"] };
  const expectLines = [{ field: "displayName", from: "Asha Mwakalinga", to: "Asha M. Mwakalinga" }, { field: "email" }, { field: "notes" }];
  const linesText = take.kind === "update" ? JSON.stringify(take.overwrites) : "";
  const allBlank = impl.decide(cand(MATRIX_LINE, MATRIX_LOCAL, { displayName: "", email: null, notes: "   ", tags: [] }), full, "TAKE_FILE", NO_OVERRIDES, RUN);
  const oneField = impl.decide(cand(MATRIX_LINE, MATRIX_LOCAL, { displayName: null, email: "new.one@example.com", notes: "", tags: [] }), full, "TAKE_FILE", NO_OVERRIDES, RUN);
  ok(L.D6,
    take.kind === "update" && same(take.patch, expectPatch) && same(take.overwrites, expectLines) && same(take.tagsAdded, ["weekend"])
      && take.guard.updatedAt === AT && !linesText.includes("@") && !linesText.includes("stand") && !linesText.includes("Swahili")
      && allBlank.kind === "keep" && allBlank.reason === "no_change"
      && oneField.kind === "update" && same(oneField.patch, { email: "new.one@example.com" }),
    `${take.kind === "update" ? stable(take.patch) : verdictOf(take)} · all-blank → ${verdictOf(allBlank)} · one field → ${oneField.kind === "update" ? stable(oneField.patch) : verdictOf(oneField)}`);

  // ── D7 · FILL_BLANKS ───────────────────────────────────────────────────────────────────────────
  const fill = impl.decide(MATRIX_ROW, facts({ book: bookRow("mc_d7", { email: null, notes: null, tags: [] }) }), "FILL_BLANKS", NO_OVERRIDES, RUN);
  const fillFull = impl.decide(MATRIX_ROW, facts({ book: bookRow("mc_d7f") }), "FILL_BLANKS", NO_OVERRIDES, RUN);
  const fillTagged = impl.decide(MATRIX_ROW, facts({ book: bookRow("mc_d7t", { email: null, notes: null, tags: ["vip"] }) }), "FILL_BLANKS", NO_OVERRIDES, RUN);
  const fillCells = cells.filter((x) => (x.override ?? x.bulk) === "FILL_BLANKS" && x.decision.kind === "update");
  const fillTouchedFilled = fillCells.filter((x) => {
    const d = x.decision;
    const book = state(x.state).facts.book;
    if (d.kind !== "update" || book === null) return true;
    if (d.overwrites.length > 0) return true;
    return Object.keys(d.patch).some((k) => {
      if (k === "tags") return book.tags.length > 0;
      const v = (book as Record<string, unknown>)[k];
      return typeof v === "string" && v.trim() !== "";
    });
  });
  ok(L.D7,
    fill.kind === "update" && same(fill.patch, { email: "asha.m@example.com", notes: "Prefers Swahili.", tags: ["dar", "weekend"] }) && fill.overwrites.length === 0
      && fillFull.kind === "keep" && fillFull.reason === "no_change"
      && fillTagged.kind === "update" && same(fillTagged.patch, { email: "asha.m@example.com", notes: "Prefers Swahili." })
      && fillCells.length > 0 && fillTouchedFilled.length === 0,
    `${fill.kind === "update" ? stable(fill.patch) : verdictOf(fill)} · full → ${verdictOf(fillFull)} · matrix FILL updates ${fillCells.length}, touching a filled field ${fillTouchedFilled.length}`);

  // ── D8 · no_change ─────────────────────────────────────────────────────────────────────────────
  const respaced = cand(MATRIX_LINE, MATRIX_LOCAL, { displayName: "  Asha   Mwakalinga ", email: " ASHA@Example.com ", notes: `Met at the stand.${CRLF}`, tags: ["VIP", "Dar"] });
  const asExported = cand(MATRIX_LINE, MATRIX_LOCAL, { ...BOOK_FULL });
  const bookFull = facts({ book: bookRow("mc_d8") });
  const legacy = facts({ book: bookRow("mc_d8l", { tags: ["VIP", "Dar"] }) });
  const noChange = [
    impl.decide(respaced, bookFull, "TAKE_FILE", NO_OVERRIDES, RUN),
    impl.decide(respaced, bookFull, "FILL_BLANKS", NO_OVERRIDES, RUN),
    impl.decide(asExported, bookFull, "TAKE_FILE", NO_OVERRIDES, RUN),
    impl.decide(asExported, bookFull, "FILL_BLANKS", NO_OVERRIDES, RUN),
    impl.decide(cand(MATRIX_LINE, MATRIX_LOCAL, { ...BOOK_FULL, tags: ["vip"] }), legacy, "TAKE_FILE", NO_OVERRIDES, RUN),
  ];
  ok(L.D8, noChange.every((d) => d.kind === "keep" && d.reason === "no_change"), noChange.map(verdictOf).join(" | "));

  // ── D8b · the tag cap ──────────────────────────────────────────────────────────────────────────
  const tagsOf = (n: number): string[] => Array.from({ length: n }, (_, i) => `t${i + 1}`);
  const capRow = cand(MATRIX_LINE, MATRIX_LOCAL, { ...BOOK_FULL, tags: ["new a", "new b", "new c"] });
  const cap19 = impl.decide(capRow, facts({ book: bookRow("mc_cap19", { tags: tagsOf(19) }) }), "TAKE_FILE", NO_OVERRIDES, RUN);
  const cap20 = impl.decide(capRow, facts({ book: bookRow("mc_cap20", { tags: tagsOf(20) }) }), "TAKE_FILE", NO_OVERRIDES, RUN);
  const direct = impl.mergeTags(tagsOf(19), ["New A", "new b", "NEW C"]);
  ok(L.D8b,
    cap19.kind === "update" && (cap19.patch.tags?.length ?? 0) === 20 && same(cap19.tagsAdded, ["new a"]) && same(cap19.tagsNotAdded, ["new b", "new c"])
      && cap20.kind === "keep" && cap20.reason === "no_change" && same(cap20.tagsNotAdded, ["new a", "new b", "new c"])
      && direct.tags.length === 20 && same(direct.added, ["new a"]) && same(direct.notAdded, ["new b", "new c"])
      && same(impl.mergeTags(["a"], ["A", "b"]).tags, ["a", "b"]),
    `19 + 3 → ${cap19.kind === "update" ? `${cap19.patch.tags?.length} tags, not added ${stable(cap19.tagsNotAdded)}` : verdictOf(cap19)} · 20 + 3 → ${verdictOf(cap20)} · direct ${direct.tags.length}`);

  // ── D9 · the first row wins ────────────────────────────────────────────────────────────────────
  const takeVerdict = (f: DecideFacts): Verdict => verdictOf(impl.decide(MATRIX_ROW, f, "TAKE_FILE", NO_OVERRIDES, RUN));
  const thisRun = takeVerdict(facts({ book: bookRow("mc_d9a", { importId: RUN, sourceRef: RUN }) }));
  const repeatNew = takeVerdict(facts({ repeatOf: 2 }));
  const repeatInBook = takeVerdict(facts({ book: bookRow("mc_d9b"), repeatOf: 2 }));
  const otherRun = takeVerdict(facts({ book: bookRow("mc_d9c", { importId: OTHER_RUN, sourceRef: OTHER_RUN }) }));
  const NEW_DUP = "0712 400 903";
  const BOOK_DUP = "0712 400 904";
  const rowsNew = [cand(3, NEW_DUP), cand(9, NEW_DUP, { displayName: "Someone Else" })];
  const rowsBook = [cand(4, BOOK_DUP), cand(8, BOOK_DUP, { displayName: "Someone Else" })];
  const dupFacts: FactsByNumber = new Map<string, NumberFacts>([
    [msisdnOf(NEW_DUP), numberFacts()],
    [msisdnOf(BOOK_DUP), numberFacts({ book: bookRow("mc_d9d") })],
  ]);
  const tagged = (ds: ImportDecision[]): string => ds.map((d) => `${d.line}:${verdictOf(d)}`).sort().join(",");
  const fileNew = tagged(impl.decideRows(rowsNew, dupFacts, "TAKE_FILE", NO_OVERRIDES, RUN));
  const fileNewReversed = tagged(impl.decideRows([...rowsNew].reverse(), dupFacts, "TAKE_FILE", NO_OVERRIDES, RUN));
  const fileBook = tagged(impl.decideRows(rowsBook, dupFacts, "TAKE_FILE", NO_OVERRIDES, RUN));
  const laterBatch = tagged(impl.decideRows([rowsNew[1]], dupFacts, "TAKE_FILE", NO_OVERRIDES, RUN, new Map([[msisdnOf(NEW_DUP), 3]])));
  ok(L.D9,
    thisRun === "keep:same_run" && repeatNew === "keep:same_run" && repeatInBook === "keep:same_run" && otherRun === "update"
      && fileNew === "3:create,9:keep:same_run" && fileNewReversed === "3:create,9:keep:same_run"
      && fileBook === "4:update,8:keep:same_run" && laterBatch === "9:keep:same_run",
    `this run ${thisRun} · repeat ${repeatNew} / in book ${repeatInBook} · other run ${otherRun} · file ${fileNew} · reversed ${fileNewReversed} · in book ${fileBook} · later batch ${laterBatch}`);

  // ── D10 · one rule ─────────────────────────────────────────────────────────────────────────────
  const spellers = spellersOf(impl.srcMentions);
  const offenders = spellers.filter((p) => !ALLOWED_SPELLERS.includes(p));
  const plantedSeen = spellersOf([{ path: "src/planted.ts", text: 'export const x = (c: string) => c === "FILL_BLANKS";' }]).length === 1;
  ok(L.D10,
    spellers.includes(PATHS.decide) && offenders.length === 0 && plantedSeen && impl.srcFilesScanned >= 100,
    `spellers: ${spellers.join(", ") || "none"} · outside the allowlist: ${offenders.join(", ") || "none"} · ${impl.srcFilesScanned} files scanned`);

  // ── D11 · label = request ──────────────────────────────────────────────────────────────────────
  const plan = impl.plan({ runId: RUN, candidates: FILE_SET, facts: FILE_FACTS });
  const viaDecide = (bulk: ImportChoice, ov: RowOverrides): ShownTally => shownTally(tallyDecisions(impl.decideRows(FILE_SET, FILE_FACTS, bulk, ov, RUN)));
  const labelIsDecide = IMPORT_CHOICES.filter((ch) => !same(plan.byChoice[ch], viaDecide(ch, NO_OVERRIDES)));
  const notLiteral = IMPORT_CHOICES.filter((ch) => !same(plan.byChoice[ch], EXPECTED_SHOWN[ch]));
  const PAIRS: ReadonlyArray<readonly [ImportChoice, RowOverrides]> = [
    ["KEEP", { 3: "TAKE_FILE" }],
    ["TAKE_FILE", { 3: "KEEP", 4: "FILL_BLANKS" }],
    ["FILL_BLANKS", { 11: "TAKE_FILE", 5: "TAKE_FILE", 2: "TAKE_FILE", 6: "TAKE_FILE" }],
  ];
  const adjustedWrong = PAIRS.filter(([bulk, ov]) => !same(impl.adjustTally(plan.byChoice, plan.previews, bulk, ov), viaDecide(bulk, ov))).map(([bulk]) => bulk);
  ok(L.D11,
    labelIsDecide.length === 0 && notLiteral.length === 0 && adjustedWrong.length === 0 && plan.previews.length === FILE_SET.length,
    `byChoice ≠ decide: ${labelIsDecide.join(", ") || "none"} · ≠ literal: ${notLiteral.map((ch) => `${ch} ${stable(plan.byChoice[ch])}`).join(" ; ") || "none"} · adjustTally ≠ decide: ${adjustedWrong.join(", ") || "none"}`);

  // ── D11b · missing facts ───────────────────────────────────────────────────────────────────────
  const missing = new Map(FILE_FACTS);
  missing.delete(msisdnOf(N.plain));
  let threw = false;
  let message = "";
  try {
    impl.plan({ runId: RUN, candidates: FILE_SET, facts: missing });
  } catch (e) {
    threw = true;
    message = e instanceof Error ? e.message : String(e);
  }
  ok(L.D11b, threw && message.includes("row 3") && !/[0-9]{6,}/.test(message), message || "did not throw");

  // ── D12 · X4, the one outcome union ────────────────────────────────────────────────────────────
  const OUTCOMES_DECIDED = ["create", "update", "keep", "fail"];
  const REASONS_DECIDED = ["chosen_keep", "erased", "suppressed", "same_run", "no_change", "write_refused", "changed_during_import", "invalid"];
  const OUTCOME_OF_DECIDED = {
    chosen_keep: "keep", erased: "keep", suppressed: "keep", same_run: "keep", no_change: "keep",
    changed_during_import: "keep", write_refused: "fail", invalid: "fail",
  };
  const badRows = cells.filter((x) => {
    const o = impl.outcomeOf(x.decision);
    const d = x.decision;
    const paired = d.kind === "keep" ? o.outcome === "keep" && o.reason === d.reason : o.outcome === d.kind && o.reason === null;
    return !paired || !isImportOutcomeRow(o.outcome, o.reason);
  });
  const refusals = [
    isImportOutcomeRow("keep", "invalid"),
    isImportOutcomeRow("fail", "no_change"),
    isImportOutcomeRow("create", "no_change"),
    isImportOutcomeRow("keep", null),
    isImportOutcomeRow("skip", "chosen_keep"),
    isImportOutcomeRow("keep", "nonsense"),
  ].every((v) => v === false);
  const controls = isImportOutcomeRow("fail", "write_refused") && isImportOutcomeRow("keep", "changed_during_import") && isImportOutcomeRow("create", null);
  ok(L.D12,
    same(IMPORT_OUTCOMES, OUTCOMES_DECIDED) && same(IMPORT_OUTCOME_REASONS, REASONS_DECIDED) && same(impl.outcomeOfReason, OUTCOME_OF_DECIDED)
      && DECIDE_KEEP_REASONS.every((r) => impl.outcomeOfReason[r] === "keep") && badRows.length === 0 && refusals && controls,
    `table ${same(impl.outcomeOfReason, OUTCOME_OF_DECIDED)} · rows that would not write: ${badRows.length} · refusals ${refusals} · controls ${controls}`);

  // ── D14 · D19, no oracle ───────────────────────────────────────────────────────────────────────
  const previews = STATES.map((s) => ({ name: s.name, p: impl.previewFor(MATRIX_ROW, s.facts, RUN) }));
  const creates = previews.filter((x) => x.p.kind === "create");
  const notBare = creates.filter((x) => Object.keys(x.p).sort().join(",") !== "kind,line").map((x) => x.name);
  const BANNED = /consentWritable|heldByPlayer|ledger|player/i;
  const leaking = previews.filter((x) => BANNED.test(JSON.stringify(x.p))).map((x) => x.name);
  const planText = JSON.stringify(plan);
  ok(L.D14,
    creates.length === 5 && notBare.length === 0 && leaking.length === 0 && !BANNED.test(planText),
    `${creates.length} create previews · not bare: ${notBare.join(", ") || "none"} · leaking: ${leaking.join(", ") || "none"}`);

  // ── D14b · X22, erasure never disclosed ────────────────────────────────────────────────────────
  const erasedPreview = { line: MATRIX_LINE, kind: "keep", reason: "no_change" };
  const inBookErased = impl.previewFor(MATRIX_ROW, state("in book · erased").facts, RUN);
  const ledgerErased = impl.previewFor(MATRIX_ROW, state("absent · erased (ledger)").facts, RUN);
  const keyedErased = IMPORT_CHOICES.filter((ch) => Object.prototype.hasOwnProperty.call(plan.byChoice[ch].keepBy, "erased"));
  const truthCounts = tallyDecisions(decideRows(FILE_SET, FILE_FACTS, "KEEP", NO_OVERRIDES, RUN)).keepBy.erased;
  const truthReason = verdictOf(decide(MATRIX_ROW, state("in book · erased").facts, "TAKE_FILE", NO_OVERRIDES, RUN));
  ok(L.D14b,
    same(inBookErased, erasedPreview) && same(ledgerErased, erasedPreview) && !planText.includes("erased") && !planText.includes("mc_f5")
      && keyedErased.length === 0 && truthCounts === 2 && truthReason === "keep:erased",
    `in book → ${stable(inBookErased)} · ledger → ${stable(ledgerErased)} · plan says erased: ${planText.includes("erased")} · truth ${truthCounts}, ${truthReason}`);

  // ── D15 · OD10, consent cannot arrive as a column ──────────────────────────────────────────────
  const draft = impl.draft(["0712 400 501", "Asha", "a@example.com", "vip", "a note"], { phone: 0, name: 1, email: 2, tags: 3, notes: 4 });
  const writableKeys = Object.keys(draft).filter((k) => k !== "rawPhone" && k !== "problems").sort();
  const consentOwners = impl.fields.flatMap((f) =>
    [f.key, f.label, f.swAlias ?? "", ...f.aliases, ...f.weakAliases].filter((word) => CONSENT_WORD.test(word)).map((word) => `${f.key}: ${word}`));
  const wordTestBites = CONTACT_NOT_IMPORTED.some((e) => e.aliases.some((a) => CONSENT_WORD.test(a)));
  ok(L.D15,
    same(writableKeys, [...IMPORT_PATCH_KEYS].sort()) && consentOwners.length === 0 && wordTestBites,
    `draft writes ${writableKeys.join(", ")} · consent words on fields: ${consentOwners.join(", ") || "none"}`);

  // ── D16 · purity ───────────────────────────────────────────────────────────────────────────────
  const decideSpecs = specifiers(decideSrc);
  const allowed = ["./contact-fields", "../marketing/erasure-mark"];
  const impure = [
    ...decideSpecs.filter((s) => !allowed.includes(s)).map((s) => `import-decide imports ${s}`),
    ...allowed.filter((a) => !decideSpecs.includes(a)).map((a) => `import-decide no longer imports ${a} (the scan is blind?)`),
    ...specifiers(markSrc).map((s) => `erasure-mark imports ${s}`),
    ...[decideSrc, markSrc].filter((s) => DIRECTIVE.test(s) || SERVER_ONLY.test(s)).map(() => "a directive or server-only"),
  ];
  ok(L.D16, impure.length === 0, impure.join(" | ") || `import-decide → ${decideSpecs.join(", ")} · erasure-mark → nothing`);
}

/* ══ RED PLANTS — each a defect built IN MEMORY, and the ONE assertion it must turn red ═══════════ */

const withDecide = (d: typeof decide): DecideImpl => ({ ...real(), decide: d });
const TEXT: readonly ("displayName" | "email" | "notes")[] = ["displayName", "email", "notes"];
type Update = Extract<ImportDecision, { kind: "update" }>;
const updateOf = (c: ImportCandidate, book: BookSnapshot, asked: ImportChoice): Update => ({
  kind: "update", line: c.line, contactId: book.id, asked, patch: {}, overwrites: [], tagsAdded: [], tagsNotAdded: [], guard: { updatedAt: book.updatedAt },
});
const hasOwn = (o: object, k: number): boolean => Object.prototype.hasOwnProperty.call(o, k);

const PLANTS: readonly RedPlant<DecideImpl>[] = [
  {
    name: "R1 · decide() writes consentState GIVEN into every update patch (the plan's 'GIVEN over a WITHDRAWN row')",
    expect: L.D4d,
    impl: () => withDecide((c, f, b, ov, run) => {
      const d = decide(c, f, b, ov, run);
      return d.kind === "update" ? { ...d, patch: { ...d.patch, consentState: "GIVEN" } as ImportPatch } : d;
    }),
  },
  {
    name: "R2 · consentWritable ignores the ledger — the hole U33 would write GIVEN through",
    expect: L.D4e,
    impl: () => withDecide((c, f, b, ov, run) => {
      const d = decide(c, f, b, ov, run);
      return d.kind === "create" ? { ...d, consentWritable: !f.suppressed && !f.heldByPlayer } : d;
    }),
  },
  {
    name: "R2b · consentWritable is the pre-decision predicate (latest ≠ WITHDRAWN), so a number already GIVEN counts writable",
    expect: L.D4e,
    impl: () => withDecide((c, f, b, ov, run) => {
      const d = decide(c, f, b, ov, run);
      return d.kind === "create" ? { ...d, consentWritable: !f.suppressed && !f.heldByPlayer && f.ledgerLatest?.status !== "WITHDRAWN" } : d;
    }),
  },
  {
    name: "R3 · the stop-list collapse removed (decide is handed suppressed: false)",
    expect: L.D2,
    impl: () => withDecide((c, f, b, ov, run) => decide(c, { ...f, suppressed: false }, b, ov, run)),
  },
  {
    name: "R4 · the erasure collapse compares sourceRef to the literal 'erased' — a real erased row passes through",
    expect: L.D3,
    impl: () => withDecide((c, f, b, ov, run) =>
      decide(c, f.book && f.book.sourceRef !== "erased" ? { ...f, book: { ...f.book, sourceRef: null } } : f, b, ov, run)),
  },
  {
    name: "R4b · the new-number erasure check removed — the ledger's erasure withdrawal reads as any withdrawal",
    expect: L.D3e,
    impl: () => withDecide((c, f, b, ov, run) =>
      decide(c, f.book === null && f.ledgerLatest?.evidence === ERASURE_EVIDENCE ? { ...f, ledgerLatest: WITHDRAWN } : f, b, ov, run)),
  },
  {
    name: "R4c · import-decide compares against a typed \"erasure\" instead of the one binding",
    expect: L.D3d,
    impl: () => {
      const r = real();
      return { ...r, sources: { ...r.sources, decide: r.sources.decide.replace("book.sourceRef === ERASURE_EVIDENCE", 'book.sourceRef === "erasure"') } };
    },
  },
  {
    name: "R5 · overrides read by array index (overrides[i]) instead of the file row",
    expect: L.D5,
    impl: () => ({
      ...real(),
      decideRows: (cands, factsBy, bulk, ov, run, first = firstLines(cands)) =>
        cands.map((c, i) => {
          const f = factsBy.get(c.msisdn);
          if (f === undefined) throw new Error("plant R5: no facts");
          const byIndex: RowOverrides = hasOwn(ov, i) ? { [c.line]: (ov as Record<number, ImportChoice>)[i] } : NO_OVERRIDES;
          return decide(c, { ...f, repeatOf: repeatOf(c, first) }, bulk, byIndex, run);
        }),
    }),
  },
  {
    name: "R5b · parseRowOverrides accepts an array as index → choice (index-keyed by construction)",
    expect: L.D5b,
    impl: () => ({
      ...real(),
      parseOverrides: (raw, knownLines) =>
        Array.isArray(raw)
          ? (Object.freeze(Object.fromEntries(raw.map((v, i) => [i, v]))) as RowOverrides)
          : parseRowOverrides(raw, knownLines),
    }),
  },
  {
    name: "R7 · TAKE_FILE replaces the tags instead of merging them",
    expect: L.D6,
    impl: () => withDecide((c, f, b, ov, run) => {
      const d = decide(c, f, b, ov, run);
      return d.kind === "update" && d.asked === "TAKE_FILE" && c.tags.length > 0 ? { ...d, patch: { ...d.patch, tags: [...c.tags] } } : d;
    }),
  },
  {
    name: "R8 · TAKE_FILE writes a blank file cell over the book's value",
    expect: L.D6,
    impl: () => withDecide((c, f, b, ov, run) => {
      const d = decide(c, f, b, ov, run);
      const book = f.book;
      if (book === null || d.kind === "create" || d.asked !== "TAKE_FILE") return d;
      if (d.kind === "keep" && d.reason !== "no_change") return d;
      const blanked: ImportPatch = {};
      for (const k of TEXT) if ((c[k] ?? "").trim() === "" && book[k] !== null) blanked[k] = "";
      if (Object.keys(blanked).length === 0) return d;
      const base = d.kind === "update" ? d : updateOf(c, book, d.asked);
      return { ...base, patch: { ...base.patch, ...blanked } };
    }),
  },
  {
    name: "R9 · FILL_BLANKS behaves as TAKE_FILE — a filled book value is overwritten",
    expect: L.D7,
    impl: () => withDecide((c, f, b, ov, run) => {
      if (effectiveChoice(c.line, b, ov) !== "FILL_BLANKS") return decide(c, f, b, ov, run);
      const d = decide(c, f, "TAKE_FILE", NO_OVERRIDES, run);
      return d.kind === "create" ? d : { ...d, asked: "FILL_BLANKS" };
    }),
  },
  {
    name: "R-D8 · values compared raw — a re-spaced or re-cased re-import reads as a change",
    expect: L.D8,
    impl: () => withDecide((c, f, b, ov, run) => {
      const d = decide(c, f, b, ov, run);
      const book = f.book;
      if (book === null || d.kind !== "keep" || d.reason !== "no_change") return d;
      const patch: ImportPatch = {};
      for (const k of TEXT) {
        const v = c[k];
        if (v !== null && v.trim() !== "" && v !== book[k] && (d.asked === "TAKE_FILE" || book[k] === null)) patch[k] = v;
      }
      return Object.keys(patch).length > 0 ? { ...updateOf(c, book, d.asked), patch } : d;
    }),
  },
  {
    name: "R-D8b · the merge has no cap — a contact passes 20 tags",
    expect: L.D8b,
    impl: () => ({
      ...real(),
      mergeTags: (book, file) => mergeTags(book, file, Number.MAX_SAFE_INTEGER),
      decide: (c, f, b, ov, run) => {
        const d = decide(c, f, b, ov, run);
        if (d.kind !== "update" || d.tagsNotAdded.length === 0) return d;
        return { ...d, patch: { ...d.patch, tags: [...(d.patch.tags ?? []), ...d.tagsNotAdded] }, tagsAdded: [...d.tagsAdded, ...d.tagsNotAdded], tagsNotAdded: [] };
      },
    }),
  },
  {
    name: "R10 · the same-run collapse removed — row 9 overwrites what row 3 created",
    expect: L.D9,
    impl: () => withDecide((c, f, b, ov, run) => decide(c, { ...f, repeatOf: null, book: f.book && { ...f.book, importId: null } }, b, ov, run)),
  },
  {
    name: "R24 · repeatOf ignored — the importId belt alone, so an in-book number twice in the file is written twice (the LAST row wins)",
    expect: L.D9,
    impl: () => withDecide((c, f, b, ov, run) => decide(c, { ...f, repeatOf: null }, b, ov, run)),
  },
  {
    name: "R11 · the label counted from U30's buckets (new → create, in book → update unless KEEP), not from decide()",
    expect: L.D11,
    impl: () => ({
      ...real(),
      plan: (input) => {
        const shipped = planImportRows(input);
        const bucketed = (ch: ImportChoice): ShownTally => {
          let create = 0;
          let update = 0;
          let keep = 0;
          for (const c of input.candidates) {
            const f = input.facts.get(c.msisdn);
            if (!f || f.book === null) create++;
            else if (ch === "KEEP") keep++;
            else update++;
          }
          return { create, update, keep, overwrites: update, keepBy: { chosen_keep: keep, suppressed: 0, same_run: 0, no_change: 0 } };
        };
        return { ...shipped, byChoice: { KEEP: bucketed("KEEP"), TAKE_FILE: bucketed("TAKE_FILE"), FILL_BLANKS: bucketed("FILL_BLANKS") } };
      },
    }),
  },
  {
    name: "R-D11b · a number with no facts is planned as a new number (the silent default)",
    expect: L.D11b,
    impl: () => ({
      ...real(),
      plan: (input) => {
        const filled = new Map(input.facts);
        for (const c of input.candidates) if (!filled.has(c.msisdn)) filled.set(c.msisdn, numberFacts());
        return planImportRows({ ...input, facts: filled });
      },
    }),
  },
  {
    name: "R-D12a · outcomeOf files a keep as a fail (OD40: nothing failed)",
    expect: L.D12,
    impl: () => ({ ...real(), outcomeOf: (d) => (d.kind === "keep" ? { outcome: "fail", reason: d.reason } : outcomeOf(d)) }),
  },
  {
    name: "R-D12b · changed_during_import moved to fail (U32 E9: never FAILED)",
    expect: L.D12,
    impl: () => ({ ...real(), outcomeOfReason: { ...IMPORT_OUTCOME_OF_REASON, changed_during_import: "fail" } }),
  },
  {
    name: "R12 · a second rule: another src file decides on \"TAKE_FILE\" itself",
    expect: L.D10,
    impl: () => ({
      ...real(),
      srcMentions: [...real().srcMentions, { path: "src/app/admin/contacts/planted-rule.ts", text: 'export const overwrites = (choice: string) => choice === "TAKE_FILE";' }],
    }),
  },
  {
    name: "R13 · previewFor spreads the whole decision for a create — consentWritable reaches the browser",
    expect: L.D14,
    impl: () => ({
      ...real(),
      previewFor: (c, f, run) => {
        const p = previewFor(c, f, run);
        return p.kind === "create" ? ({ ...decide(c, f, "KEEP", NO_OVERRIDES, run) } as unknown as ReturnType<typeof previewFor>) : p;
      },
    }),
  },
  {
    name: "R-D14b · previewFor shows the true reason for an erased row, and names its contact",
    expect: L.D14b,
    impl: () => ({
      ...real(),
      previewFor: (c, f, run) => {
        const d = decide(c, f, "KEEP", NO_OVERRIDES, run);
        if (d.kind === "keep" && d.reason === "erased") {
          return { line: c.line, kind: "keep", reason: "erased", contactId: d.contactId } as unknown as ReturnType<typeof previewFor>;
        }
        return previewFor(c, f, run);
      },
    }),
  },
  {
    name: "R15 · a consent alias ('ridhaa') added to a field's list",
    expect: L.D15,
    impl: () => ({ ...real(), fields: CONTACT_FIELDS.map((f) => (f.key === "notes" ? { ...f, aliases: [...f.aliases, "ridhaa"] } : f)) }),
  },
  {
    name: "R16 · the draft grows a key decide() does not handle (a consent column read from the file)",
    expect: L.D15,
    impl: () => ({ ...real(), draft: (cells, mapping) => ({ ...draftContactRow(cells, mapping), consent: "yes" }) as ContactDraft }),
  },
  {
    name: "R-D16 · import-decide imports the server store",
    expect: L.D16,
    impl: () => {
      const r = real();
      return { ...r, sources: { ...r.sources, decide: `import { db } from "@/lib/server/store";${LF}${r.sources.decide}` } };
    },
  },
  {
    name: "R-D1 · the default choice becomes TAKE_FILE",
    expect: L.D1,
    impl: () => ({ ...real(), defaultChoice: "TAKE_FILE" }),
  },
  {
    name: "R-D5c · an override beats the stop list",
    expect: L.D5c,
    impl: () => withDecide((c, f, b, ov, run) =>
      decide(c, hasOwn(ov, c.line) && f.suppressed && f.book !== null && f.book.sourceRef !== ERASURE_EVIDENCE ? { ...f, suppressed: false } : f, b, ov, run)),
  },
];

export const decideSection: ImportSection<DecideImpl> = {
  name: "decide",
  owner: "U31-A",
  real,
  run,
  plants: PLANTS,
};

/* ══ TODO — U31-B and U32, landing with the writer (X3). NOT faked here. ═════════════════════════════
 *
 * ⛔ Each needs the store and the commit path, which this pure section must not import:
 *  · the spec's D1/D13 apply half — a keep is counted skipped, never failed, in commitBatch's result;
 *  · D2/D3/D4 EXECUTED — a real suppression, a real eraseMarketingFor, a real WITHDRAWN ledger row, then a commit
 *    under every choice: the row unchanged (updatedAt not moved), the ledger's latest still WITHDRAWN, its length
 *    unchanged, the cache only ever written by mirrorContactCache;
 *  · D2d/D4f source rules on the server loader — `suppressed` from `db.suppression.find(`, never `.suppressedAt`;
 *    no messagingConsent.create, suppression.create or suppression.lift in the import's server files;
 *  · D9/D11 EXECUTED across two commit batches with the same run id, and the plan against the committed counts;
 *  · D12 the conditional write — a stale updatedAt, or an erasure between read and write, refuses the update, and
 *    the batch re-decides once (X3); dal-parity §24's members carry the sourceRef null arm (the Prisma `not` trap).
 */
