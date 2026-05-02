/**
 * Admin chart components — pure SVG, no external charting library.
 * Each chart is a server component (no client-side state needed; data is
 * passed in as props). Animations come from the parent design system.
 */

export type SeriesPoint = { x: number; y: number };

/* ===== Mini area chart (KPI sparkline at scale) ===== */

export function AdminAreaChart({
  series,
  height = 220,
  width = 480,
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
        className="rounded-md bg-bg-sunken border border-dashed border-border-subtle flex items-center justify-center text-caption text-text-tertiary"
        style={{ minHeight: height }}
      >
        No data in this window
      </div>
    );
  }
  const padX = 28;
  const padY = 18;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const maxY = Math.max(...series.map((p) => p.y), 1);
  const minY = Math.min(...series.map((p) => p.y), 0);
  const range = Math.max(maxY - minY, 1);
  const xs = series.map((_, i) => padX + (i / Math.max(1, series.length - 1)) * innerW);
  const ys = series.map((p) => padY + innerH - ((p.y - minY) / range) * innerH);

  const linePath = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${xs[xs.length - 1].toFixed(1)} ${(padY + innerH).toFixed(1)} L ${xs[0].toFixed(1)} ${(padY + innerH).toFixed(1)} Z`;

  // Y-axis ticks (4)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => minY + t * range);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto block"
      role="img"
      aria-label={yLabel ? `${yLabel} time series` : "Time series chart"}
      style={{ maxHeight: height }}
    >
      <defs>
        <linearGradient id="kp-area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillVar} stopOpacity={fillOpacity} />
          <stop offset="100%" stopColor={fillVar} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Y-axis grid */}
      {yTicks.map((t, i) => {
        const y = padY + innerH - ((t - minY) / range) * innerH;
        return (
          <g key={i}>
            <line x1={padX} y1={y} x2={width - padX} y2={y} stroke="var(--border-subtle)" strokeDasharray="2 3" strokeWidth="1" />
            <text
              x={padX - 6}
              y={y + 3}
              textAnchor="end"
              fontFamily="JetBrains Mono"
              fontSize="9"
              fill="var(--text-tertiary)"
            >
              {compact(t)}
            </text>
          </g>
        );
      })}
      {/* Area + line */}
      <path d={areaPath} fill="url(#kp-area-grad)" />
      <path d={linePath} stroke={strokeVar} strokeWidth="1.75" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      {/* End-point dot */}
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="3" fill={strokeVar} />
      {/* X-axis labels (first + middle + last) */}
      {xLabels && xLabels.length > 0 && (
        <g fontFamily="JetBrains Mono" fontSize="9" fill="var(--text-tertiary)">
          {[0, Math.floor(xLabels.length / 2), xLabels.length - 1].map((idx) => (
            <text key={idx} x={xs[idx] ?? padX + (idx / xs.length) * innerW} y={height - 4} textAnchor={idx === 0 ? "start" : idx === xLabels.length - 1 ? "end" : "middle"}>
              {xLabels[idx]}
            </text>
          ))}
        </g>
      )}
    </svg>
  );
}

/* ===== Multi-series stacked bar (provider mix over time) ===== */

export function AdminStackedBars({
  bars,
  height = 180,
  width = 480,
  colors = ["var(--royal)", "var(--gold)", "#3a4a76", "#7588B1", "#A6B0C8"],
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
        className="rounded-md bg-bg-sunken border border-dashed border-border-subtle flex items-center justify-center text-caption text-text-tertiary"
        style={{ minHeight: height }}
      >
        No data
      </div>
    );
  }
  const padX = 22;
  const padY = 14;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2 - 18; // space for x labels
  const maxStack = Math.max(...bars.map((b) => b.segments.reduce((s, v) => s + v, 0)), 1);
  const barW = (innerW / bars.length) * 0.7;
  const gap = (innerW / bars.length) * 0.3;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto block" role="img" aria-label="Stacked bar chart">
      {bars.map((b, i) => {
        let yCursor = padY + innerH;
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
            <text
              x={x + barW / 2}
              y={height - 4}
              textAnchor="middle"
              fontFamily="JetBrains Mono"
              fontSize="9"
              fill="var(--text-tertiary)"
            >
              {b.label}
            </text>
          </g>
        );
      })}
      {legend && (
        <g fontFamily="JetBrains Mono" fontSize="9" fill="var(--text-secondary)">
          {legend.map((l, i) => (
            <g key={i} transform={`translate(${padX + i * 80}, ${padY - 4})`}>
              <rect width="9" height="9" fill={colors[i % colors.length]} />
              <text x="13" y="8">{l}</text>
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
  height = 80,
}: {
  steps: ReadonlyArray<{ label: string; value: number; conversionFromPrev?: string }>;
  height?: number;
}) {
  const max = Math.max(...steps.map((s) => s.value), 1);
  return (
    <div className="space-y-1.5">
      {steps.map((s, i) => {
        const pct = Math.max(8, (s.value / max) * 100);
        return (
          <div key={i} className="flex items-center gap-2">
            <span className="font-mono text-micro tracking-[0.14em] uppercase text-text-tertiary w-20 shrink-0">{s.label}</span>
            <div className="flex-1 h-7 bg-bg-sunken rounded-sm relative overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-royal/70 rounded-sm flex items-center justify-end pr-2"
                style={{ width: `${pct}%` }}
              >
                <span className="font-mono text-micro tabular text-white">{s.value.toLocaleString()}</span>
              </div>
            </div>
            {s.conversionFromPrev && (
              <span className="font-mono text-micro tracking-wider text-gold w-12 text-right shrink-0">{s.conversionFromPrev}</span>
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
