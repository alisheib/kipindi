/**
 * WHAT A CHANGE TO THE HOLDER'S ACCOUNT DOES TO THEIR BOT — the holder hook and the L2 holder sweep (04 A2, A3, A5,
 * C8, C13, R6, F8; PLAN §14; 02 §2.2–2.3; C4-SPEC rulings 121–132).
 *
 * ⛔ THE EVENT IS A HINT; THE CAUSES ARE READ (ruling 121). A writer says what it changed, but the hook recomputes
 * `holderCauses` from a fresh `readBotAndHolder` and applies THAT. A wrong or stale event can never apply a wrong cause;
 * it decides only rows 16–18, which carry no cause (lockout, email, 2FA).
 *
 * ⛔ ONE APPLY, CONDITIONAL WRITES (ruling 122). The hook and the sweep both call `applyHolderCauses`. Every write is
 * conditional — a status move from the status read, the consent void, the cause-set rewrite under `wallet:<userId>`,
 * an AlertOnce claim — so a hook and a sweep racing each other change nothing twice.
 *
 * ⛔ A BOT NEVER RESUMES BY ITSELF. Every way out of a pause ends in Start; this module only stops, records and tells.
 *
 * ⛔ IT RUNS WHATEVER `HOUSE_BOT_ENGINE` SAYS (R6, ruling 127), and its alerts are a required argument: the call sites
 * land with step 9's emitters, never before (ruling 128) — a hook that pauses a bot with no alert channel would stop
 * liquidity silently.
 *
 * ⛔ A CHANGE IS IDENTIFIED BY THE PAUSE'S OWN DETAIL (ruling 133). The alert key is claimed after the status write, so a
 * second look landing in between would otherwise record the same change again and silence A1. The credential branch runs
 * only when the bot was NOT paused by this very change — the pause writes the method and the instant with the status.
 *
 * ⛔ THE A19 ORDER (ruling 131). Status, the cause set, the credential stamp, the void and their events are written under
 * `wallet:<userId>`; the audit and every bell, email and holder notice go after the lock is released.
 */
import { ALERT_KEY, type EatSuffixedKey } from "@/lib/house-bot/constants";
import { rgLockStands, voidStands } from "@/lib/house-bot/consent";
import {
  isPauseReason, type CredentialChangedVia, type HolderCause, type HolderCauseCode, type PauseDetail, type PauseReason,
} from "@/lib/house-bot/pause-reasons";
import { withLock } from "../locks";
import { db } from "../store";
import { houseAtomic, houseBotAlertOnceStore, houseBotEventStore, houseBotStore, type StoredHouseBot } from "../house-bot-dal";
import type { HouseBotOwnerNotice } from "../notification-service";
import { readBotAndHolder, type BotAndHolder } from "./control";
import { voidHouseConsent } from "./designation";
import { engineAudit, stopBot, type EngineAlerts } from "./outcomes";

/** What the writer changed (ruling 121). A hint for rows 16–18 and for the record; the causes are read. */
export type HolderEvent =
  | "PASSWORD_SELF_CHANGE" | "PASSWORD_RESET_LINK" | "PASSWORD_OFFICER_TEMP" | "ACCOUNT_CLOSED" | "SELF_EXCLUDED" | "COOLING_OFF"
  | "LOSS_LIMIT_SET" | "SUSPENDED" | "RESTORED" | "WALLET_FREEZE" | "IDENTITY_REFUSED" | "IDENTITY_REOPENED" | "ROLE_CHANGED"
  | "ERASURE_REQUEST" | "LOCKED_OUT" | "EMAIL_CHANGED" | "TWO_FA_ON" | "TWO_FA_OFF";

/** The holder's own notices this module asks for; the last three are step 9's new kinds (ruling 132). */
export type HolderNoticeKind = Extract<HouseBotOwnerNotice, "password_paused" | "removed"> | "password_temp" | "role_changed" | "erasure_request";

