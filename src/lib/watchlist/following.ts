/**
 * /watchlist query contract — lifecycle lens · topic · sort · search.
 *
 * 🔴 THIS IS THE PAGE THE CAMPAIGN'S COMPLAINT DESCRIBES MOST LITERALLY. A player stars markets
 * over weeks; the page then rendered **one unfiltered, unsorted, unpaged grid** in star order, so
 * a market that settled a month ago sat between two that are still taking bets, and nothing on the
 * page could separate them. "Cannot tell what is still running from what is finished" is not an
 * abstraction here — it is the whole page.
 *
 * ⛔ AND IT IS THE ONE PLAYER BOARD THAT SPANS THE WHOLE LIFECYCLE. `/markets` reads the unsettled
 * book (`LIVE ∪ CLOSED`) and `/results` reads the terminal archive (`RESOLVED ∪ VOIDED`); each can
 * therefore assume away half the lifecycle. The watchlist can assume nothing — whatever the player
 * starred stays starred through settlement — which is why the lens set below is a partition of
 * ALL FIVE statuses rather than of one half.
 *
 * ⛔ NO SERVER IMPORTS. The page reads the starred rows and hands them here.
 */
import { MARKET_CATEGORIES } from "@/lib/markets/categories";
import { clampText, oneOf, oneParam, parseDir } from "@/lib/query/parse";
import { buildQueryHref, hasActiveFilters, sheetFilterCount } from "@/lib/query/href";
import { countFor, countsFor, filterRows, type Axes } from "@/lib/query/counts";
import { emptyKind, relaxations, type EmptyKind, type ExitCandidate, type Relaxation } from "@/lib/query/empty";
import { sortBy, type SortDir, type SortSpec } from "@/lib/query/sort";
import { MAX_QUERY_LEN } from "@/lib/search/query";

/* ─────────────────────────── the row this module reasons about ────────────────────────── */

export type FollowRow = {
  id: string;
  category: string;
  /** `LIVE` · `CLOSED` · `RESOLVED` · `VOIDED` · `DRAFT`, straight from the stored column. */
  status: "DRAFT" | "LIVE" | "CLOSED" | "RESOLVED" | "VOIDED";
  /**
   * ⛔ PASSED IN, NOT DERIVED HERE. It is `isSelectionClosed(m) || isClosedByTime(m)` — two
   * server predicates over `selectionClosedAt`, `resolutionAt` and the clock — and it is the
   * SAME boolean the card receives, so a pill and the chip on the card it filters to can never
   * disagree about whether a market is still taking bets.
   */
  selectionClosed: boolean;
  /** `yesPool + noPool` — the pool sort's key. */
  volume: number;
  /** `predictorCount` — the people sort's key. */
  predictors: number;
  /** `Date.parse(resolutionAt)` — the closing sort's key. */
  resolutionAtMs: number;
  /**
   * ⭐ HOW RECENTLY THE PLAYER STARRED IT — higher is more recent, and it is the DEFAULT ORDER
   * because it is the order this page has always rendered in.
   *
   * ⚠️ IT IS A RANK DERIVED FROM POSITION, NOT A TIMESTAMP, and that is a deliberate limit.
   * `listWatchedMarketIds` returns ids "newest star first" and nothing more; the star table's
   * own clock is not on the read path. The rank is `n - index`, which reproduces that order
   * exactly and needs no new query. ⛔ Do not present it to a player as a DATE — there is no
   * date here, only an order.
   */
  starRank: number;
  titleEn: string;
  titleSw: string;
  titleZh: string;
  criterion: string;
};

/* ─────────────────────────────────── the URL contract ─────────────────────────────────── */

