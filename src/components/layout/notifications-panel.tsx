"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { CountBadge } from "@/components/ui/count-badge";
import { Dot } from "@/components/ui/dot";
import { IconPlate } from "@/components/ui/icon-plate";
import { useExitPhase } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { fetchMyNotifications, markNotifReadAction, markAllReadAction, dismissNotifAction, dismissAllAction } from "@/app/_actions/notifications";
import type { StoredNotification } from "@/lib/server/store";
import { useT } from "@/lib/i18n";
import { useModalLock } from "@/lib/use-modal-lock";
// ⛔ ONE HOME for how a kind looks (§0a). The page renders the same rows; a second map here
// would let a win be gold in the bell and grey on the page, and nothing would say so.
import { iconFor, tintFor } from "@/lib/notification-appearance";

/** The SAME list `<Modal>` (ui/modal.tsx) and `<FilterSheet>` (markets/filter-sheet.tsx)
 *  trap against — copied verbatim so the product's three focus traps cannot drift apart. */
const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Poll cadence. 5s is what a player WATCHING the open list needs; 30s is all a closed
 *  bell needs, because `50pick:sse:notification` — not this poll — is what makes an
 *  arrival appear. See the poll effect for why the poll still exists at all. */
const POLL_OPEN_MS = 5_000;
const POLL_CLOSED_MS = 30_000;
/** Failure ladder, the SAME shape as `src/lib/use-event-stream.ts` (B-18): start at 1s,
 *  double to a 30s ceiling, ±30% jitter, and only a real answer earns the reset. One
 *  backoff policy in this product, not two. */
const POLL_BACKOFF_BASE_MS = 1_000;
const POLL_BACKOFF_MAX_MS = 30_000;

/** Relative age of a notification.
 *
 *  POLISH-BACKLOG §1.8: this returned "now" / "5m" / "3h" / "2d" as English
 *  literals, inside the bell — a surface a Swahili player opens constantly, and
 *  the one place the product tells them their money moved. The unit strings are
 *  now dictionary values, so `t` has to be passed in. */