/** Who is told (02 §2.3, C8, C13). Step 9 supplies the emitters; cases inject recorders. */
export type HolderAlerts = {
  /**
   * A1: the holder's password changed. `again` is false when THIS change stopped a running bot (02:106's body, with
   * `cancelled` queued stakes) and true when the bot was already paused for an earlier password change (02 §2.2
   * row 93's "A1 again"), where nothing was queued to stop — never inferred from `cancelled`, which is 0 in both.
   */
  passwordPaused(bot: StoredHouseBot, change: { method: CredentialChangedVia; changedAt: string | null; cancelled: number; again: boolean }): Promise<void>;
  /** A2: the password changed while the bot was already stopped (officer-reset wording for OFFICER_TEMP). */
  passwordChanged(bot: StoredHouseBot, change: { method: CredentialChangedVia; changedAt: string | null }): Promise<void>;
  /** A running bot was auto-paused or removed for any other holder cause — the engine's own channel. */
  botStopped: EngineAlerts["botStopped"];
  /** A cause added to a bot that was already stopped (rows 5, 11 and 14 also email — the emitter decides). */
  causeAdded(bot: StoredHouseBot, cause: HolderCause): Promise<void>;
  /** A recorded cause is no longer live (C13; never a break's end, which is `breakEnded`). */
  causeCleared(bot: StoredHouseBot, code: HolderCauseCode): Promise<void>;
  /** Row 16: the holder was locked out by failed sign-ins (SECURITY bell, C13's copy names when it ends). Never a pause. */
  holderLockedOut(bot: StoredHouseBot, until: string | null): Promise<void>;
  /** Row 17: an officer set the holder's email. */
  officerSetEmail(bot: StoredHouseBot): Promise<void>;
  /** C8: the holder's break ended; their permission must be confirmed again before Start. */
  breakEnded(bot: StoredHouseBot, untilIso: string): Promise<void>;
  /** The holder's own notice (`notifyHouseBotOwner`, which keeps its responsible-gambling gate). */
  holderNotice(userId: string, notice: HolderNoticeKind): Promise<void>;
};

export type HolderApplied = {
  kind: "none" | "removed" | "voided" | "paused" | "credential";
  added: HolderCauseCode[];
  cleared: HolderCauseCode[];
};

type FoundRead = Extract<BotAndHolder, { found: true }>;

/** The causes a consent void carries (ruling 52); HOLDER_WITHDREW has no live signal and is never read as a cause. */
const VOID_CAUSES: ReadonlySet<string> = new Set(["SELF_EXCLUDED", "COOLING_OFF", "IDENTITY_REFUSED", "HOLDER_ERASURE_REQUEST"]);
/** Causes whose clearing has its own path and no "cleared" bell: a break ends with C8's bell; a re-verify is an officer's own act. */
const CLEARED_WITHOUT_BELL: ReadonlySet<string> = new Set(["COOLING_OFF", "CONSENT_VOID", "PASSWORD_CHANGED"]);
/** The holder notice a newly seen cause sends (A2 holder column); PASSWORD_CHANGED is decided with its own record. */
const NOTICE_FOR_CAUSE: Readonly<Partial<Record<HolderCauseCode, HolderNoticeKind>>> = {
  ROLE_CHANGED: "role_changed",
  HOLDER_ERASURE_REQUEST: "erasure_request",
};

const errMessage = (e: unknown) => String((e as Error)?.message ?? e).replace(/\s+/g, " ").slice(0, 300);

/** A send that fails is logged, never thrown past the record it announces (ruling 131). */
async function safeSend(what: string, send: () => Promise<void>): Promise<boolean> {
  try {
    await send();
    return true;
  } catch (e) {
    console.error(`[house-bot] holder ${what} alert failed:`, errMessage(e));
    return false;
  }
}

/** Claim the key, then send; a failed send gives the claim back (C3 review LI-8). True when this call sent it. */
async function claimThen(key: string | EatSuffixedKey, what: string, send: () => Promise<void>): Promise<boolean> {
  const claim = typeof key === "string"
    ? { claimed: await houseBotAlertOnceStore.claim(key), key }
    : await houseBotAlertOnceStore.claimWithEatSuffix(key.prefix, key.unit);
  if (!claim.claimed) return false;
  if (await safeSend(what, send)) return true;
  try { await houseBotAlertOnceStore.release(claim.key); } catch { /* the claim expires with the purge; the next occurrence is silent */ }
  return false;
}

