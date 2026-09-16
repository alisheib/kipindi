/**
 * THE TRIGGER — a player's stake decided once as a COUNTER: by the post-commit hook for Up & Down, by the sweep for every
 * product (PLAN §4.3, 04 A11, A12, A21, A24, R5, N2 §4 steps 1–6; C4-SPEC rulings 36, 90, 92–97, 101–110, 114–116).
 *
 * ⛔ ONE DECISION PATH. The hook and the sweep both call `decideTrigger`; the hook is only a faster first look. A row the
 * hook inserted anchors the position, so the sweep's page never reads it again (`NOT EXISTS`); a stake the hook could not
 * decide (skew unknown, a full semaphore, a failure) is the sweep's.
 *
 * ⛔ NO STAKE IS PLACED HERE. This module inserts intents only. It never loads `fire.ts` (the one caller of the house bet
 * function) or `oversight.ts` (04 N1 §3); `test:house-bot-engine` pins both.
 *
 * ⛔ THE HOOK NEVER RUNS IN THE BET'S CONTEXT. The call site leaves the lock AND the admission slot before importing this
 * module (rulings 101–102), so nothing here can join the bet's transaction or ride its admission slot.
 *
 * ⛔ ONE READ AT A TIME (ruling 60), and the costly ones only for the bot a row would name (ruling 93): the holding
 * predicate and the cap facts are loaded per decision and never cached across decisions.
 *
 * ⛔ THE WATERMARK IS THE LAST POSITION READ (ruling 104). A decision that failed holds it at the row before, so the next
 * pass's lookback reads the failed row again.
 */
import { randomInt as cryptoRandomInt } from "node:crypto";
import { exitWindowFacts } from "@/lib/exit-window";
import {
  ALERT_KEY,
  HOOK_SEMAPHORE,
  HOOK_SOFT_CACHE_MS,
  HOUSE_PRODUCTS,
  RUNTIME_KEY,
  SWEEP_LOOKBACK_MS,
  SWEEP_MAX_LOOKBACK_MS,
  SWEEP_MIN_AGE_MS,
  SWEEP_PAGE_SIZE,
  type EngineCode,
} from "@/lib/house-bot/constants";
import { HOUSE_LIMITS_SCHEMA_VERSION, parseHouseBotRules } from "@/lib/house-bot/rules";
import { admissionSnapshot, type AdmissionSnapshot } from "../admission";
import { positionStore } from "../market-dal";
import { stakeBoundsForMarket } from "../market-service";
import {
  houseBookStore, houseBotControlStore, houseBotEventStore, houseBotIntentStore, houseBotRuntimeStore, houseBotStore, houseSeamStore,
  newHouseId, targetStore, type StoredHouseBot, type StoredHouseBotControl, type StoredHouseBotTarget, type TriggerRow,
} from "../house-bot-dal";
import { alertOnce, boxAccount, type EngineAlerts } from "./outcomes";
import { engineState, hookSuspendedBySkew, type EngineState, type EngineTicks, type TickContext } from "./engine";
import {
  botCovers, decideCounter, drawTargetDelay, intentRowOf, targetDueAt,
  type CounterInput, type DecideBot, type DecidedRow, type DecideResult, type RandomInt,
} from "./decide";
import { cutoffOf, projectMarketView, scopeCode, type PublicMarketView } from "./market-view";
import { lockedForHouse, lockedPoolInputsOfView } from "./pools";
import { udPriceForDecision } from "./ud-price";
import { infoBlackout } from "./blackout";
import { marketHeld } from "./enter-now";
import { loadParseContext } from "./rules-context";
import { capPrecheck, loadCapFacts } from "./cap-precheck";
import { playerHandle } from "./alerts";

/** What the bet's committed block already holds — nothing read again for the call (ruling 101). */
export type BetFacts = { positionId: string; userId: string; marketId: string; side: "YES" | "NO"; stake: number; placedAt: string };

export type TriggerDeps = {
  alerts: EngineAlerts;
  /** `crypto.randomInt`-shaped, inclusive. Injected so a case can fix a draw. */
  randomInt?: RandomInt;
  /** A24 back-pressure; the platform's admission by default. */
  admission?: () => Pick<AdmissionSnapshot, "queueDepth">;
};

