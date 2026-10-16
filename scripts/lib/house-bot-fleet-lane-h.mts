/**
 * LANE H · N6 PAIRING, through the real planner and poller on the fleet clock.
 *
 * The two accounts are designated and started with a counter band no seeded poll uses. This lane then
 * narrows them to one new Up & Down chain. It places the first account's OPENER through the ordinary house
 * seam; only the second side is this lane's engine subject. A budget-empty planner tick must witness NO
 * PAIR, then the same live round is offered again after both desk budgets are set. The real planner writes
 * the PAIR and the real poller fires it. Settlement uses the ordinary Up & Down close path.
 *
 * Every assertion requires a planner pass or engine-written PAIR row. With KP_FLEET_SILENT=1, the directly
 * seeded opener is never mistaken for engine activity: every H assertion goes red, as fleet.silent requires.
 * The expected 5,000 stake and 13,700 payout are hand-derived: 50% of 10,000 on the opposite side; the
 * loser-share fee is 13% of the losing YES 10,000 = 1,300; net pool 15,000 − 1,300 = 13,700.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;
import type { FleetBot } from "./house-bot-fleet-roster.mts";

export const LANE = "H";
export const roster: readonly FleetBot[] = [
  {
    key: "H1-FIRST", lane: "H", category: "tech", band: [900_000, 949_999],
    what: "the first marked Up & Down holder, whose seeded 10,000 YES opener offers an empty opposite side",
    rules: { counter: true, amount: { kind: "FIXED", fixedTzs: 1_000 }, delaySec: 25, reactPct: 100 },
  },
  {
    key: "H2-PAIR", lane: "H", category: "tech", band: [950_000, 999_999],
    what: "the distinct holder whose opted-in pair is decided and fired by the live engine",
    rules: { counter: true, amount: { kind: "FIXED", fixedTzs: 1_000 }, delaySec: 25, reactPct: 100 },
  },
];

export const expect = {
  "H-PAIR": { opener: 10_000, matchPct: 50, pair: 5_000, gross: 15_000, fee: 1_300,
    payout: 13_700, firstWalletAfter: 4_990_000, secondWalletAfterBet: 4_995_000,
    secondWalletAfterWin: 5_008_700 },
} as const;

export async function run(env: Any, _prior: Any): Promise<Any> {
  const { ok, section, until, j, w, S, fleet, passes, OFFICER }: Any = env;
  const E = expect["H-PAIR"];
  const SILENT = process.env.KP_FLEET_SILENT === "1";
  const timeout = (normal: number) => SILENT ? 2_000 : normal;
  const first = fleet["H1-FIRST"];
  const second = fleet["H2-PAIR"];
  if (!first || !second) throw new Error("H: both roster accounts must have been started");
  section("H · N6 pairing — budget empty, then live planner/poller placement and settlement");

  // Source modules load only after the drive has selected its scratch Postgres database.
  const cfg: Any = await import("../../src/lib/server/updown-config.ts");
  const uds: Any = await import("../../src/lib/server/updown-service.ts");
  const udd: Any = await import("../../src/lib/server/updown-dal.ts");
  const vendor: Any = await import("../../src/lib/server/updown-terminal-vendor.ts");
  const { seedDefaultSources, addSource }: Any = await import("../../src/lib/server/source-registry.ts");
  await seedDefaultSources();
  await addSource({ domain: "api.twelvedata.com", label: "Twelve Data", category: "crypto",
    rationale: "test fixture", addedBy: "system" });

  // Both holders have distinct synthetic identity facts. Unknown identity fails the same-holder guard closed.
  const identity = async (userId: string, fullName: string, dob: string): Promise<void> => {
    const now = new Date().toISOString();
    await w.db.kyc.upsert({ id: `kyc_${userId}`, userId, status: "IN_PROGRESS", rejectReason: null,
      rejectNote: null, idType: null, idNumber: null, idVerifiedAt: null, fullName, dob,
      documents: [], extraRequests: [], reviewerId: null, reviewedAt: null, submittedAt: null,
      createdAt: now, updatedAt: now });
  };
  await identity(first.userId, "Fixture Fleet Holder One", "1990-01-02");
  await identity(second.userId, "Fixture Fleet Holder Two", "1991-03-04");

  const asset = await cfg.createAsset({ key: `H${process.pid}`, symbol: "BTC/USD", nameEn: "Bitcoin",
    nameSw: "Bitcoin", iconKey: "crypto", priceSourceUrl: "https://api.twelvedata.com/quote",
    category: "crypto", decimals: 2, minMoveTicks: 2 }, OFFICER);
  if (!asset.ok) throw new Error(`H asset: ${asset.error}`);
  await cfg.setAssetEnabled(asset.data.id, true, OFFICER);
  const madeChain = await cfg.createChain({ assetId: asset.data.id, durationMinutes: 15 }, OFFICER);
  if (!madeChain.ok) throw new Error(`H chain: ${madeChain.error}`);
  await cfg.setChainState(madeChain.data.id, "RUNNING", OFFICER);
  const chain = await udd.chainStore.get(madeChain.data.id);
  const chainKey = `${asset.data.id}:15`;

  // A counter mode remains enabled on Up & Down solely to keep Start's mode/scope contract satisfied.
  // There are no player stakes on this round, so it cannot produce a counter. Pairing itself does not require
  // an opener mode and is checked against the chain scope independently.
  const setRoundRules = async (b: Any, sharing: boolean): Promise<void> => {
    const cur = await S.houseBotStore.get(b.botId);
    const rules = structuredClone(cur.rules);
    rules.scope.products.polls = false;
    rules.scope.categories = [];
    rules.modes.polls.counter = false;
    rules.modes.polls.fill = false;
    rules.modes.polls.opener = false;
    rules.scope.products.updown = true;
    rules.scope.chains = [chainKey];
    rules.modes.updown.counter = true;
    rules.modes.updown.fill = false;
    rules.modes.updown.opener = false;
    rules.updown.closenessPct = 100;
    rules.opener.delayUdMinSec = 1;
    rules.opener.delayUdMaxSec = 1;
    rules.shaping.roundToTzs = 1_000;
    rules.share = sharing
      ? { otherSide: true, matchPct: E.matchPct, matchPerDay: 2 }
      : { otherSide: false, matchPct: 0, matchPerDay: 0 };
    const saved = await S.houseBotStore.saveRules(b.botId, cur.rulesVersion, { rules });
    if (!saved.ok) throw new Error(`H rules CAS failed for ${sharing ? "second" : "first"} holder`);
  };
  await setRoundRules(first, false);
  await setRoundRules(second, true);

  // The two nullable global budgets are explicitly empty for one full planner window.
  await w.limits({ gMaxBetsPerMinute: 120, gCapPairRoundsPerDay: null, gCapPairDailyTzs: null });
  // cleanGridAnchor rounds UP; near a grid edge it can put opensAt in the future, beyond the
  // price's remaining lifetime. Floor to an already-open 5-minute boundary instead.
  const gridMs = 5 * 60_000;
  const boundary = new Date(Math.floor((Date.now() - 60_000) / gridMs) * gridMs).toISOString();
  const openObservation = await udd.observationStore.ensure(asset.data.id, boundary);
  await udd.observationStore.confirm(openObservation.id, { price: 60_000,
    sourceUrl: "https://api.twelvedata.com/quote", sourceQuotedAt: new Date().toISOString(),
    evidence: "BTC quoted 60000", confidence: 96, model: "test-stub", rawHash: `fleet_h_open_${process.pid}` });
  const opened = await uds.openRound(chain, boundary, openObservation.id, 60_000);
  if (!opened.ok) throw new Error(`H round: ${opened.error}`);
  const round = await udd.roundStore.get(opened.data.id);
  const marketId = round.marketId;
  const opener = await w.intent(first, marketId, { kind: "OPENER", productLine: "UPDOWN",
    side: "YES", stakeTzs: E.opener, deadlineAt: round.closesAt, staleAt: w.iso(600_000) });
  const firstPlaced = await w.place(first, opener);
  if (!firstPlaced.ok) throw new Error(`H first opener: ${j(firstPlaced)}`);
  const openerPlacedAt = (await w.positionsOf(marketId))
    .find((p: Any) => p.id === firstPlaced.data?.positionId)?.placedAt;
  if (!openerPlacedAt) throw new Error("H opener has no durable position instant");
  vendor.publishOracleBar(asset.data.id, 60_000,
    new Date(Math.floor(Date.now() / 60_000) * 60_000).toISOString());

  const beforeEmpty = passes.planner.length;
  const emptyPass = await until("H budget-empty planner tick", timeout(55_000), async () =>
    passes.planner.slice(beforeEmpty).find((p: Any) => p.duties?.pair === "skipped"
      && Date.parse(p.passNowIso) >= Date.parse(openerPlacedAt)) ?? null);
  const beforeBudgetRow = await S.houseBotIntentStore.findByAnchor("PAIR", `pair:${marketId}`);
  const beforePositions = await w.positionsOf(marketId);
  const firstPosition = beforePositions.find((p: Any) => p.id === firstPlaced.data?.positionId);
  ok("H.1 · budget EMPTY · a real planner tick skipped pairing while the only open money was a 10,000 YES opener; no PAIR row or second position appeared",
    !!emptyPass && beforeBudgetRow == null && beforePositions.length === 1
      && firstPosition?.houseBotId === first.botId && firstPosition?.stake === E.opener
      && firstPosition?.side === "YES",
    j({ pass: emptyPass?.passNowIso ?? null, duty: emptyPass?.duties?.pair ?? null,
      pairRow: beforeBudgetRow?.status ?? null, positions: beforePositions.length }));

  // The next tick sees both budgets; its PENDING row is durable even if the poller has already fired it.
  const pollersBefore = passes.poller.length;
  const beforeEnabled = passes.planner.length;
  await w.limits({ gMaxBetsPerMinute: 120, gCapPairRoundsPerDay: 2, gCapPairDailyTzs: 20_000 });
  vendor.publishOracleBar(asset.data.id, 60_000,
    new Date(Math.floor(Date.now() / 60_000) * 60_000).toISOString());
  const pairedPass = await until("H budget-enabled pair decision", timeout(60_000), async () =>
    passes.planner.slice(beforeEnabled).find((p: Any) => p.duties?.pair === "ok" && (p.counts?.paired ?? 0) >= 1) ?? null);
  const pair = await S.houseBotIntentStore.findByAnchor("PAIR", `pair:${marketId}`);
  ok("H.2 · budget SET · the real planner counted one PAIR and wrote the second holder's opposite-side 5,000 intent from 50% of the opener",
    !!pairedPass && pair?.kind === "PAIR" && pair?.houseBotId === second.botId
      && pair?.side === "NO" && pair?.stakeTzs === E.pair && pair?.anchorKey === `pair:${marketId}`,
    j({ pass: pairedPass?.passNowIso ?? null, paired: pairedPass?.counts?.paired ?? null,
      row: pair && [pair.status, pair.side, pair.stakeTzs] }));

  const fired = await until("H real poller placement", timeout(45_000), async () => {
    const row = pair ? await S.houseBotIntentStore.get(pair.id) : null;
    return row?.status === "PLACED" ? row : null;
  });
  // The row can be PLACED while pollerPass is still flushing its audit queue. Wait for the pass to
  // return before using the recorder as evidence; sampling it at the row transition is a race.
  const firingPass = fired ? await until("H poller pass completion", timeout(20_000), async () =>
    passes.poller.slice(pollersBefore).find((p: Any) => (p.claimed ?? 0) > 0) ?? null) : null;
  const positions = await w.positionsOf(marketId);
  const secondPosition = positions.find((p: Any) => p.id === fired?.positionId);
  ok("H.3 · the real poller fired the PAIR once: two distinct marked holders, YES 10,000 and NO 5,000, with no player stake",
    !!pairedPass && fired?.status === "PLACED" && (fired?.attempts ?? 0) >= 1
      && !!firingPass && positions.length === 2
      && positions.some((p: Any) => p.houseBotId === first.botId && p.side === "YES" && p.stake === E.opener)
      && secondPosition?.houseBotId === second.botId && secondPosition?.side === "NO"
      && secondPosition?.stake === E.pair,
    j({ status: fired?.status ?? null, attempts: fired?.attempts ?? null,
      pollerPasses: passes.poller.length - pollersBefore,
      positions: positions.map((p: Any) => [p.side, p.stake, !!p.houseBotId]) }));

  const firstAfterBet = (await w.bal(first.userId)).balance;
  const secondAfterBet = (await w.bal(second.userId)).balance;
  ok("H.4 · both marked cash wallets paid their own stakes, with no shared holder money",
    !!fired && firstAfterBet === E.firstWalletAfter && secondAfterBet === E.secondWalletAfterBet,
    j({ firstAfterBet, secondAfterBet }));

  // Only settle when the live engine actually placed the second side. Silent mode must not turn a manually
  // seeded single-sided opener into a settlement witness.
  if (!fired || !secondPosition) {
    ok("H.5 · the engine-placed pair settles and pays its winner through ordinary Up & Down settlement", false,
      "no engine-placed pair to settle");
    return { lane: "H", measured: false, placed: [] };
  }
  const closePrice = Math.floor(round.downTarget ?? 59_900) - 100;
  const closeObservation = await udd.observationStore.ensure(asset.data.id, round.closesAt);
  await udd.observationStore.confirm(closeObservation.id, { price: closePrice,
    sourceUrl: "https://api.twelvedata.com/quote", sourceQuotedAt: new Date().toISOString(),
    evidence: `BTC quoted ${closePrice}`, confidence: 96, model: "test-stub",
    rawHash: `fleet_h_close_${process.pid}` });
  const settled = await uds.closeRound(round.id, closeObservation.id, closePrice);
  const firstFinal = await w.mdal.positionStore.get(firstPosition?.id);
  const secondFinal = await w.mdal.positionStore.get(secondPosition.id);
  const payout = (await w.txnsFor(secondPosition.id)).find((t: Any) => t.type === "BET_PAYOUT");
  const secondFinalWallet = (await w.bal(second.userId)).balance;
  ok("H.5 · the engine-placed pair settles DOWN: NO wins 13,700 after the 1,300 fee, YES loses, and the second holder's wallet receives the marked payout",
    !!pairedPass && settled.ok === true && settled.data?.outcome === "DOWN" && settled.data?.settled === true
      && firstFinal?.status === "LOSS" && secondFinal?.status === "WIN"
      && payout?.houseBotId === second.botId && payout?.amount === E.payout
      && secondFinalWallet === E.secondWalletAfterWin,
    j({ outcome: settled.data?.outcome ?? null, settled: settled.data?.settled ?? null,
      first: firstFinal?.status ?? null, second: secondFinal?.status ?? null,
      payout: payout?.amount ?? null, secondFinalWallet }));

  return { lane: "H", measured: settled.ok === true && settled.data?.settled === true,
    placed: [{ key: "H2-PAIR", stake: E.pair, side: "NO", market: marketId,
      botId: second.botId, holder: second.userId }] };
}
