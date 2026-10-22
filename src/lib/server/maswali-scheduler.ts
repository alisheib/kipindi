/**
 * MASWALI MILLIONEA — THE WEEK SCHEDULER (MASWALI-BUILD S2; MASWALI-PLAN §7b S2 item 8).
 *
 * ONE timer for the whole product, armed for the next instant any non-terminal week needs something — its sales close,
 * a question's void deadline, the end of its objection window — and the ONE idempotent tick that does it. Kept separate
 * from the poll scheduler (`nextDeadlineFor` returns null for MASWALI) and from Up & Down's, so no product can starve
 * another, the Up & Down precedent.
 *
 *   · OPEN and past its close            → `closeWeek` (the commitment, exactly once); a close the database's clock
 *     refused (a timer that fired a few ms early on the container's clock) is asked again the moment that clock arrives
 *   · CLOSED / RESOLVING                 → `recomputeGate`; a void deadline passed unsealed → a proposal for an officer
 *   · a certain week void, window closed → `voidWeek` (stamped VOIDED, then every ticket refunded in one bulk transaction)
 *   · VOIDED and its refunds not landed  → `voidWeek` again, every tick until they land (R1: a refusal or a rollback
 *     after the stamp is retried, never stranded)
 *   · ⛔ never a seal, never an open, never a winning settlement: an officer seals (MR-14), opens (S4) and an accounting
 *     officer releases (OD-06).
 *
 * Every step is a conditional write behind the chain lock, so a tick that runs twice — a timer and the 5-minute
 * reconcile, two containers during a deploy — does the work once. A failure in one week never stops the others.
 * `MASWALI_SCHEDULER=false` turns the timer off (the reconcile still runs the tick).
 */
import { audit } from "./audit";
import { questionStore, weekStore, type StoredWeek } from "./maswali-dal";
import { closeWeek, proposeVoidsAtDeadline, recomputeGate, voidWeek } from "./maswali-service";
import { unrefundedVoids } from "./maswali-void";

/** Never sleep longer than this: a clock jump or a missed change is healed within it. */
const MAX_SLEEP_MS = 5 * 60_000;
/** The shortest sleep: an instant due sooner waits this long, so the timer never spins (a past one is no wake time). */
const PAST_GRACE_MS = 1_000;
/** How far past the database's arrival at a refused close the tick asks again: the clock has then passed it. */
const CLOSE_RETRY_MARGIN_MS = 1_000;

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_MLN_TIMER: ReturnType<typeof setTimeout> | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_MLN_PROPOSED: Set<string> | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_MLN_TICKING: Promise<TickReport> | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_MLN_CLOSE_RETRY: Map<string, number> | undefined;
}
const proposed = (globalThis.__50PICK_MLN_PROPOSED ??= new Set<string>());
/**
 * ⭐ S7-F2 (L1) · week id → the container instant its refused close is asked again. The timer fires on the container's
 * clock and the close is checked on the database's (MB-84), so a timer a few ms early met a refusal, and the next wake
 * was the 5-minute reconcile: the week stayed OPEN, and the console's "the close is not stamped" alert could fire on a
 * week nothing was wrong with. A refusal records closesAt − dbNow + 1 s here, from its own instant (S7-F3); the next
 * attempt, or a week no longer OPEN, ends it.
 */
const closeRetry = (globalThis.__50PICK_MLN_CLOSE_RETRY ??= new Map<string, number>());

export function maswaliSchedulerEnabled(): boolean {
  return process.env.MASWALI_SCHEDULER !== "false";
}

export type TickReport = { closed: number; voided: number; proposals: number; failures: number };

/**
 * ⭐ THE TICK. Idempotent; concurrent callers in one process share one run. Never rejects — a week whose step fails is
 * counted and audited, and the next week still runs.
 */
