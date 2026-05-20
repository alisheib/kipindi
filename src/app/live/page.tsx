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
import { listMarkets, impliedYesPct, seedDemoMarkets } from "@/lib/server/market-service";
import { TippingBar, PulseRing } from "@/components/brand";
import { BrandTopo } from "@/components/brand-topo";
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
  // Build a serialisable snapshot for the client component
  const markets = all.map((m) => ({
    id: m.id,
    titleEn: m.titleEn,
    titleSw: m.titleSw,
    category: m.category,
    yesPct: impliedYesPct(m),
    volume: m.yesPool + m.noPool,
    predictors: m.predictorCount,
    timeLeft: timeLeftStr(m.resolutionAt),
  }));

  const totalVolume = markets.reduce((s, m) => s + m.volume, 0);
  const totalPredictors = markets.reduce((s, m) => s + m.predictors, 0);
  const tippingMarkets = markets.filter((m) => Math.abs(m.yesPct - 50) < 8).length;

  return (
    <div className="relative min-h-[calc(100vh-44px)]">
      <BrandTopo opacity={0.04} />

      <div className="relative mx-auto max-w-[1280px] px-3 lg:px-6 py-6 lg:py-10 space-y-8">
        {/* Hero — kit BannerSocial composition, simplified, theme-adaptive */}
        <header className="relative rounded-xl border border-border overflow-hidden">
          <div
            className="absolute inset-0"
            style={{ background: "var(--hero-grad-warm)" }}
            aria-hidden
          />
          <BrandTopo id="live-hero" opacity={0.06} />
          <div className="relative p-6 lg:p-10 flex flex-col lg:flex-row lg:items-end gap-6 lg:justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <PulseRing size={20} color="var(--hero-no-accent)">
                  <span className="block w-2 h-2 rounded-full" style={{ background: "var(--hero-no-accent)" }} />
                </PulseRing>
                <p
                  className="font-mono text-[11px] uppercase tracking-[0.20em] font-bold"
                  style={{ color: "var(--hero-no-accent)" }}
                >
                  Live · Hai
                </p>
              </div>
              <h1
                className="font-display font-bold text-[34px] sm:text-[44px] lg:text-[56px] leading-[1.0] tracking-[-0.03em]"
                style={{ color: "var(--hero-text-strong)" }}
              >
                The pulse of{" "}
                <span style={{ color: "var(--hero-yes-accent)" }}>YES</span>
                {" "}&{" "}
                <span style={{ color: "var(--hero-no-accent)" }}>NO</span>.
              </h1>
              <p
                className="mt-3 text-[14px] lg:text-[16px] italic max-w-[58ch]"
                style={{ color: "var(--hero-text-muted)" }}
              >
                Mapigo ya YES na NO.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Stat label="Open markets" sw="Soko hai" value={String(markets.length)} />
              <Stat label="Volume" sw="Ujazo" value={`TZS ${(totalVolume / 1000).toFixed(1)}k`} />
              <Stat label="Predictors" sw="Watabiri" value={totalPredictors.toLocaleString()} />
              <Stat label="Tipping" sw="Inayumba" value={String(tippingMarkets)} accent />
            </div>
          </div>
        </header>

        {markets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-bg-elevated/40 p-20 text-center">
            <p className="font-display text-[20px] font-semibold text-text">No markets live right now</p>
            <p className="mt-1 text-[14px] italic text-text-subtle">Hakuna soko hai sasa hivi.</p>
            <Link href={"/markets" as never} className="btn btn-gold btn-md mt-4">
              Browse all markets →
            </Link>
          </div>
        ) : (
          <>
            {/* Wall of TippingBars — every live market, animated reveal stagger */}
            <LivePulseGrid markets={markets} />

            {/* Cross-cut callout */}
            <section className="rounded-xl border border-border bg-bg-elevated p-5 lg:p-6">
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
              <section className="rounded-xl border border-border bg-bg-elevated p-6 lg:p-10">
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

function Stat({ label, sw, value, accent }: { label: string; sw: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-md border ${accent ? "border-warning-border bg-warning-bg/30" : "border-border bg-bg-elevated/60"} px-3.5 py-2 backdrop-blur-md`}>
      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-subtle">{label}</p>
      <p className={`font-display font-bold text-[18px] tabular-nums leading-tight ${accent ? "text-warning-fg" : "text-text"}`}>{value}</p>
      <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-text-subtle italic">{sw}</p>
    </div>
  );
}
