/**
 * S15 · C4 · THE IMPORT'S COMMIT — the start, the step, pause · resume · cancel, the failures, the result and the lists.
 *                                            (S15, 2026-10-09 · docs/CONTACTS-SCREEN-PLAN.md §4.2–§4.3; decisions X3 · S15-1…9)
 *
 * ⭐ THE START FREEZES THE OFFICER'S DECISION ON THE RUN. The choice for numbers already in the book (KEEP by default —
 * `DEFAULT_IMPORT_CHOICE`), the per-row exceptions keyed by FILE ROW (never an index — C15) and the list the contacts go
 * on are checked, the WHOLE run is decided again on the server (`walkStagedRun`, the check's own walk) and its counts
 * compared with the label the officer pressed (`expected`, `adjustTally`'s), and only then is the decision written — by
 * ONE compare-and-set that moves the run STAGED → COMMITTING (`contactImport.freezeDecision`): of two tabs pressing
 * Import, one freezes the run and the other is told `already_started`. A check older than 30 minutes, or counts the book
 * has moved since, are refused `check_again`, so the officer sees the new numbers first. ⭐ S15-1: NO CONSENT STEP — the
 * import writes no consent and asks for no basis; a list's licence basis lives on the Lists card.
 *
 * ⭐ THE STEP (S15-6) SETTLES AT MOST 500 STAGED ROWS IN ONE TRANSACTION, by compare-and-set on `committedThrough`
 * (`contactImport.commitBatch`, X3). The browser's loop asks for the next step from the cursor the server reported, and
 * a step whose cursor moved — a reload, a second tab, an adopting admin — is answered `moved` with nothing counted
 * twice. Bets come first: a step is refused `busy` while the admission queue holds a bet (`admissionSnapshot`), and the
 * loop asks again after `retryAfterSec`. Each step:
 *   1 · reads the next staged rows by keyset; an unreadable or invalid row settles `fail('invalid')` (its sentence kept
 *       for the failures list BEFORE its cells are blanked — S15-8);
 *   2 · reads each decidable number's FIRST decidable line in the whole run in ONE grouped read (S15-7,
 *       `contactImportRow.firstLinesAmong`) — ⛔ a number without one is never guessed: the step refuses;
 *   3 · loads the facts from the authority (`loadImportFacts`) and decides with the FROZEN decision (`decideRows`);
 *   4 · writes: creates through THE ONE CREATE BUILDER (`newContactRow`, X6 — source IMPORT, `sourceRef` and `importId`
 *       the run), updates conditional on the book row's `updatedAt` and on it not being the erased tombstone, keeps with
 *       decide()'s SHOWN reason (⛔ X22: the word `erased` never lands in a stored row), the blanking, the list memberships;
 *   5 · on a `conflict` (a contact changed since it was read) re-loads the facts and decides ONCE more; a row that moves
 *       again is kept as `changed_during_import` (E9: never failed) and the rest commit;
 *   6 · mirrors the book's consent cache for each created number the ledger or the stop list knows (`mirrorContactCache`,
 *       U24's one cache writer; `newContactRow` writes "nothing known", which is right for every other new number).
 *
 * ⭐ NOBODY IS EVER STUCK (S15-9). A run's starter or an ADMIN may pause, resume or cancel it. Cancel before the start is
 * staging's discard; after it, the run is paused and then CANCELLED, the rows already written STAY in the book (the view's
 * totals say how many) and the unsettled staged rows are deleted.
 *
 * ⛔ WHAT IT NEVER DOES: write a consent-ledger row, a stop, or a `userId` (a link is sign-up's fact), or touch the SMS
 * rail — it imports nothing that sends, nothing from the ledger's writers and nothing from the opt-out service.
 * ⛔ AUDIT under `contacts.import.*` (X23): ids, counts, reasons — never a number, a name, a cell or the file's name.
 * ⛔ D19 BY SHAPE: every answer is `import-flow.ts`'s — masked numbers, lines, sentences and counts; the kept rows are split
 * by reason ONLY for a viewer whose identity.contact cell is `read` (S15-3 · OD54), read off the matrix, never a role name.
 *
 * Guard: `test:contacts-import` (section `commit`, in-process red) · `test:dal-parity` §29.
 */
import { randomBytes } from "node:crypto";
import { db } from "@/lib/server/store";
import type {
  ContactImportCommitBatch, ContactImportCommitCreate, ContactImportCommitOutcome, ContactImportCommitResult,
  ContactImportCommitUpdate, ContactImportFailSentence, ContactImportFailedPage, ContactImportFailedQuery,
  ContactImportFreeze, ContactImportKeptCount, ContactImportTransition, ListBasisCoverage, StoredContactImport,
  StoredContactImportRow, StoredContactList, StoredContactListBasis,
} from "@/lib/server/store";
import { admissionSnapshot } from "@/lib/server/admission";
import { mayReveal } from "@/lib/server/rbac";
import { mirrorContactCache } from "@/lib/server/marketing/contact-cache";
import type { ContactCacheOutcome } from "@/lib/server/marketing/contact-cache";
import { newContactRow } from "./contact-write";
import { IMPORT_STAGING_DEPS, discardContactImport } from "./import-staging";
import type { ImportStagingDeps } from "./import-staging";
import {
  IMPORT_CHECK_DEPS, auditImportRefusal, bagOf, classifyStagedRow, importRefusal, importRefusalOf, importRunView,
  isRowCursor, keysetPageRows, loadImportFacts, openImportRun, walkStagedRun,
} from "./import-check";
import type { ImportCheckDeps } from "./import-check";
import { parseTzNumber } from "@/lib/tz-msisdn";
import { SAMPLE_ROW_SENTENCE } from "@/lib/contacts/sample-sheet";
import { compareListsByName, listNameKey, parseListName } from "@/lib/contacts/bulk-rules";
import {
  IMPORT_CHOICES, adjustTally, decideRows, parseImportChoice, parseRowOverrides,
} from "@/lib/contacts/import-decide";
import type { DecisionPreview, ImportCandidate, ImportChoice, RowOverrides } from "@/lib/contacts/import-decide";
import { FAILURES_PAGE_ROWS } from "@/lib/contacts/import-flow";
import type {
  CommitStepResult, FailuresResult, ImportListOption, ImportListsResult, ImportRefusal, ImportRefusalReason,
  ImportResultResult, KeptSplit, RunActResult, StartImportResult,
} from "@/lib/contacts/import-flow";

