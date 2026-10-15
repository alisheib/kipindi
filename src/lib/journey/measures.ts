/**
 * THE AGENCY'S FIVE MEASURES, DEFINED ONCE — the Vodacom plan S13 (`docs/design-system/v5-2026-09-29-simplified-journey/
 * S13-PLAN.md`, the plan's §3.10). The panel on `/admin/insights`, the PDF, the workbook and the CSV all read this module;
 * none of them states a rule of its own.
 *
 * What lives here, and nowhere else:
 *   · `MEASURES` — each measure as data: its unit, its two halves and where each is counted, whether it splits by
 *     campaign, what its "before" column can show, and whether its "after" figure reads S9's records;
 *   · `measureWindows` — before (14 full East Africa days before the launch day) and after 7/14/28 (the first N days on
 *     which the new journey was on all day), the agency's week and month, and since launch;
 *   · `cellFor` — the one status vocabulary: no status ever prints a 0 that is not a counted zero (DESIGN_AUTHORITY §C2);
 *   · `agencySchedule` — which report is due: the baseline before launch, Mondays for 8 weeks, then monthly;
 *   · one rounding rule (tenths of a percent) and one change rule (percentage points, U+2212 for a fall);
 *   · the row matching the row-based measures need (pure, so both stores share it).
 *
 * ⭐ EVERY MEASURE IS A NESTED PAIR. A numerator counts units that are, by construction, inside its denominator. Three
 * pairs read two different counters, so a lost count on one side can still push a numerator past its denominator: that
 * share is HELD at 100.0% and marked, never printed above the whole (E-103), and both halves are always printed.
 *
 * Pure and import-light: only `eat-day` and the funnel's allow-list. Client-safe, though only servers import it.
 * ⛔ No house word here, ever (D19): marked stakes are outside the measures and are never named.
 */
import { eatDayKey, eatDayStartMs } from "../eat-day";
import { FUNNEL_STEPS } from "./funnel";

/* ── The owner's answers — the plan's "Points for Ali", accepted ──────────────────────────────────────────────────── */

/**
 * ✅ THE S13 RULINGS — ACCEPTED BY ALI, 2026-10-14 (relayed to this build by the coordinating session): the plan's
 * recommended answer to each of its thirteen "Points for Ali", and Point 12 as he defined it. Each answer the code
 * expresses is ONE key here; a later overrule lands by changing that key and the suites that read it. The panel and the
 * files state the rules, never who chose them.
 *
 *   Point 1  (D20a)  marked stakes stay OUT of these five measures ............ `markedStakesExcluded`
 *   Point 2          the agency reply's two lines — wording only, no code knob (the files say "players only")
 *   Point 3          before = the 14 days before the launch day; after = 7/14/28 `beforeDays`, `afterDays`
 *   Point 4          short balance → deposit has no "before" on questions ....... `MEASURES` (before: "no-offer")
 *   Point 5          time to first bet looks at a new player's first 24 hours .. `firstBetHorizonHours`
 *   Point 6          Mondays for 8 weeks, then monthly; a baseline report first  `weeklyReports`, `baselineReport`
 *   Point 7          who sees the measures: accounting VIEW (the page's gate) .. `measuresDomain`
 *   Point 8          harm markers: compliance VIEW only, never in a file ....... `harmDomain`, `harmInFiles`
 *   Point 9          the rollback figures are a display, no alert, no switch ... `rollback`
 *   Point 10         the old dial's repeated bets stay counted (only overstates) `MEASURES` sheetToBet note
 *   Point 11         home views are the visit counter's (everyone) ............. `MEASURES` homeToSheet
 *   Point 12         S16's "measures in bounds", Ali's rule: seven days after launch, each of the five measures at or
 *                    above its 14-day pre-launch baseline, and no harm marker's daily count above its baseline ...
 *                    `inBounds`, `inBoundsVerdict`
 *   Point 13         S13 is done on test data + production's baseline — a process point, no code knob
 */
export const S13_RULINGS = {
  markedStakesExcluded: true,
  beforeDays: 14,
  afterDays: [7, 14, 28] as const,
  firstBetHorizonHours: 24,
  weeklyReports: 8,
  baselineReport: true,
  measuresDomain: "accounting",
  harmDomain: "compliance",
  harmInFiles: false,
  rollback: { betsShare: 0.7, betsDays: 3, confirmShare: 0.8, confirmDays: 3, alert: false, switch: false },
  /** Point 12: the after window the verdict reads (all of its days must exist), the measures it judges (the agency's
   *  five — 4b is a comparison row, not one of them) and the two harm markers it holds to their baseline. */
  inBounds: {
    afterDays: 7,
    measures: ["homeToSheet", "sheetToBet", "shortToDeposit", "depositToBet", "timeToFirstBet"] as const,
    harmMarkers: ["rapidDeposit", "chasingLosses"] as const,
  },
  /** Open point 12 (not one of the thirteen, recorded with them): a denominator under this reads "small sample". */
  smallSampleBelow: 30,
} as const;

/* ── The fixed facts ─────────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * The first FULL East Africa day the counters counted. The S3b deploy finished at 22:47 UTC on 2026-09-30, which is
 * 01:47 EAT on 2026-10-01 (VODACOM-PLAN §0f), so 2026-10-01 is a partial day and is never in a window.
 */
export const FIRST_FULL_COUNTED_DAY = "2026-10-02";

/**
 * A deposit is "followed by a bet" when the same player bets within this long of its completion (inclusive).
 * ⚠️ S9 PLUG-IN (S13-PLAN Correction 20, Open point 30): S9 defines this rule as `DEPOSIT_RETURN_WINDOW_MS` in
 * `src/lib/journey/deposit-state.ts`, which is not on this build. When S9 lands this line becomes a re-export of S9's
 * constant, and `test:journey-measures` refuses a build that holds S9's file and still defines its own number here.
 */
export const DEPOSIT_FOLLOW_UP_MS = 30 * 60_000;

/** A new player's first bet is counted when it comes within this long of sign-up (Point 5). */
export const FIRST_BET_HORIZON_MS = S13_RULINGS.firstBetHorizonHours * 3_600_000;

