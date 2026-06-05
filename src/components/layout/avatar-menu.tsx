"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { I } from "@/components/ui/glyphs";
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
  const pathname = usePathname();
  // Close menu on navigation so the portal + scrim don't persist.
  useEffect(() => { setOpen(false); }, [pathname]);
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
        style={{
          width: 34,
          height: 34,
          borderRadius: 999,
          border: "1.5px solid var(--brand-500)",
          padding: 0,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, var(--bg-elevated2), var(--bg-inset))",
        }}
      >
        <Avatar initials={initials} size="sm" seed={seed ?? initials} src={avatarSrc ?? undefined} />
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <>
          <div aria-hidden className="fixed inset-0 z-[60] bg-black/45 backdrop-blur-md" onClick={() => setOpen(false)} />
          <div
            ref={menuRef}
            role="menu"
            className="fixed left-3 right-3 top-[calc(env(safe-area-inset-top)+72px)] sm:left-auto sm:right-4 sm:top-[64px] sm:w-[280px] sm:max-w-[calc(100vw-24px)] max-h-[calc(100dvh-env(safe-area-inset-top)-72px-env(safe-area-inset-bottom)-72px)] sm:max-h-[calc(100dvh-100px)] overflow-y-auto rounded-xl border border-border-strong bg-bg-elevated/85 backdrop-blur-xl shadow-[0_24px_48px_-16px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)] z-[61]"
            style={{ animation: "am-rise 180ms cubic-bezier(.2,.8,.2,1)" }}
          >
            <div className="px-3.5 py-3 border-b border-border flex items-center gap-3">
              <Avatar initials={initials} size="md" seed={seed ?? initials} src={avatarSrc ?? undefined} />
              <div className="min-w-0">
                <p className="font-display text-[13.5px] font-semibold text-text truncate leading-tight">{name}</p>
                <p className="mt-0.5 font-mono text-caption text-text-subtle tabular-nums truncate">{phone}</p>
              </div>
            </div>
            <ul className="py-1">
              <Item href="/profile"        icon={I.profile}      label="Profile"      sw="Wasifu" />
              <Item href="/wallet"         icon={I.wallet}       label="Wallet"       sw="Pochi" />
              <Item href="/profile/invite" icon={I.gift}         label="Invite & Earn" sw="Alika upate" accent />
              <Item href="/proposals"      icon={I.trophy}       label="Propose & earn" sw="Pendekeza" accent />
              <Item href="/positions"      icon={I.receipt}      label="Positions"    sw="Madau" />
              <Item href="/profile/kyc"    icon={I.shieldcheck}  label="Verify ID"    sw="Thibitisha" />
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
                    <I.logOut s={15} aria-hidden />
                    Sign out · Toka
                  </button>
                }
              />
            </div>
          </div>
          <style>{`
            @keyframes am-rise { from { transform: translateY(-6px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          `}</style>
        </>,
        document.body,
      )}
    </div>
  );
}

function Item({ href, icon: Ico, label, sw, accent }: { href: string; icon: (p: { s?: number; className?: string }) => React.ReactElement; label: string; sw: string; accent?: boolean }) {
  return (
    <li>
      <Link
        href={href as never}
        className={cn(
          "flex items-center gap-2.5 px-3.5 py-2.5 font-display text-body-sm font-medium text-text transition-colors",
          accent ? "hover:bg-gold-500/10" : "hover:bg-bg-overlay",
        )}
      >
        <span className={accent ? "text-gold-300" : "text-text-subtle"}><Ico s={15} /></span>
        {label}
        <span className="text-text-subtle italic font-normal text-label">· {sw}</span>
      </Link>
    </li>
  );
}
