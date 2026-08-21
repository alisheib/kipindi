/**
 * /markets discovery contract — status · sort · odds · pool · topic · search.
 *
 * Inherited from the round-2 design kit (`docs/design-system/v3-2026-08-11-landing-discovery/`,
 * README §3 + COMPONENTS + the working prototype) and reconciled against this codebase's
 * measured behaviour in `design-brief/PLAN-OF-RECORD.md` §8.
 *
 * ⭐ WHY THIS FILE IS PURE. The page it serves had **three independent href builders**
 * (`markets/page.tsx` :161, :302, :415) plus a fourth inside `Pagination`. A new param had to
 * be threaded through every one of them or links silently dropped it — and one of the four
 * once disagreed with the page it pointed at. Parsing, defaulting, filtering, sorting and
 * href-building all live here, so there is ONE definition of each and a gate can read it.
 * DESIGN_AUTHORITY §B9 / LAWS 81: a derived state on more than one surface is defined once.
 *
 * ⛔ NO SERVER IMPORTS. Lifecycle facts (`isSelectionClosed`, `isClosedByTime`, `impliedYesPct`)
 * stay in `market-service.ts`, which is their one home; the page decorates each row with the
 * results and hands them here as `DiscoveryRow`. This file must never re-derive them — that is
 * how two surfaces start disagreeing about what "closed" means.
 */
import { MAX_QUERY_LEN } from "@/lib/search/query";

/* ─────────────────────────── the row this module reasons about ────────────────────────── */

export type MarketLifecycle = "DRAFT" | "LIVE" | "CLOSED" | "RESOLVED" | "VOIDED";

/**
 * The decorated shape the board hands to this module.
 *
 * ⚠️ `yesPct` is `null` — never a number — when the pool is empty. `impliedYesPct` returns a
 * hardcoded 50 on a market nobody has staked (`market-service.ts:232-236`). Feeding that into
 * an odds bucket would file a cold-start market under "Close call · 40–60%" on the strength of
 * a number nobody produced. Licence condition 1 (never render a guessed number) applies to
 * FILTERING too, not only to display.
 */
export type DiscoveryRow = {
  id: string;
  category: string;
  /** yesPool + noPool, TZS. */
  pool: number;
  predictors: number;
  /** null when `pool === 0` — see above. */
  yesPct: number | null;
  /** undefined without a 24h baseline (`market-history.ts`). A-5: never coerced to 0. */
  move24h: number | undefined;
  createdAtMs: number;
  /**
   * `selectionClosedAt ?? resolutionAt` — the deadline the CARD shows.
   *
   * 🔴 The board once windowed and sorted by `resolutionAt` while every card stated
   * time-to-betting-close, so "Ending soon" could omit a market that stopped taking bets in
   * ten minutes and list one whose betting shut hours ago. The clock a player is SHOWN is the
   * clock they must be filtered and sorted by.
   */
  bettableUntilMs: number;
  selectionClosed: boolean;
  status: MarketLifecycle;
  watched: boolean;
};

/**
 * The crowd's implied YES share, or **null when nobody has staked**.
 *
 * ⭐ ONE DEFINITION, THREE CONSUMERS (B9 / law 81): the board's `toRow`, the landing hero's
 * per-question price, and the hero's aggregate conviction bar. It is deliberately NOT
 * `impliedYesPct` from `market-service.ts` — that function returns a hardcoded **50** on an
 * empty pool, which is the right answer for a money projection and a fabricated number on a
 * display surface. Licence condition 1: never render a guessed figure. Matching
 * `market-card.tsx`'s own gate, the question is the POOL ALONE (`noPrice = volume === 0`) —
 * predictors do not enter into whether a price exists.
 *
 * ⚠️ Callers that need a WEIGHTED aggregate must pass summed pools, never average the
 * per-market results this returns: these values are rounded, and a mean of rounded percentages
 * is not the share of the money.
 */