export type TriggerOutcome =
  /** A live bot's account: never a trigger (I3); A21 was checked. */
  | "holder"
  /** The switch is OFF, the limits are a newer build's, never switched on, or no ACTIVE bot can decide. */
  | "idle"
  /** The stake is no longer OPEN (ruling 114). */
  | "closed"
  | "notPlayer"
  | "noMarket"
  | "outOfScope"
  /** No bot's scope covers the stake and no target is armed on its poll. */
  | "notCovered"
  | "inserted"
  /** A row is already anchored on this stake — the hook, a replica or an earlier pass decided first. */
  | "decided";

type Candidate = DecideBot & { stored: StoredHouseBot };

/** What one pass (or one hook call) reads once (ruling 93). */
export type PassFacts = {
  nowMs: number;
  passNow: string;
  control: StoredHouseBotControl;
  globalScopeFrom: string | null;
  /** Every non-REMOVED bot by its holder's user id (I3, A21, HOLDER_RECRUIT). */
  holders: ReadonlyMap<string, StoredHouseBot>;
  /** ACTIVE bots whose rules parse and whose scope has started; their holding and cap flags are loaded per decision. */
  bots: readonly Candidate[];
  decide: boolean;
  /** ACTIVE targets created at or before `passNow`, by market (N2 §4 step 2). */
  targets: ReadonlyMap<string, StoredHouseBotTarget>;
};

const iso = (ms: number) => new Date(ms).toISOString();
const errMessage = (e: unknown) => String((e as Error)?.message ?? e).replace(/\s+/g, " ").slice(0, 300);
const defaultRandomInt: RandomInt = (min, maxInclusive) => cryptoRandomInt(min, maxInclusive + 1);
const assetIdOf = (chainKey: string) => chainKey.slice(0, chainKey.lastIndexOf(":"));

/* ═══ Facts read once ═══════════════════════════════════════════════════════════════════════════ */

export async function loadPassFacts(nowMs: number, opts: { targets: boolean }): Promise<PassFacts> {
  const control = await houseBotControlStore.get();
  const nonRemoved = await houseBotStore.listNonRemoved();
  const facts: PassFacts = {
    nowMs, passNow: iso(nowMs), control, globalScopeFrom: null, holders: new Map(nonRemoved.map((b) => [b.userId, b])),
    bots: [], decide: false, targets: new Map(),
  };
  const active = nonRemoved.filter((b) => b.status === "ACTIVE");
  // F4 · limits saved by a newer build place nothing (ruling 100); OFF, or no ACTIVE bot, decides nothing (A11).
  if (!control.enabled || control.limitsSchemaVersion > HOUSE_LIMITS_SCHEMA_VERSION || active.length === 0) return facts;
  facts.globalScopeFrom = (await houseBotRuntimeStore.get(RUNTIME_KEY.global))?.scopeFrom ?? null;
  if (facts.globalScopeFrom == null) return facts; // ruling 92: never switched on = nothing in scope
  const parseCtx = await loadParseContext();
  const exposure = new Map((await houseBookStore.openExposure(null)).map((r) => [r.houseBotId, r.openStakeTzs]));
  const bots: Candidate[] = [];
  for (const bot of active) {
    const parsed = parseHouseBotRules(bot.rules, parseCtx);
    if (!parsed.ok) continue; // the planner pauses or reports it (ruling 100); the engine never reads unparsed rules
    const scopeFrom = (await houseBotRuntimeStore.get(RUNTIME_KEY.bot(bot.id)))?.scopeFrom ?? null;
    if (scopeFrom == null) continue; // ruling 92
    const last = (await houseSeamStore.placedTimes({ houseBotId: bot.id, withinSec: 86_400 }))[0] ?? null;
    bots.push({
      botId: bot.id, botUserId: bot.userId, label: bot.label, rules: parsed.rules, stakeMinTzs: bot.stakeMinTzs, stakeMaxTzs: bot.stakeMaxTzs,
      capOpenExposureTzs: bot.capOpenExposureTzs, openExposure: exposure.get(bot.id) ?? 0, lastPlacedAt: last, scopeFrom,
      marketHeld: false, capPrecheck: null, stored: bot,
    });
  }
  facts.bots = bots;
  facts.decide = bots.length > 0;
  if (facts.decide && opts.targets) {
    const byMarket = new Map<string, StoredHouseBotTarget>();
    for (const t of await targetStore.listActive({ createdAtOrBefore: facts.passNow })) byMarket.set(t.marketId, t);
    facts.targets = byMarket;
  }
  return facts;
}

