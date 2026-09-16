/**
 * FIRE — one claimed intent, re-checked fresh and placed through the money seam (PLAN F5, 04 N1 §4.3 step 6, N2 §4
 * step 7, A16, MON-02, MON-13; C4-SPEC rulings 63–69).
 *
 * `fireClaimedIntent` is the one function the poller and the inline Enter now call. It never decides whether a stake is
 * allowed — the seam's locks do (PLAN I1). It refuses early what has changed since the decision, cuts the stake to what
 * the seam can accept, and hands every answer to `applyOutcome`.
 *
 * ⛔ THE ONLY IMPORTER OF `placeHouseBet` (`test:house-bot-seam` §4.3).
 *
 * ⛔ NEVER INSIDE A LOCK OR AN ADMISSION SLOT (MON-13). The seam takes `wallet:`, `market:` and `house:control`; a fire
 * started inside another lock would join that lock's transaction, and one inside an admission slot would hold two slots.
 *
 * ⛔ ONE MAPPER (ruling 63). A re-check that finds what a bet-path refusal names is applied as that refusal, so a
 * pre-check and the seam write the same row, event, audit and alert.
 *
 * ⛔ A STAKE NEVER GROWS (MON-02, ruling 67). A smaller stake is written back to the claimed row before the seam is
 * called, so H0 compares the figures the row carries; 0 rows written means the row is no longer this worker's.
 */
import { FIRE_HEARTBEAT_MS, HOUSE_PRODUCTS, REQUEUE_BACKOFF_SEC, capEngineCode, houseIntentKey, type EngineCode } from "@/lib/house-bot/constants";
import { HOUSE_LIMITS_SCHEMA_VERSION, parseHouseBotRules, type HouseBotRulesV1 } from "@/lib/house-bot/rules";
import { currentLockTx, inLock } from "../locks";
import { inAdmission } from "../admission";
import { positionStore } from "../market-dal";
import { placeHouseBet, stakeBoundsForMarket } from "../market-service";
import { houseBotIntentStore, houseBotRuntimeStore, houseSeamStore, pressStore, targetStore, type StoredHouseBotIntent } from "../house-bot-dal";
import { applyOutcome, boxAccount, stopBot, type AppliedOutcome, type BetAnswer, type EngineAlerts } from "./outcomes";
import { maintenanceOn, readBotAndHolder, readControl } from "./control";
import { engineState } from "./engine";
import { infoBlackout } from "./blackout";
import { lockedForHouse, lockedPoolInputsOfView } from "./pools";
import { cutoffOf, projectMarketView, scopeCode, type PublicMarketView } from "./market-view";
import { guardsFor, inSchedule, rulesCover, udCloseness } from "./decide";
import { udPriceForDecision } from "./ud-price";
import { loadEnterNowInput, marketHeld } from "./enter-now";
import { enterNowDecision, type EnterNowRefusalCode } from "./enter-now-decision";
import { loadParseContext } from "./rules-context";
import { transientBackoffMs } from "./transient";

export type FireDeps = {
  /** This worker's claim id (`claimedBy`). */
  me: string;
  alerts: EngineAlerts;
  /** An inline Enter now fire (N1 §4.3 step 5) rather than the poller's. */
  inline?: boolean;
};

export type FireResult =
  | { kind: "outcome"; outcome: AppliedOutcome }
  | { kind: "finished"; status: "SKIPPED" | "EXPIRED" | "CANCELLED"; code: EngineCode; written: boolean }
  | { kind: "deferred"; until: string; written: boolean }
  | { kind: "requeued"; written: boolean }
  /** The write-back clamp found the row no longer CLAIMED by this worker. */
  | { kind: "lost" };

const TARGET_ENDED_CANCELS: ReadonlySet<string> = new Set(["VETOED", "CONSENT_VOID", "BOT_REMOVED", "SUNSET"]);

