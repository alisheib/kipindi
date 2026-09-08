/**
 * /proposals board contract — lifecycle lens · mine · topic · when · sort · search.
 *
 * 🔴 THE RAIL THIS REPLACES ASKED THREE DIFFERENT QUESTIONS AT ONCE, which is the §A5/§7g defect
 * the campaign exists to remove. Its four pills were:
 *
 *   · `hot`    — an ORDERING (score descending) **plus** a threshold filter
 *   · `new`    — an ORDERING (recency), filtering nothing at all
 *   · `listed` — a STATUS lens (`LISTED ∪ RESOLVED`)
 *   · `mine`   — an OWNERSHIP filter
 *
 * ⛔ Two of the four were sorts wearing lens clothing, so pressing them could never compose with
 * anything: a player could not ask for "my proposals, newest first" because `mine` and `new` were
 * the same control. Sorting is now the sort, ownership is an axis, and the rail is a lifecycle
 * lens like every other route's.
 *
 * ⭐ SEVEN LENSES, AND THEY ARE THE CARD'S OWN CHIP LADDER. `status-badge.tsx` renders six
 * distinct status words — Under review · Changes requested · Approved · Live · Resolved ·
 * Declined — each with its own glyph and its own tone. Reading that ladder before writing the
 * lens set is this campaign's most expensive recurring lesson (it undercounted `/updown/history`
 * and `/watchlist` before this). ⛔ In particular `CHANGES_REQUESTED` is NOT folded into "under
 * review": it is the one state where the PROPOSER has to act, so a proposer who cannot select it
 * cannot find the thing waiting on them.
 *
 * ⚠️ `Hot` IS NOT A LENS, BECAUSE THE CARD DOES NOT TREAT IT AS A STATUS. `status-badge.tsx`
 * paints it as an OVERLAY on `REVIEW`/`CHANGES_REQUESTED` — a crowd signal, not a lifecycle step
 * ("Hot lost the same gold gradient … 'Hot' is a crowd signal, not a payout"). It is the default
 * SORT here, which is what it always really was.
 *
 * ⛔ NO SERVER IMPORTS beyond erased types. The page hydrates the views and hands rows here.
 */
import type { ProposalCategory, ProposalStatus } from "@/lib/server/store";
import { PLAYER_PRESETS } from "@/lib/query/windows";
import { clampText, oneOf, oneParam, parseDir } from "@/lib/query/parse";
import { buildQueryHref, hasActiveFilters, sheetFilterCount } from "@/lib/query/href";
import { countFor, countsFor, filterRows, type Axes } from "@/lib/query/counts";
import { emptyKind, relaxations, type EmptyKind, type ExitCandidate, type Relaxation } from "@/lib/query/empty";
import { sortBy, type SortDir, type SortSpec } from "@/lib/query/sort";
import { MAX_QUERY_LEN } from "@/lib/search/query";

/* ─────────────────────────── the row this module reasons about ────────────────────────── */

export type BoardRow = {
  id: string;
  status: ProposalStatus;
  category: ProposalCategory;
  /** `up - down`, the crowd's net verdict — the `hot` sort's key. */
  score: number;
  /** ⚠️ Passed in, not derived: `isHot` needs `hotThreshold`, which is server config. */
  isHot: boolean;
  isMine: boolean;
  createdAtMs: number;
  /** `Date.parse(resolutionDate)` — the `closing` sort's key. `null` when unparseable. */
  resolutionAtMs: number | null;
  titleEn: string;
  titleSw: string;
  titleZh: string;
  description: string;
  criterion: string;
  proposerMasked: string;
};

/* ─────────────────────────────────── the URL contract ─────────────────────────────────── */

/**
 * ⭐ A PARTITION OF ALL SIX `ProposalStatus` VALUES — re-derive it, never trust this comment:
 *
 *     grep -n "enum ProposalStatus" -A 8 prisma/schema.prisma
 *
 * `matchesBoardLens` is written as an exhaustive `switch` over the lens, and `LENS_OF` below maps
 * every status to exactly one lens — so a value added to that enum fails to COMPILE here rather
 * than silently landing in no pill.
 */
export const BOARD_LENSES = ["all", "review", "changes", "approved", "live", "resolved", "declined"] as const;
export type BoardLens = (typeof BOARD_LENSES)[number];

/**
 * ⛔ EXHAUSTIVE BY THE TYPE SYSTEM, WHICH IS THE POINT. A `Record<ProposalStatus, …>` cannot be
 * written without every key, so a new status is a compile error here — the "covering by
 * construction rather than by enumeration" rule `/watchlist` arrived at, expressed as a type
 * instead of as a residual arm.
 */
