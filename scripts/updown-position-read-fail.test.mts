/**
 * A signed-in player's position read may fail, but their money must not disappear from
 * the board, round detail or history. Run in memory and on disposable PostgreSQL.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import pg from "pg";

process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
process.env.MARKET_SCHEDULER = "false";
process.env.HOUSE_BOT_ENGINE = "false";

// db:scratch supplies only the loopback admin URL. Give this test its own migrated
// database, so neither an existing checkout nor production can be altered by fixtures.
const scratch = process.env.VERIFY_DATABASE_URL ?? "";
const scratchDb = scratch ? `ud_posread_${process.pid}` : "";
if (scratch) {
  const host = new URL(scratch).hostname;
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) throw new Error("position-read fixture requires loopback PostgreSQL");
  const admin = new pg.Client({ connectionString: scratch });
  try {
    await admin.connect();
    await admin.query(`DROP DATABASE IF EXISTS "${scratchDb}" WITH (FORCE)`);
    await admin.query(`CREATE DATABASE "${scratchDb}"`);
  } finally { await admin.end(); }
  const dbUrl = `${scratch.replace(/\/[^/?]*(\?.*)?$/, "")}/${scratchDb}?connect_timeout=30`;
  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: dbUrl }, stdio: "inherit", shell: process.platform === "win32",
  });
  process.env.DATABASE_URL = dbUrl;
  process.env.USE_PRISMA_DAL = "true";
}

const { db } = await import("../src/lib/server/store.ts");
const { positionStore } = await import("../src/lib/server/market-dal.ts");
const { buyPosition } = await import("../src/lib/server/market-service.ts");
const { getBoard, getRoundDetail, getMyUpDownHistory } = await import("../src/lib/server/updown-board.ts");
const UC = await import("../src/lib/server/updown-config.ts");
const UD = await import("../src/lib/server/updown-dal.ts");
const { openRound } = await import("../src/lib/server/updown-service.ts");
const { seedDefaultSources, addSource } = await import("../src/lib/server/source-registry.ts");

const onPostgres = !!process.env.DATABASE_URL && process.env.USE_PRISMA_DAL !== "false";
try {
if (!onPostgres) { UD.__resetUpDownMemoryStores(); UC.__resetUpDownConfig(); }
await seedDefaultSources();
try { await addSource({ domain: "kitco.com", label: "Kitco", category: "crypto", rationale: "test fixture", addedBy: "system" }); }
catch { /* already registered */ }

const tag = `PRF${process.pid % 10_000}`;
const asset = await UC.createAsset({ key: tag, symbol: "BTC/USD", nameEn: "Bitcoin", nameSw: "Bitcoin", nameZh: "比特币",
  iconKey: "crypto", priceSourceUrl: "https://www.kitco.com/price/crypto", category: "crypto", decimals: 2, minMoveTicks: 2 }, "off");
if (!asset.ok) throw new Error(`fixture asset: ${asset.error}`);
await UC.setAssetEnabled(asset.data.id, true, "off");
const chainResult = await UC.createChain({ assetId: asset.data.id, durationMinutes: 5 }, "off");
if (!chainResult.ok) throw new Error(`fixture chain: ${chainResult.error}`);
await UC.setChainState(chainResult.data.id, "RUNNING", "off");
const chain = await UD.chainStore.get(chainResult.data.id);
assert.ok(chain);

const openedAt = new Date(Date.now() - 60_000).toISOString();
const observation = await UD.observationStore.ensure(asset.data.id, openedAt);
await UD.observationStore.confirm(observation.id, { price: 62_000, sourceUrl: asset.data.priceSourceUrl,
  sourceQuotedAt: openedAt, evidence: "fixture", confidence: 95, model: "test", rawHash: `prf-${process.pid}` });
const round = await openRound(chain, openedAt, observation.id, 62_000);
if (!round.ok) throw new Error(`fixture round: ${round.error}`);

const userId = `usr_prf_${process.pid}`;
const now = new Date().toISOString();
await db.user.create({ id: userId, phoneE164: `+2556${String(process.pid % 10_000_000).padStart(7, "0")}0`, email: null,
  passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "SW",
  displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null, marketingOptIn: false,
  twoFactorEnabled: false, avatarDataUrl: null, recruitedBy: null, createdAt: now, updatedAt: now, lastLoginAt: null, closedAt: null } as never);
await db.wallet.create({ id: `wal_${userId}`, userId, balance: 20_000, pending: 0, hold: 0, bonusBalance: 0,
  currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now } as never);
const bet = await buyPosition(userId, { marketId: round.data.marketId, side: "YES", stake: 2_000,
  idempotencyKey: `prf-${process.pid}` });
if (!bet.ok) throw new Error(`fixture bet: ${bet.error}`);

