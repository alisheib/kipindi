import Link from "next/link";
import { ArrowRight, ShieldCheck, Smartphone, BarChart3 } from "lucide-react";
import { MarketCard } from "@/components/markets/market-card";
import { FiftyLockup } from "@/components/brand";
import { listMarkets, impliedYesPct, seedDemoMarkets, traderSeedsByMarket } from "@/lib/server/market-service";
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
  const traderMap = traderSeedsByMarket();
  const session = await getSession();
  const isAuthed = !!session;

  return (
    <div className="space-y-8 lg:space-y-10">

      {/* HERO — full-bleed background image with text overlay.
          The F1 champagne image takes over the entire hero. A directional
          gradient overlay darkens the left for text readability while
          letting the image show clearly on the right. */}
      <section className="relative w-full overflow-hidden" style={{ minHeight: "75vh" }}>
        {/* Background image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero/hero-bg.webp"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: "saturate(0.75) brightness(0.5)" }}
        />

        {/* Gradient overlay — left darker for text, right transparent for image */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(
                90deg,
                oklch(10% 0.08 268 / 0.85) 0%,
                oklch(10% 0.08 268 / 0.60) 35%,
                oklch(10% 0.06 268 / 0.30) 60%,
                oklch(10% 0.04 268 / 0.10) 100%
              ),
              linear-gradient(
                180deg,
                oklch(10% 0.08 268 / 0.15) 0%,
                transparent 40%,
                oklch(10% 0.08 268 / 0.55) 100%
              )
            `,
          }}
        />

        {/* Content */}
        <div
          className="relative flex flex-col justify-center px-6 sm:px-10 lg:px-16 xl:px-24 py-16 lg:py-24"
          style={{ zIndex: 2, minHeight: "75vh" }}
        >
          <div className="flex flex-col gap-5 lg:gap-6 max-w-[640px]">
            <div className="flex items-center gap-3">
              <FiftyLockup size={22} />
              <span
                className="hidden sm:inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.16em]"
                style={{ color: "oklch(90% 0.10 80)" }}
              >
                <span style={{ width: 5, height: 5, borderRadius: 999, background: "oklch(90% 0.10 80)" }} />
                Tanzania · Dar es Salaam
              </span>
            </div>

            <h1
              className="font-display font-bold text-[42px] sm:text-[56px] md:text-[68px] leading-[1.02] tracking-[-0.03em] max-w-[18ch] m-0"
              style={{ color: "oklch(99% 0.006 268)", textShadow: "0 2px 24px oklch(8% 0.10 268 / 0.7)" }}
            >
              The{" "}
              <span
                style={{
                  background: "linear-gradient(180deg, oklch(94% 0.12 82) 0%, oklch(74% 0.15 78) 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                wisdom
              </span>{" "}
              of <span style={{ color: "oklch(80% 0.18 152)" }}>YES</span> &{" "}
              <span style={{ color: "oklch(80% 0.20 22)" }}>NO</span>.
            </h1>

            <div className="flex items-center gap-3">
              <span style={{ height: 1, width: 80, background: "linear-gradient(90deg, oklch(90% 0.10 80), transparent)" }} />
              <span className="font-mono text-[10.5px] uppercase tracking-[0.16em]" style={{ color: "oklch(90% 0.10 80)" }}>
                Est. 2026 · Dar es Salaam
              </span>
            </div>

            <p
              className="font-display text-[15px] md:text-[18px] leading-[1.55] max-w-[52ch] m-0"
              style={{ color: "oklch(88% 0.03 268)", textShadow: "0 1px 12px oklch(8% 0.10 268 / 0.6)" }}
            >
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
                    style={{ height: 48, padding: "0 22px", fontSize: 14, borderRadius: 999, borderColor: "oklch(80% 0.06 268 / 0.4)", color: "oklch(94% 0.03 268)" }}
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
                    style={{ height: 48, padding: "0 22px", fontSize: 14, borderRadius: 999, borderColor: "oklch(80% 0.06 268 / 0.4)", color: "oklch(94% 0.03 268)" }}
                  >
                    Sign in
                  </Link>
                  <Link
                    href={"/markets" as never}
                    className="font-mono text-[11px] uppercase tracking-[0.14em] hover:underline self-center"
                    style={{ color: "oklch(84% 0.08 200)" }}
                  >
                    Browse markets first →
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Rest of page — centered container */}
      <div className="mx-auto max-w-[1480px] px-3 lg:px-6 space-y-8 lg:space-y-10">

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
                  traders={traderMap.get(m.id)}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* TRUST STRIP — combined "how + why" in one tight row, no more 6-card scroll.
          v2 Dark Glass: top-lit royal glass panel + faint gilt/aqua corner glow
          + 1px inner light-edge, so it reads as a premium frosted panel at rest. */}
      <section
        className="relative overflow-hidden rounded-xl border border-border p-5 lg:p-7"
        style={{
          background:
            "radial-gradient(130% 150% at 0% 0%, oklch(27% 0.155 268) 0%, oklch(19% 0.12 268) 58%), " +
            "radial-gradient(80% 120% at 100% 0%, oklch(40% 0.10 80 / 0.10), transparent 60%)",
          backdropFilter: "blur(14px)",
          boxShadow: "var(--shadow-3), inset 0 1px 0 oklch(100% 0 0 / 0.06)",
        }}
      >
        <div className="relative grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-7">
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

      </div>{/* end centered container */}
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
      <span
        className={`shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border-strong ${accent}`}
        style={{
          background: "linear-gradient(180deg, var(--bg-elevated2), var(--bg-overlay))",
          boxShadow: "inset 0 1px 0 oklch(100% 0 0 / 0.06)",
        }}
      >
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
