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

import { fixtureIsComplete } from "./lib/discovery-row-keys.mts";
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
    // ⚠️ ADDED 2026-09-06 AND NOT BY `tsc`. `DiscoveryRow` gained these two as REQUIRED fields,
    // and this fixture went on omitting them silently: `tsconfig.json` includes
    // `scripts/**/*.ts` but NOT `.mts`, so every fixture in this directory is outside the
    // typechecker. The suite stayed green because the hero only ever asks `matchesStatus(…,
    // "open")`, which reads neither — a fixture that is not a real row, passing because the
    // question was narrow. The moment a hero predicate reads one it would have read `undefined`.
    resolvesAtMs: NOW + 12 * H,
    verdictRecorded: false,
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

{
  // 🔴 E-317 — THIS SUITE IS THE ONE THAT PROVED THE GAP. It shipped rows missing BOTH new
  // required `DiscoveryRow` fields and stayed green for a full session, because `.mts` is outside
  // `tsconfig.include` and the hero only ever asks `matchesStatus(…, "open")`, which reads
  // neither. The key list is parsed from the TYPE, so the fixture cannot drift from it again.
  const [complete, detail] = fixtureIsComplete(heroRow() as unknown as Record<string, unknown>);
  ok("0.1 ⛔ the hero fixture builds a COMPLETE DiscoveryRow (tsc does not check .mts)", complete, detail);
}

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
  // only a reason not to price them. (Two open markets → one is the card, one is the row.)
  ok("a cold book still renders its questions", cold.board.length === 1, String(cold.board.length));
  ok("   and its featured card", cold.featured !== null);
  ok("   every cold row is unpriced", cold.board.every((r) => r.yesPct === null));
  ok("   the cold featured card is unpriced too", cold.featured?.yesPct === null, String(cold.featured?.yesPct));
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
  // Stated as an INVARIANT, not a count: with one open market that market becomes the CARD and the
  // board is legitimately empty. A count here would go red on a correct page.
  ok("the featured card is the one open market", f.featured?.status === "LIVE" && !f.featured.selectionClosed);
  ok("no shut / closed / settled market reaches the board or the card",
    f.board.every((r) => r.status === "LIVE" && !r.selectionClosed));
}