/* ═══ THE PERIODS AND THE BOUNDS ═══════════════════════════════════════════════════════════════════════ */

/** S15-6 · the most staged rows ONE step settles, in ONE transaction. */
export const COMMIT_STEP_ROWS = 500;
/** How long the loop waits before asking again while bets queue. */
export const BUSY_RETRY_SEC = 5;
/** A check older than this is refused `check_again` at the start. */
export const CHECK_FRESH_MS = 30 * 60 * 1000;
/** A check stamped this far in the FUTURE is not believed either (a clock that lies is no check). */
const CHECK_SKEW_MS = 2 * 60 * 1000;
/** The most per-row exceptions one start carries; more is refused `bad_exceptions` with nothing written. */
export const IMPORT_EXCEPTIONS_MAX = 5000;
/** A list id as the store mints them (the bulk bar's rule); anything else is not a list, without asking the store. */
const LIST_ID = /^[A-Za-z0-9_-]{1,64}$/;
/** The failures list's sentence when a failed row has no stored one (it always has; never a cell, never a number). */
export const FAILED_ROW_SENTENCE = "This row could not be imported.";

const COMMIT_REFUSED = "contacts.import.commit_refused";

/* ═══ THE DEPENDENCIES — swappable for the suite's in-process red plants; production never passes them ═══════════ */

/** The contact lists, as the start, the result and the picker read and make them. */
export type ImportListStore = {
  all: () => Promise<StoredContactList[]>;
  find: (id: string) => Promise<StoredContactList | null>;
  /** ⛔ Never an upsert: a name the unique index already holds is answered null. */
  create: (row: StoredContactList) => Promise<StoredContactList | null>;
  /** The Lists card's own figures (`contactListBasis.coveredCount`). */
  coverage: (listId: string) => Promise<ListBasisCoverage>;
  /** The list's ONE standing: its newest basis recording, revoked or not (U33a-L, M1). */
  newestBasis: (listId: string) => Promise<StoredContactListBasis | null>;
};

export type ImportCommitDeps = ImportCheckDeps & {
  freeze: (f: ContactImportFreeze) => Promise<StoredContactImport | null>;
  commitBatch: (b: ContactImportCommitBatch) => Promise<ContactImportCommitResult>;
  transition: (t: ContactImportTransition) => Promise<StoredContactImport | null>;
  deleteUnsettled: (importId: string) => Promise<number>;
  failedPage: (q: ContactImportFailedQuery) => Promise<ContactImportFailedPage>;
  keptSplit: (importId: string) => Promise<ContactImportKeptCount[]>;
  lists: ImportListStore;
  /** Staging's discard — a run cancelled before its start (U29b). */
  stagingDeps: ImportStagingDeps;
  /** ⭐ Bets come first: how many bets wait for an admission slot right now. */
  queueDepth: () => number;
  /** U24's ONE cache writer. */
  mirror: (msisdn: string, at: string) => Promise<ContactCacheOutcome>;
  /** S15-3 · OD54 · may this viewer read numbers? The read matrix's identity.contact cell, off the STORED role. */
  readsNumbers: (userId: string) => Promise<boolean>;
  /** X6 · THE ONE CREATE BUILDER. */
  newRow: typeof newContactRow;
  /** decide() over a step's rows, with the frozen decision and the whole run's first lines (`decideRows`). */
  decide: typeof decideRows;
  /** Which preview may carry a per-row exception: an in-book row that at least one choice would update. */
  changeable: (p: DecisionPreview) => boolean;
  /** The failures list's one sentence for a failed row. */
  sentenceOf: (row: StoredContactImportRow) => string;
  newListId: () => string;
  stepRows: number;
  /** X3 · how many times a conflicting step is decided again from fresh facts before its moved rows are kept. */
  maxRedecides: number;
  /** After that, how many rounds of keeping the rows that moved again before the step gives up (nothing written). */
  maxSettleRounds: number;
  checkFreshMs: number;
  exceptionsMax: number;
};

/** A new list's id: `cl_` and sixteen letters — the bulk bar's shape; no digit run that could read as a number. */
function mintListId(): string {
  return `cl_${Array.from(randomBytes(16), (b) => String.fromCharCode(97 + (b % 26))).join("")}`;
}

/** ⭐ The failures list's sentence: the read error (X19), the field problem or the number's own sentence written into
 *  `problems` at the commit (S15-8), the sample sheet's — never the cell, never the number. */
