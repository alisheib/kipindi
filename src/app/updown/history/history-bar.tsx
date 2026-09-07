/**
 * THE `/updown/history` QUERY BAR — six lenses, a sort, and asset · duration · window.
 *
 * ⛔ IT CARRIES `data-filter-rail` AND RENDERS `<FilterPill>` IN ITS OWN SOURCE, because
 * `test:filter-language` §0.5/§3.1/§3.2 require that of a declared surface — see
 * `components/ui/query-bar.tsx`'s header for why the shared bar owns the mechanisms and never
 * the controls.
 *
 * ⚠️ THE DAY RAIL IS GONE AND `?day=` IS NOT. The seven-day rail folds into the shared WINDOW
 * vocabulary, so "last 7 days" means here what it means on `/wallet` and `/positions`. But the
 * Up & Down digest deep-links to an exact EAT day, and those links are already sent — so `?day=`
 * is still parsed, still filters, and when one is in force the bar states it as a single pill the
 * player can press off. ⛔ Deleting the param would have broken every notification already
 * delivered; keeping the RAIL as well would have been two controls for one axis.
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
import { effectiveDir } from "@/lib/query/sort";
import type { Dict } from "@/lib/i18n-dict";
import {
  UD_LENSES,
  UD_NATURAL_DIR,
  UD_SORTS,
  UD_WHEN_IDS,
  buildUdHref,
  clearedUdState,
  hasActiveUdFilters,
  udSheetCount,
  type UdLens,
  type UdQueryState,
  type UdSortId,
  type UdWhenId,
} from "@/lib/updown/history-query";

export type UdCounts = {
  tab: Record<string, number>;
  asset: Record<string, number>;
  dur: Record<string, number>;
  when: Record<string, number>;
};

/**
 * ⛔ EVERY WORD IS THE CARD'S OWN. The chip on a round reads "In play" / "Up wins" / "Down wins"
 * / "Void · refunded" / "Confirming price"; the pill that filters to it must read the same, or a
 * player presses one word and lands on another.
 */
function lensLabel(t: Dict, lens: UdLens): string {
  switch (lens) {
    case "all": return t.common.all;
    case "inplay": return t.market.udInPlay;
    case "up": return t.market.udUpWins;
    case "down": return t.market.udDownWins;
    case "void": return t.market.udVoided;
    case "pending": return t.market.udConfirmingPrice;
  }
}

function sortLabel(t: Dict, s: UdSortId): string {
  switch (s) {
    case "recent": return t.positions.sortRecent;
    case "stake": return t.positions.sortStake;
    case "return": return t.positions.sortReturn;
    case "asset": return t.market.udAssets;
  }
}

function whenLabel(t: Dict, w: UdWhenId): string {
  switch (w) {
    case "today": return t.common.rangeToday;
    case "yesterday": return t.common.rangeYesterday;
    case "7d": return t.common.range7d;
    case "30d": return t.common.range30d;
    case "all": return t.common.rangeAll;
  }
}

