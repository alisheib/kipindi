"use client";

/**
 * Live ticker — 32px strip with infinite horizontal marquee.
 * Kit tokens (bg-inset, border, live-400, mono) + horizontal scroll.
 */

import { useState } from "react";
import { useT } from "@/lib/i18n";
import { formatTzsCompact } from "@/lib/utils";

export type TickerEvent = {
  id: string;
  kind: "bet" | "win" | "resolve" | "milestone";
  side?: "YES" | "NO";
  marketTitle: string;
  amount?: number;
  timeAgo: string;
};

function Items({ events, prefix, verbs }: { events: TickerEvent[]; prefix: string; verbs: { predicted: string; wonOn: string; settled: string; on: string } }) {
  return (
    <>
      {events.map((ev) => {
        const amt = ev.amount && ev.amount > 0 ? `${formatTzsCompact(ev.amount)} ` : "";
        const verb = ev.kind === "bet" ? verbs.predicted : ev.kind === "win" ? verbs.wonOn : ev.kind === "resolve" ? verbs.settled : "";
        return (
          <span key={`${prefix}-${ev.id}`} className="inline-flex items-center gap-1.5 shrink-0 font-mono text-[12px] pr-8 whitespace-nowrap">
            <span className="text-text-muted">{amt}{verb} </span>
            {ev.side && (
              <span className={`font-bold ${ev.side === "YES" ? "text-yes-400" : "text-no-400"}`}>{ev.side}</span>
            )}
            <span className="text-text-muted"> {verbs.on} {ev.marketTitle}</span>
            <span className="inline-block w-[3px] h-[3px] rounded-full bg-gold-400 opacity-40 shrink-0 ml-2" />
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
        display: "flex",
        alignItems: "stretch",
      }}
    >
      {/* Fixed LIVE label.
          IN FLOW (flex item), not absolutely positioned over the track. It used to
          be absolute with the track carrying a hardcoded paddingLeft: 80 — but the
          label's width is LOCALE-DEPENDENT ("LIVE" / "MUBASHARA" / "直播"), so no
          single padding can clear it. In Swahili the marquee visibly scrolled
          underneath the label. Flex makes the track start wherever the label
          actually ends, in every locale, with no measurement. The gradient is now
          solid across the label and fades only in its trailing padding, so nothing
          is ever legible beneath the text. */}
      <div style={{
        flex: "0 0 auto", zIndex: 10,
        display: "flex", alignItems: "center", paddingLeft: 16, paddingRight: 24,
        background: "linear-gradient(90deg, var(--bg-inset) 0%, var(--bg-inset) 70%, oklch(11% 0.11 268 / 0) 100%)",
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

      {/* VIEWPORT — the clipping box. .ticker-track is the ANIMATED element
          (inline-flex, flex-shrink:0, translateX(-50%)), so it must stay free to
          overflow and translate; clipping has to happen on a wrapper, not on the
          track itself. Without this box the marquee rendered straight across the
          LIVE label and ate the first characters — in Swahili "MUBASHARA" and
          "TZS" collided into "MUBASHARAZS". The container's own overflow:hidden
          does not help: it clips at the window edge, not at the label. */}
      <div style={{ flex: "1 1 auto", minWidth: 0, overflow: "hidden", display: "flex", alignItems: "center" }}>
        <div className="ticker-track" style={{ animationPlayState: paused ? "paused" : "running" }}>
          <Items events={events} prefix="a" verbs={verbs} />
          <Items events={events} prefix="b" verbs={verbs} />
        </div>
      </div>
    </div>
  );
}
