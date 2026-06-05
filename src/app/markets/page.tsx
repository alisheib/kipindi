import Link from "next/link";
import { Trophy, ArrowRight } from "lucide-react";
import { I } from "@/components/ui/glyphs";
import { MarketCard } from "@/components/markets/market-card";
import { listMarkets, impliedYesPct, isClosedByTime, seedDemoMarkets, traderSeedsByMarket, type MarketCategory } from "@/lib/server/market-service";
import { getCardChart } from "@/lib/server/market-history";
import { getProposalsConfig } from "@/lib/server/proposals-config";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Markets · Soko" };
export const dynamic = "force-dynamic";

const CATEGORIES: Array<{ id: "all" | MarketCategory; label: string }> = [
  { id: "all",     label: "All" },
  { id: "sports",  label: "Sports" },
  { id: "macro",   label: "Macro" },
  { id: "weather", label: "Weather" },
  { id: "crypto",  label: "Crypto" },
  { id: "culture", label: "Culture" },
];

// "When does it close?" filter — kit-faithful pill row above the
// category tabs. Lets the operator drop the manager straight onto
// minute-scale demo markets so the bet → resolve → celebrate loop
// closes inside a single demo session.
type WhenFilter = "soon" | "today" | "week" | "all";
const WHEN_OPTIONS: Array<{ id: WhenFilter; label: string; sw: string; cutoffMs: number | null }> = [
  { id: "soon",  label: "Ending soon",  sw: "Karibu kuisha",   cutoffMs: 60 * 60_000 },        // ≤ 1h
  { id: "today", label: "Today",        sw: "Leo",             cutoffMs: 24 * 3600_000 },      // ≤ 24h
  { id: "week",  label: "This week",    sw: "Wiki hii",        cutoffMs: 7 * 24 * 3600_000 },  // ≤ 7d
  { id: "all",   label: "All",          sw: "Vyote",           cutoffMs: null },
];

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

