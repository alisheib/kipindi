import { Suspense, cache } from "react";
import { fill } from "@/lib/utils";
import Link from "next/link";
import { SignalPip } from "@/components/brand";
import { MarketCard } from "@/components/markets/market-card";
import {
  listMarkets,
  impliedYesPct,
  isClosedByTime,
  isSelectionClosed,
  traderSeedsByMarket,
  MARKET_CATEGORIES,
  type MarketCategory,
} from "@/lib/server/market-service";
import { getCardCharts } from "@/lib/server/market-history";
import { countCommentsByMarkets } from "@/lib/server/comments-store";
import { getServerT } from "@/lib/i18n-server";
import { getSession } from "@/lib/server/session";
import { listWatchedMarketIds } from "@/lib/server/watchlist-service";

import { EmptyState } from "@/components/ui/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { Pagination, PLAYER_PER_PAGE } from "@/components/ui/pagination";
import { SearchBox } from "@/components/ui/search-box";
import { parseQuery, matchesQuery, fieldNames, MARKET_SEARCH } from "@/lib/search";
import { RefreshPoller } from "@/components/ui/refresh-poller";
import { DiscoveryBar, type DiscoveryCounts } from "@/components/markets/discovery-bar";
import { MARKET_CARD_H } from "@/components/markets/card-geometry";
import {
  ODDS_IDS,
  POOL_IDS,
  STATUS_IDS,
  buildDiscoveryHref,
  countFor,
  emptyCause,
  matchesStatus,
  filterRows,
  parseDiscoveryParams,
  relaxations,
  sortRows,
  type DiscoveryRow,
  type DiscoveryState,
  type RelaxationId,
} from "@/lib/markets/discovery";

export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.market.title };
}
export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

/**
 * ⭐ ONE BOARD READ PER REQUEST (B-17). The header figure, every control's count and the grid
 * all consume this same array; each used to run its own query (up to four board fetches per
 * render). `cache()` dedupes across the page's streamed sections within one request render.
 *
 * ⛔ B-1 — NO SWALLOW. The page cannot distinguish "no live markets" from "read failed", so a
 * failed board read must throw to `markets/error.tsx`. It must never render an empty board.
 * (The enrichments below — traders, charts, comments — DO degrade with `.catch()`: their
 * absence garnishes a card, it never mimics an empty board.)
 *
 * ⚠️ The read now spans LIVE ∪ CLOSED, because `All` is the UNSETTLED book (PLAN-OF-RECORD
 * §8.2). `isClosedByTime` still gates LIVE rows: a LIVE market past its settlement clock is in
 * the resolver queue, not on the board. CLOSED rows are admitted deliberately — CLOSED appears
 * on no other player discovery surface.
 *
 * ⛔ productLine stays the MARKET default. `test:product-line` lists this file as
 * MUST_STAY_DEFAULT: opting into "ALL" would flood the board with Up & Down rounds (~300k/yr).
 */
const getBoard = cache(async () => {
  const [live, closed] = await Promise.all([
    listMarkets({ status: "LIVE" }),
    listMarkets({ status: "CLOSED" }),
  ]);
  return [...live.filter((m) => !isClosedByTime(m)), ...closed];
});

const getWatchedIds = cache(async (userId: string | null): Promise<Set<string>> => {
  if (!userId) return new Set();
  return new Set(await listWatchedMarketIds(userId).catch(() => []));
});

type BoardMarket = Awaited<ReturnType<typeof getBoard>>[number];

/**
 * Decorate a stored market into the shape the pure contract reasons about.
 *
 * ⚠️ `yesPct` is null on an empty pool. `impliedYesPct` returns a hardcoded 50 when nobody has
 * staked (`market-service.ts:232-236`) — passing that into an odds bucket would file a
 * cold-start market under "Close call · 40–60%" on a number nobody produced.
 *
 * ⚠️ `bettableUntilMs` is `selectionClosedAt ?? resolutionAt` — the deadline the CARD shows.
 * The board once sorted and windowed by `resolutionAt` while every card stated
 * time-to-betting-close, so the board contradicted its own cards.
 */
