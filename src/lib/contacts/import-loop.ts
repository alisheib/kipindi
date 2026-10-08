/**
 * THE IMPORT'S ONE DRIVER — the upload loop and the commit loop, pure, with the server's actions handed in.
 *                                                (S15 · C3–C4, 2026-10-09 · docs/CONTACTS-SCREEN-PLAN.md §4.2 steps 5 and 9)
 *
 * ⭐ WHY ONE DRIVER, AND WHY PURE. Both loops are the same shape — ask the server to take the next piece, adopt the run
 * it answers with, go on from where IT says the run stands — and both must survive a closed tab, a dropped connection, a
 * 524 from the edge, a second tab and a deploy. So the rules live once, here, with the actions injected: the dialog passes
 * the real server actions, and `scripts/contacts-import/flow.mts` passes stubs and plants each defect below in memory.
 *
 * ── THE UPLOAD (step 5) ─────────────────────────────────────────────────────────────────────────────
 *   · each batch is `packStageBatches`' greedy batch from the run's `nextFrom` (≤ 2,000 rows and ≤ 200 KB); the server's
 *     view is adopted after EVERY answer, so a reload resumes at the server's cursor, never at a number this tab kept;
 *   · `already_staged` (a batch that landed before — a retried call) asks the view again and carries on from its
 *     `nextFrom`; ⭐ a STAGED view is success even when this batch's own answer was a refusal (a retried LAST batch).
 *
 * ── THE COMMIT (step 9) — the properties the server's suite and the lead hold it to ───────────────────
 *   1. ⛔ THE BAR IS THE SERVER'S CURSOR. The only number this loop hands the screen is the latest answer's view —
 *      `committedThrough` as the server counted it: never a timer, never "cursor plus a batch" before the answer arrives.
 *   2. ⭐ STOP IS READ BETWEEN STEPS: the run is PAUSED on the server first, then the loop stops (a closed window that
 *      cannot pause leaves a COMMITTING run that the next opening adopts).
 *   3. ⛔ A REFUSAL ENDS THE LOOP WITH THE SERVER'S SENTENCE, VERBATIM — the refusal itself is returned.
 *   4. ⭐ ONLY `busy` IS RETRIED ON ITS OWN, at most `BUSY_RETRIES` times in a row, each after the `retryAfterSec` the
 *      server asked for: bets come first, and an import waits rather than competes.
 *   5. ⛔ A THROWN CALL IS NEVER REPEATED BLIND. After a network failure, an edge timeout or a deploy, the step may or may
 *      not have landed, so the next call is the VIEW; the loop goes on from the cursor the server reports (the step is a
 *      compare-and-set on it, so nothing is written twice), and a deploy — a stale action id — is named as such.
 *   6. ⭐ `moved` (another tab or officer settled those rows) adopts the server's view and counts NOTHING itself.
 *   7. ⭐ A RESUME STARTS FROM THE SERVER'S CURSOR — the view it is given, never a number this tab held.
 *   8. ⭐ THE RESULT'S COUNTS ARE THE SERVER'S: the loop ends with the server's last view; the totals are its rows (OD26).
 * ⛔ A LOOP THAT STOPS MOVING STOPS: `STALL_LIMIT` answers in a row that do not move the cursor end it as `stalled`, so a
 * server that answers "advanced" without advancing can never spin a tab forever.
 *
 * ⛔ PURE AND CLIENT-SAFE: types from import-flow.ts and the packer from import-limits.ts — no React, no directive, no
 * src/lib/server, no src/app (the actions arrive as arguments), no timer of its own (`wait` is injected).
 */
import { STAGE_BATCH_MAX_ROWS, packStageBatches, type StageRowInput } from "./import-limits";
import type {
  CommitStepInput,
  CommitStepResult,
  ImportRefusal,
  ImportRunView,
  ImportViewResult,
  RunActInput,
  RunActResult,
  StageImportInput,
  StageImportResult,
} from "./import-flow";

