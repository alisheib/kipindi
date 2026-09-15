/**
 * DECIDE — whether, when, which side and how much, for the three automatic modes and a targeted reaction
 * (PLAN F4 and §4.4, 04 A11, A12, A15, A16, N2 §4 steps 2–6).
 *
 * ⛔ PURE, AND BLIND ON PURPOSE. Every fact arrives as an argument: the market as `PublicMarketView` (A13), the
 * money as `lockedForHouse`'s aggregates, the random draws through an injected `randomInt`, the opener side
 * through `openerSide` (drawn once per market by `opener-side.ts`) and the information blackout as `blocked`.
 * This module imports neither a store nor `blackout.ts` — `test:house-bot-engine` pins both — so a decision can
 * never read a result check or a staged verdict, and the same inputs always give the same row.
 *
 * ⛔ WRITTEN ONCE. A decision's `why` and `decision` are recorded when the row is inserted and never re-decided;
 * fire re-checks and may skip or shrink, never re-choose. They carry aggregates and `playerHandle` only.
 */
import { exitWindowFacts } from "@/lib/exit-window";
import { windowContains } from "@/lib/house-bot/clock";
import {
  LOCK_MARGIN_MS,
  MIN_TIME_TO_CUTOFF_FLOOR_SEC,
  STALE_AFTER_SEC,
  UD_OBSERVATION_MAX_AGE_SEC,
  UD_VENDOR_BAR_MAX_AGE_SEC,
  type EngineCode,
} from "@/lib/house-bot/constants";
import { expandWindows, formatWhole, type HouseBotRulesV1 } from "@/lib/house-bot/rules";
import type { LockedPool, NewHouseBotIntent } from "../house-bot-dal";
import { bettableFrom, cutoffOf, scopeCode, type PublicMarketView } from "./market-view";

export type DecideSide = "YES" | "NO";
export const oppositeSide = (s: DecideSide): DecideSide => {
  switch (s) {
    case "YES":
      return "NO";
    case "NO":
      return "YES";
    default: {
      const never: never = s;
      throw new Error(`decide: not a binary side ${String(never)}`);
    }
  }
};

/** `crypto.randomInt`-shaped: a whole number in [min, maxInclusive]. Injected so a decision is replayable. */
export type RandomInt = (min: number, maxInclusive: number) => number;

/** A15: the price the closeness rule may use, with its source and age — or why there is none. */
export type UdPrice = { price: number; source: "vendor_bar" | "observation"; ageSec: number } | null;

/** One ACTIVE bot as the trigger or planner loaded it. */
export type DecideBot = {
  botId: string;
  botUserId: string;
  label: string;
  rules: HouseBotRulesV1;
  stakeMinTzs: number | null;
  stakeMaxTzs: number | null;
  capOpenExposureTzs: number | null;
  openExposure: number;
  lastPlacedAt: string | null;
  /** Runtime `bot:<id>.scopeFrom` — the Start instant (A11). */
  scopeFrom: string | null;
  /** Another bot holds this market, or this bot already has a live intent on it (PLAN §4.4, N1 §4.4). */
  marketHeld: boolean;
  /** A money or staff-chosen cap that already refuses any stake here, from the loader's pre-check. */
  capPrecheck: EngineCode | null;
};

export type DecideTarget = {
  targetId: string;
  houseBotId: string;
  delayMinSec: number;
  delayMaxSec: number;
  timingFrom: "STAKE" | "EXIT_CLOSE";
  reactTo: "FIRST" | "EVERY";
  effectiveFrom: string;
};

export type DecidedRow = {
  houseBotId: string;
  botUserId: string;
  kind: "COUNTER" | "FILL" | "OPENER";
  marketId: string;
  productLine: "MARKET" | "UPDOWN";
  triggerPositionId: string | null;
  triggerUserId: string | null;
  targetId: string | null;
  side: DecideSide;
  stakeTzs: number;
  dueAt: string;
  deadlineAt: string;
  staleAt: string;
  status: "PENDING" | "SKIPPED" | "EXPIRED";
  reasonCode: EngineCode | null;
  why: string;
  decision: Record<string, unknown>;
};

/** No row: the stake or market is outside every scope. `code` is for the caller's once-only alerts (A12). */
export type NoRow = { row: null; code: EngineCode | null };
export type DecideResult = { row: DecidedRow } | NoRow;

