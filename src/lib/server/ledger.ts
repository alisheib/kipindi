/**
 * Double-entry ledger — Elevation Phase 1, item #3.
 *
 * Every money movement is recorded as a balanced group of entries where
 * SUM(amount) = 0 within each groupId. This runs ALONGSIDE the existing
 * Transaction table (dual-write); the Transaction table is untouched.
 *
 * Virtual accounts:
 *   PLAYER:{userId}          — player's wallet balance
 *   PLAYER_BONUS:{userId}    — player's bonus balance
 *   EXTERNAL:{provider}      — external payment provider (M-Pesa, Airtel, etc.)
 *   POOL:{marketId}          — market's betting pool
 *   HOUSE:COMMISSION         — operator revenue: the capped pool fee, the
 *                              early-exit fee, and our slice of the 1% withdrawal fee
 *   HOUSE:AGGREGATOR         — the payment gateway's slice of the withdrawal fee
 *   HOUSE:TRA_LEVY           — TRA tax, levied on our commission
 *   HOUSE:GBT_LEVY           — GBT gaming board levy, levied on our commission
 *   SYSTEM:BONUS             — bonus issuance source
 *   SYSTEM:ADJUSTMENT        — admin adjustments
 *   SYSTEM:VOID              — expired/cancelled bonus sink
 *
 *   HOUSE:TAX, HOUSE:RESERVE — RETIRED 2026-07 with taxRate/reserveRate. Never
 *                              credited again; historical entries remain, so the
 *                              accounts stay on the books and still reconcile.
 */

import { prisma } from "./prisma";
import { randomId } from "./crypto";
import type { LedgerEntryType } from "@prisma/client";

// ── Types ──────────────────────────────────────────────────────────────────

export interface LedgerLine {
  account: string;
  entryType: LedgerEntryType;
  amount: number; // positive = credit, negative = debit
  memo?: string;
  txnId?: string;
  marketId?: string;
  userId?: string;
}

// ── Core: post balanced entries ────────────────────────────────────────────

/**
 * Post a balanced group of ledger entries. The sum of all amounts MUST be 0.
 * Returns the groupId on success, null if no database or entries are empty.
 *
 * This is fire-and-forget safe: if the DB is down the existing Transaction
 * flow still works (graceful degradation). The ledger is a secondary
 * accounting layer, not the gate for wallet mutations.
 */
export async function postLedgerEntries(
  groupId: string,
  entries: LedgerLine[],
): Promise<string | null> {
  if (entries.length === 0) return null;

  // Invariant: balanced entries (sum must be 0, within rounding tolerance)
  const sum = entries.reduce((s, e) => s + e.amount, 0);
  if (Math.abs(sum) > 0.005) {
    console.error(`[ledger] IMBALANCED group ${groupId}: sum=${sum}`, entries);
    return null;
  }

  const pc = prisma();
  if (!pc) {
    // No database (local dev / unit tests) — entries are skipped.
    // The in-memory store doesn't have a LedgerEntry model.
    return groupId;
  }

  try {
    await pc.ledgerEntry.createMany({
      data: entries.map((e) => ({
        id: `le_${randomId(12)}`,
        groupId,
        account: e.account,
        entryType: e.entryType,
        amount: e.amount,
        memo: e.memo ?? null,
        txnId: e.txnId ?? null,
        marketId: e.marketId ?? null,
        userId: e.userId ?? null,
      })),
    });
    return groupId;
  } catch (err) {
    // Fire-and-forget: log the error but don't crash the money path.
    // The existing Transaction table is the primary record; the ledger is
    // a reconciliation layer. A missing ledger group is detectable by
    // reconciliation and backfillable from the Transaction history.
    console.error(`[ledger] Failed to post group ${groupId}:`, err);
    return null;
  }
}

// ── Account helpers ────────────────────────────────────────────────────────

export const acct = {
  player: (userId: string) => `PLAYER:${userId}`,
  playerBonus: (userId: string) => `PLAYER_BONUS:${userId}`,
  external: (provider: string) => `EXTERNAL:${provider || "INTERNAL"}`,
  pool: (marketId: string) => `POOL:${marketId}`,
  tax: "HOUSE:TAX" as const,
  commission: "HOUSE:COMMISSION" as const,
  reserve: "HOUSE:RESERVE" as const,
  aggregator: "HOUSE:AGGREGATOR" as const,
  traLevy: "HOUSE:TRA_LEVY" as const,
  gbtLevy: "HOUSE:GBT_LEVY" as const,
  bonus: "SYSTEM:BONUS" as const,
  adjustment: "SYSTEM:ADJUSTMENT" as const,
  void: "SYSTEM:VOID" as const,
};