/* ═══ One trigger ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * Decide one stake: A21 for a holder's stake, the trigger filter, scope, BOTH_SIDES, then `decideCounter` with the
 * holding and cap flags loaded for the bot a row would name, and the insert. Throws when a read fails — the sweep holds
 * its watermark and the lookback reads the stake again.
 */
export async function decideTrigger(row: TriggerRow, f: PassFacts, deps: TriggerDeps): Promise<TriggerOutcome> {
  const randomInt = deps.randomInt ?? defaultRandomInt;

  // I3 · a live bot's account is never a trigger. A21 · its stake against its own bot is told, whatever the switch says
  // (ruling 105): never refused, never a pause.
  const holderBot = f.holders.get(row.userId);
  if (holderBot) {
    await holderAgainstOwnBot(row, holderBot, deps.alerts);
    return "holder";
  }
  if (!f.decide) return "idle";
  // Ruling 114 · a stake already cashed out or settled is not countered: a row written now would only box the player at fire.
  if (row.status !== "OPEN") return "closed";

  const account = await houseSeamStore.triggerAccount(row.userId);
  if (!account || account.role !== "PLAYER") return "notPlayer";
  // R5 BOTH_SIDES before the filter reads the box (ruling 106).
  const boxed = account.penaltyToday || (await bothSides(row, deps.alerts));

  const viewRow = await houseSeamStore.marketView(row.marketId);
  if (!viewRow) return "noMarket";
  const view = projectMarketView(viewRow);
  const denied = !(HOUSE_PRODUCTS as readonly string[]).includes(view.productLine);
  await scopeAlerts(view, denied, deps.alerts);
  if (scopeCode(view) != null || denied || view.status !== "LIVE") return "outOfScope";
  const placedMs = Date.parse(row.placedAt);
  // A11 · a NULL scope start is out of scope (ruling 92).
  if (f.globalScopeFrom == null || placedMs < Date.parse(f.globalScopeFrom)) return "outOfScope";

  const product = view.productLine === "UPDOWN" ? "UPDOWN" : "MARKET";
  // N2 §4 step 1 · targets are polls-only.
  const target = product === "MARKET" ? f.targets.get(view.id) ?? null : null;
  const targetBot = target ? f.bots.find((b) => b.botId === target.houseBotId) ?? null : null;
  const covered = f.bots.some((b) => b.scopeFrom != null && placedMs >= Date.parse(b.scopeFrom) && botCovers(b, view, "counter"));
  if (!covered && !targetBot) return "notCovered";

  const filtered: CounterInput["filtered"] = boxed ? "PENALTY_BOX"
    : account.recruitedBy != null && f.holders.has(account.recruitedBy) ? "HOLDER_RECRUIT" : null;
  const pools = await lockedForHouse(view.id, lockedPoolInputsOfView(view));
  const price = product === "UPDOWN" && view.round ? await udPriceForDecision(assetIdOf(view.round.chainKey), { nowMs: f.nowMs }) : null;
  const bounds = await stakeBoundsForMarket({ id: view.id, productLine: product });
  // N2 §4 step 3 · one blackout read per poll with an armed target; it gates the target candidate only (ruling 41).
  const blocked = targetBot ? (await infoBlackout(view.id)).blocked : false;
  const prepared = target && targetBot
    ? filtered ? { ...targetFields(target), drawnDelaySec: 0, lockedAtDue: null } : await prepareTarget(target, view, row, placedMs, randomInt)
    : null;

  const base: DecideBase = {
    view,
    trigger: { positionId: row.id, userId: row.userId, handle: playerHandle(row.userId), side: row.side, stakeTzs: row.stake, placedAt: row.placedAt },
    filtered, globalScopeFrom: f.globalScopeFrom, pools, price, blocked, bounds, passNow: f.passNow,
  };
  const scope: DecideScope = { f, view, row, bounds, randomInt };
  let decided = await decideWithFlags(base, prepared, scope);
  if (!decided.row) return "notCovered";
  if (decided.row.targetId != null) {
    const r = await houseBotIntentStore.insertTargetedIfActive(decided.row.targetId, intentOf(decided.row, row, f));
    if (r.inserted) return "inserted";
    if (r.targetActive) return "decided";
    // N2 §4 step 4.6 · the target ended between the pass read and the insert: decide again untargeted, in this pass.
    decided = await decideWithFlags(base, null, scope);
    if (!decided.row) return "notCovered";
  }
  return (await houseBotIntentStore.insertIgnoringConflict(intentOf(decided.row, row, f))) ? "inserted" : "decided";
}

