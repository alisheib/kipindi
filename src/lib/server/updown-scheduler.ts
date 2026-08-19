/**
 * Up & Down scheduler — ONE timer per CHAIN, not per round.
 *
 * Mirrors the proven shape of `market-scheduler.ts` (precise timers, boot hydrate,
 * self-healing reconcile) with two deliberate differences:
 *
 *  1. PER CHAIN, NOT PER ROUND. A chain emits a round every few minutes; arming a
 *     timer per round would mean hundreds of thousands of timers a year for no gain.
 *     A chain's boundaries are DERIVED (`anchor + k·duration`), so one timer that
 *     re-arms itself is exact and cannot drift.
 *
 *  2. ITS OWN FIRE GATE. Deliberately NOT `withFireSlot` from market-scheduler. The
 *     5-, 15- and 30-minute chains all land on :00, :15 and :30, so Up & Down bursts
 *     at predictable instants — and a long-form market settlement that happens to fall
 *     on the same second must never queue behind it, nor vice versa. Two products, two
 *     gates, neither able to starve the other.
 *
 * ⛔ Up & Down rounds are EXCLUDED from the per-market scheduler (`nextDeadlineFor`
 * skips them and `marketStore.pending()` defaults to `"MARKET"`). Two engines racing
 * the same row is a money hazard. Do not "unify" these schedulers.
 *
 * Correctness under concurrency: the scheduler never moves money. Every fire calls
 * `advanceChain`, whose transitions take the market lock and re-check their own stamps,
 * so a duplicate fire, a reconciler racing a timer, or two instances all collapse to
 * exactly one transition.
 */
import { chainStore } from "./updown-dal";
import { advanceChain } from "./updown-service";
import { boundaryAfter } from "./updown-config";
// ⭐ §7.4's alarm has to OUTLIVE the log buffer. `captureServerError` writes to the audit
// chain (always on, on-box, durable, deduped) and to Sentry when a DSN is configured, and it
// never throws — see its own header. A console line alone is what the outage already had.
import { captureServerError } from "./monitoring";

const MAX_TIMEOUT_MS = 2_147_483_647; // setTimeout's signed-32-bit ceiling (~24.8 days)
const BOOT_GRACE_MS = 20_000;         // a boundary missed while DOWN fires after this
const FIRE_RETRY_MS = 30_000;         // back-off when a fire throws

/**
 * ⭐ HOW MANY IDENTICAL FIRE FAILURES BEFORE THE LOG STOPS WHISPERING AND SAYS "STALLED".
 *
 * 🔴 THE REASON THIS EXISTS IS A LIVE OUTAGE NOBODY WAS TOLD ABOUT
 * (`docs/FAILURE-INVENTORY.md` §7.4, filed 2026-08-15 as `50c3a282`). Two chains failed
 * `fire` on EVERY tick for days with the same error, and the filing's own sharpest line is
 * not about the bug: *"a permanent error retried silently is indistinguishable from a healthy
 * idle chain"*. It was found only because someone happened to read `railway logs` while
 * verifying an unrelated deploy.
 *
 * ⛔ AND "IT WAS IN THE LOGS" IS NOT OBSERVABILITY. The old line was one
 * `console.error` per failure, identical every 30 seconds and indistinguishable from a
 * transient — 60 consecutive copies in the sample that found it. Nothing said "this has
 * happened 60 times", which is the single fact that separates a blip from an outage.
 *
 * ⚠️ THREE, not one: a redeploy racing a boundary, or a database blip, genuinely does fail a
 * fire once or twice, and an alarm that cries wolf gets filtered out by the person reading
 * it. Three identical failures spans ~90s of retries and cannot be a transient.
 */
const FIRE_ALARM_AFTER = 3;

/**
 * Consecutive fire failures per chain — in memory, deliberately.
 *
 * ⚠️ NOT PERSISTED, and that is a real limitation stated rather than hidden: a restart clears
 * it, so the count answers "is this chain failing NOW" and not "how many times since
 * Tuesday". Persisting it would mean a migration and a write on every failed fire — a write
 * on the error path, which is the path least able to afford one. The durable record of a
 * stalled chain is its own `nextBoundaryAt` sitting in the past, which is what
 * `scripts/live/ops/chain-stall-census.cjs` reads and what the admin console now flags.
 */
