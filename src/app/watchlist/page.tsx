/**
 * /watchlist (F3) — the markets a player follows.
 *
 * Real data only: the grid is exactly the player's starred markets. An empty
 * watchlist shows an honest empty-state, never filler suggestions.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { MarketCard } from "@/components/markets/market-card";
import { getSession } from "@/lib/server/session";
import { listWatchedMarketIds } from "@/lib/server/watchlist-service";
import { listMarkets, impliedYesPct, isClosedByTime, isSelectionClosed } from "@/lib/server/market-service";
import { RefreshPoller } from "@/components/ui/refresh-poller";
import { getServerT } from "@/lib/i18n-server";
import { formatDateTime } from "@/lib/utils";

// Localised tab title (POLISH-BACKLOG §1.7) — was the hard-coded English
// "Watchlist", which a Swahili player saw in their browser tab and history.
export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.watchlist.title };
}
export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  const { t } = await getServerT();
  const session = await getSession();
  if (!session) redirect("/auth/login?next=/watchlist");

  // B-1 — no swallow: the starred set IS this page; a failed read must throw to
  // watchlist/error.tsx, never render "your watchlist is empty" over real stars.
  const ids = await listWatchedMarketIds(session.userId);
  // B-17 — ONE board read instead of an N+1 `getMarket` fan-out per starred
  // market (a 30-star watchlist was 30 sequential-ish store reads). The board
  // query already hydrates every market; filter it to the starred set, keeping
  // the player's star order.
  // B-1 — no swallow here either: this read hydrates every starred card, so its
  // failure also fabricated the empty state.
  const byId = new Map((await listMarkets({ productLine: "ALL" })).map((m) => [m.id, m] as const));
  const markets = ids.map((id) => byId.get(id)).filter((m): m is NonNullable<typeof m> => !!m);

  return (
    <main className="mx-auto max-w-[1280px] px-3 lg:px-6 py-6 space-y-5">
      {/* B-17 — the watchlist is a "what's moving" surface; it polled never.
          Same cadence as wallet/positions (pauses when the tab is hidden). */}
      <RefreshPoller intervalMs={20_000} />
      <PageHeader tone="info" icon={<I.star s={22} />} eyebrow={t.watchlist.eyebrow} title={t.watchlist.title} />

      {markets.length === 0 ? (
        <EmptyState
          kind="markets"
          title={t.watchlist.emptyTitle}
          body={t.watchlist.emptyBody}
          action={<Link href={"/markets" as never} className="btn btn-primary btn-sm">{t.watchlist.browseMarkets}</Link>}
        />
      ) : (
        <section className="market-grid">
          {markets.map((m) => {
            const resolved = m.status === "RESOLVED" || m.status === "VOIDED";
            const timeLeft = resolved
              ? (m.resolvedOutcome === "VOID" ? t.common.voided : `${t.market.resolvedOutcome} ${m.resolvedOutcome}`)
              : formatDateTime(m.resolutionAt);
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
                timeLeft={timeLeft}
                status={m.status === "VOIDED" ? "VOIDED" : m.status === "RESOLVED" ? "RESOLVED" : m.status}
                resolvedOutcome={m.resolvedOutcome}
                selectionClosed={!resolved && (isSelectionClosed(m) || isClosedByTime(m))}
                sourceUrl={m.sourceUrl}
              />
            );
          })}
        </section>
      )}
    </main>
  );
}
