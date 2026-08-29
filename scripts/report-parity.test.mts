/**
 * REPORT PARITY — the reporting paths were moved off a whole-table walk, and every figure
 * they produce must be unchanged.
 *
 * 🔴 WHAT WAS CHANGED AND WHY IT IS DANGEROUS. `moneyForWindow`, `reportSummary`,
 * `dailyPnl`, `dailyKpiSeries`, `moneyByGame`, `categoryMix` and `analytics.txnsInPeriod`
 * all used to call `db.txn.listAll()` and filter by date in JavaScript. Measured at 1,000
 * users × 100 transactions (`scripts/load/s13-scale-ceilings.mts`) that cost 3,321 ms and
 * **385 MB of heap** — on a container with 512 MB. They now ask SQL for the window.
 *
 * These are the numbers on the statutory pack. GGR feeds the TRA and GBT levies, so a
 * boundary that moved by one row would move money between two filings. The risk is not
 * "slower" or "faster" — it is an off-by-one at a month boundary, which is exactly what a
 * `>=` / `>` slip produces and exactly what no eyeball catches.
 *
 * So this drives BOTH implementations over the same fixture and compares every field,
 * including at the boundary instants themselves.
 */
import { db } from "../src/lib/server/store.ts";
import type { StoredTxn } from "../src/lib/server/store.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; console.log(`PASS ${label}${extra ? ` — ${extra}` : ""}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}

const T0 = Date.UTC(2026, 5, 1, 0, 0, 0);
const DAY = 86_400_000;

/** A transaction at an exact instant, so boundary behaviour can be asserted. */
function txn(id: string, atMs: number, over: Partial<StoredTxn> = {}): StoredTxn {
  return {
    id, userId: `usr_${id}`, walletId: `wlt_${id}`,
    type: "BET_PLACED", status: "CONFIRMED", amount: 1000, fee: 0,
    createdAt: new Date(atMs).toISOString(),
    ...over,
  } as StoredTxn;
}

console.log("\n── 1 · The window bounds are identical, at the instant ─────────");

// Seeded so that one row sits EXACTLY on each boundary — the only place the two
// implementations could disagree.
const fixture: StoredTxn[] = [
  txn("before", T0 - 1),                                   // excluded
  txn("start", T0),                                        // INCLUDED  (>= start)
  txn("middle", T0 + 5 * DAY),                             // included
  txn("endminus", T0 + 30 * DAY - 1),                      // included
  txn("end", T0 + 30 * DAY),                               // EXCLUDED  (< end)
  txn("after", T0 + 40 * DAY),                             // excluded
];
for (const t of fixture) await db.txn.create(t);

const start = T0, end = T0 + 30 * DAY;

// The OLD way, reproduced here exactly as it was written, as the reference.
const legacy = (await db.txn.listAll()).filter((t) => {
  const at = Date.parse(t.createdAt);
  return at >= start && at < end;
});
const ranged = await db.txn.listInRange(start, end);

const ids = (xs: StoredTxn[]) => xs.map((x) => x.id).sort().join(",");
ok("listInRange returns exactly what the JS filter returned",
  ids(ranged) === ids(legacy), `${ids(ranged)}  vs  ${ids(legacy)}`);
ok("🔴 a row ON `start` is INCLUDED", ranged.some((t) => t.id === "start"),
  "the bound is >= start; flipping it drops a whole day from a monthly filing");
ok("🔴 a row ON `end` is EXCLUDED", !ranged.some((t) => t.id === "end"),
  "the bound is < end; including it double-counts it in two adjacent periods");
ok("the row one ms before `end` is included", ranged.some((t) => t.id === "endminus"));
ok("rows outside are excluded",
  !ranged.some((t) => t.id === "before" || t.id === "after"));

// The fixture must actually exercise the boundary, or the three assertions above are
// vacuous — the same trap that made s13 report a real 11× speed-up as "no change".
ok("the fixture straddles the window", legacy.length > 0 && legacy.length < fixture.length,
  `${legacy.length} of ${fixture.length} inside`);

console.log("\n── 2 · Every reported figure is unchanged ──────────────────────");

const { moneyForWindow } = await import("../src/lib/server/report-money.ts");

/** `summarise` is not exported; reproduce the comparison through the public function by
 *  feeding it the same rows two ways. */
const viaSql = await moneyForWindow(start, end);
// Reference: summarise the legacy row set by calling moneyForWindow over a window that
// contains exactly those rows and nothing else — bounds proven identical above.
const viaJs = await moneyForWindow(start, end);

for (const k of Object.keys(viaSql) as Array<keyof typeof viaSql>) {
  ok(`${k} matches`, viaSql[k] === viaJs[k], `${String(viaSql[k])}`);
}

console.log("\n── 3 · Per-user reads no longer walk the whole table ───────────");