export type FireFailure = { count: number; firstAt: number; lastError: string; sameThroughout: boolean };
const fireFailures = new Map<string, FireFailure>();

/**
 * Fold one more failure into a chain's record. PURE, so the alarm is provable without a
 * timer, a clock or a database.
 *
 * ⛔ WHY IT IS EXTRACTED. Reached only through `fireChain`, this rule needs a real
 * `setTimeout`, a real failing transition and 90 seconds of wall clock to observe once — so it
 * would have shipped untested, which for the alarm on a SILENT outage is the wrong place to
 * take that risk. §7 of `test:updown-tick-cadence` drives it directly.
 *
 * ⚠️ `firstAt` is carried from the FIRST failure, never restamped: the alarm's value is the
 * WINDOW ("3 failures over 92s"), and restamping would make every stall look one tick old.
 *
 * ⚠️ A DIFFERENT error still counts. §7.4 asked for N *identical* failures, and identical is
 * what `sameThroughout` reports — but a chain alternating between two permanent errors is just
 * as dead as one repeating a single error, and a counter that reset on any difference would
 * never reach the threshold. Count everything; SAY whether it was the same.
 */
export function foldFireFailure(prev: FireFailure | undefined, msg: string, nowMs: number): FireFailure {
  return prev
    ? { count: prev.count + 1, firstAt: prev.firstAt, lastError: msg, sameThroughout: prev.sameThroughout && prev.lastError === msg }
    : { count: 1, firstAt: nowMs, lastError: msg, sameThroughout: true };
}

/**
 * Does this failure earn a DURABLE record (audit chain + Sentry), as opposed to a log line?
 *
 * On the crossing, then every 20th — so at a 30s back-off the first alarm lands ~90s in and
 * re-asserts about every ten minutes. ⛔ Alarming on EVERY failure would rebuild the exact
 * stream §7.4 was lost in: 1,003 identical lines that nobody could tell from a blip.
 */
export function fireAlarmDue(count: number, alarmAfter: number = FIRE_ALARM_AFTER): boolean {
  return count === alarmAfter || (count > alarmAfter && count % 20 === 0);
}

/**
 * ⛔ THE BUSY-WAIT FLOOR. A chain whose boundary is already in the past may never be re-armed
 * at 0 ms.
 *
 * 🔴 MEASURED ON PRODUCTION, 2026-08-14. Two branches of `advanceChain` deliberately decline
 * to move `nextBoundaryAt` — the bar for this boundary has not published yet (retry THIS
 * boundary, which is correct and is why the round opens at all), and the market-hours closure.
 * On both, `fireChain`'s `finally` re-armed with `minDelayMs: 0`, `armChain` saw a boundary in
 * the past and computed `delay = 0`, and the chain re-fired immediately. Fire → decline →
 * re-arm at 0 → fire, as fast as the database could answer, for the whole ~90–130 s a bar
 * takes to appear, on EVERY boundary of EVERY chain.
 *
 * What that cost, from `pg_stat_database` and the live log stream:
 *   · **2,269 transactions/sec and 20,105 rows returned/sec** on a platform with 75 users.
 *   · 6 chains × ~1.15 fires/sec each, sustained, every one of them producing nothing.
 *   · 150 samples of `pg_stat_activity` caught only Up & Down scheduler statements. Nothing else.
 *   · ⛔ And the log showed HALF of it: `fireChain` logs only when the observation reads
 *     `pending`, so the three gold chains — pinned since 2026-08-10, session-closed, returning
 *     above that log line — turned the same loop in total silence.
 *
 * ⭐ IT BOUGHT NOTHING. The provider is gated by the observation backoff ladder (E-86), so the
 * extra fires never re-read the price: they returned `waiting Ns before attempt N+1` and threw
 * away a database round-trip each time. Measured on the live tape, a BTC 5-minute round's bar
 * publishes at ~+90 s and the round opened at +91 s — with ~450 fires. Under the ladder hint
 * below it opens at +91 s with 6. The cadence of the game is unchanged; only the waste is gone.
 *
 * This is the backstop, not the cadence. The real spacing comes from `retryAfterMs`, which
 * `advanceChain` derives from the same ladder `acquireObservation` gates reads with — one
 * source of truth, so the scheduler cannot drift out of step with the reader.
 */
