import Link from "next/link";
import { MarketCard } from "@/components/markets/market-card";
import { listMarkets, impliedYesPct, isClosedByTime, seedDemoMarkets, type MarketCategory } from "@/lib/server/market-service";
import { EmptyState } from "@/components/ui/empty-state";
import { PageRibbon } from "@/components/layout/page-ribbon";

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
  const totalPredictors = allLive.reduce((s, m) => s + m.predictorCount, 0);
  return (
    <main className="mx-auto max-w-[1240px] px-3 lg:px-6 py-6 space-y-5">
      <header className="space-y-1">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-text-subtle">Markets · Soko</p>
        <h1 className="font-display text-[28px] font-bold text-text">Predict events. Not chance.</h1>
        <p className="text-[15px] text-text-muted italic">Tabiri matukio. Si bahati.</p>
      </header>

      <PageRibbon
        stats={[
          { label: "Live", sw: "Hai", value: String(allLive.length), accent: "gold" },
          { label: "Predictors", sw: "Watabiri", value: totalPredictors.toLocaleString("en-US") },
          {
            label: "In play",
            sw: "Bwawani",
            value: `TZS ${(totalVolume / 1000).toFixed(0)}k`,
          },
        ]}
      />

      <FilterBar searchParams={searchParams} />

      <SearchAwareGrid searchParams={searchParams} />
    </main>
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
    <div className="space-y-2.5">
      <nav aria-label="When does it close?" className="flex flex-wrap items-center gap-1.5 -mx-1 px-1 overflow-x-auto">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-text-subtle pr-1">When</span>
        {WHEN_OPTIONS.map((o) => {
          const active = o.id === activeWhen;
          return (
            <a
              key={o.id}
              href={buildHref({ when: o.id })}
              className={
                "inline-flex h-8 items-center rounded-pill border px-3.5 font-mono text-[12px] font-semibold whitespace-nowrap transition-colors " +
                (active
                  ? "border-gold-500 bg-gold-500/10 text-gold-300"
                  : "border-border bg-bg-elevated text-text-muted hover:border-gold-700 hover:text-text")
              }
            >
              {o.label}
              <span className="ml-1.5 italic font-normal text-[10.5px] text-text-subtle">· {o.sw}</span>
            </a>
          );
        })}
      </nav>
      <nav aria-label="Market categories" className="flex flex-wrap items-center gap-1.5 -mx-1 px-1 overflow-x-auto">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-text-subtle pr-1">Topic</span>
        {CATEGORIES.map((c) => {
          const active = c.id === activeCat;
          return (
            <a
              key={c.id}
              href={buildHref({ cat: c.id })}
              className={
                "inline-flex h-8 items-center rounded-pill border px-3.5 font-mono text-[12px] font-semibold whitespace-nowrap transition-colors " +
                (active
                  ? "border-text bg-bg-overlay text-text"
                  : "border-border bg-bg-elevated text-text-muted hover:border-text hover:text-text")
              }
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

  return (
    <>
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {live.map((m) => (
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
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
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
              />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
