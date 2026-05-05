/**
 * 50pick brand primitives — exact ports of `brand.jsx` + `brand-specimens.jsx`
 * from the polymarket-wf design kit.
 *
 * The mark is a tilted circle: YES (emerald) wedge upper-left, NO (rose) wedge
 * lower-right, divider tilted -14° with the "50" sitting on it.
 */
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/* ── FiftyMark ──────────────────────────────────────────────────────────── */

export function FiftyMark({
  size = 64,
  mono = false,
  inverted = false,
  className,
}: {
  size?: number;
  mono?: boolean;
  inverted?: boolean;
  className?: string;
}) {
  const tilt = -14;
  const r = 50;
  const cx = 50, cy = 50;
  const rad = (tilt * Math.PI) / 180;
  const dx = Math.sin(rad) * 80;
  const dy = Math.cos(rad) * 80;
  const top = { x: cx + dx, y: cy - dy };
  const bot = { x: cx - dx, y: cy + dy };

  const yesColor    = mono ? (inverted ? "oklch(96% 0.005 240)" : "oklch(20% 0.01 240)") : "oklch(58% 0.16 152)";
  const noColor     = mono ? (inverted ? "oklch(70% 0.005 240)" : "oklch(50% 0.01 240)") : "oklch(60% 0.18 22)";
  const ringColor   = mono ? (inverted ? "oklch(96% 0.005 240)" : "oklch(20% 0.01 240)") : "oklch(20% 0.01 240)";
  const numberColor = mono ? (inverted ? "oklch(15% 0.01 240)" : "oklch(96% 0.005 240)") : "oklch(96% 0.005 240)";

  const id = React.useId().replace(/:/g, "");

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} style={{ display: "block" }} aria-label="50pick">
      <defs>
        <clipPath id={`fc-${id}`}>
          <circle cx={cx} cy={cy} r={r - 1} />
        </clipPath>
      </defs>
      <g clipPath={`url(#fc-${id})`}>
        <path d={`M ${top.x} ${top.y} A ${r} ${r} 0 0 0 ${bot.x} ${bot.y} L ${top.x} ${top.y} Z`} fill={yesColor} />
        <path d={`M ${top.x} ${top.y} A ${r} ${r} 0 0 1 ${bot.x} ${bot.y} L ${top.x} ${top.y} Z`} fill={noColor} />
        <line x1={top.x} y1={top.y} x2={bot.x} y2={bot.y} stroke={ringColor} strokeWidth="2.4" strokeLinecap="round" />
        <text
          x={cx}
          y={cy + 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="'JetBrains Mono', ui-monospace, monospace"
          fontWeight={700}
          fontSize="30"
          fill={numberColor}
          style={{ letterSpacing: "-0.04em" }}
        >
          50
        </text>
      </g>
      <circle cx={cx} cy={cy} r={r - 1} fill="none" stroke={ringColor} strokeWidth="2" />
    </svg>
  );
}

/* ── FiftyWordmark ──────────────────────────────────────────────────────── */

export function FiftyWordmark({ size = 32, color = "currentColor", className }: { size?: number; color?: string; className?: string }) {
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        fontFamily: "Sora, ui-sans-serif, system-ui",
        fontWeight: 700,
        fontSize: size,
        letterSpacing: "-0.03em",
        color,
        lineHeight: 1,
      }}
    >
      50pick
      <span
        style={{
          fontFamily: "JetBrains Mono, ui-monospace, monospace",
          fontWeight: 500,
          fontSize: size * 0.55,
          marginLeft: size * 0.04,
          opacity: 0.7,
          letterSpacing: 0,
        }}
      >
        .tz
      </span>
    </span>
  );
}

/* ── FiftyLockup ────────────────────────────────────────────────────────── */

