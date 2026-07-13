/**
 * SPIKE A (proof) — two questions the report must answer with evidence, not opinion:
 *
 *   Q1. "Can we just raise connection_limit?"
 *       Sweep pool ∈ {5,10,20,40} and find, for each, the lowest concurrency that
 *       (a) loses a bet, and (b) loses MONEY. If the leak band just SLIDES with the
 *       pool, a bigger pool buys nothing — it only moves the cliff.
 *
 *   Q2. "When money vanishes, what trace is left?"
 *       For every leaked shilling, check whether a Transaction / LedgerEntry exists.
 *       The debit at market-service.ts:364 commits BEFORE the Transaction row is
 *       written (which happens after positionStore.set). So a leak should leave the
 *       wallet lighter with NO txn, NO ledger entry, NO audit row — invisible money.
 *
 * This script only MEASURES. It changes nothing.
 *
 * Usage:
 *   node scripts/load/reset-db.mjs
 *   npx tsx scripts/load/spike-a-proof.mts
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

const POOLS = [5, 10, 20, 40];
const STAKE = 1000;
const FUND = 50_000;

console.log(`\n  SPIKE A — PROOF`);
console.log(`  Q1: does a bigger pool fix it, or just move the cliff?`);
console.log(`  Q2: when money vanishes, what trace is left?\n`);
console.log("  pool   first-loss-C   first-MONEY-loss-C   leaked TZS   max ok concurrency");
console.log("  ────────────────────────────────────────────────────────────────────────────");

const summary: { pool: number; firstFail: number | null; firstLeak: number | null; tzs: number; maxOk: number }[] = [];
let traceEvidence: string[] = [];

for (const POOL of POOLS) {
  // A fresh client + fresh module registry per pool size. tsx caches ESM modules,
  // so we re-import with a cache-busting query to get services bound to THIS client.
  const url = new URL(BASE);
  url.searchParams.set("connection_limit", String(POOL));
  url.searchParams.set("pool_timeout", "10");
  const client = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  (globalThis as any).__50PICK_PRISMA = client;

  const bust = `?pool=${POOL}`;
  const { prisma } = await import(`../../src/lib/server/prisma.ts${bust}`);
  const { db } = await import(`../../src/lib/server/store.ts${bust}`);
  const { createMarket, buyPosition } = await import(`../../src/lib/server/market-service.ts${bust}`);
  if (prisma() !== client) { console.error(`ABORT — hook did not take for pool=${POOL}`); process.exit(1); }

  const now = () => new Date().toISOString();
  const runId = `p${POOL}${Math.random().toString(36).slice(2, 6)}`;
  let seq = 0;
  const fundedUser = async (): Promise<string> => {
    const i = seq++;
    const id = `ld_${runId}_u${i}`;
    await db.user.create({
      id, phoneE164: `+255${String(POOL)}${String(1000000 + i).padStart(7, "0")}`,
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
  };

  let firstFail: number | null = null;
  let firstLeak: number | null = null;
  let tzs = 0;
  let maxOk = 0;

  for (let C = 1; C <= POOL * 2 + 4; C++) {
    const users: string[] = [];
    for (let i = 0; i < C; i++) users.push(await fundedUser());
    const market = await createMarket({
      titleEn: `Proof pool=${POOL} C=${C}`, titleSw: "Soko la majaribio", category: "macro",
      sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves at the official date.",
      resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "load",
    } as never);

    const before = new Map<string, number>();
    for (const u of users) before.set(u, (await db.wallet.findByUserId(u))!.balance);

    const rows = await Promise.all(users.map(async (u, i) => {
      try {
        const r: any = await buyPosition(u, { marketId: market.id, side: i % 2 ? "YES" : "NO", stake: STAKE });
        return { u, ok: !!r.ok, code: r.ok ? "OK" : (r.code ?? "?") };
      } catch (e: any) {
        return { u, ok: false, code: e?.code ?? "THROW" };
      }
    }));

    const okCount = rows.filter((r) => r.ok).length;
    if (okCount === C) maxOk = C;
    if (okCount < C && firstFail === null) firstFail = C;

    for (const r of rows) {
      const after = (await db.wallet.findByUserId(r.u))!.balance;
      const delta = before.get(r.u)! - after;
      if (!r.ok && delta !== 0) {
        if (firstLeak === null) firstLeak = C;
        tzs += delta;

        // ── Q2: what trace does the vanished money leave? ──────────────────
        if (traceEvidence.length < 3) {
          const txn: any = await client.$queryRawUnsafe(
            `SELECT count(*)::int AS n FROM "Transaction" WHERE "userId" = '${r.u}'`);
          const led: any = await client.$queryRawUnsafe(
            `SELECT count(*)::int AS n FROM "LedgerEntry" WHERE "userId" = '${r.u}'`).catch(() => [{ n: -1 }]);
          const pos: any = await client.$queryRawUnsafe(
            `SELECT count(*)::int AS n FROM "Position" WHERE "userId" = '${r.u}'`);
          const aud: any = await client.$queryRawUnsafe(
            `SELECT count(*)::int AS n FROM "AuditLog" WHERE "actorId" = '${r.u}'`);
          traceEvidence.push(
            `  pool=${POOL} C=${C}  user=${r.u}  code=${r.code}\n` +
            `     wallet debited : ${delta} TZS  (balance ${before.get(r.u)} -> ${after})\n` +
            `     Position rows  : ${pos[0].n}\n` +
            `     Transaction    : ${txn[0].n}\n` +
            `     LedgerEntry    : ${led[0].n}\n` +
            `     AuditLog       : ${aud[0].n}`,
          );
        }
      }
    }
    if (firstLeak !== null && C >= (firstLeak + 3)) break; // enough evidence at this pool
  }

  summary.push({ pool: POOL, firstFail, firstLeak, tzs, maxOk });
  console.log(
    `   ${String(POOL).padStart(3)}   ${String(firstFail ?? "-").padStart(11)}   ${String(firstLeak ?? "-").padStart(18)}   ${String(tzs).padStart(10)}   ${String(maxOk).padStart(18)}`,
  );
  await client.$disconnect();
}

console.log("\n  ── Q1: does a bigger pool fix it? ──────────────────────────────");
for (const s of summary) {
  console.log(`   pool=${String(s.pool).padStart(2)}  survives ${s.maxOk} concurrent bets  ·  loses money from C=${s.firstLeak ?? "-"}`);
}
console.log("\n  ── Q2: the trace left by vanished money ────────────────────────");
for (const t of traceEvidence) console.log(t + "\n");
console.log("  ═════════════════════════════════════════════════════════════════\n");
