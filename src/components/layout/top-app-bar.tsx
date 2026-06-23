"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiftyLockup, FiftyMark } from "@/components/brand";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { NotificationsPanel } from "@/components/layout/notifications-panel";
import { AvatarMenu } from "@/components/layout/avatar-menu";
import { WalletBalancePill } from "@/components/layout/wallet-balance-pill";
import { CashEye } from "@/components/ui/cash";
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type TopAppBarUser = {
  initials: string;
  name: string;
  phone: string;
  isAuthed: boolean;
  avatarSrc?: string | null;
  seed?: string;
  /** TZS wallet balance — null = guest. Renders as the kit's mono pearl
   *  balance pill next to the avatar (kit/screens.jsx top-bar pattern). */
  balance?: number | null;
};

export function TopAppBar({ user }: { user: TopAppBarUser }) {
  const pathname = usePathname();
  const { t, locale } = useT();

  const POSITIONS = locale === "sw" ? "Nafasi" : locale === "fr" ? "Historique" : "History";
  const NAV_ITEMS = user.isAuthed
    ? ([
        { href: "/markets",     label: locale === "sw" ? "Masoko" : locale === "fr" ? "Marchés" : "Markets" },
        { href: "/live",        label: t.nav.live },
        { href: "/positions",   label: POSITIONS },
        { href: "/wallet",      label: t.nav.wallet },
        { href: "/proposals",   label: locale === "sw" ? "Kupendekeza" : locale === "fr" ? "Proposer" : "Propose" },
        { href: "/profile/invite", label: locale === "sw" ? "Alika" : locale === "fr" ? "Inviter" : "Invite" },
        { href: "/leaderboard", label: t.nav.leaderboard },
      ] as const)
    : ([
        { href: "/markets",     label: locale === "sw" ? "Masoko" : locale === "fr" ? "Marchés" : "Markets" },
        { href: "/live",        label: t.nav.live },
        { href: "/leaderboard", label: t.nav.leaderboard },
      ] as const);

  return (
    <header
      className="sticky top-0 z-30 app-topbar"
      style={{
        height: 56,
        // Near-opaque on mobile (no blur → no per-scroll-frame re-raster GPU
        // cost on mid-tier Android). The frosted blur is applied only ≥1024px
        // via the `.app-topbar` rule in globals.css.
        background: "color-mix(in oklab, var(--panel) 92%, transparent)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="mx-auto max-w-[1280px] flex items-center h-full gap-2 px-3 sm:gap-5 sm:px-5">
        {/* Brand lockup — kit: BrandLockup size={30} */}
        <Link href="/" aria-label={locale === "sw" ? "ukurasa wa nyumbani wa 50pick" : "50pick home"} className="shrink-0 hover:opacity-90 transition-opacity">
          {/* Mark-only on phones to leave room for the wallet pill + eye + bell
              + avatar; full wordmark lockup from sm: up. */}
          <span className="inline-flex sm:hidden"><FiftyMark size={26} /></span>
          <span className="hidden sm:inline-flex"><FiftyLockup size={22} /></span>
        </Link>

        {/* Nav links — kit: gap 2, marginLeft 10 */}
        <nav className="ml-2.5 hidden xl:flex items-center gap-0.5" aria-label="Primary">
          {NAV_ITEMS.map((it) => {
            const active = it.href === "/markets"
              ? pathname === "/" || pathname.startsWith("/markets")
              : it.href === "/proposals"
              ? pathname.startsWith("/proposals")
              : pathname === it.href;
            return (
              <Link
                key={it.href}
                href={it.href}
                aria-current={active ? "page" : undefined}
                className="whitespace-nowrap transition-colors"
                style={{
                  padding: "7px 12px",
                  borderRadius: "var(--r-sm)",
                  fontSize: 13.5,
                  fontWeight: active ? 600 : 500,
                  color: active ? "var(--text)" : "var(--text-subtle)",
                  background: active ? "oklch(40% 0.08 264 / 0.4)" : "transparent",
                }}
              >
                {it.label}
              </Link>
            );
          })}
        </nav>

        {/* Spacer — shrinks when nav labels are long (e.g. SW locale),
            never lets the right-side controls compress or wrap. */}
        <div className="flex-1" />

        {/* Right-side controls — shrink-0 prevents SW nav labels from
            squeezing the wallet pill to 2 lines. */}
        <div className="shrink-0 flex items-center gap-2">
          {/* Language toggle — kit: inline EN/SW/FR pills */}
          <LanguageToggle />

          {/* Wallet balance pill — kit: bg-inset, gold-tinted border */}
          {user.isAuthed && user.balance !== null && user.balance !== undefined && (
            <>
              <WalletBalancePill balance={user.balance} />
              <CashEye bare size={14} className="inline-flex text-[var(--gold-300)]" />
            </>
          )}

          {/* Deposit CTA — gold per kit (money-commit action).
              Icon-only on phones; label from sm: up. Hidden on the
              deposit page itself so it doesn't feel redundant. */}
          {user.isAuthed && !pathname.startsWith("/wallet/deposit") && (
            <Link
              href="/wallet/deposit"
              aria-label={locale === "sw" ? "Weka pesa" : "Deposit"}
              className="inline-flex items-center justify-center gap-1.5 rounded-pill font-display font-bold text-[12px] tracking-[-0.01em] transition-all duration-150 hover:brightness-110 hover:shadow-[0_0_14px_-2px_var(--gold-400)]"
              style={{
                height: 34,
                padding: "0 10px",
                background: "linear-gradient(135deg, var(--gold-500), var(--gold-600))",
                color: "var(--gold-50)",
                border: "1px solid color-mix(in oklab, var(--gold-400) 50%, transparent)",
                boxShadow: "inset 0 1px 0 color-mix(in oklab, var(--gold-300) 25%, transparent), 0 2px 8px -2px color-mix(in oklab, var(--gold-500) 35%, transparent)",
              }}
            >
              <I.plus s={14} />
              <span className="hidden sm:inline">
                {locale === "sw" ? "Weka" : "Deposit"}
              </span>
            </Link>
          )}

          {/* Notifications bell */}
          <NotificationsPanel />

          {/* Avatar menu */}
          <AvatarMenu
            initials={user.initials}
            name={user.name}
            phone={user.phone}
            isAuthed={user.isAuthed}
            avatarSrc={user.avatarSrc ?? null}
            seed={user.seed}
          />
        </div>
      </div>
    </header>
  );
}