/** N1 §4.3 step 6: what an Enter now decision refusal at fire writes. */
const ENTER_NOW_AT_FIRE = {
  INFO_BLACKOUT: "INFO_BLACKOUT",
  COUNTERPARTY_CONCENTRATION: "COUNTERPARTY_CONCENTRATION",
  HOUSE_ONLY: "CONDITION_GONE",
  ONLY_SELLABLE: "CONDITION_GONE",
  BALANCED: "CONDITION_GONE",
  OWN_OTHER_SIDE: "CAP_OPPOSITE_SIDE",
  STAKE_BELOW_MIN: "STAKE_BOUNDS_CHANGED",
  STAFF_CHOSEN_PER_DAY: "CAP_STAFF_CHOSEN_PER_DAY",
  GLOBAL_STAFF_CHOSEN: "CAP_GLOBAL_STAFF_CHOSEN_PER_DAY",
  COUNTERPARTY_LIMIT: "CAP_COUNTERPARTY_COUNT",
  MIN_GAP: "CAP_MIN_GAP",
  PER_HOUR: "CAP_PER_HOUR",
  PER_DAY: "CAP_PER_DAY",
  GLOBAL_BETS_PER_MINUTE: "CAP_GLOBAL_BETS_PER_MINUTE",
} as const satisfies Record<EnterNowRefusalCode, EngineCode>;

const opposite = (s: "YES" | "NO"): "YES" | "NO" => (s === "YES" ? "NO" : "YES");
const refusal = (reason: string): BetAnswer => ({ ok: false, code: "REFUSED", reason });
const bareCode = (code: "NOT_FOUND" | "INVALID"): BetAnswer => ({ ok: false, code });
const floorTo = (n: number, step: number): number => (step > 0 ? Math.floor(Math.max(0, n) / step) * step : Math.max(0, Math.floor(n)));

/** Ruling 66: does the bot's saved scope still cover this market for this row's kind? */
function coversAtFire(rules: HouseBotRulesV1, view: PublicMarketView, intent: StoredHouseBotIntent): boolean {
  if (intent.kind === "MANUAL") return rules.enterNow.enabled && rulesCover(rules, view, null);
  if (intent.targetId != null) return rules.targeting.enabled && rulesCover(rules, view, null);
  return rulesCover(rules, view, intent.kind === "COUNTER" ? "counter" : intent.kind === "FILL" ? "fill" : "opener");
}

export async function fireClaimedIntent(intent: StoredHouseBotIntent, deps: FireDeps): Promise<FireResult> {
  if (inLock() || currentLockTx() != null) throw new Error("fireClaimedIntent: never inside a lock (MON-13)");
  if (inAdmission()) throw new Error("fireClaimedIntent: never inside an admission slot (MON-13)");
  const state = engineState();
  state.inFlight.set(intent.id, { startedAt: Date.now(), inline: deps.inline === true });
  const beat = setInterval(() => {
    void (async () => {
      try { await houseBotIntentStore.heartbeat(intent.id, deps.me); } catch { /* the claim's TTL is the backstop */ }
    })();
  }, FIRE_HEARTBEAT_MS);
  beat.unref?.();
  try {
    return await fire(intent, deps);
  } finally {
    clearInterval(beat);
    state.inFlight.delete(intent.id);
  }
}

