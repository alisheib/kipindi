"use client";

/**
 * STEP 3 · THE UPLOAD AND THE CHECK (`import-preflight`) — S15 · C3, 2026-10-09 · docs/CONTACTS-SCREEN-PLAN.md §4.2
 * steps 5–6.
 *
 * ⭐ UPLOADING: the bar counts rows STAGED, as the server reports them (`stagedThrough` of the run's `totalRows` — never a
 * number this tab kept), with "Nothing is in the contact book yet." under it and a Stop that ends the upload between
 * batches (the run stays resumable from the same file). While the platform is busy the server's own sentence says the
 * upload waits and carries on by itself (R6), and Stop stays live.
 * ⭐ THE CHECK: five boxes that ADD UP TO THE FILE — new to the book, already in the book, repeated in this file (the
 * first row wins), can't be imported as written (R14: a number that is not a mobile, a bad email, a name holding a
 * number — each row with its own sentence), could not be read — with the sum written out under them; each problem row
 * listed by its row in the officer's own spreadsheet and one plain sentence, "Showing 100 of 2,431" when the list is
 * capped. ⛔ C3b-fix · D5d · the sum never says "every row of your file is counted once" when a quotation mark never
 * closed swallowed lines: it says how many lines after that row were not read (`SumCut`, the dialog's). ⛔ Five boxes sit in one row only from `lg`, where each is wide enough for a six-figure count; below it they
 * take two or three columns, so a figure never runs out of its box.
 * ⛔ THE BOXES ARE SHOWN ONLY WHEN THEY ADD UP (`bucketsAdd`) — never a zero or a guess standing in for a count.
 * ⛔ D19 BY SHAPE (S15-2): there is no "has a 50pick account" box for any role — a player's number reads "already in the
 * book" like any other. Every number on this panel came from the server already masked (`+255••••NN`).
 * ⭐ A big file's check is a skeleton the size of the result; a small file never flashes a placeholder.
 */
import { useId, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ScrollX } from "@/components/ui/scroll-x";
import { UnsavedChangesGuard } from "@/components/ui/unsaved-changes";
import { SkBar } from "@/components/admin/admin-skeletons";
import { useMayAct } from "@/components/admin/act-gate";
import { PREFLIGHT_BUCKETS, type ImportRunView, type PreflightView } from "@/lib/contacts/import-flow";
import type { BusyState } from "@/lib/contacts/import-loop";
import { CHECK, COMMIT, UPLOAD, partsText, type SumCut } from "./import-copy";

/** The five boxes' grid: two columns on a phone, three from `md`, all five in a row only from `lg` (see the header). */
const TILE_GRID = "grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5";
import { ImportAlert, Parts, SectionHeading, Tile, type ImportAlertState } from "./import-parts";

/** At or past this many rows the check is shown as a skeleton while it runs; below it the upload panel simply stays. */
const SKELETON_FROM_ROWS = 5_000;

export type CheckMode =
  | { readonly kind: "uploading"; readonly view: ImportRunView; readonly busy: BusyState | null; readonly stopping: boolean }
  | { readonly kind: "checking"; readonly view: ImportRunView }
  | { readonly kind: "checked"; readonly view: ImportRunView; readonly preflight: PreflightView };

export function ImportCheckPanel({
  mode, cut, alert, onStopUpload, focusRef,
}: {
  mode: CheckMode;
  /** ⭐ C3b-fix · D5d · how the sum line ends: a quotation mark never closed swallowed lines (this tab read them), or the
   *  run's file was read elsewhere and may have — the dialog decides (`cutFor`). */
  cut: SumCut;
  alert: ImportAlertState | null;
  onStopUpload: () => void;
  focusRef: RefObject<HTMLHeadingElement | null>;
}) {
  const mayAct = useMayAct();
  const headingId = useId();
  const view = mode.view;

  return (
    <section className="space-y-4" data-block="import-preflight" data-state={mode.kind} aria-labelledby={headingId}>
      <h3 id={headingId} ref={focusRef} tabIndex={-1} className="font-display text-body font-bold text-text outline-none">
        {CHECK.heading}
      </h3>

      {mode.kind === "uploading" && (
        <div className="space-y-2" data-import-uploading>
          <ProgressBar
            value={view.stagedThrough}
            max={view.totalRows}
            label={UPLOAD.label}
            caption={<Parts parts={UPLOAD.caption(view.stagedThrough, view.totalRows)} />}
            captionText={partsText(UPLOAD.caption(view.stagedThrough, view.totalRows))}
          />
          <p className="text-body-sm text-text-secondary">{UPLOAD.nothingYet}</p>
          {mode.busy !== null && (
            <p className="text-body-sm text-text" role="status" data-import-busy={mode.busy.attempt} data-wait-sec={mode.busy.waitSec}>
              {`${mode.busy.message} ${COMMIT.busyStop}`}
            </p>
          )}
          {mode.stopping ? (
            <p className="text-body-sm text-text-secondary" role="status">{UPLOAD.stopping}</p>
          ) : (
            <div>
              <Button type="button" size="sm" variant="ghost" disabled={!mayAct} onClick={onStopUpload} data-import-act="stop-upload">
                {UPLOAD.stop}
              </Button>
            </div>
          )}
        </div>
      )}

      {mode.kind === "checking" && (
        view.totalRows >= SKELETON_FROM_ROWS ? (
          <div className="space-y-2" data-import-checking="skeleton" aria-busy="true">
            <p className="text-body-sm text-text-secondary" role="status">{CHECK.checking}</p>
            <div className={TILE_GRID}>
              {PREFLIGHT_BUCKETS.map((b) => <SkBar key={b} className="h-[78px] w-full rounded-md" />)}
            </div>
            <SkBar className="h-[18px] w-full max-w-[420px]" />
            <SkBar className="h-[120px] w-full rounded-md" />
          </div>
        ) : (
          <div className="space-y-2" data-import-checking="line">
            <ProgressBar
              value={view.stagedThrough}
              max={view.totalRows}
              label={UPLOAD.label}
              caption={<Parts parts={UPLOAD.caption(view.stagedThrough, view.totalRows)} />}
              captionText={partsText(UPLOAD.caption(view.stagedThrough, view.totalRows))}
            />
            <p className="text-body-sm text-text-secondary" role="status">{CHECK.checking}</p>
          </div>
        )
      )}

      {mode.kind === "checked" && <Checked preflight={mode.preflight} cut={cut} />}

      {alert !== null && <ImportAlert alert={alert} />}

      <UnsavedChangesGuard dirty={mode.kind === "uploading" && !mode.stopping} body={UPLOAD.guardBody} />
    </section>
  );
}

