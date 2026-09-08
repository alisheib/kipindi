/**
 * THE `/proposals` QUERY BAR — the lifecycle lens, the sort, and mine · topic · when.
 *
 * 🔴 IT REPLACES A RAIL THAT ASKED THREE QUESTIONS AT ONCE. `Hot · New · Listed · Mine` mixed two
 * ORDERINGS, one STATUS and one OWNERSHIP filter into a single mutually-exclusive strip, so a
 * player could not ask for "my proposals, newest first" — `mine` and `new` were the same control.
 * That is the §A5/§7g defect this campaign exists to remove, in its clearest form on the platform.
 *
 * ⭐ THE LENS LABELS ARE THE CARD'S OWN WORDS, KEY FOR KEY. `status-badge.tsx` resolves each
 * status through `t.common.underReview` / `changesRequested` / `approved` / `live` / `declined`
 * and `t.market.statusResolved`; this bar reuses exactly those, so a player who presses "Declined"
 * sees cards badged "Declined" rather than a synonym. ⛔ Not one new lens key was needed, which is
 * the check that the vocabulary was already right and only the CONTROL was missing.
 *
 * ⚠️ `Hot` IS A SORT HERE, NOT A LENS, because `status-badge.tsx` treats it as an OVERLAY on the
 * two open states — *"a crowd signal, not a payout"* — never as a lifecycle step of its own.
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
import { I, categoryGlyph } from "@/components/ui/glyphs";
import { categoryLabel } from "@/components/proposals/category-icon";
import { effectiveDir } from "@/lib/query/sort";
import type { Dict } from "@/lib/i18n-dict";
import type { ProposalCategory } from "@/lib/server/store";
import {
  BOARD_LENSES,
  BOARD_NATURAL_DIR,
  BOARD_SORTS,
  BOARD_TOPIC_IDS,
  BOARD_WHEN_IDS,
  MINE_IDS,
  boardSheetCount,
  buildBoardHref,
  clearedBoardState,
  hasActiveBoardFilters,
  type BoardLens,
  type BoardSortId,
  type BoardState,
  type BoardWhenId,
  type MineId,
} from "@/lib/proposals/board";

export type BoardCounts = {
  lens: Record<string, number>;
  mine: Record<string, number>;
  cat: Record<string, number>;
  when: Record<string, number>;
};

/** ⛔ Every word is the one `status-badge.tsx` paints on the card for that status. */
function lensLabel(t: Dict, lens: BoardLens): string {
  switch (lens) {
    case "all": return t.common.all;
    case "review": return t.common.underReview;
    case "changes": return t.common.changesRequested;
    case "approved": return t.common.approved;
    case "live": return t.common.live;
    case "resolved": return t.market.statusResolved;
    case "declined": return t.common.declined;
  }
}

function sortLabel(t: Dict, s: BoardSortId): string {
  switch (s) {
    // ⚠️ The OLD rail's own labels, reused: `Hot` and `New` were always orderings, so the words a
    //    player already knows move with the behaviour instead of being reinvented beside it.
    case "hot": return t.proposals.filterHot;
    case "new": return t.market.sortNew;
    case "closing": return t.market.sortClosing;
  }
}

function mineLabel(t: Dict, m: MineId): string {
  return m === "mine" ? t.proposals.filterMine : t.common.all;
}

function whenLabel(t: Dict, w: BoardWhenId): string {
  switch (w) {
    case "today": return t.common.rangeToday;
    case "yesterday": return t.common.rangeYesterday;
    case "7d": return t.common.range7d;
    case "30d": return t.common.range30d;
    case "all": return t.common.rangeAll;
  }
}

