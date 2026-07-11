/**
 * Concurrency money-safety suite (in-memory store; no DATABASE_URL) — Phase B.
 *
 * The single-threaded event loop still interleaves at every `await`, so the
 * money paths guard shared state with async locks (withLock). This suite fires
 * genuinely concurrent operations (Promise.all) at the three highest-risk
 * races and asserts the guards hold — a regression that moves a check outside
 * its lock mints or drops money, and these tests go red.
 *
 *   A · Concurrent bets on ONE market  → pool == Σ stakes (no lost update).
 *   B · Concurrent double-submit (same idempotencyKey) → ONE debit, ONE position.
 *   C · Concurrent double stage-2 settle → winner paid ONCE (no double payout).
 */
import { db, type StoredWallet } from "../src/lib/server/store.ts";
import { createMarket, buyPosition, resolveMarket, getMarket, cashOutPosition } from "../src/lib/server/market-service.ts";
import { positionStore } from "../src/lib/server/market-dal.ts";
import { withdraw } from "../src/lib/server/wallet-service.ts";
import { bindRecruit, ensureAffiliateAccount, onRecruitBet } from "../src/lib/server/affiliate-service.ts";
import { getAffiliateConfig } from "../src/lib/server/affiliate-config.ts";
import { getBonusSummary } from "../src/lib/server/bonus-service.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}
const now = () => new Date().toISOString();
let seq = 0;