const LENS_OF: Record<ProposalStatus, Exclude<BoardLens, "all">> = {
  REVIEW: "review",
  CHANGES_REQUESTED: "changes",
  APPROVED: "approved",
  LISTED: "live",
  RESOLVED: "resolved",
  DECLINED: "declined",
};

export const BOARD_SORTS = ["hot", "new", "closing"] as const;
export type BoardSortId = (typeof BOARD_SORTS)[number];

export const MINE_IDS = ["any", "mine"] as const;
export type MineId = (typeof MINE_IDS)[number];

/**
 * 🔴 EIGHT TOPICS, NOT THE MARKET BOARD'S SEVEN, AND USING THE WRONG LIST WOULD HAVE HIDDEN TWO.
 * A proposal's category is `ProposalCategory`, which carries `infrastructure` and `mixed` that no
 * market has (`proposals-service.ts:78-79`: *"infrastructure folds into 'tech'; 'mixed' … "*).
 * Reaching for `MARKET_CATEGORIES` — the list every other rail in this campaign uses — would have
 * left every infrastructure and every cross-category proposal matching only `all`, filtered out by
 * each of the seven topic pills, with nothing on screen saying so.
 *
 * ⛔ SO THE LIST IS TYPE-CHECKED RATHER THAN TYPED. `Record<ProposalCategory, null>` cannot be
 * written without every key, so a category added to the enum is a compile error here.
 * ⚠️ The ORDER is the record's insertion order, which is the order a reader sees on the rail.
 */
const TOPIC_EXHAUSTIVE: Record<ProposalCategory, null> = {
  sports: null, macro: null, weather: null, crypto: null,
  culture: null, infrastructure: null, tech: null, mixed: null,
};
export const BOARD_TOPIC_IDS: readonly ("all" | ProposalCategory)[] = [
  "all",
  ...(Object.keys(TOPIC_EXHAUSTIVE) as ProposalCategory[]),
];

export const BOARD_WHEN_IDS = PLAYER_PRESETS;
export type BoardWhenId = (typeof BOARD_WHEN_IDS)[number];

/**
 * ⭐ THE DEFAULTS PRESERVE TODAY'S LANDING ORDER AND WIDEN ITS ROWS.
 *
 * ⚠️ `sort: "hot"` IS TODAY'S DEFAULT ORDERING, KEPT EXACTLY — `f=hot` sorted by score descending
 * and that is what a vote board should open on.
 *
 * 🔴 `lens: "all"` IS WIDER THAN TODAY, DELIBERATELY, AND THE ARITHMETIC MATTERS. `f=hot` did not
 * merely sort: it also required `score >= hotThreshold`, and that threshold is **200 net votes**
 * (`proposals-config.ts:55`). So the default board showed NOTHING until a proposal had gathered
 * two hundred more ups than downs — on a young board, an empty page over a populated table, with
 * the rows one pill away. ⛔ Nothing is removed by this change: every row `f=hot` showed still
 * appears, at the top, because the ordering is unchanged.
 */
export const BOARD_DEFAULTS = {
  lens: "all" as BoardLens,
  mine: "any" as MineId,
  cat: "all" as string,
  when: "all" as BoardWhenId,
  sort: "hot" as BoardSortId,
  dir: null as SortDir | null,
  q: "" as string,
};

export type BoardState = {
  lens: BoardLens;
  mine: MineId;
  cat: string;
  when: BoardWhenId;
  sort: BoardSortId;
  dir: SortDir | null;
  q: string;
};

export const BOARD_DEFAULT_STATE: BoardState = { ...BOARD_DEFAULTS };

export const BOARD_SHEET_AXES = ["mine", "cat", "when"] as const;
const BOARD_VIEW_STATE_AXES = ["sort", "dir"] as const;

/**
 * ⭐ THE LEGACY `?f=` SHIM, AND IT IS A COMPATIBILITY PROMISE RATHER THAN A CONVENIENCE. Links to
 * `?f=mine` are delivered by the product itself — `page.tsx` redirects an unauthenticated player
 * to `/auth/login?next=/proposals?f=mine` and back — so a live round trip carries one, and the
 * dev e2e drives `mine` and `listed` by name.
 *
 * ⚠️ `f=listed` MEANT `LISTED ∪ RESOLVED` AND THOSE ARE NOW TWO LENSES, so it can only map to one.
 * It maps to `live`, and that is the honest half: `listed` was the "it became a real market" view
 * and `live` is the market that is still running. ⛔ Nothing is hidden — the `Resolved` pill sits
 * beside it carrying its own count, which is precisely the distinction the campaign's complaint
 * ("cannot tell what is still running from what is finished") demands be visible.
 *
 * ⛔ An EXPLICIT param always wins over the shim, so `?f=new&sort=hot` means what it says.
 */
