/**
 * THE `/watchlist` QUERY BAR — the lifecycle lens, the sort, and the topic sheet.
 *
 * ⭐ THIS PAGE HAD NO CONTROLS AT ALL. Not a rail rebuilt in a second layout the way `/results`'
 * sidebar was — nothing: no `searchParams`, no filter, no sort, no pager. So every line below is
 * the campaign's actual subject rather than a consistency pass over something that worked.
 *
 * ⛔ THE LENS PILLS AND THE CARD'S STATUS CHIP MUST NEVER DISAGREE, and they cannot, because both
 * read the SAME `selectionClosed` boolean the page computes once from `isSelectionClosed(m) ||
 * isClosedByTime(m)`. `/markets` shipped that exact disagreement (`market-card.tsx`'s note: a
 * market past its selection window still wore a badge the board's own predicate denied), which is
 * why `FollowRow` takes the boolean rather than deriving its own.
 *
 * ⚠️ FIVE LENSES, NOT THE FOUR THE PLAN NAMED — `following.ts`'s `FOLLOW_LENSES` carries the two
 * re-derivations, and both come from copy that already existed: the dictionary's own ruling that
 * `statusOpen` is not `statusLive`, and the campaign's complaint naming void separately from lost.
 */
import { FilterPill, FilterGroupKey } from "@/components/ui/filter-pill";
import { FilterSheet, FilterSheetGroup } from "@/components/markets/filter-sheet";
import {
  QUERY_BAR_CLASS,
  QUERY_BAR_ROW1_CLASS,
  QUERY_BAR_ROW2_CLASS,
  QueryClear,
  QueryGroupDivider,
  QueryResultCount,
  QuerySort,
  QueryStrip,
} from "@/components/ui/query-bar";
import { I, categoryGlyph } from "@/components/ui/glyphs";
import { categoryLabel } from "@/lib/markets/category-label";
import { effectiveDir } from "@/lib/query/sort";
import type { Dict } from "@/lib/i18n-dict";
import type { MarketCategory } from "@/lib/markets/categories";
import {
  FOLLOW_LENSES,
  FOLLOW_NATURAL_DIR,
  FOLLOW_SORTS,
  FOLLOW_TOPIC_IDS,
  buildFollowHref,
  clearedFollowState,
  followSheetCount,
  hasActiveFollowFilters,
  type FollowLens,
  type FollowSortId,
  type FollowState,
} from "@/lib/watchlist/following";

export type FollowCounts = {
  lens: Record<string, number>;
  cat: Record<string, number>;
};

/**
 * ⛔ EVERY WORD IS ALREADY IN THE DICTIONARY, IN ALL THREE LOCALES, AND EVERY ONE IS THE WORD THE
 * CARD USES FOR THE SAME STATE. `market-card.tsx` resolves its chip through the identical keys, so
 * a player who presses "In progress" sees cards chipped "In progress" — not a synonym.
 *
 * ⚠️ `statusInProgress` CARRIES A TRANSLATION RULING, and reusing the key is how this bar inherits
 * it. Its dictionary note records that the literal Chinese for "in progress" (`进行中`) is ALREADY
 * this dictionary's word for OPEN, and Swahili `Inaendelea` is already Up & Down's "In play" — so
 * both locales borrow the board's `waitingForResults` phrasing instead. ⛔ A hand-typed label here
 * would have re-introduced two pills that read identically in two of the three languages.
 */
function lensLabel(t: Dict, lens: FollowLens): string {
  switch (lens) {
    case "all": return t.common.all;
    case "open": return t.market.statusOpen;
    case "progress": return t.market.statusInProgress;
    case "done": return t.market.statusResolved;
    case "void": return t.market.statusVoid;
  }
}

function sortLabel(t: Dict, s: FollowSortId): string {
  switch (s) {
    case "starred": return t.watchlist.sortStarred;
    case "closing": return t.market.sortClosing;
    case "pool": return t.market.sortPool;
    case "people": return t.market.sortPeople;
  }
}

