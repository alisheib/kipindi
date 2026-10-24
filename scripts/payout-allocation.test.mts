/**
 * M2 — largest-remainder winner payout allocation (pure, no DB).
 * Proves: Σ payouts == floor(netPool) EXACTLY, every payout ≥ stake (winner
 * floor), deterministic, remainder handed to the largest fractional parts.
 */
import { allocateWinnerPayouts, allocateFeeShares, poolFee, winnersForAllocation } from "../src/lib/payout.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean) => { if (cond) pass++; else { fail++; console.log(`FAIL ${label}`); } };
const sum = (m: Map<string, number>) => [...m.values()].reduce((s, v) => s + v, 0);

// 1. Even split, clean numbers: 3 winners × 1000 on a winning pool of 3000,
//    netPool 9000 → each 3000; Σ == 9000.
{
  const w = [{ id: "a", stake: 1000 }, { id: "b", stake: 1000 }, { id: "c", stake: 1000 }];
  const r = allocateWinnerPayouts(w, 3000, 9000);
  ok("even: sum == floor(netPool)", sum(r) === 9000);
  ok("even: each 3000", r.get("a") === 3000 && r.get("b") === 3000 && r.get("c") === 3000);
}

// 2. Fractional shares that force a remainder: 3 winners on winningPool 3, netPool
//    10 → exact shares 3.33.. each; floors 3,3,3 = 9; remainder 1 → one winner gets 4.
{
  const w = [{ id: "a", stake: 1 }, { id: "b", stake: 1 }, { id: "c", stake: 1 }];
  const r = allocateWinnerPayouts(w, 3, 10);
  ok("frac: sum == floor(netPool) (10)", sum(r) === 10);
  ok("frac: values are 3 or 4", [...r.values()].every((v) => v === 3 || v === 4));
  ok("frac: exactly one got the extra", [...r.values()].filter((v) => v === 4).length === 1);
}

// 3. Winner floor: every payout ≥ its stake, on a real capped-fee poll.
{
  // YES 6000 / NO 4000 → fee 1000, netPool 9000. Winning side YES (6000): two
  // winners 2000 + 4000 → shares 3000 + 6000. Σ == 9000, each ≥ stake.
  const fee = poolFee(6000, 4000, {});
  const w = [{ id: "x", stake: 2000 }, { id: "y", stake: 4000 }];
  const r = allocateWinnerPayouts(w, 6000, fee.netPool);
  ok("floor: sum == floor(netPool)", sum(r) === Math.floor(fee.netPool));
  ok("floor: x ≥ stake", (r.get("x") ?? 0) >= 2000);
  ok("floor: y ≥ stake", (r.get("y") ?? 0) >= 4000);
}

// 4. Determinism — same input, same output (resume-safety depends on this).
{
  const w = [{ id: "p3", stake: 700 }, { id: "p1", stake: 300 }, { id: "p2", stake: 1000 }];
  const a = allocateWinnerPayouts(w, 2000, 5001);
  const b = allocateWinnerPayouts(w, 2000, 5001);
  ok("determinism: identical maps", a.get("p1") === b.get("p1") && a.get("p2") === b.get("p2") && a.get("p3") === b.get("p3"));
  ok("determinism: sum == floor(netPool) (5001)", sum(a) === 5001);
}

// 5. Single winner takes floor(netPool); zero netPool → 0.
{
  ok("single: floor(netPool)", allocateWinnerPayouts([{ id: "s", stake: 500 }], 500, 1234.9).get("s") === 1234);
  ok("zero netPool → 0", allocateWinnerPayouts([{ id: "z", stake: 100 }], 100, 0).get("z") === 0);
}

