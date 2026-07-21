import { AdminPageHead, AdminKpi, AdminCard } from "@/components/admin/admin-shell";
import { AdminAreaChart, AdminStackedBars, AdminBarList } from "@/components/admin/admin-charts";
import { AdminTableEmpty } from "@/components/admin/admin-table-empty";
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
import { dailyKpiSeries } from "@/lib/server/report-money";
import { formatTzs, formatTzsCompact } from "@/lib/utils";
import { ScrollX } from "@/components/ui/scroll-x";
import { GenerateButton } from "../reports/generate-button";
import type { Period } from "@/lib/server/analytics";
import { currentSession } from "@/lib/server/auth-service";
import { hasRole, MONEY_ROLES } from "@/lib/server/roles";
import { getEffectiveConfig } from "@/lib/server/market-config";
import { houseAccountBalances, trialBalance } from "@/lib/server/ledger";
import { Stat } from "@/components/ui/stat";
import { AdminRestricted } from "@/components/admin/admin-restricted";

/** What each house account actually holds — so the owner doesn't have to guess. */
const HOUSE_ACCOUNT_NOTE: Record<string, string> = {
  "HOUSE:COMMISSION": "our fee: pool + early-exit + withdrawal",
  "HOUSE:AGGREGATOR": "the payment gateway's share",
  "HOUSE:TRA_LEVY": "TRA, levied on our commission",
  "HOUSE:GBT_LEVY": "GBT, levied on our commission",
  "HOUSE:TAX": "RETIRED — historical rows only",
  "HOUSE:RESERVE": "RETIRED — historical rows only",
  "SYSTEM:BONUS": "bonus issuance",
  "SYSTEM:ADJUSTMENT": "admin adjustments",
  "SYSTEM:VOID": "expired bonus sink",
};
export const metadata = { title: "Admin · Finance" };
export const dynamic = "force-dynamic";

const VALID_PERIODS: Period[] = ["today", "7d", "28d", "qtd"];

