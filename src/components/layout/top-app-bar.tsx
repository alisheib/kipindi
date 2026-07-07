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
  /** Staff-tier session — surfaces the admin-console jump in the avatar menu. */
  isAdmin?: boolean;
};

export function TopAppBar({ user }: { user: TopAppBarUser }) {
  const pathname = usePathname();
  const { t } = useT();

  const NAV_ITEMS = user.isAuthed
    ? ([
        { href: "/markets",     label: t.common.markets },
        { href: "/live",        label: t.nav.live },
        { href: "/results",     label: t.common.results },
        { href: "/positions",   label: t.common.history },
        { href: "/wallet",      label: t.nav.wallet },
        { href: "/proposals",   label: t.common.propose },
        { href: "/profile/invite", label: t.common.invite },
        { href: "/leaderboard", label: t.nav.leaderboard },
      ] as const)
    : ([
        { href: "/markets",     label: t.common.markets },
        { href: "/live",        label: t.nav.live },
        { href: "/results",     label: t.common.results },
        { href: "/leaderboard", label: t.nav.leaderboard },
      ] as const);

  return (
    <header
      className="sticky top-0 z-30 app-topbar"
      style={{
        height: 56,
        background: "color-mix(in oklab, var(--panel) 92%, transparent)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="mx-auto max-w-[1280px] flex items-center h-full gap-2 px-3 sm:gap-5 sm:px-5">
        {/* Brand lockup — kit: BrandLockup size={30} */}
        <Link href="/" aria-label={`50pick ${t.common.home}`} className="shrink-0 hover:opacity-90 transition-opacity">
          <span className="inline-flex sm:hidden"><FiftyMark size={26} /></span>
          <span className="hidden sm:inline-flex"><FiftyLockup size={22} /></span>
        </Link>

        {/* Nav links — kit: gap 2, marginLeft 10 */}
        <nav className="ml-2.5 hidden xl:flex items-center gap-0.5" aria-label={t.nav.primary}>
          {NAV_ITEMS.map((it) => {
            const active = it.href === "/markets"
              ? pathname === "/" || pathname.startsWith("/markets")
              : it.href === "/proposals"
              ? pathname.startsWith("/proposals")
              : it.href === "/results"
              ? pathname.startsWith("/results")
              : pathname === it.href;
            return (
              <Link
                key={it.href}
                href={it.href}
                aria-current={active ? "page" : undefined}
                className="whitespace-nowrap"
                style={{
                  padding: "7px 12px",
                  borderRadius: "var(--r-sm)",
                  fontSize: 13.5,
                  fontWeight: active ? 600 : 500,
                  color: active ? "var(--text)" : "var(--text-subtle)",
                  background: active ? "oklch(40% 0.08 264 / 0.4)" : "transparent",
                  transition: "color 150ms ease-out, background 150ms ease-out, font-weight 0ms",
                }}
              >
                {it.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

        <div className="shrink-0 flex items-center gap-2">
          <LanguageToggle />

          {user.isAuthed && user.balance !== null && user.balance !== undefined && (
            <>
              <WalletBalancePill balance={user.balance} />
              <CashEye bare size={14} className="inline-flex text-[var(--gold-300)]" />
            </>
          )}

          {user.isAuthed && !pathname.startsWith("/wallet/deposit") && (
            <Link
              href="/wallet/deposit"
              aria-label={t.common.deposit}
              className="inline-flex items-center justify-center gap-1.5 rounded-pill font-display font-bold text-[12px] tracking-[-0.01em] transition-all duration-150 hover:brightness-110 hover:shadow-[0_0_18px_-2px_var(--gold-400)] active:scale-[0.97]"
              style={{
                height: 34,
                padding: "0 12px",
                background: "linear-gradient(135deg, var(--gold-500), var(--gold-600))",
                color: "var(--gold-50)",
                border: "1px solid color-mix(in oklab, var(--gold-400) 50%, transparent)",
                boxShadow: "inset 0 1px 0 color-mix(in oklab, var(--gold-300) 25%, transparent), 0 2px 8px -2px color-mix(in oklab, var(--gold-500) 35%, transparent)",
              }}
            >
              <I.plus s={14} />
              <span className="hidden sm:inline">
                {t.common.deposit}
              </span>
            </Link>
          )}

          <NotificationsPanel />

          <AvatarMenu
            initials={user.initials}
            name={user.name}
            phone={user.phone}
            isAuthed={user.isAuthed}
            avatarSrc={user.avatarSrc ?? null}
            seed={user.seed}
            isAdmin={user.isAdmin ?? false}
          />
        </div>
      </div>
    </header>
  );
}
