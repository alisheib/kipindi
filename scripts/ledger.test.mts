/**
 * Double-entry ledger unit tests (in-memory — no DATABASE_URL).
 *
 * Validates the core ledger invariant: every entry group sums to zero.
 * Tests each money-path helper (deposit, withdrawal, stake, settlement,
 * refund, cashout, bonus) and the imbalance rejection guard.
 */
import {
  postLedgerEntries,
  depositEntries,
  withdrawalEntries,
  stakeEntries,
  settlementPayoutEntries,
  refundEntries,
  cashoutEntries,
  bonusGrantEntries,
  bonusCreditEntries,
  bonusExpireEntries,
  internalCreditEntries,
  adjustmentEntries,
  acct,
  type LedgerLine,
} from "../src/lib/server/ledger.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean) {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}`); }
}

function sumOfEntries(entries: LedgerLine[]): number {
  return entries.reduce((s, e) => s + e.amount, 0);
}

function isBalanced(label: string, entries: LedgerLine[]): void {
  const sum = sumOfEntries(entries);
  ok(`${label} balanced (sum=${sum})`, Math.abs(sum) < 0.005);
}

// ── Account naming ──────────────────────────────────────────────────────────

ok("player account format", acct.player("usr_1") === "PLAYER:usr_1");
ok("player bonus account format", acct.playerBonus("usr_1") === "PLAYER_BONUS:usr_1");
ok("pool account format", acct.pool("mkt_1") === "POOL:mkt_1");
ok("external account format", acct.external("MPESA") === "EXTERNAL:MPESA");
ok("house tax is constant", acct.tax === "HOUSE:TAX");
ok("house commission is constant", acct.commission === "HOUSE:COMMISSION");

// ── Deposit entries ─────────────────────────────────────────────────────────

{
  const entries = depositEntries({ txnId: "txn_1", userId: "usr_1", amount: 5000, provider: "MPESA" });
  isBalanced("deposit", entries);
  ok("deposit has 2 entries", entries.length === 2);
  ok("deposit: external debited", entries[0].account === "EXTERNAL:MPESA" && entries[0].amount === -5000);
  ok("deposit: player credited", entries[1].account === "PLAYER:usr_1" && entries[1].amount === 5000);
}

// ── Withdrawal entries (no tax) ─────────────────────────────────────────────

{
  const entries = withdrawalEntries({ txnId: "txn_2", userId: "usr_1", grossAmount: 3000, taxWithheld: 0, provider: "AIRTEL_MONEY" });
  isBalanced("withdrawal no-tax", entries);
  ok("withdrawal: player debited 3000", entries[0].amount === -3000);
  ok("withdrawal: external credited 3000", entries[1].amount === 3000);
  ok("withdrawal: no tax entry", entries.length === 2);
}

// ── Withdrawal entries (with tax) ───────────────────────────────────────────

{
  const entries = withdrawalEntries({ txnId: "txn_3", userId: "usr_1", grossAmount: 10000, taxWithheld: 500, provider: "MPESA" });
  isBalanced("withdrawal with-tax", entries);
  ok("withdrawal+tax: 3 entries", entries.length === 3);
  ok("withdrawal+tax: player debited 10000", entries[0].amount === -10000);
  ok("withdrawal+tax: external credited 9500", entries[1].amount === 9500);
  ok("withdrawal+tax: TRA credited 500", entries[2].account === "HOUSE:TAX" && entries[2].amount === 500);
}

// ── Stake entries (real only) ───────────────────────────────────────────────

{
  const entries = stakeEntries({ txnId: "txn_4", userId: "usr_1", marketId: "mkt_1", realPart: 1000, bonusPart: 0 });
  isBalanced("stake real-only", entries);
  ok("stake: player debited", entries[0].account === "PLAYER:usr_1" && entries[0].amount === -1000);
  ok("stake: pool credited", entries[1].account === "POOL:mkt_1" && entries[1].amount === 1000);
}

// ── Stake entries (mixed real + bonus) ──────────────────────────────────────

{
  const entries = stakeEntries({ txnId: "txn_5", userId: "usr_1", marketId: "mkt_1", realPart: 700, bonusPart: 300 });
  isBalanced("stake mixed", entries);
  ok("stake mixed: 4 entries (real pair + bonus pair)", entries.length === 4);
  ok("stake mixed: bonus debited from bonus account", entries[2].account === "PLAYER_BONUS:usr_1" && entries[2].amount === -300);
  ok("stake mixed: bonus credited to pool", entries[3].account === "POOL:mkt_1" && entries[3].amount === 300);
}

// ── Settlement payout entries ───────────────────────────────────────────────

