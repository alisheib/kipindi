import { AdminPageHead, AdminKpi, AdminCard, FeedRow, AdminFunnel, AdminStackedBar } from "@/components/admin/admin-shell";
import { AdminAreaChart } from "@/components/admin/admin-charts";
import { Activity } from "lucide-react";
import { I } from "@/components/ui/glyphs";
import { db } from "@/lib/server/store";
import { getAuditPage, type AuditCategory } from "@/lib/server/audit";
import { activePlayers, grossGamingRevenue, netGamingRevenue, kycFunnel, providerSummary, rgRosterCounts, moneyFlowSeries } from "@/lib/server/analytics";
import { formatTzsCompact } from "@/lib/utils";

export const metadata = { title: "Admin · Overview" };
export const dynamic = "force-dynamic";

const CATEGORY_VARIANT: Record<AuditCategory, "gold" | "royal" | "danger" | "success" | "warning" | "neutral"> = {
  AUTH:       "royal",
  KYC:        "royal",
  WALLET:     "royal",
  BET:        "gold",
  ADMIN:      "warning",
  COMPLIANCE: "warning",
  SECURITY:   "danger",
  SYSTEM:     "neutral",
};

export default function AdminOverviewPage() {
  const active24h = activePlayers("today");
  const ggr = grossGamingRevenue("today");
  const ngr = netGamingRevenue("today");
  const amlPending = db.txn.listByStatus("AML_REVIEW").length;
  const kyc = kycFunnel();
  const provs = providerSummary("28d").slice(0, 5);
  const rg = rgRosterCounts();
  const recent = getAuditPage({ limit: 12 });
  const flow = moneyFlowSeries("today", 24);

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
          <AdminKpi label="Active players" sw="Wachezaji hai"     value={active24h.toLocaleString()} delta="last 24h" pulse />
          <AdminKpi label="GGR · 24h"      sw="Mapato ya jumla"   value={`TZS ${formatTzsCompact(ggr).replace("TZS ", "")}`} gold delta="vs yesterday" />
          <AdminKpi label="NGR · 24h"      sw="Mapato halisi"     value={`TZS ${formatTzsCompact(ngr).replace("TZS ", "")}`} gold delta="net of payouts" />
          <AdminKpi label="AML pending"    sw="Inasubiri ukaguzi" value={amlPending} delta="needs review" deltaDir={amlPending > 0 ? "up" : "flat"} pulse={amlPending > 0} />
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
              fillVar="var(--gold)"
              strokeVar="var(--gold)"
              yLabel="Net flow"
            />
          </AdminCard>
          <AdminCard
            title="Live activity feed"
            sw="Shughuli za moja kwa moja"
            action={<a href="/admin/audit" className="font-mono text-micro tracking-[0.10em] uppercase text-royal">audit →</a>}
          >
            <div className="max-h-[360px] overflow-y-auto -mx-1 px-1">
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
                <div className="py-6 text-center text-caption text-text-tertiary">
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
              conversion {conversion.toFixed(1)}% · <span className="text-gold italic">uthibitisho</span>
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
                <p className="text-caption text-text-tertiary">28-day deposit share · <span className="text-gold italic">asilimia</span></p>
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
