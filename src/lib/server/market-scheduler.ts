/**
 * Per-market scheduler — one precise timer per market, keyed to its own deadlines,
 * replacing the poll-everything lifecycle sweep.
 *
 * A market moves through up to four CLOCK-driven transitions, each with an exact
 * time. Instead of scanning every market once a minute to ask "is anything due?",
 * we arm ONE timer per market that fires at its NEXT deadline, runs that one
 * transition, and re-arms for the deadline after it:
 *
 *   closing-soon   (cutoff − 1h)  → nudge watchers            [notifyClosingSoonForMarket]
 *   notify-closed  (cutoff)       → tell bettors + freeze payout [notifySelectionClosedForMarket]
 *   resolve        (resolutionAt+offset) → AI check → human / auto  [resolveDueMarket]
 *   settle         (objectionsClosedAt)  → pay winners            [settleMarket]
 *
 * where cutoff = selectionClosedAt ?? resolutionAt.
 *
 * The design mirrors the (now-deleted) sentinel's durable self-rescheduling timer:
 *   - fires at the EXACT deadline, to the second (not on a coarse cadence);
 *   - chains a re-arm "hop" for deadlines beyond setTimeout's ~24.8-day ceiling;
 *   - on boot, hydrates from a TARGETED indexed query (marketStore.pending()) and
 *     fires deadlines missed while the server was DOWN after a short staggered
 *     grace — a missed deadline is never skipped.
 *
 * Correctness under concurrency: the scheduler NEVER moves money itself — every
 * fire calls a transition that takes `withLock('market:'+id)` and re-checks its
 * idempotency stamp, so two timers, a reconciler racing a timer, or two instances
 * all collapse to EXACTLY ONE transition. The registry is one Timeout per market
 * id (globalThis, the house singleton pattern — market-dal.ts).
 *
 * Multi-instance note: resolveDueMarket already claims a market under the lock
 * (resolveClaimedAt) before its paid AI call, so N instances never double-spend the
 * AI. TODO(scale): when >1 instance runs, the timers are per-process — every
 * instance will arm its own timer for the same market; the lock + idempotency
 * stamps keep that CORRECT (one transition), but each fire still does a little
 * redundant work. Before horizontal scaling, gate fires behind a short DB lease
 * (e.g. a `SELECT … FOR UPDATE SKIP LOCKED` claim on the deadline) so only one
 * instance fires each transition.
 */

import { marketStore } from "./market-dal";
import { getGlobalConfig } from "./market-config";
import {
  isDemoMarket,
  resolveDueMarket,
  settleMarket,
  notifySelectionClosedForMarket,
  notifyClosingSoonForMarket,
} from "./market-service";
import type { StoredMarket } from "./market-service";

// setTimeout's delay is a signed 32-bit int of milliseconds; anything larger fires
// immediately. Deadlines further out than this are reached by chained re-arm hops.
const MAX_TIMEOUT_MS = 2_147_483_647; // 2^31 − 1  (~24.8 days)
const CLOSING_SOON_WINDOW_MS = 60 * 60_000; // 1 hour — must match market-service
const BOOT_GRACE_MS = 90_000; // missed-while-down deadlines fire after this grace
const SETTLE_RETRY_MS = 5 * 60_000; // back-off when a settle fire is (temporarily) refused

function schedulerEnabled(): boolean {
  return process.env.MARKET_SCHEDULER !== "false";
}

// ── The registry — one live timer per market id, on globalThis (survives HMR) ───
export type DeadlineKind = "closing-soon" | "notify-closed" | "resolve" | "settle";
export type Deadline = { at: number; kind: DeadlineKind };
type TimerEntry = { timeout: ReturnType<typeof setTimeout>; at: number; kind: DeadlineKind };

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_MARKET_TIMERS: Map<string, TimerEntry> | undefined;
}
const timers: Map<string, TimerEntry> =
  globalThis.__50PICK_MARKET_TIMERS ?? (globalThis.__50PICK_MARKET_TIMERS = new Map());

