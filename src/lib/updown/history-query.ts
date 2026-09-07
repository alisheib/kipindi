/**
 * /updown/history query contract — lens · asset · duration · window · sort · search.
 *
 * ⭐ THE ROW HERE IS A ROUND, NOT A BET. The page groups a player's positions by `marketId`
 * because a player who quick-bet the same round three times played ONE round — the page's own
 * day counts already fold that way, with the reason written beside them: *"a count of positions
 * would promise 9 and deliver 3 on a day the player quick-bet the same round three times."*
 * Every lens, count and sort below is therefore over rounds.
 *
 * ⛔ NO SERVER IMPORTS. The page reads `getMyUpDownHistory`, groups, and hands rows here.
 */
import { PLAYER_PRESETS } from "@/lib/query/windows";
import { clampText, oneOf, oneParam, parseDir } from "@/lib/query/parse";
import { buildQueryHref, hasActiveFilters, sheetFilterCount } from "@/lib/query/href";
import { countFor, countsFor, filterRows, type Axes } from "@/lib/query/counts";
import { emptyKind, relaxations, type EmptyKind, type ExitCandidate, type Relaxation } from "@/lib/query/empty";
import { sortBy, type SortDir, type SortSpec } from "@/lib/query/sort";
import { MAX_QUERY_LEN } from "@/lib/search/query";

/* ─────────────────────────── the row this module reasons about ────────────────────────── */

/**
 * One round the player took part in.
 *
 * ⚠️ `anyOpen` OUTRANKS `outcome`, exactly as the card's own chip ladder does: a round holding
 * any still-open bet reads "In play" whatever the round itself did. The lens must agree with the
 * chip, or a player pressing `Up wins` lands on a card that says something else.
 */
export type HistoryRow = {
  /** The round's market id — the group key, and the row identity a driver reads. */
  id: string;
  assetKey: string;
  durationMinutes: number;
  anyOpen: boolean;
  /** The ROUND's result. `null` while the settlement price is still being confirmed. */
  outcome: "UP" | "DOWN" | "VOID" | null;
  stake: number;
  returned: number;
  /** Newest placement on this round — what the page has always ordered by. */
  latestMs: number;
  /** `settledAt ?? placedAt` — the clock the day filter and the digest both bin by. */
  binnedAtMs: number;
  /** The asset's localised name, for search and for the collated name sort. */
  assetName: string;
};

/* ─────────────────────────────────── the URL contract ─────────────────────────────────── */

/**
 * ⭐ SIX LENSES, AND THE FIFTH STATE IS WHY THERE ARE SIX RATHER THAN FIVE.
 *
 * The campaign's plan named five — All · In play · Up wins · Down wins · Refunded. Reading the
 * card's own chip ladder shows a fifth outcome state it did not account for: a round whose bets
 * have settled but whose settlement PRICE is still being confirmed renders *"Confirming price"*
 * and is none of the four. ⛔ Leaving it out would have made the rail's lenses fail to COVER
 * `all` — every such round reachable by no control — which is precisely the arithmetic
 * `qa:player-filters` checks and `test:lifecycle-reach` will assert. So it gets a lens.
 *
 * The six are a PARTITION: `inplay` (any bet still open) then, among the rest, exactly one of
 * `up` · `down` · `void` · `pending`.
 */
export const UD_LENSES = ["all", "inplay", "up", "down", "void", "pending"] as const;
export type UdLens = (typeof UD_LENSES)[number];

export const UD_SORTS = ["recent", "stake", "return", "asset"] as const;
export type UdSortId = (typeof UD_SORTS)[number];

/** ⛔ Derived from the shared preset list — "last 30 days" means one span across the product. */
export const UD_WHEN_IDS = PLAYER_PRESETS;
export type UdWhenId = (typeof UD_WHEN_IDS)[number];

export const UD_DEFAULTS = {
  tab: "all" as UdLens,
  sort: "recent" as UdSortId,
  dir: null as SortDir | null,
  asset: "all" as string,
  dur: "all" as string,
  when: "all" as UdWhenId,
  q: "" as string,
  /**
   * ⛔ `?day=` SURVIVES, AND REMOVING IT WOULD HAVE BROKEN LIVE LINKS. The Up & Down digest deep
   * links to an exact EAT day, and `page.tsx`'s own note records that the rail must keep showing
   * a day older than its window because *"a selected control that is not on screen is how a
   * player concludes the filter is stuck."* The shared WINDOW is added beside it, not instead of
   * it: `?when=` is the vocabulary every other surface uses, `?day=` is the one a notification
   * already sent someone. ⚠️ When both are present the exact day wins — it is the more specific
   * request, and it is the one the player was linked to.
   */
  day: "" as string,
};

export type UdQueryState = {
  tab: UdLens;
  sort: UdSortId;
  dir: SortDir | null;
  asset: string;
  dur: string;
  when: UdWhenId;
  q: string;
  day: string;
};

export const UD_DEFAULT_STATE: UdQueryState = { ...UD_DEFAULTS };

