import Link from "next/link";
import type { Route } from "next";
import { Button } from "@/components/ui/button";
import { AdminPageHead, AdminCard, AdminKpi } from "@/components/admin/admin-shell";
import { getAiUsageSummary, listAiUsage, type AiFeature, type UsageBucket, type AiUsageFilter } from "@/lib/server/ai-usage";
import { CreditControls } from "./credit-controls";

export const metadata = { title: "Admin · AI usage & credits" };
export const dynamic = "force-dynamic";

function usd(n: number): string {
  if (!n) return "$0.00";
  return `$${n.toFixed(Math.abs(n) < 1 ? 4 : 2)}`;
}
function tok(n: number): string {
  return n.toLocaleString();
}
function ts(iso: string): string {
  // Compact, sortable, timezone-explicit (UTC) — operator-facing audit trail.
  return iso.replace("T", " ").replace(/\.\d+Z$/, "Z");
}

const FEATURE_LABEL: Record<AiFeature, string> = {
  polls: "Poll generation",
  chat: "Help chatbot",
  sentinel: "Market Sentinel",
  other: "Other",
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
  const pageSize = Math.min(200, Math.max(10, parseInt(one(sp.size) || "50", 10) || 50));
  const page = Math.max(1, parseInt(one(sp.page) || "1", 10) || 1);

  const filter: AiUsageFilter = {
    feature: FEATURES.includes(feature as AiFeature) ? feature : undefined,
    status: status === "ok" || status === "error" ? status : undefined,
    since: sinceDay ? `${sinceDay}T00:00:00.000Z` : undefined,
    until: untilDay ? `${untilDay}T23:59:59.999Z` : undefined,
    search: q || undefined,
  };

  const [summary, listed] = await Promise.all([getAiUsageSummary(), listAiUsage(filter, page, pageSize)]);
  const { rows, total } = listed;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const s = summary;

  // Build a querystring that preserves filters while overriding `page`.
  const linkTo = (toPage: number) => {
    const p = new URLSearchParams();
    if (filter.feature) p.set("feature", filter.feature);
    if (status) p.set("status", status);
    if (q) p.set("q", q);
    if (sinceDay) p.set("since", sinceDay);
    if (untilDay) p.set("until", untilDay);
    if (pageSize !== 50) p.set("size", String(pageSize));
    p.set("page", String(toPage));
    return `/admin/ai-usage?${p.toString()}` as Route;
  };

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
      ? { cls: "border-no-700/60 bg-no-500/10", title: "⚠️ AI calls are FAILING", body: `Every AI call in the last 24h errored (${s.recent24h.err} failed). The Sentinel, poll generation and chatbot are down — almost always an exhausted Anthropic balance or a bad key. Top up and reset the cycle below.` }
      : health === "idle"
      ? { cls: "border-border bg-bg-overlay", title: "AI idle", body: "No AI calls in the last 24h — normal during quiet periods." }
      : { cls: "border-success/40 bg-success/10", title: "✓ AI is healthy", body: `${s.recent24h.ok} successful AI call${s.recent24h.ok === 1 ? "" : "s"} in the last 24h, ${s.recent24h.err} error${s.recent24h.err === 1 ? "" : "s"}.` };

  return (
    <>
      <AdminPageHead title="AI usage & credits" sw="Matumizi ya AI na salio" period={false} />
      <div className="px-4 lg:px-6 py-5 space-y-4">
        {/* Health */}
        <div className={`rounded-lg border px-4 py-3 ${banner.cls}`}>
          <p className="font-bold text-text">{banner.title}</p>
          <p className="text-caption mt-0.5 text-text-secondary">{banner.body}</p>
        </div>

        {/* Spend KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminKpi label="Spend today" sw="Leo" value={usd(s.windows.today.costUsd)} delta={`${s.windows.today.calls} calls`} />
          <AdminKpi label="Last 7 days" sw="Siku 7" value={usd(s.windows.last7.costUsd)} delta={`${s.windows.last7.calls} calls`} />
          <AdminKpi label="Last 30 days" sw="Siku 30" value={usd(s.windows.last30.costUsd)} delta={`${s.windows.last30.calls} calls`} />
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
            <div className="rounded-md border border-border bg-bg-overlay px-3 py-2">
              <div className="text-micro uppercase tracking-[0.14em] text-text-tertiary">Limit / cycle</div>
              <div className="text-text font-semibold tabular-nums">{usd(c.limitUsd)}</div>
            </div>
            <div className="rounded-md border border-border bg-bg-overlay px-3 py-2">
              <div className="text-micro uppercase tracking-[0.14em] text-text-tertiary">Spent this cycle</div>
              <div className="text-text font-semibold tabular-nums">{usd(c.spentThisCycleUsd)}</div>
              <div className="text-[11px] text-text-tertiary">{pctSpent.toFixed(0)}% of limit</div>
            </div>
            <div className={`rounded-md border px-3 py-2 ${creditToneCls}`}>
              <div className="text-micro uppercase tracking-[0.14em] text-text-tertiary">Remaining (est.)</div>
              <div className="text-text font-semibold tabular-nums">{usd(c.remainingUsd)}</div>
            </div>
            <div className="rounded-md border border-border bg-bg-overlay px-3 py-2">
              <div className="text-micro uppercase tracking-[0.14em] text-text-tertiary">Cycle started</div>
              <div className="text-text font-semibold tabular-nums text-[13px]">{c.cycleStartIso.slice(0, 10)}</div>
              {c.alertedLevel !== "none" && (
                <div className="text-[11px] text-warning-fg">alerted: {c.alertedLevel}</div>
              )}
            </div>
          </div>
          <CreditControls limitUsd={c.limitUsd} />
        </AdminCard>

        {/* Per-feature */}
        <AdminCard title="By feature (stored window)" sw="Kwa kipengele">
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="admin-tbl min-w-[640px]">
              <thead className="font-mono text-micro tracking-[0.14em] uppercase text-text-tertiary border-b border-border-subtle">
                <tr>
                  <th className="text-left py-2 pr-3">Feature</th>
                  <th className="text-right py-2 pr-3">Calls</th>
                  <th className="text-right py-2 pr-3">OK</th>
                  <th className="text-right py-2 pr-3">Errors</th>
                  <th className="text-right py-2 pr-3">In tok</th>
                  <th className="text-right py-2 pr-3">Out tok</th>
                  <th className="text-right py-2 pr-3">Searches</th>
                  <th className="text-right py-2 pl-3">Cost</th>
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((f) => ({ f, b: s.byFeature[f] })).filter((r) => r.b.calls > 0).map(({ f, b }: { f: AiFeature; b: UsageBucket }) => (
                  <tr key={f} className="border-b border-border-subtle/40 last:border-b-0">
                    <td className="py-2 pr-3 text-text">{FEATURE_LABEL[f]}</td>
                    <td className="py-2 pr-3 font-mono tabular-nums text-right text-text">{b.calls.toLocaleString()}</td>
                    <td className="py-2 pr-3 font-mono tabular-nums text-right text-text-tertiary">{b.ok.toLocaleString()}</td>
                    <td className={`py-2 pr-3 font-mono tabular-nums text-right ${b.err > 0 ? "text-no-300 font-semibold" : "text-text-tertiary"}`}>{b.err.toLocaleString()}</td>
                    <td className="py-2 pr-3 font-mono tabular-nums text-right text-text-tertiary">{tok(b.inTok)}</td>
                    <td className="py-2 pr-3 font-mono tabular-nums text-right text-text-tertiary">{tok(b.outTok)}</td>
                    <td className="py-2 pr-3 font-mono tabular-nums text-right text-text-tertiary">{tok(b.searches)}</td>
                    <td className="py-2 pl-3 font-mono tabular-nums text-right text-text">{usd(b.costUsd)}</td>
                  </tr>
                ))}
                {s.windows.all.calls === 0 && (
                  <tr><td colSpan={8} className="py-4 text-center text-caption text-text-tertiary">No AI usage recorded yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </AdminCard>

        {/* Per-call ledger — filters + paginated detail */}
        <AdminCard title="Every API call" sw="Kila ombi la API" action={<span className="font-mono text-[10px] text-text-subtle">{total.toLocaleString()} matching</span>}>
          {/* Filters (GET form — no client JS needed) */}
          <form method="get" className="flex flex-wrap items-end gap-2 mb-3">
            <label className="flex flex-col gap-1">
              <span className="text-micro uppercase tracking-[0.14em] text-text-tertiary">Feature</span>
              <select name="feature" defaultValue={filter.feature ?? ""} className="h-9 rounded-md border border-border bg-bg-overlay px-2 text-[13px] text-text">
                <option value="">All</option>
                {FEATURES.map((f) => <option key={f} value={f}>{FEATURE_LABEL[f]}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-micro uppercase tracking-[0.14em] text-text-tertiary">Status</span>
              <select name="status" defaultValue={status} className="h-9 rounded-md border border-border bg-bg-overlay px-2 text-[13px] text-text">
                <option value="">All</option>
                <option value="ok">OK</option>
                <option value="error">Errors</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-micro uppercase tracking-[0.14em] text-text-tertiary">From</span>
              <input type="date" name="since" defaultValue={sinceDay} className="h-9 rounded-md border border-border bg-bg-overlay px-2 text-[13px] text-text" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-micro uppercase tracking-[0.14em] text-text-tertiary">To</span>
              <input type="date" name="until" defaultValue={untilDay} className="h-9 rounded-md border border-border bg-bg-overlay px-2 text-[13px] text-text" />
            </label>
            <label className="flex flex-col gap-1 flex-1 min-w-[160px]">
              <span className="text-micro uppercase tracking-[0.14em] text-text-tertiary">Search (model / error / detail)</span>
              <input type="text" name="q" defaultValue={q} placeholder="e.g. sentinel, credit balance, sonnet" className="h-9 rounded-md border border-border bg-bg-overlay px-2 text-[13px] text-text" />
            </label>
            <Button type="submit" size="sm">Apply</Button>
            <Link href="/admin/ai-usage" className="h-9 inline-flex items-center rounded-md border border-border px-3 text-[13px] text-text-secondary">Clear</Link>
          </form>

          <div className="overflow-x-auto -mx-4 px-4">
            <table className="admin-tbl min-w-[820px]">
              <thead className="font-mono text-micro tracking-[0.14em] uppercase text-text-tertiary border-b border-border-subtle">
                <tr>
                  <th className="text-left py-2 pr-3">Time (UTC)</th>
                  <th className="text-left py-2 pr-3">Feature</th>
                  <th className="text-left py-2 pr-3">Model</th>
                  <th className="text-right py-2 pr-3">In</th>
                  <th className="text-right py-2 pr-3">Out</th>
                  <th className="text-right py-2 pr-3">Search</th>
                  <th className="text-right py-2 pr-3">Cost</th>
                  <th className="text-right py-2 pr-3">ms</th>
                  <th className="text-left py-2 pl-3">Status / detail</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={9} className="py-6 text-center text-caption text-text-tertiary">No calls match these filters.</td></tr>
                ) : rows.map((e) => (
                  <tr key={e.id} className="border-b border-border-subtle/40 last:border-b-0 align-top">
                    <td className="py-2 pr-3 font-mono tabular-nums text-text-tertiary whitespace-nowrap text-[11.5px]">{ts(e.createdAt)}</td>
                    <td className="py-2 pr-3 text-text whitespace-nowrap">{FEATURE_LABEL[(e.feature as AiFeature)] ?? e.feature}</td>
                    <td className="py-2 pr-3 font-mono text-text-tertiary whitespace-nowrap text-[11.5px]">{e.model}</td>
                    <td className="py-2 pr-3 font-mono tabular-nums text-right text-text-tertiary">{tok(e.inputTokens)}</td>
                    <td className="py-2 pr-3 font-mono tabular-nums text-right text-text-tertiary">{tok(e.outputTokens)}</td>
                    <td className="py-2 pr-3 font-mono tabular-nums text-right text-text-tertiary">{e.webSearches || ""}</td>
                    <td className="py-2 pr-3 font-mono tabular-nums text-right text-text">{usd(e.costUsd)}</td>
                    <td className="py-2 pr-3 font-mono tabular-nums text-right text-text-tertiary">{e.latencyMs ?? ""}</td>
                    <td className="py-2 pl-3 text-[12px]">
                      {e.ok
                        ? <span className="text-success">OK</span>
                        : <span className="text-no-300 font-semibold">ERROR</span>}
                      {e.errorType && <span className="text-no-200"> · {e.errorType.slice(0, 120)}</span>}
                      {e.ok && e.detail && <span className="text-text-tertiary"> · {e.detail.slice(0, 120)}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-3 text-[12px] text-text-tertiary">
            <span>Page {page} of {totalPages} · {pageSize}/page</span>
            <div className="flex gap-2">
              {page > 1
                ? <Link href={linkTo(page - 1)} className="rounded-md border border-border px-3 py-1.5 text-text-secondary">← Prev</Link>
                : <span className="rounded-md border border-border-subtle px-3 py-1.5 text-text-subtle opacity-50">← Prev</span>}
              {page < totalPages
                ? <Link href={linkTo(page + 1)} className="rounded-md border border-border px-3 py-1.5 text-text-secondary">Next →</Link>
                : <span className="rounded-md border border-border-subtle px-3 py-1.5 text-text-subtle opacity-50">Next →</span>}
            </div>
          </div>

          <p className="mt-3 text-[11px] text-text-tertiary leading-snug">
            Cost is metered from token counts × public Anthropic pricing (Sonnet $3/$15, Haiku $1/$5 per 1M tokens; web search $0.01/call). Ledger retained 180 days.
          </p>
        </AdminCard>
      </div>
    </>
  );
}
