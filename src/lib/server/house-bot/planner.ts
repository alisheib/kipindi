/**
 * THE PLANNER'S PASS — every 15 s, on the one leader (PLAN §4.2, 04 N1 §4.3 pass order, N1 §4.5, N2 §4 step 9, A7,
 * A8, A10, A16, A19, A24, F4, F5, PLAN §3; C4-SPEC rulings 71–100, 111–112).
 *
 * `engine.ts` takes the 45 s lease and calls `plannerTick`; this module never takes it again.
 *
 * ⛔ THE ORDER (ruling 71). N1's steps 1–7 in N1's order — deadline · STALE · POISON · press · audit lease repair ·
 * A8 alert repair · `endTargets` — then 7a the A16 PENDING sweep · 7b rules-parse outcomes · 7c F5 `revalidateLive`
 * · 7d realised-loss stops · 7e WALLET_MISSING · 7f FILL/OPENER planning (master ON only); then once a minute the
 * oversight passes and hourly the summaries and the instance-row prune. Every pause and stop runs BEFORE anything
 * plans a stake, so a pass never plans a FILL for a bot it is about to pause.
 *
 * ⛔ ONE DUTY NEVER SKIPS ANOTHER. Each duty runs in its own try/catch; a failure is recorded by duty name (no ids).
 *
 * ⛔ EVERY EFFECT IS CONDITIONAL (A24). Expiry, pauses, the switch-off and target ends are conditional writes with
 * RETURNING; every alert is an AlertOnce claim. A failover double leader writes one event and sends one alert.
 *
 * ⛔ THE BEAT FOLLOWS THE MONEY-SAFETY DUTIES (ruling 98). `beat:planner` is written only when expiry, STALE, POISON
 * and the loss stops all ran, so a planner that cannot stop losses looks stale, and a failing summary does not.
 */
import { createHash, randomInt as cryptoRandomInt } from "node:crypto";
import { eatDayKey, eatHourKey } from "@/lib/house-bot/clock";
import {
  ALERT_KEY,
  HOUSE_CONTROL_ID,
  HOUSE_PRODUCTS,
  PLANNER_INTERVAL_MS,
  RULES_FUTURE_ALERT_AFTER_MS,
  RUNTIME_KEY,
  SWEEP_LOOKBACK_MS,
  SWEEP_PAGE_SIZE,
  type TargetEndCause,
} from "@/lib/house-bot/constants";
import { HOUSE_LIMITS_SCHEMA_VERSION, effectiveTargetTiming, minGapFloorSec, parseHouseBotRules, type HouseBotRulesV1, type ParseContext } from "@/lib/house-bot/rules";
import { getGlobalConfig } from "../market-config";
import { RATE_RULES } from "../rate-limit";
import { db } from "../store";
import { stakeBoundsForMarket } from "../market-service";
import {
  houseBookStore, houseBotControlStore, houseBotEventStore, houseBotIntentStore, houseBotRuntimeStore, houseBotStore, houseSeamStore,
  newHouseId, pressStore, targetStore, type StoredHouseBot, type StoredHouseBotControl,
} from "../house-bot-dal";
import { houseDayBook, houseDayBooks } from "./book";
import { alertOnce, engineAudit, engineSwitchOff, stopBot, type EngineAlerts } from "./outcomes";
import type { EngineState, EngineTicks, TickContext } from "./engine";
import { botCovers, guardsFor, intentRowOf, orderBots, planFill, planOpener, type DecideBot, type DecideResult, type RandomInt } from "./decide";
import type { LockedPool, LockedPoolSide } from "../house-bot-dal";
import { cutoffOf, projectMarketView, scopeCode } from "./market-view";
import { lockedForHouse, lockedPoolInputsOfView } from "./pools";
import { udPriceForDecision } from "./ud-price";
import { infoBlackout } from "./blackout";
import { marketHeld } from "./enter-now";
import { openerSide, type DrawRandomInt } from "./opener-side";
import { loadParseContext } from "./rules-context";
import { capPrecheck, loadCapFacts } from "./cap-precheck";
import { pressAuditEntry, writePressAudit } from "./press-audit";
import { oversightPass } from "./oversight";

/** How many repair rows one pass takes (presses, alerts); the rest wait for the next pass. */
export const PLANNER_REPAIR_BATCH = 50;
/** Pages of the FILL/OPENER scan per kind and product per pass (ruling 91). */
export const PLANNER_SCAN_MAX_PAGES = 5;
/** FILL/OPENER are planned only for cutoffs at least this far ahead (the 10 s `minTimeToCutoff` floor). */
export const PLANNER_MIN_CUTOFF_AHEAD_MS = 10_000;
/** Oversight cadence (N1 §4.3 step 8). */
export const OVERSIGHT_EVERY_MS = 60_000;

