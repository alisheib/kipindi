import { Suspense } from "react";
import Link from "next/link";
import { I, categoryGlyph } from "@/components/ui/glyphs";
import { MarketCard } from "@/components/markets/market-card";
import { Chip } from "@/components/ui/chip";
import { TippingBar } from "@/components/brand";
import { listMarkets, impliedYesPct, type MarketCategory } from "@/lib/server/market-service";
import { getCardChart } from "@/lib/server/market-history";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination, PLAYER_PER_PAGE } from "@/components/ui/pagination";
import { ResultsSearch } from "./results-search";
import { NotableCarousel } from "./notable-carousel";
import { RefreshPoller } from "@/components/ui/refresh-poller";
import { formatTzsCompact } from "@/lib/utils";
import { pickLocalized } from "@/lib/localized";
import { getServerT } from "@/lib/i18n-server";

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

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; sort?: string; q?: string; page?: string }>;
}) {
  const { t } = await getServerT();
  const sp = await searchParams;
  const activeCat = sp.cat ?? "all";
  const activeSort: SortField = sp.sort === "volume" ? "volume" : "resolved";
  const qRaw = (sp.q ?? "").trim().slice(0, 100);
  const searching = qRaw.length > 0;
  const pageNum = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  return (
    <main className="mx-auto max-w-[1280px] px-3 lg:px-6 py-6">
      <h1 className="sr-only">{t.results.title}</h1>
      {/* Refresh every 60s — new resolutions should appear without F5 */}
      <RefreshPoller intervalMs={60_000} />

      <Suspense fallback={<ResultsSkeleton />}>
        <ResultsContent
          activeCat={activeCat}
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
  activeSort,
  qRaw,
  searching,
  pageNum,
}: {
  activeCat: string;
  activeSort: SortField;
  qRaw: string;
  searching: boolean;
  pageNum: number;
}) {
  const { t, locale } = await getServerT();

  const CATEGORIES: Array<{ id: "all" | MarketCategory; label: string }> = [
    { id: "all",     label: t.market.catAll },
    { id: "sports",  label: t.market.catSports },
    { id: "macro",   label: t.market.catMacro },
    { id: "weather", label: t.market.catWeather },
    { id: "crypto",  label: t.market.catCrypto },
    { id: "culture", label: t.market.catCulture },
    { id: "tech",    label: t.market.catTech },
    { id: "other",   label: t.market.catOther },
  ];

  const SORT_OPTIONS: Array<{ id: SortField; label: string }> = [
    { id: "resolved", label: t.results.sortNewest },
    { id: "volume",   label: t.results.sortHighest },
  ];

  const tokens = qRaw.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = (m: { titleEn: string; titleSw: string; titleZh?: string | null; category: string; resolutionCriterion?: string }) => {
    if (!searching) return true;
    const hay = `${m.titleEn} ${m.titleSw} ${m.titleZh ?? ""} ${m.category} ${m.resolutionCriterion ?? ""}`.toLowerCase();
    return tokens.every((t) => hay.includes(t));
  };

  // Fetch all resolved + voided
  const effectiveCat = searching ? undefined : (activeCat === "all" ? undefined : activeCat as MarketCategory);
  const resolved = await listMarkets({ status: "RESOLVED", category: effectiveCat }).then((l) => l.filter(matches)).catch(() => []);
  const voided = await listMarkets({ status: "VOIDED", category: effectiveCat }).then((l) => l.filter(matches)).catch(() => []);
  const all = [...resolved, ...voided];

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
  const yesWins = all.filter((m) => m.resolvedOutcome === "YES").length;
  const noWins = all.filter((m) => m.resolvedOutcome === "NO").length;
  const voidCount = all.filter((m) => m.resolvedOutcome === "VOID" || m.status === "VOIDED").length;

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
  const cardCharts = new Map(
    await Promise.all(paged.map(async (m) => [m.id, await getCardChart(m.id).catch(() => ({ spark: [] }))] as const)),
  );

  // Helpers
  const buildHref = (next: { cat?: string; sort?: string; page?: number }) => {
    const params = new URLSearchParams();
    const c = next.cat ?? activeCat;
    const s = next.sort ?? activeSort;
    const p = next.page ?? safePage;
    if (c !== "all") params.set("cat", c);
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
              <div className="flex flex-col leading-tight font-mono text-[10px] font-semibold tabular-nums">
                <span className="text-yes-300">{t.results.yesOutcome} {yesWins}</span>
                <span className="text-no-300">{t.results.noOutcome} {noWins}</span>
              </div>
            </div>
          )}
          <p className="hidden sm:block font-mono text-[10.5px] text-text-subtle tabular-nums whitespace-nowrap">
            {totalCount} {t.results.resolved} · {formatTzsCompact(totalVolume)} {t.common.settled}
          </p>
        </div>
      </div>

      {/* Search — sticky below app bar, same as /markets */}
      <div className="sticky top-[56px] z-20 bg-bg-base py-2.5">
        <Suspense>
          <ResultsSearch />
        </Suspense>
      </div>

      {/* Filters + Grid */}
      <div className="mt-1 flex flex-col gap-5 lg:flex-row lg:gap-6">
        {/* Sidebar filters — sticky on desktop, horizontal scroll on mobile */}
        <aside className="lg:w-[208px] lg:shrink-0 lg:sticky lg:top-[122px] lg:self-start lg:max-h-[calc(100dvh-134px)] lg:overflow-y-auto lg:overflow-x-hidden kp-thin-scroll lg:pb-3">
          <div className="space-y-2.5 lg:space-y-4">
            {/* Sort */}
            <nav aria-label={t.results.sortAria} className="flex flex-wrap items-center gap-1.5 -mx-1 px-1 overflow-x-auto lg:flex-col lg:flex-nowrap lg:items-stretch lg:gap-1 lg:mx-0 lg:px-0 lg:overflow-visible">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-text-subtle pr-1 lg:pr-0 lg:mb-1">{t.common.sort}</span>
              {SORT_OPTIONS.map((o) => {
                const active = o.id === activeSort;
                return (
                  <a
                    key={o.id}
                    href={buildHref({ sort: o.id, page: 1 })}
                    className={
                      "inline-flex h-8 items-center rounded-md border px-3.5 font-mono text-[12px] font-semibold whitespace-nowrap transition-all lg:w-full lg:justify-start " +
                      (active
                        ? "border-brand-500 text-text"
                        : "border-border bg-bg-elevated/60 text-text-muted hover:border-brand-400 hover:text-text")
                    }
                    style={active ? { background: "var(--pill-active)" } : undefined}
                  >
                    {o.label}
                  </a>
                );
              })}
            </nav>

            {/* Categories */}
            <nav aria-label={t.results.categoriesAria} className="flex flex-wrap items-center gap-1.5 -mx-1 px-1 overflow-x-auto lg:flex-col lg:flex-nowrap lg:items-stretch lg:gap-1 lg:mx-0 lg:px-0 lg:overflow-visible">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-text-subtle pr-1 lg:pr-0 lg:mb-1">{t.common.topic}</span>
              {CATEGORIES.map((c) => {
                const active = c.id === activeCat;
                const Glyph = c.id === "all" ? I.layoutGrid : I[categoryGlyph(c.id)];
                return (
                  <a
                    key={c.id}
                    href={buildHref({ cat: c.id, page: 1 })}
                    className={
                      "inline-flex h-8 items-center gap-1.5 rounded-md border px-3 font-mono text-[12px] font-semibold whitespace-nowrap transition-all lg:w-full lg:justify-start " +
                      (active
                        ? "border-brand-500 text-text"
                        : "border-border bg-bg-elevated/60 text-text-muted hover:border-brand-400 hover:text-text")
                    }
                    style={active ? { background: "var(--pill-active)" } : undefined}
                  >
                    <Glyph s={14} className={"shrink-0 " + (active ? "text-brand-300" : "opacity-70")} />
                    {c.label}
                  </a>
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
                    key={m.id}
                    id={m.id}
                    titleEn={m.titleEn}
                    titleSw={m.titleSw}
                    titleZh={m.titleZh}
                    category={m.category}
                    yesPct={impliedYesPct(m)}
                    volume={m.yesPool + m.noPool}
                    predictors={m.predictorCount}
                    timeLeft={m.resolvedOutcome === "VOID" ? t.common.voided : `${t.market.resolvedOutcome} ${m.resolvedOutcome}`}
                    status={m.status === "VOIDED" ? "VOIDED" : "RESOLVED"}
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
        {isVoid
          ? <Chip variant="pending" size="sm">{t.common.voided}</Chip>
          : <Chip variant="resolved" size="sm">{t.market.resolvedOutcome} · {m.resolvedOutcome}</Chip>}
        <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-gold-300">
          <I.crown s={13} /> {t.results.notableResult}
        </span>
      </div>
      <h2 className="mb-4 max-w-[70ch] font-display text-[18px] lg:text-[22px] font-semibold leading-tight text-text group-hover:text-gold-100">
        {pickLocalized(locale, m.titleEn, m.titleSw, m.titleZh)}
      </h2>
      <TippingBar yesPct={yesPct} height={28} showLabels resolved={!isVoid} recastOnHover={false} />
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
            <div key={i} className="h-8 rounded-md bg-bg-overlay kp-shimmer-track" />
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
                    <div className="h-5 w-12 rounded-pill bg-bg-overlay" />
                    <div className="h-5 w-16 rounded-pill bg-bg-overlay" />
                  </div>
                  <div className="h-4 w-3/4 rounded bg-bg-overlay" />
                  <div className="h-4 w-1/2 rounded bg-bg-overlay" />
                  <div className="h-[7px] w-full rounded-pill bg-bg-overlay mt-4" />
                  <div className="flex gap-2 mt-3">
                    <div className="h-9 flex-1 rounded-md bg-bg-overlay" />
                    <div className="h-9 flex-1 rounded-md bg-bg-overlay" />
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
