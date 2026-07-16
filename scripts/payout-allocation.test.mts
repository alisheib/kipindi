/**
 * M2 — largest-remainder winner payout allocation (pure, no DB).
 * Proves: Σ payouts == floor(netPool) EXACTLY, every payout ≥ stake (winner
 * floor), deterministic, remainder handed to the largest fractional parts.
 */
import { allocateWinnerPayouts, poolFee } from "../src/lib/payout.ts";

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

console.log(`\npayout-allocation: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
