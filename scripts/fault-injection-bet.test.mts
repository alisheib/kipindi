/**
 * FAULT-INJECTION PROBE — bet-stake single-transaction rollback proof (PG-only).
 *
 *   Run:  DATABASE_URL=postgresql://postgres:pw@localhost:5433/kipindi_load?schema=public \
 *         USE_PRISMA_DAL=true npx tsx scripts/fault-injection-bet.test.mts
 *   (reset first: node scripts/load/reset-db.mjs — see scripts/load/README.md)
 *
 * Proves the property the bet-stake single-tx work exists for: if ANY write of a
 * bet fails mid-flight, EVERY other write of that bet rolls back — the wallet
 * debit, the bonus spend (grant decrements + bonusBalance), the pool increment,
 * the Position row, the BET_PLACED transaction and the ledger entries. Row-level
 * evidence, not inference.
 *
 * The fault is injected at the DATABASE level — a BEFORE INSERT trigger that
 * RAISEs — so the failing statement is the real INSERT the production path runs,
 * not a JS mock. Two poison points:
 *   Phase 1: poison "LedgerEntry"  (the LAST write in the tx — everything before
 *            it must roll back; this is the exact write that was fire-and-forget
 *            before this branch and is now atomic)
 *   Phase 2: poison "Transaction"  (a MIDDLE write — wallet/bonus/pool/position
 *            around it must roll back)
 *   Phase 3: heal → same bet → assert everything lands EXACTLY ONCE.
 *
 * Deliberately NOT in test:all (needs a real Postgres, like e2e:money).
 */
/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";

const BASE = process.env.DATABASE_URL;
if (!BASE) {
  console.error("fault-injection: DATABASE_URL is required — this probe runs against the DISPOSABLE local Postgres.");
  process.exit(1);
}

const client = new PrismaClient({ datasources: { db: { url: BASE } } });

// Safety gate (same as the load harness): refuse any DB that is not certified disposable.
{
  const r: unknown[] = await client.$queryRawUnsafe(
    `SELECT value FROM "SystemConfig" WHERE key = '__LOAD_TEST_TARGET__'`).catch(() => [] as unknown[]);
  if ((r[0] as { value?: string } | undefined)?.value !== "I_AM_A_DISPOSABLE_LOAD_TEST_DB") {
    console.error("\n  ABORT — target DB is not a certified disposable load-test DB.\n");
    process.exit(2);
  }
}

