import { Suspense } from "react";
import { headers } from "next/headers";
import { getAgentConfig } from "@/lib/server/agent-config";
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_PHONE_TEL } from "@/lib/server/support-config";

// ⭐ THE PARTS THIS SHELL LOADS ONLY WHEN IT RENDERS THEM (the overlays, the journey flag, and the journey's header and
// tabs) come from ONE client module, `./shell-lazy`, which declares each with `next/dynamic` (the Vodacom plan S6,
// WP6c; VODACOM-PLAN §0h point 20). They are rendered below under the names they always had, where they always were,
// with the same props, each in the Suspense boundary it always had, which is now that part's only one (next/dynamic
// adds none): keep every part the one child of its own. A part whose code never arrives is left out rather than taking
// the page down (`nothingIfLost`, there). ⛔ NEVER A REACT LAZY HERE: this is a SERVER component, and its own
// `React.lazy` bindings kept nothing out of the first load (production and a local build, 2026-10-03): every module
// they named rode in the scripts every page loads first, for every visitor. `test:journey-shell` §12 holds this.
import {
  LazyPullToRefresh, LazyNotifyPoller, LazyEventStream, LazyInstallInvite, LazyConsentPrompt, LazyChannelsPanel,
  LazyJourneyFlag, LazyWinCelebration, LazySellResultHost, LazyJourneyTopBar, LazyJourneyTabs,
} from "./shell-lazy";
// ⛔ THE OFFLINE BANNER IS NOT ONE OF THEM, ON PURPOSE (WP6c): its one job is a connection that fails, so its code comes
// with the page's own scripts, as it always did, and never by a fetch of its own that the same failure could stop. It
// was a `React.lazy` binding here, which split nothing, so this changes nothing a player gets (12.shell.offline).
import { OfflineBanner } from "@/components/ui/offline-banner";
import { TopAppBar } from "./top-app-bar";
import { LiveTicker } from "./live-ticker";
import { BottomNav } from "./bottom-nav";
import { PublicFooter } from "./public-footer";
import { AuthFlash } from "./auth-flash";
import { NavProgress } from "@/components/ui/nav-progress";
import { RouteTransition } from "@/components/ui/route-transition";
import { getSession, sessionEndedThisRequest, type SessionEndReason } from "@/lib/server/session";
import { NoticeBar, NoticeBarAction } from "@/components/ui/notice-bar";
import { SessionPresence } from "./session-presence";
import { redirect } from "next/navigation";
import { db } from "@/lib/server/store";
import { guestUser } from "@/lib/ui-stubs";
import { getTickerFeed } from "@/lib/server/ticker-feed";
import { RealityCheckHost } from "@/components/rg/reality-check";
import { getRgSettings } from "@/lib/server/responsible-gambling";
import { hasRole, ADMIN_CONSOLE_ROLES, type Role } from "@/lib/server/roles";
import { inviteIsLiveFor, installInviteIsLive, NO_VIEWER, type InviteViewer } from "@/lib/feature-state";
import { agentStandingFor, playerInviteEligibleFor } from "@/lib/server/affiliate-service";
import { invitePaysPlayersNow } from "@/lib/server/invite-rewards-switch";
import { resolveSimpleJourney } from "@/lib/server/journey-preview";
import { JOURNEY_SHELL_MARK } from "@/lib/journey/shell-mark";
import { PreviewMarker } from "./preview-marker";
import { FunnelUtm } from "@/components/analytics/funnel-utm";
import { isStaffRole } from "@/lib/server/roles";
import { displayLabel, displayInitials } from "@/lib/display-label";
import { getServerT } from "@/lib/i18n-server";
import { getPlatformConfig, maintenanceMessage } from "@/lib/server/platform-config";
import { getProposalsConfig } from "@/lib/server/proposals-config";
import { AnnouncementBanner } from "./announcement-banner";
import { EmailVerifyBanner } from "./email-verify-banner";
import { AwaySummaryBar } from "./away-summary-bar";
import { Needle } from "./needle";
import { HeaderScrollCast } from "./scroll-cast";
import { LanguageMenu } from "@/components/ui/language-menu";
import { FiftyLockup } from "@/components/brand";
import { LICENCE_NUMBER } from "@/lib/support-config";
import { isOptOutPath } from "@/lib/marketing/optout";
import type { Dict } from "@/lib/i18n-server";
import { isSafePath } from "@/lib/safe-next";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const { t, locale } = await getServerT();
  // Admin routes render their own full-screen layout (sidebar, topbar, chrome).
  // Skip the player shell entirely so admin pages don't get a double navbar.
  const h = await headers();
  const pathname = h.get("x-pathname") ?? "";
  if (pathname.startsWith("/admin")) {
    return <>{children}</>;
  }
  // ⭐ D6 · THE OPT-OUT PAGE GETS A MINIMAL SHELL — see `OptOutShell` below. Decided BEFORE the session
  // read on purpose: an ended session's document redirect (E-381, below) would otherwise send somebody
  // trying to stop marketing to the SIGN-IN page, which is an opt-out behind a login (ETA s.32(1)(c)).
  if (isOptOutPath(pathname)) {
    return <OptOutShell t={t}>{children}</OptOutShell>;
  }

  /* ⭐ THE PLAYER INVITE'S "PAID" IS READ HERE, STARTED NOW AND AWAITED AT `invitePaid` BELOW, so it
     runs alongside the session and the batch rather than as one more sequential round trip on every
     page. `invitePaysPlayersNow` (review P8, 2026-09-26): the Owner's switch through the screens' read
     (≤ 10 s cache: at most one `SystemConfig` read per container per 10 s), the service-level pause off
     and a reward actually armed — "Make payable → Nothing yet" is NOT paid here. The settings are
     re-read only once the switch says payable. It never rejects — a failed read answers not paid. */
  const invitePayableRead = invitePaysPlayersNow().catch(() => false);
  /* ⭐ THE NEW JOURNEY (Vodacom plan S1) — resolved through the ONE per-request resolver every journey page
     asks too (React `cache`), so this shell and the page agree about the request. Started here, beside the
     session, and awaited at the render: the switch read is a ≤ 10 s snapshot, and the pass is only looked at
     when the browser holds one. ⛔ It sits AFTER the `/admin` and opt-out returns: the console is never
     previewed. Never rejects — a failure is "nothing new, no marker". */
  const journeyRead = resolveSimpleJourney();
  const session = await getSession();
  // ── 🔴 E-381 · A SESSION THAT HAS ENDED — HOW THE ROOT LAYOUT MAY ANSWER IT, AND HOW IT MAY NOT.
  //
  // THE LAW: this component is rendered by the ROOT layout, and a decision made in the root layout
  // can only be escaped by a DOCUMENT navigation. On a client navigation Next prunes the shared
  // root segment from the flight response, so whatever this component rendered last stays on screen.
  //
  // WHAT WENT WRONG, TWICE. ① It returned a client redirect shim INSTEAD of `{children}`: the tree
  // kept a shell with no children slot and the login page mounted nowhere — a blank navy body on
  // every route, public ones included (2026-09-12). ② It then called `redirect()` here. On a
  // DOCUMENT request that is a real 307 and works (even with JavaScript off). But this component
  // ALSO renders on every `router.refresh()` — `RefreshPoller` on /markets, a market, /live,
  // /positions, /updown, /leaderboard and /results, and `50pick:refresh` right after a bet, a
  // cash-out and an Up & Down tap — and on that FLIGHT request the redirect is caught by the
  // redirect boundary ABOVE the root layout, which renders nothing while it navigates. Measured:
  // a displaced player sitting still on /markets went blank at t+28 s and stayed blank.
  //
  // ⭐ SO THE ANSWER DEPENDS ON THE REQUEST, AND ONLY ONE OF THE TWO NAVIGATES:
  //  · DOCUMENT (`x-kp-document: 1`, set by `src/proxy.ts`, because Next strips `rsc` before
  //    `headers()`): a real 307 to `/auth/session-ended`, which clears the dead cookie (a render
  //    cannot) and lands on the login page saying the TRUE reason.
  //  · ANYTHING ELSE (a refresh, a Server Action, a prefetch, or a missing header): NO NAVIGATION.
  //    The page renders with `{children}` exactly as for a signed-out visitor, and a notice under
  //    the bar says the session ended, with a plain `<a>` (a document navigation — ⛔ never
  //    `<Link>`) to the same handler. Nothing here can leave the tree without a children slot.
  //    ⛔ Do NOT add an automatic client escape for this branch: one was tried on 2026-09-12 and
  //    retry-stormed (the same `_rsc` request ~18 times, still blank).
  //
  // ⛔ /auth/* IS EXCLUDED FROM BOTH, and that is load-bearing: the login page is where the redirect
  // lands, and the OTP and 2FA steps are a sign-in in progress that a reload must not throw away.
  // A dead cookie on those pages is harmless — the login page states the reason from the same
  // request signal, and a successful sign-in replaces the cookie.
  // ⛔ `pathname` MUST BE NON-EMPTY — a loop guard, not tidiness. `src/proxy.ts` is the only writer
  // of `x-pathname`; if it is ever absent, `"".startsWith("/auth")` is false and the login page
  // itself would enter this branch. Requiring the header fails CLOSED, to a signed-out shell.
  // ⛔ Assert this on the RENDERED PAGE, never the URL — the URL was right for the whole life of the
  // bug. `test:revoked-deadend` does, including a mid-visit refresh and a JavaScript-off load.
  // See `docs/SESSION-REVOKED-DEADEND.md`.
  const endedReason: SessionEndReason | null = session ? null : sessionEndedThisRequest();
  let endedNotice: { reason: SessionEndReason; href: string } | null = null;
  if (endedReason && pathname && !pathname.startsWith("/auth")) {
    const raw = h.get("x-href") ?? pathname;
    const safe = isSafePath(raw) && !raw.startsWith("/auth") ? raw : "";
    const href = `/auth/session-ended${safe ? `?next=${encodeURIComponent(safe)}` : ""}`;
    // ⛔ `as never` is required by `typedRoutes: true` (next.config.ts), as in `admin/layout.tsx`.
    if (h.get("x-kp-document") === "1") redirect(href as never);
    endedNotice = { reason: endedReason, href };
  }
  let topUser: {
    initials: string;
    name: string;
    phone: string;
    walletHeld?: boolean;
    isAuthed: boolean;
    avatarSrc?: string | null;
    seed?: string;
    balance?: number | null;
    isAdmin?: boolean;
  } = { initials: guestUser.initials, name: guestUser.name, phone: guestUser.phone, isAuthed: false, balance: null };
  let realityCheckMin = 30;
  /**
   * True = this player is on a self-imposed break, so nothing promotional may be shown to them.
   * ⛔ Defaults FALSE, including for a signed-out visitor and for a failed RG read — it gates an
   * OFFER, never a refusal (`feature-state.ts` LAW 1), so failing open is the correct direction.
   */
  let promoSuppressed = false;
  /**
   * ⛔ THE INSTALL INVITATION IS WITHDRAWN (2026-09-13) — Ali: "keep only the socials popup … hide the
   * install for now, later we activate". Resolved HERE, on the server, from the one feature table; the
   * client component never reads product state. See `installInviteIsLive` in `feature-state.ts`.
   */
  const installInviteLive = installInviteIsLive();
  /** Non-null = signed in with an UNCONFIRMED address → show the standing bar. */
  let emailVerifyState: { email: string | null } | null = null;
  /** Who is asking about Invite — standing, not role. See `feature-state.ts` → `InviteViewer`. */
  let inviteViewer: InviteViewer = NO_VIEWER;
  /** The journey funnel's view of this reader (S3b): a signed-in account whose read failed is NOT counted. */
  let funnelViewer: "guest" | "player" | "staff" | "unknown" = "guest";
  if (session) {
    // Batch the four queries in parallel — eliminates the sequential
    // waterfall. Promise.allSettled so one failing query can't crash
    // the entire shell (graceful degradation: show what we have).
    // ⛔ ANY READ THIS SHELL NEEDS JOINS THE BATCH — it is never awaited separately. This
    // component renders on EVERY page; one more sequential round trip here is a latency tax
    // on the whole platform, which is the same rule the ticker note below states.
    // ⭐ THE KYC READ LEFT THIS BATCH ON 2026-09-13, with the app-wide identity bar that was its
    // only consumer (see the note at the email bar below) — one fewer query on every page render.
    const [uResult, walletResult, rgResult, affResult] = await Promise.allSettled([
      db.user.findById(session.userId),
      db.wallet.findByUserId(session.userId),
      getRgSettings(session.userId),
      // ⭐ The affiliate row rides in the same batch — invite visibility is decided by the
      // agent's STANDING (approved + active + account status), never by the role alone, and
      // a separate sequential round trip on every page is the latency tax the note above forbids.
      db.affiliate.findByUserId(session.userId),
    ]);
    const u = uResult.status === "fulfilled" ? uResult.value : null;
    const aff = affResult.status === "fulfilled" ? affResult.value : null;
    /**
     * ⚠️ A failed user read leaves NO_VIEWER — a failed read must never open a programme.
     * ⭐ `playerInviteEligible` rides the same two rows: the shell decides the nav entry, and the
     * unpaid player invite (2026-09-25) is closed to a CLOSED / SUSPENDED / SELF_EXCLUDED account
     * and to an agent out of standing. ⛔ Composed from `playerInviteEligibleFor`, not re-spelled
     * here — the shell showing a link the bind would refuse is the drift it exists to prevent.
     *
     * 🔴 AND A FAILED **AFFILIATE** READ MUST FAIL CLOSED TOO, WHICH IT DID NOT. `affResult` is one
     * arm of a `Promise.allSettled`, so a rejected affiliate query yields `aff = null` — and null
     * is indistinguishable from "this account has no affiliate row". `agentStandingFor` then reads
     * `agent_not_approved` and `playerInviteEligibleFor`'s `!isApprovedAgent(null)` reads TRUE, so
     * an APPROVED AGENT whose row failed to load was silently demoted to an eligible player: the
     * nav would offer them the unpaid player surface, and every share surface would mint a player
     * code that `bindRecruit` refuses on the agent branch. A transient database blip must not
     * change which programme a viewer is in. When the affiliate read FAILED (as opposed to
     * returning no row) the viewer is closed entirely — the same safe direction the user read takes.
     */
    const affReadFailed = affResult.status !== "fulfilled";
    funnelViewer = !u ? "unknown" : isStaffRole(u.role) ? "staff" : "player";
    inviteViewer = u && !affReadFailed
      ? { role: u.role, agentInGoodStanding: agentStandingFor(u, aff).ok, playerInviteEligible: playerInviteEligibleFor(u, aff) }
      : NO_VIEWER;
    const wallet = walletResult.status === "fulfilled" ? walletResult.value : null;
    const rg = rgResult.status === "fulfilled" ? rgResult.value : null;
    const userRef = u ?? { id: session.userId, displayName: null };
    const display = displayLabel(userRef);
    const initials = displayInitials(userRef);
    const masked = session.phoneE164.length > 6
      ? `${session.phoneE164.slice(0, 4)}*****${session.phoneE164.slice(-2)}`
      : session.phoneE164;
    topUser = {
      initials,
      name: display,
      phone: masked,
      isAuthed: true,
      avatarSrc: u?.avatarDataUrl ?? null,
      seed: session.userId,
      balance: wallet?.balance ?? null,
      // A held wallet (officer hold, final refusal) gets no money-in CTA: /wallet/deposit would refuse it.
      walletHeld: !!wallet && wallet.status !== "ACTIVE",
      // Staff-tier users get an admin-console jump in the avatar menu.
      // hasRole is null-safe, so a failed user fetch simply hides it.
      isAdmin: hasRole(u?.role, ADMIN_CONSOLE_ROLES),
    };
    realityCheckMin = rg?.realityCheckIntervalMin || 30;
    /**
     * 🔴 THE FIRST RG FACT THIS PLATFORM HAS EVER SENT TO A BROWSER, and it exists because a
     * promotional surface now renders on the page. `/legal/responsible-gambling` §4 publishes
     * "no marketing to self-excluded players", and until this line NO responsible-gambling
     * state reached the client by ANY route — not a prop, not the session cookie, not a
     * context, not an API. Nothing on a page could have honoured that promise.
     *
     * ⭐ DERIVED FROM THE ROW ALREADY IN HAND, NOT A SECOND QUERY. `isLockedOut()` would be the
     * canonical predicate, but calling it here is one more round trip on EVERY page render —
     * the exact latency tax the batch note above forbids. `rg` is already fulfilled; the two
     * timestamps on it answer the question.
     *
     * ⚠️ IT IS A SINGLE BOOLEAN, ON PURPOSE. A client does not get to know WHICH break a player
     * is on, or until when — that is their business, and a reason code in a browser bundle is a
     * disclosure with no consumer. The server knows; the page only learns "do not solicit".
     *
     * ⛔ AND IT GATES AN OFFER, NEVER A REFUSAL (`feature-state.ts` LAW 1). Nothing that FORBIDS
     * anything may ever read this flag: it fails OPEN by construction — a failed `getRgSettings`
     * leaves `rg` null and `promoSuppressed` false — because a read failure must not silently
     * become a lockout. If you ever need it to fail closed, you need a different value.
     */
    const now = Date.now();
    const until = (iso: string | null | undefined) => (iso ? Date.parse(iso) : 0);
    promoSuppressed =
      until(rg?.selfExclusionUntil) > now || until(rg?.coolingOffUntil) > now;
    // Email confirmation gates depositing, so an unconfirmed address is a live
    // limitation on the account and belongs on every page — not only on the
    // deposit form the player may not reach for days. `u` is null only if the
    // user fetch failed above, in which case we stay silent rather than accuse a
    // player of being unverified on the strength of a failed query.
    emailVerifyState = u
      ? (u.emailVerifiedAt ? null : { email: u.email ?? null })
      : null;
  }

  // The live ticker's REAL settlements. Batched with the config read rather than awaited at its
  // JSX site so the two do not serialise; `getPlatformStats` is memoised on `globalThis` for 60s,
  // so on a warm shell this costs nothing at all. ⛔ It must never become a per-request scan —
  // this component renders on EVERY page (see the ONE-SCAN note in `platform-stats.ts`).
  // ⚠️ READ ON EVERY PAGE, PAINTED ON FOUR (2026-09-26). The strip is lobby-only (`TICKER_ROUTES`),
  // but this shell is the ROOT layout and is not re-rendered on a soft navigation — so a player who
  // lands on /wallet and taps through to /markets has only the events this render handed down. A
  // server-side "not on this page" skip would leave the lobby strip empty for exactly that player.
  // 🟠 AND NOT READ FOR A SIGNED-IN PLAYER ON AN ACTIVE BREAK — and that is exactly as far as it goes.
  // A courtesy, like the socials panel's: a scrolling run of other people's settlements is not what a
  // player who asked for a break should meet, so the feed is not fetched and the strip renders null.
  // ⚠️ WHAT THIS DOES NOT DO, written down so nobody believes more than the code does:
  //   · A SELF-EXCLUDED person is never signed in — `selfExclude` revokes every session and
  //     `assertSignInAllowed` refuses them — so they browse as a guest and see the lobby, strip
  //     included, like any visitor. The `selfExclusionUntil` half of `promoSuppressed` only covers an
  //     exclusion recorded without a session revoke. Same for a cooling-off player once
  //     `coolOffAction` has signed them out, until they sign back in.
  //   · The same settled markets are public on `/` (TrustBand), `/results` and `/live` regardless.
  //   · It fails OPEN on an RG read error (see `promoSuppressed`).
  // The strip is site content, not one of the "marketing messages" `/legal/responsible-gambling` §4
  // governs (those are SMS, email and push). Recognising a signed-out person on a break would need a
  // device marker — a new cookie, i.e. a Privacy-notice change — and the owner ruled on 2026-09-26 to
  // leave it as it is (`docs/COMPLIANCE-DECISIONS.md`). Adding one needs a new ruling.
  // Site-wide operator banner (§9.3 #5) — maintenance notice takes priority over an active
  // broadcast. Cheap cached config read (graceful on failure).
  const [platformCfg, tickerEvents] = await Promise.all([
    getPlatformConfig().catch(() => null),
    promoSuppressed ? Promise.resolve([]) : getTickerFeed(locale).catch(() => []),
  ]);
  const maintBanner = platformCfg?.maintenanceMode ? await maintenanceMessage().catch(() => null) : null;
  const announcement = platformCfg?.announcement?.active && platformCfg.announcement.message.trim()
    ? { message: platformCfg.announcement.message, tone: platformCfg.announcement.tone }
    : null;

  // Proposals feature-state — drives the entry-point badges (top bar, avatar
  // menu, footer). Sync cache read; safe default (COMING_SOON) if unhydrated.
  const proposalsState = getProposalsConfig().state;

  /* ⭐ INVITE IS RESOLVED HERE, ONCE, BECAUSE THIS IS THE ONLY PLACE THAT KNOWS THE ROLE.
     The shell's surfaces that offer Invite — the bottom rail, the top bar, the avatar menu and
     (since 2026-09-26) the footer — are all `"use client"` and none of them can read a
     role — so the shell answers the question and threads the ANSWER down, exactly as
     `proposalsState` above already does. ⛔ Do not push `feature-state.ts` into those
     components to save a prop: importing a server module from a client file is what took
     every page in this app down once already.
     ⚠️ `u` is null only when the user fetch above FAILED. Defaulting to hidden is the safe
     direction — a failed read must never open a withdrawn programme.
     🔴 AND IT IS STANDING, NOT ROLE (2026-09-07). `inviteIsLiveFor(viewerRole)` kept every
     entry point open for a DEACTIVATED agent, because deactivation leaves the role in place. */
  const inviteVisible = inviteIsLiveFor(inviteViewer);
  /* ⭐ THE SECOND HALF OF THE PAIR, RESOLVED IN THE SAME PLACE AND FOR THE SAME REASON: the menu
     row's WORDS depend on whether the viewer's invite destination pays, and a client component may
     not read the product state to find out.
     🔴 AND IT IS VIEWER-AWARE, BECAUSE THE FIRST VERSION SAID "an agent never reaches this label"
     AND THAT WAS FALSE. `inviteIsLiveFor` returns ACTIVE for an agent in good standing BEFORE it
     reads the product state, so their row survives the filter — and a PLAYER-only money switch was
     relabelling it "Invite friends" and stripping its gilt, for a destination that renders their
     COMMISSION DASHBOARD. `profile/page.tsx` gives that same viewer, for that same href, "Agent
     dashboard · your recruits and commission" in gilt: two doors to one page describing two
     different programmes.
     ⛔ So the question this answers is "does THIS viewer's invite destination pay?" — the player
     programme's one "paid" (`invitePaysPlayersNow`: the Owner's switch under its code/env ceiling, Not
     payable by default, AND a reward armed), OR an approved agent's standing. The switch keeps its contract (no viewer, player programme only);
     the disjunction lives here, at the one place that already knows the viewer. */
  const invitePaid = (await invitePayableRead) || inviteViewer.agentInGoodStanding;

  /**
   * 🔴 THE AGENT DOOR IS RESOLVED HERE FOR THE REASON THE COMMENT ABOVE ALREADY GIVES.
   *
   * `public-footer.tsx` is `"use client"` and was calling `getAgentConfig()` directly — the
   * exact thing the note above forbids ("importing a server module from a client file is what
   * took every page in this app down once already"). And it was WRONG as well as forbidden:
   * `defineConfig`'s cache does not cross to the browser bundle, so the client read the
   * module DEFAULT (`enabled: true`) and the footer link would have stayed up no matter what
   * an officer saved. A switch that does not switch anything is worse than no switch.
   *
   * ⭐ AND THE DOOR STAYS OPEN FOR PEOPLE ALREADY INSIDE, matching `/agent` itself: that page
   * deliberately keeps rendering for anyone with standing, so closing the programme must not
   * strip an approved agent — or a paid applicant awaiting a decision — of their only
   * navigational route to it. Gating on `enabled` alone made the footer a dead end for exactly
   * the people who had paid TZS 118,000.
   */
  const agentDoorVisible = getAgentConfig().enabled || inviteViewer.agentInGoodStanding;

  /** True only for a request whose preview pass counts (`simpleJourneyFor`). Everybody else gets no marker. */
  const journeyPreview = (await journeyRead).preview;
  /** This request is shown the new journey (the funnel counts it as "new"). */
  const journeyShown = (await journeyRead).journey;
  /* ⭐ WHO THE JOURNEY FUNNEL COUNTS (Vodacom plan S3b, §0f) — decided HERE, on the server, and rendered as one
     attribute the browser beacon reads before it sends anything: staff, a preview pass and an account whose read
     failed are "off"; everybody else is counted in the journey they are shown. `/api/funnel` needs no cookie. */
  const funnelScopeValue = journeyPreview || funnelViewer === "staff" || funnelViewer === "unknown" ? "off" : journeyShown ? "new" : "old";

  return (
    <div className="min-h-screen flex flex-col bg-bg-base text-text">
      {/* Skip-to-content — WCAG 2.4.1. Visually hidden until focused,
          then overlays the top-left so keyboard/screen-reader users can
          bypass the nav on every page load. */}
      <SkipToContent label={t.common.skipToContent} />
      {/* The header's scroll cast: `--shadow-2` once the page has moved (kit §2). One attribute
          write per crossing of scrollY 0 — never per frame — and it lands on `<html>` rather than
          on the header element React owns. Renders null.
          ⚠️ The section reveal is NOT here. It used to be, as one effect that set `data-revealed`
          on every `[data-reveal]` node it found, and that produced a hydration mismatch on 9 of 12
          frames because the page's bands STREAM: a shell effect fires before they finish
          hydrating. It is now the `<Reveal>` client wrapper, which renders the attribute from
          state so React owns it. Do not reintroduce a shell-level DOM mutation for this. */}
      <HeaderScrollCast />
      <Suspense fallback={null}><NavProgress /></Suspense>
      {/* ⭐ THE JOURNEY'S HEADER AND TABS (Vodacom plan S6, WP6b), for a request the resolver shows the journey to and
          for no other: every other request gets today's bar and rail with today's props, in the two else arms. Each
          journey arm is lazy, a `next/dynamic` part of `./shell-lazy` (WP6c; see the note at its import), and the
          server still renders it into the page, so a fallback shows only while its code is on the way — a beat of a
          streamed page, or a switch into the journey mid-visit
          (a preview pass turned on). The header's fallback is therefore the bar's own empty box, with its height, its
          panel and its border, so nothing below it moves; the tabs need none, because the rail is anchored to the
          viewport and takes no room in the page. */}
      {journeyShown ? <Suspense fallback={<div aria-hidden="true" className="kp-jhdr" />}><LazyJourneyTopBar user={topUser} onBreak={promoSuppressed} proposalsState={proposalsState} inviteVisible={inviteVisible} invitePaid={invitePaid} /></Suspense> : <TopAppBar user={topUser} proposalsState={proposalsState} inviteVisible={inviteVisible} invitePaid={invitePaid} />}
      {/* ⭐ THE PREVIEW MARKER — first under the bar, so whoever holds this browser knows at once that they are
          looking at pages players do not see yet, and has the way out on the same line. */}
      {journeyPreview && <PreviewMarker label={t.journey.previewMarker} exit={t.journey.previewExit} />}
      <span hidden data-kp-funnel={funnelScopeValue} />
      {/* ⭐ THE JOURNEY FLAG (Vodacom plan S6, WP7) — for a request the resolver shows the journey to, and for no other.
          It renders nothing. While it is mounted the html element carries the journey's attribute, and that is how
          the Needle, the channels panel and the chat bubble (mounted where no prop reaches them) stand down on the
          journey's own pages; a classic page never carries it. */}
      {journeyShown && <Suspense fallback={null}><LazyJourneyFlag /></Suspense>}
      {/* ⭐ AND THE SHELL'S MARK, IN THE SERVER'S HTML (`lib/journey/shell-mark.ts`): the flag above arrives in its own
          chunk, after hydration, and the Needle once drew for a few frames before it landed. With the mark on the page
          from the first byte, every overlay reads the answer right after hydrating. A classic page never carries it. */}
      {journeyShown && <span hidden id={JOURNEY_SHELL_MARK} />}
      {funnelScopeValue !== "off" && <FunnelUtm />}
      <AnnouncementBanner maintenance={maintBanner} announcement={announcement} />
      {/* 🔴 E-381 · the in-place answer to a session that ended during a refresh — see the note at
          `endedReason`. Server-rendered, and its only action is a plain `<a>`. */}
      {endedNotice && (
        <NoticeBar
          tone="warning"
          glyph="alertCircle"
          testId="session-ended-notice"
          action={<NoticeBarAction href={endedNotice.href} tone="warning">{t.common.signIn}</NoticeBarAction>}
        >
          <span className="font-semibold">{t.auth.signedOut}.</span>{" "}
          {endedNotice.reason === "displaced"
            ? t.auth.signedOutBody
            : endedNotice.reason === "no_record"
              ? t.auth.sessionEndedBody
              : t.auth.sessionIdleBody}
        </NoticeBar>
      )}
      {/* ⭐ THE EMAIL BAR STANDS ALONE (2026-09-13). There is no app-wide identity bar any more, and
          so no ordering question between two bars. Identity is asked before a WITHDRAWAL and
          nothing else, and Ali's ruling of the same day is that it is raised QUIETLY: on the withdraw
          screen itself (`KycGatePanel`), in one dismissible notice under the balance from the first
          confirmed deposit (`kyc-first-deposit-notice.tsx`), and wherever the player goes to look
          (/profile, /profile/kyc). A bar on every page was the opposite of that.
          ⛔ Do not reintroduce an identity bar here, or a KYC read in the batch above to feed one.
          The email bar stays app-wide because an unconfirmed address blocks the NEXT thing the
          player wants to do — adding money — wherever they are when they decide to. The one exception
          (2026-09-13) is /wallet/deposit itself, where the page's own email gate says it with its own
          resend action; the bar hides there so the player is not told twice (email-verify-banner.tsx).
          ⭐ AND NOT FOR A JOURNEY VIEWER (Vodacom plan S6, WP7; VODACOM-PLAN §3.2 item 2, "no email-verify bar on
          journey"). Decided here, per request, on the resolver's own answer, so no soft navigation changes it. The
          deposit page's own email gate still stands between an unconfirmed address and a deposit; what a journey viewer
          goes without is this reminder on every other page, until S9 asks for the code in the flow itself. */}
      {/* ⭐ NOT DURING A BREAK (2026-10-06). The bar's whole message is "confirm your email to add money" — an invitation
          to deposit, shown to a player whose break pauses deposits. `promoSuppressed` is exactly "do not solicit": it fails
          OPEN (a failed RG read shows the bar), which is the right direction for a reminder. */}
      {emailVerifyState && !journeyShown && !promoSuppressed && <EmailVerifyBanner email={emailVerifyState.email} />}
      {/* ⭐ BELOW THE EMAIL GATE, ON PURPOSE. That bar names a COMPLIANCE condition blocking
          the player's first deposit; this one is a courtesy summary of results they already
          hold. If both are up, the one that costs them something must read first.
          ⛔ It renders null whenever nothing settled while they were away, which is almost
          always — and it fires nothing when it does appear (§F5). `playStartedAt` is already
          on the signed session (`getSession()` returns it, and `markets/actions.ts` already
          consumes it), so this costs no change to auth code at all. */}
      {session && (
        <AwaySummaryBar
          userId={session.userId}
          playStartedAtMs={session.playStartedAt ?? Date.now()}
          serverNowMs={Date.now()}
        />
      )}
      {/* ⭐ THE LIVE STRIP — BACK, BUT ONLY IN THE LOBBY (owner decision 2026-09-26, revising the
          removal of 2026-09-24, `adbc31e7`). On every page it ran above the deposit and withdrawal
          forms, identity, limits and the bet screen, and read as an advertising marquee there. It now
          paints on `/`, `/markets`, `/live` and `/results` only (`TICKER_ROUTES`, where the reasons
          are written down), not for a SIGNED-IN player on an active break (the feed above is not
          read — see the limits written there), and it can be stopped — by the control at its end or
          a tap anywhere on it.
          REAL settlements only, and NOTHING when the platform has settled nothing — `LiveTicker`
          returns null on an empty list, so the strip stops existing rather than inventing a line. */}
      <LiveTicker events={tickerEvents} />
      {/* ⭐ NO BOTTOM PADDING ON <main> (2026-09-13). It used to clear the fixed rail here AND
          `PublicFooter` clears it too — but the footer below is rendered unconditionally, so the
          document never ends at main, and the two stacked into ~250px of blank above the footer
          on phones and tablets. The clearance lives ONLY on the footer now (`qa:footer-reachable`).
          ⛔ If the footer is ever made conditional, main needs the clearance back for those routes.
          ⭐ 2026-09-14 — main GROWS (the shell is a flex column), so on a page shorter than the window
          the footer sits at the window's bottom edge instead of leaving a bare darker band under it
          (/wallet/deposit/return at 1280). Same pattern as admin/layout.tsx. */}
      <MainLandmark>
        <RouteTransition>{children}</RouteTransition>
      </MainLandmark>
      {/* `supportEmail` is resolved HERE for the third time on this line's own logic (E-226):
          the footer is `"use client"`, so a `SUPPORT_EMAIL()` call inside it reads the browser
          bundle's module default and can never show the address an officer saved. */}
      <PublicFooter proposalsState={proposalsState} agentDoorVisible={agentDoorVisible} inviteVisible={inviteVisible} supportEmail={SUPPORT_EMAIL()} supportPhone={SUPPORT_PHONE()} supportPhoneTel={SUPPORT_PHONE_TEL()} />
      {/* DG-P-11 — the rail's `More` needs the feature state for the same two reasons the bar
          and the footer already take it: DISABLED hides every proposals entry point, and the
          state flag (coming-soon / maintenance) must read the same on a phone as on a laptop. */}
      {/* ⛔ `walletHeld` IS THE RAIL'S BUSINESS NOW, for the same reason it is the header's:
          the centre slot is a money-in control and `/wallet/deposit` REFUSES a held wallet, so
          that slot becomes the Wallet door instead. Same input, same rule, two surfaces — read
          from the one place the wallet's status is resolved (`topUser` above). */}
      {journeyShown ? <Suspense fallback={null}><LazyJourneyTabs userId={session?.userId ?? null} /></Suspense> : <BottomNav isAuthed={!!session} proposalsState={proposalsState} inviteVisible={inviteVisible} walletHeld={!!topUser.walletHeld} />}
      <RealityCheckHost enabled={!!session} intervalMin={realityCheckMin} userId={session?.userId ?? null} />
      {/* 🔴 SESSION-GATED, like its neighbours on the lines above and below (audit F-08).
          It was the only one of the three that was not, and the omission had no upper bound.
          NotifyPoller's gate is a non-empty `50pick-notify-markets` key in localStorage, and
          its ONLY prune site lives inside `if (pr.ok)` after a call to
          /api/positions/settled — which answers 401 to a signed-out browser. So a lapsed or
          signed-out tab holding a stale watch entry could never clear it, and hit the
          unauthenticated /api/fairness/recent every 2 seconds indefinitely: one query per
          2s per abandoned tab, forever, for a player who is not even signed in.
          The row cost of that endpoint is genuinely small — measured on production it is an
          Index Scan over 53 rows in 0.169 ms — so this was never the "unbounded query" the
          audit described. What was unbounded was the DURATION. */}
      {session && <Suspense fallback={null}><LazyNotifyPoller /></Suspense>}
      {session && <Suspense fallback={null}><LazyEventStream /></Suspense>}
      {/* E-381 §6 item 4 — the signed-in shell notices, on the next navigation, that the session ended. */}
      {session && <SessionPresence />}
      <Suspense fallback={null}><LazyWinCelebration /></Suspense>
      {/* ⭐ THE RESULT OF A SALE (S6 A8h), signed in only, like the poller and the event stream above. A Sell button hands
          its result to this host, so a redrawn page no longer takes it away: a sold ticket leaves the open lens, and before
          A8h its result left with it. It stays until the player closes it (a sale that went through also closes at §F2's
          shared 5 s), and a move to another page closes it. It draws nothing until a sale, and a lost chunk leaves each
          button drawing its own result, as before. */}
      {session && <Suspense fallback={null}><LazySellResultHost /></Suspense>}
      <Suspense fallback={null}>
        <AuthFlash />
      </Suspense>
      <Suspense fallback={null}>
        <OfflineBanner />
      </Suspense>
      <Suspense fallback={null}>
        <LazyPullToRefresh />
      </Suspense>
      {/* The Needle — persistent edge-parked pause object, mounted ONCE in the shell
          so it survives route changes. Signed-in players only (it is a
          responsible-play surface whose presence tracks session length, and every
          viewer must be able to hide it — the toggle lives in the avatar menu, which
          is authed-only). Hides itself on money surfaces and when toggled off, and for a
          journey viewer on the journey's own pages (S6 WP7). Not rendered on /admin (that
          branch returns early). */}
      {session && <Needle />}
      {/* THE INSTALL INVITATION, AND IT IS NOT SESSION-GATED — a visitor who has not signed up is
          exactly who benefits from a home-screen icon. Its own eligibility rules do the gating (a
          second visit, 45 seconds in, never on a money-commit surface, dismissal remembered 14
          days, three refusals and it stops asking) and it renders NOTHING when the app is already
          installed. See install-invite.tsx for the numbers and why each is what it is.
          It is deliberately the LAST child: it is fixed-positioned, so its place in the stacking
          order is the thing that keeps it off the bottom nav and the Needle.
          ⛔ WITHDRAWN 2026-09-13 — mounted only while `installInviteLive` (feature-state.ts) is true.
          The mount stays, so re-enabling is one word rather than a rebuild. */}
      {installInviteLive && <Suspense fallback={null}><LazyInstallInvite /></Suspense>}
      {/* ANALYTICS CONSENT — NOT feature-gated and NOT session-gated: Google Analytics may run for any visitor,
          so any visitor must be asked first, and nothing loads until they answer. It shares the bottom invitation
          slot at priority 0, so it never stacks with the install card. ⛔ Do not put it behind a flag — a hidden
          prompt means nobody can consent, which is safe, but it would silently turn analytics off for everyone. */}
      <Suspense fallback={null}><LazyConsentPrompt /></Suspense>
      {/* THE CHANNELS PANEL, and like the install invitation it is NOT session-gated — a visitor
          who has not signed up is exactly who benefits from finding the channels. Its own rules
          do the gating (a second visit, 45 seconds in, once per visit, never on a money-commit
          surface or either responsible-gambling route, three X's and it backs off, six and it
          stops). It and the install card own different corners (`invitation-slot.ts` zones), so they
          never compete — and while the install invitation is withdrawn (2026-09-13) this panel is the
          only invitation a visitor can see.
          🔴 `promoSuppressed` is the RG gate: a player on a self-imposed break is never solicited.
          See `docs/COMPLIANCE-DECISIONS.md` (2026-09-12, second entry) for the override that
          permits an interstitial at all. */}
      <Suspense fallback={null}><LazyChannelsPanel promoSuppressed={promoSuppressed} /></Suspense>
    </div>
  );
}

