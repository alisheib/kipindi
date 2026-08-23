/**
 * READ-ONLY pre-flight for `20260823120000_ai_spend_cycles`.
 *
 *   railway run --service 50pick -- npx tsx scripts/ops-preflight-ai-cycles.mts
 *
 * `start` is `prisma migrate deploy && … && next start`, so a migration that fails on
 * production is not a bad deploy — it is a **platform-wide sign-in outage**, because
 * `next start` is never reached. Same shape as `ops-preflight-notification-idx.mts`.
 *
 * ⭐ IT ALSO MEASURES THE DENOMINATORS. A cycle count is only a price when it is divided
 * by something we sell, and the divisor has to EXIST before the read model can promise a
 * cost-per-resolution. §7 below is what says whether "cost per resolution" can be an
 * honest number today or must render `—`. Measuring it here, on production, is the
 * difference between a designed number and a hoped-for one.
 *
 * ⛔ WRITES NOTHING. No DDL, no DML, no transaction.
 */
import { Client } from "pg";

const url = (process.env.DATABASE_URL || "")
  .replace(/@postgres\.railway\.internal(:\d+)?/, "@turntable.proxy.rlwy.net:40357");
if (!url) { console.error("DATABASE_URL empty — run through `railway run`."); process.exit(1); }

// SSL is required by the Railway proxy and REFUSED by a plain local Postgres. Deciding by
// host keeps this script runnable against a local database — which is the only way to
// exercise it without pointing it at production, and an ops script nobody can rehearse is
// an ops script whose first run is on the real thing.
const isLocal = /(?:127[.]0[.]0[.]1|localhost)/.test(url);
const c = new Client({ connectionString: url, ssl: isLocal ? undefined : { rejectUnauthorized: false } });
await c.connect();

const problems: string[] = [];
console.log(`── server clock ── ${(await c.query("select now()::text as t")).rows[0].t}\n`);

