"use client";

/**
 * PullToRefresh — mobile pull-down gesture that triggers router.refresh().
 *
 * Renders an invisible touch area at the top of the viewport. When the
 * user pulls down (scrollY === 0 and the gesture exceeds the threshold),
 * a small spinner appears and the page data is refetched via
 * router.refresh(). Pauses 600ms after the refresh call so the spinner
 * is visible long enough to feel intentional, not accidental.
 *
 * Only active on touch devices — pointer:coarse media query. No-ops on
 * desktop entirely (the component renders null via CSS, not JS, so
 * the hook doesn't fire on desktop at all).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";

const THRESHOLD = 80; // px of pull before triggering (raised from 60 to prevent accidental triggers)
const SETTLE_MS = 600; // how long the spinner shows after refresh

export function PullToRefresh() {
  const router = useRouter();
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullY, setPullY] = useState(0);
  const startY = useRef(0);
  const active = useRef(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      setRefreshing(true);
      router.refresh();
      window.dispatchEvent(new Event("50pick:refresh"));
      settleTimer.current = setTimeout(() => {
        settleTimer.current = null;
        setRefreshing(false);
        setPulling(false);
        setPullY(0);
      }, SETTLE_MS);
    } else {
      setPulling(false);
      setPullY(0);
    }
  }, [pullY, router]);

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
      if (settleTimer.current) clearTimeout(settleTimer.current);
    };
  }, [onTouchStart, onTouchMove, onTouchEnd]);

  if (!pulling && !refreshing) return null;

  return (
    <div
      className="fixed left-1/2 z-[60] -translate-x-1/2 pointer-events-none"
      style={{
        top: Math.max(8, pullY - 20),
        opacity: refreshing ? 1 : Math.min(1, pullY / THRESHOLD),
        transition: refreshing ? "none" : "opacity 100ms",
      }}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-bg-elevated shadow-lg">
        <Spinner size={16} />
      </div>
    </div>
  );
}
