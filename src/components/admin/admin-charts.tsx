/**
 * Admin chart components — pure SVG, no external charting library.
 *
 * Charts use a wide design-space viewBox (1200×240 default) so when they scale
 * to the parent's width, the data fills the card edge-to-edge with minimal
 * padding. The series can be 24 hourly buckets or 28 daily buckets — the SVG
 * naturally distributes them across the full width.
 *
 * ⛔ THE SVG HOLDS THE DATA AND NOTHING ELSE. Axis labels and legends are an HTML layer
 * measured in REAL PIXELS — see the DG-A-15 block above `AXIS_GUTTER`. Putting a `<text>`
 * back inside one of these `preserveAspectRatio="none"` viewBoxes re-opens the defect;
 * `npm run qa:chart-axis` fails on it.
 */

import type { ReactNode } from "react";
import { formatNumber, formatCompactNumber } from "@/lib/utils";

export type SeriesPoint = { x: number; y: number };

/**
 * ⭐ THE ONE CATEGORICAL RAMP for admin charts — fills PAIRED WITH THE INK THAT READS ON THEM
 * (S-03 + S-12, scan #1, 2026-08-28).
 *
 * 🔴 WHAT IT REPLACES, AND WHY BOTH HALVES WERE BROKEN.
 * `["var(--royal)", "var(--royal-300)", "var(--aqua-400)", "var(--claret-400)",
 * "var(--slate-400)"]` was written out TWICE, byte-identically, in this file and in
 * admin/page.tsx — two independent literals painting the same semantic dimension (which
 * payment provider a band is) on two surfaces, with nothing linking them.
 *
 * · S-03 — `AdminStackedBar` hardcodes its label ink and the fill arrives as a free-form
 *   string, so the component cannot know the fill's lightness. Measured (OKLCH → linear sRGB
 *   → WCAG relative luminance, at text-micro/10px so the bar is 4.5:1):
 *       --royal      6.93:1  pass
 *       --royal-300  2.19:1  FAIL      --aqua-400   2.37:1  FAIL
 *       --claret-400 4.28:1  FAIL      --slate-400  3.44:1  FAIL
 *   Four of the five provider bands were unreadable. ⛔ `test:contrast` cannot see this: its
 *   corpus is four CSS files, and this pair forms at runtime from an inline `style` in a .tsx
 *   against a Tailwind class. Neither half is in a stylesheet.
 * · S-12 — aqua and claret were carrying semantic meaning. DESIGN_AUTHORITY §B4: aqua is
 *   "finishing pass only, ≤ 8% surface coverage. Never a chip, button label, or anything
 *   semantic", and §B4b names /admin/live as "an exception BY NAME — no other surface
 *   inherits it". §B4a makes claret the colour of an irreversible operator ceremony.
 *   "Provider #4 in a bar chart" is neither.
 *
 * ⚠️ ROYAL AND SLATE SHARE HUE 268, which is why this is not simply "five royal steps": at one
 * hue, five categories can only differ in lightness, and two of them would read as the same
 * band dimmed. So it alternates royal and gold and steps the lightness — five bands that
 * differ in BOTH dimensions, without borrowing a hue that means something else.
 *
 * Measured, each fill against its OWN ink (worst 4.94:1, so AA holds at 10px), and every
 * adjacent pair distinguishable from its neighbour (worst 1.75:1). `test:admin-charts` §8
 * recomputes all of it from the token values rather than trusting this comment.
 */
export const CATEGORICAL_RAMP = [
  { fill: "var(--royal-700)", ink: "var(--text)" },
  { fill: "var(--gold-400)", ink: "var(--royal-950)" },
  { fill: "var(--royal-400)", ink: "var(--royal-950)" },
  { fill: "var(--gold-800)", ink: "var(--text)" },
  { fill: "var(--royal-200)", ink: "var(--royal-950)" },
] as const;

/** Fills only — for charts that paint no ink on the band (the SVG stacks, legend swatches). */
export const CATEGORICAL_FILLS = CATEGORICAL_RAMP.map((c) => c.fill);

