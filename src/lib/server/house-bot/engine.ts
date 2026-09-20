/**
 * THE HOUSE-BOT ENGINE PROCESS — boot, timers, clock skew, back-pressure and shutdown (PLAN §4.2, 04 A4, A23, A24).
 *
 * This module owns WHEN the engine works, never WHAT it does: the poller's and the planner's passes are passed in
 * (`EngineTicks`), so the process shell is tested on its own and no timer ever runs an empty pass that would beat
 * a heartbeat for work nobody did.
 *
 * ⛔ STATE LIVES ON globalThis ONLY (04 A24, F7). Next.js can load this module twice in one container
 * (instrumentation and a route handler do not share a graph); two copies each starting timers would double every
 * claim. `__50PICK_HOUSE_BOT_ENGINE` is the one engine per process, and `startHouseBotEngine` is idempotent.
 *
 * ⛔ THE GATES BEFORE ANY TIMER, in order:
 *   1. `HOUSE_BOT_ENGINE=false` → no timers (the bet hook also returns before its import).
 *   2. `houseBotSchemaReady()` false → no timers; `/api/health` answers 503 (A23).
 *   3. The database `TimeZone` is not UTC → no timers (A4): every EAT key is computed from DB `now()`.
 *
 * ⛔ CLAIMS WAIT FOR A HEALTHY PROCESS (A24): none while stopping, none while the measured skew is unknown or over
 * 5 s, none while admission has a queue or half its in-flight slots taken, and never more than 2 fires at once.
 */
import { houseBotsLive } from "@/lib/feature-state";
import { INSTANCE_ID, acquireLeadership, leadershipSnapshot, releaseLeadership } from "../leader";
import type { EngineAlerts } from "./outcomes";
import { admissionSnapshot, type AdmissionSnapshot } from "../admission";
import { houseBotRuntimeStore } from "../house-bot-dal";
import { hasDatabase, prisma } from "../prisma";
import {
  CLAIM_SKEW_GUARD_MS,
  FIRST_TICK_DELAY_MS,
  HOUSE_BOT_ENGINE_ENV,
  HOUSE_PLANNER_TASK,
  MAX_FIRES_PER_PROCESS,
  MAX_TOLERATED_SKEW_MS,
  PLANNER_INTERVAL_MS,
  PLANNER_LEASE_MS,
  POLLER_INTERVAL_MS,
  POLLER_JITTER_MS,
  RUNTIME_KEY,
  SWEEP_INTERVAL_MS,
} from "@/lib/house-bot/constants";
import { houseBotSchemaReady } from "./schema-ready";

export const SKEW_MEASURE_INTERVAL_MS = 60_000;
export const UTC_ZONES = ["UTC", "Etc/UTC"] as const;

/**
 * ⛔ `FEATURE_WITHDRAWN` IS FIRST AMONG THESE, and its order is the decision: the PRODUCT state outranks
 * this instance's configuration, its schema and its clock (04 F2). A sunset must stop the timers on every
 * replica at once, whatever any one container's env happens to say.
 */
export type EngineRefusal = "FEATURE_WITHDRAWN" | "ENV_DISABLED" | "SCHEMA_NOT_READY" | "DB_TIMEZONE" | "BOOT_FAILED";

export type EngineState = {
  started: boolean;
  /** Set synchronously on SIGTERM; nothing new is claimed after it. */
  stopping: boolean;
  refused: EngineRefusal | null;
  bootAt: string | null;
  /** Intents this process is firing (poller and inline Enter now alike); excluded from the SIGTERM requeue. */
  inFlight: Map<string, { startedAt: number; inline: boolean }>;
  /** `database clock − container clock`, ms; null until measured. */
  skewMs: number | null;
  skewMeasuredAt: number | null;
  pollerBusy: boolean;
  plannerBusy: boolean;
  sweepBusy: boolean;
  lastPollerTickAt: number | null;
  lastPlannerTickAt: number | null;
  lastSweepTickAt: number | null;
  /** The post-commit hook's semaphore, overflow count, soft cache and alert channel (C4-SPEC ruling 110). */
  hook: HookState;
  /**
   * The planner's cadence markers and scan cursors (C4-SPEC rulings 77, 91). Correctness never depends on them: every
   * effect is an AlertOnce claim or a conditional write, so a failover that starts them over repeats nothing.
   */
  planner: {
    oversightAtMs: number | null;
    hourlyKey: string | null;
    scan: Record<string, { cutoff: string; id: string } | null>;
  };
  timers: {
    first: ReturnType<typeof setTimeout> | null;
    poller: ReturnType<typeof setTimeout> | null;
    planner: ReturnType<typeof setInterval> | null;
    skew: ReturnType<typeof setInterval> | null;
    sweep: ReturnType<typeof setInterval> | null;
  };
  signalsBound: boolean;
};

