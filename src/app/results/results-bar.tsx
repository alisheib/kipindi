/**
 * THE `/results` QUERY BAR — the outcome lens, the sort, and product · topic · window.
 *
 * ⭐ IT RETIRES THE DESKTOP SIDEBAR, and that is the campaign's one visible change to a page that
 * already worked. `/results` carried its rails as an `aside` of full-width pills at board width,
 * beside `/markets` which uses the bar — a second layout for the same job. ⛔ The `aside` also
 * chained two sticky offsets (`top-[56px]` for the search, `top-[122px]` and
 * `max-h-[calc(100dvh-134px)]` for itself), so its geometry could not survive a bar of a
 * different height anyway.
 *
 * ⚠️ THREE THINGS FROM THE OLD SIDEBAR ARE CARRIED DELIBERATELY, not by accident:
 *  · `testId="cat:…"` keeps its EXACT four-character prefix — `qa:results-board` slices
 *    `data-chip` by INDEX (`.slice(4)`), so renaming it to `topic:` would silently feed that
 *    driver garbage rather than failing loudly.
 *  · `testId="product-…"` keeps its hyphen for the same reason.
 *  · pressing a PRODUCT resets the category, because the product filter applies first and a
 *    category that exists in one product may not exist in the other.
 *
 * ⛔ AND THE `aria-label` BUG IS FIXED, NOT COPIED. Both the product rail and the category rail
 * carried `t.results.categoriesAria` — two `<nav>`s in one landmark with the identical accessible
 * name, which is a real defect the sidebar shipped.
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
import { outcomeWord, sideWord } from "@/lib/side-label";
import { effectiveDir } from "@/lib/query/sort";
import type { Dict } from "@/lib/i18n-dict";
import type { MarketCategory } from "@/lib/markets/categories";
import {
  ARCHIVE_LENSES,
  ARCHIVE_SORTS,
  ARCHIVE_NATURAL_DIR,
  ARCHIVE_TOPIC_IDS,
  ARCHIVE_WHEN_IDS,
  PRODUCT_IDS,
  archiveSheetCount,
  buildArchiveHref,
  clearedArchiveState,
  hasActiveArchiveFilters,
  outcomeLensAvailable,
  type ArchiveLens,
  type ArchiveSortId,
  type ArchiveState,
  type ArchiveWhenId,
  type ProductId,
} from "@/lib/results/archive";

export type ArchiveCounts = {
  out: Record<string, number>;
  product: Record<string, number>;
  cat: Record<string, number>;
  when: Record<string, number>;
};

/**
 * ⛔ THE OUTCOME WORD IS THE PRODUCT'S OWN (§L2). This page has already shipped the defect that
 * ignores that — E-169, *"Up win labelled YES in the summary the regulator reads first"* — so the
 * label is resolved through `outcomeWord` against the ACTIVE product, never hardcoded, and the
 * lens is withheld entirely when no single product is chosen.
 */
function lensLabel(t: Dict, lens: ArchiveLens, product: ProductId): string {
  const line = product === "UPDOWN" ? "UPDOWN" : "MARKET";
  switch (lens) {
    case "all": return t.common.all;
    case "yes": return outcomeWord(t, "YES", line);
    case "no": return outcomeWord(t, "NO", line);
    case "void": return t.common.voided;
  }
}

function productLabel(t: Dict, p: ProductId): string {
  // ⛔ From the LEXICON, so each product is named by the vocabulary it actually uses and all
  //    three locales are covered by definition — the sidebar's own rule, kept.
  if (p === "all") return t.market.catAll;
  const line = p === "UPDOWN" ? "UPDOWN" : "MARKET";
  return `${sideWord(t, "YES", line)} / ${sideWord(t, "NO", line)}`;
}

function sortLabel(t: Dict, s: ArchiveSortId): string {
  return s === "volume" ? t.results.sortHighest : t.results.sortNewest;
}

function whenLabel(t: Dict, w: ArchiveWhenId): string {
  switch (w) {
    case "today": return t.common.rangeToday;
    case "yesterday": return t.common.rangeYesterday;
    case "7d": return t.common.range7d;
    case "30d": return t.common.range30d;
    case "all": return t.common.rangeAll;
  }
}

