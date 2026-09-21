/**
 * The child of `audit-drain.test.mts`. It reproduces PRODUCTION'S SHUTDOWN ORDERING exactly —
 * Next's handler registered FIRST, the app's `instrumentation.ts` install second — and then really
 * ends the process. The parent measures the wall clock and the exit code.
 *
 * ⛔ IT MUST BE A SEPARATE PROCESS. The claim under test is "the process waits before it dies". A
 * test that inspects a promise proves nothing; the process has to actually die, through the real
 * `process.exit`, with the real exit code a platform would see.
 *
 * ⛔ AND IT USES A STUB QUEUE ON PURPOSE. This suite runs in CI with no database. The queue's DEPTH
 * and its drain RATE are what the budget logic reads, so they are injected through the module's
 * documented seams (`flush`, `pending`) and driven to order — including the case a real database
 * cannot be asked to produce on demand: a queue that never drains at all. `process.exit` is NOT
 * seamed: every exit below is the real one. The end-to-end proof against a real Postgres, real
 * `audit()` calls and real rows is `npm run rehearse:audit-drain`.
 *
 * MODES (argv[2]):
 *   drained        N appends, each taking WORK_MS, budget ample — the queue must empty and exit 143
 *   no-drain       the same WITHOUT installing the drain — the POSITIVE CONTROL for the harness:
 *                  it must exit fast and leave the queue unfinished
 *   stuck          a queue that never drains, small budget — the budget must fire, LOUDLY, and the
 *                  process must still exit 143 rather than hang
 *   plain-exit     drain installed, NO signal, `process.exit(7)` — must exit immediately with 7
 *   sigint         as `drained` but SIGINT / exit 130 — the code must survive the deferral
 *
 * env: N (appends), WORK_MS (ms per append), BUDGET_MS (drain budget)
 */
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

const mode = process.argv[2] ?? "";
const N = Number(process.env.N ?? 10);
const WORK_MS = Number(process.env.WORK_MS ?? 20);
const BUDGET_MS = Number(process.env.BUDGET_MS ?? 5000);
const ROOT = resolve(import.meta.dirname, "..");

const DRAIN = (await import(pathToFileURL(resolve(ROOT, "src/lib/server/audit-drain.ts")).href)) as {
  installAuditShutdownDrain: (o?: Any) => boolean;
  auditDrainReport: () => Any;
};

const t0 = Date.now();
const say = (m: string) => console.error(`[child ${mode}] +${Date.now() - t0}ms ${m}`);

// ── the stub queue: N appends, one completing every WORK_MS, or never when `stuck` ───────────────
let pending = N;
const waiters: Array<() => void> = [];
if (mode !== "stuck") {
  const t = setInterval(() => {
    if (pending > 0) pending--;
    if (pending === 0) { clearInterval(t); for (const w of waiters.splice(0)) w(); }
  }, WORK_MS);
}
const pendingFn = () => pending;
const flushFn = () =>
  pending === 0 ? Promise.resolve() : new Promise<void>((res) => { waiters.push(res); });

// ── Next's handler, registered FIRST, exactly as start-server.js:390 does ─────────────────────────
// `next/dist/server/lib/start-server.js` registers this BEFORE `getRequestHandlers`, and
// `instrumentation.ts`'s register() runs inside that call — so Next is always first in the listener
// list, its cleanup is async, and IT is what calls process.exit. That ordering is the whole defect.
let cleanupStarted = false;
const nextCleanup = (signal: string) => {
  if (cleanupStarted) return;
  cleanupStarted = true;
  void (async () => {
    await new Promise((res) => setImmediate(res));            // await server.close()
    await Promise.all([Promise.resolve(), Promise.resolve()]); // nextServer.close() + cleanupListeners
    await new Promise((res) => setTimeout(res, 10));           // flushAllTraces()
    say(`Next cleanup finished — calling process.exit(${signal === "SIGINT" ? 130 : 143})`);
    process.exit(signal === "SIGINT" ? 130 : 143);
    // `break;` follows in the real source, and nothing after it. Reaching here is expected once the
    // exit is deferred; it must do no further work.
    say("process.exit returned (deferred) — no further cleanup work follows, as in the real source");
  })();
};
process.on("SIGTERM", () => nextCleanup("SIGTERM"));
process.on("SIGINT", () => nextCleanup("SIGINT"));

// ── the app's instrumentation, SECOND ────────────────────────────────────────────────────────────
if (mode !== "no-drain") {
  const installed = DRAIN.installAuditShutdownDrain({ budgetMs: BUDGET_MS, flush: flushFn, pending: pendingFn });
  say(`drain installed=${installed} budget=${BUDGET_MS}ms`);
  // Idempotence, asserted here rather than only in a static read: a second call must change nothing.
  say(`second install returned ${DRAIN.installAuditShutdownDrain({ budgetMs: 1 })}`);
}

// ⚠️ The parent gives this process FILE descriptors for stdout and stderr, never pipes. On Windows
// `process.stdout` is ASYNCHRONOUS when it is a pipe, so a line written from an `exit` handler — or
// the drain's own loud block, written immediately before the real exit — can be dropped. A file
// descriptor is synchronous on every platform, so nothing the assertions read can be lost.
process.on("exit", () => {
  const r = mode === "no-drain" ? null : DRAIN.auditDrainReport();
  console.log("CHILD " + JSON.stringify({
    mode, N, workMs: WORK_MS, budgetMs: BUDGET_MS,
    pendingAtExit: pending, elapsedMs: Date.now() - t0, report: r,
  }));
});

if (mode === "plain-exit") {
  // No signal at all. The wrapper must be a pass-through: immediate, code preserved.
  say("calling process.exit(7) with NO signal — must be immediate");
  process.exit(7);
  say("!! process.exit(7) RETURNED — the wrapper deferred an ordinary exit, which it must never do");
} else {
  say(`queue seeded: ${pending} append(s) at ${WORK_MS}ms each`);
  // ⚠️ WINDOWS CANNOT DELIVER SIGTERM TO ITSELF: `process.kill(pid,"SIGTERM")` becomes
  // TerminateProcess and no listener ever runs. On Linux, once a listener exists Node suppresses the
  // default terminate and invokes the listeners on the event loop — which is what emit does. The
  // emit is therefore the faithful path on both platforms.
  (process as Any).emit(mode === "sigint" ? "SIGINT" : "SIGTERM");
  // A backstop far past every budget used here: if the drain ever HUNG, this is what proves it, and
  // the parent sees exit 99 instead of 143.
  setTimeout(() => { say("!! backstop fired — the drain never exited"); process.exit(99); }, 60_000);
}
