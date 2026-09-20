/**
 * READ-ONLY PRE-FLIGHT FOR THE TWO HOUSE-BOT MIGRATIONS (04 A23 / ENG-08; PLAN §18 A23; REL-0).
 *
 *   npm run ops:preflight-house-bot-migrations
 *   railway run --service 50pick -- npx tsx scripts/ops-preflight-house-bot-migrations.mts
 *
 * `start` is `prisma migrate deploy && next start`, so a migration that fails on production is not a
 * bad deploy — it is a **platform-wide sign-in outage**, because `next start` is never reached. This is
 * the same shape as `ops-preflight-notification-idx.mts` and `ops-preflight-ai-cycles.mts`, and it is
 * the command REL-0 names: it must say GO before Ali is sent the checklist.
 *
 * ⛔ WRITES NOTHING. No DDL, no DML, no transaction, no advisory lock, and it starts no engine. It
 * imports two app modules for their CONSTANTS ONLY and calls nothing in either.
 *
 * ── ⭐ THE TIMEZONE LINE IS A VERDICT, NOT DECORATION ───────────────────────────────────────────
 * 04 A23 asks the preflight to "print the timezone". Printing it is worth nothing. `engine.ts` refuses
 * to start on any zone outside `UTC_ZONES` (its `DB_TIMEZONE` refusal), and every EAT key the engine
 * computes comes from database `now()` — so a database on the wrong zone lets BOTH migrations apply
 * cleanly, reports a perfectly healthy deploy, and then the engine silently never starts. That is the
 * worst failure this script can be asked to catch, and it is invisible to a line that only prints.
 * `UTC_ZONES` is IMPORTED from the module that enforces it: a list re-typed here could drift from the
 * refusal it claims to predict, and a preflight that predicts the wrong refusal is worse than none.
 *
 * ── ⛔ NOTHING IS TYPED THAT CAN BE DERIVED ─────────────────────────────────────────────────────
 * The eight house tables and the seven marker columns are IMPORTED from `schema-ready.ts` — the same
 * lists `/api/health` and the engine's own gate read, so this script cannot pass a database those two
 * would reject. `scripts/house-bot-migrations.test.mts` already keeps a second copy of the eight names;
 * a third here would be the one that drifts.
 * The two migration FOLDERS and the FIVE index names are read off the disk. The markers migration is
 * found by the only property that defines it — it is the house migration that adds all seven marker
 * columns — so no timestamped folder name is typed either.
 *
 * ── ⛔ FIVE INDEXES, NOT FOUR ───────────────────────────────────────────────────────────────────
 * The plan said four for a while: the four that name `"houseBotId"`. The migration's own header says
 * five, and the fifth — the sweep keyset `("placedAt", "id")` — is built under the SAME `ACCESS
 * EXCLUSIVE` lock and is exactly as capable of stalling the apply. A preflight that checked four would
 * report GO on a database one index short. The names are read from the file; the count is asserted.
 *
 * ── ⛔ indisvalid, NOT indexname ────────────────────────────────────────────────────────────────
 * A failed `CREATE INDEX CONCURRENTLY` leaves an INVALID index under the SAME name, and the migration's
 * `IF NOT EXISTS` would then silently keep it: the planner never uses it and nobody is told. A by-name
 * check (the shape `ops-preflight-notification-idx.mts` uses) cannot see the one failure that matters,
 * so every index is read through `pg_index.indisvalid` and an invalid one is a NO-GO by name.
 *
 * ── REL-2's `--post` BRANCH IS DELIBERATELY NOT BUILT, and this is the record of that decision ──
 * The inventory asks for a `--post` recovery mode that would apply the migrations by hand. It is not
 * here, for two reasons, and neither is "forgot": (1) REL-2 is struck for THIS release by events — both
 * migrations are already applied on `main` (pushed 2026-09-18), so `migrate status` reports 0 pending
 * and there is nothing to apply; (2) a flag on this script that writes DDL to production would turn the
 * one command that is safe to run at any moment into one that is not, and the hand-apply block in the
 * markers migration is already the written procedure for a future house migration. If a later house
 * migration needs it, build it as its OWN script with its own name — never as a flag on a preflight.
 *
 * ── WHAT THIS SCRIPT CANNOT MEASURE, said out loud rather than left blank ───────────────────────
 * The production row counts and sizes are the whole reason it exists, and they can only be read on
 * production. Every other path — the catalogue reads, the eight tables, the seven columns, the five
 * indexes, `indisvalid`, the timezone verdict, the unclean-migration scan and both threshold branches —
 * is exercised on scratch Postgres by `test:house-bot-ops` §6, before and after `migrate deploy`.
 *
 * ⛔ D19: it prints to a TERMINAL and may name the feature there. It writes nothing anywhere else.
 */
