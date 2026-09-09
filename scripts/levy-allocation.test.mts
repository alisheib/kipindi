/**
 * test:levy-allocation — ONE FEE, ONE LEVY SPLIT, ONE FIGURE.
 *
 * `RULES.md` §2.2: TRA 10% and GBT 5% are levied on the commission WE earned. `levySplit`
 * in `payout.ts` is where that arithmetic lives, and `settleMarket` calls it ONCE per
 * settlement — for the audit payload and for the agent-commission base.
 *
 * 🔴 THE DEFECT THIS GATE EXISTS FOR. The LEDGER — the side that actually holds the money —
 * derived each winner's TRA and GBT independently as `Math.round(thisWinnersFeeShare * rate)`.
 * N independent roundings need not sum to one rounding of the whole, so the ledger and
 * `levySplit` stated two different statutory liabilities for the same settlement. GBT is 5%,
 * so a winner's fee share under 10 TZS books ZERO: fifteen winners at the TZS 1,000 minimum
 * against one 1,000 losing bet is a fee of 130 with every share ≤ 9, and the market books
 * **GBT 0 where levySplit says 7** — a levy recorded as never having arisen.
 *
 * ⛔ IT SURVIVED EVERY EXISTING GUARD BECAUSE THE GROUP STILL SUMS TO ZERO either way
 * (commission +share, −tra −gbt, +tra +gbt). `postLedgerEntries` accepted it, the trial
 * balance tied, and `ledger.test.mts` asserted only that a levy line EXISTS — on a ONE-winner
 * fixture, the one shape where the two regimes cannot disagree. "The books balance" is not
 * integrity. Measured on production 2026-09-09 across the 203 settled markets carrying a
 * booked fee: **43 diverge**, 0 of 138 at one winner, 9 of 9 at five or more.
 *
 * ⭐ THE DISCRIMINATING PROPERTY, and why §3 is the positive control: this gate must be
 * unable to pass by asserting nothing. §3 drives the DERIVED fallback (no pre-allocated
 * levy supplied) and asserts it still reproduces the OLD per-winner arithmetic, so the
 * suite demonstrably distinguishes the two regimes rather than being blind to both.
 *
 *   npx tsx scripts/levy-allocation.test.mts
 *   LEVY_ROOT=<tree> npx tsx scripts/levy-allocation.test.mts   ← used by red:levy-allocation
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.LEVY_ROOT || join(here, "..");
const imp = (rel: string) => import(pathToFileURL(join(ROOT, rel)).href);

const { settlementPayoutEntries } = await imp("src/lib/server/ledger.ts");
const { levySplit, allocateFeeShares } = await imp("src/lib/payout.ts");

const RATES = { traTaxOnCommissionRate: 0.10, gbtLevyOnCommissionRate: 0.05 };

let pass = 0;
let fail = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? ` · ${detail}` : ""}`); }
}

type Line = { account: string; entryType: string; amount: number };

/**
 * Build one settlement the way `settleMarket` does: allocate the fee across winners by
 * largest remainder, allocate each levy across the winners' FEE SHARES the same way, and
 * hand every winner's group to `settlementPayoutEntries`.
 *
 * `preAllocateLevies: false` reproduces the pre-fix caller, which passed only the
 * commission share and let the ledger derive the levies per winner.
 */
