/**
 * /watchlist (F3) — the markets a player follows.
 *
 * Real data only: the grid is exactly the player's starred markets. An empty
 * watchlist shows an honest empty-state, never filler suggestions.
 *
 * ⭐ THE PLAYER QUERY CAMPAIGN, TASK 4.3. This page had NO controls whatsoever — no
 * `searchParams`, no filter, no sort, no pager — so a market that settled a month ago sat in the
 * grid between two that are still taking bets with nothing to separate them. That is the
 * campaign's complaint stated as literally as any page states it, and it is the only player board
 * that spans the WHOLE lifecycle: `/markets` reads the unsettled book and `/results` the terminal
 * archive, but a star survives settlement, so this grid holds both halves at once.
 *
 * 🔴 AND ITS READ WAS UNBOUNDED, ON A PAGE THAT POLLS. `listMarkets({ productLine: "ALL" })` has
 * no limit and no status filter — the ~13,000-row table `MarketStore.attribution` measures at
 * 2,534 ms for one such read — and `RefreshPoller` re-paid it every 20 SECONDS per open tab, to
 * keep a handful of starred rows and throw the rest away. It is now one indexed read of exactly
 * the starred ids (`playerMarketsByIds`). ⚠️ That door applies `isDemoMarket` itself, so the
 * behaviour `listMarkets` gave for free — demo fixtures hidden from every player listing — is
 * preserved rather than quietly repealed by the optimisation.
 */
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterPill } from "@/components/ui/filter-pill";
import { MarketCard } from "@/components/markets/market-card";
import { Pagination, PLAYER_PER_PAGE } from "@/components/ui/pagination";
import { SearchBox } from "@/components/ui/search-box";
import { getSession } from "@/lib/server/session";
import { listWatchedMarketIds } from "@/lib/server/watchlist-service";
import { playerMarketsByIds, impliedYesPct, isClosedByTime, isSelectionClosed } from "@/lib/server/market-service";
import { RefreshPoller } from "@/components/ui/refresh-poller";
import { getServerT } from "@/lib/i18n-server";
import { outcomeWord } from "@/lib/side-label";
import { formatDateTime } from "@/lib/utils";
import { PageContainer } from "@/components/layout/page-container";
import { parseQuery, matchesQuery, fieldNames, MARKET_SEARCH } from "@/lib/search";
import { WatchlistBar, type FollowCounts } from "./watchlist-bar";
import {
  buildFollowHref,
  filterFollow,
  followCounts,
  followEmptyCause,
  followExits,
  parseFollowParams,
  sortFollow,
  type FollowRow,
  type FollowState,
} from "@/lib/watchlist/following";

// Localised tab title (POLISH-BACKLOG §1.7) — was the hard-coded English
// "Watchlist", which a Swahili player saw in their browser tab and history.
export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.watchlist.title };
}
export const dynamic = "force-dynamic";

const PER_PAGE = PLAYER_PER_PAGE;

