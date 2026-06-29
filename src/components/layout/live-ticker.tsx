"use client";

/**
 * Live ticker — 32px strip with infinite horizontal marquee.
 * Kit tokens (bg-inset, border, live-400, mono) + horizontal scroll.
 */

import { useState } from "react";
import { useT } from "@/lib/i18n";

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


function Items({ events, prefix, verbs }: { events: TickerEvent[]; prefix: string; verbs: { predicted: string; wonOn: string; settled: string; on: string } }) {
  return (
    <>
      {events.map((ev) => {
        const amt = ev.amount && ev.amount > 0 ? `TZS ${fmtAmt(ev.amount)} ` : "";
        const verb = ev.kind === "bet" ? verbs.predicted : ev.kind === "win" ? verbs.wonOn : ev.kind === "resolve" ? verbs.settled : "";
        return (
          <span key={`${prefix}-${ev.id}`} className="inline-flex items-center gap-1.5 shrink-0 font-mono text-[12px] pr-8 whitespace-nowrap">
            <span className="text-text-muted">{amt}{verb} </span>
            {ev.side && (
              <span className={`font-bold ${ev.side === "YES" ? "text-yes-400" : "text-no-400"}`}>{ev.side}</span>
            )}
            <span className="text-text-muted"> {verbs.on} {ev.marketTitle}</span>
            <span className="inline-block w-[2.5px] h-[2.5px] rounded-full bg-gold-300 opacity-35 shrink-0 ml-2" />
          </span>
        );
      })}
    </>
  );
}

export function LiveTicker({ events }: { events: TickerEvent[] }) {
  const [paused, setPaused] = useState(false);
  const { t } = useT();
  const verbs = {
    predicted: t.market.tickerPredicted,
    wonOn: t.market.tickerWonOn,
    settled: t.market.tickerSettled,
    on: t.market.tickerOn,
  };

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
          <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--live-400)]">
            {t.common.live}
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
        <Items events={events} prefix="a" verbs={verbs} />
        <Items events={events} prefix="b" verbs={verbs} />
      </div>
    </div>
  );
}
