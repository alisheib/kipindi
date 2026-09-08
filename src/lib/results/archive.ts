/**
 * /results archive contract — outcome · product · topic · window · sort · search.
 *
 * ⭐ THIS IS THE CAMPAIGN'S ONE VISIBLE CHANGE TO A PAGE THAT ALREADY WORKS, and the reason is
 * consistency rather than repair: `/results` carried its category rail as a desktop `aside` of
 * full-width pills — a second layout for the same job, at board width, beside `/markets` which
 * uses the bar. That is exactly the inconsistency this campaign exists to remove.
 *
 * ⛔ NO SERVER IMPORTS. The page reads the terminal archive and hands rows here.
 */
import { MARKET_CATEGORIES } from "@/lib/markets/categories";
import { PLAYER_PRESETS, inWindow } from "@/lib/query/windows";
import { clampText, oneOf, oneParam, parseDir } from "@/lib/query/parse";
import { buildQueryHref, hasActiveFilters, sheetFilterCount } from "@/lib/query/href";
import { countFor, countsFor, filterRows, type Axes } from "@/lib/query/counts";
import { emptyKind, relaxations, type EmptyKind, type ExitCandidate, type Relaxation } from "@/lib/query/empty";
import { sortBy, type SortDir, type SortSpec } from "@/lib/query/sort";
import { MAX_QUERY_LEN } from "@/lib/search/query";

/* ─────────────────────────── the row this module reasons about ────────────────────────── */

export type ArchiveRow = {
  id: string;
  category: string;
  productLine: "MARKET" | "UPDOWN";
  /** `YES` · `NO` · `VOID`, or `null` for a row whose verdict was redacted by a purge. */
  outcome: "YES" | "NO" | "VOID" | null;
  /** `yesPool + noPool` — the volume sort's key. */
  volume: number;
  /** `resolutionStage2At ?? updatedAt` — the final-confirmation clock the table shows. */
  resolvedAtMs: number;
  title: string;
  titleEn: string;
  titleSw: string;
  titleZh: string;
  criterion: string;
};

/* ─────────────────────────────────── the URL contract ─────────────────────────────────── */

/**
 * ⭐ THE OUTCOME LENS, AND WHY IT IS NOT ALWAYS OFFERED.
 *
 * 🔴 THE WORD FOR AN OUTCOME IS PRODUCT-SPECIFIC (§L2), AND THIS PAGE HAS ALREADY SHIPPED THE
 * DEFECT THAT IGNORES IT. Its own comment records E-169: three sites hardcoded `YES`/`NO` and
 * produced *"Up win labelled YES in the summary the regulator reads first."* A single rail cannot
 * say "Yes won" and "Up won" at once.
 *
 * ⛔ So the lens is offered only when ONE product is chosen — which is the default view, since
 * `product` defaults to `MARKET`. Under `?product=all` the strip shows `All` alone: that view is
 * documented as *"reachable by URL for a regulator read that wants the undivided archive"*, and a
 * regulator reading the undivided archive is the last person who should be handed a pill that
 * names half its rows wrongly. ⭐ The Product group in the sheet is the way in.
 */
export const ARCHIVE_LENSES = ["all", "yes", "no", "void"] as const;
export type ArchiveLens = (typeof ARCHIVE_LENSES)[number];

export const ARCHIVE_SORTS = ["resolved", "volume"] as const;
export type ArchiveSortId = (typeof ARCHIVE_SORTS)[number];

export const PRODUCT_IDS = ["all", "MARKET", "UPDOWN"] as const;
export type ProductId = (typeof PRODUCT_IDS)[number];

export const ARCHIVE_TOPIC_IDS = ["all", ...MARKET_CATEGORIES] as const;
export const ARCHIVE_WHEN_IDS = PLAYER_PRESETS;
export type ArchiveWhenId = (typeof ARCHIVE_WHEN_IDS)[number];

/**
 * ⭐ THE DEFAULTS. ⚠️ `product: "MARKET"` IS A MEASUREMENT, NOT A PREFERENCE, and it is preserved
 * exactly: settled rows on production 2026-08-19 were **UPDOWN 11,112 · MARKET 65**, so a
 * newest-first read of both lines buries all 65 long-form results under 11,112 price rounds on
 * page one. ⛔ Changing this default silently deletes the long-form archive from view.
 *
 * ⚠️ `sort: "resolved"` and `cat: "all"` are also today's defaults, so every link already in the
 * wild keeps meaning what it meant.
 */
export const ARCHIVE_DEFAULTS = {
  out: "all" as ArchiveLens,
  product: "MARKET" as ProductId,
  cat: "all" as string,
  when: "all" as ArchiveWhenId,
  sort: "resolved" as ArchiveSortId,
  dir: null as SortDir | null,
  q: "" as string,
};

