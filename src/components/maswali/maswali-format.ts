/**
 * MASWALI MILLIONEA — HOW A WEEK'S TIMES AND COUNTS ARE SAID (MASWALI-BUILD S5).
 *
 * A Millionea week is read in East Africa Time on every device (`eat-day.ts`): "Ijumaa 18:00", never the device's zone.
 * The weekday words are the dictionary's (`millionea.weekdays`, Monday first), so this file holds no word of any language,
 * and no rule number either: every count it is handed is the week's own.
 *
 * Pure and isomorphic: the server components and the slip (a client component) read the same functions, so a time is
 * said one way on every surface.
 */
import { EAT_OFFSET_MS } from "@/lib/eat-day";
import { LIST_TAG } from "@/lib/rail-list";
import { fill, formatNumber } from "@/lib/utils";
import type { Dict, Locale } from "@/lib/i18n-dict";

/** The ISO weekday (0 = Monday … 6 = Sunday) and the 24-hour EAT clock of an instant. */
export function eatParts(atMs: number): { weekday: number; clock: string; midnight: boolean } {
  const eat = new Date(atMs + EAT_OFFSET_MS);
  const h = eat.getUTCHours(), m = eat.getUTCMinutes();
  return {
    weekday: (eat.getUTCDay() + 6) % 7,
    clock: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
    midnight: h === 0 && m === 0,
  };
}

/** "Ijumaa" — the weekday an instant falls on, in EAT. */
export function eatWeekday(t: Dict, atMs: number): string {
  return Number.isFinite(atMs) ? t.millionea.weekdays[eatParts(atMs).weekday] : "—";
}

/** "Ijumaa 18:00" — the weekday and the clock, in EAT. ⛔ "—" for an instant that is not one, never a thrown page. */
export function eatWeekdayClock(t: Dict, atMs: number): string {
  if (!Number.isFinite(atMs)) return "—";
  const p = eatParts(atMs);
  return `${t.millionea.weekdays[p.weekday]} ${p.clock}`;
}

/** "18:00" — the EAT clock alone (a free-cancel deadline inside the same day). */
export function eatClock(atMs: number): string {
  return Number.isFinite(atMs) ? eatParts(atMs).clock : "—";
}

/**
 * A phase of the week as a range ("Jumatatu – Ijumaa 18:00"): a start at midnight is a whole day and reads as its
 * weekday; any other instant carries its clock. The end reads its clock unless it is a whole day too.
 */
export function eatRange(t: Dict, fromMs: number, toMs: number): string {
  const end = (ms: number) => (eatParts(ms).midnight ? eatWeekday(t, ms) : eatWeekdayClock(t, ms));
  return `${end(fromMs)} – ${end(toMs)}`;
}

/**
 * A question's source as a reader sees it: its domain without a leading "www." ("www.nbc.co.tz" → "nbc.co.tz"; S5 VIS R2)
 * — the register and the slip print one source one way (A5). Nothing else is touched: another subdomain, the case, the rest.
 */
export function sourceLabel(domain: string): string {
  return domain.replace(/^www\./i, "");
}

/** The label a player reads for a reserve: A1…A5 ("Akiba", O-8); the code and the rules keep R1…R5. */
export function reserveLabel(ordinal: number): string {
  return `A${ordinal}`;
}

/**
 * The ISO week a week's stamped code names ("MLN-2026-W44" → 44, a drive week's "MLD-…" alike): every "Wiki 44" a player
 * reads is the engine's own stamp (`eatWeekCode`), never a count of weeks typed or kept here. 0 for a code that is not one.
 */
export function weekNumberOf(code: string): number {
  const m = /-W([0-9]{1,2})$/.exec(code);
  return m ? Number(m[1]) : 0;
}

/** "Wiki 42" / "Week 42" / "第42周". */
export function weekWord(t: Dict, week: number): string {
  return fill(t.millionea.week, { week });
}

/** "Millionea · Wiki 42" — the product's short name over its week. */
export function productWeek(t: Dict, week: number): string {
  return `${t.millionea.productLabel} · ${weekWord(t, week)}`;
}

/** "7, 9 na A5" — a list joined the way the reader's language joins one (`Intl.ListFormat`, no conjunction typed here). */
export function joinList(locale: Locale, items: readonly string[]): string {
  return new Intl.ListFormat(LIST_TAG[locale], { type: "conjunction" }).format([...items]);
}

/**
 * A `millionea` word named by a lookup map's key (`WEEK_STATE_KEY`, `TICKET_SHOWN_KEY`, `MASWALI_VOID_REASON_KEY`).
 * ⛔ A key the dictionary lacks shows as itself, as `fill` leaves an unknown placeholder: a typo is seen, never blank.
 * Every key of the three maps resolves in en, sw and zh, and `test:maswali-i18n` §2 holds them there (MASWALI-PLAN §7b).
 */
export function millioneaWord(t: Dict, key: string): string {
  const v = (t.millionea as unknown as Record<string, unknown>)[key];
  return typeof v === "string" ? v : key;
}

/** The singular or the counted form of a string pair (`…One` when there is exactly one). */
export function counted(n: number, one: string, many: string, vars: Record<string, string | number> = {}): string {
  return n === 1 ? fill(one, vars) : fill(many, { ...vars, n: formatNumber(n) });
}
