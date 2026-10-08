"use client";

/**
 * THE RESULT (`import-done`) — S15 · C4, 2026-10-09 · docs/CONTACTS-SCREEN-PLAN.md §4.2 step 10.
 *
 * ⭐ FOUR TILES, THE SERVER'S COUNTS (OD26: counted from the run's rows, never added up here): Added · Updated · Kept as
 * they were · Couldn't be imported — and for a cancelled import, Not imported. The sum is written out only when the
 * server's counts add up to the rows staged; otherwise it is not written at all (never a guess).
 * ⛔ S15-3 · THE KEPT ROWS ARE SPLIT BY REASON ONLY FOR A VIEWER WHO MAY READ NUMBERS: the server sends the split for that
 * viewer alone (`KeptSplit`, OD54 — a stop per row is a player signal); everyone else reads one "kept as they were".
 * ⭐ S15-4 · HOW MANY PEOPLE HAD ANOTHER NUMBER that was not imported is said, when this tab read the file.
 * ⭐ The rows that could not be imported are listed a page at a time, each with its row and its sentence; "Show the
 * contacts this import added" opens the book filtered to this import (`?import=<run>`, the ONE href builder); the list
 * the contacts went on says whether its new members are covered for offers, and the way to its card when they are not.
 */
import { useEffect, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { ScrollX } from "@/components/ui/scroll-x";
import { extraNumbersNote } from "@/lib/contacts/import-read";
import type { FailuresResult, ImportResultView } from "@/lib/contacts/import-flow";
import { contactsHref } from "../contacts-query";
import { CHECK, DONE, IMPORT_CLOSE, LIST } from "./import-copy";
import { ActionsRow, ImportAlert, Parts, SectionHeading, Tile } from "./import-parts";

type Failures = {
  readonly rows: ReadonlyArray<{ line: number; sentence: string }>;
  readonly total: number | null;
  readonly next: number | null;
  readonly loading: boolean;
  readonly failed: boolean;
};

export function ImportDonePanel({
  result, extraNumbers, extraUnit, loadFailures, onClose, onOpenLists, focusRef,
}: {
  result: ImportResultView;
  /** S15-4 · people with another number not imported, as this tab read the file (0 when it did not read it). */
  extraNumbers: number;
  extraUnit: "card" | "line";
  loadFailures: (runId: string, afterLine: number) => Promise<FailuresResult>;
  onClose: () => void;
  onOpenLists: () => void;
  focusRef: RefObject<HTMLButtonElement | null>;
}) {
  const view = result.view;
  const t = view.totals;
  const cancelled = view.status === "CANCELLED";
  const [failures, setFailures] = useState<Failures>({ rows: [], total: null, next: 0, loading: false, failed: false });
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);

  const more = async (after: number) => {
    setFailures((f) => ({ ...f, loading: true, failed: false }));
    try {
      const r = await loadFailures(view.id, after);
      if (!live.current) return;
      if (!r.ok) {
        setFailures((f) => ({ ...f, loading: false, failed: true }));
        return;
      }
      setFailures((f) => {
        const seen = new Set(f.rows.map((x) => x.line));
        return { rows: [...f.rows, ...r.rows.filter((x) => !seen.has(x.line))], total: r.total, next: r.nextAfterLine, loading: false, failed: false };
      });
    } catch {
      if (live.current) setFailures((f) => ({ ...f, loading: false, failed: true }));
    }
  };

  const asked = useRef<string | null>(null);
  useEffect(() => {
    if (t.fail === 0 || asked.current === view.id) return;
    asked.current = view.id;
    void more(0);
    // A result is read once; "Show more" asks for the next page.
  }, [view.id, t.fail]);

  const tiles: Array<{ name: string; label: string; value: number }> = [
    { name: "create", label: DONE.tiles.create, value: t.create },
    { name: "update", label: DONE.tiles.update, value: t.update },
    { name: "keep", label: DONE.tiles.keep, value: t.keep },
    { name: "fail", label: DONE.tiles.fail, value: t.fail },
  ];
  if (cancelled) tiles.push({ name: "pending", label: DONE.notImported, value: t.pending });
  const parts = tiles.map((x) => x.value);
  const sum = parts.reduce((a, b) => a + b, 0);
  const kept = result.kept;
  const extra = extraNumbersNote(extraNumbers, extraUnit);

  return (
    <div className="space-y-4" data-block="import-done" data-run-status={view.status}>
      {cancelled && (
        <Callout tone="info" role="status">
          <Parts parts={DONE.cancelled(view.committedThrough, Math.max(0, view.stagedThrough - view.committedThrough))} />
        </Callout>
      )}

      <div className={`grid grid-cols-2 gap-2 ${cancelled ? "sm:grid-cols-5" : "sm:grid-cols-4"}`} data-import-tiles>
        {tiles.map((x) => <Tile key={x.name} name={x.name} label={x.label} value={x.value} />)}
      </div>
      {sum === t.staged && t.staged > 0 && (
        <p className="text-body-sm text-text-secondary" data-import-sum><Parts parts={DONE.sum(parts, t.staged)} /></p>
      )}
      {kept !== null && t.keep > 0 && (
        <p className="text-body-sm text-text-secondary" data-import-kept-split>
          <Parts parts={DONE.keptSplit(kept.inBookUnchanged, kept.onStopList, kept.repeated, kept.chosenKeep)} />
        </p>
      )}
      {extra !== null && <p className="text-body-sm text-text-secondary" data-import-extra>{extra}</p>}

      {result.list !== null && (
        <div className="space-y-2 rounded-md border border-border-subtle p-3" data-import-list-result={result.list.covered ? "covered" : "owed"}>
          <p className="text-body-sm text-text">{result.list.covered ? DONE.listReady(result.list.name) : DONE.listOwed(result.list.name)}</p>
          {!result.list.covered && (
            <Button type="button" size="sm" variant="ghost" onClick={onOpenLists} data-import-act="open-lists">
              {LIST.openCard}
            </Button>
          )}
        </div>
      )}

      {t.fail > 0 && (
        <div className="space-y-1.5" data-import-failures>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <SectionHeading>{DONE.failuresHeading}</SectionHeading>
            {failures.rows.length > 0 && (
              <span className="text-body-sm text-text-subtle"><Parts parts={CHECK.showing(failures.rows.length, failures.total ?? t.fail)} /></span>
            )}
          </div>
          {failures.rows.length > 0 && (
            <ScrollX label={DONE.failuresHeading} className="max-h-[260px] overflow-y-auto">
              <table className="admin-tbl">
                <tbody>
                  {failures.rows.map((r) => (
                    <tr key={r.line} data-import-row={r.line}>
                      <td className="tabular align-top"><Parts parts={CHECK.row(r.line)} /></td>
                      <td className="align-top">{r.sentence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollX>
          )}
          {failures.loading && <p className="text-body-sm text-text-secondary" role="status">{DONE.failuresLoading}</p>}
          {failures.failed && (
            <ImportAlert
              alert={{
                tone: "warning",
                text: DONE.failuresFailed,
                actions: [{ label: CHECK.checkAgain, run: () => void more(failures.rows.length > 0 ? failures.rows[failures.rows.length - 1].line : 0), act: "failures-retry" }],
              }}
            />
          )}
          {!failures.loading && !failures.failed && failures.next !== null && failures.rows.length > 0 && (
            <Button type="button" size="sm" variant="ghost" onClick={() => void more(failures.next ?? 0)} data-import-act="failures-more">
              {DONE.failuresMore}
            </Button>
          )}
        </div>
      )}

      <ActionsRow>
        {t.create > 0 && (
          <Link
            href={contactsHref({}, { import: view.id })}
            onClick={onClose}
            className="btn btn-ghost btn-md admin-focus"
            data-import-act="show-added"
          >
            {DONE.showAdded}
          </Link>
        )}
        <Button ref={focusRef} type="button" size="md" variant="primary" onClick={onClose} data-import-act="close">
          {IMPORT_CLOSE}
        </Button>
      </ActionsRow>
    </div>
  );
}
