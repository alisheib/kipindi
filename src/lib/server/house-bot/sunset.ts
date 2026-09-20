/**
 * THE SUNSET — the wind-down that installs the TERMINAL state (04 F2, FS-06, TGT-31).
 *
 * ⛔ READ WHAT SUNSET MEANS BEFORE CHANGING ANYTHING HERE. The word invites three wrong builds, and the
 * ruling rules all three out in one line each:
 *   · ⛔ IT IS NOT A DATA RETIREMENT. "All data is kept (A20)". Markers, intents, events, presses and
 *     targets all stay, and every report keeps every press, intent, target and event row. Nothing here
 *     deletes a row, and nothing here may ever start to.
 *   · ⛔ IT DOES NOT UNWIND OPEN MONEY. "Open house positions settle normally. A pari-mutuel pool can't
 *     void one position." Nothing here voids, refunds or cashes out, and the one alert it sends carries
 *     the open exposure precisely so nobody reads "retired" as "nothing is on the table".
 *   · ⛔ IT DOES NOT TELL A HOLDER. D19: nothing about house bots reaches a player or the holder, and a
 *     "your account has been retired" message would be the loudest possible breach of it.
 *
 * ── IT IS THE FIRST OF TWO ACTS, AND THE ORDER IS THE POINT ────────────────────────────────────
 *   1. this, through `ops:house-bots-sunset --apply`: seconds, no deploy, the bleeding stops at once;
 *   2. then `houseBots: "WITHDRAWN"` in `feature-state.ts`, committed and deployed.
 * Act 1 is a DATABASE marker that survives a redeploy of an older image; act 2 is a CODE constant that
 * survives a database someone edits by hand. ⛔ Neither may become the only one anyone maintains —
 * `test:withdrawn-features` §9d drives each alone and asserts they refuse identically.
 *
 * ── WHY IT DOES NOT REUSE `removeHouseBot` ─────────────────────────────────────────────────────
 * That function is right for an officer removing ONE account and wrong four ways for a wind-down: it
 * hardcodes cause MANUAL at three sites, ends targets as BOT_REMOVED (the feed's word for an officer's
 * act on that account), writes no per-target event at all, and announces once PER BOT — so a desk of
 * five would ring five bells for one decision. FS-06 asks for ONE.
 *
 * ── ⛔ `endAllForBot` WRITES NO EVENTS, IN EITHER TWIN ─────────────────────────────────────────
 * It is a single conditional UPDATE that returns the rows it moved. The caller owes one TARGET_ENDED
 * event per returned row — the pattern `voidHouseConsent` already uses, and the only correct one. A
 * sunset that skipped them would end every target silently and leave the console's own history blank.
 *
 * ── ⛔ THE OFFICER'S FREE TEXT NEVER ENTERS THE AUDIT PAYLOAD ──────────────────────────────────
 * `reason` was removed from `HOUSE_AUDIT_PAYLOAD_KEYS` on 2026-09-20 with a nine-line explanation: the
 * chain cannot be rewritten, so a holder's name typed into a reason box outlived that holder's own
 * erasure. It rides on the event row's `reason` column and on `HouseBot.removedReason`, both of which
 * `pseudonymiseForUser` can rewrite to `[erased]`. `isAllowedHouseAuditPayload` THROWS on it.
 *
 * ⛔ IT IS STRUCTURALLY INCAPABLE OF TURNING THE SWITCH ON: the state it writes is the one state
 * `switchOnHouseBots` refuses outright (`offCause === "SUNSET"` → `WITHDRAWN`).
 * ⛔ IT NEVER TOUCHES A PRESS ROW (TGT-31): a QUEUED press over a cancelled intent becomes DONE on the
 * planner's next pass, through the sweep that already exists for it.
 * ⛔ A19 ORDER: the locked writes, then the record (events, then the awaited compliance row), then the
 * one alert — every one of them outside every lock.
 */
import { audit } from "../audit";
import { withLock } from "../locks";
import { HOUSE_AUDIT, HOUSE_CONTROL_ID, isAllowedHouseAuditPayload, LIVE_INTENT_STATUSES } from "@/lib/house-bot/constants";
import {
  houseAtomic, houseBookStore, houseBotControlStore, houseBotEventStore, houseBotIntentStore, houseBotStore,
  targetStore, HouseSchemaNotReady, type StoredHouseBot,
} from "../house-bot-dal";
import { announceSunset } from "./emitters";

/** FS-06 bounds the officer's note, and both DDL CHECKs cap it at 300. */
export const SUNSET_REASON_MIN = 5;
export const SUNSET_REASON_MAX = 300;

/**
 * What the dry run prints and what the compliance row will say. ⛔ THIS CENSUS IS THE RECORD: the audit
 * payload carries three of these keys verbatim, so the operator reads the compliance row before it exists.
 */
