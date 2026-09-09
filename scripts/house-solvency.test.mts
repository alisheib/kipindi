/**
 * THE SOLVENCY LINE SUBTRACTS EVERY CLAIM ON THE CASH — including the statutory tax.
 *
 *   npx tsx scripts/house-solvency.test.mts     (npm run test:house-solvency)
 *
 * 🔴 THE DEFECT THIS EXISTS FOR (`LEAD-F.1` + `LEAD-F.2`, CONFIRMED 3/3 each;
 * `MONEY-GATE-REMEDIATION.md` §7.15). `housePosition` computed
 * `owedToOthers = leviesPayable + aggregator + rgSuspense` and **`HOUSE:TAX` was not in the
 * type at all**, so unremitted statutory tax was reported to the owner as his own free cash.
 * Both money screens compounded it by captioning the account *"RETIRED — historical rows
 * only"* while two live paths credit it: the VAT on an agent registration, and the 5% withheld
 * from every commission accrual (RULES §2.10).
 *
 * ⛔ IT IS NOT A HYPOTHETICAL ACCOUNT. Read on production 2026-09-09: **HOUSE:TAX = 18,000 TZS
 * over 1 entry** — VAT collected from the one registered agent, owed to TRA and still unremitted.
 *
 * ⭐ THE FUNCTION'S OWN HEADER STATES THE RULE IT BROKE: *"A platform holding 100M of which 92M
 * is player balances and 3M is unremitted levies has 5M, and an owner shown '100M' makes
 * decisions that insolvency is built from. Every claim on the cash is subtracted here."*
 * Every claim except one.
 *
 *   §1 tax is subtracted from free cash, and the shortfall is exactly the tax
 *   §2 ⭐ the PRODUCTION figures, replayed
 *   §3 every other claim is still subtracted — the fix adds a term, it does not replace one
 *   §4 ⚠️ POSITIVE CONTROL — the pre-fix formula is reproduced and overstates by the tax
 */
import { housePosition, type HouseAccounts } from "../src/lib/house-book.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
};

const accounts = (over: Partial<HouseAccounts> = {}): HouseAccounts => ({
  commission: 0, agentCommission: 0, traLevy: 0, gbtLevy: 0,
  aggregator: 0, rgSuspense: 0, tax: 0, all: {}, ...over,
});

const position = (a: Partial<HouseAccounts>, cash: number, liability = 0) =>
  housePosition({ accounts: accounts(a), playerLiability: liability, custodialCash: cash, adjustmentBackedLiability: 0 });

/** The formula as it stood before the fix — tax simply absent from the sum. */
const preFixFreeCash = (a: Partial<HouseAccounts>, cash: number, liability = 0) => {
  const f = accounts(a);
  return cash - liability - (f.traLevy + f.gbtLevy + f.aggregator + f.rgSuspense);
};

// ── §1 · tax comes out ───────────────────────────────────────────────────────
console.log("\n§1 · statutory tax is subtracted from the owner's free cash");
{
  const p = position({ tax: 18_000 }, 100_000);
  ok("taxPayable is reported", p.taxPayable === 18_000, `${p.taxPayable}`);
  ok("⭐ free cash is 100,000 − 18,000 = 82,000", p.freeHouseCash === 82_000, `${p.freeHouseCash}`);
  ok("…and the ex-adjustments line subtracts it too",
    position({ tax: 18_000 }, 100_000).freeHouseCashExAdjustments === 82_000);

  // The shortfall must be EXACTLY the tax — not approximately, and not double-counted.
  const withTax = position({ tax: 18_000 }, 100_000).freeHouseCash;
  const without = position({ tax: 0 }, 100_000).freeHouseCash;
  ok("⛔ the difference is exactly the tax, counted once", without - withTax === 18_000, `${without - withTax}`);

  ok("zero tax changes nothing", position({ tax: 0 }, 100_000).freeHouseCash === 100_000);
}

