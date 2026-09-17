/**
 * Runs one house-bot case file twice — on a fresh scratch Postgres database and on the memory store —
 * each in its own child process (the stores choose their backend at import). Every two-store house suite runs through
 * it: `test:house-bot-money`, `test:house-bot-caps`, `test:house-bot-designation`, `test:house-bot-engine`,
 * `test:house-bot-comms`, `test:house-bot-info-edge` and `test:house-bot-reports` (C5-SPEC ruling 176).
 *
 * ⛔ NO POSTGRES IS A FAILURE, NOT A SKIP: without `VERIFY_DATABASE_URL` (set by `db-scratch --run`) the
 * Postgres half is NOT MEASURED and the suite exits 3. Only a loopback cluster is accepted.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runTwoStores(opts: { suite: string; casesFile: string; minPass: number; dbPrefix: string; timeoutMs?: number }): Promise<never> {
  let pass = 0, fail = 0;
  const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

  const runChild = (store: "postgres" | "memory", env: Record<string, string>) => {
    const r = spawnSync("npx", ["tsx", opts.casesFile], {
      cwd: ROOT, env: { ...process.env, ...env, HB_MONEY_STORE: store }, encoding: "utf8",
      shell: process.platform === "win32", timeout: opts.timeoutMs ?? 20 * 60_000, maxBuffer: 128 * 1024 * 1024,
    });
    const out = `${r.stdout ?? ""}`;
    process.stdout.write(out);
    if (r.stderr) process.stderr.write(r.stderr);
    const m = /@@SUMMARY (\{.*\})/.exec(out);
    const s = m ? (JSON.parse(m[1]) as { pass: number; fail: number }) : { pass: 0, fail: 0 };
    return { ...s, exit: r.status ?? 1 };
  };

  const mem = runChild("memory", { DATABASE_URL: "", USE_PRISMA_DAL: "false" });
  ok("0.mem · the memory run exits 0 with assertions and no failure", mem.exit === 0 && mem.pass >= opts.minPass && mem.fail === 0,
    `exit ${mem.exit} · ${mem.pass} passed · ${mem.fail} failed`);

  const RAW = process.env.VERIFY_DATABASE_URL ?? "";
  if (!RAW) {
    console.error(`\n!! NOT MEASURED — the Postgres half needs a local cluster. Run \`npm run ${opts.suite}\`, which boots one.`);
    console.log(`\n${opts.suite}: ${pass} passed, ${fail} failed — Postgres NOT MEASURED`);
    process.exit(3);
  }
  let host = "";
  try { host = new URL(RAW).hostname; } catch { /* refused below */ }
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) {
    console.error(`!! refusing: ${opts.suite} drops and creates a database and runs only against a loopback cluster.`);
    process.exit(2);
  }
  const BASE = RAW.replace(/\/[^/?]*(\?.*)?$/, "");
  const DB = `${opts.dbPrefix}_${process.pid}`;
  const admin = new pg.Client({ connectionString: RAW });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`);
  await admin.query(`CREATE DATABASE "${DB}"`);
  await admin.end();
  try {
    // ⚠️ `connect_timeout` IS ABOUT THIS MACHINE, NOT ABOUT THE PRODUCT (C4-SPEC ruling 163). PostgreSQL on Windows
    // forks a backend process per connection, and under load — a mutation drive, a build, agents reading the repo —
    // that fork can take longer than Prisma's 5 s default, which surfaces as `Can't reach database server at
    // 127.0.0.1:5433` in the middle of a green run (measured twice on 2026-09-16: engine §18 threw once and the money
    // child died at 0 passed). 30 s changes nothing about what is tested: a cluster that is really down still fails,
    // 25 s later. It is NOT a retry and NOT a tolerance for a failing assertion.
    const url = `${BASE}/${DB}?connect_timeout=30`;
    const mig = spawnSync("npx", ["prisma", "migrate", "deploy"], {
      cwd: ROOT, env: { ...process.env, DATABASE_URL: url }, encoding: "utf8", shell: process.platform === "win32", timeout: 10 * 60_000,
    });
    ok("0.pg.migrate · prisma migrate deploy applies every migration to the scratch database", mig.status === 0, (mig.stderr ?? "").split("\n").slice(-3).join(" "));
    if (mig.status === 0) {
      const pgRun = runChild("postgres", { DATABASE_URL: url, USE_PRISMA_DAL: "true" });
      ok("0.pg · the Postgres run exits 0 with assertions and no failure", pgRun.exit === 0 && pgRun.pass >= opts.minPass && pgRun.fail === 0,
        `exit ${pgRun.exit} · ${pgRun.pass} passed · ${pgRun.fail} failed`);
    }
  } finally {
    const drop = new pg.Client({ connectionString: RAW });
    await drop.connect();
    await drop.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`).catch(() => {});
    await drop.end();
  }
  console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${opts.suite}: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}
