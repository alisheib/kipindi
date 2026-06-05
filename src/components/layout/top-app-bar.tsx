"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiftyLockup } from "@/components/brand";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { NotificationsPanel } from "@/components/layout/notifications-panel";
import { AvatarMenu } from "@/components/layout/avatar-menu";
import { WalletBalancePill } from "@/components/layout/wallet-balance-pill";
import { CashEye } from "@/components/ui/cash";
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
  // Public visitors see only the routes they can actually open without
  // a session. Wallet + Positions require auth — surfacing them in the
  // nav and then bouncing the click to /auth/login is a worse UX than
  // hiding the entry until the visitor is signed in.
  // Locale-aware labels — wire the toggle so flipping the chip actually
  // re-labels the visible chrome. Most of the app uses a "bilingual at
  // all times" pattern ("Place bet · Weka dau"); these top-bar nav
  // items are an exception that the toggle genuinely flips. The
  // dictionary in @/lib/i18n.tsx has SW + FR for every key below.
  const POSITIONS = locale === "sw" ? "Madau" : locale === "fr" ? "Paris" : "Positions";
  const NAV_ITEMS = user.isAuthed
    ? ([
        { href: "/markets",     label: locale === "sw" ? "Soko" : locale === "fr" ? "Marchés" : "Markets" },
        { href: "/live",        label: t.nav.live },
        { href: "/positions",   label: POSITIONS },
        { href: "/wallet",      label: t.nav.wallet },
        { href: "/proposals",   label: locale === "sw" ? "Pendekeza" : locale === "fr" ? "Proposer" : "Propose" },
        { href: "/profile/invite", label: locale === "sw" ? "Alika" : locale === "fr" ? "Inviter" : "Invite" },
        { href: "/leaderboard", label: t.nav.leaderboard },
      ] as const)
    : ([
        { href: "/markets",     label: locale === "sw" ? "Soko" : locale === "fr" ? "Marchés" : "Markets" },
        { href: "/live",        label: t.nav.live },
        { href: "/leaderboard", label: t.nav.leaderboard },
      ] as const);

  return (
    <header className="sticky top-0 z-40 border-b border-border-strong"
      style={{
        background: "color-mix(in oklab, var(--panel) 78%, transparent)",
        backdropFilter: "blur(14px) saturate(1.3)",
        WebkitBackdropFilter: "blur(14px) saturate(1.3)",
        boxShadow: "inset 0 1px 0 oklch(100% 0 0 / 0.06), 0 12px 32px -12px oklch(6% 0.08 268 / 0.6)",
      }}
    >
      <div className="mx-auto max-w-[1480px] flex items-center justify-between gap-2 px-3 lg:px-6 h-14">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" aria-label="50pick home" className="shrink-0 hover:opacity-90 transition-opacity">
            <FiftyLockup size={20} />
          </Link>
          <nav className="ml-3 hidden xl:flex items-center" aria-label="Primary">
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
                  className={cn(
                    "h-8 px-3 inline-flex items-center whitespace-nowrap rounded-md text-[13.5px] transition-colors",
                    active ? "font-semibold text-text" : "font-medium text-text-subtle hover:text-text",
                  )}
                  style={active ? { background: "oklch(40% 0.08 264 / 0.45)" } : undefined}
                >
                  {it.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {user.isAuthed && user.balance !== null && user.balance !== undefined && (
            <>
              <WalletBalancePill balance={user.balance} />
              <CashEye bare size={15} className="hidden sm:inline-flex" />
            </>
          )}
          <NotificationsPanel />
          <LanguageToggle />
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
