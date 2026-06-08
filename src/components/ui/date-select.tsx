"use client";

/**
 * DateSelect — typeable date input + calendar picker.
 *
 * Users can:
 *   1. TYPE a date directly in the text field (DD/MM/YYYY format)
 *   2. TAP the calendar icon to open a visual month/year picker
 *
 * Accepts and normalizes many input formats:
 *   - DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY (common)
 *   - YYYY-MM-DD (ISO, paste from elsewhere)
 *   - DDMMYYYY (digits only)
 *
 * Invalid input shows a red border. Valid input normalizes to DD/MM/YYYY
 * on blur and syncs with the calendar. Hidden input always outputs ISO
 * (YYYY-MM-DD) for the Server Action.
 */

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { I } from "@/components/ui/glyphs";
import { useModalLock } from "@/lib/use-modal-lock";
import { cn } from "@/lib/utils";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

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

// ── Parsing helpers ──────────────────────────────────────────────────

type Parsed = { y: number; m: number; d: number };

function parseIso(s: string): Parsed | null {
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  if (m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) return null;
  return { y, m, d };
}

/** Try to parse a wide range of typed date formats. Returns null if invalid. */
function parseTyped(raw: string): Parsed | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // ISO: YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) {
    return parseIso(trimmed);
  }

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const sep = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (sep) {
    const [, dd, mm, yyyy] = sep;
    const d = Number(dd), m = Number(mm), y = Number(yyyy);
    if (m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) return null;
    return { y, m, d };
  }

  // DDMMYYYY (8 digits, no separators)
  if (/^\d{8}$/.test(trimmed)) {
    const d = Number(trimmed.slice(0, 2));
    const m = Number(trimmed.slice(2, 4));
    const y = Number(trimmed.slice(4, 8));
    if (m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) return null;
    return { y, m, d };
  }

  return null;
}

function toIso(p: Parsed): string {
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

function toDisplay(p: Parsed): string {
  return `${String(p.d).padStart(2, "0")}/${String(p.m).padStart(2, "0")}/${p.y}`;
}

function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
}

