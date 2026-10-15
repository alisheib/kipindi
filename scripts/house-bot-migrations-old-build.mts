/**
 * S1 (c) · THE PRE-MERGE BUILD ON THE NEW SCHEMA — `scripts/house-bot-migrations-old-build.mts`.
 *
 * ⛔ WHY THIS EXISTS. The house migrations are applied from the operator's machine BEFORE the push
 * (REL-2). For the minutes between that apply and the new container taking traffic, the build still
 * serving is the OLD one, reading and writing a schema it has never seen: seven new nullable columns
 * on User, Position, Transaction and PredictionMarket, eight new tables, and two migration rows its
 * own folder does not have. "Expand-only" is a claim about that build; this is the measurement.
 *
 *   1. the checkout really is the old build (HEAD = origin/main, its own install — and, since N5, the two
 *      September house folders and NOT this release's third);
 *   2. THIS tree's `prisma migrate deploy` migrates a scratch database, every house migration included;
 *   3. the OLD build's own `prisma migrate deploy` exits 0 on that database;
 *   4. the OLD build's money end-to-end suite (bet, cash-out, settle, on the real services) passes on it;
 *   5. and every row the old build wrote left the house markers NULL;
 *   6. ⭐ N5 · the OLD build's own house suites (engine, money, caps, designation, console) pass on the N5 schema.
 *
 * ⭐ N5 (2026-10-15) · WHY §1 AND §4 CHANGED. Written for September, this gate's old build had NO house folder: the
 * whole house schema was new. N5's old build is production with the house desk running, and the schema it meets is
 * the third house folder (`…_house_bot_pairs_roster`) on top of the two it already has — three widened CHECKs, two
 * nullable columns, two PAIR-only CHECKs and one PAIR-only unique index. So the question became "does the OLD house
 * engine still work on it", and §4 answers it with the old build's own suites: this tree's third folder is copied into
 * the old checkout for the length of §4 — its `prisma migrate deploy` then builds the N5 schema in each suite's own
 * scratch database — and removed again in a `finally`, whatever happened. Its intent INSERTs and their `ON CONFLICT`
 * clauses, its control-row reads and writes and its caps all run against the new CHECKs and the new partial index.
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
import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
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
  const oldHouse = folders.filter((f) => /_house_bot_\w+$/.test(f)).sort();
  ok("c.0c · it has migrations, the two September house folders and NOT this release's third (N5: the old build is production)",
    folders.length > 0 && oldHouse.length === 2 && oldHouse.some((f) => /_house_bot_tables$/.test(f)) && oldHouse.some((f) => /_house_bot_markers$/.test(f))
      && !folders.some((f) => /_house_bot_pairs_roster$/.test(f)),
    `${folders.length} entries · house: ${oldHouse.join(", ") || "none"}`);
  const schemaPath = join(DIR, "prisma/schema.prisma");
  const oldSchema = existsSync(schemaPath) ? readFileSync(schemaPath, "utf8") : "";
  ok("c.0d · its schema has the house marker column and none of N5's budget columns",
    /\bhouseBotId\b/.test(oldSchema) && !/\bgCapPairRoundsPerDay\b/.test(oldSchema) && !/\bgCapPairDailyTzs\b/.test(oldSchema));
  const nm = join(DIR, "node_modules");
  ok("c.0e · it has its OWN node_modules — not a junction or symlink into another tree",
    existsSync(nm) && !lstatSync(nm).isSymbolicLink(), existsSync(nm) ? "" : "missing: run npm ci in the old checkout");
  // ⛔ A wrong checkout makes every later result meaningless, and the later steps are heavy.
  if (fail > 0) { console.error("\n!! The old-build checkout is not usable; nothing below was run."); finish(); }
}

console.log("\n§2 · this tree migrates a scratch database, every house migration included");
await withClient(RAW, async (c) => {
  await c.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`);
  await c.query(`CREATE DATABASE "${DB}"`);
});
ok("c.1 · this tree's prisma migrate deploy exits 0", run("npx", ["prisma", "migrate", "deploy"], { DATABASE_URL: URL_DB }, ROOT) === 0);
{
  const got = await withClient(URL_DB, async (c) => (await c.query(`SELECT
    to_regclass('"HouseBotPress"')::text AS "press",
    (SELECT count(*)::int FROM information_schema.columns WHERE table_name = 'Position' AND column_name = 'houseBotId') AS "marker",
    (SELECT count(*)::int FROM information_schema.columns WHERE table_name = 'HouseBotControl' AND column_name = 'gCapPairRoundsPerDay') AS "pairBudget",
    (SELECT count(*)::int FROM pg_indexes WHERE indexname = 'hbi_pair_anchor_uq') AS "pairIndex"`)).rows[0]);
  ok("c.1b · CONTROL · the database really has the house tables and the Position marker", got?.press != null && got?.marker === 1, JSON.stringify(got));
  ok("c.1c · CONTROL · …and N5's objects (a budget column, the PAIR index): it is the NEW schema the old build meets", got?.pairBudget === 1 && got?.pairIndex === 1, JSON.stringify(got));
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

console.log("\n§4 · N5 · the OLD build's own house suites on the N5 schema");
{
  const pairsName = readdirSync(join(ROOT, "prisma/migrations")).find((f) => /_house_bot_pairs_roster$/.test(f)) ?? "";
  ok("c.5 · this tree has the N5 folder to lend", pairsName !== "", pairsName || "missing");
  if (pairsName) {
    const lent = join(DIR, "prisma/migrations", pairsName);
    ok("c.5a · the old checkout does not already carry it (a left-over copy would mean an earlier run never cleaned up)", !existsSync(lent));
    mkdirSync(lent);
    try {
      copyFileSync(join(ROOT, "prisma/migrations", pairsName, "migration.sql"), join(lent, "migration.sql"));
      // ⛔ CONTROL: the old tree's migrate deploy really applies the lent file — otherwise every suite below would run on
      // the September schema and prove nothing about N5.
      const CTL = `${DB}_ctl`;
      await withClient(RAW, async (c) => {
        await c.query(`DROP DATABASE IF EXISTS "${CTL}" WITH (FORCE)`);
        await c.query(`CREATE DATABASE "${CTL}"`);
      });
      const URL_CTL = `${RAW.replace(/\/[^/?]*(\?.*)?$/, "")}/${CTL}`;
      ok("c.5b · CONTROL · the old tree's prisma migrate deploy applies the lent N5 file", run("npx", ["prisma", "migrate", "deploy"], { DATABASE_URL: URL_CTL }, DIR) === 0);
      const n5 = await withClient(URL_CTL, async (c) => (await c.query(`SELECT
        (SELECT count(*)::int FROM information_schema.columns WHERE table_name = 'HouseBotControl' AND column_name = 'gCapPairDailyTzs') AS "col",
        (SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'HouseBotIntent_kind_check') AS "kinds"`)).rows[0]);
      ok("c.5c · CONTROL · …and the database it built has N5's column and the PAIR kind", n5?.col === 1 && /'PAIR'/.test(String(n5?.kinds)), JSON.stringify(n5));
      await withClient(RAW, (c) => c.query(`DROP DATABASE IF EXISTS "${CTL}" WITH (FORCE)`));
      // Each is the OLD build's own two-store suite, run from its own checkout: its runner creates a scratch database
      // from the old tree's migrations — which now include the lent file — and its child processes use the old client.
      for (const [key, file] of [
        ["engine", "scripts/house-bot-engine.test.mts"],
        ["money", "scripts/house-bot-money.test.mts"],
        ["caps", "scripts/house-bot-caps.test.mts"],
        ["designation", "scripts/house-bot-designation.test.mts"],
        ["console", "scripts/house-bot-console.test.mts"],
      ] as const) {
        ok(`c.6.${key} · the old build's ${file} passes on the N5 schema (both stores)`, run("npx", ["tsx", file], {}, DIR) === 0);
      }
    } finally {
      rmSync(lent, { recursive: true, force: true });
    }
    ok("c.7 · the lent folder is gone again: the old checkout is back to its own tree", !existsSync(lent) && git(DIR, ["status", "--porcelain", "prisma/migrations"]) === "");
  }
}

finish();
