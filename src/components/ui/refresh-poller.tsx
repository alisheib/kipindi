"use client";

/**
 * RefreshPoller — invisible client component that calls router.refresh()
 * on a fixed interval and/or in response to a custom DOM event.
 *
 * Used to make server-rendered pages feel "live" without WebSockets.
 * The refresh re-runs the server component tree with fresh data, and
 * React diffs the output so only changed elements re-paint — no flash,
 * no scroll reset, no layout shift.
 *
 * Event-driven refresh: any component can dispatch `50pick:refresh` on
 * `window` to trigger an immediate refresh (e.g. after placing a bet).
 */

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function RefreshPoller({
  intervalMs = 30_000,
  eventName = "50pick:refresh",
}: {
  /** How often to poll (ms). Default 30s. */
  intervalMs?: number;
  /** Custom DOM event name that triggers an immediate refresh. */
  eventName?: string;
}) {
  const router = useRouter();
  const lastRefresh = useRef(Date.now());

  useEffect(() => {
    // Interval-driven refresh — skip if the tab is hidden (saves
    // bandwidth on backgrounded tabs).
    const id = setInterval(() => {
      if (document.visibilityState === "hidden") return;
      // Don't double-refresh if an event-driven refresh just fired
      if (Date.now() - lastRefresh.current < 5_000) return;
      lastRefresh.current = Date.now();
      router.refresh();
    }, intervalMs);

    // Event-driven refresh — immediate, deduped against the interval
    const onEvent = () => {
      lastRefresh.current = Date.now();
      router.refresh();
    };
    window.addEventListener(eventName, onEvent);

    return () => {
      clearInterval(id);
      window.removeEventListener(eventName, onEvent);
    };
  }, [router, intervalMs, eventName]);

  return null;
}
