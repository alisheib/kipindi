/**
 * /positions portfolio contract — lens · sort · side · topic · window · search.
 *
 * ⭐ THE COMPLAINT THIS ANSWERS, in the player's words: they cannot tell **what is still running
 * from what is finished**, and inside what is finished cannot tell **won from lost from
 * voided-and-refunded**. Re-derive the gap:
 *
 *     sed -n '/^enum PositionStatus/,/^}/p' prisma/schema.prisma
 *     grep -n 'status !== "OPEN"' src/app/positions/page.tsx
 *
 * Five stored states; four of them collapsed into one **Settled** bucket. A player whose market
 * was voided and whose stake came back sat in the same tab, under the same word, as a player who
 * lost. ⭐ And the per-outcome counts were **already computed a few lines later** and spent on a
 * summary strip — the numbers existed, the way in did not.
 *
 * ⛔ THIS FILE IS PURE, AND IT HOLDS NO SECOND DEFINITION OF ANYTHING.
 * · The generic rules — the comparator, the href builder, the cross-filter count, the exits —
 *   are `lib/query/*`, lifted verbatim from `lib/markets/discovery.ts`. ⛔ Never re-derive one
 *   here: `/positions` must order and count the way `/markets` does, and the way to guarantee
 *   that is to run the same code.
 * · The WORDS are the lexicon's (`lib/side-label.ts`) — §L2/§L3, no enum ever reaches a
 *   sentence. This module names ids, never copy.
 * · The topic list is `MARKET_CATEGORIES`, **derived, never re-typed**.
 * · The window presets are `PLAYER_PRESETS`, which was written for exactly this and had zero
 *   call sites.
 *
 * ⛔ NO SERVER IMPORTS beyond the two pure constants. The page reads the store and decorates each
 * position into a `PortfolioRow`; this file must never re-derive a lifecycle fact, for the reason
 * `discovery.ts`'s header gives — that is how two surfaces start disagreeing about what "closed"
 * means.
 */
import { MARKET_CATEGORIES } from "@/lib/markets/categories";
import { PLAYER_PRESETS } from "@/lib/query/windows";
import { clampText, oneOf, oneParam, parseDir } from "@/lib/query/parse";
import { buildQueryHref, hasActiveFilters, sheetFilterCount } from "@/lib/query/href";
import { countFor, countsFor, filterRows, type Axes } from "@/lib/query/counts";
import { emptyKind, relaxations, type EmptyKind, type ExitCandidate, type Relaxation } from "@/lib/query/empty";
import { comparePrimary, sortBy, type SortDir, type SortSpec } from "@/lib/query/sort";
import { MAX_QUERY_LEN } from "@/lib/search/query";

/* ─────────────────────────── the row this module reasons about ────────────────────────── */

export type PositionStatus = "OPEN" | "WIN" | "LOSS" | "VOID" | "CASHED_OUT";

/**
 * The decorated shape the page hands to this module.
 *
 * ⚠️ `finalPayout` is `null` — never 0 — while a position is OPEN. An open bet has no return
 * yet, and that is not the same fact as a return of zero. ⛔ Never `?? 0`: the `return` sort
 * partitions on exactly this, and coercing lands every undecided position last descending and
 * **first** the moment the player flips the direction.
 *
 * ⚠️ `title` is the LOCALISED string the card renders, and `market` sorts by it — so the words a
 * player reads are the words they are ordered by. The three raw titles travel too, because the
 * shared search grammar matches across all three (a player may type an English team name on a
 * Swahili page).
 */
