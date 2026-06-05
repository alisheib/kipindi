import { AdminPageHead, AdminKpi, AdminCard } from "@/components/admin/admin-shell";
import { AdminAreaChart, AdminStackedBars } from "@/components/admin/admin-charts";
import {
  depositsTotal,
  withdrawalsTotal,
  grossGamingRevenue,
  netGamingRevenue,
  operatorMarginPct,
  walletLiabilityTotal,
  providerSummary,
  topNgrContributors,
  moneyFlowSeries,
  marginSeries,
  providerStackedSeries,
  listProvidersInPeriod,
} from "@/lib/server/analytics";
import { formatTzs, formatTzsCompact } from "@/lib/utils";
import { GenerateButton } from "../reports/generate-button";
import type { Period } from "@/lib/server/analytics";

export const metadata = { title: "Admin · Finance" };
export const dynamic = "force-dynamic";

const VALID_PERIODS: Period[] = ["today", "7d", "28d", "qtd"];

export default async function AdminFinancePage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const sp = await searchParams;
  // The PeriodPicker round-trips via ?range= — honour it (default 7d).
  const period: Period = VALID_PERIODS.includes(sp.range as Period) ? (sp.range as Period) : "7d";

  const dep = depositsTotal(period);
  const wd  = withdrawalsTotal(period);
  const ggr = grossGamingRevenue(period);
  const ngr = netGamingRevenue(period);
  const margin = operatorMarginPct(period);
  const liability = walletLiabilityTotal();
  const provs = providerSummary(period);
  const top = topNgrContributors(10);
  const flow = moneyFlowSeries(period, 28);
  const margins = marginSeries(period, 28);
  const provBars = providerStackedSeries(period, 14);
  const providers = listProvidersInPeriod(period);

  // Tax accrued — placeholder formula (5% of GGR for the QTD example), real
  // calculation will come from TRA filing module.
  const taxAccrued = Math.round(ggr * 0.05);

  return (
    <>
      <AdminPageHead
        title="Finance"
        sw="Fedha"
        actions={
          // Branded Excel + PDF export pair. Both call the same
          // /api/admin/reports endpoint with the GBT monthly summary
          // (currently the most complete finance report); a future
          // sprint splits this into "daily reconciliation" and "weekly
          // P&L" with the same button shape.
          <GenerateButton id="gbt-monthly" />
        }
      />

      <div className="px-4 lg:px-6 py-5 space-y-4">
        {/* KPI 8-up */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminKpi label="Deposits in"     sw="Amana"             value={`TZS ${formatTzsCompact(dep.amount).replace("TZS ", "")}`} gold delta={`${dep.count.toLocaleString()} txns`} />
          <AdminKpi label="Withdrawals out" sw="Utoaji"            value={`TZS ${formatTzsCompact(wd.amount).replace("TZS ", "")}`}  delta={`${wd.count.toLocaleString()} txns`} />
          <AdminKpi label="GGR"             sw="Mapato ya jumla"    value={`TZS ${formatTzsCompact(ggr).replace("TZS ", "")}`}        gold delta={`${period}`} />
          <AdminKpi label="NGR"             sw="Mapato halisi"      value={`TZS ${formatTzsCompact(ngr).replace("TZS ", "")}`}        gold delta="net of payouts" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminKpi label="Tax accrued (est.)" sw="Kodi · makisio" value={`TZS ${formatTzsCompact(taxAccrued).replace("TZS ", "")}`} delta="pending TRA module" deltaDir="flat" />
          <AdminKpi label="Operator margin"  sw="Faida"         value={`${margin.toFixed(1)}%`} gold delta="vs 7-10% band" deltaDir={margin > 7 ? "up" : "flat"} />
          <AdminKpi label="Wallet liability" sw="Madeni"        value={`TZS ${formatTzsCompact(liability).replace("TZS ", "")}`} delta="real-time" />
          <AdminKpi label="Active players"   sw="Wachezaji"     value={top.length.toLocaleString()} delta={`${period}`} />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <AdminCard title="Net flow over time" sw="Mtiririko wa pesa · 28-day daily series">
            <AdminAreaChart series={flow} xLabels={flow.map((p) => p.label)} height={240} fillVar="var(--gold)" strokeVar="var(--gold)" />
          </AdminCard>
          <AdminCard title="Operator margin" sw="Faida ya mfumo · 28-day · band 7–10%">
            <AdminAreaChart series={margins} xLabels={margins.map((p) => p.label)} height={240} fillVar="var(--royal)" strokeVar="var(--royal)" />
          </AdminCard>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <AdminCard title="Provider mix over time" sw="Mchanganyiko wa watoa huduma · 14-day daily">
            <AdminStackedBars bars={provBars} legend={providers} height={200} />
          </AdminCard>
          <AdminCard title="Top-10 player concentration" sw="Wachezaji 10 wakubwa">
            <div className="space-y-1.5">
              {top.length === 0 && <p className="text-caption text-text-tertiary">No active players yet in this window.</p>}
              {top.map((t, i) => {
                const max = top[0]?.ngr || 1;
                const pct = Math.max(2, Math.round((t.ngr / max) * 100));
                return (
                  <div key={t.userId} className="flex items-center gap-2 text-caption">
                    <span className="w-6 font-mono text-text-tertiary">#{i + 1}</span>
                    <span className="w-28 font-mono text-text truncate">p_{t.userId.slice(-6)}</span>
                    <div className="flex-1 h-3 bg-bg-sunken rounded-sm relative overflow-hidden">
                      <div className="absolute inset-y-0 left-0 bg-gold/70 prog-sweep" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="font-mono text-text-secondary tabular w-20 text-right">{formatTzsCompact(t.ngr)}</span>
                  </div>
                );
              })}
            </div>
          </AdminCard>
        </div>

        {/* Provider summary table */}
        <AdminCard
          title="Provider summary"
          sw="Muhtasari wa watoa huduma"
          action={<span className="font-mono text-micro tracking-[0.10em] uppercase text-text-tertiary">view as chart →</span>}
        >
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-caption min-w-[640px]">
              <thead className="font-mono text-micro tracking-[0.14em] uppercase text-text-tertiary border-b border-border-subtle">
                <tr>
                  <th className="text-left py-2 pr-3 font-medium">Provider</th>
                  <th className="text-right py-2 pr-3 font-medium">Deposits</th>
                  <th className="text-right py-2 pr-3 font-medium">Dep #</th>
                  <th className="text-right py-2 pr-3 font-medium">Withdrawals</th>
                  <th className="text-right py-2 pr-3 font-medium">WD #</th>
                  <th className="text-right py-2 pl-3 font-medium">Net</th>
                </tr>
              </thead>
              <tbody>
                {provs.map((p) => (
                  <tr key={p.provider} className="border-b border-border-subtle/50 last:border-b-0">
                    <td className="py-2 pr-3 font-medium text-text whitespace-nowrap">{p.provider}</td>
                    <td className="py-2 pr-3 font-mono tabular text-right">{formatTzs(p.deposits)}</td>
                    <td className="py-2 pr-3 font-mono tabular text-right text-text-secondary">{p.depositCount.toLocaleString()}</td>
                    <td className="py-2 pr-3 font-mono tabular text-right">{formatTzs(p.withdrawals)}</td>
                    <td className="py-2 pr-3 font-mono tabular text-right text-text-secondary">{p.withdrawalCount.toLocaleString()}</td>
                    <td className={["py-2 pl-3 font-mono tabular text-right font-semibold", p.net >= 0 ? "text-gold" : "text-text-tertiary"].join(" ")}>
                      {p.net >= 0 ? "+" : ""}{formatTzsCompact(p.net)}
                    </td>
                  </tr>
                ))}
                {provs.length === 0 && (
                  <tr><td colSpan={6} className="py-6 text-center text-text-tertiary">No provider activity in this window.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </AdminCard>
      </div>
    </>
  );
}
