"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Bell, Trophy, Coins, ShieldCheck, ArrowDownToLine, ArrowUpFromLine, Activity, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchMyNotifications, markNotifReadAction, markAllReadAction, dismissNotifAction } from "@/app/_actions/notifications";
import type { StoredNotification } from "@/lib/server/store";

const STATIC_FALLBACK: StoredNotification[] = [
  {
    id: "demo-n1",
    userId: "guest",
    kind: "WIN",
    titleEn: "The 15–30 paid",
    titleSw: "50pick 15–30 kimelipa",
    bodyEn: "Return TZS 2,400 ready in your wallet.",
    bodySw: "Pato TZS 2,400 liko tayari.",
    href: "/wallet",
    readAt: null,
    dismissedAt: null,
    createdAt: new Date(Date.now() - 2 * 60_000).toISOString(),
  },
  {
    id: "demo-n2",
    userId: "guest",
    kind: "MATCH_START",
    titleEn: "Sim-Yang starts in 1h",
    titleSw: "Sim-Yang inaanza saa 1",
    bodyEn: "Pick a window before kickoff.",
    bodySw: "Chagua kipindi kabla mechi haijaanza.",
    href: "/live",
    readAt: null,
    dismissedAt: null,
    createdAt: new Date(Date.now() - 3 * 3600_000).toISOString(),
  },
];

const iconFor = (k: StoredNotification["kind"]) => {
  switch (k) {
    case "WIN":          return Trophy;
    case "DEPOSIT":      return ArrowDownToLine;
    case "WITHDRAW":     return ArrowUpFromLine;
    case "KYC":          return ShieldCheck;
    case "ROUND_RESULT": return Activity;
    case "MATCH_START":  return Coins;
    case "RG":           return ShieldCheck;
    case "SECURITY":     return ShieldCheck;
  }
};

/** Kit-tinted swatch per notification kind (OKLCH-tuned for dark + light). */
const tintFor = (k: StoredNotification["kind"]) => {
  switch (k) {
    case "WIN":          return "border-gold-700 bg-gold-500/10 text-gold-300";
    case "ROUND_RESULT": return "border-gold-700 bg-gold-500/10 text-gold-300";
    case "DEPOSIT":      return "border-yes-700 bg-yes-500/10 text-yes-300";
    case "WITHDRAW":     return "border-warning-border bg-warning-bg/30 text-warning-fg";
    case "KYC":          return "border-info-border bg-info-bg/30 text-info-fg";
    case "RG":           return "border-info-border bg-info-bg/30 text-info-fg";
    case "SECURITY":     return "border-no-700 bg-no-500/10 text-no-300";
    case "MATCH_START":  return "border-border bg-bg-overlay text-text-muted";
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
  const [items, setItems] = useState<StoredNotification[]>(STATIC_FALLBACK);
  const [unread, setUnread] = useState(STATIC_FALLBACK.filter((n) => !n.readAt).length);
  const ref = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    const r = await fetchMyNotifications();
    if (r.items.length > 0) {
      setItems(r.items);
      setUnread(r.unread);
    } else {
      setItems(STATIC_FALLBACK);
      setUnread(STATIC_FALLBACK.filter((n) => !n.readAt).length);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (dialogRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleClick = async (n: StoredNotification) => {
    if (n.id.startsWith("demo-")) return;
    if (!n.readAt) {
      await markNotifReadAction(n.id);
      await refresh();
    }
    if (n.href) window.location.href = n.href;
  };

  const handleDismiss = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (id.startsWith("demo-")) return;
    await dismissNotifAction(id);
    await refresh();
  };

  const handleMarkAll = async () => {
    if (items.every((n) => n.id.startsWith("demo-"))) return;
    await markAllReadAction();
    await refresh();
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
        aria-expanded={open ? "true" : "false"}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors",
          open ? "bg-bg-overlay text-text" : "text-text-subtle hover:text-text hover:bg-bg-overlay",
        )}
      >
        <Bell size={16} strokeWidth={1.75} />
        {unread > 0 && (
          <span aria-hidden className="absolute right-1.5 top-1.5 inline-flex">
            <span className="absolute h-2 w-2 rounded-pill bg-gold-500 opacity-75 animate-ping" />
            <span className="h-1.5 w-1.5 rounded-pill bg-gold-500" />
          </span>
        )}
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <>
          <div
            aria-hidden
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div
            ref={dialogRef}
            role="dialog"
            aria-label="Notifications"
            className={cn(
              "fixed left-3 right-3 top-[calc(env(safe-area-inset-top)+72px)] z-[61] rounded-xl border border-border bg-bg-elevated overflow-hidden shadow-[0_24px_64px_-16px_rgba(0,0,0,0.55)] flex flex-col",
              "max-h-[calc(100dvh-env(safe-area-inset-top)-72px-env(safe-area-inset-bottom)-72px)]",
              "sm:left-auto sm:right-4 sm:top-[64px] sm:w-[380px] sm:max-w-[calc(100vw-24px)] sm:max-h-[480px]",
            )}
            style={{ animation: "np-rise 180ms cubic-bezier(.2,.8,.2,1)" }}
          >
            <div className="flex h-11 items-center justify-between border-b border-border bg-bg-elevated px-3 shrink-0">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-text">
                Notifications · Arifa
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleMarkAll}
                  className="h-7 px-2 rounded-md font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-text-subtle hover:text-text hover:bg-bg-overlay transition-colors"
                >
                  Mark all
                </button>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setOpen(false)}
                  className="h-7 w-7 inline-flex items-center justify-center rounded-md text-text-subtle hover:text-text hover:bg-bg-overlay transition-colors"
                >
                  <X size={14} strokeWidth={2} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain bg-bg-elevated">
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
                    <span className={cn(
                      "h-9 w-9 rounded-md inline-flex items-center justify-center shrink-0 border",
                      tintFor(n.kind),
                    )}>
                      <Icon size={15} strokeWidth={1.75} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-display text-[13px] font-semibold text-text truncate leading-tight">
                          {n.titleEn}
                        </p>
                        {isUnread && (
                          <span aria-hidden className="h-1.5 w-1.5 rounded-pill bg-gold-500 shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="mt-0.5 text-[12px] text-text-muted leading-snug">
                        {n.bodyEn}
                      </p>
                      <div className="mt-1 flex items-center justify-between">
                        <p className="text-[10.5px] italic text-text-subtle">{n.titleSw}</p>
                        <span className="font-mono text-[10.5px] tabular-nums text-text-subtle">
                          {relTime(n.createdAt)}
                        </span>
                      </div>
                    </div>
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label="Dismiss"
                      onClick={(e) => handleDismiss(e, n.id)}
                      className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-md text-text-subtle hover:text-text hover:bg-bg-overlay transition-colors"
                    >
                      <X size={12} />
                    </span>
                  </button>
                );
              })}
              {items.length === 0 && (
                <p className="px-3 py-10 text-center text-[12px] text-text-subtle">
                  No notifications yet.
                </p>
              )}
            </div>
          </div>
          <style>{`
            @keyframes np-rise { from { transform: translateY(-6px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          `}</style>
        </>,
        document.body,
      )}
    </div>
  );
}