export type SunsetCensus = {
  control: { enabled: boolean; offCause: string | null };
  botsByStatus: Record<string, number>;
  bots: number;
  liveIntents: number;
  activeTargets: number;
  openExposureByMarket: Array<{ marketId: string; openStakeTzs: number; bots: number }>;
  openExposureTzs: number;
  markets: number;
};

export type SunsetResult =
  | {
    ok: true;
    /** False when everything was already terminal: nothing was written, nobody was told. */
    changed: boolean;
    census: SunsetCensus;
    counts: { botsRemoved: number; targetsEnded: number; intentsCancelled: number };
    eventId: string | null;
    /** ⛔ `false` means the desk MOVED and the compliance row did not land — the caller says both (543). */
    recorded: boolean;
    auditId: string | null;
  }
  | { ok: false; code: "REASON" | "SCHEMA" | "UNREADABLE" | "WRITE_FAILED"; message: string };

const errMessage = (e: unknown) => String((e as Error)?.message ?? e).replace(/\s+/g, " ").slice(0, 300);

/** Read-only: exactly what `--apply` would act on, in the shape the audit row will carry. */
export async function houseBotSunsetCensus(): Promise<SunsetCensus> {
  const control = await houseBotControlStore.get();
  const bots = await houseBotStore.listNonRemoved();
  const byStatus: Record<string, number> = {};
  for (const b of bots) byStatus[b.status] = (byStatus[b.status] ?? 0) + 1;
  /* ⛔ ONE STATEMENT EACH, NEVER A PER-BOT LOOP (the seam's own shape rule). `countFeed` with the live
     statuses and no bot filter counts every queued stake on the desk; `countActive` with no `botId`
     counts every ACTIVE target across every account. */
  const liveIntents = await houseBotIntentStore.countFeed({ statuses: [...LIVE_INTENT_STATUSES] });
  const activeTargets = await targetStore.countActive({});
  const openExposureByMarket = await houseBookStore.openExposureByMarket();
  return {
    control: { enabled: control.enabled, offCause: control.offCause },
    botsByStatus: byStatus,
    bots: bots.length,
    liveIntents,
    activeTargets,
    openExposureByMarket,
    openExposureTzs: openExposureByMarket.reduce((s, r) => s + r.openStakeTzs, 0),
    markets: openExposureByMarket.length,
  };
}

/**
 * Retire the programme. Idempotent by construction: every group is conditional, so a second run changes
 * nothing and writes no second event, no second compliance row and no second alert — and a run that
 * failed half way through finishes the job rather than starting a different one.
 */