type DecideBase = Omit<CounterInput, "bots" | "target">;
type TargetPrep = Omit<NonNullable<CounterInput["target"]>, "staffChosenRoomTzs">;
type DecideScope = { f: PassFacts; view: PublicMarketView; row: TriggerRow; bounds: { min: number; max: number }; randomInt: RandomInt };
type Flags = { marketHeld: boolean; capPrecheck: EngineCode | null; roomTzs: number };

const intentOf = (d: DecidedRow, row: TriggerRow, f: PassFacts) => intentRowOf(d, { id: newHouseId("intent"), anchorKey: row.id, nowIso: f.passNow });

function targetFields(t: StoredHouseBotTarget) {
  return { targetId: t.id, houseBotId: t.houseBotId, delayMinSec: t.delayMinSec, delayMaxSec: t.delayMaxSec, timingFrom: t.timingFrom, reactTo: t.reactTo, effectiveFrom: t.effectiveFrom };
}

/** N2 §4 step 5 · the delay is drawn, then the money is read as of the due time (rulings 38, 108). */
async function prepareTarget(t: StoredHouseBotTarget, view: PublicMarketView, row: TriggerRow, placedMs: number, randomInt: RandomInt): Promise<TargetPrep> {
  const delaySec = drawTargetDelay(t, randomInt);
  const exit = exitWindowFacts({
    placedAtMs: placedMs,
    closesAtMs: Date.parse(view.selectionClosedAt ?? view.resolutionAt),
    freeExitGraceMinutes: view.exitRates.graceMin,
    paidExitWindowMinutes: view.exitRates.paidMin,
  });
  const { dueMs } = targetDueAt({ placedAtMs: placedMs, exitCloseAtMs: exit.exitCloseAtMs, timingFrom: t.timingFrom, delaySec });
  const atDue = await lockedForHouse(view.id, { ...lockedPoolInputsOfView(view), asOf: iso(dueMs) });
  return { ...targetFields(t), drawnDelaySec: delaySec, lockedAtDue: atDue[row.side].locked };
}

/**
 * Ruling 93 · `decideCounter` runs with every bot's holding and cap flags unloaded; when it names a bot for a row that is
 * not SKIPPED, that bot's `marketHeld` and `capPrecheck` (and, for a target, the staff-chosen room) are read and the
 * decision runs again with them. A bot is loaded at most once, so this ends within bots + 1 decisions.
 */
