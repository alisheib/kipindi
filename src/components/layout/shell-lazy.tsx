"use client";

/**
 * THE SHELL'S DEFERRED PARTS — every client component AppShell loads only when a render uses it, declared once, here
 * (the Vodacom plan S6, WP6c; `docs/VODACOM-PLAN.md` §0h point 20).
 *
 * ⭐ WHY A CLIENT MODULE. AppShell is a SERVER component, and its own `React.lazy(() => import(…))` bindings split
 * nothing in this build (Next 16, Turbopack): production showed the journey's header and tabs in the scripts every page
 * loads first, for every visitor, in the chunk that already held the channels panel and the consent prompt, and a local
 * production build read the older parts there too. `next/dynamic` in a client module does split, as that local build
 * showed the same day: each part below is a chunk of its own, fetched when a render uses it, and a server render that
 * uses one names that chunk in the page's head (Next's PreloadChunks, read from the route's react-loadable manifest),
 * so the browser asks for it early, at low priority.
 * ⛔ THE SERVER RENDER STAYS ON, AND NO PART TAKES AN OPTION OBJECT. With neither `ssr: false` nor `loading`,
 * `next/dynamic` adds no Suspense boundary of its own (`hasSuspenseBoundary` in
 * `next/dist/shared/lib/lazy-dynamic/loadable.js`), so each part sits in the one boundary AppShell wraps it in, under
 * AppShell's fallback: the markup a classic visitor is served keeps its elements and its boundary markers; the head
 * gains the preloads, and the inline RSC data names this module's exports. Turning the server render off would also
 * take the journey header out of the server's HTML. Only WHEN a part's code downloads changes.
 * ⚠️ `qa:classic-shell-parity` compares the shell's regions (header, rail, footer, email bar) and its on-screen
 * overlays; these parts' boundaries sit beside those regions, so it cannot see them. `test:journey-shell`
 * 12.shell.wrapped holds the boundaries, and the served-HTML drive of VODACOM-PLAN §0i (WP6c) compares the bytes.
 * ⭐ A PART WHOSE CODE NEVER ARRIVES IS LEFT OUT, NOT FATAL. Each part is now a fetch of its own, and a fetch can fail:
 * a dropped connection, or a deploy landing between the page and its chunk. Turbopack names that a `ChunkLoadError` and
 * never retries it, and with nothing between AppShell and the root to catch it, React's rejected lazy load would take
 * the whole page to the critical-error screen. So every loader below ends in `nothingIfLost`: the part renders nothing
 * for the rest of that page's life, one report per page goes to `/api/client-error` (the endpoint and the body the
 * error boundaries send), and any other error is thrown on, exactly as before. The server never takes this path (its
 * chunks are on disk), so the HTML does not change.
 * ⛔ THE OFFLINE BANNER IS NOT HERE, ON PURPOSE: its one job is a connection that fails, so AppShell imports it
 * statically and its code comes with the page, as it always did (12.shell.offline).
 * ⛔ Each part keeps the name AppShell rendered before WP6c, and AppShell renders it where it did, with the same props.
 * `test:journey-shell` §12 holds AppShell, this file and every module named below to all of the above, with plants: the
 * parts and their boundaries (the 12.shell checks), this file's shape and its guard (the 12.module checks and
 * 12.parts.table), each part's module (12.parts.client and 12.parts.home), and no server module anywhere deferring a
 * client one (12.nolazy.platform and 12.nodefer.platform).
 */
import dynamic from "next/dynamic";

/** What a part renders when its code never arrived: nothing. */
function Nothing(): null {
  return null;
}

/** One report per page: the parts share one connection, so a dropped one would otherwise report each of them. */
let reported = false;

/**
 * The end of every part's loader: a `ChunkLoadError` (the browser could not fetch the part's code) leaves the part out,
 * reported once; anything else is thrown on, as it was before WP6c. See "A PART WHOSE CODE NEVER ARRIVES" above.
 */
function nothingIfLost(error: unknown): typeof Nothing {
  if (!(error instanceof Error) || error.name !== "ChunkLoadError") throw error;
  if (!reported && typeof window !== "undefined") {
    reported = true;
    try {
      const body = JSON.stringify({
        message: `A part of the shell never arrived and was left out: ${error.message}`.slice(0, 1_000),
        stack: String(error.stack ?? "").slice(0, 4_000),
        path: window.location.pathname,
        digest: null,
        build: String((globalThis as { NEXT_DEPLOYMENT_ID?: string }).NEXT_DEPLOYMENT_ID ?? "") || null,
      });
      if (typeof navigator.sendBeacon === "function") {
        navigator.sendBeacon("/api/client-error", new Blob([body], { type: "application/json" }));
      }
    } catch {
      /* reporting must never be the thing that breaks the page */
    }
  }
  return Nothing;
}

// The shell's own overlays, mounted for every visitor. Each draws nothing in the server's HTML, and most draw nothing
// until an event, a poll or a timer fires. The win celebration's module also reaches every first load through
// `away-summary-bar.tsx`, which imports `dispatchWinCelebration` from it, so for that one only the mount moves here.
export const LazyPullToRefresh = dynamic(() => import("@/components/ui/pull-to-refresh").then((m) => m.PullToRefresh).catch(nothingIfLost));
export const LazyWinCelebration = dynamic(() => import("@/components/markets/win-celebration").then((m) => m.WinCelebrationHost).catch(nothingIfLost));
// Signed in only (AppShell gates both on the session): the settled-position poller and the server-sent events.
export const LazyNotifyPoller = dynamic(() => import("@/components/markets/notify-poller").then((m) => m.NotifyPoller).catch(nothingIfLost));
export const LazyEventStream = dynamic(() => import("@/components/layout/event-stream-provider").then((m) => m.EventStreamProvider).catch(nothingIfLost));
// The invitations: the install card (withdrawn: AppShell mounts it only while its switch is on), the analytics consent
// prompt (asked of every visitor, never gated) and the channels panel.
export const LazyInstallInvite = dynamic(() => import("@/components/pwa/install-invite").then((m) => m.InstallInvite).catch(nothingIfLost));
export const LazyConsentPrompt = dynamic(() => import("@/components/analytics/consent-prompt").then((m) => m.ConsentPrompt).catch(nothingIfLost));
export const LazyChannelsPanel = dynamic(() => import("@/components/social/channels-panel").then((m) => m.ChannelsPanel).catch(nothingIfLost));
// The journey (S6): the flag, mounted for a journey request only, and the header and the tabs, the journey arms of
// AppShell's two ternaries. A page the journey is not shown to never fetches them.
export const LazyJourneyFlag = dynamic(() => import("@/components/journey/journey-flag").then((m) => m.JourneyFlag).catch(nothingIfLost));
export const LazyJourneyTopBar = dynamic(() => import("@/components/journey/journey-top-bar").then((m) => m.JourneyTopBar).catch(nothingIfLost));
export const LazyJourneyTabs = dynamic(() => import("@/components/journey/journey-tabs").then((m) => m.JourneyTabs).catch(nothingIfLost));
