"use client";

/**
 * Live ticker — 32px strip with infinite horizontal marquee.
 * Kit tokens (bg-inset, border, live-400, mono) + horizontal scroll.
 */

import { useState } from "react";

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


function Items({ events, prefix }: { events: TickerEvent[]; prefix: string }) {
  return (
    <>
      {events.map((ev) => {
        const amt = ev.amount && ev.amount > 0 ? `TZS ${fmtAmt(ev.amount)} ` : "";
        const verb = ev.kind === "bet" ? "predicted" : ev.kind === "win" ? "won on" : ev.kind === "resolve" ? "settled" : "";
        return (
          <span key={`${prefix}-${ev.id}`} className="inline-flex items-center gap-1.5 shrink-0 font-mono" style={{ paddingRight: 32, fontSize: 12, whiteSpace: "nowrap" }}>
            <span style={{ color: "var(--text-muted)" }}>{amt}{verb} </span>
            {ev.side && (
              <span style={{ fontWeight: 700, color: ev.side === "YES" ? "var(--yes-400)" : "var(--no-400)" }}>{ev.side}</span>
            )}
            <span style={{ color: "var(--text-muted)" }}> on {ev.marketTitle}</span>
            <span style={{ width: 2.5, height: 2.5, borderRadius: "50%", background: "var(--gilt)", opacity: 0.35, flexShrink: 0, marginLeft: 8 }} />
          </span>
        );
      })}
    </>
  );
}

export function LiveTicker({ events }: { events: TickerEvent[] }) {
  const [paused, setPaused] = useState(false);

  if (events.length === 0) return null;

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{
        height: 32,
        background: "var(--bg-inset)",
        borderBottom: "1px solid var(--border)",
        overflow: "hidden",
        position: "relative",
        userSelect: "none",
      }}
    >
      {/* Fixed LIVE label */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, zIndex: 10,
        display: "flex", alignItems: "center", paddingLeft: 16, paddingRight: 32,
        background: "linear-gradient(90deg, var(--bg-inset) 60%, oklch(11% 0.11 268 / 0) 100%)",
      }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span className="live-dot" style={{ width: 6, height: 6 }} />
          <span className="font-mono" style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--live-400)" }}>
            LIVE
          </span>
        </span>
      </div>

      {/* Right fade */}
      <div style={{
        position: "absolute", right: 0, top: 0, bottom: 0, width: 48, zIndex: 10, pointerEvents: "none",
        background: "linear-gradient(270deg, var(--bg-inset), oklch(11% 0.11 268 / 0))",
      }} />

      {/* Horizontal marquee */}
      <div className="ticker-track" style={{ paddingLeft: 80, animationPlayState: paused ? "paused" : "running" }}>
        <Items events={events} prefix="a" />
        <Items events={events} prefix="b" />
      </div>
    </div>
  );
}