/**
 * `stopBot`'s channel. `stopBot` calls only `botStopped`; a password pause sends A1 in its place (02 §2.2), claimed on
 * the new fingerprint so the sweep's later look at the same change sends nothing.
 */
function stopChannel(alerts: HolderAlerts, password: { key: string; method: CredentialChangedVia; changedAt: string | null } | null): EngineAlerts {
  // A1 here is always the change that stopped a RUNNING bot (again: false); the repeat lives in the credential branch.
  const unused = async () => { throw new Error("house-bot holder hook: stopBot uses botStopped only"); };
  return {
    placed: unused, once: unused, security: unused, switchedOff: unused,
    botStopped: async (bot, change) => {
      if (password && change.cause === "PASSWORD_CHANGED") {
        await claimThen(password.key, "A1", () => alerts.passwordPaused(bot, { method: password.method, changedAt: password.changedAt, cancelled: change.cancelled, again: false }));
        return;
      }
      await safeSend("stop", () => alerts.botStopped(bot, change));
    },
  };
}

async function notice(alerts: HolderAlerts, userId: string, kind: HolderNoticeKind): Promise<void> {
  await safeSend(`holder ${kind}`, () => alerts.holderNotice(userId, kind));
}

const sameInstant = (a: string | null | undefined, b: string | null | undefined): boolean =>
  a == null || b == null ? a == null && b == null : Date.parse(a) === Date.parse(b);

/**
 * Ruling 133 · was the bot paused BY this very change? `stopBot` writes the method and the instant into `pauseDetail` in
 * the same statement as the status, so a look that lands between that write and its A1 can tell, and leaves it alone.
 */
function pausedByThisChange(bot: StoredHouseBot, pw: Extract<HolderCause, { code: "PASSWORD_CHANGED" }>): boolean {
  return bot.pauseReason === "PASSWORD_CHANGED" && bot.pauseDetail?.method === pw.method
    && sameInstant(bot.pauseDetail?.changedAt, pw.changedAt);
}

/* ═══ The one apply (rulings 122–126, 131) ═════════════════════════════════════════════════════════ */