/**
 * ⭐ THE LENS SET IS THE CARD'S OWN CHIP LADDER, AND THAT IS WHY IT HAS FIVE ARMS RATHER THAN THE
 * FOUR THE PLAN NAMED.
 *
 * 🔴 THE PLAN SAID `All · Live · In progress · Settled`. Two corrections, both re-derived rather
 * than reasoned:
 *
 *  · **"Live" IS THE WRONG WORD AND THIS DICTIONARY ALREADY SAYS SO.** `i18n-dict.ts`'s note on
 *    `statusOpen` reads: *"`statusOpen` is NOT `statusLive`. A market can be LIVE and no longer
 *    taking bets, and the card already labels exactly that case 'Closed'."* A `Live` pill on a
 *    watchlist would collect markets a player can no longer act on — the precise confusion this
 *    campaign exists to remove. The lens is `open`, labelled `statusOpen`.
 *
 *  · **"Settled" IS ONE WORD FOR TWO OUTCOMES.** The campaign's complaint ends *"inside what is
 *    finished cannot tell won from lost from **voided-and-refunded**"*. Folding `VOIDED` into a
 *    `Settled` pill re-commits that defect on the page that names it. `done` and `void` are
 *    separate arms because a refunded market and a decided one are different facts.
 *
 * ⭐ COVERING IS BY CONSTRUCTION, NOT BY ENUMERATION — `progress` IS THE RESIDUAL. It is defined
 * as *not open and not settled*, so every one of the five stored statuses lands in exactly one
 * arm and a status added to `PredictionMarketStatus` tomorrow is covered on the day it is added
 * rather than orphaned into no lens.
 *
 * ⚠️ `DRAFT` IS THE VALUE THAT MADE THIS NECESSARY. `createMarket` writes `LIVE`, so no draft can
 * be starred today — but the schema's `@default(DRAFT)` means the value exists, and a lens set
 * that enumerated four statuses would have silently dropped such a row from every pill including
 * `all`'s siblings. ⛔ Re-derive before "simplifying" this into a status list:
 *
 *     grep -n "enum PredictionMarketStatus" -A 8 prisma/schema.prisma
 */
export const FOLLOW_LENSES = ["all", "open", "progress", "done", "void"] as const;
export type FollowLens = (typeof FOLLOW_LENSES)[number];

/**
 * ⭐ `starred` IS FIRST AND IS THE DEFAULT because it is what the page renders today — the star
 * order out of `listWatchedMarketIds`. Every other sort is new; this one is the promise that the
 * page a player already knows opens the way it always has.
 */
export const FOLLOW_SORTS = ["starred", "closing", "pool", "people"] as const;
export type FollowSortId = (typeof FOLLOW_SORTS)[number];

export const FOLLOW_TOPIC_IDS = ["all", ...MARKET_CATEGORIES] as const;

/**
 * ⭐ THE DEFAULTS ARE TODAY'S BEHAVIOUR EXACTLY: every starred market, in star order, unfiltered.
 * ⛔ A default that filtered anything would delete rows from a page whose entire contract is
 * "the markets you asked to follow" — and the player would have no way to know.
 */
export const FOLLOW_DEFAULTS = {
  lens: "all" as FollowLens,
  cat: "all" as string,
  sort: "starred" as FollowSortId,
  dir: null as SortDir | null,
  q: "" as string,
};

export type FollowState = {
  lens: FollowLens;
  cat: string;
  sort: FollowSortId;
  dir: SortDir | null;
  q: string;
};

export const FOLLOW_DEFAULT_STATE: FollowState = { ...FOLLOW_DEFAULTS };

export const FOLLOW_SHEET_AXES = ["cat"] as const;
const FOLLOW_VIEW_STATE_AXES = ["sort", "dir"] as const;

/**
 * ⛔ `?lens=` AND NOT `?status=`, AND THAT IS A GREP RESULT RATHER THAN A PREFERENCE. Stage 3's
 * ruling — *"grep for who WRITES a param before naming one"* — applied here: `?status=` is written
 * across this app by deposit and withdrawal redirects, and `?cat=` is the name `/markets` and
 * `/results` already give the topic axis, so it is kept identical for muscle memory.
 */