export type LiveBounds = { minStake: number; maxStake: number; refillPerMin: number };

export type PlannerDeps = {
  alerts: EngineAlerts;
  /** `crypto.randomInt`-shaped, inclusive. Injected so a case can fix a draw. */
  randomInt?: RandomInt;
  /** The opener side draw (`randomInt(2)`). */
  drawRandomInt?: DrawRandomInt;
  /** F5's live bounds; the platform config and `bet.place` rule by default. */
  liveBounds?: () => Promise<LiveBounds>;
};

export type DutyName =
  | "deadline" | "stale" | "poison" | "press" | "pressAudit" | "alertRepair" | "endTargets" | "pendingLifecycle"
  | "rulesOutcomes" | "revalidateLive" | "lossStops" | "walletMissing" | "fillOpener" | "oversight" | "hourly";

export type PlannerPass = {
  passNowIso: string;
  /** "ok", "skipped", or "failed: <message>". */
  duties: Partial<Record<DutyName, string>>;
  counts: Record<string, number>;
  beat: boolean;
};

const iso = (ms: number) => new Date(ms).toISOString();
const errMessage = (e: unknown) => String((e as Error)?.message ?? e).replace(/\s+/g, " ").slice(0, 300);
const defaultRandomInt: RandomInt = (min, maxInclusive) => cryptoRandomInt(min, maxInclusive + 1);

async function defaultLiveBounds(): Promise<LiveBounds> {
  const g = await getGlobalConfig();
  return { minStake: g.minStake, maxStake: g.maxStake, refillPerMin: RATE_RULES["bet.place"].refillPerMin };
}

/** F5's `boundsHash`: the first 16 hex characters of sha256 over the live min, max and `bet.place` refill (ruling 84). */
export function boundsHashOf(b: LiveBounds): string {
  return createHash("sha256").update(JSON.stringify([b.minStake, b.maxStake, b.refillPerMin])).digest("hex").slice(0, 16);
}

type ParsedBot = { bot: StoredHouseBot; rules: HouseBotRulesV1 };

/* ═══ The pass ══════════════════════════════════════════════════════════════════════════════════ */

