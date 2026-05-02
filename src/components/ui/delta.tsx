import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export function Delta({
  value,
  format = "pct",
  size = "sm",
  filled = false,
  className,
}: {
  value: number;
  format?: "pct" | "abs" | "tzs";
  size?: "xs" | "sm" | "md";
  filled?: boolean;
  className?: string;
}) {
  const positive = value > 0.0001;
  const negative = value < -0.0001;
  const sign = positive ? "+" : negative ? "−" : "";
  const abs = Math.abs(value);
  const formatted =
    format === "pct" ? `${sign}${abs.toFixed(1)}%` :
    format === "tzs" ? `${sign}TZS ${Math.round(abs).toLocaleString()}` :
    `${sign}${abs.toLocaleString()}`;

  // Brand-aligned: positive = gold (winning is gold), negative = muted danger, neutral = tertiary.
  const tone = positive ? "text-gold" : negative ? "text-danger" : "text-text-tertiary";
  const sizeClass = size === "xs" ? "text-micro" : size === "md" ? "text-label" : "text-caption";
  const Icon = positive ? ArrowUp : negative ? ArrowDown : Minus;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-bold tabular tracking-wide",
        tone,
        sizeClass,
        filled && "px-1 h-5 rounded-sm border",
        filled && positive && "bg-gold-subtle/40 border-gold-subtleHover/30",
        filled && negative && "bg-danger-bg/30 border-danger/20",
        className,
      )}
    >
      <Icon size={size === "xs" ? 10 : 12} strokeWidth={2.75} />
      {formatted}
    </span>
  );
}
