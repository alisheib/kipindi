/**
 * ONE UNREAD POLLER PER WIDTH — which of the journey's two unread counters may run (the Vodacom plan S6; S6-PLAN WP6a,
 * from the WP3 review's cost note, `docs/VODACOM-PLAN.md` §0h point 16).
 *
 * The journey header keeps the classic bell (`NotificationsPanel`), which polls on its own every 30 s, and the Akaunti
 * tab's dot polls on the same cadence (`useUnreadCount`, mode "poll"). The bell shows from lg and the tab rail below
 * it, so mounting both at every width would double a journey viewer's requests for a number only one of them can
 * show. `pollersAt` decides which one MAY mount, from the width the browser reports; the bar and the rail ask it.
 *
 * ⭐ HIDDEN IS NOT ENOUGH. A hidden bell is still mounted, and a mounted bell still asks the server every 30 s. The
 * counter that does not show is not rendered at all.
 *
 * ⭐ UNKNOWN MEANS NEITHER. The server cannot know the width, so the server snapshot is null, and the hydration that
 * matches it mounts no counter; the right one mounts the moment the browser answers. A counter mounted at the wrong
 * width for one frame would already have sent its first request.
 *
 * ⛔ NO "use client" HERE, AND ONLY CLIENT CODE MAY LOAD IT — `journey-on.ts`'s rule, for its reason: a hook in a
 * server component builds and then fails on its first render. `test:journey-shell` §8 holds the table, the hook and
 * its loaders, and `red:journey-shell` plants two pollers on a desktop, a server that claims a desktop, a bell mounted
 * at every width, a dot that polls on a desktop, a store that never lets go, and a server file that loads this one.
 */
import { useSyncExternalStore } from "react";

/** Tailwind's `lg` (`tailwind.config.ts` screens): where the rail hides and the header's bell shows. */
export const LG_UP_QUERY = "(min-width: 1024px)";

/** Which unread counter may be mounted. */
export type Pollers = { bell: boolean; dot: boolean };

/** The bell from lg, the dot below it, and neither while the width is unknown. Never both. */
export function pollersAt(lgUp: boolean | null): Pollers {
  return { bell: lgUp === true, dot: lgUp === false };
}

export function subscribeLgUp(onChange: () => void): () => void {
  const media = window.matchMedia(LG_UP_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** Whether the viewport is at least lg right now (client only). */
export function lgUpSnapshot(): boolean {
  return window.matchMedia(LG_UP_QUERY).matches;
}

/** ⛔ Always null: the server does not know the width, so a server render, and the hydration that matches it, mount no counter. */
export function lgUpServerSnapshot(): boolean | null {
  return null;
}

/** Whether the viewport is at least lg, or null until the browser has said. */
export function useLgUp(): boolean | null {
  return useSyncExternalStore<boolean | null>(subscribeLgUp, lgUpSnapshot, lgUpServerSnapshot);
}
