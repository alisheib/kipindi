/**
 * READ-ONLY pre-flight for `20260821140000_kyc_identity_fingerprint`.
 *
 *   railway run --service 50pick -- npx tsx scripts/ops-preflight-id-fingerprint.mts
 *
 * ── WHY THIS EXISTS ──────────────────────────────────────────────────────────
 *
 * `start` is `prisma migrate deploy && … && next start`, so a migration that fails on
 * production is not a bad deploy — it is a **platform-wide sign-in outage**, because
 * `next start` is never reached. The 2026-08-21 handover therefore said to pre-apply this
 * migration by hand before pushing.
 *
 * ⭐ Reading the migration shows hand-applying is the OPTIONAL half. Every statement is
 * `IF NOT EXISTS`, nothing is dropped or rewritten, and `KycSubmission` is small. The file
 * is safe to run as-is *provided two facts still hold* — and those facts were measured on
 * 2026-08-21, before another day of live traffic. **This re-measures them instead of
 * trusting a day-old note**, which is cheaper and far safer than running DDL by hand.
 *
 * ⛔ THIS SCRIPT WRITES NOTHING. No DDL, no DML, no transaction. If it prints GO, the
 * migration cannot fail on creation. If it prints NO-GO, do not push — the console output
 * names exactly which fact broke and what to do about it.
 */
import { Client } from "pg";

// Same rewrite as `s30-notify-volume.mts`: `railway run` injects the PRIVATE URL, which is
// unreachable from a laptop, so it is swapped for the public proxy.
const url = (process.env.DATABASE_URL || "")
  .replace(/@postgres\.railway\.internal(:\d+)?/, "@turntable.proxy.rlwy.net:40357");

if (!url) { console.error("DATABASE_URL is empty — run this through `railway run`."); process.exit(1); }

const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await c.connect();

const problems: string[] = [];
const note = (s: string) => console.log(s);

note(`── server clock ── ${(await c.query("select now()::text as t")).rows[0].t}\n`);

// ── 1 · Does the column already exist? (Then statements 1–3 are already no-ops.) ──
const col = await c.query(`
  SELECT 1 FROM information_schema.columns
  WHERE table_name = 'KycSubmission' AND column_name = 'idFingerprint'`);
note(`1 · idFingerprint column present … ${col.rowCount ? "YES (migration is already a no-op)" : "no (migration will add it)"}`);

// ── 2 · 🔴 THE FACT THE UNIQUE INDEX RESTS ON ──────────────────────────────────
// Statement 3 creates a UNIQUE index over `idFingerprint` where NOT NULL and not REJECTED.
// It fails at creation if duplicates exist. The column is created NULL and the migration
// writes no values, so today the predicate matches zero rows — but if a PREVIOUS partial
// run added the column and something backfilled it, that is no longer true. Measured, not
// assumed.
//
// ⚠️ GUARDED ON §1. The first run of this script queried the column unconditionally and
// Postgres refused it with 42703 (undefined_column) — because the column not existing is
// the EXPECTED pre-migration state. The database was right and the script was wrong; a
// pre-flight that cannot run before the migration is not a pre-flight. Recorded rather
// than quietly fixed, because "the check assumed the state it was checking for" is a
// recurring shape in this repo.
if (col.rowCount) {
  const dupFp = await c.query(`
    SELECT "idFingerprint", count(*)::int AS n
    FROM "KycSubmission"
    WHERE "idFingerprint" IS NOT NULL AND status <> 'REJECTED'
    GROUP BY 1 HAVING count(*) > 1`);
  note(`2 · duplicate active idFingerprint groups … ${dupFp.rowCount}`);
  if (dupFp.rowCount) problems.push(`statement 3 (UNIQUE index) WILL FAIL — ${dupFp.rowCount} duplicate fingerprint group(s)`);
} else {
  note(`2 · duplicate active idFingerprint groups … n/a — column does not exist yet, so the`);
  note(`     UNIQUE index in statement 3 is created over a predicate matching ZERO rows and cannot fail`);
}

// ── 3 · The tuple the fingerprint mirrors ─────────────────────────────────────
// Equal fingerprints mean equal (idType, idNumber) pairs — the HMAC is over the pair — so a
// tuple duplicate today is a fingerprint duplicate the moment anything backfills. This is
// the number the handover quoted as 0; it is re-read rather than remembered.
const dupTuple = await c.query(`
  SELECT "idType", "idNumber", count(*)::int AS n
  FROM "KycSubmission"
  WHERE "idNumber" IS NOT NULL AND status <> 'REJECTED'
  GROUP BY 1,2 HAVING count(*) > 1`);
note(`3 · duplicate active (idType, idNumber) groups … ${dupTuple.rowCount}  ${dupTuple.rowCount ? "🔴" : "(handover said 0)"}`);
if (dupTuple.rowCount) problems.push(`the backfill would create duplicates — ${dupTuple.rowCount} tuple group(s); do NOT run ops:backfill-id-fingerprints`);

// ── 4 · Size — the lock statements 1–3 take is only microseconds if this is small ──
const size = await c.query(`
  SELECT count(*)::int AS rows,
         pg_size_pretty(pg_total_relation_size('"KycSubmission"')) AS total
  FROM "KycSubmission"`);
note(`4 · KycSubmission … ${size.rows[0].rows} rows, ${size.rows[0].total}  (handover measured 72 rows / 360 kB)`);
if (size.rows[0].rows > 100_000) problems.push(`table is large (${size.rows[0].rows} rows) — ACCESS EXCLUSIVE lock is no longer negligible`);

// ── 5 · Has the migration already been recorded as applied? ───────────────────
const applied = await c.query(`
  SELECT migration_name, finished_at, rolled_back_at
  FROM "_prisma_migrations"
  WHERE migration_name LIKE '%kyc_identity_fingerprint%'`);
if (applied.rowCount) {
  for (const r of applied.rows) {
    note(`5 · recorded … ${r.migration_name} finished=${r.finished_at} rolled_back=${r.rolled_back_at}`);
    if (r.rolled_back_at) problems.push(`migration is recorded as ROLLED BACK — deploy will retry it`);
  }
} else {
  note(`5 · recorded … not yet applied (expected)`);
}

// ── 6 · The migrations BEFORE it must all be clean, or deploy stops at the first failure ──
const failed = await c.query(`
  SELECT migration_name FROM "_prisma_migrations"
  WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL`);
note(`6 · unfinished / rolled-back migrations … ${failed.rowCount}`);
for (const r of failed.rows) problems.push(`blocked by an unclean migration: ${r.migration_name}`);

await c.end();

console.log("");
if (problems.length) {
  console.error("🔴 NO-GO — do not push until these are resolved:");
  for (const p of problems) console.error(`   · ${p}`);
  process.exit(1);
}
console.log("✅ GO — every statement is IF NOT EXISTS, the unique index cannot fail on creation,");
console.log("   the table is small enough that its lock is negligible, and no earlier migration is stuck.");
