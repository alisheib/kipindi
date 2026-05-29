/**
 * Skeleton — kit-faithful (kit/atoms.jsx → Skeleton).
 * Uses the kp-shimmer-track keyframe in globals.css (theme-adaptive: track +
 * sheen are derived from --bg-overlay + --teal-500 via color-mix).
 */
import { cn } from "@/lib/utils";

export function Skeleton({
  w,
  h = 12,
  r = 6,
  className,
}: {
  w?: number | string;
  h?: number | string;
  r?: number | string;
  className?: string;
}) {
  return (
    <div
      className={cn("skeleton", !w && "w-full", className)}
      style={{ width: w, height: h, borderRadius: r }}
      aria-hidden
    />
  );
}

/** Shaped skeleton for a market-card row. */
export function MarketCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton w={64} h={18} r={999} />
        <Skeleton w={20} h={20} r={4} />
      </div>
      <Skeleton w="80%" h={18} />
      <Skeleton w="55%" h={12} />
      <Skeleton w="100%" h={14} r={999} />
      <div className="grid grid-cols-2 gap-2 pt-2">
        <Skeleton h={32} r={8} />
        <Skeleton h={32} r={8} />
      </div>
    </div>
  );
}
