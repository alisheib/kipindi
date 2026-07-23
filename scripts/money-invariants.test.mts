/**
 * Money-invariants suite (in-memory store; no DATABASE_URL) — Phase B.
 *
 * The unified, cross-path safety net. The per-path suites (ledger, wallet,
 * cashout, emergency, markets, officer) each prove one flow; this one drives a
 * realistic MIXED multi-user / multi-market workload through the REAL services
 * and asserts the system-wide money laws that must hold on EVERY path:
 *
 *   1. NO-NEGATIVE      — no wallet balance/hold/pending/bonus and no market
 *                         pool is ever < 0, checked after every mutation.
 *   2. NO-MINT          — the platform can never pay out more than the pool
 *                         holds; Σ payouts ≤ gross pool, always.
 *   3. CONSERVATION     — for a clean deposit→bet→resolve set, the players'
 *                         final balances + the house take (computed
 *                         INDEPENDENTLY from the configured fee rate, not from
 *                         the measured payouts) reconcile to the money that
 *                         entered, within rounding dust. A regression that
 *                         over- or under-pays breaks this beyond tolerance.
 *   4. VOID full-refund — a voided market returns every stake exactly; the
 *                         house takes nothing.
 *   5. IDEMPOTENCY      — a double-submitted bet (same idempotencyKey) debits
 *                         once and yields one position (the 2G double-tap).
 *   6. AUDITED          — every settlement writes a tamper-evident audit-chain
 *                         entry and the chain verifies end-to-end.
 */
import { db, type StoredWallet } from "../src/lib/server/store.ts";
import { createMarket, buyPosition, cashOutPosition, getMarket, resolveMarket, settleMarket, listPositionsForMarket, ratesFor, notifyClosingSoonMarkets, notifySelectionClosedMarkets, notifyDueMarketsForResolution } from "../src/lib/server/market-service.ts";
import { poolFee } from "../src/lib/payout.ts";
import { setGlobalConfig } from "../src/lib/server/market-config.ts";
import { positionStore } from "../src/lib/server/market-dal.ts";
import { getEffectiveConfig } from "../src/lib/server/market-config.ts";
import { auditFlush, verifyChain, auditRingSize, getAuditPage } from "../src/lib/server/audit.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}
const now = () => new Date().toISOString();
let seq = 0;
const marketIds: string[] = [];

