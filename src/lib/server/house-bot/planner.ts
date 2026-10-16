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
  HANDOFF_MAX_TRIES,
  HOUSE_CONTROL_ID,
  HOUSE_PRODUCTS,
  PLANNER_INTERVAL_MS,
  RULES_FUTURE_ALERT_AFTER_MS,
  RUNTIME_KEY,
  SWEEP_LOOKBACK_MS,
  SWEEP_PAGE_SIZE,
  isHandoffCode,
  type TargetEndCause,
} from "@/lib/house-bot/constants";
import { HOUSE_LIMITS_SCHEMA_VERSION, effectiveTargetTiming, minGapFloorSec, parseHouseBotRules, rulesCoverTarget, type HouseBotRulesV1, type ParseContext } from "@/lib/house-bot/rules";
import { getGlobalConfig } from "../market-config";
import { RATE_RULES } from "../rate-limit";
import { db } from "../store";
import { positionStore } from "../market-dal";
import { stakeBoundsForMarket } from "../market-service";
import {
  houseBookStore, houseBotControlStore, houseBotEventStore, houseBotIntentStore, houseBotRuntimeStore, houseBotStore, houseSeamStore,
  newHouseId, pressStore, targetStore, type StoredHouseBot, type StoredHouseBotControl, type StoredHouseBotIntent,
} from "../house-bot-dal";
import { houseDayBook, houseDayBooks } from "./book";
import { alertOnce, engineAudit, engineSwitchOff, stopBot, type EngineAlerts } from "./outcomes";
import type { EngineState, EngineTicks, TickContext } from "./engine";
import { botCovers, drawTurnRoll, guardsFor, intentRowOf, markBusy, orderBots, oppositeSide, planFill, planOpener, planPair, type DecideBot, type DecideResult, type RandomInt, type UdPrice } from "./decide";
import type { EngineCode } from "@/lib/house-bot/constants";
import { SCOPE_PRODUCTS } from "@/lib/house-bot/rules";
import type { LockedPool, LockedPoolSide } from "../house-bot-dal";
import { cutoffOf, projectMarketView, scopeCode, type PublicMarketView } from "./market-view";
import { lockedForHouse, lockedPoolInputsOfView } from "./pools";
import { udPriceForDecision } from "./ud-price";
import { infoBlackout } from "./blackout";
import { marketHeld } from "./enter-now";
import { openerSide, type DrawRandomInt } from "./opener-side";
import { loadParseContext } from "./rules-context";
import { busyAtLoad, capAtDue, capPrecheck, loadCapFacts, loadRosterRates, noteQueued, rateFactsFor, type RateFacts } from "./cap-precheck";
import { pressAuditEntry, writePressAudit } from "./press-audit";
import { oversightPass } from "./oversight";
import { sameHouseHolder } from "./same-holder";
import { pairCapPrecheck } from "./pair-cap-precheck";

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
  | "rulesOutcomes" | "revalidateLive" | "lossStops" | "walletMissing" | "fillOpener" | "pair" | "oversight" | "hourly";

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
  // 7g · a second, independently guarded planner duty: paired rounds are inert until both
  // nullable desk budgets and per-account sharing rules have been explicitly set.
  await run("pair", async () => {
    const fresh = await houseBotControlStore.get();
    if (!fresh.enabled || limitsAhead || fresh.gCapPairRoundsPerDay == null || fresh.gCapPairDailyTzs == null) return "skipped";
    await loadActive();
    count("paired", await planPairs(nowMs, ctx.state, fresh, active, { randomInt }));
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

  /* ⭐ X1's DUTY-NAME HALF (PROGRESS's proposed control X1; replan rulings 507, 549 — C7 step 4).
   * "Today a stuck summary or a failed loss check is only in the server log; the strip would say it in plain words."
   * The pass already knows: `out.duties[name]` is "ok", "skipped" or "failed: <message>". What was missing is a
   * DURABLE home, and it is the heartbeat row's own `extra` field — the columns are KEY-SCOPED exactly as `beatAt`
   * is, so `beat:planner`'s carry the PLANNER's facts, the way `beat:poller:<instance>`'s carry that instance's
   * claim failures (`worker.ts`). Nothing here is rendered: the console reads the row and writes its own words.
   * ⛔ NAMES ONLY, NEVER THE MESSAGE. A duty's error text is an arbitrary database or vendor string; it can name a
   * bot, a market or an account, and this row is read by a console surface. The NAME is a closed list (`DutyName`).
   * ⛔ AND A FAILED PASS DOES NOT BEAT. When a MONEY duty failed the row is written through `upsert`, which touches
   * no `beatAt` — the same rule `worker.ts` follows and for the same reason: a pass that failed must not look alive.
   * A pass whose money duties all held still beats, and carries the non-money failure beside it, which is exactly
   * X1's "Summaries delayed" case. */
  const failedDuties = (Object.entries(out.duties) as Array<[DutyName, string]>)
    .filter(([, verdict]) => verdict.startsWith("failed:"))
    .map(([name]) => name);
  const dutyFacts = failedDuties.length > 0
    ? { pollerErrorCode: failedDuties.join(","), pollerErrorAt: iso(nowMs) }
    : { pollerErrorCode: null };
  if (money.every(Boolean)) {
    try {
      await houseBotRuntimeStore.beat(RUNTIME_KEY.plannerBeat, dutyFacts);
      out.beat = true;
    } catch (e) {
      console.error("[house-bot] planner beat failed:", errMessage(e));
    }
  } else {
    try {
      await houseBotRuntimeStore.upsert(RUNTIME_KEY.plannerBeat, dutyFacts);
    } catch (e) {
      console.error("[house-bot] planner duty record failed:", errMessage(e));
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
        /* ⛔ THE ONE SCOPE PREDICATE, HERE TOO (review finding 2026-09-22): this line restated "polls on and the
         * category listed" by hand, a second home for the rule `decide.ts`, `fire.ts` and the desk all read through
         * `rulesCoverTarget` — and the only one `test:house-bot-rules` 10.engine's source pin could not see. */
        if (!rulesCoverTarget(r, { product: "MARKET", category: view!.category }, null)) cause = "OUT_OF_SCOPE";
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

/** An account as the planner (and the console's explaining walk) loads it for one pass. */
type PlanCandidate = DecideBot & { stored: StoredHouseBot; rates: RateFacts };

/**
 * ⭐ ONE LOADER FOR THE PASS AND THE PANEL (N3). Exposure for every account in one statement, the turn order's and
 * `capAtDue`'s rate facts for every account in two (`loadRosterRates`), and the scope start per account — so the
 * planner and the "why is it not staking?" panel order accounts by the same facts.
 */
async function loadPlanCandidates(active: readonly ParsedBot[], nowMs: number): Promise<PlanCandidate[]> {
  const exposure = new Map((await houseBookStore.openExposure(null)).map((r) => [r.houseBotId, r.openStakeTzs]));
  const roster = await loadRosterRates();
  const candidates: PlanCandidate[] = [];
  for (const { bot, rules } of active) {
    const scopeFrom = (await houseBotRuntimeStore.get(RUNTIME_KEY.bot(bot.id)))?.scopeFrom ?? null;
    if (scopeFrom == null) continue;
    const rates = rateFactsFor(roster, bot.id);
    candidates.push({
      botId: bot.id, botUserId: bot.userId, label: bot.label, rules, stakeMinTzs: bot.stakeMinTzs, stakeMaxTzs: bot.stakeMaxTzs,
      capOpenExposureTzs: bot.capOpenExposureTzs, openExposure: exposure.get(bot.id) ?? 0, lastPlacedAt: rates.lastPlacedAt,
      busyUntil: busyAtLoad(rates, nowMs), scopeFrom, marketHeld: false, capPrecheck: null, stored: bot, rates,
    });
  }
  return candidates;
}

/** The pass gave this account a row: its turn moves to the back, and the row counts against its own limits (N3). */
function takeTurn(candidates: readonly PlanCandidate[], winner: NonNullable<MarketExplain["winner"]>): void {
  markBusy(candidates, winner.botId, winner.dueAt);
  const c = candidates.find((b) => b.botId === winner.botId);
  if (c) noteQueued(c.rates, winner);
}

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

  const candidates = await loadPlanCandidates(active, nowMs);

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
          const v = await runMarket(kind, r.id, eligible, { nowMs, control, globalScopeFrom, ...deps }, true);
          if (v.placed) result[kind === "FILL" ? "fill" : "opener"]++;
          // N3 · the next market in this pass goes to the next account in turn.
          if (v.placed && v.winner) takeTurn(candidates, v.winner);
        }
        const full = rows.length === SWEEP_PAGE_SIZE;
        state.planner.scan[cursorKey] = full ? rows[rows.length - 1] : null;
        if (!full) break;
      }
    }
  }
  return result;
}

