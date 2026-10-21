"use client";

import { usePathname } from "next/navigation";
import { useRef, useEffect, useLayoutEffect, useState } from "react";

/**
 * Wraps page content with a route-enter animation keyed to pathname: the kit's `m-settle-in` at `--t-move` on this
 * wrapper (`.route-enter`), restarted on each route change, never at mount, never on a filter or search update.
 *
 * ⛔ ONE ENTRANCE PER ARRIVAL (§M2 — "there is no third entrance"), AND IT MOVES THE PAGE, NOT THE CHROME. Every reader,
 * in every engine, gets this one entrance on this one wrapper; the header and the rail stand outside it and hold still
 * while a page changes under them.
 *
 * ⭐ NO READER'S ROUTE CHANGE IS A VIEW TRANSITION ANY MORE (MASWALI-BUILD S5-FIX-PLATFORM D10, 2026-10-21; the motion
 * critic's M7). Until then a classic reader in an engine with the API (Chrome, Edge) moved by
 * `document.startViewTransition()`, a cross-fade of the ROOT, and the journey had already left it for this wrapper's
 * entrance (2026-10-09, the Vodacom visual pass round 4, R4-J; E37 and E41) for the reasons the classic reader still had
 * to live with:
 *   · the root cross-fade took the header and the rail with the page: two snapshots `vt-fade-out`/`vt-fade-in` 4px
 *     apart, the chrome dimmed mid-move (R4-J measured the capsule's gold 243,203,122 → 184,152,100; the critic the
 *     classic rail's luminance 32 → 24.4 at +120 ms), and the rail's pip frozen half-lit on the tab being left;
 *   · both snapshots were of the NEW page (this effect runs after the router has committed the target), so the
 *     transition cross-faded the page with itself;
 *   · the scroll to the top ran in the transition's callback, after the old snapshot was taken and the new page drawn
 *     at the old scroll: leaving the foot of a long page showed the next page's footer for the length of the fade
 *     (`qa:route-entrance` 1.2, before: frames of /help drawn at y 435, the scroll /markets was left at);
 *   · reduced motion had to be re-read here in JS (a view-transition pseudo-element is not a descendant of `html`, so
 *     the universal clamps of motion.css could not reach it), and an aborted transition (a resize, a hidden tab, a newer
 *     move) rejected promises that had to be observed (MASWALI-BUILD S5's player drive, 2026-10-19).
 * Now the classic reader takes the journey's path: the key changes in the layout phase, so the scroll to the top and
 * the entrance's restart both land before the new route's first paint. With no transition started, the JS gate, the
 * promise observers and the `::view-transition-*` rules (globals.css) went with it: the entrance is a CSS animation on
 * an element inside `html`, so the OS preference and both in-app gates clamp it in motion.css (§M6), and there is no
 * promise left to reject. `qa:route-entrance` drives it in Chromium: no transition, every frame of the new address at
 * the top, the chrome still, the entrance run, reduced motion clamped both ways, Back keeping its place, no page error
 * on a resize mid-move.
 */
export function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [key, setKey] = useState(pathname);
  const ref = useRef<HTMLDivElement>(null);
  // B-19 — TRUE on a history traversal (back/forward), false on a pushed nav.
  // The unconditional scroll-to-top below used to fire on popstate too, racing
  // scroll-restore.tsx and yanking a back-navigating reader to the top of a
  // board they had scrolled. A pushed nav still gets the top (deep links must
  // not land mid-scroll); a traversal keeps the position the restorer restores.
  const traversalRef = useRef(false);
  useEffect(() => {
    const onPop = () => { traversalRef.current = true; };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // ⭐ BEFORE THE NEW ROUTE'S FIRST PAINT (round 5's follow-up, R5-H · G-3's sibling sweep; PROVEN in a browser 2026-10-09:
  // before, both journey tab taps painted the new route once at full opacity and dropped it to transparent ~10 ms later;
  // after, none — S\r5h\probe-route-blink.mjs, test:visual-pass-r5h 3.7). A passive effect
  // runs after a transition's paint, so the new route was painted once at full opacity (the wrapper's entrance long
  // finished) before the key changed and the `[key]` effect below made it transparent to fade it in — a blink on every
  // journey tab tap. In the layout phase the key changes, and the entrance restarts and the page goes to the top, before
  // that paint (for every reader since D10, above).
  useLayoutEffect(() => {
    if (pathname !== key) {
      setKey(pathname);
    }
  }, [pathname, key]);

  // ⭐ NOT AT MOUNT (R5-H; PROVEN 2026-10-09: before, a throttled cold load replayed the entrance at hydration — transparent
  // again at 3.2 s — and threw the reader from y 600 to the top, which S14's visual sweep also caught on /legal/privacy;
  // after, neither — test:visual-pass-r5h 3.8): the server's HTML played the entrance at its first paint; replaying it at hydration
  // made the page the reader was already reading go transparent and fade in again, and scrolled it to the top.
  const mountedRef = useRef(false);
  useLayoutEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    // Scroll to top on PUSHED route changes only, so deep-linked pages don't
    // land mid-scroll — never on back/forward, where scroll-restore.tsx owns
    // the position (B-19).
    if (!traversalRef.current) window.scrollTo(0, 0);
    traversalRef.current = false;

    const el = ref.current;
    if (!el) return;
    el.classList.remove("route-enter");
    // Force reflow so the animation re-triggers
    void el.offsetWidth;
    el.classList.add("route-enter");
  }, [key]);

  return (
    <div ref={ref} className="route-enter">
      {children}
    </div>
  );
}
