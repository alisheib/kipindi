import { Suspense, cache } from "react";
import { fill } from "@/lib/utils";
import Link from "next/link";
import { SignalPip } from "@/components/brand";
import { I, categoryGlyph } from "@/components/ui/glyphs";
import { MarketCard } from "@/components/markets/market-card";
import { listMarkets, impliedYesPct, isClosedByTime, isSelectionClosed, traderSeedsByMarket, type MarketCategory } from "@/lib/server/market-service";
import { getCardCharts } from "@/lib/server/market-history";
import { countCommentsByMarkets } from "@/lib/server/comments-store";
import { getServerT } from "@/lib/i18n-server";

import { EmptyState } from "@/components/ui/empty-state";
import { ProposePromo } from "@/components/ui/propose-promo";
import { Pagination, PLAYER_PER_PAGE } from "@/components/ui/pagination";
import { SearchBox } from "@/components/ui/search-box";
import { parseQuery, matchesQuery, fieldNames, MARKET_SEARCH } from "@/lib/search";
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

/**
 * The window a player gets with no query string — i.e. THE BOARD.
 *
 * 🔴 THIS WAS `"today"` AND IT SHOWED A PLAYER NOTHING. Measured on production
 * 2026-08-10, in a real browser, at 360/768/1280 × en/sw/zh — all nine combinations
 * rendered **0 cards** while the header directly above them said "40 live · TZS
 * 1,659k in play". The inventory is long-dated and always will be: of 40 live polls,
 * **0 resolved within 24h, 2 within a week, 38 beyond it.** A 24-hour window over
 * long-horizon inventory is empty on essentially every day the platform runs, so the
 * board's own first impression was an empty grid over three FINISHED markets.
 *
 * ⛔ Do not "fix" an empty board by adding another compensation. Three already
 * existed — a featured treatment, a "just listed" section and a see-wider nudge —
 * and all three are downstream of this one literal. The board now shows the whole
 * live book, still sorted soonest-first, so urgency leads without hiding anything.
 * `soon` / `today` / `week` remain as deliberate NARROWING choices.
 *
 * ⚠️ ONE DEFINITION. Four sites used to hard-code "today" independently — the two
 * readers plus the two href builders that omit the param when it equals the default.
 * Changing three of four leaves links that disagree with the page they point at, so
 * the value lives here and nowhere else.
 */
const DEFAULT_WHEN: WhenFilter = "all";

// B-17 — ONE live-board read per request. The header, the total-live count and
// the bettable grid all consumed the same list but each ran its own query (up
// to 4 board fetches per render). React cache() dedupes across the page's
// streamed sections within a single request render.
// B-1 — no swallow: the page cannot distinguish "no live markets" from "read
// failed", so a failed board read must throw to markets/error.tsx, never render
// the empty board.
const getLiveBoard = cache(async () =>
  (await listMarkets({ status: "LIVE" })).filter((m) => !isClosedByTime(m)),
);

