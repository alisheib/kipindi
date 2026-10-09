/**
 * U29b · IMPORT STAGING ON THE SERVER — a contacts file's records, posted by the browser batch by batch, held as a run
 * that survives a closed tab, a reload and a redeploy.     (S10, 2026-10-02 · decisions X2 · X18 · X19 · X20 · X23 · X28 ·
 * X29; the plan's OD26 · OD29 · OD30)
 *
 * ⭐ WHAT IT IS FOR. OD29 parses a CSV, a vCard or a paste in the BROWSER (an Excel file comes back from U27b's reader in
 * the same shape), and the browser posts the records here — at most 2,000 rows and 200 KiB a call (`import-limits.ts`).
 * The run row says how far staging has reached, so a closed tab, a reload or a redeploy resumes at the server's
 * `stagedThrough + 1`: the browser reads the same file again, and the same digest ADOPTS the run (`openContactImport`).
 * The pre-flight (U30) and the commit (U32) read the staged rows; ⛔ this module writes no contact.
 *
 * ⛔ THE SERVER DERIVES, THE BROWSER ONLY POSTS. Every record is drafted HERE, from its cells, by U28's `draftContactRow`
 * with the run's STORED mapping, and its key comes from the drafted phone through `firstMobileIn` (C3b · G3: the whole
 * cell when `parseTzNumber` reads it as one number, else the FIRST Tanzanian mobile among the numbers a cell holds —
 * `src/lib/contacts/phone-cell.ts`, the one rule) — a posted key, verdict or outcome is never read (`stagedRowFrom`
 * builds a new row from named keys alone). A field over its limit is REPORTED,
 * never clipped (X20): the row's `problems` name the field and U30 counts the row invalid. Each record the reader could
 * not read is staged too, with its one sentence (X19), so a record is never lost between "read" and "shown".
 * ⛔ NO STORED COUNTER (OD26): every total is counted from the rows (`db.contactImport.totals`).
 * ⭐ OWNERSHIP (X18): a run is its creator's, and an ADMIN — read off the STORED role — may adopt any run; the view
 * carries `createdBy` so the screen can name who started it. Anyone else is refused `not_yours` and is shown nothing.
 * ⭐ THE SWEEP: a STAGING or STAGED run idle 14 days is cancelled and its unsettled rows deleted (X29); since S15-12 (the
 * review round, 2026-10-09) a COMMITTING or PAUSED run idle 14 days is ended the same way by a SECOND rule — the contacts
 * it already wrote stay in the book; and a finished run goes 90 days after `finishedAt`, its rows with it.
 * `runRetentionPass` calls it nightly (docs/DATA-RETENTION.md, "Contact import staging").
 * ⛔ AUDIT under `contacts.import.*` (X23), every refusal as `contacts.import.stage_refused` — ids, counts and reasons:
 * never a phone number, a name, a cell or the file's name.
 *
 * ⛔ SERVER-ONLY, AND NO DIRECTIVE. Its server actions ship with their first caller, U30's `import-actions.ts` (C24,
 * X16) — alone they would red `test:orphan-actions`. It imports nothing that sends, and writes no book row, no ledger
 * row and no stop (OD10).
 *
 * Guard: `test:contacts-staging` (driven on the memory twin, in-process red) · `test:dal-parity` §24 ·
 * `test:contacts-staging-db` (the redeploy, a fresh process on PostgreSQL 18.3).
 */
import { randomBytes } from "node:crypto";
import { db, CONTACT_IMPORT_ROW_PAGE_MAX } from "@/lib/server/store";
import type { ContactImportStatus, ContactImportTotals, StoredContactImport, StoredContactImportRow } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import { firstMobileIn } from "@/lib/contacts/phone-cell";
import { CONTACT_FIELDS, charCount, draftContactRow, validateMapping } from "@/lib/contacts/contact-fields";
import type { ColumnMapping } from "@/lib/contacts/contact-fields";
import { CONTACTS_FILE_FORMATS } from "@/lib/contacts/parsed-file";
import type { ContactsFileFormat } from "@/lib/contacts/parsed-file";
import { IMPORT_MAX_ROWS, STAGE_BATCH_MAX_BYTES, STAGE_BATCH_MAX_ROWS, stageBatchBytesUpTo } from "@/lib/contacts/import-limits";

/* ═══ THE PERIODS AND THE SHAPES ═══════════════════════════════════════════════════════════════════════ */

/** A STAGING or STAGED run untouched this long is cancelled by the sweep (X29). */
export const CONTACT_IMPORT_IDLE_DAYS = 14;
/** A finished run (DONE or CANCELLED) is deleted this long after `finishedAt`, its rows with it. */
export const CONTACT_IMPORT_KEEP_DAYS = 90;
/** ⛔ X29 · the statuses the FIRST rule of the idle sweep cancels — a run never started (never PAUSED, never COMMITTING). */
export const SWEEPABLE_IMPORT_STATUSES: readonly ContactImportStatus[] = ["STAGING", "STAGED"];
/** S15-12 (the review round, 2026-10-09) · a STARTED commit — COMMITTING or PAUSED — untouched this long is ended by the
 *  sweep's SECOND rule: CANCELLED, its unsettled staged rows deleted, the contacts it already wrote kept. Its own constant:
 *  X29's period is for a file never imported; this one for an import nobody carried on. */
