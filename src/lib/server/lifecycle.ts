/**
 * Lifecycle ticker — the periodic backstop for the NON-market chores, plus the
 * self-healing reconcile for the per-market scheduler.
 *
 * Time-based MARKET transitions (closing-soon, selection-closed, resolve, settle)
 * are no longer swept here — each market carries its own precise timer, armed at
 * create/resolve and hydrated at boot (see market-scheduler.ts). All this ticker
 * still does, once a minute, is:
 *   • reconcile the scheduler — re-arm any pending market that lost its timer
 *     (~5-min cadence; the ONLY market work left, and purely self-healing);
 *   • expire stale bonus grants;
 *   • reconcile stuck payments + notify still-pending deposits (~5-min);
 *   • run the nightly wallet↔ledger trial balance (daily).
 * A separate, faster timer fast-credits in-flight deposits every 15s.
 *
 * Started once from instrumentation.register() on the Node runtime.
 */

import { repairOrphanedPositions } from "./market-service";
import { reconcileMarketSchedules } from "./market-scheduler";
import { expireActiveGrants } from "./bonus-service";
import { trialBalance } from "./ledger";
import { audit } from "./audit";
import { acquireLeadership, releaseLeadership } from "./leader";

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

// ── Overrun visibility (ops) ────────────────────────────────────────────────
// The overlap guard below is correct — two concurrent passes double the gateway
// calls and write duplicate audit rows (observed 2026-07-20). What it USED to do
// wrong is stay silent: a pass slower than its interval made every later tick
// return with no log, no counter and no alert, so payment reconcile could simply
// stop happening and nobody would find out until a player complained.
//
// A skip is not itself a fault — one slow pass is normal. A RUN of skips means the
// pass no longer fits its interval, which is the thing worth knowing. So: count
// every skip, log each one, and raise a WATCHED compliance alert once a single
// overrun has swallowed OVERRUN_ALERT_SKIPS consecutive ticks.
const OVERRUN_ALERT_SKIPS = 5; // 5 × TICK_MS (60s) ≈ payment reconcile stalled ~5 minutes
/** The single lease name for the lifecycle chores. See `leader.ts`. */
export const LIFECYCLE_TASK = "lifecycle";
let notLeaderTicks = 0;        // consecutive ticks spent on standby, for the log only
let skippedPasses = 0;         // consecutive, reset on every completed pass
let skippedTotal = 0;          // lifetime, for the health probe
let passStartedAt = 0;         // epoch ms of the in-flight pass, 0 when idle
let overrunAlerted = false;    // one alert per overrun, not one per tick

/** Ticker health — surfaced by /api/health so a stall is visible without log-diving. */
export function lifecycleTickerHealth(): {
  running: boolean;
  runningForMs: number;
  skippedConsecutive: number;
  skippedTotal: number;
} {
  return {
    running,
    runningForMs: running && passStartedAt ? Date.now() - passStartedAt : 0,
    skippedConsecutive: skippedPasses,
    skippedTotal,
  };
}

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

/**
 * The same lane for money going OUT — added 2026-07-29 after a real payout sat
 * PROCESSING for over half an hour with nothing re-querying it, because the
 * 30-minute stale sweep was the only thing that asked. Deposits had had a fast lane
 * since July; payouts had none, and the asymmetry only showed once real money left.
 *
 * `settleConfirmedWithdrawals` can only CONFIRM — never fail, never reverse — so
 * running it every 15s cannot turn a slow payout into a reversed one. See its header.
 */
