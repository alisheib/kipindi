/**
 * /profile/account activity contract — category lens · window · sort · search.
 *
 * ⭐ THIS PAGE ALREADY HAD THE RAIL, AND THAT IS WHY IT IS THE ODD ONE OUT IN STAGE 4. Every
 * other route in this stage gained controls it never had; this one has rendered a real
 * `FilterPill` rail with `data-filter-rail` since the G-1 repair, and is already declared in all
 * three of §6's script lists. What it never had was a COUNT on any pill, a way to narrow by date,
 * a way to order, or a way to search — so a player with 4,000 audit rows could reach every row by
 * paging and still could not answer "when did I change my password".
 *
 * 🔴 AND ITS `?act=` WAS NEVER NARROWED, WHICH IS THE `?day=lol` DEFECT ON A SECOND PAGE.
 * `page.tsx` read `sp.act ?? "all"` raw and filtered on it directly, so `?act=lol` matched no row,
 * emptied the table, and rendered no control that could clear it — the rail only draws pills for
 * categories that EXIST, so the value that emptied the page was not among them. `parse.ts`'s own
 * header records this exact failure on `/updown/history` and says why the rule lives in one place:
 * *"an unknown value FALLS BACK, it never throws and it is never passed through."*
 *
 * ⛔ THE LENS SET IS DERIVED FROM THE PLAYER'S OWN ROWS, NOT FROM `AuditCategory`. That is a
 * deliberate departure from `/watchlist`, whose lens set is the stored enum, and the reason is
 * that the two populations differ: a market has one of five statuses and every one of them is
 * reachable, whereas `AuditCategory` has eight arms of which a given player will only ever produce
 * three or four — `ADMIN`, `SECURITY` and `SYSTEM` rows are stamped with a STAFF actor or none, so
 * `getAuditForActor(playerId)` can never return them. Rendering all eight would offer a player
 * five pills that read 0 for the life of the account, which is `/wallet`'s dead-end rule
 * (*"a rail that offers a lens which can only ever be empty is a dead end, not a filter"*) applied
 * five times over.
 *
 * ⚠️ SO THE CLOSED SET IS PASSED IN, AND NARROWING HAPPENS AGAINST IT. `oneOf` needs an
 * allow-list; here that list is `["all", ...categories present in this player's own history]`.
 * A link to a category the player has none of therefore falls back to `all` rather than landing
 * on an empty table with no pill to press — which is the same dead end `?act=lol` produced, just
 * reached by a plausible URL instead of a typo.
 *
 * ⛔ NO SERVER IMPORTS. The page reads the audit ring and hands the rows here.
 */
import { clampText, oneOf, oneParam, parseDir } from "@/lib/query/parse";
import { buildQueryHref, hasActiveFilters, sheetFilterCount } from "@/lib/query/href";
import { countFor, countsFor, filterRows, type Axes } from "@/lib/query/counts";
import { emptyKind, relaxations, type EmptyKind, type ExitCandidate, type Relaxation } from "@/lib/query/empty";
import { sortBy, type SortDir, type SortSpec } from "@/lib/query/sort";
import { PLAYER_PRESETS, inWindow, type PlayerPresetId } from "@/lib/query/windows";
import { MAX_QUERY_LEN } from "@/lib/search/query";

/* ─────────────────────────── the row this module reasons about ────────────────────────── */

/**
 * One row of the player's own audit trail.
 *
 * ⚠️ `category` AND `action` ARE STORED TOKENS, and both are already on screen — the table's
 * Category column prints `e.category` and its Action column prints `e.action`. That is a §L2
 * divergence this task did NOT introduce and does not fix (the brief is counts, window, sort and
 * search), but it is why the search grammar below matches on those tokens: the search must find
 * what the page RENDERS, and what it renders is the token.
 */
export type ActivityRow = {
  id: string;
  category: string;
  action: string;
  /** `Date.parse(createdAt)`. ⛔ Never `0` for an unparseable stamp — see `activityKey`. */
  createdAtMs: number;
};