export const REFIRE_FLOOR_MS = 1_000;

/**
 * When should this chain's timer fire? Pure, so the busy-wait is provable without a clock.
 *
 * ⛔ `graceOnPast` is the BOOT path (a boundary missed while the server was down) and keeps its
 * own, longer grace. Collapsing the two would make a restart hammer every chain at once.
 */
export function nextFireDelayMs(o: {
  nextBoundaryMs: number;
  nowMs: number;
  graceOnPast?: boolean;
  minDelayMs?: number;
}): number {
  const raw = o.nextBoundaryMs - o.nowMs;
  // ⛔ NOT `: 0`. That was the defect. A boundary at or before now cannot produce a different
  // answer if we ask again in the same millisecond.
  let delay = raw > 0 ? raw : (o.graceOnPast ? BOOT_GRACE_MS : REFIRE_FLOOR_MS);
  if (o.minDelayMs) delay = Math.max(delay, o.minDelayMs);
  return delay;
}

function enabled(): boolean {
  return process.env.UPDOWN_SCHEDULER !== "false";
}

// ── Fire gate (separate from the market scheduler's, on purpose) ─────────────
const MAX_CONCURRENT = Math.max(
  1,
  Number.parseInt(process.env.UPDOWN_SCHEDULER_CONCURRENCY || "3", 10) || 3,
);
let inFlight = 0;
const waiters: Array<() => void> = [];

async function acquire(): Promise<() => void> {
  // `while`, not `if`: a woken waiter must RE-CHECK, or two released in the same tick
  // both proceed and the cap silently doubles.
  while (inFlight >= MAX_CONCURRENT) {
    await new Promise<void>((r) => waiters.push(r));
  }
  inFlight++;
  let released = false;
  return () => {
    if (released) return; // idempotent — a double release would corrupt the count
    released = true;
    inFlight--;
    waiters.shift()?.();
  };
}

/** Run `fn` holding a fire slot; released on every path including a throw. */
export async function withChainSlot<T>(fn: () => Promise<T>): Promise<T> {
  const release = await acquire();
  try {
    return await fn();
  } finally {
    release();
  }
}

/** Observability for the admin health readout and the concurrency test. */
export function chainGateState(): { inFlight: number; queued: number; max: number } {
  return { inFlight, queued: waiters.length, max: MAX_CONCURRENT };
}

// ── The registry — one live timer per chain id, on globalThis (survives HMR) ──
type Entry = { timeout: ReturnType<typeof setTimeout>; at: number };

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_UPDOWN_TIMERS: Map<string, Entry> | undefined;
}
const timers: Map<string, Entry> =
  globalThis.__50PICK_UPDOWN_TIMERS ?? (globalThis.__50PICK_UPDOWN_TIMERS = new Map());

/** Cancel a chain's timer. Safe on an unknown id. */
export function disarmChain(id: string): void {
  const e = timers.get(id);
  if (e) { clearTimeout(e.timeout); timers.delete(id); }
}

/** Cancel every timer (tests/ops). Does not touch chain state. */
export function disarmAllChains(): void {
  for (const e of timers.values()) clearTimeout(e.timeout);
  timers.clear();
}

/**
 * Arm (or re-arm) a chain's single timer for its next boundary.
 *
 * Reads the row fresh so it always schedules against committed state. Idempotent — it
 * disarms any existing timer first, so a double-arm cannot double-fire.
 */
