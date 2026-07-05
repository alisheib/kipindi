"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { I } from "@/components/ui/glyphs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useT, type Locale } from "@/lib/i18n";
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

  useEffect(() => {
    if (!open) return;
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
    return (
      <div className="ml-1 flex items-center gap-1.5">
        <Link
          href="/auth/login"
          className="btn btn-ghost btn-sm btn-pill hidden sm:inline-flex"
          aria-label={t.common.signIn}
        >
          {t.common.signIn}
        </Link>
        <Link
          href="/auth/register"
          className="btn btn-gold btn-sm btn-pill"
          aria-label={t.common.createAccount}
        >
          {t.common.signUp}
        </Link>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative ml-1">
      <button
        type="button"
        aria-label={t.common.accountMenu}
        aria-expanded={open ? "true" : "false"}
        onClick={() => setOpen((v) => !v)}
        className="rounded-pill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base"
        style={{
          width: 40,
          height: 40,
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
            className="fixed left-3 right-3 top-[calc(env(safe-area-inset-top)+72px)] sm:left-auto sm:right-4 sm:top-[64px] sm:w-[280px] sm:max-w-[calc(100vw-24px)] max-h-[calc(100dvh-env(safe-area-inset-top)-72px-env(safe-area-inset-bottom)-72px)] sm:max-h-[calc(100dvh-100px)] overflow-y-auto overscroll-contain rounded-xl border border-border-strong bg-bg-elevated/85 backdrop-blur-xl shadow-[0_24px_48px_-16px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)] z-[61]"
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
              <Item href="/profile"        icon={I.profile}      en="Profile"        sw="Wasifu"                       zh="个人资料" />
              <Item href="/wallet"         icon={I.wallet}       en="Wallet"         sw="Pochi"                        zh="钱包" />
              <Item href="/profile/invite" icon={I.gift}         en="Invite & Earn"  sw="Alika na upate zawadi"        zh="邀请赚钱" accent />
              <Item href="/proposals"      icon={I.sparkle}      en="Propose & earn" sw="Pendekeza na upate zawadi"    zh="提议赚钱" accent />
              <Item href="/positions"      icon={I.portfolio}    en="Positions"      sw="Nafasi"                       zh="持仓" />
              <Item href="/results"        icon={I.resolved}     en="Results"        sw="Matokeo"                      zh="结果" />
              <Item href="/leaderboard"    icon={I.crown}        en="Leaderboard"    sw="Jedwali la Washindi"          zh="排行榜" />
              <Item href="/profile/kyc"    icon={I.shieldcheck}  en="Verify ID"      sw="Kuthibitisha kitambulisho"    zh="身份验证" />
            </ul>
            {/* Language toggle — visible only on mobile (desktop has the top-bar toggle) */}
            <div className="border-t border-border px-3.5 py-2.5 sm:hidden">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-text-subtle mb-1.5">{t.common.language}</p>
              <MobileLangPicker locale={locale} />
            </div>
            <div className="border-t border-border">
              <ConfirmDialog
                tone="claret"
                title={t.profile.signOutConfirmTitle}
                body={<p>{t.profile.signOutConfirmBody}</p>}
                confirmLabel={t.profile.signOutConfirmYes}
                cancelLabel={t.profile.signOutConfirmNo}
                onConfirm={() => {
                  const f = document.createElement("form");
                  f.method = "POST";
                  f.action = "/auth/logout";
                  document.body.appendChild(f);
                  f.submit();
                }}
                trigger={
                  <button
                    type="button"
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 font-display text-body-sm font-semibold text-no-300 hover:bg-no-500/10 transition-colors text-left"
                  >
                    <I.logOut s={15} aria-hidden />
                    {t.common.signOut}
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

const LANG_CODES: Locale[] = ["en", "sw", "zh"];
const LANG_LABELS: Record<Locale, string> = { en: "EN", sw: "SW", zh: "中文" };

function MobileLangPicker({ locale: current }: { locale: string }) {
  const { t, setLocale } = useT();
  return (
    <div className="flex gap-1">
      {LANG_CODES.map((code) => {
        const active = code === current;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            aria-label={t.common.switchTo.replace("{lang}", LANG_LABELS[code])}
            aria-pressed={active}
            className={cn(
              "h-7 px-3 rounded-pill font-mono text-[11.5px] font-semibold transition-colors",
              active
                ? "bg-brand-500 text-white"
                : "bg-bg-overlay text-text-subtle border border-border hover:bg-brand-500/10 hover:text-brand-300",
            )}
          >
            {LANG_LABELS[code]}
          </button>
        );
      })}
    </div>
  );
}

function Item({ href, icon: Ico, en, sw, zh, accent }: { href: string; icon: (p: { s?: number; className?: string }) => React.ReactElement; en: string; sw: string; zh: string; accent?: boolean }) {
  const { locale } = useT();
  const primary = locale === "sw" ? sw : locale === "zh" ? zh : en;
  const secondary = locale === "en" ? sw : locale === "sw" ? en : en;
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
        {primary}
        <span className="text-text-subtle italic font-normal text-label">· {secondary}</span>
      </Link>
    </li>
  );
}
