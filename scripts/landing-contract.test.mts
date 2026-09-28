/**
 * test:landing-contract — the landing composition's own invariants, proven with no database and
 * no browser (same contract as `hero.ts` / `discovery.ts`: pure, no server imports).
 *
 * Two things this module exists to make structurally true, not merely usually true:
 *
 * 1. THE BOARD'S ORDERING IS A RULE, NOT A SORT. A market with no price, or with one side of its
 *    pool empty, is a different kind of thing to lead a page with, so quality is a PARTITION applied
 *    before position — and within each tier the reader's chosen lens still decides. `boardOrdering`
 *    is that rule and `boardMoneyLens` decides which money lens a book can honestly offer.
 * 2. THE TOPIC TILES RECONCILE TO THE HERO. The kit: per-topic counts and pools "must reconcile
 *    to the header or the page contradicts itself." `landingTopicsReconcile` is the assertion —
 *    both figures are folds over the SAME open set, so they agree by construction, and this test
 *    is what turns that from an argument into a proof.
 *
 * ⚠️ WP9 · WHERE §1 AND §4'S SUBJECTS LIVE NOW, AND WHY §2 IS GONE (2026-09-28, ruling R15/R16).
 * `gridLensFor` and `landingGrid` were this file's own; the landing grid they served is deleted, and
 * the rule moved to `hero.ts` as `boardMoneyLens` and `boardOrdering` — ONE home, because the board's
 * toggle switches between orderings and must never switch between implementations. §1 and §4 follow
 * it there and keep every property they asserted.
 * ⛔ §2 ("THE GRID IS DISJOINT FROM THE HERO") IS RETIRED, NOT DROPPED. Batch 2's defect — the hero's
 * questions were also the first cards of the grid below, the same markets twice within two screens,
 * invisible to every gate at the time — cannot recur on a page with ONE list. What survives of it is
 * the board excluding the featured card by id, and that is asserted where the board is built:
 * `scripts/hero-contract.test.mts` §5 "⛔ the featured market is NEVER also a board row", with its own
 * red control in `scripts/anchors/hero-contract.anchors.mjs`. Two harnesses asserting one rule is how
 * one of them rots unnoticed.
 *
 * Run: npm run test:landing-contract     RED proof: npm run red:landing-contract
 */
import { landingTopics, landingComposition, landingTopicsReconcile } from "../src/lib/markets/landing.ts";
import { boardMoneyLens, boardOrdering, heroFigures } from "../src/lib/markets/hero.ts";
import { pricedYesPct } from "../src/lib/markets/discovery.ts";
import type { HeroRow } from "../src/lib/markets/hero.ts";
import { shownYesPct } from "../src/lib/markets/price-state.ts";

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
  // ⚠️ Derived AFTER the spread (WP6, 2026-09-27), as `hero-contract`'s fixture does: `pool` and
  // `yesPct` used to stay 0/null whatever the pools said, so the "pool" lens sorted on all zeros.
  // `yesPct` is the printable price, as `app/page.tsx` builds the real rows (`shownYesPct`).
  pool: (over.yesPool ?? 0) + (over.noPool ?? 0),
  yesPct: shownYesPct(over.yesPool ?? 0, over.noPool ?? 0),
});

/* ══════════════ 1 · THE MONEY LENS ══════════════
   ⚠️ `boardMoneyLens` in `hero.ts` since WP9 — `gridLensFor` in this file until 2026-09-28. Same rule,
   same reasoning, new home: the surface it decides for is the board's toggle. */
{
  eq(boardMoneyLens(0), "new", "1.1 a cold book (Σ pool 0) uses the honest lens");
  eq(boardMoneyLens(-1), "new", "1.2 a negative sum (should never happen) still falls to the safe lens");
  eq(boardMoneyLens(1), "pool", "1.3 any real money on the book uses the pool lens");
  eq(boardMoneyLens(1_000_000), "pool", "1.4-control a large pool also uses the pool lens");
}

