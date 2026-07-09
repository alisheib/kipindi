"use client";

/**
 * C2c — mini countdown-ring for open position cards. A depleting arc (aqua →
 * gold when < 1h) over the position's window (placed → deadline), with a compact
 * remaining label in the centre. Ticks client-side; seeded with the server's
 * `now` so SSR and first client render match (no hydration mismatch). The
 * depleting arc is a value, not decoration, so it needs no reduced-motion gate.
 */
import { useEffect, useState } from "react";

function compact(ms: number): string {
  if (ms <= 0) return "·";
  const d = Math.floor(ms / 86_400_000);
  if (d > 0) return `${d}d`;
  const h = Math.floor(ms / 3_600_000);
  if (h > 0) return `${h}h`;
  const m = Math.floor(ms / 60_000);
  return `${m}m`;
}

export function CountdownRing({
  deadlineIso,
  startIso,
  serverNow,
  size = 44,
  ariaLabel,
}: {
  deadlineIso: string;
  startIso: string;
  serverNow: number;
  size?: number;
  ariaLabel?: string;
}) {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  const deadline = Date.parse(deadlineIso);
  const start = Date.parse(startIso);
  const total = Math.max(1, deadline - start);
  const remaining = deadline - now;
  const frac = Math.max(0, Math.min(1, remaining / total));
  const closed = remaining <= 0;
  const urgent = !closed && remaining < 3_600_000;

  const sw = 3.5;
  const r = size / 2 - sw / 2 - 1;
  const c = 2 * Math.PI * r;
  const stroke = closed ? "var(--text-subtle)" : urgent ? "var(--gold-400)" : "var(--aqua-400)";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={ariaLabel ?? compact(remaining)} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-overlay)" strokeWidth={sw} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={stroke}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - frac)}
        style={{ transform: "rotate(-90deg)", transformOrigin: "center", transition: "stroke-dashoffset 0.5s linear" }}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        className="font-mono font-bold tabular-nums"
        style={{ fontSize: size * 0.28, fill: closed ? "var(--text-subtle)" : "var(--text)" }}
      >
        {compact(remaining)}
      </text>
    </svg>
  );
}