export function failedRowSentence(row: StoredContactImportRow): string {
  if (row.readError !== null) return row.readError;
  const problem = row.problems[0];
  if (problem !== undefined) return problem.sentence;
  if (row.msisdn !== null && IMPORT_CHECK_DEPS.isSample(row.msisdn)) return SAMPLE_ROW_SENTENCE;
  return FAILED_ROW_SENTENCE;
}

export const IMPORT_COMMIT_DEPS: ImportCommitDeps = {
  ...IMPORT_CHECK_DEPS,
  freeze: async (f) => db.contactImport.freezeDecision(f),
  commitBatch: async (b) => db.contactImport.commitBatch(b),
  transition: async (t) => db.contactImport.transition(t),
  deleteUnsettled: async (importId) => db.contactImportRow.deleteUnsettled(importId),
  failedPage: async (q) => db.contactImportRow.failedPage(q),
  keptSplit: async (importId) => db.contactImportRow.keptSplit(importId),
  lists: {
    all: async () => db.contactList.listAll(),
    find: async (id) => db.contactList.find(id),
    create: async (row) => db.contactList.create(row),
    coverage: async (listId) => db.contactListBasis.coveredCount(listId),
    newestBasis: async (listId) => (await db.contactListBasis.listForList(listId))[0] ?? null,
  },
  stagingDeps: IMPORT_STAGING_DEPS,
  queueDepth: () => admissionSnapshot().queueDepth,
  mirror: (msisdn, at) => mirrorContactCache(msisdn, at),
  readsNumbers: async (userId) => {
    const role = (await db.user.findById(userId))?.role;
    return role ? mayReveal(role, "identity.contact") : false;
  },
  newRow: newContactRow,
  decide: decideRows,
  changeable: (p) => p.kind === "inBook" && IMPORT_CHOICES.some((ch) => p.byChoice[ch].kind === "update"),
  sentenceOf: failedRowSentence,
  newListId: mintListId,
  stepRows: COMMIT_STEP_ROWS,
  maxRedecides: 1,
  maxSettleRounds: 3,
  checkFreshMs: CHECK_FRESH_MS,
  exceptionsMax: IMPORT_EXCEPTIONS_MAX,
};

/* ═══ SMALL PIECES ═════════════════════════════════════════════════════════════════════════════════════ */

const isCount = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;

/** ⭐ A write in the same millisecond as the row's last one must still move `updatedAt` (contact-write.ts's rule), or a
 *  second write carrying the same guard would pass its compare: the later of now and the guard plus one millisecond. */
function stampAfter(at: string, guard: string): string {
  return new Date(Math.max(Date.parse(at), Date.parse(guard) + 1)).toISOString();
}

/** The error's NAME and CODE — never its message (a database error's message can print the row it refused, a number in it). */
export function errorKind(err: unknown): string {
  try {
    const e = (err ?? {}) as { name?: unknown; code?: unknown };
    const parts = [typeof e.name === "string" ? e.name : null, typeof e.code === "string" ? e.code : null].filter((x): x is string => x !== null);
    return (parts.join(" ") || typeof err).slice(0, 60);
  } catch {
    return "unreadable";
  }
}

/**
 * ⛔ THE ACTIONS' CATCH: a failure the browser is told as `server_error` — never a throw, never the error's text — leaves
 * one refusal row (`contacts.import.<family>_refused`, X23) and one log line with the error's NAME and CODE only.
 */
export async function recordImportFailure(
  officerId: string, family: "stage" | "check" | "commit", importId: string | null, step: string, err: unknown,
  deps: Pick<ImportCheckDeps, "audit"> = IMPORT_CHECK_DEPS,
): Promise<ImportRefusal> {
  const kind = errorKind(err);
  console.error(`[contacts-import] ${step} failed (${kind}) — answered server_error`);
  try {
    await auditImportRefusal(deps, `contacts.import.${family}_refused`, officerId, importId, "server_error", { step, error: kind });
  } catch {
    // ⛔ An audit fault never turns an answer into a throw: the officer is told the step failed either way.
  }
  return importRefusal("server_error");
}

/* ═══ THE START ════════════════════════════════════════════════════════════════════════════════════════ */

type ListChoice = { kind: "none" } | { kind: "existing"; id: string } | { kind: "new"; name: string };

/** The posted list choice, built NEW from named keys — or null. */
function parseListChoice(raw: unknown): ListChoice | null {
  const b = bagOf(raw);
  if (b.kind === "none") return { kind: "none" };
  if (b.kind === "existing") return typeof b.listId === "string" && LIST_ID.test(b.listId) ? { kind: "existing", id: b.listId } : null;
  if (b.kind === "new") return typeof b.name === "string" ? { kind: "new", name: b.name } : null;
  return null;
}

/** Why a run that is not STAGED cannot be started. */
function notStartable(run: StoredContactImport): ImportRefusalReason {
  if (run.status === "STAGING") return "not_staged";
  if (run.status === "DONE") return "done";
  if (run.status === "CANCELLED") return "cancelled";
  return "already_started";
}

/**
 * ⭐ THE START (U32's one start action, S15-1). ⛔ THE ORDER IS THE CONTRACT: the run → ownership (X18) → STAGED → the
 * choice → the exceptions' shape and count → the list (it exists · a new name passes the Lists card's rule and no list
 * holds it) → the label's shape → the check's age → the WHOLE run decided again, its counts against the label and each
 * exception against a row that can change → the new list created → the freeze (ONE compare-and-set) → ONE audit row.
 * Every refusal before the freeze writes nothing.
 */
