/**
 * THE POLLER'S PASS — claim what is due and fire it (04 A24, N1 §4.3 "Claim SQL for the poller"; C4-SPEC ruling 70).
 *
 * ⛔ THE GATE FIRST. `claimGate` refuses while the process is stopping, while its skew is unknown or over 5 s, while
 * admission is queueing or half full, and when `MAX_FIRES_PER_PROCESS` fires are already in flight — inline Enter now
 * fires included, because they share `inFlight`.
 *
 * ⛔ A BEAT ONLY AFTER A CLAIM (A24). `beat:poller:<instance>` says this process took work. A pass that claimed nothing
 * writes nothing, so a process that cannot claim never looks healthy. A beat that fails does not stop the fires: the
 * rows are already this worker's, and leaving them CLAIMED would only make them wait for their claim to expire.
 *
 * ⛔ **AND A CLAIM THAT FAILED IS RECORDED WITHOUT A BEAT** (04 A24; replan ruling 514, C7 step 4). Until this build
 * the whole limb was dead: `pollerErrorAt`, `pollerErrorCode`, `pollerErrorStreak` and the durable `skewMs` had no
 * writer anywhere in the tree, `POLLER_FAILURE_ALERT_AFTER` had exactly ONE occurrence — its own definition — and
 * `ALERT_KEY.pollerFailing` had none. A poller whose claim statement keeps throwing is the ONE condition the engine
 * cannot otherwise report: nothing is claimed, so nothing fires, so no outcome, no alert and no audit is ever written,
 * and every other instrument reads "quiet". The failure is therefore written HERE, on this instance's own heartbeat
 * ROW, through `upsert` — ⛔ **never through `beat()`**, which stamps `beatAt` and would make a failed pass look alive,
 * which is the precise defect A24 exists for. The reset rides the beat the next successful claim writes.
 *
 * ⛔ THE COLUMNS ARE KEY-SCOPED EXACTLY AS `beatAt` IS. `pollerErrorAt`/`Code`/`Streak` on `beat:poller:<instance>`
 * describe THAT instance's claim; `skewMs` there is that instance's last measured database-clock offset, which until
 * now lived only in process memory and died with the container. The planner writes the same columns on its own row
 * for its own facts (X1's duty names, `planner.ts`).
 */
import { ALERT_KEY, POLLER_FAILURE_ALERT_AFTER, RUNTIME_KEY } from "@/lib/house-bot/constants";
import { houseBotIntentStore, houseBotRuntimeStore } from "../house-bot-dal";
import { claimGate, type EngineTicks, type TickContext } from "./engine";
import { fireClaimedIntent, type FireResult } from "./fire";
import { alertOnce, type EngineAlerts } from "./outcomes";

/** What a pass records when the CLAIM STATEMENT itself threw. ⛔ `alerted` is true only on the pass that CLAIMED the
 *  AlertOnce row, so a poller failing for an hour tells an admin once and not eighteen hundred times. */
export type PollerClaimFailure = { code: string; streak: number; alerted: boolean };

export type PollerPass =
  | { claimed: 0; gate: string }
  | { claimed: 0; failure: PollerClaimFailure }
  | { claimed: number; beat: boolean; results: Array<FireResult | { kind: "threw"; error: string }> };

const errMessage = (e: unknown) => String((e as Error)?.message ?? e).replace(/\s+/g, " ").slice(0, 200);

/**
 * Record one failed claim on this instance's heartbeat row and, at `POLLER_FAILURE_ALERT_AFTER` in a row, tell an
 * admin once per EAT hour (04 A24).
 *
 * ⛔ THE STREAK IS THE ROW'S, NOT THE PROCESS'S. A container that restarts every ten failures would otherwise never
 * reach the threshold, which is exactly the shape a crash-looping poller has. One process owns one
 * `beat:poller:<instanceId>` key and `pollerBusy` stops its own ticks overlapping, so the read-then-write cannot race
 * itself and no other writer touches that row.
 * ⛔ THE INSTANT IS THE DATABASE CLOCK'S, ESTIMATED — never the bare container clock. The Callout compares this
 * against `beatAt`, which both twins stamp on the DATABASE clock, and a container running five seconds behind would
 * otherwise report a fresh failure as older than the beat that preceded it and paint the wrong sentence. The gate
 * above has already refused unless `skewMs` is known and within `MAX_TOLERATED_SKEW_MS`, so the offset is available
 * and bounded every time this runs.
 * ⛔ A FAILURE TO RECORD THE FAILURE IS NEVER A THROW. The claim already failed; losing the pass to a second error
 * would replace a recorded outage with an unrecorded one.
 */