export function ResultsBar({
  state,
  counts,
  resultCount,
  t,
}: {
  state: ArchiveState;
  counts: ArchiveCounts;
  resultCount: number;
  t: Dict;
}) {
  const href = (patch: Partial<ArchiveState>) => buildArchiveHref(state, patch);
  const dir = effectiveDir({ natural: ARCHIVE_NATURAL_DIR }, state);
  const sheetCount = archiveSheetCount(state);
  const resultPhrase =
    resultCount === 1 ? t.market.oneResult : t.market.nResults.replace("{n}", String(resultCount));
  const lenses = outcomeLensAvailable(state) ? ARCHIVE_LENSES : (["all"] as const);

  const clear = (
    <QueryClear
      href={hasActiveArchiveFilters(state) ? buildArchiveHref(clearedArchiveState(state)) : null}
      label={t.common.clearAll}
    />
  );

  const Chip = (p: { href: string; label: string; count?: number; on: boolean; testId: string; glyph?: React.ReactNode }) => (
    <FilterPill {...p} semantics="toggle" replace scroll={false} />
  );

  const productChips = PRODUCT_IDS.map((p) => (
    <Chip
      key={p}
      // ⚠️ Pressing a product resets the category — the sidebar's asymmetry, preserved: the
      //    product filter applies FIRST, so a category chosen inside one product may not exist
      //    inside the other.
      href={href({ product: p, cat: "all" })}
      label={productLabel(t, p)}
      count={counts.product[p]}
      on={state.product === p}
      testId={`product-${p}`}
    />
  ));

  const topicChips = ARCHIVE_TOPIC_IDS.map((c) => {
    const Glyph = c === "all" ? I.layoutGrid : (I[categoryGlyph(c as MarketCategory)] ?? I.layoutGrid);
    return (
      <Chip
        key={c}
        href={href({ cat: c })}
        label={c === "all" ? t.market.catAll : categoryLabel(t, c as MarketCategory)}
        count={counts.cat[c]}
        on={state.cat === c}
        // ⛔ EXACTLY FOUR CHARACTERS BEFORE THE VALUE — `qa:results-board` slices this by index.
        testId={`cat:${c}`}
        glyph={<Glyph s={14} className={"shrink-0 " + (c === state.cat ? "text-brand-300" : "opacity-70")} />}
      />
    );
  });

  const whenChips = ARCHIVE_WHEN_IDS.map((w) => (
    <Chip key={w} href={href({ when: w })} label={whenLabel(t, w)} count={counts.when[w]}
      on={state.when === w} testId={`when:${w}`} />
  ));

  return (
    <div data-filter-rail className={QUERY_BAR_CLASS}>
      <div className={QUERY_BAR_ROW1_CLASS}>
        <QueryStrip ariaLabel={t.results.categoriesAria}>
          {lenses.map((l) => (
            <Chip key={l} href={href({ out: l })} label={lensLabel(t, l, state.product)}
              count={counts.out[l]} on={state.out === l} testId={`out:${l}`} />
          ))}
        </QueryStrip>
        <QueryResultCount count={resultCount} phrase={resultPhrase} />
      </div>

      <div className={QUERY_BAR_ROW2_CLASS}>
        {/* ⭐ THE TWO SORTS GAIN A DIRECTION. They were two pills with no way to reverse either —
            "highest volume" could not be asked the other way round, and "newest resolved" could
            not show a player the oldest attestation on the platform. */}
        <QuerySort
          label={t.common.sort}
          value={sortLabel(t, state.sort)}
          ariaLabel={t.results.sortAria}
          options={ARCHIVE_SORTS.map((s) => ({
            id: s, label: sortLabel(t, s), href: href({ sort: s, dir: null }),
            on: state.sort === s, naturalDir: ARCHIVE_NATURAL_DIR[s],
          }))}
          dir={dir}
          dirHref={href({ dir: dir === "asc" ? "desc" : "asc" })}
          ascLabel={t.market.sortedAsc}
          descLabel={t.market.sortedDesc}
        />

        <FilterSheet
          label={t.market.filtersOpen}
          title={t.results.title}
          ariaLabel={sheetCount > 0 ? t.market.filtersAriaN.replace("{n}", String(sheetCount)) : t.market.filtersOpen}
          closeLabel={t.market.filtersClose}
          applyLabel={t.market.filtersApply.replace("{n}", resultPhrase)}
          count={sheetCount}
          footer={clear}
        >
          <FilterSheetGroup label={t.market.gameKey}>{productChips}</FilterSheetGroup>
          <FilterSheetGroup label={t.common.when}>{whenChips}</FilterSheetGroup>
          <FilterSheetGroup
            label={t.common.topic}
            className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-1.5"
          >
            {topicChips}
          </FilterSheetGroup>
        </FilterSheet>

        <QueryGroupDivider />
        {/* ⛔ ITS OWN aria-label. The sidebar gave this rail and the category rail the SAME name. */}
        <nav aria-label={t.market.gameKey} className="hidden shrink-0 items-center gap-1 lg:flex">
          <FilterGroupKey>{t.market.gameKey}</FilterGroupKey>
          {productChips}
        </nav>

        <QueryGroupDivider />
        <nav aria-label={t.common.when} className="hidden shrink-0 items-center gap-1 lg:flex">
          <FilterGroupKey>{t.common.when}</FilterGroupKey>
          {whenChips}
        </nav>

        <QueryGroupDivider />
        <nav aria-label={t.results.categoriesAria} className="hidden shrink-0 items-center gap-1 lg:flex">
          <FilterGroupKey>{t.common.topic}</FilterGroupKey>
          {topicChips}
        </nav>

        <span className="hidden lg:contents">{clear}</span>
      </div>
    </div>
  );
}
