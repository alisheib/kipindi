"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiftyLockup, FiftyMark } from "@/components/brand";
import { LanguageMenu } from "@/components/ui/language-menu";
import { NotificationsPanel } from "@/components/layout/notifications-panel";
import { AvatarMenu } from "@/components/layout/avatar-menu";
import { NavMore } from "@/components/layout/nav-more";
import { WalletBalancePill } from "@/components/layout/wallet-balance-pill";
import { ProposalsStateBadge } from "@/components/ui/proposals-state-badge";
import { CashEye } from "@/components/ui/cash";
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";
import type { ProposalsState } from "@/lib/server/proposals-config";

/**
 * THE HEADER — round-2 kit §2 / COMPONENTS §14, rebuilt in batch 3.
 *
 * ── 🔴 THE SEE-THROUGH BUG IS REMOVED, NOT TUNED ─────────────────────────────────────────────
 * The bar was `color-mix(--panel 92%, transparent)` inline, and `globals.css` mixed it down to
 * **78% with a 12px backdrop blur** from 1024 up. A translucent bar over a scrolling board of
 * conviction bars, avatar stacks and gilt price figures cannot be made legible by raising a mix
 * percentage — it can only be made less bad. It is now `var(--panel)`, OPAQUE, at every scroll
 * position and every width, with a 1px `--border` bottom edge giving the bar the boundary it never
 * had, and `--shadow-2` appearing only once the page has scrolled. Dropping the blur also stops
 * the bar re-rastering the scrolling content every frame on a mid-tier Android, which is the
 * device this product is built for.
 *
 * ── THE NAVIGATION MODEL: THREE TIERS, ONE MEANING EACH (the round's largest correction) ──────
 *   destination      no border, `--r-sm`, 44px           Markets · Up & Down · Live · Results · Top
 *   utility control  BORDERED, `--r-sm`, 44×44           Language
 *   action           `--r-pill`                          Sign in (ghost) · Sign up (filled)
 *
 * `--r-pill` used to mean BOTH "product line" (Up & Down) and "account action" (Sign in / Sign
 * up) — one shape, two kinds. Shape now has exactly one meaning: Up & Down is a destination, so
 * it takes destination geometry, and its distinction moves to a 5px gilt dot plus `--brand-300`
 * ink.
 *
 * **Current destination = `--pill-active` + `--text` + weight 600. That is the ONLY active
 * treatment, at every width** — the bottom rail says it the same way. It used to say it with
 * `--aqua-300`, a second active language for one idea.
 *
 * ⚠️ THE GILT DOT WAS VERIFIED AGAINST `test:gold-is-money` BEFORE SHIPPING, as the plan required.
 * The gate is scoped to two named identity surfaces (`identity-avatar.tsx`, `updown-card.tsx`) and
 * the `.tier-*` rank rules, so it does not object to a nav dot — and the dot is not identity, rank
 * or status: it marks a distinct PRODUCT LINE. If a future revision widens that gate to nav
 * chrome, the dot goes `--brand-300`, not gold; it is one token change and nothing else moves.
 */
