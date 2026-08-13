/**
 * test:landing-contract — the landing composition's own invariants, proven with no database and
 * no browser (same contract as `hero.ts` / `discovery.ts`: pure, no server imports).
 *
 * Two things this module exists to make structurally true, not merely usually true:
 *
 * 1. THE GRID IS DISJOINT FROM THE HERO. Batch 2's re-validation pass found the hero's four
 *    questions were ALSO the first four cards of "Pick a side now" — the same markets twice
 *    within two screens, invisible to every gate at the time. `landingGrid` takes the hero's own
 *    drawn ids and subtracts them from the set it orders, so the repeat is impossible by
 *    construction rather than by remembering to offset a slice.
 * 2. THE TOPIC TILES RECONCILE TO THE HERO. The kit: per-topic counts and pools "must reconcile
 *    to the header or the page contradicts itself." `landingTopicsReconcile` is the assertion —
 *    both figures are folds over the SAME open set, so they agree by construction, and this test
 *    is what turns that from an argument into a proof.
 *
 * Run: npm run test:landing-contract     RED proof: npm run red:landing-contract
 */
import {
  gridLensFor, landingGrid, landingTopics, landingComposition, landingTopicsReconcile,
  LANDING_GRID_SIZE,
} from "../src/lib/markets/landing.ts";
import { pricedYesPct } from "../src/lib/markets/discovery.ts";
import type { HeroRow } from "../src/lib/markets/hero.ts";