export const CONTACT_IMPORT_STUCK_DAYS = 14;
/** S15-12 · the statuses the sweep's second rule ends — a commit started and left. */
export const STUCK_IMPORT_STATUSES: readonly ContactImportStatus[] = ["COMMITTING", "PAUSED"];

/** A run id as this module mints them: `ci_` and twenty letters. Anything else is not a run, without asking the store. */
const IMPORT_ID = /^ci_[a-z]{20}$/;
/** ⭐ S15 · the same shape test for the check and the commit (`import-check.ts`, `import-commit.ts`): one run-id rule. */
export function isImportRunId(id: unknown): id is string {
  return typeof id === "string" && IMPORT_ID.test(id);
}
/** A sha-256, as the browser writes it: 64 lower-case hex. */
const DIGEST = /^[0-9a-f]{64}$/;
const FILE_NAME_MAX = 255;
const READ_ERROR_MAX = 300;
/** Excel's widest sheet: no row or header row of a real file is wider. */
const COLUMNS_MAX = 16_384;
const SWEEP_BATCH = 100;
const SWEEP_MAX_BATCHES = 50;
const DAY_MS = 24 * 60 * 60 * 1000;
/* Module-level, never per call. The `g` ones are used only with `replace` and `match`, which reset them. */
const INVISIBLE = /[\p{Cc}\p{Cf}]/gu;
const SPACES = /\s+/g;
const DIGIT = /\p{Nd}/gu;

/** 200000 → "200,000", without a locale (the sentence is the same on every server). */
function groupThousands(n: number): string {
  const s = String(Math.trunc(n));
  let out = "";
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) out += ",";
    out += s[i];
  }
  return out;
}

/** Every sentence an officer can be shown — whole sentences, none quoting a cell, a number or a file name. */
export const STAGING_SENTENCES = {
  badRequest: "This upload could not be read. Choose the file again.",
  badFormat: "This isn't a kind of file the importer reads.",
  badDigest: "The file's fingerprint did not arrive in one piece. Choose the file again.",
  badCounts: "The file's row counts do not add up. Choose the file again.",
  emptyFile: "This file has no rows to import.",
  tooManyRows: `This file has more than ${groupThousands(IMPORT_MAX_ROWS)} rows — the most one import can take. Split it into files of at most ${groupThousands(IMPORT_MAX_ROWS)} rows and import each one.`,
  unfinishedRun: "You have an import that isn't finished. Finish it or discard it before you start another.",
  readDifferently: "This file reads differently now than when its import began. Discard the unfinished import and start again.",
  notFound: "This import no longer exists. Start again from the file.",
  notYours: "This import was started by another officer.",
  notStaging: "This import has already read its whole file.",
  differentFile: "These rows come from a different file. Choose the file this import was started with.",
  outOfOrder: "These rows arrived out of order. Carry on from the row the import asks for next.",
  alreadyStaged: "These rows are already staged. Carry on from the row the import asks for next.",
  batchTooManyRows: `One upload can carry at most ${groupThousands(STAGE_BATCH_MAX_ROWS)} rows.`,
  batchTooLarge: `One upload can carry at most ${STAGE_BATCH_MAX_BYTES / 1024} KB.`,
  badRows: "Some rows in this upload could not be read. Choose the file again.",
  tooManyRowsForRun: "These rows go past the end of the file this import was started with.",
  committing: "This import has started writing contacts. Stop it from the import screen instead.",
  superseded: "This file is already being imported in another tab. Carry on there, or reload this page to continue it here.",
  finished: "This import has already finished.",
  readErrorWithheld: "This record could not be read.",
} as const;

/** What the screen is told about a run. ⭐ The totals are the SERVER's count of its rows (OD26); `totalRows` and
 *  `unreadable` are the browser's figures — "read from your file". */
export type ContactImportView = {
  id: string;
  status: ContactImportStatus;
  format: ContactsFileFormat;
  fileName: string | null;
  fileDigest: string;
  mapping: ColumnMapping;
  totalRows: number;
  unreadable: number;
  stagedThrough: number;
  committedThrough: number;
  /** The ordinal the next batch must start at while staging — `stagedThrough + 1` — and null once staging is over. */
  nextFrom: number | null;
  totals: ContactImportTotals;
  /** Who started it (X18: the screen names them when it is not the viewer). */
  createdBy: string;
  mine: boolean;
  createdAt: string;
  updatedAt: string;
  pausedAt: string | null;
  pausedBy: string | null;
  finishedAt: string | null;
};

export type StagingRefusalReason =
  | "bad_request" | "bad_format" | "bad_digest" | "bad_counts" | "bad_mapping" | "no_phone_column" | "empty_file"
  | "too_many_rows" | "unfinished_run" | "read_differently" | "not_found" | "not_yours" | "not_staging"
  | "different_file" | "out_of_order" | "already_staged" | "batch_too_many_rows" | "batch_too_large" | "bad_rows"
  | "too_many_rows_for_run" | "committing" | "finished" | "superseded";

