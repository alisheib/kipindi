/**
 * S13 — measure the scale ceilings in POLISH-BACKLOG §3, before and after.
 *
 * The backlog says the leaderboard and `db.txn.listAll()` "bite at ~1k users". That number
 * was reasoned, not measured. This seeds a disposable database to a stated size and times
 * the actual paths, so the entry can carry a measurement instead of an estimate — and so
 * "fixed" can be replaced by the new threshold, which is the honest claim.
 *
 * Usage:
 *   DATABASE_URL=<disposable postgres> npx tsx scripts/load/s13-scale-ceilings.mts [users] [txnsPerUser]
 */
/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";

const BASE = process.env.DATABASE_URL;
if (!BASE) { console.error("DATABASE_URL not set"); process.exit(1); }
if (/rlwy\.net|railway\.app|railway\.internal|50pick\.tz/i.test(BASE)) {
  console.error("!! REFUSING — DATABASE_URL points at production. S13 writes tens of thousands of rows.");
  process.exit(2);
}

const USERS = Number(process.argv[2] ?? 1000);
const TXNS_PER_USER = Number(process.argv[3] ?? 100);
const prisma = new PrismaClient({ datasources: { db: { url: BASE } }, log: ["error"] });

const ms = (t: bigint): number => Number(process.hrtime.bigint() - t) / 1e6;

async function seed(): Promise<void> {
  const existing = await prisma.user.count();
  if (existing >= USERS) { console.log(`seed: ${existing} users already present, reusing`); return; }

  console.log(`seeding ${USERS} users × ${TXNS_PER_USER} transactions …`);
  const t0 = process.hrtime.bigint();
  const CHUNK = 500;
  for (let i = 0; i < USERS; i += CHUNK) {
    const users = Array.from({ length: Math.min(CHUNK, USERS - i) }, (_, k) => {
      const n = i + k;
      return {
        id: `usr_s13_${String(n).padStart(7, "0")}`,
        phoneE164: `+2557${String(10_000_000 + n).slice(0, 8)}`,
        passwordHash: "x",
        role: "PLAYER" as const,
        status: "ACTIVE" as const,
        dob: new Date("1995-01-01"),
      };
    });
    await prisma.user.createMany({ data: users, skipDuplicates: true });
    await prisma.wallet.createMany({
      data: users.map((u) => ({ id: `wlt_s13_${u.id.slice(8)}`, userId: u.id, balance: 5000 })),
      skipDuplicates: true,
    });
    const wallets = users.map((u) => `wlt_s13_${u.id.slice(8)}`);
    const txns = [];
    for (let w = 0; w < wallets.length; w++) {
      for (let t = 0; t < TXNS_PER_USER; t++) {
        txns.push({
          id: `txn_s13_${i + w}_${t}`,
          walletId: wallets[w],
          userId: users[w].id,
          type: t % 3 === 0 ? "DEPOSIT" : t % 3 === 1 ? "BET_PLACED" : "BET_PAYOUT",
          status: "CONFIRMED",
          amount: 1000 + (t % 7) * 100,
          // Spread across ~a year, so a 30-day window genuinely EXCLUDES most rows.
          // ⚠️ An earlier version used `t * 3_600_000` — one hour apart — which put all
          // 100 transactions inside 4 days. The 30-day window then matched everything and
          // `listInRange` measured identically to `listAll`, making a real 66× improvement
          // look like no improvement at all. A benchmark whose fixture cannot exercise the
          // thing being measured reports a confident, wrong number.
          createdAt: new Date(Date.now() - (t * 3.65 * 86_400_000 + w * 60_000)),
        });
      }
    }
    await prisma.transaction.createMany({ data: txns as never, skipDuplicates: true });
    // Settled positions, so the leaderboard aggregate has something to rank. One market
    // is enough — the board groups by user, and the market is not in the GROUP BY.
    await prisma.predictionMarket.upsert({
      where: { id: "mkt_s13" },
      update: {},
      create: {
        id: "mkt_s13", titleEn: "s13", titleSw: "s13", category: "OTHER",
        status: "RESOLVED", resolutionAt: new Date(),
        sourceUrl: "https://example.invalid/s13",
        resolutionCriterion: "s13 fixture", proposedBy: "s13",
      } as never,
    });
    await prisma.position.createMany({
      data: users.flatMap((u, w) =>
        Array.from({ length: 5 }, (_, k) => ({
          id: `pos_s13_${i + w}_${k}`,
          userId: u.id,
          marketId: "mkt_s13",
          side: k % 2 === 0 ? "YES" : "NO",
          stake: 1000,
          potentialPayout: 1800,
          status: k % 3 === 0 ? "WIN" : "LOSS",
          finalPayout: k % 3 === 0 ? 1800 : 0,
          placedAt: new Date(Date.now() - k * 86_400_000),
          settledAt: new Date(),
        })),
      ) as never,
      skipDuplicates: true,
    });
    if ((i / CHUNK) % 2 === 0) process.stdout.write(`   ${i + users.length}/${USERS}\r`);
  }
  console.log(`\nseeded in ${(ms(t0) / 1000).toFixed(1)}s`);
}