export async function plannerPass(ctx: TickContext, deps: PlannerDeps): Promise<PlannerPass> {
  const { alerts } = deps;
  const randomInt = deps.randomInt ?? defaultRandomInt;
  const nowMs = (await houseBotRuntimeStore.dbClock()).nowMs;
  const out: PlannerPass = { passNowIso: iso(nowMs), duties: {}, counts: {}, beat: false };
  const count = (k: string, n: number) => { out.counts[k] = (out.counts[k] ?? 0) + n; };
  const run = async (name: DutyName, fn: () => Promise<void | "skipped">): Promise<boolean> => {
    try {
      out.duties[name] = (await fn()) ?? "ok";
      return true;
    } catch (e) {
      out.duties[name] = `failed: ${errMessage(e)}`;
      console.error(`[house-bot] planner duty ${name} failed:`, errMessage(e));
      return false;
    }
  };
  const money: boolean[] = [];

  // 1 · deadline · 2 · STALE before POISON · 3 · POISON (N1 §4.3; A10; rulings 72–73)
  money.push(await run("deadline", async () => { count("expiredCutoff", (await houseBotIntentStore.expirePastDeadline()).length); }));
  money.push(await run("stale", async () => { count("expiredStale", (await houseBotIntentStore.expireStale()).length); }));
  money.push(await run("poison", async () => { count("poisoned", await poisonPass(alerts)); }));
  // 4 · press INTERRUPTED, then DONE (N1 §4.5)
  await run("press", async () => {
    count("pressInterrupted", (await pressStore.interruptStale()).length);
    count("pressDone", (await pressStore.doneTerminalQueued()).length);
  });
  // 5 · audit lease repair (ruling 74) · 6 · A8 alert repair
  await run("pressAudit", async () => { const r = await repairPressAudits(); count("pressAudited", r.audited); count("pressUnbuildable", r.unbuildable); });
  await run("alertRepair", async () => { count("alertsRepaired", await repairPlacedAlerts(alerts)); });

  // Read once per pass (ruling 93).
  let parseCtx: ParseContext | null = null;
  const parseContext = async () => (parseCtx ??= await loadParseContext());

  // 7 · endTargets (N2 §4 step 9; ruling 75)
  await run("endTargets", async () => { count("targetsEnded", await endTargets(nowMs, await parseContext())); });
  // 7a · the A16 PENDING sweep (ruling 88)
  await run("pendingLifecycle", async () => { count("pendingSkipped", await sweepPendingLifecycle()); });

  let control: StoredHouseBotControl | null = null;
  let active: ParsedBot[] = [];
  let limitsAhead = false;
  // 7b · rules-parse outcomes and F4's future alert (ruling 100)
  await run("rulesOutcomes", async () => {
    control = await houseBotControlStore.get();
    const r = await rulesOutcomes(nowMs, control, await parseContext(), alerts);
    limitsAhead = r.limitsAhead;
    count("rulesPaused", r.paused);
  });
  // The ACTIVE bots whose rules parse, after 7b's pauses.
  const loadActive = async () => {
    const ctxp = await parseContext();
    active = [];
    for (const bot of await houseBotStore.listNonRemoved()) {
      if (bot.status !== "ACTIVE") continue;
      const parsed = parseHouseBotRules(bot.rules, ctxp);
      if (parsed.ok) active.push({ bot, rules: parsed.rules });
    }
  };
  // 7c · F5 revalidateLive, with A7's stake-min pause (ruling 84)
  await run("revalidateLive", async () => {
    await loadActive();
    control ??= await houseBotControlStore.get();
    count("boundsPaused", await revalidateLive(active, control, alerts, deps.liveBounds ?? defaultLiveBounds));
  });
  // 7d · realised-loss stops (rulings 82–83)
  money.push(await run("lossStops", async () => {
    await loadActive();
    const r = await lossStops(nowMs, active.map((a) => a.bot), await houseBotControlStore.get(), alerts);
    count("lossStoppedBots", r.bots);
    count("globalLossStop", r.global ? 1 : 0);
  }));
  // 7e · WALLET_MISSING (ruling 112)
  await run("walletMissing", async () => { count("walletMissing", await walletMissing(alerts)); });
  // 7f · FILL/OPENER, only while the master is ON and the limits are this build's (P:500; rulings 91, 100)
  await run("fillOpener", async () => {
    const fresh = await houseBotControlStore.get();
    if (!fresh.enabled || limitsAhead) return "skipped";
    await loadActive();
    const r = await planFillAndOpener(nowMs, ctx.state, fresh, active, { randomInt, drawRandomInt: deps.drawRandomInt });
    count("filled", r.fill);
    count("opened", r.opener);
  });

  // 8 · once a minute: oversight (ruling 77)
  const marks = ctx.state.planner;
  if (marks.oversightAtMs == null || nowMs - marks.oversightAtMs >= OVERSIGHT_EVERY_MS) {
    if (await run("oversight", async () => {
      const r = await oversightPass(alerts, nowMs);
      count("oversightVoided", r.voided);
      count("oversightSelfDecided", r.selfDecided);
    })) marks.oversightAtMs = nowMs;
  }
  // 9 · hourly: summaries and the instance-row prune (rulings 80, 87), while the EAT minute is 1–58
  const minuteOfHour = Math.floor((nowMs % 3_600_000) / 60_000);
  const hourKey = eatHourKey(nowMs);
  if (marks.hourlyKey !== hourKey && minuteOfHour >= 1 && minuteOfHour <= 58) {
    if (await run("hourly", async () => {
      const r = await hourlyDuties(nowMs, await houseBotControlStore.get(), alerts);
      count("summaries", r.summaries);
      count("instanceRowsPruned", r.pruned);
    })) marks.hourlyKey = hourKey;
  }

  if (money.every(Boolean)) {
    try {
      await houseBotRuntimeStore.beat(RUNTIME_KEY.plannerBeat);
      out.beat = true;
    } catch (e) {
      console.error("[house-bot] planner beat failed:", errMessage(e));
    }
  }
  return out;
}

/** The engine's planner tick for `startHouseBotEngine`. Alerts are required (ruling 46). */
export function plannerTicks(alerts: EngineAlerts): Pick<EngineTicks, "plannerTick"> {
  return {
    plannerTick: async (ctx) => {
      await plannerPass(ctx, { alerts });
    },
  };
}

/* ═══ 3 · POISON (A10, A19; ruling 73) ═════════════════════════════════════════════════════════ */

async function poisonPass(alerts: EngineAlerts): Promise<number> {
  const ids = await houseBotIntentStore.poison();
  if (ids.length === 0) return 0;
  // ONE audit for the pass, never one per intent (A19 "no row per intent").
  await engineAudit("house_bot.poison", { type: "HouseBotControl", id: HOUSE_CONTROL_ID }, { cause: "POISON", counts: { poisoned: ids.length } });
  for (const id of ids) {
    try {
      await alertOnce(ALERT_KEY.poison(id), alerts, { code: "POISON", intentId: id });
    } catch (e) {
      // The claim was given back; the row is FAILED(POISON) either way. The next pass does not re-find it, so log.
      console.error("[house-bot] poison alert failed:", errMessage(e));
    }
  }
  return ids.length;
}

