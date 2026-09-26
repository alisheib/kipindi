/**
 * THE STAFF CANCEL — the first press anything under `src/` has ever created (04 N1 §2 press flow; C7-SPEC ruling 415).
 *
 * ── WHAT WAS ALREADY BUILT, AND WHAT WAS MISSING ────────────────────────────────────────────────────────────────
 *
 * The whole `STAFF_CANCEL` lane existed except its creator. Measured before this file was written:
 * `grep -rn "pressStore\." src/lib/server/` returned `fire.ts` and `planner.ts` and nothing else — the planner's
 * audit-lease repair and the Enter-now queue step, both of which FINISH a press. The purpose
 * (`PRESS_PURPOSES.STAFF_CANCEL`), the event kind (`STAFF_INTENT_CANCELLED`), the intent-store member
 * (`cancelPending`, PENDING only by its own docblock) and the audit mapping (`press-audit.ts` → the
 * `house_bot.staff_intent_cancelled` key) were all on disk with no caller.
 *
 * ── THE LAW THIS SERVICE IS BUILT ON ────────────────────────────────────────────────────────────────────────────
 *
 * ⛔ **ONLY A QUEUED STAKE CAN BE STOPPED.** `cancelPending` moves PENDING and nothing else; a CLAIMED intent has
 * already been taken up by the engine, and a control offered over one could only ever refuse — which is the dead
 * control 432(a) forbids. The console offers the control on exactly the rows the rail's badge counts, and this
 * service refuses every other status by NAME rather than by a silent no-op.
 *
 * ⛔ **THE AUDIT KEY IS `house_bot.staff_intent_cancelled`, AND THAT IS NOT A NAMING PREFERENCE.** Membership in
 * `HOUSE_AUDIT` is exactly what keeps a row out of a player's own audit read (`OWN_AUDIT_EXCLUDED_ACTIONS` is
 * derived from that table). `constants.ts` also carries `house_bot.intent_cancelled`, classified ADMIN, with no
 * writer anywhere — a neutral-SOUNDING key minted to satisfy ruling 382 would silently leave the exclusion and put
 * a house row in a player's own download. Ruling 382 governs the EXPORT name and the guard label, never the audit
 * key, and the key this writes is the one `press-audit.ts` already maps this purpose to.
 *
 * ⛔ **THE OFFICER'S REASON LIVES ON THE EVENT, NEVER IN THE AUDIT PAYLOAD** (INT-10, and `press-audit.ts`'s own
 * header): erasure rewrites one and structurally cannot rewrite the other — the audit log is HMAC-chained and has
 * no update and no delete anywhere in `src/`.
 *
 * ⛔ **THE CANCEL, THE EVENT AND THE PRESS'S CLOSE ARE ONE TRANSACTION.** A crash between them would leave a press
 * CHECKING over an intent that is already CANCELLED, and the only thing that would notice is the planner's stale
 * sweep marking it INTERRUPTED — a decision record for an act that really happened, recorded as one that did not.
 *
 * ⛔ **THE AUDIT IS AFTER THE LOCK, AND ITS LOSS IS REPAIRABLE** (A19, ruling 74). The press keeps its lease, so a
 * write lost to a crash is written once by the planner's repair pass from the SAME `pressAuditEntry` builder.
 *
 * @see src/lib/server/house-bot/press-audit.ts · src/lib/server/house-bot-dal.ts · plans/house-bots/C7-SPEC.md
 */
import {
  houseBotEventStore,
  houseBotIntentStore,
  houseBotStore,
  houseTransaction,
  newHouseId,
  pressStore,
  HouseSchemaNotReady,
} from "../house-bot-dal";
import { SUBMIT_ID_RE } from "@/lib/house-bot/constants";
import { pressAuditEntry, writePressAudit } from "./press-audit";

/**
 * What the service answers. ⛔ A UNION, never a throw: every refusal names its own cause so the console can say
 * which one happened rather than painting one sentence over five different facts.
 * ⛔ `NOT_PENDING` AND `NOT_FOUND` ARE DIFFERENT ANSWERS. A stake that was placed while the officer was reading the
 * screen is not a stake that never existed, and telling them apart is the difference between "reload" and "it is
 * already out of your hands".
 */
