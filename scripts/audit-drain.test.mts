/**
 * `npm run test:audit-drain` — THE GUARD ON THE SHUTDOWN DRAIN.
 *
 * ⛔ WHAT IT DEFENDS. `audit()` is fire-and-forget on a process-wide queue and a process that ENDS
 * takes whatever is queued with it — driven, 10 bare appends plus production's own SIGTERM chain
 * landed 0 of 10, because Next's handler finishes ~30 ms in and calls `process.exit(143)` itself.
 * `src/lib/server/audit-drain.ts` holds that EXIT until the queue is empty or a bounded budget is
 * spent. This suite is what stops that from being quietly undone.
 *
 * ⭐ IT KILLS REAL PROCESSES. §2 spawns children that reproduce production's shutdown ordering —
 * Next's handler registered FIRST, the app's install second — and really exit, through the real
 * `process.exit`, with the real exit code. A drain that has never been killed is a claim.
 *
 * ⛔ EVERY ASSERTION HAS A CONTROL. The static reads are mutated and must FLAG the mutation; §2's
 * first drive is a POSITIVE CONTROL with the drain removed, which must show the loss — otherwise
 * every "drained" below would be measuring a harness that cannot tell the difference.
 *
 * NO DATABASE. The queue's depth and drain rate are injected through the module's documented seams
 * so the BUDGET-EXCEEDED path (a queue that never drains) can be driven at all; `process.exit` is
 * never seamed. The end-to-end drive with a real Postgres, real `audit()` calls and real rows is
 * `npm run rehearse:audit-drain`.
 */