function toRow(m: BoardMarket, watched: Set<string>, move24h: number | undefined): DiscoveryRow {
  const pool = m.yesPool + m.noPool;
  return {
    id: m.id,
    category: m.category,
    pool,
    predictors: m.predictorCount,
    yesPct: pool > 0 ? impliedYesPct(m) : null,
    move24h,
    createdAtMs: Date.parse(m.createdAt),
    bettableUntilMs: Date.parse(m.selectionClosedAt ?? m.resolutionAt),
    selectionClosed: isSelectionClosed(m),
    status: m.status as DiscoveryRow["status"],
    watched: watched.has(m.id),
  };
}

export default async function MarketsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { t } = await getServerT();
  const board = await getBoard();

  /**
   * 🔴 THE HEADER COUNTS THE SET IT NAMES, AND NOTHING WIDER.
   *
   * The word here is "live", so it counts markets a player can act on — the SAME predicate the
   * `Open` segment uses, read from the same place. It deliberately does NOT count the whole
   * board: the board now spans LIVE ∪ CLOSED (because `All` is the unsettled book), and a
   * header reading "49 live" over a book containing three settled-and-waiting markets would be
   * false in the exact way that shipped once already — "40 live · TZS 1,659k in play" printed
   * above a grid of ZERO cards, at nine of nine viewport × locale combinations. The number was
   * factually true of *something*; it just was not true of what the sentence claimed.
   *
   * ⛔ `matchesStatus` is imported rather than re-expressed. A second copy of "open" here is
   * how the header and the segment start disagreeing.
   */
  const NO_WATCH = new Set<string>();
  const nowMs = Date.now();
  const openMarkets = board.filter((m) => matchesStatus(toRow(m, NO_WATCH, undefined), "open", nowMs));
  const openVolume = openMarkets.reduce((s, m) => s + m.yesPool + m.noPool, 0);

  return (
    <PageContainer tier="board">
      {/* Accessible page heading (WCAG 1.3.1 / 2.4.6). Visually hidden — the design uses a
          slim content-first header, not a marketing H1. */}
      <h1 className="sr-only">{t.market.title}</h1>
      {/* Odds, volumes and time-left stay current without an F5. Pauses when backgrounded. */}
      <RefreshPoller intervalMs={30_000} />

      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-subtle">
          {t.market.title}
        </p>
        {/* Aqua (not gilt) by design: gold is reserved for earned-money moments. */}
        <p className="flex items-center gap-1.5 whitespace-nowrap font-mono text-[12.5px] tabular-nums">
          <SignalPip size={7} className="mr-0.5" />
          <span className="font-semibold text-text">{openMarkets.length}</span>
          <span className="text-text-subtle">{t.market.liveCount}</span>
          <span className="text-border-strong">·</span>
          <span className="font-semibold text-text">TZS {(openVolume / 1000).toFixed(0)}k</span>
          <span className="text-text-subtle">{t.market.tzsInPlay}</span>
        </p>
      </div>

      <SearchBox
        placeholder={t.common.searchMarkets}
        ariaLabel={t.common.searchMarkets}
        helpFields={fieldNames(MARKET_SEARCH)}
      />

      <Suspense fallback={<GridSkeleton />}>
        <DiscoveryBoard searchParams={searchParams} />
      </Suspense>
    </PageContainer>
  );
}