export function FiftyLockup({
  size = 36,
  color = "currentColor",
  mono = false,
  inverted = false,
  className,
}: {
  size?: number;
  color?: string;
  mono?: boolean;
  inverted?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex items-center", className)} style={{ gap: size * 0.32 }}>
      <FiftyMark size={size * 1.18} mono={mono} inverted={inverted} />
      <FiftyWordmark size={size} color={color} />
    </div>
  );
}

/* ── FiftyFavicon (kit alias) ───────────────────────────────────────────── */
export const FiftyFavicon = ({ size = 32 }: { size?: number }) => <FiftyMark size={size} />;

/* ── TippingBar — signature progress with the tilting needle ─────────────── */

export function TippingBar({
  yesPct = 50,
  height = 28,
  animate = true,
  showLabels = true,
  resolved = false,
  className,
}: {
  yesPct?: number;
  height?: number;
  animate?: boolean;
  showLabels?: boolean;
  resolved?: boolean;
  className?: string;
}) {
  const yes = Math.max(0, Math.min(100, yesPct));
  const no = 100 - yes;
  const tilt = ((yes - 50) / 50) * 18;
  const ease = animate ? "width 700ms cubic-bezier(.2,.8,.2,1), transform 700ms cubic-bezier(.2,.8,.2,1)" : "none";

  return (
    <div className={cn("w-full", className)}>
      <div
        style={{
          position: "relative",
          height,
          background: "var(--bar-track)",
          borderRadius: height / 2,
          overflow: "visible",
          boxShadow: "inset 0 0 0 1px var(--bar-track-border)",
        }}
        role="progressbar"
        aria-valuenow={yes}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`YES probability ${yes}%`}
      >
        <div
          style={{
            position: "absolute", top: 0, bottom: 0, left: 0,
            width: `${yes}%`,
            background: "linear-gradient(90deg, oklch(50% 0.14 152) 0%, oklch(58% 0.16 152) 100%)",
            borderTopLeftRadius: height / 2,
            borderBottomLeftRadius: height / 2,
            transition: ease,
            boxShadow: "0 0 18px oklch(58% 0.16 152 / 0.35)",
          }}
        />
        <div
          style={{
            position: "absolute", top: 0, bottom: 0, right: 0,
            width: `${no}%`,
            background: "linear-gradient(270deg, oklch(52% 0.16 22) 0%, oklch(60% 0.18 22) 100%)",
            borderTopRightRadius: height / 2,
            borderBottomRightRadius: height / 2,
            transition: ease,
            boxShadow: "0 0 18px oklch(60% 0.18 22 / 0.35)",
          }}
        />
        {/* Tipping needle — sits on the boundary, tilts with lean */}
        <div
          style={{
            position: "absolute",
            left: `calc(${yes}% - 1.5px)`,
            top: -8,
            bottom: -8,
            width: 3,
            background: "var(--bar-needle)",
            borderRadius: 2,
            transformOrigin: "50% 100%",
            transform: `rotate(${tilt}deg)`,
            transition: ease,
            boxShadow: "0 0 12px var(--bar-needle-glow)",
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
            YES <strong style={{ color: "var(--bar-label-yes-strong)" }}>{yes}%</strong>
          </span>
          <span style={{ color: "var(--bar-label-tipping)", fontStyle: "italic", textTransform: "uppercase", fontSize: 9 }}>
            {Math.abs(yes - 50) < 3 ? "tipping" : yes > 50 ? "leans yes" : "leans no"}
          </span>
          <span style={{ color: "var(--bar-label-no)" }}>
            <strong style={{ color: "var(--bar-label-no-strong)" }}>{no}%</strong> NO
          </span>
        </div>
      )}
      <style>{`@keyframes tb-shimmer { from { transform: translateX(-100%); } to { transform: translateX(100%); } }`}</style>
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
    <div className="fixed inset-0 z-modal grid place-items-center bg-bg/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <BrandSpinner size={80} />
        {caption && <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-text-muted">{caption}</p>}
      </div>
    </div>
  );
}
