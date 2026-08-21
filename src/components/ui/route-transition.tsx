"use client";

import { usePathname } from "next/navigation";
import { useRef, useEffect, useState } from "react";

/**
 * The two CLAMP gates, read live (§M6). A View Transition is started from JS, so
 * this is the only place gate 2 can be applied to one.
 *
 * ⚠️ `data-motion="reduced"` is deliberately absent: that tier is a THROTTLE
 * (ambient loops off, full durations), and a 180ms one-shot cross-fade is not an
 * ambient loop — the same reasoning `motionOff()` in
 * `components/markets/win-celebration.tsx` is written against.
 *
 * ⚠️ THREE COPIES OF THIS PREDICATE NOW EXIST — here, `win-celebration.tsx`, and
 * `prefersReducedMotion()` in `app/live/featured-contest.tsx` (which also folds
 * in the throttle, correctly, because it drives an auto-advancing carousel).
 * They want one home in `src/lib`; consolidating them touches files this change
 * does not own.
 */
function motionOff(): boolean {
  if (typeof window === "undefined") return true;
  const root = document.documentElement;
  return (
    (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false) ||
    root.classList.contains("kp-reduce-motion") ||
    root.getAttribute("data-motion") === "minimal"
  );
}

/**
 * Wraps page content with a route-enter animation keyed to pathname.
 *
 * When the View Transitions API is available (Chrome 111+, Edge 111+),
 * uses `document.startViewTransition()` for a native cross-fade that the
 * browser can hardware-accelerate. Falls back to the existing `.route-enter`
 * CSS animation (the kit's `m-settle-in` at `--t-move`) on Firefox / Safari /
 * older browsers.
 *
 * Mount-guarded: only fires once per pathname change, never on filter/search updates.
 *
 * ⛔ ONE ENTRANCE PER ARRIVAL (§M2 — "there is no third entrance"). The two
 * mechanisms are ALTERNATIVES, not layers: on Chrome/Edge the browser cross-fades
 * the document and `.route-enter` is NOT re-triggered; everywhere else the CSS
 * entrance is the whole animation. They used to run together — 180ms of
 * cross-fade with 340ms of `m-settle-in` (`--t-move`) stacked on top of it, on
 * the most-travelled path in the product, and only in the one engine that has
 * the API.
 *
 * ⚠️ REDUCED MOTION IS HANDLED HERE IN JS, AND IT HAS TO BE (§M6). The comment
 * this replaced claimed the View Transitions API "handles this natively" — it
 * does not. globals.css carries an explicit `@media (prefers-reduced-motion:
 * reduce)` branch for `::view-transition-old/new(root)`, which covers gate 1 and
 * NOTHING ELSE: a view-transition pseudo-element is not a descendant of `html`,
 * so the universal clamps in motion.css (`html.kp-reduce-motion *`,
 * `[data-motion="minimal"] *`) cannot reach it. Gate 2 — the player's own in-app
 * "Reduce motion" switch — therefore had no effect on route cross-fades at all,
 * on every navigation. JS is the only place that hole can be closed.
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
  // TRUE when the key change now committing was made inside a View Transition,
  // i.e. the browser is already cross-fading the whole document. Read (and
  // cleared) by the `[key]` effect below so the CSS entrance does not replay on
  // top of it. A ref, not state: it must not itself cause a render.
  const viaViewTransitionRef = useRef(false);
  useEffect(() => {
    const onPop = () => { traversalRef.current = true; };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (pathname !== key) {
      const doc = document as Document & {
        startViewTransition?: (cb: () => void) => { finished: Promise<void> };
      };

      if (doc.startViewTransition && !motionOff()) {
        // Use the View Transitions API — the browser handles the cross-fade, and
        // it is then the ONLY entrance this arrival gets.
        viaViewTransitionRef.current = true;
        doc.startViewTransition(() => {
          setKey(pathname);
        });
      } else {
        viaViewTransitionRef.current = false;
        setKey(pathname);
      }
    }
  }, [pathname, key]);

  useEffect(() => {
    // Scroll to top on PUSHED route changes only, so deep-linked pages don't
    // land mid-scroll — never on back/forward, where scroll-restore.tsx owns
    // the position (B-19).
    if (!traversalRef.current) window.scrollTo(0, 0);
    traversalRef.current = false;

    // ⛔ The CSS entrance is the FALLBACK, not a second layer (§M2). When the
    // browser ran a View Transition for this arrival it has already animated the
    // document; re-triggering `.route-enter` here stacked `m-settle-in`
    // (`--t-move`, 340ms) on the cross-fade's 180ms. Scroll-to-top above still
    // runs on BOTH paths — that is position, not motion.
    if (viaViewTransitionRef.current) { viaViewTransitionRef.current = false; return; }

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
