/**
 * S10 — cross-instance double-spend safety (THE most important untested property).
 *
 * "Advisory locks are DB-global, so two Railway instances cannot double-spend the
 *  same wallet." This is the single safety property that keeps the platform correct
 *  when it scales past one container — and it has NEVER been tested, because every
 *  test to date ran one in-process JS Map, where the fallback mutex (locks.ts:37)
 *  is per-process and would silently fail across instances.
 *
 * Setup: fund ONE wallet for exactly K bets. Spawn TWO separate OS processes (each
 * its own PrismaClient + pool = a Railway container), each firing K bets at that
 * ONE wallet, aligned to fire simultaneously. 2K attempts chase K bets' worth of money.
 *
 * PASS  = exactly K succeed, final balance 0, exactly K positions, no negative,
 *         pool == K*STAKE. The DB advisory lock serialized two processes.
 * FAIL  = > K succeed / negative balance / pool != K*STAKE => cross-instance
 *         double-spend. That would make horizontal scaling unsafe for money.
 *
 * Usage:
 *   node scripts/load/reset-db.mjs
 *   npx tsx scripts/load/s10-cross-instance.mts
 */
/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const BASE = process.env.DATABASE_URL;
if (!BASE) { console.error("DATABASE_URL not set"); process.exit(1); }

const client = new PrismaClient({ datasources: { db: { url: BASE } } });

{
  const r: any = await client.$queryRawUnsafe(
    `SELECT value FROM "SystemConfig" WHERE key = '__LOAD_TEST_TARGET__'`).catch(() => []);
  if (r[0]?.value !== "I_AM_A_DISPOSABLE_LOAD_TEST_DB") {
    console.error("\n  ABORT — target DB is not a certified disposable load-test DB.\n"); process.exit(2);
  }
}

const K = 5;             // wallet can afford exactly 5 bets
const STAKE = 1000;
const PER_WORKER = K + 3; // each worker tries 8; 2 workers => 16 attempts for 5 seats
const now = () => new Date().toISOString();
const rid = Math.random().toString(36).slice(2, 8);
const USER = `${rid}_shared`;
const MARKET = `${rid}_m`;

await client.$executeRawUnsafe(`
  INSERT INTO "User" (id, "phoneE164", "failedLoginCount", role, status, locale,
                      "marketingOptIn", "twoFactorEnabled", "createdAt", "updatedAt")
  VALUES ('${USER}', '+255700123456', 0, 'PLAYER', 'ACTIVE', 'EN', false, false, now(), now())`);
await client.$executeRawUnsafe(`
  INSERT INTO "Wallet" (id, "userId", balance, "bonusBalance", pending, hold, currency,
                        status, "createdAt", "updatedAt")
  VALUES ('${rid}_w', '${USER}', ${K * STAKE}, 0, 0, 0, 'TZS', 'ACTIVE', now(), now())`);
await client.$executeRawUnsafe(`
  INSERT INTO "PredictionMarket" (id, "titleEn", "titleSw", category, "sourceUrl",
      "resolutionCriterion", "resolutionAt", status, "yesPool", "noPool", "predictorCount",
      "proposedBy", "createdAt", "updatedAt")
  VALUES ('${MARKET}', 'X-instance market', 'Soko', 'macro', 'https://bot.go.tz',
      'Resolves at the official date.', now() + interval '7 days', 'LIVE', 0, 0, 0,
      'load', now(), now())`);

console.log(`\n  S10 — cross-instance double-spend`);
console.log(`  wallet funded for EXACTLY ${K} bets (${K * STAKE} TZS)`);
console.log(`  2 separate OS processes × ${PER_WORKER} bets = ${2 * PER_WORKER} attempts on ONE wallet\n`);

const here = dirname(fileURLToPath(import.meta.url));
const worker = join(here, "s10-worker.mts");

function runWorker(id: string): Promise<{ ok: number; fail: number; codes: any }> {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      LOAD_WORKER_ID: id, LOAD_USER: USER, LOAD_MARKET: MARKET,
      LOAD_BETS: String(PER_WORKER), LOAD_STAKE: String(STAKE), LOAD_POOL: "10",
    };
    const child = spawn("npx", ["tsx", worker], { env, shell: true });
    let out = "";
    child.stdout.on("data", (d) => { out += d.toString(); });
    child.stderr.on("data", () => { /* audit/email noise */ });
    child.on("close", () => {
      const line = out.split("\n").find((l) => l.includes("__S10_RESULT__"));
      if (!line) return reject(new Error(`worker ${id} produced no result:\n${out.slice(-400)}`));
      resolve(JSON.parse(line.replace("__S10_RESULT__", "").trim()));
    });
  });
}

// Fire both at once.
const [a, b] = await Promise.all([runWorker("A"), runWorker("B")]);
console.log(`   worker A: ${a.ok} ok, ${a.fail} fail  ${JSON.stringify(a.codes)}`);
console.log(`   worker B: ${b.ok} ok, ${b.fail} fail  ${JSON.stringify(b.codes)}`);

const totalOk = a.ok + b.ok;

/* ── Verdict, straight from SQL ───────────────────────────────────────────── */
const w: any = await client.$queryRawUnsafe(`SELECT balance::int b FROM "Wallet" WHERE "userId"='${USER}'`);
const pos: any = await client.$queryRawUnsafe(`SELECT COUNT(*)::int c, COALESCE(SUM(stake),0)::int s FROM "Position" WHERE "marketId"='${MARKET}'`);
const mk: any = await client.$queryRawUnsafe(`SELECT "yesPool"::int y, "noPool"::int n FROM "PredictionMarket" WHERE id='${MARKET}'`);
const bal = w[0].b;
const posCount = pos[0].c, posStakes = pos[0].s;
const pool = mk[0].y + mk[0].n;

console.log("\n  ── verdict (from the database) ─────────────────────────────────");
console.log(`     bets accepted (both workers) : ${totalOk}   (must be exactly ${K})`);
console.log(`     positions created            : ${posCount}   (must be exactly ${K})`);
console.log(`     final wallet balance         : ${bal}   (must be exactly 0, never negative)`);
console.log(`     market pool                  : ${pool}   (must be exactly ${K * STAKE})`);
console.log(`     Σ position stakes            : ${posStakes}`);

const pass =
  totalOk === K && posCount === K && bal === 0 && bal >= 0 && pool === K * STAKE && posStakes === pool;

console.log("\n  ═════════════════════════════════════════════════════════════════");
if (pass) {
  console.log(`   PASS — the Postgres advisory lock is DB-GLOBAL.`);
  console.log(`   Two processes chased ${2 * PER_WORKER} bets at one wallet funded for ${K};`);
  console.log(`   exactly ${K} succeeded, balance is 0, no double-spend. Horizontal scaling`);
  console.log(`   is money-safe for the wallet lock.`);
} else {
  console.log(`   FAIL — CROSS-INSTANCE DOUBLE-SPEND. The lock did not serialize two`);
  console.log(`   processes. Scaling past one container is NOT money-safe.`);
}
console.log("  ═════════════════════════════════════════════════════════════════\n");
await client.$disconnect();
process.exit(pass ? 0 : 1);