/* ═══ 5 · the press audit lease repair (N1 §4.5; ruling 74) ═══════════════════════════════════ */

async function repairPressAudits(): Promise<{ audited: number; unbuildable: number }> {
  let audited = 0, unbuildable = 0;
  for (const press of await pressStore.listAuditRepair(PLANNER_REPAIR_BATCH)) {
    const leased = await pressStore.claimAuditLease(press.id);
    if (!leased) continue;
    const intent = leased.intentId ? await houseBotIntentStore.get(leased.intentId) : null;
    const events = await houseBotEventStore.listForPress(leased);
    const bot = await houseBotStore.get(leased.houseBotId);
    const entry = pressAuditEntry(leased, { intent, events, holderUserId: bot?.userId ?? null });
    if (!entry) { unbuildable++; continue; }
    const auditId = await writePressAudit(leased, entry);
    if (auditId && (await pressStore.setAuditId(leased.id, auditId))) audited++;
  }
  return { audited, unbuildable };
}

/* ═══ 6 · the A8 alert repair ════════════════════════════════════════════════════════════════════ */

async function repairPlacedAlerts(alerts: EngineAlerts): Promise<number> {
  let n = 0;
  for (const intent of await houseBotIntentStore.listAlertRepair(PLANNER_REPAIR_BATCH)) {
    if (!(await houseBotIntentStore.markAlerted(intent.id))) continue;
    await alerts.placed(intent);
    n++;
  }
  return n;
}

/* ═══ 7 · endTargets (N2 §4 step 9; rulings 75–76) ═══════════════════════════════════════════════ */

export async function endTargets(nowMs: number, parseCtx: ParseContext): Promise<number> {
  let ended = 0;
  const bots = new Map<string, StoredHouseBot | null>();
  for (const t of await targetStore.listActive()) {
    if (!bots.has(t.houseBotId)) bots.set(t.houseBotId, await houseBotStore.get(t.houseBotId));
    const bot = bots.get(t.houseBotId) ?? null;
    let cause: TargetEndCause | null = null;
    if (t.reactTo === "FIRST" && (await houseBotIntentStore.countPlacedForTarget(t.id)) > 0) cause = "DONE";
    const row = cause ? null : await houseSeamStore.marketView(t.marketId);
    if (!cause && !row) cause = "MARKET_GONE";
    const view = row ? projectMarketView(row) : null;
    if (!cause && view!.status !== "LIVE") cause = "MARKET_CLOSED";
    if (!cause && view!.reopenedAt) cause = "MARKET_REOPENED";
    // A young resolve claim alone never ends a target: fire and H3 still refuse while it is young.
    if (!cause && (await infoBlackout(t.marketId, { countResolveClaim: false })).blocked) cause = "INFO_BLACKOUT";
    if (!cause && (scopeCode(view!) != null || !(HOUSE_PRODUCTS as readonly string[]).includes(view!.productLine))) cause = "OUT_OF_SCOPE";
    if (!cause && bot) {
      // Unparseable rules leave the target ACTIVE and inert: no OUT_OF_SCOPE from rules, no CUTOFF_PASSED (04:4005).
      const parsed = parseHouseBotRules(bot.rules, parseCtx);
      if (parsed.ok) {
        const r = parsed.rules;
        if (!r.scope.products.polls || !(r.scope.categories as string[]).includes(view!.category)) cause = "OUT_OF_SCOPE";
        else {
          const timing = effectiveTargetTiming(t, view!.exitRates, guardsFor(r, "MARKET"), cutoffOf(view!) as string, iso(nowMs), t.effectiveFrom);
          if (timing.lastReactableStakeAt == null || nowMs >= Date.parse(timing.lastReactableStakeAt) + SWEEP_LOOKBACK_MS) cause = "CUTOFF_PASSED";
        }
      }
    }
    if (!cause) continue;
    const done = await targetStore.endActive(t.id, cause);
    if (!done) continue;
    // No audit (A19) and no alert (N2 §7) — history and the targets tab.
    await houseBotEventStore.append({
      houseBotId: t.houseBotId, userId: bot?.userId ?? null, marketId: t.marketId, kind: "TARGET_ENDED", fromStatus: "ACTIVE", toStatus: "ENDED",
      reason: null, actorId: null, payload: { targetId: t.id, endCause: cause },
    });
    ended++;
  }
  return ended;
}