export async function applyHolderCauses(read: FoundRead, o: { detectedBy: "HOOK" | "SWEEP"; alerts: HolderAlerts }): Promise<HolderApplied> {
  const { bot, causes, snapshot } = read;
  const out: HolderApplied = { kind: "none", added: [], cleared: [] };
  if (bot.status === "REMOVED") return out;
  const pw = causes.find((c): c is Extract<HolderCause, { code: "PASSWORD_CHANGED" }> => c.code === "PASSWORD_CHANGED") ?? null;
  const pwKey = pw ? { key: ALERT_KEY.password(bot.id, snapshot.fingerprintNow), method: pw.method, changedAt: pw.changedAt } : null;

  // A5 · a closed account removes the bot from any status; nothing else about it matters any more.
  if (causes.some((c) => c.code === "ACCOUNT_CLOSED")) {
    if (await stopBot(bot.id, { to: "REMOVED", cause: "ACCOUNT_CLOSED" }, stopChannel(o.alerts, null))) {
      out.kind = "removed";
      await notice(o.alerts, bot.userId, "removed");
    }
    return out;
  }

  const wasActive = bot.status === "ACTIVE";
  let stoppedNow = false;
  /** Codes whose event another step already wrote (the void's own event, CREDENTIAL_CHANGED). */
  const eventWritten = new Set<string>();
  /** Codes whose admin alert another step already sent (A1/A2 for a password change). */
  const bellSent = new Set<string>();

  // A3, C8 · a consent-void cause voids consent in any status: an ACTIVE bot pauses and its targets end (one lock).
  const voidCause = causes.find((c) => VOID_CAUSES.has(c.code));
  if (voidCause && VOID_CAUSES.has(voidCause.code)) {
    const code = voidCause.code as "SELF_EXCLUDED" | "COOLING_OFF" | "IDENTITY_REFUSED" | "HOLDER_ERASURE_REQUEST";
    const v = await voidHouseConsent({ userId: bot.userId, cause: code, actorId: null });
    if (v.voided) {
      out.kind = "voided";
      // voidHouseConsent wrote CONSENT_VOIDED (ACTIVE) or HOLDER_CAUSE_ADDED (paused); a paused bot's admin bell still goes below.
      eventWritten.add(code);
      if (v.from === "ACTIVE") {
        stoppedNow = true;
        const after = await houseBotStore.get(v.botId);
        if (after) await safeSend("stop", () => o.alerts.botStopped(after, { to: "AUTO_PAUSED", cause: code, cancelled: v.intentsCancelled }));
      }
    }
  }

  // A2 · any cause on a bot still ACTIVE → AUTO_PAUSED with the FIRST cause, the cause set in `pauseDetail` (A19 order).
  if (wasActive && !stoppedNow && causes.length > 0) {
    const first = causes[0];
    const cause: PauseReason = first.code === "CONSENT_VOID" ? first.cause : isPauseReason(first.code) ? first.code : "ACCOUNT_BLOCKED";
    const detail: PauseDetail = first.code === "PASSWORD_CHANGED"
      ? { causes, detectedBy: o.detectedBy, method: first.method, changedAt: first.changedAt, officerReset: first.method === "OFFICER_TEMP" }
      : { causes, detectedBy: o.detectedBy };
    if (await stopBot(bot.id, { to: "AUTO_PAUSED", cause, detail }, stopChannel(o.alerts, pwKey))) {
      stoppedNow = true;
      out.kind = "paused";
      if (first.code === "PASSWORD_CHANGED") {
        eventWritten.add("PASSWORD_CHANGED");
        bellSent.add("PASSWORD_CHANGED");
        await notice(o.alerts, bot.userId, first.method === "OFFICER_TEMP" ? "password_temp" : "password_paused");
      }
    }
  }
  if (stoppedNow) {
    // A newly stopped bot's holder hears about a role change or an erasure request once, here (A2 holder column).
    for (const c of causes) {
      const kind = NOTICE_FOR_CAUSE[c.code];
      if (kind) await notice(o.alerts, bot.userId, kind);
    }
  }

  // PLAN §14 · a password change on a bot that is not running: recorded once per new fingerprint, never a status move.
  // Ruling 135 · also when THIS apply stopped it for another cause, whose stop says nothing about the password.
  // Ruling 133 · never when the bot was paused BY this very change: that pause is the record, and A1 is its alert.
  const stoppedBefore = !wasActive && (bot.status === "PAUSED" || bot.status === "AUTO_PAUSED");
  if (pw && pwKey && !bellSent.has("PASSWORD_CHANGED") && (stoppedBefore || stoppedNow) && !pausedByThisChange(bot, pw)) {
    // CREDENTIAL_CHANGED and A2 are this change's record and alert; the cause-set step adds neither again.
    eventWritten.add("PASSWORD_CHANGED");
    bellSent.add("PASSWORD_CHANGED");
    if (await houseBotAlertOnceStore.claim(pwKey.key)) {
      let written: { stamped: StoredHouseBot; eventId: string } | null = null;
      try {
        written = await withLock(`wallet:${bot.userId}`, (tx) => houseAtomic(tx, async (t) => {
          const stamped = await houseBotStore.setCredentialChanged(bot.id, { via: pw.method }, t);
          if (!stamped) return null;
          const ev = await houseBotEventStore.append({
            houseBotId: bot.id, userId: bot.userId, marketId: null, kind: "CREDENTIAL_CHANGED", fromStatus: stamped.status, toStatus: stamped.status,
            reason: null, actorId: null, payload: { method: pw.method, changedAt: pw.changedAt, detectedBy: o.detectedBy },
          }, t);
          return { stamped, eventId: ev.id };
        }));
      } catch (e) {
        await houseBotAlertOnceStore.release(pwKey.key).catch(() => {});
        throw e;
      }
      if (!written) {
        // The bot left PAUSED/AUTO_PAUSED between the read and the lock; the next look decides again.
        await houseBotAlertOnceStore.release(pwKey.key).catch(() => {});
      } else {
        out.kind = out.kind === "none" ? "credential" : out.kind;
        // ── after the lock ── the SECURITY audit (ruling 28), then A2; the claim stays even if the send fails (the record stands).
        const auditId = await engineAudit("house_bot.credential_changed", { type: "HouseBot", id: bot.id }, {
          botId: bot.id, holderUserId: bot.userId, from: written.stamped.status, to: written.stamped.status, cause: "PASSWORD_CHANGED", code: pw.method,
        });
        if (auditId) await houseBotEventStore.setAuditId(written.eventId, auditId);
        // Ruling 134 · 02 §2.2: A1 again when the bot is already paused FOR a password change (nothing was queued to
        // stop, so `cancelled` is 0); A2 for PAUSED(NEW|MANUAL) and for a pause with any other cause.
        if (written.stamped.pauseReason === "PASSWORD_CHANGED") {
          await safeSend("A1 again", () => o.alerts.passwordPaused(written!.stamped, { method: pw.method, changedAt: pw.changedAt, cancelled: 0, again: true }));
        } else {
          await safeSend("A2", () => o.alerts.passwordChanged(written!.stamped, { method: pw.method, changedAt: pw.changedAt }));
        }
        if (pw.method === "OFFICER_TEMP") await notice(o.alerts, bot.userId, "password_temp");
      }
    }
  }

  // Ruling 138 · the pause OWES an A1 for this change. A send that failed gave its claim back (claimThen), so the next
  // look pays it — the alert only, never a second record: the pause itself is this change's record.
  if (pw && pwKey && !bellSent.has("PASSWORD_CHANGED") && pausedByThisChange(bot, pw)) {
    // The retry re-sends the STOP alert (again: false); the count it would have carried is gone with the failed send,
    // and 0 reads truthfully as "nothing is queued now".
    await claimThen(pwKey.key, "A1 retry", () => o.alerts.passwordPaused(bot, { method: pw.method, changedAt: pw.changedAt, cancelled: 0, again: false }));
  }

  // Ruling 124 · the cause set of a stopped bot, compared and rewritten under the wallet lock.
  const recorded = await recordCauseSet(bot, causes, { detectedBy: o.detectedBy, events: !wasActive, skip: eventWritten });
  out.added = recorded.added.map((c) => c.code);
  out.cleared = recorded.cleared;
  if (!wasActive && recorded.bot) {
    const at = recorded.bot;
    const appliedAtIso = new Date(snapshot.nowMs).toISOString();
    for (const c of recorded.added) {
      if (bellSent.has(c.code) || recorded.silent.has(c.code)) continue;
      // The key names the event when this step wrote one, else the apply's instant; the cause-set rewrite is the dedupe.
      await claimThen(`bot:${bot.id}:CAUSE:${c.code}:${recorded.events.get(c.code) ?? appliedAtIso}`, "cause added", () => o.alerts.causeAdded(at, c));
      const kind = NOTICE_FOR_CAUSE[c.code];
      if (kind) await notice(o.alerts, bot.userId, kind);
    }
    const clearedAtIso = appliedAtIso;
    for (const code of recorded.cleared) {
      if (CLEARED_WITHOUT_BELL.has(code)) continue;
      await claimThen(ALERT_KEY.cleared(bot.id, code, clearedAtIso), "cause cleared", () => o.alerts.causeCleared(at, code));
    }
  }
  return out;
}

