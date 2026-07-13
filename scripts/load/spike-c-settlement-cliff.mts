/**
 * SPIKE C — the settlement cliff, the resume, and the partial-settle void hole.
 *
 * settleMarket loops EVERY open position SEQUENTIALLY inside withLock(`market:`)
 * (market-service.ts:1528), which is a $transaction with timeout: 30000 (locks.ts:75).
 * Per winner: findByUserId + wallet.adjust + positionStore.set + txn.create (+ audit,
 * notify, email, ledger). If the loop exceeds 30s -> P2028.
 *
 * Three questions:
 *   Q1. THE CLIFF. At how many winners does settlement blow the 30s timeout?
 *       Local PG (loopback, fsync=off) is far faster than Railway, so the honest,
 *       RTT-independent metric is ROUND-TRIPS PER WINNER. We count them with
 *       $on("query") and then project the cliff onto a real network.
 *
 *   Q2. THE RESUME. locks.ts:58-60 runs fn()'s writes on autocommitting connections,
 *       so a P2028 leaves paid winners COMMITTED but the market UNSETTLED. On retry,
 *       does anyone get paid twice? (:1405 filters status === "OPEN", so in theory no
 *       — but "in theory" is what this whole exercise exists to destroy.)
 *
 *   Q3. THE VOID HOLE. emergencyVoidMarket guards ONLY on m.settledAt (:1951). After a
 *       timed-out partial settle, settledAt is null but winners HAVE been paid. Can an
 *       officer then void the market and refund the losers too -- distributing MORE than
 *       the pool held? That would MINT money.
 *
 * Usage:
 *   node scripts/load/reset-db.mjs
 *   npx tsx scripts/load/spike-c-settlement-cliff.mts
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
const client = new PrismaClient({
  datasources: { db: { url: url.toString() } },
  log: [{ emit: "event", level: "query" }],
});
(globalThis as any).__50PICK_PRISMA = client;

let queryCount = 0;
let counting = false;
(client as any).$on("query", () => { if (counting) queryCount++; });

const { prisma } = await import("../../src/lib/server/prisma.ts");
const { settleMarket, emergencyVoidMarket } = await import("../../src/lib/server/market-service.ts");
if (prisma() !== client) { console.error("ABORT — hook did not take."); process.exit(1); }

const STAKE = 1000;
const FUND = 50_000;
let uSeq = 0;

/** Seed a RESOLVED market with W winners (YES) and L losers (NO), fully funded. */
async function seedMarket(tag: string, W: number, L: number): Promise<string> {
  const mid = `ld_m_${tag}`;
  const base = uSeq;
  uSeq += W + L;

  await client.$executeRawUnsafe(`
    INSERT INTO "User" (id, "phoneE164", "failedLoginCount", role, status, locale,
                        "marketingOptIn", "twoFactorEnabled", "createdAt", "updatedAt")
    SELECT 'ld_u' || i, '+2557' || lpad(i::text, 8, '0'), 0, 'PLAYER', 'ACTIVE', 'EN',
           false, false, now(), now()
    FROM generate_series(${base + 1}, ${base + W + L}) AS i
    ON CONFLICT (id) DO NOTHING`);

  await client.$executeRawUnsafe(`
    INSERT INTO "Wallet" (id, "userId", balance, "bonusBalance", pending, hold, currency,
                          status, "createdAt", "updatedAt")
    SELECT 'ld_w' || i, 'ld_u' || i, ${FUND}, 0, 0, 0, 'TZS', 'ACTIVE', now(), now()
    FROM generate_series(${base + 1}, ${base + W + L}) AS i
    ON CONFLICT (id) DO NOTHING`);

  // The market, already adjudicated YES. Pools reflect the real stakes.
  await client.$executeRawUnsafe(`
    INSERT INTO "PredictionMarket" (id, "titleEn", "titleSw", category, "sourceUrl",
        "resolutionCriterion", "resolutionAt", status, "yesPool", "noPool", "predictorCount",
        "resolvedOutcome", "proposedBy", "createdAt", "updatedAt")
    VALUES ('${mid}', 'Cliff ${tag}', 'Soko ${tag}', 'macro', 'https://bot.go.tz',
        'Resolves at the official date.', now() - interval '1 hour', 'RESOLVED',
        ${W * STAKE}, ${L * STAKE}, ${W + L}, 'YES', 'load', now(), now())`);

  // Winners on YES...
  await client.$executeRawUnsafe(`
    INSERT INTO "Position" (id, "userId", "marketId", side, stake, "bonusStakeTzs",
                            "potentialPayout", status, "placedAt")
    SELECT 'ld_p' || i, 'ld_u' || i, '${mid}', 'YES'::"MarketSide", ${STAKE}, 0, ${STAKE * 2},
           'OPEN'::"PositionStatus", now()
    FROM generate_series(${base + 1}, ${base + W}) AS i`);
  // ...losers on NO.
  await client.$executeRawUnsafe(`
    INSERT INTO "Position" (id, "userId", "marketId", side, stake, "bonusStakeTzs",
                            "potentialPayout", status, "placedAt")
    SELECT 'ld_p' || i, 'ld_u' || i, '${mid}', 'NO'::"MarketSide", ${STAKE}, 0, ${STAKE * 2},
           'OPEN'::"PositionStatus", now()
    FROM generate_series(${base + W + 1}, ${base + W + L}) AS i`);

  await client.$executeRawUnsafe(`ANALYZE "Position"`);
  return mid;
}

