/**
 * ENTER NOW — the side and the amount of a staff-chosen stake on a poll (04 N1 §4.2).
 *
 * ⛔ PURE. `enter-now.ts loadEnterNowInput` reads every input fresh and passes it in; the preview, the press and
 * fire all call this one function on the same shape, so the figure an officer confirms is the figure fire
 * re-derives. No store, clock or server value import — `test:house-bot-engine` pins it.
 *
 * ⛔ THE SAME ARITHMETIC AS THE SEAM. Every clamp term is the headroom of one check in `seam.ts` H2–H4, with the
 * seam's own NULL rule: a cap that is not set refuses there, so it leaves no room here. A preview that promised
 * a stake the gate then refused would be a figure staff were shown and money never matched.
 *
 * The steps run in N1's order and the first refusal wins. That order is for the officer's clarity: when a stake
 * reaches the seam, H2–H4's declared order decides the recorded code.
 */
import { displayLabel } from "@/lib/display-label";
import { attributeStake } from "@/lib/house-bot/counterparty";
import { LOCK_MARGIN_MS } from "@/lib/house-bot/constants";
import { formatWhole } from "@/lib/house-bot/rules";
import type { LockedPool } from "../house-bot-dal";
import type { PublicMarketView } from "./market-view";

export type EnterNowSide = "YES" | "NO";
const opposite = (s: EnterNowSide): EnterNowSide => (s === "YES" ? "NO" : "YES");

/** The rate caps fire defers on (N1 §4.3 step 6), in the order a tie names them. */
export const ENTER_NOW_RATE_CODES = ["MIN_GAP", "PER_HOUR", "PER_DAY", "GLOBAL_BETS_PER_MINUTE"] as const;
export type EnterNowRateCode = (typeof ENTER_NOW_RATE_CODES)[number];

export const ENTER_NOW_REFUSAL_CODES = [
  "INFO_BLACKOUT",
  "COUNTERPARTY_CONCENTRATION",
  "HOUSE_ONLY",
  "ONLY_SELLABLE",
  "BALANCED",
  "OWN_OTHER_SIDE",
  "STAKE_BELOW_MIN",
  "STAFF_CHOSEN_PER_DAY",
  "GLOBAL_STAFF_CHOSEN",
  "COUNTERPARTY_LIMIT",
  ...ENTER_NOW_RATE_CODES,
] as const;
export type EnterNowRefusalCode = (typeof ENTER_NOW_REFUSAL_CODES)[number];

/** The clamp terms, in N1's table order — a tie names the earlier one. */
export const ENTER_NOW_BINDINGS = [
  "room",
  "openerStake",
  "stakeMax",
  "platformMax",
  "perMarket",
  "globalPerMarket",
  "staffChosenDaily",
  "globalStaffChosenDaily",
  "dailyStake",
  "globalDailyStake",
  "dailyLoss",
  "globalDailyLoss",
  "exposure",
  "globalExposure",
  "balance",
  "counterpartyTzs",
] as const;
export type EnterNowBinding = (typeof ENTER_NOW_BINDINGS)[number];

export type EnterNowInput = {
  view: Pick<PublicMarketView, "id" | "titleEn" | "category" | "selectionClosedAt">;
  /** `infoBlackout` — the only result-check fact that may enter (N1 §4.1). */
  blocked: boolean;
  /** `lockedForHouse` on this market. */
  pools: LockedPool;
  /** The side drawn once for this market — present only when both raw pools are 0. */
  openerDraw: { side: EnterNowSide; drawnFor: string; drawnAt: string } | null;
  /** The bot's OPEN house positions here. */
  own: { side: EnterNowSide | null; count: number; stakeTzs: number };
  rules: { thinStakeTzs: number | null; openerStakeTzs: number | null; roundToTzs: number };
  bot: {
    stakeMinTzs: number | null;
    stakeMaxTzs: number | null;
    capPerMarketTzs: number | null;
    capDailyStakeTzs: number | null;
    capDailyLossTzs: number | null;
    capOpenExposureTzs: number | null;
    balanceFloorTzs: number | null;
    capStaffChosenPerDay: number | null;
    capStaffChosenDailyTzs: number | null;
    freqMinGapSec: number | null;
    freqMaxPerHour: number | null;
    freqMaxPerDay: number | null;
    /** Usage, from the same reads H2 makes. */
    stakeOnMarket: number;
    stakedToday: number;
    projectedLossToday: number;
    openExposure: number;
    staffChosenCountToday: number;
    staffChosenTzsToday: number;
    balance: number;
    /** This bot's marked positions placed in the last 86,400 s, any order (MIN_GAP, PER_HOUR, PER_DAY). */
    placedAt: readonly string[];
  };
  control: {
    gCapPerMarketTzs: number | null;
    gCapDailyStakeTzs: number | null;
    gCapDailyLossTzs: number | null;
    gCapOpenExposureTzs: number | null;
    gCapStaffChosenPerDay: number | null;
    gCapStaffChosenDailyTzs: number | null;
    gStaffChosenMaxCounterpartyShare: number | null;
    gCounterPerPlayerPerDay: number | null;
    gCounterPerPlayerTzsPerDay: number | null;
    gMaxBetsPerMinute: number | null;
    /** Usage, from the same reads H3 and H4 make. */
    houseOnMarket: number;
    globalStakedToday: number;
    globalProjectedLossToday: number;
    globalExposure: number;
    globalStaffChosenCountToday: number;
    globalStaffChosenTzsToday: number;
    /** Every bot's marked positions placed in the last 60 s, any order (GLOBAL_BETS_PER_MINUTE). */
    platformPlacedAt: readonly string[];
  };
  /** What house stakes were set against each opposite account today (`counterpartyToday`). */
  counterparties: ReadonlyArray<{ userId: string; count: number; tzs: number }>;
  /** `stakeBoundsForMarket(market)` (A7 (p)). */
  bounds: { min: number; max: number };
  /** Database `now()`, ISO. */
  now: string;
};

