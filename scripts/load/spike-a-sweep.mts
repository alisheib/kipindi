/**
 * SPIKE A (sweep) — find the deadlock frontier AND the money-loss window.
 *
 * SPIKE A at C=20/pool=5 jammed so hard that every request died during the
 * PRE-LOCK reads — before the wallet debit at market-service.ts:364. Nothing
 * leaked because nothing ever started.
 *
 * The money bug needs a narrower window: a bet that
 *    (a) acquires pool connection #1 for withLock(`wallet:`)  (:337)
 *    (b) COMMITS the debit on a second, autocommitting connection (:364)
 *    (c) then starves waiting for a connection for the NESTED withLock(`market:`) (:412)
 *    (d) throws P2024 — unwinding PAST the closedInFlight refund (:432), which
 *        only runs on a clean RETURN, never on a THROW.
 *
 * That window should sit at C just above the pool size. So: sweep it.
 *
 * For every failed bet at every concurrency we report walletDelta. Any non-zero
 * value is destroyed money.
 *
 * Usage:
 *   node scripts/load/reset-db.mjs
 *   npx tsx scripts/load/spike-a-sweep.mts [--pool=5]
 */
/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";

const arg = (k: string, d: number): number => {
  const hit = process.argv.find((a) => a.startsWith(`--${k}=`));
  return hit ? Number(hit.split("=")[1]) : d;
};
const POOL = arg("pool", 5);
const STAKE = 1000;
const FUND = 50_000;
const CONCS = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 16, 24, 32];

const BASE = process.env.DATABASE_URL;
if (!BASE) { console.error("DATABASE_URL not set"); process.exit(1); }

{
  const probe = new PrismaClient();
  const r: any = await probe.$queryRawUnsafe(
    `SELECT value FROM "SystemConfig" WHERE key = '__LOAD_TEST_TARGET__'`).catch(() => []);
  await probe.$disconnect();
  if (r[0]?.value !== "I_AM_A_DISPOSABLE_LOAD_TEST_DB") {
    console.error("\n  ABORT — target DB is not a certified disposable load-test DB.\n");
    process.exit(2);
  }
}

/* The hook — install our pool-limited client BEFORE any service import. */
const url = new URL(BASE);
url.searchParams.set("connection_limit", String(POOL));
url.searchParams.set("pool_timeout", "10");
const client = new PrismaClient({ datasources: { db: { url: url.toString() } } });
(globalThis as any).__50PICK_PRISMA = client;

const { prisma, hasDatabase } = await import("../../src/lib/server/prisma.ts");
const { db } = await import("../../src/lib/server/store.ts");
const { createMarket, buyPosition } = await import("../../src/lib/server/market-service.ts");

if (!hasDatabase() || prisma() !== client) {
  console.error("ABORT — instrumentation hook did not take."); process.exit(1);
}

const now = () => new Date().toISOString();
const runId = Math.random().toString(36).slice(2, 8);
let userSeq = 0;

