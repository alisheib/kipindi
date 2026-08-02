/**
 * EAST AFRICA CALENDAR DAYS — the one place the platform decides what "a day" is.
 *
 * 50pick is a Tanzanian product: a player's "yesterday" is an EAT day, not a UTC
 * one, and the two disagree for the three hours either side of midnight — which on
 * a game that runs 5-minute rounds around the clock is a lot of rounds.
 *
 * ⚠️ THIS MODULE EXISTS BECAUSE THE ARITHMETIC WAS ABOUT TO BE WRITTEN TWICE.
 * The Up & Down daily digest bins settled rounds into EAT days, and the page its
 * deep link opens (`/updown/history?day=…`) has to filter by the SAME day or the
 * message is a lie. The first draft had the two implementations sitting in
 * different files "in the same shape on purpose so a reader can see they agree" —
 * agreement by inspection, which is exactly what this campaign has been burned by.
 * They now share this. If you need EAT day maths anywhere else, import it; do not
 * copy the offset.
 *
 * Tanzania is UTC+3 with no daylight saving and has had none since 1931, so the
 * fixed offset is exact rather than an approximation. There is deliberately no
 * timezone library here: a dependency that could change its mind about EAT is a
 * worse risk than three hours of arithmetic.
 */

/** East Africa Time offset from UTC, in milliseconds. Fixed, no DST. */
export const EAT_OFFSET_MS = 3 * 60 * 60 * 1000;

/** The EAT calendar day (`YYYY-MM-DD`) that a UTC instant falls in. */
export function eatDayKey(atMs: number): string {
  return new Date(atMs + EAT_OFFSET_MS).toISOString().slice(0, 10);
}

/** The UTC instant at which an EAT calendar day begins (21:00 UTC the day before). */
export function eatDayStartMs(dayKey: string): number {
  return Date.parse(`${dayKey}T00:00:00.000Z`) - EAT_OFFSET_MS;
}

/**
 * The half-open UTC window `[from, to)` covering one EAT day, or `null` if the key
 * is not a well-formed `YYYY-MM-DD`.
 *
 * Returns null rather than throwing because one caller is a page reading a query
 * string a player can type anything into — `?day=lol` must render the unfiltered
 * page, not a 500.
 */
export function eatDayWindow(dayKey: string): { fromMs: number; toMs: number } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return null;
  const fromMs = eatDayStartMs(dayKey);
  if (!Number.isFinite(fromMs)) return null;
  return { fromMs, toMs: fromMs + 24 * 60 * 60 * 1000 };
}

/**
 * Does this ISO timestamp fall inside that EAT day?
 *
 * Half-open: the first instant of the day counts, the first instant of the NEXT
 * day does not. An unparseable timestamp is not in any day.
 */
export function isInEatDay(iso: string | null | undefined, dayKey: string): boolean {
  const w = eatDayWindow(dayKey);
  if (!w || !iso) return false;
  const at = Date.parse(iso);
  return Number.isFinite(at) && at >= w.fromMs && at < w.toMs;
}

/**
 * `2026-08-02` → `2 Aug` / `2 Ago` / `2026年8月2日`.
 *
 * `monthsShort` is the caller's own dictionary section, passed in rather than
 * imported, so this module stays free of the i18n graph and both the server digest
 * and the client-rendered page can use it. Chinese takes the numeric form its own
 * `monthsShort` already encodes.
 */
export function formatEatDay(dayKey: string, monthsShort: readonly string[], locale: "en" | "sw" | "zh"): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const month = monthsShort[m - 1] ?? String(m);
  return locale === "zh" ? `${y}年${month}${d}日` : `${d} ${month}`;
}
