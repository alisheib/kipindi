"use client";

/**
 * TerminalChart — the Up & Down asset history chart in professional trading
 * form, built on TradingView lightweight-charts v5 (Apache-2.0, lazy-loaded
 * chunk). Ali's call, 2026-09-04: "search for the perfect library… harmonize
 * with our whole platform design and theme kit" — reversing the same-morning
 * zero-dep ruling; both dated in DESIGN-BASELINE §8. This is the ONLY file
 * that may import the library (chart-one-home §5.2/§5.3, static AND dynamic
 * forms), so every other chart stays the in-house SVG kit.
 *
 * ⚠️ THE TOKEN BRIDGE RESOLVES THROUGH A CANVAS, NOT BY STRING-PASSING. The
 * platform's tokens are oklch(), and the adversarial review EXECUTED the naive
 * version: lightweight-charts 5.2.1's color parser throws
 * "Failed to parse color: oklch(…)" synchronously in createChart — the board
 * would have died to its error boundary on every history range. So resolveInk()
 * paints each token onto a 1×1 canvas (the same engine that renders the chart)
 * and reads the pixel back as rgba(); alpha fills are computed NUMERICALLY from
 * those bytes — no color-mix() strings reach canvas gradients. A token that
 * fails to resolve paints rgba(0,0,0,0) and console.errors its own name: an
 * invisible series is the honest face of a token typo, and the screenshot pass
 * sees it. The tokens keep their one definition site (globals.css).
 *
 * ⚠️ A GAP IS EMPTY PIXELS, NOT A BRIDGE. The review also proved the library
 * CONNECTS an Area series straight across whitespace points — so the client
 * SPLITS the line into one series per contiguous run and the pane shows real
 * holes; candle mode feeds the server's dropped buckets as whitespace so an
 * outage keeps its width instead of candles closing ranks (F18/F19).
 *
 * Viewport discipline: fitContent runs once per (range, mode) — a 30s poll
 * must never yank the pan/zoom out of a player's hands (F2). A failed poll
 * KEEPS the drawn chart and retries; the "no reads" claim renders only on a
 * VERIFIED empty success, a network failure says so instead (F3/F22). Fetches
 * carry an AbortController and a sequence guard so a slow response can never
 * overwrite a fresher one (F4/F14). Kinetic scroll momentum is disabled under
 * prefers-reduced-motion — canvas animation is outside the three CSS gates
 * (F31). Axis/crosshair times are shifted to the device's wall clock (the
 * library renders raw UTC otherwise, three hours behind Tanzania — F21); the
 * receipt footer keeps the platform's EAT grammar (fmtEAT), same as the card.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import type { IChartApi, ISeriesApi, IPriceLine, UTCTimestamp } from "lightweight-charts";
import { fmtEAT } from "@/lib/updown-source-label";

export type TerminalRange = "30M" | "1H" | "4H" | "1D";
type LinePoint = { t: number; price: number | null };
type Candle = { t: number; o: number; h: number; l: number; c: number; n: number; forming?: boolean };
type Feed = {
  series:
    | { mode: "line"; points: LinePoint[] }
    | { mode: "candles"; candles: Candle[]; bucketMs: number; gaps: number[] };
  livePrice: number | null;
  sourceQuotedAt: string | null;
  liveStale: boolean | null;
  medianDeltaMs: number | null;
  decimals: number;
};

/** Paint a token through the engine's own parser and read back sRGB bytes. */
function makeInkResolver(): (name: string, alpha?: number) => string {
  const canvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
  if (canvas) { canvas.width = 1; canvas.height = 1; }
  const ctx = canvas?.getContext("2d", { willReadFrequently: true }) ?? null;
  const cache = new Map<string, [number, number, number, number]>();
  return (name: string, alpha?: number) => {
    if (!ctx) return "rgba(0,0,0,0)";
    let rgba = cache.get(name);
    if (!rgba) {
      const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = "#000";
      ctx.fillStyle = raw || "#000";
      ctx.fillRect(0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data;
      rgba = [d[0], d[1], d[2], d[3] / 255];
      if (!raw) {
        console.error(`[terminal-chart] token ${name} is empty — painting transparent`);
        rgba = [0, 0, 0, 0];
      }
      cache.set(name, rgba);
    }
    const a = alpha != null ? rgba[3] * alpha : rgba[3];
    return `rgba(${rgba[0]},${rgba[1]},${rgba[2]},${a.toFixed(3)})`;
  };
}

/** Non-color token read (font family, sizes). */
function tokRaw(name: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function TerminalChart({
  assetKey,
  range,
  height = 300,
  labels,
  pollMs = 30_000,
}: {
  assetKey: string;
  range: TerminalRange;
  height?: number;
  labels: {
    empty: string;
    loading: string;
    error: string;
    aria: string;
    /** Already-translated receipt parts — the card's own grammar (E-53/E-262). */
    sourceLabel: string;
    quotedWord: string;
  };
  pollMs?: number;
}) {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "empty" | "error">("loading");
  const [engineReady, setEngineReady] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const libRef = useRef<typeof import("lightweight-charts") | null>(null);
  const seriesListRef = useRef<Array<ISeriesApi<"Area"> | ISeriesApi<"Candlestick">>>([]);
  const priceLineRef = useRef<IPriceLine | null>(null);
  const fitKeyRef = useRef<string>("");
  const seqRef = useRef(0);

  // ── data: fetch the window; poll while visible; refresh on tab reveal ─────
  useEffect(() => {
    let alive = true;
    const ac = new AbortController();
    setFeed(null);
    setStatus("loading");
    const load = async () => {
      if (document.visibilityState === "hidden") return;
      const seq = ++seqRef.current;
      try {
        const r = await fetch(`/api/updown/history?asset=${encodeURIComponent(assetKey)}&range=${range}`, {
          cache: "no-store",
          signal: ac.signal,
        });
        if (!alive || seq !== seqRef.current) return; // a newer request owns the state
        if (!r.ok) { setStatus((s) => (s === "ok" ? "ok" : "error")); return; } // keep a drawn chart (F3)
        const data: Feed = await r.json();
        if (!alive || seq !== seqRef.current) return;
        const has = data.series.mode === "line" ? data.series.points.some((p) => p.price != null) : data.series.candles.length > 0;
        if (has) { setFeed(data); setStatus("ok"); }
        else { setFeed(null); setStatus("empty"); } // VERIFIED empty — the only path to the no-reads claim
      } catch {
        if (!alive || seq !== seqRef.current) return;
        setStatus((s) => (s === "ok" ? "ok" : "error"));
      }
    };
    load();
    const id = setInterval(load, pollMs);
    const onReveal = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onReveal);
    return () => { alive = false; ac.abort(); clearInterval(id); document.removeEventListener("visibilitychange", onReveal); };
  }, [assetKey, range, pollMs]);

  // ── the chart object — built once the library chunk arrives ──────────────
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
          // Axis type from the LADDER (canvas needs a number): the stylesheet's
          // --type-micro rung, parsed off the same token the CSS reads.
          fontSize: Math.round(parseFloat(tokRaw("--type-micro"))) || undefined,
          attributionLogo: false,
        },
        grid: {
          vertLines: { color: grid, style: lib.LineStyle.Dotted },
          horzLines: { color: grid, style: lib.LineStyle.Dotted },
        },
        rightPriceScale: { borderColor: ink("--border") },
        timeScale: { borderColor: ink("--border"), timeVisible: true, secondsVisible: false },
        crosshair: {
          mode: lib.CrosshairMode.Magnet,
          vertLine: { color: ink("--border-strong"), width: 1, style: lib.LineStyle.Dashed, labelBackgroundColor: ink("--bg-inset") },
          horzLine: { color: ink("--border-strong"), width: 1, style: lib.LineStyle.Dashed, labelBackgroundColor: ink("--bg-inset") },
        },
        // Touch: horizontal pan + pinch (the trading gestures); vertical drag
        // stays with the PAGE (`touch-action` discipline, the pchart's reason).
        // Kinetic momentum is a canvas animation outside the CSS reduced-motion
        // gates — disabled when the player asked for reduced motion (F31).
        handleScroll: { mouseWheel: false, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
        handleScale: { axisPressedMouseMove: false, mouseWheel: false, pinch: true },
        kineticScroll: { touch: !reduced, mouse: false },
      });
      chartRef.current = chart;
      ro = new ResizeObserver(() => chart.applyOptions({ width: el.clientWidth }));
      ro.observe(el);
      setEngineReady(true);
    })();
    return () => {
      disposed = true;
      ro?.disconnect();
      chartRef.current?.remove();
      chartRef.current = null;
      seriesListRef.current = [];
      priceLineRef.current = null;
      fitKeyRef.current = "";
      setEngineReady(false);
    };
  }, [height]);

  // ── draw — full series rebuild per feed; viewport fitted once per key ─────
  const draw = useCallback((data: Feed) => {
    const chart = chartRef.current;
    const lib = libRef.current;
    if (!chart || !lib) return;
    const ink = makeInkResolver();
    const yes = ink("--yes-400");
    const no = ink("--no-400");
    const priceFormat = { type: "price" as const, precision: data.decimals, minMove: 1 / 10 ** data.decimals };
    // The library renders raw UTC; shift to the device wall clock (F21).
    const tzShift = -new Date().getTimezoneOffset() * 60;
    const at = (ms: number) => ((Math.round(ms / 1000) + tzShift) as UTCTimestamp);

    for (const s of seriesListRef.current) chart.removeSeries(s);
    seriesListRef.current = [];
    priceLineRef.current = null;

    let lastSeries: ISeriesApi<"Area"> | ISeriesApi<"Candlestick"> | null = null;
    if (data.series.mode === "candles") {
      const s = chart.addSeries(lib.CandlestickSeries, {
        upColor: yes, downColor: no,
        borderUpColor: yes, borderDownColor: no,
        wickUpColor: yes, wickDownColor: no,
        priceFormat,
      });
      const formingUp = ink("--yes-400", 0.45);
      const formingDown = ink("--no-400", 0.45);
      const bars = [
        ...data.series.candles.map((c) => ({
          time: at(c.t), open: c.o, high: c.h, low: c.l, close: c.c,
          // The forming bucket is real reads still accumulating — drawn dimmer
          // so "now" is visible without claiming a finished period.
          ...(c.forming ? {
            color: c.c >= c.o ? formingUp : formingDown,
            borderColor: c.c >= c.o ? formingUp : formingDown,
            wickColor: c.c >= c.o ? formingUp : formingDown,
          } : {}),
        })),
        // Dropped/empty buckets keep their axis width — an outage stays visible
        // instead of candles closing ranks (F19).
        ...data.series.gaps.map((t) => ({ time: at(t) })),
      ].sort((a, b) => (a.time as number) - (b.time as number));
      s.setData(bars);
      seriesListRef.current.push(s);
      lastSeries = s;
    } else {
      // One Area series PER CONTIGUOUS RUN — the library bridges whitespace
      // inside a series, so a gap is honest only if the line actually ENDS
      // there (F18). The gap markers themselves ride on the FIRST series as
      // whitespace items: the time scale is index-spaced, so each missing grid
      // step must reserve its slot or the outage's width collapses to nothing
      // (the trading-terminal session-break idiom).
      const runs: LinePoint[][] = [[]];
      const gapTimes: number[] = [];
      for (const p of data.series.points) {
        if (p.price == null) { gapTimes.push(p.t); if (runs[runs.length - 1].length) runs.push([]); continue; }
        runs[runs.length - 1].push(p);
      }
      const liveRuns = runs.filter((r) => r.length > 0);
      liveRuns.forEach((run, idx) => {
        const s = chart.addSeries(lib.AreaSeries, {
          lineColor: yes,
          topColor: ink("--yes-400", 0.24),
          bottomColor: ink("--yes-400", 0.02),
          lineWidth: 2,
          priceFormat,
          // A one-read run must still paint — a lone marker, not nothing.
          pointMarkersVisible: run.length === 1,
          crosshairMarkerVisible: true,
          lastValueVisible: false,
          priceLineVisible: false,
        });
        const items: Array<{ time: UTCTimestamp; value?: number }> = run.map((p) => ({ time: at(p.t), value: p.price! }));
        if (idx === 0) for (const t of gapTimes) items.push({ time: at(t) });
        items.sort((a, b) => (a.time as number) - (b.time as number));
        s.setData(items);
        seriesListRef.current.push(s);
        lastSeries = s;
      });
      if (lastSeries) (lastSeries as ISeriesApi<"Area">).applyOptions({ lastValueVisible: true });
    }

    // The live price as ONE gilt reference line — hidden when the feed is
    // STALE, because a reference line from a dead feed wears a live market's
    // face (F20); the receipt footer still carries the quote's own time.
    if (lastSeries && data.livePrice != null && data.liveStale !== true) {
      priceLineRef.current = lastSeries.createPriceLine({
        price: data.livePrice,
        color: ink("--gilt"),
        lineWidth: 1,
        lineStyle: lib.LineStyle.Dashed,
        axisLabelVisible: true,
        title: "",
      });
    }

    // Fit ONCE per (range, mode); later polls must never yank the viewport
    // out of the player's hands (F2).
    const fitKey = `${range}:${data.series.mode}`;
    if (fitKeyRef.current !== fitKey) {
      chart.timeScale().fitContent();
      fitKeyRef.current = fitKey;
    }
  }, [range]);

  // The engine (async library chunk) and the first feed race freely; the draw
  // effect keys on BOTH, so whichever arrives second triggers the paint — a
  // state dependency, not a polling shim.
  useEffect(() => { if (feed && engineReady) draw(feed); }, [feed, engineReady, draw]);

  const receipt = feed?.sourceQuotedAt
    ? `${labels.sourceLabel} · ${labels.quotedWord} ${fmtEAT(feed.sourceQuotedAt)}`
    : labels.sourceLabel;

  return (
    <div>
      <div role="img" aria-label={labels.aria} className="relative" style={{ height }}>
        <div
          ref={wrapRef}
          className="absolute inset-0"
          style={{ opacity: feed ? 1 : 0, transition: "opacity var(--dur-arrive) var(--ease-glide)" }}
        />
        {!feed && (
          <div className="absolute inset-0 grid place-items-center">
            <span className="font-mono text-body-sm text-text-subtle">
              {status === "empty" ? labels.empty : status === "error" ? labels.error : labels.loading}
            </span>
          </div>
        )}
      </div>
      {feed && (
        <p className="mt-1 mb-0 text-right font-mono text-body-sm" style={{ color: feed.liveStale ? "var(--no-300)" : "var(--text-faint)" }}>
          {receipt}
        </p>
      )}
    </div>
  );
}