// Deadlines that fall on the same instant resolve in lifecycle order.
const PRIO: Record<DeadlineKind, number> = { "closing-soon": 0, "notify-closed": 1, "resolve": 2, "settle": 3 };

/**
 * The EARLIEST pending, not-yet-stamped time transition for a market — or null if
 * it has none (e.g. CLOSED awaiting the human ceremony, or already settled). Pure
 * and deterministic (now + offsetMs are parameters) so it is exhaustively unit-
 * testable without timers or a clock.
 */
export function nextDeadlineFor(m: StoredMarket, offsetMs = 0, now = Date.now()): Deadline | null {
  const candidates: Deadline[] = [];
  const demo = isDemoMarket(m);
  if (m.status === "LIVE") {
    const cutoff = m.selectionClosedAt ? Date.parse(m.selectionClosedAt) : Date.parse(m.resolutionAt);
    // Notify transitions are for real markets only (demo markets auto-resolve the
    // instant they expire, so "betting closed, awaiting results" would be a lie).
    if (!demo && Number.isFinite(cutoff)) {
      // A "closes within the hour" nudge is meaningless once the market has closed.
      if (!m.closingSoonNotifiedAt && cutoff > now) {
        candidates.push({ at: cutoff - CLOSING_SOON_WINDOW_MS, kind: "closing-soon" });
      }
      if (!m.selectionClosedNotifiedAt) candidates.push({ at: cutoff, kind: "notify-closed" });
    }
    const res = Date.parse(m.resolutionAt);
    // The resolve trigger applies to demo markets too (dev random auto-resolution).
    if (Number.isFinite(res) && !m.resolutionNotifiedAt) candidates.push({ at: res + offsetMs, kind: "resolve" });
  } else if ((m.status === "RESOLVED" || m.status === "VOIDED") && !m.settledAt && m.objectionsClosedAt) {
    const oc = Date.parse(m.objectionsClosedAt);
    if (Number.isFinite(oc)) candidates.push({ at: oc, kind: "settle" });
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.at - b.at || PRIO[a.kind] - PRIO[b.kind]);
  return candidates[0];
}

/** Resolve the admin-configured resolve OFFSET (default 0), in ms. */
async function resolveOffsetMs(): Promise<number> {
  try {
    return Math.max(0, (await getGlobalConfig()).resolveOffsetMinutes ?? 0) * 60_000;
  } catch {
    return 0;
  }
}

/**
 * Arm (or re-arm) THIS market's single timer for its next deadline. Reads the row
 * fresh so it always schedules against committed state — callers must arm AFTER
 * their write commits. Idempotent: it disarms any existing timer first.
 *
 *  - opts.graceOnPast — a deadline already in the past (missed while DOWN) fires
 *    after BOOT_GRACE_MS (+ stagger) instead of instantly, so a deploy storm can't
 *    hammer the AI. Used by boot hydrate + the reconciler; NOT by live create/resolve
 *    (a just-created short-fuse market should fire immediately).
 *  - opts.staggerMs — spread many missed deadlines across a short window.
 *  - opts.minDelayMs — a floor (back-off), e.g. after a settle fire was refused by a
 *    standing objection, so the timer doesn't spin re-firing a not-yet-payable market.
 */
export async function armMarket(
  id: string,
  opts?: { graceOnPast?: boolean; staggerMs?: number; minDelayMs?: number },
): Promise<void> {
  if (!schedulerEnabled()) return;
  const m = await marketStore.get(id);
  if (!m) { disarmMarket(id); return; } // market gone (deleted) → cancel any stale timer
  await armFromRow(m, opts);
}

/**
 * Arm from a row the caller ALREADY has. Boot hydrate and the reconciler each read
 * the pending set in one indexed query, so going back to the DB per market would be
 * a pointless N+1 across the whole board on every boot.
 */