/* ═══ 7a · the A16 PENDING lifecycle sweep (ruling 88) ═══════════════════════════════════════════ */

export async function sweepPendingLifecycle(): Promise<number> {
  let skipped = 0;
  for (const marketId of await houseBotIntentStore.listPendingMarketIds(500)) {
    const row = await houseSeamStore.marketView(marketId);
    const view = row ? projectMarketView(row) : null;
    let code: string | null = null;
    let automatedOnly = false;
    if (!view) code = "MARKET_GONE";
    else if (view.status !== "LIVE") code = "MARKET_NOT_LIVE";
    else if (view.round && (!view.round.chainRunning || !view.round.assetEnabled)) code = "CHAIN_NOT_RUNNING";
    else if (view.reopenedAt) { code = "MARKET_REOPENED"; automatedOnly = true; }
    if (code) skipped += (await houseBotIntentStore.skipPendingOnMarket(marketId, code, { automatedOnly })).length;
  }
  return skipped;
}

/* ═══ 7b · rules-parse outcomes and F4's future alert (ruling 100) ═══════════════════════════════ */

async function futureSince(key: string, isFuture: boolean, nowMs: number): Promise<number | null> {
  const rt = await houseBotRuntimeStore.get(key);
  const since = rt?.rulesFutureSince ?? null;
  if (!isFuture) {
    if (since != null) await houseBotRuntimeStore.upsert(key, { rulesFutureSince: null });
    return null;
  }
  if (since == null) {
    await houseBotRuntimeStore.upsert(key, { rulesFutureSince: iso(nowMs) });
    return nowMs;
  }
  return Date.parse(since);
}

export async function rulesOutcomes(nowMs: number, control: StoredHouseBotControl, parseCtx: ParseContext, alerts: EngineAlerts): Promise<{ limitsAhead: boolean; paused: number }> {
  let paused = 0;
  for (const bot of await houseBotStore.listNonRemoved()) {
    const parsed = parseHouseBotRules(bot.rules, parseCtx);
    const fromFuture = !parsed.ok && parsed.code === "RULES_FROM_FUTURE";
    const since = await futureSince(RUNTIME_KEY.bot(bot.id), fromFuture, nowMs);
    if (parsed.ok) continue;
    if (fromFuture) {
      if (since != null && nowMs - since >= RULES_FUTURE_ALERT_AFTER_MS) {
        const version = Number((bot.rules as { schemaVersion?: unknown } | null)?.schemaVersion);
        await alertOnce(ALERT_KEY.rulesFuture(bot.id, version), alerts, { code: "RULES_FROM_FUTURE", botId: bot.id, detail: { version } });
      }
      continue; // never a pause, never a conversion (F4)
    }
    const cause = parsed.code === "RULES_OUTDATED" ? "RULES_OUTDATED" : "RULES_INVALID";
    if (bot.status === "ACTIVE" && (await stopBot(bot.id, { to: "AUTO_PAUSED", cause, field: parsed.field ?? null }, alerts))) paused++;
  }
  const limitsAhead = control.limitsSchemaVersion > HOUSE_LIMITS_SCHEMA_VERSION;
  const since = await futureSince(RUNTIME_KEY.global, limitsAhead, nowMs);
  if (limitsAhead && since != null && nowMs - since >= RULES_FUTURE_ALERT_AFTER_MS) {
    await alertOnce(ALERT_KEY.rulesFuture("global", control.limitsSchemaVersion), alerts, { code: "LIMITS_FROM_FUTURE", detail: { version: control.limitsSchemaVersion } });
  }
  return { limitsAhead, paused };
}

/* ═══ 7c · F5 revalidateLive (A7, F5, N1 §5; ruling 84) ══════════════════════════════════════════ */

/** The first saved value that leaves the bot unable to place ANY bet under the live bounds, or null. */
export function unplaceableField(bot: StoredHouseBot, r: HouseBotRulesV1, control: Pick<StoredHouseBotControl, "gCapPerMarketTzs">, live: LiveBounds): string | null {
  if (bot.stakeMinTzs != null && (bot.stakeMinTzs < live.minStake || bot.stakeMinTzs > live.maxStake)) return "stakeMinTzs";
  if (bot.stakeMaxTzs != null && bot.stakeMaxTzs < live.minStake) return "stakeMaxTzs";
  const openerOn = r.modes.polls.opener || r.modes.updown.opener;
  if (openerOn && (r.opener.stakeMaxTzs < live.minStake || r.opener.stakeMinTzs > live.maxStake)) return "opener.stakeMinTzs";
  if (control.gCapPerMarketTzs != null && control.gCapPerMarketTzs < live.minStake) return "gCapPerMarketTzs";
  if (bot.freqMinGapSec != null && bot.freqMinGapSec < minGapFloorSec(live.refillPerMin)) return "freqMinGapSec";
  return null;
}

