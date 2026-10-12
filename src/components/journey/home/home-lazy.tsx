"use client";

/**
 * THE JOURNEY HOME'S DEFERRED PARTS — the client parts of the home on `/`, each loaded only when the home renders it (the
 * Vodacom plan S7, `S7-PLAN.md` WP6 step 2, WP7 and amendment A13(a); the shell's pattern, `layout/shell-lazy.tsx`,
 * VODACOM-PLAN §0h point 20).
 *
 * ⭐ WHY A CLIENT MODULE. The journey home (`journey-home.tsx`, WP7) is a SERVER component on `/`, and any "use client"
 * module a server file imports joins that route's first-load JavaScript for every visitor — a classic one included
 * (§0h point 20) — while a server module may not defer one itself (`test:journey-shell` 12.nodefer.platform: from a
 * server file it joins the first load all the same). So the home imports this small module alone, and this one asks for
 * each part through `next/dynamic`, which splits it into a chunk of its own, fetched when a render uses it — a journey
 * request's. `/`'s first load gains these declarations and nothing of the parts (the TicketSwitchRail precedent).
 * ⛔ THE SERVER RENDER STAYS ON, AND NO OPTION OBJECT: with neither `ssr: false` nor `loading`, `next/dynamic` adds no
 * Suspense boundary of its own (the WP6c finding, VODACOM-PLAN §0i), so the How-to card is in the home's first HTML,
 * where the home's ghost drew it, and nothing moves when its script lands; the page's head names each chunk it renders.
 * ⭐ A PART WHOSE CODE NEVER ARRIVES IS LEFT OUT, NOT FATAL: each loader ends in the app's one lost-chunk guard
 * (`layout/lost-chunk.ts`, A13(a)) — a `ChunkLoadError` renders nothing, reported once per page; anything else is thrown on.
 * ⭐ ONE LINE PER PART: the How-to card (with the static sheet it opens), the kit's RefreshPoller (the home's 30-second
 * refresh, §3.2), the kit's EmptyState (WP7 draws the home's three empty states with it — WP6 step 2's condition for
 * declaring it here) and the kit's StripAutoScroll (WP7: the chips rail is the house's scrolling strip, and this leaf
 * frames the pressed chip on load and marks which edges hide a chip — the canvas's scrolled rail, s4-3-home-chips; a
 * rail that opened with its pressed chip off-screen would read as a tap that did nothing). Each part keeps its kit
 * module's own code; only the home's first load is spared it.
 * ⭐ EACH PART IS NAMED (`displayName`) — React's tools read "JourneyHome.HowToCard" where they read "LoadableComponent".
 * The names are also the one string this module holds that a minifier keeps, so `qa:first-load` and `qa:chunks-prod`
 * find this module's chunk by the first of them (their marker table: unique in src/, and in no first load but `/`'s).
 * `test:journey-home` §5 holds this module: its shape, its parts' table, the card's module loaded from here alone, and
 * `journey-home.tsx` its one importer (WP7).
 */
import dynamic from "next/dynamic";
import { nothingIfLost } from "@/components/layout/lost-chunk";

// The How-to card, first in the home's column, and the static How to Play sheet it opens (WP6).
export const LazyHowToCard = dynamic(() => import("@/components/journey/home/howto-card").then((m) => m.HowToCard).catch(nothingIfLost));
// The home's refresh every 30 seconds (§3.2; the SSE odds patch is S8's, A7): the kit's poller, which draws nothing.
export const LazyRefreshPoller = dynamic(() => import("@/components/ui/refresh-poller").then((m) => m.RefreshPoller).catch(nothingIfLost));
// The kit's empty state, for the home's three (a category with none, an empty book, a search that matched none).
export const LazyEmptyState = dynamic(() => import("@/components/ui/empty-state").then((m) => m.EmptyState).catch(nothingIfLost));
// The chips rail's pressed chip framed on load, and its edge fades (the house's scrolling strip): draws nothing.
export const LazyStripAutoScroll = dynamic(() => import("@/components/ui/strip-autoscroll").then((m) => m.StripAutoScroll).catch(nothingIfLost));

LazyHowToCard.displayName = "JourneyHome.HowToCard";
LazyRefreshPoller.displayName = "JourneyHome.RefreshPoller";
LazyEmptyState.displayName = "JourneyHome.EmptyState";
LazyStripAutoScroll.displayName = "JourneyHome.StripAutoScroll";
