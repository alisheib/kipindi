/**
 * IS A NOT-FOUND PAGE ON SCREEN? — the browser's answer, for the overlays and the journey's chrome, which stand outside
 * the page and are handed no prop by it (2026-10-09, the Vodacom visual pass round 4, R4-J; the integrator's not-found
 * item and R4-K's ruling).
 *
 * The shared not-found view (`components/ui/not-found-view.tsx`) renders `NotFoundMark`
 * (`components/ui/not-found-mark.tsx`): an empty, hidden span with the id below, written into the server's HTML of a
 * not-found answer, and an event raised when it mounts and when it goes. `useNotFoundShown` reads it.
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
 * ⭐ THE SERVER SNAPSHOT IS FALSE, like `useJourneyOn`'s: a server render, and the hydration that matches it, are what
 * they were. The mark is in the HTML before any script runs, so the check `useSyncExternalStore` makes right after
 * hydrating finds it; on a move inside the app the mark's own effect announces it.
 * ⛔ NO "use client" HERE, AND ONLY CLIENT CODE MAY LOAD IT — `journey-on.ts`'s rule, for its reason: a hook in a server
 * component builds and then fails on its first render. `test:visual-pass-r4j` §5 holds its loaders.
 */
import { useSyncExternalStore } from "react";

/** The id of the empty, hidden span the not-found view writes into the page. */
export const NOT_FOUND_MARK = "kp-not-found";
/** Raised when the mark mounts and when it goes. */
export const NOT_FOUND_EVENT = "50pick:not-found";

export function subscribeNotFound(onChange: () => void): () => void {
  window.addEventListener(NOT_FOUND_EVENT, onChange);
  return () => window.removeEventListener(NOT_FOUND_EVENT, onChange);
}

/** Whether the page on screen carries the mark (client only). */
export function notFoundSnapshot(): boolean {
  return document.getElementById(NOT_FOUND_MARK) !== null;
}

/** ⛔ Always false: the server render, and the hydration that matches it, are today's page. */
export function notFoundServerSnapshot(): boolean {
  return false;
}

/** Announce that the mark came or went: `NotFoundMark`'s effect, on mount and on cleanup. */
export function announceNotFound(): void {
  window.dispatchEvent(new Event(NOT_FOUND_EVENT));
}

/** True while a not-found page is on screen. */
export function useNotFoundShown(): boolean {
  return useSyncExternalStore(subscribeNotFound, notFoundSnapshot, notFoundServerSnapshot);
}
