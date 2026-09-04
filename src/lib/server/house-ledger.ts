/**
 * THE HOUSE BOOK'S READER — every figure on `/admin/house`, read from `LedgerEntry`.
 *
 * ── THE LAW THIS FILE ENFORCES ────────────────────────────────────────────────────────
 *
 * ⭐ **THE LEDGER IS THE TRUTH; A RECOMPUTE IS A CHECK.** `analytics.ts →
 * settlementFeesByPoll()` reports per-poll fees by RECOMPUTING them from the rates
 * (`ratesFor` + `poolFee`) rather than reading what was booked. That is right only while the
 * formula, its rounding and the snapshot fallback all still agree with what the settlement
 * writer did on the day — and the moment one drifts it reports revenue the books never
 * recorded, silently and confidently. ⛔ Nothing in this file computes a fee. It reads them,
 * and the recompute survives only as a displayed VARIANCE (`reconcile`).
 *
 * ── WHY THE READS ARE BY ACCOUNT, NOT BY ENTRY TYPE ──────────────────────────────────
 *
 * ⭐ AND IT IS NOT A STYLE CHOICE — IT IS HOW THE RETIRED TYPES STAY COUNTED. Four entry
 * types were retired in 2026-07 (`SETTLEMENT_TAX`, `SETTLEMENT_RESERVE`,
 * `SETTLEMENT_AGGREGATOR`, `WITHDRAWAL_TAX`) and are never written again, but historical rows
 * still carry them. An enumeration of "current" types would silently drop every one of those
 * shillings from any period covering mid-2026 or earlier, and the books would stop
 * reconciling with no error anywhere. **An account balance cannot forget a type it has never
 * heard of.**
 *
 * ── ARITHMETIC PRECISION ─────────────────────────────────────────────────────────────
 *
 * ⚠️ `LedgerEntry.amount` is `Decimal(18,2)`. **Every sum is performed by POSTGRES**, in exact
 * numeric, and only the finished total crosses into JS — the same shape `houseAccountBalances`
 * already uses. ⛔ Never pull rows and add them in JS: the reconciliation's whole job is to
 * detect a one-shilling disagreement, and float addition is a way to manufacture one (or to
 * hide one).
 *
 * @see src/lib/house-book.ts · docs/SESSION-PROMPT-HOUSE-LEDGER.md
 */

import { prisma } from "@/lib/server/prisma";
import type { HouseAccounts } from "@/lib/house-book";

/** ⛔ Read `HOUSE:COMMISSION` as a BALANCE — it is already net of the levies (see
 *  `house-book.ts`'s header). Anything that pre-adjusts it here double-subtracts them. */
export async function readHouseAccounts(): Promise<HouseAccounts | null> {
  const pc = prisma();
  if (!pc) return null;
  const rows = await pc.$queryRawUnsafe<Array<{ account: string; sum: string }>>(
    `SELECT account, SUM(amount) AS sum
       FROM "LedgerEntry"
      WHERE account IN ('HOUSE:COMMISSION','HOUSE:TRA_LEVY','HOUSE:GBT_LEVY','HOUSE:AGGREGATOR')
      GROUP BY account`,
  );
  const at = (a: string) => Number(rows.find((r) => r.account === a)?.sum ?? 0);
  return {
    commission: at("HOUSE:COMMISSION"),
    traLevy: at("HOUSE:TRA_LEVY"),
    gbtLevy: at("HOUSE:GBT_LEVY"),
    aggregator: at("HOUSE:AGGREGATOR"),
  };
}

/**
 * Custodial cash — the ledger's view of money the platform actually holds.
 *
 * ⭐ DERIVED FROM THE EXTERNAL BOUNDARY, WHICH IS THE ONLY PLACE CASH CROSSES IT. A deposit
 * debits `EXTERNAL:{provider}` by the amount (money came from outside); a withdrawal credits
 * it with the net paid out. So `Σ EXTERNAL` is *withdrawals − deposits*, and the cash held is
 * its negation. Withdrawal fees never appear here — they stay inside, split to
 * `HOUSE:COMMISSION` and `HOUSE:AGGREGATOR` — which is exactly correct: they did not leave.
 *
 * ⛔ THIS IS A LEDGER FIGURE AND MUST BE LABELLED ONE. It is NOT a bank balance and NOT the
 * Selcom rail float — that float is the disbursement account alone, deposits never touch it,
 * and Selcom publishes no collections balance at all. The two are shown side by side and
 * never summed (`selcom-statement.ts` carries the provenance types that enforce this).
 */
