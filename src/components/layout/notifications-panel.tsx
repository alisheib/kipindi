"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { cn } from "@/lib/utils";
import { fetchMyNotifications, markNotifReadAction, markAllReadAction, dismissNotifAction, dismissAllAction } from "@/app/_actions/notifications";
import type { StoredNotification } from "@/lib/server/store";
import { haptics } from "@/lib/haptics";

// No static fallbacks — players only see notifications that were really
// emitted to their own userId. Empty inbox shows "No notifications yet."
// (Fake demo notifications used to live here; they confused players who
// saw "TZS 2,400 paid out" without ever winning anything.)

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
    case "RG":           return I.shieldcheck;
    case "SECURITY":     return I.shieldcheck;
    case "AFFILIATE":    return I.coins;
    case "PROPOSAL":     return I.trophy;
    default:             return I.coins;
  }
};

/** Kit-tinted swatch per notification kind (OKLCH-tuned for dark + light). */
const tintFor = (k: StoredNotification["kind"]) => {
  switch (k) {
    // Gold is celebratory — reserved for wins only.
    case "WIN":          return "border-gold-700 bg-gold-500/10 text-gold-300";
    // Loss uses muted neutral tint — kit responsibility-first language
    // forbids alarming colors for a player's bad outcome.
    case "LOSS":         return "border-border bg-bg-overlay text-text-muted";
    // Bet placed = informational receipt — info tint, never gold.
    case "BET_PLACED":   return "border-info-border bg-info-bg/30 text-info-fg";
    // Selection closed = informational "waiting for results" — info tint.
    case "SELECTION_CLOSED": return "border-info-border bg-info-bg/30 text-info-fg";
    case "ROUND_RESULT": return "border-border bg-bg-overlay text-text-muted";
    case "DEPOSIT":      return "border-yes-700 bg-yes-500/10 text-yes-300";
    case "WITHDRAW":     return "border-warning-border bg-warning-bg/30 text-warning-fg";
    case "KYC":          return "border-info-border bg-info-bg/30 text-info-fg";
    case "RG":           return "border-info-border bg-info-bg/30 text-info-fg";
    case "SECURITY":     return "border-no-700 bg-no-500/10 text-no-300";
    case "MATCH_START":  return "border-border bg-bg-overlay text-text-muted";
    // Affiliate earnings are money received → gold, per the brand guide.
    case "AFFILIATE":    return "border-gold-700 bg-gold-500/10 text-gold-300";
    case "PROPOSAL":     return "border-gold-700 bg-gold-500/10 text-gold-300";
    default:             return "border-border bg-bg-overlay text-text-muted";
  }
};

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function NotificationsPanel() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<StoredNotification[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  // Close panel on navigation so the portal + scrim don't persist.
  useEffect(() => { setOpen(false); }, [pathname]);

  // Derive unread count from items client-side — the server's separate
  // countUnread query was returning 0 despite items having readAt===null.
  // Single source of truth: if items are here and readAt is null, it's unread.
  const unread = items.filter((n) => !n.readAt).length;

  const prevUnreadRef = useRef(0);
  const refresh = useCallback(async () => {
    const r = await fetchMyNotifications();
    setItems(r.items);
    // Haptic nudge when new notifications arrive (unread count increased)
    const clientUnread = r.items.filter((n: StoredNotification) => !n.readAt).length;
    if (clientUnread > prevUnreadRef.current && prevUnreadRef.current >= 0) {
      haptics.success();
    }
    prevUnreadRef.current = clientUnread;
  }, []);

  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;
    // Only poll while the tab is visible — a backgrounded/alt-tabbed tab
    // doesn't need fresh notifications and shouldn't burn battery/data on
    // mid-tier Android. We refresh once on (re)focus to catch up instantly.
    const startPolling = () => {
      if (id) return;
      // 5 s — every moment counts in a betting platform. The endpoint is cheap.
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
    // Also refresh on demand — any mutation (bet placed, sell, etc.)
    // can dispatch `50pick:refresh-notifications` and the bell will
    // re-poll within the next event-loop tick. This is the
    // sub-second-feedback path the user asked for.
    const onRefresh = () => { refresh(); };
    window.addEventListener("50pick:refresh-notifications", onRefresh);
    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("50pick:refresh-notifications", onRefresh);
    };
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    // `click` (not `mousedown`) so that controls inside any child
    // portal — confirm dialogs, sub-menus — get to complete their own
    // click cycle before this panel tears down. See the avatar-menu
    // sign-out fix (Sprint 53.1) for the original repro.
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

  const handleClick = (n: StoredNotification) => {
    // Navigate IMMEDIATELY — the previous version awaited mark-read
    // and refresh before window.location.href fired, which made the
    // tap feel dead for ~500–1000ms (Ali's "click seems weak" report).
    // Fire-and-forget the mark-read in the background; the destination
    // page re-fetches notifications anyway and picks up the read state.
    if (!n.readAt) {
      void markNotifReadAction(n.id).then(() => refresh()).catch(() => {});
    }
    if (n.href) {
      // Use router.push when the href is a same-origin SPA path so we
      // get instant client-side navigation; fall back to a full reload
      // for anything external or hash-only.
      const sameOrigin = n.href.startsWith("/") && !n.href.startsWith("//");
      if (sameOrigin) {
        setOpen(false);
        // Native navigation here instead of router because the panel
        // is rendered into a portal and we want the destination to be
        // a fresh fetch (positions/market detail need server-fresh
        // data, not a cached client transition).
        window.location.href = n.href;
      } else {
        window.location.href = n.href;
      }
    } else {
      setOpen(false);
    }
  };

  const handleDismiss = async (e: React.MouseEvent | React.KeyboardEvent, id: string) => {
    e.stopPropagation();
    await dismissNotifAction(id);
    await refresh();
  };

  const handleMarkAll = async () => {
    if (items.length === 0) return;
    await markAllReadAction();
    await refresh();
  };

  const handleClearAll = async () => {
    if (items.length === 0) return;
    await dismissAllAction();
    await refresh();
  };

  return (
    <div ref={ref} className="relative z-10">
      <button
        type="button"
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
        aria-expanded={open ? "true" : "false"}
        onClick={() => setOpen((v) => !v)}
        data-unread={unread}
        className={cn(
          "relative inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors",
          open ? "bg-bg-overlay/60 text-text" : "text-text-subtle hover:text-text hover:bg-bg-overlay/40",
        )}
      >
        <I.bell s={20} />
        {unread > 0 && (
          <span
            aria-hidden
            className="notif-badge-pulse"
            style={{
              position: "absolute",
              top: 15,
              right: 6,
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              background: "var(--no-500)",
              border: "2px solid var(--bg-base)",
              boxShadow: "0 0 6px var(--no-500)",
              zIndex: 20,
              pointerEvents: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 700,
              color: "var(--text-on-brand)",
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
            className="fixed inset-0 z-[60] bg-black/45 backdrop-blur-md"
            onClick={() => setOpen(false)}
          />
          <div
            ref={dialogRef}
            role="dialog"
            aria-label="Notifications"
            className={cn(
              "fixed left-3 right-3 top-[calc(env(safe-area-inset-top)+72px)] z-[61] rounded-xl border border-border-strong bg-bg-elevated/85 backdrop-blur-xl overflow-hidden shadow-[0_24px_64px_-16px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)] flex flex-col",
              "max-h-[calc(100dvh-env(safe-area-inset-top)-72px-env(safe-area-inset-bottom)-72px)]",
              "sm:left-auto sm:right-4 sm:top-[64px] sm:w-[380px] sm:max-w-[calc(100vw-24px)] sm:max-h-[480px]",
            )}
            style={{ animation: "np-rise 180ms cubic-bezier(.2,.8,.2,1)" }}
          >
            <div className="flex items-center justify-between border-b border-border bg-transparent px-3 shrink-0" style={{ height: 44 }}>
              <p className="font-mono text-micro font-bold uppercase tracking-[0.18em] text-text min-w-0 truncate">
                Notifications
              </p>
              <div className="flex items-center shrink-0">
                {items.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={handleMarkAll}
                      className="h-7 px-1.5 rounded-md font-mono text-[9.5px] font-bold uppercase tracking-[0.10em] text-text-subtle hover:text-text hover:bg-bg-overlay transition-colors whitespace-nowrap"
                    >
                      Read all
                    </button>
                    <span className="text-border text-[9px] mx-0.5">|</span>
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="h-7 px-1.5 rounded-md font-mono text-[9.5px] font-bold uppercase tracking-[0.10em] text-text-subtle hover:text-no-300 hover:bg-bg-overlay transition-colors whitespace-nowrap"
                    >
                      Clear all
                    </button>
                  </>
                )}
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setOpen(false)}
                  className="ml-0.5 h-7 w-7 inline-flex items-center justify-center rounded-md text-text-subtle hover:text-text hover:bg-bg-overlay transition-colors"
                >
                  <I.x s={13} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain bg-transparent">
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
                      className="shrink-0 inline-flex items-center justify-center border"
                      style={{
                        width: 30, height: 30,
                        borderRadius: "var(--r-sm)",
                        background: "var(--bg-inset)",
                        borderColor: "var(--border)",
                      }}
                    >
                      <Icon s={16} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-display text-body-sm font-semibold text-text truncate leading-tight">
                          {n.titleEn}
                        </p>
                        {isUnread && (
                          <span aria-hidden className="h-1.5 w-1.5 rounded-pill bg-gold-500 shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="mt-0.5 text-label text-text-muted leading-snug">
                        {n.bodyEn}
                      </p>
                      <div className="mt-1 flex items-center justify-between">
                        <p className="text-[10.5px] italic text-text-subtle">{n.titleSw}</p>
                        <span className="font-mono text-[10.5px] tabular-nums text-text-subtle">
                          {relTime(n.createdAt)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label="Dismiss notification"
                      onClick={(e) => { e.stopPropagation(); handleDismiss(e, n.id); }}
                      className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-md text-text-subtle hover:text-text hover:bg-bg-overlay transition-colors"
                    >
                      <I.x s={13} />
                    </button>
                  </button>
                );
              })}
              {items.length === 0 && (
                <div className="px-4 py-10 text-center">
                  {/* Inline line-art bell — kit-faithful, royal-indigo
                      stroke with a gilt accent on the clapper. Matches
                      the EmptyState atom's illustrative voice without
                      pulling the whole component (the panel is a tight
                      surface; a 56 px square would crowd it). */}
                  <svg
                    aria-hidden
                    width="44"
                    height="44"
                    viewBox="0 0 56 56"
                    className="mx-auto mb-3 text-teal-300"
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
                    No notifications yet
                  </p>
                  <p className="mt-0.5 text-caption italic text-text-subtle">
                    Huna taarifa zozote kwa sasa
                  </p>
                  <p className="mt-2 text-label text-text-muted leading-relaxed">
                    We&apos;ll buzz here when a bet settles or a market resolves.
                  </p>
                  <p className="mt-0.5 text-label italic text-text-subtle leading-relaxed">
                    Tutakujulisha hapa pale bet itakapomalizika au soko litakapofungwa.
                  </p>
                </div>
              )}
            </div>
          </div>
          <style>{`
            @keyframes np-rise { from { transform: translateY(-6px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            @keyframes notif-badge-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.25); } }
            .notif-badge-pulse { animation: notif-badge-pulse 2s ease-in-out infinite; }
            @media (prefers-reduced-motion: reduce) { .notif-badge-pulse { animation: none; } }
          `}</style>
        </>,
        document.body,
      )}
    </div>
  );
}
