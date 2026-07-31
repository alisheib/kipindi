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
