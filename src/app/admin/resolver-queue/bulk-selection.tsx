"use client";

/**
 * THE SELECTION — which markets the officer has ticked, and the reason typed against any
 * row the auto-resolve floor refused.
 *
 * ⭐ SELECTION IS PAGE-SCOPED, AND THE SCREEN SAYS SO. The queue paginates at `PER_PAGE`,
 * and a "select all" that silently meant "this page only" is a money defect the moment the
 * queue exceeds one page — the officer believes they cleared the backlog and 14 markets are
 * still holding player stakes. Carrying selection ACROSS pages is the other trap and it is
 * worse: an id ticked two pages ago is a row nobody has looked at since, whose market may
 * have been sealed by someone else in the meantime. So the set is the page, the bar states
 * it in words, and it names how many rows are NOT covered.
 *
 * ⛔ THIS FILE IMPORTS NO SERVER ACTION. It is state and keyboard behaviour only, which is
 * what keeps it out of the act-gate's population — the gate belongs on the control that
 * SUBMITS, not on the one that ticks a box.
 */

import * as React from "react";

type Ctx = {
  /** The ids on THIS page, in render order — the anchor for shift-click ranges. */
  pageIds: string[];
  selected: Set<string>;
  toggle: (id: string) => void;
  /** Shift-click: select the span between the last click and this one. */
  extendTo: (id: string) => void;
  setAll: (on: boolean) => void;
  clear: () => void;
  /** ⭐ ONE reason for the whole batch, not one per row.
   *
   *  This was a `Map<marketId, string>` painting a textarea on every refused row, and at a
   *  full page that is twenty boxes to fill by hand for what is nearly always ONE fact
   *  ("the AI cited a mirror of the official site"). Worse, the batch was disabled while
   *  ANY one of them held 1–11 characters, so a single stray keystroke in a page-long list
   *  killed the whole submit and named only the first offender.
   *
   *  ⛔ The AUDIT is unchanged: the reason is still fanned out per market on the wire as
   *  `override:<marketId>` and still written as its own audit row against each sealed
   *  market. What collapsed is the TYPING, not the record — a regulator reading the chain
   *  still finds a named officer and a justification on every overridden market. */
  sharedReason: string;
  setSharedReason: (reason: string) => void;
  /** True when SOME but not all of the page is ticked — the header's third state. */
  someOn: boolean;
  allOn: boolean;
};

const BulkCtx = React.createContext<Ctx | null>(null);

export function useBulkSelection(): Ctx {
  const c = React.useContext(BulkCtx);
  if (!c) throw new Error("useBulkSelection outside BulkSelectionProvider");
  return c;
}

export function BulkSelectionProvider({ pageIds, children }: { pageIds: string[]; children: React.ReactNode }) {
  const [selected, setSelected] = React.useState<Set<string>>(() => new Set());
  const [sharedReason, setSharedReason] = React.useState("");
  const lastClicked = React.useRef<string | null>(null);

  // ⛔ A NEW PAGE IS A NEW SELECTION. Without this, paging keeps a set of ids that are no
  // longer rendered, no longer visible, and no longer checked — and the bar would then
  // submit rows the officer cannot see. The dependency is the id list itself, joined, so
  // a re-render with the SAME page does not wipe a selection mid-work.
  const key = pageIds.join(",");
  React.useEffect(() => {
    setSelected(new Set());
    setSharedReason("");
    lastClicked.current = null;
  }, [key]);

  const toggle = React.useCallback((id: string) => {
    lastClicked.current = id;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const extendTo = React.useCallback((id: string) => {
    setSelected((prev) => {
      const anchor = lastClicked.current;
      const next = new Set(prev);
      if (!anchor || anchor === id) {
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }
      const a = pageIds.indexOf(anchor);
      const b = pageIds.indexOf(id);
      if (a < 0 || b < 0) { next.add(id); return next; }
      // A range ADDS; it never clears rows outside itself. Shift-clicking to grab five more
      // markets must not silently drop the two you had already ticked elsewhere.
      for (let i = Math.min(a, b); i <= Math.max(a, b); i++) next.add(pageIds[i]);
      return next;
    });
    lastClicked.current = id;
  }, [pageIds]);

  const setAll = React.useCallback((on: boolean) => {
    setSelected(on ? new Set(pageIds) : new Set());
    lastClicked.current = null;
  }, [pageIds]);

  const clear = React.useCallback(() => {
    setSelected(new Set());
    setSharedReason("");
    lastClicked.current = null;
  }, []);

  const allOn = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someOn = !allOn && pageIds.some((id) => selected.has(id));

  const value = React.useMemo<Ctx>(
    () => ({ pageIds, selected, toggle, extendTo, setAll, clear, sharedReason, setSharedReason, someOn, allOn }),
    // `setSharedReason` is React's own setter — stable by identity, but listed rather than
    // omitted, because a dependency array that is missing a value it closes over is the
    // shape that goes stale silently.
    [pageIds, selected, toggle, extendTo, setAll, clear, sharedReason, someOn, allOn],
  );

  return <BulkCtx.Provider value={value}>{children}</BulkCtx.Provider>;
}
