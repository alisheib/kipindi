/**
 * THE LENSES ON A PLAYER'S NOTIFICATIONS — defined once, read by every surface (§0a).
 *
 * The `/notifications` screen, both DAL implementations and the guard all need to agree on
 * what "Money" means. Three copies of a kind list is how one of them quietly stops matching
 * a kind that was added later, and the symptom is a row that exists but appears under no
 * filter a player would think to open.
 *
 * ── THE ONE RULE THAT IS NOT OBVIOUS ─────────────────────────────────────────
 * ⛔ EVERY FILTER EXCEPT `cleared` EXCLUDES DISMISSED ROWS, and `cleared` shows ONLY them.
 * So `all + cleared` is the player's entire history and the two never overlap. That matters
 * because a money row appearing under two lenses reads as two events — this product has
 * already shipped a duplicate-notification defect where a player was told twice they had won
 * (28 byte-identical rows on production, 2026-07-31).
 *
 * ── WHY `cleared` EXISTS AT ALL ──────────────────────────────────────────────
 * 🔴 `CLEAR ALL` sets `dismissedAt`, and every read door in the product filters
 * `dismissedAt: null`. Before this screen, one tap permanently hid every money record a
 * player had, with nothing anywhere able to show them again. Clearing is meant to tidy a
 * bell, not to destroy a receipt.
 */
import { MONEY_KINDS, type NotificationKind } from "@/lib/server/comms-registry";

export const NOTIFICATION_FILTERS = ["all", "unread", "money", "account", "cleared"] as const;
export type NotificationFilter = (typeof NOTIFICATION_FILTERS)[number];

export const DEFAULT_FILTER: NotificationFilter = "all";
export const DEFAULT_SORT: NotificationSort = "newest";

export const NOTIFICATION_SORTS = ["newest", "oldest"] as const;
export type NotificationSort = (typeof NOTIFICATION_SORTS)[number];

/** Money-shaped events. ⛔ Read from `comms-registry`, never re-listed here. */
export const MONEY_FILTER_KINDS: readonly NotificationKind[] = MONEY_KINDS;

/**
 * The notices that must never be buried under round results — the whole reason this screen
 * exists.
 *
 * ⚠️ `WITHDRAW` is deliberately NOT here even though a withdrawal is account-adjacent: it is
 * squarely money and it already lives under `money`. Overlapping the two lenses would make
 * both pills' counts ambiguous — a player could not tell whether 12 meant twelve things or
 * six things counted twice.
 */
export const ACCOUNT_FILTER_KINDS: readonly NotificationKind[] = ["KYC", "SECURITY", "RG"];

/** Narrow an untrusted `?filter=` query value. Anything unknown falls back to the default. */
export function parseFilter(raw: string | undefined): NotificationFilter {
  return (NOTIFICATION_FILTERS as readonly string[]).includes(raw ?? "")
    ? (raw as NotificationFilter)
    : DEFAULT_FILTER;
}

/** Narrow an untrusted `?sort=` query value. */
export function parseSort(raw: string | undefined): NotificationSort {
  return (NOTIFICATION_SORTS as readonly string[]).includes(raw ?? "")
    ? (raw as NotificationSort)
    : DEFAULT_SORT;
}

/**
 * The kind list a filter restricts to, or `null` when it does not filter by kind.
 *
 * ⛔ Returning `null` rather than "every kind" is deliberate: a caller that spreads a full
 * kind list into a `WHERE kind IN (…)` silently drops rows whose `kind` is NULL, and `kind`
 * is nullable on this table (`prisma/schema.prisma` — `kind String?`). Legacy rows carry no
 * kind at all, and they are still a player's money history.
 */
export function kindsFor(filter: NotificationFilter): readonly NotificationKind[] | null {
  if (filter === "money") return MONEY_FILTER_KINDS;
  if (filter === "account") return ACCOUNT_FILTER_KINDS;
  return null;
}

/** Whether this lens shows dismissed rows. Exactly one does. */
export function showsCleared(filter: NotificationFilter): boolean {
  return filter === "cleared";
}