export type PortfolioRow = {
  id: string;
  marketId: string;
  status: PositionStatus;
  side: "YES" | "NO";
  stake: number;
  /** ⛔ `null` while OPEN — see above. */
  finalPayout: number | null;
  placedAtMs: number;
  /**
   * `selectionClosedAt ?? resolutionAt` — the deadline the CARD shows.
   *
   * 🔴 `discovery.ts`'s own law, applied here: the board once windowed and sorted by
   * `resolutionAt` while every card stated time-to-betting-close, so "ending soon" could omit a
   * market that stopped taking bets in ten minutes. **The clock a player is SHOWN is the clock
   * they are sorted by.**
   */
  closesAtMs: number;
  category: string;
  title: string;
  titleEn: string;
  titleSw: string;
  titleZh: string;
};

/* ─────────────────────────────────── the URL contract ─────────────────────────────────── */

/**
 * ⭐ SEVEN LENSES, ONE STRIP — Ali's ruling, 2026-09-07.
 *
 * ⚠️ `settled` STAYS, and it is the union of the four below it. Every `?tab=settled` link that
 * exists today — shared, bookmarked, or sitting in a notification — keeps working, and a player
 * who only wants "everything that is finished" still has one press. The four outcome lenses are
 * added BESIDE it, not instead of it.
 */
export const POSITION_LENSES = ["all", "open", "settled", "win", "loss", "void", "cashed"] as const;
export type PositionLens = (typeof POSITION_LENSES)[number];

export const POSITION_SORTS = ["recent", "stake", "return", "closing", "market"] as const;
export type PositionSortId = (typeof POSITION_SORTS)[number];

export const SIDE_IDS = ["any", "yes", "no"] as const;
export type SideId = (typeof SIDE_IDS)[number];

/** ⛔ Derived from the shared preset list, never re-typed. `all` is the default — no window. */
export const WHEN_IDS = PLAYER_PRESETS;
export type WhenId = (typeof WHEN_IDS)[number];

/** ⛔ Derived. A new market category gets a filter here the day it is added, or not at all. */
export const TOPIC_IDS = ["all", ...MARKET_CATEGORIES] as const;

/**
 * ⭐ THE DEFAULTS, IN ONE PLACE, AND THEIR ORDER IS THE URL'S PARAM ORDER.
 *
 * `buildQueryHref` walks these keys, so one state always produces one byte-identical URL from
 * every call site — which is what lets a probe follow a pill's href and compare what it promised
 * against what arrived.
 *
 * ⚠️ `tab: "all"` is today's behaviour: `/positions` with no param shows everything. Keeping it
 * means the change is additive for anyone already here.
 */
export const PORTFOLIO_DEFAULTS = {
  tab: "all" as PositionLens,
  sort: "recent" as PositionSortId,
  /** absent = the sort's natural direction. Tri-state by design — see `parse.ts`'s `parseDir`. */
  dir: null as SortDir | null,
  side: "any" as SideId,
  topic: "all" as string,
  when: "all" as WhenId,
  q: "" as string,
};

export type PortfolioState = {
  tab: PositionLens;
  sort: PositionSortId;
  dir: SortDir | null;
  side: SideId;
  topic: string;
  when: WhenId;
  q: string;
};

export const PORTFOLIO_DEFAULT_STATE: PortfolioState = { ...PORTFOLIO_DEFAULTS };

/** The axes the phone sheet holds — and therefore the only axes its badge may count. */
export const SHEET_AXES = ["side", "topic", "when"] as const;

/** ⛔ Sort and dir narrow nothing, so `Clear` must not offer to reset them. */
const VIEW_STATE_AXES = ["sort", "dir"] as const;

export function parsePortfolioParams(
  sp: Record<string, string | string[] | undefined>,
): PortfolioState {
  const one = (k: string) => oneParam(sp, k);
  return {
    tab: oneOf(POSITION_LENSES, one("tab"), PORTFOLIO_DEFAULTS.tab),
    sort: oneOf(POSITION_SORTS, one("sort"), PORTFOLIO_DEFAULTS.sort),
    dir: parseDir(one("dir")),
    side: oneOf(SIDE_IDS, one("side"), PORTFOLIO_DEFAULTS.side),
    topic: oneOf(TOPIC_IDS, one("topic"), PORTFOLIO_DEFAULTS.topic),
    when: oneOf(WHEN_IDS, one("when"), PORTFOLIO_DEFAULTS.when),
    q: clampText(one("q"), MAX_QUERY_LEN),
  };
}

