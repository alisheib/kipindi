import { AdminPageHead, AdminCard, AdminKpi } from "@/components/admin/admin-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollX } from "@/components/ui/scroll-x";
import { listAssets, listChains, getUpDownConfig, ALLOWED_DURATIONS, resolveScheduledMarginBps } from "@/lib/server/updown-config";
// E-46: the Add-asset form is driven by the catalogue, so a symbol/category pair that
// cannot work is not offerable. The server enforces the same rule in `createAsset`.
import { SYMBOL_CATALOGUE } from "@/lib/server/updown-symbols";
// E-36 — a shut market must be VISIBLY shut. A wall of VOIDs looks identical whether the
// market is closed or the feed is broken, and that ambiguity is what E-16/E-25/E-32 all cost.
import { marketSessionAt, nextOpenAfter } from "@/lib/server/market-calendar";
import { observationStore, roundStore } from "@/lib/server/updown-dal";
import { poolFee } from "@/lib/payout";
import { formatTzs } from "@/lib/utils";
import { moneyByGame } from "@/lib/server/report-money";
import { resolveRange } from "@/lib/server/date-range";
import { DateTimeRangeFilter } from "@/components/ui/datetime-range-filter";
import { featureCostWindows } from "@/lib/server/ai-usage";
import {
  AddAssetForm, AddChainForm, ToggleAsset, ChainStateControls, ThresholdsForm, ReadingMethodForm,
  // E-31 — both of these had ZERO callers until 2026-08-02, so the price source real money
  // settles against, and a chain's winning margin, were not editable through the product.
  EditAssetForm, EditChainForm,
} from "./updown-controls";
import { currentSession } from "@/lib/server/auth-service";
import { canUseControl, CONTROL_DOMAIN } from "@/lib/server/control-gates";
import { ControlLocked } from "@/components/admin/control-locked";

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

