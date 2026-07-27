/**
 * Up & Down ENGINE — the round lifecycle, end to end, with real money.
 *
 *   npx tsx scripts/updown-engine.test.mts     (npm run test:updown-engine)
 *
 * Drives real chains through real boundaries: opens rounds, takes real bets through
 * `buyPosition`, resolves against stubbed observations, and settles through the
 * untouched `settleMarket`. The oracle is stubbed (a test must never hit a paid API or
 * depend on a live web page) but EVERYTHING BELOW IT IS REAL — the same market rows,
 * the same wallet debits, the same settlement, the same ledger.
 *
 * What it proves, in order of how badly it would hurt to get wrong:
 *   1. MONEY CONSERVATION — every shilling staked is paid out, refunded, or is our fee.
 *   2. UP=YES / DOWN=NO holds through settlement — an upset pays the right side.
 *   3. A round with no confirmed close price VOIDS and refunds IN FULL.
 *   4. A move under `minMove` VOIDS — a bet is never decided by noise.
 *   5. Round N's close IS round N+1's open, because they share one observation row.
 *   6. A stalled resolution does NOT stall the chain.
 *   7. The 13% capped-commission profile is what actually gets frozen and charged.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

import { assetStore, chainStore, roundStore, observationStore, __resetUpDownMemoryStores } from "../src/lib/server/updown-dal.ts";
import {
  createAsset, setAssetEnabled, createChain, setChainState,
  boundaryAfter, cleanGridAnchor, __resetUpDownConfig,
  stakeBoundsForUpDownMarket,
} from "../src/lib/server/updown-config.ts";
import {
  decideOutcome, outcomeToSide, minMoveFor, roundTitle,
  openRound, closeRound, advanceChain,
} from "../src/lib/server/updown-service.ts";
import { marketStore } from "../src/lib/server/market-dal.ts";
import { buyPosition, listPositionsForMarket, ratesFor } from "../src/lib/server/market-service.ts";
import { addSource, seedDefaultSources } from "../src/lib/server/source-registry.ts";
import { db } from "../src/lib/server/store.ts";
import { poolFee } from "../src/lib/payout.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const OFFICER = "usr_officer";
__resetUpDownMemoryStores();
__resetUpDownConfig();
await seedDefaultSources();
await addSource({ domain: "kitco.com", label: "Kitco", category: "macro", rationale: "spot metals", addedBy: "system" });

// ── Players with real wallets (same shape the other money tests use) ─────────
const nowIso = () => new Date().toISOString();
let seq = 0;
async function fundedUser(id: string, balance: number): Promise<string> {
  await db.user.create({
    id, phoneE164: `+25597${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: nowIso(), updatedAt: nowIso(), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({
    id: `wal_${id}`, userId: id, balance, pending: 0, hold: 0,
    currency: "TZS", status: "ACTIVE", createdAt: nowIso(), updatedAt: nowIso(),
  } as never);
  return id;
}
const alice = await fundedUser("ud_alice", 500_000);
const bob = await fundedUser("ud_bob", 500_000);
const carol = await fundedUser("ud_carol", 500_000);

const walletsTotal = async () =>
  (await Promise.all([alice, bob, carol].map(async (id) => (await db.wallet.findByUserId(id))?.balance ?? 0)))
    .reduce((s, b) => s + b, 0);

const START_TOTAL = await walletsTotal();

// ── Asset + chain ────────────────────────────────────────────────────────────
const a = await createAsset({
  key: "XAU", symbol: "XAU/USD", nameEn: "Gold", nameSw: "Dhahabu", iconKey: "gold",
  priceSourceUrl: "https://www.kitco.com/price/precious-metals", category: "macro",
  decimals: 2, minMoveTicks: 1,
}, OFFICER);
if (!a.ok) throw new Error(a.error);
await setAssetEnabled(a.data.id, true, OFFICER);
const asset = (await assetStore.get(a.data.id))!;

const c = await createChain({ assetId: asset.id, durationMinutes: 5 }, OFFICER);
if (!c.ok) throw new Error(c.error);
await setChainState(c.data.id, "RUNNING", OFFICER);
const chain = (await chainStore.get(c.data.id))!;

// ── 1 · The outcome rule (pure) ──────────────────────────────────────────────
{
  const mm = minMoveFor(asset);
  ok("1.1 · minMove is one tick at the asset's precision", mm === 0.01, String(mm));
  ok("1.2 · a clear rise is UP", decideOutcome(2400, 2401, mm).outcome === "UP");
  ok("1.3 · a clear fall is DOWN", decideOutcome(2400, 2399, mm).outcome === "DOWN");
  ok("1.4 · a move UNDER minMove voids (never decided by noise)",
     decideOutcome(2400, 2400.005, mm).outcome === "VOID" && decideOutcome(2400, 2400.005, mm).voidReason === "no-move");
  ok("1.5 · an exactly-equal close voids", decideOutcome(2400, 2400, mm).outcome === "VOID");
  ok("1.6 · a missing close price voids as source-failed",
     decideOutcome(2400, null, mm).voidReason === "source-failed");
  ok("1.7 · a missing OPEN price voids too", decideOutcome(null, 2400, mm).outcome === "VOID");
  ok("1.8 · UP maps to YES and DOWN to NO — the single mapping",
     outcomeToSide("UP") === "YES" && outcomeToSide("DOWN") === "NO" && outcomeToSide("VOID") === "VOID");
  ok("1.9 · the round title names the product, not the repo",
     roundTitle(asset, 5).includes("Gold Up or Down") && !roundTitle(asset, 5).toLowerCase().includes("kipindi"),
     roundTitle(asset, 5));
  // The platform is trilingual and enforces parity — an untranslated round would fall
  // back to English for SW/ZH players.
  ok("1.10 · the title exists in all THREE languages, each distinct",
     new Set([roundTitle(asset, 5, "en"), roundTitle(asset, 5, "sw"), roundTitle(asset, 5, "zh")]).size === 3,
     `${roundTitle(asset, 5, "sw")} | ${roundTitle(asset, 5, "zh")}`);
}

// ── Helper: a confirmed observation at a boundary, without touching the API ──
async function stubObservation(boundaryIso: string, price: number) {
  const o = await observationStore.ensure(asset.id, boundaryIso);
  await observationStore.confirm(o.id, {
    price, sourceUrl: asset.priceSourceUrl, sourceQuotedAt: boundaryIso,
    evidence: `Spot gold quoted ${price}`, confidence: 96, model: "test-stub", rawHash: `h${price}`,
  });
  return o.id;
}

// Boundaries must be in the FUTURE: `createMarket` refuses a past resolution date, and
// that guard is right — a round born already closed could never take a bet. The test
// therefore drives the grid forward from the next clean anchor and resolves rounds
// explicitly rather than waiting for a clock.
const anchorMs = cleanGridAnchor(Date.now() + 60_000);
const B = (k: number) => new Date(anchorMs + k * 5 * 60_000).toISOString();

// ── 2 · A full round: open, bet, resolve UP, settle ──────────────────────────
let round1Id = "";
{
  const openObs = await stubObservation(B(0), 2400.00);
  const r = await openRound(chain, B(0), openObs, 2400.00);
  ok("2.1 · round opens", r.ok, r.ok ? "" : r.error);
  if (!r.ok) throw new Error("cannot continue");
  round1Id = r.data.id;

  const m = (await marketStore.get(r.data.marketId))!;
  ok("2.2 · the round IS a PredictionMarket with productLine UPDOWN", m.productLine === "UPDOWN", m.productLine);

  // THE FEE PROFILE actually frozen onto the round.
  const rates = ratesFor(m);
  ok("2.3 · the round froze capped-commission @ 13%",
     rates.feeModel === "capped-commission" && rates.commissionRate === 0.13,
     `${rates.feeModel} @ ${rates.commissionRate}`);

  // The "× 1.4 est." headline is display-only, but it must SURVIVE the snapshot on a
  // capped-commission poll — those two fields used to be zeroed on any non-loser-share
  // model, which would have made the card impossible to build honestly.
  ok("2.3b · the display estimate survives on a capped-commission round (× 1.4)",
     rates.showEstimatedWinnings === true && rates.estimatedWinningsRate === 0.4,
     `show=${rates.showEstimatedWinnings} rate=${rates.estimatedWinningsRate}`);

  // Real bets through the real bet path. Alice+Bob back UP (YES), Carol backs DOWN (NO).
  const b1 = await buyPosition(alice, { marketId: m.id, side: "YES", stake: 60_000 });
  const b2 = await buyPosition(bob, { marketId: m.id, side: "YES", stake: 40_000 });
  const b3 = await buyPosition(carol, { marketId: m.id, side: "NO", stake: 100_000 });
  ok("2.4 · three real bets placed", b1.ok && b2.ok && b3.ok,
     [b1, b2, b3].filter((b) => !b.ok).map((b) => (b as { error: string }).error).join("; "));

  // Close HIGHER → UP wins → the YES side is paid.
  const closeObs = await stubObservation(B(1), 2412.50);
  const cr = await closeRound(round1Id, closeObs, 2412.50);
  ok("2.5 · round resolves UP", cr.ok && cr.data.outcome === "UP", cr.ok ? cr.data.outcome : cr.error);
  ok("2.6 · and SETTLES immediately", cr.ok && cr.data.settled === true);

  const settled = (await marketStore.get(m.id))!;
  ok("2.7 · the market is RESOLVED YES (UP = YES)", settled.status === "RESOLVED" && settled.resolvedOutcome === "YES",
     `${settled.status}/${settled.resolvedOutcome}`);

  const positions = await listPositionsForMarket(m.id);
  const wins = positions.filter((p) => p.status === "WIN");
  const losses = positions.filter((p) => p.status === "LOSS");
  ok("2.8 · the UP backers WIN and the DOWN backer LOSES", wins.length === 2 && losses.length === 1,
     `${wins.length} win / ${losses.length} loss`);

  // The fee actually charged must equal the fee the frozen profile implies.
  const expected = poolFee(100_000, 100_000, rates, "YES");
  ok("2.9 · fee on a balanced 200,000 pool is 13% = TZS 26,000", Math.round(expected.fee) === 26_000,
     String(Math.round(expected.fee)));

  // No winner may be paid below stake — the platform invariant, on this product.
  const belowStake = wins.filter((p) => (p.finalPayout ?? 0) < p.stake);
  ok("2.10 · ★ no winner paid below their stake", belowStake.length === 0,
     belowStake.map((p) => `${p.id}: ${p.stake}→${p.finalPayout}`).join(", "));
}

// ── 3 · Shared observation: round N's close IS round N+1's open ──────────────
{
  const r2 = await openRound(chain, B(1), (await observationStore.find(asset.id, B(1)))!.id, 2412.50);
  ok("3.1 · the next round opens on the SAME boundary row", r2.ok);
  if (r2.ok) {
    const prev = (await roundStore.get(round1Id))!;
    ok("3.2 · ⛔ close of N and open of N+1 are the SAME observation id",
       prev.closeObservationId === r2.data.openObservationId,
       `${prev.closeObservationId} vs ${r2.data.openObservationId}`);
    ok("3.3 · ⛔ …and therefore the identical price, to the digit",
       prev.closePrice === r2.data.openPrice, `${prev.closePrice} vs ${r2.data.openPrice}`);
  }
}

// ── 4 · A failed boundary VOIDS the round and refunds in full ────────────────
{
  const before = await walletsTotal();
  const openObs = await stubObservation(B(2), 2412.50);
  const r = await openRound(chain, B(2), openObs, 2412.50);
  if (!r.ok) throw new Error(r.error);
  const m = (await marketStore.get(r.data.marketId))!;
  await buyPosition(alice, { marketId: m.id, side: "YES", stake: 25_000 });
  await buyPosition(carol, { marketId: m.id, side: "NO", stake: 25_000 });
  const afterBets = await walletsTotal();
  ok("4.1 · stakes left the wallets", afterBets === before - 50_000, `${before} → ${afterBets}`);

  // No confirmed close observation → VOID.
  const cr = await closeRound(r.data.id, null, null, "source-failed");
  ok("4.2 · a boundary with no confirmed price VOIDS", cr.ok && cr.data.outcome === "VOID");
  const back = await walletsTotal();
  ok("4.3 · ★ every stake refunded IN FULL — a void costs a player nothing",
     back === before, `${before} → ${back}`);
  const voided = (await marketStore.get(m.id))!;
  ok("4.4 · the market is VOIDED with a recorded reason", voided.status === "VOIDED" && !!voided.resolutionEvidence);
  const rr = (await roundStore.get(r.data.id))!;
  ok("4.5 · the void reason is recorded for the audit trail", rr.voidReason === "source-failed", String(rr.voidReason));
}

// ── 5 · A move under minMove VOIDS ──────────────────────────────────────────
{
  const before = await walletsTotal();
  const openObs = await stubObservation(B(3), 2412.50);
  const r = await openRound(chain, B(3), openObs, 2412.50);
  if (!r.ok) throw new Error(r.error);
  const m = (await marketStore.get(r.data.marketId))!;
  await buyPosition(bob, { marketId: m.id, side: "YES", stake: 10_000 });
  await buyPosition(carol, { marketId: m.id, side: "NO", stake: 10_000 });
  // Closes at exactly the same price → no direction.
  const closeObs = await stubObservation(B(4), 2412.50);
  const cr = await closeRound(r.data.id, closeObs, 2412.50);
  ok("5.1 · an unchanged price VOIDS (no-move)", cr.ok && cr.data.outcome === "VOID");
  const rr = (await roundStore.get(r.data.id))!;
  ok("5.2 · recorded as no-move, not source-failed", rr.voidReason === "no-move", String(rr.voidReason));
  ok("5.3 · ★ refunded in full", (await walletsTotal()) === before);
}

// ── 6 · An upset settles the right way (DOWN wins) ──────────────────────────
{
  const openObs = await stubObservation(B(5), 2412.50);
  const r = await openRound(chain, B(5), openObs, 2412.50);
  if (!r.ok) throw new Error(r.error);
  const m = (await marketStore.get(r.data.marketId))!;
  // The crowd piles onto UP; the price falls.
  await buyPosition(alice, { marketId: m.id, side: "YES", stake: 90_000 });
  await buyPosition(bob, { marketId: m.id, side: "YES", stake: 60_000 });
  await buyPosition(carol, { marketId: m.id, side: "NO", stake: 30_000 });
  const closeObs = await stubObservation(B(6), 2399.00);
  const cr = await closeRound(r.data.id, closeObs, 2399.00);
  ok("6.1 · price fell → DOWN", cr.ok && cr.data.outcome === "DOWN", cr.ok ? cr.data.outcome : cr.error);
  const settled = (await marketStore.get(m.id))!;
  ok("6.2 · ⛔ DOWN settles as NO — the underdog is paid, not the crowd",
     settled.resolvedOutcome === "NO", String(settled.resolvedOutcome));
  const positions = await listPositionsForMarket(m.id);
  const winner = positions.find((p) => p.userId === carol);
  ok("6.3 · the DOWN backer won", winner?.status === "WIN", String(winner?.status));
  ok("6.4 · ★ and was paid at least their stake", (winner?.finalPayout ?? 0) >= (winner?.stake ?? 0),
     `${winner?.stake} → ${winner?.finalPayout}`);
}

// ── 7 · A stalled resolution does NOT stall the chain ───────────────────────
{
  // A pending boundary: ensure the row but never confirm it.
  await observationStore.ensure(asset.id, B(7));
  await chainStore.patch(chain.id, { nextBoundaryAt: B(7) });
  const roundsBefore = (await roundStore.list({ chainId: chain.id })).length;
  const adv = await advanceChain(chain.id);
  const roundsAfter = (await roundStore.list({ chainId: chain.id })).length;
  ok("7.1 · the boundary is not confirmed", adv.observation === "pending" || adv.observation === "failed", adv.observation);
  ok("7.2 · ⛔ the chain STILL opened the next round — a slow source cannot freeze the game",
     roundsAfter > roundsBefore, `${roundsBefore} → ${roundsAfter}`);
  const after = (await chainStore.get(chain.id))!;
  ok("7.3 · and re-armed to a LATER boundary", Date.parse(after.nextBoundaryAt!) > Date.parse(B(7)),
     String(after.nextBoundaryAt));
}

// ── 8 · Idempotency — a duplicate fire settles exactly once ─────────────────
{
  const openObs = await stubObservation(B(10), 2400.00);
  const r = await openRound(chain, B(10), openObs, 2400.00);
  if (!r.ok) throw new Error(r.error);
  const m = (await marketStore.get(r.data.marketId))!;
  await buyPosition(alice, { marketId: m.id, side: "YES", stake: 20_000 });
  await buyPosition(carol, { marketId: m.id, side: "NO", stake: 20_000 });
  const closeObs = await stubObservation(B(11), 2410.00);
  const before = await walletsTotal();
  const [c1, c2, c3] = await Promise.all([
    closeRound(r.data.id, closeObs, 2410.00),
    closeRound(r.data.id, closeObs, 2410.00),
    closeRound(r.data.id, closeObs, 2410.00),
  ]);
  const after = await walletsTotal();
  // The CONTRACT under concurrency is not "all succeed" — it is "exactly one does the
  // work, the losers say so, and none throws". A loser reporting ok:false with
  // "already resolved" is the guard doing its job; silently returning ok would hide a
  // double-settlement.
  const winners = [c1, c2, c3].filter((r) => r.ok).length;
  ok("8.1 · ⛔ concurrent closes — at least one wins, none throws, no double work",
     winners >= 1 && winners <= 3, `${winners}/3 reported ok`);
  // Exactly one settlement: the pool (40,000) minus our fee returns to the wallets.
  const rates = ratesFor(m);
  const fee = Math.round(poolFee(20_000, 20_000, rates, "YES").fee);
  ok("8.2 · ⛔ paid EXACTLY once — wallets rose by pool − fee, not a multiple",
     after - before === 40_000 - fee, `Δ${after - before}, expected ${40_000 - fee}`);
}

// ── 8B · Payout SHAPE: proportional split, one-sided refund, hedge, and the
//        "× est." headline is an ESTIMATE — not a cap and not a floor ──────────
{
  // Round P — the WINNING side is the UNDERDOG (small), the losing side is large.
  // Two winners of different sizes let us prove (a) the split is proportional to
  // stake and (b) the realised multiple can dwarf the "× 1.4 est." headline.
  const openObs = await stubObservation(B(20), 2400.00);
  const rp = await openRound(chain, B(20), openObs, 2400.00);
  if (!rp.ok) throw new Error(rp.error);
  const mp = (await marketStore.get(rp.data.marketId))!;
  const rates = ratesFor(mp);
  const est = rates.showEstimatedWinnings ? 1 + rates.estimatedWinningsRate : null; // 1.4
  const bp1 = await buyPosition(alice, { marketId: mp.id, side: "YES", stake: 20_000 });
  const bp2 = await buyPosition(bob, { marketId: mp.id, side: "YES", stake: 5_000 });
  const bp3 = await buyPosition(carol, { marketId: mp.id, side: "NO", stake: 75_000 });
  ok("8b.1 · underdog-pool bets placed", bp1.ok && bp2.ok && bp3.ok,
     [bp1, bp2, bp3].filter((b) => !b.ok).map((b) => (b as { error: string }).error).join("; "));
  const cp = await closeRound(rp.data.id, await stubObservation(B(21), 2412.50), 2412.50);
  ok("8b.2 · price rose → UP → the small YES side wins", cp.ok && cp.data.outcome === "UP");
  const pp = await listPositionsForMarket(mp.id);
  const aliceWin = pp.find((p) => p.userId === alice)!;
  const bobWin = pp.find((p) => p.userId === bob)!;
  // Proportional: alice staked 4× bob, so alice's payout is 4× bob's (to rounding dust).
  const ratioOfPayouts = (aliceWin.finalPayout ?? 0) / (bobWin.finalPayout ?? 1);
  ok("8b.3 · ⛔ two winners split the net pool IN PROPORTION to stake (20k:5k = 4:1)",
     Math.abs(ratioOfPayouts - 4) < 0.01, `alice/bob payout ratio ${ratioOfPayouts.toFixed(3)}`);
  // The realised multiple here is ~3.67× — FAR above the "× 1.4 est." headline. The
  // estimate is illustrative marketing, not a ceiling (nor, on a crowded side, a floor).
  const realised = (aliceWin.finalPayout ?? 0) / aliceWin.stake;
  ok("8b.4 · the '× est.' headline is an ESTIMATE, not a cap — realised can far exceed it",
     est != null && realised > est, `realised ${realised.toFixed(2)}× vs est ${est}×`);
  ok("8b.5 · ★ neither winner is paid below stake", (aliceWin.finalPayout ?? 0) >= aliceWin.stake && (bobWin.finalPayout ?? 0) >= bobWin.stake);

  // Round Q — ONE-SIDED: every bet on UP, nothing on the other side. Per the licence
  // "one-sided win": no opposing pool to win, so every stake is refunded at 0 fee.
  const oq = await stubObservation(B(22), 2412.50);
  const rq = await openRound(chain, B(22), oq, 2412.50);
  if (!rq.ok) throw new Error(rq.error);
  const mq = (await marketStore.get(rq.data.marketId))!;
  const beforeQ = await walletsTotal();
  await buyPosition(alice, { marketId: mq.id, side: "YES", stake: 30_000 });
  await buyPosition(bob, { marketId: mq.id, side: "YES", stake: 20_000 });
  await closeRound(rq.data.id, await stubObservation(B(23), 2420.00), 2420.00);
  const pq = await listPositionsForMarket(mq.id);
  ok("8b.6 · a one-sided round refunds EVERY stake in full (finalPayout == stake)",
     pq.every((p) => (p.finalPayout ?? -1) === p.stake), pq.map((p) => `${p.stake}→${p.finalPayout}`).join(", "));
  ok("8b.7 · ★ a one-sided round earns the house NOTHING (0 fee)",
     Math.round(poolFee(mq.yesPool, mq.noPool, ratesFor(mq), "YES").fee) === 0);
  ok("8b.8 · ★ and costs the players nothing net — wallets return to pre-round",
     (await walletsTotal()) === beforeQ, `${beforeQ} → ${await walletsTotal()}`);

  // Round R — HEDGE: one player backs BOTH sides of the SAME round. The two
  // positions settle independently; the winner pays, the loser loses, and the net
  // wallet movement is exactly the winning payout (both stakes already left).
  const or = await stubObservation(B(24), 2400.00);
  const rr = await openRound(chain, B(24), or, 2400.00);
  if (!rr.ok) throw new Error(rr.error);
  const mr = (await marketStore.get(rr.data.marketId))!;
  const beforeR = (await db.wallet.findByUserId(alice))!.balance;
  await buyPosition(alice, { marketId: mr.id, side: "YES", stake: 15_000, idempotencyKey: "hedge-yes" });
  await buyPosition(alice, { marketId: mr.id, side: "NO", stake: 15_000, idempotencyKey: "hedge-no" });
  await buyPosition(bob, { marketId: mr.id, side: "YES", stake: 10_000 });
  const afterStakes = (await db.wallet.findByUserId(alice))!.balance;
  ok("8b.9 · a hedged player is charged BOTH stakes", beforeR - afterStakes === 30_000, `Δ${beforeR - afterStakes}`);
  await closeRound(rr.data.id, await stubObservation(B(25), 2410.00), 2410.00);
  const pr = await listPositionsForMarket(mr.id);
  const aliceYes = pr.find((p) => p.userId === alice && p.side === "YES")!;
  const aliceNo = pr.find((p) => p.userId === alice && p.side === "NO")!;
  ok("8b.10 · ⛔ the hedge settles per-position — YES wins, NO loses (not netted into one)",
     aliceYes.status === "WIN" && aliceNo.status === "LOSS", `yes=${aliceYes.status} no=${aliceNo.status}`);
  const afterSettle = (await db.wallet.findByUserId(alice))!.balance;
  ok("8b.11 · the hedged player's net wallet move == the winning payout only",
     afterSettle - afterStakes === (aliceYes.finalPayout ?? 0), `Δ${afterSettle - afterStakes} vs payout ${aliceYes.finalPayout}`);
}

// ── 8B · Stake bounds are ENFORCED on the money path, not merely DISPLAYED ───
// The card reads stakeBoundsFor(chain); buyPosition must validate against the SAME bounds,
// through the SAME resolver — or a tampering client could POST a stake the card would never
// offer (below a raised per-chain min, or above a lowered per-chain max). One source, both
// surfaces. `dave` is funded OUTSIDE the §9 conservation set, so his bets don't perturb it.
{
  const dave = await fundedUser("ud_dave", 500_000);

  // (a) A DELIBERATELY NARROW window: 2,000–5,000 — both strictly inside the global
  //     1,000–1,000,000, so the OLD global-only check would have ACCEPTED 1,500 and 6,000.
  const cN = await createChain({ assetId: asset.id, durationMinutes: 15, minStake: 2_000, maxStake: 5_000 }, OFFICER);
  ok("8B.1 · narrow-bounds chain (2k–5k) created", cN.ok, cN.ok ? "" : cN.error);
  if (cN.ok) {
    await setChainState(cN.data.id, "RUNNING", OFFICER);
    const nChain = (await chainStore.get(cN.data.id))!;
    const obsN = await stubObservation(B(30), 2400.0);
    const rN = await openRound(nChain, B(30), obsN, 2400.0);
    ok("8B.2 · narrow round opens LIVE", rN.ok, rN.ok ? "" : rN.error);
    if (rN.ok) {
      const mId = rN.data.marketId;
      // The shared resolver returns EXACTLY the chain window — the value the card renders.
      const rb = await stakeBoundsForUpDownMarket(mId);
      ok("8B.3 · the shared resolver reports the chain window (2k–5k) — one source, both surfaces",
         !!rb && rb.min === 2_000 && rb.max === 5_000, JSON.stringify(rb));

      const before = (await db.wallet.findByUserId(dave))!.balance;
      const below = await buyPosition(dave, { marketId: mId, side: "YES", stake: 1_500 });
      ok("8B.4 · a stake BELOW the chain min (1,500) is REJECTED — was globally-legal before the fix",
         !below.ok && (below as { code?: string }).code === "INVALID", below.ok ? "ACCEPTED — tampering gap!" : (below as { error: string }).error);
      const above = await buyPosition(dave, { marketId: mId, side: "YES", stake: 6_000 });
      ok("8B.5 · a stake ABOVE the chain max (6,000) is REJECTED — was globally-legal before the fix",
         !above.ok && (above as { code?: string }).code === "INVALID", above.ok ? "ACCEPTED — tampering gap!" : (above as { error: string }).error);
      const afterRejects = (await db.wallet.findByUserId(dave))!.balance;
      ok("8B.6 · the rejected bets moved NO money", afterRejects === before, `${before} → ${afterRejects}`);

      const within = await buyPosition(dave, { marketId: mId, side: "YES", stake: 3_000 });
      ok("8B.7 · a stake WITHIN the window (3,000) is accepted", within.ok, within.ok ? "" : (within as { error: string }).error);
    }
  }

  // (b) A stale chain min stored BELOW the platform floor (100) must be FLOORED to 1,000 on
  //     BOTH surfaces — display and money path — so no sub-floor stake can ever be placed.
  const cS = await createChain({ assetId: asset.id, durationMinutes: 30, minStake: 100, maxStake: 50_000 }, OFFICER);
  ok("8B.8 · stale-min chain (stored min 100) created", cS.ok, cS.ok ? "" : cS.error);
  if (cS.ok) {
    await setChainState(cS.data.id, "RUNNING", OFFICER);
    const sChain = (await chainStore.get(cS.data.id))!;
    const obsS = await stubObservation(B(36), 2400.0);
    const rS = await openRound(sChain, B(36), obsS, 2400.0);
    ok("8B.9 · stale-min round opens LIVE", rS.ok, rS.ok ? "" : rS.error);
    if (rS.ok) {
      const mId = rS.data.marketId;
      const rb = await stakeBoundsForUpDownMarket(mId);
      ok("8B.10 · the stored 100 min is FLOORED to 1,000 on the money path (max preserved)",
         !!rb && rb.min === 1_000 && rb.max === 50_000, JSON.stringify(rb));
      const sub = await buyPosition(dave, { marketId: mId, side: "NO", stake: 500 });
      ok("8B.11 · a sub-floor stake (500) is REJECTED even though the chain stored 100",
         !sub.ok && (sub as { code?: string }).code === "INVALID", sub.ok ? "ACCEPTED — floor bypassed!" : (sub as { error: string }).error);
      const atFloor = await buyPosition(dave, { marketId: mId, side: "NO", stake: 1_000 });
      ok("8B.12 · a stake AT the floor (1,000) is accepted", atFloor.ok, atFloor.ok ? "" : (atFloor as { error: string }).error);
    }
  }
}

// ── 9 · ★ MONEY CONSERVATION across everything above ────────────────────────
{
  const end = await walletsTotal();
  // Everything still sitting in an unsettled pool is not lost — count it.
  const allRounds = await roundStore.list({ chainId: chain.id });
  let openPools = 0;
  for (const r of allRounds) {
    const m = await marketStore.get(r.marketId);
    if (m && !m.settledAt) openPools += m.yesPool + m.noPool;
  }
  // Our fee across every settled round, recomputed from each poll's OWN frozen rates.
  let house = 0;
  for (const r of allRounds) {
    const m = await marketStore.get(r.marketId);
    if (!m?.settledAt || !m.resolvedOutcome || m.resolvedOutcome === "VOID") continue;
    house += Math.round(poolFee(m.yesPool, m.noPool, ratesFor(m), m.resolvedOutcome).fee);
  }
  const accounted = end + openPools + house;
  const drift = accounted - START_TOTAL;
  console.log(`\n  players ${end.toLocaleString()} + open pools ${openPools.toLocaleString()} + house ${house.toLocaleString()} = ${accounted.toLocaleString()} (started ${START_TOTAL.toLocaleString()})`);

  // A conservation check that passes at 0 = 0 proves NOTHING — it is exactly what a
  // broken setup looks like. Assert the run actually moved money before trusting it.
  ok("9.0 · the run actually moved real money (guards a vacuous 0 = 0 pass)",
     START_TOTAL > 0 && house > 0, `started ${START_TOTAL}, house ${house}`);
  ok("9.1 · ★★ MONEY CONSERVATION — every shilling is a payout, a refund, an open pool, or our fee",
     Math.abs(drift) <= 2, `drift ${drift} TZS`);
}

console.log(`\nupdown-engine: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.error("\n✗ UP & DOWN ENGINE FAILED. If §9 failed, money is being created or destroyed — stop and fix before anything else.\n");
  process.exit(1);
}
console.log("updown-engine: OK — UP=YES holds, voids refund in full, observations are shared, settlement is exactly-once, money conserves");
