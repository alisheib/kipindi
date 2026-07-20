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
import { currentLockTx } from "./locks";
import { randomId } from "./crypto";
import { audit } from "./audit";
import type { LedgerEntryType, Prisma } from "@prisma/client";

/**
 * Run a money movement so its wallet mutation, its Transaction row, and its
 * ledger entries commit ATOMICALLY (audit C3). With a database it opens one
 * Prisma `$transaction` and hands the `tx` client to `db.wallet.adjust` /
 * `db.txn.*` / `postLedgerEntries` — any throw inside rolls the WHOLE movement
 * back, so the ledger can never be written without the wallet move (or vice
 * versa). Without a database (dev / unit tests) it runs `fn(null)`: the in-memory
 * store self-applies and the ledger no-ops, so the SAME caller code path works in
 * both modes. Lock note: the money paths already hold their wallet/market
 * advisory lock; this inner tx takes NO advisory lock, so it can't reorder the
 * wallet→market lock order or deadlock.
 *
 * When a withLock() is already held, we JOIN its transaction instead of opening
 * a second one. Opening our own used to pin an extra pool connection on top of
 * the one (or two) the enclosing locks already held — the bet path cost three
 * connections and capped out at pool÷3. Joining makes the whole movement, its
 * locks and its reads a single transaction on a single connection.
 *
 * ⚠️ Consequence for callers: when joined, a throw in `fn` rolls back the ENTIRE
 * enclosing lock scope, not just this movement, and the rollback only happens
 * once the error escapes withLock. A caller that catches its own abort INSIDE
 * the lock would commit the partial writes it meant to discard — so aborts must
 * propagate out of withLock and be mapped to a rejection there.
 */
export async function withMoneyTx<T>(fn: (tx: Prisma.TransactionClient | null) => Promise<T>): Promise<T> {
  const joined = currentLockTx();
  if (joined) return fn(joined);
  const pcc = prisma();
  if (!pcc) return fn(null);
  return pcc.$transaction((tx) => fn(tx), { timeout: 30000, maxWait: 10000 });
}

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
 * The ledger is a SECONDARY accounting mirror — the Wallet/Transaction tables
 * are the source of truth for money, so a ledger write must never crash or block
 * a money path (callers fire-and-forget). But it must NOT fail SILENTLY (audit
 * C3: "swallowed into a void nobody watches"). So on failure we retry, then raise
 * a watched COMPLIANCE audit `ledger.post_failed`. The nightly wallet↔ledger
 * trial balance (trialBalance) then catches the resulting drift regardless of
 * cause — the two together guarantee no ledger gap stays invisible.
 */
