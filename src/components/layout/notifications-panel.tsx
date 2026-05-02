"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Trophy, Coins, ShieldCheck, ArrowDownToLine, ArrowUpFromLine, Activity, X } from "lucide-react";
import { cn, formatTzs } from "@/lib/utils";

type Notif = {
  id: string;
  kind: "win" | "deposit" | "withdraw" | "kyc" | "round" | "match";
  titleEn: string; titleSw: string;
  bodyEn: string; bodySw: string;
  amount?: number;
  ts: string;
  unread?: boolean;
};

const NOTIFS: Notif[] = [
  { id: "n1", kind: "win",      titleEn: "The 15–30 paid",         titleSw: "Kipindi 15–30 kimelipa",        bodyEn: "Return TZS 2,400 ready in your wallet.", bodySw: "Pato TZS 2,400 liko tayari.", amount: 2_400,  ts: "2m", unread: true },
  { id: "n2", kind: "round",    titleEn: "Mapigo round #84",       titleSw: "Raundi ya Mapigo #84",          bodyEn: "SPIKE paid · ×2.40 · TZS 2,400.",        bodySw: "Mwiba umelipa · ×2.40 · TZS 2,400.", amount: 2_400, ts: "3m", unread: true },
  { id: "n3", kind: "deposit",  titleEn: "Deposit confirmed",      titleSw: "Amana imepokelewa",            bodyEn: "M-Pesa · Ref D-88210.",                  bodySw: "M-Pesa · Kumb. D-88210.",              amount: 10_000, ts: "1h", unread: true },
  { id: "n4", kind: "kyc",      titleEn: "KYC review in progress", titleSw: "Ukaguzi wa NIDA unaendelea",   bodyEn: "We will notify you when verified.",      bodySw: "Tutakujulisha imethibitishwa.",        ts: "3h" },
  { id: "n5", kind: "match",    titleEn: "Sim-Yang starts in 1h",  titleSw: "Sim-Yang inaanza saa 1",       bodyEn: "Pick a window before kickoff.",          bodySw: "Chagua kipindi kabla mechi haijaanza.", ts: "4h" },
  { id: "n6", kind: "withdraw", titleEn: "Withdrawal under review",titleSw: "Uondoaji unakaguliwa",         bodyEn: "AML review · 2h ETA.",                   bodySw: "Ukaguzi wa AML · saa 2.",              amount: -3_000, ts: "5h" },
];

const iconFor = (k: Notif["kind"]) => {
  switch (k) {
    case "win":      return Trophy;
    case "deposit":  return ArrowDownToLine;
    case "withdraw": return ArrowUpFromLine;
    case "kyc":      return ShieldCheck;
    case "round":    return Activity;
    case "match":    return Coins;
  }
};
const tintFor = (k: Notif["kind"]) => {
  switch (k) {
    case "win":      return "text-gold bg-gold-subtle border-gold-subtleHover";
    case "round":    return "text-gold bg-gold-subtle border-gold-subtleHover";
    case "deposit":  return "text-royal bg-royal-subtle border-royal-subtleHover";
    case "withdraw": return "text-warning bg-warning-bg border-warning-border";
    case "kyc":      return "text-info bg-info-bg border-info-border";
    case "match":    return "text-text-secondary bg-bg-sunken border-border-subtle";
  }
};

export function NotificationsPanel() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unreadCount = NOTIFS.filter((n) => n.unread).length;

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <div ref={ref} className="relative">
        <button
          type="button"
          aria-label="Notifications"
          aria-expanded={open ? "true" : "false"}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "relative inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors duration-micro",
            open ? "bg-surface-pressed text-text" : "text-text-tertiary hover:text-text hover:bg-surface-hover",
          )}
        >
          <Bell size={17} strokeWidth={1.75} />
          {unreadCount > 0 && (
            <span aria-hidden className="absolute top-1 right-1 inline-flex">
              <span className="absolute h-2 w-2 rounded-pill bg-gold kp-ping" />
              <span className="h-1.5 w-1.5 rounded-pill bg-gold" />
            </span>
          )}
        </button>

        {open && (
          <>
            {/* Backdrop scrim — kills the "transparent overlap" issue */}
            <div
              aria-hidden
              className="fixed inset-0 z-popover bg-bg-overlay backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <div
              role="dialog"
              aria-label="Notifications"
              className="absolute right-0 top-[calc(100%+8px)] w-[360px] max-w-[calc(100vw-24px)] rounded-xl border-2 border-border-strong bg-bg-elevated shadow-e5 overflow-hidden z-popover kp-slide-up"
            >
              <div className="flex items-center justify-between h-11 px-3 border-b border-border-divider bg-bg-elevated">
                <p className="font-display text-label font-bold uppercase tracking-[0.16em] text-text">Notifications · Arifa</p>
                <div className="flex items-center gap-1">
                  <button type="button" className="text-micro font-bold uppercase tracking-[0.14em] text-text-tertiary hover:text-text transition-colors duration-micro h-7 px-2 rounded-sm hover:bg-surface-hover">
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
              <div className="max-h-[420px] overflow-y-auto divide-y divide-border-subtle bg-bg-elevated">
                {NOTIFS.map((n) => {
                  const Icon = iconFor(n.kind);
                  return (
                    <div key={n.id} className={cn("flex items-start gap-3 px-3 py-2.5 hover:bg-surface-hover transition-colors duration-micro cursor-pointer", n.unread && "bg-bg-sunken/50")}>
                      <div className={cn("h-9 w-9 rounded-md inline-flex items-center justify-center shrink-0 border", tintFor(n.kind))}>
                        <Icon size={16} strokeWidth={1.75} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-label font-bold text-text truncate">{n.titleEn}</p>
                          {n.unread && <span aria-hidden className="h-1.5 w-1.5 rounded-pill bg-gold shrink-0 mt-1" />}
                        </div>
                        <p className="text-caption text-text-secondary leading-snug">{n.bodyEn}</p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-micro text-text-tertiary italic">{n.titleSw}</p>
                          <span className="text-micro text-text-tertiary tabular font-mono">{n.ts} ago</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="h-10 px-3 flex items-center justify-center border-t border-border-divider bg-bg-elevated">
                <button type="button" className="text-label font-bold uppercase tracking-[0.14em] text-royal hover:text-royal-hover transition-colors duration-micro">
                  View all · Ona zote
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
