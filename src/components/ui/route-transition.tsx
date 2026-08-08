"use client";

import { usePathname } from "next/navigation";
import { useRef, useEffect, useState } from "react";

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
 * Respects prefers-reduced-motion (View Transitions API handles this natively;
 * the CSS fallback is governed by the global reduced-motion clamp in globals.css).
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

  useEffect(() => {
    if (pathname !== key) {
      const doc = document as Document & {
        startViewTransition?: (cb: () => void) => { finished: Promise<void> };
      };

      if (doc.startViewTransition) {
        // Use the View Transitions API — the browser handles the cross-fade
        doc.startViewTransition(() => {
          setKey(pathname);
        });
      } else {
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
