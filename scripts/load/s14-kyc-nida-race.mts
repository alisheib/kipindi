/**
 * S14 — "one NIDA, one account" across two instances.
 *
 * NIDA-POLICY.md (Ali, 2026-07-19) states the ENTIRE identity control is format
 * + uniqueness: there is no authority check, so uniqueness is not a nicety — it
 * is the only thing standing between one human and two funded accounts. It is a
 * P0 AML control for a licensed book.
 *
 * That control is implemented as an application-level read-then-write with NO
 * lock and NO unique constraint:
 *
 *     kyc-service.ts:116   const conflict = await db.kyc.findActiveByNida(...)
 *     kyc-service.ts:161   await db.kyc.upsert({ ...k, nidaNumber, ... })
 *
 * `withLock("kyc:" + userId)` guards reviewKyc/forceReverifyKyc but NOT this
 * path — and it is keyed by USER, so it would serialise one user against
 * themselves, never two different users against each other. The schema carries
 * `@@index([nidaNumber])`, not a unique index (prisma/schema.prisma:338).
 *
 * Two OS processes (each its own PrismaClient + pool = a Railway container)
 * submit the SAME NIDA for two DIFFERENT users, aligned to one wall-clock
 * instant so both are inside the window together.
 *
 * PASS = exactly ONE active submission ends up holding that NIDA.
 * FAIL = two users hold the same national ID ⇒ one human, two accounts, and
 *        every downstream control that assumes one-NIDA-one-account is void.
 *
 * Usage:
 *   $env:DATABASE_URL='postgresql://postgres:pw@localhost:5433/kipindi_load?schema=public'
 *   node scripts/load/reset-db.mjs
 *   npx tsx scripts/load/s14-kyc-nida-race.mts
 */
/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const BASE = process.env.DATABASE_URL;
if (!BASE) { console.error("DATABASE_URL not set"); process.exit(1); }

const client = new PrismaClient({ datasources: { db: { url: BASE } } });

// Gate 3 (see scripts/load/README.md): a property of the DATABASE, so a wrong
// env var cannot point this at anything real.
{
  const r = await client.$queryRawUnsafe<{ value: unknown }[]>(
    `SELECT value FROM "SystemConfig" WHERE key = '__LOAD_TEST_TARGET__'`).catch(() => []);
  if (r[0]?.value !== "I_AM_A_DISPOSABLE_LOAD_TEST_DB") {
    console.error("\n  ABORT — target DB is not a certified disposable load-test DB.\n");
    process.exit(2);
  }
}

const rid = Math.random().toString(36).slice(2, 8);
const USER_A = `${rid}_a`;
const USER_B = `${rid}_b`;
// 20 digits, not ending 0000 (SANCTIONED) or 9999 (MISMATCH) — nida.ts:33-51.
const NIDA = ("19900101" + String(Date.now())).slice(0, 19) + "7";
const DOB = "1990-01-01";

for (const [id, phone] of [[USER_A, "+255700000911"], [USER_B, "+255700000912"]] as const) {
  await client.$executeRawUnsafe(`
    INSERT INTO "User" (id, "phoneE164", "failedLoginCount", role, status, locale,
                        "marketingOptIn", "twoFactorEnabled", "createdAt", "updatedAt")
    VALUES ('${id}', '${phone}', 0, 'PLAYER', 'PENDING_KYC', 'EN', false, false, now(), now())`);
  await client.$executeRawUnsafe(`
    INSERT INTO "KycSubmission" (id, "userId", status, "createdAt", "updatedAt")
    VALUES ('kyc_${id}', '${id}', 'IN_PROGRESS', now(), now())`);
}

console.log(`\n  S14 — one NIDA, one account (cross-instance)`);
console.log(`  NIDA ${NIDA}`);
console.log(`  2 separate OS processes, 2 different users, 1 national ID, fired together\n`);

const here = dirname(fileURLToPath(import.meta.url));
const worker = join(here, "s14-kyc-nida-worker.mts");
const startAt = Date.now() + 4000; // both spin to this instant

function runWorker(id: string, user: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      LOAD_WORKER_ID: id, LOAD_USER: user, LOAD_NIDA: NIDA,
      LOAD_DOB: DOB, LOAD_START_AT: String(startAt),
    };
    const child = spawn("npx", ["tsx", worker], { env, shell: true });
    let out = "";
    child.stdout.on("data", (d) => { out += d.toString(); });
    child.stderr.on("data", () => { /* audit/email noise */ });
    child.on("close", () => {
      const line = out.split("\n").find((l) => l.includes("__S14_RESULT__"));
      if (!line) return reject(new Error(`worker ${id} produced no result:\n${out.slice(-500)}`));
      resolve(JSON.parse(line.replace("__S14_RESULT__", "").trim()));
    });
  });
}

const [a, b] = await Promise.all([runWorker("A", USER_A), runWorker("B", USER_B)]);
console.log(`   worker A: ${JSON.stringify(a)}`);
console.log(`   worker B: ${JSON.stringify(b)}`);

/* ── Verdict, straight from SQL ───────────────────────────────────────────── */
const holders = await client.$queryRawUnsafe<{ userId: string; status: string }[]>(
  `SELECT "userId", status::text FROM "KycSubmission"
    WHERE "nidaNumber" = '${NIDA}' AND status <> 'REJECTED'`);

console.log("\n  ── verdict (from the database) ─────────────────────────────────");
console.log(`     active submissions holding this NIDA : ${holders.length}   (must be exactly 1)`);
for (const h of holders) console.log(`       · ${h.userId} — ${h.status}`);

const pass = holders.length === 1;

console.log("\n  ═════════════════════════════════════════════════════════════════");
if (pass) {
  console.log(`   PASS — the database refused the second writer. "One NIDA, one`);
  console.log(`   account" holds even when two containers submit the same national`);
  console.log(`   ID in the same instant.`);
} else {
  console.log(`   FAIL — ${holders.length} accounts now hold national ID ${NIDA}.`);
  console.log(`   The read-then-write duplicate check (kyc-service.ts:116) is not`);
  console.log(`   atomic and nothing in the schema enforces it. One human can hold`);
  console.log(`   two verified accounts — the AML control that the whole identity`);
  console.log(`   policy rests on is defeated by timing alone.`);
}
console.log("  ═════════════════════════════════════════════════════════════════\n");
await client.$disconnect();
process.exit(pass ? 0 : 1);
