/**
 * HOUSE-BOT RULES — one schema, one number parser, one table of bounds and one table of cross-field
 * rules, shared by the rules form, the limits form, the server actions, the parser and the engine.
 *
 * ⛔ ONE SOURCE, OR TWO ANSWERS (04 C1, C6). The form and the server run the SAME validators on the
 * SAME raw strings, so a value the form accepts is the value the action saves, digit for digit. The
 * server never calls `Number()` on FormData: "10,000.50" is refused as a decimal, never saved as
 * 1000050 the way the kit's numeric sanitiser would have it.
 *
 * ⛔ "NOT SET" IS NOT 0 (04 C1). A cap left empty is NULL and the bot cannot bet under it; 0 is a
 * value, allowed only where a field's minimum is 0. Nothing here turns one into the other.
 *
 * ⚠️ LIVE BOUNDS ARRIVE THROUGH `RulesContext` (04 F5). The platform's minimum and maximum stake are
 * the live config, never `payout.ts`'s constants — production once ran a 500 floor under a 1,000
 * constant — and the `bet.place` refill that sets the min-gap floor lives beside Redis. The server
 * resolves both and passes them in, which is what keeps this module pure enough for the browser.
 *
 * ⛔ THE UNTARGETED COUNTER KEEPS ITS TIMING (N1 §4.1, N2 §4 step 12). `effectiveTiming` holds an
 * automatic COUNTER to the player's exit window with NO lock margin — PLAN §12's 0:20, 5:00, 5:00 and
 * 7:00. Only a target's reaction also waits `LOCK_MARGIN_MS` (`effectiveTargetTiming`). Adding the
 * margin to the automatic counter turns the 5:00 row of `test:house-bot-rules` red, on purpose.
 */
import { MARKET_CATEGORIES, type MarketCategory } from "@/lib/markets/categories";
import { ALLOWED_DURATIONS } from "@/lib/updown-durations";
import {
  EAT_LABEL,
  MINUTES_PER_DAY,
  MINUTES_PER_WEEK,
  WEEKDAYS,
  WEEKDAY_LABEL,
  formatAfterStake,
  formatEat,
  formatMinutes,
  isWeekday,
  parseEatTime,
  type Weekday,
  type WeekInterval,
} from "./clock";
import {
  LOCK_MARGIN_MS,
  MIN_TIME_TO_CUTOFF_FLOOR_SEC,
  STALE_AFTER_SEC,
  TARGET_ARMING_SEC,
  USUAL_LATENESS_SEC,
  isReactTo,
  isTimingFrom,
  type ReactTo,
  type TimingFrom,
} from "./constants";

// ---------------------------------------------------------------------------
// Versions and the injected context
// ---------------------------------------------------------------------------

/** `rules.schemaVersion` — separate from `HouseBot.rulesVersion`, which is the save counter. */
export const HOUSE_RULES_SCHEMA_VERSION = 1;

/** `HouseBotControl.limitsSchemaVersion`. The seeded control row carries 1; a NULL reads as 1. */
export const HOUSE_LIMITS_SCHEMA_VERSION = 1;

/** Up & Down rounds open about this late (PLAN §4.7), so a round's bettable life is D·60 − 92 s. */
export const UD_ROUND_OPEN_LAG_SEC = 92;

/** A FILL on Up & Down must land at least this long before the lock (PLAN §5). */
export const UD_FILL_TAIL_SEC = 20;

/** The database rail on every TZS column (`… BETWEEN 0 AND 1000000000`). */
export const TZS_RAIL_MAX = 1_000_000_000;

/** Pool band ceiling (PLAN §5). */
export const POOL_TOTAL_MAX_TZS = 100_000_000;

/**
 * Where the parser has no live bounds to default a trigger minimum from. Only a leaf no enabled mode
 * reads is ever defaulted, so this value never sizes a bet.
 */
const FALLBACK_MIN_STAKE_TZS = 1_000;

/** A market's exit rates, as the market config names them. */
export type ExitRates = { freeExitGraceMinutes: number; paidExitWindowMinutes: number };

/** An Up & Down chain in scope: `<assetId>:<durationMinutes>`. */
export type ChainKey = `${string}:${number}`;

export type RulesChain = { key: ChainKey; label: string; durationMinutes: number };

/** A non-removed bot, as the limits form compares against it. */
export type RulesBot = {
  botId: string;
  label: string;
  status: "ACTIVE" | "PAUSED" | "AUTO_PAUSED";
  caps: HouseBotCaps;
};

/**
 * Everything the validators need that is not in the form. The server builds it fresh per request;
 * a test injects fixtures (a duration list gaining 1 and 120, a live minimum of 500).
 */
export type RulesContext = {
  /** The live global stake bounds, through the bet path's own resolver (04 A7, F5). */
  stakeBounds: { minTzs: number; maxTzs: number };
  /** `RATE_RULES["bet.place"].refillPerMin` — the holder shares this bucket (PLAN §13 risk 5). */
  betPlaceRefillPerMin: number;
  /** Enabled assets × chains. */
  chains: readonly RulesChain[];
  /** `MARKET_CATEGORIES` unless a test injects a fixture. */
  categories: readonly MarketCategory[];
  /** `ALLOWED_DURATIONS` unless a test injects a fixture. */
  durations: readonly number[];
  /** Current exit settings, for markets created from now. */
  exitRates: { polls: ExitRates; updown: Readonly<Record<ChainKey, ExitRates>> };
  /** `MIN_SELECTION_WINDOW_MINUTES` — the shortest life a poll can have. */
  pollMinLifetimeMin: number;
  /** The saved global limits, or null before any are read. */
  limits: HouseBotLimits | null;
  /** Every non-removed bot. */
  bots: readonly RulesBot[];
};

/** The platform lists a server-built context starts from. */
export const RULES_CONTEXT_LISTS = {
  categories: MARKET_CATEGORIES,
  durations: ALLOWED_DURATIONS as readonly number[],
} as const;

/**
 * The lowest min gap a bot may save, in seconds: enough to leave at least 70% of the holder's own
 * `bet.place` refill for the holder (04 C14's `ceil(60 / (refill × 0.3))`, written as
 * `ceil(200 / refill)` — the same number for every refill). 20 s at today's 10 per minute.
 */
export function minGapFloorSec(refillPerMin: number): number {
  return refillPerMin > 0 ? Math.ceil(200 / refillPerMin) : Number.POSITIVE_INFINITY;
}

/**
 * How many of these instants fall in the rolling window `(now − window, now]` — the pure half of a
 * PER_HOUR check. Twenty bets between 13:00:31 and 13:59:00 still count at 14:00:30, so the
 * twenty-first is refused (04 C14). The database half lives in the caps suite (commit 2).
 */
export function countInRollingWindow(placedAtMs: readonly number[], nowMs: number, windowMs: number): number {
  const from = nowMs - windowMs;
  return placedAtMs.filter((t) => t > from && t <= nowMs).length;
}

// ---------------------------------------------------------------------------
// Numbers — one parser for the form and the server (04 C1)
// ---------------------------------------------------------------------------

export type ParsedWhole =
  | { kind: "OK"; value: number }
  | { kind: "UNSET" }
  | { kind: "DECIMAL" | "NEGATIVE" | "NOT_A_NUMBER" };

export const PARSE_COPY = {
  DECIMAL: "Whole shillings only — no decimals.",
  NEGATIVE: "Must be 0 or more.",
  NOT_A_NUMBER: "Digits only, e.g. 10,000.",
} as const;

/** A field that has no "not set" state, left empty. */
export const REQUIRED_NUMBER_COPY = "Enter a whole number.";

/** How an unset cap reads everywhere it is shown (04 C1). */
export const NOT_SET_COPY = "Not set — this bot cannot bet";

/**
 * The zero of every decimal-digit block the parser maps to ASCII. A `\p{Nd}` digit outside these
 * blocks is refused rather than guessed.
 */
const DIGIT_ZEROS = [
  0x0030, 0x0660, 0x06f0, 0x07c0, 0x0966, 0x09e6, 0x0a66, 0x0ae6, 0x0b66, 0x0be6, 0x0c66, 0x0ce6, 0x0d66, 0x0de6,
  0x0e50, 0x0ed0, 0x0f20, 0x1040, 0x1090, 0x17e0, 0x1810, 0x1946, 0x19d0, 0x1a80, 0x1a90, 0x1b50, 0x1bb0, 0x1c40,
  0x1c50, 0xa620, 0xa8d0, 0xa900, 0xa9d0, 0xa9f0, 0xaa50, 0xabf0,
] as const;

const DECIMAL_DIGIT = /\p{Nd}/u;

function toAsciiDigits(s: string): string | null {
  let out = "";
  for (const ch of s) {
    const cp = ch.codePointAt(0) ?? 0;
    if ((cp >= 0x30 && cp <= 0x39) || !DECIMAL_DIGIT.test(ch)) {
      out += ch;
      continue;
    }
    let zero = -1;
    for (const z of DIGIT_ZEROS) if (z <= cp && cp < z + 10) zero = z;
    if (zero < 0) return null;
    out += String(cp - zero);
  }
  return out;
}

/**
 * A typed whole number.
 *
 * In order: empty → UNSET; NFKC, and every decimal digit to ASCII ("٣٠٠٠" is 3000, "１０００" is
 * 1000); a leading TZS or Tsh dropped; spaces, commas, underscores and apostrophes removed; any "."
 * → DECIMAL (so "10.000" is refused, never read as ten thousand — the parser does not guess); a
 * leading minus → NEGATIVE; anything else that is not all digits → NOT_A_NUMBER.
 *
 * ⚠️ More than 15 significant digits parse as `Infinity`, so the bound check says "At most …" instead
 * of the value wrapping, throwing, or overflowing an int8 on the way to the database.
 */