function startDay(y: number, m: number): number {
  const d = new Date(y, m - 1, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

function isInRange(p: Parsed, minP: Parsed | null, maxP: Parsed | null): boolean {
  const ts = new Date(p.y, p.m - 1, p.d).getTime();
  if (minP && ts < new Date(minP.y, minP.m - 1, minP.d).getTime()) return false;
  if (maxP && ts > new Date(maxP.y, maxP.m - 1, maxP.d).getTime()) return false;
  return true;
}

// ── Component ────────────────────────────────────────────────────────

export function DateSelect({
  name, id, required, min, max, defaultValue, value, onChange,
  placeholder = "DD/MM/YYYY",
}: Props) {
  const controlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue ?? "");
  const isoValue = controlled ? (value ?? "") : internal;
  const parsed = isoValue ? parseIso(isoValue) : null;

  // Text input state — the raw string the user sees/types
  const [text, setText] = useState(parsed ? toDisplay(parsed) : "");
  const [editing, setEditing] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync display text when value changes externally (controlled mode)
  useEffect(() => {
    if (!editing) {
      setText(parsed ? toDisplay(parsed) : "");
      setInvalid(false);
    }
  }, [isoValue, editing, parsed]);

  const minParsed = min ? parseIso(min) : null;
  const maxParsed = max ? parseIso(max) : null;
  const minYear = minParsed?.y ?? 1930;
  const maxYear = maxParsed?.y ?? new Date().getFullYear();

  // Commit a parsed date
  const commit = useCallback((p: Parsed) => {
    const iso = toIso(p);
    if (!controlled) setInternal(iso);
    onChange?.(iso);
    setText(toDisplay(p));
    setInvalid(false);
  }, [controlled, onChange]);

  // Handle blur — try to parse whatever the user typed
  const onBlur = () => {
    setEditing(false);
    if (!text.trim()) {
      setInvalid(false);
      if (!controlled) setInternal("");
      onChange?.("");
      return;
    }
    const p = parseTyped(text);
    if (p && isInRange(p, minParsed, maxParsed)) {
      commit(p);
    } else {
      setInvalid(true);
    }
  };

  // Handle typing — auto-insert slashes for DD/MM/YYYY convenience
  const onInput = (raw: string) => {
    // Strip non-digit/slash/dash/dot
    let cleaned = raw.replace(/[^0-9/\-.]/g, "");
    // Auto-insert slashes: after 2 digits, after 4 digits
    if (/^\d{3}$/.test(cleaned)) cleaned = cleaned.slice(0, 2) + "/" + cleaned.slice(2);
    if (/^\d{2}\/\d{3}$/.test(cleaned)) cleaned = cleaned.slice(0, 5) + "/" + cleaned.slice(5);
    setText(cleaned.slice(0, 10));
    setInvalid(false);

    // Live validation — if it looks complete, check immediately
    const p = parseTyped(cleaned);
    if (p && isInRange(p, minParsed, maxParsed)) {
      setInvalid(false);
    }
  };

  // Handle Enter key — commit if valid
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    }
  };

  // ── Calendar popover state ──────────────────────────────────────────
  const [calOpen, setCalOpen] = useState(false);
  const [calView, setCalView] = useState<"days" | "years">("days");
  useModalLock(calOpen);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const now = new Date();
  const [viewYear, setViewYear] = useState(parsed?.y ?? maxYear);
  const [viewMonth, setViewMonth] = useState(parsed?.m ?? now.getMonth() + 1);

  // Reset calendar view when opening
  const openCal = () => {
    setCalView("days");
    if (parsed) { setViewYear(parsed.y); setViewMonth(parsed.m); }
    else {
      setViewYear(maxParsed?.y ?? now.getFullYear() - 25);
      setViewMonth(maxParsed?.m ?? 6);
    }
    setCalOpen(true);
  };

  const pickDay = (y: number, m: number, d: number) => {
    commit({ y, m, d });
    setCalOpen(false);
  };

  const prevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const grid = useMemo(() => {
    const total = daysInMonth(viewYear, viewMonth);
    const start = startDay(viewYear, viewMonth);
    const cells: Array<{ day: number; disabled: boolean } | null> = [];
    for (let i = 0; i < start; i++) cells.push(null);
    for (let d = 1; d <= total; d++) {
      const p = { y: viewYear, m: viewMonth, d };
      cells.push({ day: d, disabled: !isInRange(p, minParsed, maxParsed) });
    }
    return cells;
  }, [viewYear, viewMonth, minParsed, maxParsed]);

  const canPrev = viewYear > minYear || (viewYear === minYear && viewMonth > (minParsed?.m ?? 1));
  const canNext = viewYear < maxYear || (viewYear === maxYear && viewMonth < (maxParsed?.m ?? 12));

  const yearGrid = useMemo(() => {
    const out: number[] = [];
    for (let y = maxYear; y >= minYear; y--) out.push(y);
    return out;
  }, [minYear, maxYear]);

  useEffect(() => {
    if (!calOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setCalOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [calOpen]);

  return (
    <>
      {/* Input row — text field + calendar icon button */}
      <div
        className={cn(
          "flex items-stretch rounded-lg border overflow-hidden transition-colors",
          "focus-within:border-[var(--brand-500)] focus-within:shadow-[0_0_0_3px_oklch(63%_0.18_262_/_0.25)]",
          invalid ? "border-no-500" : "border-border",
        )}
        style={{ background: invalid ? "oklch(58% 0.2 25 / 0.08)" : "var(--bg-inset)" }}
      >
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          placeholder={placeholder}
          value={text}
          onChange={(e) => onInput(e.target.value)}
          onFocus={() => setEditing(true)}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          aria-label="Date (DD/MM/YYYY)"
          aria-invalid={invalid}
          className="flex-1 min-w-0 bg-transparent px-3.5 h-12 font-mono text-[16px] tabular-nums text-text outline-none placeholder:text-text-subtle"
        />
        <button
          type="button"
          onClick={openCal}
          tabIndex={-1}
          aria-label="Open calendar"
          className="inline-flex items-center justify-center px-3 bg-bg-elevated border-l border-border text-text-subtle hover:text-text transition-colors shrink-0"
        >
          <I.calendar s={18} />
        </button>
      </div>

      {/* Error hint */}
      {invalid && (
        <p className="mt-1 font-mono text-[11px] text-no-300">
          Invalid date — use DD/MM/YYYY format
        </p>
      )}

      {/* Hidden input for form submission (ISO format) */}
      <input type="hidden" name={name} id={id} value={isoValue} />

      {/* Calendar popover */}
      {mounted && calOpen && createPortal(
        <div role="dialog" aria-modal="true" aria-label="Pick a date"
          className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center">
          <button type="button" aria-label="Close" onClick={() => setCalOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative w-full sm:max-w-[340px] rounded-t-xl sm:rounded-xl border border-border-strong bg-bg-elevated shadow-[0_24px_64px_-16px_rgba(0,0,0,0.6)] overflow-hidden"
            style={{ animation: "cd-rise 200ms var(--ease-arrive)", paddingBottom: "env(safe-area-inset-bottom)" }}>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              {calView === "days" ? (<>
                <button type="button" onClick={prevMonth} disabled={!canPrev}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-subtle hover:bg-bg-overlay hover:text-text transition-colors disabled:opacity-30"
                  aria-label="Previous month"><I.chevronLeft s={16} /></button>
                <button type="button" onClick={() => setCalView("years")}
                  className="font-display text-[15px] font-semibold text-text hover:text-gold-300 transition-colors" aria-label="Pick a year">
                  {MONTH_NAMES[viewMonth - 1]} {viewYear}
                  <svg viewBox="0 0 12 12" width={10} height={10} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="inline-block ml-1.5 -mt-0.5" aria-hidden><path d="M3 4.5l3 3 3-3" /></svg>
                </button>
                <button type="button" onClick={nextMonth} disabled={!canNext}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-subtle hover:bg-bg-overlay hover:text-text transition-colors disabled:opacity-30"
                  aria-label="Next month"><I.chevronRight s={16} /></button>
              </>) : (<>
                <span className="font-display text-[15px] font-semibold text-text">Pick a year</span>
                <button type="button" onClick={() => setCalView("days")}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-subtle hover:bg-bg-overlay hover:text-text transition-colors"
                  aria-label="Back to calendar"><I.x s={16} /></button>
              </>)}
            </div>

            {calView === "days" ? (<>
              <div className="grid grid-cols-7 px-3 pt-3 pb-1">
                {DAY_LABELS.map((l) => (
                  <span key={l} className="text-center font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle font-bold">{l}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 px-3 pb-4">
                {grid.map((cell, i) => {
                  if (!cell) return <span key={`e-${i}`} />;
                  const isSel = parsed && parsed.y === viewYear && parsed.m === viewMonth && parsed.d === cell.day;
                  const isToday = viewYear === now.getFullYear() && viewMonth === now.getMonth() + 1 && cell.day === now.getDate();
                  return (
                    <button key={cell.day} type="button" disabled={cell.disabled}
                      onClick={() => pickDay(viewYear, viewMonth, cell.day)}
                      className={cn(
                        "h-10 rounded-lg font-mono text-[14px] tabular-nums transition-all",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                        isSel ? "bg-gold-500 text-gold-fg font-bold shadow-[0_0_12px_oklch(72%_0.14_78_/_0.4)]"
                          : cell.disabled ? "text-text-subtle/30 cursor-not-allowed"
                          : "text-text hover:bg-bg-overlay",
                        isToday && !isSel && "ring-1 ring-brand-500/50",
                      )}>
                      {cell.day}
                    </button>
                  );
                })}
              </div>
            </>) : (
              <YearGrid years={yearGrid} viewYear={viewYear} selectedYear={parsed?.y ?? null}
                onPick={(y) => { setViewYear(y); setCalView("days"); }} />
            )}

            <div className="border-t border-border px-4 py-3 flex items-center justify-between">
              <button type="button" onClick={() => setCalOpen(false)}
                className="font-mono text-[12px] uppercase tracking-[0.12em] text-text-subtle hover:text-text transition-colors">
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

function YearGrid({ years, viewYear, selectedYear, onPick }: {
  years: number[]; viewYear: number; selectedYear: number | null; onPick: (y: number) => void;
}) {
  const activeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "center", behavior: "instant" });
  }, []);
  return (
    <div className="grid grid-cols-4 gap-1.5 p-3 max-h-[280px] overflow-y-auto overscroll-contain">
      {years.map((y) => {
        const isCurrent = y === viewYear;
        const isSelected = y === selectedYear;
        return (
          <button key={y} ref={isCurrent ? activeRef : undefined} type="button"
            onClick={() => onPick(y)}
            className={cn(
              "h-10 rounded-lg font-mono text-[14px] tabular-nums transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
              isCurrent ? "bg-gold-500 text-gold-fg font-bold shadow-[0_0_12px_oklch(72%_0.14_78_/_0.4)]"
                : isSelected ? "ring-1 ring-gold-500/50 text-gold-300"
                : "text-text hover:bg-bg-overlay",
            )}>
            {y}
          </button>
        );
      })}
    </div>
  );
}
