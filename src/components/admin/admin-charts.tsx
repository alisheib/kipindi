/**
 * Admin chart components — pure SVG, no external charting library.
 *
 * Charts use a wide design-space viewBox (1200×240 default) so when they scale
 * to the parent's width, the data fills the card edge-to-edge with minimal
 * padding. The series can be 24 hourly buckets or 28 daily buckets — the SVG
 * naturally distributes them across the full width.
 */

export type SeriesPoint = { x: number; y: number };

const CHART_W = 1200;
const CHART_H = 240;
const PAD_X = 40;          // just enough for left-edge Y-labels
const PAD_X_RIGHT = 16;    // pull the line all the way to the right edge
const PAD_Y_TOP = 18;
const PAD_Y_BOTTOM = 26;   // room for x-axis labels

/* ===== Mini area chart (KPI sparkline at scale) ===== */

export function AdminAreaChart({
  series,
  height = CHART_H,
  fillVar = "var(--gold)",
  strokeVar = "var(--gold)",
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
  const innerW = CHART_W - PAD_X - PAD_X_RIGHT;
  const innerH = height - PAD_Y_TOP - PAD_Y_BOTTOM;
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

  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${height}`}
      preserveAspectRatio="none"
      className="block w-full"
      role="img"
      aria-label={yLabel ? `${yLabel} time series` : "Time series chart"}
      style={{ height }}
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
            <text
              x={PAD_X - 6}
              y={y + 3}
              textAnchor="end"
              fontFamily="JetBrains Mono"
              fontSize="11"
              fill="var(--text-tertiary)"
            >
              {compact(t)}
            </text>
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
      {/* X-axis labels */}
      {xLabels && xLabels.length > 0 && (
        <g fontFamily="JetBrains Mono" fontSize="11" fill="var(--text-tertiary)">
          {labelIndices.map((idx, i) => {
            const x = xs[idx] ?? PAD_X + (idx / Math.max(1, xLabels.length - 1)) * innerW;
            const anchor = i === 0 ? "start" : i === labelIndices.length - 1 ? "end" : "middle";
            return (
              <text key={idx} x={x} y={height - 8} textAnchor={anchor}>
                {xLabels[idx]}
              </text>
            );
          })}
        </g>
      )}
    </svg>
  );
}

/* ===== Multi-series stacked bar (provider mix over time) ===== */

export function AdminStackedBars({
  bars,
  height = 200,
  colors = ["var(--royal)", "var(--gold)", "var(--aqua-400)", "var(--claret-400)", "var(--slate-400)"],
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
  const padTop = legend ? 28 : 14;
  const innerW = CHART_W - padX * 2;
  const innerH = height - padTop - 22; // space for x labels
  const maxStack = Math.max(...bars.map((b) => b.segments.reduce((s, v) => s + v, 0)), 1);
  const barW = (innerW / bars.length) * 0.78;
  const gap = (innerW / bars.length) * 0.22;

  // Pick which x-labels to render (up to 8 to avoid clutter)
  const labelStep = Math.max(1, Math.ceil(bars.length / 8));

  return (
    <svg viewBox={`0 0 ${CHART_W} ${height}`} preserveAspectRatio="none" className="block w-full" role="img" aria-label="Stacked bar chart" style={{ height }}>
      {bars.map((b, i) => {
        let yCursor = padTop + innerH;
        const x = padX + i * (barW + gap) + gap / 2;
        return (
          <g key={i}>
            {b.segments.map((v, si) => {
              const segH = (v / maxStack) * innerH;
              yCursor -= segH;
              return (
                <rect
                  key={si}
                  x={x.toFixed(1)}
                  y={yCursor.toFixed(1)}
                  width={barW.toFixed(1)}
                  height={Math.max(0.5, segH).toFixed(1)}
                  fill={colors[si % colors.length]}
                />
              );
            })}
            {i % labelStep === 0 && (
              <text
                x={x + barW / 2}
                y={height - 6}
                textAnchor="middle"
                fontFamily="JetBrains Mono"
                fontSize="10"
                fill="var(--text-tertiary)"
              >
                {b.label}
              </text>
            )}
          </g>
        );
      })}
      {legend && legend.length > 0 && (
        <g fontFamily="JetBrains Mono" fontSize="10" fill="var(--text-secondary)">
          {legend.map((l, i) => (
            <g key={i} transform={`translate(${padX + i * 140}, ${padTop - 14})`}>
              <rect width="10" height="10" fill={colors[i % colors.length]} />
              <text x="14" y="9">{l}</text>
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}

/* ===== KYC funnel chart (proper proportional widths) ===== */

export function AdminFunnelChart({
  steps,
}: {
  steps: ReadonlyArray<{ label: string; value: number; conversionFromPrev?: string }>;
}) {
  const max = Math.max(...steps.map((s) => s.value), 1);
  return (
    <div className="space-y-1.5">
      {steps.map((s, i) => {
        const pct = Math.max(8, (s.value / max) * 100);
        return (
          <div key={i} className="flex items-center gap-2">
            <span className="font-mono text-micro tracking-[0.14em] uppercase text-text-tertiary w-24 shrink-0">{s.label}</span>
            <div className="flex-1 h-7 bg-bg-sunken rounded-sm relative overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-royal/70 rounded-sm flex items-center justify-end pr-2 prog-sweep"
                style={{ width: `${pct}%` }}
              >
                <span className="font-mono text-micro tabular text-white">{s.value.toLocaleString()}</span>
              </div>
            </div>
            {s.conversionFromPrev && (
              <span className="font-mono text-micro tracking-wider text-gold w-14 text-right shrink-0">{s.conversionFromPrev}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function compact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000)     return `${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000)         return `${Math.round(n / 1_000)}K`;
  return Math.round(n).toString();
}