/* ─────────────────────────────────── the URL contract ─────────────────────────────────── */

/**
 * ⛔ `?act=` IS KEPT, AND KEEPING IT IS THE POINT. It is the param this page has always written,
 * every pill in the shipped rail links to it, and Stage 3's ruling — *"grep for who WRITES a param
 * before naming one"* — cuts both ways: a rename would break every bookmark and every in-product
 * link for the sake of matching a convention no player can see.
 *
 * ⚠️ `?when=` and `?sort=`/`?dir=`/`?q=` are the shared names, identical to `/positions`,
 * `/wallet`, `/results` and `/updown/history`, so a player who has learned one has learned this.
 */
export const ACTIVITY_WHEN_IDS = PLAYER_PRESETS;

/**
 * ⭐ THE SORT OPTIONS ARE EXACTLY THE TABLE'S COLUMNS — When · Category · Action — and that is the
 * whole rule for this page. A sort the table has no column for would be ordering by something the
 * reader cannot see, which is how `/results` came to sort on a clock its cards were not showing.
 *
 * ⛔ AND A SORT HERE NEEDS AN ARGUMENT, BECAUSE `/wallet` REFUSED ONE ON NEIGHBOURING REASONING.
 * `wallet-bar.tsx` states it: *"THERE IS NO SORT, AND THAT IS A DECISION RATHER THAN AN OMISSION.
 * A ledger is chronological… a control offering to re-order a player's money history by amount
 * would invite the reading that two rows next to each other happened next to each other."* An
 * audit trail is chronological in a stronger sense still — it is HMAC-chained, so the order is
 * part of the artefact.
 *
 * ⭐ THE DISTINCTION THAT SURVIVES IT IS **MAGNITUDE**. `/wallet`'s objection is to ordering money
 * by SIZE, which invents an adjacency that means nothing and sits one column away from a running
 * balance. An audit row has no magnitude to sort by — and none is offered here. What is offered
 * is the reader's own index: the same three columns, re-ordered, which is what a person does to a
 * long table with their eyes. ⛔ Do not add a fourth "by size" sort by symmetry with another page;
 * there is no size, and if one is ever added, this note is the argument it has to defeat.
 */
export const ACTIVITY_SORTS = ["recent", "category", "action"] as const;
export type ActivitySortId = (typeof ACTIVITY_SORTS)[number];

export const ACTIVITY_DEFAULTS = {
  act: "all" as string,
  when: "all" as PlayerPresetId,
  sort: "recent" as ActivitySortId,
  dir: null as SortDir | null,
  q: "" as string,
};

export type ActivityState = {
  act: string;
  when: PlayerPresetId;
  sort: ActivitySortId;
  dir: SortDir | null;
  q: string;
};

export const ACTIVITY_DEFAULT_STATE: ActivityState = { ...ACTIVITY_DEFAULTS };

/** ⛔ Only `when` is behind the phone sheet. The lens strip and the search box stay visible. */
export const ACTIVITY_SHEET_AXES = ["when"] as const;
const ACTIVITY_VIEW_STATE_AXES = ["sort", "dir"] as const;

/**
 * ⛔ `categoryIds` IS REQUIRED, NOT OPTIONAL WITH AN ENUM FALLBACK. See the header: the closed set
 * is the player's own categories, so the caller must pass it. An optional parameter would let a
 * call site forget it and silently restore the raw-passthrough defect this replaces.
 */
export function parseActivityParams(
  sp: Record<string, string | string[] | undefined>,
  categoryIds: readonly string[],
): ActivityState {
  const one = (k: string) => oneParam(sp, k);
  return {
    act: oneOf(categoryIds, one("act"), ACTIVITY_DEFAULTS.act),
    when: oneOf(ACTIVITY_WHEN_IDS, one("when"), ACTIVITY_DEFAULTS.when),
    sort: oneOf(ACTIVITY_SORTS, one("sort"), ACTIVITY_DEFAULTS.sort),
    dir: parseDir(one("dir")),
    q: clampText(one("q"), MAX_QUERY_LEN),
  };
}

