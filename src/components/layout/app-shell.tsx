import { Suspense, lazy } from "react";
import { headers } from "next/headers";

const LazyOfflineBanner = lazy(() =>
  import("@/components/ui/offline-banner").then((m) => ({ default: m.OfflineBanner })),
);
const LazyPullToRefresh = lazy(() =>
  import("@/components/ui/pull-to-refresh").then((m) => ({ default: m.PullToRefresh })),
);
import { TopAppBar } from "./top-app-bar";
import { LiveTicker } from "./live-ticker";
import { BottomNav } from "./bottom-nav";
import { PublicFooter } from "./public-footer";
import { AuthFlash } from "./auth-flash";
import { NotifyPoller } from "@/components/markets/notify-poller";
import { WinCelebrationHost } from "@/components/markets/win-celebration";
import { NavProgress } from "@/components/ui/nav-progress";
import { RouteTransition } from "@/components/ui/route-transition";
import { getSession } from "@/lib/server/session";
import { db } from "@/lib/server/store";
import { guestUser } from "@/lib/ui-stubs";
import { getTickerFeed } from "@/lib/server/ticker-feed";
import { RealityCheckHost } from "@/components/rg/reality-check";
import { getRgSettings } from "@/lib/server/responsible-gambling";
import { displayLabel, displayInitials } from "@/lib/display-label";

export async function AppShell({ children }: { children: React.ReactNode }) {
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
  } = { initials: guestUser.initials, name: guestUser.name, phone: guestUser.phone, isAuthed: false, balance: null };
  let realityCheckMin = 30;
  if (session) {
    const u = await db.user.findById(session.userId);
    // Canonical display: real displayName if set, otherwise the
    // auto-generated "Player #ABCDEF" anonymous handle. Never the old
    // "Demo Manager" placeholder — that read as a bug to operators.
    const userRef = u ?? { id: session.userId, displayName: null };
    const display = displayLabel(userRef);
    const initials = displayInitials(userRef);
    const masked = session.phoneE164.length > 6
      ? `${session.phoneE164.slice(0, 4)}*****${session.phoneE164.slice(-2)}`
      : session.phoneE164;
    const wallet = await db.wallet.findByUserId(session.userId);
    topUser = {
      initials,
      name: display,
      phone: masked,
      isAuthed: true,
      avatarSrc: u?.avatarDataUrl ?? null,
      seed: session.userId,
      balance: wallet?.balance ?? null,
    };
    const rg = await getRgSettings(session.userId);
    realityCheckMin = rg.realityCheckIntervalMin || 30;
  }
  return (
    <div className="min-h-screen bg-bg-base text-text">
      {/* Skip-to-content — WCAG 2.4.1. Visually hidden until focused,
          then overlays the top-left so keyboard/screen-reader users can
          bypass the nav on every page load. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:rounded-md focus:bg-brand-500 focus:px-4 focus:py-2 focus:text-white focus:text-sm focus:font-semibold focus:outline-none focus:shadow-lg"
      >
        Skip to content
      </a>
      <Suspense fallback={null}><NavProgress /></Suspense>
      <TopAppBar user={topUser} />
      <LiveTicker events={getTickerFeed()} />
      <main id="main-content" className="pb-[calc(64px+env(safe-area-inset-bottom))] xl:pb-0">
        <RouteTransition>{children}</RouteTransition>
      </main>
      <PublicFooter />
      <BottomNav isAuthed={!!session} />
      <RealityCheckHost enabled={!!session} intervalMin={realityCheckMin} userId={session?.userId ?? null} />
      <NotifyPoller />
      <WinCelebrationHost />
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
