/**
 * "How long is left" — ONE definition.
 *
 * 🔴 WHY THIS FILE EXISTS. This nine-line formatter was copied into FOUR pages —
 * `app/page.tsx:58`, `app/markets/page.tsx:264`, `app/live/page.tsx:44`,
 * `app/markets/[id]/page.tsx:800` — and the copies had already drifted: three of them floor the
 * minute branch with a plain `Math.floor`, so a market with forty seconds of betting left
 * rendered **"0m left"** while the detail page, which floors at `Math.max(1, …)`, rendered
 * "1m left" for the same market at the same instant. A board and a detail page disagreeing about
 * whether a bet can still be placed is the shape DESIGN_AUTHORITY §B9 exists to forbid.
 *
 * The `Math.max(1, …)` behaviour is the correct one and is what this keeps: while a market is
 * still taking bets the label must never read zero, because "0m left" says the door is shut when
 * it is open. Zero is reserved for genuinely closed, which the caller detects first.
 *
 * ✅ ALL FOUR COPIES ARE GONE — batch 4, 2026-08-13. Callers now: `app/page.tsx`,
 * `components/home/landing-hero.tsx`, `app/markets/page.tsx`, `app/live/page.tsx`,
 * `app/markets/[id]/page.tsx`.
 *
 * ⚠️ AND THE COUNT WAS WRONG UNTIL THIS BATCH. The plan (`design-brief/PLAN-OF-RECORD.md` §8.8)
 * and batch 4's own prompt both recorded that only TWO copies survived — `/live` and the detail
 * page. There were THREE: `app/markets/page.tsx` still held one, with the defective plain
 * `Math.floor`, on the highest-traffic board on the platform. It went unnamed because this header
 * listed it among the four originals, and a reader takes "listed here" for "already dealt with".
 * If you ever remove a caller, re-derive the list with a grep; do not trust this line.
 *
 * SINGULAR FORMS. A language with number agreement needs a different TEMPLATE for exactly one, not just a
 * different number: Swahili read "masaa 1 yamebaki" (a plural noun and a plural verb) for ONE hour, where a reader
 * expects "saa 1 imebaki". So `TimeLeftLabels` takes OPTIONAL `daysOne` / `hoursOne` / `minutesOne`, used when the
 * number being printed is exactly 1. A caller that gives none gets the plural template, as before; English and
 * Chinese have no number agreement, so their singular text is simply the plural text. The count that picks the
 * template is the count that is PRINTED, so the `Math.max(1, ...)` floor below still reads "1" with the singular
 * form: forty seconds left is "dakika 1 imebaki". `test:time-left` §5 fails any caller that stops passing all three.
 */

/** The four strings this needs (plus three optional singular forms), so the module stays pure and locale-agnostic. */
export type TimeLeftLabels = {
  /** Shown once the deadline has passed. */
  closed: string;
  /** `fill` templates carrying an `{n}`. */
  days: string;
  hours: string;
  minutes: string;
  /** Templates for exactly 1, where the language agrees with the number ("saa 1 imebaki", not "saa 1 zimebaki").
   *  Absent, or `undefined` (a locale that lacks the key): the plural template above is used. */
  daysOne?: string;
  hoursOne?: string;
  minutesOne?: string;
};

export const HOUR_MS = 3600_000;
const DAY_MS = 24 * HOUR_MS;

/** The singular template for a count of exactly 1 when the locale has one; the plural template otherwise. */
const templateFor = (n: number, one: string | undefined, many: string): string => (n === 1 ? (one ?? many) : many);

/**
 * `fill` is injected rather than imported so this module has no dependency on the i18n layer —
 * that is what lets a gate exercise it with plain strings.
 */
export function timeLeftLabel(
  deadlineMs: number,
  nowMs: number,
  labels: TimeLeftLabels,
  fillFn: (s: string, vars: Record<string, string | number>) => string,
): string {
  const ms = deadlineMs - nowMs;
  if (!Number.isFinite(ms) || ms <= 0) return labels.closed;
  const d = Math.floor(ms / DAY_MS);
  if (d > 0) return fillFn(templateFor(d, labels.daysOne, labels.days), { n: d });
  const h = Math.floor(ms / HOUR_MS);
  if (h > 0) return fillFn(templateFor(h, labels.hoursOne, labels.hours), { n: h });
  // ⛔ Never zero while the market is still open — see the header.
  const m = Math.max(1, Math.floor(ms / 60_000));
  return fillFn(templateFor(m, labels.minutesOne, labels.minutes), { n: m });
}

/**
 * ⭐ SOON's ONE TEST (landing v3 WP3, INHERIT-MANIFEST L17): betting shuts inside the band this label
 * counts in MINUTES. The card used to ask the ENGLISH label (`/^\d+m left$/`), so a Swahili or Chinese
 * reader never saw SOON on a market closing in ten minutes — a real countdown signal that depended on
 * the reader's language. Asked of the milliseconds, it fires in every locale at the instant the label
 * turns to minutes (the 1.10/1.11 boundary of `test:time-left`).
 * `undefined` (a surface that is not counting down) and a closed or unparseable deadline are never SOON.
 */
export function closesWithinTheHour(msLeft: number | undefined): boolean {
  return msLeft !== undefined && Number.isFinite(msLeft) && msLeft > 0 && msLeft < HOUR_MS;
}