async function fastSettleInFlightPayouts(): Promise<void> {
  const { settleConfirmedWithdrawals } = await import("./wallet-service");
  const r = await settleConfirmedWithdrawals();
  if (r.confirmed) console.log(`[lifecycle] fast-settled ${r.confirmed} of ${r.checked} in-flight payout(s)`);
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

// ── Per-market scheduler reconcile (self-healing backstop, ~5-min cadence) ───
// Market transitions — closing-soon, selection-closed, resolve, settle — are now
// driven by PER-MARKET timers (market-scheduler.ts): armed on create/resolve,
// hydrated at boot, re-armed after every fire. Nothing is swept on a fixed cadence
// any more. This reconcile is the ONLY market work the ticker still does, and it
// exists purely to HEAL: every ~5 minutes it re-arms any pending market that has no
// live timer (dropped by an error, created during a brief scheduler outage) and
// fires anything already past a deadline. Bounded to a targeted indexed query.
const SCHEDULE_RECONCILE_EVERY_MS = 5 * 60 * 1000;
let lastScheduleReconcileAt = 0;

async function maybeReconcileSchedules(): Promise<void> {
  const now = Date.now();
  if (now - lastScheduleReconcileAt < SCHEDULE_RECONCILE_EVERY_MS) return;
  lastScheduleReconcileAt = now;
  const r = await reconcileMarketSchedules();
  if (r.healed > 0) console.log(`[lifecycle] scheduler reconcile — re-armed ${r.healed} of ${r.pending} pending market timer(s)`);
  // The same healing for Up & Down chains, which run on their own timers. Separate
  // call (not folded into the above) because the two schedulers are deliberately
  // independent — one failing must not stop the other being healed.
  try {
    const { reconcileUpDownChains } = await import("./updown-scheduler");
    const u = await reconcileUpDownChains();
    if (u.healed > 0) console.log(`[lifecycle] Up & Down reconcile — re-armed ${u.healed} of ${u.running} chain timer(s)`);
  } catch (e) {
    console.error("[lifecycle] Up & Down reconcile:", e);
  }

  // ℹ️ MERGE NOTE (2026-08-01). A SECOND Up & Down heal sweep (`resolveOverdueRounds`) was
  // called from here by `feat/updown-source-pinning-and-proposals`, which had independently
  // found E-24. The automatic merge kept both, so the ticker briefly ran two sweeps over the
  // same rows every minute. There is now exactly one — `healUpDownRounds()` below, driven
  // from `runLifecyclePass`. See the merge note in updown-service.ts for why that one won.
}

/**
 * Up & Down orphan healer (finding E-24 — a stake could enter a round and have NO
 * path out). Dynamically imported for the same reason the chain reconcile above is:
 * the Up & Down subsystem must not be pulled into this module's static graph.
 *
 * ⚠️ This is a MONEY path, not a tidy-up. What it releases is a real player's stake,
 * so it is on the once-a-minute pass rather than the 5-minute sweep. See
 * `healStuckRounds` in updown-service.ts for the invariant it enforces.
 *
 * ⚠️ THIS IS THE SLOWEST CHORE IN THE PASS, and the most likely trigger of a
 * `lifecycle.ticker_overrun` alert. Its cost is dominated by how many distinct boundaries
 * one batch observes — each observation is one network price read. With the FEED reader
 * (~1s each) that sits comfortably inside TICK_MS; with the AI reader (tens of seconds
 * each) a full batch can exceed the 60s tick and start swallowing ticks. Chasing an
 * overrun alert? Look here first — and lower `HEAL_BATCH` rather than widening the tick.
 * A slow heal is acceptable; a stalled payment reconcile is not.
 */
async function healUpDownRounds(): Promise<void> {
  const { healStuckRounds } = await import("./updown-service");
  await healStuckRounds();
}

/** Run one lifecycle pass. Each chore is self-contained and best-effort; one
 *  failing must never stop the others or throw out of the tick.
 *
 *  Market resolution + settlement are NOT here — they are timer-driven now (see
 *  market-scheduler.ts). All that remains on the ticker are the non-market chores
 *  (bonus expiry, payment reconcile, trial balance) plus the schedule reconciler
 *  that heals any lost per-market timer. */
export async function runLifecyclePass(): Promise<void> {
  if (running) {
    // Never overlap passes — but never do it silently either. See the header on
    // OVERRUN_ALERT_SKIPS: the guard is right, the old silence was the bug.
    skippedPasses += 1;
    skippedTotal += 1;
    const heldMs = passStartedAt ? Date.now() - passStartedAt : 0;
    console.warn(
      `[lifecycle] SKIPPED pass — previous still running for ${Math.round(heldMs / 1000)}s ` +
        `(consecutive=${skippedPasses}, total=${skippedTotal}). Payment reconcile and trial ` +
        `balance did not run this tick.`,
    );
    if (skippedPasses >= OVERRUN_ALERT_SKIPS && !overrunAlerted) {
      overrunAlerted = true; // one alert per overrun episode, not one per tick
      // Best-effort and deliberately last: an alert that throws must not become a
      // second failure on top of the one it is reporting.
      // COMPLIANCE, not SYSTEM — the same category the trial-balance drift alert
      // uses, because this is the alert that says the trial balance ISN'T RUNNING.
      // An officer watching one must see the other.
      void audit({
        category: "COMPLIANCE",
        action: "lifecycle.ticker_overrun",
        actorId: null,
        targetType: null,
        targetId: null,
        payload: {
          skippedConsecutive: skippedPasses,
          skippedTotal,
          inFlightSeconds: Math.round(heldMs / 1000),
          intervalMs: TICK_MS,
          stalled: ["payment reconcile", "wallet↔ledger trial balance", "bonus expiry", "schedule reconcile"],
          note: "Lifecycle pass has overrun its interval. Settlement timeliness cannot be trusted until this clears.",
        },
      }).catch(() => {});
    }
    return;
  }

  // ── ONE container runs these chores, not one per container ─────────────────
  //
  // 🔴 The guard above is a module-local boolean: correct for one process, meaningless
  // across two. A second Railway replica would run payment reconcile, bonus expiry,
  // schedule reconcile and the trial balance on its own timer, concurrently with the
  // first — two containers re-querying the same in-flight payments and acting on the
  // answers. Production runs one container today; nothing stopped it being scaled to two,
  // and the failure would have been silent and intermittent.
  //
  // Fails CLOSED: if the lease cannot be read, this pass is skipped rather than run
  // blind. A missed tick costs 60 seconds; a doubled payment reconcile costs money.
  if (!(await acquireLeadership(LIFECYCLE_TASK))) {
    notLeaderTicks += 1;
    // Every tick would be noise on a standby container. Say it once a minute at first,
    // then hourly — enough to prove the mechanism is working without flooding the log.
    if (notLeaderTicks <= 3 || notLeaderTicks % 60 === 0) {
      console.log(`[lifecycle] not the leader — chores skipped (${notLeaderTicks} ticks). Another instance holds the lease.`);
    }
    return;
  }
  if (notLeaderTicks > 0) {
    console.log(`[lifecycle] took leadership after ${notLeaderTicks} standby tick(s).`);
    notLeaderTicks = 0;
  }

  running = true;
  passStartedAt = Date.now();
  try {
    // Heal any pending market that lost its per-market timer (idempotent — every
    // transition re-checks its stamp under the market lock, so racing a live timer
    // can never double-notify or double-pay).
    await maybeReconcileSchedules().catch((e) => console.error("[lifecycle] schedule reconcile:", e));

    // ── Up & Down: release any stake stuck in a round with no path out (E-24) ──
    // EVERY tick, not the 5-minute reconcile cadence, and deliberately NOT folded
    // into it: the retry ladder it drives is measured in seconds (15/45/120), and a
    // 5-minute sweep would silently coarsen it. The healer is cheap when there is
    // nothing to do — one indexed read that returns no rows — and it only ever calls
    // the paid price oracle when a specific round's backoff is genuinely due.
    // Its own catch, because a stranded player's money must not depend on bonus
    // expiry or the payment sweep having succeeded first.
    await healUpDownRounds().catch((e) => console.error("[lifecycle] Up & Down round heal:", e));

    await expireActiveGrants().catch((e) => console.error("[lifecycle] bonus expiry:", e));
    // NOTE: the deposit fast-credit lane is deliberately NOT called here. It has its
    // own 15s timer (see startLifecycleTicker). Calling it from both meant two
    // concurrent passes every 60s — the overlap guard only covers the dedicated
    // timer — which doubled the gateway calls and wrote duplicate
    // payments.fast_credit audit rows. Observed in production 2026-07-20 12:49:47.
    await maybePaymentSweeps().catch((e) => console.error("[lifecycle] payment sweeps:", e));
    await maybeReconcileLedger().catch((e) => console.error("[lifecycle] trial balance:", e));
  } finally {
    // A completed pass ends the overrun: clear the consecutive count and re-arm the
    // alert so the NEXT episode is reported too. `skippedTotal` is lifetime and is
    // deliberately not reset — it is the only evidence a past stall ever happened.
    if (skippedPasses > 0) {
      console.log(`[lifecycle] pass completed — overrun cleared after ${skippedPasses} skipped tick(s)`);
    }
    skippedPasses = 0;
    overrunAlerted = false;
    passStartedAt = 0;
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
  console.log(`[lifecycle] payment fast poll (deposits + payouts) — every ${DEPOSIT_POLL_MS / 1000}s`);

  // Hand the lease back on a clean shutdown. Without this a redeploying container keeps
  // it until it expires, so the replacement stands idle for up to LEASE_MS with payment
  // reconcile not running — a self-inflicted stall on every deploy. Registered once, and
  // `once` so repeated signals cannot stack listeners.
  const handOver = (sig: string) => {
    console.log(`[lifecycle] ${sig} — releasing the leader lease so the next instance can take over immediately.`);
    void releaseLeadership(LIFECYCLE_TASK);
  };
  process.once("SIGTERM", () => handOver("SIGTERM"));
  process.once("SIGINT", () => handOver("SIGINT"));
}

/** Poll in-flight deposits. Guarded against overlap: a slow provider must not
 *  stack up polls, which at this cadence would otherwise pile on. */
let depositPolling = false;
async function runDepositPoll(): Promise<void> {
  if (depositPolling) return;
  depositPolling = true;
  try {
    await fastCreditInFlightDeposits();
    // Payouts run in the SAME guarded pass, sequentially — not on a second timer.
    // One overlap guard covers both lanes, so a stalled provider can never let two
    // passes stack up and double the gateway calls (the 2026-07-20 duplicate
    // fast_credit incident is what that guard exists for). Its own try/catch:
    // a failing deposit lane must not silently take the payout lane with it.
    await fastSettleInFlightPayouts().catch((e) => console.error("[lifecycle] payout poll:", e));
  } catch (e) {
    console.error("[lifecycle] deposit poll:", e);
    // The deposit lane threw before reaching the payouts above — run them anyway.
    await fastSettleInFlightPayouts().catch((err) => console.error("[lifecycle] payout poll:", err));
  } finally {
    depositPolling = false;
  }
}
