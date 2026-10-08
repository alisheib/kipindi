"use client";

/**
 * STEP 4 · IMPORTING (`import-commit`) — the bar, Stop, and a paused import's Resume and Cancel the rest.
 *                                                (S15 · C4, 2026-10-09 · docs/CONTACTS-SCREEN-PLAN.md §4.2 step 9)
 *
 * ⛔ THE BAR IS THE SERVER'S CURSOR (import-loop.ts, property 1): its value is the latest answer's `committedThrough` of
 * the run's `stagedThrough`, "1,847 of 5,912 rows done" — never a timer, never a number this tab moved on its own. It is
 * the ONLY motion of a running import: no spinner beside it, and a phone set to reduce motion sees it jump, not slide.
 * ⭐ BETS COME FIRST: while the betting engine is busy the import waits, and says so under the bar — how long, and which
 * try of how many. Stop is read between steps: the run is paused on the server, then the loop stops.
 * ⭐ PAUSED (by this tab, by another officer, or left by a closed window): who and when, how far, Resume — and Cancel the
 * rest, whose confirmation names both numbers: what is done stays in the book, the rest is not imported (S15-9).
 * ⛔ While rows are being written the dialog cannot be dismissed by a stray click or key, and leaving the page asks first.
 */
import { useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/modal";
import { ProgressBar } from "@/components/ui/progress-bar";
import { UnsavedChangesGuard } from "@/components/ui/unsaved-changes";
import { useActDisabledReason, useMayAct } from "@/components/admin/act-gate";
import type { ImportRunView } from "@/lib/contacts/import-flow";
import type { BusyState } from "@/lib/contacts/import-loop";
import { COMMIT, partsText, whenText } from "./import-copy";
import { ActionsRow, ImportAlert, Parts, type ImportAlertState } from "./import-parts";

export type CommitMode =
  | { readonly kind: "importing"; readonly view: ImportRunView; readonly busy: BusyState | null; readonly stopping: boolean }
  | { readonly kind: "paused"; readonly view: ImportRunView; readonly acting: boolean };

export function ImportCommitPanel({
  mode, alert, when, onStop, onResume, onCancelRest, focusRef,
}: {
  mode: CommitMode;
  alert: ImportAlertState | null;
  when: (iso: string | null) => string | null;
  onStop: () => void;
  onResume: () => void;
  onCancelRest: () => void;
  focusRef: RefObject<HTMLButtonElement | null>;
}) {
  const mayAct = useMayAct();
  const actReason = useActDisabledReason();
  const [asking, setAsking] = useState(false);
  const view = mode.view;
  const done = view.committedThrough;
  const total = view.stagedThrough;
  const caption = COMMIT.caption(done, total);
  const importing = mode.kind === "importing";
  const acting = mode.kind === "paused" && mode.acting;

  return (
    <div className="space-y-4" data-block="import-commit" data-state={mode.kind} data-done={done} data-total={total}>
      <ProgressBar
        value={done}
        max={total}
        label={COMMIT.label}
        caption={<Parts parts={caption} />}
        captionText={partsText(caption)}
      />

      {importing && (
        <>
          <p className="text-body-sm text-text-secondary">{COMMIT.betsFirst}</p>
          {mode.busy !== null && (
            <p className="text-body-sm text-text" role="status" data-import-busy>
              <Parts parts={COMMIT.busy(mode.busy.attempt, mode.busy.of, mode.busy.waitSec)} />
            </p>
          )}
          {mode.stopping && <p className="text-body-sm text-text-secondary" role="status">{COMMIT.stopping}</p>}
        </>
      )}

      {mode.kind === "paused" && (
        <div className="space-y-1 text-body-sm text-text-secondary" data-import-paused>
          {view.status === "PAUSED" && view.pausedBy !== null
            ? <p>{COMMIT.pausedBy(view.pausedBy, whenText(when(view.pausedAt)))}</p>
            : <p>{COMMIT.stoppedHere}</p>}
          <p className="text-text"><Parts parts={COMMIT.progress(done, total)} /></p>
        </div>
      )}

      {alert !== null && <ImportAlert alert={alert} disabled={acting} />}

      {importing ? (
        <ActionsRow>
          <Button
            ref={focusRef}
            type="button"
            size="md"
            variant="ghost"
            disabled={mode.stopping || !mayAct}
            title={actReason}
            onClick={onStop}
            data-import-act="stop"
          >
            {COMMIT.stop}
          </Button>
        </ActionsRow>
      ) : (
        <ActionsRow>
          <Button
            type="button"
            size="md"
            variant="ghost"
            disabled={acting || !mayAct}
            title={actReason}
            onClick={() => setAsking(true)}
            data-import-act="cancel-rest"
          >
            {COMMIT.cancelRest}
          </Button>
          <Button
            ref={focusRef}
            type="button"
            size="md"
            variant="primary"
            loading={acting}
            disabled={!mayAct}
            title={actReason}
            onClick={onResume}
            data-import-act="resume"
          >
            {COMMIT.resume}
          </Button>
        </ActionsRow>
      )}

      <ConfirmModal
        open={asking}
        onClose={() => setAsking(false)}
        onConfirm={() => {
          setAsking(false);
          onCancelRest();
        }}
        title={COMMIT.cancelTitle}
        body={<span data-import-confirm="cancel-rest"><Parts parts={COMMIT.cancelBody(done, Math.max(0, total - done))} /></span>}
        confirmLabel={COMMIT.cancelConfirm}
        cancelLabel={COMMIT.cancelKeep}
        tone="claret"
      />

      <UnsavedChangesGuard dirty={importing && !mode.stopping} body={COMMIT.guardBody} />
    </div>
  );
}