const LEGACY_F: Record<string, Partial<BoardState>> = {
  hot: { sort: "hot" },
  new: { sort: "new" },
  listed: { lens: "live" },
  mine: { mine: "mine" },
};

export function parseBoardParams(sp: Record<string, string | string[] | undefined>): BoardState {
  const one = (k: string) => oneParam(sp, k);
  const legacy = LEGACY_F[String(one("f") ?? "")] ?? {};
  const has = (k: string) => one(k) !== undefined;
  return {
    lens: has("lens") ? oneOf(BOARD_LENSES, one("lens"), BOARD_DEFAULTS.lens) : (legacy.lens ?? BOARD_DEFAULTS.lens),
    mine: has("mine") ? oneOf(MINE_IDS, one("mine"), BOARD_DEFAULTS.mine) : (legacy.mine ?? BOARD_DEFAULTS.mine),
    cat: oneOf(BOARD_TOPIC_IDS, one("cat"), BOARD_DEFAULTS.cat),
    when: oneOf(BOARD_WHEN_IDS, one("when"), BOARD_DEFAULTS.when),
    sort: has("sort") ? oneOf(BOARD_SORTS, one("sort"), BOARD_DEFAULTS.sort) : (legacy.sort ?? BOARD_DEFAULTS.sort),
    dir: parseDir(one("dir")),
    q: clampText(one("q"), MAX_QUERY_LEN),
  };
}

export function buildBoardHref(
  state: BoardState,
  patch: Partial<BoardState> = {},
  extra: { page?: number } = {},
): string {
  return buildQueryHref("/proposals", state, BOARD_DEFAULT_STATE, patch, extra);
}

export function hasActiveBoardFilters(state: BoardState): boolean {
  return hasActiveFilters(state, BOARD_DEFAULT_STATE, BOARD_VIEW_STATE_AXES);
}

export function boardSheetCount(state: BoardState): number {
  return sheetFilterCount(state, BOARD_DEFAULT_STATE, BOARD_SHEET_AXES);
}

export function clearedBoardState(state: BoardState): BoardState {
  return { ...BOARD_DEFAULT_STATE, sort: state.sort, dir: state.dir };
}

/** ⛔ The one place that knows `mine` needs a session — see `page.tsx`'s B-14 round-trip. */
export function needsSession(state: BoardState): boolean {
  return state.mine === "mine";
}

/* ──────────────────────────────────── the predicates ──────────────────────────────────── */

export function matchesBoardLens(row: BoardRow, lens: BoardLens): boolean {
  return lens === "all" || LENS_OF[row.status] === lens;
}

export const BOARD_DAY_MS = 24 * 3600_000;

/** ⚠️ The window is about when the proposal was RAISED — the only date every row has. */
export function matchesBoardWindow(row: BoardRow, when: BoardWhenId, nowMs: number): boolean {
  if (when === "all") return true;
  const d = new Date(nowMs);
  const startOfToday = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  switch (when) {
    case "today": return row.createdAtMs >= startOfToday;
    case "yesterday": return row.createdAtMs >= startOfToday - BOARD_DAY_MS && row.createdAtMs < startOfToday;
    case "7d": return row.createdAtMs >= nowMs - 7 * BOARD_DAY_MS;
    case "30d": return row.createdAtMs >= nowMs - 30 * BOARD_DAY_MS;
  }
}

export function boardAxes(
  nowMs: number,
  matchesText: (row: BoardRow) => boolean,
): Axes<BoardRow, BoardState> {
  return {
    lens: (r, s) => matchesBoardLens(r, s.lens),
    mine: (r, s) => s.mine === "any" || r.isMine,
    cat: (r, s) => s.cat === "all" || r.category === s.cat,
    when: (r, s) => matchesBoardWindow(r, s.when, nowMs),
    q: (r, s) => !s.q || matchesText(r),
  };
}

/* ─────────────────────────────────────── sorting ──────────────────────────────────────── */

export const BOARD_NATURAL_DIR: Record<BoardSortId, SortDir> = {
  hot: "desc",
  new: "desc",
  closing: "asc",
};