export async function revalidateLive(active: readonly ParsedBot[], control: StoredHouseBotControl, alerts: EngineAlerts, liveBounds: () => Promise<LiveBounds>): Promise<number> {
  const live = await liveBounds();
  const hash = boundsHashOf(live);
  let paused = 0;
  for (const { bot, rules } of active) {
    const field = unplaceableField(bot, rules, control, live);
    if (field) {
      if (await stopBot(bot.id, { to: "AUTO_PAUSED", cause: "RULES_INVALID", field }, alerts)) paused++;
      continue;
    }
    if (bot.stakeMaxTzs != null && bot.stakeMaxTzs > live.maxStake) {
      await alertOnce(ALERT_KEY.boundsClamp(bot.id, hash), alerts, { code: "BOUNDS_CLAMP", botId: bot.id, detail: { liveMaxTzs: live.maxStake, stakeMaxTzs: bot.stakeMaxTzs } });
    }
    if (rules.enterNow.enabled) {
      const fields: Array<[string, number | null]> = [
        ["enterNow.thinStakeTzs", rules.enterNow.thinStakeTzs],
        ["enterNow.openerStakeTzs", rules.enterNow.openerStakeTzs],
        ["capStaffChosenDailyTzs", bot.capStaffChosenDailyTzs],
      ];
      for (const [f, value] of fields) {
        if (value != null && value < live.minStake) {
          await alertOnce(ALERT_KEY.boundsCantFit(bot.id, f, hash), alerts, { code: "BOUNDS_CANT_FIT", botId: bot.id, detail: { field: f, liveMinTzs: live.minStake, valueTzs: value } });
        }
      }
    }
  }
  const g = await houseBotRuntimeStore.get(RUNTIME_KEY.global);
  if (g?.boundsHash !== hash) await houseBotRuntimeStore.upsert(RUNTIME_KEY.global, { boundsHash: hash });
  return paused;
}

/* ═══ 7d · realised-loss stops (PLAN §3; rulings 82–83) ══════════════════════════════════════════ */

export async function lossStops(nowMs: number, activeBots: readonly StoredHouseBot[], control: StoredHouseBotControl, alerts: EngineAlerts): Promise<{ bots: number; global: boolean }> {
  const day = eatDayKey(nowMs);
  const books = await houseDayBooks(day);
  let bots = 0;
  // A bot stops on REALISED loss whatever the switch says (ruling 83); a NULL cap never stops.
  for (const bot of activeBots) {
    const book = books.get(bot.id);
    if (bot.capDailyLossTzs == null || !book || book.realisedLossTzs < bot.capDailyLossTzs) continue;
    if (await stopBot(bot.id, { to: "AUTO_PAUSED", cause: "DAILY_LOSS_STOP", auditAction: "house_bot.loss_stop" }, alerts)) bots++;
  }
  let global = false;
  if (control.enabled && control.gCapDailyLossTzs != null) {
    const all = await houseDayBook(day, null);
    if (all.realisedLossTzs >= control.gCapDailyLossTzs) {
      global = await engineSwitchOff("GLOBAL_LOSS_STOP", alerts, { code: "GLOBAL_LOSS_STOP", detail: { realisedLossTzs: all.realisedLossTzs, capTzs: control.gCapDailyLossTzs } });
    }
  }
  return { bots, global };
}

/* ═══ 7e · WALLET_MISSING (A16; ruling 112) ══════════════════════════════════════════════════════ */

export async function walletMissing(alerts: EngineAlerts): Promise<number> {
  let n = 0;
  for (const { houseBotId, openStakeTzs } of await houseBookStore.openExposure(null)) {
    const bot = await houseBotStore.get(houseBotId);
    if (!bot) continue;
    let wallet: Awaited<ReturnType<typeof db.wallet.findByUserId>> | undefined;
    try {
      wallet = await db.wallet.findByUserId(bot.userId);
    } catch {
      continue; // a read that fails is never a missing wallet
    }
    if (wallet) continue;
    n++;
    if (bot.status === "ACTIVE") await stopBot(bot.id, { to: "AUTO_PAUSED", cause: "WALLET_MISSING" }, alerts);
    await alertOnce(ALERT_KEY.settleBlocked(bot.id), alerts, { code: "SETTLE_BLOCKED", botId: bot.id, detail: { openStakeTzs } });
  }
  return n;
}

/* ═══ 7f · FILL and OPENER planning (PLAN F4, A11, A15; rulings 39, 91, 93–96) ════════════════════ */

