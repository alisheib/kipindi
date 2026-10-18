/**
 * MASWALI MILLIONEA — THE PUBLIC HOLIDAYS A WEEK'S CLOSE IS REVIEWED AGAINST (MASWALI-BUILD S7; MB-85, OD-27).
 *
 * The Owner's list of public holidays, as East Africa Time calendar dates ("YYYY-MM-DD"). EMPTY BY DEFAULT: a holiday is
 * recorded, never computed (Eid moves with the moon, a day of national mourning is declared), so the list holds exactly
 * what the Owner entered. The builder's pre-open checklist (`consoleWeekDetail`) names a listed holiday the week's sales
 * close falls on, as a WARNING beside the open's refusals and never one of them: OD-27 runs every week, and the officer
 * brings the close forward once the week is open (R-WEEK, MB-28) or skips the week with notice.
 * ⛔ Never a refusal, and never a figure a player reads. Validated, read back before "saved" (`setVerified`), and
 *    audited `{ before, after, changes }` by the factory.
 */
import { defineConfig } from "./define-config";
import { eatDayKey } from "@/lib/eat-day";

export const MASWALI_HOLIDAYS_KEY = "maswali.holidays";

export type MaswaliHolidays = { dates: string[] };

export const MASWALI_HOLIDAYS_NONE: MaswaliHolidays = { dates: [] };

/** A bound on one save, so a form can never post an unbounded list: years of holidays fit well inside it. */
export const MASWALI_HOLIDAYS_MAX = 200;

/** A real calendar date in "YYYY-MM-DD" (2027-02-30 is not one: it must read back as itself). */
function isCalendarDate(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const t = Date.parse(`${v}T00:00:00.000Z`);
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === v;
}

/** Why a holiday list is refused, in words an officer can act on — or null when it is acceptable. */
export function maswaliHolidaysProblem(h: MaswaliHolidays): string | null {
  if (!h || !Array.isArray(h.dates)) return "The holiday list is unreadable.";
  if (h.dates.length > MASWALI_HOLIDAYS_MAX) return `At most ${MASWALI_HOLIDAYS_MAX} holidays may be listed.`;
  for (const d of h.dates) if (!isCalendarDate(d)) return `${JSON.stringify(d)} is not a calendar date (YYYY-MM-DD, East Africa Time).`;
  if (new Set(h.dates).size !== h.dates.length) return "A date is listed twice.";
  return null;
}

/** Hydration keeps the dates it can read; anything else falls back to the empty default. */
const migrate = (p: Record<string, unknown>): Partial<MaswaliHolidays> =>
  Array.isArray(p.dates) && p.dates.every((d) => typeof d === "string") ? { dates: [...(p.dates as string[])] } : {};

const cfg = defineConfig<MaswaliHolidays>({
  key: MASWALI_HOLIDAYS_KEY,
  defaults: MASWALI_HOLIDAYS_NONE,
  migrate,
  validate: (h) => {
    const why = maswaliHolidaysProblem(h);
    return why ? { ok: false, reason: why } : { ok: true };
  },
  audit: { action: "maswali.holidays.updated", targetType: "MaswaliHolidays" },
});

/** The listed holidays, for the checklist. Sync; may be this container's boot value. */
export function getMaswaliHolidays(): MaswaliHolidays {
  return { dates: [...cfg.get().dates] };
}

/** The listed holiday the East Africa Time date of `atMs` falls on, or null. */
export function holidayOn(atMs: number, holidays: MaswaliHolidays = getMaswaliHolidays()): string | null {
  const day = eatDayKey(atMs);
  return holidays.dates.includes(day) ? day : null;
}

/**
 * Replace the list (the Owner's). The ONE writer: trimmed and sorted, refused whole when any date does not validate, and
 * "saved" only after the row was read back.
 */
export async function saveMaswaliHolidays(dates: readonly string[], ownerId: string): Promise<{ ok: true; holidays: MaswaliHolidays } | { ok: false; error: string }> {
  const next: MaswaliHolidays = { dates: dates.map((d) => String(d).trim()).sort() };
  const why = maswaliHolidaysProblem(next);
  if (why) return { ok: false, error: why };
  const fresh = await cfg.reload();
  if (!fresh.ok) return { ok: false, error: "The current holiday list could not be read, so nothing was changed. Please try again." };
  const res = await cfg.setVerified(next, ownerId);
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, holidays: { dates: [...res.config.dates] } };
}
