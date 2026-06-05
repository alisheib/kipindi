"use client";

import { usePathname } from "next/navigation";
import { useRef, useEffect, useState } from "react";

/**
 * Wraps page content with a gentle route-enter animation keyed to pathname.
 * Uses the existing `.route-enter` class from globals.css (reveal-up, dur-quick).
 * Mount-guarded: only fires once per pathname change, never on filter/search updates.
 */
export function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [key, setKey] = useState(pathname);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pathname !== key) {
      setKey(pathname);
    }
  }, [pathname, key]);

  useEffect(() => {
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
