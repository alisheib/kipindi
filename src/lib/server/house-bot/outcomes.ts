/**
 * WHAT A BET-PATH ANSWER WRITES — the outcome mapper's side effects (PLAN §4.6, 04 A8, A10, A19, N1 §4.3, §4.6).
 *
 * `outcome-map.ts` decides WHICH action a result is; this module performs it on the row this worker claimed.
 * Every terminal write is conditional on `status='CLAIMED' AND "claimedBy"=$me` (the DAL's `finish`, `requeueTransient`,
 * `defer`); 0 rows means another worker owns the row, and nothing else is written — except an engine fault, which
 * switches house bots OFF whoever holds the row now (C4-SPEC ruling 53).
 *
 * ⛔ THE AUTO-PAUSE ORDER (04 A19). The status write commits under `wallet:<botUser>` — the lock every Pause,
 * auto-pause and Remove takes, so a CLAIMED intent already past H1 is refused inside the lock. EVERYTHING ELSE runs
 * after that lock returns: cancelling the bot's intents, the event, the awaited COMPLIANCE audit, the alerts. An
 * audit append takes a database-wide serialised lock; holding the holder's wallet lock across it would stall their
 * own bets.
 *
 * ⛔ A CONSENT-VOID CAUSE VOIDS CONSENT (04 A3, TGT-40). A refusal or a re-read that names self-exclusion, a break,
 * a final identity refusal or an erasure request goes through `voidHouseConsent`, which ends the bot's targets in
 * its own wallet-lock transaction — a plain pause would leave them ACTIVE. The holder's own withdrawal is never
 * written by the engine (ruling 52).
 *
 * ⛔ A READ THAT FAILS IS A REQUEUE, NEVER A GUESS (ruling 51). The re-reads below either answer or requeue.
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
  type HouseMarketViewRow,
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
import { isPauseReason, type ConsentVoidCause, type PauseDetail, type PauseReason } from "@/lib/house-bot/pause-reasons";
import { OUTCOME_TABLE, outcomeKey, type OutcomeAction } from "./outcome-map";
import { isEngineTransient, transientBackoffMs } from "./transient";
import { readBotAndHolder, type BotAndHolder } from "./control";
import { voidHouseConsent } from "./designation";
import { playerHandle } from "./alerts";

/** What the engine tells people. Step 9 supplies the real emitters; tests inject recorders. */
export type EngineAlerts = {
  /** A8: sent only after this worker won the `alertedAt` claim on a PLACED row. */
  placed(intent: StoredHouseBotIntent): Promise<void>;
  /** An admin alert, sent at most once per AlertOnce key (claimed before the call). */
  once(key: string, message: EngineAlertMessage): Promise<void>;
  /** SECURITY: the engine found a defect and switched house bots off. */
  security(message: EngineAlertMessage): Promise<void>;
  /** A bot was auto-paused or removed by the engine. */
  botStopped(bot: StoredHouseBot, change: { to: "AUTO_PAUSED" | "REMOVED"; cause: PauseReason; cancelled: number }): Promise<void>;
  /** The engine switched house bots OFF for a money reason (GLOBAL_LOSS_STOP) — never a defect (C4-SPEC ruling 111). */
  switchedOff(change: { cause: OffCause; cancelled: number }): Promise<void>;
};

export type EngineAlertMessage = { code: string; botId?: string | null; intentId?: string | null; marketId?: string | null; detail?: Record<string, unknown> };

export type BetAnswer = { ok: true; replayed?: true } | { ok: false; code: string; reason?: string; detail?: Record<string, unknown> };

export type AppliedOutcome =
  | { kind: "placed"; alerted: boolean }
  | { kind: "noop" }
  | { kind: "requeued"; nextAttemptAt: string | null }
  | { kind: "deferred"; until: string }
  | { kind: "terminal"; status: "SKIPPED" | "EXPIRED" | "FAILED" | "CANCELLED"; code: EngineCode; written: boolean }
  | { kind: "botStopped"; to: "AUTO_PAUSED" | "REMOVED"; cause: PauseReason };

/* ═══ Engine audits (04 A19 allowlist) ═════════════════════════════════════════════════════════════ */

