/**
 * POOL RESIDUAL GUARD — a settled market's escrow account must hold EXACTLY nothing.
 *
 * The bug this exists to prevent (found on production 2026-08-11, by settling a real
 * market with real money):
 *
 *   `settlementPayoutEntries` derived each winner's commission line on its own, as
 *   `Math.round((stake / winningPool) * fee)`. Independent rounding does not have to sum
 *   to the fee, and `Math.round` breaks ties UPWARD — so on a poll whose winners hold
 *   exact half-shares, EVERY winner rounds up and the commission over-collects.
 *
 *   The PAYOUTS were already exact (`allocateWinnerPayouts`, largest remainder), so the
 *   difference had nowhere to go but the pool. The escrow account finished settlement
 *   holding a NEGATIVE balance — the platform had paid out money nobody staked.
 *
 *   The certification market made it concrete: two winners staking 3,000 and 5,000 of an
 *   8,000 winning pool against a fee of 260 produced commission lines of 98 + 163 = 261,
 *   and `POOL:mkt_85f1bae30206db0995a5` closed at −1. Across production history: 9
 *   settled pools non-zero, 7 of them negative.
 *
 * ⛔ WHY NO EXISTING SUITE CAUGHT IT. The overall ledger still summed to zero, because
 * the error lives inside a SELF-CANCELLING PAIR: POOL −1 against HOUSE:COMMISSION +1.
 * `test:trial-balance` (18), `test:money-invariants` (84), `test:ledger` (89) and
 * `test:payout-alloc` (12) were all green on both sides of the defect. An aggregate that
 * balances is not evidence that its components do — so this asserts the COMPONENT.
 *
 * Run: npm run test:pool-residual     RED proof: npm run red:pool-residual
 */
process.env.USE_PRISMA_DAL = "false";
process.env.DATABASE_URL = "";

import { readFileSync } from "node:fs";
import { allocateFeeShares, allocateWinnerPayouts } from "../src/lib/payout.ts";
import { settlementPayoutEntries } from "../src/lib/server/ledger.ts";

