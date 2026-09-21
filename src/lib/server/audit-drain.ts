/**
 * THE SHUTDOWN DRAIN — the process waits for the audit queue before it is allowed to die.
 *
 * ⛔ THE DEFECT, MEASURED NOT ASSUMED (`npm run rehearse:audit-loss-window`, 2026-09-21):
 *   · 467 of the 489 `audit(` call sites in `src/` are un-awaited. The append is queued on ONE
 *     process-wide promise chain, and a process that ENDS takes whatever is queued with it.
 *   · Driven: 10 bare appends then the SIGTERM chain production actually has landed **0 of 10**.
 *     Next's own handler finished about **30 ms** after the appends were queued and called
 *     `process.exit(143)` itself, so the platform's grace period bought nothing.
 *   · `verifyChainFull()` returned `{valid:true, verified:663, linkBroken:false}` over a chain with
 *     40 known-lost appends: a lost append consumes no `seq`, so the integrity check is blind to the
 *     hole by construction. And `auditLog` has only `create` in all of `src/` — the hole is permanent.
 *
 * ⛔ WHY REGISTERING A HANDLER EARLIER DOES NOT FIX IT, and this is the whole difficulty.
 * `next/dist/server/lib/start-server.js:390` registers `process.on('SIGTERM', cleanup)` BEFORE it
 * calls `getRequestHandlers`, and `instrumentation.ts`'s `register()` runs inside that call — so
 * Next's handler is always FIRST in the listener list no matter what this module does. Node runs
 * every listener synchronously in registration order, so ours does get to run; the problem is that
 * Next's handler then finishes its own async cleanup and calls `process.exit(143)` (line 375), which
 * is immediate and uncatchable by any listener. An async drain started on the signal simply loses
 * the race. Measured, not reasoned about: see `rehearse:audit-drain` §2.
 *
 * ⭐ SO THE SIGNAL ONLY ARMS, AND THE **EXIT** IS WHAT IS HELD. `process.exit` is wrapped at install
 * time with a pass-through that changes nothing until a termination signal has been seen. After a
 * signal, the first `process.exit(...)` call — Next's — is recorded and DEFERRED, the queue is
 * drained, and then the real exit runs with the code the caller asked for. Next's call site is
 * `process.exit(143); break;` at the end of an async IIFE with nothing after it, so a deferred return
 * executes no further work.
 *
 * ⭐ AND DRAINING ON THE EXIT RATHER THAN ON THE SIGNAL IS THE CORRECT ORDER, not a convenience.
 * Next's cleanup awaits `server.close()` first, so in-flight requests FINISH — and queue their
 * appends — AFTER the signal. A drain started on the signal would drain an incomplete queue and the
 * last requests' rows would still be lost. The exit call is the instant at which the queue is
 * complete, which is exactly the instant this module drains it.
 *
 * ⛔ IT IS BOUNDED, AND EXCEEDING THE BOUND IS LOUD. An unbounded flush on shutdown turns a deploy
 * into a hang, which is a worse failure than the one being fixed. See `AUDIT_DRAIN_BUDGET_MS` for
 * the number and why it is that number. When the budget runs out the process still exits, and it
 * prints a delimited block naming how many appends were ABANDONED — because a dying process has no
 * other channel, and a silent bound is indistinguishable from no bound at all.
 *
 * ⛔ WHAT IT DOES NOT COVER, stated so it is not mistaken for more. SIGKILL, an OOM kill and
 * `process.abort()` are uncatchable: no drain of any design runs. A power loss is the same. Those
 * remain the residual, and the remedy for the BET row is the declaration in `audit-reconcile.ts`;
 * the irrecoverable access-log class (`player.record_viewed`, `kyc_doc.viewed`,
 * `privacy.dsar.exported`, `transactions.exported`) has no anchor and no reconciler can detect its
 * loss. `plans/house-bots/RELEASE-LADDER.md` §12 is the register.
 *
 * ⛔ THIS IS NOT A SECOND COPY OF `house-bot/worker.ts`'s `flushAuditWithin`. That one is a
 * PER-TICK flush on a live process: it returns a boolean, its deadline timer is deliberately
 * `unref`'d so a finished process can still exit, and its contract is pinned by `test:audit-gap`
 * §4.4/§4.5. This one runs exactly once, in the window between "exit was requested" and "the process
 * is gone", it must report a CENSUS rather than a boolean, and its deadline timer is deliberately
 * REF'd — here the timer is the only thing keeping a finished event loop alive long enough to reach
 * the real exit with the right code. Opposite requirement, opposite implementation.
 */
