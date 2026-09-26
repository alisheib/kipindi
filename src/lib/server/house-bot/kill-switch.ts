/**
 * THE KILL SWITCH — switching house bots OFF, bounded (04 A9's four steps; C4-SPEC ruling 139).
 *
 * ⛔ THE OFF WRITE COMES FIRST, AND TAKES NO LOCK. H4 re-reads the control row inside the bet's own lock, so an OFF
 * that is committed is already binding for every bet not yet holding `house:control`. Taking that lock BEFORE writing
 * would let one hung bet hold the switch open for up to the 30 s transaction timeout — which is the whole reason A9
 * exists. A failed write is the only outcome that leaves house bots ON, and it says so in plain words.
 *
 * ⛔ THE DRAIN ONLY INFORMS. Step 2 asks, for at most `OFF_DRAIN_LOCK_TIMEOUT`, whether a bet already inside the
 * lock has finished. "busy" is never a failure, never retried, and never leaves the switch on: it changes one
 * sentence the operator reads.
 *
 * ⛔ A19 ORDER (04 A19): the event and its awaited audit first, the alert last, every one of them outside every lock.
 *
 * ⛔ TWO WRITERS, ONE OFF. The engine's own switch-off (`engineSwitchOff`, ENGINE_FAULT · ENGINE_ERRORS ·
 * GLOBAL_LOSS_STOP) stays where it is: it runs inside a worker, must not wait on a drain, and speaks on a different
 * channel. Both write through the same conditional UPDATE, so whichever lands second changes nothing and says so.
 */
import { HOUSE_CONTROL_LOCK, OFF_DRAIN_LOCK_TIMEOUT, type OffCause } from "@/lib/house-bot/constants";
import { SWITCH_OFF_COPY } from "@/lib/house-bot/feed-copy";
import { drainLock } from "../locks";
import { houseBotControlStore, houseBotEventStore, houseBotIntentStore } from "../house-bot-dal";
import { engineAudit, type EngineAlerts } from "./outcomes";

export type SwitchOffOutcome =
  | {
      ok: true;
      /** False when it was already off: nothing was written, nobody was told. */
      changed: boolean;
      /** Whether a bet was still inside `house:control` when the switch went off. */
      drain: "drained" | "busy" | "skipped";
      cancelled: number;
      message: string;
      /**
       * ⛔ FALSE WHEN THE OFF LANDED AND ITS COMPLIANCE ROW DID NOT (replan ruling 543). The switch IS off either way;
       * this is the half the caller must say beside it, never a reason to report the stop as failed. True when
       * nothing changed, because nothing was owed.
       */
      recorded: boolean;
    }
  | { ok: false; failure: "WRITE_FAILED"; message: string; error: string };

const errMessage = (e: unknown) => String((e as Error)?.message ?? e).replace(/\s+/g, " ").slice(0, 300);

/**
 * Switch house bots OFF — the operator's path: commit 7's console action and its ops script.
 * `drainTimeout` is A9's `OFF_DRAIN_LOCK_TIMEOUT` (3 s) by default; a caller that must answer faster passes its own.
 */
export async function switchOffHouseBots(input: {
  cause: OffCause;
  byId: string | null;
  reason: string | null;
  alerts: EngineAlerts;
  drainTimeout?: string;
}): Promise<SwitchOffOutcome> {
  const { cause, byId, reason } = input;

  // ── 1 · write OFF first, autocommit, no lock ──
  let off;
  try {
    off = await houseBotControlStore.switchOff({ cause, byId, reason });
  } catch (e) {
    return { ok: false, failure: "WRITE_FAILED", message: SWITCH_OFF_COPY.WRITE_FAILED, error: errMessage(e) };
  }
  // The conditional update matched nothing: another writer switched it off first. Nothing more to write or say.
  if (!off) return { ok: true, changed: false, drain: "skipped", cancelled: 0, message: SWITCH_OFF_COPY.ALREADY_OFF, recorded: true };

  // ── 2 · drain, bounded: has the bet that was already inside the lock finished? ──
  let drain: "drained" | "busy";
  try {
    drain = await drainLock(HOUSE_CONTROL_LOCK, { timeout: input.drainTimeout ?? OFF_DRAIN_LOCK_TIMEOUT });
  } catch (e) {
    // A drain that could not even ask says the honest thing: a bet may still be completing.
    console.error("[house-bot] kill switch: the drain could not be asked:", errMessage(e));
    drain = "busy";
  }

  // ── 3 · cancel what is queued (conditional; a row already finishing keeps its own outcome) ──
  const cancelled = (await houseBotIntentStore.cancelLive({ all: true }, "MASTER_OFF")).length;

  // ── 4 · record, then tell: event → awaited audit → alert, all outside every lock (A19) ──
  const event = await houseBotEventStore.append({
    houseBotId: null, userId: null, marketId: null, kind: "SWITCH_OFF", fromStatus: "ON", toStatus: "OFF",
    reason, actorId: byId, payload: { cause, cancelled, drain },
  });
  /* ⛔ 543 · THE AUDIT CANNOT UN-STOP THE DESK. Until the audit contract was fixed, a compliance row that could not
     be signed THREW here — after the OFF had landed, before the alert — and the console told the officer "Nothing
     changed" about a desk that WAS off, while nobody was told it had stopped. `engineAudit` now answers null for a
     row that did not land; the alert still goes, and the answer says the record is missing. */
  const auditId = await engineAudit("house_bot.switch_off", { type: "HouseBotControl", id: off.id }, {
    from: "ON", to: "OFF", cause, counts: { cancelled },
  });
  if (auditId) await houseBotEventStore.setAuditId(event.id, auditId);
  await input.alerts.switchedOff({ cause, cancelled });

  return {
    ok: true, changed: true, drain, cancelled, message: drain === "drained" ? SWITCH_OFF_COPY.DRAINED : SWITCH_OFF_COPY.BUSY,
    recorded: auditId !== null,
  };
}
