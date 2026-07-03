import { AdminPageHead, AdminCard, AdminKpi } from "@/components/admin/admin-shell";
import { I } from "@/components/ui/glyphs";
import { getGlobalConfig, listMarketOverrides, DEFAULT_GLOBAL_CONFIG } from "@/lib/server/market-config";
import { getMarket } from "@/lib/server/market-service";
import { getAuditPage } from "@/lib/server/audit";
import { Chip } from "@/components/ui/chip";
import {
  GlobalConfigForm,
  MarketOverrideForm,
  ClearOverrideButton,
} from "./config-form";
import { formatTzs, formatDateTime } from "@/lib/utils";

export const metadata = { title: "Admin · Market config" };
export const dynamic = "force-dynamic";

export default async function AdminConfigPage() {
  const config = await getGlobalConfig().catch(() => DEFAULT_GLOBAL_CONFIG);
  const overrides = await listMarketOverrides().catch(() => []);
  const overrideMarketNames = new Map<string, string>();
  for (const { marketId } of overrides) {
    const m = await getMarket(marketId).catch(() => null);
    if (m) overrideMarketNames.set(marketId, m.titleEn);
  }
  const recent = getAuditPage({ category: "ADMIN", limit: 50 }).filter(
    (e) => e.action.startsWith("config."),
  ).slice(0, 12);

  const totalFee = config.taxRate + config.commissionRate + config.reserveRate + config.aggregatorRate;

  return (
    <>
      <AdminPageHead
        title="Market config"
        sw="Mipangilio ya soko"
        period={false}
        actions={
          <Chip size="md" variant="resolved">
            Price Competition · whole-pool
          </Chip>
        }
      />
      <div className="px-4 lg:px-6 py-5 space-y-4">
        {/* Snapshot KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <AdminKpi label="Tax rate"        sw="Kodi"        value={`${(config.taxRate * 100).toFixed(1)}%`} delta="TRA · Cap 332" />
          <AdminKpi label="Commission"      sw="Faida"       value={`${(config.commissionRate * 100).toFixed(1)}%`} delta="50pick" gold />
          <AdminKpi label="Reserve"         sw="Akiba"       value={`${(config.reserveRate * 100).toFixed(1)}%`} delta="operator reserve" gold />
          <AdminKpi label="Total pool fee"  sw="Jumla"       value={`${(totalFee * 100).toFixed(1)}%`} delta="≤ 30% ceiling" />
          <AdminKpi label="TRA on commission" sw="TRA"       value={`${(config.traTaxOnCommissionRate * 100).toFixed(0)}%`} delta="of operator take" />
          <AdminKpi label="GBT on commission" sw="GBT"       value={`${(config.gbtLevyOnCommissionRate * 100).toFixed(0)}%`} delta="of operator take" />
        </div>

        {/* Pari-mutuel formula */}
        <AdminCard className="border-info-border bg-info-bg/15">
          <div className="flex items-start gap-3">
            <I.settings size={18} className="text-info shrink-0 mt-0.5" />
            <div className="text-caption text-text-secondary space-y-1.5">
              <p className="text-text font-bold">Whole-pool distribution model</p>
              <p>
                Every stake — YES and NO — joins one pool. At resolution we compute{" "}
                <code className="font-mono text-gold-300">netPool = grossPool × (1 − tax − commission − reserve − aggregator)</code>,
                then pay each winner{" "}
                <code className="font-mono text-gold-300">stake × (netPool / winningSidePool)</code>.
                Payouts are dynamic and depend on how the pool ends up split.
              </p>
              <p>
                <strong className="text-text">Edge case warning:</strong> when one side dominates, even winning
                positions can yield thin profit or a small net loss after fees. The dial surfaces this
                automatically when the projected payout/stake ratio drops below the
                <code className="font-mono ml-1">thinProfitRatio</code> below.
              </p>
            </div>
          </div>
        </AdminCard>

        {/* Global config form */}
        <AdminCard
          title="Global rates"
          sw="Viwango vya jumla"
          action={
            <span className="font-mono text-[10px] tracking-[0.10em] uppercase text-text-tertiary">
              changes apply on next bet — no redeploy
            </span>
          }
        >
          <GlobalConfigForm config={config} />
        </AdminCard>

        {/* Per-market overrides */}
        <AdminCard
          title="Per-market overrides"
          sw="Vifuniko vya soko"
          action={
            <span className="font-mono text-[10px] tracking-[0.10em] uppercase text-text-tertiary">
              {overrides.length} active
            </span>
          }
        >
          <p className="text-caption text-text-tertiary mb-4 max-w-[72ch]">
            Use overrides for high-volatility markets where the standard fee mix isn&apos;t appropriate
            (e.g. lower commission on goodwill markets, or a slightly higher tax for compliance trials).
            Leave any field blank to inherit the global value.
          </p>

          <div className="space-y-4">
            <div className="rounded-md glass-panel p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-text-subtle mb-3">Add override</p>
              <MarketOverrideForm globalConfig={config} />
            </div>

            {overrides.length === 0 ? (
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-subtle text-center py-3">
                No active overrides — every market uses the global config.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="admin-tbl">
                  <thead className="border-b border-border bg-bg-overlay">
                    <tr className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">
                      <th className="text-left p-3">Market</th>
                      <th className="text-left p-3">Tax</th>
                      <th className="text-left p-3">Commission</th>
                      <th className="text-left p-3">Stake bounds</th>
                      <th className="text-right p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-text-muted">
                    {overrides.map(({ marketId, over }) => {
                      return (
                        <tr key={marketId} className="border-b border-border/50 last:border-b-0 align-top">
                          <td className="p-3">
                            <a
                              href={`/markets/${marketId}`}
                              className="font-display font-semibold text-text hover:text-yes-300 line-clamp-2 max-w-[420px]"
                            >
                              {overrideMarketNames.get(marketId) ?? marketId}
                            </a>
                            <p className="mt-0.5 font-mono text-[10px] text-text-subtle">{marketId}</p>
                          </td>
                          <td className="p-3 font-mono">
                            {over.taxRate !== undefined ? `${(over.taxRate * 100).toFixed(1)}%` : "—"}
                          </td>
                          <td className="p-3 font-mono">
                            {over.commissionRate !== undefined ? `${(over.commissionRate * 100).toFixed(1)}%` : "—"}
                          </td>
                          <td className="p-3 font-mono">
                            {over.minStake !== undefined || over.maxStake !== undefined
                              ? `${over.minStake != null ? formatTzs(over.minStake) : "—"} / ${over.maxStake != null ? formatTzs(over.maxStake) : "—"}`
                              : "—"}
                          </td>
                          <td className="p-3 text-right">
                            <ClearOverrideButton marketId={marketId} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </AdminCard>

        {/* Recent config changes audit */}
        <AdminCard
          title="Recent changes"
          sw="Mabadiliko ya hivi karibuni"
          action={<span className="font-mono text-[10px] tracking-[0.10em] uppercase text-text-tertiary">{recent.length} entries</span>}
          padding="p-0"
        >
          {recent.length === 0 ? (
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-subtle text-center py-6">
              No config changes yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="admin-tbl">
                <thead className="border-b border-border bg-bg-overlay">
                  <tr className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">
                    <th className="text-left p-3">Time</th>
                    <th className="text-left p-3">Action</th>
                    <th className="text-left p-3">Officer</th>
                    <th className="text-left p-3">Target</th>
                    <th className="text-left p-3">Changes</th>
                  </tr>
                </thead>
                <tbody className="text-text-muted">
                  {recent.map((e) => (
                    <tr key={e.id} className="border-b border-border/50 last:border-b-0 align-top">
                      <td className="p-3 font-mono whitespace-nowrap text-text-subtle">{formatDateTime(e.createdAt)}</td>
                      <td className="p-3 font-medium text-text">{e.action.replace("config.", "")}</td>
                      <td className="p-3 font-mono">{e.actorId?.slice(0, 16) ?? "—"}</td>
                      <td className="p-3 font-mono">{e.targetId ?? "—"}</td>
                      <td className="p-3 font-mono text-[11px] text-text-subtle max-w-[360px] truncate">
                        {(e.payload as { changes?: unknown })?.changes ? JSON.stringify((e.payload as { changes: unknown }).changes) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>

        <AdminCard className="border-warning-border bg-warning-bg/15">
          <div className="flex items-start gap-3">
            <I.alertCircle s={18} />
            <div className="text-caption text-text-secondary">
              <p className="text-text font-bold">Live markets keep their config at place-time</p>
              <p>
                A rate change applies to <strong>future</strong> bets only. Positions already opened keep the fee
                model that was in effect when they were placed. This is the regulator-friendly default — predictors
                see the rates they signed up for.
              </p>
            </div>
          </div>
        </AdminCard>


      </div>
    </>
  );
}