// ── Pre-built entry helpers for each money path ────────────────────────────

/** Deposit: external money → player wallet */
export function depositEntries(opts: {
  txnId: string;
  userId: string;
  amount: number;
  provider: string;
}): LedgerLine[] {
  return [
    { account: acct.external(opts.provider), entryType: "DEPOSIT", amount: -opts.amount, txnId: opts.txnId, userId: opts.userId, memo: `Deposit from ${opts.provider}` },
    { account: acct.player(opts.userId), entryType: "DEPOSIT", amount: opts.amount, txnId: opts.txnId, userId: opts.userId, memo: `Deposit received` },
  ];
}

/**
 * Withdrawal: player wallet → external, minus the withdrawal fee.
 *
 * ⚠️ THERE IS NO WITHHOLDING TAX. The old path withheld 15% of EVERY withdrawal
 * — `computeWithdrawalTax(amount, amount)`, whose own comment called itself
 * "naïve" — including money a player had deposited and never bet. Deposit
 * 100,000, place no bet, withdraw, receive 85,000. Ali's decision: taxes are only
 * ever on OUR commission, never on the player. That function is deleted.
 *
 * A player now pays exactly one thing on a withdrawal: `withdrawalFeeRate` (1%).
 * Of that, `withdrawalGatewayShareRate` (0.5% of the amount) is what the payment
 * gateway charges us, and we keep the rest.
 */
export function withdrawalEntries(opts: {
  txnId: string;
  userId: string;
  grossAmount: number;
  /** Total charged to the player (1% of gross). */
  fee: number;
  /** The gateway's slice of that fee. The remainder is ours. */
  gatewayShare: number;
  provider: string;
}): LedgerLine[] {
  const fee = Math.max(0, Math.round(opts.fee));
  const gatewayShare = Math.min(fee, Math.max(0, Math.round(opts.gatewayShare)));
  const houseShare = fee - gatewayShare;
  const net = opts.grossAmount - fee;

  const lines: LedgerLine[] = [
    { account: acct.player(opts.userId), entryType: "WITHDRAWAL", amount: -opts.grossAmount, txnId: opts.txnId, userId: opts.userId, memo: `Withdrawal` },
    { account: acct.external(opts.provider), entryType: "WITHDRAWAL", amount: net, txnId: opts.txnId, userId: opts.userId, memo: `Payout to ${opts.provider}` },
  ];
  if (gatewayShare > 0) {
    lines.push({ account: acct.aggregator, entryType: "WITHDRAWAL_FEE", amount: gatewayShare, txnId: opts.txnId, userId: opts.userId, memo: `Payment gateway fee` });
  }
  if (houseShare > 0) {
    lines.push({ account: acct.commission, entryType: "WITHDRAWAL_FEE", amount: houseShare, txnId: opts.txnId, userId: opts.userId, memo: `Withdrawal fee (operator)` });
  }
  return lines;
}

/** Bet placement: player wallet (and/or bonus) → market pool */
export function stakeEntries(opts: {
  txnId: string;
  userId: string;
  marketId: string;
  realPart: number;
  bonusPart: number;
}): LedgerLine[] {
  const lines: LedgerLine[] = [];
  if (opts.realPart > 0) {
    lines.push(
      { account: acct.player(opts.userId), entryType: "STAKE_DEBIT", amount: -opts.realPart, txnId: opts.txnId, userId: opts.userId, marketId: opts.marketId, memo: "Stake (real)" },
      { account: acct.pool(opts.marketId), entryType: "STAKE_DEBIT", amount: opts.realPart, txnId: opts.txnId, userId: opts.userId, marketId: opts.marketId, memo: "Stake received" },
    );
  }
  if (opts.bonusPart > 0) {
    lines.push(
      { account: acct.playerBonus(opts.userId), entryType: "BONUS_SPEND", amount: -opts.bonusPart, txnId: opts.txnId, userId: opts.userId, marketId: opts.marketId, memo: "Stake (bonus)" },
      { account: acct.pool(opts.marketId), entryType: "BONUS_SPEND", amount: opts.bonusPart, txnId: opts.txnId, userId: opts.userId, marketId: opts.marketId, memo: "Bonus stake received" },
    );
  }
  return lines;
}

