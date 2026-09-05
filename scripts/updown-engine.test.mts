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
  stakeBoundsForUpDownMarket, setUpDownConfig, getUpDownConfig,
} from "../src/lib/server/updown-config.ts";
import {
  decideOutcome, decideOutcomeByTargets, outcomeToSide, minMoveFor, roundTitle,
  openRound, closeRound, advanceChain,
} from "../src/lib/server/updown-service.ts";
import { marketStore } from "../src/lib/server/market-dal.ts";
import { buyPosition, listPositionsForMarket, ratesFor, createMarket } from "../src/lib/server/market-service.ts";
import { addSource, seedDefaultSources } from "../src/lib/server/source-registry.ts";
import { db } from "../src/lib/server/store.ts";
import { poolFee } from "../src/lib/payout.ts";

import "./lib/verified-fixtures.mts";
let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const OFFICER = "usr_officer";
__resetUpDownMemoryStores();
__resetUpDownConfig();
await seedDefaultSources();
await addSource({ domain: "kitco.com", label: "Kitco", category: "macro", rationale: "spot metals", addedBy: "system" });
// The 24/7 fixture's source, and the shut-market fixture's (§12) — both categories needed,
// because `isSourceTrusted` matches on (domain, category).
await addSource({ domain: "kitco.com", label: "Kitco", category: "crypto", rationale: "test fixture", addedBy: "system" });
// The 24/7 fixture's real source. Mirrors production, where `twelvedata.com` is the
// trusted crypto domain and every live BTC round has resolved against it.
await addSource({ domain: "api.twelvedata.com", label: "Twelve Data", category: "crypto", rationale: "test fixture", addedBy: "system" });

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
// ⚠️ E-36 · THE FIXTURE IS A 24/7 ASSET ON PURPOSE, and this is not cosmetic. The money path
// now refuses to open or settle a round while the asset's market is shut (`market-calendar.ts`),
// because the provider quotes metals and FX right through the weekend and 20-95% of those
// rounds would otherwise RESOLVE on a tape the named market never produced. This suite anchors
// its grid to `Date.now()`, so a `macro` fixture made every case here pass Monday-Friday and
// FAIL at the weekend — a suite whose verdict depends on the day it runs is a suite that lies.
// A crypto asset is calendar-independent, which is what a test about grid maths, conservation
// and write-once observations actually wants. The calendar itself is proven by
// `npm run test:market-calendar`, and §12 below pins the integration case.
//
// 🔴 …AND IT USED TO SAY THAT WHILE CREATING `XAU/USD` WITH `category: "crypto"` — a gold
// symbol wearing a crypto calendar, which is precisely the misconfiguration E-46 was filed
// about (BNB and ETH, created the same way, produced nothing for days). Session 14 added the
// server-side `validateSymbolCategory` that makes that impossible, and this fixture has failed
// on every tree since: `XAU/USD must be category "macro", not "crypto"`. The intent above was
// always right and the symbol was always wrong — so the symbol is now an actual 24/7 asset from
// the catalogue rather than a metal relabelled as one.
const a = await createAsset({
  key: "BTC", symbol: "BTC/USD", nameEn: "Bitcoin", nameSw: "Bitcoin", iconKey: "crypto",
  priceSourceUrl: "https://api.twelvedata.com/quote", category: "crypto",
  decimals: 2, minMoveTicks: 2,
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
  // ⚠️ 0.02, not 0.01 — `MIN_MOVE_TICKS_FLOOR` is 2 since 2026-08-04. At one tick the winning
  // band is the same size as the price's own rounding error, so the round could be decided by
  // `toFixed` rather than by the market (§6ad scenario 1; `test:updown-margin` holds the rule).
  ok("1.1 · minMove is the asset's tick floor at its precision", mm === 0.02, String(mm));
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
  // Asserted against the asset's OWN name, not a hardcoded "Gold" — the fixture's asset
  // changed once (see the E-46 note above) and a literal here failed for the one reason a
  // test never should: the thing it names was renamed.
  ok("1.9 · the round title names the product, not the repo",
     roundTitle(asset, 5).includes(`${asset.nameEn} Up or Down`) && !roundTitle(asset, 5).toLowerCase().includes("kipindi"),
     roundTitle(asset, 5));
  // The platform is trilingual and enforces parity — an untranslated round would fall
  // back to English for SW/ZH players.
  ok("1.10 · the title exists in all THREE languages, each distinct",
     new Set([roundTitle(asset, 5, "en"), roundTitle(asset, 5, "sw"), roundTitle(asset, 5, "zh")]).size === 3,
     `${roundTitle(asset, 5, "sw")} | ${roundTitle(asset, 5, "zh")}`);
}

// ── 1B · The MARGIN outcome rule (pure) — the PDF's winning boundaries ────────
{
  // PDF example: base 4120, 0.5% margin → up 4140.6, down 4099.4.
  ok("1B.1 · close ABOVE the up target is UP", decideOutcomeByTargets(4145, 4140.6, 4099.4).outcome === "UP");
  ok("1B.2 · close EXACTLY at the up target is UP (≥ boundary wins)", decideOutcomeByTargets(4140.6, 4140.6, 4099.4).outcome === "UP");
  ok("1B.3 · close BELOW the down target is DOWN", decideOutcomeByTargets(4095, 4140.6, 4099.4).outcome === "DOWN");
  ok("1B.4 · close EXACTLY at the down target is DOWN (≤ boundary wins)", decideOutcomeByTargets(4099.4, 4140.6, 4099.4).outcome === "DOWN");
  const inBand = decideOutcomeByTargets(4110, 4140.6, 4099.4);
  ok("1B.5 · close INSIDE the band voids — moved less than the margin", inBand.outcome === "VOID" && inBand.voidReason === "no-move");
  ok("1B.6 · a missing close price voids as source-failed", decideOutcomeByTargets(null, 4140.6, 4099.4).voidReason === "source-failed");
  ok("1B.7 · missing targets void as source-failed (a legacy round has none)", decideOutcomeByTargets(4110, null, null).voidReason === "source-failed");
  ok("1B.8 · a hair BELOW the up target is still in-band (VOID), not UP", decideOutcomeByTargets(4140.59, 4140.6, 4099.4).outcome === "VOID");
  ok("1B.9 · a hair ABOVE the down target is still in-band (VOID), not DOWN", decideOutcomeByTargets(4099.41, 4140.6, 4099.4).outcome === "VOID");
}

// ── Helper: a confirmed observation at a boundary, without touching the API ──
// `assetId` defaults to the suite's main asset; §12's calendar control needs the GOLD one,
// because since E-83 an open without a confirmed price does not happen at all.
async function stubObservation(boundaryIso: string, price: number, assetId?: string) {
  const o = await observationStore.ensure(assetId ?? asset.id, boundaryIso);
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
  // ⭐ INVERTED 2026-08-14 (A2): Up & Down charges `loser-share`, 13% of the LOSING side,
  // the same as long-form polls. It froze capped-commission @ 13% of the pool until then.
  // docs/RULES.md §2.1. The full cutover proof, with a legacy round settling beside a new
  // one, is `npm run test:updown-cutover`.
  const rates = ratesFor(m);
  ok("2.3 · the round froze loser-share @ 3% + 10% of the losing side",
     rates.feeModel === "loser-share" && rates.platformFeeRate === 0.03 && rates.operatorFeeRate === 0.10,
     `${rates.feeModel} @ ${rates.platformFeeRate}+${rates.operatorFeeRate}`);

  // The "× 1.4 est." headline is display-only, but it must SURVIVE the snapshot — those
  // two fields used to be zeroed on any non-loser-share model, which would have made the
  // card impossible to build honestly.
  ok("2.3b · the display estimate survives the snapshot (× 1.4)",
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
  // ⭐ INVERTED 2026-08-14 (A2). A balanced 200,000 pool used to yield TZS 26,000 (13% of
  // the pool). Under loser-share it yields TZS 13,000 — 13% of the 100,000 that lost.
  // Halving our income on a balanced round is the accepted, recorded cost of one charge
  // model the customer can understand (docs/RULES.md §1).
  const expected = poolFee(100_000, 100_000, rates, "YES");
  ok("2.9 · fee on a balanced 200,000 pool is 13% of the LOSING 100,000 = TZS 13,000",
     Math.round(expected.fee) === 13_000, String(Math.round(expected.fee)));

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
  // 🔴 REWRITTEN 2026-08-05 (E-83), AND PRODUCTION IS WHY. These two used to assert that the
  // chain opens the next round REGARDLESS — "a slow source cannot freeze the game". That
  // sounds right and it is not: the round it opens has no open price, so it cannot resolve.
  // On production a RUNNING chain did exactly this for eleven hours and voided **175
  // consecutive rounds** with `source-failed`, every one taking stakes, showing a countdown
  // and refunding. `generateRoundNow` refuses in the same situation and says why.
  //
  // ⭐ The legitimate half of the old concern is kept and still tested: a pending CLOSE must
  // not block progress. It does not — the close is deferred and retried, and §3's deadline
  // still terminates it. What has changed is that the OPEN now waits for its own price, which
  // lands ~19-35s later (BTC/ETH/XAU, measured live), so the round opens seconds late rather
  // than being born unresolvable. And the wait is BOUNDED — past `abandonAfterSeconds` the
  // boundary is skipped, which 7.4 pins, so a permanently dead source cannot freeze the chain.
  ok("7.2 · ⭐ E-83 — the chain does NOT open a priceless round; it waits for the price",
     roundsAfter === roundsBefore && adv.opened === false, `${roundsBefore} → ${roundsAfter} opened=${adv.opened}`);
  const after = (await chainStore.get(chain.id))!;
  ok("7.3 · and it RETRIES the same boundary rather than consuming it unpriced",
     after.nextBoundaryAt === B(7), `${after.nextBoundaryAt} (expected ${B(7)})`);

  // ⛔ THE BOUND — without this, 7.2/7.3 would describe a chain that can hang forever.
  // A boundary far enough in the past is abandoned and the chain re-arms ahead of it.
  const STALE_BOUNDARY = new Date(Date.now() - 3600_000).toISOString();
  await chainStore.patch(chain.id, { nextBoundaryAt: STALE_BOUNDARY });
  const advOld = await advanceChain(chain.id);
  const afterOld = (await chainStore.get(chain.id))!;
  ok("7.4 · ⭐ a boundary that can never be priced is ABANDONED, not retried forever",
     Date.parse(afterOld.nextBoundaryAt!) > Date.parse(STALE_BOUNDARY),
     `${afterOld.nextBoundaryAt} · ${advOld.detail ?? ""}`);
}

// ── 8 · Idempotency — a duplicate fire settles exactly once ─────────────────
{
  const openObs = await stubObservation(B(10), 2400.00);
  const r = await openRound(chain, B(10), openObs, 2400.00);
  if (!r.ok) throw new Error(r.error);
  const m = (await marketStore.get(r.data.marketId))!;
  await buyPosition(alice, { marketId: m.id, side: "YES", stake: 20_000 });
  await buyPosition(carol, { marketId: m.id, side: "NO", stake: 20_000 });
  const closeObs = await stubObservation(B(11), 2415.00);
  const before = await walletsTotal();
  const [c1, c2, c3] = await Promise.all([
    closeRound(r.data.id, closeObs, 2415.00),
    closeRound(r.data.id, closeObs, 2415.00),
    closeRound(r.data.id, closeObs, 2415.00),
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
  await closeRound(rq.data.id, await stubObservation(B(23), 2430.00), 2430.00);
  const pq = await listPositionsForMarket(mq.id);
  ok("8b.6 · a one-sided round refunds EVERY stake in full (finalPayout == stake)",
     pq.every((p) => (p.finalPayout ?? -1) === p.stake), pq.map((p) => `${p.stake}→${p.finalPayout}`).join(", "));
  ok("8b.7 · ★ a one-sided round earns the house NOTHING (0 fee)",
     Math.round(poolFee(mq.yesPool, mq.noPool, ratesFor(mq), "YES").fee) === 0);
  ok("8b.8 · ★ and costs the players nothing net — wallets return to pre-round",
     (await walletsTotal()) === beforeQ, `${beforeQ} → ${await walletsTotal()}`);

  // Round R — ONE ACCOUNT, BOTH SIDES, SETTLING PER POSITION (Ali, 2026-08-14).
  //
  // ⚠️ THIS SECTION HAS BEEN WRITTEN THREE TIMES AND THE MECHANICS NEVER MOVED. It originally
  // proved exactly what it proves again now: one player backing both sides, each position
  // settling on its own, the winning leg paying and the losing leg losing. From 2026-08-04 a
  // "one account, one side" guard made the state unreachable and the section was re-framed as
  // a refusal. RULES.md §2.4 removed the guard on 2026-08-14, so the original scenario is the
  // live one again — and it is now the ONLY place the per-position settlement of a single
  // account's opposing legs is exercised at all.
  //
  // ⛔ THE HEDGE IS PERMITTED AS A BET AND WORTHLESS AS WAGERING. That second half is
  // `npm run test:bonus-one-side`; it needs a grant to be visible, so it cannot live here.
  const or = await stubObservation(B(24), 2400.00);
  const rr = await openRound(chain, B(24), or, 2400.00);
  if (!rr.ok) throw new Error(rr.error);
  const mr = (await marketStore.get(rr.data.marketId))!;
  const beforeR = (await db.wallet.findByUserId(alice))!.balance;
  const legOne = await buyPosition(alice, { marketId: mr.id, side: "YES", stake: 15_000, idempotencyKey: "hedge-yes" });
  const legTwo = await buyPosition(alice, { marketId: mr.id, side: "NO", stake: 15_000, idempotencyKey: "hedge-no" });
  await buyPosition(bob, { marketId: mr.id, side: "NO", stake: 10_000 });
  const afterStakes = (await db.wallet.findByUserId(alice))!.balance;
  ok("8b.9 · ⭐ ONE account holds BOTH sides — the 2026-08-04 guard is gone",
     legOne.ok && legTwo.ok, `first=${legOne.ok} second=${legTwo.ok}`);
  ok("8b.9b · and BOTH stakes left the wallet — an 'accepted' that dropped the second stake would read the same",
     beforeR - afterStakes === 30_000, `Δ${beforeR - afterStakes}`);
  await closeRound(rr.data.id, await stubObservation(B(25), 2415.00), 2415.00);
  const pr = await listPositionsForMarket(mr.id);
  const aliceYes = pr.find((p) => p.userId === alice && p.side === "YES")!;
  const aliceNo = pr.find((p) => p.userId === alice && p.side === "NO")!;
  const bobNo = pr.find((p) => p.userId === bob && p.side === "NO")!;
  ok("8b.10 · ⛔ positions settle INDEPENDENTLY — the SAME account's winning leg wins and its losing leg loses",
     aliceYes.status === "WIN" && aliceNo.status === "LOSS" && bobNo.status === "LOSS",
     `aliceYES=${aliceYes.status} aliceNO=${aliceNo.status} bob=${bobNo.status}`);
  const afterSettle = (await db.wallet.findByUserId(alice))!.balance;
  ok("8b.11 · the wallet moves by exactly the winning leg's payout — the losing leg returns nothing",
     afterSettle - afterStakes === (aliceYes.finalPayout ?? 0) && (aliceNo.finalPayout ?? 0) === 0,
     `Δ${afterSettle - afterStakes} vs payout ${aliceYes.finalPayout} · losing leg ${aliceNo.finalPayout}`);
  // ⭐ THE HEDGE IS A GAMBLE, NOT A FREE LUNCH — AND NOT A GUARANTEED LOSS EITHER.
  //
  // 🔴 THIS ASSERTION FIRST READ *"hedging both sides COSTS the player — they end down,
  // never level"* AND IT WAS FALSE. Executed, it went red: Alice staked 30,000 and finished
  // **6,750 UP**, because her YES leg was the ENTIRE winning pool and Bob's 10,000 funded it.
  // The claim was wrong for exactly the reason the player copy rewritten in the same commit
  // now states (`hedgeBothBody` — a small hedge on the thin side of a lopsided market can pay
  // many times both stakes). A test asserting a slogan rather than a fact is how a slogan
  // gets shipped onto a money surface.
  //
  // What is TRUE, and is what this now proves by computing the other outcome from the SAME
  // pools through the SAME fee function: the two legs pay a PROFIT on one result and a LOSS
  // on the other, so holding both sides is a genuine market position with a genuine risk.
  // ⛔ The property the rules rely on is not "hedging loses money" — it is "hedging earns no
  // WAGERING progress", and that lives in `npm run test:bonus-one-side`.
  const hedgeStaked = 30_000;
  const wonWith = afterSettle - afterStakes;                       // YES won: the realised return
  const feeIfNo = poolFee(mr.yesPool, mr.noPool, ratesFor(mr), "NO");
  const wouldHaveWith = Math.round((15_000 / mr.noPool) * feeIfNo.netPool); // her NO leg alone
  ok("8b.12 · ⭐ this hedge PROFITED on the outcome that landed",
     wonWith > hedgeStaked, `staked ${hedgeStaked}, returned ${wonWith}`);
  ok("8b.13 · ⭐ …and the SAME two legs would have LOST on the other outcome — it is a real risk",
     wouldHaveWith < hedgeStaked,
     `if NO had won: ${wouldHaveWith} on ${hedgeStaked} staked (Δ${wouldHaveWith - hedgeStaked})`);
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
  // ⛔ THE DOOR NOW REFUSES A SUB-FLOOR MIN (2026-08-14) — the platform minimum is a rule,
  //    not a setting — so this scenario can no longer be built through createChain. That is
  //    the point: it is a LEGACY ROW, not an operator action, and it is written straight
  //    through the DAL to say so. Both halves are asserted: the door refuses, AND the
  //    read-path floor still catches a row that predates the door. Defence in depth means
  //    tightening the door must not delete the proof that the floor works without it.
  const refusedLow = await createChain({ assetId: asset.id, durationMinutes: 45, minStake: 100, maxStake: 50_000 }, OFFICER);
  ok("8B.7 · the admin door REFUSES a sub-floor chain minimum", !refusedLow.ok,
     refusedLow.ok ? "ACCEPTED — the rule is not enforced at the door" : refusedLow.error);
  const cS = await createChain({ assetId: asset.id, durationMinutes: 30, minStake: 1_000, maxStake: 50_000 }, OFFICER);
  ok("8B.8 · stale-min chain created legally, then back-dated to a stored min of 100", cS.ok, cS.ok ? "" : cS.error);
  if (cS.ok) {
    await chainStore.patch(cS.data.id, { minStake: 100 });   // the legacy row, as it exists on disk
    await setChainState(cS.data.id, "RUNNING", OFFICER);
    const sChain = (await chainStore.get(cS.data.id))!;
    ok("8B.8b · …and the row really does hold 100", sChain.minStake === 100, String(sChain.minStake));
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

// ── 10 · ★ THE MARGIN MODEL end-to-end — the PDF's base ± 0.5% boundaries ─────
{
  // `crypto` for the calendar reason in the header note — this section is about the margin
  // model, not about equity trading hours.
  //
  // 🔴 This fixture was `SPX`, and the catalogue now refuses it outright with a reason worth
  // reading: SPX is not on the Twelve Data plan AND it trades a cash session the platform's
  // calendar does not model, so `macro` would call it open all week. Nothing in this section
  // depends on the asset's identity — only on its decimals, tick floor and price level — so it
  // is a 24/7 catalogue asset now. The prices below are unchanged, which is the point: the
  // margin arithmetic is about the numbers, not the ticker.
  const spx = await createAsset({
    key: "ETH", symbol: "ETH/USD", nameEn: "Ethereum", nameSw: "Ethereum", nameZh: "以太坊", iconKey: "crypto",
    priceSourceUrl: "https://api.twelvedata.com/quote", category: "crypto",
    decimals: 2, minMoveTicks: 2,
  }, OFFICER);
  if (!spx.ok) throw new Error(spx.error);
  await setAssetEnabled(spx.data.id, true, OFFICER);
  const spxAsset = (await assetStore.get(spx.data.id))!;
  const spxC = await createChain({ assetId: spxAsset.id, durationMinutes: 5 }, OFFICER);
  if (!spxC.ok) throw new Error(spxC.error);
  await setChainState(spxC.data.id, "RUNNING", OFFICER);
  const spxChain = (await chainStore.get(spxC.data.id))!;
  // ⚠️ E-32. This section's subject is the PDF pricing example (base 4120, 0.5% → up 4140.6,
  // down 4099.4) and the arithmetic around it — NOT whatever the product default happens to
  // be. Since the margin ladder shipped, a 5-minute round inherits 0.02%, so a section that
  // silently leaned on 0.5% was testing the default, not the maths. The ladder is therefore
  // pinned to 50 bps for this block and restored at the end of it: the chain still stores NO
  // override, so the INHERITANCE path is what gets exercised, which is the point of 10.0.
  const spxLadderRestore = (await getUpDownConfig()).marginSchedule;
  await setUpDownConfig({ marginSchedule: [{ category: "*", maxDurationMinutes: 5, bps: 50 }] }, OFFICER);
  ok("10.0 · a fresh chain stores no override and inherits the ladder", spxChain.marginBps === null);

  const dan = await fundedUser("ud_dan", 500_000);
  const eve = await fundedUser("ud_eve", 500_000);
  const twoWallets = async () => (await db.wallet.findByUserId(dan))!.balance + (await db.wallet.findByUserId(eve))!.balance;
  const anchor2 = cleanGridAnchor(Date.now() + 120_000);
  const SB = (k: number) => new Date(anchor2 + k * 5 * 60_000).toISOString();
  const stubSpx = async (iso: string, price: number) => {
    const o = await observationStore.ensure(spxAsset.id, iso);
    await observationStore.confirm(o.id, { price, sourceUrl: spxAsset.priceSourceUrl, sourceQuotedAt: iso, evidence: `SPX ${price}`, confidence: 96, model: "test-stub", rawHash: `sh${price}-${iso}` });
    return o.id;
  };

  // 10a — the PDF example, FROZEN on the round: base 4120 → up 4140.6, down 4099.4.
  const r0 = await openRound(spxChain, SB(0), await stubSpx(SB(0), 4120.00), 4120.00);
  if (!r0.ok) throw new Error(r0.error);
  const round0 = (await roundStore.get(r0.data.id))!;
  ok("10.1 · ⛔ the PDF example freezes on the round: base 4120, 0.5% → up 4140.6, down 4099.4",
     round0.marginBps === 50 && round0.upTarget === 4140.6 && round0.downTarget === 4099.4,
     `bps=${round0.marginBps} up=${round0.upTarget} down=${round0.downTarget}`);
  const m0 = (await marketStore.get(r0.data.marketId))!;
  await buyPosition(dan, { marketId: m0.id, side: "YES", stake: 50_000 });
  await buyPosition(eve, { marketId: m0.id, side: "NO", stake: 50_000 });
  const c0 = await closeRound(r0.data.id, await stubSpx(SB(1), 4145.00), 4145.00);
  ok("10.2 · close 4145 reached the up target (4140.6) → UP, and it SETTLES",
     c0.ok && c0.data.outcome === "UP" && c0.data.settled === true, c0.ok ? c0.data.outcome : c0.error);

  // 10b — a real move SMALLER than the margin → VOID + full refund (the key new behaviour).
  const rB = await openRound(spxChain, SB(1), await stubSpx(SB(1), 4145.00), 4145.00);
  if (!rB.ok) throw new Error(rB.error);
  const roundB = (await roundStore.get(rB.data.id))!;
  const mB = (await marketStore.get(rB.data.marketId))!;
  const beforeB = await twoWallets();
  await buyPosition(dan, { marketId: mB.id, side: "YES", stake: 20_000 });
  await buyPosition(eve, { marketId: mB.id, side: "NO", stake: 20_000 });
  // Base 4145 → margin ≈ 20.7 → band ≈ [4124.3, 4165.7]. Close 4150 moved +5 < margin → VOID.
  const cB = await closeRound(rB.data.id, await stubSpx(SB(2), 4150.00), 4150.00);
  ok("10.3 · ⛔ a +5 move that DIDN'T reach the boundary (margin ≈ 20.7) VOIDs — no-move",
     cB.ok && cB.data.outcome === "VOID" && (await roundStore.get(rB.data.id))!.voidReason === "no-move",
     `up=${roundB.upTarget} down=${roundB.downTarget} close=4150 → ${cB.ok ? cB.data.outcome : cB.error}`);
  ok("10.4 · ★ the in-band void refunds every stake in full", (await twoWallets()) === beforeB, `${beforeB} → ${await twoWallets()}`);

  // 10c — DOWN at the lower boundary settles as NO (UP=YES / DOWN=NO holds).
  const rD = await openRound(spxChain, SB(2), await stubSpx(SB(2), 4150.00), 4150.00);
  if (!rD.ok) throw new Error(rD.error);
  const mD = (await marketStore.get(rD.data.marketId))!;
  await buyPosition(dan, { marketId: mD.id, side: "YES", stake: 10_000 });
  await buyPosition(eve, { marketId: mD.id, side: "NO", stake: 10_000 });
  // Base 4150 → down ≈ 4129.25. Close 4100 is well below → DOWN.
  const cD = await closeRound(rD.data.id, await stubSpx(SB(3), 4100.00), 4100.00);
  ok("10.5 · close 4100 reached the down boundary → DOWN → NO is paid",
     cD.ok && cD.data.outcome === "DOWN" && (await marketStore.get(mD.id))!.resolvedOutcome === "NO",
     cD.ok ? cD.data.outcome : cD.error);

  // 10d — a LEGACY round (targets null, opened before the margin model) falls back to the
  // openPrice ± minMove rule and still settles. Hand-built to simulate a pre-migration row.
  const legacyMkt = await createMarket({
    titleEn: "SPX legacy round", titleSw: "SPX legacy", titleZh: "SPX legacy",
    category: "macro", sourceUrl: spxAsset.priceSourceUrl,
    resolutionCriterion: "legacy openPrice±minMove", resolutionAt: SB(20), selectionClosedAt: null,
    proposedBy: "system_updown", productLine: "UPDOWN",
  });
  await roundStore.create({
    id: "udr_legacy_1", chainId: spxChain.id, marketId: legacyMkt.id, roundNumber: 9001,
    opensAt: SB(19), closesAt: SB(20), boundaryAt: SB(20),
    openObservationId: null, closeObservationId: null,
    openPrice: 4120.00, closePrice: null,
    marginBps: null, upTarget: null, downTarget: null,
    outcome: null, voidReason: null, resolvedAt: null, settledAt: null,
    createdAt: nowIso(), updatedAt: nowIso(),
  } as never);
  await buyPosition(dan, { marketId: legacyMkt.id, side: "YES", stake: 10_000 });
  await buyPosition(eve, { marketId: legacyMkt.id, side: "NO", stake: 10_000 });
  const cL = await closeRound("udr_legacy_1", null, 4121.00); // +1.00 > minMove 0.01 → UP via fallback
  ok("10.6 · ⛔ a legacy round (null targets) falls back to openPrice±minMove and settles UP",
     cL.ok && cL.data.outcome === "UP", cL.ok ? cL.data.outcome : cL.error);

  // 10e — conservation across the margin chain: players + open pools + house fees == start.
  const spxStart = 1_000_000; // dan + eve funded 500k each
  const spxEnd = await twoWallets();
  const spxRounds = await roundStore.list({ chainId: spxChain.id });
  let openPools = 0, house = 0;
  for (const rr of spxRounds) {
    const mm = await marketStore.get(rr.marketId);
    if (!mm) continue;
    if (!mm.settledAt) openPools += mm.yesPool + mm.noPool;
    else if (mm.resolvedOutcome && mm.resolvedOutcome !== "VOID") house += Math.round(poolFee(mm.yesPool, mm.noPool, ratesFor(mm), mm.resolvedOutcome).fee);
  }
  // The legacy round is on spxChain, so it's already counted in the loop above.
  const drift = (spxEnd + openPools + house) - spxStart;
  ok("10.7 · ★★ MONEY CONSERVATION under the margin model — payout, refund, open pool, or fee",
     Math.abs(drift) <= 2, `drift ${drift} TZS (players ${spxEnd} + pools ${openPools} + house ${house})`);
  await setUpDownConfig({ marginSchedule: spxLadderRestore }, OFFICER);
}

// ── 11 · ⛔ FROZEN: a mid-round margin change cannot move a LIVE round's boundaries ──
{
  // ⚠️ E-32, as in §10: pin the ladder so this block tests FREEZING rather than the current
  // default. And the widening below must now change the LADDER — after E-32,
  // `defaultMarginBps` is not what a 5-minute round reads, so widening it would leave this
  // case passing while proving nothing about a config change it no longer responds to.
  const frozenLadderRestore = (await getUpDownConfig()).marginSchedule;
  await setUpDownConfig({ marginSchedule: [{ category: "*", maxDurationMinutes: 5, bps: 50 }] }, OFFICER);
  const rf = await openRound(chain, B(40), await stubObservation(B(40), 2400.00), 2400.00);
  if (!rf.ok) throw new Error(rf.error);
  const frozen = (await roundStore.get(rf.data.id))!;
  ok("11.1 · the round froze up 2412 / down 2388 at open (Gold 2400, 0.5%)",
     frozen.upTarget === 2412 && frozen.downTarget === 2388, `up=${frozen.upTarget} down=${frozen.downTarget}`);
  // The operator now WIDENS the margin a fresh round would take, to 5% (up 2520).
  await setUpDownConfig({ marginSchedule: [{ category: "*", maxDurationMinutes: 5, bps: 500 }] }, OFFICER);
  const stillFrozen = (await roundStore.get(rf.data.id))!;
  ok("11.2 · ⛔ after a config change to 5%, the LIVE round's targets are UNCHANGED (frozen at open)",
     stillFrozen.upTarget === 2412 && stillFrozen.downTarget === 2388, `up=${stillFrozen.upTarget}`);
  // Close at 2415: UP under the FROZEN 0.5% band (≥ 2412), but would be VOID under the NEW 5% band (< 2520).
  const cf = await closeRound(rf.data.id, await stubObservation(B(41), 2415.00), 2415.00);
  ok("11.3 · ⛔ it resolves by its FROZEN band → UP — a config edit can never re-price a bet already taken",
     cf.ok && cf.data.outcome === "UP", cf.ok ? cf.data.outcome : cf.error);
  await setUpDownConfig({ marginSchedule: frozenLadderRestore }, OFFICER); // restore
}

// ── 12 · ⛔ E-36 · THE EMITTER REFUSES A SHUT MARKET (integration) ───────────
// `market-calendar.test.mts` proves the calendar in isolation. This proves the money path
// CONSULTS it — the distinction that matters, and the one a pure unit test cannot make: a
// perfect calendar nothing calls is worth nothing. That is E-23's lesson, and E-31's.
//
// 🔴 E-95 · THE DATES ARE DERIVED, NOT TYPED — AND THIS SUITE ROTTED BECAUSE THEY WERE NOT.
//
// The comment here used to say "deterministic by construction: the boundary is pinned to a
// known Saturday, so this case says the same thing whatever day the suite runs." Half of that
// was true. The Saturday case creates no market, so a past date is harmless — but the WEEKDAY
// CONTROL below opens one, and it was pinned to `2026-08-05T12:00Z`, which was in the future
// when it was written and became the past at noon on 2026-08-05. `createMarket` refuses a
// market whose resolution is already past, so the suite stopped at an uncaught throw.
//
// ⛔ THE COST IS NOT THE FAILURE, IT IS THE SIGNAL. This is the suite whose own exit message
// reads *"If §9 failed, money is being created or destroyed — stop and fix before anything
// else"*, and from that moment it said so every single run, about nothing. A gate that cries
// wolf is worse than a missing gate, because the next person learns to scroll past it.
//
// So both boundaries are computed from `now`: the next Saturday and the next Wednesday that are
// strictly in the FUTURE. The case is as deterministic as it ever was — a Saturday is shut and a
// Wednesday is open in every week there will ever be — and it cannot expire.
{
  /** The next UTC `weekday` (0=Sun) at 12:00Z strictly after now. */
  const nextWeekdayNoonUtc = (weekday: number): string => {
    const d = new Date();
    d.setUTCHours(12, 0, 0, 0);
    // Strictly future: if today already is that weekday and noon has passed, go to next week.
    while (d.getUTCDay() !== weekday || d.getTime() <= Date.now()) d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString();
  };
  const SATURDAY = nextWeekdayNoonUtc(6);
  // ⛔ THE GUARD AGAINST THE ROT ITSELF. If either boundary is ever pinned to a literal again,
  // this fails on the day it expires instead of throwing out of `createMarket` with a message
  // about resolution dates that says nothing about what actually broke.
  ok("12.0 · ⛔ the calendar boundaries are in the FUTURE — a typed date expires, a derived one cannot",
     Date.parse(SATURDAY) > Date.now(), `SATURDAY=${SATURDAY} vs now=${new Date().toISOString()}`);
  const mAsset = await createAsset({
    key: "GOLDCAL", symbol: "XAU/USD", nameEn: "Gold cal", nameSw: "Dhahabu cal", iconKey: "gold",
    priceSourceUrl: "https://www.kitco.com/price/precious-metals", category: "macro",
    decimals: 2, minMoveTicks: 15,
  }, OFFICER);
  if (!mAsset.ok) throw new Error(mAsset.error);
  await setAssetEnabled(mAsset.data.id, true, OFFICER);
  const gold = (await assetStore.get(mAsset.data.id))!;
  // ⚠️ 15 MINUTES, NOT 5. Gold is 15m+ only since 2026-08-04 — its own feed disagrees with
  // itself by up to $0.87 at a single instant, about a whole 5-minute gold move. This section
  // is about the E-36 CALENDAR (a shut Saturday market opens nothing), and gold is exactly the
  // right asset for that; only the length had to move to one gold can actually run.
  const gc = await createChain({ assetId: gold.id, durationMinutes: 15 }, OFFICER);
  if (!gc.ok) throw new Error(gc.error);
  await setChainState(gc.data.id, "RUNNING", OFFICER);
  // Anchor the grid ON the Saturday boundary, so `advanceChain` reaches for exactly it.
  await chainStore.patch(gc.data.id, { gridAnchorAt: SATURDAY, nextBoundaryAt: SATURDAY });

  const before = (await roundStore.list({ chainId: gc.data.id })).length;
  const tick = await advanceChain(gc.data.id);
  const after = (await roundStore.list({ chainId: gc.data.id })).length;

  ok("12.1 · ⛔ no round is opened into a closed market", tick.opened === false && after === before,
     `opened=${tick.opened} rounds ${before}→${after}`);
  ok("12.2 · and the reason names the CALENDAR, not a missing price",
     /market closed/i.test(tick.detail ?? "") && /saturday/i.test(tick.detail ?? ""),
     tick.detail ?? "(no detail)");
  ok("12.3 · no observation was confirmed for that boundary either",
     tick.observation !== "confirmed", String(tick.observation));

  // …and the SAME chain on a weekday boundary DOES open. Without this, 12.1 would also pass
  // against a chain that is simply broken.
  const WEDNESDAY = nextWeekdayNoonUtc(3);
  ok("12.3b · ⛔ …and so is the weekday control, which is the one that opens a market",
     Date.parse(WEDNESDAY) > Date.now(), `WEDNESDAY=${WEDNESDAY} vs now=${new Date().toISOString()}`);
  await chainStore.patch(gc.data.id, { gridAnchorAt: WEDNESDAY, nextBoundaryAt: WEDNESDAY });
  // ⭐ E-83: the open now REQUIRES a confirmed price, so this control needs one — otherwise it
  // would refuse for want of a price and "pass" 12.1 for entirely the wrong reason, which is
  // the exact failure this control exists to prevent.
  await stubObservation(WEDNESDAY, 4180.00, gold.id);
  const tick2 = await advanceChain(gc.data.id);
  const after2 = (await roundStore.list({ chainId: gc.data.id })).length;
  ok("12.4 · ★ the same chain DOES open on a weekday boundary — the gate is the calendar, not a break",
     tick2.opened === true && after2 === before + 1,
     `opened=${tick2.opened} rounds ${before}→${after2} detail=${tick2.detail}`);
}

console.log(`\nupdown-engine: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.error("\n✗ UP & DOWN ENGINE FAILED. If §9 failed, money is being created or destroyed — stop and fix before anything else.\n");
  process.exit(1);
}
console.log("updown-engine: OK — UP=YES holds, voids refund in full, observations are shared, settlement is exactly-once, money conserves");
