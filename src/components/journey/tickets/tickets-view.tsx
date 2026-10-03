/**
 * TIKETI ZANGU — the journey's view of `/positions` (the Vodacom plan S6, SJ-16 and SJ-19; S6-PLAN WP9 step 2 as
 * amended by A7, A15 and A19; the S4 frames s4-9-tiketi-open, -settled and -empty, drawn in the kit's tokens).
 *
 * In the canvas's order: the page's name and the Maswali | Juu/Chini switch, the seven lenses, the tickets and the
 * pager; then, quietly, the Utendaji link. An empty list names its cause and offers its way out.
 *
 * ⛔ IT READS NOTHING. `/positions` has read every position, every market and every open exit's live value — its
 * pricing inputs stay on the page (`test:journey-tickets` §8) — and hands this view the results; the view only chooses
 * and draws.
 * ⛔ THE LENS IS ITS ONE AXIS (VODACOM-PLAN §0h point 23). Search and sort are shelved for preview viewers (A19, §0h
 * point 11), and the side, topic and window groups are the bar's row 2, which the journey's bar does not draw (WP9 step
 * 5) — so the list is cut by the lens alone, through the same portfolio rules the classic page runs
 * (`lib/positions/portfolio.ts`), and a link carrying the others shows that lens's whole list.
 * ⛔ NO "NAFASI", AND NO CHINESE "HOLDINGS" (A7; §0h point 27): an empty outcome lens reads the journey's own copies of
 * the classic sentences, `journey.ticketsEmptySettled` and its three siblings — the same words in Swahili and English,
 * and the ticket's word in Chinese where the classic line says holdings.
 * ⭐ It refreshes and scrolls exactly as the classic page does: `RefreshPoller` every 20 s, and `HashFocus` for a
 * ticket's fragment, which lands on the card carrying that id (`test:position-permalink` 5.5).
 * ⭐ The Utendaji link is the journey's door to `/positions/performance` (A15; `test:journey-shell` §9 holds it): after
 * the list and the pager, a quiet small link, for a reader with a ticket (§0h point 33).
 */
import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { HashFocus } from "@/components/ui/hash-focus";
import { RefreshPoller } from "@/components/ui/refresh-poller";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination, PLAYER_PER_PAGE } from "@/components/ui/pagination";
import { PageContainer } from "@/components/layout/page-container";
import { PositionsBarJourney } from "@/app/positions/positions-bar";
import { TicketsHead } from "@/components/journey/tickets/ticket-switch";
import { TicketCard, type TicketPosition, type TicketPrice } from "@/components/journey/tickets/ticket-card";
import { sideWord } from "@/lib/side-label";
import {
  PORTFOLIO_DEFAULT_STATE,
  buildPortfolioHref,
  filterPortfolio,
  portfolioEmptyCause,
  portfolioExits,
  sortPortfolio,
  type PortfolioRow,
  type PortfolioState,
  type PositionLens,
} from "@/lib/positions/portfolio";
import type { PositionCardMarket } from "@/lib/server/market-dal";
import type { Dict, Locale } from "@/lib/i18n-dict";

/** Every ticket matches: the view has no search box, so no text narrows it. */
const ANY_TEXT = () => true;

export function TicketsView({ rows, positions, markets, prices, lens, page, serverNow, locale, t }: {
  /** The decorated rows the page built (a position whose market is missing is already dropped). */
  rows: readonly PortfolioRow[];
  positions: ReadonlyMap<string, TicketPosition>;
  markets: ReadonlyMap<string, PositionCardMarket>;
  prices: ReadonlyMap<string, TicketPrice>;
  lens: PositionLens;
  /** The page asked for, as the page parsed it; clamped here to the pages this lens has. */
  page: number;
  serverNow: number;
  locale: Locale;
  t: Dict;
}) {
  const state: PortfolioState = { ...PORTFOLIO_DEFAULT_STATE, tab: lens };
  const shown = sortPortfolio(filterPortfolio(rows, state, serverNow, ANY_TEXT), state);
  const totalPages = Math.max(1, Math.ceil(shown.length / PLAYER_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paged = shown.slice((safePage - 1) * PLAYER_PER_PAGE, safePage * PLAYER_PER_PAGE);
  const cause = portfolioEmptyCause(state, serverNow, ANY_TEXT, shown.length, rows.length);
  // An empty Hai lens, and a player with no ticket at all, read the canvas's own empty state (s4-9-tiketi-empty).
  const firstTicket = cause === "no-rows" || lens === "open";
  const exits = cause === "lens-empty" && !firstTicket ? portfolioExits(rows, state, serverNow, ANY_TEXT) : [];
  const hasTickets = positions.size > 0;
  const LENS_EMPTY: Partial<Record<PositionLens, string>> = {
    settled: t.journey.ticketsEmptySettled,
    win: t.journey.ticketsEmptyWon,
    loss: t.journey.ticketsEmptyLost,
    void: t.journey.ticketsEmptyRefunded,
    cashed: t.journey.ticketsEmptyCashed,
  };
  const emptyTitle = firstTicket ? t.journey.ticketsEmptyOpenTitle : (LENS_EMPTY[lens] ?? t.journey.ticketsEmptyLens);
  const emptyBody = firstTicket
    ? t.journey.ticketsEmptyOpenBody.replace("{yes}", sideWord(t, "YES", "MARKET")).replace("{no}", sideWord(t, "NO", "MARKET"))
    : t.positions.emptyLensBody;

  return (
    <PageContainer tier="reading" className="space-y-6">
      <RefreshPoller intervalMs={20_000} />
      <HashFocus />
      <TicketsHead current="questions" t={t} />
      {hasTickets && <PositionsBarJourney state={state} t={t} />}
      {paged.length === 0 ? (
        <EmptyState
          fill
          kind="positions"
          title={emptyTitle}
          body={emptyBody}
          action={firstTicket ? (
            <Link href={"/" as never} className="btn btn-primary btn-sm">{t.journey.ticketsBrowse}</Link>
          ) : exits.length > 0 ? (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {exits.map((e) => (
                <Link key={e.id} href={buildPortfolioHref(state, e.patch) as never} replace scroll={false} className="btn btn-ghost btn-sm">
                  {`${t.journey.ticketsExitLens} (${e.count})`}
                </Link>
              ))}
            </div>
          ) : null}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2">
            {paged.map((row) => {
              const p = positions.get(row.id);
              const m = markets.get(row.marketId);
              if (!p || !m) return null;
              return <TicketCard key={p.id} p={p} m={m} price={prices.get(p.id)} t={t} locale={locale} serverNow={serverNow} />;
            })}
          </div>
          {totalPages > 1 && (
            <div className="mt-4 rounded-lg border border-border bg-bg-elevated/40 overflow-hidden">
              <Pagination
                total={shown.length}
                page={safePage}
                perPage={PLAYER_PER_PAGE}
                baseHref={buildPortfolioHref(state)}
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
      {hasTickets && (
        <div>
          <Link href={"/positions/performance" as never} className="btn btn-ghost btn-sm inline-flex items-center gap-1.5">
            <I.chart s={13} />
            {t.performance.viewPerformance}
          </Link>
        </div>
      )}
    </PageContainer>
  );
}