export async function startContactImport(officerId: string, input: unknown, deps: ImportCommitDeps = IMPORT_COMMIT_DEPS): Promise<StartImportResult> {
  const startedAt = deps.now().getTime();
  const body = bagOf(input);
  const opened = await openImportRun(officerId, body.runId, deps, COMMIT_REFUSED);
  if (!opened.ok) return opened.refusal;
  const run = opened.run;
  const refuse = async (reason: ImportRefusalReason, message?: string, detail: Record<string, number | string | boolean> = {}): Promise<StartImportResult> => {
    await auditImportRefusal(deps, COMMIT_REFUSED, officerId, run.id, reason, { step: "start", ...detail });
    const current = (await deps.findRun(run.id)) ?? run;
    return importRefusal(reason, await importRunView(officerId, current, deps), message);
  };
  if (run.status !== "STAGED") return refuse(notStartable(run));

  const choice = parseImportChoice(body.choice);
  if (choice === null) return refuse("bad_choice");
  const shape = parseRowOverrides(body.exceptions);
  if (shape === null) return refuse("bad_exceptions");
  const exceptionLines = Object.keys(shape).length;
  if (exceptionLines > deps.exceptionsMax) return refuse("bad_exceptions", undefined, { exceptions: exceptionLines });

  const list = parseListChoice(body.list);
  if (list === null) return refuse("bad_list");
  let newName: string | null = null;
  if (list.kind === "existing" && (await deps.lists.find(list.id)) === null) return refuse("list_gone");
  if (list.kind === "new") {
    const named = parseListName(list.name);
    if (!named.ok) return refuse("bad_list", named.sentence);
    // ⭐ ONE LIST PER NAME TO A PERSON (the bulk bar's rule): the store's unique index is case-sensitive, so ask here.
    const key = listNameKey(named.name);
    if ((await deps.lists.all()).some((l) => listNameKey(l.name) === key)) return refuse("list_name_taken");
    newName = named.name;
  }

  const expectedBody = bagOf(body.expected);
  const exCreate = expectedBody.create;
  const exUpdate = expectedBody.update;
  const exKeep = expectedBody.keep;
  if (!isCount(exCreate) || !isCount(exUpdate) || !isCount(exKeep)) return refuse("check_again", undefined, { why: "label" });
  const checkedAt = typeof body.checkedAt === "string" ? Date.parse(body.checkedAt) : Number.NaN;
  if (!Number.isFinite(checkedAt) || startedAt - checkedAt > deps.checkFreshMs || checkedAt - startedAt > CHECK_SKEW_MS) {
    return refuse("check_again", undefined, { why: "age" });
  }

  // ⭐ THE SERVER DECIDES AGAIN — the whole run, under the officer's choice and exceptions (`adjustTally`, which equals
  // decide() with those overrides by construction — test:contacts-import §D11) — and learns which rows can change.
  const tally = { create: 0, update: 0, keep: 0 };
  const changeable = new Set<number>();
  const walked = await walkStagedRun(run, deps, startedAt + deps.deadlineMs, (page) => {
    const t = adjustTally(page.plan.byChoice, page.plan.previews, choice, shape);
    tally.create += t.create;
    tally.update += t.update;
    tally.keep += t.keep;
    for (const p of page.plan.previews) if (deps.changeable(p)) changeable.add(p.line);
  });
  if (walked === "too_slow") return refuse("too_slow");
  // ⛔ An exception may name only an in-book row that a choice would change — never a row outside the file, a new
  // number, a repeat, or a row the book no longer differs from.
  const overrides: RowOverrides | null = parseRowOverrides(body.exceptions, changeable);
  if (overrides === null) return refuse("bad_exceptions", undefined, { exceptions: exceptionLines });
  if (tally.create !== exCreate || tally.update !== exUpdate || tally.keep !== exKeep) {
    return refuse("check_again", undefined, { why: "moved", create: tally.create, update: tally.update, keep: tally.keep });
  }

  const at = deps.now().toISOString();
  let targetListId: string | null = null;
  let listCreated = false;
  if (list.kind === "existing") {
    if ((await deps.lists.find(list.id)) === null) return refuse("list_gone");
    targetListId = list.id;
  } else if (list.kind === "new" && newName !== null) {
    const made = await deps.lists.create({
      id: deps.newListId(), name: newName, description: null, createdAt: at, createdBy: officerId, updatedAt: at, updatedBy: officerId,
    });
    // ⛔ The unique index refused it: somebody created the name between the check and here.
    if (made === null) return refuse("list_name_taken");
    targetListId = made.id;
    listCreated = true;
  }

  const frozen = await deps.freeze({ importId: run.id, choice, overrides, targetListId, by: officerId, at });
  if (frozen === null) {
    const current = (await deps.findRun(run.id)) ?? run;
    const reason = current.status === "STAGED" ? "server_error" : notStartable(current);
    return refuse(reason, undefined, { listCreated });
  }
  await deps.audit({
    category: "ADMIN", action: "contacts.import.started", actorId: officerId, targetType: "ContactImport", targetId: run.id,
    payload: {
      choice, exceptions: exceptionLines, list: list.kind, listCreated, create: tally.create, update: tally.update, keep: tally.keep,
      adopted: run.createdBy !== officerId, ms: deps.now().getTime() - startedAt,
    },
  });
  return { ok: true, view: await importRunView(officerId, frozen, deps) };
}

/* ═══ THE STEP ═════════════════════════════════════════════════════════════════════════════════════════ */

