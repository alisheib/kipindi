/**
 * The child of `audit-drain.mts`. It imports the REAL `src/lib/server/audit.ts` and the REAL
 * `src/lib/server/audit-drain.ts`, reproduces production's shutdown ordering exactly, fires bare
 * un-awaited `audit({…})` calls in the shape `market-service.ts:1699` uses, and then really dies.
 * The parent counts the rows that landed in a real Postgres.
 *
 * ⛔ NOTHING IS STUBBED HERE. `scripts/audit-drain.test.mts` drives the budget logic with an
 * injected queue so it can run in CI without a database; this drives the real queue, the real
 * advisory-locked appender, the real HMAC chain and the real `process.exit`. A drain that has only
 * ever been proven against a stub is a claim.
 *
 * ⛔ THE ORDERING IS THE POINT AND IT IS REPRODUCED, NOT ASSUMED:
 *   1. Next's `cleanup` — `start-server.js:390` registers it BEFORE `getRequestHandlers`, so it is
 *      always first in the listener list, and IT is what calls `process.exit(143)`.
 *   2. `lifecycle.ts:603` and `house-bot/engine.ts:305` — the two app handlers, neither awaiting
 *      the audit queue.
 *   3. `instrumentation.ts`'s `installAuditShutdownDrain()`, which runs inside `getRequestHandlers`
 *      and therefore cannot be earlier than (1) no matter what it does.
 *
 * MODES (argv[2]):
 *   no-drain   the ordering above WITHOUT step 3 — production before tonight. The BEFORE number.
 *   drain      the same with step 3 — the AFTER number.
 *   budget     step 3 with a deliberately tiny AUDIT_DRAIN_BUDGET_MS — the bound, driven.
 *   verify     verifyChainFull() over whatever the earlier runs left, plus a tampered-row control.
 * argv[3] = N, argv[4] = tag stamped into every payload.
 */
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import pg from "pg";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

const mode = process.argv[2] ?? "";
const N = Number(process.argv[3] ?? 10);
const TAG = process.argv[4] ?? "t";
const ROOT = resolve(import.meta.dirname, "..", "..");

const AUD = (await import(pathToFileURL(resolve(ROOT, "src/lib/server/audit.ts")).href)) as {
  audit: (e: Record<string, unknown>) => Promise<unknown>;
  auditPending: () => number;
  verifyChainFull: () => Promise<Record<string, unknown>>;
};
const DRAIN = (await import(pathToFileURL(resolve(ROOT, "src/lib/server/audit-drain.ts")).href)) as {
  installAuditShutdownDrain: () => boolean;
  auditDrainBudgetMs: () => number;
};

/** The bet's statutory row, byte for byte the shape market-service.ts writes. */
const betRow = (i: number) => ({
  category: "BET" as const,
  action: "market.position.opened",
  actorId: `u_${TAG}_${i}`,
  targetType: "Position",
  targetId: `pos_${TAG}_${i}`,
  payload: {
    drill: TAG, i, marketId: `mkt_${TAG}`, side: "UP", stake: 1000, payoutIfWin: 2000,
    kycStatus: "APPROVED", everApproved: true,
  },
});

const t0 = Date.now();
const say = (m: string) => console.error(`[child ${TAG}] +${Date.now() - t0}ms ${m}`);

/** ⛔ THE CHILD'S OWN LIFETIME, stamped from the `exit` handler — the last thing this process does.
 *  The parent cannot use the spawn's wall clock (tsx costs 400-600 ms of start-up that has nothing
 *  to do with the drain), and it cannot use the last `[child]` line either, because the whole point
 *  is the time that passes AFTER the last line the child itself writes. This is that number.
 *  ⚠️ stdout here is a FILE descriptor the parent opened, never a pipe: on Windows a pipe is
 *  asynchronous and a line written from an exit handler can simply be dropped. */
process.on("exit", () => { console.log("LIVED " + JSON.stringify({ tag: TAG, mode, ms: Date.now() - t0 })); });

if (mode === "verify") {
  const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const s = (await c.query<{ mn: string; mx: string; n: string }>(
    `SELECT min(seq) mn, max(seq) mx, count(*) n FROM "AuditLog"`)).rows[0];
  const seqContiguous = Number(s.mx) - Number(s.mn) + 1 === Number(s.n);
  const clean = await AUD.verifyChainFull();
  // PLANTED CONTROL — edit one row in place, the shape the chain exists to catch. Restored after,
  // so the drill leaves the chain exactly as it found it.
  const victim = (await c.query<{ id: string; action: string }>(
    `SELECT id, action FROM "AuditLog" ORDER BY seq DESC LIMIT 1 OFFSET 3`)).rows[0];
  await c.query(`UPDATE "AuditLog" SET action = $2 WHERE id = $1`, [victim.id, victim.action + ".TAMPERED"]);
  const tampered = await AUD.verifyChainFull();
  await c.query(`UPDATE "AuditLog" SET action = $2 WHERE id = $1`, [victim.id, victim.action]);
  await c.end();
  console.log("VERIFY " + JSON.stringify({ seqContiguous, clean, tampered }));
  process.exit(0);
}

// One AWAITED append first, so `hydrate()`, the Prisma pool and the advisory lock are all warm and
// the measurement below is of the drain and not of a cold start.
await AUD.audit({ category: "SYSTEM", action: "drill.warm", actorId: null, targetType: null, targetId: null, payload: { warm: TAG } });

// ── (1) Next's cleanup, registered FIRST ─────────────────────────────────────────────────────────
let cleanupStarted = false;
process.on("SIGTERM", () => {
  if (cleanupStarted) return;
  cleanupStarted = true;
  void (async () => {
    await new Promise((res) => setImmediate(res));             // await server.close()
    await Promise.all([Promise.resolve(), Promise.resolve()]);  // nextServer.close() + cleanupListeners
    say(`Next cleanup finished — calling process.exit(143)`);
    process.exit(143);
  })();
});
// ── (2) the two app handlers production already has, neither awaiting the queue ──────────────────
process.once("SIGTERM", () => { void Promise.resolve(); }); // lifecycle.ts:603 — releaseLeadership
process.once("SIGTERM", () => { void Promise.resolve(); }); // house-bot/engine.ts:305 — stopHouseBotEngine

// ── (3) the app's instrumentation, LAST — exactly where Next runs it ─────────────────────────────
if (mode !== "no-drain") {
  const installed = DRAIN.installAuditShutdownDrain();
  say(`drain installed=${installed} budget=${DRAIN.auditDrainBudgetMs()}ms`);
}

for (let i = 0; i < N; i++) AUD.audit(betRow(i));
say(`fired ${N} bare audit() calls; queue depth now ${AUD.auditPending()}`);
console.log("FIRED " + JSON.stringify({ N, pendingAfterFire: AUD.auditPending(), mode }));

// ⚠️ WINDOWS CANNOT DELIVER SIGTERM TO ITSELF: `process.kill(pid,"SIGTERM")` becomes
// TerminateProcess, the listeners never run, and the process dies with exit code 1 — an honest
// SIGKILL analogue, not a SIGTERM one. On Linux, once a listener exists Node suppresses the default
// terminate and invokes the listeners on the event loop, which is what emit does. The emit is
// therefore the faithful path on both platforms.
(process as Any).emit("SIGTERM");
// Far past every budget used here. If this fires, the drain HUNG, and the parent sees 99 not 143.
setTimeout(() => { say("!! backstop fired — the drain never exited"); process.exit(99); }, 120_000);
