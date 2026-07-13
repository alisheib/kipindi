/**
 * SPIKE B — the read-path OOM.
 *
 * HYPOTHESIS (plan #2):
 *   traderSeedsByMarket() (market-service.ts:552) calls positionStore.values(),
 *   which is `position.findMany()` with NO where, NO take, NO select
 *   (market-dal.ts:265). It hydrates the ENTIRE Position table into JS objects...
 *   to compute at most THREE trader avatars per market card.
 *
 *   It runs on `/` (page.tsx:20), `/markets` (:267) and `/live` (:35) — the three
 *   highest-traffic anonymous pages — all force-dynamic, with no caching anywhere.
 *
 *   This needs ZERO concurrency. It is purely a function of TABLE SIZE. Every
 *   anonymous visitor pays for every position ever placed, forever.
 *
 * MEASURE: elapsed + RSS delta at growing row counts, then 3x concurrently
 *          (the real failure mode: 3 visitors at once = 3 copies in flight).
 *
 * Usage:
 *   node scripts/load/reset-db.mjs
 *   npx tsx --expose-gc scripts/load/spike-b-read-oom.mts
 */
/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";

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

const url = new URL(BASE);
url.searchParams.set("connection_limit", "10");
const client = new PrismaClient({ datasources: { db: { url: url.toString() } } });
(globalThis as any).__50PICK_PRISMA = client;

const { prisma } = await import("../../src/lib/server/prisma.ts");
const { traderSeedsByMarket } = await import("../../src/lib/server/market-service.ts");
if (prisma() !== client) { console.error("ABORT — hook did not take."); process.exit(1); }

const MB = (b: number) => (b / 1024 / 1024).toFixed(0);
const rss = () => process.memoryUsage().rss;
const heap = () => process.memoryUsage().heapUsed;

/* ── Background volume: cheap cold rows via generate_series ───────────────── */
const USERS = 2000;
const MARKETS = 50;

console.log("\n  SPIKE B — the read-path OOM");
console.log("  traderSeedsByMarket() -> position.findMany() with no where/take/select\n");
console.log("  seeding parent rows (2,000 users + 50 markets)...");

await client.$executeRawUnsafe(`
  INSERT INTO "User" (id, "phoneE164", "failedLoginCount", role, status, locale,
                      "marketingOptIn", "twoFactorEnabled", "createdAt", "updatedAt")
  SELECT 'ld_u' || i, '+2557' || lpad(i::text, 8, '0'), 0, 'PLAYER', 'ACTIVE', 'EN',
         false, false, now(), now()
  FROM generate_series(1, ${USERS}) AS i
  ON CONFLICT (id) DO NOTHING`);

await client.$executeRawUnsafe(`
  INSERT INTO "PredictionMarket" (id, "titleEn", "titleSw", category, "sourceUrl",
                     "resolutionCriterion", "resolutionAt", status, "yesPool", "noPool",
                     "predictorCount", "proposedBy", "createdAt", "updatedAt")
  SELECT 'ld_m' || i, 'Load market ' || i, 'Soko ' || i, 'macro', 'https://bot.go.tz',
         'Resolves at the official date.', now() + interval '7 days', 'LIVE', 0, 0, 0,
         'load', now(), now()
  FROM generate_series(1, ${MARKETS}) AS i
  ON CONFLICT (id) DO NOTHING`);

/* ── The curve ────────────────────────────────────────────────────────────── */
const STEPS = [10_000, 50_000, 100_000, 250_000, 500_000];
let seeded = 0;

console.log("\n     rows      seed     1 call: elapsed   RSS delta   heap delta   bytes/row   |   3 CONCURRENT: elapsed  RSS delta");
console.log("  ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────");

const curve: { rows: number; ms: number; rssDelta: number; ms3: number; rss3: number }[] = [];

for (const target of STEPS) {
  const need = target - seeded;
  const t0 = Date.now();
  // generate_series bulk insert — seconds, not hours.
  await client.$executeRawUnsafe(`
    INSERT INTO "Position" (id, "userId", "marketId", side, stake, "bonusStakeTzs",
                            "potentialPayout", status, "placedAt")
    SELECT 'ld_p' || i,
           'ld_u' || (1 + (i % ${USERS})),
           'ld_m' || (1 + (i % ${MARKETS})),
           CASE WHEN i % 2 = 0 THEN 'YES'::"MarketSide" ELSE 'NO'::"MarketSide" END,
           1000, 0, 1800, 'OPEN'::"PositionStatus", now()
    FROM generate_series(${seeded + 1}, ${seeded + need}) AS i`);
  seeded = target;
  await client.$executeRawUnsafe(`ANALYZE "Position"`);
  const seedMs = Date.now() - t0;

  // ── one call ──
  global.gc?.();
  await new Promise((r) => setTimeout(r, 150));
  const r0 = rss(), h0 = heap();
  const c0 = Date.now();
  const map = await traderSeedsByMarket();
  const ms = Date.now() - c0;
  const rssDelta = rss() - r0;
  const heapDelta = heap() - h0;
  const bytesPerRow = rssDelta / target;
  if (map.size === 0) { console.error("  !! traderSeedsByMarket returned empty — seeding failed"); process.exit(1); }

  // ── three concurrent (three visitors hitting `/` at the same moment) ──
  global.gc?.();
  await new Promise((r) => setTimeout(r, 150));
  const r1 = rss();
  const c1 = Date.now();
  await Promise.all([traderSeedsByMarket(), traderSeedsByMarket(), traderSeedsByMarket()]);
  const ms3 = Date.now() - c1;
  const rss3 = rss() - r1;

  curve.push({ rows: target, ms, rssDelta, ms3, rss3 });
  console.log(
    `  ${String(target).padStart(8)}  ${String(seedMs + "ms").padStart(7)}` +
    `     ${String(ms + "ms").padStart(10)}  ${String(MB(rssDelta) + "MB").padStart(10)}  ${String(MB(heapDelta) + "MB").padStart(11)}  ${bytesPerRow.toFixed(0).padStart(9)}` +
    `   |  ${String(ms3 + "ms").padStart(14)}  ${String(MB(rss3) + "MB").padStart(9)}`,
  );
}

/* ── Extrapolate: when does a Railway container die? ──────────────────────── */
const last = curve[curve.length - 1];
const bpr = last.rssDelta / last.rows;   // bytes of RSS per Position row, per in-flight request
const msPerRow = last.ms / last.rows;

console.log("\n  ── what this costs, per in-flight request ──────────────────────");
console.log(`     ${bpr.toFixed(0)} bytes of RSS per Position row`);
console.log(`     ${(msPerRow * 1000).toFixed(1)} µs per row`);

console.log("\n  ── the row count at which ONE page view exhausts the container ──");
for (const containerMB of [512, 1024, 2048, 4096]) {
  const usableBytes = containerMB * 1024 * 1024 * 0.6; // ~60% available to the heap
  const rowsFor1 = usableBytes / bpr;
  const rowsFor10 = usableBytes / (bpr * 10);
  console.log(
    `     ${String(containerMB).padStart(4)}MB container:  1 concurrent view OOMs at ~${Math.round(rowsFor1).toLocaleString()} rows` +
    `  ·  10 concurrent views OOM at ~${Math.round(rowsFor10).toLocaleString()} rows`,
  );
}

console.log("\n  ── time to render `/` (position scan alone, excl. everything else) ──");
for (const rows of [50_000, 500_000, 2_000_000]) {
  console.log(`     ${String(rows.toLocaleString()).padStart(9)} positions -> ${(msPerRow * rows).toFixed(0)}ms per page view`);
}
console.log();
await client.$disconnect();
