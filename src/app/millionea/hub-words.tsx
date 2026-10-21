import type { ReactNode } from "react";
import { eatClock, eatWeekday, eatWeekdayClock } from "@/components/maswali/maswali-format";
import { formatEatDate } from "@/lib/eat-day";
import { fillNodes } from "@/lib/fill-nodes";
import { fill, formatNumber } from "@/lib/utils";
import type { Dict, Locale } from "@/lib/i18n-dict";

/**
 * THE HUB'S TIMED SENTENCES (MASWALI-BUILD S5-DESIGN-HUB; Ali 2026-10-21 10/10 pass) — each one a dictionary line filled
 * with its EAT instants exactly as the hub prints it, pure, so a suite renders what the page renders (`test:maswali-hub`
 * §10). Every instant is one unbreakable run in the numerals' mono (§T5).
 * ⭐ zh (the lead's ruling, 2026-10-21): Millionea's Chinese takes a space only where a Latin letter or a digit meets a Han
 * character, never between two Han characters. A line filled by a weekday clock ("周五 18:00", a Han weekday first) has
 * no space before it; one filled by a date or a clock alone (a digit first) keeps its space.
 */
const run = (s: string) => <span className="whitespace-nowrap font-mono">{s}</span>;

const HAN = "[㐀-䶿一-鿿豈-﫿]";
/**
 * A run where it meets its template, by Millionea's zh rule (the lead's ruling, 2026-10-21): a space where a Han character
 * meets a Latin letter or a digit, none between two Han characters — decided by the two characters that meet, never by
 * the caller, so a template whose fill starts with a digit one time and a Han weekday the next sets no space of its own.
 * The space stands outside the run, in the sentence's own face. A template with no Han beside the placeholder (en, sw)
 * comes back as it was.
 */
function meet(template: string, key: string, value: string): ReactNode {
  const before = new RegExp(`${HAN}\\{${key}\\}`).test(template) && /^[A-Za-z0-9]/.test(value);
  const after = new RegExp(`\\{${key}\\}${HAN}`).test(template) && /[A-Za-z0-9]$/.test(value);
  return <>{before && " "}{run(value)}{after && " "}</>;
}

/** M7 · "The sales close has moved: it is now Friday 16:00 (was 18:00)" — the old close by its clock alone when it was the
 *  same day, else with its day. zh: "现为周五 16:00（原为 18:00）" the same day, "（原为周四 18:00）" across days (`meet`). */
export function closeMovedWords(t: Dict, toMs: number, fromMs: number): ReactNode {
  const sameDay = eatWeekday(t, toMs) === eatWeekday(t, fromMs) && Math.abs(toMs - fromMs) < 86_400_000;
  const line = t.millionea.closeMoved;
  return fillNodes(line, { when: meet(line, "when", eatWeekdayClock(t, toMs)), from: meet(line, "from", sameDay ? eatClock(fromMs) : eatWeekdayClock(t, fromMs)) });
}

/** M6 · a week being voided, named: how many mains voided against how few valid reserves, and by when it is final if no
 *  objection changes it (`byMs`, the week's "results and payout" end). */
export function voidingWords(t: Dict, voidedMains: number, validReserves: number, byMs: number): ReactNode {
  return fillNodes(t.millionea.weekVoidingBody, { voided: formatNumber(voidedMains), valid: formatNumber(validReserves), when: run(eatWeekdayClock(t, byMs)) });
}

/** L6/L21 · "The next week opens Monday 00:01." — the empty state's first sentence (a string: the kit's body). */
export function nextOpenWords(t: Dict, atMs: number): string {
  return fill(t.millionea.nextOpensAt, { when: eatWeekdayClock(t, atMs) });
}

/**
 * M10 · the rollover notice that IS this week's carry in — the one whose week the figure names as its source
 * (`carryFromCode`) — or none: the carry never travels from a week the ledger does not name, nor while that carry waits on
 * its week; and of two unseen rollovers (a reader away for two weeks) only that one is the origin, so one id is drawn.
 */
export function carryingRollover<N extends { notice: string; code: string }>(
  notices: readonly N[], pool: { carryFromCode: string | null; carryIn: number | null } | null,
): N | null {
  if (!pool || !pool.carryFromCode || (pool.carryIn ?? 0) <= 0) return null;
  return notices.find((n) => n.notice === "ROLLOVER" && n.code === pool.carryFromCode) ?? null;
}

/** L22 · "Week 52 will be Millionea's final week. It opens 30 Nov." — the lead's words, the day as every "on {date}" line
 *  reads it (`formatEatDate`: zh "2026年11月30日", a digit first). */
export function finalAheadWords(t: Dict, locale: Locale, week: number, opensMs: number, nowMs: number): ReactNode {
  return fillNodes(t.millionea.finalWeekAhead, { week, date: run(formatEatDate(opensMs, nowMs, t.common.monthsShort, locale)) });
}
