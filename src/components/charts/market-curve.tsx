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
 * platform-locale time. No vendor attribution renders anywhere — the owner's
 * explicit, informed decision, recorded in §B12.6.
 */
import { useEffect, useRef, useState } from "react";
import type { IChartApi, ISeriesApi, UTCTimestamp } from "lightweight-charts";
import { makeInkResolver, tokRaw } from "./ink-bridge";
import { ascUnique, timeGridFill } from "./chart-series";

export type CurvePoint = { t: string; ts: number; p: number };

/**
 * D46 · how many axis slots the time grid may use. Paired with `minBarSpacing: 0.05` below:
 * 2,000 slots need 210 / 2000 = 0.105px each, and the floor allows 0.05, so `fitContent()` can
 * always show the WHOLE window. ⛔ Raising this without lowering `minBarSpacing` silently clamps
 * the view to a slice of the market's history. `test:time-axis` §7 asserts the pair.
 */
export const MAX_TIME_SLOTS = 2000;
/**
 * The narrowest plot this has to fit. **MEASURED, not estimated** — the chart canvas is
 * 190x212 at a 320 viewport, 246 at 360 and 282 at 412 (local render, 2026-09-25). A 210px
 * estimate was in this slot first and was 10% optimistic; the budget in `test:time-axis` §7 is
 * only meaningful if this number is the real one.
 */
export const MIN_PLOT_PX = 190;
/** The library floor set on the time scale below. */
export const MIN_BAR_SPACING = 0.05;

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
          // §B12.6: NO vendor attribution anywhere — the owner's explicit,
          // informed decision (the README's attribution request was flagged by
          // the judge panel and expressly declined by Ali, 2026-09-04).
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
        timeScale: {
          borderColor: ink("--border"), timeVisible: true, secondsVisible: false,
          fixRightEdge: true, fixLeftEdge: true, lockVisibleTimeRangeOnResize: true,
          // 🔴 D46 · `minBarSpacing` IS PART OF THE FIX, NOT A TUNING KNOB, AND LEAVING IT AT THE
          //    DEFAULT WOULD HAVE TURNED ONE DEFECT INTO A WORSE ONE. The time-grid fill
          //    (`timeGridFill`) reserves a slot per grid step so a two-day gap stops drawing the
          //    same width as a one-day gap. But the library's default floor is **0.5px per slot**,
          //    and the plot is **190px wide at a 320 viewport** — measured, 2026-09-25, not the
          //    210px first estimated here. At 0.5px that is a ceiling of ~380 slots, so
          //    `fitContent()` on a 2,000-slot series would clamp and show the player ROUGHLY A
          //    TENTH OF THEIR MARKET'S HISTORY while looking perfectly normal.
          //    0.05px per slot gives 190 / 0.05 = 3,800 — comfortably above `MAX_TIME_SLOTS`
          //    (2,000), which is why the two numbers are stated together and why
          //    `test:time-axis` §7 asserts the budget rather than trusting this comment.
          minBarSpacing: 0.05,
          // The library's day-boundary tick leaks a bare day number (the
          // terminal's fix, applied here too): market windows span days, so the
          // boundary names its DAY in the platform locale over the already
          // wall-clock-shifted instant.
          tickMarkFormatter: (t: number, type: number) =>
            type === 2
              ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" }).format((t as number) * 1000)
              : null,
        },
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
    // ⛔ `ascUnique` — this site never sorted at all, and `Math.round(ts / 1000)` collapses
    //    two points inside one second onto one axis slot. A tie throws out of the effect and
    //    takes the whole route with it (chart-series.ts records the incident).
    // 🔴 D46 · `timeGridFill` — and this site drew a DATE axis that was not a TIME axis. The
    //    engine's time scale is ORDINAL: one slot per item, one uniform `barSpacing`. So under
    //    calendar labels a two-day interval and a one-day interval were both 153px (critics
    //    panel, measured), and the slope misstated the rate of change on the page where a player
    //    is about to stake. The fill reserves the missing width with the library's own whitespace
    //    items, which carry no reading — never an interpolated probability, because this
    //    component's own rule is "Real data or nothing (A-5)" and a drawn value between two bets
    //    is a measurement nobody took.
    //    ⚠️ ORDER IS LOAD-BEARING: fill first, then `ascUnique`, whose tie rule keeps a real
    //    reading over a whitespace marker on the same second. Reversed, a gap marker could erase
    //    a price the platform read.
    const filled = timeGridFill(
      pts.map((p) => ({ time: (Math.round(p.ts / 1000) + tzShift) as UTCTimestamp, value: p.p })),
      { maxSlots: MAX_TIME_SLOTS },
    ) as Array<{ time: UTCTimestamp; value?: number }>;
    s.setData(ascUnique(filled) as Parameters<typeof s.setData>[0]);
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
      {/* No vendor attribution by the owner's explicit, informed decision —
          §B12.6 records it (the library README's attribution request was
          reviewed and declined by Ali, 2026-09-04). */}
    </div>
  );
}