const assetIdOf = (chainKey: string) => chainKey.slice(0, chainKey.lastIndexOf(":"));

export async function planFillAndOpener(
  nowMs: number,
  state: EngineState,
  control: StoredHouseBotControl,
  active: readonly ParsedBot[],
  deps: { randomInt: RandomInt; drawRandomInt?: DrawRandomInt },
): Promise<{ fill: number; opener: number }> {
  const result = { fill: 0, opener: 0 };
  const globalScopeFrom = (await houseBotRuntimeStore.get(RUNTIME_KEY.global))?.scopeFrom ?? null;
  if (globalScopeFrom == null || active.length === 0) return result; // ruling 92: never switched on = nothing in scope

  const exposure = new Map((await houseBookStore.openExposure(null)).map((r) => [r.houseBotId, r.openStakeTzs]));
  const candidates: Array<DecideBot & { stored: StoredHouseBot }> = [];
  for (const { bot, rules } of active) {
    const scopeFrom = (await houseBotRuntimeStore.get(RUNTIME_KEY.bot(bot.id)))?.scopeFrom ?? null;
    if (scopeFrom == null) continue;
    const last = (await houseSeamStore.placedTimes({ houseBotId: bot.id, withinSec: 86_400 }))[0] ?? null;
    candidates.push({
      botId: bot.id, botUserId: bot.userId, label: bot.label, rules, stakeMinTzs: bot.stakeMinTzs, stakeMaxTzs: bot.stakeMaxTzs,
      capOpenExposureTzs: bot.capOpenExposureTzs, openExposure: exposure.get(bot.id) ?? 0, lastPlacedAt: last, scopeFrom,
      marketHeld: false, capPrecheck: null, stored: bot,
    });
  }

  for (const kind of ["FILL", "OPENER"] as const) {
    for (const product of ["MARKET", "UPDOWN"] as const) {
      const mode = kind === "FILL" ? "fill" : "opener";
      const key = product === "UPDOWN" ? "updown" : "polls";
      const eligible = candidates.filter((b) => b.rules.scope.products[key] && b.rules.modes[key][mode]);
      if (eligible.length === 0) continue;
      // FILL is planned only near its due time (ruling 91, P23): the pools it sizes against are then nearly final.
      const toIso = kind === "FILL"
        ? iso(nowMs + Math.max(...eligible.map((b) => (product === "UPDOWN" ? b.rules.fill.leadUdSec : b.rules.fill.leadPollsMin * 60) * 1000 + b.rules.fill.jitterSec * 1000)) + PLANNER_INTERVAL_MS)
        : null;
      const cursorKey = `${kind}:${product}`;
      for (let page = 0; page < PLANNER_SCAN_MAX_PAGES; page++) {
        const rows = await houseSeamStore.plannableMarkets({
          kind, productLine: product, fromIso: iso(nowMs + PLANNER_MIN_CUTOFF_AHEAD_MS), toIso, after: state.planner.scan[cursorKey] ?? null, limit: SWEEP_PAGE_SIZE,
        });
        for (const r of rows) {
          if (await planMarket(kind, r.id, eligible, { nowMs, control, globalScopeFrom, ...deps })) result[kind === "FILL" ? "fill" : "opener"]++;
        }
        const full = rows.length === SWEEP_PAGE_SIZE;
        state.planner.scan[cursorKey] = full ? rows[rows.length - 1] : null;
        if (!full) break;
      }
    }
  }
  return result;
}

