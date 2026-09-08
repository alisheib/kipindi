/**
 * THE `/positions/performance` PRODUCT RAIL.
 *
 * ⭐ IT NARROWS AGGREGATES, NOT A LIST, which is why it is a lens strip and nothing else — no
 * sort (there are no rows to order), no search (there are no words), no window (a summary whose
 * tiles disagreed about their span would be worse than one with no window at all).
 *
 * ⛔ THE WORDS COME FROM THE LEXICON. `t.market.udTitle` is the platform's name for Up & Down and
 * is already what `/live`'s cards chip a round with, so the pill and the card cannot drift apart.
 *
 * ⚠️ THE `other` PILL IS RENDERED ONLY WHEN IT HOLDS SOMETHING — the caller decides, via
 * `perfLensesToRender`. On a healthy book it never draws; when it does, it means a settled
 * position whose market row could not be read, and hiding it would leave a real number inside
 * `all` that no control can reach.
 */
import { FilterPill } from "@/components/ui/filter-pill";
import {
  QUERY_BAR_CLASS,
  QUERY_BAR_ROW1_CLASS,
  QueryResultCount,
  QueryStrip,
} from "@/components/ui/query-bar";
import type { Dict } from "@/lib/i18n-dict";
import { buildPerfHref, type PerfLens, type PerfState } from "@/lib/positions/performance";

function lensLabel(t: Dict, lens: PerfLens): string {
  switch (lens) {
    case "all": return t.common.all;
    case "poll": return t.common.markets;
    case "updown": return t.market.udTitle;
    /* ⛔ "Unattributed", NOT "Other". This arm means the market row could not be read, so a word
       that named a product would be a claim the page cannot support — and `catOther` is a market
       TOPIC, a different axis entirely. */
    case "other": return t.performance.productOther;
  }
}

export function PerformanceBar({
  state,
  lenses,
  counts,
  resultCount,
  t,
}: {
  state: PerfState;
  /** `all` plus every product this player actually has settled positions in. */
  lenses: readonly PerfLens[];
  counts: Record<string, number>;
  /** ⛔ The SAME number the page's "Total predictions" tile reads. */
  resultCount: number;
  t: Dict;
}) {
  const resultPhrase =
    resultCount === 1 ? t.positions.oneResult : t.positions.nResults.replace("{n}", String(resultCount));

  return (
    <div data-filter-rail className={QUERY_BAR_CLASS}>
      <div className={QUERY_BAR_ROW1_CLASS}>
        <QueryStrip ariaLabel={t.performance.title}>
          {lenses.map((l) => (
            <FilterPill
              key={l}
              semantics="toggle"
              replace
              scroll={false}
              href={buildPerfHref(state, { product: l })}
              label={lensLabel(t, l)}
              count={counts[l]}
              on={state.product === l}
              // ⛔ The REAL param name, four characters before the value — a driver rebuilds the
              //    URL from this attribute and `qa:count-truth` slices it by index.
              testId={`product:${l}`}
            />
          ))}
        </QueryStrip>
        <QueryResultCount count={resultCount} phrase={resultPhrase} />
      </div>
    </div>
  );
}
