"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { cn } from "@/lib/utils";
import { fetchMyNotifications, markNotifReadAction, markAllReadAction, dismissNotifAction, dismissAllAction } from "@/app/_actions/notifications";
import type { StoredNotification } from "@/lib/server/store";
import { haptics } from "@/lib/haptics";
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
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<StoredNotification[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { t, locale } = useT();
  useEffect(() => { setOpen(false); }, [pathname]);

  const unread = items.filter((n) => !n.readAt).length;

  const prevUnreadRef = useRef(0);
  const refresh = useCallback(async () => {
    const r = await fetchMyNotifications();
    setItems(r.items);
    const clientUnread = r.items.filter((n: StoredNotification) => !n.readAt).length;
    if (clientUnread > prevUnreadRef.current && prevUnreadRef.current >= 0) {
      haptics.success();
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
    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("50pick:refresh-notifications", onRefresh);
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

  const handleClick = (n: StoredNotification) => {
    if (!n.readAt) {
      void markNotifReadAction(n.id).then(() => refresh()).catch(() => {});
    }
    if (n.href) {
      const sameOrigin = n.href.startsWith("/") && !n.href.startsWith("//");
      if (sameOrigin) {
        setOpen(false);
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
        aria-label={`${t.common.notifications}${unread > 0 ? ` (${unread})` : ""}`}
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
            aria-label={t.notif.title}
            className={cn(
              "fixed left-3 right-3 top-[calc(env(safe-area-inset-top)+72px)] z-[61] rounded-xl border border-border-strong bg-bg-elevated/85 backdrop-blur-xl overflow-hidden shadow-[0_24px_64px_-16px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)] flex flex-col",
              "max-h-[calc(100dvh-env(safe-area-inset-top)-72px-env(safe-area-inset-bottom)-72px)]",
              "sm:left-auto sm:right-4 sm:top-[64px] sm:w-[380px] sm:max-w-[calc(100vw-24px)] sm:max-h-[480px]",
            )}
            style={{ animation: "np-rise 180ms cubic-bezier(.2,.8,.2,1)" }}
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
                          {relTime(n.createdAt)}
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
                <div className="px-4 py-10 text-center">
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
                    {t.notif.noNotifications}
                  </p>
                  <p className="mt-2 text-label text-text-muted leading-relaxed">
                    {t.notif.noNotificationsHint}
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
