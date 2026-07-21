import { AdminPageHead, AdminKpi, AdminCard, FeedRow, AdminFunnel, AdminStackedBar } from "@/components/admin/admin-shell";
import { AdminAreaChart } from "@/components/admin/admin-charts";
import { I } from "@/components/ui/glyphs";
import { db } from "@/lib/server/store";
import { getAuditPage, type AuditCategory } from "@/lib/server/audit";
import { activePlayers, grossGamingRevenue, netGamingRevenue, kycFunnel, providerSummary, rgRosterCounts, moneyFlowSeries } from "@/lib/server/analytics";
import { dailyKpiSeries } from "@/lib/server/report-money";
import { formatTzsCompact } from "@/lib/utils";

export const metadata = { title: "Admin · Overview" };
export const dynamic = "force-dynamic";

// Admin gold-discipline: gold is reserved for the resolved/sealed state only.
// BET events use neutral (the calm, highest-volume log category).
const CATEGORY_VARIANT: Record<AuditCategory, "gold" | "royal" | "danger" | "success" | "warning" | "neutral"> = {
  AUTH:       "royal",
  KYC:        "royal",
  WALLET:     "royal",
  BET:        "neutral",
  ADMIN:      "warning",
  COMPLIANCE: "warning",
  SECURITY:   "danger",
  SYSTEM:     "neutral",
};