/** The axes the phone sheet holds. ⚠️ `day` is not among them — it has the rail. */
export const UD_SHEET_AXES = ["asset", "dur", "when"] as const;
const UD_VIEW_STATE_AXES = ["sort", "dir"] as const;

/**
 * ⚠️ `assetIds` and `durIds` are passed IN, derived from the player's own rounds — never a typed
 * list. A player who has only ever played Bitcoin must not be offered a Gold pill that can only
 * ever be empty, and a duration the operator has since retired must still be reachable by
 * someone who played it.
 */
export function parseUdParams(
  sp: Record<string, string | string[] | undefined>,
  assetIds: readonly string[],
  durIds: readonly string[],
  isValidDay: (d: string) => boolean,
): UdQueryState {
  const one = (k: string) => oneParam(sp, k);
  const rawDay = one("day") ?? "";
  return {
    tab: oneOf(UD_LENSES, one("tab"), UD_DEFAULTS.tab),
    sort: oneOf(UD_SORTS, one("sort"), UD_DEFAULTS.sort),
    dir: parseDir(one("dir")),
    asset: oneOf(["all", ...assetIds] as const, one("asset"), UD_DEFAULTS.asset),
    dur: oneOf(["all", ...durIds] as const, one("dur"), UD_DEFAULTS.dur),
    when: oneOf(UD_WHEN_IDS, one("when"), UD_DEFAULTS.when),
    q: clampText(one("q"), MAX_QUERY_LEN),
    /**
     * 🔴 ONE VALIDATED VALUE DRIVES THE FILTER, THE RAIL AND THE EMPTY STATE — the page's own
     * hard-won rule, carried into the parser instead of being re-applied at each use. The first
     * version validated for the chip but filtered on the RAW param, so `?day=lol` matched no
     * round, hid every card, and rendered no control to clear it: a dead end reached by one typo.
     */
    day: isValidDay(rawDay) ? rawDay : UD_DEFAULTS.day,
  };
}

export function buildUdHref(
  state: UdQueryState,
  patch: Partial<UdQueryState> = {},
  extra: { page?: number } = {},
): string {
  return buildQueryHref("/updown/history", state, UD_DEFAULT_STATE, patch, extra);
}

export function hasActiveUdFilters(state: UdQueryState): boolean {
  return hasActiveFilters(state, UD_DEFAULT_STATE, UD_VIEW_STATE_AXES);
}

export function udSheetCount(state: UdQueryState): number {
  return sheetFilterCount(state, UD_DEFAULT_STATE, UD_SHEET_AXES);
}

export function clearedUdState(state: UdQueryState): UdQueryState {
  return { ...UD_DEFAULT_STATE, sort: state.sort, dir: state.dir };
}

/* ──────────────────────────────────── the predicates ──────────────────────────────────── */

/** ⛔ The same ladder the card's chip uses, in the same order — `anyOpen` first. */
export function matchesUdLens(row: HistoryRow, lens: UdLens): boolean {
  switch (lens) {
    case "all": return true;
    case "inplay": return row.anyOpen;
    case "up": return !row.anyOpen && row.outcome === "UP";
    case "down": return !row.anyOpen && row.outcome === "DOWN";
    case "void": return !row.anyOpen && row.outcome === "VOID";
    case "pending": return !row.anyOpen && row.outcome === null;
  }
}

export const UD_DAY_MS = 24 * 3600_000;

export function matchesUdWindow(row: HistoryRow, when: UdWhenId, nowMs: number): boolean {
  if (when === "all") return true;
  const d = new Date(nowMs);
  const startOfToday = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  switch (when) {
    case "today": return row.binnedAtMs >= startOfToday;
    case "yesterday": return row.binnedAtMs >= startOfToday - UD_DAY_MS && row.binnedAtMs < startOfToday;
    case "7d": return row.binnedAtMs >= nowMs - 7 * UD_DAY_MS;
    case "30d": return row.binnedAtMs >= nowMs - 30 * UD_DAY_MS;
  }
}

/**
 * ⚠️ `inDay` IS INJECTED because EAT day arithmetic lives in `lib/eat-day.ts` and is shared with
 * the digest — re-deriving it here would be the second definition that makes a deep link and the
 * page it lands on disagree about which rounds belong to a day.
 */
export function udAxes(
  nowMs: number,
  matchesText: (row: HistoryRow) => boolean,
  inDay: (row: HistoryRow, day: string) => boolean,
): Axes<HistoryRow, UdQueryState> {
  return {
    tab: (r, s) => matchesUdLens(r, s.tab),
    asset: (r, s) => s.asset === "all" || r.assetKey === s.asset,
    dur: (r, s) => s.dur === "all" || String(r.durationMinutes) === s.dur,
    // ⛔ The exact day WINS over the window — the more specific request, and the one a
    //    notification already sent someone to.
    when: (r, s) => (s.day ? inDay(r, s.day) : matchesUdWindow(r, s.when, nowMs)),
    q: (r, s) => !s.q || matchesText(r),
  };
}

