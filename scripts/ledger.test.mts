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
import { poolFee, settledPayoutFor, DEFAULT_COMMISSION_RATE, DEFAULT_FEE_CEILING_RATE } from "../src/lib/payout.ts";

/** The poll's fee rates. Two numbers now, not four. */
const RATES = { commissionRate: DEFAULT_COMMISSION_RATE, feeCeilingRate: DEFAULT_FEE_CEILING_RATE };
/** The levies on OUR fee. Never on the player. */
const LEVIES = { traTaxOnCommissionRate: 0.10, gbtLevyOnCommissionRate: 0.05 };

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, _extra?: string) {
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

// ── Withdrawal entries (zero fee — the rate can be tuned to 0) ──────────────

{
  const entries = withdrawalEntries({ txnId: "txn_2", userId: "usr_1", grossAmount: 3000, fee: 0, gatewayShare: 0, provider: "AIRTEL_MONEY" });
  isBalanced("withdrawal zero-fee", entries);
  ok("withdrawal: player debited 3000", entries[0].amount === -3000);
  ok("withdrawal: external credited 3000", entries[1].amount === 3000);
  ok("withdrawal: no fee entries when the rate is 0", entries.length === 2);
}

// ── Withdrawal entries (the 1% fee, split with the gateway) ─────────────────
//
// ⚠️ These two blocks used to assert a WITHHOLDING TAX — `taxWithheld: 500` on a
// 10,000 withdrawal, credited to HOUSE:TAX. In production that rate was a
// hardcoded 15% applied to EVERY withdrawal, including a player's own untouched
// deposit: deposit 100,000, bet nothing, withdraw, receive 85,000. It is deleted.
// Taxes are levied only on OUR commission, never on a player's money.
{
  const entries = withdrawalEntries({ txnId: "txn_3", userId: "usr_1", grossAmount: 10000, fee: 100, gatewayShare: 50, provider: "MPESA" });
  isBalanced("withdrawal with 1% fee", entries);
  ok("withdrawal+fee: 4 entries (player, external, gateway, operator)", entries.length === 4);
  ok("withdrawal+fee: player debited 10000", entries[0].amount === -10000);
  ok("withdrawal+fee: player RECEIVES 9900 — only the 1% fee is taken", entries[1].amount === 9900);
  ok("withdrawal+fee: gateway credited 50", entries.some(e => e.account === "HOUSE:AGGREGATOR" && e.amount === 50));
  ok("withdrawal+fee: operator keeps 50", entries.some(e => e.account === "HOUSE:COMMISSION" && e.amount === 50));
  ok("withdrawal+fee: NO withholding tax", !entries.some(e => e.account === "HOUSE:TAX"));
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
  // A real poll: YES 6,000 / NO 4,000. Pool 10,000, smaller side 4,000.
  //   commission = 10% × 10,000 = 1,000
  //   ceiling    = 1/3 × 4,000  = 1,333
  //   fee        = min(1000, 1333) = 1,000  (the commission binds; poll isn't lopsided)
  //   netPool    = 9,000
  // A 2,000 stake on the winning YES side (pool 6,000) takes 1/3 of netPool = 3,000.
  //
  // The fee is now ONE number, not four rate-slices of the pool. HOUSE:TAX,
  // HOUSE:RESERVE and HOUSE:AGGREGATOR are no longer credited at settlement —
  // taxRate/reserveRate/aggregatorRate are gone. The accounts remain on the books
  // for historical rows; they are simply never written again.
  const feeB = poolFee(6000, 4000, RATES);
  ok("fee is the commission (poll not lopsided enough to cap)", Math.round(feeB.fee) === 1000, `fee=${feeB.fee}`);

  const payout = settledPayoutFor({ yesPool: 6000, noPool: 4000, side: "YES", stake: 2000 }, RATES).payout;
  ok("payout is 3,000 (2000/6000 of a 9,000 netPool)", payout === 3000, `payout=${payout}`);
  ok("WINNER FLOOR: payout ≥ stake", payout >= 2000);

  const entries = settlementPayoutEntries({
    groupId: "settle_1",
    userId: "usr_1",
    marketId: "mkt_1",
    payout,
    stake: 2000,
    fee: feeB.fee,
    winningPool: 6000,
    rates: LEVIES,
  });
  isBalanced("settlement payout", entries);
  ok("settlement: has pool debit", entries.some(e => e.account === "POOL:mkt_1" && e.amount < 0));
  ok("settlement: has player credit", entries.some(e => e.account === "PLAYER:usr_1" && e.amount > 0));
  ok("settlement: has commission entry", entries.some(e => e.account === "HOUSE:COMMISSION"));
  ok("settlement: has TRA levy entries", entries.some(e => e.entryType === "SETTLEMENT_TRA_LEVY"));
  ok("settlement: has GBT levy entries", entries.some(e => e.entryType === "SETTLEMENT_GBT_LEVY"));
  // The retired accounts must never be credited again.
  ok("settlement: NO tax entry (taxRate is deleted)", !entries.some(e => e.account === "HOUSE:TAX"));
  ok("settlement: NO reserve entry (reserveRate is deleted)", !entries.some(e => e.account === "HOUSE:RESERVE"));

  // This winner's share of the fee: 2000/6000 of 1,000 = 333.
  const comm = entries.find(e => e.account === "HOUSE:COMMISSION" && e.entryType === "SETTLEMENT_COMMISSION")!;
  ok("commission booked is THIS winner's share of the poll fee (333)", comm.amount === 333, `got=${comm.amount}`);
}

// ── Cash-out: the fee must reach the HOUSE, not stay in the pool ────────────
//
// The old cashoutEntries moved ONLY the player's net proceeds out of the pool and
// left the fee behind, where the remaining bettors collected it — 50pick earned
// nothing on an early exit. The pool must now give up the WHOLE stake.
{
  const entries = cashoutEntries({
    txnId: "txn_co", userId: "usr_co", marketId: "mkt_co",
    value: 9_000, fee: 1_000, rates: LEVIES,
  });
  isBalanced("cashout with house fee", entries);

  const poolLine = entries.find(e => e.account === "POOL:mkt_co")!;
  ok("cashout: the pool gives up the WHOLE stake (10,000), not just the payout", poolLine.amount === -10_000, `pool=${poolLine.amount}`);
  ok("cashout: the player receives 9,000", entries.some(e => e.account === "PLAYER:usr_co" && e.amount === 9_000));
  ok("cashout: the FEE reaches the house", entries.some(e => e.account === "HOUSE:COMMISSION" && e.entryType === "CASHOUT_FEE" && e.amount === 1_000));
  ok("cashout: TRA levy is charged on the early-exit fee", entries.some(e => e.entryType === "SETTLEMENT_TRA_LEVY" && e.account === "HOUSE:TRA_LEVY"));
  ok("cashout: GBT levy is charged on the early-exit fee", entries.some(e => e.entryType === "SETTLEMENT_GBT_LEVY" && e.account === "HOUSE:GBT_LEVY"));
}

// ── Withdrawal: 1% fee, split with the gateway. NO withholding tax. ─────────
{
  const entries = withdrawalEntries({
    txnId: "txn_w", userId: "usr_w", grossAmount: 100_000,
    fee: 1_000,           // 1%
    gatewayShare: 500,    // 0.5% → the gateway; we keep the other 500
    provider: "MPESA",
  });
  isBalanced("withdrawal with fee", entries);
  ok("withdrawal: player debited the full 100,000", entries.some(e => e.account === "PLAYER:usr_w" && e.amount === -100_000));
  ok("withdrawal: player RECEIVES 99,000 (only the 1% fee is taken)", entries.some(e => e.account === "EXTERNAL:MPESA" && e.amount === 99_000));
  ok("withdrawal: gateway gets its 500", entries.some(e => e.account === "HOUSE:AGGREGATOR" && e.amount === 500));
  ok("withdrawal: operator keeps 500", entries.some(e => e.account === "HOUSE:COMMISSION" && e.amount === 500));
  // The 15% withholding tax is DELETED. It took 15,000 off this withdrawal —
  // including from a player who deposited and never bet.
  ok("withdrawal: NO withholding tax entry", !entries.some(e => e.entryType === "WITHDRAWAL_TAX" || e.account === "HOUSE:TAX"));
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
//
// This block used to assert `pool debited === -900` on a 1,000 stake with a 100
// fee — i.e. it asserted THE LEAK: only the player's proceeds left the pool, and
// the 100 fee stayed behind for the other bettors. The pool must give up the
// whole 1,000.
{
  const entries = cashoutEntries({ txnId: "txn_7", userId: "usr_1", marketId: "mkt_1", value: 900, fee: 100, rates: LEVIES });
  isBalanced("cashout", entries);
  ok("cashout: pool gives up the WHOLE stake (1,000)", entries[0].account === "POOL:mkt_1" && entries[0].amount === -1000);
  ok("cashout: player credited 900", entries[1].account === "PLAYER:usr_1" && entries[1].amount === 900);
  ok("cashout: the 100 fee reaches the house", entries.some(e => e.account === "HOUSE:COMMISSION" && e.amount === 100));
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

  // 3. Win payout — a real poll: YES 5,000 / NO 7,000 (pool 12,000, smaller 5,000).
  //    The winning side is the SMALLER one here, so the ceiling is slack and the
  //    10% commission binds: fee = min(1,200, 1,667) = 1,200; netPool = 10,800.
  //    The whole 5,000 YES side is one player, so he takes all of it.
  const lcFee = poolFee(5000, 7000, RATES);
  const lcPayout = settledPayoutFor({ yesPool: 5000, noPool: 7000, side: "YES", stake: 5000 }, RATES).payout;
  ok("lifecycle: WINNER FLOOR — payout ≥ stake", lcPayout >= 5000);
  const pay = settlementPayoutEntries({ groupId: "settle_lc", userId: "usr_lc", marketId: "mkt_lc", payout: lcPayout, stake: 5000, fee: lcFee.fee, winningPool: 5000, rates: LEVIES });
  allEntries.push(...pay);

  // 4. Withdraw 3000 — the 1% fee (30), of which 15 is the gateway's. No tax.
  const wdr = withdrawalEntries({ txnId: "lc_4", userId: "usr_lc", grossAmount: 3000, fee: 30, gatewayShare: 15, provider: "MPESA" });
  allEntries.push(...wdr);

  // Each group should be balanced
  isBalanced("lifecycle: deposit group", dep);
  isBalanced("lifecycle: stake group", stk);
  isBalanced("lifecycle: payout group", pay);
  isBalanced("lifecycle: withdrawal group", wdr);

  // Player account: +10000 (dep) − 5000 (stake) + lcPayout − 3000 (withdrawal).
  // Derived from the real payout rather than hardcoded, so the assertion stays
  // true when a rate moves — and still fails loudly if the LEDGER disagrees with
  // the PAYOUT ENGINE, which is the thing this is actually here to catch.
  const expectedPlayer = 10_000 - 5_000 + lcPayout - 3_000;
  const playerSum = allEntries
    .filter(e => e.account === acct.player("usr_lc"))
    .reduce((s, e) => s + e.amount, 0);
  ok(`lifecycle: player balance = ${expectedPlayer} (got ${playerSum})`, playerSum === expectedPlayer);

  // Overall system: sum of ALL entries = 0
  const totalSum = allEntries.reduce((s, e) => s + e.amount, 0);
  ok(`lifecycle: system balanced (sum=${totalSum})`, Math.abs(totalSum) < 0.005);
}

console.log(`\nledger: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
