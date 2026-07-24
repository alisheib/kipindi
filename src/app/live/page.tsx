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
import { PulseRing } from "@/components/brand";
import { BrandTopo } from "@/components/brand-topo";
import { PageHero } from "@/components/ui/page-hero";
import { EmptyState } from "@/components/ui/empty-state";
import { LivePulseGrid } from "./pulse-grid";
import { FeaturedContest } from "./featured-contest";
import { RefreshPoller } from "@/components/ui/refresh-poller";
import { getServerT } from "@/lib/i18n-server";
import { pickLocalized } from "@/lib/localized";

export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.common.live };
}
export const dynamic = "force-dynamic";

export default async function LivePage() {
  const [{ t, locale }, liveRaw, traderMap] = await Promise.all([
    getServerT(),
    // "ON LIVE — shows everything" (Markets Appearing.txt). This is the ONE player
    // board that deliberately opts into BOTH product lines: /markets holds long-form
    // polls, /updown holds the short-term rounds, and /live is where they meet.
    listMarkets({ status: "LIVE", productLine: "ALL" }).catch(() => [] as Awaited<ReturnType<typeof listMarkets>>),
    traderSeedsByMarket().catch(() => new Map() as Awaited<ReturnType<typeof traderSeedsByMarket>>),
  ]);

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
  const all = liveRaw.filter((m) => !isClosedByTime(m));
  // Build a serialisable snapshot for the client component. The C1e dense card
  // needs only odds/title/timing, so we no longer fetch a per-market spark chart
  // here (that was pure waste on a wall that can hold thousands of bars).
  const markets = all.map((m) => ({
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
    traders: traderMap.get(m.id),
  }));

  const tippingMarkets = markets.filter((m) => Math.abs(m.yesPct - 50) < 8).length;
  // The most-contested markets = odds closest to 50/50 (NOT markets[0], which is
  // just the soonest-closing since listMarkets sorts by resolutionAt). The aqua
  // hero features the top few as a swipeable carousel (title pre-localized here
  // so the client component stays i18n-free).
  const topContested = [...markets]
    .sort((a, b) => Math.abs(a.yesPct - 50) - Math.abs(b.yesPct - 50))
    .slice(0, 6)
    .map((m) => ({ id: m.id, title: pickLocalized(locale, m.titleEn, m.titleSw, m.titleZh), yesPct: m.yesPct }));

  return (
    <div className="relative min-h-[calc(100vh-44px)]">
      <RefreshPoller intervalMs={15_000} />
      <BrandTopo opacity={0.09} />

      <div className="relative mx-auto max-w-[1280px] px-3 lg:px-6 py-6 space-y-5">
        {/* Accessible page heading (WCAG 1.3.1 / 2.4.6). Visually hidden — the
            design uses a slim live header, not a marketing H1. */}
        <h1 className="sr-only">{t.common.live} {t.common.markets}</h1>
        {/* C1e — aqua PageHero masthead. Gives /live a real identity (not a slim
            header) and features the genuinely MOST-CONTESTED market (closest to
            50/50) — not the soonest-closing one the old label implied. */}
        <PageHero glow="aqua" watermark={200}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <PulseRing size={18} color="var(--aqua-400)">
                <span className="block w-2 h-2 rounded-full" style={{ background: "var(--aqua-400)" }} />
              </PulseRing>
              <p className="font-mono text-[12px] uppercase tracking-[0.18em] font-bold text-text">{t.home.liveSection}</p>
            </div>
            <p className="font-mono text-[10.5px] text-text-subtle tabular-nums whitespace-nowrap">
              {markets.length} {t.market.liveCount}{tippingMarkets > 0 ? ` · ${tippingMarkets} ${t.market.tipping}` : ""}
            </p>
          </div>
          <FeaturedContest markets={topContested} eyebrow={t.market.mostContested} openLabel={t.market.openMarket} />
        </PageHero>

        {markets.length === 0 ? (
          <EmptyState
            kind="markets"
            title={t.market.noLiveNow}
            body={t.market.noLiveBody}
            action={
              <Link href={"/markets" as never} className="btn btn-primary btn-md">
                {t.common.browseAll}
              </Link>
            }
          />
        ) : (
          <>
            {/* Wall of TippingBars — every live market, animated reveal stagger */}
            <LivePulseGrid markets={markets} />

            {/* Cross-cut callout — the most-contested feature now lives in the
                aqua hero above (C1e), so this stays a lean explainer. */}
            <section className="rounded-xl glass-panel p-5 lg:p-6">
              <div className="flex flex-wrap items-baseline gap-2 mb-2">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-yes-300">{t.market.priceCompetition}</p>
              </div>
              <p className="text-[14px] leading-relaxed text-text-muted max-w-[78ch]">
                {t.market.liveExplainer}
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