/**
 * ⚠️ WP4 (the counter corrections) IS NOT BUILT on this build: it waits for S10's edits to the sheet host. These two facts
 * say what the counters do TODAY, so the definitions never claim a correction that has not shipped. WP4 turns each to
 * `true` in the same commit as its code, and the suites hold the words to the flags.
 *   · one home-page view can open several sheets, and every one is counted `home` (S13-PLAN Correction 14);
 *   · the server's bet counter does not yet skip an automated browser (Correction 15).
 */
export const HOME_OPEN_ONE_PER_VIEW = false;
export const BET_COUNTER_SKIPS_AUTOMATION = false;

const DAY_MS = 86_400_000;

/* ── The measures, as data ───────────────────────────────────────────────────────────────────────────────────────── */

export type MeasureKey = "homeToSheet" | "sheetToBet" | "shortToDeposit" | "depositToBet" | "depositToAnyBet" | "timeToFirstBet";
export type Variant = "old" | "new";

/** Where one half of a measure is counted. */
export type HalfSource =
  /** A sum over the daily counter totals (`JourneyFunnelDay`), by step and origin, per journey. */
  | { source: "counter"; step: "sheet_open" | "low_balance" | "bet"; origins: Readonly<Record<Variant, readonly string[]>> }
  /** Home-page views from the site's visit counter (`SiteVisitPage`, path "/"). */
  | { source: "views" }
  /** A read of the rows (deposits, bets, sign-ups), players only. */
  | { source: "rows"; read: "R1" | "R2" | "R3" | "R4" };

export type MeasureDef = {
  key: MeasureKey;
  /** The number the definitions table carries: "1" … "5", and "4b" for the comparison row. */
  no: string;
  /** The agency's own words. */
  name: string;
  /** The Swahili draft (S13-PLAN "Admin words"). */
  nameSw: string;
  /** One unit of the denominator. */
  unit: string;
  /** The words for "none of them yet". */
  noneYet: string;
  numerator: { half: HalfSource; text: string };
  denominator: { half: HalfSource; text: string };
  /** True only when BOTH halves carry the visit's campaign tag. */
  campaignSplit: boolean;
  /** What the "before" column can show. */
  before: "figure" | "no-offer" | "not-recorded";
  /** The "after" figure reads S9's records (`Transaction.pendingBet`, `Position.origin`). */
  needsS9: boolean;
  /** The two halves come from different counters, so a lost count can push the numerator past its denominator. */
  canOverstate: boolean;
  /** Each a sentence the definitions table prints. */
  notes: readonly string[];
};

/** Every origin a step may carry — derived from the one allow-list, so a new origin is never silently left out. */
const every = (step: keyof typeof FUNNEL_STEPS): readonly string[] => FUNNEL_STEPS[step];

export const MEASURES: readonly MeasureDef[] = [
  {
    key: "homeToSheet",
    no: "1",
    name: "Home → bet sheet",
    nameSw: "Nyumbani → fomu ya dau",
    unit: "a home-page view",
    noneYet: "no home-page views yet",
    numerator: {
      half: { source: "counter", step: "sheet_open", origins: { old: ["home"], new: ["home"] } },
      text: "Bet sheets opened from the home page (old journey: a market page reached from the home page's side links).",
    },
    denominator: {
      half: { source: "views" },
      text: "Views of the home page, from the site's visit counter — everyone, staff and guests included.",
    },
    campaignSplit: false,
    before: "figure",
    needsS9: false,
    canOverstate: true,
    notes: [
      "Home-page views include staff and visitors who could not open a bet sheet, so this share can only be understated.",
      ...(HOME_OPEN_ONE_PER_VIEW ? [] : [
        "In the new journey one home-page view can open several bet sheets, and each is counted; when that passes the views, the share is held at 100.0% and marked.",
      ]),
      "Not split by campaign: page views carry no campaign tag.",
    ],
  },
  {
    key: "sheetToBet",
    no: "2",
    name: "Bet sheet → bet placed",
    nameSw: "Fomu ya dau → dau limewekwa",
    unit: "a bet sheet opened",
    noneYet: "no bet sheets opened yet",
    numerator: {
      half: { source: "counter", step: "bet", origins: { old: ["dial"], new: ["sheet", "deposit_return"] } },
      text: "Bets placed from a bet sheet (old journey: from the bet dial; new journey: from the sheet, including a bet placed on the way back from a deposit).",
    },
    denominator: {
      half: { source: "counter", step: "sheet_open", origins: { old: every("sheet_open"), new: every("sheet_open") } },
      text: "Bet sheets opened, from anywhere.",
    },
    campaignSplit: true,
    before: "figure",
    needsS9: false,
    canOverstate: true,
    notes: [
      "Before launch one bet dial could take several bets and each was counted, so the before figure can only overstate.",
      "Split by campaign: both halves carry the campaign tag of the visit's first page.",
    ],
  },
  {
    key: "shortToDeposit",
    no: "3",
    name: "Short balance → deposit",
    nameSw: "Salio halitoshi → kuweka pesa",
    unit: "a not-enough-money notice on a question",
    noneYet: "no not-enough-money notices yet",
    numerator: {
      half: { source: "rows", read: "R1" },
      text: "Deposits confirmed after the player chose a bet on a question that their balance could not cover.",
    },
    denominator: {
      half: { source: "counter", step: "low_balance", origins: { old: ["dial"], new: ["sheet"] } },
      text: "Not-enough-money notices shown in the bet sheet (old journey: in the bet dial).",
    },
    campaignSplit: false,
    before: "no-offer",
    needsS9: true,
    canOverstate: true,
    notes: [
      "No deposit was offered at a shortfall on a question before launch: the notices are counted, and no share is shown.",
      "A deposit counts while it stays confirmed; a deposit later reversed leaves the count.",
      "Not split by campaign: deposits carry no campaign tag.",
    ],
  },
  {
    key: "depositToBet",
    no: "4",
    name: "Deposit → bet completed",
    nameSw: "Kuweka pesa → dau limekamilika",
    unit: "a confirmed shortfall deposit on a question whose 30 minutes have passed",
    noneYet: "no such deposits yet",
    numerator: {
      half: { source: "rows", read: "R3" },
      text: "Of those deposits, the ones followed within 30 minutes by the very bet the deposit was made for (the same question, side and stake); each bet is matched to one deposit.",
    },
    denominator: {
      half: { source: "rows", read: "R1" },
      text: "Deposits confirmed after a not-enough-money notice on a question, once 30 minutes have passed.",
    },
    campaignSplit: false,
    before: "not-recorded",
    needsS9: true,
    canOverstate: false,
    notes: [
      "Not recorded before launch: the bet a deposit was made for is recorded from launch.",
      "Not split by campaign: deposits carry no campaign tag.",
    ],
  },
  {
    key: "depositToAnyBet",
    no: "4b",
    name: "Deposit → any bet within 30 minutes",
    nameSw: "Kuweka pesa → dau lolote ndani ya dakika 30",
    unit: "a confirmed deposit whose 30 minutes have passed",
    noneYet: "no confirmed deposits yet",
    numerator: {
      half: { source: "rows", read: "R2" },
      text: "Deposits followed within 30 minutes by any bet from the same player.",
    },
    denominator: {
      half: { source: "rows", read: "R2" },
      text: "Every confirmed player deposit, once 30 minutes have passed.",
    },
    campaignSplit: false,
    before: "figure",
    needsS9: false,
    canOverstate: false,
    notes: [
      "Shown before and after launch for comparison: any bet counts, whatever it was placed on.",
      "Not split by campaign: deposits carry no campaign tag.",
    ],
  },
  {
    key: "timeToFirstBet",
    no: "5",
    name: "Time to first bet",
    nameSw: "Muda hadi dau la kwanza",
    unit: "a new player whose first 24 hours have passed",
    noneYet: "no new players yet",
    numerator: {
      half: { source: "rows", read: "R4" },
      text: "New players who placed a first bet within 24 hours of signing up; the median time to that bet is shown among them.",
    },
    denominator: {
      half: { source: "rows", read: "R4" },
      text: "Players who signed up in the period, once their first 24 hours have passed.",
    },
    campaignSplit: false,
    before: "figure",
    needsS9: false,
    canOverstate: false,
    notes: ["Not split by campaign: sign-ups carry no campaign tag."],
  },
];

