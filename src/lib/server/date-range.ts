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
 *   ?range=<preset>                      preset window (ids: lib/query/windows.ts RESOLVABLE_PRESETS)
 *   ?range=custom&from=<iso>&to=<iso>    custom window; from/to are EAT wall-clock,
 *                                        "YYYY-MM-DD" (whole day) or "YYYY-MM-DDTHH:MM"
 */
import { EAT_OFFSET_MS, startOfEatDay, startOfEatMonth } from "./report-money";
// ⛔ THE PRESET VOCABULARY HAS ONE HOME, AND IT IS NOT THIS FILE. `lib/query/windows.ts` owns the
// ids; this file owns the arithmetic that turns one into a window. A `RANGE_PRESETS` used to live
// here too — a zero-reader second list, missing three ids this resolver actually resolves.
import { RESOLVABLE_PRESETS, type ResolvablePresetId } from "@/lib/query/windows";

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
/**
 * Hard cap on a CUSTOM window, so a hand-typed from/to cannot trigger an unbounded scan.
 * ⚠️ IT IS NOT APPLIED TO PRESETS, AND THAT IS A RULING, NOT AN OVERSIGHT. `?range=all`
 * resolves to `win(0, now)` deliberately: capping it would silently understate a figure labelled
 * "All time", which report-money.ts records as the worse defect of the two. This line used to
 * read "a filter can never trigger an unbounded scan", which flatly contradicted that ruling.
 */
export const MAX_RANGE_MS = 400 * DAY_MS;

/**
 * ⚠️ `string[]` IS A REAL RUNTIME SHAPE HERE, NOT A DEFENSIVE FLOURISH. Seven pages hand their raw
 * Next `searchParams` straight to `resolveRange(sp, …)`, and Next delivers a REPEATED query param
 * (`?from=a&from=b`) as an array. The page types declare `string`, so nothing caught it and
 * `parseEatLocal` called `.trim()` on an array — a TypeError that takes out the whole server
 * component, from a URL anyone can type. The resolver normalises to the FIRST value instead.
 */
export type RangeParams = {
  range?: string | string[] | null;
  from?: string | string[] | null;
  to?: string | string[] | null;
};

/** First value wins for a repeated param — see the note on RangeParams. */
const one = (v: string | string[] | null | undefined): string | undefined =>
  (Array.isArray(v) ? v[0] : v) ?? undefined;

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
  /**
   * 🔴 THE PARAMS THAT COULD NOT BE READ — a window that silently substitutes itself is the
   * defect this exists to surface. `parseEatLocal`'s pattern is anchored, so a full ISO instant
   * (`2026-09-20T13:00:00.000Z`) does NOT match: it returns null, the custom branch below falls
   * back to `now - 24h -> now`, and the result is still LABELLED "custom". A link built from
   * `toISOString()` therefore lands an officer on a window nobody chose, with nothing anywhere
   * saying so - measured: an hour-wide window handed over as an ISO pair came back spanning
   * twenty-four hours.
   * (Additive on purpose. The fallback behaviour is unchanged for all ten callers; this only
   * lets a surface SAY that it substituted. A caller that ignores the field behaves as before.)
   */
  unreadable?: Array<"from" | "to">;
};

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

/**
 * The inverse of `parseEatLocal`, and it lives HERE for exactly that reason: an instant written for a `?from=` /
 * `?to=` address must come out in the one shape the parser above accepts, and a producer in another module drifts
 * from it silently.
 *
 * ⛔ AN ISO INSTANT IS NOT THIS SHAPE, AND THAT IS NOT A DETAIL — IT IS A MEASURED DEFECT. `parseEatLocal`'s
 * pattern is anchored (`…(\d{2}):(\d{2}))?$`), so `2026-09-20T13:00:00.000Z` does NOT match: it returns null, and
 * `resolveRange`'s custom branch then falls back to `now - DAY_MS → now`. A link built from `toISOString()` therefore
 * lands on a window labelled **custom** that is silently the LAST 24 HOURS — measured, not argued: an hour window
 * handed over as a full ISO pair came back spanning 24 hours, with no refusal said anywhere, because nothing in the
 * custom branch reports a `from` it could not read.
 *
 * ⛔ AND THE ZONE IS EAT, NOT UTC. `parseEatLocal` reads its argument as an EAT wall clock, so handing it a
 * `…Z` instant — even one shaped `YYYY-MM-DDTHH:MM` — would shift the window by the 3-hour offset and land the
 * reader on the wrong hour under the right label. This formatter adds the offset for the same reason the parser
 * subtracts it, so `parseEatLocal(formatEatLocal(ms)).ms === ms` for any minute-aligned instant.
 */