/* ─────────────────────────────────────── sorting ──────────────────────────────────────── */

export const UD_NATURAL_DIR: Record<UdSortId, SortDir> = {
  recent: "desc",
  stake: "desc",
  return: "desc",
  asset: "asc",
};

/**
 * ⛔ `return` IS `null` FOR A ROUND STILL IN PLAY. An open round has not decided a return, and
 * that is not a return of zero — `comparePrimary` puts them last in BOTH directions, so "which
 * of my rounds did best?" is never answered with a page of undecided ones.
 */
function udKey(row: HistoryRow, sort: UdSortId): number | string | null {
  switch (sort) {
    case "recent": return row.latestMs;
    case "stake": return row.stake;
    case "return": return row.anyOpen ? null : row.returned - row.stake;
    case "asset": return row.assetName;
  }
}

const UD_TIE_BREAK: Record<UdSortId, (a: HistoryRow, b: HistoryRow) => number> = {
  recent: (a, b) => b.stake - a.stake,
  stake: (a, b) => b.latestMs - a.latestMs,
  return: (a, b) => b.stake - a.stake,
  asset: (a, b) => b.latestMs - a.latestMs,
};

export function udSortSpec(collate?: (a: string, b: string) => number): SortSpec<HistoryRow, UdSortId> {
  return { ids: UD_SORTS, natural: UD_NATURAL_DIR, key: udKey, tieBreak: UD_TIE_BREAK, collate };
}

export function sortUd(
  rows: readonly HistoryRow[],
  state: Pick<UdQueryState, "sort" | "dir">,
  collate?: (a: string, b: string) => number,
): HistoryRow[] {
  return sortBy(udSortSpec(collate), rows, state);
}

/* ──────────────────────────────── filtering + counting ────────────────────────────────── */

export function filterUd(
  rows: readonly HistoryRow[],
  state: UdQueryState,
  nowMs: number,
  matchesText: (row: HistoryRow) => boolean,
  inDay: (row: HistoryRow, day: string) => boolean,
): HistoryRow[] {
  return filterRows(rows, state, udAxes(nowMs, matchesText, inDay));
}

export function udCounts(
  rows: readonly HistoryRow[],
  state: UdQueryState,
  nowMs: number,
  matchesText: (row: HistoryRow) => boolean,
  inDay: (row: HistoryRow, day: string) => boolean,
  assetIds: readonly string[],
  durIds: readonly string[],
) {
  const axes = udAxes(nowMs, matchesText, inDay);
  return {
    tab: countsFor(rows, state, axes, "tab", UD_LENSES),
    asset: countsFor(rows, state, axes, "asset", ["all", ...assetIds]),
    dur: countsFor(rows, state, axes, "dur", ["all", ...durIds]),
    when: countsFor(rows, state, axes, "when", UD_WHEN_IDS),
  };
}

export function udCountFor(
  rows: readonly HistoryRow[],
  state: UdQueryState,
  nowMs: number,
  matchesText: (row: HistoryRow) => boolean,
  inDay: (row: HistoryRow, day: string) => boolean,
  patch: Partial<UdQueryState>,
): number {
  return countFor(rows, state, udAxes(nowMs, matchesText, inDay), patch);
}

/* ─────────────────────────────── empty causes + exits ─────────────────────────────────── */

export type UdExitId = "asset" | "dur" | "when" | "q" | "tab";

const UD_EXITS: readonly ExitCandidate<UdQueryState, UdExitId>[] = [
  { id: "asset", patch: { asset: "all" } },
  { id: "dur", patch: { dur: "all" } },
  // ⚠️ Clearing the window clears the exact DAY too — otherwise "All time" would be offered on a
  //    page still pinned to one day, and pressing it would change nothing a player could see.
  { id: "when", patch: { when: "all", day: "" } },
  { id: "q", patch: { q: "" } },
  { id: "tab", patch: { tab: "all" } },
];

export function udExits(
  rows: readonly HistoryRow[],
  state: UdQueryState,
  nowMs: number,
  matchesText: (row: HistoryRow) => boolean,
  inDay: (row: HistoryRow, day: string) => boolean,
): Relaxation<UdQueryState, UdExitId>[] {
  return relaxations(rows, state, udAxes(nowMs, matchesText, inDay), UD_EXITS);
}

const UD_HEALTHY_EMPTY: readonly string[] = UD_LENSES.filter((l) => l !== "all");

export function udEmptyCause(
  state: UdQueryState,
  nowMs: number,
  matchesText: (row: HistoryRow) => boolean,
  inDay: (row: HistoryRow, day: string) => boolean,
  shown: number,
  total: number,
): EmptyKind | null {
  return emptyKind({
    state,
    defaults: UD_DEFAULT_STATE,
    axes: udAxes(nowMs, matchesText, inDay),
    shown,
    total,
    lensKey: "tab",
    healthyEmpty: UD_HEALTHY_EMPTY,
    searchKey: "q",
    windowKey: "when",
  });
}
