/**
 * /live — "Pulse" — the signature 50pick live view.
 *
 * Every active market rendered as a TippingBar in a grid that breathes:
 * each bar fades in 60ms after the one before it, the leading side glows,
 * and the live-dot ticks. This is the page that says "this is 50pick" —
 * a wall of opinion in motion.
 *
 * Built on the kit's TippingBar + PulseRing + MarketStats grid + topo
 * backdrop. Every detail is from the kit; the composition is unique to
 * this page.
 */
import Link from "next/link";
import { listMarkets, impliedYesPct, isClosedByTime, isSelectionClosed, traderSeedsByMarket } from "@/lib/server/market-service";

import { getCardChart } from "@/lib/server/market-history";
import { TippingBar, PulseRing } from "@/components/brand";
import { BrandTopo } from "@/components/brand-topo";
import { EmptyState } from "@/components/ui/empty-state";
import { LivePulseGrid } from "./pulse-grid";
import { RefreshPoller } from "@/components/ui/refresh-poller";
import { getServerT } from "@/lib/i18n-server";
import { pickLocalized } from "@/lib/localized";

export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.common.live };
}
export const dynamic = "force-dynamic";

export default async function LivePage() {
  const { t, locale } = await getServerT();

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

  // Exclude markets whose resolution time has passed — they're closed/awaiting
  // settlement, not live, and must not show a LIVE badge on the board.
  const all = (await listMarkets({ status: "LIVE" })).filter((m) => !isClosedByTime(m));
  const traderMap = await traderSeedsByMarket();
  // Build a serialisable snapshot for the client component
  const markets = await Promise.all(all.map(async (m) => {
    const cc = await getCardChart(m.id).catch(() => ({ spark: [] as number[], move24h: undefined }));
    return {
      id: m.id,
      titleEn: m.titleEn,
      titleSw: m.titleSw,
      titleZh: m.titleZh,
      category: m.category,
      yesPct: impliedYesPct(m),
      volume: m.yesPool + m.noPool,
      predictors: m.predictorCount,
      timeLeft: isSelectionClosed(m) ? t.market.waitingForResults : timeLeftStr(m.resolutionAt),
      selectionClosed: isSelectionClosed(m),
      move24h: cc.move24h,
      spark: cc.spark,
      traders: traderMap.get(m.id),
    };
  }));

  const tippingMarkets = markets.filter((m) => Math.abs(m.yesPct - 50) < 8).length;
  // The genuinely most-contested market = the one whose odds sit closest to 50/50,
  // NOT markets[0] (which is just the soonest-closing, since listMarkets sorts by
  // resolutionAt). This is what the "Most contested" hero below should feature.
  const mostContested = markets.length
    ? markets.reduce((best, m) => (Math.abs(m.yesPct - 50) < Math.abs(best.yesPct - 50) ? m : best))
    : null;

  return (
    <div className="relative min-h-[calc(100vh-44px)]">
      <RefreshPoller intervalMs={15_000} />
      <BrandTopo opacity={0.04} />

      <div className="relative mx-auto max-w-[1280px] px-3 lg:px-6 py-6 space-y-5">
        {/* Accessible page heading (WCAG 1.3.1 / 2.4.6). Visually hidden — the
            design uses a slim live header, not a marketing H1. */}
        <h1 className="sr-only">{t.common.live} {t.common.markets}</h1>
        {/* Slim header — clicking Live lands straight on the questions, not a
            marketing hero (that lives on the homepage). */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <PulseRing size={18} color="var(--no-400)">
              <span className="block w-2 h-2 rounded-full" style={{ background: "var(--no-400)" }} />
            </PulseRing>
            <p className="font-mono text-[12px] uppercase tracking-[0.18em] font-bold text-text">{t.home.liveSection}</p>
          </div>
          <p className="font-mono text-[10.5px] text-text-subtle tabular-nums whitespace-nowrap">
            {markets.length} {t.market.liveCount}{tippingMarkets > 0 ? ` · ${tippingMarkets} ${t.market.tipping}` : ""}
          </p>
        </div>

        {markets.length === 0 ? (
          <EmptyState
            kind="markets"
            title={t.market.noLiveNow}
            body={t.market.noLiveBody}
            action={
              <Link href={"/markets" as never} className="btn btn-gold btn-md">
                {t.common.browseAll}
              </Link>
            }
          />
        ) : (
          <>
            {/* Wall of TippingBars — every live market, animated reveal stagger */}
            <LivePulseGrid markets={markets} />

            {/* Cross-cut callout */}
            <section className="rounded-xl glass-panel p-5 lg:p-6">
              <div className="flex flex-wrap items-baseline gap-2 mb-2">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-yes-300">{t.market.priceCompetition}</p>
              </div>
              <p className="text-[14px] leading-relaxed text-text-muted max-w-[78ch]">
                {t.market.liveExplainer}
              </p>
            </section>

            {/* Static snapshot of one bar at scale — for the "this is the brand" moment */}
            {mostContested && (
              <section className="rounded-xl glass-panel p-6 lg:p-10">
                <div className="flex flex-wrap items-baseline gap-2 mb-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] font-bold text-text-subtle">{t.market.mostContested}</p>
                </div>
                <h2 className="font-display text-[20px] lg:text-[26px] font-semibold text-text leading-tight max-w-[60ch] mb-5">
                  {pickLocalized(locale, mostContested.titleEn, mostContested.titleSw, mostContested.titleZh)}
                </h2>
                <TippingBar yesPct={mostContested.yesPct} height={36} showLabels />
                <Link href={`/markets/${mostContested.id}` as never} className="btn btn-gold btn-lg mt-5">
                  {t.market.openMarket}
                </Link>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
