type Segment = { value: number; color: string; label?: string };

export function MiniDonut({
  segments,
  size = 64,
  thickness = 8,
  centerLabel,
  centerSub,
  className,
}: {
  segments: Segment[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerSub?: string;
  className?: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const c = 2 * Math.PI * r;

  let acc = 0;
  return (
    <div className={className} style={{ width: size, height: size, position: "relative" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--surface-pressed)" strokeWidth={thickness} />
        {segments.map((seg, i) => {
          const dash = (seg.value / total) * c;
          const offset = -acc;
          acc += dash;
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={thickness}
              strokeLinecap="butt"
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          );
        })}
      </svg>
      {(centerLabel || centerSub) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          {centerLabel && <span className="font-display font-bold text-label tabular text-text leading-none">{centerLabel}</span>}
          {centerSub && <span className="text-micro text-text-tertiary leading-none mt-0.5">{centerSub}</span>}
        </div>
      )}
    </div>
  );
}
