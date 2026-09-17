/**
 * THE HOUSE-BOT CLOCK — every house-bot day key, hour key, schedule window and console time.
 *
 * ⛔ FIXED EAT, WHATEVER THE PLATFORM TIMEZONE SAYS (04 C14). The console's ordinary time helpers
 * follow the admin-configurable platform timezone; a house bot's day does not. A cap that "resets at
 * 00:00 EAT" has to reset at 21:00 UTC on a server whose platform timezone was set to UTC, so nothing
 * here reads a timezone setting, a locale or `Intl`. This is an explicit exception to the design
 * spec's formatting rule, on the `report-pack.ts` precedent, and the caller labels every time it
 * renders with `EAT_LABEL`.
 *
 * ⭐ BUILT ON `eat-day.ts`, NEVER BESIDE IT. The day arithmetic is re-exported rather than copied —
 * that module's own header records why a second copy of the offset is the bug.
 *
 * ⚠️ THE SQL AND THE JS MUST PRODUCE THE SAME STRINGS (04 A24). An AlertOnce key or an hour counter
 * is computed INSIDE the INSERT from the database clock, so two replicas either side of midnight
 * write one row, not two. `EAT_SQL` holds those fragments. The `eat*Key` builders give the same
 * strings from an instant; they serve the in-memory store and the tests that pin the two together.
 * ⛔ A key suffixed in JS is never handed to a Postgres claim — the replica that disagrees about the
 * minute is exactly the one the SQL form exists for.
 *
 * ⛔ PURE, AND IT IMPORTS NOTHING HOUSE-SIDE. The rules form renders in the browser and every other
 * house module imports this one, so the arrows only ever point inward.
 */
import { EAT_OFFSET_MS, eatDayKey, eatDayStartMs, eatDayWindow } from "@/lib/eat-day";

export { EAT_OFFSET_MS, eatDayKey, eatDayStartMs, eatDayWindow };

/** The zone word every house-bot time carries on screen, e.g. "14:03 EAT". */
export const EAT_LABEL = "EAT";

/** The zone name Postgres resolves. Tanzania has had no daylight saving since 1931 (`eat-day.ts`). */
export const EAT_SQL_TIMEZONE = "Africa/Dar_es_Salaam";

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;
export const MINUTES_PER_DAY = 1440;
export const MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY;

// ---------------------------------------------------------------------------
// Keys — one SQL fragment and one JS builder per unit
// ---------------------------------------------------------------------------

/**
 * Key suffixes computed from DB `now()` (04 A24, N1 §2).
 *
 * ⚠️ `now()` is the transaction's start time. That is what a throttle row wants — one key per
 * statement — and it is exactly why the seam's `staleAt` re-read uses `clock_timestamp()` instead
 * (N1 §3). Do not borrow these fragments for a freshness check.
 */
export const EAT_SQL = {
  dayKey: `to_char(now() AT TIME ZONE 'Africa/Dar_es_Salaam', 'YYYY-MM-DD')`,
  hourKey: `to_char(now() AT TIME ZONE 'Africa/Dar_es_Salaam', 'YYYY-MM-DD"T"HH24')`,
  // The EAT hour just ended — the hour an hourly summary covers (C4-SPEC ruling 80), as previousMonthKey names the
  // month the staff-edge pass judges.
  previousHourKey: `to_char((now() AT TIME ZONE 'Africa/Dar_es_Salaam') - interval '1 hour', 'YYYY-MM-DD"T"HH24')`,
  monthKey: `to_char(now() AT TIME ZONE 'Africa/Dar_es_Salaam', 'YYYY-MM')`,
  // The EAT month just ended. Subtracting a month from the 29th–31st clamps to the previous
  // month's last day, so the result is always the previous month.
  previousMonthKey: `to_char((now() AT TIME ZONE 'Africa/Dar_es_Salaam') - interval '1 month', 'YYYY-MM')`,
  minuteKey: `to_char(now() AT TIME ZONE 'Africa/Dar_es_Salaam', 'YYYY-MM-DD"T"HH24:MI')`,
} as const;

