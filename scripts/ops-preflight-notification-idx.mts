/**
 * READ-ONLY pre-flight for `20260822100000_notification_user_created_idx`.
 *
 *   railway run --service 50pick -- npx tsx scripts/ops-preflight-notification-idx.mts
 *
 * `start` is `prisma migrate deploy && … && next start`, so a migration that fails on
 * production is not a bad deploy — it is a **platform-wide sign-in outage**, because
 * `next start` is never reached. This re-measures the two facts this one's safety rests on
 * instead of trusting a note, and it is the same shape as
 * `ops-preflight-id-fingerprint.mts`, which returned GO before the last schema change.
 *
 * ⛔ WRITES NOTHING. No DDL, no DML, no transaction.
 */
import { Client } from "pg";

const url = (process.env.DATABASE_URL || "")
  .replace(/@postgres\.railway\.internal(:\d+)?/, "@turntable.proxy.rlwy.net:40357");
if (!url) { console.error("DATABASE_URL empty — run through `railway run`."); process.exit(1); }

const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await c.connect();

const problems: string[] = [];
console.log(`── server clock ── ${(await c.query("select now()::text as t")).rows[0].t}\n`);

// 1 · Already there? Then the migration is a no-op and the lock is never taken.
const idx = await c.query(`
  SELECT indexname FROM pg_indexes
  WHERE tablename = 'Notification' AND indexname = 'Notification_userId_createdAt_idx'`);
console.log(`1 · index present … ${idx.rowCount ? "YES (migration is already a no-op)" : "no (migration will create it)"}`);

// 2 · 🔴 THE LOCK. A plain CREATE INDEX holds ACCESS EXCLUSIVE for its duration, which is a
//     function of size. This is the number that decides whether that is microseconds or an
//     outage, and it is re-read rather than remembered — the table grows every settled round.
const size = await c.query(`
  SELECT count(*)::int AS rows,
         pg_size_pretty(pg_total_relation_size('"Notification"')) AS total
  FROM "Notification"`);
console.log(`2 · Notification … ${size.rows[0].rows} rows, ${size.rows[0].total}`);
if (size.rows[0].rows > 2_000_000) {
  problems.push(`table is ${size.rows[0].rows} rows — build the index CONCURRENTLY by hand first, then let the IF NOT EXISTS file no-op`);
}

// 3 · Nothing earlier stuck: `migrate deploy` stops at the first unclean migration, so a
//     pre-existing failure would present as THIS migration breaking the boot.
const failed = await c.query(`
  SELECT migration_name FROM "_prisma_migrations"
  WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL`);
console.log(`3 · unfinished / rolled-back migrations … ${failed.rowCount}`);
for (const r of failed.rows) problems.push(`blocked by an unclean migration: ${r.migration_name}`);

// 4 · Already recorded? (A re-run of the same file is fine; a ROLLED BACK one is not.)
const applied = await c.query(`
  SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations"
  WHERE migration_name LIKE '%notification_user_created_idx%'`);
if (applied.rowCount) {
  for (const r of applied.rows) {
    console.log(`4 · recorded … ${r.migration_name} finished=${r.finished_at} rolled_back=${r.rolled_back_at}`);
    if (r.rolled_back_at) problems.push("migration is recorded as ROLLED BACK — deploy will retry it");
  }
} else {
  console.log("4 · recorded … not yet applied (expected)");
}

await c.end();
console.log("");
if (problems.length) {
  console.error("🔴 NO-GO — do not push until these are resolved:");
  for (const p of problems) console.error(`   · ${p}`);
  process.exit(1);
}
console.log("✅ GO — expand-only, IF NOT EXISTS, the table is small enough that ACCESS EXCLUSIVE");
console.log("   is negligible, and no earlier migration is stuck.");
