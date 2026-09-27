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
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useServerNowGated } from "@/lib/use-shared-second";
import { matchX } from "./updown-match-geometry";

/** Within this many percent of the newest mark, the playhead is drawn only on the half of the plot away from it —
 *  a read lands at most ~2 minutes before "now", so the two routinely sat 0–5px apart and fused into one two-tone
 *  line (frame panel round 2, 2026-09-27). 2.5% is ~6px at 360 and more than that on wider plots. */
export const NOW_NEAR_PCT = 2.5;
/** …and never less than this many px on the real plot: 2.5% is only ~5.5px at 320, where a playhead drawn just past
 *  the window still fused with the opening dot or a stem (frame panel round 5). 12 = --sp-3. */
export const NOW_NEAR_PX = 12;

export function UpdownMatchNow({ opensAtMs, closesAtMs, anchorMs, markX = null, markKind = null, gatePct = null }: {
  opensAtMs: number;
  closesAtMs: number;
  anchorMs: number;
  /** The lock post's x (%): just past it the playhead parks ON the post rather than beside it (round 4). */
  gatePct?: number | null;
  /** The newest data mark's x (%) and kind — the newest stem (its side) or a tie tick — or null. */
  markX?: number | null;
  markKind?: "up" | "down" | "tie" | "kick" | null;
}) {
  const now = useServerNowGated(anchorMs, (n) => String(Math.round(matchX(n, opensAtMs, closesAtMs) * 4)));
  // The plot's width, read after mount (the server renders with the percentage window alone — no mismatch: the
  // attribute can only change in this effect's update).
  const ref = useRef<HTMLSpanElement>(null);
  const [plotPx, setPlotPx] = useState<number | null>(null);
  useEffect(() => {
    const plot = ref.current?.parentElement;
    if (!plot) return;
    const read = () => setPlotPx(plot.clientWidth || null);
    read();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(read) : null;
    ro?.observe(plot);
    return () => ro?.disconnect();
  }, []);
  const near = plotPx ? Math.max(NOW_NEAR_PCT, (NOW_NEAR_PX / plotPx) * 100) : NOW_NEAR_PCT;
  const raw = matchX(now ?? anchorMs, opensAtMs, closesAtMs);
  const x = gatePct != null && raw > gatePct && raw - gatePct < near ? gatePct : raw;
  // A custom property, not a geometry literal: the CSS owns every length (design-frozen skips `--*`).
  const style = { "--x": `${x}%` } as CSSProperties;
  return (
    <>
      <span ref={ref} className="kp-udtrack__elapsed" style={style} />
      <span className="kp-udtrack__now" style={style}
        data-near={markX != null && markKind != null && Math.abs(x - markX) < near ? markKind : undefined} />
    </>
  );
}
