/**
 * e2e:report-reads — the report reads narrowed on 2026-09-25/26, driven on a REAL Postgres.
 *
 *   DATABASE_URL=postgresql://…@127.0.0.1:<port>/<scratch db> npm run e2e:report-reads
 *
 * ⭐ WHY THIS EXISTS BESIDE `test:report-window-reads`. That suite runs on the in-memory store, so
 * it proves the BUILDERS ask for a window — but every narrowed read has a PRISMA twin the memory
 * store never executes: `listBoard`'s `settledAt` range, `attribution(ids)` in 5,000-id chunks,
 * `newestConfirmedOfType`'s two-key ordering, and `totalsByType`'s aggregate. A wrong `where` there
 * would pass every memory test and move a money figure on production. This drives the same
 * fixtures through Prisma and checks the SAME answers.
 *
 * ⛔ NOT a `test:*` script: it needs a Postgres, and `test:all` must run without one (the
 * `e2e:money` convention). ⛔ LOOPBACK ONLY: it WRITES fixtures, so it refuses any host but
 * 127.0.0.1/localhost — it can never be pointed at production. Use a throwaway database.
 */
const url = process.env.DATABASE_URL ?? "";
let host = "";
try { host = new URL(url).hostname; } catch { /* reported below */ }
if (!url || !["127.0.0.1", "localhost"].includes(host)) {
  console.error(`e2e:report-reads REFUSED — DATABASE_URL must be a LOOPBACK scratch Postgres (got "${host || "none"}"); this suite writes fixtures.`);
  process.exit(2);
}
process.env.USE_PRISMA_DAL = "true";

const { PrismaClient } = await import("@prisma/client");
const { db } = await import("../src/lib/server/store.ts");
type StoredTxn = import("../src/lib/server/store.ts").StoredTxn;
type StoredMarket = import("../src/lib/server/market-service.ts").StoredMarket;
const { marketStore, positionStore } = await import("../src/lib/server/market-dal.ts");
const { listMarkets } = await import("../src/lib/server/market-service.ts");
const { settlementFeesByPoll } = await import("../src/lib/server/analytics.ts");
const { categoryBreakdown, moneyByGame, loadMoneyAttribution, loadReportWindow } = await import("../src/lib/server/report-money.ts");
const { buildMatchIntegrity } = await import("../src/lib/server/reports/catalogue.ts");

