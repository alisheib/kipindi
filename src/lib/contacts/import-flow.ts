/**
 * THE IMPORT'S ONE CONTRACT — what the import dialog (the browser) and its server actions say to each other.
 *                                                                     (S15 · C3–C5, 2026-10-09 · docs/CONTACTS-SCREEN-PLAN.md §4)
 *
 * ⭐ WHY ONE FILE. The dialog (`src/app/admin/contacts/import/*`) and the server (`import-actions.ts` over
 * `src/lib/server/contacts/*`) are built side by side; every request and every answer between them is a type HERE, so
 * neither side can drift from the other without the compiler saying so. The staging half (open, stage, view, discard)
 * already shipped as U29b (`import-staging.ts`); this file names its browser face and adds the rest of the flow:
 * the check (pre-flight), the changes an import would make to contacts already in the book, the start, the commit
 * loop, its stop and resume, the failures list, and the result.
 *
 * ⭐ THE FLOW, as the officer meets it (plan §4.2):
 *   choose a file (or paste) → read in the browser (an Excel file is read by the server) → the columns → staged on the
 *   server in batches (the bar counts rows STAGED) → THE CHECK: new · already in the book · repeated in the file · not a
 *   mobile number · could not be read (nothing written yet) → numbers already in the book: keep / take the file's
 *   version / fill blanks only, with the changes listed and per-row exceptions → the list the contacts go on → import
 *   (the bar counts rows DONE, as the server reports them) → the result.
 *
 * ⛔ D19 BY SHAPE (OD65–OD67, plan §4 of CONTACTS-SCREEN-PLAN): there is NO "has a 50pick account" bucket for any role
 * — every client is already a contact (`08add760`), so a player's number reads "already in the book" like any other —
 * and no answer here carries a contact id, a consent fact, a stop per row, or an erasure (X22: an erased number reads
 * as the ordinary contact it is disguised as). A kept row's reasons are shown split only to a viewer who may read
 * numbers (`KeptSplit` is null otherwise — OD54).
 * ⛔ NO PHONE NUMBER LEAVES THE SERVER WHOLE: every number in an answer is `maskPhone`'s `+255••••NN`.
 * ⛔ PURE AND CLIENT-SAFE: types, constants and pure helpers only — no `@/lib/server` import, no React, no directive
 * (`test:client-graph-safe` pins it).
 */
import type { ColumnMapping } from "./contact-fields";
import type { ContactsFileFormat, ParsedContactsFile } from "./parsed-file";
import type { ImportChoice, ShownTally, DecisionPreview } from "./import-decide";

/* ══ THE RUN, as the browser sees it ════════════════════════════════════════════════════════════ */

/** Mirrors `ContactImportStatus` (schema.prisma). */
export type ImportRunStatus = "STAGING" | "STAGED" | "COMMITTING" | "PAUSED" | "DONE" | "CANCELLED";

/** The run's totals, COUNTED FROM ITS ROWS by the server (OD26) — never a client sum. */
export type ImportRunTotals = {
  staged: number;
  unreadable: number;
  pending: number;
  create: number;
  update: number;
  keep: number;
  fail: number;
};

/** What the officer chose at the start, frozen on the run (shown on a resumed or finished run). */
export type ImportRunDecision = {
  choice: ImportChoice;
  /** How many file rows were given their own choice. */
  exceptions: number;
  /** The list the contacts go on, by name — null when none was chosen. */
  listName: string | null;
};

/**
 * ⭐ THE RUN. `startedBy` is a display name, or "you" — X18: the screen says who started a run it adopts.
 * `committedThrough` is the server's cursor: THE ONLY number the import bar may show (L1/L2 — never a timer, never a
 * client increment).
 */
export type ImportRunView = {
  id: string;
  status: ImportRunStatus;
  format: ContactsFileFormat;
  fileName: string | null;
  fileDigest: string;
  mapping: ColumnMapping;
  /** The browser's figures at open — "read from your file". */
  totalRows: number;
  unreadable: number;
  stagedThrough: number;
  committedThrough: number;
  /** While STAGING: the ordinal the next batch must start at. Null otherwise. */
  nextFrom: number | null;
  totals: ImportRunTotals;
  startedBy: string;
  mine: boolean;
  createdAt: string;
  updatedAt: string;
  pausedAt: string | null;
  /** S15 (the server builder) · named as `startedBy` is — "you", the officer's display name, or "another officer" —
   *  never an id. Null when the run was never paused. */
  pausedBy: string | null;
  finishedAt: string | null;
  decision: ImportRunDecision | null;
};

/* ══ ONE ANSWER SHAPE FOR EVERY ACTION ══════════════════════════════════════════════════════════ */

