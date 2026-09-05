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

/**
 * Every `HOUSE:%` account with a balance.
 *
 * ⛔ Read `HOUSE:COMMISSION` as a BALANCE — it is already net of the levies (see
 * `house-book.ts`'s header). Anything that pre-adjusts it here double-subtracts them.
 *
 * 🔴 **BY PREFIX, AS A GROUP — NOT FOUR ACCOUNTS BY NAME.** This shipped enumerating
 * `IN ('HOUSE:COMMISSION','HOUSE:TRA_LEVY','HOUSE:GBT_LEVY','HOUSE:AGGREGATOR')`, which is the
 * same mistake as enumerating entry types and is refuted by the same sentence twenty lines
 * above: *an account balance cannot forget a type it has never heard of* — but a NAMED LIST
 * forgets an ACCOUNT it has never heard of, and `acct` in `ledger.ts` mints three the list did
 * not contain: `HOUSE:RG_SUSPENSE` (live, money we owe a self-excluded player) and the retired
 * `HOUSE:TAX` / `HOUSE:RESERVE` (historical rows only). `ledger.ts → houseAccountBalances()`
 * already reads `LIKE 'HOUSE:%'`, so the named list could also make `/admin/house` disagree with
 * `/admin/finance` about the same books with nothing going red.
 *
 * ⚠️ Measured on production 2026-09-05: exactly the four named accounts exist, so the shipped
 * read was CORRECT TODAY and this is a latent defect being closed before it can bite — not a
 * live misstatement. `HOUSE:RG_SUSPENSE` is one self-excluded deposit away from being real.
 */
