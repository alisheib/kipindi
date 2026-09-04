/**
 * Ring — the dash-circle primitive behind every circular data visual at user
 * level (the /results YES/NO/VOID outcome donut · the /profile/invite earnings
 * progress ring). Segments are fractions of one revolution, drawn clockwise
 * from 12 o'clock, later-listed segments painted underneath (the results donut
 * wants YES on top of NO on top of VOID at the shared paint edges).
 *
 * Colour is the CALLER's statement — this primitive imposes none, because its
 * two consumers are on opposite sides of the gold law: outcome counts wear
 * yes/no ink, while the invite ring is EARNED money and wears gold correctly
 * (§B4 — struck gold marks money that was earned).
 *
 * Hook-free — server and client components both render it.
 */
import type { ReactNode } from "react";

export type RingSegment = {
  /** Fraction of the full circle, 0..1. The component clamps the sum to 1. */
  frac: number;
  stroke: string;
  /** Rounded end caps — for single-segment progress rings. A multi-segment
   *  donut must NOT round its caps or neighbours overlap at every seam. */
  round?: boolean;
  /** Optional style passthrough (e.g. the invite ring's gold glow). */
  style?: React.CSSProperties;
};

export function Ring({
  size,
  strokeWidth,
  segments,
  trackStroke = "var(--bg-overlay)",
  children,
  className,
}: {
  size: number;
  strokeWidth: number;
  segments: RingSegment[];
  trackStroke?: string;
  /** Rendered inside the (un-rotated) svg — e.g. a center label. */
  children?: ReactNode;
  className?: string;
}) {
  const r = size / 2 - strokeWidth / 2 - 0.5;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  // Cumulative offsets: segment i starts where the ones before it end.
  let acc = 0;
  const placed = segments
    .filter((s) => s.frac > 0)
    .map((s) => {
      const frac = Math.max(0, Math.min(s.frac, 1 - acc));
      const seg = { ...s, len: frac * c, offset: -acc * c };
      acc += frac;
      return seg;
    });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className={className}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={trackStroke} strokeWidth={strokeWidth} />
      <g transform={`rotate(-90 ${cx} ${cx})`}>
        {placed
          .slice()
          .reverse()
          .map((s, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cx}
              r={r}
              fill="none"
              stroke={s.stroke}
              strokeWidth={strokeWidth}
              strokeLinecap={s.round ? "round" : undefined}
              strokeDasharray={`${s.len} ${c - s.len}`}
              strokeDashoffset={s.offset}
              style={s.style}
            />
          ))}
      </g>
      {children}
    </svg>
  );
}
