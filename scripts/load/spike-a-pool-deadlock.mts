/**
 * SPIKE A — the pool deadlock, and the money it may destroy.
 *
 * HYPOTHESIS (static analysis, docs/plan):
 *   buyPosition takes withLock(`wallet:<id>`) (market-service.ts:337), which opens a
 *   $transaction and pins pool connection #1 for the whole callback. Inside that
 *   callback it DEBITS the wallet (:364) — on a DIFFERENT, autocommitting pool
 *   connection — and then NESTS withLock(`market:<id>`) (:412), which needs a SECOND
 *   connection from the SAME pool.
 *
 *   With N concurrent bets by N DIFFERENT users, each holds one connection and needs
 *   one more. At N >= pool size, nobody can proceed: P2024 (pool timeout).
 *
 *   And because locks.ts:58-60 runs fn()'s writes OUTSIDE the lock's transaction,
 *   the debit has already COMMITTED. When the nested lock throws, the exception
 *   unwinds straight past the closedInFlight refund path (:432, which only runs on a
 *   clean RETURN, never on a THROW).
 *
 *   => WALLET DEBITED. NO POSITION. NO REFUND.
 *
 * THIS SCRIPT'S ONLY JOB is to measure, for every FAILED bet, the wallet delta.
 * If any failed bet has walletDelta != 0, that is a live money-loss bug.
 *
 * Usage:
 *   node scripts/load/reset-db.mjs
 *   npx tsx scripts/load/spike-a-pool-deadlock.mts [--pool=5] [--concurrency=20] [--users=32]
 */

/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";

const arg = (k: string, d: number): number => {
  const hit = process.argv.find((a) => a.startsWith(`--${k}=`));
  return hit ? Number(hit.split("=")[1]) : d;
};

const POOL = arg("pool", 5);          // Railway 2-vCPU default = cpus*2+1 = 5
const CONC = arg("concurrency", 20);  // concurrent buyPosition calls
const USERS = arg("users", 32);
const STAKE = 1000;
const FUND = 50_000;

const BASE = process.env.DATABASE_URL;
if (!BASE) { console.error("DATABASE_URL not set"); process.exit(1); }

/* ── Safety gate: this DB must be certified disposable ─────────────────────── */
{
  const probe = new PrismaClient();
  const r: any = await probe.$queryRawUnsafe(
    `SELECT value FROM "SystemConfig" WHERE key = '__LOAD_TEST_TARGET__'`,
  ).catch(() => []);
  await probe.$disconnect();
  if (r[0]?.value !== "I_AM_A_DISPOSABLE_LOAD_TEST_DB") {
    console.error("\n  ABORT — target DB is not a certified disposable load-test DB.\n");
    process.exit(2);
  }
}

/* ── THE HOOK (plan §"zero-code-change instrumentation") ───────────────────────
 * prisma.ts:23 returns globalThis.__50PICK_PRISMA if present. So we install OUR
 * OWN client, with an EXPLICIT connection_limit, BEFORE any service module is
 * imported. Without pinning the limit, a 6-core dev box gets 13 connections and
 * the Railway (5) deadlock will not faithfully reproduce.
 *
 * ESM hoisting: `import` is hoisted above this statement, so the services MUST be
 * pulled in with a dynamic `await import()` further down. Do not "tidy" these into
 * static imports — it silently defeats the whole spike.
 */
const url = new URL(BASE);
url.searchParams.set("connection_limit", String(POOL));
url.searchParams.set("pool_timeout", "10");
const client = new PrismaClient({ datasources: { db: { url: url.toString() } } });
(globalThis as any).__50PICK_PRISMA = client;

/* ── Dynamic imports — AFTER the hook is installed ─────────────────────────── */
const { prisma, hasDatabase } = await import("../../src/lib/server/prisma.ts");
const { db } = await import("../../src/lib/server/store.ts");
const { createMarket, buyPosition } = await import("../../src/lib/server/market-service.ts");

/* ── Assert the hook actually took (refuse to run otherwise) ───────────────── */
if (!hasDatabase()) { console.error("ABORT — hasDatabase() is false; services would use the in-memory Map."); process.exit(1); }
if (prisma() !== client) { console.error("ABORT — services resolved a DIFFERENT PrismaClient. The hook did not take."); process.exit(1); }

console.log(`\n  SPIKE A — pool=${POOL}  concurrency=${CONC}  users=${USERS}  stake=${STAKE}`);
console.log(`  hook verified: services share our pool-limited client\n`);

/* ── Seed: real users, real wallets, one real market — via the real services ── */
const now = () => new Date().toISOString();
const runId = Math.random().toString(36).slice(2, 8);
const uid = (i: number) => `ld_${runId}_u${i}`;