const prisma = new PrismaClient({ datasources: { db: { url } } });
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra = "") => {
  if (cond) { pass++; console.log(`PASS ${label}${extra ? ` — ${extra}` : ""}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};
const DAY = 86_400_000, HOUR = 3_600_000;
const iso = (ms: number) => new Date(ms).toISOString();
const RUN = `rr${Date.now().toString(36)}`;   // a fresh prefix per run, so a re-run on the same db cannot collide

await prisma.user.create({ data: { id: `${RUN}_u`, phoneE164: `+2557${String(Date.now()).slice(-8)}`, role: "PLAYER", status: "ACTIVE", locale: "EN", displayName: RUN } });
await prisma.wallet.create({ data: { id: `${RUN}_w`, userId: `${RUN}_u`, balance: 0, currency: "TZS", status: "ACTIVE" } });
let seq = 0;
async function txn(atMs: number, type: StoredTxn["type"], amount: number, over: Partial<StoredTxn> = {}) {
  const id = `${RUN}_t${String(++seq).padStart(5, "0")}`;
  await db.txn.create({ id, userId: `${RUN}_u`, walletId: `${RUN}_w`, type, status: "CONFIRMED", amount, fee: 0,
    createdAt: iso(atMs), ...over } as StoredTxn);
  return id;
}
const mkM = (id: string, T: number, over: Partial<StoredMarket>): StoredMarket => ({
  id, titleEn: `poll ${id}`, titleSw: `poll ${id}`, titleZh: null, category: "sports", sourceUrl: "https://x.test",
  resolutionCriterion: "t", resolutionAt: iso(T), selectionClosedAt: null, status: "RESOLVED",
  yesPool: 10_000, noPool: 30_000, predictorCount: 4, feeSnapshot: null, resolvedOutcome: "YES",
  resolutionStage1By: null, resolutionStage1At: null, resolutionStage2By: null, resolutionStage2At: null,
  objectionsClosedAt: null, settledAt: null, productLine: "MARKET", proposedBy: "t", createdAt: iso(T), updatedAt: iso(T),
  ...over,
} as StoredMarket);

console.log("\n── 1 · listBoard's settledAt range, through Prisma ──");
{
  const T = Date.UTC(2031, 0, 10), W = { start: T, end: T + 7 * DAY };   // a year no real row lives in
  const m = (s: string, over: Partial<StoredMarket>) => marketStore.set(mkM(`${RUN}_f_${s}`, T, over));
  await m("before", { settledAt: iso(W.start - 1) });
  await m("start", { settledAt: iso(W.start) });
  await m("round", { settledAt: iso(W.start + DAY), productLine: "UPDOWN", resolvedOutcome: "NO" });
  await m("last", { settledAt: iso(W.end - 1) });
  await m("end", { settledAt: iso(W.end) });
  await m("unsettled", { settledAt: null });
  await m("void", { settledAt: iso(W.start + DAY), status: "VOIDED", resolvedOutcome: "VOID" });
  const got = (await settlementFeesByPoll(W)).rows.map((r) => r.marketId).filter((id) => id.startsWith(`${RUN}_f_`)).sort();
  const legacy = (await listMarkets({ status: "RESOLVED", productLine: "ALL" }))
    .filter((x) => x.id.startsWith(`${RUN}_f_`) && x.settledAt && Date.parse(x.settledAt) >= W.start && Date.parse(x.settledAt) < W.end)
    .filter((x) => x.resolvedOutcome === "YES" || x.resolvedOutcome === "NO").map((x) => x.id).sort();
  ok("settlement-fee rows == the legacy all-markets JS filter", JSON.stringify(got) === JSON.stringify(legacy), `${got} vs ${legacy}`);
  ok("…exactly start, the round and last (both bounds, both product lines)",
    JSON.stringify(got) === JSON.stringify([`${RUN}_f_last`, `${RUN}_f_round`, `${RUN}_f_start`]), got.join(","));
}

console.log("\n── 2 · attribution(ids) in chunks, and every figure identical to the whole-table load ──");
{
  const T = Date.UTC(2031, 1, 3), W = { start: T, end: T + 5 * DAY };
  await marketStore.set(mkM(`${RUN}_a_poll`, T, { status: "LIVE", resolvedOutcome: null, category: "sports" }));
  await marketStore.set(mkM(`${RUN}_a_round`, T, { status: "LIVE", resolvedOutcome: null, category: "crypto", productLine: "UPDOWN" }));
  await marketStore.set(mkM(`${RUN}_a_demo`, T, { status: "LIVE", resolvedOutcome: null, category: "macro", titleEn: "Demo · poll" }));
  const pos = (id: string, marketId: string) => positionStore.set({ id, userId: `${RUN}_u`, marketId, side: "YES", stake: 1_000,
    potentialPayout: 0, status: "OPEN", finalPayout: null, placedAt: iso(T), settledAt: null });
  await pos(`${RUN}_p_poll`, `${RUN}_a_poll`); await pos(`${RUN}_p_round`, `${RUN}_a_round`); await pos(`${RUN}_p_demo`, `${RUN}_a_demo`);
  await txn(T + HOUR, "BET_PLACED", -4_000, { positionId: `${RUN}_p_poll` });
  await txn(T + 2 * HOUR, "BET_PAYOUT", 1_500, { positionId: `${RUN}_p_poll` });
  await txn(T + 3 * HOUR, "BET_PLACED", -7_000, { positionId: `${RUN}_p_round` });
  await txn(T + 4 * HOUR, "BET_PLACED", -2_000, { positionId: `${RUN}_p_demo` });
  await txn(T + 5 * HOUR, "BET_PLACED", -3_000, { positionId: `${RUN}_p_missing` });

  const scoped = await loadReportWindow(W.start, W.end);
  const whole = { ...scoped, attribution: await loadMoneyAttribution() };
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  ok("categoryBreakdown: scoped == whole-table", same(await categoryBreakdown(W, undefined, scoped), await categoryBreakdown(W, undefined, whole)));
  ok("moneyByGame: scoped == whole-table", same(await moneyByGame(W.start, W.end, scoped), await moneyByGame(W.start, W.end, whole)));
  const g = await moneyByGame(W.start, W.end, scoped);
  ok("CONTROL · both games and an unmatched position are exercised",
    g.market.stakes === 6_000 && g.updown.stakes === 7_000 && g.unattributed.stakes === 3_000, JSON.stringify(g));

  // ⭐ THE CHUNK BOUNDARY: more ids than one query takes (5,000), with the matches split across chunks.
  const ids = Array.from({ length: 12_001 }, (_, i) => `${RUN}_nope_${i}`);
  ids.splice(4_999, 0, `${RUN}_p_poll`); ids.push(`${RUN}_p_round`);
  const rows = await positionStore.attribution(ids);
  ok("attribution(ids) across 3 chunks finds exactly the positions that exist",
    JSON.stringify(rows.map((r) => r.id).sort()) === JSON.stringify([`${RUN}_p_poll`, `${RUN}_p_round`]), `${rows.length} rows`);
  const mrows = await marketStore.attribution([`${RUN}_a_round`, `${RUN}_a_demo`]);
  ok("marketStore.attribution(ids) returns both product lines it was asked for, demo included",
    mrows.length === 2 && mrows.some((r) => r.productLine === "UPDOWN"), JSON.stringify(mrows));
  ok("attribution([]) reads nothing", (await positionStore.attribution([])).length === 0 && (await marketStore.attribution([])).length === 0);
}

console.log("\n── 3 · newestConfirmedOfType + totalsByType, and match-integrity on them ──");
{
  const before = (await db.txn.totalsByType(["BET_REFUND"])).BET_REFUND;
  const base = Date.UTC(2031, 2, 1);
  const tie = iso(base + 500 * HOUR);
  const a = await txn(base + 500 * HOUR, "BET_REFUND", 1_000, { createdAt: tie });   // two rows on the SAME instant:
  const b = await txn(base + 500 * HOUR, "BET_REFUND", 1_000, { createdAt: tie });   // the id breaks the tie
  for (let i = 0; i < 205; i++) await txn(base + i * HOUR, "BET_REFUND", 1_000);
  const failed = await txn(base + 900 * HOUR, "BET_REFUND", 50_000, { status: "FAILED" });
  const after = (await db.txn.totalsByType(["BET_REFUND"])).BET_REFUND;
  ok("totalsByType counts the 207 CONFIRMED refunds and not the FAILED one", after.count - before.count === 207, `${after.count - before.count}`);
  ok("…and sums them (207,000; the FAILED 50,000 excluded)", Math.round(after.amount - before.amount) === 207_000, `${after.amount - before.amount}`);
  const newest = await db.txn.newestConfirmedOfType("BET_REFUND", 3);
  ok("newestConfirmedOfType orders createdAt DESC then id DESC, CONFIRMED only",
    newest[0]?.id === (a > b ? a : b) && newest[1]?.id === (a > b ? b : a) && !newest.some((t) => t.id === failed),
    newest.map((t) => `${t.id}@${t.createdAt}`).join(" · "));
  const r = await buildMatchIntegrity("usr_e2e");
  const section = r.sections.find((s) => /refund/i.test(s.title));
  ok("match-integrity shows 200 rows, newest first", section?.rows.length === 200 && String(section?.rows[0].ref) === (a > b ? a : b),
    `${section?.rows.length} rows, first ${section?.rows[0]?.ref}`);
  ok("…and its count tile is the CONFIRMED aggregate", r.summary?.find((k) => k.label === "Refund transactions")?.num === after.count);
}

await prisma.$disconnect();
console.log(`\nreport-reads-pg: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
