/**
 * THE JOURNEY'S UNREAD COUNT, AS A RULE — what `useUnreadCount` runs, with the browser handed in (the Vodacom plan S6;
 * S6-PLAN WP3 as amended by A1). Pure: no import, no directive, no global. `test:journey-shell` §6 drives it in process
 * on a stand-in clock.
 *
 * ⭐ THE BELL'S POLL, RESTATED FOR ONE NUMBER. The same question (`fetchMyNotifications`, read for the server's
 * `unread`), the bell's closed cadence (30 s), its failure ladder (1 s doubling to a 30 s ceiling, ±30% jitter, reset
 * only by a real answer), a self-chaining timer that never stacks two reads, a hidden tab that arms nothing, and the
 * bell's two broadcasts. ⛔ Restated, not imported: the bell is untouched until S15 (A1) and exports none of its
 * numbers, so §6 reads them out of `notifications-panel.tsx` and fails the day the two disagree.
 *
 * ⭐ TWO MODES. "poll" is the Akaunti tab's dot: it beats like the closed bell and hears both broadcasts. "once" is the
 * hub's Arifa row (A1): it reads when it starts and when an action changed the inbox, never on a pushed arrival, and
 * arms no beat at all — the row costs one request per visit, not one per notification and not a third poll.
 *
 * ⛔ ONE VIEWER AT A TIME, AND NOTHING CARRIES OVER (critic G1). AppShell survives a sign-out and the next sign-in
 * without remounting, so on a shared phone the same dot is handed the next player's id. `follow` with another id — or
 * none — stops the last viewer's run (its timer, its listeners, its sequence and its ladder all live in that run) and
 * empties what is shown before anything else happens; an answer still in flight for the last viewer is dropped when it
 * lands. A guest (`null`) starts nothing: no read, no timer, no listener.
 */

/** The bell's closed cadence (`POLL_CLOSED_MS`). The tab's dot is never an open list, so it never needs the 5 s one. */
export const UNREAD_POLL_MS = 30_000;
/** The bell's failure ladder (`POLL_BACKOFF_BASE_MS`, `POLL_BACKOFF_MAX_MS`) — itself `use-event-stream.ts`'s (B-18). */
export const UNREAD_BACKOFF_BASE_MS = 1_000;
export const UNREAD_BACKOFF_MAX_MS = 30_000;
/** An action changed the inbox: a bet or a sell-back (`conviction-dial.tsx`, `sell-button.tsx`). */
export const INBOX_CHANGED = "50pick:refresh-notifications";
/** A notification arrived down the event stream (`use-event-stream.ts`). */
export const INBOX_ARRIVED = "50pick:sse:notification";
/** What the bell refreshes on: both. */
export const UNREAD_EVENTS = [INBOX_CHANGED, INBOX_ARRIVED] as const;

export type UnreadMode = "poll" | "once";
/** What each mode refreshes on. ⛔ The row hears an inbox change only (A1); an arrival reaches it on the next visit. */
const HEARD_BY: Readonly<Record<UnreadMode, readonly string[]>> = { poll: UNREAD_EVENTS, once: [INBOX_CHANGED] };
/** What is shown, and for whom. A count is only ever read against the viewer it was read for. */
export type UnreadShown = { readonly viewer: string | null; readonly unread: number | null };
export const NOTHING_SHOWN: UnreadShown = Object.freeze({ viewer: null, unread: null });

/** The world the counter runs in: the browser in `useUnreadCount`, a stand-in clock in the test. */
export type UnreadDeps = {
  /** One read of the signed-in viewer's unread total. It throws when the request fails (offline, a deploy). */
  read: () => Promise<number>;
  setTimer: (fn: () => void, ms: number) => unknown;
  clearTimer: (handle: unknown) => void;
  /** Whether the page is hidden right now. */
  hidden: () => boolean;
  /** Listen on the window or the document; the function returned stops listening. */
  listen: (on: "window" | "document", type: string, fn: () => void) => () => void;
  /** A number from 0 up to (not including) 1, for the jitter. */
  random: () => number;
};

export type UnreadFeed = {
  /** Point the counter at a viewer, or at nobody (`null`). A different viewer inherits nothing. */
  follow: (userId: string | null, mode: UnreadMode) => void;
  subscribe: (onChange: () => void) => () => void;
  snapshot: () => UnreadShown;
};