/** What one step writes, before it is written. */
type StepPlan = {
  creates: ContactImportCommitCreate[];
  updates: ContactImportCommitUpdate[];
  outcomes: ContactImportCommitOutcome[];
  sentences: ContactImportFailSentence[];
  members: string[];
  /** The numbers created, for the cache mirror. */
  created: string[];
};

/**
 * ⭐ ONE STEP'S DECISIONS, from the rows it read. Unreadable and invalid rows fail `invalid` (an invalid row whose sentence
 * is not stored yet gets it written — S15-8); the decidable rows are decided with the FROZEN choice and overrides, the
 * WHOLE run's first lines (S15-7) and fresh facts. Null when a decidable number has no first line at or before its own
 * row — ⛔ the step refuses rather than guess which row of a number wins (OD33).
 */
async function planStep(
  run: StoredContactImport, window: readonly StoredContactImportRow[], choice: ImportChoice, overrides: RowOverrides,
  officerId: string, at: string, deps: ImportCommitDeps,
): Promise<StepPlan | null> {
  const plan: StepPlan = { creates: [], updates: [], outcomes: [], sentences: [], members: [], created: [] };
  const decidable: Array<{ row: StoredContactImportRow; candidate: ImportCandidate }> = [];
  for (const row of window) {
    const c = classifyStagedRow(row, deps.isSample);
    if (c.kind === "decidable") {
      decidable.push({ row, candidate: c.candidate });
      continue;
    }
    plan.outcomes.push({ ordinal: row.ordinal, outcome: "fail", reason: "invalid" });
    if (c.kind === "invalid" && row.problems.length === 0) plan.sentences.push({ ordinal: row.ordinal, sentence: c.sentence });
  }
  if (decidable.length === 0) return plan;

  const numbers = Array.from(new Set(decidable.map((d) => d.candidate.msisdn)));
  const first = new Map<string, number>();
  for (const f of await deps.firstLines({ importId: run.id, msisdns: numbers })) first.set(f.msisdn, f.line);
  for (const d of decidable) {
    const at0 = first.get(d.candidate.msisdn);
    if (at0 === undefined || at0 > d.candidate.line) return null;
  }
  const facts = await loadImportFacts(numbers, deps.reads);
  const decisions = deps.decide(decidable.map((d) => d.candidate), facts, choice, overrides, run.id, first);
  const listed = (run.targetListId ?? null) !== null;
  decisions.forEach((d, i) => {
    const { row, candidate } = decidable[i];
    if (d.kind === "create") {
      const born = deps.newRow({
        number: parseTzNumber(candidate.msisdn), rawInput: row.rawPhone, displayName: candidate.displayName, email: candidate.email,
        tags: candidate.tags, notes: candidate.notes, source: "IMPORT", sourceRef: run.id, importId: run.id, officerId, at,
      });
      plan.creates.push({ ordinal: row.ordinal, row: born });
      plan.outcomes.push({ ordinal: row.ordinal, outcome: "create", reason: null });
      plan.created.push(born.msisdn);
      if (listed) plan.members.push(born.id);
    } else if (d.kind === "update") {
      plan.updates.push({
        ordinal: row.ordinal, contactId: d.contactId, guard: d.guard.updatedAt, at: stampAfter(at, d.guard.updatedAt), by: officerId,
        patch: { ...d.patch },
      });
      plan.outcomes.push({ ordinal: row.ordinal, outcome: "update", reason: null });
      if (listed) plan.members.push(d.contactId);
    } else {
      // ⛔ X22 · the SHOWN reason: an erased number is stored as the ordinary contact it reads as, never as `erased`.
      plan.outcomes.push({ ordinal: row.ordinal, outcome: "keep", reason: d.shown });
      if (listed && d.contactId !== null && d.reason !== "erased") plan.members.push(d.contactId);
    }
  });
  plan.members = Array.from(new Set(plan.members));
  return plan;
}

/** E9 · the rows that moved AGAIN after the re-decision: kept as `changed_during_import`, never failed; the rest commit. */
function keepMoved(plan: StepPlan, ordinals: readonly number[]): StepPlan {
  const moved = new Set(ordinals);
  const dropped = plan.creates.filter((c) => moved.has(c.ordinal));
  const droppedIds = new Set(dropped.map((c) => c.row.id));
  const droppedNumbers = new Set(dropped.map((c) => c.row.msisdn));
  return {
    creates: plan.creates.filter((c) => !moved.has(c.ordinal)),
    updates: plan.updates.filter((u) => !moved.has(u.ordinal)),
    outcomes: plan.outcomes.map((o): ContactImportCommitOutcome =>
      (moved.has(o.ordinal) ? { ordinal: o.ordinal, outcome: "keep", reason: "changed_during_import" } : o)),
    sentences: plan.sentences,
    members: plan.members.filter((id) => !droppedIds.has(id)),
    created: plan.created.filter((m) => !droppedNumbers.has(m)),
  };
}

/** The step's counts for its audit row — counts only. */
function countsOf(plan: StepPlan): { create: number; update: number; keep: number; fail: number } {
  let keep = 0;
  let fail = 0;
  for (const o of plan.outcomes) {
    if (o.outcome === "keep") keep++;
    else if (o.outcome === "fail") fail++;
  }
  return { create: plan.creates.length, update: plan.updates.length, keep, fail };
}

