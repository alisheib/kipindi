import { AdminPageHead, AdminCard, AdminKpi } from "@/components/admin/admin-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollX } from "@/components/ui/scroll-x";
import { listAssets, listChains, getUpDownConfig, ALLOWED_DURATIONS, resolveScheduledMarginBps, boardFeeSummary } from "@/lib/server/updown-config";
// E-46: the Add-asset form is driven by the catalogue, so a symbol/category pair that
// cannot work is not offerable. The server enforces the same rule in `createAsset`.
import { SYMBOL_CATALOGUE, symbolReadiness, readinessMark, findSymbol } from "@/lib/server/updown-symbols";
// E-36 — a shut market must be VISIBLY shut. A wall of VOIDs looks identical whether the
// market is closed or the feed is broken, and that ambiguity is what E-16/E-25/E-32 all cost.
import { marketSessionAt, nextOpenAfter } from "@/lib/server/market-calendar";
// ⭐ E-84 / the dynamic gate — each asset's measured record, and the advice derived from it.
import { feedAdviceLookup } from "@/lib/server/updown-feed-history";
import { playbookLookup, toReadinessAdvice } from "@/lib/server/updown-playbook-store";
import { MIN_SAMPLES_FOR_ADVICE, chainDurationCaution } from "@/lib/server/updown-feed-advice";
import { observationStore, roundStore } from "@/lib/server/updown-dal";
// E-90 · the pools decide whether a decided round actually paid anybody.
import { marketStore } from "@/lib/server/market-dal";
import { summariseRounds, chainHealth } from "@/lib/server/updown-chain-stats";
import { poolFee } from "@/lib/payout";
import { formatTzs, formatBalancePill } from "@/lib/utils";
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
import { chainStateLabel, readingStateLabel } from "@/components/admin/status-badge";
import { AdminBody } from "@/components/admin/admin-body";
import { KpiGrid } from "@/components/admin/admin-body";

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
  const [assets, allChains, cfg, feed, book] = await Promise.all([
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
  /**
   * ⭐ ARCHIVED CHAINS LEAVE THE WORKING LIST — Jay (Gaming Board) item #3.
   *
   * The whole value of ARCHIVE is that a finished board stops competing for the operator's
   * attention, so it is filtered out of `chains` here rather than styled differently in the
   * table. ⛔ It is FETCHED, not excluded at the query — the count below has to be able to say
   * how many are filed, or "archive" would look like "vanish" and an operator would have no
   * way back to a board they filed by mistake.
   *
   * ⚠️ Players never needed a change: the board filters on `state === "RUNNING"`
   * (`updown-board.ts`), so an archived chain is invisible to them by construction, exactly as
   * STOPPED already is.
   */
  const archived = allChains.filter((c) => c.state === "ARCHIVED");
  const chains = allChains.filter((c) => c.state !== "ARCHIVED");

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

  // 🔴 THIS BLOCK ISSUED 46 CONCURRENT QUERIES (DG-A-01's gate, 2026-08-29). It was
  // `Promise.all(chains.map(...))` with a `roundStore.list` AND a `poolsByIds` inside — and
  // production carries **23 chains**, so one render fired 46 round-trips, plus 7 more for the
  // oracle strip. `market-dal.ts` already records what that shape costs, in the leaderboard
  // comment: *"making an N+1 parallel does not remove it, it just points all of it at the
  // connection pool at once."*
  // 📐 MEASURED on production, best of two, floor `/admin/roles` = 263 ms: this page read
  // **11,045 ms** against a 5,000 ms budget, while the other 37 admin routes ran 241–2,267 ms.
  // It was 25× the median console route and NOTHING WAS WATCHING IT — the load gate timed
  // three hand-picked pages. ⛔ And it is not the window: `?range=today` and `?range=30d`
  // measured within 600 ms of each other.
  // ⭐ Two bulk reads instead. `roundStore.list` already accepts `chainIds` in both the
  // in-memory and the Prisma store, and `poolsByIds` was always a bulk primitive — it was
  // simply being called once per chain.
  const chainIds = chains.map((c) => c.id);
  // The per-chain cap is the contract ("sample capped"), so the global cap is its multiple —
  // ⛔ never a flat number, which would let one busy chain starve the other 22 of their rows.
  const GLOBAL_STATS_CAP = STATS_CAP * Math.max(1, chainIds.length);
  const allRounds = chainIds.length
    ? await roundStore.list({ chainIds, boundaryFrom: statsFrom, limit: GLOBAL_STATS_CAP }).catch(() => [])
    : [];
  // ⚠️ If the GLOBAL cap bit, no chain's sample can be promised complete, so EVERY chain is
  // flagged. Over-disclosing "sample capped" is the safe direction; under-disclosing is how a
  // partial sample gets read as a health verdict.
  const globallyTruncated = allRounds.length >= GLOBAL_STATS_CAP;
  // ⛔ CHUNKED. 23 chains × 600 is up to 13,800 ids, and one `IN` list that long is a new
  // problem in place of the old one. Rounds own one market each, so there are no duplicates
  // to fold out first.
  const POOL_CHUNK = 2_000;
  const pools = new Map<string, { yesPool: number; noPool: number }>();
  for (let i = 0; i < allRounds.length; i += POOL_CHUNK) {
    const part = await marketStore
      .poolsByIds(allRounds.slice(i, i + POOL_CHUNK).map((r) => r.marketId))
      .catch(() => new Map<string, { yesPool: number; noPool: number }>());
    for (const [k, v] of part) pools.set(k, v);
  }
  // `list` returns boundaryAt DESC, so each bucket is newest-first and slicing at STATS_CAP
  // keeps exactly the rows the per-chain query used to return.
  const roundsByChain = new Map<string, typeof allRounds>();
  for (const r of allRounds) {
    const bucket = roundsByChain.get(r.chainId);
    if (!bucket) roundsByChain.set(r.chainId, [r]);
    else if (bucket.length < STATS_CAP) bucket.push(r);
  }
  // ⛔ NO `Promise.all` HERE ANY MORE, and its absence is the fix. There is no I/O left in
  // this loop — every read happened above, in bulk — so a concurrent map would only be
  // decoration over synchronous work, and decoration that reads like the defect it replaced.
  const chainStats = new Map(
    chains.map((c) => {
        const rounds = roundsByChain.get(c.id) ?? [];
        // ⭐ E-90 · WHETHER A ROUND PAID ANYONE IS A FACT ABOUT ITS POOLS, NOT ITS OUTCOME.
        // A round that decided UP with nobody on DOWN refunds every stake: no winner, no
        // fee. The cell headed "Paid a winner" counted those as paid, and on the freshly
        // built board it read `100% 2/2 paid` over one paid round and one refunded one.
        // One query for the window's pools, not one per round — and since 2026-08-29 not one
        // per CHAIN either: `pools` above is loaded once for every chain on the board.
        const withPools = rounds.map((r) => {
          const p = pools.get(r.marketId);
          // ⛔ A MISSING MARKET IS NOT AN EMPTY POOL. Absent → counted as two sides, so a
          // read failure understates the problem rather than inventing one.
          const sides = !p ? 2 : ((p.yesPool > 0 ? 1 : 0) + (p.noPool > 0 ? 1 : 0)) as 0 | 1 | 2;
          return { outcome: r.outcome, voidReason: r.voidReason, sides };
        });
        // ONE reducer, in a tested module — not a second copy of the rule living in JSX.
        return [c.id, { ...summariseRounds(withPools), truncated: globallyTruncated || rounds.length >= STATS_CAP }] as const;
    }),
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

  // ── What this game ACTUALLY charges ────────────────────────────────────────
  //
  // 🔴 A4. This tile used to price `cfg.defaultRateProfile` and caption it with a
  // HARDCODED `capped-commission 13%`. Both halves were wrong on 2026-08-14, in two
  // different ways, and they were wrong in opposite directions:
  //
  //   1. The CAPTION was a literal. The value branches on the model through `poolFee`,
  //      so the moment A2 moved the default to loser-share the tile read a right number
  //      (TZS 650) under a retired law (capped-commission would have charged 1,300).
  //   2. The PROFILE was the DEFAULT — which is what a NEW chain would freeze. Every
  //      one of the 16 live chains carries its OWN `rateProfile` and does NOT inherit
  //      (`rateProfileOf`). A console that reads only the default cannot see the exact
  //      half-done state A2 had to be migrated out of: default moved, chains not.
  //
  // So: ONE reducer, in a tested module — not a second copy of the rule living in JSX.
  // `boardFeeSummary` reads every configured chain through the same resolver the engine
  // freezes with, and derives the caption from the same profile the number came out of.
  // Executed by `npm run test:fee-model-caption` §3.
  const boardFee = boardFeeSummary(chains, cfg);
  // Balanced pools, so the winning side is immaterial to the figure — but loser-share is
  // outcome-DEPENDENT and `poolFee` charges NOTHING when it is not told a winner, so one
  // must be passed here or the preview would read TZS 0 on the current model.
  const feePreview = poolFee(FEE_PREVIEW_POOL / 2, FEE_PREVIEW_POOL / 2, boardFee.profile, "YES");

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

      <AdminBody>
        <KpiGrid>
          <AdminKpi label="Enabled assets" sw="Bidhaa hai" value={String(enabledAssets.length)} delta={`${assets.length} total`} spark={false} />
          <AdminKpi label="Running chains" sw="Minyororo hai" value={String(running.length)} delta={`${chains.length} configured`} spark={false} />
          {/* `flat`, not the default `up`: a fee model is a FACT, not good news — and a
              split board must never render under a green ▲. `danger` on the value says
              the figure beside it is not what every running chain charges. */}
          <AdminKpi
            label="Fee · balanced 10,000"
            sw="Ada"
            value={formatBalancePill(Math.round(feePreview.fee))}
            delta={boardFee.caption}
            deltaDir="flat"
            tone={boardFee.split ? "danger" : undefined}
            spark={false}
          />
          <AdminKpi label="Staleness window" sw="Muda wa bei" value={`${cfg.maxStalenessSeconds}s`} delta={`confidence ≥ ${cfg.confidenceThreshold}`} spark={false} />
        </KpiGrid>

        {/* ── This game's economics (Up & Down ONLY) ─────────────────────────
            Sealed from the long-form polls: its own GGR, hold and turnover, beside
            its own AI spend. GGR is TZS (commission kept on this game); AI cost is
            USD (what the oracle spent) — two distinct facts, never blended. */}
        <AdminCard
          title="Up & Down economics · this game only"
          sw="Uchumi wa mchezo huu"
          action={<span className="font-mono text-micro tracking-[0.12em] uppercase text-text-tertiary">{range.label} · UPDOWN only</span>}
        >
          {/* This game's money over a chosen window — presets + custom date+hour+minute.
              (AI oracle cost stays on standard lookbacks — a separate spend concept.) */}
          <div className="mb-3">
            <DateTimeRangeFilter defaultPreset="30d" presetIds={["today", "yesterday", "24h", "7d", "30d", "mtd", "all"]} />
          </div>
          <KpiGrid>
            <AdminKpi label="GGR · this game" sw="Mapato" value={formatBalancePill(Math.round(pnl.ggr))} delta={`hold ${pnl.holdPct.toFixed(1)}%`} tone={pnl.ggr >= 0 ? "success" : "danger"} spark={false} gold />
            <AdminKpi label="Staked" sw="Zilizowekwa" value={formatBalancePill(Math.round(pnl.stakes))} delta={`${pnl.bets.toLocaleString()} bets`} spark={false} />
            <AdminKpi label="Paid out" sw="Zilizolipwa" value={formatBalancePill(Math.round(pnl.payouts))} delta={`${pnl.players.toLocaleString()} players`} spark={false} />
            <AdminKpi label="AI oracle cost" sw="Gharama ya AI" value={usd(aiCost.last30)} delta={`${aiCost.calls.toLocaleString()} calls · 90d ${usd(aiCost.all)}`} spark={false} />
          </KpiGrid>
          <p className="mt-3 text-body-sm leading-[1.55] text-text-subtle max-w-[80ch]">
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
                  <tr className="text-left font-mono text-micro uppercase tracking-[0.12em] text-text-subtle border-b border-border-subtle">
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
          <p className="px-4 pb-4 pt-3 text-body-sm leading-[1.55] text-text-subtle max-w-[95ch]">
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
                  <tr className="text-left font-mono text-micro uppercase tracking-[0.12em] text-text-subtle border-b border-border-subtle">
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
                          {/* ⭐ E-194 · THE ADVICE, ON THE CHAIN IT IS ABOUT.
                              🔴 The platform already measured this and already said it — just not
                              here. The ASSET table above renders "+91s typical · 5m+ advised" from
                              `feedAdviceLookup()`, and the CHAIN table rendered nothing, so a
                              3-minute chain running on an asset whose own advised minimum is 5
                              minutes was invisible unless an operator held two tables in their
                              head and did the comparison themselves. Measured on production
                              2026-08-24: BTC/USD and ETH/USD 3m leave **88.7s** of a 180s window
                              once the reading lands, against this engine's own 50% caution line
                              of 90s — over the line, by 1.3 seconds, on both live 3m chains.
                              ⛔ THE NUMBERS ARE NOT RE-DERIVED HERE. `advisedMinDurationMinutes`
                              and `bettingSecondsAfterLag` are the same functions `createChain`
                              refuses with, so the console and the write path cannot come to
                              disagree about whether a pairing is sound — which is the defect this
                              file's own asset-table comment already warns about in the other
                              direction. ⚠️ It is a CAUTION, never a block: these chains are live,
                              they settle correctly, and 88.7 seconds is a real betting window.
                              What was wrong was that nobody was told. */}
                          {(() => {
                            if (!a || !feed) return null;
                            const adv = feed.advise(a.key, c.durationMinutes);
                            // ⛔ THE LAG COMES FROM THE RECORD, NOT FROM THE ADVICE. `FeedAdvice`
                            // carries the verdict; `FeedRecord.history` carries the measurement.
                            // Reading a median off the advice would render `undefined` as a
                            // number — the shape of a probe that returns nothing and is read as a
                            // pass (E-191).
                            const caution = chainDurationCaution({
                              durationMinutes: c.durationMinutes,
                              advisedMinDurationMinutes: adv.advisedMinDurationMinutes,
                              unmeasured: adv.unmeasured,
                              medianLagSeconds: feed.record(a.key).history.medianLagSeconds,
                            });
                            if (!caution) return null;
                            return (
                              <div className="mt-1 font-mono text-body-sm text-warning-fg whitespace-normal max-w-[24rem]">
                                {caution.advisedMinMinutes}m+ advised on {a.key} — its reading typically lands{" "}
                                {caution.lagSeconds}s after the boundary, leaving {caution.bettingSecondsLeft}s of a{" "}
                                {caution.advertisedSeconds}s betting window
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              "chip " +
                              (c.state === "RUNNING" ? "chip-live" : c.state === "PAUSED" ? "chip-pending" : "chip-pending opacity-70")
                            }
                          >
                            {c.state === "RUNNING" && <span className="live-dot" />}
                            {chainStateLabel(c.state)}
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
                            // `text-danger-fg`, not `text-hot-rose-300` (2026-08-21): there is
                            // no `hot-rose` colour family in tailwind.config.ts, so the WORST
                            // rung of this ladder rendered in the same muted ink as the healthy
                            // one while the middle rung (`text-warning-fg`) painted — a feed
                            // outage read quieter than a low pay rate, inverting the whole
                            // point of the comment above. `danger-fg` is this ladder's real top
                            // rung and pairs with the `warning-fg` beneath it. ⛔ Not `no-300`:
                            // DESIGN_AUTHORITY §B2 — a feed outage is not a money outcome.
                            const ink =
                              health === "feed-failing" ? "text-danger-fg"
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
                                  <div className="text-text-faint text-body-sm leading-tight">
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
                          {/* The column header is "Stake bounds" — it names no currency, so the
                              cell has to. This read "1,000 – 100,000" on the one screen where an
                              officer sets what a player may stake, and a bare `toLocaleString()`
                              also groups by whatever locale the runtime holds. Both figures take
                              the unit, as the player-facing stake range does. */}
                          {c.minStake != null || c.maxStake != null
                            ? `${formatTzs(c.minStake ?? cfg.defaultMinStake)} – ${formatTzs(c.maxStake ?? cfg.defaultMaxStake)}`
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

        {/* ⭐ ARCHIVED CHAINS — Jay (Gaming Board) item #3, the half that makes ARCHIVE safe.
            ⛔ A filing state that cannot be un-filed is a deletion with extra steps, so the
            archived boards are listed here with the one control that matters. They are out of
            the working table above and off the player board, and every round they ever ran is
            untouched — which is the entire difference between this and the hard delete that
            once took 1,915 rounds' settlement record with it (`e63-window.cjs`).
            ⚠️ The card renders only when something is archived: an empty card on every visit
            would be chrome teaching operators to ignore it. */}
        {archived.length > 0 && (
          <AdminCard title="Archived chains" sw="Minyororo iliyohifadhiwa">
            <p className="px-4 pt-3 text-body-sm text-text-muted">
              Filed away and hidden from players. Every round they ran is kept — restore one to bring it back as a stopped chain.
            </p>
            {/* ⛔ A LINK, NOT THE CONTROL — and that is precisely why it is a link. Purging a
                chain's history is a `compliance` act, and this page is a `trading` route
                (roles.ts ROUTE_DOMAINS). A compliance control hosted here would be Owner-only
                IN PRACTICE, and would log every legitimate click by a compliance officer as
                `privilege_escalation_blocked` — the documented E-18/E-23 failure, which
                `voidUpDownRound` had to be corrected for within the hour. So the operator who
                wants it is sent to the surface where their own role actually works. */}
            <p className="px-4 pt-2 text-caption text-text-tertiary">
              Need the history gone too?{" "}
              <a href="/admin/retention" className="text-royal-300 underline underline-offset-2">
                Purge a chain on /admin/retention →
              </a>{" "}
              — a two-officer compliance ceremony, not a trading control.
            </p>
            <ScrollX label="Archived Up & Down chains">
              <table className="admin-tbl min-w-[560px]">
                <thead>
                  <tr className="text-left font-mono text-micro uppercase tracking-[0.12em] text-text-subtle">
                    <th className="px-4 py-2.5 font-semibold">Chain</th>
                    <th className="px-4 py-2.5 font-semibold">State</th>
                    <th className="px-4 py-2.5 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {archived.map((c) => {
                    const a = assets.find((x) => x.id === c.assetId);
                    const label = `${a?.key ?? c.assetId} ${c.durationMinutes}m`;
                    return (
                      <tr key={c.id}>
                        <td className="px-4 py-2.5 font-mono text-label">{label}</td>
                        {/* The same label the working table uses (line 553) — one lexicon, so
                            "Archived" cannot come to mean two different things on one page. */}
                        <td className="px-4 py-2.5 font-mono text-label text-text-muted">{chainStateLabel(c.state)}</td>
                        <td className="px-4 py-2.5">
                          <ChainStateControls id={c.id} state={c.state} label={label} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollX>
          </AdminCard>
        )}

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
            <p className="text-body-sm text-text-tertiary">Enable an asset to see its price readings here.</p>
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
                      {readingStateLabel(last?.state)}
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
          <p className="mt-3 text-body-sm leading-[1.55] text-text-subtle max-w-[80ch]">
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
      </AdminBody>
    </>
  );
}
