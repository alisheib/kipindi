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
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import type { IChartApi, ISeriesApi, IPriceLine, UTCTimestamp } from "lightweight-charts";
import { fmtEAT, fmtEATClock } from "@/lib/updown-source-label";
import { usd } from "@/lib/usd-price";
import { makeInkResolver, tokRaw } from "./ink-bridge";
import { ascUnique } from "./chart-series";
import { maskConflictingVendorOpens, type ConfirmedPricePin } from "@/lib/updown-vendor-opens";

export type TerminalRange = "15M" | "30M" | "1H" | "6H" | "12H" | "24H" | "7D";
export type TerminalStyle = "line" | "candles";
type LinePoint = { t: number; price: number | null };
type Candle = { t: number; o: number; h: number; l: number; c: number; n?: number; v?: number | null; forming?: boolean };
/** How long the pane may say "loading" for one request: the route's vendor read aborts at 8s; 12s leaves its own reads. */
export const HISTORY_DEADLINE_MS = 12_000;

type Feed = {
  sourceTier: "vendor" | "confirmed";
  series:
    | { mode: "line"; points: LinePoint[] }
    | { mode: "candles"; candles: Candle[]; bucketMs: number; gaps: number[] };
  livePrice: number | null;
  sourceQuotedAt: string | null;
  liveStale: boolean | null;
  medianDeltaMs: number | null;
  decimals: number;
  candlesUnavailable?: boolean;
};


