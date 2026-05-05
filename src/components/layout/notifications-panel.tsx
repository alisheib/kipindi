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
const tintFor = (k: StoredNotification["kind"]) => {
  switch (k) {
    case "WIN":          return "text-gold bg-gold-subtle border-gold-subtleHover";
    case "ROUND_RESULT": return "text-gold bg-gold-subtle border-gold-subtleHover";
    case "DEPOSIT":      return "text-royal bg-royal-subtle border-royal-subtleHover";
    case "WITHDRAW":     return "text-warning bg-warning-bg border-warning-border";
    case "KYC":          return "text-info bg-info-bg border-info-border";
    case "RG":           return "text-info bg-info-bg border-info-border";
    case "SECURITY":     return "text-danger bg-danger-bg border-danger-border";
    case "MATCH_START":  return "text-text-secondary bg-bg-sunken border-border-subtle";
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
      // No real notifications — stay with static fallback for the marketing landing
      setItems(STATIC_FALLBACK);
      setUnread(STATIC_FALLBACK.filter((n) => !n.readAt).length);
    }
  }, []);

  // Initial fetch + poll every 30s while panel is potentially relevant
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
          "relative inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors duration-micro",
          open ? "bg-surface-pressed text-text" : "text-text-tertiary hover:text-text hover:bg-surface-hover",
        )}
      >
        <Bell size={17} strokeWidth={1.75} />
        {unread > 0 && (
          <span aria-hidden className="absolute top-1 right-1 inline-flex">
            <span className="absolute h-2 w-2 rounded-pill bg-gold kp-ping" />
            <span className="h-1.5 w-1.5 rounded-pill bg-gold" />
          </span>
        )}
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <>
          <div
            aria-hidden
            className="fixed inset-0 z-popover bg-bg-overlay backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div
            ref={dialogRef}
            role="dialog"
            aria-label="Notifications"
            className={cn(
              // Portal'd at document.body so `fixed` is viewport-relative even
              // though the bell lives inside a backdrop-filter parent.
              "fixed left-3 right-3 top-[calc(env(safe-area-inset-top)+72px)] z-popover rounded-xl border-2 border-border-strong bg-bg-elevated shadow-e5 overflow-hidden kp-slide-up flex flex-col",
              "max-h-[calc(100dvh-env(safe-area-inset-top)-72px-env(safe-area-inset-bottom)-72px)]",
              // Desktop: anchor near the bell (top-right of viewport).
              "sm:left-auto sm:right-4 sm:top-[64px] sm:w-[360px] sm:max-w-[calc(100vw-24px)] sm:max-h-[480px]",
            )}
          >
            <div className="flex items-center justify-between h-11 px-3 border-b border-border-divider bg-bg-elevated shrink-0">
              <p className="font-display text-label font-bold uppercase tracking-[0.16em] text-text">Notifications · Arifa</p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleMarkAll}
                  className="text-micro font-bold uppercase tracking-[0.14em] text-text-tertiary hover:text-text transition-colors duration-micro h-7 px-2 rounded-sm hover:bg-surface-hover"
                >
                  Mark all
                </button>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setOpen(false)}
                  className="h-7 w-7 inline-flex items-center justify-center rounded-sm text-text-tertiary hover:text-text hover:bg-surface-hover"
                >
                  <X size={14} strokeWidth={2} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain divide-y divide-border-subtle bg-bg-elevated">
              {items.map((n) => {
                const Icon = iconFor(n.kind);
                const isUnread = !n.readAt;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleClick(n)}
                    className={cn(
                      "w-full text-left flex items-start gap-3 px-3 py-2.5 hover:bg-surface-hover transition-colors duration-micro",
                      isUnread && "bg-bg-sunken/50",
                    )}
                  >
                    <div className={cn("h-9 w-9 rounded-md inline-flex items-center justify-center shrink-0 border", tintFor(n.kind))}>
                      <Icon size={16} strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-label font-bold text-text truncate">{n.titleEn}</p>
                        {isUnread && <span aria-hidden className="h-1.5 w-1.5 rounded-pill bg-gold shrink-0 mt-1" />}
                      </div>
                      <p className="text-caption text-text-secondary leading-snug">{n.bodyEn}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-micro text-text-tertiary italic">{n.titleSw}</p>
                        <span className="text-micro text-text-tertiary tabular font-mono">{relTime(n.createdAt)}</span>
                      </div>
                    </div>
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label="Dismiss"
                      onClick={(e) => handleDismiss(e, n.id)}
                      className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-sm text-text-tertiary hover:text-text hover:bg-surface-hover"
                    >
                      <X size={12} />
                    </span>
                  </button>
                );
              })}
              {items.length === 0 && (
                <p className="px-3 py-8 text-center text-caption text-text-tertiary">No notifications yet.</p>
              )}
            </div>
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}
