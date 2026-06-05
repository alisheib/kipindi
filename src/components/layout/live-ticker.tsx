"use client";

/**
 * Live ticker — 34px strip with infinite scrolling platform activity.
 * Standard CSS marquee: two identical copies animate left continuously.
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

const CFG: Record<TickerEvent["kind"], { label: string; color: string; bg: string; border: string }> = {
  bet:       { label: "BET",     color: "var(--aqua-200)",  bg: "var(--aqua-500)",  border: "var(--aqua-500)" },
  win:       { label: "WIN",     color: "var(--gold-200)",  bg: "var(--gold-500)",  border: "var(--gold-500)" },
  resolve:   { label: "SETTLED", color: "var(--yes-200)",   bg: "var(--yes-500)",   border: "var(--yes-500)" },
  milestone: { label: "NEWS",    color: "var(--royal-200)", bg: "var(--royal-400)", border: "var(--royal-400)" },
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
        const c = CFG[ev.kind];
        return (
          <span key={`${prefix}-${ev.id}`} className="inline-flex items-center gap-2 shrink-0" style={{ paddingRight: 28 }}>
            <span
              className="font-mono font-bold uppercase rounded-sm leading-none"
              style={{
                fontSize: 10.5, letterSpacing: "0.10em", padding: "2px 5px",
                color: c.color,
                background: `color-mix(in oklab, ${c.bg} 14%, transparent)`,
                border: `1px solid color-mix(in oklab, ${c.border} 26%, transparent)`,
              }}
            >
              {c.label}
            </span>
            {ev.side && (
              <span className="font-mono font-bold" style={{ fontSize: 10.5, letterSpacing: "0.08em", color: ev.side === "YES" ? "var(--yes-300)" : "var(--no-300)" }}>
                {ev.side}
              </span>
            )}
            <span className="font-display" style={{ fontSize: 12, color: "var(--text-muted)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {ev.marketTitle}
            </span>
            {ev.amount != null && ev.amount > 0 && (
              <span className="font-mono font-semibold" style={{ fontSize: 10.5, color: c.color, fontVariantNumeric: "tabular-nums" }}>
                TZS {fmtAmt(ev.amount)}
              </span>
            )}
            <span className="font-mono" style={{ fontSize: 9.5, color: "var(--text-subtle)", fontVariantNumeric: "tabular-nums" }}>
              {ev.timeAgo}
            </span>
            <span style={{ width: 2.5, height: 2.5, borderRadius: "50%", background: "var(--gilt)", opacity: 0.35, flexShrink: 0 }} />
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
          <span className="live-dot" style={{ width: 7, height: 7 }} />
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

      {/* Marquee: ticker-track is the DIRECT child of the overflow container.
           No flex wrapper — flex parents blockify inline-flex children,
           preventing the track from expanding to content width. */}
      <div className="ticker-track" style={{ paddingLeft: 80, animationPlayState: paused ? "paused" : "running" }}>
        <Items events={events} prefix="a" />
        <Items events={events} prefix="b" />
      </div>
    </div>
  );
}