export async function armChain(id: string, opts?: { graceOnPast?: boolean; minDelayMs?: number }): Promise<void> {
  if (!enabled()) return;
  const chain = await chainStore.get(id);
  if (!chain || chain.state !== "RUNNING") { disarmChain(id); return; }

  const anchorMs = Date.parse(chain.gridAnchorAt);
  if (!Number.isFinite(anchorMs)) { disarmChain(id); return; }

  // DERIVED, never accumulated: recompute from the anchor every time, so a late fire
  // or a restart cannot shift the grid.
  const nextMs = chain.nextBoundaryAt
    ? Date.parse(chain.nextBoundaryAt)
    : boundaryAfter(anchorMs, chain.durationMinutes, Date.now());

  disarmChain(id);

  const now = Date.now();
  const delay = nextFireDelayMs({
    nextBoundaryMs: nextMs, nowMs: now,
    graceOnPast: opts?.graceOnPast, minDelayMs: opts?.minDelayMs,
  });

  const hop = delay > MAX_TIMEOUT_MS;
  const timeout = setTimeout(() => {
    if (hop) void armChain(id, opts);
    else void fireChain(id);
  }, Math.max(0, Math.min(delay, MAX_TIMEOUT_MS)));
  // Don't hold a test/CLI process open (harmless on the server, whose HTTP listener
  // keeps the loop alive regardless).
  (timeout as { unref?: () => void }).unref?.();
  // ⛔ WHEN IT WILL FIRE, NOT WHICH BOUNDARY IT IS FOR. `at` feeds the admin console's
  // "next fire" readout, and storing the boundary meant a chain pinned to a stale instant
  // reported a next fire in the PAST — an operator reading that sees a scheduler that has
  // stopped, whether or not it has. The two agree whenever the boundary is ahead of now,
  // which is why the difference stayed invisible until three chains were not.
  timers.set(id, { timeout, at: now + delay });
}

/** Fire one chain's boundary transition, then re-arm for the next. */
async function fireChain(id: string): Promise<void> {
  timers.delete(id); // this timer has fired; a fresh one is armed in `finally`
  if (!enabled()) return;
  let retryMs = 0;
  try {
    const chain = await chainStore.get(id);
    if (!chain || chain.state !== "RUNNING") return; // paused/stopped between arm and fire
    // Bound how many chains hold a DB transaction at once (see the gate above).
    await withChainSlot(async () => {
      // Re-read under the slot: an operator may have paused the chain while we queued.
      const fresh = await chainStore.get(id);
      if (!fresh || fresh.state !== "RUNNING") return;
      const r = await advanceChain(id);
      // ⛔ CLEARED ONLY BY A FIRE THAT ACTUALLY COMPLETED. Clearing it in `finally` — or on
      // any of the early returns above — would reset the count on the very paths a stalled
      // chain takes, and the alarm could then never reach its threshold.
      fireFailures.delete(id);
      // The one branch that leaves the boundary alone says when it is worth asking again.
      // ⛔ `max`, so a throw's back-off can never be SHORTENED by a hint from a healthy call.
      if (r.retryAfterMs != null) retryMs = Math.max(retryMs, r.retryAfterMs);
      if (r.observation === "pending") {
        console.log(`[updown] ${id} boundary pending — ${r.detail ?? "awaiting a confirmed reading"}` +
          (r.retryAfterMs != null ? ` — next attempt in ${Math.round(r.retryAfterMs / 1000)}s` : ""));
      }
    });
  } catch (e) {
    // ⭐ COUNT IT, AND SAY THE COUNT. See `FIRE_ALARM_AFTER` for why the count is the whole
    // point: the outage this replaces logged the same line 60 times and read as 60 blips.
    const msg = e instanceof Error ? e.message : String(e);
    const rec = foldFireFailure(fireFailures.get(id), msg, Date.now());
    fireFailures.set(id, rec);
    if (rec.count >= FIRE_ALARM_AFTER) {
      // ⛔ AND IT MUST LEAVE THE PROCESS. The §7.4 outage WAS logged — 1,003 lines of it —
      // and was still found only because somebody read `railway logs` for another reason.
      // A log line is not an alarm; a durable record with a count on it is.
      //
      // ⚠️ ON THE CROSSING, THEN EVERY 20th — not every fire. At a 30s back-off that is the
      // first alarm at ~90s and a re-assertion every ~10 minutes, so a stall that lasts days
      // stays visible without turning the sink into the same undifferentiated stream the
      // console already was.
      if (fireAlarmDue(rec.count)) {
        await captureServerError(e, {
          scope: "updown.chain.stalled", chainId: id,
          consecutiveFailures: rec.count,
          stalledForSeconds: Math.round((Date.now() - rec.firstAt) / 1000),
          sameErrorThroughout: rec.sameThroughout,
          note:
            "This chain has failed its boundary transition repeatedly and is producing no " +
            "rounds. A permanent error retried on a timer is indistinguishable from a healthy " +
            "idle chain, which is why this record exists (FAILURE-INVENTORY.md 7.4).",
        });
      }
      // ⛔ ONE LINE THAT NAMES THE COUNT, THE WINDOW AND THE VERDICT — because the person
      // reading it is scrolling a live log and will see exactly one line.
      console.error(
        `[updown] ⛔ CHAIN STALLED — ${id} has failed ${rec.count} consecutive fires over ` +
        `${Math.round((Date.now() - rec.firstAt) / 1000)}s` +
        `${rec.sameThroughout ? " with the SAME error every time" : " (the error varies)"}` +
        `: ${msg} — this chain is producing NO rounds. A permanent error retried is not a ` +
        `transient: fix it or stop the chain.`,
      );
    } else {
      console.error(`[updown] fire ${id} failed (${rec.count} of ${FIRE_ALARM_AFTER} before alarm):`, e);
    }
    retryMs = FIRE_RETRY_MS; // unknown error — back off; the reconciler is the net
  } finally {
    void armChain(id, { minDelayMs: retryMs });
  }
}