const iso = (ms: number) => new Date(ms).toISOString();
const ms = (s: string | null | undefined) => (s == null ? Number.NaN : Date.parse(s));

/** Is this instant inside the bot's saved schedule? A schedule that does not expand is closed. */
export function inSchedule(rules: HouseBotRulesV1, atMs: number): boolean {
  const { intervals, errors } = expandWindows(rules.schedule);
  return errors.length === 0 && windowContains(intervals, atMs);
}

/** Up & Down or polls guards, in seconds, with the 10 s floor on min time to cutoff (PLAN §4.7). */
export function guardsFor(rules: HouseBotRulesV1, product: "MARKET" | "UPDOWN") {
  const ud = product === "UPDOWN";
  return {
    noReactZoneSec: ud ? rules.guards.noReactZoneUdSec : rules.guards.noReactZonePollsMin * 60,
    minTimeToCutoffSec: Math.max(MIN_TIME_TO_CUTOFF_FLOOR_SEC, ud ? rules.guards.minTimeToCutoffUdSec : rules.guards.minTimeToCutoffPollsMin * 60),
  };
}

/**
 * A15 closeness: `|price − open|·100 ≤ closenessPct · min(upTarget − open, open − downTarget)`. Checked against
 * BOTH targets, on a fresh price only.
 */
export function udCloseness(view: PublicMarketView, price: UdPrice, closenessPct: number): EngineCode | null {
  const r = view.round;
  if (!r || r.openPrice == null || r.upTarget == null || r.downTarget == null) return "UD_NO_PRICE";
  const margin = Math.min(r.upTarget - r.openPrice, r.openPrice - r.downTarget);
  if (!(margin > 0)) return "UD_NO_PRICE";
  if (price == null) return "UD_STALE_PRICE";
  const maxAge = price.source === "vendor_bar" ? UD_VENDOR_BAR_MAX_AGE_SEC : UD_OBSERVATION_MAX_AGE_SEC;
  if (!(price.ageSec < maxAge)) return "UD_STALE_PRICE";
  return Math.abs(price.price - r.openPrice) * 100 <= closenessPct * margin ? null : "UD_CLOSENESS";
}

/** Amount before cuts: % of the trigger or fixed, jittered by ± `jitterPct`, floored to round-to. */
function shapedAmount(rules: HouseBotRulesV1, triggerStake: number, randomInt: RandomInt): number {
  const a = rules.counter.amount;
  const base = a.kind === "PCT" ? Math.floor((triggerStake * a.pct) / 100) : a.fixedTzs;
  const j = rules.shaping.jitterPct;
  const jittered = j > 0 ? Math.floor((base * (100 + randomInt(-j, j))) / 100) : base;
  return floorTo(jittered, rules.shaping.roundToTzs);
}

const floorTo = (n: number, step: number) => (step > 0 ? Math.floor(Math.max(0, n) / step) * step : Math.max(0, Math.floor(n)));

/** Clamp to the bot's and the platform's maximum, then refuse below the larger minimum (A7). */
function clampStake(stake: number, bot: DecideBot, bounds: { min: number; max: number }): { stake: number; ok: boolean } {
  const capped = floorTo(Math.min(stake, bot.stakeMaxTzs ?? 0, bounds.max), bot.rules.shaping.roundToTzs);
  const min = bot.stakeMinTzs == null ? Number.POSITIVE_INFINITY : Math.max(bot.stakeMinTzs, bounds.min);
  return { stake: capped, ok: capped >= min };
}

/**
 * PLAN §4.4 bot choice: the lowest open-exposure share, then the least recent bet, then the id. A bot whose
 * exposure cap is not set sorts last — it cannot bet at all.
 */
export function orderBots<T extends Pick<DecideBot, "botId" | "openExposure" | "capOpenExposureTzs" | "lastPlacedAt">>(bots: readonly T[]): T[] {
  const share = (b: T) => (b.capOpenExposureTzs && b.capOpenExposureTzs > 0 ? b.openExposure / b.capOpenExposureTzs : Number.POSITIVE_INFINITY);
  const last = (b: T) => (b.lastPlacedAt ? Date.parse(b.lastPlacedAt) : Number.NEGATIVE_INFINITY);
  return [...bots].sort((a, b) => share(a) - share(b) || last(a) - last(b) || (a.botId < b.botId ? -1 : a.botId > b.botId ? 1 : 0));
}

