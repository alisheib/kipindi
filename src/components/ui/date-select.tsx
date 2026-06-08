"use client";

/**
 * DateSelect — kit-faithful calendar datepicker.
 *
 * Tap the trigger → a popover calendar opens with month/year nav and a
 * day grid. Styled to the dark glass kit (bg-elevated, border-border,
 * brand/gold accents, mono numerals). Fully keyboard-navigable.
 *
 * Supports uncontrolled (name + hidden input) and controlled (value +
 * onChange) modes. On mobile, renders as a bottom sheet; on desktop,
 * as a dropdown below the trigger.
 */

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { I } from "@/components/ui/glyphs";
import { useModalLock } from "@/lib/use-modal-lock";
import { cn } from "@/lib/utils";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_LABELS  = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

type Props = {
  name?: string;
  id?: string;
  required?: boolean;
  min?: string;
  max?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (iso: string) => void;
  placeholder?: string;
};

function parseIso(s: string): { y: number; m: number; d: number } | null {
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { y, m, d };
}

function toIso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
}

/** Monday-first day-of-week (0=Mon, 6=Sun). */
function startDay(y: number, m: number): number {
  const d = new Date(y, m - 1, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

export function DateSelect({
  name, id, required, min, max, defaultValue, value, onChange,
  placeholder = "Select date",
}: Props) {
  const [open, setOpen] = useState(false);
  useModalLock(open);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Selected date state
  const controlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue ?? "");
  const selected = controlled ? value : internal;
  const parsed = selected ? parseIso(selected) : null;

  // Calendar view state — which month/year is displayed
  const now = new Date();
  const [viewYear, setViewYear] = useState(parsed?.y ?? now.getFullYear() - 20);
  const [viewMonth, setViewMonth] = useState(parsed?.m ?? now.getMonth() + 1);

  // Reset view to selected date when opening
  useEffect(() => {
    if (open && parsed) {
      setViewYear(parsed.y);
      setViewMonth(parsed.m);
    } else if (open && !parsed) {
      // Default view: show year that's ~25 years ago (common DOB)
      const maxParsed = max ? parseIso(max) : null;
      setViewYear(maxParsed?.y ?? now.getFullYear() - 25);
      setViewMonth(maxParsed?.m ?? 6);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const minParsed = min ? parseIso(min) : null;
  const maxParsed = max ? parseIso(max) : null;

  const pick = useCallback((y: number, m: number, d: number) => {
    const iso = toIso(y, m, d);
    if (!controlled) setInternal(iso);
    onChange?.(iso);
    setOpen(false);
  }, [controlled, onChange]);

  // Month navigation
  const prevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  // Build the day grid
  const grid = useMemo(() => {
    const total = daysInMonth(viewYear, viewMonth);
    const start = startDay(viewYear, viewMonth);
    const cells: Array<{ day: number; disabled: boolean } | null> = [];
    for (let i = 0; i < start; i++) cells.push(null);
    for (let d = 1; d <= total; d++) {
      let disabled = false;
      if (minParsed) {
        const ts = new Date(viewYear, viewMonth - 1, d).getTime();
        const minTs = new Date(minParsed.y, minParsed.m - 1, minParsed.d).getTime();
        if (ts < minTs) disabled = true;
      }
      if (maxParsed) {
        const ts = new Date(viewYear, viewMonth - 1, d).getTime();
        const maxTs = new Date(maxParsed.y, maxParsed.m - 1, maxParsed.d).getTime();
        if (ts > maxTs) disabled = true;
      }
      cells.push({ day: d, disabled });
    }
    return cells;
  }, [viewYear, viewMonth, minParsed, maxParsed]);

  // Can navigate prev/next?
  const canPrev = !minParsed || viewYear > minParsed.y || (viewYear === minParsed.y && viewMonth > minParsed.m);
  const canNext = !maxParsed || viewYear < maxParsed.y || (viewYear === maxParsed.y && viewMonth < maxParsed.m);

  // Display label on the trigger
  const displayLabel = parsed
    ? `${parsed.d} ${MONTH_SHORT[parsed.m - 1]} ${parsed.y}`
    : placeholder;

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* Trigger — looks like the Input atom with a calendar icon */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-2.5 w-full h-12 px-3.5 rounded-lg border border-border text-left",
          "focus:border-[var(--brand-500)] focus:shadow-[0_0_0_3px_oklch(63%_0.18_262_/_0.25)]",
          "transition-colors outline-none",
          parsed ? "text-text" : "text-text-subtle",
        )}
        style={{ background: "var(--bg-inset)" }}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <I.calendar s={16} />
        <span className="font-mono text-[16px] tabular-nums flex-1">{displayLabel}</span>
        <svg viewBox="0 0 12 12" width={10} height={10} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M3 4.5l3 3 3-3" />
        </svg>
      </button>

      <input type="hidden" name={name} id={id} value={selected ?? ""} required={required} />

      {/* Calendar popover — portaled to body */}
      {mounted && open && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pick a date"
          className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center"
        >
          {/* Scrim */}
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Calendar card */}
          <div
            className="relative w-full sm:max-w-[340px] rounded-t-xl sm:rounded-xl border border-border-strong bg-bg-elevated shadow-[0_24px_64px_-16px_rgba(0,0,0,0.6)] overflow-hidden"
            style={{ animation: "cd-rise 200ms var(--ease-arrive)" }}
          >
            {/* Header — month/year nav */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <button
                type="button"
                onClick={prevMonth}
                disabled={!canPrev}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-subtle hover:bg-bg-overlay hover:text-text transition-colors disabled:opacity-30"
                aria-label="Previous month"
              >
                <I.chevronLeft s={16} />
              </button>
              <span className="font-display text-[15px] font-semibold text-text">
                {MONTH_NAMES[viewMonth - 1]} {viewYear}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                disabled={!canNext}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-subtle hover:bg-bg-overlay hover:text-text transition-colors disabled:opacity-30"
                aria-label="Next month"
              >
                <I.chevronRight s={16} />
              </button>
            </div>

            {/* Day-of-week labels */}
            <div className="grid grid-cols-7 px-3 pt-3 pb-1">
              {DAY_LABELS.map((l) => (
                <span key={l} className="text-center font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle font-bold">
                  {l}
                </span>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-1 px-3 pb-4">
              {grid.map((cell, i) => {
                if (!cell) return <span key={`e-${i}`} />;
                const isSelected = parsed && parsed.y === viewYear && parsed.m === viewMonth && parsed.d === cell.day;
                const isToday = viewYear === now.getFullYear() && viewMonth === now.getMonth() + 1 && cell.day === now.getDate();
                return (
                  <button
                    key={cell.day}
                    type="button"
                    disabled={cell.disabled}
                    onClick={() => pick(viewYear, viewMonth, cell.day)}
                    className={cn(
                      "h-10 rounded-lg font-mono text-[14px] tabular-nums transition-all",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                      isSelected
                        ? "bg-gold-500 text-gold-fg font-bold shadow-[0_0_12px_oklch(72%_0.14_78_/_0.4)]"
                        : cell.disabled
                          ? "text-text-subtle/30 cursor-not-allowed"
                          : "text-text hover:bg-bg-overlay",
                      isToday && !isSelected && "ring-1 ring-brand-500/50",
                    )}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>

            {/* Quick action */}
            <div className="border-t border-border px-4 py-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="font-mono text-[12px] uppercase tracking-[0.12em] text-text-subtle hover:text-text transition-colors"
              >
                Cancel
              </button>
              {parsed && (
                <span className="font-mono text-[12px] text-gold-300 tabular-nums">
                  {parsed.d} {MONTH_SHORT[parsed.m - 1]} {parsed.y}
                </span>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