export default async function AdminOverviewPage() {
  // A-5: null (not 0) on a failed read → an explicit "couldn't compute" tile,
  // never a fabricated "TZS 0" / "0 pending" presented as real.
  const active24h = await activePlayers("today").catch(() => null);
  const ggr = await grossGamingRevenue("today").catch(() => null);
  const ngr = await netGamingRevenue("today").catch(() => null);
  let amlPending: number | null = 0;
  try { amlPending = (await db.txn.listByStatus("AML_REVIEW")).length; } catch { amlPending = null; }
  const kyc = await kycFunnel().catch(() => ({ registered: 0, started: 0, pending: 0, approved: 0 }));
  const provs = await providerSummary("28d").then((l) => l.slice(0, 5)).catch(() => []);
  const rg = await rgRosterCounts().catch(() => ({ selfExcluded: 0, cooledOff: 0, expiringThisWeek: 0 }));
  const recent = getAuditPage({ limit: 12 });
  const flow = await moneyFlowSeries("today", 24).catch(() => []);
  // Read-only 7-day daily trend for the money-tile sparklines — each point is
  // that day's REAL GGR/NGR/active (canonical `summarise`), so the spark is the
  // metric's OWN recent history, not a net-flow proxy. `spark()` suppresses a
  // meaningless all-zero line (honest data or nothing).
  const trends = await dailyKpiSeries("7d").catch(() => ({ ggr: [], ngr: [], active: [] }));
  const spark = (s: number[]) => (s.some((v) => v !== 0) ? s : undefined);

  // Provider mix flex shares — total deposits across the top 5 providers
  const provTotal = provs.reduce((s, p) => s + p.deposits, 0) || 1;
  const provColors = ["var(--royal)", "var(--gold)", "var(--aqua-400)", "var(--claret-400)", "var(--slate-400)"];

  const conversion = kyc.registered === 0 ? 0 : (kyc.approved / kyc.registered) * 100;

  return (
    <>
      <AdminPageHead title="Overview" sw="Muhtasari" period={false} />

      <div className="px-4 lg:px-6 py-5 space-y-4">
        {/* §A — KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <AdminKpi label="Active players" sw="Wachezaji hai"     value={active24h === null ? "" : active24h.toLocaleString()} unavailable={active24h === null} delta="last 24h" pulse={active24h !== null} series={spark(trends.active)} />
          <AdminKpi label="GGR · 24h"      sw="Mapato ya jumla"   value={ggr === null ? "" : `TZS ${formatTzsCompact(ggr).replace("TZS ", "")}`} unavailable={ggr === null} delta="vs yesterday" series={spark(trends.ggr)} />
          <AdminKpi label="NGR · 24h"      sw="Mapato halisi"     value={ngr === null ? "" : `TZS ${formatTzsCompact(ngr).replace("TZS ", "")}`} unavailable={ngr === null} delta="net of bonus + fees" series={spark(trends.ngr)} />
          <AdminKpi label="AML pending"    sw="Inasubiri ukaguzi" value={amlPending ?? ""} unavailable={amlPending === null} delta="needs review" deltaDir={(amlPending ?? 0) > 0 ? "up" : "flat"} pulse={(amlPending ?? 0) > 0} />
        </div>

        {/* §B — Money flow + activity */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-3">
          <AdminCard
            title="24-hour money flow"
            sw="Mtiririko wa pesa · TZS net per hour"
            action={<span className="font-mono text-micro tracking-[0.10em] uppercase text-text-tertiary">net inflow vs outflow</span>}
          >
            <AdminAreaChart
              series={flow}
              xLabels={flow.map((p) => p.label)}
              height={240}
              fillVar="var(--royal)"
              strokeVar="var(--royal)"
              yLabel="Net flow"
            />
          </AdminCard>
          <AdminCard
            title="Live activity feed"
            sw="Shughuli za moja kwa moja"
            action={<a href="/admin/audit" className="font-mono text-micro tracking-[0.10em] uppercase text-royal-300">audit →</a>}
          >
            <div
              className="max-h-[360px] overflow-y-auto -mx-1 px-1 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--brand-400)]"
              tabIndex={0}
              role="region"
              aria-label="Live activity feed"
            >
              {recent.map((e) => (
                <FeedRow
                  key={e.id}
                  ts={e.createdAt.split("T")[1]?.slice(0, 8) ?? ""}
                  category={e.category}
                  variant={CATEGORY_VARIANT[e.category]}
                  body={`${e.action} ${e.targetType ? `· ${e.targetType}#${e.targetId?.slice(0, 8)}` : ""}`}
                />
              ))}
              {recent.length === 0 && (
                <div className="py-6 flex flex-col items-center gap-2 text-caption text-text-tertiary">
                  <I.activity s={20} />
                  No activity in the last cycle.
                </div>
              )}
            </div>
          </AdminCard>
        </div>

        {/* §C — Secondary tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminCard title="KYC funnel" sw="Hatua za uthibitisho">
            <AdminFunnel
              steps={[
                { label: "REG", value: kyc.registered.toLocaleString() },
                { label: "STARTED", value: kyc.started.toLocaleString() },
                { label: "PENDING", value: kyc.pending.toLocaleString() },
                { label: "APPROVED", value: kyc.approved.toLocaleString() },
              ]}
            />
            <p className="text-caption text-text-tertiary">
              conversion {conversion.toFixed(1)}% · <span className="text-text-tertiary italic">uthibitisho</span>
            </p>
          </AdminCard>

          <AdminCard title="Provider mix" sw="Watoa huduma ya simu">
            {provs.length > 0 ? (
              <>
                <AdminStackedBar
                  segments={provs.map((p, i) => ({
                    flex: Math.max(2, Math.round((p.deposits / provTotal) * 100)),
                    color: provColors[i] ?? "var(--slate-400)",
                    label: p.provider.split("_")[0],
                  }))}
                />
                <p className="text-caption text-text-tertiary">28-day deposit share · <span className="text-text-tertiary italic">asilimia</span></p>
              </>
            ) : (
              <div className="text-caption text-text-tertiary py-3 text-center">No provider data in window.</div>
            )}
          </AdminCard>

          <AdminCard title="Self-exclusion" sw="Kujizuia">
            <div className="flex items-baseline justify-between">
              <span className="font-mono font-bold text-title-md tabular text-text">{rg.selfExcluded}</span>
              {rg.expiringThisWeek > 0 && (
                <span className="font-mono text-micro text-text-tertiary tracking-wider">▼ {rg.expiringThisWeek} expiring</span>
              )}
            </div>
            <p className="text-caption text-text-tertiary">active roster · {rg.cooledOff} cooling-off</p>
          </AdminCard>

          <AdminCard title="Match-integrity alerts" sw="Tahadhari za uadilifu">
            <div className="flex items-baseline justify-between">
              <span className="font-mono font-bold text-title-md tabular text-text-tertiary">—</span>
              <span className="font-mono text-micro text-text-tertiary tracking-wider uppercase">not yet live</span>
            </div>
            <p className="text-caption text-text-tertiary">Monitoring activates when the Sportradar integrity feed is signed (pre-launch blocker).</p>
          </AdminCard>
        </div>
      </div>
    </>
  );
}
