"use client";

/**
 * THE JOURNEY'S UNREAD COUNT — the Akaunti tab's dot and the hub's Arifa row (the Vodacom plan S6; S6-PLAN WP3 as
 * amended by A1). The rule is `unread-count.ts`, pure and tested in process; this file hands it the browser.
 *
 * It asks the bell's own question — `fetchMyNotifications`, the Server Action the bell calls — and keeps only the
 * server's `unread`, the honest total (the list is capped at 30; the count is not).
 *
 * ⛔ THE CLASSIC BELL IS NOT ON THIS (A1). `notifications-panel.tsx` keeps its own poll until S15, when it retires: a
 * store shared with the bell would have changed what every live player's bell does (critic G1, G10). The cost, for
 * journey viewers only: the dot polls beside the bell, so a signed-in journey page asks twice every 30 s until S15
 * (`docs/VODACOM-PLAN.md` §0h point 16), and the row's "once" mode keeps its own share to one request per visit.
 *
 * ⛔ KEYED BY THE VIEWER. AppShell is not remounted by a sign-out (the E-381 path) or by a sign-in through a Server
 * Action redirect, so the dot can be handed another player's `userId` on a shared phone. The counter drops everything
 * the last viewer had the moment the id changes, and this hook shows a count only for the viewer it was read for —
 * never the last player's, not for one frame. A guest (`userId` null) starts nothing.
 *
 * ⚠️ JOURNEY COMPONENTS ONLY: `test:journey-shell` §6 holds every file loading this to a "use client" file under
 * `src/components/journey/`, and holds the bell to loading neither file.
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import { fetchMyNotifications } from "@/app/_actions/notifications";
import { createUnreadFeed, unreadFor, NOTHING_SHOWN, type UnreadDeps, type UnreadMode } from "@/lib/journey/unread-count";

/** The bell's question, read for the count alone. */
const readUnread = async (): Promise<number> => (await fetchMyNotifications()).unread;

/** The browser, as the counter needs it. Each part reaches for a global only when it is called — inside an effect,
 *  never during a render and never on the server. */
const BROWSER: UnreadDeps = {
  read: readUnread,
  setTimer: (fn, ms) => window.setTimeout(fn, ms),
  clearTimer: (handle) => window.clearTimeout(handle as number),
  hidden: () => document.hidden,
  listen: (on, type, fn) => {
    const target: EventTarget = on === "document" ? document : window;
    target.addEventListener(type, fn);
    return () => target.removeEventListener(type, fn);
  },
  random: Math.random,
};

/** The server renders no count, and the hydration that matches it shows none either. */
const serverShown = () => NOTHING_SHOWN;

/**
 * The viewer's unread total, or null while it is not known: a guest, the first read not back yet, or a new viewer not
 * yet answered. `mode: "poll"` is the tab's dot (the bell's closed cadence and both its broadcasts); `mode: "once"` is
 * the hub's row (a read when it mounts and when an action changed the inbox, and no beat at all).
 */
export function useUnreadCount({ userId, mode }: { userId: string | null; mode: UnreadMode }): number | null {
  // One counter per mounted caller, made once. Making it touches nothing; only `follow` starts work.
  const [feed] = useState(() => createUnreadFeed(BROWSER));
  const shown = useSyncExternalStore(feed.subscribe, feed.snapshot, serverShown);
  useEffect(() => {
    feed.follow(userId, mode);
    // Let go on every change of viewer or mode and on unmount: the next viewer starts from nothing.
    return () => feed.follow(null, mode);
  }, [feed, userId, mode]);
  // Read against the viewer of THIS render, so a new id shows nothing even before the effect above has run.
  return unreadFor(userId, shown);
}