import { spawn } from "node:child_process";
import { closeSync, mkdtempSync, openSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

const ROOT = resolve(import.meta.dirname, "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");
let pass = 0, fail = 0;
const emitted: string[] = [];
function ok(label: string, cond: boolean, detail = ""): boolean {
  emitted.push(label);
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? `\n         ${detail}` : ""}`); }
  return cond;
}
const section = (t: string) => console.log(`\n${t}\n${"─".repeat(Math.min(96, t.length))}`);

const DRAIN_SRC = read("src/lib/server/audit-drain.ts");
const INSTR_SRC = read("src/instrumentation.ts");
const AUDIT_SRC = read("src/lib/server/audit.ts");
const WORKER_SRC = read("src/lib/server/house-bot/worker.ts");

/** Blank comments so a sentence that DESCRIBES the code can never be read as the code. */
function decomment(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")).replace(/\/\/[^\n]*/g, "");
}

/* ═══ §1 · THE WIRING — the drain is installed, first, on the Node runtime ═════════════════════ */
section("§1 · the wiring");

/** Is the drain installed inside instrumentation's nodejs guard, BEFORE the first thing that can
 *  queue an append? `runBootChecks` audits, so "before boot checks" is the real floor. */
function installedFirst(src: string): boolean {
  const code = decomment(src);
  const guard = code.indexOf('NEXT_RUNTIME === "nodejs"');
  const install = code.indexOf("installAuditShutdownDrain(");
  const boot = code.indexOf("runBootChecks(");
  return guard >= 0 && install > guard && boot > install;
}
ok("1.1 · instrumentation.ts installs the shutdown drain on the Node runtime, before anything that can queue an append",
  installedFirst(INSTR_SRC));
ok("1.c1 · PLANTED CONTROL — an instrumentation with the install REMOVED is flagged",
  !installedFirst(INSTR_SRC.replace(/const \{ installAuditShutdownDrain \}[\s\S]*?installAuditShutdownDrain\(\);/, "")));
ok("1.c2 · PLANTED CONTROL — the install moved BELOW runBootChecks is flagged, so 1.1 reads the ORDER and not the mere presence of a call",
  !installedFirst(INSTR_SRC
    .replace(/const \{ installAuditShutdownDrain \}[\s\S]*?installAuditShutdownDrain\(\);/, "")
    .replace(/await runBootChecks\(\);/, "await runBootChecks();\n    installAuditShutdownDrain();")));

/** The counter the drain reports from must be bumped SYNCHRONOUSLY in `audit()`, before the promise
 *  chain is extended — a counter bumped inside the `.then` reads zero for everything still waiting
 *  its turn, which is precisely the set a shutdown loses. */
function countsBeforeQueueing(src: string): boolean {
  const code = decomment(src);
  const bump = code.indexOf("bumpPending(1)");
  const chain = code.indexOf("const run = (globalThis.__50PICK_AUDIT_QUEUE");
  return bump >= 0 && chain > bump;
}
ok("1.2 · audit() counts the append the instant it is QUEUED, not when its turn comes",
  countsBeforeQueueing(AUDIT_SRC));
ok("1.c3 · PLANTED CONTROL — the bump moved inside the queued `.then` is flagged",
  !countsBeforeQueueing(AUDIT_SRC
    .replace(/\n\s*bumpPending\(1\);/, "")
    .replace("await hydrate();", "bumpPending(1);\n      await hydrate();")));
ok("1.3 · and it is decremented on BOTH outcomes — a counter that leaks on a rejection would make every later shutdown report a phantom backlog",
  /run\.then\(\(\) => bumpPending\(-1\), \(\) => bumpPending\(-1\)\)/.test(decomment(AUDIT_SRC)));
ok("1.4 · auditPending() is exported, so the drain can report a SIZE and not just a boolean",
  /export function auditPending\(\): number/.test(AUDIT_SRC));

/* ═══ §2 · THE BOUND — a number, a ceiling, and a reason ═══════════════════════════════════════ */
section("§2 · the bound");
const budget = Number(/export const AUDIT_DRAIN_BUDGET_MS = ([\d_]+)/.exec(DRAIN_SRC)?.[1]?.replace(/_/g, "") ?? NaN);
const ceiling = Number(/export const MAX_DRAIN_BUDGET_MS = ([\d_]+)/.exec(DRAIN_SRC)?.[1]?.replace(/_/g, "") ?? NaN);
const tickBudget = Number(/AUDIT_FLUSH_BUDGET_MS = ([\d_]+)/.exec(WORKER_SRC)?.[1]?.replace(/_/g, "") ?? NaN);
console.log(`  drain budget ${budget}ms · env ceiling ${ceiling}ms · house-bot per-tick flush ${tickBudget}ms`);
ok("2.1 · the budget is a named constant, finite and non-zero — an unbounded drain would turn a deploy into a hang",
  Number.isFinite(budget) && budget > 0);
ok("2.2 · it is not TIGHTER than the per-tick flush already in the tree — a once-per-process-death drain that gave up sooner than a once-a-second tick would be indefensible",
  Number.isFinite(tickBudget) && budget >= tickBudget);
ok("2.3 · it sits under the tightest platform grace named in the module (Docker's 10s default), with room to spare",
  budget <= 10_000 / 2);
ok("2.4 · the env override is CLAMPED, so a typo cannot convert a deploy into a multi-minute hang",
  Number.isFinite(ceiling) && ceiling > budget && /Math\.min\(Math\.round\(n\), MAX_DRAIN_BUDGET_MS\)/.test(DRAIN_SRC));
ok("2.5 · an unparseable override is REPORTED and ignored, never silently treated as zero — a drain disabled by a typo is the failure this whole module exists to prevent",
  /is not a non-negative number/.test(DRAIN_SRC) && /return AUDIT_DRAIN_BUDGET_MS;/.test(DRAIN_SRC));

/** Exceeding the bound must be LOUD: console.error, and it must name the size of the loss. */
function loudOnExceed(src: string): boolean {
  const code = decomment(src);
  const i = code.indexOf("ABANDONED:");
  if (i < 0) return false;
  const before = code.slice(0, i);
  // The nearest console call ABOVE the block must be console.error, and the block must carry the
  // interpolated count — a loud block that does not say how many is not a measurement.
  return before.lastIndexOf("console.error(") > before.lastIndexOf("console.log(") && /\$\{abandoned\}/.test(code);
}
ok("2.6 · exceeding the budget is LOUD and names the SIZE — a bound that is exceeded silently is worth nothing",
  loudOnExceed(DRAIN_SRC));
ok("2.c1 · PLANTED CONTROL — the same module with every console.error downgraded to console.log is flagged",
  !loudOnExceed(DRAIN_SRC.replace(/console\.error\(/g, "console.log(")));

/* ═══ §3 · THE MECHANISM — a pass-through until a signal, and a REF'd deadline ═════════════════ */
section("§3 · the mechanism");
const DRAIN_CODE = decomment(DRAIN_SRC);
function passThroughUntilSignal(code: string): boolean {
  return /if \(!s \|\| !s\.signal \|\| s\.finished\) return state\.realExit\(code\);/.test(code);
}
ok("3.1 · the process.exit wrapper is a PASS-THROUGH until a termination signal has been seen — ordinary exits keep byte-identical semantics",
  passThroughUntilSignal(DRAIN_CODE));
ok("3.c1 · PLANTED CONTROL — a wrapper that defers EVERY exit is flagged",
  !passThroughUntilSignal(DRAIN_CODE.replace(/if \(!s \|\| !s\.signal \|\| s\.finished\) return state\.realExit\(code\);/, "if (!s) return state.realExit(code);")));
ok("3.2 · the drain runs on the EXIT, not on the signal — Next closes the server and finishes in-flight requests AFTER the signal, so a signal-time drain would drain an incomplete queue",
  /THE SIGNAL ONLY ARMS/.test(DRAIN_SRC) && /if \(!s\.draining\) \{\s*\n\s*s\.draining = true;\s*\n\s*void runDrain\(s\);/.test(DRAIN_CODE));
function refdDeadline(code: string): boolean {
  // The deadline timer must NOT be unref'd here: with every other task finished, an unref'd timer
  // lets Node exit on its own with code 0 and abandon the queue anyway.
  return !/unref/.test(code);
}
ok("3.3 · the deadline timer is REF'd — an unref'd one would let a finished event loop exit on its own with code 0 and abandon the queue",
  refdDeadline(DRAIN_CODE));
ok("3.c2 · PLANTED CONTROL — an unref'd deadline is flagged",
  !refdDeadline(DRAIN_CODE.replace("timer = setTimeout(resolve", "timer = setTimeout(resolve); (timer as any).unref?.(); void (() => setTimeout(resolve")));
ok("3.4 · the only thing that ever ends the process is the exit captured BEFORE the wrapper was installed",
  /realExit: process\.exit\.bind\(process\)/.test(DRAIN_CODE)
  && (DRAIN_CODE.match(/s\.realExit\(|state\.realExit\(/g) ?? []).length >= 2
  && !/process\.kill\(/.test(DRAIN_CODE));
ok("3.5 · the flush LOOPS on the depth — auditFlush() captures the tail at call time, so an append queued during the flush would otherwise be reported as drained when it was not",
  /while \(Date\.now\(\) < deadline\)/.test(DRAIN_CODE) && /if \(s\.pending\(\) === 0\) break;/.test(DRAIN_CODE));
ok("3.6 · installation is idempotent — an HMR re-import or a second register() must not stack wrappers around process.exit",
  /if \(globalThis\.__50PICK_AUDIT_DRAIN\?\.installed\) return false;/.test(DRAIN_CODE));

/** The certificate: one row queued BEHIND everything else. The queue is FIFO, so its presence in the
 *  table means every append queued before it landed — the only durable answer to "did this container
 *  drain?" once its log has rotated away. It must be read AFTER the depth (or it counts itself) and
 *  queued, never awaited (or it would overtake the rows it vouches for). */
function certificateQueuedLast(code: string): boolean {
  const depth = code.indexOf("const queuedAtExit = s.pending();");
  const mark = code.indexOf("action: SHUTDOWN_DRAIN_ACTION");
  const loop = code.indexOf("while (Date.now() < deadline)");
  return depth >= 0 && mark > depth && loop > mark
    && /void audit\(\{/.test(code) && !/await audit\(\{/.test(code);
}
ok("3.7 · the drain leaves a DURABLE certificate — a system.shutdown_drain row queued after the depth is read and before the flush loop, so FIFO puts it behind every row it vouches for",
  certificateQueuedLast(DRAIN_CODE));
ok("3.c3 · PLANTED CONTROL — the certificate AWAITED (which would put it ahead of the rows it vouches for) is flagged",
  !certificateQueuedLast(DRAIN_CODE.replace("void audit({", "await audit({")));
ok("3.c4 · PLANTED CONTROL — the depth read AFTER the certificate is queued (so the shutdown counts its own marker) is flagged",
  !certificateQueuedLast(DRAIN_CODE
    .replace("const queuedAtExit = s.pending();", "")
    .replace("while (Date.now() < deadline)", "const queuedAtExit = s.pending();\n  while (Date.now() < deadline)")));

/* ═══ §4 · THE DRIVE — real processes, really killed ══════════════════════════════════════════ */
section("§4 · the drive — real child processes, real exits");

const OUT = mkdtempSync(join(tmpdir(), "audit-drain-"));
const CHILD = join(ROOT, "scripts", "audit-drain-child.mts");
type Run = { code: number; out: string; err: string; child: Any; ms: number };

function drive(mode: string, env: Record<string, string>): Promise<Run> {
  return new Promise((done) => {
    // ⚠️ FILE descriptors, never pipes: on Windows `process.stdout` is ASYNCHRONOUS when it is a
    // pipe, so the drain's loud block — written immediately before the real exit — can be dropped.
    const op = join(OUT, `${mode}.out`), ep = join(OUT, `${mode}.err`);
    const ofd = openSync(op, "w"), efd = openSync(ep, "w");
    const t0 = Date.now();
    const c = spawn(process.execPath, [join(ROOT, "node_modules", "tsx", "dist", "cli.mjs"), CHILD, mode], {
      cwd: ROOT,
      env: { ...process.env, NODE_ENV: "test", ...env },
      stdio: ["ignore", ofd, efd],
    });
    const finish = (code: number) => {
      const ms = Date.now() - t0;
      try { closeSync(ofd); } catch { /* already closed */ }
      try { closeSync(efd); } catch { /* already closed */ }
      const out = readFileSync(op, "utf8"), err = readFileSync(ep, "utf8");
      const l = out.split("\n").find((x) => x.startsWith("CHILD "));
      done({ code, out, err, ms, child: l ? JSON.parse(l.slice(6)) : null });
    };
    c.on("close", (code) => finish(code ?? -1));
    c.on("error", () => finish(-1));
  });
}
const show = (r: Run) => r.err.split("\n").filter((l) => l.startsWith("[child")).map((l) => `         ${l}`).join("\n");
/** ⛔ THE CHILD'S OWN CLOCK, never the spawn's. `tsx` costs 400-600 ms of start-up before the first
 *  line of the child runs, and the first version of this suite compared that wall time against a
 *  200 ms queue — which made a 266 ms IMMEDIATE exit look like a deferral and failed a control that
 *  was actually correct. The number under test is how long the child lived AFTER it was ready. */
const lived = (r: Run): number => Number(r.child?.elapsedMs ?? NaN);

const N = 10, WORK_MS = 20;
const QUEUE_MS = N * WORK_MS; // the stub queue needs at least this long to empty

// ── POSITIVE CONTROL FIRST ───────────────────────────────────────────────────────────────────────
// Without the drain the process must die with the queue unfinished. If it does NOT, this harness
// cannot see the defect and every "drained" below would be meaningless.
const ctl = await drive("no-drain", { N: String(N), WORK_MS: String(WORK_MS) });
console.log(`  POSITIVE CONTROL population: ${N} queued append(s) at ${WORK_MS}ms each = ${QUEUE_MS}ms of queue`);
console.log(show(ctl));
ok("4.c1 · POSITIVE CONTROL — with NO drain installed, production's own SIGTERM chain exits 143 with the queue still unfinished",
  ctl.code === 143 && ctl.child?.pendingAtExit > 0 && lived(ctl) < QUEUE_MS,
  `exit ${ctl.code}, pendingAtExit ${ctl.child?.pendingAtExit}, child lived ${lived(ctl)}ms (queue needs ${QUEUE_MS}ms)`);

// ── the drain, on the same population ────────────────────────────────────────────────────────────
const ok1 = await drive("drained", { N: String(N), WORK_MS: String(WORK_MS), BUDGET_MS: "5000" });
console.log(show(ok1));
ok("4.1 · WITH the drain, the same shutdown waits and the queue reaches ZERO before the process dies",
  ok1.code === 143 && ok1.child?.pendingAtExit === 0 && ok1.child?.report?.drained === true
  && ok1.child?.report?.abandoned === 0,
  `exit ${ok1.code}, pendingAtExit ${ok1.child?.pendingAtExit}, report ${JSON.stringify(ok1.child?.report)}`);
ok("4.2 · and it really WAITED — the process outlived the queue it was draining, on its OWN clock",
  lived(ok1) >= QUEUE_MS * 0.8 && lived(ok1) > lived(ctl) && ok1.child?.report?.queuedAtExit === N,
  `child lived ${lived(ok1)}ms for a ${QUEUE_MS}ms queue (the un-drained control lived ${lived(ctl)}ms); queuedAtExit ${ok1.child?.report?.queuedAtExit}`);
ok("4.3 · the exit CODE survives the deferral — a platform must still see 143 for a SIGTERM",
  ok1.code === 143 && ok1.child?.report?.exitCode === 143);
ok("4.4 · a second install is refused — the wrapper is never stacked",
  /second install returned false/.test(ok1.err));

// ── the budget, on a queue that never drains ─────────────────────────────────────────────────────
const stuck = await drive("stuck", { N: String(N), BUDGET_MS: "300" });
console.log(show(stuck));
ok("4.5 · a queue that NEVER drains does not hang the deploy — the budget fires and the process still exits 143, well inside the budget plus slack",
  stuck.code === 143 && lived(stuck) < 300 + 1_000, `exit ${stuck.code}, child lived ${lived(stuck)}ms on a 300ms budget`);
ok("4.6 · and it waited the whole budget before giving up",
  stuck.child?.report?.waitedMs >= 250, `waited ${stuck.child?.report?.waitedMs}ms of a 300ms budget`);
ok("4.7 · the loss is LOUD and NAMED — the block appears on stderr with the abandoned count, because a dying process has no other channel",
  /AUDIT DRAIN BUDGET EXCEEDED/.test(stuck.err) && new RegExp(`ABANDONED:\\s+${N} append`).test(stuck.err),
  stuck.err.split("\n").filter((l) => /ABANDONED|EXCEEDED/.test(l)).join(" | "));
ok("4.8 · and the report says so in data, not only in prose",
  stuck.child?.report?.drained === false && stuck.child?.report?.abandoned === N);

// ── the pass-through: an ordinary exit is untouched ──────────────────────────────────────────────
const plain = await drive("plain-exit", { N: String(N), WORK_MS: String(WORK_MS), BUDGET_MS: "5000" });
console.log(show(plain));
ok("4.9 · PLANTED CONTROL — with the drain installed but NO signal, process.exit(7) is immediate and keeps its code: the wrapper must not change ordinary exit semantics",
  plain.code === 7 && lived(plain) < QUEUE_MS && !/RETURNED/.test(plain.err),
  `exit ${plain.code}, child lived ${lived(plain)}ms (a deferred one would have taken >= ${QUEUE_MS}ms)`);

// ── SIGINT keeps its own code ────────────────────────────────────────────────────────────────────
const sigint = await drive("sigint", { N: String(N), WORK_MS: String(WORK_MS), BUDGET_MS: "5000" });
console.log(show(sigint));
ok("4.10 · SIGINT drains too, and exits 130 — the drain must not collapse every shutdown onto one code",
  sigint.code === 130 && sigint.child?.report?.drained === true && sigint.child?.report?.signal === "SIGINT",
  `exit ${sigint.code}, report ${JSON.stringify(sigint.child?.report)}`);

/* ═══ ROLL-CALL ═══════════════════════════════════════════════════════════════════════════════ */
console.log(`\n${"─".repeat(78)}`);
console.log(`  audit-drain: ${pass} passed, ${fail} failed, ${emitted.length} assertion(s) emitted`);
console.log(`  controls among them: ${emitted.filter((l) => /CONTROL/.test(l)).length}`);
console.log(`${"─".repeat(78)}`);
if (emitted.length === 0) { console.error("!! no assertion ran — a suite over zero passes."); process.exit(3); }
process.exit(fail > 0 ? 1 : 0);
