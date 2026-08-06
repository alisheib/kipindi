/**
 * 50pick brand primitives — FINAL (logo round 2, Direction B "Needle").
 *
 * The mark: YES emerald LEFT · NO rose RIGHT · the gilt NEEDLE riding the seam
 * past the rim (same object as TippingBar needle + conviction dial) over a gilt
 * hub with a navy pivot. No ring, no numerals — the wordmark carries the name.
 *
 * Geometry + colours live in `@/lib/brand-mark` (the ONE definition, shared with
 * `scripts/build-brand-assets.mts` so the in-app mark and exported assets cannot
 * drift — audit C11).
 *
 * Variants:
 *   variant="color"  — full color (default; dark canvas)
 *   variant="white"  — single-ink white (dark canvas, photos via plate)
 *   variant="dark"   — single-ink royal (light backgrounds, print)
 *   simplified       — no pivot, heavier strokes; REQUIRED ≤ 20px
 *
 * Reproduction rules:
 *   min full mark 24px · min simplified 14px · clear space 0.25 × diameter
 */
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { MARK, markColors, type FiftyMarkVariant } from "@/lib/brand-mark";

export type { FiftyMarkVariant };

/* ── FiftyMark ──────────────────────────────────────────────────────────── */

export function FiftyMark({
  size = 64,
  variant = "color",
  simplified,
  className,
}: {
  size?: number;
  variant?: FiftyMarkVariant;
  /** Heavier needle + hub, drops the pivot dot. Use at or below ~20px. */
  simplified?: boolean;
  className?: string;
}) {
  const simple = simplified ?? size < 24;
  const c = markColors(variant, simple);
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} style={{ display: "block" }} aria-label="50pick">
      <path d={MARK.greenPath} fill={c.green} />
      <path d={MARK.redPath} fill={c.red} />
      <line x1={MARK.n.x1} y1={MARK.n.y1} x2={MARK.n.x2} y2={MARK.n.y2} stroke={c.needle} strokeWidth={simple ? 5 : 3.5} strokeLinecap="round" />
      <circle cx="50" cy="50" r={simple ? 6 : 5} fill={c.hub} />
      {c.pivot && <circle cx="50" cy="50" r="1.7" fill={c.pivot} />}
    </svg>
  );
}

/** Rounded-square royal tile — app-store art, on-photo plate, avatars. */
export function FiftyTile({ size = 64, radius, className }: { size?: number; radius?: number; className?: string }) {
  return (
    <div
      className={className}
      style={{
        width: size, height: size, borderRadius: radius ?? size * 0.225,
        background: "oklch(19% 0.14 268)", display: "grid", placeItems: "center",
      }}
    >
      <FiftyMark size={size * 0.72} />
    </div>
  );
}

/* ── FiftyWordmark ──────────────────────────────────────────────────────── */

export function FiftyWordmark({
  size = 32,
  color = "currentColor",
  tz = true,
  className,
}: {
  size?: number;
  color?: string;
  /** ".tz" suffix — on for product chrome, off for pure brand moments. */
  tz?: boolean;
  className?: string;
}) {
  return (
    <span
      className={className}
      style={{
        display: "inline-flex", alignItems: "baseline",
        fontFamily: "Sora, ui-sans-serif, system-ui", fontWeight: 700,
        fontSize: size, letterSpacing: "-0.025em", color, lineHeight: 1,
      }}
    >
      <span>50pick</span>
      {tz && (
        <span style={{ fontFamily: "JetBrains Mono, ui-monospace, monospace", fontWeight: 500, fontSize: size * 0.52, marginLeft: size * 0.08, opacity: 0.62, letterSpacing: 0 }}>
          .tz
        </span>
      )}
    </span>
  );
}

/* ── FiftyLockup ────────────────────────────────────────────────────────── */

