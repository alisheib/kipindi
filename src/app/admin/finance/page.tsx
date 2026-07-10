import { AdminPageHead, AdminKpi, AdminCard } from "@/components/admin/admin-shell";
import { AdminAreaChart, AdminStackedBars, AdminBarList } from "@/components/admin/admin-charts";
import {
  depositsTotal,
  withdrawalsTotal,
  grossGamingRevenue,
  netGamingRevenue,
  operatorMarginPct,
  walletLiabilityTotal,
  providerSummary,
  topNgrContributors,
  activePlayers,
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

  const dep = await depositsTotal(period).catch(() => ({ amount: 0, count: 0 }));
  const wd  = await withdrawalsTotal(period).catch(() => ({ amount: 0, count: 0 }));
  const ggr = await grossGamingRevenue(period).catch(() => 0);
  const ngr = await netGamingRevenue(period).catch(() => 0);
  const margin = await operatorMarginPct(period).catch(() => 0);
  const liability = await walletLiabilityTotal().catch(() => 0);
  const provs = await providerSummary(period).catch(() => []);
  const top = await topNgrContributors(10).catch(() => []);
  const activePeriod = await activePlayers(period).catch(() => 0);
  const flow = await moneyFlowSeries(period, 28).catch(() => []);
  const margins = await marginSeries(period, 28).catch(() => []);
  const provBars = await providerStackedSeries(period, 14).catch(() => []);
  const providers = await listProvidersInPeriod(period).catch(() => []);

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
          <AdminKpi label="Deposits in"     sw="Amana"             value={`TZS ${formatTzsCompact(dep.amount).replace("TZS ", "")}`} delta={`${dep.count.toLocaleString()} txns`} />
          <AdminKpi label="Withdrawals out" sw="Utoaji"            value={`TZS ${formatTzsCompact(wd.amount).replace("TZS ", "")}`}  delta={`${wd.count.toLocaleString()} txns`} />
          <AdminKpi label="GGR"             sw="Mapato ya jumla"    value={`TZS ${formatTzsCompact(ggr).replace("TZS ", "")}`}        delta={`${period}`} />
          <AdminKpi label="NGR"             sw="Mapato halisi"      value={`TZS ${formatTzsCompact(ngr).replace("TZS ", "")}`}        delta="net of bonus + fees" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminKpi label="Tax accrued (est.)" sw="Kodi · makisio" value={`TZS ${formatTzsCompact(taxAccrued).replace("TZS ", "")}`} delta="pending TRA module" deltaDir="flat" />
          <AdminKpi label="Operator margin"  sw="Faida"         value={`${margin.toFixed(1)}%`} delta="vs 7-10% band" deltaDir={margin > 7 ? "up" : "flat"} />
          <AdminKpi label="Wallet liability" sw="Madeni"        value={`TZS ${formatTzsCompact(liability).replace("TZS ", "")}`} delta="real-time" />
          <AdminKpi label="Active players"   sw="Wachezaji"     value={activePeriod.toLocaleString()} delta={`${period}`} />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <AdminCard title="Net flow over time" sw="Mtiririko wa pesa · 28-day daily series">
            <AdminAreaChart series={flow} xLabels={flow.map((p) => p.label)} height={240} fillVar="var(--royal)" strokeVar="var(--royal)" />
          </AdminCard>
          <AdminCard title="Operator margin" sw="Faida ya mfumo · 28-day · band 7–10%">
            <AdminAreaChart series={margins} xLabels={margins.map((p) => p.label)} height={240} fillVar="var(--royal)" strokeVar="var(--royal)" />
          </AdminCard>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <AdminCard title="Provider mix over time" sw="Mchanganyiko wa watoa huduma · 14-day daily">
            <AdminStackedBars bars={provBars} legend={providers} height={240} />
          </AdminCard>
          <AdminCard title="Top-10 player concentration" sw="Wachezaji 10 wakubwa">
            {top.length === 0 ? (
              <p className="text-caption text-text-tertiary">No active players yet in this window.</p>
            ) : (
              // AdminBarList (royal fill) — replaces the hand-rolled gold bar
              // (admin gold-discipline) and adopts the A8 distribution primitive.
              <AdminBarList
                rows={top.map((t, i) => ({
                  label: (
                    <span className="font-mono">
                      <span className="text-text-tertiary">#{i + 1}</span>{" "}
                      <span className="text-text">p_{t.userId.slice(-6)}</span>
                    </span>
                  ),
                  value: t.ngr,
                  title: t.userId,
                }))}
                format={(n) => formatTzsCompact(n)}
              />
            )}
          </AdminCard>
        </div>

        {/* Provider summary table */}
        <AdminCard
          title="Provider summary"
          sw="Muhtasari wa watoa huduma"
        >
          <div className="overflow-x-auto -mx-4 px-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--brand-400)]" tabIndex={0} role="region" aria-label="Top players by deposits">
            <table className="admin-tbl min-w-[640px]">
              <thead>
                <tr>
                  <th className="text-left">Provider</th>
                  <th className="text-right">Deposits</th>
                  <th className="text-right">Dep #</th>
                  <th className="text-right">Withdrawals</th>
                  <th className="text-right">WD #</th>
                  <th className="text-right">Net</th>
                </tr>
              </thead>
              <tbody>
                {provs.map((p) => (
                  <tr key={p.provider}>
                    <td className="font-medium text-text whitespace-nowrap">{p.provider}</td>
                    <td className="font-mono tabular text-right">{formatTzs(p.deposits)}</td>
                    <td className="font-mono tabular text-right text-text-secondary">{p.depositCount.toLocaleString()}</td>
                    <td className="font-mono tabular text-right">{formatTzs(p.withdrawals)}</td>
                    <td className="font-mono tabular text-right text-text-secondary">{p.withdrawalCount.toLocaleString()}</td>
                    <td className={["font-mono tabular text-right font-semibold", p.net >= 0 ? "text-text" : "text-text-tertiary"].join(" ")}>
                      {p.net >= 0 ? "+" : ""}{formatTzsCompact(p.net)}
                    </td>
                  </tr>
                ))}
                {provs.length === 0 && (
                  <tr><td colSpan={6} className="!py-6 text-center text-text-tertiary">No provider activity in this window.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </AdminCard>
      </div>
    </>
  );
}
