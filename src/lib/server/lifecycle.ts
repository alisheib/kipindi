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
import { trialBalance } from "./ledger";
import { audit } from "./audit";
import { getAutoSettleEnabled } from "./payment-control";

const TICK_MS = 60_000;       // run the lifecycle sweeps once a minute
const FIRST_TICK_MS = 8_000;  // first pass shortly after boot (let the app settle)

let timer: ReturnType<typeof setInterval> | null = null;
let running = false;

// ── Nightly wallet↔ledger trial balance (audit C3) ──────────────────────────
// The books must be able to prove themselves. Once a day (and once after each
// boot's grace window) reconcile every wallet against the double-entry ledger;
// any drift raises a WATCHED compliance alert instead of dying in a console no
// one reads. Read-only — it never moves money.
const RECONCILE_EVERY_MS = 24 * 60 * 60 * 1000;
const RECONCILE_BOOT_GRACE_MS = 5 * 60 * 1000; // don't scan every wallet during boot
const tickerStartedAt = Date.now();
let lastReconcileAt = 0;

async function maybeReconcileLedger(): Promise<void> {
  const now = Date.now();
  if (now - tickerStartedAt < RECONCILE_BOOT_GRACE_MS) return; // let boot settle
  if (now - lastReconcileAt < RECONCILE_EVERY_MS) return;
  lastReconcileAt = now;
  const tb = await trialBalance();
  if (tb.ok) {
    console.log(`[lifecycle] ledger trial balance OK — ${tb.checkedWallets} wallets reconcile, books balanced`);
    return;
  }
  console.error(
    `[lifecycle] LEDGER TRIAL BALANCE DRIFT — ${tb.driftingWallets}/${tb.checkedWallets} wallets drift, ` +
      `globalSum=${tb.globalSum} (balanced=${tb.globalBalanced}), imbalancedGroups=${tb.imbalancedGroups.length}, ` +
      `totalAbsDrift=${tb.totalAbsDrift} TZS`,
  );
  await audit({
    category: "COMPLIANCE",
    action: "ledger.trial_balance_drift",
    actorId: null,
    targetType: null,
    targetId: null,
    payload: {
      driftingWallets: tb.driftingWallets,
      checkedWallets: tb.checkedWallets,
      globalSum: tb.globalSum,
      globalBalanced: tb.globalBalanced,
      imbalancedGroups: tb.imbalancedGroups.length,
      totalAbsDrift: tb.totalAbsDrift,
      worst: tb.worst
        ? { userId: tb.worst.userId, realDrift: tb.worst.realDrift, bonusDrift: tb.worst.bonusDrift, grantDrift: tb.worst.grantDrift }
        : null,
    },
  }).catch(() => {});
}

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

    // ── AUTOMATIC PAYOUT IS PAUSED (Ali, 2026-07-13) ────────────────────────
    // Nothing pays a market by itself. Every payout is a deliberate officer
    // action at /admin/settlement until the payment aggregator (Selcom/Azampay)
    // is integrated — we are not letting the platform move money on a timer
    // before the real money-out rail exists and has been reconciled against.
    //
    // NOTE this does not weaken the settlement gate: a resolved market still
    // holds its pool, still honours the objection window, and still refuses to
    // pay while an objection stands. All that changes is WHO presses go — a
    // human, not the clock. The guards live in settleMarket() and are re-checked
    // under the market lock on every manual settle, so the officer cannot pay a
    // market early or pay one that is under dispute.
    //
    // TO RE-ENABLE once the gateway is live: flip auto-settle ON from
    // /admin/payments (or set AUTO_SETTLE=true). That is the whole switch — the
    // sweep, its idempotency and its heartbeat are all still here and still tested;
    // they are simply not driven by the ticker today. `getAutoSettleEnabled()`
    // reads the admin control-plane, falling back to the env.
    if (await getAutoSettleEnabled()) {
      await settleDueMarkets().catch((e) => console.error("[lifecycle] settlement sweep:", e));
    }

    await expireActiveGrants().catch((e) => console.error("[lifecycle] bonus expiry:", e));
    await maybeReconcileLedger().catch((e) => console.error("[lifecycle] trial balance:", e));
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