/**
 * ⭐ ONE LADDER, TWO READERS (2026-09-23).
 *
 * The planner walks this to PLACE; the console walks the very same call with `place: false` to say WHY
 * nothing was placed. A second, explaining copy of this ladder is the thing to fear here — two ladders
 * agree right up to the day one of them is amended, and then the screen explains a decision the engine
 * did not make. So there is one function, and the only thing `place` changes is whether the row is
 * written and whether the walk stops at the first account that would place.
 *
 * ⛔ WITH `place: true` THE CONTROL FLOW IS EXACTLY WHAT IT WAS: the same reads in the same order, the
 * first covering account that would write a row wins, and nothing else is evaluated. The codes are
 * collected on the way past; collecting them costs one array push per account and changes no decision.
 */
/* ⛔ NOT EXPORTED: it is the return type of a private function, and the console consumes `IdleExplain`.
     An exported type is module surface, and surface invites the second caller this design has no room for. */
type MarketExplain = {
  placed: boolean;
  /** Refused before any account was reached — the market itself, not the rules. */
  marketCode: EngineCode | null;
  /** Per covering account, in PLAN §4.4 order. A null code is an account that WOULD have staked. */
  byBot: Array<{ botId: string; code: EngineCode | null }>;
  /** N3 · the account the market went to (or, explaining, would go to), with that row's due time and stake. */
  winner: { botId: string; dueAt: string; stakeTzs: number } | null;
  /** The market as this walk read it; null when it could not be read. */
  view: PublicMarketView | null;
  /**
   * N3 · the pure decision's market inputs, once the walk reached the accounts — so the explaining walk can ask the
   * SAME `planFill`/`planOpener` whether another account would take this market, instead of a second ladder.
   */
  probe: { pools: LockedPool; price: UdPrice; bounds: { min: number; max: number }; passNow: string } | null;
  /** N3 · the accounts that already tried this market (a hand-off chain), which no queue may count. */
  tried: ReadonlySet<string>;
};