async function fire(row: StoredHouseBotIntent, deps: FireDeps): Promise<FireResult> {
  let intent = row;
  try {
    // 1 · master · 2 · maintenance (F7)
    const control = await readControl();
    if (!control.enabled) return apply(intent, deps, refusal("house_disabled"));
    // F4 · limits saved by a newer build: nothing is placed, nothing is paused — back to PENDING (ruling 100).
    if (control.limitsSchemaVersion > HOUSE_LIMITS_SCHEMA_VERSION) return requeueQuietly(intent, deps);
    if (await maintenanceOn()) return apply(intent, deps, refusal("maintenance"));

    // 3 · bot · 4 · holder
    const read = await readBotAndHolder(intent.houseBotId, { ownerLossStakeTzs: intent.stakeTzs });
    if (!read.found) return apply(intent, deps, read.missing === "BOT" ? refusal("house_bot_inactive") : bareCode("NOT_FOUND"));
    const bot = read.bot;
    if (bot.status !== "ACTIVE" || bot.userId !== intent.botUserId) return apply(intent, deps, refusal("house_bot_inactive"));
    if (read.causes.length > 0 || !read.consentOk) {
      return apply(intent, deps, refusal(read.causes[0]?.code === "OWNER_LOSS_LIMIT" ? "loss_limit_daily" : "house_consent_stale"));
    }

    // 5 · rules (ruling 65)
    const parsed = parseHouseBotRules(bot.rules, await loadParseContext());
    if (!parsed.ok) {
      if (parsed.code === "RULES_FROM_FUTURE") return requeueQuietly(intent, deps);
      await stopBot(bot.id, { to: "AUTO_PAUSED", cause: parsed.code === "RULES_OUTDATED" ? "RULES_OUTDATED" : "RULES_INVALID", field: parsed.field ?? null }, deps.alerts);
      return finish(intent, deps, "CANCELLED", "BOT_NOT_ACTIVE");
    }
    const rules = parsed.rules;

    // 6 · market
    const viewRow = await houseSeamStore.marketView(intent.marketId);
    if (!viewRow) return apply(intent, deps, bareCode("NOT_FOUND"));
    const view = projectMarketView(viewRow);
    if (view.status !== "LIVE") return apply(intent, deps, bareCode("INVALID"));

    // 7 · A12 market scope, product policy, the row's own product · 8 · bot scope (ruling 66)
    const scope = scopeCode(view);
    if (scope) return finish(intent, deps, "SKIPPED", scope);
    if (!(HOUSE_PRODUCTS as readonly string[]).includes(view.productLine) || view.productLine !== intent.productLine) {
      return finish(intent, deps, "SKIPPED", "PRODUCT_NOT_SUPPORTED");
    }
    if (!coversAtFire(rules, view, intent)) return finish(intent, deps, "SKIPPED", "OUT_OF_SCOPE");

    // 9 · A16
    const staffChosen = intent.kind === "MANUAL" || intent.targetId != null;
    if (!staffChosen && view.reopenedAt) return finish(intent, deps, "SKIPPED", "MARKET_REOPENED");
    if (view.round && (!view.round.chainRunning || !view.round.assetEnabled)) return finish(intent, deps, "SKIPPED", "CHAIN_NOT_RUNNING");

    // 10 · the deadline, refreshed against the fresh cutoff, on the database clock
    const nowMs = (await houseBotRuntimeStore.dbClock()).nowMs;
    const product = view.productLine === "UPDOWN" ? "UPDOWN" : "MARKET";
    const cutoffMs = Date.parse(cutoffOf(view) as string);
    const deadlineMs = Math.min(Date.parse(intent.deadlineAt), cutoffMs - guardsFor(rules, product).minTimeToCutoffSec * 1000);
    if (!(nowMs < deadlineMs)) return finish(intent, deps, "EXPIRED", "CUTOFF");

    // 11 · schedule — every kind but Enter now (W8)
    if (intent.kind !== "MANUAL" && !inSchedule(rules, nowMs)) return finish(intent, deps, "SKIPPED", "OUTSIDE_SCHEDULE");

    // 12 · target, blackout, react-to-first (N2 §4 step 7)
    if (intent.targetId != null) {
      const target = await targetStore.get(intent.targetId);
      if (!target || target.status === "REMOVED") return finish(intent, deps, "CANCELLED", "TARGET_REMOVED");
      if (target.status === "ENDED" && target.endCause != null && TARGET_ENDED_CANCELS.has(target.endCause)) return finish(intent, deps, "CANCELLED", "TARGET_ENDED");
    }
    if (staffChosen && (await infoBlackout(intent.marketId)).blocked) return finish(intent, deps, "SKIPPED", "INFO_BLACKOUT");
    if (intent.targetId != null && intent.decision.reactTo === "FIRST" && (await houseBotIntentStore.countPlacedForTarget(intent.targetId)) > 0) {
      return finish(intent, deps, "SKIPPED", "CAP_TARGET_ONCE");
    }

    // 13 · a COUNTER's trigger is still OPEN
    if (intent.kind === "COUNTER") {
      const trigger = intent.triggerPositionId ? await positionStore.get(intent.triggerPositionId) : null;
      if (!trigger || trigger.status !== "OPEN" || trigger.marketId !== intent.marketId) return apply(intent, deps, refusal("house_trigger_gone"));
      // X7 · rulings 136, 159: the trigger account now holds BOTH sides with its own money (house-marked positions are not
      // its choice, as trigger.ts R5 reads them) → box the account and skip. The player's stakes are never touched; the
      // seam's TRIGGER_BOTH_SIDES refusal stays behind this as the in-lock backstop.
      const own = (await positionStore.listForUserAndMarket(trigger.userId, intent.marketId)).filter((p) => p.houseBotId == null && p.status === "OPEN");
      if (own.some((p) => p.side === "YES") && own.some((p) => p.side === "NO")) {
        await boxAccount({ userId: trigger.userId, houseBotId: intent.houseBotId, marketId: intent.marketId, cause: "BOTH_SIDES", intentId: intent.id }, deps.alerts);
        return finish(intent, deps, "SKIPPED", "PENALTY_BOX");
      }
    }

    // 14 · Up & Down closeness on a fresh price (A15)
    if (product === "UPDOWN" && view.round) {
      const key = view.round.chainKey;
      const code = udCloseness(view, await udPriceForDecision(key.slice(0, key.lastIndexOf(":")), { nowMs }), rules.updown.closenessPct);
      if (code) return finish(intent, deps, "SKIPPED", code);
    }

    // 15 · the amount (ruling 67)
    let recomputed: number;
    if (intent.kind === "MANUAL") {
      const held = await marketHeld(intent.houseBotId, intent.marketId, { ignoreIntentId: intent.id });
      if (held.held) return finish(intent, deps, "SKIPPED", held.code === "PER_MARKET_COUNT" ? "CAP_PER_MARKET_COUNT" : "MARKET_HELD");
      const load = await loadEnterNowInput(intent.houseBotId, intent.marketId, { actorId: intent.requestedById, drawnFor: "ENTER_NOW" });
      // A bot, market or rules change between the checks above and this load: try again from the start.
      if (!load.ok) return requeueQuietly(intent, deps);
      const d = enterNowDecision(load.input);
      if (!d.ok) {
        const moved = (d.facts.side != null && d.facts.side !== intent.side) || (d.facts.entryCondition != null && d.facts.entryCondition !== intent.entryCondition);
        return finish(intent, deps, "SKIPPED", moved ? "CONDITION_GONE" : ENTER_NOW_AT_FIRE[d.code]);
      }
      // ⛔ The side is never re-chosen.
      if (d.side !== intent.side || d.entryCondition !== intent.entryCondition) return finish(intent, deps, "SKIPPED", "CONDITION_GONE");
      if (d.possibleAt && d.possibleCode) {
        if (Date.parse(d.possibleAt) < Date.parse(intent.staleAt)) {
          const deferred = await houseBotIntentStore.defer(intent.id, deps.me, d.possibleAt);
          return { kind: "deferred", until: d.possibleAt, written: deferred != null };
        }
        return finish(intent, deps, "SKIPPED", capEngineCode(d.possibleCode));
      }
      recomputed = d.stakeTzs;
    } else {
      const bounds = await stakeBoundsForMarket({ id: view.id, productLine: product });
      let cut = Number.POSITIVE_INFINITY;
      if (intent.kind !== "OPENER") {
        const pools = await lockedForHouse(intent.marketId, lockedPoolInputsOfView(view));
        const opp = opposite(intent.side);
        const against = intent.kind === "COUNTER" && intent.targetId == null ? pools[opp].lockedA15 : pools[opp].locked;
        cut = against - pools[intent.side].raw;
        if (cut <= 0) return finish(intent, deps, "SKIPPED", "CONDITION_GONE");
      }
      const capped = floorTo(Math.min(intent.stakeTzs, cut, bot.stakeMaxTzs ?? 0, bounds.max), rules.shaping.roundToTzs);
      const min = bot.stakeMinTzs == null ? Number.POSITIVE_INFINITY : Math.max(bot.stakeMinTzs, bounds.min);
      if (capped < min) return finish(intent, deps, "SKIPPED", "STAKE_BOUNDS_CHANGED");
      recomputed = capped;
    }

    // 16 · write a smaller stake back to the claimed row (MON-02)
    if (recomputed < intent.stakeTzs) {
      const clamped = await houseBotIntentStore.clampStake(intent.id, deps.me, recomputed);
      if (!clamped) return { kind: "lost" };
      intent = clamped;
    }
  } catch (e) {
    return apply(intent, deps, { thrown: e });
  }

  // 17 · the bet
  let answer: BetAnswer | { thrown: unknown };
  try {
    const res = await placeHouseBet(
      intent.botUserId,
      { marketId: intent.marketId, side: intent.side, stake: intent.stakeTzs, idempotencyKey: houseIntentKey(intent.id) },
      { botId: intent.houseBotId, intentId: intent.id },
    );
    // A refusal with no code is an answer this build does not know: "UNKNOWN" reaches the mapper as UNMAPPED (A10).
    answer = res.ok
      ? { ok: true, ...(res.data?.replayed ? { replayed: true as const } : {}) }
      : { ok: false, code: res.code ?? "UNKNOWN", ...(res.reason ? { reason: res.reason } : {}), ...(res.detail ? { detail: res.detail as Record<string, unknown> } : {}) };
  } catch (e) {
    answer = { thrown: e };
  }
  return apply(intent, deps, answer);
}