export async function postLedgerEntries(
  groupId: string,
  entries: LedgerLine[],
  tx?: Prisma.TransactionClient | null,
): Promise<string | null> {
  if (entries.length === 0) return null;

  // Invariant: balanced entries (sum must be 0, within rounding tolerance)
  const sum = entries.reduce((s, e) => s + e.amount, 0);
  if (Math.abs(sum) > 0.005) {
    console.error(`[ledger] IMBALANCED group ${groupId}: sum=${sum}`, entries);
    // An imbalanced group is a caller BUG, not a transient failure. In a money
    // tx (audit C3), THROW so the whole movement rolls back rather than committing
    // wallet+txn with a rejected ledger. Otherwise surface it as a watched audit.
    if (tx) throw new Error(`[ledger] imbalanced group ${groupId}: sum=${sum}`);
    void audit({ category: "COMPLIANCE", action: "ledger.imbalanced_rejected", actorId: null, targetType: "LedgerGroup", targetId: groupId, payload: { sum, lines: entries.length } });
    return null;
  }

  const pc = tx ?? prisma();
  if (!pc) {
    // No database (local dev / unit tests) — entries are skipped.
    // The in-memory store doesn't have a LedgerEntry model.
    return groupId;
  }

  // Stable ids so a retry is idempotent (skipDuplicates keys on the PK), and a
  // single multi-row INSERT is atomic in Postgres — a failed attempt inserts
  // nothing, so a retry can never double-post.
  const data = entries.map((e) => ({
    id: `le_${randomId(12)}`,
    groupId,
    account: e.account,
    entryType: e.entryType,
    amount: e.amount,
    memo: e.memo ?? null,
    txnId: e.txnId ?? null,
    marketId: e.marketId ?? null,
    userId: e.userId ?? null,
  }));

  // Atomic mode (inside a money tx): one insert, and any failure THROWS so the
  // wallet + txn roll back with it — that is the entire point (a ledger write can
  // no longer be lost while the money moved). No retry/swallow here.
  if (tx) {
    await tx.ledgerEntry.createMany({ data, skipDuplicates: true });
    return groupId;
  }

  const MAX_ATTEMPTS = 3;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await pc.ledgerEntry.createMany({ data, skipDuplicates: true });
      return groupId;
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_ATTEMPTS) continue;
    }
  }
  // Final failure — the wallet/txn mutation already happened, so this group is a
  // real drift. Do NOT swallow it: log loudly AND raise a watched audit entry so
  // it appears in the compliance stream and on the nightly trial balance.
  console.error(`[ledger] Failed to post group ${groupId} after ${MAX_ATTEMPTS} attempts:`, lastErr);
  void audit({
    category: "COMPLIANCE",
    action: "ledger.post_failed",
    actorId: null,
    targetType: "LedgerGroup",
    targetId: groupId,
    payload: { lines: entries.length, error: String((lastErr as Error)?.message ?? lastErr).slice(0, 200) },
  });
  return null;
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
  /** Money the platform HOLDS but does not own: a deposit that arrived after the
   *  player self-excluded. It cannot be credited (the account is excluded) and it
   *  has not been returned yet (that needs the outbound disbursement rail). It must
   *  not sit invisible — a non-zero balance here is money we owe a player.
   *  ⛔ Never credit PLAYER for this: PLAYER is trial-balanced against the wallet,
   *  so crediting it for money never added to the wallet creates permanent drift. */
  rgSuspense: "HOUSE:RG_SUSPENSE" as const,
};

// ── Pre-built entry helpers for each money path ────────────────────────────

/** Deposit: external money → player wallet */
/** A deposit that landed after the player self-excluded. The money DID arrive from
 *  the provider, so the external side must be recorded exactly as for a normal
 *  deposit; it is parked in RG suspense instead of the player's account because it
 *  cannot be credited and has not yet been returned. Balanced, so the trial balance
 *  stays true — and visible, so nobody can quietly keep it. */
export function rgSuspenseEntries(opts: {
  txnId: string;
  userId: string;
  amount: number;
  provider: string;
}): LedgerLine[] {
  return [
    { account: acct.external(opts.provider), entryType: "DEPOSIT", amount: -opts.amount, txnId: opts.txnId, userId: opts.userId, memo: `Deposit from ${opts.provider} (player excluded)` },
    { account: acct.rgSuspense, entryType: "DEPOSIT", amount: opts.amount, txnId: opts.txnId, userId: opts.userId, memo: `Held for return — account excluded at settlement` },
  ];
}

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

// ── Trial balance: wallet ↔ ledger reconciliation (audit C3) ────────────────
//
// reconcileLedger() only asks "does each group sum to zero?" — which
// postLedgerEntries already guarantees before insert, so it is structurally
// blind to a group that was NEVER WRITTEN (the fire-and-forget failure mode).
// The trial balance is the real check: it compares, per wallet, the MONEY
// (source of truth) against what the LEDGER (the evidence) says, and flags any
// divergence. The invariants it proves:
//
//   ledger(PLAYER:{userId})       == Wallet.balance + Wallet.hold
//     (hold = money reserved for an in-flight withdrawal; the ledger only debits
//      WITHDRAWAL when the payout CONFIRMS, so during the in-flight window the
//      wallet is already down but the ledger isn't — netting hold makes both
//      sides move together. Getting this wrong false-positives, so it is exact.)
//   ledger(PLAYER_BONUS:{userId}) == Wallet.bonusBalance
//   Wallet.bonusBalance           == Σ ACTIVE BonusGrant.remainingTzs   (schema invariant)
//   Σ (every ledger amount)       == 0                                  (global conservation)
//   every ledger group            sums to 0                             (no imbalanced group)

