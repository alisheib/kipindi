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
import { listMarkets, impliedYesPct, seedDemoMarkets, traderSeedsByMarket } from "@/lib/server/market-service";
import { getCardChart } from "@/lib/server/market-history";
import { TippingBar, PulseRing } from "@/components/brand";
import { BrandTopo } from "@/components/brand-topo";
import { EmptyState } from "@/components/ui/empty-state";
import { LivePulseGrid } from "./pulse-grid";

export const metadata = { title: "Live · Hai" };
export const dynamic = "force-dynamic";

function timeLeftStr(iso: string): string {
  const ms = Date.parse(iso) - Date.now();
  if (ms <= 0) return "closed";
  const d = Math.floor(ms / (24 * 3600_000));
  if (d > 0) return `${d}d`;
  const h = Math.floor(ms / 3600_000);
  if (h > 0) return `${h}h`;
  const m = Math.floor(ms / 60_000);
  return `${m}m`;
}

export default function LivePage() {
  seedDemoMarkets();
  const all = listMarkets({ status: "LIVE" });
  const traderMap = traderSeedsByMarket();
  // Build a serialisable snapshot for the client component
  const markets = all.map((m) => {
    const cc = getCardChart(m.id);
    return {
      id: m.id,
      titleEn: m.titleEn,
      titleSw: m.titleSw,
      category: m.category,
      yesPct: impliedYesPct(m),
      volume: m.yesPool + m.noPool,
      predictors: m.predictorCount,
      timeLeft: timeLeftStr(m.resolutionAt),
      move24h: cc.move24h,
      spark: cc.spark,
      traders: traderMap.get(m.id),
    };
  });

  const tippingMarkets = markets.filter((m) => Math.abs(m.yesPct - 50) < 8).length;

  return (
    <div className="relative min-h-[calc(100vh-44px)]">
      <BrandTopo opacity={0.04} />

      <div className="relative mx-auto max-w-[1480px] px-3 lg:px-6 py-6 space-y-5">
        {/* Slim header — clicking Live lands straight on the questions, not a
            marketing hero (that lives on the homepage). */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <PulseRing size={18} color="var(--no-400)">
              <span className="block w-2 h-2 rounded-full" style={{ background: "var(--no-400)" }} />
            </PulseRing>
            <p className="font-mono text-[12px] uppercase tracking-[0.18em] font-bold text-text">Live · Hai</p>
          </div>
          <p className="font-mono text-[10.5px] text-text-subtle tabular-nums whitespace-nowrap">
            {markets.length} live{tippingMarkets > 0 ? ` · ${tippingMarkets} tipping` : ""}
          </p>
        </div>

        {markets.length === 0 ? (
          <EmptyState
            kind="markets"
            title="No markets live right now"
            titleSw="Hakuna soko hai sasa hivi"
            body="Live markets appear here the moment they open for trading."
            action={
              <Link href={"/markets" as never} className="btn btn-gold btn-md">
                Browse all markets →
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
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-yes-300">Price Competition · pool model</p>
              </div>
              <p className="text-[14px] leading-relaxed text-text-muted max-w-[78ch]">
                Every bar above is the live pool of stakes. Each new prediction <em>tips the bar</em> —
                the needle leans toward the leading side and shimmers gold the moment a market resolves.
                When you stake, you join a pool; if you&apos;re right, you share the losing pool minus a
                9% operator margin. The math is in the open. <span className="italic text-text-subtle">Hesabu wazi kabisa.</span>
              </p>
            </section>

            {/* Static snapshot of one bar at scale — for the "this is the brand" moment */}
            {markets[0] && (
              <section className="rounded-xl glass-panel p-6 lg:p-10">
                <div className="flex flex-wrap items-baseline gap-2 mb-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] font-bold text-text-subtle">Most contested · Lililo na shaka zaidi</p>
                </div>
                <h2 className="font-display text-[20px] lg:text-[26px] font-semibold text-text leading-tight max-w-[60ch] mb-5">
                  {markets[0].titleEn}
                </h2>
                <TippingBar yesPct={markets[0].yesPct} height={36} showLabels />
                <Link href={`/markets/${markets[0].id}` as never} className="btn btn-gold btn-lg mt-5">
                  Open market →
                </Link>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