/**
 * ⛔ ONE SKIP LINK, RENDERED BY BOTH SHELLS FROM HERE. `test:stacking` reads its focus z-index
 * as a SOLE declaration in this file, so a second copy for the opt-out shell would break the contract.
 */
function SkipToContent({ label }: { label: string }) {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:rounded-md focus:bg-brand-500 focus:px-4 focus:py-2 focus:text-white focus:text-sm focus:font-semibold focus:outline-none focus:shadow-lg"
    >
      {label}
    </a>
  );
}

/**
 * ⛔ ONE DEFINITION OF THE `main-content` LANDMARK FOR BOTH SHELLS — the skip link's target, and the tag
 * `measure.anchors.mjs` mutates (its `from` must resolve exactly once in this file, so ⛔ do not spell
 * the opening tag out in a comment either). Each shell renders exactly one.
 * `flex-1` plus `#main-content { min-height: 100svh }` (globals.css, D26): main is always at least one
 * viewport tall, so the footer starts BELOW the fold on every page, short ones included, and never
 * shifts inside the viewport as content arrives. On `/s` that is ~520px of scroll above the licence
 * lines, by design.
 */
function MainLandmark({ children }: { children: React.ReactNode }) {
  return <main id="main-content" className="flex-1">{children}</main>;
}