export type ArchiveState = {
  out: ArchiveLens;
  product: ProductId;
  cat: string;
  when: ArchiveWhenId;
  sort: ArchiveSortId;
  dir: SortDir | null;
  q: string;
};

export const ARCHIVE_DEFAULT_STATE: ArchiveState = { ...ARCHIVE_DEFAULTS };

export const ARCHIVE_SHEET_AXES = ["product", "cat", "when"] as const;
const ARCHIVE_VIEW_STATE_AXES = ["sort", "dir"] as const;

export function parseArchiveParams(sp: Record<string, string | string[] | undefined>): ArchiveState {
  const one = (k: string) => oneParam(sp, k);
  return {
    out: oneOf(ARCHIVE_LENSES, one("out"), ARCHIVE_DEFAULTS.out),
    product: oneOf(PRODUCT_IDS, one("product"), ARCHIVE_DEFAULTS.product),
    // ⚠️ NARROWED, which it was NOT before: `sp.cat ?? "all"` let `?cat=lol` through, filtering
    //    everything out while painting no pill as selected — a dead end reached by one typo.
    cat: oneOf(ARCHIVE_TOPIC_IDS, one("cat"), ARCHIVE_DEFAULTS.cat),
    when: oneOf(ARCHIVE_WHEN_IDS, one("when"), ARCHIVE_DEFAULTS.when),
    sort: oneOf(ARCHIVE_SORTS, one("sort"), ARCHIVE_DEFAULTS.sort),
    dir: parseDir(one("dir")),
    q: clampText(one("q"), MAX_QUERY_LEN),
  };
}

/**
 * ⛔ ONE BUILDER. The page had TWO — `buildHref` and `resultsBaseHref`, near-duplicates differing
 * only in whether they wrote `page` — which is two definitions of one URL grammar and exactly the
 * shape `discovery.ts`'s header records four of.
 * ⚠️ `buildHref` also defaulted `page` to the CURRENT page, so every rail pill had to remember to
 * pass `page: 1`. The shared builder drops the page on any filter change by construction, so
 * forgetting is no longer possible.
 */
export function buildArchiveHref(
  state: ArchiveState,
  patch: Partial<ArchiveState> = {},
  extra: { page?: number } = {},
): string {
  return buildQueryHref("/results", state, ARCHIVE_DEFAULT_STATE, patch, extra);
}

export function hasActiveArchiveFilters(state: ArchiveState): boolean {
  return hasActiveFilters(state, ARCHIVE_DEFAULT_STATE, ARCHIVE_VIEW_STATE_AXES);
}

export function archiveSheetCount(state: ArchiveState): number {
  return sheetFilterCount(state, ARCHIVE_DEFAULT_STATE, ARCHIVE_SHEET_AXES);
}

export function clearedArchiveState(state: ArchiveState): ArchiveState {
  return { ...ARCHIVE_DEFAULT_STATE, sort: state.sort, dir: state.dir };
}

/** ⛔ The outcome lens is offered only under a single product — see `ARCHIVE_LENSES`. */
export function outcomeLensAvailable(state: ArchiveState): boolean {
  return state.product !== "all";
}

/* ──────────────────────────────────── the predicates ──────────────────────────────────── */

export function matchesOutcome(row: ArchiveRow, lens: ArchiveLens): boolean {
  switch (lens) {
    case "all": return true;
    case "yes": return row.outcome === "YES";
    case "no": return row.outcome === "NO";
    // ⚠️ A redacted verdict (`null`, left by the purge ceremony) is NOT a void. It is filed under
    //    `void` here because a settlement whose outcome the archive can no longer state is closer
    //    to "no side won" than to either side — and leaving it in no lens would break COVERING.
    case "void": return row.outcome === "VOID" || row.outcome === null;
  }
}

/** ⚠️ The window is about when the market RESOLVED — the date this archive is ordered by. */
export function matchesArchiveWindow(row: ArchiveRow, when: ArchiveWhenId, nowMs: number): boolean {
  return inWindow(row.resolvedAtMs, when, nowMs);
}

export function archiveAxes(
  nowMs: number,
  matchesText: (row: ArchiveRow) => boolean,
): Axes<ArchiveRow, ArchiveState> {
  return {
    // ⚠️ PRODUCT FIRST, exactly as the page has always applied it: every category count is a
    //    count WITHIN the chosen product, so pressing a category never changes the product.
    product: (r, s) => s.product === "all" || r.productLine === s.product,
    out: (r, s) => matchesOutcome(r, s.out),
    cat: (r, s) => s.cat === "all" || r.category === s.cat,
    when: (r, s) => matchesArchiveWindow(r, s.when, nowMs),
    q: (r, s) => !s.q || matchesText(r),
  };
}

/* ─────────────────────────────────────── sorting ──────────────────────────────────────── */

