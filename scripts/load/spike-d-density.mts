/**
 * SPIKE D — playing density: the single-market throughput ceiling (S02 vs S03).
 *
 * The owner's #1 question: "thousands of players on ONE market." The pari-mutuel
 * worst case is that every bet on a market serializes on ONE advisory lock
 * (`market:<id>`, market-service.ts:412). No number of containers beats a
 * single-market serialization ceiling.
 *
 * To measure the LOCK ceiling and not just re-hit Finding A's deadlock, we run
 * with a GENEROUS pool (each bet needs 2 connections; pool >> 2*concurrency), so
 * the only thing that serializes concurrent bets by DISTINCT users on ONE market
 * is the market advisory lock itself.
 *
 * S02: N concurrent bets, ONE market      -> throughput is lock-bound.
 * S03: same N,          M markets         -> throughput scales with M if lock-bound.
 * The DIFF is the diagnosis:
 *    S03 >> S02  => the MARKET LOCK is the bottleneck (need atomic pool update).
 *    S03 ~= S02  => the POOL is the bottleneck (need a bigger/lighter path).
 *
 * Usage:
 *   node scripts/load/reset-db.mjs
 *   npx tsx scripts/load/spike-d-density.mts [--pool=60]
 */
/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";

const arg = (k: string, d: number): number => {
  const hit = process.argv.find((a) => a.startsWith(`--${k}=`));
  return hit ? Number(hit.split("=")[1]) : d;
};
const POOL = arg("pool", 60);
const STAKE = 1000;
const FUND = 10_000_000; // big float: each user places many bets in the throughput runs

const BASE = process.env.DATABASE_URL;
if (!BASE) { console.error("DATABASE_URL not set"); process.exit(1); }

{
  const probe = new PrismaClient();
  const r: any = await probe.$queryRawUnsafe(
    `SELECT value FROM "SystemConfig" WHERE key = '__LOAD_TEST_TARGET__'`).catch(() => []);
  await probe.$disconnect();
  if (r[0]?.value !== "I_AM_A_DISPOSABLE_LOAD_TEST_DB") {
    console.error("\n  ABORT — target DB is not a certified disposable load-test DB.\n"); process.exit(2);
  }
}

const url = new URL(BASE);
url.searchParams.set("connection_limit", String(POOL));
url.searchParams.set("pool_timeout", "20");
const client = new PrismaClient({ datasources: { db: { url: url.toString() } } });
(globalThis as any).__50PICK_PRISMA = client;

const { prisma } = await import("../../src/lib/server/prisma.ts");
const { db } = await import("../../src/lib/server/store.ts");
const { createMarket, buyPosition } = await import("../../src/lib/server/market-service.ts");
if (prisma() !== client) { console.error("ABORT — hook did not take."); process.exit(1); }

const now = () => new Date().toISOString();
const runId = Math.random().toString(36).slice(2, 8);
let uSeq = 0;

async function seedUsers(n: number): Promise<string[]> {
  const base = uSeq; uSeq += n;
  await client.$executeRawUnsafe(`
    INSERT INTO "User" (id, "phoneE164", "failedLoginCount", role, status, locale,
                        "marketingOptIn", "twoFactorEnabled", "createdAt", "updatedAt")
    SELECT '${runId}_u' || i, '+2557' || lpad((${base}+i)::text, 8, '0'), 0, 'PLAYER', 'ACTIVE', 'EN',
           false, false, now(), now()
    FROM generate_series(${base}, ${base + n - 1}) AS i`);
  await client.$executeRawUnsafe(`
    INSERT INTO "Wallet" (id, "userId", balance, "bonusBalance", pending, hold, currency,
                          status, "createdAt", "updatedAt")
    SELECT '${runId}_w' || i, '${runId}_u' || i, ${FUND}, 0, 0, 0, 'TZS', 'ACTIVE', now(), now()
    FROM generate_series(${base}, ${base + n - 1}) AS i`);
  return Array.from({ length: n }, (_, i) => `${runId}_u${base + i}`);
}

async function makeMarkets(m: number): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 0; i < m; i++) {
    const mk = await createMarket({
      titleEn: `Density ${runId} ${i}`, titleSw: "Soko la majaribio", category: "macro",
      sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves at the official date.",
      resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "load",
    } as never);
    ids.push(mk.id);
  }
  return ids;
}

/**
 * Sustained-throughput probe: keep CONC bets in flight for ~`durationMs`, each
 * picking a random user and (for S03) a random market. Returns completed OK/s and
 * the latency distribution of the accepted bets.
 */