const productOf = (view: PublicMarketView): "MARKET" | "UPDOWN" => (view.productLine === "UPDOWN" ? "UPDOWN" : "MARKET");

/**
 * The saved rules' scope for this market (C14): the product on and the chain or category listed, and — when `mode` is
 * given — that mode on. Fire asks with `mode` null for staff-chosen rows, which no automatic mode governs (ruling 66).
 */
export function rulesCover(r: HouseBotRulesV1, view: PublicMarketView, mode: "counter" | "fill" | "opener" | null): boolean {
  if (productOf(view) === "UPDOWN") {
    return r.scope.products.updown && (mode == null || r.modes.updown[mode]) && view.round != null && (r.scope.chains as string[]).includes(view.round.chainKey);
  }
  return r.scope.products.polls && (mode == null || r.modes.polls[mode]) && (r.scope.categories as string[]).includes(view.category);
}

/** The bot's scope for this market: product on, the mode on, and the chain or category listed (C14). */
export function botCovers(bot: DecideBot, view: PublicMarketView, mode: "counter" | "fill" | "opener"): boolean {
  return rulesCover(bot.rules, view, mode);
}

/* ═══ COUNTER ═══════════════════════════════════════════════════════════════════════════════════ */

export type CounterInput = {
  view: PublicMarketView;
  trigger: { positionId: string; userId: string; handle: string; side: DecideSide; stakeTzs: number; placedAt: string };
  /** `PENALTY_BOX` or `HOLDER_RECRUIT` when the trigger filter refused the account; null when it passed. */
  filtered: "PENALTY_BOX" | "HOLDER_RECRUIT" | null;
  /** Runtime `global.scopeFrom` — the switch-on instant (A11). */
  globalScopeFrom: string | null;
  /** ACTIVE bots whose rules parse. */
  bots: readonly DecideBot[];
  /**
   * The ACTIVE target on this poll, when its bot is one of `bots` (N2 §4 step 2 (a)). `staffChosenRoomTzs` is the
   * staff-chosen TZS the bot and the platform have left today, the smaller of the two (N2 §4 step 6; C4-SPEC ruling 94).
   */
  target: (DecideTarget & { drawnDelaySec: number; lockedAtDue: number | null; staffChosenRoomTzs: number }) | null;
  /** `lockedForHouse` at the pass instant. */
  pools: LockedPool;
  price: UdPrice;
  blocked: boolean;
  bounds: { min: number; max: number };
  /** The sweep's `passNow` (N2 §4 step 2), database time. */
  passNow: string;
};

/**
 * One row per trigger: the first eligible candidate's reaction, or ONE SKIPPED row naming why none reacted
 * (PLAN §4.3), or no row when the stake is outside every scope (A11, A12).
 */