/** How many `busy` answers in a row are waited out before the loop stops and says so. */
export const BUSY_RETRIES = 3;
/** How many thrown calls in a row are recovered through the view before the loop stops (the run stays resumable). */
export const THROWN_RECOVERIES = 3;
/** How many answers in a row may leave the cursor where it was before the loop stops as `stalled`. */
export const STALL_LIMIT = 3;
/** The wait when a `busy` answer names none, and the longest wait ever taken. */
export const BUSY_WAIT_DEFAULT_SEC = 5;
export const BUSY_WAIT_MAX_SEC = 60;

/** The seconds to wait out a `busy` answer: the server's own figure, whole, between 1 and the ceiling. */
export function waitSeconds(asked: number | undefined): number {
  if (typeof asked !== "number" || !Number.isFinite(asked) || asked <= 0) return BUSY_WAIT_DEFAULT_SEC;
  return Math.min(BUSY_WAIT_MAX_SEC, Math.max(1, Math.ceil(asked)));
}

/**
 * ⭐ A DEPLOY, TOLD APART FROM A FAULT. After a deploy the page still holds the old build's action ids, and Next 16 throws
 * `UnrecognizedActionError` ("Server Action … was not found on the server") for every call. Nothing about the run is wrong
 * — a reload of the page carries on from the server's cursor — so the dialog says exactly that, and nothing else.
 */
export function isDeploySkewError(e: unknown): boolean {
  if (typeof e !== "object" || e === null) return false;
  const name = (e as { name?: unknown }).name;
  if (name === "UnrecognizedActionError") return true;
  const message = (e as { message?: unknown }).message;
  return typeof message === "string" && (/Server Action .{0,200}? was not found/i.test(message) || /Failed to find Server Action/i.test(message));
}

/** What a busy wait looks like to the screen — or null once the server answers something else. */
export type BusyState = { readonly attempt: number; readonly of: number; readonly waitSec: number };

/* ══ THE VIEW AFTER A THROW ═══════════════════════════════════════════════════════════════════════ */

type ViewAfter =
  | { readonly kind: "view"; readonly view: ImportRunView }
  | { readonly kind: "gone" }
  | { readonly kind: "refused"; readonly refusal: ImportRefusal }
  | { readonly kind: "failed"; readonly skew: boolean };

/** ⛔ Property 5 — the one call after a thrown one: where does the run stand? A throw here too is a failure (a deploy
 *  when either throw says so); a run that is gone is gone; a refusal (the gate) is the server's sentence. */
async function viewAfter(
  ask: (id: string) => Promise<ImportViewResult>, id: string, cause: unknown, isSkew: (e: unknown) => boolean,
): Promise<ViewAfter> {
  try {
    const r = await ask(id);
    if (!r.ok) return { kind: "refused", refusal: r };
    return r.view === null ? { kind: "gone" } : { kind: "view", view: r.view };
  } catch (e) {
    return { kind: "failed", skew: isSkew(cause) || isSkew(e) };
  }
}

/* ══ THE UPLOAD ═══════════════════════════════════════════════════════════════════════════════════ */

export type UploadDeps = {
  readonly stage: (input: StageImportInput) => Promise<StageImportResult>;
  readonly view: (importId: string) => Promise<ImportViewResult>;
  readonly isDeploySkew: (e: unknown) => boolean;
  /** Read before every batch: true stops the upload where the server's cursor stands (the run stays STAGING). */
  readonly shouldStop: () => boolean;
  /** Every view the server answers with — the upload bar's only source (`stagedThrough` of `totalRows`). */
  readonly onView: (view: ImportRunView) => void;
  readonly onBusy: (state: BusyState | null) => void;
  readonly wait: (ms: number) => Promise<void>;
};

