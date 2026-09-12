import { Suspense, lazy } from "react";
import { headers } from "next/headers";
import { getAgentConfig } from "@/lib/server/agent-config";
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_PHONE_TEL } from "@/lib/server/support-config";

const LazyOfflineBanner = lazy(() =>
  import("@/components/ui/offline-banner").then((m) => ({ default: m.OfflineBanner })),
);
const LazyPullToRefresh = lazy(() =>
  import("@/components/ui/pull-to-refresh").then((m) => ({ default: m.PullToRefresh })),
);
// Background, event-driven, never-LCP components — split out of the critical
// first-load bundle (they render nothing until an event/poll fires, so a
// post-hydration load is invisible). Trims initial JS on the low-end/2G profile.
const LazyNotifyPoller = lazy(() =>
  import("@/components/markets/notify-poller").then((m) => ({ default: m.NotifyPoller })),
);
const LazyEventStream = lazy(() =>
  import("./event-stream-provider").then((m) => ({ default: m.EventStreamProvider })),
);
const LazyInstallInvite = lazy(() =>
  import("@/components/pwa/install-invite").then((m) => ({ default: m.InstallInvite })),
);
const LazyWinCelebration = lazy(() =>
  import("@/components/markets/win-celebration").then((m) => ({ default: m.WinCelebrationHost })),
);
import { TopAppBar } from "./top-app-bar";
import { LiveTicker } from "./live-ticker";
import { BottomNav } from "./bottom-nav";
import { PublicFooter } from "./public-footer";
import { AuthFlash } from "./auth-flash";
import { NavProgress } from "@/components/ui/nav-progress";
import { RouteTransition } from "@/components/ui/route-transition";
import { getSession, wasSessionRevokedThisRequest } from "@/lib/server/session";
import { redirect } from "next/navigation";
import { db } from "@/lib/server/store";
import { guestUser } from "@/lib/ui-stubs";
import { getTickerFeed } from "@/lib/server/ticker-feed";
import { RealityCheckHost } from "@/components/rg/reality-check";
import { getRgSettings } from "@/lib/server/responsible-gambling";
import { hasRole, ADMIN_CONSOLE_ROLES, type Role } from "@/lib/server/roles";
import { inviteIsLiveFor, NO_VIEWER, type InviteViewer } from "@/lib/feature-state";
import { agentStandingFor } from "@/lib/server/affiliate-service";
import { displayLabel, displayInitials } from "@/lib/display-label";
import { getServerT } from "@/lib/i18n-server";
import { getPlatformConfig, maintenanceMessage } from "@/lib/server/platform-config";
import { getProposalsConfig } from "@/lib/server/proposals-config";
import { AnnouncementBanner } from "./announcement-banner";
import { EmailVerifyBanner } from "./email-verify-banner";
import { KycVerifyBanner } from "./kyc-verify-banner";
import { kycGateState } from "@/lib/kyc-gate-state";
import { getKycStatus } from "@/lib/server/kyc-service";
import { AwaySummaryBar } from "./away-summary-bar";
import { Needle } from "./needle";
import { HeaderScrollCast } from "./scroll-cast";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const { t, locale } = await getServerT();
  // Admin routes render their own full-screen layout (sidebar, topbar, chrome).
  // Skip the player shell entirely so admin pages don't get a double navbar.
  const h = await headers();
  const pathname = h.get("x-pathname") ?? "";
  if (pathname.startsWith("/admin")) {
    return <>{children}</>;
  }

  const session = await getSession();
  // B-13 — the revoked device gets its explanation. getSession() found the cookie displaced in
  // the registry (or with no row at all) but could not set the flash, because cookie mutation
  // throws in a render. Send it to the login page with `?revoked=1` instead of silently
  // rendering a signed-out shell. /auth/* is excluded so the login page itself renders — ⛔ that
  // exclusion is load-bearing: without it this redirects /auth/login to itself.
  //
  // 🔴 E-381 · `redirect()`, NOT A CLIENT SHIM — AND THE DIFFERENCE WAS A TOTAL LOCKOUT.
  // This used to `return <SessionRevokedRedirect next={…} />`, a "use client" component that
  // called `router.replace()` from a useEffect. Two things made that catastrophic, and the
  // second is the one that is easy to miss:
  //   ① The branch returns INSTEAD OF `{children}`, and AppShell is the root layout's only
  //      consumer of `children` (`app/layout.tsx:154`). So the rendered tree had no children
  //      slot at all.
  //   ② `router.replace` is a SOFT navigation, and **a shared root layout is not re-executed
  //      on one** — Next prunes the matching root segment from the flight response
  //      (`walk-tree-with-flight-router-state.js`: `renderComponentsOnThisLevel` is false when
  //      the segment matches). So the login page's RSC payload came back **200** and mounted
  //      NOWHERE. The player sat on the bare `<body>` — navy, and literally nothing else — with
  //      zero console errors, zero page errors and nothing in the logs.
  // Measured 2026-09-12 on /wallet, /positions, /markets and the fully public /legal/rules:
  // `innerText.length === 0` every time, while the SAME url hard-loaded rendered 1029 chars.
  // Production had been recording it: 220 revocations against 30 logins across 7 accounts, with
  // one device writing 9 audit rows in 31 seconds because the cookie is never cleared.
  //
  // ⭐ A `redirect()` from a Server Component is a REAL 307 on a document request, so the login
  // page arrives on a fresh render with its own layout — no client component, no blank frame,
  // and it works with JavaScript disabled, which the shim never did. `admin/layout.tsx:59` has
  // done exactly this, in this same Next version, in production, all along.
  // ⚠️ On a `router.refresh()` or a Server Action the tree re-renders FROM the root, so this
  // branch does run there and `redirect()` degrades to a client router navigation — which still
  // lands correctly, because a children slot exists in that render.
  // ⛔ `as never` is required by `typedRoutes: true` (next.config.ts) — same cast, same reason,
  // as `admin/layout.tsx:59`. It silences the only compile-time check on this string, so
  // `test:revoked-deadend` asserts the literal `revoked=1` that `auth/login/page.tsx:42` reads.
  // ⛔ DO NOT reintroduce a client redirect here, and do not assert this from the URL: the URL
  // was correct (`/auth/login?revoked=1&next=…`) for the whole life of the bug. That is exactly
  // how it shipped green. See `docs/SESSION-REVOKED-DEADEND.md`.
  if (!session && wasSessionRevokedThisRequest() && !pathname.startsWith("/auth")) {
    const raw = h.get("x-href") ?? pathname;
    const safe = /^\/(?![/\\])/.test(raw) && !raw.startsWith("/auth/") ? raw : "";
    redirect(`/auth/login?revoked=1${safe ? `&next=${encodeURIComponent(safe)}` : ""}` as never);
  }
  let topUser: {
    initials: string;
    name: string;
    phone: string;
    isAuthed: boolean;
    avatarSrc?: string | null;
    seed?: string;
    balance?: number | null;
    isAdmin?: boolean;
  } = { initials: guestUser.initials, name: guestUser.name, phone: guestUser.phone, isAuthed: false, balance: null };
  let realityCheckMin = 30;
  /** Non-null = signed in with an UNCONFIRMED address → show the standing bar. */
  let emailVerifyState: { email: string | null } | null = null;
  /** Non-null = signed in and NOT yet verified → show the standing identity bar. */
  let kycVerifyState: { state: NonNullable<ReturnType<typeof kycGateState>> } | null = null;
  /** The viewer's role, hoisted out of the session block for the feature-state read below.
   *  ⚠️ Stays null when the user fetch FAILED — which resolves every role-gated feature to
   *  hidden, the only safe direction for a failed read. */
  /** Who is asking about Invite — standing, not role. See `feature-state.ts` → `InviteViewer`. */
  let inviteViewer: InviteViewer = NO_VIEWER;
  if (session) {
    // Batch all three queries in parallel — eliminates the sequential
    // waterfall. Promise.allSettled so one failing query can't crash
    // the entire shell (graceful degradation: show what we have).
    // ⛔ THE KYC READ JOINS THE EXISTING BATCH — it is NOT awaited separately. This
    // component renders on EVERY page; a fourth sequential round trip here is a latency
    // tax on the whole platform, which is the same rule the ticker note below states.
    const [uResult, walletResult, rgResult, kycResult, affResult] = await Promise.allSettled([
      db.user.findById(session.userId),
      db.wallet.findByUserId(session.userId),
      getRgSettings(session.userId),
      getKycStatus(session.userId),
      // ⭐ The affiliate row rides in the same batch — invite visibility is decided by the
      // agent's STANDING (approved + active + account status), never by the role alone, and
      // a fifth sequential round trip on every page is the latency tax the note above forbids.
      db.affiliate.findByUserId(session.userId),
    ]);
    const u = uResult.status === "fulfilled" ? uResult.value : null;
    const aff = affResult.status === "fulfilled" ? affResult.value : null;
    // ⚠️ A failed user read leaves NO_VIEWER — a failed read must never open a withdrawn programme.
    inviteViewer = u ? { role: u.role, agentInGoodStanding: agentStandingFor(u, aff).ok } : NO_VIEWER;
    const wallet = walletResult.status === "fulfilled" ? walletResult.value : null;
    const rg = rgResult.status === "fulfilled" ? rgResult.value : null;
    const kyc = kycResult.status === "fulfilled" ? kycResult.value : null;
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
      // Staff-tier users get an admin-console jump in the avatar menu.
      // hasRole is null-safe, so a failed user fetch simply hides it.
      isAdmin: hasRole(u?.role, ADMIN_CONSOLE_ROLES),
    };
    realityCheckMin = rg?.realityCheckIntervalMin || 30;
    // Email confirmation gates depositing, so an unconfirmed address is a live
    // limitation on the account and belongs on every page — not only on the
    // deposit form the player may not reach for days. `u` is null only if the
    // user fetch failed above, in which case we stay silent rather than accuse a
    // player of being unverified on the strength of a failed query.
    emailVerifyState = u
      ? (u.emailVerifiedAt ? null : { email: u.email ?? null })
      : null;

    // ⭐ THE SAME ARGUMENT, ONE RUNG UP. Identity now gates depositing, playing AND
    // withdrawing, so an unverified account is the LARGEST live limitation there is — and
    // until this bar existed the only places that said so were the money screens
    // themselves. A player who signs up, browses for a week and never opens /wallet
    // would first learn at the moment they tried to stake: the worst possible moment to
    // introduce a step with a review queue behind it.
    //
    // ⚠️ SILENT ON A FAILED READ, exactly like the email bar above. `kycResult` rejecting
    // is a database problem, and accusing a verified player of being unverified — on every
    // page — is worse than showing nothing. The money paths still refuse safely; they fail
    // toward refusing, this fails toward quiet.
    // ⛔ `kycResult` FULFILLED WITH `null` IS NOT A FAILURE — it is a real account with no
    // submission yet, which is precisely the population this bar is for. The two cases are
    // distinguished by the settled STATUS, never by the value being null.
    kycVerifyState = kycResult.status === "fulfilled"
      ? (kycGateState(kyc?.status) ? { state: kycGateState(kyc?.status)! } : null)
      : null;
  }

  // The live ticker's REAL settlements. Batched with the config read rather than awaited at its
  // JSX site so the two do not serialise; `getPlatformStats` is memoised on `globalThis` for 60s,
  // so on a warm shell this costs nothing at all. ⛔ It must never become a per-request scan —
  // this component renders on EVERY page (see the ONE-SCAN note in `platform-stats.ts`).
  const [platformCfg, tickerEvents] = await Promise.all([
    // Site-wide operator banner (§9.3 #5) — maintenance notice takes priority
    // over an active broadcast. Cheap cached config read (graceful on failure).
    getPlatformConfig().catch(() => null),
    getTickerFeed(locale).catch(() => []),
  ]);
  const maintBanner = platformCfg?.maintenanceMode ? await maintenanceMessage().catch(() => null) : null;
  const announcement = platformCfg?.announcement?.active && platformCfg.announcement.message.trim()
    ? { message: platformCfg.announcement.message, tone: platformCfg.announcement.tone }
    : null;

  // Proposals feature-state — drives the entry-point badges (top bar, avatar
  // menu, footer). Sync cache read; safe default (COMING_SOON) if unhydrated.
  const proposalsState = getProposalsConfig().state;

  /* ⭐ INVITE IS RESOLVED HERE, ONCE, BECAUSE THIS IS THE ONLY PLACE THAT KNOWS THE ROLE.
     The three surfaces that offer Invite are all `"use client"` and none of them can read a
     role — so the shell answers the question and threads the ANSWER down, exactly as
     `proposalsState` above already does. ⛔ Do not push `feature-state.ts` into those
     components to save a prop: importing a server module from a client file is what took
     every page in this app down once already.
     ⚠️ `u` is null only when the user fetch above FAILED. Defaulting to hidden is the safe
     direction — a failed read must never open a withdrawn programme.
     🔴 AND IT IS STANDING, NOT ROLE (2026-09-07). `inviteIsLiveFor(viewerRole)` kept every
     entry point open for a DEACTIVATED agent, because deactivation leaves the role in place. */
  const inviteVisible = inviteIsLiveFor(inviteViewer);

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

  return (
    <div className="min-h-screen bg-bg-base text-text">
      {/* Skip-to-content — WCAG 2.4.1. Visually hidden until focused,
          then overlays the top-left so keyboard/screen-reader users can
          bypass the nav on every page load. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:rounded-md focus:bg-brand-500 focus:px-4 focus:py-2 focus:text-white focus:text-sm focus:font-semibold focus:outline-none focus:shadow-lg"
      >
        {t.common.skipToContent}
      </a>
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
      <TopAppBar user={topUser} proposalsState={proposalsState} inviteVisible={inviteVisible} />
      <AnnouncementBanner maintenance={maintBanner} announcement={announcement} />
      {/* ⭐ IDENTITY ABOVE EMAIL, for the reason the note below the email bar already
          gives: when two bars are up, the one that costs the player more must read first.
          Since 2026-09-05 identity gates depositing, playing AND withdrawing, while an
          unconfirmed address gates depositing alone — so identity is now the larger of the
          two, and it takes the top slot the email bar used to hold. */}
      {kycVerifyState && <KycVerifyBanner state={kycVerifyState.state} />}
      {emailVerifyState && <EmailVerifyBanner email={emailVerifyState.email} />}
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
      {/* REAL settlements only, and NOTHING when the platform has settled nothing —
          `LiveTicker` returns null on an empty list, so the strip stops existing rather than
          inventing a line to fill itself. */}
      <LiveTicker events={tickerEvents} />
      <main id="main-content" className="pb-[calc(88px+env(safe-area-inset-bottom))] lg:pb-0">
        <RouteTransition>{children}</RouteTransition>
      </main>
      {/* `supportEmail` is resolved HERE for the third time on this line's own logic (E-226):
          the footer is `"use client"`, so a `SUPPORT_EMAIL()` call inside it reads the browser
          bundle's module default and can never show the address an officer saved. */}
      <PublicFooter proposalsState={proposalsState} agentDoorVisible={agentDoorVisible} supportEmail={SUPPORT_EMAIL()} supportPhone={SUPPORT_PHONE()} supportPhoneTel={SUPPORT_PHONE_TEL()} />
      {/* DG-P-11 — the rail's `More` needs the feature state for the same two reasons the bar
          and the footer already take it: DISABLED hides every proposals entry point, and the
          state flag (coming-soon / maintenance) must read the same on a phone as on a laptop. */}
      <BottomNav isAuthed={!!session} proposalsState={proposalsState} inviteVisible={inviteVisible} />
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
      <Suspense fallback={null}><LazyWinCelebration /></Suspense>
      <Suspense fallback={null}>
        <AuthFlash />
      </Suspense>
      <Suspense fallback={null}>
        <LazyOfflineBanner />
      </Suspense>
      <Suspense fallback={null}>
        <LazyPullToRefresh />
      </Suspense>
      {/* The Needle — persistent edge-parked pause object, mounted ONCE in the shell
          so it survives route changes. Signed-in players only (it is a
          responsible-play surface whose presence tracks session length, and every
          viewer must be able to hide it — the toggle lives in the avatar menu, which
          is authed-only). Hides itself on money surfaces and when toggled off. Not
          rendered on /admin (that branch returns early). */}
      {session && <Needle />}
      {/* THE INSTALL INVITATION, AND IT IS NOT SESSION-GATED — a visitor who has not signed up is
          exactly who benefits from a home-screen icon. Its own eligibility rules do the gating (a
          second visit, 45 seconds in, never on a money-commit surface, dismissal remembered 14
          days, three refusals and it stops asking) and it renders NOTHING when the app is already
          installed. See install-invite.tsx for the numbers and why each is what it is.
          It is deliberately the LAST child: it is fixed-positioned, so its place in the stacking
          order is the thing that keeps it off the bottom nav and the Needle. */}
      <Suspense fallback={null}><LazyInstallInvite /></Suspense>
    </div>
  );
}