export function FiftyLockup({
  size = 36,
  color = "currentColor",
  variant = "color",
  tz = true,
  layout = "horizontal",
  className,
}: {
  size?: number;
  color?: string;
  variant?: FiftyMarkVariant;
  tz?: boolean;
  layout?: "horizontal" | "stacked";
  className?: string;
}) {
  if (layout === "stacked") {
    return (
      <div className={cn("inline-flex flex-col items-center", className)} style={{ gap: size * 0.5 }}>
        <FiftyMark size={size * 2.1} variant={variant} />
        <FiftyWordmark size={size} color={color} tz={tz} />
      </div>
    );
  }
  return (
    <div className={cn("inline-flex items-center", className)} style={{ gap: size * 0.38 }}>
      <FiftyMark size={size * 1.22} variant={variant} />
      <FiftyWordmark size={size} color={color} tz={tz} />
    </div>
  );
}

/* ── FiftyFavicon (kit alias) ───────────────────────────────────────────── */
export const FiftyFavicon = ({ size = 32 }: { size?: number }) => (
  <FiftyMark size={size} simplified={size < 24} />
);

/* ── GiltCorner — the kit's heraldic L-bracket ──────────────────────────── */
/* Decorative gilt corner used to frame Banner heroes / regulator letters /
   palette specimens. Rotation values: 0 = top-left, 90 = top-right,
   -90 = bottom-left, 180 = bottom-right. Direct port of kit/banners.jsx. */

export function GiltCorner({
  size = 64,
  rotate = 0,
  className,
  style,
}: {
  size?: number;
  rotate?: 0 | 90 | -90 | 180;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      style={{ display: "block", overflow: "visible", ...style }}
      aria-hidden
    >
      <g
        transform={`rotate(${rotate} ${size / 2} ${size / 2})`}
        stroke="oklch(78% 0.13 80)"
        fill="none"
        strokeLinecap="round"
      >
        <line x1="6" y1="6" x2={size * 0.55} y2="6" strokeWidth="0.5" />
        <line x1="6" y1="6" x2="6" y2={size * 0.55} strokeWidth="0.5" />
        <circle cx="6" cy="6" r="2" fill="oklch(78% 0.13 80)" />
      </g>
    </svg>
  );
}

/* ── TippingBar — signature progress with the tilting needle ─────────────── */