export function pricedYesPct(yesPool: number, noPool: number): number | null {
  const pool = yesPool + noPool;
  if (pool <= 0) return null;
  return Math.round((yesPool / pool) * 100);
}

/* ─────────────────────────────────── the URL contract ─────────────────────────────────── */

export const STATUS_IDS = ["open", "today", "new", "watch", "all"] as const;
export const SORT_IDS = ["closing", "pool", "people", "close", "move", "new"] as const;
export const ODDS_IDS = ["any", "call", "cont", "long"] as const;
export const POOL_IDS = ["any", "10k", "50k"] as const;
export const DENSITY_IDS = ["grid", "list"] as const;

export type StatusId = (typeof STATUS_IDS)[number];
export type SortId = (typeof SORT_IDS)[number];
export type OddsId = (typeof ODDS_IDS)[number];
export type PoolId = (typeof POOL_IDS)[number];
export type Density = (typeof DENSITY_IDS)[number];
export type SortDir = "asc" | "desc";

/**
 * ⭐ THE DEFAULTS, IN ONE PLACE.
 *
 * A default that is re-typed at each reader is how `when=today` came to be hard-coded at four
 * sites, of which changing three left links that disagreed with the page they pointed at. Every
 * reader and every href builder in this module reads THESE constants; none carries a literal.
 */
export const DEFAULTS = {
  status: "open" as StatusId,
  sort: "closing" as SortId,
  /** absent = the sort's natural direction (`SORT_NATURAL_DIR`). Tri-state by design. */
  dir: null as SortDir | null,
  odds: "any" as OddsId,
  pool: "any" as PoolId,
  topic: "all" as string,
  q: "" as string,
} as const;

export type DiscoveryState = {
  status: StatusId;
  sort: SortId;
  dir: SortDir | null;
  odds: OddsId;
  pool: PoolId;
  topic: string;
  q: string;
};

export const DEFAULT_STATE: DiscoveryState = { ...DEFAULTS };

/** Page size: whole rows only, never an orphan. 12 at 2–3 columns, 6 at one column. */
export const PAGE_SIZE_WIDE = 12;
export const PAGE_SIZE_NARROW = 6;
/** One column below this width — the same breakpoint `.market-grid` uses. */
export const NARROW_MAX_PX = 720;

export function pageSizeFor(viewportWidth: number | null | undefined): number {
  return viewportWidth != null && viewportWidth < NARROW_MAX_PX ? PAGE_SIZE_NARROW : PAGE_SIZE_WIDE;
}

/** localStorage key — only `sort`, `dir`, `density` persist. Never status/odds/pool/topic/q. */
export const DISCOVERY_STORE_KEY = "50pick.discovery.v1";

/* ─────────────────────────────────────── parsing ──────────────────────────────────────── */

