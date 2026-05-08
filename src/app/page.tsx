import Link from "next/link";
import { ArrowRight, ShieldCheck, Smartphone, BarChart3 } from "lucide-react";
import { MarketCard } from "@/components/markets/market-card";
import { TippingBar, FiftyMark, FiftyLockup, GiltCorner } from "@/components/brand";
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

      {/* HERO — direct port of kit/banners.jsx → BannerHero. Royal radial
          canvas, gilt outer border, gilt L-bracket corners, gilt-gradient
          "wisdom" word, Soro display headline, gilt-rules around the
          eyebrow + Est. line, featured-market card with TippingBar, gold
          + ghost CTAs. */}
      <section
        className="relative overflow-hidden rounded-2xl"
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 75% 30%, oklch(24% 0.150 268) 0%, oklch(20% 0.135 268) 60%, oklch(15% 0.130 268) 100%)",
          border: "1px solid oklch(78% 0.13 80)",
          boxShadow:
            "0 1px 0 oklch(78% 0.13 80 / 0.40) inset, 0 24px 60px -30px oklch(8% 0.05 268 / 0.70)",
        }}
      >
        <BrandTopo id="hero" opacity={0.06} />
        {/* Ghosted mark — opacity from kit */}
        <div className="absolute right-[-5%] top-[-12%] pointer-events-none hidden md:block" style={{ opacity: 0.10 }}>
          <FiftyMark size={520} mono />
        </div>
        {/* Heraldic gilt corners */}
        <GiltCorner size={56} className="absolute" style={{ top: 18, left: 18 }} rotate={0} />
        <GiltCorner size={56} className="absolute" style={{ top: 18, right: 18 }} rotate={90} />
        <GiltCorner size={56} className="absolute" style={{ bottom: 18, left: 18 }} rotate={-90} />
        <GiltCorner size={56} className="absolute" style={{ bottom: 18, right: 18 }} rotate={180} />

        <div className="relative px-8 py-12 md:px-16 md:py-16 flex flex-col gap-7">
          {/* Top row — lockup left, "Concept platform" caption right */}
          <div className="flex items-center justify-between gap-4">
            <FiftyLockup size={24} color="oklch(99% 0.006 268)" />
            <div className="hidden sm:flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: "oklch(78% 0.13 80)" }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: "oklch(78% 0.13 80)" }} />
              Tanzania · Concept platform · Not a live product
            </div>
          </div>

          {/* Mono eyebrow with gilt-rule on either side */}
          <div className="inline-flex items-center gap-3 font-mono text-[12px] uppercase tracking-[0.18em]" style={{ color: "oklch(78% 0.13 80)" }}>
            <span style={{ display: "inline-block", width: 28, height: 1, background: "oklch(78% 0.13 80)" }} />
            Soko la utabiri · Prediction markets
            <span style={{ display: "inline-block", width: 28, height: 1, background: "oklch(78% 0.13 80)" }} />
          </div>

          {/* The headline — "wisdom" carries the gilt vertical gradient */}
          <h1
            className="font-display font-bold text-[44px] sm:text-[60px] md:text-[80px] leading-[1.0] tracking-[-0.035em] max-w-[18ch] m-0"
            style={{ color: "oklch(99% 0.006 268)" }}
          >
            The{" "}
            <span
              style={{
                background: "linear-gradient(180deg, oklch(92% 0.10 82) 0%, oklch(72% 0.14 78) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              wisdom
            </span>{" "}
            of <span style={{ color: "oklch(72% 0.16 152)" }}>YES</span> &{" "}
            <span style={{ color: "oklch(72% 0.18 22)" }}>NO</span>.
          </h1>

          {/* Gilt-rule + Est. line + flowing rule */}
          <div className="flex items-center gap-3.5 -mt-2">
            <span style={{ height: 1, width: 120, background: "linear-gradient(90deg, oklch(78% 0.13 80), transparent)" }} />
            <span className="font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: "oklch(78% 0.13 80)" }}>
              Est. 2026 · Dar es Salaam
            </span>
            <span style={{ height: 1, flex: 1, background: "linear-gradient(90deg, oklch(78% 0.13 80), transparent)" }} />
          </div>

          <p
            className="font-display text-[15px] md:text-[19px] leading-[1.5] max-w-[58ch] m-0"
            style={{ color: "oklch(82% 0.040 268)" }}
          >
            Pesa kidogo, ukweli mkubwa. Trade questions about Tanzania&apos;s weather, markets, sport and culture — settled by official sources.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 lg:gap-10 items-end">
            {/* Featured market — kit "Featured market" card */}
            {featured && (
              <div
                className="max-w-[480px] p-3.5 px-4"
                style={{
                  background: "oklch(30% 0.165 268)",
                  border: "1px solid oklch(44% 0.150 268)",
                  borderRadius: 12,
                  boxShadow: "0 1px 0 oklch(78% 0.13 80 / 0.20) inset",
                }}
              >
                <p
                  className="font-mono text-[10px] uppercase tracking-[0.14em] mb-2"
                  style={{ color: "oklch(78% 0.13 80)" }}
                >
                  Featured market
                </p>
                <p
                  className="font-display text-[14px] font-semibold mb-2.5 leading-tight"
                  style={{ color: "oklch(99% 0.006 268)" }}
                >
                  {featured.titleEn}
                </p>
                <TippingBar yesPct={featuredYesPct} height={20} animate={false} showLabels={false} />
              </div>
            )}
            {/* Gold + Ghost CTAs — kit btn-gold + btn-ghost (radius 999 per banner spec) */}
            <div className="flex flex-wrap gap-3">
              <Link
                href={"/auth/register" as never}
                className="btn btn-gold inline-flex items-center gap-2"
                style={{ height: 52, padding: "0 28px", fontSize: 16, borderRadius: 999 }}
              >
                Create account
                <ArrowRight size={16} aria-hidden />
              </Link>
              <Link
                href={"/auth/login" as never}
                className="btn btn-ghost inline-flex items-center"
                style={{ height: 52, padding: "0 24px", fontSize: 15, borderRadius: 999 }}
              >
                Sign in
              </Link>
              <Link
                href={"/markets" as never}
                className="font-mono text-[11px] uppercase tracking-[0.14em] text-aqua-200 hover:text-aqua-100 underline-offset-2 hover:underline self-center"
              >
                Browse markets first →
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