export interface WalletSnapshot {
  userId: string;
  balance: number;
  hold: number;
  bonusBalance: number;
}

export interface TrialBalanceRow {
  userId: string;
  walletReal: number;   // balance + hold
  ledgerReal: number;   // Σ PLAYER:{userId}
  realDrift: number;    // walletReal − ledgerReal
  walletBonus: number;  // bonusBalance
  ledgerBonus: number;  // Σ PLAYER_BONUS:{userId}
  bonusDrift: number;   // walletBonus − ledgerBonus
  activeGrants: number; // Σ ACTIVE BonusGrant.remainingTzs
  grantDrift: number;   // walletBonus − activeGrants
}

export interface TrialBalanceReport {
  ok: boolean;              // no per-wallet drift + global balanced + no imbalanced group
  checkedWallets: number;
  driftingWallets: number;
  totalAbsDrift: number;    // Σ of all absolute drifts (TZS)
  globalSum: number;        // Σ every ledger amount (must be ~0)
  globalBalanced: boolean;
  imbalancedGroups: Array<{ groupId: string; sum: number }>;
  drift: TrialBalanceRow[]; // drifting wallets, worst first
  worst: TrialBalanceRow | null;
}

// Amounts are whole-shilling integers everywhere; half a shilling absorbs any
// Decimal(18,2) representation noise without hiding a real 1-TZS divergence.
const DRIFT_TOL = 0.5;
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Pure trial-balance computation — no DB, so it is exhaustively unit-testable
 * (scripts/trial-balance.test.mts). `trialBalance()` gathers the inputs from
 * Postgres and delegates here.
 */
export function computeTrialBalance(input: {
  wallets: WalletSnapshot[];
  ledgerRealByUser: Map<string, number>;
  ledgerBonusByUser: Map<string, number>;
  activeGrantsByUser: Map<string, number>;
  globalSum: number;
  imbalancedGroups: Array<{ groupId: string; sum: number }>;
}): TrialBalanceReport {
  const walletByUser = new Map(input.wallets.map((w) => [w.userId, w]));
  // Check every userId that appears on EITHER side — a ledger PLAYER balance for
  // a user with no wallet row is itself drift (money in the books for a ghost).
  const userIds = new Set<string>([
    ...input.wallets.map((w) => w.userId),
    ...input.ledgerRealByUser.keys(),
    ...input.ledgerBonusByUser.keys(),
    ...input.activeGrantsByUser.keys(),
  ]);

  const drift: TrialBalanceRow[] = [];
  let totalAbsDrift = 0;
  for (const userId of userIds) {
    const w = walletByUser.get(userId);
    const walletReal = w ? w.balance + w.hold : 0;
    const walletBonus = w ? w.bonusBalance : 0;
    const ledgerReal = input.ledgerRealByUser.get(userId) ?? 0;
    const ledgerBonus = input.ledgerBonusByUser.get(userId) ?? 0;
    const activeGrants = input.activeGrantsByUser.get(userId) ?? 0;

    const realDrift = round2(walletReal - ledgerReal);
    const bonusDrift = round2(walletBonus - ledgerBonus);
    const grantDrift = round2(walletBonus - activeGrants);

    if (Math.abs(realDrift) > DRIFT_TOL || Math.abs(bonusDrift) > DRIFT_TOL || Math.abs(grantDrift) > DRIFT_TOL) {
      totalAbsDrift += Math.abs(realDrift) + Math.abs(bonusDrift) + Math.abs(grantDrift);
      drift.push({ userId, walletReal, ledgerReal, realDrift, walletBonus, ledgerBonus, bonusDrift, activeGrants, grantDrift });
    }
  }

  const rowAbs = (r: TrialBalanceRow) => Math.abs(r.realDrift) + Math.abs(r.bonusDrift) + Math.abs(r.grantDrift);
  drift.sort((a, b) => rowAbs(b) - rowAbs(a));

  const globalBalanced = Math.abs(input.globalSum) <= DRIFT_TOL;
  const ok = drift.length === 0 && globalBalanced && input.imbalancedGroups.length === 0;

  return {
    ok,
    checkedWallets: input.wallets.length,
    driftingWallets: drift.length,
    totalAbsDrift: round2(totalAbsDrift),
    globalSum: round2(input.globalSum),
    globalBalanced,
    imbalancedGroups: input.imbalancedGroups,
    drift,
    worst: drift[0] ?? null,
  };
}