async function armFromRow(
  m: StoredMarket,
  opts?: { graceOnPast?: boolean; staggerMs?: number; minDelayMs?: number },
): Promise<void> {
  const id = m.id;
  const offsetMs = await resolveOffsetMs();
  const dl = nextDeadlineFor(m, offsetMs);
  disarmMarket(id);
  if (!dl) return; // no time-based transition pending (CLOSED-awaiting-ceremony, settled…)

  const rawDelay = dl.at - Date.now();
  let base: number;
  if (rawDelay <= 0) base = (opts?.graceOnPast ? BOOT_GRACE_MS : 0) + (opts?.staggerMs ?? 0);
  else base = rawDelay;
  if (opts?.minDelayMs) base = Math.max(base, opts.minDelayMs);

  const hop = base > MAX_TIMEOUT_MS; // deadline further out than setTimeout can hold
  const clamped = Math.min(base, MAX_TIMEOUT_MS);
  const timeout = setTimeout(() => {
    // A hop just re-arms (recomputes the now-smaller remaining delay); otherwise fire.
    if (hop) void armMarket(id, opts);
    else void fireMarket(id);
  }, Math.max(0, clamped));
  // Don't let a pending timer keep a test/CLI process alive (harmless on the server,
  // whose HTTP listener holds the loop open regardless).
  (timeout as { unref?: () => void }).unref?.();
  timers.set(id, { timeout, at: dl.at, kind: dl.kind });
}

/** Alias — re-arming IS arming (armMarket recomputes from scratch, disarming first). */
export const rearmMarket = armMarket;

/** Cancel this market's timer, if any. Safe to call on an unknown id. */
export function disarmMarket(id: string): void {
  const e = timers.get(id);
  if (e) { clearTimeout(e.timeout); timers.delete(id); }
}

/**
 * Run whichever transition is due for a market, reporting whether it ADVANCED
 * state (so the drainer/re-arm can tell progress from a benign no-op) and any
 * retry back-off (settlement temporarily refused by the objection gate).
 */
async function runTransition(id: string, kind: DeadlineKind): Promise<{ advanced: boolean; retryMs: number }> {
  switch (kind) {
    case "closing-soon":
      return { advanced: (await notifyClosingSoonForMarket(id)).notified, retryMs: 0 };
    case "notify-closed":
      return { advanced: (await notifySelectionClosedForMarket(id)).notified, retryMs: 0 };
    case "resolve": {
      const r = await resolveDueMarket(id);
      const advanced = r.status === "closed-human" || r.status === "resolved-auto" || r.status === "demo";
      return { advanced, retryMs: 0 };
    }
    case "settle": {
      const r = await settleMarket(id, { actorId: "system" });
      // OBJECTION_OPEN / TOO_EARLY are transient — the market is payable later, so
      // back off instead of spinning. Everything else (paid, or already settled) is
      // terminal for this deadline.
      const refusedTemporarily = !r.ok && (r.code === "OBJECTION_OPEN" || r.code === "TOO_EARLY");
      return { advanced: r.ok, retryMs: refusedTemporarily ? SETTLE_RETRY_MS : 0 };
    }
  }
}

/**
 * Fire a market's due transition, then re-arm for the next one. Every transition is
 * lock + stamp idempotent, so a spurious fire (two timers, reconciler race) is safe.
 */
async function fireMarket(id: string): Promise<void> {
  timers.delete(id); // this timer has fired; a fresh one is armed in `finally`
  if (!schedulerEnabled()) return;
  let retryMs = 0;
  try {
    const m = await marketStore.get(id);
    if (!m) return; // deleted between arming and firing — nothing to do, no re-arm
    const dl = nextDeadlineFor(m, await resolveOffsetMs());
    // Only act if a deadline is genuinely due (guards a stale/early fire).
    if (dl && dl.at <= Date.now() + 1000) {
      const r = await runTransition(id, dl.kind);
      retryMs = r.retryMs;
    }
  } catch (e) {
    console.error(`[scheduler] fire ${id} failed:`, e);
    retryMs = SETTLE_RETRY_MS; // unknown error — back off, the reconciler is the net
  } finally {
    // Re-arm for the NEXT deadline (armMarket disarms-if-gone, so a deleted market
    // self-cleans). minDelayMs applies the settle back-off when relevant.
    void armMarket(id, { minDelayMs: retryMs });
  }
}

