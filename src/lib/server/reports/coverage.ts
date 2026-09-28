/**
 * ⭐ ONE DECLARED COVERAGE CONTRACT PER REPORT — the window a document covers, said once.
 *
 * 🔴 WHY THIS FILE EXISTS. `/admin/reports` carries a minute-precision date rail, and exactly ONE
 * of the nine catalogue entries follows it (`finance-window`). The other eight each compute their
 * own statutory or point-in-time period, which is CORRECT — a GBT monthly pack bounded to "last six
 * hours" is not a filing. But nothing said so:
 *
 *  · the Excel/PDF pair in the page head is `gbt-monthly`, fixed to the previous complete calendar
 *    month, drawn ~40px from the rail. Set the rail to "Today", press Excel, receive LAST MONTH.
 *  · `meta.period` — the one field on `Report` that names the window — was computed by all nine
 *    builders and rendered by NEITHER renderer. So `fiu-sar`, `sx-register`, `kyc-reverify` and
 *    `rg-engagement` reached a regulator with no stated coverage at all, and `fiu-sar`'s own notes
 *    said "within the period above" pointing at nothing.
 *  · the library cards advertised filing CADENCE where an officer reads coverage: "Quarterly" on a
 *    cumulative-to-date document, "Weekly" on a point-in-time register, "Daily SFTP" on a
 *    genesis→oldest-25k export.
 *
 * ⛔ THE CARD MUST NOT HAND-TYPE A COVERAGE STRING. `admin/reports/page.tsx` already paid for that
 * lesson with the per-template `format` field it DELETED rather than corrected: "eight copies of a
 * fact that must equal one other fact is a drift generator." The library card, the button tooltip
 * and the artifact's `meta.period` all read THIS declaration — the way `isWindowedReport` gives one
 * answer to "does this take a window?", read off the registry itself.
 *
 * ⚠️ CADENCE IS NOT COVERAGE. How often a report is FILED is not what its figures span.
 * `buildMatchIntegrity` already carried that distinction as one careful comment — "the cadence is
 * how often it is FILED, not the window it covers. Say which, rather than let a reader assume these
 * figures describe one quarter." This type makes it structural instead of one comment that the
 * ninth report is free not to repeat.
 */

import { eatDateLabel, startOfEatDay } from "../report-money";
import { currentPackPeriod, packPeriodBounds, packPeriodLabel } from "../report-pack";
// The audited EAT wall-clock formatter, not a fourth hand-rolled offset shift.
import { formatEatLocal } from "../date-range";

const DAY_MS = 24 * 3600_000;

/** `2026-09-28 22:41` — `formatEatLocal`'s ISO-ish `T` is right for a URL, wrong on a report face. */
const eatStampLocal = (ms: number): string => formatEatLocal(ms).replace("T", " ");

/** A coverage statement plus the builder's own qualifier, if it has one. */
const join = (head: string, detail?: string): string => (detail ? `${head} · ${detail}` : head);

/**
 * The six shapes a window in this catalogue can have. Deliberately closed: a ninth report either
 * fits one of these or the shape itself is new and gets declared here, where every surface sees it.
 */
export type CoverageKind =
  | "selected-window" // follows the page's date rail (`windowed: true`)
  | "eat-day" // one East Africa Time calendar day, 00:00–24:00
  | "calendar-month" // one complete EAT calendar month — the statutory shape
  | "as-of" // point-in-time snapshot at generation; NOT a period total
  | "since-genesis" // everything from the first record, oldest-first, possibly capped
  | "cumulative"; // everything to date, no date filter

export type CoverageBounds = { start: number; end: number };

export type Coverage = {
  kind: CoverageKind;
  /** Coverage phrase for a library card or a button tooltip. Pure — no DB, no I/O. */
  describe: (now: number) => string;
  /**
   * The badge-length form — what fits in a group label beside a pair of download buttons.
   *
   * ⛔ IT EXISTS SO A CALLER NEVER RE-DERIVES ONE. `generate-button.tsx` carries a dated ruling
   * that the button text stays "Excel"/"PDF" and *which document* belongs on the group label the
   * caller renders beside the pair. Without `short`, that caller would reach for
   * `packPeriodLabel(currentPackPeriod(now))` itself — correct today, and silently wrong the day
   * an entry's coverage kind changes under it.
   */
  short: (now: number) => string;
  /** The statement printed on the artifact face (`Report.meta.period`, which BOTH renderers now
   *  print). `detail` is the builder's own qualifier — an entry count, a chosen month. */
  statement: (now: number, detail?: string) => string;
  /**
   * Half-open `[start, end)` bounds, ONLY for the kinds that have them.
   *
   * ⭐ `test:report-window-truth` compares these against the bounds the builder actually read, so a
   * document whose printed period and whose SQL disagree cannot ship. ⛔ A kind with no bounds
   * (as-of, since-genesis, cumulative, selected-window) MUST leave this undefined — inventing
   * bounds for a point-in-time snapshot would hand the guard something false to agree with, which
   * is worse than no guard at all.
   */
  bounds?: (now: number) => CoverageBounds;
};