/**
 * Under `wallet:<userId>`: the bot's recorded cause codes against the fresh ones; a HOLDER_CAUSE_ADDED event per new code
 * (a bot that was already stopped, and not a code another step recorded), then `pauseDetail.causes` rewritten with the
 * status and reason unchanged. The rewrite is the dedupe: a second apply finds the set current and returns nothing.
 */
async function recordCauseSet(
  bot: StoredHouseBot,
  causes: HolderCause[],
  o: { detectedBy: "HOOK" | "SWEEP"; events: boolean; skip: ReadonlySet<string> },
): Promise<{ added: HolderCause[]; cleared: HolderCauseCode[]; events: Map<string, string>; bot: StoredHouseBot | null; silent: Set<string> }> {
  const none = { added: [] as HolderCause[], cleared: [] as HolderCauseCode[], events: new Map<string, string>(), bot: null, silent: new Set<string>() };
  return withLock(`wallet:${bot.userId}`, (tx) => houseAtomic(tx, async (t) => {
    const cur = await houseBotStore.get(bot.id, t);
    if (!cur || (cur.status !== "PAUSED" && cur.status !== "AUTO_PAUSED")) return none;
    const before = new Set((cur.pauseDetail?.causes ?? []).map((c) => c.code));
    const now = new Set(causes.map((c) => c.code));
    const added = causes.filter((c) => !before.has(c.code));
    const cleared = [...before].filter((code) => !now.has(code)) as HolderCauseCode[];
    if (added.length === 0 && cleared.length === 0) return none;
    // Ruling 16 · a void outliving its own cause (a break that ended) is the same void: no event, no bell — C8's bell says it.
    const silent = new Set(added.filter((c) => c.code === "CONSENT_VOID" && before.has(c.cause)).map((c) => c.code));
    const events = new Map<string, string>();
    if (o.events) {
      for (const c of added) {
        if (o.skip.has(c.code) || silent.has(c.code)) continue;
        const ev = await houseBotEventStore.append({
          houseBotId: cur.id, userId: cur.userId, marketId: null, kind: "HOLDER_CAUSE_ADDED", fromStatus: cur.status, toStatus: cur.status,
          reason: null, actorId: null, payload: { cause: c.code, detectedBy: o.detectedBy },
        }, t);
        events.set(c.code, ev.id);
      }
    }
    const rewritten = await houseBotStore.setStatus(cur.id, {
      from: [cur.status], to: cur.status, pauseReason: cur.pauseReason, pausedFromStatus: cur.pausedFromStatus,
      pauseDetail: { ...(cur.pauseDetail ?? {}), causes, detectedBy: o.detectedBy },
    }, t);
    return { added, cleared, events, bot: rewritten ?? cur, silent };
  }));
}

