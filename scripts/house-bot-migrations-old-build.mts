/**
 * S1 (c) · THE PRE-MERGE BUILD ON THE NEW SCHEMA — `scripts/house-bot-migrations-old-build.mts`.
 *
 * ⛔ WHY THIS EXISTS. The house migrations are applied from the operator's machine BEFORE the push
 * (REL-2). For the minutes between that apply and the new container taking traffic, the build still
 * serving is the OLD one, reading and writing a schema it has never seen: seven new nullable columns
 * on User, Position, Transaction and PredictionMarket, eight new tables, and two migration rows its
 * own folder does not have. "Expand-only" is a claim about that build; this is the measurement.
 *
 *   1. the checkout really is the old build (HEAD = origin/main, no house folder, its own install);
 *   2. THIS tree's `prisma migrate deploy` migrates a scratch database, both house migrations included;
 *   3. the OLD build's own `prisma migrate deploy` exits 0 on that database;
 *   4. the OLD build's money end-to-end suite (bet, cash-out, settle, on the real services) passes on it;
 *   5. and every row the old build wrote left the house markers NULL.
 *
 * ⚠️ WHY IT IS NOT A `test:` KEY. It needs a second checkout with its own `npm ci` and runs the money
 * end-to-end suite, so it cannot live inside `test:all` without making every run on every machine
 * red or heavy. It runs at the commit-1 gate and at release (REL-0), and PROGRESS records the result.
 * Without HOUSE_BOT_OLD_BUILD_DIR it prints NOT MEASURED and exits 3 — never green.
 *
 * ⛔ THE OLD CHECKOUT NEEDS ITS OWN node_modules, never a junction into this tree: a `prisma generate`
 * through a junction rewrites THIS tree's client, and `npm ci` through one deletes it.
 *
 * ⚠️ On Ali-Blade15, run it only inside an agreed heavy window.
 *
 * RUN IT (Git Bash):
 *   git worktree add ../kipindi-old-build origin/main && (cd ../kipindi-old-build && npm ci)
 *   HOUSE_BOT_OLD_BUILD_DIR=../kipindi-old-build npm run verify:house-bot-migrations-old-build
 */
