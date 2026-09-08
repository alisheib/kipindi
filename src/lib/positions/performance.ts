/**
 * /positions/performance query contract — the PRODUCT lens, and nothing else.
 *
 * ⛔ THIS ROUTE IS NOT A LIST, AND THAT CHANGES WHAT A LENS MEANS HERE. `performance/page.tsx`
 * renders five money tiles, a cumulative P&L chart, two streaks and a hardcoded `.slice(0, 5)` of
 * recent settlements — there is no grid, no pager and no row set to narrow. So the lens does not
 * filter a list: it RE-SCOPES EVERY AGGREGATE. "Show me my P&L for polls only" is the question,
 * and every number on the page has to answer it or none of them may.
 *
 * ⚠️ SO THERE IS NO SORT, NO SEARCH AND NO WINDOW, and that is a decision rather than an omission.
 * A sort needs rows; a search needs words; a window over a summary would need every tile to state
 * its span or the page would print a lifetime ROI beside a 7-day net. ⛔ If a window is ever added
 * here it must be added to ALL of them at once.
 *
 * 🔴 AND `productLine` IS NOT ON THE POSITION — IT IS ON THE MARKET. `StoredPosition` carries
 * `marketId` and no product, so the page cannot partition its own rows without asking the market
 * table. `listPositionsForUser(userId, limit, productLine)` already does that with an indexed
 * join, so the page reads the two product sets and derives each position's arm from the ids that
 * come back. ⛔ Never re-derive a product from a market id's SHAPE — Up & Down rounds and polls
 * share one table and one id space.
 *
 * ⛔ NO SERVER IMPORTS.
 */
import { oneOf, oneParam } from "@/lib/query/parse";
import { buildQueryHref, hasActiveFilters } from "@/lib/query/href";
import { countsFor, filterRows, type Axes } from "@/lib/query/counts";

/* ─────────────────────────── the row this module reasons about ────────────────────────── */

/**
 * ⚠️ `product` IS RESOLVED BY THE PAGE AND PASSED IN, never derived here. It is the answer to "did
 * this position's market come back in the MARKET-filtered read or the UPDOWN one", which only the
 * server can ask.
 */
export type PerfRow = {
  id: string;
  product: PerfProduct;
};

/**
 * ⭐ `other` IS THE RESIDUAL ARM AND IT IS NOT DECORATION. A position whose market row cannot be
 * read — deleted, or not yet visible to a replica — appears in the UNFILTERED read and in NEITHER
 * product-filtered one. Without a third arm such a row would be counted by `all` and reachable by
 * no pill: the exact hole `FOLLOW_LENSES` was rebuilt to close for `DRAFT`, and the reason
 * `/fairness`' `void` arm is written as a negation.
 *
 * ⛔ AND IT IS RENDERED ONLY WHEN IT HOLDS SOMETHING — `/wallet`'s ruling that a rail offering a
 * lens which can only ever be empty is a dead end, not a filter. On a healthy book it never draws.
 */
export const PERF_PRODUCTS = ["poll", "updown", "other"] as const;
export type PerfProduct = (typeof PERF_PRODUCTS)[number];

export const PERF_LENSES = ["all", ...PERF_PRODUCTS] as const;
export type PerfLens = (typeof PERF_LENSES)[number];

export const PERF_DEFAULTS = {
  /**
   * ⛔ `all` IS THE DEFAULT AND MUST STAY THE DEFAULT. The page's own note is the reason: *"a
   * performance summary that hid half a player's book would be a lie about their money."* A
   * default that narrowed would do exactly that, behind a control the player never touched.
   */
  product: "all" as PerfLens,
};

export type PerfState = { product: PerfLens };

export const PERF_DEFAULT_STATE: PerfState = { ...PERF_DEFAULTS };

export function parsePerfParams(sp: Record<string, string | string[] | undefined>): PerfState {
  return { product: oneOf(PERF_LENSES, oneParam(sp, "product"), PERF_DEFAULTS.product) };
}

export function buildPerfHref(state: PerfState, patch: Partial<PerfState> = {}): string {
  return buildQueryHref("/positions/performance", state, PERF_DEFAULT_STATE, patch);
}

export function hasActivePerfFilters(state: PerfState): boolean {
  return hasActiveFilters(state, PERF_DEFAULT_STATE);
}

/* ──────────────────────────────── predicates + counting ───────────────────────────────── */

export function matchesPerfLens(row: PerfRow, lens: PerfLens): boolean {
  return lens === "all" || row.product === lens;
}

export function perfAxes<R extends PerfRow>(): Axes<R, PerfState> {
  return { product: (r, s) => matchesPerfLens(r, s.product) };
}

export function filterPerf<R extends PerfRow>(rows: readonly R[], state: PerfState): R[] {
  return filterRows(rows, state, perfAxes<R>());
}

/**
 * ⛔ THE COUNTS ARE OVER THE SETTLED SET, which is the population every tile on this page is
 * computed from — not over every position the player holds. A pill promising 40 above a page whose
 * "Total predictions" reads 31 would be two answers to one question, which is the whole defect
 * class `counts.ts` exists for.
 */
export function perfCounts<R extends PerfRow>(rows: readonly R[], state: PerfState) {
  return { product: countsFor(rows, state, perfAxes<R>(), "product", PERF_LENSES) };
}

/**
 * The arms worth drawing: `all`, plus every product this player actually has settled positions in.
 *
 * ⚠️ IT TAKES THE COUNTS RATHER THAN THE ROWS so the rail and the numbers on it cannot come from
 * two different populations. ⛔ `all` is always present even at zero — it is the way BACK, and an
 * empty page with no way back is the dead end this campaign keeps finding.
 */
export function perfLensesToRender(counts: Record<string, number>): PerfLens[] {
  return PERF_LENSES.filter((l) => l === "all" || (counts[l] ?? 0) > 0);
}