function settle(losingPool: number, winnerStakes: number[], preAllocateLevies = true) {
  const winningPool = winnerStakes.reduce((a, b) => a + b, 0);
  const fee = Math.round(0.13 * losingPool);            // RULES §1 — 13% of the LOSING side
  const netPool = winningPool + losingPool - fee;
  const winners = winnerStakes.map((s, i) => ({ id: `p${String(i).padStart(3, "0")}`, stake: s }));
  const feeByPos = allocateFeeShares(winners, winningPool, fee);
  const levies = levySplit(fee, RATES);

  const feeShareRows = winners.map((w) => ({ id: w.id, stake: feeByPos.get(w.id) ?? 0 }));
  const traByPos = allocateFeeShares(feeShareRows, fee, levies.traLevy);
  const gbtByPos = allocateFeeShares(feeShareRows, fee, levies.gbtLevy);

  const groups: Line[][] = [];
  for (const w of winners) {
    const payout = Math.floor((w.stake / winningPool) * netPool);
    groups.push(settlementPayoutEntries({
      groupId: `settle_${w.id}`, userId: w.id, marketId: "mkt_t", payout,
      stake: w.stake, fee, winningPool,
      commissionAmount: feeByPos.get(w.id) ?? 0,
      ...(preAllocateLevies
        ? { traLevyAmount: traByPos.get(w.id) ?? 0, gbtLevyAmount: gbtByPos.get(w.id) ?? 0 }
        : {}),
      rates: RATES,
    }) as Line[]);
  }

  const sum = (acct: string, type: string) =>
    groups.flat().filter((l) => l.account === acct && l.entryType === type).reduce((s, l) => s + l.amount, 0);

  return {
    fee, levies, winners: winners.length, groups,
    tra: sum("HOUSE:TRA_LEVY", "SETTLEMENT_TRA_LEVY"),
    gbt: sum("HOUSE:GBT_LEVY", "SETTLEMENT_GBT_LEVY"),
    commissionNet: groups.flat().filter((l) => l.account === "HOUSE:COMMISSION").reduce((s, l) => s + l.amount, 0),
  };
}

// ── §1 · The column must sum to levySplit, at every winner count ─────────────
//
// The pre-fix source passes §1.1 (one winner cannot disagree with itself) and fails the
// rest, so this section alone distinguishes the two regimes across the population.
console.log("\n§1 · Σ per-winner levies == levySplit(fee), across winner counts");
{
  const shapes: Array<[string, number, number[]]> = [
    ["1.1  one winner (the shape ledger.test.mts fixtures)", 10_000, [20_000]],
    ["1.2  two winners", 1_000, [1_000, 1_000]],
    ["1.3  three winners (RULES §1's production poll)", 13_000, [12_069, 4_827, 2_414]],
    ["1.4  fifteen minimum bets — the GBT-zero shape", 1_000, Array(15).fill(1_000)],
    ["1.5  two hundred winners on a 100,000 losing side", 100_000, Array(200).fill(1_000)],
    ["1.6  ragged stakes inside the live bounds", 250_000, [1_000, 3_500, 17_250, 400_000, 999_999, 12_345]],
  ];
  for (const [label, losing, stakes] of shapes) {
    const r = settle(losing, stakes);
    ok(`${label} · TRA ${r.tra} == levySplit ${r.levies.traLevy}`, r.tra === r.levies.traLevy, `fee=${r.fee}`);
    ok(`${label} · GBT ${r.gbt} == levySplit ${r.levies.gbtLevy}`, r.gbt === r.levies.gbtLevy, `fee=${r.fee}`);
  }
}

// ── §2 · The named defect, verbatim ──────────────────────────────────────────
console.log("\n§2 · GBT must never book ZERO on a settlement that owes it");
{
  const r = settle(1_000, Array(15).fill(1_000));
  ok("2.1  levySplit says this market owes GBT 7", r.levies.gbtLevy === 7, `got ${r.levies.gbtLevy}`);
  ok("2.2  the ledger books 7, not 0", r.gbt === 7, `booked ${r.gbt}`);
  ok("2.3  and TRA is 13, not the 15 that per-winner rounding produced", r.tra === 13, `booked ${r.tra}`);
  // The house keeps exactly what levySplit says it keeps — no more, no less.
  ok("2.4  HOUSE:COMMISSION nets to operatorNet (110)",
    r.commissionNet === r.fee - r.levies.traLevy - r.levies.gbtLevy, `net ${r.commissionNet}`);
}

// ── §3 · POSITIVE CONTROL — the suite can tell the two regimes apart ─────────
//
// ⛔ WITHOUT THIS, §1 AND §2 COULD PASS BY BEING BLIND. The derived fallback is the
// pre-fix arithmetic; it must still reproduce the DIVERGENCE. If this section stops
// failing to match levySplit, the gate has gone vacuous and §1 proves nothing.
console.log("\n§3 · POSITIVE CONTROL · the derived (pre-fix) path must still diverge");
{
  const derived = settle(1_000, Array(15).fill(1_000), false);
  ok("3.1  derived per-winner rounding books GBT 0 — the defect, reproduced",
    derived.gbt === 0, `got ${derived.gbt}`);
  ok("3.2  derived per-winner rounding books TRA 15, not 13",
    derived.tra === 15, `got ${derived.tra}`);
  ok("3.3  so the two regimes are distinguishable and §1 is not vacuous",
    derived.gbt !== derived.levies.gbtLevy);
  const big = settle(100_000, Array(200).fill(1_000), false);
  ok("3.4  and at 200 winners the derived path is off by 50 GBT",
    big.gbt === big.levies.gbtLevy - 50, `got ${big.gbt} vs ${big.levies.gbtLevy}`);
}

