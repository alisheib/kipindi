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
 */
import { RUNTIME_KEY } from "@/lib/house-bot/constants";
import { houseBotIntentStore, houseBotRuntimeStore } from "../house-bot-dal";
import { claimGate, type EngineTicks, type TickContext } from "./engine";
import { fireClaimedIntent, type FireResult } from "./fire";
import type { EngineAlerts } from "./outcomes";

export type PollerPass =
  | { claimed: 0; gate: string }
  | { claimed: number; beat: boolean; results: Array<FireResult | { kind: "threw"; error: string }> };

export async function pollerPass(ctx: TickContext, alerts: EngineAlerts): Promise<PollerPass> {
  const gate = claimGate(ctx.state);
  if (!gate.ok) return { claimed: 0, gate: gate.reason };
  const rows = await houseBotIntentStore.claimBatch({ me: ctx.instanceId, freeSlots: gate.freeSlots, skewGuardMs: gate.skewGuardMs });
  if (rows.length === 0) return { claimed: 0, beat: false, results: [] };
  let beat = true;
  try {
    await houseBotRuntimeStore.beat(RUNTIME_KEY.pollerBeat(ctx.instanceId));
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
