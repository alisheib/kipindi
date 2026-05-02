import { useMemo } from "react";

type Props = {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  filled?: boolean;
  showDot?: boolean;
  className?: string;
  strokeWidth?: number;
};

export function Sparkline({
  data,
  width = 96,
  height = 28,
  color = "var(--royal)",
  filled = true,
  showDot = true,
  className,
  strokeWidth = 1.5,
}: Props) {
  const { path, area, last } = useMemo(() => {
    if (!data.length) return { path: "", area: "", last: null };
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const w = width;
    const h = height;
    const points = data.map((v, i) => [
      (i / (data.length - 1)) * w,
      h - ((v - min) / range) * (h - 2) - 1,
    ]);
    const p = points
      .map((pt, i) => `${i === 0 ? "M" : "L"} ${pt[0].toFixed(1)} ${pt[1].toFixed(1)}`)
      .join(" ");
    const a = `${p} L ${w} ${h} L 0 ${h} Z`;
    return { path: p, area: a, last: points[points.length - 1] };
  }, [data, width, height]);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden
    >
      {filled && <path d={area} fill={color} fillOpacity={0.16} />}
      <path d={path} stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {showDot && last && (
        <circle cx={last[0]} cy={last[1]} r={2.4} fill={color} />
      )}
    </svg>
  );
}
