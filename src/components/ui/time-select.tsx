"use client";

/**
 * TimeSelect — segmented 24-hour time field (HH : MM).
 *
 * Sibling of DateSelect. You type into one segment at a time, left to right;
 * the ":" is fixed chrome. An out-of-range time is impossible to enter (all
 * clamping lives in ./time-mask.ts, pure + unit-tested) — typing "5" in the
 * hours jumps straight to "05" and on to minutes, and a second digit that would
 * push the hour past 23 is rejected. A fixed "24h" cap plus a live 12-hour
 * echo ("21:30" → "9:30 PM") remove any AM/PM ambiguity.
 */

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import {
  TIME_SEGMENTS, resolveTimeSegment, sanitizeDigits, padTimeOnBlur,
  deriveTime, timeStateFromString, to12Hour, type TimeSegKey,
} from "@/components/ui/time-mask";

type Props = {
  value?: string;            // controlled "HH:MM"
  defaultValue?: string;
  onChange?: (hhmm: string) => void;
  error?: boolean;
  size?: "sm" | "md";
  className?: string;
  "aria-label"?: string;
};

const SEG_WIDTH = "2.4ch";

export function TimeSelect({ value, defaultValue, onChange, error, size = "md", className, ...rest }: Props) {
  const { t } = useT();
  const controlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue ?? "");
  const strValue = controlled ? (value ?? "") : internal;
  const init = timeStateFromString(strValue);

  const [hh, setHh] = useState(init.hh);
  const [mm, setMm] = useState(init.mm);
  const [invalid, setInvalid] = useState(false);

  const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const get = (k: TimeSegKey) => (k === "hh" ? hh : mm);
  const setSeg = (k: TimeSegKey, v: string) => (k === "hh" ? setHh(v) : setMm(v));
  const lastEmit = useRef<string>(strValue);

  const emit = (h: string, m: string) => {
    const { value: v, invalid: inv } = deriveTime({ hh: h, mm: m });
    setInvalid(inv);
    lastEmit.current = v;
    if (!controlled) setInternal(v);
    onChange?.(v);
  };

  // Controlled sync only — never fights local typing.
  useEffect(() => {
    if (!controlled) return;
    if (value === lastEmit.current) return;
    const s = timeStateFromString(value ?? "");
    setHh(s.hh); setMm(s.mm); setInvalid(false);
    lastEmit.current = value ?? "";
  }, [controlled, value]);

  const focusSeg = (idx: number) => {
    const el = refs[idx]?.current;
    if (el) { el.focus(); const n = el.value.length; try { el.setSelectionRange(n, n); } catch { /* noop */ } }
  };

  const onSegChange = (idx: number, raw: string) => {
    const seg = TIME_SEGMENTS[idx];
    const prev = get(seg.key);
    const digits = sanitizeDigits(raw, seg.max);
    const { value: v, advance } = resolveTimeSegment(seg.key, digits);
    // A rejected 2nd digit must not wipe what was already valid.
    const nextVal = v.length === 0 && prev.length > 0 && digits.length > prev.length ? prev : v;
    setSeg(seg.key, nextVal);
    const vals = { hh, mm, [seg.key]: nextVal };
    emit(vals.hh, vals.mm);
    if (advance && idx < 1) focusSeg(1);
  };

  const onSegKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    const atStart = (el.selectionStart ?? 0) === 0 && (el.selectionEnd ?? 0) === 0;
    const atEnd = (el.selectionStart ?? 0) === el.value.length;
    if (e.key === "Backspace" && el.value === "" && idx > 0) {
      e.preventDefault(); focusSeg(idx - 1);
    } else if (e.key === "ArrowLeft" && atStart && idx > 0) {
      e.preventDefault(); focusSeg(idx - 1);
    } else if (e.key === "ArrowRight" && atEnd && idx < 1) {
      e.preventDefault(); focusSeg(idx + 1);
    }
  };

  const onSegBlur = (idx: number) => {
    const seg = TIME_SEGMENTS[idx];
    const live = refs[idx].current?.value ?? get(seg.key);
    const padded = padTimeOnBlur(live);
    if (padded !== live) {
      setSeg(seg.key, padded);
      const cur = { hh: refs[0].current?.value ?? hh, mm: refs[1].current?.value ?? mm };
      cur[seg.key] = padded;
      emit(cur.hh, cur.mm);
    }
  };

  const errored = !!error || invalid;
  const h = size === "sm" ? "h-9" : "h-11";
  const fs = size === "sm" ? "text-[13px]" : "text-[16px]";
  const preview = to12Hour(strValue);

  return (
    <div className={cn("inline-flex flex-col", className)}>
      <div
        className={cn(
          "inline-flex items-stretch rounded-lg border overflow-hidden brand-focus-within transition-colors w-[112px]",
          h,
          errored ? "border-no-500" : "border-border",
        )}
        style={{ background: errored ? "oklch(58% 0.2 25 / 0.08)" : "var(--bg-inset)" }}
        role="group"
        aria-label={rest["aria-label"] ?? t.common.time24}
      >
        <div className={cn("flex-1 flex items-center justify-center font-mono tabular-nums", fs)}>
          {TIME_SEGMENTS.map((seg, idx) => (
            <span key={seg.key} className="flex items-center">
              {idx > 0 && <span className="text-text-subtle/50 mx-0.5 select-none" aria-hidden>:</span>}
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
                style={{ width: SEG_WIDTH }}
                className="bg-transparent text-center text-text outline-none placeholder:text-text-subtle/40"
                onChange={(e) => onSegChange(idx, e.target.value)}
                onKeyDown={(e) => onSegKeyDown(idx, e)}
                onBlur={() => onSegBlur(idx)}
                onFocus={(e) => { const n = e.target.value.length; try { e.target.setSelectionRange(n, n); } catch { /* noop */ } }}
              />
            </span>
          ))}
        </div>
        <span
          className="inline-flex items-center px-2 bg-bg-elevated border-l border-border font-mono text-[9px] uppercase tracking-[0.08em] text-text-subtle shrink-0 select-none"
          aria-hidden
        >
          24h
        </span>
      </div>
      {preview && !errored && (
        <span className="mt-0.5 font-mono text-[10px] text-text-subtle tabular-nums">= {preview}</span>
      )}
    </div>
  );
}
