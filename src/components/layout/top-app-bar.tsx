"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiftyLockup, FiftyMark } from "@/components/brand";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { NotificationsPanel } from "@/components/layout/notifications-panel";
import { AvatarMenu } from "@/components/layout/avatar-menu";
import { NavMore } from "@/components/layout/nav-more";
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

  // Core links render inline from `lg`; overflow links fold into the "More"
  // menu at lg and render inline only at `xl` (IA review R1 — no primary
  // destination is hidden on tablets/small laptops).
  const CORE_ITEMS = user.isAuthed
    ? ([
        { href: "/markets",   label: t.common.markets },
        { href: "/live",      label: t.nav.live },
        { href: "/results",   label: t.common.results },
        { href: "/positions", label: t.common.history },
        { href: "/wallet",    label: t.nav.wallet },
      ] as const)
    : ([
        { href: "/markets",     label: t.common.markets },
        { href: "/live",        label: t.nav.live },
        { href: "/results",     label: t.common.results },
        { href: "/leaderboard", label: t.nav.leaderboard },
      ] as const);
  const MORE_ITEMS = user.isAuthed
    ? ([
        { href: "/proposals",      label: t.common.propose },
        { href: "/profile/invite", label: t.common.invite },
        { href: "/leaderboard",    label: t.nav.leaderboard },
      ] as const)
    : ([] as const);

  return (
    <header
      className="sticky top-0 z-30 app-topbar"
      style={{
        height: 56,
        background: "color-mix(in oklab, var(--panel) 92%, transparent)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="mx-auto max-w-[1280px] flex items-center h-full gap-2 px-3 sm:gap-4 sm:px-5">
        {/* Brand lockup — kit: BrandLockup size={30} */}
        <Link href="/" aria-label={`50pick ${t.common.home}`} className="shrink-0 hover:opacity-90 transition-opacity">
          <span className="inline-flex sm:hidden"><FiftyMark size={26} /></span>
          <span className="hidden sm:inline-flex"><FiftyLockup size={22} /></span>
        </Link>

        {/* Nav links — primary nav shows from `lg` (IA review R1). Core links
            are always inline; overflow links render inline only at `xl` and
            otherwise live in the "More" menu (rendered lg-only). */}
        <nav className="ml-2.5 hidden lg:flex items-center gap-0.5" aria-label={t.nav.primary}>
          {CORE_ITEMS.map((it) => (
            <NavLink key={it.href} it={it} pathname={pathname} />
          ))}
          {/* Overflow links inline only at 2xl — at xl the verbose locales (SW/ZH)
              can't fit 8 links + the right cluster in 1280, so they stay in "More"
              until 1536. */}
          {MORE_ITEMS.map((it) => (
            <span key={it.href} className="hidden 2xl:inline-flex">
              <NavLink it={it} pathname={pathname} />
            </span>
          ))}
          {/* "More" menu — visible lg→2xl (2xl shows the items inline above) */}
          <span className="2xl:hidden">
            <NavMore items={MORE_ITEMS} label={t.common.more} />
          </span>
        </nav>

        <div className="flex-1" />

        <div className="shrink-0 flex items-center gap-2">
          <LanguageToggle />

          {user.isAuthed && user.balance !== null && user.balance !== undefined && (
            // Balance glance-pill visibility follows available width:
            //  • < sm (phones): hidden — pill(~109) + eye can't coexist with the
            //    deposit/bell/avatar cluster; the account menu MUST stay reachable
            //    on a 320px phone. Balance is one tap away on the Wallet tab.
            //  • sm–lg (tablet portrait): shown — no desktop nav competing.
            //  • lg–xl (1024–1279): hidden — the desktop nav turns on at lg and
            //    leaves no room; keeping the pill here clipped the avatar off-screen.
            //  • xl–2xl (1280–1535): shown — nav is 5 links (More menu), room fits.
            //  • ≥ 2xl (1536): hidden — the 3 overflow links go inline here (8 links),
            //    which in SW/ZH would exceed the 1280 max-w container alongside the pill.
            <div className="hidden sm:flex lg:hidden xl:flex 2xl:hidden items-center gap-2">
              <WalletBalancePill balance={user.balance} />
              {/* bare eye keeps the compact 14px glyph but takes a 44px-tall hit area
                  (WCAG 2.5.5 AAA). Height only — width stays 28px so the cluster
                  doesn't reflow horizontally. */}
              <CashEye bare size={14} className="inline-flex items-center justify-center h-11 w-7 -mx-1 text-[var(--gold-300)]" />
            </div>
          )}

          {user.isAuthed && !pathname.startsWith("/wallet/deposit") && (
            <Link
              href="/wallet/deposit"
              aria-label={t.common.deposit}
              className="inline-flex items-center justify-center gap-1.5 rounded-pill font-display font-bold text-[12px] tracking-[-0.01em] transition-all duration-150 hover:brightness-110 hover:shadow-[0_0_18px_-2px_var(--gold-400)] active:scale-[0.97]"
              style={{
                height: 44,
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

/** A single primary-nav link with the shared active-state logic. */
function NavLink({ it, pathname }: { it: { href: string; label: string }; pathname: string }) {
  const active =
    it.href === "/markets" ? pathname === "/" || pathname.startsWith("/markets")
    : it.href === "/proposals" ? pathname.startsWith("/proposals")
    : it.href === "/results" ? pathname.startsWith("/results")
    : it.href === "/positions" ? pathname.startsWith("/positions")
    : pathname === it.href;
  return (
    <Link
      href={it.href as never}
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
}
