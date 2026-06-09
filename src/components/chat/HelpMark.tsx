"use client";

/**
 * HelpMark — 50pick brand coin inside a rounded chat-bubble silhouette.
 *
 * The bubble shape reads as "chat / help" at every size (22px message
 * avatars through 56px hero). The brand coin (YES/NO split, gilt
 * divider, "50" numeral) sits centered inside so the mark is
 * unmistakably 50pick. A small tail at bottom-right completes the
 * speech-bubble read.
 *
 * Much cleaner than the previous headphones approach — no small-size
 * legibility issues, works in dark and light contexts, scales linearly.
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  variant: _v = "gilt",
  chord = true,
  pulse = true,
  className,
  "aria-label": ariaLabel = "50pick Help",
}: HelpMarkProps) {
  const id = useId().replace(/:/g, "");

  /* ---- Palette ---- */
  const indigo = "oklch(20% 0.090 268)";
  const gilt = "oklch(86% 0.13 80)";
  const giltPip = "oklch(85% 0.13 86)";
  const yes = chord ? "oklch(58% 0.16 152)" : "oklch(96% 0.005 268)";
  const no = chord ? "oklch(60% 0.18 22)" : "oklch(70% 0.020 268)";
  const divider = chord ? gilt : indigo;
  const numeral = chord ? "oklch(96% 0.005 268)" : indigo;

  /* ---- Geometry ---- */
  // Chat-bubble rounded-rect with a tail at bottom-right.
  // The brand coin is clipped inside the bubble body (no tail).
  const bubbleR = 20; // corner radius
  const coinR = 34;   // brand coin radius (fits inside 80×80 body)
  const coinCx = 50;
  const coinCy = 46;
  const tilt = -14;
  const rad = (tilt * Math.PI) / 180;
  const dx = Math.sin(rad) * (coinR * 1.6);
  const dy = Math.cos(rad) * (coinR * 1.6);
  const top = { x: coinCx + dx, y: coinCy - dy };
  const bot = { x: coinCx - dx, y: coinCy + dy };

  // Bubble body path (rounded rect) + tail
  const bubblePath = `
    M ${bubbleR} 4
    h ${100 - bubbleR * 2}
    a ${bubbleR} ${bubbleR} 0 0 1 ${bubbleR} ${bubbleR}
    v ${68 - bubbleR * 2}
    a ${bubbleR} ${bubbleR} 0 0 1 -${bubbleR} ${bubbleR}
    h -${22}
    l -8 14
    l -4 -14
    h -${100 - bubbleR * 2 - 34}
    a ${bubbleR} ${bubbleR} 0 0 1 -${bubbleR} -${bubbleR}
    v -${68 - bubbleR * 2}
    a ${bubbleR} ${bubbleR} 0 0 1 ${bubbleR} -${bubbleR}
    z
  `;

  return (
    <svg
      viewBox="0 0 100 90"
      width={size}
      height={size * 0.9}
      className={className}
      style={{ display: "block" }}
      aria-label={ariaLabel}
    >
      <defs>
        <clipPath id={`hm-body-${id}`}>
          <path d={bubblePath} />
        </clipPath>
        <clipPath id={`hm-coin-${id}`}>
          <circle cx={coinCx} cy={coinCy} r={coinR - 1} />
        </clipPath>
        <linearGradient id={`hm-bg-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(22% 0.110 268)" />
          <stop offset="100%" stopColor={indigo} />
        </linearGradient>
      </defs>

      {/* Breathing halo */}
      {pulse && (
        <rect
          x="-2" y="0" width="104" height="76" rx={bubbleR + 3}
          fill="none" stroke="oklch(86% 0.040 268)" strokeWidth={1}
          className="hm-halo-pulse"
        />
      )}

      {/* Bubble body — dark glass fill */}
      <path d={bubblePath} fill={`url(#hm-bg-${id})`} />
      <path d={bubblePath} fill="none" stroke="oklch(35% 0.080 268)" strokeWidth={1.2} />
      {chord && (
        <path d={bubblePath} fill="none" stroke={gilt} strokeWidth={0.4} opacity={0.3} />
      )}

      {/* Brand coin centered in bubble */}
      <g clipPath={`url(#hm-coin-${id})`}>
        <path
          d={`M ${top.x} ${top.y} A ${coinR} ${coinR} 0 0 0 ${bot.x} ${bot.y} L ${top.x} ${top.y} Z`}
          fill={yes}
        />
        <path
          d={`M ${top.x} ${top.y} A ${coinR} ${coinR} 0 0 1 ${bot.x} ${bot.y} L ${top.x} ${top.y} Z`}
          fill={no}
        />
        <line
          x1={top.x} y1={top.y} x2={bot.x} y2={bot.y}
          stroke={divider} strokeWidth={1.5} strokeLinecap="round"
        />
        <text
          x={coinCx} y={coinCy + 1.5}
          textAnchor="middle" dominantBaseline="middle"
          fontFamily="'JetBrains Mono', ui-monospace, monospace"
          fontWeight={700} fontSize={20} fill={numeral}
          style={{ letterSpacing: "-0.04em" }}
        >
          50
        </text>
        {chord && <circle cx={coinCx} cy={coinCy} r={1.2} fill={giltPip} />}
      </g>

      {/* Coin ring */}
      <circle cx={coinCx} cy={coinCy} r={coinR - 1} fill="none" stroke={indigo} strokeWidth={2} />
      {chord && (
        <circle cx={coinCx} cy={coinCy} r={coinR - 2} fill="none" stroke={gilt} strokeWidth={0.4} opacity={0.45} />
      )}
    </svg>
  );
}