import { audit, auditFlush, auditPending } from "./audit";

/**
 * THE MARKER THE DRAIN QUEUES BEHIND EVERYTHING ELSE — and it is the strongest evidence in this file.
 *
 * ⭐ THE QUEUE IS FIFO AND PROCESS-WIDE. This row is appended AFTER every append that was already
 * waiting, so if this row is in the table then every append queued before it was written. One
 * durable, HMAC-chained row therefore certifies a whole shutdown, and its ABSENCE marks a shutdown
 * that lost rows — which is precisely the thing nothing on this platform could previously tell.
 *
 * ⛔ AND IT IS WHAT MAKES "DID THE DRAIN EVEN RUN?" ANSWERABLE. A drain only runs if the process is
 * asked to stop in a way it can catch. Railway's own troubleshooting note says a service started
 * through `npm run start` may never receive SIGTERM at all, because the package manager becomes the
 * main process — and 50pick's start command is exactly that. That risk is recorded, with its
 * experiment, in `docs/COMPLIANCE-DECISIONS.md`; THIS row is how the experiment is read: after a
 * deploy, a `system.shutdown_drain` row for the container that went away means the signal arrived
 * and the queue was saved. No row means it did not.
 */
export const SHUTDOWN_DRAIN_ACTION = "system.shutdown_drain";

/**
 * HOW LONG THE PROCESS MAY WAIT FOR THE AUDIT QUEUE BEFORE IT DIES ANYWAY.
 *
 * ⛔ WHY 5,000 ms, and what the number is measured against:
 *  · COST OF BEING TOO SHORT — a lost compliance row, permanently, with the integrity check
 *    reporting the log sound. COST OF BEING TOO LONG — a deploy that hangs. The bound has to sit
 *    under the platform's own SIGTERM-to-SIGKILL grace with room to spare, because past that grace
 *    the wait buys nothing and the rows are lost regardless.
 *  · WHAT THE GRACE IS. Next's own self-hosting guide asks platforms for "10-30 seconds".
 *    Kubernetes' default `terminationGracePeriodSeconds` is 30 s and Docker's default
 *    `--stop-timeout` is 10 s. ⚠️ 50pick's live Railway service has `drainingSeconds: null`
 *    (`docs/RAILWAY-LIVE.md` §2) — the authored `railway.json` value of 30 is NOT in force, because
 *    that file is deprecated and silently ignored (RAILWAY-LIVE trap 13). So the live grace is
 *    Railway's default and this lane could not read it back (the CLI account cannot see the
 *    project). 5,000 ms is therefore chosen against the TIGHTEST of the known defaults, 10 s, and
 *    leaves half of it unused.
 *  · WHAT IT BUYS AT THAT SIZE. The measured append cost is ~4 ms on loopback and a 50-append burst
 *    drained in ~200 ms (`rehearse:audit-loss-window` §3). At 4 ms this covers ~1,250 queued
 *    appends; at a pessimistic 20 ms against a networked Postgres under the chain's DB-global
 *    advisory lock it still covers ~250. The deepest queue anything here has produced is 50.
 *  · AND IT IS NOT TIGHTER THAN THE ROUTINE FLUSH ALREADY IN THE TREE. `house-bot/worker.ts` waits
 *    up to 2,000 ms on every poller tick. A once-per-process-death drain that gave up sooner than a
 *    once-a-second tick would be indefensible.
 *
 * `AUDIT_DRAIN_BUDGET_MS` in the environment overrides it, clamped to `MAX_DRAIN_BUDGET_MS` so a
 * typo cannot convert a deploy into a multi-minute hang, and an unparseable value is reported and
 * ignored rather than silently treated as zero.
 */
