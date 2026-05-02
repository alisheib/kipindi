"use client";

import { cn, formatTzsCompact } from "@/lib/utils";

export function RoundBanner({
  number,
  elapsedSec,
  totalSec = 60,
  pool,
  participants,
  className,
}: {
  number: number;
  elapsedSec: number;
  totalSec?: number;
  pool: number;
  participants: number;
  className?: string;
}) {
  const pct = Math.min(100, (elapsedSec / totalSec) * 100);
  const remaining = Math.max(0, totalSec - elapsedSec);
  return (
    <div className={cn("relative rounded-xl border border-gold-subtleHover/40 bg-bg-elevated/70 backdrop-blur-md overflow-hidden", className)}>
      <div className="flex items-center justify-between gap-3 px-4 py-3 lg:px-5 lg:py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-micro uppercase tracking-[0.16em] text-text-tertiary font-bold">Round</span>
            <span className="font-display font-bold text-title-md tabular text-text leading-none">#{number}</span>
          </div>
          <span aria-hidden className="h-9 w-px bg-border-divider" />
          <div>
            <p className="text-micro uppercase tracking-[0.14em] text-text-tertiary font-bold">Pool</p>
            <p className="font-display font-bold text-title-sm tabular text-gold leading-none">{formatTzsCompact(pool)}</p>
          </div>
          <span aria-hidden className="hidden sm:inline-block h-9 w-px bg-border-divider" />
          <div className="hidden sm:block">
            <p className="text-micro uppercase tracking-[0.14em] text-text-tertiary font-bold">Players</p>
            <p className="font-display font-bold text-title-sm tabular text-text leading-none">{participants}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-micro uppercase tracking-[0.14em] text-text-tertiary font-bold">Closes in</p>
          <p className="font-mono font-bold text-title-sm tabular text-gold leading-none">
            {String(Math.floor(remaining / 60)).padStart(1, "0")}:{String(Math.floor(remaining % 60)).padStart(2, "0")}
          </p>
        </div>
      </div>
      <div className="h-0.5 w-full bg-bg-sunken">
        <div className="h-full bg-gold transition-[width] duration-medium ease-decelerate" style={{ width: `${pct}%`, boxShadow: "0 0 12px rgba(222,188,84,0.45)" }} />
      </div>
    </div>
  );
}