export function decideCounter(input: CounterInput, deps: { randomInt: RandomInt }): DecideResult {
  const { view, trigger } = input;
  const scope = scopeCode(view);
  if (scope) return { row: null, code: scope };
  if (view.status !== "LIVE") return { row: null, code: "MARKET_NOT_LIVE" };
  const placedMs = ms(trigger.placedAt);
  // A11 · a NULL scope start is OUT of scope, never "no bound" (C4-SPEC ruling 92).
  if (input.globalScopeFrom == null || placedMs < ms(input.globalScopeFrom)) return { row: null, code: null };

  const product = productOf(view);
  const cutoffMs = ms(cutoffOf(view));
  const exit = exitWindowFacts({
    placedAtMs: placedMs,
    closesAtMs: ms(view.selectionClosedAt ?? view.resolutionAt),
    freeExitGraceMinutes: view.exitRates.graceMin,
    paidExitWindowMinutes: view.exitRates.paidMin,
  });
  const botSide = oppositeSide(trigger.side);
  const snapshot = {
    titleEn: view.titleEn,
    category: view.category,
    cutoff: cutoffOf(view),
    roundNumber: view.round?.roundNumber ?? null,
    rawYes: input.pools.YES.raw,
    rawNo: input.pools.NO.raw,
  };
  const passNowMs = ms(input.passNow);

  const inBotScope = input.bots.filter((b) => b.scopeFrom != null && placedMs >= ms(b.scopeFrom) && botCovers(b, view, "counter"));
  const targetBot = input.target ? input.bots.find((b) => b.botId === input.target!.houseBotId) ?? null : null;
  const targetEligible =
    input.target && targetBot && product === "MARKET" && ms(input.target.effectiveFrom) <= placedMs
      && targetBot.scopeFrom != null && placedMs >= ms(targetBot.scopeFrom)
      && targetBot.rules.targeting.enabled && targetBot.rules.scope.products.polls
      && (targetBot.rules.scope.categories as string[]).includes(view.category)
      ? { target: input.target, bot: targetBot }
      : null;
  if (!targetEligible && inBotScope.length === 0) return { row: null, code: null };

  const base = (bot: DecideBot, extra: Partial<DecidedRow>): DecidedRow => ({
    houseBotId: bot.botId,
    botUserId: bot.botUserId,
    kind: "COUNTER",
    marketId: view.id,
    productLine: product,
    triggerPositionId: trigger.positionId,
    triggerUserId: trigger.userId,
    targetId: null,
    side: botSide,
    // C4-SPEC ruling 120 · a row decided NOT to react records the smallest stake the bot could have placed here (the
    // schema holds every intent's stake to 1 … 1,000,000,000); a reacting row overrides it with the decided stake.
    stakeTzs: Math.max(1, bot.stakeMinTzs ?? input.bounds.min, input.bounds.min),
    dueAt: trigger.placedAt,
    deadlineAt: iso(cutoffMs),
    staleAt: trigger.placedAt,
    status: "SKIPPED",
    reasonCode: null,
    why: "",
    decision: {},
    ...extra,
  });
  const counterWhy = (bot: DecideBot, tail: string) =>
    `Counter · ${trigger.handle} ${trigger.side} ${formatWhole(trigger.stakeTzs)} on ${view.round ? `round #${view.round.roundNumber}` : `“${view.titleEn}”`} · ${bot.label} · ${tail}`;

  // Filtered accounts still leave one visible row when some bot covers the market (PLAN §4.3).
  if (input.filtered) {
    const bot = targetEligible?.bot ?? orderBots(inBotScope)[0];
    return {
      row: base(bot, {
        reasonCode: input.filtered,
        why: counterWhy(bot, input.filtered === "PENALTY_BOX" ? "not countered — this player is in today's penalty box" : "not countered — the player was recruited by a bot holder"),
        decision: { entry: "AUTO", code: input.filtered, snapshot },
        targetId: targetEligible?.target.targetId ?? null,
      }),
    };
  }

  // A16: a reopened market takes no new reaction; a stopped chain or disabled asset neither.
  const marketCode: EngineCode | null = view.reopenedAt
    ? "MARKET_REOPENED"
    : view.round && (!view.round.chainRunning || !view.round.assetEnabled)
      ? "CHAIN_NOT_RUNNING"
      : null;

  let targetSkipped: { targetId: string; code: EngineCode } | null = null;
  const guards = (bot: DecideBot) => guardsFor(bot.rules, product);

  // N2 §4 step 3 · the target candidate.
  if (targetEligible) {
    const { target, bot } = targetEligible;
    const g = guards(bot);
    const { requestedMs, dueMs } = targetDueAt({ placedAtMs: placedMs, exitCloseAtMs: exit.exitCloseAtMs, timingFrom: target.timingFrom, delaySec: target.drawnDelaySec });
    const deadlineMs = cutoffMs - g.minTimeToCutoffSec * 1000;
    let code: EngineCode | null = marketCode;
    if (!code && !inSchedule(bot.rules, placedMs)) code = "OUTSIDE_SCHEDULE";
    if (!code && (trigger.stakeTzs < bot.rules.counter.triggerStakeMinTzs || trigger.stakeTzs > bot.rules.counter.triggerStakeMaxTzs)) code = "TRIGGER_STAKE_RANGE";
    if (!code && !(placedMs < cutoffMs - g.noReactZoneSec * 1000)) code = "NO_REACT_ZONE";
    if (!code && dueMs > deadlineMs) code = requestedMs <= deadlineMs ? "EXIT_WINDOW_TOO_LATE" : "CUTOFF";
    if (!code && bot.marketHeld) code = "MARKET_HELD";
    if (!code && input.blocked) code = "INFO_BLACKOUT";
    if (!code && bot.capPrecheck) code = bot.capPrecheck;
    let stake = 0;
    if (!code) {
      const cut = (target.lockedAtDue ?? 0) - input.pools[botSide].raw;
      // N2 §4 step 6 · never past the staff-chosen TZS left today (a missing figure is no room: the clamp fails closed).
      const clamped = clampStake(Math.min(shapedAmount(bot.rules, trigger.stakeTzs, deps.randomInt), cut, target.staffChosenRoomTzs), bot, input.bounds);
      stake = clamped.stake;
      if (!clamped.ok) code = "STAKE_BELOW_MIN";
    }
    if (!code) {
      const staleMs = dueMs + STALE_AFTER_SEC.targetedCounter * 1000;
      const expired = passNowMs >= staleMs;
      const heldToExit = dueMs > requestedMs;
      return {
        row: base(bot, {
          targetId: target.targetId,
          stakeTzs: stake,
          dueAt: iso(dueMs),
          deadlineAt: iso(deadlineMs),
          staleAt: iso(staleMs),
          status: expired ? "EXPIRED" : "PENDING",
          reasonCode: expired ? "STALE" : null,
          why: `Target · ${trigger.handle} ${trigger.side} ${formatWhole(trigger.stakeTzs)} on “${view.titleEn}” · asked ${target.drawnDelaySec} s after the ${target.timingFrom === "STAKE" ? "stake" : "exit closing"}${heldToExit ? " → held to the player's exit + 7 s" : ""} · ${formatWhole(stake)} ${botSide}`,
          decision: {
            entry: "TARGET", targetId: target.targetId, delaySec: target.drawnDelaySec, timingFrom: target.timingFrom, reactTo: target.reactTo,
            requestedDueAt: iso(requestedMs), heldToExit, lockMarginMs: LOCK_MARGIN_MS, exitCloseAt: iso(exit.exitCloseAtMs), snapshot,
          },
        }),
      };
    }
    targetSkipped = { targetId: target.targetId, code };
  }

  // N2 §4 step 2 (b) · scope bots in PLAN §4.4 order, excluding the target's bot.
  const scopeBots = orderBots(inBotScope.filter((b) => b.botId !== targetEligible?.bot.botId));
  let firstCode: { bot: DecideBot; code: EngineCode } | null = null;
  for (const bot of scopeBots) {
    const g = guards(bot);
    const delaySec = deps.randomInt(bot.rules.counter.delayMinSec, bot.rules.counter.delayMaxSec);
    const requestedMs = placedMs + delaySec * 1000;
    // PLAN F4 for the untargeted COUNTER: held to the exit close, NO lock margin (N1 §4.1).
    const dueMs = Math.max(requestedMs, exit.exitCloseAtMs);
    const deadlineMs = cutoffMs - g.minTimeToCutoffSec * 1000;
    let code: EngineCode | null = marketCode;
    if (!code && !inSchedule(bot.rules, placedMs)) code = "OUTSIDE_SCHEDULE";
    const total = input.pools.YES.raw + input.pools.NO.raw;
    if (!code && (total < bot.rules.scope.poolTotalMinTzs || (bot.rules.scope.poolTotalMaxTzs != null && total > bot.rules.scope.poolTotalMaxTzs))) code = "POOL_BAND";
    if (!code && product === "MARKET" && cutoffMs - placedMs < bot.rules.scope.skipPollsClosingWithinMin * 60_000) code = "CUTOFF";
    if (!code && (trigger.stakeTzs < bot.rules.counter.triggerStakeMinTzs || trigger.stakeTzs > bot.rules.counter.triggerStakeMaxTzs)) code = "TRIGGER_STAKE_RANGE";
    if (!code && !(placedMs < cutoffMs - g.noReactZoneSec * 1000)) code = "NO_REACT_ZONE";
    if (!code && dueMs > deadlineMs) code = requestedMs <= deadlineMs ? "EXIT_WINDOW_TOO_LATE" : "CUTOFF";
    if (!code && product === "UPDOWN") code = udCloseness(view, input.price, bot.rules.updown.closenessPct);
    if (!code && bot.marketHeld) code = "MARKET_HELD";
    if (!code && bot.capPrecheck) code = bot.capPrecheck;
    if (!code && deps.randomInt(1, 100) > bot.rules.counter.reactProbabilityPct) code = "NOT_REACTING";
    let stake = 0;
    let asked = 0;
    if (!code) {
      asked = shapedAmount(bot.rules, trigger.stakeTzs, deps.randomInt);
      // PLAN F4: bot side + stake ≤ the trigger side's non-house pool; fire re-cuts on `lockedA15` (A15).
      const cut = input.pools[trigger.side].nonHouse - input.pools[botSide].raw;
      const clamped = clampStake(Math.min(asked, cut), bot, input.bounds);
      stake = clamped.stake;
      if (!clamped.ok) code = "STAKE_BELOW_MIN";
    }
    if (code) {
      firstCode ??= { bot, code };
      continue;
    }
    const staleMs = dueMs + (product === "UPDOWN" ? STALE_AFTER_SEC.updown : STALE_AFTER_SEC.polls) * 1000;
    const held = dueMs > requestedMs;
    return {
      row: base(bot, {
        stakeTzs: stake,
        dueAt: iso(dueMs),
        deadlineAt: iso(deadlineMs),
        staleAt: iso(staleMs),
        status: passNowMs >= staleMs ? "EXPIRED" : "PENDING",
        reasonCode: passNowMs >= staleMs ? "STALE" : null,
        why: counterWhy(bot, `delay ${delaySec}s${held ? " → held to the player's exit" : ""} · ${stake < asked ? `${formatWhole(asked)} cut to ${formatWhole(stake)}` : formatWhole(stake)} ${botSide}`),
        decision: {
          entry: "AUTO", delaySec, requestedDueAt: iso(requestedMs), held, exitCloseAt: iso(exit.exitCloseAtMs), askedStakeTzs: asked,
          ...(product === "UPDOWN" && input.price ? { price: input.price.price, priceSource: input.price.source, priceAgeSec: input.price.ageSec } : {}),
          ...(targetSkipped ? { targetSkipped } : {}),
          snapshot,
        },
      }),
    };
  }

  // Step 5 · none eligible: ONE SKIPPED row, carrying the target's code when a target was evaluated.
  const skipBot = targetSkipped ? targetEligible!.bot : firstCode!.bot;
  const code = targetSkipped ? targetSkipped.code : firstCode!.code;
  return {
    row: base(skipBot, {
      targetId: targetSkipped?.targetId ?? null,
      reasonCode: code,
      why: counterWhy(skipBot, `not countered (${code})`),
      decision: { entry: targetSkipped ? "TARGET" : "AUTO", code, snapshot },
    }),
  };
}