/**
 * Settlement payout: market pool → player wallet + house accounts.
 *
 * The fee is now ONE number — `min(commissionRate × pool, feeCeilingRate ×
 * smallerSide)` — not four rate-slices of the pool. So this books the winner's
 * proportional share of that single fee to HOUSE:COMMISSION, and the TRA/GBT
 * levies out of it.
 *
 * HOUSE:TAX / HOUSE:RESERVE / HOUSE:AGGREGATOR are no longer credited at
 * settlement: taxRate, reserveRate and aggregatorRate are gone. The accounts
 * still exist on the ledger because historical entries reference them and the
 * books must still add up — they are simply never credited again.
 *
 * Conservation: each GROUP sums to exactly zero — pool debit == player credit +
 * commission + levies. That is the property `postLedgerEntries` enforces, and a
 * group that failed it would be REJECTED and silently dropped, so it matters.
 *
 * Rounding: the caller passes the whole poll's `fee` and this books only THIS
 * winner's share of it (`round(share × fee)`). Summed across winners that
 * reconstitutes the fee to within **under 1 TZS per winner** — inherent dust in any
 * pari-mutuel with integer payouts, and the same dust the old model carried. The
 * POOL account can therefore end a settlement a shilling or two off zero. No real
 * money is created or destroyed by it: the wallet credit and the ledger's player
 * line are the SAME `payout` value, so a player is never paid a different amount
 * than the books say. Bounded and asserted in scripts/money-invariants.test.mts
 * (GLOBAL conservation, dust ≤ winners + markets + 2).
 */
export function settlementPayoutEntries(opts: {
  groupId: string;
  userId: string;
  marketId: string;
  payout: number;
  stake: number;
  /** The WHOLE poll's fee in TZS, from poolFee(). Not a rate. */
  fee: number;
  winningPool: number;
  rates: { traTaxOnCommissionRate: number; gbtLevyOnCommissionRate: number };
}): LedgerLine[] {
  // This winner's share of the poll's single fee.
  const share = opts.winningPool > 0 ? opts.stake / opts.winningPool : 0;
  const commAmt = Math.max(0, Math.round(share * opts.fee));
  const traLevyAmt = Math.round(commAmt * opts.rates.traTaxOnCommissionRate);
  const gbtLevyAmt = Math.round(commAmt * opts.rates.gbtLevyOnCommissionRate);

  const netPayout = opts.payout;
  // The pool gives up the player's payout plus his share of our fee. Nothing else.
  const totalCredits = netPayout + commAmt;

  const lines: LedgerLine[] = [
    { account: acct.pool(opts.marketId), entryType: "PAYOUT_CREDIT", amount: -totalCredits, userId: opts.userId, marketId: opts.marketId, memo: `Settlement debit` },
    { account: acct.player(opts.userId), entryType: "PAYOUT_CREDIT", amount: netPayout, userId: opts.userId, marketId: opts.marketId, memo: `Payout` },
  ];

  if (commAmt > 0) {
    lines.push({ account: acct.commission, entryType: "SETTLEMENT_COMMISSION", amount: commAmt, marketId: opts.marketId, memo: `Commission` });
    // The levies come OUT of our commission — never out of the player's payout.
    if (traLevyAmt > 0) {
      lines.push(
        { account: acct.commission, entryType: "SETTLEMENT_TRA_LEVY", amount: -traLevyAmt, marketId: opts.marketId, memo: `TRA levy on commission` },
        { account: acct.traLevy, entryType: "SETTLEMENT_TRA_LEVY", amount: traLevyAmt, marketId: opts.marketId, memo: `TRA levy received` },
      );
    }
    if (gbtLevyAmt > 0) {
      lines.push(
        { account: acct.commission, entryType: "SETTLEMENT_GBT_LEVY", amount: -gbtLevyAmt, marketId: opts.marketId, memo: `GBT levy on commission` },
        { account: acct.gbtLevy, entryType: "SETTLEMENT_GBT_LEVY", amount: gbtLevyAmt, marketId: opts.marketId, memo: `GBT levy received` },
      );
    }
  }

  return lines;
}

