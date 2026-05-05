/**
 * Circular progress / confidence ring — ported from the 50pick design kit.
 * Used on /admin/resolver-queue for officer-confidence rings, on /profile for
 * session-time clocks, and on /profile/kyc for step indicators.
 */
import { cn } from "@/lib/utils";

type Tone = "teal" | "yes" | "no" | "gold" | "warning";
type Props = {
  value: number; // 0..100
  size?: number;
  stroke?: number;
  tone?: Tone;
  label?: string;
  className?: string;
};

const COLOR_MAP: Record<Tone, string> = {
  teal:    "var(--teal-400)",
  yes:     "var(--yes-400)",
  no:      "var(--no-400)",
  gold:    "var(--gold-400)",
  warning: "var(--warning-500)",
};

export function CircularProgress({ value, size = 56, stroke = 5, tone = "teal", label, className }: Props) {
  const v = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (v / 100) * c;
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--bg-overlay)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={COLOR_MAP[tone]}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset var(--ease-stage)" }}
        />
      </svg>
      <span
        className="absolute inset-0 grid place-items-center font-mono font-semibold text-text"
        style={{ fontSize: size > 60 ? 14 : 11 }}
      >
        {label ?? `${v}%`}
      </span>
    </div>
  );
}
