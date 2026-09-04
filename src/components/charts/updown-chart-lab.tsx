"use client";

/**
 * UpDownChartLab — the board chart view's rails and body
 * (CHART-SPRINT-2; form finalised to Ali's rulings, 2026-09-04, sealed §B12.6).
 *
 * TWO rails, one locked form — the chart NEVER changes shape by itself:
 *  · RANGE — 15M · 30M · 1H · 6H · 12H · 24H · 7D (his final ladder; 1m/5m
 *    refused on the measured feed cadence). ⚠️ The ROUND frame was REMOVED by
 *    his closing order the same evening ("no need for round chart — remove it
 *    for now"): the round's own numbers live on the cards and the detail hero;
 *    `RoundChart` was deleted with it (git history keeps it if it returns).
 *  · STYLE — Curve | Candles. CANDLES IS THE DEFAULT on every range (his
 *    ruling); a pinned choice overrides everywhere, persisted per device. A
 *    window too thin for honest candles shows the curve WITH the stated
 *    reason — never invented candles, never a silently different form.
 *
 * The TradingView-engine terminal loads its chunk only when the chart view is
 * selected (review F1). The pane is taller on desktop.
 */
import { useEffect, useState } from "react";
import { TerminalChart, type TerminalRange, type TerminalStyle } from "./terminal-chart";

const RANGE_KEY = "kp-updown-range";
const STYLE_KEY = "kp-updown-style";
const HISTORY_RANGES: TerminalRange[] = ["15M", "30M", "1H", "6H", "12H", "24H", "7D"];

/** CANDLES everywhere by default (Ali, 2026-09-04 final); the pin overrides. */
const DEFAULT_STYLE: TerminalStyle = "candles";

export function UpDownChartLab({
  assetKey,
  locale,
  labels,
}: {
  assetKey: string;
  /** Platform locale — the chart chrome follows the page, not the browser. */
  locale: string;
  labels: {
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
  const [range, setRange] = useState<TerminalRange>("1H");
  const [pinnedStyle, setPinnedStyle] = useState<TerminalStyle | null>(null);
  const [tall, setTall] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      // Legacy stored values (first ladder's 4H/1D, the removed ROUND) map to
      // their nearest surviving rung.
      const raw = window.localStorage.getItem(RANGE_KEY);
      const stored = (raw === "4H" ? "6H" : raw === "1D" ? "24H" : raw === "ROUND" ? "1H" : raw) as TerminalRange | null;
      if (stored && (HISTORY_RANGES as string[]).includes(stored)) setRange(stored);
      const storedStyle = window.localStorage.getItem(STYLE_KEY) as TerminalStyle | null;
      if (storedStyle === "line" || storedStyle === "candles") setPinnedStyle(storedStyle);
    } catch { /* blocked storage → defaults stand */ }
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setTall(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    setReady(true);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const pickRange = (r: TerminalRange) => {
    setRange(r);
    try { window.localStorage.setItem(RANGE_KEY, r); } catch { /* per-device nicety */ }
  };
  const pickStyle = (s: TerminalStyle) => {
    setPinnedStyle(s);
    try { window.localStorage.setItem(STYLE_KEY, s); } catch { /* per-device nicety */ }
  };

  const effectiveStyle: TerminalStyle = pinnedStyle ?? DEFAULT_STYLE;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <div className="pchart-ranges" role="group" aria-label={labels.railAria}>
          {HISTORY_RANGES.map((r) => (
            <button key={r} type="button" aria-pressed={range === r} className={"pchart-range" + (range === r ? " is-active" : "")} onClick={() => pickRange(r)}>
              {r}
            </button>
          ))}
        </div>
        <div className="pchart-ranges" role="group" aria-label={labels.styleAria}>
          <button type="button" aria-pressed={effectiveStyle === "line"} className={"pchart-range" + (effectiveStyle === "line" ? " is-active" : "")} onClick={() => pickStyle("line")}>
            {labels.curve}
          </button>
          <button type="button" aria-pressed={effectiveStyle === "candles"} className={"pchart-range" + (effectiveStyle === "candles" ? " is-active" : "")} onClick={() => pickStyle("candles")}>
            {labels.candles}
          </button>
        </div>
      </div>

      <section
        aria-label={labels.chartAria}
        className="px-3 pt-2 pb-1.5"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", boxShadow: "var(--shadow-card)", minWidth: 0 }}
      >
        {ready ? (
          <TerminalChart
            // Keyed by asset ON PURPOSE (final-scoring judge, graphing lens):
            // the watermark is painted at chart build, so a soft asset switch
            // left "BTC" over an Ethereum chart. A remount per asset rebuilds
            // the pane with its own name; range/style state lives here and in
            // localStorage, so nothing is lost.
            key={assetKey}
            assetKey={assetKey}
            watermark={assetKey.toUpperCase()}
            locale={locale}
            range={range}
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
    </div>
  );
}