export function formatEatLocal(ms: number): string {
  const d = new Date(ms + EAT_OFFSET_MS);
  const p2 = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}T${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`;
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
export function resolveRange(
  sp: RangeParams,
  now = Date.now(),
  /* ⭐ TYPED AGAINST THE VOCABULARY, so a default this resolver cannot resolve is a COMPILE error
     rather than a window nobody chose. */
  defaultPreset: ResolvablePresetId = "7d",
): ResolvedRange {
  const range = one(sp.range);
  const rawFrom = one(sp.from);
  const rawTo = one(sp.to);

  // ── Custom window ──────────────────────────────────────────────────────────
  if (range === "custom" || rawFrom || rawTo) {
    const f = parseEatLocal(rawFrom);
    const t = parseEatLocal(rawTo);
    /* Present in the URL but unparseable - see `unreadable` on ResolvedRange. An ABSENT param is
       not unreadable; only one the caller supplied and this resolver could not read. */
    const unreadable: Array<"from" | "to"> = [];
    if (rawFrom && !f) unreadable.push("from");
    if (rawTo && !t) unreadable.push("to");
    // A date-only "to" is inclusive of that whole EAT day.
    let start = f?.ms ?? (t ? t.ms - DAY_MS : now - DAY_MS);
    let end = t ? (t.hasTime ? t.ms : t.ms + DAY_MS) : now;
    if (start > end) { const tmp = start; start = end; end = tmp; } // guard an inverted range
    end = Math.min(end, now);                                       // never report the future
    if (end - start > MAX_RANGE_MS) start = end - MAX_RANGE_MS;     // cap unbounded scans
    if (end <= start) start = end - HOUR_MS;                        // never a zero/negative window
    return {
      start, end, preset: "custom",
      label: `${fmtEat(start)} → ${fmtEat(end)}`,
      from: rawFrom,
      to: rawTo,
      ...(unreadable.length ? { unreadable } : {}),
    };
  }

  /* ⛔ NO SELF-RECURSION ON THE DEFAULT. This used to end `default: return resolveRange({ range:
     defaultPreset }, now, defaultPreset)` — which re-enters `default` and recurses forever for any
     `defaultPreset` the switch does not handle, taking the request out with a stack overflow
     instead of a window. It was latent only because all thirteen call sites happened to pass a
     valid id. The arms are a pure lookup now, so an unresolvable id falls through to `7d` in one
     step and the failure mode is a wrong-but-bounded window, never a crash. */
  return presetWindow(range, now) ?? presetWindow(defaultPreset, now) ?? presetWindow("7d", now)!;
}

/** One preset id → its window, or null when the id is not in the vocabulary. Never recurses. */
function presetWindow(range: string | undefined, now: number): ResolvedRange | null {
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
    default:    return null;
  }
}

/* ⭐ THE SWITCH ABOVE HANDLES EXACTLY THE VOCABULARY — proven here, at module load, rather than
   trusted. An id added to `RESOLVABLE_PRESETS` without an arm silently becomes the caller's
   default; an arm with no id is dead code. Both are the same defect seen from two sides, and this
   throws on the spot instead of shipping either. `test:date-range` asserts the same thing with a
   red control, so the property is checked by a guard as well as guarded at the boundary. */
{
  const unresolvable = RESOLVABLE_PRESETS.filter((id) => presetWindow(id, 0) === null);
  if (unresolvable.length) {
    throw new Error(`date-range.ts: RESOLVABLE_PRESETS names ${unresolvable.join(", ")} but the resolver has no arm for it`);
  }
}
