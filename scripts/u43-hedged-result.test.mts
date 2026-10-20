/** A settled hedge has two leg outcomes, even when its total return is a net loss. */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
process.env.MARKET_SCHEDULER = "false";
process.env.HOUSE_BOT_ENGINE = "false";
process.env.UPDOWN_SCHEDULER = "false";
process.env.UPDOWN_HEALER = "false";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";
import { hedgedResultIssues } from "./u43-hedged-result-contract.mjs";

const scratch = process.env.VERIFY_DATABASE_URL ?? "";
const database = scratch ? `ud_hedged_${process.pid}_${Date.now()}` : "";
let admin: pg.Client | null = null;
if (scratch) {
  if (process.env.NODE_ENV === "production") throw new Error("Hedge fixture refuses production mode");
  const adminUrl = new URL(scratch);
  if (adminUrl.hostname !== "127.0.0.1" || adminUrl.port !== "5491" || adminUrl.pathname !== "/postgres")
    throw new Error("Hedge fixture requires the reserved loopback scratch database");
  admin = new pg.Client({ connectionString: scratch });
  await admin.connect();
  const directory = (await admin.query<{ setting: string }>(
    "select setting from pg_settings where name = 'data_directory'",
  )).rows[0]?.setting ?? "";
  const normal = (path: string) => resolve(path).replace(/\\/g, "/").toLowerCase();
  if (normal(directory) !== normal(resolve(process.cwd(), ".pgscratch"))) {
    await admin.end();
    throw new Error("Hedge fixture refuses a scratch cluster from another checkout");
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
    throw new Error("Hedge fixture could not migrate its disposable database");
  }
} else {
  // The default guard must remain in memory even when a machine has a saved DB variable.
  process.env.DATABASE_URL = "";
  process.env.USE_PRISMA_DAL = "false";
}