type NavItem = {
  href: string;
  label: string;
  proposalsBadge?: ProposalsState;
  /**
   * Marks a destination as a DISTINCT PRODUCT LINE rather than another page of the same game —
   * currently only Up & Down. It keeps destination geometry (see the note above); the accent is a
   * gilt dot and brand ink, never a different shape or the active pill.
   *
   * ⏳ No per-second timer in global chrome, ever: a countdown on every page is a persistent
   * urgency cue (an RG finding for a licensed operator, §C5) and a per-second re-render on a bar
   * that must stay usable on a low-end Android over 2G.
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
  // a sub-page of Markets, and a player must be able to reach it from any width.
  const CORE_ITEMS: NavItem[] = user.isAuthed
    ? [
        { href: "/markets",   label: t.common.markets },
        { href: "/updown",    label: t.market.udTitle, accent: true },
        { href: "/live",      label: t.nav.live },
        { href: "/results",   label: t.common.results },
        { href: "/positions", label: t.common.positions },
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
        // OPAQUE. See the header note above — this was a 92% mix, dropped to 78% + blur ≥1024.
        background: "var(--panel)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {/* ⛔ THE GAP YIELDS AT THE lg–xl BAND TOO (E-190). `sm:gap-4` is 12px→20px under the
          overridden spacing scale, and it is charged THREE times across logo | nav | spacer |
          cluster — 60px of air at the one band where the bar is 65px short in Swahili. Dropping
          back to the `gap-2` this row already uses below `sm` returns 24px of it. ⚠️ The nav
          keeps its own `ml-2.5`, so the logo never touches the first link. Both values are the
          two the row already carries; no new step enters the scale. */}
      <div className="mx-auto max-w-board flex items-center h-full gap-2 px-3 sm:gap-4 sm:px-5 lg:gap-2 xl:gap-4">
        {/* Brand lockup — kit COMPONENTS §14: "inside a `min-height: 44px` link".
            ⚠️ It was 136×33, i.e. UNDER the 44px floor on the control that takes a reader back to
            the board from anywhere in the product. Pre-existing rather than introduced here, and
            surfaced by measuring every control in the bar rather than only the ones this batch
            added — the kit had already specified the fix. Width was never the problem (136px);
            only the height was, so `inline-flex items-center` gives it the floor without moving
            the mark one pixel. */}
        <Link
          href="/"
          aria-label={`50pick ${t.common.home}`}
          className="shrink-0 inline-flex min-h-[44px] items-center hover:opacity-90 transition-opacity"
        >
          {/* M8 — the mark performs: one flip on its own needle axis per hover
              (.mark-flip-i), on the LOGO only. Wrapped on the mark span, not the
              lockup, so the wordmark never rotates with it. */}
          <span className="mark-flip-i inline-flex sm:hidden"><FiftyMark size={26} /></span>
          <span className="hidden sm:inline-flex"><FiftyLockup size={22} markClassName="mark-flip-i" /></span>
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
          {/* ⭐ ONE 44×44 LANGUAGE CONTROL, AT EVERY WIDTH — kit §2. The 3-pill capsule this
              replaces was hidden below 640 AND hidden again across 1024–1279 (the band where the
              desktop nav turns on and the cluster overflowed 1024), so the control a trilingual
              product depends on was absent on a phone and absent on a small laptop, with the
              avatar menu carrying a duplicate picker to cover the gap. One trigger, always
              present, no duplicate. */}
          <LanguageMenu />

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
                  doesn't reflow horizontally.
                  ⛔ BOTH NUMBERS ARE ARBITRARY LITERALS ON PURPOSE. `theme.extend.spacing`
                  is overridden (tailwind.config.ts:200-215): `h-11` is 96px and `w-7` is
                  40px, so this shipped 96×40 and the comment above was false on both
                  halves until 2026-08-21. Never a scale token here. */}
              <CashEye bare size={14} className="inline-flex items-center justify-center h-[44px] w-[28px] -mx-1 text-[var(--gold-300)]" />
            </div>
          )}

          {/* ⭐ THE WALLET DOOR, ON PHONES ONLY — Ali, 2026-08-25: a player should reach
              their wallet easily, not out of the kebab. Ruled: an ICON BUTTON next to
              Deposit; ⛔ NOT a balance readout, and ⛔ NOT a bottom-nav change.

              ⚠️ `sm:hidden` IS THE WHOLE POINT, and it is measured rather than assumed.
              `/wallet` is ALREADY reachable at every other width: from `sm` up the balance
              pill beside it is itself a `<Link href="/wallet">` (wallet-balance-pill.tsx:136),
              and from `lg` up the desktop nav names Wallet outright (CORE_ITEMS above). The
              ONLY band with no wallet door is the phone, where the pill is hidden because it
              (~109px) plus the eye cannot coexist with the deposit/bell/avatar cluster on a
              320px screen. Adding this control anywhere else would be redundant chrome.

              🔴 AND THIS IS THE EXACT CLUSTER E-190 SEVERED — at 1024 in Swahili the account
              menu ran off-screen and the bell was cut, on every page, with three instruments
              green over it. `sm:hidden` means this control does not exist at 1024, so that
              band is untouched by construction; `qa:wallet-reach` proves it at 768/1024/1280
              rather than taking the class name's word for it.

              ⛔ Wallet STAYS under "more" in the bottom rail. That is not duplication — it is
              the named TEXT entry for anyone who navigates by reading rather than by icon.

              Hidden on `/wallet` itself: never offer a door to the room you are standing in.
              ⚠️ `!==`, not `startsWith`: on /wallet/deposit and /wallet/withdraw this is the
              way BACK UP to the overview, and Deposit has already yielded its own slot there. */}
          {user.isAuthed && pathname !== "/wallet" && (
            <Link
              href="/wallet"
              aria-label={t.nav.wallet}
              /* ⭐ A HOOK SO ITS *ABSENCE* IS TESTABLE. Three different elements link to
                 /wallet across the width range (this icon, the balance pill, the desktop
                 nav item), so a live driver cannot tell them apart by href — and the
                 assertion that matters at 1024 is that THIS one is not there. */
              data-testid="wallet-door"
              className="sm:hidden inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-md border border-border-control px-2 text-text-muted transition-colors hover:text-text"
              style={{ minWidth: 44 }}
            >
              <I.wallet s={16} />
            </Link>
          )}

          {user.isAuthed && !pathname.startsWith("/wallet/deposit") && (
            // ⭐ THE MONEY-IN CTA, ON STRUCK GILT — M3, 2026-08-07 (ATOM D-2).
            //
            // ⚠️ THIS DELIBERATELY REVERSES AN EARLIER DECISION, AND THE EARLIER ONE IS
            // NOT BEING CALLED WRONG. This CTA used to carry a bespoke gold GRADIENT and
            // was moved to the kit's flat `.btn-gold` because it was "the only gold
            // gradient left in a flat-gold system" — correct reasoning about a system
            // whose gold was flat. M3 changes that premise at the root: *gold is struck,
            // and struck means earned.* One satin ramp, re-derived from the trademark's
            // #E3BC66, with an even edge ring and one specular sweep on hover. The
            // delivery names this exact control — "Continue / Deposit / earned-money CTA".
            // So the gradient returns, but as the SYSTEM's one ramp rather than as a
            // one-off: `--gilt-metal` is a token, and it is the same metal as the mark.
            //
            // ⛔ `btn-gold` IS DROPPED, NOT LAYERED. Both classes paint a fill, and
            // stacking them would leave two answers to one question relying on import
            // order to pick a winner. `.gilt-metal` is a COMPLETE control skin — fill,
            // ink, edge, hover, active, focus-visible and disabled — so `.btn` supplies
            // the geometry and typography and the rung supplies the material, which is
            // M2's division of labour. ⚠️ The other four `.btn-gold` sites are ATOM E's;
            // this is the one representative control, per INTAKE §3 step 3.
            //
            // Measured, not assumed: `--gold-fg` on the struck ramp's worst stop reads
            // 7.25 against a 4.5 floor (`test:contrast`), so the change costs nothing in
            // legibility. Pill shape; label hidden < sm.
            <Link
              href="/wallet/deposit"
              aria-label={t.common.deposit}
              className="btn gilt-metal btn-md btn-pill"
            >
              <I.plus s={14} />
              {/* ⛔ THE LABEL YIELDS AT THE lg–xl BAND (1024–1279), AND IT IS THE SAME RULE AS
                  BELOW `sm` ONE LINE ABOVE — not a new idea, the existing one applied to the
                  second band where the bar does not fit. E-190: with the desktop nav on and
                  the balance pill already yielded there, the right cluster still ran 31px past
                  1024 in EN and 65px in SW, and what fell off the end was the ACCOUNT MENU —
                  the only desktop path to profile and sign-out — with the bell severed beside
                  it in Swahili. ⚠️ The control itself never goes: the `+` glyph and its
                  `aria-label` stay, exactly as they do on a phone, so nothing becomes
                  unnameable or unreachable. Measured, not assumed: the label is 108px in EN,
                  103px in SW, 84px in ZH. */}
              <span className="hidden sm:inline lg:hidden xl:inline">
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

          {/* ⭐ AUTH IS IN THE HEADER AT EVERY WIDTH — kit §2, and the reason the bottom rail is
              destinations only. `Sign in` is the ghost action, `Sign up` the filled one; both take
              `--r-pill`, which now means "account action" and nothing else.
              ⚠️ The label is hidden below `sm` on `Sign in` only: at 360 the two pills plus the
              language control and the avatar do not fit, and of the two, the one a NEW visitor
              needs is Sign up. `aria-label` keeps the shortened control named. */}
          {!user.isAuthed && (
            <>
              <Link
                href={"/auth/login" as never}
                aria-label={t.common.signIn}
                className="btn btn-ghost btn-lg btn-pill hidden sm:inline-flex"
              >
                {t.common.signIn}
              </Link>
              <Link
                href={"/auth/register" as never}
                aria-label={t.common.signUp}
                className="btn btn-primary btn-lg btn-pill"
              >
                {t.common.signUp}
              </Link>
            </>
          )}

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

/**
 * A single primary-nav link.
 *
 * ONE BOX for every item — 44px tall, identical horizontal padding. The accent (Up & Down) pill
 * used to run 6px 14px against 7px 12px for its siblings, so it read visibly taller and wider than
 * every other link. Height and padding are now identical across all links; the accent differs only
 * in ink and a dot (identity), never in size or shape.
 */
function NavLink({ it, pathname }: { it: NavItem; pathname: string }) {
  const { t } = useT();
  const active =
    it.href === "/markets" ? pathname === "/" || pathname.startsWith("/markets")
    : it.href === "/proposals" ? pathname.startsWith("/proposals")
    : it.href === "/results" ? pathname.startsWith("/results")
    : it.href === "/positions" ? pathname.startsWith("/positions")
    : it.href === "/updown" ? pathname.startsWith("/updown")
    : pathname === it.href;
  const accent = it.accent === true;
  return (
    <Link
      href={it.href as never}
      aria-current={active ? "page" : undefined}
      className="inline-flex items-center gap-1.5 whitespace-nowrap"
      style={{
        // 44px is the tap floor and the kit's destination height. The nav used to be 34px —
        // under the floor on the primary navigation of a money product.
        minHeight: 44,
        padding: "0 var(--sp-3)",
        // DESTINATION geometry, for every item including Up & Down. `--r-pill` is reserved for an
        // account action now, so shape carries exactly one meaning.
        borderRadius: "var(--r-sm)",
        fontSize: 13.5,
        fontWeight: active ? 600 : 500,
        // ⛔ Never `transition: all` — that is what produced 895 elements computing to
        // `transition: all 0s ease`. One rule per property, from the motion ladder.
        transition: "color var(--t-quick) ease-out, background var(--t-quick) ease-out",
        // THE ONLY ACTIVE TREATMENT, at every width, shared with the bottom rail.
        background: active ? "var(--pill-active)" : "transparent",
        color: active ? "var(--text)" : accent ? "var(--brand-300)" : "var(--text-subtle)",
      }}
    >
      {/* The product-line mark: a 5px gilt dot. It replaces a glassy indigo pill, a bespoke
          gradient, a brand border, a glow AND a green/rose arrow pair — five distinctions for one
          idea, on an item that is simply another destination. */}
      {accent && (
        <span
          aria-hidden
          style={{
            flex: "none", width: 5, height: 5,
            borderRadius: "var(--r-pill)", background: "var(--gilt)",
          }}
        />
      )}
      {it.label}
      {it.proposalsBadge && (
        <ProposalsStateBadge state={it.proposalsBadge} comingSoonLabel={t.proposals.comingSoonTag} maintenanceLabel={t.proposals.maintenanceTag} size="xs" />
      )}
    </Link>
  );
}
