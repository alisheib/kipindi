/**
 * THE OFFICER'S TWO ROSTER ACTS — Pause and Remove (PLAN §6 and §8's action row; 04 A5, A19; C7-SPEC ruling 415;
 * replan ruling 549's 4b). Start and Re-verify already live in `designation.ts`; these two had no service at all
 * under `src/`, which is why the account page shipped with no action row.
 *
 * ⛔ **THE ENGINE'S STOP IS NOT THIS ONE, AND THE DIFFERENCE IS THE RECORD.** `outcomes.ts`'s `stopBot` writes
 * AUTO_PAUSED with a CAUSE, no actor and a SYSTEM audit — it is what the engine does when a holder's circumstances
 * change. An officer's Pause writes PAUSED with `MANUAL`, the officer's own id on the event, and the ADMIN-category
 * `house_bot.paused` row. Collapsing the two would make "the engine stopped it" and "a person stopped it"
 * indistinguishable in a seven-year record, and the whole point of the console is that a person did it.
 *
 * ⛔ **LOCK ORDER AND A19 ORDER** (C3-SPEC ruling 4; 04 A19). The status write is the only statement under
 * `wallet:<botUser>` — the lock every bet, auto-pause and Remove takes, so a CLAIMED intent already past H1 is
 * refused inside it. EVERYTHING ELSE runs after that lock returns: cancelling the account's queued stakes, the
 * event, the awaited compliance row, the alert. An audit append takes a database-wide serialised lock, and holding
 * the holder's wallet lock across it would stall the holder's own bets.
 *
 * ⛔ **EVERY WRITE IS CONDITIONAL, SO TWO OFFICERS PRODUCE ONE ACT** (A24). `setStatus` matches only the `from`
 * statuses; a second press writes nothing more and says so, rather than appending a second event and a second row.
 *
 * ⛔ **REMOVE ENDS THE TARGETS IN THE SAME TRANSACTION AS THE STATUS** (N2 §4 step 9). A removed account whose
 * targets stayed ACTIVE would keep a live pointer at a market with nothing behind it, and the planner would have
 * to discover that by failing. `BOT_REMOVED` is the end cause the feed's own copy already words.
 *
 * ⛔ **AND A COMPLIANCE ROW THAT DID NOT WRITE IS NAMED, NOT SWALLOWED** (replan rulings 537, 543). By the time
 * these audit, the account has already moved. `recorded: false` is the outcome, the caller renders a WARNING, and
 * the act is still reported as landed — an officer told "nothing happened" would do it again.
 */
import { audit } from "../audit";
import { withLock } from "../locks";
import { HOUSE_AUDIT, isAllowedHouseAuditPayload, type HouseAuditAction, type HouseBotStatus } from "@/lib/house-bot/constants";
import {
  houseAtomic, houseBotEventStore, houseBotIntentStore, houseBotStore, targetStore, HouseSchemaNotReady,
  type StoredHouseBot,
} from "../house-bot-dal";
import { announceRoster } from "./emitters";

export type RosterActResult =
  /** ⛔ `changed: false` means the account was already in that state: nothing was written and nobody was told. */
  | { ok: true; changed: boolean; status: HouseBotStatus; cancelled: number; targetsEnded: number; recorded: boolean }
  | { ok: false; code: "NOT_FOUND" | "REMOVED" | "SCHEMA" | "UNREADABLE" | "WRITE_FAILED" };

const errMessage = (e: unknown) => String((e as Error)?.message ?? e).replace(/\s+/g, " ").slice(0, 300);

/**
 * One house audit row, awaited, in its own `HOUSE_AUDIT` category (R7).
 * ⛔ A payload outside the allowlist is a programming error and THROWS: a label or a holder's name written into a
 * chain kept seven years cannot be erased afterwards.
 * ⛔ A FAILURE TO WRITE IT IS NOT A FAILURE OF THE ACT (543): it is returned, and the caller says both.
 * ⭐ READ FROM THE ANSWER, NOT CAUGHT (replan ruling 543, 2026-09-26): `audit()` resolves an entry it could not sign
 * or persist with `recorded` false, so a catch here would never run — and the id of an entry that did not land is
 * never handed on, or the event would be stamped with a reference to a row that does not exist.
 */
async function actAudit(action: HouseAuditAction, officerId: string, botId: string, payload: Record<string, unknown>): Promise<{ recorded: boolean; auditId: string | null }> {
  if (!isAllowedHouseAuditPayload(payload)) throw new Error(`house audit ${action}: payload keys outside the R7 allowlist`);
  const entry = await audit({ category: HOUSE_AUDIT[action], action, actorId: officerId, targetType: "HouseBot", targetId: botId, payload });
  if (!entry.recorded) console.error(`[house-bot] the ${action} compliance row could not be written (the account DID move): ${entry.unrecorded}`);
  return { recorded: entry.recorded, auditId: entry.recorded ? entry.id : null };
}

/** Read the row, telling a missing SCHEMA (a state, 421) from a failed read and from a record that is not there. */
async function readBot(botId: string): Promise<{ bot: StoredHouseBot } | { code: "NOT_FOUND" | "SCHEMA" | "UNREADABLE" }> {
  try {
    const bot = await houseBotStore.get(botId);
    return bot ? { bot } : { code: "NOT_FOUND" };
  } catch (err) {
    return { code: err instanceof HouseSchemaNotReady ? "SCHEMA" : "UNREADABLE" };
  }
}

/**
 * PAUSE — the officer's own stop on one account (PLAN §8's action row).
 *
 * ⛔ IT MOVES ONLY AN ACTIVE ACCOUNT. An AUTO_PAUSED account is already stopped by a live cause, and a manual pause
 * over it would erase the reason an officer needs in order to know what to fix — the `pauseReason` IS the way out
 * the strip renders. A second press on a paused account is `changed: false`.
 */
