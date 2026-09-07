/**
 * Why a list came back empty, and the ways out that actually work.
 *
 * ⛔ NEVER ONE GENERIC MESSAGE. §3 rule 8: an empty result names its own cause and offers an exit
 * whose count is real. 🔴 The reason is dated: three separate compensations for the 2026-08-10
 * empty board all failed because they sat DOWNSTREAM of the thing that emptied it — the
 * see-wider nudge in particular required `live.length > 0`, so it switched itself off at exactly
 * the moment the board was emptiest and the player most needed it.
 *
 * ⛔ EVERY RULE IS LIFTED FROM `relaxations` / `emptyCause` (`discovery.ts:550-601`): exits carry
 * a REAL count, an exit is offered only when that count is above zero, and at most three are
 * shown. One ordering rule is deliberately generalised rather than copied — see `emptyKind`.
 *
 * ⛔ NO IMPORTS except this directory's own `countFor`, which is where the cross-filter rule
 * lives. Same no-server-imports rule as the rest of `lib/query` — see `sort.ts`'s header.
 */
import { countFor, type Axes } from "./counts";

/**
 * At most three exits. `discovery.ts:566` verbatim.
 *
 * ⚠️ The cap is not a layout convenience. An empty state that offers six ways out is a menu, and
 * a player who has just been shown nothing is being asked to plan rather than to press. Three is
 * what the phone width fits without the block scrolling, which is where an empty state is read.
 */
export const MAX_EXITS = 3;

/**
 * An offered way out, and the number of rows it really leads to.
 *
 * ⚠️ `Id` is generic so a contract keeps its own closed set of exit names through this module.
 * A `string` id would force a cast at every call site, and a cast is how an exit name that no
 * copy key exists for reaches the renderer and prints nothing at all.
 */
export type Relaxation<State, Id extends string = string> = {
  readonly id: Id;
  readonly patch: Partial<State>;
  /** ⛔ Always a real, cross-filtered count. An exit is not offered when this would be 0. */
  readonly count: number;
};

/**
 * A candidate exit, in the order the contract wants them offered.
 *
 * ⭐ THERE IS NO "WHEN IS THIS OFFERED" PREDICATE, AND THAT IS DELIBERATE. An exit is offered
 * when applying its patch would actually CHANGE the state — which is the same test
 * `discovery.ts:561-565` writes out five times by hand, and it is the same answer in all five:
 *
 *     pool   `state.pool !== DEFAULTS.pool`   ≡ patch `{pool:"any"}`   differs from state
 *     odds   `state.odds !== DEFAULTS.odds`   ≡ patch `{odds:"any"}`   differs from state
 *     topic  `state.topic !== DEFAULTS.topic` ≡ patch `{topic:"all"}`  differs from state
 *     q      `if (state.q)`                   ≡ patch `{q:""}`         differs from state
 *     status `state.status !== "all"`         ≡ patch `{status:"all"}` differs from state
 *
 * ⚠️ THE LAST ROW IS WHY THE TEST IS AGAINST THE PATCH AND NOT AGAINST THE DEFAULTS. `status`
 * relaxes to `all`, which is **not** its default (`open`) — `discovery.ts:270-281` names the two
 * actions apart on purpose: `Clear all` returns to the DEFAULT board, `Include everything` widens
 * past it. A rule written against the defaults would silently stop offering the one exit that
 * widens the most.
 */
export type ExitCandidate<State, Id extends string = string> = {
  readonly id: Id;
  readonly patch: Partial<State>;
};

/**
 * The exits for an empty list, each carrying a real count, capped.
 *
 * ⛔ NEVER OFFER AN EXIT THAT LEADS TO ANOTHER EMPTY PAGE. That is what `count > 0` buys, and it
 * is the whole reason the count is computed here rather than promised by the caller.
 */
export function relaxations<Row, State, Id extends string>(
  rows: readonly Row[],
  state: State,
  axes: Axes<Row, State>,
  candidates: readonly ExitCandidate<State, Id>[],
): Relaxation<State, Id>[] {
  const out: Relaxation<State, Id>[] = [];
  for (const c of candidates) {
    const keys = Object.keys(c.patch) as (keyof State)[];
    // An exit that changes nothing is not an exit — it is a link to the page you are on.
    if (!keys.some((k) => c.patch[k] !== state[k])) continue;
    const count = countFor(rows, state, axes, c.patch);
    if (count > 0) out.push({ id: c.id, patch: c.patch, count });
    if (out.length === MAX_EXITS) break;
  }
  return out;
}