const sumPaid = async (mid: string): Promise<number> => {
  const r: any = await client.$queryRawUnsafe(
    `SELECT COALESCE(SUM(t.amount),0)::float AS s FROM "Transaction" t
      JOIN "Position" p ON p.id = t."positionId"
     WHERE p."marketId" = '${mid}' AND t.type = 'BET_PAYOUT'`);
  return r[0].s;
};
const sumWalletCredit = async (mid: string): Promise<number> => {
  // Every shilling that entered a wallet belonging to a punter in this market.
  const r: any = await client.$queryRawUnsafe(
    `SELECT COALESCE(SUM(w.balance),0)::float AS s FROM "Wallet" w
      WHERE w."userId" IN (SELECT DISTINCT "userId" FROM "Position" WHERE "marketId" = '${mid}')`);
  return r[0].s;
};
const posStatus = async (mid: string) => {
  const r: any = await client.$queryRawUnsafe(
    `SELECT status, count(*)::int AS n FROM "Position" WHERE "marketId"='${mid}' GROUP BY status`);
  return Object.fromEntries(r.map((x: any) => [x.status, x.n]));
};

console.log("\n  SPIKE C — settlement cliff / resume / void hole\n");

/* ══ Q1 — THE CLIFF + the round-trip census ═══════════════════════════════ */
console.log("  ── Q1: the cliff (and the RTT-independent round-trip census) ────");
console.log("   winners   elapsed     result      queries   queries/winner   ms/winner");
console.log("  ──────────────────────────────────────────────────────────────────────");

let rtPerWinner = 0;
for (const W of [100, 250, 500, 1000, 2000]) {
  const mid = await seedMarket(`c${W}`, W, Math.ceil(W / 2));
  queryCount = 0; counting = true;
  const t0 = Date.now();
  let verdict: string;
  try {
    const r: any = await settleMarket(mid, { force: true } as never);
    verdict = r.ok ? "settled" : `FAIL ${r.code}`;
  } catch (e: any) {
    verdict = `THROW ${e?.code ?? "?"}`;
  }
  const ms = Date.now() - t0;
  counting = false;
  const qpw = queryCount / W;
  if (W === 1000) rtPerWinner = qpw;
  console.log(
    `   ${String(W).padStart(7)}   ${String(ms + "ms").padStart(7)}   ${verdict.padEnd(12)} ${String(queryCount).padStart(7)}   ${qpw.toFixed(1).padStart(14)}   ${(ms / W).toFixed(2).padStart(9)}`,
  );
}

