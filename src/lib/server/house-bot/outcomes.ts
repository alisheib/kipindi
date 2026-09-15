/**
 * WHAT A BET-PATH ANSWER WRITES — the outcome mapper's side effects (PLAN §4.6, 04 A8, A10, A19, N1 §4.3, §4.6).
 *
 * `outcome-map.ts` decides WHICH action a result is; this module performs it on the row this worker claimed.
 * Every terminal write is conditional on `status='CLAIMED' AND "claimedBy"=$me` (the DAL's `finish`, `requeueTransient`,
 * `defer`); 0 rows means another worker owns the row, and nothing else is written.
 *
 * ⛔ THE AUTO-PAUSE ORDER (04 A19). The status write commits under `wallet:<botUser>` — the lock every Pause,
 * auto-pause and Remove takes, so a CLAIMED intent already past H1 is refused inside the lock. EVERYTHING ELSE runs
 * after that lock returns: cancelling the bot's intents, the event, the awaited COMPLIANCE audit, the alerts. An
 * audit append takes a database-wide serialised lock; holding the holder's wallet lock across it would stall their
 * own bets.
 *
 * ⛔ ALERTS ARE A REQUIRED ARGUMENT. There is no default: an engine that runs with a silent alert channel would
 * place stakes nobody is told about. The emitters are build step 9; the engine is wired into the server with them
 * (C4-SPEC ruling 46).
 */
import { audit } from "../audit";
import { withLock } from "../locks";
import { db } from "../store";
import {
  houseBotAlertOnceStore,
  houseBotControlStore,
  houseBotEventStore,
  houseBotIntentStore,
  houseBotRuntimeStore,
  houseBotStore,
  houseSeamStore,
  type StoredHouseBot,
  type StoredHouseBotIntent,
} from "../house-bot-dal";
import {
  ALERT_KEY,
  DEFERRABLE_CAP_CODES,
  ERROR_STREAK_OFF_AT,
  HOUSE_AUDIT,
  RUNTIME_KEY,
  REQUEUE_BACKOFF_SEC,
  SYSTEM_HOUSE_BOT_ACTOR,
  TRANSIENT_ALERT_AFTER_MS,
  capEngineCode,
  isAllowedHouseAuditPayload,
  isCapCode,
  type EatSuffixedKey,
  type EngineCode,
  type HouseAuditAction,
  type OffCause,
} from "@/lib/house-bot/constants";
import { isConsentVoidCause, isPauseReason, type PauseReason } from "@/lib/house-bot/pause-reasons";
import { OUTCOME_TABLE, outcomeKey, type OutcomeAction } from "./outcome-map";
import { isEngineTransient, transientBackoffMs } from "./transient";
import { readBotAndHolder } from "./control";
import { voidHouseConsent } from "./designation";

/** What the engine tells people. Step 9 supplies the real emitters; tests inject recorders. */
export type EngineAlerts = {
  /** A8: sent only after this worker won the `alertedAt` claim on a PLACED row. */
  placed(intent: StoredHouseBotIntent): Promise<void>;
  /** An admin alert, sent at most once per AlertOnce key (claimed before the call). */
  once(key: string, message: EngineAlertMessage): Promise<void>;
  /** SECURITY: the engine found a defect and switched house bots off. */
  security(message: EngineAlertMessage): Promise<void>;
  /** A bot was auto-paused or removed by the engine. */
  botStopped(bot: StoredHouseBot, change: { to: "AUTO_PAUSED" | "REMOVED"; cause: PauseReason | "ACCOUNT_CLOSED"; cancelled: number }): Promise<void>;
};

export type EngineAlertMessage = { code: string; botId?: string | null; intentId?: string | null; marketId?: string | null; detail?: Record<string, unknown> };

export type BetAnswer = { ok: true; replayed?: true } | { ok: false; code: string; reason?: string; detail?: Record<string, unknown> };

