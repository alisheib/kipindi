"use client";

/**
 * UpDownChartLab — the board chart view's rails and body switch
 * (CHART-SPRINT-2; form finalised to Ali's rulings, 2026-09-04).
 *
 * TWO rails, one locked form — the chart NEVER changes shape by itself:
 *  · RANGE — 15M · 30M · 1H · 6H · 12H · 24H · ROUND (ROUND deliberately LAST: the history
 *    windows read left→right small→large, and the round frame is its own kind,
 *    parked at the end — Ali's ordering).
 *  · STYLE — Curve | Candles, shown on history ranges only. The PLAYER owns
 *    the form: the effective style is always the one highlighted, and it only
 *    ever changes by their tap. Untouched, each range keeps its natural
 *    default (15M/30M/1H curve · 6H/12H/24H candles); one tap pins a style for every
 *    range, persisted per device. A window too thin for honest candles shows
 *    the curve WITH the stated reason — never invented candles, never a
 *    silently different form (the "sometimes candles, sometimes curves"
 *    confusion this rail exists to end).
 *
 * ROUND = the server-rendered round frame (zero client JS, targets + open +
 * the lock-then-close clock). History = the TradingView-engine terminal; its
 * chunk loads only when a history range is first selected (review F1).
 * The pane is taller on desktop (the frame follows the screen, not one size).
 */
import { useEffect, useState } from "react";
import { TerminalChart, type TerminalRange, type TerminalStyle } from "./terminal-chart";

const RANGE_KEY = "kp-updown-range";
const STYLE_KEY = "kp-updown-style";
const HISTORY_RANGES: TerminalRange[] = ["15M", "30M", "1H", "6H", "12H", "24H"];
type LabRange = "ROUND" | TerminalRange;

/** Each range's natural default form — overridden the moment the player pins one. */
const DEFAULT_STYLE: Record<TerminalRange, TerminalStyle> = {
  "15M": "line", "30M": "line", "1H": "line", "6H": "candles", "12H": "candles", "24H": "candles",
};

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
    styleAria: string;
    curve: string;
    candles: string;
    noCandles: string;
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
  const [pinnedStyle, setPinnedStyle] = useState<TerminalStyle | null>(null);
  const [tall, setTall] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      // Legacy stored ranges from the first ladder map to their nearest rung.
      const rawRange = window.localStorage.getItem(RANGE_KEY);
      const storedRange = (rawRange === "4H" ? "6H" : rawRange === "1D" ? "24H" : rawRange) as LabRange | null;
      if (storedRange && (storedRange === "ROUND" ? hasRound : (HISTORY_RANGES as string[]).includes(storedRange))) {
        setRange(storedRange);
      }
      const storedStyle = window.localStorage.getItem(STYLE_KEY) as TerminalStyle | null;
      if (storedStyle === "line" || storedStyle === "candles") setPinnedStyle(storedStyle);
    } catch { /* blocked storage → defaults stand */ }
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setTall(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    setReady(true);
    return () => mq.removeEventListener("change", apply);
  }, [hasRound]);

  const pickRange = (r: LabRange) => {
    setRange(r);
    try { window.localStorage.setItem(RANGE_KEY, r); } catch { /* per-device nicety */ }
  };
  const pickStyle = (s: TerminalStyle) => {
    setPinnedStyle(s);
    try { window.localStorage.setItem(STYLE_KEY, s); } catch { /* per-device nicety */ }
  };

  const active: LabRange = range === "ROUND" && !hasRound ? "1H" : range;
  const isHistory = active !== "ROUND";
  const effectiveStyle: TerminalStyle = isHistory
    ? (pinnedStyle ?? DEFAULT_STYLE[active as TerminalRange])
    : "line";

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <div className="pchart-ranges" role="group" aria-label={labels.railAria}>
          {HISTORY_RANGES.map((r) => (
            <button key={r} type="button" aria-pressed={active === r} className={"pchart-range" + (active === r ? " is-active" : "")} onClick={() => pickRange(r)}>
              {r}
            </button>
          ))}
          {hasRound && (
            <button type="button" aria-pressed={active === "ROUND"} className={"pchart-range" + (active === "ROUND" ? " is-active" : "")} onClick={() => pickRange("ROUND")}>
              {labels.round}
            </button>
          )}
        </div>
        {isHistory && (
          <div className="pchart-ranges" role="group" aria-label={labels.styleAria}>
            <button type="button" aria-pressed={effectiveStyle === "line"} className={"pchart-range" + (effectiveStyle === "line" ? " is-active" : "")} onClick={() => pickStyle("line")}>
              {labels.curve}
            </button>
            <button type="button" aria-pressed={effectiveStyle === "candles"} className={"pchart-range" + (effectiveStyle === "candles" ? " is-active" : "")} onClick={() => pickStyle("candles")}>
              {labels.candles}
            </button>
          </div>
        )}
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
              style={effectiveStyle}
              height={tall ? 380 : 300}
              labels={{
                empty: labels.empty,
                loading: labels.loading,
                error: labels.error,
                aria: labels.chartAria,
                sourceLabel: labels.sourceLabel,
                quotedWord: labels.quotedWord,
                noCandles: labels.noCandles,
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