async function fundedUser(): Promise<string> {
  const i = userSeq++;
  const id = `ld_${runId}_u${i}`;
  await db.user.create({
    id, phoneE164: `+2559${String(7000000 + i).padStart(8, "0")}`,
    passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "EN", displayName: null, dob: null,
    region: null, acceptedTermsVersion: null, acceptedTermsAt: null, marketingOptIn: false,
    twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({
    id: `ld_${runId}_w${i}`, userId: id, balance: FUND, pending: 0, hold: 0,
    currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now(),
  } as never);
  return id;
}

console.log(`\n  SPIKE A SWEEP — pool=${POOL}  stake=${STAKE}`);
console.log(`  Looking for: (1) the deadlock frontier  (2) ANY failed bet with walletΔ != 0\n`);
console.log("   C   ok/N    p50ms   codes                          Σdebits  Σaccepted  DRIFT  LEAKS");
console.log("  ─────────────────────────────────────────────────────────────────────────────────────");

let anyLeak = 0;
let anyLeakTzs = 0;
const frontier: { c: number; okRate: number }[] = [];

for (const C of CONCS) {
  // Fresh cohort + fresh market per concurrency level — no cross-contamination.
  const users: string[] = [];
  for (let i = 0; i < C; i++) users.push(await fundedUser());
  const market = await createMarket({
    titleEn: `Sweep C=${C}`, titleSw: "Soko la majaribio", category: "macro",
    sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves at the official date.",
    resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "load",
  } as never);

  const before = new Map<string, number>();
  for (const u of users) before.set(u, (await db.wallet.findByUserId(u))!.balance);

  const t0 = Date.now();
  const rows = await Promise.all(users.map(async (u, i) => {
    const s = Date.now();
    try {
      const r: any = await buyPosition(u, { marketId: market.id, side: i % 2 ? "YES" : "NO", stake: STAKE });
      return { u, ok: !!r.ok, code: r.ok ? "OK" : (r.code ?? "?"), ms: Date.now() - s };
    } catch (e: any) {
      return { u, ok: false, code: e?.code ?? "THROW", ms: Date.now() - s };
    }
  }));
  const _elapsed = Date.now() - t0;

  const okCount = rows.filter((r) => r.ok).length;
  const lat = rows.map((r) => r.ms).sort((a, b) => a - b);
  const p50 = lat[Math.floor(lat.length / 2)] ?? 0;

  const byCode = new Map<string, number>();
  for (const r of rows) byCode.set(r.code, (byCode.get(r.code) ?? 0) + 1);
  const codeStr = [...byCode].sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c}:${n}`).join(" ");

  // Wallet deltas
  let sumDebit = 0;
  const leaks: string[] = [];
  for (const r of rows) {
    const after = (await db.wallet.findByUserId(r.u))!.balance;
    const delta = before.get(r.u)! - after;
    sumDebit += delta;
    if (!r.ok && delta !== 0) { leaks.push(`${r.u} code=${r.code} Δ=${delta}`); anyLeak++; anyLeakTzs += delta; }
  }
  const accepted = okCount * STAKE;
  const drift = sumDebit - accepted;

  frontier.push({ c: C, okRate: okCount / C });
  const flag = leaks.length ? `LEAK×${leaks.length}` : (drift !== 0 ? `DRIFT!` : "");
  console.log(
    `  ${String(C).padStart(2)}  ${String(okCount).padStart(2)}/${String(C).padEnd(2)}  ${String(p50).padStart(6)}   ${codeStr.padEnd(30)} ${String(sumDebit).padStart(7)}  ${String(accepted).padStart(9)}  ${String(drift).padStart(5)}  ${flag}`,
  );
  for (const l of leaks) console.log(`        !! ${l}`);
}

console.log("\n  ── deadlock frontier ───────────────────────────────────────────");
for (const f of frontier) {
  const bar = "#".repeat(Math.round(f.okRate * 40));
  console.log(`   C=${String(f.c).padStart(2)}  ${(f.okRate * 100).toFixed(0).padStart(3)}%  ${bar}`);
}

// Global orphan-debit check across the whole run.
const orphans: any = await client.$queryRawUnsafe(
  `SELECT count(*)::int AS n FROM "Transaction" t
    WHERE t.type = 'BET_PLACED' AND t."userId" LIKE 'ld_${runId}_%'
      AND NOT EXISTS (SELECT 1 FROM "Position" p WHERE p.id = t."positionId")`).catch(() => [{ n: -1 }]);

console.log("\n  ═════════════════════════════════════════════════════════════════");
console.log(`   orphan BET_PLACED txns (debit, no position): ${orphans[0].n}`);
if (anyLeak > 0) {
  console.log(`   MONEY BUG CONFIRMED — ${anyLeak} failed bet(s) left the wallet debited.`);
  console.log(`   ${anyLeakTzs} TZS destroyed: debited, no position, never refunded.`);
} else {
  console.log(`   No wallet leak observed at any concurrency in this sweep.`);
}
console.log("  ═════════════════════════════════════════════════════════════════\n");
await client.$disconnect();