/** The count to show THIS viewer: what was read for them, or null. Never another viewer's answer, never a guest's. */
export function unreadFor(userId: string | null, shown: UnreadShown): number | null {
  return userId !== null && shown.viewer === userId ? shown.unread : null;
}

export function createUnreadFeed(deps: UnreadDeps): UnreadFeed {
  let shown: UnreadShown = NOTHING_SHOWN;
  let current: { userId: string; mode: UnreadMode; stop: () => void } | null = null;
  const listeners = new Set<() => void>();

  const publish = (next: UnreadShown) => {
    if (next.viewer === shown.viewer && next.unread === shown.unread) return;
    shown = next;
    for (const onChange of [...listeners]) onChange();
  };

  /** One viewer's run. Everything it knows lives in this closure, so letting the run go lets all of it go. */
  function start(userId: string, mode: UnreadMode): () => void {
    let stopped = false;
    /** The stale-answer guard, as the bell's `refreshSeq`: the newest request owns what is shown. */
    let seq = 0;
    /** Requests in flight. Read only by the beat, which yields rather than stack a second read behind a slow one. */
    let inFlight = 0;
    let backoff = UNREAD_BACKOFF_BASE_MS;
    let timer: unknown = null;
    const clear = () => {
      if (timer !== null) { deps.clearTimer(timer); timer = null; }
    };
    /** True when the round trip completed (even if a newer request then owned the answer); false when it failed. */
    const refresh = async (): Promise<boolean> => {
      const mine = ++seq;
      let unread: number;
      inFlight += 1;
      try { unread = await deps.read(); }
      catch { return false; }
      finally { inFlight -= 1; }
      // ⛔ A run that was let go answers for the last viewer: dropped, whoever is shown now.
      if (stopped || mine !== seq) return true;
      publish({ viewer: userId, unread });
      return true;
    };
    /* One beat, armed `ms` from now. "poll" re-arms only after the read has answered, so two beats are never in flight
       together; "once" never re-arms. A hidden tab arms no poll beat — `visibilitychange` restarts the chain — but the
       row's one read at start still goes: it is a single request, not a beat. */
    const arm = (ms: number) => {
      clear();
      if (stopped || (mode === "poll" && deps.hidden())) return;
      timer = deps.setTimer(() => { void beat(); }, ms);
    };
    const beat = async () => {
      timer = null;
      if (stopped) return;
      if (mode === "once") { void refresh(); return; }
      if (deps.hidden()) return;
      if (inFlight > 0) { arm(UNREAD_POLL_MS); return; }
      const ok = await refresh();
      if (stopped) return;
      if (ok) {
        backoff = UNREAD_BACKOFF_BASE_MS; // earned by a real answer
        arm(UNREAD_POLL_MS);
        return;
      }
      // Never faster than the cadence: the ladder is a penalty on top of it, and the jitter keeps a fleet that lost the
      // server on the same deploy from marching back in step.
      const delay = Math.max(UNREAD_POLL_MS, backoff);
      backoff = Math.min(backoff * 2, UNREAD_BACKOFF_MAX_MS);
      arm(Math.round(delay * (0.7 + deps.random() * 0.6)));
    };
    const onBroadcast = () => { void refresh(); };
    const unlisten = HEARD_BY[mode].map((type) => deps.listen("window", type, onBroadcast));
    if (mode === "poll") {
      unlisten.push(deps.listen("document", "visibilitychange", () => {
        if (deps.hidden()) { clear(); return; }
        arm(0); // back on the tab: read now, then re-chain
      }));
    }
    arm(0); // the first read, on the same path as every later one
    return () => {
      stopped = true;
      clear();
      for (const off of unlisten) off();
    };
  }

  return {
    follow(userId, mode) {
      if (current !== null && current.userId === userId && current.mode === mode) return;
      if (current !== null) { current.stop(); current = null; }
      if (shown.viewer !== userId) publish(NOTHING_SHOWN);
      if (userId === null) return;
      current = { userId, mode, stop: start(userId, mode) };
    },
    subscribe(onChange) {
      listeners.add(onChange);
      return () => { listeners.delete(onChange); };
    },
    snapshot: () => shown,
  };
}
