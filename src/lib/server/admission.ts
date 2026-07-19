/**
 * Bet admission control — a bet must NEVER fail because the platform is busy.
 *
 * The owner's requirement, verbatim: "even if bettors wait a bit, maybe seconds
 * — failing is not acceptable… finalize this forever, with 10 users or millions."
 *
 * WHY THIS EXISTS
 * Every bet holds one pooled connection for its whole transaction (see locks.ts).
 * With no gate, N concurrent bets each grab a connection, the pool empties, and
 * the surplus fails with a RAW Prisma P2024 in the player's face. Measured on
 * real Postgres: at pool 5, twenty concurrent bets produced twenty failures and
 * zero positions — a 100% failure rate the player experienced as "your bet
 * didn't go through" (docs/LOAD_DAY1_FINDINGS.md, Finding A).
 *
 * A queue converts that into waiting. Bets beyond `maxInFlight` line up FIFO and
 * are admitted as slots free, so load becomes latency instead of errors.
 *
 * THE TWO TIERS ARE DELIBERATE
 * A wait budget ALONE is not enough: if everyone queues and the budget is the
 * only limit, everyone waits the full budget and THEN everyone fails — the worst
 * of both worlds (slow AND broken). So there are two independent limits:
 *   • maxQueue  — refuse immediately when the queue is already hopeless. A fast,
 *                 honest "we're full" beats a 15-second wait for the same answer.
 *   • maxWaitMs — the ceiling on how long an admitted waiter will hold on.
 *
 * INVARIANTS (each one is load-bearing; a test in bet-admission.test.mts pins it)
 *  1. maxInFlight < pool, always. The gate must leave connections spare for the
 *     un-threaded reads on the bet path and for every non-bet request (login,
 *     wallet, admin). Clamped server-side; an operator cannot misconfigure this
 *     into the failure it exists to prevent.
 *  2. NON-REENTRANT. settleMarket → bonus refund → buyPosition-adjacent paths can
 *     re-enter; a re-entrant acquire would wait for a slot its own caller holds
 *     and deadlock the platform. A nested acquire passes straight through.
 *  3. The slot is taken OUTSIDE any transaction and released in `finally`, on
 *     every path including throw. A leaked slot permanently shrinks capacity.
 *  4. Redis is NEVER on this path. Admission is in-process and synchronous by
 *     design — a Redis hiccup must not be able to stop bets. Telemetry is
 *     exported for the operator card, but nothing here awaits a network call.
 *     Still true after Redis landed (2026-07-19): this file imports no client,
 *     and the bet-path rate-limit checks in market-service deliberately stayed
 *     on the synchronous in-memory bucket so nothing inside a slot can block on
 *     a socket. Enforced by a test in scripts/redis-failopen.test.mts.
 */

import { AsyncLocalStorage } from "node:async_hooks";
import { captureServerError } from "./monitoring";

/* ── Configuration ───────────────────────────────────────────────────────── */

/** Mirrors prisma.ts: connection_limit, overridable by env. */
function poolSize(): number {
  const n = Number(process.env.PRISMA_CONNECTION_LIMIT);
  return Number.isFinite(n) && n > 0 ? n : 20;
}

export type AdmissionLimits = {
  maxInFlight: number;
  maxQueue: number;
  maxWaitMs: number;
};

/**
 * Clamp to something that cannot take the platform down. `maxInFlight` is capped
 * at pool-2 so there is ALWAYS headroom for non-bet traffic — an operator who
 * types 500 into the admin card gets pool-2, not an outage.
 */
export function clampLimits(raw: Partial<AdmissionLimits>): AdmissionLimits {
  const pool = poolSize();
  const ceiling = Math.max(1, pool - 2);
  const wanted = Number(raw.maxInFlight);
  const maxInFlight = Math.min(ceiling, Math.max(1, Number.isFinite(wanted) ? wanted : pool - 4));
  const q = Number(raw.maxQueue);
  const w = Number(raw.maxWaitMs);
  return {
    maxInFlight,
    maxQueue: Math.min(10_000, Math.max(0, Number.isFinite(q) ? q : 500)),
    maxWaitMs: Math.min(60_000, Math.max(0, Number.isFinite(w) ? w : 15_000)),
  };
}

let limits: AdmissionLimits = clampLimits({});

/** Applied by the admin config loader; always re-clamped. */
export function setAdmissionLimits(raw: Partial<AdmissionLimits>): AdmissionLimits {
  limits = clampLimits(raw);
  return limits;
}
export function getAdmissionLimits(): AdmissionLimits {
  return limits;
}

/* ── State ───────────────────────────────────────────────────────────────── */

type Waiter = {
  resolve: (admitted: boolean) => void;
  timer: ReturnType<typeof setTimeout> | null;
  enqueuedAt: number;
  settled: boolean;
};