{
  // 10000 gross pool, 6000 winning pool, player has 2000 stake
  // Rates: 4% tax, 3% commission, 2% reserve, 0% aggregator, 10% TRA levy, 5% GBT levy
  const rates = { taxRate: 0.04, commissionRate: 0.03, reserveRate: 0.02, aggregatorRate: 0, traTaxOnCommissionRate: 0.10, gbtLevyOnCommissionRate: 0.05 };
  const payout = 3033; // settledPayoutWhole would give this for a 2000/6000 share of 9100 netPool
  const entries = settlementPayoutEntries({
    groupId: "settle_1",
    userId: "usr_1",
    marketId: "mkt_1",
    payout,
    stake: 2000,
    grossPool: 10000,
    winningPool: 6000,
    rates,
  });
  isBalanced("settlement payout", entries);
  ok("settlement: has pool debit", entries.some(e => e.account === "POOL:mkt_1" && e.amount < 0));
  ok("settlement: has player credit", entries.some(e => e.account === "PLAYER:usr_1" && e.amount > 0));
  ok("settlement: has tax entry", entries.some(e => e.account === "HOUSE:TAX"));
  ok("settlement: has commission entry", entries.some(e => e.account === "HOUSE:COMMISSION"));
  ok("settlement: has reserve entry", entries.some(e => e.account === "HOUSE:RESERVE"));
  ok("settlement: has TRA levy entries", entries.some(e => e.entryType === "SETTLEMENT_TRA_LEVY"));
  ok("settlement: has GBT levy entries", entries.some(e => e.entryType === "SETTLEMENT_GBT_LEVY"));
}

// ── Refund entries ──────────────────────────────────────────────────────────

{
  const entries = refundEntries({ txnId: "txn_6", userId: "usr_1", marketId: "mkt_1", realPart: 800, bonusPart: 200 });
  isBalanced("refund mixed", entries);
  ok("refund: pool debited (real)", entries[0].amount === -800);
  ok("refund: player credited (real)", entries[1].amount === 800);
  ok("refund: pool debited (bonus)", entries[2].amount === -200);
  ok("refund: bonus credited", entries[3].account === "PLAYER_BONUS:usr_1" && entries[3].amount === 200);
}

// ── Cashout entries ─────────────────────────────────────────────────────────

{
  const entries = cashoutEntries({ txnId: "txn_7", userId: "usr_1", marketId: "mkt_1", value: 900, fee: 100 });
  isBalanced("cashout", entries);
  ok("cashout: pool debited", entries[0].account === "POOL:mkt_1" && entries[0].amount === -900);
  ok("cashout: player credited", entries[1].account === "PLAYER:usr_1" && entries[1].amount === 900);
}

// ── Bonus grant entries ─────────────────────────────────────────────────────

{
  const entries = bonusGrantEntries({ groupId: "bg_1", userId: "usr_1", amount: 500 });
  isBalanced("bonus grant", entries);
  ok("bonus grant: system debited", entries[0].account === "SYSTEM:BONUS" && entries[0].amount === -500);
  ok("bonus grant: bonus credited", entries[1].account === "PLAYER_BONUS:usr_1" && entries[1].amount === 500);
}

// ── Bonus credit (unlock) entries ───────────────────────────────────────────

{
  const entries = bonusCreditEntries({ txnId: "txn_8", userId: "usr_1", amount: 300 });
  isBalanced("bonus credit", entries);
  ok("bonus credit: bonus debited", entries[0].account === "PLAYER_BONUS:usr_1" && entries[0].amount === -300);
  ok("bonus credit: player credited", entries[1].account === "PLAYER:usr_1" && entries[1].amount === 300);
}

// ── Bonus expire entries ────────────────────────────────────────────────────

{
  const entries = bonusExpireEntries({ userId: "usr_1", amount: 200 });
  isBalanced("bonus expire", entries);
  ok("bonus expire: bonus debited", entries[0].account === "PLAYER_BONUS:usr_1" && entries[0].amount === -200);
  ok("bonus expire: void credited", entries[1].account === "SYSTEM:VOID" && entries[1].amount === 200);
}

// ── Internal credit entries ─────────────────────────────────────────────────

{
  const entries = internalCreditEntries({ txnId: "txn_9", userId: "usr_1", amount: 1000, description: "Affiliate reward" });
  isBalanced("internal credit", entries);
  ok("internal credit: system debited", entries[0].account === "SYSTEM:ADJUSTMENT" && entries[0].amount === -1000);
  ok("internal credit: player credited", entries[1].account === "PLAYER:usr_1" && entries[1].amount === 1000);
}

