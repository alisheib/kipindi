import { I } from "@/components/ui/glyphs";
import { getHousePoolStats, getHousePoolLedger } from "@/lib/server/house-pool";
import { getGlobalConfig } from "@/lib/server/market-config";
import { AdminPageHead, AdminCard, AdminKpi } from "@/components/admin/admin-shell";
import { AdminPagination, PER_PAGE, parsePage, buildBaseHref } from "@/components/admin/admin-pagination";
import { parseSort, applySort, SortTh } from "@/components/admin/admin-sort";
import { Chip } from "@/components/ui/chip";
import { HousePoolForms } from "./house-pool-forms";
import { formatTzs, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "House Pool · Admin" };

const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;

export default async function HousePoolPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; sort?: string; dir?: string }>;
}) {
  const sp = await searchParams;
  const stats = await getHousePoolStats();
  // Pull the full ledger (was capped at 30) so pagination owns the slicing.
  const ledger = await getHousePoolLedger(10000);
  const cfg = await getGlobalConfig();
  const totalFee = cfg.taxRate + cfg.commissionRate + cfg.reserveRate + cfg.aggregatorRate;

  // Sort (URL-driven), then paginate — newest first by default.
  const { sort, dir } = parseSort(sp, ["type", "amount", "balance", "time"] as const, "time", "desc");
  const sorted = applySort(ledger, sort, dir, {
    type: (e) => e.type,
    amount: (e) => e.amount,
    balance: (e) => e.balanceAfter,
    time: (e) => e.createdAt,
  });
  const page = parsePage(sp.page, sorted.length);
  const paged = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const baseHref = buildBaseHref("/admin/house-pool", { sort: sp.sort, dir: sp.dir });

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
            value={formatTzs(stats.balance)}
            delta={stats.isLow ? "below minimum" : "healthy"}
            deltaDir={stats.isLow ? "down" : "up"}
            gold
          />
          <AdminKpi
            label="Active seeds"
            sw="Mbegu hai"
            value={String(stats.activeSeeds)}
            delta={`${formatTzs(stats.totalSeeded)} deployed`}
            deltaDir="flat"
          />
          <AdminKpi
            label="Seed per market"
            sw="Mbegu kwa soko"
            value={formatTzs(stats.config.seedPerSide * 2)}
            delta={`${formatTzs(stats.config.seedPerSide)} per side`}
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
                    <SortTh field="type" label="Type" current={sort} dir={dir} sp={sp} baseHref="/admin/house-pool" />
                    <SortTh field="amount" label="Amount" current={sort} dir={dir} sp={sp} baseHref="/admin/house-pool" align="right" />
                    <SortTh field="balance" label="Balance" current={sort} dir={dir} sp={sp} baseHref="/admin/house-pool" align="right" />
                    <th className="text-left">Market</th>
                    <th className="text-left">Note</th>
                    <SortTh field="time" label="Time" current={sort} dir={dir} sp={sp} baseHref="/admin/house-pool" />
                  </tr>
                </thead>
                <tbody className="text-text-muted">
                  {paged.map((e) => (
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
                        {formatTzs(e.amount)}
                      </td>
                      <td className="text-right font-mono tabular-nums text-text-muted">
                        {formatTzs(e.balanceAfter)}
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
          <AdminPagination total={sorted.length} page={page} baseHref={baseHref} />
        </AdminCard>
      </div>
    </>
  );
}