export function parseFollowParams(sp: Record<string, string | string[] | undefined>): FollowState {
  const one = (k: string) => oneParam(sp, k);
  return {
    lens: oneOf(FOLLOW_LENSES, one("lens"), FOLLOW_DEFAULTS.lens),
    cat: oneOf(FOLLOW_TOPIC_IDS, one("cat"), FOLLOW_DEFAULTS.cat),
    sort: oneOf(FOLLOW_SORTS, one("sort"), FOLLOW_DEFAULTS.sort),
    dir: parseDir(one("dir")),
    q: clampText(one("q"), MAX_QUERY_LEN),
  };
}

export function buildFollowHref(
  state: FollowState,
  patch: Partial<FollowState> = {},
  extra: { page?: number } = {},
): string {
  return buildQueryHref("/watchlist", state, FOLLOW_DEFAULT_STATE, patch, extra);
}

export function hasActiveFollowFilters(state: FollowState): boolean {
  return hasActiveFilters(state, FOLLOW_DEFAULT_STATE, FOLLOW_VIEW_STATE_AXES);
}

export function followSheetCount(state: FollowState): number {
  return sheetFilterCount(state, FOLLOW_DEFAULT_STATE, FOLLOW_SHEET_AXES);
}

export function clearedFollowState(state: FollowState): FollowState {
  return { ...FOLLOW_DEFAULT_STATE, sort: state.sort, dir: state.dir };
}

/* ──────────────────────────────────── the predicates ──────────────────────────────────── */

/** Still taking bets. ⚠️ `LIVE` alone is not enough — see `FollowRow.selectionClosed`. */
export function isFollowOpen(row: FollowRow): boolean {
  return row.status === "LIVE" && !row.selectionClosed;
}

/** Finished, either way: a verdict was recorded, or the market was voided and stakes refunded. */
export function isFollowSettled(row: FollowRow): boolean {
  return row.status === "RESOLVED" || row.status === "VOIDED";
}

export function matchesFollowLens(row: FollowRow, lens: FollowLens): boolean {
  switch (lens) {
    case "all": return true;
    case "open": return isFollowOpen(row);
    // ⭐ THE RESIDUAL ARM — see `FOLLOW_LENSES`. Betting has stopped and nothing is final yet:
    //    a CLOSED row, a LIVE row past its selection window, and any status this enum gains.
    case "progress": return !isFollowOpen(row) && !isFollowSettled(row);
    case "done": return row.status === "RESOLVED";
    case "void": return row.status === "VOIDED";
  }
}

export function followAxes(matchesText: (row: FollowRow) => boolean): Axes<FollowRow, FollowState> {
  return {
    lens: (r, s) => matchesFollowLens(r, s.lens),
    cat: (r, s) => s.cat === "all" || r.category === s.cat,
    q: (r, s) => !s.q || matchesText(r),
  };
}

/* ─────────────────────────────────────── sorting ──────────────────────────────────────── */

/**
 * ⛔ EXHAUSTIVE, AND `closing` POINTS THE OTHER WAY FROM EVERY OTHER SORT. "Closing soonest" is
 * ascending time; "most recently starred", "biggest pool" and "most predictors" are all
 * descending. A shared default would be silently wrong for exactly one of the four.
 */
export const FOLLOW_NATURAL_DIR: Record<FollowSortId, SortDir> = {
  starred: "desc",
  closing: "asc",
  pool: "desc",
  people: "desc",
};

function followKey(row: FollowRow, sort: FollowSortId): number | null {
  switch (sort) {
    case "starred": return row.starRank;
    case "closing": return row.resolutionAtMs || null;
    case "pool": return row.volume;
    case "people": return row.predictors;
  }
}

/**
 * ⭐ EVERY TIE-BREAK FALLS BACK TO THE STAR ORDER, and that is the choice this page makes that
 * `/markets` and `/results` do not. Two markets with an identical empty pool are not
 * interchangeable to the player who starred them — one was starred this morning and one last
 * month — so the stable order underneath every sort is the order the page has always had.
 */