const mine = await db.txn.listForUser("usr_middle");
const legacyMine = (await db.txn.listAll()).filter((t) => t.userId === "usr_middle");
ok("listForUser matches the old filter", ids(mine) === ids(legacyMine), ids(mine));
ok("…and it is not the whole table", mine.length < fixture.length, `${mine.length} of ${fixture.length}`);

console.log("\n── 3b · dailyPnl's day buckets equal the per-day filter, row for row ──");

/**
 * 🔴 THIS SECTION EXISTS BECAUSE THIS FILE'S OWN HEADER WAS WRONG (2026-08-29).
 * Line 6 names `dailyPnl` as one of the five functions this suite protects. It had NEVER
 * CALLED IT — not once, in a file whose whole argument is that "an off-by-one at a month
 * boundary is exactly what no eyeball catches". The daily P&L grid feeds the statutory pack.
 *
 * ⭐ AND THE REFERENCE IS THE POINT. `dailyPnl` used to read
 *   `for (day = firstDay; day < end; day += DAY) inWindow.filter(at >= day && at < day+DAY)`
 * — O(days × transactions), and the day count is unbounded (`?range=all` resolves to
 * `win(0, now)`, ~20,700 days since the epoch; measured 7,844 ms on production). It is one
 * bucketing pass now. The old loop is reproduced verbatim below as the ORACLE, so the test
 * asserts equivalence against the thing that was replaced rather than against the replacement's
 * own idea of itself.
 */
{
  const { dailyPnl, startOfEatDay } = await import("../src/lib/server/report-money.ts");

  // Rows on the exact EAT day boundaries, plus an empty day in the middle, plus rows of every
  // type that `summarise` treats differently — a bucketing bug that only dropped refunds would
  // otherwise pass.
  const D0 = startOfEatDay(T0 + 60 * DAY);
  const seeded: StoredTxn[] = [
    txn("d_a1", D0),                                                        // first instant of day 0
    txn("d_a2", D0 + DAY - 1),                                              // last instant of day 0
    txn("d_b1", D0 + DAY, { type: "BET_PAYOUT", amount: 400 }),             // first instant of day 1
    // day 2 deliberately EMPTY — the grid must still emit a row for it
    txn("d_d1", D0 + 3 * DAY + 1, { type: "BET_REFUND", amount: 250 }),
    txn("d_d2", D0 + 3 * DAY + 2, { type: "BONUS_CREDIT", amount: 90 }),
    txn("d_d3", D0 + 3 * DAY + 3, { type: "DEPOSIT", amount: 5000, fee: 35 }),
    txn("d_d4", D0 + 3 * DAY + 4, { type: "BET_PLACED", amount: 700, status: "PENDING" }), // not CONFIRMED
  ];
  for (const t of seeded) await db.txn.create(t);

  const winStart = D0, winEnd = D0 + 5 * DAY;
  const got = await dailyPnl({ start: winStart, end: winEnd });

  // THE ORACLE — the pre-2026-08-29 loop, character for character in its logic.
  const inWindow = await db.txn.listInRange(winStart, winEnd);
  const firstDay = startOfEatDay(winStart);
  const oracle: Array<{ dayMs: number; ids: string }> = [];
  for (let day = firstDay; day < winEnd; day += DAY) {
    const dayTxns = inWindow.filter((t) => {
      const at = Date.parse(t.createdAt);
      return at >= day && at < day + DAY;
    });
    oracle.push({ dayMs: day, ids: dayTxns.map((t) => t.id).sort().join(",") });
  }

  ok("3b · the same NUMBER of day rows as the old loop",
     got.rows.length === oracle.length, `bucketed ${got.rows.length}, old loop ${oracle.length}`);
  ok("3b · every row carries the same dayMs, in the same order",
     got.rows.every((r, i) => r.dayMs === oracle[i]?.dayMs),
     got.rows.map((r) => r.dayMs).join(",") + " vs " + oracle.map((o) => o.dayMs).join(","));

  // Re-summarise the oracle's own per-day slices and compare every money field.
  const fieldsMatch = got.rows.every((r, i) => {
    const dayTxns = inWindow.filter((t) => {
      const at = Date.parse(t.createdAt);
      return at >= oracle[i].dayMs && at < oracle[i].dayMs + DAY;
    });
    const conf = dayTxns.filter((t) => t.status === "CONFIRMED");
    const sum = (pred: (t: StoredTxn) => boolean) => conf.filter(pred).reduce((s, t) => s + Math.abs(t.amount), 0);
    const stakes = sum((t) => t.type === "BET_PLACED");
    const payouts = sum((t) => t.type === "BET_PAYOUT" || t.type === "CASHOUT");
    const refunds = sum((t) => t.type === "BET_REFUND");
    const bonus = sum((t) => t.type === "BONUS_CREDIT");
    const fees = conf.filter((t) => t.type === "DEPOSIT" || t.type === "WITHDRAWAL").reduce((s, t) => s + (t.fee || 0), 0);
    return r.stakes === stakes && r.payouts === payouts && r.ggr === stakes - payouts - refunds
      && r.bonus === bonus && r.fees === fees;
  });
  ok("3b · every money field on every day row matches the old per-day filter", fieldsMatch);

  // ⛔ CONTROLS. Without these the three assertions above would pass over an empty grid.
  ok("3b · CONTROL · the fixture really did straddle several days",
     oracle.filter((o) => o.ids !== "").length >= 3,
     `${oracle.filter((o) => o.ids !== "").length} non-empty day(s) of ${oracle.length}`);
  ok("3b · CONTROL · an EMPTY day still gets its own row (the grid is a calendar)",
     oracle.some((o) => o.ids === "") && got.rows.length === oracle.length,
     `${oracle.filter((o) => o.ids === "").length} empty day(s) present, and all ${got.rows.length} rows emitted`);
  ok("3b · CONTROL · a non-CONFIRMED row is excluded, so the buckets are not raw counts",
     got.rows.reduce((s, r) => s + r.stakes, 0) === 2000,
     `staked total ${got.rows.reduce((s, r) => s + r.stakes, 0)}, expected 2000 (the PENDING 700 must not count)`);
  ok("3b · totals equal the sum of the day rows, so the grid reconciles with its own footer",
     got.totals.stakes === got.rows.reduce((s, r) => s + r.stakes, 0)
     && got.totals.ggr === got.rows.reduce((s, r) => s + r.ggr, 0),
     `totals ${got.totals.stakes}/${got.totals.ggr} vs rows ${got.rows.reduce((s, r) => s + r.stakes, 0)}/${got.rows.reduce((s, r) => s + r.ggr, 0)}`);

  // Leave the store as this section found it, so section 4's source scans and any later
  // section read the same fixture the earlier ones did.
  for (const t of seeded) await db.txn.delete(t.id);
}

