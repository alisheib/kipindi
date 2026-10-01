/**
 * IS THIS PAGE BEING SHOWN THE NEW JOURNEY? — the browser's answer, for what the shell cannot hand a prop to (the
 * Vodacom plan S6; S6-PLAN WP2 step 5, read from WP7 on).
 *
 * The decision is the SERVER's: AppShell asks the one per-request resolver (`resolveSimpleJourney`) and, from WP7, mounts
 * `<JourneyFlag />` only when it says yes. The flag stamps `data-journey` on the html element and raises
 * `50pick:journey-flag`; `useJourneyOn` reads the attribute. The Needle, the channels panel and the chat bubble are
 * mounted where no journey prop reaches them — an attribute on the document element does, and the shell is its one writer.
 *
 * ⭐ THE SERVER SNAPSHOT IS FALSE, AND SO IS "NO ATTRIBUTE". For every reader the server did not put in the journey, each
 * stand-down term this feeds (`journeyOn && isJourneySurface(pathname)`) is false, so the expression it joins is exactly
 * today's — and a server render never stands anything down.
 *
 * ⛔ NO "use client" HERE, AND ONLY CLIENT CODE MAY LOAD IT. It holds a hook: a server component that imported it would
 * build and then fail on its first render — "a build is not a render", the lesson that once took every page down.
 * `test:journey-shell` §5 holds every file loading it to a client boundary: a "use client" file, or a hook module with
 * no directive (like this one) that only client code loads. `red:journey-shell` plants a server importer, directly and
 * two hops away.
 *
 * ⚠️ The flag is decided in the ROOT layout, which a soft navigation does not re-run, so it stays as it is until the
 * next document load or `router.refresh()` — the same staleness the shell itself accepts (`journey-preview.ts`).
 */
import { useSyncExternalStore } from "react";

/** Raised whenever the flag goes up or down. */
export const JOURNEY_FLAG_EVENT = "50pick:journey-flag";
/** Stamped on the html element while the flag is up. */
export const JOURNEY_FLAG_ATTR = "data-journey";

export function subscribeJourneyFlag(onChange: () => void): () => void {
  window.addEventListener(JOURNEY_FLAG_EVENT, onChange);
  return () => window.removeEventListener(JOURNEY_FLAG_EVENT, onChange);
}

/** What the html element carries right now (client only). */
export function journeyFlagSnapshot(): boolean {
  return document.documentElement.hasAttribute(JOURNEY_FLAG_ATTR);
}

/** ⛔ Always false: the server render, and the hydration that matches it, are today's page. */
export function journeyFlagServerSnapshot(): boolean {
  return false;
}

/** Raise the flag and announce it; the returned cleanup lowers it and announces that. `JourneyFlag`'s effect. */
export function raiseJourneyFlag(): () => void {
  document.documentElement.setAttribute(JOURNEY_FLAG_ATTR, "");
  window.dispatchEvent(new Event(JOURNEY_FLAG_EVENT));
  return () => {
    document.documentElement.removeAttribute(JOURNEY_FLAG_ATTR);
    window.dispatchEvent(new Event(JOURNEY_FLAG_EVENT));
  };
}

/** True while the shell has put this page in the new journey. */
export function useJourneyOn(): boolean {
  return useSyncExternalStore(subscribeJourneyFlag, journeyFlagSnapshot, journeyFlagServerSnapshot);
}