/**
 * ⭐ D6 (2026-09-26) · THE SHELL FOR `/s/<token>` (and bare `/s`), THE WAY OUT OF A MARKETING SMS.
 *
 * The person on this page came to STOP. The player shell put the whole betting product around that one
 * tap: a filled "Jisajili" in the page's own button colour, the market nav, the bottom rail, the chat
 * bubble and "Pendekeza masoko upate pesa" — and on the invalid-link state, sign-in and sign-up were the
 * ONLY actions on the page. Ruling 5: no upsell here. So this renders the brand, the language menu, the
 * page, and the footer's regulator lines (18+, the Gaming Board licence, the responsible-gambling
 * sentence) — nothing that sells, and nothing that navigates.
 *
 * ⛔ THE LOGO IS NOT A LINK, AND NOTHING HERE IS A `<Link>`. This branch is decided in the ROOT layout,
 * which a soft navigation does not re-run (E-70): a `<Link href="/">` from here would render the landing
 * page inside this stripped shell. The page's own exit (`/profile/notifications`) is a plain `<a>`.
 * ⛔ The chat bubble and the first-visit primer are mounted from the root layout, outside this shell, so
 * they stay off `/s` through their own `HIDE_ON` (`ChatRoot.tsx`, `first-visit-primer.tsx`);
 * `test:marketing-optout` reads all three together.
 * ⛔ No helpline line since the owner's ruling of 2026-10-06 (`docs/COMPLIANCE-DECISIONS.md`) — the
 * same rule as the full footer.
 */