export default async function MarketsPage({ searchParams }: { searchParams: Promise<{ cat?: string; when?: string; q?: string; page?: string }> }) {
  const { t } = await getServerT();
  const allLive = await getLiveBoard();
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

      <ProposePromo href="/proposals" />

      {/* Search — the primary "find a market by name" affordance. Sticks just
          under the 56px app bar so it stays reachable while scrolling a long
          board; the board background sits behind it so cards scroll cleanly
          under. The sidebar's sticky offset below is set to clear this bar. */}
      <div className="sticky top-[56px] z-20 mt-4 bg-bg-base py-2.5">
        <SearchBox
          placeholder={t.common.searchMarkets}
          ariaLabel={t.common.searchMarkets}
          helpFields={fieldNames(MARKET_SEARCH)}
        />
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

async function FilterBar({ searchParams }: { searchParams: Promise<{ cat?: string; when?: string; q?: string; page?: string }> }) {
  const { t } = await getServerT();
  const sp = await searchParams;
  const activeWhen = (sp.when as WhenFilter | undefined) ?? DEFAULT_WHEN;
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
    if (w !== DEFAULT_WHEN) params.set("when", w);
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
            <Link
              key={o.id}
              scroll={false}
              href={buildHref({ when: o.id }) as never}
              className={
                "inline-flex h-8 items-center rounded-md border px-3.5 font-mono text-[12px] font-semibold whitespace-nowrap transition-all lg:w-full lg:justify-start " +
                (active
                  ? "border-brand-500 text-text"
                  : "border-border bg-bg-elevated/60 text-text-muted hover:border-brand-400 hover:text-text")
              }
              style={active ? { background: "var(--pill-active)" } : undefined}
            >
              {o.label}
            </Link>
          );
        })}
      </nav>
      <nav aria-label={t.common.topic} className="flex flex-wrap items-center gap-1.5 -mx-1 px-1 overflow-x-auto lg:flex-col lg:flex-nowrap lg:items-stretch lg:gap-1 lg:mx-0 lg:px-0 lg:overflow-visible">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-text-subtle pr-1 lg:pr-0 lg:mb-1">{t.common.topic}</span>
        {CATEGORIES.map((c) => {
          const active = c.id === activeCat;
          const Glyph = c.id === "all" ? I.layoutGrid : I[categoryGlyph(c.id)];
          return (
            <Link
              key={c.id}
              scroll={false}
              href={buildHref({ cat: c.id }) as never}
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
            </Link>
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
  const whenId = (sp.when as WhenFilter | undefined) ?? DEFAULT_WHEN;
  // NB: `?? WHEN_CUTOFFS[DEFAULT_WHEN]` would be a bug — WHEN_CUTOFFS.all is
  // *intentionally* null ("no cutoff"), and `null ?? x` collapses it back to x,
  // which silently made the "All" filter behave like "Today" (hiding every market
  // that settles > 24h out). Only fall back for an UNKNOWN `when` key.
  const rawCutoff = WHEN_CUTOFFS[whenId];
  const whenCutoff = rawCutoff === undefined ? WHEN_CUTOFFS[DEFAULT_WHEN] : rawCutoff;
  // The shared grammar (src/lib/search). This page's old hand-rolled token-AND
  // matcher was one of only TWO that got multi-word right; the other ten surfaces
  // did a single contiguous `.includes()`. It is now one rule for all of them —
  // and this page gains "quoted phrase", -exclude and field: for free.
  // No regex here: `allowRegex` is admin-only by construction.
  const parsed = parseQuery(sp.q, { fields: fieldNames(MARKET_SEARCH) });
  const searching = parsed.mode !== "empty";
  // The raw text, already trimmed and length-clamped by the parser — used for the
  // result-count copy and to carry the query across filter links.
  const qRaw = parsed.raw;
  const matches = (m: { titleEn: string; titleSw: string; titleZh?: string | null; category: string; resolutionCriterion?: string }) =>
    matchesQuery(parsed, m as unknown as Record<string, string | null | undefined>, MARKET_SEARCH);
  const now = Date.now();
  // A name search is global: ignore the category filter so a remembered market
  // surfaces no matter which topic chip happens to be active.
  const effectiveCat = searching ? undefined : cat;
  // Total live count (unfiltered) — used to distinguish "platform has zero
  // markets" from "no markets match the active filter".
  // B-17 — both figures derive from the ONE cached board read (getLiveBoard
  // already excludes closed-by-time rows: they're in the resolver queue, not
  // the live grid, and a card whose dial refuses to fire is a confused UX).
  const liveBoard = await getLiveBoard();
  const totalLive = effectiveCat ? liveBoard.length : 0; // no category filter means bettable IS total
  const bettable = effectiveCat ? liveBoard.filter(m => m.category === effectiveCat) : liveBoard;
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
    if (whenId !== DEFAULT_WHEN) params.set("when", whenId);
    if (sp.cat && sp.cat !== "all") params.set("cat", sp.cat);
    if (qRaw) params.set("q", qRaw);
    const qs = params.toString();
    return qs ? `/markets?${qs}` : "/markets";
  })();

  function timeLeftStr(iso: string): string {
    const ms = Date.parse(iso) - Date.now();
    if (ms <= 0) return t.market.closed;
    const d = Math.floor(ms / (24 * 3600_000));
    if (d > 0) return fill(t.market.timeLeftD, { n: d });
    const h = Math.floor(ms / 3600_000);
    if (h > 0) return fill(t.market.timeLeftH, { n: h });
    const m = Math.floor(ms / 60_000);
    return fill(t.market.timeLeftM, { n: m });
  }

  // Show a small resolved teaser — the full browsable archive lives at /results.
  // B-1 — deliberate degrade: the teaser (and the trader/chart/comment
  // enrichments below) are garnish on the live board; their absence degrades
  // the cards, it never mimics an empty board.
  // 🔴 "RECENTLY RESOLVED" WAS SHOWING THE OLDEST RESULTS ON THE PLATFORM, FOREVER.
  // `listMarkets` → `listBoard` orders `resolutionAt: "asc"` (market-dal.ts) because
  // that is right for the LIVE board — soonest to close, first. Slicing the same
  // ascending list for RESOLVED rows takes the three that resolved EARLIEST in the
  // platform's history and pins them there permanently. Measured on production
  // 2026-08-10: the board offered three markets from **5 July** as "recently
  // resolved" while markets settled on 1–2 August sat below them in the same list.
  // ⛔ Never slice a board-ordered list for a "recent" section — re-sort by the
  // clock that section actually names.
  const resolvedAll = (await listMarkets({ status: "RESOLVED" }).catch(() => []))
    .slice()
    .sort((a, b) => b.resolutionAt.localeCompare(a.resolutionAt));
  const resolved = searching ? resolvedAll.filter(matches).slice(0, 6) : resolvedAll.slice(0, 3);
  const allForCharts = [...pagedLive, ...resolved];
  const boardIds = allForCharts.map((m) => m.id);
  // Scoped to the cards actually being drawn — this used to read the ENTIRE Position
  // table on every render and every 30s refresh (see traderSeedsByMarket).
  const traderMap = await traderSeedsByMarket(boardIds).catch(() => new Map());
  // One query for the whole board — never map getCardChart across a list.
  const cardCharts = await getCardCharts(boardIds).catch(() => new Map());
  // B-17 — one grouped query for the whole board, not one count per card.
  const commentCounts = await countCommentsByMarkets(boardIds).catch(() => new Map<string, number>());

  const resultCount = live.length + resolved.length;

  // ── Board composition (2026-07-29, re-based 2026-08-10) ──────────────────
  // ⚠️ WRITTEN FOR A DEFAULT THAT NO LONGER EXISTS. These two additions were built
  // because the board defaulted to when="today" and a 1280px screen could render one
  // card beside a column of filters and an ocean of nothing. The default is now
  // `all` (see DEFAULT_WHEN), so the ocean is gone and both additions are load-
  // bearing only when a player NARROWS the window themselves. They are kept because
  // that case is still real; they are no longer propping up the landing view.
  //
  // Two additions, both of which show REAL markets or nothing at all:
  //
  //  1. FEATURED — the first card of the live grid leads. Only when the grid is
  //     genuinely short (<= 4) and we're not searching: on a full board every
  //     card competing at one weight is correct, and a search result must stay
  //     ranked by relevance, not by a treatment we chose.
  //  2. NEW MARKETS — freshly-listed markets that the active time window
  //     excludes. This is a SEPARATE, LABELLED section, never an injection into
  //     the filtered grid: the grid keeps meaning exactly what the filter says.
  //     Same `fresh` rule the card uses (volume 0 + predictors 0), so the board
  //     and the card can never disagree about what "new" means — one rule, one
  //     place. Suppressed while searching and when it would add nothing.
  // ⚠️ EXCLUDED BY THE **WINDOW**, NEVER BY THE PAGE. This section exists to surface
  // fresh markets the active time filter hides — that is what its own heading claims.
  // It used to subtract `pagedLive` (the current PAGE), which was indistinguishable
  // from subtracting the window only because the old 24h default made the window
  // smaller than one page. On a board showing its whole book, subtracting the page
  // would re-advertise page 2 under a "just listed" heading, directly beneath the
  // pager that already leads there. Subtracting `live` (the windowed set) means the
  // section renders exactly when the filter is genuinely hiding something, and
  // disappears on the default board — which is correct, because nothing is hidden.
  const inWindow = new Set(live.map((m) => m.id));
  const featuredId = !searching && pagedLive.length > 0 && pagedLive.length <= 4 ? pagedLive[0].id : null;
  const newMarkets = searching
    ? []
    : bettable
        .filter((m) => !inWindow.has(m.id) && m.yesPool + m.noPool === 0 && m.predictorCount === 0)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 6);
  // One extra chart/comment lookup pass for the new-markets section, batched the
  // same way as the main board (never map a per-card query across a list).
  // B-1 — deliberate degrade: chart garnish only.
  const newCharts = newMarkets.length
    ? await getCardCharts(newMarkets.map((m) => m.id)).catch(() => new Map())
    : new Map();

  // ── Sparse-board continuation nudge ──────────────────────────────────────
  // A player who NARROWS to soon/today/week can land on a small single page while
  // more markets settle further out. Rather than leave them on a near-empty board,
  // offer a calm "see wider" prompt. ⚠️ This can no longer fire on the landing view
  // — `all` is the default and has no wider window — which is the point: the nudge
  // is for a choice the player made, not a hole the default dug. It is a
  // NUDGE — pure links to a wider window — and never injects non-matching
  // cards. Shown only when: not searching · a bounded window (soon/today/week)
  // · the whole window fits on one page (sparse) · AND a wider window
  // genuinely reveals MORE live markets (honest — no dead link).
  type ContLink = { href: string; label: string };
  let continuation: { lead: string; links: ContLink[] } | null = null;
  if (!searching && live.length > 0 && totalLivePages === 1 && (whenId === "today" || whenId === "soon" || whenId === "week")) {
    const msLeft = bettable.map((m) => Math.max(0, Date.parse(m.resolutionAt) - now));
    const within = (cut: number | null) => (cut === null ? msLeft.length : msLeft.filter((ms) => ms <= cut).length);
    const here = live.length; // == within(current window cutoff) on these branches
    const catParam = cat ?? null; // `cat` is a real category or undefined (URL never carries ?cat=all)
    const widerHref = (w: WhenFilter) => {
      const params = new URLSearchParams();
      if (w !== DEFAULT_WHEN) params.set("when", w); // the default carries no param
      if (catParam) params.set("cat", catParam); // stay in the topic the player chose
      const qs = params.toString();
      return qs ? `/markets?${qs}` : "/markets";
    };
    // Candidate wider windows per bounded window, nearest-first; each is shown
    // only if it actually contains more markets than the current view.
    const WIDER: Record<"soon" | "today" | "week", Array<{ w: WhenFilter; cut: number | null; label: string }>> = {
      soon:  [{ w: "today", cut: WHEN_CUTOFFS.today, label: t.market.contSeeToday }, { w: "all", cut: null, label: t.market.contSeeAll }],
      today: [{ w: "week",  cut: WHEN_CUTOFFS.week,  label: t.market.contSeeWeek },  { w: "all", cut: null, label: t.market.contSeeAll }],
      week:  [{ w: "all",   cut: null,               label: t.market.contSeeAll }],
    };
    const links = WIDER[whenId]
      .filter((c) => within(c.cut) > here)
      .map((c) => ({ href: widerHref(c.w), label: c.label }));
    if (links.length > 0) {
      const lead = whenId === "today" ? t.market.contTodayLead : whenId === "soon" ? t.market.contSoonLead : t.market.contWeekLead;
      continuation = { lead, links };
    }
  }

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
              timeLeft={isSelectionClosed(m) ? t.market.waitingForResults : timeLeftStr(m.selectionClosedAt ?? m.resolutionAt)}
              status="LIVE"
              selectionClosed={isSelectionClosed(m)}
              sourceUrl={m.sourceUrl}
              spark={cc.spark}
              move24h={cc.move24h}
              traders={traderMap.get(m.id)}
              comments={commentCounts.get(m.id) ?? 0}
              featured={m.id === featuredId}
            />
          );
        })}
        {live.length === 0 && (
          <LiveEmptyState
            searching={searching}
            qRaw={qRaw}
            whenId={whenId}
            activeCat={cat ?? "all"}
            categoryLiveCount={bettable.length}
            anyLiveAnyCat={effectiveCat ? totalLive > 0 : bettable.length > 0}
          />
        )}
      </section>

      {/* Pagination — shared platform pager (live grid) */}
      {totalLivePages > 1 && (
        <div className="mt-6 rounded-lg border border-border bg-bg-elevated/40 overflow-hidden">
          <Pagination total={totalLiveCount} page={safePage} perPage={PLAYER_PER_PAGE} baseHref={marketsBaseHref} ofLabel={t.common.of} prevLabel={t.common.previousPage} nextLabel={t.common.nextPage} />
        </div>
      )}

      {/* Sparse-board continuation — a calm "see wider" nudge (mutually
          exclusive with the pager: this shows only on a single-page board). */}
      {continuation && (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-lg border border-border/70 bg-bg-elevated/40 px-4 py-4 text-center sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:text-left">
          <p className="min-w-0 font-mono text-[12.5px] text-text-muted">{continuation.lead}</p>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:shrink-0 sm:justify-end">
            {continuation.links.map((l) => (
              <Link key={l.href} href={l.href as never} className="btn btn-ghost btn-sm whitespace-nowrap">
                {l.label} <span aria-hidden="true" className="ml-1">→</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── New markets ──
          Freshly-listed markets the active time window leaves out. A SEPARATE,
          LABELLED section — never an injection into the filtered grid above, so
          that grid keeps meaning exactly what the filter says. Real markets or
          this section does not render at all; there is no placeholder here. */}
      {newMarkets.length > 0 && (
        <section className="mt-10" aria-labelledby="new-markets-heading">
          <div className="board-section-head">
            <div>
              <p className="board-section-eyebrow">{t.market.justListed}</p>
              <h2 id="new-markets-heading" className="font-display text-[20px] font-semibold text-text">
                {t.market.newMarkets}
              </h2>
            </div>
            <Link href={"/markets?when=new" as never} className="font-mono text-[11.5px] font-semibold text-brand-300 hover:text-text transition-colors whitespace-nowrap">
              {t.market.seeAllNew}
            </Link>
          </div>
          <div className="market-grid">
            {newMarkets.map((m) => (
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
                timeLeft={isSelectionClosed(m) ? t.market.waitingForResults : timeLeftStr(m.selectionClosedAt ?? m.resolutionAt)}
                status="LIVE"
                selectionClosed={isSelectionClosed(m)}
                sourceUrl={m.sourceUrl}
                spark={(newCharts.get(m.id) ?? { spark: [] }).spark}
              />
            ))}
          </div>
        </section>
      )}

      {resolved.length > 0 && (
        <section className="mt-10">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 className="font-display text-[20px] font-semibold text-text">
              {searching ? `${t.market.marketsMatch}` : t.market.recentlyResolved}
            </h2>
            <Link href={"/results" as never} className="font-mono text-[11.5px] font-semibold text-brand-300 hover:text-text transition-colors whitespace-nowrap">
              {t.market.allResults}
            </Link>
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
                resolvedOutcome={m.resolvedOutcome}
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

async function LiveEmptyState({
  searching,
  qRaw,
  whenId,
  activeCat,
  categoryLiveCount,
  anyLiveAnyCat,
}: {
  searching: boolean;
  qRaw: string;
  whenId: WhenFilter;
  activeCat: string;
  /** Live markets in the ACTIVE category, ignoring the time window. */
  categoryLiveCount: number;
  /** Any live market exists (this category, or any category). */
  anyLiveAnyCat: boolean;
}) {
  const { t } = await getServerT();
  // A NARROWED window can still be empty while markets exist further out (the
  // default `all` cannot be — see DEFAULT_WHEN). Distinguish the three real causes
  // so the CTA never loops back to empty:
  //   1. time window too tight (markets exist in this category, just later)
  //   2. category has none (but other categories are live)
  //   3. platform genuinely has no live markets
  const timeWindowTooTight = !searching && categoryLiveCount > 0 && whenId !== "all";
  const categoryEmpty = !searching && categoryLiveCount === 0 && activeCat !== "all" && anyLiveAnyCat;
  const noMarketsAtAll = !searching && !timeWindowTooTight && !categoryEmpty;

  // Widen to when=all — guaranteed non-empty (categoryLiveCount > 0). Keep the
  // category so the player stays in the topic they picked.
  const showAllHref = `/markets?when=all${activeCat !== "all" ? `&cat=${activeCat}` : ""}`;
  // Drop the category too — show every live market when the topic itself is empty.
  const allCatsHref = "/markets?when=all";

  const title =
    searching ? `${t.market.noLiveMatch} "${qRaw}"`
    : timeWindowTooTight ? t.market.noMarketsInWindow
    : categoryEmpty ? t.market.noMarketsInCat
    : t.market.noMarketsAvailable;
  const body =
    searching ? t.market.checkSpelling
    : timeWindowTooTight ? t.market.noMarketsInWindowBody
    : categoryEmpty ? t.market.noMarketsInCatBody
    : t.market.noMarketsAvailableBody;
  const action =
    searching ? <Link href="/markets" className="btn btn-ghost btn-sm">{t.market.clearSearchLabel}</Link>
    : timeWindowTooTight ? <Link href={showAllHref as never} className="btn btn-primary btn-sm">{t.market.showAllOpen}</Link>
    : categoryEmpty ? <Link href={allCatsHref as never} className="btn btn-ghost btn-sm">{t.market.seeAllCategories}</Link>
    : undefined;

  return (
    <div className="col-span-full">
      <EmptyState kind="markets" title={title} body={body} action={action} />
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