export default async function AdminUpDownPage({ searchParams }: { searchParams: Promise<{ range?: string; from?: string; to?: string }> }) {
  const sp = await searchParams;
  // The economics card's window — presets + custom date+hour+minute, EAT-safe (default 30d).
  const range = resolveRange(sp, Date.now(), "30d");
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

  // Per-chain void rate — how often a chain's recently-resolved rounds refunded (the
  // price moved less than the margin). Read-only sample of the last rounds; a chain with
  // no resolved rounds shows "—". This is the lever's feedback: a high void rate means the
  // margin is too wide for that asset/duration. Chains are few, so N+1 reads are fine here.
  const VOID_SAMPLE = 50;
  const chainStats = new Map(
    await Promise.all(
      chains.map(async (c) => {
        const rounds = await roundStore.list({ chainId: c.id, limit: VOID_SAMPLE }).catch(() => []);
        const resolved = rounds.filter((r) => r.outcome != null);
        const voids = resolved.filter((r) => r.outcome === "VOID").length;
        return [c.id, { resolved: resolved.length, voids, rate: resolved.length ? voids / resolved.length : null }] as const;
      }),
    ),
  );

  // ── E-32 · the margin a chain is ACTUALLY priced at ────────────────────────
  // Three helpers rather than one expression, because the grid needs two different
  // answers and conflating them is how the old cell came to lie. `scheduledFor` is
  // "what the ladder says for this class+duration" (null if no rung covers it);
  // `inheritedMarginBps` is what an EMPTY override box would inherit, and it is what the
  // Edit form's placeholder must show; `effectiveMarginBps` is what the engine will freeze.
  const scheduledFor = (c: { assetId: string; durationMinutes: number }) => {
    const a = assetById.get(c.assetId);
    return a ? resolveScheduledMarginBps(cfg, a.category, c.durationMinutes) : null;
  };
  const inheritedMarginBps = (c: { assetId: string; durationMinutes: number }) =>
    scheduledFor(c) ?? cfg.defaultMarginBps;
  const effectiveMarginBps = (c: { assetId: string; durationMinutes: number; marginBps: number | null }) =>
    c.marginBps ?? inheritedMarginBps(c);

  // ── E-36 · is this chain's market trading RIGHT NOW? ───────────────────────
  // Read at render time, from the same pure function the money path uses — never a second
  // copy of the calendar, or the console and the engine could disagree about whether a
  // chain can run, which is the worst possible thing for an operator to be unsure of.
  const nowIso = new Date().toISOString();
  const sessionOf = (c: { assetId: string }) => {
    const a = assetById.get(c.assetId);
    if (!a) return null;
    const v = marketSessionAt(a.category, nowIso);
    return { ...v, nextOpen: v.open ? null : nextOpenAfter(a.category, nowIso) };
  };

  const feePreview = poolFee(FEE_PREVIEW_POOL / 2, FEE_PREVIEW_POOL / 2, cfg.defaultRateProfile, "YES");

  // This game's OWN economics — 30-day money split (Up & Down only) + its own AI spend.
  // GGR is TZS (commission we keep on this game); AI cost is USD (what the oracle spent
  // running it). Two different currencies, shown as two distinct facts — never blended.
  const EMPTY_GAME = { game: "UPDOWN" as const, stakes: 0, payouts: 0, refunds: 0, ggr: 0, holdPct: 0, bets: 0, players: 0 };
  const [byGame, aiCost] = await Promise.all([
    moneyByGame(range.start, range.end).catch(() => ({ market: EMPTY_GAME, updown: EMPTY_GAME })),
    featureCostWindows("updown").catch(() => ({ today: 0, last7: 0, last30: 0, all: 0, calls: 0 })),
  ]);
  const pnl = byGame.updown;
  const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  /**
   * ⛔ E-27. This page is `trading`; its CONFIG controls demand `accounting`, and
   * `DEFAULT_GRANTS` makes the two DISJOINT. So ask the SAME question the action will ask
   * and render a locked state instead of a control that can only bounce — the E-18 rule.
   * All five share one domain, so one question answers for all of them.
   */
  const canConfig = await canUseControl((await currentSession())?.role, "updateReadingMethod");

  return (
    <>
      <AdminPageHead
        title="Up & Down"
        sw="Juu na Chini"
        actions={canConfig ? <AddAssetForm catalogue={[...SYMBOL_CATALOGUE]} /> : <ControlLocked what="Add asset" need={CONTROL_DOMAIN.createAsset} />}
      />

      <div className="px-4 lg:px-6 py-5 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminKpi label="Enabled assets" sw="Bidhaa hai" value={String(enabledAssets.length)} delta={`${assets.length} total`} spark={false} />
          <AdminKpi label="Running chains" sw="Minyororo hai" value={String(running.length)} delta={`${chains.length} configured`} spark={false} />
          <AdminKpi label="Fee · balanced 10,000" sw="Ada" value={formatTzs(Math.round(feePreview.fee))} delta="capped-commission 13%" spark={false} />
          <AdminKpi label="Staleness window" sw="Muda wa bei" value={`${cfg.maxStalenessSeconds}s`} delta={`confidence ≥ ${cfg.confidenceThreshold}`} spark={false} />
        </div>

        {/* ── This game's economics (Up & Down ONLY) ─────────────────────────
            Sealed from the long-form polls: its own GGR, hold and turnover, beside
            its own AI spend. GGR is TZS (commission kept on this game); AI cost is
            USD (what the oracle spent) — two distinct facts, never blended. */}
        <AdminCard
          title="Up & Down economics · this game only"
          sw="Uchumi wa mchezo huu"
          action={<span className="font-mono text-[10px] tracking-[0.12em] uppercase text-text-tertiary">{range.label} · UPDOWN only</span>}
        >
          {/* This game's money over a chosen window — presets + custom date+hour+minute.
              (AI oracle cost stays on standard lookbacks — a separate spend concept.) */}
          <div className="mb-3">
            <DateTimeRangeFilter defaultPreset="30d" presetIds={["today", "yesterday", "24h", "7d", "30d", "mtd", "all"]} />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <AdminKpi label="GGR · this game" sw="Mapato" value={formatTzs(Math.round(pnl.ggr))} delta={`hold ${pnl.holdPct.toFixed(1)}%`} tone={pnl.ggr >= 0 ? "success" : "danger"} spark={false} gold />
            <AdminKpi label="Staked" sw="Zilizowekwa" value={formatTzs(Math.round(pnl.stakes))} delta={`${pnl.bets.toLocaleString()} bets`} spark={false} />
            <AdminKpi label="Paid out" sw="Zilizolipwa" value={formatTzs(Math.round(pnl.payouts))} delta={`${pnl.players.toLocaleString()} players`} spark={false} />
            <AdminKpi label="AI oracle cost" sw="Gharama ya AI" value={usd(aiCost.last30)} delta={`${aiCost.calls.toLocaleString()} calls · 90d ${usd(aiCost.all)}`} spark={false} />
          </div>
          <p className="mt-3 text-[11.5px] leading-[1.55] text-text-subtle max-w-[80ch]">
            This is <strong>Up &amp; Down alone</strong> — long-form polls are reported separately under Money → Reports.
            GGR is the commission kept on this game (TZS); AI cost is what its price oracle spent (USD). The platform&rsquo;s
            combined figures, and the TRA/GBT levy on total commission, are unchanged.
          </p>
        </AdminCard>

        {/* ── Assets ─────────────────────────────────────────────────────── */}
        <AdminCard title={`Assets · ${assets.length}`} sw="Bidhaa" padding="p-0">
          {/* The empty state renders OUTSIDE the scroll container. Inside it, the
              table's min-width would clip the message at 360px and force a sideways
              scroll to read an empty state — the "clipped-not-scrolled" bug that
              passes an automated overflow check and only shows in the screenshot. */}
          {assets.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="No assets yet"
                body="Add Gold and Silver to begin. An asset needs an approved price source before it can be enabled — a round resolves against that exact link."
              />
            </div>
          ) : (
            <ScrollX label="Up & Down assets">
              <table className="admin-tbl min-w-[640px]">
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
                          {/* E-31 · the edit form is the only way to repoint an asset's price
                              source. Same `accounting` gate as its siblings, asked the E-18 way
                              (the page asks what the action will ask) rather than shipping a
                              control that bounces. */}
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            {canConfig
                              ? <EditAssetForm
                                  id={a.id} label={a.key} symbol={a.symbol}
                                  nameEn={a.nameEn} nameSw={a.nameSw}
                                  priceSourceUrl={a.priceSourceUrl}
                                  decimals={a.decimals} minMoveTicks={a.minMoveTicks}
                                />
                              : <ControlLocked what="Edit asset" need={CONTROL_DOMAIN.updateAsset} />}
                            {canConfig
                              ? <ToggleAsset id={a.id} enabled={a.enabled} label={a.key} />
                              : <ControlLocked what={a.enabled ? "Enabled" : "Disabled"} need={CONTROL_DOMAIN.toggleAsset} />}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollX>
          )}
          <p className="px-4 pb-4 pt-3 text-[11.5px] leading-[1.55] text-text-subtle">
            An asset&rsquo;s price source must be an approved trusted source at{" "}
            <span className="font-mono text-[11px]">/admin/sources</span> — checked when it is added, when it is
            enabled, and again each time a chain starts.
          </p>
        </AdminCard>

        {/* ── Chains ─────────────────────────────────────────────────────── */}
        <AdminCard
          title={`Chains · ${running.length} running`}
          sw="Minyororo"
          padding="p-0"
          action={
            <AddChainForm
              assets={assets.filter((a) => a.enabled).map((a) => ({ id: a.id, key: a.key, nameEn: a.nameEn, category: a.category }))}
              marginSchedule={cfg.marginSchedule}
              defaultMarginBps={cfg.defaultMarginBps}
            />
          }
        >
          {chains.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="No chains configured"
                body={`A chain is one asset at one duration (${ALLOWED_DURATIONS.join(" / ")} min). It emits rounds back to back. New chains start stopped.`}
              />
            </div>
          ) : (
            <ScrollX label="Up & Down chains">
              {/* 7 columns since E-36 added Market — the min-width rises with it, or the new cell
                    squeezes the others inside the ScrollX rather than widening it (the E-30 class). */}
              <table className="admin-tbl min-w-[960px]">
                <thead>
                  <tr className="text-left font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle border-b border-border-subtle">
                    <th className="px-4 py-2.5 font-semibold">Chain</th>
                    <th className="px-4 py-2.5 font-semibold">State</th>
                    <th className="px-4 py-2.5 font-semibold">Next boundary</th>
                    <th className="px-4 py-2.5 font-semibold">Market</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Margin</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Void rate</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Stake bounds</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Controls</th>
                  </tr>
                </thead>
                <tbody>
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
                        {/* E-36 · the market's own calendar, not the chain's state. A RUNNING
                            chain on a shut market opens nothing and settles nothing — and
                            without this cell that reads as a broken feed. */}
                        <td className="px-4 py-3 font-mono text-[11.5px] whitespace-nowrap">
                          {(() => {
                            const s = sessionOf(c);
                            if (!s) return <span className="text-text-faint">—</span>;
                            if (s.open) return <span className="text-text-muted">open</span>;
                            return (
                              <span className="text-warning-fg" title={"detail" in s ? s.detail : undefined}>
                                closed
                                <span className="text-text-faint">
                                  {/* HH:MM, not HH:MM:SS — a market opens on the hour, and the
                                      seconds are noise next to a boundary time that needs them. */}
                                  {" "}· opens {fmtTime(s.nextOpen).replace(/:00 UTC$/, " UTC")}
                                </span>
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[11.5px] whitespace-nowrap">
                          {/* Effective winning band: this chain's override, else the E-32
                              ladder for its class and duration, else the flat default.
                              ⚠️ It MUST be the effective number. Before E-32 this cell read
                              `c.marginBps ?? cfg.defaultMarginBps` and would now print 0.50%
                              over a chain the engine actually prices at 0.02% — an operator
                              reading a margin the money path does not use. */}
                          <span className={c.marginBps != null ? "text-text-muted" : "text-text-subtle"}>
                            {(effectiveMarginBps(c) / 100).toFixed(2)}%
                          </span>
                          {c.marginBps == null && (
                            <span className="text-text-faint"> ·{scheduledFor(c) != null ? "sched" : "def"}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[11.5px] whitespace-nowrap">
                          {(() => {
                            const s = chainStats.get(c.id);
                            if (!s || s.resolved === 0) return <span className="text-text-faint">—</span>;
                            const pct = s.rate! * 100;
                            return (
                              <>
                                <span className={pct >= 40 ? "text-warning-fg" : "text-text-muted"}>{pct.toFixed(0)}%</span>
                                <span className="text-text-faint"> {s.voids}/{s.resolved}</span>
                              </>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[11.5px] text-text-muted whitespace-nowrap">
                          {c.minStake != null || c.maxStake != null
                            ? `${(c.minStake ?? cfg.defaultMinStake).toLocaleString()} – ${(c.maxStake ?? cfg.defaultMaxStake).toLocaleString()}`
                            : "inherit"}
                        </td>
                        <td className="px-4 py-3">
                          {/* E-31 · editing a chain is `trading`, the same domain as start/pause/
                              stop and as this route — so it needs no separate capability check.
                              It is the ONLY way to change a chain's margin after creation, which
                              is what E-32 needs (see EditChainForm's header). */}
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <EditChainForm
                              id={c.id} label={label}
                              minStake={c.minStake} maxStake={c.maxStake}
                              marginBps={c.marginBps} inheritMarginBps={inheritedMarginBps(c)}
                            />
                            <ChainStateControls id={c.id} state={c.state} label={label} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollX>
          )}
        </AdminCard>

        {/* ── Reading method ─────────────────────────────────────────────── */}
        <AdminCard title="Price reading method" sw="Njia ya kusoma bei">
          {!canConfig ? (
            <ControlLocked what="Change the price reading method" need={CONTROL_DOMAIN.updateReadingMethod} block />
          ) : (
          <ReadingMethodForm
            observationMethod={cfg.observationMethod}
            feedProvider={cfg.feedProvider}
            // Presence only — the key itself never leaves the server, and the operator only
            // needs to know whether the selected provider can actually quote.
            twelveDataKeyPresent={Boolean(process.env.TWELVEDATA_API_KEY)}
            maxStalenessSeconds={cfg.maxStalenessSeconds}
          />
          )}
        </AdminCard>

        {/* ── Reading health ─────────────────────────────────────────────── */}
        <AdminCard title="Price readings" sw="Bei zilizosomwa">
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
          {!canConfig ? (
            <ControlLocked what="Change the thresholds" need={CONTROL_DOMAIN.updateThresholds} block />
          ) : (
            <ThresholdsForm
              maxStalenessSeconds={cfg.maxStalenessSeconds}
              confidenceThreshold={cfg.confidenceThreshold}
              maxObservationAttempts={cfg.maxObservationAttempts}
              defaultMinStake={cfg.defaultMinStake}
              defaultMaxStake={cfg.defaultMaxStake}
              defaultMarginBps={cfg.defaultMarginBps}
            />
          )}
        </AdminCard>
      </div>
    </>
  );
}