export const AUDIT_DRAIN_BUDGET_MS = 5_000;

/** The hard ceiling on the env override. Past 30 s every grace period named above has already
 *  expired, so a larger value could only hang a deploy and could never save a row. */
export const MAX_DRAIN_BUDGET_MS = 30_000;

export function auditDrainBudgetMs(): number {
  const raw = process.env.AUDIT_DRAIN_BUDGET_MS;
  if (raw === undefined || raw.trim() === "") return AUDIT_DRAIN_BUDGET_MS;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    console.error(
      `[audit-drain] AUDIT_DRAIN_BUDGET_MS=${JSON.stringify(raw)} is not a non-negative number — ` +
        `using the ${AUDIT_DRAIN_BUDGET_MS}ms default. A shutdown drain must never be silently disabled by a typo.`,
    );
    return AUDIT_DRAIN_BUDGET_MS;
  }
  return Math.min(Math.round(n), MAX_DRAIN_BUDGET_MS);
}

/** What one shutdown drain did. Printed, and returned to the drills so they can assert on it. */
export type AuditDrainReport = {
  signal: string | null;
  /** Appends queued at the instant the exit was requested — what was at risk. */
  queuedAtExit: number;
  /** Appends STILL queued when the process went. Permanently lost. */
  abandoned: number;
  waitedMs: number;
  budgetMs: number;
  /** True when the queue reached zero inside the budget. */
  drained: boolean;
  exitCode: number | undefined;
};

type DrainState = {
  installed: boolean;
  /** The termination signal seen, or null. Nothing is deferred before this is set. */
  signal: string | null;
  exitRequested: boolean;
  exitCode: number | undefined;
  draining: boolean;
  /** Set once the real exit is about to be called; the wrapper is a pass-through again. */
  finished: boolean;
  realExit: (code?: number) => never;
  budgetMs: number;
  flush: () => Promise<unknown>;
  pending: () => number;
  report: AuditDrainReport | null;
};

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_AUDIT_DRAIN: DrainState | undefined;
}

/** The signals a platform uses to ask this process to stop. Both end in `process.exit` under Next. */
const TERM_SIGNALS = ["SIGTERM", "SIGINT"] as const;

/**
 * Arm the drain. Idempotent — a second call is a no-op and returns false, so an HMR re-import or a
 * double `register()` cannot stack wrappers around `process.exit`.
 *
 * ⛔ THE SEAMS ARE FOR THE DRILLS AND FOR NOTHING ELSE. `flush` and `pending` default to the real
 * audit queue; `scripts/audit-drain.test.mts` substitutes a queue whose depth it controls so the
 * BUDGET path can be driven in CI without a database. `process.exit` is never seamed: every drill
 * here kills a real process through the real call.
 */
