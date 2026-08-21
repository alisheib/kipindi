import { Suspense } from "react";
import Link from "next/link";
import { I, categoryGlyph } from "@/components/ui/glyphs";
import { MarketCard } from "@/components/markets/market-card";
import { Chip } from "@/components/ui/chip";
import { FilterPill, FilterGroupKey } from "@/components/ui/filter-pill";
import { TippingBar } from "@/components/brand";
import { listMarkets, impliedYesPct, MARKET_CATEGORIES, listTerminalMarkets } from "@/lib/server/market-service";
import { categoryOptions } from "@/lib/markets/category-label";
import { getCardCharts } from "@/lib/server/market-history";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination, PLAYER_PER_PAGE } from "@/components/ui/pagination";
import { SearchBox } from "@/components/ui/search-box";
import { parseQuery, matchesQuery, fieldNames, MARKET_SEARCH } from "@/lib/search";
import { NotableCarousel } from "./notable-carousel";
import { RefreshPoller } from "@/components/ui/refresh-poller";
import { formatTzsCompact } from "@/lib/utils";
import { pickLocalized } from "@/lib/localized";
import { getServerT } from "@/lib/i18n-server";
import { outcomeWord, sideWord, type LabelProductLine } from "@/lib/side-label";

export async function generateMetadata() {
  const { t } = await getServerT();
  const title = t.results.title;
  const og = `/api/og/page?title=${encodeURIComponent(title)}`;
  return {
    title,
    openGraph: { title, images: [{ url: og, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, images: [og] },
  };
}
export const dynamic = "force-dynamic";

const PER_PAGE = PLAYER_PER_PAGE;

type SortField = "resolved" | "volume";
/** ⛔ "all" is a VIEW state, not a product. It never reaches the lexicon — every side word is
 *  resolved per ROW, from that row's own `productLine`. */
type ProductFilter = LabelProductLine | "all";

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; sort?: string; q?: string; page?: string; product?: string }>;
}) {
  const { t } = await getServerT();
  const sp = await searchParams;
  const activeCat = sp.cat ?? "all";
  // #4 — the visible split between the two products.
  //
  // 🔴 THE DEFAULT IS LONG-FORM, AND THAT IS A MEASUREMENT, NOT A PREFERENCE. Settled rounds on
  // production 2026-08-19: **UPDOWN 11,112 · MARKET 65** — Up & Down is 99.4% of the archive. A
  // newest-first read of BOTH lines buries all 65 long-form results under 11,112 price rounds on
  // page 1. `product-line.test.mts` carried an entry saying exactly this ("Up & Down rounds would
  // flood it") and it was right.
  //
  // ⭐ So both of Jay's requirements hold together: the page READS both lines (#10) and the split
  // is visible with real counts (#4), while the default view stays legible. The Up & Down pill
  // shows 11,112 — the rounds are present and one tap away, not hidden.
  //
  // ⚠️ "all" remains reachable by URL for a regulator read that wants the undivided archive.
  const activeProduct: ProductFilter =
    sp.product === "UPDOWN" || sp.product === "all" ? sp.product : "MARKET";
  const activeSort: SortField = sp.sort === "volume" ? "volume" : "resolved";
  // Shared grammar (src/lib/search) — same rule as /markets and every admin list.
  const parsed = parseQuery(sp.q, { fields: fieldNames(MARKET_SEARCH) });
  const searching = parsed.mode !== "empty";
  const qRaw = parsed.raw;
  const pageNum = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  return (
    <main className="mx-auto max-w-[1280px] px-3 lg:px-6 py-6">
      <h1 className="sr-only">{t.results.title}</h1>
      {/* Refresh every 60s — new resolutions should appear without F5 */}
      <RefreshPoller intervalMs={60_000} />

      <Suspense fallback={<ResultsSkeleton />}>
        <ResultsContent
          activeCat={activeCat}
          activeProduct={activeProduct}
          activeSort={activeSort}
          qRaw={qRaw}
          searching={searching}
          pageNum={pageNum}
        />
      </Suspense>
    </main>
  );
}