// ── 5 · ordering, capping, and the featured card ───────────────────────────────
log("\n── 5 · the lens: closing today, most contested first ─────────");
{
  // ⭐ THE PRICES ARE THE POINT OF THIS FIXTURE. The previous version gave every row the helper's
  // default 10k/10k — a dead-even 50% — so all six tied at |50-50| = 0 and the ordering fell
  // through to the tie-break. It could not have told the contested lens from a coin toss.
  //
  // ⛔ AND THE DEADLINES ARE ARRANGED SO A REVERT IS VISIBLE. The most contested market closes
  // LAST of the six and the unpriced one closes FIRST, so restoring a plain `closing` sort moves
  // the featured card — see the CONTROL at the end of this block. A fixture where both lenses
  // agree would pass either way and prove nothing.
  const even     = heroRow({ yesPool: 10_000, noPool: 10_000, bettableUntilMs: NOW + 9 * H }); // 50%
  const near     = heroRow({ yesPool: 13_000, noPool: 12_000, bettableUntilMs: NOW + 7 * H }); // 52%
  const lopsided = heroRow({ yesPool: 15_000, noPool:  5_000, bettableUntilMs: NOW + 5 * H }); // 75%
  const allYes   = heroRow({ yesPool: 20_000, noPool:      0, bettableUntilMs: NOW + 3 * H }); // 100%
  const allNo    = heroRow({ yesPool:      0, noPool: 20_000, bettableUntilMs: NOW + 2 * H }); // 0%
  const unpriced = heroRow({ yesPool:      0, noPool:      0, bettableUntilMs: NOW + 1 * H }); // no price
  const rows = [even, near, lopsided, allYes, allNo, unpriced];
  const f = heroFigures(rows, NOW);
  const shown = [f.featured!, ...f.board];

  ok("the board is capped", f.board.length === QUESTION_BOARD_SIZE, String(f.board.length));
  ok("the most contested market leads the hero", f.featured?.id === even.id,
    `featured=${f.featured?.yesPct}%`);
  ok("the board follows it by distance from even", f.board[0]?.id === near.id,
    `board[0]=${f.board[0]?.yesPct}%`);

  // 🔴 THE DEFECT THE WHOLE LENS EXISTS FOR. Measured on production 2026-09-24: three of the
  // four board rows read "100% NDIO", because the markets closing soonest are exactly the ones
  // whose price has already collapsed. A market nobody can disagree about is the worst possible
  // advertisement for a prediction market, and it held the loudest position on the site.
  const firstDegenerate = shown.findIndex((r) => r.yesPct === 0 || r.yesPct === 100);
  const lastContested = shown.reduce((acc, r, idx) =>
    (r.yesPct != null && r.yesPct !== 0 && r.yesPct !== 100 ? idx : acc), -1);
  ok("⛔ no collapsed price outranks a contested one",
    firstDegenerate === -1 || firstDegenerate > lastContested,
    shown.map((r) => String(r.yesPct)).join(","));
  ok("⛔ an unpriced market never takes a seat from a priced one",
    !shown.some((r) => r.yesPct == null),
    shown.map((r) => String(r.yesPct)).join(","));

  // 🔴 THE PAIR THIS EXISTS FOR, UNCHANGED BY THE LENS. While the board started at [0], the hero
  // stated its lead market twice — row 1 and the featured card, same title, same price, 400px
  // apart. Found by reading a whole-page frame; nothing automated saw it.
  ok("⛔ the featured market is NEVER also a board row",
    !!f.featured && !f.board.some((r) => r.id === f.featured!.id),
    `featured=${f.featured?.id} board=${f.board.map((r) => r.id).join(",")}`);
  ok("the card and the board are slices of ONE ordering",
    f.board.every((r) => Math.abs(50 - (f.featured!.yesPct ?? -999)) <= Math.abs(50 - (r.yesPct ?? 999))),
    shown.map((r) => String(r.yesPct)).join(","));

  // ⭐ THE CONTROL. Under the old `closing` order the card was whichever market closed soonest —
  // here the UNPRICED one at +1h. If this ever passes trivially the fixture has stopped telling
  // the two lenses apart, and everything above it proves nothing.
  const soonest = [...rows].sort((a, b) => a.bettableUntilMs - b.bettableUntilMs)[0];
  ok("CONTROL: the lens is not plain closing-soonest", f.featured?.id !== soonest.id,
    `soonest=${soonest.id} featured=${f.featured?.id}`);

  ok("closing-today counts the 24h window", f.closingToday === 6, String(f.closingToday));
}

log("\n── 5b · fewer than a boardful close today ─────────────");
{
  // Two markets close today, four close days out. The board must not go short, and the tail must
  // arrive in the old closing order — the fallback is STATED here, not left to emerge.
  const t1 = heroRow({ yesPool: 10_000, noPool: 10_000, bettableUntilMs: NOW + 4 * H });
  const t2 = heroRow({ yesPool: 15_000, noPool:  5_000, bettableUntilMs: NOW + 6 * H });
  const later = [5, 3, 4, 6].map((d) => heroRow({
    bettableUntilMs: NOW + d * 24 * H, resolvesAtMs: NOW + (d + 1) * 24 * H }));
  const f = heroFigures([...later, t2, t1], NOW);
  const shown = [f.featured!, ...f.board];
  ok("the board is still full", f.board.length === QUESTION_BOARD_SIZE, String(f.board.length));
  ok("today leads, most contested first", shown[0]?.id === t1.id && shown[1]?.id === t2.id,
    shown.map((r) => r.id).join(","));
  const tail = shown.slice(2).map((r) => r.bettableUntilMs);
  ok("and the rest follow by closing time", tail.every((d, i) => i === 0 || tail[i - 1] <= d),
    tail.join(","));
  ok("closing-today still counts only the 24h window", f.closingToday === 2, String(f.closingToday));
  // ⭐ THE CONTROL FOR THIS WHOLE SECTION. §5b is the only place the FALLBACK branch runs, and the
  // fallback is the one branch where the lens can quietly regress — if it ever stopped topping the
  // board up, a reader would see a short board and no assertion above would notice, because they
  // all describe rows that ARE there. Only 2 markets close today against a board of 5, so a FULL
  // board is only possible if the tail came from outside the today set. Stated rather than implied.
  ok("CONTROL: a full board here is only reachable through the fallback",
    f.closingToday < QUESTION_BOARD_SIZE + 1 && f.board.length === QUESTION_BOARD_SIZE,
    `today=${f.closingToday} board=${f.board.length} of ${QUESTION_BOARD_SIZE}`);
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
