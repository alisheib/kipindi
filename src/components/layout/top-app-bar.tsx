"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { FiftyLockup, FiftyMark } from "@/components/brand";
import { LanguageMenu } from "@/components/ui/language-menu";
import { NotificationsPanel } from "@/components/layout/notifications-panel";
import { AvatarMenu } from "@/components/layout/avatar-menu";
import { NavMore } from "@/components/layout/nav-more";
import { WalletBalancePill, useLiveBalance } from "@/components/layout/wallet-balance-pill";
import { ProposalsStateBadge } from "@/components/ui/proposals-state-badge";
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";
import { authDoorHrefs } from "@/lib/auth-landing";
import { classicMillioneaStandIn } from "@/lib/nav/active-tab";
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
 *   destination      no border, `--r-sm`, 44px           Markets · Up & Down · (Millionea) · Live · Results · Top
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
 * The product-line dot is a small gilt identity accent; the active destination still uses brand.
 */
type NavItem = {
  href: string;
  label: string;
  proposalsBadge?: ProposalsState;
  /** The words in Millionea's ink (`kp-millionea-ink`), the one class every nav gives it (Ali, 2026-10-19): its core link's. */
  ink?: boolean;
  /* ⛔ A generic `comingSoon?: boolean` used to live here. Invite was its ONLY producer, and a
     destination that is not part of the product is dropped from the list entirely (see
     MORE_ITEMS below), never badged. The field is deleted rather than left unused because it was
     worse than dead: generically named, it rendered the INVITE copy key, so the next feature to
     set it would have worn Invite's words.
     ⚠️ 2026-09-25 — the REASON survives the product change but the example no longer does: invite
     is ACTIVE again (unpaid). It is in the list because it is live, not badged because it is
     promised, which is the same rule this note states. */
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
  /** The wallet is not ACTIVE (an officer hold, a final refusal): no money-in CTA, because /wallet/deposit refuses it. */
  walletHeld?: boolean;
};

