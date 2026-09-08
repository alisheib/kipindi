/**
 * THE `/profile/account` ACTIVITY BAR — the category lens, the window, the sort and the search.
 *
 * ⭐ THE ONE ROUTE IN STAGE 4 THAT ALREADY HAD THE HOOK. Every other page in this stage gained
 * `data-filter-rail` here for the first time; `/profile/account` has carried it since the G-1
 * repair and is already named in all three of §6's script lists. ⛔ SO THIS FILE MOVES A
 * DECLARATION RATHER THAN ADDING ONE — `scripts/filter-language.test.mts`'s SURFACES entry must
 * now name this file and not `page.tsx`, because the file named there must always be the one that
 * emits the hook. §0.4 goes red on the new file being undeclared and §0.5 on the old one no longer
 * carrying it; both are the loud, correct stop.
 *
 * ⛔ THE LENS PILLS ARE BUILT FROM THE PLAYER'S OWN CATEGORIES, PASSED IN. Unlike every sibling
 * bar, the closed set is not a module constant — see `lib/account/activity.ts`'s header: rendering
 * all eight `AuditCategory` arms would give most players five pills that read 0 for the life of the
 * account, and `/wallet`'s ruling is that a lens which can only ever be empty is a dead end, not a
 * filter.
 *
 * ⛔ NO `"use client"`. Every control is a `<Link replace scroll={false}>`, so the counts are
 * computed against the SAME read the table below uses and cannot disagree with it.
 */
import { FilterPill, FilterGroupKey } from "@/components/ui/filter-pill";
import { FilterSheet, FilterSheetGroup } from "@/components/markets/filter-sheet";
import {
  QUERY_BAR_CLASS,
  QUERY_BAR_ROW1_CLASS,
  QUERY_BAR_ROW2_CLASS,
  QUERY_GROUP_CLASS,
  QueryClear,
  QueryGroupDivider,
  QueryResultCount,
  QuerySort,
  QueryStrip,
} from "@/components/ui/query-bar";
import { effectiveDir } from "@/lib/query/sort";
import { auditCategoryLabel } from "@/lib/account/category-label";
import type { Dict } from "@/lib/i18n-dict";
import type { PlayerPresetId } from "@/lib/query/windows";
import {
  ACTIVITY_NATURAL_DIR,
  ACTIVITY_SORTS,
  ACTIVITY_WHEN_IDS,
  activitySheetCount,
  buildActivityHref,
  clearedActivityState,
  hasActiveActivityFilters,
  type ActivitySortId,
  type ActivityState,
} from "@/lib/account/activity";

export type ActivityCounts = {
  act: Record<string, number>;
  when: Record<string, number>;
};

/**
 * ⭐ THE SORT LABELS ARE THE TABLE'S OWN COLUMN HEADINGS, resolved through the same three keys the
 * `<th>`s use — `t.common.when` · `t.common.category` · `t.common.action`. A sort option whose word
 * differed from the column it orders would be two names for one thing on a single screen, and all
 * three keys already exist in all three locales.
 */
function sortLabel(t: Dict, s: ActivitySortId): string {
  switch (s) {
    case "recent": return t.common.when;
    case "category": return t.common.category;
    case "action": return t.common.action;
  }
}

/** ⛔ The shared window vocabulary's own words — identical to `/positions`, `/wallet`, `/results`. */
function whenLabel(t: Dict, when: PlayerPresetId): string {
  switch (when) {
    case "today": return t.common.rangeToday;
    case "yesterday": return t.common.rangeYesterday;
    case "7d": return t.common.range7d;
    case "30d": return t.common.range30d;
    case "all": return t.common.rangeAll;
  }
}