// 6. 🔴 E-200 — WHICH positions the allocator is fed. Measured on production
//    2026-08-24: `mkt_c97209dbe6e1fa584472` closed with a POOL residual of +15
//    because the winner set was built from `side` alone, so a CASHED_OUT position
//    whose stake had already left the pool was counted as a winner.
//
//    ⛔ THIS SECTION USES THE REAL MARKET'S NUMBERS ON PURPOSE. A synthetic case
//    can be made to pass by tuning it; these are the figures the defect actually
//    produced, so the arithmetic below either reproduces production or it is wrong.
{
  // The market, exactly as production held it.
  const YES = 184_505, NO = 1_500;
  const RATES = { commissionRate: 0.1, feeCeilingRate: 0.333 }; // v1 snapshot ⇒ capped-commission
  const WIN_STAKES = [3500, 7000, 5500, 5000, 5000, 98800, 5500, 45705, 500, 1500, 500, 5000, 1000];
  const positions = [
    ...WIN_STAKES.map((stake, i) => ({ id: `w${i}`, side: "YES" as const, status: "OPEN", stake })),
    { id: "cashed", side: "YES" as const, status: "CASHED_OUT", stake: 5000 },
    ...[500, 500, 500].map((stake, i) => ({ id: `l${i}`, side: "NO" as const, status: "OPEN", stake })),
  ];

  const fee = poolFee(YES, NO, RATES, "YES");
  ok("E-200: fee is the ceiling 499.5", fee.fee === 499.5);
  ok("E-200: netPool 185505.5", fee.netPool === 185_505.5);

  // ⭐ THE PRECONDITION BOTH ALLOCATORS DOCUMENT. This is the property that broke,
  //    and it is stated here as itself rather than as a consequence.
  const winners = winnersForAllocation(positions, "YES");
  const winnerStake = winners.reduce((s, w) => s + w.stake, 0);
  ok("E-200: winner set excludes the CASHED_OUT position", winners.length === 13);
  ok("E-200: Σ(stake over winners) == winningPool (the allocator precondition)", winnerStake === YES);

  // The arithmetic that reaches the player and the house.
  const pay = allocateWinnerPayouts(winners, YES, fee.netPool);
  const fees = allocateFeeShares(winners, YES, fee.fee);
  const paid = sum(pay), collected = sum(fees);
  ok("E-200: Σ payouts == floor(netPool) == 185505", paid === 185_505);
  ok("E-200: Σ fee shares == floor(fee) == 499", collected === 499);

  // ⭐ THE POOL RESIDUAL ITSELF — the number the production probe reads. 1 is the
  //    structural sub-shilling (pool is integral, the fee is not); 15 was the defect.
  const residual = (YES + NO) - paid - collected;
  ok("E-200: pool residual is the structural 1, not 15", residual === 1);

  // ⛔ AND THE PROOF THAT THIS SECTION CAN FAIL. Feed the allocator the population
  //    the defect fed it — side only — and every number above must move to what
  //    production actually wrote. If this block ever stops reproducing 185498/492/15,
  //    the test above has stopped measuring the thing that broke.
  const sideOnly = positions.filter((p) => p.side === "YES");
  const badPay = sum(allocateWinnerPayouts(sideOnly, YES, fee.netPool));
  const badFee = sum(allocateFeeShares(sideOnly, YES, fee.fee));
  const paidIds = new Set(winners.map((w) => w.id));
  const badPaidOut = [...allocateWinnerPayouts(sideOnly, YES, fee.netPool)]
    .filter(([id]) => paidIds.has(id)).reduce((s, [, v]) => s + v, 0);
  const badFeeOut = [...allocateFeeShares(sideOnly, YES, fee.fee)]
    .filter(([id]) => paidIds.has(id)).reduce((s, [, v]) => s + v, 0);
  ok("E-200 control: side-only over-counts the winner set", sideOnly.length === 14);
  ok("E-200 control: side-only reproduces production's 185498", badPaidOut === 185_498);
  ok("E-200 control: side-only reproduces production's 492", badFeeOut === 492);
  ok("E-200 control: side-only reproduces the +15 residual", (YES + NO) - badPaidOut - badFeeOut === 15);
  ok("E-200 control: the skipped top-up is why (allocated overshoots floor(netPool))", badPay > Math.floor(fee.netPool));
}

// 7. E-200 positive control — a settlement with NO cashed-out position must be
//    untouched by the fix. Without this, "residual is 1" could be satisfied by a
//    filter that simply drops positions, and nobody could tell the two apart.
{
  const stakes = [3500, 7000, 5500, 5000, 98800];
  const YES = stakes.reduce((a, b) => a + b, 0), NO = 1_500;
  const positions = [
    ...stakes.map((stake, i) => ({ id: `w${i}`, side: "YES" as const, status: "OPEN", stake })),
    { id: "l0", side: "NO" as const, status: "OPEN", stake: 1500 },
  ];
  const fee = poolFee(YES, NO, { commissionRate: 0.1, feeCeilingRate: 0.333 }, "YES");
  const winners = winnersForAllocation(positions, "YES");
  ok("E-200 control: clean market keeps every winner", winners.length === stakes.length);
  ok("E-200 control: clean market precondition holds", winners.reduce((s, w) => s + w.stake, 0) === YES);
  const paid = sum(allocateWinnerPayouts(winners, YES, fee.netPool));
  const collected = sum(allocateFeeShares(winners, YES, fee.fee));
  ok("E-200 control: clean market Σ payouts == floor(netPool)", paid === Math.floor(fee.netPool));
  ok("E-200 control: clean market Σ fee == floor(fee)", collected === Math.floor(fee.fee));
  ok("E-200 control: clean market still ties to the shilling", (YES + NO) - paid - collected <= 1);
}

// 8. E-200 — a RESUMED settlement. WIN positions were paid on an earlier pass and
//    must be seen by the allocator, or the remaining OPEN winners get a bigger
//    share than the first pass gave them and the pool goes NEGATIVE.
{
  const positions = [
    { id: "a", side: "YES" as const, status: "WIN", stake: 1000 },
    { id: "b", side: "YES" as const, status: "OPEN", stake: 1000 },
    { id: "c", side: "YES" as const, status: "OPEN", stake: 1000 },
  ];
  const winners = winnersForAllocation(positions, "YES");
  ok("E-200: a resumed settlement still sees the already-paid WIN row", winners.length === 3);
  const first = allocateWinnerPayouts(winners, 3000, 9001);
  const resumed = allocateWinnerPayouts(winnersForAllocation(positions, "YES"), 3000, 9001);
  ok("E-200: resume reproduces the identical amount for the paid row", first.get("a") === resumed.get("a"));
}