export type EnterNowDecisionRecord = {
  entry: "MANUAL";
  condition: "OPENER" | "THIN";
  side: EnterNowSide;
  rawYes: number;
  rawNo: number;
  nonHouseYes: number;
  nonHouseNo: number;
  lockedYes: number;
  lockedNo: number;
  unlockedYes: number;
  unlockedNo: number;
  excludedYes: number;
  excludedNo: number;
  earliestLockAt: string | null;
  lockMarginMs: number;
  baseStake: number;
  binding: EnterNowBinding;
  confirmedStakeTzs: number;
  lockedByTopAccountPct: number | null;
  topCounterpartyHandle: string | null;
  attributedAccounts: number;
  openerDraw?: { side: EnterNowSide; drawnFor: string; drawnAt: string };
  snapshot: { titleEn: string; category: string; cutoff: string | null };
  blackout: false;
};

export type EnterNowResult =
  | {
      ok: true;
      entryCondition: "OPENER" | "THIN";
      side: EnterNowSide;
      stakeTzs: number;
      binding: EnterNowBinding;
      possibleAt: string | null;
      possibleCode: EnterNowRateCode | null;
      decision: EnterNowDecisionRecord;
      why: string;
    }
  | {
      ok: false;
      code: EnterNowRefusalCode;
      facts: Record<string, unknown> & { side?: EnterNowSide; entryCondition?: "OPENER" | "THIN" };
      retryAt?: string;
    };

/** The first moment a rolling window of `windowMs` holds fewer than `max` stakes, or `nowMs` when it does now. */
function rollingFreeAt(placedAtMs: readonly number[], nowMs: number, windowMs: number, max: number): number {
  const inWindow = placedAtMs.filter((t) => t > nowMs - windowMs && t <= nowMs).sort((a, b) => a - b);
  if (inWindow.length < max) return nowMs;
  return inWindow[inWindow.length - max] + windowMs;
}