export function ProposalsBar({
  state,
  counts,
  resultCount,
  t,
}: {
  state: BoardState;
  counts: BoardCounts;
  resultCount: number;
  t: Dict;
}) {
  const href = (patch: Partial<BoardState>) => buildBoardHref(state, patch);
  const dir = effectiveDir({ natural: BOARD_NATURAL_DIR }, state);
  const sheetCount = boardSheetCount(state);
  const resultPhrase =
    resultCount === 1 ? t.proposals.oneProposal : t.proposals.nProposals.replace("{n}", String(resultCount));

  const clear = (
    <QueryClear
      href={hasActiveBoardFilters(state) ? buildBoardHref(clearedBoardState(state)) : null}
      label={t.common.clearAll}
    />
  );

  const mineChips = MINE_IDS.map((m) => (
    <FilterPill
      key={m}
      semantics="toggle"
      replace
      scroll={false}
      href={href({ mine: m })}
      label={mineLabel(t, m)}
      count={counts.mine[m]}
      on={state.mine === m}
      testId={`mine:${m}`}
    />
  ));

  const whenChips = BOARD_WHEN_IDS.map((w) => (
    <FilterPill
      key={w}
      semantics="toggle"
      replace
      scroll={false}
      href={href({ when: w })}
      label={whenLabel(t, w)}
      count={counts.when[w]}
      on={state.when === w}
      testId={`when:${w}`}
    />
  ));

  const topicChips = BOARD_TOPIC_IDS.map((c) => {
    const Glyph = c === "all" ? I.layoutGrid : (I[categoryGlyph(c as never)] ?? I.layoutGrid);
    return (
      <FilterPill
        key={c}
        semantics="toggle"
        replace
        scroll={false}
        href={href({ cat: c })}
        label={c === "all" ? t.market.catAll : categoryLabel(t, c as ProposalCategory)}
        count={counts.cat[c]}
        on={state.cat === c}
        // ⛔ FOUR CHARACTERS BEFORE THE VALUE — `qa:count-truth` and `qa:results-board` slice
        //    `data-chip` by INDEX, so a `topic:` prefix would feed them garbage rather than fail.
        testId={`cat:${c}`}
        glyph={<Glyph s={14} className={"shrink-0 " + (c === state.cat ? "text-brand-300" : "opacity-70")} />}
      />
    );
  });

  return (
    <div data-filter-rail className={QUERY_BAR_CLASS}>
      <div className={QUERY_BAR_ROW1_CLASS}>
        <QueryStrip ariaLabel={t.proposals.filterAria}>
          {BOARD_LENSES.map((l) => (
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
        {/* ⭐ `Hot` AND `New` LAND HERE, WHICH IS WHERE THEY ALWAYS BELONGED — and they gain a
            direction they never had: the board could not be asked for its COLDEST proposals, the
            ones the crowd has voted down, which is the view a proposer most needs. */}
        <QuerySort
          label={t.common.sort}
          value={sortLabel(t, state.sort)}
          ariaLabel={t.proposals.filterAria}
          options={BOARD_SORTS.map((s) => ({
            id: s, label: sortLabel(t, s), href: href({ sort: s, dir: null }),
            on: state.sort === s, naturalDir: BOARD_NATURAL_DIR[s],
          }))}
          dir={dir}
          dirHref={href({ dir: dir === "asc" ? "desc" : "asc" })}
          ascLabel={t.market.sortedAsc}
          descLabel={t.market.sortedDesc}
        />

        <FilterSheet
          label={t.market.filtersOpen}
          title={t.proposals.title}
          ariaLabel={sheetCount > 0 ? t.market.filtersAriaN.replace("{n}", String(sheetCount)) : t.market.filtersOpen}
          closeLabel={t.market.filtersClose}
          applyLabel={t.market.filtersApply.replace("{n}", resultPhrase)}
          count={sheetCount}
          footer={clear}
        >
          <FilterSheetGroup label={t.proposals.filterMine}>{mineChips}</FilterSheetGroup>
          <FilterSheetGroup label={t.common.when}>{whenChips}</FilterSheetGroup>
          <FilterSheetGroup
            label={t.common.topic}
            className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-1.5"
          >
            {topicChips}
          </FilterSheetGroup>
        </FilterSheet>

        <QueryGroupDivider />
        <nav aria-label={t.proposals.filterMine} className={QUERY_GROUP_CLASS}>
          <FilterGroupKey>{t.proposals.filterMine}</FilterGroupKey>
          {mineChips}
        </nav>

        <QueryGroupDivider />
        <nav aria-label={t.common.when} className={QUERY_GROUP_CLASS}>
          <FilterGroupKey>{t.common.when}</FilterGroupKey>
          {whenChips}
        </nav>

        <QueryGroupDivider />
        <nav aria-label={t.common.topic} className={QUERY_GROUP_CLASS}>
          <FilterGroupKey>{t.common.topic}</FilterGroupKey>
          {topicChips}
        </nav>

        <span className="hidden lg:contents">{clear}</span>
      </div>
    </div>
  );
}