import { Client } from "pg";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
// CONSTANTS ONLY. Neither module is called: `schema-ready.ts` pulls `../prisma`, a lazy singleton with
// no import-time side effect, and `engine.ts` arms a timer only from `startHouseBotEngine`, which this
// file never names (pinned by the suite, `pre.src`).
import { HOUSE_SCHEMA_TABLES, HOUSE_SCHEMA_COLUMNS } from "../src/lib/server/house-bot/schema-ready.ts";
import { UTC_ZONES } from "../src/lib/server/house-bot/engine.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS = join(ROOT, "prisma", "migrations");

/**
 * The two big tables and the ceilings 04 A23 sets for them. The NAMES are tied back to the imported
 * column list: if a schema change ever renamed either table, this refuses rather than measuring a
 * table that is no longer the one the migration locks.
 */
const BIG_TABLES: ReadonlyArray<{ table: string; ceiling: number }> = [
  { table: "Position", ceiling: 500_000 },
  { table: "Transaction", ceiling: 1_000_000 },
];

const problems: string[] = [];
const say = (s = ""): void => console.log(s);

// ── the connection ─────────────────────────────────────────────────────────────────────────────
// ⛔ SSL BY HOST, never forced. The Railway proxy requires SSL and a plain local Postgres REFUSES it,
// so `ops-preflight-notification-idx.mts`'s hardcoded proxy rewrite plus unconditional ssl makes a
// script that can only ever be run against production. `ops-preflight-ai-cycles.mts` states the rule
// this copies: "an ops script nobody can rehearse is an ops script whose first run is on the real thing."
const url = process.env.DATABASE_URL || "";
if (!url) {
  console.error("DATABASE_URL is empty. Nothing was measured — this is not a GO.");
  console.error("Run it through `railway run --service 50pick -- …`, or against a scratch cluster (`npm run db:scratch`).");
  process.exit(2);
}
const isLocal = /(?:127[.]0[.]0[.]1|localhost|\[::1])/.test(url);
const c = new Client({ connectionString: url, ssl: isLocal ? undefined : { rejectUnauthorized: false } });
await c.connect();

say(`\n══ house-bot migrations · pre-flight ══   (read-only; it writes nothing)`);

// ── 0 · the migration files this preflight was written against ─────────────────────────────────
// ⛔ DERIVED, NEVER TYPED. The markers migration is identified by the only property that makes it the
// markers migration: it is the house migration that adds all seven marker columns. That ties this
// section to the imported list, so a migration split in two is reported here instead of silently
// halving the index check.
const houseDirs = existsSync(MIGRATIONS)
  ? readdirSync(MIGRATIONS, { withFileTypes: true }).filter((d) => d.isDirectory() && /house_bot/.test(d.name)).map((d) => d.name).sort()
  : [];
const sqlOf = (dir: string): string => {
  const f = join(MIGRATIONS, dir, "migration.sql");
  return existsSync(f) ? readFileSync(f, "utf8") : "";
};
const addsEveryMarker = (sql: string): boolean =>
  HOUSE_SCHEMA_COLUMNS.every(([, col]) => new RegExp(`ADD COLUMN IF NOT EXISTS\\s+"${col}"`).test(sql));
const markersDir = houseDirs.find((d) => addsEveryMarker(sqlOf(d))) ?? null;
const tablesDir = houseDirs.find((d) => d !== markersDir) ?? null;

say(`0 · migration files … ${houseDirs.length ? houseDirs.join(", ") : "NONE FOUND"}`);
if (houseDirs.length !== 2) {
  problems.push(`expected exactly 2 house migration folders under prisma/migrations, found ${houseDirs.length} — this preflight was written for two and must be re-read before it is trusted`);
}
if (!markersDir) {
  problems.push(`no house migration adds all ${HOUSE_SCHEMA_COLUMNS.length} marker columns — the markers migration could not be identified, so its index list could not be read`);
}
say(`    markers … ${markersDir ?? "NOT IDENTIFIED"}${tablesDir ? ` · tables … ${tablesDir}` : ""}`);

