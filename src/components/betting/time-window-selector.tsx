"use client";

import { cn } from "@/lib/utils";
import type { Match } from "@/lib/mock-data";

export function TimeWindowSelector({
  windows,
  value,
  onChange,
  className,
}: {
  windows: Match["windows"];
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-1", className)} role="radiogroup" aria-label="Time window">
      {windows.map((w) => {
        const closed = w.status === "closed" || w.status === "settled";
        const selected = value === w.kind;
        return (
          <button
            key={w.kind}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={closed}
            onClick={() => onChange(w.kind)}
            className={cn(
              "relative h-7 px-3 rounded-md text-label font-medium transition-all duration-micro ease-standard",
              "border",
              closed
                ? "border-border-subtle text-text-disabled line-through cursor-not-allowed"
                : selected
                  ? "border-border bg-surface text-text"
                  : "border-border-subtle text-text-secondary hover:bg-surface-hover hover:text-text",
            )}
          >
            {w.label}
            {selected && !closed && (
              <span className="absolute left-2 right-2 -bottom-px h-0.5 rounded-pill bg-gold" />
            )}
            {w.status === "live" && !selected && (
              <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-pill bg-success animate-pulse" />
            )}
          </button>
        );
      })}
    </div>
  );
}
