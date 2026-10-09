/**
 * THE END OF A BREAK OR A SELF-EXCLUSION — one way to carry it, one way to read it back, one way to say it (the visual
 * pass, round 4, helper R4-I, 2026-10-09; the edges findings E9, E16, E17, E52, E55).
 *
 * 🔴 WHAT THE TILES SHOWED. Five surfaces state when a player's own protective choice ends, and they said it four ways:
 *   · the sign-in page after a self-exclusion printed the raw query value, "hadi 2026-10-10" — a DATE with no time, so a
 *     24-hour exclusion taken at 05:05 EAT read as if it ended at midnight (tiles 113–130);
 *   · the bet refusal printed the server's English formatter, "hadi 9 Oct 2026, 06:02" on Swahili and Chinese screens
 *     (tiles 036 040 044 102 106 110);
 *   · the sign-in page after a break said only "when the break ends" — the end was never carried there (tiles 003–011);
 *   · /wallet/deposit and the limits page said it right, "9 Okt, 06:02" (`formatEatDateTime`).
 * ⭐ So the end travels as the INSTANT (`breakEndParam`, canonical ISO-8601 in UTC) and is always printed by
 * `formatBreakEnd`: the East Africa clock (Tanzania's own day, fixed UTC+3), the reader's month words, the date AND the
 * time — `formatEatDateTime`, the formatter the deposit page and the limits callout already use.
 * ⛔ A query value is PRINTED, NEVER BELIEVED: `readBreakEndParam` accepts exactly the two shapes a server writes — the
 * canonical instant this module writes, or the bare `YYYY-MM-DD` older links carry — and nothing else ("7 Oct. To reopen
 * pay …" falls back to the sentence with no date). Nothing decides anything on it: the gate reads the database.
 * ⚠️ No "EAT" is printed after the time. Every player-facing time on the platform is already EAT without a suffix (the
 * receipts, a market's close, the deposit notice, the limits callout); one surface with a suffix would imply the others
 * are on another clock. Whether to add it everywhere is the owner's call (listed in R4-I's report), not a format change.
 * Pure — no React, no server import — so the sign-in page, the bet panel and the Wallet sheet share it.
 */
import { formatEatDate, formatEatDateTime } from "@/lib/eat-day";

/** A reader's running break or self-exclusion, as a page needs it: when it ends, and which of the two it is. */
export type BreakState = { until: string; exclusion: boolean };

/** `isLockedOut`'s answer as a `BreakState`, or null when nothing is running. */
export function breakStateOf(lock: { locked: boolean; until: string | null; reason: string | null }): BreakState | null {
  return lock.locked && lock.until ? { until: lock.until, exclusion: lock.reason === "self_exclusion" } : null;
}

/**
 * The same answer from the settings row's two timers (the shell holds the row already): an exclusion first, as
 * `isLockedOut` asks, then a break; null when neither runs past `nowMs` or a timer does not parse.
 */
export function breakStateFromTimers(selfExclusionUntil: string | null | undefined, coolingOffUntil: string | null | undefined, nowMs: number): BreakState | null {
  const ex = selfExclusionUntil ? Date.parse(selfExclusionUntil) : Number.NaN;
  if (Number.isFinite(ex) && ex > nowMs) return { until: selfExclusionUntil!, exclusion: true };
  const co = coolingOffUntil ? Date.parse(coolingOffUntil) : Number.NaN;
  if (Number.isFinite(co) && co > nowMs) return { until: coolingOffUntil!, exclusion: false };
  return null;
}

/** The end as a URL carries it: the instant, canonical (`2026-10-10T02:05:00.000Z`), or null for anything that is not one. */
export function breakEndParam(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

/** An end read back from a URL: the instant, and whether it carried a time (a bare day from an older link does not). */
export type BreakEnd = { atMs: number; withTime: boolean };

const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * `?until=` as a page may print it, or null. Two shapes only, each round-tripped so "2026-02-31" or an instant with an
 * hour of 25 is refused rather than rolled over into another day.
 */
export function readBreakEndParam(raw: string | readonly string[] | undefined | null): BreakEnd | null {
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (typeof s !== "string") return null;
  if (INSTANT.test(s)) {
    const ms = Date.parse(s);
    return Number.isFinite(ms) && new Date(ms).toISOString() === s ? { atMs: ms, withTime: true } : null;
  }
  if (DAY.test(s)) {
    const ms = Date.parse(`${s}T00:00:00.000Z`);
    return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === s ? { atMs: ms, withTime: false } : null;
  }
  return null;
}

/**
 * THE ONE WAY AN END READS: `formatEatDateTime` — "9 Okt, 06:02", "9 Oct, 06:02", "2026年10月9日 06:02" (the year joins
 * the date when it is not this EAT year; Chinese always carries it). A bare day from an older link has no time to give,
 * so it reads as its own calendar date alone ("10 Okt"), never shifted by a clock it never had.
 */
export function formatBreakEnd(end: BreakEnd | number, nowMs: number, monthsShort: readonly string[], locale: "en" | "sw" | "zh"): string {
  const e: BreakEnd = typeof end === "number" ? { atMs: end, withTime: true } : end;
  return e.withTime
    ? formatEatDateTime(e.atMs, nowMs, monthsShort, locale)
    : formatEatDate(e.atMs, nowMs, monthsShort, locale);
}

/**
 * An approved break/exclusion sentence with its end filled in, for the kit's `EmptyState` body: the words, and the end
 * as a run to keep whole — `EmptyState` draws it as one `white-space: nowrap` span (`emptyStateBody`), the `keepText`
 * convention. ⭐ Round 5 (2026-10-09, review 3 H4): the date's own spaces used to become no-break spaces, the body's old
 * mechanism, and travelled into a copy and a find-in-page; now every character of the sentence is the dictionary's and
 * the formatter's. The slot is filled through a replacer, so a `$&` is inert.
 */
export function breakSentence(
  template: string, untilIso: string, nowMs: number, monthsShort: readonly string[], locale: "en" | "sw" | "zh",
): { text: string; keep: readonly string[] } {
  const date = formatBreakEnd(Date.parse(untilIso), nowMs, monthsShort, locale);
  return { text: template.replace(/\{date\}/g, () => date), keep: [date] };
}

/**
 * The first sentence of an approved sentence that holds `{date}` — the status line of a row that has room for one
 * sentence ("Mapumziko yanaendelea hadi {date}." of `rg.breakActive`). The words are the approved sentence's own, cut at
 * its own full stop, never re-worded; null when the template has no `{date}` or no full stop after it.
 */
export function firstDateSentence(template: string): string | null {
  const at = template.indexOf("{date}");
  if (at < 0) return null;
  const rest = template.slice(at + "{date}".length);
  const stop = /[.。!?！？]/.exec(rest);
  return stop ? template.slice(0, at + "{date}".length + stop.index + 1) : null;
}
