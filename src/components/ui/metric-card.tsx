import type { ReactNode } from "react";
import { Card, CardBody } from "./card";
import { Sparkline } from "@/components/charts/sparkline";
import { Delta } from "./delta";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  delta,
  deltaFormat = "pct",
  trend,
  trendColor = "var(--royal)",
  icon,
  accent,
  hint,
  className,
}: {
  label: string;
  value: ReactNode;
  delta?: number;
  deltaFormat?: "pct" | "abs" | "tzs";
  trend?: number[];
  trendColor?: string;
  icon?: ReactNode;
  accent?: "gold" | "royal" | "neutral";
  hint?: string;
  className?: string;
}) {
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      {accent === "gold" && (
        <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-gold" />
      )}
      {accent === "royal" && (
        <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-royal" />
      )}
      <CardBody className="space-y-1.5">
        <div className="flex items-center justify-between gap-1.5">
          <p className="text-micro uppercase tracking-[0.14em] text-text-tertiary font-bold">{label}</p>
          {icon && <span className="text-text-tertiary shrink-0">{icon}</span>}
        </div>
        <p className="font-display font-bold text-title-md lg:text-title-lg tabular text-text leading-none">{value}</p>
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-1.5">
            {delta !== undefined && <Delta value={delta} format={deltaFormat} size="xs" />}
            {hint && <span className="text-micro text-text-tertiary">{hint}</span>}
          </div>
          {trend && trend.length > 1 && <Sparkline data={trend} color={trendColor} width={72} height={22} />}
        </div>
      </CardBody>
    </Card>
  );
}
