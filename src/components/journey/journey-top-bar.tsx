"use client";

/**
 * THE JOURNEY HEADER — SJ-15 (the Vodacom plan S6; `S6-PLAN.md` WP6a with amendments A5, A12 and A19).
 *
 * Built beside the classic `TopAppBar`, never inside it: AppShell (WP6b) renders this for a journey request and the
 * classic bar for every other one, so a classic visitor's header does not change by a byte.
 *
 * ── WHAT IT SHOWS ────────────────────────────────────────────────────────────────────────────────────────────────
 *   on a phone    the 26px mark in its 44px home link · 18+ · the captioned balance ("Salio" over the figure) ·
 *                 the gilt "+ Weka pesa"
 *   to a guest    the mark · 18+ · Ingia and Jisajili, at every width (E-276)
 *   from 1024     the four destinations as the kit's underline section links, then language, the bell, the account
 * WHAT shows is decided once, by `journeyHeaderState` (a guest, a balance not read, a held wallet, a break, the
 * deposit screen and its return); this file renders the answer and decides nothing about money itself.
 *
 * ── ⭐ THE S4 FIT RULES ARE STYLESHEET RULES, NOT NUMBERS HERE ──────────────────────────────────────────────────
 * The phone row was measured in Chromium with the real fonts (`VODACOM-PLAN.md` §0g design call 10): 6px gaps, the
 * 26px mark in a 44px link that borrows 9px of gutter each side, 10px capsule padding, 12/10 on the pill; below 360
 * no "+" glyph and a 12px figure. The row's gutter is the page's own, 16px below 1024 and 32px from it (2026-10-08,
 * the owner's rule: the header's edge is the page's edge at every width). From 640 the row takes the classic bar's
 * own gaps (WP6a step 1), and its right-hand controls grouped as one cluster with the cluster's own spacing, which is
 * why they sit in one wrapper here. Each is a rule in `globals.css` (the journey header's family and the capsule's),
 * so `test:journey-shell` §7 reads them as written and WP6b's header-fit gate reads them as computed (A5).
 * ⛔ No inline style here: an inline number is one a probe cannot tell from a decision.
 *
 * ── ⭐ THE "+" IS ITS OWN SPAN ───────────────────────────────────────────────────────────────────────────────────
 * The kit's button sets its own display after the utilities, so a width-hiding utility on the button itself is
 * ignored (the classic bar measured that at 360). The glyph sits in a span the stylesheet hides below 360; the words
 * and the pill's name stay at every width.
 *
 * ── ⭐ NOTHING THAT MOVES MONEY YIELDS BY WIDTH ──────────────────────────────────────────────────────────────────
 * The classic Deposit pill hides below 1024 because the classic rail carries a coin. The journey rail has none
 * (SJ-16), so here the capsule, the pill and a guest's way in show at every width; `test:wallet-reach` §8c holds
 * that, with red twins that restore each gate.
 *
 * ── ⛔ ONE UNREAD POLLER PER WIDTH ───────────────────────────────────────────────────────────────────────────────
 * The bell polls on its own every 30 s, and so does the Akaunti tab's dot. The bell shows from 1024 and the rail
 * below it, so the bell is MOUNTED only where it shows (`pollersAt`), never merely hidden: a hidden bell still asks.
 * Its slot keeps its width, so the cluster does not move when the bell arrives just after hydration — and since R4-J
 * (2026-10-09, E36) the slot is not empty until then: the server draws the bell's still twin there (`BellStill`).
 *
 * ── THE DESTINATIONS FROM 1024 ───────────────────────────────────────────────────────────────────────────────────
 * The kit's section language, not the canvas's pills (§0h point 7): an underline says "you are here" on a
 * destination's own page and on every page of its section, and A12 tells the two apart for a screen reader
 * ("page" against "true", from `tabAriaCurrent`). A guest's Tiketi zangu is a button that opens the guest sheet,
 * never a link whose navigation is cancelled: the progress bar listens in the capture phase.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiftyLockup, FiftyMark } from "@/components/brand";
import { LanguageMenu } from "@/components/ui/language-menu";
import { NotificationsPanel } from "@/components/layout/notifications-panel";
import { AvatarMenu } from "@/components/layout/avatar-menu";
import { WalletBalanceCaptioned, useLiveBalance } from "@/components/layout/wallet-balance-pill";
import type { BreakState } from "@/lib/break-end";
import type { TopAppBarUser } from "@/components/layout/top-app-bar";
import { TicketsGuestSheet } from "@/components/journey/tickets-guest-sheet";
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";
import { JOURNEY_TABS, activeTabFor, tabAriaCurrent, tabLabel } from "@/lib/nav/active-tab";
import { journeyHeaderState } from "@/lib/journey/header-state";
import { pollersAt, useLgUp } from "@/lib/journey/one-poller";
import { useNotFoundShown } from "@/lib/not-found-mark";
import type { ProposalsState } from "@/lib/server/proposals-config";

/** One class for every destination, link or button: a guest's Tiketi zangu must not read as another kind of thing. */
const JNAV = "kp-jnav__link";