const board = await getBoard({ assetKey: tag, durationMinutes: 5, userId });
assert.equal(board.rounds.find((r) => r.roundId === round.data.id)?.myUpStake, 2_000, "board fixture must show this stake");
const detail = await getRoundDetail(round.data.id, userId);
assert.equal(detail?.myPosition?.stake, 2_000, "detail fixture must show this stake");
const history = await getMyUpDownHistory(userId);
assert.equal(history.some((p) => p.positionId === bet.data.positionId), true, "history fixture must show this position");

// A failed catalog or round read is not an empty market. The same board retry
// boundary serves guests and players; both must receive the real read error.
async function expectReadFault(
  target: object,
  method: string,
  action: () => Promise<unknown>,
  message: string,
): Promise<void> {
  const methods = target as Record<string, unknown>;
  const original = methods[method];
  const fault = new Error(`fixture ${method} read failure`);
  methods[method] = async () => { throw fault; };
  try {
    await assert.rejects(action, (e) => e === fault, message);
  } finally { methods[method] = original; }
}

for (const [store, method, label] of [
  [UD.assetStore, "list", "asset catalog"],
  [UD.chainStore, "list", "chain catalog"],
  [UD.roundStore, "list", "round list"],
] as const) {
  await expectReadFault(store, method, () => getBoard({ assetKey: tag, durationMinutes: 5, userId }),
    `player board must not turn failed ${label} read into an empty market`);
  await expectReadFault(store, method, () => getBoard({ assetKey: tag, durationMinutes: 5 }),
    `guest board must not turn failed ${label} read into an empty market`);
}

// A player's bet has a real round, chain and asset. If one lookup fails, the
// history page must retry instead of inventing an unknown asset or round.
for (const [store, method, label] of [
  [UD.roundStore, "getByMarketId", "round"],
  [UD.chainStore, "get", "chain"],
  [UD.assetStore, "get", "asset"],
] as const) {
  await expectReadFault(store, method, () => getMyUpDownHistory(userId),
    `history must not turn failed ${label} lookup into Unknown`);
}

const userRead = positionStore.listForUser;
const userFault = new Error("fixture position-by-user read failure");
positionStore.listForUser = async () => { throw userFault; };
try {
  await assert.rejects(() => getBoard({ assetKey: tag, durationMinutes: 5, userId }), (e) => e === userFault,
    "board must not turn failed position read into no stake");
  await assert.rejects(() => getRoundDetail(round.data.id, userId), (e) => e === userFault,
    "detail must not turn failed position read into no stake");
  await assert.rejects(() => getMyUpDownHistory(userId), (e) => e === userFault,
    "history must not turn failed position read into no bets");
  const guestBoard = await getBoard({ assetKey: tag, durationMinutes: 5 });
  assert.equal(guestBoard.rounds.find((r) => r.roundId === round.data.id)?.myUpStake, 0,
    "guest board must remain anonymous");
  const guestDetail = await getRoundDetail(round.data.id);
  assert.equal(guestDetail?.myPosition, null, "guest detail must remain anonymous");
} finally { positionStore.listForUser = userRead; }

const marketRead = positionStore.listForMarket;
const marketFault = new Error("fixture position-by-market read failure");
positionStore.listForMarket = async () => { throw marketFault; };
try {
  await assert.rejects(() => getRoundDetail(round.data.id, userId), (e) => e === marketFault,
    "detail must not turn a failed market-position read into no bet");
  const guestDetail = await getRoundDetail(round.data.id);
  assert.equal(guestDetail?.myPosition, null, "guest detail must skip the market-position read");
} finally { positionStore.listForMarket = marketRead; }

// A settled round uses the detail-only successor lookup. If that read fails,
// the detail page must retry instead of announcing no next round.
await UD.roundStore.patch(round.data.id, { outcome: "UP", resolvedAt: new Date().toISOString() });
const settledDetail = await getRoundDetail(round.data.id, userId);
assert.equal(settledDetail?.round.state, "resolved", "successor fixture must use the settled detail path");
await expectReadFault(UD.roundStore, "list", () => getRoundDetail(round.data.id, userId),
  "detail must not turn failed successor lookup into no next round");

console.log(`Up & Down position-read fault guard: ${onPostgres ? "PostgreSQL" : "memory"} passed`);
} finally {
  if (scratchDb) {
    try { await (await import("../src/lib/server/prisma.ts")).prisma().$disconnect(); } catch { /* no connection */ }
    const admin = new pg.Client({ connectionString: scratch });
    try {
      await admin.connect();
      await admin.query(`DROP DATABASE IF EXISTS "${scratchDb}" WITH (FORCE)`);
    } finally { await admin.end(); }
  }
}
