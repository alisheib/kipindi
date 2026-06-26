import Link from "next/link";
import { AdminPageHead, AdminCard } from "@/components/admin/admin-shell";
import { AdminPagination, PER_PAGE, parsePage, buildBaseHref } from "@/components/admin/admin-pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { I } from "@/components/ui/glyphs";
import { Select } from "@/components/ui/select";
import { listMarkets, impliedYesPct, type MarketCategory } from "@/lib/server/market-service";
import { ProbabilityBar } from "@/components/markets/probability-bar";
import { CircularProgress } from "@/components/markets/circular-progress";
import { ResolveControls } from "./resolve-controls";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Admin · Resolver queue" };
export const dynamic = "force-dynamic";

const fmtTime = formatDateTime;

const WINDOW_OPTIONS = [
  { value: "24h", label: "Next 24 hours" },
  { value: "48h", label: "Next 48 hours" },
  { value: "7d", label: "Next 7 days" },
  { value: "all", label: "All pending" },
] as const;

const CATEGORY_OPTIONS: readonly MarketCategory[] = ["sports", "macro", "weather", "crypto", "culture", "tech", "other"];

function timeUntil(iso: string): { label: string; tone: "default" | "soon" | "overdue" } {
  const ms = Date.parse(iso) - Date.now();
  if (ms <= 0) return { label: `${Math.abs(Math.floor(ms / 60_000))}m overdue`, tone: "overdue" };
  const m = Math.floor(ms / 60_000);
  if (m < 60) return { label: `${m}m`, tone: "soon" };
  const h = Math.floor(m / 60);
  if (h < 24) return { label: `${h}h`, tone: m < 60 * 24 ? "soon" : "default" };
  return { label: `${Math.floor(h / 24)}d`, tone: "default" };
}

