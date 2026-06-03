"use client";

/**
 * Live ticker — 32px strip below the top bar showing recent platform activity.
 * Kit spec: "Live ticker (32px): pulsing red dot + rotating 'TZS X just
 * predicted YES on ...' copy." Uses CSS ticker-scroll animation for smooth
 * infinite marquee without JS timers.
 */

import { useEffect, useRef, useState } from "react";

export type TickerItem = {
  id: string;
  kind: "PREDICT" | "RESOLVE" | "DEPOSIT" | "WITHDRAW";
  text: string;
  amount?: number;
};

const KIND_LABEL: Record<TickerItem["kind"], { icon: string; color: string }> = {
  PREDICT:  { icon: "NEW BET",   color: "var(--yes-300)" },
  RESOLVE:  { icon: "RESOLVED",  color: "var(--gold-300)" },
  DEPOSIT:  { icon: "DEPOSIT",   color: "var(--aqua-200)" },
  WITHDRAW: { icon: "PAYOUT",    color: "var(--text-muted)" },
};

function fmtAmount(n: number): string {
  if (n >= 1_000_000) return `TZS ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `TZS ${(n / 1_000).toFixed(0)}K`;
  return `TZS ${n.toLocaleString()}`;
}

export function LiveTicker({ items }: { items: TickerItem[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  // Pause on hover for readability
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const enter = () => setPaused(true);
    const leave = () => setPaused(false);
    el.addEventListener("mouseenter", enter);
    el.addEventListener("mouseleave", leave);
    return () => { el.removeEventListener("mouseenter", enter); el.removeEventListener("mouseleave", leave); };
  }, []);

  if (items.length === 0) return null;

  // Double the items for seamless loop
  const doubled = [...items, ...items];

  return (
    <div
      ref={trackRef}
      className="relative overflow-hidden select-none"
      style={{
        height: 32,
        background: "oklch(14% 0.12 268)",
        borderBottom: "1px solid oklch(22% 0.10 268)",
      }}
    >
      <div
        className="flex items-center gap-10 whitespace-nowrap h-full"
        style={{
          animation: `ticker-scroll ${items.length * 6}s linear infinite`,
          animationPlayState: paused ? "paused" : "running",
          width: "max-content",
        }}
      >
        {doubled.map((item, i) => {
          const meta = KIND_LABEL[item.kind];
          return (
            <span key={`${item.id}-${i}`} className="inline-flex items-center gap-2.5 pr-4">
              {i % items.length === 0 && i === 0 && (
                <span className="inline-flex items-center gap-1.5 mr-2">
                  <span className="live-dot" style={{ width: 6, height: 6 }} />
                  <span
                    className="font-mono text-[9px] font-bold uppercase tracking-[0.18em]"
                    style={{ color: "oklch(72% 0.20 25)" }}
                  >
                    Live
                  </span>
                </span>
              )}
              <span
                className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] rounded-sm px-1 py-px"
                style={{
                  color: meta.color,
                  background: `color-mix(in oklab, ${meta.color} 12%, transparent)`,
                  border: `1px solid color-mix(in oklab, ${meta.color} 22%, transparent)`,
                }}
              >
                {meta.icon}
              </span>
              <span className="font-mono text-[11px] text-text-muted">
                {item.text}
              </span>
              {item.amount && (
                <span className="font-mono text-[11px] font-semibold tabular-nums" style={{ color: meta.color }}>
                  {fmtAmount(item.amount)}
                </span>
              )}
              <span style={{ width: 3, height: 3, borderRadius: "50%", background: "oklch(30% 0.06 268)" }} />
            </span>
          );
        })}
      </div>
    </div>
  );
}
