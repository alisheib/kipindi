/* eslint-disable no-console */
/**
 * SPIKE F — THE SCALE GATE. "A bet must NEVER fail for capacity."
 *
 * Sweeps concurrency 1 → 200 against ONE market on a realistically-sized pool and
 * asserts, at EVERY level:
 *   1. ZERO raw database errors reach the caller (no P2024/P2028/THROW). Under
 *      load a player may be told "we're busy" — never "Timed out fetching a new
 *      connection from the pool".
 *   2. ZERO TZS leaked — every non-successful bet left walletΔ = 0, and no
 *      BET_PLACED transaction exists without its Position (the orphan-debit
 *      detector reused from spike-a-pool-deadlock.mts).
 *   3. pool == Σ stakes — the market's yesPool+noPool equals the sum of accepted
 *      stakes exactly, so no concurrent write erased another's increment.
 *   4. Every bet ended SUCCEEDED or BUSY. Any other failure code is a defect.
 *   5. p95 latency stayed within the wait budget.
 *
 * Contrast with the pre-admission baseline (docs/LOAD_DAY1_FINDINGS.md Finding A):
 * at pool 5, concurrency 20 produced 20 failures and 0 positions — raw P2024 in
 * the player's face, 100% failure. This harness is what proves that is gone.
 *
 * Usage:
 *   node scripts/load/reset-db.mjs
 *   npx tsx scripts/load/spike-f-saturation.mts [--pool=20] [--levels=1,5,10,25,50,100,200]
 */
import { PrismaClient } from "@prisma/client";

const arg = (k: string, d: number): number => {
  const hit = process.argv.find((a) => a.startsWith(`--${k}=`));
  return hit ? Number(hit.split("=")[1]) : d;
};
const argStr = (k: string, d: string): string => {
  const hit = process.argv.find((a) => a.startsWith(`--${k}=`));
  return hit ? hit.split("=")[1] : d;
};

const POOL = arg("pool", 20);
const LEVELS = argStr("levels", "1,5,10,25,50,100,200").split(",").map(Number).filter((n) => n > 0);
const STAKE = 1000;
const FUND = 5_000_000;
const MAX_C = Math.max(...LEVELS);

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

const url = new URL(BASE);
url.searchParams.set("connection_limit", String(POOL));
url.searchParams.set("pool_timeout", "10");
const client = new PrismaClient({ datasources: { db: { url: url.toString() } } });
(globalThis as any).__50PICK_PRISMA = client;
// Admission sizes itself from this, exactly as production does.
process.env.PRISMA_CONNECTION_LIMIT = String(POOL);

/* ── Dynamic imports — AFTER the hook is installed ─────────────────────────── */
const { prisma, hasDatabase } = await import("../../src/lib/server/prisma.ts");
const { db } = await import("../../src/lib/server/store.ts");
const { createMarket, buyPosition } = await import("../../src/lib/server/market-service.ts");
const { admissionSnapshot, getAdmissionLimits, setAdmissionLimits } = await import("../../src/lib/server/admission.ts");

if (!hasDatabase()) { console.error("ABORT — hasDatabase() is false; services would use the in-memory Map."); process.exit(1); }
if (prisma() !== client) { console.error("ABORT — services resolved a DIFFERENT PrismaClient. The hook did not take."); process.exit(1); }

setAdmissionLimits({}); // re-derive from the pool we just set
const LIMITS = getAdmissionLimits();

console.log(`\n  SPIKE F — saturation / scale gate`);
console.log(`  pool=${POOL}  maxInFlight=${LIMITS.maxInFlight}  maxQueue=${LIMITS.maxQueue}  maxWaitMs=${LIMITS.maxWaitMs}`);
console.log(`  levels: ${LEVELS.join(", ")}\n`);

/* ── Seed ──────────────────────────────────────────────────────────────────── */
const now = () => new Date().toISOString();
const runId = Math.random().toString(36).slice(2, 8);
const uid = (i: number) => `f_${runId}_u${i}`;

await client.$executeRawUnsafe(`
  INSERT INTO "User" (id,"phoneE164","failedLoginCount",role,status,locale,"marketingOptIn","twoFactorEnabled","createdAt","updatedAt")
  SELECT 'f_${runId}_u'||g, '+2559'||lpad((6100000+g)::text,8,'0'), 0,'PLAYER','ACTIVE','EN',false,false,now(),now()
  FROM generate_series(0,${MAX_C - 1}) g`);
await client.$executeRawUnsafe(`
  INSERT INTO "Wallet" (id,"userId",balance,pending,hold,"bonusBalance",currency,status,"createdAt","updatedAt")
  SELECT 'f_${runId}_w'||g, 'f_${runId}_u'||g, ${FUND},0,0,0,'TZS','ACTIVE',now(),now()
  FROM generate_series(0,${MAX_C - 1}) g`);
console.log(`  seeded ${MAX_C} funded users\n`);

/* ── Sweep ─────────────────────────────────────────────────────────────────── */
type Level = {
  c: number; ok: number; busy: number; other: number; raw: number;
  p50: number; p95: number; elapsed: number; drift: number; orphans: number; leakedTzs: number;
};
const results: Level[] = [];
let hardFail = false;