/**
 * N2 §4 step 5 · the ONE due-time formula for a targeted reaction (C4-SPEC ruling 108): requested = the stake or the
 * exit close + the drawn delay; due = max(requested, exit close + LOCK_MARGIN_MS). `decideCounter` and the trigger's
 * loader (which reads `lockedForHouse` as of `dueMs`) both call it.
 */
export function targetDueAt(input: { placedAtMs: number; exitCloseAtMs: number; timingFrom: "STAKE" | "EXIT_CLOSE"; delaySec: number }): { requestedMs: number; dueMs: number } {
  const requestedMs = (input.timingFrom === "STAKE" ? input.placedAtMs : input.exitCloseAtMs) + input.delaySec * 1000;
  return { requestedMs, dueMs: Math.max(requestedMs, input.exitCloseAtMs + LOCK_MARGIN_MS) };
}

/**
 * A decision as the row the store inserts. The caller mints the id and names the anchor (a COUNTER's trigger
 * position, a FILL's or OPENER's market); a row decided terminal (SKIPPED, EXPIRED) is finished at the decision.
 */
export function intentRowOf(row: DecidedRow, o: { id: string; anchorKey: string; nowIso: string }): NewHouseBotIntent {
  return {
    id: o.id, houseBotId: row.houseBotId, botUserId: row.botUserId, kind: row.kind, marketId: row.marketId, productLine: row.productLine,
    anchorKey: o.anchorKey, triggerPositionId: row.triggerPositionId, triggerUserId: row.triggerUserId, targetId: row.targetId,
    requestedById: null, entryCondition: null, side: row.side, stakeTzs: row.stakeTzs, dueAt: row.dueAt, deadlineAt: row.deadlineAt,
    staleAt: row.staleAt, status: row.status, reasonCode: row.reasonCode, why: row.why, decision: row.decision, attempts: 0,
    transientAttempts: 0, nextAttemptAt: null, claimedBy: null, claimedUntil: null, positionId: null,
    finishedAt: row.status === "PENDING" ? null : o.nowIso, alertedAt: null,
  };
}

