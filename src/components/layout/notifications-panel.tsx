"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { cn } from "@/lib/utils";
import { fetchMyNotifications, markNotifReadAction, markAllReadAction, dismissNotifAction, dismissAllAction } from "@/app/_actions/notifications";
import type { StoredNotification } from "@/lib/server/store";
import { useT } from "@/lib/i18n";
import { useModalLock } from "@/lib/use-modal-lock";

/** The SAME list `<Modal>` (ui/modal.tsx) and `<FilterSheet>` (markets/filter-sheet.tsx)
 *  trap against — copied verbatim so the product's three focus traps cannot drift apart. */
const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const iconFor = (k: StoredNotification["kind"]) => {
  switch (k) {
    case "WIN":          return I.trophy;
    case "LOSS":         return I.trendingDown;
    case "BET_PLACED":   return I.ticket;
    case "SELECTION_CLOSED": return I.calendarClock;
    case "DEPOSIT":      return I.arrowDown;
    case "WITHDRAW":     return I.arrowUp;
    case "KYC":          return I.shieldcheck;
    case "ROUND_RESULT": return I.activity;
    case "MATCH_START":  return I.coins;
    case "RG":           return I.heartPulse;
    case "SECURITY":     return I.keyRound;
    case "AFFILIATE":    return I.megaphone;
    case "PROPOSAL":     return I.fileCheck;
    case "WATCHLIST":    return I.star;
    default:             return I.coins;
  }
};