export type UploadOutcome =
  /** Every record is staged: the check comes next. */
  | { readonly kind: "staged"; readonly view: ImportRunView }
  /** Stopped between batches at the officer's word; the run stays STAGING and resumes from the same file. */
  | { readonly kind: "stopped"; readonly view: ImportRunView }
  /** The run is past staging (another tab started it) or ended: the caller routes on the view's status. */
  | { readonly kind: "elsewhere"; readonly view: ImportRunView }
  /** The server refused: its sentence, verbatim. */
  | { readonly kind: "refused"; readonly refusal: ImportRefusal }
  | { readonly kind: "stalled"; readonly view: ImportRunView }
  | { readonly kind: "gone" }
  /** Thrown calls the view could not recover from — `skew` when a deploy left this page with stale action ids. */
  | { readonly kind: "failed"; readonly skew: boolean; readonly view: ImportRunView | null };

/** The batch that starts at `from` (1-based, the run's `nextFrom`): `packStageBatches`' first batch over at most one
 *  batch's worth of rows — the same greedy batch the whole sequence would pack, without re-packing the rest of the file. */
export function batchFrom(rows: readonly StageRowInput[], from: number): StageRowInput[] {
  const start = from - 1;
  if (!Number.isSafeInteger(start) || start < 0 || start >= rows.length) return [];
  return packStageBatches(rows.slice(start, start + STAGE_BATCH_MAX_ROWS))[0] ?? [];
}

function endUpload(after: Exclude<ViewAfter, { kind: "view" }>, view: ImportRunView): UploadOutcome {
  if (after.kind === "gone") return { kind: "gone" };
  if (after.kind === "refused") return { kind: "refused", refusal: after.refusal };
  return { kind: "failed", skew: after.skew, view };
}

/**
 * ⭐ STAGE A PARSED FILE, batch by batch, from the run's own `nextFrom`. `rows` is `stageRowsOf(file, mapping, headerRows)`
 * — the ONE sequence a file is staged in, so its ordinals are the same on every re-read (a reload resumes mid-file).
 */
export async function runUpload(deps: UploadDeps, rows: readonly StageRowInput[], start: ImportRunView): Promise<UploadOutcome> {
  let view = start;
  let thrown = 0;
  let stalls = 0;
  let busy = 0;
  deps.onView(view);
  /** Adopt the server's view; false once STALL_LIMIT answers in a row have not moved the cursor. A view read after a
   *  THROW is not an answer to a batch, so it is adopted without counting (the throw counter bounds that path). */
  const adopt = (next: ImportRunView, counts: boolean): boolean => {
    const moved = next.stagedThrough > view.stagedThrough || next.status !== view.status;
    view = next;
    deps.onView(view);
    if (counts) stalls = moved ? 0 : stalls + 1;
    return stalls < STALL_LIMIT;
  };
  for (;;) {
    if (view.status === "STAGED") return { kind: "staged", view };
    if (view.status !== "STAGING" || view.nextFrom === null) return { kind: "elsewhere", view };
    if (deps.shouldStop()) return { kind: "stopped", view };
    const from = view.nextFrom;
    const batch = batchFrom(rows, from);
    if (batch.length === 0) return { kind: "stalled", view };
    let answer: StageImportResult;
    try {
      answer = await deps.stage({ importId: view.id, fileDigest: view.fileDigest, from, rows: batch });
    } catch (e) {
      // ⛔ NEVER A BLIND REPEAT: a thrown call may have landed — ask the server where the run stands first.
      const after = await viewAfter(deps.view, view.id, e, deps.isDeploySkew);
      if (after.kind !== "view") return endUpload(after, view);
      thrown++;
      adopt(after.view, false);
      if (thrown >= THROWN_RECOVERIES) return { kind: "failed", skew: false, view };
      continue;
    }
    thrown = 0;
    if (answer.ok) {
      if (busy > 0) deps.onBusy(null);
      busy = 0;
      if (!adopt(answer.view, true)) return { kind: "stalled", view };
      continue;
    }
    if (answer.reason === "already_staged") {
      // ⭐ A RETRIED CALL: the batch landed before. Read where the run stands, and carry on from ITS nextFrom.
      const after = await viewAfter(deps.view, view.id, null, deps.isDeploySkew);
      if (after.kind !== "view") return endUpload(after, view);
      if (!adopt(after.view, true)) return { kind: "stalled", view };
      continue;
    }
    if (answer.reason === "busy") {
      busy++;
      if (answer.view !== null) {
        view = answer.view;
        deps.onView(view);
      }
      if (busy > BUSY_RETRIES) return { kind: "refused", refusal: answer };
      const sec = waitSeconds(answer.retryAfterSec);
      deps.onBusy({ attempt: busy, of: BUSY_RETRIES, waitSec: sec });
      await deps.wait(sec * 1000);
      continue;
    }
    // ⭐ A STAGED VIEW IS SUCCESS, whatever this batch's own answer said: a retried LAST batch is refused while the run it
    // belongs to is complete.
    if (answer.view !== null && answer.view.status === "STAGED") {
      view = answer.view;
      deps.onView(view);
      return { kind: "staged", view };
    }
    if (answer.view !== null) deps.onView(answer.view);
    return { kind: "refused", refusal: answer };
  }
}