/**
 * ⭐ WHO HAS ALREADY TRIED THIS MARKET (N3). A handed-on row is the newest of its kind on the market, CANCELLED with an
 * account-owned code; it carries the accounts tried before it in `decision.triedBotIds`, so the chain needs no read
 * beyond the newest row. Any other newest row — none, or one cancelled for another reason — starts a fresh chain.
 */
function triedAccounts(prior: StoredHouseBotIntent | null): Set<string> {
  if (!prior || prior.status !== "CANCELLED" || !isHandoffCode(prior.reasonCode ?? "")) return new Set();
  const before = (prior.decision as { triedBotIds?: unknown }).triedBotIds;
  return new Set([...(Array.isArray(before) ? before.filter((x): x is string => typeof x === "string") : []), prior.houseBotId]);
}

async function runMarket(
  kind: "FILL" | "OPENER",
  marketId: string,
  eligible: readonly PlanCandidate[],
  o: { nowMs: number; control: StoredHouseBotControl; globalScopeFrom: string; randomInt: RandomInt; drawRandomInt?: DrawRandomInt },
  place: boolean,
): Promise<MarketExplain> {
  const byBot: MarketExplain["byBot"] = [];
  let read: PublicMarketView | null = null;
  let probeInputs: MarketExplain["probe"] = null;
  let tried: ReadonlySet<string> = new Set();
  const no = (marketCode: EngineCode | null): MarketExplain => ({ placed: false, marketCode, byBot, winner: null, view: read, probe: probeInputs, tried });
  const row = await houseSeamStore.marketView(marketId);
  if (!row) return no("MARKET_GONE");
  const view = projectMarketView(row);
  read = view;
  const mode = kind === "FILL" ? "fill" : "opener";
  const scoped = eligible.filter((b) => botCovers(b, view, mode));
  if (scoped.length === 0) return no("OUT_OF_SCOPE");
  // N3 · a market handed on skips the accounts that already tried it, and is left alone after HANDOFF_MAX_TRIES.
  const prior = await houseBotIntentStore.findByAnchor(kind, view.id);
  tried = triedAccounts(prior);
  /* Ruling 96 as amended by N3 · per market, the covering accounts DRAWN AT RANDOM, weighted by how long each has
     waited (one roll per account per market, from this pass's own `randomInt`, so a case can fix it); the first row
     wins. Drawn here, outside the probe's recording RNG below, so the opener's replay is untouched. */
  const untried = scoped.filter((b) => !tried.has(b.botId));
  if (prior && tried.size > 0 && (tried.size >= HANDOFF_MAX_TRIES || untried.length === 0)) {
    /* ⭐ A CHAIN THAT HAS RUN OUT IS CLOSED, NOT RE-READ (review finding 5). The newest row is a handed-on CANCELLED
       one, which keeps the market in `plannableMarkets` — so with nobody left to try it, every 15 s pass until the
       cutoff would read it again and spend a slot of its scan page on it. One SKIPPED(NO_ELIGIBLE_BOT) row takes the
       anchor and ends it, carrying the whole chain; the officer reads "No account could take it". */
    if (place) {
      const passNowIso = iso(o.nowMs);
      await houseBotIntentStore.insertIgnoringConflict(intentRowOf({
        houseBotId: prior.houseBotId, botUserId: prior.botUserId, kind, marketId: view.id,
        productLine: prior.productLine === "UPDOWN" ? "UPDOWN" : "MARKET", triggerPositionId: null, triggerUserId: null, targetId: null,
        side: prior.side, stakeTzs: prior.stakeTzs, dueAt: passNowIso, deadlineAt: prior.deadlineAt, staleAt: passNowIso,
        status: "SKIPPED", reasonCode: "NO_ELIGIBLE_BOT",
        why: `${kind === "OPENER" ? "Opener" : "Fill"} · no account left to take it after ${tried.size} tried`,
        decision: { triedBotIds: [...tried], handOffEnded: true, snapshot: (prior.decision as { snapshot?: unknown }).snapshot ?? null },
      }, { id: newHouseId("intent"), anchorKey: view.id, nowIso: passNowIso }));
    }
    return no("NO_ELIGIBLE_BOT");
  }
  const covering = orderBots(untried.map((b) => ({ ...b, turnRoll: drawTurnRoll(o.randomInt) })), o.nowMs);
  if (covering.length === 0) return no("NO_ELIGIBLE_BOT");
  // An OPENER needs only the raw pools (both 0, H3's own condition); `lockedForHouse` is a FILL's read.
  const rawSide = (raw: number): LockedPoolSide => ({ raw, nonHouse: 0, locked: 0, unlocked: 0, earliestLockAt: null, excluded: 0, lockedA15: 0, accounts: [] });
  const pools: LockedPool = kind === "FILL" ? await lockedForHouse(view.id, lockedPoolInputsOfView(view)) : { YES: rawSide(view.yesPool), NO: rawSide(view.noPool) };
  if (kind === "OPENER" && (pools.YES.raw !== 0 || pools.NO.raw !== 0)) return no("MARKET_NOT_EMPTY");
  const product = view.productLine === "UPDOWN" ? "UPDOWN" : "MARKET";
  const price = product === "UPDOWN" && view.round ? await udPriceForDecision(assetIdOf(view.round.chainKey), { nowMs: o.nowMs }) : null;
  const bounds = await stakeBoundsForMarket({ id: view.id, productLine: product });
  const passNow = iso(o.nowMs);
  probeInputs = { pools, price, bounds, passNow };

  for (const b of covering) {
    // A recording RNG, so the pure decision can run before the reads it would otherwise need (ruling 93) and the
    // OPENER can be re-run with the drawn side on the same draws (ruling 95).
    const draws: number[] = [];
    const record: RandomInt = (min, max) => { const v = o.randomInt(min, max); draws.push(v); return v; };
    const input = { view, bot: b as DecideBot, pools, price, bounds, globalScopeFrom: o.globalScopeFrom, passNow };
    const probe = kind === "FILL" ? planFill(input, { randomInt: record }) : planOpener({ ...input, openerSide: "YES" }, { randomInt: record });
    if (!probe.row) { byBot.push({ botId: b.botId, code: probe.code }); continue; }
    // Only now, for a bot that would write a row: the holding predicate and the money caps, one read at a time.
    if ((await marketHeld(b.botId, view.id)).held) { byBot.push({ botId: b.botId, code: "MARKET_HELD" }); continue; }
    const facts = await loadCapFacts(b.stored, view.id, { control: o.control, nowMs: o.nowMs, staffChosen: false, counterpartyUserId: null });
    const capped = capPrecheck(facts, Math.max(b.stakeMinTzs ?? bounds.min, bounds.min));
    if (capped) { byBot.push({ botId: b.botId, code: capped }); continue; }
    // N3 · the account-owned refusals the seam would meet AT THE DUE TIME, with this row's own stake.
    const atDue = capAtDue(b.stored, { balance: facts.balance, rates: b.rates }, probe.row);
    if (atDue) { byBot.push({ botId: b.botId, code: atDue }); continue; }
    let decided: DecideResult = probe;
    /**
     * ⛔ THE EXPLAINING WALK DOES NOT DRAW. `openerSide` INSERTS the draw event — it is the audited,
     * once-per-market record of which side the house took — and an officer opening a panel must not
     * mint one. Skipping it is sound for exactly one reason, and only while that reason holds:
     * `planOpener` reads `openerSide` ONLY to fill the row it returns (its `side` and its `why`).
     * No refusal branch looks at it, so the probe above already carries the verdict, and re-running
     * with the drawn side could change the row but never the answer.
     * 🔒 HELD BY a case that runs planOpener twice, YES and NO, on the same draws and demands the same
     * refusal — so the day a side-dependent refusal is added, that case fails instead of this comment.
     */
    if (kind === "OPENER" && place) {
      const draw = await openerSide(view.id, { houseBotId: b.botId, actorId: null, drawnFor: "OPENER_PLAN" }, { randomInt: o.drawRandomInt });
      let k = 0;
      const replay: RandomInt = (min, max) => (k < draws.length ? draws[k++] : o.randomInt(min, max));
      decided = planOpener({ ...input, openerSide: draw.side }, { randomInt: replay });
      if (!decided.row) { byBot.push({ botId: b.botId, code: decided.code }); continue; }
    }
    byBot.push({ botId: b.botId, code: null });
    const chosen = decided.row!;
    // ⛔ THE EXPLAINING WALK NEVER WRITES, and it never stops early: the officer asked about every account.
    if (!place) continue;
    // N3 · a handed-on market carries the chain of accounts tried before this one; a first try writes no such field.
    const rowToWrite = tried.size > 0 ? { ...chosen, decision: { ...chosen.decision, triedBotIds: [...tried] } } : chosen;
    const inserted = await houseBotIntentStore.insertIgnoringConflict(intentRowOf(rowToWrite, { id: newHouseId("intent"), anchorKey: view.id, nowIso: passNow }));
    return { placed: inserted != null, marketCode: null, byBot, winner: { botId: b.botId, dueAt: chosen.dueAt, stakeTzs: chosen.stakeTzs }, view, probe: probeInputs, tried };
  }
  return no(null);
}