export function AccountActivityBar({
  state,
  categoryIds,
  counts,
  resultCount,
  t,
}: {
  state: ActivityState;
  /** `["all", ...the categories this player actually has rows in]` — see the header. */
  categoryIds: readonly string[];
  counts: ActivityCounts;
  /** ⛔ The SAME variable the pager reads. Never recomputed — §3 rule 5. */
  resultCount: number;
  t: Dict;
}) {
  const href = (patch: Partial<ActivityState>) => buildActivityHref(state, patch);
  const dir = effectiveDir({ natural: ACTIVITY_NATURAL_DIR }, state);
  const sheetCount = activitySheetCount(state);
  const resultPhrase =
    resultCount === 1 ? t.profile.oneEvent : t.profile.nEvents.replace("{n}", String(resultCount));

  const clear = (
    <QueryClear
      href={hasActiveActivityFilters(state) ? buildActivityHref(clearedActivityState(state)) : null}
      label={t.common.clearAll}
    />
  );

  /* ⛔ `semantics="toggle"` + `replace scroll={false}` bound once, so no call site can forget it. */
  const Chip = (p: { href: string; label: string; count?: number; on: boolean; testId: string }) => (
    <FilterPill {...p} semantics="toggle" replace scroll={false} />
  );

  const whenChips = ACTIVITY_WHEN_IDS.map((w) => (
    <Chip key={w} href={href({ when: w })} label={whenLabel(t, w)} count={counts.when[w]}
      on={state.when === w} testId={`when:${w}`} />
  ));

  return (
    <div data-filter-rail className={QUERY_BAR_CLASS}>
      {/* ── row 1 · the category lenses, each now carrying a real cross-filtered count ───── */}
      <div className={QUERY_BAR_ROW1_CLASS}>
        <QueryStrip ariaLabel={t.profile.activityFilter}>
          {categoryIds.map((c) => (
            <Chip
              key={c}
              href={href({ act: c })}
              /* ⛔ THE LEXICON, NEVER THE TOKEN. This rail printed the raw `AuditCategory` in all
                 three languages until task 4.6 — see `lib/account/category-label.ts`. */
              label={c === "all" ? t.common.all : auditCategoryLabel(t, c)}
              count={counts.act[c]}
              on={state.act === c}
              // ⛔ FOUR CHARACTERS BEFORE THE VALUE, matching every sibling rail — `qa:count-truth`
              //    slices `data-chip` by INDEX, so a longer prefix feeds it garbage rather than
              //    failing loudly. `act:` is the REAL param name, which is what lets a driver
              //    rebuild the URL from the attribute.
              testId={`act:${c}`}
            />
          ))}
        </QueryStrip>
        <QueryResultCount count={resultCount} phrase={resultPhrase} />
      </div>

      {/* ── row 2 · sort, then EITHER the phone sheet OR the desktop window group ───────── */}
      <div className={QUERY_BAR_ROW2_CLASS}>
        <QuerySort
          label={t.common.sort}
          value={sortLabel(t, state.sort)}
          ariaLabel={t.profile.activitySortAria}
          options={ACTIVITY_SORTS.map((s) => ({
            id: s,
            label: sortLabel(t, s),
            // ⛔ `dir: null` with every sort, so the new sort arrives pointing its own natural way.
            href: href({ sort: s, dir: null }),
            on: state.sort === s,
            naturalDir: ACTIVITY_NATURAL_DIR[s],
          }))}
          dir={dir}
          dirHref={href({ dir: dir === "asc" ? "desc" : "asc" })}
          ascLabel={t.market.sortedAsc}
          descLabel={t.market.sortedDesc}
        />

        {/* PHONE — only the window goes behind the button. The lens strip and the sort stay in the
            bar at every width (§K 6b), and the search box sits above it. */}
        <FilterSheet
          label={t.market.filtersOpen}
          title={t.profile.myAccountSub.split("·")[0].trim()}
          ariaLabel={sheetCount > 0 ? t.market.filtersAriaN.replace("{n}", String(sheetCount)) : t.market.filtersOpen}
          closeLabel={t.market.filtersClose}
          applyLabel={t.market.filtersApply.replace("{n}", resultPhrase)}
          count={sheetCount}
          footer={clear}
        >
          <FilterSheetGroup label={t.common.when}>{whenChips}</FilterSheetGroup>
        </FilterSheet>

        <QueryGroupDivider />
        {/* ⭐ `QUERY_GROUP_CLASS`, NOT A HAND-WRITTEN `shrink-0` WRAPPER. That constant exists
            precisely because every bar wrote this by hand and a group whose pills outgrow the space
            left then runs off the screen — measured at 162px past the right edge on `/proposals` at
            1280 in Swahili. A new bar copying the old markup would re-open it. */}
        <nav aria-label={t.common.when} className={QUERY_GROUP_CLASS}>
          <FilterGroupKey>{t.common.when}</FilterGroupKey>
          {whenChips}
        </nav>

        <span className="hidden lg:contents">{clear}</span>
      </div>
    </div>
  );
}
