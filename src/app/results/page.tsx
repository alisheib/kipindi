import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { MarketCard } from "@/components/markets/market-card";
import { listMarkets, impliedYesPct, type MarketCategory } from "@/lib/server/market-service";
import { getCardChart } from "@/lib/server/market-history";
import { EmptyState } from "@/components/ui/empty-state";
import { ResultsSearch } from "./results-search";

export const metadata = { title: "Results · Matokeo" };
export const dynamic = "force-dynamic";

const PER_PAGE = 12;

const CATEGORIES: Array<{ id: "all" | MarketCategory; label: string }> = [
  { id: "all",     label: "All" },
  { id: "sports",  label: "Sports" },
  { id: "macro",   label: "Macro" },
  { id: "weather", label: "Weather" },
  { id: "crypto",  label: "Crypto" },
  { id: "culture", label: "Culture" },
  { id: "tech",    label: "Tech" },
  { id: "other",   label: "Other" },
];

type SortField = "resolved" | "volume";
const SORT_OPTIONS: Array<{ id: SortField; label: string; sw: string }> = [
  { id: "resolved", label: "Newest resolved", sw: "Mpya zaidi" },
  { id: "volume",   label: "Highest volume",  sw: "Kiasi kikubwa" },
];

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; sort?: string; q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const activeCat = sp.cat ?? "all";
  const activeSort: SortField = sp.sort === "volume" ? "volume" : "resolved";
  const qRaw = (sp.q ?? "").trim().slice(0, 100);
  const searching = qRaw.length > 0;
  const tokens = qRaw.toLowerCase().split(/\s+/).filter(Boolean);
  const pageNum = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const matches = (m: { titleEn: string; titleSw: string; category: string; resolutionCriterion?: string }) => {
    if (!searching) return true;
    const hay = `${m.titleEn} ${m.titleSw} ${m.category} ${m.resolutionCriterion ?? ""}`.toLowerCase();
    return tokens.every((t) => hay.includes(t));
  };

  // Fetch all resolved + voided
  const effectiveCat = searching ? undefined : (activeCat === "all" ? undefined : activeCat as MarketCategory);
  const resolved = (await listMarkets({ status: "RESOLVED", category: effectiveCat })).filter(matches);
  const voided = (await listMarkets({ status: "VOIDED", category: effectiveCat })).filter(matches);
  const all = [...resolved, ...voided];

  // Sort
  if (activeSort === "volume") {
    all.sort((a, b) => (b.yesPool + b.noPool) - (a.yesPool + a.noPool));
  } else {
    // Newest resolved first — use resolutionStage2At (final confirmation), fallback to updatedAt
    all.sort((a, b) => {
      const aDate = a.resolutionStage2At ?? a.updatedAt;
      const bDate = b.resolutionStage2At ?? b.updatedAt;
      return bDate.localeCompare(aDate);
    });
  }

  // Paginate
  const totalCount = all.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PER_PAGE));
  const safePage = Math.min(pageNum, totalPages);
  const paged = all.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  // KPIs
  const totalVolume = all.reduce((s, m) => s + m.yesPool + m.noPool, 0);
  const yesWins = all.filter((m) => m.resolvedOutcome === "YES").length;
  const noWins = all.filter((m) => m.resolvedOutcome === "NO").length;
  const voidCount = all.filter((m) => m.resolvedOutcome === "VOID" || m.status === "VOIDED").length;

  // Build chart data for visible page only
  const cardCharts = new Map(
    await Promise.all(paged.map(async (m) => [m.id, await getCardChart(m.id)] as const)),
  );

  // Helpers
  const buildHref = (next: { cat?: string; sort?: string; page?: number }) => {
    const params = new URLSearchParams();
    const c = next.cat ?? activeCat;
    const s = next.sort ?? activeSort;
    const p = next.page ?? safePage;
    if (c !== "all") params.set("cat", c);
    if (s !== "resolved") params.set("sort", s);
    if (qRaw) params.set("q", qRaw);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/results?${qs}` : "/results";
  };

  return (
    <main className="mx-auto max-w-[1280px] px-3 lg:px-6 py-6">
      <h1 className="sr-only">Results · Matokeo</h1>

      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-gold-300"><I.resolved s={18} /></span>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-text-subtle">Results · Matokeo</p>
        </div>
        <p className="font-mono text-[10.5px] text-text-subtle tabular-nums whitespace-nowrap">
          {totalCount} resolved · TZS {(totalVolume / 1000).toFixed(0)}k settled
        </p>
      </div>

      {/* Search */}
      <div className="sticky top-[56px] z-20 bg-bg-base py-2.5">
        <ResultsSearch />
      </div>

      {/* Filters + Grid */}
      <div className="mt-1 flex flex-col gap-5 lg:flex-row lg:gap-6">
        {/* Sidebar filters */}
        <aside className="lg:w-[208px] lg:shrink-0 lg:sticky lg:top-[122px] lg:self-start lg:max-h-[calc(100dvh-134px)] lg:overflow-y-auto lg:overflow-x-hidden kp-thin-scroll lg:pb-3">
          <div className="space-y-2.5 lg:space-y-4">
            {/* Sort */}
            <nav aria-label="Sort results" className="flex flex-wrap items-center gap-1.5 -mx-1 px-1 overflow-x-auto lg:flex-col lg:flex-nowrap lg:items-stretch lg:gap-1 lg:mx-0 lg:px-0 lg:overflow-visible">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-text-subtle pr-1 lg:pr-0 lg:mb-1">Sort</span>
              {SORT_OPTIONS.map((o) => {
                const active = o.id === activeSort;
                return (
                  <a
                    key={o.id}
                    href={buildHref({ sort: o.id, page: 1 })}
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

            {/* Categories */}
            <nav aria-label="Market categories" className="flex flex-wrap items-center gap-1.5 -mx-1 px-1 overflow-x-auto lg:flex-col lg:flex-nowrap lg:items-stretch lg:gap-1 lg:mx-0 lg:px-0 lg:overflow-visible">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-text-subtle pr-1 lg:pr-0 lg:mb-1">Topic</span>
              {CATEGORIES.map((c) => {
                const active = c.id === activeCat;
                return (
                  <a
                    key={c.id}
                    href={buildHref({ cat: c.id, page: 1 })}
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

            {/* Outcome summary */}
            {totalCount > 0 && (
              <div className="rounded-lg border border-border bg-bg-elevated/60 p-3 space-y-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-text-subtle">Outcomes</p>
                <div className="space-y-1.5">
                  <OutcomeStat label="YES wins" count={yesWins} total={totalCount} color="var(--yes-400)" />
                  <OutcomeStat label="NO wins" count={noWins} total={totalCount} color="var(--no-400)" />
                  {voidCount > 0 && <OutcomeStat label="Voided" count={voidCount} total={totalCount} color="var(--text-subtle)" />}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Grid */}
        <div className="min-w-0 flex-1">
          {searching && (
            <p aria-live="polite" className="mb-3 font-mono text-[11px] text-text-subtle tabular-nums">
              {totalCount === 0
                ? `No results match "${qRaw}"`
                : `${totalCount} ${totalCount === 1 ? "result" : "results"} match "${qRaw}"`}
            </p>
          )}

          {paged.length > 0 ? (
            <>
              <section className="market-grid">
                {paged.map((m) => (
                  <MarketCard
                    key={m.id}
                    id={m.id}
                    titleEn={m.titleEn}
                    titleSw={m.titleSw}
                    category={m.category}
                    yesPct={impliedYesPct(m)}
                    volume={m.yesPool + m.noPool}
                    predictors={m.predictorCount}
                    timeLeft={m.resolvedOutcome === "VOID" ? "Voided" : `Resolved ${m.resolvedOutcome}`}
                    status={m.status === "VOIDED" ? "VOIDED" : "RESOLVED"}
                    sourceUrl={m.sourceUrl}
                    spark={(cardCharts.get(m.id) ?? { spark: [] }).spark}
                  />
                ))}
              </section>

              {/* Pagination */}
              {totalPages > 1 && (
                <nav aria-label="Results pagination" className="mt-6 flex items-center justify-center gap-1.5">
                  {safePage > 1 && (
                    <a
                      href={buildHref({ page: safePage - 1 })}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-bg-elevated/60 text-text-subtle hover:text-text hover:border-brand-400 transition-all"
                      aria-label="Previous page"
                    >
                      <I.chevronLeft s={14} />
                    </a>
                  )}
                  {pageButtons(safePage, totalPages).map((p, i) =>
                    p === null ? (
                      <span key={`e${i}`} className="px-1 text-text-subtle">…</span>
                    ) : (
                      <a
                        key={p}
                        href={buildHref({ page: p })}
                        aria-current={p === safePage ? "page" : undefined}
                        className={
                          "inline-flex h-8 min-w-[32px] items-center justify-center rounded-md border px-2 font-mono text-[12px] font-semibold transition-all " +
                          (p === safePage
                            ? "border-brand-500 text-text"
                            : "border-border bg-bg-elevated/60 text-text-muted hover:border-brand-400 hover:text-text")
                        }
                        style={p === safePage ? { background: "oklch(40% 0.12 262 / 0.35)" } : undefined}
                      >
                        {p}
                      </a>
                    ),
                  )}
                  {safePage < totalPages && (
                    <a
                      href={buildHref({ page: safePage + 1 })}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-bg-elevated/60 text-text-subtle hover:text-text hover:border-brand-400 transition-all"
                      aria-label="Next page"
                    >
                      <I.chevronRight s={14} />
                    </a>
                  )}
                  <span className="ml-3 font-mono text-[10.5px] text-text-subtle tabular-nums">
                    {(safePage - 1) * PER_PAGE + 1}–{Math.min(safePage * PER_PAGE, totalCount)} of {totalCount}
                  </span>
                </nav>
              )}
            </>
          ) : (
            <EmptyState
              kind="markets"
              title={searching ? `No results match "${qRaw}"` : "No resolved markets yet"}
              titleSw={searching ? "Hakuna matokeo yanayolingana" : "Bado hakuna soko lililotatuliwa"}
              body={searching
                ? "Try different keywords or clear the search."
                : "Resolved markets will appear here once outcomes are confirmed."
              }
              bodySw={searching
                ? "Jaribu maneno mengine au futa utafutaji."
                : "Masoko yaliyotatuliwa yataonekana hapa matokeo yanapothibitishwa."
              }
              action={
                searching ? (
                  <Link href="/results" className="btn btn-ghost btn-sm">Clear search · Futa</Link>
                ) : (
                  <Link href="/markets" className="btn btn-gold btn-sm">Browse live markets →</Link>
                )
              }
              className="max-w-[360px]"
            />
          )}
        </div>
      </div>
    </main>
  );
}

/** Outcome mini-bar in sidebar */
function OutcomeStat({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-[10.5px] text-text-muted">{label}</span>
        <span className="font-mono text-[10.5px] tabular-nums text-text-subtle">{count} ({pct}%)</span>
      </div>
      <div className="h-1.5 w-full rounded-pill bg-bg-overlay overflow-hidden">
        <div className="h-full rounded-pill transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

/** Smart page buttons: 1 … 4 [5] 6 … 10 */
function pageButtons(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | null)[] = [];
  pages.push(1);
  if (current > 3) pages.push(null);
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2) pages.push(null);
  pages.push(total);
  return pages;
}
