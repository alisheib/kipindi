/**
 * e2e:maswali-fault — A WEEK'S SETTLEMENT UNDER FAULT, ON A REAL POSTGRES (MASWALI-BUILD S3; MASWALI-PLAN §7b S3 suites).
 *
 *   npm run e2e:maswali-fault     (boots the on-box Postgres through db-scratch; ⛔ NO POSTGRES IS A FAILURE)
 *
 *   §1 ⭐ 10,000 tickets settle inside the transaction budget — and a settlement KILLED while it holds its row locks
 *      leaves NOTHING behind: the week RESOLVING, every ticket LIVE, every position OPEN, no ledger line, no payout. The
 *      resumed release then pays exactly once.
 *   §2 ⭐ two processes release the same week at the same instant: one settles it, the other answers "already settled",
 *      and every winner is paid once.
 *   Both end on the trial balance and the Millionea invariants.
 *
 * Each act is its own OS process (`scripts/lib/maswali-fault-child.mts`) on one scratch database, so the advisory locks,
 * the rollback of a dead client's transaction and the cross-process race are Postgres's own, not a simulation.
 * ⛔ Loopback clusters only (the database is dropped and created). Run it detached under the heavy-node lock.
 */
import { spawn, spawnSync, execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHILD = "scripts/lib/maswali-fault-child.mts";
let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };
const J = (x: unknown) => JSON.stringify(x);

const RAW = process.env.VERIFY_DATABASE_URL ?? "";
if (!RAW) { console.error("!! NOT MEASURED — run `npm run e2e:maswali-fault`, which boots a local cluster."); process.exit(3); }
const host = (() => { try { return new URL(RAW).hostname; } catch { return ""; } })();
if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) { console.error("!! refusing: loopback clusters only."); process.exit(2); }
const BASE = RAW.replace(/\/[^/?]*(\?.*)?$/, "");
const DB = `mlw_fault_${process.pid}`;
const URL_ = `${BASE}/${DB}?connect_timeout=30`;
const ENV = { ...process.env, DATABASE_URL: URL_, USE_PRISMA_DAL: "true", HB_MONEY_STORE: "postgres" };