/**
 * ⭐ THE CACHE OF EACH CREATED NUMBER THE TRUTH KNOWS (C4). `newContactRow` writes "nothing known" (UNKNOWN, no stop),
 * which is right for every number the ledger and the stop list have never heard of; the others — a stop on a new number
 * (owner decision 5), a ledger word from before the import — are asked of the TRUTH again after the write (two bulk
 * reads) and mirrored one by one through U24's ONE writer, which writes only on a difference.
 */
async function mirrorCreated(numbers: readonly string[], at: string, deps: ImportCommitDeps): Promise<void> {
  if (numbers.length === 0) return;
  const owed = new Set<string>();
  for (const w of await deps.reads.latestWords([...numbers])) owed.add(w.identifier);
  for (const s of await deps.reads.activeStops([...numbers])) owed.add(s.identifier);
  for (const m of numbers) if (owed.has(m)) await deps.mirror(m, at);
}

/** Why a run that is not COMMITTING takes no step — and whether that is worth an audit row (a loop that meets a paused,
 *  cancelled or finished run simply stops: no incident). */
function notSteppable(run: StoredContactImport): { reason: ImportRefusalReason; audited: boolean } {
  if (run.status === "PAUSED") return { reason: "paused", audited: false };
  if (run.status === "CANCELLED") return { reason: "cancelled", audited: false };
  if (run.status === "DONE") return { reason: "done", audited: false };
  if (run.status === "STAGED") return { reason: "check_again", audited: true };
  return { reason: "not_staged", audited: true };
}

/**
 * ⭐ ONE COMMIT STEP (S15-6). ⛔ THE ORDER IS THE CONTRACT: the cursor's shape → the run → ownership (X18) → COMMITTING →
 * the cursor equals the run's (else `moved`, nothing counted twice) → no bet waiting (else `busy`) → the frozen decision
 * read back → the next rows → decide → ONE write (conflict: decide once more from fresh facts, then keep what moved) →
 * the cache of created numbers → the audit rows. The bar moves only on the cursor this returns.
 */
export async function commitContactImportStep(officerId: string, input: unknown, deps: ImportCommitDeps = IMPORT_COMMIT_DEPS): Promise<CommitStepResult> {
  const startedAt = deps.now().getTime();
  const body = bagOf(input);
  const fromCursor = body.fromCursor;
  if (!isRowCursor(fromCursor)) {
    await auditImportRefusal(deps, COMMIT_REFUSED, officerId, null, "bad_request", { step: "commit" });
    return importRefusal("bad_request");
  }
  const opened = await openImportRun(officerId, body.runId, deps, COMMIT_REFUSED);
  if (!opened.ok) return opened.refusal;
  const run = opened.run;
  if (run.status !== "COMMITTING") {
    const no = notSteppable(run);
    if (no.audited) await auditImportRefusal(deps, COMMIT_REFUSED, officerId, run.id, no.reason, { step: "commit" });
    return importRefusal(no.reason, await importRunView(officerId, run, deps));
  }
  if (fromCursor !== run.committedThrough) return { ok: true, kind: "moved", view: await importRunView(officerId, run, deps) };
  // ⭐ BETS COME FIRST: while a bet waits for an admission slot, the import waits for the bet — never the other way round.
  if (deps.queueDepth() > 0) return importRefusal("busy", await importRunView(officerId, run, deps), undefined, BUSY_RETRY_SEC);

  const choice = parseImportChoice(run.decisionChoice);
  const overrides = parseRowOverrides(run.decisionOverrides ?? {});
  if (choice === null || overrides === null) {
    await auditImportRefusal(deps, COMMIT_REFUSED, officerId, run.id, "server_error", { step: "commit", why: "decision" });
    return importRefusal("server_error", await importRunView(officerId, run, deps));
  }

  const at = deps.now().toISOString();
  const stepRows = keysetPageRows(deps.stepRows);
  const window = await deps.rowsAfter({ importId: run.id, afterOrdinal: fromCursor, limit: stepRows });
  // The last window reaches the run's end: every ordinal up to `stagedThrough` is settled (erasure may have deleted some).
  const toCursor = window.length < stepRows ? run.stagedThrough : window[window.length - 1].ordinal;
  const listId = run.targetListId ?? null;
  const batchOf = (p: StepPlan): ContactImportCommitBatch => ({
    importId: run.id, fromCursor, toCursor, at, by: officerId, creates: p.creates, updates: p.updates, outcomes: p.outcomes,
    sentences: p.sentences, listId, members: p.members,
  });
  const unplanned = async (): Promise<CommitStepResult> => {
    await auditImportRefusal(deps, COMMIT_REFUSED, officerId, run.id, "server_error", { step: "commit", why: "first_line" });
    return importRefusal("server_error", await importRunView(officerId, run, deps));
  };

  const firstPlan = await planStep(run, window, choice, overrides, officerId, at, deps);
  if (firstPlan === null) return unplanned();
  let plan: StepPlan = firstPlan;
  let result: ContactImportCommitResult = await deps.commitBatch(batchOf(plan));
  let redecided = 0;
  let movedRows = 0;
  while (result.kind === "conflict" && redecided < deps.maxRedecides) {
    redecided++;
    const again = await planStep(run, window, choice, overrides, officerId, at, deps);
    if (again === null) return unplanned();
    plan = again;
    result = await deps.commitBatch(batchOf(plan));
  }
  for (let round = 0; result.kind === "conflict" && round < deps.maxSettleRounds; round++) {
    movedRows += result.ordinals.length;
    plan = keepMoved(plan, result.ordinals);
    result = await deps.commitBatch(batchOf(plan));
  }
  if (result.kind === "conflict") {
    // ⛔ Nothing was written (every conflict rolls the step back): the loop asks again, and the step decides afresh.
    await auditImportRefusal(deps, COMMIT_REFUSED, officerId, run.id, "server_error", { step: "commit", why: "conflict", rows: result.ordinals.length });
    return importRefusal("server_error", await importRunView(officerId, run, deps));
  }
  if (result.kind === "moved") {
    const now = result.run ?? (await deps.findRun(run.id)) ?? run;
    return { ok: true, kind: "moved", view: await importRunView(officerId, now, deps) };
  }

  const settled = result.run;
  await mirrorCreated(plan.created, at, deps);
  const counts = countsOf(plan);
  await deps.audit({
    category: "ADMIN", action: "contacts.import.batch", actorId: officerId, targetType: "ContactImport", targetId: run.id,
    payload: { from: fromCursor, to: toCursor, ...counts, changedDuringImport: movedRows, redecided, ms: deps.now().getTime() - startedAt },
  });
  const view = await importRunView(officerId, settled, deps);
  if (settled.status !== "DONE") return { ok: true, kind: "advanced", view };
  await deps.audit({
    category: "ADMIN", action: "contacts.import.finished", actorId: officerId, targetType: "ContactImport", targetId: run.id,
    payload: {
      staged: view.totals.staged, create: view.totals.create, update: view.totals.update, keep: view.totals.keep, fail: view.totals.fail,
      listed: listId !== null,
    },
  });
  return { ok: true, kind: "done", view };
}