/**
 * Every refusal the import can give. Staging's own (U29b `StagingRefusalReason`) are passed through by name; the rest
 * are the check's, the start's and the commit's. Each has ONE sentence in `IMPORT_REFUSAL_SENTENCES` (the server
 * sends it; the dialog shows it verbatim, never a code).
 */
export type ImportRefusalReason =
  // staging (U29b, verbatim)
  | "bad_request" | "bad_format" | "bad_digest" | "bad_counts" | "bad_mapping" | "no_phone_column" | "empty_file"
  | "too_many_rows" | "unfinished_run" | "read_differently" | "not_found" | "not_yours" | "not_staging"
  | "different_file" | "out_of_order" | "already_staged" | "batch_too_many_rows" | "batch_too_large" | "bad_rows"
  | "too_many_rows_for_run" | "committing" | "finished" | "superseded"
  // the gate in front of every action
  | "forbidden" | "rate_limited" | "server_error"
  // the Excel reader (U27b's refusals arrive as their own sentence)
  | "xlsx_refused" | "xlsx_busy"
  // the check and the changes list
  | "not_staged" | "too_slow"
  // the start
  | "bad_choice" | "bad_exceptions" | "bad_list" | "list_name_taken" | "list_gone" | "already_started" | "check_again"
  // the commit
  | "paused" | "cancelled" | "done" | "moved" | "busy";

export type ImportRefusal = {
  ok: false;
  reason: ImportRefusalReason;
  /** One whole sentence, with the next step. Never a code, never a number from the file, never a file name. */
  message: string;
  /** The run as it stands, when the caller may see it — the screen re-renders from it (a resume, a stop by another). */
  view: ImportRunView | null;
  /** For `rate_limited` and `busy`: when to ask again. */
  retryAfterSec?: number;
};

export type ImportAnswer<T> = ({ ok: true } & T) | ImportRefusal;

/* ══ 1 · OPEN, STAGE, VIEW, DISCARD (U29b's core, its browser face) ═══════════════════════════════ */

/** The open request — exactly what `openContactImport` parses. `headers` is the header row the mapping was made
 *  against (synthetic "Column 1…N" for a headerless file or a vCard's own columns). */
export type OpenImportInput = {
  format: ContactsFileFormat;
  fileName: string | null;
  /** sha-256 of the file's bytes, 64 lower-case hex (a paste: of its UTF-8 text). */
  fileDigest: string;
  headers: string[];
  mapping: ColumnMapping;
  /** Records to stage (header rows excluded) — rows plus unreadable records. */
  totalRows: number;
  unreadable: number;
};
export type OpenImportResult = ImportAnswer<{ adopted: boolean; view: ImportRunView }>;

/** One staging batch: rows `from` … in file order; each is `{ line, cells }` or `{ line, readError }`. */
export type StageImportInput = {
  importId: string;
  fileDigest: string;
  from: number;
  rows: Array<{ line: number; cells: string[] } | { line: number; readError: string }>;
};
export type StageImportResult = ImportAnswer<{ view: ImportRunView }>;

/** The officer's open run (no id) — THE resume read when the dialog opens — or one run by id. */
export type ImportViewResult = ImportAnswer<{ view: ImportRunView | null }>;

export type DiscardImportResult = ImportAnswer<{ rowsDeleted: number }>;

/** An Excel file, read on the server (U27b): base64 of at most `XLSX_MAX_BYTES` raw bytes. */
export type ReadXlsxInput = { base64: string; fileName: string };
export type ReadXlsxResult = ImportAnswer<{ file: ParsedContactsFile }>;

/* ══ 2 · THE CHECK (pre-flight) — writes nothing ═════════════════════════════════════════════════ */

/** The five buckets. ⭐ They add up to the rows staged, exactly (`assertBucketsAdd`). */
export const PREFLIGHT_BUCKETS = ["new", "inBook", "repeated", "invalid", "unreadable"] as const;
export type PreflightBucket = (typeof PREFLIGHT_BUCKETS)[number];

/** A list in the check is capped at this many rows, with the true total beside it ("Showing 100 of 2,431"). */
export const PREFLIGHT_LIST_CAP = 100;

