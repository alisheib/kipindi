"use client";

/**
 * DateSelect — segmented date input + calendar popup.
 *
 * Looks exactly like the kit Input atom (full-width, h-12, bg-inset,
 * border-border, brand-500 focus ring). Three editable segments
 * [DD] / [MM] / [YYYY] inside the input, calendar icon on the right
 * (same position as the password-toggle eye icon).
 *
 * Click the calendar icon → popup with day grid + year picker.
 * Type directly into segments → auto-advance on fill.
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

// ── Segment sub-input ────────────────────────────────────────────────

function Seg({ value, onChange, onNext, onPrev, maxLen, placeholder, width, ariaLabel }: {
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
  onPrev: () => void;
  maxLen: number;
  placeholder: string;
  width: string;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className="bg-transparent text-center font-mono text-[16px] tabular-nums text-text outline-none placeholder:text-text-subtle/40 selection:bg-brand-500/30"
      style={{ width }}
      maxLength={maxLen}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "").slice(0, maxLen);
        onChange(digits);
        if (digits.length === maxLen) onNext();
      }}
      onKeyDown={(e) => {
        if ((e.key === "ArrowRight" || (e.key === "Tab" && !e.shiftKey)) && ref.current?.selectionStart === value.length) {
          e.preventDefault(); onNext();
        }
        if ((e.key === "ArrowLeft" || (e.key === "Tab" && e.shiftKey)) && ref.current?.selectionStart === 0) {
          e.preventDefault(); onPrev();
        }
        if (e.key === "Backspace" && value === "") { e.preventDefault(); onPrev(); }
        if (e.key === "/") { e.preventDefault(); onNext(); }
      }}
      onFocus={(e) => e.target.select()}
    />
  );
}

// ── Main component ───────────────────────────────────────────────────

export function DateSelect({ name, id, required, min, max, defaultValue, value, onChange }: Props) {
  const controlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue ?? "");
  const isoValue = controlled ? (value ?? "") : internal;
  const parsed = isoValue ? parseIso(isoValue) : null;

  const [dd, setDd] = useState(parsed ? String(parsed.d).padStart(2, "0") : "");
  const [mm, setMm] = useState(parsed ? String(parsed.m).padStart(2, "0") : "");
  const [yyyy, setYyyy] = useState(parsed ? String(parsed.y) : "");
  const [invalid, setInvalid] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (parsed) {
      setDd(String(parsed.d).padStart(2, "0"));
      setMm(String(parsed.m).padStart(2, "0"));
      setYyyy(String(parsed.y));
      setInvalid(false);
    } else if (!isoValue) {
      setDd(""); setMm(""); setYyyy("");
      setInvalid(false);
    }
  }, [isoValue, parsed]);

  const minParsed = min ? parseIso(min) : null;
  const maxParsed = max ? parseIso(max) : null;
  const minYear = minParsed?.y ?? 1900;
  const maxYear = maxParsed?.y ?? new Date().getFullYear();

  const focusSeg = (idx: number) => {
    const el = containerRef.current?.querySelectorAll<HTMLInputElement>("input[type='text']")[idx];
    el?.focus();
  };

  const tryCommit = useCallback((d: string, m: string, y: string) => {
    if (d.length === 2 && m.length === 2 && y.length === 4) {
      const p = { d: Number(d), m: Number(m), y: Number(y) };
      if (p.m >= 1 && p.m <= 12 && p.d >= 1 && p.d <= daysInMonth(p.y, p.m) && isInRange(p, minParsed, maxParsed)) {
        const iso = toIso(p);
        if (!controlled) setInternal(iso);
        onChange?.(iso);
        setInvalid(false);
        return;
      }
      setInvalid(true);
      if (!controlled) setInternal("");
      onChange?.("");
    } else {
      setInvalid(false);
      if (!controlled) setInternal("");
      onChange?.("");
    }
  }, [controlled, onChange, minParsed, maxParsed]);

  const onDd = (v: string) => { setDd(v); tryCommit(v, mm, yyyy); };
  const onMm = (v: string) => { setMm(v); tryCommit(dd, v, yyyy); };
  const onYy = (v: string) => { setYyyy(v); tryCommit(dd, mm, v); };

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
    if (parsed) { setViewYear(parsed.y); setViewMonth(parsed.m); }
    else { setViewYear(maxParsed?.y ?? now.getFullYear() - 25); setViewMonth(maxParsed?.m ?? 6); }
    setCalOpen(true);
  };

  const pickDay = (y: number, m: number, d: number) => {
    setDd(String(d).padStart(2, "0"));
    setMm(String(m).padStart(2, "0"));
    setYyyy(String(y));
    const iso = toIso({ y, m, d });
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
        ref={containerRef}
        className={cn(
          "flex items-stretch w-full h-12 rounded-lg border overflow-hidden transition-colors",
          "focus-within:border-[var(--brand-500)] focus-within:shadow-[0_0_0_3px_oklch(63%_0.18_262_/_0.25)]",
          invalid ? "border-no-500" : "border-border",
        )}
        style={{ background: invalid ? "oklch(58% 0.2 25 / 0.08)" : "var(--bg-inset)" }}
      >
        {/* Segments row */}
        <div className="flex-1 flex items-center px-3.5 gap-0">
          <Seg value={dd} onChange={onDd} onNext={() => focusSeg(1)} onPrev={() => {}} maxLen={2} placeholder="DD" width="28px" ariaLabel="Day" />
          <span className="text-text-subtle/40 font-mono text-[16px] mx-0.5 select-none">/</span>
          <Seg value={mm} onChange={onMm} onNext={() => focusSeg(2)} onPrev={() => focusSeg(0)} maxLen={2} placeholder="MM" width="28px" ariaLabel="Month" />
          <span className="text-text-subtle/40 font-mono text-[16px] mx-0.5 select-none">/</span>
          <Seg value={yyyy} onChange={onYy} onNext={() => {}} onPrev={() => focusSeg(1)} maxLen={4} placeholder="YYYY" width="48px" ariaLabel="Year" />
        </div>

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
          className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center">

          {/* Scrim */}
          <button type="button" aria-label="Close" onClick={() => setCalOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Card */}
          <div
            className="relative w-full sm:max-w-[340px] rounded-t-xl sm:rounded-xl border border-border-strong bg-bg-elevated shadow-[0_24px_64px_-16px_rgba(0,0,0,0.6)] overflow-hidden"
            style={{ animation: "cd-rise 200ms var(--ease-arrive)", paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
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

            {/* Footer */}
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

// ── Year grid with auto-scroll ───────────────────────────────────────

function YearGrid({ years, viewYear, selectedYear, onPick }: {
  years: number[]; viewYear: number; selectedYear: number | null; onPick: (y: number) => void;
}) {
  const activeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { activeRef.current?.scrollIntoView({ block: "center", behavior: "instant" }); }, []);
  return (
    <div className="grid grid-cols-4 gap-1.5 p-3 max-h-[280px] overflow-y-auto overscroll-contain">
      {years.map((y) => (
        <button key={y} ref={y === viewYear ? activeRef : undefined} type="button"
          onClick={() => onPick(y)}
          className={cn(
            "h-10 rounded-lg font-mono text-[14px] tabular-nums transition-all",
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
