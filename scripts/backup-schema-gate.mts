/**
 * `npm run test:backup-schema` — THE DUMP MUST SURVIVE THIS BRANCH'S MIGRATIONS.
 *
 * 🔴 WHY THIS EXISTS. On 2026-09-19 the nightly backup began failing and failed for three
 * consecutive nights (runs 57–59). The cause was not the backup toolchain changing — it had
 * not been touched. It was a MIGRATION landing on `main`: the house-bot schema introduced
 * this database's first all-lowercase fixed index names (`hbp_*`, `hbi_*`, `hbe_*`, `hbt_*`),
 * Postgres renders those identifiers unquoted, and a guard inside `db:backup` was searching
 * its own rendered SQL for the QUOTED form. Seven unique indexes that were sitting in the
 * dump were reported as lost, and the dump refused itself.
 *
 * ⛔ THE STRUCTURAL DEFECT IS NOT THAT BUG. It is that NOTHING RAN `db:backup` AGAINST THE
 * NEW SCHEMA UNTIL 00:15 UTC THE NEXT MORNING, ON A RUNNER, WITH ONLY AN EMAIL TO SAY SO.
 * The migration protocol (`.claude/skills/50pick-audit/SKILL.md` §"Adding a migration") said:
 * author it, apply it to the local disposable Postgres, commit, let the deploy carry it. Not
 * one of those steps touches the recovery path — and `db:backup` derives its schema DDL from
 * the LIVE DATABASE, so a migration is exactly the kind of change that can break it.
 *
 * This gate closes that: it is the migration protocol's fourth step. It runs the REAL
 * `db:backup` — never a re-implementation of its checks, which would be a second definition
 * of the truth and would drift — against a throwaway cluster carrying EVERY migration in
 * `prisma/migrations`. It is red on a laptop, before the push, instead of at 04:15 tomorrow.
 *
 * ⭐ IT VERIFIES ITS OWN PREMISE FIRST. A scratch cluster is long-lived and `db:scratch` does
 * NOT migrate it — and an orphaned cluster from an earlier session holding :5433 will happily
 * accept connections while carrying LAST WEEK'S SCHEMA. A gate that passes against a schema
 * this branch does not declare proves nothing and is worse than no gate, so the migration set
 * in the database is compared name-by-name with `prisma/migrations/` and a mismatch is fatal.
 *
 * ⭐ AND IT PROVES IT CAN FAIL (standards §5b). After the green run it plants a table with an
 * autoincrement column that is not in `SERIAL_COLUMNS` — one of `db:backup`'s real refusals —
 * and requires the dump to abort naming it. A gate that has never been seen red is a rumour.
 *
 * Usage (the wrapper boots the cluster and sets VERIFY_DATABASE_URL):
 *   npm run test:backup-schema
 */