async function ResultsContent({
  activeCat,
  activeProduct,
  activeSort,
  qRaw,
  searching,
  pageNum,
}: {
  activeCat: string;
  activeProduct: ProductFilter;
  activeSort: SortField;
  qRaw: string;
  searching: boolean;
  pageNum: number;
}) {
  const { t, locale } = await getServerT();

  // ⛔ DERIVED, NEVER RE-DECLARED. This used to be a hand-written eight-item list; the canonical
  // set is seven (politics is licence-excluded) and lives in MARKET_CATEGORIES. A surface that
  // spells its own list can silently gain or lose a category — see `lib/markets/category-label.ts`.
  const CATEGORIES = categoryOptions(t, MARKET_CATEGORIES);

  const SORT_OPTIONS: Array<{ id: SortField; label: string }> = [
    { id: "resolved", label: t.results.sortNewest },
    { id: "volume",   label: t.results.sortHighest },
  ];

  // Re-parse from the `qRaw` prop — this component receives the raw text, not the
  // parse. parseQuery is pure and cheap, so re-deriving it here is simpler and
  // safer than threading a parsed object through the props.
  const parsed = parseQuery(qRaw, { fields: fieldNames(MARKET_SEARCH) });
  const matches = (m: { titleEn: string; titleSw: string; titleZh?: string | null; category: string; resolutionCriterion?: string }) =>
    matchesQuery(parsed, m as unknown as Record<string, string | null | undefined>, MARKET_SEARCH);

  // 🔴 THE CATEGORY USED TO BE SILENTLY DROPPED DURING A SEARCH — measured on production
  // 2026-08-13: `/results?q=bitcoin` returned the SAME four cards under cat=crypto, cat=sports and
  // cat=weather, while the rail still painted the chosen category as selected. A control that says
  // it is applied and is not is the 2026-08-10 failure shape, and it is exactly what the round-2
  // count contract forbids (PLAN-OF-RECORD §8.3). Search and category now compose.
  //
  // ⛔ ONE read of the archive, then filter in JS — the same discipline as /markets. It is what
  // lets every category name the set it would actually show, and it is not a new scale ceiling:
  // the unfiltered read is what already happened on the default `cat=all` view.
  // B-1 — no swallow: the results archive IS this page; a failed read must throw
  // to results/error.tsx, never render "no results yet" over a live archive.
  // ⛔ "ALL" — BOTH PRODUCT LINES. #10: settled Up & Down rounds must reach the results page.
  // `market-service.ts` documents this exact value for this exact purpose: *"Pass `"ALL"` for
  // money/regulator reads."* This page is the regulator read.
  //
  // ⚠️ THE MOMENT THIS LINE CHANGED, EVERY SIDE WORD ON THIS PAGE BECAME A DECISION. Three sites
  // below used to hard-write `"MARKET"` and were accidentally correct only because this read
  // excluded the other product. See `E-169`.
  //
  // ⭐ ONE MEMOISED READ (audit F-08). These were two uncached `productLine: "ALL"` queries on
  // a PUBLIC page: measured on production, a Seq Scan over 13,013 rows / 2,233 shared buffers
  // / 11 ms EACH RENDER, growing ~360 rows a day because every Up & Down round is a market.
  // Anyone could hold this page open or curl it in a loop.
  // The read is still COMPLETE — it has to be, per the E-169 note above: the search, the
  // product filter and every category count below are folded from the whole set, so a
  // windowed read would quietly make the counts wrong. It just stops being repeated.
  const terminal = await listTerminalMarkets("ALL");
  /** Everything the SEARCH admits, across every category — the set the counts are folded from. */
  const searched = terminal.filter(matches);
  /** The product filter applies BEFORE the category one, so every category count below is a
   *  count within the chosen product — pressing a category never changes the product. */
  const inProduct = activeProduct === "all" ? searched : searched.filter((m) => m.productLine === activeProduct);
  const all = activeCat === "all" ? inProduct : inProduct.filter((m) => m.category === activeCat);
  /** Cross-filtered the other way: what each product pill would deliver under this search. */
  const productCounts = {
    all: searched.length,
    MARKET: searched.filter((m) => m.productLine === "MARKET").length,
    UPDOWN: searched.filter((m) => m.productLine === "UPDOWN").length,
  } as const;
  /** Cross-filtered: each number is what pressing that category would deliver under this search. */
  const catCounts: Record<string, number> = {
    all: inProduct.length,
    ...Object.fromEntries(MARKET_CATEGORIES.map((c) => [c, inProduct.filter((m) => m.category === c).length])),
  };

  // Sort
  if (activeSort === "volume") {
    all.sort((a, b) => (b.yesPool + b.noPool) - (a.yesPool + a.noPool));
  } else {
    // Newest resolved first — use resolutionStage2At (final confirmation), fallback to updatedAt
    all.sort((a, b) => {
      const aDate = a.resolutionStage2At ?? a.updatedAt;
      const bDate = b.resolutionStage2At ?? b.updatedAt;
      return bDate.localeCompare(aDate);
    });
  }

  // Paginate
  const totalCount = all.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PER_PAGE));
  const safePage = Math.min(pageNum, totalPages);
  const paged = all.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  // KPIs
  const totalVolume = all.reduce((s, m) => s + m.yesPool + m.noPool, 0);
  // 🔴 THE THIRD SIDE-WORD SITE ON THIS PAGE, AND THE ONE NOBODY NAMED (`E-169`). These two
  // numbers used to be rendered through the hard-wired `t.results.yesOutcome` / `noOutcome`,
  // so the moment this page read BOTH product lines the headline donut folded every **Up** win
  // into a figure labelled *"YES"* — in the summary the regulator reads first.
  //
  // ⛔ There is no honest single word for a mixed set, so this is per-product arithmetic and the
  // words come from the lexicon. The donut keeps totalling both because a donut is a SHAPE, not
  // a word — it says "this many settled one way" without naming the way.
  const yesWins = all.filter((m) => m.resolvedOutcome === "YES").length;
  const noWins = all.filter((m) => m.resolvedOutcome === "NO").length;
  const voidCount = all.filter((m) => m.resolvedOutcome === "VOID" || m.status === "VOIDED").length;
  /** Wins per product per side — the only shape that can be labelled truthfully. */
  const winsIn = (line: LabelProductLine, side: "YES" | "NO") =>
    all.filter((m) => m.productLine === line && m.resolvedOutcome === side).length;
  /** Which products are actually ON SCREEN. A product with nothing to show gets no row (A-5). */
  const linesShown: LabelProductLine[] = (["MARKET", "UPDOWN"] as const).filter(
    (l) => winsIn(l, "YES") + winsIn(l, "NO") > 0,
  );

  // C2b / A19 — "notable results" featured above the grid = the highest-volume
  // settled markets. Only on page 1 with no active search. On a healthy result set
  // we spotlight the top 3 in a small swipeable carousel; with fewer results it
  // stays a single card (unchanged behaviour). Featured ids are excluded from the
  // page-1 grid so nothing is shown twice.
  const showFeatured = !searching && safePage === 1 && all.length > 0;
  const notableList = showFeatured
    ? [...all].sort((a, b) => (b.yesPool + b.noPool) - (a.yesPool + a.noPool)).slice(0, all.length >= 8 ? 3 : 1)
    : [];
  const notableIds = new Set(notableList.map((m) => m.id));

  // Build chart data for visible page only
  // One query for the whole board — never map getCardChart across a list.
  // B-1 — deliberate degrade: sparks are garnish; a card without one renders no
  // chart (A-5), which is distinguishable from a real flat series.
  const cardCharts = await getCardCharts(paged.map((m) => m.id)).catch(() => new Map());

  // Helpers
  const buildHref = (next: { cat?: string; sort?: string; page?: number; product?: ProductFilter }) => {
    const params = new URLSearchParams();
    const c = next.cat ?? activeCat;
    const s = next.sort ?? activeSort;
    const p = next.page ?? safePage;
    const pr = next.product ?? activeProduct;
    if (c !== "all") params.set("cat", c);
    if (pr !== "all") params.set("product", pr);
    if (s !== "resolved") params.set("sort", s);
    if (qRaw) params.set("q", qRaw);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/results?${qs}` : "/results";
  };

  // Base href for the shared pager (current filters minus the page param).
  const resultsBaseHref = (() => {
    const params = new URLSearchParams();
    if (activeCat !== "all") params.set("cat", activeCat);
    if (activeProduct !== "all") params.set("product", activeProduct);
    if (activeSort !== "resolved") params.set("sort", activeSort);
    if (qRaw) params.set("q", qRaw);
    const qs = params.toString();
    return qs ? `/results?${qs}` : "/results";
  })();

  return (
    <>
      {/* Header — lean (parity with /markets). C2b adds the aggregate YES/NO
          donut as data, not a masthead. */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-gold-300"><I.resolved s={18} /></span>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-text-subtle">{t.results.title}</p>
        </div>
        <div className="flex items-center gap-3">
          {totalCount > 0 && (
            <div className="flex items-center gap-2">
              <OutcomeDonut yes={yesWins} no={noWins} voided={voidCount} size={38} />
              {/* ⛔ ONE ROW PER PRODUCT, each in its own vocabulary, both words from the lexicon.
                  Never `t.results.yesOutcome` over a mixed set — see `winsIn` above. Two short
                  rows also keep this block narrow at 393px, where a single combined row would
                  have run past the viewport in SW and ZH. */}
              <div className="flex flex-col leading-tight font-mono text-[10px] font-semibold tabular-nums">
                {linesShown.map((line) => (
                  <span key={line} className="whitespace-nowrap">
                    <span className="text-yes-300">{sideWord(t, "YES", line)} {winsIn(line, "YES")}</span>
                    <span className="text-text-subtle"> · </span>
                    <span className="text-no-300">{sideWord(t, "NO", line)} {winsIn(line, "NO")}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
          {/* `data-result-count` is the page's own stated total for the ACTIVE filters — the same
              contract /markets carries, so a driver can check the rail's promise against the number
              the page itself publishes instead of trying to reverse-engineer it from the render.
              It cannot be reconstructed from the DOM: page 1 lifts up to three markets into the
              notable carousel, which renders only the current slide, so two of them are not in the
              document at all. */}
          <p data-result-count={totalCount} className="hidden sm:block font-mono text-[10.5px] text-text-subtle tabular-nums whitespace-nowrap">
            {totalCount} {t.results.resolved} · {formatTzsCompact(totalVolume)} {t.common.settled}
          </p>
        </div>
      </div>

      {/* Search — sticky below app bar, same as /markets */}
      <div className="sticky top-[56px] z-20 bg-bg-base py-2.5">
        <Suspense>
          <SearchBox
            placeholder={t.common.searchResults}
            ariaLabel={t.common.searchResults}
            helpFields={fieldNames(MARKET_SEARCH)}
          />
        </Suspense>
      </div>

      {/* Filters + Grid */}
      <div className="mt-1 flex flex-col gap-5 lg:flex-row lg:gap-6">
        {/* Sidebar filters — sticky on desktop, horizontal scroll on mobile */}
        {/* `data-filter-rail` makes this addressable to the visual sweep. Without it the sweep
            looked only for `.kp-discovery-bar`, found nothing on /results and reported
            "0 controls, minTap -1" — a measurement of nothing, printed beside real ones. */}
        <aside data-filter-rail className="lg:w-[208px] lg:shrink-0 lg:sticky lg:top-[122px] lg:self-start lg:max-h-[calc(100dvh-134px)] lg:overflow-y-auto lg:overflow-x-hidden kp-thin-scroll lg:pb-3">
          <div className="space-y-2.5 lg:space-y-4">
            {/* Sort */}
            {/* ⚠️ NO `-mx-1 px-1 overflow-x-auto` HERE. It was vestigial and it cost a real
                overflow: the rail wraps (`flex-wrap`), so a horizontal scroller never engages and
                the 4px bleed on each side simply pushed the wrapper 4px past its own container at
                360 and 768 in all three languages. Same shape as the `-mx-3` bleed removed from
                the /markets strips. */}
            {/* #4 · THE PRODUCT SPLIT. ⛔ The kit's `FilterPill`, the same control the sort and
                category groups use — 8 rails already speak this language and hand-rolling a
                ninth is a documented refusal (DESIGN_AUTHORITY §F). The labels are built from
                the LEXICON rather than a new dictionary key, so each product is named by the
                vocabulary it actually uses and all three locales are covered by definition. */}
            <nav aria-label={t.results.categoriesAria} className="flex flex-wrap items-center gap-1.5 lg:flex-col lg:flex-nowrap lg:items-stretch lg:gap-1">
              <FilterGroupKey className="pr-1 lg:pr-0 lg:mb-1">{t.market.gameKey}</FilterGroupKey>
              {([
                { id: "all" as const, label: t.market.catAll },
                { id: "MARKET" as const, label: `${sideWord(t, "YES", "MARKET")} / ${sideWord(t, "NO", "MARKET")}` },
                { id: "UPDOWN" as const, label: `${sideWord(t, "YES", "UPDOWN")} / ${sideWord(t, "NO", "UPDOWN")}` },
              ]).map((o) => (
                <FilterPill
                  key={o.id}
                  replace
                  scroll={false}
                  href={buildHref({ product: o.id, cat: "all", page: 1 })}
                  label={o.label}
                  count={productCounts[o.id]}
                  on={o.id === activeProduct}
                  testId={`product-${o.id}`}
                />
              ))}
            </nav>
            <nav aria-label={t.results.sortAria} className="flex flex-wrap items-center gap-1.5 lg:flex-col lg:flex-nowrap lg:items-stretch lg:gap-1">
              <FilterGroupKey className="pr-1 lg:pr-0 lg:mb-1">{t.common.sort}</FilterGroupKey>
              {SORT_OPTIONS.map((o) => (
                <FilterPill
                  key={o.id}
                  /* ⛔ `replace`, not a push — a filter is not a navigation (kit README §3, and
                     every /markets control does this). Without it, pressing five filters left
                     five history entries and Back walked the player backwards through their own
                     filter states instead of leaving the page. */
                  replace
                  scroll={false}
                  href={buildHref({ sort: o.id, page: 1 })}
                  label={o.label}
                  on={o.id === activeSort}
                  /* A rail where exactly one option is in force: `aria-current`, not
                     `aria-pressed`. It had NEITHER before batch 5 — this rail announced no
                     state at all to a screen reader. */
                  semantics="tab"
                  /* The desktop sidebar makes each pill a full-width row; the mobile rail wraps
                     them as pills. Both stay the same control — only the box it fills changes. */
                  className="lg:w-full lg:justify-start"
                />
              ))}
            </nav>

            {/* Categories */}
            <nav aria-label={t.results.categoriesAria} className="flex flex-wrap items-center gap-1.5 lg:flex-col lg:flex-nowrap lg:items-stretch lg:gap-1">
              <FilterGroupKey className="pr-1 lg:pr-0 lg:mb-1">{t.common.topic}</FilterGroupKey>
              {CATEGORIES.map((c) => {
                const active = c.id === activeCat;
                const Glyph = c.id === "all" ? I.layoutGrid : I[categoryGlyph(c.id)];
                return (
                  <FilterPill
                    key={c.id}
                    replace
                    scroll={false}
                    href={buildHref({ cat: c.id, page: 1 })}
                    /* Machine-readable so a driver can read the promise and press exactly this
                       control — the same contract `/markets` chips carry. ⛔ `qa:results-board`
                       slices this by INDEX (`data-chip`.slice(4)), so the `cat:` prefix is not
                       decoration; and every count names the set pressing it would show —
                       cross-filtered by the active search, so it can never promise 22 and
                       deliver 4. */
                    testId={`cat:${c.id}`}
                    count={catCounts[c.id] ?? 0}
                    label={c.label}
                    on={active}
                    semantics="tab"
                    glyph={<Glyph s={14} className={"shrink-0 " + (active ? "text-brand-300" : "opacity-70")} />}
                    className="lg:w-full lg:justify-start"
                    countClassName="lg:ml-auto lg:pl-1.5"
                  />
                );
              })}
            </nav>

            {/* Outcome breakdown moved to the header donut (C2b) — single source. */}
          </div>
        </aside>

        {/* Grid */}
        <div className="min-w-0 flex-1">
          {searching && (
            <p aria-live="polite" className="mb-3 font-mono text-[11px] text-text-subtle tabular-nums">
              {totalCount === 0
                ? `${t.results.noResultsMatch} "${qRaw}"`
                : `${totalCount} ${totalCount === 1 ? t.results.resultMatch : t.results.resultsMatch} "${qRaw}"`}
            </p>
          )}

          {/* Per-cause exit, and it carries a REAL count. Now that a category genuinely narrows a
              search, a search can come back empty because of the category rather than the words —
              a different cause, so it gets a different way out, and it is only offered when it
              actually leads somewhere non-empty. */}
          {/* ⚠️ It used to be painted as a SELECTED pill — outlined, filled, an inline
              `background` — which said "this is the category you are on" about the one control
              on the page that is the way OFF it. It is now the quiet pill every rail uses for a
              destination, the same treatment `/markets` gives its own Clear-all, and it still
              carries the real count so the exit names where it leads.
              ⛔ It must stay an `<a>` whose href OMITS `cat` — `qa:results-board` finds this
              exit by looking for a `/results` link with a `q=` and no `cat=`. */}
          {totalCount === 0 && activeCat !== "all" && catCounts.all > 0 && (
            <FilterPill
              scroll={false}
              href={buildHref({ cat: "all", page: 1 })}
              label={t.market.catAll}
              count={catCounts.all}
              on={false}
              glyph={<I.layoutGrid s={14} className="shrink-0 opacity-70" />}
              className="mb-3"
            />
          )}

          {paged.length > 0 ? (
            <>
              {notableList.length > 0 && (
                <NotableCarousel
                  label={t.results.notableResult}
                  prevLabel={t.common.back}
                  nextLabel={t.common.next}
                  slides={notableList.map((nm) => (
                    <FeaturedResult key={nm.id} m={nm} t={t} locale={locale} />
                  ))}
                />
              )}
              <section className="market-grid">
                {paged.filter((m) => !notableIds.has(m.id)).map((m) => (
                  <MarketCard
                    productLine={m.productLine}
                    key={m.id}
                    id={m.id}
                    titleEn={m.titleEn}
                    titleSw={m.titleSw}
                    titleZh={m.titleZh}
                    category={m.category}
                    yesPct={impliedYesPct(m)}
                    volume={m.yesPool + m.noPool}
                    predictors={m.predictorCount}
                    // §L3 — was `${t.market.resolvedOutcome} ${m.resolvedOutcome}`, i.e. a
                    // translated label wrapped around the raw enum on the public results board.
                    timeLeft={m.resolvedOutcome === "VOID" ? t.common.voided : `${t.market.resolvedOutcome} ${outcomeWord(t, m.resolvedOutcome ?? "VOID", m.productLine)}`}
                    status={m.status === "VOIDED" ? "VOIDED" : "RESOLVED"}
                    resolvedOutcome={m.resolvedOutcome}
                    sourceUrl={m.sourceUrl}
                    spark={(cardCharts.get(m.id) ?? { spark: [] }).spark}
                  />
                ))}
              </section>

              {/* Pagination — shared platform pager */}
              {totalPages > 1 && (
                <div className="mt-6 rounded-lg border border-border bg-bg-elevated/40 overflow-hidden">
                  <Pagination total={totalCount} page={safePage} perPage={PER_PAGE} baseHref={resultsBaseHref} ofLabel={t.common.of} prevLabel={t.common.previousPage} nextLabel={t.common.nextPage} />
                </div>
              )}
            </>
          ) : (
            <EmptyState
              kind="markets"
              title={searching ? `${t.results.noResultsMatch} "${qRaw}"` : t.results.noResolvedYet}
              body={searching
                ? t.results.tryDifferentKeywords
                : t.results.noResolvedBody
              }
              action={
                searching ? (
                  <Link href="/results" className="btn btn-ghost btn-sm">{t.market.clearSearchLabel}</Link>
                ) : (
                  <Link href="/markets" className="btn btn-primary btn-sm">{t.results.browseLive}</Link>
                )
              }
            />
          )}
        </div>
      </div>
    </>
  );
}

/** C2b — aggregate YES/NO outcome donut (green YES · rose NO · neutral void).
 *  Pure SVG, presentational. Segments drawn clockwise from 12 o'clock. */
function OutcomeDonut({ yes, no, voided, size = 38 }: { yes: number; no: number; voided: number; size?: number }) {
  const total = yes + no + voided || 1;
  const sw = 5;
  const r = size / 2 - sw / 2 - 0.5;
  const c = 2 * Math.PI * r;
  const seg = (n: number) => (n / total) * c;
  const yesLen = seg(yes), noLen = seg(no), voidLen = seg(voided);
  const cx = size / 2;
  const ring = (len: number, offset: number, stroke: string) => (
    <circle cx={cx} cy={cx} r={r} fill="none" stroke={stroke} strokeWidth={sw} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={offset} />
  );
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden style={{ transform: "rotate(-90deg)" }}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--bg-overlay)" strokeWidth={sw} />
      {voided > 0 && ring(voidLen, -(yesLen + noLen), "var(--text-subtle)")}
      {ring(noLen, -yesLen, "var(--no-400)")}
      {ring(yesLen, 0, "var(--yes-400)")}
    </svg>
  );
}

/** C2b — one "notable result" (highest-volume settled market) spotlighted above
 *  the grid, carrying the resolved gilt seal chip. */
function FeaturedResult({ m, t, locale }: { m: Awaited<ReturnType<typeof listMarkets>>[number]; t: Awaited<ReturnType<typeof getServerT>>["t"]; locale: Awaited<ReturnType<typeof getServerT>>["locale"] }) {
  const isVoid = m.resolvedOutcome === "VOID" || m.status === "VOIDED";
  const yesPct = impliedYesPct(m);
  return (
    <Link
      href={`/markets/${m.id}` as never}
      className="group relative block overflow-hidden rounded-xl border border-gold-700/40 bg-bg-elevated p-5 lg:p-6"
      style={{ background: "radial-gradient(120% 140% at 100% 0%, oklch(40% 0.10 80 / 0.10), transparent 55%), var(--bg-elevated)" }}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Chip variant="cat" size="sm">{m.category}</Chip>
        {/* §L3 — the featured card is a SECOND code path from the grid above, and it kept
            the raw enum: "Imetatuliwa · NO" / "已结算 · NO" on production. */}
        {isVoid
          ? <Chip variant="pending" size="sm">{t.common.voided}</Chip>
          : <Chip variant="resolved" size="sm">{t.market.resolvedOutcome} · {outcomeWord(t, m.resolvedOutcome ?? "VOID", m.productLine)}</Chip>}
        <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-gold-300">
          <I.crown s={13} /> {t.results.notableResult}
        </span>
      </div>
      <h2 className="mb-4 max-w-[70ch] font-display text-[18px] lg:text-[22px] font-semibold leading-tight text-text group-hover:text-gold-100">
        {pickLocalized(locale, m.titleEn, m.titleSw, m.titleZh)}
      </h2>
      <TippingBar yesPct={yesPct} height={28} showLabels resolved={!isVoid} recastOnHover={false}
        probabilityLabel={t.market.probBarAria.replace("{side}", sideWord(t, "YES", m.productLine))}
        labels={{ yes: sideWord(t, "YES", m.productLine), no: sideWord(t, "NO", m.productLine), tipping: t.market.tipping, leansYes: t.market.leansYes, leansNo: t.market.leansNo }} />
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] tabular-nums text-text-muted">
        <span>{formatTzsCompact(m.yesPool + m.noPool)} {t.common.settled}</span>
        <span className="flex items-center gap-1"><I.users s={11} /> {m.predictorCount} {t.market.predictors}</span>
      </div>
    </Link>
  );
}

/** Shimmer skeleton shown while the async content loads (same pattern as
 *  /markets GridSkeleton — card-sized placeholders with shimmer tracks). */
function ResultsSkeleton() {
  return (
    <>
      {/* Header skeleton */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-5 w-5 rounded bg-bg-overlay kp-shimmer-track" />
          <div className="h-4 w-32 rounded bg-bg-overlay kp-shimmer-track" />
        </div>
        <div className="h-3.5 w-36 rounded bg-bg-overlay kp-shimmer-track" />
      </div>

      {/* Search skeleton */}
      <div className="mb-4 h-[44px] rounded-md bg-bg-overlay kp-shimmer-track" style={{ maxWidth: 460 }} />

      {/* Filters + grid */}
      <div className="mt-1 flex flex-col gap-5 lg:flex-row lg:gap-6">
        {/* Sidebar skeleton */}
        <aside className="lg:w-[208px] lg:shrink-0 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            /* ⚠️ LITERAL, not `h-8` — spacing is overridden (tailwind.config.ts:200-215) so
               `h-8` drew 48px for sidebar filter pills that render at FilterPill's 44px. */
            <div key={i} className="h-[44px] rounded-md bg-bg-overlay kp-shimmer-track" />
          ))}
        </aside>

        {/* Grid skeleton */}
        <div className="min-w-0 flex-1">
          <div className="market-grid" aria-hidden>
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-md border border-border bg-bg-elevated overflow-hidden kp-shimmer-track"
                style={{ height: 220 }}
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    {/* ⚠️ WIDTH IS A LITERAL, not `w-12` (128px on the overridden scale). */}
                    <div className="h-5 w-[64px] rounded-pill bg-bg-overlay" />
                    <div className="h-5 w-16 rounded-pill bg-bg-overlay" />
                  </div>
                  <div className="h-4 w-3/4 rounded bg-bg-overlay" />
                  <div className="h-4 w-1/2 rounded bg-bg-overlay" />
                  <div className="h-[7px] w-full rounded-pill bg-bg-overlay mt-4" />
                  <div className="flex gap-2 mt-3">
                    {/* ⚠️ TOKEN, not `h-9` (64px on the overridden scale) — the card's YES/NO
                        buttons are pinned to `--tap-min` in globals.css
                        (`.mcardp-actions .btn`). Copy of the markets/page.tsx skeleton; the
                        two must stay in step. */}
                    <div className="h-[var(--tap-min)] flex-1 rounded-md bg-bg-overlay" />
                    <div className="h-[var(--tap-min)] flex-1 rounded-md bg-bg-overlay" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