export const ARCHIVE_NATURAL_DIR: Record<ArchiveSortId, SortDir> = {
  resolved: "desc",
  volume: "desc",
};

function archiveKey(row: ArchiveRow, sort: ArchiveSortId): number | null {
  switch (sort) {
    case "resolved": return row.resolvedAtMs;
    case "volume": return row.volume;
  }
}

const ARCHIVE_TIE_BREAK: Record<ArchiveSortId, (a: ArchiveRow, b: ArchiveRow) => number> = {
  resolved: (a, b) => b.volume - a.volume,
  volume: (a, b) => b.resolvedAtMs - a.resolvedAtMs,
};

export function archiveSortSpec(): SortSpec<ArchiveRow, ArchiveSortId> {
  return { ids: ARCHIVE_SORTS, natural: ARCHIVE_NATURAL_DIR, key: archiveKey, tieBreak: ARCHIVE_TIE_BREAK };
}

/**
 * ⚠️ RETURNS A NEW ARRAY, and that matters here more than anywhere else on this page: the old
 * code called `all.sort()`, which mutates. `all` happened to be a fresh `.filter()` result, so it
 * was safe — but the counts are folded from `searched` and `inProduct`, and the day someone gave
 * `all` a fast path that returned one of those by reference, an in-place sort would have
 * reordered the very arrays the counts are computed over.
 */
export function sortArchive(
  rows: readonly ArchiveRow[],
  state: Pick<ArchiveState, "sort" | "dir">,
): ArchiveRow[] {
  return sortBy(archiveSortSpec(), rows, state);
}

/* ──────────────────────────────── filtering + counting ────────────────────────────────── */

export function filterArchive(
  rows: readonly ArchiveRow[],
  state: ArchiveState,
  nowMs: number,
  matchesText: (row: ArchiveRow) => boolean,
): ArchiveRow[] {
  return filterRows(rows, state, archiveAxes(nowMs, matchesText));
}

export function archiveCounts(
  rows: readonly ArchiveRow[],
  state: ArchiveState,
  nowMs: number,
  matchesText: (row: ArchiveRow) => boolean,
) {
  const axes = archiveAxes(nowMs, matchesText);
  return {
    out: countsFor(rows, state, axes, "out", ARCHIVE_LENSES),
    product: countsFor(rows, state, axes, "product", PRODUCT_IDS),
    cat: countsFor(rows, state, axes, "cat", ARCHIVE_TOPIC_IDS),
    when: countsFor(rows, state, axes, "when", ARCHIVE_WHEN_IDS),
  };
}

export function archiveCountFor(
  rows: readonly ArchiveRow[],
  state: ArchiveState,
  nowMs: number,
  matchesText: (row: ArchiveRow) => boolean,
  patch: Partial<ArchiveState>,
): number {
  return countFor(rows, state, archiveAxes(nowMs, matchesText), patch);
}

/* ─────────────────────────────── empty causes + exits ─────────────────────────────────── */

export type ArchiveExitId = "cat" | "when" | "product" | "q" | "out";

/**
 * ⭐ `product` IS AMONG THE EXITS, AND IT WAS THE ONE THE PAGE WAS MISSING. It offered an escape
 * from a category and none from the product — so `?product=MARKET` (the DEFAULT) with a search
 * that only matches Up & Down rows produced an empty page whose only way out was "clear the
 * search", while the rows the player wanted sat one pill away.
 */
const ARCHIVE_EXITS: readonly ExitCandidate<ArchiveState, ArchiveExitId>[] = [
  { id: "cat", patch: { cat: "all" } },
  { id: "when", patch: { when: "all" } },
  { id: "product", patch: { product: "all" } },
  { id: "q", patch: { q: "" } },
  { id: "out", patch: { out: "all" } },
];

export function archiveExits(
  rows: readonly ArchiveRow[],
  state: ArchiveState,
  nowMs: number,
  matchesText: (row: ArchiveRow) => boolean,
): Relaxation<ArchiveState, ArchiveExitId>[] {
  return relaxations(rows, state, archiveAxes(nowMs, matchesText), ARCHIVE_EXITS);
}

const ARCHIVE_HEALTHY_EMPTY: readonly string[] = ARCHIVE_LENSES.filter((l) => l !== "all");

export function archiveEmptyCause(
  state: ArchiveState,
  nowMs: number,
  matchesText: (row: ArchiveRow) => boolean,
  shown: number,
  total: number,
): EmptyKind | null {
  return emptyKind({
    state,
    defaults: ARCHIVE_DEFAULT_STATE,
    axes: archiveAxes(nowMs, matchesText),
    shown,
    total,
    lensKey: "out",
    healthyEmpty: ARCHIVE_HEALTHY_EMPTY,
    searchKey: "q",
    windowKey: "when",
  });
}