async function throughput(label: string, users: string[], markets: string[], CONC: number, totalBets: number) {
  let issued = 0, ok = 0, fail = 0;
  const lat: number[] = [];
  const codes = new Map<string, number>();
  const t0 = Date.now();

  async function worker() {
    while (issued < totalBets) {
      const n = issued++;
      if (n >= totalBets) break;
      const u = users[n % users.length];
      const mid = markets[n % markets.length];
      const s = Date.now();
      try {
        const r: any = await buyPosition(u, { marketId: mid, side: n % 2 ? "YES" : "NO", stake: STAKE });
        if (r.ok) { ok++; lat.push(Date.now() - s); }
        else { fail++; codes.set(r.code, (codes.get(r.code) ?? 0) + 1); }
      } catch (e: any) {
        fail++; const c = e?.code ?? "THROW"; codes.set(c, (codes.get(c) ?? 0) + 1);
      }
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));
  const secs = (Date.now() - t0) / 1000;
  lat.sort((a, b) => a - b);
  const pct = (p: number) => lat[Math.min(lat.length - 1, Math.floor(lat.length * p))] ?? 0;
  const codeStr = [...codes].map(([c, n]) => `${c}:${n}`).join(" ") || "-";
  console.log(
    `   ${label.padEnd(26)} ${String(ok).padStart(5)} ok  ${String(fail).padStart(4)} fail  ` +
    `${(ok / secs).toFixed(0).padStart(5)} bets/s   p50=${String(pct(0.5)).padStart(4)}ms p95=${String(pct(0.95)).padStart(5)}ms  ${codeStr}`,
  );
  return { ok, fail, throughput: ok / secs, p50: pct(0.5), p95: pct(0.95) };
}

console.log(`\n  SPIKE D — playing density  (pool=${POOL}, so 2 conns/bet does NOT deadlock)\n`);

const users = await seedUsers(400);

console.log("  ── S02: ONE market, rising concurrency (the pari-mutuel ceiling) ──");
const oneMarket = await makeMarkets(1);
const s02: any[] = [];
for (const C of [1, 2, 4, 8, 16, 24]) {
  s02.push({ C, ...(await throughput(`C=${C}, 1 market`, users, oneMarket, C, 400)) });
}

console.log("\n  ── S03: SAME concurrency, spread across 25 markets ──");
const manyMarkets = await makeMarkets(25);
const s03: any[] = [];
for (const C of [8, 16, 24]) {
  s03.push({ C, ...(await throughput(`C=${C}, 25 markets`, users, manyMarkets, C, 400)) });
}

/* ── The diagnostic diff ─────────────────────────────────────────────────── */
const oneMax = Math.max(...s02.map((r) => r.throughput));
const spreadMax = Math.max(...s03.map((r) => r.throughput));
console.log("\n  ── diagnosis ────────────────────────────────────────────────────");
console.log(`   single-market ceiling : ${oneMax.toFixed(0)} bets/s  (all serialize on one market lock)`);
console.log(`   spread (25 markets)   : ${spreadMax.toFixed(0)} bets/s`);
console.log(`   ratio                 : ${(spreadMax / oneMax).toFixed(1)}x`);
if (spreadMax > oneMax * 2) {
  console.log(`   => the MARKET LOCK is the bottleneck. Spreading load helps; a hot market does not.`);
  console.log(`      One popular market cannot exceed ~${oneMax.toFixed(0)} bets/s no matter how many containers.`);
} else {
  console.log(`   => the POOL / path cost dominates; spreading markets does not help much.`);
}
console.log(`\n   Owner targets: T2 needs 200 bets/s, T3 needs 1,000 bets/s ON ONE MARKET.`);
console.log(`   Single-market ceiling measured here: ${oneMax.toFixed(0)} bets/s (local; Railway RTT will be lower).`);
console.log();

/* ── Conservation check: the pool must equal Σ accepted stakes exactly ────── */
const mk: any = await client.$queryRawUnsafe(
  `SELECT "yesPool"::int y, "noPool"::int n FROM "PredictionMarket" WHERE id='${oneMarket[0]}'`);
const pos: any = await client.$queryRawUnsafe(
  `SELECT COUNT(*)::int c, COALESCE(SUM(stake),0)::int s FROM "Position" WHERE "marketId"='${oneMarket[0]}'`);
const pool = mk[0].y + mk[0].n;
console.log(`  ── conservation on the hot market ─────────────────────────────`);
console.log(`     pool (yes+no)      : ${pool}`);
console.log(`     Σ position stakes  : ${pos[0].s}   (${pos[0].c} positions)`);
console.log(`     ${pool === pos[0].s ? "PASS — pool == Σ stakes (no lost update under lock contention)" : `FAIL — DRIFT ${pool - pos[0].s}`}`);
console.log();
await client.$disconnect();