/**
 * ⭐ THE BELL BEFORE IT RINGS (2026-10-09, the visual pass round 4, R4-J; E36). The live bell (`NotificationsPanel`) is
 * mounted only where it shows and only once the browser has said so (`pollersAt`: a mounted bell polls), so the
 * server's HTML held an EMPTY slot at 1280 — the header painted without its bell until the page's scripts ran, on a
 * slow network for seconds. This is the bell's own box and glyph — the same wrapper, the same 40px round control, the
 * same 20px glyph in the same span — drawn by the server, as a plain link to the notifications page: before the
 * scripts arrive it works the way the page's other links do, and the live bell takes its place, pixel for pixel, the
 * moment it may mount. It is also what a not-found page shows (no poll there: `lib/not-found-mark.ts`), where the
 * live bell's Server Action could only be answered 404.
 * ⚠️ `h-[40px] w-[40px]` is the live bell's `h-7 w-7` written as what it renders (the spacing scale is overridden in
 * tailwind.config.ts: `7` IS 40px), so `test:ui-consistency`'s numeric-size rule has nothing new to baseline.
 */
function BellStill({ label }: { label: string }) {
  return (
    <div className="relative z-10">
      <Link
        href="/notifications"
        aria-label={label}
        className="relative inline-flex h-[40px] w-[40px] items-center justify-center rounded-full transition-colors text-text-subtle hover:text-text hover:bg-bg-overlay/40"
      >
        <span aria-hidden className="inline-flex">
          <I.bell s={20} />
        </span>
      </Link>
    </div>
  );
}

