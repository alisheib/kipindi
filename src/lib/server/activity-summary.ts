/**
 * Player "Your activity" — money-honesty summary + RG limits-used snapshot.
 *
 * HONESTY RULES (F2b · money + compliance surface):
 *  - Every figure is a REAL DB aggregate over the player's own CONFIRMED
 *    transactions (never fabricated). Empty periods return zeros, not filler.
 *  - The invariant `net === won − staked` holds by construction and equals
 *    `db.txn.sumGamblingNetSince(userId, since)` over the same window — the exact
 *    number the daily loss-limit gate uses. The stress test locks this.
 *  - "Time played" is NOT surfaced: no server-side session-duration history
 *    exists, so showing a period play-time would be fabrication (omitted).
 *  - Limits-used is computed from the SAME sums the enforcement uses
 *    (`sumDepositsSince` / `sumGamblingNetSince`), so the dashboard cannot drift
 *    from the gate that actually blocks a deposit/bet.
 */
import { db } from "./store";
import { getRgSettings } from "./responsible-gambling";

export type ActivityPeriod = "week" | "month" | "all";

const DAY_MS = 86_400 * 1000;

/** Cutoff timestamp (ms) for a period. "all" → 0 (all-time). */
export function periodSince(period: ActivityPeriod, now = Date.now()): number {
  if (period === "week") return now - 7 * DAY_MS;
  if (period === "month") return now - 30 * DAY_MS;
  return 0;
}

export type ActivitySummary = {
  period: ActivityPeriod;
  since: number;
  /** Money IN (deposits confirmed) — positive. */
  deposits: number;
  /** Money OUT (withdrawals confirmed) — positive magnitude. */
  withdrawals: number;
  /** Total staked on bets — positive magnitude. */
  staked: number;
  /** Total returned from bets (payouts + cash-outs + refunds) — positive. */
  won: number;
  /** Net gambling result = won − staked (negative = net loss). */
  net: number;
  /** True when the player has zero confirmed money activity in the window. */
  empty: boolean;
};

/**
 * Aggregate the player's own confirmed money movement over `period`.
 * All numbers are DB-side sums (no row loading, no cap).
 */
export async function getActivitySummary(userId: string, period: ActivityPeriod, now = Date.now()): Promise<ActivitySummary> {
  const since = periodSince(period, now);
  const [deposits, withdrawalsSigned, stakedSigned, won] = await Promise.all([
    db.txn.sumUserByTypesSince(userId, since, ["DEPOSIT"]),
    db.txn.sumUserByTypesSince(userId, since, ["WITHDRAWAL"]),
    db.txn.sumUserByTypesSince(userId, since, ["BET_PLACED"]),
    db.txn.sumUserByTypesSince(userId, since, ["BET_PAYOUT", "CASHOUT", "BET_REFUND"]),
  ]);
  const staked = Math.abs(stakedSigned);
  const withdrawals = Math.abs(withdrawalsSigned);
  const net = won - staked; // == sumGamblingNetSince over the same window
  const empty = deposits === 0 && withdrawals === 0 && staked === 0 && won === 0;
  return { period, since, deposits, withdrawals, staked, won, net, empty };
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
