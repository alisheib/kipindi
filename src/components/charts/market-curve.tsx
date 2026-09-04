"use client";

/**
 * MarketCurve — the market (poll) probability chart on the TradingView engine
 * (CHART-SPRINT-2 final; Ali, 2026-09-04 evening: "wherever we have charts, if
 * candlesticks are not applicable — for example for normal polls markets —
 * use the TradingView curve, it's more professional, with the right
 * enhancements"). It REPLACES the hand-rolled `ProbabilityChart` svg (deleted;
 * git history holds it) and keeps its exact semantic grammar:
 *
 *  · the GILT 50-line is the tipping reference (§B12.2 reference ink),
 *  · a Baseline series anchored at 50: emerald above (YES-favoured), rose
 *    below (NO-favoured) — the signature half-plane language, now with the
 *    engine's crosshair, kinetic pan and crisp canvas,
 *  · the range rail (1D/1W/1M/ALL) on the one `.pchart-range` vocabulary,
 *  · candles deliberately DO NOT EXIST here: probability snapshots are
 *    event-driven bets, not market bars — the curve IS the honest form.
 *
 * Real data or nothing (A-5): the server sends only ranges holding ≥2 real
 * snapshots; this component draws exactly those. Times are wall-clock shifted
 * (the engine renders raw UTC otherwise); crosshair shows the YES% and the
 * platform-locale time. The TradingView credit in the footer satisfies the
 * library license wherever the pane logo is off (§B12.6 — ONE ruling, both
 * halves).
 */
import { useEffect, useRef, useState } from "react";
import type { IChartApi, ISeriesApi, UTCTimestamp } from "lightweight-charts";
import { makeInkResolver, tokRaw } from "./ink-bridge";

export type CurvePoint = { t: string; ts: number; p: number };

export function MarketCurve({
  series,
  ranges,
  defaultRange,
  height = 240,
  locale,
  labels,
}: {
  series: Record<string, CurvePoint[]>;
  ranges: string[];
  defaultRange?: string;
  height?: number;
  locale: string;
  labels: { rangeAria: string; chartAria: string };
}) {
  const [range, setRange] = useState(defaultRange || ranges[ranges.length - 1] || "ALL");
  const [engineReady, setEngineReady] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const libRef = useRef<typeof import("lightweight-charts") | null>(null);
  const seriesRef = useRef<ISeriesApi<"Baseline"> | null>(null);
  const fitKeyRef = useRef("");

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let disposed = false;
    let ro: ResizeObserver | null = null;
    (async () => {
      const lib = libRef.current ?? (libRef.current = await import("lightweight-charts"));
      if (disposed || !wrapRef.current) return;
      const ink = makeInkResolver();
      const grid = ink("--border", 0.5);
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const chart = lib.createChart(el, {
        width: el.clientWidth,
        height,
        layout: {
          background: { type: lib.ColorType.Solid, color: "transparent" },
          textColor: ink("--text-subtle"),
          fontFamily: tokRaw("--font-mono"),
          fontSize: Math.round(parseFloat(tokRaw("--type-micro"))) || undefined,
          // §B12.6: the pane logo is OFF and the visible TradingView credit in
          // the footer stands in for it — removing that credit without
          // restoring the logo breaches the library license.
          attributionLogo: false,
        },
        grid: {
          vertLines: { color: grid, style: lib.LineStyle.Dotted },
          horzLines: { color: grid, style: lib.LineStyle.Dotted },
        },
        rightPriceScale: {
          borderColor: ink("--border"),
          entireTextOnly: true,
          scaleMargins: { top: 0.12, bottom: 0.12 },
        },
        timeScale: { borderColor: ink("--border"), timeVisible: true, secondsVisible: false, fixRightEdge: true, fixLeftEdge: true, lockVisibleTimeRangeOnResize: true },
        localization: { locale },
        crosshair: {
          mode: lib.CrosshairMode.Magnet,
          vertLine: { color: ink("--border-strong"), width: 1, style: lib.LineStyle.Dashed, labelBackgroundColor: ink("--bg-inset") },
          horzLine: { color: ink("--border-strong"), width: 1, style: lib.LineStyle.Dashed, labelBackgroundColor: ink("--bg-inset") },
        },
        handleScroll: { mouseWheel: false, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
        handleScale: { axisPressedMouseMove: false, mouseWheel: false, pinch: true },
        kineticScroll: { touch: !reduced, mouse: false },
      });
      const s = chart.addSeries(lib.BaselineSeries, {
        baseValue: { type: "price", price: 50 },
        topLineColor: ink("--yes-400"),
        topFillColor1: ink("--yes-400", 0.28),
        topFillColor2: ink("--yes-400", 0.03),
        bottomLineColor: ink("--no-400"),
        bottomFillColor1: ink("--no-400", 0.03),
        bottomFillColor2: ink("--no-400", 0.28),
        lineWidth: 2,
        priceFormat: { type: "custom", formatter: (v: number) => `${Math.round(v)}%`, minMove: 1 },
        priceLineVisible: false,
      });
      // The tipping reference — gilt, §B12.2's reference ink, the pchart's
      // signature carried into the engine.
      s.createPriceLine({ price: 50, color: ink("--gilt"), lineWidth: 1, lineStyle: lib.LineStyle.Dashed, axisLabelVisible: true, title: "" });
      chartRef.current = chart;
      seriesRef.current = s;
      ro = new ResizeObserver(() => chart.applyOptions({ width: el.clientWidth }));
      ro.observe(el);
      setEngineReady(true);
    })();
    return () => {
      disposed = true;
      ro?.disconnect();
      chartRef.current?.remove();
      chartRef.current = null;
      seriesRef.current = null;
      fitKeyRef.current = "";
      setEngineReady(false);
    };
  }, [height, locale]);

  useEffect(() => {
    const chart = chartRef.current, s = seriesRef.current;
    if (!chart || !s || !engineReady) return;
    const pts = series[range] ?? [];
    const tzShift = -new Date().getTimezoneOffset() * 60;
    s.setData(pts.map((p) => ({ time: (Math.round(p.ts / 1000) + tzShift) as UTCTimestamp, value: p.p })));
    if (fitKeyRef.current !== range) {
      chart.timeScale().fitContent();
      fitKeyRef.current = range;
    }
  }, [series, range, engineReady]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-end">
        {ranges.length > 1 && (
          <div className="pchart-ranges" role="group" aria-label={labels.rangeAria}>
            {ranges.map((rg) => (
              <button key={rg} type="button" aria-pressed={rg === range} className={"pchart-range" + (rg === range ? " is-active" : "")} onClick={() => setRange(rg)}>
                {rg}
              </button>
            ))}
          </div>
        )}
      </div>
      <div role="img" aria-label={labels.chartAria} className="relative" style={{ height }}>
        <div ref={wrapRef} className="absolute inset-0" />
      </div>
      <p className="mt-1 mb-0 text-right font-mono text-body-sm text-text-faint">
        {/* §B12.6 — the license's user-visible attribution, standing in for the
            pane logo. Removing it without restoring the logo breaches the
            library license. */}
        <a href="https://www.tradingview.com" target="_blank" rel="noopener noreferrer"
           className="underline underline-offset-2 hover:text-text-muted" style={{ color: "inherit" }}>
          TradingView
        </a>
      </p>
    </div>
  );
}