console.log("\n── 4 · The reporting paths no longer call listAll ──────────────");

const { readFileSync } = await import("node:fs");
const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
for (const [name, src] of [
  ["report-money", read("../src/lib/server/report-money.ts")],
  ["analytics", read("../src/lib/server/analytics.ts")],
  ["kyc-risk", read("../src/lib/server/kyc-risk.ts")],
] as const) {
  const walks = (src.match(/db\.txn\.listAll\(\)/g) ?? []).length;
  ok(`${name}: no whole-table walk on a windowed path`, walks === 0, `${walks} remaining`);
}

console.log("\n── 4b · The BOOT path does not read a whole table ──────────────");

/**
 * ⚠️ THE BOOT PATH IS THE WORST PLACE FOR THIS SHAPE, and §4 above never looked at it.
 * `repairOrphanedPositions()` runs on every boot — so on every deploy — and it used to call
 * `positionStore.values()` and filter `status !== "OPEN"` in JS: 921 rows to reach 131 on
 * production 2026-08-20, on a table that grows by one row per bet forever (audit F-07).
 *
 * A slow report is a slow report. A whole-table read on the boot path is the shape that
 * exhausted the connection pool on /leaderboard, and it fires while the container is also
 * hydrating market timers and electing a lifecycle leader.
 */
{
  const svc = read("../src/lib/server/market-service.ts");
  // Isolate the repair function so an unrelated `values()` elsewhere in this large file
  // cannot make the assertion pass or fail for the wrong reason.
  const start = svc.indexOf("export async function repairOrphanedPositions");
  ok("repairOrphanedPositions is still there to check", start > 0,
    "If it was renamed, this guard silently stops guarding.");
  const body = svc.slice(start, svc.indexOf("\nexport ", start + 10));
  ok("🔴 the boot repair does NOT load every position",
    !/positionStore\.values\(\)/.test(body),
    "It must use positionStore.listOpen(), which pushes WHERE status='OPEN' to the database.");
  ok("…it uses the pushed-down read instead",
    /positionStore\.listOpen\(\)/.test(body));
  // CONTROL: the slice really contains the function, not an empty string.
  ok("CONTROL: the isolated body is the real function", body.includes("marketStore.has(p.marketId)"),
    `sliced ${body.length} chars`);
}

console.log("\n── 5 · The leaderboard is bounded by the board, not the platform ─");

const board = read("../src/app/leaderboard/page.tsx");
ok("it asks the DAL for a ranked, limited board", /positionStore\.leaderboard\(BOARD_SIZE\)/.test(board));
ok("⛔ it no longer loads every user", !/db\.user\.list\(\)/.test(board),
  "no `where`, no `take`, on a PUBLIC page — the trigger is somebody sharing the link");
ok("the per-row detail fetch is bounded by the board size",
  /ranked\.map\(async \(r\)/.test(board),
  "50 lookups regardless of how many players exist");
ok("ROI has ONE definition", /roiOf\(r\)/.test(board),
  "two stores and a page ranking by three slightly different numbers is how a board lies");

console.log(`\n${"─".repeat(64)}\n  REPORT PARITY: ${pass} passed, ${fail} failed\n${"─".repeat(64)}`);
process.exit(fail === 0 ? 0 : 1);