export async function readCustodialCash(): Promise<number | null> {
  const pc = prisma();
  if (!pc) return null;
  const rows = await pc.$queryRawUnsafe<Array<{ sum: string | null }>>(
    `SELECT SUM(amount) AS sum FROM "LedgerEntry" WHERE account LIKE 'EXTERNAL:%'`,
  );
  return -Number(rows[0]?.sum ?? 0);
}

export type WaterfallRead = {
  handle: number;
  winningsPaid: number;
  feeEarned: number;
  leviesOut: number;
  aggregatorOut: number;
  bonusCost: number;
};

/**
 * The period's booked movements, ready for `waterfall()`.
 *
 * ⚠️ `feeEarned` sums only the POSITIVE entries on the commission account, so it is the GROSS
 * fee for the window — the levy debits sitting on that same account are excluded here and
 * counted once, on their own accounts, as `leviesOut`. ⛔ Summing the account's net movement
 * instead would subtract the levies here AND again in the waterfall.
 */
export async function readWaterfall(start: Date, end: Date): Promise<WaterfallRead | null> {
  const pc = prisma();
  if (!pc) return null;
  const q = async (sql: string) => {
    const rows = await pc.$queryRawUnsafe<Array<{ sum: string | null }>>(sql, start, end);
    return Number(rows[0]?.sum ?? 0);
  };
  const win = `"createdAt" >= $1 AND "createdAt" < $2`;

  const handle = await q(
    `SELECT SUM(amount) AS sum FROM "LedgerEntry"
      WHERE ${win} AND "entryType" = 'STAKE_DEBIT' AND account LIKE 'POOL:%' AND amount > 0`);
  const winningsPaid = await q(
    `SELECT SUM(amount) AS sum FROM "LedgerEntry"
      WHERE ${win} AND "entryType" IN ('PAYOUT_CREDIT','REFUND','CASHOUT')
        AND account LIKE 'PLAYER:%' AND amount > 0`);
  const feeEarned = await q(
    `SELECT SUM(amount) AS sum FROM "LedgerEntry"
      WHERE ${win} AND account = 'HOUSE:COMMISSION' AND amount > 0`);
  const leviesOut = await q(
    `SELECT SUM(amount) AS sum FROM "LedgerEntry"
      WHERE ${win} AND account IN ('HOUSE:TRA_LEVY','HOUSE:GBT_LEVY') AND amount > 0`);
  const aggregatorOut = await q(
    `SELECT SUM(amount) AS sum FROM "LedgerEntry"
      WHERE ${win} AND account = 'HOUSE:AGGREGATOR' AND amount > 0`);
  // Bonus money that became real — the promotional cost that actually left.
  const bonusCost = await q(
    `SELECT SUM(amount) AS sum FROM "LedgerEntry"
      WHERE ${win} AND "entryType" = 'BONUS_CREDIT' AND account LIKE 'PLAYER:%' AND amount > 0`);

  return { handle, winningsPaid, feeEarned, leviesOut, aggregatorOut, bonusCost };
}

export type GameLedgerRow = {
  marketId: string;
  poolIn: number;
  paidOut: number;
  feeBooked: number;
  leviesBooked: number;
};

/**
 * Per-game booked sums for every market that moved money in the window.
 *
 * ⛔ ONE COMBINED BOOK — Ali's ruling of 2026-09-04. Polls and Up & Down rounds are both
 * markets and both appear here; nothing filters by product line, because *"how much we made"*
 * is one number. ⚠️ This is also why the `productLine` trap cannot bite this reader: it never
 * calls `listMarkets()`, whose default of `"MARKET"` would silently omit every Up & Down
 * round. The ledger does not know about product lines, and that is the point.
 *
 * ⚠️ A VOID game appears with `feeBooked = 0` and is KEPT — the page marks it `VOID · no fee`.
 * Filtering it out would read as data loss on a page whose job is completeness.
 */