async function planMarket(
  kind: "FILL" | "OPENER",
  marketId: string,
  eligible: ReadonlyArray<DecideBot & { stored: StoredHouseBot }>,
  o: { nowMs: number; control: StoredHouseBotControl; globalScopeFrom: string; randomInt: RandomInt; drawRandomInt?: DrawRandomInt },
): Promise<boolean> {
  const row = await houseSeamStore.marketView(marketId);
  if (!row) return false;
  const view = projectMarketView(row);
  const mode = kind === "FILL" ? "fill" : "opener";
  // Ruling 96 · per market, the covering bots in PLAN §4.4 order; the first row wins.
  const covering = orderBots(eligible.filter((b) => botCovers(b, view, mode)));
  if (covering.length === 0) return false;
  // An OPENER needs only the raw pools (both 0, H3's own condition); `lockedForHouse` is a FILL's read.
  const rawSide = (raw: number): LockedPoolSide => ({ raw, nonHouse: 0, locked: 0, unlocked: 0, earliestLockAt: null, excluded: 0, lockedA15: 0, accounts: [] });
  const pools: LockedPool = kind === "FILL" ? await lockedForHouse(view.id, lockedPoolInputsOfView(view)) : { YES: rawSide(view.yesPool), NO: rawSide(view.noPool) };
  if (kind === "OPENER" && (pools.YES.raw !== 0 || pools.NO.raw !== 0)) return false;
  const product = view.productLine === "UPDOWN" ? "UPDOWN" : "MARKET";
  const price = product === "UPDOWN" && view.round ? await udPriceForDecision(assetIdOf(view.round.chainKey), { nowMs: o.nowMs }) : null;
  const bounds = await stakeBoundsForMarket({ id: view.id, productLine: product });
  const passNow = iso(o.nowMs);

  for (const b of covering) {
    // A recording RNG, so the pure decision can run before the reads it would otherwise need (ruling 93) and the
    // OPENER can be re-run with the drawn side on the same draws (ruling 95).
    const draws: number[] = [];
    const record: RandomInt = (min, max) => { const v = o.randomInt(min, max); draws.push(v); return v; };
    const input = { view, bot: b as DecideBot, pools, price, bounds, globalScopeFrom: o.globalScopeFrom, passNow };
    const probe = kind === "FILL" ? planFill(input, { randomInt: record }) : planOpener({ ...input, openerSide: "YES" }, { randomInt: record });
    if (!probe.row) continue;
    // Only now, for a bot that would write a row: the holding predicate and the money caps, one read at a time.
    if ((await marketHeld(b.botId, view.id)).held) continue;
    const facts = await loadCapFacts(b.stored, view.id, { control: o.control, nowMs: o.nowMs, staffChosen: false, counterpartyUserId: null });
    if (capPrecheck(facts, Math.max(b.stakeMinTzs ?? bounds.min, bounds.min))) continue;
    let decided: DecideResult = probe;
    if (kind === "OPENER") {
      const draw = await openerSide(view.id, { houseBotId: b.botId, actorId: null, drawnFor: "OPENER_PLAN" }, { randomInt: o.drawRandomInt });
      let k = 0;
      const replay: RandomInt = (min, max) => (k < draws.length ? draws[k++] : o.randomInt(min, max));
      decided = planOpener({ ...input, openerSide: draw.side }, { randomInt: replay });
      if (!decided.row) continue;
    }
    const inserted = await houseBotIntentStore.insertIgnoringConflict(intentRowOf(decided.row!, { id: newHouseId("intent"), anchorKey: view.id, nowIso: passNow }));
    return inserted != null;
  }
  return false;
}

/* ═══ 9 · hourly: summaries (C13, N1 §7; rulings 80–81) and the prune (ruling 87) ════════════════ */

export async function hourlyDuties(nowMs: number, control: StoredHouseBotControl, alerts: EngineAlerts): Promise<{ summaries: number; pruned: number }> {
  const pruned = await houseBotRuntimeStore.pruneInstanceRows();
  const toMs = Math.floor(nowMs / 3_600_000) * 3_600_000; // EAT is a whole-hour offset: hour starts coincide
  const fromMs = toMs - 3_600_000;
  const rows = await houseBotIntentStore.placedInWindow({ fromIso: iso(fromMs), toIso: iso(toMs) });
  let summaries = 0;
  const window = { fromIso: iso(fromMs), toIso: iso(toMs) };

  // Admins: automatic stakes beyond the per-bet bell cap; staff-chosen stakes were alerted one by one.
  const automatic = rows.reduce((s, r) => s + r.count - r.staffChosenCount, 0);
  const automaticTzs = rows.reduce((s, r) => s + r.stakeTzs - r.staffChosenTzs, 0);
  const staffChosen = rows.reduce((s, r) => s + r.staffChosenCount, 0);
  const beyond = Math.max(0, automatic - control.bellAlertsPerHour);
  if (beyond > 0 && await alertOnce(ALERT_KEY.summary("admins", "all"), alerts, {
    code: "HOUR_SUMMARY_ADMINS", detail: { ...window, count: automatic, stakeTzs: automaticTzs, beyondCap: beyond, staffChosen },
  })) summaries++;

  // Each holder: every stake from their account, staff-chosen included; 0 notices per hour = summary only.
  for (const r of rows) {
    const cap = control.holderNoticesPerHour;
    const over = cap === 0 ? r.count : Math.max(0, r.count - cap);
    if (over > 0 && await alertOnce(ALERT_KEY.summary("holder", r.houseBotId), alerts, {
      code: "HOUR_SUMMARY_HOLDER", botId: r.houseBotId, detail: { ...window, count: r.count, stakeTzs: r.stakeTzs, beyondCap: over },
    })) summaries++;
  }
  return { summaries, pruned };
}
