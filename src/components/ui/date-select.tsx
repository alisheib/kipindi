"use client";

/**
 * DateSelect — kit-faithful date picker using 3 dropdown selects
 * (day, month, year). Replaces the native <input type="date"> which
 * renders inconsistently across mobile browsers and looks foreign
 * to the dark glass kit.
 *
 * Outputs an ISO date string (YYYY-MM-DD) via a hidden input so it
 * works with progressive-enhancement form submissions (Server Actions).
 *
 * Design: matches the Input atom (bg-inset, border-border, brand-500
 * focus ring, mono font for day/year, body font for month names).
 */

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

const MONTHS = [
  { value: "01", label: "Jan", long: "January" },
  { value: "02", label: "Feb", long: "February" },
  { value: "03", label: "Mar", long: "March" },
  { value: "04", label: "Apr", long: "April" },
  { value: "05", label: "May", long: "May" },
  { value: "06", label: "Jun", long: "June" },
  { value: "07", label: "Jul", long: "July" },
  { value: "08", label: "Aug", long: "August" },
  { value: "09", label: "Sep", long: "September" },
  { value: "10", label: "Oct", long: "October" },
  { value: "11", label: "Nov", long: "November" },
  { value: "12", label: "Dec", long: "December" },
];

function daysInMonth(month: number, year: number): number {
  if (!month || !year) return 31;
  return new Date(year, month, 0).getDate();
}

type Props = {
  /** Hidden input name for the ISO date value. */
  name: string;
  id?: string;
  required?: boolean;
  /** Minimum allowed date (ISO string). */
  min?: string;
  /** Maximum allowed date (ISO string). */
  max?: string;
  /** Default value (ISO string). */
  defaultValue?: string;
};

const selectCls = cn(
  "appearance-none bg-[var(--bg-inset)] border border-border rounded-lg px-3 h-12",
  "font-mono text-[15px] text-text outline-none cursor-pointer",
  "focus:border-[var(--brand-500)] focus:shadow-[0_0_0_3px_oklch(63%_0.18_262_/_0.25)]",
  "transition-colors",
);

export function DateSelect({ name, id, required, min, max, defaultValue }: Props) {
  const parsed = defaultValue ? defaultValue.split("-") : [];
  const [year, setYear] = useState(parsed[0] ?? "");
  const [month, setMonth] = useState(parsed[1] ?? "");
  const [day, setDay] = useState(parsed[2] ?? "");

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

  // Auto-correct day if month/year change makes it invalid
  const effectiveDay = day && parseInt(day, 10) > maxDay ? String(maxDay) : day;

  const isoValue =
    year && month && effectiveDay
      ? `${year}-${month.padStart(2, "0")}-${String(effectiveDay).padStart(2, "0")}`
      : "";

  return (
    <div className="flex gap-2">
      {/* Day */}
      <select
        aria-label="Day"
        value={effectiveDay}
        onChange={(e) => setDay(e.target.value)}
        className={cn(selectCls, "w-[72px] shrink-0")}
        required={required}
      >
        <option value="" disabled>DD</option>
        {days.map((d) => (
          <option key={d} value={String(d).padStart(2, "0")}>{d}</option>
        ))}
      </select>

      {/* Month */}
      <select
        aria-label="Month"
        value={month}
        onChange={(e) => setMonth(e.target.value)}
        className={cn(selectCls, "flex-1 min-w-0")}
        required={required}
      >
        <option value="" disabled>Month</option>
        {MONTHS.map((m) => (
          <option key={m.value} value={m.value}>{m.long}</option>
        ))}
      </select>

      {/* Year */}
      <select
        aria-label="Year"
        value={year}
        onChange={(e) => setYear(e.target.value)}
        className={cn(selectCls, "w-[90px] shrink-0")}
        required={required}
      >
        <option value="" disabled>YYYY</option>
        {years.map((y) => (
          <option key={y} value={String(y)}>{y}</option>
        ))}
      </select>

      {/* Hidden input carries the ISO value for form submission */}
      <input type="hidden" name={name} id={id} value={isoValue} />
    </div>
  );
}
