import { I } from "@/components/ui/glyphs";
import { getHousePoolStats, getHousePoolLedger } from "@/lib/server/house-pool";
import { getGlobalConfig } from "@/lib/server/market-config";
import { AdminPageHead, AdminCard, AdminKpi } from "@/components/admin/admin-shell";
import { Chip } from "@/components/ui/chip";
import { HousePoolForms } from "./house-pool-forms";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "House Pool · Admin" };

const fmtTzs = (n: number) => `TZS ${n.toLocaleString("en-US")}`;
const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;

export default async function HousePoolPage() {
  const stats = await getHousePoolStats();
  const ledger = await getHousePoolLedger(30);
  const cfg = await getGlobalConfig();
  const totalFee = cfg.taxRate + cfg.commissionRate + cfg.reserveRate + cfg.aggregatorRate;

  return (
    <>
      <AdminPageHead
        title="House Liquidity Pool"
        sw="Dimbwi la Ukwasi"
        actions={
          stats.isLow ? (
            <Chip size="sm" variant="danger">
              <I.warning s={12} /> Low reserve
            </Chip>
          ) : (
            <Chip size="sm" variant="resolved">Active</Chip>
          )
        }
      />

      <div className="px-4 lg:px-6 py-5 space-y-4">
        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <AdminKpi
            label="Balance"
            sw="Salio"
            value={fmtTzs(stats.balance)}
            delta={stats.isLow ? "below minimum" : "healthy"}
            deltaDir={stats.isLow ? "down" : "up"}
            gold
          />
          <AdminKpi
            label="Active seeds"
            sw="Mbegu hai"
            value={String(stats.activeSeeds)}
            delta={`${fmtTzs(stats.totalSeeded)} deployed`}
            deltaDir="flat"
          />
          <AdminKpi
            label="Seed per market"
            sw="Mbegu kwa soko"
            value={fmtTzs(stats.config.seedPerSide * 2)}
            delta={`${fmtTzs(stats.config.seedPerSide)} per side`}
            deltaDir="flat"
          />
          <AdminKpi
            label={`Fee split (${fmtPct(totalFee)})`}
            sw="Mgawanyo wa ada"
            value={`${fmtPct(cfg.reserveRate)} reserve`}
            delta={`tax ${fmtPct(cfg.taxRate)} · comm ${fmtPct(cfg.commissionRate)} · agg ${fmtPct(cfg.aggregatorRate)}`}
            deltaDir="flat"
            gold
          />
        </div>

        {/* Client forms: top-up, withdraw, config */}
        <HousePoolForms config={stats.config} />

        {/* Ledger */}
        <AdminCard
          title="Ledger"
          sw="Daftari"
          action={<span className="font-mono text-micro uppercase tracking-[0.10em] text-text-tertiary">{ledger.length} entries</span>}
          padding="p-0"
        >
          {ledger.length === 0 ? (
            <p className="text-caption text-text-tertiary text-center py-6">
              No ledger entries yet. Top up the reserve or create a market to see activity.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="admin-tbl min-w-[640px]">
                <thead>
                  <tr>
                    <th className="text-left">Type</th>
                    <th className="text-right">Amount</th>
                    <th className="text-right">Balance</th>
                    <th className="text-left">Market</th>
                    <th className="text-left">Note</th>
                    <th className="text-left">Time</th>
                  </tr>
                </thead>
                <tbody className="text-text-muted">
                  {ledger.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <Chip size="sm" variant={
                          e.type === "TOP_UP" ? "yes"
                          : e.type === "RESERVE_FEE" ? "resolved"
                          : e.type === "SETTLE_RETURN" ? "pending"
                          : e.type === "LOSS_ABSORBED" ? "danger"
                          : e.type === "SEED_OUT" ? "neutral"
                          : "danger"
                        }>
                          {e.type.replace(/_/g, " ")}
                        </Chip>
                      </td>
                      <td className={`text-right font-mono tabular-nums ${e.amount >= 0 ? "text-yes-300" : "text-no-300"}`}>
                        {e.amount >= 0 ? "+" : ""}{e.amount.toLocaleString("en-US")}
                      </td>
                      <td className="text-right font-mono tabular-nums text-text-muted">
                        {e.balanceAfter.toLocaleString("en-US")}
                      </td>
                      <td className="font-mono text-micro text-text-subtle truncate max-w-[120px]">
                        {e.marketId ?? "\u2014"}
                      </td>
                      <td className="text-text-muted truncate max-w-[200px]">{e.note}</td>
                      <td className="font-mono text-micro text-text-subtle whitespace-nowrap">
                        {formatDateTime(e.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>
      </div>
    </>
  );
}
