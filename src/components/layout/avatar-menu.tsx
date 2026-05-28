"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { User, Wallet, Receipt, ShieldCheck, LogOut } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function AvatarMenu({
  initials,
  name,
  phone,
  isAuthed = false,
  avatarSrc = null,
  seed,
}: {
  initials: string;
  name: string;
  phone: string;
  isAuthed?: boolean;
  avatarSrc?: string | null;
  seed?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { t, locale } = useT();
  // Locale-aware labels — most of the app is bilingual-always, but the
  // top-bar auth CTAs are chrome the toggle should genuinely flip.
  const SIGN_UP_LABEL = locale === "sw" ? "Jisajili" : locale === "fr" ? "Inscription" : "Sign up";
  const ACCOUNT_LABEL = locale === "sw" ? "Akaunti" : locale === "fr" ? "Compte" : "Create account";

  useEffect(() => {
    if (!open) return;
    // Use `click` (not `mousedown`) so that controls inside the menu —
    // including a ConfirmDialog rendered into its own portal *above*
    // this menu — get to run their own onClick before we tear the menu
    // (and any child component state) down. With `mousedown` the menu
    // unmounted between the user pressing and releasing on the
    // ConfirmDialog's "Yes, sign out" button, so the navigation never
    // fired. Also ignore any click whose target sits inside a higher-z
    // dialog (`role="dialog"` / `role="alertdialog"`) for the same
    // reason.
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (ref.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
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

  if (!isAuthed) {
    // Kit-faithful pair: ghost + gold, both `btn btn-sm` so the height
    // and typography match the kit (the rest of the app uses these
    // exact classes — see ConvictionDial CTA, ConfirmDialog footer,
    // SellConfirmModal, etc). Pill radius keeps the rounded shape the
    // top-bar expected.
    return (
      <div className="ml-1 flex items-center gap-1.5">
        <Link
          href="/auth/login"
          className="btn btn-ghost btn-sm hidden sm:inline-flex"
          style={{ borderRadius: 999 }}
          aria-label={t.common.signIn}
        >
          {t.common.signIn}
        </Link>
        <Link
          href="/auth/register"
          className="btn btn-gold btn-sm"
          style={{ borderRadius: 999 }}
          aria-label={ACCOUNT_LABEL}
        >
          {SIGN_UP_LABEL}
        </Link>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative ml-1">
      <button
        type="button"
        aria-label="Account menu"
        aria-expanded={open ? "true" : "false"}
        onClick={() => setOpen((v) => !v)}
        className="rounded-pill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base"
      >
        <Avatar initials={initials} size="md" seed={seed ?? initials} src={avatarSrc ?? undefined} />
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <>
          <div aria-hidden className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div
            ref={menuRef}
            role="menu"
            className="fixed left-3 right-3 top-[calc(env(safe-area-inset-top)+72px)] sm:left-auto sm:right-4 sm:top-[64px] sm:w-[280px] sm:max-w-[calc(100vw-24px)] max-h-[calc(100dvh-env(safe-area-inset-top)-72px-env(safe-area-inset-bottom)-72px)] sm:max-h-[calc(100dvh-100px)] overflow-y-auto rounded-xl border border-border bg-bg-elevated shadow-[0_24px_48px_-16px_rgba(0,0,0,0.55)] z-[61]"
          >
            <div className="px-3.5 py-3 border-b border-border flex items-center gap-3">
              <Avatar initials={initials} size="md" seed={seed ?? initials} src={avatarSrc ?? undefined} />
              <div className="min-w-0">
                <p className="font-display text-[13.5px] font-semibold text-text truncate leading-tight">{name}</p>
                <p className="mt-0.5 font-mono text-caption text-text-subtle tabular-nums truncate">{phone}</p>
              </div>
            </div>
            <ul className="py-1">
              <Item href="/profile"        icon={User}        label="Profile"      sw="Wasifu" />
              <Item href="/wallet"         icon={Wallet}      label="Wallet"       sw="Pochi" />
              <Item href="/positions"      icon={Receipt}     label="Positions"    sw="Madau" />
              <Item href="/profile/kyc"    icon={ShieldCheck} label="Verify ID"    sw="Thibitisha" />
            </ul>
            <div className="border-t border-border">
              <ConfirmDialog
                tone="claret"
                title="Sign out · Toka"
                body={
                  <>
                    <p>You will be signed out of this device.</p>
                    <p className="text-text-subtle italic text-[12.5px] mt-1">
                      Utatoka kwenye akaunti yako kwenye kifaa hiki.
                    </p>
                  </>
                }
                confirmLabel="Yes, sign out"
                cancelLabel="Stay signed in"
                onConfirm={() => { window.location.href = "/auth/logout"; }}
                trigger={
                  <button
                    type="button"
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 font-display text-body-sm font-semibold text-no-300 hover:bg-no-500/10 transition-colors text-left"
                  >
                    <LogOut size={15} strokeWidth={1.75} aria-hidden />
                    Sign out · Toka
                  </button>
                }
              />
            </div>
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}

function Item({ href, icon: Icon, label, sw }: { href: string; icon: typeof User; label: string; sw: string }) {
  return (
    <li>
      <Link
        href={href as never}
        className={cn(
          "flex items-center gap-2.5 px-3.5 py-2.5 font-display text-body-sm font-medium text-text hover:bg-bg-overlay transition-colors",
        )}
      >
        <Icon size={15} strokeWidth={1.75} className="text-text-subtle" />
        {label}
        <span className="text-text-subtle italic font-normal text-label">· {sw}</span>
      </Link>
    </li>
  );
}
