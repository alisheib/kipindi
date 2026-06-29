"use client";

/**
 * DurationInput — a numeric input with an inline d/h/m unit picker.
 *
 * The operator types a number and picks the unit (days, hours, minutes).
 * The component always stores and emits a value in MINUTES internally so
 * every consumer works with one canonical unit — no conversion ambiguity.
 *
 * Visual design matches TimeSelect: same h-9/h-11 height, same rounded-lg
 * border, same bg-bg-inset/bg-bg-elevated chrome, same font-mono. The unit
 * selector sits in a right-hand cell with tiny chevron arrows stacked above
 * and below to signal it's clickable — each click cycles d → h → m → d.
 *
 * A live "= 2d 6h" echo is shown below the field (like TimeSelect's 12-hour
 * preview) so the operator always sees the human-readable equivalent.
 */

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { sanitizeNumericInput } from "@/components/ui/input";

type Unit = "d" | "h" | "m";

const UNIT_LABELS: Record<Unit, string> = { d: "day", h: "hr", m: "min" };
const UNIT_TO_MINUTES: Record<Unit, number> = { d: 1440, h: 60, m: 1 };
const UNITS: Unit[] = ["d", "h", "m"];

/** Decompose total minutes into the largest clean unit + value.
 *  1440 → { value: 1, unit: "d" }, 90 → { value: 90, unit: "m" },
 *  120 → { value: 2, unit: "h" }, 2880 → { value: 2, unit: "d" }. */
function decompose(totalMinutes: number): { value: number; unit: Unit } {
  if (totalMinutes > 0 && totalMinutes % 1440 === 0) return { value: totalMinutes / 1440, unit: "d" };
  if (totalMinutes > 0 && totalMinutes % 60 === 0) return { value: totalMinutes / 60, unit: "h" };
  return { value: totalMinutes, unit: "m" };
}

/** Human-readable duration string: "2d", "3h", "90m", "1d 6h", "2h 30m". */
export function formatDuration(totalMinutes: number): string {
  if (totalMinutes <= 0) return "0m";
  const d = Math.floor(totalMinutes / 1440);
  const h = Math.floor((totalMinutes % 1440) / 60);
  const m = totalMinutes % 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  return parts.join(" ") || "0m";
}

/** Clamp total minutes to a sane range. */
function clampMinutes(v: number, min: number, max: number): number {
  if (!Number.isFinite(v) || v < 0) return min;
  return Math.max(min, Math.min(max, Math.round(v)));
}

type Props = {
  /** Current value in MINUTES. */
  value: number;
  /** Called with the new value in MINUTES. */
  onChange: (minutes: number) => void;
  /** Minimum allowed value in minutes (default 0). */
  min?: number;
  /** Maximum allowed value in minutes (default 43200 = 30 days). */
  max?: number;
  size?: "sm" | "md";
  error?: boolean;
  className?: string;
  "aria-label"?: string;
};

