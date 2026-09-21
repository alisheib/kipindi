/**
 * The child of `audit-loss-window.mts`. It imports the REAL `src/lib/server/audit.ts` and fires
 * bare, un-awaited `audit({…})` calls in exactly the shape `market-service.ts:1699` uses, then ends
 * the process the way the mode says. The parent counts what landed.
 *
 * ⛔ IT MUST BE A SEPARATE PROCESS. The claim under test is "a process that ends loses the queued
 * append". A test that only inspects the queue proves nothing; the process has to actually die.
 *
 * MODES (argv[2]):
 *   bare-exit        fire N, then process.exit(0) — a hard kill / an exit(143) with nothing in flight
 *   flush-exit       fire N, await auditFlush(), then exit  (the parent's POSITIVE CONTROL)
 *   seq-exit-<ms>    do <ms> of work, fire one, repeat N times, exit on the last return — the
 *                    sequential shape that loses EXACTLY ONE
 *   sigterm          fire N, then run the handler chain production actually has and exit(143)
 *   burst            fire N at once and sample the backlog until it drains
 *   await-cost       AWAIT N concurrent appends and report the latency each caller would have paid
 *   verify           verifyChainFull() over the chain, then tamper one row in place and verify again
 *   recon            commit N position rows, queue N bare appends, hard-exit mid-drain
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
  auditFlush: () => Promise<unknown>;
  verifyChainFull: () => Promise<Record<string, unknown>>;
};

/** The bet's statutory row, byte for byte the shape market-service.ts writes. */
const betRow = (i: number, house = false) => ({
  category: "BET" as const,
  action: "market.position.opened",
  actorId: `u_${TAG}_${i}`,
  targetType: "Position",
  targetId: `pos_${TAG}_${i}`,
  payload: {
    drill: TAG, i, marketId: `mkt_${TAG}`, side: "UP", stake: 1000, payoutIfWin: 2000,
    kycStatus: "APPROVED", everApproved: true,
    ...(house ? { houseBotId: `bot_${TAG}`, intentId: `hbi_${TAG}_${i}` } : {}),
  },
});

const client = () => new pg.Client({ connectionString: process.env.DATABASE_URL });
const t0 = Date.now();

if (mode === "verify") {
  const c = client();
  await c.connect();
  const s = (await c.query<{ mn: string; mx: string; n: string }>(
    `SELECT min(seq) mn, max(seq) mx, count(*) n FROM "AuditLog"`)).rows[0];
  const seqContiguous = Number(s.mx) - Number(s.mn) + 1 === Number(s.n);
  const clean = await AUD.verifyChainFull();
  // PLANTED CONTROL — edit one row in place, the shape the chain exists to catch. Restored after.
  const victim = (await c.query<{ id: string; action: string }>(
    `SELECT id, action FROM "AuditLog" ORDER BY seq DESC LIMIT 1 OFFSET 3`)).rows[0];
  await c.query(`UPDATE "AuditLog" SET action = $2 WHERE id = $1`, [victim.id, victim.action + ".TAMPERED"]);
  const tampered = await AUD.verifyChainFull();
  await c.query(`UPDATE "AuditLog" SET action = $2 WHERE id = $1`, [victim.id, victim.action]);
  await c.end();
  console.log("VERIFY " + JSON.stringify({ seqContiguous, clean, tampered }));
  process.exit(0);
}