export function installAuditShutdownDrain(opts: {
  budgetMs?: number;
  flush?: () => Promise<unknown>;
  pending?: () => number;
} = {}): boolean {
  if (globalThis.__50PICK_AUDIT_DRAIN?.installed) return false;

  const state: DrainState = {
    installed: true,
    signal: null,
    exitRequested: false,
    exitCode: undefined,
    draining: false,
    finished: false,
    // Captured before anything is wrapped, and the ONLY way this module ever ends a process.
    realExit: process.exit.bind(process) as (code?: number) => never,
    budgetMs: opts.budgetMs ?? auditDrainBudgetMs(),
    flush: opts.flush ?? (() => auditFlush()),
    pending: opts.pending ?? auditPending,
    report: null,
  };
  globalThis.__50PICK_AUDIT_DRAIN = state;

  /**
   * ⛔ A PASS-THROUGH UNTIL A SIGNAL ARRIVES. Before `state.signal` is set — i.e. on every ordinary
   * `process.exit` a script or an error path makes — this is byte-for-byte the real exit. The
   * semantics of `process.exit` are only ever altered inside a shutdown, which is the one window
   * where "the caller continues after exit returns" is provably safe (Next's call site is
   * `process.exit(143); break;` with nothing after it).
   */
  const wrapped = function exit(code?: number): never {
    const s = globalThis.__50PICK_AUDIT_DRAIN;
    if (!s || !s.signal || s.finished) return state.realExit(code);
    if (!s.exitRequested) {
      s.exitRequested = true;
      s.exitCode = typeof code === "number" ? code : undefined;
    }
    if (!s.draining) {
      s.draining = true;
      void runDrain(s);
    }
    // Deliberately RETURNS. The drain calls the real exit when the queue is empty or the budget is
    // spent; until then this process must stay alive, which it cannot do if this call exits.
    return undefined as never;
  };
  process.exit = wrapped as typeof process.exit;

  for (const sig of TERM_SIGNALS) {
    /* ⚠️ THIS LISTENER ONLY RECORDS. It deliberately does no work: the drain runs on the exit, for
     * the ordering reason in the header. ⚠️ Registering ANY listener for a signal suppresses Node's
     * default terminate — `lifecycle.ts:603` and `house-bot/engine.ts:305` already do exactly that
     * in this server, so this introduces no behaviour that was not already there, and under Next
     * the exit is guaranteed by Next's own handler. */
    process.once(sig, () => { if (!state.signal) state.signal = sig; });
  }
  /* ⭐ ONE LINE AT BOOT, AND IT IS OPERATIONAL EVIDENCE, NOT DECORATION. Paired with the drain's own
   * line at shutdown it answers the question `docs/COMPLIANCE-DECISIONS.md` AR-2 leaves open:
   * "armed" at boot and NO `[audit-drain]` line when the container goes means the termination signal
   * never reached this process at all — which is the failure Railway's own note describes for a
   * service started through `npm run start`, and which nothing else here can distinguish from a
   * clean shutdown. */
  console.log(`[audit-drain] armed — this process will wait up to ${state.budgetMs}ms for the audit queue on ${TERM_SIGNALS.join("/")}.`);
  return true;
}

/** The last drain's report, once it has run. For the drills; null before a shutdown. */
export function auditDrainReport(): AuditDrainReport | null {
  return globalThis.__50PICK_AUDIT_DRAIN?.report ?? null;
}

/**
 * Wait for the queue to empty, but never past the deadline, then exit for real.
 *
 * ⛔ THE LOOP EXISTS BECAUSE `auditFlush()` CAPTURES THE TAIL AT CALL TIME. An append queued while
 * the flush is in flight is not covered by it, and a shutdown is exactly when a straggler timer or a
 * just-finished request adds one. The loop re-reads the DEPTH and flushes again until the depth is
 * zero or the budget is spent, so what is reported as drained really is empty.
 */
async function runDrain(s: DrainState): Promise<void> {
  /* ⛔ THE EXIT IS IN A `finally`, AND THIS IS THE MOST IMPORTANT LINE IN THE FILE.
   * The wrapper above has already told Next's handler that the process is exiting, and it is not.
   * If ANYTHING in the body below threw — a console write on a closed stream, a future edit, an
   * injected flush — the real exit would never be reached and the deferral would become a HANG on
   * every deploy: a worse failure than the lost rows this module exists to prevent. Structurally
   * impossible, not merely unlikely: once this function is entered the process exits, whatever
   * happens inside it. `test:audit-drain` drives it with a flush that throws on purpose. */
  try {
    await drainBody(s);
  } catch (err) {
    console.error("[audit-drain] the drain itself threw — exiting anyway:", (err as Error)?.message ?? err);
  } finally {
    s.finished = true;
    process.exit = s.realExit as typeof process.exit;
    if (s.exitRequested) s.realExit(s.exitCode);
  }
}

