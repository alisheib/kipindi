/**
 * WORKING DAYS — because a promise measured in one unit and policed in another is not a
 * promise.
 *
 * ⭐ WHY THIS FILE EXISTS. Management's feedback on Agent v1 (2026-09-08) changed the review
 * promise on `/agent` from "about 5 days" to "5 WORKING days". That is a copy change and a
 * MEASUREMENT change: `/admin/agents` computes how long an application has been waiting and
 * chips it "Past SLA", and it was counting calendar days. Leave that alone and an application
 * submitted on a Friday is flagged overdue on the following Wednesday while the page has
 * promised the applicant until Friday — the console and the public page disagreeing about the
 * same fact, which is how `docs/PLAYER_VIEW_AUDIT_2026-06-28.md`'s five false statements
 * started.
 *
 * ⛔ SO THE PROMISE AND THE POLICING READ ONE FUNCTION. `/agent`, `/agent/status` and
 * `/agent/apply` say "{n} working days"; the console's overdue test is
 * `workingDaysBetween(submittedAt, now) > cfg.reviewSlaDays`. There is no second definition.
 *
 * ⚠️ PUBLIC HOLIDAYS ARE NOT MODELLED, DELIBERATELY, AND THE DIRECTION OF THE ERROR IS THE
 * REASON. Tanzania's public holidays move (two of them are lunar), so a hard-coded calendar
 * is wrong the year after it is written and a wrong calendar is worse than none. Counting
 * only weekends means the elapsed count runs slightly FAST across a holiday — the console
 * flags an application overdue a little early, so an officer chases it sooner. Erring toward
 * the applicant being seen sooner is the only direction that cannot become a broken promise.
 *
 * ⚠️ UTC, MATCHING EVERY OTHER DATE IN THIS CODEBASE. Timestamps are stored and compared as
 * ISO UTC; using local weekdays here would make the same application overdue in one time zone
 * and not another.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Saturday (6) and Sunday (0) in `Date.prototype.getUTCDay()`'s numbering. */
function isWeekend(d: Date): boolean {
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

/** Midnight UTC on the day `d` falls in — so a comparison is between DAYS, not instants. */
function startOfUtcDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * How many WORKING days have elapsed between two instants — the number an SLA is measured in.
 *
 * ⭐ THE DAY OF SUBMISSION IS DAY ZERO. An application submitted at 09:00 and read at 17:00
 * the same day has waited 0 working days, not 1: "within 5 working days" has to mean the
 * applicant gets five whole working days of our time, and counting the submission day would
 * silently spend one of them.
 *
 * ⛔ NEVER `(now - then) / DAY_MS` WITH A WEEKEND FUDGE FACTOR. A ratio cannot know which days
 * it crossed, so a 5/7 multiplier is right on average and wrong on every individual
 * application — which is the only scale an applicant experiences.
 *
 * Returns 0 for a future or unparseable `fromIso`, so a clock skew can never render a
 * negative wait or an `NaN` in a console cell.
 */
export function workingDaysBetween(fromIso: string, to: Date = new Date()): number {
  const from = new Date(fromIso);
  if (Number.isNaN(from.getTime())) return 0;

  let cursor = startOfUtcDay(from);
  const end = startOfUtcDay(to);
  if (end <= cursor) return 0;

  let count = 0;
  // Walk forward one day at a time from the day AFTER submission through the current day.
  // At an SLA measured in single-digit days this loop is bounded by the age of the oldest
  // open application, and it is exact — which the arithmetic shortcut is not.
  while (cursor < end) {
    cursor += DAY_MS;
    if (!isWeekend(new Date(cursor))) count += 1;
  }
  return count;
}

/**
 * The instant `days` working days after `fromIso` — the date a promise comes due.
 *
 * Used for the deadline a surface SHOWS ("we will decide by …"). Keeps the time-of-day of
 * `fromIso` so the deadline is a real instant an officer can be measured against, rather than
 * a midnight that is either 24 hours early or 24 hours late depending on who reads it.
 */
export function addWorkingDays(fromIso: string, days: number): Date | null {
  const from = new Date(fromIso);
  if (Number.isNaN(from.getTime())) return null;
  if (!Number.isFinite(days) || days <= 0) return from;

  const result = new Date(from.getTime());
  let remaining = Math.floor(days);
  while (remaining > 0) {
    result.setUTCDate(result.getUTCDate() + 1);
    if (!isWeekend(result)) remaining -= 1;
  }
  return result;
}
