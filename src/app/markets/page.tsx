import Link from "next/link";
import { MarketCard } from "@/components/markets/market-card";
import { listMarkets, impliedYesPct, seedDemoMarkets, type MarketCategory } from "@/lib/server/market-service";
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

export default function MarketsPage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  seedDemoMarkets();
  return (
    <main className="mx-auto max-w-[1240px] px-3 lg:px-6 py-6 space-y-5">
      <header className="space-y-1">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-text-subtle">Markets · Soko</p>
        <h1 className="font-display text-[28px] font-bold text-text">Predict events. Not chance.</h1>
        <p className="text-[15px] text-text-muted italic">Tabiri matukio. Si bahati.</p>
      </header>

      <CategoryTabs />

      <SearchAwareGrid searchParams={searchParams} />
    </main>
  );
}

function CategoryTabs() {
  return (
    <nav aria-label="Market categories" className="flex flex-wrap gap-1.5 -mx-1 px-1 overflow-x-auto">
      {CATEGORIES.map((c) => (
        <a
          key={c.id}
          href={c.id === "all" ? "/markets" : `/markets?cat=${c.id}`}
          className="inline-flex h-8 items-center rounded-pill border border-border bg-bg-elevated px-3.5 font-mono text-[12px] font-semibold text-text-muted hover:border-teal-500 hover:text-text whitespace-nowrap"
        >
          {c.label}
        </a>
      ))}
    </nav>
  );
}

async function SearchAwareGrid({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const sp = await searchParams;
  const cat = (sp.cat as MarketCategory | undefined) ?? undefined;
  const live = listMarkets({ status: "LIVE", category: cat });
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
