/**
 * THE AGENT RECRUIT BOOK'S BAR — four lenses and a sort, on `/profile/invite`.
 *
 * ⭐ IT SITS ON THE AGENT DASHBOARD AND NOT ON THE PLAYER PROMO BODY, which is task 4.11's whole
 * finding — see `lib/affiliate/recruits.ts` for the three lines of shipped code that prove the
 * player body cannot be reached by any live viewer.
 *
 * ⛔ NO SEARCH. Every name in this book is `maskedRosterLabel` output — a mask, not a name — so a
 * search box would invite an agent to type a person's name and match nothing, or worse, to work
 * out which mask belongs to whom by elimination. That is the one control this surface must not
 * have, and its absence is argued in the contract rather than left to look like an oversight.
 *
 * ⛔ NO `"use client"` — every control is a `<Link replace scroll={false}>`, so the counts come
 * from the same read as the rows.
 */
import { FilterPill } from "@/components/ui/filter-pill";
import {
  QUERY_BAR_CLASS,
  QUERY_BAR_ROW1_CLASS,
  QUERY_BAR_ROW2_CLASS,
  QueryClear,
  QueryResultCount,
  QuerySort,
  QueryStrip,
} from "@/components/ui/query-bar";
import { effectiveDir } from "@/lib/query/sort";
import type { Dict } from "@/lib/i18n-dict";
import {
  RECRUIT_LENSES,
  RECRUIT_NATURAL_DIR,
  RECRUIT_SORTS,
  buildRecruitHref,
  clearedRecruitState,
  hasActiveRecruitFilters,
  type RecruitLens,
  type RecruitSortId,
  type RecruitState,
} from "@/lib/affiliate/recruits";

/**
 * ⛔ EVERY WORD IS A MONEY STATE THE PAGE ALREADY NAMES IN A TILE — `dashPaid`, `dashPending`,
 * `dashReversed` — so a pill and the figure it filters to cannot use two words for one state.
 * ⚠️ `joined` reuses `t.common.joined`, which is the word the row itself prints beside the date.
 */
function lensLabel(t: Dict, lens: RecruitLens): string {
  switch (lens) {
    case "all": return t.common.all;
    case "paid": return t.agent.dashLensPaid;
    case "owed": return t.agent.dashLensOwed;
    case "reversed": return t.agent.dashReversed;
    case "joined": return t.common.joined;
  }
}

function sortLabel(t: Dict, s: RecruitSortId): string {
  switch (s) {
    case "recent": return t.common.joined;
    case "earned": return t.proposals.earned;
    case "settlements": return t.agent.dashRecruitHint;
    case "name": return t.agent.dashRecruits;
  }
}

export function RecruitsBar({
  state,
  counts,
  resultCount,
  t,
}: {
  state: RecruitState;
  counts: Record<string, number>;
  /** ⛔ The SAME variable the pager reads. */
  resultCount: number;
  t: Dict;
}) {
  const href = (patch: Partial<RecruitState>) => buildRecruitHref(state, patch);
  const dir = effectiveDir({ natural: RECRUIT_NATURAL_DIR }, state);
  const resultPhrase =
    resultCount === 1 ? t.agent.oneRecruit : t.agent.nRecruits.replace("{n}", String(resultCount));

  return (
    <div data-filter-rail className={QUERY_BAR_CLASS}>
      <div className={QUERY_BAR_ROW1_CLASS}>
        <QueryStrip ariaLabel={t.agent.dashRecruits}>
          {RECRUIT_LENSES.map((l) => (
            <FilterPill
              key={l}
              semantics="toggle"
              replace
              scroll={false}
              href={href({ lens: l })}
              label={lensLabel(t, l)}
              count={counts[l]}
              on={state.lens === l}
              testId={`lens:${l}`}
            />
          ))}
        </QueryStrip>
        <QueryResultCount count={resultCount} phrase={resultPhrase} />
      </div>

      <div className={QUERY_BAR_ROW2_CLASS}>
        <QuerySort
          label={t.common.sort}
          value={sortLabel(t, state.sort)}
          ariaLabel={t.agent.dashRecruits}
          options={RECRUIT_SORTS.map((s) => ({
            id: s,
            label: sortLabel(t, s),
            href: href({ sort: s, dir: null }),
            on: state.sort === s,
            naturalDir: RECRUIT_NATURAL_DIR[s],
          }))}
          dir={dir}
          dirHref={href({ dir: dir === "asc" ? "desc" : "asc" })}
          ascLabel={t.market.sortedAsc}
          descLabel={t.market.sortedDesc}
        />
        <QueryClear
          href={hasActiveRecruitFilters(state) ? buildRecruitHref(clearedRecruitState(state)) : null}
          label={t.common.clearAll}
        />
      </div>
    </div>
  );
}