/**
 * ⭐ THE DEFAULT FORMATTER IS A **COUNT** FORMATTER, AND THAT IS THE WHOLE CONTRACT.
 *
 * `AdminMeter`, `AdminBarList` and `AdminFunnelChart` each render a bare `value`. Every one
 * of them was cut with a raw `n.toLocaleString()` — no locale argument, so the grouping is
 * decided by whatever locale the runtime holds, and a TZS series that forgot to pass
 * `format` printed money with no unit on it. `formatNumber` is the platform's one unit-free
 * grouping (`TZ_NUMBER`, pinned en-US), which is exactly right for the three call sites that
 * rely on the default — player counts by status, by region, by age band.
 *
 * ⛔ A MONEY SERIES MUST PASS `format`. `formatTzs` for exact figures, `formatTzsCompact`
 * where the bar is narrow. Every money call site already does (finance top-players NGR,
 * insights GGR-by-category and top-markets, reports GGR-by-category, payments 24h volume) —
 * do not let the next one inherit the default and ship an amount with no shilling on it.
 * ⛔ And do not "fix" this by defaulting to `formatTzs`: it would stamp TZS onto a headcount.
 */
const formatCount = (n: number) => formatNumber(n);

const CHART_W = 1200;
const CHART_H = 240;
const PAD_X = 16;          // ⬅ was 40 "just enough for left-edge Y-labels" — the labels left the SVG (DG-A-15)
const PAD_X_RIGHT = 16;    // pull the line all the way to the right edge
const PAD_Y_TOP = 18;
const PAD_Y_BOTTOM = 8;    // ⬅ was 26 "room for x-axis labels" — same reason

/**
 * ⭐ DG-A-15 · THE AXIS LAYER IS HTML, IN REAL PIXELS. THE SVG IS FOR THE DATA.
 *
 * 🔴 THE DEFECT, MEASURED ON PRODUCTION 2026-08-29. Every chart below draws into a
 * **1200-wide** viewBox with `preserveAspectRatio="none"` and then renders it at whatever width
 * its card gives it — 530px in `/admin/finance`'s two-up grid. `none` means the two axes scale
 * INDEPENDENTLY, so the glyphs came out multiplied by **scaleX 0.44 and scaleY 1.00**: an 11px
 * axis label rendered 11px TALL and **4.9px WIDE**. Not small text — text condensed to 44% of its
 * own width. 31 `<text>` nodes across the three charts on `/admin/finance` alone, and it failed
 * at 1920 too (scaleX 0.60), not only at 1440.
 *
 * ⛔ THE REGISTER'S "AND VERTICALLY BY HEIGHT/240" IS WRONG — `scaleY` is EXACTLY 1.0, because
 * the viewBox height has always been the CSS height. A fix aimed at the vertical would have
 * changed nothing, and a guard asserting a HEIGHT floor would have passed this defect forever.
 * What separates the two is the RATIO of the axes; `npm run qa:chart-axis` asserts exactly that.
 *
 * ⛔ AND THERE IS NO CSS-ONLY FIX. `vector-effect` does not cover text, and dropping
 * `preserveAspectRatio="none"` letterboxes a chart that must span its card — the data path is
 * SUPPOSED to stretch. Only the glyphs are not.
 *
 * ⭐ SO THE GLYPHS MOVE OUT, and the two bands they need are sized in the READER'S pixels:
 * `AXIS_GUTTER` left, `AXIS_BASE` below. Sized in the DATA's coordinate space they shrink with
 * the card — which is how a 40-unit y-gutter became 17px on a 530px chart and the labels had to
 * be condensed to fit at all. **That is the whole lesson: an axis gutter is a reading measure,
 * not a data measure.**
 *
 * ⛔ NO JS MEASUREMENT, DELIBERATELY. Vertical positions are user units used as PIXELS — exact,
 * because the SVG's viewBox height is set to its own CSS height, so `scaleY` is 1 by
 * construction. Horizontal positions are PERCENTAGES of the plot column, which is exactly the
 * SVG's box. A ResizeObserver here would be a second source of truth for the same geometry.
 */
const AXIS_GUTTER = 46;                 // px column left of the plot, for the y-axis labels
const AXIS_BASE = 16;                   // px band below the plot, for the x-axis labels
const Y_LABEL_W = AXIS_GUTTER - 8;      // …less an 8px gap, so a label never touches the plot

