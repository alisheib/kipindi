"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { MapigoCall } from "@/lib/mapigo-data";

type Anchor = {
  /** index in the visible buffer (0..points-1) */
  position: number;
  call: MapigoCall;
  status: "active" | "won" | "lost";
};

/**
 * The signature waveform — gold pulse on dark canvas.
 * Renders an SVG path with grid, round-band overlay, anchors, and spike halos.
 * Self-animating via CSS — no per-frame redraw needed for static screenshot fidelity.
 */
export function MapigoWaveform({
  data,
  width = 1200,
  height = 280,
  roundProgress = 0.4, // 0..1 — how much of current 60s round has elapsed
  anchors = [],
  className,
}: {
  data: number[];
  width?: number;
  height?: number;
  roundProgress?: number;
  anchors?: Anchor[];
  className?: string;
}) {
  const padTop = 16;
  const padBot = 24;
  const usable = height - padTop - padBot;

  const { path, area, points, spikes } = useMemo(() => {
    if (!data.length) return { path: "", area: "", points: [] as [number, number][], spikes: [] as [number, number][] };
    const min = 0;
    const max = 100;
    const range = max - min;
    const pts: [number, number][] = data.map((v, i) => [
      (i / (data.length - 1)) * width,
      padTop + (1 - (v - min) / range) * usable,
    ]);
    const sps: [number, number][] = data
      .map((v, i): [number, number] | null => (v >= 75 ? pts[i] : null))
      .filter((x): x is [number, number] => x !== null);
    const p = pts.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt[0].toFixed(1)} ${pt[1].toFixed(1)}`).join(" ");
    const a = `${p} L ${width} ${height} L 0 ${height} Z`;
    return { path: p, area: a, points: pts, spikes: sps };
  }, [data, width, height, usable]);

  const last = points[points.length - 1];
  const roundBandWidth = roundProgress * (width / 5); // round occupies 1/5 of the visible 5-min ribbon
  const roundBandX = width - roundBandWidth;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      className={cn("block", className)}
      aria-label="Match intensity pulse"
    >
      <defs>
        <linearGradient id="kp-mapigo-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#DEBC54" stopOpacity={0.42} />
          <stop offset="60%" stopColor="#B58A21" stopOpacity={0.10} />
          <stop offset="100%" stopColor="#B58A21" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="kp-mapigo-stroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#946D17" />
          <stop offset="50%"  stopColor="#DEBC54" />
          <stop offset="100%" stopColor="#F4EAC9" />
        </linearGradient>
        <radialGradient id="kp-mapigo-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%"  stopColor="#DEBC54" stopOpacity={0.55} />
          <stop offset="60%" stopColor="#B58A21" stopOpacity={0.18} />
          <stop offset="100%" stopColor="#B58A21" stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* starfield + grid */}
      <rect width={width} height={height} fill="transparent" />
      {Array.from({ length: 60 }).map((_, i) => {
        const x = ((i * 37) % 100) * (width / 100);
        const y = ((i * 71) % 100) * (height / 100);
        const r = 0.6 + ((i * 13) % 5) * 0.2;
        return <circle key={i} cx={x} cy={y} r={r} fill="#DEBC54" opacity={0.18} />;
      })}
      {[0.25, 0.5, 0.75].map((p) => (
        <line key={p} x1={0} x2={width} y1={padTop + p * usable} y2={padTop + p * usable} stroke="#1E3E94" strokeWidth={0.5} strokeDasharray="2 6" opacity={0.6} />
      ))}

      {/* round band — gold translucent overlay over current 60s */}
      <rect x={roundBandX} y={0} width={roundBandWidth} height={height} fill="#DEBC54" opacity={0.06} />
      <line x1={roundBandX} x2={roundBandX} y1={0} y2={height} stroke="#DEBC54" strokeWidth={1} strokeDasharray="2 4" opacity={0.6} />

      {/* spike halos */}
      {spikes.map(([x, y], i) => (
        <circle key={`h-${i}`} cx={x} cy={y} r={28} fill="url(#kp-mapigo-halo)" />
      ))}

      {/* area + line */}
      <path d={area} fill="url(#kp-mapigo-fill)" />
      <path d={path} stroke="url(#kp-mapigo-stroke)" strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />

      {/* anchors */}
      {anchors.map((a, i) => {
        if (a.position >= points.length) return null;
        const [ax, ay] = points[a.position];
        const tone = a.status === "won" ? "#DEBC54" : a.status === "lost" ? "#525B70" : "#FFFFFF";
        return (
          <g key={`a-${i}`} transform={`translate(${ax} ${ay})`}>
            <rect x={-4} y={-4} width={8} height={8} transform="rotate(45)" fill={tone} stroke="#0A1838" strokeWidth={1} />
          </g>
        );
      })}

      {/* current beat dot at the right */}
      {last && (
        <>
          <circle cx={last[0]} cy={last[1]} r={10} fill="#DEBC54" opacity={0.18} />
          <circle cx={last[0]} cy={last[1]} r={4.5} fill="#DEBC54" stroke="#0A1838" strokeWidth={1} />
        </>
      )}

      {/* x-axis labels */}
      <g fill="#6F798F" fontSize={10} fontFamily="JetBrains Mono, monospace" opacity={0.7}>
        <text x={4}        y={height - 6}>−5 min</text>
        <text x={width / 5}     y={height - 6}>−4</text>
        <text x={(width / 5) * 2} y={height - 6}>−3</text>
        <text x={(width / 5) * 3} y={height - 6}>−2</text>
        <text x={(width / 5) * 4} y={height - 6}>−1</text>
        <text x={width - 30}  y={height - 6} textAnchor="end" fill="#DEBC54">live</text>
      </g>
    </svg>
  );
}