/** A refusal: the reason, ONE sentence, and the run as it stands when the caller may see it (never to a stranger). */
export type StagingRefusal = { ok: false; reason: StagingRefusalReason; message: string; view: ContactImportView | null };
export type OpenContactImportResult = { ok: true; adopted: boolean; view: ContactImportView } | StagingRefusal;
export type StageContactRowsResult = { ok: true; view: ContactImportView } | StagingRefusal;
export type DiscardContactImportResult = { ok: true; rowsDeleted: number } | StagingRefusal;
export type ContactImportSweep = { cancelled: number; rowsDeleted: number; runsPurged: number };

/** The run a row is drafted against: its id and its STORED mapping. */
export type StagingRunContext = { id: string; mapping: ColumnMapping };

/* ═══ THE ONE ROW BUILDER ══════════════════════════════════════════════════════════════════════════════ */

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
/** ⛔ A line, an ordinal and a cursor are Postgres INTEGERs (review F2): past 2,147,483,647 Prisma throws — and its
 *  error can echo the batch into the server log — so a larger one is refused here, never sent to the database. */
const INT4_MAX = 2_147_483_647;
const isLine = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 1 && v <= INT4_MAX;
const isCount = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const owns = (o: Record<string, unknown>, key: string): boolean => Object.prototype.hasOwnProperty.call(o, key);

/**
 * A reader's sentence about a record, as it may be stored: invisible and control characters out, spaces collapsed,
 * bounded — and ⛔ one holding seven or more digits is WITHHELD, replaced by a plain sentence: a staged row's reason is
 * never found by a number, so a number must never ride into one. Null for an empty sentence (the record is malformed).
 */
function cleanReadError(raw: string): string | null {
  const text = raw.toWellFormed().replace(INVISIBLE, " ").replace(SPACES, " ").trim();
  if (text === "") return null;
  if ((text.match(DIGIT) ?? []).length >= 7) return STAGING_SENTENCES.readErrorWithheld;
  return charCount(text) <= READ_ERROR_MAX ? text : `${Array.from(text).slice(0, READ_ERROR_MAX - 1).join("")}…`;
}

/**
 * ⭐ THE ONE ROW BUILDER — a posted record to the row staged for it, built NEW from named keys (`line`, then `cells` or
 * `readError`, exactly one): whatever else a request carries — a key, a verdict, an outcome — is never read. A readable
 * record is drafted by U28's `draftContactRow` with the run's STORED mapping, every field kept whole and every
 * over-limit or malformed one REPORTED in `problems` (X20); its key is set only for a sendable mobile number — the
 * phone cell's, or (C3b · G3) the FIRST Tanzanian mobile among the numbers the cell holds (`firstMobileIn`), while
 * `rawPhone` keeps the whole cell. An unreadable record keeps its sentence, cleaned. Null for a record of neither shape.
 */
/**
 * ⛔ ONE BAD BYTE MUST NEVER WEDGE A RUN (review F2). Postgres text cannot hold NUL (0x00) and refuses the whole batch
 * over one (22021 — not a duplicate, so the batch rolls back and every resume re-posts it and fails again), and a lone
 * surrogate is no character at all. A vCard's quoted-printable `=00`, a CSV whose NUL sits past the binary sniff, a
 * paste: each could put one in a phone, email or tag cell. Both are read out of EVERY cell before it is drafted.
 */
const NUL = String.fromCharCode(0);
export function storableCell(cell: string): string {
  return (cell.includes(NUL) ? cell.split(NUL).join("") : cell).toWellFormed();
}

export function stagedRowFrom(raw: unknown, ordinal: number, run: StagingRunContext, at: string): StoredContactImportRow | null {
  if (!isRecord(raw)) return null;
  const line = raw.line;
  if (!isLine(line)) return null;
  const hasCells = owns(raw, "cells");
  if (hasCells === owns(raw, "readError")) return null;
  if (!hasCells) {
    const posted = raw.readError;
    const readError = typeof posted === "string" ? cleanReadError(posted) : null;
    if (readError === null) return null;
    return {
      importId: run.id, ordinal, line, rawPhone: "", msisdn: null, displayName: null, email: null, tags: [],
      notes: null, problems: [], readError, outcome: null, outcomeReason: null, stagedAt: at,
    };
  }
  const cells = raw.cells;
  if (!Array.isArray(cells) || cells.length > COLUMNS_MAX || !cells.every((c) => typeof c === "string")) return null;
  const draft = draftContactRow((cells as string[]).map(storableCell), run.mapping);
  // ⭐ C3b · G3 · ONE number per person: the cell's own, or the first Tanzanian mobile among the numbers it holds.
  const mobile = firstMobileIn(draft.rawPhone);
  return {
    importId: run.id,
    ordinal,
    line,
    rawPhone: draft.rawPhone,
    msisdn: mobile === null ? null : mobile.number.msisdn,
    displayName: draft.displayName,
    email: draft.email,
    tags: [...draft.tags],
    notes: draft.notes,
    problems: draft.problems.map((p) => ({ field: p.field, sentence: p.sentence })),
    readError: null,
    outcome: null,
    outcomeReason: null,
    stagedAt: at,
  };
}

/* ═══ THE DEPENDENCIES — swappable for the suite's in-process red plants; production never passes them ═══════════ */