/**
 * ⭐ ONE RULE FOR BOTH CHARTS' X-AXIS LABELS — and BOTH halves of it came out of measuring at
 * 390, not out of reasoning about it. The local pre-flight screenshot is what found them, before
 * either reached the live console.
 *
 * · **The edges are anchored, never centred.** A label centred on its own data point hangs
 *   outside the card at the ends: the stacked chart's first "01 Aug" sat **2.1px left of its own
 *   box**. First label starts at its point, last label ends at it.
 * · **Below `sm`, only the first, the middle and the last survive.** At 390 a 28-day series puts
 *   41px labels on a 48px pitch, and the edge anchoring above legitimately steals ~20px from the
 *   two end gaps — **measured overlaps of 12.5px at BOTH ends**. Thinning is the only remedy
 *   that needs no runtime text measurement, which is the constraint this whole layer is under.
 *
 * ⛔ Do not "simplify" this by centring every label — that trades an overlap for a clipped one,
 * and `qa:chart-axis` asserts against both.
 */
function xAxisCols(points: ReadonlyArray<{ key: number; x: number; text: string }>) {
  const last = points.length - 1;
  const mid = Math.round(last / 2);
  return points.map((p, i) => ({
    key: p.key,
    text: p.text,
    left: (p.x / CHART_W) * 100,
    shift: i === 0 ? "translateX(0)" : i === last ? "translateX(-100%)" : "translateX(-50%)",
    keepNarrow: i === 0 || i === last || i === mid,
  }));
}
/** `hidden sm:block` on everything the narrow viewport drops. */
const narrowClass = (keep: boolean) => (keep ? "" : " hidden sm:block");
/* ⛔ THERE IS NO `LEGEND_H`, AND THAT IS THE FIX FOR THE SECOND DEFECT THIS CHANGE FOUND.
 * A fixed-height legend band forced `white-space: nowrap` on five provider names into 18px, and
 * a row of nowrap items in NORMAL FLOW carries a min-content width — ~450px for five providers.
 * A grid item is `min-width: auto`, so that width propagated up and pushed the whole
 * `/admin/finance` card past a 390 viewport. **Measured on the local pre-flight screenshot
 * before it ever reached production**: all four cards clipped at the right edge, while the
 * probe called the page clean because the labels were inside a box that had simply grown.
 * ⭐ So the legend WRAPS and the plot takes what is left — which this chart can afford
 * because it has no y-axis labels, so nothing needs pixel alignment with the viewBox. */

/* ===== Mini area chart (KPI sparkline at scale) ===== */