export function buildActivityHref(
  state: ActivityState,
  patch: Partial<ActivityState> = {},
  extra: { page?: number } = {},
): string {
  return buildQueryHref("/profile/account", state, ACTIVITY_DEFAULT_STATE, patch, extra);
}

export function hasActiveActivityFilters(state: ActivityState): boolean {
  return hasActiveFilters(state, ACTIVITY_DEFAULT_STATE, ACTIVITY_VIEW_STATE_AXES);
}

export function activitySheetCount(state: ActivityState): number {
  return sheetFilterCount(state, ACTIVITY_DEFAULT_STATE, ACTIVITY_SHEET_AXES);
}

export function clearedActivityState(state: ActivityState): ActivityState {
  return { ...ACTIVITY_DEFAULT_STATE, sort: state.sort, dir: state.dir };
}

/* ──────────────────────────────────── the predicates ──────────────────────────────────── */

/**
 * ⚠️ THE WINDOW IS OVER WHEN THE EVENT HAPPENED, which is the only date an audit row has. Through
 * the shared `inWindow` so "last 30 days" here is the same span it is on `/wallet` — the rule
 * `lib/query/windows.ts` exists to hold.
 */
export function activityAxes(
  nowMs: number,
  matchesText: (row: ActivityRow) => boolean,
): Axes<ActivityRow, ActivityState> {
  return {
    act: (r, s) => s.act === "all" || r.category === s.act,
    when: (r, s) => inWindow(r.createdAtMs, s.when, nowMs),
    q: (r, s) => !s.q || matchesText(r),
  };
}

/* ─────────────────────────────────────── sorting ──────────────────────────────────────── */

/**
 * ⛔ EXHAUSTIVE. `recent` is the order the page has always rendered in (the ring is returned
 * newest-first) and stays the default, so a player who has never touched the sort sees the page
 * they already know. The two word sorts point ascending, which is how a person reads an index.
 */
export const ACTIVITY_NATURAL_DIR: Record<ActivitySortId, SortDir> = {
  recent: "desc",
  category: "asc",
  action: "asc",
};

/**
 * ⛔ `null`, NEVER `0`, FOR AN UNPARSEABLE STAMP. `sort.ts`'s partition puts a null-keyed row last
 * in BOTH directions; a `0` would land it last descending and FIRST the moment the player flipped
 * the arrow, so the page would open on the rows it knows least about. The audit ring stamps
 * `createdAt` from `toISOString()` so this should never fire — which is exactly why it must be
 * written down rather than assumed.
 */
function activityKey(row: ActivityRow, sort: ActivitySortId): number | string | null {
  switch (sort) {
    case "recent": return row.createdAtMs || null;
    case "category": return row.category;
    case "action": return row.action;
  }
}

/**
 * ⭐ EVERY TIE-BREAK FALLS BACK TO THE CLOCK, newest first. Two rows in the same category are not
 * interchangeable to their owner — one happened this morning — and `sort.ts` requires a tie-break
 * per id rather than leaving equal rows to arrive in whatever order the ring held them.
 */
const ACTIVITY_TIE_BREAK: Record<ActivitySortId, (a: ActivityRow, b: ActivityRow) => number> = {
  recent: (a, b) => (a.action < b.action ? -1 : a.action > b.action ? 1 : 0),
  category: (a, b) => b.createdAtMs - a.createdAtMs,
  action: (a, b) => b.createdAtMs - a.createdAtMs,
};

export const ACTIVITY_SORT_SPEC: SortSpec<ActivityRow, ActivitySortId> = {
  ids: ACTIVITY_SORTS,
  natural: ACTIVITY_NATURAL_DIR,
  key: activityKey,
  tieBreak: ACTIVITY_TIE_BREAK,
};