/** N6 · scan rounds with one placed desk opener and offer their empty side to another holder. */
export async function planPairs(
  nowMs: number,
  state: EngineState,
  control: StoredHouseBotControl,
  active: readonly ParsedBot[],
  deps: { randomInt: RandomInt },
): Promise<number> {
  if (control.gCapPairRoundsPerDay == null || control.gCapPairDailyTzs == null) return 0;
  const globalScopeFrom = (await houseBotRuntimeStore.get(RUNTIME_KEY.global))?.scopeFrom ?? null;
  if (globalScopeFrom == null) return 0;
  const roster = await loadPlanCandidates(active, nowMs);
  const eligible = roster.filter((b) => b.rules.scope.products.updown && b.rules.share.otherSide
    && b.rules.share.matchPct > 0 && b.rules.share.matchPerDay > 0);
  if (eligible.length === 0) return 0;
  let placed = 0;
  const holderCache = new Map<string, boolean>();
  const cursorKey = "PAIR:UPDOWN";
  for (let page = 0; page < PLANNER_SCAN_MAX_PAGES; page++) {
    const rows = await houseSeamStore.plannableMarkets({
      kind: "PAIR", productLine: "UPDOWN", fromIso: iso(nowMs + PLANNER_MIN_CUTOFF_AHEAD_MS),
      toIso: null, after: state.planner.scan[cursorKey] ?? null, limit: SWEEP_PAGE_SIZE,
    });
    for (const r of rows) {
      const result = await runPairMarket(r.id, eligible, { nowMs, control, globalScopeFrom, randomInt: deps.randomInt, holderCache });
      if (result.placed) {
        placed++;
        if (result.winner) takeTurn(roster, result.winner);
      }
    }
    const full = rows.length === SWEEP_PAGE_SIZE;
    state.planner.scan[cursorKey] = full ? rows[rows.length - 1] : null;
    if (!full) break;
  }
  return placed;
}

