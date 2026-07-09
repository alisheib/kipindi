/**
 * 50pick brand primitives — FINAL (logo round 2, Direction B "Needle").
 *
 * The mark: YES emerald LEFT · NO rose RIGHT · royal ring · the gilt
 * NEEDLE crossing the rim (same object as TippingBar needle + conviction
 * dial) with a gilt counterweight hub on the lower arm · "50" JetBrains
 * Mono 700. Tilt −14°.
 *
 * Variants:
 *   variant="color"  — full color (default; dark canvas)
 *   variant="white"  — single-ink white (dark canvas, photos via plate)
 *   variant="dark"   — single-ink royal (light backgrounds, print)
 *   simplified       — no numerals/hub, heavier strokes; REQUIRED ≤ 20px
 *
 * Reproduction rules:
 *   min full mark 24px · min simplified 14px · clear space 0.25 × diameter
 */
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/* Final mark — "mark-a" (delivered 2026-07-09, `Final logo design/`). A circle
   split YES-emerald LEFT · NO-rose RIGHT by a diagonal chord, the gilt NEEDLE
   riding the seam just past the rim, over a gilt hub with a navy pivot. No ring,
   no numerals — the wordmark carries the name (same object as the TippingBar
   needle + conviction dial). Delivered brand hex is authoritative.
   Variants: color (default) · white / dark (single-ink) · simplified (≤ ~20px:
   heavier needle + hub, drops the pivot). */
const MARK = {
  green: "#1EA362",
  red: "#B03A3E",
  gold: "#E3BC66",
  pivot: "#1A2140",
  whiteInk: "#F7F8FC",
  darkInk: "#1A2140",
  greenPath: "M 38.87 5.37 A 46 46 0 0 0 61.13 94.63 Z",
  redPath: "M 38.87 5.37 A 46 46 0 0 1 61.13 94.63 Z",
  n: { x1: 38.39, y1: 3.43, x2: 61.61, y2: 96.57 },
};

function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