import { execFileSync, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { readdirSync, rmSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import pgLib from "pg";
import { isLocalHost } from "../src/lib/server/backup/core.ts";

const { Client } = pgLib;
const REPO = resolve(process.cwd());
const MIGRATIONS_DIR = join(REPO, "prisma", "migrations");
const BACKUPS_DIR = join(REPO, "backups");
const RED_TABLE = "_BackupSchemaGateRed";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string): void {
  if (cond) { pass++; console.log(`PASS ${label}${extra ? ` — ${extra}` : ""}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}
function die(msg: string): never {
  console.error(`\n!! ${msg}\n`);
  process.exit(2);
}

/** Run `db:backup` exactly as CI runs it, and hand back what it said. */
function runDump(url: string): { code: number; out: string } {
  const r = spawnSync(process.execPath, ["--import", "tsx", join(REPO, "scripts", "db-backup.mts")], {
    cwd: REPO,
    encoding: "utf8",
    env: { ...process.env, DATABASE_URL: url },
    maxBuffer: 64 * 1024 * 1024,
  });
  return { code: r.status ?? -1, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

/** Artifacts this gate wrote. It dumps a disposable cluster; it must not leave copies around. */
function sweepArtifacts(since: number): number {
  let n = 0;
  try {
    for (const f of readdirSync(BACKUPS_DIR)) {
      const p = join(BACKUPS_DIR, f);
      try { if (statSync(p).mtimeMs >= since) { rmSync(p); n++; } } catch { /* raced, fine */ }
    }
  } catch { /* no backups dir yet */ }
  return n;
}

async function main(): Promise<void> {
  const url = process.env.VERIFY_DATABASE_URL;
  if (!url) {
    die("VERIFY_DATABASE_URL is not set.\n" +
        "   Run it through the wrapper, which boots the throwaway cluster:\n" +
        "     npm run test:backup-schema");
  }
  // 🔴 This gate CREATES AND DROPS a table and takes a full dump. It must never be able to
  // do either to anything but a local disposable cluster, whatever is in the environment.
  if (!isLocalHost(url)) {
    die(`refusing: VERIFY_DATABASE_URL is not a localhost database (${url.replace(/:\/\/[^@]*@/, "://***:***@")}).\n` +
        "   This gate writes to its target. It is for the scratch cluster and nothing else.");
  }

  console.log("\n── 1 · The cluster is OURS, and carries THIS branch's migrations ─\n");

  const c = new Client({ connectionString: url });
  await c.connect();

  // 🔴 IDENTIFY THE CLUSTER BEFORE WRITING A SINGLE STATEMENT TO IT. `db:scratch` pins port
  // 5433, and EVERY WORKTREE OF THIS REPO PINS THE SAME 5433 — while its orphan-killer only
  // matches clusters whose command line contains its OWN path. So a scratch cluster booted
  // by a sibling worktree (`F:\kipindi-house-bots`, a parallel session) accepts connections
  // on 5433, `db:scratch --reset` here fails with "the cluster failed to start and gave no
  // reason", and everything downstream quietly talks to SOMEBODY ELSE'S DATABASE carrying
  // SOMEBODY ELSE'S SCHEMA. That is exactly how this gate was first run by hand on
  // 2026-09-21, and the result only looked right by luck.
  //
  // ⛔ `prisma migrate deploy` WRITES. Running it against a cluster we have not identified
  // could apply this branch's migrations to a parallel session's database. The identity
  // check therefore comes FIRST and is fatal, not a warning.
  const dataDir = (await c.query<{ setting: string }>(
    `select setting from pg_settings where name = 'data_directory'`,
  )).rows[0]?.setting ?? "";
  const ours = resolve(REPO, ".pgscratch");
  const norm = (p: string): string => resolve(p).replace(/\\/g, "/").toLowerCase();
  if (norm(dataDir) !== norm(ours)) {
    await c.end();
    die(
      `the database on this port is NOT this repo's scratch cluster.\n` +
      `     its data directory : ${dataDir || "(unreported)"}\n` +
      `     expected           : ${ours}\n\n` +
      `   Another checkout's cluster is holding the port (every worktree uses 5433), so\n` +
      `   db:scratch could not start ours and this gate would have tested THEIR schema —\n` +
      `   and prisma migrate deploy would have WRITTEN to their database.\n` +
      `   Stop that cluster, or run this gate from the checkout that owns it.`,
    );
  }
  ok("the cluster on this port is this checkout's own .pgscratch", true, dataDir);

  // `db:scratch` boots a cluster; it does not migrate one. Do it here so the gate owns the
  // schema it is about to test, rather than inheriting whatever a previous session left.
  const require_ = createRequire(import.meta.url);
  const prismaCli = require_.resolve("prisma/build/index.js", { paths: [REPO] });
  try {
    execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], {
      cwd: REPO, encoding: "utf8", env: { ...process.env, DATABASE_URL: url }, maxBuffer: 32 * 1024 * 1024,
    });
  } catch (e) {
    await c.end();
    die(`prisma migrate deploy failed against the scratch cluster:\n${(e as Error).message}`);
  }

  const onDisk = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  const applied = (await c.query<{ migration_name: string }>(
    `select migration_name from _prisma_migrations where finished_at is not null and rolled_back_at is null`,
  )).rows.map((r) => r.migration_name).sort();

  const missing = onDisk.filter((m) => !applied.includes(m));
  const extra = applied.filter((m) => !onDisk.includes(m));
  ok(`every migration in prisma/migrations is applied (${onDisk.length})`, missing.length === 0,
    missing.length ? `NOT applied: ${missing.join(", ")}` : undefined);
  ok("the cluster carries no migration this branch does not declare", extra.length === 0,
    extra.length
      ? `applied but absent from prisma/migrations: ${extra.join(", ")} — this is a STALE cluster ` +
        "(an orphaned :5433 from an earlier session). Re-run with `npm run db:scratch -- --reset` first."
      : undefined);
  if (missing.length || extra.length) {
    await c.end();
    console.log(`\n${"─".repeat(64)}\n  BACKUP × SCHEMA GATE: ${pass} passed, ${fail} failed\n${"─".repeat(64)}`);
    console.log("\n⛔ The premise failed, so the dump was NOT run: a green here would have meant nothing.\n");
    process.exit(1);
  }

  console.log("\n── 2 · db:backup survives this schema ───────────────────────────\n");

  const t0 = Date.now();
  const green = runDump(url);
  ok("🔴 db:backup completes against a database carrying every migration", green.code === 0,
    green.code === 0
      ? "the recovery path still works on this schema"
      : `exit ${green.code} — ${(green.out.match(/^!! [\s\S]*?(?:\n\n|$)/m)?.[0] ?? "").trim().split("\n").slice(0, 6).join(" ") || "see output below"}`);
  if (green.code !== 0) {
    console.log("\n──── db:backup said ────\n" + green.out.split("\n").slice(-40).join("\n"));
  }
  ok("…and it wrote an artifact", /::backup-result::/.test(green.out));

  console.log("\n── 3 · RED CONTROL — the gate can still fail ────────────────────\n");

  // One of `db:backup`'s real refusals, triggered for real. A restored database whose
  // sequences were never advanced collides on its first write, which is why it refuses.
  await c.query(`CREATE TABLE IF NOT EXISTS "${RED_TABLE}" ("id" SERIAL PRIMARY KEY)`);
  let red: { code: number; out: string };
  try {
    red = runDump(url);
  } finally {
    await c.query(`DROP TABLE IF EXISTS "${RED_TABLE}"`);
  }
  ok("a serial column outside SERIAL_COLUMNS makes the dump ABORT", red.code === 2,
    `exit ${red.code}`);
  ok("…and the refusal NAMES the column, so nobody has to guess",
    red.out.includes(`${RED_TABLE}.id`));

  const planted = (await c.query<{ n: string }>(
    `select count(*)::text n from information_schema.tables where table_schema = 'public' and table_name = $1`,
    [RED_TABLE],
  )).rows[0].n;
  ok("the red control cleaned up after itself", planted === "0");
  await c.end();

  const swept = sweepArtifacts(t0);
  console.log(`\n   removed ${swept} artifact(s) this gate wrote to backups/.`);

  console.log(`\n${"─".repeat(64)}\n  BACKUP × SCHEMA GATE: ${pass} passed, ${fail} failed\n${"─".repeat(64)}`);
  if (fail > 0) {
    console.log(
      "\n⛔ A migration on this branch breaks the recovery path. Do NOT push it.\n" +
      "   `db:backup` reads the LIVE schema, so the nightly will fail every night until this\n" +
      "   is fixed, and the only thing that will tell you is an email at 04:15.\n" +
      "   Record: docs/BACKUP-RUNBOOK.md — \"THE THREE NIGHTS\".\n");
  }
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => die((e as Error).stack ?? String(e)));