async function runPairMarket(
  marketId: string,
  eligible: readonly PlanCandidate[],
  o: { nowMs: number; control: StoredHouseBotControl; globalScopeFrom: string; randomInt: RandomInt; holderCache: Map<string, boolean> },
): Promise<{ placed: boolean; winner: NonNullable<MarketExplain["winner"]> | null }> {
  const none = { placed: false, winner: null };
  const market = await houseSeamStore.marketView(marketId);
  if (!market) return none;
  const view = projectMarketView(market);
  if (view.productLine !== "UPDOWN" || !view.round || scopeCode(view) || view.status !== "LIVE") return none;
  const anchorKey = `pair:${view.id}`;
  const prior = await houseBotIntentStore.findByAnchor("PAIR", anchorKey);
  if (prior && prior.status !== "CANCELLED") return none;
  const tried = triedAccounts(prior);
  const untried = eligible.filter((b) => !tried.has(b.botId));
  if (prior && tried.size > 0 && (tried.size >= HANDOFF_MAX_TRIES || untried.length === 0)) {
    const passNowIso = iso(o.nowMs);
    await houseBotIntentStore.insertIgnoringConflict(
      intentRowOf({
      houseBotId: prior.houseBotId, botUserId: prior.botUserId, kind: "PAIR", marketId: view.id,
      productLine: "UPDOWN", triggerPositionId: null, triggerUserId: null, targetId: null,
      side: prior.side, stakeTzs: prior.stakeTzs, dueAt: passNowIso, deadlineAt: prior.deadlineAt,
      staleAt: passNowIso, status: "SKIPPED", reasonCode: "NO_ELIGIBLE_BOT",
      why: `Pairing · no account left after ${tried.size} tried`,
      decision: { triedBotIds: [...tried], handOffEnded: true, snapshot: (prior.decision as { snapshot?: unknown }).snapshot ?? null },
      }, { id: newHouseId("intent"), anchorKey, nowIso: passNowIso }),
    );
    return none;
  }
  if (untried.length === 0) return none;

  // Only an OPEN marked position of a PLACED opener may start a pair. Any player stake or
  // second desk account already present makes this round ineligible before a row is written.
  const opener = await houseBotIntentStore.findByAnchor("OPENER", view.id);
  if (!opener || opener.status !== "PLACED" || opener.positionId == null) return none;
  const open = (await positionStore.listForMarket(view.id)).filter((p) => p.status === "OPEN");
  if (open.some((p) => p.houseBotId == null)) return none;
  const house = open.filter((p) => p.houseBotId != null);
  if (!house.some((p) => p.id === opener.positionId) || house.length === 0) return none;
  if (house.some((p) => p.houseBotId !== opener.houseBotId || p.side !== opener.side)) return none;
  const otherStakeTzs = house.reduce((sum, p) => sum + p.stake, 0);
  if (otherStakeTzs <= 0) return none;
  const pools = await lockedForHouse(view.id, lockedPoolInputsOfView(view));
  if (pools.YES.nonHouse !== 0 || pools.NO.nonHouse !== 0) return none;
  const price = await udPriceForDecision(assetIdOf(view.round.chainKey), { nowMs: o.nowMs });
  const bounds = await stakeBoundsForMarket({ id: view.id, productLine: "UPDOWN" });
  const passNow = iso(o.nowMs);
  const ordered = orderBots(untried.map((b) => ({ ...b, turnRoll: drawTurnRoll(o.randomInt) })), o.nowMs);
  for (const b of ordered) {
    if (b.botId === opener.houseBotId) continue;
    const holderKey = [b.botUserId, opener.botUserId].sort().join("\0");
    let sameHolder = o.holderCache.get(holderKey);
    if (sameHolder == null) {
      sameHolder = await sameHouseHolder(b.botUserId, opener.botUserId);
      o.holderCache.set(holderKey, sameHolder);
    }
    if (sameHolder) continue;
    const decided = planPair({ view, bot: b, pools, price, bounds, globalScopeFrom: o.globalScopeFrom,
      passNow, otherSide: opener.side, otherStakeTzs }, { randomInt: o.randomInt });
    if (!decided.row) continue;
    if ((await marketHeld(b.botId, view.id, { sideAwareSide: oppositeSide(opener.side) })).held) continue;
    const facts = await loadCapFacts(b.stored, view.id, { control: o.control, nowMs: o.nowMs,
      staffChosen: false, counterpartyUserId: null });
    if (capPrecheck(facts, Math.max(b.stakeMinTzs ?? bounds.min, bounds.min))) continue;
    if (capAtDue(b.stored, { balance: facts.balance, rates: b.rates }, decided.row)) continue;
    if (await pairCapPrecheck({ control: o.control, houseBotId: b.botId, rules: b.rules,
      stakeTzs: decided.row.stakeTzs, nowMs: Date.parse(decided.row.dueAt) })) continue;
    const rowToWrite = tried.size > 0
      ? { ...decided.row, decision: { ...decided.row.decision, triedBotIds: [...tried] } }
      : decided.row;
    const inserted = await houseBotIntentStore.insertIgnoringConflict(intentRowOf(rowToWrite,
      { id: newHouseId("intent"), anchorKey, nowIso: passNow }));
    if (inserted) return { placed: true, winner: { botId: b.botId, dueAt: decided.row.dueAt, stakeTzs: decided.row.stakeTzs } };
    return none;
  }
  return none;
}