/** Refund (void): market pool → player wallet */
export function refundEntries(opts: {
  txnId: string;
  userId: string;
  marketId: string;
  realPart: number;
  bonusPart: number;
}): LedgerLine[] {
  const lines: LedgerLine[] = [];
  if (opts.realPart > 0) {
    lines.push(
      { account: acct.pool(opts.marketId), entryType: "REFUND", amount: -opts.realPart, txnId: opts.txnId, userId: opts.userId, marketId: opts.marketId, memo: "Void refund" },
      { account: acct.player(opts.userId), entryType: "REFUND", amount: opts.realPart, txnId: opts.txnId, userId: opts.userId, marketId: opts.marketId, memo: "Void refund received" },
    );
  }
  if (opts.bonusPart > 0) {
    lines.push(
      { account: acct.pool(opts.marketId), entryType: "BONUS_REFUND", amount: -opts.bonusPart, txnId: opts.txnId, userId: opts.userId, marketId: opts.marketId, memo: "Bonus refund" },
      { account: acct.playerBonus(opts.userId), entryType: "BONUS_REFUND", amount: opts.bonusPart, txnId: opts.txnId, userId: opts.userId, marketId: opts.marketId, memo: "Bonus refund received" },
    );
  }
  return lines;
}

/**
 * Cashout: market pool → player wallet + HOUSE.
 *
 * ⚠️ THE FEE IS REVENUE NOW. It used to be left sitting in the pool: the player
 * was charged it, but it was never removed, so the REMAINING PLAYERS collected it
 * at resolution and 50pick earned exactly ZERO on every early exit. The old
 * comment here described that leak as intentional ("it stays distributed among
 * remaining participants") while market-config.ts's docstring simultaneously
 * claimed the fee was "booked to the house reserve as operator revenue". Two
 * files, two stories, and the money went to neither of them on purpose.
 *
 * Now: the whole stake leaves the pool, `value` goes to the player, and `fee`
 * goes to HOUSE:COMMISSION — carrying the TRA/GBT levies like any other fee we
 * earn, because it IS a fee we earn.
 */
export function cashoutEntries(opts: {
  txnId: string;
  userId: string;
  marketId: string;
  value: number;   // net amount the player receives
  fee: number;     // our commission — leaves the pool, lands on the house
  rates: { traTaxOnCommissionRate: number; gbtLevyOnCommissionRate: number };
}): LedgerLine[] {
  const fee = Math.max(0, Math.round(opts.fee));
  const traLevyAmt = Math.round(fee * opts.rates.traTaxOnCommissionRate);
  const gbtLevyAmt = Math.round(fee * opts.rates.gbtLevyOnCommissionRate);

  // The pool gives up the player's whole stake: his proceeds + our fee.
  const lines: LedgerLine[] = [
    { account: acct.pool(opts.marketId), entryType: "CASHOUT", amount: -(opts.value + fee), txnId: opts.txnId, userId: opts.userId, marketId: opts.marketId, memo: `Cash out (stake leaves pool)` },
    { account: acct.player(opts.userId), entryType: "CASHOUT", amount: opts.value, txnId: opts.txnId, userId: opts.userId, marketId: opts.marketId, memo: `Cash out received` },
  ];

  if (fee > 0) {
    lines.push({ account: acct.commission, entryType: "CASHOUT_FEE", amount: fee, txnId: opts.txnId, marketId: opts.marketId, memo: `Early-exit fee` });
    if (traLevyAmt > 0) {
      lines.push(
        { account: acct.commission, entryType: "SETTLEMENT_TRA_LEVY", amount: -traLevyAmt, txnId: opts.txnId, marketId: opts.marketId, memo: `TRA levy on early-exit fee` },
        { account: acct.traLevy, entryType: "SETTLEMENT_TRA_LEVY", amount: traLevyAmt, txnId: opts.txnId, marketId: opts.marketId, memo: `TRA levy received` },
      );
    }
    if (gbtLevyAmt > 0) {
      lines.push(
        { account: acct.commission, entryType: "SETTLEMENT_GBT_LEVY", amount: -gbtLevyAmt, txnId: opts.txnId, marketId: opts.marketId, memo: `GBT levy on early-exit fee` },
        { account: acct.gbtLevy, entryType: "SETTLEMENT_GBT_LEVY", amount: gbtLevyAmt, txnId: opts.txnId, marketId: opts.marketId, memo: `GBT levy received` },
      );
    }
  }

  return lines;
}

/** Bonus grant: system → player bonus account */
export function bonusGrantEntries(opts: {
  groupId: string;
  userId: string;
  amount: number;
}): LedgerLine[] {
  return [
    { account: acct.bonus, entryType: "BONUS_GRANT", amount: -opts.amount, userId: opts.userId, memo: "Bonus issued" },
    { account: acct.playerBonus(opts.userId), entryType: "BONUS_GRANT", amount: opts.amount, userId: opts.userId, memo: "Bonus received" },
  ];
}

