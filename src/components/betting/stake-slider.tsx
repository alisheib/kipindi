"use client";

import { useId, useMemo, useState } from "react";
import { cn, formatTzs } from "@/lib/utils";
import { CountUp } from "@/components/ui/count-up";

export function StakeSlider({
  min = 100,
  max = 50_000,
  step = 100,
  value: controlled,
  onChange,
  payRate = 2.4,
  balance,
  disabled,
  className,
}: {
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  onChange?: (v: number) => void;
  payRate?: number;
  balance?: number;
  disabled?: boolean;
  className?: string;
}) {
  const [internal, setInternal] = useState(controlled ?? Math.round((min + max) / 8 / step) * step);
  const value = controlled ?? internal;
  const id = useId();

  const set = (v: number) => {
    const clamped = Math.max(min, Math.min(max, v));
    if (!controlled) setInternal(clamped);
    onChange?.(clamped);
  };

  const pct = useMemo(() => ((value - min) / (max - min)) * 100, [value, min, max]);
  const potential = Math.round(value * payRate);
  const tooMuch = balance !== undefined && value > balance;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md bg-bg-sunken/60 border border-border-subtle px-3 py-2">
          <p className="text-micro uppercase tracking-[0.14em] text-text-tertiary font-medium">Stake · Dau</p>
          <p className="font-display font-bold text-title-md tabular text-text leading-tight">
            <CountUp value={value} format="tzs" durationMs={300} />
          </p>
        </div>
        <div className="rounded-md bg-gold-subtle/40 border border-gold-subtleHover px-3 py-2">
          <p className="text-micro uppercase tracking-[0.14em] text-gold font-medium">If you win</p>
          <p className="font-display font-bold text-title-md tabular text-gold leading-tight">
            <CountUp value={potential} format="tzs" durationMs={300} />
          </p>
        </div>
      </div>

      <div className="relative h-9 px-1">
        <div className="absolute inset-x-1 top-1/2 -translate-y-1/2 h-1.5 rounded-pill bg-bg-sunken kp-shimmer-track">
          <div
            className="absolute inset-y-0 left-0 rounded-pill bg-g-gold transition-[width] duration-short ease-decelerate"
            style={{ width: `${pct}%`, boxShadow: "0 0 12px rgba(222,188,84,0.45)" }}
          />
        </div>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => set(parseInt(e.target.value, 10))}
          aria-label="Stake amount in TZS"
          aria-valuetext={formatTzs(value)}
          className="absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer disabled:cursor-not-allowed
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6
            [&::-webkit-slider-thumb]:rounded-pill [&::-webkit-slider-thumb]:bg-gold
            [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-bg-elevated
            [&::-webkit-slider-thumb]:shadow-glow-gold
            [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-micro
            hover:[&::-webkit-slider-thumb]:scale-110
            active:[&::-webkit-slider-thumb]:scale-115
            [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6
            [&::-moz-range-thumb]:rounded-pill [&::-moz-range-thumb]:bg-gold
            [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-bg-elevated"
        />
      </div>

      <div className="flex items-center justify-between text-micro text-text-tertiary tabular">
        <span>min {formatTzs(min)}</span>
        <span>max {formatTzs(max)}</span>
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        {[500, 1_000, 2_500, 5_000, 10_000].map((v) => (
          <button
            key={v}
            type="button"
            disabled={disabled || v > max}
            onClick={() => set(v)}
            className={cn(
              "h-8 rounded-md text-label font-semibold transition-all duration-micro tabular",
              "border bg-surface text-text-secondary hover:bg-surface-hover hover:text-text",
              value === v
                ? "border-gold/70 bg-gold-subtle/50 text-gold shadow-glow-gold"
                : "border-border-subtle",
              "disabled:opacity-40 disabled:cursor-not-allowed",
            )}
          >
            {v >= 1_000 ? `${v / 1_000}K` : v}
          </button>
        ))}
      </div>

      {tooMuch && (
        <p className="text-caption text-warning bg-warning-bg/30 border border-warning-border/30 rounded-md px-2 py-1.5">
          Above your balance · Zaidi ya salio.
        </p>
      )}
    </div>
  );
}
