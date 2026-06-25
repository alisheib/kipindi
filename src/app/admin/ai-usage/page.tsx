import { AdminPageHead, AdminCard, AdminKpi } from "@/components/admin/admin-shell";
import { getAiUsageSummary, type AiFeature, type UsageBucket } from "@/lib/server/ai-usage";
import { TopupForm } from "./topup-form";

export const metadata = { title: "Admin · AI usage & credits" };
export const dynamic = "force-dynamic";

function usd(n: number): string {
  if (n === 0) return "$0.00";
  return `$${n.toFixed(Math.abs(n) < 1 ? 4 : 2)}`;
}
function tok(n: number): string {
  return n.toLocaleString();
}

const FEATURE_LABEL: Record<AiFeature, string> = {
  polls: "Poll generation",
  chat: "Help chatbot",
  sentinel: "Market Sentinel",
  other: "Other",
};

export default async function AdminAiUsagePage() {
  const s = await getAiUsageSummary();

  const features: AiFeature[] = ["sentinel", "polls", "chat", "other"];
  const rows = features
    .map((f) => ({ f, b: s.byFeature[f] }))
    .filter((r) => r.b.calls > 0);

  const health = s.health;
  const banner =
    health === "failing"
      ? { cls: "border-no-700/60 bg-no-500/10 text-no-200", title: "⚠️ AI calls are FAILING", body: `Every AI call in the last 24h errored (${s.recent24h.err} failed). The Sentinel, poll generation and chatbot are down — almost always an exhausted Anthropic balance or a bad key. Check Plans & Billing now.` }
      : health === "idle"
      ? { cls: "border-border bg-bg-overlay text-text-secondary", title: "AI idle", body: "No AI calls in the last 24h. Nothing to report — this is normal during quiet periods." }
      : { cls: "border-success/40 bg-success/10 text-text-secondary", title: "✓ AI is healthy", body: `${s.recent24h.ok} successful AI call${s.recent24h.ok === 1 ? "" : "s"} in the last 24h, ${s.recent24h.err} error${s.recent24h.err === 1 ? "" : "s"}.` };

  return (
    <>
      <AdminPageHead title="AI usage & credits" sw="Matumizi ya AI na salio" period={false} />
      <div className="px-4 lg:px-6 py-5 space-y-4">
        {/* Health banner */}
        <div className={`rounded-lg border px-4 py-3 ${banner.cls}`}>
          <p className="font-bold text-text">{banner.title}</p>
          <p className="text-caption mt-0.5">{banner.body}</p>
        </div>

        {/* Spend KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminKpi label="Spend today" sw="Leo" value={usd(s.windows.today.costUsd)} delta={`${s.windows.today.calls} calls`} />
          <AdminKpi label="Last 7 days" sw="Siku 7" value={usd(s.windows.last7.costUsd)} delta={`${s.windows.last7.calls} calls`} />
          <AdminKpi label="Last 30 days" sw="Siku 30" value={usd(s.windows.last30.costUsd)} delta={`${s.windows.last30.calls} calls`} />
          <AdminKpi label="All-time (metered)" sw="Jumla" value={usd(s.windows.all.costUsd)} delta={`${s.windows.all.calls} calls`} />
        </div>

        {/* Credit estimate + top-up */}
        <AdminCard title="Credit balance (estimate)" sw="Salio · makisio">
          <p className="text-caption text-text-secondary mb-3">
            Anthropic has no API for the exact remaining balance, so this is an <strong>estimate from our own metering</strong>:
            log what you topped up on the Anthropic console and we subtract metered spend since then. Set up
            <strong> Auto Reload</strong> on Anthropic so the balance never hits zero — this number is for visibility, not a hard guard.
          </p>
          {s.topup ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div className="rounded-md border border-border bg-bg-overlay px-3 py-2">
                <div className="text-micro uppercase tracking-[0.14em] text-text-tertiary">Last top-up</div>
                <div className="text-text font-semibold tabular-nums">{usd(s.topup.amountUsd)}</div>
                <div className="text-[11px] text-text-tertiary">{s.topup.atIso.slice(0, 10)}</div>
              </div>
              <div className="rounded-md border border-border bg-bg-overlay px-3 py-2">
                <div className="text-micro uppercase tracking-[0.14em] text-text-tertiary">Spent since</div>
                <div className="text-text font-semibold tabular-nums">{usd(s.spentSinceTopupUsd)}</div>
              </div>
              <div className={`rounded-md border px-3 py-2 ${(s.estimatedRemainingUsd ?? 0) <= 5 ? "border-no-700/60 bg-no-500/10" : "border-success/40 bg-success/10"}`}>
                <div className="text-micro uppercase tracking-[0.14em] text-text-tertiary">Est. remaining</div>
                <div className="text-text font-semibold tabular-nums">{usd(s.estimatedRemainingUsd ?? 0)}</div>
              </div>
            </div>
          ) : (
            <p className="text-caption text-text-tertiary mb-4">No top-up logged yet. Enter the amount you added on Anthropic to start tracking.</p>
          )}
          <TopupForm current={s.topup?.amountUsd ?? null} />
        </AdminCard>

        {/* Per-feature breakdown */}
        <AdminCard title="By feature (all-time)" sw="Kwa kipengele">
          {rows.length === 0 ? (
            <p className="text-caption text-text-tertiary py-4 text-center">No AI usage recorded yet.</p>
          ) : (
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
                  {rows.map(({ f, b }: { f: AiFeature; b: UsageBucket }) => (
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
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-[11px] text-text-tertiary leading-snug">
            Metered from token counts × public Anthropic per-model pricing (Sonnet $3/$15, Haiku $1/$5 per 1M tokens; web search $0.01/call).
            {s.firstDay ? ` Data since ${s.firstDay}.` : ""} Retained 90 days.
          </p>
        </AdminCard>
      </div>
    </>
  );
}
