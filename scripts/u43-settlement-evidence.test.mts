/** U43: a VOID's permanent market evidence must state the reason that won.
 * Runs in memory or in this checkout's disposable PostgreSQL cluster. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
process.env.MARKET_SCHEDULER = "false";
process.env.UPDOWN_SCHEDULER = "false";
process.env.UPDOWN_HEALER = "false";
process.env.HOUSE_BOT_ENGINE = "false";

const scratch = process.env.VERIFY_DATABASE_URL ?? "";
const database = scratch ? `ud_evidence_${process.pid}` : "";
let admin: pg.Client | null = null;
if (scratch) {
  if (process.env.NODE_ENV === "production") throw new Error("evidence fixture refuses production mode");
  const adminUrl = new URL(scratch);
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(adminUrl.hostname)
    || adminUrl.port !== String(process.env.KP_SCRATCH_PORT ?? 5433)
    || adminUrl.pathname !== "/postgres") {
    throw new Error("evidence fixture requires the selected local scratch admin database");
  }
  admin = new pg.Client({ connectionString: scratch });
  await admin.connect();
  const directory = (await admin.query<{ setting: string }>(
    "select setting from pg_settings where name = 'data_directory'",
  )).rows[0]?.setting ?? "";
  const normal = (path: string) => resolve(path).replace(/\\/g, "/").toLowerCase();
  if (normal(directory) !== normal(resolve(process.cwd(), ".pgscratch"))) {
    await admin.end();
    throw new Error("evidence fixture refuses a database outside this checkout's scratch cluster");
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
    throw new Error("evidence fixture could not migrate its disposable database");
  }
} else {
  process.env.DATABASE_URL = "";
  process.env.USE_PRISMA_DAL = "false";
}

let failed = 0;
function check(label: string, pass: boolean): void {
  console.log(`${pass ? "PASS" : "FAIL"} ${label}`);
  if (!pass) failed++;
}

try {
  const source = readFileSync(new URL("../src/lib/server/updown-service.ts", import.meta.url), "utf8");
  const evidenceAt = source.indexOf("      resolutionEvidence:");
  const evidenceEnd = source.indexOf("      // Settlement is immediate", evidenceAt);
  const block = evidenceAt >= 0 && evidenceEnd > evidenceAt ? source.slice(evidenceAt, evidenceEnd) : "";
  check("source mismatch precedes band evidence", block.indexOf("? sourceMismatch") >= 0
    && block.indexOf("? sourceMismatch") < block.indexOf('finalVoidReason === "no-move"')
    && block.includes('decided.voidReason === "no-move"'));

  const { db } = await import("../src/lib/server/store.ts");
  const { assetStore, chainStore, roundStore, observationStore, __resetUpDownMemoryStores } =
    await import("../src/lib/server/updown-dal.ts");
  const { createAsset, setAssetEnabled, createChain, setChainState, cleanGridAnchor } =
    await import("../src/lib/server/updown-config.ts");
  const { openRound, closeRound } = await import("../src/lib/server/updown-service.ts");
  const { marketStore } = await import("../src/lib/server/market-dal.ts");
  const { buyPosition, listPositionsForMarket } = await import("../src/lib/server/market-service.ts");
  const { seedDefaultSources, addSource } = await import("../src/lib/server/source-registry.ts");
  if (!scratch) __resetUpDownMemoryStores();
  await seedDefaultSources();
  await addSource({ domain: "api.twelvedata.com", label: "Twelve Data", category: "crypto",
    rationale: "disposable evidence fixture", addedBy: "test" });

  const tag = `udev_${process.pid}`;
  const now = new Date().toISOString();
  await db.user.create({ id: tag, phoneE164: `+2557${String(process.pid % 1_000_000).padStart(6, "0")}30`,
    passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "EN", displayName: null,
    dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null, email: null,
    createdAt: now, updatedAt: now, lastLoginAt: null, closedAt: null } as never);
  await db.wallet.create({ id: `wal_${tag}`, userId: tag, balance: 20_000,
    pending: 0, hold: 0, bonusBalance: 0, currency: "TZS", status: "ACTIVE",
    createdAt: now, updatedAt: now } as never);

  const created = await createAsset({ key: "BTC", symbol: "BTC/USD", nameEn: "Bitcoin",
    nameSw: "Bitcoin", nameZh: "比特币", iconKey: "crypto",
    priceSourceUrl: "https://api.twelvedata.com/quote", category: "crypto",
    decimals: 2, minMoveTicks: 2 }, "test");
  if (!created.ok) throw new Error(created.error);
  await setAssetEnabled(created.data.id, true, "test");
  const asset = await assetStore.get(created.data.id);
  assert.ok(asset);
  const madeChain = await createChain({ assetId: asset.id, durationMinutes: 5, marginBps: 50 }, "test");
  if (!madeChain.ok) throw new Error(madeChain.error);
  await setChainState(madeChain.data.id, "RUNNING", "test");
  const chain = await chainStore.get(madeChain.data.id);
  assert.ok(chain);

  const anchor = cleanGridAnchor(Date.now() + 60_000);
  async function observation(boundaryAt: string, price: number, sourceUrl: string): Promise<string> {
    const row = await observationStore.ensure(asset.id, boundaryAt);
    await observationStore.confirm(row.id, { price, sourceUrl, sourceQuotedAt: boundaryAt,
      evidence: `Disposable observed price ${price}`, confidence: 96,
      model: "test-stub", rawHash: `fixture_${row.id}` });
    return row.id;
  }
  const cases = [
    { name: "source mismatch outside band", close: 101, url: "https://wrong.example/quote", override: undefined, reason: "source-mismatch" },
    { name: "genuine in-band no-move", close: 100, url: asset.priceSourceUrl, override: undefined, reason: "no-move" },
    { name: "missing close price", close: null, url: null, override: undefined, reason: "source-failed" },
    { name: "operator void", close: null, url: null, override: "operator" as const, reason: "operator" },
  ] as const;

  for (const [index, item] of cases.entries()) {
    const boundary = new Date(anchor + index * 20 * 60_000).toISOString();
    const openId = await observation(boundary, 100, asset.priceSourceUrl);
    const opened = await openRound(chain, boundary, openId, 100);
    if (!opened.ok) throw new Error(opened.error);
    const round = opened.data;
    assert.equal(round.marginBps, 50);
    assert.ok(round.upTarget != null && round.downTarget != null);
    assert.ok(round.downTarget < 100 && round.upTarget > 100);
    const before = (await db.wallet.findByUserId(tag))?.balance;
    assert.ok(before != null);
    const bet = await buyPosition(tag, { marketId: round.marketId, side: "YES", stake: 500,
      idempotencyKey: `${tag}_${index}` });
    if (!bet.ok) throw new Error(bet.error);
    assert.equal((await db.wallet.findByUserId(tag))?.balance, before - 500);
    const closeId = item.close == null ? null : await observation(round.closesAt, item.close, item.url!);
    const result = await closeRound(round.id, closeId, item.close, item.override);
    if (!result.ok) throw new Error(result.error);
    assert.equal(result.data.outcome, "VOID");
    const finished = await roundStore.get(round.id);
    const money = await marketStore.get(round.marketId);
    assert.ok(finished && money);
    const evidence = money.resolutionEvidence ?? "";
    const positions = await listPositionsForMarket(round.marketId);
    check(`${item.name}: recorded reason`, finished.voidReason === item.reason
      && money.status === "VOIDED" && evidence.includes(`Round voided (${item.reason})`));
    check(`${item.name}: full refund`, result.data.settled === true
      && (await db.wallet.findByUserId(tag))?.balance === before
      && positions.length === 1 && positions[0].status === "VOID"
      && positions[0].finalPayout === 500);
    if (item.reason === "source-mismatch") {
      check("source mismatch evidence names the wrong source without a false band claim",
        item.close! > round.upTarget! && evidence.includes('reading cited "wrong.example"')
        && !evidence.includes("stayed inside the band"));
    } else if (item.reason === "no-move") {
      check("genuine no-move evidence states the measured band",
        item.close! > round.downTarget! && item.close! < round.upTarget!
        && evidence.includes(`close ${item.close} stayed inside the band [${round.downTarget}, ${round.upTarget}]`));
    } else {
      check(`${item.name}: no invented close or band`, !evidence.includes("stayed inside the band")
        && !evidence.includes("close null"));
    }
  }
  if (failed) process.exitCode = 1;
  else console.log(`U43 settlement evidence: ${scratch ? "disposable PostgreSQL" : "memory"} passed`);
} finally {
  if (database && admin) {
    try { await (await import("../src/lib/server/prisma.ts")).prisma()?.$disconnect(); } catch { /* unused */ }
    try { await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`); }
    finally { await admin.end(); }
  }
}