async function fundedUser(id: string, balance: number): Promise<void> {
  await db.user.create({
    id, phoneE164: `+25597${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
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
    titleEn: "Concurrency market", titleSw: null as unknown as string, category: "macro",
    sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves at the official date.",
    resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "test",
  } as never);
  return m.id;
}

// ── A · Concurrent bets on one market — the per-market pool lock ─────────────
{
  const mid = await makeMarket();
  const N = 12;
  const stake = 5_000;
  const uids = Array.from({ length: N }, (_, i) => `cc_bet_${i}`);
  for (const u of uids) await fundedUser(u, 100_000);

  const results = await Promise.all(
    uids.map((u, i) => buyPosition(u, { marketId: mid, side: i % 2 === 0 ? "YES" : "NO", stake })),
  );
  ok("A: all concurrent bets placed", results.every((r) => r.ok), `ok=${results.filter((r) => r.ok).length}/${N}`);

  const m = (await getMarket(mid))!;
  const pool = m.yesPool + m.noPool;
  // No lost update: every stake landed in the pool exactly once.
  ok("A: pool == Σ stakes (no lost update)", pool === N * stake, `pool=${pool} expected=${N * stake}`);
  // Split is exactly half/half (6 YES, 6 NO at 5k).
  ok("A: pool split correct", m.yesPool === (N / 2) * stake && m.noPool === (N / 2) * stake, `yes=${m.yesPool} no=${m.noPool}`);
  // Each bettor debited exactly once.
  let allDebitedOnce = true;
  for (const u of uids) if ((await bal(u)) !== 100_000 - stake) allDebitedOnce = false;
  ok("A: every bettor debited exactly once", allDebitedOnce);
}

// ── B · Concurrent double-submit, same key — the wallet idempotency lock ─────
{
  const mid = await makeMarket();
  await fundedUser("cc_idem", 100_000);
  const key = "cc-same-key";
  const stake = 15_000;
  const [r1, r2, r3] = await Promise.all([
    buyPosition("cc_idem", { marketId: mid, side: "YES", stake, idempotencyKey: key }),
    buyPosition("cc_idem", { marketId: mid, side: "YES", stake, idempotencyKey: key }),
    buyPosition("cc_idem", { marketId: mid, side: "YES", stake, idempotencyKey: key }),
  ]);
  ok("B: all three calls ok", r1.ok && r2.ok && r3.ok);
  const ids = [r1, r2, r3].map((r) => (r.ok ? r.data!.positionId : "?"));
  ok("B: all resolve to ONE position", ids[0] === ids[1] && ids[1] === ids[2], ids.join(", "));
  ok("B: debited exactly once (not 3×)", (await bal("cc_idem")) === 100_000 - stake, `bal=${await bal("cc_idem")} expected=${100_000 - stake}`);
  const m = (await getMarket(mid))!;
  ok("B: pool holds one stake only", m.yesPool + m.noPool === stake, `pool=${m.yesPool + m.noPool}`);
}

// ── C · Concurrent double stage-2 settle — the market double-settle guard ────
{
  const mid = await makeMarket();
  await fundedUser("cc_win", 100_000); // YES — will win
  await fundedUser("cc_lose", 100_000); // NO — will lose
  await buyPosition("cc_win", { marketId: mid, side: "YES", stake: 10_000 });
  await buyPosition("cc_lose", { marketId: mid, side: "NO", stake: 10_000 });

  // Stage 1 (officer alpha) closes the market and stages YES.
  const s1 = await resolveMarket({ marketId: mid, outcome: "YES", officerId: "cc_officer_alpha" });
  ok("C: stage-1 staged", s1.ok && s1.data?.stage === "stage1", JSON.stringify(s1));

  const winBefore = await bal("cc_win");
  // Two DISTINCT second officers race the stage-2 confirm at the same time.
  const [a, b] = await Promise.all([
    resolveMarket({ marketId: mid, outcome: "YES", officerId: "cc_officer_beta" }),
    resolveMarket({ marketId: mid, outcome: "YES", officerId: "cc_officer_gamma" }),
  ]);
  const completes = [a, b].filter((r) => r.ok && r.data?.stage === "complete");
  const rejects = [a, b].filter((r) => !r.ok);
  ok("C: exactly one settlement completed", completes.length === 1, `completes=${completes.length}`);
  ok("C: the other was rejected (already resolved)", rejects.length === 1, `rejects=${rejects.length}`);

  const winnersPaid = completes[0]?.ok ? (completes[0].data!.winnersPaid ?? 0) : 0;
  const delta = (await bal("cc_win")) - winBefore;
  ok("C: winner credited exactly once", delta > 0 && delta === winnersPaid, `delta=${delta} winnersPaid=${winnersPaid}`);
  // No mint: a double-settle would pay 2× → delta would exceed the whole pool.
  ok("C: no double payout (delta ≤ pool)", delta <= 20_000, `delta=${delta}`);
  ok("C: loser unchanged", (await bal("cc_lose")) === 90_000, `bal=${await bal("cc_lose")}`);

  const m = (await getMarket(mid))!;
  ok("C: market resolved once", m.status === "RESOLVED" && m.resolvedOutcome === "YES", `status=${m.status}`);
}

// ── D · Concurrent cash-out vs stage-2 settle — the SHARED market lock ───────
// A position must be paid EXACTLY once: either the player cashes it out, or the
// resolver settles it as a winner — never both. Cash-out mutates the pool and
// credits the wallet; resolveMarket does too. If cash-out doesn't hold the same
// market:<id> lock resolve holds, the two interleave and the position is
// credited twice (money minted) and the pool loses an update. The harmful
// interleave is PROD-only (Prisma returns a fresh copy per read + absolute
// pool writes; the in-memory store shares object refs and resolves without
// yielding at the critical await, so it can't reproduce the race) — so this is
// a forward-guard on the concurrent path: each round the player's net credit
// must be a SINGLE payout, never a sum, and the position must end terminal once.
{
  const ROUNDS = 25;
  let doublePaid = 0, minted = 0, notTerminal = 0, creditedRounds = 0;
  for (let r = 0; r < ROUNDS; r++) {
    const mid = await makeMarket();
    const winner = `cc_race_win_${r}`;
    const other = `cc_race_other_${r}`;
    await fundedUser(winner, 100_000);
    await fundedUser(other, 100_000);
    // winner: YES 10k · other: NO 10k → both pools live so cash-out value > 0.
    const wr = await buyPosition(winner, { marketId: mid, side: "YES", stake: 10_000 });
    await buyPosition(other, { marketId: mid, side: "NO", stake: 10_000 });
    const posId = wr.ok ? wr.data!.positionId : "?";
    // Stage-1 by a neutral officer (no position → no conflict) stages YES.
    await resolveMarket({ marketId: mid, outcome: "YES", officerId: `cc_race_alpha_${r}` });

    const before = await bal(winner);
    // The player taps "cash out" at the exact instant a second officer confirms.
    await Promise.all([
      cashOutPosition(winner, posId),
      resolveMarket({ marketId: mid, outcome: "YES", officerId: `cc_race_beta_${r}` }),
    ]);
    const delta = (await bal(winner)) - before;
    const totalIn = 20_000; // the only money that ever entered this market

    if (delta > 0) creditedRounds++;
    // No mint: the player can never receive more than the money that entered.
    if (delta > totalIn) minted++;
    // Position must end in exactly ONE terminal state (CASHED_OUT xor WIN),
    // never a mix, and never still OPEN.
    const p = await positionStore.get(posId);
    if (!p || p.status === "OPEN") notTerminal++;
    // Double-pay signature: credited AND a win payout stacked on a cash-out
    // (delta ≈ cashout value + full-pool win) — caught by the mint check, but
    // also flag directly if the credit exceeds a lone cash-out's ceiling while
    // the position reads CASHED_OUT (i.e. it was also paid as a winner).
    if (p?.status === "CASHED_OUT" && delta > (p.finalPayout ?? 0)) doublePaid++;
  }
  ok("D: player credited every round", creditedRounds === ROUNDS, `credited=${creditedRounds}/${ROUNDS}`);
  ok("D: never minted (credit ≤ money-in) across all rounds", minted === 0, `minted=${minted}/${ROUNDS}`);
  ok("D: position always terminal (no stuck OPEN)", notTerminal === 0, `notTerminal=${notTerminal}/${ROUNDS}`);
  ok("D: never double-paid (cash-out + win stacked)", doublePaid === 0, `doublePaid=${doublePaid}/${ROUNDS}`);
}

// ── E · Concurrent same-key withdrawal — the wallet idempotency re-check ─────
// Two taps of "withdraw" with the same key must debit ONCE and create ONE txn.
// Before the fix the key was only checked pre-lock, so the 2nd caller debited
// again and db.txn.create threw on the unique key AFTER the debit → funds
// stranded in `hold`. The in-lock re-check makes it exactly-once.
{
  const uid = "cc_wd_idem";
  await fundedUser(uid, 100_000);
  const t0 = now();
  await db.kyc.upsert({
    id: `kyc_${uid}`, userId: uid, status: "APPROVED", rejectReason: null, rejectNote: null,
    nidaNumber: "19900101456712341234", nidaVerifiedAt: t0, fullName: "WD Tester", dob: "1990-01-01",
    documents: [], reviewerId: null, reviewedAt: null, submittedAt: t0, createdAt: t0, updatedAt: t0,
  } as never);
  const key = "cc-wd-key";
  const amount = 20_000;
  const [w1, w2, w3] = await Promise.all([
    withdraw(uid, { provider: "MPESA", amount }, key),
    withdraw(uid, { provider: "MPESA", amount }, key),
    withdraw(uid, { provider: "MPESA", amount }, key),
  ]);
  ok("E: all three withdrawal calls ok", w1.ok && w2.ok && w3.ok, `${w1.ok}/${w2.ok}/${w3.ok}`);
  const ids = [w1, w2, w3].map((r) => (r.ok ? r.data!.txnId : "?"));
  ok("E: all resolve to ONE txn (idempotent)", ids[0] === ids[1] && ids[1] === ids[2], ids.join(","));
  const wtxns = (await db.txn.findByUser(uid, 100)).filter((t) => t.type === "WITHDRAWAL");
  ok("E: exactly one withdrawal txn (no double-debit)", wtxns.length === 1, `count=${wtxns.length}`);
  const wal = await db.wallet.findByUserId(uid);
  // Debited exactly once: 100k − 20k = 80k. A double-debit would show 60k.
  ok("E: balance debited exactly once", (wal?.balance ?? -1) === 80_000, `balance=${wal?.balance}`);
  // No stranded funds: hold never exceeds this single in-flight withdrawal.
  ok("E: no stranded double-hold", (wal?.hold ?? 0) <= amount, `hold=${wal?.hold}`);
}

// ── F · Concurrent qualifying bets → the referrer gets EXACTLY ONE prize ─────
// The milestone prize is once-per-recruit. Two concurrent qualifying bets both
// read the "no prior prize" guard before either records → without the payPrize
// lock they'd BOTH pay → double reward. The lock makes it exactly-once.
{
  const cfg = getAffiliateConfig();
  if (cfg.enabled && cfg.prize.enabled && cfg.prize.milestone === "FIRST_BET") {
    const PRIZE = cfg.prize.amountTzs;
    const ref = "cc_ref_x";
    const rec = "cc_rec_y";
    await fundedUser(ref, 0);
    await fundedUser(rec, 0);
    const acct = await ensureAffiliateAccount(ref);
    await bindRecruit({ recruitUserId: rec, code: acct.code });
    // Confirmed deposit so requireDeposit passes.
    await db.txn.create({
      id: `txn_${rec}_dep`, walletId: `wal_${rec}`, userId: rec, type: "DEPOSIT", status: "CONFIRMED",
      amount: 50_000, fee: 0, taxWithheld: 0, balanceAfter: 50_000, currency: "TZS", provider: "MPESA",
      providerRef: null, msisdn: null, description: "dep", positionId: null, amlReason: null,
      createdAt: now(), updatedAt: now(), completedAt: now(),
    } as never);
    const stake = Math.max(cfg.prize.minBetAmountTzs ?? 0, 25_000);
    const bonusBefore = (await getBonusSummary(ref)).bonusBalance;
    await Promise.all([
      onRecruitBet(rec, { stake, operatorCommissionRate: 0.03 }),
      onRecruitBet(rec, { stake, operatorCommissionRate: 0.03 }),
      onRecruitBet(rec, { stake, operatorCommissionRate: 0.03 }),
    ]);
    const prizeRewards = (await db.referralReward.listByReferrer(ref)).filter((r) => r.type === "PRIZE");
    ok("F: exactly one PRIZE reward recorded", prizeRewards.length === 1, `count=${prizeRewards.length}`);
    const bonusDelta = (await getBonusSummary(ref)).bonusBalance - bonusBefore;
    ok("F: referrer credited the prize exactly once", bonusDelta === PRIZE, `Δ=${bonusDelta} expected=${PRIZE}`);
  } else {
    ok("F: skipped (prize/FIRST_BET not default-enabled)", true);
  }
}

console.log(`\nconcurrency: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
