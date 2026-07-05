import { Suspense } from "react";
import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { SignalPip } from "@/components/brand";
import { MarketCard } from "@/components/markets/market-card";
import { listMarkets, impliedYesPct, isClosedByTime, isSelectionClosed, traderSeedsByMarket, type MarketCategory } from "@/lib/server/market-service";
import { getCardChart } from "@/lib/server/market-history";
import { countComments } from "@/lib/server/comments-store";
import { getProposalsConfig } from "@/lib/server/proposals-config";
import { getServerT } from "@/lib/i18n-server";

import { EmptyState } from "@/components/ui/empty-state";
import { Pagination, PLAYER_PER_PAGE } from "@/components/ui/pagination";
import { MarketSearch } from "./market-search";
import { RefreshPoller } from "@/components/ui/refresh-poller";

export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.market.title };
}
export const dynamic = "force-dynamic";

type WhenFilter = "new" | "soon" | "today" | "week" | "all";
const WHEN_CUTOFFS: Record<WhenFilter, number | null> = {
  new:   null,
  soon:  60 * 60_000,
  today: 24 * 3600_000,
  week:  7 * 24 * 3600_000,
  all:   null,
};

export default async function MarketsPage({ searchParams }: { searchParams: Promise<{ cat?: string; when?: string; q?: string; page?: string }> }) {
  const { t } = await getServerT();
  const allLive = (await listMarkets({ status: "LIVE" }).catch(() => [])).filter((m) => !isClosedByTime(m));
  const totalVolume = allLive.reduce((s, m) => s + m.yesPool + m.noPool, 0);
  return (
    <main className="mx-auto max-w-[1280px] px-3 lg:px-6 py-6">
      {/* Accessible page heading (WCAG 1.3.1 / 2.4.6). Visually hidden — the
          design uses a slim content-first header, not a marketing H1. */}
      <h1 className="sr-only">{t.market.title}</h1>
      {/* Auto-refresh every 30s so odds, volumes, and time-left stay
          current without the player needing to F5. Pauses when the tab
          is backgrounded. Also responds to 50pick:refresh events. */}
      <RefreshPoller intervalMs={30_000} />
      {/* Lean, content-first header — the marketing hero lives on the homepage. */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-text-subtle">{t.market.title}</p>
        {/* The board's heartbeat. Aqua live-pip + the two figures at full ink,
            their labels kept quiet — a confident pulse, not a shout. Aqua (not
            gilt) by design: gold is reserved for earned-money moments. */}
        <p className="flex items-center gap-1.5 font-mono text-[12.5px] tabular-nums whitespace-nowrap">
          <SignalPip size={7} className="mr-0.5" />
          <span className="font-semibold text-text">{allLive.length}</span>
          <span className="text-text-subtle">{t.market.liveCount}</span>
          <span className="text-border-strong">·</span>
          <span className="font-semibold text-text">TZS {(totalVolume / 1000).toFixed(0)}k</span>
          <span className="text-text-subtle">{t.market.tzsInPlay}</span>
        </p>
      </div>

      <ProposalEntryCard />

      {/* Search — the primary "find a market by name" affordance. Sticks just
          under the 56px app bar so it stays reachable while scrolling a long
          board; the board background sits behind it so cards scroll cleanly
          under. The sidebar's sticky offset below is set to clear this bar. */}
      <div className="sticky top-[56px] z-20 mt-4 bg-bg-base py-2.5">
        <MarketSearch />
      </div>

      {/* Filters as a left column on desktop, stacked above the grid on mobile.
          Sticky offset = 56 (app bar) + ~66 (sticky search zone) so the rail
          parks just below the search instead of colliding with it. */}
      <div className="mt-1 flex flex-col gap-5 lg:flex-row lg:gap-6">
        <aside className="lg:w-[208px] lg:shrink-0 lg:sticky lg:top-[122px] lg:self-start lg:max-h-[calc(100dvh-134px)] lg:overflow-y-auto lg:overflow-x-hidden kp-thin-scroll lg:pb-3">
          <FilterBar searchParams={searchParams} />
        </aside>
        <div className="min-w-0 flex-1">
          <Suspense fallback={<GridSkeleton />}>
            <SearchAwareGrid searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

/** Gold-accented entry point into Feature 2 (player market proposals). */
async function ProposalEntryCard() {
  const { t } = await getServerT();
  const cfg = getProposalsConfig();
  if (!cfg.enabled) return null;
  return (
    <Link
      href={"/proposals" as never}
      className="group flex items-center gap-3.5 rounded-xl border p-4 transition-colors hover:border-gold-500"
      style={{ borderColor: "color-mix(in oklab, var(--gold-500) 30%, var(--border))", background: "color-mix(in oklab, var(--gold-500) 6%, var(--bg-elevated))" }}
    >
      <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[11px] text-gold-fg" style={{ background: "linear-gradient(180deg, var(--gold-400), var(--gold-600))" }}>
        <I.trophy s={22} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-[14.5px] font-bold text-text">{t.market.proposeAndGetPaid}</p>
        <p className="font-display italic text-text-subtle text-[11.5px]">{t.common.proposeEarn}{cfg.prizeTzs > 0 ? ` · TZS ${cfg.prizeTzs.toLocaleString()}` : ""}</p>
      </div>
      <I.arrowRight s={18} />
    </Link>
  );
}

async function FilterBar({ searchParams }: { searchParams: Promise<{ cat?: string; when?: string; q?: string; page?: string }> }) {
  const { t } = await getServerT();
  const sp = await searchParams;
  const activeWhen = (sp.when as WhenFilter | undefined) ?? "today";
  const activeCat = sp.cat ?? "all";
  const activeQ = (sp.q ?? "").trim();

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

  const WHEN_OPTIONS: Array<{ id: WhenFilter; label: string }> = [
    { id: "new",   label: t.market.whenNew },
    { id: "soon",  label: t.market.whenEndingSoon },
    { id: "today", label: t.market.whenToday },
    { id: "week",  label: t.market.whenThisWeek },
    { id: "all",   label: t.market.whenAll },
  ];

  const buildHref = (next: { when?: WhenFilter; cat?: string }) => {
    const params = new URLSearchParams();
    const w = next.when ?? activeWhen;
    const c = next.cat  ?? activeCat;
    if (w !== "today") params.set("when", w);
    if (c !== "all")   params.set("cat", c);
    if (activeQ)       params.set("q", activeQ); // keep the search when switching filters
    const qs = params.toString();
    return qs ? `/markets?${qs}` : "/markets";
  };
  return (
    <div className="space-y-2.5 lg:space-y-4">
      <nav aria-label={t.common.when} className="flex flex-wrap items-center gap-1.5 -mx-1 px-1 overflow-x-auto lg:flex-col lg:flex-nowrap lg:items-stretch lg:gap-1 lg:mx-0 lg:px-0 lg:overflow-visible">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-text-subtle pr-1 lg:pr-0 lg:mb-1">{t.common.when}</span>
        {WHEN_OPTIONS.map((o) => {
          const active = o.id === activeWhen;
          return (
            <a
              key={o.id}
              href={buildHref({ when: o.id })}
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
      <nav aria-label={t.common.topic} className="flex flex-wrap items-center gap-1.5 -mx-1 px-1 overflow-x-auto lg:flex-col lg:flex-nowrap lg:items-stretch lg:gap-1 lg:mx-0 lg:px-0 lg:overflow-visible">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-text-subtle pr-1 lg:pr-0 lg:mb-1">{t.common.topic}</span>
        {CATEGORIES.map((c) => {
          const active = c.id === activeCat;
          return (
            <a
              key={c.id}
              href={buildHref({ cat: c.id })}
              className={
                "inline-flex h-8 items-center rounded-md border px-3.5 font-mono text-[12px] font-semibold whitespace-nowrap transition-all lg:w-full lg:justify-start " +
                (active
                  ? "border-brand-500 text-text"
                  : "border-border bg-bg-elevated/60 text-text-muted hover:border-brand-400 hover:text-text")
              }
              style={active ? { background: "var(--pill-active)" } : undefined}
            >
              {c.label}
            </a>
          );
        })}
      </nav>
    </div>
  );
}

async function SearchAwareGrid({ searchParams }: { searchParams: Promise<{ cat?: string; when?: string; q?: string; page?: string }> }) {
  const { t } = await getServerT();
  const sp = await searchParams;
  const cat = (sp.cat as MarketCategory | undefined) ?? undefined;
  const whenId = (sp.when as WhenFilter | undefined) ?? "today";
  const whenCutoff = WHEN_CUTOFFS[whenId] ?? WHEN_CUTOFFS.today;
  // Cap the query length (defensive — keeps the URL + match work bounded).
  const qRaw = (sp.q ?? "").trim().slice(0, 100);
  const searching = qRaw.length > 0;
  // Token-based AND match: every whitespace-separated word must appear somewhere
  // in the market's searchable text (EN title, SW title, category, resolution
  // criterion), in any order. So "simba win" matches "Will Simba SC win…", and
  // "rains april" matches "…long rains begin… before April 15". Substring, not
  // regex — no injection, and partial words ("crypt") still hit.
  const tokens = qRaw.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = (m: { titleEn: string; titleSw: string; titleZh?: string | null; category: string; resolutionCriterion?: string }) => {
    if (!searching) return true;
    const hay = `${m.titleEn} ${m.titleSw} ${m.titleZh ?? ""} ${m.category} ${m.resolutionCriterion ?? ""}`.toLowerCase();
    return tokens.every((t) => hay.includes(t));
  };
  const now = Date.now();
  // A name search is global: ignore the category filter so a remembered market
  // surfaces no matter which topic chip happens to be active.
  const effectiveCat = searching ? undefined : cat;
  // Total live count (unfiltered) — used to distinguish "platform has zero
  // markets" from "no markets match the active filter".
  const totalLive = effectiveCat
    ? (await listMarkets({ status: "LIVE" }).catch(() => [])).filter(m => !isClosedByTime(m)).length
    : 0; // no category filter means bettable IS total
  // Sort by closest-to-resolution first so the demo-friendly minute-scale
  // markets float to the top. Past-resolution markets sink (they're in the
  // resolver queue, not the live grid).
  const bettable = (await listMarkets({ status: "LIVE", category: effectiveCat }).catch(() => []))
    // Filter out markets whose clock has already passed but the
    // resolver hasn't yet acted — they're closed-by-time, not bettable,
    // and showing them in the LIVE grid produces a confused UX where
    // you can click a card whose dial then refuses to fire.
    .filter(m => !isClosedByTime(m));
  let live;
  if (searching) {
    // While searching, ignore the time-window entirely — a market the player
    // remembers must surface regardless of when it closes — and sort soonest first.
    live = bettable.filter(matches)
      .sort((a, b) => Date.parse(a.resolutionAt) - Date.parse(b.resolutionAt));
  } else if (whenId === "new") {
    // "New" — newly-listed polls first, so freshly-generated markets are
    // easy to find regardless of when they close.
    live = [...bettable].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } else {
    const liveAll = bettable
      .map(m => ({ m, ms: Math.max(0, Date.parse(m.resolutionAt) - now) }))
      .sort((a, b) => a.ms - b.ms);
    live = (whenCutoff === null
      ? liveAll
      : liveAll.filter(x => x.ms <= whenCutoff!)
    ).map(x => x.m);
  }
  // Paginate the live grid with the shared player page size so a long board
  // pages like every other list instead of rendering an unbounded wall.
  const pageNum = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const totalLiveCount = live.length;
  const totalLivePages = Math.max(1, Math.ceil(totalLiveCount / PLAYER_PER_PAGE));
  const safePage = Math.min(pageNum, totalLivePages);
  const pagedLive = live.slice((safePage - 1) * PLAYER_PER_PAGE, safePage * PLAYER_PER_PAGE);
  const marketsBaseHref = (() => {
    const params = new URLSearchParams();
    if (whenId !== "today") params.set("when", whenId);
    if (sp.cat && sp.cat !== "all") params.set("cat", sp.cat);
    if (qRaw) params.set("q", qRaw);
    const qs = params.toString();
    return qs ? `/markets?${qs}` : "/markets";
  })();

  function timeLeftStr(iso: string): string {
    const ms = Date.parse(iso) - Date.now();
    if (ms <= 0) return t.market.closed;
    const d = Math.floor(ms / (24 * 3600_000));
    if (d > 0) return `${d}${t.market.dLeft}`;
    const h = Math.floor(ms / 3600_000);
    if (h > 0) return `${h}${t.market.hLeft}`;
    const m = Math.floor(ms / 60_000);
    return `${m}${t.market.mLeft}`;
  }

  // Show a small resolved teaser — the full browsable archive lives at /results.
  const resolved = searching
    ? (await listMarkets({ status: "RESOLVED" }).catch(() => [])).filter(matches).slice(0, 6)
    : (await listMarkets({ status: "RESOLVED" }).catch(() => [])).slice(0, 3);
  const traderMap = await traderSeedsByMarket().catch(() => new Map());
  const allForCharts = [...pagedLive, ...resolved];
  const cardCharts = new Map(await Promise.all(allForCharts.map(async (m) => [m.id, await getCardChart(m.id).catch(() => ({ spark: [] as number[], move24h: undefined }))] as const)));
  const commentCounts = new Map(await Promise.all(allForCharts.map(async (m) => [m.id, await countComments(m.id).catch(() => 0)] as const)));

  const resultCount = live.length + resolved.length;
  return (
    <>
      {searching && (
        <p aria-live="polite" className="mb-3 font-mono text-[11px] text-text-subtle tabular-nums">
          {resultCount === 0
            ? `${t.market.noMarketsMatch} "${qRaw}"`
            : `${resultCount} ${resultCount === 1 ? t.market.marketMatch : t.market.marketsMatch} "${qRaw}"`}
        </p>
      )}
      <section className="market-grid">
        {pagedLive.map((m) => {
          const cc = cardCharts.get(m.id) ?? { spark: [] };
          return (
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
              timeLeft={isSelectionClosed(m) ? t.market.waitingForResults : timeLeftStr(m.resolutionAt)}
              status="LIVE"
              selectionClosed={isSelectionClosed(m)}
              sourceUrl={m.sourceUrl}
              spark={cc.spark}
              move24h={cc.move24h}
              traders={traderMap.get(m.id)}
              comments={commentCounts.get(m.id) ?? 0}
            />
          );
        })}
        {live.length === 0 && <LiveEmptyState searching={searching} qRaw={qRaw} hasAnyLive={effectiveCat ? totalLive > 0 : bettable.length > 0} />}
      </section>

      {/* Pagination — shared platform pager (live grid) */}
      {totalLivePages > 1 && (
        <div className="mt-6 rounded-lg border border-border bg-bg-elevated/40 overflow-hidden">
          <Pagination total={totalLiveCount} page={safePage} perPage={PLAYER_PER_PAGE} baseHref={marketsBaseHref} ofLabel={t.common.of} prevLabel={t.common.previousPage} nextLabel={t.common.nextPage} />
        </div>
      )}

      {resolved.length > 0 && (
        <section className="mt-10">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 className="font-display text-[20px] font-semibold text-text">
              {searching ? `${t.market.marketsMatch}` : t.market.recentlyResolved}
            </h2>
            <a href="/results" className="font-mono text-[11.5px] font-semibold text-brand-300 hover:text-text transition-colors whitespace-nowrap">
              {t.market.allResults}
            </a>
          </div>
          <div className="market-grid">
            {resolved.map((m) => (
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
                timeLeft={`${t.market.resolvedOutcome} ${m.resolvedOutcome}`}
                status="RESOLVED"
                sourceUrl={m.sourceUrl}
                spark={(cardCharts.get(m.id) ?? { spark: [] }).spark}
                comments={commentCounts.get(m.id) ?? 0}
              />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

async function LiveEmptyState({ searching, qRaw, hasAnyLive }: { searching: boolean; qRaw: string; hasAnyLive: boolean }) {
  const { t } = await getServerT();
  const noMarketsAtAll = !hasAnyLive && !searching;
  return (
    <div className="col-span-full">
      <EmptyState
        kind="markets"
        title={
          searching ? `${t.market.noLiveMatch} "${qRaw}"`
          : noMarketsAtAll ? t.market.noMarketsAvailable
          : t.market.noMarketsInCat
        }
        body={
          searching ? t.market.checkSpelling
          : noMarketsAtAll ? t.market.noMarketsAvailableBody
          : t.market.noMarketsInCatBody
        }
        action={
          noMarketsAtAll ? undefined : (
            <Link href="/markets" className="btn btn-ghost btn-sm">
              {searching ? t.market.clearSearchLabel : t.market.seeAllCategories}
            </Link>
          )
        }
      />
    </div>
  );
}

/** Shimmer skeleton shown while the async grid is loading (filter switch,
 *  initial load, or 30s auto-refresh with a slow server response). */
function GridSkeleton() {
  return (
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
  );
}
