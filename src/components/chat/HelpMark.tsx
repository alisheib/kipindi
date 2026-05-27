"use client";

/**
 * HelpMark — the chat-companion variant of the 50pick FiftyMark.
 *
 * Recommended usage (the ship-it default for the chat FAB):
 *
 *   <HelpMark size={34} />
 *
 * That renders the full-color 50pick coin (emerald YES, rose NO, gilt
 * divider + pip + outer hairline) with bulky gilt support-headset
 * headphones and a microphone boom on top — unmistakably "AI concierge
 * with a person-shaped affordance."
 *
 * NOTE: this overrides the original design-brief invariant that
 * reserved YES/NO colors for betting cues only. Per product-owner
 * direction the help bubble carries the full brand mark — gilt is now
 * spent in three places on the chat surface (bubble headphones +
 * player-bubble border + escalate pill). Track that as an intentional
 * choice, not scope creep.
 *
 * Drop into src/components/chat/ and swap the bubble's <FiftyMark /> for
 * <HelpMark /> in ChatBubble.tsx. One-line change in the bubble.
 *
 * Props:
 *   size     — pixel width (height auto-derived from the 144×158 viewBox).
 *              FAB renders 34 desktop / 30 mobile.
 *   variant  — "gilt" (default, ship-it) | "indigo" (subtle, no gilt spend)
 *              | "halo" (no headphones, pearl ring pulse — fallback)
 *   chord    — full-color brand mark (default true). false → pearl mono
 *              base if you ever need a quieter rendering.
 *   pulse    — halo variant only. Disable for static rendering.
 */

import { useId } from "react";

export type HelpMarkProps = {
  size?: number;
  variant?: "gilt" | "indigo" | "halo";
  chord?: boolean;
  pulse?: boolean;
  className?: string;
  "aria-label"?: string;
};