/** N2 §4 step 5: the target's delay, drawn BEFORE the loader reads `lockedForHouse` as of the due time. */
export function drawTargetDelay(target: Pick<DecideTarget, "delayMinSec" | "delayMaxSec">, randomInt: RandomInt): number {
  return target.delayMinSec === target.delayMaxSec ? target.delayMinSec : randomInt(target.delayMinSec, target.delayMaxSec);
}

/* ═══ FILL and OPENER (planner) ═══════════════════════════════════════════════════════════════ */

export type PlanInput = {
  view: PublicMarketView;
  bot: DecideBot;
  pools: LockedPool;
  price: UdPrice;
  bounds: { min: number; max: number };
  globalScopeFrom: string | null;
  passNow: string;
};

/**
 * FILL (PLAN F4, A15 as amended by N1 §4.1). The thin side S is below the target share of the raw pools while
 * the other side holds eligible locked money. The stake brings S up to that share of the OTHER side's locked
 * money — `floor(locked(opp) · p / (100 − p)) − raw(S)` — and never past H3's `raw(S) + stake ≤ locked(opp)`
 * (C4-SPEC ruling 39). Due at `cutoff − lead − jitter`, never before the pass.
 */
export function planFill(input: PlanInput, deps: { randomInt: RandomInt }): DecideResult {
  const { view, bot, pools } = input;
  const scope = scopeCode(view);
  if (scope) return { row: null, code: scope };
  if (view.status !== "LIVE" || view.reopenedAt || !botCovers(bot, view, "fill")) return { row: null, code: null };
  if (view.round && (!view.round.chainRunning || !view.round.assetEnabled)) return { row: null, code: null };
  const product = productOf(view);
  const r = bot.rules;
  const cutoffMs = ms(cutoffOf(view));
  const leadMs = (product === "UPDOWN" ? r.fill.leadUdSec : r.fill.leadPollsMin * 60) * 1000;
  if (input.globalScopeFrom == null || bot.scopeFrom == null) return { row: null, code: null }; // ruling 92
  const scopeFromMs = Math.max(ms(input.globalScopeFrom), ms(bot.scopeFrom));
  if (cutoffMs - leadMs < scopeFromMs) return { row: null, code: null };

  const p = r.fill.targetThinSharePct;
  const thin = (["YES", "NO"] as const).find((s) => {
    const opp = oppositeSide(s);
    const total = pools[s].raw + pools[opp].raw;
    return pools[opp].locked > 0 && pools[s].raw * 100 < p * total;
  });
  if (!thin) return { row: null, code: null };
  const opp = oppositeSide(thin);
  const passNowMs = ms(input.passNow);
  const jitterMs = r.fill.jitterSec > 0 ? deps.randomInt(0, r.fill.jitterSec) * 1000 : 0;
  const dueMs = Math.max(cutoffMs - leadMs - jitterMs, passNowMs);
  const g = guardsFor(r, product);
  const deadlineMs = cutoffMs - g.minTimeToCutoffSec * 1000;
  if (dueMs > deadlineMs) return { row: null, code: null };
  if (product === "UPDOWN" && udCloseness(view, input.price, r.updown.closenessPct)) return { row: null, code: null };
  if (bot.marketHeld || bot.capPrecheck || !inSchedule(r, dueMs)) return { row: null, code: null };

  const wanted = Math.floor((pools[opp].locked * p) / (100 - p)) - pools[thin].raw;
  const room = pools[opp].locked - pools[thin].raw;
  const clamped = clampStake(Math.min(wanted, room), bot, input.bounds);
  if (!clamped.ok) return { row: null, code: null };
  const staleMs = dueMs + (product === "UPDOWN" ? STALE_AFTER_SEC.updown : STALE_AFTER_SEC.polls) * 1000;
  return {
    row: {
      houseBotId: bot.botId, botUserId: bot.botUserId, kind: "FILL", marketId: view.id, productLine: product,
      triggerPositionId: null, triggerUserId: null, targetId: null, side: thin, stakeTzs: clamped.stake,
      dueAt: iso(dueMs), deadlineAt: iso(deadlineMs), staleAt: iso(staleMs), status: "PENDING", reasonCode: null,
      why: `Fill · ${bot.label} · thin side ${thin} (raw ${formatWhole(pools[thin].raw)} · players' locked ${opp} ${formatWhole(pools[opp].locked)}) · ${formatWhole(clamped.stake)} to reach ${p}%`,
      decision: {
        entry: "AUTO", targetSharePct: p, rawYes: pools.YES.raw, rawNo: pools.NO.raw, lockedYes: pools.YES.locked, lockedNo: pools.NO.locked,
        wantedTzs: wanted, lockMarginMs: LOCK_MARGIN_MS,
        snapshot: { titleEn: view.titleEn, category: view.category, cutoff: cutoffOf(view), roundNumber: view.round?.roundNumber ?? null },
      },
    },
  };
}

