import { AdminPageHead, AdminCard, AdminKpi } from "@/components/admin/admin-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollX } from "@/components/ui/scroll-x";
import { listAssets, listChains, getUpDownConfig, abandonAfterSeconds } from "@/lib/server/updown-config";
import { roundStore } from "@/lib/server/updown-dal";
import { marketStore } from "@/lib/server/market-dal";
import { currentSession } from "@/lib/server/auth-service";
import { canUseControl, CONTROL_DOMAIN } from "@/lib/server/control-gates";
import { ControlLocked } from "@/components/admin/control-locked";
import { VoidRoundControl } from "./void-round-control";
import { formatTzs } from "@/lib/utils";

export const metadata = { title: "Admin · Up & Down · Rounds" };
export const dynamic = "force-dynamic";

const fmt = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toISOString().slice(5, 16).replace("T", " ") + "Z" : "—";
};

/**
 * Round explorer for the sealed Up & Down section — every recent round across all
 * chains, with its price story (open → close), outcome, and the money on it. This is
 * the operator's audit view of the game: what resolved, how it moved, what it earned.
 */
export default async function AdminUpDownRoundsPage() {
  const [assets, chains] = await Promise.all([listAssets().catch(() => []), listChains().catch(() => [])]);
  const assetById = new Map(assets.map((a) => [a.id, a]));
  const chainById = new Map(chains.map((c) => [c.id, c]));

  // E-18's lesson, applied rather than repeated: this route is `trading`, but voiding a
  // round hands real money back and is therefore `compliance` (control-gates.ts). Ask
  // the SAME question the action will ask, and render a read-only state instead of a
  // control that bounces — a refused click writes a SECURITY privilege_escalation_blocked
  // row against a legitimate operator.
  const session = await currentSession();
  const canVoidRound = await canUseControl(session?.role, "voidUpDownRound");

  // The self-healer's deadline (E-24), so the "overdue" flag on this page and the
  // guarantee the engine actually makes are one number, never two.
  const cfg = await getUpDownConfig().catch(() => null);
  const overdueMs = (cfg ? abandonAfterSeconds(cfg) : 390) * 1000;

  // Most recent rounds across ALL chains (≤6 chains → a handful of bounded queries).
  const perChain = await Promise.all(chains.map((c) => roundStore.list({ chainId: c.id, limit: 30 }).catch(() => [])));
  const rounds = perChain.flat().sort((a, b) => b.boundaryAt.localeCompare(a.boundaryAt)).slice(0, 60);

  const enriched = await Promise.all(
    rounds.map(async (r) => {
      const m = await marketStore.get(r.marketId).catch(() => null);
      const chain = chainById.get(r.chainId);
      const asset = chain ? assetById.get(chain.assetId) : undefined;
      return {
        r,
        asset,
        durationMinutes: chain?.durationMinutes ?? 0,
        volume: m ? m.yesPool + m.noPool : 0,
        players: m?.predictorCount ?? 0,
        decimals: asset?.decimals ?? 2,
      };
    }),
  );

  const settled = enriched.filter((e) => e.r.settledAt).length;
  const voided = enriched.filter((e) => e.r.outcome === "VOID").length;
  const totalVol = enriched.reduce((s, e) => s + e.volume, 0);
  // A round past the healer's deadline and still unresolved is the E-24 symptom
  // recurring. It gets its own KPI because "one stuck round" is invisible in a list
  // of sixty, and it is the one number on this page that means money is not moving.
  const now = Date.now();
  const stuck = enriched.filter((e) => !e.r.resolvedAt && now - Date.parse(e.r.boundaryAt) >= overdueMs);
  const stuckMoney = stuck.reduce((s, e) => s + e.volume, 0);

  const usd = (n: number, d: number) => (n == null ? "—" : `$${n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })}`);

  return (
    <>
      <AdminPageHead title="Up & Down · Rounds" sw="Raundi za Juu na Chini" />
      <div className="px-4 lg:px-6 py-5 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminKpi label="Settled" sw="Zimekamilika" value={String(settled)} delta={`of ${enriched.length} shown`} spark={false} />
          <AdminKpi label="Turnover shown" sw="Mzunguko" value={formatTzs(totalVol)} spark={false} />
          <AdminKpi label="Voided" sw="Batili" value={String(voided)} delta={voided > 0 ? "refunded in full" : "none"} spark={false} />
          <AdminKpi
            label="Overdue"
            sw="Zimechelewa"
            value={String(stuck.length)}
            delta={stuck.length > 0 ? `${formatTzs(stuckMoney)} not moving` : "none — all closed on time"}
            spark={false}
          />
        </div>

        {stuck.length > 0 && (
          <AdminCard title="Rounds past their deadline" sw="Raundi zilizochelewa" padding="p-4">
            <p className="text-[12.5px] leading-[1.6] text-text-muted">
              {stuck.length === 1 ? "One round has" : `${stuck.length} rounds have`} passed their price boundary
              by more than {Math.round(overdueMs / 1000)}s without reaching a verdict, holding{" "}
              <strong className="text-text">{formatTzs(stuckMoney)}</strong> of player stakes. The platform closes
              and refunds these automatically within that window, so seeing one here means the automatic recovery
              is not running — check the lifecycle ticker before voiding by hand.
            </p>
          </AdminCard>
        )}

        <AdminCard title={`Rounds · ${enriched.length}`} sw="Raundi" padding="p-0">
          {enriched.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="No rounds yet"
                body="Rounds appear here once a chain is running. Start one from the Overview."
              />
            </div>
          ) : (
            <ScrollX label="Up & Down rounds">
              <table className="admin-tbl min-w-[1020px]">
                <thead>
                  <tr className="text-left font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle border-b border-border-subtle">
                    <th className="px-4 py-2.5 font-semibold">Round</th>
                    <th className="px-4 py-2.5 font-semibold">Window (UTC)</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Open → Close</th>
                    <th className="px-4 py-2.5 font-semibold">Outcome</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Volume</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Players</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Settled</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Remedy</th>
                  </tr>
                </thead>
                <tbody>
                  {enriched.map(({ r, asset, durationMinutes, volume, players, decimals }) => {
                    const moved = r.openPrice != null && r.closePrice != null ? r.closePrice - r.openPrice : null;
                    return (
                      <tr key={r.id} className="border-b border-border-subtle/60 last:border-0">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-mono font-bold text-text">{asset?.key ?? "?"} {durationMinutes}m #{r.roundNumber}</div>
                          <div className="font-mono text-[10.5px] text-text-subtle">{asset?.nameEn ?? "unknown"}</div>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-text-muted whitespace-nowrap">
                          {fmt(r.opensAt)} → {fmt(r.closesAt)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[11.5px] tabular-nums whitespace-nowrap"
                            style={{ color: moved == null ? "var(--text-muted)" : moved > 0 ? "var(--yes-300)" : moved < 0 ? "var(--no-300)" : "var(--text-muted)" }}>
                          {usd(r.openPrice as number, decimals)} → {usd(r.closePrice as number, decimals)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={"chip " + (r.outcome === "UP" ? "chip-yes" : r.outcome === "DOWN" ? "chip-no" : r.outcome === "VOID" ? "chip-pending" : "chip-pending")}>
                            {r.outcome ?? (r.resolvedAt ? "—" : "PENDING")}
                            {r.outcome === "VOID" && r.voidReason ? ` · ${r.voidReason}` : ""}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[11.5px] tabular-nums text-text-muted">{formatTzs(volume)}</td>
                        <td className="px-4 py-3 text-right font-mono text-[11.5px] tabular-nums text-text-muted">{players}</td>
                        <td className="px-4 py-3 text-right font-mono text-[10.5px] text-text-subtle whitespace-nowrap">{r.settledAt ? fmt(r.settledAt) : "—"}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {/* The lever exists ONLY where it can do something: an unsettled
                              round. Offering it on a settled one would be a button that
                              always refuses — the very defect E-18 is about. */}
                          {r.settledAt ? (
                            <span className="font-mono text-[10.5px] text-text-subtle">—</span>
                          ) : canVoidRound ? (
                            <VoidRoundControl
                              roundId={r.id}
                              label={`${asset?.key ?? "?"} ${durationMinutes}m #${r.roundNumber}`}
                              volume={formatTzs(volume)}
                              players={players}
                            />
                          ) : (
                            <ControlLocked what="Void & refund" need={CONTROL_DOMAIN.voidUpDownRound} />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollX>
          )}
        </AdminCard>
        <p className="text-[11.5px] leading-[1.55] text-text-subtle">
          Each round is a settled or in-flight price market. Open and close prices are read from the asset&rsquo;s approved
          source at the round&rsquo;s grid boundaries; a round that could not confirm a price VOIDs and refunds every stake
          in full. Full per-round proof (both source links + quoted times) is on each round&rsquo;s market page.
          Every round reaches a verdict — or a full refund — within {Math.round(overdueMs / 1000)}s of its boundary,
          automatically; <em>Void &amp; refund</em> is the manual remedy for when it has not.
        </p>
      </div>
    </>
  );
}
