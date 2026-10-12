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
 * ⭐ A PART WHOSE CODE NEVER ARRIVES IS LEFT OUT, NOT FATAL — the app's one lost-chunk guard (`layout/lost-chunk.ts`):
 * a `ChunkLoadError` renders nothing (the move shows no ghost, then the page), reported once per page to
 * `/api/client-error`; any other error is thrown on.
 * ⚠️ IMPORTED SINCE THE VODACOM PLAN S7 (S7-PLAN WP6, amendments A13(a) and A24 item 5, 2026-10-12). This file carried the
 * shell's guard repeated character for character, because `shell-lazy.tsx` was AppShell's alone and stated it in itself
 * (`test:visual-pass-r5d` §2 held the two copies equal). WP6 lifted the guard into one module that every `next/dynamic`
 * loader imports, so this copy is gone and r5d §2 holds this file to the import instead: its static imports are exactly
 * `next/dynamic` and the guard, and it defines no guard of its own.
 */
import dynamic from "next/dynamic";
import { nothingIfLost } from "@/components/layout/lost-chunk";

// The journey's loading state, page by page (`route-ghost.tsx`), for a journey request only: `app/loading.tsx` renders
// it from its journey arm, handing it the rails that pay out (read on the server).
export const LazyJourneyRouteGhost = dynamic(() => import("@/components/journey/route-ghost").then((m) => m.JourneyRouteGhost).catch(nothingIfLost));