/** Every link on the page. Defaults omitted; `page` dropped whenever a filter changes. */
export function buildPortfolioHref(
  state: PortfolioState,
  patch: Partial<PortfolioState> = {},
  extra: { page?: number } = {},
): string {
  return buildQueryHref("/positions", state, PORTFOLIO_DEFAULT_STATE, patch, extra);
}

export function hasActivePortfolioFilters(state: PortfolioState): boolean {
  return hasActiveFilters(state, PORTFOLIO_DEFAULT_STATE, VIEW_STATE_AXES);
}

export function portfolioSheetCount(state: PortfolioState): number {
  return sheetFilterCount(state, PORTFOLIO_DEFAULT_STATE, SHEET_AXES);
}

/** `Clear` returns to the default page, keeping the sort the player chose. */
export function clearedPortfolioState(state: PortfolioState): PortfolioState {
  return { ...PORTFOLIO_DEFAULT_STATE, sort: state.sort, dir: state.dir };
}

/* ──────────────────────────────────── the predicates ──────────────────────────────────── */

/**
 * ⭐ THE LENS, AND THE PARTITION IT MUST SATISFY. `open` and `settled` are DISJOINT and together
 * they are `all`; `win ∪ loss ∪ void ∪ cashed` is exactly `settled`. `test:query-core` and
 * `test:lifecycle-reach` both assert that arithmetic rather than membership — ⛔ a membership
 * check passes over a population where the defect cannot appear, which is this programme's most
 * expensive recurring lesson.
 */
export function matchesLens(row: PortfolioRow, lens: PositionLens): boolean {
  switch (lens) {
    case "all": return true;
    case "open": return row.status === "OPEN";
    case "settled": return row.status !== "OPEN";
    case "win": return row.status === "WIN";
    case "loss": return row.status === "LOSS";
    case "void": return row.status === "VOID";
    case "cashed": return row.status === "CASHED_OUT";
  }
}

export function matchesSide(row: PortfolioRow, side: SideId): boolean {
  return side === "any" || (side === "yes" ? row.side === "YES" : row.side === "NO");
}

export function matchesTopic(row: PortfolioRow, topic: string): boolean {
  return topic === "all" || row.category === topic;
}

/**
 * The date window, over the moment the bet was PLACED.
 *
 * ⚠️ `placedAt`, not settlement, and the choice is stated because it is not obvious: "my last 30
 * days" is a question about when the player acted. A settled-at window would make a bet placed in
 * March and settled in September appear under September, which is not where its owner would look
 * for it. `/wallet` and `/profile/activity` take the SAME vocabulary (task 4.13), so "last 30
 * days" means one span across the product.
 */
export function matchesWindow(row: PortfolioRow, when: WhenId, nowMs: number): boolean {
  if (when === "all") return true;
  const d = new Date(nowMs);
  const startOfToday = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  switch (when) {
    case "today": return row.placedAtMs >= startOfToday;
    case "yesterday": return row.placedAtMs >= startOfToday - DAY_MS && row.placedAtMs < startOfToday;
    case "7d": return row.placedAtMs >= nowMs - 7 * DAY_MS;
    case "30d": return row.placedAtMs >= nowMs - 30 * DAY_MS;
  }
}

export const DAY_MS = 24 * 3600_000;

/**
 * The five axes, keyed by the state field each reads.
 *
 * ⚠️ Built per request because `nowMs` and the parsed search are per-request — the same shape
 * `discovery.ts` uses, and for the same reason: the search grammar lives in `src/lib/search` and
 * re-implementing it here would create the second definition this module exists to prevent.
 */