/** The units an EAT-suffixed AlertOnce key can carry (`ALERT_KEY` in `constants.ts`). */
export const EAT_KEY_UNITS = ["day", "hour", "previousHour", "month", "previousMonth", "minute"] as const;
export type EatKeyUnit = (typeof EAT_KEY_UNITS)[number];

/** Unit → SQL fragment, for a claim that is handed `{prefix, unit}` rather than a fragment. */
export const EAT_SQL_BY_UNIT: Record<EatKeyUnit, string> = {
  day: EAT_SQL.dayKey,
  hour: EAT_SQL.hourKey,
  previousHour: EAT_SQL.previousHourKey,
  month: EAT_SQL.monthKey,
  previousMonth: EAT_SQL.previousMonthKey,
  minute: EAT_SQL.minuteKey,
};

function eatIso(atMs: number): string {
  return new Date(atMs + EAT_OFFSET_MS).toISOString();
}

/**
 * The EAT hour (`YYYY-MM-DDTHH`) an instant falls in: 10:00 UTC on 14 Sep 2026 is "2026-09-14T13".
 * The date is part of the key on purpose (04 A10's `engine:db:<hour>`), so 13:00 today and 13:00
 * tomorrow are never the same throttle.
 */
export function eatHourKey(atMs: number): string {
  return eatIso(atMs).slice(0, 13);
}

/** The EAT hour just ended at an instant: 10:00 UTC on 14 Sep 2026 (13:00 EAT) is "2026-09-14T12". */
export function eatPreviousHourKey(atMs: number): string {
  return eatHourKey(atMs - 3_600_000);
}

/** The EAT month (`YYYY-MM`) an instant falls in. */
export function eatMonthKey(atMs: number): string {
  return eatIso(atMs).slice(0, 7);
}

/**
 * The EAT month just ended (`YYYY-MM`) at an instant: 00:00 EAT on 1 Oct 2026 is "2026-09", and
 * 00:00 EAT on 1 Jan 2027 is "2026-12". One millisecond before the instant's own EAT month began.
 */
export function eatPreviousMonthKey(atMs: number): string {
  const [y, m] = eatMonthKey(atMs).split("-").map(Number);
  return eatMonthKey(Date.UTC(y, m - 1, 1) - EAT_OFFSET_MS - 1);
}

/** The EAT minute (`YYYY-MM-DDTHH:MM`) an instant falls in — the Enter now preview throttle (N1 §6). */
export function eatMinuteKey(atMs: number): string {
  return eatIso(atMs).slice(0, 16);
}

/** The JS twin of `EAT_SQL_BY_UNIT`: the memory store's suffix for a unit. */
export function eatKeyFor(unit: EatKeyUnit, atMs: number): string {
  switch (unit) {
    case "day":
      return eatDayKey(atMs);
    case "hour":
      return eatHourKey(atMs);
    case "previousHour":
      return eatPreviousHourKey(atMs);
    case "month":
      return eatMonthKey(atMs);
    case "previousMonth":
      return eatPreviousMonthKey(atMs);
    case "minute":
      return eatMinuteKey(atMs);
  }
}

// ---------------------------------------------------------------------------
// The week — schedule windows (04 C15)
// ---------------------------------------------------------------------------

/** Monday first: a schedule's week, and the order the form lists days in. */
export const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const WEEKDAY_LABEL: Record<Weekday, string> = {
  MON: "Mon",
  TUE: "Tue",
  WED: "Wed",
  THU: "Thu",
  FRI: "Fri",
  SAT: "Sat",
  SUN: "Sun",
};

export function isWeekday(v: unknown): v is Weekday {
  return typeof v === "string" && (WEEKDAYS as readonly string[]).includes(v);
}

function eatMsOfDay(atMs: number): number {
  const shifted = atMs + EAT_OFFSET_MS;
  return ((shifted % DAY_MS) + DAY_MS) % DAY_MS;
}

/** The EAT weekday of an instant. */
export function eatWeekday(atMs: number): Weekday {
  return WEEKDAYS[(new Date(atMs + EAT_OFFSET_MS).getUTCDay() + 6) % 7];
}