/** The one report that follows the rail. `detail` is the resolved window label the route computed. */
export function selectedWindow(): Coverage {
  return {
    kind: "selected-window",
    describe: () => "Follows the window selected above",
    short: () => "Selected window",
    statement: (_now, detail) => detail ?? "Selected window",
  };
}

/** The EAT day of generation — `daily-ops`. */
export function eatDay(): Coverage {
  return {
    kind: "eat-day",
    describe: () => "The EAT day of generation · 00:00–24:00",
    short: (now) => eatDateLabel(startOfEatDay(now)),
    statement: (now, detail) => join(`${eatDateLabel(startOfEatDay(now))} · 00:00–24:00 EAT`, detail),
    bounds: (now) => {
      const start = startOfEatDay(now);
      return { start, end: start + DAY_MS };
    },
  };
}

/**
 * One complete EAT calendar month. Called with no argument by the registry — where it means the
 * PREVIOUS complete month, the statutory shape — and with an explicit `YYYY-MM` by a builder that
 * was handed a pack period, where "previous" would be a lie.
 */
export function calendarMonth(period?: string): Coverage {
  const at = (now: number) => period ?? currentPackPeriod(now);
  const lead = period ? "Calendar month" : "Previous complete calendar month";
  return {
    kind: "calendar-month",
    describe: (now) => `${lead} — ${packPeriodLabel(at(now))}`,
    short: (now) => packPeriodLabel(at(now)),
    statement: (now, detail) => {
      const p = at(now);
      const [y, m] = p.split("-").map(Number);
      const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
      return join(`${packPeriodLabel(p)} · ${p}-01 → ${p}-${String(lastDay).padStart(2, "0")} (EAT)`, detail);
    },
    bounds: (now) => packPeriodBounds(at(now)),
  };
}

/**
 * A point-in-time snapshot — `sx-register`, `kyc-reverify`, `rg-engagement`.
 *
 * ⭐ It says "not a period total" in as many words. These three walk the whole roster and filter on
 * `> now`; a reader who assumes the figures describe the month they filed them in reads a cumulative
 * count as monthly activity. `gbt-monthly` already discloses exactly this about its own KYC funnel
 * and RG roster; the three standalone reports never did.
 */
export function asOf(): Coverage {
  return {
    kind: "as-of",
    describe: () => "Point-in-time as at generation — not a period total",
    short: () => "As at generation",
    statement: (now, detail) => join(`Point-in-time as at ${eatStampLocal(now)} EAT — not a period total`, detail),
  };
}

/**
 * Everything from the first record, oldest-first, capped — `iso-audit`.
 *
 * ⚠️ NEVER THE WORD "LIFETIME". `scripts/reports-verify-live.mts` asserts `!/lifetime/i` on
 * `meta.period` ("a real window, not 'lifetime'"), and `buildIsoAudit`'s untruncated branch printed
 * exactly "Lifetime (genesis → now)". That branch is unreachable on production, where the log is far
 * past the cap — so the false FAIL was waiting for the first scratch or fixture database with fewer
 * than `ISO_EXPORT_LIMIT` entries to run the live verifier.
 */
export function sinceGenesis(cap: number): Coverage {
  return {
    kind: "since-genesis",
    describe: () => `Since genesis — oldest ${cap.toLocaleString()} entries at most`,
    short: () => "Since genesis",
    statement: (_now, detail) => join("Since genesis, oldest first (no date filter)", detail),
  };
}

/** Everything to date, no date filter — `match-integrity`. */
export function cumulative(): Coverage {
  return {
    kind: "cumulative",
    describe: () => "Cumulative to date — not one filing period",
    short: () => "Cumulative to date",
    statement: (now, detail) => join(`Cumulative to ${eatDateLabel(now)} (EAT) — not one filing period`, detail),
  };
}
