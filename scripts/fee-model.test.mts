/**
 * THE FEE MODEL — the suite that proves the decision (in-memory; no DATABASE_URL).
 *
 *   Run: npx tsx scripts/fee-model.test.mts      (npm run test:fee-model)
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────
 *
 * A player who WON was paid less than he staked. Real poll: YES 300,000 /
 * NO 10,500. He staked 100,000 on YES. YES won. He was paid 93,150 — a 6,850 LOSS
 * on a correct call.
 *
 * The fee was 9% of the WHOLE POOL — including the winners' own returned stakes.
 * On that poll the fee came to 31,050 against a prize (the whole NO side) of only
 * 10,500. The fee was three times larger than everything there was to win, so the
 * balance could only come out of the winners' own money. Every single player on
 * the winning side was mathematically guaranteed to lose.
 *
 * THE RULE: our commission is 10% of the pool, but NEVER more than a third of the
 * smaller side. The smaller side IS the prize. Cap the fee below the prize and a
 * correct call cannot lose money — arithmetically, not as a matter of policy.
 *
 * ── WHAT IS ASSERTED ───────────────────────────────────────────────────────
 *
 *   1. WINNER FLOOR       — a WIN is never paid below its stake. Swept across the
 *                           whole lean range AND across every commissionRate an
 *                           admin can type, to prove the ceiling seals the system
 *                           against admin error too — not just against this rate.
 *   2. OUTCOME-NEUTRAL    — the fee is byte-identical for a YES win and a NO win
 *                           on the same final pools. The pari-mutuel licence rests
 *                           on this (F6 §3.1).
 *   3. THE 70/30 SEAM     — commission and ceiling cross over exactly at 70/30, and
 *                           the fee is CONTINUOUS across it. No cliff, no threshold
 *                           to game.
 *   4. BALANCED           — yesPool == noPool → fee == commissionRate × pool exactly.
 *   5. ONE-SIDED          — smaller == 0 → fee == 0 → everybody refunded.
 *   6. NO MINT / NO LEAK  — Σ payouts + fee == pool, to rounding dust.
 *   7. ALI'S TABLE        — the seven published rows reproduce to the shilling.
 *   8. THE REPORTED POLL  — end-to-end, through the REAL services: 102,333, not
 *                           93,150. And the house takes the same 3,500 either way.
 *   9. RATES STICK        — retuning admin config does NOT reprice a bet already
 *                           placed.
 *  10. GUARDRAIL          — a config that could underpay a winner is REFUSED.
 */
import { db, type StoredWallet } from "../src/lib/server/store.ts";
import { createMarket, buyPosition, getMarket, resolveMarket, settleMarket, listPositionsForMarket, ratesFor } from "../src/lib/server/market-service.ts";
import { setGlobalConfig, getGlobalConfig } from "../src/lib/server/market-config.ts";
import {
  poolFee, settledPayoutFor, payoutFor, levySplit, worstCaseWinnerRatio,
  DEFAULT_COMMISSION_RATE, DEFAULT_FEE_CEILING_RATE, MAX_COMMISSION_RATE,
} from "../src/lib/payout.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}

const RATES = { commissionRate: DEFAULT_COMMISSION_RATE, feeCeilingRate: DEFAULT_FEE_CEILING_RATE };
const now = () => new Date().toISOString();
let seq = 0;