export async function pauseHouseBot(input: { actorId: string; botId: string; reason: string | null }): Promise<RosterActResult> {
  const read = await readBot(input.botId);
  if (!("bot" in read)) return { ok: false, code: read.code };
  const bot = read.bot;
  if (bot.status === "REMOVED") return { ok: false, code: "REMOVED" };

  let moved: StoredHouseBot | null;
  try {
    moved = await withLock(`wallet:${bot.userId}`, (tx) => houseBotStore.setStatus(bot.id, {
      from: ["ACTIVE"], to: "PAUSED", pauseReason: "MANUAL", pauseDetail: null, pausedFromStatus: null,
    }, tx ?? undefined));
  } catch (err) {
    console.error("[house-bot] the pause could not be written:", errMessage(err));
    return { ok: false, code: "WRITE_FAILED" };
  }
  if (!moved) return { ok: true, changed: false, status: bot.status, cancelled: 0, targetsEnded: 0, recorded: true };

  /* ── after the lock (A19): cancel, then the event, then the awaited audit, then the alert ── */
  const cancelled = (await houseBotIntentStore.cancelLive({ houseBotId: bot.id }, "BOT_NOT_ACTIVE")).length;
  const event = await houseBotEventStore.append({
    houseBotId: bot.id, userId: bot.userId, marketId: null, kind: "PAUSED", fromStatus: bot.status, toStatus: "PAUSED",
    /* ⛔ THE OFFICER'S REASON LIVES ON THE EVENT, NEVER IN THE AUDIT PAYLOAD (INT-10) — erasure rewrites one and
     * cannot rewrite the other. */
    reason: input.reason, actorId: input.actorId, payload: { cause: "MANUAL", cancelled },
  });
  const { recorded, auditId } = await actAudit("house_bot.paused", input.actorId, bot.id, {
    botId: bot.id, holderUserId: bot.userId, from: bot.status, to: "PAUSED", cause: "MANUAL", counts: { cancelled }, eventId: event.id,
  });
  if (auditId) await houseBotEventStore.setAuditId(event.id, auditId);
  await announceRoster({ botId: bot.id, label: bot.label, event: "PAUSED", eventId: event.id, detail: { cancelled } });

  return { ok: true, changed: true, status: "PAUSED", cancelled, targetsEnded: 0, recorded };
}

/**
 * REMOVE — the officer takes an account off the desk for good (04 A5, F2).
 *
 * ⛔ THE TARGETS END IN THE SAME TRANSACTION AS THE STATUS (N2 §4 step 9). Outside it, a crash between the two
 * would leave a REMOVED account pointing at live markets, and the only thing that would notice is a planner pass
 * failing on it.
 * ⛔ IT IS NOT REVERSIBLE, AND THE COPY SAYS SO. `REMOVE_CAUSES.MANUAL` is the cause; the officer's free text is
 * `removedReason` on the row, which erasure can rewrite.
 */
export async function removeHouseBot(input: { actorId: string; botId: string; reason: string | null }): Promise<RosterActResult> {
  const read = await readBot(input.botId);
  if (!("bot" in read)) return { ok: false, code: read.code };
  const bot = read.bot;
  if (bot.status === "REMOVED") return { ok: true, changed: false, status: "REMOVED", cancelled: 0, targetsEnded: 0, recorded: true };

  let written: { moved: StoredHouseBot | null; targetsEnded: number };
  try {
    written = await withLock(`wallet:${bot.userId}`, (tx) => houseAtomic(tx, async (t) => {
      /* ⛔ ENDED, NOT REMOVED, AND THE CAUSE IS THE ACCOUNT'S: `BOT_REMOVED` is what the feed's own copy words, and
       * a target "removed" would read as an officer's act on that target rather than a consequence of this one. */
      const ended = await targetStore.endAllForBot(bot.id, "BOT_REMOVED", t);
      const moved = await houseBotStore.setStatus(bot.id, {
        from: ["ACTIVE", "PAUSED", "AUTO_PAUSED"], to: "REMOVED", pauseReason: null, pausedFromStatus: null,
        removal: { byId: input.actorId, reason: input.reason, cause: "MANUAL" },
      }, t);
      return { moved, targetsEnded: ended.length };
    }));
  } catch (err) {
    console.error("[house-bot] the removal could not be written:", errMessage(err));
    return { ok: false, code: "WRITE_FAILED" };
  }
  if (!written.moved) return { ok: true, changed: false, status: bot.status, cancelled: 0, targetsEnded: 0, recorded: true };

  const cancelled = (await houseBotIntentStore.cancelLive({ houseBotId: bot.id }, "BOT_NOT_ACTIVE")).length;
  const event = await houseBotEventStore.append({
    houseBotId: bot.id, userId: bot.userId, marketId: null, kind: "REMOVED", fromStatus: bot.status, toStatus: "REMOVED",
    reason: input.reason, actorId: input.actorId, payload: { cause: "MANUAL", cancelled, counts: { targetsEnded: written.targetsEnded } },
  });
  const { recorded, auditId } = await actAudit("house_bot.removed", input.actorId, bot.id, {
    botId: bot.id, holderUserId: bot.userId, from: bot.status, to: "REMOVED", cause: "MANUAL",
    counts: { cancelled, targetsEnded: written.targetsEnded }, eventId: event.id,
  });
  if (auditId) await houseBotEventStore.setAuditId(event.id, auditId);
  await announceRoster({ botId: bot.id, label: bot.label, event: "REMOVED", eventId: event.id, detail: { cancelled } });

  return { ok: true, changed: true, status: "REMOVED", cancelled, targetsEnded: written.targetsEnded, recorded };
}