export function portfolioAxes(
  nowMs: number,
  matchesText: (row: PortfolioRow) => boolean,
): Axes<PortfolioRow, PortfolioState> {
  return {
    tab: (r, s) => matchesLens(r, s.tab),
    side: (r, s) => matchesSide(r, s.side),
    topic: (r, s) => matchesTopic(r, s.topic),
    when: (r, s) => matchesWindow(r, s.when, nowMs),
    q: (r, s) => !s.q || matchesText(r),
  };
}

/* ─────────────────────────────────────── sorting ──────────────────────────────────────── */

export const PORTFOLIO_NATURAL_DIR: Record<PositionSortId, SortDir> = {
  recent: "desc",
  stake: "desc",
  return: "desc",
  closing: "asc",
  market: "asc",
};

/**
 * ⛔ `return` IS `null` FOR AN OPEN POSITION, AND THAT IS THE WHOLE POINT.
 *
 * A bet that has not settled has no return — not a return of zero. `?? 0` would land every open
 * position last in the natural direction and **first** the moment the player flips it, so
 * "which of my bets did best?" would answer with a page of undecided ones. `comparePrimary`
 * partitions on `null` and puts them last in BOTH directions.
 *
 * ⚠️ A VOID returns the stake, so its return is 0 — a real zero, not an absent one. It sorts
 * among the decided positions, which is correct: nothing was won and nothing was lost.
 */
function portfolioKey(row: PortfolioRow, sort: PositionSortId): number | string | null {
  switch (sort) {
    case "recent": return row.placedAtMs;
    case "stake": return row.stake;
    case "return": return row.finalPayout == null ? null : row.finalPayout - row.stake;
    case "closing": return row.closesAtMs;
    case "market": return row.title;
  }
}

/**
 * Tie-breakers, one per sort, all explicit.
 *
 * ⛔ Without them the order of two equal rows is whatever order the store returned, and this page
 * re-reads every 20 seconds (`RefreshPoller`) — a list that reshuffles under the reader for no
 * reason they can see. `discovery.ts:432-445` is the same ruling for the same reason.
 */
const PORTFOLIO_TIE_BREAK: Record<PositionSortId, (a: PortfolioRow, b: PortfolioRow) => number> = {
  recent: (a, b) => b.stake - a.stake,
  stake: (a, b) => b.placedAtMs - a.placedAtMs,
  return: (a, b) => b.stake - a.stake,
  closing: (a, b) => b.placedAtMs - a.placedAtMs,
  market: (a, b) => b.placedAtMs - a.placedAtMs,
};

/**
 * The board's ordering, as data.
 *
 * ⚠️ `collate` is supplied by the CALLER, per request, because collation is a fact about the
 * player's locale and this module cannot know it. ⛔ Never `localeCompare()` with no locale —
 * that orders by the SERVER's locale, which is one answer for every player and the wrong one for
 * most of them.
 */
export function portfolioSortSpec(collate?: (a: string, b: string) => number): SortSpec<PortfolioRow, PositionSortId> {
  return {
    ids: POSITION_SORTS,
    natural: PORTFOLIO_NATURAL_DIR,
    key: portfolioKey,
    tieBreak: PORTFOLIO_TIE_BREAK,
    collate,
  };
}

export function sortPortfolio(
  rows: readonly PortfolioRow[],
  state: Pick<PortfolioState, "sort" | "dir">,
  collate?: (a: string, b: string) => number,
): PortfolioRow[] {
  return sortBy(portfolioSortSpec(collate), rows, state);
}

/** Re-exported so a caller can build a comparator without reaching past this contract. */
export { comparePrimary };

/* ──────────────────────────────── filtering + counting ────────────────────────────────── */

export function filterPortfolio(
  rows: readonly PortfolioRow[],
  state: PortfolioState,
  nowMs: number,
  matchesText: (row: PortfolioRow) => boolean,
): PortfolioRow[] {
  return filterRows(rows, state, portfolioAxes(nowMs, matchesText));
}