export async function engineAudit(action: HouseAuditAction, target: { type: "HouseBot"; id: string } | { type: "HouseBotControl"; id: string }, payload: Record<string, unknown>): Promise<string | null> {
  if (!isAllowedHouseAuditPayload(payload)) throw new Error(`house engine audit ${action}: payload keys outside the R7 allowlist`);
  const entry = (await audit({ category: HOUSE_AUDIT[action], action, actorId: SYSTEM_HOUSE_BOT_ACTOR, targetType: target.type, targetId: target.id, payload })) as unknown;
  const id = entry && typeof entry === "object" && typeof (entry as { id?: unknown }).id === "string" ? (entry as { id: string }).id : null;
  return id;
}

/** Claim the key, then send; a failed send gives the claim back (C3 review LI-8). True when this call sent it. */
export async function alertOnce(key: string | EatSuffixedKey, alerts: EngineAlerts, message: EngineAlertMessage): Promise<boolean> {
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
export async function stopBot(
  botId: string,
  /**
   * `field` names the rules field for RULES_INVALID and RULES_OUTDATED (`HouseBot.pauseDetail`, C4-SPEC ruling 65).
   * `detail` is the whole `pauseDetail` for a holder cause (the cause set, the password method — rulings 123–125); it
   * wins over `field`.
   */
  change:
    /** `auditAction` names a realised-loss stop `house_bot.loss_stop` (A19; C4-SPEC ruling 82). */
    | { to: "AUTO_PAUSED"; cause: PauseReason; field?: string | null; detail?: PauseDetail | null; auditAction?: "house_bot.loss_stop" }
    | { to: "REMOVED"; cause: "ACCOUNT_CLOSED" },
  alerts: EngineAlerts,
): Promise<boolean> {
  const bot = await houseBotStore.get(botId);
  if (!bot) return false;
  const moved = await withLock(`wallet:${bot.userId}`, (tx) =>
    change.to === "REMOVED"
      ? houseBotStore.setStatus(bot.id, { from: ["ACTIVE", "PAUSED", "AUTO_PAUSED"], to: "REMOVED", pauseReason: null, pausedFromStatus: null, removal: { byId: null, reason: null, cause: "ACCOUNT_CLOSED" } }, tx ?? undefined)
      : houseBotStore.setStatus(bot.id, {
        from: ["ACTIVE"], to: "AUTO_PAUSED", pauseReason: change.cause,
        pauseDetail: change.detail ?? (change.field ? { field: change.field } : null), pausedFromStatus: "ACTIVE",
      }, tx ?? undefined),
  );
  if (!moved) return false;
  // ── after the lock ──
  const cancelled = await houseBotIntentStore.cancelLive({ houseBotId: bot.id }, "BOT_NOT_ACTIVE");
  const event = await houseBotEventStore.append({
    houseBotId: bot.id, userId: bot.userId, marketId: null, kind: change.to === "REMOVED" ? "REMOVED" : "AUTO_PAUSED",
    fromStatus: bot.status, toStatus: change.to, reason: null, actorId: null, payload: { cause: change.cause, cancelled: cancelled.length },
  });
  const action = change.to === "REMOVED" ? "house_bot.removed" : (change.auditAction ?? "house_bot.auto_paused");
  const auditId = await engineAudit(action, { type: "HouseBot", id: bot.id }, {
    botId: bot.id, holderUserId: bot.userId, from: bot.status, to: change.to, cause: change.cause, counts: { cancelled: cancelled.length },
  });
  if (auditId) await houseBotEventStore.setAuditId(event.id, auditId);
  await alerts.botStopped(moved, { to: change.to, cause: change.cause, cancelled: cancelled.length });
  return true;
}

/** The causes the engine voids consent for. HOLDER_WITHDREW is the holder's own act and is never written here. */
const ENGINE_VOID_CAUSES = ["SELF_EXCLUDED", "COOLING_OFF", "IDENTITY_REFUSED", "HOLDER_ERASURE_REQUEST"] as const satisfies readonly ConsentVoidCause[];
const isEngineVoidCause = (c: PauseReason): c is (typeof ENGINE_VOID_CAUSES)[number] => (ENGINE_VOID_CAUSES as readonly string[]).includes(c);

/**
 * Stop the intent's bot for a holder cause, then close the claimed row (C4-SPEC ruling 52):
 *   · ACCOUNT_CLOSED → REMOVED (A5);
 *   · an engine void cause → `voidHouseConsent` (targets ended, intents cancelled, the pause — one wallet-lock
 *     transaction) and one `botStopped` alert when it paused an ACTIVE bot; a void that already stands → `stopBot`;
 *   · anything else → AUTO_PAUSED through `stopBot`.
 * The claimed row ends CANCELLED(BOT_NOT_ACTIVE); when the stop already cancelled it the write finds nothing.
 */
async function stopForCause(intent: StoredHouseBotIntent, me: string, cause: PauseReason, alerts: EngineAlerts): Promise<AppliedOutcome> {
  if (cause === "ACCOUNT_CLOSED") {
    await stopBot(intent.houseBotId, { to: "REMOVED", cause }, alerts);
  } else if (isEngineVoidCause(cause)) {
    const bot = await houseBotStore.get(intent.houseBotId);
    const voided = bot ? await voidHouseConsent({ userId: bot.userId, cause, actorId: null }) : null;
    if (voided?.voided) {
      if (voided.from === "ACTIVE") {
        const after = await houseBotStore.get(voided.botId);
        if (after) await alerts.botStopped(after, { to: "AUTO_PAUSED", cause, cancelled: voided.intentsCancelled });
      }
    } else {
      await stopBot(intent.houseBotId, { to: "AUTO_PAUSED", cause }, alerts);
    }
  } else {
    await stopBot(intent.houseBotId, { to: "AUTO_PAUSED", cause }, alerts);
  }
  await houseBotIntentStore.finish(intent.id, me, { status: "CANCELLED", reasonCode: "BOT_NOT_ACTIVE" });
  return { kind: "botStopped", to: cause === "ACCOUNT_CLOSED" ? "REMOVED" : "AUTO_PAUSED", cause };
}

/**
 * Master OFF from the engine: ENGINE_FAULT or ENGINE_ERRORS (a defect: `alerts.security`) or GLOBAL_LOSS_STOP (money:
 * `house_bot.loss_stop` and `alerts.switchedOff`, C4-SPEC rulings 82, 111). Conditional: two writers produce one OFF.
 */
export async function engineSwitchOff(cause: Extract<OffCause, "ENGINE_FAULT" | "ENGINE_ERRORS" | "GLOBAL_LOSS_STOP">, alerts: EngineAlerts, message: EngineAlertMessage): Promise<boolean> {
  const off = await houseBotControlStore.switchOff({ cause, byId: null, reason: null });
  if (!off) return false;
  const cancelled = await houseBotIntentStore.cancelLive({ all: true }, "MASTER_OFF");
  const event = await houseBotEventStore.append({
    houseBotId: null, userId: null, marketId: null, kind: "SWITCH_OFF", fromStatus: "ON", toStatus: "OFF", reason: null, actorId: null,
    payload: { cause, cancelled: cancelled.length },
  });
  const action = cause === "ENGINE_FAULT" ? "house_bot.engine_fault" : cause === "GLOBAL_LOSS_STOP" ? "house_bot.loss_stop" : "house_bot.switch_off";
  const auditId = await engineAudit(action, { type: "HouseBotControl", id: off.id }, {
    from: "ON", to: "OFF", cause, counts: { cancelled: cancelled.length },
  });
  if (auditId) await houseBotEventStore.setAuditId(event.id, auditId);
  if (cause === "GLOBAL_LOSS_STOP") await alerts.switchedOff({ cause, cancelled: cancelled.length });
  else await alerts.security(message);
  return true;
}

/* ═══ The mapper ═══════════════════════════════════════════════════════════════════════════════════ */

async function terminal(intent: StoredHouseBotIntent, me: string, status: "SKIPPED" | "EXPIRED" | "FAILED" | "CANCELLED", code: EngineCode): Promise<Extract<AppliedOutcome, { kind: "terminal" }>> {
  const written = await houseBotIntentStore.finish(intent.id, me, { status, reasonCode: code });
  return { kind: "terminal", status, code, written };
}

/** Back to PENDING with the MON-10 backoff, or — with no time left — terminal on whichever bound is nearer (ruling 50). */
async function requeue(intent: StoredHouseBotIntent, me: string): Promise<AppliedOutcome> {
  const requeued = await houseBotIntentStore.requeueTransient(intent.id, me, transientBackoffMs(intent.transientAttempts, REQUEUE_BACKOFF_SEC));
  if (requeued) return { kind: "requeued", nextAttemptAt: requeued.nextAttemptAt };
  const nearer = Date.parse(intent.staleAt) <= Date.parse(intent.deadlineAt) ? "STALE" : "BUSY_TIMEOUT";
  return terminal(intent, me, "EXPIRED", nearer);
}

/** An infrastructure failure (A10): the transient clock, the 2-minute alert, the contention count, then the requeue. */
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
  return requeue(intent, me);
}