/**
 * OPENER (PLAN F4, §18 row). While BOTH raw pools are 0, a small stake on the side drawn once for this market.
 * Due at `bettableFrom + delay`, only when `bettableFrom` is inside scope (A11) and the due time fits (A15).
 */
export function planOpener(input: PlanInput & { openerSide: DecideSide }, deps: { randomInt: RandomInt }): DecideResult {
  const { view, bot, pools } = input;
  const scope = scopeCode(view);
  if (scope) return { row: null, code: scope };
  if (view.status !== "LIVE" || view.reopenedAt || !botCovers(bot, view, "opener")) return { row: null, code: null };
  if (view.round && (!view.round.chainRunning || !view.round.assetEnabled)) return { row: null, code: null };
  if (pools.YES.raw !== 0 || pools.NO.raw !== 0) return { row: null, code: null };
  const product = productOf(view);
  const r = bot.rules;
  const fromMs = ms(bettableFrom(view));
  if (input.globalScopeFrom == null || bot.scopeFrom == null) return { row: null, code: null }; // ruling 92
  const scopeFromMs = Math.max(ms(input.globalScopeFrom), ms(bot.scopeFrom));
  if (fromMs < scopeFromMs) return { row: null, code: null };
  const delaySec = product === "UPDOWN"
    ? deps.randomInt(r.opener.delayUdMinSec, r.opener.delayUdMaxSec)
    : deps.randomInt(r.opener.delayPollsMinMin, r.opener.delayPollsMaxMin) * 60;
  const cutoffMs = ms(cutoffOf(view));
  const g = guardsFor(r, product);
  const deadlineMs = cutoffMs - g.minTimeToCutoffSec * 1000;
  const dueMs = Math.max(fromMs + delaySec * 1000, ms(input.passNow));
  if (dueMs > deadlineMs) return { row: null, code: null };
  if (product === "UPDOWN" && udCloseness(view, input.price, r.updown.closenessPct)) return { row: null, code: null };
  if (bot.marketHeld || bot.capPrecheck || !inSchedule(r, dueMs)) return { row: null, code: null };
  const drawn = floorTo(deps.randomInt(r.opener.stakeMinTzs, r.opener.stakeMaxTzs), r.shaping.roundToTzs);
  const clamped = clampStake(drawn, bot, input.bounds);
  if (!clamped.ok) return { row: null, code: null };
  const staleMs = dueMs + (product === "UPDOWN" ? STALE_AFTER_SEC.updown : STALE_AFTER_SEC.polls) * 1000;
  return {
    row: {
      houseBotId: bot.botId, botUserId: bot.botUserId, kind: "OPENER", marketId: view.id, productLine: product,
      triggerPositionId: null, triggerUserId: null, targetId: null, side: input.openerSide, stakeTzs: clamped.stake,
      dueAt: iso(dueMs), deadlineAt: iso(deadlineMs), staleAt: iso(staleMs), status: "PENDING", reasonCode: null,
      why: `Opener · ${bot.label} · empty ${product === "UPDOWN" ? "round" : "poll"}, drawn side ${input.openerSide} · ${formatWhole(clamped.stake)} ${delaySec}s after it opened`,
      decision: {
        entry: "AUTO", delaySec, bettableFrom: bettableFrom(view),
        snapshot: { titleEn: view.titleEn, category: view.category, cutoff: cutoffOf(view), roundNumber: view.round?.roundNumber ?? null },
      },
    },
  };
}