/* ═══ PAUSE · RESUME · CANCEL (S15-9) ═════════════════════════════════════════════════════════════════ */

/** Why a run cannot take this act. */
function actRefusal(run: StoredContactImport): ImportRefusalReason {
  if (run.status === "STAGING") return "not_staged";
  if (run.status === "STAGED") return "check_again";
  if (run.status === "DONE") return "done";
  if (run.status === "CANCELLED") return "cancelled";
  return run.status === "PAUSED" ? "paused" : "moved";
}

async function runAct(
  officerId: string, input: unknown, deps: ImportCommitDeps, act: "pause" | "resume",
): Promise<RunActResult> {
  const opened = await openImportRun(officerId, bagOf(input).runId, deps, COMMIT_REFUSED);
  if (!opened.ok) return opened.refusal;
  const run = opened.run;
  const from = act === "pause" ? "COMMITTING" : "PAUSED";
  const to = act === "pause" ? "PAUSED" : "COMMITTING";
  // ⭐ IDEMPOTENT: a second press finds the run already where it was sent.
  if (run.status === to) return { ok: true, view: await importRunView(officerId, run, deps) };
  if (run.status !== from) {
    await auditImportRefusal(deps, COMMIT_REFUSED, officerId, run.id, actRefusal(run), { step: act });
    return importRefusal(actRefusal(run), await importRunView(officerId, run, deps));
  }
  const at = deps.now().toISOString();
  const moved = await deps.transition({ importId: run.id, from: [from], to, by: officerId, at, updatedBefore: null });
  if (moved === null) {
    const current = (await deps.findRun(run.id)) ?? run;
    if (current.status === to) return { ok: true, view: await importRunView(officerId, current, deps) };
    return importRefusal(actRefusal(current), await importRunView(officerId, current, deps));
  }
  await deps.audit({
    category: "ADMIN", action: act === "pause" ? "contacts.import.paused" : "contacts.import.resumed", actorId: officerId,
    targetType: "ContactImport", targetId: run.id, payload: { committedThrough: moved.committedThrough, adopted: run.createdBy !== officerId },
  });
  return { ok: true, view: await importRunView(officerId, moved, deps) };
}

/** Stop a commit after the step in flight: COMMITTING → PAUSED, who and when recorded (X18). */
export async function pauseContactImport(officerId: string, input: unknown, deps: ImportCommitDeps = IMPORT_COMMIT_DEPS): Promise<RunActResult> {
  return runAct(officerId, input, deps, "pause");
}

/** Carry on from the cursor: PAUSED → COMMITTING, the pause cleared. */
export async function resumeContactImport(officerId: string, input: unknown, deps: ImportCommitDeps = IMPORT_COMMIT_DEPS): Promise<RunActResult> {
  return runAct(officerId, input, deps, "resume");
}

/**
 * Leave the rest unimported (S15-9). Before the start it is staging's discard (the run CANCELLED, its rows deleted).
 * After it: a COMMITTING run is paused first — so no step can land after the officer pressed Cancel — then CANCELLED; the
 * rows already written STAY in the book and the view's totals say how many; the unsettled staged rows are deleted.
 */