async function DiscoveryBoard({ searchParams }: { searchParams: Promise<SP> }) {
  const { t } = await getServerT();
  const sp = await searchParams;
  const session = await getSession().catch(() => null);
  const userId = session?.userId ?? null;

  const state = parseDiscoveryParams(sp, MARKET_CATEGORIES);
  const board = await getBoard();
  const watched = await getWatchedIds(userId);
  const now = Date.now();

  // The shared search grammar (src/lib/search) — quoted phrase, -exclude, field:. Injected into
  // the contract rather than reimplemented there, so there is one definition of matching.
  const parsed = parseQuery(state.q, { fields: fieldNames(MARKET_SEARCH) });
  const byId = new Map(board.map((m) => [m.id, m] as const));
  const matchesText = (r: DiscoveryRow) => {
    const m = byId.get(r.id);
    return m ? matchesQuery(parsed, m as unknown as Record<string, string | null | undefined>, MARKET_SEARCH) : false;
  };

  /**
   * `Biggest move` needs a board-wide `move24h`, not one scoped to the rendered page — a sort
   * cannot rank rows it has no value for. Fetched ONLY for that sort, so the ordinary board
   * still pays for the cards it draws. A-5: absent stays absent and is partitioned last by the
   * comparator; it is never coerced to 0.
   */
  const moveMap =
    state.sort === "move"
      ? await getCardCharts(board.map((m) => m.id)).catch(() => new Map())
      : new Map();

  const rows = board.map((m) => toRow(m, watched, moveMap.get(m.id)?.move24h));

  // Counts are CROSS-FILTERED — the number beside a control is what pressing it would yield.
  const counts: DiscoveryCounts = {
    status: Object.fromEntries(
      STATUS_IDS.map((s) => [s, countFor(rows, state, now, matchesText, { status: s })]),
    ) as DiscoveryCounts["status"],
    odds: Object.fromEntries(
      ODDS_IDS.map((o) => [o, countFor(rows, state, now, matchesText, { odds: o })]),
    ) as DiscoveryCounts["odds"],
    pool: Object.fromEntries(
      POOL_IDS.map((p) => [p, countFor(rows, state, now, matchesText, { pool: p })]),
    ) as DiscoveryCounts["pool"],
    topic: Object.fromEntries(
      ["all", ...MARKET_CATEGORIES].map((c) => [c, countFor(rows, state, now, matchesText, { topic: c })]),
    ),
  };

  const matched = sortRows(filterRows(rows, state, now, matchesText), state);

  // Paging. The pager total IS the bar's result count — same variable, never recomputed.
  const pageNum = Math.max(1, parseInt(String(sp.page ?? "1"), 10) || 1);
  const totalPages = Math.max(1, Math.ceil(matched.length / PLAYER_PER_PAGE));
  const safePage = Math.min(pageNum, totalPages);
  const paged = matched.slice((safePage - 1) * PLAYER_PER_PAGE, safePage * PLAYER_PER_PAGE);

  const topics = [
    { id: "all", label: t.market.catAll },
    ...MARKET_CATEGORIES.map((c) => ({ id: c, label: CATEGORY_LABEL(t, c) })),
  ];

  // 🔴 "RECENTLY RESOLVED" ONCE SHOWED THE OLDEST RESULTS ON THE PLATFORM, FOREVER.
  // `listMarkets` orders `resolutionAt: "asc"` because that is right for a LIVE board — soonest
  // to close, first. Slicing that ascending list for RESOLVED rows pins the three that resolved
  // EARLIEST in the platform's history. Measured on production 2026-08-10: three markets from
  // 5 July offered as "recently resolved" while markets settled on 1–2 August sat below them.
  // ⛔ Never slice a board-ordered list for a "recent" section — re-sort by the clock the
  // section names. It stays a strip BELOW the grid: `All` is the unsettled book, and the
  // settled archive is /results.
  const resolvedAll = (await listMarkets({ status: "RESOLVED" }).catch(() => []))
    .slice()
    .sort((a, b) => b.resolutionAt.localeCompare(a.resolutionAt));
  const searching = parsed.mode !== "empty";
  const resolved = searching
    ? resolvedAll.filter((m) => matchesQuery(parsed, m as unknown as Record<string, string | null | undefined>, MARKET_SEARCH)).slice(0, 6)
    : resolvedAll.slice(0, 3);

  const drawIds = [...paged.map((r) => r.id), ...resolved.map((m) => m.id)];
  // B-1 — deliberate degrade: these are garnish on the cards, never the board itself.
  const traderMap = await traderSeedsByMarket(drawIds).catch(() => new Map());
  const cardCharts = await getCardCharts(drawIds).catch(() => new Map());
  const commentCounts = await countCommentsByMarkets(drawIds).catch(() => new Map<string, number>());

  const cause = emptyCause(state, matched.length, board.length);

  function timeLeftStr(iso: string): string {
    const ms = Date.parse(iso) - Date.now();
    if (ms <= 0) return t.market.closed;
    const d = Math.floor(ms / (24 * 3600_000));
    if (d > 0) return fill(t.market.timeLeftD, { n: d });
    const h = Math.floor(ms / 3600_000);
    if (h > 0) return fill(t.market.timeLeftH, { n: h });
    return fill(t.market.timeLeftM, { n: Math.floor(ms / 60_000) });
  }

  return (
    <>
      <DiscoveryBar
        state={state}
        counts={counts}
        resultCount={matched.length}
        topics={topics}
        t={t}
        signedIn={!!userId}
      />

      <section data-board="grid" className="market-grid mt-3">
        {paged.map((r) => {
          const m = byId.get(r.id)!;
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
              timeLeft={
                r.selectionClosed ? t.market.waitingForResults : timeLeftStr(m.selectionClosedAt ?? m.resolutionAt)
              }
              status={m.status === "CLOSED" ? "CLOSED" : "LIVE"}
              selectionClosed={r.selectionClosed}
              sourceUrl={m.sourceUrl}
              spark={cc.spark}
              move24h={cc.move24h}
              traders={traderMap.get(m.id)}
              comments={commentCounts.get(m.id) ?? 0}
            />
          );
        })}
        {cause && <BoardEmptyState cause={cause} state={state} rows={rows} now={now} matchesText={matchesText} t={t} />}
      </section>

      {totalPages > 1 && (
        <div className="mt-6 overflow-hidden rounded-lg border border-border bg-bg-elevated/40">
          <Pagination
            total={matched.length}
            page={safePage}
            perPage={PLAYER_PER_PAGE}
            baseHref={buildDiscoveryHref(state)}
            ofLabel={t.common.of}
            prevLabel={t.common.previousPage}
            nextLabel={t.common.nextPage}
          />
        </div>
      )}

      {resolved.length > 0 && (
        <section className="mt-10">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 className="font-display text-[20px] font-semibold text-text">
              {searching ? t.market.marketsMatch : t.market.recentlyResolved}
            </h2>
            <Link
              href={"/results" as never}
              className="whitespace-nowrap font-mono text-[11.5px] font-semibold text-brand-300 transition-colors hover:text-text"
            >
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

function CATEGORY_LABEL(t: Awaited<ReturnType<typeof getServerT>>["t"], c: MarketCategory): string {
  const map: Record<MarketCategory, string> = {
    sports: t.market.catSports,
    macro: t.market.catMacro,
    weather: t.market.catWeather,
    crypto: t.market.catCrypto,
    culture: t.market.catCulture,
    tech: t.market.catTech,
    other: t.market.catOther,
  };
  return map[c];
}

/**
 * The board is empty for one of four genuinely different reasons, and each gets its own exit.
 *
 * ⛔ Never one generic message with one generic CTA. Three compensations for the 2026-08-10
 * empty board all failed because they sat downstream of the thing that emptied it — the
 * see-wider nudge in particular required `live.length > 0`, so it switched off exactly when the
 * board was emptiest. Every exit here carries a REAL count and is offered only when that count
 * is greater than zero, so an exit can never lead to another empty board.
 */
function BoardEmptyState({
  cause,
  state,
  rows,
  now,
  matchesText,
  t,
}: {
  cause: NonNullable<ReturnType<typeof emptyCause>>;
  state: DiscoveryState;
  rows: DiscoveryRow[];
  now: number;
  matchesText: (r: DiscoveryRow) => boolean;
  t: Awaited<ReturnType<typeof getServerT>>["t"];
}) {
  const RELAX_LABEL: Record<RelaxationId, string> = {
    pool: t.market.relaxPool,
    odds: t.market.relaxOdds,
    topic: t.market.relaxTopic,
    q: t.market.relaxQuery,
    status: t.market.relaxStatus,
  };

  const title =
    cause === "search-miss" ? `${t.market.noLiveMatch} "${state.q}"`
    : cause === "watching-empty" ? t.market.watchingEmptyTitle
    : cause === "no-inventory" ? t.market.noMarketsAvailable
    : t.market.filterMissTitle;
  const body =
    cause === "search-miss" ? t.market.checkSpelling
    : cause === "watching-empty" ? t.market.watchingEmptyBody
    : cause === "no-inventory" ? t.market.noMarketsAvailableBody
    : t.market.filterMissBody;

  // An empty PLATFORM is not the filters' fault and must not offer to widen them.
  const exits = cause === "no-inventory" ? [] : relaxations(rows, state, now, matchesText);

  return (
    <div className="col-span-full">
      <EmptyState
        kind="markets"
        title={title}
        body={body}
        action={
          exits.length > 0 ? (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {exits.map((r, i) => (
                <Link
                  key={r.id}
                  href={buildDiscoveryHref(state, r.patch) as never}
                  replace
                  scroll={false}
                  className={`btn btn-sm ${i === 0 ? "btn-primary" : "btn-ghost"}`}
                >
                  {RELAX_LABEL[r.id]}
                  <span className="ml-1.5 font-mono text-[11px] tabular-nums opacity-80">{r.count}</span>
                </Link>
              ))}
            </div>
          ) : undefined
        }
      />
    </div>
  );
}

/**
 * THE skeleton a visitor actually sees — the grid is inside a Suspense boundary and this is
 * what the first HTML response carries. (`loading.tsx` only paints on a client-side navigation
 * into the route.) Height and count are pinned to the real values: `MARKET_CARD_H` is the one
 * shared definition, and the count comes from `PLAYER_PER_PAGE` rather than being re-typed, so
 * a page-size change moves both together.
 */
function GridSkeleton() {
  return (
    <div className="market-grid mt-3" aria-hidden>
      {Array.from({ length: PLAYER_PER_PAGE }).map((_, i) => (
        <div
          key={i}
          className="kp-shimmer-track overflow-hidden rounded-md border border-border bg-bg-elevated"
          style={{ height: MARKET_CARD_H }}
        >
          <div className="space-y-3 p-4">
            <div className="flex items-center gap-2">
              <div className="h-5 w-12 rounded-pill bg-bg-overlay" />
              <div className="h-5 w-16 rounded-pill bg-bg-overlay" />
            </div>
            <div className="h-4 w-3/4 rounded bg-bg-overlay" />
            <div className="h-4 w-1/2 rounded bg-bg-overlay" />
            {/* The real card carries a probability block, the tipping bar, a trader row and the
                money buttons between the title and the footer. Reserving them keeps the INTERNAL
                rhythm honest too, not just the outer box. */}
            <div className="mt-4 h-8 w-20 rounded bg-bg-overlay" />
            <div className="mt-4 h-[7px] w-full rounded-pill bg-bg-overlay" />
            <div className="mt-3 h-5 w-32 rounded bg-bg-overlay" />
            <div className="mt-3 flex gap-2">
              <div className="h-9 flex-1 rounded-md bg-bg-overlay" />
              <div className="h-9 flex-1 rounded-md bg-bg-overlay" />
            </div>
            <div className="mt-3 h-4 w-24 rounded bg-bg-overlay" />
          </div>
        </div>
      ))}
    </div>
  );
}
