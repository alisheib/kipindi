/**
 * THE `/positions` QUERY BAR — the seven lenses, the sort, and the phone sheet.
 *
 * ⭐ WHY IT IS A COMPONENT IN THIS FOLDER RATHER THAN JSX INSIDE `page.tsx`. `page.tsx` already
 * reads five stores, prices every open position's live exit and decorates forty rows; adding a
 * hundred lines of control markup to it would make the one file a reader must understand to
 * change this page twice as long. ⛔ It is NOT a shared bar — see `components/ui/query-bar.tsx`'s
 * header: the MECHANISMS are shared, the CONTROLS belong to the surface, because
 * `test:filter-language` §3.1/§3.2/§0.5 require every declared surface to import `filter-pill`,
 * render `<FilterPill>` and carry `data-filter-rail` in its own source.
 *
 * ⚠️ THIS FILE IS PART OF THE `/positions` SURFACE FOR EVERY GATE. It carries the rail hook, so
 * it is what `scripts/filter-language.test.mts`'s SURFACES list must name — the page itself no
 * longer emits one. Declared in the four places §6 of `docs/PLAYER-QUERY-CAMPAIGN.md` requires.
 *
 * ⛔ NO `"use client"`. Every control is a `<Link replace scroll={false}>` — a filter is not a
 * navigation — so the whole bar is server-rendered and the counts are computed against the SAME
 * read the list below it uses. A count can therefore never disagree with the rows it sits above.
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
import { categoryLabel } from "@/lib/markets/category-label";
import { positionOutcomeWord } from "@/lib/side-label";
import type { Dict } from "@/lib/i18n-dict";
import type { MarketCategory } from "@/lib/markets/categories";
import {
  POSITION_LENSES,
  POSITION_SORTS,
  PORTFOLIO_NATURAL_DIR,
  SIDE_IDS,
  TOPIC_IDS,
  WHEN_IDS,
  buildPortfolioHref,
  clearedPortfolioState,
  hasActivePortfolioFilters,
  portfolioSheetCount,
  type PortfolioState,
  type PositionLens,
  type PositionSortId,
  type SideId,
  type WhenId,
} from "@/lib/positions/portfolio";
import { effectiveDir } from "@/lib/query/sort";
import type { ReactNode } from "react";

export type PortfolioCounts = {
  tab: Record<string, number>;
  side: Record<string, number>;
  topic: Record<string, number>;
  when: Record<string, number>;
};

/**
 * ⭐ EVERY WORD COMES FROM THE LEXICON — §L3, no enum ever reaches a sentence.
 *
 * `all`, `open` and `settled` are the page's own three words, already translated and already the
 * ones the nav uses. The four OUTCOME lenses read through `positionOutcomeWord`, which is the
 * same function the card's chip reads — so the pill a player presses and the chip they land on
 * can never disagree about what "refunded" is called.
 */
function lensLabel(t: Dict, lens: PositionLens): string {
  switch (lens) {
    case "all": return t.common.all;
    case "open": return t.common.open;
    case "settled": return t.common.settled;
    case "win": return positionOutcomeWord(t, "WIN", "MARKET");
    case "loss": return positionOutcomeWord(t, "LOSS", "MARKET");
    case "void": return positionOutcomeWord(t, "VOID", "MARKET");
    case "cashed": return positionOutcomeWord(t, "CASHED_OUT", "MARKET");
  }
}

function sortLabel(t: Dict, sort: PositionSortId): string {
  switch (sort) {
    case "recent": return t.positions.sortRecent;
    case "stake": return t.positions.sortStake;
    case "return": return t.positions.sortReturn;
    case "closing": return t.positions.sortClosing;
    case "market": return t.positions.sortMarket;
  }
}

/** ⛔ Through `sideWord`'s vocabulary, never the stored `YES`/`NO` token (§L2). */
function sideLabel(t: Dict, side: SideId): string {
  return side === "any" ? t.market.oddsAny : side === "yes" ? t.common.yes : t.common.no;
}

function whenLabel(t: Dict, when: WhenId): string {
  switch (when) {
    case "today": return t.common.rangeToday;
    case "yesterday": return t.common.rangeYesterday;
    case "7d": return t.common.range7d;
    case "30d": return t.common.range30d;
    case "all": return t.common.rangeAll;
  }
}

