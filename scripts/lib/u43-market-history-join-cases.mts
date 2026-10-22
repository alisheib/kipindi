/** Real current-pool joins; same assertions in the memory and disposable Postgres stores. */
import { getCardChart, getCardCharts, getHistory, recordSnapshot } from "../../src/lib/server/market-history.ts";
import { prisma } from "../../src/lib/server/prisma.ts";

const store = process.env.HB_MONEY_STORE;
if (store !== "memory" && store !== "postgres" && store !== "mixed") throw new Error("A U43 store runner is required");
const db = store === "postgres" ? prisma() : null;
if (store === "postgres") {
  const hostname = new URL(process.env.DATABASE_URL ?? "").hostname;
  if (!db || !["127.0.0.1", "localhost", "::1", "[::1]"].includes(hostname)) {
    throw new Error("Postgres join proof may write only a loopback scratch database");
  }
} else if (store === "memory" && process.env.DATABASE_URL) {
  throw new Error("The plain memory proof must not have a database URL");
} else if (store === "mixed" && (!process.env.DATABASE_URL || process.env.USE_PRISMA_DAL !== "false")) {
  throw new Error("The mixed proof requires a database URL and the memory DAL flag");
}

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) passed++; else failed++;
  console.log(`${ok ? "PASS" : "FAIL"} [${store}] ${name}${detail ? ` — ${detail}` : ""}`);
}
const id = `u43_history_join_${process.pid}_${Date.now()}`;
const current = { id, yesPool: 500, noPool: 500 };
if (db) {
  await db.predictionMarket.create({ data: {
    id, titleEn: "Scratch join test?", titleSw: "Jaribio la kuunganisha?",
    category: "other", sourceUrl: "https://example.org/scratch",
    resolutionCriterion: "Scratch database fixture only.",
    resolutionAt: new Date(Date.now() + 3600_000), proposedBy: "u43-scratch-test",
    status: "LIVE", yesPool: current.yesPool, noPool: current.noPool,
  } });
}
async function setCurrent(yesPool: number, noPool: number) {
  current.yesPool = yesPool;
  current.noPool = noPool;
  if (db) await db.predictionMarket.update({ where: { id }, data: { yesPool, noPool } });
}
async function snap() {
  await recordSnapshot(id, current.yesPool, current.noPool);
  check("snapshot persisted with its actual pool pair",
    (await getHistory(id)).at(-1)?.yesPool === current.yesPool
    && (await getHistory(id)).at(-1)?.noPool === current.noPool);
}

const empty = await getCardChart(current);
check("a market row without history has no move or mini chart", empty.move24h === undefined && empty.spark.length === 0);
await snap();
await new Promise((done) => setTimeout(done, 10));
await setCurrent(700, 300);
const pending = await getCardChart(current);
check("committed current pools with a lagging snapshot suppress both claims",
  pending.move24h === undefined && pending.spark.length === 0);
const pendingBatch = (await getCardCharts([current])).get(id);
check("batch reader applies the same stale-snapshot gate",
  pendingBatch?.move24h === undefined && pendingBatch.spark.length === 0);
await snap();
const joined = await getCardChart(current);
check("joined current price measures +20 from the real first reading",
  joined.move24h === 20 && joined.spark.length === 0);
const joinedBatch = (await getCardCharts([current])).get(id);
check("batch reader returns the same joined move as the single reader", joinedBatch?.move24h === 20);
await new Promise((done) => setTimeout(done, 10));
await setCurrent(600, 400);
await snap();
await new Promise((done) => setTimeout(done, 10));
await setCurrent(800, 200);
await snap();
const freshLine = await getCardChart(current);
check("four real joined readings permit the mini chart", freshLine.spark.length === 16 && freshLine.move24h === 30);
await setCurrent(900, 100);
const staleLine = await getCardChart(current);
const staleLineBatch = (await getCardCharts([current])).get(id);
check("a delayed snapshot also withholds an otherwise drawable mini chart in both readers",
  staleLine.move24h === undefined && staleLine.spark.length === 0
  && staleLineBatch?.move24h === undefined && staleLineBatch.spark.length === 0);
await setCurrent(1000, 0);
const oneSided = await getCardChart(current);
check("a one-sided current pool suppresses move and spark", oneSided.move24h === undefined && oneSided.spark.length === 0);

if (db) {
  // Test-only synthetic pressure fixture: >800 real scratch rows inside the
  // same 24h window. The single reader must not silently choose a different
  // baseline merely because getHistory() caps its detail read at 800 rows.
  const heavyId = `${id}_many`;
  const heavy = { id: heavyId, yesPool: 900, noPool: 100 };
  await db.predictionMarket.create({ data: {
    id: heavyId, titleEn: "Scratch history pressure test?", titleSw: "Jaribio la historia?",
    category: "other", sourceUrl: "https://example.org/scratch",
    resolutionCriterion: "Scratch database fixture only.",
    resolutionAt: new Date(Date.now() + 3600_000), proposedBy: "u43-scratch-test",
    status: "LIVE", yesPool: heavy.yesPool, noPool: heavy.noPool,
  } });
  const start = Date.now() - 5_000;
  await db.marketSnapshot.createMany({ data: Array.from({ length: 801 }, (_, index) => {
    const yesPool = index === 0 ? 500 : index === 800 ? 900 : 600;
    const noPool = 1000 - yesPool;
    return { marketId: heavyId, t: new Date(start + index), yes: yesPool / 1000,
      yesPool, noPool, volume: 1000 };
  }) });
  const detailCapped = await getHistory(heavyId);
  const single = await getCardChart(heavy);
  const batch = (await getCardCharts([heavy])).get(heavyId);
  check("single and batch readers use the same within-24h baseline beyond the 800-point detail cap",
    detailCapped.length === 800 && detailCapped[0].yesPool === 600
    && single.move24h === 40 && batch?.move24h === 40);
}

console.log(`@@SUMMARY ${JSON.stringify({ pass: passed, fail: failed })}`);
if (failed) process.exitCode = 1;
