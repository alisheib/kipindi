import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TZ_NUMBER = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function formatTzs(value: number): string {
  const sign = value < 0 ? "−" : "";
  return `TZS ${sign}${TZ_NUMBER.format(Math.abs(value))}`;
}

export function formatTzsCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (abs >= 1_000_000_000) return `TZS ${sign}${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `TZS ${sign}${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `TZS ${sign}${Math.round(abs / 1_000)}K`;
  return `TZS ${sign}${TZ_NUMBER.format(abs)}`;
}

/** Absolute magnitude, no sign: "TZS 1,234" (rounds). For P&L cells that carry
 *  their own sign/colour and only need the number. */
export function formatTzsAbs(value: number): string {
  return `TZS ${TZ_NUMBER.format(Math.round(Math.abs(value)))}`;
}

/** Signed P&L: "+TZS 1,234" / "−TZS 1,234" (real minus glyph). */
export function formatTzsSigned(value: number): string {
  return `${value >= 0 ? "+" : "−"}${formatTzsAbs(value)}`;
}

export function formatNumber(value: number): string {
  return TZ_NUMBER.format(value);
}

/* ── Date formatting ─────────────────────────────────────────────── */

/** Platform timezone — admin-configurable at /admin/config, persisted to DB.
 *  Defaults to Africa/Dar_es_Salaam (EAT, UTC+3) for Tanzania.
 *  ALL player-visible times, AI sentinel prompts, and resolution displays
 *  use this timezone. Change it in admin → changes everywhere instantly.
 *  Admin/audit trails always store UTC; this only affects display. */
import { getPlatformTimezone } from "@/lib/server/platform-config";
/** Reads the current admin-configured timezone. Dynamic — reflects admin changes. */
export function PLATFORM_TZ_GET(): string { return getPlatformTimezone(); }
function tz(): string { return getPlatformTimezone(); }

/** "11 Jun 2026" */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: tz() });
}

/** "11 Jun" */
export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: tz() });
}

/** "11 Jun 2026, 14:30" */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: tz() });
}

/** "14:30:05" — time-only for feeds / audit */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: tz() });
}

/** "14:30" — short clock for compact feeds */
export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: tz() });
}

/** "2026-06-11" — sortable date string */
export function formatDateISO(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

/** "11 Jun 2026, 14:30" — safe version that returns "—" for null/undefined/invalid */
export function formatDateTimeSafe(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return formatDateTime(iso);
}

/** "$0.05" — USD cost for AI generation reports */
export function formatUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

export function hexToRgba(hex: string, alpha = 1): string {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3 ? h.split("").map((c) => c + c).join("") : h,
    16,
  );
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Fill {placeholders} in an i18n string.
 *
 * The dictionary is a plain frozen object — there is no t() function and no ICU
 * layer — so interpolation is done at the call site. This is that, in one place,
 * with a GLOBAL replace: `String.replace("{pct}", …)` only swaps the FIRST
 * occurrence, so a sentence that mentions the rate twice would silently keep one
 * raw `{pct}` in the player's face. Several strings now do mention it twice.
 *
 *   fill(t.dialog.freeExitBody, { mins: 5, pct: 10 })
 */
export function fill(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (raw, k: string) =>
    Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : raw,
  );
}

/** Format a rate (0.10) as a percentage string ("10%"), trimming a trailing .0 */
export function fmtRate(rate: number): string {
  return `${pctNum(rate)}%`;
}

/**
 * A rate (0.10) as the bare number for a "{pct}%" slot → 10.
 *
 * The copy carries the "%" so that Chinese can put it where Chinese puts it.
 * Rounded to one decimal: an admin who types 12.5% must see 12.5, not
 * 12.500000000000002.
 */
export function pctNum(rate: number): number {
  const v = rate * 100;
  return Number.isInteger(v) ? v : Number(v.toFixed(1));
}