export async function readHouseAccounts(): Promise<HouseAccounts | null> {
  const pc = prisma();
  if (!pc) return null;
  const rows = await pc.$queryRawUnsafe<Array<{ account: string; sum: string }>>(
    `SELECT account, SUM(amount) AS sum
       FROM "LedgerEntry"
      WHERE account LIKE 'HOUSE:%'
      GROUP BY account
      ORDER BY account`,
  );
  const all: Record<string, number> = {};
  for (const r of rows) all[r.account] = Number(r.sum ?? 0);
  const at = (a: string) => all[a] ?? 0;
  return {
    commission: at("HOUSE:COMMISSION"),
    traLevy: at("HOUSE:TRA_LEVY"),
    gbtLevy: at("HOUSE:GBT_LEVY"),
    aggregator: at("HOUSE:AGGREGATOR"),
    rgSuspense: at("HOUSE:RG_SUSPENSE"),
    all,
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
 *
 * 🔴 **AND `EXTERNAL:INTERNAL` IS NOT A PAYMENT RAIL.** `acct.external()` is
 * `` `EXTERNAL:${provider || "INTERNAL"}` ``, so every booking made with no provider lands on a
 * SYNTHETIC counterparty that no money ever crossed. Summing it into "cash we hold" claims cash
 * that never arrived — and because the offsetting player credit DOES raise the liability, a
 * wholesale sum quietly cancels a real hole in the solvency line. So `railBacked` excludes it,
 * `total` keeps it for continuity with the trial balance, and `byAccount` is returned so the
 * page can never present a bare figure without showing what it is made of.
 * ⚠️ Measured 0 on production 2026-09-05 — no `EXTERNAL:INTERNAL` row exists, so `railBacked`
 * and `total` are the same 605,110 today. Latent, not live.
 */
export type CustodialCash = {
  /** ⭐ Cash actually received through a payment rail. THE figure for "can we pay?". */
  railBacked: number;
  /** Every `EXTERNAL:%` account, including the synthetic one. Continuity with the books. */
  total: number;
  /** Per-counterparty, cash held (already negated). Rendered as rows, never summed blind. */
  byAccount: Array<{ account: string; cashHeld: number }>;
};

export async function readCustodialCash(): Promise<CustodialCash | null> {
  const pc = prisma();
  if (!pc) return null;
  const rows = await pc.$queryRawUnsafe<Array<{ account: string; sum: string | null }>>(
    `SELECT account, SUM(amount) AS sum
       FROM "LedgerEntry" WHERE account LIKE 'EXTERNAL:%'
      GROUP BY account ORDER BY account`,
  );
  const byAccount = rows.map((r) => ({ account: r.account, cashHeld: -Number(r.sum ?? 0) }));
  const total = byAccount.reduce((s, r) => s + r.cashHeld, 0);
  const railBacked = byAccount
    .filter((r) => r.account !== "EXTERNAL:INTERNAL")
    .reduce((s, r) => s + r.cashHeld, 0);
  return { railBacked, total, byAccount };
}

/**
 * ⭐ WHAT WE OWE PLAYERS — Σ (balance + hold) over EVERY wallet.
 *
 * 🔴 **EVERY WALLET, NOT THE ACTIVE ONES, AND THAT IS A DELIBERATE DIFFERENCE FROM
 * `walletLiabilityTotal()`.** That reader filters `w.status === "ACTIVE"`, which is right for
 * the *activity* figure `/admin/finance` shows beside its KPIs. It is wrong for a SOLVENCY line:
 * freezing a wallet does not discharge the debt, and a page that quietly stopped counting a
 * frozen player's balance would report free cash we do not have. The one number an owner must
 * never be flattered on is what he owes.
 *
 * ⚠️ `hold` is included because in-flight stake money is still the player's until it settles.
 * ⚠️ `bonusBalance` is EXCLUDED — it is non-withdrawable promotional credit, not a cash debt.
 * ⚠️ Measured on production 2026-09-05: every wallet is ACTIVE, so this equals
 * `walletLiabilityTotal()` at 20,105,687 today. The two diverge the first time a wallet freezes.
 */
export async function readPlayerLiability(): Promise<number | null> {
  const pc = prisma();
  if (!pc) return null;
  const rows = await pc.$queryRawUnsafe<Array<{ sum: string | null }>>(
    `SELECT SUM(balance + hold) AS sum FROM "Wallet"`,
  );
  return Number(rows[0]?.sum ?? 0);
}

/**
 * ⭐ THE PART OF THAT LIABILITY AN ADMIN TYPED INTO EXISTENCE — Σ net `ADJUSTMENT` to players.
 *
 * ⛔ **NET, NOT Σ(amount > 0).** An adjustment can be a debit as well as a credit, and the gross
 * figure double-counts a balance that was credited and then corrected. Measured on production
 * 2026-09-05: gross 26,264,342 against a NET of 20,600,000 — and the net matches the
 * `SYSTEM:ADJUSTMENT` balance exactly, which is the check that the pairing is right.
 *
 * ⚠️ This is what makes the strict solvency line readable rather than terrifying: 20,600,000 of
 * a 20,105,687 liability is seeded test money with no deposit behind it. ⛔ It never SOFTENS the
 * strict line — `housePosition` returns both figures and the page shows both.
 */
export async function readAdjustmentBackedLiability(): Promise<number | null> {
  const pc = prisma();
  if (!pc) return null;
  const rows = await pc.$queryRawUnsafe<Array<{ sum: string | null }>>(
    `SELECT SUM(amount) AS sum FROM "LedgerEntry"
      WHERE "entryType" = 'ADJUSTMENT' AND account LIKE 'PLAYER:%'`,
  );
  return Number(rows[0]?.sum ?? 0);
}

export type WaterfallRead = {
  stakeIn: number;
  bonusIn: number;
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

  const stakeIn = await q(
    `SELECT SUM(amount) AS sum FROM "LedgerEntry"
      WHERE ${win} AND "entryType" = 'STAKE_DEBIT' AND account LIKE 'POOL:%' AND amount > 0`);
  /* ⭐ THE OTHER HALF OF THE HANDLE. `stakeEntries` credits the pool TWICE — `STAKE_DEBIT` for
   * the real part, `BONUS_SPEND` for the bonus part — and this read counted only the first while
   * `winningsPaid` counts payouts from that pool in full. GGR was therefore understated by every
   * bonus shilling ever staked. ⚠️ Measured 0 on production 2026-09-05: no bonus stake exists
   * yet, so nothing on the page moves today. It moves the first time somebody bets a bonus. */
  const bonusIn = await q(
    `SELECT SUM(amount) AS sum FROM "LedgerEntry"
      WHERE ${win} AND "entryType" = 'BONUS_SPEND' AND account LIKE 'POOL:%' AND amount > 0`);
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
  /* Bonus money that became real — the promotional cost that actually left.
   *
   * 🔴 **NET, NOT `amount > 0`.** `bonusRelockEntries` (E-224) is the exact mirror of
   * `bonusCreditEntries`: it writes a NEGATIVE `BONUS_CREDIT` to `PLAYER:` when a refunded wager
   * turns out not to have discharged the wagering requirement, and the cash goes back to the
   * locked bonus account. A `> 0` filter drops every one of those reversals, so a bonus that was
   * unlocked and then re-locked counted as a cost FOREVER.
   * ⚠️ Measured on production 2026-09-05: gross 16,000 over 8 rows against a NET of 2,000 — seven
   * re-locks — so this line was overstating the promotional cost by 14,000 and understating the
   * owner's net retained by the same. This is the largest of the four live arithmetic errors. */
  const bonusCost = await q(
    `SELECT SUM(amount) AS sum FROM "LedgerEntry"
      WHERE ${win} AND "entryType" = 'BONUS_CREDIT' AND account LIKE 'PLAYER:%'`);

  return { stakeIn, bonusIn, winningsPaid, feeEarned, leviesOut, aggregatorOut, bonusCost };
}

export type GameLedgerRow = {
  marketId: string;
  poolIn: number;
  bonusIn: number;
  paidOut: number;
  bonusRefunded: number;
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
    marketid: string; poolin: string | null; bonusin: string | null; paidout: string | null;
    bonusrefunded: string | null; feebooked: string | null; leviesbooked: string | null;
  }>>(
    /* ⛔ FOUR LEGS OF THE POOL, NOT TWO. `stakeEntries` credits the pool with BOTH
     * `STAKE_DEBIT` and `BONUS_SPEND`, and `refundEntries` returns them down two different
     * paths — `REFUND` to `PLAYER:`, `BONUS_REFUND` to `PLAYER_BONUS:`. Reading only the real
     * legs while counting the fee in full leaves the per-game identity short by exactly the
     * bonus, so a correct bonus-funded book would render as a variance. ⚠️ `LIKE 'PLAYER:%'`
     * does NOT match `PLAYER_BONUS:` — the character after `PLAYER` must be a colon — which is
     * why the bonus refund needs its own arm rather than falling into `paidout`. */
    `SELECT "marketId" AS marketid,
            SUM(CASE WHEN "entryType" = 'STAKE_DEBIT' AND account LIKE 'POOL:%' AND amount > 0
                     THEN amount ELSE 0 END) AS poolin,
            SUM(CASE WHEN "entryType" = 'BONUS_SPEND' AND account LIKE 'POOL:%' AND amount > 0
                     THEN amount ELSE 0 END) AS bonusin,
            SUM(CASE WHEN "entryType" IN ('PAYOUT_CREDIT','REFUND','CASHOUT')
                      AND account LIKE 'PLAYER:%' AND amount > 0
                     THEN amount ELSE 0 END) AS paidout,
            SUM(CASE WHEN "entryType" = 'BONUS_REFUND'
                      AND account LIKE 'PLAYER\\_BONUS:%' AND amount > 0
                     THEN amount ELSE 0 END) AS bonusrefunded,
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
    bonusIn: Number(r.bonusin ?? 0),
    paidOut: Number(r.paidout ?? 0),
    bonusRefunded: Number(r.bonusrefunded ?? 0),
    feeBooked: Number(r.feebooked ?? 0),
    leviesBooked: Number(r.leviesbooked ?? 0),
  }));
}

/**
 * ⭐ THE UNATTRIBUTED FEE — the other half of the BY GAME reconciliation.
 *
 * `withdrawalEntries` books its fee with **no `marketId`**, because a withdrawal is not a game.
 * So Σ(per-game fee) can never equal the house fee, and the honest product is to state the gap
 * and show that the two sides add up rather than to hide the difference or to quietly print two
 * numbers that disagree.
 *
 * ⚠️ Measured on production 2026-09-05: 760 across 15 `WITHDRAWAL_FEE` rows, against 366,371
 * attributed — and `366,371 + 760 = 367,131`, the house fee exactly. Variance 0.
 */
export async function readUnattributedFees(start: Date, end: Date): Promise<
  { total: number; byType: Array<{ entryType: string; amount: number; entries: number }> } | null
> {
  const pc = prisma();
  if (!pc) return null;
  const rows = await pc.$queryRawUnsafe<Array<{ entrytype: string; sum: string | null; n: bigint }>>(
    `SELECT "entryType" AS entrytype, SUM(amount) AS sum, COUNT(*) AS n
       FROM "LedgerEntry"
      WHERE "createdAt" >= $1 AND "createdAt" < $2
        AND account = 'HOUSE:COMMISSION' AND amount > 0 AND "marketId" IS NULL
      GROUP BY "entryType" ORDER BY 2 DESC`,
    start, end,
  );
  const byType = rows.map((r) => ({
    entryType: r.entrytype,
    amount: Number(r.sum ?? 0),
    entries: Number(r.n ?? 0),
  }));
  return { total: byType.reduce((s, r) => s + r.amount, 0), byType };
}

/**
 * Fee earned in the window, split by the entry type that booked it.
 *
 * ⛔ NOTHING IS ENUMERATED. The page renders whatever rows come back, so a retired type keeps
 * being counted and a new one appears without an edit — the same law as reading by account.
 * ⚠️ Measured 2026-09-05: `SETTLEMENT_COMMISSION` 366,371 (435 rows) and `WITHDRAWAL_FEE` 760
 * (15). `CASHOUT_FEE` has never been booked — every cash-out so far fell inside the free-exit
 * grace — so a hard-coded three-row table would have shown a confident, permanent zero.
 */
export async function readFeeBySource(start: Date, end: Date): Promise<
  Array<{ entryType: string; amount: number; entries: number }> | null
> {
  const pc = prisma();
  if (!pc) return null;
  const rows = await pc.$queryRawUnsafe<Array<{ entrytype: string; sum: string | null; n: bigint }>>(
    `SELECT "entryType" AS entrytype, SUM(amount) AS sum, COUNT(*) AS n
       FROM "LedgerEntry"
      WHERE "createdAt" >= $1 AND "createdAt" < $2
        AND account = 'HOUSE:COMMISSION' AND amount > 0
      GROUP BY "entryType" ORDER BY 2 DESC`,
    start, end,
  );
  return rows.map((r) => ({
    entryType: r.entrytype,
    amount: Number(r.sum ?? 0),
    entries: Number(r.n ?? 0),
  }));
}

export type GameTotals = GameLedgerRow & {
  /**
   * ⭐ Σ `SETTLEMENT_COMMISSION` ALONE — the ONLY slice `poolFee` models.
   *
   * ⛔ The drill-down reconciles THIS against the recompute, not `feeBooked`. `feeBooked` also
   * contains `CASHOUT_FEE`, which is booked PER EXIT from the pool as it stood at that moment;
   * `poolFee` knows nothing about early exits and would report a variance equal to every
   * early-exit fee the game ever charged, on a perfectly correct book.
   */
  settlementFee: number;
  /** Σ `CASHOUT_FEE` — shown BESIDE the reconciliation, labelled, never inside it. */
  earlyExitFee: number;
  /** Total ledger rows for this market, before the evidence panel collapses them. */
  entries: number;
};

/** One game's booked sums, all time — the drill-down's arithmetic. */
export async function readGameTotals(marketId: string): Promise<GameTotals | null> {
  const pc = prisma();
  if (!pc) return null;
  const rows = await pc.$queryRawUnsafe<Array<Record<string, string | null>>>(
    `SELECT
       SUM(CASE WHEN "entryType"='STAKE_DEBIT'  AND account LIKE 'POOL:%'   AND amount>0 THEN amount ELSE 0 END) AS poolin,
       SUM(CASE WHEN "entryType"='BONUS_SPEND'  AND account LIKE 'POOL:%'   AND amount>0 THEN amount ELSE 0 END) AS bonusin,
       SUM(CASE WHEN "entryType" IN ('PAYOUT_CREDIT','REFUND','CASHOUT')
                 AND account LIKE 'PLAYER:%' AND amount>0 THEN amount ELSE 0 END) AS paidout,
       SUM(CASE WHEN "entryType"='BONUS_REFUND' AND account LIKE 'PLAYER\\_BONUS:%' AND amount>0 THEN amount ELSE 0 END) AS bonusrefunded,
       SUM(CASE WHEN account='HOUSE:COMMISSION' AND amount>0 THEN amount ELSE 0 END) AS feebooked,
       SUM(CASE WHEN account='HOUSE:COMMISSION' AND "entryType"='SETTLEMENT_COMMISSION' AND amount>0 THEN amount ELSE 0 END) AS settlementfee,
       SUM(CASE WHEN account='HOUSE:COMMISSION' AND "entryType"='CASHOUT_FEE' AND amount>0 THEN amount ELSE 0 END) AS earlyexitfee,
       SUM(CASE WHEN account IN ('HOUSE:TRA_LEVY','HOUSE:GBT_LEVY') AND amount>0 THEN amount ELSE 0 END) AS leviesbooked,
       COUNT(*) AS entries
     FROM "LedgerEntry" WHERE "marketId" = $1`,
    marketId,
  );
  const r = rows[0];
  if (!r) return null;
  const n = (k: string) => Number(r[k] ?? 0);
  return {
    marketId,
    poolIn: n("poolin"),
    bonusIn: n("bonusin"),
    paidOut: n("paidout"),
    bonusRefunded: n("bonusrefunded"),
    feeBooked: n("feebooked"),
    settlementFee: n("settlementfee"),
    earlyExitFee: n("earlyexitfee"),
    leviesBooked: n("leviesbooked"),
    entries: n("entries"),
  };
}

export type GameEvidenceRow = {
  account: string;
  entryType: string;
  amount: number;
  /** How many ledger rows this line stands for. `1` for a house or pool row. */
  entries: number;
  /** `true` when this line COLLAPSES many players into one. */
  aggregated: boolean;
};

/**
 * One game's ledger, as evidence — house and pool rows in full, players collapsed.
 *
 * ⛔ **NO PER-PLAYER ROWS, AND THAT OVERRULES THE ORIGINAL BRIEF'S "every ledger entry".**
 * `PLAYER:` and `PLAYER_BONUS:` rows are one line per entry type with a count. Three reasons,
 * in order of weight: a settled market can carry hundreds of them (measured: one market with
 * 1,485 entries), so the panel stops being readable exactly when it matters; the account string
 * IS the user id, so a full dump is a player-identity list on a revenue page that FINANCE and
 * AUDITOR can open; and none of it is evidence about the HOUSE's money, which is what this page
 * is for. `/admin/players/[id]` is where a person's ledger belongs.
 *
 * ⚠️ `limit`/`offset` page the aggregated lines, so even a pathological market cannot render an
 * unbounded table.
 */
export async function readGameEntries(
  marketId: string,
  limit = 100,
  offset = 0,
): Promise<GameEvidenceRow[] | null> {
  const pc = prisma();
  if (!pc) return null;
  const lim = Math.max(1, Math.min(500, Math.trunc(limit)));
  const off = Math.max(0, Math.trunc(offset));
  const rows = await pc.$queryRawUnsafe<Array<{
    account: string; entrytype: string; amount: string | null; n: bigint;
  }>>(
    /* ⭐ The collapse happens in POSTGRES, in exact numeric — the same law as every other sum in
     * this file. Pulling rows and grouping them in JS would add `Decimal(18,2)` values as
     * floats, and this panel sits beside a reconciliation whose whole job is to notice one
     * shilling. `CASE` rather than `LEFT()` so the two player prefixes stay distinguishable. */
    `SELECT CASE WHEN account LIKE 'PLAYER:%'        THEN 'PLAYER:*'
                 WHEN account LIKE 'PLAYER\\_BONUS:%' THEN 'PLAYER_BONUS:*'
                 ELSE account END AS account,
            "entryType" AS entrytype, SUM(amount) AS amount, COUNT(*) AS n
       FROM "LedgerEntry" WHERE "marketId" = $1
      GROUP BY 1, 2
      ORDER BY 1 ASC, 2 ASC
      LIMIT ${lim} OFFSET ${off}`,
    marketId,
  );
  return rows.map((r) => ({
    account: r.account,
    entryType: r.entrytype,
    amount: Number(r.amount ?? 0),
    entries: Number(r.n ?? 0),
    aggregated: r.account.endsWith(":*"),
  }));
}

/** How many aggregated evidence lines one game has — the pager's total. */
export async function countGameEntryLines(marketId: string): Promise<number | null> {
  const pc = prisma();
  if (!pc) return null;
  const rows = await pc.$queryRawUnsafe<Array<{ n: bigint }>>(
    `SELECT COUNT(*) AS n FROM (
       SELECT CASE WHEN account LIKE 'PLAYER:%'        THEN 'PLAYER:*'
                   WHEN account LIKE 'PLAYER\\_BONUS:%' THEN 'PLAYER_BONUS:*'
                   ELSE account END AS a, "entryType" AS t
         FROM "LedgerEntry" WHERE "marketId" = $1 GROUP BY 1, 2) g`,
    marketId,
  );
  return Number(rows[0]?.n ?? 0);
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