/** A10: a refusal this build does not know. Fail the row, pause the bot, tell someone once a day. */
async function unmapped(intent: StoredHouseBotIntent, me: string, alerts: EngineAlerts, reason: string): Promise<AppliedOutcome> {
  const out = await terminal(intent, me, "FAILED", "UNMAPPED");
  await stopBot(intent.houseBotId, { to: "AUTO_PAUSED", cause: "UNMAPPED_REFUSAL" }, alerts);
  await alertOnce(ALERT_KEY.botDaily(intent.houseBotId, "UNMAPPED_REFUSAL"), alerts, {
    code: "UNMAPPED_REFUSAL", botId: intent.houseBotId, intentId: intent.id, detail: { reason },
  });
  return out;
}

/**
 * R5 · THE PENALTY BOX (C4-SPEC rulings 27, 106–107). The AlertOnce row `penalty:<userId>:<EAT day>` IS the box: the
 * trigger filter and `lockedPool` read it. Claiming it is the boxing; the PENALTY_BOXED event `{cause, day, intentId}`
 * (the user is the event's column) and ONE admin alert follow. ⛔ A failed send never releases the claim — releasing
 * would un-box the account. True when this call boxed it.
 */
export async function boxAccount(
  input: { userId: string; houseBotId: string | null; marketId: string | null; cause: "CASHED_OUT_COUNTERED" | "BOTH_SIDES"; intentId: string },
  alerts: EngineAlerts,
): Promise<boolean> {
  const key = ALERT_KEY.penalty(input.userId);
  const claim = await houseBotAlertOnceStore.claimWithEatSuffix(key.prefix, key.unit);
  if (!claim.claimed) return false;
  const day = claim.key.slice(key.prefix.length + 1);
  try {
    await houseBotEventStore.append({
      houseBotId: input.houseBotId, userId: input.userId, marketId: input.marketId, kind: "PENALTY_BOXED",
      fromStatus: null, toStatus: null, reason: null, actorId: null, payload: { cause: input.cause, day, intentId: input.intentId },
    });
    await alerts.once(claim.key, {
      code: "PENALTY_BOXED", botId: input.houseBotId, intentId: input.intentId, marketId: input.marketId,
      detail: { cause: input.cause, day, handle: playerHandle(input.userId) },
    });
  } catch (e) {
    // The box stands (the claimed row). Its record or its alert is lost, never the box.
    console.error("[house-bot] penalty box recorded without its event or alert:", String((e as Error)?.message ?? e).slice(0, 300));
  }
  return true;
}

