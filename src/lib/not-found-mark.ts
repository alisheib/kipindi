/**
 * IS A NOT-FOUND PAGE ON SCREEN? — the browser's answer, for the overlays and the journey's chrome, which stand outside
 * the page and are handed no prop by it (2026-10-09, the Vodacom visual pass round 4, R4-J; the integrator's not-found
 * item and R4-K's ruling).
 *
 * The shared not-found view (`components/ui/not-found-view.tsx`) renders `NotFoundMark`
 * (`components/ui/not-found-mark.tsx`): an empty, hidden span with the id below, carrying the path it was drawn for, and
 * an event raised when it mounts and when it goes. `useNotFoundShown` reads it.
 *
 * ⭐ WHY THE OVERLAYS ASK. `surfaces.ts` lists `/markets/<id>` as a page the journey re-draws — a question, whose bet panel
 * the Needle, the channels panel and the chat bubble stand down for — and the path of a market that does not exist is the
 * same path. So on that not-found page a journey reader lost the bubble and the Needle to a bet panel that is not there,
 * and the journey's Maswali tab was lit for a question that is not there. A not-found page is no journey page and no
 * tab's page, whatever its path says: each stand-down term is joined by `&& !notFoundShown`, and the chrome lights no
 * tab while the mark is up.
 * ⭐ AND THE POLLS STOP. The bell and the Akaunti tab's dot ask their question through a Server Action, and a Server
 * Action POSTs to the page's own address: on a not-found address Next answers 404, and every signed-in player on a
 * not-found page logged "Failed to load resource: 404" for each beat. While the mark is up neither counter is mounted.
 *
 * ⭐ THE ANSWER IS FOR THE PATH ON SCREEN, IN EVERY FRAME (2026-10-09, the visual pass round 5, review F4). It was the
 * span's presence alone, and leaving a not-found page the router renders the next page in a transition while the old
 * span is still in the document: the chrome rendered the NEW path with "not found" — no tab lit, the overlays standing
 * where a not-found page stands them — and that frame was painted, because the mark's going was announced by an effect
 * cleanup, which a transition's commit runs after the paint. So the span now carries the path it was drawn for
 * (`data-path`), the snapshot is that path, and the answer is "the mark's path IS the path being drawn"
 * (`isNotFoundFor`): the old page's span answers "no" for the new path in the very render that draws it. And arriving,
 * the mark announces itself in a LAYOUT effect, so the chrome's answer turns before that commit's first paint (React
 * flushes the update a layout effect schedules before it yields to the browser); its going is still announced after
 * React has taken the span out (a passive cleanup), which only brings the store up to date — the answer was already
 * "no" for every path but its own.
 * ⚠️ IT ASSUMES A PAGE THAT IS LEFT LEAVES THE DOCUMENT, in the commit that draws the next one — and so does the CSS rule
 * below. Next 16 keeps left pages mounted in a hidden `<Activity>` only with `cacheComponents` on, which this app does not
 * turn on; with it, the old span would stay, `getElementById` could find it, and the CSS would rest the next page's tab.
 * `test:visual-pass-r5d` §5 pins the config and the framework's two lines.
 *
 * ⭐ THE SERVER SNAPSHOT IS "NO MARK", like `useJourneyOn`'s: a server render, and the hydration that matches it, are what
 * they were. React checks the store right after hydrating, and the mark is then in the document.
 * ⚠️ BEFORE THE SCRIPTS RUN, ONLY CSS CAN ANSWER, and it can only answer where the server's HTML says "not found". The
 * root not-found (an address no route matches) is drawn by the server with the mark in it: `:root:has(#kp-not-found)`
 * (globals.css) rests the lit tab from the first paint. A record that is not there — a question, a round, a proposal —
 * is found missing INSIDE a loading boundary: React 19.2's server renderer runs no class error boundary, so that HTML is
 * the page's loading ghost, with no mark, and React's own record of the verdict: the boundary's `<template
 * data-dgst="NEXT_HTTP_ERROR_FALLBACK;404">` (written by the server, or by React's inline `$RX` script when the verdict
 * streams in later). The same rule reads that template (round 5, review F5), so the tab rests from the moment the
 * verdict is in the document, while the ghost stands until the scripts draw the not-found page.
 * ⛔ NO "use client" HERE, AND ONLY CLIENT CODE MAY LOAD IT — `journey-on.ts`'s rule, for its reason: a hook in a server
 * component builds and then fails on its first render. `test:visual-pass-r4j` §5 holds its loaders.
 */
import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

/** The id of the empty, hidden span the not-found view writes into the page. */
export const NOT_FOUND_MARK = "kp-not-found";
/** The span's attribute: the path the not-found page was drawn for. */
export const NOT_FOUND_PATH_ATTR = "data-path";
/** Raised when the mark mounts and when it goes. */
export const NOT_FOUND_EVENT = "50pick:not-found";

export function subscribeNotFound(onChange: () => void): () => void {
  window.addEventListener(NOT_FOUND_EVENT, onChange);
  return () => window.removeEventListener(NOT_FOUND_EVENT, onChange);
}

/** The path the page on screen is a not-found for, or null when no mark is up (client only). */
export function notFoundSnapshot(): string | null {
  return document.getElementById(NOT_FOUND_MARK)?.getAttribute(NOT_FOUND_PATH_ATTR) ?? null;
}

/** ⛔ Always "no mark": the server render, and the hydration that matches it, are today's page. */
export function notFoundServerSnapshot(): string | null {
  return null;
}

/** Announce that the mark came or went: `NotFoundMark`'s effects, on mount and on cleanup. */
export function announceNotFound(): void {
  window.dispatchEvent(new Event(NOT_FOUND_EVENT));
}

/** The one decision: a not-found page is on screen for `path` when the mark that is up was drawn for `path`. */
export function isNotFoundFor(markPath: string | null, path: string): boolean {
  return markPath !== null && markPath === path;
}

/** True while a not-found page is on screen — for the path being drawn, never for the page before it. */
export function useNotFoundShown(): boolean {
  const path = usePathname() ?? "";
  const markPath = useSyncExternalStore(subscribeNotFound, notFoundSnapshot, notFoundServerSnapshot);
  return isNotFoundFor(markPath, path);
}
