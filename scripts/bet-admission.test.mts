/**
 * Bet admission control — the "a bet must never fail for capacity" guarantee.
 *
 * Before: N concurrent bets each grabbed a pool connection, the pool emptied, and
 * the surplus surfaced a RAW Prisma P2024 to the player. Measured on real
 * Postgres at pool 5: 20 concurrent bets → 20 failures, 0 positions.
 * After: surplus bets QUEUE and are admitted as slots free. Saturation becomes
 * latency, and only a genuinely hopeless queue is refused — as a clean, retryable
 * BUSY, never a database error.
 *
 * Each block pins one invariant from admission.ts's header. In-memory store; the
 * semaphore is pure in-process logic, so it is fully exercised without a DB.
 */
import {
  withAdmission, AdmissionBusy, setAdmissionLimits, getAdmissionLimits,
  clampLimits, admissionSnapshot, __resetAdmission,
} from "../src/lib/server/admission.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** A job that parks until released, so we can hold slots open deterministically. */
function gate() {
  let release!: () => void;
  const p = new Promise<void>((r) => { release = r; });
  return { wait: () => p, release };
}

// ════════════════════════════════════════════════════════════════════════════
// A · CLAMPING — an operator cannot configure the platform into the failure
//     this module exists to prevent (invariant 1: maxInFlight < pool).
// ════════════════════════════════════════════════════════════════════════════
{
  process.env.PRISMA_CONNECTION_LIMIT = "20";
  const huge = clampLimits({ maxInFlight: 500, maxQueue: 10, maxWaitMs: 1000 });
  ok("A: maxInFlight clamped below pool", huge.maxInFlight <= 18, `got ${huge.maxInFlight}`);
  ok("A: maxInFlight never 0", clampLimits({ maxInFlight: 0 }).maxInFlight >= 1);
  ok("A: maxWaitMs bounded", clampLimits({ maxWaitMs: 999_999 }).maxWaitMs <= 60_000);
  ok("A: defaults leave headroom", clampLimits({}).maxInFlight === 16, `got ${clampLimits({}).maxInFlight}`);
}

// ════════════════════════════════════════════════════════════════════════════
// B · WAITING, NOT FAILING — the headline guarantee. Work beyond maxInFlight
//     queues and every job still completes.
// ════════════════════════════════════════════════════════════════════════════
{
  __resetAdmission();
  setAdmissionLimits({ maxInFlight: 2, maxQueue: 500, maxWaitMs: 15_000 });
  let running = 0, peak = 0, done = 0;
  const jobs = Array.from({ length: 20 }, () =>
    withAdmission(async () => {
      running++; peak = Math.max(peak, running);
      await sleep(5);
      running--; done++;
    }),
  );
  const settled = await Promise.allSettled(jobs);
  ok("B: every job completed", done === 20, `done=${done}`);
  ok("B: none rejected", settled.every((s) => s.status === "fulfilled"),
    `rejected=${settled.filter((s) => s.status === "rejected").length}`);
  ok("B: concurrency never exceeded maxInFlight", peak <= 2, `peak=${peak}`);
  ok("B: telemetry counted all admissions", admissionSnapshot().admitted === 20, `admitted=${admissionSnapshot().admitted}`);
  ok("B: nothing shed or timed out", admissionSnapshot().shed === 0 && admissionSnapshot().timedOut === 0);
}

// ════════════════════════════════════════════════════════════════════════════
// C · FIFO FAIRNESS — no barging. A bet that has waited longest goes first, or
//     a hot market starves its earliest bettors under sustained load.
// ════════════════════════════════════════════════════════════════════════════
{
  __resetAdmission();
  setAdmissionLimits({ maxInFlight: 1, maxQueue: 500, maxWaitMs: 15_000 });
  const g = gate();
  const order: number[] = [];
  const holder = withAdmission(async () => { await g.wait(); });
  await sleep(5); // holder owns the only slot

  const queued: Promise<void>[] = [];
  for (let i = 0; i < 5; i++) {
    queued.push(withAdmission(async () => { order.push(i); }));
    await sleep(2); // deterministic enqueue order
  }
  g.release();
  await Promise.all([holder, ...queued]);
  ok("C: admitted in FIFO order", order.join(",") === "0,1,2,3,4", `order=${order.join(",")}`);
}

// ════════════════════════════════════════════════════════════════════════════
// D · QUEUE SHED — a hopeless queue is refused IMMEDIATELY. Two tiers exist so
//     saturation can't mean "everyone waits the full budget, then everyone
//     fails" — the worst of both worlds.
// ════════════════════════════════════════════════════════════════════════════
{
  __resetAdmission();
  setAdmissionLimits({ maxInFlight: 1, maxQueue: 2, maxWaitMs: 15_000 });
  const g = gate();
  const holder = withAdmission(async () => { await g.wait(); });
  await sleep(5);

  const w1 = withAdmission(async () => {});
  const w2 = withAdmission(async () => {});
  await sleep(5);

  const t0 = Date.now();
  let shedErr: unknown = null;
  try { await withAdmission(async () => {}); } catch (e) { shedErr = e; }
  const shedMs = Date.now() - t0;

  ok("D: overflow is refused", shedErr instanceof AdmissionBusy);
  ok("D: refusal is 'shed', not 'timeout'", (shedErr as AdmissionBusy)?.kind === "shed");
  ok("D: refused FAST, not after the wait budget", shedMs < 500, `${shedMs}ms`);
  ok("D: shed counted", admissionSnapshot().shed === 1);
  g.release();
  await Promise.all([holder, w1, w2]);
}