/** Minutes since 00:00 EAT, 0–1439. */
export function eatMinuteOfDay(atMs: number): number {
  return Math.floor(eatMsOfDay(atMs) / MINUTE_MS);
}

/** Minutes since Monday 00:00 EAT, 0–10079. */
export function eatMinuteOfWeek(atMs: number): number {
  return WEEKDAYS.indexOf(eatWeekday(atMs)) * MINUTES_PER_DAY + eatMinuteOfDay(atMs);
}

/**
 * One piece of a schedule, in minutes of the week, half-open: `startMin ≤ t < endMin`, with
 * 0 ≤ startMin < endMin ≤ 10080. An overnight Sunday window is stored as TWO pieces, split at the
 * end of the week, so no piece ever wraps (`expandWindows` in `rules.ts` does the split).
 */
export type WeekInterval = { startMin: number; endMin: number };

/** Is this instant inside any of the intervals? */
export function windowContains(intervals: readonly WeekInterval[], atMs: number): boolean {
  const t = eatMinuteOfWeek(atMs);
  return intervals.some((i) => t >= i.startMin && t < i.endMin);
}

// ---------------------------------------------------------------------------
// Parsing and formatting
// ---------------------------------------------------------------------------

/**
 * A typed `HH:MM` → minutes since 00:00.
 *
 * ⚠️ HALF-TYPED IS NOT EMPTY (04 C15). The kit's time mask reports "2_" as an empty, valid value,
 * so the form would save a window nobody finished typing. Fewer than five digits-or-colons is
 * INCOMPLETE; five that don't make a real time ("24:00", "12:60") are INVALID. Both give the same
 * field error; the split exists so a form can wait for the fifth character before complaining.
 */
export function parseEatTime(raw: string): number | "INCOMPLETE" | "INVALID" {
  const s = raw.trim();
  const m = /^(\d{2}):(\d{2})$/.exec(s);
  if (m) {
    const h = Number(m[1]);
    const min = Number(m[2]);
    return h <= 23 && min <= 59 ? h * 60 + min : "INVALID";
  }
  return (s.match(/[\d:]/g) ?? []).length < 5 ? "INCOMPLETE" : "INVALID";
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Minutes since 00:00 (0–1440) → "HH:MM". A window's end of 1440 renders "00:00", as typed. */
export function formatMinutes(min: number): string {
  const whole = Math.min(Math.max(Math.round(min), 0), MINUTES_PER_DAY);
  return `${pad2(Math.floor(whole / 60) % 24)}:${pad2(whole % 60)}`;
}

const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

export type EatPattern = "HH:MM" | "HH:MM:SS" | "D MMM" | "D MMM YYYY" | "D MMM, HH:MM";

/**
 * An instant in EAT, English months. There is no zone suffix: the sentence that holds the time
 * appends " EAT" itself, so a template never ends up with it twice.
 */
export function formatEat(atMs: number, pattern: EatPattern): string {
  const d = new Date(atMs + EAT_OFFSET_MS);
  const hhmm = `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
  const dayMonth = `${d.getUTCDate()} ${MONTHS_EN[d.getUTCMonth()]}`;
  switch (pattern) {
    case "HH:MM":
      return hhmm;
    case "HH:MM:SS":
      return `${hhmm}:${pad2(d.getUTCSeconds())}`;
    case "D MMM":
      return dayMonth;
    case "D MMM YYYY":
      return `${dayMonth} ${d.getUTCFullYear()}`;
    case "D MMM, HH:MM":
      return `${dayMonth}, ${hhmm}`;
  }
}

/**
 * A duration after a stake: 20 → "0:20", 307 → "5:07", 3907 → "1:05:07".
 *
 * The timing previews and the feed say "held to 5:07 after the stake" (PLAN F2, N2 §5); a clock
 * time would read as a time of day, which is the one thing this number is not.
 */
export function formatAfterStake(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = pad2(s % 60);
  return h > 0 ? `${h}:${pad2(m)}:${rest}` : `${m}:${rest}`;
}