async function fundedUser(id: string, balance: number): Promise<void> {
  await db.user.create({
    id, phoneE164: `+25599${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({
    id: `wal_${id}`, userId: id, balance, pending: 0, hold: 0,
    currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now(),
  } as StoredWallet);
}
const bal = async (uid: string) => (await db.wallet.findByUserId(uid))?.balance ?? -1;

async function makeMarket(): Promise<string> {
  const m = await createMarket({
    titleEn: "Invariant market", titleSw: "Soko la majaribio", category: "macro",
    sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves at the official date.",
    resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "test",
  } as never);
  marketIds.push(m.id);
  return m.id;
}

/**
 * Full two-officer resolution AND settlement.
 *
 * Since F11, stage-2 only ADJUDICATES — it records the verdict and opens the
 * objection window; no money moves until the window closes with no objection
 * standing. These invariants are about the payout MATHS, not about the gate, so
 * we force settlement here to exercise the money path directly. The gate itself
 * (money must NOT move while the window is open) is proven in
 * scripts/settlement-gate.test.mts, which never forces.
 */
async function resolve(marketId: string, outcome: "YES" | "NO" | "VOID") {
  await resolveMarket({ marketId, outcome, officerId: "officer_alpha" });
  const r = await resolveMarket({ marketId, outcome, officerId: "officer_beta" });
  await settleMarket(marketId, { force: true });
  return r;
}

/** THE universal safety net — no negative money anywhere in the system. */
async function assertNoNegatives(label: string): Promise<void> {
  let bad = "";
  for (const w of await db.wallet.listAll()) {
    if (w.balance < 0) bad = `${w.userId}.balance=${w.balance}`;
    else if (w.hold < 0) bad = `${w.userId}.hold=${w.hold}`;
    else if (w.pending < 0) bad = `${w.userId}.pending=${w.pending}`;
    else if ((w.bonusBalance ?? 0) < 0) bad = `${w.userId}.bonus=${w.bonusBalance}`;
    if (bad) break;
  }
  if (!bad) {
    for (const mid of marketIds) {
      const m = await getMarket(mid);
      if (m && (m.yesPool < 0 || m.noPool < 0)) { bad = `${mid} pool ${m.yesPool}/${m.noPool}`; break; }
    }
  }
  ok(`no negatives · ${label}`, bad === "", bad);
}

// ════════════════════════════════════════════════════════════════════════════
// 1 · CLEAN CONSERVATION — deposit → bet (both sides) → resolve, across markets.
//     Every winning position is held to settlement (no cashouts), so the
//     winning pool equals exactly the open winning stakes and the house take is
//     independently predictable from the fee rate.
// ════════════════════════════════════════════════════════════════════════════
let totalIn = 0;
const players: string[] = [];
async function player(id: string, deposit: number): Promise<string> {
  await fundedUser(id, deposit);
  totalIn += deposit;
  players.push(id);
  return id;
}

// A spread of markets with different pool shapes + winning sides.
type Bet = { uid: string; side: "YES" | "NO"; stake: number };
const scenarios: Array<{ bets: Bet[]; outcome: "YES" | "NO" }> = [
  { bets: [{ uid: "", side: "YES", stake: 10_000 }, { uid: "", side: "NO", stake: 10_000 }], outcome: "YES" },
  { bets: [{ uid: "", side: "YES", stake: 30_000 }, { uid: "", side: "NO", stake: 10_000 }], outcome: "NO" },  // favourite loses
  { bets: [{ uid: "", side: "YES", stake: 5_000 }, { uid: "", side: "YES", stake: 15_000 }, { uid: "", side: "NO", stake: 20_000 }], outcome: "YES" }, // two winners split
  { bets: [{ uid: "", side: "NO", stake: 7_333 }, { uid: "", side: "YES", stake: 12_500 }], outcome: "NO" },   // odd amounts → rounding
];

let expectedHouseTake = 0;   // Σ round(grossPool × feeRate) — INDEPENDENT of measured payouts
let measuredPayouts = 0;     // Σ actual wallet credit at settlement
let winnerCount = 0;

for (let s = 0; s < scenarios.length; s++) {
  const sc = scenarios[s];
  const mid = await makeMarket();
  // fund + place each bet with a fresh player
  const betPlayers: Array<{ uid: string; side: "YES" | "NO"; stake: number; before: number }> = [];
  for (let b = 0; b < sc.bets.length; b++) {
    const uid = await player(`inv_${s}_${b}`, 100_000);
    const before = await bal(uid);
    const r = await buyPosition(uid, { marketId: mid, side: sc.bets[b].side, stake: sc.bets[b].stake });
    ok(`bet placed m${s} b${b}`, r.ok, r.ok ? "" : (r as { error?: string }).error);
    ok(`stake debited exactly m${s} b${b}`, (await bal(uid)) === before - sc.bets[b].stake);
    betPlayers.push({ uid, side: sc.bets[b].side, stake: sc.bets[b].stake, before });
  }
  await assertNoNegatives(`after bets m${s}`);

  const mkt = (await getMarket(mid))!;
  const grossPool = mkt.yesPool + mkt.noPool;
  // The house take, computed INDEPENDENTLY of the measured payouts — that is the
  // whole point of this oracle. It re-derives the fee from the RULE against the
  // poll's own frozen rates — capped-commission (min(commission × pool, ceiling ×
  // smaller)) or loser-share (rate × losing pool) — so an over- or under-paying
  // regression in settlement breaks conservation instead of quietly agreeing with
  // itself. loser-share is outcome-dependent, so the oracle is told the winner.
  const fee = poolFee(
    mkt.yesPool,
    mkt.noPool,
    ratesFor(mkt),
    sc.outcome === "YES" || sc.outcome === "NO" ? sc.outcome : undefined,
  );
  expectedHouseTake += Math.round(fee.fee);

  // Snapshot balances, resolve, measure credits.
  const before = new Map<string, number>();
  for (const bp of betPlayers) before.set(bp.uid, await bal(bp.uid));
  const res = await resolve(mid, sc.outcome);
  ok(`resolve complete m${s}`, res.ok && res.data?.stage === "complete", JSON.stringify(res));

  let marketPayouts = 0;
  for (const bp of betPlayers) {
    const delta = (await bal(bp.uid)) - before.get(bp.uid)!;
    if (bp.side === sc.outcome) {
      ok(`winner credited m${s} ${bp.uid}`, delta > 0, `delta=${delta}`);
      marketPayouts += delta;
      winnerCount++;
    } else {
      ok(`loser unchanged m${s} ${bp.uid}`, delta === 0, `delta=${delta}`);
    }
  }
  measuredPayouts += marketPayouts;
  // NO-MINT: the pool can never pay out more than it holds.
  ok(`no-mint m${s} (payouts ≤ pool)`, marketPayouts <= grossPool, `payouts=${marketPayouts} pool=${grossPool}`);
  // Payouts ≈ net pool (gross − the capped fee), within per-winner rounding dust.
  const netPool = Math.round(fee.netPool);
  ok(`payouts ≈ net pool m${s}`, Math.abs(marketPayouts - netPool) <= sc.bets.length, `payouts=${marketPayouts} netPool=${netPool}`);

  // THE WINNER FLOOR — the invariant this whole model exists to guarantee.
  // Checked here on the real settlement path, on every scenario, for every winner.
  for (const bp of betPlayers) {
    if (bp.side !== sc.outcome) continue;
    const p = (await listPositionsForMarket(mid)).find((x) => x.userId === bp.uid);
    ok(
      `WINNER FLOOR m${s} ${bp.uid}: payout ≥ stake`,
      (p?.finalPayout ?? 0) >= bp.stake,
      `stake=${bp.stake} payout=${p?.finalPayout}`,
    );
  }
  await assertNoNegatives(`after resolve m${s}`);
}

// GLOBAL CONSERVATION — players' final balances + independently-computed house
// take reconcile to the money that entered the system, within rounding dust.
let sumFinal = 0;
for (const uid of players) sumFinal += await bal(uid);
const reconciled = sumFinal + expectedHouseTake;
const dust = winnerCount + scenarios.length + 2; // ≤0.5 TZS per rounded payout + house rounding
ok("GLOBAL conservation (final + house == in)", Math.abs(reconciled - totalIn) <= dust,
  `final=${sumFinal} house=${expectedHouseTake} reconciled=${reconciled} in=${totalIn} dust≤${dust}`);
ok("GLOBAL no-mint (Σ final ≤ Σ in)", sumFinal <= totalIn, `final=${sumFinal} in=${totalIn}`);
ok("house take is positive (fees collected)", expectedHouseTake > 0, `house=${expectedHouseTake}`);

// ════════════════════════════════════════════════════════════════════════════
// 2 · VOID full-refund — every stake returns exactly; the house takes nothing.
// ════════════════════════════════════════════════════════════════════════════
{
  const mid = await makeMarket();
  await fundedUser("void_a", 50_000);
  await fundedUser("void_b", 50_000);
  const aBefore = await bal("void_a");
  const bBefore = await bal("void_b");
  await buyPosition("void_a", { marketId: mid, side: "YES", stake: 20_000 });
  await buyPosition("void_b", { marketId: mid, side: "NO", stake: 15_000 });
  ok("void: stakes debited", (await bal("void_a")) === aBefore - 20_000 && (await bal("void_b")) === bBefore - 15_000);
  await assertNoNegatives("void after bets");

  const res = await resolve(mid, "VOID");
  ok("void resolve complete", res.ok && res.data?.stage === "complete", JSON.stringify(res));
  ok("void: player A fully refunded", (await bal("void_a")) === aBefore, `bal=${await bal("void_a")} expected=${aBefore}`);
  ok("void: player B fully refunded", (await bal("void_b")) === bBefore, `bal=${await bal("void_b")} expected=${bBefore}`);
  await assertNoNegatives("void after refund");
}

// ════════════════════════════════════════════════════════════════════════════
// 3 · CASHOUT then resolve — early exit pays stake−fee (fee to the house), the
//     whole stake leaves the pool, and the platform never mints.
// ════════════════════════════════════════════════════════════════════════════
// The default paidExitWindowMinutes is now 0 (the exit locks at the free window);
// this section tests the PAID early-exit path, so open an explicit paid window for
// it. (The default-policy lock is covered by cashout-fee / cashout-lockout.)
await setGlobalConfig({ paidExitWindowMinutes: 15 }, "officer_mi");
{
  const mid = await makeMarket();
  await fundedUser("co_x", 100_000); // cashes out
  await fundedUser("co_y", 100_000); // holds YES to settlement
  await fundedUser("co_z", 100_000); // holds NO (loses)
  const x = await buyPosition("co_x", { marketId: mid, side: "YES", stake: 10_000 });
  await buyPosition("co_y", { marketId: mid, side: "YES", stake: 10_000 });
  await buyPosition("co_z", { marketId: mid, side: "NO", stake: 20_000 });
  const posX = x.ok ? x.data!.positionId : "";
  // Move X past the 5-min free-exit grace window so the cash-out fee applies.
  const p = await positionStore.get(posX);
  if (p) { p.placedAt = new Date(Date.now() - 10 * 60_000).toISOString(); await positionStore.set(p); }

  const xBefore = await bal("co_x");
  const poolBeforeCashout = (await getMarket(mid))!.yesPool + (await getMarket(mid))!.noPool;
  const co = await cashOutPosition("co_x", posX);
  ok("cashout succeeded", co.ok, co.ok ? "" : (co as { error?: string }).error);
  const xGot = (await bal("co_x")) - xBefore;
  // Stake − the cash-out fee, at the poll's own frozen rate (10% default).
  const coRates = ratesFor((await getMarket(mid))!);
  const expectCo = Math.round(10_000 * (1 - coRates.cashOutFeeRate));
  ok(`cashout paid stake−fee (${expectCo} at ${coRates.cashOutFeeRate * 100}%)`, xGot === expectCo, `got=${xGot}`);

  // THE FEE LEAVES THE POOL. It used to be deducted from the player and then LEFT
  // IN THE POOL, where the remaining players collected it at settlement — so we
  // earned nothing on an early exit. The whole stake must now leave: the pool
  // drops by the full 10,000, not by the 9,000 the player received.
  const poolAfterCashout = (await getMarket(mid))!.yesPool + (await getMarket(mid))!.noPool;
  ok(
    "cashout: the WHOLE stake leaves the pool (fee does not stay behind)",
    poolBeforeCashout - poolAfterCashout === 10_000,
    `pool dropped ${poolBeforeCashout - poolAfterCashout}, expected 10,000 (player got ${xGot}, house kept ${10_000 - xGot})`,
  );
  ok("no double cashout", !(await cashOutPosition("co_x", posX)).ok);
  await assertNoNegatives("after cashout");

  const mkt = (await getMarket(mid))!;
  const grossPool = mkt.yesPool + mkt.noPool;
  const yBefore = await bal("co_y");
  const res = await resolve(mid, "YES");
  ok("cashout-market resolve complete", res.ok && res.data?.stage === "complete");
  const yGot = (await bal("co_y")) - yBefore;
  ok("remaining winner paid", yGot > 0, `yGot=${yGot}`);
  ok("cashout-market no-mint (payout ≤ pool)", yGot <= grossPool, `yGot=${yGot} pool=${grossPool}`);
  ok("loser (NO) unchanged", (await bal("co_z")) === 100_000 - 20_000, `bal=${await bal("co_z")}`);
  await assertNoNegatives("after cashout-market resolve");
}

// ════════════════════════════════════════════════════════════════════════════
// 4 · IDEMPOTENCY — a double-submitted bet (same key) debits once, one position.
// ════════════════════════════════════════════════════════════════════════════
{
  const mid = await makeMarket();
  await fundedUser("idem_u", 100_000);
  const before = await bal("idem_u");
  const key = "idem-key-2g-double-tap";
  const r1 = await buyPosition("idem_u", { marketId: mid, side: "YES", stake: 12_000, idempotencyKey: key });
  const r2 = await buyPosition("idem_u", { marketId: mid, side: "YES", stake: 12_000, idempotencyKey: key });
  ok("idempotent: both calls ok", r1.ok && r2.ok);
  ok("idempotent: same position id", r1.ok && r2.ok && r1.data!.positionId === r2.data!.positionId,
    r1.ok && r2.ok ? `${r1.data!.positionId} vs ${r2.data!.positionId}` : "");
  ok("idempotent: debited exactly once", (await bal("idem_u")) === before - 12_000, `bal=${await bal("idem_u")} expected=${before - 12_000}`);
  await assertNoNegatives("after idempotent double-submit");
}

// ════════════════════════════════════════════════════════════════════════════
// 12 · NO LOST STAKES — a market sweep running CONCURRENTLY with live betting
//      must not erase a single shilling of pool.
//
//      marketStore.set is a FULL-ROW upsert. Every sweep that merely stamps a
//      timestamp on a LIVE market used to read the row, spread it, and write the
//      whole thing back — so any bet that incremented the pool between that read
//      and that write had its stake silently ERASED. The market advisory lock was
//      the ONLY thing standing between that and lost player money, which is why
//      the lock cannot be dropped from the bet path until every such write is a
//      narrow stamp or an atomic delta.
//
//      This law is PERMANENT. If it ever fails, a sweep has gone back to writing
//      whole market rows and player stakes are being destroyed in production.
// ════════════════════════════════════════════════════════════════════════════
{
  const N = 12;
  const stake = 3_000;
  // The closing-soon sweep only touches a LIVE market whose cutoff is inside
  // CLOSING_SOON_WINDOW_MS (60 min); makeMarket() defaults to 7 days out.
  const soon = await createMarket({
    titleEn: "Sweep race market", titleSw: "Soko la majaribio", category: "macro",
    sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves at the official date.",
    resolutionAt: new Date(Date.now() + 30 * 60_000).toISOString(), proposedBy: "test",
  } as never);
  marketIds.push(soon.id);

  for (let i = 0; i < N; i++) await fundedUser(`sweep_u${i}`, 50_000);

  // Fire the sweeps INTO the middle of the burst, not before or after it.
  const bets = Array.from({ length: N }, (_, i) =>
    buyPosition(`sweep_u${i}`, { marketId: soon.id, side: i % 2 ? "YES" : "NO", stake }),
  );
  const sweeps = [
    notifyClosingSoonMarkets(),
    notifySelectionClosedMarkets(),
    notifyDueMarketsForResolution(),
    notifyClosingSoonMarkets(),
  ];
  const [betResults] = await Promise.all([Promise.all(bets), Promise.all(sweeps)]);

  const accepted = betResults.filter((r) => r.ok).length;
  const m = (await getMarket(soon.id))!;
  const positions = await listPositionsForMarket(soon.id);
  const sumStakes = positions.reduce((s, p) => s + p.stake, 0);

  ok("12: every bet placed during the sweep succeeded", accepted === N, `accepted=${accepted}/${N}`);
  ok("12: pool == Σ stakes (no stake erased by the sweep)",
    m.yesPool + m.noPool === sumStakes,
    `pool=${m.yesPool + m.noPool} Σstakes=${sumStakes} drift=${m.yesPool + m.noPool - sumStakes}`);
  ok("12: pool == accepted × stake", m.yesPool + m.noPool === accepted * stake,
    `pool=${m.yesPool + m.noPool} expected=${accepted * stake}`);
  ok("12: predictorCount matches positions", m.predictorCount === positions.length,
    `count=${m.predictorCount} positions=${positions.length}`);
  await assertNoNegatives("after sweep-vs-bets race");
}

// ════════════════════════════════════════════════════════════════════════════
// 5 · AUDITED — settlement wrote tamper-evident chain entries + chain verifies.
// ════════════════════════════════════════════════════════════════════════════
await auditFlush();
ok("audit chain has entries", auditRingSize() > 0, `size=${auditRingSize()}`);
ok("audit chain verifies end-to-end", verifyChain().valid);
{
  const payouts = getAuditPage({ limit: 500 }).filter((e) => e.action === "bet.payout");
  ok("settlement payouts are audited", payouts.length >= winnerCount, `audited=${payouts.length} winners=${winnerCount}`);
}

console.log(`\nmoney-invariants: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
