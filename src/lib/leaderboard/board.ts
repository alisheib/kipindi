/**
 * /leaderboard query contract — the sort, and why it is ONLY a sort.
 *
 * 🔴 THE ONE THING THIS ROUTE MUST NOT DO IS SORT IN JAVASCRIPT, AND IT IS THE OBVIOUS
 * IMPLEMENTATION. `positionStore.leaderboard(BOARD_SIZE)` is `order by … limit 50`: the database
 * chooses the fifty rows BY the ordering. Applying a JS sort on top would leave the SELECTION on
 * ROI and change only the labels — so "most staked" would mean *the biggest staker among the fifty
 * best ROIs*. A player holding the platform's largest book with a poor ROI is not in the fifty,
 * never appears under a sort named for exactly them, and nothing on the page says so.
 *
 * ⛔ THAT IS §3 RULE 4'S OWN FAILURE WITH THE PROMISE MOVED FROM A COUNT INTO A SORT LABEL —
 * "the number was true and the board was still a lie". Worse with a tri-state direction:
 * `?sort=roi&dir=asc` would read *"the worst predictors"* and in fact be *"the 50th- through
 * 1st-best"*. ⭐ So the ORDER BY moves with the sort, into both stores, and this module's job is to
 * hand the page a NARROWED key rather than to order anything itself.
 *
 * ⛔ `streak` IS CUT FROM THE BOARD'S PLANNED SET, and it is the one the plan named. Two
 * independent reasons, either sufficient:
 *   · IT IS NOT IN THE AGGREGATE. `leaderboard()` returns `{userId, resolved, staked, paidOut}`
 *     and nothing else, so a streak sort cannot be pushed down — it could only re-order an
 *     already-chosen fifty, which is the defect above by name.
 *   · AND THE VALUE ITSELF WOULD NOT BEAR IT. The page walks a per-user read ordered by
 *     `placedAt desc` counting consecutive wins — but a streak is a fact about SETTLEMENT order,
 *     and on a table where five-minute Up & Down rounds sit beside multi-week polls the two orders
 *     routinely disagree. It is honest enough as a badge on a row and would not be honest as a
 *     ranking.
 * ⚠️ The streak COLUMN and its flame chip are untouched. What is refused is making it selectable.
 *
 * ⛔ NO SERVER IMPORTS.
 */
import { oneOf, oneParam, parseDir } from "@/lib/query/parse";
import { buildQueryHref, hasActiveFilters } from "@/lib/query/href";
import type { SortDir } from "@/lib/query/sort";

/**
 * ⭐ FOUR SORTS, AND EVERY ONE OF THEM IS A COLUMN THE TABLE ACTUALLY PRINTS or the number the
 * page leads with. The board's plan named `volume`, which this platform already uses for a
 * MARKET's pool ("Biggest pool"), so it is `staked` — the word the page's own copy uses.
 *
 * ⚠️ `roi` IS FIRST AND IS THE DEFAULT because it is the ordering this board has always had, so
 * `/leaderboard` with no params renders byte-for-byte the page a player already knows. Same
 * argument as `starred` on `/watchlist`.
 */
export const LEADER_SORTS = ["roi", "net", "staked", "resolved"] as const;
export type LeaderSortId = (typeof LEADER_SORTS)[number];

/**
 * ⭐ THE PRODUCT LENS — added 2026-09-09, and it is the one thing on this page that IS a filter.
 *
 * 🔴 WHY IT EXISTS, MEASURED AND NOT ASSUMED. `npm run ops:leaderboard-mix` against production:
 * **72.19% of the board's own ranked population is Up & Down**, **17 of 41 ranked players hold
 * BOTH products**, and **17 of the 41 rows on the board mix them**. So the single ROI this page
 * has always printed ranks a player on two different games at once.
 *
 * 🎯 AND THE NUMBER THAT SETTLED IT WAS THE PER-PLAYER ONE. Platform ROI is −5.06% for polls and
 * −5.04% for Up & Down — near-identical, which reads as proof that combining them is harmless.
 * It is not: the same query shows a single player's ROI moving by up to **145.91 percentage
 * points** depending on whether their Up & Down bets are counted. A board ranks INDIVIDUALS, so a
 * platform mean cannot answer its question however true it is.
 *
 * ⛔ THREE PRIORS IN THIS REPO SAID THE OPPOSITE AND ALL THREE COUNTED THE WRONG POPULATION —
 * "~20×" (`market-dal.ts`), "~12:1" (the ops README) and "99.4%" (the campaign board) are about
 * MARKET ROWS, and an Up & Down chain emits a row every few minutes while a poll is created a few
 * times a day. None of them says how players BET. Re-derive with `ops:leaderboard-mix`; do not
 * inherit a ratio.
 *
 * ⚠️ `all` IS THE DEFAULT and stays first, so `/leaderboard` with no params renders the board a
 * player already knows — the same argument `roi` makes above.
 */