const FOLLOW_TIE_BREAK: Record<FollowSortId, (a: FollowRow, b: FollowRow) => number> = {
  starred: (a, b) => a.resolutionAtMs - b.resolutionAtMs,
  closing: (a, b) => b.starRank - a.starRank,
  pool: (a, b) => b.starRank - a.starRank,
  people: (a, b) => b.starRank - a.starRank,
};

export const FOLLOW_SORT_SPEC: SortSpec<FollowRow, FollowSortId> = {
  ids: FOLLOW_SORTS,
  natural: FOLLOW_NATURAL_DIR,
  key: followKey,
  tieBreak: FOLLOW_TIE_BREAK,
};

export function sortFollow(
  rows: readonly FollowRow[],
  state: Pick<FollowState, "sort" | "dir">,
): FollowRow[] {
  return sortBy(FOLLOW_SORT_SPEC, rows, state);
}

/* ──────────────────────────────── filtering + counting ────────────────────────────────── */

export function filterFollow(
  rows: readonly FollowRow[],
  state: FollowState,
  matchesText: (row: FollowRow) => boolean,
): FollowRow[] {
  return filterRows(rows, state, followAxes(matchesText));
}

export function followCounts(
  rows: readonly FollowRow[],
  state: FollowState,
  matchesText: (row: FollowRow) => boolean,
) {
  const axes = followAxes(matchesText);
  return {
    lens: countsFor(rows, state, axes, "lens", FOLLOW_LENSES),
    cat: countsFor(rows, state, axes, "cat", FOLLOW_TOPIC_IDS),
  };
}

export function followCountFor(
  rows: readonly FollowRow[],
  state: FollowState,
  matchesText: (row: FollowRow) => boolean,
  patch: Partial<FollowState>,
): number {
  return countFor(rows, state, followAxes(matchesText), patch);
}

/* ─────────────────────────────── empty causes + exits ─────────────────────────────────── */

export type FollowExitId = "cat" | "q" | "lens";

const FOLLOW_EXITS: readonly ExitCandidate<FollowState, FollowExitId>[] = [
  { id: "cat", patch: { cat: "all" } },
  { id: "q", patch: { q: "" } },
  { id: "lens", patch: { lens: "all" } },
];

export function followExits(
  rows: readonly FollowRow[],
  state: FollowState,
  matchesText: (row: FollowRow) => boolean,
): Relaxation<FollowState, FollowExitId>[] {
  return relaxations(rows, state, followAxes(matchesText), FOLLOW_EXITS);
}

/**
 * ⭐ EVERY LENS BUT `all` IS A HEALTHY EMPTY, AND ON THIS PAGE THAT MATTERS MORE THAN ANYWHERE.
 * "Nothing you follow has settled yet" and "nothing you follow is still open" are both ordinary
 * facts about a small, personal list — a watchlist of three live markets has an empty `done` pill
 * by definition. ⛔ Rendering those as a failed filter would tell a player their page is broken
 * three times out of five.
 */
const FOLLOW_HEALTHY_EMPTY: readonly string[] = FOLLOW_LENSES.filter((l) => l !== "all");

export function followEmptyCause(
  state: FollowState,
  matchesText: (row: FollowRow) => boolean,
  shown: number,
  total: number,
): EmptyKind | null {
  return emptyKind({
    state,
    defaults: FOLLOW_DEFAULT_STATE,
    axes: followAxes(matchesText),
    shown,
    total,
    lensKey: "lens",
    healthyEmpty: FOLLOW_HEALTHY_EMPTY,
    searchKey: "q",
    // ⛔ NO `windowKey` — this page has no date window. A star has no date on the read path
    //    (see `FollowRow.starRank`) and a market's own clock is what `closing` SORTS by, not
    //    something a player filters their own following list down to.
  });
}
