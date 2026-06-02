/**
 * PriceChart — YES probability over time. The primary market viz on
 * /markets/[id]. Ported 1:1 from kit/microstructure.jsx → PriceChart.
 *
 * Renders an SVG line + area fill, with end-marker price tag, gridlines at
 * 0/25/50/75/100, and 4 evenly-spaced X labels.
 */
type Point = { t: string; yes: number };

export function PriceChart({
  data,
  width = 720,
  height = 220,
  showArea = true,
  className,
}: {
  data: Point[];
  width?: number;
  height?: number;
  showArea?: boolean;
  className?: string;
}) {
  if (data.length < 2) return null;
  const padL = 8, padR = 56, padT = 16, padB = 28;
  const w = width - padL - padR;
  const h = height - padT - padB;

  const xs = data.map((_, i) => padL + (i / (data.length - 1)) * w);
  const ys = data.map((d) => padT + (1 - d.yes) * h);

  const linePath = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x} ${ys[i]}`).join(" ");
  const areaPath = `${linePath} L ${xs[xs.length - 1]} ${padT + h} L ${xs[0]} ${padT + h} Z`;

  const last = data[data.length - 1];
  const lastY = ys[ys.length - 1];
  const lastPctColor = last.yes >= 0.5 ? "oklch(70% 0.13 152)" : "oklch(70% 0.16 22)";

  const xTicks = [0, Math.floor(data.length / 3), Math.floor((2 * data.length) / 3), data.length - 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} style={{ display: "block" }} className={className} aria-label="YES probability over time">
      <defs>
        <linearGradient id="pc-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(58% 0.16 152)" stopOpacity="0.32" />
          <stop offset="100%" stopColor="oklch(58% 0.16 152)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="pc-line" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(72% 0.13 152)" />
          <stop offset="100%" stopColor="oklch(58% 0.14 215)" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((p) => {
        const y = padT + (1 - p) * h;
        return (
          <g key={p}>
            <line
              x1={padL}
              y1={y}
              x2={padL + w}
              y2={y}
              // Royal-axis gridlines, subtler against the royal canvas; the
              // 50% midline is gilt to anchor the chart heraldically.
              stroke={p === 0.5 ? "oklch(78% 0.13 80 / 0.55)" : "oklch(60% 0.16 268 / 0.40)"}
              strokeDasharray={p === 0.5 ? "0" : "2 3"}
              strokeWidth="0.6"
            />
            <text
              x={padL + w + 4}
              y={y + 3}
              fontFamily="JetBrains Mono, monospace"
              fontSize="9"
              fill="oklch(82% 0.06 268)"
              letterSpacing="0.05em"
            >
              {Math.round(p * 100)}
            </text>
          </g>
        );
      })}
      {xTicks.map((i) => (
        <text key={i} x={xs[i]} y={height - 8} fontFamily="JetBrains Mono, monospace" fontSize="9" fill="oklch(82% 0.06 268)" textAnchor="middle">
          {data[i].t}
        </text>
      ))}
      {showArea && <path d={areaPath} fill="url(#pc-area)" />}
      <path d={linePath} fill="none" stroke="url(#pc-line)" strokeWidth="2" strokeLinejoin="round" />
      <circle cx={xs[xs.length - 1]} cy={lastY} r="4" fill="oklch(72% 0.13 152)" stroke="oklch(38% 0.20 268)" strokeWidth="2" />
      <g transform={`translate(${xs[xs.length - 1] + 8}, ${lastY - 10})`}>
        <rect x="0" y="0" width="46" height="20" rx="4" fill="oklch(34% 0.10 152)" stroke="oklch(58% 0.16 152)" />
        <text
          x="23"
          y="14"
          textAnchor="middle"
          fontFamily="JetBrains Mono, monospace"
          fontWeight="700"
          fontSize="11"
          fill={lastPctColor}
          letterSpacing="0.03em"
        >
          {Math.round(last.yes * 100)}%
        </text>
      </g>
    </svg>
  );
}

/** VolumeSparkline — kit ports for inline density bars. */
export function VolumeSparkline({ data, width = 220, height = 38, className }: { data: number[]; width?: number; height?: number; className?: string }) {
  if (data.length === 0) return null;
  const max = Math.max(...data);
  const barW = (width - data.length * 2) / data.length;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className={className} aria-label="Volume sparkline">
      {data.map((v, i) => {
        const h = (v / max) * (height - 4);
        return (
          <rect key={i} x={i * (barW + 2)} y={height - h - 2} width={barW} height={h} rx="1" fill="oklch(80% 0.10 195)" opacity={0.35 + 0.65 * (v / max)} />
        );
      })}
    </svg>
  );
}
