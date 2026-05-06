import Link from "next/link";
import { ArrowRight, ShieldCheck, Smartphone, BarChart3 } from "lucide-react";
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
    <div className="mx-auto max-w-[1280px] px-3 lg:px-6 py-6 lg:py-8 space-y-8 lg:space-y-10">

      {/* HERO — adapts to theme via --hero-* tokens */}
      <section
        className="relative overflow-hidden rounded-xl border border-border"
        style={{ background: "var(--hero-grad)" }}
      >
        <BrandTopo id="hero" opacity={0.05} />
        {/* Ghosted mark — opacity adapts to theme */}
        <div
          className="absolute right-[-6%] top-[-12%] pointer-events-none hidden md:block"
          style={{ opacity: "var(--hero-mark-opacity)" }}
        >
          <FiftyMark size={520} mono inverted />
        </div>

        <div className="relative px-6 py-9 md:px-12 md:py-14 flex flex-col gap-6">
          <p className="font-mono text-[12px] tracking-[0.16em] uppercase font-bold" style={{ color: "var(--hero-tag-yes)" }}>
            Soko la utabiri · Prediction markets
          </p>
          <h1
            className="font-display font-bold text-[40px] sm:text-[52px] md:text-[68px] leading-[1.0] tracking-[-0.035em] max-w-[18ch]"
            style={{ color: "var(--hero-text-strong)" }}
          >
            The wisdom of{" "}
            <span style={{ color: "var(--hero-yes-accent)" }}>YES</span>
            {" "}&{" "}
            <span style={{ color: "var(--hero-no-accent)" }}>NO</span>.
          </h1>
          <p
            className="font-display text-[15px] md:text-[17px] leading-[1.5] max-w-[58ch]"
            style={{ color: "var(--hero-text-muted)" }}
          >
            Pesa kidogo, ukweli mkubwa. Trade questions about Tanzania&apos;s weather, markets, sport and elections — settled by official sources.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-5 lg:gap-10 items-end">
            {featured && (
              <div className="max-w-[440px]">
                <p
                  className="font-mono text-[10px] tracking-[0.12em] uppercase mb-2 line-clamp-1"
                  style={{ color: "var(--hero-text-muted)" }}
                >
                  {featured.titleEn}
                </p>
                <TippingBar yesPct={featuredYesPct} height={22} animate={false} />
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Link
                href={"/auth/demo" as never}
                className="inline-flex h-10 sm:h-11 items-center gap-2 rounded-pill bg-yes-500 px-4 sm:px-5 text-[14px] sm:text-[15px] font-display font-bold text-yes-950 hover:bg-yes-400 transition-colors"
              >
                Try the demo
                <ArrowRight size={15} aria-hidden />
              </Link>
              <Link
                href={"/markets" as never}
                className="inline-flex h-10 sm:h-11 items-center gap-2 rounded-pill border border-border-strong bg-bg-elevated px-4 sm:px-5 text-[14px] sm:text-[15px] font-display font-semibold text-text hover:bg-bg-overlay transition-colors"
              >
                Browse markets
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* LIVE MARKETS — surfaced immediately, no scroll-the-marketing-page-first */}
      {live.length > 0 && (
        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-text-subtle">Live · Hai</p>
              <h2 className="font-display text-[24px] md:text-[28px] font-semibold text-text">Pick a side now</h2>
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

      {/* TRUST STRIP — combined "how + why" in one tight row, no more 6-card scroll */}
      <section className="rounded-xl border border-border bg-bg-elevated p-5 lg:p-7">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-7">
          <TrustItem
            icon={<BarChart3 size={20} />}
            n="01"
            en="Pick a side, stake TZS"
            sw="Chagua upande, weka dau"
            body="Pari-mutuel pool. Min TZS 100. Drag the conviction needle on any market."
            tone="yes"
          />
          <TrustItem
            icon={<ShieldCheck size={20} />}
            n="02"
            en="Two-officer resolution"
            sw="Utatuzi wa maafisa wawili"
            body="Every market resolves against a public source URL with two officer signatures."
            tone="teal"
            href="/fairness"
          />
          <TrustItem
            icon={<Smartphone size={20} />}
            n="03"
            en="Get paid via M-Pesa"
            sw="Pata malipo kwa M-Pesa"
            body="Winners share the losers&apos; pool minus a 9% margin. Withdrawals in seconds."
            tone="gold"
          />
        </div>
      </section>
    </div>
  );
}

function TrustItem({
  icon, n, en, sw, body, tone, href,
}: {
  icon: React.ReactNode;
  n: string;
  en: string;
  sw: string;
  body: string;
  tone: "yes" | "teal" | "gold";
  href?: string;
}) {
  const accent = {
    yes:  "text-yes-300",
    teal: "text-teal-300",
    gold: "text-gold-300",
  }[tone];

  const inner = (
    <div className="flex items-start gap-3.5">
      <span className={`shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-bg-overlay ${accent}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          <p className={`font-mono text-[10px] tracking-[0.16em] font-bold ${accent}`}>{n}</p>
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-subtle italic">{sw}</p>
        </div>
        <h3 className="font-display text-[16px] font-semibold leading-tight text-text">{en}</h3>
        <p className="mt-1 text-[13px] leading-relaxed text-text-muted">{body}</p>
      </div>
    </div>
  );
  return href ? (
    <Link href={href as never} className="block hover:opacity-90 transition-opacity">
      {inner}
    </Link>
  ) : inner;
}