async function penaltyBox(intent: StoredHouseBotIntent, alerts: EngineAlerts): Promise<void> {
  if (!intent.triggerUserId) return;
  await boxAccount({ userId: intent.triggerUserId, houseBotId: intent.houseBotId, marketId: intent.marketId, cause: "CASHED_OUT_COUNTERED", intentId: intent.id }, alerts);
}

/** The market as it is now; `undefined` when the read itself failed (ruling 51). */
async function rereadMarket(marketId: string): Promise<HouseMarketViewRow | null | undefined> {
  try {
    return await houseSeamStore.marketView(marketId);
  } catch {
    return undefined;
  }
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
  if (key == null) return unmapped(intent, me, alerts, answer.ok ? "ok" : (answer.reason ?? answer.code));
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
      const out = await terminal(intent, me, action.status, action.reasonCode);
      // A defect is a defect whoever holds the row now (ruling 53).
      if (action.engineFault) await engineSwitchOff("ENGINE_FAULT", alerts, { code: answer.ok ? "ENGINE_FAULT" : (answer.reason ?? answer.code), botId: intent.houseBotId, intentId: intent.id });
      if (!out.written) return out;
      if (action.alert === "botDaily") await alertOnce(ALERT_KEY.botDaily(intent.houseBotId, action.reasonCode), alerts, { code: action.reasonCode, botId: intent.houseBotId, intentId: intent.id });
      if (action.alert === "stakeNotWhole") await alertOnce(ALERT_KEY.stakeNotWhole(intent.houseBotId), alerts, { code: "STAKE_NOT_WHOLE", botId: intent.houseBotId, intentId: intent.id });
      if (action.penalty) await penaltyBox(intent, alerts);
      return out;
    }
    case "autoPause": {
      const out = await stopForCause(intent, me, action.cause, alerts);
      if (action.anomaly) await alertOnce(ALERT_KEY.botDaily(intent.houseBotId, "ANOMALY"), alerts, { code: "ANOMALY", botId: intent.houseBotId, intentId: intent.id, detail: { reason: key } });
      return out;
    }
    case "rereadAccount": {
      // A10: `account_blocked` names five states — stop with the one found (ruling 49; an unreadable account is ACCOUNT_BLOCKED).
      const bot = await houseBotStore.get(intent.houseBotId);
      // ⛔ try/catch, not `.catch`: the memory store answers with a plain value, not a promise.
      let user: Awaited<ReturnType<typeof db.user.findById>> = null;
      try {
        user = bot ? await db.user.findById(bot.userId) : null;
      } catch {
        user = null;
      }
      const cause: PauseReason = !user ? "ACCOUNT_BLOCKED"
        : user.status === "CLOSED" || user.closedAt ? "ACCOUNT_CLOSED"
          : user.status === "SELF_EXCLUDED" ? "SELF_EXCLUDED"
            : user.status === "COOLED_OFF" ? "COOLING_OFF"
              : user.status === "SUSPENDED" ? "ACCOUNT_SUSPENDED"
                : "ACCOUNT_BLOCKED";
      return stopForCause(intent, me, cause, alerts);
    }
    case "rereadConsent": {
      let read: BotAndHolder;
      try {
        read = await readBotAndHolder(intent.houseBotId);
      } catch {
        return transient(intent, me, alerts, false);
      }
      if (!read.found) return stopForCause(intent, me, "ACCOUNT_MISSING", alerts);
      const first = read.causes[0];
      // Re-verified between the refusal and this read: the row may try again before staleAt.
      if (!first) return requeue(intent, me);
      const code = first.code === "CONSENT_VOID" ? first.cause : first.code;
      return stopForCause(intent, me, isPauseReason(code) ? code : "PASSWORD_CHANGED", alerts);
    }
    case "rereadMarketOrAccount": {
      const view = await rereadMarket(intent.marketId);
      if (view === undefined) return transient(intent, me, alerts, false);
      if (view === null) return terminal(intent, me, "SKIPPED", "MARKET_GONE");
      return stopForCause(intent, me, "ACCOUNT_MISSING", alerts);
    }
    case "rereadMarketLive": {
      const view = await rereadMarket(intent.marketId);
      if (view === undefined) return transient(intent, me, alerts, false);
      return !view || view.status !== "LIVE" ? terminal(intent, me, "SKIPPED", "MARKET_NOT_LIVE") : terminal(intent, me, "EXPIRED", "CUTOFF");
    }
    case "conflict": {
      const conflict = !answer.ok ? (answer.detail as { conflict?: unknown } | undefined)?.conflict : undefined;
      return terminal(intent, me, "SKIPPED", conflict === "OPPOSITE_SIDE" ? "CAP_OPPOSITE_SIDE" : "MARKET_HELD");
    }
    case "cap": {
      const detail = !answer.ok ? (answer.detail as { cap?: unknown; until?: unknown } | undefined) : undefined;
      const cap = detail?.cap;
      if (!isCapCode(cap)) return unmapped(intent, me, alerts, `house_cap_reached:${String(cap)}`);
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