export function PositionsBar({
  state,
  counts,
  resultCount,
  t,
}: {
  state: PortfolioState;
  counts: PortfolioCounts;
  /** ⛔ The SAME variable the pager reads. Never recomputed — §3 rule 5. */
  resultCount: number;
  t: Dict;
}) {
  const href = (patch: Partial<PortfolioState>) => buildPortfolioHref(state, patch);
  const dir = effectiveDir({ natural: PORTFOLIO_NATURAL_DIR }, state);
  const sheetCount = portfolioSheetCount(state);
  const resultPhrase =
    resultCount === 1 ? t.positions.oneResult : t.positions.nResults.replace("{n}", String(resultCount));

  const clear = (
    <QueryClear
      href={hasActivePortfolioFilters(state) ? buildPortfolioHref(clearedPortfolioState(state)) : null}
      label={t.common.clearAll}
    />
  );

  /* ⛔ `semantics="toggle"` + `replace scroll={false}` on every control, bound once here so no
     call site below can forget either — the same wrapper `/markets` keeps for the same reason. */
  const Chip = (p: { href: string; label: string; count?: number; on: boolean; testId: string; className?: string }) => (
    <FilterPill {...p} semantics="toggle" replace scroll={false} />
  );

  return (
    <PositionsRail>
      {/* ── row 1 · the seven lenses, and the count they must agree with ───────────────── */}
      <div className={QUERY_BAR_ROW1_CLASS}>
        <QueryStrip ariaLabel={t.positions.filterAria}>
          {POSITION_LENSES.map((l) => (
            <Chip
              key={l}
              href={href({ tab: l })}
              label={lensLabel(t, l)}
              count={counts.tab[l]}
              on={state.tab === l}
              testId={`tab:${l}`}
            />
          ))}
        </QueryStrip>
        <QueryResultCount count={resultCount} phrase={resultPhrase} />
      </div>

      {/* ── row 2 · sort, then EITHER the phone sheet OR the desktop groups ─────────────── */}
      <div className={QUERY_BAR_ROW2_CLASS}>
        <QuerySort
          label={t.common.sort}
          value={sortLabel(t, state.sort)}
          ariaLabel={t.positions.sortAria}
          options={POSITION_SORTS.map((s) => ({
            id: s,
            label: sortLabel(t, s),
            // ⛔ `dir: null` with every sort, so the new sort arrives pointing its own natural way.
            href: href({ sort: s, dir: null }),
            on: state.sort === s,
            naturalDir: PORTFOLIO_NATURAL_DIR[s],
          }))}
          dir={dir}
          dirHref={href({ dir: dir === "asc" ? "desc" : "asc" })}
          ascLabel={t.market.sortedAsc}
          descLabel={t.market.sortedDesc}
        />

        {/* PHONE — side, topic and window behind one button (§K 6b). Sort and the lens strip
            stay in the bar at every width: they answer the first two questions a punter has. */}
        <FilterSheet
          label={t.market.filtersOpen}
          title={t.positions.filtersTitle}
          ariaLabel={sheetCount > 0 ? t.market.filtersAriaN.replace("{n}", String(sheetCount)) : t.market.filtersOpen}
          closeLabel={t.market.filtersClose}
          applyLabel={t.market.filtersApply.replace("{n}", resultPhrase)}
          count={sheetCount}
          footer={clear}
        >
          <FilterSheetGroup label={t.positions.sideKey}>
            {SIDE_IDS.map((s) => (
              <Chip key={s} href={href({ side: s })} label={sideLabel(t, s)} count={counts.side[s]}
                on={state.side === s} testId={`side:${s}`} />
            ))}
          </FilterSheetGroup>

          <FilterSheetGroup label={t.common.when}>
            {WHEN_IDS.map((w) => (
              <Chip key={w} href={href({ when: w })} label={whenLabel(t, w)} count={counts.when[w]}
                on={state.when === w} testId={`when:${w}`} />
            ))}
          </FilterSheetGroup>

          {/* The topic grid — `auto-fill` keeps a cell the size of a CONTROL rather than the size
              of the sheet, so the same rule gives 2 columns at 360 and 4 at 768, and a pill never
              stretches into a button bar. */}
          <FilterSheetGroup
            label={t.common.topic}
            className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-1.5"
          >
            {TOPIC_IDS.map((c) => (
              <Chip key={c} href={href({ topic: c })}
                label={c === "all" ? t.market.catAll : categoryLabel(t, c as MarketCategory)}
                count={counts.topic[c]} on={state.topic === c} testId={`topic:${c}`}
                className="justify-self-start" />
            ))}
          </FilterSheetGroup>
        </FilterSheet>

        {/* DESKTOP — the same three axes along the bar. ⚠️ The group KEY is load-bearing: side
            and window both open with an "Any"-shaped chip, and without a key the bar renders two
            of them side by side with neither saying what it clears. */}
        <QueryGroupDivider />
        <nav aria-label={t.positions.sideKey} className={QUERY_GROUP_CLASS}>
          <FilterGroupKey>{t.positions.sideKey}</FilterGroupKey>
          {SIDE_IDS.map((s) => (
            <Chip key={s} href={href({ side: s })} label={sideLabel(t, s)} count={counts.side[s]}
              on={state.side === s} testId={`side:${s}`} />
          ))}
        </nav>

        <QueryGroupDivider />
        <nav aria-label={t.common.when} className={QUERY_GROUP_CLASS}>
          <FilterGroupKey>{t.common.when}</FilterGroupKey>
          {WHEN_IDS.map((w) => (
            <Chip key={w} href={href({ when: w })} label={whenLabel(t, w)} count={counts.when[w]}
              on={state.when === w} testId={`when:${w}`} />
          ))}
        </nav>

        <QueryGroupDivider />
        <nav aria-label={t.common.topic} className={QUERY_GROUP_CLASS}>
          <FilterGroupKey>{t.common.topic}</FilterGroupKey>
          {TOPIC_IDS.map((c) => (
            <Chip key={c} href={href({ topic: c })}
              label={c === "all" ? t.market.catAll : categoryLabel(t, c as MarketCategory)}
              count={counts.topic[c]} on={state.topic === c} testId={`topic:${c}`} />
          ))}
        </nav>

        <span className="hidden lg:contents">{clear}</span>
      </div>
    </PositionsRail>
  );
}