export function JourneyTopBar({
  user,
  onBreak,
  breakEnd = null,
  proposalsState,
  inviteVisible = false,
  invitePaid = false,
}: {
  /** The classic bar's own viewer shape, built once by AppShell for whichever bar it renders. */
  user: TopAppBarUser;
  /** The reader is on a self-imposed break (AppShell's `promoSuppressed`): no "+ Weka pesa" (S4), and no Deposit in the
   *  Wallet the capsule opens (2026-10-08, `wallet-sheet.tsx`). */
  onBreak: boolean;
  /** R4-I · the reader's break and its end (AppShell, from the settings row it holds), so the Wallet says why it offers no
   *  Deposit. Null when no break runs or the read failed. */
  breakEnd?: BreakState | null;
  proposalsState: ProposalsState;
  inviteVisible?: boolean;
  invitePaid?: boolean;
}) {
  const route = usePathname();
  const { t } = useT();
  // The live figure, as the classic bar feeds its capsule: a deposit landing over SSE moves it with no navigation.
  const liveBalance = useLiveBalance(user.balance ?? 0);
  const pollers = pollersAt(useLgUp());
  // ⭐ R4-J (2026-10-09) · A NOT-FOUND PAGE IS NO PAGE OF OURS, whatever its address says (`lib/not-found-mark.ts`): the
  // bar reads no path there — no destination lit (the market not-found lit Maswali) — and mounts no bell.
  const notFoundShown = useNotFoundShown();
  const pathname = notFoundShown ? null : route;
  const [sheetOpen, setSheetOpen] = useState(false);
  // The bar outlives the page: a sheet left open would wait over the page the reader went to.
  useEffect(() => { setSheetOpen(false); }, [route]);
  const state = journeyHeaderState({
    isAuthed: user.isAuthed,
    balance: user.balance,
    walletHeld: !!user.walletHeld,
    onBreak,
    pathname,
  });
  const active = activeTabFor(pathname);

  return (
    <header className="sticky top-0 z-30 app-topbar kp-jhdr" data-testid="journey-top-bar">
      <div className="kp-jhdr__row">
        <Link href="/" aria-label={`50pick ${t.common.home}`} className="kp-jhdr__home">
          {/* The mark carries the brand below 1280 and the lockup returns there, as on the classic bar. */}
          <span className="mark-flip-i inline-flex xl:hidden"><FiftyMark size={26} /></span>
          <span className="hidden xl:inline-flex"><FiftyLockup size={22} markClassName="mark-flip-i" /></span>
        </Link>
        {/* No aria-label: the text is the name, and ARIA allows none on a plain span. */}
        <span className="kp-rg__18">{t.footer.eighteenPlus}</span>

        <nav className="hidden lg:flex kp-jnav" aria-label={t.nav.primary}>
          {JOURNEY_TABS.map((d) =>
            d.key === "tickets" && !user.isAuthed ? (
              <button
                key={d.key}
                type="button"
                aria-haspopup="dialog"
                aria-expanded={sheetOpen}
                onClick={() => setSheetOpen(true)}
                className={JNAV}
                data-on={active === d.key ? "" : undefined}
              >
                {tabLabel(t, d.label)}
              </button>
            ) : (
              <Link
                key={d.key}
                href={d.href as never}
                aria-current={tabAriaCurrent(pathname, d.key)}
                className={JNAV}
              >
                {tabLabel(t, d.label)}
              </Link>
            ),
          )}
        </nav>

        <div className="flex-1" />

        {/* The right-hand controls as one group, the classic bar's shape: from 640 they keep the group's own spacing
            while the row's groups take the row's. */}
        <div className="kp-jhdr__cluster">
          {state.capsule !== "none" && (
            <WalletBalanceCaptioned balance={liveBalance} held={state.capsule === "held"} onBreak={onBreak} breakEnd={breakEnd} />
          )}
          {state.pill && (
            <Link
              href="/wallet/deposit"
              aria-label={t.journey.depositAction}
              data-testid="journey-deposit"
              className="btn gilt-metal btn-md btn-pill kp-jhdr__pill"
            >
              <span aria-hidden className="kp-jhdr__plus"><I.plus s={14} /></span>
              <span>{t.journey.depositAction}</span>
            </Link>
          )}
          {state.authPills && (
            <>
              <Link href={"/auth/login" as never} className="btn btn-ghost btn-md btn-pill kp-jhdr__auth">
                {t.common.signIn}
              </Link>
              <Link href={"/auth/register" as never} className="btn btn-primary btn-md btn-pill kp-jhdr__auth">
                {t.common.signUp}
              </Link>
            </>
          )}

          {/* From 1024 only: on a phone, Akaunti holds the language control, the notifications and the account. */}
          {/* `journey` on both (R5-C, the second gold audit, 2026-10-09): the current language's tick and the bell's unread
              signs are the journey's brand ink, not gold (Q5); the classic bar mounts the same two without it, unchanged. */}
          <span className="hidden lg:inline-flex"><LanguageMenu journey /></span>
          {user.isAuthed && (
            <>
              <span className="hidden lg:inline-flex kp-jhdr__bell">{pollers.bell && !notFoundShown ? <NotificationsPanel journey /> : <BellStill label={t.common.notifications} />}</span>
              <span className="hidden lg:inline-flex">
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
                  journey
                />
              </span>
            </>
          )}
        </div>
      </div>
      {!user.isAuthed && <TicketsGuestSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />}
    </header>
  );
}