export function AdminAreaChart({
  series,
  height = CHART_H,
  fillVar = "var(--royal)",
  strokeVar = "var(--royal)",
  fillOpacity = 0.18,
  yLabel,
  xLabels,
}: {
  series: SeriesPoint[];
  height?: number;
  width?: number;
  fillVar?: string;
  strokeVar?: string;
  fillOpacity?: number;
  yLabel?: string;
  xLabels?: string[];
}) {
  if (series.length === 0) {
    return (
      <div
        className="rounded-md bg-bg-sunken border border-dashed border-border-subtle flex items-center justify-center text-caption text-text-tertiary w-full"
        style={{ minHeight: height }}
      >
        No data in this window
      </div>
    );
  }
  // ⭐ The SVG owns the PLOT only; `AXIS_BASE` px below it belong to the x-axis labels, and the
  // viewBox height is the plot's own CSS height — which is what keeps scaleY at exactly 1, so a
  // y-tick's user-unit y IS its pixel offset in the gutter. No measurement, no observer.
  const plotH = Math.max(40, height - AXIS_BASE);
  const innerW = CHART_W - PAD_X - PAD_X_RIGHT;
  const innerH = plotH - PAD_Y_TOP - PAD_Y_BOTTOM;
  const maxY = Math.max(...series.map((p) => p.y), 1);
  const minY = Math.min(...series.map((p) => p.y), 0);
  const range = Math.max(maxY - minY, 1);
  const xs = series.map((_, i) => PAD_X + (i / Math.max(1, series.length - 1)) * innerW);
  const ys = series.map((p) => PAD_Y_TOP + innerH - ((p.y - minY) / range) * innerH);

  const linePath = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${xs[xs.length - 1].toFixed(1)} ${(PAD_Y_TOP + innerH).toFixed(1)} L ${xs[0].toFixed(1)} ${(PAD_Y_TOP + innerH).toFixed(1)} Z`;

  // Y-axis ticks (5)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => minY + t * range);

  // Pick X-axis labels — up to 6 evenly distributed
  const labelIndices: number[] = [];
  if (xLabels && xLabels.length > 0) {
    const target = Math.min(6, xLabels.length);
    for (let i = 0; i < target; i++) {
      labelIndices.push(Math.round((i / Math.max(1, target - 1)) * (xLabels.length - 1)));
    }
  }

  const yTickRows = yTicks.map((t, i) => ({
    key: i,
    top: PAD_Y_TOP + innerH - ((t - minY) / range) * innerH,
    text: compact(t, range / 4),
  }));
  const xl = xLabels ?? [];
  // ⭐ x in USER UNITS; `xAxisCols` turns it into a % of the PLOT column — which is exactly the
  // SVG's box, so a label lands on the same coordinate the data path uses, at any card width.
  const xTickCols = xAxisCols(labelIndices.map((idx) => ({
    key: idx,
    x: xs[idx] ?? PAD_X + (idx / Math.max(1, xl.length - 1)) * innerW,
    text: xl[idx],
  })));

  return (
    <div data-chart="area" className="w-full min-w-0" style={{ height }}>
      <div className="flex" style={{ height: plotH }}>
        {/* ── y-axis labels · a REAL-PIXEL gutter (DG-A-15) ───────────────────────────── */}
        <div aria-hidden className="relative shrink-0" style={{ width: AXIS_GUTTER }}>
          {yTickRows.map((r) => (
            <span
              key={r.key}
              data-chart-label="y"
              className="absolute left-0 block truncate text-right font-mono text-caption tabular text-text-tertiary"
              style={{ width: Y_LABEL_W, top: r.top, transform: "translateY(-50%)" }}
            >
              {r.text}
            </span>
          ))}
        </div>
        {/* ── the plot · the data path is SUPPOSED to stretch, so `none` stays ─────────── */}
        <div className="relative min-w-0 flex-1">
    <svg
      viewBox={`0 0 ${CHART_W} ${plotH}`}
      preserveAspectRatio="none"
      className="block w-full"
      role="img"
      aria-label={yLabel ? `${yLabel} time series` : "Time series chart"}
      style={{ height: plotH }}
    >
      <defs>
        <linearGradient id="kp-area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillVar} stopOpacity={fillOpacity} />
          <stop offset="100%" stopColor={fillVar} stopOpacity="0" />
        </linearGradient>
        <filter id="kp-line-bloom" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Y-axis grid */}
      {yTicks.map((t, i) => {
        const y = PAD_Y_TOP + innerH - ((t - minY) / range) * innerH;
        return (
          <g key={i}>
            <line
              x1={PAD_X}
              y1={y}
              x2={CHART_W - PAD_X_RIGHT}
              y2={y}
              stroke="var(--border-subtle)"
              strokeDasharray="3 4"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        );
      })}
      {/* Area + line with soft bloom */}
      <path d={areaPath} fill="url(#kp-area-grad)" />
      <path
        d={linePath}
        stroke={strokeVar}
        strokeWidth="2"
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        filter="url(#kp-line-bloom)"
      />
      {/* End-point dot with glow */}
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="5" fill={strokeVar} opacity="0.3" />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="3.5" fill={strokeVar} />
    </svg>
        </div>
      </div>
      {/* ── x-axis labels · their own px band, offset by the same gutter ────────────────── */}
      <div className="flex" style={{ height: AXIS_BASE }}>
        <div className="shrink-0" style={{ width: AXIS_GUTTER }} />
        <div aria-hidden className="relative min-w-0 flex-1">
          {xTickCols.map((c) => (
            <span
              key={c.key}
              data-chart-label="x"
              className={`absolute top-0 whitespace-nowrap font-mono text-caption tabular text-text-tertiary${narrowClass(c.keepNarrow)}`}
              style={{ left: `${c.left}%`, transform: c.shift }}
            >
              {c.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ===== Multi-series stacked bar (provider mix over time) ===== */

export function AdminStackedBars({
  bars,
  height = 200,
  colors = CATEGORICAL_FILLS,
  legend,
}: {
  bars: Array<{ label: string; segments: number[] }>;
  height?: number;
  width?: number;
  colors?: string[];
  legend?: string[];
}) {
  if (bars.length === 0) {
    return (
      <div
        className="rounded-md bg-bg-sunken border border-dashed border-border-subtle flex items-center justify-center text-caption text-text-tertiary w-full"
        style={{ minHeight: height }}
      >
        No data
      </div>
    );
  }
  const padX = 24;
  const padTop = 6;
  const innerW = CHART_W - padX * 2;
  // ⭐ DG-A-15 · the legend and the x labels are HTML bands now, so the SVG is ALL plot.
  // ⚠️ `VB_H` IS NOMINAL, unlike AdminAreaChart's `plotH`. This chart has no y-axis labels, so
  // nothing needs pixel alignment with the viewBox: `preserveAspectRatio="none"` maps these user
  // units onto whatever height the flex column leaves, and the bar PROPORTIONS survive intact.
  const VB_H = CHART_H;
  const hasLegend = !!legend && legend.length > 0;
  const innerH = VB_H - padTop;
  const maxStack = Math.max(...bars.map((b) => b.segments.reduce((s, v) => s + v, 0)), 1);
  const barW = (innerW / bars.length) * 0.78;
  const gap = (innerW / bars.length) * 0.22;

  // Pick which x-labels to render (up to 8 to avoid clutter)
  const labelStep = Math.max(1, Math.ceil(bars.length / 8));
  const xTickCols = xAxisCols(
    bars
      .map((bar, i) => ({ i, bar }))
      .filter(({ i }) => i % labelStep === 0)
      .map(({ i, bar }) => ({ key: i, x: padX + i * (barW + gap) + gap / 2 + barW / 2, text: bar.label })),
  );

  return (
    <div data-chart="stacked" className="flex w-full min-w-0 flex-col" style={{ height }}>
      {hasLegend && (
        <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-x-4 gap-y-1 pb-1 font-mono text-micro text-text-secondary">
          {(legend ?? []).map((l, i) => (
            <span key={i} data-chart-label="legend" className="inline-flex min-w-0 items-center gap-1 whitespace-nowrap">
              {/* the swatch reads its fill from the SAME ramp the bars do — one source */}
              <span aria-hidden className="inline-block h-2 w-2 shrink-0" style={{ background: colors[i % colors.length] }} />
              <span className="truncate">{l}</span>
            </span>
          ))}
        </div>
      )}
      <div className="relative min-h-0 min-w-0 flex-1">
    <svg viewBox={`0 0 ${CHART_W} ${VB_H}`} preserveAspectRatio="none" className="absolute inset-0 block h-full w-full" role="img" aria-label="Stacked bar chart">
      {bars.map((b, i) => {
        let yCursor = padTop + innerH;
        const x = padX + i * (barW + gap) + gap / 2;
        return (
          <g key={i}>
            {b.segments.map((v, si) => {
              // ⛔ A ZERO PAINTS NOTHING (finding A5). This was `Math.max(0.5, segH)`, so a
              // provider with NO volume in a bucket still drew a 0.5px sliver — and unlike the
              // bar-list and the meter, a stacked bar prints no number beside it, so nothing
              // disclosed the zero. Measured on production: 6 of 8 (provider × day) cells on
              // /admin/finance's "Provider mix over time" hold zero volume, so three quarters
              // of that chart's marks stood for deposits that did not happen.
              // ⭐ A NON-ZERO value keeps a visible floor — the fix is "zero is zero", not
              // "make small values invisible", which would trade one misreading for another.
              const segH = (v / maxStack) * innerH;
              const painted = v === 0 ? 0 : Math.max(0.5, segH);
              yCursor -= segH;
              return (
                <rect
                  key={si}
                  x={x.toFixed(1)}
                  y={yCursor.toFixed(1)}
                  width={barW.toFixed(1)}
                  height={painted.toFixed(1)}
                  fill={colors[si % colors.length]}
                />
              );
            })}
          </g>
        );
      })}
    </svg>
      </div>
      {/* ── x-axis labels · their own px band, percentage-positioned over the plot ──────── */}
      <div aria-hidden className="relative min-w-0 shrink-0" style={{ height: AXIS_BASE }}>
        {xTickCols.map((c) => (
          <span
            key={c.key}
            data-chart-label="x"
            className={`absolute top-0 whitespace-nowrap font-mono text-micro tabular text-text-tertiary${narrowClass(c.keepNarrow)}`}
            style={{ left: `${c.left}%`, transform: c.shift }}
          >
            {c.text}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ===== KYC funnel chart (proper proportional widths) ===== */

/**
 * ⭐ E-103 · THE NUMBERS ARE HANDED IN, NOT DERIVED HERE.
 *
 * This used to take a raw `value` plus a pre-formatted `conversionFromPrev` and compute its own
 * bar width from its own `max` — two places deciding one number, which is exactly the drift
 * §0's "single source of truth" rule exists to stop. `funnelShares()` now owns both the share
 * and the bar width, and it is unit-tested; this component only paints.
 */
export function AdminFunnelChart({
  steps,
}: {
  steps: ReadonlyArray<{ label: string; value: number; shareOfTop?: string; barPct: number }>;
}) {
  return (
    <div className="space-y-1.5">
      {steps.map((s, i) => {
        const pct = s.barPct;
        return (
          <div key={i} className="flex items-center gap-2">
            <span className="font-mono text-micro tracking-[0.14em] uppercase text-text-tertiary w-24 shrink-0">{s.label}</span>
            <div className="flex-1 h-7 bg-bg-sunken rounded-sm relative overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-royal/70 rounded-sm flex items-center justify-end pr-2 prog-sweep"
                style={{ width: `${pct}%` }}
              >
                {/* Funnel steps are HEADCOUNTS at every call site (KYC stages, the insights
                    signup funnel), so this one is unit-free by design — see `formatCount`. */}
                <span className="font-mono text-micro tabular text-white">{formatCount(s.value)}</span>
              </div>
            </div>
            {/* ⭐ E-103 · the share of the TOP stage, and the header says so. `w-14` is kept:
                a share of the top can never need more than "100%". */}
            {s.shareOfTop && (
              <span className="font-mono text-micro tracking-wider text-brand-300 w-14 text-right shrink-0">{s.shareOfTop}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ===== AdminSpark — tiny axis-less KPI sparkline (A8) ===== */

export function AdminSpark({
  series,
  height = 26,
  strokeVar = "var(--brand-400)",
  className,
}: {
  series: number[];
  height?: number;
  strokeVar?: string;
  className?: string;
}) {
  if (!series || series.length < 2) return null;
  const w = 100;
  const h = 30;
  const pad = 3;
  const max = Math.max(...series);
  const min = Math.min(...series);
  const range = Math.max(max - min, 1);
  const xs = series.map((_, i) => pad + (i / (series.length - 1)) * (w - 2 * pad));
  const ys = series.map((v) => pad + (h - 2 * pad) - ((v - min) / range) * (h - 2 * pad));
  const d = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={`block w-full ${className ?? ""}`} style={{ height }} aria-hidden>
      <path d={d} fill="none" stroke={strokeVar} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="1.7" fill={strokeVar} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* ===== AdminMeter — horizontal value-vs-cap gauge (A8) ===== */
/* Track #131645 (bg-sunken), fill --brand-500, threshold tick; flips to
   --no-500 past `thresholdPct` (fee-vs-ceiling, DSAR SLA, credit budget). */

export function AdminMeter({
  value,
  cap,
  label,
  unit,
  thresholdPct = 90,
  format,
}: {
  value: number;
  cap: number;
  label?: string;
  unit?: string;
  thresholdPct?: number;
  format?: (n: number) => string;
}) {
  const pct = cap > 0 ? Math.min(100, (value / cap) * 100) : 0;
  // threshold 0 (or 100) = no danger band; only flag when a real ceiling is set.
  const danger = thresholdPct > 0 && thresholdPct < 100 && pct >= thresholdPct;
  const fmt = format ?? formatCount;
  return (
    <div className="space-y-1">
      {label && (
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-mono text-micro uppercase tracking-[0.12em] text-text-tertiary">{label}</span>
          <span className={`font-mono text-caption tabular ${danger ? "text-danger" : "text-text"}`}>
            {fmt(value)}{unit ? ` ${unit}` : ""} / {fmt(cap)}
          </span>
        </div>
      )}
      <div className="relative h-2.5 rounded-sm bg-bg-sunken overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-sm admin-bar-grow"
          // ⛔ A ZERO PAINTS NOTHING (finding A5) — this was `Math.max(1, pct)`. A non-zero
          //    value keeps the 1% floor so a tiny reading stays visible.
          style={{ width: `${value === 0 ? 0 : Math.max(1, pct)}%`, background: danger ? "var(--no-500)" : "var(--brand-500)" }}
        />
        {thresholdPct > 0 && thresholdPct < 100 && (
          <span aria-hidden className="absolute inset-y-0 w-px" style={{ left: `${thresholdPct}%`, background: "var(--text-tertiary)", opacity: 0.6 }} />
        )}
      </div>
    </div>
  );
}

/* ===== AdminBarList — label + mono value + proportional bar rows (A8) ===== */
/* Replaces the hand-rolled distribution divs across admin. Brand fill by
   default; bars grow-in once on mount via `prog-sweep`. */

export function AdminBarList({
  rows,
  colorVar = "var(--brand-500)",
  format,
}: {
  rows: ReadonlyArray<{ label: ReactNode; value: number; title?: string }>;
  colorVar?: string;
  format?: (n: number) => string;
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  const fmt = format ?? formatCount;
  // Stacked row: label + value on top, full-width bar below — reads cleanly in
  // narrow (3-up) admin cards where a label/bar/value single line would starve
  // the bar to a few px.
  return (
    <div className="space-y-2.5">
      {rows.map((r, i) => {
        // ⛔ A ZERO PAINTS NOTHING (finding A5) — this was an unconditional `Math.max(2, …)`,
        // so an empty row drew a 2% bar. The floor stays for non-zero values: a row worth 1
        // out of 10,000 must still be visible, and making it invisible would swap one
        // misreading for another.
        const pct = r.value === 0 ? 0 : Math.max(2, (r.value / max) * 100);
        return (
          <div key={i} title={r.title}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-caption">
              <span className="min-w-0 truncate text-text">{r.label}</span>
              <span className="shrink-0 font-mono tabular text-text">{fmt(r.value)}</span>
            </div>
            <div className="h-2 bg-bg-sunken rounded-sm relative overflow-hidden">
              <div className="absolute inset-y-0 left-0 rounded-sm admin-bar-grow" style={{ width: `${pct}%`, background: colorVar }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ===== AdminGauge — radial value gauge for a single 0..max score (A8) =====
   A distinct primitive from AdminMeter (a horizontal bar): a ring that fills
   value/max with the number at its centre — the right shape for a headline
   score (risk, health, confidence). Static SVG (no motion) so it is
   reduced-motion-safe by construction. `colorVar` drives BOTH the arc and the
   centred number, so the caller owns the semantic — e.g. a risk band maps to
   --yes-500 / --warning-500 / --danger-500 (never gold: gold = earned money). */

export function AdminGauge({
  value,
  max = 100,
  size = 76,
  stroke = 8,
  colorVar = "var(--brand-500)",
  trackVar = "var(--border)",
  display,
  ariaLabel,
}: {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  colorVar?: string;
  trackVar?: string;
  /** Override the centred text (default: the raw value). */
  display?: string;
  ariaLabel?: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const c = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={ariaLabel ?? `${value} of ${max}`}>
      <circle cx={c} cy={c} r={r} fill="none" stroke={trackVar} strokeWidth={stroke} />
      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke={colorVar}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct)}
        transform={`rotate(-90 ${c} ${c})`}
      />
      <text
        x={c}
        y={c}
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: Math.round(size * 0.3), letterSpacing: "-0.03em" }}
        fill={colorVar}
      >
        {display ?? value}
      </text>
    </svg>
  );
}

/**
 * Compact axis/label formatting.
 *
 * ⛔ `step` IS NOT OPTIONAL DECORATION — it is what stops an axis mislabelling its own
 * gridlines (finding A4). The five y-ticks sit at `min + t·range` for t ∈ {0,.25,.5,.75,1},
 * and this function used to round every one of them to a whole number. On a series topping
 * out at 1 that produced the labels `0, 0, 1, 1, 1` across five DISTINCT values: the gridline
 * at 0.25 was labelled `0` and the one at 0.5 was labelled `1`. A reader taking a value off
 * the axis read a number the chart did not mean, with no adjacent figure to correct it.
 *
 * ⭐ Passing the distance between ticks lets the formatter keep exactly enough precision to
 * tell them apart, and no more — so a money axis stays `24K` and a count axis of 0..1 becomes
 * `0, 0.25, 0.50, 0.75, 1.00` instead of lying.
 *
 * ⭐ THE BODY NOW LIVES IN `formatCompactNumber` (S-14, scan #1, 2026-08-28). It was already
 * the utils thresholds with the "TZS " prefix removed, so it was promoted there rather than
 * left as a fifth private spelling — and it carried the `step` branch above with it, which is
 * why that promotion is a move and not a deletion. Two real defects came out in the wash:
 * it divided the SIGNED value, so a negative tick emitted an ASCII hyphen instead of the
 * U+2212 every other figure on this console uses; and it inherited S-01's branch-before-round,
 * so a 999,600 tick printed "1000K".
 */
const compact = (n: number, step?: number): string => formatCompactNumber(n, { step });