export function TippingBar({
  yesPct = 50,
  height = 28,
  animate = true,
  showLabels = true,
  resolved = false,
  className,
  recastOnHover = true,
  empty = false,
  emptyLabel = "No bets yet",
}: {
  yesPct?: number;
  height?: number;
  animate?: boolean;
  showLabels?: boolean;
  resolved?: boolean;
  className?: string;
  /** Hover-recast gesture per kit spec: bar collapses to 50/50 then
   *  re-expands to the true split with an overshoot, a gilt hairline
   *  sweeps across, leading side bolds. Disable on order books, depth
   *  charts, and any list of > 10 bars in view. */
  recastOnHover?: boolean;
  /** No activity yet — render a neutral dashed track (no split, no needle,
   *  no labels). An empty market has no crowd price, so a centred 50/50 would
   *  be a fabricated one (RULES law 5). A STATE OF THIS BAR, not a second
   *  component — DESIGN_AUTHORITY B9. */
  empty?: boolean;
  /** Accessible name for the empty rail. Pass the caller's localised string —
   *  this component is locale-agnostic, so the English default is a fallback
   *  for callers that have no `t` in scope, never a shipped English label on a
   *  Swahili screen. */
  emptyLabel?: string;
}) {
  const target = Math.max(0, Math.min(100, yesPct));
  const [animYes, setAnimYes] = React.useState(target);
  const [sweepKey, setSweepKey] = React.useState(0);
  const rafRef = React.useRef<number | null>(null);
  const recastTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => { setAnimYes(target); }, [target]);
  React.useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (recastTimerRef.current) clearTimeout(recastTimerRef.current);
  }, []);

  const handleEnter = () => {
    if (!recastOnHover) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (recastTimerRef.current) clearTimeout(recastTimerRef.current);
    setSweepKey((k) => k + 1);
    // Collapse to 50/50 instantly (no transition) by setting animYes
    // synchronously. The CSS transition on width handles the visual.
    setAnimYes(50);
    // Wait long enough for the collapse to paint (one frame), then
    // trigger the re-expand. Using setTimeout ensures the browser
    // commits the 50% state before starting the overshoot transition
    // back to target — fixes the "animation disappears" bug where
    // double-RAF was too fast and batched both updates into one frame.
    recastTimerRef.current = setTimeout(() => {
      recastTimerRef.current = null;
      setAnimYes(target);
    }, 50);
  };

  const yes = animYes;
  const no = 100 - yes;
  // Tilt eases off near 0/100 — at the extremes there is no "tipping" any
  // more, so the needle should stand cleanly upright instead of pivoting
  // hard into the rounded corner. We softmax the lean into the inner 6..94
  // range so the visual never registers as a clipped sliver.
  const inner = Math.max(6, Math.min(94, yes));
  const tiltLean = (inner - 50) / 44;
  const tilt = tiltLean * 14;
  // The full-pill decision (one side owns the whole rail) is keyed off the
  // TARGET, never the animated value — see the .tipbar-fill[data-full] note in
  // globals.css for why. The radii themselves now live in CSS.
  const yesFull = target === 100 || undefined;
  const noFull = target === 0 || undefined;
  // The ONE inline custom property: height is a caller prop, and every derived
  // measurement (pill radius, needle overhang) is computed from it in CSS.
  const railVars = { "--tb-h": `${height}px` } as React.CSSProperties;

  // Cold-start: an honest neutral rail. Placed AFTER every hook above so hook
  // order is stable regardless of this branch (rules-of-hooks safe).
  if (empty) {
    return (
      <div className={cn("w-full", className)} style={railVars}>
        <div
          className="tipbar-empty"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={emptyLabel}
        />
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)} style={railVars}>
      <div
        className={cn("tipbar-rail", animate && "tipbar-anim", recastOnHover && "tipbar-recast")}
        onMouseEnter={handleEnter}
        role="progressbar"
        aria-valuenow={target}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`YES probability ${target}%`}
      >
        <div className="tipbar-fill tipbar-yes" data-full={yesFull} style={{ width: `${yes}%` }} />
        <div className="tipbar-fill tipbar-no" data-full={noFull} style={{ width: `${no}%` }} />
        {/* Tipping needle — gilt champagne, sits on the boundary, tilts with
            lean. At extremes the position is clamped to the inner 6..94
            range so the needle never clips the rounded corner. */}
        <div
          className="tipbar-needle"
          style={{ left: `calc(${inner}% - 1.5px)`, transform: `rotate(${tilt}deg)` }}
        />
        {resolved && <div className="tipbar-shimmer" aria-hidden />}
        {recastOnHover && sweepKey > 0 && <div key={sweepKey} className="tipbar-sweep" aria-hidden />}
      </div>
      {showLabels && (
        <div className="tipbar-labels">
          <span className="tb-yes">
            YES <strong data-lead={target >= 50 || undefined}>{target}%</strong>
          </span>
          <span className="tipbar-lean">
            {Math.abs(target - 50) < 3 ? "tipping" : target > 50 ? "leans yes" : "leans no"}
          </span>
          <span className="tb-no">
            <strong data-lead={target < 50 || undefined}>{100 - target}%</strong> NO
          </span>
        </div>
      )}
    </div>
  );
}

/* ── ConfidenceDial — circular split-mark rendering of probability ──────── */

