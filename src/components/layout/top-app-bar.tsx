"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiftyLockup, FiftyMark } from "@/components/brand";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { NotificationsPanel } from "@/components/layout/notifications-panel";
import { AvatarMenu } from "@/components/layout/avatar-menu";
import { NavMore } from "@/components/layout/nav-more";
import { WalletBalancePill } from "@/components/layout/wallet-balance-pill";
import { ProposalsStateBadge } from "@/components/ui/proposals-state-badge";
import { CashEye } from "@/components/ui/cash";
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";
import type { ProposalsState } from "@/lib/server/proposals-config";

/** A primary-nav item; `proposalsBadge`, when set, rides a proposals entry point
 *  and renders the gilt/amber state flag (never on ACTIVE/DISABLED). */
type NavItem = {
  href: string;
  label: string;
  proposalsBadge?: ProposalsState;
  /**
   * Marks a destination as a DISTINCT PRODUCT LINE rather than another page of the
   * same game — currently only Up & Down. It gets a brand-indigo treatment even when
   * inactive, so a player can tell at a glance that it is a different kind of game.
   *
   * Brand indigo is the one accent free to mean this: gold means earned money,
   * green/rose mean betting actions, and cyan already means "active tab". The accent
   * must therefore read as IDENTITY, never be confusable with the active state — which
   * is why it is a left rule + tinted label, not the active pill.
   *
   * ⏳ Ali's final treatment is pending (Q8 / design prompt D6). This is the restrained
   * interim: no per-second timer in global chrome — a countdown on every page is a
   * persistent urgency cue (an RG problem for a licensed operator) and a per-second
   * re-render on a platform whose bar is "usable on a low-end Android over 2G".
   */
  accent?: boolean;
};

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

export function TopAppBar({ user, proposalsState }: { user: TopAppBarUser; proposalsState: ProposalsState }) {
  const pathname = usePathname();
  const { t } = useT();

  // Core links render inline from `lg`; overflow links fold into the "More"
  // menu at lg and render inline only at `xl` (IA review R1 — no primary
  // destination is hidden on tablets/small laptops).
  // Up & Down sits directly after Markets in BOTH navs — it is a peer product line, not
  // a sub-page of Markets, and a player must be able to reach it from any width. (It was
  // added to the bottom nav first and missed here, which meant it was invisible on
  // desktop entirely: the bottom bar is `lg:hidden`.)
  const CORE_ITEMS: NavItem[] = user.isAuthed
    ? [
        { href: "/markets",   label: t.common.markets },
        { href: "/updown",    label: t.market.udTitle, accent: true },
        { href: "/live",      label: t.nav.live },
        { href: "/results",   label: t.common.results },
        { href: "/positions", label: t.common.history },
        { href: "/wallet",    label: t.nav.wallet },
      ]
    : [
        { href: "/markets",     label: t.common.markets },
        { href: "/updown",      label: t.market.udTitle, accent: true },
        { href: "/live",        label: t.nav.live },
        { href: "/results",     label: t.common.results },
        { href: "/leaderboard", label: t.nav.leaderboard },
      ];
  // Proposals is dropped from the nav entirely when DISABLED; otherwise it rides
  // the current state flag (gilt coming-soon / amber maintenance / none active).
  const MORE_ITEMS: NavItem[] = user.isAuthed
    ? [
        ...(proposalsState !== "DISABLED"
          ? [{ href: "/proposals", label: t.common.propose, proposalsBadge: proposalsState } as NavItem]
          : []),
        { href: "/profile/invite", label: t.common.invite },
        { href: "/leaderboard",    label: t.nav.leaderboard },
      ]
    : [];

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

          {/* Signed-in only. A notification bell shown to a visitor with no
              account is an inbox that can never have anything in it: opening it
              fires fetchMyNotifications(), which has no session to read, so the
              panel can only ever render its empty state. It also invites a tap
              that leads nowhere, on the surface where a new visitor is deciding
              whether to sign up. The Deposit link beside it is gated the same
              way — this one was simply missed. */}
          {user.isAuthed && <NotificationsPanel />}

          <AvatarMenu
            initials={user.initials}
            name={user.name}
            phone={user.phone}
            isAuthed={user.isAuthed}
            avatarSrc={user.avatarSrc ?? null}
            seed={user.seed}
            isAdmin={user.isAdmin ?? false}
            proposalsState={proposalsState}
          />
        </div>
      </div>
    </header>
  );
}

