/**
 * THE PORTABLE RUNNER FOR THE MARKETING LANE'S POSTGRES PROBES. `db-scratch` boots PostgreSQL on a loopback port and
 * exports VERIFY_DATABASE_URL; this file points DATABASE_URL at it, applies every migration (`prisma migrate deploy`),
 * then runs the ONE probe it is given — so a package.json key runs a probe on any platform:
 *
 *   tsx scripts/db-scratch.mts --reset --run npx tsx scripts/live/pg-probe-run.mts scripts/live/bulk-reads-pg-probe.mts
 *
 * ⛔ WHY IT EXISTS: each probe's header carried a bash one-liner (`bash -c 'export DATABASE_URL=…; npx prisma migrate
 * deploy && npx tsx …'`), which npm cannot run on Windows, where package.json scripts run under cmd.exe — so the five
 * probes could not be keyed, and `test:orphans` counted them as scripts nothing runs (2026-10-04).
 * ⛔ Loopback only: the probes write and delete rows.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const probe = process.argv[2] ?? "";
const RAW = process.env.VERIFY_DATABASE_URL ?? "";
if (!probe || !existsSync(probe)) {
  console.error(`pg-probe-run: give the probe's path, repo-relative (got "${probe}").`);
  process.exit(2);
}
if (!RAW) {
  console.error("NOT MEASURED — pg-probe-run needs a scratch Postgres: run it through `tsx scripts/db-scratch.mts --run`, as its package.json key does.");
  process.exit(3);
}
let host = "";
try { host = new URL(RAW).hostname; } catch { /* refused below */ }
if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) {
  console.error("refusing: the probes write and delete rows, and run only against a loopback cluster.");
  process.exit(2);
}
const env = { ...process.env, DATABASE_URL: RAW };
const shell = process.platform === "win32";
const migrate = spawnSync("npx", ["prisma", "migrate", "deploy"], { env, stdio: "inherit", shell, timeout: 30 * 60_000 });
if (migrate.status !== 0) {
  console.error(`pg-probe-run: prisma migrate deploy failed (exit ${migrate.status}) — the probe was not run.`);
  process.exit(1);
}
const run = spawnSync("npx", ["tsx", probe], { env, stdio: "inherit", shell, timeout: 30 * 60_000 });
process.exit(run.status ?? 1);
