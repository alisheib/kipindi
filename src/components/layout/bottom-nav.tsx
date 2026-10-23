"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { I, type GlyphKey } from "@/components/ui/glyphs";
import { NavGlyph } from "@/components/ui/nav-glyph";
import { useT } from "@/lib/i18n";
import { NavMore } from "@/components/layout/nav-more";
import { classicMillioneaLit, classicMillioneaStandIn } from "@/lib/nav/active-tab";
import { MARK } from "@/lib/brand-mark";
import type { ProposalsState } from "@/lib/server/proposals-config";

/**
 * THE BOTTOM RAIL — round-2 kit §2 / COMPONENTS §14, rebuilt in batch 3.
 *
 * FIVE SLOTS: Markets · Up & Down · **Deposit** · Live · More.
 * ⭐ …AND WHILE MASWALI MILLIONEA'S DOOR IS DRAWN, MILLIONEA TAKES LIVE'S PLACE (Ali, 2026-10-22: "ok replace live please …
 * keep live in more"; DESIGN_AUTHORITY §M8a item 11): Markets · Up & Down · **Deposit** · Millionea · More, and Live is More's
 * first row. The five equal tracks and the centred coin stand. The track is its siblings' own (slot, pip, lit pill, label);
 * only its label's ink differs, and its glyph rests in gold, as on the journey's rail. While the door is not drawn
 * (WITHDRAWN, a reader the rollout does not admit, a break) the rail is the one above, byte for byte.
 *
 * ⭐ THE CENTRE IS THE WALLET'S DOOR — UPDATE-2026-09-28 §2, AND IT IS ALI'S RECORDED OVERRIDE
 * OF "THE RAIL IS DESTINATIONS ONLY" (defect 2 below). The override costs the rule nothing: the
 * centre is the `/wallet/deposit` ROUTE, not an action, and it is the SAME route for a guest as
 * for a player — "a destination does not depend on having an account" — so a visitor who taps it
 * meets the normal auth gate with `next=`. There is no "Join" in the rail; auth stays in the
 * header. ⛔ A HELD wallet gets no money-in control: `/wallet/deposit` refuses it, so that slot
 * becomes the Wallet door instead, which is the header's own rule and not a new one.
 *
 * ⭐ AND RESULTS MOVED INTO `More` TO FREE THE CENTRE — it did NOT disappear. Defect 1 below is
 * precisely "Results unreachable on a phone", so putting it back out of reach would re-open a
 * structural defect this file exists to record. `moreActive` marks `More` on /results with no
 * extra code. It also STAYS in the desktop header's `CORE_ITEMS` (§3 of the same update): the
 * phone toolbar was the request, and no primary destination is hidden on a tablet or a laptop.
 *
 * ⚠️ ONE DEPOSIT PER SCREEN. Below 1024 this coin is the only one and the header's deposit pill
 * yields (`top-app-bar.tsx`, `hidden lg:inline-flex`); at 1024 and up this rail is absent
 * (`lg:hidden`) and the pill is the only one. `qa:landing-ten` V25 is what holds that true.
 *
 * ── 🔴 WHAT WAS WRONG, AND ALL THREE WERE STRUCTURAL ─────────────────────────────────────────
 * 1. **`Results` and `Top` were unreachable on a phone.** The guest rail carried four items and
 *    the authed rail five, and neither included Results — not in an overflow, simply absent. A
 *    whole nav destination existed only on desktop.
 * 2. **`Sign in` sat in the rail as a destination.** Auth is an ACTION, and it now lives in the
 *    header at every width, which is what frees the fifth slot. The rail is destinations only.
 * 3. **The rail said "current" with `--aqua-300`** — `oklch(72% 0.11 195 / 0.18)` and a matching
 *    glow, both hand-typed. The desktop bar said it with `--pill-active`. Two active languages for
 *    one idea, and one of them a literal. **Active is now `--pill-active` on the pip plus a
 *    `--text` label, the same sentence the desktop bar speaks.** Aqua is gone from navigation.
 *    ⭐ Since PHOSPHOR-MIGRATION W3 (R-INDICATOR 3B, Ali 2026-10-17) that sentence is the destination's
 *    FILL glyph on the opaque `--nav-pill`, in every destination bar: the rail, the journey's tabs,
 *    both desktop bars and the admin sidebar. `--pill-active` stays the filters' and menus' selection.
 *
 * ── AND THE SURFACE ITSELF ────────────────────────────────────────────────────────────────────
 * It was a floating inset capsule on a 78% `--bg-elevated` mix with a 16px backdrop blur — the
 * same see-through problem as the header, on the highest chrome on a phone. The kit specifies
 * `--panel`, a 1px `--border` top, `--shadow-overlay-up` and safe-area padding: an opaque bar
 * anchored to the bottom edge. `public-footer.tsx` — the last thing in the document on every
 * shell page — reserves `pb-[calc(88px+env(safe-area-inset-bottom))]` for it (2026-09-13: moved off
 * `<main>`, where a second copy stacked into ~250px of blank above the footer).
 *
 * ⭐ AND IT NO LONGER COLLIDES WITH THE NEEDLE. The fidget's badge overlapped the rail's FIRST
 * SLOT at 360 in the batch-2 baseline frames, and its `#hit` area is `pointer-events: auto` — so a
 * tap meant for Markets could grab the toy instead. The physics is vendored and do-not-edit; its
 * RESTING POSITION is not. ⚠️ (2026-10-08) There is no `needle-rest.css` — this line used to cite one and
 * no commit ever added it. The rest position is host logic in `needle.tsx` (side rails only, `nearestEdge`;
 * E-413's clear-rest glide), and the rail's centre coin is a `data-needle-keepout` below.
 */