// ── Adjustment entries ──────────────────────────────────────────────────────

{
  // Credit adjustment
  const credit = adjustmentEntries({ txnId: "txn_10", userId: "usr_1", amount: 500, description: "Admin credit" });
  isBalanced("adjustment credit", credit);

  // Debit adjustment (negative amount)
  const debit = adjustmentEntries({ txnId: "txn_11", userId: "usr_1", amount: -300, description: "Admin debit" });
  isBalanced("adjustment debit", debit);
  ok("adjustment debit: player debited", debit[1].amount === -300);
}

// ── postLedgerEntries: graceful no-op without DB ────────────────────────────

{
  // Without DATABASE_URL, postLedgerEntries returns the groupId (no-op pass-through)
  const result = await postLedgerEntries("test_group", depositEntries({ txnId: "txn_test", userId: "usr_1", amount: 1000, provider: "MPESA" }));
  ok("postLedgerEntries returns groupId without DB", result === "test_group");
}

// ── postLedgerEntries: rejects imbalanced groups ────────────────────────────

{
  // Manually craft an imbalanced group (sum != 0)
  const imbalanced: LedgerLine[] = [
    { account: "PLAYER:usr_1", entryType: "DEPOSIT", amount: 1000 },
    { account: "EXTERNAL:MPESA", entryType: "DEPOSIT", amount: -500 }, // should be -1000
  ];
  const result = await postLedgerEntries("imbalanced_test", imbalanced);
  ok("postLedgerEntries rejects imbalanced group", result === null);
}

// ── Empty entries → null ────────────────────────────────────────────────────

{
  const result = await postLedgerEntries("empty_test", []);
  ok("postLedgerEntries returns null for empty", result === null);
}

// ── Zero-amount edge cases ──────────────────────────────────────────────────

{
  const entries = stakeEntries({ txnId: "txn_zero", userId: "usr_1", marketId: "mkt_1", realPart: 0, bonusPart: 0 });
  ok("zero stake produces empty entries", entries.length === 0);
  // But zero still balances
  isBalanced("zero stake", entries);
}

{
  const entries = refundEntries({ txnId: "txn_zero_r", userId: "usr_1", marketId: "mkt_1", realPart: 0, bonusPart: 0 });
  ok("zero refund produces empty entries", entries.length === 0);
}

// ── Full lifecycle test ─────────────────────────────────────────────────────
// Simulate: deposit → bet → win payout → withdrawal
// Verify all groups balanced and account sums make sense.

{
  const allEntries: LedgerLine[] = [];

  // 1. Deposit 10000
  const dep = depositEntries({ txnId: "lc_1", userId: "usr_lc", amount: 10000, provider: "MPESA" });
  allEntries.push(...dep);

  // 2. Stake 5000 (all real)
  const stk = stakeEntries({ txnId: "lc_2", userId: "usr_lc", marketId: "mkt_lc", realPart: 5000, bonusPart: 0 });
  allEntries.push(...stk);

  // 3. Win payout 8000
  const rates = { taxRate: 0.04, commissionRate: 0.03, reserveRate: 0.02, aggregatorRate: 0, traTaxOnCommissionRate: 0.10, gbtLevyOnCommissionRate: 0.05 };
  const pay = settlementPayoutEntries({ groupId: "settle_lc", userId: "usr_lc", marketId: "mkt_lc", payout: 8000, stake: 5000, grossPool: 12000, winningPool: 5000, rates });
  allEntries.push(...pay);

  // 4. Withdraw 3000 (with 150 tax)
  const wdr = withdrawalEntries({ txnId: "lc_4", userId: "usr_lc", grossAmount: 3000, taxWithheld: 150, provider: "MPESA" });
  allEntries.push(...wdr);

  // Each group should be balanced
  isBalanced("lifecycle: deposit group", dep);
  isBalanced("lifecycle: stake group", stk);
  isBalanced("lifecycle: payout group", pay);
  isBalanced("lifecycle: withdrawal group", wdr);

  // Player account: +10000 (dep) - 5000 (stake) + 8000 (payout) - 3000 (wdr) = 10000
  const playerSum = allEntries
    .filter(e => e.account === acct.player("usr_lc"))
    .reduce((s, e) => s + e.amount, 0);
  ok(`lifecycle: player balance = 10000 (got ${playerSum})`, playerSum === 10000);

  // Overall system: sum of ALL entries = 0
  const totalSum = allEntries.reduce((s, e) => s + e.amount, 0);
  ok(`lifecycle: system balanced (sum=${totalSum})`, Math.abs(totalSum) < 0.005);
}

console.log(`\nledger: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
