/** U43: a placed bet's projection uses the pool read under the market lock.
 * Run in memory, and through db:scratch --run for a disposable PostgreSQL proof.
 * No live account, provider or production database is used. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
process.env.MARKET_SCHEDULER = "false";
process.env.HOUSE_BOT_ENGINE = "false";

const scratch = process.env.VERIFY_DATABASE_URL ?? "";
const database = scratch ? `ud_commit_quote_${process.pid}` : "";
let admin: pg.Client | null = null;
if (scratch) {
  if (process.env.NODE_ENV === "production") throw new Error("quote fixture refuses production mode");
  const adminUrl = new URL(scratch);
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(adminUrl.hostname)
    || adminUrl.pathname !== "/postgres") throw new Error("quote fixture requires the local scratch admin database");
  admin = new pg.Client({ connectionString: scratch });
  await admin.connect();
  const directory = (await admin.query<{ setting: string }>(
    "select setting from pg_settings where name = 'data_directory'",
  )).rows[0]?.setting ?? "";
  const normal = (path: string) => resolve(path).replace(/\\/g, "/").toLowerCase();
  if (normal(directory) !== normal(resolve(process.cwd(), ".pgscratch"))) {
    await admin.end();
    throw new Error("quote fixture refuses a database outside this checkout's scratch cluster");
  }
  const target = new URL(scratch);
  target.pathname = `/${database}`;
  target.search = "";
  try {
    await admin.query(`CREATE DATABASE "${database}"`);
    process.env.DATABASE_URL = target.toString();
    process.env.USE_PRISMA_DAL = "true";
    execFileSync("npx", ["prisma", "migrate", "deploy"], {
      env: process.env, stdio: "pipe", shell: process.platform === "win32",
    });
  } catch {
    try { await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`); }
    finally { await admin.end(); }
    admin = null;
    throw new Error("quote fixture could not migrate its disposable database");
  }
} else {
  // A machine may have production variables in its environment. The default
  // run is intentionally in memory even then.
  process.env.DATABASE_URL = "";
  process.env.USE_PRISMA_DAL = "false";
}

try {
  const { db } = await import("../src/lib/server/store.ts");
  const { marketStore, positionStore } = await import("../src/lib/server/market-dal.ts");
  const { createMarket, buyPosition, projectedPayout } = await import("../src/lib/server/market-service.ts");
  const source = readFileSync(new URL("../src/lib/server/market-service.ts", import.meta.url), "utf8");
  const freshRead = source.indexOf("const fresh = await marketStore.get(opts.marketId, lockTx);");
  const quote = source.indexOf("const payoutIfWinAtCommit = await projectedPayout(fresh, opts.side, opts.stake);");
  const moneyWrite = source.indexOf("const writeMoney = async (counterparties:", freshRead);
  const sourceGuard = freshRead >= 0 && quote > freshRead && moneyWrite > quote
    && source.includes("potentialPayout: payoutIfWinAtCommit,")
    && source.includes("payoutIfWin: payoutIfWinAtCommit, bonusPart")
    && !source.includes("projectedPayout(market, opts.side, opts.stake)");
  console.log(`${sourceGuard ? "PASS" : "FAIL"} locked-pool projection wiring`);

  const tag = `udquote_${process.pid}`;
  const now = new Date().toISOString();
  for (const [suffix, phone] of [["a", "1"], ["b", "2"]] as const) {
    const id = `${tag}_${suffix}`;
    await db.user.create({
      id, phoneE164: `+2557${String(process.pid % 1_000_000).padStart(6, "0")}${phone}0`,
      passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
      role: "PLAYER", status: "ACTIVE", locale: "EN", displayName: null,
      dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
      marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
      email: null, createdAt: now, updatedAt: now, lastLoginAt: null, closedAt: null,
    } as never);
    await db.wallet.create({ id: `wal_${id}`, userId: id, balance: 20_000,
      pending: 0, hold: 0, bonusBalance: 0, currency: "TZS", status: "ACTIVE",
      createdAt: now, updatedAt: now } as never);
  }
  const aId = `${tag}_a`, bId = `${tag}_b`;
  const market = await createMarket({
    titleEn: "Disposable quote race", titleSw: "Jaribio la bei", category: "macro",
    sourceUrl: "https://bot.go.tz", resolutionCriterion: "Disposable test fixture.",
    resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "test",
  } as never);
  assert.equal(market.yesPool, 0);
  assert.equal(market.noPool, 0);

  // B captures the pre-A market read and waits. Return a copy to model the
  // PostgreSQL snapshot even in memory, whose map otherwise aliases this row.
  const realGet = marketStore.get;
  let seen!: () => void, release!: () => void;
  const captured = new Promise<void>((done) => { seen = done; });
  const resume = new Promise<void>((done) => { release = done; });
  let first = true;
  marketStore.get = async (id, tx) => {
    const row = await realGet(id, tx);
    if (id === market.id && first && !tx) {
      first = false;
      const snapshot = row ? { ...row } : null;
      seen();
      await resume;
      return snapshot;
    }
    return row;
  };

  let b: Awaited<ReturnType<typeof buyPosition>>;
  let expected = 0;
  let oldQuote = 0;
  try {
    const pendingB = buyPosition(bId, { marketId: market.id, side: "NO", stake: 2_000,
      idempotencyKey: `${tag}_bet_b` });
    await Promise.race([captured, new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("B did not reach the pre-lock read")), 15_000))]);
    const a = await buyPosition(aId, { marketId: market.id, side: "YES", stake: 5_000,
      idempotencyKey: `${tag}_bet_a` });
    assert.equal(a.ok, true, "competing A bet must land first");
    const afterA = await realGet(market.id);
    assert.ok(afterA);
    assert.equal(afterA.yesPool, 5_000);
    assert.equal(afterA.noPool, 0);
    expected = await projectedPayout(afterA, "NO", 2_000);
    oldQuote = await projectedPayout({ ...afterA, yesPool: 0, noPool: 0 }, "NO", 2_000);
    assert.notEqual(expected, oldQuote, "fixture must distinguish fresh and stale pool quotes");
    release();
    b = await pendingB;
  } finally {
    release();
    marketStore.get = realGet;
  }
  assert.equal(b.ok, true, "B bet must land after A");
  if (!b.ok || !b.data) throw new Error("B has no committed receipt");
  const placed = await positionStore.get(b.data.positionId);
  const current = await realGet(market.id);
  assert.ok(current && placed);
  assert.equal(current.yesPool, 5_000);
  assert.equal(current.noPool, 2_000);
  const racePassed = b.data.payoutIfWin === expected && placed.potentialPayout === expected
    && b.data.payoutIfWin !== oldQuote;
  console.log(`${racePassed ? "PASS" : "FAIL"} race after competing bet`);
  const replay = await buyPosition(bId, { marketId: market.id, side: "NO", stake: 2_000,
    idempotencyKey: `${tag}_bet_b` });
  const replayPassed = replay.ok && replay.data?.replayed === true
    && replay.data.positionId === b.data.positionId && replay.data.payoutIfWin === expected;
  console.log(`${replayPassed ? "PASS" : "FAIL"} replay keeps the committed quote`);
  if (!sourceGuard || !racePassed || !replayPassed) process.exitCode = 1;
  else console.log(`U43 committed quote: ${scratch ? "disposable PostgreSQL" : "memory"} passed`);
} finally {
  if (database && admin) {
    try { await (await import("../src/lib/server/prisma.ts")).prisma().$disconnect(); } catch { /* unused */ }
    try { await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`); }
    finally { await admin.end(); }
  }
}
