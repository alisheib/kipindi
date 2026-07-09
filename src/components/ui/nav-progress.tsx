"use client";

/**
 * NavProgress — a thin brand progress bar at the top of the viewport that
 * appears during client-side route transitions. Gives instant feedback that
 * the app registered the tap/click, even before the server responds.
 *
 * How it works:
 *   1. Intercepts every <Link> and router.push navigation via Next.js's
 *      `usePathname` + `useSearchParams` — when they change, the bar hides.
 *   2. Listens for click events on <a> elements that point to internal routes
 *      and starts the bar immediately on mousedown/touchstart.
 *   3. The bar animates from 0% → ~85% with an ease-out curve (fast start,
 *      slow crawl), then snaps to 100% + fades when the route lands.
 *
 * Kit-faithful: uses brand→aqua gradient, 3px height, z-[2000] (above
 * everything except the toast layer at 1800). No layout impact.
 *
 * Safety: auto-completes after 8s so the bar never gets stuck permanently
 * (e.g. same-page link click, cancelled navigation, network timeout).
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { motionReduced } from "@/lib/haptics";

export function NavProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const [completing, setCompleting] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const routeRef = useRef(pathname + "?" + searchParams?.toString());

  // Force-complete the bar (used by both route-landed and auto-timeout).
  const completeBar = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    if (barRef.current) barRef.current.style.transform = "scaleX(1)";
    setCompleting(true);
    setTimeout(() => { setActive(false); setCompleting(false); }, 300);
  }, []);

  // When pathname or search params change, the route has landed — complete the bar.
  useEffect(() => {
    const next = pathname + "?" + searchParams?.toString();
    if (next !== routeRef.current) {
      routeRef.current = next;
      if (active) completeBar();
    }
  }, [pathname, searchParams, active, completeBar]);

  // Animate the bar from 0 → ~85% with diminishing speed
  const startBar = useCallback(() => {
    if (active) return;
    setActive(true);
    setCompleting(false);
    startRef.current = performance.now();
    if (barRef.current) barRef.current.style.transform = "scaleX(0)";
    // Reduced-motion: skip the rAF crawl (this bar drives inline transforms, so
    // the CSS prefers-reduced-motion clamp can't reach it) — show a static
    // "in progress" bar instead. Still instant feedback, no animation.
    if (motionReduced()) {
      if (barRef.current) barRef.current.style.transform = "scaleX(0.85)";
    } else {
      const tick = () => {
        const elapsed = performance.now() - startRef.current;
        // Fast start, slow crawl — never reaches 100% (waits for route to land)
        const pct = Math.min(0.85, 1 - Math.exp(-elapsed / 3000));
        if (barRef.current) barRef.current.style.transform = `scaleX(${pct})`;
        if (pct < 0.85) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }
    // Safety: auto-complete after 8s so the bar never gets stuck permanently
    // (e.g. same-page link click, cancelled navigation, network timeout).
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(completeBar, 8000);
  }, [active, completeBar]);

  // Listen for clicks on internal links
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a[href]");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("//") || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("sms:")) return;
      // Internal navigation — start the bar
      startBar();
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [startBar]);

  // Also intercept programmatic navigation via a custom event
  useEffect(() => {
    const onNav = () => startBar();
    window.addEventListener("50pick:navigating", onNav);
    return () => window.removeEventListener("50pick:navigating", onNav);
  }, [startBar]);

  // Cleanup RAF + timeout on unmount
  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  if (!active) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-[2000] h-[3px] pointer-events-none"
      style={{ opacity: completing ? 0 : 1, transition: completing ? "opacity 300ms ease-out" : "none" }}
    >
      <div
        ref={barRef}
        className="h-full origin-left"
        style={{
          background: "linear-gradient(90deg, var(--brand-500), var(--aqua-400))",
          boxShadow: "0 0 8px oklch(72% 0.14 78 / 0.5)",
          transform: "scaleX(0)",
          willChange: "transform",
        }}
      />
    </div>
  );
}
