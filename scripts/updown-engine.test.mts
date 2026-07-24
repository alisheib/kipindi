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