/* ═══ Rows 16–18 (ruling 126) and C8's break end (ruling 129) ═════════════════════════════════════════ */

async function eventOnly(read: FoundRead, event: HolderEvent, meta: { byOfficer?: boolean }, alerts: HolderAlerts): Promise<void> {
  const bot = read.bot;
  if (event === "LOCKED_OUT") {
    const until = read.snapshot.user.lockedUntil ?? null;
    await claimThen(ALERT_KEY.holderLocked(bot.id), "locked out", () => alerts.holderLockedOut(bot, until));
    return;
  }
  if (event === "EMAIL_CHANGED") {
    await houseBotEventStore.append({
      houseBotId: bot.id, userId: bot.userId, marketId: null, kind: "HOLDER_EMAIL_CHANGED", fromStatus: null, toStatus: null,
      reason: null, actorId: null, payload: { byOfficer: meta.byOfficer === true },
    });
    if (meta.byOfficer === true) {
      // ⛔ try/catch, not `.catch`: the memory store answers with a plain value.
      let stamp: string | null = null;
      try { stamp = (await db.user.findById(bot.userId))?.emailSetByOfficerAt ?? null; } catch { stamp = null; }
      if (stamp) await claimThen(`bot:${bot.id}:OFFICER_EMAIL:${stamp}`, "officer email", () => alerts.officerSetEmail(bot));
    }
    return;
  }
  if (event === "TWO_FA_ON" || event === "TWO_FA_OFF") {
    await houseBotEventStore.append({
      houseBotId: bot.id, userId: bot.userId, marketId: null, kind: event === "TWO_FA_ON" ? "HOLDER_2FA_ON" : "HOLDER_2FA_OFF", fromStatus: null, toStatus: null,
      reason: null, actorId: null, payload: null,
    });
  }
}