export type HookState = {
  /** Hook calls running now; at `HOOK_SEMAPHORE` a new one is dropped (04 A24). */
  inFlight: number;
  /** Dropped calls since boot — the sweep decides each of them. A count, never ids. */
  dropped: number;
  /** PLAN §4.3's soft cache: whether any bot is ACTIVE with the switch ON, and the holders A21 watches. */
  cache: { atMs: number; live: boolean; holderIds: ReadonlySet<string> } | null;
  /** Set when the engine starts with the trigger's ticks; null until then, so the hook never runs unwired (ruling 46). */
  alerts: EngineAlerts | null;
};

export type TickContext = { state: EngineState; instanceId: string };

export type EngineTicks = {
  pollerTick: (ctx: TickContext) => Promise<void>;
  plannerTick: (ctx: TickContext) => Promise<void>;
  /** The trigger sweep, every `SWEEP_INTERVAL_MS`, only while this instance holds the planner's lease (ruling 103). */
  sweepTick: (ctx: TickContext) => Promise<void>;
  /** The alert channel the post-commit hook uses (ruling 46: never a default). */
  hookAlerts: EngineAlerts;
  /** SIGTERM: return this instance's claims that are not in flight to PENDING. Best effort (A24). */
  requeueMine?: (instanceId: string, excludeIntentIds: readonly string[]) => Promise<number>;
};

export type EngineDeps = {
  schemaReady?: () => Promise<{ ready: boolean }>;
  timeZone?: () => Promise<string | null>;
  dbClockMs?: () => Promise<number>;
  admission?: () => Pick<AdmissionSnapshot, "inFlight" | "queueDepth" | "limits">;
  env?: () => string | undefined;
};

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_HOUSE_BOT_ENGINE: EngineState | undefined;
}

function freshState(): EngineState {
  return {
    started: false, stopping: false, refused: null, bootAt: null, inFlight: new Map(), skewMs: null, skewMeasuredAt: null,
    pollerBusy: false, plannerBusy: false, sweepBusy: false, lastPollerTickAt: null, lastPlannerTickAt: null, lastSweepTickAt: null,
    hook: { inFlight: 0, dropped: 0, cache: null, alerts: null },
    planner: { oversightAtMs: null, hourlyKey: null, scan: {} },
    timers: { first: null, poller: null, planner: null, skew: null, sweep: null }, signalsBound: false,
  };
}

/** The one engine state of this process. */
export function engineState(): EngineState {
  return globalThis.__50PICK_HOUSE_BOT_ENGINE ?? (globalThis.__50PICK_HOUSE_BOT_ENGINE = freshState());
}

export function houseBotEngineEnabled(env: string | undefined = process.env[HOUSE_BOT_ENGINE_ENV]): boolean {
  return env !== "false";
}

export type ClaimGate =
  | { ok: true; freeSlots: number; skewGuardMs: number }
  | { ok: false; reason: "NOT_STARTED" | "STOPPING" | "SKEW_UNKNOWN" | "SKEW" | "ADMISSION" | "FULL"; freeSlots: number };

/** A24 back-pressure: may this process claim right now, and how many rows? */
export function claimGate(
  state: EngineState = engineState(),
  admission: Pick<AdmissionSnapshot, "inFlight" | "queueDepth" | "limits"> = admissionSnapshot(),
): ClaimGate {
  const freeSlots = Math.max(0, MAX_FIRES_PER_PROCESS - state.inFlight.size);
  if (!state.started) return { ok: false, reason: "NOT_STARTED", freeSlots };
  if (state.stopping) return { ok: false, reason: "STOPPING", freeSlots };
  if (state.skewMs == null) return { ok: false, reason: "SKEW_UNKNOWN", freeSlots };
  if (Math.abs(state.skewMs) > MAX_TOLERATED_SKEW_MS) return { ok: false, reason: "SKEW", freeSlots };
  if (admission.queueDepth > 0 || admission.inFlight * 2 >= admission.limits.maxInFlight) return { ok: false, reason: "ADMISSION", freeSlots };
  if (freeSlots === 0) return { ok: false, reason: "FULL", freeSlots };
  return { ok: true, freeSlots, skewGuardMs: Math.max(0, state.skewMs) + CLAIM_SKEW_GUARD_MS };
}

/** N2 §4 step 1: the post-commit hook is suspended while this container's skew is unknown or over 5 s. */
export function hookSuspendedBySkew(state: EngineState = engineState()): boolean {
  return state.skewMs == null || Math.abs(state.skewMs) > MAX_TOLERATED_SKEW_MS;
}