export type AppliedOutcome =
  | { kind: "placed"; alerted: boolean }
  | { kind: "noop" }
  | { kind: "requeued"; nextAttemptAt: string | null }
  | { kind: "deferred"; until: string }
  | { kind: "terminal"; status: "SKIPPED" | "EXPIRED" | "FAILED" | "CANCELLED"; code: EngineCode; written: boolean }
  | { kind: "botStopped"; to: "AUTO_PAUSED" | "REMOVED"; cause: string };

/* ═══ Engine audits (04 A19 allowlist) ═════════════════════════════════════════════════════════════ */

async function engineAudit(action: HouseAuditAction, target: { type: "HouseBot"; id: string } | { type: "HouseBotControl"; id: string }, payload: Record<string, unknown>): Promise<string | null> {
  if (!isAllowedHouseAuditPayload(payload)) throw new Error(`house engine audit ${action}: payload keys outside the R7 allowlist`);
  const entry = (await audit({ category: HOUSE_AUDIT[action], action, actorId: SYSTEM_HOUSE_BOT_ACTOR, targetType: target.type, targetId: target.id, payload })) as unknown;
  const id = entry && typeof entry === "object" && typeof (entry as { id?: unknown }).id === "string" ? (entry as { id: string }).id : null;
  return id;
}

async function alertOnce(key: string | EatSuffixedKey, alerts: EngineAlerts, message: EngineAlertMessage): Promise<boolean> {
  const claim = typeof key === "string"
    ? { claimed: await houseBotAlertOnceStore.claim(key), key }
    : await houseBotAlertOnceStore.claimWithEatSuffix(key.prefix, key.unit);
  if (!claim.claimed) return false;
  try {
    await alerts.once(claim.key, message);
  } catch (e) {
    // Give the claim back, so the next occurrence tells someone (C3 review LI-8).
    await houseBotAlertOnceStore.release(claim.key).catch(() => {});
    throw e;
  }
  return true;
}

/* ═══ Bot stops (04 A19 order) ═════════════════════════════════════════════════════════════════════ */

/**
 * AUTO_PAUSED, or REMOVED for a closed account (A5). The status write is the only statement under the wallet lock;
 * a bot already out of ACTIVE is left as it is (a second worker's pause writes nothing more).
 */
export async function stopBot(botId: string, change: { to: "AUTO_PAUSED"; cause: PauseReason } | { to: "REMOVED"; cause: "ACCOUNT_CLOSED" }, alerts: EngineAlerts): Promise<boolean> {
  const bot = await houseBotStore.get(botId);
  if (!bot) return false;
  const moved = await withLock(`wallet:${bot.userId}`, (tx) =>
    change.to === "REMOVED"
      ? houseBotStore.setStatus(bot.id, { from: ["ACTIVE", "PAUSED", "AUTO_PAUSED"], to: "REMOVED", pauseReason: null, pausedFromStatus: null, removal: { byId: null, reason: null, cause: "ACCOUNT_CLOSED" } }, tx ?? undefined)
      : houseBotStore.setStatus(bot.id, { from: ["ACTIVE"], to: "AUTO_PAUSED", pauseReason: change.cause, pauseDetail: null, pausedFromStatus: "ACTIVE" }, tx ?? undefined),
  );
  if (!moved) return false;
  // ── after the lock ──
  const cancelled = await houseBotIntentStore.cancelLive({ houseBotId: bot.id }, "BOT_NOT_ACTIVE");
  const event = await houseBotEventStore.append({
    houseBotId: bot.id, userId: bot.userId, marketId: null, kind: change.to === "REMOVED" ? "REMOVED" : "AUTO_PAUSED",
    fromStatus: bot.status, toStatus: change.to, reason: null, actorId: null, payload: { cause: change.cause, cancelled: cancelled.length },
  });
  const auditId = await engineAudit(change.to === "REMOVED" ? "house_bot.removed" : "house_bot.auto_paused", { type: "HouseBot", id: bot.id }, {
    botId: bot.id, holderUserId: bot.userId, from: bot.status, to: change.to, cause: change.cause, counts: { cancelled: cancelled.length },
  });
  if (auditId) await houseBotEventStore.setAuditId(event.id, auditId);
  await alerts.botStopped(moved, { to: change.to, cause: change.cause, cancelled: cancelled.length });
  return true;
}

