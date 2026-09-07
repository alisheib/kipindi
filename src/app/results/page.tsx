import { Suspense } from "react";
import Link from "next/link";
import { I, categoryGlyph } from "@/components/ui/glyphs";
import { MarketCard } from "@/components/markets/market-card";
import { Chip } from "@/components/ui/chip";
import { FilterPill, FilterGroupKey } from "@/components/ui/filter-pill";
import { TippingBar } from "@/components/brand";
import { listMarkets, impliedYesPct, MARKET_CATEGORIES, listTerminalMarkets } from "@/lib/server/market-service";
// ⛔ THE ONE COLD-START RULE (§C2) — see the `yesPct` note in FeaturedResult.
import { pricedYesPct } from "@/lib/markets/discovery";
import { categoryOptions } from "@/lib/markets/category-label";
import { getCardCharts } from "@/lib/server/market-history";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination, PLAYER_PER_PAGE } from "@/components/ui/pagination";
import { SearchBox } from "@/components/ui/search-box";
import { QUERY_BAR_CLASS, QUERY_BAR_ROW1_CLASS, QUERY_BAR_ROW2_CLASS } from "@/components/ui/query-bar";
import { ResultsBar, type ArchiveCounts } from "./results-bar";
import {
  archiveCounts,
  archiveEmptyCause,
  archiveExits,
  buildArchiveHref,
  filterArchive,
  parseArchiveParams,
  sortArchive,
  type ArchiveRow,
  type ArchiveState,
} from "@/lib/results/archive";
import { parseQuery, matchesQuery, fieldNames, MARKET_SEARCH } from "@/lib/search";
import { NotableCarousel } from "./notable-carousel";
import { RefreshPoller } from "@/components/ui/refresh-poller";
import { formatTzsCompact } from "@/lib/utils";
import { Ring } from "@/components/charts/ring";
import { pickLocalized } from "@/lib/localized";
import { getServerT } from "@/lib/i18n-server";
import { outcomeWord, sideWord, type LabelProductLine } from "@/lib/side-label";
import { PageContainer } from "@/components/layout/page-container";

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
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { t } = await getServerT();
  const sp = await searchParams;
  /**
   * ⭐ ONE PARSE, ONE STATE OBJECT, ONE BUILDER. The page carried five hand-rolled parses and TWO
   * near-duplicate href builders (`buildHref` and `resultsBaseHref`, differing only in whether
   * they wrote `page`) — two definitions of one URL grammar, the shape `discovery.ts`'s header
   * records four of on the board it replaced.
   *
   * ⚠️ `?cat=` IS NARROWED NOW, WHICH IT WAS NOT: `sp.cat ?? "all"` let `?cat=lol` through, so a
   * single typo filtered everything out while painting no pill as selected.
   *
   * 🔴 THE PRODUCT DEFAULT IS UNCHANGED AND IS A MEASUREMENT, NOT A PREFERENCE. Settled rows on
   * production 2026-08-19: **UPDOWN 11,112 · MARKET 65** — a newest-first read of both lines
   * buries all 65 long-form results under 11,112 price rounds on page one. `?product=all` stays
   * reachable by URL for a regulator read that wants the undivided archive.
   */
  const state = parseArchiveParams(sp);
  const parsed = parseQuery(state.q, { fields: fieldNames(MARKET_SEARCH) });
  const searching = parsed.mode !== "empty";
  const pageNum = Math.max(1, parseInt(String(sp.page ?? "1"), 10) || 1);

  return (
    <PageContainer tier="board">
      <h1 className="sr-only">{t.results.title}</h1>
      {/* Refresh every 60s — new resolutions should appear without F5 */}
      <RefreshPoller intervalMs={60_000} />

      {/* 🔴 DG-P-04 · §S1 — THE RHYTHM IS DECLARED ONCE, HERE, AND NOT ON THE CONTAINER.
          This page had NO rhythm at all, so its three bands each typed their own: `mb-4` (20) on
          the header, the sticky band's `py-2.5`, `mt-1` (4) on the grid. Measured on production
          2026-08-29 (`npm run qa:dg-rhythm --VERBOSE`) the content rendered **32 above the
          search and 16 below it** while `ResultsSkeleton`, the thing that stands in for it for
          the first paint, rendered **20 and 24** — so the page moved twice on every load, and
          neither figure was one of the four gaps §Spacing allows a long page.
          ⛔ WHY THE WRAPPER AND NOT `<PageContainer className="space-y-5">`: `space-y-*` is
          `> :not([hidden]) ~ :not([hidden]) { margin-top }`, a SIBLING selector that counts DOM
          order and not layout, and the container's first child is an out-of-flow
          `<h1 class="sr-only">` (`position:absolute`). On the container the rung would have
          been handed to the header for nothing — the exact defect this row fixed on `/live`
          (24px) and `/proposals` (32px). `<Suspense>` renders no DOM node, so this div's real
          children are the three bands of whichever branch is showing. */}
      <div className="space-y-5">
        <Suspense fallback={<ResultsSkeleton />}>
          <ResultsContent state={state} searching={searching} pageNum={pageNum} />
        </Suspense>
      </div>
    </PageContainer>
  );
}