const tag = (outText: string, name: string) => {
  const m = new RegExp(`@@${name} (\\{.*\\})`).exec(outText);
  return m ? JSON.parse(m[1]) : null;
};
const runSync = (env: Record<string, string>, timeoutMs = 30 * 60_000) => {
  const r = spawnSync("npx", ["tsx", CHILD], { cwd: ROOT, env: { ...ENV, ...env }, encoding: "utf8", shell: process.platform === "win32", timeout: timeoutMs, maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0) process.stderr.write(`${r.stdout ?? ""}${r.stderr ?? ""}`.slice(-4000));
  return `${r.stdout ?? ""}`;
};
// ⛔ POSIX: the child leads its own process group (`detached`), so killTree's group kill reaches npx, tsx and the node that
//    holds the transaction. Without it `-pid` names no group, the kill throws, and the "killed" release runs on and commits
//    (seen on Linux CI, 2026-10-22: §1 read a settled week). 1.2 therefore also asks that the release never finished.
const runAsync = (env: Record<string, string>) => {
  const child = spawn("npx", ["tsx", CHILD], { cwd: ROOT, env: { ...ENV, ...env }, shell: process.platform === "win32", detached: process.platform !== "win32" });
  let text = "";
  child.stdout.on("data", (d) => { text += String(d); });
  child.stderr.on("data", (d) => { text += String(d); });
  const done = new Promise<string>((resolve) => child.on("exit", () => resolve(text)));
  return { child, done };
};
/** Kills the child's whole tree; false when no kill could be delivered. */
const killTree = (pid: number): boolean => {
  try {
    if (process.platform === "win32") execSync(`taskkill /PID ${pid} /T /F`, { stdio: "ignore" });
    else process.kill(-pid, "SIGKILL");
    return true;
  } catch { return false; }
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const admin = new pg.Client({ connectionString: RAW });
await admin.connect();
await admin.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`);
await admin.query(`CREATE DATABASE "${DB}"`);
await admin.end();
const watch = new pg.Client({ connectionString: URL_ });
try {
  const mig = spawnSync("npx", ["prisma", "migrate", "deploy"], { cwd: ROOT, env: ENV, encoding: "utf8", shell: process.platform === "win32", timeout: 10 * 60_000 });
  ok("0.migrate · prisma migrate deploy applies every migration", mig.status === 0, (mig.stderr ?? "").split("\n").slice(-3).join(" "));
  if (mig.status !== 0) throw new Error("migrate failed");
  await watch.connect();

  // ── §1 · 10,000 tickets; a kill mid-transaction; the resume ──────────────────
  console.log("\n§1 · 10,000 tickets, a settlement killed mid-transaction, and the resume");
  const t0 = Date.now();
  const seed = tag(runSync({ MLN_FAULT_MODE: "seed", MLN_FAULT_SETUP: "1", MLN_FAULT_AHEAD: "2", MLN_FAULT_TICKETS: "10000", MLN_FAULT_WINNERS: "3" }), "SEED");
  ok("1.1 · 10,000 tickets sold through the one bet path, closed and sealed", !!seed, `${Math.round((Date.now() - t0) / 1000)} s`);
  if (!seed) throw new Error("seed failed");
  const envWeek = { MLN_FAULT_WEEK: seed.weekId, MLN_FAULT_AT: seed.at, MLN_FAULT_WINNERS_JSON: J(seed.winners) };
  const before = tag(runSync({ MLN_FAULT_MODE: "check", ...envWeek }), "CHECK");

  // Start a release, and kill it the moment its backend holds a row lock on "Position" inside its transaction.
  const run = runAsync({ MLN_FAULT_MODE: "settle", ...envWeek });
  let killedInTx = false, delivered = false;
  for (let i = 0; i < 6_000 && !killedInTx; i++) {
    const r = await watch.query(`SELECT count(*)::int AS n FROM pg_locks l JOIN pg_class c ON c.oid = l.relation
      WHERE c.relname = 'Position' AND l.mode = 'RowExclusiveLock' AND l.granted AND l.pid <> pg_backend_pid()`);
    if (r.rows[0].n > 0) { delivered = killTree(run.child.pid!); killedInTx = true; break; }
    if (run.child.exitCode !== null) break;
    await sleep(15);
  }
  // A release the kill missed runs to its end and prints its result: then nothing below would be a fault's aftermath.
  const ranOn = tag(await run.done, "RESULT");
  ok("1.2 · the release was killed while its transaction held its row locks, and never finished",
    killedInTx && delivered && ranOn === null,
    !killedInTx ? "the release ended before the lock was seen" : !delivered ? "the kill could not be delivered" : ranOn ? `the release ran on: ${J(ranOn)}` : "");
  // The dead client's backend rolls back; wait until no backend but this one is left on the database.
  for (let i = 0; i < 200; i++) {
    const r = await watch.query(`SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`, [DB]);
    if (r.rows[0].n === 0) break;
    await sleep(100);
  }
  const afterKill = tag(runSync({ MLN_FAULT_MODE: "check", ...envWeek }), "CHECK");
  ok("1.3 · ⭐ nothing partial: the week is still RESOLVING, unsettled", afterKill?.state === "RESOLVING" && afterKill?.settledAt === null, J(afterKill && { state: afterKill.state, settledAt: afterKill.settledAt }));
  ok("1.4 · ⭐ …every ticket LIVE, every position OPEN, no ledger line, no payout, every wallet as it was",
    afterKill?.live === 10_000 && afterKill?.open === 10_000 && afterKill?.groupLines === 0 && afterKill?.payouts === 0 && J(afterKill?.balances) === J(before?.balances),
    J(afterKill && { live: afterKill.live, open: afterKill.open, groupLines: afterKill.groupLines, payouts: afterKill.payouts }));
  ok("1.5 · …and the pool still holds all 10,000 stakes", afterKill?.pool === 10_000_000, `${afterKill?.pool}`);

  const resumed = tag(runSync({ MLN_FAULT_MODE: "settle", ...envWeek }), "RESULT");
  ok("1.6 · ⭐ the resumed release settles the week", resumed?.ok === true && resumed?.already === false, J(resumed));
  ok("1.7 · ⭐ 10,000 tickets settled inside the 30-second transaction budget", (resumed?.ms ?? Infinity) < 30_000, `${resumed?.ms} ms`);
  const settled = tag(runSync({ MLN_FAULT_MODE: "check", ...envWeek }), "CHECK");
  ok("1.8 · exactly once: 3 WIN, 9,997 LOSS, one BET_PAYOUT per winner, 10,000 tickets SETTLED",
    settled?.win === 3 && settled?.loss === 9_997 && settled?.payouts === 3 && settled?.settled === 10_000, J(settled && { win: settled.win, loss: settled.loss, payouts: settled.payouts }));
  ok("1.9 · every winner was paid their share once", J(settled?.balances) === J(before?.balances.map((b: number) => b + resumed.share)), J(settled?.balances));
  ok("1.10 · the pool ends at exactly 0", settled?.pool === 0, `${settled?.pool}`);

  // ── §2 · two processes, one week ───────────────────────────────────────────
  console.log("\n§2 · two processes release the same week at once");
  const seed2 = tag(runSync({ MLN_FAULT_MODE: "seed", MLN_FAULT_AHEAD: "3", MLN_FAULT_TICKETS: "2000", MLN_FAULT_WINNERS: "2" }), "SEED");
  ok("2.1 · a second week of 2,000 tickets", !!seed2);
  if (!seed2) throw new Error("seed 2 failed");
  const env2 = { MLN_FAULT_WEEK: seed2.weekId, MLN_FAULT_AT: seed2.at, MLN_FAULT_WINNERS_JSON: J(seed2.winners) };
  const before2 = tag(runSync({ MLN_FAULT_MODE: "check", ...env2 }), "CHECK");
  const [a, b] = [runAsync({ MLN_FAULT_MODE: "settle", ...env2 }), runAsync({ MLN_FAULT_MODE: "settle", ...env2 })];
  const [ra, rb] = [tag(await a.done, "RESULT"), tag(await b.done, "RESULT")];
  const results = [ra, rb];
  ok("2.2 · ⭐ one settled it and the other answered already-settled",
    results.filter((r) => r?.ok && !r.already).length === 1 && results.filter((r) => r?.ok && r.already).length === 1, J(results));
  const after2 = tag(runSync({ MLN_FAULT_MODE: "check", ...env2 }), "CHECK");
  ok("2.3 · ⭐ every winner paid once, one payout each, the pool at 0",
    after2?.payouts === 2 && after2?.pool === 0 && J(after2?.balances) === J(before2?.balances.map((x: number) => x + (ra?.share ?? rb?.share))), J(after2 && { payouts: after2.payouts, pool: after2.pool }));

  ok("3.1 · ⭐ the trial balance reconciles over everything above", after2?.trialBalance?.ok === true && after2.trialBalance.checked > 0, J(after2?.trialBalance));
  ok("3.2 · ⭐ the Millionea invariants hold", after2?.invariants?.ok === true, J(after2?.invariants?.problems));
} catch (e) {
  ok("0.run · the drive completed", false, String((e as Error).message ?? e));
} finally {
  try { await watch.end(); } catch { /* not connected */ }
  const drop = new pg.Client({ connectionString: RAW });
  try { await drop.connect(); await drop.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`); }
  catch (e) { console.error(`!! SCRATCH DATABASE NOT DROPPED — "${DB}" on ${BASE}: ${(e as Error).message}. Drop it by hand.`); }
  finally { try { await drop.end(); } catch { /* gone */ } }
}
console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — e2e:maswali-fault: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