console.log("\n  ── the cliff projected onto a REAL network ─────────────────────");
console.log(`     measured: ${rtPerWinner.toFixed(1)} DB round-trips per winner, all sequential, inside a 30s transaction`);
for (const rtt of [0.2, 1, 2, 5]) {
  const maxW = Math.floor(30000 / (rtPerWinner * rtt));
  const label = rtt === 0.2 ? "local loopback" : rtt === 1 ? "same-host Railway" : rtt === 2 ? "same-region Railway" : "cross-AZ";
  console.log(`     RTT ${String(rtt).padStart(4)}ms (${label.padEnd(20)}) -> settlement dies above ~${maxW.toLocaleString()} winners`);
}

/* ══ Q2 — THE RESUME: does a retry double-pay? ════════════════════════════ */
console.log("\n  ── Q2: the resume — after a failure, does a retry double-pay? ──");
{
  const W = 300, L = 150;
  const mid = await seedMarket("resume", W, L);

  // First settle: let it complete, then FORCE a second settle attempt.
  const r1: any = await settleMarket(mid, { force: true } as never);
  const paid1 = await sumPaid(mid);
  const st1 = await posStatus(mid);

  const r2: any = await settleMarket(mid, { force: true } as never);
  const paid2 = await sumPaid(mid);
  const st2 = await posStatus(mid);

  console.log(`     attempt 1 : ok=${r1.ok}  paid=${paid1}  positions=${JSON.stringify(st1)}`);
  console.log(`     attempt 2 : ok=${r2.ok} ${r2.ok ? "" : `(${r2.code}: ${r2.error})`}`);
  console.log(`     paid after retry = ${paid2}`);
  console.log(`     ${paid2 === paid1 ? "PASS — no double payout" : `FAIL — DOUBLE PAID ${paid2 - paid1} TZS`}`);
  void st2;

  // Exactly-once law: no positionId may carry two BET_PAYOUT txns.
  const dupes: any = await client.$queryRawUnsafe(
    `SELECT count(*)::int AS n FROM (
       SELECT "positionId" FROM "Transaction"
        WHERE type='BET_PAYOUT' AND "positionId" IS NOT NULL
        GROUP BY "positionId" HAVING count(*) > 1) x`);
  console.log(`     exactly-once payout (law 4): ${dupes[0].n === 0 ? "PASS" : `FAIL — ${dupes[0].n} positions paid twice`}`);
}

/* ══ Q3 — THE VOID HOLE: void a market whose winners were already paid ════ */
console.log("\n  ── Q3: emergencyVoid a PARTIALLY-SETTLED market (settledAt still null) ──");
{
  const W = 200, L = 100;
  const mid = await seedMarket("void", W, L);

  // Simulate the exact state a P2028 mid-settle leaves behind: SOME winners paid
  // and committed (autocommit, locks.ts:58-60), market NOT marked settled.
  // We reproduce it by settling, then clearing settledAt — which is precisely the
  // on-disk state after a timeout, because the final marketStore.set never ran.
  await settleMarket(mid, { force: true } as never);
  await client.$executeRawUnsafe(
    `UPDATE "PredictionMarket" SET "settledAt" = NULL, status = 'RESOLVED' WHERE id = '${mid}'`);
  // Leave half the losers OPEN, as a timed-out loop would.
  await client.$executeRawUnsafe(
    `UPDATE "Position" SET status='OPEN', "settledAt"=NULL, "finalPayout"=NULL
      WHERE "marketId"='${mid}' AND status='LOSS' AND id IN (
        SELECT id FROM "Position" WHERE "marketId"='${mid}' AND status='LOSS' LIMIT ${Math.floor(L / 2)})`);

  const grossPool = (W + L) * STAKE;
  const before = await sumWalletCredit(mid);
  const stBefore = await posStatus(mid);
  console.log(`     state: ${JSON.stringify(stBefore)}  settledAt=null  grossPool=${grossPool}`);

  // ── Q3a: THE TRUE RESUME. This is the state a P2028 leaves. Retry the settle.
  //         Do the 200 already-paid WIN positions get paid a SECOND time?
  const paidBeforeResume = await sumPaid(mid);
  const rr: any = await settleMarket(mid, { force: true } as never);
  const paidAfterResume = await sumPaid(mid);
  console.log(`\n     [resume] retry after timeout: ok=${rr.ok} ${rr.ok ? JSON.stringify(rr.data) : `(${rr.code})`}`);
  console.log(`     [resume] paid ${paidBeforeResume} -> ${paidAfterResume}  (delta ${paidAfterResume - paidBeforeResume})`);
  const dup2: any = await client.$queryRawUnsafe(
    `SELECT count(*)::int AS n FROM (
       SELECT t."positionId" FROM "Transaction" t JOIN "Position" p ON p.id = t."positionId"
        WHERE t.type='BET_PAYOUT' AND p."marketId"='${mid}'
        GROUP BY t."positionId" HAVING count(*) > 1) x`);
  console.log(`     [resume] positions paid twice: ${dup2[0].n}  ${dup2[0].n === 0 ? "PASS" : "FAIL — DOUBLE PAYOUT"}`);

  void before; void grossPool;
}

