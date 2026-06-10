"use client";

/**
 * DateSelect — segmented date field (DD / MM / YYYY) + calendar popup.
 *
 * The "/" separators are fixed chrome; you type into one segment at a time,
 * left to right, exactly like a native date input. All keystroke logic lives
 * in ./date-mask.ts (pure + unit-tested); this component is a thin shell that
 * renders the segments and wires DOM focus. No select-all and no value→segment
 * re-sync mid-edit — the segments are the single source of truth, which is what
 * keeps typing/deleting predictable (typing "10" stays "10", never "01").
 */

import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { I } from "@/components/ui/glyphs";
import { useModalLock } from "@/lib/use-modal-lock";
import { cn } from "@/lib/utils";
import {
  SEGMENTS, parseIso, toIso, daysInMonth, isInRange, deriveIso,
  sanitize, resolveSegment, padOnBlur, stateFromParsed, type SegKey,
} from "@/components/ui/date-mask";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function startDay(y: number, m: number): number {
  const d = new Date(y, m - 1, 1).getDay();
  return d === 0 ? 6 : d - 1;
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

// Widths must comfortably fit the digits in the mono font or the centered text
// gets clipped on both edges (e.g. "1999" rendering as ".999"). 1ch ≈ one
// digit; add headroom for letter-spacing/sub-pixel so nothing is ever cut.
const SEG_WIDTH: Record<SegKey, string> = { dd: "2.6ch", mm: "2.6ch", yyyy: "4.8ch" };

export function DateSelect({ name, id, required, min, max, defaultValue, value, onChange }: Props) {
  const controlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue ?? "");
  const isoValue = controlled ? (value ?? "") : internal;
  const parsed = isoValue ? parseIso(isoValue) : null;

  const init = parsed ? stateFromParsed(parsed) : { dd: "", mm: "", yyyy: "" };
  const [dd, setDd] = useState(init.dd);
  const [mm, setMm] = useState(init.mm);
  const [yyyy, setYyyy] = useState(init.yyyy);
  const [invalid, setInvalid] = useState(false);

  const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const get = (k: SegKey) => (k === "dd" ? dd : k === "mm" ? mm : yyyy);
  const setSeg = (k: SegKey, v: string) => (k === "dd" ? setDd(v) : k === "mm" ? setMm(v) : setYyyy(v));

  const lastEmit = useRef<string>(isoValue);

  const emit = (d: string, m: string, y: string) => {
    const { iso, invalid: inv } = deriveIso({ dd: d, mm: m, yyyy: y }, min, max);
    setInvalid(inv);
    lastEmit.current = iso;
    if (!controlled) setInternal(iso);
    onChange?.(iso);
  };

  // External (controlled) sync only — never fights local typing.
  useEffect(() => {
    if (!controlled) return;
    if (value === lastEmit.current) return;
    const p = value ? parseIso(value) : null;
    const s = p ? stateFromParsed(p) : { dd: "", mm: "", yyyy: "" };
    setDd(s.dd); setMm(s.mm); setYyyy(s.yyyy);
    setInvalid(false);
    lastEmit.current = value ?? "";
  }, [controlled, value]);

  const focusSeg = (idx: number) => {
    const el = refs[idx]?.current;
    if (el) { el.focus(); const n = el.value.length; try { el.setSelectionRange(n, n); } catch { /* number inputs */ } }
  };

  const onSegChange = (idx: number, raw: string) => {
    const seg = SEGMENTS[idx];
    const digits = sanitize(raw, seg.max);
    const { value: v, advance } = resolveSegment(seg.key, digits, seg.max);
    setSeg(seg.key, v);
    const vals = { dd, mm, yyyy, [seg.key]: v };
    emit(vals.dd, vals.mm, vals.yyyy);
    if (advance && idx < 2) focusSeg(idx + 1);
  };

  const onSegKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    const atStart = (el.selectionStart ?? 0) === 0 && (el.selectionEnd ?? 0) === 0;
    const atEnd = (el.selectionStart ?? 0) === el.value.length;
    if (e.key === "Backspace" && el.value === "" && idx > 0) {
      e.preventDefault(); focusSeg(idx - 1);
    } else if ((e.key === "ArrowLeft") && atStart && idx > 0) {
      e.preventDefault(); focusSeg(idx - 1);
    } else if ((e.key === "ArrowRight") && atEnd && idx < 2) {
      e.preventDefault(); focusSeg(idx + 1);
    }
  };

  const onSegBlur = (idx: number) => {
    const seg = SEGMENTS[idx];
    // Read the LIVE DOM value, not React state: blur fires synchronously from
    // focusSeg() during auto-advance, when the closure still holds the pre-
    // keystroke value. Padding that stale value ("1") would clobber the value
    // the user just completed ("10" → wrongly "01"). The ref always reflects
    // exactly what's in the box right now.
    const live = refs[idx].current?.value ?? get(seg.key);
    const padded = padOnBlur(seg.key, live, seg.max);
    if (padded !== live) {
      setSeg(seg.key, padded);
      // Build from the live DOM of every segment so emit never uses a stale
      // closure value either.
      const cur = {
        dd: refs[0].current?.value ?? dd,
        mm: refs[1].current?.value ?? mm,
        yyyy: refs[2].current?.value ?? yyyy,
      };
      cur[seg.key] = padded;
      emit(cur.dd, cur.mm, cur.yyyy);
    }
  };

  // ── Calendar popup ─────────────────────────────────────────────────

  const minParsed = min ? parseIso(min) : null;
  const maxParsed = max ? parseIso(max) : null;
  const minYear = minParsed?.y ?? 1900;
  const maxYear = maxParsed?.y ?? new Date().getFullYear();

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
    const s = stateFromParsed({ y, m, d });
    setDd(s.dd); setMm(s.mm); setYyyy(s.yyyy);
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
      <div
        className={cn(
          "flex items-stretch w-full h-12 rounded-lg border overflow-hidden transition-colors",
          "focus-within:border-[var(--brand-500)] focus-within:shadow-[0_0_0_3px_oklch(63%_0.18_262_/_0.25)]",
          invalid ? "border-no-500" : "border-border",
        )}
        style={{ background: invalid ? "oklch(58% 0.2 25 / 0.08)" : "var(--bg-inset)" }}
      >
        <div className="flex-1 flex items-center px-3.5 font-mono text-[16px] tabular-nums">
          {SEGMENTS.map((seg, idx) => (
            <span key={seg.key} className="flex items-center">
              {idx > 0 && <span className="text-text-subtle/40 mx-1 select-none" aria-hidden>/</span>}
              <input
                ref={refs[idx]}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
                value={get(seg.key)}
                placeholder={seg.ph}
                aria-label={seg.aria}
                maxLength={seg.max}
                style={{ width: SEG_WIDTH[seg.key] }}
                className="bg-transparent text-center text-text outline-none placeholder:text-text-subtle/40"
                onChange={(e) => onSegChange(idx, e.target.value)}
                onKeyDown={(e) => onSegKeyDown(idx, e)}
                onBlur={() => onSegBlur(idx)}
                onFocus={(e) => { const n = e.target.value.length; try { e.target.setSelectionRange(n, n); } catch { /* noop */ } }}
              />
            </span>
          ))}
        </div>

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
      <input type="hidden" name={name} id={id} value={isoValue} required={required} />

      {mounted && calOpen && createPortal(
        <div role="dialog" aria-modal="true" aria-label="Pick a date"
          className="fixed inset-0 z-[120] flex items-center justify-center p-3">
          <button type="button" aria-label="Close" onClick={() => setCalOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative w-[calc(100%-24px)] max-w-[320px] rounded-xl border border-border-strong bg-bg-elevated shadow-[0_24px_64px_-16px_rgba(0,0,0,0.6)] overflow-hidden"
            style={{ animation: "cd-rise 200ms var(--ease-arrive)", marginBottom: "env(safe-area-inset-bottom, 0px)" }}
          >
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