/** Master OFF from the engine (ENGINE_FAULT or ENGINE_ERRORS). Conditional: two workers faulting at once write one. */
export async function engineSwitchOff(cause: Extract<OffCause, "ENGINE_FAULT" | "ENGINE_ERRORS">, alerts: EngineAlerts, message: EngineAlertMessage): Promise<boolean> {
  const off = await houseBotControlStore.switchOff({ cause, byId: null, reason: null });
  if (!off) return false;
  const cancelled = await houseBotIntentStore.cancelLive({ all: true }, "MASTER_OFF");
  const event = await houseBotEventStore.append({
    houseBotId: null, userId: null, marketId: null, kind: "SWITCH_OFF", fromStatus: "ON", toStatus: "OFF", reason: null, actorId: null,
    payload: { cause, cancelled: cancelled.length },
  });
  const auditId = await engineAudit(cause === "ENGINE_FAULT" ? "house_bot.engine_fault" : "house_bot.switch_off", { type: "HouseBotControl", id: off.id }, {
    from: "ON", to: "OFF", cause, counts: { cancelled: cancelled.length },
  });
  if (auditId) await houseBotEventStore.setAuditId(event.id, auditId);
  await alerts.security(message);
  return true;
}

/* ═══ The mapper ═══════════════════════════════════════════════════════════════════════════════════ */

async function terminal(intent: StoredHouseBotIntent, me: string, status: "SKIPPED" | "EXPIRED" | "FAILED" | "CANCELLED", code: EngineCode): Promise<Extract<AppliedOutcome, { kind: "terminal" }>> {
  const written = await houseBotIntentStore.finish(intent.id, me, { status, reasonCode: code });
  return { kind: "terminal", status, code, written };
}

async function transient(intent: StoredHouseBotIntent, me: string, alerts: EngineAlerts, rateLimited: boolean): Promise<AppliedOutcome> {
  const run = await houseBotRuntimeStore.markTransient();
  if (run.transientSince && Date.now() - Date.parse(run.transientSince) >= TRANSIENT_ALERT_AFTER_MS) {
    await alertOnce(ALERT_KEY.engineDb(), alerts, { code: "ENGINE_DB_TRANSIENT", intentId: intent.id });
  }
  if (rateLimited) {
    const { count } = await houseBotRuntimeStore.bumpRateLimited(RUNTIME_KEY.bot(intent.houseBotId));
    // PLAN §4.6: two `rate_limited` in an hour means the holder is using the account — one contention alert.
    if (count >= 2) await alertOnce(ALERT_KEY.botDaily(intent.houseBotId, "HOLDER_CONTENTION"), alerts, { code: "HOLDER_CONTENTION", botId: intent.houseBotId });
  }
  const requeued = await houseBotIntentStore.requeueTransient(intent.id, me, transientBackoffMs(intent.transientAttempts, REQUEUE_BACKOFF_SEC));
  if (requeued) return { kind: "requeued", nextAttemptAt: requeued.nextAttemptAt };
  // No time left before staleAt or the deadline: terminal on whichever bound is nearer (N1 §4.3 MON-10).
  const nearer = Date.parse(intent.staleAt) <= Date.parse(intent.deadlineAt) ? "STALE" : "BUSY_TIMEOUT";
  return terminal(intent, me, "EXPIRED", nearer);
}

async function penaltyBox(intent: StoredHouseBotIntent): Promise<void> {
  if (!intent.triggerUserId) return;
  const key = ALERT_KEY.penalty(intent.triggerUserId);
  const claim = await houseBotAlertOnceStore.claimWithEatSuffix(key.prefix, key.unit);
  if (!claim.claimed) return;
  await houseBotEventStore.append({
    houseBotId: intent.houseBotId, userId: intent.triggerUserId, marketId: intent.marketId, kind: "PENALTY_BOXED",
    fromStatus: null, toStatus: null, reason: null, actorId: null, payload: { cause: "CASHED_OUT_COUNTERED", intentId: intent.id },
  });
}