for (let i = 0; i < USERS; i++) {
  await db.user.create({
    id: uid(i), phoneE164: `+2559${String(7000000 + i).padStart(8, "0")}`,
    passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "EN", displayName: null, dob: null,
    region: null, acceptedTermsVersion: null, acceptedTermsAt: null, marketingOptIn: false,
    twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({
    id: `ld_${runId}_w${i}`, userId: uid(i), balance: FUND, pending: 0, hold: 0,
    currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now(),
  } as never);
}

const market = await createMarket({
  titleEn: "Load spike market", titleSw: "Soko la majaribio", category: "macro",
  sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves at the official date.",
  resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "load",
} as never);
console.log(`  seeded ${USERS} funded users + market ${market.id}\n`);

/* ── Snapshot every wallet BEFORE ─────────────────────────────────────────── */
const before = new Map<string, number>();
for (let i = 0; i < CONC; i++) {
  before.set(uid(i), (await db.wallet.findByUserId(uid(i)))!.balance);
}

/* ── FIRE: CONC concurrent bets, distinct users, ONE market ───────────────── */
type Row = {
  user: string; ok: boolean; code: string; ms: number;
  err?: string; positionId?: string;
};
const t0 = Date.now();
const rows: Row[] = await Promise.all(
  Array.from({ length: CONC }, async (_, i): Promise<Row> => {
    const s = Date.now();
    try {
      const r: any = await buyPosition(uid(i), { marketId: market.id, side: i % 2 ? "YES" : "NO", stake: STAKE });
      return {
        user: uid(i), ok: !!r.ok, code: r.ok ? "OK" : (r.code ?? "?"),
        ms: Date.now() - s, err: r.ok ? undefined : r.error,
        positionId: r.ok ? r.data.positionId : undefined,
      };
    } catch (e: any) {
      return { user: uid(i), ok: false, code: e?.code ?? "THROW", ms: Date.now() - s, err: String(e?.message ?? e).split("\n")[0].slice(0, 90) };
    }
  }),
);
const elapsed = Date.now() - t0;

/* ── THE MEASUREMENT THAT MATTERS ─────────────────────────────────────────── */
console.log("  ── results ──────────────────────────────────────────────────────");
const okCount = rows.filter((r) => r.ok).length;
const byCode = new Map<string, number>();
for (const r of rows) byCode.set(r.code, (byCode.get(r.code) ?? 0) + 1);
console.log(`  ${okCount}/${CONC} succeeded in ${elapsed}ms`);
for (const [code, n] of [...byCode].sort((a, b) => b[1] - a[1])) console.log(`     ${String(n).padStart(3)}  ${code}`);

console.log("\n  ── WALLET DELTA OF EVERY *FAILED* BET (must be 0) ───────────────");
let leaked = 0;
let leakedTzs = 0;
for (const r of rows) {
  const after = (await db.wallet.findByUserId(r.user))!.balance;
  const delta = before.get(r.user)! - after;   // positive = money left the wallet
  if (!r.ok) {
    const bad = delta !== 0;
    if (bad) { leaked++; leakedTzs += delta; }
    console.log(`     ${bad ? "LEAK" : "  ok"}  ${r.user}  code=${r.code.padEnd(14)} walletΔ=${delta}`);
  }
}

/* ── Independent cross-checks straight from SQL ───────────────────────────── */
const posCount: any = await client.$queryRawUnsafe(
  `SELECT count(*)::int AS n FROM "Position" WHERE "marketId" = '${market.id}'`);
const mk: any = await client.$queryRawUnsafe(
  `SELECT "yesPool"::int AS yes, "noPool"::int AS no, "predictorCount" AS pc FROM "PredictionMarket" WHERE id = '${market.id}'`);
// Orphan debit detector: a BET_PLACED txn whose position does not exist.
const orphans: any = await client.$queryRawUnsafe(
  `SELECT count(*)::int AS n FROM "Transaction" t
    WHERE t.type = 'BET_PLACED'
      AND t."userId" LIKE 'ld_${runId}_%'
      AND NOT EXISTS (SELECT 1 FROM "Position" p WHERE p.id = t."positionId")`).catch(() => [{ n: -1 }]);

let totalDebited = 0;
for (const r of rows) {
  const after = (await db.wallet.findByUserId(r.user))!.balance;
  totalDebited += before.get(r.user)! - after;
}
const acceptedStakes = okCount * STAKE;
const pool = (mk[0]?.yes ?? 0) + (mk[0]?.no ?? 0);

console.log("\n  ── conservation ────────────────────────────────────────────────");
console.log(`     positions created      : ${posCount[0].n}`);
console.log(`     successful bets        : ${okCount}`);
console.log(`     market pool (yes+no)   : ${pool}`);
console.log(`     Σ wallet debits        : ${totalDebited}`);
console.log(`     Σ accepted stakes      : ${acceptedStakes}`);
console.log(`     orphan BET_PLACED txns : ${orphans[0].n}`);
console.log(`     DRIFT (debits−accepted): ${totalDebited - acceptedStakes}`);

console.log("\n  ═════════════════════════════════════════════════════════════════");
if (leaked > 0 || totalDebited !== acceptedStakes) {
  console.log(`   MONEY BUG CONFIRMED`);
  console.log(`   ${leaked} failed bet(s) left the wallet debited.`);
  console.log(`   ${leakedTzs} TZS destroyed: debited, no position, never refunded.`);
  console.log("  ═════════════════════════════════════════════════════════════════\n");
  await client.$disconnect();
  process.exit(1);
}
console.log(`   No money lost. Every failed bet left walletΔ = 0.`);
console.log("  ═════════════════════════════════════════════════════════════════\n");
await client.$disconnect();
