/**
 * Player "Your activity" — money-honesty summary + RG limits-used snapshot.
 *
 * HONESTY RULES (F2b · money + compliance surface):
 *  - Every figure is a REAL DB aggregate over the player's own CONFIRMED
 *    transactions (never fabricated). Empty periods return zeros, not filler.
 *  - ⭐ `net` IS EVERY CONFIRMED MOVEMENT in the window — all twelve stored txn
 *    types, signed. It used to be `won − staked`, which silently excluded bonuses,
 *    both adjustment legs, house fees and both agent-commission legs: six of the
 *    twelve. The word claims everything, so the number now is everything
 *    (Ali's ruling, 2026-09-09 · PLAYER QUERY §12 ②).
 *  - The betting result keeps its own name, `gamblingNet` = payouts + cash-outs +
 *    refunds − staked, and it is that value — not `net` — which equals
 *    `db.txn.sumGamblingNetSince(userId, since)`, the exact number the daily
 *    loss-limit gate enforces. The stress test locks this.
 *  - ⛔ A REFUND IS NOT A WIN. `BET_REFUND` used to be summed into `won`, so a
 *    voided market that handed a stake straight back read as winnings and
 *    flattered the net. It has its own number now, as it does on `/wallet`.
 *  - "Time played" is NOT surfaced: no server-side session-duration history
 *    exists, so showing a period play-time would be fabrication (omitted).
 *  - Limits-used is computed from the SAME sums the enforcement uses
 *    (`sumDepositsSince` / `sumGamblingNetSince`), so the dashboard cannot drift
 *    from the gate that actually blocks a deposit/bet.
 */
import { db } from "./store";
import { getRgSettings } from "./responsible-gambling";
// ⛔ ONE HOME FOR THE MONEY PARTITION. `/wallet` already partitions all twelve stored txn types
// into eight lenses; this page reads those same lenses so the two surfaces cannot disagree about
// what "won", "refunds" or "everything" means. ⚠️ `src/lib/wallet/ledger.ts` is the PLAYER wallet
// contract — not `src/lib/server/ledger.ts`, which is the double-entry money ledger.
import { LENS_TYPES, type TxnTypeValue } from "@/lib/wallet/ledger";

export type ActivityPeriod = "week" | "month" | "all";

const DAY_MS = 86_400 * 1000;

/** Cutoff timestamp (ms) for a period. "all" → 0 (all-time). */
export function periodSince(period: ActivityPeriod, now = Date.now()): number {
  if (period === "week") return now - 7 * DAY_MS;
  if (period === "month") return now - 30 * DAY_MS;
  return 0;
}

/**
 * ⭐ EVERY STORED TXN TYPE, DERIVED FROM `/wallet`'s OWN PARTITION — never a second list.
 *
 * `LENS_TYPES` in `src/lib/wallet/ledger.ts` is declared as *"a PARTITION of all twelve stored
 * types"*, so flattening it IS the complete set, and a thirteenth type added to a lens arrives here
 * for free. ⛔ Re-typing the twelve names in this file is `RULES.md` §7's "a number written twice":
 * the copy nobody is looking at is the one that rots, and this page's tiles were already six types
 * behind the enum when that was measured.
 *
 * ⚠️ THE PARTITION'S TOTALITY IS ASSERTED, NOT TRUSTED — `scripts/activity-summary.test.mts` §D
 * checks this flattened set against `prisma/schema.prisma`'s `TxnType` enum, so a new stored type
 * that nobody added to a lens fails a gate here instead of silently vanishing from a player's
 * `net`.
 */
const ALL_TXN_TYPES = Object.values(LENS_TYPES).flat() as TxnTypeValue[];

export type ActivitySummary = {
  period: ActivityPeriod;
  since: number;
  /** Money IN (deposits confirmed) — positive. `LENS_TYPES.in` */
  deposits: number;
  /** Money OUT (withdrawals confirmed) — positive magnitude. `LENS_TYPES.out` */
  withdrawals: number;
  /** Total staked on bets — positive magnitude. `LENS_TYPES.bet` */
  staked: number;
  /**
   * Returned from a position that PAID — payouts and cash-outs. `LENS_TYPES.payout`
   * ⛔ Refunds are NOT here any more; see `refunds`.
   */
  won: number;
  /** Stakes returned by a voided market — positive. `LENS_TYPES.refund` */
  refunds: number;
  /**
   * ⭐ NET OF EVERY CONFIRMED MOVEMENT in the window — all twelve types, signed. This is the
   * number the word "net" claims, and until 2026-09-09 it was `won − staked`, which excluded
   * bonuses, both adjustment legs, house fees and both agent-commission legs.
   */
  net: number;
  /**
   * The BETTING result alone = payouts + cash-outs + refunds − staked, signed.
   * ⚠️ Kept because it is a different and still-useful question from `net`, and because it is the
   * one number that reconciles exactly against `db.txn.sumGamblingNetSince` over the same window —
   * the value the daily loss-limit gate enforces.
   * ⛔ It is NOT rendered as a tile: Won, Refunds and Staked sit beside each other on screen, so
   * the betting story is already legible without a sixth aggregate competing with `net`.
   */
  gamblingNet: number;
  /** True when the player has NO confirmed movement of ANY type in the window. */
  empty: boolean;
};

