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
import type { LocalizedText } from "@/lib/localized";
import type { StoredOutcome } from "@/lib/side-label";

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
    // D10's sibling · the STATUS decides (Ali, 2026-08-27): a self-excluder whose chosen period has
    // elapsed is still SELF_EXCLUDED until an officer reopens the account, and "a market you follow
    // closes soon" is the most engagement-shaped message this platform sends. Same rule as the push
    // gate and the bet path; `isLockedOut` untouched (marketing S7, on delegation 2026-09-26).
    const holder = await Promise.resolve(db.user.findById(userId));
    if (holder?.status === "SELF_EXCLUDED") {
      audit({
        category: "COMPLIANCE",
        action: "watchlist.alert_suppressed.rg_lockout",
        actorId: userId, targetType: "Market", targetId: marketId,
        payload: { reason: "self_exclusion", until: lock.exclusionUntil },
      });
      continue;
    }
    out.push(userId);
  }
  return out;
}

/** Alert watchers that a followed market closes in ~`minutes`. RG-suppressed. */
export async function alertWatchersClosingSoon(marketId: string, marketTitle: LocalizedText, minutes: number): Promise<number> {
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
// ⚠️ `outcome` was typed `string` here and in `notifyWatchedSettled`, which is precisely why
// the raw enum could reach three languages unnoticed — nothing in the chain had an opinion
// about what the value was allowed to be. Typed end to end now (§L3).
export async function alertWatchersSettled(marketId: string, marketTitle: LocalizedText, outcome: StoredOutcome, bettorIds: Set<string>): Promise<number> {
  const ids = await alertableWatcherIds(marketId, bettorIds);
  for (const userId of ids) {
    notifyWatchedSettled(userId, { marketTitle, marketId, outcome }).catch(() => {});
  }
  return ids.length;
}