function OptOutShell({ t, children }: { t: Dict; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-bg-base text-text">
      <SkipToContent label={t.common.skipToContent} />
      <header style={{ height: 56, background: "var(--panel)", borderBottom: "1px solid var(--border)" }}>
        <div className="mx-auto max-w-board flex items-center justify-between h-full gap-2 px-3 sm:px-5">
          <span className="inline-flex min-h-[44px] items-center">
            <FiftyLockup size={22} />
          </span>
          <LanguageMenu />
        </div>
      </header>
      <MainLandmark>{children}</MainLandmark>
      <footer className="mt-8 lg:mt-12 bg-bg-elevated/40" data-testid="optout-footer">
        <div aria-hidden className="claret-rule mx-auto max-w-board" />
        <div className="mx-auto max-w-board px-3 lg:px-6 pt-4 pb-7 space-y-2">
          <div className="flex items-center gap-[10px]">
            {/* No aria-label: "18+" is the text, and ARIA prohibits a label on a generic span (public-footer.tsx). */}
            <span className="kp-rg__18">{t.footer.eighteenPlus}</span>
            {/* zh keeps its words whole (break-keep); the zh string carries zero-width break hints. */}
            <p className="text-text-muted leading-relaxed text-body-sm text-balance break-keep">{t.footer.licensedByGbt}</p>
          </div>
          {/* 13px, not the full footer's 11px: a licence line is read, and 11px is under the reading floor (type-scale §3). */}
          <p className="font-mono text-body-sm text-text-subtle tabular-nums">{t.footer.license}: {LICENCE_NUMBER()}</p>
          <p className="italic text-text-subtle text-body-sm text-balance break-keep">{t.footer.stopGambling}</p>
        </div>
      </footer>
    </div>
  );
}
