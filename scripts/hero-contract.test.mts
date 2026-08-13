/**
 * HERO CONTRACT GUARD — the landing hero's figures, and the two places it could lie.
 *
 * The hero states numbers about real money to an anonymous visitor. Two of them can be a guess,
 * and licence condition 1 (never render a guessed, placeholder or zero-as-unknown number) says
 * neither may be rendered as one:
 *
 *   1. THE AGGREGATE CONVICTION SHARE, when nothing at all is staked. `impliedYesPct` returns a
 *      hardcoded 50 on an empty pool (market-service.ts:232-236). A hero reading "50% YES · 50% NO
 *      — every open market, weighted by the money on it" over an empty book is a fabricated
 *      market sentiment, stated in the platform's own voice.
 *
 *   2. A SINGLE QUESTION'S YES PRICE, when that market's pool is empty. The kit's §1a puts a
 *      price on every row of the question board. On a cold-start board that is four fabricated
 *      50%s — and the kit renders them in gilt, so it would also be gold on a number nobody
 *      earned (Q5). Batch 1 hit this exact trap in the odds buckets; the hero must not re-buy it.
 *
 * It also pins the arithmetic, because the WEIGHTED share and the MEAN of the per-market
 * percentages are both "57%" on a balanced fixture and wildly different on a real book. §7b's
 * instruction is explicit — "never an average of per-market percentages" — and a gate that cannot
 * tell the two apart is not guarding it. Block 3 uses a fixture where they differ by 39 points.
 *
 * ⛔ EVERY "MUST BE NULL" ASSERTION HERE IS PAIRED WITH A POSITIVE CONTROL IN THE SAME RUN. A bug
 * that made `yesShare` always null — or the board always empty — would satisfy every refusal
 * check on its own. That is the shape that let three drivers go green over a broken product.
 *
 * Run: npm run test:hero-contract   ·   RED proof: npm run red:hero-contract
 */
import { pricedYesPct, matchesStatus, type DiscoveryRow } from "../src/lib/markets/discovery.ts";
import { heroFigures, QUESTION_BOARD_SIZE, type HeroRow } from "../src/lib/markets/hero.ts";

