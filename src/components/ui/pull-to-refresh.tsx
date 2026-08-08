"use client";

/**
 * PullToRefresh — mobile pull-down gesture that triggers router.refresh().
 *
 * Renders an invisible touch area at the top of the viewport. When the
 * user pulls down (scrollY === 0 and the gesture exceeds the threshold),
 * a small spinner appears and the page data is refetched via
 * router.refresh(), run inside a transition — the spinner stays up until the
 * refreshed data has actually landed (B-16), not for a fixed timer.
 *
 * Only active on touch devices — pointer:coarse media query. No-ops on
 * desktop entirely (the component renders null via CSS, not JS, so
 * the hook doesn't fire on desktop at all).
 */

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";

const THRESHOLD = 80; // px of pull before triggering (raised from 60 to prevent accidental triggers)

export function PullToRefresh() {
  const router = useRouter();
  const [pulling, setPulling] = useState(false);
  const [refreshing, start] = useTransition();
  const [pullY, setPullY] = useState(0);
  const startY = useRef(0);
  const active = useRef(false);

  const onTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY > 5 || refreshing) return;
    startY.current = e.touches[0].clientY;
    active.current = true;
  }, [refreshing]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!active.current) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy < 0) { active.current = false; setPulling(false); setPullY(0); return; }
    setPulling(true);
    setPullY(Math.min(dy * 0.4, THRESHOLD * 1.5)); // dampened
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!active.current) { setPulling(false); setPullY(0); return; }
    active.current = false;
    if (pullY >= THRESHOLD * 0.6) {
      // B-16 — ONE refresh, and the spinner tells the truth: router.refresh()
      // runs inside a transition whose falling edge releases the spinner when
      // the data has actually landed. The old version ALSO dispatched
      // "50pick:refresh" (a second fetch wherever a poller was mounted) and
      // hid the spinner on a fixed 600ms timer regardless of the network.
      start(() => router.refresh());
      setPulling(false);
      setPullY(0);
    } else {
      setPulling(false);
      setPullY(0);
    }
  }, [pullY, router, start]);

  useEffect(() => {
    // Only attach on touch devices
    if (!("ontouchstart" in window)) return;
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [onTouchStart, onTouchMove, onTouchEnd]);

  if (!pulling && !refreshing) return null;

  return (
    <div
      className="fixed left-1/2 z-[60] -translate-x-1/2 pointer-events-none"
      style={{
        top: Math.max(8, pullY - 20),
        opacity: refreshing ? 1 : Math.min(1, pullY / THRESHOLD),
        transition: refreshing ? "none" : "opacity var(--t-flick)",
      }}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-bg-elevated shadow-lg">
        <Spinner size={16} />
      </div>
    </div>
  );
}
