"use client";

/**
 * THE RESULT (`import-done`) — S15 · C4, 2026-10-09 · docs/CONTACTS-SCREEN-PLAN.md §4.2 step 10.
 *
 * ⭐ FOUR TILES, THE SERVER'S COUNTS (OD26: counted from the run's rows, never added up here): Added · Updated · Kept as
 * they were · Couldn't be imported. ⭐ R5 · A CANCELLED IMPORT says what it wrote — the contacts added plus updated,
 * never the cursor (which counts kept and failed rows too) — and how many rows it never reached: the cancel's own count
 * (`notImported`, counted before those rows were deleted), else the run's unsettled span. There is no "not imported"
 * tile: a cancel deletes the unsettled rows, so a count of them read afterwards is always 0. The sum line names every
 * term and is written only when the terms add up to the file's rows; otherwise it is not written at all (never a guess).
 * ⛔ C3b-fix · D5d · it never claims "every row of your file is counted once" when a quotation mark never closed
 * swallowed lines — it says how many lines after that row were not read (`SumCut`, the dialog's).
 * ⛔ S15-3 · THE KEPT ROWS ARE SPLIT BY REASON ONLY FOR A VIEWER WHO MAY READ NUMBERS: the server sends the split for that
 * viewer alone (`KeptSplit`, OD54 — a stop per row is a player signal); everyone else reads one "kept as they were".
 * ⭐ S15-4 · HOW MANY PEOPLE HAD ANOTHER NUMBER that was not imported is said, when this tab read the file.
 * ⭐ The rows that could not be imported are listed a page at a time, each with its row and its sentence; "Show the
 * contacts this import added" opens the book filtered to this import (`?import=<run>`, the ONE href builder); the list
 * the contacts went on says whether its new members are covered for offers, and the way to its card when they are not.
 * 🔴 C8b (B5) · "every member is covered" is counted as the VIEWER may count members (the Lists card's own rule, on the
 * server), and a reader — only a reader — is also told how many more members have a 50pick account, whom a list basis
 * never reaches (`withAccount`); for anyone else that figure does not exist.
 */
import { useEffect, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { ScrollX } from "@/components/ui/scroll-x";
import { extraNumbersNote, type ExtraNumbersUnit } from "@/lib/contacts/import-read";
import type { FailuresResult, ImportResultView } from "@/lib/contacts/import-flow";
import { contactsHref } from "../contacts-query";
import { CHECK, DONE, IMPORT_CLOSE, IMPORT_TRY_AGAIN, LIST, type SumCut } from "./import-copy";
import { ActionsRow, ButtonText, ImportAlert, Parts, SectionHeading, Tile } from "./import-parts";

type Failures = {
  readonly rows: ReadonlyArray<{ line: number; sentence: string }>;
  readonly total: number | null;
  readonly next: number | null;
  readonly loading: boolean;
  readonly failed: boolean;
};

export function ImportDonePanel({
  result, notImported, extraNumbers, extraUnit, cut, loadFailures, onClose, onOpenLists, focusRef,
}: {
  result: ImportResultView;
  /** ⭐ C3b-fix · D5d · how the sum line ends — a quotation mark never closed swallowed lines, or may have (`SumCut`). */
  cut: SumCut;
  /** ⭐ R5 · a cancel's own count of the rows it left unimported (`RunActResult.notImported`, or the run's unsettled span
   *  just before this tab cancelled it) — null when this tab did not cancel it. */
  notImported: number | null;
  /** S15-4 · people with another number not imported, as this tab read the file (0 when it did not read it). */
  extraNumbers: number;
  extraUnit: ExtraNumbersUnit;
  loadFailures: (runId: string, afterLine: number) => Promise<FailuresResult>;
  onClose: () => void;
  onOpenLists: () => void;
  focusRef: RefObject<HTMLButtonElement | null>;
}) {
  const view = result.view;
  const t = view.totals;
  const cancelled = view.status === "CANCELLED";
  // Loading from the first frame when there are failures to read, so "Show more" never flashes before the first page.
  const [failures, setFailures] = useState<Failures>({ rows: [], total: null, next: 0, loading: t.fail > 0, failed: false });
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
  // ⭐ R5 · a cancelled run: written = added + updated; the rows never reached = the cancel's own count, else the span
  // the run had not settled (its cursor stops where the cancel found it).
  const written = t.create + t.update;
  const rest = cancelled ? Math.max(0, notImported ?? view.stagedThrough - view.committedThrough) : 0;
  const terms: Array<{ n: number; word: string }> = [
    { n: t.create, word: DONE.terms.create },
    { n: t.update, word: DONE.terms.update },
    { n: t.keep, word: DONE.terms.keep },
    { n: t.fail, word: DONE.terms.fail },
  ];
  if (cancelled) terms.push({ n: rest, word: DONE.terms.rest });
  const sum = terms.reduce((a, x) => a + x.n, 0);
  const fileRows = view.totalRows;
  const kept = result.kept;
  const extra = extraNumbersNote(extraNumbers, extraUnit);

  return (
    <div className="space-y-4" data-block="import-done" data-run-status={view.status} data-not-imported={cancelled ? rest : undefined}>
      {cancelled && (
        <Callout tone="info" role="status">
          <Parts parts={DONE.cancelled(written, rest)} />
        </Callout>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" data-import-tiles>
        {tiles.map((x) => <Tile key={x.name} name={x.name} label={x.label} value={x.value} />)}
      </div>
      {/* ⭐ R5 · every row of the FILE counted once, or no sum at all — and (D5d) never that claim when lines were swallowed. */}
      {sum === fileRows && fileRows > 0 && (
        <p className="text-body-sm text-text-secondary" data-import-sum={fileRows}><Parts parts={DONE.sum(terms, fileRows, cut)} /></p>
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
          {result.list.withAccount !== null && result.list.withAccount > 0 && (
            <p className="text-body-sm text-text-secondary" data-import-list-with-account>
              <Parts parts={DONE.listWithAccount(result.list.withAccount)} />
            </p>
          )}
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
                // ⭐ R15 · a retry says "Try again".
                actions: [{ label: IMPORT_TRY_AGAIN, run: () => void more(failures.next ?? 0), act: "failures-retry" }],
              }}
            />
          )}
          {/* ⭐ R8 · "Show more" while the server says the list goes on — whatever the last page held. */}
          {!failures.loading && !failures.failed && failures.next !== null && (
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
            <ButtonText>{DONE.showAdded}</ButtonText>
          </Link>
        )}
        <Button ref={focusRef} type="button" size="md" variant="primary" onClick={onClose} data-import-act="close">
          {IMPORT_CLOSE}
        </Button>
      </ActionsRow>
    </div>
  );
}
