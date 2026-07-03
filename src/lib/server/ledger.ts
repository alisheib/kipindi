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
 *   HOUSE:TAX                — TRA withholding tax
 *   HOUSE:COMMISSION         — operator revenue (commission)
 *   HOUSE:RESERVE            — operator reserve fund
 *   HOUSE:AGGREGATOR         — payment aggregator fees
 *   HOUSE:TRA_LEVY           — TRA tax on commission
 *   HOUSE:GBT_LEVY           — GBT gaming board levy on commission
 *   SYSTEM:BONUS             — bonus issuance source
 *   SYSTEM:ADJUSTMENT        — admin adjustments
 *   SYSTEM:VOID              — expired/cancelled bonus sink
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

/** Withdrawal: player wallet → external (with optional tax split) */
export function withdrawalEntries(opts: {
  txnId: string;
  userId: string;
  grossAmount: number;
  taxWithheld: number;
  provider: string;
}): LedgerLine[] {
  const net = opts.grossAmount - opts.taxWithheld;
  const lines: LedgerLine[] = [
    { account: acct.player(opts.userId), entryType: "WITHDRAWAL", amount: -opts.grossAmount, txnId: opts.txnId, userId: opts.userId, memo: `Withdrawal` },
    { account: acct.external(opts.provider), entryType: "WITHDRAWAL", amount: net, txnId: opts.txnId, userId: opts.userId, memo: `Payout to ${opts.provider}` },
  ];
  if (opts.taxWithheld > 0) {
    lines.push({ account: acct.tax, entryType: "WITHDRAWAL_TAX", amount: opts.taxWithheld, txnId: opts.txnId, userId: opts.userId, memo: `Withholding tax` });
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

/** Settlement payout: market pool → player wallet + house accounts */
export function settlementPayoutEntries(opts: {
  groupId: string;
  userId: string;
  marketId: string;
  payout: number;
  stake: number;
  grossPool: number;
  winningPool: number;
  rates: { taxRate: number; commissionRate: number; reserveRate: number; aggregatorRate: number; traTaxOnCommissionRate: number; gbtLevyOnCommissionRate: number };
}): LedgerLine[] {
  // The payout already has fees deducted. Calculate the player's proportional
  // share of each fee bucket so the ledger entries sum to zero.
  const share = opts.winningPool > 0 ? opts.stake / opts.winningPool : 0;
  const totalFeeRate = opts.rates.taxRate + opts.rates.commissionRate + opts.rates.reserveRate + opts.rates.aggregatorRate;
  const grossShare = Math.round(share * opts.grossPool);
  const taxAmt = Math.round(share * opts.grossPool * opts.rates.taxRate);
  const commAmt = Math.round(share * opts.grossPool * opts.rates.commissionRate);
  const reserveAmt = Math.round(share * opts.grossPool * opts.rates.reserveRate);
  const aggAmt = Math.round(share * opts.grossPool * opts.rates.aggregatorRate);
  const traLevyAmt = Math.round(commAmt * opts.rates.traTaxOnCommissionRate);
  const gbtLevyAmt = Math.round(commAmt * opts.rates.gbtLevyOnCommissionRate);

  // The net payout already delivered to the player
  const netPayout = opts.payout;
  // Ensure conservation: the pool debits must exactly equal all credits
  const totalCredits = netPayout + taxAmt + commAmt + reserveAmt + aggAmt;

  const lines: LedgerLine[] = [
    { account: acct.pool(opts.marketId), entryType: "PAYOUT_CREDIT", amount: -totalCredits, userId: opts.userId, marketId: opts.marketId, memo: `Settlement debit` },
    { account: acct.player(opts.userId), entryType: "PAYOUT_CREDIT", amount: netPayout, userId: opts.userId, marketId: opts.marketId, memo: `Payout` },
  ];

  if (taxAmt > 0) {
    lines.push({ account: acct.tax, entryType: "SETTLEMENT_TAX", amount: taxAmt, marketId: opts.marketId, memo: `Pari-mutuel tax` });
  }
  if (commAmt > 0) {
    lines.push({ account: acct.commission, entryType: "SETTLEMENT_COMMISSION", amount: commAmt, marketId: opts.marketId, memo: `Commission` });
    // TRA/GBT levies on the commission
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
  if (reserveAmt > 0) {
    lines.push({ account: acct.reserve, entryType: "SETTLEMENT_RESERVE", amount: reserveAmt, marketId: opts.marketId, memo: `Reserve` });
  }
  if (aggAmt > 0) {
    lines.push({ account: acct.aggregator, entryType: "SETTLEMENT_AGGREGATOR", amount: aggAmt, marketId: opts.marketId, memo: `Aggregator fee` });
  }

  return lines;
}

/** Settlement loss: losing position's stake stays in pool (no entry needed —
 *  the pool already holds it). For the ledger, we do need to account for
 *  where the loser's stake went: it was distributed to winners + house.
 *  This is implicit in the settlement entries, but we record an explicit
 *  loss entry so the player's ledger shows the debit. */
export function settlementLossEntries(opts: {
  userId: string;
  marketId: string;
  stake: number;
}): LedgerLine[] {
  // No actual money movement — the stake was debited at bet placement
  // and the pool distributed it at resolution. No double-counting.
  return [];
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

/** Cashout: market pool → player wallet (fee stays in pool for remaining bettors) */
export function cashoutEntries(opts: {
  txnId: string;
  userId: string;
  marketId: string;
  value: number;   // net amount player receives
  fee: number;     // fee retained in pool
}): LedgerLine[] {
  // The fee stays in the pool (distributed to remaining bettors at resolution).
  // Only the `value` (net) actually moves to the player.
  return [
    { account: acct.pool(opts.marketId), entryType: "CASHOUT", amount: -opts.value, txnId: opts.txnId, userId: opts.userId, marketId: opts.marketId, memo: `Cash out` },
    { account: acct.player(opts.userId), entryType: "CASHOUT", amount: opts.value, txnId: opts.txnId, userId: opts.userId, marketId: opts.marketId, memo: `Cash out received` },
  ];
  // Note: the fee doesn't appear as a ledger movement because it was never
  // removed from the pool — it stays distributed among remaining participants.
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