export function WatchlistBar({
  state,
  counts,
  resultCount,
  t,
}: {
  state: FollowState;
  counts: FollowCounts;
  resultCount: number;
  t: Dict;
}) {
  const href = (patch: Partial<FollowState>) => buildFollowHref(state, patch);
  const dir = effectiveDir({ natural: FOLLOW_NATURAL_DIR }, state);
  const sheetCount = followSheetCount(state);
  const resultPhrase =
    resultCount === 1 ? t.market.oneResult : t.market.nResults.replace("{n}", String(resultCount));

  const clear = (
    <QueryClear
      href={hasActiveFollowFilters(state) ? buildFollowHref(clearedFollowState(state)) : null}
      label={t.common.clearAll}
    />
  );

  const topicChips = FOLLOW_TOPIC_IDS.map((c) => {
    const Glyph = c === "all" ? I.layoutGrid : (I[categoryGlyph(c as MarketCategory)] ?? I.layoutGrid);
    return (
      <FilterPill
        key={c}
        semantics="toggle"
        replace
        scroll={false}
        href={href({ cat: c })}
        label={c === "all" ? t.market.catAll : categoryLabel(t, c as MarketCategory)}
        count={counts.cat[c]}
        on={state.cat === c}
        // ⛔ FOUR CHARACTERS BEFORE THE VALUE, exactly as `/results` and `/markets` write it —
        //    `qa:count-truth` and `qa:results-board` slice `data-chip` by INDEX, so a `topic:`
        //    prefix here would feed those drivers garbage rather than failing loudly.
        testId={`cat:${c}`}
        glyph={<Glyph s={14} className={"shrink-0 " + (c === state.cat ? "text-brand-300" : "opacity-70")} />}
      />
    );
  });

  return (
    <div data-filter-rail className={QUERY_BAR_CLASS}>
      <div className={QUERY_BAR_ROW1_CLASS}>
        <QueryStrip ariaLabel={t.market.statusAria}>
          {FOLLOW_LENSES.map((l) => (
            <FilterPill
              key={l}
              semantics="toggle"
              replace
              scroll={false}
              href={href({ lens: l })}
              label={lensLabel(t, l)}
              count={counts.lens[l]}
              on={state.lens === l}
              testId={`lens:${l}`}
            />
          ))}
        </QueryStrip>
        <QueryResultCount count={resultCount} phrase={resultPhrase} />
      </div>

      <div className={QUERY_BAR_ROW2_CLASS}>
        {/* ⭐ `starred` IS FIRST AND IS THE DEFAULT — the star order this page has always rendered
            in. Every other sort is new, so opening `/watchlist` with no params still produces the
            page the player already knows, and the three additions are things they choose. */}
        <QuerySort
          label={t.common.sort}
          value={sortLabel(t, state.sort)}
          ariaLabel={t.market.sortAria}
          options={FOLLOW_SORTS.map((s) => ({
            id: s, label: sortLabel(t, s), href: href({ sort: s, dir: null }),
            on: state.sort === s, naturalDir: FOLLOW_NATURAL_DIR[s],
          }))}
          dir={dir}
          dirHref={href({ dir: dir === "asc" ? "desc" : "asc" })}
          ascLabel={t.market.sortedAsc}
          descLabel={t.market.sortedDesc}
        />

        <FilterSheet
          label={t.market.filtersOpen}
          title={t.watchlist.title}
          ariaLabel={sheetCount > 0 ? t.market.filtersAriaN.replace("{n}", String(sheetCount)) : t.market.filtersOpen}
          closeLabel={t.market.filtersClose}
          applyLabel={t.market.filtersApply.replace("{n}", resultPhrase)}
          count={sheetCount}
          footer={clear}
        >
          <FilterSheetGroup
            label={t.common.topic}
            className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-1.5"
          >
            {topicChips}
          </FilterSheetGroup>
        </FilterSheet>

        <QueryGroupDivider />
        <nav aria-label={t.market.topicAria} className="hidden shrink-0 items-center gap-1 lg:flex">
          <FilterGroupKey>{t.common.topic}</FilterGroupKey>
          {topicChips}
        </nav>

        <span className="hidden lg:contents">{clear}</span>
      </div>
    </div>
  );
}
