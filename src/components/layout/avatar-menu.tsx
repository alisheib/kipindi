"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { User, Wallet, Receipt, ShieldCheck, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export function AvatarMenu({
  initials,
  name,
  phone,
  isAuthed = false,
}: {
  initials: string;
  name: string;
  phone: string;
  isAuthed?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
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

  if (!isAuthed) {
    return (
      <Link href="/auth/login" className="ml-1">
        <Avatar initials={initials} size="md" color="var(--bg-sunken)" />
      </Link>
    );
  }

  return (
    <div ref={ref} className="relative ml-1">
      <button
        type="button"
        aria-label="Account menu"
        aria-expanded={open ? "true" : "false"}
        onClick={() => setOpen((v) => !v)}
        className="rounded-pill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
      >
        <Avatar initials={initials} size="md" />
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <>
          <div aria-hidden className="fixed inset-0 z-popover bg-bg-overlay/40" onClick={() => setOpen(false)} />
          <div
            ref={menuRef}
            role="menu"
            className="fixed left-3 right-3 top-[calc(env(safe-area-inset-top)+72px)] sm:left-auto sm:right-4 sm:top-[64px] sm:w-[260px] sm:max-w-[calc(100vw-24px)] max-h-[calc(100dvh-env(safe-area-inset-top)-72px-env(safe-area-inset-bottom)-72px)] sm:max-h-[calc(100dvh-100px)] overflow-y-auto rounded-xl border-2 border-border-strong bg-bg-elevated shadow-e5 z-popover kp-slide-up"
          >
            <div className="px-3 py-3 border-b border-border-divider flex items-center gap-2.5">
              <Avatar initials={initials} size="md" />
              <div className="min-w-0">
                <p className="text-label font-bold text-text truncate">{name}</p>
                <p className="text-micro text-text-tertiary tabular font-mono truncate">{phone}</p>
              </div>
            </div>
            <ul className="py-1">
              <Item href="/profile"        icon={User}        label="Profile · Wasifu" />
              <Item href="/wallet"         icon={Wallet}      label="Wallet · Pochi" />
              <Item href="/bets"           icon={Receipt}     label="My bets · Madau" />
              <Item href="/profile/kyc"    icon={ShieldCheck} label="Verify identity · KYC" />
            </ul>
            <div className="border-t border-border-divider">
              <a
                href="/auth/logout"
                className="flex items-center gap-2.5 px-3 py-2.5 text-label font-bold text-danger hover:bg-danger-bg/30 transition-colors duration-micro"
              >
                <LogOut size={16} strokeWidth={1.75} />
                Sign out · Toka
              </a>
            </div>
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}

function Item({ href, icon: Icon, label }: { href: string; icon: typeof User; label: string }) {
  return (
    <li>
      <Link
        href={href}
        className={cn(
          "flex items-center gap-2.5 px-3 py-2.5 text-label font-medium text-text hover:bg-surface-hover transition-colors duration-micro",
        )}
      >
        <Icon size={16} strokeWidth={1.75} className="text-text-tertiary" />
        {label}
      </Link>
    </li>
  );
}