/* ══ THE COMMIT ═══════════════════════════════════════════════════════════════════════════════════ */

export type CommitDeps = {
  readonly step: (input: CommitStepInput) => Promise<CommitStepResult>;
  readonly view: (runId: string) => Promise<ImportViewResult>;
  readonly pause: (input: RunActInput) => Promise<RunActResult>;
  readonly isDeploySkew: (e: unknown) => boolean;
  /** ⭐ Property 2 — read BETWEEN steps; true pauses the run on the server, then the loop stops. */
  readonly shouldStop: () => boolean;
  /** ⛔ Property 1 — every view the server answers with, and nothing else: the bar's only source. */
  readonly onView: (view: ImportRunView) => void;
  /** Property 4 — a busy wait begins (its attempt, of how many, for how long), or ends (null). */
  readonly onBusy: (state: BusyState | null) => void;
  readonly wait: (ms: number) => Promise<void>;
};

export type CommitOutcome =
  /** The run finished; `note` is the server's own sentence when it said so as a refusal ("This import has finished."). */
  | { readonly kind: "done"; readonly view: ImportRunView; readonly note: string | null }
  /** Paused on the server at this tab's Stop. */
  | { readonly kind: "stopped"; readonly view: ImportRunView }
  /** The run is no longer COMMITTING (paused or cancelled elsewhere), as a VIEW reported it: route on its status. */
  | { readonly kind: "halted"; readonly view: ImportRunView }
  /** ⛔ Property 3 — the server's refusal, verbatim. */
  | { readonly kind: "refused"; readonly refusal: ImportRefusal }
  | { readonly kind: "stalled"; readonly view: ImportRunView }
  | { readonly kind: "gone" }
  /** ⛔ Property 5 — thrown calls the view could not recover from; `skew` names a deploy. The run stays resumable. */
  | { readonly kind: "failed"; readonly skew: boolean; readonly view: ImportRunView | null };

function endCommit(after: Exclude<ViewAfter, { kind: "view" }>, view: ImportRunView): CommitOutcome {
  if (after.kind === "gone") return { kind: "gone" };
  if (after.kind === "refused") return { kind: "refused", refusal: after.refusal };
  return { kind: "failed", skew: after.skew, view };
}

/** ⭐ Property 2 — pause first, then stop. A pause that throws is checked against the view: PAUSED is stopped; a run
 *  still COMMITTING is a failure the screen says (nothing drives it now, and it resumes from the server's cursor). */
