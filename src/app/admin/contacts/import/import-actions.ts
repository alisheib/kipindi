"use server";

/**
 * S15 · /admin/contacts — THE IMPORT'S ONE ACTION FILE (decision X17): the dialog's sixteen server actions, from the
 * file's first batch to the result, and an ADMIN's view of other officers' unfinished runs (S15-12).
 *                                                                           (S15, 2026-10-09 · docs/CONTACTS-SCREEN-PLAN.md §4)
 *
 * ⛔ THE GATE IS EACH ACTION'S FIRST STATEMENT (ruling 523: a server action is a POST to whatever URL the browser is on, so
 * no layout or path rule can see it). Every action opens with `softCheckStaff("growth", …)`: the viewer's STORED role,
 * `canAct` on the growth domain, a SECURITY `privilege_escalation_blocked` row for a refusal — and a 2-step sign-in that
 * lapsed (or was never set up) REFUSED IN WORDS, never the step-up redirect. ⭐ WHY THE NON-REDIRECTING GATE FOR EVERY
 * ACTION, the pressed ones included (contact-form-actions.ts keeps the redirect for Save): the import dialog holds what
 * no page can rebuild — a file read in the browser, its column choices, a staging or commit loop mid-way — and a
 * redirect from inside it throws all of that away; the refusal in words keeps the dialog, and the officer confirms the
 * second factor in another tab and presses again. The decision is the same rule; only the way it is said differs.
 * ⚠️ A missing session still redirects to the sign-in page, as every guard does: there is no officer to keep a file for.
 * ⭐ THEN A RATE RULE PER OFFICER (`rate-limit.ts`), FOUR BUCKETS, so a run is never throttled mid-way:
 * `contacts.import.step` (staging batches, commit steps — sized far past a 200,000-row file), `contacts.import` (the
 * acts an officer presses), `contacts.import.check` (the check and the Excel reader — the expensive reads),
 * `contacts.import.read` (the run, a changes page, the lists, a failures page, the result, an ADMIN's open runs).
 * ⛔ EVERY BODY IS RE-READ ON THE SERVER: each core builds its request NEW from named keys (`import-staging.ts`,
 * `import-check.ts`, `import-commit.ts`), so a posted count, verdict, outcome or officer never reaches a decision.
 * ⛔ NEVER A THROW TO THE BROWSER, NEVER AN ERROR'S TEXT: a failure is answered `server_error` with its one sentence, and
 * `recordImportFailure` leaves the refusal's audit row and a log line with the error's name and code only — a database
 * error's message can print the row it refused, a number in it.
 * ⭐ STAGING'S REFUSALS PASS THROUGH WITH THEIR OWN SENTENCES (U29b, by name); every other refusal is one sentence from
 * `IMPORT_REFUSAL_SENTENCES`. Every view is the contract's `ImportRunView` — the starter named ("you", or their name),
 * the totals counted from the rows — and no answer carries a whole number, a contact id or a consent fact (D19).
 * ⛔ A REFUSAL IS NOT A REVALIDATION: the contacts page is revalidated only when the book changed — a run that finished,
 * or one cancelled after writing.
 *
 * Guard: `test:admin-action-gate` (each action gates first) · `test:orphan-actions` (the dialog calls every one) ·
 * `test:contacts-import` (sections `check` and `commit`, the cores behind these).
 */
import { revalidatePath } from "next/cache";
import { softCheckStaff } from "@/lib/server/rbac-guard";
import { rateCheckAsync } from "@/lib/server/rate-limit";
import { contactImportView, discardContactImport, openContactImport, stageContactRows } from "@/lib/server/contacts/import-staging";
import { readXlsxForOfficer } from "@/lib/server/contacts/import-xlsx-run";
import { checkContactImport, contactImportChanges, importRefusalOf, importRunViewOf } from "@/lib/server/contacts/import-check";
import {
  cancelContactImport, commitContactImportStep, contactImportFailures, contactImportResult, importListOptions, importOpenRuns,
  pauseContactImport, recordImportFailure, resumeContactImport, startContactImport,
} from "@/lib/server/contacts/import-commit";
import { IMPORT_REFUSAL_SENTENCES } from "@/lib/contacts/import-flow";
import type {
  ChangesInput, ChangesResult, CommitStepInput, CommitStepResult, DiscardImportResult, FailuresInput, FailuresResult,
  ImportListsResult, ImportOpenRunsResult, ImportRefusal, ImportResultResult, ImportViewResult, OpenImportInput, OpenImportResult,
  PreflightResult, ReadXlsxInput, ReadXlsxResult, RunActInput, RunActResult, StageImportInput, StageImportResult,
  StartImportInput, StartImportResult,
} from "@/lib/contacts/import-flow";

