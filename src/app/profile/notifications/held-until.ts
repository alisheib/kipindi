import { EAT_OFFSET_MS, eatDayKey, formatEatDay } from "@/lib/eat-day";
import type { Locale } from "@/lib/i18n-dict";

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/**
 * consent-01 · WHEN A BREAK OR SELF-EXCLUSION ENDS, IN THE PAGE'S OWN LANGUAGE — the `{date}` of the held
 * note on the SMS consent card. `2 Dec` (en) · `2 Des` (sw) · `2026年12月2日` (zh): `formatEatDay`, the
 * platform's EAT calendar day written with each locale's own `common.monthsShort`.
 * 🔴 It was `formatDate`, which is `en-GB` whatever the page, so the Chinese sentence read "（至 28 Sept 2026）"
 * and the Swahili one "hadi 28 Sept 2026" — an English month inside another language, on an RG line.
 * · en/sw add the year when the end falls in a later EAT year (zh always carries it): a six-month
 *   self-exclusion can end next year.
 * · An end less than a day away adds the EAT clock, 24-hour, rounded UP to the minute (the switch is
 *   still locked until then), so a one-hour break does not read "until <today>".
 * Null when the date cannot be read; the card then shows the line without a date.
 */
export function formatHeldUntil(
  iso: string,
  locale: Locale,
  monthsShort: readonly string[],
  nowMs: number = Date.now(),
): string | null {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  const soon = ms - nowMs < DAY_MS;
  const at = soon ? Math.ceil(ms / MINUTE_MS) * MINUTE_MS : ms;
  const day = eatDayKey(at);
  let out = formatEatDay(day, monthsShort, locale);
  if (locale !== "zh" && day.slice(0, 4) !== eatDayKey(nowMs).slice(0, 4)) out += ` ${day.slice(0, 4)}`;
  if (soon) out += `${locale === "zh" ? " " : ", "}${new Date(at + EAT_OFFSET_MS).toISOString().slice(11, 16)}`;
  return out;
}