/** The internal reference row: shortfall deposits that were not for a question bet, beside Up & Down's notices. */
export const REFERENCE_ROW = {
  key: "otherShortfallDeposits",
  name: "Up & Down and other shortfall deposits",
  nameSw: "Up & Down na amana nyingine za salio halitoshi",
  text: "Counts only, never a share: deposits confirmed after a not-enough-money notice that were not for a question bet (an Up & Down round, or no saved bet), beside Up & Down's own not-enough-money notices. The two are not a nested pair.",
} as const;

/** The sentence the agency reads about who is counted. */
export const EXCLUSIONS_SENTENCE = "Players only. Staff accounts, previews and automated visits are not counted.";

/**
 * The notes every file and the panel carry under the definitions. Each sentence is true of THIS build (the WP4 flags
 * above decide two of them).
 */
export function definitionNotes(): string[] {
  return [
    EXCLUSIONS_SENTENCE,
    ...(BET_COUNTER_SKIPS_AUTOMATION ? [] : [
      "A bet is counted when it is placed; the page counters skip automated browsers, and the bet counter does not yet.",
    ]),
    "Every day is a full East Africa day (00:00–24:00, UTC+3). The launch day is counted on neither side.",
    `Counting began on 2026-10-01; the first full day counted is ${FIRST_FULL_COUNTED_DAY}.`,
    `"Before" is the ${S13_RULINGS.beforeDays} days before the launch day. "After N days" is the first N days on which the new journey was on all day; a day it was not is skipped and named.`,
    `A share over fewer than ${S13_RULINGS.smallSampleBelow} is marked "small sample".`,
    "A share is printed to one decimal. When two counters disagree and the first passes the second, the share is held at 100.0% and marked *.",
    "Each figure is recomputed from the live counts when the file is made; counts older than 400 days are deleted, so such a window reads \"older than 400 days\".",
    "Campaign tags must use lowercase letters, digits, a space and . _ ~ - only, up to 64 characters; any other tag is not counted in these totals.",
    "A change is the after share minus the before share, in percentage points. It says what moved, not why.",
  ];
}

/* ── Windows ─────────────────────────────────────────────────────────────────────────────────────────────────────── */

export type RolloutState = "WITHDRAWN" | "STAFF_PREVIEW" | "ACTIVE";
export type Transition = { at: number; state: RolloutState };

/**
 * What the launch record (`journey-launch.ts`) hands the windows. `observedSince` is when the record began; the state
 * before it is not known. `startedActive` says the record began while the journey was ALREADY on for everyone — its
 * launch is then "on or before" `firstActiveAt`, and the panel says so.
 */
export type LaunchFacts = {
  observedSince: number;
  firstActiveAt: number | null;
  startedActive: boolean;
  transitions: readonly Transition[];
  /** Transitions the record dropped to stay bounded (never the first ACTIVE one): days inside are not known. */
  gap: { from: number; to: number } | null;
};

export type WindowKey = "before" | "after7" | "after14" | "after28" | "week" | "month" | "sinceLaunch";

export type SkipReason = "before counting began" | "not on the new journey all day" | "not known (the launch record has a gap)";

export type DayWindow = {
  key: WindowKey;
  /** Which journey's counters the window reads. */
  variant: Variant;
  /** The days asked for (14, 7, 14, 28; null for a week, a month or since launch, whose length is the calendar's). */
  asked: number | null;
  /** The counted EAT days, ascending. Empty when nothing can be counted. */
  days: string[];
  /** Days inside the span that are not counted, each with its reason. */
  skipped: Array<{ day: string; why: SkipReason }>;
  /** An "after" window before any launch. */
  notLaunched: boolean;
  /** At least one counted day is older than the counters keep (400 days). */
  pruned: boolean;
  /** The first and last day of the span the window was taken from (inclusive), or null when there is no span. */
  fromDay: string | null;
  toDay: string | null;
};

/** `2026-10-02` + n days → `2026-10-0x`. Day keys are UTC-midnight-anchored strings; no zone is involved. */
export function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00.000Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

