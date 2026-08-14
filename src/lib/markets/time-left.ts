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
 */

/** The four strings this needs, so the module stays pure and locale-agnostic. */
export type TimeLeftLabels = {
  /** Shown once the deadline has passed. */
  closed: string;
  /** `fill` templates carrying an `{n}`. */
  days: string;
  hours: string;
  minutes: string;
};

const HOUR_MS = 3600_000;
const DAY_MS = 24 * HOUR_MS;

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
  if (d > 0) return fillFn(labels.days, { n: d });
  const h = Math.floor(ms / HOUR_MS);
  if (h > 0) return fillFn(labels.hours, { n: h });
  // ⛔ Never zero while the market is still open — see the header.
  return fillFn(labels.minutes, { n: Math.max(1, Math.floor(ms / 60_000)) });
}
