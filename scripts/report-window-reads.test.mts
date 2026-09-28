/**
 * REPORT WINDOW READS — a report that covers a window reads THAT WINDOW, never the whole
 * `Transaction` table.
 *
 *   npm run test:report-window-reads        (npx tsx scripts/report-window-reads.test.mts)
 *
 * 🔴 THE DEFECT (2026-09-25, `SESSION-PROMPT-FINANCE-SEAL.md` §2). `buildDailyOps` — one EAT day —
 * called `db.txn.listAll()` and kept the day in JavaScript, and `buildFiuSar` — one calendar month —
 * did the same. On production that is every transaction the platform has ever recorded, pulled into
 * a 512 MB container to keep a day of it: the daily-ops build THREW once against production during
 * verification and passed on retry. It is the exact shape `test:report-parity` exists because of
 * (3,176 ms and 333 MB at 1,000 users × 100 txns, vs 48 ms in SQL) — and that suite's §4 source
 * scan never looked at `reports/catalogue.ts`.
 *
 * ⭐ BEHAVIOURAL, NOT A GREP. Every `db.txn` read method is wrapped to RECORD its name and, for
 * `listInRange`, its bounds; the real builders then run on the in-memory store. So the suite sees a
 * whole-table walk by any route (`listAll`, `listByStatus`, `search`…), not one spelling of it —
 * and it checks every figure against the fixture's own arithmetic with a row ON each boundary, so
 * a bounded read cannot buy its speed by dropping a row.
 *
 *   §1 daily-ops      — ONE read, of exactly [EAT midnight, next EAT midnight); figures unchanged
 *   §2 fiu-sar        — ONE read, of exactly the pack month; boundary rows in/out; ties ordered
 *   §3 every builder  — NO builder walks the table (match-integrity's all-time walk went 2026-09-26)
 *   §4 match-integrity — "the most recent 200" IS the newest 200; count/total are CONFIRMED aggregates
 *   §5 settlement fees — read only the markets SETTLED in the window, rows identical to the old filter
 *   §6 attribution     — reads the window's positions and their markets; every figure identical
 *   §7 a malformed pack period is refused, not turned into NaN bounds
 */
import { readFileSync } from "node:fs";

/* ⛔ THE IN-MEMORY STORE, ALWAYS. `store.ts` picks Postgres at import time when DATABASE_URL is
   set, and this suite writes fixtures — so the env is cleared BEFORE the first dynamic import
   (static imports would evaluate first). The convention `ai-usage.test.mts` uses. */