/**
 * The genuinely different reasons a list can be empty. ⛔ Never collapse two of these into one
 * message — they call for opposite things from the reader.
 *
 * · `no-rows`     the player (or the platform) has none of this thing at all. Not a failure.
 * · `search-miss` the words matched nothing.
 * · `lens-empty`  this lens is empty and that is a HEALTHY fact — "nothing of yours has been
 *                 refunded", "nothing is waiting for a result". ⚠️ Only ever claimed when the
 *                 lens is the ONLY thing narrowing the list; see below.
 * · `window-miss` the date window is what emptied it — the one filter a player most often
 *                 forgets is on, because it is set once and then scrolled past.
 * · `filter-miss` some combination of filters matched nothing.
 */
export type EmptyKind = "no-rows" | "search-miss" | "lens-empty" | "window-miss" | "filter-miss";

/**
 * Classify an empty list. The contract maps the answer to its own words — ⛔ this module names
 * no copy and reaches no dictionary (§L3: no enum ever reaches a sentence).
 *
 * ── THE TWO PLACES THIS GENERALISES `discovery.ts:577-601` RATHER THAN COPYING IT ────────────
 * Both are that file's own argument applied where it had not yet been applied, and neither
 * changes any assertion `test:discovery-contract` makes — re-derive with
 * `grep -n "emptyCause" scripts/discovery-contract.test.mts`, which passes `boardTotal = 40` for
 * every lens case and `0` only for the default state.
 *
 * 1. ⭐ **`no-rows` OUTRANKS EVERY OTHER CAUSE.** `discovery.ts` tests `boardTotal === 0` fourth,
 *    below the lens causes, so a platform with no markets at all under `?status=progress` reads
 *    *"nothing is waiting for a result"* — true, and it conceals the fact that there is nothing
 *    at all. The same shape on `/positions` is worse: a player who has never placed a bet, on the
 *    Refunded lens, would be told *"nothing of yours has been refunded"* instead of being invited
 *    to place their first bet. A claim about a population is not the honest answer when the
 *    population is empty.
 * 2. ⭐ **`lens-empty` REQUIRES THAT THE LENS IS THE ONLY THING NARROWING.**
 *    `discovery.ts:590-598` makes exactly this argument for `progress` — *"Claiming 'nothing is
 *    waiting for a result' on `?status=progress&topic=sports` would be a confident false
 *    statement whenever a market is waiting under some OTHER topic"* — and then does not apply it
 *    to `watch`, which has the same failure ("your watchlist is empty" to a player whose
 *    watchlist has ten markets, none of them in Sports). One rule, applied to every lens.
 *
 * ⭐ "NARROWED" IS READ OFF THE FILTER AXES, NEVER OFF THE STATE'S KEYS. `sort` and `dir` live in
 * the same state object and narrow nothing, so a state-wide comparison would report a sorted
 * empty page as a filter miss. Passing `axes` — the record `counts.ts` already requires — makes
 * the population self-maintaining: a new filter axis is counted here the moment it can filter,
 * and a control that is not a filter can never be counted by accident.
 */
export function emptyKind<Row, State extends Record<string, string | null>>(opts: {
  readonly state: State;
  readonly defaults: State;
  readonly axes: Axes<Row, State>;
  /** How many rows the page is showing right now. */
  readonly shown: number;
  /** How many rows exist before ANY filter — the player's whole book. */
  readonly total: number;
  /** The state field the lens strip writes. */
  readonly lensKey: keyof State & string;
  /** Lens values whose emptiness is a healthy fact rather than a miss. */
  readonly healthyEmpty?: readonly string[];
  /** The state field the search box writes, when the page has one. */
  readonly searchKey?: keyof State & string;
  /** The state field the date window writes, when the page has one. */
  readonly windowKey?: keyof State & string;
}): EmptyKind | null {
  const { state, defaults, axes, shown, total, lensKey, healthyEmpty, searchKey, windowKey } = opts;
  if (shown > 0) return null;
  if (total === 0) return "no-rows";
  if (searchKey && state[searchKey]) return "search-miss";

  // Which filter axes — other than the lens — the player has narrowed.
  const narrowed = Object.keys(axes).filter(
    (k) => k !== lensKey && k !== searchKey && state[k] !== defaults[k],
  );

  if (narrowed.length === 0 && healthyEmpty?.includes(String(state[lensKey]))) return "lens-empty";
  if (windowKey && narrowed.length === 1 && narrowed[0] === windowKey) return "window-miss";
  return "filter-miss";
}
