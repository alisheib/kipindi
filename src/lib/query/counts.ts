/**
 * Filtering rows, and counting what a control would show if it were pressed.
 *
 * ⭐ THIS IS THE FILE THE CAMPAIGN IS MOST LIKELY TO GET WRONG, so the rule is written once and
 * every rail on every page runs it. 🔴 The lesson is dated and measured: on 2026-08-10 the board
 * printed **"40 live · TZS 1,659k in play"** above a grid of ZERO cards, at nine of nine
 * viewport × locale combinations. The number was factually true. The board was still a lie,
 * because the count described the census while the grid described a filtered subset.
 *
 * ⛔ NEVER RENDER A COUNT COMPUTED OVER A WIDER SET THAN THE ONE ITS CONTROL WOULD SHOW.
 * `discovery.ts:502-516` states it; this module is where it now lives for every page.
 *
 * ⛔ EVERY RULE IS LIFTED VERBATIM FROM `filterRows` / `countFor` (`discovery.ts:485-533`).
 * What became a parameter is the set of axes; what did not change is that a count applies EVERY
 * axis over the PATCHED state.
 *
 * ⛔ NO IMPORTS. Same rule as `sort.ts` and `href.ts` — see their headers.
 */

/**
 * One axis of a page's filter: does this row survive, given this state?
 *
 * ⭐ IT TAKES THE WHOLE STATE, NOT ITS OWN VALUE, AND THAT IS THE POINT. `matchesStatus(row,
 * state.status, now)` reads one field; `(row, state) => …` reads whatever it needs. A count is
 * computed by PATCHING the state and re-running every axis, so an axis that was handed its own
 * value by the caller would be handed the OLD value while its neighbours saw the new one — and
 * the pill would promise a number from a state that never existed. Taking the state makes the
 * patched count correct by construction rather than by the caller remembering.
 *
 * ⚠️ Per-request inputs — `nowMs`, the parsed search query, the viewer's locale — are CLOSED
 * OVER by the contract that builds the record, never smuggled in as a third parameter.
 * `discovery.ts:482` argues the same for search: the grammar lives in `src/lib/search`, and
 * re-implementing it here would create the second definition this module exists to prevent.
 */
export type Predicate<Row, State> = (row: Row, state: State) => boolean;

/**
 * A page's filter axes, keyed by the state field each one reads. ⛔ The key is the field name
 * because `countFor`'s patch is keyed the same way — one vocabulary, so a rail cannot ask for a
 * count on an axis the filter does not have.
 */
export type Axes<Row, State> = Readonly<Record<string, Predicate<Row, State>>>;

/**
 * Does this row survive every axis (optionally all but one)?
 *
 * ⚠️ `except` EXISTS FOR "HOW MANY WOULD I SEE IF I DROPPED THIS ONE" — it is NOT how a pill's
 * count is computed. A pill asks a different question ("what would pressing me show, with
 * everything else still on"), and that is `countFor`. Reaching for `except` there is the exact
 * shape of the 2026-08-10 defect: a number computed over a wider set than its control delivers.
 */
export function matchesAll<Row, State>(
  row: Row,
  state: State,
  axes: Axes<Row, State>,
  except?: string,
): boolean {
  for (const name of Object.keys(axes)) {
    if (name === except) continue;
    if (!axes[name](row, state)) return false;
  }
  return true;
}

/** The rows a page actually shows. Returns a new array; the input is never reordered here. */
export function filterRows<Row, State>(
  rows: readonly Row[],
  state: State,
  axes: Axes<Row, State>,
  except?: string,
): Row[] {
  return rows.filter((r) => matchesAll(r, state, axes, except));
}

/**
 * ⭐ COUNT HONESTY — the rule every rail on every page is built on.
 *
 * Every count is CROSS-FILTERED: the number beside a control is what the page would show if you
 * pressed it, with every other active filter still applied. So it patches the state and runs
 * **every** axis over the result — ⛔ never `except`, which is what would widen it.
 *
 * ⚠️ A ZERO FROM HERE IS AN HONEST ZERO. It means "pressing this shows nothing", which is worth
 * rendering — it stops a player walking into an empty page. That is a different fact from
 * "we do not know", which A-5 says must render NO count at all rather than a `0` standing in for
 * an unknown. This function cannot return the second one; a caller that has no rows to count
 * must not call it and render nothing.
 */
export function countFor<Row, State>(
  rows: readonly Row[],
  state: State,
  axes: Axes<Row, State>,
  patch: Partial<State>,
): number {
  return countMatching(rows, { ...state, ...patch } as State, axes);
}

/**
 * How many rows this exact state shows. No patch — the state has already been decided.
 *
 * ⭐ WHY THIS SEAM EXISTS. `red:discovery-contract`'s `counts-over-the-census` mutation is
 * anchored on `  const next = { ...state, ...patch };` inside `discovery.ts`'s own `countFor`,
 * and every anchor must resolve **exactly once** against real source (`test:red-anchors` §3).
 * Collapsing that function into a call to `countFor` above would delete the line and disarm the
 * proof of the 2026-08-10 defect — so `discovery.ts` keeps the patch line and calls this, and
 * the matching loop still has exactly one home. §8: the gate is not what bends.
 */
export function countMatching<Row, State>(
  rows: readonly Row[],
  state: State,
  axes: Axes<Row, State>,
): number {
  let n = 0;
  for (const r of rows) if (matchesAll(r, state, axes)) n++;
  return n;
}

/**
 * Every count for one rail, in one call — `{ all: 47, open: 6, settled: 41, win: 18, … }`.
 *
 * ⭐ WHY A HELPER AND NOT A `.map()` AT EACH RAIL. `markets/page.tsx:239-251` writes that map
 * four times, once per rail, each with its own `Object.fromEntries` and its own cast. This
 * campaign adds rails to fifteen more routes, so the same four lines would be re-typed
 * somewhere near sixty times — and every one of them is a place where `{ [key]: v }` could be
 * built against the wrong key and produce counts for an axis nobody pressed. The key is passed
 * once, here, and the patch is built from it.
 */
export function countsFor<Row, State, K extends keyof State & string>(
  rows: readonly Row[],
  state: State,
  axes: Axes<Row, State>,
  key: K,
  values: readonly (State[K] & string)[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of values) out[v] = countFor(rows, state, axes, { [key]: v } as Partial<State>);
  return out;
}