async function drainBody(s: DrainState): Promise<void> {
  const t0 = Date.now();
  const deadline = t0 + s.budgetMs;
  // ⛔ READ THE DEPTH BEFORE THE MARKER IS QUEUED, or the marker counts itself and every shutdown
  // reports one append more than was ever at risk.
  const queuedAtExit = s.pending();
  /* ⛔ QUEUED, NOT AWAITED, AND DELIBERATELY LAST. See SHUTDOWN_DRAIN_ACTION: the queue is FIFO, so
   * this row lands only after everything already waiting has landed — which is what makes its
   * presence a certificate for the whole shutdown and its absence the mark of a lossy one. Awaiting
   * it here would put it AHEAD of the rows it is supposed to vouch for. `audit()` never rejects. */
  void audit({
    category: "SYSTEM",
    action: SHUTDOWN_DRAIN_ACTION,
    actorId: null,
    targetType: null,
    targetId: null,
    payload: { signal: s.signal, queuedAtExit, budgetMs: s.budgetMs, exitCode: s.exitCode ?? null },
  });

  while (Date.now() < deadline) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const expired = new Promise<void>((resolve) => {
      timer = setTimeout(resolve, Math.max(0, deadline - Date.now()));
      /* ⛔ REF'D ON PURPOSE — the OPPOSITE of `house-bot/worker.ts`'s unref'd deadline, and the
       * reason is the situation, not a preference. Every other task on this process has already
       * finished; if this timer did not hold the event loop, Node would find nothing left to do and
       * exit ON ITS OWN with code 0 — turning a deliberate `exit(143)` into a silent clean exit and
       * abandoning the queue anyway. The timer is bounded by the budget, so it cannot hold a process
       * open for longer than the drain is allowed to take. */
    });
    await Promise.race([s.flush().then(() => undefined, () => undefined), expired]);
    if (timer) clearTimeout(timer);
    if (s.pending() === 0) break;
    // A flush that resolves instantly while the depth is still non-zero would spin this loop hot for
    // the whole budget. Give the queue a real slice of the event loop instead — a shutdown must not
    // spend its last seconds burning a core.
    await new Promise((r) => setTimeout(r, Math.min(5, Math.max(0, deadline - Date.now()))));
  }

  const abandoned = s.pending();
  const waitedMs = Date.now() - t0;
  const report: AuditDrainReport = {
    signal: s.signal,
    queuedAtExit,
    abandoned,
    waitedMs,
    budgetMs: s.budgetMs,
    drained: abandoned === 0,
    exitCode: s.exitCode,
  };
  s.report = report;

  if (abandoned === 0) {
    console.log(
      `[audit-drain] ${s.signal ?? "exit"} — audit queue drained before exit: ` +
        `${queuedAtExit} append(s) in ${waitedMs}ms (budget ${s.budgetMs}ms), exiting ${s.exitCode ?? 0}. ` +
        `A ${SHUTDOWN_DRAIN_ACTION} row certifies it in the chain.`,
    );
  } else {
    /* ⛔ LOUD, DELIMITED, AND IT NAMES THE SIZE. A bound that is exceeded silently is worth nothing:
     * nobody can tell a deploy that saved every row from one that dropped forty. This block is the
     * only record that will ever exist of those rows — the append-only log cannot be given them later. */
    console.error(
      "\n" +
        "──────────────────────────────────────────────────────────\n" +
        "[audit-drain] AUDIT DRAIN BUDGET EXCEEDED — COMPLIANCE ROWS WERE LOST\n" +
        `  signal:          ${s.signal ?? "(none)"}\n` +
        `  budget:          ${s.budgetMs}ms  (AUDIT_DRAIN_BUDGET_MS)\n` +
        `  waited:          ${waitedMs}ms\n` +
        `  queued at exit:  ${queuedAtExit}\n` +
        `  ABANDONED:       ${abandoned} append(s) — never written. The audit log is append-only, so\n` +
        "                   they can NEVER be added later, and verifyChainFull() will still report the\n" +
        "                   chain valid: a lost append consumes no sequence number.\n" +
        "  bet rows:        recoverable as a DECLARATION — `npm run audit:gap-sweep` (audit-reconcile.ts).\n" +
        "  access rows:     player.record_viewed / kyc_doc.viewed / privacy.dsar.exported /\n" +
        "                   transactions.exported have NO durable anchor and are gone for good.\n" +
        `  in the chain:    NO ${SHUTDOWN_DRAIN_ACTION} row for this container — its absence is the\n` +
        "                   durable mark of a lossy shutdown, and the only one there will ever be.\n" +
        "──────────────────────────────────────────────────────────",
    );
  }
}
