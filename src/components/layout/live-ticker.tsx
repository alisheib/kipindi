"use client";

/**
 * Live ticker — kit-spec 34px strip with scrolling platform activity.
 * Uses pure CSS animation with duplicated content for seamless loop.
 */

import { useRef, useState } from "react";

export type TickerEvent = {
  id: string;
  kind: "bet" | "win" | "resolve" | "milestone";
  side?: "YES" | "NO";
  marketTitle: string;
  amount?: number;
  timeAgo: string;
};

const KIND_CONFIG: Record<TickerEvent["kind"], { label: string; color: string; bg: string; border: string }> = {
  bet:       { label: "BET",      color: "var(--aqua-200)",  bg: "var(--aqua-500)",  border: "var(--aqua-500)" },
  win:       { label: "WIN",      color: "var(--gold-200)",  bg: "var(--gold-500)",  border: "var(--gold-500)" },
  resolve:   { label: "SETTLED",  color: "var(--yes-200)",   bg: "var(--yes-500)",   border: "var(--yes-500)" },
  milestone: { label: "NEWS",     color: "var(--royal-200)", bg: "var(--royal-400)", border: "var(--royal-400)" },
};

function fmtAmount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return n.toLocaleString();
}

function TickerItem({ ev }: { ev: TickerEvent }) {
  const cfg = KIND_CONFIG[ev.kind];
  return (
    <span className="inline-flex items-center gap-2 mr-1 shrink-0">
      <span
        className="font-mono text-[8.5px] font-bold uppercase tracking-[0.12em] rounded-sm px-1.5 py-[1.5px] leading-none"
        style={{
          color: cfg.color,
          background: `color-mix(in oklab, ${cfg.bg} 14%, transparent)`,
          border: `1px solid color-mix(in oklab, ${cfg.border} 26%, transparent)`,
        }}
      >
        {cfg.label}
      </span>
      {ev.side && (
        <span
          className="font-mono text-[8.5px] font-bold tracking-[0.08em]"
          style={{ color: ev.side === "YES" ? "var(--yes-300)" : "var(--no-300)" }}
        >
          {ev.side}
        </span>
      )}
      <span
        className="font-display text-[11px] text-text-muted"
        style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }}
      >
        {ev.marketTitle}
      </span>
      {ev.amount != null && ev.amount > 0 && (
        <span className="font-mono text-[10.5px] font-semibold tabular-nums" style={{ color: cfg.color }}>
          TZS {fmtAmount(ev.amount)}
        </span>
      )}
      <span className="font-mono text-[9.5px] text-text-subtle tabular-nums">
        {ev.timeAgo}
      </span>
      <span
        className="inline-block mx-3 rounded-full shrink-0"
        style={{ width: 2.5, height: 2.5, background: "oklch(50% 0.10 80)", opacity: 0.5 }}
      />
    </span>
  );
}

export function LiveTicker({ events }: { events: TickerEvent[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  if (events.length === 0) return null;

  return (
    <div
      ref={wrapRef}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="relative overflow-hidden select-none"
      style={{
        height: 34,
        background: "linear-gradient(180deg, oklch(13% 0.11 268) 0%, oklch(15% 0.12 268) 100%)",
        borderBottom: "1px solid oklch(20% 0.09 268)",
      }}
    >
      {/* Anchored LIVE label */}
      <div
        className="absolute left-0 top-0 bottom-0 z-10 flex items-center pl-4 pr-8"
        style={{
          background: "linear-gradient(90deg, oklch(14% 0.11 268) 60%, oklch(14% 0.11 268 / 0) 100%)",
        }}
      >
        <span className="inline-flex items-center gap-1.5">
          <span className="live-dot" style={{ width: 7, height: 7 }} />
          <span
            className="font-display text-[10px] font-bold uppercase tracking-[0.22em]"
            style={{ color: "oklch(75% 0.24 25)" }}
          >
            Live
          </span>
        </span>
      </div>

      {/* Right edge fade */}
      <div
        className="absolute right-0 top-0 bottom-0 z-10 w-12 pointer-events-none"
        style={{
          background: "linear-gradient(270deg, oklch(14% 0.11 268) 0%, oklch(14% 0.11 268 / 0) 100%)",
        }}
      />

      {/* Scrolling track — two copies side by side, CSS translates -50% */}
      <div
        className="ticker-track flex items-center whitespace-nowrap h-full pl-20"
        style={{ animationPlayState: paused ? "paused" : "running" }}
      >
        {events.map((ev) => <TickerItem key={`a-${ev.id}`} ev={ev} />)}
        {events.map((ev) => <TickerItem key={`b-${ev.id}`} ev={ev} />)}
      </div>
    </div>
  );
}