type AdmissionState = {
  inFlight: number;
  queue: Waiter[];
  admitted: number;
  shed: number;
  timedOut: number;
  waits: number[]; // recent admitted wait times (ms), bounded ring
};

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_ADMISSION: AdmissionState | undefined;
}
const st: AdmissionState = globalThis.__50PICK_ADMISSION ?? (globalThis.__50PICK_ADMISSION = {
  inFlight: 0, queue: [], admitted: 0, shed: 0, timedOut: 0, waits: [],
});

const WAIT_SAMPLES = 500;
function recordWait(ms: number): void {
  st.waits.push(ms);
  if (st.waits.length > WAIT_SAMPLES) st.waits.shift();
}

/** Marks "a slot is already held on this async context" — invariant 2. */
const reentrancy = new AsyncLocalStorage<true>();

/* ── Core ────────────────────────────────────────────────────────────────── */

function settle(w: Waiter, admitted: boolean): boolean {
  if (w.settled) return false;
  w.settled = true;
  if (w.timer) clearTimeout(w.timer);
  w.resolve(admitted);
  return true;
}

/** Hand the freed slot to the longest-waiting caller (FIFO — no barging). */
function releaseSlot(): void {
  for (;;) {
    const next = st.queue.shift();
    if (!next) { st.inFlight--; return; }
    if (settle(next, true)) {
      // inFlight is NOT decremented — the slot transfers directly to `next`,
      // which is what stops a fresh arrival barging past the queue.
      recordWait(Date.now() - next.enqueuedAt);
      st.admitted++;
      return;
    }
    // Already timed out while we held it — try the next one.
  }
}

/** Thrown when the platform is saturated. Mapped to a BUSY rejection, never raw. */
export class AdmissionBusy extends Error {
  constructor(readonly kind: "shed" | "timeout", readonly waitedMs: number) {
    super(kind === "shed" ? "admission: queue full" : "admission: wait budget exceeded");
  }
}

/**
 * Run `fn` under admission control.
 *
 * Throws AdmissionBusy when the platform cannot take the work within budget —
 * the ONLY failure this adds, and the caller maps it to a retryable BUSY the
 * player sees as "we're holding your place", never a raw database error.
 */
export async function withAdmission<T>(fn: () => Promise<T>): Promise<T> {
  // Invariant 2 — a nested acquire would wait on a slot its own caller holds.
  if (reentrancy.getStore()) return fn();

  const { maxInFlight, maxQueue, maxWaitMs } = limits;
  const startedAt = Date.now();

  if (st.inFlight < maxInFlight) {
    st.inFlight++;
    st.admitted++;
    recordWait(0);
  } else {
    if (st.queue.length >= maxQueue || maxWaitMs <= 0) {
      st.shed++;
      void captureServerError(new AdmissionBusy("shed", 0), {
        where: "admission", inFlight: st.inFlight, queueDepth: st.queue.length, maxInFlight, maxQueue,
      });
      throw new AdmissionBusy("shed", 0);
    }
    const admitted = await new Promise<boolean>((resolve) => {
      const w: Waiter = { resolve, timer: null, enqueuedAt: startedAt, settled: false };
      w.timer = setTimeout(() => {
        const i = st.queue.indexOf(w);
        if (i >= 0) st.queue.splice(i, 1);
        if (settle(w, false)) st.timedOut++;
      }, maxWaitMs);
      st.queue.push(w);
    });
    if (!admitted) {
      const waited = Date.now() - startedAt;
      void captureServerError(new AdmissionBusy("timeout", waited), {
        where: "admission", waitedMs: waited, inFlight: st.inFlight, queueDepth: st.queue.length, maxWaitMs,
      });
      throw new AdmissionBusy("timeout", waited);
    }
  }

  // Invariant 3 — released on EVERY exit path, including a throw from fn().
  try {
    return await reentrancy.run(true, fn);
  } finally {
    releaseSlot();
  }
}

/* ── Telemetry (operator card / GET /api/admin/admission) ─────────────────── */

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[i];
}

export type AdmissionSnapshot = {
  inFlight: number;
  queueDepth: number;
  admitted: number;
  shed: number;
  timedOut: number;
  waitP50: number;
  waitP95: number;
  waitP99: number;
  limits: AdmissionLimits;
  poolSize: number;
};

export function admissionSnapshot(): AdmissionSnapshot {
  const sorted = [...st.waits].sort((a, b) => a - b);
  return {
    inFlight: st.inFlight,
    queueDepth: st.queue.length,
    admitted: st.admitted,
    shed: st.shed,
    timedOut: st.timedOut,
    waitP50: percentile(sorted, 50),
    waitP95: percentile(sorted, 95),
    waitP99: percentile(sorted, 99),
    limits,
    poolSize: poolSize(),
  };
}

/** Test-only: reset counters and state between suites. */
export function __resetAdmission(): void {
  for (const w of st.queue.splice(0)) settle(w, false);
  st.inFlight = 0; st.admitted = 0; st.shed = 0; st.timedOut = 0; st.waits = [];
}
