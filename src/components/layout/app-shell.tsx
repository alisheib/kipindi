import { Suspense, lazy } from "react";
import { headers } from "next/headers";

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
import { SessionRevokedRedirect } from "./session-revoked-redirect";
import { db } from "@/lib/server/store";
import { guestUser } from "@/lib/ui-stubs";
import { getTickerFeed } from "@/lib/server/ticker-feed";
import { RealityCheckHost } from "@/components/rg/reality-check";
import { getRgSettings } from "@/lib/server/responsible-gambling";
import { hasRole, ADMIN_CONSOLE_ROLES } from "@/lib/server/roles";
import { displayLabel, displayInitials } from "@/lib/display-label";
import { getServerT } from "@/lib/i18n-server";
import { getPlatformConfig, maintenanceMessage } from "@/lib/server/platform-config";
import { getProposalsConfig } from "@/lib/server/proposals-config";
import { AnnouncementBanner } from "./announcement-banner";
import { EmailVerifyBanner } from "./email-verify-banner";
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
  // B-13 — the revoked device gets its explanation. getSession() found the
  // cookie displaced by a newer login but could not set the flash (render
  // context); route to login with ?revoked=1 instead of silently rendering a
  // signed-out shell. /auth/* is excluded so the login page itself renders.
  if (!session && wasSessionRevokedThisRequest() && !pathname.startsWith("/auth")) {
    return <SessionRevokedRedirect next={h.get("x-href") ?? pathname} />;
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
  if (session) {
    // Batch all three queries in parallel — eliminates the sequential
    // waterfall. Promise.allSettled so one failing query can't crash
    // the entire shell (graceful degradation: show what we have).
    const [uResult, walletResult, rgResult] = await Promise.allSettled([
      db.user.findById(session.userId),
      db.wallet.findByUserId(session.userId),
      getRgSettings(session.userId),
    ]);
    const u = uResult.status === "fulfilled" ? uResult.value : null;
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
      <TopAppBar user={topUser} proposalsState={proposalsState} />
      <AnnouncementBanner maintenance={maintBanner} announcement={announcement} />
      {emailVerifyState && <EmailVerifyBanner email={emailVerifyState.email} />}
      {/* REAL settlements only, and NOTHING when the platform has settled nothing —
          `LiveTicker` returns null on an empty list, so the strip stops existing rather than
          inventing a line to fill itself. */}
      <LiveTicker events={tickerEvents} />
      <main id="main-content" className="pb-[calc(88px+env(safe-area-inset-bottom))] lg:pb-0">
        <RouteTransition>{children}</RouteTransition>
      </main>
      <PublicFooter proposalsState={proposalsState} />
      {/* DG-P-11 — the rail's `More` needs the feature state for the same two reasons the bar
          and the footer already take it: DISABLED hides every proposals entry point, and the
          state flag (coming-soon / maintenance) must read the same on a phone as on a laptop. */}
      <BottomNav isAuthed={!!session} proposalsState={proposalsState} />
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