export function BottomNav({ isAuthed = false, proposalsState, inviteVisible = false, walletHeld = false, onBreak = false, millionea = false, millioneaOnBreak = false }: { isAuthed?: boolean; proposalsState: ProposalsState; inviteVisible?: boolean; walletHeld?: boolean; onBreak?: boolean; millionea?: boolean; millioneaOnBreak?: boolean }) {
  const pathname = usePathname();
  /** D13 · on a break, a Millionea page lights the destination the journey's table names (null everywhere else). */
  const standIn = millioneaOnBreak ? classicMillioneaStandIn(pathname) : null;
  const { t } = useT();

  /** The destinations FLANKING the centre — identical for guest and player, because a destination
   *  does not depend on having an account. What changes is what `More` carries.
   *  ⚠️ Three, not four: Results moved into `More` (see the header note) and the centre coin took
   *  the middle track. The grid below is still five equal tracks.
   *  ⭐ THE FOURTH TRACK IS MILLIONEA'S WHILE ITS DOOR IS DRAWN, LIVE'S OTHERWISE (Ali, 2026-10-22; DESIGN_AUTHORITY §M8a
   *  item 11). `millionea` is the shell's one answer, handed only while it is true (the rollout admits this reader and the
   *  reader is not on a break; D3), so a reader it is hidden from is served today's rail. Live then leads More
   *  (`liveRow`, below): moved, never dropped. */
  const items: { href: string; glyph: GlyphKey; label: string; ink?: boolean }[] = [
    { href: "/markets", glyph: "markets",    label: t.common.markets },
    /* The full product name wraps in the Swahili phone rail. The accessible name stays
       the visible label (WCAG 2.5.3 label-in-name: a voice user says what they see). */
    // One meaning, one glyph (PHOSPHOR-MIGRATION R-LEXICON): Up & Down is `trade` in both shells; Live is `live`.
    // ⭐ Drawn exactly as its siblings — no dot, no ink of its own (Ali, 2026-10-23; `RailDest` below).
    { href: "/updown",  glyph: "trade",      label: t.nav.updown },
    millionea
      ? { href: "/millionea", glyph: "millionea", label: t.millionea.productLabel, ink: true }
      : { href: "/live",      glyph: "live",      label: t.nav.live },
  ];

  /** THE CENTRE SLOT. `/wallet/deposit` for everyone; a guest meets the auth gate on arrival.
   *  ⛔ A HELD WALLET IS THE ONE BRANCH, and it is not a styling choice: `/wallet/deposit` REFUSES
   *  a held wallet, so a coin offering money-in there would be a door that cannot open. The slot
   *  becomes the Wallet door and the coin drops its "+" for the mark's hub. Identical reasoning,
   *  and identical `walletHeld` input, to the header pill's own guard.
   *  ⭐ …AND A BREAK IS THE SECOND (MASWALI-BUILD S5 round 2 · PLATFORM, 2026-10-22; the hub lane's reader finding, the
   *  lead's approval): during a player's own break `/wallet/deposit` refuses too (`wallet-service.deposit()`: a held wallet,
   *  then the break), and DESIGN_AUTHORITY's break rule offers no deposit door (R4-I, R6-A) — the journey's Wallet already
   *  drops its own. So on a break the slot is the Wallet door, drawn exactly as for a held wallet. `onBreak` is AppShell's
   *  `promoSuppressed`, handed only while true: it gates an OFFER and fails open (`feature-state.ts` LAW 1) — after a failed
   *  read the coin offers Deposit and the deposit screen still refuses. */
  const moneyInClosed = walletHeld || onBreak;
  const coinHref = moneyInClosed ? "/wallet" : "/wallet/deposit";
  const coinLabel = moneyInClosed ? t.nav.wallet : t.common.deposit;

  /** `More` carries the rest. Positions / Wallet / Top / Invite / Propose for a player; the
   *  public destinations for a visitor, who has no positions or wallet to reach. */
  /* ⭐ DG-P-11 — TWO DEFECTS, ONE LIST, AND BOTH ONLY VISIBLE WHEN THIS LIST IS READ BESIDE
     THE BAR'S (§0a: "which destinations live behind More" was answered in two places that
     disagreed).
     1. THE AUTHED BRANCH OMITTED /proposals, WHICH THE AUTHED TOP BAR CARRIES. `moreActive`
        below is the ONLY thing that can mark an overflow destination under 1024, and the four
        rail slots are Markets / Up & Down / Live / Results — so a signed-in player on a phone
        at /proposals, /proposals/[id] or /proposals/new had NOTHING marked anywhere on the
        page, while the same player on a laptop had the bar's `More` marked. Signing in also
        REMOVED a destination a guest could reach here, which is not a decision anyone made.
     2. THE GUEST BRANCH SHOWED /proposals UNCONDITIONALLY. `proposals-config.ts` states
        DISABLED as "every entry point is hidden; direct nav to /proposals* is redirected" —
        and every other entry point already obeys it (the top bar's `MORE_ITEMS`, the avatar
        menu, `public-footer.tsx`). This rail was the one that did not, so a visitor could be
        shown a door the operator had closed and be redirected on arrival.
     ⛔ NOT fixed by deleting /proposals from the top bar to make the two agree: that hides a
     live destination to buy a symmetry.
     ⛔ NOT fixed by a fifth rail SLOT either — the rail is five by design and the grid below
     is five equal tracks. It goes behind `More`, where its three siblings already live. */
  const proposalsRow: { href: string; label: string; proposalsBadge?: ProposalsState }[] =
    proposalsState !== "DISABLED"
      ? [{ href: "/proposals", label: t.common.propose, proposalsBadge: proposalsState }]
      : [];
  /* ⛔ INVITE IS ABSENT UNLESS THIS VIEWER MAY ACTUALLY HOLD A LINK — the same shape as
     `proposalsRow` above, and for the same reason: a destination that is closed for this viewer
     must not be shown at all. It used to sit here permanently wearing a "coming soon" flag,
     which was honest while the programme was merely unopened; a row goes rather than wears a
     badge.
     ⭐ 2026-09-25 — `inviteVisible` is TRUE for every player in good standing now (the UNPAID
     invite: a tracked link that pays nothing), and FALSE for a closed / suspended /
     self-excluded account and for an agent out of standing. The rule above is unchanged; only
     the population it admits is.
     ⚠️ The role lives on the server, so the SHELL resolves this and passes the answer —
     `feature-state.ts` explains why a client component never reads the state itself.
     ⭐ 2026-09-26 — THE ROW SAYS WHAT THE PAGE IS CALLED. It read the bare verb "Alika" /
     "Invite" / "邀请" while the page, the avatar menu and the /profile row all say "Alika
     marafiki · Invite friends · 邀请朋友" — so on a phone, where this sheet is the most-used door,
     the owner looked for the invite and did not recognise the one-word row as it. One name for
     one destination, and it is as neutral as the old one: it names the act, not a reward. */
  const inviteRow: { href: string; label: string }[] =
    inviteVisible ? [{ href: "/profile/invite", label: t.profile.inviteFriends }] : [];
  /* ⛔ WALLET LEAVES `More` EXACTLY WHEN THE CENTRE SLOT BECOMES IT. Two rows to one destination
     would also make `moreActive` and the coin BOTH read as current on /wallet — two "you are here"
     marks on one bar, which is the same class of defect as defect 3 below (two active languages for
     one idea). When the wallet is not held, the coin points at /wallet/deposit and this row is the
     only way to /wallet, so it stays. */
  const walletRow: { href: string; label: string }[] =
    moneyInClosed ? [] : [{ href: "/wallet", label: t.nav.wallet }];
  /* ⭐ LIVE LEADS MORE WHILE MILLIONEA HOLDS ITS TRACK (Ali, 2026-10-22: "keep live in more"; DESIGN_AUTHORITY §M8a item 11),
     for a player and a guest alike: More's FIRST row, above Results, so the destination the track gave up is one tap from
     the same slot. Present exactly when the fourth track is Millionea's (the same `millionea`), so Live is drawn once.
     ⚠️ Until that ruling Millionea was this More's first row (S5, then S5-TAB's ink, 2026-10-19); its track replaced it. */
  const liveRow: { href: string; label: string }[] = millionea ? [{ href: "/live", label: t.nav.live }] : [];
  const moreItems: { href: string; label: string; proposalsBadge?: ProposalsState }[] = isAuthed
    ? [
        ...liveRow,
        { href: "/results",        label: t.common.results },
        { href: "/positions",      label: t.common.positions },
        ...walletRow,
        { href: "/leaderboard",    label: t.nav.leaderboard },
        ...inviteRow,
        ...proposalsRow,
      ]
    : [
        ...liveRow,
        { href: "/results",     label: t.common.results },
        { href: "/leaderboard", label: t.nav.leaderboard },
        { href: "/fairness",    label: t.footer.resolutionAttestation },
        ...proposalsRow,
      ];

  /** While Millionea's track is drawn, a Millionea page lights it, and Millionea's tickets light Positions — Tiketi zangu's
   *  classic destination, a More row (§M8a item 11; `classicMillioneaLit`). Null everywhere else and while the door is not
   *  drawn (then D13's `standIn` answers a break). */
  const millioneaLit = millionea ? classicMillioneaLit(pathname) : null;
  /** The More row standing for the page when the page is none of the rows' own: Positions on Millionea's tickets (the
   *  track drawn), or D13's stand-in on a break. */
  const moreCurrent = millioneaLit === "/positions" ? millioneaLit : standIn;
  const isActive = (href: string) => {
    // S5-FIX-PLATFORM D13: on a break, a Millionea page lights the slot standing in for its undrawn More row (Markets),
    // or More itself where the stand-in is one of its rows (Positions, below), as the journey falls back.
    if (href === standIn) return true;
    if (href === "/markets") return pathname === "/" || pathname.startsWith("/markets");
    if (href === "/updown") return pathname.startsWith("/updown");
    if (href === "/millionea") return millioneaLit === "/millionea";
    /* ⚠️ THE `/results` BRANCH IS GONE BECAUSE THE SLOT IS. It is `More`'s now, and `moreActive`
       below already does prefix matching over every `More` row — a dead branch here would read
       like a slot that still exists. */
    return pathname === href;
  };
  /** The coin reads as current on its own route — prefix, because /wallet/deposit has a
   *  `/return` child the player lands on coming back from the provider. */
  const coinOn = pathname.startsWith(coinHref);
  /** `More` reads as current when the page behind it is one of its own — and never while the coin is current. Its Wallet
   *  row (`/wallet`) is a prefix of the coin's `/wallet/deposit`, so on the coin's own page both lit: two "you are here"
   *  marks on one bar, which the opaque pill made plain (PHOSPHOR-MIGRATION W3's tile read; the double-lit was older). */
  const moreActive = !coinOn && moreItems.some((m) => pathname.startsWith(m.href) || m.href === moreCurrent);

  return (
    <nav
      aria-label={t.nav.primary}
      className="lg:hidden fixed inset-x-0 bottom-0 z-40 kp-rail"
      /* ⭐ THE NEEDLE COLLISION, FIXED AT THE MECHANISM THAT ALREADY EXISTED FOR IT.
         The fidget's badge overlapped this rail's FIRST SLOT at 360 in the batch-2 baseline
         frames, and its `#hit` area is `pointer-events: auto` — so a tap meant for Markets could
         grab the toy instead, on the primary navigation of a money product.
         `needle.tsx:200` already polls `[data-needle-keepout]` and feeds those rects to the
         engine as obstacles (the simulator supports interior/overlapping/enclosing ones and
         `test:needle` tortures them). It had ZERO consumers, so the feature existed and nothing
         used it. One attribute is the whole fix: no z-index change, and not one line of the
         vendored do-not-edit physics touched. */
      data-needle-keepout=""
      style={{
        "--kp-coin-green": MARK.green,
        "--kp-coin-red": MARK.red,
        "--kp-coin-gold": MARK.gold,
        "--kp-coin-pivot": MARK.pivot,
      } as CSSProperties}
    >
      {/* 2026-09-13 — `minmax(0, 1fr)`, not `1fr`: a bare `1fr` track has an `auto` minimum, so a
          long Swahili label ("Juu na Chini", "Mubashara") widened its slot into its neighbour instead
          of ellipsising. `min-w-0` on the link is the other half — a flex item's minimum is
          otherwise its own nowrap label. */}
      <ul className="grid items-stretch" style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}>
        {items.slice(0, 2).map((it) => (
          <RailDest key={it.href} {...it} on={isActive(it.href)} />
        ))}

        {/* ── THE CENTRE ── the whole 64px slot is ONE link, named by its visible label. */}
        <li className="flex">
          <Link
            href={coinHref as never}
            aria-label={coinLabel}
            aria-current={coinOn ? "page" : undefined}
            data-testid="deposit-rail"
            className="kp-rail__item kp-rail__item--coin min-w-0"
            data-on={coinOn ? "1" : undefined}
          >
            {/* ⭐ THE KEEP-OUT IS ON THE COIN ITSELF, NOT ON THE SLOT OR THE NAV — AND THAT IS A
                MEASURED CORRECTION, NOT A PREFERENCE. It was first put on this slot's <Link>, and
                the drive read `keepout=FALSE` in every cell: the disc RISES OUT of its slot, so the
                slot's rect does not contain the coin's, and the rect the needle engine received did
                not describe where the product's money control actually is. The nav's own keep-out
                (above) has the same blind spot for the same reason. `needle.tsx` reads
                `getBoundingClientRect()`, which includes the lift, so the rect it gets HERE is the
                painted one. Both keep-outs stand; they are different rectangles. V22 asserts the
                coin's rect sits inside one of them, because reasoning about it got it wrong once. */}
            <span className="kp-coin" aria-hidden data-needle-keepout="">
              {/* Painted by DOM order: ring → needle → face → verb.
                  The lifted deposit coin inherits the brand mark's four colours. */}
              <span className="kp-coin__needle" />
              <span className="kp-coin__face">
                {moneyInClosed ? (
                  <span className="kp-coin__hub" />
                ) : (
                  /* The deposit's own glyph, as on every other money-in door (R-LEXICON 5.3A; the audit of
                     2026-10-19 §8a). It was a hand-drawn "+": `I.plus` is a plus inside a circle, and a
                     second ring on the disc reads as a button on a button. The arrow has no ring, and at
                     24px it is the size of the rail's other glyphs (R-RAIL 4B).
                     ⚠️ `currentColor` is the point: `.kp-coin__verb` sets the mark's navy. */
                  <I.arrowDownToLine s={24} className="kp-coin__verb" />
                )}
              </span>
            </span>
            <span className="kp-rail__label">{coinLabel}</span>
          </Link>
        </li>

        {items.slice(2).map((it) => (
          <RailDest key={it.href} {...it} on={isActive(it.href)} />
        ))}

        <li className="flex">
          {/* `More` opens upward — it is the last slot on a bar pinned to the bottom edge. */}
          <NavMore
            items={moreItems}
            label={t.common.more}
            variant="rail"
            active={moreActive}
            current={moreCurrent}
            cardSpacing
          />
        </li>
      </ul>
    </nav>
  );
}