/** C8: a COOLING_OFF void stands and the break is over → ONE bell per break, keyed on its end. True when sent. */
export async function breakEnded(read: FoundRead, alerts: HolderAlerts): Promise<boolean> {
  const { bot, snapshot } = read;
  if (bot.status === "REMOVED" || bot.consentVoidCause !== "COOLING_OFF" || !voidStands(bot) || rgLockStands(snapshot)) return false;
  const until = snapshot.rg.coolingOffUntil ?? bot.consentVoidAt;
  if (!until) return false;
  return claimThen(ALERT_KEY.rgEnded(bot.id, until), "break ended", () => alerts.breakEnded(bot, until));
}

/* ═══ The hook (ruling 121, 127) and the L2 sweep (ruling 129) ═══════════════════════════════════════════ */

export type HolderHookResult = { kind: "noBot" } | { kind: "accountMissing" } | { kind: "applied"; applied: HolderApplied } | { kind: "failed" };

/**
 * The hook body with its alert channel given. Step 9 wraps it with the real emitters and wires the call sites (ruling 128).
 * Never throws: a failure is logged and the L2 sweep decides the change within a minute.
 */
export async function onHolderAccountChangedWith(
  userId: string,
  event: HolderEvent,
  deps: { alerts: HolderAlerts; meta?: { byOfficer?: boolean } },
): Promise<HolderHookResult> {
  try {
    const live = await houseBotStore.findLiveByUserId(userId);
    if (!live) return { kind: "noBot" };
    const read = await readBotAndHolder(live.id, { ownerLossStakeTzs: live.stakeMinTzs });
    if (!read.found) return { kind: "accountMissing" };
    const applied = await applyHolderCauses(read, { detectedBy: "HOOK", alerts: deps.alerts });
    await eventOnly(read, event, deps.meta ?? {}, deps.alerts);
    return { kind: "applied", applied };
  } catch (e) {
    console.error("[house-bot] holder hook failed — the holder sweep decides this change:", errMessage(e));
    return { kind: "failed" };
  }
}

/**
 * WHAT THE PLATFORM'S WRITERS CALL (A2, ruling 128). The hook with the production channel bound, so a writer needs
 * to know nothing about alerts. It never throws: a failure is logged and the L2 sweep decides the change within a
 * minute, and no writer's own work is ever rolled back by a house-bot hook.
 *
 * ⛔ FIRE IT AFTER THE OUTERMOST LOCK RETURNS, or through `runOutsideLock` — a hook started inside a lock inherits
 * that lock's transaction (`locks.ts`), and would read rows the caller has not committed yet.
 */
export async function onHolderAccountChanged(userId: string, event: HolderEvent, meta?: { byOfficer?: boolean }): Promise<HolderHookResult> {
  try {
    const { houseHolderAlerts } = await import("./emitters");
    return await onHolderAccountChangedWith(userId, event, { alerts: houseHolderAlerts(), meta });
  } catch (e) {
    console.error("[house-bot] holder hook could not start — the holder sweep decides this change:", errMessage(e));
    return { kind: "failed" };
  }
}

export type HolderSweepResult = { bots: number; changed: number; failed: number };

/** L2 (PLAN §14, A2): every non-REMOVED bot, one at a time, whatever the switch says. One bot's failure never skips the next. */
export async function holderSweep(deps: { alerts: HolderAlerts }): Promise<HolderSweepResult> {
  const out: HolderSweepResult = { bots: 0, changed: 0, failed: 0 };
  for (const bot of await houseBotStore.listNonRemoved()) {
    out.bots++;
    try {
      const read = await readBotAndHolder(bot.id, { ownerLossStakeTzs: bot.stakeMinTzs });
      if (!read.found) {
        if (read.missing === "ACCOUNT" && bot.status === "ACTIVE"
          && (await stopBot(bot.id, { to: "AUTO_PAUSED", cause: "ACCOUNT_MISSING" }, stopChannel(deps.alerts, null)))) out.changed++;
        continue;
      }
      const applied = await applyHolderCauses(read, { detectedBy: "SWEEP", alerts: deps.alerts });
      if (applied.kind !== "none" || applied.added.length > 0 || applied.cleared.length > 0) out.changed++;
      if (await breakEnded(read, deps.alerts)) out.changed++;
    } catch (e) {
      out.failed++;
      console.error("[house-bot] holder sweep failed for one bot:", errMessage(e));
    }
  }
  return out;
}