export type PreflightView = {
  runId: string;
  /** Rows staged — the sum of the buckets. */
  rows: number;
  counts: Readonly<Record<PreflightBucket, number>>;
  /** Invalid rows: the file row and the ONE sentence (parseTzNumber's, a field problem's, or the sample-sheet one). */
  invalid: { total: number; rows: Array<{ line: number; sentence: string }> };
  unreadable: { total: number; rows: Array<{ line: number; sentence: string }> };
  /** "Row 9 repeats row 4 · +255••••01" — the FIRST row wins (OD33). */
  repeated: { total: number; rows: Array<{ line: number; firstLine: number; masked: string }> };
  /**
   * ⭐ THE APPLY LABEL'S NUMBERS for each bulk choice — decide()'s own decisions over the whole run, tallied by their
   * `shown` reasons (X22). The browser adjusts the chosen one for per-row exceptions with `adjustTally` and the
   * previews of the rows it changed; it never computes a count any other way.
   */
  byChoice: Readonly<Record<ImportChoice, ShownTally>>;
  /** How many in-book rows WOULD CHANGE under each choice — the changes list's total, per choice. */
  changing: Readonly<Record<ImportChoice, number>>;
  /** When the book was read. The check is advisory: the commit decides again at write time. */
  checkedAt: string;
};
export type PreflightResult = ImportAnswer<{ preflight: PreflightView; view: ImportRunView }>;

/** The five counts add up to `rows`, or the check is not shown (never a zero, never a guess). */
export function bucketsAdd(p: Pick<PreflightView, "rows" | "counts">): boolean {
  let sum = 0;
  for (const b of PREFLIGHT_BUCKETS) {
    const n = p.counts[b];
    if (!Number.isSafeInteger(n) || n < 0) return false;
    sum += n;
  }
  return sum === p.rows;
}

/* ══ 3 · THE CHANGES — in-book rows that a choice would change, a page at a time ══════════════════ */

/** One page of in-book rows whose values differ from the file, in FILE ORDER. Each row carries its preview under all
 *  three choices (`DecisionPreview` of kind "inBook"), so a per-row exception moves the label with `adjustTally` and no
 *  request. The masked number identifies the row to the officer beside its file row. */
export type ChangesPageRow = {
  line: number;
  masked: string;
  preview: Extract<DecisionPreview, { kind: "inBook" }>;
};
/**
 * ⚠️ A PAGE IS BOUNDED BY THE WORK BEHIND IT, NOT ONLY BY ITS ROWS (S15, the server builder): one request walks at most
 * a fixed number of staged rows, so a page can hold FEWER than `CHANGES_PAGE_ROWS` rows — even none — while
 * `nextAfterLine` is not null. Ask again from `nextAfterLine` until it is null; only null means the list is complete.
 */
export type ChangesPage = {
  rows: ChangesPageRow[];
  /** The line to ask after for the next page, or null at the end. */
  nextAfterLine: number | null;
};
/** Rows per changes page. */
export const CHANGES_PAGE_ROWS = 50;
export type ChangesInput = { runId: string; afterLine: number };
export type ChangesResult = ImportAnswer<{ page: ChangesPage }>;

/* ══ 4 · THE START — the decision frozen on the run ═════════════════════════════════════════════ */

/** Where the imported contacts go. A new list is created by the start itself (its name unique, X: `list_name_taken`). */
export type ImportListChoice =
  | { kind: "none" }
  | { kind: "existing"; listId: string }
  | { kind: "new"; name: string };

export type StartImportInput = {
  runId: string;
  choice: ImportChoice;
  /** Per-row exceptions keyed by the FILE ROW (never an array index); only in-book rows that change may carry one. */
  exceptions: Record<string, ImportChoice>;
  list: ImportListChoice;
  /**
   * The label the officer pressed — `adjustTally`'s create/update/keep. The server decides again; when the book moved
   * since the check and its count differs, the start is refused `check_again` (the officer sees the new numbers first).
   */
  expected: { create: number; update: number; keep: number };
  /**
   * ⭐ S15 (the server builder) · the check this start was pressed from — `PreflightView.checkedAt`, posted back as it
   * came. The check writes nothing on the run (it is advisory), so the start can only know how old the officer's numbers
   * are from this: older than 30 minutes, unreadable or in the future, and the start is refused `check_again`. The counts
   * in `expected` are re-decided on the server either way — this only stops a start from a screen left open for hours.
   */
  checkedAt: string;
};
export type StartImportResult = ImportAnswer<{ view: ImportRunView }>;

/**
 * The lists an import can add to (the Lists card's lists), by name, A to Z. `members` is the Lists card's own figure — the
 * members whose book row is live and linked to no account (`ListBasisCoverage.live`). `covered`: the list's NEWEST basis
 * recording on the Lists card is in force (recorded, not revoked). ⚠️ Members an import ADDS join after that recording,
 * so they are covered only once the basis is recorded again — the result's `list.covered` says whether that is owed.
 */
export type ImportListOption = { id: string; name: string; members: number; covered: boolean };
export type ImportListsResult = ImportAnswer<{ lists: ImportListOption[] }>;