/* ══════════════ 2 · A LENS OFF THE URL IS NARROWED, NEVER TRUSTED (WP9 · R16) ══════════════
   The board's ordering arrives as `?sort=`. ⛔ `?sort=pool` on a COLD book would head the list with a
   superlative about zeros while the rail drew "Just opened" and "Closing soonest", neither of them
   marked current — a rail that cannot say which order the list is in. `heroFigures` therefore narrows
   the requested lens against `boardLenses`, and what it actually ran is published as `figures.lens`,
   which is the one variable the rail's pills and the section's "see all" link both read.
   ⚠️ THIS SECTION REPLACED §2's "the grid is disjoint from the hero" — see the header for where that
   rule is asserted now. */
{
  const cold = Array.from({ length: 9 }, (_, i) =>
    row({ id: `c${i}`, yesPool: 0, noPool: 0, bettableUntilMs: T0 + (9 - i) * 60_000 }));
  // 🔴 THE FIRST VERSION OF THIS FIXTURE WAS THE ONE SHAPE THAT COULD NOT FAIL, and 2.6 caught it.
  // Every row was 10k/10k — a dead-even 50% — so the closing lens's `close` sort (distance from even)
  // tied on all nine, fell through to input order, and input order WAS pool order. Both lenses
  // returned the same list and "the two lenses order the board differently" failed for the right
  // reason. ⭐ So the two keys are now deliberately ANTI-CORRELATED: the biggest pool is the FARTHEST
  // from even and the smallest is exactly even, which makes the pool ordering the exact reverse of the
  // closing one. A fixture where the two agree proves nothing about either.
  const funded = [90, 85, 80, 75, 70, 65, 60, 55, 50].map((pct, i) => {
    const pool = (9 - i) * 2000;
    return row({
      id: `f${i}`,
      yesPool: (pool * pct) / 100,
      noPool: (pool * (100 - pct)) / 100,
      bettableUntilMs: T0 + (i + 1) * 60_000,
    });
  });

  eq(heroFigures(funded, T0, "pool").lens, "pool", "2.1 a funded book honours the pool lens it was asked for");
  eq(heroFigures(cold, T0, "pool").lens, "closing", "2.2 a COLD book refuses the pool lens and states the default instead");
  eq(heroFigures(cold, T0, "new").lens, "new", "2.3 a cold book DOES honour its own honest lens");
  eq(heroFigures(funded, T0, "new").lens, "closing", "2.4 a funded book refuses `new`, the lens it does not offer");
  eq(heroFigures(funded, T0).lens, "closing", "2.5 the default is the closing lens");
  // ⭐ POSITIVE CONTROL — every assertion above would pass if `lens` were hard-wired to "closing".
  ok(heroFigures(funded, T0, "pool").lens !== heroFigures(funded, T0).lens,
    "2.1-control the two lenses are actually different values, so 2.2 and 2.4 are not vacuous");
  // ⭐ AND THE ORDERING MUST FOLLOW THE LENS, not merely the label. The biggest pool closes LAST here,
  // so a pool ordering and a closing ordering cannot agree by accident.
  const byPool = heroFigures(funded, T0, "pool").board.map((r) => r.id);
  const byClose = heroFigures(funded, T0).board.map((r) => r.id);
  ok(JSON.stringify(byPool) !== JSON.stringify(byClose),
    "2.6 the two lenses order the board differently", `${byPool.join(",")} vs ${byClose.join(",")}`);
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
  const comp = landingComposition(rows, T0, { categories: ["sports", "weather", "macro"] });
  const openCount = rows.filter((r) => r.status === "LIVE").length; // s1, s2, w1 = 3 (closed excluded)
  // s1(4000)+s2(0)+w1(1000) = 5000 -- the SAME rows the hero itself would sum.
  const rec = landingTopicsReconcile(comp, { openCount, poolTzs: 5000 });
  ok(rec.ok, "3.8 the tiles reconcile to the hero's own openCount + poolTzs", JSON.stringify(rec));

  // ⭐ POSITIVE CONTROL — reconciliation must be able to FAIL, or 3.8 proves nothing.
  const brokenRec = landingTopicsReconcile(comp, { openCount: openCount + 1, poolTzs: 5000 });
  ok(!brokenRec.ok && brokenRec.countDelta === -1, "3.8-control reconciliation DOES fail on a real mismatch", JSON.stringify(brokenRec));

  // An uncategorised market is counted on BOTH sides, not silently excused from either.
  const withStray: HeroRow[] = [...rows.slice(0, 3), row({ id: "stray", category: "politics", yesPool: 700, noPool: 300 })];
  const compStray = landingComposition(withStray, T0, { categories: ["sports", "weather", "macro"] });
  eq(compStray.uncategorised, 1, "3.9 a category outside MARKET_CATEGORIES is counted as uncategorised");
  eq(compStray.uncategorisedPoolTzs, 1000, "3.10 and its pool is tracked, not dropped");
  // s1(4000)+s2(0)+w1(1000)+stray(1000) = 6000
  const recStray = landingTopicsReconcile(compStray, { openCount: 4, poolTzs: 6000 });
  ok(recStray.ok, "3.11 reconciliation still holds WITH an uncategorised market present", JSON.stringify(recStray));
}