// 9. 🔴 E-200 UNDER STAKE-SHARE (FEE-TAX-2026-10) — the TWO sets the split is fed. A stake-share split needs the losers
//    too (each loser's own fee, the prize fund), so `settleMarket` builds both through ONE rule, `stakeShareParties`:
//    winners WIN + OPEN (`winnersForAllocation`), losers LOSS + OPEN. ⛔ A CASHED_OUT stake left the pool at its exit and a
//    VOID one was refunded — counting either is the 2026-08-24 defect on the other side of the book. The real decision is
//    driven here (imported from the service, on the memory store), not a copy of it.
{
  process.env.USE_PRISMA_DAL = "false";
  process.env.DATABASE_URL = "";
  const { stakeShareParties, STAKE_SHARE_LOSER_STATUSES } = await import("../src/lib/server/market-service.ts");
  const { stakeShareSplit } = await import("../src/lib/payout.ts");
  const SS = { feeModel: "stake-share" as const, platformFeeRate: 0.03, operatorFeeRate: 0.10, winningsTaxRate: 0.15 };
  const book = (w1: string, l1: string) => [
    { id: "w0", side: "YES" as const, status: "OPEN", stake: 2_000 },
    { id: "w1", side: "YES" as const, status: w1, stake: 3_000 },
    { id: "wc", side: "YES" as const, status: "CASHED_OUT", stake: 5_000 },
    { id: "wv", side: "YES" as const, status: "VOID", stake: 1_000 },
    { id: "l0", side: "NO" as const, status: "OPEN", stake: 4_000 },
    { id: "l1", side: "NO" as const, status: l1, stake: 1_000 },
    { id: "lc", side: "NO" as const, status: "CASHED_OUT", stake: 2_500 },
    { id: "lv", side: "NO" as const, status: "VOID", stake: 700 },
  ];
  // The pools hold only the stakes still in them: 2,000 + 3,000 on YES, 4,000 + 1,000 on NO.
  const YES = 5_000, NO = 5_000;
  const parties = stakeShareParties(book("OPEN", "OPEN"), "YES");
  ok("E-200 stake-share: the loser allowlist is LOSS + OPEN, nothing else", JSON.stringify([...STAKE_SHARE_LOSER_STATUSES].sort()) === JSON.stringify(["LOSS", "OPEN"]));
  ok("E-200 stake-share: winners exclude the CASHED_OUT and VOID stakes", JSON.stringify(parties.winners.map((p) => p.id)) === JSON.stringify(["w0", "w1"]));
  ok("E-200 stake-share: losers exclude the CASHED_OUT and VOID stakes", JSON.stringify(parties.losers.map((p) => p.id)) === JSON.stringify(["l0", "l1"]));
  const splitOf = (ps: ReturnType<typeof book>) => {
    const { winners, losers } = stakeShareParties(ps, "YES");
    return stakeShareSplit({ yesPool: YES, noPool: NO, outcome: "YES", winners: winners.map((p) => ({ id: p.id, stake: p.stake })), losers: losers.map((p) => ({ id: p.id, stake: p.stake })) }, SS);
  };
  const first = splitOf(book("OPEN", "OPEN"));
  ok("E-200 stake-share: the two sets make the pools, so the split pays out exactly: Σ payouts + F + T = the pool",
    [...first.perWinner.values()].reduce((s, v) => s + v.payout, 0) + first.fee + first.winningsTax === YES + NO);
  // A RESUMED pass: w1 was paid (WIN) and l1 marked LOSS on the earlier pass — the split must reproduce every share.
  const resumed = splitOf(book("WIN", "LOSS"));
  ok("E-200 stake-share: a resumed settlement (one WIN, one LOSS already marked) reproduces every winner's share",
    JSON.stringify([...resumed.perWinner]) === JSON.stringify([...first.perWinner]));
  ok("E-200 stake-share: …and every loser's fee", JSON.stringify([...resumed.perLoser]) === JSON.stringify([...first.perLoser]));
  // ⛔ AND THE PROOF IT CAN FAIL: the side-only sets the defect built count the exited and refunded stakes, which no
  //    longer make the pools — and the split REFUSES, loudly, rather than pay out of money that left.
  const sideOnly = book("OPEN", "OPEN");
  let refused = false;
  try {
    stakeShareSplit({
      yesPool: YES, noPool: NO, outcome: "YES",
      winners: sideOnly.filter((p) => p.side === "YES").map((p) => ({ id: p.id, stake: p.stake })),
      losers: sideOnly.filter((p) => p.side === "NO").map((p) => ({ id: p.id, stake: p.stake })),
    }, SS);
  } catch { refused = true; }
  ok("E-200 stake-share control: side-only sets do not make the pools, and the split refuses them", refused);
}

console.log(`\npayout-allocation: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