function boardKey(row: BoardRow, sort: BoardSortId): number | null {
  switch (sort) {
    case "hot": return row.score;
    case "new": return row.createdAtMs;
    // ⛔ `null`, never 0: a proposal whose resolution date will not parse has NO closing time, and
    //    0 would sort it as "closing in 1970" — first in ascending order, at the top of the board.
    case "closing": return row.resolutionAtMs;
  }
}

/**
 * ⭐ SCORE IS THE TIE-BREAK UNDER THE OTHER TWO, and recency under score — which reproduces
 * today's two orderings underneath whichever one is chosen. `f=hot` sorted by score alone and left
 * equal-score proposals in whatever order the store returned; they now settle by recency, so the
 * board does not reshuffle under a reader between renders.
 */
const BOARD_TIE_BREAK: Record<BoardSortId, (a: BoardRow, b: BoardRow) => number> = {
  hot: (a, b) => b.createdAtMs - a.createdAtMs,
  new: (a, b) => b.score - a.score,
  closing: (a, b) => b.score - a.score,
};

export const BOARD_SORT_SPEC: SortSpec<BoardRow, BoardSortId> = {
  ids: BOARD_SORTS,
  natural: BOARD_NATURAL_DIR,
  key: boardKey,
  tieBreak: BOARD_TIE_BREAK,
};

export function sortBoard(
  rows: readonly BoardRow[],
  state: Pick<BoardState, "sort" | "dir">,
): BoardRow[] {
  return sortBy(BOARD_SORT_SPEC, rows, state);
}

/* ──────────────────────────────── filtering + counting ────────────────────────────────── */

export function filterBoard(
  rows: readonly BoardRow[],
  state: BoardState,
  nowMs: number,
  matchesText: (row: BoardRow) => boolean,
): BoardRow[] {
  return filterRows(rows, state, boardAxes(nowMs, matchesText));
}

export function boardCounts(
  rows: readonly BoardRow[],
  state: BoardState,
  nowMs: number,
  matchesText: (row: BoardRow) => boolean,
) {
  const axes = boardAxes(nowMs, matchesText);
  return {
    lens: countsFor(rows, state, axes, "lens", BOARD_LENSES),
    mine: countsFor(rows, state, axes, "mine", MINE_IDS),
    cat: countsFor(rows, state, axes, "cat", BOARD_TOPIC_IDS as readonly string[]),
    when: countsFor(rows, state, axes, "when", BOARD_WHEN_IDS),
  };
}

export function boardCountFor(
  rows: readonly BoardRow[],
  state: BoardState,
  nowMs: number,
  matchesText: (row: BoardRow) => boolean,
  patch: Partial<BoardState>,
): number {
  return countFor(rows, state, boardAxes(nowMs, matchesText), patch);
}

/* ─────────────────────────────── empty causes + exits ─────────────────────────────────── */

export type BoardExitId = "cat" | "when" | "mine" | "q" | "lens";

const BOARD_EXITS: readonly ExitCandidate<BoardState, BoardExitId>[] = [
  { id: "cat", patch: { cat: "all" } },
  { id: "when", patch: { when: "all" } },
  { id: "mine", patch: { mine: "any" } },
  { id: "q", patch: { q: "" } },
  { id: "lens", patch: { lens: "all" } },
];

export function boardExits(
  rows: readonly BoardRow[],
  state: BoardState,
  nowMs: number,
  matchesText: (row: BoardRow) => boolean,
): Relaxation<BoardState, BoardExitId>[] {
  return relaxations(rows, state, boardAxes(nowMs, matchesText), BOARD_EXITS);
}

/**
 * ⭐ EVERY LENS BUT `all` IS A HEALTHY EMPTY. A board with nothing declined is a good board, not a
 * broken filter, and on a young platform four of the six lenses are empty by definition.
 */
const BOARD_HEALTHY_EMPTY: readonly string[] = BOARD_LENSES.filter((l) => l !== "all");

export function boardEmptyCause(
  state: BoardState,
  nowMs: number,
  matchesText: (row: BoardRow) => boolean,
  shown: number,
  total: number,
): EmptyKind | null {
  return emptyKind({
    state,
    defaults: BOARD_DEFAULT_STATE,
    axes: boardAxes(nowMs, matchesText),
    shown,
    total,
    lensKey: "lens",
    healthyEmpty: BOARD_HEALTHY_EMPTY,
    searchKey: "q",
    windowKey: "when",
  });
}
