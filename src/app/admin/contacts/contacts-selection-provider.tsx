"use client";

/**
 * U23 · THE CONTACT BOOK'S SELECTION — which contacts are ticked, or "every contact matching this filter".
 *                                                                                          (S10, 2026-10-02)
 *
 * ⭐ TWO SHAPES, ONE AUDIENCE (decision C6). ROWS: a Map of SERVER-PROJECTED rows (`{ id, name, masked }` — the number
 * masked for every role, by the server's `contactSelectionRow`), kept ACROSS pages and filters, so the bar can say "3
 * selected · 1 on another page". MATCHING: "select all N matching" stores the FILTER — U24's audience JSON, built on the
 * server — never a list of ids, and the server RECOUNTS it at the run, so a filter that grew is refused rather than
 * half-applied. Either way `audience()` is what the bar posts.
 * ⛔ THE CAP IS U24's (`MAX_AUDIENCE_IDS`, handed in by the page — one cap, decision C6): ticking past it is refused and
 * SAID, never silently dropped, and "select all matching" is the way to more.
 * ⛔ A FILTER CHANGE CLEARS "ALL MATCHING", AND SAYS SO: the stored filter no longer describes the rows on screen. Ticked
 * rows survive it — each is named, and the confirmation lists them from the server.
 * ⛔ THIS FILE IMPORTS NO SERVER ACTION: it is state only, which keeps it out of the act gate's population — the gate
 * belongs on the control that SUBMITS (`contacts-bulk-bar.tsx`). Ticking is a READ affordance: a view-only officer ticks.
 * ⚠️ The ticks live in this provider's state, so they survive the page's own soft navigations (the pager, a sort, a pill,
 * the search box, a contact's dialog) and are lost to a full reload — a plain link, such as "Clear filters".
 */
import * as React from "react";
import type { ContactSelectionRow } from "@/lib/contacts/bulk-rules";
import { CONTACTS_BULK } from "./contacts-copy";

/** The page's filter, as the server built it: its canonical key (U24's audience JSON, serialised) and its match count. */
export type ContactsMatching = { key: string; total: number };

type Ctx = {
  mode: "rows" | "matching";
  /** Rows mode: the ticked rows, by id. Empty in matching mode. */
  rows: Map<string, ContactSelectionRow>;
  /** How many contacts the selection holds: the ticked rows, or the filter's count. */
  count: number;
  /** Ticked rows that are not on this page. */
  offPage: number;
  allOnPage: boolean;
  someOnPage: boolean;
  /** The page's filter, when "select all matching" may be offered (the list read arrived and was not refused). */
  matching: ContactsMatching | null;
  /** A refusal or a clearing, said in words (the cap; a filter change). */
  note: string | null;
  isOn: (id: string) => boolean;
  toggle: (row: ContactSelectionRow) => void;
  setPage: (on: boolean) => void;
  selectAllMatching: () => void;
  clear: () => void;
  /** What the bar posts: `{ ids }` for ticked rows, the stored filter for "all matching". */
  audience: () => Record<string, unknown>;
};

const SelectionCtx = React.createContext<Ctx | null>(null);

export function useContactsSelection(): Ctx {
  const c = React.useContext(SelectionCtx);
  if (!c) throw new Error("useContactsSelection outside ContactsSelectionProvider");
  return c;
}

