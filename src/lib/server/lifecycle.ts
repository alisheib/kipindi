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

/** How often in-flight deposits are re-queried against the gateway. Deliberately
 *  much faster than TICK_MS: the player has already been debited and is staring at
 *  a pending screen. Only deposits inside DEPOSIT_FAST_WINDOW_MS are polled at this
 *  rate, so the call volume stays bounded no matter how many deposits exist. */
const DEPOSIT_POLL_MS = 15_000;

let timer: ReturnType<typeof setInterval> | null = null;
let depositTimer: ReturnType<typeof setInterval> | null = null;
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

// ── Payment reconciliation + stuck-deposit notice ───────────────────────────
// Every 5 minutes (not every tick — each stale txn costs a signed round-trip to
// Selcom's status endpoint, and the cutoff is 30 minutes anyway, so a 1-minute
// cadence would be 5x the gateway traffic for zero extra freshness).
//
// ⚠️ WHY THIS EXISTS: `reconcileStalePayments` was written, tested and documented
// as "intended to run on a schedule" — and then never wired to one. Nothing in
// the app called it. A deposit the player genuinely PAID whose webhook was lost
// or delayed past the return page therefore sat PROCESSING forever, uncredited,
// with no recovery except an officer noticing it in the /admin/payments retry
// queue. That is money taken and not delivered, and it was live.
//
// Enabled for BOTH deposits and withdrawals by Ali's decision, 2026-07-18. See
// the note on automatic payout below: these are different things, and the
// distinction is load-bearing.
const PAYMENT_SWEEP_EVERY_MS = 5 * 60 * 1000;
let lastPaymentSweepAt = 0;

/**
 * Fast credit lane — runs on EVERY tick, not on the 5-minute sweep cadence.
 *
 * A player who has already been debited by their mobile-money provider will not
 * wait for the 30-minute stale sweep, and will pay again. Selcom's callback is the
 * intended fast path, but on 2026-07-20 a genuinely paid deposit sat PROCESSING
 * with no webhook ever arriving. This re-queries the signed order-status directly,
 * so credit no longer depends on the callback showing up.
 *
 * `creditConfirmedDeposits` can only CONFIRM — never fail, never reverse — so
 * running it once a minute cannot turn a slow deposit into a failed one.
 */
async function fastCreditInFlightDeposits(): Promise<void> {
  const { creditConfirmedDeposits } = await import("./wallet-service");
  const r = await creditConfirmedDeposits();
  if (r.confirmed) console.log(`[lifecycle] fast-credited ${r.confirmed} of ${r.checked} in-flight deposit(s)`);
}

async function maybePaymentSweeps(): Promise<void> {
  const now = Date.now();
  if (now - lastPaymentSweepAt < PAYMENT_SWEEP_EVERY_MS) return;
  lastPaymentSweepAt = now;
  const { reconcileStalePayments, notifyStillPendingDeposits } = await import("./wallet-service");
  // Settle first, then notify — so a deposit this very sweep just resolved is
  // already terminal and is NOT then emailed "we're still waiting on it".
  const r = await reconcileStalePayments();
  if (r.depositsConfirmed || r.depositsFailed || r.withdrawalsConfirmed || r.withdrawalsReversed || r.leftPending) {
    console.log(
      `[lifecycle] payment reconcile — deposits +${r.depositsConfirmed}/-${r.depositsFailed}, ` +
        `withdrawals +${r.withdrawalsConfirmed}/-${r.withdrawalsReversed}, ${r.leftPending} still in flight`,
    );
  }
  const n = await notifyStillPendingDeposits();
  if (n.notified) console.log(`[lifecycle] told ${n.notified} player(s) their deposit is still pending`);
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

    // ── AUTOMATIC MARKET PAYOUT IS PAUSED (Ali, 2026-07-13) ─────────────────
    // Nothing pays a market by itself. Every payout is a deliberate officer
    // action at /admin/settlement until the payment aggregator (Selcom/Azampay)
    // is integrated — we are not letting the platform DECIDE to move money on a
    // timer before the real money-out rail exists and has been reconciled against.
    //
    // ⚠️ Do not read this as "no money moves on a timer" — since 2026-07-18
    // `maybePaymentSweeps` reconciles stuck payments on the ticker (Ali's call).
    // The two are different in kind and the difference is the whole point:
    //   • Market payout DECIDES to pay, from our own settlement logic. Paused.
    //   • Reconcile does NOT decide anything. It asks Selcom's signed status
    //     endpoint what already happened at the gateway and makes our records
    //     agree with it — crediting a deposit the player provably paid, failing
    //     one they provably didn't. Refusing to run it doesn't keep money still;
    //     it just leaves our books disagreeing with reality.
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
    // NOTE: the deposit fast-credit lane is deliberately NOT called here. It has its
    // own 15s timer (see startLifecycleTicker). Calling it from both meant two
    // concurrent passes every 60s — the overlap guard only covers the dedicated
    // timer — which doubled the gateway calls and wrote duplicate
    // payments.fast_credit audit rows. Observed in production 2026-07-20 12:49:47.
    await maybePaymentSweeps().catch((e) => console.error("[lifecycle] payment sweeps:", e));
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

  // Deposits get their OWN, much faster timer. A player watching a spinner after
  // their money has already left their mobile-money account is the single worst
  // wait on the platform, and the 60s lifecycle cadence is too slow for it.
  // Kept separate from the lifecycle pass on purpose: that pass does market
  // sweeps and trial-balance work that must NOT run four times a minute.
  depositTimer = setInterval(() => { void runDepositPoll(); }, DEPOSIT_POLL_MS);
  console.log(`[lifecycle] deposit fast-credit poll — every ${DEPOSIT_POLL_MS / 1000}s`);
}

/** Poll in-flight deposits. Guarded against overlap: a slow provider must not
 *  stack up polls, which at this cadence would otherwise pile on. */
let depositPolling = false;
async function runDepositPoll(): Promise<void> {
  if (depositPolling) return;
  depositPolling = true;
  try {
    await fastCreditInFlightDeposits();
  } catch (e) {
    console.error("[lifecycle] deposit poll:", e);
  } finally {
    depositPolling = false;
  }
}