delete process.env.DATABASE_URL;
delete process.env.DATABASE_PUBLIC_URL;
process.env.USE_PRISMA_DAL = "false";
const { db } = await import("../src/lib/server/store.ts");
type StoredTxn = import("../src/lib/server/store.ts").StoredTxn;
type StoredUser = import("../src/lib/server/store.ts").StoredUser;
const { startOfEatDay } = await import("../src/lib/server/report-money.ts");
const { packPeriodBounds } = await import("../src/lib/server/report-pack.ts");
const { REPORT_CATALOGUE, buildDailyOps, buildFiuSar, buildMatchIntegrity } = await import("../src/lib/server/reports/catalogue.ts");
type Report = import("../src/lib/server/reports/types.ts").Report;

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; console.log(`PASS ${label}${extra ? ` — ${extra}` : ""}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}

const DAY = 86_400_000, HOUR = 3_600_000;
const GEN = "usr_windowreads";

// ── the instrument: every db.txn READ method records its name; listInRange records its bounds ──
const txnCalls: string[] = [];
const ranges: Array<[number, number]> = [];
const WRITES = new Set(["create", "update"]);
const txn = db.txn as unknown as Record<string, (...a: unknown[]) => unknown>;
const real: Record<string, (...a: unknown[]) => unknown> = {};
for (const k of Object.keys(txn)) {
  if (WRITES.has(k) || typeof txn[k] !== "function") continue;
  real[k] = txn[k].bind(db.txn);
  txn[k] = async (...a: unknown[]) => {
    txnCalls.push(k);
    if (k === "listInRange") ranges.push([a[0] as number, a[1] as number]);
    return real[k](...a);
  };
}
const reset = () => { txnCalls.length = 0; ranges.length = 0; };
const allTxns = () => real.listAll() as StoredTxn[];   // the fixture's own view — never counted

let seq = 0;
async function put(atMs: number, type: StoredTxn["type"], amount: number, over: Partial<StoredTxn> = {}) {
  const id = `txn_wr_${String(++seq).padStart(4, "0")}`;
  await db.txn.create({
    id, userId: "usr_wr_player", walletId: "wlt_wr_player",
    type, status: "CONFIRMED", amount, fee: 0, createdAt: new Date(atMs).toISOString(), ...over,
  } as StoredTxn);
  return id;
}
const tile = (r: Report, re: RegExp) => r.summary?.find((k) => re.test(k.label));
const iso = (ms: number) => new Date(ms).toISOString();

console.log("\n── 1 · daily-ops reads ONE EAT day, and every figure is unchanged ──");
{
  const dayStart = startOfEatDay(Date.now());
  const dayEnd = dayStart + DAY;
  // ⭐ A row ON each bound — the only place a bounded read can disagree with the JS filter it replaces.
  await put(dayStart - 1, "BET_PLACED", -1_000);                 // yesterday — OUT
  await put(dayStart, "BET_PLACED", -2_000);                     // ON start — IN (>= start)
  await put(dayStart + 5 * HOUR, "DEPOSIT", 50_000);             // IN
  await put(dayStart + 6 * HOUR, "DEPOSIT", 70_000, { status: "FAILED" }); // never moved — OUT
  await put(dayStart + 7 * HOUR, "BET_PAYOUT", 1_500);           // IN
  await put(dayStart + 8 * HOUR, "BET_REFUND", 300);             // IN
  await put(dayStart + 9 * HOUR, "WITHDRAWAL", -10_000);         // IN
  await put(dayEnd - 1, "BET_PLACED", -4_000);                   // last ms of the day — IN
  await put(dayEnd, "BET_PLACED", -8_000);                       // ON end — OUT (< end)

  reset();
  const r = await buildDailyOps(GEN);
  if (startOfEatDay(Date.now()) !== dayStart) {
    console.log("⚠️ the clock crossed EAT midnight mid-run — the fixture no longer names today. Re-run.");
    process.exit(1);
  }
  ok("🔴 daily-ops reads transactions ONLY through the windowed read",
    txnCalls.length > 0 && txnCalls.every((k) => k === "listInRange"),
    `db.txn calls: ${txnCalls.join(", ") || "(none)"} — listAll is every transaction ever recorded, to keep one day`);
  ok("…exactly ONE windowed read, of exactly [EAT midnight, next EAT midnight)",
    ranges.length === 1 && ranges[0][0] === dayStart && ranges[0][1] === dayEnd,
    JSON.stringify(ranges.map(([a, b]) => [iso(a), iso(b)])));

  // The fixture's own arithmetic: sales 2,000 + 4,000; GGR = 6,000 − 1,500 − 300.
  ok("Total sales = the two in-day bets, boundary rows in/out exactly", tile(r, /^Total sales/)?.num === 6_000,
    `got ${tile(r, /^Total sales/)?.num} — 6,000 expected (14,000 means the END row leaked in, 7,000 the row BEFORE)`);
  ok("…counted as 2 tickets", tile(r, /^Total sales/)?.delta === "2 tickets", tile(r, /^Total sales/)?.delta);
  ok("GGR = sales − payouts − refunds = 4,200", tile(r, /^GGR/)?.num === 4_200, `got ${tile(r, /^GGR/)?.num}`);
  const hourly = r.sections.find((s) => s.rows.some((row) => row.hour === "00:00"));
  const sum = (k: string) => (hourly?.rows ?? []).reduce((t, row) => t + Number(row[k] ?? 0), 0);
  ok("CONTROL · the hourly breakdown is there to read", !!hourly && hourly.rows.length === 24, `${hourly?.rows.length ?? 0} rows`);
  ok("hourly deposits = the one CONFIRMED deposit (the FAILED one never moved)", sum("deposits") === 50_000, `${sum("deposits")}`);
  ok("hourly withdrawals = 10,000", sum("withdrawals") === 10_000, `${sum("withdrawals")}`);
  ok("the bet ON midnight lands in the 00:00 hour", hourly?.rows.find((row) => row.hour === "00:00")?.sales === 2_000);
  ok("the bet at 23:59:59.999 lands in the 23:00 hour", hourly?.rows.find((row) => row.hour === "23:00")?.sales === 4_000);
}

console.log("\n── 2 · fiu-sar reads its pack MONTH, not the table ──");
{
  // A FIXED past month, so no row sits in the future and the result cannot drift with the clock.
  const PERIOD = "2026-06";
  const { start, end } = packPeriodBounds(PERIOD);
  for (const [id, phone] of [["usr_wr_in", "+255700000901"], ["usr_wr_out", "+255700000902"]]) {
    await db.user.create({ id, phoneE164: phone, role: "PLAYER", status: "ACTIVE" } as StoredUser);
  }
  await put(start - 1, "DEPOSIT", 5_000_000, { userId: "usr_wr_out" });            // last ms of May — OUT
  const onStart = await put(start, "DEPOSIT", 1_200_000, { userId: "usr_wr_in" }); // ON start — IN
  await put(start + 10 * DAY, "WITHDRAWAL", -2_000_000, { userId: "usr_wr_in" });  // IN
  await put(start + 11 * DAY, "DEPOSIT", 999_999, { userId: "usr_wr_in" });        // under the line — no breach
  const tieLater = await put(start + 20 * DAY, "DEPOSIT", 1_200_000, { userId: "usr_wr_in" }); // a TIE with onStart
  await put(end, "DEPOSIT", 3_000_000, { userId: "usr_wr_out" });                  // ON end (1 July EAT) — OUT

  reset();
  const r = await buildFiuSar(GEN, PERIOD);
  ok("🔴 fiu-sar reads transactions ONLY through the windowed read",
    txnCalls.length > 0 && txnCalls.every((k) => k === "listInRange"), `db.txn calls: ${txnCalls.join(", ") || "(none)"}`);
  ok("…exactly ONE windowed read, of exactly the pack month",
    ranges.length === 1 && ranges[0][0] === start && ranges[0][1] === end, JSON.stringify(ranges.map(([a, b]) => [iso(a), iso(b)])));
  ok("the three in-month breaches are reported, the two boundary rows are not",
    tile(r, /^Triggered entries/)?.num === 3, `got ${tile(r, /^Triggered entries/)?.num}`);
  ok("flagged volume = 1,200,000 × 2 + 2,000,000", tile(r, /^Total flagged volume/)?.num === 4_400_000,
    `got ${tile(r, /^Total flagged volume/)?.num}`);
  // ⭐ Equal amounts are ordered by the DATA (time, then id), not by the order the store returned them.
  const rows = r.sections[0]?.rows ?? [];
  const idxOf = (id: string) => rows.findIndex((row) => row.txnId === id);
  ok("CONTROL · both tied rows are in the section", idxOf(onStart) >= 0 && idxOf(tieLater) >= 0,
    `${idxOf(onStart)} / ${idxOf(tieLater)} (columns: ${Object.keys(rows[0] ?? {}).join(",")})`);
  ok("a tie on amount is broken by time — the earlier breach first", idxOf(onStart) < idxOf(tieLater));
}

console.log("\n── 3 · NO report builder walks the Transaction table ──");
{
  /* ⭐ THE LAST ONE IS GONE (2026-09-26). `buildMatchIntegrity` was allowed one all-time walk here —
     it reconciles every voided market against every refund, so there is no window to push down.
     All-time is still the semantics; the walk was not needed for it: the count and total are SQL
     aggregates (`totalsByType`) and the rows are the newest 200 (`newestConfirmedOfType`). */
  const WHOLE = new Set(["listAll", "listByStatus", "search", "listSince"]);
  const walkers: string[] = [];
  for (const [id, entry] of Object.entries(REPORT_CATALOGUE)) {
    reset();
    await (entry as { build: (g: string) => Promise<Report> }).build(GEN);
    const walks = txnCalls.filter((k) => WHOLE.has(k));
    if (walks.length) walkers.push(`${id}: ${walks.join(", ")}`);
  }
  // CONTROL — the instrument must SEE a whole-table read, or "none seen" proves nothing.
  reset();
  await db.txn.listAll();
  ok("CONTROL · the instrument sees a whole-table read when one happens", txnCalls.includes("listAll"), txnCalls.join(", "));
  ok("🔴 no report builder walks the Transaction table", walkers.length === 0,
    walkers.join(" · ") || `${Object.keys(REPORT_CATALOGUE).length} builders`);
}

console.log("\n── 4 · match-integrity's \"most recent 200\" IS the newest 200 ──");
{
  /* 🔴 The section tells the Gaming Board it shows "the most recent 200 of N", and it took the FIRST
     200 of an unordered read — insertion order in memory, heap order in Postgres: roughly the OLDEST.
     Seeded oldest-first, so the old code's first 200 are exactly the wrong 200. */
  const base = Date.UTC(2026, 4, 1);
  for (let i = 0; i < 205; i++) await put(base + i * HOUR, "BET_REFUND", 1_000);
  // ⚠️ A NEWER refund that never moved money: it must be neither a row nor counted (CONFIRMED basis,
  // the same as every other money figure — production has 806 of 806 CONFIRMED, so nothing moves).
  const failedRefund = await put(base + 999 * HOUR, "BET_REFUND", 50_000, { status: "FAILED" });
  const refunds = allTxns().filter((t) => t.type === "BET_REFUND" && t.status === "CONFIRMED");
  const expected = [...refunds]
    .sort((a, b) => (b.createdAt < a.createdAt ? -1 : b.createdAt > a.createdAt ? 1 : 0) || b.id.localeCompare(a.id))
    .slice(0, 200).map((t) => t.id);
  const oldest = [...refunds].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0].id;
  const r = await buildMatchIntegrity(GEN);
  const section = r.sections.find((s) => /refund/i.test(s.title));
  const got = (section?.rows ?? []).map((row) => String(row.ref));
  ok("CONTROL · more refunds exist than the cap, so the cap is exercised", refunds.length > 200, `${refunds.length} refunds`);
  ok("CONTROL · the section says it is showing the most recent", /most recent/i.test(section?.description ?? ""), section?.description);
  ok("the 200 rows shown are EXACTLY the 200 newest", got.length === 200 && got.every((id, i) => id === expected[i]),
    `first shown ${got[0]} vs newest ${expected[0]} · ${got.filter((id) => !expected.includes(id)).length} rows not among the newest`);
  ok("…and the oldest refund is NOT among them", !got.includes(oldest), oldest);
  ok("a refund that never moved money is not a row", !got.includes(failedRefund), failedRefund);
  const countTile = r.summary?.find((k) => k.label === "Refund transactions")?.num;
  const totalTile = r.summary?.find((k) => k.label === "Stakes refunded (TZS)")?.num;
  const confirmedTotal = refunds.reduce((s, t) => s + Math.abs(t.amount), 0);
  ok("the count is every CONFIRMED refund, all time", countTile === refunds.length, `tile ${countTile} vs ${refunds.length}`);
  ok("…and the total is their sum (the FAILED 50,000 is not in it)", totalTile === Math.round(confirmedTotal),
    `tile ${totalTile} vs ${confirmedTotal}`);
}

console.log("\n── 5 · settlement fees read the markets SETTLED IN the window, not every resolved market ──");
{
  const { marketStore, positionStore } = await import("../src/lib/server/market-dal.ts");
  const { settlementFeesByPoll } = await import("../src/lib/server/analytics.ts");
  const { listMarkets } = await import("../src/lib/server/market-service.ts");
  type StoredMarket = import("../src/lib/server/market-service.ts").StoredMarket;
  const T = Date.UTC(2026, 6, 10), W = { start: T, end: T + 7 * DAY };
  const mkM = (id: string, over: Partial<StoredMarket>): StoredMarket => ({
    id, titleEn: `poll ${id}`, titleSw: `poll ${id}`, titleZh: null, category: "sports", sourceUrl: "https://x.test",
    resolutionCriterion: "t", resolutionAt: iso(T), selectionClosedAt: null, status: "RESOLVED",
    yesPool: 10_000, noPool: 30_000, predictorCount: 4, feeSnapshot: null, resolvedOutcome: "YES",
    resolutionStage1By: null, resolutionStage1At: null, resolutionStage2By: null, resolutionStage2At: null,
    objectionsClosedAt: null, settledAt: null, productLine: "MARKET", proposedBy: "t", createdAt: iso(T), updatedAt: iso(T),
    ...over,
  } as StoredMarket);
  // A row ON each bound, plus the shapes the loop must still skip.
  await marketStore.set(mkM("wr_fee_before", { settledAt: iso(W.start - 1) }));        // OUT
  await marketStore.set(mkM("wr_fee_start", { settledAt: iso(W.start) }));             // IN (>= start)
  await marketStore.set(mkM("wr_fee_round", { settledAt: iso(W.start + DAY), productLine: "UPDOWN", resolvedOutcome: "NO" })); // IN — a round counts
  await marketStore.set(mkM("wr_fee_last", { settledAt: iso(W.end - 1) }));            // IN
  await marketStore.set(mkM("wr_fee_end", { settledAt: iso(W.end) }));                 // OUT (< end)
  await marketStore.set(mkM("wr_fee_unsettled", { settledAt: null }));                 // OUT — no fee booked yet
  await marketStore.set(mkM("wr_fee_void", { settledAt: iso(W.start + DAY), status: "VOIDED", resolvedOutcome: "VOID" })); // OUT — not RESOLVED

  const boardCalls: Array<Record<string, unknown>> = [];
  const realBoard = marketStore.listBoard.bind(marketStore);
  marketStore.listBoard = (async (q: Parameters<typeof realBoard>[0]) => { boardCalls.push({ ...q }); return realBoard(q); }) as typeof marketStore.listBoard;
  const got = await settlementFeesByPoll(W);
  marketStore.listBoard = realBoard;

  // The legacy shape, reproduced as the reference: every resolved market, filtered in JS.
  const legacy = (await listMarkets({ status: "RESOLVED", productLine: "ALL" }))
    .filter((m) => m.settledAt && Date.parse(m.settledAt) >= W.start && Date.parse(m.settledAt) < W.end)
    .filter((m) => m.resolvedOutcome === "YES" || m.resolvedOutcome === "NO")
    .map((m) => m.id).sort();
  const gotIds = got.rows.map((r) => r.marketId).filter((id) => id.startsWith("wr_fee_")).sort();
  ok("🔴 the market read carries the window (settledFrom/settledTo pushed into the query)",
    boardCalls.some((q) => q.settledFrom === W.start && q.settledTo === W.end), JSON.stringify(boardCalls));
  ok("the fee rows are EXACTLY the legacy JS filter's rows", JSON.stringify(gotIds) === JSON.stringify(legacy.filter((id) => id.startsWith("wr_fee_"))),
    `${gotIds.join(",")} vs ${legacy.join(",")}`);
  ok("…which is start, the round and last — both bounds and both product lines honoured",
    JSON.stringify(gotIds) === JSON.stringify(["wr_fee_last", "wr_fee_round", "wr_fee_start"]), gotIds.join(","));
  /* ⚠️ AND THE STORE READ ITSELF, not only through the fee builder. `settlementFeesByPoll` re-checks
     the bounds in its loop, so an off-by-one in `listBoard` would never move a fee row — and would
     wait, silent, for the next caller that trusts the read. Measured: an inclusive `settledTo`
     survived every assertion above. */
  const direct = (await listMarkets({ status: "RESOLVED", productLine: "ALL", settledFrom: W.start, settledTo: W.end }))
    .map((m) => m.id).filter((id) => id.startsWith("wr_fee_")).sort();
  ok("listBoard's settled range is [from, to) exactly — ON start in, ON end out",
    JSON.stringify(direct) === JSON.stringify(["wr_fee_last", "wr_fee_round", "wr_fee_start"]), direct.join(","));
  void positionStore;
}

console.log("\n── 6 · attribution reads the window's positions and markets, and every figure is unchanged ──");
{
  const { marketStore, positionStore } = await import("../src/lib/server/market-dal.ts");
  const { categoryBreakdown, moneyByGame, loadMoneyAttribution, loadReportWindow } = await import("../src/lib/server/report-money.ts");
  type StoredMarket = import("../src/lib/server/market-service.ts").StoredMarket;
  const T = Date.UTC(2026, 7, 3), W = { start: T, end: T + 5 * DAY };
  const base = { titleSw: "x", titleZh: null, sourceUrl: "https://x.test", resolutionCriterion: "t", resolutionAt: iso(T),
    selectionClosedAt: null, status: "LIVE", yesPool: 0, noPool: 0, predictorCount: 0, feeSnapshot: null, resolvedOutcome: null,
    resolutionStage1By: null, resolutionStage1At: null, resolutionStage2By: null, resolutionStage2At: null,
    objectionsClosedAt: null, settledAt: null, proposedBy: "t", createdAt: iso(T), updatedAt: iso(T) };
  await marketStore.set({ ...base, id: "wr_at_poll", titleEn: "poll", category: "sports", productLine: "MARKET" } as StoredMarket);
  await marketStore.set({ ...base, id: "wr_at_round", titleEn: "round", category: "crypto", productLine: "UPDOWN" } as StoredMarket);
  await marketStore.set({ ...base, id: "wr_at_demo", titleEn: "Demo · poll", category: "macro", productLine: "MARKET" } as StoredMarket);
  await marketStore.set({ ...base, id: "wr_at_elsewhere", titleEn: "elsewhere", category: "politics", productLine: "MARKET" } as StoredMarket);
  const pos = (id: string, marketId: string) => positionStore.set({ id, userId: "usr_wr_player", marketId, side: "YES", stake: 1_000,
    potentialPayout: 0, status: "OPEN", finalPayout: null, placedAt: iso(T), settledAt: null });
  await pos("wr_p_poll", "wr_at_poll"); await pos("wr_p_round", "wr_at_round"); await pos("wr_p_demo", "wr_at_demo");
  await pos("wr_p_elsewhere", "wr_at_elsewhere");
  await put(T + HOUR, "BET_PLACED", -4_000, { positionId: "wr_p_poll" });
  await put(T + 2 * HOUR, "BET_PAYOUT", 1_500, { positionId: "wr_p_poll" });
  await put(T + 3 * HOUR, "BET_PLACED", -7_000, { positionId: "wr_p_round" });
  await put(T + 4 * HOUR, "BET_PLACED", -2_000, { positionId: "wr_p_demo" });
  await put(T - HOUR, "BET_PLACED", -9_000, { positionId: "wr_p_elsewhere" });   // OUTSIDE the window
  await put(T + 5 * HOUR, "BET_PLACED", -3_000, { positionId: "wr_p_missing" }); // a position with no row

  const posCalls: Array<readonly string[] | undefined> = [], mktCalls: Array<readonly string[] | undefined> = [];
  const realPos = positionStore.attribution.bind(positionStore), realMkt = marketStore.attribution.bind(marketStore);
  positionStore.attribution = (async (ids?: readonly string[]) => { posCalls.push(ids); return realPos(ids); }) as typeof positionStore.attribution;
  marketStore.attribution = (async (ids?: readonly string[]) => { mktCalls.push(ids); return realMkt(ids); }) as typeof marketStore.attribution;
  const scopedCtx = await loadReportWindow(W.start, W.end);
  const cbScoped = await categoryBreakdown(W, undefined, scopedCtx);
  const gbScoped = await moneyByGame(W.start, W.end, scopedCtx);
  const cbOwn = await categoryBreakdown(W);               // no snapshot: scoped over its own window
  positionStore.attribution = realPos; marketStore.attribution = realMkt;

  // The reference: the historical WHOLE-TABLE attribution over the same transactions.
  const wholeCtx = { ...scopedCtx, attribution: await loadMoneyAttribution() };
  const cbWhole = await categoryBreakdown(W, undefined, wholeCtx);
  const gbWhole = await moneyByGame(W.start, W.end, wholeCtx);

  ok("🔴 no attribution read of the WHOLE position table on a windowed path", posCalls.length > 0 && posCalls.every((ids) => ids !== undefined),
    `${posCalls.length} call(s): ${posCalls.map((ids) => (ids ? `${ids.length} ids` : "WHOLE TABLE")).join(", ")}`);
  ok("…nor of the whole market table", mktCalls.length > 0 && mktCalls.every((ids) => ids !== undefined),
    mktCalls.map((ids) => (ids ? `${ids.length} ids` : "WHOLE TABLE")).join(", "));
  ok("…and the positions asked for are exactly the ones the window's transactions name",
    JSON.stringify([...(posCalls[0] ?? [])].sort()) === JSON.stringify(["wr_p_demo", "wr_p_missing", "wr_p_poll", "wr_p_round"]),
    JSON.stringify(posCalls[0]));
  ok("categoryBreakdown is IDENTICAL to the whole-table attribution", JSON.stringify(cbScoped) === JSON.stringify(cbWhole),
    `${JSON.stringify(cbScoped)} vs ${JSON.stringify(cbWhole)}`);
  ok("…and so is its no-snapshot path", JSON.stringify(cbOwn) === JSON.stringify(cbWhole));
  /* ⚠️ A SNAPSHOT OF ANOTHER WINDOW MUST BE REFUSED. The snapshot's attribution now covers only ITS
     window's positions, so reusing it for a different window would silently drop this window's
     money from the breakdown. The consumers must fall back to their own scoped load. */
  const otherCtx = await loadReportWindow(W.end + DAY, W.end + 2 * DAY);   // a window with none of these positions
  ok("a snapshot of a DIFFERENT window is not trusted for attribution — categoryBreakdown",
    JSON.stringify(await categoryBreakdown(W, undefined, otherCtx)) === JSON.stringify(cbWhole));
  ok("…nor for moneyByGame", JSON.stringify(await moneyByGame(W.start, W.end, otherCtx)) === JSON.stringify(gbWhole));
  ok("moneyByGame is IDENTICAL to the whole-table attribution", JSON.stringify(gbScoped) === JSON.stringify(gbWhole),
    `${JSON.stringify(gbScoped)} vs ${JSON.stringify(gbWhole)}`);
  ok("CONTROL · the fixture exercises both games, a demo row and an unmatched position",
    gbWhole.market.stakes > 0 && gbWhole.updown.stakes > 0 && gbWhole.unattributed.stakes > 0
      && cbWhole.some((c) => c.category === "sports") && !cbWhole.some((c) => c.category === "macro"),
    JSON.stringify(gbWhole));
}

console.log("\n── 7 · a malformed pack period is refused, not turned into NaN bounds ──");
{
  const refuses = (p: string) => { try { packPeriodBounds(p); return false; } catch { return true; } };
  ok("\"2026-06\" resolves", !refuses("2026-06"));
  ok("\"2026-13\", \"2026-6\", \"abc\" and \"\" are each refused",
    ["2026-13", "2026-6", "abc", ""].every(refuses), ["2026-13", "2026-6", "abc", ""].map((p) => `${JSON.stringify(p)}:${refuses(p)}`).join(" "));
}

{
  // A source cross-check, kept deliberately small: the behavioural §3 is the guard, this only makes
  // sure the header of this file is not describing a builder list that has moved on.
  const src = readFileSync(new URL("../src/lib/server/reports/catalogue.ts", import.meta.url), "utf8");
  ok("CONTROL · the catalogue still has the three builders this suite drives by name",
    ["buildDailyOps", "buildFiuSar", "buildMatchIntegrity"].every((f) => src.includes(`export async function ${f}(`)));
}

for (const k of Object.keys(real)) txn[k] = real[k];
console.log(`\nreport-window-reads: ${pass} passed, ${fail} failed`);
process.exitCode = fail === 0 ? 0 : 1;
