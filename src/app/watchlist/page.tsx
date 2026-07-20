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
import { getMarket, impliedYesPct, isClosedByTime, isSelectionClosed } from "@/lib/server/market-service";
import { getServerT } from "@/lib/i18n-server";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Watchlist" };
export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  const { t } = await getServerT();
  const session = await getSession();
  if (!session) redirect("/auth/login?next=/watchlist");

  const ids = await listWatchedMarketIds(session.userId).catch(() => [] as string[]);
  const markets = (
    await Promise.all(ids.map((id) => getMarket(id).catch(() => null)))
  ).filter((m): m is NonNullable<typeof m> => !!m);

  return (
    <main className="mx-auto max-w-[1280px] px-3 lg:px-6 py-6 space-y-5">
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