export function parseWholeNumber(raw: string): ParsedWhole {
  if (raw.trim() === "") return { kind: "UNSET" };
  const mapped = toAsciiDigits(raw.normalize("NFKC"));
  if (mapped === null) return { kind: "NOT_A_NUMBER" };
  const s = mapped
    .trim()
    .replace(/^(tzs|tsh)/i, "")
    .replace(/[\s\u00A0\u202F,_'\u2019]/g, "");
  if (s.includes(".")) return { kind: "DECIMAL" };
  if (s.startsWith("-") || s.startsWith("\u2212")) return { kind: "NEGATIVE" };
  if (!/^\d+$/.test(s)) return { kind: "NOT_A_NUMBER" };
  const digits = s.replace(/^0+(?=\d)/, "");
  return { kind: "OK", value: digits.length > 15 ? Number.POSITIVE_INFINITY : Number(digits) };
}

/**
 * Any posted value → the same result `parseWholeNumber` gives. A string is parsed; a whole number
 * ≥ 0 is taken as is (one past the safe range reads as `Infinity`, like a long string); a fraction is
 * DECIMAL, a negative NEGATIVE; null and undefined are UNSET; anything else is NOT_A_NUMBER.
 */
export function toWhole(v: unknown): ParsedWhole {
  if (v === null || v === undefined) return { kind: "UNSET" };
  if (typeof v === "string") return parseWholeNumber(v);
  if (typeof v === "number") {
    if (!Number.isFinite(v)) return { kind: "NOT_A_NUMBER" };
    if (v < 0) return { kind: "NEGATIVE" };
    if (!Number.isInteger(v)) return { kind: "DECIMAL" };
    return { kind: "OK", value: Number.isSafeInteger(v) ? v : Number.POSITIVE_INFINITY };
  }
  return { kind: "NOT_A_NUMBER" };
}

/** 1000000 → "1,000,000". Used by every message that quotes a bound or a value. */
export function formatWhole(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  const sign = n < 0 ? "-" : "";
  return sign + String(Math.trunc(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// ---------------------------------------------------------------------------
// The rules JSON (v1) and the typed caps
// ---------------------------------------------------------------------------

export type ModeFlags = { counter: boolean; fill: boolean; opener: boolean };

export const ROUND_TO_OPTIONS = [100, 500, 1000, 5000] as const;
export type RoundToTzs = (typeof ROUND_TO_OPTIONS)[number];

/**
 * A schedule window in minutes of the day, applied to every listed day. `startMin` 0–1439; `endMin`
 * 1–1440, where a typed 00:00 end is 1440. `endMin < startMin` is overnight: it belongs to its start
 * day and spills into the next, Sunday into Monday (04 C15).
 */
export type ScheduleWindow = { startMin: number; endMin: number };

/**
 * Behaviour lives in this JSON; money caps live in typed columns (PLAN §5). Enter now and targeting
 * are folded into v1 (N1 §2) — built after release they would have been v2, and F4 would have paused
 * every bot until an owner saved the converted rules.
 */
export type HouseBotRulesV1 = {
  schemaVersion: 1;
  scope: {
    products: { updown: boolean; polls: boolean };
    chains: ChainKey[];
    categories: MarketCategory[];
    skipPollsClosingWithinMin: number;
    poolTotalMinTzs: number;
    poolTotalMaxTzs: number | null;
  };
  modes: { updown: ModeFlags; polls: ModeFlags };
  counter: {
    delayMinSec: number;
    delayMaxSec: number;
    reactProbabilityPct: number;
    triggerStakeMinTzs: number;
    triggerStakeMaxTzs: number;
    amount: { kind: "PCT"; pct: number } | { kind: "FIXED"; fixedTzs: number };
  };
  fill: { leadUdSec: number; leadPollsMin: number; targetThinSharePct: number; jitterSec: number };
  opener: {
    delayUdMinSec: number;
    delayUdMaxSec: number;
    delayPollsMinMin: number;
    delayPollsMaxMin: number;
    stakeMinTzs: number;
    stakeMaxTzs: number;
  };
  updown: { closenessPct: number };
  shaping: { roundToTzs: RoundToTzs; jitterPct: number };
  guards: {
    noReactZoneUdSec: number;
    noReactZonePollsMin: number;
    minTimeToCutoffUdSec: number;
    minTimeToCutoffPollsMin: number;
  };
  schedule: { days: Weekday[]; allDay: boolean; windows: ScheduleWindow[] };
  enterNow: { enabled: boolean; thinStakeTzs: number | null; openerStakeTzs: number | null };
  targeting: { enabled: boolean };
};

/** `HouseBot` cap columns, in form order. NULL = not set. */
export const CAP_FIELDS = [
  "stakeMinTzs",
  "stakeMaxTzs",
  "capPerMarketTzs",
  "capDailyStakeTzs",
  "capDailyLossTzs",
  "capOpenExposureTzs",
  "balanceFloorTzs",
  "freqMinGapSec",
  "freqMaxPerHour",
  "freqMaxPerDay",
  "freqMaxPerMarket",
  "capStaffChosenPerDay",
  "capStaffChosenDailyTzs",
  "targetsMaxActive",
] as const;
export type CapField = (typeof CAP_FIELDS)[number];
export type HouseBotCaps = Record<CapField, number | null>;

/** `HouseBotControl` global limits that may be NULL (not set). */
export const NULLABLE_LIMIT_FIELDS = [
  "gCapDailyStakeTzs",
  "gCapDailyLossTzs",
  "gCapOpenExposureTzs",
  "gCapPerMarketTzs",
  "gMaxBetsPerMinute",
  "gMaxBetsPerDay",
  "gCounterPerPlayerPerDay",
  "gCounterPerPlayerTzsPerDay",
  "gCapStaffChosenPerDay",
  "gCapStaffChosenDailyTzs",
  "gTargetsMaxActive",
  "gStaffChosenMaxCounterpartyShare",
] as const;

/** `HouseBotControl` limits that are NOT NULL with a seeded default. */
/** ⛔ `holderNoticesPerHour` was removed before it shipped (C4 ruling 153): the holder is told nothing (D19c), so it had no reader. */
export const COUNT_LIMIT_FIELDS = ["maxDesignatedBots", "bellAlertsPerHour"] as const;

/** Every limit, in form order. */
export const LIMIT_FIELDS = [
  "gCapDailyStakeTzs",
  "gCapDailyLossTzs",
  "gCapOpenExposureTzs",
  "gCapPerMarketTzs",
  "gMaxBetsPerMinute",
  "gMaxBetsPerDay",
  "gCounterPerPlayerPerDay",
  "gCounterPerPlayerTzsPerDay",
  "maxDesignatedBots",
  "bellAlertsPerHour",
  "gCapStaffChosenPerDay",
  "gCapStaffChosenDailyTzs",
  "gTargetsMaxActive",
  "gStaffChosenMaxCounterpartyShare",
] as const satisfies readonly (
  | (typeof NULLABLE_LIMIT_FIELDS)[number]
  | (typeof COUNT_LIMIT_FIELDS)[number]
)[];
export type LimitField = (typeof LIMIT_FIELDS)[number];

export type HouseBotLimits = Record<(typeof NULLABLE_LIMIT_FIELDS)[number], number | null> &
  Record<(typeof COUNT_LIMIT_FIELDS)[number], number>;

/** A target's timing fields (N2 §5). */
export type TargetTimingInput = { delayMinSec: number; delayMaxSec: number; timingFrom: TimingFrom; reactTo: ReactTo };

/** The frozen exit rates a target's market carries, as N2 §5 names them. */
export type FrozenExitRates = { graceMin: number; paidMin: number };

/**
 * A new bot's rules (PLAN §5, 04 C14): nothing in scope, every mode off, Enter now and targeting off
 * with no stakes, all seven days all day. Numbers take their defaults, cut to the live stake bounds.
 */
export function DEFAULT_RULES_V1(ctx: Pick<RulesContext, "stakeBounds">): HouseBotRulesV1 {
  const { minTzs, maxTzs } = ctx.stakeBounds;
  const inLive = (v: number) => Math.min(Math.max(v, minTzs), Math.max(minTzs, maxTzs));
  return {
    schemaVersion: 1,
    scope: {
      products: { updown: false, polls: false },
      chains: [],
      categories: [],
      skipPollsClosingWithinMin: 60,
      poolTotalMinTzs: 0,
      poolTotalMaxTzs: null,
    },
    modes: {
      updown: { counter: false, fill: false, opener: false },
      polls: { counter: false, fill: false, opener: false },
    },
    counter: {
      delayMinSec: 15,
      delayMaxSec: 45,
      reactProbabilityPct: 60,
      triggerStakeMinTzs: minTzs,
      triggerStakeMaxTzs: inLive(200_000),
      amount: { kind: "PCT", pct: 80 },
    },
    fill: { leadUdSec: 45, leadPollsMin: 30, targetThinSharePct: 40, jitterSec: 10 },
    opener: {
      delayUdMinSec: 20,
      delayUdMaxSec: 90,
      delayPollsMinMin: 5,
      delayPollsMaxMin: 30,
      stakeMinTzs: inLive(1_000),
      stakeMaxTzs: inLive(5_000),
    },
    updown: { closenessPct: 25 },
    shaping: { roundToTzs: 500, jitterPct: 10 },
    guards: { noReactZoneUdSec: 30, noReactZonePollsMin: 15, minTimeToCutoffUdSec: 20, minTimeToCutoffPollsMin: 5 },
    schedule: { days: [...WEEKDAYS], allDay: true, windows: [] },
    enterNow: { enabled: false, thinStakeTzs: null, openerStakeTzs: null },
    targeting: { enabled: false },
  };
}

/** Is any automatic mode (COUNTER, FILL, OPENER on either product) on? */
export function hasAnyAutomaticMode(r: HouseBotRulesV1): boolean {
  const on = (m: ModeFlags) => m.counter || m.fill || m.opener;
  return on(r.modes.updown) || on(r.modes.polls);
}

/**
 * Start's "no mode" rule (N1 §5, PLAN §18): a bot has an entry mode when any automatic mode, Enter
 * now or targeting is on. A bot whose only way in is Enter now still starts.
 */
export function hasAnyEntryMode(r: HouseBotRulesV1): boolean {
  return hasAnyAutomaticMode(r) || r.enterNow.enabled || r.targeting.enabled;
}

// ---------------------------------------------------------------------------
// Field metadata — the forms render from it, the validators bound from it
// ---------------------------------------------------------------------------

export type FieldUnit = "TZS" | "s" | "min" | "%" | "pts" | "count" | "bool" | "enum" | "list";
export type FieldGroup = "rules" | "caps" | "limits";

/** A lower bound: a number, the live minimum stake, or the min-gap floor from the `bet.place` refill. */
export type FieldMin = number | "LIVE_MIN" | "FLOOR";

/** An upper bound: a number, the live maximum stake, or a bound derived from the round durations. */
export type FieldMax = number | "LIVE_MAX" | "MAX_UD_SEC" | "MAX_OPENER_UD_SEC";

export type FieldMeta = {
  id: string;
  group: FieldGroup;
  section: string;
  label: string;
  unit: FieldUnit;
  /** Null for toggles, lists and choices. */
  min: FieldMin | null;
  max: FieldMax | null;
  /** "0" is a valid value here (the minimum is 0). */
  zeroAllowed: boolean;
  /** An empty field saves as NULL — "not set" — instead of being refused. */
  nullable: boolean;
  default: number | "LIVE_MIN" | null;
  /** Filled by "Use recommended values" only; never saved by itself. */
  recommended: number | "LIVE_MIN" | null;
  options?: readonly number[];
  hint?: string;
};

type FieldSpec = Omit<FieldMeta, "id" | "zeroAllowed">;

type NumberOptions = {
  default?: number | "LIVE_MIN" | null;
  recommended?: number | "LIVE_MIN" | null;
  nullable?: boolean;
  hint?: string;
  options?: readonly number[];
};

function toggle(group: FieldGroup, section: string, label: string, hint?: string): FieldSpec {
  return { group, section, label, unit: "bool", min: null, max: null, nullable: false, default: null, recommended: null, hint };
}

function list(group: FieldGroup, section: string, label: string): FieldSpec {
  return { group, section, label, unit: "list", min: null, max: null, nullable: false, default: null, recommended: null };
}

function choice(group: FieldGroup, section: string, label: string): FieldSpec {
  return { group, section, label, unit: "enum", min: null, max: null, nullable: false, default: null, recommended: null };
}

function num(
  group: FieldGroup,
  section: string,
  label: string,
  unit: FieldUnit,
  min: FieldMin,
  max: FieldMax,
  o: NumberOptions = {},
): FieldSpec {
  return {
    group,
    section,
    label,
    unit,
    min,
    max,
    nullable: o.nullable ?? false,
    default: o.default ?? null,
    recommended: o.recommended ?? null,
    options: o.options,
    hint: o.hint,
  };
}

const RESETS_AT_MIDNIGHT_HINT = "Resets at 00:00 EAT.";

/** Both loss caps (04 R3 and PLAN §3). */
export const LOSS_CAP_HINT =
  "Limits count stakes by the day they were placed and restart at 00:00 EAT. Losses that settle today can include stakes from earlier days. Counts today's open stakes as lost until they settle; bots stop only on settled losses.";

const STAFF_BOT_HINT =
  "Enter now stakes and target reactions placed this EAT day. Not set — Enter now and targets can't bet.";
const STAFF_BOT_TZS_HINT =
  "TZS of Enter now stakes and target reactions placed this EAT day. Not set — Enter now and targets can't bet.";
const STAFF_GLOBAL_HINT =
  "All bots together, this EAT day. Not set = Enter now and targets are off for every bot. Not needed to switch house bots on.";

/** The bell-alerts hint with its figures (04 C13). */
export const BELL_ALERTS_HINT = (perHour: number): string =>
  `At ${formatWhole(perHour)} per hour each admin can get up to ${formatWhole(24 * perHour)} bet rows a day, plus summaries and pause, money and switch alerts.`;

/**
 * Every field of the rules form, the caps and the limits form, in the order they are shown. The key
 * order IS the error order, so `focusFirstInvalid` lands on the first field on the page.
 *
 * ⚠️ Bounds follow N1 §5's sealed table where it speaks (the staff-chosen caps and the staff-edge
 * thresholds: minimum 0 in TZS, Enter now stakes within the live bounds). Every other TZS cap has a
 * form minimum of the live minimum stake, because a cap below it can never admit a bet; the database
 * rail under all of them stays 0–1,000,000,000.
 */
const RAW_FIELDS = {
  // Rules · scope
  "scope.products.updown": toggle("rules", "Scope", "Up & Down"),
  "scope.products.polls": toggle("rules", "Scope", "Polls"),
  "scope.chains": list("rules", "Scope", "Up & Down chains"),
  "scope.categories": list("rules", "Scope", "Poll categories"),
  "scope.skipPollsClosingWithinMin": num("rules", "Scope", "Skip polls closing within", "min", 1, 43_200, {
    default: 60,
    recommended: 60,
  }),
  "scope.poolTotalMinTzs": num("rules", "Scope", "Pool total minimum", "TZS", 0, POOL_TOTAL_MAX_TZS, {
    default: 0,
    recommended: 0,
  }),
  "scope.poolTotalMaxTzs": num("rules", "Scope", "Pool total maximum", "TZS", 0, POOL_TOTAL_MAX_TZS, {
    nullable: true,
    hint: "Empty = no maximum.",
  }),
  // Rules · modes
  "modes.updown.counter": toggle("rules", "Modes", "Up & Down · Counter"),
  "modes.updown.fill": toggle("rules", "Modes", "Up & Down · Fill"),
  "modes.updown.opener": toggle("rules", "Modes", "Up & Down · Opener"),
  "modes.polls.counter": toggle("rules", "Modes", "Polls · Counter"),
  "modes.polls.fill": toggle("rules", "Modes", "Polls · Fill"),
  "modes.polls.opener": toggle("rules", "Modes", "Polls · Opener"),
  // Rules · counter
  "counter.delayMinSec": num("rules", "Counter", "Delay minimum", "s", 5, 600, { default: 15, recommended: 15 }),
  "counter.delayMaxSec": num("rules", "Counter", "Delay maximum", "s", 5, 600, { default: 45, recommended: 45 }),
  "counter.reactProbabilityPct": num("rules", "Counter", "React probability", "%", 0, 100, {
    default: 60,
    recommended: 60,
  }),
  "counter.triggerStakeMinTzs": num("rules", "Counter", "Trigger stake minimum", "TZS", "LIVE_MIN", "LIVE_MAX", {
    default: "LIVE_MIN",
    recommended: "LIVE_MIN",
  }),
  "counter.triggerStakeMaxTzs": num("rules", "Counter", "Trigger stake maximum", "TZS", "LIVE_MIN", "LIVE_MAX", {
    default: 200_000,
    recommended: 200_000,
  }),
  "counter.amount.kind": choice("rules", "Counter", "Amount"),
  "counter.amount.pct": num("rules", "Counter", "Amount (% of the trigger stake)", "%", 10, 100, {
    default: 80,
    recommended: 80,
  }),
  "counter.amount.fixedTzs": num("rules", "Counter", "Amount (fixed)", "TZS", "LIVE_MIN", "LIVE_MAX"),
  // Rules · fill
  "fill.leadUdSec": num("rules", "Fill", "Lead before cutoff (Up & Down)", "s", 10, "MAX_UD_SEC", {
    default: 45,
    recommended: 45,
  }),
  "fill.leadPollsMin": num("rules", "Fill", "Lead before cutoff (polls)", "min", 2, 1_440, {
    default: 30,
    recommended: 30,
  }),
  "fill.targetThinSharePct": num("rules", "Fill", "Target thin share", "%", 10, 50, { default: 40, recommended: 40 }),
  "fill.jitterSec": num("rules", "Fill", "Jitter", "s", 0, 86_400, { default: 10, recommended: 10 }),
  // Rules · opener
  "opener.delayUdMinSec": num("rules", "Opener", "Delay minimum (Up & Down)", "s", 1, "MAX_OPENER_UD_SEC", {
    default: 20,
    recommended: 20,
  }),
  "opener.delayUdMaxSec": num("rules", "Opener", "Delay maximum (Up & Down)", "s", 1, "MAX_OPENER_UD_SEC", {
    default: 90,
    recommended: 90,
  }),
  "opener.delayPollsMinMin": num("rules", "Opener", "Delay minimum (polls)", "min", 1, 43_200, {
    default: 5,
    recommended: 5,
  }),
  "opener.delayPollsMaxMin": num("rules", "Opener", "Delay maximum (polls)", "min", 1, 43_200, {
    default: 30,
    recommended: 30,
  }),
  "opener.stakeMinTzs": num("rules", "Opener", "Opener stake minimum", "TZS", "LIVE_MIN", "LIVE_MAX", {
    default: 1_000,
    recommended: 1_000,
  }),
  "opener.stakeMaxTzs": num("rules", "Opener", "Opener stake maximum", "TZS", "LIVE_MIN", "LIVE_MAX", {
    default: 5_000,
    recommended: 5_000,
  }),
  // Rules · Up & Down
  "updown.closenessPct": num("rules", "Up & Down", "Closeness", "%", 0, 100, { default: 25, recommended: 25 }),
  // Rules · shaping
  "shaping.roundToTzs": num("rules", "Shaping", "Round to", "enum", 100, 5_000, {
    default: 500,
    recommended: 500,
    options: ROUND_TO_OPTIONS,
  }),
  "shaping.jitterPct": num("rules", "Shaping", "Jitter", "%", 0, 30, { default: 10, recommended: 10 }),
  // Rules · guards
  "guards.noReactZoneUdSec": num("rules", "Guards", "No-react zone (Up & Down)", "s", 0, 300, {
    default: 30,
    recommended: 30,
  }),
  "guards.noReactZonePollsMin": num("rules", "Guards", "No-react zone (polls)", "min", 0, 1_440, {
    default: 15,
    recommended: 15,
  }),
  "guards.minTimeToCutoffUdSec": num(
    "rules",
    "Guards",
    "Min time to cutoff (Up & Down)",
    "s",
    MIN_TIME_TO_CUTOFF_FLOOR_SEC,
    86_400,
    { default: 20, recommended: 20 },
  ),
  "guards.minTimeToCutoffPollsMin": num("rules", "Guards", "Min time to cutoff (polls)", "min", 1, 43_200, {
    default: 5,
    recommended: 5,
  }),
  // Rules · schedule
  "schedule.days": list("rules", "Schedule", "Days"),
  "schedule.allDay": toggle("rules", "Schedule", "All day"),
  "schedule.windows": list("rules", "Schedule", "Windows (EAT)"),
  // Rules · Enter now and targets (N1 §5, N2 §5)
  "enterNow.enabled": toggle(
    "rules",
    "Enter now",
    "Enter now",
    "Polls only. You choose the poll; 50pick works out the side and the amount.",
  ),
  "enterNow.thinStakeTzs": num("rules", "Enter now", "Enter now thin stake", "TZS", "LIVE_MIN", "LIVE_MAX", {
    nullable: true,
    recommended: 10_000,
    hint: "Used when players' locked money leaves one side thinner. Cut to fit.",
  }),
  "enterNow.openerStakeTzs": num("rules", "Enter now", "Enter now opener stake", "TZS", "LIVE_MIN", "LIVE_MAX", {
    nullable: true,
    recommended: 2_000,
    hint: "Used on a poll with no stakes yet. The side is drawn once for that poll.",
  }),
  "targeting.enabled": toggle(
    "rules",
    "Targets",
    "Targets",
    "Targets use the Counter amount and trigger range below, and the staff-chosen limits.",
  ),
  // Caps (typed HouseBot columns)
  stakeMinTzs: num("caps", "Caps", "Stake min", "TZS", "LIVE_MIN", "LIVE_MAX", { nullable: true, recommended: 1_000 }),
  stakeMaxTzs: num("caps", "Caps", "Stake max", "TZS", "LIVE_MIN", "LIVE_MAX", { nullable: true, recommended: 10_000 }),
  capPerMarketTzs: num("caps", "Caps", "Per-market cap", "TZS", "LIVE_MIN", TZS_RAIL_MAX, {
    nullable: true,
    recommended: 20_000,
  }),
  capDailyStakeTzs: num("caps", "Caps", "Daily stake cap", "TZS", "LIVE_MIN", TZS_RAIL_MAX, {
    nullable: true,
    recommended: 200_000,
    hint: RESETS_AT_MIDNIGHT_HINT,
  }),
  capDailyLossTzs: num("caps", "Caps", "Daily loss cap", "TZS", "LIVE_MIN", TZS_RAIL_MAX, {
    nullable: true,
    recommended: 50_000,
    hint: LOSS_CAP_HINT,
  }),
  capOpenExposureTzs: num("caps", "Caps", "Open exposure cap", "TZS", "LIVE_MIN", TZS_RAIL_MAX, {
    nullable: true,
    recommended: 100_000,
  }),
  balanceFloorTzs: num("caps", "Caps", "Balance floor", "TZS", 0, TZS_RAIL_MAX, { nullable: true, recommended: 0 }),
  freqMinGapSec: num("caps", "Frequency", "Min gap", "s", "FLOOR", 86_400, {
    nullable: true,
    recommended: 30,
    hint: "Since this bot's last placed bet.",
  }),
  freqMaxPerHour: num("caps", "Frequency", "Bets per hour", "count", 1, 60, {
    nullable: true,
    recommended: 20,
    hint: "Rolling 60 minutes.",
  }),
  freqMaxPerDay: num("caps", "Frequency", "Bets per day", "count", 1, 1_440, {
    nullable: true,
    recommended: 200,
    hint: RESETS_AT_MIDNIGHT_HINT,
  }),
  freqMaxPerMarket: num("caps", "Frequency", "Bets per market", "count", 1, 6, { nullable: true, recommended: 2 }),
  capStaffChosenPerDay: num("caps", "Staff-chosen", "Staff-chosen stakes per day", "count", 1, 50, {
    nullable: true,
    recommended: 3,
    hint: STAFF_BOT_HINT,
  }),
  capStaffChosenDailyTzs: num("caps", "Staff-chosen", "Staff-chosen daily cap", "TZS", 0, TZS_RAIL_MAX, {
    nullable: true,
    recommended: 30_000,
    hint: STAFF_BOT_TZS_HINT,
  }),
  targetsMaxActive: num("caps", "Staff-chosen", "Max active targets", "count", 1, 50, {
    nullable: true,
    hint: "Not set — no target can be added.",
  }),
  // Limits (HouseBotControl)
  gCapDailyStakeTzs: num("limits", "Global limits", "Daily stake limit", "TZS", "LIVE_MIN", TZS_RAIL_MAX, {
    nullable: true,
    recommended: 500_000,
    hint: RESETS_AT_MIDNIGHT_HINT,
  }),
  gCapDailyLossTzs: num("limits", "Global limits", "Daily loss limit", "TZS", "LIVE_MIN", TZS_RAIL_MAX, {
    nullable: true,
    recommended: 100_000,
    hint: LOSS_CAP_HINT,
  }),
  gCapOpenExposureTzs: num("limits", "Global limits", "Open exposure limit", "TZS", "LIVE_MIN", TZS_RAIL_MAX, {
    nullable: true,
    recommended: 300_000,
  }),
  gCapPerMarketTzs: num("limits", "Global limits", "Per-market limit", "TZS", "LIVE_MIN", TZS_RAIL_MAX, {
    nullable: true,
    recommended: 30_000,
  }),
  gMaxBetsPerMinute: num("limits", "Global limits", "Bets per minute", "count", 1, 20, {
    nullable: true,
    recommended: 6,
    hint: "Rolling 60 seconds.",
  }),
  gMaxBetsPerDay: num("limits", "Global limits", "Bets per day", "count", 1, 28_800, {
    nullable: true,
    recommended: 1_000,
    hint: RESETS_AT_MIDNIGHT_HINT,
  }),
  gCounterPerPlayerPerDay: num("limits", "Global limits", "Counters per player per day", "count", 1, 1_440, {
    nullable: true,
    recommended: 3,
    hint: RESETS_AT_MIDNIGHT_HINT,
  }),
  gCounterPerPlayerTzsPerDay: num(
    "limits",
    "Global limits",
    "Counter TZS per player per day",
    "TZS",
    "LIVE_MIN",
    TZS_RAIL_MAX,
    { nullable: true, recommended: 30_000, hint: RESETS_AT_MIDNIGHT_HINT },
  ),
  maxDesignatedBots: num("limits", "Roster and alerts", "Max designated bots", "count", 1, 20, {
    default: 5,
    recommended: 5,
  }),
  bellAlertsPerHour: num("limits", "Roster and alerts", "Bell alerts per hour", "count", 0, 60, {
    default: 20,
    recommended: 20,
    hint: "At {n} per hour each admin can get up to {24n} bet rows a day, plus summaries and pause, money and switch alerts.",
  }),
  gCapStaffChosenPerDay: num("limits", "Staff-chosen", "Staff-chosen stakes per day (all bots)", "count", 1, 200, {
    nullable: true,
    recommended: 10,
    hint: STAFF_GLOBAL_HINT,
  }),
  gCapStaffChosenDailyTzs: num("limits", "Staff-chosen", "Staff-chosen daily limit", "TZS", 0, TZS_RAIL_MAX, {
    nullable: true,
    recommended: 100_000,
    hint: STAFF_GLOBAL_HINT,
  }),
  gTargetsMaxActive: num("limits", "Staff-chosen", "Max active targets (all bots)", "count", 1, 200, {
    nullable: true,
    hint: "Not set = no target can be added for any bot. Not needed to switch house bots on.",
  }),
  gStaffChosenMaxCounterpartyShare: num("limits", "Staff-chosen", "Counterparty share limit", "%", 10, 100, {
    nullable: true,
    recommended: 50,
    hint: "Enter now refuses when one player holds more than this share of the players' locked money it would add to. Not set = Enter now is off for every bot.",
  }),
} satisfies Record<string, FieldSpec>;

export type FieldId = keyof typeof RAW_FIELDS;

export const FIELD_META: Readonly<Record<FieldId, FieldMeta>> = Object.fromEntries(
  (Object.entries(RAW_FIELDS) as [FieldId, FieldSpec][]).map(([id, spec]) => [
    id,
    { ...spec, id, zeroAllowed: spec.min === 0 },
  ]),
) as Record<FieldId, FieldMeta>;

/** `FIELD_META` key order: the page order, and the order errors are returned in. */
export const FIELD_ORDER = Object.keys(RAW_FIELDS) as FieldId[];

export function isFieldId(v: unknown): v is FieldId {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(RAW_FIELDS, v);
}

/** tsc proves every cap and limit column has a field row. */
const CAP_FIELD_IDS: readonly FieldId[] = CAP_FIELDS;
const LIMIT_FIELD_IDS: readonly FieldId[] = LIMIT_FIELDS;

/** The numeric rules-JSON fields, in page order. */
const RULE_NUMBER_FIELDS: readonly FieldId[] = FIELD_ORDER.filter((id) => {
  const meta = FIELD_META[id];
  return meta.group === "rules" && meta.min !== null;
});

// ---------------------------------------------------------------------------
// Required and exempt groups
// ---------------------------------------------------------------------------

/** Start refuses while any of these caps is not set (02 §3.3 item 4). Staff-chosen caps are never named. */
export const REQUIRED_FOR_START = [
  "stakeMinTzs",
  "stakeMaxTzs",
  "capPerMarketTzs",
  "capDailyStakeTzs",
  "capDailyLossTzs",
  "capOpenExposureTzs",
  "balanceFloorTzs",
  "freqMinGapSec",
  "freqMaxPerHour",
  "freqMaxPerDay",
  "freqMaxPerMarket",
] as const satisfies readonly CapField[];

/**
 * Master ON refuses while any of these limits is not set (PLAN F3, 02 §3.7). The staff-chosen limits,
 * the target maximum and the staff-edge thresholds are not required (N1 §2, N2 §2).
 */
export const REQUIRED_FOR_MASTER_ON = [
  "gCapDailyStakeTzs",
  "gCapDailyLossTzs",
  "gCapOpenExposureTzs",
  "gCapPerMarketTzs",
  "gMaxBetsPerMinute",
  "gMaxBetsPerDay",
  "gCounterPerPlayerPerDay",
  "gCounterPerPlayerTzsPerDay",
] as const satisfies readonly LimitField[];

/**
 * ⛔ CLEARING THESE IS NEVER BLOCKED (MON-14, N1 §5). Clearing one turns Enter now or targets off, which
 * only ever reduces risk, so neither 02 §3.8's "Can't clear a limit while bots are on" nor C1's "pause
 * it before clearing" applies. The two staff-edge thresholds are NOT here: clearing one switches an
 * oversight alert off, and that still needs the switch off first.
 */
export const CLEAR_EXEMPT = [
  "capStaffChosenPerDay",
  "capStaffChosenDailyTzs",
  "targetsMaxActive",
  "gCapStaffChosenPerDay",
  "gCapStaffChosenDailyTzs",
  "gTargetsMaxActive",
  "gStaffChosenMaxCounterpartyShare",
] as const satisfies readonly FieldId[];

export function isClearExempt(field: string): boolean {
  return (CLEAR_EXEMPT as readonly string[]).includes(field);
}

// ---------------------------------------------------------------------------
// Bounds and recommended values
// ---------------------------------------------------------------------------

export type BoundsContext = Pick<RulesContext, "stakeBounds" | "betPlaceRefillPerMin" | "durations">;

function longestDuration(durations: readonly number[]): number {
  return durations.length > 0 ? Math.max(...durations) : 0;
}

/** The longest FILL lead any Up & Down round can take: D·60 − 92 − 20 on the longest duration (PLAN §5). */
export function maxUdFillLeadSec(durations: readonly number[]): number {
  return Math.max(0, longestDuration(durations) * 60 - UD_ROUND_OPEN_LAG_SEC - UD_FILL_TAIL_SEC);
}

/** The longest Up & Down OPENER delay: D·20 s on the longest duration (PLAN §5). */
export function maxOpenerUdDelaySec(durations: readonly number[]): number {
  return longestDuration(durations) * 20;
}

/** A numeric field's bounds today, or null for a toggle, list or choice. */
export function fieldBounds(id: FieldId, ctx: BoundsContext): { min: number; max: number } | null {
  const meta = FIELD_META[id];
  if (meta.min === null || meta.max === null) return null;
  const min =
    meta.min === "LIVE_MIN"
      ? ctx.stakeBounds.minTzs
      : meta.min === "FLOOR"
        ? minGapFloorSec(ctx.betPlaceRefillPerMin)
        : meta.min;
  const max =
    meta.max === "LIVE_MAX"
      ? ctx.stakeBounds.maxTzs
      : meta.max === "MAX_UD_SEC"
        ? maxUdFillLeadSec(ctx.durations)
        : meta.max === "MAX_OPENER_UD_SEC"
          ? maxOpenerUdDelaySec(ctx.durations)
          : meta.max;
  return { min, max };
}

/**
 * The bounds the PARSER applies to a stored rules JSON: static only. Live stake bounds are 04 F5's
 * revalidation, never parse's — a stored stake of 500 under a live minimum of 1,000 is still a
 * well-formed rules JSON.
 */
function storedBounds(id: FieldId, durations: readonly number[]): { min: number; max: number } | null {
  const meta = FIELD_META[id];
  if (meta.min === null || meta.max === null) return null;
  const min = typeof meta.min === "number" ? meta.min : 0;
  const max =
    meta.max === "LIVE_MAX"
      ? TZS_RAIL_MAX
      : meta.max === "MAX_UD_SEC"
        ? maxUdFillLeadSec(durations)
        : meta.max === "MAX_OPENER_UD_SEC"
          ? maxOpenerUdDelaySec(durations)
          : meta.max;
  return { min, max };
}

function resolveLiveMin(v: number | "LIVE_MIN" | null, ctx: Pick<RulesContext, "stakeBounds">): number | null {
  return v === "LIVE_MIN" ? ctx.stakeBounds.minTzs : v;
}

function getPath(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const key of path.split(".")) {
    if (cur === null || typeof cur !== "object" || Array.isArray(cur)) return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

function setPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split(".");
  let cur: Record<string, unknown> = obj;
  for (const key of keys.slice(0, -1)) {
    const next = cur[key];
    if (next === null || typeof next !== "object" || Array.isArray(next)) cur[key] = {};
    cur = cur[key] as Record<string, unknown>;
  }
  cur[keys[keys.length - 1]] = value;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** The recommended caps — "Use recommended values" fills these into the form and saves nothing. */
export function recommendedCaps(ctx: Pick<RulesContext, "stakeBounds">): HouseBotCaps {
  const out = {} as HouseBotCaps;
  for (const k of CAP_FIELDS) out[k] = resolveLiveMin(FIELD_META[k].recommended, ctx);
  return out;
}

/** The recommended limits (PLAN §5, N1 §5). */
export function recommendedLimits(ctx: Pick<RulesContext, "stakeBounds">): HouseBotLimits {
  const out = {} as Record<LimitField, number | null>;
  for (const k of LIMIT_FIELDS) out[k] = resolveLiveMin(FIELD_META[k].recommended, ctx);
  return {
    ...out,
    maxDesignatedBots: out.maxDesignatedBots ?? 5,
    bellAlertsPerHour: out.bellAlertsPerHour ?? 20,
  };
}

/**
 * The rules with every number that has a recommended value filled in.
 *
 * ⛔ NUMBERS ONLY. It never ticks a product, a mode, a chain, a category, All day, Enter now or
 * targeting — recommending a value is not choosing to bet.
 */
export function recommendedRules(r: HouseBotRulesV1, ctx: Pick<RulesContext, "stakeBounds">): HouseBotRulesV1 {
  const out = JSON.parse(JSON.stringify(r)) as HouseBotRulesV1;
  for (const id of RULE_NUMBER_FIELDS) {
    if (id === "counter.amount.pct" && out.counter.amount.kind !== "PCT") continue;
    if (id === "counter.amount.fixedTzs") continue;
    const value = resolveLiveMin(FIELD_META[id].recommended, ctx);
    if (value !== null) setPath(out as unknown as Record<string, unknown>, id, value);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type FieldErrorCode =
  | "UNSET"
  | "DECIMAL"
  | "NEGATIVE"
  | "NOT_A_NUMBER"
  | "BELOW_MIN"
  | "ABOVE_MAX"
  | "INVALID"
  | "CROSS";

/**
 * One refusal, on one field. `rule` names the `CROSS_FIELD_RULES` row when a cross-field rule
 * produced it. `href` is always an absolute path (N1 §6).
 */
export type FieldError = { field: string; code: FieldErrorCode; message: string; href?: string; rule?: CrossRuleId };

/** Not a refusal — the save goes through (e.g. an OPENER delay that doesn't fit one chain, 04 C14). */
export type RulesWarning = { field: string; message: string };

export const CHOOSE_OPTION_COPY = "Choose one of the options.";
export const CHOOSE_FROM_LIST_COPY = "Choose from the list.";

/**
 * Where a field sits on the page. A sub-field ("schedule.windows.2.end") ranks with its field, row by
 * row; a group name ("scope.products") ranks with its first field.
 */
function fieldRank(field: string): number {
  const exact = FIELD_ORDER.indexOf(field as FieldId);
  if (exact >= 0) return exact * 100;
  let best = -1;
  for (let i = 0; i < FIELD_ORDER.length; i++) {
    const id = FIELD_ORDER[i];
    if (field.startsWith(`${id}.`) && (best < 0 || id.length > FIELD_ORDER[best].length)) best = i;
  }
  if (best >= 0) {
    const row = Number(field.slice(FIELD_ORDER[best].length + 1).split(".")[0]);
    return best * 100 + (Number.isInteger(row) ? Math.min(row + 1, 99) : 99);
  }
  const firstChild = FIELD_ORDER.findIndex((id) => id.startsWith(`${field}.`));
  return firstChild >= 0 ? firstChild * 100 : Number.MAX_SAFE_INTEGER;
}

/** Errors in page order (stable), so the form focuses the first one on the page. */
export function sortFieldErrors<T extends { field: string }>(errors: readonly T[]): T[] {
  return errors
    .map((e, i) => ({ e, i, rank: fieldRank(e.field) }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .map((x) => x.e);
}

// ---------------------------------------------------------------------------
// Labels, notes and reasons (04 C2)
// ---------------------------------------------------------------------------

/** NFC, trimmed, inner whitespace collapsed to one space. */
export function normaliseLabel(s: string): string {
  return s.normalize("NFC").trim().replace(/\s+/g, " ");
}

/** NFC and trimmed; newlines kept. */
export function normaliseText(s: string): string {
  return s.normalize("NFC").trim();
}

/** Length in code points — what a person counts, not UTF-16 units (a DOM `maxLength` counts those). */
export function countChars(s: string): number {
  return [...s].length;
}

/**
 * The case-insensitive uniqueness key behind `HouseBot_labelKey_live_key`: NFKC of the normalised
 * label, lowercased. "Bot A" and "bot a" are one label.
 */
export function labelKey(label: string): string {
  return normaliseLabel(label).normalize("NFKC").toLowerCase();
}

export const LABEL_MIN_CHARS = 2;
export const LABEL_MAX_CHARS = 32;
export const TEXT_MAX_CHARS = 300;
export const REASON_MIN_CHARS = 5;

/**
 * Letters, marks, digits, space and `- _ . # '`, tested on the normalised label (C2). Controls, the
 * C2 zero-width characters (U+200B–200D, U+2060, U+FEFF) and bidi controls are not letters, marks or
 * digits, so they fail. Emoji fail too; they stay valid in notes and reasons. Uniqueness is NFKC +
 * lowercase only: cross-script look-alikes (Cyrillic А) are not detected.
 */
export const LABEL_CHARSET = /^[\p{L}\p{M}\p{N} _.#'-]+$/u;

export const LABEL_COPY = {
  length: "2 to 32 characters.",
  charset: "Letters, numbers, spaces and - _ . # ' only.",
} as const;

export const TEXT_TOO_LONG_COPY = "At most 300 characters — shorten it to save.";
export const REASON_REQUIRED_COPY = "Give a reason (at least 5 characters).";

export function validateLabel(raw: string): FieldError | null {
  const s = normaliseLabel(raw);
  const n = countChars(s);
  if (n < LABEL_MIN_CHARS || n > LABEL_MAX_CHARS) return { field: "label", code: "INVALID", message: LABEL_COPY.length };
  if (!LABEL_CHARSET.test(s)) return { field: "label", code: "INVALID", message: LABEL_COPY.charset };
  return null;
}

/** ≤ 300 code points. ⛔ Never truncated — the officer shortens it. */
export function validateNote(raw: string): FieldError | null {
  return countChars(normaliseText(raw)) > TEXT_MAX_CHARS
    ? { field: "note", code: "INVALID", message: TEXT_TOO_LONG_COPY }
    : null;
}

/**
 * 5–300 code points after trimming when required; at most 300 when optional. Five spaces are no
 * reason. ⛔ Never truncated.
 */
export function validateReason(raw: string, opts: { required: boolean; field?: string }): FieldError | null {
  const field = opts.field ?? "reason";
  const n = countChars(normaliseText(raw));
  if (opts.required && n < REASON_MIN_CHARS) return { field, code: "INVALID", message: REASON_REQUIRED_COPY };
  if (n > TEXT_MAX_CHARS) return { field, code: "INVALID", message: TEXT_TOO_LONG_COPY };
  return null;
}

export const DUPLICATE_LABEL_COPY = (label: string, statusWord: string): string =>
  `Another bot is already called “${label}” (${statusWord}). Choose a different label.`;

// ---------------------------------------------------------------------------
// Schedule windows (04 C15)
// ---------------------------------------------------------------------------

export const MAX_SCHEDULE_WINDOWS = 4;

export const SCHEDULE_COPY = {
  noDays: "Pick at least one day.",
  noWindows: "Add a window or choose All day.",
  tooMany: "Up to 4 windows",
  badTime: "Enter a time as HH:MM.",
  sameTime: "Start and end are the same — use All day for 24 hours.",
} as const;

/** One piece of an expanded schedule, with the row and day it came from and its times as typed. */
export type ExpandedInterval = WeekInterval & { row: number; day: Weekday; fromMin: number; toMin: number };

export type ScheduleInput = { days?: unknown; allDay?: unknown; windows?: unknown };

function nextWeekday(day: Weekday): Weekday {
  return WEEKDAYS[(WEEKDAYS.indexOf(day) + 1) % 7];
}

function isOvernight(startMin: number, endMin: number): boolean {
  return endMin < startMin;
}

/** "Mon 22:00 → Tue 02:00 (overnight)" or "Mon 09:00 → 17:00". */
export function describeWindow(day: Weekday, startMin: number, endMin: number): string {
  return isOvernight(startMin, endMin)
    ? `${WEEKDAY_LABEL[day]} ${formatMinutes(startMin)} → ${WEEKDAY_LABEL[nextWeekday(day)]} ${formatMinutes(endMin)} (overnight)`
    : `${WEEKDAY_LABEL[day]} ${formatMinutes(startMin)} → ${formatMinutes(endMin)}`;
}

function overlapCopy(day: Weekday, startMin: number, endMin: number): string {
  return isOvernight(startMin, endMin)
    ? `Overlaps ${WEEKDAY_LABEL[day]} ${formatMinutes(startMin)} → ${WEEKDAY_LABEL[nextWeekday(day)]} ${formatMinutes(endMin)}.`
    : `Overlaps ${WEEKDAY_LABEL[day]} ${formatMinutes(startMin)} → ${formatMinutes(endMin)}.`;
}

function rowPieces(row: number, day: Weekday, startMin: number, endMin: number): ExpandedInterval[] {
  const base = WEEKDAYS.indexOf(day) * MINUTES_PER_DAY;
  const from = base + startMin;
  const to = isOvernight(startMin, endMin) ? base + MINUTES_PER_DAY + endMin : base + endMin;
  const origin = { row, day, fromMin: startMin, toMin: endMin };
  if (to <= MINUTES_PER_WEEK) return [{ startMin: from, endMin: to, ...origin }];
  // Sunday overnight: split at the end of the week so no piece wraps.
  return [
    { startMin: from, endMin: MINUTES_PER_WEEK, ...origin },
    { startMin: 0, endMin: to - MINUTES_PER_WEEK, ...origin },
  ];
}

function isWholeIn(v: unknown, min: number, max: number): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
}

/**
 * A schedule → the week's intervals, plus its errors.
 *
 * In order: no day → "Pick at least one day."; not All day and no window → "Add a window or choose All
 * day."; a fifth row → "Up to 4 windows" on `schedule.windows.4`; a half-typed or impossible time →
 * "Enter a time as HH:MM." on that row's start or end; start and end the same → the same-time error
 * (00:00–00:00 is refused, 23:59–00:00 is valid). Then every row is expanded for every listed day, and
 * any overlap is reported on the LATER row, naming the earlier window it runs into.
 *
 * `rawTimes`, when the form passes them, are the typed `HH:MM` strings: a half-typed "2_" must be an
 * error, and only the raw text can tell it from an empty field (04 C15).
 */
export function expandWindows(
  schedule: ScheduleInput,
  rawTimes?: readonly { start: string; end: string }[],
): { intervals: ExpandedInterval[]; errors: FieldError[]; days: Weekday[]; allDay: boolean; windows: ScheduleWindow[] } {
  const errors: FieldError[] = [];
  const rawDays: readonly unknown[] = Array.isArray(schedule.days) ? schedule.days : [];
  const days = WEEKDAYS.filter((d) => rawDays.includes(d));
  if ((schedule.days !== undefined && !Array.isArray(schedule.days)) || rawDays.some((d) => !isWeekday(d))) {
    errors.push({ field: "schedule.days", code: "INVALID", message: CHOOSE_OPTION_COPY });
  } else if (days.length === 0) {
    errors.push({ field: "schedule.days", code: "INVALID", message: SCHEDULE_COPY.noDays });
  }

  if (schedule.allDay !== undefined && typeof schedule.allDay !== "boolean") {
    errors.push({ field: "schedule.allDay", code: "INVALID", message: CHOOSE_OPTION_COPY });
  }
  const allDay = schedule.allDay === true;

  if (schedule.windows !== undefined && !Array.isArray(schedule.windows)) {
    errors.push({ field: "schedule.windows", code: "INVALID", message: CHOOSE_OPTION_COPY });
  }
  const rawWindows: readonly unknown[] = Array.isArray(schedule.windows) ? schedule.windows : [];

  if (allDay) {
    // All day ignores the windows but keeps well-formed ones in the draft.
    const kept = rawWindows
      .filter(isPlainObject)
      .filter((w) => isWholeIn(w.startMin, 0, MINUTES_PER_DAY - 1) && isWholeIn(w.endMin, 1, MINUTES_PER_DAY))
      .slice(0, MAX_SCHEDULE_WINDOWS)
      .map((w) => ({ startMin: w.startMin as number, endMin: w.endMin as number }));
    const intervals = days.map((day) => {
      const base = WEEKDAYS.indexOf(day) * MINUTES_PER_DAY;
      return { startMin: base, endMin: base + MINUTES_PER_DAY, row: -1, day, fromMin: 0, toMin: MINUTES_PER_DAY };
    });
    return { intervals, errors, days, allDay, windows: kept };
  }

  if (rawWindows.length === 0) {
    errors.push({ field: "schedule.windows", code: "INVALID", message: SCHEDULE_COPY.noWindows });
  }
  if (rawWindows.length > MAX_SCHEDULE_WINDOWS) {
    errors.push({ field: `schedule.windows.${MAX_SCHEDULE_WINDOWS}`, code: "INVALID", message: SCHEDULE_COPY.tooMany });
  }

  const rows: (ScheduleWindow | null)[] = rawWindows.slice(0, MAX_SCHEDULE_WINDOWS).map((w, i) => {
    let startMin: number | null = null;
    let endMin: number | null = null;
    let same = false;
    const typed = rawTimes?.[i];
    if (typed) {
      const s = parseEatTime(typed.start);
      const e = parseEatTime(typed.end);
      if (typeof s === "number") startMin = s;
      else errors.push({ field: `schedule.windows.${i}.start`, code: "INVALID", message: SCHEDULE_COPY.badTime });
      if (typeof e === "number") endMin = e === 0 ? MINUTES_PER_DAY : e;
      else errors.push({ field: `schedule.windows.${i}.end`, code: "INVALID", message: SCHEDULE_COPY.badTime });
      same = startMin !== null && endMin !== null && typed.start.trim() === typed.end.trim();
    } else {
      const row: Record<string, unknown> = isPlainObject(w) ? w : {};
      if (isWholeIn(row.startMin, 0, MINUTES_PER_DAY - 1)) startMin = row.startMin;
      else errors.push({ field: `schedule.windows.${i}.start`, code: "INVALID", message: SCHEDULE_COPY.badTime });
      if (isWholeIn(row.endMin, 1, MINUTES_PER_DAY)) endMin = row.endMin;
      else errors.push({ field: `schedule.windows.${i}.end`, code: "INVALID", message: SCHEDULE_COPY.badTime });
      same = startMin !== null && endMin !== null && startMin === endMin % MINUTES_PER_DAY;
    }
    if (same) {
      errors.push({ field: `schedule.windows.${i}.end`, code: "INVALID", message: SCHEDULE_COPY.sameTime });
      return null;
    }
    return startMin !== null && endMin !== null ? { startMin, endMin } : null;
  });

  const pieces = rows.map((w, i) => (w ? days.flatMap((day) => rowPieces(i, day, w.startMin, w.endMin)) : null));
  for (let later = 1; later < rows.length; later++) {
    const mine = pieces[later];
    if (!mine) continue;
    let found: string | null = null;
    for (let earlier = 0; earlier < later && found === null; earlier++) {
      const theirs = pieces[earlier];
      const w = rows[earlier];
      if (!theirs || !w) continue;
      for (const day of days) {
        const hit = theirs
          .filter((p) => p.day === day)
          .some((p) => mine.some((q) => p.startMin < q.endMin && q.startMin < p.endMin));
        if (hit) {
          found = overlapCopy(day, w.startMin, w.endMin);
          break;
        }
      }
    }
    if (found !== null) errors.push({ field: `schedule.windows.${later}`, code: "INVALID", message: found });
  }

  return {
    intervals: pieces.flatMap((p) => p ?? []),
    errors,
    days,
    allDay,
    windows: rows.filter((w): w is ScheduleWindow => w !== null),
  };
}

// ---------------------------------------------------------------------------
// Bound checks
// ---------------------------------------------------------------------------

/** The label a message uses when the caller has none. */
export const DEFAULT_BOT_LABEL = "Bot A";

function boundMessage(id: FieldId, which: "BELOW" | "ABOVE", b: { min: number; max: number }): string {
  const meta = FIELD_META[id];
  if (meta.unit === "TZS") {
    if (which === "ABOVE") return `At most TZS ${formatWhole(b.max)}.`;
    return meta.min === "LIVE_MIN"
      ? `At least TZS ${formatWhole(b.min)} — the platform minimum.`
      : `At least TZS ${formatWhole(b.min)}.`;
  }
  if (meta.min === "FLOOR" && which === "BELOW") return ruleCopy("R-GAP-FLOOR", 0, { floor: formatWhole(b.min) });
  const range = `Between ${formatWhole(b.min)} and ${formatWhole(b.max)}`;
  if (meta.unit === "s") return `${range} seconds.`;
  if (meta.unit === "min") return `${range} minutes.`;
  return `${range}.`;
}

type Checked = { value: number | null; error: FieldError | null };

function checkNumber(id: FieldId, raw: unknown, ctx: BoundsContext): Checked {
  const meta = FIELD_META[id];
  const parsed = toWhole(raw);
  if (parsed.kind === "UNSET") {
    return meta.nullable
      ? { value: null, error: null }
      : { value: null, error: { field: id, code: "UNSET", message: REQUIRED_NUMBER_COPY } };
  }
  if (parsed.kind !== "OK") return { value: null, error: { field: id, code: parsed.kind, message: PARSE_COPY[parsed.kind] } };
  if (meta.options && !meta.options.includes(parsed.value)) {
    return { value: null, error: { field: id, code: "INVALID", message: CHOOSE_OPTION_COPY } };
  }
  const b = fieldBounds(id, ctx);
  if (b && parsed.value < b.min) {
    const error: FieldError = { field: id, code: "BELOW_MIN", message: boundMessage(id, "BELOW", b) };
    if (meta.min === "FLOOR") error.rule = "R-GAP-FLOOR";
    return { value: null, error };
  }
  if (b && parsed.value > b.max) {
    return { value: null, error: { field: id, code: "ABOVE_MAX", message: boundMessage(id, "ABOVE", b) } };
  }
  return { value: parsed.value, error: null };
}

/**
 * One field, on its own: the parse, the "not set" rule and the bounds, with the same message the save
 * gives. The form calls this on every keystroke's would-be value.
 */
export function validateField(
  id: FieldId,
  raw: unknown,
  ctx: BoundsContext,
): { ok: true; value: number | null } | { ok: false; error: FieldError } {
  const checked = checkNumber(id, raw, ctx);
  return checked.error ? { ok: false, error: checked.error } : { ok: true, value: checked.value };
}

// ---------------------------------------------------------------------------
// Cross-field rules — the only source of them (04 C6)
// ---------------------------------------------------------------------------

/** Where a limits refusal sends the owner. Absolute, like every refusal href (N1 §6). */
export const LIMITS_TAB_HREF = "/admin/house-bots?tab=limits";

type CrossFieldRuleShape = {
  id: string;
  scopes: readonly ("RULES" | "LIMITS")[];
  /** REFUSE blocks the save; CONFLICT never does — it lists bots for the consequence preview (04 C6). */
  kind: "REFUSE" | "CONFLICT";
  fields: readonly string[];
  reportOn: string;
  /** The exact copy; `{x}`, `{g}`, `{label}` and friends are filled in. */
  messages: readonly string[];
  source: string;
};

/**
 * Every rule that compares two fields, or a field with a global limit or another bot.
 *
 * - A rule is skipped while a value it compares is not set, or already refused on its own.
 * - Each field carries at most one error: the first rule, in this order, wins. N2-c restates N1-c's
 *   last comparison, so a max-targets refusal is reported as N1-c.
 * - Direction (04 C6): raising a bot above a set global is refused on the rules form; lowering a
 *   global below a bot is allowed on the limits form and lists that bot in `conflicts`.
 * - N1-a to N1-e, N2-a to N2-c carry the sealed N1 §5 and N2 §5 copy verbatim.
 */
export const CROSS_FIELD_RULES = [
  {
    id: "R-STAKE-ORDER",
    scopes: ["RULES"],
    kind: "REFUSE",
    fields: ["stakeMinTzs", "stakeMaxTzs"],
    reportOn: "stakeMinTzs",
    messages: ["Minimum stake can't be above maximum stake."],
    source: "02 §3.6",
  },
  {
    id: "R-PM-GE-STAKE",
    scopes: ["RULES"],
    kind: "REFUSE",
    fields: ["capPerMarketTzs", "stakeMaxTzs"],
    reportOn: "capPerMarketTzs",
    messages: ["Per-market cap must be at least the maximum stake."],
    source: "02 §3.6",
  },
  {
    id: "R-DAY-GE-PM",
    scopes: ["RULES"],
    kind: "REFUSE",
    fields: ["capDailyStakeTzs", "capPerMarketTzs"],
    reportOn: "capDailyStakeTzs",
    messages: ["Daily stake cap must be at least the per-market cap."],
    source: "PLAN §5",
  },
  {
    id: "R-LOSS-LE-DAY",
    scopes: ["RULES"],
    kind: "REFUSE",
    fields: ["capDailyLossTzs", "capDailyStakeTzs"],
    reportOn: "capDailyLossTzs",
    messages: ["Daily loss cap can't exceed daily stake cap."],
    source: "02 §3.6",
  },
  {
    id: "R-EXP-GE-PM",
    scopes: ["RULES"],
    kind: "REFUSE",
    fields: ["capOpenExposureTzs", "capPerMarketTzs"],
    reportOn: "capOpenExposureTzs",
    messages: ["Open exposure cap must be at least the per-market cap."],
    source: "PLAN §5",
  },
  {
    id: "R-GAP-FLOOR",
    scopes: ["RULES"],
    kind: "REFUSE",
    fields: ["freqMinGapSec"],
    reportOn: "freqMinGapSec",
    messages: ["Min gap is at least {floor} seconds."],
    source: "04 C14 (reported by the field's own bound check)",
  },
  {
    id: "R-HOUR-FITS-GAP",
    scopes: ["RULES"],
    kind: "REFUSE",
    fields: ["freqMaxPerHour", "freqMinGapSec"],
    reportOn: "freqMaxPerHour",
    messages: ["At {gap} s apart this bot can place at most {n} bets an hour."],
    source: "PLAN §5",
  },
  {
    id: "R-DAY-GE-HOUR",
    scopes: ["RULES"],
    kind: "REFUSE",
    fields: ["freqMaxPerDay", "freqMaxPerHour"],
    reportOn: "freqMaxPerDay",
    messages: ["Bets per day must be at least bets per hour."],
    source: "PLAN §5",
  },
  {
    id: "R-POOL-BAND",
    scopes: ["RULES"],
    kind: "REFUSE",
    fields: ["scope.poolTotalMinTzs", "scope.poolTotalMaxTzs"],
    reportOn: "scope.poolTotalMaxTzs",
    messages: ["Pool minimum can't be above pool maximum."],
    source: "PLAN §5",
  },
  {
    id: "N2-b",
    scopes: ["RULES"],
    kind: "REFUSE",
    fields: ["counter.delayMinSec", "counter.delayMaxSec"],
    reportOn: "counter.delayMinSec",
    messages: ["Minimum delay can't be above maximum delay."],
    source: "N2 §5 (a target's own delays use the same rule)",
  },
  {
    id: "R-TRIGGER-RANGE",
    scopes: ["RULES"],
    kind: "REFUSE",
    fields: ["counter.triggerStakeMinTzs", "counter.triggerStakeMaxTzs"],
    reportOn: "counter.triggerStakeMinTzs",
    messages: ["Trigger stake minimum can't be above its maximum."],
    source: "PLAN §5",
  },
  {
    id: "R-OPENER-ORDER",
    scopes: ["RULES"],
    kind: "REFUSE",
    fields: [
      "opener.delayUdMinSec",
      "opener.delayUdMaxSec",
      "opener.delayPollsMinMin",
      "opener.delayPollsMaxMin",
      "opener.stakeMinTzs",
      "opener.stakeMaxTzs",
    ],
    reportOn: "the minimum field of each pair",
    messages: ["Minimum can't be above maximum."],
    source: "PLAN §5",
  },
  {
    id: "R-FILL-LEAD-UD",
    scopes: ["RULES"],
    kind: "REFUSE",
    fields: ["modes.updown.fill", "fill.leadUdSec", "guards.minTimeToCutoffUdSec", "fill.jitterSec"],
    reportOn: "fill.leadUdSec",
    messages: ["FILL lead must be at least min time to cutoff plus jitter ({n} s)."],
    source: "PLAN §5",
  },
  {
    id: "R-FILL-LEAD-POLLS",
    scopes: ["RULES"],
    kind: "REFUSE",
    fields: ["modes.polls.fill", "fill.leadPollsMin", "guards.minTimeToCutoffPollsMin", "fill.jitterSec"],
    reportOn: "fill.leadPollsMin",
    messages: ["FILL lead must be more than min time to cutoff plus jitter."],
    source: "PLAN §5",
  },
  {
    id: "R-SMAX-LE-GPM",
    scopes: ["RULES"],
    kind: "REFUSE",
    fields: ["stakeMaxTzs", "gCapPerMarketTzs"],
    reportOn: "stakeMaxTzs",
    messages: ["Max stake TZS {x} is above the global per-market limit TZS {g}."],
    source: "02 §3.6, 04 C6",
  },
  {
    id: "R-PM-LE-GEXP",
    scopes: ["RULES"],
    kind: "REFUSE",
    fields: ["capPerMarketTzs", "gCapOpenExposureTzs"],
    reportOn: "capPerMarketTzs",
    messages: ["Per-market cap TZS {x} is above the global open exposure limit TZS {g}."],
    source: "PLAN F2",
  },
  {
    id: "N1-a",
    scopes: ["RULES"],
    kind: "REFUSE",
    fields: [
      "enterNow.enabled",
      "enterNow.thinStakeTzs",
      "enterNow.openerStakeTzs",
      "capStaffChosenPerDay",
      "capStaffChosenDailyTzs",
      "scope.products.polls",
      "scope.categories",
    ],
    reportOn: "the first unset field, or the products field",
    messages: [
      "Set {field} to use Enter now.",
      "Enter now is for polls: turn on polls and choose at least one category.",
    ],
    source: "N1 §5",
  },
  {
    id: "N1-b",
    scopes: ["RULES"],
    kind: "REFUSE",
    fields: ["capStaffChosenDailyTzs", "capDailyStakeTzs", "enterNow.thinStakeTzs", "enterNow.openerStakeTzs"],
    reportOn: "capStaffChosenDailyTzs",
    messages: [
      "Staff-chosen daily cap can't exceed the daily stake cap.",
      "Staff-chosen daily cap must be at least the Enter now stakes (TZS {x}).",
    ],
    source: "N1 §5",
  },
  {
    id: "N1-c",
    scopes: ["LIMITS", "RULES"],
    kind: "REFUSE",
    fields: [
      "gCapStaffChosenDailyTzs",
      "gCapDailyStakeTzs",
      "capStaffChosenPerDay",
      "gCapStaffChosenPerDay",
      "capStaffChosenDailyTzs",
      "targetsMaxActive",
      "gTargetsMaxActive",
    ],
    reportOn: "the per-bot field, or gCapStaffChosenDailyTzs",
    messages: [
      "Staff-chosen daily limit can't exceed the global daily stake limit.",
      "Staff-chosen stakes per day {x} is above the global limit {g}.",
      "Per-bot staff-chosen cap TZS {x} is above the global staff-chosen cap TZS {g}.",
      "Max active targets {x} is above the global limit {g}.",
    ],
    source: "N1 §5",
  },
  {
    id: "N1-d",
    scopes: ["RULES"],
    kind: "REFUSE",
    fields: ["capStaffChosenPerDay", "freqMaxPerDay"],
    reportOn: "capStaffChosenPerDay",
    messages: ["Can't exceed bets per day ({n})."],
    source: "N1 §5",
  },
  {
    id: "N1-e",
    scopes: ["RULES"],
    kind: "REFUSE",
    fields: ["enterNow.thinStakeTzs", "enterNow.openerStakeTzs", "stakeMinTzs", "stakeMaxTzs"],
    reportOn: "the stake field",
    messages: ["Enter now stake must be between {label}'s stake min TZS {min} and max TZS {max}."],
    source: "N1 §5 (the live bounds are each field's own bound check)",
  },
  {
    id: "N2-a",
    scopes: ["RULES"],
    kind: "REFUSE",
    fields: [
      "targeting.enabled",
      "scope.products.polls",
      "scope.categories",
      "counter.amount.pct",
      "counter.amount.fixedTzs",
      "counter.triggerStakeMinTzs",
      "counter.triggerStakeMaxTzs",
      "targetsMaxActive",
      "capStaffChosenPerDay",
      "capStaffChosenDailyTzs",
    ],
    reportOn: "the first failing field",
    messages: [
      "Targets use the Counter amount and trigger range — set them.",
      "Set Max active targets to use targets.",
      "Set the staff-chosen limits to use targets.",
      "Targets are for polls: turn on polls and choose at least one category.",
    ],
    source: "N2 §5",
  },
  {
    id: "N2-c",
    scopes: ["RULES"],
    kind: "REFUSE",
    fields: ["targetsMaxActive", "gTargetsMaxActive"],
    reportOn: "targetsMaxActive",
    messages: ["Max active targets {x} is above the global limit {g}."],
    source: "N2 §5",
  },
  {
    id: "X-CLEAR-ACTIVE",
    scopes: ["RULES"],
    kind: "REFUSE",
    fields: ["caps not in CLEAR_EXEMPT"],
    reportOn: "the cleared cap",
    messages: ["{label} is running — pause it before clearing {cap}."],
    source: "04 C1, N1 §5 exemptions",
  },
  {
    id: "L-LOSS-LE-DAY",
    scopes: ["LIMITS"],
    kind: "REFUSE",
    fields: ["gCapDailyLossTzs", "gCapDailyStakeTzs"],
    reportOn: "gCapDailyLossTzs",
    messages: ["Daily loss can't exceed daily stake."],
    source: "02 §3.8",
  },
  {
    id: "L-DAY-GE-MIN",
    scopes: ["LIMITS"],
    kind: "REFUSE",
    fields: ["gMaxBetsPerDay", "gMaxBetsPerMinute"],
    reportOn: "gMaxBetsPerDay",
    messages: ["Bets per day must be at least bets per minute."],
    source: "04 A24 (bets per day added)",
  },
  {
    id: "L-CPP-LE-DAY",
    scopes: ["LIMITS"],
    kind: "REFUSE",
    fields: ["gCounterPerPlayerPerDay", "gMaxBetsPerDay"],
    reportOn: "gCounterPerPlayerPerDay",
    messages: ["Counters per player per day can't exceed bets per day."],
    source: "04 A24",
  },
  {
    id: "L-GPM-VS-BOTS",
    scopes: ["LIMITS"],
    kind: "CONFLICT",
    fields: ["gCapPerMarketTzs", "stakeMaxTzs of every bot"],
    reportOn: "gCapPerMarketTzs",
    messages: ["Per-market limit TZS {g} is below bot “{label}” max stake TZS {x}."],
    source: "02 §3.8, 04 C6",
  },
  {
    id: "L-GEXP-VS-BOTS",
    scopes: ["LIMITS"],
    kind: "CONFLICT",
    fields: ["gCapOpenExposureTzs", "capPerMarketTzs of every bot"],
    reportOn: "gCapOpenExposureTzs",
    messages: ["Open exposure limit TZS {g} is below bot “{label}” per-market cap TZS {x}."],
    source: "PLAN §5, 04 C6",
  },
  {
    id: "L-STAFF-VS-BOTS",
    scopes: ["LIMITS"],
    kind: "CONFLICT",
    fields: ["gCapStaffChosenPerDay", "gCapStaffChosenDailyTzs", "gTargetsMaxActive", "the same caps of every bot"],
    reportOn: "the global field",
    messages: ["{field} {g} is below bot “{label}” {x}."],
    source: "04 C6, N1 §5 direction rule",
  },
  {
    id: "X-CLEAR-ON",
    scopes: ["LIMITS"],
    kind: "REFUSE",
    fields: ["limits not in CLEAR_EXEMPT"],
    reportOn: "the cleared limit",
    messages: ["Can't clear a limit while bots are on. Switch off first."],
    source: "02 §3.8, N1 §5 exemptions",
  },
] as const satisfies readonly CrossFieldRuleShape[];

export type CrossRuleId = (typeof CROSS_FIELD_RULES)[number]["id"];
export type CrossFieldRule = CrossFieldRuleShape & { id: CrossRuleId };

const CROSS_RULE_BY_ID = new Map<string, CrossFieldRuleShape>(CROSS_FIELD_RULES.map((r) => [r.id, r]));

function fillCopy(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{([A-Za-z]+)\}/g, (whole, key: string) => (key in vars ? String(vars[key]) : whole));
}

/** A rule's message with its figures filled in. */
export function ruleCopy(id: CrossRuleId, index = 0, vars: Record<string, string | number> = {}): string {
  const rule = CROSS_RULE_BY_ID.get(id);
  return fillCopy(rule?.messages[index] ?? "", vars);
}

type Hit = { field: string; message: string; href?: string };

const tzs = (n: number) => formatWhole(n);

/** a > b, both set. */
function above(a: number | null | undefined, b: number | null | undefined): boolean {
  return a !== null && a !== undefined && b !== null && b !== undefined && a > b;
}

type RulesEvalInput = {
  num: (id: FieldId) => number | null;
  unset: (id: FieldId) => boolean;
  products: { updown: boolean; polls: boolean };
  modes: { updown: ModeFlags; polls: ModeFlags };
  categories: readonly string[];
  amountKind: "PCT" | "FIXED";
  enterNow: boolean;
  targeting: boolean;
  limits: HouseBotLimits | null;
  label: string;
  prev: { status: string; caps: HouseBotCaps } | undefined;
};

const RULES_SCOPE_IDS = [
  "R-STAKE-ORDER",
  "R-PM-GE-STAKE",
  "R-DAY-GE-PM",
  "R-LOSS-LE-DAY",
  "R-EXP-GE-PM",
  "R-GAP-FLOOR",
  "R-HOUR-FITS-GAP",
  "R-DAY-GE-HOUR",
  "R-POOL-BAND",
  "N2-b",
  "R-TRIGGER-RANGE",
  "R-OPENER-ORDER",
  "R-FILL-LEAD-UD",
  "R-FILL-LEAD-POLLS",
  "R-SMAX-LE-GPM",
  "R-PM-LE-GEXP",
  "N1-a",
  "N1-b",
  "N1-c",
  "N1-d",
  "N1-e",
  "N2-a",
  "N2-c",
  "X-CLEAR-ACTIVE",
] as const satisfies readonly CrossRuleId[];

const RULES_EVAL: Record<(typeof RULES_SCOPE_IDS)[number], (x: RulesEvalInput) => Hit[]> = {
  "R-STAKE-ORDER": (x) =>
    above(x.num("stakeMinTzs"), x.num("stakeMaxTzs")) ? [{ field: "stakeMinTzs", message: ruleCopy("R-STAKE-ORDER") }] : [],
  "R-PM-GE-STAKE": (x) =>
    above(x.num("stakeMaxTzs"), x.num("capPerMarketTzs"))
      ? [{ field: "capPerMarketTzs", message: ruleCopy("R-PM-GE-STAKE") }]
      : [],
  "R-DAY-GE-PM": (x) =>
    above(x.num("capPerMarketTzs"), x.num("capDailyStakeTzs"))
      ? [{ field: "capDailyStakeTzs", message: ruleCopy("R-DAY-GE-PM") }]
      : [],
  "R-LOSS-LE-DAY": (x) =>
    above(x.num("capDailyLossTzs"), x.num("capDailyStakeTzs"))
      ? [{ field: "capDailyLossTzs", message: ruleCopy("R-LOSS-LE-DAY") }]
      : [],
  "R-EXP-GE-PM": (x) =>
    above(x.num("capPerMarketTzs"), x.num("capOpenExposureTzs"))
      ? [{ field: "capOpenExposureTzs", message: ruleCopy("R-EXP-GE-PM") }]
      : [],
  // The floor is the field's own lower bound (`checkNumber`), so a value below it never reaches here.
  "R-GAP-FLOOR": () => [],
  "R-HOUR-FITS-GAP": (x) => {
    const gap = x.num("freqMinGapSec");
    const hour = x.num("freqMaxPerHour");
    if (gap === null || hour === null || gap <= 0) return [];
    const n = Math.min(60, Math.floor(3600 / gap));
    return hour > n
      ? [{ field: "freqMaxPerHour", message: ruleCopy("R-HOUR-FITS-GAP", 0, { gap: formatWhole(gap), n }) }]
      : [];
  },
  "R-DAY-GE-HOUR": (x) =>
    above(x.num("freqMaxPerHour"), x.num("freqMaxPerDay"))
      ? [{ field: "freqMaxPerDay", message: ruleCopy("R-DAY-GE-HOUR") }]
      : [],
  "R-POOL-BAND": (x) =>
    above(x.num("scope.poolTotalMinTzs"), x.num("scope.poolTotalMaxTzs"))
      ? [{ field: "scope.poolTotalMaxTzs", message: ruleCopy("R-POOL-BAND") }]
      : [],
  "N2-b": (x) =>
    above(x.num("counter.delayMinSec"), x.num("counter.delayMaxSec"))
      ? [{ field: "counter.delayMinSec", message: ruleCopy("N2-b") }]
      : [],
  "R-TRIGGER-RANGE": (x) =>
    above(x.num("counter.triggerStakeMinTzs"), x.num("counter.triggerStakeMaxTzs"))
      ? [{ field: "counter.triggerStakeMinTzs", message: ruleCopy("R-TRIGGER-RANGE") }]
      : [],
  "R-OPENER-ORDER": (x) => {
    const pairs: [FieldId, FieldId][] = [
      ["opener.delayUdMinSec", "opener.delayUdMaxSec"],
      ["opener.delayPollsMinMin", "opener.delayPollsMaxMin"],
      ["opener.stakeMinTzs", "opener.stakeMaxTzs"],
    ];
    return pairs
      .filter(([lo, hi]) => above(x.num(lo), x.num(hi)))
      .map(([lo]) => ({ field: lo, message: ruleCopy("R-OPENER-ORDER") }));
  },
  "R-FILL-LEAD-UD": (x) => {
    const lead = x.num("fill.leadUdSec");
    const mtc = x.num("guards.minTimeToCutoffUdSec");
    const jitter = x.num("fill.jitterSec");
    if (!x.modes.updown.fill || lead === null || mtc === null || jitter === null) return [];
    return lead < mtc + jitter
      ? [{ field: "fill.leadUdSec", message: ruleCopy("R-FILL-LEAD-UD", 0, { n: formatWhole(mtc + jitter) }) }]
      : [];
  },
  "R-FILL-LEAD-POLLS": (x) => {
    const lead = x.num("fill.leadPollsMin");
    const mtc = x.num("guards.minTimeToCutoffPollsMin");
    const jitter = x.num("fill.jitterSec");
    if (!x.modes.polls.fill || lead === null || mtc === null || jitter === null) return [];
    return lead * 60 < mtc * 60 + 60 + jitter
      ? [{ field: "fill.leadPollsMin", message: ruleCopy("R-FILL-LEAD-POLLS") }]
      : [];
  },
  "R-SMAX-LE-GPM": (x) => {
    const v = x.num("stakeMaxTzs");
    const g = x.limits?.gCapPerMarketTzs ?? null;
    return above(v, g)
      ? [
          {
            field: "stakeMaxTzs",
            message: ruleCopy("R-SMAX-LE-GPM", 0, { x: tzs(v as number), g: tzs(g as number) }),
            href: LIMITS_TAB_HREF,
          },
        ]
      : [];
  },
  "R-PM-LE-GEXP": (x) => {
    const v = x.num("capPerMarketTzs");
    const g = x.limits?.gCapOpenExposureTzs ?? null;
    return above(v, g)
      ? [
          {
            field: "capPerMarketTzs",
            message: ruleCopy("R-PM-LE-GEXP", 0, { x: tzs(v as number), g: tzs(g as number) }),
            href: LIMITS_TAB_HREF,
          },
        ]
      : [];
  },
  "N1-a": (x) => {
    if (!x.enterNow) return [];
    const needed: FieldId[] = ["enterNow.thinStakeTzs", "enterNow.openerStakeTzs", "capStaffChosenPerDay", "capStaffChosenDailyTzs"];
    const missing = needed.find((id) => x.unset(id));
    if (missing) return [{ field: missing, message: ruleCopy("N1-a", 0, { field: FIELD_META[missing].label }) }];
    if (!x.products.polls || x.categories.length === 0) {
      return [{ field: "scope.products.polls", message: ruleCopy("N1-a", 1) }];
    }
    return [];
  },
  "N1-b": (x) => {
    const cap = x.num("capStaffChosenDailyTzs");
    if (above(cap, x.num("capDailyStakeTzs"))) return [{ field: "capStaffChosenDailyTzs", message: ruleCopy("N1-b", 0) }];
    if (!x.enterNow || cap === null) return [];
    const stakes = [x.num("enterNow.thinStakeTzs"), x.num("enterNow.openerStakeTzs")].filter((v): v is number => v !== null);
    if (stakes.length === 0) return [];
    const most = Math.max(...stakes);
    return cap < most ? [{ field: "capStaffChosenDailyTzs", message: ruleCopy("N1-b", 1, { x: tzs(most) }) }] : [];
  },
  "N1-c": (x) => {
    const l = x.limits;
    if (!l) return [];
    const hits: Hit[] = [];
    const perDay = x.num("capStaffChosenPerDay");
    if (above(perDay, l.gCapStaffChosenPerDay)) {
      hits.push({
        field: "capStaffChosenPerDay",
        message: ruleCopy("N1-c", 1, { x: formatWhole(perDay as number), g: formatWhole(l.gCapStaffChosenPerDay as number) }),
      });
    }
    const daily = x.num("capStaffChosenDailyTzs");
    if (above(daily, l.gCapStaffChosenDailyTzs)) {
      hits.push({
        field: "capStaffChosenDailyTzs",
        message: ruleCopy("N1-c", 2, { x: tzs(daily as number), g: tzs(l.gCapStaffChosenDailyTzs as number) }),
      });
    }
    const targets = x.num("targetsMaxActive");
    if (above(targets, l.gTargetsMaxActive)) {
      hits.push({
        field: "targetsMaxActive",
        message: ruleCopy("N1-c", 3, { x: formatWhole(targets as number), g: formatWhole(l.gTargetsMaxActive as number) }),
      });
    }
    return hits;
  },
  "N1-d": (x) => {
    const perDay = x.num("freqMaxPerDay");
    return above(x.num("capStaffChosenPerDay"), perDay)
      ? [{ field: "capStaffChosenPerDay", message: ruleCopy("N1-d", 0, { n: formatWhole(perDay as number) }) }]
      : [];
  },
  "N1-e": (x) => {
    const min = x.num("stakeMinTzs");
    const max = x.num("stakeMaxTzs");
    if (min === null || max === null) return [];
    const fields: FieldId[] = ["enterNow.thinStakeTzs", "enterNow.openerStakeTzs"];
    return fields
      .filter((id) => {
        const v = x.num(id);
        return v !== null && (v < min || v > max);
      })
      .map((id) => ({ field: id, message: ruleCopy("N1-e", 0, { label: x.label, min: tzs(min), max: tzs(max) }) }));
  },
  "N2-a": (x) => {
    if (!x.targeting) return [];
    if (!x.products.polls || x.categories.length === 0) {
      return [{ field: "scope.products.polls", message: ruleCopy("N2-a", 3) }];
    }
    const counterFields: FieldId[] = [
      x.amountKind === "PCT" ? "counter.amount.pct" : "counter.amount.fixedTzs",
      "counter.triggerStakeMinTzs",
      "counter.triggerStakeMaxTzs",
    ];
    const badCounter = counterFields.find((id) => x.num(id) === null);
    if (badCounter) return [{ field: badCounter, message: ruleCopy("N2-a", 0) }];
    if (x.unset("targetsMaxActive")) return [{ field: "targetsMaxActive", message: ruleCopy("N2-a", 1) }];
    const staff = (["capStaffChosenPerDay", "capStaffChosenDailyTzs"] as FieldId[]).find((id) => x.unset(id));
    if (staff) return [{ field: staff, message: ruleCopy("N2-a", 2) }];
    return [];
  },
  "N2-c": (x) => {
    const v = x.num("targetsMaxActive");
    const g = x.limits?.gTargetsMaxActive ?? null;
    return above(v, g)
      ? [{ field: "targetsMaxActive", message: ruleCopy("N2-c", 0, { x: formatWhole(v as number), g: formatWhole(g as number) }) }]
      : [];
  },
  "X-CLEAR-ACTIVE": (x) => {
    const prev = x.prev;
    if (!prev || prev.status !== "ACTIVE") return [];
    const prevCaps = prev.caps;
    return CAP_FIELDS.filter((k) => !isClearExempt(k) && prevCaps[k] !== null && x.unset(k)).map((k) => ({
      field: k,
      message: ruleCopy("X-CLEAR-ACTIVE", 0, { label: x.label, cap: FIELD_META[k].label }),
    }));
  },
};

type LimitsEvalInput = {
  num: (id: FieldId) => number | null;
  unset: (id: FieldId) => boolean;
  prev: { masterOn: boolean; limits: HouseBotLimits } | undefined;
};

const LIMITS_SCOPE_IDS = ["L-LOSS-LE-DAY", "N1-c", "L-DAY-GE-MIN", "L-CPP-LE-DAY", "X-CLEAR-ON"] as const satisfies readonly CrossRuleId[];

const LIMITS_EVAL: Record<(typeof LIMITS_SCOPE_IDS)[number], (x: LimitsEvalInput) => Hit[]> = {
  "L-LOSS-LE-DAY": (x) =>
    above(x.num("gCapDailyLossTzs"), x.num("gCapDailyStakeTzs"))
      ? [{ field: "gCapDailyLossTzs", message: ruleCopy("L-LOSS-LE-DAY") }]
      : [],
  "N1-c": (x) =>
    above(x.num("gCapStaffChosenDailyTzs"), x.num("gCapDailyStakeTzs"))
      ? [{ field: "gCapStaffChosenDailyTzs", message: ruleCopy("N1-c", 0) }]
      : [],
  "L-DAY-GE-MIN": (x) =>
    above(x.num("gMaxBetsPerMinute"), x.num("gMaxBetsPerDay"))
      ? [{ field: "gMaxBetsPerDay", message: ruleCopy("L-DAY-GE-MIN") }]
      : [],
  "L-CPP-LE-DAY": (x) =>
    above(x.num("gCounterPerPlayerPerDay"), x.num("gMaxBetsPerDay"))
      ? [{ field: "gCounterPerPlayerPerDay", message: ruleCopy("L-CPP-LE-DAY") }]
      : [],
  "X-CLEAR-ON": (x) => {
    const prev = x.prev;
    if (!prev || !prev.masterOn) return [];
    const prevLimits = prev.limits;
    return NULLABLE_LIMIT_FIELDS.filter((k) => !isClearExempt(k) && prevLimits[k] !== null && x.unset(k)).map((k) => ({
      field: k,
      message: ruleCopy("X-CLEAR-ON"),
    }));
  },
};

/** A bot a lowered global limit now sits below — shown in the consequence preview, never refused. */
export type HouseLimitConflict = {
  botId: string;
  label: string;
  status: RulesBot["status"];
  field: LimitField;
  value: number;
  rule: CrossRuleId;
  message: string;
};

function limitConflicts(num: (id: FieldId) => number | null, bots: readonly RulesBot[]): HouseLimitConflict[] {
  const out: HouseLimitConflict[] = [];
  const shown = (id: FieldId, v: number) => (FIELD_META[id].unit === "TZS" ? `TZS ${tzs(v)}` : formatWhole(v));
  const gpm = num("gCapPerMarketTzs");
  const gexp = num("gCapOpenExposureTzs");
  const staffPairs: [LimitField, CapField][] = [
    ["gCapStaffChosenPerDay", "capStaffChosenPerDay"],
    ["gCapStaffChosenDailyTzs", "capStaffChosenDailyTzs"],
    ["gTargetsMaxActive", "targetsMaxActive"],
  ];
  for (const bot of bots) {
    const base = { botId: bot.botId, label: bot.label, status: bot.status };
    const stakeMax = bot.caps.stakeMaxTzs;
    if (above(stakeMax, gpm)) {
      out.push({
        ...base,
        field: "gCapPerMarketTzs",
        value: stakeMax as number,
        rule: "L-GPM-VS-BOTS",
        message: ruleCopy("L-GPM-VS-BOTS", 0, { g: tzs(gpm as number), label: bot.label, x: tzs(stakeMax as number) }),
      });
    }
    const perMarket = bot.caps.capPerMarketTzs;
    if (above(perMarket, gexp)) {
      out.push({
        ...base,
        field: "gCapOpenExposureTzs",
        value: perMarket as number,
        rule: "L-GEXP-VS-BOTS",
        message: ruleCopy("L-GEXP-VS-BOTS", 0, { g: tzs(gexp as number), label: bot.label, x: tzs(perMarket as number) }),
      });
    }
    for (const [globalField, botField] of staffPairs) {
      const g = num(globalField);
      const v = bot.caps[botField];
      if (!above(v, g)) continue;
      out.push({
        ...base,
        field: globalField,
        value: v as number,
        rule: "L-STAFF-VS-BOTS",
        message: ruleCopy("L-STAFF-VS-BOTS", 0, {
          field: FIELD_META[globalField].label,
          g: shown(globalField, g as number),
          label: bot.label,
          x: shown(botField, v as number),
        }),
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Preview and consequence copy
// ---------------------------------------------------------------------------

/** Lowering max designated bots below the roster (04 C10). Preview only; nothing is paused. */
export const MAX_BOTS_LOWERING_PREVIEW = (designated: number, limit: number): string =>
  `${designated} bots are designated. With a limit of ${limit}, no account can be designated until ${designated - limit} are removed. No bot is paused.`;

/** Lowering the global max active targets (N2 §5). Preview only; nothing is ended. */
export const TARGETS_LOWERING_PREVIEW = (active: number, limit: number): string =>
  `${active} targets are active. With a limit of ${limit}, no target can be added until ${active - limit} are removed. No target is ended.`;

/**
 * What clearing an exempt field does (N1 §5). `queued` counts PENDING and CLAIMED rows where
 * `kind='MANUAL' OR "targetId" IS NOT NULL`, for that bot or for all bots.
 */
export const CLEAR_PREVIEW_COPY = {
  globalStaffChosen: (queued: number) =>
    `Enter now and targets will be off for every bot. ${queued} queued staff-chosen stakes will be skipped.`,
  botStaffChosen: (label: string, queued: number) =>
    `Enter now and targets will be off for ${label}. ${queued} queued staff-chosen stakes will be skipped.`,
  counterpartyShare: (queued: number) =>
    `Enter now will be off for every bot. ${queued} queued Enter now stakes will be skipped.`,
  targetsMax: (active: number) =>
    `No target can be added until this is set. ${active} active targets keep reacting — clear a staff-chosen limit to stop them betting.`,
} as const;

/** "Use recommended values" — the form's confirmation (02 §3.6). */
export const RECOMMENDED_FILLED_COPY = "Recommended values filled — review, then Save.";

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

export type RulesInput = {
  /** The rules as the form holds them: numbers may still be the raw typed strings. */
  rules: unknown;
  caps: Record<CapField, unknown>;
  /** The bot's label, for messages that name it. */
  label?: string;
  /** The typed `HH:MM` of each schedule row, so a half-typed time is an error (04 C15). */
  scheduleRawTimes?: readonly { start: string; end: string }[];
};

function dedupe<T>(values: readonly T[]): T[] {
  return Array.from(new Set(values));
}

function chainFitWarnings(r: HouseBotRulesV1, ctx: Pick<RulesContext, "chains">): RulesWarning[] {
  const out: RulesWarning[] = [];
  for (const chain of ctx.chains) {
    if (!r.scope.chains.includes(chain.key)) continue;
    if (r.modes.updown.opener && r.opener.delayUdMaxSec > chain.durationMinutes * 20) {
      out.push({
        field: "opener.delayUdMaxSec",
        message: `OPENER delay ${formatWhole(r.opener.delayUdMaxSec)} s doesn't fit ${chain.label} — those rounds are skipped.`,
      });
    }
    if (r.modes.updown.fill && r.fill.leadUdSec > chain.durationMinutes * 60 - UD_ROUND_OPEN_LAG_SEC - UD_FILL_TAIL_SEC) {
      out.push({
        field: "fill.leadUdSec",
        message: `FILL lead ${formatWhole(r.fill.leadUdSec)} s doesn't fit ${chain.label} — those rounds are skipped.`,
      });
    }
  }
  return out;
}

/**
 * The rules form's save: every field, every cross-field rule, the clear rule for a running bot.
 *
 * Returns the parsed rules and caps only when nothing is refused. Errors come back in page order,
 * one per field. Warnings (a delay that doesn't fit one chain) never block the save.
 */
export function validateHouseBotRules(
  input: RulesInput,
  ctx: RulesContext,
  prev?: { status: string; caps: HouseBotCaps; label?: string },
):
  | { ok: true; rules: HouseBotRulesV1; caps: HouseBotCaps; warnings: RulesWarning[] }
  | { ok: false; errors: FieldError[]; warnings: RulesWarning[] } {
  if (!isPlainObject(input.rules)) {
    return {
      ok: false,
      errors: [{ field: "rules", code: "INVALID", message: "These rules could not be read. Reload the page, then save again." }],
      warnings: [],
    };
  }
  const raw = input.rules;
  const errors: FieldError[] = [];

  const flag = (path: FieldId): boolean => {
    const v = getPath(raw, path);
    if (v === undefined || typeof v === "boolean") return v === true;
    errors.push({ field: path, code: "INVALID", message: CHOOSE_OPTION_COPY });
    return false;
  };
  const products = { updown: flag("scope.products.updown"), polls: flag("scope.products.polls") };
  const modes = {
    updown: { counter: flag("modes.updown.counter"), fill: flag("modes.updown.fill"), opener: flag("modes.updown.opener") },
    polls: { counter: flag("modes.polls.counter"), fill: flag("modes.polls.fill"), opener: flag("modes.polls.opener") },
  };
  const enterNow = flag("enterNow.enabled");
  const targeting = flag("targeting.enabled");

  const pickList = <T extends string>(path: FieldId, allowed: readonly T[]): T[] => {
    const v = getPath(raw, path);
    if (v === undefined) return [];
    if (!Array.isArray(v) || v.some((item) => typeof item !== "string" || !(allowed as readonly string[]).includes(item))) {
      errors.push({ field: path, code: "INVALID", message: CHOOSE_FROM_LIST_COPY });
      return [];
    }
    return dedupe(v as T[]);
  };
  const chains = pickList<ChainKey>("scope.chains", ctx.chains.map((c) => c.key));
  const categories = pickList<MarketCategory>("scope.categories", ctx.categories);

  const kindRaw = getPath(raw, "counter.amount.kind");
  let amountKind: "PCT" | "FIXED" = "PCT";
  if (kindRaw === "PCT" || kindRaw === "FIXED") amountKind = kindRaw;
  else if (kindRaw !== undefined) errors.push({ field: "counter.amount.kind", code: "INVALID", message: CHOOSE_OPTION_COPY });

  const values = new Map<FieldId, number | null>();
  const unset = new Set<FieldId>();
  const read = (id: FieldId, rawValue: unknown) => {
    if (toWhole(rawValue).kind === "UNSET") unset.add(id);
    const checked = checkNumber(id, rawValue, ctx);
    if (checked.error) errors.push(checked.error);
    values.set(id, checked.value);
  };
  for (const id of RULE_NUMBER_FIELDS) {
    if (id === "counter.amount.pct" && amountKind !== "PCT") continue;
    if (id === "counter.amount.fixedTzs" && amountKind !== "FIXED") continue;
    read(id, getPath(raw, id));
  }
  for (const id of CAP_FIELD_IDS) read(id, input.caps[id as CapField]);

  const schedule = expandWindows(isPlainObject(raw.schedule) ? raw.schedule : {}, input.scheduleRawTimes);
  errors.push(...schedule.errors);

  const x: RulesEvalInput = {
    num: (id) => values.get(id) ?? null,
    unset: (id) => unset.has(id),
    products,
    modes,
    categories,
    amountKind,
    enterNow,
    targeting,
    limits: ctx.limits,
    label: input.label ?? prev?.label ?? DEFAULT_BOT_LABEL,
    prev,
  };
  for (const id of RULES_SCOPE_IDS) {
    for (const hit of RULES_EVAL[id](x)) {
      if (errors.some((e) => e.field === hit.field)) continue;
      errors.push({ field: hit.field, code: "CROSS", message: hit.message, href: hit.href, rule: id });
    }
  }

  if (errors.length > 0) return { ok: false, errors: sortFieldErrors(errors), warnings: [] };

  const n = (id: FieldId): number => values.get(id) as number;
  const rules: HouseBotRulesV1 = {
    schemaVersion: 1,
    scope: {
      products,
      chains,
      categories,
      skipPollsClosingWithinMin: n("scope.skipPollsClosingWithinMin"),
      poolTotalMinTzs: n("scope.poolTotalMinTzs"),
      poolTotalMaxTzs: values.get("scope.poolTotalMaxTzs") ?? null,
    },
    modes,
    counter: {
      delayMinSec: n("counter.delayMinSec"),
      delayMaxSec: n("counter.delayMaxSec"),
      reactProbabilityPct: n("counter.reactProbabilityPct"),
      triggerStakeMinTzs: n("counter.triggerStakeMinTzs"),
      triggerStakeMaxTzs: n("counter.triggerStakeMaxTzs"),
      amount:
        amountKind === "PCT"
          ? { kind: "PCT", pct: n("counter.amount.pct") }
          : { kind: "FIXED", fixedTzs: n("counter.amount.fixedTzs") },
    },
    fill: {
      leadUdSec: n("fill.leadUdSec"),
      leadPollsMin: n("fill.leadPollsMin"),
      targetThinSharePct: n("fill.targetThinSharePct"),
      jitterSec: n("fill.jitterSec"),
    },
    opener: {
      delayUdMinSec: n("opener.delayUdMinSec"),
      delayUdMaxSec: n("opener.delayUdMaxSec"),
      delayPollsMinMin: n("opener.delayPollsMinMin"),
      delayPollsMaxMin: n("opener.delayPollsMaxMin"),
      stakeMinTzs: n("opener.stakeMinTzs"),
      stakeMaxTzs: n("opener.stakeMaxTzs"),
    },
    updown: { closenessPct: n("updown.closenessPct") },
    shaping: { roundToTzs: n("shaping.roundToTzs") as RoundToTzs, jitterPct: n("shaping.jitterPct") },
    guards: {
      noReactZoneUdSec: n("guards.noReactZoneUdSec"),
      noReactZonePollsMin: n("guards.noReactZonePollsMin"),
      minTimeToCutoffUdSec: n("guards.minTimeToCutoffUdSec"),
      minTimeToCutoffPollsMin: n("guards.minTimeToCutoffPollsMin"),
    },
    schedule: { days: schedule.days, allDay: schedule.allDay, windows: schedule.windows },
    enterNow: {
      enabled: enterNow,
      thinStakeTzs: values.get("enterNow.thinStakeTzs") ?? null,
      openerStakeTzs: values.get("enterNow.openerStakeTzs") ?? null,
    },
    targeting: { enabled: targeting },
  };
  const caps = {} as HouseBotCaps;
  for (const k of CAP_FIELDS) caps[k] = values.get(k) ?? null;
  return { ok: true, rules, caps, warnings: chainFitWarnings(rules, ctx) };
}

/**
 * The limits form's save. CONFLICT rules never refuse: they list the bots a lowered limit now sits
 * below, for the consequence preview (04 C6). `previews` carries the roster-lowering line (04 C10).
 */
export function validateHouseBotLimits(
  input: Record<LimitField, unknown>,
  ctx: RulesContext,
  prev?: { masterOn: boolean; limits: HouseBotLimits },
):
  | { ok: true; limits: HouseBotLimits; conflicts: HouseLimitConflict[]; previews: string[] }
  | { ok: false; errors: FieldError[] } {
  const errors: FieldError[] = [];
  const values = new Map<FieldId, number | null>();
  const unset = new Set<FieldId>();
  for (const id of LIMIT_FIELD_IDS) {
    const rawValue = input[id as LimitField];
    if (toWhole(rawValue).kind === "UNSET") unset.add(id);
    const checked = checkNumber(id, rawValue, ctx);
    if (checked.error) errors.push(checked.error);
    values.set(id, checked.value);
  }
  const x: LimitsEvalInput = { num: (id) => values.get(id) ?? null, unset: (id) => unset.has(id), prev };
  for (const id of LIMITS_SCOPE_IDS) {
    for (const hit of LIMITS_EVAL[id](x)) {
      if (errors.some((e) => e.field === hit.field)) continue;
      errors.push({ field: hit.field, code: "CROSS", message: hit.message, href: hit.href, rule: id });
    }
  }
  if (errors.length > 0) return { ok: false, errors: sortFieldErrors(errors) };

  const out = {} as Record<LimitField, number | null>;
  for (const k of LIMIT_FIELDS) out[k] = values.get(k) ?? null;
  const limits: HouseBotLimits = {
    ...out,
    maxDesignatedBots: out.maxDesignatedBots as number,
    bellAlertsPerHour: out.bellAlertsPerHour as number,
  };
  const previews: string[] = [];
  if (limits.maxDesignatedBots < ctx.bots.length) {
    previews.push(MAX_BOTS_LOWERING_PREVIEW(ctx.bots.length, limits.maxDesignatedBots));
  }
  return { ok: true, limits, conflicts: limitConflicts(x.num, ctx.bots), previews };
}

// ---------------------------------------------------------------------------
// Target fields (N2 §5)
// ---------------------------------------------------------------------------

export const TARGET_DELAY_MIN_SEC = 5;
export const TARGET_DELAY_MAX_SEC = 600;
export const TARGET_DELAY_BOUNDS_COPY = "Between 5 and 600 seconds.";
export const TARGET_DELAY_HINT = "Use the same number twice for an exact delay. A range makes the bot harder to spot.";

/** The add modal's prefill (W14). Never a saved default. */
export const TARGET_ADD_PREFILL: TargetTimingInput = { delayMinSec: 10, delayMaxSec: 10, timingFrom: "STAKE", reactTo: "FIRST" };

export const TIMING_FROM_LEGEND = "Counted from";
export const TIMING_FROM_COPY: Record<TimingFrom, string> = {
  STAKE: "The player's stake",
  EXIT_CLOSE: "When the player's free exit closes",
};

export const REACT_TO_LEGEND = "Reacts to";
export const REACT_TO_COPY = (label: string): Record<ReactTo, string> => ({
  FIRST: "First stake only (until one reaction is placed)",
  EVERY: `Every stake (up to ${label}'s per-market limits)`,
});

/** A target's timing fields: whole seconds 5–600, minimum ≤ maximum (equal allowed), two choices. */
export function validateTargetInput(
  raw: Record<keyof TargetTimingInput, unknown>,
): { ok: true; value: TargetTimingInput } | { ok: false; errors: FieldError[] } {
  const errors: FieldError[] = [];
  const delay = (field: "delayMinSec" | "delayMaxSec"): number | null => {
    const parsed = toWhole(raw[field]);
    if (parsed.kind === "UNSET") {
      errors.push({ field, code: "UNSET", message: REQUIRED_NUMBER_COPY });
      return null;
    }
    if (parsed.kind !== "OK") {
      errors.push({ field, code: parsed.kind, message: PARSE_COPY[parsed.kind] });
      return null;
    }
    if (parsed.value < TARGET_DELAY_MIN_SEC || parsed.value > TARGET_DELAY_MAX_SEC) {
      errors.push({
        field,
        code: parsed.value < TARGET_DELAY_MIN_SEC ? "BELOW_MIN" : "ABOVE_MAX",
        message: TARGET_DELAY_BOUNDS_COPY,
      });
      return null;
    }
    return parsed.value;
  };
  const delayMinSec = delay("delayMinSec");
  const delayMaxSec = delay("delayMaxSec");
  if (above(delayMinSec, delayMaxSec)) {
    errors.push({ field: "delayMinSec", code: "CROSS", message: ruleCopy("N2-b"), rule: "N2-b" });
  }
  if (!isTimingFrom(raw.timingFrom)) errors.push({ field: "timingFrom", code: "INVALID", message: CHOOSE_OPTION_COPY });
  if (!isReactTo(raw.reactTo)) errors.push({ field: "reactTo", code: "INVALID", message: CHOOSE_OPTION_COPY });
  if (errors.length > 0 || delayMinSec === null || delayMaxSec === null) return { ok: false, errors };
  return {
    ok: true,
    value: { delayMinSec, delayMaxSec, timingFrom: raw.timingFrom as TimingFrom, reactTo: raw.reactTo as ReactTo },
  };
}

// ---------------------------------------------------------------------------
// Start (02 §3.3 items 4–6, 04 C14, N1 §5)
// ---------------------------------------------------------------------------

export const START_COPY = {
  noProduct: "Choose at least one product.",
  noMode: "Turn on at least one entry mode.",
  allImpossible: "Every enabled mode is currently impossible.",
} as const;

/**
 * The Start dialog's line when no automatic mode is on (N1 §5), or null when one is — or when
 * neither Enter now nor targets are on either, which Start refuses anyway.
 */
export const NO_AUTOMATIC_MODE_LINE = (label: string, on: { enterNow: boolean; targets: boolean }): string | null => {
  if (on.enterNow && on.targets) return `${label} has no automatic mode: it bets only when you press Enter now or a target reacts.`;
  if (on.enterNow) return `${label} has no automatic mode: it bets only when you press Enter now.`;
  if (on.targets) return `${label} has no automatic mode: it bets only when a target reacts.`;
  return null;
};

/**
 * What the saved rules and caps alone refuse at Start, in 02 §3.3's order, plus the warnings the
 * dialog shows. The service adds the refusals that need reads (removed, eligibility, fingerprint,
 * today's loss, the holder's own limit).
 *
 * ⚠️ The unset-cap refusal never names a staff-chosen cap or the target maximum (N1 §5): N1-a and
 * N2-a already require them at save while Enter now or targets are on.
 */
export function rulesStartProblems(
  r: HouseBotRulesV1,
  caps: HouseBotCaps,
  ctx: RulesContext,
  opts: { botId?: string; label?: string } = {},
): { refusals: FieldError[]; warnings: string[] } {
  const refusals: FieldError[] = [];
  const label = opts.label ?? DEFAULT_BOT_LABEL;
  const rulesHref = opts.botId ? `/admin/house-bots/${opts.botId}?tab=rules` : undefined;

  for (const cap of REQUIRED_FOR_START) {
    if (caps[cap] === null) {
      refusals.push({ field: cap, code: "UNSET", message: `Set ${FIELD_META[cap].label} before starting.`, href: rulesHref });
    }
  }
  if (!r.scope.products.updown && !r.scope.products.polls) {
    refusals.push({ field: "scope.products", code: "INVALID", message: START_COPY.noProduct, href: rulesHref });
  }
  if (!hasAnyEntryMode(r)) {
    refusals.push({ field: "modes", code: "INVALID", message: START_COPY.noMode, href: rulesHref });
  }

  // A saved value that a live bound now breaks (04 C14, F5; N1 §5 extends it to Enter now).
  const liveMin = ctx.stakeBounds.minTzs;
  const liveMax = ctx.stakeBounds.maxTzs;
  const minNow = `Can't start: the platform minimum stake is now TZS ${tzs(liveMin)}`;
  if (caps.stakeMinTzs !== null && caps.stakeMinTzs < liveMin) {
    refusals.push({ field: "stakeMinTzs", code: "BELOW_MIN", message: `${minNow}; Stake min is TZS ${tzs(caps.stakeMinTzs)}.` });
  } else if (caps.stakeMinTzs !== null && caps.stakeMinTzs > liveMax) {
    refusals.push({
      field: "stakeMinTzs",
      code: "ABOVE_MAX",
      message: `Can't start: the platform maximum stake is now TZS ${tzs(liveMax)}; Stake min is TZS ${tzs(caps.stakeMinTzs)}.`,
    });
  }
  const floor = minGapFloorSec(ctx.betPlaceRefillPerMin);
  if (caps.freqMinGapSec !== null && caps.freqMinGapSec < floor) {
    refusals.push({
      field: "freqMinGapSec",
      code: "BELOW_MIN",
      message: `Can't start: the min gap must now be at least ${formatWhole(floor)} seconds; Min gap is ${formatWhole(caps.freqMinGapSec)} seconds.`,
    });
  }
  if (r.enterNow.enabled) {
    const belowLive: [FieldId, number | null, string][] = [
      ["enterNow.thinStakeTzs", r.enterNow.thinStakeTzs, "the Enter now thin stake"],
      ["enterNow.openerStakeTzs", r.enterNow.openerStakeTzs, "the Enter now opener stake"],
      ["capStaffChosenDailyTzs", caps.capStaffChosenDailyTzs, "the staff-chosen daily cap"],
    ];
    for (const [field, value, name] of belowLive) {
      if (value !== null && value < liveMin) {
        refusals.push({ field, code: "BELOW_MIN", message: `${minNow}; ${name} is TZS ${tzs(value)}.` });
      }
    }
  }

  const warnings: string[] = [];
  if (!hasAnyAutomaticMode(r)) {
    const line = NO_AUTOMATIC_MODE_LINE(label, { enterNow: r.enterNow.enabled, targets: r.targeting.enabled });
    if (line) warnings.push(line);
  }
  const timing = effectiveTiming(r, ctx);
  const counterEntries: ("never" | CounterTiming)[] = [];
  if (r.modes.polls.counter) counterEntries.push(timing.counter.polls);
  if (r.modes.updown.counter) {
    for (const chain of ctx.chains) {
      const entry = timing.counter.updown[chain.key];
      if (r.scope.chains.includes(chain.key) && entry) counterEntries.push(entry);
    }
  }
  const otherEntry =
    r.modes.updown.fill || r.modes.updown.opener || r.modes.polls.fill || r.modes.polls.opener || r.enterNow.enabled || r.targeting.enabled;
  if (counterEntries.length > 0 && !otherEntry && counterEntries.every((e) => e === "never")) {
    warnings.push(START_COPY.allImpossible);
  }
  return { refusals, warnings };
}

// ---------------------------------------------------------------------------
// Stored rules — parse and migrate (04 C14, F4)
// ---------------------------------------------------------------------------

/** What parse needs from the context. Live stake bounds are optional: parse never checks them. */
export type ParseContext = Pick<RulesContext, "chains" | "categories" | "durations"> &
  Partial<Pick<RulesContext, "stakeBounds">>;

/** A scope value the platform no longer has, dropped and flagged — never widened into something else. */
export type RulesStale = { path: "scope.chains" | "scope.categories"; value: string; message: string };

export const RULES_STALE_COPY = (label: string): string => `Rules mention ${label}, which no longer exists — review and save.`;

type ModeState = { modes: { updown: ModeFlags; polls: ModeFlags }; enterNow: boolean; targeting: boolean };

const anyOn = (m: ModeFlags) => m.counter || m.fill || m.opener;
const anyCounter = (s: ModeState) => s.modes.updown.counter || s.modes.polls.counter;
const anyFill = (s: ModeState) => s.modes.updown.fill || s.modes.polls.fill;
const anyOpener = (s: ModeState) => s.modes.updown.opener || s.modes.polls.opener;
const anyAutomatic = (s: ModeState) => anyOn(s.modes.updown) || anyOn(s.modes.polls);

/**
 * Which enabled modes read each numeric leaf. A leaf that no enabled mode reads may be missing from a
 * stored JSON and is filled from `DEFAULT_RULES_V1`; one an enabled mode reads is RULES_INVALID
 * naming it. Targets read the counter amount, the trigger range, the shaping and the polls guards
 * (N2 §4); Enter now reads the polls min time to cutoff (N1 §5).
 */
const LEAF_USED_BY: Partial<Record<FieldId, (s: ModeState) => boolean>> = {
  "scope.skipPollsClosingWithinMin": (s) => anyOn(s.modes.polls),
  "scope.poolTotalMinTzs": anyAutomatic,
  "counter.delayMinSec": anyCounter,
  "counter.delayMaxSec": anyCounter,
  "counter.reactProbabilityPct": anyCounter,
  "counter.triggerStakeMinTzs": (s) => anyCounter(s) || s.targeting,
  "counter.triggerStakeMaxTzs": (s) => anyCounter(s) || s.targeting,
  "counter.amount.pct": (s) => anyCounter(s) || s.targeting,
  "counter.amount.fixedTzs": () => true,
  "fill.leadUdSec": (s) => s.modes.updown.fill,
  "fill.leadPollsMin": (s) => s.modes.polls.fill,
  "fill.targetThinSharePct": anyFill,
  "fill.jitterSec": anyFill,
  "opener.delayUdMinSec": (s) => s.modes.updown.opener,
  "opener.delayUdMaxSec": (s) => s.modes.updown.opener,
  "opener.delayPollsMinMin": (s) => s.modes.polls.opener,
  "opener.delayPollsMaxMin": (s) => s.modes.polls.opener,
  "opener.stakeMinTzs": anyOpener,
  "opener.stakeMaxTzs": anyOpener,
  "updown.closenessPct": (s) => anyOn(s.modes.updown),
  "shaping.roundToTzs": (s) => anyAutomatic(s) || s.targeting,
  "shaping.jitterPct": (s) => anyAutomatic(s) || s.targeting,
  "guards.noReactZoneUdSec": (s) => s.modes.updown.counter,
  "guards.noReactZonePollsMin": (s) => s.modes.polls.counter || s.targeting,
  "guards.minTimeToCutoffUdSec": (s) => anyOn(s.modes.updown),
  "guards.minTimeToCutoffPollsMin": (s) => anyOn(s.modes.polls) || s.enterNow || s.targeting,
};

class InvalidStoredRules {
  constructor(readonly field: string) {}
}

function invalidAt(field: string): never {
  throw new InvalidStoredRules(field);
}

function chainKeyLabel(key: string): string {
  const m = /^(.+):(\d+)$/.exec(key);
  return m ? `${m[1]} ${m[2]}-min` : key;
}

function readStoredRulesV1(
  obj: Record<string, unknown>,
  ctx: ParseContext,
): { ok: true; rules: HouseBotRulesV1; stale: RulesStale[] } | { ok: false; code: "RULES_INVALID"; field: string } {
  try {
    const bool = (path: string): boolean => {
      const v = getPath(obj, path);
      if (v === undefined || v === null) return false;
      if (typeof v !== "boolean") invalidAt(path);
      return v as boolean;
    };
    const modes = {
      updown: { counter: bool("modes.updown.counter"), fill: bool("modes.updown.fill"), opener: bool("modes.updown.opener") },
      polls: { counter: bool("modes.polls.counter"), fill: bool("modes.polls.fill"), opener: bool("modes.polls.opener") },
    };
    const enterNowEnabled = bool("enterNow.enabled");
    const targetingEnabled = bool("targeting.enabled");
    const state: ModeState = { modes, enterNow: enterNowEnabled, targeting: targetingEnabled };

    const strings = (path: string): string[] => {
      const v = getPath(obj, path);
      if (v === undefined || v === null) return [];
      if (!Array.isArray(v) || v.some((s) => typeof s !== "string")) invalidAt(path);
      return dedupe(v as string[]);
    };
    const stale: RulesStale[] = [];
    const liveChains = new Set<string>(ctx.chains.filter((c) => ctx.durations.includes(c.durationMinutes)).map((c) => c.key));
    const chains: ChainKey[] = [];
    for (const key of strings("scope.chains")) {
      if (liveChains.has(key)) chains.push(key as ChainKey);
      else stale.push({ path: "scope.chains", value: key, message: RULES_STALE_COPY(chainKeyLabel(key)) });
    }
    const categories: MarketCategory[] = [];
    for (const c of strings("scope.categories")) {
      if ((ctx.categories as readonly string[]).includes(c)) categories.push(c as MarketCategory);
      else stale.push({ path: "scope.categories", value: c, message: RULES_STALE_COPY(c) });
    }

    const defaults = DEFAULT_RULES_V1({ stakeBounds: ctx.stakeBounds ?? { minTzs: FALLBACK_MIN_STAKE_TZS, maxTzs: TZS_RAIL_MAX } });
    const checkStored = (id: FieldId, v: unknown): number => {
      if (typeof v !== "number" || !Number.isSafeInteger(v)) invalidAt(id);
      const n = v as number;
      const b = storedBounds(id, ctx.durations);
      if (b && (n < b.min || n > b.max)) invalidAt(id);
      const options = FIELD_META[id].options;
      if (options && !options.includes(n)) invalidAt(id);
      return n;
    };
    const number = (id: FieldId): number => {
      const v = getPath(obj, id);
      if (v === undefined || v === null) {
        if (LEAF_USED_BY[id]?.(state)) invalidAt(id);
        return getPath(defaults, id) as number;
      }
      return checkStored(id, v);
    };
    const nullable = (id: FieldId): number | null => {
      const v = getPath(obj, id);
      return v === undefined || v === null ? null : checkStored(id, v);
    };

    const amountRaw = getPath(obj, "counter.amount");
    let amount: HouseBotRulesV1["counter"]["amount"];
    if (amountRaw === undefined || amountRaw === null) {
      if (anyCounter(state) || state.targeting) invalidAt("counter.amount");
      amount = defaults.counter.amount;
    } else if (isPlainObject(amountRaw) && amountRaw.kind === "PCT") {
      amount = { kind: "PCT", pct: number("counter.amount.pct") };
    } else if (isPlainObject(amountRaw) && amountRaw.kind === "FIXED") {
      amount = { kind: "FIXED", fixedTzs: number("counter.amount.fixedTzs") };
    } else {
      return invalidAt("counter.amount");
    }

    const daysRaw = getPath(obj, "schedule.days");
    if (daysRaw !== undefined && daysRaw !== null && (!Array.isArray(daysRaw) || daysRaw.some((d) => !isWeekday(d)))) {
      invalidAt("schedule.days");
    }
    const days = Array.isArray(daysRaw) ? WEEKDAYS.filter((d) => (daysRaw as unknown[]).includes(d)) : [];
    const windowsRaw = getPath(obj, "schedule.windows");
    let windows: ScheduleWindow[] = [];
    if (windowsRaw !== undefined && windowsRaw !== null) {
      if (!Array.isArray(windowsRaw) || windowsRaw.length > MAX_SCHEDULE_WINDOWS) invalidAt("schedule.windows");
      windows = (windowsRaw as unknown[]).map((w, i) => {
        const row: Record<string, unknown> = isPlainObject(w) ? w : {};
        const start = row.startMin;
        const end = row.endMin;
        if (!isWholeIn(start, 0, MINUTES_PER_DAY - 1) || !isWholeIn(end, 1, MINUTES_PER_DAY) || start === end % MINUTES_PER_DAY) {
          invalidAt(`schedule.windows.${i}`);
        }
        return { startMin: start as number, endMin: end as number };
      });
    }

    const thin = nullable("enterNow.thinStakeTzs");
    const opener = nullable("enterNow.openerStakeTzs");
    if (enterNowEnabled && thin === null) invalidAt("enterNow.thinStakeTzs");
    if (enterNowEnabled && opener === null) invalidAt("enterNow.openerStakeTzs");

    const rules: HouseBotRulesV1 = {
      schemaVersion: 1,
      scope: {
        products: { updown: bool("scope.products.updown"), polls: bool("scope.products.polls") },
        chains,
        categories,
        skipPollsClosingWithinMin: number("scope.skipPollsClosingWithinMin"),
        poolTotalMinTzs: number("scope.poolTotalMinTzs"),
        poolTotalMaxTzs: nullable("scope.poolTotalMaxTzs"),
      },
      modes,
      counter: {
        delayMinSec: number("counter.delayMinSec"),
        delayMaxSec: number("counter.delayMaxSec"),
        reactProbabilityPct: number("counter.reactProbabilityPct"),
        triggerStakeMinTzs: number("counter.triggerStakeMinTzs"),
        triggerStakeMaxTzs: number("counter.triggerStakeMaxTzs"),
        amount,
      },
      fill: {
        leadUdSec: number("fill.leadUdSec"),
        leadPollsMin: number("fill.leadPollsMin"),
        targetThinSharePct: number("fill.targetThinSharePct"),
        jitterSec: number("fill.jitterSec"),
      },
      opener: {
        delayUdMinSec: number("opener.delayUdMinSec"),
        delayUdMaxSec: number("opener.delayUdMaxSec"),
        delayPollsMinMin: number("opener.delayPollsMinMin"),
        delayPollsMaxMin: number("opener.delayPollsMaxMin"),
        stakeMinTzs: number("opener.stakeMinTzs"),
        stakeMaxTzs: number("opener.stakeMaxTzs"),
      },
      updown: { closenessPct: number("updown.closenessPct") },
      shaping: { roundToTzs: number("shaping.roundToTzs") as RoundToTzs, jitterPct: number("shaping.jitterPct") },
      guards: {
        noReactZoneUdSec: number("guards.noReactZoneUdSec"),
        noReactZonePollsMin: number("guards.noReactZonePollsMin"),
        minTimeToCutoffUdSec: number("guards.minTimeToCutoffUdSec"),
        minTimeToCutoffPollsMin: number("guards.minTimeToCutoffPollsMin"),
      },
      schedule: { days, allDay: bool("schedule.allDay"), windows },
      enterNow: { enabled: enterNowEnabled, thinStakeTzs: thin, openerStakeTzs: opener },
      targeting: { enabled: targetingEnabled },
    };

    // An inverted range an enabled mode would draw from is unusable (a random delay between 45 and 15).
    const ranges: [FieldId, number, number][] = [
      ["counter.delayMinSec", rules.counter.delayMinSec, rules.counter.delayMaxSec],
      ["counter.triggerStakeMinTzs", rules.counter.triggerStakeMinTzs, rules.counter.triggerStakeMaxTzs],
      ["opener.delayUdMinSec", rules.opener.delayUdMinSec, rules.opener.delayUdMaxSec],
      ["opener.delayPollsMinMin", rules.opener.delayPollsMinMin, rules.opener.delayPollsMaxMin],
      ["opener.stakeMinTzs", rules.opener.stakeMinTzs, rules.opener.stakeMaxTzs],
    ];
    for (const [field, lo, hi] of ranges) {
      if (lo > hi && LEAF_USED_BY[field]?.(state)) invalidAt(field);
    }
    if (
      rules.scope.poolTotalMaxTzs !== null &&
      rules.scope.poolTotalMinTzs > rules.scope.poolTotalMaxTzs &&
      anyAutomatic(state)
    ) {
      invalidAt("scope.poolTotalMaxTzs");
    }
    return { ok: true, rules, stale };
  } catch (e) {
    if (e instanceof InvalidStoredRules) return { ok: false, code: "RULES_INVALID", field: e.field };
    throw e;
  }
}

/**
 * A stored rules JSON → typed rules, or the reason it can't be used.
 *
 * - Not an object → RULES_INVALID (`rules`). `schemaVersion` missing or 0 → RULES_OUTDATED; above
 *   this build's → RULES_FROM_FUTURE (the engine skips the bot without pausing it, 04 F4); not a whole
 *   number → RULES_INVALID (`schemaVersion`).
 * - A missing toggle or list reads as off or empty; a missing `enterNow` or `targeting` is off — no
 *   pause (N1 §2, N2 §2). A missing number is filled from the defaults when no enabled mode reads
 *   it, and is RULES_INVALID naming it when one does.
 * - A wrong type, or a value outside the field's static bounds, is RULES_INVALID naming the field.
 *   Live stake bounds are not checked here (04 F5).
 * - A chain or category the platform no longer has is dropped into `stale`; unknown keys are dropped.
 *
 * ⛔ It never widens anything and never writes. Converting older rules is the rules form's job, through
 * `migrateRules`, reviewed and saved by an owner.
 */
export function parseHouseBotRules(
  json: unknown,
  ctx: ParseContext,
):
  | { ok: true; rules: HouseBotRulesV1; stale: RulesStale[] }
  | { ok: false; code: "RULES_FROM_FUTURE" | "RULES_OUTDATED" | "RULES_INVALID"; field?: string } {
  if (!isPlainObject(json)) return { ok: false, code: "RULES_INVALID", field: "rules" };
  const v = json.schemaVersion;
  if (v === undefined || v === null || v === 0) return { ok: false, code: "RULES_OUTDATED" };
  if (typeof v !== "number" || !Number.isInteger(v) || v < 0) return { ok: false, code: "RULES_INVALID", field: "schemaVersion" };
  if (v > HOUSE_RULES_SCHEMA_VERSION) return { ok: false, code: "RULES_FROM_FUTURE" };
  return readStoredRulesV1(json, ctx);
}

function clampStored(id: FieldId, v: unknown, durations: readonly number[], fallback: number | null): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
  const whole = Math.trunc(v);
  const options = FIELD_META[id].options;
  if (options) return options.includes(whole) ? whole : fallback;
  const b = storedBounds(id, durations);
  return b ? Math.min(Math.max(whole, b.min), b.max) : whole;
}

/**
 * v0 → v1. The only migration: every v1 addition was folded into v1 (N1 §2), so nothing else exists.
 *
 * - Known keys are copied; unknown keys are not.
 * - A scope list that is not a list (legacy "all") becomes empty.
 * - A mode or toggle is on only if it was literally `true`.
 * - A number is kept when it is within the field's bounds, otherwise moved to the nearer bound; a
 *   missing one takes the v1 default.
 * - Enter now and targeting did not exist in v0, so they are off.
 *
 * ⛔ The input object is never mutated.
 */
function v0ToV1(json: Record<string, unknown>, ctx: ParseContext): Record<string, unknown> {
  const at = (path: string) => getPath(json, path);
  const defaults = DEFAULT_RULES_V1({ stakeBounds: ctx.stakeBounds ?? { minTzs: FALLBACK_MIN_STAKE_TZS, maxTzs: TZS_RAIL_MAX } });
  const out: Record<string, unknown> = { schemaVersion: 1 };
  const list = (path: string) => {
    const v = at(path);
    return Array.isArray(v) ? v.filter((s): s is string => typeof s === "string") : [];
  };

  setPath(out, "scope.products.updown", at("scope.products.updown") === true);
  setPath(out, "scope.products.polls", at("scope.products.polls") === true);
  setPath(out, "scope.chains", list("scope.chains"));
  setPath(out, "scope.categories", list("scope.categories"));
  for (const product of ["updown", "polls"] as const) {
    for (const mode of ["counter", "fill", "opener"] as const) {
      setPath(out, `modes.${product}.${mode}`, at(`modes.${product}.${mode}`) === true);
    }
  }
  for (const id of RULE_NUMBER_FIELDS) {
    if (id.startsWith("counter.amount.") || id.startsWith("enterNow.")) continue;
    const fallback = getPath(defaults, id);
    setPath(out, id, clampStored(id, at(id), ctx.durations, typeof fallback === "number" ? fallback : null));
  }
  if (at("counter.amount.kind") === "FIXED" && typeof at("counter.amount.fixedTzs") === "number") {
    setPath(out, "counter.amount", {
      kind: "FIXED",
      fixedTzs: clampStored("counter.amount.fixedTzs", at("counter.amount.fixedTzs"), ctx.durations, null),
    });
  } else {
    setPath(out, "counter.amount", {
      kind: "PCT",
      pct: clampStored("counter.amount.pct", at("counter.amount.pct"), ctx.durations, 80),
    });
  }
  const days = at("schedule.days");
  setPath(out, "schedule.days", Array.isArray(days) ? WEEKDAYS.filter((d) => days.includes(d)) : []);
  setPath(out, "schedule.allDay", at("schedule.allDay") === true);
  const windows = at("schedule.windows");
  setPath(
    out,
    "schedule.windows",
    Array.isArray(windows)
      ? windows
          .filter(isPlainObject)
          .filter(
            (w) =>
              isWholeIn(w.startMin, 0, MINUTES_PER_DAY - 1) &&
              isWholeIn(w.endMin, 1, MINUTES_PER_DAY) &&
              w.startMin !== (w.endMin as number) % MINUTES_PER_DAY,
          )
          .slice(0, MAX_SCHEDULE_WINDOWS)
          .map((w) => ({ startMin: w.startMin, endMin: w.endMin }))
      : [],
  );
  setPath(out, "enterNow", { enabled: false, thinStakeTzs: null, openerStakeTzs: null });
  setPath(out, "targeting", { enabled: false });
  return out;
}

/** Stored version → the step that lifts it one version. */
export const RULES_MIGRATIONS: Readonly<
  Record<number, (json: Record<string, unknown>, ctx: ParseContext) => Record<string, unknown>>
> = { 0: v0ToV1 };

function leafPaths(v: unknown, prefix: string, out: string[]): void {
  if (isPlainObject(v)) {
    for (const k of Object.keys(v)) leafPaths(v[k], prefix ? `${prefix}.${k}` : k, out);
  } else {
    out.push(prefix);
  }
}

/**
 * Stored rules of any known version → v1, with the diff an owner reviews before saving (04 F4).
 * Used only by the rules form; the engine and the planner never convert anything.
 */
export function migrateRules(
  json: unknown,
  ctx: ParseContext,
):
  | { ok: true; rules: HouseBotRulesV1; diff: { path: string; before: unknown; after: unknown }[] }
  | { ok: false; code: "RULES_FROM_FUTURE" | "RULES_INVALID" | "NO_MIGRATION"; field?: string } {
  if (!isPlainObject(json)) return { ok: false, code: "RULES_INVALID", field: "rules" };
  const stored = json.schemaVersion ?? 0;
  if (typeof stored !== "number" || !Number.isInteger(stored) || stored < 0) {
    return { ok: false, code: "RULES_INVALID", field: "schemaVersion" };
  }
  if (stored > HOUSE_RULES_SCHEMA_VERSION) return { ok: false, code: "RULES_FROM_FUTURE" };
  let current: Record<string, unknown> = json;
  for (let version = stored; version < HOUSE_RULES_SCHEMA_VERSION; version++) {
    const step = RULES_MIGRATIONS[version];
    if (!step) return { ok: false, code: "NO_MIGRATION" };
    current = step(current, ctx);
  }
  const parsed = parseHouseBotRules(current, ctx);
  if (!parsed.ok) {
    return parsed.code === "RULES_FROM_FUTURE"
      ? { ok: false, code: "RULES_FROM_FUTURE" }
      : { ok: false, code: "RULES_INVALID", field: parsed.field };
  }
  const paths: string[] = [];
  leafPaths(parsed.rules, "", paths);
  const diff = paths
    .map((path) => ({ path, before: getPath(json, path), after: getPath(parsed.rules, path) }))
    .filter((d) => JSON.stringify(d.before) !== JSON.stringify(d.after));
  return { ok: true, rules: parsed.rules, diff };
}

/** A control row's `limitsSchemaVersion`: NULL reads as current; ahead of this build means place nothing. */
export function parseLimitsSchemaVersion(v: number | null): "CURRENT" | "FROM_FUTURE" {
  return v === null || v <= HOUSE_LIMITS_SCHEMA_VERSION ? "CURRENT" : "FROM_FUTURE";
}

// ---------------------------------------------------------------------------
// Timing (PLAN F2, 04 A14, N1 §5, N2 §5)
// ---------------------------------------------------------------------------

export const TIMING_PREVIEW_LABEL = "For markets created from now (current exit settings)";
export const OPEN_MARKETS_KEEP_EXIT_COPY = "Markets already open keep their own exit window.";

const LOCK_MARGIN_SEC = LOCK_MARGIN_MS / 1000;

/** A sliver of a second, so "before the no-react zone" stays a strict inequality in whole-second maths. */
const STRICT_SEC = 0.001;

/**
 * When a stake's exit window closes, in seconds after the stake (04 A14, the extracted
 * `exitWindowClosesAt`): grace + paid when grace > 0 and the stake had at least the grace left before
 * betting closes; otherwise 0 — that stake was never sellable.
 */
export function exitWindowCloseSec(runwaySec: number, rates: ExitRates): number {
  const graceSec = rates.freeExitGraceMinutes * 60;
  return graceSec > 0 && runwaySec >= graceSec ? graceSec + rates.paidExitWindowMinutes * 60 : 0;
}

/**
 * The earliest a TARGETED reaction may land: the exit close plus `LOCK_MARGIN_MS` (N2 §4).
 * ⛔ Targets only — the untargeted COUNTER is held to the exit close with no margin.
 */
export function holdAfterStakeSec(exitSec: number): number {
  return exitSec + LOCK_MARGIN_SEC;
}

/**
 * A targeted reaction's due time, in seconds after the stake: `max(requested, exit + 7 s)`, where the
 * delay counts from the stake or from the exit closing (N2 §4 step 5). The hold is absolute.
 */
export function targetDueAfterStakeSec(timingFrom: TimingFrom, exitSec: number, delaySec: number): number {
  const requested = (timingFrom === "STAKE" ? 0 : exitSec) + delaySec;
  return Math.max(requested, holdAfterStakeSec(exitSec));
}

/** One class's automatic COUNTER timing (a round duration, or polls). */
export type CounterTiming = {
  /** For a stake at open: when the counter is due, fastest and slowest delay. */
  earliestAfterStakeSec: number;
  latestAfterStakeSec: number;
  /** The player's exit window pushes the counter past the delay. */
  held: boolean;
  sentence: string;
  /** The latest stake, in seconds after the class opens, that can still be countered. */
  lastCounterableFromOpenSec: number;
  /** "Stakes in the last {m:ss} before lock: not countered." */
  notCounteredLastSec: number;
};

/**
 * One class, lifetime L seconds. Two kinds of stake:
 * - with runway (grace > 0 and at least the grace left): held to grace + paid, NO lock margin;
 * - without: the plain delay.
 * A stake can be countered when it is placed before the no-react zone and its counter is due before
 * min time to cutoff. `never` means no stake of either kind can be.
 */
function counterWindow(
  lifetimeSec: number,
  rates: ExitRates,
  delayMinSec: number,
  delayMaxSec: number,
  noReactZoneSec: number,
  minTimeToCutoffSec: number,
): { heldUpper: number | null; unheldUpper: number | null; exitSec: number } {
  const graceSec = rates.freeExitGraceMinutes * 60;
  const exitSec = graceSec > 0 ? graceSec + rates.paidExitWindowMinutes * 60 : 0;
  const beforeZone = lifetimeSec - noReactZoneSec - STRICT_SEC;
  let heldUpper: number | null = null;
  if (graceSec > 0) {
    const due = Math.max(delayMinSec, exitSec);
    const upper = Math.min(lifetimeSec - graceSec, lifetimeSec - minTimeToCutoffSec - due, beforeZone);
    if (upper >= 0) heldUpper = upper;
  }
  const unheldLower = graceSec > 0 ? Math.max(0, lifetimeSec - graceSec + STRICT_SEC) : 0;
  const upper = Math.min(beforeZone, lifetimeSec - minTimeToCutoffSec - delayMinSec);
  return { heldUpper, unheldUpper: upper >= unheldLower ? upper : null, exitSec };
}

function counterTiming(
  classLabel: string,
  lifetimeSec: number,
  rates: ExitRates,
  delayMinSec: number,
  delayMaxSec: number,
  noReactZoneSec: number,
  minTimeToCutoffSec: number,
): "never" | CounterTiming {
  const w = counterWindow(lifetimeSec, rates, delayMinSec, delayMaxSec, noReactZoneSec, minTimeToCutoffSec);
  if (w.heldUpper === null && w.unheldUpper === null) return "never";
  const heldApplies = w.heldUpper !== null;
  const earliest = heldApplies ? Math.max(delayMinSec, w.exitSec) : delayMinSec;
  const latest = heldApplies ? Math.max(delayMaxSec, w.exitSec) : delayMaxSec;
  const held = heldApplies && w.exitSec > delayMinSec;
  const last = w.unheldUpper ?? (w.heldUpper as number);
  const timing: CounterTiming = {
    earliestAfterStakeSec: earliest,
    latestAfterStakeSec: latest,
    held,
    sentence: "",
    lastCounterableFromOpenSec: Math.max(0, Math.floor(last)),
    notCounteredLastSec: Math.max(0, Math.round(lifetimeSec - last)),
  };
  timing.sentence = `${classLabel}: ${counterBody(timing, rates, delayMinSec, delayMaxSec)}`;
  return timing;
}

function counterBody(t: CounterTiming, rates: ExitRates, delayMinSec: number, delayMaxSec: number): string {
  if (t.held) {
    const due =
      t.earliestAfterStakeSec === t.latestAfterStakeSec
        ? formatAfterStake(t.earliestAfterStakeSec)
        : `${formatAfterStake(t.earliestAfterStakeSec)}–${formatAfterStake(t.latestAfterStakeSec)}`;
    const paid =
      rates.paidExitWindowMinutes > 0 ? ` plus a ${formatWhole(rates.paidExitWindowMinutes)}-min paid exit` : "";
    return `${due} after the stake, because the player keeps a free ${formatWhole(rates.freeExitGraceMinutes)}-min exit${paid}`;
  }
  return delayMinSec === delayMaxSec
    ? `exactly ${formatWhole(delayMinSec)} s after the stake (usually +${USUAL_LATENESS_SEC.min}–${USUAL_LATENESS_SEC.max} s)`
    : `${formatWhole(delayMinSec)}–${formatWhole(delayMaxSec)} s after the stake`;
}

/** The Enter now line of the timing preview (N1 §5); `{m:ss}` is the bot's polls min time to cutoff. */
export const ENTER_NOW_TIMING_SENTENCE = (minTimeToCutoffSec: number): string =>
  `Enter now (polls only) places within a few seconds of your press. If 50pick is busy it keeps trying for ${STALE_AFTER_SEC.manual} s, then gives up with nothing moved. It ignores this bot's schedule, pool band and closing-soon skip, and stays out of the last ${formatAfterStake(minTimeToCutoffSec)} before betting closes.`;

function joinClasses(durations: readonly number[], polls: boolean): string {
  const sorted = [...new Set(durations)].sort((a, b) => a - b);
  const rounds =
    sorted.length === 0
      ? ""
      : sorted.length === 1
        ? `${sorted[0]}-min rounds`
        : `${sorted[0]}–${sorted[sorted.length - 1]}-min rounds`;
  return [rounds, polls ? "polls" : ""].filter(Boolean).join(" and ");
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * The rules tab's read-only timing preview, for markets created from now (PLAN F2, 04 C14).
 *
 * - `counter.polls` uses the shortest poll lifetime (`MIN_SELECTION_WINDOW_MINUTES`); each chain uses
 *   its round's bettable life, D·60 − 92 s. A chain without exit rates in the context is left out.
 * - ⛔ The automatic COUNTER is held to the exit window with no lock margin: with grace 5 and a 20 s
 *   delay, a 3-min round counters at 0:20, a 10-min round at open and a poll at 5:00, and a 2-min
 *   paid window makes it 7:00 (PLAN §12).
 * - `never` is "no stake instant on this class can be countered". A 120-min paid window makes polls
 *   `never`; a 60-min one does not — stakes in the first 50:00 of the shortest poll can still be.
 */
export function effectiveTiming(
  r: HouseBotRulesV1,
  ctx: Pick<RulesContext, "exitRates" | "pollMinLifetimeMin" | "chains">,
  opts: { openMarketsDiffer?: boolean } = {},
): {
  label: typeof TIMING_PREVIEW_LABEL;
  counter: { polls: "never" | CounterTiming; updown: Partial<Record<ChainKey, "never" | CounterTiming>> };
  enterNow: "off" | { sentence: string };
  lines: string[];
} {
  const { delayMinSec, delayMaxSec } = r.counter;
  const polls = counterTiming(
    "Polls",
    ctx.pollMinLifetimeMin * 60,
    ctx.exitRates.polls,
    delayMinSec,
    delayMaxSec,
    r.guards.noReactZonePollsMin * 60,
    r.guards.minTimeToCutoffPollsMin * 60,
  );
  const updown: Partial<Record<ChainKey, "never" | CounterTiming>> = {};
  const classes: { durations: number[]; polls: boolean; timing: "never" | CounterTiming; rates: ExitRates }[] = [
    { durations: [], polls: true, timing: polls, rates: ctx.exitRates.polls },
  ];
  for (const chain of ctx.chains) {
    const rates = ctx.exitRates.updown[chain.key];
    if (!rates) continue;
    const timing = counterTiming(
      `${chain.durationMinutes}-min rounds`,
      chain.durationMinutes * 60 - UD_ROUND_OPEN_LAG_SEC,
      rates,
      delayMinSec,
      delayMaxSec,
      r.guards.noReactZoneUdSec,
      r.guards.minTimeToCutoffUdSec,
    );
    updown[chain.key] = timing;
    classes.unshift({ durations: [chain.durationMinutes], polls: false, timing, rates });
  }

  // One line per distinct sentence body, naming every class that shares it.
  const groups = new Map<string, { durations: number[]; polls: boolean }>();
  const addTo = (key: string, c: { durations: number[]; polls: boolean }) => {
    const g = groups.get(key) ?? { durations: [], polls: false };
    g.durations.push(...c.durations);
    g.polls = g.polls || c.polls;
    groups.set(key, g);
  };
  for (const c of classes) {
    if (c.timing === "never") {
      addTo(`never|${c.rates.freeExitGraceMinutes + c.rates.paidExitWindowMinutes}|${c.rates.freeExitGraceMinutes}`, c);
    } else {
      addTo(`body|${counterBody(c.timing, c.rates, delayMinSec, delayMaxSec)}`, c);
    }
  }
  const lines: string[] = [];
  const neverLines: string[] = [];
  for (const [key, g] of groups) {
    const joined = joinClasses(g.durations, g.polls);
    if (key.startsWith("body|")) {
      lines.push(`${capitalise(joined)}: ${key.slice(5)}`);
    } else {
      const [, total, grace] = key.split("|");
      const minutes = Number(grace) > 0 ? Number(total) : 0;
      neverLines.push(`Counter: never fires on ${joined} under current exit rules (players can exit for ${formatWhole(minutes)} min)`);
    }
  }
  const lastGroups = new Map<number, { durations: number[]; polls: boolean }>();
  for (const c of classes) {
    if (c.timing === "never" || c.timing.notCounteredLastSec <= 0) continue;
    const g = lastGroups.get(c.timing.notCounteredLastSec) ?? { durations: [], polls: false };
    g.durations.push(...c.durations);
    g.polls = g.polls || c.polls;
    lastGroups.set(c.timing.notCounteredLastSec, g);
  }
  for (const [sec, g] of lastGroups) {
    lines.push(`Stakes in the last ${formatAfterStake(sec)} before lock on ${joinClasses(g.durations, g.polls)}: not countered`);
  }
  lines.push(...neverLines);
  if (opts.openMarketsDiffer) lines.push(OPEN_MARKETS_KEEP_EXIT_COPY);

  return {
    label: TIMING_PREVIEW_LABEL,
    counter: { polls, updown },
    enterNow: r.enterNow.enabled ? { sentence: ENTER_NOW_TIMING_SENTENCE(r.guards.minTimeToCutoffPollsMin * 60) } : "off",
    lines,
  };
}

/** What `effectiveTargetTiming` returns (N2 §5). */
export type TargetTiming = {
  earliestAfterStakeSec: number;
  latestAfterStakeSec: number;
  /** The 7 s hold lifts the due time above the requested time for the minimum delay. */
  held: boolean;
  sentence: string;
  short: string;
  /**
   * The latest stake instant, at or after `armedFrom`, the target can still react to — or null when
   * there is none. ⚠️ When the no-react zone is what binds, this is 1 ms before `cutoff − zone` (the
   * rule is strict); the sentence rounds it to the second.
   */
  lastReactableStakeAt: string | null;
  armedFrom: string;
  /** No reactable instant at or after `armedFrom`. */
  never: boolean;
};

/**
 * A target's exact entry timing on one poll, for the add and edit preview and for `decide.ts`
 * (N2 §5). Pure: the market's frozen exit rates, the bot's polls guards, the poll's cutoff and the
 * clock are all passed in.
 *
 * - A stake WITH runway (grace > 0 and at least the grace left) has its exit window: the reaction is
 *   due at `max(requested, exit + 7 s)`. A stake WITHOUT runway was never sellable: due at
 *   `max(delay, 7 s)`. Both regimes are evaluated for `lastReactableStakeAt`.
 * - `armedFrom` is `effectiveFromIso` when the target exists, else now + 12 s (an add).
 * - The headline figures and sentence are for a stake placed now, after arming.
 * - "Usually lands" adds the claim lag of 2–5 s (04 A24).
 *
 * `opts.botLabel` names the bot in the sentences; it is last so it never shifts the sealed arguments.
 */
export function effectiveTargetTiming(
  target: TargetTimingInput,
  frozen: FrozenExitRates,
  guards: { noReactZoneSec: number; minTimeToCutoffSec: number },
  cutoffIso: string,
  nowIso: string,
  effectiveFromIso?: string | null,
  opts: { botLabel?: string } = {},
): TargetTiming {
  const label = opts.botLabel ?? DEFAULT_BOT_LABEL;
  const { delayMinSec, delayMaxSec, timingFrom } = target;
  const graceSec = frozen.graceMin * 60;
  const exitWithRunway = graceSec > 0 ? graceSec + frozen.paidMin * 60 : 0;
  const cutoffMs = Date.parse(cutoffIso);
  const nowMs = Date.parse(nowIso);
  const armedFromMs = effectiveFromIso ? Date.parse(effectiveFromIso) : nowMs + TARGET_ARMING_SEC * 1000;
  const deadlineMs = cutoffMs - guards.minTimeToCutoffSec * 1000;
  const beforeZoneMs = cutoffMs - guards.noReactZoneSec * 1000 - 1;

  const candidates: number[] = [];
  if (graceSec > 0) {
    const withRunway = Math.min(
      cutoffMs - graceSec * 1000,
      deadlineMs - targetDueAfterStakeSec(timingFrom, exitWithRunway, delayMinSec) * 1000,
      beforeZoneMs,
    );
    if (withRunway >= armedFromMs) candidates.push(withRunway);
  }
  const withoutRunway = Math.min(deadlineMs - targetDueAfterStakeSec(timingFrom, 0, delayMinSec) * 1000, beforeZoneMs);
  const noRunwayFrom = graceSec > 0 ? cutoffMs - graceSec * 1000 + 1 : Number.NEGATIVE_INFINITY;
  if (withoutRunway >= noRunwayFrom && withoutRunway >= armedFromMs) candidates.push(withoutRunway);
  const lastMs = candidates.length > 0 ? Math.max(...candidates) : null;

  const runwayNow = graceSec > 0 && armedFromMs <= cutoffMs - graceSec * 1000;
  const exitSec = runwayNow ? exitWithRunway : 0;
  const dueMin = targetDueAfterStakeSec(timingFrom, exitSec, delayMinSec);
  const dueMax = targetDueAfterStakeSec(timingFrom, exitSec, delayMaxSec);
  const requestedMin = (timingFrom === "STAKE" ? 0 : exitSec) + delayMinSec;
  const held = holdAfterStakeSec(exitSec) > requestedMin;

  const at = (ms: number) => formatEat(ms, "HH:MM:SS");
  const iso = (ms: number) => (Number.isFinite(ms) ? new Date(ms).toISOString() : "");
  const armedShownMs = Math.ceil(armedFromMs / 1000) * 1000;

  if (lastMs === null) {
    return {
      earliestAfterStakeSec: dueMin,
      latestAfterStakeSec: dueMax,
      held,
      sentence: `Can't react on this poll: a stake placed from ${at(armedShownMs)} ${EAT_LABEL} would be held past ${label}'s cutoff (${formatEat(deadlineMs, "HH:MM")} ${EAT_LABEL}).`,
      short: "Too late",
      lastReactableStakeAt: null,
      armedFrom: iso(armedFromMs),
      never: true,
    };
  }

  const secs = (n: number) => formatWhole(n);
  const span = (a: number, b: number, fmt: (n: number) => string) => (a === b ? fmt(a) : `${fmt(a)}–${fmt(b)}`);
  const asked = `${span(delayMinSec, delayMaxSec, secs)} s`;
  const fromStake = timingFrom === "STAKE" || exitSec === 0;
  const exitCloses = frozen.paidMin > 0 ? "the player's paid exit closes" : "the player's free exit closes";
  const usually = (fmt: (n: number) => string, unit: string) =>
    dueMin === dueMax
      ? `Usually lands ${fmt(dueMin + USUAL_LATENESS_SEC.min)}–${fmt(dueMin + USUAL_LATENESS_SEC.max)}${unit} after the stake.`
      : `Usually lands ${USUAL_LATENESS_SEC.min}–${USUAL_LATENESS_SEC.max} s after that.`;

  let short: string;
  let body: string;
  if (held) {
    const heldTo = span(dueMin, dueMax, formatAfterStake);
    if (fromStake && exitSec > 0) {
      const askedPart = delayMinSec !== delayMaxSec ? ` (asked ${asked})` : "";
      const exitPart =
        frozen.paidMin > 0
          ? `free ${secs(frozen.graceMin)}-min exit plus a ${secs(frozen.paidMin)}-min paid exit`
          : `the player keeps a free ${secs(frozen.graceMin)}-min exit`;
      short = `${asked} → held to ${heldTo}`;
      body = `Held to ${heldTo} after each stake${askedPart} — ${exitPart}. ${usually(formatAfterStake, "")}`;
    } else if (fromStake) {
      short = `${asked} → held to ${heldTo}`;
      body = `Held to ${heldTo} after each stake (asked ${asked}) — 50pick waits at least ${LOCK_MARGIN_SEC} s. ${usually(formatAfterStake, "")}`;
    } else {
      short = `exit + ${asked} → held to ${heldTo}`;
      body = `Held to ${heldTo} after each stake (asked ${asked} after ${exitCloses}; 50pick waits at least ${LOCK_MARGIN_SEC} s). ${usually(formatAfterStake, "")}`;
    }
  } else if (fromStake) {
    const why =
      exitSec > 0
        ? frozen.paidMin > 0
          ? "after the player's paid exit has closed"
          : "after the player's free exit has closed"
        : graceSec > 0
          ? "a stake now has no free exit left"
          : "this poll has no free exit";
    short = asked;
    body = `${asked} after each stake — ${why}. ${usually(secs, " s")}`;
  } else {
    const due = span(dueMin, dueMax, formatAfterStake);
    short = `exit + ${asked} = ${due}`;
    body = `${due} after each stake (${asked} after ${exitCloses}). ${usually(formatAfterStake, "")}`;
  }

  let sentence = `${body} Armed from ${at(armedShownMs)} ${EAT_LABEL}. Stakes placed after ${at(Math.round(lastMs / 1000) * 1000)} ${EAT_LABEL} aren't reacted to.`;
  if (guards.noReactZoneSec < graceSec) {
    const noRunway = span(
      targetDueAfterStakeSec(timingFrom, 0, delayMinSec),
      targetDueAfterStakeSec(timingFrom, 0, delayMaxSec),
      secs,
    );
    sentence += ` From ${at(cutoffMs - graceSec * 1000)} ${EAT_LABEL} a stake has no free exit, so ${label} reacts ${noRunway} s after it.`;
  }

  return {
    earliestAfterStakeSec: dueMin,
    latestAfterStakeSec: dueMax,
    held,
    sentence,
    short,
    lastReactableStakeAt: iso(lastMs),
    armedFrom: iso(armedFromMs),
    never: false,
  };
}