export function HelpMark({
  size = 34,
  variant = "gilt",
  chord = true,
  pulse = true,
  className,
  "aria-label": ariaLabel = "50pick Help",
}: HelpMarkProps) {
  const id = useId().replace(/:/g, "");

  /* ---- Coin geometry (preserved from FiftyMark — do not edit) ------ */
  const tilt = -14;
  const r = 50;
  const cx = 50;
  const cy = 50;
  const rad = (tilt * Math.PI) / 180;
  const dx = Math.sin(rad) * 80;
  const dy = Math.cos(rad) * 80;
  const top = { x: cx + dx, y: cy - dy };
  const bot = { x: cx - dx, y: cy + dy };

  /* ---- Palette ---------------------------------------------------- */
  const indigo = "oklch(20% 0.090 268)";
  const gilt = "oklch(86% 0.13 80)";
  const giltPip = "oklch(85% 0.13 86)";
  const yes = chord ? "oklch(58% 0.16 152)" : "oklch(96% 0.005 268)";
  const no = chord ? "oklch(60% 0.18 22)" : "oklch(70% 0.020 268)";
  const divider = chord ? gilt : indigo;
  const numeral = chord ? "oklch(96% 0.005 268)" : indigo;

  /* ---- Headphone palette ----------------------------------------- */
  const hp = variant === "gilt"
    ? { color: gilt, deep: "oklch(54% 0.11 80)", hi: "oklch(94% 0.10 90)" }
    : { color: indigo, deep: "oklch(11% 0.080 268)", hi: "oklch(40% 0.080 268)" };

  /* ---- ViewBox sized for bulky headset around the coin ----------- */
  const vbX = -22;
  const vbY = -34;
  const vbW = 144;
  const vbH = 158;

  /* ---- Headphone geometry — over-ear support headset + boom mic -- */
  const cupL = { x: -2, y: 50, r: 13 };
  const cupR = { x: 102, y: 50, r: 13 };
  const coneR = 6.2;
  const headband =
    `M ${cupL.x} ${cupL.y - cupL.r + 1} ` +
    `C ${cupL.x} -28, ${cupR.x} -28, ${cupR.x} ${cupR.y - cupR.r + 1}`;
  const boom = `M 6 60 Q 14 86 36 92`;
  const mic = { x: 38, y: 93, rx: 6.5, ry: 4.2 };

  // Compact layout auto-engages below the legibility threshold (~25 px).
  // At small sizes the boom mic + capsule + foam tip add up to ~4-5 px
  // of dense detail that just reads as mud against the chat-background.
  // Dropping them keeps the coin + earcups + headband — the three
  // shapes a reader actually parses at 22 px.
  const compact = size <= 25;
  const HEADBAND_W = compact ? 8 : 6.5;
  const BOOM_W = 4;

  return (
    <svg
      viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
      width={size}
      height={size * (vbH / vbW)}
      className={className}
      style={{ display: "block", overflow: "visible" }}
      aria-label={ariaLabel}
    >
      <defs>
        <clipPath id={`hm-coin-${id}`}>
          <circle cx={cx} cy={cy} r={r - 1} />
        </clipPath>
      </defs>

      {/* V3 — pulsing pearl halo behind the coin */}
      {variant === "halo" && (
        <circle
          cx={cx}
          cy={cy}
          r={r + 1.4}
          fill="none"
          stroke="oklch(86% 0.040 268)"
          strokeWidth={1}
          className={pulse ? "hm-halo-pulse" : undefined}
          opacity={pulse ? undefined : 0.6}
        />
      )}

      {/* The coin (FiftyMark — chord or mono+inverted) */}
      <g clipPath={`url(#hm-coin-${id})`}>
        <path
          d={`M ${top.x} ${top.y} A ${r} ${r} 0 0 0 ${bot.x} ${bot.y} L ${top.x} ${top.y} Z`}
          fill={yes}
        />
        <path
          d={`M ${top.x} ${top.y} A ${r} ${r} 0 0 1 ${bot.x} ${bot.y} L ${top.x} ${top.y} Z`}
          fill={no}
        />
        <line
          x1={top.x}
          y1={top.y}
          x2={bot.x}
          y2={bot.y}
          stroke={divider}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <text
          x={cx}
          y={cy + 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="'JetBrains Mono', ui-monospace, monospace"
          fontWeight={700}
          fontSize={30}
          fill={numeral}
          style={{ letterSpacing: "-0.04em" }}
        >
          50
        </text>
        {chord && <circle cx={cx} cy={cy} r={1.6} fill={giltPip} />}
      </g>

      {/* Outer royal ring + gilt outer hairline (chord only) */}
      <circle cx={cx} cy={cy} r={r - 1} fill="none" stroke={indigo} strokeWidth={2} />
      {chord && (
        <circle
          cx={cx}
          cy={cy}
          r={r - 2.4}
          fill="none"
          stroke={gilt}
          strokeWidth={0.5}
          opacity={0.55}
        />
      )}

      {/* Support headset — bulky over-ear cups + headband + boom mic */}
      {variant !== "halo" && (
        <g>
          {/* Headband — shadow + main band + highlight ribbon */}
          <path
            d={headband}
            fill="none"
            stroke={hp.deep}
            strokeWidth={HEADBAND_W + 1}
            strokeLinecap="round"
            opacity={0.55}
            transform="translate(0, 1.2)"
          />
          <path
            d={headband}
            fill="none"
            stroke={hp.color}
            strokeWidth={HEADBAND_W}
            strokeLinecap="round"
          />
          <path
            d={headband}
            fill="none"
            stroke={hp.hi}
            strokeWidth={1.2}
            strokeLinecap="round"
            opacity={0.7}
            transform="translate(0, -1.6)"
          />

          {/* Mic boom + capsule + foam — suppressed in compact mode
              (size ≤ 25 px) so the small per-message AI avatars don't
              render the mic as illegible mud. The coin + earcups +
              headband stay; that's enough of a concierge read. */}
          {!compact && (
            <>
              <path
                d={boom}
                fill="none"
                stroke={hp.deep}
                strokeWidth={BOOM_W + 1}
                strokeLinecap="round"
                opacity={0.5}
                transform="translate(0.6, 1.2)"
              />
              <path
                d={boom}
                fill="none"
                stroke={hp.color}
                strokeWidth={BOOM_W}
                strokeLinecap="round"
              />
              <path
                d={boom}
                fill="none"
                stroke={hp.hi}
                strokeWidth={1}
                strokeLinecap="round"
                opacity={0.6}
                transform="translate(-0.4, -0.6)"
              />

              {/* Mic capsule — foam tip with darker core */}
              <ellipse cx={mic.x + 0.5} cy={mic.y + 1} rx={mic.rx} ry={mic.ry} fill={hp.deep} opacity={0.55} />
              <ellipse cx={mic.x} cy={mic.y} rx={mic.rx} ry={mic.ry} fill={hp.color} />
              <ellipse cx={mic.x} cy={mic.y} rx={mic.rx - 2.2} ry={mic.ry - 1.6} fill={hp.deep} opacity={0.62} />
              <ellipse cx={mic.x - 1.4} cy={mic.y - 1} rx={1.6} ry={1} fill={hp.hi} opacity={0.55} />
            </>
          )}

          {/* Earcups — shadow + main + rim + cone + dot + glint */}
          <circle cx={cupL.x + 0.6} cy={cupL.y + 1.4} r={cupL.r} fill={hp.deep} opacity={0.5} />
          <circle cx={cupR.x + 0.6} cy={cupR.y + 1.4} r={cupR.r} fill={hp.deep} opacity={0.5} />

          <circle cx={cupL.x} cy={cupL.y} r={cupL.r} fill={hp.color} />
          <circle cx={cupR.x} cy={cupR.y} r={cupR.r} fill={hp.color} />

          <circle cx={cupL.x} cy={cupL.y} r={cupL.r - 0.8} fill="none" stroke={hp.deep} strokeWidth={1.2} opacity={0.6} />
          <circle cx={cupR.x} cy={cupR.y} r={cupR.r - 0.8} fill="none" stroke={hp.deep} strokeWidth={1.2} opacity={0.6} />

          <circle cx={cupL.x} cy={cupL.y} r={coneR} fill={hp.deep} opacity={0.82} />
          <circle cx={cupR.x} cy={cupR.y} r={coneR} fill={hp.deep} opacity={0.82} />

          <circle cx={cupL.x} cy={cupL.y} r={1.8} fill={hp.hi} opacity={0.85} />
          <circle cx={cupR.x} cy={cupR.y} r={1.8} fill={hp.hi} opacity={0.85} />

          <ellipse cx={cupL.x - 3.5} cy={cupL.y - 4.5} rx={2.2} ry={1.2} fill={hp.hi} opacity={0.6} />
          <ellipse cx={cupR.x - 3.5} cy={cupR.y - 4.5} rx={2.2} ry={1.2} fill={hp.hi} opacity={0.6} />
        </g>
      )}
    </svg>
  );
}
