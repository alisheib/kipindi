"use client";

/**
 * DateSelect — kit-faithful date picker using 3 dropdown selects.
 * Replaces native <input type="date"> which renders inconsistently
 * across mobile browsers. Uses short month names (Jan–Dec) so the
 * component fits on 320px phones.
 *
 * Supports both uncontrolled (name + hidden input for Server Actions)
 * and controlled (value + onChange) modes.
 */

import { useState, useMemo, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const MONTHS = [
  { value: "01", label: "Jan" },
  { value: "02", label: "Feb" },
  { value: "03", label: "Mar" },
  { value: "04", label: "Apr" },
  { value: "05", label: "May" },
  { value: "06", label: "Jun" },
  { value: "07", label: "Jul" },
  { value: "08", label: "Aug" },
  { value: "09", label: "Sep" },
  { value: "10", label: "Oct" },
  { value: "11", label: "Nov" },
  { value: "12", label: "Dec" },
];

function daysInMonth(month: number, year: number): number {
  if (!month || !year) return 31;
  return new Date(year, month, 0).getDate();
}

type Props = {
  name?: string;
  id?: string;
  required?: boolean;
  min?: string;
  max?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (iso: string) => void;
};

// Shared select styling — matches the Input atom (bg-inset, border, focus ring).
// pr-7 leaves room for the custom chevron; bg-no-repeat positions it right.
const selectCls = cn(
  "appearance-none bg-[var(--bg-inset)] border border-border rounded-lg",
  "pl-2.5 pr-7 h-12 text-[16px] text-text outline-none cursor-pointer",
  "focus:border-[var(--brand-500)] focus:shadow-[0_0_0_3px_oklch(63%_0.18_262_/_0.25)]",
  "transition-colors",
  // Custom chevron via encoded SVG background — works on every browser,
  // no extra DOM element needed.
  "bg-no-repeat bg-[length:12px_12px] bg-[position:right_8px_center]",
);

// Inline SVG chevron as a CSS background — tiny, no network request.
const chevronBg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 4.5l3 3 3-3'/%3E%3C/svg%3E")`;

export function DateSelect({ name, id, required, min, max, defaultValue, value, onChange }: Props) {
  const initial = (value ?? defaultValue ?? "").split("-");
  const [day, setDay] = useState(initial[2] ?? "");
  const [month, setMonth] = useState(initial[1] ?? "");
  const [year, setYear] = useState(initial[0] ?? "");

  const minYear = min ? parseInt(min.slice(0, 4), 10) : 1930;
  const maxYear = max ? parseInt(max.slice(0, 4), 10) : new Date().getFullYear();

  const years = useMemo(() => {
    const out: number[] = [];
    for (let y = maxYear; y >= minYear; y--) out.push(y);
    return out;
  }, [minYear, maxYear]);

  const maxDay = daysInMonth(parseInt(month, 10), parseInt(year, 10));
  const days = useMemo(() => {
    const out: number[] = [];
    for (let d = 1; d <= maxDay; d++) out.push(d);
    return out;
  }, [maxDay]);

  // Auto-correct day if month/year change makes it invalid (e.g. Feb 30 → Feb 28)
  const effectiveDay = day && parseInt(day, 10) > maxDay ? String(maxDay).padStart(2, "0") : day;

  const isoValue =
    year && month && effectiveDay
      ? `${year}-${month.padStart(2, "0")}-${effectiveDay.padStart(2, "0")}`
      : "";

  // Fire onChange in useEffect (not during render) to avoid React anti-patterns.
  const prevIso = useRef(isoValue);
  useEffect(() => {
    if (isoValue !== prevIso.current) {
      prevIso.current = isoValue;
      onChange?.(isoValue);
    }
  }, [isoValue, onChange]);

  const bgStyle = { backgroundImage: chevronBg };

  return (
    <div className="flex gap-2">
      <select
        aria-label="Day"
        value={effectiveDay}
        onChange={(e) => setDay(e.target.value)}
        className={cn(selectCls, "w-[68px] shrink-0 font-mono tabular-nums")}
        style={bgStyle}
        required={required}
      >
        <option value="" disabled>DD</option>
        {days.map((d) => (
          <option key={d} value={String(d).padStart(2, "0")}>{d}</option>
        ))}
      </select>

      <select
        aria-label="Month"
        value={month}
        onChange={(e) => setMonth(e.target.value)}
        className={cn(selectCls, "flex-1 min-w-0")}
        style={bgStyle}
        required={required}
      >
        <option value="" disabled>Month</option>
        {MONTHS.map((m) => (
          <option key={m.value} value={m.value}>{m.label}</option>
        ))}
      </select>

      <select
        aria-label="Year"
        value={year}
        onChange={(e) => setYear(e.target.value)}
        className={cn(selectCls, "w-[84px] shrink-0 font-mono tabular-nums")}
        style={bgStyle}
        required={required}
      >
        <option value="" disabled>Year</option>
        {years.map((y) => (
          <option key={y} value={String(y)}>{y}</option>
        ))}
      </select>

      {/* Hidden input for form submission — required ensures the form
          can't submit until all 3 dropdowns are filled. */}
      <input type="hidden" name={name} id={id} value={isoValue} required={required} />
    </div>
  );
}
