/**
 * Platform-wide marketing aggregates for the public "stats band" (settled
 * markets + total TZS paid out). These feed the high-traffic landing, so:
 *
 *   1. the paid-out sum is a DB-side aggregate (`sumConfirmedByTypes`) — it never
 *      loads transaction rows into memory (the prior landing did a full
 *      `db.txn.listAll()` scan on every view), and
 *   2. the whole result is memoised on `globalThis` for a short TTL so repeated
 *      landing renders reuse it rather than re-querying.
 *
 * A marketing figure tolerates up to `TTL_MS` of staleness; the numbers are REAL
 * (never fabricated) — BET_PAYOUT/CASHOUT are stored positive, so the aggregate
 * equals the prior `Σ Math.abs(amount)`.
 */
import { db } from "./store";
import { listMarkets } from "./market-service";

export type PlatformStats = { settledCount: number; paidOutTzs: number };

const TTL_MS = 60_000;

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_PLATFORM_STATS: { at: number; value: PlatformStats } | undefined;
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const now = Date.now();
  const cached = globalThis.__50PICK_PLATFORM_STATS;
  if (cached && now - cached.at < TTL_MS) return cached.value;

  const [paidOutTzs, resolved] = await Promise.all([
    Promise.resolve(db.txn.sumConfirmedByTypes(["BET_PAYOUT", "CASHOUT"])).catch(() => 0),
    listMarkets({ status: "RESOLVED" }).catch(() => [] as Awaited<ReturnType<typeof listMarkets>>),
  ]);
  const value: PlatformStats = { settledCount: resolved.length, paidOutTzs };
  globalThis.__50PICK_PLATFORM_STATS = { at: now, value };
  return value;
}