/**
 * ONE FLANKING SLOT. Extracted only so the centre coin can sit between tracks 2 and 3 without this
 * markup existing twice — the rail is still ONE component, which `ACCEPTANCE` §C2 requires in so
 * many words: "the rail is `bottom-nav.tsx`, with no second nav component". Nothing about a slot
 * changed in the move; this is the same markup the map used before.
 * ⭐ EVERY SLOT IS DRAWN ALIKE — Ali, 2026-10-23: "people are misunderstanding and thinking there is a certain
 * notification there … please remove the golden dot, make it like other tabs please". Up & Down's 5px gilt
 * "product-line dot" on its pip's corner read as an unread badge that never clears, so it is gone: Up & Down is the
 * same slot, pip, glyph and label as Markets, in the same ink (DESIGN_AUTHORITY §K 3, "Every nav tab alike";
 * `test:nav-tabs-alike`). A notification dot is a state and stays where it is one — the journey's Akaunti tab.
 * ⭐ `ink` (Millionea's track, Ali 2026-10-22, §M8a item 11) — the slot stays its siblings' own, as the journey rail's
 * Millionea tab does: the pip rests its glyph in gold (`kp-millionea-glyph`; lit, it takes the siblings' Fill on the pill)
 * and the label's words wear Millionea's ink (`kp-millionea-ink`). Nothing else differs (globals.css, the ink's rules).
 */
function RailDest({
  href,
  glyph,
  label,
  ink,
  on,
}: {
  href: string;
  glyph: GlyphKey;
  label: string;
  ink?: boolean;
  on: boolean;
}) {
  return (
    <li className="flex">
      <Link
        href={href as never}
        aria-label={label}
        aria-current={on ? "page" : undefined}
        className="kp-rail__item min-w-0"
        data-on={on ? "1" : undefined}
      >
        {/* The pip carries the current state in the platform's one selected language (PHOSPHOR-MIGRATION W3,
            R-INDICATOR 3B): the destination's Fill glyph on the opaque royal pill, the desktop bar's own. 24px
            glyphs (R-RAIL 4B) in a 56×32 pip grown to fit them. */}
        <span className={ink ? "kp-rail__pip kp-millionea-glyph" : "kp-rail__pip"}>
          <NavGlyph glyph={glyph} on={on} s={24} />
        </span>
        <span className="kp-rail__label">{ink ? <span className="kp-millionea-ink">{label}</span> : label}</span>
      </Link>
    </li>
  );
}
