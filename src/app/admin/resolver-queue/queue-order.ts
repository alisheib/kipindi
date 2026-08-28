/**
 * THE ORDER OF THE RESOLVER QUEUE — the options an officer can pick, and the comparators.
 *
 * ⛔ PURE, AND IN ITS OWN FILE FOR A MEASURED REASON. These four functions started life
 * inside `page.tsx`, exported so `test:bulk-resolve` could drive them. That import dragged
 * the page's whole graph into the suite — page → `BulkResolveBar` → `bulk-resolve-action` —
 * and `red:bulk-resolve` caught the consequence immediately: its "seal in PARALLEL" mutation
 * edits the ACTION, leaves that file briefly unparseable, and the suite then died with a
 * `TransformError` instead of failing the one assertion the mutation targets. The harness
 * reported *"red, but not on 10.3 — got (no FAIL line)"*: a crash where a precise signal
 * should have been, and no way to tell whether the guard it was aiming at still worked.
 *
 * ⭐ So the rule the eligibility module already states applies here too: the testable seam
 * carries NO imports. Nothing from React, Next, Prisma or the store. The page hands rows in.
 *
 * ⛔ EVERY COMPARATOR IS TOTAL, ending in the same tie-break. `pool` is 0 across much of the
 * queue and `sentinelConfidence` is NULL on every row assessed before that column existed,
 * so ties are the COMMON case here, not the edge — and a comparator that returns 0 for tied
 * rows leaves their order to the engine. An unstable order under pagination lets a row swap
 * pages between two clicks and never be seen by an officer working front to back. `id` is
 * the final discriminator because it is the only field guaranteed unique.
 *
 * ⛔ A NULL CONFIDENCE SORTS LAST under "highest confidence", never as 0 — "no reading" and
 * "read it at zero" are different statements, and A-5 is exactly about not collapsing them.
 * Ranking them last is honest: the officer asked for the most confident first, and a row
 * with no reading is not one of them.
 */

/**
 * ⭐ THE ORDER IS A TRIAGE DECISION, so it belongs to the officer.
 *
 * The queue was hardcoded to `resolutionAt` ascending — the right DEFAULT, and the only one
 * available. The page's own header calls the money held the triage signal and renders it on
 * every row, and it was the one column that could not be ordered by: with 27,615 markets and
 * a 20-row page, the market holding the largest pool can sit on page 40 while the officer
 * works through twenty holding nothing.
 */
export const SORT_OPTIONS = [
  { value: "due", label: "Most overdue first" },
  { value: "money", label: "Most money held" },
  { value: "confidence", label: "Highest AI confidence" },
  { value: "newest", label: "Newest first" },
] as const;

export type SortKey = (typeof SORT_OPTIONS)[number]["value"];

/** An unknown `?sort=` falls back to the default rather than throwing or emptying the queue —
 *  the same shape the window and category filters already use. */
export function parseSort(raw: string | undefined): SortKey {
  return (SORT_OPTIONS as readonly { value: string }[]).some((o) => o.value === raw)
    ? raw as SortKey
    : "due";
}

export type SortableMarket = {
  id: string; resolutionAt: string; createdAt: string;
  yesPool: number; noPool: number;
  /** `undefined` as well as `null`: a row that never carried the column and a row whose
   *  column is explicitly empty are the same statement — no reading. Both sort last under
   *  "highest confidence", and the `== null` checks below match both deliberately. */
  sentinelConfidence?: number | null;
};

export function compareBy(key: SortKey): (a: SortableMarket, b: SortableMarket) => number {
  const tie = (a: SortableMarket, b: SortableMarket) =>
    Date.parse(a.resolutionAt) - Date.parse(b.resolutionAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  if (key === "money") {
    return (a, b) => (b.yesPool + b.noPool) - (a.yesPool + a.noPool) || tie(a, b);
  }
  if (key === "confidence") {
    return (a, b) => {
      const ac = a.sentinelConfidence, bc = b.sentinelConfidence;
      if (ac == null && bc != null) return 1;
      if (bc == null && ac != null) return -1;
      if (ac != null && bc != null && ac !== bc) return bc - ac;
      return tie(a, b);
    };
  }
  if (key === "newest") {
    return (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || tie(a, b);
  }
  return tie;
}