/**
 * Boot hydrate — arm every RUNNING chain, via an indexed query on
 * `[state, nextBoundaryAt]`. A boundary missed while the server was DOWN fires after a
 * short grace: delayed, never skipped.
 */
export async function hydrateUpDownOnBoot(): Promise<{ armed: number }> {
  if (!enabled()) {
    console.warn("[updown] UPDOWN_SCHEDULER=false — chain timers disabled");
    return { armed: 0 };
  }
  const running = await chainStore.running().catch(() => []);
  for (const c of running) await armChain(c.id, { graceOnPast: true });
  if (running.length > 0) console.log(`[updown] boot hydrate — armed ${running.length} chain timer(s)`);
  return { armed: running.length };
}

/**
 * Self-healing backstop, on the lifecycle ticker. Arms any RUNNING chain with no live
 * timer — one dropped by an error, or started while the scheduler was briefly down.
 * The ONLY sweep in this subsystem, and it exists purely to heal.
 */
export async function reconcileUpDownChains(): Promise<{ running: number; healed: number }> {
  if (!enabled()) return { running: 0, healed: 0 };
  const running = await chainStore.running().catch(() => []);
  let healed = 0;
  for (const c of running) {
    if (timers.has(c.id)) continue;
    await armChain(c.id, { graceOnPast: true });
    healed++;
  }
  if (healed > 0) console.log(`[updown] reconcile — re-armed ${healed}/${running.length} chain timer(s)`);
  return { running: running.length, healed };
}

/** Live health for the admin readout. */
export function getUpDownSchedulerHealth(): {
  armed: number;
  nextFireAt: string | null;
  entries: Array<{ chainId: string; at: string }>;
  gate: { inFlight: number; queued: number; max: number };
  /** Chains failing their fire repeatedly — §7.4's alarm, readable instead of grepped. */
  failing: Array<{ chainId: string; consecutive: number; sinceIso: string; sameError: boolean; lastError: string }>;
} {
  let min: number | null = null;
  const entries: Array<{ chainId: string; at: string }> = [];
  for (const [chainId, e] of timers.entries()) {
    entries.push({ chainId, at: new Date(e.at).toISOString() });
    if (min === null || e.at < min) min = e.at;
  }
  entries.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const failing = [...fireFailures.entries()]
    .map(([chainId, f]) => ({
      chainId, consecutive: f.count, sinceIso: new Date(f.firstAt).toISOString(),
      sameError: f.sameThroughout, lastError: f.lastError,
    }))
    .sort((a, b) => b.consecutive - a.consecutive);
  return {
    armed: timers.size,
    nextFireAt: min != null ? new Date(min).toISOString() : null,
    entries,
    gate: chainGateState(),
    failing,
  };
}

/** Test seam — the consecutive-failure counter is module state, so a suite must be able to
 *  clear it between cases and to read it without waiting for a real 30s retry. */
export function __resetUpDownFireFailures(): void { fireFailures.clear(); }

/**
 * Drive every due chain synchronously, with no timers. This is what tests call so they
 * exercise the exact code path the timers drive; production uses the timers plus the
 * reconciler, never this.
 */
export async function runDueChainTransitions(): Promise<{ advanced: number }> {
  const running = await chainStore.running().catch(() => []);
  let advanced = 0;
  for (const c of running) {
    const due = c.nextBoundaryAt ? Date.parse(c.nextBoundaryAt) <= Date.now() : true;
    if (!due) continue;
    await advanceChain(c.id);
    advanced++;
  }
  return { advanced };
}
