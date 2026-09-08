/**
 * THE `/fairness` QUERY BAR — the outcome lens, the window, the sort.
 *
 * ⭐ IT IS `/results`' BAR OVER THE SAME POPULATION, AND THAT IS THE POINT. Both pages read
 * `RESOLVED ∪ VOIDED` on the MARKET line and both render the verdict through the same three-armed
 * chip; giving them different param names or different pill words would mean a player who learned
 * one has not learned the other, and a link could not be carried between them. Same `?out=`, same
 * ids, same labels resolved through `outcomeWord`.
 *
 * ⛔ THE WORDS COME FROM THE LEXICON, NEVER TYPED HERE. `/results`' own bar records why: the
 * verdict word varies by product line, so it is resolved through `outcomeWord(t, …, line)` rather
 * than hardcoded — E-169 is that defect already shipped once. This page is MARKET-only (see the
 * page's note on `MUST_STAY_DEFAULT`), so the line is fixed, but it is still resolved rather than
 * typed so the two pages cannot drift apart.
 *
 * ⚠️ THIS IS AN UNAUTHENTICATED PAGE. Everything here is a `<Link>` over server-rendered state,
 * so the whole bar works with no JavaScript and no session — which matters more here than
 * anywhere: the audience includes a regulator opening the URL cold.
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
import { outcomeWord } from "@/lib/side-label";
import { effectiveDir } from "@/lib/query/sort";
import type { Dict } from "@/lib/i18n-dict";
import type { PlayerPresetId } from "@/lib/query/windows";
import {
  ATTESTATION_LENSES,
  ATTESTATION_NATURAL_DIR,
  ATTESTATION_SORTS,
  ATTESTATION_WHEN_IDS,
  attestationSheetCount,
  buildAttestationHref,
  clearedAttestationState,
  hasActiveAttestationFilters,
  type AttestationLens,
  type AttestationSortId,
  type AttestationState,
} from "@/lib/fairness/attestations";

export type AttestationCounts = {
  out: Record<string, number>;
  when: Record<string, number>;
};

/** ⛔ Identical to `results-bar.tsx`'s `outLabel` — same rows, same words. */
function lensLabel(t: Dict, lens: AttestationLens): string {
  switch (lens) {
    case "all": return t.common.all;
    case "yes": return outcomeWord(t, "YES", "MARKET");
    case "no": return outcomeWord(t, "NO", "MARKET");
    case "void": return t.common.voided;
  }
}

/**
 * ⚠️ `recent` IS LABELLED WITH THE TIMESTAMP COLUMN'S OWN HEADER, `thResolved`, and NOT with
 * `statusResolved`. They are the same word in English and two different words in Swahili
 * ("Imetatuliwa" against "Imekamilika"); using the status word for a CLOCK would put one label
 * over two meanings on a single screen.
 */
function sortLabel(t: Dict, s: AttestationSortId): string {
  switch (s) {
    case "recent": return t.common.thResolved;
    case "market": return t.common.thMarket;
  }
}

function whenLabel(t: Dict, when: PlayerPresetId): string {
  switch (when) {
    case "today": return t.common.rangeToday;
    case "yesterday": return t.common.rangeYesterday;
    case "7d": return t.common.range7d;
    case "30d": return t.common.range30d;
    case "all": return t.common.rangeAll;
  }
}

export function FairnessBar({
  state,
  counts,
  resultCount,
  t,
}: {
  state: AttestationState;
  counts: AttestationCounts;
  /** ⛔ The SAME variable the pager reads. Never recomputed — §3 rule 5. */
  resultCount: number;
  t: Dict;
}) {
  const href = (patch: Partial<AttestationState>) => buildAttestationHref(state, patch);
  const dir = effectiveDir({ natural: ATTESTATION_NATURAL_DIR }, state);
  const sheetCount = attestationSheetCount(state);
  const resultPhrase =
    resultCount === 1 ? t.market.oneResult : t.market.nResults.replace("{n}", String(resultCount));

  const clear = (
    <QueryClear
      href={hasActiveAttestationFilters(state) ? buildAttestationHref(clearedAttestationState(state)) : null}
      label={t.common.clearAll}
    />
  );

  const Chip = (p: { href: string; label: string; count?: number; on: boolean; testId: string }) => (
    <FilterPill {...p} semantics="toggle" replace scroll={false} />
  );

  const whenChips = ATTESTATION_WHEN_IDS.map((w) => (
    <Chip key={w} href={href({ when: w })} label={whenLabel(t, w)} count={counts.when[w]}
      on={state.when === w} testId={`when:${w}`} />
  ));

  return (
    <div data-filter-rail className={QUERY_BAR_CLASS}>
      <div className={QUERY_BAR_ROW1_CLASS}>
        <QueryStrip ariaLabel={t.common.thOutcome}>
          {ATTESTATION_LENSES.map((l) => (
            <Chip
              key={l}
              href={href({ out: l })}
              label={lensLabel(t, l)}
              count={counts.out[l]}
              on={state.out === l}
              // ⛔ FOUR CHARACTERS BEFORE THE VALUE — `qa:count-truth` slices `data-chip` by index.
              testId={`out:${l}`}
            />
          ))}
        </QueryStrip>
        <QueryResultCount count={resultCount} phrase={resultPhrase} />
      </div>

      <div className={QUERY_BAR_ROW2_CLASS}>
        <QuerySort
          label={t.common.sort}
          value={sortLabel(t, state.sort)}
          ariaLabel={t.common.sort}
          options={ATTESTATION_SORTS.map((s) => ({
            id: s,
            label: sortLabel(t, s),
            href: href({ sort: s, dir: null }),
            on: state.sort === s,
            naturalDir: ATTESTATION_NATURAL_DIR[s],
          }))}
          dir={dir}
          dirHref={href({ dir: dir === "asc" ? "desc" : "asc" })}
          ascLabel={t.market.sortedAsc}
          descLabel={t.market.sortedDesc}
        />

        <FilterSheet
          label={t.market.filtersOpen}
          title={t.common.resolutionAttestation}
          ariaLabel={sheetCount > 0 ? t.market.filtersAriaN.replace("{n}", String(sheetCount)) : t.market.filtersOpen}
          closeLabel={t.market.filtersClose}
          applyLabel={t.market.filtersApply.replace("{n}", resultPhrase)}
          count={sheetCount}
          footer={clear}
        >
          <FilterSheetGroup label={t.common.when}>{whenChips}</FilterSheetGroup>
        </FilterSheet>

        <QueryGroupDivider />
        {/* ⭐ `QUERY_GROUP_CLASS`, not a hand-written `shrink-0` wrapper — see its own note. */}
        <nav aria-label={t.common.when} className={QUERY_GROUP_CLASS}>
          <FilterGroupKey>{t.common.when}</FilterGroupKey>
          {whenChips}
        </nav>

        <span className="hidden lg:contents">{clear}</span>
      </div>
    </div>
  );
}