async function recordClaimFailure(ctx: TickContext, alerts: EngineAlerts, e: unknown): Promise<PollerClaimFailure> {
  const key = RUNTIME_KEY.pollerBeat(ctx.instanceId);
  const code = errMessage(e);
  const skewMs = ctx.state.skewMs;
  let streak = 0;
  try {
    const cur = await houseBotRuntimeStore.get(key);
    streak = (cur?.pollerErrorStreak ?? 0) + 1;
    await houseBotRuntimeStore.upsert(key, {
      pollerErrorAt: new Date(Date.now() + (skewMs ?? 0)).toISOString(),
      pollerErrorCode: code,
      pollerErrorStreak: streak,
      skewMs,
    });
  } catch (writeErr) {
    console.error("[house-bot] poller: the claim failed and the failure could not be recorded:", errMessage(writeErr));
  }
  console.error("[house-bot] poller claim failed:", code);
  const alerted = streak >= POLLER_FAILURE_ALERT_AFTER
    ? await alertOnce(ALERT_KEY.pollerFailing(), alerts, { code: "POLLER_FAILING", detail: { streak, error: code } })
    : false;
  return { code, streak, alerted };
}

export async function pollerPass(ctx: TickContext, alerts: EngineAlerts): Promise<PollerPass> {
  const gate = claimGate(ctx.state);
  if (!gate.ok) return { claimed: 0, gate: gate.reason };
  let rows;
  try {
    rows = await houseBotIntentStore.claimBatch({ me: ctx.instanceId, freeSlots: gate.freeSlots, skewGuardMs: gate.skewGuardMs });
  } catch (e) {
    /* ⛔ A24 · THE CLAIM STATEMENT THREW. No beat, because nothing was claimed and a beat would say the opposite. */
    return { claimed: 0, failure: await recordClaimFailure(ctx, alerts, e) };
  }
  if (rows.length === 0) return { claimed: 0, beat: false, results: [] };
  let beat = true;
  try {
    /* ⛔ THE RESET RIDES THE BEAT, AND THE DURABLE SKEW RIDES IT TOO (A24). `beat()`'s `extra` exists for exactly
     * these columns. ⚠️ `pollerErrorAt` and `pollerErrorCode` are NOT cleared: the Callout chooses between "failing"
     * and "not running" by which of the two instants is FRESHER, so erasing the last error would erase the only
     * thing that tells a recovered poller from one that has never failed. The STREAK is what "in a row" means, so
     * the streak is what a success ends. */
    await houseBotRuntimeStore.beat(RUNTIME_KEY.pollerBeat(ctx.instanceId), { pollerErrorStreak: 0, skewMs: ctx.state.skewMs });
  } catch {
    beat = false;
  }
  const results = await Promise.all(
    rows.map(async (row) => {
      try {
        return await fireClaimedIntent(row, { me: ctx.instanceId, alerts });
      } catch (e) {
        return { kind: "threw" as const, error: String((e as Error)?.message ?? e) };
      }
    }),
  );
  return { claimed: rows.length, beat, results };
}

/** The engine's poller and SIGTERM release for `startHouseBotEngine`. The planner is build step 5. */
export function workerTicks(alerts: EngineAlerts): Pick<EngineTicks, "pollerTick" | "requeueMine"> {
  return {
    pollerTick: async (ctx) => {
      await pollerPass(ctx, alerts);
    },
    requeueMine: async (instanceId, excludeIntentIds) => (await houseBotIntentStore.releaseClaims(instanceId, excludeIntentIds)).length,
  };
}
