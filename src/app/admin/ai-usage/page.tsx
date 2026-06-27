import Link from "next/link";
import { AdminPageHead, AdminCard, AdminKpi } from "@/components/admin/admin-shell";
import { AdminPagination, PER_PAGE, parsePage, buildBaseHref } from "@/components/admin/admin-pagination";
import { parseSort, applySort, SortTh } from "@/components/admin/admin-sort";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { I } from "@/components/ui/glyphs";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { getAiUsageSummary, listAiUsage, type AiFeature, type UsageBucket, type AiUsageFilter, type AiUsageEventRecord } from "@/lib/server/ai-usage";
import { getAnthropicSpend } from "@/lib/server/anthropic-billing";
import { CreditControls } from "./credit-controls";
import { AiOpsControls } from "./ai-ops-controls";
import { getAiOpsConfig, AVAILABLE_MODELS, INTERVAL_OPTIONS } from "@/lib/server/ai-ops-config";
import { ai } from "@/lib/server/ai-config";

export const metadata = { title: "Admin \u00b7 AI usage & credits" };
export const dynamic = "force-dynamic";

function usd(n: number): string {
  if (!n) return "$0.00";
  return `$${n.toFixed(Math.abs(n) < 1 ? 4 : 2)}`;
}
function tok(n: number): string {
  return n.toLocaleString();
}
function ts(iso: string): string {
  return iso.replace("T", " ").replace(/\.\d+Z$/, "Z");
}

const FEATURE_LABEL: Record<AiFeature, string> = {
  polls: "Poll generation",
  chat: "Help chatbot",
  sentinel: "Market Sentinel",
  other: "Other",
};
const FEATURE_VARIANT: Record<AiFeature, "info" | "success" | "warning" | "neutral"> = {
  polls: "info",
  chat: "success",
  sentinel: "warning",
  other: "neutral",
};
const FEATURES: AiFeature[] = ["sentinel", "polls", "chat", "other"];

