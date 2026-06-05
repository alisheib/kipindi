"use client";

/**
 * Live ticker — kit-faithful (ds-brand-nav.jsx LiveTicker).
 * 32px strip, vertical cycling animation (tickerUp 2.8s), clean mono text.
 */

import { useState, useEffect } from "react";

export type TickerEvent = {
  id: string;
  kind: "bet" | "win" | "resolve" | "milestone";
  side?: "YES" | "NO";
  marketTitle: string;
  amount?: number;
  timeAgo: string;
};

function fmtAmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return n.toLocaleString();
}

function formatEvent(ev: TickerEvent): string {
  const amt = ev.amount && ev.amount > 0 ? `TZS ${fmtAmt(ev.amount)} ` : "";
  const side = ev.side ? `${ev.side} ` : "";
  const verb =
    ev.kind === "bet" ? "predicted"
    : ev.kind === "win" ? "won on"
    : ev.kind === "resolve" ? "settled"
    : "";
  return `${amt}${verb} ${side}on ${ev.marketTitle}`.trim();
}

export function LiveTicker({ events }: { events: TickerEvent[] }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (events.length === 0) return;
    const t = setInterval(() => setIdx((x) => (x + 1) % events.length), 2800);
    return () => clearInterval(t);
  }, [events.length]);

  if (events.length === 0) return null;

  return (
    <div
      style={{
        height: 32,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "0 20px",
        background: "var(--bg-inset)",
        borderBottom: "1px solid var(--border)",
        overflow: "hidden",
      }}
    >
      {/* LIVE label */}
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "var(--font-mono)",
          fontVariantNumeric: "tabular-nums",
          fontSize: 10.5,
          fontWeight: 600,
          letterSpacing: "0.1em",
          color: "var(--live-400)",
          flexShrink: 0,
        }}
      >
        <span className="live-dot" style={{ width: 6, height: 6 }} />
        LIVE
      </span>

      {/* Vertical cycling ticker — kit tickerUp 2.8s */}
      <div style={{ position: "relative", flex: 1, height: 16, overflow: "hidden" }}>
        <div
          key={idx}
          style={{
            position: "absolute",
            fontFamily: "var(--font-mono)",
            fontVariantNumeric: "tabular-nums",
            fontSize: 12,
            color: "var(--text-muted)",
            whiteSpace: "nowrap",
            animation: "tickerUp 2.8s ease-in-out",
          }}
        >
          {formatEvent(events[idx])}
        </div>
      </div>
    </div>
  );
}