/** Every day key from `from` to `to`, inclusive (empty when `to` is before `from`). */
export function dayRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

/** 0 = Monday … 6 = Sunday, for a day key. */
export function weekdayOf(day: string): number {
  return (new Date(`${day}T00:00:00.000Z`).getUTCDay() + 6) % 7;
}

/** The rollout state at an instant, from the record's transitions; null when the record does not know it. */
export function stateAt(launch: LaunchFacts, atMs: number): RolloutState | null {
  if (atMs < launch.observedSince) return null;
  if (launch.gap && atMs >= launch.gap.from && atMs < launch.gap.to) return null;
  let s: RolloutState | null = null;
  for (const t of launch.transitions) {
    if (t.at <= atMs) s = t.state;
    else break;
  }
  return s;
}

/**
 * Was the new journey on for everyone from 00:00 to 24:00 EAT on this day? Unknown (before the record began, or inside
 * its gap) is "no" — and named as unknown, never assumed ACTIVE.
 */
export function dayStanding(launch: LaunchFacts, day: string): "active" | "not-active" | "unknown" {
  const start = eatDayStartMs(day), end = start + DAY_MS;
  if (start < launch.observedSince) return "unknown";
  if (launch.gap && start < launch.gap.to && end > launch.gap.from) return "unknown";
  if (stateAt(launch, start) !== "ACTIVE") return "not-active";
  for (const t of launch.transitions) if (t.at > start && t.at < end && t.state !== "ACTIVE") return "not-active";
  return "active";
}

/** The launch day L: the EAT day of the first observed move to ACTIVE, or null. */
export function launchDayOf(launch: LaunchFacts | null): string | null {
  return launch && launch.firstActiveAt !== null ? eatDayKey(launch.firstActiveAt) : null;
}

function makeWindow(key: WindowKey, variant: Variant, asked: number | null, days: string[], skipped: DayWindow["skipped"],
  retainedFromDay: string, span: [string, string] | null, notLaunched = false): DayWindow {
  return {
    key, variant, asked, days, skipped, notLaunched,
    pruned: days.some((d) => d < retainedFromDay),
    fromDay: span ? span[0] : null, toDay: span ? span[1] : null,
  };
}

/** Collect the wholly-ACTIVE days after the launch day, from `from` to `to`, at most `limit` of them. */
function activeDays(launch: LaunchFacts, launchDay: string, from: string, to: string, limit: number | null): { days: string[]; skipped: DayWindow["skipped"]; last: string | null } {
  const days: string[] = [], skipped: DayWindow["skipped"] = [];
  let last: string | null = null;
  const first = from > launchDay ? from : addDays(launchDay, 1);
  for (let d = first; d <= to; d = addDays(d, 1)) {
    if (limit !== null && days.length >= limit) break;
    last = d;
    const s = dayStanding(launch, d);
    if (s === "active") days.push(d);
    else skipped.push({ day: d, why: s === "unknown" ? "not known (the launch record has a gap)" : "not on the new journey all day" });
  }
  return { days, skipped, last };
}

export type MeasureWindows = {
  today: string;
  launchDay: string | null;
  before: DayWindow;
  after: Record<7 | 14 | 28, DayWindow>;
  sinceLaunch: DayWindow;
};

/**
 * The windows the panel and the files read.
 *   · Today is never in a window; every day is an EAT day; the launch day counts on neither side.
 *   · Before: the 14 days ending the day before the launch day (before a launch: ending yesterday — "the baseline so
 *     far"), clipped to the first full counted day (the clipped days are named, and the window is partial).
 *   · After N: the first N days after the launch day on which the journey was ACTIVE from 00:00 to 24:00, before today.
 *     A day it was not is skipped and named. Fewer days than N: the window is partial.
 */
export function measureWindows(opts: { launch: LaunchFacts | null; nowMs: number; retainedFromDay: string }): MeasureWindows {
  const today = eatDayKey(opts.nowMs);
  const yesterday = addDays(today, -1);
  const launchDay = launchDayOf(opts.launch);
  const beforeEnd = launchDay ? (addDays(launchDay, -1) < yesterday ? addDays(launchDay, -1) : yesterday) : yesterday;
  const beforeStart = addDays(beforeEnd, -(S13_RULINGS.beforeDays - 1));
  const beforeDays: string[] = [], beforeSkipped: DayWindow["skipped"] = [];
  for (const d of dayRange(beforeStart, beforeEnd)) {
    if (d < FIRST_FULL_COUNTED_DAY) beforeSkipped.push({ day: d, why: "before counting began" });
    else beforeDays.push(d);
  }
  const before = makeWindow("before", "old", S13_RULINGS.beforeDays, beforeDays, beforeSkipped, opts.retainedFromDay, [beforeStart, beforeEnd]);

  const after = {} as Record<7 | 14 | 28, DayWindow>;
  for (const n of S13_RULINGS.afterDays) {
    const key = `after${n}` as WindowKey;
    if (!opts.launch || !launchDay) { after[n] = makeWindow(key, "new", n, [], [], opts.retainedFromDay, null, true); continue; }
    const a = activeDays(opts.launch, launchDay, addDays(launchDay, 1), yesterday, n);
    after[n] = makeWindow(key, "new", n, a.days, a.skipped, opts.retainedFromDay, a.last ? [addDays(launchDay, 1), a.last] : null);
  }
  let sinceLaunch: DayWindow;
  if (!opts.launch || !launchDay) sinceLaunch = makeWindow("sinceLaunch", "new", null, [], [], opts.retainedFromDay, null, true);
  else {
    const a = activeDays(opts.launch, launchDay, addDays(launchDay, 1), yesterday, null);
    sinceLaunch = makeWindow("sinceLaunch", "new", null, a.days, a.skipped, opts.retainedFromDay, a.last ? [addDays(launchDay, 1), a.last] : null);
  }
  return { today, launchDay, before, after, sinceLaunch };
}

