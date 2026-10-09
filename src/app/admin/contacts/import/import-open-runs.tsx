"use client";

/**
 * ⭐ S15-12 (R2b) · UNFINISHED IMPORTS BY OTHER OFFICERS — an ADMIN's way to them, at the entrance.
 *                                       (S15 · the review round, 2026-10-09 · docs/CONTACTS-SCREEN-PLAN.md §4.3, S15-9, S15-12)
 *
 * ⭐ NOBODY IS EVER STUCK, MADE REACHABLE (X18): the dialog asks `importOpenRunsAction()` once per opening, and the server
 * answers an ADMIN alone (anyone else is refused `forbidden`) with the runs other officers left STAGING, STAGED,
 * COMMITTING or PAUSED, newest first. Refused, failed or empty, this renders NOTHING — it is a way in for the one role
 * that has it, never a message to anyone else.
 * ⭐ EACH RUN says who started it and when, and how far it got — in the SERVER's figures — with its two ways on: Resume
 * (the dialog adopts the run through `importViewAction(runId)` and carries on the loop its status needs: the upload, the
 * check, or the commit) and the existing confirmation for leaving it — Discard before the start (nothing is in the book
 * yet), Cancel the rest after it (R5: the contacts written stay; the rows not reached are not imported).
 * ⛔ The actions are the dialog's: this list is handed functions, and its controls wait while one is in flight.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/modal";
import { useActDisabledReason, useMayAct } from "@/components/admin/act-gate";
import type { ImportRunView } from "@/lib/contacts/import-flow";
import { ADOPT, CHECK, COMMIT, OTHERS, whenText, type Part } from "./import-copy";
import { Parts, SectionHeading } from "./import-parts";

/** The admin's list as the dialog holds it: still being read, nothing to show (refused, failed or empty), or the runs. */
export type OthersState =
  | { readonly kind: "loading" }
  | { readonly kind: "none" }
  | { readonly kind: "ready"; readonly runs: readonly ImportRunView[] };

/** A run that has written to the book is cancelled; one that has not is discarded. */
const hasStarted = (run: ImportRunView): boolean => run.status === "COMMITTING" || run.status === "PAUSED";

export function ImportOpenRuns({
  state, acting, when, onResume, onLeave,
}: {
  state: OthersState;
  /** The run a request is in flight for, or null — every control waits while one is. */
  acting: string | null;
  /** An instant as the platform prints it (`formatDateTime`), or null when it cannot be read. */
  when: (iso: string | null) => string | null;
  onResume: (run: ImportRunView) => void;
  /** Discard (before the start) or cancel the rest (after it) — the dialog picks the action by the run's status. */
  onLeave: (run: ImportRunView) => void;
}) {
  const mayAct = useMayAct();
  const actReason = useActDisabledReason();
  const [asking, setAsking] = useState<ImportRunView | null>(null);
  if (state.kind !== "ready" || state.runs.length === 0) return null;

  return (
    <section className="space-y-3 rounded-md border border-border-subtle p-3" data-import-others={state.runs.length} aria-label={OTHERS.heading}>
      <SectionHeading>{OTHERS.heading}</SectionHeading>
      <p className="text-body-sm text-text-secondary">{OTHERS.lead}</p>
      <ul className="space-y-3">
        {state.runs.map((run) => {
          const started = hasStarted(run);
          const status: readonly Part[] = run.status === "STAGING"
            ? ADOPT.staging(run.stagedThrough, run.totalRows)
            : run.status === "STAGED"
              ? ADOPT.staged(run.totalRows)
              : ADOPT.committing(run.committedThrough, run.stagedThrough);
          return (
            <li
              key={run.id}
              className="space-y-1 border-t border-border-subtle pt-3 first:border-t-0 first:pt-0"
              data-import-other-run={run.id}
              data-run-status={run.status}
            >
              <p className="break-words text-body-sm font-semibold text-text">{ADOPT.file(run.format === "paste", run.fileName)}</p>
              <p className="text-body-sm text-text-secondary">{ADOPT.startedBy(run.startedBy, whenText(when(run.createdAt)))}</p>
              {run.status === "PAUSED" && run.pausedBy !== null && (
                <p className="text-body-sm text-text-secondary">{ADOPT.paused(run.pausedBy, whenText(when(run.pausedAt)))}</p>
              )}
              <p className="text-body-sm text-text"><Parts parts={status} /></p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={acting !== null || !mayAct}
                  title={actReason}
                  onClick={() => setAsking(run)}
                  data-import-act={started ? "other-cancel-rest" : "other-discard"}
                >
                  {started ? ADOPT.cancelRest : ADOPT.discard}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  loading={acting === run.id}
                  disabled={acting !== null || !mayAct}
                  title={actReason}
                  onClick={() => onResume(run)}
                  data-import-act="other-resume"
                >
                  {OTHERS.resume}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <ConfirmModal
        open={asking !== null && !hasStarted(asking)}
        onClose={() => setAsking(null)}
        onConfirm={() => {
          const run = asking;
          setAsking(null);
          if (run !== null) onLeave(run);
        }}
        title={CHECK.discardTitle}
        body={<span data-import-confirm="discard"><Parts parts={CHECK.discardBody(asking?.stagedThrough ?? 0)} /></span>}
        confirmLabel={CHECK.discardConfirm}
        tone="claret"
      />
      <ConfirmModal
        open={asking !== null && hasStarted(asking)}
        onClose={() => setAsking(null)}
        onConfirm={() => {
          const run = asking;
          setAsking(null);
          if (run !== null) onLeave(run);
        }}
        title={COMMIT.cancelTitle}
        body={
          <span data-import-confirm="cancel-rest">
            <Parts
              parts={COMMIT.cancelBody(
                asking === null ? 0 : asking.totals.create + asking.totals.update,
                asking === null ? 0 : Math.max(0, asking.stagedThrough - asking.committedThrough),
              )}
            />
          </span>
        }
        confirmLabel={COMMIT.cancelConfirm}
        cancelLabel={COMMIT.cancelKeep}
        tone="claret"
      />
    </section>
  );
}