/**
 * Run the wallet↔ledger trial balance against Postgres. Read-only. Used by the
 * nightly lifecycle sweep (alerts on drift) and the /admin/finance surface.
 * Returns a clean (empty) report when there is no DB.
 */
export async function trialBalance(): Promise<TrialBalanceReport> {
  const pc = prisma();
  if (!pc) {
    return { ok: true, checkedWallets: 0, driftingWallets: 0, totalAbsDrift: 0, globalSum: 0, globalBalanced: true, imbalancedGroups: [], drift: [], worst: null };
  }

  const walletRows = await pc.wallet.findMany({ select: { userId: true, balance: true, hold: true, bonusBalance: true } });
  const wallets: WalletSnapshot[] = walletRows.map((w) => ({
    userId: w.userId,
    balance: Number(w.balance),
    hold: Number(w.hold),
    bonusBalance: Number(w.bonusBalance),
  }));

  // Per-account player balances (real + bonus) in one grouped scan.
  const ledgerRows = await pc.$queryRawUnsafe<Array<{ account: string; sum: string | null }>>(
    `SELECT account, SUM(amount) AS sum FROM "LedgerEntry" WHERE account LIKE 'PLAYER%' GROUP BY account`,
  );
  const ledgerRealByUser = new Map<string, number>();
  const ledgerBonusByUser = new Map<string, number>();
  for (const r of ledgerRows) {
    const amt = Number(r.sum ?? 0);
    if (r.account.startsWith("PLAYER_BONUS:")) ledgerBonusByUser.set(r.account.slice("PLAYER_BONUS:".length), amt);
    else if (r.account.startsWith("PLAYER:")) ledgerRealByUser.set(r.account.slice("PLAYER:".length), amt);
  }

  // Σ ACTIVE BonusGrant.remainingTzs per user — the source of truth for bonusBalance.
  const grantRows = await pc.$queryRawUnsafe<Array<{ userId: string; sum: string | null }>>(
    `SELECT "userId", SUM("remainingTzs") AS sum FROM "BonusGrant" WHERE status = 'ACTIVE' GROUP BY "userId"`,
  );
  const activeGrantsByUser = new Map<string, number>();
  for (const r of grantRows) activeGrantsByUser.set(r.userId, Number(r.sum ?? 0));

  const globalRow = await pc.$queryRawUnsafe<Array<{ sum: string | null }>>(`SELECT SUM(amount) AS sum FROM "LedgerEntry"`);
  const globalSum = Number(globalRow[0]?.sum ?? 0);

  const { imbalanced } = await reconcileLedger();

  return computeTrialBalance({ wallets, ledgerRealByUser, ledgerBonusByUser, activeGrantsByUser, globalSum, imbalancedGroups: imbalanced });
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