export function ConfidenceDial({
  yesPct = 62,
  size = 92,
  label,
  className,
}: {
  yesPct?: number;
  size?: number;
  label?: string;
  className?: string;
}) {
  const yes = Math.max(0, Math.min(100, yesPct));
  const tilt = ((yes - 50) / 50) * 22;
  const r = 44;
  const cx = 50, cy = 50;
  const rad = (tilt * Math.PI) / 180;
  const dx = Math.sin(rad) * 70;
  const dy = Math.cos(rad) * 70;
  const top = { x: cx + dx, y: cy - dy };
  const bot = { x: cx - dx, y: cy + dy };
  const id = React.useId().replace(/:/g, "");

  return (
    <div className={cn("inline-flex flex-col items-center gap-1.5", className)}>
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <defs>
          <clipPath id={`cd-${id}`}>
            <circle cx={cx} cy={cy} r={r} />
          </clipPath>
        </defs>
        <circle cx={cx} cy={cy} r={r} fill="var(--bar-track)" />
        <g clipPath={`url(#cd-${id})`}>
          <path d={`M ${top.x} ${top.y} A ${r} ${r} 0 0 0 ${bot.x} ${bot.y} L ${top.x} ${top.y} Z`} fill="oklch(50% 0.14 152)" opacity={0.92} />
          <path d={`M ${top.x} ${top.y} A ${r} ${r} 0 0 1 ${bot.x} ${bot.y} L ${top.x} ${top.y} Z`} fill="oklch(52% 0.16 22)" opacity={0.92} />
          <line x1={top.x} y1={top.y} x2={bot.x} y2={bot.y} stroke="var(--bar-needle)" strokeWidth="2.2" strokeLinecap="round" />
        </g>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bar-track-border)" strokeWidth="1.5" />
        <text
          x={cx}
          y={cy + 1.5}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="'JetBrains Mono', ui-monospace, monospace"
          fontWeight={700}
          fontSize="22"
          fill="var(--text)"
          style={{ letterSpacing: "-0.04em" }}
        >
          {yes}
        </text>
      </svg>
      {label && (
        <div
          style={{
            fontSize: 10,
            color: "oklch(72% 0.04 240)",
            fontFamily: "JetBrains Mono, ui-monospace, monospace",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}

/* ── SignalPip — aqua-pulsing finishing detail ─────────────────────────────
 * Cooler sibling of LiveDot. Non-semantic — use for "new", live ticker glow,
 * fresh-data highlights, sparkline anchor. NEVER for resolution status.
 * Mirror of kit/atoms.jsx → SignalPip. */

export function SignalPip({ size = 8, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={className}
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: "var(--aqua-300)",
        boxShadow: "0 0 0 0 var(--aqua-glow)",
        animation: "aqua-pulse 2.2s ease-in-out infinite",
      }}
    />
  );
}

/* ── PulseRing — for live-market badges + loaders ────────────────────────── */

export function PulseRing({
  size = 40,
  color = "oklch(58% 0.16 152)",
  children,
  className,
}: {
  size?: number;
  color?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("inline-flex items-center justify-center", className)}
      style={{ position: "relative", width: size, height: size }}
    >
      <span
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          border: `1.5px solid ${color}`,
          opacity: 0.6,
          animation: "pr-pulse 2s ease-out infinite",
        }}
      />
      {children}
      <style>{`
        @keyframes pr-pulse {
          0%   { transform: scale(0.85); opacity: 0.7; }
          70%  { transform: scale(1.25); opacity: 0; }
          100% { transform: scale(1.25); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/* ── Loaders that use the brand mark itself ──────────────────────────────── */

/** Inline brand spinner — the mark with PulseRing wrapping it. */
export function BrandSpinner({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <span className={cn("inline-block", className)} role="status" aria-label="Loading">
      <PulseRing size={size + 16} color="oklch(58% 0.16 152)">
        <FiftyMark size={size} />
      </PulseRing>
    </span>
  );
}

export function SectionLoader({ height = 240 }: { height?: number }) {
  return (
    <div className="rounded-lg border border-border bg-bg-elevated grid place-items-center" style={{ height }}>
      <BrandSpinner size={56} />
    </div>
  );
}

export function BrandLoader({ caption }: { caption?: string }) {
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-bg/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <BrandSpinner size={80} />
        {caption && <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-text-muted">{caption}</p>}
      </div>
    </div>
  );
}