export async function cancelContactImport(officerId: string, input: unknown, deps: ImportCommitDeps = IMPORT_COMMIT_DEPS): Promise<RunActResult> {
  const opened = await openImportRun(officerId, bagOf(input).runId, deps, COMMIT_REFUSED);
  if (!opened.ok) return opened.refusal;
  const run = opened.run;
  if (run.status === "CANCELLED") return { ok: true, view: await importRunView(officerId, run, deps) };
  if (run.status === "DONE") return importRefusal("done", await importRunView(officerId, run, deps));
  if (run.status === "STAGING" || run.status === "STAGED") {
    const discarded = await discardContactImport(officerId, run.id, deps.stagingDeps);
    if (!discarded.ok) return importRefusalOf(officerId, discarded, deps);
    const now = (await deps.findRun(run.id)) ?? run;
    return { ok: true, view: await importRunView(officerId, now, deps) };
  }
  const at = deps.now().toISOString();
  if (run.status === "COMMITTING") {
    await deps.transition({ importId: run.id, from: ["COMMITTING"], to: "PAUSED", by: officerId, at, updatedBefore: null });
  }
  const cancelled = await deps.transition({ importId: run.id, from: ["PAUSED"], to: "CANCELLED", by: officerId, at, updatedBefore: null });
  if (cancelled === null) {
    const current = (await deps.findRun(run.id)) ?? run;
    if (current.status === "CANCELLED") return { ok: true, view: await importRunView(officerId, current, deps) };
    await auditImportRefusal(deps, COMMIT_REFUSED, officerId, run.id, actRefusal(current), { step: "cancel" });
    return importRefusal(actRefusal(current), await importRunView(officerId, current, deps));
  }
  const rowsDeleted = await deps.deleteUnsettled(run.id);
  const view = await importRunView(officerId, cancelled, deps);
  await deps.audit({
    category: "ADMIN", action: "contacts.import.cancelled", actorId: officerId, targetType: "ContactImport", targetId: run.id,
    payload: {
      written: view.totals.create + view.totals.update, keep: view.totals.keep, fail: view.totals.fail, rowsDeleted,
      committedThrough: cancelled.committedThrough, adopted: run.createdBy !== officerId,
    },
  });
  return { ok: true, view };
}

/* ═══ THE FAILURES · THE RESULT · THE LISTS ═════════════════════════════════════════════════════════════ */

/** The rows that could not be imported, a page at a time, by FILE row — each with its sentence, never its cell. */
export async function contactImportFailures(officerId: string, input: unknown, deps: ImportCommitDeps = IMPORT_COMMIT_DEPS): Promise<FailuresResult> {
  const body = bagOf(input);
  const afterLine = body.afterLine;
  if (!isRowCursor(afterLine)) {
    await auditImportRefusal(deps, COMMIT_REFUSED, officerId, null, "bad_request", { step: "failures" });
    return importRefusal("bad_request");
  }
  const opened = await openImportRun(officerId, body.runId, deps, COMMIT_REFUSED);
  if (!opened.ok) return opened.refusal;
  const page = await deps.failedPage({ importId: opened.run.id, afterLine, limit: FAILURES_PAGE_ROWS });
  const rows = page.rows.map((row) => ({ line: row.line, sentence: deps.sentenceOf(row) }));
  const last = page.rows[page.rows.length - 1];
  return { ok: true, rows, total: page.total, nextAfterLine: page.rows.length >= FAILURES_PAGE_ROWS && last !== undefined ? last.line : null };
}

/** S15-3 · the kept rows' reasons, folded for the screen. ⛔ `erased` is never stored (X22), so it can never be told apart. */
export function keptSplitOf(counts: readonly ContactImportKeptCount[]): Exclude<KeptSplit, null> {
  const split = { inBookUnchanged: 0, onStopList: 0, repeated: 0, chosenKeep: 0 };
  for (const c of counts) {
    if (c.reason === "suppressed") split.onStopList += c.count;
    else if (c.reason === "same_run") split.repeated += c.count;
    else if (c.reason === "chosen_keep") split.chosenKeep += c.count;
    else split.inBookUnchanged += c.count;
  }
  return split;
}

/**
 * ⭐ THE RESULT: the run as it stands, its kept rows split by reason ONLY for a viewer whose identity.contact cell is
 * `read` (S15-3 · OD54 — a stop per row is a player signal; everyone else reads one "kept as they were"), and the list the
 * contacts went on with whether EVERY live member of it is now covered by its basis — false until the basis is recorded
 * again on the Lists card, because the members this import added joined after any earlier recording.
 */
export async function contactImportResult(officerId: string, runId: unknown, deps: ImportCommitDeps = IMPORT_COMMIT_DEPS): Promise<ImportResultResult> {
  const opened = await openImportRun(officerId, runId, deps, COMMIT_REFUSED);
  if (!opened.ok) return opened.refusal;
  const run = opened.run;
  const view = await importRunView(officerId, run, deps);
  const kept: KeptSplit = (await deps.readsNumbers(officerId)) ? keptSplitOf(await deps.keptSplit(run.id)) : null;
  const listId = run.targetListId ?? null;
  const row = listId === null ? null : await deps.lists.find(listId);
  let list: { id: string; name: string; covered: boolean } | null = null;
  if (row !== null) {
    const coverage = await deps.lists.coverage(row.id);
    list = { id: row.id, name: row.name, covered: coverage.live > 0 && coverage.covered === coverage.live };
  }
  return { ok: true, result: { view, kept, list } };
}

/** The lists an import can add to — the Lists card's, A to Z — each with the card's member figure and whether its basis
 *  is in force (its newest recording, not revoked). Counts and names only: nothing here is a number. */
export async function importListOptions(_officerId: string, deps: ImportCommitDeps = IMPORT_COMMIT_DEPS): Promise<ImportListsResult> {
  const out: ImportListOption[] = [];
  for (const l of await deps.lists.all()) {
    const coverage = await deps.lists.coverage(l.id);
    const newest = await deps.lists.newestBasis(l.id);
    out.push({ id: l.id, name: l.name, members: coverage.live, covered: newest !== null && newest.revokedAt === null });
  }
  return { ok: true, lists: out.sort(compareListsByName) };
}