let pass = 0;
const fails: string[] = [];
function ok(cond: boolean, label: string, detail = "") {
  if (cond) { pass++; return; }
  fails.push(`${label}${detail ? ` — ${detail}` : ""}`);
}
function eq(actual: unknown, expected: unknown, label: string) {
  ok(JSON.stringify(actual) === JSON.stringify(expected), label, `got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);
}

const T0 = Date.parse("2026-08-13T09:00:00.000Z");
const row = (over: Partial<HeroRow> & { id: string }): HeroRow => ({
  category: "sports",
  pool: 0,
  predictors: 0,
  yesPct: null,
  move24h: undefined,
  createdAtMs: T0,
  bettableUntilMs: T0 + 3600_000,
  selectionClosed: false,
  status: "LIVE",
  watched: false,
  titleEn: `Q ${over.id}`,
  titleSw: `Q ${over.id}`,
  titleZh: null,
  yesPool: 0,
  noPool: 0,
  sourceUrl: "https://example.tz",
  ...over,
});

/* ══════════════ 1 · THE LENS ══════════════ */
{
  eq(gridLensFor(0), "new", "1.1 a cold book (Σ pool 0) uses the honest lens");
  eq(gridLensFor(-1), "new", "1.2 a negative sum (should never happen) still falls to the safe lens");
  eq(gridLensFor(1), "pool", "1.3 any real money on the book uses the pool lens");
  eq(gridLensFor(1_000_000), "pool", "1.4-control a large pool also uses the pool lens");
}

/* ══════════════ 2 · THE GRID IS DISJOINT FROM THE HERO, BY CONSTRUCTION ══════════════ */
{
  const rows = Array.from({ length: 8 }, (_, i) =>
    row({ id: `m${i}`, yesPool: (8 - i) * 1000, noPool: (8 - i) * 1000, bettableUntilMs: T0 + i * 60_000 }));
  const heroIds = ["m0", "m1"]; // the hero's featured + board, by id
  const grid = landingGrid(rows, T0, { lens: "pool", excludeIds: heroIds });
  ok(!grid.some((r) => heroIds.includes(r.id)), "2.1 the grid contains NONE of the hero's ids", JSON.stringify(grid.map((r) => r.id)));
  // ⭐ POSITIVE CONTROL — 2.1 passes trivially on an empty grid. Prove real rows ARE returned.
  ok(grid.length > 0, "2.1-control the grid is not empty", `length=${grid.length}`);
  eq(grid.length, Math.min(LANDING_GRID_SIZE, rows.length - heroIds.length), "2.2 the grid is capped at LANDING_GRID_SIZE");

  // The specific regression: if exclusion were a no-op, m0/m1 (the biggest pools) would lead.
  const withoutExclusion = landingGrid(rows, T0, { lens: "pool", excludeIds: [] });
  ok(withoutExclusion[0].id === "m0", "2.3-control without exclusion the biggest pool DOES lead (proves exclusion is doing the work)");
  ok(grid[0].id !== "m0", "2.4 with exclusion the grid's own lead is not the hero's lead");

  // A closed-by-status or selection-closed row is not "open" and must not appear either.
  const withResolved = [...rows, row({ id: "resolved", status: "RESOLVED", yesPool: 999_999, noPool: 0 })];
  const gridR = landingGrid(withResolved, T0, { lens: "pool", excludeIds: [] });
  ok(!gridR.some((r) => r.id === "resolved"), "2.5 a RESOLVED row never appears in the grid");
}

/* ══════════════ 3 · TOPICS FOLD OVER THE SAME OPEN SET, AND RECONCILE ══════════════ */
{
  const rows: HeroRow[] = [
    row({ id: "s1", category: "sports", yesPool: 3000, noPool: 1000 }),
    row({ id: "s2", category: "sports", yesPool: 0, noPool: 0 }),
    row({ id: "w1", category: "weather", yesPool: 500, noPool: 500 }),
    row({ id: "closed", category: "sports", status: "CLOSED", yesPool: 999_999, noPool: 0 }),
  ];
  const { topics, uncategorised, uncategorisedPoolTzs } = landingTopics(rows, T0, ["sports", "weather", "macro"]);
  const sports = topics.find((t) => t.id === "sports")!;
  const weather = topics.find((t) => t.id === "weather")!;

  eq(sports?.count, 2, "3.1 sports counts s1 + s2, not the CLOSED row");
  eq(sports?.poolTzs, 4000, "3.2 sports pool is s1+s2 only (3000+1000+0)");
  eq(sports?.leanYesPct, pricedYesPct(3000, 1000), "3.3 sports lean is the SUMMED pool ratio, not an average of two rows' percentages");
  eq(weather?.leanYesPct, 50, "3.4-control weather (500/500) reads a real 50, not null");
  eq(topics.find((t) => t.id === "macro"), undefined, "3.5 a category with zero open markets is not listed at all");
  eq(uncategorised, 0, "3.6 nothing falls outside the known categories in this fixture");
  eq(uncategorisedPoolTzs, 0, "3.6b-control tracked in lockstep with the count");

  // ⛔ THE COLD TOPIC RENDERS NO LEAN — the tile-level cold-start gate.
  const { topics: t2 } = landingTopics(
    [row({ id: "c1", category: "culture", yesPool: 0, noPool: 0 })], T0, ["culture"],
  );
  eq(t2[0].leanYesPct, null, "3.7 a topic with pool 0 gets leanYesPct=null, never a guessed 50");

  // RECONCILIATION — the property `landingComposition` exists to make true by construction.
  const comp = landingComposition(rows, T0, { openPoolTzs: 5000, heroIds: [], categories: ["sports", "weather", "macro"] });
  const openCount = rows.filter((r) => r.status === "LIVE").length; // s1, s2, w1 = 3 (closed excluded)
  // s1(4000)+s2(0)+w1(1000) = 5000 -- the SAME rows the hero itself would sum.
  const rec = landingTopicsReconcile(comp, { openCount, poolTzs: 5000 });
  ok(rec.ok, "3.8 the tiles reconcile to the hero's own openCount + poolTzs", JSON.stringify(rec));

  // ⭐ POSITIVE CONTROL — reconciliation must be able to FAIL, or 3.8 proves nothing.
  const brokenRec = landingTopicsReconcile(comp, { openCount: openCount + 1, poolTzs: 5000 });
  ok(!brokenRec.ok && brokenRec.countDelta === -1, "3.8-control reconciliation DOES fail on a real mismatch", JSON.stringify(brokenRec));

  // An uncategorised market is counted on BOTH sides, not silently excused from either.
  const withStray: HeroRow[] = [...rows.slice(0, 3), row({ id: "stray", category: "politics", yesPool: 700, noPool: 300 })];
  const compStray = landingComposition(withStray, T0, { openPoolTzs: 6000, heroIds: [], categories: ["sports", "weather", "macro"] });
  eq(compStray.uncategorised, 1, "3.9 a category outside MARKET_CATEGORIES is counted as uncategorised");
  eq(compStray.uncategorisedPoolTzs, 1000, "3.10 and its pool is tracked, not dropped");
  // s1(4000)+s2(0)+w1(1000)+stray(1000) = 6000
  const recStray = landingTopicsReconcile(compStray, { openCount: 4, poolTzs: 6000 });
  ok(recStray.ok, "3.11 reconciliation still holds WITH an uncategorised market present", JSON.stringify(recStray));
}

console.log(`landing-contract: ${pass} assertions passed`);
if (fails.length) {
  console.error(`\n${fails.length} FAILED:`);
  fails.forEach((f) => console.error("  ✗ " + f));
  process.exit(1);
}
console.log("all green");
