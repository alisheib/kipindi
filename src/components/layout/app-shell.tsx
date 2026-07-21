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
import { getSession } from "@/lib/server/session";
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

export async function AppShell({ children }: { children: React.ReactNode }) {
  const { t } = await getServerT();
  // Admin routes render their own full-screen layout (sidebar, topbar, chrome).
  // Skip the player shell entirely so admin pages don't get a double navbar.
  const h = await headers();
  const pathname = h.get("x-pathname") ?? "";
  if (pathname.startsWith("/admin")) {
    return <>{children}</>;
  }

  const session = await getSession();
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

  // Site-wide operator banner (§9.3 #5) — maintenance notice takes priority
  // over an active broadcast. Cheap cached config read (graceful on failure).
  const platformCfg = await getPlatformConfig().catch(() => null);
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
      <Suspense fallback={null}><NavProgress /></Suspense>
      <TopAppBar user={topUser} proposalsState={proposalsState} />
      <AnnouncementBanner maintenance={maintBanner} announcement={announcement} />
      {emailVerifyState && <EmailVerifyBanner email={emailVerifyState.email} />}
      <LiveTicker events={getTickerFeed()} />
      <main id="main-content" className="pb-[calc(88px+env(safe-area-inset-bottom))] lg:pb-0">
        <RouteTransition>{children}</RouteTransition>
      </main>
      <PublicFooter proposalsState={proposalsState} />
      <BottomNav isAuthed={!!session} />
      <RealityCheckHost enabled={!!session} intervalMin={realityCheckMin} userId={session?.userId ?? null} />
      <Suspense fallback={null}><LazyNotifyPoller /></Suspense>
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
    </div>
  );
}