type Gate = { ok: true; userId: string } | { ok: false; refusal: ImportRefusal };

/** The ONE gate every action opens with — the growth domain, the STORED role, a lapsed second factor said in words. */
async function gate(action: string): Promise<Gate> {
  const g = await softCheckStaff("growth", action, IMPORT_REFUSAL_SENTENCES.forbidden);
  if (g.ok) return { ok: true, userId: g.userId };
  return { ok: false, refusal: { ok: false, reason: "forbidden", message: g.error, view: null } };
}

/** The rate limiter's answer: the contract's sentence and when to ask again. */
function limited(retryAfterSec: number): ImportRefusal {
  return { ok: false, reason: "rate_limited", message: IMPORT_REFUSAL_SENTENCES.rate_limited, view: null, retryAfterSec };
}

/** A posted value as text — anything else is nothing. */
const text = (v: unknown): string => (typeof v === "string" ? v : "");
/** A posted body as a bag of unknowns. */
const bag = (v: unknown): Record<string, unknown> => (v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

/** The book changed: the contacts page shows it on its next render. A failure here is the smaller harm. */
function bookChanged(): void {
  try {
    revalidatePath("/admin/contacts");
  } catch {
    /* written; a stale list is the smaller harm */
  }
}

/* ═══ 1 · OPEN, STAGE, VIEW, DISCARD — U29b's core, its browser face ═══════════════════════════════════ */

/** Open a run for a file — or adopt the officer's open run when it is the same file read the same way (X18). */
export async function openImportAction(input: OpenImportInput): Promise<OpenImportResult> {
  const g = await gate("contacts.import.open");
  if (!g.ok) return g.refusal;
  const rate = await rateCheckAsync(g.userId, "contacts.import");
  if (!rate.allowed) return limited(rate.retryAfterSec);
  try {
    const r = await openContactImport(g.userId, input);
    if (!r.ok) return await importRefusalOf(g.userId, r);
    return { ok: true, adopted: r.adopted, view: await importRunViewOf(g.userId, r.view) };
  } catch (err) {
    return recordImportFailure(g.userId, "stage", null, "open", err);
  }
}

/** One staging batch — at most 2,000 rows and 200 KB, from the ordinal the run asks for next. */
export async function stageImportRowsAction(input: StageImportInput): Promise<StageImportResult> {
  const g = await gate("contacts.import.stage");
  if (!g.ok) return g.refusal;
  const rate = await rateCheckAsync(g.userId, "contacts.import.step");
  if (!rate.allowed) return limited(rate.retryAfterSec);
  try {
    const r = await stageContactRows(g.userId, input);
    if (!r.ok) return await importRefusalOf(g.userId, r);
    return { ok: true, view: await importRunViewOf(g.userId, r.view) };
  } catch (err) {
    return recordImportFailure(g.userId, "stage", null, "stage", err);
  }
}

/** The officer's open run (no id) — THE resume read when the dialog opens — or one run by id (its creator or an ADMIN). */
export async function importViewAction(runId: string | null): Promise<ImportViewResult> {
  const g = await gate("contacts.import.view");
  if (!g.ok) return g.refusal;
  const rate = await rateCheckAsync(g.userId, "contacts.import.read");
  if (!rate.allowed) return limited(rate.retryAfterSec);
  try {
    const v = await contactImportView(g.userId, typeof runId === "string" ? runId : null);
    return { ok: true, view: v === null ? null : await importRunViewOf(g.userId, v) };
  } catch (err) {
    return recordImportFailure(g.userId, "stage", null, "view", err);
  }
}

/** Leave a run unimported BEFORE its start — its staged rows deleted. A started run is cancelled instead. */
export async function discardImportAction(runId: string): Promise<DiscardImportResult> {
  const g = await gate("contacts.import.discard");
  if (!g.ok) return g.refusal;
  const rate = await rateCheckAsync(g.userId, "contacts.import");
  if (!rate.allowed) return limited(rate.retryAfterSec);
  try {
    const r = await discardContactImport(g.userId, text(runId));
    if (!r.ok) return await importRefusalOf(g.userId, r);
    return { ok: true, rowsDeleted: r.rowsDeleted };
  } catch (err) {
    return recordImportFailure(g.userId, "stage", null, "discard", err);
  }
}

/** An Excel file, read on this server (U27b) — ONE at a time (`xlsx_busy` while another is read). */
export async function readXlsxImportAction(input: ReadXlsxInput): Promise<ReadXlsxResult> {
  const g = await gate("contacts.import.xlsx");
  if (!g.ok) return g.refusal;
  const rate = await rateCheckAsync(g.userId, "contacts.import.check");
  if (!rate.allowed) return limited(rate.retryAfterSec);
  try {
    const body = bag(input);
    const r = await readXlsxForOfficer(g.userId, { base64: text(body.base64), fileName: typeof body.fileName === "string" ? body.fileName : null });
    if (r.ok) return { ok: true, file: r.file };
    if (r.refusal === "busy") return { ok: false, reason: "xlsx_busy", message: IMPORT_REFUSAL_SENTENCES.xlsx_busy, view: null, retryAfterSec: 3 };
    return { ok: false, reason: "xlsx_refused", message: r.message, view: null };
  } catch (err) {
    return recordImportFailure(g.userId, "stage", null, "xlsx", err);
  }
}

/* ═══ 2 · THE CHECK AND THE CHANGES — they write nothing ═════════════════════════════════════════════ */

/** The pre-flight: five boxes that add up to the file, each choice's label, the in-book rows each would change. */
export async function checkImportAction(runId: string): Promise<PreflightResult> {
  const g = await gate("contacts.import.check");
  if (!g.ok) return g.refusal;
  const rate = await rateCheckAsync(g.userId, "contacts.import.check");
  if (!rate.allowed) return limited(rate.retryAfterSec);
  try {
    return await checkContactImport(g.userId, runId);
  } catch (err) {
    return recordImportFailure(g.userId, "check", null, "check", err);
  }
}

/** One page of the in-book rows a choice would change, in file order after a line. */
export async function importChangesAction(input: ChangesInput): Promise<ChangesResult> {
  const g = await gate("contacts.import.changes");
  if (!g.ok) return g.refusal;
  const rate = await rateCheckAsync(g.userId, "contacts.import.read");
  if (!rate.allowed) return limited(rate.retryAfterSec);
  try {
    return await contactImportChanges(g.userId, input);
  } catch (err) {
    return recordImportFailure(g.userId, "check", null, "changes", err);
  }
}

/** The lists an import can add to — the Lists card's, with their member figure and whether their basis is in force. */
export async function importListsAction(): Promise<ImportListsResult> {
  const g = await gate("contacts.import.lists");
  if (!g.ok) return g.refusal;
  const rate = await rateCheckAsync(g.userId, "contacts.import.read");
  if (!rate.allowed) return limited(rate.retryAfterSec);
  try {
    return await importListOptions(g.userId);
  } catch (err) {
    return recordImportFailure(g.userId, "commit", null, "lists", err);
  }
}

/* ═══ 3 · THE START AND THE COMMIT LOOP ════════════════════════════════════════════════════════════════ */

/** Freeze the decision — the choice, the exceptions, the list — after the server decided the whole run again. */
export async function startImportAction(input: StartImportInput): Promise<StartImportResult> {
  const g = await gate("contacts.import.start");
  if (!g.ok) return g.refusal;
  const rate = await rateCheckAsync(g.userId, "contacts.import");
  if (!rate.allowed) return limited(rate.retryAfterSec);
  try {
    return await startContactImport(g.userId, input);
  } catch (err) {
    return recordImportFailure(g.userId, "commit", null, "start", err);
  }
}

/** One commit step: at most 500 rows, ONE transaction, compare-and-set on the cursor; `busy` while bets queue. */
export async function commitImportStepAction(input: CommitStepInput): Promise<CommitStepResult> {
  const g = await gate("contacts.import.step");
  if (!g.ok) return g.refusal;
  const rate = await rateCheckAsync(g.userId, "contacts.import.step");
  if (!rate.allowed) return limited(rate.retryAfterSec);
  let result: CommitStepResult;
  try {
    result = await commitContactImportStep(g.userId, input);
  } catch (err) {
    return recordImportFailure(g.userId, "commit", null, "step", err);
  }
  if (result.ok && result.kind === "done") bookChanged();
  return result;
}

/** Stop a commit after the step in flight (X18: who and when are recorded). */
export async function pauseImportAction(input: RunActInput): Promise<RunActResult> {
  const g = await gate("contacts.import.pause");
  if (!g.ok) return g.refusal;
  const rate = await rateCheckAsync(g.userId, "contacts.import");
  if (!rate.allowed) return limited(rate.retryAfterSec);
  try {
    return await pauseContactImport(g.userId, input);
  } catch (err) {
    return recordImportFailure(g.userId, "commit", null, "pause", err);
  }
}

/** Carry a paused commit on from its cursor. */
export async function resumeImportAction(input: RunActInput): Promise<RunActResult> {
  const g = await gate("contacts.import.resume");
  if (!g.ok) return g.refusal;
  const rate = await rateCheckAsync(g.userId, "contacts.import");
  if (!rate.allowed) return limited(rate.retryAfterSec);
  try {
    return await resumeContactImport(g.userId, input);
  } catch (err) {
    return recordImportFailure(g.userId, "commit", null, "resume", err);
  }
}

/** Leave the rest unimported — before the start, a discard; after it, the rows already written stay. */
export async function cancelImportAction(input: RunActInput): Promise<RunActResult> {
  const g = await gate("contacts.import.cancel");
  if (!g.ok) return g.refusal;
  const rate = await rateCheckAsync(g.userId, "contacts.import");
  if (!rate.allowed) return limited(rate.retryAfterSec);
  let result: RunActResult;
  try {
    result = await cancelContactImport(g.userId, input);
  } catch (err) {
    return recordImportFailure(g.userId, "commit", null, "cancel", err);
  }
  if (result.ok && result.view.totals.create + result.view.totals.update > 0) bookChanged();
  return result;
}

/* ═══ 4 · THE FAILURES AND THE RESULT ══════════════════════════════════════════════════════════════════ */

/** The rows that could not be imported, a page at a time, by file row, each with its one sentence. */
export async function importFailuresAction(input: FailuresInput): Promise<FailuresResult> {
  const g = await gate("contacts.import.failures");
  if (!g.ok) return g.refusal;
  const rate = await rateCheckAsync(g.userId, "contacts.import.read");
  if (!rate.allowed) return limited(rate.retryAfterSec);
  try {
    return await contactImportFailures(g.userId, input);
  } catch (err) {
    return recordImportFailure(g.userId, "commit", null, "failures", err);
  }
}

/** The result: the run, its kept rows split by reason for a viewer who may read numbers, and the list's state. */
export async function importResultAction(runId: string): Promise<ImportResultResult> {
  const g = await gate("contacts.import.result");
  if (!g.ok) return g.refusal;
  const rate = await rateCheckAsync(g.userId, "contacts.import.read");
  if (!rate.allowed) return limited(rate.retryAfterSec);
  try {
    return await contactImportResult(g.userId, runId);
  } catch (err) {
    return recordImportFailure(g.userId, "commit", null, "result", err);
  }
}

/* ═══ 5 · AN ADMIN'S WAY TO OTHER OFFICERS' UNFINISHED RUNS (S15-12) ════════════════════════════════════════ */

/** The runs other officers left unfinished, newest first, at most 20 — ⛔ an ADMIN by the STORED role only (the core
 *  refuses anyone else `forbidden`); each is resumed through `importViewAction(runId)` or cancelled. */
export async function importOpenRunsAction(): Promise<ImportOpenRunsResult> {
  const g = await gate("contacts.import.open_runs");
  if (!g.ok) return g.refusal;
  const rate = await rateCheckAsync(g.userId, "contacts.import.read");
  if (!rate.allowed) return limited(rate.retryAfterSec);
  try {
    return await importOpenRuns(g.userId);
  } catch (err) {
    return recordImportFailure(g.userId, "commit", null, "open_runs", err);
  }
}
