import { AdminPageHead, AdminCard, AdminKpi } from "@/components/admin/admin-shell";
import { AdminTableEmpty } from "@/components/admin/admin-table-empty";
import { ScrollX } from "@/components/ui/scroll-x";
import { listAssets, listChains, getUpDownConfig, ALLOWED_DURATIONS } from "@/lib/server/updown-config";
import { observationStore } from "@/lib/server/updown-dal";
import { poolFee } from "@/lib/payout";
import { formatTzs } from "@/lib/utils";
import { AddAssetForm, AddChainForm, ToggleAsset, ChainStateControls, ThresholdsForm } from "./updown-controls";

export const metadata = { title: "Admin · Up & Down" };
export const dynamic = "force-dynamic";

/** A balanced TZS 10,000 pool, priced through the REAL fee function — so the number
 *  shown to the operator is the number settlement will charge, not a restatement of
 *  it that can drift. */
const FEE_PREVIEW_POOL = 10_000;

/** Time-of-day only; a boundary is always today or within the hour. */
function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toISOString().slice(11, 19) + " UTC" : "—";
}

export default async function AdminUpDownPage() {
  const [assets, chains, cfg] = await Promise.all([
    listAssets().catch(() => []),
    listChains().catch(() => []),
    getUpDownConfig(),
  ]);

  const enabledAssets = assets.filter((a) => a.enabled);
  const running = chains.filter((c) => c.state === "RUNNING");
  const assetById = new Map(assets.map((a) => [a.id, a]));

  // Oracle health, per enabled asset — the most recent observation and its state.
  // Read-only; if it throws we show nothing rather than a fabricated reading.
  const oracle = await Promise.all(enabledAssets.map(async (a) => {
    const recent = await observationStore.list({ assetId: a.id, limit: 1 }).catch(() => []);
    return { asset: a, last: recent[0] ?? null };
  }));

  const feePreview = poolFee(FEE_PREVIEW_POOL / 2, FEE_PREVIEW_POOL / 2, cfg.defaultRateProfile, "YES");

  return (
    <>
      <AdminPageHead
        title="Up & Down"
        sw="Juu na Chini"
        period={false}
        actions={<AddAssetForm />}
      />

      <div className="px-4 lg:px-6 py-5 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminKpi label="Enabled assets" sw="Bidhaa hai" value={String(enabledAssets.length)} delta={`${assets.length} total`} spark={false} />
          <AdminKpi label="Running chains" sw="Minyororo hai" value={String(running.length)} delta={`${chains.length} configured`} spark={false} />
          <AdminKpi label="Fee · balanced 10,000" sw="Ada" value={formatTzs(Math.round(feePreview.fee))} delta="capped-commission 13%" spark={false} />
          <AdminKpi label="Staleness window" sw="Muda wa bei" value={`${cfg.maxStalenessSeconds}s`} delta={`confidence ≥ ${cfg.confidenceThreshold}`} spark={false} />
        </div>

        {/* ── Assets ─────────────────────────────────────────────────────── */}
        <AdminCard
          title={`Assets · ${assets.length}`}
          sw="Bidhaa"
          padding="p-0"
          action={
            <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-text-tertiary">
              source must be approved at /admin/sources
            </span>
          }
        >
            <ScrollX label="Up & Down assets">
              <table className="w-full min-w-[640px] text-[12.5px]">
                <thead>
                  <tr className="text-left font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle border-b border-border-subtle">
                    <th className="px-4 py-2.5 font-semibold">Key</th>
                    <th className="px-4 py-2.5 font-semibold">Name</th>
                    <th className="px-4 py-2.5 font-semibold">Source</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Precision</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Chains</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Enabled</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.length === 0 && (
                    <AdminTableEmpty
                      colSpan={6}
                      title="No assets yet"
                      body="Add Gold and Silver to begin. An asset needs an approved price source before it can be enabled — a round resolves against that exact link."
                    />
                  )}
                  {assets.map((a) => {
                    const mine = chains.filter((c) => c.assetId === a.id);
                    const live = mine.filter((c) => c.state === "RUNNING").length;
                    return (
                      <tr key={a.id} className="border-b border-border-subtle/60 last:border-0">
                        <td className="px-4 py-3 font-mono font-bold text-text whitespace-nowrap">{a.key}</td>
                        <td className="px-4 py-3">
                          <div className="text-text">{a.nameEn}</div>
                          <div className="font-mono text-[10.5px] text-text-subtle">{a.symbol} · {a.nameSw}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-mono text-[11px] text-text-muted">{a.sourceDomain}</div>
                          <div className="font-mono text-[10px] text-text-subtle">{a.category}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[11.5px] text-text-muted whitespace-nowrap">
                          {a.decimals} dp · min {a.minMoveTicks}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[11.5px] text-text-muted whitespace-nowrap">
                          {live}/{mine.length}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <ToggleAsset id={a.id} enabled={a.enabled} label={a.key} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollX>
        </AdminCard>

        {/* ── Chains ─────────────────────────────────────────────────────── */}
        <AdminCard
          title={`Chains · ${running.length} running`}
          sw="Minyororo"
          padding="p-0"
          action={<AddChainForm assets={assets.filter((a) => a.enabled).map((a) => ({ id: a.id, key: a.key, nameEn: a.nameEn }))} />}
        >
            <ScrollX label="Up & Down chains">
              <table className="w-full min-w-[620px] text-[12.5px]">
                <thead>
                  <tr className="text-left font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle border-b border-border-subtle">
                    <th className="px-4 py-2.5 font-semibold">Chain</th>
                    <th className="px-4 py-2.5 font-semibold">State</th>
                    <th className="px-4 py-2.5 font-semibold">Next boundary</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Stake bounds</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Controls</th>
                  </tr>
                </thead>
                <tbody>
                  {chains.length === 0 && (
                    <AdminTableEmpty
                      colSpan={5}
                      title="No chains configured"
                      body={`A chain is one asset at one duration (${ALLOWED_DURATIONS.join(" / ")} min). It emits rounds back to back. New chains start stopped.`}
                    />
                  )}
                  {chains.map((c) => {
                    const a = assetById.get(c.assetId);
                    const label = `${a?.key ?? "?"} ${c.durationMinutes}m`;
                    return (
                      <tr key={c.id} className="border-b border-border-subtle/60 last:border-0">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-mono font-bold text-text">{label}</div>
                          <div className="font-mono text-[10.5px] text-text-subtle">{a?.nameEn ?? "unknown asset"}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              "chip " +
                              (c.state === "RUNNING" ? "chip-live" : c.state === "PAUSED" ? "chip-pending" : "chip-pending opacity-70")
                            }
                          >
                            {c.state === "RUNNING" && <span className="live-dot" />}
                            {c.state}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11.5px] text-text-muted whitespace-nowrap">
                          {fmtTime(c.nextBoundaryAt)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[11.5px] text-text-muted whitespace-nowrap">
                          {c.minStake != null || c.maxStake != null
                            ? `${(c.minStake ?? cfg.defaultMinStake).toLocaleString()} – ${(c.maxStake ?? cfg.defaultMaxStake).toLocaleString()}`
                            : "inherit"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <ChainStateControls id={c.id} state={c.state} label={label} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollX>
        </AdminCard>

        {/* ── Oracle health ──────────────────────────────────────────────── */}
        <AdminCard title="Price oracle" sw="Chanzo cha bei">
          {oracle.length === 0 ? (
            <p className="text-[12px] text-text-tertiary">Enable an asset to see its price readings here.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {oracle.map(({ asset, last }) => (
                <div key={asset.id} className="rounded-lg border border-border bg-[var(--bg-inset)] p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-text-muted">{asset.key}</span>
                    <span
                      className={
                        "chip " +
                        (!last ? "chip-pending"
                          : last.state === "CONFIRMED" ? "chip-resolved"
                          : last.state === "FAILED" ? "chip-hot-rose"
                          : "chip-pending")
                      }
                    >
                      {last?.state ?? "NO READINGS"}
                    </span>
                  </div>
                  {/* Real data or nothing: with no confirmed reading we show an em-dash,
                      never a zero and never a stale figure presented as current. */}
                  <div className="mt-2 font-mono text-[17px] font-bold tabular-nums text-text">
                    {last?.price != null ? `$${last.price.toLocaleString("en-US", { minimumFractionDigits: asset.decimals, maximumFractionDigits: asset.decimals })}` : "—"}
                  </div>
                  <div className="mt-1 font-mono text-[10.5px] text-text-subtle">
                    {last?.sourceQuotedAt
                      ? `source quoted ${fmtTime(last.sourceQuotedAt)}`
                      : "awaiting a confirmed reading"}
                  </div>
                  {last && last.attempts > 0 && last.state !== "CONFIRMED" && (
                    <div className="mt-1 font-mono text-[10.5px] text-warning-fg">
                      {last.attempts} attempt{last.attempts === 1 ? "" : "s"}
                      {last.failReason ? ` · ${last.failReason}` : ""}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-[11.5px] leading-[1.55] text-text-subtle max-w-[80ch]">
            A reading is stored once per asset per grid boundary and shared by every round meeting at that instant, so a
            round&rsquo;s closing price is the next round&rsquo;s opening price exactly. The time shown is the one the
            source itself published, not our boundary.
          </p>
        </AdminCard>

        {/* ── Thresholds ─────────────────────────────────────────────────── */}
        <AdminCard title="Thresholds" sw="Vigezo">
          <ThresholdsForm
            maxStalenessSeconds={cfg.maxStalenessSeconds}
            confidenceThreshold={cfg.confidenceThreshold}
            maxObservationAttempts={cfg.maxObservationAttempts}
            defaultMinStake={cfg.defaultMinStake}
            defaultMaxStake={cfg.defaultMaxStake}
          />
        </AdminCard>
      </div>
    </>
  );
}
