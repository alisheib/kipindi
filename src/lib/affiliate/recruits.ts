/**
 * The agent recruit book's query contract — lens · sort · paging.
 *
 * 🔴 IT IS ON THE AGENT DASHBOARD, NOT THE PLAYER BODY — TASK 4.11's FINDING, AND ITS REASON CHANGED
 * ON 2026-09-25. The board named the player body's `RecruitRow["status"]` (`Signed up · First bet ·
 * Earning`). When 4.11 was decided `PRODUCT_STATE.invite` was WITHDRAWN, so no live viewer could reach
 * the player body and the list this rail serves had to be `dash.recruits` — the AGENT's book
 * (`profile/invite/page.tsx` still asks `getAgentDashboard` FIRST).
 * ⚠️ Since 2026-09-25 `invite` is ACTIVE and every player in good standing lands on the UNPAID body
 * (`docs/PLAYER-INVITE-UNPAID.md`). The ruling stands for a better reason: the player's list is their own
 * friends — name and date, capped at 50 — and there is nothing to filter BY once the money columns are gone.
 *
 * ⚠️ THE OLD NOTE HERE RECORDED A DISAGREEMENT BETWEEN TWO GATES — `qa:live` asserting
 * `/profile/invite` SHOWS a 10,000 reward, `qa:agent-drive` §6 asserting the opposite — and ruled
 * for the second. BOTH have since been rewritten: `qa:live` now asserts the share surface is
 * present AND that no money word is on it, and `qa:agent-drive` §6 asserts the same pair. There
 * is no longer a disagreement to settle, and neither gate asserts a reward.
 *
 * ⛔ NO SERVER IMPORTS.
 */
import { oneOf, oneParam, parseDir } from "@/lib/query/parse";
import { buildQueryHref, hasActiveFilters } from "@/lib/query/href";
import { countsFor, filterRows, type Axes } from "@/lib/query/counts";
import { emptyKind, type EmptyKind } from "@/lib/query/empty";
import { sortBy, type SortDir, type SortSpec } from "@/lib/query/sort";

/* ─────────────────────────── the row this module reasons about ────────────────────────── */

/**
 * ⛔ THREE MONEY FIGURES, ALL SUMS OVER THE STORED `ReferralRewardStatus`, and no display token
 * anywhere. The board's lens ids were `"Signed up" | "First bet" | "Earning"` — an English string
 * union the chip printed raw — so a rail built on them would have filtered a WORD, inherited its
 * §L3 breach, and meant different sets in different languages.
 */
export type RecruitRow = {
  id: string;
  maskedName: string;
  /** `recruitedAt ?? createdAt` — the date the row DISPLAYS. See `RECRUIT_NATURAL_DIR`. */
  boundAtMs: number;
  paidTzs: number;
  pendingTzs: number;
  reversedTzs: number;
  settlements: number;
};

/* ─────────────────────────────────── the URL contract ─────────────────────────────────── */

/**
 * ⭐ A LADDER, NOT A LIST — first match wins, and the last arm is a RESIDUAL. That is what makes
 * these four a partition of the book: a recruit is in exactly one arm whatever their reward rows
 * say, including a recruit with no reward rows at all and a recruit whose statuses nobody
 * enumerated. `tierFor` on `/leaderboard` and `FOLLOW_LENSES`' `progress` are the same shape.
 *
 * ⚠️ `paid` OUTRANKS `reversed` DELIBERATELY. A recruit who earned and was PARTLY clawed back has
 * still earned; calling them "reversed" would describe the exception and hide the rule. `reversed`
 * means a recruit whose commission was clawed back and left nothing — the case the dashboard could
 * already state in a money tile and could not point at.
 */
export const RECRUIT_LENSES = ["all", "paid", "owed", "reversed", "joined"] as const;
export type RecruitLens = (typeof RECRUIT_LENSES)[number];

export const RECRUIT_SORTS = ["recent", "earned", "settlements", "name"] as const;
export type RecruitSortId = (typeof RECRUIT_SORTS)[number];

export const RECRUIT_DEFAULTS = {
  lens: "all" as RecruitLens,
  sort: "recent" as RecruitSortId,
  dir: null as SortDir | null,
};

export type RecruitState = {
  lens: RecruitLens;
  sort: RecruitSortId;
  dir: SortDir | null;
};

export const RECRUIT_DEFAULT_STATE: RecruitState = { ...RECRUIT_DEFAULTS };

export function parseRecruitParams(sp: Record<string, string | string[] | undefined>): RecruitState {
  const one = (k: string) => oneParam(sp, k);
  return {
    lens: oneOf(RECRUIT_LENSES, one("lens"), RECRUIT_DEFAULTS.lens),
    sort: oneOf(RECRUIT_SORTS, one("sort"), RECRUIT_DEFAULTS.sort),
    dir: parseDir(one("dir")),
  };
}

export function buildRecruitHref(
  state: RecruitState,
  patch: Partial<RecruitState> = {},
  extra: { page?: number } = {},
): string {
  return buildQueryHref("/profile/invite", state, RECRUIT_DEFAULT_STATE, patch, extra);
}