try {
const { db } = await import("../src/lib/server/store.ts");
const { buyPosition, listPositionsForMarket } = await import("../src/lib/server/market-service.ts");
const { getRoundDetail } = await import("../src/lib/server/updown-board.ts");
const { marketStore } = await import("../src/lib/server/market-dal.ts");
const { createAsset, setAssetEnabled, createChain, setChainState, __resetUpDownConfig } = await import("../src/lib/server/updown-config.ts");
const { chainStore, observationStore, __resetUpDownMemoryStores } = await import("../src/lib/server/updown-dal.ts");
const { openRound, closeRound } = await import("../src/lib/server/updown-service.ts");
const { seedDefaultSources, addSource } = await import("../src/lib/server/source-registry.ts");
await import("./lib/verified-fixtures.mts");

__resetUpDownMemoryStores();
__resetUpDownConfig();
await seedDefaultSources();
try { await addSource({ domain: "kitco.com", label: "Kitco", category: "crypto", rationale: "test fixture", addedBy: "system" }); }
catch { /* Already in this test process. */ }

let nextPhone = 1;
async function funded(id: string): Promise<string> {
  const now = new Date().toISOString();
  await db.user.create({
    id, phoneE164: `+25596${String(nextPhone++).padStart(7, "0")}`,
    passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "EN", displayName: null, dob: null,
    region: null, acceptedTermsVersion: null, acceptedTermsAt: null, marketingOptIn: false,
    twoFactorEnabled: false, avatarDataUrl: null, createdAt: now, updatedAt: now,
    lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({
    id: `wal_${id}`, userId: id, balance: 1_000_000, pending: 0, hold: 0,
    currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now,
  } as never);
  return id;
}

const hedger = await funded("hr_hedger");
const upOnly = await funded("hr_up");
const downOnly = await funded("hr_down");
const refundOnly = await funded("hr_refund");
const asset = await createAsset({
  key: "HRBTC", symbol: "BTC/USD", nameEn: "Bitcoin", nameSw: "Bitcoin", iconKey: "crypto",
  priceSourceUrl: "https://www.kitco.com/price/precious-metals", category: "crypto",
  decimals: 2, minMoveTicks: 2,
}, "off");
assert.equal(asset.ok, true, "test asset must be created");
if (!asset.ok) throw new Error(asset.error);
await setAssetEnabled(asset.data.id, true, "off");

async function round(durationMinutes: number, opening: string) {
  const created = await createChain({ assetId: asset.data.id, durationMinutes }, "off");
  assert.equal(created.ok, true, "test chain must be created");
  if (!created.ok) throw new Error(created.error);
  await setChainState(created.data.id, "RUNNING", "off");
  const chain = await chainStore.get(created.data.id);
  assert.ok(chain, "test chain must be readable");
  const observation = await observationStore.ensure(asset.data.id, opening);
  await observationStore.confirm(observation.id, {
    price: 2400, sourceUrl: asset.data.priceSourceUrl, sourceQuotedAt: opening,
    evidence: "open", confidence: 95, model: "t", rawHash: `hr-open-${durationMinutes}`,
  });
  const made = await openRound(chain, opening, observation.id, 2400);
  assert.equal(made.ok, true, "test round must open");
  if (!made.ok) throw new Error(made.error);
  return made.data;
}

async function bet(userId: string, marketId: string, side: "YES" | "NO", stake: number) {
  const placed = await buyPosition(userId, {
    marketId, side, stake, idempotencyKey: `hr-${userId}-${marketId}-${side}-${stake}`,
  });
  assert.equal(placed.ok, true, `test ${side} stake must be accepted`);
}

async function settleUp(roundId: string, marketId: string, closing: string) {
  await marketStore.stamp(marketId, { selectionClosedAt: new Date(Date.now() - 1_000).toISOString() });
  const observation = await observationStore.ensure(asset.data.id, closing);
  await observationStore.confirm(observation.id, {
    price: 2600, sourceUrl: asset.data.priceSourceUrl, sourceQuotedAt: closing,
    evidence: "close", confidence: 95, model: "t", rawHash: `hr-close-${roundId}`,
  });
  const closed = await closeRound(roundId, observation.id, 2600);
  assert.equal(closed.ok, true, "test round must settle");
  if (closed.ok) assert.equal(closed.data.outcome, "UP", "test price must choose UP");
}

const firstOpen = new Date(Date.now() - 2 * 60_000).toISOString();
const first = await round(5, firstOpen);
await bet(hedger, first.marketId, "YES", 2_000);
await bet(hedger, first.marketId, "NO", 18_000);
await bet(upOnly, first.marketId, "YES", 20_000);
await bet(downOnly, first.marketId, "NO", 2_000);
await settleUp(first.id, first.marketId, first.closesAt);

const stored = (await listPositionsForMarket(first.marketId)).filter((position) => position.userId === hedger);
assert.equal(stored.length, 2, "hedger must own exactly two legs");
assert.deepEqual(new Set(stored.map((position) => position.status)), new Set(["WIN", "LOSS"]),
  "settlement must store distinct outcomes; a uniform fixture proves nothing");
const stake = stored.reduce((sum, position) => sum + position.stake, 0);
const payout = stored.reduce((sum, position) => sum + (position.finalPayout ?? 0), 0);
assert.equal(stake, 20_000);
assert.ok(payout > 0 && payout < stake,
  `fixture must be a net losing hedge with a winning leg; payout ${payout}, stake ${stake}`);

const hedge = (await getRoundDetail(first.id, hedger))?.myPosition;
assert.ok(hedge, "settled hedger detail must exist");
assert.equal(hedge.hedged, true);
assert.equal(hedge.stake, stake);
assert.equal(hedge.payout, payout, "headline amount must be the stored aggregate payout");
assert.equal(hedge.result, "MIXED", "a WIN leg must not turn a net losing hedge into a WIN headline");
assert.deepEqual(new Set(hedge.items.map((item) => item.status)), new Set(["WIN", "LOSS"]));

const winner = (await getRoundDetail(first.id, upOnly))?.myPosition;
const loser = (await getRoundDetail(first.id, downOnly))?.myPosition;
assert.equal(winner?.result, "WIN", "one-sided winner stays WIN");
assert.equal(loser?.result, "LOSS", "one-sided loser stays LOSS");

const secondOpen = new Date(Date.now() - 3 * 60_000).toISOString();
const second = await round(15, secondOpen);
await bet(refundOnly, second.marketId, "YES", 4_000);
await settleUp(second.id, second.marketId, second.closesAt);
const refunded = (await getRoundDetail(second.id, refundOnly))?.myPosition;
assert.ok(refunded, "refunded holder detail must exist");
assert.equal(refunded.items.length, 1);
assert.equal(refunded.items[0].status, "VOID", "one-sided settlement must return the stake");
assert.equal(refunded.result, "VOID", "all-VOID positions must not be labelled MIXED");

assert.deepEqual(hedgedResultIssues({
  detail: readFileSync("src/app/updown/[roundId]/page.tsx", "utf8"),
  card: readFileSync("src/components/updown/updown-card.tsx", "utf8"),
}), [], "detail and card must render the mixed money result truthfully");

console.log(`U43 hedged result: MIXED net loss, WIN, LOSS and all-VOID passed (hedge stake ${stake}, paid ${payout})`);
} finally {
  if (admin) {
    try { await (await import("../src/lib/server/prisma.ts")).prisma()?.$disconnect(); }
    catch { /* No pooled connection to close after a failed fixture. */ }
    try { await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`); }
    finally { await admin.end(); }
  }
}