/**
 * ⚠️ THE COLLATOR IS BUILT ONCE, BY THE CALLER, AND PASSED IN. `sort.ts` refuses to construct one
 * (*"collation is a fact about the PLAYER'S LOCALE and this module has no way to know it"*), and
 * building it inside the comparator would construct an `Intl.Collator` O(n log n) times.
 */
export function sortActivity(
  rows: readonly ActivityRow[],
  state: Pick<ActivityState, "sort" | "dir">,
  collate?: (a: string, b: string) => number,
): ActivityRow[] {
  return sortBy({ ...ACTIVITY_SORT_SPEC, collate }, rows, state);
}

/* ──────────────────────────────── filtering + counting ────────────────────────────────── */

export function filterActivity(
  rows: readonly ActivityRow[],
  state: ActivityState,
  nowMs: number,
  matchesText: (row: ActivityRow) => boolean,
): ActivityRow[] {
  return filterRows(rows, state, activityAxes(nowMs, matchesText));
}

/**
 * ⛔ THE COUNTS ARE CROSS-FILTERED, WHICH IS THE ENTIRE POINT OF TASK 4.6. Before this the rail
 * carried no number at all, so a player pressing `WALLET` had no way to know whether it held two
 * rows or two hundred — and once a window and a search exist, a count computed over the census
 * would promise rows the destination does not deliver. `countsFor` patches the state and re-runs
 * every axis, so each pill's number is what pressing it actually shows.
 */
export function activityCounts(
  rows: readonly ActivityRow[],
  state: ActivityState,
  nowMs: number,
  matchesText: (row: ActivityRow) => boolean,
  categoryIds: readonly string[],
) {
  const axes = activityAxes(nowMs, matchesText);
  return {
    act: countsFor(rows, state, axes, "act", categoryIds),
    when: countsFor(rows, state, axes, "when", ACTIVITY_WHEN_IDS),
  };
}

export function activityCountFor(
  rows: readonly ActivityRow[],
  state: ActivityState,
  nowMs: number,
  matchesText: (row: ActivityRow) => boolean,
  patch: Partial<ActivityState>,
): number {
  return countFor(rows, state, activityAxes(nowMs, matchesText), patch);
}

/* ─────────────────────────────── empty causes + exits ─────────────────────────────────── */

export type ActivityExitId = "when" | "q" | "act";

const ACTIVITY_EXITS: readonly ExitCandidate<ActivityState, ActivityExitId>[] = [
  { id: "when", patch: { when: "all" } },
  { id: "q", patch: { q: "" } },
  { id: "act", patch: { act: "all" } },
];

export function activityExits(
  rows: readonly ActivityRow[],
  state: ActivityState,
  nowMs: number,
  matchesText: (row: ActivityRow) => boolean,
): Relaxation<ActivityState, ActivityExitId>[] {
  return relaxations(rows, state, activityAxes(nowMs, matchesText), ACTIVITY_EXITS);
}

/**
 * ⛔ NO `healthyEmpty` ARM, AND THE ABSENCE IS DELIBERATE. On `/watchlist` an empty `done` lens is
 * an ordinary fact about a short personal list. Here every rendered pill is a category the player
 * demonstrably HAS rows in — the rail is built from those rows — so an empty category lens can
 * only ever mean the window or the search emptied it. Claiming *"nothing of yours is in WALLET"*
 * over a category the rail itself only drew because there are WALLET rows would be a confident
 * false statement, which is `empty.ts`'s own rule for `lens-empty`.
 */
export function activityEmptyCause(
  state: ActivityState,
  nowMs: number,
  matchesText: (row: ActivityRow) => boolean,
  shown: number,
  total: number,
): EmptyKind | null {
  return emptyKind({
    state,
    defaults: ACTIVITY_DEFAULT_STATE,
    axes: activityAxes(nowMs, matchesText),
    shown,
    total,
    lensKey: "act",
    searchKey: "q",
    windowKey: "when",
  });
}