export type FiftyMarkVariant = "color" | "white" | "dark";

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
  const mono = variant !== "color";
  const ink = variant === "white" ? MARK.whiteInk : MARK.darkInk;
  const green = mono ? hexA(ink, variant === "white" ? 0.30 : 0.26) : MARK.green;
  const red = mono ? hexA(ink, variant === "white" ? 0.14 : 0.11) : MARK.red;
  const needle = mono ? ink : MARK.gold;
  const hub = mono ? ink : MARK.gold;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} style={{ display: "block" }} aria-label="50pick">
      <path d={MARK.greenPath} fill={green} />
      <path d={MARK.redPath} fill={red} />
      <line x1={MARK.n.x1} y1={MARK.n.y1} x2={MARK.n.x2} y2={MARK.n.y2} stroke={needle} strokeWidth={simple ? 5 : 3.5} strokeLinecap="round" />
      <circle cx="50" cy="50" r={simple ? 6 : 5} fill={hub} />
      {!simple && !mono && <circle cx="50" cy="50" r="1.7" fill={MARK.pivot} />}
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
  // Kit recast uses `--ease-arrive` (cubic-bezier(.34, 1.56, .64, 1)) at
  // 540ms for the overshoot. Static placements keep the original glide.
  const ease = animate
    ? "width 540ms cubic-bezier(.34, 1.56, .64, 1), transform 540ms cubic-bezier(.34, 1.56, .64, 1), left 540ms cubic-bezier(.34, 1.56, .64, 1)"
    : "none";
  const r = height / 2;
  // When one side is fully empty, the surviving side covers the whole
  // rail and needs both ends rounded — not just the inside corner — so
  // the bar never renders as "all track + a needle on the edge".
  //
  // Critically, base this decision on the TARGET (the real value), not
  // the animated `yes` / `no`. During the hover-recast both halves are
  // briefly mid-animation (e.g. 50/50) and the radii would otherwise
  // jump from full-pill to corner-only and back. Border-radius isn't in
  // the transition list, so it snaps — causing the visible "edges
  // appear and fade incorrectly" glitch Ali reported. Anchoring radii
  // to TARGET keeps them stable across the entire recast.
  const yesRadii = target === 100
    ? { borderRadius: r }
    : { borderTopLeftRadius: r, borderBottomLeftRadius: r };
  const noRadii  = target === 0
    ? { borderRadius: r }
    : { borderTopRightRadius: r, borderBottomRightRadius: r };

  return (
    <div className={cn("w-full", className)}>
      <div
        style={{
          position: "relative",
          height,
          background: "oklch(50% 0.20 268)",
          borderRadius: r,
          overflow: "visible",
          boxShadow: "inset 0 0 0 1px oklch(58% 0.17 268)",
          cursor: recastOnHover ? "default" : undefined,
        }}
        onMouseEnter={handleEnter}
        role="progressbar"
        aria-valuenow={target}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`YES probability ${target}%`}
      >
        <div
          style={{
            position: "absolute", top: 0, bottom: 0, left: 0,
            width: `${yes}%`,
            background: "linear-gradient(90deg, oklch(50% 0.14 152) 0%, oklch(58% 0.16 152) 100%)",
            ...yesRadii,
            transition: ease,
            boxShadow: "0 0 18px oklch(58% 0.16 152 / 0.35)",
          }}
        />
        <div
          style={{
            position: "absolute", top: 0, bottom: 0, right: 0,
            width: `${no}%`,
            background: "linear-gradient(270deg, oklch(52% 0.16 22) 0%, oklch(60% 0.18 22) 100%)",
            ...noRadii,
            transition: ease,
            boxShadow: "0 0 18px oklch(60% 0.18 22 / 0.35)",
          }}
        />
        {/* Tipping needle — gilt champagne, sits on the boundary, tilts with
            lean. At extremes the position is clamped to the inner 6..94
            range so the needle never clips the rounded corner. */}
        <div
          style={{
            position: "absolute",
            left: `calc(${inner}% - 1.5px)`,
            top: -6,
            bottom: -6,
            width: 3,
            background: "oklch(86% 0.13 82)",
            borderRadius: 2,
            transformOrigin: "50% 100%",
            transform: `rotate(${tilt}deg)`,
            transition: ease,
            boxShadow: "0 0 12px oklch(86% 0.13 82 / 0.55)",
          }}
        />
        {resolved && (
          <div style={{ position: "absolute", inset: 0, borderRadius: height / 2, overflow: "hidden", pointerEvents: "none" }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(90deg, transparent 0%, oklch(75% 0.13 85 / 0.5) 50%, transparent 100%)",
                animation: "tb-shimmer 1.6s ease-out",
              }}
            />
          </div>
        )}
        {recastOnHover && (
          <div
            key={sweepKey}
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: r,
              overflow: "hidden",
              pointerEvents: "none",
              opacity: sweepKey === 0 ? 0 : undefined,
            }}
          >
            {sweepKey > 0 && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(90deg, transparent 0%, oklch(78% 0.13 80 / 0) 20%, oklch(78% 0.13 80 / 0.90) 50%, oklch(78% 0.13 80 / 0) 80%, transparent 100%)",
                  backgroundSize: "35% 100%",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "-35% 0",
                  animation: "tb-pbar-sweep 540ms cubic-bezier(.22, 1, .36, 1) both",
                  mixBlendMode: "screen",
                }}
              />
            )}
          </div>
        )}
      </div>
      {showLabels && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 8,
            fontFamily: "JetBrains Mono, ui-monospace, monospace",
            fontSize: 11,
            letterSpacing: "0.05em",
          }}
        >
          <span style={{ color: "var(--bar-label-yes)" }}>
            YES{" "}
            <strong
              style={{
                color: "var(--bar-label-yes-strong)",
                fontWeight: target >= 50 ? 700 : 500,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {target}%
            </strong>
          </span>
          <span
            style={{
              // Was 9 px italic — illegible on mobile. 10.5 px + 500
              // weight + 0.10 em letter-spacing reads cleanly without
              // overpowering the YES / NO percentages on either side.
              color: "var(--bar-label-tipping)",
              fontStyle: "italic",
              textTransform: "uppercase",
              fontSize: 10.5,
              fontWeight: 500,
              letterSpacing: "0.10em",
              opacity: 0.85,
            }}
          >
            {Math.abs(target - 50) < 3 ? "tipping" : target > 50 ? "leans yes" : "leans no"}
          </span>
          <span style={{ color: "var(--bar-label-no)" }}>
            <strong
              style={{
                color: "var(--bar-label-no-strong)",
                fontWeight: target < 50 ? 700 : 500,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {100 - target}%
            </strong>{" "}
            NO
          </span>
        </div>
      )}
      <style>{`
        @keyframes tb-shimmer { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
        @keyframes tb-pbar-sweep {
          0%   { background-position: -35% 0; opacity: 0; }
          15%  { opacity: 0.9; }
          100% { background-position: 135% 0; opacity: 0; }
        }
      `}</style>
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