/**
 * Ruling 103 · the sweep runs only where the planner's lease is held and unexpired. It reads what the planner's last
 * `acquireLeadership` observed and never writes the lease itself; a brief double sweep at failover is harmless (anchor
 * conflicts, a forward-only watermark).
 */
export function holdsPlannerLease(snapshot: ReturnType<typeof leadershipSnapshot> = leadershipSnapshot()): boolean {
  const lease = snapshot[HOUSE_PLANNER_TASK];
  return !!lease && lease.isMe && lease.expiresInSec > 0;
}

async function defaultDbClockMs(): Promise<number> {
  return (await houseBotRuntimeStore.dbClock()).nowMs;
}

async function defaultTimeZone(): Promise<string | null> {
  if (!hasDatabase()) return "UTC";
  const db = prisma();
  if (!db) return null;
  const rows = (await db.$queryRawUnsafe(`SELECT current_setting('TimeZone') AS "zone"`)) as Array<{ zone: string }>;
  return rows[0]?.zone ?? null;
}

/**
 * A24: `database clock − container clock`, measured against the midpoint of the round trip so network latency
 * does not read as skew.
 */
export async function measureSkew(state: EngineState = engineState(), dbClockMs: () => Promise<number> = defaultDbClockMs): Promise<number | null> {
  try {
    const t0 = Date.now();
    const dbMs = await dbClockMs();
    const t1 = Date.now();
    state.skewMs = Math.round(dbMs - (t0 + t1) / 2);
    state.skewMeasuredAt = t1;
  } catch (e) {
    // Fail closed: an unknown skew stops claims until the next measurement succeeds.
    state.skewMs = null;
    console.error("[house-bot] clock skew could not be measured — claims pause:", (e as Error)?.message ?? e);
  }
  return state.skewMs;
}

/**
 * Start the engine. Idempotent: a second call returns the first call's result and starts nothing.
 */
export async function startHouseBotEngine(ticks: EngineTicks, deps: EngineDeps = {}): Promise<{ started: boolean; refused: EngineRefusal | null }> {
  const state = engineState();
  if (state.started) return { started: true, refused: null };
  /* ⛔ F2 · THE PRODUCT STATE IS CHECKED BEFORE ANYTHING ELSE. A withdrawn feature arms no timer on any
     replica, however that replica is configured — and it is a SECOND, independent mechanism from the
     control row's `offCause = 'SUNSET'`: one survives a database edited by hand, the other survives a
     redeploy of an older image. Neither is allowed to be the only one that holds. */
  if (!houseBotsLive()) {
    state.refused = "FEATURE_WITHDRAWN";
    console.warn("[house-bot] the feature is WITHDRAWN — the engine is not started and no timer is armed (04 F2)");
    return { started: false, refused: state.refused };
  }
  if (!houseBotEngineEnabled((deps.env ?? (() => process.env[HOUSE_BOT_ENGINE_ENV]))())) {
    state.refused = "ENV_DISABLED";
    console.warn(`[house-bot] ${HOUSE_BOT_ENGINE_ENV}=false — the engine is not started on this instance`);
    return { started: false, refused: state.refused };
  }
  const schema = await (deps.schemaReady ?? houseBotSchemaReady)();
  if (!schema.ready) {
    state.refused = "SCHEMA_NOT_READY";
    console.error("[house-bot] the house-bot schema is not ready — the engine is not started (A23)");
    return { started: false, refused: state.refused };
  }
  const zone = await (deps.timeZone ?? defaultTimeZone)().catch(() => null);
  if (!zone || !(UTC_ZONES as readonly string[]).includes(zone)) {
    state.refused = "DB_TIMEZONE";
    console.error(`[house-bot] database TimeZone is ${zone ?? "unreadable"}, not UTC — the engine is not started (04 A4)`);
    return { started: false, refused: state.refused };
  }
  try {
    const row = await houseBotRuntimeStore.boot(RUNTIME_KEY.engine(INSTANCE_ID), { engineEnabled: true });
    state.bootAt = row.bootAt ?? new Date().toISOString();
  } catch (e) {
    state.refused = "BOOT_FAILED";
    console.error("[house-bot] the engine boot row could not be written — not started:", (e as Error)?.message ?? e);
    return { started: false, refused: state.refused };
  }

  state.started = true;
  state.stopping = false;
  state.refused = null;
  state.hook.alerts = ticks.hookAlerts ?? null;
  const clock = deps.dbClockMs ?? defaultDbClockMs;
  await measureSkew(state, clock);
  state.timers.skew = setInterval(() => { void measureSkew(state, clock); }, SKEW_MEASURE_INTERVAL_MS);
  state.timers.skew.unref?.();

  const ctx: TickContext = { state, instanceId: INSTANCE_ID };
  const pollOnce = async () => {
    state.timers.poller = null;
    if (state.stopping) return;
    if (!state.pollerBusy) {
      state.pollerBusy = true;
      try {
        await ticks.pollerTick(ctx);
      } catch (e) {
        console.error("[house-bot] poller pass failed:", (e as Error)?.message ?? e);
      } finally {
        state.pollerBusy = false;
        state.lastPollerTickAt = Date.now();
      }
    }
    if (state.stopping) return;
    const jitter = Math.round((Math.random() * 2 - 1) * POLLER_JITTER_MS);
    state.timers.poller = setTimeout(() => { void pollOnce(); }, POLLER_INTERVAL_MS + jitter);
    state.timers.poller.unref?.();
  };
  const planOnce = async () => {
    if (state.stopping || state.plannerBusy) return;
    state.plannerBusy = true;
    try {
      // A24: a 45 s lease whose write must land — a lease that was never stored is not leadership.
      if (!(await acquireLeadership(HOUSE_PLANNER_TASK, { leaseMs: PLANNER_LEASE_MS, strictWrite: true }))) return;
      await ticks.plannerTick(ctx);
    } catch (e) {
      console.error("[house-bot] planner pass failed:", (e as Error)?.message ?? e);
    } finally {
      state.plannerBusy = false;
      state.lastPlannerTickAt = Date.now();
    }
  };
  const sweepOnce = async () => {
    if (state.stopping || state.sweepBusy || !holdsPlannerLease()) return;
    state.sweepBusy = true;
    try {
      await ticks.sweepTick(ctx);
    } catch (e) {
      console.error("[house-bot] sweep pass failed:", (e as Error)?.message ?? e);
    } finally {
      state.sweepBusy = false;
      state.lastSweepTickAt = Date.now();
    }
  };
  state.timers.first = setTimeout(() => {
    state.timers.first = null;
    void pollOnce();
    void planOnce();
    state.timers.planner = setInterval(() => { void planOnce(); }, PLANNER_INTERVAL_MS);
    state.timers.planner.unref?.();
    state.timers.sweep = setInterval(() => { void sweepOnce(); }, SWEEP_INTERVAL_MS);
    state.timers.sweep.unref?.();
  }, FIRST_TICK_DELAY_MS);
  state.timers.first.unref?.();

  if (!state.signalsBound) {
    state.signalsBound = true;
    process.once("SIGTERM", () => { void stopHouseBotEngine(ticks, "SIGTERM"); });
    process.once("SIGINT", () => { void stopHouseBotEngine(ticks, "SIGINT"); });
  }
  console.log(`[house-bot] engine started on ${INSTANCE_ID} — first pass in ${FIRST_TICK_DELAY_MS / 1000}s`);
  return { started: true, refused: null };
}