export function runMaswaliTick(now: Date = new Date()): Promise<TickReport> {
  const inflight = globalThis.__50PICK_MLN_TICKING;
  if (inflight) return inflight;
  const run = (async (): Promise<TickReport> => {
    const report: TickReport = { closed: 0, voided: 0, proposals: 0, failures: 0 };
    const nowMs = now.getTime();
    /** The container's instant this tick began, so a step's own instant on the tick's clock is `nowMs` + the time run. */
    const startedMs = Date.now();
    let weeks: StoredWeek[];
    try {
      // R1 · a VOIDED week is listed only while its refunds are owed (its market not settled): resumed below, every tick.
      weeks = [...await weekStore.list({ states: ["OPEN", "CLOSED", "RESOLVING"] }), ...await unrefundedVoids()];
    } catch (e) {
      console.error("[maswali] tick could not list weeks:", e);
      report.failures++;
      return report;
    }
    for (const w of weeks) {
      try {
        if (w.state === "VOIDED") {
          const v = await voidWeek({ weekId: w.id, now });
          if (!v.ok) throw new Error(v.error);
          if (!v.already) report.voided++;
          continue;
        }
        if (w.state === "OPEN" && Date.parse(w.closesAt) <= nowMs) {
          // S7-F3 · the attempt consumes a recorded retry: only a fresh refusal on the database's clock records one again.
          closeRetry.delete(w.id);
          const r = await closeWeek({ weekId: w.id, now });
          if (r.ok && !r.already) report.closed++;
          // ⭐ S7-F3 · measured from the refusal's own instant (the tick's clock plus the time it has run), never the tick's
          //    start: the weeks before this one may have taken longer than the shortfall and the margin.
          if (!r.ok && "dbShortMs" in r) closeRetry.set(w.id, nowMs + (Date.now() - startedMs) + r.dbShortMs + CLOSE_RETRY_MARGIN_MS);
          continue;
        }
        if (w.state === "CLOSED" || w.state === "RESOLVING") {
          const g = await recomputeGate(w.id, now);
          for (const slot of await proposeVoidsAtDeadline(w.id, now)) {
            const key = `${w.id}:${slot}`;
            if (proposed.has(key)) continue;
            proposed.add(key);
            report.proposals++;
            const q = (await questionStore.listForWeek(w.id)).find((x) => x.slot === slot);
            audit({ category: "ADMIN", action: "maswali.question.void_proposed", actorId: "system_maswali", targetType: "MaswaliQuestion", targetId: q?.id ?? `${w.id}#${slot}`,
              payload: { week: w.code, slot, voidDeadlineAt: q?.voidDeadlineAt ?? null, note: "the void deadline passed unsealed; an officer seals the void (MR-15)" } });
          }
          const fresh = await weekStore.get(w.id);
          if (g.ok && g.gate.ready && g.gate.weekVoid && fresh?.objectionsCloseAt && Date.parse(fresh.objectionsCloseAt) <= nowMs) {
            const v = await voidWeek({ weekId: w.id, now });
            if (!v.ok) throw new Error(v.error);
            if (!v.already) report.voided++;
          }
        }
      } catch (e) {
        report.failures++;
        console.error(`[maswali] tick failed for week ${w.code}:`, e);
        audit({ category: "COMPLIANCE", action: "maswali.scheduler.step_failed", actorId: "system_maswali", targetType: "MaswaliCycle", targetId: w.id,
          payload: { code: w.code, state: w.state, error: String((e as Error)?.message ?? e).slice(0, 300) } });
      }
    }
    // S6 · MB-93 · a week's notices a stopped run left part-sent are finished by the reconcile — launched after this tick's
    // own work and never waited on here, so no close or void waits behind a letter or an SMS (`maswali-notify.ts`).
    void import("./maswali-notify").then((m) => m.reconcileMillioneaNotices(now)).catch(() => {});
    return report;
  })().finally(() => { if (globalThis.__50PICK_MLN_TICKING === run) globalThis.__50PICK_MLN_TICKING = undefined; });
  globalThis.__50PICK_MLN_TICKING = run;
  return run;
}

/**
 * The next instant any week needs the tick, or null when nothing is pending.
 * ⛔ A PAST INSTANT IS NEVER A WAKE TIME — every candidate must lie after `nowMs`. A week whose window closed while it waits
 * for accounting's release (or a close a failing tick did not stamp) re-armed the timer at its one-second grace, and the
 * tick took `maswali:chain` every second until someone acted. What is already due waits for the normal cadence: the timer
 * sleeps at most MAX_SLEEP_MS, and the lifecycle's reconcile runs the tick seconds after a boot and every five minutes.
 * ⭐ S7-F2 (L1) · an OPEN week's refused close is a wake time too: the instant the tick recorded (`closeRetry`).
 */