export default async function WatchlistPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { t } = await getServerT();
  const session = await getSession();
  if (!session) redirect("/auth/login?next=/watchlist");

  const sp = (await searchParams) ?? {};
  const state = parseFollowParams(sp);
  const pageNum = Math.max(1, parseInt(String(sp.page ?? "1"), 10) || 1);

  // B-1 — no swallow: the starred set IS this page; a failed read must throw to
  // watchlist/error.tsx, never render "your watchlist is empty" over real stars.
  const ids = await listWatchedMarketIds(session.userId);
  // ⭐ ONE INDEXED READ OF EXACTLY THESE IDS — see the header note. B-17's reasoning stands
  // (one read beats an N+1 `getMarket` fan-out); what it lacked was a read scoped to the ids.
  // B-1 — no swallow here either: this read hydrates every starred card, so its
  // failure also fabricated the empty state.
  const byId = await playerMarketsByIds(ids);
  const markets = ids.map((id) => byId.get(id)).filter((m): m is NonNullable<typeof m> => !!m);

  /**
   * ⚠️ `starRank` IS DERIVED FROM POSITION IN `ids`, WHICH IS "NEWEST STAR FIRST". Higher means
   * more recently starred, so the default `desc` reproduces today's order exactly. ⛔ It is a
   * rank, not a date — `listWatchedMarketIds` returns ids and nothing else, so there is no star
   * timestamp on this path and nothing may present one.
   *
   * ⭐ `selectionClosed` IS COMPUTED ONCE AND FED TO BOTH the lens predicates and the card, so a
   * pill and the chip on the card it filters to cannot disagree — the defect `market-card.tsx`
   * records `/markets` having shipped.
   */
  const n = markets.length;
  const rows: FollowRow[] = markets.map((m, i) => {
    const resolved = m.status === "RESOLVED" || m.status === "VOIDED";
    return {
      id: m.id,
      category: m.category,
      status: m.status,
      selectionClosed: !resolved && (isSelectionClosed(m) || isClosedByTime(m)),
      volume: m.yesPool + m.noPool,
      predictors: m.predictorCount,
      resolutionAtMs: Date.parse(m.resolutionAt) || 0,
      starRank: n - i,
      titleEn: m.titleEn,
      titleSw: m.titleSw ?? "",
      titleZh: m.titleZh ?? "",
      criterion: m.resolutionCriterion ?? "",
    };
  });

  /**
   * ⛔ THROUGH THE SHARED GRAMMAR, NEVER A HAND-ROLLED `.includes()`. `test:search-adoption`
   * refuses one, and it is right to: `MARKET_SEARCH` is what gives a player `cat:sports`, quoted
   * phrases and a search that spans all three title columns, so a Swahili reader can still type an
   * English team name and find their own starred market.
   */
  const parsed = parseQuery(state.q, { fields: fieldNames(MARKET_SEARCH) });
  const matchesRow = (row: FollowRow) =>
    matchesQuery(parsed, row as unknown as Record<string, string | null | undefined>, MARKET_SEARCH);

  const counts = followCounts(rows, state, matchesRow) as FollowCounts;
  const matched = sortFollow(filterFollow(rows, state, matchesRow), state);

  // Paginate. ⛔ ONE `totalCount`, shared by the bar, the sheet's apply button and the pager —
  // never recomputed per consumer (query-bar.tsx's `QueryResultCount` note).
  const totalCount = matched.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PER_PAGE));
  const safePage = Math.min(pageNum, totalPages);
  const paged = matched.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);
  const marketById = new Map(markets.map((m) => [m.id, m] as const));

  const baseHref = buildFollowHref(state);
  const cause = followEmptyCause(state, matchesRow, totalCount, rows.length);
  const exits = cause && cause !== "no-rows" ? followExits(rows, state, matchesRow) : [];
  const EXIT_LABEL: Record<string, string> = {
    cat: t.market.catAll,
    q: t.common.clearSearch,
    lens: t.common.all,
  };

  /**
   * ⭐ FOUR EMPTY CAUSES, FOUR DIFFERENT SENTENCES. The page had ONE — *"You're not following any
   * markets"* — which was correct for a new player and a lie for everyone else: a player following
   * eleven markets who pressed "Resolved" before any had settled was told they follow nothing at
   * all, and the star they were looking at was still on the market.
   *
   * ⛔ `lens-empty` IS THE ORDINARY CASE HERE, NOT AN ERROR. Three of the five lenses are empty on
   * a healthy short list, so that copy states a fact about the lifecycle rather than a failure.
   */
  const emptyTitle =
    cause === "no-rows" ? t.watchlist.emptyTitle
    : cause === "search-miss" ? `${t.results.noResultsMatch} "${state.q}"`
    : cause === "lens-empty" ? t.watchlist.lensEmptyTitle
    : t.market.filterMissTitle;
  const emptyBody =
    cause === "no-rows" ? t.watchlist.emptyBody
    : cause === "search-miss" ? t.results.tryDifferentKeywords
    : cause === "lens-empty" ? t.watchlist.lensEmptyBody
    : t.market.filterMissBody;

  return (
    <PageContainer tier="board" className="space-y-5">
      {/* B-17 — the watchlist is a "what's moving" surface; it polled never.
          Same cadence as wallet/positions (pauses when the tab is hidden).
          ⭐ It is no longer expensive: the read behind it is now scoped to the starred ids. */}
      <RefreshPoller intervalMs={20_000} />
      <PageHeader tone="info" icon={<I.star s={22} />} eyebrow={t.watchlist.eyebrow} title={t.watchlist.title} />

      {/* ⛔ THE CONTROLS ARE WITHHELD ON A GENUINELY EMPTY WATCHLIST, and only then. A bar of five
          pills all reading 0 above "you're not following any markets" is five controls that cannot
          do anything — §A5's rule that a section with nothing to show gets no rail. Every other
          empty state keeps the bar, because there the bar is the way OUT of the empty state. */}
      {rows.length > 0 && (
        <>
          <div className="sticky top-[56px] z-20 bg-bg-base py-2.5">
            <Suspense>
              <SearchBox
                placeholder={t.common.searchMarkets}
                ariaLabel={t.common.searchMarkets}
                helpFields={fieldNames(MARKET_SEARCH)}
              />
            </Suspense>
          </div>
          <WatchlistBar state={state} counts={counts} resultCount={totalCount} t={t} />
        </>
      )}

      {/* Per-cause exit, carrying a REAL count — every count is cross-filtered, so no exit
          offered here can lead to another empty page. */}
      {totalCount === 0 && exits.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {exits.map((e) => (
            <FilterPill
              key={e.id}
              scroll={false}
              href={buildFollowHref(state, e.patch)}
              label={EXIT_LABEL[e.id] ?? e.id}
              count={e.count}
              on={false}
              glyph={e.id === "cat" ? <I.layoutGrid s={14} className="shrink-0 opacity-70" /> : undefined}
            />
          ))}
        </div>
      )}

      {paged.length === 0 ? (
        <EmptyState
          kind="markets"
          title={emptyTitle}
          body={emptyBody}
          action={
            cause === "no-rows" ? (
              <Link href={"/markets" as never} className="btn btn-primary btn-sm">{t.watchlist.browseMarkets}</Link>
            ) : (
              <Link href={buildFollowHref(state, { lens: "all", cat: "all", q: "" })} className="btn btn-ghost btn-sm">
                {t.common.clearAll}
              </Link>
            )
          }
        />
      ) : (
        <>
          <section className="market-grid">
            {paged.map((row) => {
              const m = marketById.get(row.id)!;
              const resolved = m.status === "RESOLVED" || m.status === "VOIDED";
              // §L3 — this read "Imetatuliwa YES" / "已结算 YES": a translated label closing
              // around the stored token. The VOID arm was already localised, which is what made
              // the other two stand out. `outcomeWord` covers all three.
              const timeLeft = resolved
                ? (m.resolvedOutcome === "VOID" ? t.common.voided : `${t.market.resolvedOutcome} ${outcomeWord(t, m.resolvedOutcome ?? "VOID", m.productLine)}`)
                : formatDateTime(m.resolutionAt);
              return (
                // ⛔ NO `data-row-id` WRAPPER HERE, AND THAT IS CHECKED RATHER THAN ASSUMED:
                //    `market-card.tsx:509` already emits `data-row-id={id}` on the card's own
                //    root. A wrapper carrying it too would put TWO matching nodes in the DOM per
                //    market — `qa:player-filters`' set arithmetic would survive it (a set
                //    de-duplicates) but any instrument that COUNTS `[data-row-id]` would report
                //    exactly double, which is the `/results` "promised 8, delivered 5" defect
                //    with its sign reversed.
                <MarketCard
                  key={m.id}
                  productLine={m.productLine}
                  id={m.id}
                  titleEn={m.titleEn}
                  titleSw={m.titleSw}
                  titleZh={m.titleZh}
                  category={m.category}
                  yesPct={impliedYesPct(m)}
                  volume={m.yesPool + m.noPool}
                  predictors={m.predictorCount}
                  timeLeft={timeLeft}
                  status={m.status === "VOIDED" ? "VOIDED" : m.status === "RESOLVED" ? "RESOLVED" : m.status}
                  resolvedOutcome={m.resolvedOutcome}
                  // ⭐ THE SAME BOOLEAN THE LENS PREDICATE READ — see `rows` above.
                  selectionClosed={row.selectionClosed}
                  sourceUrl={m.sourceUrl}
                />
              );
            })}
          </section>

          {totalPages > 1 && (
            <div className="rounded-lg border border-border bg-bg-elevated/40 overflow-hidden">
              <Pagination
                total={totalCount}
                page={safePage}
                perPage={PER_PAGE}
                baseHref={baseHref}
                ofLabel={t.common.of}
                prevLabel={t.common.previousPage}
                nextLabel={t.common.nextPage}
                firstLabel={t.common.firstPage}
                lastLabel={t.common.lastPage}
              />
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
}