/* ══ Q3b — THE VOID HOLE, on its own FRESH market ═════════════════════════ */
/* NOTE: the conservation check here deliberately does NOT look at wallet float.
 * These positions are seeded by raw SQL, so the stakes were never actually
 * debited from the wallets — comparing wallet balances would produce a bogus
 * "mint". The honest, seeding-independent invariant is:
 *
 *     money OUT of the pool  =  Σ(BET_PAYOUT) + Σ(void refunds)   must be <= grossPool
 */
console.log("\n  ── Q3b: emergencyVoid a market whose winners were ALREADY paid ──");
{
  const W = 200, L = 100;
  const mid = await seedMarket("voidhole", W, L);
  const grossPool = (W + L) * STAKE;

  // Settle fully, then reproduce EXACTLY the on-disk state a P2028 mid-loop leaves:
  //   - the winners it reached are PAID and COMMITTED (autocommit, locks.ts:58-60)
  //   - the positions it never reached are still OPEN
  //   - settledAt is NULL, because the final marketStore.set never ran
  await settleMarket(mid, { force: true } as never);
  await client.$executeRawUnsafe(
    `UPDATE "PredictionMarket" SET "settledAt" = NULL, status = 'RESOLVED' WHERE id = '${mid}'`);
  await client.$executeRawUnsafe(
    `UPDATE "Position" SET status='OPEN', "settledAt"=NULL, "finalPayout"=NULL
      WHERE id IN (SELECT id FROM "Position" WHERE "marketId"='${mid}' AND status='LOSS' LIMIT ${L})`);

  const paidOut = await sumPaid(mid);
  console.log(`     state: ${JSON.stringify(await posStatus(mid))}  settledAt=NULL`);
  console.log(`     grossPool=${grossPool}  already paid to winners=${paidOut}`);

  await client.$executeRawUnsafe(`
    INSERT INTO "User" (id, "phoneE164", "failedLoginCount", role, status, locale,
                        "marketingOptIn", "twoFactorEnabled", "createdAt", "updatedAt")
    VALUES ('ld_admin', '+255999999999', 0, 'ADMIN', 'ACTIVE', 'EN', false, false, now(), now())
    ON CONFLICT (id) DO NOTHING`);

  // The uphold escape-hatch. settledAt is null, so the :1951 guard lets this through.
  const v: any = await emergencyVoidMarket({ marketId: mid, officerId: "ld_admin", reason: "upheld objection" });
  console.log(`     void: ok=${v.ok} ${v.ok ? JSON.stringify(v.data) : `(${v.code}: ${v.error})`}`);
  console.log(`     positions after: ${JSON.stringify(await posStatus(mid))}`);

  const refunded = v.ok ? (v.data.refundedTzs as number) : 0;
  const distributed = paidOut + refunded;
  console.log(`\n     paid to winners        : ${paidOut}`);
  console.log(`     refunded by the void   : ${refunded}`);
  console.log(`     total OUT of the pool  : ${distributed}`);
  console.log(`     grossPool              : ${grossPool}`);
  console.log(`     DRIFT                  : ${distributed - grossPool}`);
  if (distributed > grossPool) {
    console.log(`\n     MONEY MINTED — ${distributed - grossPool} TZS. The void refunded stakes out of a`);
    console.log(`     pool that had ALREADY paid its winners. Both came from the same money.`);
  } else {
    console.log(`\n     no mint — total distribution stayed within the pool.`);
  }
}

console.log();
await client.$disconnect();