export function hasActiveRecruitFilters(state: RecruitState): boolean {
  return hasActiveFilters(state, RECRUIT_DEFAULT_STATE, ["sort", "dir"]);
}

export function clearedRecruitState(state: RecruitState): RecruitState {
  return { ...RECRUIT_DEFAULT_STATE, sort: state.sort, dir: state.dir };
}

/* ──────────────────────────────────── the predicates ──────────────────────────────────── */

/** The ladder, evaluated once per row. ⛔ Ends in `joined`, which is the residual. */
export function recruitArm(row: RecruitRow): Exclude<RecruitLens, "all"> {
  if (row.paidTzs > 0) return "paid";
  if (row.pendingTzs > 0) return "owed";
  if (row.reversedTzs > 0) return "reversed";
  return "joined";
}

export function matchesRecruitLens(row: RecruitRow, lens: RecruitLens): boolean {
  return lens === "all" || recruitArm(row) === lens;
}

export function recruitAxes(): Axes<RecruitRow, RecruitState> {
  return { lens: (r, s) => matchesRecruitLens(r, s.lens) };
}

/* ─────────────────────────────────────── sorting ──────────────────────────────────────── */

/**
 * 🔴 `recent` KEYS ON `boundAt`, AND THAT IS A BUG FIX. The DAL returns recruits ordered by
 * `createdAt desc` while the row RENDERS `recruitedAt ?? createdAt` — so for an existing player
 * recruited later, the dates printed down the column were out of order and nothing said so. The
 * clock the list is ordered by is now the clock it shows.
 */
export const RECRUIT_NATURAL_DIR: Record<RecruitSortId, SortDir> = {
  recent: "desc",
  earned: "desc",
  settlements: "desc",
  name: "asc",
};

function recruitKey(row: RecruitRow, sort: RecruitSortId): number | string | null {
  switch (sort) {
    // ⛔ `|| null`, never `?? 0` — a recruit with an unparseable bind date has no position on this
    //    clock, and 0 would land them last descending and FIRST the moment the arrow flipped.
    case "recent": return row.boundAtMs || null;
    // ⚠️ `earned` IS PAID + OWED, NOT NET OF REVERSED. It answers "what has this relationship
    //    produced"; the reversal is a separate arm and a separate money tile. A net key would make
    //    a fully clawed-back recruit indistinguishable from one who never bet — on the very axis
    //    the `reversed` lens exists to separate.
    case "earned": return row.paidTzs + row.pendingTzs;
    case "settlements": return row.settlements;
    case "name": return row.maskedName;
  }
}

const RECRUIT_TIE_BREAK: Record<RecruitSortId, (a: RecruitRow, b: RecruitRow) => number> = {
  recent: (a, b) => b.paidTzs + b.pendingTzs - (a.paidTzs + a.pendingTzs),
  earned: (a, b) => b.boundAtMs - a.boundAtMs,
  settlements: (a, b) => b.boundAtMs - a.boundAtMs,
  name: (a, b) => b.boundAtMs - a.boundAtMs,
};

export function sortRecruits(
  rows: readonly RecruitRow[],
  state: Pick<RecruitState, "sort" | "dir">,
  collate?: (a: string, b: string) => number,
): RecruitRow[] {
  const spec: SortSpec<RecruitRow, RecruitSortId> = {
    ids: RECRUIT_SORTS,
    natural: RECRUIT_NATURAL_DIR,
    key: recruitKey,
    tieBreak: RECRUIT_TIE_BREAK,
    collate,
  };
  return sortBy(spec, rows, state);
}

/* ──────────────────────────────── filtering + counting ────────────────────────────────── */

export function filterRecruits(rows: readonly RecruitRow[], state: RecruitState): RecruitRow[] {
  return filterRows(rows, state, recruitAxes());
}

export function recruitCounts(rows: readonly RecruitRow[], state: RecruitState) {
  return { lens: countsFor(rows, state, recruitAxes(), "lens", RECRUIT_LENSES) };
}

/**
 * ⭐ EVERY ARM BUT `all` IS A HEALTHY EMPTY. An agent with three recruits who have all earned has
 * an empty `joined` pill and an empty `reversed` pill by definition — those are facts about a
 * small book, not failed filters, and on this page `reversed` being empty is GOOD NEWS.
 *
 * ⛔ NO SEARCH ON THIS ROUTE, AND THE ABSENCE IS DELIBERATE. Every name here is `maskedRosterLabel`
 * output — a mask, not a name — so a search box would invite an agent to type a person's name and
 * match nothing, or worse, to discover which mask belongs to whom by elimination. The lens and the
 * sorts answer every question the book can honestly be asked.
 */
export function recruitEmptyCause(
  state: RecruitState,
  shown: number,
  total: number,
): EmptyKind | null {
  return emptyKind({
    state,
    defaults: RECRUIT_DEFAULT_STATE,
    axes: recruitAxes(),
    shown,
    total,
    lensKey: "lens",
    healthyEmpty: RECRUIT_LENSES.filter((l) => l !== "all"),
  });
}
