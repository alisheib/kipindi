/**
 * resolveRange — the ONE date+time window resolver for the whole platform.
 *
 * Every filterable surface (reports, finance, transactions, AI usage, analytics, …)
 * reads its window through this, so the meaning of "Today", "Last 6 hours", or a custom
 * `from/to` is identical everywhere. It supersedes the three ad-hoc patterns that existed
 * before (PeriodPicker `?range=`, `datePresetToRange` `?date=`, the transactions page's
 * own `RANGES`).
 *
 * ── TIMEZONE (critical) ──────────────────────────────────────────────────────
 * The platform runs on East Africa Time (UTC+3, no DST). "Today" means the EAT calendar
 * day, and a custom `from`/`to` wall-clock ("2026-07-26T14:30") is interpreted as EAT —
 * NOT as the server's UTC or the viewer's local zone. All day/month maths reuse the
 * EAT-safe helpers in report-money.ts so this file has ONE source of truth for the zone.
 *
 * URL contract:
 *   ?range=<preset>                      preset window (see RANGE_PRESETS)
 *   ?range=custom&from=<iso>&to=<iso>    custom window; from/to are EAT wall-clock,
 *                                        "YYYY-MM-DD" (whole day) or "YYYY-MM-DDTHH:MM"
 */
import { EAT_OFFSET_MS, startOfEatDay, startOfEatMonth } from "./report-money";

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
/** Hard cap on a resolved window — a filter can never trigger an unbounded scan. */
export const MAX_RANGE_MS = 400 * DAY_MS;

export type RangeParams = { range?: string | null; from?: string | null; to?: string | null };

export type ResolvedRange = {
  start: number;
  end: number;
  /** The preset id in force ("custom" for a from/to window). */
  preset: string;
  /** Human label for the active window (e.g. "Last 6 hours", "26 Jul 14:30 → now"). */
  label: string;
  /** Echoed back for the picker to re-render the custom fields. */
  from?: string;
  to?: string;
};

/** Preset ids offered by the UI, in display order. `custom` is handled separately. */
export const RANGE_PRESETS = [
  { id: "1h", label: "Last hour" },
  { id: "6h", label: "Last 6 hours" },
  { id: "24h", label: "Last 24 hours" },
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "mtd", label: "Month to date" },
] as const;

export type RangePresetId = (typeof RANGE_PRESETS)[number]["id"];

/**
 * Parse an EAT wall-clock string to an epoch ms instant.
 * Accepts "YYYY-MM-DD" (→ 00:00 EAT) or "YYYY-MM-DDTHH:MM" / "YYYY-MM-DD HH:MM".
 * Returns `{ ms, hasTime }`, or null when the string isn't a valid date.
 */
export function parseEatLocal(s: string | null | undefined): { ms: number; hasTime: boolean } | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?$/.exec(s.trim());
  if (!m) return null;
  const [, y, mo, d, hh, mi] = m;
  const year = +y, month = +mo, day = +d, hour = hh != null ? +hh : 0, min = mi != null ? +mi : 0;
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || min > 59) return null;
  const utc = Date.UTC(year, month - 1, day, hour, min);
  // Round-trip guard: Date.UTC rolls over invalid days (e.g. 31 Feb) — reject those.
  const back = new Date(utc);
  if (back.getUTCFullYear() !== year || back.getUTCMonth() !== month - 1 || back.getUTCDate() !== day) return null;
  return { ms: utc - EAT_OFFSET_MS, hasTime: hh != null };
}

function fmtEat(ms: number): string {
  // "26 Jul 14:30" in EAT — for the active-window label only.
  const d = new Date(ms + EAT_OFFSET_MS);
  const mon = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getUTCMonth()];
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  return `${d.getUTCDate()} ${mon} ${hh}:${mi}`;
}

const win = (start: number, end: number, preset: string, label: string): ResolvedRange => ({ start, end, preset, label });

/**
 * Resolve the active window from URL params. Custom (from/to) wins when present; else the
 * preset; else the default (7d). Always returns a sane, bounded, non-inverted window with
 * `end` never in the future.
 */
export function resolveRange(sp: RangeParams, now = Date.now(), defaultPreset: string = "7d"): ResolvedRange {
  const range = sp.range ?? undefined;

  // ── Custom window ──────────────────────────────────────────────────────────
  if (range === "custom" || sp.from || sp.to) {
    const f = parseEatLocal(sp.from);
    const t = parseEatLocal(sp.to);
    // A date-only "to" is inclusive of that whole EAT day.
    let start = f?.ms ?? (t ? t.ms - DAY_MS : now - DAY_MS);
    let end = t ? (t.hasTime ? t.ms : t.ms + DAY_MS) : now;
    if (start > end) { const tmp = start; start = end; end = tmp; } // guard an inverted range
    end = Math.min(end, now);                                       // never report the future
    if (end - start > MAX_RANGE_MS) start = end - MAX_RANGE_MS;     // cap unbounded scans
    if (end <= start) start = end - HOUR_MS;                        // never a zero/negative window
    return { start, end, preset: "custom", label: `${fmtEat(start)} → ${fmtEat(end)}`, from: sp.from ?? undefined, to: sp.to ?? undefined };
  }

  // ── Presets ────────────────────────────────────────────────────────────────
  switch (range) {
    case "1h":  return win(now - HOUR_MS, now, "1h", "Last hour");
    case "6h":  return win(now - 6 * HOUR_MS, now, "6h", "Last 6 hours");
    case "24h": return win(now - 24 * HOUR_MS, now, "24h", "Last 24 hours");
    case "today":     return win(startOfEatDay(now), now, "today", "Today");
    case "yesterday": return win(startOfEatDay(now) - DAY_MS, startOfEatDay(now), "yesterday", "Yesterday");
    case "7d":  return win(now - 7 * DAY_MS, now, "7d", "Last 7 days");
    case "28d": return win(now - 28 * DAY_MS, now, "28d", "Last 28 days");
    case "30d": return win(now - 30 * DAY_MS, now, "30d", "Last 30 days");
    case "mtd": return win(startOfEatMonth(now), now, "mtd", "Month to date");
    case "qtd": {
      const d = new Date(now + EAT_OFFSET_MS);
      const qStartMonth = Math.floor(d.getUTCMonth() / 3) * 3;
      const start = Date.UTC(d.getUTCFullYear(), qStartMonth, 1) - EAT_OFFSET_MS;
      return win(start, now, "qtd", "Quarter to date");
    }
    case "all": return win(0, now, "all", "All time");
    default:    return resolveRange({ range: defaultPreset }, now, defaultPreset);
  }
}