/** The agency week that ends the day before `monday` (Monday M → M−7 … M−1), on the new journey's ACTIVE days only. */
export function weekWindow(launch: LaunchFacts | null, monday: string, retainedFromDay: string): DayWindow {
  const from = addDays(monday, -7), to = addDays(monday, -1);
  const launchDay = launchDayOf(launch);
  if (!launch || !launchDay) return makeWindow("week", "new", null, [], [], retainedFromDay, [from, to], true);
  const days: string[] = [], skipped: DayWindow["skipped"] = [];
  for (const d of dayRange(from, to)) {
    if (d <= launchDay) continue; // the launch day and the days before it belong to no "after" week
    const s = dayStanding(launch, d);
    if (s === "active") days.push(d);
    else skipped.push({ day: d, why: s === "unknown" ? "not known (the launch record has a gap)" : "not on the new journey all day" });
  }
  return makeWindow("week", "new", null, days, skipped, retainedFromDay, [from, to]);
}

/** The EAT calendar month `YYYY-MM`, on the new journey's ACTIVE days after the launch day. */
export function monthWindow(launch: LaunchFacts | null, month: string, retainedFromDay: string): DayWindow {
  const from = `${month}-01`;
  const to = addDays(`${addMonths(month, 1)}-01`, -1);
  const launchDay = launchDayOf(launch);
  if (!launch || !launchDay) return makeWindow("month", "new", null, [], [], retainedFromDay, [from, to], true);
  const days: string[] = [], skipped: DayWindow["skipped"] = [];
  for (const d of dayRange(from, to)) {
    if (d <= launchDay) continue;
    const s = dayStanding(launch, d);
    if (s === "active") days.push(d);
    else skipped.push({ day: d, why: s === "unknown" ? "not known (the launch record has a gap)" : "not on the new journey all day" });
  }
  return makeWindow("month", "new", null, days, skipped, retainedFromDay, [from, to]);
}

/** `2026-10` + n months. */
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const t = y * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
}

/* ── The agency's cadence ────────────────────────────────────────────────────────────────────────────────────────── */

export type DueReport =
  | { kind: "baseline" }
  | { kind: "week"; k: number; of: number; monday: string; fromDay: string; toDay: string }
  | { kind: "month"; month: string; dueDay: string };

export type AgencySchedule = {
  today: string;
  /** The report to send now: the baseline before launch; then the newest week or month whose day has come. */
  due: DueReport;
  /** Before the first Monday after launch: when the first weekly report is due. */
  next: { kind: "week"; monday: string } | { kind: "month"; month: string; dueDay: string } | null;
  /** The eight Mondays (empty before launch). */
  mondays: string[];
};

/** The first day after `day` (exclusive) that is a Monday. */
export function nextMondayAfter(day: string): string {
  let d = addDays(day, 1);
  while (weekdayOf(d) !== 0) d = addDays(d, 1);
  return d;
}

/**
 * Which report is due. Before launch: the baseline. After: Monday M₁ is the first Monday whose week (M−7 … M−1) holds a
 * day after the launch day, then each Monday for 8 weeks; after the eighth, the previous complete calendar month on the
 * first Monday after it ends. ⛔ The platform never sends anything: this is screen state only (Open point 17).
 */
export function agencySchedule(launchDay: string | null, nowMs: number): AgencySchedule {
  const today = eatDayKey(nowMs);
  if (!launchDay) return { today, due: { kind: "baseline" }, next: null, mondays: [] };
  const m1 = nextMondayAfter(addDays(launchDay, 1));
  const of = S13_RULINGS.weeklyReports;
  const mondays = Array.from({ length: of }, (_, i) => addDays(m1, 7 * i));
  const lastMonday = mondays[of - 1];
  let due: DueReport = { kind: "baseline" };
  let next: AgencySchedule["next"] = today < m1 ? { kind: "week", monday: m1 } : null;
  for (const [i, m] of mondays.entries()) {
    if (m <= today) due = { kind: "week", k: i + 1, of, monday: m, fromDay: addDays(m, -7), toDay: addDays(m, -1) };
    else if (!next) next = { kind: "week", monday: m };
  }
  if (today >= lastMonday) {
    // Monthly from here: a month is due on the first Monday after it ends, if that Monday is after the eighth week's.
    let month = addMonths(launchDay.slice(0, 7), 0);
    for (let guard = 0; guard < 600; guard++) {
      const end = addDays(`${addMonths(month, 1)}-01`, -1);
      const dueDay = nextMondayAfter(end);
      if (dueDay > lastMonday) {
        if (dueDay <= today) due = { kind: "month", month, dueDay };
        else { next = { kind: "month", month, dueDay }; break; }
      }
      month = addMonths(month, 1);
    }
  }
  return { today, due, next, mondays };
}

/* ── The cells: one status vocabulary ────────────────────────────────────────────────────────────────────────────── */

export type CellStatus =
  | "figure"
  | "held"
  | "none"
  | "not-launched"
  | "no-offer"
  | "not-recorded"
  | "not-split"
  | "unavailable"
  | "unreadable"
  | "pruned";

export type Cell = {
  status: CellStatus;
  /** The two halves, as counted. Null where the status prints no half. */
  n: number | null;
  d: number | null;
  /** The share in TENTHS of a percent (0 … 1000) — the one rounding every surface prints. Null when no share. */
  tenths: number | null;
  /** What a reader sees in the share's place: "42.5%", "100.0%", "—", "Not launched". */
  text: string;
  /** Held at 100.0% because two counters disagree (the "*" mark). */
  held: boolean;
  /** A share over fewer than `smallSampleBelow`. */
  small: boolean;
  /** Fewer days than the window asked for. */
  partial: { counted: number; asked: number } | null;
  /** Units whose follow-up (30 minutes, 24 hours) had not passed at the read: left out of the denominator. */
  waiting: number;
  /** Days dropped from both halves because the counters recorded nothing while the site had visits. */
  notCounted: string[];
  /** The sentence that explains a status that is not a plain figure (null for a plain figure). */
  note: string | null;
};

export type CellContext = {
  measure: MeasureDef;
  side: "before" | "after";
  window: DayWindow;
  campaign: string | null;
  /** Every source this cell reads answered. */
  readable: boolean;
  /** This build carries S9's records. */
  s9: boolean;
  waiting?: number;
  notCounted?: string[];
};

