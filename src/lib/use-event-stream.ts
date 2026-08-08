"use client";

/**
 * useEventStream — client-side hook that connects to the SSE endpoint
 * (/api/events) and dispatches CustomEvents on `window` so any component
 * can listen without coupling to this module.
 *
 * Features:
 *  - Auto-reconnect with exponential backoff (1 s → 2 s → 4 s … max 30 s)
 *  - Pauses when the document is hidden (saves mobile battery / data)
 *  - Returns { connected } for UI indicators
 *
 * Window events dispatched (detail = the SSE payload's `data` field):
 *   50pick:sse:market-odds      — market odds movement
 *   50pick:sse:wallet-balance   — wallet balance change
 *   50pick:sse:notification     — new notification
 *   50pick:sse:market-resolve   — market resolved
 */
import { useState, useEffect, useRef, useCallback } from "react";

/** Map from SSE event type → window CustomEvent name. */
const EVENT_MAP: Record<string, string> = {
  "market:odds":      "50pick:sse:market-odds",
  "wallet:balance":   "50pick:sse:wallet-balance",
  "notification:new": "50pick:sse:notification",
  "market:resolve":   "50pick:sse:market-resolve",
};

const MAX_BACKOFF_MS = 30_000;

export function useEventStream(): { connected: boolean } {
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const backoffRef = useRef(1_000);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Arms on open; only if the stream survives 10s does the backoff reset (B-18). */
  const stableTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pausedRef = useRef(false);

  /** Tear down the current EventSource (if any). */
  const close = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setConnected(false);
  }, []);

  /** Open a new EventSource connection. */
  const connect = useCallback(() => {
    // Don't open if the tab is hidden — we'll reconnect on visibility.
    if (typeof document !== "undefined" && document.hidden) {
      pausedRef.current = true;
      return;
    }
    close();

    const es = new EventSource("/api/events");
    esRef.current = es;

    es.onopen = () => {
      setConnected(true);
      // ⛔ B-18: do NOT reset backoff here. A proxy that accepts-then-drops
      // (the mid-deploy 502-after-headers shape) fires onopen before every
      // failure, so resetting on open turns exponential backoff into an
      // indefinite tight 1s loop. The connection has to EARN the reset: stay
      // open ~10s or deliver a real event.
      if (stableTimer.current) clearTimeout(stableTimer.current);
      stableTimer.current = setTimeout(() => { backoffRef.current = 1_000; }, 10_000);
    };

    es.onmessage = (event) => {
      // A real event is proof of a healthy stream — the other half of B-18's
      // earn-the-reset rule.
      backoffRef.current = 1_000;
      try {
        const parsed = JSON.parse(event.data) as { type: string; data: unknown };
        const windowEvent = EVENT_MAP[parsed.type];
        if (windowEvent) {
          window.dispatchEvent(
            new CustomEvent(windowEvent, { detail: parsed.data }),
          );
        }
      } catch {
        // Malformed SSE payload — ignore.
      }
    };

    es.onerror = () => {
      setConnected(false);
      es.close();
      esRef.current = null;
      if (stableTimer.current) { clearTimeout(stableTimer.current); stableTimer.current = null; }

      // Exponential backoff reconnect, with ±30% jitter (B-18): after a Railway
      // deploy every client loses the stream on the SAME instant, and a
      // jitterless retry ladder sends the whole fleet back in lockstep at the
      // worst possible moment.
      const delay = backoffRef.current;
      backoffRef.current = Math.min(delay * 2, MAX_BACKOFF_MS);
      const jittered = Math.round(delay * (0.7 + Math.random() * 0.6));
      reconnectTimer.current = setTimeout(() => {
        reconnectTimer.current = null;
        if (!pausedRef.current) connect();
      }, jittered);
    };
  }, [close]);

  useEffect(() => {
    connect();

    // ── Visibility change: pause when hidden, resume when visible ────
    const onVisibility = () => {
      if (document.hidden) {
        pausedRef.current = true;
        close();
      } else {
        pausedRef.current = false;
        // Reconnect immediately on tab focus.
        if (!esRef.current) connect();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      close();
    };
  }, [connect, close]);

  return { connected };
}