export type StaffCancelResult =
  | { ok: true; changed: boolean; recorded: boolean }
  | { ok: false; code: "NOT_FOUND" | "NOT_PENDING" | "SCHEMA" | "UNREADABLE" | "WRITE_FAILED" | "BAD_SUBMIT_ID" };

export type StaffCancelInput = {
  /** The signed-in officer, resolved by the gated door — never read from a cookie here. */
  actorId: string;
  /** The queued stake. */
  intentId: string;
  /** The browser's own `crypto.randomUUID()`, which is what makes a double-press ONE press (N1 §2 step 2). */
  submitId: string;
  /** The officer's typed sentence. ⛔ It goes on the EVENT, never into the audit payload (INT-10). */
  reason: string;
};

/**
 * Stop one queued stake.
 *
 * ⛔ THE REPEAT OF ONE SUBMIT IS NOT A SECOND CANCEL. `insertChecking` answers `{ ok: false, existing }` for a
 * repeated `(actorId, submitId)`, which is the browser pressing twice or retrying a dropped response — the answer
 * is the FIRST press's outcome, never a second attempt at the write.
 */
export async function cancelQueuedStake(input: StaffCancelInput): Promise<StaffCancelResult> {
  /* ⛔ THE IDEMPOTENCY KEY IS CHECKED BEFORE ANYTHING IS READ. `HouseBotPress_submitId_check` is the SQL twin of
   * this shape, so a malformed one would otherwise surface as a constraint violation AFTER the row read. */
  if (!SUBMIT_ID_RE.test(input.submitId)) return { ok: false, code: "BAD_SUBMIT_ID" };

  /* ⛔ THE IDEMPOTENCY KEY IS CONSULTED BEFORE THE ROW'S STATUS, AND THE ORDER IS THE WHOLE POINT OF THE KEY.
   * A second press of one button — a double click, a retried request whose response was dropped — arrives with the
   * SAME (officer, submit id) over a stake this very press has already moved out of PENDING. Reading the status
   * first would answer "it had already left the queue", which is the officer's own act reported back to them as a
   * refusal. ⛔ A press that did NOT reach DONE is not answered as success either: the transaction threw, nothing
   * landed, and the row's existence means this key can never land again — the client mints a new one per dialog. */
  const prior = await pressStore.findByActorSubmit(input.actorId, input.submitId).catch(() => null);
  if (prior) {
    return prior.state === "DONE"
      ? { ok: true, changed: true, recorded: prior.auditId !== null }
      : { ok: false, code: "WRITE_FAILED" };
  }

  let intent;
  try {
    intent = await houseBotIntentStore.get(input.intentId);
  } catch (err) {
    /* ⛔ 421 · A MISSING SCHEMA IS A STATE, not a failure and not a missing record. */
    return { ok: false, code: err instanceof HouseSchemaNotReady ? "SCHEMA" : "UNREADABLE" };
  }
  if (!intent) return { ok: false, code: "NOT_FOUND" };
  /* ⛔ THE STATUS IS CHECKED HERE AND AGAIN BY `cancelPending` INSIDE THE TRANSACTION, and both are load-bearing:
   * this one is what lets the officer be TOLD what happened, and the store's is what makes the write safe under a
   * concurrent claim. A check that only reads is not a lock. */
  if (intent.status !== "PENDING") return { ok: false, code: "NOT_PENDING" };

  const pressId = newHouseId("press");
  let press;
  try {
    const inserted = await pressStore.insertChecking({
      id: pressId,
      actorId: input.actorId,
      submitId: input.submitId,
      purpose: "STAFF_CANCEL",
      houseBotId: intent.houseBotId,
      marketId: intent.marketId,
      targetId: null,
      intentId: intent.id,
      /* ⛔ THE REASON IS KEPT ON THE PRESS AND ON THE EVENT — both are rewritten by `pseudonymiseForUser`, and the
       * audit row joins to the press through `HouseBotPress.auditId`. One join away, and erasable. */
      reason: input.reason,
    });
    /* The same answer from the other side: two presses that raced past the read above still insert once, and the
       loser is told what the winner did rather than being allowed to write a second time. */
    if (!inserted.ok) {
      return inserted.existing.state === "DONE"
        ? { ok: true, changed: true, recorded: inserted.existing.auditId !== null }
        : { ok: false, code: "WRITE_FAILED" };
    }
    press = inserted.row;
  } catch (err) {
    return { ok: false, code: err instanceof HouseSchemaNotReady ? "SCHEMA" : "WRITE_FAILED" };
  }

  /* ── the one transaction: the cancel, its event, and the press's close ── */
  let eventId: string | null = null;
  try {
    eventId = await houseTransaction(async (tx) => {
      const moved = await houseBotIntentStore.cancelPending(intent.id, "CANCELLED_BY_ADMIN", tx);
      /* ⛔ A 0-ROW MOVE ROLLS THE WHOLE THING BACK. Between the read above and this statement the engine may have
       * claimed the intent; writing the event and closing the press over a stake that is still going out would be
       * a record of something that did not happen. */
      if (!moved) throw new StaffCancelRace();
      const event = await houseBotEventStore.append({
        houseBotId: intent.houseBotId,
        userId: intent.botUserId,
        marketId: intent.marketId,
        kind: "STAFF_INTENT_CANCELLED",
        fromStatus: null,
        toStatus: null,
        /* ⛔ THE OFFICER'S OWN SENTENCE, ON THE EVENT (INT-10). */
        reason: input.reason,
        actorId: input.actorId,
        /* ⛔ `pressId` IS WHAT THE AUDIT REPAIR FINDS THIS EVENT BY (`listForPress`), and the other three are the
         * only keys `press-audit.ts` reads off it. No amount beyond the stake the press is about, and no holder. */
        payload: { pressId: press.id, intentId: intent.id, side: intent.side, stakeTzs: intent.stakeTzs },
      }, tx);
      await pressStore.doneInTx(press.id, tx);
      return event.id;
    });
  } catch (err) {
    /* ⛔ THE RACE IS NOT A FAILURE OF THE SYSTEM, IT IS AN ANSWER: the stake left the queue while the officer was
     * deciding. The press stays CHECKING and the planner's stale sweep marks it INTERRUPTED, which is what that
     * sweep is for. */
    if (err instanceof StaffCancelRace) return { ok: false, code: "NOT_PENDING" };
    return { ok: false, code: "WRITE_FAILED" };
  }

  /* ── after the transaction (A19): the awaited audit, from the ONE builder the repair also uses ── */
  let recorded = false;
  try {
    const leased = await pressStore.claimAuditLease(press.id);
    if (leased) {
      const bot = await houseBotStore.get(leased.houseBotId);
      const events = await houseBotEventStore.listForPress(leased);
      const entry = pressAuditEntry(leased, { intent: await houseBotIntentStore.get(intent.id), events, holderUserId: bot?.userId ?? null });
      if (entry) {
        const auditId = await writePressAudit(leased, entry);
        if (auditId) {
          recorded = await pressStore.setAuditId(leased.id, auditId);
          if (eventId) await houseBotEventStore.setAuditId(eventId, auditId);
        }
      }
    }
  } catch {
    /* ⛔ THE CANCEL LANDED. An audit lost here is written once by the planner's lease repair from the same builder,
     * so it is NOT reported to the officer as a failure — "nothing was stopped" would be the opposite of the truth
     * on a control that has already stopped a stake. `recorded` says so instead.
     * ⚠️ SINCE REPLAN RULING 543 THIS CATCH IS FOR THE STORE CALLS ONLY (the lease, the reads, `setAuditId`). The audit
     * itself no longer throws: `writePressAudit` answers null for a row that did not land — unsigned, or refused by
     * the database — so `recorded` stays false above, the press stays unaudited, and the repair writes it later. */
    recorded = false;
  }

  return { ok: true, changed: true, recorded };
}

/** The 0-row cancel, raised so the transaction rolls back and the caller can tell it from a write failure. */
class StaffCancelRace extends Error {
  constructor() { super("the stake left the queue before it could be stopped"); }
}