/* ═══ 8b · "why is this account not staking?" (2026-09-23) ═══════════════════════════════════════ */

/**
 * ⭐ THE ANSWER IS ALWAYS ABOUT NOW.
 *
 * An officer asks this with the desk in front of them: they change a rule, reload, and expect the reason
 * to change. So this walks live markets through the SAME `runMarket` the planner walks, with
 * `place: false`, and counts the reasons it comes back with. It writes nothing and places nothing.
 *
 * ⛔ IT IS NOT A RECORD OF THE LAST PASS, deliberately. A reason stamped an hour ago answers a question
 * nobody asked, and it keeps answering it after the rule that caused it has been changed.
 *
 * ⚠️ IT IS A SAMPLE, and the SCREEN says so: `looked` carries how many markets each kind actually
 * offered, and `houseWhyIdleForConsole` spends it — the panel prints the split and the caveat, so a
 * reader can never take "12 markets" for the whole book.
 * ⛔ THAT SENTENCE USED TO BE A LIE BY OMISSION. `looked` was computed per kind and read only for its
 * LENGTH; nothing painted the split, and the caveat came from a different field. A comment claiming a
 * protection the code does not implement is worse than no comment, because it stops the next reader
 * looking.
 */
export type IdleExplain = {
  /**
   * ⭐ THE ACCOUNT WHOSE RULES WILL NOT PARSE, WHICH THIS READER USED TO ANSWER WITH SILENCE.
   *
   * It returned `null`, the door returned `null`, and the page then rendered NO panel — so an officer
   * who clicked "Why is it not staking?" got back a page byte-identical to the one they clicked from,
   * with nothing saying why. That is the dead control ruling 312 forbids, built into the very feature
   * that exists to end silent refusals. `null` is now reserved for an account that does not exist.
   */
  rulesUnreadable: boolean;
  /**
   * How many markets the scan offered, per kind. The console sums it by KIND and prints the split.
   * ⛔ NO `product` FIELD. It was carried here and read by nothing — an officer does not need polls and
   * Up & Down counted apart to learn that the desk considered both opening and filling.
   */
  looked: Array<{ kind: "FILL" | "OPENER"; markets: number }>;
  considered: number;
  /** Markets where this account would have staked right now — a non-zero count with no bets is its own story. */
  wouldStake: number;
  /**
   * ⭐ N3 · MARKETS THIS ACCOUNT COULD TAKE, BUT ANOTHER ACCOUNT IS MORE LIKELY TO BE DRAWN FIRST. This panel used to
   * walk the account ALONE, so an account that never reached the front read "would stake right now" while it placed
   * nothing for fifteen days. The order is the planner's own, read without rolls — its EXPECTED order, the account that
   * has waited longest first — and moved on as the planner moves it.
   */
  rankedBehind: number;
  /** Every refusal met, commonest first; ties by code so the order is stable between reloads. */
  byCode: Array<{ code: EngineCode; markets: number }>;
  /**
   * ⭐ THE ACCOUNT THAT ONLY REACTS, WHICH THIS READER WOULD OTHERWISE SLANDER (2026-09-23).
   *
   * This walk covers FILL and OPENER, because those are the two the PLANNER plans. The third entry mode
   * is driven by a player's own stake in `trigger.ts` and reaches no planner at all. An account with
   * only that mode on therefore offers this walk nothing — and the first version of this reader reported
   * that as "every market kind is switched off", which is false and would have sent an officer to change
   * a correctly configured account. It is a different sentence, so it is a different field.
   */
  reactsOnly: boolean;
  scopeFrom: string | null;
  globalScopeFrom: string | null;
};

