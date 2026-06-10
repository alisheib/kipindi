"use client";

/**
 * DateSelect — a single masked date field + calendar popup.
 *
 * Looks like the kit Input atom (full-width, h-12, bg-inset, border-border,
 * brand-500 focus ring). You type digits left-to-right and the separators
 * appear automatically: "DD / MM / YYYY". The calendar icon on the right
 * (same spot as the password-toggle eye) opens a day-grid + year picker.
 *
 * Why one input and not three segments: separate per-segment inputs that
 * select-all on focus and auto-advance fight the cursor — digits could land
 * out of order (typing "10" showing "01"). A single field has one cursor and
 * one value, so typed digits always accumulate in the order they're pressed.
 */

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { I } from "@/components/ui/glyphs";
import { useModalLock } from "@/lib/use-modal-lock";
import { cn } from "@/lib/utils";

// ── Constants ────────────────────────────────────────────────────────

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

// ── Types & helpers ──────────────────────────────────────────────────

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

type Parsed = { y: number; m: number; d: number };

function parseIso(s: string): Parsed | null {
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  if (m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) return null;
  return { y, m, d };
}
function toIso(p: Parsed): string {
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
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

/** Digit buffer "DDMMYYYY" (≤ 8 chars) from a parsed date. */
function rawFromParsed(p: Parsed): string {
  return `${String(p.d).padStart(2, "0")}${String(p.m).padStart(2, "0")}${String(p.y).padStart(4, "0")}`;
}
/** Format the digit buffer for display, inserting " / " separators as it fills. */
function maskDisplay(d: string): string {
  const dd = d.slice(0, 2);
  const mm = d.slice(2, 4);
  const yy = d.slice(4, 8);
  let out = dd;
  if (d.length > 2) out += " / " + mm;
  if (d.length > 4) out += " / " + yy;
  return out;
}

// ── Main component ───────────────────────────────────────────────────

export function DateSelect({ name, id, required, min, max, defaultValue, value, onChange }: Props) {
  const controlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue ?? "");
  const isoValue = controlled ? (value ?? "") : internal;
  const parsed = isoValue ? parseIso(isoValue) : null;

  // Single source of truth for what's typed — a digit-only buffer "DDMMYYYY".
  const [raw, setRaw] = useState(parsed ? rawFromParsed(parsed) : "");
  const [invalid, setInvalid] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const minParsed = min ? parseIso(min) : null;
  const maxParsed = max ? parseIso(max) : null;
  const minYear = minParsed?.y ?? 1900;
  const maxYear = maxParsed?.y ?? new Date().getFullYear();

  // The last ISO this component itself produced — lets the external-sync effect
  // tell a genuine parent change apart from our own echo (controlled mode).
  const lastEmit = useRef<string>(isoValue);

  // Commit the buffer: emit an ISO once 8 valid digits are present, clear it
  // (and flag invalid) otherwise. Never mutates `raw` — typing owns that.
  const commit = useCallback((d: string) => {
    if (d.length === 8) {
      const p = { d: Number(d.slice(0, 2)), m: Number(d.slice(2, 4)), y: Number(d.slice(4, 8)) };
      if (p.m >= 1 && p.m <= 12 && p.d >= 1 && p.d <= daysInMonth(p.y, p.m) && isInRange(p, minParsed, maxParsed)) {
        const iso = toIso(p);
        lastEmit.current = iso;
        if (!controlled) setInternal(iso);
        onChange?.(iso);
        setInvalid(false);
        return;
      }
      setInvalid(true);
      lastEmit.current = "";
      if (!controlled) setInternal("");
      onChange?.("");
    } else {
      setInvalid(false);
      lastEmit.current = "";
      if (!controlled) setInternal("");
      onChange?.("");
    }
  }, [controlled, onChange, minParsed, maxParsed]);

  // Sync the buffer FROM an external value only (controlled parent set/reset).
  // Depends on the `value` STRING, never the `parsed` object (fresh identity
  // every render), so it can't stomp the buffer while the user types.
  useEffect(() => {
    if (!controlled) return;
    if (value === lastEmit.current) return; // our own echo — ignore
    const p = value ? parseIso(value) : null;
    setRaw(p ? rawFromParsed(p) : "");
    setInvalid(false);
    lastEmit.current = value ?? "";
  }, [controlled, value]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const prevLen = maskDisplay(raw).length;
    let next = e.target.value.replace(/\D/g, "").slice(0, 8);
    // Backspace landed on a " / " separator: digits didn't change but the
    // string got shorter — drop the last digit so delete always removes one.
    if (next === raw && e.target.value.length < prevLen) {
      next = raw.slice(0, -1);
    }
    setRaw(next);
    commit(next);
  };

  // ── Calendar popup ─────────────────────────────────────────────────

  const [calOpen, setCalOpen] = useState(false);
  const [calView, setCalView] = useState<"days" | "years">("days");
  useModalLock(calOpen);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const now = new Date();
  const [viewYear, setViewYear] = useState(parsed?.y ?? maxYear);
  const [viewMonth, setViewMonth] = useState(parsed?.m ?? now.getMonth() + 1);

  const openCal = () => {
    setCalView("days");
    if (parsed) {
      setViewYear(parsed.y); setViewMonth(parsed.m);
    } else {
      // Smart default: if min is in the future (proposals), start at min.
      // If max is in the past (DOB), start at max. Otherwise near today.
      const nowMs = now.getTime();
      if (minParsed && new Date(minParsed.y, minParsed.m - 1, minParsed.d).getTime() >= nowMs) {
        setViewYear(minParsed.y); setViewMonth(minParsed.m);
      } else if (maxParsed && new Date(maxParsed.y, maxParsed.m - 1, maxParsed.d).getTime() <= nowMs) {
        setViewYear(maxParsed.y); setViewMonth(maxParsed.m);
      } else {
        setViewYear(now.getFullYear()); setViewMonth(now.getMonth() + 1);
      }
    }
    setCalOpen(true);
  };

  const pickDay = (y: number, m: number, d: number) => {
    setRaw(rawFromParsed({ y, m, d }));
    const iso = toIso({ y, m, d });
    lastEmit.current = iso;
    if (!controlled) setInternal(iso);
    onChange?.(iso);
    setInvalid(false);
    setCalOpen(false);
  };

  const prevMonth = () => { if (viewMonth === 1) { setViewMonth(12); setViewYear(viewYear - 1); } else setViewMonth(viewMonth - 1); };
  const nextMonth = () => { if (viewMonth === 12) { setViewMonth(1); setViewYear(viewYear + 1); } else setViewMonth(viewMonth + 1); };

  const grid = useMemo(() => {
    const total = daysInMonth(viewYear, viewMonth);
    const start = startDay(viewYear, viewMonth);
    const cells: Array<{ day: number; disabled: boolean } | null> = [];
    for (let i = 0; i < start; i++) cells.push(null);
    for (let d = 1; d <= total; d++) cells.push({ day: d, disabled: !isInRange({ y: viewYear, m: viewMonth, d }, minParsed, maxParsed) });
    return cells;
  }, [viewYear, viewMonth, minParsed, maxParsed]);

  const canPrev = viewYear > minYear || (viewYear === minYear && viewMonth > (minParsed?.m ?? 1));
  const canNext = viewYear < maxYear || (viewYear === maxYear && viewMonth < (maxParsed?.m ?? 12));
  const yearGrid = useMemo(() => { const o: number[] = []; for (let y = maxYear; y >= minYear; y--) o.push(y); return o; }, [minYear, maxYear]);

  useEffect(() => {
    if (!calOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setCalOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [calOpen]);

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <>
      {/* Full-width input container — matches the kit Input atom exactly */}
      <div
        className={cn(
          "flex items-stretch w-full h-12 rounded-lg border overflow-hidden transition-colors",
          "focus-within:border-[var(--brand-500)] focus-within:shadow-[0_0_0_3px_oklch(63%_0.18_262_/_0.25)]",
          invalid ? "border-no-500" : "border-border",
        )}
        style={{ background: invalid ? "oklch(58% 0.2 25 / 0.08)" : "var(--bg-inset)" }}
      >
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          data-1p-ignore
          data-lpignore="true"
          value={maskDisplay(raw)}
          onChange={handleInput}
          placeholder="DD / MM / YYYY"
          aria-label="Date — type day, month, year"
          required={required}
          className="flex-1 min-w-0 bg-transparent px-3.5 font-mono text-[16px] tabular-nums text-text outline-none placeholder:text-text-subtle/40 selection:bg-brand-500/30"
        />

        {/* Calendar toggle — same position as password eye icon */}
        <button
          type="button"
          onClick={openCal}
          tabIndex={-1}
          aria-label="Open calendar"
          className="inline-flex items-center justify-center px-3 bg-bg-elevated border-l border-border text-text-subtle hover:text-text transition-colors shrink-0"
        >
          <I.calendar s={16} />
        </button>
      </div>

      {invalid && <p className="mt-1.5 font-mono text-[11px] text-no-300">Invalid date</p>}
      <input type="hidden" name={name} id={id} value={isoValue} />

      {/* ── Calendar popup ──────────────────────────────────────────── */}
      {mounted && calOpen && createPortal(
        <div role="dialog" aria-modal="true" aria-label="Pick a date"
          className="fixed inset-0 z-[120] flex items-center justify-center p-3">

          {/* Scrim */}
          <button type="button" aria-label="Close" onClick={() => setCalOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Card */}
          <div
            className="relative w-[calc(100%-24px)] max-w-[320px] rounded-xl border border-border-strong bg-bg-elevated shadow-[0_24px_64px_-16px_rgba(0,0,0,0.6)] overflow-hidden"
            style={{ animation: "cd-rise 200ms var(--ease-arrive)", marginBottom: "env(safe-area-inset-bottom, 0px)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
              {calView === "days" ? (<>
                <button type="button" onClick={prevMonth} disabled={!canPrev}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-subtle hover:bg-bg-overlay hover:text-text transition-colors disabled:opacity-30"
                  aria-label="Previous month"><I.chevronLeft s={16} /></button>
                <button type="button" onClick={() => setCalView("years")}
                  className="font-display text-[15px] font-semibold text-text hover:text-gold-300 transition-colors"
                  aria-label="Pick a year">
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

            {/* Day grid or Year grid */}
            {calView === "days" ? (<>
              <div className="grid grid-cols-7 px-3 pt-2 pb-1">
                {DAY_LABELS.map((l) => (
                  <span key={l} className="text-center font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle font-bold">{l}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5 px-2.5 pb-3">
                {grid.map((cell, i) => {
                  if (!cell) return <span key={`e-${i}`} />;
                  const isSel = parsed && parsed.y === viewYear && parsed.m === viewMonth && parsed.d === cell.day;
                  const isToday = viewYear === now.getFullYear() && viewMonth === now.getMonth() + 1 && cell.day === now.getDate();
                  return (
                    <button key={cell.day} type="button" disabled={cell.disabled}
                      onClick={() => pickDay(viewYear, viewMonth, cell.day)}
                      className={cn(
                        "h-9 rounded-md font-mono text-[13px] tabular-nums transition-all",
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

            {/* Footer */}
            <div className="border-t border-border px-3 py-2.5 flex items-center justify-between">
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

// ── Year grid with auto-scroll ───────────────────────────────────────

function YearGrid({ years, viewYear, selectedYear, onPick }: {
  years: number[]; viewYear: number; selectedYear: number | null; onPick: (y: number) => void;
}) {
  const activeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { activeRef.current?.scrollIntoView({ block: "center", behavior: "instant" }); }, []);
  return (
    <div className="grid grid-cols-4 gap-1 p-3 max-h-[240px] overflow-y-auto overscroll-contain">
      {years.map((y) => (
        <button key={y} ref={y === viewYear ? activeRef : undefined} type="button"
          onClick={() => onPick(y)}
          className={cn(
            "h-8 rounded-md font-mono text-[13px] tabular-nums transition-all",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
            y === viewYear ? "bg-gold-500 text-gold-fg font-bold shadow-[0_0_12px_oklch(72%_0.14_78_/_0.4)]"
              : y === selectedYear ? "ring-1 ring-gold-500/50 text-gold-300"
              : "text-text hover:bg-bg-overlay",
          )}>
          {y}
        </button>
      ))}
    </div>
  );
}