async function pauseThenStop(deps: CommitDeps, view: ImportRunView): Promise<CommitOutcome> {
  try {
    const r = await deps.pause({ runId: view.id });
    if (r.ok) {
      deps.onView(r.view);
      return { kind: "stopped", view: r.view };
    }
    if (r.view !== null) {
      deps.onView(r.view);
      if (r.view.status === "PAUSED") return { kind: "stopped", view: r.view };
      if (r.view.status === "DONE") return { kind: "done", view: r.view, note: r.message };
    }
    return { kind: "refused", refusal: r };
  } catch (e) {
    const after = await viewAfter(deps.view, view.id, e, deps.isDeploySkew);
    if (after.kind !== "view") return endCommit(after, view);
    deps.onView(after.view);
    if (after.view.status === "PAUSED") return { kind: "stopped", view: after.view };
    if (after.view.status === "DONE") return { kind: "done", view: after.view, note: null };
    return { kind: "failed", skew: false, view: after.view };
  }
}

/**
 * ⭐ COMMIT A STARTED RUN, step by step, from the server's cursor (`start.committedThrough` — property 7). `start` must be
 * the server's view of a COMMITTING run (a PAUSED one is resumed by its action first); any other status returns at once.
 */
export async function runCommit(deps: CommitDeps, start: ImportRunView): Promise<CommitOutcome> {
  let view = start;
  let busy = 0;
  let thrown = 0;
  let stalls = 0;
  deps.onView(view);
  /** Adopt the server's view; false once STALL_LIMIT answers in a row have not moved the cursor past `from`. A view read
   *  after a THROW (`from` null) is adopted without counting — the throw counter bounds that path. */
  const adopt = (next: ImportRunView, from: number | null): boolean => {
    view = next;
    deps.onView(view);
    if (from !== null) stalls = view.committedThrough > from || view.status !== "COMMITTING" ? 0 : stalls + 1;
    return stalls < STALL_LIMIT;
  };
  for (;;) {
    if (view.status === "DONE") return { kind: "done", view, note: null };
    if (view.status !== "COMMITTING") return { kind: "halted", view };
    if (deps.shouldStop()) return pauseThenStop(deps, view);
    const from = view.committedThrough;
    let answer: CommitStepResult;
    try {
      answer = await deps.step({ runId: view.id, fromCursor: from });
    } catch (e) {
      // ⛔ Property 5 — never a blind repeat: the VIEW is the next call, and the loop goes on from the cursor it reports.
      const after = await viewAfter(deps.view, view.id, e, deps.isDeploySkew);
      if (after.kind !== "view") return endCommit(after, view);
      thrown++;
      adopt(after.view, null);
      if (thrown >= THROWN_RECOVERIES) return { kind: "failed", skew: false, view };
      continue;
    }
    thrown = 0;
    if (answer.ok) {
      if (busy > 0) deps.onBusy(null);
      busy = 0;
      // ⭐ Properties 1 and 6 — the answer's view IS the progress; a "moved" answer is adopted and counts nothing.
      if (!adopt(answer.view, from)) return { kind: "stalled", view };
      // The answer's own view is asked: `adopt` replaced `view` inside a closure, which TypeScript's narrowing cannot see.
      if (answer.kind === "done" || answer.view.status === "DONE") return { kind: "done", view, note: null };
      continue;
    }
    if (answer.reason === "busy") {
      // ⭐ Property 4 — the only refusal waited out, and only BUSY_RETRIES times in a row.
      busy++;
      if (answer.view !== null) {
        view = answer.view;
        deps.onView(view);
      }
      if (busy > BUSY_RETRIES) return { kind: "refused", refusal: answer };
      const sec = waitSeconds(answer.retryAfterSec);
      deps.onBusy({ attempt: busy, of: BUSY_RETRIES, waitSec: sec });
      await deps.wait(sec * 1000);
      continue;
    }
    if (busy > 0) deps.onBusy(null);
    busy = 0;
    if (answer.reason === "moved" && answer.view !== null) {
      if (!adopt(answer.view, from)) return { kind: "stalled", view };
      continue;
    }
    if (answer.reason === "done" && answer.view !== null && answer.view.status === "DONE") {
      view = answer.view;
      deps.onView(view);
      return { kind: "done", view, note: answer.message };
    }
    if (answer.view !== null) deps.onView(answer.view);
    return { kind: "refused", refusal: answer };
  }
}