/** The five boxes, their sum, and the three lists — drawn only from a check whose counts add up. */
function Checked({ preflight, cut }: { preflight: PreflightView; cut: SumCut }) {
  const counts = PREFLIGHT_BUCKETS.map((b) => preflight.counts[b]);
  return (
    <div className="space-y-4" data-import-checked>
      <div className={TILE_GRID} data-import-tiles>
        {PREFLIGHT_BUCKETS.map((b) => <Tile key={b} name={b} label={CHECK.tiles[b]} value={preflight.counts[b]} />)}
      </div>
      <p className="text-body-sm text-text-secondary" data-import-sum data-import-sum-cut={cut === null ? "none" : cut === "unknown" ? "unknown" : cut.lines}>
        <Parts parts={CHECK.sum(counts, preflight.rows, cut)} />
      </p>
      <p className="text-body-sm font-semibold text-text" data-import-nothing-written>{CHECK.nothingWritten}</p>
      {preflight.counts.repeated > 0 && <p className="text-body-sm text-text-secondary">{CHECK.firstWins}</p>}

      {preflight.invalid.total > 0 && (
        <ProblemList heading={CHECK.invalidHeading} name="invalid" total={preflight.invalid.total} rows={preflight.invalid.rows} />
      )}
      {preflight.unreadable.total > 0 && (
        <ProblemList heading={CHECK.unreadableHeading} name="unreadable" total={preflight.unreadable.total} rows={preflight.unreadable.rows} />
      )}
      {preflight.repeated.total > 0 && (
        <div className="space-y-1.5" data-import-list="repeated">
          <ListHead heading={CHECK.repeatedHeading} shown={preflight.repeated.rows.length} total={preflight.repeated.total} />
          <ScrollX label={CHECK.repeatedHeading} className="max-h-[240px] overflow-y-auto">
            <table className="admin-tbl">
              <tbody>
                {preflight.repeated.rows.map((r) => (
                  <tr key={r.line} data-import-row={r.line}>
                    <td className="tabular whitespace-nowrap"><Parts parts={CHECK.repeats(r.line, r.firstLine)} /></td>
                    <td className="tabular whitespace-nowrap font-mono">{r.masked}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollX>
        </div>
      )}
    </div>
  );
}

/** A list's heading, and "Showing 100 of 2,431" when the server capped it. */
function ListHead({ heading, shown, total }: { heading: string; shown: number; total: number }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <SectionHeading>{heading}</SectionHeading>
      <span className="text-body-sm text-text-subtle" data-import-list-count={total}>
        <Parts parts={CHECK.showing(shown, total)} />
      </span>
    </div>
  );
}

/** Rows a check refused, each with its row in the officer's own file and ONE sentence (never the cell). */
function ProblemList({
  heading, name, total, rows,
}: {
  heading: string;
  name: string;
  total: number;
  rows: ReadonlyArray<{ line: number; sentence: string }>;
}) {
  return (
    <div className="space-y-1.5" data-import-list={name}>
      <ListHead heading={heading} shown={rows.length} total={total} />
      <ScrollX label={heading} className="max-h-[240px] overflow-y-auto">
        <table className="admin-tbl">
          <tbody>
            {rows.map((r) => (
              <tr key={r.line} data-import-row={r.line}>
                <td className="tabular whitespace-nowrap align-top"><Parts parts={CHECK.row(r.line)} /></td>
                <td className="align-top">{r.sentence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollX>
    </div>
  );
}