/** The mapper, with ruling 68's fallback when the mapper itself cannot write. */
async function apply(intent: StoredHouseBotIntent, deps: FireDeps, answer: BetAnswer | { thrown: unknown }): Promise<FireResult> {
  let outcome: AppliedOutcome;
  try {
    outcome = await applyOutcome({ intent, me: deps.me, answer, alerts: deps.alerts });
  } catch {
    return requeueQuietly(intent, deps);
  }
  await closePress(intent);
  return { kind: "outcome", outcome };
}

async function finish(intent: StoredHouseBotIntent, deps: FireDeps, status: "SKIPPED" | "EXPIRED" | "CANCELLED", code: EngineCode): Promise<FireResult> {
  const written = await houseBotIntentStore.finish(intent.id, deps.me, { status, reasonCode: code });
  await closePress(intent);
  return { kind: "finished", status, code, written };
}

/** Back to PENDING with the MON-10 backoff, never throwing: a claim that cannot be handed back expires. */
async function requeueQuietly(intent: StoredHouseBotIntent, deps: FireDeps): Promise<FireResult> {
  try {
    const r = await houseBotIntentStore.requeueTransient(intent.id, deps.me, transientBackoffMs(intent.transientAttempts, REQUEUE_BACKOFF_SEC));
    return { kind: "requeued", written: r != null };
  } catch {
    return { kind: "requeued", written: false };
  }
}

/** N1 §4.3 step 7: a terminal Enter now intent moves its press to DONE. The planner's press pass repairs a miss. */
async function closePress(intent: StoredHouseBotIntent): Promise<void> {
  if (intent.kind !== "MANUAL") return;
  try {
    const now = await houseBotIntentStore.get(intent.id);
    if (now && now.status !== "PENDING" && now.status !== "CLAIMED") await pressStore.doneEnterNow(intent.id);
  } catch {
    /* repaired by the planner (N1 §4.5) */
  }
}