// ── §4 · Conservation — every group still sums to zero ───────────────────────
console.log("\n§4 · every ledger group still balances to the shilling");
{
  const r = settle(250_000, [1_000, 3_500, 17_250, 400_000, 999_999, 12_345]);
  let worst = 0;
  for (const g of r.groups) worst = Math.max(worst, Math.abs(g.reduce((s, l) => s + l.amount, 0)));
  ok("4.1  max |Σ group| == 0", worst === 0, `worst ${worst}`);
}

// ── §5 · OVER-CORRECTIONS — the fix must not drift into a new defect ─────────
//
// ⛔ These are the ways a "fix" could reverse a decision RULES records. A levy is charged on
// OUR fee and on nothing else (§2.2), and a player is charged the pool fee and the withdrawal
// fee and NOTHING else (§2.8) — so zero rates must book zero, and no levy may ever be taken
// out of the player's payout.
console.log("\n§5 · OVER-CORRECTION guards");
{
  const winners = Array(15).fill(1_000).map((s, i) => ({ id: `z${i}`, stake: s }));
  const zeroRates = { traTaxOnCommissionRate: 0, gbtLevyOnCommissionRate: 0 };
  const fee = 130;
  const feeByPos = allocateFeeShares(winners, 15_000, fee);
  const lv = levySplit(fee, zeroRates);
  ok("5.1  zero rates → levySplit books nothing", lv.traLevy === 0 && lv.gbtLevy === 0);
  const lines = winners.flatMap((w) => settlementPayoutEntries({
    groupId: `settle_${w.id}`, userId: w.id, marketId: "mkt_z", payout: 1_000,
    stake: w.stake, fee, winningPool: 15_000,
    commissionAmount: feeByPos.get(w.id) ?? 0, traLevyAmount: 0, gbtLevyAmount: 0,
    rates: zeroRates,
  }) as Line[]);
  ok("5.2  zero rates → the ledger books NO levy line at all",
    !lines.some((l) => l.entryType.endsWith("_LEVY")));

  // A player's payout is never reduced by a levy, whatever the allocation does.
  // ⛔ `player > 0` IS NOT THIS ASSERTION. A levy silently deducted from a 30,000 payout
  // leaves it positive and the group still BALANCES (the pool debit shrinks by the same
  // amount), so a positivity check passes over the exact defect §2.8 forbids. The credit
  // must equal the payout that was passed in, to the shilling.
  const bigStakes = [400_000, 250_000, 120_000, 90_000, 60_000];
  const rp = settle(500_000, bigStakes);
  const winningPool = bigStakes.reduce((a, b) => a + b, 0);
  const netPool = winningPool + 500_000 - rp.fee;
  let creditMismatch = 0;
  rp.groups.forEach((g, i) => {
    const expected = Math.floor((bigStakes[i] / winningPool) * netPool);
    const credited = g.filter((l) => l.account.startsWith("PLAYER:")).reduce((s, l) => s + l.amount, 0);
    if (credited !== expected) creditMismatch++;
  });
  ok("5.3  every player is credited EXACTLY the payout — no levy is deducted from it",
    creditMismatch === 0, `${creditMismatch} of ${rp.groups.length} winners short-credited`);
  const anyLevyOffPlayer = rp.groups.flat().some((l) => l.account.startsWith("PLAYER:") && l.entryType.endsWith("_LEVY"));
  ok("5.4  no levy line is ever posted against a PLAYER account", !anyLevyOffPlayer);

  // And the levy column must never exceed the fee it is levied on.
  const r = settle(1_000, Array(15).fill(1_000));
  ok("5.5  TRA + GBT ≤ the fee", r.tra + r.gbt <= r.fee, `${r.tra}+${r.gbt} vs ${r.fee}`);
}

console.log(`\n${fail === 0 ? "PASS" : "FAILED"} · ${pass} ok, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