export function DurationInput({
  value,
  onChange,
  min = 0,
  max = 43200,
  size = "sm",
  error,
  className,
  ...rest
}: Props) {
  const clamped = clampMinutes(value, min, max);
  const initial = decompose(clamped);
  const [unit, setUnit] = useState<Unit>(initial.unit);
  const [display, setDisplay] = useState(String(initial.value));
  const lastEmit = useRef(clamped);

  // Sync from parent when value changes externally
  useEffect(() => {
    if (value === lastEmit.current) return;
    const d = decompose(clampMinutes(value, min, max));
    setUnit(d.unit);
    setDisplay(String(d.value));
    lastEmit.current = value;
  }, [value, min, max]);

  const emit = (numStr: string, u: Unit) => {
    const n = Number(numStr);
    if (!Number.isFinite(n) || n < 0) return;
    const totalMin = clampMinutes(Math.round(n * UNIT_TO_MINUTES[u]), min, max);
    lastEmit.current = totalMin;
    onChange(totalMin);
  };

  const onValueChange = (raw: string) => {
    const clean = sanitizeNumericInput(raw, { decimal: false, negative: false });
    setDisplay(clean);
    emit(clean, unit);
  };

  const setUnitAndConvert = (next: Unit) => {
    const prev = unit;
    setUnit(next);
    const currentMinutes = Number(display) * UNIT_TO_MINUTES[prev];
    if (Number.isFinite(currentMinutes) && currentMinutes > 0) {
      const newVal = currentMinutes / UNIT_TO_MINUTES[next];
      const rounded = Math.round(newVal);
      setDisplay(String(Number.isInteger(newVal) ? newVal : rounded));
      emit(String(rounded), next);
    } else {
      emit(display, next);
    }
  };

  const cycleUp = () => {
    const idx = UNITS.indexOf(unit);
    setUnitAndConvert(UNITS[(idx + UNITS.length - 1) % UNITS.length]);
  };
  const cycleDown = () => {
    const idx = UNITS.indexOf(unit);
    setUnitAndConvert(UNITS[(idx + 1) % UNITS.length]);
  };

  const h = size === "sm" ? "h-9" : "h-11";
  const fs = size === "sm" ? "text-[13px]" : "text-[16px]";
  const errored = !!error;
  const totalMin = clampMinutes(Math.round(Number(display) * UNIT_TO_MINUTES[unit]), min, max);
  const preview = formatDuration(totalMin);

  /* Tiny chevron SVG — 8×5 arrow, currentColor. */
  const Chev = ({ up }: { up?: boolean }) => (
    <svg width="8" height="5" viewBox="0 0 8 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {up ? <path d="M1 4l3-3 3 3" /> : <path d="M1 1l3 3 3-3" />}
    </svg>
  );

  return (
    <div className={cn("inline-flex flex-col", className)}>
      <div
        className={cn(
          "inline-flex items-stretch rounded-lg border overflow-hidden brand-focus-within transition-colors w-full",
          h,
          errored ? "border-no-500" : "border-border",
        )}
        style={{ background: errored ? "oklch(58% 0.2 25 / 0.08)" : "var(--bg-inset)" }}
        role="group"
        aria-label={rest["aria-label"] ?? "Duration"}
      >
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          data-1p-ignore
          data-lpignore="true"
          value={display}
          placeholder="0"
          aria-label="Duration value"
          className={cn(
            "flex-1 min-w-0 bg-transparent px-2.5 text-text outline-none font-mono tabular-nums text-right placeholder:text-text-subtle/40",
            fs,
          )}
          onChange={(e) => onValueChange(e.target.value)}
          onBlur={() => {
            const n = Number(display);
            if (!Number.isFinite(n) || n < 0) {
              const d = decompose(clampMinutes(min, min, max));
              setDisplay(String(d.value));
              setUnit(d.unit);
              emit(String(d.value), d.unit);
            }
          }}
        />
        {/* Unit picker — stacked chevrons + label in a clickable right cell */}
        <button
          type="button"
          onClick={cycleDown}
          tabIndex={-1}
          className={cn(
            "inline-flex flex-col items-center justify-center gap-0 px-2 bg-bg-elevated border-l border-border shrink-0 select-none cursor-pointer hover:bg-bg-overlay transition-colors group",
            size === "sm" ? "min-w-[42px]" : "min-w-[48px]",
          )}
          aria-label={`Unit: ${UNIT_LABELS[unit]}. Click to change.`}
        >
          <span className="text-text-subtle/40 group-hover:text-text-subtle transition-colors leading-none"><Chev up /></span>
          <span className={cn(
            "font-mono uppercase tracking-[0.06em] text-text-subtle group-hover:text-text transition-colors leading-none",
            size === "sm" ? "text-[9px]" : "text-[10px]",
          )}>
            {UNIT_LABELS[unit]}
          </span>
          <span className="text-text-subtle/40 group-hover:text-text-subtle transition-colors leading-none"><Chev /></span>
        </button>
      </div>
      {totalMin > 0 && (
        <span className="mt-0.5 font-mono text-[9px] text-text-subtle tabular-nums">= {preview}</span>
      )}
    </div>
  );
}