/* ══ 5 · THE COMMIT LOOP ════════════════════════════════════════════════════════════════════════ */

/** One step: the server settles the next rows after `fromCursor` (ONE transaction, compare-and-set on the cursor). */
export type CommitStepInput = { runId: string; fromCursor: number };
export type CommitStepResult = ImportAnswer<{
  /** "advanced": rows settled · "moved": another tab or officer had already settled them (nothing counted twice) ·
   *  "done": the run finished on this step. */
  kind: "advanced" | "moved" | "done";
  view: ImportRunView;
}>;

/** Pause / resume / cancel. Cancel: before the start it discards the run; after it, the rows already written STAY
 *  (the result says how many) and the rest are left unimported. */
export type RunActInput = { runId: string };
export type RunActResult = ImportAnswer<{ view: ImportRunView }>;

/** The rows that could not be imported, a page at a time, by file row, with the sentence (never the raw value). */
export const FAILURES_PAGE_ROWS = 50;
export type FailuresInput = { runId: string; afterLine: number };
export type FailuresResult = ImportAnswer<{ rows: Array<{ line: number; sentence: string }>; total: number; nextAfterLine: number | null }>;

/* ══ 6 · THE RESULT ══════════════════════════════════════════════════════════════════════════════ */

/**
 * The kept rows split by reason — ⛔ ONLY for a viewer who may read numbers (OD54); null otherwise, and the result then
 * says "kept as they were" with one number.
 */
export type KeptSplit = { inBookUnchanged: number; onStopList: number; repeated: number; chosenKeep: number } | null;

export type ImportResultView = {
  view: ImportRunView;
  kept: KeptSplit;
  /** The list the contacts were added to, and whether that list is covered for offers (its basis and 18+ recorded on
   *  the Lists card). Null when no list was chosen — or when the list has since been deleted.
   *  ⭐ `covered` is true only when EVERY live member of the list is covered by its newest recording (the Lists card's
   *  "covers N of N", N above 0): members the import added joined after any earlier recording, so it reads false until
   *  the basis is recorded again on the Lists card. */
  list: { id: string; name: string; covered: boolean } | null;
};
export type ImportResultResult = ImportAnswer<{ result: ImportResultView }>;

/* ══ THE SENTENCES — every refusal, one whole sentence with the next step ═════════════════════════ */

/**
 * ⭐ ONE SENTENCE PER REFUSAL — complete by construction (a new reason without one fails to compile). Staging's own
 * sentences live in `STAGING_SENTENCES` (import-staging.ts) and are passed through by the server; the ones here are the
 * rest. ⛔ None quotes a cell, a number, a name or a file name.
 */
export const IMPORT_REFUSAL_SENTENCES: Readonly<Record<Exclude<ImportRefusalReason,
  | "bad_request" | "bad_format" | "bad_digest" | "bad_counts" | "bad_mapping" | "no_phone_column" | "empty_file"
  | "too_many_rows" | "unfinished_run" | "read_differently" | "not_found" | "not_yours" | "not_staging"
  | "different_file" | "out_of_order" | "already_staged" | "batch_too_many_rows" | "batch_too_large" | "bad_rows"
  | "too_many_rows_for_run" | "committing" | "finished" | "superseded" | "xlsx_refused">, string>> = {
  forbidden: "Your role can't import contacts. Ask an administrator to give you contact rights.",
  rate_limited: "You've checked a lot of files in a short time. Wait a moment, then try again.",
  server_error: "Something went wrong on our side. Nothing was lost — try again in a moment.",
  xlsx_busy: "Another Excel file is being read right now. Try again in a few seconds.",
  not_staged: "This file hasn't finished uploading yet. Let it finish, then check it.",
  too_slow: "Checking this file took too long. Nothing was written — try again, or split the file in two.",
  bad_choice: "Choose what to do with numbers already in the book.",
  bad_exceptions: "Some row choices don't match this file any more. Check the file again.",
  bad_list: "Choose a list, or choose not to add these contacts to one.",
  list_name_taken: "A list with this name already exists. Choose it from your lists, or pick another name.",
  list_gone: "The list you chose no longer exists. Choose another list.",
  already_started: "This import has already started. Its progress is shown here.",
  check_again: "The contact book changed since this file was checked. Look at the new numbers, then import.",
  paused: "This import is paused. Resume it to carry on.",
  cancelled: "This import was cancelled. Rows already written stay in the book.",
  done: "This import has finished.",
  moved: "Another window moved this import on. Showing where it is now.",
  busy: "The platform is busy right now — bets come first. Trying again shortly.",
};