/**
 * Stop the engine. `stopping` is set before anything awaits, so no claim starts after the signal. Correctness
 * never depends on this: a claim that is never returned expires with its 180 s lease (A24).
 */
export async function stopHouseBotEngine(ticks: Pick<EngineTicks, "requeueMine">, reason = "stop"): Promise<void> {
  const state = engineState();
  state.stopping = true;
  for (const key of ["first", "poller", "skew"] as const) {
    const t = state.timers[key];
    if (t) clearTimeout(t);
    state.timers[key] = null;
  }
  if (state.timers.planner) clearInterval(state.timers.planner);
  state.timers.planner = null;
  if (state.timers.sweep) clearInterval(state.timers.sweep);
  state.timers.sweep = null;
  if (!state.started) return;
  console.log(`[house-bot] ${reason} — the engine stops claiming and hands its claims back`);
  if (ticks.requeueMine) {
    const inFlight = [...state.inFlight.keys()];
    void ticks.requeueMine(INSTANCE_ID, inFlight).catch(() => {});
  }
  await releaseLeadership(HOUSE_PLANNER_TASK);
  state.started = false;
}

/** For the admin-gated reader (`engine-health.ts`, ruling 172 — never `/api/health`): whether this instance runs the engine, and why not. No ids, no errors. */
export function houseBotEngineHealth(state: EngineState = engineState()) {
  return {
    started: state.started,
    stopping: state.stopping,
    refused: state.refused,
    bootAt: state.bootAt,
    skewMs: state.skewMs,
    inFlight: state.inFlight.size,
    lastPollerTickAt: state.lastPollerTickAt ? new Date(state.lastPollerTickAt).toISOString() : null,
    lastPlannerTickAt: state.lastPlannerTickAt ? new Date(state.lastPlannerTickAt).toISOString() : null,
    lastSweepTickAt: state.lastSweepTickAt ? new Date(state.lastSweepTickAt).toISOString() : null,
    /** Bet-hook calls dropped at the semaphore since boot (ruling 110); the sweep decided each. */
    hookDropped: state.hook.dropped,
  };
}