/**
 * Apply one bet-path answer — or a throw — to the intent this worker claimed.
 */
export async function applyOutcome(input: { intent: StoredHouseBotIntent; me: string; answer: BetAnswer | { thrown: unknown }; alerts: EngineAlerts }): Promise<AppliedOutcome> {
  const { intent, me, alerts } = input;
  const answer = input.answer;

  if ("thrown" in answer) {
    if (isEngineTransient(answer.thrown)) return transient(intent, me, alerts, false);
    const out = await terminal(intent, me, "FAILED", "INTERNAL");
    const streak = await houseBotRuntimeStore.bumpErrorStreak();
    if (streak >= ERROR_STREAK_OFF_AT) await engineSwitchOff("ENGINE_ERRORS", alerts, { code: "ENGINE_ERRORS", intentId: intent.id, detail: { streak } });
    return out;
  }

  const key = outcomeKey(answer);
  if (key == null) {
    // A10: a refusal this build does not know. Fail the row, pause the bot, tell someone once.
    const out = await terminal(intent, me, "FAILED", "UNMAPPED");
    await stopBot(intent.houseBotId, { to: "AUTO_PAUSED", cause: "UNMAPPED_REFUSAL" }, alerts);
    await alertOnce(ALERT_KEY.botDaily(intent.houseBotId, "UNMAPPED_REFUSAL"), alerts, {
      code: "UNMAPPED_REFUSAL", botId: intent.houseBotId, intentId: intent.id, detail: { reason: answer.ok ? "ok" : (answer.reason ?? answer.code) },
    });
    return out;
  }
  const action: OutcomeAction = OUTCOME_TABLE[key];

  switch (action.kind) {
    case "placed": {
      await houseBotRuntimeStore.resetErrorStreak();
      const won = await houseBotIntentStore.markAlerted(intent.id);
      if (won) await alerts.placed(intent);
      return { kind: "placed", alerted: won };
    }
    case "noop":
      return { kind: "noop" };
    case "transient":
      return transient(intent, me, alerts, key === "rate_limited");
    case "terminal": {
      const out = await terminal(intent, me, action.status, action.code);
      if (!out.written) return out;
      if (action.alert === "botDaily") await alertOnce(ALERT_KEY.botDaily(intent.houseBotId, action.code), alerts, { code: action.code, botId: intent.houseBotId, intentId: intent.id });
      if (action.alert === "stakeNotWhole") await alertOnce(ALERT_KEY.stakeNotWhole(intent.houseBotId), alerts, { code: "STAKE_NOT_WHOLE", botId: intent.houseBotId, intentId: intent.id });
      if (action.penalty) await penaltyBox(intent);
      if (action.engineFault) await engineSwitchOff("ENGINE_FAULT", alerts, { code: answer.ok ? "ENGINE_FAULT" : (answer.reason ?? answer.code), botId: intent.houseBotId, intentId: intent.id });
      return out;
    }
    case "autoPause": {
      await stopBot(intent.houseBotId, { to: "AUTO_PAUSED", cause: action.cause }, alerts);
      if (action.anomaly) await alertOnce(ALERT_KEY.botDaily(intent.houseBotId, "ANOMALY"), alerts, { code: "ANOMALY", botId: intent.houseBotId, intentId: intent.id, detail: { reason: key } });
      return { kind: "botStopped", to: "AUTO_PAUSED", cause: action.cause };
    }
    case "rereadAccount": {
      // A10: `account_blocked` names five states — pause with the one found.
      const bot = await houseBotStore.get(intent.houseBotId);
      const user = bot ? await db.user.findById(bot.userId).catch(() => null) : null;
      if (user?.status === "CLOSED" || user?.closedAt) {
        await stopBot(intent.houseBotId, { to: "REMOVED", cause: "ACCOUNT_CLOSED" }, alerts);
        return { kind: "botStopped", to: "REMOVED", cause: "ACCOUNT_CLOSED" };
      }
      if (bot && (user?.status === "SELF_EXCLUDED" || user?.status === "COOLED_OFF")) {
        const cause = user.status === "SELF_EXCLUDED" ? "SELF_EXCLUDED" : "COOLING_OFF";
        await voidHouseConsent({ userId: bot.userId, cause, actorId: null });
        return { kind: "botStopped", to: "AUTO_PAUSED", cause };
      }
      const cause: PauseReason = user?.status === "SUSPENDED" ? "ACCOUNT_SUSPENDED" : "ACCOUNT_BLOCKED";
      await stopBot(intent.houseBotId, { to: "AUTO_PAUSED", cause }, alerts);
      return { kind: "botStopped", to: "AUTO_PAUSED", cause };
    }
    case "rereadConsent": {
      const read = await readBotAndHolder(intent.houseBotId).catch(() => null);
      const first = read && read.found ? read.causes[0]?.code : null;
      const cause: PauseReason = first && isPauseReason(first) ? first : first === "CONSENT_VOID" && read?.found && read.bot.consentVoidCause && isConsentVoidCause(read.bot.consentVoidCause) && isPauseReason(read.bot.consentVoidCause) ? read.bot.consentVoidCause : "PASSWORD_CHANGED";
      await stopBot(intent.houseBotId, { to: "AUTO_PAUSED", cause }, alerts);
      return { kind: "botStopped", to: "AUTO_PAUSED", cause };
    }
    case "rereadMarketOrAccount": {
      const view = await houseSeamStore.marketView(intent.marketId).catch(() => undefined);
      if (view === null) return terminal(intent, me, "SKIPPED", "MARKET_GONE");
      await stopBot(intent.houseBotId, { to: "AUTO_PAUSED", cause: "ACCOUNT_MISSING" }, alerts);
      return { kind: "botStopped", to: "AUTO_PAUSED", cause: "ACCOUNT_MISSING" };
    }
    case "rereadMarketLive": {
      const view = await houseSeamStore.marketView(intent.marketId).catch(() => null);
      return !view || view.status !== "LIVE" ? terminal(intent, me, "SKIPPED", "MARKET_NOT_LIVE") : terminal(intent, me, "EXPIRED", "CUTOFF");
    }
    case "conflict": {
      const conflict = !answer.ok ? (answer.detail as { conflict?: unknown } | undefined)?.conflict : undefined;
      return terminal(intent, me, "SKIPPED", conflict === "OPPOSITE_SIDE" ? "CAP_OPPOSITE_SIDE" : "MARKET_HELD");
    }
    case "cap": {
      const detail = !answer.ok ? (answer.detail as { cap?: unknown; until?: unknown } | undefined) : undefined;
      const cap = detail?.cap;
      if (!isCapCode(cap)) return terminal(intent, me, "FAILED", "UNMAPPED");
      if ((DEFERRABLE_CAP_CODES as readonly string[]).includes(cap)) {
        // N1 §4.3: defer to the window's end when that is before staleAt (C4-SPEC ruling 47 for the window ends).
        const untilMs = typeof detail?.until === "string" ? Date.parse(detail.until) : cap === "GLOBAL_BETS_PER_MINUTE" ? Date.now() + 60_000 : Number.NaN;
        if (Number.isFinite(untilMs) && untilMs < Date.parse(intent.staleAt)) {
          const deferred = await houseBotIntentStore.defer(intent.id, me, new Date(untilMs).toISOString());
          if (deferred) return { kind: "deferred", until: new Date(untilMs).toISOString() };
        }
      }
      return terminal(intent, me, "SKIPPED", capEngineCode(cap));
    }
    default: {
      const never: never = action;
      throw new Error(`house outcomes: unhandled action ${JSON.stringify(never)}`);
    }
  }
}