export default async function AdminFinancePage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  // Money data is MONEY_ROLES only — NEVER MODERATOR (roles.ts). The admin layout
  // only gates ADMIN_CONSOLE_ROLES (which DOES include MODERATOR), so without this
  // a moderator could read owner-grade GGR/NGR and the top-contributor list.
  // Return BEFORE any money aggregate is computed.
  const session = await currentSession();
  if (!hasRole(session?.role, MONEY_ROLES)) {
    return <AdminRestricted title="Finance" sw="Fedha" need="Admin or Compliance" />;
  }

  const sp = await searchParams;
  // The PeriodPicker round-trips via ?range= — honour it (default 7d).
  const period: Period = VALID_PERIODS.includes(sp.range as Period) ? (sp.range as Period) : "7d";

  // A-5: money figures resolve to null (not 0) on a failed read, so the tile
  // renders an explicit "n/a · couldn't compute" instead of a fabricated "TZS 0".
  const dep = await depositsTotal(period).catch(() => null);
  const wd  = await withdrawalsTotal(period).catch(() => null);
  const ggr = await grossGamingRevenue(period).catch(() => null);
  const ngr = await netGamingRevenue(period).catch(() => null);
  const margin = await operatorMarginPct(period).catch(() => null);
  const liability = await walletLiabilityTotal().catch(() => null);
  const provs = await providerSummary(period).catch(() => []);
  const top = await topNgrContributors(10).catch(() => []);
  const activePeriod = await activePlayers(period).catch(() => null);
  const flow = await moneyFlowSeries(period, 28).catch(() => []);
  const margins = await marginSeries(period, 28).catch(() => []);
  const provBars = await providerStackedSeries(period, 14).catch(() => []);
  const providers = await listProvidersInPeriod(period).catch(() => []);
  // Read-only 7-day daily trend for the GGR/NGR/active tile sparklines — each
  // point is that day's REAL metric (canonical `summarise`), the metric's own
  // recent history, not a proxy series. `spark()` hides an all-zero line.
  const trends = await dailyKpiSeries("7d").catch(() => ({ ggr: [], ngr: [], active: [] }));
  const spark = (s: number[]) => (s.some((v) => v !== 0) ? s : undefined);

  // Tax accrued — the REAL statutory levies, at the admin-configured rates, on
  // the same basis the Daily Operations report files with (TRA + GBT levied on
  // the operator's commission/GGR — see market-config.ts).
  //
  // This previously showed a FABRICATED `ggr * 0.05` "placeholder formula" and
  // presented it to the owner as fact. Never ship an invented money figure: if we
  // can't compute it, we show nothing. Negative GGR accrues no levy (you cannot
  // owe tax on a loss), which matches reports/catalogue.ts's Math.max(0, ggr).
  const rates = await getEffectiveConfig().catch(() => null);
  // Real balances from the double-entry ledger. Empty object without a DB.
  const houseBalances = await houseAccountBalances().catch(() => ({} as Record<string, number>));
  // Wallet↔ledger trial balance (audit C3) — proves the books match the money.
  // Read-only; guarded so a slow/failed scan never takes the finance page down.
  const tb = await trialBalance().catch(() => null);
  const taxAccrued = rates && ggr !== null
    ? Math.round(Math.max(0, ggr) * (rates.traTaxOnCommissionRate + rates.gbtLevyOnCommissionRate))
    : null;

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
          <AdminKpi label="Deposits in"     sw="Amana"             value={dep ? `TZS ${formatTzsCompact(dep.amount).replace("TZS ", "")}` : ""} unavailable={dep === null} delta={dep ? `${dep.count.toLocaleString()} txns` : undefined} />
          <AdminKpi label="Withdrawals out" sw="Utoaji"            value={wd ? `TZS ${formatTzsCompact(wd.amount).replace("TZS ", "")}` : ""}  unavailable={wd === null}  delta={wd ? `${wd.count.toLocaleString()} txns` : undefined} />
          <AdminKpi label="GGR"             sw="Mapato ya jumla"    value={ggr === null ? "" : `TZS ${formatTzsCompact(ggr).replace("TZS ", "")}`}        unavailable={ggr === null} delta={`${period}`} series={spark(trends.ggr)} />
          <AdminKpi label="NGR"             sw="Mapato halisi"      value={ngr === null ? "" : `TZS ${formatTzsCompact(ngr).replace("TZS ", "")}`}        unavailable={ngr === null} delta="net of bonus + fees" series={spark(trends.ngr)} />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminKpi
            label="Statutory levies"
            sw="Kodi za kisheria"
            value={taxAccrued === null ? "—" : `TZS ${formatTzsCompact(taxAccrued).replace("TZS ", "")}`}
            delta={taxAccrued === null ? "rates unavailable" : "TRA + GBT on commission"}
            deltaDir="flat"
          />
          <AdminKpi label="Operator margin"  sw="Faida"         value={margin === null ? "" : `${margin.toFixed(1)}%`} unavailable={margin === null} delta="capped-fee model" deltaDir="flat" />
          <AdminKpi label="Wallet liability" sw="Madeni"        value={liability === null ? "" : `TZS ${formatTzsCompact(liability).replace("TZS ", "")}`} unavailable={liability === null} delta="real-time" />
          <AdminKpi label="Active players"   sw="Wachezaji"     value={activePeriod === null ? "" : activePeriod.toLocaleString()} unavailable={activePeriod === null} delta={`${period}`} series={spark(trends.active)} />
        </div>

        {/* THE HOUSE ACCOUNTS — straight from the double-entry ledger.
            `houseAccountBalances()` has existed in ledger.ts since the ledger was
            built and had ZERO call sites: the books were being kept and nobody was
            shown them. These are the real balances, summed from the real entries —
            not derived from analytics, not a formula, not an estimate.
            An empty state is shown rather than a fabricated number. */}
        <AdminCard
          title="House accounts (double-entry ledger)"
          sw="Akaunti za nyumba"
          action={
            <span className="font-mono text-[10px] tracking-[0.10em] uppercase text-text-tertiary">
              summed from ledger entries
            </span>
          }
        >
          {Object.keys(houseBalances).length === 0 ? (
            <p className="text-caption text-text-tertiary">
              No ledger entries yet. This panel shows real balances only — it will stay empty rather than show a
              number we cannot substantiate.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {Object.entries(houseBalances)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([account, amount]) => (
                  <Stat
                    key={account}
                    label={account.replace(/^(HOUSE|SYSTEM):/, "")}
                    value={`TZS ${formatTzsCompact(amount).replace("TZS ", "")}`}
                    tone={account === "HOUSE:COMMISSION" ? "gold" : "default"}
                    money
                    hint={HOUSE_ACCOUNT_NOTE[account]}
                  />
                ))}
            </div>
          )}
        </AdminCard>

        {/* LEDGER TRIAL BALANCE — the books proving themselves (audit C3).
            Compares each wallet's real money (balance + in-flight hold) and bonus
            against the double-entry ledger, plus global conservation (Σ = 0) and
            the bonus-grant invariant. A nightly sweep re-runs this and raises a
            COMPLIANCE alert on any drift; this panel is the live view. */}
        {tb && (
          <AdminCard
            title="Ledger trial balance"
            sw="Ulinganifu wa daftari"
            className={tb.ok ? undefined : "border-danger-border bg-danger-bg/20"}
            action={
              <span className={["font-mono text-[10px] tracking-[0.10em] uppercase", tb.ok ? "text-success" : "text-danger-fg"].join(" ")}>
                {tb.ok ? "✓ reconciles" : "✗ drift detected"}
              </span>
            }
          >
            <p className="text-caption text-text-secondary mb-3">
              Every wallet&rsquo;s money reconciled to the double-entry ledger:{" "}
              <code className="font-mono">ledger(PLAYER) = balance + hold</code>,{" "}
              <code className="font-mono">ledger(BONUS) = bonusBalance = Σ active grants</code>, and{" "}
              <code className="font-mono">Σ all entries = 0</code>. Re-checked nightly; drift raises a compliance alert.
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <AdminKpi label="Wallets checked" sw="Pochi zilizokaguliwa" value={tb.checkedWallets.toLocaleString()} />
              <AdminKpi
                label="Drifting wallets"
                sw="Pochi zenye tofauti"
                value={tb.driftingWallets.toLocaleString()}
                delta={tb.driftingWallets === 0 ? "all reconcile" : `${formatTzs(tb.totalAbsDrift)} total`}
                deltaDir={tb.driftingWallets === 0 ? "up" : "down"}
                pulse={tb.driftingWallets > 0}
              />
              <AdminKpi
                label="Global conservation"
                sw="Uhifadhi wa jumla"
                value={tb.globalBalanced ? "Σ = 0" : `Σ = ${formatTzs(tb.globalSum)}`}
                delta={tb.globalBalanced ? "balanced" : "NOT balanced"}
                deltaDir={tb.globalBalanced ? "up" : "down"}
                pulse={!tb.globalBalanced}
              />
              <AdminKpi
                label="Imbalanced groups"
                sw="Makundi yasiyolingana"
                value={tb.imbalancedGroups.length.toLocaleString()}
                deltaDir={tb.imbalancedGroups.length === 0 ? "up" : "down"}
                pulse={tb.imbalancedGroups.length > 0}
              />
            </div>
            {tb.drift.length > 0 && (
              <ScrollX label="Drifting wallets" className="-mx-4 px-4 mt-3">
                <table className="admin-tbl min-w-[560px]">
                  <thead>
                    <tr>
                      <th className="text-left">Player</th>
                      <th className="text-right">Wallet (bal+hold)</th>
                      <th className="text-right">Ledger</th>
                      <th className="text-right">Real drift</th>
                      <th className="text-right">Bonus drift</th>
                      <th className="text-right">Grant drift</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tb.drift.slice(0, 20).map((r) => (
                      <tr key={r.userId}>
                        <td className="font-mono text-text-tertiary whitespace-nowrap">p_{r.userId.slice(-6)}</td>
                        <td className="font-mono tabular text-right">{formatTzs(r.walletReal)}</td>
                        <td className="font-mono tabular text-right text-text-secondary">{formatTzs(r.ledgerReal)}</td>
                        <td className={["font-mono tabular text-right font-semibold", Math.abs(r.realDrift) > 0.5 ? "text-danger" : "text-text-tertiary"].join(" ")}>{r.realDrift >= 0 ? "+" : ""}{formatTzs(r.realDrift)}</td>
                        <td className={["font-mono tabular text-right", Math.abs(r.bonusDrift) > 0.5 ? "text-danger" : "text-text-tertiary"].join(" ")}>{r.bonusDrift >= 0 ? "+" : ""}{formatTzs(r.bonusDrift)}</td>
                        <td className={["font-mono tabular text-right", Math.abs(r.grantDrift) > 0.5 ? "text-danger" : "text-text-tertiary"].join(" ")}>{r.grantDrift >= 0 ? "+" : ""}{formatTzs(r.grantDrift)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {tb.drift.length > 20 && (
                  <p className="text-caption text-text-tertiary mt-2">Showing the 20 largest of {tb.drift.length} drifting wallets.</p>
                )}
              </ScrollX>
            )}
          </AdminCard>
        )}

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
          <ScrollX label="Provider summary" className="-mx-4 px-4">
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
                  <AdminTableEmpty colSpan={6} kind="admin" title="No provider data" body="No provider activity in this window." />
                )}
              </tbody>
            </table>
          </ScrollX>
        </AdminCard>
      </div>
    </>
  );
}
