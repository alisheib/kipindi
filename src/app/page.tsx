import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketCard } from "@/components/markets/market-card";
import { TippingBar, FiftyMark } from "@/components/brand";
import { BrandTopo } from "@/components/brand-topo";
import { listMarkets, impliedYesPct, seedDemoMarkets } from "@/lib/server/market-service";

export const dynamic = "force-dynamic";

function timeLeftStr(iso: string): string {
  const ms = Date.parse(iso) - Date.now();
  if (ms <= 0) return "closed";
  const d = Math.floor(ms / (24 * 3600_000));
  if (d > 0) return `${d}d left`;
  const h = Math.floor(ms / 3600_000);
  if (h > 0) return `${h}h left`;
  const m = Math.floor(ms / 60_000);
  return `${m}m left`;
}

export default function LandingPage() {
  seedDemoMarkets();
  const live = listMarkets({ status: "LIVE" }).slice(0, 6);
  const featured = live[0];
  const featuredYesPct = featured ? impliedYesPct(featured) : 50;

  return (
    <div className="mx-auto max-w-[1280px] px-3 lg:px-6 py-6 lg:py-10 space-y-12">

      {/* HERO — kit BannerHero composition */}
      <section
        className="relative overflow-hidden rounded-xl border border-border"
        style={{ background: "linear-gradient(135deg, oklch(14% 0.012 240) 0%, oklch(18% 0.03 215) 100%)" }}
      >
        <BrandTopo id="hero" />
        {/* Giant ghosted mark behind text */}
        <div className="absolute right-[-6%] top-[-12%] opacity-[0.10] pointer-events-none hidden md:block">
          <FiftyMark size={520} mono inverted />
        </div>

        <div className="relative px-6 py-10 md:px-12 md:py-16 flex flex-col gap-10">
          <p className="font-mono text-[12px] tracking-[0.16em] uppercase text-yes-300 font-bold">
            Soko la utabiri · Prediction markets
          </p>
          <h1
            className="font-display font-bold text-[44px] sm:text-[56px] md:text-[72px] leading-[1.0] tracking-[-0.035em] text-text max-w-[18ch]"
          >
            The wisdom of <span className="text-yes-300">YES</span> &{" "}
            <span className="text-no-300">NO</span>.
          </h1>
          <p className="font-display text-[16px] md:text-[19px] leading-[1.5] text-text-muted max-w-[60ch]">
            Pesa kidogo, ukweli mkubwa. Trade questions about Tanzania&apos;s weather,
            markets, sport and elections — settled by official sources.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 lg:gap-10 items-end">
            {featured && (
              <div className="max-w-[440px]">
                <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-text-subtle mb-2.5 line-clamp-1">
                  {featured.titleEn}
                </p>
                <TippingBar yesPct={featuredYesPct} height={22} animate={false} />
              </div>
            )}
            <div className="flex flex-wrap gap-2.5">
              <Link
                href={"/auth/demo" as never}
                className="inline-flex h-12 items-center gap-2 rounded-pill bg-yes-500 px-6 font-display font-bold text-yes-950 hover:bg-yes-400 transition-colors"
              >
                Try the demo
                <ArrowRight size={18} aria-hidden />
              </Link>
              <Link
                href={"/markets" as never}
                className="inline-flex h-12 items-center gap-2 rounded-pill border border-border-strong bg-transparent px-6 font-display font-semibold text-text hover:bg-bg-overlay transition-colors"
              >
                Open the markets
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-text-subtle mb-2">How it works · Inavyofanya kazi</p>
        <h2 className="font-display text-[28px] font-semibold text-text mb-5">Three steps. No edge cases.</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Step n="01" en="Pick a side" sw="Chagua upande" body="YES or NO on a real-world question. Sources are public; criteria are written before the market opens." />
          <Step n="02" en="Stake TZS" sw="Weka dau" body="Mobile-money in seconds. Min TZS 100. Your stake adds to the YES or NO pool — that's where probabilities come from." />
          <Step n="03" en="Get paid if right" sw="Pata malipo" body="Two-officer resolution at the deadline. Winners share the losers' pool minus 9% operator margin." />
        </div>
      </section>

      {/* WHY 50PICK — uses the kit's calm restraint, no casino tropes */}
      <section>
        <h2 className="font-display text-[28px] font-semibold text-text mb-5">Trade what&apos;s true</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <WhyCard title="Licensed in Tanzania" sw="Leseni ya GBT" body="Operating under Gaming Board of Tanzania licensing. Two-officer resolution. Audit chain. KYC + AML built-in." />
          <WhyCard title="Provably resolved" sw="Inathibitishwa" body="Every resolution carries a source URL, two officer signatures, and a 24-hour public objection window." href="/fairness" />
          <WhyCard title="Mobile-money native" sw="Pesa za simu" body="Deposit + withdraw in seconds via M-Pesa, Tigo Pesa, Airtel Money, HaloPesa, or Mixx by Yas." />
        </div>
      </section>

      {/* LIVE GRID — using kit's MarketCard with TippingBar inside */}
      {live.length > 0 && (
        <section>
          <div className="mb-5 flex items-baseline justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-text-subtle">Live · Hai</p>
              <h2 className="font-display text-[28px] font-semibold text-text">Open markets</h2>
            </div>
            <Link href={"/markets" as never} className="font-mono text-[12px] uppercase tracking-[0.16em] text-yes-300 hover:text-yes-200">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {live.slice(0, 6).map((m) => (
              <MarketCard
                key={m.id}
                id={m.id}
                titleEn={m.titleEn}
                titleSw={m.titleSw}
                category={m.category}
                yesPct={impliedYesPct(m)}
                volume={m.yesPool + m.noPool}
                predictors={m.predictorCount}
                timeLeft={timeLeftStr(m.resolutionAt)}
                status="LIVE"
                sourceUrl={m.sourceUrl}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Step({ n, en, sw, body }: { n: string; en: string; sw: string; body: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-5">
      <p className="font-mono text-[12px] tracking-[0.16em] font-bold text-yes-300 mb-2">{n}</p>
      <h3 className="font-display text-[18px] font-semibold leading-tight text-text">{en}</h3>
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle mt-1">{sw}</p>
      <p className="mt-3 text-[14px] leading-relaxed text-text-muted">{body}</p>
    </div>
  );
}

function WhyCard({ title, sw, body, href }: { title: string; sw: string; body: string; href?: string }) {
  const inner = (
    <div className="rounded-lg border border-border bg-bg-elevated p-5 h-full transition-colors hover:border-border-strong">
      <h3 className="font-display text-[18px] font-semibold text-text">{title}</h3>
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle mt-1">{sw}</p>
      <p className="mt-3 text-[14px] leading-relaxed text-text-muted">{body}</p>
    </div>
  );
  return href ? <Link href={href as never}>{inner}</Link> : inner;
}