export function TerminalChart({
  assetKey,
  watermark,
  locale,
  range,
  style,
  height = 300,
  labels,
  pollMs = 30_000,
  priceToBeat = null,
  pinnedReads = [],
}: {
  assetKey: string;
  /** Pane watermark — the instrument's public name (never the vendor, E-53). */
  watermark: string;
  /** The PLATFORM locale (kp-locale), not the browser's — chart chrome must match the page. */
  locale: string;
  range: TerminalRange;
  /** The player-chosen form — the server may answer candlesUnavailable and the
   *  pane then shows the curve WITH the reason (never invented candles). */
  style: TerminalStyle;
  height?: number;
  labels: {
    empty: string;
    loading: string;
    error: string;
    aria: string;
    /** Already-translated receipt parts — the card's own grammar (E-53/E-262). */
    sourceLabel: string;
    quotedWord: string;
    /** Shown when the player chose candles and the window is too thin for honest ones. */
    noCandles: string;
    /** R5(c) · F1 — the live line's name, the band's and the round page's own: "Confirmed price". */
    confirmedPrice: string;
  };
  pollMs?: number;
  /** Frozen opening price of the round in play; the dashed reference is never a later quote. */
  priceToBeat?: number | null;
  /** Immutable reads printed on the visible round cards. */
  pinnedReads?: readonly ConfirmedPricePin[];
}) {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "empty" | "error">("loading");
  // ⭐ A GENERATION, NOT A FLAG (S6 round 10, R10-C, 2026-10-12). The chart is rebuilt when `height` changes — the board
  // widened past 1024px turns 300 into 380 — and a flag set false by the old chart's cleanup and true by the new build in
  // the same commit batched to "unchanged": the draw effect never ran for the new chart, which kept only its watermark
  // (round 9's and round 10's tiles 164; reproduced: drawn at 390, blank the moment the same page is widened, drawn on a
  // fresh 1280 load). Each build counts up, so every new chart is drawn; 0 = no engine yet.
  const [engineGen, setEngineGen] = useState(0);
  const [legend, setLegend] = useState<{ o: number; h: number; l: number; c: number; t: number } | null>(null);
  const legendModeRef = useRef<"candles" | "line" | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const libRef = useRef<typeof import("lightweight-charts") | null>(null);
  const seriesListRef = useRef<Array<ISeriesApi<"Area"> | ISeriesApi<"Candlestick">>>([]);
  const priceLineRef = useRef<IPriceLine | null>(null);
  const fitKeyRef = useRef<string>("");
  const seqRef = useRef(0);
  const lastRawRef = useRef<string>("");
  const cadenceRef = useRef<number | null>(null);
  const rangeRef = useRef<TerminalRange>(range);
  const decimalsRef = useRef<number>(2);
  const latestBarRef = useRef<{ o: number; h: number; l: number; c: number; t: number } | null>(null);
  // Read by `draw` at paint time; a new round changes the reference without changing history.
  const priceToBeatRef = useRef(priceToBeat);
  priceToBeatRef.current = priceToBeat;
  // The provider can revise its historical bar after settlement. A conflicting
  // bar is whitespace on the chart, while the card keeps its immutable receipt.
  // Apply this at paint time as card pins can refresh without a vendor response.
  const guardedFeed = useMemo<Feed | null>(() => {
    if (feed?.sourceTier !== "vendor") return feed;
    const pins = [...pinnedReads, { quotedAt: feed.sourceQuotedAt, price: feed.livePrice }];
    const series = maskConflictingVendorOpens(feed.series, pins, feed.decimals);
    // A pane with only revised bars is unavailable, rather than a blank canvas
    // that appears to assert a flat or absent market.
    if (series.mode === "line" ? !series.points.some((point) => point.price != null) : series.candles.length === 0) return null;
    return { ...feed, series } as Feed;
  }, [feed, pinnedReads]);

  // ── data: fetch the window; poll while visible; refresh on tab reveal ─────
  useEffect(() => {
    let alive = true;
    const ac = new AbortController();
    lastRawRef.current = "";
    setFeed(null);
    setStatus("loading");
    /* ⭐ A HUNG REQUEST NO LONGER HOLDS THE POLL (review 6, B-2 · 2026-10-09). The deadline below says "Chart unavailable —
       retrying" at 12s, but the poll waited for the request to settle before it paced the next one, so a stalled
       connection — Cloudflare answers 524 only after its 100s origin timeout — held every retry: requests went out at 0,
       30, 160 and 290s, and the pane said "retrying" while nothing was. Now each request has its own abort, chained to the
       effect's (a new window or a close aborts it), and:
         · a request that has not begun to answer by its deadline is presumed hung: the next poll that falls due sends a
           fresh request (0, 30, 60…), and the fresh one aborts it — its answer would only have been discarded (`seq`: a
           newer request owns the state), so its connection is freed instead of held;
         · a request whose answer has begun is waited for, as before: a body slow to arrive (a 2G phone) still draws, and a
           poll never starts a second download beside it;
         · a late answer still draws (a cold start that answers at 20s), a drawn chart is never replaced (F3), and only a
           VERIFIED empty answer says "no reads" — the rules below, unchanged.
       At most one request is in flight. */
    let inFlight: { abort: AbortController; overdue: boolean; answering: boolean } | null = null;
    const load = async () => {
      if (document.visibilityState === "hidden") return;
      const seq = ++seqRef.current;
      inFlight?.abort.abort(); // a newer request owns the state: the one before it stands down, its connection freed
      const mine = { abort: new AbortController(), overdue: false, answering: false };
      inFlight = mine;
      const chained = () => mine.abort.abort();
      ac.signal.addEventListener("abort", chained);
      /* ⭐ "LOADING" HAS A DEADLINE (round 5 of the visual pass, 2026-10-09 — tiles 163 164 200, a card that read "Inapakia…"
         over an empty pane). The request had none, so a window that never came — a stalled connection, a cold route — left
         the pane saying it was loading for as long as the page stayed open. The route answers within its vendor's 8s
         abort (`updown-terminal-vendor.ts`) and its own reads; past HISTORY_DEADLINE_MS with no answer the pane says the
         existing honest sentence instead — `udChartError`, "Chart unavailable — retrying" — and the polling below keeps
         retrying, so a late or a later answer still draws. A drawn chart is never replaced (F3); a VERIFIED empty
         answer still says "no reads". */
      const deadline = setTimeout(() => {
        mine.overdue = true; // unanswered past its deadline: presumed hung, so the next poll replaces it (B-2, above)
        if (alive && seq === seqRef.current) setStatus((s) => (s === "loading" ? "error" : s));
      }, HISTORY_DEADLINE_MS);
      try {
        const r = await fetch(`/api/updown/history?asset=${encodeURIComponent(assetKey)}&range=${range}&style=${style}`, {
          // no-cache (NOT no-store): the browser stores the body, sends
          // If-None-Match, and the route's 304 answers with ZERO bytes — the
          // bandwidth saving the ETag was built for now reaches the phone
          // (re-sign panel, data + graphing lenses).
          cache: "no-cache",
          signal: mine.abort.signal,
        });
        mine.answering = true; // its answer has begun: a poll waits for it, so a slow body still draws (B-2, above)
        if (!alive || seq !== seqRef.current) return; // a newer request owns the state
        if (!r.ok) { setStatus((s) => (s === "ok" ? "ok" : "error")); return; } // keep a drawn chart (F3)
        const raw = await r.text();
        if (!alive || seq !== seqRef.current) return;
        if (raw === lastRawRef.current) return; // identical window — nothing to redraw (J8)
        lastRawRef.current = raw;
        const data: Feed = JSON.parse(raw);
        const has = data.series.mode === "line" ? data.series.points.some((p) => p.price != null) : data.series.candles.length > 0;
        cadenceRef.current = data.medianDeltaMs;
        decimalsRef.current = data.decimals;
        if (has) { setFeed(data); setStatus("ok"); }
        else { setFeed(null); setStatus("empty"); } // VERIFIED empty — the only path to the no-reads claim
      } catch {
        if (!alive || seq !== seqRef.current) return;
        setStatus((s) => (s === "ok" ? "ok" : "error"));
      } finally {
        // The whole answer is in (or failed): the deadline stands down — a body that is slow to arrive is still waited for.
        clearTimeout(deadline);
        // …and this request leaves the effect's abort and the in-flight slot (B-2): a poll may send the next one.
        ac.signal.removeEventListener("abort", chained);
        if (inFlight === mine) inFlight = null;
      }
    };
    rangeRef.current = range;
    load();
    // Poll pacing follows the DATA, not a constant (judge panel, data lens):
    // the server states the window's cadence in every payload, so a 1h-bar 7D
    // window is polled at half its bar interval (capped at 2 min) instead of
    // re-downloading an unchanged window every 30s. The identical-payload
    // short-circuit above already makes a redundant poll draw nothing.
    let timer: ReturnType<typeof setTimeout> | null = null;
    const paceNext = () => {
      const cadence = cadenceRef.current;
      const wait = Math.min(Math.max(pollMs, cadence != null ? cadence / 2 : 0), 120_000);
      // ⭐ B-2 · the poll never waits on a request (it awaited each one, so a hung request held every retry): it sends when
      // none is in flight, or when the one in flight is overdue and has not begun to answer (`load` aborts that one); a
      // request still inside its deadline, or whose answer is arriving, is left to finish.
      timer = setTimeout(() => {
        if (inFlight === null || (inFlight.overdue && !inFlight.answering)) void load();
        if (alive) paceNext();
      }, wait);
    };
    paceNext();
    const onReveal = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onReveal);
    return () => { alive = false; ac.abort(); if (timer) clearTimeout(timer); document.removeEventListener("visibilitychange", onReveal); };
  }, [assetKey, range, style, pollMs]);

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
          // Ali's final ruling (2026-09-04, late evening): NO vendor
          // attribution anywhere — logo OFF, no written credit. The README's
          // attribution request was flagged by the judge panel and expressly
          // declined by the owner; §B12.6 records the decision.
          attributionLogo: false,
        },
        grid: {
          vertLines: { color: grid, style: lib.LineStyle.Dotted },
          horzLines: { color: grid, style: lib.LineStyle.Dotted },
        },
        rightPriceScale: { borderColor: ink("--border"), entireTextOnly: true, scaleMargins: { top: 0.08, bottom: 0.26 } },
        // fixRightEdge keeps the newest bar and its time label fully inside the
        // pane (the rightmost label clipped to "16:3" at 360 without it).
        timeScale: {
          borderColor: ink("--border"), timeVisible: true, secondsVisible: false,
          fixRightEdge: true, fixLeftEdge: true, lockVisibleTimeRangeOnResize: true,
          // The library's default day-boundary tick leaks a bare day number ('4' /
          // '4日' by browser locale). Times are already wall-clock shifted, so the
          // day boundary IS honest midnight — rendered as "00:00", one grammar for
          // every locale; all other tick kinds keep the library default (null).
          tickMarkFormatter: (t: number, type: number) => {
            if (type !== 2) return null;
            // Intraday windows: the day boundary IS honest midnight. Multi-day
            // windows (7D): six identical "00:00"s carry zero calendar
            // information (re-sign panel) — the boundary names its DAY, in the
            // platform locale, over the already wall-clock-shifted instant.
            if (rangeRef.current !== "7D") return "00:00";
            return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" }).format((t as number) * 1000);
          },
        },
        localization: { locale },
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
      // The professional furniture: a faint instrument watermark (the pane names
      // what it charts, the international-terminal convention) and the OHLC
      // crosshair legend fed below. Both wear kit inks through the bridge.
      // Watermark type from the LADDER too (--type-small): canvas wants a number,
      // the stylesheet owns which one. No rung readable → no watermark.
      const wmSize = Math.round(parseFloat(tokRaw("--type-small")));
      if (Number.isFinite(wmSize)) {
        lib.createTextWatermark(chart.panes()[0], {
          horzAlign: "left", vertAlign: "top",
          lines: [{ text: watermark, color: ink("--text-faint", 0.5), fontSize: wmSize, fontFamily: tokRaw("--font-mono") }],
        });
      }
      chart.subscribeCrosshairMove((param) => {
        if (legendModeRef.current !== "candles") return;
        const s0 = seriesListRef.current[0];
        if (!s0) return;
        const bar = param.seriesData.get(s0) as { open?: number; high?: number; low?: number; close?: number; time?: number } | undefined;
        if (bar && bar.open != null) {
          setLegend({ o: bar.open, h: bar.high!, l: bar.low!, c: bar.close!, t: (bar.time as number) ?? 0 });
        } else {
          // Pointer left the pane (or sits on whitespace): the legend returns to
          // the LATEST bar immediately — a hovered mid-window bar must never keep
          // reading as current (re-sign panel; worst case was ~1h on 7D).
          if (latestBarRef.current) setLegend(latestBarRef.current);
        }
      });
      chartRef.current = chart;
      ro = new ResizeObserver(() => chart.applyOptions({ width: el.clientWidth }));
      ro.observe(el);
      setEngineGen((g) => g + 1);
    })();
    return () => {
      disposed = true;
      ro?.disconnect();
      chartRef.current?.remove();
      chartRef.current = null;
      seriesListRef.current = [];
      priceLineRef.current = null;
      fitKeyRef.current = "";
    };
  }, [height]);

  // ── draw — full series rebuild per feed; viewport fitted once per key ─────
  const draw = useCallback((data: Feed) => {
    const chart = chartRef.current;
    const lib = libRef.current;
    if (!chart || !lib) return;
    const ink = makeInkResolver();
    const curve = ink("--aqua-300");
    const downCandle = ink("--text-muted");
    /* ⭐ THE AXIS SPEAKS THE PAGE'S PRICE (2026-10-09, the visual pass's round 4, tiles 164 and 202). The engine's own
       "price" format printed the scale as "2896.04" — no grouping, no currency — beside the band's "$2,896.00" and the
       line's own name below the pane, which `usd()` spells. One spelling (`@/lib/usd-price`), so the scale, the live
       line's tag and the crosshair's label read as the page does: "$2,896.04". */
    const priceFormat = { type: "custom" as const, minMove: 1 / 10 ** data.decimals, formatter: (p: number) => usd(p, data.decimals) };
    // The library renders raw UTC; shift to the device wall clock (F21).
    const tzShift = -new Date().getTimezoneOffset() * 60;
    // Pane-space discipline: the volume band exists only in candle mode — the
    // line reclaims its 18% (margins re-applied per draw).
    // Pane-space discipline: the volume band exists only when volume will
    // actually PAINT — a reserved dead strip under volume-less instruments was
    // ~70px of nothing on every current asset (re-sign panel, visual lens).
    const willPaintVolume = data.series.mode === "candles"
      && data.series.candles.filter((c) => c.v != null && c.v > 0).length >= 2;
    chart.priceScale("right").applyOptions({ scaleMargins: { top: 0.08, bottom: willPaintVolume ? 0.26 : 0.08 } });
    const at = (ms: number) => ((Math.round(ms / 1000) + tzShift) as UTCTimestamp);

    for (const s of seriesListRef.current) chart.removeSeries(s);
    seriesListRef.current = [];
    priceLineRef.current = null;

    let lastSeries: ISeriesApi<"Area"> | ISeriesApi<"Candlestick"> | null = null;
    if (data.series.mode === "candles") {
      const s = chart.addSeries(lib.CandlestickSeries, {
        upColor: curve, downColor: downCandle,
        borderUpColor: curve, borderDownColor: downCandle,
        wickUpColor: curve, wickDownColor: downCandle,
        priceFormat,
        // The gilt line is THE live-price statement; the series' own last-value
        // label duplicated it (two stacked axis tags, production 2026-09-04) and
        // would DISAGREE with it the moment live ≠ the last candle's close.
        lastValueVisible: false,
        priceLineVisible: false,
      });
      const formingUp = ink("--aqua-300", 0.45);
      const formingDown = ink("--text-muted", 0.45);
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
      ];
      // ⛔ `ascUnique`, not `.sort()` — `at()` rounds ms to whole seconds, so a sorted list can
      //    still tie and a tie THROWS out of this effect (see chart-series.ts). A gap must
      //    never win a tie against a candle; the helper owns that rule.
      s.setData(ascUnique(bars));
      seriesListRef.current.push(s);
      lastSeries = s;
      legendModeRef.current = "candles";
      const lastReal = data.series.candles[data.series.candles.length - 1];
      // If the only candle was revised away, the prior legend is not evidence.
      latestBarRef.current = null;
      setLegend(null);
      if (lastReal) {
        const bar = { o: lastReal.o, h: lastReal.h, l: lastReal.l, c: lastReal.c, t: lastReal.t };
        latestBarRef.current = bar;
        setLegend(bar);
      }
      // Volume histogram — the vendor's real traded volume, bottom band, coloured
      // by bar direction at low alpha. Omitted entirely when the instrument
      // reports none (gold): an empty histogram is a fabricated statement.
      const vols = data.series.candles.filter((c) => c.v != null && c.v > 0);
      if (vols.length >= 2) {
        const hv = chart.addSeries(lib.HistogramSeries, {
          priceScaleId: "kp-vol",
          priceFormat: { type: "volume" },
          lastValueVisible: false,
          priceLineVisible: false,
        });
        chart.priceScale("kp-vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 }, visible: false });
        // ⛔ This one was neither sorted NOR collapsed — the bars above at least sorted.
        hv.setData(ascUnique(data.series.candles.map((c) => ({
          time: at(c.t),
          value: c.v ?? 0,
          color: c.c >= c.o ? ink("--aqua-300", c.forming ? 0.18 : 0.3) : ink("--text-muted", c.forming ? 0.18 : 0.3),
        }))));
        seriesListRef.current.push(hv as never);
      }
    } else {
      // §B12.2 ruling (2026-09-04, judge panel): the history curve wears the
      // WINDOW'S direction — first visible read vs last: up→yes, down→no,
      // flat→muted — the price-hero's exact grammar (E-261). A green curve over
      // a falling window claimed "up" on a down answer.
      // One Area series PER CONTIGUOUS RUN — the library bridges whitespace
      // inside a series, so a gap is honest only if the line actually ENDS
      // there (F18). The gap markers themselves ride on the FIRST series as
      // whitespace items: the time scale is index-spaced, so each missing grid
      // step must reserve its slot or the outage's width collapses to nothing
      // (the trading-terminal session-break idiom).
      const real = data.series.points.filter((pt) => pt.price != null);
      const dirInk = curve;
      const runs: LinePoint[][] = [[]];
      const gapTimes: number[] = [];
      for (const p of data.series.points) {
        if (p.price == null) { gapTimes.push(p.t); if (runs[runs.length - 1].length) runs.push([]); continue; }
        runs[runs.length - 1].push(p);
      }
      const liveRuns = runs.filter((r) => r.length > 0);
      liveRuns.forEach((run, idx) => {
        const s = chart.addSeries(lib.AreaSeries, {
          lineColor: dirInk,
          topColor: ink("--aqua-300", 0.20),
          bottomColor: ink("--aqua-300", 0.02),
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
        // ⛔ The gap markers land in the SAME array as real readings, so this is the site
        //    where a whitespace item could erase a price outright. `ascUnique` keeps the price.
        s.setData(ascUnique(items));
        seriesListRef.current.push(s);
        lastSeries = s;
      });
      legendModeRef.current = "line";
      setLegend(null);
      // ⛔ No per-series last-value label in line mode either: the newest read IS
      // the live price, so the gilt reference tag already states it — two axis
      // tags carrying one number is the candle-mode duplication again.
    }

    // The frozen opening price is the round's price to beat. It is independent
    // of the latest confirmed quote and stays put when the feed is delayed.
    if (lastSeries && priceToBeatRef.current != null) {
      priceLineRef.current = lastSeries.createPriceLine({
        price: priceToBeatRef.current,
        color: ink("--text-subtle"),
        lineWidth: 1,
        lineStyle: lib.LineStyle.Dashed,
        axisLabelVisible: true,
        title: "",
      });
    }

    // Fit ONCE per (range, mode); later polls must never yank the viewport
    // out of the player's hands (F2).
    const fitKey = `${range}:${style}:${data.series.mode}`;
    if (fitKeyRef.current !== fitKey) {
      chart.timeScale().fitContent();
      fitKeyRef.current = fitKey;
    }
  }, [range, style]);

  // The engine, feed and frozen round reference can arrive in any order. A new
  // reference redraws the series but fitContent remains keyed to range/mode.
  useEffect(() => { if (guardedFeed && engineGen > 0) draw(guardedFeed); }, [guardedFeed, engineGen, draw, priceToBeat]);
  const showLine = guardedFeed != null && guardedFeed.livePrice != null && guardedFeed.liveStale !== true;

  // A chart point is a bar's OPEN when vendor bars exist, or a dated platform
  // read during fallback. Name its time and kind beside the separate current
  // quote so two prices from different instants cannot appear contradictory.
  const lastChartPoint = guardedFeed?.series.mode === "line"
    ? guardedFeed.series.points.slice().reverse().find((point) => point.price != null)
    : guardedFeed?.series.mode === "candles"
      ? (() => { const bar = guardedFeed.series.candles.at(-1); return bar ? { t: bar.t, price: bar.o } : null; })()
      : null;
  const chartPointClock = lastChartPoint ? fmtEATClock(lastChartPoint.t) : null;
  // The card and axis already state the target. A fallback chart point is the
  // confirmed read itself, so repeating the same figure as "current" adds noise.
  // Vendor minute OPENs can differ from the later confirmed quote; show both then.
  const showConfirmedAside = showLine && (guardedFeed?.sourceTier === "vendor" || lastChartPoint?.price !== guardedFeed?.livePrice);

  const receipt = guardedFeed?.sourceQuotedAt
    ? `${labels.sourceLabel} · ${labels.quotedWord} ${fmtEAT(guardedFeed.sourceQuotedAt)}`
    : labels.sourceLabel;

  const pct = legend ? ((legend.c - legend.o) / (legend.o || 1)) * 100 : null;
  // E-261's three-state grammar (§B12.2: up=yes · down=no · flat=muted) — the `>=` here was
  // the last two-state residue in the chart system, green-at-flat on the legend's own window.
  const legendInk = legend ? "var(--text-muted)" : undefined;
  const words = locale === "sw"
    ? { beat: "Bei ya kushinda", o: "Ufunguzi", h: "Kilele", l: "Chini", c: "Kufunga", minuteOpen: "Ufunguzi wa dakika", barOpen: "Ufunguzi wa kipindi", chartRead: "Bei ya chati" }
    : locale === "zh"
      ? { beat: "目标价格", o: "开盘", h: "最高", l: "最低", c: "收盘", minuteOpen: "分钟开盘价", barOpen: "时段开盘价", chartRead: "图表读数" }
      : { beat: "Price to beat", o: "Open", h: "High", l: "Low", c: "Close", minuteOpen: "Minute open", barOpen: "Bar open", chartRead: "Chart read" };
  const chartPointWord = guardedFeed?.sourceTier === "vendor"
    ? range === "15M" || range === "30M" || range === "1H" ? words.minuteOpen : words.barOpen
    : words.chartRead;
  return (
    <div>
      {legend && (
        <p className="mb-1 mt-0 flex flex-wrap items-baseline gap-x-2 font-mono text-body-sm tabular-nums">
          {([[words.o, legend.o], [words.h, legend.h], [words.l, legend.l], [words.c, legend.c]] as const).map(([k, v]) => (
            <span key={k}><span className="text-text-faint">{k}</span> <span className="text-text">{v.toLocaleString(locale, { minimumFractionDigits: decimalsRef.current, maximumFractionDigits: decimalsRef.current })}</span></span>
          ))}
          {pct != null && <span style={{ color: legendInk }}>{pct > 0 ? "+" : pct < 0 ? "−" : ""}{Math.abs(pct).toFixed(2)}%</span>}
        </p>
      )}
      <div role="img" aria-label={labels.aria} className="relative" style={{ height }}>
        <div
          ref={wrapRef}
          className="absolute inset-0"
          style={{ opacity: guardedFeed ? 1 : 0, transition: "opacity var(--dur-arrive) var(--ease-glide)" }}
        />
        {!guardedFeed && (
          <div className="absolute inset-0 grid place-items-center">
            <span className="font-mono text-body-sm text-text-subtle">
              {status === "empty" ? labels.empty : status === "error" || feed != null ? labels.error : labels.loading}
            </span>
          </div>
        )}
      </div>
      {guardedFeed?.candlesUnavailable && style === "candles" && (
        <p className="mt-1 mb-0 text-body-sm text-text-subtle">{labels.noCandles}</p>
      )}
      {guardedFeed && (
        <p className="mt-1 mb-0 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-left text-body-sm" style={{ color: guardedFeed.liveStale ? "var(--text-subtle)" : "var(--text-faint)" }}>
          {lastChartPoint?.price != null && chartPointClock && (
            <span className="whitespace-nowrap text-text-subtle" data-testid="updown-chart-point">
              {chartPointWord} {chartPointClock} EAT <span className="tabular-nums">{usd(lastChartPoint.price, guardedFeed.decimals)}</span>
            </span>
          )}
          {/* ⭐ R5(c) · F1 (2026-09-27) · THE LINE IS NAMED, in its own ink: "Confirmed price $63,590.62" — the band's and the
              round page's word for the newest confirmed read, which a dashed line on a canvas could not say (and which a
              screen reader never heard). Held whole; it drops with the line when the feed is stale (F20). */}
          {showConfirmedAside && (
            <span className="whitespace-nowrap text-text-subtle">
              {labels.confirmedPrice}{" "}<span className="tabular-nums">{usd(guardedFeed.livePrice, guardedFeed.decimals)}</span>
            </span>
          )}
          {/* No vendor attribution by the owner's explicit, informed decision —
              §B12.6 records it. */}
          <span className="tabular-nums text-text-subtle">{receipt}</span>
        </p>
      )}
    </div>
  );
}