async function main(): Promise<void> {
  await seed();
  const users = await prisma.user.count();
  const txns = await prisma.transaction.count();
  console.log(`\ndataset: ${users} users · ${txns} transactions\n`);

  process.env.USE_PRISMA_DAL = "true";
  const { db } = await import("../../src/lib/server/store.ts");

  // ── The whole-table walk ───────────────────────────────────────────────────
  let t = process.hrtime.bigint();
  const all = await db.txn.listAll();
  const listAllMs = ms(t);
  const heapMb = process.memoryUsage().heapUsed / 1_048_576;
  console.log(`db.txn.listAll()            ${listAllMs.toFixed(0)} ms · ${all.length} rows · heap ${heapMb.toFixed(0)} MB`);

  // ── The same question, pushed into SQL ─────────────────────────────────────
  const since = Date.now() - 30 * 86_400_000;
  t = process.hrtime.bigint();
  const inJs = (await db.txn.listAll()).filter((x) => Date.parse(x.createdAt) >= since);
  const jsFilterMs = ms(t);
  t = process.hrtime.bigint();
  const inSql = await prisma.transaction.count({ where: { createdAt: { gte: new Date(since) } } });
  const sqlMs = ms(t);
  console.log(`30-day window, JS filter    ${jsFilterMs.toFixed(0)} ms · ${inJs.length} rows`);
  console.log(`30-day window, SQL          ${sqlMs.toFixed(0)} ms · ${inSql} rows`);

  // ── The leaderboard, as the public page builds it ──────────────────────────
  t = process.hrtime.bigint();
  const allUsers = await db.user.list();
  const listUsersMs = ms(t);
  t = process.hrtime.bigint();
  const { listPositionsForUser } = await import("../../src/lib/server/market-service.ts");
  // The page does exactly this: one positions query per user, in parallel.
  const sample = allUsers.slice(0, Math.min(allUsers.length, 250));
  await Promise.all(sample.map((u) => listPositionsForUser(u.id, 5_000).catch(() => [])));
  const perUserMs = ms(t);
  console.log(`db.user.list()              ${listUsersMs.toFixed(0)} ms · ${allUsers.length} users`);
  console.log(`positions N+1 (${sample.length} users)  ${perUserMs.toFixed(0)} ms  ⇒ ~${((perUserMs / sample.length) * allUsers.length).toFixed(0)} ms for all ${allUsers.length}`);

  // ── AFTER: the same questions, asked properly ──────────────────────────────
  console.log("\n── after ──");
  t = process.hrtime.bigint();
  const ranged = await db.txn.listInRange(since, Date.now());
  const rangeMs = ms(t);
  console.log(`db.txn.listInRange(30d)     ${rangeMs.toFixed(0)} ms · ${ranged.length} rows`);

  t = process.hrtime.bigint();
  const one = await db.txn.listForUser(allUsers[0]!.id);
  const oneMs = ms(t);
  console.log(`db.txn.listForUser(1 user)  ${oneMs.toFixed(0)} ms · ${one.length} rows`);

  const { positionStore } = await import("../../src/lib/server/market-dal.ts");
  t = process.hrtime.bigint();
  const board = await positionStore.leaderboard(50);
  const boardMs = ms(t);
  console.log(`positionStore.leaderboard   ${boardMs.toFixed(0)} ms · ${board.length} rows (limit 50)`);

  console.log(`\n::s13-result::${JSON.stringify({
    rangeMs: Math.round(rangeMs), oneMs: Math.round(oneMs), boardMs: Math.round(boardMs),
    users, txns, listAllMs: Math.round(listAllMs), jsFilterMs: Math.round(jsFilterMs),
    sqlMs: Math.round(sqlMs), heapMb: Math.round(heapMb),
    perUserMs: Math.round(perUserMs), sampled: sample.length,
  })}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