type SP = Record<string, string | string[] | undefined>;
function one(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

export default async function AdminAiUsagePage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const feature = one(sp.feature);
  const status = one(sp.status);
  const q = one(sp.q).trim();
  const sinceDay = one(sp.since);
  const untilDay = one(sp.until);
  const sortRaw = one(sp.sort);
  const dirRaw = one(sp.dir);
  const pageRaw = one(sp.page);

  const filter: AiUsageFilter = {
    feature: FEATURES.includes(feature as AiFeature) ? feature : undefined,
    status: status === "ok" || status === "error" ? status : undefined,
    since: sinceDay ? `${sinceDay}T00:00:00.000Z` : undefined,
    until: untilDay ? `${untilDay}T23:59:59.999Z` : undefined,
    search: q || undefined,
  };

  // Fetch all matching rows for in-memory sort (the DAL returns newest-first;
  // we re-sort client-side so SortTh column headers work). Cap at 10k to keep
  // memory bounded; the 180-day retention + filters keeps this well under.
  const { listMarkets } = await import("@/lib/server/market-service");
  const [summary, listed, anthropic, aiOps, allMarkets] = await Promise.all([
    getAiUsageSummary(),
    listAiUsage(filter, 1, 10_000),
    getAnthropicSpend(),
    getAiOpsConfig(),
    listMarkets(),
  ]);
  const liveMarketCount = allMarkets.filter((m) => m.status === "LIVE").length;
  const s = summary;

  // Sort
  const SORT_KEYS = ["time", "feature", "model", "in", "out", "search", "cost", "ms", "status"] as const;
  const { sort, dir } = parseSort(
    { sort: sortRaw, dir: dirRaw },
    SORT_KEYS,
    "time",
    "desc",
  );
  const sorted = applySort(listed.rows, sort, dir, {
    time: (e: AiUsageEventRecord) => e.createdAt,
    feature: (e: AiUsageEventRecord) => e.feature,
    model: (e: AiUsageEventRecord) => e.model,
    in: (e: AiUsageEventRecord) => e.inputTokens,
    out: (e: AiUsageEventRecord) => e.outputTokens,
    search: (e: AiUsageEventRecord) => e.webSearches,
    cost: (e: AiUsageEventRecord) => e.costUsd,
    ms: (e: AiUsageEventRecord) => e.latencyMs ?? 0,
    status: (e: AiUsageEventRecord) => e.ok ? "ok" : "error",
  });

  // Paginate
  const page = parsePage(pageRaw, sorted.length, PER_PAGE);
  const rows = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const total = sorted.length;

  // Build baseHref preserving filters but not page
  const spFlat: Record<string, string | undefined> = {
    feature: filter.feature,
    status,
    q: q || undefined,
    since: sinceDay || undefined,
    until: untilDay || undefined,
    sort: sortRaw || undefined,
    dir: dirRaw || undefined,
  };
  const baseHref = buildBaseHref("/admin/ai-usage", spFlat);

  const c = s.credit;
  const pctSpent = c.limitUsd > 0 ? Math.min(100, (c.spentThisCycleUsd / c.limitUsd) * 100) : 0;
  const creditTone: "no" | "warn" | "ok" = c.remainingUsd <= 0 ? "no" : pctSpent >= 80 ? "warn" : "ok";
  const creditToneCls = creditTone === "no"
    ? "border-no-700/60 bg-no-500/10"
    : creditTone === "warn"
    ? "border-warning-fg/50 bg-bg-overlay"
    : "border-success/40 bg-success/10";

  const health = s.health;
  const banner =
    health === "failing"
      ? { cls: "border-no-700/60 bg-no-500/10", icon: <I.warning s={16} className="text-no-300 shrink-0 mt-0.5" />, title: "AI calls are FAILING", body: `Every AI call in the last 24h errored (${s.recent24h.err} failed). The Sentinel, poll generation and chatbot are down \u2014 almost always an exhausted Anthropic balance or a bad key. Top up and reset the cycle below.` }
      : health === "idle"
      ? { cls: "border-border bg-bg-overlay", icon: <I.clock s={16} className="text-text-tertiary shrink-0 mt-0.5" />, title: "AI idle", body: "No AI calls in the last 24h \u2014 normal during quiet periods." }
      : { cls: "border-success/40 bg-success/10", icon: <I.checkCircle s={16} className="text-success shrink-0 mt-0.5" />, title: "AI is healthy", body: `${s.recent24h.ok} successful AI call${s.recent24h.ok === 1 ? "" : "s"} in the last 24h, ${s.recent24h.err} error${s.recent24h.err === 1 ? "" : "s"}.` };

  return (
    <>
      <AdminPageHead title="AI usage & credits" sw="Matumizi ya AI na salio" period={false} />
      <div className="px-4 lg:px-6 py-5 space-y-4">
        {/* Health banner */}
        <div className={`rounded-lg border px-4 py-3 flex items-start gap-3 ${banner.cls}`}>
          {banner.icon}
          <div>
            <p className="font-bold text-text">{banner.title}</p>
            <p className="text-caption mt-0.5 text-text-secondary">{banner.body}</p>
          </div>
        </div>

        {/* Spend KPIs — real Anthropic data when available, else our estimates */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminKpi
            label={anthropic ? "Spend today (Anthropic)" : "Spend today"}
            sw="Leo"
            value={usd(anthropic?.today ?? s.windows.today.costUsd)}
            delta={anthropic ? `est. ${usd(s.windows.today.costUsd)} \u00b7 ${s.windows.today.calls} calls` : `${s.windows.today.calls} calls`}
          />
          <AdminKpi
            label={anthropic ? "Last 7 days (Anthropic)" : "Last 7 days"}
            sw="Siku 7"
            value={usd(anthropic?.last7 ?? s.windows.last7.costUsd)}
            delta={anthropic ? `est. ${usd(s.windows.last7.costUsd)} \u00b7 ${s.windows.last7.calls} calls` : `${s.windows.last7.calls} calls`}
          />
          <AdminKpi
            label={anthropic ? "Last 30 days (Anthropic)" : "Last 30 days"}
            sw="Siku 30"
            value={usd(anthropic?.last30 ?? s.windows.last30.costUsd)}
            delta={anthropic ? `est. ${usd(s.windows.last30.costUsd)} \u00b7 ${s.windows.last30.calls} calls` : `${s.windows.last30.calls} calls`}
          />
          <AdminKpi label="Stored (180d)" sw="Jumla" value={usd(s.windows.all.costUsd)} delta={`${s.windows.all.calls} calls`} />
        </div>

        {/* Credit limit + cycle */}
        <AdminCard title="Credit budget" sw="Bajeti ya salio">
          <p className="text-caption text-text-secondary mb-3">
            Anthropic has no API for exact remaining balance, so this tracks spend against a budget you set.
            Admins are emailed at <strong>~80%</strong> and again at <strong>100%</strong>. After you top up credit on the
            Anthropic console, click <strong>Reset cycle</strong> to zero the counter and re-arm the alerts. Set up
            <strong> Auto Reload</strong> on Anthropic too, so the balance never actually hits zero.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="rounded-md border border-border bg-bg-overlay px-4 py-3">
              <div className="text-micro uppercase tracking-[0.14em] text-text-tertiary mb-1">Limit / cycle</div>
              <div className="text-text font-semibold tabular-nums">{usd(c.limitUsd)}</div>
            </div>
            <div className="rounded-md border border-border bg-bg-overlay px-4 py-3">
              <div className="text-micro uppercase tracking-[0.14em] text-text-tertiary mb-1">Spent this cycle</div>
              <div className="text-text font-semibold tabular-nums">{usd(c.spentThisCycleUsd)}</div>
              <div className="text-[11px] text-text-tertiary mt-0.5">{pctSpent.toFixed(0)}% of limit</div>
            </div>
            <div className={`rounded-md border px-4 py-3 ${creditToneCls}`}>
              <div className="text-micro uppercase tracking-[0.14em] text-text-tertiary mb-1">Remaining (est.)</div>
              <div className="text-text font-semibold tabular-nums">{usd(c.remainingUsd)}</div>
            </div>
            <div className="rounded-md border border-border bg-bg-overlay px-4 py-3">
              <div className="text-micro uppercase tracking-[0.14em] text-text-tertiary mb-1">Cycle started</div>
              <div className="text-text font-semibold tabular-nums text-[13px]">{c.cycleStartIso.slice(0, 10)}</div>
              {c.alertedLevel !== "none" && (
                <div className="text-[11px] text-warning-fg mt-0.5">alerted: {c.alertedLevel}</div>
              )}
            </div>
          </div>
          <CreditControls limitUsd={c.limitUsd} />
        </AdminCard>

        {/* AI operations — model + sentinel interval */}
        <AdminCard title="AI operations" sw="Mipangilio ya AI">
          <p className="text-caption text-text-secondary mb-4">
            Control which Claude model powers the platform and how aggressively the sentinel monitors live markets.
            All changes apply immediately — no redeploy needed. Each setting explains exactly what it affects below.
          </p>
          <AiOpsControls
            currentModel={aiOps.model}
            currentIntervalMs={aiOps.sentinelIntervalMs}
            triageModel={ai.triageModel}
            models={AVAILABLE_MODELS}
            intervals={INTERVAL_OPTIONS}
            liveMarketCount={liveMarketCount}
          />
        </AdminCard>

        {/* Per-feature breakdown */}
        <AdminCard title="By feature (stored window)" sw="Kwa kipengele" padding="p-0">
          <div className="overflow-x-auto">
            <table className="admin-tbl min-w-[860px]">
              <thead className="font-mono text-[10px] tracking-[0.14em] uppercase text-text-subtle bg-bg-overlay border-b border-border">
                <tr>
                  <th className="text-left p-3">Feature</th>
                  <th className="text-right p-3">Calls</th>
                  <th className="text-right p-3">OK</th>
                  <th className="text-right p-3">Errors</th>
                  <th className="text-right p-3">In tok</th>
                  <th className="text-right p-3">Out tok</th>
                  <th className="text-right p-3">Searches</th>
                  <th className="text-right p-3">Cost</th>
                </tr>
              </thead>
              <tbody className="text-text-muted">
                {FEATURES.map((f) => ({ f, b: s.byFeature[f] })).filter((r) => r.b.calls > 0).map(({ f, b }: { f: AiFeature; b: UsageBucket }) => (
                  <tr key={f} className="border-b border-border/60 last:border-b-0">
                    <td className="p-3 text-text">
                      <div className="flex items-center gap-2">
                        <Chip size="sm" variant={FEATURE_VARIANT[f]}>{f.toUpperCase()}</Chip>
                        <span>{FEATURE_LABEL[f]}</span>
                      </div>
                    </td>
                    <td className="p-3 font-mono tabular-nums text-right text-text">{b.calls.toLocaleString()}</td>
                    <td className="p-3 font-mono tabular-nums text-right text-text-tertiary">{b.ok.toLocaleString()}</td>
                    <td className={`p-3 font-mono tabular-nums text-right ${b.err > 0 ? "text-no-300 font-semibold" : "text-text-tertiary"}`}>{b.err.toLocaleString()}</td>
                    <td className="p-3 font-mono tabular-nums text-right text-text-tertiary">{tok(b.inTok)}</td>
                    <td className="p-3 font-mono tabular-nums text-right text-text-tertiary">{tok(b.outTok)}</td>
                    <td className="p-3 font-mono tabular-nums text-right text-text-tertiary">{tok(b.searches)}</td>
                    <td className="p-3 font-mono tabular-nums text-right text-text">{usd(b.costUsd)}</td>
                  </tr>
                ))}
                {s.windows.all.calls === 0 && (
                  <tr>
                    <td colSpan={8} className="!p-0">
                      <EmptyState
                        kind="default"
                        title="No AI usage recorded yet"
                        titleSw="Bado hakuna matumizi ya AI"
                        body="AI calls will appear here once the chatbot, sentinel, or poll generator runs."
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </AdminCard>

        {/* Per-call ledger — sortable, filterable, paginated */}
        <AdminCard
          title="Every API call"
          sw="Kila ombi la API"
          padding="p-0"
          action={<span className="font-mono text-[10px] text-text-subtle">{total.toLocaleString()} matching</span>}
        >
          {/* Filters */}
          <div className="px-4 lg:px-5 pt-4 pb-3">
            <form method="get" className="flex flex-wrap items-center gap-3">
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">Feature</span>
                <div className="w-[160px]">
                  <Select
                    name="feature"
                    defaultValue={filter.feature ?? ""}
                    size="xs"
                    placeholder="All features"
                    options={[
                      { value: "", label: "All features" },
                      ...FEATURES.map((f) => ({ value: f, label: FEATURE_LABEL[f] })),
                    ]}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">Status</span>
                <div className="w-[140px]">
                  <Select
                    name="status"
                    defaultValue={status}
                    size="xs"
                    placeholder="All statuses"
                    options={[
                      { value: "", label: "All statuses" },
                      { value: "ok", label: "OK" },
                      { value: "error", label: "Errors" },
                    ]}
                  />
                </div>
              </div>
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">From</span>
                <input type="date" name="since" defaultValue={sinceDay} className="h-9 rounded-md border border-border bg-bg-inset px-2.5 text-body-sm text-text font-mono admin-focus transition-colors" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">To</span>
                <input type="date" name="until" defaultValue={untilDay} className="h-9 rounded-md border border-border bg-bg-inset px-2.5 text-body-sm text-text font-mono admin-focus transition-colors" />
              </label>
              <label className="flex flex-col gap-1 flex-1 min-w-[180px]">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">Search</span>
                <div className="relative">
                  <I.search size={14} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                  <input type="text" name="q" defaultValue={q} placeholder="model, error, detail…" className="w-full h-9 pl-9 pr-3 rounded-md border border-border bg-bg-inset text-body-sm text-text font-mono admin-focus transition-colors" />
                </div>
              </label>
              <div className="flex items-center gap-2 pt-4">
                <Button type="submit" size="sm">Filter</Button>
                {(filter.feature || status || q || sinceDay || untilDay) && (
                  <a href="/admin/ai-usage" className="btn btn-ghost btn-sm">Clear</a>
                )}
              </div>
            </form>
          </div>

          <div className="overflow-x-auto">
            <table className="admin-tbl min-w-[860px]">
              <thead className="font-mono text-[10px] tracking-[0.14em] uppercase text-text-subtle bg-bg-overlay border-b border-border">
                <tr>
                  <SortTh field="time" label="Time (UTC)" current={sort} dir={dir} sp={spFlat} baseHref="/admin/ai-usage" />
                  <SortTh field="feature" label="Feature" current={sort} dir={dir} sp={spFlat} baseHref="/admin/ai-usage" />
                  <SortTh field="model" label="Model" current={sort} dir={dir} sp={spFlat} baseHref="/admin/ai-usage" />
                  <SortTh field="in" label="In" current={sort} dir={dir} sp={spFlat} baseHref="/admin/ai-usage" align="right" />
                  <SortTh field="out" label="Out" current={sort} dir={dir} sp={spFlat} baseHref="/admin/ai-usage" align="right" />
                  <SortTh field="search" label="Search" current={sort} dir={dir} sp={spFlat} baseHref="/admin/ai-usage" align="right" />
                  <SortTh field="cost" label="Cost" current={sort} dir={dir} sp={spFlat} baseHref="/admin/ai-usage" align="right" />
                  <SortTh field="ms" label="ms" current={sort} dir={dir} sp={spFlat} baseHref="/admin/ai-usage" align="right" />
                  <SortTh field="status" label="Status" current={sort} dir={dir} sp={spFlat} baseHref="/admin/ai-usage" />
                </tr>
              </thead>
              <tbody className="text-text-muted">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="!p-0">
                      <EmptyState
                        kind="audit"
                        title="No calls match these filters"
                        titleSw="Hakuna maombi yanayolingana na chujio hili"
                        body="Try clearing filters or widening the date range."
                      />
                    </td>
                  </tr>
                ) : rows.map((e) => (
                  <tr key={e.id} className="border-b border-border/60 last:border-b-0 align-top">
                    <td className="p-3 font-mono tabular-nums text-text-tertiary whitespace-nowrap text-[11.5px]">{ts(e.createdAt)}</td>
                    <td className="p-3 whitespace-nowrap">
                      <Chip size="sm" variant={FEATURE_VARIANT[(e.feature as AiFeature)] ?? "neutral"}>
                        {e.feature.toUpperCase()}
                      </Chip>
                    </td>
                    <td className="p-3 font-mono text-text-tertiary whitespace-nowrap text-[11.5px]">{e.model}</td>
                    <td className="p-3 font-mono tabular-nums text-right text-text-tertiary">{tok(e.inputTokens)}</td>
                    <td className="p-3 font-mono tabular-nums text-right text-text-tertiary">{tok(e.outputTokens)}</td>
                    <td className="p-3 font-mono tabular-nums text-right text-text-tertiary">{e.webSearches || ""}</td>
                    <td className="p-3 font-mono tabular-nums text-right text-text">{usd(e.costUsd)}</td>
                    <td className="p-3 font-mono tabular-nums text-right text-text-tertiary">{e.latencyMs ?? ""}</td>
                    <td className="p-3 text-[12px]">
                      {e.ok
                        ? <Chip size="sm" variant="success">OK</Chip>
                        : <Chip size="sm" variant="danger">ERROR</Chip>}
                      {e.errorType && <span className="text-no-200 ml-1.5 text-[11px]">{e.errorType.slice(0, 120)}</span>}
                      {e.ok && e.detail && <span className="text-text-tertiary ml-1.5 text-[11px]">{e.detail.slice(0, 120)}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <AdminPagination total={total} page={page} baseHref={baseHref} />

          <p className="px-4 py-3 text-[11px] text-text-tertiary leading-snug border-t border-border">
            {anthropic
              ? <>KPI tiles show <strong>real Anthropic-reported costs</strong> (via Cost API, cached 10 min). Per-call costs below are estimates from token counts. </>
              : <>Cost estimated from token counts \u00d7 Anthropic pricing. Set <code className="text-text-subtle">ANTHROPIC_ADMIN_KEY</code> on Railway for real Anthropic-reported costs. </>}
            Haiku $1/$5, Sonnet $3/$15, Opus $5/$25 per 1M tokens; web search $0.01/call. Ledger retained 180 days.
          </p>
        </AdminCard>
      </div>
    </>
  );
}
