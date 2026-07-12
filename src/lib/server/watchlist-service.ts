/**
 * Watchlist (F3) — a player "stars" a market to follow it, and gets factual
 * alerts when it closes soon or settles.
 *
 * COMPLIANCE:
 *  - Alerts are INFORMATIONAL ONLY. Never a "bet now / last chance" nudge — that
 *    would pressure an opted-in player (LCCP SR 3.4 harm risk). See the wording
 *    rule on notifyWatchedClosingSoon.
 *  - A self-excluded / cooling-off player is NEVER alerted. The break means we
 *    stop reaching out; suppression is audited. (Their star is preserved — it
 *    simply goes quiet — so nothing is destroyed by taking a break.)
 */
import { db } from "./store";
import { audit } from "./audit";
import { isLockedOut } from "./responsible-gambling";
import { notifyWatchedClosingSoon, notifyWatchedSettled } from "./notification-service";

export async function isWatching(marketId: string, userId: string): Promise<boolean> {
  return db.watchlist.isWatching(marketId, userId);
}

/** Toggle the star. Returns the NEW state (true = now watching). Idempotent. */
export async function toggleWatch(marketId: string, userId: string): Promise<boolean> {
  const on = await db.watchlist.isWatching(marketId, userId);
  if (on) {
    await db.watchlist.remove(marketId, userId);
    audit({ category: "SYSTEM", action: "watchlist.removed", actorId: userId, targetType: "Market", targetId: marketId });
    return false;
  }
  await db.watchlist.add(marketId, userId);
  audit({ category: "SYSTEM", action: "watchlist.added", actorId: userId, targetType: "Market", targetId: marketId });
  return true;
}

/** Market ids this player follows, newest star first. */
export async function listWatchedMarketIds(userId: string): Promise<string[]> {
  return db.watchlist.listMarketIdsForUser(userId);
}

/**
 * The alert fan-out set for a market: watcher ids MINUS anyone under an RG
 * lockout (self-excluded / cooling-off). Suppressions are audited individually so
 * the compliance trail shows exactly who was withheld and why.
 */
export async function alertableWatcherIds(marketId: string, exclude: Set<string> = new Set()): Promise<string[]> {
  const watchers = await db.watchlist.listWatcherIds(marketId);
  const out: string[] = [];
  for (const userId of watchers) {
    if (exclude.has(userId)) continue;
    const lock = await isLockedOut(userId);
    if (lock.locked) {
      audit({
        category: "COMPLIANCE",
        action: "watchlist.alert_suppressed.rg_lockout",
        actorId: userId, targetType: "Market", targetId: marketId,
        payload: { reason: lock.reason, until: lock.until },
      });
      continue;
    }
    out.push(userId);
  }
  return out;
}

/** Alert watchers that a followed market closes in ~`minutes`. RG-suppressed. */
export async function alertWatchersClosingSoon(marketId: string, marketTitle: string, minutes: number): Promise<number> {
  const ids = await alertableWatcherIds(marketId);
  for (const userId of ids) {
    notifyWatchedClosingSoon(userId, { marketTitle, marketId, minutes }).catch(() => {});
  }
  return ids.length;
}

/**
 * Alert watchers that a followed market settled. `bettorIds` are excluded — they
 * already receive their own win/loss receipt, so this would be a duplicate.
 */
export async function alertWatchersSettled(marketId: string, marketTitle: string, outcome: string, bettorIds: Set<string>): Promise<number> {
  const ids = await alertableWatcherIds(marketId, bettorIds);
  for (const userId of ids) {
    notifyWatchedSettled(userId, { marketTitle, marketId, outcome }).catch(() => {});
  }
  return ids.length;
}