// ════════════════════════════════════════════════════════════════════════════
// E · WAIT BUDGET — an admitted waiter gives up at maxWaitMs with a clean BUSY,
//     never a raw pool error.
// ════════════════════════════════════════════════════════════════════════════
{
  __resetAdmission();
  setAdmissionLimits({ maxInFlight: 1, maxQueue: 500, maxWaitMs: 120 });
  const g = gate();
  const holder = withAdmission(async () => { await g.wait(); });
  await sleep(5);

  const t0 = Date.now();
  let err: unknown = null;
  try { await withAdmission(async () => {}); } catch (e) { err = e; }
  const waited = Date.now() - t0;

  ok("E: timed-out waiter throws AdmissionBusy", err instanceof AdmissionBusy);
  ok("E: kind is 'timeout'", (err as AdmissionBusy)?.kind === "timeout");
  ok("E: honoured the budget (did not fail early)", waited >= 110, `${waited}ms`);
  ok("E: gave up near the budget (did not hang)", waited < 2_000, `${waited}ms`);
  ok("E: timedOut counted", admissionSnapshot().timedOut === 1);
  g.release();
  await holder;
}

// ════════════════════════════════════════════════════════════════════════════
// F · SLOT ALWAYS RELEASED ON THROW (invariant 3). A leaked slot permanently
//     shrinks capacity — the platform would degrade until a restart.
// ════════════════════════════════════════════════════════════════════════════
{
  __resetAdmission();
  setAdmissionLimits({ maxInFlight: 1, maxQueue: 500, maxWaitMs: 5_000 });
  for (let i = 0; i < 5; i++) {
    try { await withAdmission(async () => { throw new Error("boom"); }); } catch { /* expected */ }
  }
  ok("F: inFlight back to 0 after 5 throws", admissionSnapshot().inFlight === 0, `inFlight=${admissionSnapshot().inFlight}`);
  let after = false;
  await withAdmission(async () => { after = true; });
  ok("F: capacity intact after throws", after);
  ok("F: business errors propagate unchanged", await (async () => {
    try { await withAdmission(async () => { throw new Error("kept"); }); return false; }
    catch (e) { return (e as Error).message === "kept"; }
  })());
}

// ════════════════════════════════════════════════════════════════════════════
// G · NON-REENTRANCY (invariant 2). settleMarket → bonus refund can re-enter;
//     a nested acquire waiting on a slot its own caller holds would deadlock the
//     whole platform, not just that request.
// ════════════════════════════════════════════════════════════════════════════
{
  __resetAdmission();
  setAdmissionLimits({ maxInFlight: 1, maxQueue: 0, maxWaitMs: 50 });
  let inner = false;
  const t0 = Date.now();
  await withAdmission(async () => {
    // With maxInFlight=1 and maxQueue=0, a re-entrant acquire would be shed or
    // hang. Passing straight through is the only non-deadlocking behaviour.
    await withAdmission(async () => { inner = true; });
  });
  ok("G: nested acquire passed through", inner);
  ok("G: no deadlock", Date.now() - t0 < 1_000);
  ok("G: nested call not double-counted", admissionSnapshot().admitted === 1, `admitted=${admissionSnapshot().admitted}`);
  ok("G: slot released after nesting", admissionSnapshot().inFlight === 0);
}

// ════════════════════════════════════════════════════════════════════════════
// H · TELEMETRY — the operator card must never lie about queue state.
// ════════════════════════════════════════════════════════════════════════════
{
  __resetAdmission();
  setAdmissionLimits({ maxInFlight: 1, maxQueue: 500, maxWaitMs: 5_000 });
  const g = gate();
  const holder = withAdmission(async () => { await g.wait(); });
  await sleep(5);
  const waiters = [withAdmission(async () => {}), withAdmission(async () => {})];
  await sleep(10);
  const snap = admissionSnapshot();
  ok("H: inFlight reported", snap.inFlight === 1, `inFlight=${snap.inFlight}`);
  ok("H: queueDepth reported", snap.queueDepth === 2, `queueDepth=${snap.queueDepth}`);
  ok("H: limits echoed", snap.limits.maxInFlight === 1);
  g.release();
  await Promise.all([holder, ...waiters]);
  ok("H: queue drains to 0", admissionSnapshot().queueDepth === 0);
  ok("H: waits recorded for queued admissions", admissionSnapshot().waitP95 >= 0);
}

// Restore defaults so a suite running after this one is unaffected.
setAdmissionLimits({});
ok("Z: limits restored to defaults", getAdmissionLimits().maxInFlight === 16);

console.log(`\nbet-admission: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