/**
 * Aggregate the player's own confirmed money movement over `period`.
 * All numbers are DB-side sums (no row loading, no cap).
 *
 * ⛔ ONE AGGREGATE PER STORED TYPE, AND THE REASON IS `empty`. A summed bucket cannot prove
 * ABSENCE: a 10,000 deposit and a 10,000 withdrawal net to zero, and the old `empty` — four sums,
 * all zero — would have called that a player with no activity, then hidden the whole money section
 * behind "No activity yet". Every stored type has a FIXED sign (adjustment-credit and
 * adjustment-debit are separate types, not one signed bucket), so a per-type sum of zero means *no
 * rows of that type* and nothing can cancel. The lens totals below are derived from those same
 * numbers, so a tile and `net` cannot disagree.
 *
 * ⚠️ That is twelve windowed aggregates instead of four, on a `force-dynamic` authenticated page
 * that already awaited two. Accepted deliberately: the alternative was a new user-scoped windowed
 * COUNT on the shared money DAL and its Prisma twin, a far bigger blast radius than this page is
 * worth. If it ever shows up in a trace, the right fix is that count — not a return to sums.
 */
export async function getActivitySummary(userId: string, period: ActivityPeriod, now = Date.now()): Promise<ActivitySummary> {
  const since = periodSince(period, now);
  const perType = await Promise.all(
    ALL_TXN_TYPES.map((type) => db.txn.sumUserByTypesSince(userId, since, [type])),
  );
  const byType = new Map<TxnTypeValue, number>(ALL_TXN_TYPES.map((t, i) => [t, perType[i]]));
  const sumOf = (types: readonly TxnTypeValue[]) => types.reduce((n, t) => n + (byType.get(t) ?? 0), 0);

  const deposits = sumOf(LENS_TYPES.in);
  const withdrawals = Math.abs(sumOf(LENS_TYPES.out));
  const stakedSigned = sumOf(LENS_TYPES.bet);
  const staked = Math.abs(stakedSigned);
  const won = sumOf(LENS_TYPES.payout);
  const refunds = sumOf(LENS_TYPES.refund);

  // Signed, so every debit leg subtracts itself — this is the wallet's net change.
  const net = sumOf(ALL_TXN_TYPES);
  // == db.txn.sumGamblingNetSince(userId, since); `stakedSigned` is already negative.
  const gamblingNet = won + refunds + stakedSigned;
  // ⛔ Not `net === 0` — see the note above on why a sum cannot prove absence.
  const empty = perType.every((amount) => amount === 0);

  return { period, since, deposits, withdrawals, staked, won, refunds, net, gamblingNet, empty };
}

export type LimitUsage = { used: number; limit: number | null };

export type RgUsage = {
  dailyDeposit: LimitUsage;
  weeklyDeposit: LimitUsage;
  monthlyDeposit: LimitUsage;
  dailyLoss: LimitUsage;
  selfExclusionUntil: string | null;
  coolingOffUntil: string | null;
};

/**
 * Current-period RG limit usage vs cap — assembled from the exact same windowed
 * sums the deposit/loss gates use, so "used X of Y" can never disagree with the
 * gate that blocks the next deposit/bet. A null limit = no cap set by the player.
 */
export async function getRgUsage(userId: string, now = Date.now()): Promise<RgUsage> {
  const r = await getRgSettings(userId);
  const [depDay, depWeek, depMonth, lossNet] = await Promise.all([
    db.txn.sumDepositsSince(userId, now - DAY_MS),
    db.txn.sumDepositsSince(userId, now - 7 * DAY_MS),
    db.txn.sumDepositsSince(userId, now - 30 * DAY_MS),
    db.txn.sumGamblingNetSince(userId, now - DAY_MS),
  ]);
  return {
    dailyDeposit: { used: depDay, limit: r.dailyDepositLimit ?? null },
    weeklyDeposit: { used: depWeek, limit: r.weeklyDepositLimit ?? null },
    monthlyDeposit: { used: depMonth, limit: r.monthlyDepositLimit ?? null },
    dailyLoss: { used: Math.max(0, -lossNet), limit: r.dailyLossLimit ?? null },
    selfExclusionUntil: r.selfExclusionUntil ?? null,
    coolingOffUntil: r.coolingOffUntil ?? null,
  };
}