function relTime(iso: string, t: ReturnType<typeof useT>["t"]): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return t.common.relNow;
  if (m < 60) return `${m}${t.common.relMinutes}`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}${t.common.relHours}`;
  return `${Math.floor(h / 24)}${t.common.relDays}`;
}

/** Pick the right locale field from a notification, falling back to English. */
function pickTitle(n: StoredNotification, locale: string): string {
  if (locale === "sw") return n.titleSw || n.titleEn;
  if (locale === "zh") return n.titleZh || n.titleEn;
  return n.titleEn;
}
function pickBody(n: StoredNotification, locale: string): string {
  if (locale === "sw") return n.bodySw || n.bodyEn;
  if (locale === "zh") return n.bodyZh || n.bodyEn;
  return n.bodyEn;
}

export function NotificationsPanel() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<StoredNotification[]>([]);
  /** The server's honest unread total. `null` until the first poll lands. See `unread` below. */
  const [serverUnread, setServerUnread] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { t, locale } = useT();
  useEffect(() => { setOpen(false); }, [pathname]);

  /* The third leg of the dialog contract (see the focus effect below for the other two).
     `overscroll-contain` on the list already stops scroll CHAINING out of the list, but it
     does nothing for a drag that starts on the scrim, and nothing at all for the Android
     pinch-zoom case this hook exists to fix — a zoomed visual viewport puts a `fixed` panel
     off-screen. Every other portaled dialog in the product calls exactly this hook; the
     panel is behind a full-viewport scrim, so it is one of them. */
  useModalLock(open);

  /* §M2 — the float rung's exit. This panel arrived on `.m-float-in` and left by
     instant unmount, which is the arrival half of a two-halved rung. ⛔ The five-part
     dialog contract above stays keyed to `open`, deliberately: focus returns to the
     bell the moment the panel closes, not one beat later, and the trap/lock release
     with it. Only the paint lingers, and it lingers `aria-hidden` and unclickable. */
  const { present, exiting } = useExitPhase(open, "--t-flick");

  /**
   * 🔴 THE COUNT COMES FROM THE SERVER, NOT FROM THE LIST — fixed 2026-08-22.
   *
   * This read `items.filter((n) => !n.readAt).length`, and `items` is capped at **30**
   * (`fetchMyNotifications` → `listForUser(userId, 30)`). So a player holding 40 unread rows
   * saw a badge of 30, and the action had been computing the honest `unreadCount()` and
   * throwing the answer away on the next line the whole time.
   *
   * It became reachable when Up & Down began writing a row per settled round (E-178):
   * measured on production at 20 rows to one player in an hour, and 360/day if a 3-minute
   * chain runs. A badge that silently saturates is a badge that lies about money.
   *
   * ⛔ ONE SOURCE. The bell's badge and the footer strip both render THIS value — if they
   * could disagree, one of them would be wrong and nothing would say which.
   * `serverUnread` is adjusted optimistically by the handlers below and corrected by the
   * next poll, so the number never freezes behind a round-trip.
   */
  const unread = serverUnread ?? items.filter((n) => !n.readAt).length;

  /**
   * `null` until the FIRST poll has landed — the baseline, not a count.
   *
   * 🔴 IT USED TO START AT `0`, AND THAT MADE THE FIRST POLL AN ARRIVAL. `refresh()` runs
   * on mount, so any player holding even one unread notification tripped
   * `clientUnread > 0` on page load and the bell rang — and, until this change, the
   * handset VIBRATED — for a render they had not asked for. Seeding on the first poll is
   * what the comment below always claimed: only an unread that appears WHILE the player
   * is watching is an arrival.
   * (The old guard `prevUnreadRef.current >= 0` was a tautology on a counter that can
   * never be negative; it read like a condition and tested nothing.)
   */
  const prevUnreadRef = useRef<number | null>(null);
  /**
   * Monotonic per-request sequence — the stale-response guard (the B-20 pattern from
   * `vote-control.tsx`, applied to a poller instead of a click).
   *
   * EIGHT sources call `refresh()`: mount, the poll beat, the visibilitychange resume,
   * the `50pick:refresh-notifications` broadcast, the `50pick:sse:notification` push, and
   * the three optimistic handlers (dismiss / mark-all / clear-all), which each `await
   * refresh()` right after mutating `items` locally. Applied in ARRIVAL order, a poll
   * issued before an optimistic dismiss and answered after it puts the dismissed row back
   * — and rewrites `prevUnreadRef` from that stale payload, so the NEXT honest poll reads
   * as an arrival and rings the bell for nothing.
   *
   * ⚠️ Not `ringSeq` below: that is a CSS keyframe-restart counter, not a request number.
   */
  const refreshSeq = useRef(0);
  /**
   * In-flight REQUEST count — a flag, not a mutex. Written by `refresh()` around its one
   * await; read ONLY by the poll beat, which yields rather than stack a second request
   * behind one already crawling over a 2G radio.
   * ⛔ It must never gate `refresh()` itself: the three optimistic handlers `await
   * refresh()` the instant after they mutate `items`, and a refusal there would leave the
   * optimistic state unreconciled against the server.
   */
  const inFlightRef = useRef(0);
  /** The single armed poll beat — a self-chaining `setTimeout`, never a `setInterval`. */
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Consecutive-failure ladder; reset by a real answer. See the poll effect. */
  const pollBackoff = useRef(POLL_BACKOFF_BASE_MS);
  /** Live mirror of `open` for the scheduler, which must NOT take `open` as a dependency
   *  (that would tear the chain and both listeners down on every toggle). */
  const openRef = useRef(false);
  /** `null` until the cadence effect's first run. It compares against the PREVIOUS value
   *  rather than latching a "mounted" bool, because React's dev double-invoke re-runs the
   *  effect with `open` unchanged — and a latch would let that second run re-time the
   *  mount beat out to 30s, leaving the bell empty for half a minute in dev and in QA. */
  const prevOpenRef = useRef<boolean | null>(null);
  /** Handles the poll effect publishes so the cadence effect can pull the next beat
   *  forward, or push it out, without owning the timer itself. */
  const pollNowRef = useRef<(() => void) | null>(null);
  const pollRetimeRef = useRef<(() => void) | null>(null);
  /* M5 alert primitive — the bell takes `.g-ring` on the arrival of a NEW unread,
     single-shot; the key bump restarts the keyframe on each fresh arrival. Never on
     hover, never looping.

     ⛔ AND IT NO LONGER FIRES A HAPTIC. This called `haptics.success()` — `[22, 36, 60]`,
     the money-settled pattern, byte-identical to what `win-celebration.tsx` fires on a
     WIN. Two things were wrong with that, and both are laws this repo already carries:
       · DESIGN_AUTHORITY §H.1 — haptics are physical events only, "⛔ never to pull
         attention back to the app". A background poll is not an act of the player's;
         `watch-star.tsx` states the identical reasoning for its own silence.
       · The inbox carries LOSSES. Loss notifications use direct language ("Bet lost ·
         TZS X") precisely so a loss is not softened — and this buzzed the win pattern
         over them. A congratulatory vibration on a lost round is reinforcement, which
         is against the kit AND against the RG standard that copy exists to serve.
     The settlement moment is already marked on the proper channel (the result toast's
     own variant haptic, and the win celebration), so removing this also removes a
     double signal rather than leaving the moment silent. */
  const [ringSeq, setRingSeq] = useState(0);
  /**
   * Resolves `true` when the round-trip COMPLETED — including one the seq guard then
   * discarded, because a superseded answer still proves the path is healthy — and `false`
   * only when the request itself failed. The poll beat is the only caller that reads it,
   * to choose between its cadence and the backoff ladder; every other caller ignores it.
   */
  const refresh = useCallback(async (): Promise<boolean> => {
    const seq = ++refreshSeq.current;
    // B-15 — offline, this rejected on every beat as an unhandled promise. A poll
    // that cannot reach the server simply skips its beat.
    let r: Awaited<ReturnType<typeof fetchMyNotifications>>;
    // ⛔ The catch returns WITHOUT rewinding `refreshSeq`, on purpose: a failed request
    // must not re-open the window for an older one still in flight.
    inFlightRef.current += 1;
    try { r = await fetchMyNotifications(); }
    catch { return false; }
    finally { inFlightRef.current -= 1; }
    if (seq !== refreshSeq.current) return true; // a newer request owns the state now
    setItems(r.items);
    // ⛔ The list is capped at 30; this is not. Keep them separate.
    setServerUnread(r.unread);
    const clientUnread = r.items.filter((n: StoredNotification) => !n.readAt).length;
    if (prevUnreadRef.current !== null && clientUnread > prevUnreadRef.current) {
      setRingSeq((s) => s + 1);
    }
    prevUnreadRef.current = clientUnread;
    return true;
  }, []);

  /* ⏱ THE POLL — CADENCE, OVERLAP, BACKOFF.
   *
   * 🔴 This was `setInterval(refresh, 5_000)`, alive for as long as the tab was visible,
   * in GLOBAL CHROME, on every authed page, whether or not the panel was open — ~720
   * Server-Action POSTs an hour per signed-in tab, each one a `currentSession()` +
   * `listForUser(userId, 30)` + `unreadCount(userId)`, each one ending in a fresh array
   * identity for `items`. On the device this product is actually used on — a low-end
   * Android on Tanzanian mobile data — that is a radio wake-up every five seconds,
   * forever, for a panel nobody has opened.
   *
   * ⛔ THE POLL IS NOT DELETED AND IS NOT REDUNDANT WITH SSE. The stream pushes the
   * ARRIVAL of a notification; this poll alone carries cross-device read/dismiss state,
   * and it alone covers a stream that is down. What changed is the cadence and the guards:
   *
   *  · 5s while the panel is OPEN (someone is reading the list), 30s while it is CLOSED.
   *    Arrival latency is untouched — `50pick:sse:notification` still refreshes instantly,
   *    which is the whole reason the closed cadence is allowed to be slow.
   *  · A SELF-CHAINING `setTimeout`, not an interval: the next beat is armed only once the
   *    previous one has ANSWERED, so two beats can never be in flight together. An
   *    interval on 2G stacks requests that then land out of ORDER — precisely the hazard
   *    `refreshSeq` was written to survive, now prevented instead of merely detected.
   *    (`refreshSeq` and the `prevUnreadRef` baseline stay exactly as they were: the other
   *    seven callers are still unordered, and the seq guard is what keeps a late answer
   *    from resurrecting a dismissed row or faking an arrival.)
   *  · `inFlightRef` extends the same guard across those other callers — a beat that would
   *    race an SSE push, the broadcast, or an optimistic handler yields instead.
   *  · Exponential backoff with ±30% jitter on failure: the same ladder, ceiling and
   *    earn-the-reset rule as `src/lib/use-event-stream.ts` (B-18), which is one file away
   *    and already owns this policy. A completed round-trip is the analogue of its
   *    `onmessage` — the only thing that resets the ladder.
   *    ⭐ The jitter is the load-bearing part here. Every signed-in tab in the country
   *    loses the server on the SAME instant of a Railway deploy; a jitterless ladder marches
   *    the whole fleet back in lockstep at the worst possible moment.
   */
  useEffect(() => {
    let stopped = false;
    const clear = () => {
      if (pollTimer.current) { clearTimeout(pollTimer.current); pollTimer.current = null; }
    };
    const baseDelay = () => (openRef.current ? POLL_OPEN_MS : POLL_CLOSED_MS);
    /* One beat, armed `ms` from now, which re-arms itself only after it has answered.
       `arm(0)` is therefore also how "poll right now" is spelled — same guards, same
       bookkeeping, one code path. */
    const arm = (ms: number) => {
      clear();
      // A hidden tab arms nothing at all; `visibilitychange` restarts the chain.
      if (stopped || document.hidden) return;
      pollTimer.current = setTimeout(async () => {
        pollTimer.current = null;
        if (stopped || document.hidden) return;
        if (inFlightRef.current > 0) { arm(baseDelay()); return; }
        const ok = await refresh();
        if (stopped) return;
        const base = baseDelay();
        if (ok) {
          pollBackoff.current = POLL_BACKOFF_BASE_MS; // earned by a real answer
          arm(base);
          return;
        }
        // Never faster than the cadence the panel state asks for — the ladder is a
        // penalty on top of it, not a replacement for it.
        const delay = Math.max(base, pollBackoff.current);
        pollBackoff.current = Math.min(pollBackoff.current * 2, POLL_BACKOFF_MAX_MS);
        arm(Math.round(delay * (0.7 + Math.random() * 0.6)));
      }, ms);
    };

    pollNowRef.current = () => arm(0);
    pollRetimeRef.current = () => arm(baseDelay());

    const onVisibility = () => {
      if (document.hidden) { clear(); return; }
      arm(0); // resume: answer now, then re-chain
    };
    const onRefresh = () => { void refresh(); };

    arm(0); // mount: the first read, on the same path as every later one
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("50pick:refresh-notifications", onRefresh);
    // SSE stays the PRIMARY trigger — instant refresh when a notification arrives on the
    // stream. The beat underneath it is the fallback and the cross-device carrier, never
    // what the bell is waiting on.
    window.addEventListener("50pick:sse:notification", onRefresh);
    return () => {
      stopped = true;
      clear();
      pollNowRef.current = null;
      pollRetimeRef.current = null;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("50pick:refresh-notifications", onRefresh);
      window.removeEventListener("50pick:sse:notification", onRefresh);
    };
  }, [refresh]);

  /* The cadence follows the panel — kept OUT of the effect above so that effect can keep
     its stable `[refresh]` dependency list; taking `open` there would tear down the chain
     and both listeners on every toggle. Opening pulls the next beat to now (cross-device
     read/dismiss state is the one thing the stream never pushes, so a list the player has
     just opened is worth re-reading); closing only re-times the pending beat out to 30s,
     and spends no request doing it. */
  useEffect(() => {
    openRef.current = open;
    const prev = prevOpenRef.current;
    prevOpenRef.current = open;
    // The mount beat belongs to the effect above; re-timing it from here would cancel the
    // first read, in whichever order the two effects happen to run. `prev === open` covers
    // the dev double-invoke, which re-runs this with nothing actually toggled.
    if (prev === null || prev === open) return;
    if (open) pollNowRef.current?.();
    else pollRetimeRef.current?.();
  }, [open]);

  /* ⭐ THE DIALOG CONTRACT — it was DECLARED and not PROVIDED.
   *
   * 🔴 This panel has carried `role="dialog"` since it was written, behind a full-viewport
   * scrim, and supplied none of what that promises: no `aria-modal`, no focus-in, no trap,
   * no focus return. It is PORTALED to `document.body` and rendered LAST, so the very first
   * Tab left the panel and walked the page BEHIND the scrim — a page the sighted user
   * cannot see and the pointer cannot reach. This inbox is where the product tells a player
   * their money moved (WIN · LOSS · DEPOSIT · WITHDRAW rows), so "the keyboard user is
   * somewhere else now" is a money surface losing its reader mid-sentence.
   *
   * The five-part contract is the SHIPPED one, taken from `<Modal>` (ui/modal.tsx) and
   * `<FilterSheet>` (markets/filter-sheet.tsx), which implement it identically: Escape
   * closes · focus moves IN on open · Tab is trapped · focus RETURNS to the bell on close ·
   * the body is scroll/zoom locked (`useModalLock`, the same hook).
   * ⛔ NOT literally `<Modal>`: modal.tsx says in as many words that slide-over/anchored
   * panels are a different pattern and out of its scope, and this one hangs off the bell.
   * So the CONTRACT is reused and the mechanism is not.
   *
   * ⚠️ `[open]` IS THE ONLY DEPENDENCY, and that is not tidiness — it is the bug `<Modal>`
   * paid for. Its focus effect once depended on its callbacks, every caller passed a fresh
   * inline arrow, so the effect tore down and re-ran on EVERY render: cleanup restored
   * focus, the body re-captured it, and 30 ms later the timer dragged focus onto the
   * primary button — once a second on the bet-confirm dialog, whose countdown ticks.
   * ⛔ Nothing may join this dependency list without being held in a ref first.
   */
  useEffect(() => {
    if (!open) return;
    // Captured AT OPEN, not read at cleanup time: a tapped row navigates, so by cleanup the
    // DOM has moved on. This is the element that actually had focus when the panel opened —
    // the bell, for a keyboard user.
    const restoreTo = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (ref.current?.contains(target)) return;
      if (dialogRef.current?.contains(target)) return;
      if (target.closest('[role="dialog"], [role="alertdialog"]')) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); setOpen(false); return; }
      if (e.key !== "Tab") return;
      const f = focusables();
      if (f.length === 0) return;
      const first = f[0], last = f[f.length - 1];
      const active = document.activeElement;
      const outside = !dialogRef.current?.contains(active);
      /* ⚠️ `outside` GUARDS BOTH DIRECTIONS HERE, where `<Modal>` guards only Shift+Tab —
         a deliberate difference, not a copy error. Modal's content is static; this list
         DELETES the row under the user (dismiss is optimistic — the row leaves before the
         round-trip). When the focused ✕ is removed from the DOM the browser drops focus to
         `<body>`, and a plain Tab from there is the exact leak the trap exists to stop. */
      if (e.shiftKey && (active === first || outside)) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && (active === last || outside)) {
        e.preventDefault(); first.focus();
      }
    };
    // 30 ms — the same beat `<Modal>` and `<FilterSheet>` wait, so the panel has painted and
    // `.m-float-in` has started before focus lands. The panel itself is the fallback
    // (tabIndex -1) for the impossible case of a dialog with nothing focusable in it.
    const timer = setTimeout(() => {
      (focusables()[0] ?? dialogRef.current)?.focus();
    }, 30);
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
      // Guard: the bell may have unmounted under a navigation.
      restoreTo?.focus?.();
    };
  }, [open]);

  const handleClick = async (n: StoredNotification) => {
    // B-15 — mark-read is AWAITED before navigating. The old fire-and-forget
    // raced the full-page navigation (B-11's raw location.href), and the unload
    // aborted the in-flight action often enough that a tapped item stayed
    // unread. A failed mark-read must not strand the tap: swallow and navigate.
    if (!n.readAt) {
      try { await markNotifReadAction(n.id); } catch { /* offline — navigate anyway */ }
    }
    if (n.href) {
      const sameOrigin = n.href.startsWith("/") && !n.href.startsWith("//");
      if (sameOrigin) {
        setOpen(false);
        router.push(n.href as never); // client nav — no MPA teardown (B-11)
      } else {
        window.location.href = n.href;
      }
    } else {
      setOpen(false);
    }
  };

  const handleDismiss = async (e: React.MouseEvent | React.KeyboardEvent, id: string) => {
    e.stopPropagation();
    // B-15 — optimistic: the row leaves NOW (a dismiss that waits a round-trip
    // reads as a dead ✕ on 2G). On failure the snapshot comes back — the row
    // reappearing IS the failure notice, honest without inventing copy.
    const prev = items;
    const wasUnread = !items.find((n) => n.id === id)?.readAt;
    setItems((cur) => cur.filter((n) => n.id !== id));
    // Dismissing an UNREAD row removes it from the unread total too; a read one does not.
    if (wasUnread) setServerUnread((n) => (n === null ? n : Math.max(0, n - 1)));
    try {
      await dismissNotifAction(id);
      await refresh();
    } catch {
      setItems(prev);
      if (wasUnread) setServerUnread((n) => (n === null ? n : n + 1));
    }
  };

  const handleMarkAll = async () => {
    if (items.length === 0) return;
    // Optimistic + rollback, same contract as a single dismiss (B-15).
    const prev = items;
    const prevUnread = serverUnread;
    setItems((cur) => cur.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })));
    setServerUnread(0);
    try {
      await markAllReadAction();
      await refresh();
    } catch {
      // The list AND the count roll back together — a restored row that still reads as
      // read is the same lie in a smaller place.
      setItems(prev);
      setServerUnread(prevUnread);
    }
  };

  const handleClearAll = async () => {
    if (items.length === 0) return;
    const prev = items;
    const prevUnreadAll = serverUnread;
    setItems([]);
    setServerUnread(0);
    try {
      await dismissAllAction();
      await refresh();
    } catch {
      setItems(prev);
      setServerUnread(prevUnreadAll);
    }
  };

  return (
    <div ref={ref} className="relative z-10">
      <button
        type="button"
        aria-label={`${t.common.notifications}${unread > 0 ? ` (${unread})` : ""}`}
        aria-expanded={open ? "true" : "false"}
        onClick={() => setOpen((v) => !v)}
        data-unread={unread}
        className={cn(
          // 40px button (scale token `7`) — was `h-10 w-10` which is 80px on this
          // project's custom spacing scale (10 → 80px), oversizing the bell vs the
          // 40px avatar and overflowing the phone top-bar. Now matches the avatar.
          "relative inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors",
          open ? "bg-bg-overlay/60 text-text" : "text-text-subtle hover:text-text hover:bg-bg-overlay/40",
        )}
      >
        <span key={ringSeq} aria-hidden className={cn("inline-flex", ringSeq > 0 && "g-ring")}>
          <I.bell s={20} />
        </span>
        {/* ⭐ STAGE 9b — the kit <CountBadge>. `md` is this pip's own box (min-width 18,
            height 18, 0 4px, 10px/700) and `rose`/`ring`/`glow` are its own gradient,
            2px cut-out and halo, carried across unchanged. Only the POSITION stays
            inline, because where a pip hangs is a fact about the bell, not about pips.

            🔴 AND IT NOW CAPS AT 99+. `unreadCount` is uncapped in the service, so a
            player back from a fortnight away rendered "1247" inside an 18px circle
            anchored 1px from the top bar's right edge. That is a rendered change and
            it is the entire reason this badge has a shared definition. */}
        <CountBadge
          count={unread}
          aria-hidden
          className="notif-badge-pulse"
          tone="rose"
          size="md"
          ring="var(--bg-base)"
          // DS-24's halo now lives on the `rose` tone inside the primitive, not here — a
          // caller can no longer pass a shadow at all, so the raw `oklch()` this line used
          // to carry cannot come back.
          lift
          style={{
            // 40px button with the 20px glyph centred (glyph spans 10–30px);
            // the badge hugs the glyph's top-right corner.
            position: "absolute",
            top: 3,
            right: 1,
            zIndex: 20,
            pointerEvents: "none",
          }}
        />
      </button>

      {present && typeof document !== "undefined" && createPortal(
        <>
          <div
            aria-hidden
            className={cn(
              "fixed inset-0 z-[60] bg-black/60 backdrop-blur-md",
              exiting && "m-float-out pointer-events-none",
            )}
            onClick={exiting ? undefined : () => setOpen(false)}
          />
          <div
            ref={dialogRef}
            role="dialog"
            /* ⭐ `aria-modal` is the half of the contract the MARKUP owes; the effect above
               owes the other half. It tells assistive tech the rest of the document is inert
               while this is open — which is only honest BECAUSE the trap now holds, and
               which is why the two shipped together rather than one first. */
            aria-modal={exiting ? undefined : "true"}
            /* Leaving: focus has already gone back to the bell, so the fading copy
               must stop claiming the rest of the page is inert, and must stop
               taking clicks — a row still tappable mid-fade navigates the player
               somewhere they just chose to leave. */
            aria-hidden={exiting || undefined}
            aria-label={t.notif.title}
            /* Focus fallback for a dialog with nothing focusable inside it — never reached
               today (the ✕ is always there), and excluded from FOCUSABLE so the trap cannot
               land the user on the container itself. */
            tabIndex={-1}
            className={cn(
              "fixed left-3 right-3 top-[calc(env(safe-area-inset-top)+72px)] z-[61] rounded-modal border border-border-strong bg-bg-elevated/85 backdrop-blur-xl overflow-hidden shadow-overlay flex flex-col",
              "max-h-[calc(100dvh-env(safe-area-inset-top)-72px-env(safe-area-inset-bottom)-72px)]",
              // max-h is viewport-bound (not a flat 480) so the panel fits a short
              // landscape phone (≤360px tall) and scrolls internally instead of
              // running off the bottom.
              "sm:left-auto sm:right-4 sm:top-[64px] sm:w-[380px] sm:max-w-[calc(100vw-24px)] sm:max-h-[min(480px,calc(100dvh-80px))]",
              exiting ? "m-float-out pointer-events-none" : "m-float-in",
            )}
            // Anchored (kit law 1): the bell panel hangs off the RIGHT of its trigger,
            // so it grows from that corner, not `.m-float-in`'s default top-left.
            style={{ transformOrigin: "top right" }}
          >
            <div className="flex items-center justify-between border-b border-border bg-transparent px-3 shrink-0" style={{ height: 44 }}>
              <p className="font-mono text-micro font-bold uppercase tracking-[0.18em] text-text min-w-0 truncate">
                {t.notif.title}
              </p>
              <div className="flex items-center shrink-0">
                {items.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={handleMarkAll}
                      className="inline-flex items-center min-h-[44px] px-2 rounded-md font-mono text-micro font-bold uppercase text-text-subtle hover:text-text hover:bg-bg-overlay transition-colors whitespace-nowrap"
                    >
                      {t.common.readAll}
                    </button>
                    <span className="text-border text-[9px] mx-0.5">|</span>
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="h-7 px-1.5 rounded-md font-mono text-micro font-bold uppercase tracking-[0.10em] text-text-subtle hover:text-no-300 hover:bg-bg-overlay transition-colors whitespace-nowrap"
                    >
                      {t.common.clearAll}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  aria-label={t.common.close}
                  onClick={() => setOpen(false)}
                  className="ml-0.5 h-7 w-7 inline-flex items-center justify-center rounded-md text-text-subtle hover:text-text hover:bg-bg-overlay transition-colors"
                >
                  <I.x s={13} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain bg-transparent" aria-live="polite" aria-relevant="additions">
              {items.map((n) => {
                const Icon = iconFor(n.kind);
                const isUnread = !n.readAt;
                return (
                  /* 🔴 THE ROW USED TO BE A `<button>` WITH THE DISMISS `<button>` INSIDE IT.
                     Nesting interactive content inside a button is invalid HTML — the parser
                     is entitled to unnest it, and assistive-technology behaviour is
                     undefined: some screen readers announce one control, some two, and the
                     inner ✕ may not be reachable at all. On a row that DELETES a money
                     notification, "undefined" is not a tolerable spec.

                     ⭐ WHAT WAS CHOSEN, and what was rejected. The dismiss is now a SIBLING
                     of the row's action inside a plain `<div>`, not a stretched-link overlay.
                     The overlay (an absolutely-positioned `inset-0` button under the ✕) would
                     keep the last ~64px of the row clickable, and it costs more than it buys:
                     the overlay button contains no text, so its accessible name has to be
                     rebuilt out of `aria-labelledby` per row, and a transparent sheet over
                     the text kills selection and drag. The sibling split loses only the
                     16px gutter beside the ✕ — the ✕ itself already owned the rest of that
                     column — and every control keeps its own real, readable name.
                     ⚠️ The wash, the border and the hover stay on the CONTAINER so the row
                     still lights as one object, including when the pointer is on the ✕. */
                  <div
                    key={n.id}
                    className={cn(
                      "flex items-start border-b border-border last:border-b-0 hover:bg-bg-overlay transition-colors",
                      isUnread && "bg-gold-500/[0.04]",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => handleClick(n)}
                      /* `px-3 py-3` + `gap-3` reproduce the old geometry exactly: the action's
                         right padding IS the 16px that used to be the gap before the ✕. */
                      className="min-w-0 flex-1 text-left flex items-start gap-3 px-3 py-3"
                    >
                      {/* ⭐ THE PLATE IS THE ATOM (stage 9's `IconPlate`), not a tenth
                          hand-rolled copy. `rounded-lg` and `rounded-control` are BOTH 12px,
                          so this is a zero-pixel change — what it buys is that the bell and
                          `/notifications` now render one plate, at one size, from one place.
                          ⚠️ The size stays an inline literal inside the atom: `theme.spacing`
                          is overridden, so `h-8` would render 48px, not 32. */}
                      <IconPlate size={32} className={cn("border", tintFor(n.kind))}>
                        <Icon s={16} />
                      </IconPlate>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          {/* §A4 — colour is never the only signal. Unread was a gold wash plus
                              the gold dot below, and the dot is (correctly) `aria-hidden`, so a
                              screen-reader user could not tell a settled-money notification they
                              had opened from one they had not. Announced BEFORE the title so the
                              state arrives with the headline, not after it. `sr-only` is
                              absolutely positioned, so it adds nothing to this flex row. */}
                          {isUnread && <span className="sr-only">{t.notif.unread}</span>}
                          <p className="font-display text-body-sm font-semibold text-text truncate leading-tight">
                            {pickTitle(n, locale)}
                          </p>
                          {/* Stage 9b — kit <Dot>. `h-1.5 w-1.5` is 8px on this project's
                              OVERRIDDEN spacing scale, not 6px, so the size is stated in
                              pixels here where it cannot be misread. */}
                          {isUnread && <Dot tone="gold" size={8} className="mt-1" />}
                        </div>
                        <p className="mt-0.5 text-label text-text-muted leading-snug">
                          {pickBody(n, locale)}
                        </p>
                        <div className="mt-1 flex items-center justify-end">
                          <span className="font-mono text-[10.5px] tabular-nums text-text-subtle">
                            {relTime(n.createdAt, t)}
                          </span>
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      aria-label={t.notif.dismissNotification}
                      /* ⚠️ `stopPropagation` is KEPT even though the ✕ is no longer a
                         descendant of the row's action. It still matters: the panel closes on
                         a document-level click listener, and `handleDismiss` reads the event.
                         `h-8 w-8` is 48×48px on this project's OVERRIDDEN spacing scale
                         (tailwind.config.ts — 8 → 48px), i.e. above the 44px §A2 preference,
                         not the 32px the class name suggests. `mt-3 mr-3` puts it where the
                         old row's `px-3 py-3` did, to the pixel. */
                      onClick={(e) => { e.stopPropagation(); handleDismiss(e, n.id); }}
                      className="mt-3 mr-3 shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-md text-text-subtle hover:text-text hover:bg-bg-overlay transition-colors"
                    >
                      <I.x s={13} />
                    </button>
                  </div>
                );
              })}
              {items.length === 0 && (
                <div className="px-4 py-12 text-center">
                  <svg
                    aria-hidden
                    width="48"
                    height="48"
                    viewBox="0 0 56 56"
                    className="mx-auto mb-3 text-brand-300"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 38 V24 a14 14 0 0 1 28 0 V38 l4 4 H10 Z" />
                    <path d="M22 44 a6 6 0 0 0 12 0" />
                    <circle cx="42" cy="14" r="4" fill="var(--gold-400)" stroke="none" />
                  </svg>
                  <p className="font-display text-body font-semibold text-text">
                    {t.notif.noNotifications}
                  </p>
                  <p className="mt-2 text-label text-text-muted leading-relaxed">
                    {t.notif.noNotificationsHint}
                  </p>
                </div>
              )}
            </div>
            {/* ── THE FOOTER STRIP ──────────────────────────────────────────────────
                Pinned under the scrolling list, so the way OUT of the 30-row window is
                always visible rather than something you find by scrolling to the end.

                ⛔ WHY IT EXISTS. This panel shows the newest 30 rows, ordered purely by
                time with no priority by kind. Once Up & Down began writing a row per
                settled round (E-178) a busy player could push a SECURITY alert or a KYC
                decision out of the only door that showed it — 20 rows to one player in an
                hour, measured on production. `/notifications` is that door; this is its
                handle.

                ⛔ `shrink-0`, and a SIBLING of the `flex-1 overflow-y-auto` list above —
                not inside it. Inside, it would scroll away with the rows.

                ⚠️ Hidden when there is nothing: the empty state already speaks, and a
                strip reading "0 unread" under it is furniture. */}
            {items.length > 0 && (
              <div className="shrink-0 flex items-center justify-between gap-2 border-t border-border bg-bg-overlay/40 px-3 py-2">
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  {/* ⛔ Colour is never the only signal (§A4) — the dot is decorative and the
                      COUNT is the message, so the dot is aria-hidden and the text carries it. */}
                  {unread > 0 && <Dot tone="gold" aria-hidden />}
                  <span className="font-mono text-micro font-bold uppercase text-text-subtle truncate">
                    {unread === 1 ? t.notif.unreadOne : t.notif.unreadN.replace("{n}", String(unread))}
                  </span>
                </span>
                <span className="flex items-center gap-1 shrink-0">
                  {/* ⛔ NO `READ ALL` HERE — IT LIVES IN THE HEADER, AND IT LIVES THERE ONCE.
                      The first build put one in both places: the same command twice on one
                      card, a few hundred pixels apart, which reads as two different actions
                      until you try them. Removed on sight (2026-08-22).

                      ⭐ THE SPLIT THAT REPLACED IT is worth keeping deliberately:
                        · the HEADER is identity + the two BULK ACTIONS (Read all · Clear all)
                          + close — the things that act on the whole list, grouped;
                        · this FOOTER is STATUS + the WAY OUT — how many are unread, and the
                          one link to everything the 30-row list cannot hold.
                      Two rows, two jobs, no command in both. It also leaves `SEE ALL` as the
                      single accent-coloured control down here, so the primary action on the
                      strip is unambiguous rather than competing with a bulk action beside it. */}
                  {/* ⛔ A REAL LINK, not `router.push`. It middle-clicks, it opens in a new
                      tab, and a screen reader announces it as a link — none of which a
                      button does. `setOpen(false)` so the panel is not left hanging over
                      the page it just navigated to. */}
                  <Link
                    href={"/notifications" as never}
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center gap-0.5 min-h-[44px] px-2 rounded-md font-mono text-micro font-bold uppercase text-accent-400 hover:text-text hover:bg-bg-overlay transition-colors whitespace-nowrap"
                  >
                    {t.notif.seeAll}
                    <I.chevronRight s={11} />
                  </Link>
                </span>
              </div>
            )}
          </div>
          {/* `np-rise` was ALSO defined here, duplicating globals.css — the panel arrival
              now uses the kit's `.m-float-in`, so the local copy is gone. One fact, one home. */}
          <style>{`
            @keyframes notif-badge-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.25); } }
            .notif-badge-pulse { animation: notif-badge-pulse 2s var(--m-breathe) infinite; }
            @media (prefers-reduced-motion: reduce) { .notif-badge-pulse { animation: none; } }
          `}</style>
        </>,
        document.body,
      )}
    </div>
  );
}
