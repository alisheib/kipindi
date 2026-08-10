import { AdminPageHead, AdminCard, AdminKpi } from "@/components/admin/admin-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollX } from "@/components/ui/scroll-x";
import { listAssets, listChains, getUpDownConfig, ALLOWED_DURATIONS, resolveScheduledMarginBps } from "@/lib/server/updown-config";
// E-46: the Add-asset form is driven by the catalogue, so a symbol/category pair that
// cannot work is not offerable. The server enforces the same rule in `createAsset`.
import { SYMBOL_CATALOGUE, symbolReadiness, readinessMark, findSymbol } from "@/lib/server/updown-symbols";
// E-36 — a shut market must be VISIBLY shut. A wall of VOIDs looks identical whether the
// market is closed or the feed is broken, and that ambiguity is what E-16/E-25/E-32 all cost.
import { marketSessionAt, nextOpenAfter } from "@/lib/server/market-calendar";
// ⭐ E-84 / the dynamic gate — each asset's measured record, and the advice derived from it.
import { feedAdviceLookup } from "@/lib/server/updown-feed-history";
import { playbookLookup, toReadinessAdvice } from "@/lib/server/updown-playbook-store";
import { MIN_SAMPLES_FOR_ADVICE } from "@/lib/server/updown-feed-advice";
import { observationStore, roundStore } from "@/lib/server/updown-dal";
// E-90 · the pools decide whether a decided round actually paid anybody.
import { marketStore } from "@/lib/server/market-dal";
import { summariseRounds, chainHealth } from "@/lib/server/updown-chain-stats";
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
  const [assets, chains, cfg, feed, book] = await Promise.all([
    listAssets().catch(() => []),
    listChains().catch(() => []),
    getUpDownConfig(),
    // ⭐ THE ASSETS' OWN MEASURED RECORD, loaded ONCE for the whole page. It drives the ①②③ on
    // every duration in the Add-chain form and the record column in the asset table, and it is
    // the same lookup `createChain` refuses with — so the console cannot grey what the server
    // would accept, or offer what it would refuse. Degrades to a zeroed record (which reads as
    // UNMEASURED, never as healthy) rather than taking the page down.
    feedAdviceLookup().catch(() => null),
    // ⭐ THE THIRD ADVICE SOURCE — the provider's own tape. Loaded here, beside the other two,
    // so every duration option, the asset dropdown and the server's own refusal all read one
    // answer. ⛔ Degrades to null rather than taking the page down: a console that will not
    // render is worse than one that cannot say whether an asset was measured.
    playbookLookup().catch(() => null),
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

  // ── Per-chain health: the DECISIVE rate, and the voids split BY REASON ─────
  //
  // ⛔ WHY THIS IS NOT ONE PERCENTAGE (campaign finding E-58, 2026-08-04). This cell used
  // to read `voids / resolved` over "the last 50 rounds", discarding `voidReason` entirely.
  // Two completely different failures therefore rendered as the same amber number:
  //
  //   `source-failed`  WE could not read a price. That is OUR bug, and on production SOL
  //                    was 290 of 290 rounds — a chain that has never once paid anyone.
  //   `no-move`        The price genuinely did not travel far enough. That is the MARGIN,
  //                    an operator lever, and it is working as designed.
  //   `operator`       A human voided it. On production 1,154 of XAU's voids are a single
  //                    July remediation — counting those as product failure is exactly how
  //                    a healthy margin got misdiagnosed as "voids every round it runs".
  //
  // An operator shown one blended number cannot tell "the feed is broken" from "the band is
  // wide" from "we refunded a batch last month", and those need opposite responses.
  //
  // ⚠️ AND THE WINDOW IS NOW TIME-BASED, NOT COUNT-BASED. 50 rounds on a busy 5-minute chain
  // is ~4 hours; on a stopped chain it can be weeks. Two chains were never answering the
  // same question. `boundaryFrom` makes them comparable.
  const STATS_WINDOW_DAYS = 7;
  const STATS_CAP = 600; // bounds one chain's read; `truncated` says so rather than lying
  const statsFrom = new Date(Date.now() - STATS_WINDOW_DAYS * 86_400_000).toISOString();
  const chainStats = new Map(
    await Promise.all(
      chains.map(async (c) => {
        const rounds = await roundStore
          .list({ chainId: c.id, boundaryFrom: statsFrom, limit: STATS_CAP })
          .catch(() => []);
        // ⭐ E-90 · WHETHER A ROUND PAID ANYONE IS A FACT ABOUT ITS POOLS, NOT ITS OUTCOME.
        // A round that decided UP with nobody on DOWN refunds every stake: no winner, no
        // fee. The cell headed "Paid a winner" counted those as paid, and on the freshly
        // built board it read `100% 2/2 paid` over one paid round and one refunded one.
        // One query for the window's pools, not one per round.
        const pools = await marketStore
          .poolsByIds(rounds.map((r) => r.marketId))
          .catch(() => new Map<string, { yesPool: number; noPool: number }>());
        const withPools = rounds.map((r) => {
          const p = pools.get(r.marketId);
          // ⛔ A MISSING MARKET IS NOT AN EMPTY POOL. Absent → counted as two sides, so a
          // read failure understates the problem rather than inventing one.
          const sides = !p ? 2 : ((p.yesPool > 0 ? 1 : 0) + (p.noPool > 0 ? 1 : 0)) as 0 | 1 | 2;
          return { outcome: r.outcome, voidReason: r.voidReason, sides };
        });
        // ONE reducer, in a tested module — not a second copy of the rule living in JSX.
        return [c.id, { ...summariseRounds(withPools), truncated: rounds.length >= STATS_CAP }] as const;
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
    const v = marketSessionAt(a.category, nowIso, book?.book(a.symbol).deadHoursUtc);
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
        actions={canConfig ? (
          // ⭐ Each catalogued symbol carries its ①②③ and its reason, computed on the server
          // by the SAME function `createAsset`/`createChain` refuse with — so the picker cannot
          // offer something the server will reject, and cannot grey something it would accept.
          <AddAssetForm
            catalogue={SYMBOL_CATALOGUE.map((s) => {
              const r = symbolReadiness(s);
              return {
                ...s,
                mark: readinessMark(r.level),
                readinessLevel: r.level,
                readinessReason: [
                  s.minDurationMinutes ? `Runs at ${s.minDurationMinutes} minutes or longer only.` : "",
                  r.reason,
                ].filter(Boolean).join(" "),
              };
            })}
          />
        ) : <ControlLocked what="Add asset" need={CONTROL_DOMAIN.createAsset} />}
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
              <table className="admin-tbl min-w-[820px]">
                <thead>
                  <tr className="text-left font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle border-b border-border-subtle">
                    <th className="px-4 py-2.5 font-semibold">Key</th>
                    <th className="px-4 py-2.5 font-semibold">Name</th>
                    <th className="px-4 py-2.5 font-semibold">Source</th>
                    {/* ⭐ WHAT THE GATE IS REASONING FROM. The Add-chain form greys durations on
                        this record, so an operator who cannot see it is being refused by a
                        number they have no way to look at. */}
                    <th className="px-4 py-2.5 font-semibold">Feed record</th>
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
                        {/* ⭐ THE MEASURED RECORD — the same numbers the duration gate reasons
                            from, in the same units it states them in. ⛔ Below the sample floor
                            it says NOT MEASURED and shows no median: two readings produce one as
                            readily as two thousand, and on screen the two look identical (A-5).
                            The advised minimum is shown when there is one, because "we advise
                            5 minutes or more" is the sentence an operator can act on. */}
                        <td className="px-4 py-3">
                          {(() => {
                            const rec = feed?.record(a.key);
                            const advice = feed?.advise(a.key);
                            if (!rec || rec.history.readings === 0) {
                              return <div className="font-mono text-[11px] text-text-subtle">no readings yet</div>;
                            }
                            const h = rec.history;
                            return (
                              <>
                                <div className="font-mono text-[11px] text-text-muted whitespace-nowrap">
                                  {h.readings.toLocaleString()} read{h.readings === 1 ? "" : "s"}
                                  {rec.okPct != null && <> · {rec.okPct.toFixed(0)}% ok</>}
                                </div>
                                <div className="font-mono text-[10px] text-text-subtle whitespace-nowrap">
                                  {advice?.unmeasured
                                    ? "not measured yet"
                                    : <>
                                        +{h.medianLagSeconds}s typical
                                        {advice?.advisedMinDurationMinutes != null && <> · {advice.advisedMinDurationMinutes}m+ advised</>}
                                      </>}
                                </div>
                              </>
                            );
                          })()}
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
          <p className="px-4 pb-4 pt-3 text-[11.5px] leading-[1.55] text-text-subtle max-w-[95ch]">
            An asset&rsquo;s price source must be an approved trusted source at{" "}
            <span className="font-mono text-[11px]">/admin/sources</span> — checked when it is added, when it is
            enabled, and again each time a chain starts.
            <br />
            <strong className="text-text-muted">Feed record</strong> is what this asset has actually done here, and it
            is what greys the round lengths in <em>Add chain</em>. <em>% ok</em> is how often a reading produced a
            usable price; <em>typical</em> is how long after a boundary a price became usable — a chain does not open a
            round before its price is known, so that time comes out of the betting window. Below{" "}
            {MIN_SAMPLES_FOR_ADVICE} readings an asset reads <em>not measured yet</em> and no average is shown, because
            a handful of readings produces one that looks exactly like a reliable figure.
          </p>
        </AdminCard>

        {/* ── Chains ─────────────────────────────────────────────────────── */}
        <AdminCard
          title={`Chains · ${running.length} running`}
          sw="Minyororo"
          padding="p-0"
          action={
            <AddChainForm
              assets={assets.filter((a) => a.enabled).map((a) => ({ id: a.id, key: a.key, nameEn: a.nameEn, category: a.category, symbol: a.symbol }))}
              // ⭐ Computed HERE, on the server, with the SAME `symbolReadiness` that
              // `createChain` refuses with — so a greyed option and a server refusal are one
              // answer. Computing it in the client component would drag the whole symbol
              // catalogue and the market calendar into the browser bundle.
              readinessByAsset={Object.fromEntries(
                assets.filter((a) => a.enabled).map((a) => [
                  a.id,
                  ALLOWED_DURATIONS.map((d) => {
                    // ⭐ …and the asset's OWN measured record for this duration, keyed on
                    // `a.key` exactly as `createChain` keys it.
                    const r = symbolReadiness(findSymbol(a.symbol), d, feed?.advise(a.key, d), feed?.movement(a.key, d),
                      toReadinessAdvice(book?.choice(a.symbol, d, findSymbol(a.symbol)?.minDurationMinutes ?? null)));
                    return { minutes: d, level: r.level, mark: readinessMark(r.level), reason: r.reason };
                  }),
                ]),
              )}
              // ⭐ The SYMBOL's own readiness, so the asset dropdown warns at the moment of the
              // choice. ⛔ An asset is greyed only when it is unusable at EVERY duration — gold
              // is limited, not unusable, so it stays selectable and says what the limit is.
              assetReadiness={Object.fromEntries(
                assets.filter((a) => a.enabled).map((a) => {
                  const spec = findSymbol(a.symbol);
                  const own = symbolReadiness(spec, undefined, feed?.advise(a.key), undefined,
                    toReadinessAdvice(book?.asset(a.symbol)));
                  const usable = ALLOWED_DURATIONS.filter(
                    (d) => symbolReadiness(spec, d, feed?.advise(a.key, d), feed?.movement(a.key, d),
                      toReadinessAdvice(book?.choice(a.symbol, d, spec?.minDurationMinutes ?? null))).level !== 3,
                  );
                  const level = usable.length === 0 ? 3 : own.level;
                  const limit = spec?.minDurationMinutes
                    ? `${a.key} runs at ${spec.minDurationMinutes} minutes or longer only — ${spec.minDurationWhy ?? ""}`.trim()
                    : "";
                  return [a.id, {
                    mark: readinessMark(level),
                    level,
                    // The limit is the more actionable sentence when there is one; the weekend
                    // caveat is appended so neither is lost.
                    reason: [limit, own.reason].filter(Boolean).join(" "),
                  }];
                }),
              )}
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
                    <th className="px-4 py-2.5 font-semibold text-right">Paid a winner · 7d</th>
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
                          {/* ⛔ "0.00%" IS NOT THE BAND — IT IS THE PERCENTAGE, AND AT ZERO THE
                              BAND IS THE ASSET'S OWN MINIMUM MOVE. An operator reading `0.00%`
                              reasonably concludes there is no band at all and that any movement
                              wins; the truth is $0.02 on BTC and $0.40 on gold. Print the actual
                              distance whenever the percentage rounds to nothing, or this cell is
                              the same lie the add-chain form was just fixed for. */}
                          <span className={c.marginBps != null ? "text-text-muted" : "text-text-subtle"}>
                            {effectiveMarginBps(c) === 0
                              ? `±${((a?.minMoveTicks ?? 2) * Math.pow(10, -(a?.decimals ?? 2))).toFixed(a?.decimals ?? 2)}`
                              : `${(effectiveMarginBps(c) / 100).toFixed(2)}%`}
                          </span>
                          {effectiveMarginBps(c) === 0 && (
                            <span className="text-text-faint"> ·min move</span>
                          )}
                          {c.marginBps == null && effectiveMarginBps(c) !== 0 && (
                            <span className="text-text-faint"> ·{scheduledFor(c) != null ? "sched" : "def"}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[11.5px] whitespace-nowrap">
                          {(() => {
                            const s = chainStats.get(c.id);
                            if (!s || s.resolved === 0) return <span className="text-text-faint">—</span>;
                            // ⛔ `paidRate`, NOT `decisiveRate` (E-90). Headline = how often this
                            // chain actually PAYS somebody. A round that decided with nobody on
                            // the other side refunded every stake — it decided, and it paid no
                            // one, and those must not share a number on the page that says "paid".
                            // A FEED failure outranks a low pay rate: one is an outage, the other
                            // a pricing conversation, and they must never look the same again.
                            const paidPct = s.paidRate! * 100;
                            const health = chainHealth(s);
                            const ink =
                              health === "feed-failing" ? "text-hot-rose-300"
                                : health === "low-payout" ? "text-warning-fg"
                                : "text-text-muted";
                            const parts = [
                              // ⭐ First, because it is the only entry that is neither our fault
                              // nor a pricing choice: the round worked and nobody took the other
                              // side. It is the measurement the house-float decision needs.
                              s.unmatched > 0 ? `${s.unmatched} unmatched` : null,
                              // ⛔ AND SEPARATE FROM IT (E-92). A round nobody bet on refunded
                              // nothing and paid nothing; filing it under "unmatched" tells the
                              // operator a stake came back when none was ever placed.
                              s.noBets > 0 ? `${s.noBets} no bets` : null,
                              s.noMove > 0 ? `${s.noMove} no-move` : null,
                              s.sourceFailed > 0 ? `${s.sourceFailed} source-failed` : null,
                              s.sourceMismatch > 0 ? `${s.sourceMismatch} source-mismatch` : null,
                              s.operator > 0 ? `${s.operator} operator` : null,
                              s.unknownVoid > 0 ? `${s.unknownVoid} unexplained` : null,
                            ].filter(Boolean);
                            return (
                              <>
                                <span className={ink}>{paidPct.toFixed(0)}%</span>
                                <span className="text-text-faint"> {s.paid}/{s.resolved} paid</span>
                                {parts.length > 0 && (
                                  <div className="text-text-faint text-[10.5px] leading-tight">
                                    {parts.join(" · ")}
                                  </div>
                                )}
                                {s.truncated && (
                                  <div className="text-text-faint text-[10px]">sample capped</div>
                                )}
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