async function ResultsContent({
  state,
  searching,
  pageNum,
}: {
  state: ArchiveState;
  searching: boolean;
  pageNum: number;
}) {
  const { t, locale } = await getServerT();
  const qRaw = state.q;

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

  /**
   * The rows the contract reasons about.
   *
   * ⚠️ `resolvedAtMs` is `resolutionStage2At ?? updatedAt` — the final-confirmation clock, which
   * is the one the table's own column shows. The old sort compared those two ISO strings with
   * `localeCompare`; comparing epoch numbers is the same order and lets the shared comparator
   * partition a row that has neither.
   */
  const nowMs = Date.now();
  const archiveRows: ArchiveRow[] = terminal.map((m) => ({
    id: m.id,
    category: m.category,
    productLine: m.productLine === "UPDOWN" ? "UPDOWN" : "MARKET",
    // ⚠️ A VOIDED market whose outcome column was never stamped still resolved one way: void.
    outcome: (m.resolvedOutcome ?? (m.status === "VOIDED" ? "VOID" : null)) as ArchiveRow["outcome"],
    volume: m.yesPool + m.noPool,
    resolvedAtMs: Date.parse(m.resolutionStage2At ?? m.updatedAt) || 0,
    title: pickLocalized(locale, m.titleEn, m.titleSw, m.titleZh),
    titleEn: m.titleEn,
    titleSw: m.titleSw ?? "",
    titleZh: m.titleZh ?? "",
    criterion: m.resolutionCriterion ?? "",
  }));
  const byId = new Map(terminal.map((m) => [m.id, m]));

  const matchesRow = (row: ArchiveRow) => {
    const m = byId.get(row.id);
    return m ? matches(m) : false;
  };

  /**
   * ⭐ EVERY COUNT CROSS-FILTERED, BY THE SHARED RULE. The page folded four of these by hand —
   * `productCounts` from `searched`, `catCounts` from `inProduct` — and got them right; what it
   * could not do by hand is stay right as axes are added. `countsFor` patches the state and
   * re-runs EVERY axis, so a new filter is accounted for in every existing count the day it
   * lands. ⚠️ The product-before-category ordering is preserved in `archiveAxes`.
   */
  const counts = archiveCounts(archiveRows, state, nowMs, matchesRow) as ArchiveCounts;
  const matchedRows = sortArchive(filterArchive(archiveRows, state, nowMs, matchesRow), state);
  // The full market rows, in the order the bar chose — the render below reads market fields.
  const all = matchedRows.map((r) => byId.get(r.id)!).filter(Boolean);

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
  /**
   * ⛔ TWO BUILDERS BECAME ONE. `buildHref` and `resultsBaseHref` were near-duplicates of one URL
   * grammar, differing only in whether they wrote `page` — and `buildHref` defaulted `page` to
   * the CURRENT page, so every rail pill had to remember `page: 1` or a filter press would keep
   * a page number that may not exist in the new set. `buildArchiveHref` drops the page on any
   * filter change by construction, so forgetting is no longer possible.
   */
  const buildHref = (patch: Partial<ArchiveState>) => buildArchiveHref(state, patch);
  const resultsBaseHref = buildArchiveHref(state);

  /**
   * ⛔ FIVE CAUSES AND A REAL EXIT FOR EACH. Every count below is cross-filtered, so no exit
   * offered here can lead to another empty page.
   */
  const cause = archiveEmptyCause(state, nowMs, matchesRow, totalCount, archiveRows.length);
  const exits = cause && cause !== "no-rows" ? archiveExits(archiveRows, state, nowMs, matchesRow) : [];
  const EXIT_LABEL: Record<string, string> = {
    cat: t.market.catAll,
    when: t.common.rangeAll,
    product: t.market.catAll,
    q: t.common.clearSearch,
    out: t.common.all,
  };

  return (
    <>
      {/* Header — lean (parity with /markets). C2b adds the aggregate YES/NO
          donut as data, not a masthead.
          ⛔ NO `mb-*` — DG-P-04 · §S1: the gap below this band belongs to the `space-y-5`
          wrapper in the parent, and a margin here would be a second definition of it. */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-gold-300"><I.resolved s={18} /></span>
          <p className="font-mono text-caption uppercase eyebrow font-bold text-text-subtle">{t.results.title}</p>
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
          {/* ⭐ DG-A-12 · §M4 + §T1 — `.amount` and the rung its NEIGHBOUR already sits on.
              The line carries `formatTzsCompact(totalVolume)`, so §M4 applies: `.amount`
              replaces `font-mono … tabular-nums` and adds the letter-spacing 0 that keeps a
              rung from tracking the figure out. 10.5px is on neither ladder (§T1), and the
              choice between `text-micro` (10) and `text-caption` (11) is decided by what sits
              beside it in this very flex row: the YES/NO tally at L289 is 10px and the page
              title at L279 is `text-caption`. Taking 10 puts this line level with the tally it
              is read against, and keeps the title a step above both. */}
          <p data-result-count={totalCount} className="hidden sm:block amount text-micro text-text-subtle whitespace-nowrap">
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

      {/* ⭐ THE BAR REPLACES THE SIDEBAR. `/results` carried its rails as a desktop `aside` of
          full-width pills at board width, beside `/markets` which uses the bar — a second layout
          for the same job, which is the inconsistency this campaign exists to remove. The two
          chained sticky offsets went with it (`top-[122px]`, `max-h-[calc(100dvh-134px)]`): both
          were arithmetic on the search band's height, so neither could survive a bar of a
          different one. ⚠️ `countClassName` on `FilterPill` existed SOLELY for that sidebar's
          full-width rows and now has no consumer — left in the primitive deliberately, because
          removing a prop is a separate decision from removing its only call site. */}
      <ResultsBar state={state} counts={counts} resultCount={totalCount} t={t} />

      {/* Grid — ⛔ no `mt-*`, see the header band above (DG-P-04 · §S1). */}
      <div className="flex flex-col gap-5 lg:flex-row lg:gap-6">

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
              destination, and it still carries the real count so the exit names where it leads.
              ⛔ The category exit must stay an `<a>` whose href OMITS `cat` — `qa:results-board`
              finds it by looking for a `/results` link with a `q=` and no `cat=`.
              ⭐ AND THERE IS NOW AN EXIT FOR EVERY AXIS, NOT JUST THE CATEGORY. The page offered
              no escape from the PRODUCT — so `?product=MARKET`, which is the default, with a
              search that only matches Up & Down rows produced an empty page whose only way out
              was "clear the search", while the rows the player wanted sat one pill away. */}
          {totalCount === 0 && exits.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              {exits.map((e) => (
                <FilterPill
                  key={e.id}
                  scroll={false}
                  href={buildHref(e.patch)}
                  label={EXIT_LABEL[e.id] ?? e.id}
                  count={e.count}
                  on={false}
                  glyph={e.id === "cat" ? <I.layoutGrid s={14} className="shrink-0 opacity-70" /> : undefined}
                />
              ))}
            </div>
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
                  <Pagination total={totalCount} page={safePage} perPage={PER_PAGE} baseHref={resultsBaseHref} ofLabel={t.common.of} prevLabel={t.common.previousPage} nextLabel={t.common.nextPage} firstLabel={t.common.firstPage} lastLabel={t.common.lastPage} />
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
 *  The kit `Ring` with three segments, clockwise from 12 o'clock — real
 *  resolved counts only. */
function OutcomeDonut({ yes, no, voided, size = 38 }: { yes: number; no: number; voided: number; size?: number }) {
  const total = yes + no + voided || 1;
  return (
    <Ring
      size={size}
      strokeWidth={5}
      segments={[
        { frac: yes / total, stroke: "var(--yes-400)" },
        { frac: no / total, stroke: "var(--no-400)" },
        { frac: voided / total, stroke: "var(--text-subtle)" },
      ]}
    />
  );
}

/** C2b — one "notable result" (highest-volume settled market) spotlighted above
 *  the grid, carrying the resolved gilt seal chip. */
function FeaturedResult({ m, t, locale }: { m: Awaited<ReturnType<typeof listMarkets>>[number]; t: Awaited<ReturnType<typeof getServerT>>["t"]; locale: Awaited<ReturnType<typeof getServerT>>["locale"] }) {
  const isVoid = m.resolvedOutcome === "VOID" || m.status === "VOIDED";
  // ⛔ `pricedYesPct`, not `impliedYesPct` — PV-06 sweep, 2026-09-03. This card is chosen as the
  // HIGHEST-VOLUME settled market, so an empty pool is close to unreachable here — and "close to
  // unreachable" is not a gate. It is reachable on a young platform, or one where everything
  // settled VOID, and the cost of being wrong is a fabricated crowd price under a gilt seal.
  // Every player-facing bar answers cold start the same way; this one was the last that did not.
  const yesPct = pricedYesPct(m.yesPool, m.noPool);
  return (
    <Link
      /* ⚠️ THE NOTABLE CARD IS A SECOND CODE PATH FROM THE GRID and needs the row identity for
         the same reason it needed its own §L3 fix: an instrument reading `[data-row-id]` would
         otherwise count the three highest-volume settled markets as absent, and the page's own
         `data-result-count` would over-promise by exactly three. Measured before this line:
         promised 8, delivered 5. */
      data-row-id={m.id}
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
        <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-micro uppercase tracking-[0.16em] font-bold text-gold-300">
          <I.crown s={13} /> {t.results.notableResult}
        </span>
      </div>
      <h2 className="mb-4 max-w-[70ch] font-display text-[18px] lg:text-[22px] font-semibold leading-tight text-text group-hover:text-gold-100">
        {pickLocalized(locale, m.titleEn, m.titleSw, m.titleZh)}
      </h2>
      {yesPct === null ? (
        <TippingBar height={28} showLabels={false} recastOnHover={false}
          empty emptyLabel={t.market.noBetsYet} />
      ) : (
        <TippingBar yesPct={yesPct} height={28} showLabels resolved={!isVoid} recastOnHover={false}
          probabilityLabel={t.market.probBarAria.replace("{side}", sideWord(t, "YES", m.productLine))}
          labels={{ yes: sideWord(t, "YES", m.productLine), no: sideWord(t, "NO", m.productLine), tipping: t.market.tipping, leansYes: t.market.leansYes, leansNo: t.market.leansNo }} />
      )}
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
      {/* Header skeleton — ⛔ no `mb-*`: the fallback and the content are children of the SAME
          `space-y-5` wrapper, so both branches get the same rhythm and the page cannot move
          between them. Before DG-P-04 this branch spaced itself 20/24 and the content 32/16. */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-5 w-5 rounded bg-bg-overlay kp-shimmer-track" />
          <div className="h-4 w-32 rounded bg-bg-overlay kp-shimmer-track" />
        </div>
        <div className="h-3.5 w-36 rounded bg-bg-overlay kp-shimmer-track" />
      </div>

      {/* Search skeleton.
          ⚠️ FILED, NOT FIXED (DG-P-13 / DG-A-20): this bar is **44px** and the band it stands
          in for renders **91px** on production — a sticky wrapper (`py-2.5`) around a real
          `SearchBox` with its echo row. So the grid below still lands ~47px out when the
          fallback is replaced. That is a skeleton-SHAPE defect, not a rhythm one; DG-P-04 fixes
          the gaps and leaves the height with a measured number rather than a complaint.
          `markets/loading.tsx` already has the right shape to copy (`search-box-wrap`). */}
      <div className="h-[44px] rounded-md bg-bg-overlay kp-shimmer-track" style={{ maxWidth: 460 }} />

      {/* ⭐ THE GHOST FOLLOWS THE BAR, and its classes are IMPORTED rather than retyped, so a
          change to the bar's padding or sticky offset moves the ghost in the same commit by
          construction. It drew a 208px sidebar of four stacked pills; the page no longer has one,
          and a ghost of a control that is not there moves everything below it on first paint. */}
      <div className={QUERY_BAR_CLASS} aria-hidden>
        <div className={QUERY_BAR_ROW1_CLASS}>
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
            {[54, 74, 68, 82].map((w, i) => (
              /* ⚠️ LITERAL 44, not `h-8` — spacing is overridden (tailwind.config.ts:200-215), so
                 `h-8` would draw 48px for a pill that renders at FilterPill's 44. */
              <div key={i} className="h-[44px] shrink-0 rounded-pill bg-bg-overlay" style={{ width: w }} />
            ))}
          </div>
          <div className="h-3 w-20 shrink-0 rounded bg-bg-overlay" />
        </div>
        <div className={QUERY_BAR_ROW2_CLASS}>
          <div className="h-[44px] w-[180px] rounded-pill bg-bg-overlay" />
          <div className="h-[44px] w-[104px] rounded-pill bg-bg-overlay" />
        </div>
      </div>

      {/* Grid */}
      <div className="flex flex-col gap-5 lg:flex-row lg:gap-6">
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
