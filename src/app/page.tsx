import Link from "next/link";
import { ArrowRight, ShieldCheck, Smartphone, BarChart3 } from "lucide-react";
import { MarketCard } from "@/components/markets/market-card";
import { ProbabilityBar } from "@/components/markets/probability-bar";
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
    <div className="mx-auto max-w-[1240px] px-3 lg:px-6 py-6 lg:py-10 space-y-12">

      {/* HERO */}
      <section className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_460px] items-center">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] font-bold text-teal-300 mb-3">50pick · Tanzania</p>
          <h1 className="font-display text-[44px] sm:text-[56px] font-bold leading-[1.05] tracking-[-0.025em] text-text">
            Predict events.<br />
            Not chance.
          </h1>
          <p className="mt-4 text-[18px] text-text-muted italic max-w-[44ch]">Tabiri matukio. Si bahati.</p>
          <p className="mt-6 text-[16px] leading-relaxed text-text-muted max-w-[58ch]">
            Pari-mutuel binary markets on real-world outcomes — politics, sports, weather, macro, culture.
            Stake YES or NO. If you&apos;re right, you share the losing pool. M-Pesa native.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={"/auth/demo" as never}
              className="inline-flex h-12 items-center gap-2 rounded-md bg-teal-500 px-6 font-semibold text-white transition-colors hover:bg-teal-400"
            >
              Try the demo · TZS 100,000
              <ArrowRight size={16} aria-hidden />
            </Link>
            <Link
              href={"/markets" as never}
              className="inline-flex h-12 items-center gap-2 rounded-md border border-border bg-bg-elevated px-6 font-semibold text-text transition-colors hover:border-border-strong"
            >
              Browse markets
            </Link>
          </div>
        </div>

        {/* Featured market preview */}
        {featured && (
          <Link
            href={`/markets/${featured.id}` as never}
            className="block rounded-xl border border-border bg-bg-elevated p-6 hover:border-teal-500 transition-colors"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-pill border border-danger-border bg-danger-bg/40 px-2.5 py-0.5 text-[12px] font-semibold text-danger-fg">
                <span className="live-dot" style={{ width: 6, height: 6 }} />
                Live
              </span>
              <span className="inline-flex items-center rounded-pill border border-border bg-bg-elevated px-2.5 py-0.5 text-[12px] font-medium text-text-muted">
                {featured.category}
              </span>
              <span className="ml-auto font-mono text-[12px] text-text-subtle">{timeLeftStr(featured.resolutionAt)}</span>
            </div>
            <h2 className="font-display text-[20px] font-semibold leading-tight tracking-[-0.01em] text-text">{featured.titleEn}</h2>
            {featured.titleSw && <p className="mt-1 text-[14px] italic text-text-subtle">{featured.titleSw}</p>}
            <div className="mt-5">
              <ProbabilityBar yesPct={featuredYesPct} size="large" showLabels />
              <div className="mt-2 flex items-baseline justify-between font-mono text-[12px]">
                <span className="text-yes-300 font-bold">YES {featuredYesPct}%</span>
                <span className="text-no-300 font-bold">{100 - featuredYesPct}% NO</span>
              </div>
            </div>
            <p className="mt-5 text-center text-[12px] text-text-subtle">Tap to predict →</p>
          </Link>
        )}
      </section>

      {/* HOW IT WORKS */}
      <section>
        <h2 className="font-display text-[24px] font-semibold text-text mb-4">How it works</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Step n="01" en="Pick a side" sw="Chagua upande" body="YES or NO on a real-world question. Sources are public; criteria are written before the market opens." />
          <Step n="02" en="Stake TZS" sw="Weka dau" body="Mobile money in seconds. Min TZS 100. Your stake adds to the YES or NO pool — that&apos;s where probabilities come from." />
          <Step n="03" en="Get paid if right" sw="Pata malipo" body="Two-officer resolution at the deadline. Winners share the losers&apos; pool minus 9% operator margin." />
        </div>
      </section>

      {/* WHY US */}
      <section>
        <h2 className="font-display text-[24px] font-semibold text-text mb-4">Built for Tanzania</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <WhyCard icon={<ShieldCheck size={22} />} title="GBT-licensed" body="Operating under Tanzania Gaming Board licensing. Two-person resolution. Full audit chain. KYC + AML built-in." />
          <WhyCard icon={<BarChart3 size={22} />} title="Provably resolved" body="Every market resolution carries a source URL + officer attestation + 24h objection window. Verifiable on the fairness page." href="/fairness" />
          <WhyCard icon={<Smartphone size={22} />} title="M-Pesa native" body="Deposit + withdraw in seconds via M-Pesa, Tigo Pesa, Airtel Money, HaloPesa, or Mixx by Yas." />
        </div>
      </section>

      {/* LIVE GRID */}
      {live.length > 0 && (
        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-[24px] font-semibold text-text">Live markets</h2>
            <Link href={"/markets" as never} className="font-mono text-[12px] uppercase tracking-[0.16em] text-text-muted hover:text-text">
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
      <p className="font-mono text-[12px] tracking-[0.16em] font-bold text-gold-300 mb-2">{n}</p>
      <h3 className="font-display text-[18px] font-semibold leading-tight text-text">{en}</h3>
      <p className="text-[13px] italic text-text-subtle mt-1">{sw}</p>
      <p className="mt-3 text-[14px] leading-relaxed text-text-muted">{body}</p>
    </div>
  );
}

function WhyCard({ icon, title, body, href }: { icon: React.ReactNode; title: string; body: string; href?: string }) {
  const inner = (
    <div className="rounded-lg border border-border bg-bg-elevated p-5 h-full transition-colors hover:border-border-strong">
      <div className="text-teal-300 mb-3">{icon}</div>
      <h3 className="font-display text-[18px] font-semibold text-text">{title}</h3>
      <p className="mt-2 text-[14px] leading-relaxed text-text-muted">{body}</p>
    </div>
  );
  return href ? <Link href={href as never}>{inner}</Link> : inner;
}