async function fundedUser(id: string, balance = 1_000_000): Promise<void> {
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

async function makeMarket() {
  return createMarket({
    titleEn: "Fee model market", titleSw: "Soko la ada", category: "macro",
    sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves at the official date.",
    resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "test",
  } as never);
}

// This suite validates the CAPPED-COMMISSION model. The platform default is now
// loser-share (Jay), so pin the global config to capped-commission — every
// makeMarket() below then freezes the model these sections assert. The loser-share
// model has its own dedicated suite (scripts/jay-fee-model.test.mts).
await setGlobalConfig({ feeModel: "capped-commission" }, "fee-model-test-setup");

// ════════════════════════════════════════════════════════════════════════════
// 1 · THE WINNER FLOOR — the whole point of the change.
//     Swept across the lean range AND across every commissionRate an admin can
//     set. If the ceiling only worked at 10%, an admin typo could resurrect the
//     bug; it must hold for ANY rate, because it is the CEILING that seals it.
// ════════════════════════════════════════════════════════════════════════════
{
  let breaches = 0, minRatio = Infinity, minAt = "";
  for (let c = 0; c <= MAX_COMMISSION_RATE * 100; c++) {
    const rates = { commissionRate: c / 100, feeCeilingRate: DEFAULT_FEE_CEILING_RATE };
    for (let i = 1; i <= 999; i++) {
      const yes = i * 1_000;
      const no = 1_000_000 - yes;
      for (const side of ["YES", "NO"] as const) {
        const winningPool = side === "YES" ? yes : no;
        if (winningPool <= 0) continue;
        const stake = Math.min(1_000, winningPool);
        const r = settledPayoutFor({ yesPool: yes, noPool: no, side, stake }, rates);
        if (r.payout < stake) breaches++;
        if (r.ratio < minRatio) { minRatio = r.ratio; minAt = `commission=${c}% pools ${yes}/${no} ${side}`; }
      }
    }
  }
  ok("1: WINNER FLOOR holds for EVERY commissionRate 0–30% across the whole lean range", breaches === 0, `${breaches} breaches`);
  ok("1: the worst winner ratio anywhere is still ≥ 1.0", minRatio >= 1, `worst=${minRatio.toFixed(6)} at ${minAt}`);

  // And the admin-facing guardrail agrees with the sweep.
  ok("1: worstCaseWinnerRatio() at the shipped rates is ≥ 1.0", worstCaseWinnerRatio(RATES).ratio >= 1);

  // TWO INDEPENDENT LOCKS on the one bound the floor depends on (ceiling ≤ 100%):
  //   (a) admin validate() REFUSES to save a ceiling above 100%, and
  //   (b) poolFee() CLAMPS it anyway.
  // So even a corrupted feeSnapshot, or a rate written straight into the DB behind
  // the admin UI's back, still cannot pay a winner below his stake. Belt and braces
  // — because the cost of being wrong here is a player losing money on a correct
  // call, and we have already done that to someone once.
  const clamped = worstCaseWinnerRatio({ commissionRate: 0.10, feeCeilingRate: 1.5 });
  ok("1: an out-of-range ceiling (150%) is CLAMPED, so the floor STILL holds", clamped.ratio >= 1, `worst=${clamped.ratio}`);
  ok("1: …clamped to exactly break-even at worst — never below stake", Math.abs(clamped.ratio - 1) < 1e-9, `worst=${clamped.ratio}`);
}

// ════════════════════════════════════════════════════════════════════════════
// 2 · OUTCOME-NEUTRALITY — the fee cannot see who won.
// ════════════════════════════════════════════════════════════════════════════
{
  let mismatches = 0;
  for (let i = 1; i <= 999; i++) {
    const yes = i * 1_000, no = 1_000_000 - yes;
    // poolFee takes NO outcome argument at all — so this asserts the property by
    // construction as much as by value. Recompute both ways to be sure.
    const a = poolFee(yes, no, RATES).fee;
    const b = poolFee(yes, no, RATES).fee;
    // ...and the mirrored poll must charge the mirrored fee (symmetry in the pools).
    const mirrored = poolFee(no, yes, RATES).fee;
    if (a !== b || Math.abs(a - mirrored) > 1e-9) mismatches++;
  }
  ok("2: the fee is identical for a YES win and a NO win on the same pools", mismatches === 0, `${mismatches} mismatches`);

  // The reported poll, both ways.
  const f = poolFee(300_000, 10_500, RATES);
  ok("2: reported poll — fee is 3,500 whichever side wins", Math.round(f.fee) === 3_500, `fee=${f.fee}`);
}

// ════════════════════════════════════════════════════════════════════════════
// 3 · THE 70/30 SEAM — commission and ceiling meet exactly, with no jump.
// ════════════════════════════════════════════════════════════════════════════
{
  const at70 = poolFee(70_000, 30_000, RATES);
  ok("3: at exactly 70/30 the commission and the ceiling are EQUAL", Math.abs(at70.commission - at70.ceiling) < 1e-9,
     `commission=${at70.commission} ceiling=${at70.ceiling}`);
  ok("3: at 70/30 both terms are 10,000 on a 100,000 pool", Math.round(at70.fee) === 10_000, `fee=${at70.fee}`);

  // Continuity: walk across the seam in 0.01% steps; the fee must never jump.
  let maxJump = 0;
  let prev: number | null = null;
  for (let y = 69_000; y <= 71_000; y += 10) {
    const f = poolFee(y, 100_000 - y, RATES).fee;
    if (prev !== null) maxJump = Math.max(maxJump, Math.abs(f - prev));
    prev = f;
  }
  // A 10-TZS pool step can move the fee by at most ~3.3 TZS. A THRESHOLD
  // implementation would show a discontinuous jump here — that is exactly the
  // gameable cliff we refused to build.
  ok("3: the fee is CONTINUOUS across the seam (no cliff to game)", maxJump < 5, `largest step=${maxJump.toFixed(3)} TZS`);

  ok("3: below the seam the COMMISSION binds", !poolFee(60_000, 40_000, RATES).capped);
  ok("3: above the seam the CEILING binds", poolFee(80_000, 20_000, RATES).capped);
}

// ════════════════════════════════════════════════════════════════════════════
// 4 · BALANCED · 5 · ONE-SIDED
// ════════════════════════════════════════════════════════════════════════════
{
  const b = poolFee(50_000, 50_000, RATES);
  ok("4: balanced poll — fee == commissionRate × pool, EXACTLY", b.fee === DEFAULT_COMMISSION_RATE * 100_000, `fee=${b.fee}`);
  ok("4: balanced poll — the ceiling is slack", !b.capped);

  const one = poolFee(50_000, 0, RATES);
  ok("5: one-sided — the fee is ZERO (falls out of the maths; nothing special-cased)", one.fee === 0);
  ok("5: one-sided — netPool == pool, so every stake is refunded in full", one.netPool === 50_000);
}

// ════════════════════════════════════════════════════════════════════════════
// 6 · NO MINT / NO LEAK — Σ payouts + fee == pool.
// ════════════════════════════════════════════════════════════════════════════
{
  let worstDust = 0;
  for (const [yes, no] of [[50_000, 50_000], [70_000, 30_000], [90_000, 10_000], [300_000, 10_500], [7_333, 12_500]]) {
    for (const side of ["YES", "NO"] as const) {
      const winningPool = side === "YES" ? yes : no;
      if (winningPool <= 0) continue;
      const f = poolFee(yes, no, RATES);
      // Split the winning side across 3 stakes; every winner's payout + the fee
      // must reconstitute the pool.
      const stakes = [winningPool * 0.5, winningPool * 0.3, winningPool * 0.2];
      const paid = stakes.reduce((s, st) => s + settledPayoutFor({ yesPool: yes, noPool: no, side, stake: st }, RATES).payout, 0);
      const dust = Math.abs((paid + f.fee) - f.pool);
      worstDust = Math.max(worstDust, dust);
    }
  }
  ok("6: NO MINT / NO LEAK — Σ payouts + fee == pool (within rounding dust)", worstDust <= 3, `worst dust=${worstDust.toFixed(2)} TZS`);
}

// ════════════════════════════════════════════════════════════════════════════
// 7 · ALI'S TABLE — the seven published rows, to the shilling.
// ════════════════════════════════════════════════════════════════════════════
{
  //  YES/NO      fee     ratio (big side)   our share of the losers' money
  const TABLE: Array<[number, number, number, number | null, number | null]> = [
    [50, 50, 10_000, 1.800, 20.0],
    [60, 40, 10_000, 1.500, 25.0],
    [70, 30, 10_000, 1.286, 33.3],  // the seam
    [80, 20,  6_667, 1.167, 33.3],
    [90, 10,  3_333, 1.074, 33.3],
    [95,  5,  1_667, 1.035, 33.3],
    [100, 0,      0,  null, null],  // one-sided → full refund
  ];
  for (const [y, n, expFee, expRatio, expShare] of TABLE) {
    const yes = y * 1_000, no = n * 1_000;
    const f = poolFee(yes, no, RATES);
    ok(`7: ${y}/${n} — fee is ${expFee.toLocaleString()}`, Math.round(f.fee) === expFee, `got ${Math.round(f.fee)}`);
    if (expRatio !== null) {
      const r = settledPayoutFor({ yesPool: yes, noPool: no, side: "YES", stake: 10_000 }, RATES);
      ok(`7: ${y}/${n} — a winner on the big side gets ${expRatio}×`, Math.abs(r.ratio - expRatio) < 0.001, `got ${r.ratio.toFixed(3)}×`);
      ok(`7: ${y}/${n} — WINNER FLOOR (ratio > 1)`, r.ratio > 1);
    }
    if (expShare !== null) {
      ok(`7: ${y}/${n} — our share of the losers' money is ${expShare}%`, Math.abs(f.shareOfLosers * 100 - expShare) < 0.1, `got ${(f.shareOfLosers * 100).toFixed(1)}%`);
      // The promise we print in the Terms: never more than a third of what you win.
      ok(`7: ${y}/${n} — we never take more than a third of the prize`, f.shareOfLosers <= DEFAULT_FEE_CEILING_RATE + 1e-9);
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 8 · THE REPORTED POLL, END TO END, THROUGH THE REAL SERVICES.
//     Seed YES 300,000 / NO 10,500, stake 100,000 on YES, settle YES.
//     Expect 102,333 — not the 93,150 the player actually received.
// ════════════════════════════════════════════════════════════════════════════
{
  // maxStake is 100,000, so the 300,000 YES side is built from several bettors.
  const m = await makeMarket();
  await fundedUser("rp_victim");            // the man from the report
  await fundedUser("rp_yes2"); await fundedUser("rp_yes3");
  await fundedUser("rp_no");

  const v = await buyPosition("rp_victim", { marketId: m.id, side: "YES", stake: 100_000 });
  await buyPosition("rp_yes2", { marketId: m.id, side: "YES", stake: 100_000 });
  await buyPosition("rp_yes3", { marketId: m.id, side: "YES", stake: 100_000 });
  await buyPosition("rp_no", { marketId: m.id, side: "NO", stake: 10_500 });

  const mkt = (await getMarket(m.id))!;
  ok("8: pools are YES 300,000 / NO 10,500", mkt.yesPool === 300_000 && mkt.noPool === 10_500, `${mkt.yesPool}/${mkt.noPool}`);

  const f = poolFee(mkt.yesPool, mkt.noPool, ratesFor(mkt));
  ok("8: an UNCAPPED 10% would have been 31,050 — three times the entire prize", Math.round(f.commission) === 31_050);
  ok("8: the prize (the whole NO side) is only 10,500", f.smaller === 10_500);
  ok("8: the ceiling caps the fee at 3,500", Math.round(f.ceiling) === 3_500 && Math.round(f.fee) === 3_500, `fee=${f.fee}`);
  ok("8: the fee WAS capped", f.capped);
  ok("8: netPool is 307,000", Math.round(f.netPool) === 307_000);

  const before = await bal("rp_victim");
  await resolveMarket({ marketId: m.id, outcome: "YES", officerId: "fee_a" });
  await resolveMarket({ marketId: m.id, outcome: "YES", officerId: "fee_b" });
  await settleMarket(m.id, { force: true });
  const paid = (await bal("rp_victim")) - before;

  // M2 largest-remainder: each winner's fair share is 102,333.33, so each is paid
  // 102,333 or 102,334 (whichever gets the remainder shilling — the SUM is exact,
  // asserted below). Either way the winner PROFITS — it was paid 93,150 under the
  // old flat-fee bug.
  ok("8: ★ THE FIX — the 100,000 stake is paid ~102,333 (it was paid 93,150)", paid === 102_333 || paid === 102_334, `paid=${paid}`);
  ok("8: ★ the winner PROFITS on a correct call", paid > 100_000, `profit=${paid - 100_000}`);

  const pos = (await listPositionsForMarket(m.id)).find((p) => p.userId === "rp_victim")!;
  ok("8: the position is WIN", pos.status === "WIN");
  ok("8: finalPayout matches the credit", pos.finalPayout === paid, `finalPayout=${pos.finalPayout} paid=${paid}`);

  // Every winner on this poll — all three — must clear their stake.
  for (const p of await listPositionsForMarket(m.id)) {
    if (p.side !== "YES") continue;
    ok(`8: winner ${p.userId} paid ≥ stake`, (p.finalPayout ?? 0) >= p.stake, `stake=${p.stake} paid=${p.finalPayout}`);
  }
  // M2 — the three winners' payouts sum to EXACTLY floor(netPool) = 307,000: no
  // per-winner rounding drift, so the operator's fee is exact (largest-remainder).
  const yesSum = (await listPositionsForMarket(m.id)).filter((p) => p.side === "YES").reduce((s, p) => s + (p.finalPayout ?? 0), 0);
  ok("8: ★ winners' payouts sum to netPool EXACTLY (307,000)", yesSum === 307_000, `sum=${yesSum}`);

  // The levies come out of OUR 3,500 — the player's 102,333 is untouched by them.
  const lev = levySplit(f.fee, ratesFor(mkt));
  ok("8: TRA takes 350 of our fee", lev.traLevy === 350, `tra=${lev.traLevy}`);
  ok("8: GBT takes 175 of our fee", lev.gbtLevy === 175, `gbt=${lev.gbtLevy}`);
  ok("8: we keep 2,975 — and the player's payout is unaffected by any of it", lev.operatorNet === 2_975, `net=${lev.operatorNet}`);
}

// ── The SAME poll settled the other way — the house take must be identical ──
{
  const m = await makeMarket();
  await fundedUser("rn_y1"); await fundedUser("rn_y2"); await fundedUser("rn_y3");
  await fundedUser("rn_no");
  await buyPosition("rn_y1", { marketId: m.id, side: "YES", stake: 100_000 });
  await buyPosition("rn_y2", { marketId: m.id, side: "YES", stake: 100_000 });
  await buyPosition("rn_y3", { marketId: m.id, side: "YES", stake: 100_000 });
  await buyPosition("rn_no", { marketId: m.id, side: "NO", stake: 10_500 });

  const mkt = (await getMarket(m.id))!;
  const before = await bal("rn_no");
  await resolveMarket({ marketId: m.id, outcome: "NO", officerId: "fee_a" });
  await resolveMarket({ marketId: m.id, outcome: "NO", officerId: "fee_b" });
  await settleMarket(m.id, { force: true });
  const paid = (await bal("rn_no")) - before;

  // The lone NO bettor now takes the entire net pool.
  ok("8b: NO wins — the sole NO bettor takes the whole netPool (307,000)", paid === 307_000, `paid=${paid}`);
  ok("8b: ★ OUTCOME-NEUTRAL — the house still takes exactly 3,500", (300_000 + 10_500) - paid === 3_500, `house=${(300_000 + 10_500) - paid}`);
  ok("8b: the NO bettor's 10,500 stake is massively profitable, as it should be", paid > 10_500);
}

// ════════════════════════════════════════════════════════════════════════════
// 9 · RATES STICK TO THE POLL — a retune cannot reprice a bet already placed.
// ════════════════════════════════════════════════════════════════════════════
{
  const saved = await getGlobalConfig();

  const m = await makeMarket();                  // frozen at 10% / (1/3)
  await fundedUser("st_y"); await fundedUser("st_n");
  await buyPosition("st_y", { marketId: m.id, side: "YES", stake: 60_000 });
  await buyPosition("st_n", { marketId: m.id, side: "NO", stake: 40_000 });

  const frozen = ratesFor((await getMarket(m.id))!);
  ok("9: the poll froze its rates at creation", frozen.commissionRate === 0.10 && Math.abs(frozen.feeCeilingRate - 1 / 3) < 1e-9);

  // Admin now doubles the commission — AFTER the bets are placed.
  await setGlobalConfig({ commissionRate: 0.20 }, "officer_greedy");
  ok("9: the LIVE config really did change", (await getGlobalConfig()).commissionRate === 0.20);

  const stillFrozen = ratesFor((await getMarket(m.id))!);
  ok("9: the POLL's rates did NOT change", stillFrozen.commissionRate === 0.10, `got ${stillFrozen.commissionRate}`);

  const before = await bal("st_y");
  await resolveMarket({ marketId: m.id, outcome: "YES", officerId: "fee_a" });
  await resolveMarket({ marketId: m.id, outcome: "YES", officerId: "fee_b" });
  await settleMarket(m.id, { force: true });
  const paid = (await bal("st_y")) - before;

  // At the frozen 10%: fee = min(10,000, 13,333) = 10,000 → netPool 90,000 → all to the sole YES.
  // At the retuned 20% it would have been 80,000. The player must get 90,000.
  ok("9: ★ settled at the poll's OWN 10%, not the new 20% (90,000, not 80,000)", paid === 90_000, `paid=${paid}`);

  // A NEW poll created now DOES pick up the new rate.
  const m2 = await makeMarket();
  ok("9: a NEW poll picks up the retuned rate", ratesFor((await getMarket(m2.id))!).commissionRate === 0.20);

  await setGlobalConfig({ commissionRate: saved.commissionRate }, "officer_test");
}

// ════════════════════════════════════════════════════════════════════════════
// 10 · THE GUARDRAIL — admin cannot save a config that could underpay a winner.
// ════════════════════════════════════════════════════════════════════════════
{
  const saved = await getGlobalConfig();

  const bad = await setGlobalConfig({ feeCeilingRate: 1.4 }, "officer_test");
  ok("10: REFUSES a fee ceiling above 100% of the smaller side", bad.ok === false);
  ok("10: …and the live config is unchanged", (await getGlobalConfig()).feeCeilingRate === saved.feeCeilingRate);

  const warned = await setGlobalConfig({ feeCeilingRate: 0.8 }, "officer_test");
  ok("10: ALLOWS a ceiling above 50% but WARNS (we'd take more than all the winners)",
     warned.ok === true && typeof warned.warn === "string");
  // Even at 80%, the floor still holds — that is the guarantee.
  ok("10: even at an 80% ceiling, a winner is still never paid below stake",
     worstCaseWinnerRatio({ commissionRate: 0.30, feeCeilingRate: 0.8 }).ratio >= 1);

  await setGlobalConfig({ commissionRate: saved.commissionRate, feeCeilingRate: saved.feeCeilingRate }, "officer_test");
}

// ── Projection == settlement (the dial cannot quote what we won't pay) ──────
{
  // payoutFor() adds the stake to the chosen side, then runs the SETTLEMENT
  // function. A projection with its own formula is how the old code quoted 4% on
  // the market page while settling at 9%.
  const proj = payoutFor({ yesPool: 200_000, noPool: 10_500, side: "YES", stake: 100_000 }, RATES);
  const settled = settledPayoutFor({ yesPool: 300_000, noPool: 10_500, side: "YES", stake: 100_000 }, RATES);
  ok("projection and settlement agree to the shilling", proj.payout === settled.payout, `proj=${proj.payout} settled=${settled.payout}`);
}

console.log(`\nfee-model: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