/**
 * Boot hydrate — arm a timer for EVERY market with a pending time transition, via a
 * TARGETED indexed query (marketStore.pending(), never values()). Deadlines missed
 * while the server was DOWN fire after a short, staggered grace so a deploy storm
 * doesn't fire everything at once — a missed deadline is delayed, NEVER skipped.
 */
export async function hydrateSchedulerOnBoot(): Promise<{ armed: number }> {
  if (!schedulerEnabled()) {
    console.warn("[scheduler] MARKET_SCHEDULER=false — per-market timers disabled");
    return { armed: 0 };
  }
  const pending = await marketStore.pending();
  let i = 0;
  for (const m of pending) {
    await armFromRow(m, { graceOnPast: true, staggerMs: (i % 20) * 3000 });
    i++;
  }
  console.log(`[scheduler] boot hydrate — armed ${pending.length} pending market timer(s)`);
  return { armed: pending.length };
}

/**
 * Self-healing backstop (runs on the lifecycle ticker, ~5-min cadence). Arms any
 * pending market that has NO live timer — covering a timer dropped by an error, a
 * market created while the scheduler was briefly down, or (future) a hand-off from
 * another instance. armMarket(graceOnPast) also fires anything already past its
 * deadline, so this both (a) arms missing timers and (b) heals missed deadlines.
 * The ONLY market sweep left, and it exists purely to heal lost timers.
 */
export async function reconcileMarketSchedules(): Promise<{ pending: number; healed: number }> {
  if (!schedulerEnabled()) return { pending: 0, healed: 0 };
  const pending = await marketStore.pending();
  let healed = 0;
  let i = 0;
  for (const m of pending) {
    if (timers.has(m.id)) continue; // already armed — leave it
    await armFromRow(m, { graceOnPast: true, staggerMs: (i % 20) * 2000 });
    healed++;
    i++;
  }
  if (healed > 0) console.log(`[scheduler] reconcile — re-armed ${healed}/${pending.length} market timer(s) that had no live timer`);
  return { pending: pending.length, healed };
}

/**
 * Synchronously drain EVERY market's currently-due transitions (no timers). Runs
 * each pending market through runTransition until nothing more is due or a step
 * stops advancing. This is what tests call to drive the exact same code path the
 * timers drive; production uses the timers + reconciler, never this.
 */
export async function runDueMarketTransitions(): Promise<{ ran: number; markets: number }> {
  const pending = await marketStore.pending();
  let ran = 0;
  for (const m of pending) ran += await drainDueTransitions(m.id);
  return { ran, markets: pending.length };
}

/** Run one market through all of its currently-due transitions in order. */
async function drainDueTransitions(id: string, maxSteps = 8): Promise<number> {
  const offsetMs = await resolveOffsetMs();
  let ran = 0;
  for (let i = 0; i < maxSteps; i++) {
    const m = await marketStore.get(id);
    if (!m) break;
    const dl = nextDeadlineFor(m, offsetMs);
    if (!dl || dl.at > Date.now()) break; // nothing due
    const { advanced } = await runTransition(id, dl.kind);
    if (!advanced) break; // refused / already handled — stop (don't spin)
    ran++;
  }
  return ran;
}

/** Live scheduler health for the admin settlement/system readouts. */
export function getSchedulerHealth(): {
  armed: number;
  nextFireAt: string | null;
  entries: Array<{ marketId: string; at: string; kind: DeadlineKind }>;
} {
  let min: number | null = null;
  const entries: Array<{ marketId: string; at: string; kind: DeadlineKind }> = [];
  for (const [marketId, e] of timers.entries()) {
    entries.push({ marketId, at: new Date(e.at).toISOString(), kind: e.kind });
    if (min === null || e.at < min) min = e.at;
  }
  entries.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  return { armed: timers.size, nextFireAt: min != null ? new Date(min).toISOString() : null, entries };
}

/** Test/ops helper — cancel every armed timer (does not touch market state). */
export function disarmAll(): void {
  for (const e of timers.values()) clearTimeout(e.timeout);
  timers.clear();
}