async function decideWithFlags(base: DecideBase, target: TargetPrep | null, s: DecideScope): Promise<DecideResult> {
  const flags = new Map<string, Flags>();
  const input = (): CounterInput => ({
    ...base,
    bots: s.f.bots.map((b) => {
      const fl = flags.get(b.botId);
      return { ...b, reactRoll: rollFor(b.botId), ...(fl ? { marketHeld: fl.marketHeld, capPrecheck: fl.capPrecheck } : {}) };
    }),
    // Before its bot is loaded the room is not yet known; the row that would use it forces the load below.
    target: target ? { ...target, staffChosenRoomTzs: flags.get(target.houseBotId)?.roomTzs ?? Number.POSITIVE_INFINITY } : null,
  });
  // Ruling 164 · one react roll per bot per pass. The decision is re-run once a bot's flags are loaded, and a second
  // draw would compound the configured probability (p²). Memoised by botId, not replayed by position: a bot its flags
  // refuse consumes fewer draws on the later run.
  const rolls = new Map<string, number>();
  const rollFor = (botId: string): number => {
    const seen = rolls.get(botId);
    if (seen != null) return seen;
    const v = s.randomInt(1, 100);
    rolls.set(botId, v);
    return v;
  };
  let decided = decideCounter(input(), { randomInt: s.randomInt });
  for (let i = 0; i <= s.f.bots.length; i++) {
    const r = decided.row;
    if (!r || r.status === "SKIPPED" || flags.has(r.houseBotId)) return decided;
    const bot = s.f.bots.find((b) => b.botId === r.houseBotId);
    if (!bot) return decided;
    flags.set(bot.botId, await loadFlags(bot, r.targetId != null, s));
    decided = decideCounter(input(), { randomInt: s.randomInt });
  }
  return decided;
}

async function loadFlags(bot: Candidate, staffChosen: boolean, s: DecideScope): Promise<Flags> {
  // Rulings 58–59, 93 · the one holding predicate: any held answer is a hold, because the seam refuses each.
  if ((await marketHeld(bot.botId, s.view.id)).held) return { marketHeld: true, capPrecheck: null, roomTzs: 0 };
  // Ruling 94 · the seam's money caps at the smallest stake the bot could place; the trigger account is the counterparty.
  const facts = await loadCapFacts(bot.stored, s.view.id, { control: s.f.control, nowMs: s.f.nowMs, staffChosen, counterpartyUserId: s.row.userId });
  const code = capPrecheck(facts, Math.max(bot.stakeMinTzs ?? s.bounds.min, s.bounds.min));
  // N2 §4 step 6 · the staff-chosen TZS left today, bot and platform (a cap that is not set leaves none; capPrecheck refuses it).
  const roomTzs = facts.staffChosen
    ? Math.min((bot.stored.capStaffChosenDailyTzs ?? 0) - facts.staffChosen.tzs, (s.f.control.gCapStaffChosenDailyTzs ?? 0) - facts.staffChosen.globalTzs)
    : Number.POSITIVE_INFINITY;
  return { marketHeld: false, capPrecheck: code, roomTzs };
}

/* ═══ A21, R5 BOTH_SIDES, once-only scope alerts ═════════════════════════════════════════════════ */

/**
 * A21 (ruling 105): the holder staked against their own bot's OPEN house stake on this market. One alert per bot and
 * market (`holder-against:<botId>:<marketId>`, the claim given back on a failed send) and, once it went out, one
 * HOLDER_AGAINST_BOT event with aggregates only (D6). Same side, or no OPEN house stake here: nothing.
 */
async function holderAgainstOwnBot(row: TriggerRow, bot: StoredHouseBot, alerts: EngineAlerts): Promise<boolean> {
  const positions = await positionStore.listForUserAndMarket(bot.userId, row.marketId);
  const against = positions.filter((p) => p.houseBotId === bot.id && p.status === "OPEN" && p.side !== row.side);
  if (against.length === 0) return false;
  const detail = { side: row.side, stakeTzs: row.stake, botSide: against[0].side, botStakeTzs: against.reduce((sum, p) => sum + p.stake, 0) };
  const sent = await alertOnce(ALERT_KEY.holderAgainst(bot.id, row.marketId), alerts, { code: "HOLDER_AGAINST_BOT", botId: bot.id, marketId: row.marketId, detail });
  if (!sent) return false;
  await houseBotEventStore.append({
    houseBotId: bot.id, userId: bot.userId, marketId: row.marketId, kind: "HOLDER_AGAINST_BOT", fromStatus: null, toStatus: null,
    reason: null, actorId: null, payload: detail,
  });
  return true;
}

/**
 * R5 BOTH_SIDES (ruling 106): the house countered this account on this market (a PLACED COUNTER on it) and the account
 * now holds OPEN stakes on both sides there → the penalty box, naming that COUNTER. True when the account is boxed.
 */
