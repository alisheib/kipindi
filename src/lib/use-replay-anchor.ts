"use client";

/**
 * ⭐ THE SERVER'S INSTANT, ADVANCED BY THE REAL TIME ELAPSED WHEN A CACHED PAGE IS REPLAYED.
 *
 * Moved here verbatim from the landing band's old countdown ring (`charts/updown-ring.tsx`, deleted
 * 2026-09-27 with R5) so the Up & Down match can share it.
 *
 * WHY IT EXISTS. On Back the App Router restores "/" from its cache and hands a client leaf the SAME
 * `serverNowMs` it rendered with, so a countdown anchored to it would absorb the whole time spent away
 * and count a shut round as open. So the page session remembers the moment it first saw each server
 * instant (`performance.now()`), and on a replay adds the real time elapsed since.
 * ⛔ NOT the device clock: a phone set fast would then close a round that is still taking bets — E-72
 * moved this platform's countdowns OFF the device clock for exactly that reason. `performance.now()` is
 * monotonic, so no wall-clock setting can move it.
 *
 * ⛔ CALL IT ONCE PER RENDERED INSTANT. The first call for an instant records it and returns it
 * unchanged; every later call reads it as a replay and adds the elapsed time. Two leaves each calling it
 * during the SAME hydration would therefore disagree by the hydration gap — the second one's markup no
 * longer matching the server's. The match calls it in its wrapper (`UpdownMatchState`) and hands the one
 * anchor to its digits and its playhead.
 *
 * On the server (and so in the markup) it is `serverNowMs` exactly.
 */
import { useMemo } from "react";

/** Per page session: server instant → `performance.now()` when it was first seen. Client-only. */
const FIRST_SEEN = new Map<number, number>();

export function useReplayAnchor(serverNowMs: number): number {
  return useMemo(() => {
    if (typeof window === "undefined" || typeof performance === "undefined") return serverNowMs;
    const first = FIRST_SEEN.get(serverNowMs);
    if (first == null) { FIRST_SEEN.set(serverNowMs, performance.now()); return serverNowMs; }
    return serverNowMs + Math.max(0, performance.now() - first);
  }, [serverNowMs]);
}
