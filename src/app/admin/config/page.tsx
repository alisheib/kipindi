import { AdminPageHead, AdminCard, AdminKpi } from "@/components/admin/admin-shell";
import { AdminPagination, PER_PAGE, parsePage, buildBaseHref } from "@/components/admin/admin-pagination";
import { I } from "@/components/ui/glyphs";
import { ScrollX } from "@/components/ui/scroll-x";
import { getGlobalConfig, listMarketOverrides, DEFAULT_GLOBAL_CONFIG } from "@/lib/server/market-config";
import { worstCaseWinnerRatio } from "@/lib/payout";
import { FeeSimulator } from "./fee-simulator";
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

export default async function AdminConfigPage({ searchParams }: { searchParams: Promise<{ opage?: string }> }) {
  const sp = await searchParams;
  const config = await getGlobalConfig().catch(() => DEFAULT_GLOBAL_CONFIG);
  const overrides = await listMarketOverrides().catch(() => []);
  const oPage = parsePage(sp.opage, overrides.length);
  const overridesPage = overrides.slice((oPage - 1) * PER_PAGE, oPage * PER_PAGE);
  const oBase = buildBaseHref("/admin/config", sp, "opage");
  const overrideMarketNames = new Map<string, string>();
  for (const { marketId } of overridesPage) {
    const m = await getMarket(marketId).catch(() => null);
    if (m) overrideMarketNames.set(marketId, m.titleEn);
  }
  const recent = getAuditPage({ category: "ADMIN", limit: 50 }).filter(
    (e) => e.action.startsWith("config."),
  ).slice(0, 12);

  // The worst payout/stake ratio any winner could suffer under the CURRENT rates,
  // swept across the whole lean range. Under the ceiling this is always > 1 — the
  // KPI exists to make that visible and to make a regression loud.
  const worst = worstCaseWinnerRatio(config);

  return (
    <>
      <AdminPageHead
        title="Market config"
        sw="Mipangilio ya soko"
        period={false}
        actions={
          <Chip size="md" variant="resolved">
            Pari-mutuel · capped fee
          </Chip>
        }
      />
      <div className="px-4 lg:px-6 py-5 space-y-4">
        {/* Snapshot KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <AdminKpi label="Commission"        sw="Faida"   value={`${(config.commissionRate * 100).toFixed(1)}%`} delta="of the whole pool" />
          <AdminKpi label="Fee ceiling"       sw="Kikomo"  value={`${(config.feeCeilingRate * 100).toFixed(1)}%`} delta="of the smaller side" />
          {/* THE KPI THAT MATTERS. If this ever reads below 1.00×, a player who
              called it right is losing money — which is the bug this whole model
              exists to make impossible. validate() refuses to save such a config,
              so it should never happen; showing it means we would SEE it if it did. */}
          <AdminKpi
            label="Worst winner ratio"
            sw="Kiwango cha chini"
            value={`${worst.ratio.toFixed(3)}×`}
            delta={worst.ratio >= 1 ? "never below 1.00× — a correct call cannot lose" : "⚠ BELOW STAKE — winners lose money"}
            deltaDir={worst.ratio >= 1 ? "up" : "down"}
          />
          <AdminKpi label="Cash-out fee"      sw="Ada ya kuuza" value={`${(config.cashOutFeeRate * 100).toFixed(1)}%`} delta={`free for ${config.freeExitGraceMinutes} min`} />
          <AdminKpi label="Withdrawal fee"    sw="Ada ya kutoa" value={`${(config.withdrawalFeeRate * 100).toFixed(2)}%`} delta={`${(config.withdrawalGatewayShareRate * 100).toFixed(2)}% to gateway`} />
          <AdminKpi label="TRA + GBT"         sw="TRA + GBT" value={`${((config.traTaxOnCommissionRate + config.gbtLevyOnCommissionRate) * 100).toFixed(0)}%`} delta="of OUR fee, not the player's" />
        </div>

        {/* The model, stated correctly. The old copy here documented
            `netPool = grossPool × (1 − tax − commission − reserve − aggregator)` and
            then warned, as accepted behaviour, that "even winning positions can
            yield … a small net loss after fees". That edge case is the bug; it is
            gone, and so is the paragraph that normalised it. */}
        <AdminCard className="border-info-border bg-info-bg/15">
          <div className="flex items-start gap-3">
            <I.settings size={18} className="text-info shrink-0 mt-0.5" />
            <div className="text-caption text-text-secondary space-y-1.5">
              <p className="text-text font-bold">Capped-fee pari-mutuel</p>
              <p>
                Every stake — YES and NO — joins one pool. At settlement:{" "}
                <code className="font-mono text-text">fee = min(commission × pool, ceiling × smallerSide)</code>,{" "}
                <code className="font-mono text-text">netPool = pool − fee</code>, and each winner is paid{" "}
                <code className="font-mono text-text">stake × (netPool / winningSidePool)</code>.
              </p>
              <p>
                <strong className="text-text">Why the ceiling:</strong> the smaller side <em>is</em> the prize — it is
                all the money the winners can win. An uncapped percentage-of-pool fee on a lopsided poll grows{" "}
                <em>bigger than the whole prize</em>, so the balance comes out of the winners&apos; own returned
                stakes and a correct call loses money. Capping the fee below the prize makes that arithmetically
                impossible. At a third, winners always keep at least twice what we take.
              </p>
              <p>
                <strong className="text-text">No cliff:</strong> &ldquo;the full {(config.commissionRate * 100).toFixed(0)}% whenever the smaller side is
                ≥ {(config.commissionRate / config.feeCeilingRate * 100).toFixed(0)}% of the pool&rdquo; and &ldquo;never more than{" "}
                {(config.feeCeilingRate * 100).toFixed(1)}% of the smaller side&rdquo; are the <em>same rule</em>. They cross over
                seamlessly — <code className="font-mono">min()</code> finds the seam by itself, so there is no threshold to game.
              </p>
              <p>
                <strong className="text-text">Rates stick to the poll.</strong> A poll freezes these rates when it is created.
                Changing anything here affects <strong>future polls only</strong> — it cannot reprice a bet that has
                already been placed.
              </p>
            </div>
          </div>
        </AdminCard>

        {/* The simulator — see a rate change before you save it. */}
        <AdminCard
          title="Fee simulator"
          sw="Kijaribio cha ada"
          action={
            <span className="font-mono text-[10px] tracking-[0.10em] uppercase text-text-tertiary">
              runs the real payout function
            </span>
          }
        >
          <FeeSimulator config={config} />
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
              <ScrollX label="Market overrides" className="rounded-md border border-border">
                <table className="admin-tbl">
                  <thead className="border-b border-border bg-bg-overlay">
                    <tr className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">
                      <th className="text-left p-3">Market</th>
                      <th className="text-left p-3">Fee ceiling</th>
                      <th className="text-left p-3">Commission</th>
                      <th className="text-left p-3">Stake bounds</th>
                      <th className="text-right p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-text-muted">
                    {overridesPage.map(({ marketId, over }) => {
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
                            {over.feeCeilingRate !== undefined ? `${(over.feeCeilingRate * 100).toFixed(1)}%` : "—"}
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
              </ScrollX>
            )}
            {overrides.length > 0 && <AdminPagination total={overrides.length} page={oPage} baseHref={oBase} param="opage" />}
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
            <ScrollX label="Config changes">
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
            </ScrollX>
          )}
        </AdminCard>

        <AdminCard className="border-warning-border bg-warning-bg/15">
          <div className="flex items-start gap-3">
            <I.alertCircle s={18} />
            <div className="text-caption text-text-secondary">
              <p className="text-text font-bold">Live polls keep the rates they were created with</p>
              <p>
                A rate change applies to <strong>future polls only</strong>. Every poll freezes the rates above onto
                itself the moment it is created (its <code className="font-mono">feeSnapshot</code>), and settlement,
                cash-out and every payout preview read that frozen copy — never these live values. Predictors are
                settled at the rates they signed up for.
              </p>
              <p className="text-text-tertiary">
                This panel used to make exactly this promise while the code did the opposite: settlement read the
                live config, so retuning a rate here silently repriced bets that had <strong>already been placed</strong>.
                The promise is now enforced by the data model rather than asserted by this paragraph.
              </p>
            </div>
          </div>
        </AdminCard>


      </div>
    </>
  );
}
