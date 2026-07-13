/**
 * Reset the DISPOSABLE load-test database to a clean, migrated state.
 *
 * Safety — three independent gates, checked BEFORE anything is dropped:
 *   1. Hostname denylist (a prod host is never a valid target).
 *   2. Host must be localhost.
 *   3. The target DB must already carry the marker row
 *        SystemConfig['__LOAD_TEST_TARGET__'] = 'I_AM_A_DISPOSABLE_LOAD_TEST_DB'
 *
 * Gate 3 is the load-bearing one: it is a property of the DATABASE, not of the
 * config, so a human setting the wrong env var cannot bypass it. A human plants
 * that row by hand in each throwaway DB. Production will never have it.
 *
 * Zero new dependencies — raw SQL goes through the Prisma client we already ship.
 *
 * Usage:  node scripts/load/reset-db.mjs
 */
import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const URL_ = process.env.DATABASE_URL;
if (!URL_) { console.error("DATABASE_URL not set"); process.exit(1); }

const MARKER_KEY = "__LOAD_TEST_TARGET__";
const MARKER_VAL = "I_AM_A_DISPOSABLE_LOAD_TEST_DB";

const host = new URL(URL_).hostname;
const DENY = ["rlwy.net", "railway.app", "50pick.tz", "amazonaws.com", "supabase.co", "neon.tech"];
for (const bad of DENY) {
  if (host.includes(bad)) {
    console.error(`\n  ABORT — '${host}' matches the production denylist ('${bad}').`);
    console.error("  This script DROPS THE SCHEMA. It will never run against a remote host.\n");
    process.exit(2);
  }
}
if (host !== "localhost" && host !== "127.0.0.1") {
  console.error(`\n  ABORT — refusing to reset a non-local host ('${host}').\n`);
  process.exit(2);
}

const c = new PrismaClient();
let marker = null;
try {
  const r = await c.$queryRawUnsafe(
    `SELECT value FROM "SystemConfig" WHERE key = '${MARKER_KEY}'`,
  );
  marker = r[0]?.value ?? null;
} catch {
  console.error(`\n  ABORT — cannot read SystemConfig on ${host}. Is this even a 50pick DB?\n`);
  await c.$disconnect();
  process.exit(2);
}
if (marker !== MARKER_VAL) {
  console.error(`\n  ABORT — marker row missing or wrong on ${host}.`);
  console.error(`  Expected SystemConfig['${MARKER_KEY}'] = '${MARKER_VAL}'`);
  console.error(`  Found:   ${JSON.stringify(marker)}`);
  console.error("\n  This database is NOT certified disposable. Nothing was dropped.\n");
  await c.$disconnect();
  process.exit(2);
}

console.log(`  gate ok — ${host} is a certified disposable load-test DB`);
console.log("  dropping schema...");
await c.$executeRawUnsafe("DROP SCHEMA public CASCADE");
await c.$executeRawUnsafe("CREATE SCHEMA public");
await c.$disconnect();

console.log("  migrating...");
execFileSync("npx", ["prisma", "migrate", "deploy"], { stdio: "pipe", shell: true });

const c2 = new PrismaClient();
await c2.$executeRawUnsafe(
  `INSERT INTO "SystemConfig" (key, value, "updatedAt")
   VALUES ('${MARKER_KEY}', '${JSON.stringify(MARKER_VAL)}'::json, now())
   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
);
await c2.$executeRawUnsafe("CREATE EXTENSION IF NOT EXISTS pg_stat_statements");
await c2.$disconnect();

console.log("  clean + migrated + marker re-planted\n");
