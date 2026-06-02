import Link from "next/link";
import { ArrowRight, ShieldCheck, Smartphone, BarChart3 } from "lucide-react";
import { MarketCard } from "@/components/markets/market-card";
import { FiftyLockup } from "@/components/brand";
import { HeroConstellation } from "@/components/landing/hero-constellation";
import { listMarkets, impliedYesPct, seedDemoMarkets } from "@/lib/server/market-service";
import { getCardChart } from "@/lib/server/market-history";
import { getSession } from "@/lib/server/session";

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

export default async function LandingPage() {
  seedDemoMarkets();
  const live = listMarkets({ status: "LIVE" }).slice(0, 6);
  const session = await getSession();
  const isAuthed = !!session;

  return (
    <div className="mx-auto max-w-[1480px] px-3 lg:px-6 py-6 lg:py-8 space-y-8 lg:space-y-10">

      {/* HERO — the kit's Hero Constellation. Seven dials breathing on
          their own phases, particle drift, tipping horizon, editorial
          captions on hover. The composition is the centerpiece; the
          headline + CTAs sit beside it. */}
      <section className="relative mx-auto w-full max-w-[1240px] grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-6 lg:gap-10 items-center">
        <div className="flex flex-col gap-6 lg:gap-7 order-2 lg:order-1">
          <div className="flex items-center gap-3">
            <FiftyLockup size={22} />
            <span
              className="hidden sm:inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.16em]"
              style={{ color: "oklch(78% 0.13 80)" }}
            >
              <span style={{ width: 5, height: 5, borderRadius: 999, background: "oklch(78% 0.13 80)" }} />
              Tanzania · Soko la utabiri
            </span>
          </div>

          <h1
            className="font-display font-bold text-[40px] sm:text-[52px] md:text-[64px] leading-[1.02] tracking-[-0.03em] max-w-[18ch] m-0 text-text"
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

          <div className="flex items-center gap-3 -mt-1">
            <span style={{ height: 1, width: 80, background: "linear-gradient(90deg, oklch(78% 0.13 80), transparent)" }} />
            <span className="font-mono text-[10.5px] uppercase tracking-[0.16em]" style={{ color: "oklch(78% 0.13 80)" }}>
              Est. 2026 · Dar es Salaam
            </span>
          </div>

          <p className="font-display text-[15px] md:text-[18px] leading-[1.5] max-w-[58ch] m-0 text-text-muted">
            Pesa kidogo, ukweli mkubwa. Trade questions about Tanzania&apos;s weather, markets, sport and culture — settled by official sources.
          </p>

          <div className="flex flex-wrap gap-3 items-center">
            {isAuthed ? (
              <>
                <Link
                  href={"/markets" as never}
                  className="btn btn-gold inline-flex items-center gap-2"
                  style={{ height: 48, padding: "0 26px", fontSize: 15, borderRadius: 999 }}
                >
                  Browse markets
                  <ArrowRight size={16} aria-hidden />
                </Link>
                <Link
                  href={"/positions" as never}
                  className="btn btn-ghost inline-flex items-center"
                  style={{ height: 48, padding: "0 22px", fontSize: 14, borderRadius: 999 }}
                >
                  My positions
                </Link>
              </>
            ) : (
              <>
                <Link
                  href={"/auth/register" as never}
                  className="btn btn-gold inline-flex items-center gap-2"
                  style={{ height: 48, padding: "0 26px", fontSize: 15, borderRadius: 999 }}
                >
                  Create account
                  <ArrowRight size={16} aria-hidden />
                </Link>
                <Link
                  href={"/auth/login" as never}
                  className="btn btn-ghost inline-flex items-center"
                  style={{ height: 48, padding: "0 22px", fontSize: 14, borderRadius: 999 }}
                >
                  Sign in
                </Link>
                <Link
                  href={"/markets" as never}
                  className="font-mono text-[11px] uppercase tracking-[0.14em] hover:underline self-center"
                  style={{ color: "oklch(72% 0.10 200)" }}
                >
                  Browse markets first →
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="order-1 lg:order-2 -mx-3 lg:mx-0">
          <HeroConstellation height={540} />
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
          <div className="market-grid">
            {live.slice(0, 8).map((m) => {
              const cc = getCardChart(m.id);
              return (
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
                  spark={cc.spark}
                  move24h={cc.move24h}
                />
              );
            })}
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
            body="Price Competition pool. Min TZS 100. Drag the conviction needle on any market."
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