if (mode === "recon") {
  /* ⛔ THE HOLE IS NOW MADE BY CONSTRUCTION, NOT BY A RACE — and that is a repair, not a relaxation.
   * This drill used to commit N positions, fire N BARE appends and hard-exit after 150 ms, then let
   * the parent measure whatever the race happened to produce. On a quiet machine all 40 landed, so
   * §5.1 passed VACUOUSLY over a hole of zero; on a loaded one none landed, `landedIds.length` was 0
   * and the POSITIVE CONTROL §5.c1 FAILED — observed on this machine, 2026-09-21, while four lanes
   * were running. Both the LANDED set and the LOST set are now known before the child starts: the
   * first half is AWAITED (so those rows certainly exist) and the second half is fired bare and the
   * process ends on the same tick (so those certainly do not). The detector is then measured against
   * a hole whose exact membership is known, which is strictly more than it was measured against. */
  const killMs = Number(process.env.RECON_KILL_MS ?? 0);
  const landFirst = Math.max(1, Math.floor(N / 2));
  const c = client();
  await c.connect();
  // A stand-in for Position: the real table needs a User and a PredictionMarket, and the anchor
  // property under test is only "a row committed inside the bet's own transaction, keyed by the id
  // the audit row targets". Every third one is a house bet, as `Position.houseBotId` records it.
  await c.query(`CREATE TABLE IF NOT EXISTS "DrillPosition" (
    "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "houseBotId" TEXT,
    "stake" BIGINT NOT NULL, "placedAt" TIMESTAMPTZ NOT NULL DEFAULT now())`);
  for (let i = 0; i < N; i++) {
    await c.query(`INSERT INTO "DrillPosition"("id","userId","houseBotId","stake") VALUES ($1,$2,$3,$4)`,
      [`pos_${TAG}_${i}`, `u_${TAG}_${i}`, i % 3 === 0 ? `bot_${TAG}` : null, 1000]);
  }
  await c.end();
  // The money is committed. The first half of the compliance rows is AWAITED — those certainly land.
  for (let i = 0; i < landFirst; i++) await AUD.audit(betRow(i, i % 3 === 0));
  // The rest are fired BARE, exactly as market-service.ts:1699 does, and the process ends before any
  // of them can reach the database. Those certainly do not land.
  for (let i = landFirst; i < N; i++) AUD.audit(betRow(i, i % 3 === 0));
  console.log("RECON " + JSON.stringify({ positions: N, landFirst, expectedHole: N - landFirst, killMs }));
  console.error(`[child ${TAG}] ${N} positions committed, ${landFirst} rows awaited, ${N - landFirst} bare appends queued; exiting now`);
  if (killMs > 0) setTimeout(() => process.exit(0), killMs);
  else process.exit(0);
} else if (mode === "burst") {
  // one awaited append first, so the burst measures steady state and not hydrate + pool warm-up
  await AUD.audit({ category: "SYSTEM", action: "drill.warm", actorId: null, targetType: null, targetId: null, payload: { warm: TAG } });
  const c = client();
  await c.connect();
  const landed = async () => Number((await c.query<{ n: number }>(
    `SELECT count(*)::int n FROM "AuditLog" WHERE "payload"->>'drill' = $1`, [TAG])).rows[0].n);
  const b0 = Date.now();
  for (let i = 0; i < N; i++) AUD.audit(betRow(i));
  const fireMs = Date.now() - b0;
  let l = 0;
  const backlogAt100 = { v: -1 };
  while (l < N && Date.now() - b0 < 120_000) {
    if (backlogAt100.v < 0 && Date.now() - b0 >= 100) backlogAt100.v = N - l;
    await new Promise((r) => setTimeout(r, 25));
    l = await landed();
  }
  const drainMs = Date.now() - b0;
  await c.end();
  console.log("BURST " + JSON.stringify({
    N, fireMs, drainMs, meanAppendMs: Math.round((drainMs / N) * 100) / 100,
    stillUnwrittenAt100ms: backlogAt100.v,
  }));
  process.exit(0);
} else if (mode === "await-cost") {
  await AUD.audit({ category: "SYSTEM", action: "drill.warm", actorId: null, targetType: null, targetId: null, payload: { warm: TAG } });
  const a0 = Date.now();
  const waits = await Promise.all(Array.from({ length: N }, (_, i) => {
    const s = Date.now();
    return AUD.audit(betRow(i)).then(() => Date.now() - s);
  }));
  await AUD.auditFlush();
  const total = Date.now() - a0;
  waits.sort((x, y) => x - y);
  const pct = (p: number) => waits[Math.min(waits.length - 1, Math.floor((p / 100) * waits.length))];
  console.log("AWAITCOST " + JSON.stringify({
    concurrentBets: N, totalMs: total,
    addedLatencyMs: { min: waits[0], p50: pct(50), p90: pct(90), p99: pct(99), max: waits[waits.length - 1] },
    sustainedAppendsPerSec: Math.round((N / total) * 1000),
  }));
  process.exit(0);
} else if (mode.startsWith("seq-exit-")) {
  const gap = Number(mode.slice("seq-exit-".length));
  for (let i = 0; i < N; i++) {
    // The work of placing the bet comes FIRST; the bare append is the LAST thing placeHouseBet does
    // before it returns, and the rehearsal worker exited straight after the final return. That
    // ordering is the whole reason the loss was "exactly one".
    await new Promise((r) => setTimeout(r, gap));
    AUD.audit(betRow(i));
  }
  console.error(`[child ${TAG}] sequential producer done (${gap}ms between bets), hard exit on the last return`);
  process.exit(0);
} else {
  for (let i = 0; i < N; i++) AUD.audit(betRow(i));
  console.error(`[child ${TAG}] fired ${N} bare audit() calls in ${Date.now() - t0}ms, mode=${mode}`);
  if (mode === "bare-exit") {
    process.exit(0);
  } else if (mode === "flush-exit") {
    await AUD.auditFlush();
    console.error(`[child ${TAG}] auditFlush() resolved after ${Date.now() - t0}ms`);
    process.exit(0);
  } else if (mode === "sigterm") {
    // The handler chain production actually has, in production's registration order.
    // Next's start-server cleanup is registered first (it is installed before the app's
    // instrumentation register() runs) and it is the one that calls process.exit(143).
    // Neither it nor either app handler awaits the audit queue.
    let started = false;
    process.on("SIGTERM", () => {
      if (started) return;
      started = true;
      void (async () => {
        await new Promise((res) => setImmediate(res));          // Next: await server.close()
        await Promise.all([Promise.resolve(), Promise.resolve()]); // nextServer.close() + cleanupListeners
        console.error(`[child ${TAG}] Next cleanup finished ${Date.now() - t0}ms after the appends were queued — process.exit(143)`);
        process.exit(143);
      })();
    });
    process.once("SIGTERM", () => { void Promise.resolve(); }); // lifecycle.ts:554 — releaseLeadership, not awaited
    process.once("SIGTERM", () => { void Promise.resolve(); }); // engine.ts:305 — stopHouseBotEngine, no flush
    // ⚠️ WINDOWS CANNOT DELIVER A REAL SIGTERM: process.kill on your own pid goes to
    // TerminateProcess, the listeners never run, and the process dies with exit code 1 — an honest
    // SIGKILL/OOM analogue, not a SIGTERM one. On Linux, once a listener exists Node suppresses the
    // default terminate and invokes the listeners on the event loop, which is what emit does. So the
    // emit is the faithful path on both platforms, and --real-kill is kept for the SIGKILL analogue.
    if (process.argv.includes("--real-kill")) process.kill(process.pid, "SIGTERM");
    else (process as Any).emit("SIGTERM");
    await new Promise((r) => setTimeout(r, 30_000)); // the handler's exit(143) beats this
  } else {
    console.error(`[child ${TAG}] unknown mode ${mode}`);
    process.exit(2);
  }
}
