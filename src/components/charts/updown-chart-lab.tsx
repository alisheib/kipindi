"use client";

/**
 * UpDownChartLab — the board chart view's range rail and body switch
 * (CHART-SPRINT-2, Ali: "history plus live … based on the filter they chose").
 *
 * ONE rail: ROUND · 30M · 1H · 4H · 1D.
 *  · ROUND — the current round's own frame (the server-rendered RoundChart
 *    arriving as a prop: open line, winning boundaries, countdown). It is the
 *    bet's context, it costs zero client JS, and it is the DEFAULT.
 *  · 30M/1H/4H/1D — the TradingView-engine TerminalChart over real confirmed
 *    reads (line, or cadence-derived honest candles on the long windows). The
 *    library chunk is dynamic-imported INSIDE TerminalChart, which only mounts
 *    once a history range is actually selected — cubes-mode and ROUND-view
 *    players load and poll nothing (review F1).
 *
 * The stored choice applies in an effect (SSR carries no per-device state);
 * `ready` gates the terminal mount so the first render after hydration cannot
 * fire a wasted default-range fetch that the stored range immediately aborts
 * (review F6). No live round → no ROUND option, default 1H.
 */
import { useEffect, useState } from "react";
import { TerminalChart, type TerminalRange } from "./terminal-chart";

const STORE_KEY = "kp-updown-range";
const HISTORY_RANGES: TerminalRange[] = ["30M", "1H", "4H", "1D"];
type LabRange = "ROUND" | TerminalRange;

export function UpDownChartLab({
  roundView,
  assetKey,
  labels,
}: {
  /** The server-rendered current-round chart, or null when no round is live. */
  roundView: React.ReactNode | null;
  assetKey: string;
  labels: {
    round: string;
    railAria: string;
    empty: string;
    loading: string;
    error: string;
    chartAria: string;
    sourceLabel: string;
    quotedWord: string;
  };
}) {
  const hasRound = roundView != null;
  const [range, setRange] = useState<LabRange>(hasRound ? "ROUND" : "1H");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORE_KEY) as LabRange | null;
      if (stored && (stored === "ROUND" ? hasRound : (HISTORY_RANGES as string[]).includes(stored))) {
        setRange(stored);
      }
    } catch { /* blocked storage → default stands */ }
    setReady(true);
  }, [hasRound]);

  const pick = (r: LabRange) => {
    setRange(r);
    try { window.localStorage.setItem(STORE_KEY, r); } catch { /* per-device nicety */ }
  };

  const active: LabRange = range === "ROUND" && !hasRound ? "1H" : range;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="pchart-ranges" role="group" aria-label={labels.railAria}>
          {hasRound && (
            <button type="button" aria-pressed={active === "ROUND"} className={"pchart-range" + (active === "ROUND" ? " is-active" : "")} onClick={() => pick("ROUND")}>
              {labels.round}
            </button>
          )}
          {HISTORY_RANGES.map((r) => (
            <button key={r} type="button" aria-pressed={active === r} className={"pchart-range" + (active === r ? " is-active" : "")} onClick={() => pick(r)}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {active === "ROUND" ? (
        roundView
      ) : (
        <section
          aria-label={labels.chartAria}
          className="px-3 pt-2 pb-1.5"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", boxShadow: "var(--shadow-card)", minWidth: 0 }}
        >
          {ready ? (
            <TerminalChart
              assetKey={assetKey}
              range={active as TerminalRange}
              labels={{
                empty: labels.empty,
                loading: labels.loading,
                error: labels.error,
                aria: labels.chartAria,
                sourceLabel: labels.sourceLabel,
                quotedWord: labels.quotedWord,
              }}
            />
          ) : (
            <div className="grid place-items-center" style={{ height: 300 }}>
              <span className="font-mono text-body-sm text-text-subtle">{labels.loading}</span>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