// The five indexes, read off the markers file. Both the hand-apply block (CONCURRENTLY, in a comment)
// and the migration body name them, so the matches are de-duplicated and the COUNT is asserted.
const markersSql = markersDir ? sqlOf(markersDir) : "";
const indexNames = [...new Set([...markersSql.matchAll(/CREATE\s+INDEX\s+(?:CONCURRENTLY\s+)?(?:IF\s+NOT\s+EXISTS\s+)?"([^"]+)"/gi)].map((m) => m[1]))].sort();
say(`    indexes named by that file … ${indexNames.length}${indexNames.length ? `: ${indexNames.join(", ")}` : ""}`);
if (markersDir && indexNames.length !== 5) {
  problems.push(`the markers migration names ${indexNames.length} index(es), not the 5 this preflight's thresholds and hand-apply procedure were written for — read the file before deploying`);
}

// ── 1 · the server clock, and the TIMEZONE VERDICT ─────────────────────────────────────────────
const clock = (await c.query(`select now()::text as t`)).rows[0].t as string;
// The same query `engine.ts` asks before it will arm a single timer.
const zone = (await c.query(`SELECT current_setting('TimeZone') AS "zone"`)).rows[0].zone as string;
const zoneOk = (UTC_ZONES as readonly string[]).includes(zone);
say(`\n1 · server clock … ${clock}`);
say(`    timezone … ${zone} … ${zoneOk ? "OK" : "⛔ NOT UTC"}   (accepted: ${UTC_ZONES.join(", ")})`);
if (!zoneOk) {
  problems.push(`the database timezone is ${zone}, not one of ${UTC_ZONES.join("/")} — both migrations would apply CLEANLY and the engine would then refuse to start (DB_TIMEZONE) on every replica, silently. Fix the zone BEFORE the deploy, not after.`);
}

// ── 2 · the two big tables: rows, size, and the A23 ceilings ───────────────────────────────────
say("");
for (const { table, ceiling } of BIG_TABLES) {
  if (!HOUSE_SCHEMA_COLUMNS.some(([t]) => t === table)) {
    problems.push(`"${table}" is no longer one of the tables the marker columns land on — this preflight's ceiling for it is measuring the wrong table`);
    continue;
  }
  const reg = await c.query(`SELECT to_regclass($1)::text AS r`, [`"${table}"`]);
  if (!reg.rows[0]?.r) {
    say(`2 · "${table}" … ABSENT`);
    problems.push(`"${table}" does not exist on this database — this is not the platform's database, or it has never been migrated`);
    continue;
  }
  // The identifier is interpolated because a table name cannot be a bind parameter. It is safe by
  // construction and by check: it comes from this file's own const list, it was just matched against
  // the IMPORTED marker-column list above, and it must be a bare identifier.
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(table)) { problems.push(`refusing to measure "${table}": not a bare identifier`); continue; }
  const stats = await c.query(
    `SELECT count(*)::bigint AS rows, pg_size_pretty(pg_total_relation_size($1)) AS total FROM "${table}"`,
    [`"${table}"`],
  );
  const rows = Number(stats.rows[0].rows);
  say(`2 · "${table}" … ${rows} rows, ${stats.rows[0].total}   · ceiling ${ceiling}`);
  if (rows > ceiling) {
    problems.push(`"${table}" is ${rows} rows, over the ${ceiling} ceiling — build the five indexes CONCURRENTLY by hand FIRST so the migration is a no-op. The exact statements are the hand-apply block in prisma/migrations/${markersDir ?? "<markers>"}/migration.sql:22-38; run them from psql in AUTOCOMMIT, one at a time, and check every indisvalid is t.`);
  }
}

// ── 3 · the eight house tables and the seven marker columns ────────────────────────────────────
const tables = (await c.query(
  `SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = ANY($1::text[])`,
  [[...HOUSE_SCHEMA_TABLES]],
)).rows.map((r) => r.table_name as string);
const missingTables = HOUSE_SCHEMA_TABLES.filter((t) => !tables.includes(t));
say(`\n3 · house tables … ${tables.length}/${HOUSE_SCHEMA_TABLES.length} present`);
if (missingTables.length) problems.push(`missing house tables: ${missingTables.join(", ")} — the deploy will create them; if this run is AFTER the deploy, it failed`);

const colRows = (await c.query(
  `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = ANY($1::text[])`,
  [[...new Set(HOUSE_SCHEMA_COLUMNS.map(([t]) => t))]],
)).rows as Array<{ table_name: string; column_name: string }>;
const missingCols = HOUSE_SCHEMA_COLUMNS.filter(([t, col]) => !colRows.some((r) => r.table_name === t && r.column_name === col));
say(`    marker columns … ${HOUSE_SCHEMA_COLUMNS.length - missingCols.length}/${HOUSE_SCHEMA_COLUMNS.length} present`);
if (missingCols.length) problems.push(`missing marker columns: ${missingCols.map(([t, col]) => `${t}.${col}`).join(", ")}`);

// ── 4 · the five indexes, read through indisvalid ──────────────────────────────────────────────
if (indexNames.length) {
  const idx = (await c.query(
    `SELECT c.relname AS name, i.indisvalid AS valid FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid WHERE c.relname = ANY($1::text[])`,
    [indexNames],
  )).rows as Array<{ name: string; valid: boolean }>;
  say(`\n4 · indexes …`);
  for (const name of indexNames) {
    const hit = idx.find((r) => r.name === name);
    say(`    ${hit ? (hit.valid ? "valid  " : "INVALID") : "absent "}  ${name}`);
    if (hit && !hit.valid) {
      problems.push(`index "${name}" EXISTS BUT IS INVALID — a failed CONCURRENTLY build leaves it under the same name and the migration's IF NOT EXISTS would keep it. Run DROP INDEX CONCURRENTLY IF EXISTS "${name}"; and build it again.`);
    }
  }
  const absent = indexNames.filter((n) => !idx.some((r) => r.name === n));
  if (absent.length && missingTables.length === 0 && missingCols.length === 0) {
    problems.push(`the schema is migrated but ${absent.length} of the ${indexNames.length} indexes are absent: ${absent.join(", ")} — a partially applied migration, or an index dropped by hand`);
  } else if (absent.length) {
    say(`    (${absent.length} absent — expected before the deploy, since the columns they index do not exist yet)`);
  }
}

// ── 5 · the migration history ──────────────────────────────────────────────────────────────────
const histReg = await c.query(`SELECT to_regclass('"_prisma_migrations"')::text AS r`);
if (!histReg.rows[0]?.r) {
  say(`\n5 · migration history … NONE — this database has never been migrated`);
  problems.push("there is no _prisma_migrations table: this database has never been migrated at all");
} else {
  const unclean = await c.query(`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL`);
  say(`\n5 · unfinished / rolled-back migrations … ${unclean.rowCount}`);
  for (const r of unclean.rows) problems.push(`blocked by an unclean migration: ${r.migration_name} — migrate deploy stops at the FIRST one, so this would present as the house migration breaking the boot`);

  for (const dir of houseDirs) {
    const rec = await c.query(`SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations" WHERE migration_name = $1`, [dir]);
    if (!rec.rowCount) {
      say(`    ${dir} … not yet applied (this deploy will apply it)`);
    } else {
      const r = rec.rows[0];
      say(`    ${dir} … recorded, finished=${r.finished_at ?? "NO"} rolled_back=${r.rolled_back_at ?? "no"}`);
      if (r.rolled_back_at) problems.push(`${dir} is recorded as ROLLED BACK — deploy will retry it against objects that may already exist`);
    }
  }
}

// ── 6 · recent bets — REL-1's quiet hour, and it is NOT a verdict ──────────────────────────────
// ⛔ A QUIET HOUR IS CHOSEN, NOT COMPUTED. This prints the number an officer needs; it never decides
// for them. Fifteen minutes of history cannot tell you whether the next fifteen are quiet, and a script
// that turned this into a GO would be asserting something it has no way to know.
const posReg = await c.query(`SELECT to_regclass('"Position"')::text AS r`);
if (posReg.rows[0]?.r) {
  const recent = await c.query(`SELECT count(*)::bigint AS n FROM "Position" WHERE "placedAt" > now() - interval '15 minutes'`);
  say(`\n6 · bets in the last 15 minutes … ${Number(recent.rows[0].n)}   · REL-1 asks for a quiet hour; this is evidence FOR that judgement, not the judgement`);
}

await c.end();

// ── 7 · the verdict ────────────────────────────────────────────────────────────────────────────
say("");
if (problems.length) {
  console.error("🔴 NO-GO — do not deploy until these are resolved:");
  for (const p of problems) console.error(`   · ${p}`);
  process.exit(1);
}
say("✅ GO — the schema is whole, every index is valid, the timezone is UTC, and no migration is stuck.");
say("   Record this output in the verification record (REL-0), with the row counts above.");