/** Kit-tinted swatch per notification kind (OKLCH-tuned for dark + light). */
const tintFor = (k: StoredNotification["kind"]) => {
  switch (k) {
    case "WIN":          return "border-gold-700 bg-gold-500/10 text-gold-300";
    case "LOSS":         return "border-border bg-bg-overlay text-text-muted";
    case "BET_PLACED":   return "border-info-border bg-info-bg text-info-fg";
    case "SELECTION_CLOSED": return "border-info-border bg-info-bg text-info-fg";
    case "ROUND_RESULT": return "border-border bg-bg-overlay text-text-muted";
    case "DEPOSIT":      return "border-yes-700 bg-yes-500/10 text-yes-300";
    case "WITHDRAW":     return "border-warning-border bg-warning-bg text-warning-fg";
    case "KYC":          return "border-info-border bg-info-bg text-info-fg";
    case "RG":           return "border-info-border bg-info-bg text-info-fg";
    case "SECURITY":     return "border-no-700 bg-no-500/10 text-no-300";
    case "MATCH_START":  return "border-border bg-bg-overlay text-text-muted";
    case "AFFILIATE":    return "border-gold-700 bg-gold-500/10 text-gold-300";
    case "PROPOSAL":     return "border-gold-700 bg-gold-500/10 text-gold-300";
    // Informational, never a "bet now" nudge → royal/info, never gold.
    case "WATCHLIST":    return "border-info-border bg-info-bg text-info-fg";
    default:             return "border-border bg-bg-overlay text-text-muted";
  }
};

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

  const unread = items.filter((n) => !n.readAt).length;

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
   * EIGHT sources call `refresh()`: mount, the 5s interval, the visibilitychange resume,
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
  const refresh = useCallback(async () => {
    const seq = ++refreshSeq.current;
    // B-15 — offline, this rejected every 5s as an unhandled promise. A poll
    // that cannot reach the server simply skips its beat.
    let r: Awaited<ReturnType<typeof fetchMyNotifications>>;
    // ⛔ The catch returns WITHOUT rewinding `refreshSeq`, on purpose: a failed request
    // must not re-open the window for an older one still in flight.
    try { r = await fetchMyNotifications(); } catch { return; }
    if (seq !== refreshSeq.current) return; // a newer request owns the state now
    setItems(r.items);
    const clientUnread = r.items.filter((n: StoredNotification) => !n.readAt).length;
    if (prevUnreadRef.current !== null && clientUnread > prevUnreadRef.current) {
      setRingSeq((s) => s + 1);
    }
    prevUnreadRef.current = clientUnread;
  }, []);

  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;
    const startPolling = () => {
      if (id) return;
      id = setInterval(refresh, 5_000);
    };
    const stopPolling = () => { if (id) { clearInterval(id); id = null; } };
    const onVisibility = () => {
      if (document.hidden) { stopPolling(); }
      else { refresh(); startPolling(); }
    };
    refresh();
    startPolling();
    document.addEventListener("visibilitychange", onVisibility);
    const onRefresh = () => { refresh(); };
    window.addEventListener("50pick:refresh-notifications", onRefresh);
    // SSE: instant refresh when a new notification arrives via the event stream
    window.addEventListener("50pick:sse:notification", onRefresh);
    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("50pick:refresh-notifications", onRefresh);
      window.removeEventListener("50pick:sse:notification", onRefresh);
    };
  }, [refresh]);

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
    setItems((cur) => cur.filter((n) => n.id !== id));
    try {
      await dismissNotifAction(id);
      await refresh();
    } catch {
      setItems(prev);
    }
  };

  const handleMarkAll = async () => {
    if (items.length === 0) return;
    // Optimistic + rollback, same contract as a single dismiss (B-15).
    const prev = items;
    setItems((cur) => cur.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })));
    try {
      await markAllReadAction();
      await refresh();
    } catch {
      setItems(prev);
    }
  };

  const handleClearAll = async () => {
    if (items.length === 0) return;
    const prev = items;
    setItems([]);
    try {
      await dismissAllAction();
      await refresh();
    } catch {
      setItems(prev);
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
        {unread > 0 && (
          <span
            aria-hidden
            className="notif-badge-pulse"
            style={{
              // 40px button with the 20px glyph centred (glyph spans 10–30px);
              // the badge hugs the glyph's top-right corner.
              position: "absolute",
              top: 3,
              right: 1,
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              background: "linear-gradient(180deg, var(--no-400), var(--no-600))",
              border: "2px solid var(--bg-base)",
              // DS-24 — fully token-composed (the drop half was a raw oklch).
              boxShadow: "0 0 8px var(--no-500), 0 2px 4px color-mix(in oklab, var(--royal-950) 40%, transparent)",
              zIndex: 20,
              pointerEvents: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 700,
              color: "var(--pearl-50)",
              fontFamily: "var(--font-mono)",
              padding: "0 4px",
              lineHeight: 1,
            }}
          >
            {unread}
          </span>
        )}
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <>
          <div
            aria-hidden
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md"
            onClick={() => setOpen(false)}
          />
          <div
            ref={dialogRef}
            role="dialog"
            /* ⭐ `aria-modal` is the half of the contract the MARKUP owes; the effect above
               owes the other half. It tells assistive tech the rest of the document is inert
               while this is open — which is only honest BECAUSE the trap now holds, and
               which is why the two shipped together rather than one first. */
            aria-modal="true"
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
              "m-float-in",
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
                      className="h-7 px-1.5 rounded-md font-mono text-[9.5px] font-bold uppercase tracking-[0.10em] text-text-subtle hover:text-text hover:bg-bg-overlay transition-colors whitespace-nowrap"
                    >
                      {t.common.readAll}
                    </button>
                    <span className="text-border text-[9px] mx-0.5">|</span>
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="h-7 px-1.5 rounded-md font-mono text-[9.5px] font-bold uppercase tracking-[0.10em] text-text-subtle hover:text-no-300 hover:bg-bg-overlay transition-colors whitespace-nowrap"
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
                      <span
                        className={cn("shrink-0 inline-flex items-center justify-center rounded-lg border", tintFor(n.kind))}
                        style={{
                          width: 32, height: 32,
                        }}
                      >
                        <Icon s={16} />
                      </span>
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
                          {isUnread && (
                            <span aria-hidden className="h-1.5 w-1.5 rounded-pill bg-gold-500 shrink-0 mt-1" />
                          )}
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
