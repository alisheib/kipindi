"use client";

/**
 * THE JOURNEY'S ROUTE GHOSTS, AS A CHUNK OF THEIR OWN (2026-10-09, the Vodacom visual pass round 5, review G1) — the
 * one binding the root loading file (`app/loading.tsx`) renders for a journey reader. `route-ghost.tsx` has the ghosts
 * and the measurements.
 *
 * ⭐ WHY THIS FILE. Drawn by a server component, the ghosts were DATA: every node of every page's ghost written into the
 * root loading element, which Next sends with every payload rendered from the root — each journey document and each
 * refresh. Drawn by a client component loaded here, that element's data is one reference and the rail names; the
 * ghosts are CODE, fetched once and kept by the browser. This is the shell's own pattern (`components/layout/
 * shell-lazy.tsx`, VODACOM-PLAN §0h point 20): `next/dynamic` in a client module, which a production build showed
 * splits each part into a chunk of its own, fetched when a render uses it — a classic visitor's never does. A server
 * module cannot defer one itself (`test:journey-shell` 12.nodefer.platform: from a server file it joins the first load).
 * ⚠️ That the ghosts leave the first load is shown only by a production build (the lock turn's, VODACOM-PLAN §0i).
 * ⛔ THE SERVER RENDER STAYS ON, AND NO OPTION OBJECT: with neither `ssr: false` nor `loading`, `next/dynamic` adds no
 * Suspense boundary of its own (a boundary here would be outlined behind the shell — R4-J's E36), the server draws the
 * ghost the document opens on into its first HTML as before, and names this chunk in the page's head.
 * ⭐ A PART WHOSE CODE NEVER ARRIVES IS LEFT OUT, NOT FATAL — the shell's guard, character for character
 * (`test:visual-pass-r5d` §2 holds the two equal): a `ChunkLoadError` renders nothing (the move shows no ghost, then the
 * page), reported once per page to `/api/client-error`; any other error is thrown on. The guard is repeated, not
 * imported: `shell-lazy.tsx` is AppShell's alone and states it in itself (`test:journey-shell` 12.module.home,
 * 12.module.dynamic, 12.module.lost).
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

// The journey's loading state, page by page (`route-ghost.tsx`), for a journey request only: `app/loading.tsx` renders
// it from its journey arm, handing it the rails that pay out (read on the server).
export const LazyJourneyRouteGhost = dynamic(() => import("@/components/journey/route-ghost").then((m) => m.JourneyRouteGhost).catch(nothingIfLost));
