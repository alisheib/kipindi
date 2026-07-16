/**
 * Plant the disposable-load-test marker so the cross-instance proofs (s10/s11)
 * accept the CI Postgres as a certified throwaway target.
 *
 * CI-only: unlike reset-db.mjs (which is for the persistent local cluster and
 * refuses a DB without a pre-existing marker), this runs right after
 * `prisma migrate deploy` on a FRESH CI service DB — the schema exists but the
 * marker doesn't yet. Idempotent. Guarded to localhost so it can never run
 * against a real host.
 */
import { PrismaClient } from "@prisma/client";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const host = new URL(url).hostname;
if (host !== "localhost" && host !== "127.0.0.1") {
  console.error(`ABORT — refusing to plant the load-test marker on non-local host '${host}'.`);
  process.exit(2);
}

const c = new PrismaClient();
await c.$executeRawUnsafe(
  `INSERT INTO "SystemConfig" (key, value, "updatedAt")
   VALUES ('__LOAD_TEST_TARGET__', '"I_AM_A_DISPOSABLE_LOAD_TEST_DB"'::json, now())
   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
);
await c.$disconnect();
console.log(`  load-test marker planted on ${host} — cross-instance proofs may run`);
