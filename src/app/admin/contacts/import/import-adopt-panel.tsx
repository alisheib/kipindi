"use client";

/**
 * AN UNFINISHED IMPORT, FOUND ON OPEN (`import-adopt`) — S15 · C4, 2026-10-09 · docs/CONTACTS-SCREEN-PLAN.md §4.2 step 1.
 *
 * ⭐ NOBODY IS EVER STUCK (S15-9). The dialog asks the server for the officer's open run before anything else
 * (`importViewAction(null)`), and when there is one it opens ON it: who started it and when (X18), how far it got — in the
 * SERVER's figures — and the two ways on. Before the import has written anything (uploading, or uploaded and waiting) the
 * ways are Resume and Discard; once it has (importing, or paused) they are Resume and Cancel the rest.
 * ⛔ Cancelling after the start keeps what was written: the confirmation names both numbers before it is pressed — the
 * contacts written (added plus updated, R5) and the rows not reached yet.
 */
import { useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/modal";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useActDisabledReason, useMayAct } from "@/components/admin/act-gate";
import type { ImportRunView } from "@/lib/contacts/import-flow";
import { ADOPT, CHECK, COMMIT, partsText, whenText, type Part } from "./import-copy";
import { ActionsRow, ImportAlert, Parts, type ImportAlertState } from "./import-parts";

export function ImportAdoptPanel({
  view, alert, busy, when, onResume, onDiscard, onCancelRest, focusRef,
}: {
  view: ImportRunView;
  alert: ImportAlertState | null;
  /** A request about this run is in flight: every control waits. */
  busy: boolean;
  /** An instant as the platform prints it (`formatDateTime`), or null when it cannot be read. */
  when: (iso: string | null) => string | null;
  onResume: () => void;
  onDiscard: () => void;
  onCancelRest: () => void;
  focusRef: RefObject<HTMLButtonElement | null>;
}) {
  const mayAct = useMayAct();
  const actReason = useActDisabledReason();
  const [asking, setAsking] = useState<"discard" | "cancel" | null>(null);
  const started = view.status === "COMMITTING" || view.status === "PAUSED";
  const done = view.committedThrough;
  const total = view.stagedThrough;
  const startedLine = ADOPT.startedBy(view.startedBy, whenText(when(view.createdAt)));

  const status: readonly Part[] = view.status === "STAGING"
    ? ADOPT.staging(view.stagedThrough, view.totalRows)
    : view.status === "STAGED"
      ? ADOPT.staged(view.totalRows)
      : ADOPT.committing(done, total);

  return (
    <div className="space-y-4" data-block="import-adopt" data-run-status={view.status}>
      <p className="text-body-sm text-text-secondary">{ADOPT.lead}</p>
      <div className="space-y-1 rounded-md border border-border-subtle p-3">
        <p className="text-body font-semibold text-text break-words" data-import-file-name>{ADOPT.file(view.format === "paste", view.fileName)}</p>
        <p className="text-body-sm text-text-secondary">{startedLine}</p>
        {view.status === "PAUSED" && view.pausedBy !== null && (
          <p className="text-body-sm text-text-secondary">{ADOPT.paused(view.pausedBy, whenText(when(view.pausedAt)))}</p>
        )}
        <p className="text-body-sm text-text" data-import-adopt-status>
          <Parts parts={status} />
        </p>
      </div>

      {started && (
        <ProgressBar
          value={done}
          max={total}
          label={COMMIT.label}
          caption={<Parts parts={COMMIT.caption(done, total)} />}
          captionText={partsText(COMMIT.caption(done, total))}
        />
      )}

      {alert !== null && <ImportAlert alert={alert} disabled={busy} />}

      <ActionsRow>
        <Button
          type="button"
          size="md"
          variant="ghost"
          disabled={busy || !mayAct}
          title={actReason}
          onClick={() => setAsking(started ? "cancel" : "discard")}
          data-import-act={started ? "cancel-rest" : "discard"}
        >
          {started ? ADOPT.cancelRest : ADOPT.discard}
        </Button>
        <Button
          ref={focusRef}
          type="button"
          size="md"
          variant="primary"
          loading={busy}
          disabled={!mayAct}
          title={actReason}
          onClick={onResume}
          data-import-act="resume"
        >
          {ADOPT.resume}
        </Button>
      </ActionsRow>

      <ConfirmModal
        open={asking === "discard"}
        onClose={() => setAsking(null)}
        onConfirm={() => {
          setAsking(null);
          onDiscard();
        }}
        title={CHECK.discardTitle}
        body={<span data-import-confirm="discard"><Parts parts={CHECK.discardBody(view.stagedThrough)} /></span>}
        confirmLabel={CHECK.discardConfirm}
        tone="claret"
      />
      <ConfirmModal
        open={asking === "cancel"}
        onClose={() => setAsking(null)}
        onConfirm={() => {
          setAsking(null);
          onCancelRest();
        }}
        title={COMMIT.cancelTitle}
        body={<span data-import-confirm="cancel-rest"><Parts parts={COMMIT.cancelBody(view.totals.create + view.totals.update, Math.max(0, total - done))} /></span>}
        confirmLabel={COMMIT.cancelConfirm}
        cancelLabel={COMMIT.cancelKeep}
        tone="claret"
      />
    </div>
  );
}