async function bothSides(row: TriggerRow, alerts: EngineAlerts): Promise<boolean> {
  const counter = await houseBotIntentStore.placedCounterFor(row.userId, row.marketId);
  if (!counter) return false;
  const open = (await positionStore.listForUserAndMarket(row.userId, row.marketId)).filter((p) => p.houseBotId == null && p.status === "OPEN");
  if (!open.some((p) => p.side === "YES") || !open.some((p) => p.side === "NO")) return false;
  await boxAccount({ userId: row.userId, houseBotId: counter.houseBotId, marketId: row.marketId, cause: "BOTH_SIDES", intentId: counter.id }, alerts);
  return true;
}

/**
 * Ruling 90 · the once-only alerts for holes the trigger is first to see: an Up & Down market with no round, a raw product
 * line no policy admits (never for a demo market), and a round whose cutoff is at or before its market's creation.
 * An alert that fails gives its claim back and never blocks the decision.
 */
async function scopeAlerts(view: PublicMarketView, denied: boolean, alerts: EngineAlerts): Promise<void> {
  try {
    const code = scopeCode(view);
    if (code === "UD_NO_ROUND") {
      await alertOnce(ALERT_KEY.udOrphanMarket(view.id), alerts, { code: "UD_ORPHAN_MARKET", marketId: view.id });
    } else if (denied && !view.isDemo) {
      await alertOnce(ALERT_KEY.productDenied(view.productLine), alerts, { code: "PRODUCT_DENIED", marketId: view.id, detail: { productLine: view.productLine } });
    } else if (code == null && view.round) {
      const cutoff = cutoffOf(view);
      if (cutoff != null && Date.parse(cutoff) <= Date.parse(view.createdAt)) {
        await alertOnce(ALERT_KEY.udBornUnlocked(view.round.roundId), alerts, { code: "UD_BORN_UNLOCKED", marketId: view.id, detail: { roundId: view.round.roundId } });
      }
    }
  } catch (e) {
    console.error("[house-bot] a once-only scope alert failed (its claim was given back):", errMessage(e));
  }
}

/* ═══ The sweep (rulings 103–104) ═══════════════════════════════════════════════════════════════ */

export type SweepPass = {
  passNowIso: string | null;
  skipped: "ADMISSION" | null;
  read: number;
  outcomes: Partial<Record<TriggerOutcome, number>>;
  failed: number;
  /** The watermark this pass asked for, and whether it moved (forward-only). */
  advance: { placedAt: string; id: string; moved: boolean } | null;
};

export async function sweepPass(_ctx: TickContext, deps: TriggerDeps): Promise<SweepPass> {
  const out: SweepPass = { passNowIso: null, skipped: null, read: 0, outcomes: {}, failed: 0, advance: null };
  // A24 · players first: no pass while admission has a queue.
  if ((deps.admission ?? admissionSnapshot)().queueDepth > 0) {
    out.skipped = "ADMISSION";
    return out;
  }
  // N2 §4 step 2 · passNow is read once, on the database clock.
  const nowMs = (await houseBotRuntimeStore.dbClock()).nowMs;
  out.passNowIso = iso(nowMs);
  const beforeMs = nowMs - SWEEP_MIN_AGE_MS;
  const facts = await loadPassFacts(nowMs, { targets: true });
  let target: { placedAt: string; id: string } | null = { placedAt: iso(beforeMs), id: "" };

  // Ruling 115 · with no bot at all there is nothing to decide and no holder to watch: the watermark moves with no read.
  if (facts.decide || facts.holders.size > 0) {
    const mark = await houseBotRuntimeStore.get(RUNTIME_KEY.global);
    const markMs = mark?.sweepPlacedAt ? Date.parse(mark.sweepPlacedAt) : beforeMs;
    // A11 · max(watermark − 90 s, dbNow − 10 min).
    const fromIso = iso(Math.max(markMs - SWEEP_LOOKBACK_MS, nowMs - SWEEP_MAX_LOOKBACK_MS));
    let after: { placedAt: string; id: string } | null = null;
    let lastGood: { placedAt: string; id: string } | null = null;
    for (;;) {
      const page = await houseSeamStore.triggerPage({ fromIso, beforeIso: iso(beforeMs), after, limit: SWEEP_PAGE_SIZE });
      for (const r of page) {
        out.read++;
        try {
          const o = await decideTrigger(r, facts, deps);
          out.outcomes[o] = (out.outcomes[o] ?? 0) + 1;
          if (out.failed === 0) lastGood = { placedAt: r.placedAt, id: r.id };
        } catch (e) {
          out.failed++;
          console.error("[house-bot] a trigger decision failed — the lookback reads it again:", errMessage(e));
        }
      }
      if (page.length < SWEEP_PAGE_SIZE) break;
      after = { placedAt: page[page.length - 1].placedAt, id: page[page.length - 1].id };
    }
    // Ruling 104 · the last position read; nothing read → passNow − 5 s; a failure → the row before it (or no move).
    target = out.failed > 0 ? lastGood : lastGood ?? target;
  }
  if (target) out.advance = { ...target, moved: await houseBotRuntimeStore.advanceSweep(target.placedAt, target.id) };
  return out;
}

