"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { cn } from "@/lib/utils";
import { fetchMyNotifications, markNotifReadAction, markAllReadAction, dismissNotifAction, dismissAllAction } from "@/app/_actions/notifications";
import type { StoredNotification } from "@/lib/server/store";
import { useT } from "@/lib/i18n";

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
    case "BET_PLACED":   return "border-info-border bg-info-bg/30 text-info-fg";
    case "SELECTION_CLOSED": return "border-info-border bg-info-bg/30 text-info-fg";
    case "ROUND_RESULT": return "border-border bg-bg-overlay text-text-muted";
    case "DEPOSIT":      return "border-yes-700 bg-yes-500/10 text-yes-300";
    case "WITHDRAW":     return "border-warning-border bg-warning-bg/30 text-warning-fg";
    case "KYC":          return "border-info-border bg-info-bg/30 text-info-fg";
    case "RG":           return "border-info-border bg-info-bg/30 text-info-fg";
    case "SECURITY":     return "border-no-700 bg-no-500/10 text-no-300";
    case "MATCH_START":  return "border-border bg-bg-overlay text-text-muted";
    case "AFFILIATE":    return "border-gold-700 bg-gold-500/10 text-gold-300";
    case "PROPOSAL":     return "border-gold-700 bg-gold-500/10 text-gold-300";
    // Informational, never a "bet now" nudge → royal/info, never gold.
    case "WATCHLIST":    return "border-info-border bg-info-bg/30 text-info-fg";
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

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (ref.current?.contains(target)) return;
      if (dialogRef.current?.contains(target)) return;
      if (target.closest('[role="dialog"], [role="alertdialog"]')) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
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
            aria-label={t.notif.title}
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
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleClick(n)}
                    className={cn(
                      "w-full text-left flex items-start gap-3 px-3 py-3 border-b border-border last:border-b-0 hover:bg-bg-overlay transition-colors",
                      isUnread && "bg-gold-500/[0.04]",
                    )}
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
                    <button
                      type="button"
                      aria-label={t.notif.dismissNotification}
                      onClick={(e) => { e.stopPropagation(); handleDismiss(e, n.id); }}
                      className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-md text-text-subtle hover:text-text hover:bg-bg-overlay transition-colors"
                    >
                      <I.x s={13} />
                    </button>
                  </button>
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