let fail = 0;
const log = (m: string) => console.log(m);
function ok(label: string, cond: boolean, detail = "") {
  if (cond) log(`  PASS ${label}`);
  else { log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`); fail++; }
}

// ── 1 · the allocator itself sums to the whole, always ────────────────────────
log("\n── 1 · allocateFeeShares sums to exactly the fee ───────────────");
{
  // The exact case that broke production: two winners, exact half-ish shares, odd fee.
  const m = allocateFeeShares([{ id: "a", stake: 3000 }, { id: "b", stake: 5000 }], 8000, 260);
  const sum = [...m.values()].reduce((s, v) => s + v, 0);
  ok("the production case sums exactly", sum === 260, `got ${sum} from ${JSON.stringify([...m])}`);

  // A spread of shapes, including ties, primes and single winners.
  let worst = "";
  let allExact = true;
  for (const winners of [1, 2, 3, 5, 7, 11]) {
    for (const fee of [1, 2, 3, 7, 13, 99, 260, 1001]) {
      const rows = Array.from({ length: winners }, (_, i) => ({ id: `w${i}`, stake: 1000 * (i + 1) }));
      const pool = rows.reduce((s, r) => s + r.stake, 0);
      const got = [...allocateFeeShares(rows, pool, fee).values()].reduce((s, v) => s + v, 0);
      if (got !== Math.floor(fee)) { allExact = false; worst = `${winners} winners, fee ${fee} → ${got}`; }
    }
  }
  ok("every shape sums to floor(fee)", allExact, worst);

  // Equal stakes are the tie case Math.round got wrong.
  const eq = allocateFeeShares(Array.from({ length: 4 }, (_, i) => ({ id: `e${i}`, stake: 2500 })), 10_000, 10);
  ok("equal stakes still sum exactly", [...eq.values()].reduce((s, v) => s + v, 0) === 10, JSON.stringify([...eq]));
  ok("no share is negative", [...eq.values()].every((v) => v >= 0));
}

// ── 2 · the LINES the ledger would write leave the pool at exactly zero ───────
//
// ⛔ THE FIRST VERSION OF THIS SECTION WAS HOLLOW AND ITS RED PROOF SAID SO — 0/2
// mutations caught. It drove a real settlement in the in-memory harness and then asked
// `ledgerAccountBalance` for the pool. But every ledger writer starts with
// `const pc = prisma(); if (!pc) return …` — with no database NOTHING IS WRITTEN, so the
// balance was 0 because the account did not exist. The check could not fail, which makes
// it worse than no check: it reported the defect as fixed while reverting the fix changed
// nothing.
//
// ⭐ `settlementPayoutEntries` is a PURE function. Calling it directly needs no database,
// is deterministic, and reads the exact code the mutation edits — so the guard now sees
// what the ledger would actually record.
log("\n── 2 · the settlement LINES balance the pool to zero ───────────");
{
  const check = (label: string, winners: Array<{ id: string; stake: number }>, loserPool: number, feeRate = 0.13) => {
    const winningPool = winners.reduce((s, w) => s + w.stake, 0);
    const grossPool = winningPool + loserPool;
    const fee = Math.round(feeRate * loserPool);           // loser-share
    const netPool = grossPool - fee;
    const payouts = allocateWinnerPayouts(winners, winningPool, netPool);
    const fees = allocateFeeShares(winners, winningPool, fee);

    const lines = winners.flatMap((w) => settlementPayoutEntries({
      groupId: `g_${w.id}`, userId: `u_${w.id}`, marketId: "mkt_guard",
      payout: payouts.get(w.id) ?? 0, stake: w.stake, fee, winningPool,
      commissionAmount: fees.get(w.id) ?? 0,
      rates: { traTaxOnCommissionRate: 0.1, gbtLevyOnCommissionRate: 0.05 },
    }));

    // Every group must balance on its own …
    const total = lines.reduce((s, l) => s + l.amount, 0);
    ok(`${label} · the entries sum to zero`, total === 0, `sum = ${total}`);

    // … and the POOL must give up EXACTLY what it holds: payouts + fee, never more.
    const poolOut = -lines.filter((l) => l.account === "POOL:mkt_guard").reduce((s, l) => s + l.amount, 0);
    ok(`${label} · the pool gives up exactly what it holds`, poolOut === grossPool,
      `pool paid out ${poolOut} against ${grossPool} staked — residual ${grossPool - poolOut}`);

    const booked = lines.filter((l) => l.account === "HOUSE:COMMISSION" && l.entryType === "SETTLEMENT_COMMISSION")
      .reduce((s, l) => s + l.amount, 0);
    ok(`${label} · commission booked equals the poll's fee`, booked === fee, `booked ${booked} vs fee ${fee}`);
  };

  // The production case: two winners on 3,000 / 5,000 against 2,000 — both shares land
  // on an exact .5, which is precisely where Math.round broke.
  check("production shape", [{ id: "a", stake: 3000 }, { id: "b", stake: 5000 }], 2000);
  // Equal stakes — every winner ties, so every one of them used to round up.
  check("four equal winners", Array.from({ length: 4 }, (_, i) => ({ id: `e${i}`, stake: 2500 })), 3000);
  check("three equal winners", Array.from({ length: 3 }, (_, i) => ({ id: `t${i}`, stake: 1000 })), 1000);
  // A lone winner must be unaffected.
  check("single winner", [{ id: "s", stake: 7000 }], 4000);
  // Awkward primes, where the fractions are never clean.
  check("seven odd winners", Array.from({ length: 7 }, (_, i) => ({ id: `p${i}`, stake: 1000 + i * 137 })), 3331);
}

// ── 3 · settlement actually WIRES the allocation through ─────────────────────
//
// Section 2 proves the ledger function is correct WHEN GIVEN a pre-allocated share. It
// cannot prove settlement supplies one — it calls the function directly. Its RED proof
// said so: removing the argument from market-service was missed, 1/2. Without this the
// guard would sit green over a settlement that had quietly stopped passing it and gone
// back to deriving the fee per winner. Structural, for the same reason
// test:settle-atomicity is: the property lives in the wiring, not in a value.
log("\n── 3 · settlement passes the pre-allocated fee share ───────────");
{
  const src = readFileSync(new URL("../src/lib/server/market-service.ts", import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  ok("settleMarket allocates the fee with largest remainder",
    /allocateFeeShares\(/.test(src), "no allocateFeeShares call — the fee is being rounded per winner again");
  ok("the allocated share reaches the ledger",
    /commissionAmount:\s*feeByPos\.get\(/.test(src),
    "settlementPayoutEntries is called without commissionAmount, so it derives the fee itself");
}

log("\n────────────────────────────────────────────────────────────────");
log(`  POOL RESIDUAL: ${fail === 0 ? "all checks passed" : `${fail} FAILED`}`);
log("────────────────────────────────────────────────────────────────");
process.exit(fail === 0 ? 0 : 1);