/* ═══ The post-commit hook (rulings 101–102, 109–110) ════════════════════════════════════════════ */

export type HookOutcome = TriggerOutcome | "notStarted" | "skew" | "dropped" | "failed";

/**
 * A player's committed Up & Down stake. Never throws and never awaits on the bet path (the call site does not wait).
 * Every early return leaves the stake to the sweep.
 */
export async function onPlayerBetCommitted(facts: BetFacts, opts: { state?: EngineState; randomInt?: RandomInt } = {}): Promise<HookOutcome> {
  const state = opts.state ?? engineState();
  const hook = state.hook;
  const alerts = hook.alerts;
  // Ruling 109 · a container whose engine has not started leaves every trigger to the leader's sweep.
  if (!state.started || state.stopping || alerts == null) return "notStarted";
  // N2 §4 step 1 · suspended while this container's skew is unknown or over 5 s.
  if (hookSuspendedBySkew(state)) return "skew";
  // A24 · at most HOOK_SEMAPHORE calls at once; the overflow is dropped and counted (ruling 110).
  if (hook.inFlight >= HOOK_SEMAPHORE) {
    hook.dropped++;
    return "dropped";
  }
  hook.inFlight++;
  try {
    // PLAN §4.3 · a 5 s soft cache of "switch ON and any bot ACTIVE", with the holders A21 watches. A stale cache costs
    // one decision the sweep makes instead, or a row fire cancels: firing re-reads everything.
    if (hook.cache == null || Date.now() - hook.cache.atMs >= HOOK_SOFT_CACHE_MS) {
      const bots = await houseBotStore.listNonRemoved();
      const control = await houseBotControlStore.get();
      hook.cache = { atMs: Date.now(), live: control.enabled && bots.some((b) => b.status === "ACTIVE"), holderIds: new Set(bots.map((b) => b.userId)) };
    }
    if (!hook.cache.live && !hook.cache.holderIds.has(facts.userId)) return "idle";
    const nowMs = (await houseBotRuntimeStore.dbClock()).nowMs;
    const passFacts = await loadPassFacts(nowMs, { targets: false });
    const row: TriggerRow = { id: facts.positionId, userId: facts.userId, marketId: facts.marketId, side: facts.side, stake: facts.stake, placedAt: facts.placedAt, status: "OPEN" };
    return await decideTrigger(row, passFacts, { alerts, randomInt: opts.randomInt });
  } catch (e) {
    console.error("[house-bot] the bet hook failed — the sweep decides this stake:", errMessage(e));
    return "failed";
  } finally {
    hook.inFlight--;
  }
}

/** The engine's sweep tick and the hook's alert channel for `startHouseBotEngine`. Alerts are required (ruling 46). */
export function triggerTicks(alerts: EngineAlerts): Pick<EngineTicks, "sweepTick" | "hookAlerts"> {
  return {
    hookAlerts: alerts,
    sweepTick: async (ctx) => {
      await sweepPass(ctx, { alerts });
    },
  };
}