export function enterNowDecision(input: EnterNowInput): EnterNowResult {
  const { pools, bot, control } = input;
  const nowMs = Date.parse(input.now);

  // 1 · Blackout.
  if (input.blocked) return { ok: false, code: "INFO_BLACKOUT", facts: {} };

  // 2 · Share not set — fails closed even when N1 §6's unset-limits refusal did not run first.
  const share = control.gStaffChosenMaxCounterpartyShare;
  if (share == null) return { ok: false, code: "COUNTERPARTY_CONCENTRATION", facts: { limit: null } };

  const aggregates = {
    rawYes: pools.YES.raw,
    rawNo: pools.NO.raw,
    nonHouseYes: pools.YES.nonHouse,
    nonHouseNo: pools.NO.nonHouse,
    lockedYes: pools.YES.locked,
    lockedNo: pools.NO.locked,
    unlockedYes: pools.YES.unlocked,
    unlockedNo: pools.NO.unlocked,
    excludedYes: pools.YES.excluded,
    excludedNo: pools.NO.excluded,
    earliestLockAt: earliest(pools.YES.earliestLockAt, pools.NO.earliestLockAt),
  };

  let condition: "OPENER" | "THIN";
  let side: EnterNowSide;
  let base: number;
  let baseBinding: EnterNowBinding;
  if (pools.YES.raw === 0 && pools.NO.raw === 0) {
    // 3 · Empty market: the side drawn once for it, never re-rolled.
    if (!input.openerDraw) throw new Error("enterNowDecision: an empty poll needs its drawn opener side");
    condition = "OPENER";
    side = input.openerDraw.side;
    base = input.rules.openerStakeTzs ?? 0;
    baseBinding = "openerStake";
  } else {
    // 4 · Thin side. Both sides can never qualify: raw(YES) < locked(NO) ≤ raw(NO) < locked(YES) ≤ raw(YES).
    const thinYes = pools.YES.raw < pools.NO.locked;
    const thinNo = pools.NO.raw < pools.YES.locked;
    if (thinYes && thinNo) throw new Error("enterNowDecision: both sides thin — locked money exceeds a raw pool");
    if (thinYes || thinNo) {
      condition = "THIN";
      side = thinYes ? "YES" : "NO";
      base = Math.min(input.rules.thinStakeTzs ?? 0, pools[opposite(side)].locked - pools[side].raw);
      baseBinding = "room";
    } else {
      // 5 · No room.
      const retryAt = aggregates.earliestLockAt ?? undefined;
      if (pools.YES.nonHouse === 0 && pools.NO.nonHouse === 0) return { ok: false, code: "HOUSE_ONLY", facts: { ...aggregates } };
      const unlocked = pools.YES.unlocked + pools.NO.unlocked;
      if (pools.YES.locked === 0 && pools.NO.locked === 0 && unlocked > 0) {
        return { ok: false, code: "ONLY_SELLABLE", facts: { ...aggregates }, ...(retryAt ? { retryAt } : {}) };
      }
      return { ok: false, code: "BALANCED", facts: { ...aggregates }, ...(unlocked > 0 && retryAt ? { retryAt } : {}) };
    }
  }
  const known = { side, entryCondition: condition };

  const lockedOpp = pools[opposite(side)].locked;
  const top = condition === "THIN" ? (pools[opposite(side)].accounts[0] ?? null) : null;
  const topPct = top && lockedOpp > 0 ? Math.round((top.lockedTzs * 1000) / lockedOpp) / 10 : null;

  if (condition === "THIN") {
    // 6 · Own position on the other side.
    if (input.own.side != null && input.own.side !== side) {
      return { ok: false, code: "OWN_OTHER_SIDE", facts: { ...known, held: input.own.side, now: side } };
    }
    // 7 · Concentration (INT-02) — the seam's H3 comparison.
    if (top && top.lockedTzs * 100 > share * lockedOpp) {
      return { ok: false, code: "COUNTERPARTY_CONCENTRATION", facts: { ...known, pct: topPct, limit: share } };
    }
  }

  // 8 · Clamp: the smallest headroom, floored to round-to. A cap that is not set leaves no room (seam `over`).
  const left = (cap: number | null, used: number) => (cap == null ? 0 : cap - used);
  const terms: Array<[EnterNowBinding, number]> = [
    [baseBinding, base],
    ["stakeMax", bot.stakeMaxTzs ?? 0],
    ["platformMax", input.bounds.max],
    ["perMarket", left(bot.capPerMarketTzs, bot.stakeOnMarket)],
    ["globalPerMarket", left(control.gCapPerMarketTzs, control.houseOnMarket)],
    ["staffChosenDaily", left(bot.capStaffChosenDailyTzs, bot.staffChosenTzsToday)],
    ["globalStaffChosenDaily", left(control.gCapStaffChosenDailyTzs, control.globalStaffChosenTzsToday)],
    ["dailyStake", left(bot.capDailyStakeTzs, bot.stakedToday)],
    ["globalDailyStake", left(control.gCapDailyStakeTzs, control.globalStakedToday)],
    ["dailyLoss", left(bot.capDailyLossTzs, bot.projectedLossToday)],
    ["globalDailyLoss", left(control.gCapDailyLossTzs, control.globalProjectedLossToday)],
    ["exposure", left(bot.capOpenExposureTzs, bot.openExposure)],
    ["globalExposure", left(control.gCapOpenExposureTzs, control.globalExposure)],
    ["balance", bot.balanceFloorTzs == null ? 0 : bot.balance - bot.balanceFloorTzs],
  ];
  const attributed = condition === "THIN" ? attributeStake(1, pools[opposite(side)].accounts, lockedOpp) : [];
  const todayOf = (userId: string) => input.counterparties.find((c) => c.userId === userId) ?? { count: 0, tzs: 0 };
  if (attributed.length > 0) {
    const accounts = pools[opposite(side)].accounts.filter((a) => attributed.some((x) => x.userId === a.userId));
    const perAccount = accounts.map((a) =>
      control.gCounterPerPlayerTzsPerDay == null
        ? 0
        : Math.floor(((control.gCounterPerPlayerTzsPerDay - todayOf(a.userId).tzs) * lockedOpp) / a.lockedTzs),
    );
    terms.push(["counterpartyTzs", Math.min(...perAccount)]);
  }
  let [binding, room] = terms[0];
  for (const [name, value] of terms) if (value < room) [binding, room] = [name, value];
  const roundTo = input.rules.roundToTzs > 0 ? input.rules.roundToTzs : 1;
  const stakeTzs = Math.max(0, Math.floor(Math.max(0, room) / roundTo) * roundTo);

  // 9 · Minimum.
  const min = bot.stakeMinTzs == null ? null : Math.max(bot.stakeMinTzs, input.bounds.min);
  if (min == null || stakeTzs < min) {
    return { ok: false, code: "STAKE_BELOW_MIN", facts: { ...known, room: Math.max(0, room), binding, min } };
  }

  // 10 · Counts (N1 §6 refusal 18 codes).
  if (bot.capStaffChosenPerDay == null || bot.staffChosenCountToday >= bot.capStaffChosenPerDay) {
    return { ok: false, code: "STAFF_CHOSEN_PER_DAY", facts: { ...known } };
  }
  if (control.gCapStaffChosenPerDay == null || control.globalStaffChosenCountToday >= control.gCapStaffChosenPerDay) {
    return { ok: false, code: "GLOBAL_STAFF_CHOSEN", facts: { ...known } };
  }
  if (attributed.some((a) => control.gCounterPerPlayerPerDay == null || todayOf(a.userId).count >= control.gCounterPerPlayerPerDay)) {
    return { ok: false, code: "COUNTERPARTY_LIMIT", facts: { ...known } };
  }

  // 11 · Rate facts. A rate cap that is not set never frees, so it refuses (the seam refuses it every time).
  const botMs = bot.placedAt.map((t) => Date.parse(t));
  const platformMs = control.platformPlacedAt.map((t) => Date.parse(t));
  const frees: Array<[EnterNowRateCode, number | null]> = [
    ["MIN_GAP", bot.freqMinGapSec == null ? null : Math.max(nowMs, botMs.length ? Math.max(...botMs) + bot.freqMinGapSec * 1000 : nowMs)],
    ["PER_HOUR", bot.freqMaxPerHour == null ? null : rollingFreeAt(botMs, nowMs, 3_600_000, bot.freqMaxPerHour)],
    ["PER_DAY", bot.freqMaxPerDay == null ? null : rollingFreeAt(botMs, nowMs, 86_400_000, bot.freqMaxPerDay)],
    ["GLOBAL_BETS_PER_MINUTE", control.gMaxBetsPerMinute == null ? null : rollingFreeAt(platformMs, nowMs, 60_000, control.gMaxBetsPerMinute)],
  ];
  const unset = frees.find(([, at]) => at == null);
  if (unset) return { ok: false, code: unset[0], facts: { ...known, limit: null } };
  let possibleAtMs = nowMs;
  let possibleCode: EnterNowRateCode | null = null;
  for (const [code, at] of frees) {
    if (at! > possibleAtMs) [possibleAtMs, possibleCode] = [at!, code];
  }

  const handle = top && attributed.length > 0 ? displayLabel({ id: top.userId, displayName: null }) : top ? displayLabel({ id: top.userId, displayName: null }) : null;
  const decision: EnterNowDecisionRecord = {
    entry: "MANUAL",
    condition,
    side,
    ...aggregates,
    lockMarginMs: LOCK_MARGIN_MS,
    baseStake: base,
    binding,
    confirmedStakeTzs: stakeTzs,
    lockedByTopAccountPct: topPct,
    topCounterpartyHandle: condition === "THIN" ? handle : null,
    attributedAccounts: attributed.length,
    ...(condition === "OPENER" && input.openerDraw ? { openerDraw: { ...input.openerDraw } } : {}),
    snapshot: { titleEn: input.view.titleEn, category: input.view.category, cutoff: input.view.selectionClosedAt },
    blackout: false,
  };
  const asked = condition === "THIN" ? (input.rules.thinStakeTzs ?? 0) : (input.rules.openerStakeTzs ?? 0);
  const stakePart = stakeTzs < asked ? `stake ${formatWhole(asked)} cut to ${formatWhole(stakeTzs)} (${binding})` : `stake ${formatWhole(stakeTzs)}`;
  const why =
    condition === "THIN"
      ? `Enter now · thinner side ${side} (players' locked ${opposite(side)} ${formatWhole(lockedOpp)} · raw ${side} ${formatWhole(pools[side].raw)}) · ${stakePart}`
      : `Enter now · empty poll, drawn side ${side} · ${stakePart}`;

  return {
    ok: true,
    entryCondition: condition,
    side,
    stakeTzs,
    binding,
    possibleAt: possibleCode ? new Date(possibleAtMs).toISOString() : null,
    possibleCode,
    decision,
    why,
  };
}

function earliest(a: string | null, b: string | null): string | null {
  if (a == null) return b;
  if (b == null) return a;
  return Date.parse(a) <= Date.parse(b) ? a : b;
}
