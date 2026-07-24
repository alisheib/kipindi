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

const MAX_TIMEOUT_MS = 2_147_483_647; // setTimeout's signed-32-bit ceiling (~24.8 days)
const BOOT_GRACE_MS = 20_000;         // a boundary missed while DOWN fires after this
const FIRE_RETRY_MS = 30_000;         // back-off when a fire throws

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

  const raw = nextMs - Date.now();
  let delay = raw <= 0 ? (opts?.graceOnPast ? BOOT_GRACE_MS : 0) : raw;
  if (opts?.minDelayMs) delay = Math.max(delay, opts.minDelayMs);

  const hop = delay > MAX_TIMEOUT_MS;
  const timeout = setTimeout(() => {
    if (hop) void armChain(id, opts);
    else void fireChain(id);
  }, Math.max(0, Math.min(delay, MAX_TIMEOUT_MS)));
  // Don't hold a test/CLI process open (harmless on the server, whose HTTP listener
  // keeps the loop alive regardless).
  (timeout as { unref?: () => void }).unref?.();
  timers.set(id, { timeout, at: nextMs });
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
      if (r.observation === "pending") {
        console.log(`[updown] ${id} boundary pending — ${r.detail ?? "awaiting a confirmed reading"}`);
      }
    });
  } catch (e) {
    console.error(`[updown] fire ${id} failed:`, e);
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
} {
  let min: number | null = null;
  const entries: Array<{ chainId: string; at: string }> = [];
  for (const [chainId, e] of timers.entries()) {
    entries.push({ chainId, at: new Date(e.at).toISOString() });
    if (min === null || e.at < min) min = e.at;
  }
  entries.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  return {
    armed: timers.size,
    nextFireAt: min != null ? new Date(min).toISOString() : null,
    entries,
    gate: chainGateState(),
  };
}

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
