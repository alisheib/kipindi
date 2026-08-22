/**
 * THE ANCHORS `red:notifications-page` MUTATES — declared, as DATA, importable without running.
 *
 * ⛔ A SIDECAR, not an inline array. `test:red-anchors` audits every declared anchor WITHOUT
 * executing a harness that rewrites real source, and it holds an undeclared-harness ceiling
 * that may only shrink. An inline-anchor harness fails that gate — which cost a cycle on
 * 2026-08-22 — and, worse, an inline anchor is one nobody can audit: three of them in
 * `updown-push-red.mjs` had silently rotted against rewritten code on that same day.
 *
 * ⚠️ NO SIDE EFFECTS. Imported by a suite inside `test:all` — data only, repo-relative POSIX
 * paths, nothing that touches the filesystem to describe it.
 *
 * ── WHY THESE ARE THE MUTATIONS ──────────────────────────────────────────────
 * Each reintroduces a defect this screen exists to prevent, and several are shapes this
 * platform has ALREADY shipped:
 *  · `cleared-leaks-into-all` and `cleared-shows-live` break the one invariant that makes the
 *    two lenses readable — a row in both reads as two events, which is the duplicate-
 *    notification defect that put 28 byte-identical rows on production.
 *  · `count-counts-everything` is the FilterPill A-5 violation: a number that is not the
 *    number of things behind it.
 *  · `pagination-skips-a-page` silently drops a player's money history one page at a time and
 *    throws nothing.
 *  · `restore-ignores-the-owner` lets one player un-hide another player's notification.
 *  · `bell-count-back-to-the-list` restores the saturating badge that shipped for months.
 *
 * ⛔ THE BEHAVIOURAL MUTATIONS TARGET `store.ts`, NOT `prisma-dal.ts`, because the in-memory
 * store is what the suite drives. Mutating the Prisma half would leave the suite green and
 * prove the opposite of what it claims.
 */

/** @typedef {{ name: string, file: string, suite: string, from: string, to: string, why: string }} RedMutation */

const STORE = "src/lib/server/store.ts";
const FILTERS = "src/lib/notification-filters.ts";
const PANEL = "src/components/layout/notifications-panel.tsx";
const LOADING = "src/app/notifications/loading.tsx";
const PAGE = "src/app/notifications/page.tsx";

/** @type {RedMutation[]} */
export const MUTATIONS = [
  {
    name: "cleared-leaks-into-all",
    why: "dismissed rows stop being excluded from every other lens, so a cleared row appears twice and reads as two events",
    file: STORE,
    suite: "notifications-page",
    from: "      const live = mine.filter((n) => !n.dismissedAt);",
    to: "      const live = mine;",
  },
  {
    name: "cleared-shows-live-rows",
    why: "the cleared lens stops being the dismissed one, so the only way back to a hidden money record is gone",
    file: FILTERS,
    suite: "notifications-page",
    from: `export function showsCleared(filter: NotificationFilter): boolean {
  return filter === "cleared";
}`,
    to: `export function showsCleared(filter: NotificationFilter): boolean {
  return false;
}`,
  },
  {
    name: "money-and-account-overlap",
    why: "WITHDRAW joins the account lens while staying in money, so neither pill's count can be read as a number of things",
    file: FILTERS,
    suite: "notifications-page",
    from: `export const ACCOUNT_FILTER_KINDS: readonly NotificationKind[] = ["KYC", "SECURITY", "RG"];`,
    to: `export const ACCOUNT_FILTER_KINDS: readonly NotificationKind[] = ["KYC", "SECURITY", "RG", "WITHDRAW"];`,
  },
  {
    name: "count-counts-everything",
    why: "the All pill counts dismissed rows too — a number that is not the number of rows behind it (FilterPill A-5)",
    file: STORE,
    suite: "notifications-page",
    from: "          all: live.length,",
    to: "          all: mine.length,",
  },
  {
    name: "pagination-skips-a-page",
    why: "an off-by-one in skip drops the first page of a player's history and throws nothing",
    file: STORE,
    suite: "notifications-page",
    from: "      const skip = Math.max(0, (q.page - 1) * q.perPage);",
    to: "      const skip = Math.max(0, q.page * q.perPage);",
  },
  {
    name: "sort-is-accepted-and-ignored",
    why: "oldest-first silently returns newest-first — a control that looks like it works",
    file: STORE,
    suite: "notifications-page",
    from: `        q.sort === "oldest"
          ? a.createdAt.localeCompare(b.createdAt)
          : b.createdAt.localeCompare(a.createdAt));`,
    to: `        b.createdAt.localeCompare(a.createdAt));`,
  },
  {
    name: "restore-ignores-the-owner",
    why: "one player can un-hide another player's notification — an id alone becomes proof of ownership",
    file: STORE,
    suite: "notifications-page",
    from: `    restore: (id: string, userId: string) => {
      const n = store.notifications.get(id);
      if (!n || n.userId !== userId) return null; // owner-scoped`,
    to: `    restore: (id: string, userId: string) => {
      const n = store.notifications.get(id);
      if (!n) return null;`,
  },
  {
    name: "bell-count-back-to-the-list",
    why: "the unread badge goes back to counting the capped 30-row list, so a player with 40 unread is told 30",
    file: PANEL,
    suite: "notifications-page",
    from: "  const unread = serverUnread ?? items.filter((n) => !n.readAt).length;",
    to: "  const unread = items.filter((n) => !n.readAt).length;",
  },
  {
    name: "loader-tier-drifts",
    why: "the skeleton states a different width than the page, so every load jumps (B7 rule 3)",
    file: LOADING,
    suite: "notifications-page",
    from: "  return <PageLoader width={1080} rows={6} />;",
    to: "  return <PageLoader width={720} rows={6} />;",
  },
  {
    name: "page-declares-its-own-tint-map",
    why: "the page grows a second appearance map, so a win can be gold in the bell and grey here — E-179's shape",
    file: PAGE,
    suite: "notifications-page",
    // ⚠️ A REPLACE, NOT AN INSERT. Written as an insert (anchored on a line the replacement
    // also contained), this mutation left its own anchor on disk and the harness refused it
    // with "anchor still present after write" — correctly, because that check is the only
    // thing standing between a mutation that did not apply and a false green. Re-shaped so
    // the page stops IMPORTING the shared map and declares its own, which is the real defect.
    from: `import { cn } from "@/lib/utils";
import { iconFor, tintFor } from "@/lib/notification-appearance";`,
    to: `import { cn } from "@/lib/utils";
import { iconFor } from "@/lib/notification-appearance";
const tintFor = (_k: unknown) => "border-border";`,
  },
];
