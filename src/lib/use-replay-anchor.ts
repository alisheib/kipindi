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
 * ⛔ HYDRATE BEFORE ADVANCING. A cached page's server markup still contains its original clock text.
 * Applying elapsed time during the client's first render changes that text and React discards the
 * hydrated tree (#418). The first render always uses the server instant; a layout effect records first
 * sight or advances a replay before paint. The match calls this once in `UpdownMatchState` and hands
 * the one anchor to its digits and playhead.
 *
 * On the server (and so in the markup) it is `serverNowMs` exactly.
 */
import { useLayoutEffect, useState } from "react";

/** Per page session: server instant → `performance.now()` when it was first seen. Client-only. */
const FIRST_SEEN = new Map<number, number>();

export function useReplayAnchor(serverNowMs: number): number {
  // React may render a hydrated component more than once before committing. A module Map read in render
  // makes that render impure; a cached visit is worse, because its first client text differs from SSR.
  const [anchor, setAnchor] = useState(serverNowMs);
  useLayoutEffect(() => {
    const first = FIRST_SEEN.get(serverNowMs);
    if (first == null) {
      FIRST_SEEN.set(serverNowMs, performance.now());
      // A mounted caller can receive a new server stamp without remounting.
      // Its state still holds the previous anchor until this layout effect.
      setAnchor(serverNowMs);
    } else {
      setAnchor(serverNowMs + Math.max(0, performance.now() - first));
    }
  }, [serverNowMs]);
  return anchor;
}