export async function readGameRows(start: Date, end: Date): Promise<GameLedgerRow[] | null> {
  const pc = prisma();
  if (!pc) return null;
  const rows = await pc.$queryRawUnsafe<Array<{
    marketid: string; poolin: string | null; paidout: string | null;
    feebooked: string | null; leviesbooked: string | null;
  }>>(
    `SELECT "marketId" AS marketid,
            SUM(CASE WHEN "entryType" = 'STAKE_DEBIT' AND account LIKE 'POOL:%' AND amount > 0
                     THEN amount ELSE 0 END) AS poolin,
            SUM(CASE WHEN "entryType" IN ('PAYOUT_CREDIT','REFUND','CASHOUT')
                      AND account LIKE 'PLAYER:%' AND amount > 0
                     THEN amount ELSE 0 END) AS paidout,
            SUM(CASE WHEN account = 'HOUSE:COMMISSION' AND amount > 0
                     THEN amount ELSE 0 END) AS feebooked,
            SUM(CASE WHEN account IN ('HOUSE:TRA_LEVY','HOUSE:GBT_LEVY') AND amount > 0
                     THEN amount ELSE 0 END) AS leviesbooked
       FROM "LedgerEntry"
      WHERE "marketId" IS NOT NULL AND "createdAt" >= $1 AND "createdAt" < $2
      GROUP BY "marketId"`,
    start, end,
  );
  return rows.map((r) => ({
    marketId: r.marketid,
    poolIn: Number(r.poolin ?? 0),
    paidOut: Number(r.paidout ?? 0),
    feeBooked: Number(r.feebooked ?? 0),
    leviesBooked: Number(r.leviesbooked ?? 0),
  }));
}

/** Every ledger row for one game — the drill-down's evidence. */
export async function readGameEntries(marketId: string): Promise<Array<{
  account: string; entryType: string; amount: number; memo: string | null; createdAt: Date;
}> | null> {
  const pc = prisma();
  if (!pc) return null;
  const rows = await pc.$queryRawUnsafe<Array<{
    account: string; entryType: string; amount: string; memo: string | null; createdAt: Date;
  }>>(
    `SELECT account, "entryType", amount, memo, "createdAt"
       FROM "LedgerEntry" WHERE "marketId" = $1
      ORDER BY "createdAt" ASC, account ASC`,
    marketId,
  );
  return rows.map((r) => ({ ...r, amount: Number(r.amount) }));
}

/**
 * ⭐ THE RATE-CHANGE TRAIL — the second half of Ali's fourth question.
 *
 * The game's own frozen rates answer *"which rate did this use"*; these rows answer *"who set
 * it, and when"*. ⛔ Only changes recorded AT OR BEFORE the game's creation can have applied
 * to it — a later change is shown separately, if at all, and never as the game's rate.
 */
export async function readRateChangesBefore(at: Date, limit = 5): Promise<Array<{
  at: Date; action: string; actor: string | null; payload: string | null;
}> | null> {
  const pc = prisma();
  if (!pc) return null;
  /* ⚠️ `action LIKE 'config.%'` — the SAME predicate `/admin/config` uses for its history tab
   * (`e.action.startsWith("config.")`), so the two surfaces can never disagree about what
   * counts as a rate change. ⛔ Not `ILIKE '%config%'`: that also sweeps in `market.config`,
   * `updown.config`, `bonus.config` and `aipoll.config_updated`, which are different settings
   * and would be shown to the owner as the rate that priced their game. */
  const rows = await pc.$queryRawUnsafe<Array<{
    at: Date; action: string; actor: string | null; payload: string | null;
  }>>(
    `SELECT "createdAt" AS at, action, "actorId" AS actor, "payload"::text AS payload
       FROM "AuditLog"
      WHERE "createdAt" <= $1 AND action LIKE 'config.%'
      ORDER BY "createdAt" DESC
      LIMIT ${Math.max(1, Math.min(20, Math.trunc(limit)))}`,
    at,
  );
  return rows;
}