const oneOf = <T extends string>(allowed: readonly T[], raw: unknown, fallback: T): T =>
  typeof raw === "string" && (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;

/**
 * Max query length — the shared search parser's clamp itself, not a mirror of it.
 *
 * ⛔ This line used to read `export const MAX_QUERY_LEN = 120;` under a comment
 * saying it "mirrors" `@/lib/search`. A mirror is a second definition: the board's
 * URL parser and the search box that writes that URL would clamp to different
 * lengths the moment one of them was retuned, and the player's query would be
 * truncated by whichever is smaller with no sign that it happened. Re-exported
 * because it is part of this module's contract. `search/query.ts` has no imports of
 * its own, so this file's "NO SERVER IMPORTS" rule holds. Imported at the top of
 * the file with the other module-level bindings.
 */
export { MAX_QUERY_LEN };

/**
 * Parse the URL into state. Unknown values fall back to the default rather than throwing:
 * a hand-edited or stale link must still render a board, never a 500.
 */
export function parseDiscoveryParams(
  sp: Record<string, string | string[] | undefined>,
  topicIds: readonly string[],
): DiscoveryState {
  const one = (k: string): string | undefined => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const rawDir = one("dir");
  return {
    status: oneOf(STATUS_IDS, one("status"), DEFAULTS.status),
    sort: oneOf(SORT_IDS, one("sort"), DEFAULTS.sort),
    dir: rawDir === "asc" || rawDir === "desc" ? rawDir : DEFAULTS.dir,
    odds: oneOf(ODDS_IDS, one("odds"), DEFAULTS.odds),
    pool: oneOf(POOL_IDS, one("pool"), DEFAULTS.pool),
    topic: oneOf(["all", ...topicIds] as const, one("topic"), DEFAULTS.topic),
    q: (one("q") ?? "").trim().slice(0, MAX_QUERY_LEN),
  };
}

/**
 * THE href builder. Every link on the board goes through this one function, so a param can
 * never be dropped by a builder that did not know about it.
 *
 * Defaults are OMITTED — a clean board has a clean URL (`/markets`, not
 * `/markets?status=open&sort=closing&odds=any&pool=any&topic=all`).
 */
export function buildDiscoveryHref(
  state: DiscoveryState,
  patch: Partial<DiscoveryState> = {},
  extra: { page?: number } = {},
): string {
  const s: DiscoveryState = { ...state, ...patch };
  const p = new URLSearchParams();
  if (s.status !== DEFAULTS.status) p.set("status", s.status);
  if (s.sort !== DEFAULTS.sort) p.set("sort", s.sort);
  if (s.dir !== null) p.set("dir", s.dir);
  if (s.odds !== DEFAULTS.odds) p.set("odds", s.odds);
  if (s.pool !== DEFAULTS.pool) p.set("pool", s.pool);
  if (s.topic !== DEFAULTS.topic) p.set("topic", s.topic);
  if (s.q) p.set("q", s.q);
  if (extra.page != null && extra.page > 1) p.set("page", String(extra.page));
  const qs = p.toString();
  return qs ? `/markets?${qs}` : "/markets";
}

/** True when the player has narrowed anything — drives whether `Clear all` is offered. */
export function hasActiveFilters(s: DiscoveryState): boolean {
  return (
    s.status !== DEFAULTS.status ||
    s.odds !== DEFAULTS.odds ||
    s.pool !== DEFAULTS.pool ||
    s.topic !== DEFAULTS.topic ||
    s.q !== DEFAULTS.q
  );
}

/**
 * How many of the mobile SHEET's own axes are narrowed — the number on the `Filters` button.
 *
 * ⭐ IT COUNTS WHAT THE SHEET CONTAINS, AND NOTHING ELSE. A badge is a promise about what is
 * behind the button it sits on; counting an axis the sheet does not hold sends a player in to
 * look for a filter that is not there.
 *
 * ⛔ SORT IS NOT A FILTER and is not counted, even though the sheet holds its control. It
 * narrows nothing — every market is still on the board — which is the same reason
 * `hasActiveFilters` has excluded it since batch 1 and the same reason the bar has always
 * refused sort the gold treatment ("sort is view state").
 * ⛔ STATUS AND `q` ARE NOT COUNTED either: both keep their own visible control OUTSIDE the
 * sheet (the chip strip and the search box), so a player can already see they are on. Counting
 * them would label the button with filters it does not contain — and would leave the badge
 * reading `1` on the DEFAULT board, since `status` opens at `open`.
 */
export function sheetFilterCount(s: DiscoveryState): number {
  return (
    (s.odds !== DEFAULTS.odds ? 1 : 0) +
    (s.pool !== DEFAULTS.pool ? 1 : 0) +
    (s.topic !== DEFAULTS.topic ? 1 : 0)
  );
}

/**
 * `Clear all` returns to the DEFAULT board (`status: open`), not to `all`.
 *
 * ⚠️ The kit's prototype disagreed with itself here: its bar's `clearAll` reset status to
 * `open` while the empty-state's last-resort exit reset it to `all`, leaving a Status token
 * visible immediately after the user cleared everything. They are two different actions and
 * this codebase names them differently — `Clear all` (below) and `Include everything`
 * (the empty-state relaxation), which is what each one actually does.
 */
export function clearedState(s: DiscoveryState): DiscoveryState {
  return { ...DEFAULT_STATE, sort: s.sort, dir: s.dir };
}

/* ────────────────────────────────── status predicates ─────────────────────────────────── */

export const DAY_MS = 24 * 3600_000;

/**
 * ⭐ PINNED 2026-08-13 (PLAN-OF-RECORD §8.1 / §8.2). The kit left both of these open and
 * flagged them as invented; its own prototype gave `open` and `all` the byte-identical
 * predicate `() => true` over a fixture with no status field, so there was nothing to inherit.
 *
 *   open  = LIVE and still taking bets. Measured on production 2026-08-13: this hides 1 of 41
 *           cards (2.4%). ⚠️ Category selection-lead runs to 48h for macro, so on a
 *           differently-shaped book it could hide far more — re-measure before assuming.
 *   all   = the UNSETTLED book: LIVE ∪ CLOSED. NOT resolved/voided — /results already owns the
 *           settled archive, and CLOSED is on no player discovery board today.
 *
 * ⛔ `isClosedByTime` remains the board-INCLUSION gate upstream of this module. A
 * selection-closed market is still fetched and still reachable; it simply lives under `all`
 * rather than `open`.
 */
export function matchesStatus(row: DiscoveryRow, status: StatusId, nowMs: number): boolean {
  switch (status) {
    case "open":
      return row.status === "LIVE" && !row.selectionClosed;
    case "today":
      return (
        row.status === "LIVE" &&
        !row.selectionClosed &&
        row.bettableUntilMs - nowMs <= DAY_MS
      );
    case "new":
      // Follows market-card.tsx's own rule (`volume === 0 && predictors === 0`), NOT the kit's
      // "added in the last four days" — ACCEPTANCE.md:109-110. One definition of "new", so the
      // board and the card can never disagree about which markets wear the badge.
      return row.status === "LIVE" && row.pool === 0 && row.predictors === 0;
    case "watch":
      // Membership only — a watched market that has closed still shows under Watching, because
      // the player asked to follow it. Server-side watchlist; the kit's localStorage loses.
      return row.watched;
    case "all":
      return row.status === "LIVE" || row.status === "CLOSED";
  }
}

/* ────────────────────────────────── odds / pool buckets ───────────────────────────────── */

/**
 * Boundaries are the kit's, inclusive unless stated. `call` is a strict subset of `cont`.
 *
 * ⚠️ A market with an empty pool has NO implied price (`yesPct === null`) and is excluded from
 * every bucket other than `any`. See the note on `DiscoveryRow.yesPct`.
 */
export function matchesOdds(row: DiscoveryRow, odds: OddsId): boolean {
  if (odds === "any") return true;
  const pct = row.yesPct;
  if (pct == null) return false;
  switch (odds) {
    case "call":
      return pct >= 40 && pct <= 60;
    case "cont":
      return pct >= 25 && pct <= 75;
    case "long":
      return pct < 15;
  }
}

export const POOL_FLOORS: Record<PoolId, number> = { any: 0, "10k": 10_000, "50k": 50_000 };

export function matchesPool(row: DiscoveryRow, pool: PoolId): boolean {
  return row.pool >= POOL_FLOORS[pool];
}

export function matchesTopic(row: DiscoveryRow, topic: string): boolean {
  return topic === "all" || row.category === topic;
}

/* ─────────────────────────────────────── sorting ──────────────────────────────────────── */

export const SORT_NATURAL_DIR: Record<SortId, SortDir> = {
  closing: "asc",
  pool: "desc",
  people: "desc",
  close: "asc",
  move: "desc",
  new: "desc",
};

export function effectiveDir(state: Pick<DiscoveryState, "sort" | "dir">): SortDir {
  return state.dir ?? SORT_NATURAL_DIR[state.sort];
}

/** The primary key. `null` means "this row has no value for this sort" — see `compareRows`. */
function sortKey(row: DiscoveryRow, sort: SortId): number | null {
  switch (sort) {
    case "closing":
      return row.bettableUntilMs;
    case "pool":
      return row.pool;
    case "people":
      return row.predictors;
    case "close":
      // Distance from an even market. No implied price → no distance.
      return row.yesPct == null ? null : Math.abs(50 - row.yesPct);
    case "move":
      // ⛔ NEVER `Math.abs(m.move ?? 0)`. The kit's written rule and ACCEPTANCE.md:111 both say
      // absent sorts LAST; the prototype coerced absent→0, which lands them last only in the
      // natural (descending) direction and puts them FIRST the moment the user flips it.
      // Returning null routes them through the partition in `compareRows` instead, which holds
      // in BOTH directions.
      return row.move24h == null ? null : Math.abs(row.move24h);
    case "new":
      return row.createdAtMs;
  }
}

/**
 * Tie-breakers. The kit specifies none anywhere — the prototype leans on JS sort stability,
 * which means the order of two equal rows depends on the order the database happened to return
 * them. On a board that auto-refreshes every 30s that is a grid that reshuffles under the
 * reader. Each sort therefore gets an explicit, deterministic secondary key.
 */
const TIE_BREAK: Record<SortId, (a: DiscoveryRow, b: DiscoveryRow) => number> = {
  closing: (a, b) => b.createdAtMs - a.createdAtMs,
  pool: (a, b) => a.bettableUntilMs - b.bettableUntilMs,
  people: (a, b) => b.pool - a.pool,
  close: (a, b) => b.pool - a.pool,
  move: (a, b) => b.pool - a.pool,
  new: (a, b) => a.bettableUntilMs - b.bettableUntilMs,
};

/** Final tie-break so the order is total and stable across renders. */
const byId = (a: DiscoveryRow, b: DiscoveryRow) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

export function compareRows(a: DiscoveryRow, b: DiscoveryRow, sort: SortId, dir: SortDir): number {
  const ka = sortKey(a, sort);
  const kb = sortKey(b, sort);
  // Rows with no value for this sort go LAST, in both directions.
  if (ka == null && kb == null) return TIE_BREAK[sort](a, b) || byId(a, b);
  if (ka == null) return 1;
  if (kb == null) return -1;
  const primary = dir === "asc" ? ka - kb : kb - ka;
  if (primary !== 0) return primary;
  return TIE_BREAK[sort](a, b) || byId(a, b);
}

/**
 * Generic in the row type so a caller carrying MORE than a `DiscoveryRow` keeps its own fields
 * through the sort. The landing hero needs titles and raw pools to render a question, and a
 * `DiscoveryRow[]` return would have forced a cast — or, worse, a second sort implementation,
 * which is how the hero and the board would start disagreeing about "closing soonest".
 */
export function sortRows<T extends DiscoveryRow>(rows: readonly T[], state: Pick<DiscoveryState, "sort" | "dir">): T[] {
  const dir = effectiveDir(state);
  return [...rows].sort((a, b) => compareRows(a, b, state.sort, dir));
}

/* ──────────────────────────────── filtering + counting ────────────────────────────────── */

/**
 * Apply every axis except the one named in `except`, so a control can count what pressing it
 * would actually yield.
 *
 * `matchesText` is injected rather than implemented here: search is the shared grammar in
 * `src/lib/search` (quoted phrases, -exclude, field:) and duplicating it would create the
 * second definition this file exists to prevent.
 */
export type Axis = "status" | "odds" | "pool" | "topic" | "q";

export function filterRows(
  rows: readonly DiscoveryRow[],
  state: DiscoveryState,
  nowMs: number,
  matchesText: (row: DiscoveryRow) => boolean,
  except?: Axis,
): DiscoveryRow[] {
  return rows.filter(
    (r) =>
      (except === "status" || matchesStatus(r, state.status, nowMs)) &&
      (except === "odds" || matchesOdds(r, state.odds)) &&
      (except === "pool" || matchesPool(r, state.pool)) &&
      (except === "topic" || matchesTopic(r, state.topic)) &&
      (except === "q" || !state.q || matchesText(r)),
  );
}

/**
 * ⭐ COUNT HONESTY — the rule this board is built on.
 *
 * Every count is CROSS-FILTERED: the number beside a control is what the board would show if
 * you pressed it, with every other active filter still applied.
 *
 * 🔴 This is the lesson of the 2026-08-10 incident, and it is why the drawn layouts are wrong
 * here and the prototype is right. That board printed "40 live · TZS 1,659k in play" above a
 * grid of ZERO cards at nine of nine viewport × locale combinations. The number was factually
 * true. The board was still a lie, because the count described the census while the grid
 * described a filtered subset. The kit's layouts repeat the shape — `Open 41` rendered beside
 * a result line reading `9` with two filters pressed.
 *
 * ⛔ Never render a count computed over a wider set than the one its control would show.
 */
export function countFor(
  rows: readonly DiscoveryRow[],
  state: DiscoveryState,
  nowMs: number,
  matchesText: (row: DiscoveryRow) => boolean,
  patch: Partial<DiscoveryState>,
): number {
  const next = { ...state, ...patch };
  return rows.filter(
    (r) =>
      matchesStatus(r, next.status, nowMs) &&
      matchesOdds(r, next.odds) &&
      matchesPool(r, next.pool) &&
      matchesTopic(r, next.topic) &&
      (!next.q || matchesText(r)),
  ).length;
}

/* ─────────────────────────────── empty-state relaxations ──────────────────────────────── */

export type RelaxationId = "pool" | "odds" | "topic" | "q" | "status";

export type Relaxation = { id: RelaxationId; patch: Partial<DiscoveryState>; count: number };

/**
 * The exits offered when a filtered board comes back empty, in the kit's priority order,
 * each carrying a REAL count and offered only when that count is greater than zero.
 *
 * ⛔ Never offer an exit that leads to another empty board. Three compensations for the
 * 2026-08-10 empty board all failed because they sat downstream of the thing that emptied it;
 * the see-wider nudge in particular required `live.length > 0`, so it switched off exactly when
 * the board was emptiest.
 */
export function relaxations(
  rows: readonly DiscoveryRow[],
  state: DiscoveryState,
  nowMs: number,
  matchesText: (row: DiscoveryRow) => boolean,
): Relaxation[] {
  const out: Relaxation[] = [];
  const add = (id: RelaxationId, patch: Partial<DiscoveryState>) => {
    const count = countFor(rows, state, nowMs, matchesText, patch);
    if (count > 0) out.push({ id, patch, count });
  };
  if (state.pool !== DEFAULTS.pool) add("pool", { pool: "any" });
  if (state.odds !== DEFAULTS.odds) add("odds", { odds: "any" });
  if (state.topic !== DEFAULTS.topic) add("topic", { topic: "all" });
  if (state.q) add("q", { q: "" });
  if (state.status !== "all") add("status", { status: "all" });
  return out.slice(0, 3);
}

/** The three genuinely different reasons a board can be empty. Never one generic message. */
export type EmptyCause = "search-miss" | "watching-empty" | "filter-miss" | "no-inventory";

export function emptyCause(
  state: DiscoveryState,
  shownCount: number,
  boardTotal: number,
): EmptyCause | null {
  if (shownCount > 0) return null;
  if (state.q) return "search-miss";
  if (state.status === "watch") return "watching-empty";
  if (boardTotal === 0) return "no-inventory";
  return "filter-miss";
}
