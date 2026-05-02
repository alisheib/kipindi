import type { CSSProperties } from "react";

export function RadialGauge({
  value,
  max = 100,
  size = 96,
  thickness = 10,
  color = "var(--royal)",
  trackColor = "var(--surface-pressed)",
  label,
  sublabel,
  glow = false,
  className,
}: {
  value: number;
  max?: number;
  size?: number;
  thickness?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  sublabel?: string;
  glow?: boolean;
  className?: string;
}) {
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  const dash = c * pct;

  const wrapStyle: CSSProperties | undefined = glow
    ? { filter: `drop-shadow(0 0 12px ${color === "var(--gold)" ? "rgba(222,188,84,0.45)" : "rgba(79,112,194,0.4)"})` }
    : undefined;

  return (
    <div className={className} style={{ width: size, height: size, position: "relative" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={wrapStyle}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={trackColor} strokeWidth={thickness} />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          strokeDashoffset={c * 0.25}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {label && <span className="font-display font-bold text-title-md tabular text-text leading-none">{label}</span>}
        {sublabel && <span className="text-caption text-text-tertiary leading-tight mt-0.5">{sublabel}</span>}
      </div>
    </div>
  );
}