/* ══════════════ 4 · THE BOARD'S PRICE FLOOR (landing v3 WP6, moved by WP9) ══════════════
   Production led "Pick a side now" with two ONE-SIDED cards reading "YES 100%" — the biggest pools on
   the book were the ones with money on one side only. Quality is a PARTITION applied before position,
   and within each tier the reader's own lens decides.

   ⭐ R16 · THE DISPLAY RULE CHANGED WITH THE MERGE, AND THIS IS WHERE IT IS PINNED. `landingGrid`
   seated by tier and then DISPLAYED in pure lens order, so a one-sided TZS 90,000 card — once seated —
   sat FIRST, where its pool put it. R15 restated that as "picks by price tier and displays by lens".
   ⛔ That was the weaker half of a compromise for a THREE-CARD SAMPLE, and it does not survive the
   merge. The board is the page's ONE list and the first market list a visitor reads; `hero.ts`'s own
   floor comment says why position is the thing that matters — "a market nobody can disagree about is
   the worst possible advertisement for a prediction market, and it held the loudest position on the
   site". Displaying by lens across tiers hands position 1 back to exactly that row on a thin day. So
   the tiers are CONCATENATED: every priced market first, in the lens's order, then the one-sided ones,
   then the unpriced — each row labelling its own state ("One side only", "No bets yet") so a reader
   can see why it sits after a smaller pool. R15's "displays by lens" clause is struck in the manifest. */
{
  const big1  = row({ id: "big1", yesPool: 90_000, noPool: 0 });        // one-sided, the biggest pool
  const empty = row({ id: "empty", yesPool: 0, noPool: 0 });            // nothing staked
  const lop   = row({ id: "lop", yesPool: 25_000, noPool: 100 });       // two-sided, rounds to 100
  const c1    = row({ id: "c1", yesPool: 3_000, noPool: 2_000 });
  const c2    = row({ id: "c2", yesPool: 1_000, noPool: 1_000 });
  const rows = [empty, c2, big1, c1, lop];
  const ordered = boardOrdering(rows, T0, "pool");
  eq(ordered.slice(0, 3).map((r) => r.id), ["lop", "c1", "c2"],
    "4.1 the first three places go to the priced markets — a one-sided pool never outranks a priced one");
  ok(ordered.some((r) => r.id === "lop"), "4.2 a lopsided but TWO-SIDED market (25,000 vs 100) is priced, not demoted with the one-sided ones");
  // ⭐ CONTROL — the plain lens WOULD have led with the one-sided card, so 4.1 is the floor at work.
  ok(big1.pool > lop.pool && big1.pool > c1.pool && pricedYesPct(lop.yesPool, lop.noPool) === 100,
    "4.1-control big1 has the biggest pool (the lens alone leads with it) and lop's rounded share IS 100",
    `big1=${big1.pool} lop=${lop.pool}/${lop.yesPct}%`);
  // ⛔ A PARTITION, NEVER A FILTER: every open row is returned, so the board is never SHORT.
  eq(ordered.length, 5, "4.3 the board is never short — one-sided and empty markets still take the places left over");
  eq(ordered.map((r) => r.id), ["lop", "c1", "c2", "big1", "empty"],
    "4.4 the tiers are concatenated: priced (in pool order) → one-sided → unpriced");
  // ⭐ AND WITHIN A TIER THE LENS IS STILL THE LENS — the half of the old 4.4 that survives. Ordered
  // by `new` instead, the three priced rows come back in a DIFFERENT order, so 4.4 is not just the
  // tier partition restated.
  const byNew = boardOrdering(rows, T0, "new").map((r) => r.id);
  ok(JSON.stringify(byNew.slice(0, 3)) !== JSON.stringify(["lop", "c1", "c2"])
    || JSON.stringify(byNew) !== JSON.stringify(ordered.map((r) => r.id)),
    "4.5 a different lens reorders WITHIN the tiers", byNew.join(","));
  // A closed-by-status or selection-closed row is not "open" — `heroFigures` filters that before it
  // calls this, so the guard belongs where the filter is (`hero-contract` §2), not here.
  const resolved = row({ id: "resolved", status: "RESOLVED", yesPool: 999_999, noPool: 999_999 });
  ok(heroFigures([...rows, resolved], T0, "pool").board.every((r) => r.id !== "resolved")
    && heroFigures([...rows, resolved], T0, "pool").featured?.id !== "resolved",
    "4.6 a RESOLVED row never reaches the board or the card");
  ok(rows.every((r) => r.pool < resolved.pool) && resolved.yesPct != null,
    "4.6-control the resolved row is priced and holds the biggest pool, so without the status filter it would lead");
}

console.log(`landing-contract: ${pass} assertions passed`);
if (fails.length) {
  console.error(`\n${fails.length} FAILED:`);
  fails.forEach((f) => console.error("  ✗ " + f));
  process.exit(1);
}
console.log("all green");