export const LEADER_PRODUCTS = ["all", "polls", "updown"] as const;
export type LeaderProductId = (typeof LEADER_PRODUCTS)[number];

/**
 * The lens id → the DAL's own product vocabulary.
 * ⛔ A PLAIN LITERAL MAP, because this module may not import from `src/lib/server` (see the header)
 * and `ProductLineFilter` lives there. The pair is pinned by `test:leaderboard-order` §6 against
 * the DAL's accepted values, so the two cannot drift apart silently.
 */
export const LEADER_PRODUCT_FILTER: Record<LeaderProductId, "ALL" | "MARKET" | "UPDOWN"> = {
  all: "ALL",
  polls: "MARKET",
  updown: "UPDOWN",
};

export const LEADER_DEFAULTS = {
  sort: "roi" as LeaderSortId,
  dir: null as SortDir | null,
  product: "all" as LeaderProductId,
};

export type LeaderState = {
  sort: LeaderSortId;
  dir: SortDir | null;
  product: LeaderProductId;
};

export const LEADER_DEFAULT_STATE: LeaderState = { ...LEADER_DEFAULTS };

/**
 * ⛔ EXHAUSTIVE, AND EVERY ARM POINTS THE SAME WAY FOR ONCE — every one of these four is a
 * "biggest first" question. That is stated rather than defaulted because `SortSpec` requires it
 * per id, for the reason `/watchlist` records: `closing` points the other way from its three
 * siblings there, and a shared default would have been silently wrong for exactly one of them.
 */
export const LEADER_NATURAL_DIR: Record<LeaderSortId, SortDir> = {
  roi: "desc",
  net: "desc",
  staked: "desc",
  resolved: "desc",
};

export function parseLeaderParams(sp: Record<string, string | string[] | undefined>): LeaderState {
  const one = (k: string) => oneParam(sp, k);
  return {
    sort: oneOf(LEADER_SORTS, one("sort"), LEADER_DEFAULTS.sort),
    dir: parseDir(one("dir")),
    product: oneOf(LEADER_PRODUCTS, one("product"), LEADER_DEFAULTS.product),
  };
}

/** The product filter actually in force, as the plain value the DAL takes. */
export function leaderProduct(state: LeaderState): "ALL" | "MARKET" | "UPDOWN" {
  return LEADER_PRODUCT_FILTER[state.product];
}

export function buildLeaderHref(
  state: LeaderState,
  patch: Partial<LeaderState> = {},
  extra: { page?: number } = {},
): string {
  return buildQueryHref("/leaderboard", state, LEADER_DEFAULT_STATE, patch, extra);
}

/**
 * ⭐ NO LONGER ALWAYS FALSE — and the change is the whole point of the product lens.
 *
 * This used to be a function that existed to SAY it was always false: a sort narrows nothing, so
 * every row stayed on the board and a `Clear` control would have been a button that could not do
 * anything. `sort` and `dir` are still passed as view state for exactly that reason, and
 * `href.ts`'s rule that a sort is never "active" is unchanged.
 *
 * ⚠️ `product` IS A REAL FILTER — it removes rows — so it is deliberately NOT in the view-state
 * list, and this returns true on `?product=polls` or `?product=updown`. That is what lets the page
 * treat the lens as a filter for §K 6c's purposes (a count that means something, a URL that is
 * shareable, a rail that says which slice you are on) while still refusing to dress a sort up as
 * one.
 */
export function hasActiveLeaderFilters(state: LeaderState): boolean {
  return hasActiveFilters(state, LEADER_DEFAULT_STATE, ["sort", "dir"]);
}

/**
 * The direction actually in force, as a plain value the DAL can take.
 *
 * ⚠️ Deliberately NOT `effectiveDir` from `lib/query/sort`: that takes a `SortSpec`, and this
 * contract has no comparator to build one from — the ordering lives in SQL. The tri-state rule is
 * the same and is applied here so the page cannot re-decide it.
 */
export function leaderDir(state: LeaderState): SortDir {
  return state.dir ?? LEADER_NATURAL_DIR[state.sort];
}