export type ImportStagingDeps = {
  /** ⭐ The ONE row builder (`stagedRowFrom`). */
  rowFrom: (raw: unknown, ordinal: number, run: StagingRunContext, at: string) => StoredContactImportRow | null;
  /** Are these one file? The digests, compared exactly: "the same digest adopts". */
  sameFile: (a: string, b: string) => boolean;
  /** Is this file READ the same way? The mappings, compared as sorted entries — Postgres' JSONB orders a mapping's keys
   *  its own way, so never by text (review F3). */
  sameMapping: (a: ColumnMapping, b: ColumnMapping) => boolean;
  /** The batch's size, measured WITH A STOP at the cap (review F9) — never the whole batch built as one string first. */
  measureBatch: (rows: readonly unknown[], cap: number) => number;
  maxBatchRows: number;
  maxBatchBytes: number;
  /** ⛔ X29 · what the idle sweep's first rule may cancel. */
  sweepable: readonly ContactImportStatus[];
  /** S15-12 · what the sweep's second rule ends, and after how many idle days. */
  stuck: readonly ContactImportStatus[];
  stuckDays: number;
  /** An ADMIN may adopt any run (X18) — read off the STORED role, never a posted one. */
  isAdmin: (userId: string) => Promise<boolean>;
  audit: typeof audit;
  now: () => Date;
  newRunId: () => string;
};

export const IMPORT_STAGING_DEPS: ImportStagingDeps = {
  rowFrom: stagedRowFrom,
  sameFile: (a, b) => a === b,
  sameMapping: (a, b) => mappingKey(a) === mappingKey(b),
  measureBatch: stageBatchBytesUpTo,
  maxBatchRows: STAGE_BATCH_MAX_ROWS,
  maxBatchBytes: STAGE_BATCH_MAX_BYTES,
  sweepable: SWEEPABLE_IMPORT_STATUSES,
  stuck: STUCK_IMPORT_STATUSES,
  stuckDays: CONTACT_IMPORT_STUCK_DAYS,
  isAdmin: async (userId) => (await db.user.findById(userId))?.role === "ADMIN",
  audit,
  now: () => new Date(),
  // Twenty letters: a run id rides in audit rows and in the book's `sourceRef`, and must never hold a digit run.
  newRunId: () => `ci_${Array.from(randomBytes(20), (b) => String.fromCharCode(97 + (b % 26))).join("")}`,
};

/* ═══ THE PIECES ═══════════════════════════════════════════════════════════════════════════════════════ */