let fail = 0;
const log = (m: string) => console.log(m);
function ok(label: string, cond: boolean, detail = "") {
  if (cond) log(`  PASS ${label}`);
  else { log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`); fail++; }
}

const NOW = Date.parse("2026-08-13T12:00:00Z");
const H = 3600_000;
let seq = 0;

function heroRow(over: Partial<HeroRow> = {}): HeroRow {
  const yesPool = over.yesPool ?? 10_000;
  const noPool = over.noPool ?? 10_000;
  return {
    id: `m_${++seq}`,
    category: "sports",
    pool: yesPool + noPool,
    predictors: 4,
    yesPct: pricedYesPct(yesPool, noPool),
    move24h: undefined,
    createdAtMs: NOW - 10 * H,
    bettableUntilMs: NOW + 10 * H,
    selectionClosed: false,
    status: "LIVE",
    watched: false,
    titleEn: "Question?",
    titleSw: "Swali?",
    titleZh: "问题？",
    yesPool,
    noPool,
    ...over,
    // Derived AFTER the spread so a caller overriding pools cannot leave pool/yesPct disagreeing
    // with them — a fixture that contradicts itself proves whatever you want.
    pool: (over.yesPool ?? yesPool) + (over.noPool ?? noPool),
    yesPct: pricedYesPct(over.yesPool ?? yesPool, over.noPool ?? noPool),
  };
}

log("Hero contract guard (licence condition 1 · DESIGN_AUTHORITY §B6 / law 81)");

// ── 1 · the shared pricing rule ────────────────────────────────────────────────
log("\n── 1 · pricedYesPct: the ONE cold-start rule ───────────────────");
{
  ok("an empty pool has NO price (null, never 50)", pricedYesPct(0, 0) === null,
    String(pricedYesPct(0, 0)));
  // The positive control for the line above: a staked market DOES get a number, so the null
  // result is a judgement about the pool and not the function being broken.
  ok("a staked market IS priced (positive control)", pricedYesPct(10_000, 10_000) === 50,
    String(pricedYesPct(10_000, 10_000)));
  ok("a one-sided book prices at 100", pricedYesPct(35_000, 0) === 100, String(pricedYesPct(35_000, 0)));
  ok("a one-sided book prices at 0 the other way", pricedYesPct(0, 35_000) === 0, String(pricedYesPct(0, 35_000)));
  // Rounding must match market-service's `Math.round`, or the hero and the card would print two
  // different prices for one market.
  ok("rounds like impliedYesPct", pricedYesPct(2, 1) === 67, String(pricedYesPct(2, 1)));
  // A negative pool is not reachable through the money paths, but a guard that only handles the
  // inputs it expects is how a display surface ends up dividing by a negative.
  ok("a non-positive pool is unpriced, not negative", pricedYesPct(-5, 5) === null, String(pricedYesPct(-5, 5)));
}

// ── 2 · the aggregate share on an empty book ───────────────────────────────────
log("\n── 2 · the aggregate conviction bar ────────────────────────────");
{
  const coldBook = [heroRow({ yesPool: 0, noPool: 0 }), heroRow({ yesPool: 0, noPool: 0 })];
  const cold = heroFigures(coldBook, NOW);
  ok("⛔ an unstaked book has NO aggregate share (null, never 50)", cold.yesShare === null,
    String(cold.yesShare));
  ok("   …and its pool total is 0", cold.poolTzs === 0, String(cold.poolTzs));
  // POSITIVE CONTROL: the very same shape WITH money must produce a number. Without this, a
  // `yesShare` hardwired to null would pass the assertion above.
  const warm = heroFigures([heroRow({ yesPool: 30_000, noPool: 10_000 })], NOW);
  ok("a staked book DOES have a share (positive control)", warm.yesShare === 75, String(warm.yesShare));

  // The board is still drawn on a cold book — emptiness is not a reason to hide the questions,
  // only a reason not to price them.
  ok("a cold book still renders its questions", cold.board.length === 2, String(cold.board.length));
  ok("   every cold row is unpriced", cold.board.every((r) => r.yesPct === null));
}

// ── 3 · WEIGHTED, not averaged ─────────────────────────────────────────────────
log("\n── 3 · the share is volume-weighted ────────────────────────────");
{
  // 90% YES on TZS 100,000 · 10% YES on TZS 1,000.
  //   weighted  = (90,000 + 100) / 101,000 = 89.2% → 89
  //   mean of the two percentages          = 50%
  // 39 points apart, so this fixture can tell the right answer from the plausible one.
  const skewed = [
    heroRow({ yesPool: 90_000, noPool: 10_000 }),
    heroRow({ yesPool: 100, noPool: 900 }),
  ];
  const f = heroFigures(skewed, NOW);
  ok("weights by the money on each market", f.yesShare === 89, String(f.yesShare));
  ok("⛔ is NOT the mean of the per-market percentages", f.yesShare !== 50, String(f.yesShare));
  ok("   pool total is the sum of both pools", f.poolTzs === 101_000, String(f.poolTzs));
}

// ── 4 · which markets count ────────────────────────────────────────────────────
log("\n── 4 · the open book, and nothing else ─────────────────────────");
{
  const mixed = [
    heroRow({ yesPool: 10_000, noPool: 0 }),                                    // open
    heroRow({ yesPool: 50_000, noPool: 0, selectionClosed: true }),             // betting shut
    heroRow({ yesPool: 70_000, noPool: 0, status: "CLOSED" }),                  // closed
    heroRow({ yesPool: 90_000, noPool: 0, status: "RESOLVED" }),                // settled
  ];
  const f = heroFigures(mixed, NOW);
  ok("counts only markets a player can bet on now", f.openCount === 1, String(f.openCount));
  // The money figure is the one most likely to drift: a selection-closed or settled pool is real
  // money, but it is NOT "in play", and stating it under that caption is the count-honesty defect
  // (§8.3) rather than a rounding question.
  ok("⛔ pool total excludes shut / closed / settled pools", f.poolTzs === 10_000, String(f.poolTzs));
  ok("the share is computed over the open book only", f.yesShare === 100, String(f.yesShare));
  ok("openCount agrees with the board's own predicate",
    f.openCount === mixed.filter((r) => matchesStatus(r as DiscoveryRow, "open", NOW)).length);
  ok("the question board draws only open markets", f.board.length === 1, String(f.board.length));
}

// ── 5 · ordering, capping, and the featured card ───────────────────────────────
log("\n── 5 · closing soonest, and the card beside the lede ───────────");
{
  const rows = [
    heroRow({ bettableUntilMs: NOW + 9 * H }),
    heroRow({ bettableUntilMs: NOW + 1 * H }),
    heroRow({ bettableUntilMs: NOW + 5 * H }),
    heroRow({ bettableUntilMs: NOW + 3 * H }),
    heroRow({ bettableUntilMs: NOW + 7 * H }),
    heroRow({ bettableUntilMs: NOW + 2 * H }),
  ];
  const f = heroFigures(rows, NOW);
  ok("the board is capped", f.board.length === QUESTION_BOARD_SIZE, String(f.board.length));
  const deadlines = f.board.map((r) => r.bettableUntilMs);
  ok("soonest first", deadlines.every((d, i) => i === 0 || deadlines[i - 1] <= d), deadlines.join(","));
  ok("the soonest market leads", f.board[0].bettableUntilMs === NOW + 1 * H);
  // The kit is explicit that the card and the board come from ONE query — a pinned favourite
  // would stop the hero being an instrument.
  ok("the featured card IS the board's lead", f.featured?.id === f.board[0].id);
  ok("closing-today counts the 24h window", f.closingToday === 6, String(f.closingToday));
}

// ── 6 · an empty platform ──────────────────────────────────────────────────────
log("\n── 6 · nothing live at all ─────────────────────────────────────");
{
  const f = heroFigures([], NOW);
  ok("no markets → no share to state", f.yesShare === null, String(f.yesShare));
  ok("no markets → no featured card", f.featured === null);
  ok("no markets → an empty board, not a placeholder row", f.board.length === 0);
  ok("no markets → zero, and zero is the truth here", f.openCount === 0 && f.poolTzs === 0);
}

// ── 7 · predictions are summed, not invented ───────────────────────────────────
log("\n── 7 · the third proof figure ──────────────────────────────────");
{
  const f = heroFigures([
    heroRow({ predictors: 8 }),
    heroRow({ predictors: 3 }),
    heroRow({ predictors: 11, status: "CLOSED" }), // excluded with its market
  ], NOW);
  ok("sums predictors over the open book", f.openPredictions === 11, String(f.openPredictions));
}

log(`\n${fail === 0 ? "PASS" : "FAIL"} — the hero states nothing it cannot prove`);
process.exit(fail ? 1 : 0);
