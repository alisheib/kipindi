/**
 * HOW LONG SOMETHING LASTS, IN THE READER'S LANGUAGE — one rule, one home.
 *
 * ⛔ WHY THIS EXISTS RATHER THAN `{hours} hour(s)`. The objection window became a live setting on
 * 2026-09-05, so every surface that states it interpolates the number. The first version wrote
 * the unit into the copy — `"a window of {hours} hour(s)"` — and production duly rendered
 * **"a public objection window of 1 hour(s)"** on `/fairness`, which is the page a regulator
 * reads. `(s)` is a form-filler's apology for not knowing the number, and this code knows it.
 *
 * ⛔ AND IT IS NOT AN ENGLISH RULE APPLIED THREE TIMES. Each language pluralises differently, or
 * not at all:
 *   · English inflects the noun — "1 hour", "24 hours";
 *   · Swahili does not inflect `saa` here, and the unit PRECEDES the number — "saa 1", "saa 24",
 *     which is also why the copy guard had to learn both word orders;
 *   · Chinese has no plural form and takes a measure word — "1 小时".
 * Writing that as one template with a bolted-on `(s)` would be wrong in two languages out of
 * three while looking correct in the one most readers of this file speak.
 *
 * The dictionary strings therefore carry a bare `{hours}` and the WHOLE phrase is built here, so
 * a fourth locale is a case in one switch rather than a hunt through copy.
 */
import type { Locale } from "@/lib/i18n-dict";

/**
 * A duration in hours, as a complete phrase.
 *
 * @example durationHours("en", 1)  // "1 hour"
 * @example durationHours("en", 24) // "24 hours"
 * @example durationHours("sw", 1)  // "saa 1"
 * @example durationHours("zh", 1)  // "1 小时"
 */
export function durationHours(locale: Locale, hours: number): string {
  // ⚠️ Guarded, not trusted. A NaN or negative reaching a legal page as "NaN hours" would be a
  // false statement about when money moves; 0 is a legitimate value (no window at all) and the
  // surfaces that can show it say so in words rather than printing "0 hours".
  const n = Number.isFinite(hours) && hours >= 0 ? Math.round(hours) : 0;
  switch (locale) {
    case "sw":
      return `saa ${n}`;
    case "zh":
      return `${n} 小时`;
    default:
      return `${n} ${n === 1 ? "hour" : "hours"}`;
  }
}
