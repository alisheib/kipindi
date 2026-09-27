"use client";

/**
 * THE MATCH TRACK'S PLAYHEAD — the "now" line and the played stretch behind it (landing v3, R5 · spec
 * updown-band-v2 §4.2). A member of the chart home; its track is `updown-match-track.tsx`.
 *
 * ⭐ ONE OF THE TWO PER-SECOND LEAVES ON THE LANDING PAGE (amended WP15), with the band's digits. It
 * rides the page's ONE shared second (`useServerNowGated` → `subscribeSecond`), so the playhead and the
 * digits move in the same frame, and it RE-RENDERS ONLY when the quarter-percent position moves — about
 * once every three seconds on a 10-minute round. No transition: time is drawn where it is, not animated
 * toward it (L12).
 *
 * `anchorMs` is the band's ONE replay-safe server instant (`useReplayAnchor`, taken once in
 * `UpdownMatchState`), so the playhead agrees with the digits to the millisecond, and before hydration
 * it is exactly the server's position — the markup matches. Past the deciding close it parks at the flag.
 */
import type { CSSProperties } from "react";
import { useServerNowGated } from "@/lib/use-shared-second";
import { matchX } from "./updown-match-geometry";

export function UpdownMatchNow({ opensAtMs, closesAtMs, anchorMs }: {
  opensAtMs: number;
  closesAtMs: number;
  anchorMs: number;
}) {
  const now = useServerNowGated(anchorMs, (n) => String(Math.round(matchX(n, opensAtMs, closesAtMs) * 4)));
  const x = matchX(now ?? anchorMs, opensAtMs, closesAtMs);
  // A custom property, not a geometry literal: the CSS owns every length (design-frozen skips `--*`).
  const style = { "--x": `${x}%` } as CSSProperties;
  return (
    <>
      <span className="kp-udtrack__elapsed" style={style} />
      <span className="kp-udtrack__now" style={style} />
    </>
  );
}