// 1 · The table must not already exist. `CREATE TABLE IF NOT EXISTS` makes a re-run safe,
//     but a table that is already there with a DIFFERENT shape would be silently kept.
const t = await c.query(`SELECT to_regclass('"AiSpendCycle"') AS r`);
console.log(`1 · AiSpendCycle table … ${t.rows[0].r ?? "absent (expected — the migration creates it)"}`);
if (t.rows[0].r) {
  const shape = await c.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'AiSpendCycle' ORDER BY ordinal_position`);
  console.log(`    existing columns: ${shape.rows.map((r) => r.column_name).join(", ")}`);
  problems.push("AiSpendCycle already exists — verify its shape matches the migration before deploying");
}

// 2 · The two columns the migration ADDs to AiUsageEvent. `ADD COLUMN IF NOT EXISTS` on a
//     nullable column with no default is a catalogue-only change in PG 11+ — no rewrite,
//     no long lock — but the row count is what makes that claim checkable rather than quoted.
const cols = await c.query(`
  SELECT column_name FROM information_schema.columns WHERE table_name = 'AiUsageEvent'`);
const names = cols.rows.map((r) => r.column_name as string);
console.log(`2 · AiUsageEvent columns … ${names.join(", ")}`);
for (const want of ["subjectType", "subjectId"]) {
  console.log(`    ${want} … ${names.includes(want) ? "ALREADY PRESENT (migration no-ops)" : "absent (migration adds it)"}`);
}

const ev = await c.query(`
  SELECT count(*)::int AS rows,
         min("createdAt")::text AS first_row,
         max("createdAt")::text AS last_row,
         coalesce(sum("costUsd"), 0)::float8 AS total_usd,
         count(*) FILTER (WHERE ok = false)::int AS failed_calls,
         coalesce(sum("costUsd") FILTER (WHERE ok = false), 0)::float8 AS failed_usd,
         pg_size_pretty(pg_total_relation_size('"AiUsageEvent"')) AS total_size
  FROM "AiUsageEvent"`);
console.table(ev.rows);
if ((ev.rows[0].rows as number) > 5_000_000) {
  problems.push(`AiUsageEvent is ${ev.rows[0].rows} rows — re-check the ADD COLUMN lock before deploying`);
}

// 3 · Per feature — the product lines the read model splits by.
console.log("3 · spend by feature");
console.table((await c.query(`
  SELECT feature, count(*)::int AS calls,
         round(coalesce(sum("costUsd"), 0)::numeric, 6)::float8 AS usd,
         min("createdAt")::text AS first_row, max("createdAt")::text AS last_row
  FROM "AiUsageEvent" GROUP BY feature ORDER BY usd DESC`)).rows);

// 4 · The model mix (§9.5) — Haiku → Opus is a ~5× cost change, and a cost-per-resolution
//     that moves for that reason must not read as the product getting more expensive.
console.log("4 · spend by model");
console.table((await c.query(`
  SELECT model, count(*)::int AS calls,
         round(coalesce(sum("costUsd"), 0)::numeric, 6)::float8 AS usd
  FROM "AiUsageEvent" GROUP BY model ORDER BY usd DESC LIMIT 12`)).rows);

// 5 · The live money gate's own state. The cycle meter must AGREE with this, never
//     compete with it — there is exactly one authority (§8.6).
const cfg = await c.query(`
  SELECT key, value FROM "SystemConfig"
  WHERE key IN ('ai_credit_config', 'ai_cycle_config', 'ai_ops_config')`);
if (!cfg.rowCount) console.log("5 · no ai_* SystemConfig rows (defaults in force)");
for (const r of cfg.rows) console.log(`5 · ${r.key} = ${JSON.stringify(r.value)}`);

// 6 · ⭐ THE DENOMINATORS. Ali's billable event is a RESOLVED MARKET, with Up & Down
//     priced separately. These are the divisors; a zero here means the page must render
//     `—`, not a division (§9.3).
console.log("6 · settled poll markets (the divisor for cost-per-resolution)");
console.table((await c.query(`
  SELECT count(*)::int AS settled_total,
         count(*) FILTER (WHERE m."resolvedOutcome" = 'VOID')::int AS voided,
         count(*) FILTER (WHERE m."settledAt" >= now() - interval '30 days')::int AS settled_30d,
         min(m."settledAt")::text AS first_settled,
         max(m."settledAt")::text AS last_settled
  FROM "PredictionMarket" m
  WHERE m."settledAt" IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM "UpDownRound" r WHERE r."marketId" = m.id)`)).rows);

console.log("7 · Up & Down (its own product line — priced separately, Ali 2026-08-23)");
console.table((await c.query(`
  SELECT count(*)::int AS rounds_total,
         count(*) FILTER (WHERE m."settledAt" IS NOT NULL)::int AS rounds_settled,
         count(*) FILTER (WHERE m."resolvedOutcome" = 'VOID')::int AS voided,
         count(*) FILTER (WHERE m."settledAt" >= now() - interval '30 days')::int AS settled_30d
  FROM "UpDownRound" r JOIN "PredictionMarket" m ON m.id = r."marketId"`)).rows);

// 8 · ⛔ THE ATTRIBUTION SUBTLETY, MEASURED. One oracle call serves an OBSERVATION, and
//     `UpDownObservation` is UNIQUE on (assetId, boundaryAt) — so a single paid call can
//     serve SEVERAL rounds. Dividing oracle spend by rounds without knowing this ratio
//     produces a per-round cost that is too HIGH by exactly this factor.
console.log("8 · observations vs the rounds they serve — the shared-call ratio");
console.table((await c.query(`
  SELECT count(*)::int AS observations,
         count(*) FILTER (WHERE state = 'CONFIRMED')::int AS confirmed,
         coalesce(sum(uses.n), 0)::int AS round_uses,
         round(coalesce(sum(uses.n), 0)::numeric / greatest(count(*), 1), 3)::float8 AS rounds_per_observation
  FROM "UpDownObservation" o
  LEFT JOIN LATERAL (
    SELECT count(*)::int AS n FROM "UpDownRound" r
    WHERE r."openObservationId" = o.id OR r."closeObservationId" = o.id
  ) uses ON true`)).rows);

// 8b · ⛔ WHAT WE ACTUALLY EARN PER RESOLUTION — measured, never quoted.
//      50pick charges a `loser-share` POOL COMMISSION (docs/RULES.md §2). It does NOT
//      charge a flat TZS 1,000 per market — that figure is the MINIMUM STAKE. A suggested
//      price is only meaningful beside real revenue, and an admin screen that names a
//      price we do not charge is the defect `test:fee-model-caption` exists to prevent.
console.log("8b · HOUSE:COMMISSION earned, by product line (TZS)");
console.table((await c.query(`
  SELECT CASE WHEN EXISTS (SELECT 1 FROM "UpDownRound" r WHERE r."marketId" = l."marketId")
              THEN 'updown' ELSE 'polls' END AS line,
         count(DISTINCT l."marketId")::int AS markets,
         round(coalesce(sum(l.amount), 0), 2)::float8 AS commission_tzs,
         round(coalesce(sum(l.amount), 0) / greatest(count(DISTINCT l."marketId"), 1), 2)::float8 AS tzs_per_market
  FROM "LedgerEntry" l
  WHERE l.account = 'HOUSE:COMMISSION' AND l."marketId" IS NOT NULL
  GROUP BY 1`)).rows);

// 9 · Nothing earlier stuck: `migrate deploy` stops at the first unclean migration, so a
//     pre-existing failure would present as THIS migration breaking the boot.
const failed = await c.query(`
  SELECT migration_name FROM "_prisma_migrations"
  WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL`);
console.log(`9 · unfinished / rolled-back migrations … ${failed.rowCount}`);
for (const r of failed.rows) problems.push(`blocked by an unclean migration: ${r.migration_name}`);

// 10 · Already recorded? A re-run of the same file is fine; a ROLLED BACK one is not.
const applied = await c.query(`
  SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations"
  WHERE migration_name LIKE '%ai_spend_cycles%'`);
if (applied.rowCount) {
  for (const r of applied.rows) {
    console.log(`10 · recorded … ${r.migration_name} finished=${r.finished_at} rolled_back=${r.rolled_back_at}`);
    if (r.rolled_back_at) problems.push("migration is recorded as ROLLED BACK — deploy will retry it");
  }
} else {
  console.log("10 · recorded … not yet applied (expected)");
}

await c.end();
console.log("");
if (problems.length) {
  console.error("🔴 NO-GO — do not push until these are resolved:");
  for (const p of problems) console.error(`   · ${p}`);
  process.exit(1);
}
console.log("🟢 GO — the migration is expand-only and safe to ship.");