/**
 * ⭐ EVERY COUNT ON THIS PAGE, CROSS-FILTERED. The number beside a control is what pressing it
 * would actually show, with every other filter still on.
 *
 * 🔴 The rule's price is written out in `lib/query/counts.ts`: a board once printed
 * *"40 live · TZS 1,659k in play"* above ZERO cards. The number was true and the board was a lie.
 */
export function portfolioCounts(
  rows: readonly PortfolioRow[],
  state: PortfolioState,
  nowMs: number,
  matchesText: (row: PortfolioRow) => boolean,
) {
  const axes = portfolioAxes(nowMs, matchesText);
  return {
    tab: countsFor(rows, state, axes, "tab", POSITION_LENSES),
    side: countsFor(rows, state, axes, "side", SIDE_IDS),
    topic: countsFor(rows, state, axes, "topic", TOPIC_IDS),
    when: countsFor(rows, state, axes, "when", WHEN_IDS),
  };
}

export function portfolioCountFor(
  rows: readonly PortfolioRow[],
  state: PortfolioState,
  nowMs: number,
  matchesText: (row: PortfolioRow) => boolean,
  patch: Partial<PortfolioState>,
): number {
  return countFor(rows, state, portfolioAxes(nowMs, matchesText), patch);
}

/* ─────────────────────────────── empty causes + exits ─────────────────────────────────── */

export type PortfolioExitId = "side" | "topic" | "when" | "q" | "tab";

/**
 * The exits, in the order they are offered — widest-value-for-least-loss first.
 *
 * ⚠️ `tab` relaxes to `all`, which IS its default here (unlike `/markets`, where `Clear all`
 * returns to `open` and the exit widens past it to `all`). Stated rather than assumed, because
 * the two pages differ and a reader would otherwise have to check.
 */
const PORTFOLIO_EXITS: readonly ExitCandidate<PortfolioState, PortfolioExitId>[] = [
  { id: "side", patch: { side: "any" } },
  { id: "topic", patch: { topic: "all" } },
  { id: "when", patch: { when: "all" } },
  { id: "q", patch: { q: "" } },
  { id: "tab", patch: { tab: "all" } },
];

export function portfolioExits(
  rows: readonly PortfolioRow[],
  state: PortfolioState,
  nowMs: number,
  matchesText: (row: PortfolioRow) => boolean,
): Relaxation<PortfolioState, PortfolioExitId>[] {
  return relaxations(rows, state, portfolioAxes(nowMs, matchesText), PORTFOLIO_EXITS);
}

/**
 * ⭐ THE LENSES WHOSE EMPTINESS IS A HEALTHY FACT, not a miss.
 *
 * *"Nothing of yours has been refunded"* is good news and must read as good news — the same
 * reasoning `/markets` applies to an empty `progress` board. ⛔ `all` is NOT among them: an empty
 * `all` means the player holds nothing, which `no-rows` already says better.
 *
 * ⚠️ `emptyKind` will only claim one of these when the lens is the ONLY thing narrowing. Saying
 * "nothing of yours has been refunded" to someone who has a refund under another topic is a
 * confident false statement — see that function's own note.
 */
const HEALTHY_EMPTY: readonly string[] = ["open", "settled", "win", "loss", "void", "cashed"];

export function portfolioEmptyCause(
  state: PortfolioState,
  nowMs: number,
  matchesText: (row: PortfolioRow) => boolean,
  shown: number,
  total: number,
): EmptyKind | null {
  return emptyKind({
    state,
    defaults: PORTFOLIO_DEFAULT_STATE,
    axes: portfolioAxes(nowMs, matchesText),
    shown,
    total,
    lensKey: "tab",
    healthyEmpty: HEALTHY_EMPTY,
    searchKey: "q",
    windowKey: "when",
  });
}