/** Bonus unlock (wagering met): bonus account → real balance */
export function bonusCreditEntries(opts: {
  txnId: string;
  userId: string;
  amount: number;
}): LedgerLine[] {
  return [
    { account: acct.playerBonus(opts.userId), entryType: "BONUS_CREDIT", amount: -opts.amount, txnId: opts.txnId, userId: opts.userId, memo: "Bonus unlocked" },
    { account: acct.player(opts.userId), entryType: "BONUS_CREDIT", amount: opts.amount, txnId: opts.txnId, userId: opts.userId, memo: "Bonus converted to balance" },
  ];
}

/** Bonus expiry: bonus account → void */
export function bonusExpireEntries(opts: {
  userId: string;
  amount: number;
}): LedgerLine[] {
  return [
    { account: acct.playerBonus(opts.userId), entryType: "BONUS_EXPIRE", amount: -opts.amount, userId: opts.userId, memo: "Bonus expired" },
    { account: acct.void, entryType: "BONUS_EXPIRE", amount: opts.amount, userId: opts.userId, memo: "Expired bonus absorbed" },
  ];
}

/** Internal credit (affiliate reward, proposal prize): system → player */
export function internalCreditEntries(opts: {
  txnId: string;
  userId: string;
  amount: number;
  description: string;
}): LedgerLine[] {
  return [
    { account: acct.adjustment, entryType: "INTERNAL_CREDIT", amount: -opts.amount, txnId: opts.txnId, userId: opts.userId, memo: opts.description },
    { account: acct.player(opts.userId), entryType: "INTERNAL_CREDIT", amount: opts.amount, txnId: opts.txnId, userId: opts.userId, memo: opts.description },
  ];
}

/** Admin adjustment (credit or debit) */
export function adjustmentEntries(opts: {
  txnId: string;
  userId: string;
  amount: number;
  description: string;
}): LedgerLine[] {
  return [
    { account: acct.adjustment, entryType: "ADJUSTMENT", amount: -opts.amount, txnId: opts.txnId, userId: opts.userId, memo: opts.description },
    { account: acct.player(opts.userId), entryType: "ADJUSTMENT", amount: opts.amount, txnId: opts.txnId, userId: opts.userId, memo: opts.description },
  ];
}

// ── Reconciliation ─────────────────────────────────────────────────────────

/** Check that every ledger group sums to zero. Returns imbalanced groups. */
export async function reconcileLedger(): Promise<{
  totalGroups: number;
  imbalanced: Array<{ groupId: string; sum: number }>;
}> {
  const pc = prisma();
  if (!pc) return { totalGroups: 0, imbalanced: [] };

  // Raw query because Prisma doesn't support HAVING on grouped aggregates.
  // $executeRaw returns void; use $queryRawUnsafe for SELECT.
  const results = await pc.$queryRawUnsafe<Array<{ groupId: string; sum: string }>>(
    `SELECT "groupId", SUM(amount) as sum
     FROM "LedgerEntry"
     GROUP BY "groupId"
     HAVING ABS(SUM(amount)) > 0.005`,
  );

  const totalGroupsResult = await pc.$queryRawUnsafe<Array<{ count: string }>>(
    `SELECT COUNT(DISTINCT "groupId") as count FROM "LedgerEntry"`,
  );
  const totalGroups = Number(totalGroupsResult[0]?.count ?? 0);

  return {
    totalGroups,
    imbalanced: results.map((r) => ({ groupId: r.groupId, sum: Number(r.sum) })),
  };
}

/** Get account balance from ledger (sum of all entries for an account). */
export async function ledgerAccountBalance(account: string): Promise<number> {
  const pc = prisma();
  if (!pc) return 0;

  const result = await pc.$queryRawUnsafe<Array<{ sum: string | null }>>(
    `SELECT SUM(amount) as sum FROM "LedgerEntry" WHERE account = $1`,
    account,
  );
  return Number(result[0]?.sum ?? 0);
}

/** Get all house account balances for the admin dashboard. */
export async function houseAccountBalances(): Promise<Record<string, number>> {
  const pc = prisma();
  if (!pc) return {};

  const results = await pc.$queryRawUnsafe<Array<{ account: string; sum: string }>>(
    `SELECT account, SUM(amount) as sum
     FROM "LedgerEntry"
     WHERE account LIKE 'HOUSE:%' OR account LIKE 'SYSTEM:%'
     GROUP BY account
     ORDER BY account`,
  );

  const balances: Record<string, number> = {};
  for (const r of results) {
    balances[r.account] = Number(r.sum);
  }
  return balances;
}