// ── §2 · the production figures ──────────────────────────────────────────────
console.log("\n§2 · ⭐ production, replayed — read 2026-09-09");
{
  // Verbatim from `levy-divergence.cjs`'s HOUSE ACCOUNTS block.
  const live = accounts({
    commission: 324_370, aggregator: 480, gbtLevy: 19_089, traLevy: 38_081,
    tax: 18_000, agentCommission: 0, rgSuspense: 0,
  });
  const cash = 1_000_000, liability = 500_000;
  const p = housePosition({ accounts: live, playerLiability: liability, custodialCash: cash, adjustmentBackedLiability: 0 });

  const owed = 38_081 + 19_089 + 480 + 0 + 18_000;   // levies + aggregator + rgSuspense + tax
  ok(`owed to others is ${owed.toLocaleString()} — and the 18,000 of it is TRA's`,
    p.freeHouseCash === cash - liability - owed, `free=${p.freeHouseCash}`);

  const overstatement = preFixFreeCash(live, cash, liability) - p.freeHouseCash;
  ok("⭐ the pre-fix line overstated the owner's cash by exactly the 18,000 held for TRA",
    overstatement === 18_000, `${overstatement}`);

  ok("⛔ HOUSE:TAX is NOT counted as retained earnings", p.netRetained === 324_370,
    `netRetained=${p.netRetained}`);
}

// ── §3 · the fix adds a term, it does not replace one ────────────────────────
console.log("\n§3 · every other claim is still subtracted");
{
  const p = position({ traLevy: 100, gbtLevy: 50, aggregator: 20, rgSuspense: 7, tax: 3 }, 1_000);
  ok("free cash is 1,000 − (100+50+20+7+3) = 820", p.freeHouseCash === 820, `${p.freeHouseCash}`);
  ok("levies still reported separately", p.leviesPayable === 150);
  ok("aggregator still reported separately", p.aggregatorPayable === 20);
  ok("rg suspense still reported separately", p.rgSuspensePayable === 7);
  ok("tax reported separately", p.taxPayable === 3);
  // Each term must move the line on its own, or one of them is decorative.
  for (const [k, v] of [["traLevy", 100], ["gbtLevy", 50], ["aggregator", 20], ["rgSuspense", 7], ["tax", 3]] as const) {
    const without = position({ traLevy: 100, gbtLevy: 50, aggregator: 20, rgSuspense: 7, tax: 3, [k]: 0 }, 1_000);
    ok(`   ⛔ dropping ${k} moves the line by ${v}`, without.freeHouseCash - p.freeHouseCash === v,
      `moved ${without.freeHouseCash - p.freeHouseCash}`);
  }
}

// ── §4 · POSITIVE CONTROL ────────────────────────────────────────────────────
console.log("\n§4 · ⚠️ POSITIVE CONTROL — the pre-fix formula must DISAGREE");
{
  const a = { traLevy: 38_081, gbtLevy: 19_089, aggregator: 480, rgSuspense: 0, tax: 18_000 };
  ok("⚠️ pre-fix and fixed disagree when tax is non-zero",
    preFixFreeCash(a, 1_000_000) !== position(a, 1_000_000).freeHouseCash);
  ok("⚠️ …and the gap is the tax", preFixFreeCash(a, 1_000_000) - position(a, 1_000_000).freeHouseCash === 18_000);
  // ⛔ …and they must AGREE when tax is zero, or the comparison is measuring something else.
  const b = { ...a, tax: 0 };
  ok("⚠️ …while they AGREE at zero tax, so the gap is the tax and nothing else",
    preFixFreeCash(b, 1_000_000) === position(b, 1_000_000).freeHouseCash);
}

console.log(`\n${"═".repeat(70)}\n  HOUSE SOLVENCY: ${pass} passed, ${fail} failed\n${"═".repeat(70)}`);
process.exit(fail === 0 ? 0 : 1);