/** The share in tenths of a percent: ⌊1000·n/d⌉, half up. The one rounding; `percentText` prints it. */
export function tenthsOf(n: number, d: number): number {
  return Math.round((Math.min(n, d) * 1000) / d);
}

/** "42.5%" — tenths of a percent, to one decimal (Open point 11: the renderers' `0.0%`). */
export function percentText(tenths: number): string {
  return `${(tenths / 10).toFixed(1)}%`;
}

/** The fraction a numeric cell carries (`percent` columns): exactly the printed share, so every renderer agrees. */
export function shareFraction(tenths: number): number {
  return tenths / 1000;
}

/** A count as people read it: "1,234". */
export function countText(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

/** A per-day average is not an event count. Keep fractions visible, including a one-in-14-days baseline. */
export function dailyMeanText(n: number | null): string {
  if (n === null || !Number.isFinite(n) || n < 0) return "Could not be read";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** "12 min", "1 h 12 min" — the median time to a first bet. */
export function minutesText(m: number | null): string {
  if (m === null || !Number.isFinite(m)) return "—";
  const r = Math.round(m);
  if (r < 60) return `${r} min`;
  return `${Math.floor(r / 60)} h ${r % 60} min`;
}

const MINUS = String.fromCharCode(0x2212);

/**
 * After minus before, in percentage points, to one decimal — only between two cells that print a share (a figure or a
 * small sample). Held, empty or explained cells have no change. U+2212 for a fall. ⛔ A change carries no colour.
 */
export function changeOf(before: Cell, after: Cell): { tenths: number; text: string } | null {
  if (before.status !== "figure" || after.status !== "figure" || before.tenths === null || after.tenths === null) return null;
  const diff = after.tenths - before.tenths;
  const text = `${diff > 0 ? "+" : diff < 0 ? MINUS : ""}${(Math.abs(diff) / 10).toFixed(1)} pts`;
  return { tenths: diff, text };
}

/** The window's marks (partial, waiting, not counted) belong only to a cell that counted something: a figure, a held
 *  share, "none yet" and "no offer". An explained cell (unreadable, pruned, not split, …) carries none of them. */
const COUNTED: ReadonlySet<CellStatus> = new Set(["figure", "held", "none", "no-offer"]);
const blank = (status: CellStatus, text: string, note: string | null, ctx: CellContext, n: number | null = null, d: number | null = null): Cell => ({
  status, n, d, tenths: null, text, held: false, small: false,
  partial: COUNTED.has(status) ? partialOf(ctx.window) : null,
  waiting: COUNTED.has(status) ? ctx.waiting ?? 0 : 0,
  notCounted: COUNTED.has(status) ? ctx.notCounted ?? [] : [],
  note,
});

function partialOf(w: DayWindow): Cell["partial"] {
  if (w.asked === null || w.notLaunched) return null;
  return w.days.length < w.asked ? { counted: w.days.length, asked: w.asked } : null;
}

const readsCounters = (m: MeasureDef) => m.numerator.half.source !== "rows" || m.denominator.half.source !== "rows";

/**
 * ⭐ THE ONE DECISION OF WHAT A CELL PRINTS, in this precedence:
 *   unreadable → pruned → not launched → no offer / not recorded → not split → unavailable → none yet → held → figure,
 * with the marks (small sample, partial, waiting, not counted) carried on top. ⛔ No status prints a 0 that is not a
 * counted zero: a source that could not be read, a window the counters no longer hold, a record this build does not keep
 * and a split the data cannot make each say so instead.
 */
export function cellFor(n: number | null, d: number | null, ctx: CellContext): Cell {
  const m = ctx.measure;
  if (!ctx.readable) return blank("unreadable", "—", "could not be read", ctx);
  if (ctx.window.pruned && readsCounters(m)) return blank("pruned", "—", "older than 400 days", ctx);
  if (ctx.side === "after" && ctx.window.notLaunched) return blank("not-launched", "Not launched", null, ctx);
  if (ctx.side === "before" && m.before === "no-offer") {
    return blank("no-offer", "—", "no deposit was offered at a shortfall before launch", ctx, null, d);
  }
  if (ctx.side === "before" && m.before === "not-recorded") {
    return blank("not-recorded", "—", "the bet a deposit was made for is recorded from launch", ctx);
  }
  if (ctx.campaign && !m.campaignSplit) return blank("not-split", "—", "not split by campaign", ctx);
  if (ctx.side === "after" && m.needsS9 && !ctx.s9) return blank("unavailable", "—", "not yet available", ctx);
  if (n === null || d === null || !Number.isFinite(n) || !Number.isFinite(d) || n < 0 || d < 0) {
    return blank("unreadable", "—", "could not be read", ctx);
  }
  if (d === 0) return blank("none", "—", m.noneYet, ctx, n, d);
  const small = d < S13_RULINGS.smallSampleBelow;
  if (n > d) {
    return {
      status: "held", n, d, tenths: 1000, text: percentText(1000), held: true, small, partial: partialOf(ctx.window),
      waiting: ctx.waiting ?? 0, notCounted: ctx.notCounted ?? [], note: "two counters disagree",
    };
  }
  const tenths = tenthsOf(n, d);
  return {
    status: "figure", n, d, tenths, text: percentText(tenths), held: false, small, partial: partialOf(ctx.window),
    waiting: ctx.waiting ?? 0, notCounted: ctx.notCounted ?? [], note: null,
  };
}

/** The marks a cell carries, as short words, in a fixed order. Every surface prints these, and only these. */
export function cellMarks(c: Cell): string[] {
  const out: string[] = [];
  if (c.held) out.push("* two counters disagree");
  if (c.small && (c.status === "figure" || c.status === "held")) out.push("small sample");
  if (c.partial) out.push(`${c.partial.counted} of ${c.partial.asked} days`);
  if (c.waiting > 0) out.push(`${countText(c.waiting)} waiting`);
  if (c.notCounted.length > 0) out.push(`not counted: ${c.notCounted.join(", ")}`);
  return out;
}

/** "12 of 40" — the halves under a share; for a "no offer" cell, only the notices. Null when no half is printed. */
export function halvesText(c: Cell): string | null {
  if (c.status === "no-offer") return c.d === null ? null : `${countText(c.d)} notices shown`;
  if (c.n === null || c.d === null) return null;
  return `${countText(c.n)} of ${countText(c.d)}`;
}

/* ── S16's "measures in bounds" — Ali's rule (S13 Point 12, 2026-10-14) ─────────────────────────────────────────────── */

export type InBoundsKey = (typeof S13_RULINGS.inBounds.measures)[number];
export type HarmMarkerKey = (typeof S13_RULINGS.inBounds.harmMarkers)[number];

/** One measure against its baseline. */
export type MeasureBound = {
  key: InBoundsKey;
  /** `excluded`: the measure has no pre-launch baseline BY DESIGN (no deposit was offered; the saved bet was not
   *  recorded), so there is nothing for it to stay at or above — named, never counted as a pass or a zero.
   *  `undecided`: a figure this rule needs is missing (unreadable, not yet available, held, none) — the verdict waits. */
  status: "at-or-above" | "below" | "excluded" | "undecided";
  before: number | null;
  after: number | null;
  why: string | null;
};

/** One harm marker's average daily count, seven days after launch against the 14-day baseline. */
export type HarmBound = {
  key: HarmMarkerKey;
  status: "not-above" | "above" | "undecided";
  beforeMean: number | null;
  afterMean: number | null;
  /** Counted days on each side (a day the count did not run is not a day of zeros). */
  beforeDays: number;
  afterDays: number;
  why: string | null;
};

export type InBoundsVerdict = {
  verdict: "in-bounds" | "out-of-bounds" | "not-yet";
  /** One sentence a reader can act on. */
  reason: string;
  measures: MeasureBound[];
  harm: HarmBound[];
};

/** A marker's daily counts on each side: null for a day not counted (the harm watch's "not counted" or a missing day). */
export type HarmDays = Record<HarmMarkerKey, { before: Array<number | null>; after: Array<number | null> }>;

const HARM_NAME: Record<HarmMarkerKey, string> = { rapidDeposit: "rapid deposits", chasingLosses: "top-ups after betting" };
const MEASURE_NO: Record<InBoundsKey, string> = { homeToSheet: "1", sheetToBet: "2", shortToDeposit: "3", depositToBet: "4", timeToFirstBet: "5" };
const listText = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/**
 * ⭐ S16's GO CONDITION, AS ALI DEFINED IT (2026-10-14): seven days after launch, each of the five measures is AT OR ABOVE
 * its 14-day pre-launch baseline, and no harm marker (RAPID_DEPOSIT_ESCALATION, CHASING_LOSSES daily counts) rises above
 * its baseline. Pure: the caller hands it the before and after-7 cells and the two markers' daily counts.
 *
 *   · Measures are compared on the PRINTED shares (tenths of a percent), so the verdict agrees with every screen and file;
 *     "at or above" is ≥. A measure whose before column has no figure BY DESIGN (3: no deposit was offered; 4: not
 *     recorded before launch) is EXCLUDED and named — it is neither a pass nor a fail, and never a zero. Any other missing
 *     figure (unreadable, not yet available, held because two counters disagree, none yet) leaves the verdict "not yet".
 *   · A harm marker is compared on its AVERAGE daily count: the seven days after launch against the counted baseline days.
 *     All seven after days must have been counted; the baseline needs at least one counted day.
 *   · Precedence: fewer than seven full days after launch → NOT YET (the rule is read at seven days, never on a partial
 *     window); then any measure below, or any marker above → OUT OF BOUNDS (a definite failure is not hidden by a missing
 *     figure elsewhere); then anything undecided → NOT YET; otherwise IN BOUNDS.
 * ⛔ Nothing here switches, alerts or decides S16: it states the rule's answer on the launch watch (compliance VIEW only,
 *    because it reads the harm counts).
 */
export function inBoundsVerdict(input: {
  after7: DayWindow;
  cells: Record<InBoundsKey, { before: Cell; after: Cell }>;
  harm: HarmDays | null;
}): InBoundsVerdict {
  const need = S13_RULINGS.inBounds.afterDays;
  const measures: MeasureBound[] = S13_RULINGS.inBounds.measures.map((key) => {
    const { before, after } = input.cells[key];
    if (before.status === "no-offer" || before.status === "not-recorded") {
      return { key, status: "excluded", before: null, after: after.tenths, why: "no pre-launch baseline by design" };
    }
    if (before.status !== "figure" || before.tenths === null) {
      return { key, status: "undecided", before: null, after: after.tenths, why: `the baseline reads "${before.note ?? before.text}"` };
    }
    if (after.status !== "figure" || after.tenths === null) {
      return { key, status: "undecided", before: before.tenths, after: null, why: `the seven days after launch read "${after.note ?? after.text}"` };
    }
    return { key, status: after.tenths >= before.tenths ? "at-or-above" : "below", before: before.tenths, after: after.tenths, why: null };
  });
  const harm: HarmBound[] = S13_RULINGS.inBounds.harmMarkers.map((key) => {
    const h = input.harm?.[key];
    if (!h) return { key, status: "undecided", beforeMean: null, afterMean: null, beforeDays: 0, afterDays: 0, why: "the harm counts were not read" };
    const b = h.before.filter((x): x is number => x !== null && Number.isFinite(x));
    const a = h.after.filter((x): x is number => x !== null && Number.isFinite(x));
    const beforeMean = b.length ? b.reduce((n, x) => n + x, 0) / b.length : null;
    const afterMean = a.length ? a.reduce((n, x) => n + x, 0) / a.length : null;
    const base = { key, beforeMean, afterMean, beforeDays: b.length, afterDays: a.length };
    if (b.length === 0) return { ...base, status: "undecided", why: "no baseline day was counted" };
    if (a.length < need || h.after.length < need) return { ...base, status: "undecided", why: `${a.length} of ${need} days after launch were counted` };
    return { ...base, status: (afterMean as number) > (beforeMean as number) ? "above" : "not-above", why: null };
  });

  const below = measures.filter((m) => m.status === "below").map((m) => MEASURE_NO[m.key]);
  const above = harm.filter((h) => h.status === "above").map((h) => HARM_NAME[h.key]);
  const excluded = measures.filter((m) => m.status === "excluded").map((m) => MEASURE_NO[m.key]);
  const judged = measures.filter((m) => m.status === "at-or-above").map((m) => MEASURE_NO[m.key]);
  const excludedText = excluded.length ? ` (${listText(excluded)} ${excluded.length === 1 ? "has" : "have"} no pre-launch baseline)` : "";
  // The rule is read SEVEN days after launch: before then nothing is decided, whatever a partial window shows.
  const days = input.after7.notLaunched ? 0 : input.after7.days.length;
  if (input.after7.notLaunched || days < need) {
    return { verdict: "not-yet", reason: input.after7.notLaunched ? "Not yet: not launched." : `Not yet: ${days} of ${need} days after launch.`, measures, harm };
  }
  if (below.length || above.length) {
    const parts = [
      ...(below.length ? [`measure${below.length === 1 ? "" : "s"} ${listText(below)} below the pre-launch baseline`] : []),
      ...(above.length ? [`${listText(above)} above the baseline`] : []),
    ];
    return { verdict: "out-of-bounds", reason: `Out of bounds: ${parts.join("; ")}.`, measures, harm };
  }
  const undecided = [
    ...measures.filter((m) => m.status === "undecided").map((m) => `measure ${MEASURE_NO[m.key]}: ${m.why}`),
    ...harm.filter((h) => h.status === "undecided").map((h) => `${HARM_NAME[h.key]}: ${h.why}`),
  ];
  if (undecided.length) return { verdict: "not-yet", reason: `Not yet: ${undecided.join("; ")}.`, measures, harm };
  return {
    verdict: "in-bounds",
    reason: `In bounds: measure${judged.length === 1 ? "" : "s"} ${listText(judged)} at or above the pre-launch baseline${excludedText}, and neither harm marker's average daily count above its baseline.`,
    measures, harm,
  };
}

/* ── Row matching (pure, shared by both stores) ──────────────────────────────────────────────────────────────────── */

export type SavedQuestionBet = { marketId: string; side: string; stake: number };
export type DepositRowLite = { id: string; userId: string; at: number; savedBet: SavedQuestionBet | null };
export type BetRowLite = { id: string; userId: string; marketId: string; side: string; stake: number; placedAt: number };

/**
 * Measure 4's one-to-one match. Each returned bet is given to the LATEST eligible deposit: the same player; the saved
 * bet equals the position's question, side and stake; completed at or before the bet, the bet within 30 minutes
 * (inclusive); not already matched; a tie on time is broken by the larger id. Returns the ids of the matched deposits.
 */
export function matchReturnedBets(deposits: readonly DepositRowLite[], bets: readonly BetRowLite[]): Set<string> {
  const matched = new Set<string>();
  const ordered = [...bets].sort((a, b) => a.placedAt - b.placedAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const b of ordered) {
    let best: DepositRowLite | null = null;
    for (const d of deposits) {
      if (matched.has(d.id) || d.userId !== b.userId || !d.savedBet) continue;
      if (d.savedBet.marketId !== b.marketId || d.savedBet.side !== b.side || d.savedBet.stake !== b.stake) continue;
      if (!(d.at <= b.placedAt && b.placedAt - d.at <= DEPOSIT_FOLLOW_UP_MS)) continue;
      if (!best || d.at > best.at || (d.at === best.at && d.id > best.id)) best = d;
    }
    if (best) matched.add(best.id);
  }
  return matched;
}

/** Measure 4b: does the same player's bet fall within [deposit, deposit + 30 min] (inclusive)? */
export function followedWithin(deposit: { userId: string; at: number }, betsByUser: ReadonlyMap<string, readonly number[]>): boolean {
  const list = betsByUser.get(deposit.userId);
  if (!list) return false;
  for (const t of list) if (t >= deposit.at && t <= deposit.at + DEPOSIT_FOLLOW_UP_MS) return true;
  return false;
}

/** The median of a list, or null for an empty one. */
export function median(xs: readonly number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const i = Math.floor(s.length / 2);
  return s.length % 2 ? s[i] : (s[i - 1] + s[i]) / 2;
}

/** The instant an EAT day ends (the next day's first instant). */
export function eatDayEndMs(day: string): number {
  return eatDayStartMs(day) + DAY_MS;
}

/** The half-open instant span `[from, to)` that a set of days covers (contiguous or not, its outer bounds). */
export function spanOf(days: readonly string[]): { fromMs: number; toMs: number } | null {
  if (days.length === 0) return null;
  const sorted = [...days].sort();
  return { fromMs: eatDayStartMs(sorted[0]), toMs: eatDayEndMs(sorted[sorted.length - 1]) };
}

/** Is the instant inside one of these EAT days? */
export function inDays(atMs: number, days: ReadonlySet<string>): boolean {
  return Number.isFinite(atMs) && days.has(eatDayKey(atMs));
}

/** "2 Oct 2026" — an EAT day key as the files and the panel print it (English, the console's body language). */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function dayText(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** "2–15 Oct 2026", "28 Sep – 4 Oct 2026", "29 Dec 2026 – 4 Jan 2027" — a span of days. */
export function spanText(from: string, to: string): string {
  if (from === to) return dayText(from);
  const [y1, m1, d1] = from.split("-").map(Number);
  const [y2, m2, d2] = to.split("-").map(Number);
  if (y1 === y2 && m1 === m2) return `${d1}–${d2} ${MONTHS[m2 - 1]} ${y2}`;
  if (y1 === y2) return `${d1} ${MONTHS[m1 - 1]} – ${d2} ${MONTHS[m2 - 1]} ${y2}`;
  return `${dayText(from)} – ${dayText(to)}`;
}

/** "October 2026" for `2026-10`. */
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export function monthText(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

/** A due report as one line: "Baseline — before launch", "Week 3 of 8 — 9–15 Nov 2026", "Month — October 2026". */
export function dueText(due: DueReport): string {
  if (due.kind === "baseline") return "Baseline — before launch";
  if (due.kind === "week") return `Week ${due.k} of ${due.of} — ${spanText(due.fromDay, due.toDay)}`;
  return `Month — ${monthText(due.month)}`;
}