import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import pg from "pg";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DB = "hb_mig_oldbuild";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra = ""): boolean => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}`);
  return cond;
};
const finish = (): never => {
  console.log(`\nhouse-bot-migrations-old-build: ${pass} passed, ${fail} failed`);
  if (pass === 0) { console.error("!! ZERO assertions passed — treating as NOT MEASURED."); process.exit(3); }
  process.exit(fail === 0 ? 0 : 1);
};

if (process.env.NODE_ENV === "production") {
  console.error("!! verify:house-bot-migrations-old-build refuses to run with NODE_ENV=production.");
  process.exit(2);
}
const DIR = process.env.HOUSE_BOT_OLD_BUILD_DIR ? resolve(process.env.HOUSE_BOT_OLD_BUILD_DIR) : "";
if (!DIR) {
  console.error("S1(c) NOT MEASURED — set HOUSE_BOT_OLD_BUILD_DIR to a separate checkout of origin/main with its own npm ci.");
  process.exit(3);
}
const RAW = process.env.VERIFY_DATABASE_URL ?? process.env.HOUSE_BOT_MIGRATIONS_DATABASE_URL ?? "";
if (!RAW) {
  console.error("S1(c) NOT MEASURED — no local Postgres. Run: npm run verify:house-bot-migrations-old-build");
  process.exit(3);
}
{
  let host = "";
  try { host = new URL(RAW).hostname; } catch { /* reported below */ }
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) {
    console.error(`!! refusing: this drops and creates a database and runs only against a loopback cluster (${RAW.replace(/:[^:@/]*@/, ":***@")}).`);
    process.exit(2);
  }
}
const URL_DB = `${RAW.replace(/\/[^/?]*(\?.*)?$/, "")}/${DB}`;

const git = (cwd: string, args: string[]): string => {
  const r = spawnSync("git", ["-C", cwd, ...args], { encoding: "utf8" });
  return r.status === 0 ? String(r.stdout).trim() : "";
};
function run(cmd: string, args: string[], env: Record<string, string>, cwd: string): number {
  const r = spawnSync(cmd, args, {
    cwd, env: { ...process.env, ...env }, stdio: "inherit", shell: process.platform === "win32", timeout: 30 * 60_000,
  });
  return r.status ?? 1;
}
async function withClient<T>(url: string, fn: (c: pg.Client) => Promise<T>): Promise<T> {
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end().catch(() => {});
  }
}

console.log("\n§1 · the checkout is the old build, installed on its own");
{
  const exists = existsSync(DIR);
  ok("c.0a · the directory exists and is not this worktree", exists && DIR !== resolve(ROOT), DIR);
  const head = exists ? git(DIR, ["rev-parse", "HEAD"]) : "";
  const main = git(ROOT, ["rev-parse", "origin/main"]);
  ok("c.0b · its HEAD is origin/main", head !== "" && head === main, `${head || "?"} vs origin/main ${main || "?"}`);
  const migDir = join(DIR, "prisma/migrations");
  const folders = existsSync(migDir) ? readdirSync(migDir) : [];
  ok("c.0c · it has migrations and no house migration folder", folders.length > 0 && !folders.some((f) => /house_bot/.test(f)), `${folders.length} entries`);
  const schemaPath = join(DIR, "prisma/schema.prisma");
  ok("c.0d · its schema has no house marker column", existsSync(schemaPath) && !/\bhouseBotId\b/.test(readFileSync(schemaPath, "utf8")));
  const nm = join(DIR, "node_modules");
  ok("c.0e · it has its OWN node_modules — not a junction or symlink into another tree",
    existsSync(nm) && !lstatSync(nm).isSymbolicLink(), existsSync(nm) ? "" : "missing: run npm ci in the old checkout");
  // ⛔ A wrong checkout makes every later result meaningless, and the later steps are heavy.
  if (fail > 0) { console.error("\n!! The old-build checkout is not usable; nothing below was run."); finish(); }
}

console.log("\n§2 · this tree migrates a scratch database, both house migrations included");
await withClient(RAW, async (c) => {
  await c.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`);
  await c.query(`CREATE DATABASE "${DB}"`);
});
ok("c.1 · this tree's prisma migrate deploy exits 0", run("npx", ["prisma", "migrate", "deploy"], { DATABASE_URL: URL_DB }, ROOT) === 0);
{
  const got = await withClient(URL_DB, async (c) => (await c.query(`SELECT
    to_regclass('"HouseBotPress"')::text AS "press",
    (SELECT count(*)::int FROM information_schema.columns WHERE table_name = 'Position' AND column_name = 'houseBotId') AS "marker"`)).rows[0]);
  ok("c.1b · CONTROL · the database really has the house tables and the Position marker", got?.press != null && got?.marker === 1, JSON.stringify(got));
}

console.log("\n§3 · the OLD build on the new schema");
ok("c.2 · the old build's own prisma migrate deploy exits 0", run("npx", ["prisma", "migrate", "deploy"], { DATABASE_URL: URL_DB }, DIR) === 0);
ok("c.3 · the old build's money end-to-end suite passes (bet, cash-out, settle)",
  run("npx", ["tsx", "scripts/money-e2e.test.mts"], { DATABASE_URL: URL_DB, USE_PRISMA_DAL: "true" }, DIR) === 0);
await withClient(URL_DB, async (c) => {
  const counts = (await c.query(`SELECT
    (SELECT count(*)::int FROM "Position") AS "positions",
    (SELECT count(*)::int FROM "Position" WHERE "houseBotId" IS NOT NULL) AS "markedPositions",
    (SELECT count(*)::int FROM "Transaction" WHERE "houseBotId" IS NOT NULL) AS "markedTxns"`)).rows[0];
  ok("c.4a · the old build wrote positions to measure", counts.positions > 0, JSON.stringify(counts));
  ok("c.4b · every row the old build wrote left the house markers NULL", counts.markedPositions === 0 && counts.markedTxns === 0, JSON.stringify(counts));
  // ⛔ CONTROL: the count can see a marked row, so c.4b is not blind.
  await c.query("BEGIN");
  try {
    await c.query(`UPDATE "Position" SET "houseBotId" = 'hb_control' WHERE "id" = (SELECT "id" FROM "Position" LIMIT 1)`);
    const seen = (await c.query(`SELECT count(*)::int AS "n" FROM "Position" WHERE "houseBotId" IS NOT NULL`)).rows[0].n;
    ok("c.4c · CONTROL · a planted marker is counted", seen === 1, `${seen}`);
  } finally {
    await c.query("ROLLBACK");
  }
});

finish();