export function HistoryBar({
  state,
  counts,
  resultCount,
  assets,
  durations,
  dayLabel,
  t,
}: {
  state: UdQueryState;
  counts: UdCounts;
  resultCount: number;
  /** ⛔ Derived from the player's OWN rounds — never a typed list. See the contract's note. */
  assets: ReadonlyArray<{ id: string; label: string }>;
  durations: readonly string[];
  /** The formatted EAT day, when a digest link pinned one. */
  dayLabel: string | null;
  t: Dict;
}) {
  const href = (patch: Partial<UdQueryState>) => buildUdHref(state, patch);
  const dir = effectiveDir({ natural: UD_NATURAL_DIR }, state);
  const sheetCount = udSheetCount(state);
  const resultPhrase =
    resultCount === 1 ? t.market.udOneRound : t.market.udNRounds.replace("{n}", String(resultCount));

  const clear = (
    <QueryClear
      href={hasActiveUdFilters(state) ? buildUdHref(clearedUdState(state)) : null}
      label={t.common.clearAll}
    />
  );

  const Chip = (p: { href: string; label: string; count?: number; on: boolean; testId: string }) => (
    <FilterPill {...p} semantics="toggle" replace scroll={false} />
  );

  return (
    <div data-filter-rail className={QUERY_BAR_CLASS}>
      <div className={QUERY_BAR_ROW1_CLASS}>
        <QueryStrip ariaLabel={t.market.udHistoryTitle}>
          {UD_LENSES.map((l) => (
            <Chip key={l} href={href({ tab: l })} label={lensLabel(t, l)} count={counts.tab[l]}
              on={state.tab === l} testId={`tab:${l}`} />
          ))}
        </QueryStrip>
        <QueryResultCount count={resultCount} phrase={resultPhrase} />
      </div>

      <div className={QUERY_BAR_ROW2_CLASS}>
        <QuerySort
          label={t.common.sort}
          value={sortLabel(t, state.sort)}
          ariaLabel={t.market.sortAria}
          options={UD_SORTS.map((s) => ({
            id: s, label: sortLabel(t, s), href: href({ sort: s, dir: null }),
            on: state.sort === s, naturalDir: UD_NATURAL_DIR[s],
          }))}
          dir={dir}
          dirHref={href({ dir: dir === "asc" ? "desc" : "asc" })}
          ascLabel={t.market.sortedAsc}
          descLabel={t.market.sortedDesc}
        />

        {/* ⚠️ THE PINNED DAY, WHEN A DIGEST LINK SENT ONE. It is rendered as a SELECTED pill whose
            href clears it — the shape the old day rail already used, and its own note says why:
            a rail must be able to say which day is in force AND be the way out of it, because
            "a selected control that is not on screen is how a player concludes the filter is
            stuck." ⛔ It only appears when a day is pinned, so it is never a control with no job. */}
        {dayLabel && (
          <Chip href={href({ day: "" })} label={dayLabel} on testId={`day:${state.day}`} />
        )}

        <FilterSheet
          label={t.market.filtersOpen}
          title={t.market.udHistoryTitle}
          ariaLabel={sheetCount > 0 ? t.market.filtersAriaN.replace("{n}", String(sheetCount)) : t.market.filtersOpen}
          closeLabel={t.market.filtersClose}
          applyLabel={t.market.filtersApply.replace("{n}", resultPhrase)}
          count={sheetCount}
          footer={clear}
        >
          <FilterSheetGroup label={t.market.udAssets}>
            {assets.map((a) => (
              <Chip key={a.id} href={href({ asset: a.id })} label={a.label} count={counts.asset[a.id]}
                on={state.asset === a.id} testId={`asset:${a.id}`} />
            ))}
          </FilterSheetGroup>
          <FilterSheetGroup label={t.market.udDurations}>
            {durations.map((d) => (
              <Chip key={d} href={href({ dur: d })}
                label={d === "all" ? t.common.all : `${d} ${t.market.udMin}`}
                count={counts.dur[d]} on={state.dur === d} testId={`dur:${d}`} />
            ))}
          </FilterSheetGroup>
          <FilterSheetGroup label={t.common.when}>
            {UD_WHEN_IDS.map((w) => (
              <Chip key={w} href={href({ when: w, day: "" })} label={whenLabel(t, w)} count={counts.when[w]}
                on={!state.day && state.when === w} testId={`when:${w}`} />
            ))}
          </FilterSheetGroup>
        </FilterSheet>

        <QueryGroupDivider />
        <nav aria-label={t.market.udAssets} className="hidden shrink-0 items-center gap-1 lg:flex">
          <FilterGroupKey>{t.market.udAssets}</FilterGroupKey>
          {assets.map((a) => (
            <Chip key={a.id} href={href({ asset: a.id })} label={a.label} count={counts.asset[a.id]}
              on={state.asset === a.id} testId={`asset:${a.id}`} />
          ))}
        </nav>

        <QueryGroupDivider />
        <nav aria-label={t.market.udDurations} className="hidden shrink-0 items-center gap-1 lg:flex">
          <FilterGroupKey>{t.market.udDurations}</FilterGroupKey>
          {durations.map((d) => (
            <Chip key={d} href={href({ dur: d })}
              label={d === "all" ? t.common.all : `${d} ${t.market.udMin}`}
              count={counts.dur[d]} on={state.dur === d} testId={`dur:${d}`} />
          ))}
        </nav>

        <QueryGroupDivider />
        <nav aria-label={t.common.when} className="hidden shrink-0 items-center gap-1 lg:flex">
          <FilterGroupKey>{t.common.when}</FilterGroupKey>
          {UD_WHEN_IDS.map((w) => (
            <Chip key={w} href={href({ when: w, day: "" })} label={whenLabel(t, w)} count={counts.when[w]}
              on={!state.day && state.when === w} testId={`when:${w}`} />
          ))}
        </nav>

        <span className="hidden lg:contents">{clear}</span>
      </div>
    </div>
  );
}
