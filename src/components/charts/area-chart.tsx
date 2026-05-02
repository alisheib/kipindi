import { useMemo } from "react";

type Props = {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
  showAxisLabels?: boolean;
  highlight?: number; // index to highlight with a vertical line
};

export function AreaChart({
  data,
  width = 480,
  height = 140,
  color = "var(--gold)",
  className,
  showAxisLabels = false,
  highlight,
}: Props) {
  const { path, area, last, gridLines, points } = useMemo(() => {
    if (!data.length) return { path: "", area: "", last: null, gridLines: [], points: [] };
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const padTop = 8;
    const padBot = 8;
    const usable = height - padTop - padBot;
    const pts = data.map((v, i) => [
      (i / (data.length - 1)) * width,
      padTop + (1 - (v - min) / range) * usable,
    ]);
    const p = pts
      .map((pt, i) => `${i === 0 ? "M" : "L"} ${pt[0].toFixed(1)} ${pt[1].toFixed(1)}`)
      .join(" ");
    const a = `${p} L ${width} ${height} L 0 ${height} Z`;
    const gl = [0.25, 0.5, 0.75].map((y) => padTop + y * usable);
    return { path: p, area: a, last: pts[pts.length - 1], gridLines: gl, points: pts };
  }, [data, width, height]);

  const highlightX = highlight !== undefined && points[highlight] ? points[highlight][0] : null;

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="kp-area-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.4} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {gridLines.map((y, i) => (
        <line key={i} x1={0} x2={width} y1={y} y2={y} stroke="var(--border-subtle)" strokeWidth={0.5} strokeDasharray="2 4" />
      ))}
      <path d={area} fill="url(#kp-area-fill)" />
      <path d={path} stroke={color} strokeWidth={1.75} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {highlightX !== null && (
        <line x1={highlightX} x2={highlightX} y1={0} y2={height} stroke={color} strokeWidth={1} strokeDasharray="2 3" opacity={0.5} />
      )}
      {last && (
        <>
          <circle cx={last[0]} cy={last[1]} r={4} fill={color} />
          <circle cx={last[0]} cy={last[1]} r={8} fill={color} fillOpacity={0.25} />
        </>
      )}
    </svg>
  );
}