/** A mapping as sorted [field, column] entries — the one comparison of two mappings (`sameMapping`). */
function mappingKey(m: ColumnMapping): string {
  return JSON.stringify(Object.entries(m).filter(([, v]) => typeof v === "number").sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

const refusal = (reason: StagingRefusalReason, message: string, view: ContactImportView | null = null): StagingRefusal =>
  ({ ok: false, reason, message, view });

/** ⛔ The refusal's audit row: ids, counts and the reason — never a number, a name, a cell or the file's name (X23). */
async function auditRefusal(
  deps: ImportStagingDeps, officerId: string, importId: string | null, reason: StagingRefusalReason, detail: Record<string, number> = {},
): Promise<void> {
  await deps.audit({
    category: "ADMIN", action: "contacts.import.stage_refused", actorId: officerId, targetType: "ContactImport",
    targetId: importId, payload: { reason, ...detail },
  });
}

/** The view of a run, its totals counted from its rows now. */
async function viewOf(run: StoredContactImport, viewerId: string): Promise<ContactImportView> {
  const totals = await db.contactImport.totals(run.id);
  return {
    id: run.id,
    status: run.status,
    format: run.format,
    fileName: run.fileName,
    fileDigest: run.fileDigest,
    mapping: { ...run.mapping },
    totalRows: run.totalRows,
    unreadable: run.unreadable,
    stagedThrough: run.stagedThrough,
    committedThrough: run.committedThrough,
    nextFrom: run.status === "STAGING" ? run.stagedThrough + 1 : null,
    totals,
    createdBy: run.createdBy,
    mine: run.createdBy === viewerId,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
    pausedAt: run.pausedAt,
    pausedBy: run.pausedBy,
    finishedAt: run.finishedAt,
  };
}

/** X18 · the creator, or an ADMIN adopting — read off the STORED role. ⭐ S15: exported, so the check, the start, the
 *  commit and their reads ask this SAME rule (`import-check.ts`, `import-commit.ts`), never a copy of it. */
export async function mayDriveImport(
  createdBy: string, officerId: string, isAdmin: (userId: string) => Promise<boolean>,
): Promise<boolean> {
  return createdBy === officerId || (await isAdmin(officerId));
}

/** X18 · the creator, or an ADMIN adopting. */
async function mayDrive(run: StoredContactImport, officerId: string, deps: ImportStagingDeps): Promise<boolean> {
  return mayDriveImport(run.createdBy, officerId, deps.isAdmin);
}

/** The file's name as a label: invisible and control characters out, spaces collapsed, bounded; empty is null. */
function cleanFileName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const text = raw.replace(INVISIBLE, " ").replace(SPACES, " ").trim();
  if (text === "") return null;
  return charCount(text) <= FILE_NAME_MAX ? text : `${Array.from(text).slice(0, FILE_NAME_MAX - 1).join("")}…`;
}

/* ═══ OPEN ═════════════════════════════════════════════════════════════════════════════════════════════ */

type OpenRequest = {
  format: ContactsFileFormat;
  fileName: string | null;
  fileDigest: string;
  mapping: ColumnMapping;
  totalRows: number;
  unreadable: number;
};
type OpenParse = { ok: true; req: OpenRequest } | { ok: false; reason: StagingRefusalReason; message: string };

/**
 * The posted body → an open request, built NEW from named keys. The format is one of the parsed shape's four; the
 * digest a sha-256; the two figures whole numbers, unreadable within the total, the total within IMPORT_MAX_ROWS (X28);
 * and the mapping U28's own `validateMapping` passes against the header row the browser read — its sentence is the
 * refusal's (X20), and only the known fields are stored.
 */
function parseOpenRequest(input: unknown): OpenParse {
  const no = (reason: StagingRefusalReason, message: string): OpenParse => ({ ok: false, reason, message });
  if (!isRecord(input)) return no("bad_request", STAGING_SENTENCES.badRequest);
  const format = input.format;
  if (typeof format !== "string" || !(CONTACTS_FILE_FORMATS as readonly string[]).includes(format)) {
    return no("bad_format", STAGING_SENTENCES.badFormat);
  }
  const digest = input.fileDigest;
  if (typeof digest !== "string" || !DIGEST.test(digest)) return no("bad_digest", STAGING_SENTENCES.badDigest);
  const totalRows = input.totalRows;
  const unreadable = input.unreadable;
  if (!isCount(totalRows) || !isCount(unreadable) || unreadable > totalRows) return no("bad_counts", STAGING_SENTENCES.badCounts);
  if (totalRows === 0) return no("empty_file", STAGING_SENTENCES.emptyFile);
  if (totalRows > IMPORT_MAX_ROWS) return no("too_many_rows", STAGING_SENTENCES.tooManyRows);
  const headers = input.headers;
  const posted = input.mapping;
  if (!Array.isArray(headers) || headers.length > COLUMNS_MAX || !headers.every((h) => typeof h === "string")
    || !isRecord(posted) || (Object.getPrototypeOf(posted) !== Object.prototype && Object.getPrototypeOf(posted) !== null)) {
    return no("bad_mapping", STAGING_SENTENCES.badRequest);
  }
  const verdict = validateMapping(headers as string[], posted as unknown as ColumnMapping);
  if (!verdict.ok) return no(posted.phone === undefined ? "no_phone_column" : "bad_mapping", verdict.sentence);
  const mapping: ColumnMapping = {};
  for (const f of CONTACT_FIELDS) {
    const index = posted[f.key];
    if (typeof index === "number") mapping[f.key] = index;
  }
  return {
    ok: true,
    req: { format: format as ContactsFileFormat, fileName: cleanFileName(input.fileName), fileDigest: digest, mapping, totalRows, unreadable },
  };
}

function newRun(id: string, req: OpenRequest, officerId: string, at: string): StoredContactImport {
  return {
    id, status: "STAGING", format: req.format, fileName: req.fileName, fileDigest: req.fileDigest, mapping: req.mapping,
    totalRows: req.totalRows, unreadable: req.unreadable, stagedThrough: 0, committedThrough: 0,
    decisionChoice: null, decisionOverrides: {}, decisionConfirmedAt: null, decisionConfirmedBy: null,
    consentBasis: null, consentWording: null, consentProofNote: null, adultAttestedAt: null, consentBasisSetBy: null,
    consentBasisSetAt: null, pausedAt: null, pausedBy: null, finishedAt: null, createdAt: at, createdBy: officerId, updatedAt: at,
    targetListId: null,
  };
}

/** The officer's open run, met again: the SAME file read the SAME way is adopted; another file is refused naming the
 *  open run (its server figures in the view), and the same file read differently is refused, never misaligned. */
async function adoptOrRefuse(
  open: StoredContactImport, req: OpenRequest, officerId: string, deps: ImportStagingDeps,
): Promise<OpenContactImportResult> {
  const view = await viewOf(open, officerId);
  if (!deps.sameFile(open.fileDigest, req.fileDigest)) {
    await auditRefusal(deps, officerId, open.id, "unfinished_run");
    return refusal("unfinished_run", STAGING_SENTENCES.unfinishedRun, view);
  }
  // ⭐ READ THE SAME WAY means the same figures AND the same mapping (review F3): a resumed run drafts its next rows
  // through its STORED mapping, so a reload that auto-mapped another column must not be adopted onto it silently.
  if (open.totalRows !== req.totalRows || open.unreadable !== req.unreadable || !deps.sameMapping(open.mapping, req.mapping)) {
    await auditRefusal(deps, officerId, open.id, "read_differently", { totalRows: req.totalRows, unreadable: req.unreadable });
    return refusal("read_differently", STAGING_SENTENCES.readDifferently, view);
  }
  return { ok: true, adopted: true, view };
}

/**
 * ⭐ OPEN A RUN, OR ADOPT THE ONE ALREADY OPEN. An officer has at most one open run: the same file read the same way
 * ADOPTS it (a closed tab, a reload, a redeploy — the browser posts on from `nextFrom`); anything else is refused while
 * it is open. Every refusal writes nothing.
 * ⭐ TWO TABS, ONE FILE, AT ONCE: both may read "no open run" before either creates one. The EARLIEST open run is the
 * officer's run (`findOpenFor`), so a later one cancels itself and adopts it — both tabs end on the same run.
 */
export async function openContactImport(
  officerId: string, input: unknown, deps: ImportStagingDeps = IMPORT_STAGING_DEPS,
): Promise<OpenContactImportResult> {
  const parsed = parseOpenRequest(input);
  if (!parsed.ok) {
    await auditRefusal(deps, officerId, null, parsed.reason);
    return refusal(parsed.reason, parsed.message);
  }
  const req = parsed.req;
  const open = await db.contactImport.findOpenFor(officerId);
  if (open) return adoptOrRefuse(open, req, officerId, deps);

  const at = deps.now().toISOString();
  let created: StoredContactImport | null = null;
  for (let attempt = 0; attempt < 3 && created === null; attempt++) {
    created = await db.contactImport.create(newRun(deps.newRunId(), req, officerId, at));
  }
  if (created === null) throw new Error("openContactImport: no free run id after three tries");
  const canonical = await db.contactImport.findOpenFor(officerId);
  if (canonical && canonical.id !== created.id) {
    await db.contactImport.transition({ importId: created.id, from: ["STAGING"], to: "CANCELLED", by: officerId, at, updatedBefore: null });
    await deps.audit({
      category: "ADMIN", action: "contacts.import.discarded", actorId: officerId, targetType: "ContactImport",
      targetId: created.id, payload: { rowsDeleted: 0, duplicateOpen: true },
    });
    return adoptOrRefuse(canonical, req, officerId, deps);
  }
  await deps.audit({
    category: "ADMIN", action: "contacts.import.opened", actorId: officerId, targetType: "ContactImport", targetId: created.id,
    payload: { format: req.format, totalRows: req.totalRows, unreadable: req.unreadable },
  });
  return { ok: true, adopted: false, view: await viewOf(created, officerId) };
}

/* ═══ STAGE ════════════════════════════════════════════════════════════════════════════════════════════ */

/** The batch's UTF-8 JSON size up to the cap, or null when it cannot be measured (it is then not a batch). */
function batchBytes(rows: readonly unknown[], deps: ImportStagingDeps): number | null {
  try {
    return deps.measureBatch(rows, deps.maxBatchBytes);
  } catch {
    return null;
  }
}

/**
 * ⭐ STAGE ONE BATCH. ⛔ THE ORDER IS THE CONTRACT: the body's named keys → both caps on the batch AS RECEIVED, before the
 * run is read or a row drafted → the run → ownership (X18) → the same file → still staging → exactly the next ordinal
 * → within the file's total → every row built on the server, the file's order held (lines strictly increase, from the
 * last line staged) → the store's compare-and-set. Every refusal writes nothing. The last batch moves the run to STAGED.
 */
export async function stageContactRows(
  officerId: string, input: unknown, deps: ImportStagingDeps = IMPORT_STAGING_DEPS,
): Promise<StageContactRowsResult> {
  const body: Record<string, unknown> = isRecord(input) ? input : {};
  const importId = body.importId;
  const fileDigest = body.fileDigest;
  const from = body.from;
  const posted = body.rows;
  // ⛔ `from` is bounded by the run cap before anything is audited, and only a WELL-FORMED run id ever reaches an audit
  // row (review F1): the chain is signed and kept for years, and a forged id or cursor could carry a name or a number.
  if (typeof importId !== "string" || typeof fileDigest !== "string" || !isLine(from) || from > IMPORT_MAX_ROWS + 1 || !Array.isArray(posted)) {
    await auditRefusal(deps, officerId, null, "bad_request");
    return refusal("bad_request", STAGING_SENTENCES.badRequest);
  }
  const target = IMPORT_ID.test(importId) ? importId : null;
  const rows: unknown[] = posted;
  if (rows.length === 0) {
    await auditRefusal(deps, officerId, target, "bad_rows", { rows: 0 });
    return refusal("bad_rows", STAGING_SENTENCES.badRows);
  }
  // ⛔ THE TWO CAPS FIRST (import-limits.ts) — re-checked here whatever the browser packed.
  if (rows.length > deps.maxBatchRows) {
    await auditRefusal(deps, officerId, target, "batch_too_many_rows", { rows: rows.length });
    return refusal("batch_too_many_rows", STAGING_SENTENCES.batchTooManyRows);
  }
  const bytes = batchBytes(rows, deps);
  if (bytes === null || bytes > deps.maxBatchBytes) {
    await auditRefusal(deps, officerId, target, "batch_too_large", { rows: rows.length, bytes: bytes ?? -1 });
    return refusal("batch_too_large", STAGING_SENTENCES.batchTooLarge);
  }

  const run = target !== null ? await db.contactImport.find(target) : null;
  if (!run) {
    await auditRefusal(deps, officerId, null, "not_found");
    return refusal("not_found", STAGING_SENTENCES.notFound);
  }
  if (!(await mayDrive(run, officerId, deps))) {
    await auditRefusal(deps, officerId, run.id, "not_yours");
    return refusal("not_yours", STAGING_SENTENCES.notYours);
  }
  if (!deps.sameFile(run.fileDigest, fileDigest)) {
    await auditRefusal(deps, officerId, run.id, "different_file");
    return refusal("different_file", STAGING_SENTENCES.differentFile, await viewOf(run, officerId));
  }
  if (run.status !== "STAGING") {
    await auditRefusal(deps, officerId, run.id, "not_staging", { from });
    return refusal("not_staging", STAGING_SENTENCES.notStaging, await viewOf(run, officerId));
  }
  // ⛔ ONE OPEN RUN PER OFFICER (review F4). Two tabs opening one file at once can each create a run on Postgres (both
  // read "none open" first), and each re-check can see itself as the earliest. The earliest open run is the officer's
  // (`findOpenFor`); a later one is refused HERE, so its tab re-opens and adopts the earliest.
  const canonical = await db.contactImport.findOpenFor(run.createdBy);
  if (canonical !== null && canonical.id !== run.id) {
    await auditRefusal(deps, officerId, run.id, "superseded");
    return refusal("superseded", STAGING_SENTENCES.superseded, await viewOf(canonical, officerId));
  }
  if (from !== run.stagedThrough + 1) {
    // A replay of a batch already staged is the one benign refusal — a retried call, never an incident — so it is not
    // audited; every other one is.
    if (from <= run.stagedThrough) return refusal("already_staged", STAGING_SENTENCES.alreadyStaged, await viewOf(run, officerId));
    await auditRefusal(deps, officerId, run.id, "out_of_order", { from, stagedThrough: run.stagedThrough });
    return refusal("out_of_order", STAGING_SENTENCES.outOfOrder, await viewOf(run, officerId));
  }
  if (from - 1 + rows.length > run.totalRows) {
    await auditRefusal(deps, officerId, run.id, "too_many_rows_for_run", { from, rows: rows.length, totalRows: run.totalRows });
    return refusal("too_many_rows_for_run", STAGING_SENTENCES.tooManyRowsForRun, await viewOf(run, officerId));
  }

  // ⭐ EVERY ROW BUILT ON THE SERVER, the file's order held across batches: lines strictly increase from the last line
  // already staged (the one record per line rule in the store is the belt).
  const at = deps.now().toISOString();
  const context: StagingRunContext = { id: run.id, mapping: run.mapping };
  const before = from > 1 ? await db.contactImportRow.after({ importId: run.id, afterOrdinal: from - 2, limit: 1 }) : [];
  let previous = before.length > 0 && before[0].ordinal === from - 1 ? before[0].line : 0;
  const staged: StoredContactImportRow[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = deps.rowFrom(rows[i], from + i, context, at);
    if (row === null || row.line <= previous) {
      await auditRefusal(deps, officerId, run.id, "bad_rows", { from, at: i });
      return refusal("bad_rows", STAGING_SENTENCES.badRows, await viewOf(run, officerId));
    }
    previous = row.line;
    staged.push(row);
  }

  const result = await db.contactImport.stageRows({
    importId: run.id, from, rows: staged, completes: from - 1 + rows.length === run.totalRows, at,
  });
  if (!result.ok) {
    const now = result.run ? await viewOf(result.run, officerId) : null;
    if (result.reason === "already_staged") return refusal("already_staged", STAGING_SENTENCES.alreadyStaged, now);
    const reason: StagingRefusalReason = result.reason === "duplicate_line" ? "bad_rows" : result.reason;
    await auditRefusal(deps, officerId, run.id, reason, { from });
    const message = reason === "not_found" ? STAGING_SENTENCES.notFound
      : reason === "not_staging" ? STAGING_SENTENCES.notStaging
        : reason === "out_of_order" ? STAGING_SENTENCES.outOfOrder
          : STAGING_SENTENCES.badRows;
    return refusal(reason, message, now);
  }
  const view = await viewOf(result.run, officerId);
  if (result.run.status === "STAGED") {
    await deps.audit({
      category: "ADMIN", action: "contacts.import.staged", actorId: officerId, targetType: "ContactImport", targetId: run.id,
      payload: { totalRows: run.totalRows, staged: view.totals.staged, unreadable: view.totals.unreadable, adopted: run.createdBy !== officerId },
    });
  }
  return { ok: true, view };
}

/* ═══ VIEW · DISCARD ═══════════════════════════════════════════════════════════════════════════════════ */

/**
 * The run, as the screen may see it. With no id it is the officer's OWN open run — THE resume read after a closed tab,
 * a reload or a redeploy. With an id it is that run, for its creator or an ADMIN (X18); anyone else gets null.
 */
export async function contactImportView(
  officerId: string, importId: string | null = null, deps: ImportStagingDeps = IMPORT_STAGING_DEPS,
): Promise<ContactImportView | null> {
  if (importId === null) {
    const open = await db.contactImport.findOpenFor(officerId);
    return open ? viewOf(open, officerId) : null;
  }
  if (!IMPORT_ID.test(importId)) return null;
  const run = await db.contactImport.find(importId);
  if (!run || !(await mayDrive(run, officerId, deps))) return null;
  return viewOf(run, officerId);
}

/**
 * Leave a run unimported BEFORE its commit starts: CANCELLED, its rows deleted. ⛔ A run that has started writing
 * contacts (COMMITTING or PAUSED) is stopped from U32's screen, never discarded here.
 */
export async function discardContactImport(
  officerId: string, importId: string, deps: ImportStagingDeps = IMPORT_STAGING_DEPS,
): Promise<DiscardContactImportResult> {
  const run = IMPORT_ID.test(importId) ? await db.contactImport.find(importId) : null;
  if (!run) {
    await auditRefusal(deps, officerId, null, "not_found");
    return refusal("not_found", STAGING_SENTENCES.notFound);
  }
  if (!(await mayDrive(run, officerId, deps))) {
    await auditRefusal(deps, officerId, run.id, "not_yours");
    return refusal("not_yours", STAGING_SENTENCES.notYours);
  }
  const at = deps.now().toISOString();
  const moved = await db.contactImport.transition({
    importId: run.id, from: ["STAGING", "STAGED"], to: "CANCELLED", by: officerId, at, updatedBefore: null,
  });
  if (!moved) {
    const current = (await db.contactImport.find(run.id)) ?? run;
    const reason: StagingRefusalReason = current.status === "COMMITTING" || current.status === "PAUSED" ? "committing" : "finished";
    await auditRefusal(deps, officerId, run.id, reason);
    return refusal(reason, reason === "committing" ? STAGING_SENTENCES.committing : STAGING_SENTENCES.finished, await viewOf(current, officerId));
  }
  const rowsDeleted = await db.contactImportRow.deleteUnsettled(run.id);
  await deps.audit({
    category: "ADMIN", action: "contacts.import.discarded", actorId: officerId, targetType: "ContactImport", targetId: run.id,
    payload: { rowsDeleted, adopted: run.createdBy !== officerId },
  });
  return { ok: true, rowsDeleted };
}

/* ═══ THE SWEEP (X29 · S15-12) — called nightly by runRetentionPass ═══════════════════════════════════════ */

/**
 * ⛔ TWO RULES, EACH ITS OWN STATUSES AND PERIOD, EACH A COMPARE-AND-SET THAT ALSO REQUIRES THE RUN TO BE IDLE STILL:
 *   1 · X29 — a STAGING or STAGED run (never started) idle `CONTACT_IMPORT_IDLE_DAYS` is CANCELLED;
 *   2 · S15-12 (the review round) — a COMMITTING or PAUSED run (started, and nobody carried it on) idle
 *       `CONTACT_IMPORT_STUCK_DAYS` is CANCELLED: the contacts it already wrote STAY in the book, only its unsettled
 *       staged rows go — so no officer's file waits in staging for ever behind an import nobody finished.
 * Either way the unsettled rows are deleted and ONE `contacts.import.expired` audit row is written (the status, the rows
 * deleted, the period — counts only). Then every run finished more than `CONTACT_IMPORT_KEEP_DAYS` ago goes, its rows with
 * it. Bounded per pass; idempotent; a second pass finds nothing.
 */
export async function sweepStaleContactImports(
  now: number = Date.now(), deps: ImportStagingDeps = IMPORT_STAGING_DEPS,
): Promise<ContactImportSweep> {
  const at = new Date(now).toISOString();
  const finishedBefore = new Date(now - CONTACT_IMPORT_KEEP_DAYS * DAY_MS).toISOString();
  const out: ContactImportSweep = { cancelled: 0, rowsDeleted: 0, runsPurged: 0 };
  const rules: ReadonlyArray<{ statuses: ContactImportStatus[]; idleDays: number }> = [
    { statuses: [...deps.sweepable], idleDays: CONTACT_IMPORT_IDLE_DAYS },
    { statuses: [...deps.stuck], idleDays: deps.stuckDays },
  ];
  for (const rule of rules) {
    if (rule.statuses.length === 0) continue;
    const idleBefore = new Date(now - rule.idleDays * DAY_MS).toISOString();
    for (let batch = 0; batch < SWEEP_MAX_BATCHES; batch++) {
      const idle = await db.contactImport.listIdle({ statuses: rule.statuses, idleBefore, limit: SWEEP_BATCH });
      for (const run of idle) {
        const moved = await db.contactImport.transition({ importId: run.id, from: rule.statuses, to: "CANCELLED", by: null, at, updatedBefore: idleBefore });
        if (!moved) continue;
        const rowsDeleted = await db.contactImportRow.deleteUnsettled(run.id);
        out.cancelled++;
        out.rowsDeleted += rowsDeleted;
        await deps.audit({
          category: "SYSTEM", action: "contacts.import.expired", actorId: null, targetType: "ContactImport", targetId: run.id,
          payload: { status: run.status, rowsDeleted, idleDays: rule.idleDays },
        });
      }
      if (idle.length < SWEEP_BATCH) break;
    }
  }
  for (let batch = 0; batch < SWEEP_MAX_BATCHES; batch++) {
    const purged = await db.contactImport.purgeFinished({ finishedBefore, limit: SWEEP_BATCH });
    out.runsPurged += purged;
    if (purged < SWEEP_BATCH) break;
  }
  return out;
}

/** The keyset page size the commit and the pre-flight walk staged rows in — one batch's worth. */
export const STAGED_PAGE_ROWS: number = CONTACT_IMPORT_ROW_PAGE_MAX;