export function TopAppBar({ user, proposalsState, inviteVisible = false, invitePaid = false, onBreak = false, millionea = false, millioneaOnBreak = false }: { user: TopAppBarUser; proposalsState: ProposalsState; inviteVisible?: boolean; invitePaid?: boolean; onBreak?: boolean; millionea?: boolean; millioneaOnBreak?: boolean }) {
  const pathname = usePathname();
  /** D13 · on a break, a Millionea page lights the destination the journey's table names (null everywhere else). */
  const standIn = millioneaOnBreak ? classicMillioneaStandIn(pathname) : null;
  const { t } = useT();
  // ⭐ R1 (landing v3, 2026-09-26) · the bar decides with the LIVE balance, so a deposit landing over
  // SSE brings the capsule back and a bet that empties the wallet brings Deposit — no navigation.
  const liveBalance = useLiveBalance(user.balance ?? 0);

  // Core links render inline from `lg`; overflow links fold into the "More"
  // menu at lg and render inline only at `xl` (IA review R1 — no primary
  // destination is hidden on tablets/small laptops).
  // Up & Down sits directly after Markets in BOTH navs — it is a peer product line, not
  // a sub-page of Markets, and a player must be able to reach it from any width.
  /* ⭐ MASWALI-BUILD S5-TAB · MASWALI MILLIONEA'S CORE LINK, RIGHT AFTER UP & DOWN (Ali, 2026-10-19; DESIGN_AUTHORITY §M8a
     item 11), for a player and a guest alike: a destination like its siblings — a peer product line, as Up & Down is — the
     same link, with only its words in Millionea's ink (`kp-millionea-ink`): no gilt dot, no mark. It replaces S5's first
     row of More (D-13 (b)'s "no inline link", struck). ⛔ Drawn only on the shell's own answer (`millionea`: the rollout
     admits the request and the reader is not on a break), resolved on the server and handed down as `inviteVisible` is;
     for everybody else the bar is today's, byte for byte.
     ⚠️ IT PAYS FOR ITS ROOM WITH RESULTS, AT EVERY WIDTH: while the link shows, Results is More's first row instead of a
     core link (`RESULTS_LINK` empty, `RESULTS_ROW` full) — the classic phone rail's own arrangement (Results has lived in
     its More since the centre coin). Measured 2026-10-19 (Chromium, the real fonts, signed in at TZS 999,999, the widest
     capsule): with Results inline beside Millionea the Swahili bar needs 12px more than 1280 and pushes the account menu
     off the screen — E-190's failure — and this bar never gains room past 1280 (`max-w-board`, `--w-board`), so no
     width holds the two side by side. At 1024–1279 the band was short before Millionea came (E-190); folding Results pays
     for the link there too, and one rule at every width keeps More's lit state its own rows' truth (current on /results,
     at any width, while Results is behind it). */
  const MILLIONEA_LINK: NavItem[] = millionea ? [{ href: "/millionea", label: t.millionea.productLabel, ink: true }] : [];
  const RESULTS_LINK: NavItem[] = millionea ? [] : [{ href: "/results", label: t.common.results }];
  const RESULTS_ROW: NavItem[] = millionea ? [{ href: "/results", label: t.common.results }] : [];
  const CORE_ITEMS: NavItem[] = user.isAuthed
    ? [
        { href: "/markets",   label: t.common.markets },
        { href: "/updown",    label: t.market.udTitle, accent: true },
        ...MILLIONEA_LINK,
        { href: "/live",      label: t.nav.live },
        ...RESULTS_LINK,
        { href: "/positions", label: t.common.positions },
        /* ⛔ `/wallet` LEFT THE INLINE NAV ON 2026-08-25 — it is a DUPLICATE now, not a
           loss. The balance capsule in the right cluster is itself a `<Link href="/wallet">`
           at EVERY width, so from `lg` up this row rendered two doors to one room and the
           wider of the two was the one costing the bar its remaining space.
           ⭐ Measured: with the capsule present and Wallet still inline, the row ran 101px
           past 1024 in EN and 139px in SW — i.e. `E-190` re-created, the exact band where
           the account menu was severed once before. Removing the duplicate is what pays for
           the balance being visible here at all.
           ⚠️ It keeps a NAMED text entry in `More` below, for anyone who navigates by
           reading rather than by recognising a figure. */
      ]
    : [
        { href: "/markets",     label: t.common.markets },
        { href: "/updown",      label: t.market.udTitle, accent: true },
        ...MILLIONEA_LINK,
        { href: "/live",        label: t.nav.live },
        ...RESULTS_LINK,
        { href: "/leaderboard", label: t.nav.leaderboard },
      ];
  // Proposals is dropped from the nav entirely when DISABLED; otherwise it rides
  // the current state flag (gilt coming-soon / amber maintenance / none active).
  const MORE_ITEMS: NavItem[] = user.isAuthed
    ? [
        ...RESULTS_ROW,
        ...(proposalsState !== "DISABLED"
          ? [{ href: "/proposals", label: t.common.propose, proposalsBadge: proposalsState } as NavItem]
          : []),
        { href: "/wallet",         label: t.nav.wallet },
        /* ⛔ Invite appears only for a viewer who may actually hold a link — the same treatment
           Proposals gets when DISABLED, three lines above, and it never wears a badge.
           ⭐ 2026-09-25: `inviteVisible` is TRUE for every player in good standing now (the unpaid
           invite), and FALSE for a closed/suspended/self-excluded account and for an agent out of
           standing. ⛔ The label is `t.profile.inviteFriends` — the page's own name, the same words
           the avatar menu, the /profile row, the bottom rail and the footer use (2026-09-26: the
           bare verb "Invite" was not recognised as the invite on a phone) — and it must stay
           neutral: `invitePaid` decides the wording in the avatar menu, and this menu has no room
           for a promise it would have to retract. */
        ...(inviteVisible
          ? [{ href: "/profile/invite", label: t.profile.inviteFriends } as NavItem]
          : []),
        { href: "/leaderboard",    label: t.nav.leaderboard },
      ]
    : RESULTS_ROW;

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
      {/* ⚠️ `px-2` BELOW `sm`, NOT `px-3` — the last 8px, and the only one left that costs no
          control. At 320 signed in the right cluster needed 273px into 254px of room. The caret
          yield (14px, `language-menu.tsx`) and the avatar's duplicate gap (4px,
          `avatar-menu.tsx`) together return 18 — one short of merely fitting, and nine short of
          the slack THIS FILE set as the standard at 360: *"8px leaves 9px, which is the
          difference between 'fits' and 'fits reliably'."*
          ⭐ The bar is its own surface, not page content, so its gutter is allowed to differ
          from the page's at the one width where the row is full. ⛔ Below `sm` only — above
          it the bar follows the page/footer gutters (`px-3`, then `px-6`). */}
      <div className="mx-auto max-w-board flex items-center h-full gap-2 px-2 sm:gap-4 sm:px-3 lg:gap-2 lg:px-6 xl:gap-4">
        {/* Brand lockup — kit COMPONENTS §14: "inside a `min-height: 44px` link".
            ⚠️ It was 136×33, i.e. UNDER the 44px floor on the control that takes a reader back to
            the board from anywhere in the product. Pre-existing rather than introduced here, and
            surfaced by measuring every control in the bar rather than only the ones this batch
            added — the kit had already specified the fix. Below xl, the mark alone is 26px;
            its 40px hit box is centred with 7px negative margins on each side, so the tightly
            measured 320px row and the mark's ink stay in place. The full lockup resets margins. */}
        <Link
          href="/"
          aria-label={`50pick ${t.common.home}`}
          className="-mx-[7px] inline-flex min-h-[44px] min-w-[var(--tap-min)] shrink-0 items-center justify-center hover:opacity-90 transition-opacity xl:mx-0"
        >
          {/* M8 — the mark performs: one flip on its own needle axis per hover
              (.mark-flip-i), on the LOGO only. Wrapped on the mark span, not the
              lockup, so the wordmark never rotates with it. */}
          {/* ⭐ THE MARK CARRIES THE BRAND BELOW `xl`; THE FULL LOCKUP RETURNS AT 1280.
              This is the SAME call Ali made at `2xl` — when the row is over-subscribed,
              the money wins the room — applied at the other band where it is over-
              subscribed, so the rule is one rule and not two exceptions.
              ⚠️ Measured on the real page, not reasoned: with the balance capsule present
              the row ran 35px past 1024 in EN and **77px in Swahili**, which is `E-190`'s
              band and `E-190`'s failure mode — the account menu leaving the screen. The
              lockup is 136px and the mark is 26px, so yielding it returns 110px, the only
              single change that clears Swahili with room to spare.
              ⛔ The brand does not disappear — the mark IS the brand, it keeps the same
              44px home link and the same hover performance, and the wordmark comes back
              the moment the row can afford it. A wordmark is decoration; a balance is
              information a player came for. */}
          <span className="mark-flip-i inline-flex xl:hidden"><FiftyMark size={26} /></span>
          <span className="hidden xl:inline-flex"><FiftyLockup size={22} markClassName="mark-flip-i" /></span>
        </Link>

        {/* Nav links — primary nav shows from `lg` (IA review R1). Core links
            are always inline; overflow links render inline only at `xl` and
            otherwise live in the "More" menu (rendered lg-only). */}
        <nav className="ml-2.5 hidden lg:flex items-center gap-0.5" aria-label={t.nav.primary}>
          {CORE_ITEMS.map((it) => (
            <NavLink key={it.href} it={it} pathname={pathname} standIn={standIn} />
          ))}
          {/* ⛔ THE OVERFLOW LINKS STAY IN "MORE" AT EVERY WIDTH — Ali, 2026-08-25.
              They used to promote inline at `2xl`, and that is what took the balance
              pill's room on the widest screens: the container is capped at
              `max-w-board` (1480), so past 1536 the bar gains NO width — it only gains
              three more links. ⭐ Measured in Swahili at 1536 the row was ALREADY 46px
              over its own container with the links inline and no pill at all.
              **The money wins the room.** Nothing is hidden that was not already
              hidden at 1024–1535, where these same three have always lived in `More`. */}
          <NavMore items={MORE_ITEMS} label={t.common.more} />
        </nav>

        <div className="flex-1" />

        <div className="shrink-0 flex items-center gap-1 sm:gap-2">
          {/* ⭐ ONE 44×44 LANGUAGE CONTROL, AT EVERY WIDTH — kit §2. The 3-pill capsule this
              replaces was hidden below 640 AND hidden again across 1024–1279 (the band where the
              desktop nav turns on and the cluster overflowed 1024), so the control a trilingual
              product depends on was absent on a phone and absent on a small laptop, with the
              avatar menu carrying a duplicate picker to cover the gap. One trigger, always
              present, no duplicate. */}
          <LanguageMenu />

          {/* 🔴 THE CAPSULE SHOWS AT EVERY BALANCE, ZERO INCLUDED — ALI, 2026-09-28: "have balance
              always visible please, because user should know he's 0."
              ⛔ THIS OVERTURNS R1, WHICH IS DELETED RATHER THAN ARGUED WITH. R1 read: "at zero the
              capsule gives way to a gold Deposit — never 'TZS 0' in the header (the delivery's V11)".
              It was live for two days. The owner's reason beats the delivery's: a player whose balance
              is zero is exactly the player who needs to be told so, and a header that simply omits the
              figure leaves him to infer it from the absence of a control.
              ⚠️ AND THE DELIVERY'S V11 DOES NOT COVER THIS. Its population is the topic tiles
              (`.kp-topic__m`, `.kp-topic__pool`) and the hero board's price — a tile ADVERTISING an
              empty book, which is a different claim from a player reading his own wallet. Checked in
              `scripts/qa/landing-ten.mjs`, not assumed.
              A FROZEN wallet keeps its capsule too: the Wallet it opens is where the freeze is
              explained, and Deposit is refused to it anyway. */}
          {user.isAuthed && user.balance !== null && user.balance !== undefined && (
            // ⭐ THE BALANCE IS VISIBLE AT EVERY WIDTH — Ali, 2026-08-25, after players
            // voted DOWN the phone-only wallet icon that used to stand in for it.
            //
            // 🔴 WHAT THIS REPLACED, AND WHY IT READ AS A BUG. The old ladder was
            // `hidden sm:flex lg:hidden xl:flex 2xl:hidden` — shown, hidden, shown, hidden
            // as the window WIDENS. Non-monotonic, so the same account on the same build
            // showed a balance on a 1440 laptop and none on a 1920 monitor, and the only
            // way to explain it was to read this comment. **A responsive rule a player
            // experiences as randomness is a defect even when every branch is deliberate.**
            //
            // ⚠️ EACH BRANCH HAD A REAL REASON, and none of them was "there is no room" —
            // they were all "something else won the room". Below `sm` the deposit CTA and
            // the eye won it; at `lg` the desktop nav did; at `2xl` three overflow links
            // (Propose · Invite · Top) promoted inline and won it. The bar's container is
            // capped at `max-w-board` (1480), so widening past 1536 adds NO room — it only
            // adds links. ⭐ **Ali's call: the money wins.** Those three stay in `More` at
            // every width now (see MORE_ITEMS above), which is exactly where they already
            // live at 1024–1535, so nothing is hidden that was not already there.
            //
            // ⛔ AND THE PILL IS NOW THE WALLET DOOR AT EVERY WIDTH — it has always been a
            // `<Link href="/wallet">`. That is why removing the icon costs nothing: the
            // door did not go away, the DUPLICATE did.
            <WalletBalancePill balance={liveBalance} held={!!user.walletHeld} onBreak={onBreak} />
          )}

          {/* ⛔ THE WRAPPER SPAN IS LOAD-BEARING — `hidden lg:inline-flex` ON the button
              DOES NOT WORK. `.btn` sets `display: inline-flex` at globals.css:1118, which is
              AFTER `@tailwind utilities` (line 19), so at equal specificity the component
              class wins and `.hidden` is simply ignored. Measured, not reasoned: the first
              attempt put the classes on the <Link> and the CTA still rendered at 360, 33px
              past the viewport edge. The span is not a `.btn`, so the utility applies to it.
              ⚠️ This is the idiom this file already uses for the same reason. */}
          {/* ⭐ …AND NOT DURING THE READER'S OWN BREAK (MASWALI-BUILD S5 round 2 · PLATFORM, 2026-10-22; the hub lane's reader
              finding, the lead's approval): `/wallet/deposit` refuses a player on a break, and the break rule offers no
              deposit door (DESIGN_AUTHORITY, R4-I and R6-A) — the journey's "+ Weka pesa" already yields. Withheld without a
              word, as the journey's pill is; `onBreak` is AppShell's `promoSuppressed`, handed only while true (an OFFER's
              gate, failing open). The rail's coin turns into the Wallet door for the same reason (`bottom-nav.tsx`). */}
          {user.isAuthed && !user.walletHeld && !onBreak && !pathname.startsWith("/wallet/deposit") && (
            // The money-in door uses the shared gilt-metal skin and keeps its pill geometry.
            /* 🔴 THE DEPOSIT CTA YIELDS BELOW `lg`, AND THE RULE IS **ONE DEPOSIT PER SCREEN**.
               UPDATE-2026-09-28 §1: below 1024 the bottom rail shows (`lg:hidden`) and its CENTRE
               COIN is the wallet's door, so a second Deposit in this header would be the same
               control twice on one screen. At 1024 and up there is no rail, so this pill is the
               only one and it stays exactly as E-190 left it. `bottom-nav.tsx` is where the coin
               and this hand-off are written down.
               ⭐ THE EARLIER RULE WAS `sm`, AND IT WAS FORCED BY MEASUREMENT — the numbers are kept
               because they still describe this bar, and because they say what the new rule INHERITS.
               Production, 2026-08-25: at 360 the row's content box is 328px, and after the logo (26)
               and two 12px row gaps the whole right cluster gets exactly **278px**, which is what it
               measured — 100% capacity, ZERO slack, in all three locales. With the balance capsule
               present the five controls needed 321px. Three remedies were costed:
                 · K/M compact always ................ 301px  ✗ still over, and it kills
                                                              the rolling counter
                 · compact AND no eye ................ 273px  ✗ fits, but drops the eye
                 · Deposit yields .................... 269px  ✓ 9px slack
               ⭐ `lg` is strictly wider than `sm`, so every width the old rule protected is still
               protected, and 640–1023 gains back the widest control in the row.
               ⚠️ THE CONTROL IS NOT LOST BELOW 1024 — it MOVED, which is why this is a yield and
               not a deletion. The capsule beside it is also still a `<Link href="/wallet">`.
               ⛔ The other four controls have no alternative. The avatar menu is the only path to
               profile and sign-out (`E-190` severed it once); the bell carries the unread count; the
               language control is the one a trilingual product cannot do without.
               ⚠️ ONE CLASS REVERSES THIS if the commercial call goes the other way. */
            /* ⭐ R1 (2026-09-26), REWRITTEN 2026-09-28 · "AT ZERO THIS IS THE WALLET'S DOOR AT EVERY
               WIDTH" IS STILL TRUE — IT IS JUST NO LONGER THIS CONTROL THAT CARRIES IT EVERYWHERE.
               Below 1024 the rail shows (`lg:hidden`) and its centre COIN is that door; at 1024 and up
               there is no rail, so this pill is. One Deposit per screen (UPDATE-2026-09-28 §1), and
               R1's ternary goes with it: both cases now yield at the same width, because what decides
               this pill's PRESENCE is the rail's presence, not the balance.
               ⚠️ R1's reasoning is intact where it still buys something — see the LABEL below. */
            <span className="hidden lg:inline-flex">
            <Link
              href="/wallet/deposit"
              aria-label={t.common.deposit}
              /* V25 counts Deposit controls per REGION, and it may identify them neither by a
                 visible word (three locales) nor by `href` alone — `cashback-promo.tsx` is a
                 legitimate second /wallet/deposit CTA. The testid is the identity. */
              data-testid="deposit-header"
              className="btn gilt-metal btn-md btn-pill"
            >
              <I.arrowDownToLine s={14} />
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
              {/* ⛔ THE LABEL YIELDS AT THE lg–xl BAND, IN EVERY BALANCE STATE, AND THAT FOLLOWS FROM
                  THE LINE ABOVE. It briefly did not: while R1 hid the capsule at zero, the zero case had
                  room for the label and took it. Ali's 2026-09-28 ruling puts the capsule back at zero,
                  so the room is taken again and the label must yield again — the two are one decision,
                  not two, and changing one without the other is how E-190 happened.
                  🔴 E-190, measured: at 1024 signed in with a capsule beside it, the right cluster ran
                  31px past in EN and 65px in SW, and what fell off the end was the ACCOUNT MENU — the
                  only desktop path to profile and sign-out. The label is 108px in EN, 103px in SW.
                  ⚠️ `hidden xl:inline` is the old `hidden sm:inline lg:hidden xl:inline` with the bands
                  this pill no longer reaches removed. Same rule, fewer words. */}
              <span className="hidden xl:inline">
                {t.common.deposit}
              </span>
            </Link>
            </span>
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

              🔴 E-276 (2026-09-05) · AND "EVERY WIDTH" HAD STOPPED BEING TRUE FOR `Sign in`.
              Ali, on his own phone: *"when I'm a player on phone not signed in there is only a
              Sign up button."* Measured signed-out on production at 320 / 360 / 390 / 414:
              `a[href="/auth/login"]` rendered at **width 0** at every one of them. **A returning
              player had no way into their account from the header** — the only account control
              on the screen was the one that makes a NEW account.

              ⭐ THE HISTORY IS THE ARGUMENT, AND IT IS WRITTEN IN THIS FILE'S OWN COMMENT. The
              yield was justified as "at 360 the two pills plus the language control and the
              avatar do not fit" — but the same paragraph then recorded that the `hidden` had
              NEVER APPLIED (it sat on a `.btn`, whose own `display: inline-flex` wins at equal
              specificity), that the control had been rendering at 91px all along, and that **it
              never overflowed, because a guest has no balance capsule and no bell.** So the
              premise was measured false at the time and the fix wrapped it in a span that made
              the hiding finally work — closing a door that had never actually been shut.

              ⭐ RE-MEASURED BEFORE CHANGING ANYTHING: with both pills shown, `pastRight` is 0 at
              360, 390 and 414, and at 320 the pair ended 0.5px over. That last half-pixel is the
              whole reason `.kp-auth-cta` exists — the pair tightens by 6px a side below `sm`
              (globals.css), same height, same radius, same idiom — after which `pastRight` is
              **0 at 320 too**. ⛔ Not a new breakpoint: `max-width: 639.98px` is the mirror of
              Tailwind's `sm`, the boundary this pair was already being judged against.

              ⭐ B3 (route audit 2026-10-06) · THE TWO DOORS RETURN A GUEST TO THIS PAGE, AND KEEP THE INVITE THAT
              BROUGHT THEM (`GuestAuthDoors`, below). The fallback draws the bare doors while the page's query is
              read, so the pair never waits on it. */}
          {!user.isAuthed && (
            <Suspense fallback={<GuestAuthPills signIn="/auth/login" signUp="/auth/register" />}>
              <GuestAuthDoors />
            </Suspense>
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
            inviteVisible={inviteVisible}
            invitePaid={invitePaid}
          />
        </div>
      </div>
    </header>
  );
}

/**
 * A guest's two account actions — `Sign in` the ghost pill, `Sign up` the filled one, both `.kp-auth-cta` (E-276, above).
 * One drawing for the bare doors (the Suspense fallback) and for the doors that know the page (`GuestAuthDoors`).
 */
function GuestAuthPills({ signIn, signUp }: { signIn: string; signUp: string }) {
  const { t } = useT();
  return (
    <>
      <Link
        href={signIn as never}
        aria-label={t.common.signIn}
        className="btn btn-ghost btn-md btn-pill kp-auth-cta"
      >
        {t.common.signIn}
      </Link>
      <Link
        href={signUp as never}
        aria-label={t.common.signUp}
        className="btn btn-primary btn-md btn-pill kp-auth-cta"
      >
        {t.common.signUp}
      </Link>
    </>
  );
}

/**
 * ⭐ B3 (route audit 2026-10-06) · THE HEADER'S DOORS COME BACK TO THIS PAGE, WITH THE INVITE.
 * 🔴 Both pills were bare `/auth/login` and `/auth/register`: a guest who opened a market from a shared link and
 * tapped Sign up lost the market AND the `?ref=` that brought them, so the sharer or agent was never credited —
 * permanently (`recruitedBy` is written once, at sign-up). `authDoorHrefs` (src/lib/auth-landing.ts) is the one rule:
 * this page as `next` (on an /auth page, only that page's own next), and the referral code normalised or dropped.
 * ⚠️ `useSearchParams` is why the caller wraps this in Suspense: a statically drawn page renders the fallback's bare
 * doors on the server, and this takes over in the browser.
 */
function GuestAuthDoors() {
  const pathname = usePathname();
  const search = useSearchParams();
  const { signIn, signUp } = authDoorHrefs(pathname ?? "/", new URLSearchParams(search?.toString() ?? ""));
  return <GuestAuthPills signIn={signIn} signUp={signUp} />;
}

/**
 * A single primary-nav link.
 *
 * ONE BOX for every item — 44px tall, identical horizontal padding. The accent (Up & Down) pill
 * used to run 6px 14px against 7px 12px for its siblings, so it read visibly taller and wider than
 * every other link. Height and padding are now identical across all links; the accent differs only
 * in ink and a dot (identity), never in size or shape.
 */
function NavLink({ it, pathname, standIn }: { it: NavItem; pathname: string; standIn: string | null }) {
  const { t } = useT();
  const active =
    it.href === "/markets" ? pathname === "/" || pathname.startsWith("/markets")
    : it.href === "/proposals" ? pathname.startsWith("/proposals")
    : it.href === "/results" ? pathname.startsWith("/results")
    : it.href === "/positions" ? pathname.startsWith("/positions")
    : it.href === "/updown" ? pathname.startsWith("/updown")
    // S5-TAB: Millionea's link is current on the product's every page, as Up & Down's is on its history — its own path or
    // one below it, never a path that only shares its letters (`/millioneas`).
    : it.href === "/millionea" ? pathname === "/millionea" || pathname.startsWith("/millionea/")
    : pathname === it.href;
  // S5-FIX-PLATFORM D13: on a break, Millionea's page lights the destination standing in for its undrawn link.
  const lit = active || it.href === standIn;
  const accent = it.accent === true;
  return (
    <Link
      href={it.href as never}
      aria-current={lit ? "page" : undefined}
      // ⛔ DG-P-01 — COLOUR, BACKGROUND AND THE TRANSITION LIVE IN `.kp-navlink` (globals.css), NOT
      // HERE. They were inline, which is why this link had no hover for its whole life: an inline
      // style outranks every selector, so no class could add one, and the `transition` declared
      // beside them had nothing to animate. Accent and active are now `data-accent` /
      // `aria-current`, read by that rule. Putting either back inline re-kills the hover.
      data-accent={accent ? "" : undefined}
      className="kp-navlink inline-flex items-center gap-1.5 whitespace-nowrap"
      style={{
        // 44px is the tap floor and the kit's destination height. The nav used to be 34px —
        // under the floor on the primary navigation of a money product.
        minHeight: 44,
        padding: "0 var(--sp-3)",
        // DESTINATION geometry, for every item including Up & Down. `--r-pill` is reserved for an
        // account action now, so shape carries exactly one meaning.
        borderRadius: "var(--r-sm)",
        fontSize: 13.5,
        fontWeight: lit ? 600 : 500,
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
      {it.ink ? <span className="kp-millionea-ink">{it.label}</span> : it.label}
      {it.proposalsBadge && (
        <ProposalsStateBadge state={it.proposalsBadge} comingSoonLabel={t.proposals.comingSoonTag} maintenanceLabel={t.proposals.maintenanceTag} size="xs" />
      )}
    </Link>
  );
}