export default async function ResolverQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string; category?: string; q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const windowFilter = (WINDOW_OPTIONS as readonly { value: string }[]).some((o) => o.value === sp.window) ? sp.window! : "24h";
  const categoryFilter = (CATEGORY_OPTIONS as readonly string[]).includes(sp.category ?? "") ? sp.category as MarketCategory : "";
  const query = (sp.q ?? "").trim().toLowerCase();

  const now = Date.now();
  const windowMs = windowFilter === "48h" ? 48 * 3600_000
    : windowFilter === "7d" ? 7 * 24 * 3600_000
    : windowFilter === "all" ? Infinity
    : 24 * 3600_000;

  const pending = (await listMarkets()).filter((m) => {
    const due = Date.parse(m.resolutionAt);
    if (m.status === "CLOSED") return true;
    if (m.status === "LIVE") return windowMs === Infinity || due - now < windowMs;
    return false;
  }).filter((m) => {
    if (categoryFilter && m.category !== categoryFilter) return false;
    if (query && !m.titleEn.toLowerCase().includes(query) && !(m.titleSw ?? "").toLowerCase().includes(query)) return false;
    return true;
  }).sort((a, b) => Date.parse(a.resolutionAt) - Date.parse(b.resolutionAt));

  // Paginate
  const page = parsePage(sp.page, pending.length);
  const paged = pending.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const baseHref = buildBaseHref("/admin/resolver-queue", { window: sp.window, category: sp.category, q: sp.q });
  const hasFilter = windowFilter !== "24h" || !!categoryFilter || !!query;

  return (
    <>
      <AdminPageHead
        title="Resolver queue"
        sw="Foleni ya utatuzi"
        period={false}
        actions={<span className="font-mono text-[10px] tracking-[0.14em] uppercase text-text-subtle">{pending.length} markets</span>}
      />
      <div className="px-4 lg:px-6 py-5 space-y-4">
        {/* Filters */}
        <AdminCard padding="p-3">
          <form className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
              <I.search size={14} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                name="q"
                defaultValue={query}
                placeholder="Search title…"
                aria-label="Search resolver queue"
                className="w-full h-9 pl-9 pr-3 rounded-md bg-surface border border-border text-text font-mono text-body-sm focus:outline-none admin-focus transition-colors"
              />
            </div>
            <div className="w-full sm:w-[160px]">
              <Select name="window" defaultValue={windowFilter} size="xs" placeholder="Time window"
                options={WINDOW_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
            </div>
            <div className="w-full sm:w-[150px]">
              <Select name="category" defaultValue={categoryFilter} size="xs" placeholder="All categories"
                options={[{ value: "", label: "All categories" }, ...CATEGORY_OPTIONS.map((c) => ({ value: c, label: c }))]} />
            </div>
            <button type="submit" className="btn btn-primary btn-sm" style={{ height: 36 }}>Filter</button>
            {hasFilter && <a href="/admin/resolver-queue" className="btn btn-ghost btn-sm" style={{ height: 36 }}>Clear</a>}
          </form>
        </AdminCard>

        {pending.length === 0 ? (
          <EmptyState
            kind="audit"
            title="Queue is clear"
            titleSw="Foleni ni tupu"
            body="No markets within 24 hours of resolution."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {paged.map((m) => {
              const t = timeUntil(m.resolutionAt);
              const yes = impliedYesPct(m);
              const stage1 = !!m.resolutionStage1By;
              // Confidence: derived from how lopsided the pool is (proxy for crowd certainty)
              const confidence = Math.round(Math.abs(yes - 50) * 2);
              return (
                <AdminCard key={m.id} padding="p-0" data-market-id={m.id}>
                  <div className="flex items-start gap-4 p-4 border-b border-border">
                    <CircularProgress
                      value={confidence}
                      size={64}
                      stroke={5}
                      tone={confidence > 75 ? "yes" : confidence > 40 ? "teal" : "warning"}
                      label={`${confidence}%`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span
                          className={`inline-flex items-center rounded-pill border px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap ${
                            t.tone === "overdue" ? "border-no-700 bg-no-500/15 text-no-300"
                            : t.tone === "soon" ? "border-warning-border bg-warning-bg/40 text-warning-fg"
                            : "border-border bg-bg-overlay text-text-muted"
                          }`}
                        >
                          {t.label}
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">{m.category}</span>
                        <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 font-mono text-[11px] text-teal-300 hover:text-teal-200">
                          Source
                          <I.ext size={11} />
                        </a>
                      </div>
                      <h3 className="mt-1 font-display text-[15px] font-semibold leading-tight text-text line-clamp-2">{m.titleEn}</h3>
                      <p className="text-[12px] italic text-text-subtle line-clamp-1">{m.titleSw}</p>
                      <p className="mt-1 font-mono text-[11px] text-text-subtle">Resolves {fmtTime(m.resolutionAt)}</p>
                    </div>
                  </div>

                  <div className="px-4 py-3 border-b border-border">
                    <ProbabilityBar yesPct={yes} size="micro" />
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className="font-mono text-[10px] text-text-subtle">Crowd: {yes}% YES · {100 - yes}% NO</p>
                      <Link
                        href={`/admin/markets/${m.id}` as never}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-bg-overlay px-2 py-0.5 font-mono text-[10.5px] font-semibold text-text-muted hover:border-brand-500 hover:text-text transition-colors whitespace-nowrap"
                      >
                        <I.users size={10} />
                        {m.predictorCount} {m.predictorCount === 1 ? "predictor" : "predictors"}
                      </Link>
                    </div>
                  </div>

                  {/* AI Sentinel recommendation (if this market was closed by AI) */}
                  {m.sentinelOutcome && (
                    <div className="px-4 py-3 border-b border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <I.sparkle s={14} className="text-brand-300" />
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em] font-semibold text-brand-300">AI recommendation</span>
                        {m.sentinelConfidence != null && (
                          <span className="font-mono text-[10px] tabular-nums text-text-subtle">{m.sentinelConfidence}% confidence</span>
                        )}
                      </div>
                      <div className={`rounded-md border p-3 ${
                        m.sentinelOutcome === "YES" ? "border-yes-700/50 bg-yes-500/10" : "border-no-700/50 bg-no-500/10"
                      }`}>
                        <p className="font-display text-[14px] font-bold text-text">
                          Sentinel says: <span className={m.sentinelOutcome === "YES" ? "text-yes-300" : "text-no-300"}>{m.sentinelOutcome}</span>
                        </p>
                        {m.sentinelEvidence && (
                          <p className="mt-1 text-[12px] text-text-secondary leading-snug">{m.sentinelEvidence}</p>
                        )}
                        {m.sentinelSourceUrl && (
                          <a href={m.sentinelSourceUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 font-mono text-[11px] text-teal-300 hover:text-teal-200">
                            AI source <I.ext size={10} />
                          </a>
                        )}
                        {m.sentinelReasoning && (
                          <details className="mt-2">
                            <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle hover:text-text-muted">
                              AI reasoning
                            </summary>
                            <p className="mt-1 text-[11px] text-text-muted leading-relaxed pl-2 border-l-2 border-border">
                              {m.sentinelReasoning}
                            </p>
                          </details>
                        )}
                      </div>
                      {m.sentinelClosedAt && (
                        <p className="mt-1 font-mono text-[10px] text-text-subtle">
                          Closed by sentinel at {fmtTime(m.sentinelClosedAt)}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="px-4 py-3 border-b border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <I.users s={14} />
                      <span className="font-mono text-[10px] uppercase tracking-[0.14em] font-semibold text-text-muted">Two-officer rule</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[12px]">
                      <div className={`rounded-md border p-2 ${stage1 ? "border-yes-700 bg-yes-500/10" : "border-border bg-bg-overlay"}`}>
                        <div className="flex items-center gap-1.5">
                          <I.shieldcheck s={12} />
                          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">Stage 1</span>
                        </div>
                        <p className={`mt-1 font-mono text-[11px] ${stage1 ? "text-yes-300" : "text-text-subtle"}`}>
                          {stage1 ? `${m.resolutionStage1By?.slice(0, 14)}…` : "awaiting"}
                        </p>
                      </div>
                      <div className="rounded-md border border-border bg-bg-overlay p-2">
                        <div className="flex items-center gap-1.5">
                          <I.alertCircle s={12} />
                          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">Stage 2</span>
                        </div>
                        <p className="mt-1 font-mono text-[11px] text-text-subtle">{stage1 ? "ready for 2nd officer" : "unlocks after stage 1"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    <ResolveControls marketId={m.id} stage={stage1 ? "stage2" : "stage1"} />
                  </div>
                </AdminCard>
              );
            })}
          </div>
        )}
        <AdminPagination total={pending.length} page={page} baseHref={baseHref} />
      </div>
    </>
  );
}