export function ContactsSelectionProvider({
  pageRows, matching, maxTicks, children,
}: {
  /** This page's rows, projected on the server — never a stored row. */
  pageRows: ContactSelectionRow[];
  matching: ContactsMatching | null;
  /** U24's ONE cap on a ticked selection (`MAX_AUDIENCE_IDS`). */
  maxTicks: number;
  children: React.ReactNode;
}) {
  const [rows, setRows] = React.useState<Map<string, ContactSelectionRow>>(() => new Map());
  const [chosen, setChosen] = React.useState<ContactsMatching | null>(null);
  const [note, setNote] = React.useState<string | null>(null);

  // ⛔ "ALL MATCHING" BELONGS TO ONE FILTER. When the page's filter changes (a pill, the search box, a refused or failed
  // read), the stored one no longer describes what is on screen: it is cleared, and the bar says so.
  const matchingKey = matching?.key ?? null;
  React.useEffect(() => {
    if (chosen !== null && chosen.key !== matchingKey) {
      setChosen(null);
      setNote(CONTACTS_BULK.filterChanged);
    }
    // `chosen` is read as of this render on purpose: the clear is keyed to the FILTER changing, nothing else.
  }, [matchingKey]);

  const pageIds = React.useMemo(() => pageRows.map((r) => r.id), [pageRows]);
  const mode: Ctx["mode"] = chosen !== null ? "matching" : "rows";
  const isOn = React.useCallback((id: string) => chosen !== null || rows.has(id), [chosen, rows]);

  const toggle = React.useCallback((row: ContactSelectionRow) => {
    if (chosen !== null) {
      // Unticking one row of "all matching" falls back to this page's rows, less that one.
      setChosen(null);
      setRows(new Map(pageRows.filter((r) => r.id !== row.id).map((r) => [r.id, r])));
      setNote(null);
      return;
    }
    const next = new Map(rows);
    if (next.has(row.id)) {
      next.delete(row.id);
    } else if (next.size >= maxTicks) {
      // ⛔ Never silently dropped: the tick is refused, and said.
      setNote(CONTACTS_BULK.tickCap(maxTicks));
      return;
    } else {
      next.set(row.id, row);
    }
    setRows(next);
    setNote(null);
  }, [chosen, rows, pageRows, maxTicks]);

  const setPage = React.useCallback((on: boolean) => {
    if (chosen !== null) {
      setChosen(null);
      setRows(on ? new Map(pageRows.map((r) => [r.id, r])) : new Map());
      setNote(null);
      return;
    }
    const next = new Map(rows);
    if (on) {
      for (const r of pageRows) next.set(r.id, r);
      // ⛔ A page that would carry the selection past the cap is refused whole, and said — never half-ticked.
      if (next.size > maxTicks) {
        setNote(CONTACTS_BULK.tickCap(maxTicks));
        return;
      }
    } else {
      for (const id of pageIds) next.delete(id);
    }
    setRows(next);
    setNote(null);
  }, [chosen, rows, pageRows, pageIds, maxTicks]);

  const selectAllMatching = React.useCallback(() => {
    if (matching === null) return;
    setNote(null);
    setRows(new Map());
    setChosen(matching);
  }, [matching]);

  const clear = React.useCallback(() => {
    setNote(null);
    setRows(new Map());
    setChosen(null);
  }, []);

  const audience = React.useCallback((): Record<string, unknown> => {
    if (chosen !== null) return JSON.parse(chosen.key) as Record<string, unknown>;
    return { ids: Array.from(rows.keys()) };
  }, [chosen, rows]);

  // The count of "all matching" follows the page's own count for the same filter (it moves after a run refreshes it).
  const count = chosen !== null ? (matching !== null && matching.key === chosen.key ? matching.total : chosen.total) : rows.size;
  const offPage = chosen !== null ? 0 : Array.from(rows.keys()).filter((id) => !pageIds.includes(id)).length;
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => isOn(id));
  const someOnPage = !allOnPage && pageIds.some((id) => isOn(id));

  const value = React.useMemo<Ctx>(
    () => ({ mode, rows, count, offPage, allOnPage, someOnPage, matching, note, isOn, toggle, setPage, selectAllMatching, clear, audience }),
    [mode, rows, count, offPage, allOnPage, someOnPage, matching, note, isOn, toggle, setPage, selectAllMatching, clear, audience],
  );

  return <SelectionCtx.Provider value={value}>{children}</SelectionCtx.Provider>;
}