for (const CONC of LEVELS) {
  const market = await createMarket({
    titleEn: `F saturation c=${CONC}`, titleSw: "Soko la majaribio", category: "macro",
    sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves at the official date.",
    resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "load",
  } as never);

  const before = new Map<string, number>();
  for (let i = 0; i < CONC; i++) before.set(uid(i), (await db.wallet.findByUserId(uid(i)))!.balance);

  const t0 = Date.now();
  const rows = await Promise.all(
    Array.from({ length: CONC }, async (_, i) => {
      const s = Date.now();
      try {
        const r: any = await buyPosition(uid(i), {
          marketId: market.id, side: i % 2 ? "YES" : "NO", stake: STAKE,
          idempotencyKey: `f_${runId}_${CONC}_${i}`,
        });
        return { user: uid(i), ok: !!r.ok, code: r.ok ? "OK" : (r.code ?? "?"), ms: Date.now() - s, raw: false };
      } catch (e: any) {
        // ANY throw reaching here is a raw DB error in the player's face.
        return { user: uid(i), ok: false, code: e?.code ?? "THROW", ms: Date.now() - s, raw: true };
      }
    }),
  );
  const elapsed = Date.now() - t0;

  const okRows = rows.filter((r) => r.ok);
  const busy = rows.filter((r) => !r.ok && r.code === "BUSY").length;
  const raw = rows.filter((r) => r.raw).length;
  const other = rows.filter((r) => !r.ok && !r.raw && r.code !== "BUSY").length;

  // Money safety: no failed bet may have moved a shilling.
  let leakedTzs = 0;
  for (const r of rows) {
    if (r.ok) continue;
    const after = (await db.wallet.findByUserId(r.user))!.balance;
    leakedTzs += before.get(r.user)! - after;
  }

  // Conservation: pool must equal Σ accepted stakes exactly.
  const mk: any = await client.$queryRawUnsafe(
    `SELECT "yesPool"::int y, "noPool"::int n FROM "PredictionMarket" WHERE id='${market.id}'`);
  const pos: any = await client.$queryRawUnsafe(
    `SELECT COALESCE(SUM(stake),0)::int s FROM "Position" WHERE "marketId"='${market.id}'`);
  const pool = mk[0].y + mk[0].n;
  const drift = pool - pos[0].s;

  // Orphan-debit detector (reused from spike-a-pool-deadlock.mts:169-174).
  const orph: any = await client.$queryRawUnsafe(
    `SELECT count(*)::int AS n FROM "Transaction" t
      WHERE t.type = 'BET_PLACED' AND t."userId" LIKE 'f_${runId}_%'
        AND NOT EXISTS (SELECT 1 FROM "Position" p WHERE p.id = t."positionId")`).catch(() => [{ n: -1 }]);

  const sorted = rows.map((r) => r.ms).sort((a, b) => a - b);
  const pct = (p: number) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)] : 0;

  const lvl: Level = {
    c: CONC, ok: okRows.length, busy, other, raw,
    p50: pct(50), p95: pct(95), elapsed, drift, orphans: orph[0].n, leakedTzs,
  };
  results.push(lvl);

  const bad = raw > 0 || other > 0 || drift !== 0 || orph[0].n !== 0 || leakedTzs !== 0;
  if (bad) hardFail = true;
  console.log(
    `  c=${String(CONC).padStart(3)}  ok=${String(lvl.ok).padStart(3)} busy=${String(busy).padStart(3)} ` +
    `raw=${String(raw).padStart(2)} other=${String(other).padStart(2)}  ` +
    `p50=${String(lvl.p50).padStart(5)}ms p95=${String(lvl.p95).padStart(6)}ms  ` +
    `drift=${drift} orphans=${orph[0].n} leaked=${leakedTzs}  ${bad ? "  <-- FAIL" : ""}`,
  );
}

/* ── Verdict ───────────────────────────────────────────────────────────────── */
console.log("\n  ── VERDICT ──────────────────────────────────────────────────────");
const totalRaw = results.reduce((s, r) => s + r.raw, 0);
const totalOther = results.reduce((s, r) => s + r.other, 0);
const totalLeak = results.reduce((s, r) => s + r.leakedTzs, 0);
const totalDrift = results.reduce((s, r) => s + Math.abs(r.drift), 0);
const totalOrph = results.reduce((s, r) => s + r.orphans, 0);
const worstP95 = Math.max(...results.map((r) => r.p95));
const budget = LIMITS.maxWaitMs + 15_000; // wait budget + generous execution allowance

console.log(`     raw DB errors reaching the player : ${totalRaw}   (must be 0)`);
console.log(`     non-BUSY unexpected failures      : ${totalOther}   (must be 0)`);
console.log(`     TZS leaked                        : ${totalLeak}   (must be 0)`);
console.log(`     pool-vs-Σstakes drift             : ${totalDrift}   (must be 0)`);
console.log(`     orphan BET_PLACED txns            : ${totalOrph}   (must be 0)`);
console.log(`     worst p95                         : ${worstP95}ms  (budget ${budget}ms)`);
const snap = admissionSnapshot();
console.log(`     admission: admitted=${snap.admitted} shed=${snap.shed} timedOut=${snap.timedOut}`);

const passed = !hardFail && totalRaw === 0 && totalOther === 0 && totalLeak === 0 && totalDrift === 0 && totalOrph === 0 && worstP95 <= budget;
console.log("\n  ═════════════════════════════════════════════════════════════════");
if (passed) {
  console.log("   PASS — no bet failed for capacity, no money moved on a failure,");
  console.log("   and pool == Σ stakes at every concurrency level tested.");
} else {
  console.log("   FAIL — see the flagged rows above.");
}
console.log("  ═════════════════════════════════════════════════════════════════\n");

await client.$disconnect();
process.exit(passed ? 0 : 1);
