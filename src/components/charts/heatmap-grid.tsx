import { cn } from "@/lib/utils";

type Props = {
  data: number[][]; // rows × cols, values typically -100..100 (ROI %)
  rowLabels?: string[];
  colLabels?: string[];
  cellSize?: number;
  gap?: number;
  className?: string;
};

/** Color: cold (cyan) → neutral (text-tertiary) → hot (red) */
function colorFor(v: number) {
  const clamped = Math.max(-100, Math.min(100, v));
  if (clamped < -20) return "var(--bet-cold)";
  if (clamped < -5) return "color-mix(in srgb, var(--bet-cold) 50%, transparent)";
  if (clamped < 5) return "var(--surface-pressed)";
  if (clamped < 20) return "color-mix(in srgb, var(--gold) 50%, transparent)";
  if (clamped < 40) return "var(--gold)";
  return "var(--bet-hot)";
}

export function HeatmapGrid({
  data,
  rowLabels = [],
  colLabels = [],
  cellSize = 28,
  gap = 3,
  className,
}: Props) {
  return (
    <div className={cn("inline-flex flex-col gap-1", className)}>
      {colLabels.length > 0 && (
        <div className="flex" style={{ gap, paddingLeft: rowLabels.length ? 44 : 0 }}>
          {colLabels.map((l) => (
            <div
              key={l}
              className="text-micro text-text-tertiary uppercase tracking-wide text-center font-medium"
              style={{ width: cellSize }}
            >
              {l}
            </div>
          ))}
        </div>
      )}
      {data.map((row, ri) => (
        <div key={ri} className="flex items-center" style={{ gap }}>
          {rowLabels[ri] !== undefined && (
            <div
              className="text-caption text-text-secondary text-right pr-1.5 tabular font-medium"
              style={{ width: 40 }}
            >
              {rowLabels[ri]}
            </div>
          )}
          {row.map((v, ci) => (
            <div
              key={ci}
              className="rounded-sm"
              style={{
                width: cellSize,
                height: cellSize,
                background: colorFor(v),
                border: "1px solid color-mix(in srgb, currentColor 8%, transparent)",
              }}
              title={`${rowLabels[ri] ?? ""} ${colLabels[ci] ?? ""}: ${v.toFixed(1)}%`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
