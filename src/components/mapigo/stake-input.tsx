"use client";

import { useState } from "react";
import { cn, formatTzs } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const QUICK_STAKES = [200, 500, 1_000, 2_500, 5_000];

export function MapigoStakeInput({
  value: controlled,
  onChange,
  payRate,
  disabled,
  onPlace,
  selectedCall,
  className,
}: {
  value?: number;
  onChange?: (v: number) => void;
  payRate: number;
  disabled?: boolean;
  onPlace?: () => void;
  selectedCall: string | null;
  className?: string;
}) {
  const [internal, setInternal] = useState(controlled ?? 1_000);
  const value = controlled ?? internal;
  const setVal = (v: number) => {
    const clamped = Math.max(100, Math.min(50_000, v));
    if (controlled === undefined) setInternal(clamped);
    onChange?.(clamped);
  };
  const potential = Math.round(value * payRate);

  return (
    <div className={cn("rounded-xl border border-border bg-surface/70 backdrop-blur-md p-3 lg:p-4 space-y-3", className)}>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md bg-bg-sunken/60 border border-border-subtle px-3 py-2">
          <p className="text-micro uppercase tracking-[0.14em] text-text-tertiary font-bold">Stake · Dau</p>
          <p className="font-display font-bold text-title-sm tabular text-text leading-tight">{formatTzs(value)}</p>
        </div>
        <div className="rounded-md bg-gold-subtle/40 border border-gold-subtleHover/40 px-3 py-2">
          <p className="text-micro uppercase tracking-[0.14em] text-gold font-bold">If you win</p>
          <p className="font-display font-bold text-title-sm tabular text-gold leading-tight">{formatTzs(potential)}</p>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {QUICK_STAKES.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setVal(v)}
            disabled={disabled}
            className={cn(
              "h-9 rounded-md text-label font-bold transition-all duration-micro tabular border",
              value === v
                ? "border-gold/70 bg-gold-subtle/50 text-gold shadow-[0_0_12px_rgba(222,188,84,0.25)]"
                : "border-border-subtle bg-surface text-text-secondary hover:bg-surface-hover hover:text-text",
            )}
          >
            {v >= 1_000 ? `${v / 1_000}K` : v}
          </button>
        ))}
      </div>
      <Button
        variant="gold"
        size="xl"
        fullWidth
        disabled={disabled || !selectedCall}
        onClick={onPlace}
      >
        {selectedCall ? `Place ${selectedCall} · ${formatTzs(value)}` : "Pick a call · Chagua"}
      </Button>
      <p className="text-micro text-text-tertiary text-center tracking-wide">
        One call per round. 18+. Pool grows whether you win or lose.
      </p>
    </div>
  );
}