/** A single primary-nav link with the shared active-state logic. */
function NavLink({ it, pathname }: { it: NavItem; pathname: string }) {
  const { t } = useT();
  const active =
    it.href === "/markets" ? pathname === "/" || pathname.startsWith("/markets")
    : it.href === "/proposals" ? pathname.startsWith("/proposals")
    : it.href === "/results" ? pathname.startsWith("/results")
    : it.href === "/positions" ? pathname.startsWith("/positions")
    : it.href === "/updown" ? pathname.startsWith("/updown")
    : pathname === it.href;
  // A product-line accent (see NavItem.accent): a glassy indigo PILL, in the kit's own
  // button idiom — translucent brand fill, hairline brand border, the inset top
  // highlight every `.btn` carries, and a soft glow. It reads as a distinct thing you
  // can enter, not as a nav item someone drew a line next to.
  //
  // It brightens when active rather than swapping to the flat active pill, so identity
  // and active-state reinforce each other instead of competing.
  const accent = it.accent === true;
  const accentStyle: React.CSSProperties = {
    background: active
      ? "linear-gradient(180deg, oklch(52% 0.17 262 / 0.55), oklch(44% 0.15 262 / 0.45))"
      : "linear-gradient(180deg, oklch(48% 0.15 262 / 0.34), oklch(40% 0.13 262 / 0.26))",
    border: `1px solid ${active ? "var(--brand-400)" : "color-mix(in oklab, var(--brand-500) 55%, transparent)"}`,
    color: active ? "var(--text)" : "var(--brand-300)",
    boxShadow: active
      ? "inset 0 1px 0 oklch(100% 0 0 / 0.16), 0 0 16px -4px oklch(63% 0.18 262 / 0.55)"
      : "inset 0 1px 0 oklch(100% 0 0 / 0.10), 0 0 12px -6px oklch(63% 0.18 262 / 0.40)",
  };
  return (
    <Link
      href={it.href as never}
      aria-current={active ? "page" : undefined}
      className="inline-flex items-center gap-1.5 whitespace-nowrap"
      style={{
        padding: accent ? "6px 14px" : "7px 12px",
        borderRadius: accent ? "var(--r-pill)" : "var(--r-sm)",
        fontSize: 13.5,
        fontWeight: active || accent ? 600 : 500,
        transition: "color 150ms ease-out, background 150ms ease-out, box-shadow 150ms ease-out, font-weight 0ms",
        ...(accent
          ? accentStyle
          : {
              color: active ? "var(--text)" : "var(--text-subtle)",
              background: active ? "oklch(40% 0.08 264 / 0.4)" : "transparent",
            }),
      }}
    >
      {/* The product signature: a tiny up/down pair — green up, rose down — that says
          "this is the price game" at a glance, on the purple base. It marries Ali's two
          ideas (purple + a green/red hint) without a garish full split, and green/rose
          appear only inside a betting-adjacent mark, never as navigation colour. */}
      {accent && (
        <span aria-hidden className="inline-flex flex-col items-center justify-center" style={{ marginRight: 1, lineHeight: 0 }}>
          <I.trendingUp s={9} style={{ color: "var(--yes-400)", marginBottom: -2 }} />
          <I.trendingDown s={9} style={{ color: "var(--no-400)", marginTop: -2 }} />
        </span>
      )}
      {it.label}
      {it.proposalsBadge && (
        <ProposalsStateBadge state={it.proposalsBadge} comingSoonLabel={t.proposals.comingSoonTag} maintenanceLabel={t.proposals.maintenanceTag} size="xs" />
      )}
    </Link>
  );
}