/**
 * ⭐ THE BAR'S ONE RAIL ELEMENT, SHARED BY BOTH VARIANTS (S6 WP9) — the sticky query bar's class and the
 * `data-filter-rail` hook every live probe addresses. It is `PositionsBar`'s own outer element, moved here verbatim, so
 * the hook is written ONCE in this file: `red:filter-language`'s vacuity case removes it in one place and the gate must
 * see the rail go — a second copy in the journey variant would have kept the gate green over a vanished classic rail,
 * and made that case's anchor ambiguous. A server component, so the element it renders is the one `PositionsBar`
 * rendered, in the same place: the classic bar's markup is today's.
 */
function PositionsRail({ children }: { children: ReactNode }) {
  return <div data-filter-rail className={QUERY_BAR_CLASS}>{children}</div>;
}

/**
 * ⭐ THE BAR ON TIKETI ZANGU — this bar's journey variant (the Vodacom plan S6, S6-PLAN WP9 step 5 as amended by A7; the
 * S4 frames s4-9-tiketi-*): row 1 alone, the seven lenses with no count on any of them and no result count beside them
 * (the canvas draws none), on the same rail, the same strip and the same pill.
 *
 * ⛔ "NAFASI" NEVER APPEARS HERE (A7, SJ-19): the strip is named `journey.ticketsFilterAria`, never the classic
 * `positions.filterAria`, and the result count ("Nafasi {n}" in Swahili) is not drawn; the lens words are the page's own
 * (`lensLabel`), none of which says it. `test:journey-tickets` §4 follows this function and every helper it calls.
 * ⛔ ALL SEVEN LENSES STAY (§0h point 11): nothing a player can narrow by is taken away; the strip scrolls, as drawn.
 * Sort (shelved for preview viewers, A19 and VODACOM-PLAN §0h point 11) and the phone sheet with the side, topic and
 * window groups are row 2's, which this variant does not draw (WP9 step 5; §0h point 23).
 * ⭐ A SIBLING OF `PositionsBar`, NOT A PROP ON IT: the classic bar computes and draws exactly what it did, and this one is
 * handed nothing it does not draw. Row 1's class has no bottom padding of its own (row 2 supplies it on the classic
 * bar), so the strip adds the scale's `pb-2`.
 */
export function PositionsBarJourney({ state, t }: { state: PortfolioState; t: Dict }) {
  return (
    <PositionsRail>
      <div className={`${QUERY_BAR_ROW1_CLASS} pb-2`}>
        <QueryStrip ariaLabel={t.journey.ticketsFilterAria}>
          {POSITION_LENSES.map((l) => (
            <FilterPill
              key={l}
              href={buildPortfolioHref(state, { tab: l })}
              label={lensLabel(t, l)}
              on={state.tab === l}
              testId={`tab:${l}`}
              semantics="toggle"
              replace
              scroll={false}
            />
          ))}
        </QueryStrip>
      </div>
    </PositionsRail>
  );
}