// Import the real services AFTER the gate (they read DATABASE_URL at module load).
const { buyPosition } = await import("../src/lib/server/market-service.ts");

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ FAIL  ${label}${extra ? ` — ${extra}` : ""}`); }
}

const rid = Math.random().toString(36).slice(2, 8);
const USER = `fi_${rid}_u`;
const WALLET = `fi_${rid}_w`;
const GRANT = `fi_${rid}_g`;
const MARKET = `fi_${rid}_m`;

// Funding: 3,000 real + 2,000 bonus. Stake 4,000 → realPart 3,000 + bonusPart 1,000.
const REAL = 3000, BONUS = 2000, STAKE = 4000;

await client.$executeRawUnsafe(`
  INSERT INTO "User" (id, "phoneE164", "failedLoginCount", role, status, locale,
                      "marketingOptIn", "twoFactorEnabled", "createdAt", "updatedAt")
  VALUES ('${USER}', '+255700${String(Date.now()).slice(-6)}', 0, 'PLAYER', 'ACTIVE', 'EN', false, false, now(), now())`);
await client.$executeRawUnsafe(`
  INSERT INTO "Wallet" (id, "userId", balance, "bonusBalance", pending, hold, currency,
                        status, "createdAt", "updatedAt")
  VALUES ('${WALLET}', '${USER}', ${REAL}, ${BONUS}, 0, 0, 'TZS', 'ACTIVE', now(), now())`);
// One ACTIVE grant holding the whole bonus (invariant: bonusBalance == Σ remainingTzs).
await client.$executeRawUnsafe(`
  INSERT INTO "BonusGrant" (id, "userId", "walletId", "amountTzs", "remainingTzs",
      "wagerMultiplier", "wagerRequiredTzs", "wageredTzs", source, status, "createdAt", "updatedAt")
  VALUES ('${GRANT}', '${USER}', '${WALLET}', ${BONUS}, ${BONUS}, 5, ${BONUS * 5}, 0, 'ADMIN', 'ACTIVE', now(), now())`);
await client.$executeRawUnsafe(`
  INSERT INTO "PredictionMarket" (id, "titleEn", "titleSw", category, "sourceUrl",
      "resolutionCriterion", "resolutionAt", status, "yesPool", "noPool", "predictorCount",
      "proposedBy", "createdAt", "updatedAt")
  VALUES ('${MARKET}', 'Fault-injection market', 'Soko', 'macro', 'https://bot.go.tz',
      'Resolves at the official date.', now() + interval '7 days', 'LIVE', 0, 0, 0,
      'load', now(), now())`);

// ── Poison machinery: a BEFORE INSERT trigger that always raises ─────────────
await client.$executeRawUnsafe(`
  CREATE OR REPLACE FUNCTION fi_poison_${rid}() RETURNS trigger AS $$
  BEGIN RAISE EXCEPTION 'fault-injection: poisoned insert'; END;
  $$ LANGUAGE plpgsql`);
async function poison(table: string) {
  await client.$executeRawUnsafe(
    `CREATE TRIGGER fi_poison_trg_${rid} BEFORE INSERT ON "${table}" FOR EACH ROW EXECUTE FUNCTION fi_poison_${rid}()`);
}
async function heal(table: string) {
  await client.$executeRawUnsafe(`DROP TRIGGER IF EXISTS fi_poison_trg_${rid} ON "${table}"`);
}

// ── Row-level snapshot of every table the bet touches ────────────────────────
type Snap = {
  balance: number; bonusBalance: number;
  grantRemaining: number; grantWagered: number; grantStatus: string;
  yesPool: number; noPool: number; predictorCount: number;
  positions: number; betTxns: number; ledgerRows: number;
};
async function snap(): Promise<Snap> {
  const w = (await client.$queryRawUnsafe(
    `SELECT balance::int b, "bonusBalance"::int bb FROM "Wallet" WHERE id='${WALLET}'`) as { b: number; bb: number }[])[0];
  const g = (await client.$queryRawUnsafe(
    `SELECT "remainingTzs"::int r, "wageredTzs"::int wg, status s FROM "BonusGrant" WHERE id='${GRANT}'`) as { r: number; wg: number; s: string }[])[0];
  const m = (await client.$queryRawUnsafe(
    `SELECT "yesPool"::int y, "noPool"::int n, "predictorCount"::int pc FROM "PredictionMarket" WHERE id='${MARKET}'`) as { y: number; n: number; pc: number }[])[0];
  const p = (await client.$queryRawUnsafe(
    `SELECT COUNT(*)::int c FROM "Position" WHERE "marketId"='${MARKET}'`) as { c: number }[])[0];
  const t = (await client.$queryRawUnsafe(
    `SELECT COUNT(*)::int c FROM "Transaction" WHERE "userId"='${USER}' AND type='BET_PLACED'`) as { c: number }[])[0];
  const l = (await client.$queryRawUnsafe(
    `SELECT COUNT(*)::int c FROM "LedgerEntry" WHERE "userId"='${USER}' OR "marketId"='${MARKET}'`) as { c: number }[])[0];
  return {
    balance: w.b, bonusBalance: w.bb,
    grantRemaining: g.r, grantWagered: g.wg, grantStatus: g.s,
    yesPool: m.y, noPool: m.n, predictorCount: m.pc,
    positions: p.c, betTxns: t.c, ledgerRows: l.c,
  };
}
function assertUnchanged(phase: string, before: Snap, after: Snap) {
  ok(`${phase}: wallet.balance unchanged (${before.balance})`, after.balance === before.balance, `now ${after.balance}`);
  ok(`${phase}: wallet.bonusBalance unchanged (${before.bonusBalance})`, after.bonusBalance === before.bonusBalance, `now ${after.bonusBalance}`);
  ok(`${phase}: grant.remainingTzs unchanged (${before.grantRemaining})`, after.grantRemaining === before.grantRemaining, `now ${after.grantRemaining}`);
  ok(`${phase}: grant.wageredTzs unchanged (${before.grantWagered})`, after.grantWagered === before.grantWagered, `now ${after.grantWagered}`);
  ok(`${phase}: pools unchanged (${before.yesPool}/${before.noPool})`, after.yesPool === before.yesPool && after.noPool === before.noPool, `now ${after.yesPool}/${after.noPool}`);
  ok(`${phase}: predictorCount unchanged (${before.predictorCount})`, after.predictorCount === before.predictorCount, `now ${after.predictorCount}`);
  ok(`${phase}: no Position row`, after.positions === before.positions, `now ${after.positions}`);
  ok(`${phase}: no BET_PLACED Transaction row`, after.betTxns === before.betTxns, `now ${after.betTxns}`);
  ok(`${phase}: no LedgerEntry rows`, after.ledgerRows === before.ledgerRows, `now ${after.ledgerRows}`);
}

const bet = () => buyPosition(USER, { marketId: MARKET, side: "YES" as const, stake: STAKE });

console.log(`\n  FAULT-INJECTION — bet-stake single-tx rollback proof (user ${USER})\n`);
const baseline = await snap();
ok("setup: wallet 3,000 real + 2,000 bonus", baseline.balance === REAL && baseline.bonusBalance === BONUS);
ok("setup: grant ACTIVE with 2,000 remaining", baseline.grantStatus === "ACTIVE" && baseline.grantRemaining === BONUS);

// ── Phase 1: poison the LAST write in the tx (LedgerEntry) ────────────────────
console.log(`\n  Phase 1 — poison "LedgerEntry" (the final write; was fire-and-forget before this branch)`);
await poison("LedgerEntry");
let threw = false;
try { await bet(); } catch { threw = true; }
await heal("LedgerEntry");
ok("P1: buyPosition threw (bet rejected, not half-committed)", threw);
assertUnchanged("P1", baseline, await snap());

// ── Phase 2: poison a MIDDLE write (Transaction) ──────────────────────────────
console.log(`\n  Phase 2 — poison "Transaction" (a middle write; wallet/bonus/pool/position around it must roll back)`);
await poison("Transaction");
threw = false;
try { await bet(); } catch { threw = true; }
await heal("Transaction");
ok("P2: buyPosition threw", threw);
assertUnchanged("P2", baseline, await snap());

// ── Phase 3: heal → the same bet lands EXACTLY ONCE ───────────────────────────
console.log(`\n  Phase 3 — poison removed: the same bet must land exactly once`);
const r = await bet();
ok("P3: bet accepted", r.ok, r.ok ? "" : (r as { error?: string }).error);
const after = await snap();
ok(`P3: wallet.balance ${REAL} → 0 (real part fully staked)`, after.balance === 0, `now ${after.balance}`);
ok(`P3: bonusBalance ${BONUS} → ${BONUS - (STAKE - REAL)} (bonus part spent)`, after.bonusBalance === BONUS - (STAKE - REAL), `now ${after.bonusBalance}`);
ok(`P3: grant.remainingTzs → ${BONUS - (STAKE - REAL)}`, after.grantRemaining === BONUS - (STAKE - REAL), `now ${after.grantRemaining}`);
ok(`P3: grant.wageredTzs → ${STAKE} (turnover on full stake)`, after.grantWagered === STAKE, `now ${after.grantWagered}`);
ok(`P3: yesPool → ${STAKE}, exactly once`, after.yesPool === STAKE && after.noPool === 0, `now ${after.yesPool}/${after.noPool}`);
ok("P3: predictorCount → 1", after.predictorCount === 1, `now ${after.predictorCount}`);
ok("P3: exactly 1 Position row", after.positions === 1, `now ${after.positions}`);
ok("P3: exactly 1 BET_PLACED Transaction row", after.betTxns === 1, `now ${after.betTxns}`);
// stakeEntries writes 4 rows for a mixed real+bonus stake:
// PLAYER→POOL (real) + PLAYER_BONUS→POOL (bonus) — 2 balanced pairs.
ok("P3: exactly 4 stake LedgerEntry rows (2 balanced pairs)", after.ledgerRows === 4, `now ${after.ledgerRows}`);
const lsum = (await client.$queryRawUnsafe(
  `SELECT COALESCE(SUM(amount),0)::int s FROM "LedgerEntry" WHERE "userId"='${USER}' OR "marketId"='${MARKET}'`) as { s: number }[])[0];
ok("P3: ledger group sums to 0 (balanced)", lsum.s === 0, `sum=${lsum.s}`);
// Conservation across the whole probe: real+bonus in wallets+grant+pool is constant.
ok("P3: conservation — balance+bonus+pool == funding", after.balance + after.bonusBalance + after.yesPool + after.noPool === REAL + BONUS, `=${after.balance + after.bonusBalance + after.yesPool + after.noPool}`);

// Cleanup the poison function (triggers already dropped).
await client.$executeRawUnsafe(`DROP FUNCTION IF EXISTS fi_poison_${rid}()`);
await client.$disconnect();

console.log(`\nfault-injection: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
