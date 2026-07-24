import Link from "next/link";
import { AdminPageHead, AdminCard, AdminLoadError } from "@/components/admin/admin-shell";
import { AdminPagination, PER_PAGE, parsePage, buildBaseHref } from "@/components/admin/admin-pagination";
import { RefreshButton } from "@/components/admin/refresh-button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { I } from "@/components/ui/glyphs";
import { Select } from "@/components/ui/select";
import { listMarkets, impliedYesPct, type MarketCategory } from "@/lib/server/market-service";
import { ProbabilityBar } from "@/components/markets/probability-bar";
import { CircularProgress } from "@/components/markets/circular-progress";
import { ResolveControls } from "./resolve-controls";
import { ConflictOverrideToggle } from "./conflict-override-toggle";
import { ResolutionModeToggle } from "./resolution-mode-toggle";
import { RecheckButton } from "./recheck-button";
import { getConflictedResolutionAllowed, isConflictOverrideHardLocked } from "@/lib/server/test-overrides";
import { getGlobalConfig } from "@/lib/server/market-config";
import { isLiveMoneyMode } from "@/lib/server/runtime-mode";
import { formatDateTime } from "@/lib/utils";
import { CEREMONY, SELECTION } from "@/lib/admin-status-lexicon";

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

  // A-5: distinguish a FAILED market read from a genuinely-clear queue, so a
  // backend error never renders "Queue is clear" and hides pending settlements.
  let marketsFailed = false;
  const allMarkets = await listMarkets().catch(() => { marketsFailed = true; return []; });
  const pending = allMarkets.filter((m) => {
    const due = Date.parse(m.resolutionAt);
    if (m.status === "CLOSED") return true;
    if (m.status === "LIVE") return windowMs === Infinity || due - now < windowMs;
    return false;
  }).filter((m) => {
    if (categoryFilter && m.category !== categoryFilter) return false;
    if (query && !m.titleEn.toLowerCase().includes(query) && !(m.titleSw ?? "").toLowerCase().includes(query)) return false;
    return true;
  }).sort((a, b) => Date.parse(a.resolutionAt) - Date.parse(b.resolutionAt));

  // Triage counts for the header summary.
  const overdueCount = pending.filter((m) => Date.parse(m.resolutionAt) <= now).length;
  const awaitingStage2 = pending.filter((m) => !!m.resolutionStage1By).length;
  const windowLabel = (WINDOW_OPTIONS.find((o) => o.value === windowFilter)?.label ?? "").toLowerCase();
  const conflictOverride = await getConflictedResolutionAllowed().catch(() => false);
  const conflictHardLocked = isConflictOverrideHardLocked();
  // Resolution mode (human ceremony vs AI auto-resolve at the resolve date) + the
  // confidence floor below which auto ALWAYS falls back to a human ceremony.
  const rateCfg = await getGlobalConfig().catch(() => null);
  const resolutionMode = rateCfg?.resolutionMode ?? "human";
  const resolveThreshold = rateCfg?.resolveConfidenceThreshold ?? 90;
  const liveMoney = isLiveMoneyMode();

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
        actions={
          <div className="flex items-center gap-2.5 flex-wrap">
            <ResolutionModeToggle mode={resolutionMode} threshold={resolveThreshold} liveMoney={liveMoney} />
            <ConflictOverrideToggle enabled={conflictOverride} hardLocked={conflictHardLocked} />
            <div className="flex items-center gap-2.5 font-mono text-[10px] tracking-[0.14em] uppercase text-text-subtle">
              <span>{pending.length} pending</span>
              {overdueCount > 0 && <><span className="text-border">·</span><span className="text-claret-300">{overdueCount} overdue</span></>}
              {awaitingStage2 > 0 && <><span className="text-border">·</span><span className="text-warning-300">{awaitingStage2} awaiting 2nd</span></>}
            </div>
          </div>
        }
      />
      <div className="px-4 lg:px-6 py-5 space-y-4">
        {/* Filters */}
        <AdminCard padding="p-3">
          <form className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
              <I.search size={14} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle" />
              <input
                name="q"
                defaultValue={query}
                placeholder="Search title…"
                aria-label="Search resolver queue"
                className="h-8 w-full rounded-md border border-border bg-bg-overlay pl-9 pr-3 text-[12.5px] text-text outline-none admin-focus transition-colors placeholder:text-text-subtle"
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
            <button type="submit" className="btn btn-primary btn-sm h-8">Filter</button>
            {hasFilter && <a href="/admin/resolver-queue" className="btn btn-ghost btn-sm h-8">Clear</a>}
            <RefreshButton className="ml-auto" />
          </form>
        </AdminCard>

        {marketsFailed ? (
          <AdminLoadError what="the resolver queue" />
        ) : pending.length === 0 ? (
          <EmptyState
            kind="audit"
            title={hasFilter ? "No markets match" : "Queue is clear"}
            titleSw={hasFilter ? "Hakuna soko" : "Foleni ni tupu"}
            body={windowFilter === "all"
              ? "No markets are pending resolution."
              : `No markets resolving in the ${windowLabel}.`}
          />
        ) : (
          <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
            {paged.map((m) => {
              const t = timeUntil(m.resolutionAt);
              const yes = impliedYesPct(m);
              const stage1 = !!m.resolutionStage1By;
              return (
                <AdminCard key={m.id} padding="p-0" data-market-id={m.id}>
                  <div className="flex items-start gap-4 p-4 border-b border-border">
                    {/* B6: the dial shows the CROWD's YES lean (impliedYesPct) — nothing more.
                        It previously showed pool "lopsidedness" fed into a YES-green/NO-rose
                        ConfidenceDial, so a 90%-NO market rendered a YES-leaning needle labelled
                        "80%" — a false directional signal on the resolution surface. The verdict
                        is decided from the source, never from crowd sentiment. */}
                    <CircularProgress
                      value={yes}
                      size={64}
                      label="crowd"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <Chip size="sm" variant={
                          t.tone === "overdue" ? "danger"
                          : t.tone === "soon" ? "warning"
                          : "neutral"
                        }>{t.label}</Chip>
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">{m.category}</span>
                        <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 font-mono text-[11px] text-royal-300 hover:text-royal-200">
                          Source
                          <I.ext size={11} />
                        </a>
                      </div>
                      <h3 className="mt-1 font-display text-[15px] font-semibold leading-tight text-text line-clamp-2">{m.titleEn}</h3>
                      <p className="text-[12px] italic text-text-subtle line-clamp-1">{m.titleSw}</p>
                      {m.titleZh && <p className="text-[12px] italic text-text-subtle line-clamp-1">{m.titleZh}</p>}
                      <p className="mt-1 font-mono text-[11px] text-text-subtle">{SELECTION.betsClosed.en} {fmtTime(m.selectionClosedAt ?? m.resolutionAt)} · Resolves {fmtTime(m.resolutionAt)}</p>
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
                          <a href={m.sentinelSourceUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 font-mono text-[11px] text-royal-300 hover:text-royal-200">
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
                      <span className="font-mono text-[10px] uppercase tracking-[0.14em] font-semibold text-text-muted">{CEREMONY.twoOfficerRule.en}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[12px]">
                      <div className={`rounded-md border p-2 ${
                        stage1
                          ? (m.resolvedOutcome === "NO" ? "border-no-700 bg-no-500/10" : m.resolvedOutcome === "VOID" ? "border-claret-700 bg-claret-500/10" : "border-yes-700 bg-yes-500/10")
                          : "border-border bg-bg-overlay"
                      }`}>
                        <div className="flex items-center gap-1.5">
                          <I.shieldcheck s={12} />
                          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">{CEREMONY.stage1.en}</span>
                        </div>
                        <p className={`mt-1 font-mono text-[11px] ${stage1 ? "text-text-muted" : "text-text-subtle"}`}>
                          {stage1 ? `${m.resolutionStage1By?.slice(0, 14)}…` : "awaiting"}
                        </p>
                        {stage1 && m.resolvedOutcome && (
                          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">
                            staged <span className={`font-bold ${m.resolvedOutcome === "YES" ? "text-yes-300" : m.resolvedOutcome === "NO" ? "text-no-300" : "text-claret-300"}`}>{m.resolvedOutcome}</span>
                          </p>
                        )}
                      </div>
                      <div className="rounded-md border border-border bg-bg-overlay p-2">
                        <div className="flex items-center gap-1.5">
                          <I.alertCircle s={12} />
                          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">{CEREMONY.stage2.en}</span>
                        </div>
                        <p className="mt-1 font-mono text-[11px] text-text-subtle">{stage1 ? `confirm ${m.resolvedOutcome}` : "unlocks after stage 1"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <ResolveControls marketId={m.id} stage={stage1 ? "stage2" : "stage1"} stagedOutcome={m.resolvedOutcome} />
                    {/* Per-market AI re-check (replaces the old global sentinel sweep). */}
                    <RecheckButton marketId={m.id} />
                    {/* Full evidence-first ceremony (evidence excerpt + typed-SEAL). */}
                    <Link
                      href={`/admin/resolver/${m.id}` as never}
                      className="flex items-center justify-center gap-1.5 rounded-md border border-border bg-bg-overlay py-2 font-mono text-[11px] tracking-[0.08em] uppercase text-text-muted hover:border-brand-500 hover:text-text transition-colors"
                    >
                      <I.shieldcheck s={12} /> Open resolution ceremony
                    </Link>
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