export async function nextMaswaliDueMs(nowMs: number = Date.now()): Promise<number | null> {
  const weeks = await weekStore.list({ states: ["OPEN", "CLOSED", "RESOLVING"] });
  let next: number | null = null;
  const take = (t: number) => { if (Number.isFinite(t) && t > nowMs && (next === null || t < next)) next = t; };
  for (const id of closeRetry.keys()) if (!weeks.some((w) => w.id === id && w.state === "OPEN")) closeRetry.delete(id);
  for (const w of weeks) {
    // ⭐ S7-F3 · a recorded retry stays a wake time once passed — at the grace, the one past instant that is: the tick that
    //    recorded it may have run on past it, and the database's clock has then reached the close. Only while the close
    //    itself is due, so the next tick's attempt consumes it and it never spins (the doctrine above stands otherwise).
    const retry = closeRetry.get(w.id);
    if (w.state === "OPEN") {
      take(Date.parse(w.closesAt));
      if (retry !== undefined && Date.parse(w.closesAt) <= nowMs) take(Math.max(retry, nowMs + PAST_GRACE_MS));
      continue;
    }
    if (w.objectionsCloseAt) take(Date.parse(w.objectionsCloseAt));
    for (const q of await questionStore.listForWeek(w.id)) if (q.outcome === null) take(Date.parse(q.voidDeadlineAt));
  }
  return next;
}

/** The timer's sleep before a due instant: never past the normal cadence (MAX_SLEEP_MS), never under the grace. */
export function wakeDelayMs(due: number | null, nowMs: number): number {
  return due === null ? MAX_SLEEP_MS : Math.min(MAX_SLEEP_MS, Math.max(PAST_GRACE_MS, due - nowMs));
}

/** Arm the one timer for the next due instant (bounded by MAX_SLEEP_MS). Never rejects. */
export async function armMaswaliTimer(): Promise<void> {
  try {
    if (globalThis.__50PICK_MLN_TIMER) clearTimeout(globalThis.__50PICK_MLN_TIMER);
    globalThis.__50PICK_MLN_TIMER = undefined;
    if (!maswaliSchedulerEnabled()) return;
    const nowMs = Date.now();
    const delay = wakeDelayMs(await nextMaswaliDueMs(nowMs), nowMs);
    const t = setTimeout(() => {
      void runMaswaliTick().finally(() => { void armMaswaliTimer(); });
    }, delay);
    (t as { unref?: () => void }).unref?.();
    globalThis.__50PICK_MLN_TIMER = t;
  } catch (e) {
    console.error("[maswali] could not arm the timer:", e);
  }
}

/** Boot: arm the timer. A close missed while the container was down is already past, so it is no wake time: the
 *  lifecycle's first reconcile, seconds after boot, runs the tick that stamps it (sales stopped at the close anyway — the
 *  purchase and the cancel read it on the database clock). */
export async function hydrateMaswaliOnBoot(): Promise<void> {
  if (!maswaliSchedulerEnabled()) {
    console.warn("[maswali] MASWALI_SCHEDULER=false — the week timer is off; the 5-minute reconcile still runs the tick");
    return;
  }
  await armMaswaliTimer();
}

/** The lifecycle's 5-minute backstop: run the tick and re-arm, whatever the timer did. Never rejects. */
export async function reconcileMaswaliWeeks(): Promise<TickReport> {
  const r = await runMaswaliTick().catch((): TickReport => ({ closed: 0, voided: 0, proposals: 0, failures: 1 }));
  await armMaswaliTimer();
  return r;
}

/** ⚠️ TEST SEAM ONLY. */
export function __resetMaswaliScheduler(): void {
  if (globalThis.__50PICK_MLN_TIMER) clearTimeout(globalThis.__50PICK_MLN_TIMER);
  globalThis.__50PICK_MLN_TIMER = undefined;
  globalThis.__50PICK_MLN_TICKING = undefined;
  proposed.clear();
  closeRetry.clear();
}