export default function MarketsPage({ searchParams }: { searchParams: Promise<{ cat?: string; when?: string }> }) {
  seedDemoMarkets();
  const allLive = listMarkets({ status: "LIVE" }).filter((m) => !isClosedByTime(m));
  const totalVolume = allLive.reduce((s, m) => s + m.yesPool + m.noPool, 0);
  return (
    <main className="mx-auto max-w-[1480px] px-3 lg:px-6 py-6">
      {/* Lean, content-first header — the marketing hero lives on the homepage. */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-text-subtle">Markets · Soko</p>
        <p className="font-mono text-[10.5px] text-text-subtle tabular-nums whitespace-nowrap">
          {allLive.length} live · TZS {(totalVolume / 1000).toFixed(0)}k in play
        </p>
      </div>

      <ProposalEntryCard />

      {/* Filters as a left column on desktop, stacked above the grid on mobile. */}
      <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:gap-6">
        <aside className="lg:w-[208px] lg:shrink-0 lg:sticky lg:top-[72px] lg:self-start lg:max-h-[calc(100dvh-84px)] lg:overflow-y-auto lg:overflow-x-hidden kp-thin-scroll lg:pb-3">
          <FilterBar searchParams={searchParams} />
        </aside>
        <div className="min-w-0 flex-1">
          <SearchAwareGrid searchParams={searchParams} />
        </div>
      </div>
    </main>
  );
}

/** Gold-accented entry point into Feature 2 (player market proposals). */
function ProposalEntryCard() {
  const cfg = getProposalsConfig();
  if (!cfg.enabled) return null;
  return (
    <Link
      href={"/proposals" as never}
      className="group flex items-center gap-3.5 rounded-xl border p-4 transition-colors hover:border-gold-500"
      style={{ borderColor: "color-mix(in oklab, var(--gold-500) 30%, var(--border))", background: "color-mix(in oklab, var(--gold-500) 6%, var(--bg-elevated))" }}
    >
      <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[11px] text-gold-fg" style={{ background: "linear-gradient(180deg, var(--gold-400), var(--gold-600))" }}>
        <I.trophy s={22} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-[14.5px] font-bold text-text">Propose Markets &amp; Get Paid</p>
        <p className="font-display italic text-text-subtle text-[11.5px]">Pendekeza soko{cfg.prizeTzs > 0 ? ` · pata TZS ${cfg.prizeTzs.toLocaleString()}` : ""}</p>
      </div>
      <I.arrowRight s={18} />
    </Link>
  );
}

async function FilterBar({ searchParams }: { searchParams: Promise<{ cat?: string; when?: string }> }) {
  const sp = await searchParams;
  const activeWhen = (sp.when as WhenFilter | undefined) ?? "today";
  const activeCat = sp.cat ?? "all";
  const buildHref = (next: { when?: WhenFilter; cat?: string }) => {
    const params = new URLSearchParams();
    const w = next.when ?? activeWhen;
    const c = next.cat  ?? activeCat;
    if (w !== "today") params.set("when", w);
    if (c !== "all")   params.set("cat", c);
    const qs = params.toString();
    return qs ? `/markets?${qs}` : "/markets";
  };
  return (
    <div className="space-y-2.5 lg:space-y-4">
      <nav aria-label="When does it close?" className="flex flex-wrap items-center gap-1.5 -mx-1 px-1 overflow-x-auto lg:flex-col lg:flex-nowrap lg:items-stretch lg:gap-1 lg:mx-0 lg:px-0 lg:overflow-visible">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-text-subtle pr-1 lg:pr-0 lg:mb-1">When</span>
        {WHEN_OPTIONS.map((o) => {
          const active = o.id === activeWhen;
          return (
            <a
              key={o.id}
              href={buildHref({ when: o.id })}
              className={
                "inline-flex h-8 items-center rounded-md border px-3.5 font-mono text-[12px] font-semibold whitespace-nowrap transition-all lg:w-full lg:justify-start " +
                (active
                  ? "border-brand-500 text-text"
                  : "border-border bg-bg-elevated/60 text-text-muted hover:border-brand-400 hover:text-text")
              }
              style={active ? { background: "oklch(40% 0.12 262 / 0.35)", boxShadow: "0 0 10px oklch(63% 0.18 262 / 0.15)" } : undefined}
            >
              {o.label}
              <span className="ml-1.5 italic font-normal text-[10.5px] text-text-subtle">· {o.sw}</span>
            </a>
          );
        })}
      </nav>
      <nav aria-label="Market categories" className="flex flex-wrap items-center gap-1.5 -mx-1 px-1 overflow-x-auto lg:flex-col lg:flex-nowrap lg:items-stretch lg:gap-1 lg:mx-0 lg:px-0 lg:overflow-visible">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-text-subtle pr-1 lg:pr-0 lg:mb-1">Topic</span>
        {CATEGORIES.map((c) => {
          const active = c.id === activeCat;
          return (
            <a
              key={c.id}
              href={buildHref({ cat: c.id })}
              className={
                "inline-flex h-8 items-center rounded-md border px-3.5 font-mono text-[12px] font-semibold whitespace-nowrap transition-all lg:w-full lg:justify-start " +
                (active
                  ? "border-brand-500 text-text"
                  : "border-border bg-bg-elevated/60 text-text-muted hover:border-brand-400 hover:text-text")
              }
              style={active ? { background: "oklch(40% 0.12 262 / 0.35)", boxShadow: "0 0 10px oklch(63% 0.18 262 / 0.15)" } : undefined}
            >
              {c.label}
            </a>
          );
        })}
      </nav>
    </div>
  );
}

async function SearchAwareGrid({ searchParams }: { searchParams: Promise<{ cat?: string; when?: string }> }) {
  const sp = await searchParams;
  const cat = (sp.cat as MarketCategory | undefined) ?? undefined;
  const whenId = (sp.when as WhenFilter | undefined) ?? "today";
  const whenCfg = WHEN_OPTIONS.find(o => o.id === whenId) ?? WHEN_OPTIONS[1];
  const now = Date.now();
  // Sort by closest-to-resolution first so the demo-friendly minute-scale
  // markets float to the top. Past-resolution markets sink (they're in the
  // resolver queue, not the live grid).
  const liveAll = listMarkets({ status: "LIVE", category: cat })
    // Filter out markets whose clock has already passed but the
    // resolver hasn't yet acted — they're closed-by-time, not bettable,
    // and showing them in the LIVE grid produces a confused UX where
    // you can click a card whose dial then refuses to fire.
    .filter(m => !isClosedByTime(m))
    .map(m => ({ m, ms: Math.max(0, Date.parse(m.resolutionAt) - now) }))
    .sort((a, b) => a.ms - b.ms);
  const live = (whenCfg.cutoffMs === null
    ? liveAll
    : liveAll.filter(x => x.ms <= whenCfg.cutoffMs!)
  ).map(x => x.m);
  const resolved = listMarkets({ status: "RESOLVED" }).slice(0, 6);
  const traderMap = traderSeedsByMarket();

  return (
    <>
      <section className="market-grid">
        {live.map((m) => {
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
        {live.length === 0 && (
          <div className="col-span-full">
            <EmptyState
              kind="markets"
              title="No markets in this category yet"
              titleSw="Hakuna soko bado kwenye aina hii"
              body="Try a different category, or check back soon — operators publish new markets daily."
              bodySw="Jaribu aina nyingine au rudi baadaye."
              action={
                <Link
                  href="/markets"
                  className="inline-flex h-9 items-center px-4 rounded-pill border border-border-strong bg-bg-elevated font-semibold text-text hover:bg-bg-overlay text-[13px] transition-colors"
                >
                  See all categories
                </Link>
              }
            />
          </div>
        )}
      </section>

      {resolved.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 font-display text-[20px] font-semibold text-text">Recently resolved</h2>
          <div className="market-grid">
            {resolved.map((m) => (
              <MarketCard
                key={m.id}
                id={m.id}
                titleEn={m.titleEn}
                titleSw={m.titleSw}
                category={m.category}
                yesPct={impliedYesPct(m)}
                volume={m.yesPool + m.noPool}
                predictors={m.predictorCount}
                timeLeft={`Resolved ${m.resolvedOutcome}`}
                status="RESOLVED"
                sourceUrl={m.sourceUrl}
                spark={getCardChart(m.id).spark}
              />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
