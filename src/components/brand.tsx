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
  needleClassName,
}: {
  size?: number;
  variant?: FiftyMarkVariant;
  /** Heavier needle + hub, drops the pivot dot. Use at or below ~20px. */
  simplified?: boolean;
  className?: string;
  /** Wraps needle + hub (+ pivot) in a `<g>` carrying this class, so IDENTITY
   *  motion (M8 — `.needle-sweep`, `.needle-settle-loss`) can move the needle on
   *  its own hinge without a second mark definition existing anywhere. The mark
   *  stays `brand-mark.ts`'s one geometry either way. */
  needleClassName?: string;
}) {
  const simple = simplified ?? size < 24;
  const c = markColors(variant, simple);
  const needle = (
    <>
      <line x1={MARK.n.x1} y1={MARK.n.y1} x2={MARK.n.x2} y2={MARK.n.y2} stroke={c.needle} strokeWidth={simple ? 5 : 3.5} strokeLinecap="round" />
      <circle cx="50" cy="50" r={simple ? 6 : 5} fill={c.hub} />
      {c.pivot && <circle cx="50" cy="50" r="1.7" fill={c.pivot} />}
    </>
  );
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} style={{ display: "block" }} aria-label="50pick">
      <path d={MARK.greenPath} fill={c.green} />
      <path d={MARK.redPath} fill={c.red} />
      {needleClassName ? <g className={needleClassName}>{needle}</g> : needle}
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
  markClassName,
}: {
  size?: number;
  color?: string;
  variant?: FiftyMarkVariant;
  tz?: boolean;
  layout?: "horizontal" | "stacked";
  className?: string;
  /** Class for the MARK alone (e.g. `mark-flip-i`, M8) — identity motion must
   *  never rotate the wordmark beside it. */
  markClassName?: string;
}) {
  if (layout === "stacked") {
    return (
      <div className={cn("inline-flex flex-col items-center", className)} style={{ gap: size * 0.5 }}>
        <FiftyMark size={size * 2.1} variant={variant} className={markClassName} />
        <FiftyWordmark size={size} color={color} tz={tz} />
      </div>
    );
  }
  return (
    <div className={cn("inline-flex items-center", className)} style={{ gap: size * 0.38 }}>
      <FiftyMark size={size * 1.22} variant={variant} className={markClassName} />
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
  probabilityLabel = "YES probability {pct}%",
  labels = { yes: "YES", no: "NO", tipping: "tipping", leansYes: "leans yes", leansNo: "leans no" },
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
  /** The bar's accessible name, `{pct}` substituted. Callers with a dictionary pass
   *  `t.market.probBarAria`; the English default keeps the brand primitive dict-free. */
  probabilityLabel?: string;
  /** The five words under the bar when `showLabels`. Same rule as `probabilityLabel`. */
  labels?: { yes: string; no: string; tipping: string; leansYes: string; leansNo: string };
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
        /* ⛔ THIS WAS A HARDCODED ENGLISH STRING — `YES probability ${target}%` — and it
           never went through the dictionary at all, so a Chinese screen-reader user HEARD
           "YES probability 100 percent" on a page whose every visible word was Chinese.
           Found by reading the live page, not by any suite (§L4).
           A prop with an English default, exactly like `emptyLabel` above: this file is a
           brand primitive and deliberately does not import the dictionary. */
        aria-label={probabilityLabel.replace("{pct}", String(target))}
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
      {/* ⛔ ALL FIVE OF THESE WERE HARDCODED ENGLISH — "YES", "NO", and the three lean
          words — so a Swahili or Chinese reader met them under the bar on `/results`,
          `/live` and the market detail. The dictionary has had every one of them the whole
          time (`common.yes`, `common.no`, `market.tipping`, `leansYes`, `leansNo`).
          Props with English defaults, like `emptyLabel`: this is a brand primitive and
          deliberately does not import the dictionary. */}
      {showLabels && (
        <div className="tipbar-labels">
          <span className="tb-yes">
            {labels.yes} <strong data-lead={target >= 50 || undefined}>{target}%</strong>
          </span>
          <span className="tipbar-lean">
            {Math.abs(target - 50) < 3 ? labels.tipping : target > 50 ? labels.leansYes : labels.leansNo}
          </span>
          <span className="tb-no">
            <strong data-lead={target < 50 || undefined}>{100 - target}%</strong> {labels.no}
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
    <>
      <span
        aria-hidden
        className={cn("signal-pip", className)}
        style={{
          display: "inline-block",
          width: size,
          height: size,
          borderRadius: "50%",
          background: "var(--aqua-300)",
          boxShadow: "0 0 0 0 var(--aqua-glow)",
        }}
      />
      <style>{`
        /* ⚠️ ON A CLASS, NOT IN THE style ATTRIBUTE — the same reason as .pr-ring
           above. This is an ambient loop that ships on /markets (the main board)
           and on the probability chart, and as an inline shorthand it was invisible
           to test:reduce-motion, so it had a calm branch on none of the three
           gates. The OTHER consumer of this same keyframe, .pchart-dot-halo, has
           been listed in globals.css §6 all along; this one simply could not be
           seen to be missing.
           ⭐ It STOPS at every gate, the throttle included: the pip is explicitly
           non-semantic by its own doc above ("new", fresh-data glow, sparkline
           anchor), so nothing is lost when it holds still — unlike .pr-ring, which
           answers "is it still loading?". The dot stays drawn at full opacity. */
        .signal-pip { animation: aqua-pulse 2.2s ease-in-out infinite; }
        /* Stopped, at full opacity, with the flat rest halo the element's own style
           already carries — nothing here needs restating, because the base state
           IS the calm state for this one. */
        @media (prefers-reduced-motion: reduce) {
          .signal-pip { animation: none; }
        }
        html.kp-reduce-motion .signal-pip,
        [data-motion="minimal"] .signal-pip { animation: none; }
        [data-motion="reduced"] .signal-pip { animation: none; }
      `}</style>
    </>
  );
}

/* ── PulseRing — for live-market badges + loaders ────────────────────────── */

/**
 * A ring that breathes outward. Two jobs, and they pull in opposite directions
 * under §M6: on `/live` it is a permanent ambient LOOP behind the section label,
 * and inside `BrandSpinner` it is an in-flight indicator on every route's
 * `loading.tsx`.
 *
 * ⚠️ THE ANIMATION IS ON A CLASS, NOT IN THE style ATTRIBUTE, and it has to be.
 * `pr-pulse` used to be an inline `animation` shorthand, which is invisible to
 * every motion gate this product has: `test:reduce-motion` reads RULES, so an
 * infinite loop on a player board was never checked against the third gate and
 * had no calm branch at all; and `test:keyframes`' consumer scan stops at the
 * opening quote, so `pr-pulse` was reported as a name with NO CONSUMER — i.e. as
 * safe to delete.
 *
 * ⭐ THE THIRD GATE KEEPS IT, CHEAPLY, AND THAT IS DELIBERATE. At
 * `data-motion="reduced"` — the low-end Android this product is built for — the
 * scale-and-fade is replaced by the kit's opacity-only `m-breathe`, the exact
 * treatment `.live-dot` and `.cm-status-dot` already take in globals.css §6. A
 * transform-driven ring is what costs that device; "is it still loading?" is what
 * the player loses if the ring simply stops, and the device on that tier is the
 * one where loads take longest. The two hard clamps (OS + the in-app switch) DO
 * stop it — a player who asked for no motion asked for no motion — and it rests
 * visible at its base opacity, never invisible.
 */
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
        className="pr-ring"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          border: `1.5px solid ${color}`,
          opacity: 0.6,
        }}
      />
      {children}
      <style>{`
        .pr-ring { animation: pr-pulse 2s ease-out infinite; }
        @keyframes pr-pulse {
          0%   { transform: scale(0.85); opacity: 0.7; }
          70%  { transform: scale(1.25); opacity: 0; }
          100% { transform: scale(1.25); opacity: 0; }
        }
        /* The two CLAMPS stop it outright. The ring is then drawn at the resting
           opacity 0.6 its own element style carries — an end frame that RENDERS,
           never an invisible one. (Only transform is worth neutralising here:
           opacity lives in the inline style, which a rule cannot outrank.)
           ⛔ NO BACKTICKS IN THIS BLOCK — it is a template literal, and a backtick
           inside a CSS comment closes the string and turns the rest of the file
           into unparseable JSX. Cost one build on 2026-08-21. */
        @media (prefers-reduced-motion: reduce) {
          .pr-ring { animation: none; transform: none; }
        }
        html.kp-reduce-motion .pr-ring,
        [data-motion="minimal"] .pr-ring { animation: none; transform: none; }
        /* The THROTTLE keeps the signal and drops the cost: opacity-only, no
           transform, on the kit's own symmetric loop curve. Same trade as
           .live-dot / .cm-status-dot in globals.css §6. */
        [data-motion="reduced"] .pr-ring { animation: m-breathe 2s var(--m-breathe) infinite; }
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
