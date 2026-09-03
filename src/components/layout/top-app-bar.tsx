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
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";
import type { ProposalsState } from "@/lib/server/proposals-config";
import { inviteIsLive } from "@/lib/invite-feature";

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
  /** Invite rides `INVITE_STATE` (src/lib/invite-feature.ts) — one flag, one switch. */
  comingSoon?: boolean;
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
        { href: "/wallet",         label: t.nav.wallet },
        /* Invite & Earn is not open yet — one switch, `src/lib/invite-feature.ts`. */
        { href: "/profile/invite", label: t.common.invite, comingSoon: !inviteIsLive() },
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
            <NavLink key={it.href} it={it} pathname={pathname} />
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
            <WalletBalancePill balance={user.balance} />
          )}

          {/* ⛔ THE WRAPPER SPAN IS LOAD-BEARING — `hidden sm:inline-flex` ON the button
              DOES NOT WORK. `.btn` sets `display: inline-flex` at globals.css:911, which is
              AFTER `@tailwind utilities` (line 19), so at equal specificity the component
              class wins and `.hidden` is simply ignored. Measured, not reasoned: the first
              attempt put the classes on the <Link> and the CTA still rendered at 360, 33px
              past the viewport edge. The span is not a `.btn`, so the utility applies to it.
              ⚠️ This is the idiom this file already uses for the same reason. */}
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
            /* 🔴 THE DEPOSIT CTA YIELDS BELOW `sm`, AND IT IS FORCED BY MEASUREMENT, NOT
               PREFERENCE. Production, 2026-08-25: at 360 the row's content box is 328px,
               and after the logo (26) and two 12px row gaps the whole right cluster gets
               exactly **278px** — which is precisely what the cluster measured, i.e. the
               bar was already at 100% capacity with ZERO slack, in all three locales.
               With the balance capsule present the five controls need 321px. Three ways
               out were costed and only one survives:
                 · K/M compact always ................ 301px  ✗ still over, and it kills
                                                              the rolling counter
                 · compact AND no eye ................ 273px  ✗ fits, but drops the eye
                 · Deposit yields below `sm` ......... 269px  ✓ 9px slack
               ⭐ It is also the only one of the five with a near alternative: the capsule
               beside it IS a link to `/wallet`, where Deposit is the primary action — one
               extra tap, against a balance a player can finally see at a glance.
               ⛔ The other four have none. The avatar menu is the only path to profile and
               sign-out (`E-190` severed it once); the bell carries the unread count; the
               language control is the one a trilingual product cannot do without, and it
               was deliberately made always-present after living in two places.
               ⚠️ ONE CLASS REVERSES THIS if the commercial call goes the other way. */
            <span className="hidden sm:inline-flex">
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
              ⚠️ `Sign in` yields below `sm`: at 360 the two pills plus the language control
              and the avatar do not fit, and of the two, the one a NEW visitor needs is
              Sign up. `aria-label` keeps the shortened control named.
              🔴 AND IT WAS NOT ACTUALLY YIELDING — FOUND 2026-08-25 BY A GUARD WRITTEN FOR A
              DIFFERENT CONTROL. `hidden sm:inline-flex` sat ON the `.btn`, and
              `.btn { display: inline-flex }` is declared at globals.css:911, AFTER
              `@tailwind utilities` (line 19) — so at equal specificity the component class
              wins and `.hidden` is ignored. Measured on a real guest at 360: the control
              rendered at **91px wide**, i.e. the paragraph above has been false since it was
              written. ⚠️ It never overflowed only because a GUEST has no balance capsule and
              no bell, so the slack it was meant to create was never needed — a latent
              defect, not a visible one. The wrapper span is not a `.btn`, so the utility
              applies to it. Same trap, same fix, as the Deposit CTA above. */}
          {!user.isAuthed && (
            <>
              <span className="hidden sm:inline-flex">
              <Link
                href={"/auth/login" as never}
                aria-label={t.common.signIn}
                className="btn btn-ghost btn-lg btn-pill"
              >
                {t.common.signIn}
              </Link>
              </span>
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
        fontWeight: active ? 600 : 500,
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
