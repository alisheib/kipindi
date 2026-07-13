/**
 * Lifecycle ticker — the production trigger for time-based market transitions.
 *
 * Bet-placed, win and loss notifications fire synchronously on the player's bet
 * action and the officer's resolve action, so those are always reliable. But two
 * transitions are driven by the CLOCK, not by a user action, and so have no
 * natural trigger:
 *   1. Selection close  → notify bettors "selections closed, waiting for results"
 *   2. Resolution due   → alert officers a real market is ready to resolve
 *      (+ auto-resolve expired Demo markets, expire stale bonus grants)
 *
 * These used to be wired only into a page-hit sweep (seedDemoMarkets) that is no
 * longer called from anywhere, so they silently stopped firing. This ticker runs
 * them on a fixed interval, INDEPENDENT of the AI sentinel (which is gated by an
 * API key + a pause switch + a budget). Every sweep is idempotent (per-market
 * lock + a "notified" stamp), so running them repeatedly is safe.
 *
 * Started once from instrumentation.register() on the Node runtime.
 */

import {
  notifyClosingSoonMarkets,
  notifySelectionClosedMarkets,
  notifyDueMarketsForResolution,
  autoResolveExpiredDemoMarkets,
  repairOrphanedPositions,
  settleDueMarkets,
} from "./market-service";
import { expireActiveGrants } from "./bonus-service";

const TICK_MS = 60_000;       // run the lifecycle sweeps once a minute
const FIRST_TICK_MS = 8_000;  // first pass shortly after boot (let the app settle)

let timer: ReturnType<typeof setInterval> | null = null;
let running = false;

/** Run one lifecycle pass. Each sweep is self-contained and best-effort; one
 *  failing must never stop the others or throw out of the tick. */
export async function runLifecyclePass(): Promise<void> {
  if (running) return; // never overlap passes
  running = true;
  try {
    await notifyClosingSoonMarkets().catch((e) => console.error("[lifecycle] closing-soon sweep:", e));
    await notifySelectionClosedMarkets().catch((e) => console.error("[lifecycle] selection-closed sweep:", e));
    await notifyDueMarketsForResolution().catch((e) => console.error("[lifecycle] resolution-due sweep:", e));
    await autoResolveExpiredDemoMarkets().catch((e) => console.error("[lifecycle] demo auto-resolve:", e));
    // Settlement sweep — pays adjudicated markets whose objection window has
    // closed. This is the ONLY thing that pays a resolved market, so if this
    // sweep stops running, money stops moving (it does not leak — it waits).
    await settleDueMarkets().catch((e) => console.error("[lifecycle] settlement sweep:", e));
    await expireActiveGrants().catch((e) => console.error("[lifecycle] bonus expiry:", e));
  } finally {
    running = false;
  }
}

/** Start the recurring lifecycle ticker. Idempotent — a second call is a no-op.
 *  Set LIFECYCLE_TICKER=false to disable (e.g. when an external cron drives it). */
export function startLifecycleTicker(): void {
  if (timer) return;
  if (process.env.LIFECYCLE_TICKER === "false") {
    console.warn("[lifecycle] LIFECYCLE_TICKER=false — ticker disabled");
    return;
  }
  // One-time boot repair (refund orphaned positions left by an old deletion bug).
  repairOrphanedPositions().catch(() => {});
  // First pass soon after boot, then steady cadence.
  setTimeout(() => { void runLifecyclePass(); }, FIRST_TICK_MS);
  timer = setInterval(() => { void runLifecyclePass(); }, TICK_MS);
  console.log(`[lifecycle] ticker started — every ${TICK_MS / 1000}s`);
}