/** How many markets each (kind × product) contributes to the sample. Bounded: an officer is waiting. */
export const IDLE_EXPLAIN_LIMIT = 25;

/**
 * ⛔ THE INSTANT IS THE ENGINE'S OWN, AND IT IS CHOSEN HERE. The planner decides which markets are in its
 * window against the CONTAINER clock (`plannerPass` does the same), so a probe that means to agree with
 * the planner must read the same clock. Letting a caller hand one in would let a screen ask about a
 * moment the engine never planned at.
 */
export async function explainBotIdle(
  botId: string,
  o: { nowMs?: number; limit?: number; randomInt?: RandomInt } = {},
): Promise<IdleExplain | null> {
  const nowMs = o.nowMs ?? Date.now();
  const bot = await houseBotStore.get(botId);
  if (!bot || bot.status === "REMOVED") return null;
  const parsed = parseHouseBotRules(bot.rules, await loadParseContext());
  const blank = { rulesUnreadable: true, looked: [], considered: 0, wouldStake: 0, rankedBehind: 0, byCode: [], reactsOnly: false };
  const parseCtxScope = async () => ({
    scopeFrom: (await houseBotRuntimeStore.get(RUNTIME_KEY.bot(bot.id)))?.scopeFrom ?? null,
    globalScopeFrom: (await houseBotRuntimeStore.get(RUNTIME_KEY.global))?.scopeFrom ?? null,
  });
  // ⛔ A SENTENCE, NEVER SILENCE. The Rules tab draws a seeded form for this account since 2026-09-23, so
  // there IS a repair to point at — which is exactly why answering nothing here was the wrong answer.
  if (!parsed.ok) return { ...blank, ...(await parseCtxScope()) };
  const rules = parsed.rules;
  const globalScopeFrom = (await houseBotRuntimeStore.get(RUNTIME_KEY.global))?.scopeFrom ?? null;
  const scopeFrom = (await houseBotRuntimeStore.get(RUNTIME_KEY.bot(bot.id)))?.scopeFrom ?? null;
  // The third entry mode never reaches a planner: a player's stake triggers it. Read it before the walk.
  const reactsOnly = SCOPE_PRODUCTS.every((k) => !(rules.scope.products[k] && (rules.modes[k].fill || rules.modes[k].opener)))
    && SCOPE_PRODUCTS.some((k) => rules.scope.products[k] && rules.modes[k].counter);
  const out: IdleExplain = { rulesUnreadable: false, looked: [], considered: 0, wouldStake: 0, rankedBehind: 0, byCode: [], reactsOnly, scopeFrom, globalScopeFrom };
  // Ruling 92 · a NULL scope start is OUT of scope, never "no bound". The switch is the whole answer.
  if (globalScopeFrom == null || scopeFrom == null) return out;

  const control = await houseBotControlStore.get();
  /* ⭐ N3 · THE WHOLE ROSTER, LOADED AS THE PLANNER LOADS IT. The account's own verdict still comes from walking it
     alone (its refusals are its own); the roster answers the one question that walk cannot — whose turn it is. */
  const parseCtx = await loadParseContext();
  const others: ParsedBot[] = [];
  for (const b of await houseBotStore.listNonRemoved()) {
    if (b.status !== "ACTIVE" || b.id === bot.id) continue;
    const p = parseHouseBotRules(b.rules, parseCtx);
    if (p.ok) others.push({ bot: b, rules: p.rules });
  }
  const roster = await loadPlanCandidates([{ bot, rules }, ...others], nowMs);
  const candidate = roster.find((c) => c.botId === bot.id);
  if (!candidate) return out;
  // The planner moves a winner's turn to its row's due time; this walk writes no row, so it moves it past everyone.
  const busyMs = (b: PlanCandidate) => Math.max(b.lastPlacedAt ? Date.parse(b.lastPlacedAt) : nowMs, b.busyUntil ? Date.parse(b.busyUntil) : nowMs);
  let backOfQueue = Math.max(nowMs, ...roster.map(busyMs));

  const tally = new Map<EngineCode, number>();
  const limit = o.limit ?? IDLE_EXPLAIN_LIMIT;
  const randomInt = o.randomInt ?? defaultRandomInt;
  for (const kind of ["FILL", "OPENER"] as const) {
    for (const product of ["MARKET", "UPDOWN"] as const) {
      const mode = kind === "FILL" ? "fill" : "opener";
      const key = product === "UPDOWN" ? "updown" : "polls";
      // Switched off in this account's own rules: not a refusal, and counting it as one would be a lie.
      if (!rules.scope.products[key] || !rules.modes[key][mode]) continue;
      const toIso = kind === "FILL"
        ? iso(nowMs + (product === "UPDOWN" ? rules.fill.leadUdSec : rules.fill.leadPollsMin * 60) * 1000 + rules.fill.jitterSec * 1000 + PLANNER_INTERVAL_MS)
        : null;
      const rows = await houseSeamStore.plannableMarkets({
        kind, productLine: product, fromIso: iso(nowMs + PLANNER_MIN_CUTOFF_AHEAD_MS), toIso, after: null, limit,
      });
      out.looked.push({ kind, markets: rows.length });
      for (const r of rows) {
        const v = await runMarket(kind, r.id, [candidate], { nowMs, control, globalScopeFrom, randomInt }, false);
        out.considered++;
        const mine = v.byBot.find((x) => x.botId === bot.id);
        const code = v.marketCode ?? mine?.code ?? null;
        if (code != null) tally.set(code, (tally.get(code) ?? 0) + 1);
        /* N3 · whose turn is it here? Every account the SAME pure decision would let take this market (its scope, its
           rules, the market's money — not its holds or caps, which are read only for an account that wins), in turn
           order; this account only if its own full walk said it would stake. Only a market someone would take moves
           a turn — exactly as the planner moves one only for a row it writes. */
        const view = v.view;
        const p = v.probe;
        const wouldTake = (b: PlanCandidate): boolean => {
          if (b.botId === bot.id) return code == null && mine != null;
          if (!view || !p || v.tried.has(b.botId) || !botCovers(b, view, mode)) return false;
          const input = { view, bot: b as DecideBot, ...p, globalScopeFrom };
          return (kind === "FILL" ? planFill(input, { randomInt }) : planOpener({ ...input, openerSide: "YES" }, { randomInt })).row != null;
        };
        const queue = orderBots(roster.filter(wouldTake));
        if (code == null && mine) {
          if (queue[0] == null || queue[0].botId === bot.id) out.wouldStake++;
          else out.rankedBehind++;
        }
        if (queue[0]) { backOfQueue += 1000; markBusy(roster, queue[0].botId, iso(backOfQueue)); }
      }
    }
  }
  out.byCode = [...tally].map(([code, markets]) => ({ code, markets }))
    .sort((a, b) => b.markets - a.markets || (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));
  return out;
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

  // ⛔ No holder summary: the holder is told nothing about stakes from their account (D19c, C4 ruling 149).
  return { summaries, pruned };
}
