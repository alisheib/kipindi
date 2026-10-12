"use client";

/**
 * THE JOURNEY HOME'S DEFERRED PARTS — the client parts of the home on `/`, each loaded only when the home renders it (the
 * Vodacom plan S7, `S7-PLAN.md` WP6 step 2 and amendment A13(a); the shell's pattern, `layout/shell-lazy.tsx`,
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
 * ⭐ ONE LINE PER PART: the How-to card (with the static sheet it opens) and the kit's RefreshPoller (the home's 30-second
 * refresh, §3.2). A `LazyEmptyState` joins them only if WP7 draws its empty states with the kit's EmptyState (WP6 step 2):
 * that is WP7's call, so it is not declared before it has a reader.
 * `test:journey-home` §5 holds this module: its shape, its parts' table, the card's module loaded from here alone, and
 * `journey-home.tsx` its one importer (WP7; nothing imports it before then).
 */
import dynamic from "next/dynamic";
import { nothingIfLost } from "@/components/layout/lost-chunk";

// The How-to card, first in the home's column, and the static How to Play sheet it opens (WP6).
export const LazyHowToCard = dynamic(() => import("@/components/journey/home/howto-card").then((m) => m.HowToCard).catch(nothingIfLost));
// The home's refresh every 30 seconds (§3.2; the SSE odds patch is S8's, A7): the kit's poller, which draws nothing.
export const LazyRefreshPoller = dynamic(() => import("@/components/ui/refresh-poller").then((m) => m.RefreshPoller).catch(nothingIfLost));