export async function sunsetHouseBots(input: { actorId: string | null; reason: string }): Promise<SunsetResult> {
  const reason = input.reason.trim();
  if (reason.length < SUNSET_REASON_MIN || reason.length > SUNSET_REASON_MAX) {
    return { ok: false, code: "REASON", message: `A reason of ${SUNSET_REASON_MIN} to ${SUNSET_REASON_MAX} characters is required.` };
  }

  let census: SunsetCensus;
  try {
    census = await houseBotSunsetCensus();
  } catch (err) {
    return { ok: false, code: err instanceof HouseSchemaNotReady ? "SCHEMA" : "UNREADABLE", message: errMessage(err) };
  }

  /* ── 1 · the control row, and ⛔ NOT through switchOff() ─────────────────────────────────────
     `switchOff` is conditional on `enabled = true`. The shipped row is `enabled = false` with `offCause`
     NULL, so a sunset routed through it would match NOTHING there: every bot removed, every target ended,
     and no terminal marker at all — after which any ADMIN could switch the stripped desk back on. */
  let marked: Awaited<ReturnType<typeof houseBotControlStore.markSunset>>;
  try {
    marked = await houseBotControlStore.markSunset({ byId: input.actorId, reason });
  } catch (err) {
    return { ok: false, code: "WRITE_FAILED", message: errMessage(err) };
  }

  /* ── 2 · every non-REMOVED account, one transaction each on its own holder's wallet lock ─────
     The ORDER inside is the roster path's own and its reason is stated there: targets first, because a
     REMOVED account pointing at live markets is the state neither the planner nor the feed can explain. */
  const live: StoredHouseBot[] = await houseBotStore.listNonRemoved();
  let targetsEnded = 0;
  let botsRemoved = 0;
  let intentsCancelled = 0;
  const removed: StoredHouseBot[] = [];
  try {
    for (const bot of live) {
      const done = await withLock(`wallet:${bot.userId}`, (tx) => houseAtomic(tx, async (t) => {
        const ended = await targetStore.endAllForBot(bot.id, "SUNSET", t);
        for (const target of ended) {
          // ⛔ endAllForBot writes NO event in either twin — the caller owes one per row it moved.
          await houseBotEventStore.append({
            houseBotId: bot.id, userId: bot.userId, marketId: target.marketId, kind: "TARGET_ENDED",
            fromStatus: "ACTIVE", toStatus: "ENDED", reason: null, actorId: input.actorId,
            payload: { targetId: target.id, endCause: "SUNSET" },
          }, t);
        }
        const moved = await houseBotStore.setStatus(bot.id, {
          from: ["ACTIVE", "PAUSED", "AUTO_PAUSED"], to: "REMOVED", pauseReason: null, pausedFromStatus: null,
          removal: { byId: input.actorId, reason, cause: "SUNSET" },
        }, t);
        return { moved, ended: ended.length };
      }));
      targetsEnded += done.ended;
      if (!done.moved) continue; // another writer removed it between the read and the lock
      botsRemoved += 1;
      removed.push(bot);
    }
  } catch (err) {
    return { ok: false, code: "WRITE_FAILED", message: errMessage(err) };
  }

  /* ── 3 and 4 · outside the locks: cancel what is queued, then one REMOVED event per account ── */
  for (const bot of removed) {
    const cancelled = await houseBotIntentStore.cancelLive({ houseBotId: bot.id }, "BOT_NOT_ACTIVE");
    intentsCancelled += cancelled.length;
    await houseBotEventStore.append({
      houseBotId: bot.id, userId: bot.userId, marketId: null, kind: "REMOVED", fromStatus: bot.status, toStatus: "REMOVED",
      reason, actorId: input.actorId,
      payload: { cause: "SUNSET", cancelled: cancelled.length },
    });
  }

  const changed = marked !== null || botsRemoved > 0;
  if (!changed) {
    return { ok: true, changed: false, census, counts: { botsRemoved: 0, targetsEnded, intentsCancelled: 0 }, eventId: null, recorded: true, auditId: null };
  }

  /* ── 4b · ONE global SUNSET event, with no `houseBotId` — the desk's own record of the decision.
     Each account's own record is its REMOVED event above; the split is stated in docs/HOUSE-BOTS.md. */
  const event = await houseBotEventStore.append({
    houseBotId: null, userId: null, marketId: null, kind: "SUNSET", fromStatus: null, toStatus: "SUNSET",
    reason, actorId: input.actorId,
    payload: { cause: "SUNSET", bots: botsRemoved, cancelled: intentsCancelled },
  });

  /* ── 5 · ONE COMPLIANCE row. ⛔ The three keys are the census, and `reason` is NOT among them. */
  const payload = { bots: botsRemoved, cancelled: intentsCancelled, openExposureByMarket: census.openExposureByMarket, eventId: event.id };
  if (!isAllowedHouseAuditPayload(payload)) {
    throw new Error("house audit house_bot.sunset: payload keys outside the R7 allowlist");
  }
  let recorded = true;
  let auditId: string | null = null;
  try {
    const entry = (await audit({
      category: HOUSE_AUDIT["house_bot.sunset"],
      action: "house_bot.sunset",
      /* 🔴 WAS `input.actorId ?? "system"`, AND THAT WAS A FABRICATED ACTOR. `audit()` takes `string | null` and its
       * own comment says "null for system events", so the `??` bought nothing and invented an id no user has —
       * while ruling 170's closed actor list (officer, forwarded officer, engine, nobody) does not contain it.
       * `test:house-bot-reports` 0.170.1 reported it by name the first time this lane ran that suite. An audit row
       * whose actor is a word rather than an account is the shape that makes a chain unreadable later. */
      actorId: input.actorId,
      targetType: "HouseBotControl",
      targetId: HOUSE_CONTROL_ID,
      payload,
    })) as unknown;
    auditId = entry && typeof entry === "object" && typeof (entry as { id?: unknown }).id === "string" ? (entry as { id: string }).id : null;
  } catch (err) {
    // ⛔ THE DESK HAS ALREADY MOVED BY THIS LINE. A failed compliance row is NAMED, never reported as a
    // failed sunset: `audit()` promises never to reject and `chainSecret()` throws past that promise in
    // production without a distinct AUDIT_CHAIN_SECRET.
    recorded = false;
    console.error("[house-bot] the sunset compliance row could not be written (the desk IS retired):", errMessage(err));
  }
  if (auditId) await houseBotEventStore.setAuditId(event.id, auditId);

  /* ── 6 · ONE alert for the whole wind-down, last, and it never fails the act. */
  await announceSunset({
    cancelled: intentsCancelled,
    openExposure: { tzs: census.openExposureTzs, markets: census.markets },
  });

  return { ok: true, changed: true, census, counts: { botsRemoved, targetsEnded, intentsCancelled }, eventId: event.id, recorded, auditId };
}
