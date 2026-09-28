/**
 * The landing hero's figures — the proof rail, the aggregate conviction bar, the question board
 * and the featured card, all derived from ONE board read.
 *
 * ⭐ WHY THIS IS PURE, AND WHY IT REUSES `discovery.ts`. The hero states numbers about the live
 * book: "44 open", "TZS 185,500 in play", "57% YES". `/markets` states numbers about the same
 * book. If the hero counted "open" its own way, the landing and the board could contradict each
 * other about how many markets a player can bet on right now — on the two most-visited surfaces
 * of a licensed money product. So `open` here IS `matchesStatus(row, "open")`, and the board
 * lens is composed out of `matchesStatus(..., "today")` and `sortRows(..., "close")` — both of
 * them the board's own — so the hero cannot drift from it, because it still has no definitions
 * of its own to drift with. See the block above `const today` for why the lens is not a plain
 * "closing soonest" any more.
 *
 * ⛔ NO SERVER IMPORTS — same contract as `discovery.ts`. The page decorates its markets and
 * hands them here, which is what lets `test:hero-contract` prove the licence conditions with no
 * database and no browser.
 *
 * The cold-start rule (DESIGN_AUTHORITY §B6 / law 81): a market's printable price is `shownYesPct` /
 * `priceState` (`price-state.ts`) — null when nobody has staked OR money sits on one side only, and a
 * two-sided price within 1–99 — read by the board, the market card, the detail page and this file's
 * rows. The AGGREGATE share below is `pricedYesPct` over summed pools, which is not a market's price.
 */
import { matchesStatus, pricedYesPct, sortRows, type DiscoveryRow } from "./discovery";
import { priceTier } from "./price-state";

/**
 * Rows in the landing's ONE board (landing v3 · WP9, ruling R15).
 *
 * ⭐ WAS 4, AND THE PAGE SHOWED EIGHT MARKETS IN THREE SHAPES. `/` drew 1 featured card + 4 board rows
 * + 3 grid cards; WP9 deletes the `.market-grid` band, so the same eight arrive as 1 featured card + 7
 * rows — one shape instead of three, and the budget `landing.ts` chose deliberately is preserved
 * exactly rather than re-argued. ⛔ It is NOT a free number: that header records that a six-card grid
 * "put ELEVEN markets in front of a visitor", so eight is a ceiling, not a starting point.
 *
 * ⚠️ `scripts/hero-contract.test.mts` asserts a FULL board, so its fixtures must hold at least
 * 1 + this many open rows. Both were six-row fixtures while this was 4; growing the constant without
 * growing them turns "the board is still full" into a test that the fixture is big enough, and the
 * cheap repair — loosening `===` to `<=` — would retire the assertion silently.
 */
export const QUESTION_BOARD_SIZE = 7;

/**
 * The orderings the board offers, and the vocabulary its toggle speaks (WP9 · R15).
 *
 * `closing` is the hero's own price-quality lens, and it is what the featured card is ALWAYS taken
 * from — the featured market is the most contested one (R4(4)) and must not change when a reader
 * re-orders the list under it. `pool` and `new` are the board's own `discovery.ts` sorts, and WHICH of
 * those two is offered is `boardMoneyLens`'s decision, never a caller's.
 */
export type BoardLens = "closing" | "pool" | "new";

/** Every lens the board will accept off a URL. Narrow with this; never trust the query string. */
export const BOARD_LENSES: readonly BoardLens[] = ["closing", "pool", "new"];

/**
 * The second ordering the toggle offers — the money lens, or the honest lens for a cold book.
 *
 * ⛔ `new` IS NOT A FALLBACK, IT IS THE HONEST LENS FOR A COLD BOOK, and that trap was paid for in
 * batch 1. On a platform where nothing has been staked every pool is 0, `pool` ties everywhere, and
 * the documented tie-break (`bettableUntil` asc) IS closing order — so a board headed "Biggest pools
 * first" would be ordered by a number that is zero on every row, and ordered *identically to the
 * closing lens*, which is the one thing a toggle between the two exists not to do. An assertion that
 * `sort=closing` and `sort=pool` produce different leads passed only while the fixture happened to
 * have varied pools. Same instinct as `pricedYesPct`: do not state a figure nobody produced.
 *
 * ⚠️ MOVED HERE FROM `landing.ts` (`gridLensFor`) BY WP9, WITH ITS REASONING, because the surface it
 * decides for is now the board. The grid it was written for no longer exists on `/`.
 */
export function boardMoneyLens(openPoolTzs: number): Extract<BoardLens, "pool" | "new"> {
  return openPoolTzs > 0 ? "pool" : "new";
}

/**
 * The two orderings the board OFFERS on this book — one rule, read by the toggle that draws the pills
 * and by the narrowing that accepts a lens off the URL, so the two cannot disagree.
 *
 * ⛔ A PILL THAT IS NOT OFFERED MUST NOT BE THE ONE IN FORCE. `?sort=pool` on a cold book would head
 * the board with a superlative about zeros while the rail drew "Just opened" and "Closing soonest",
 * neither of them marked current — a rail that cannot say which order the list is in, which is
 * `/profile/account`'s `?act=lol` defect (a value passed through unnarrowed emptied the table and drew
 * no control that could clear it). `heroFigures` narrows against this list; nothing else may.
 */
export function boardLenses(openPoolTzs: number): readonly BoardLens[] {
  return ["closing", boardMoneyLens(openPoolTzs)];
}

/**
 * THE BOARD'S ORDERING — one rule, both lenses, computed on the server from the one board read.
 *
 * ⭐ WHY THIS IS ONE FUNCTION AND NOT TWO (ruling R15's binding half). The toggle switches between
 * orderings; it must never switch between *implementations*. Until WP9 `landingGrid` owned the tier
 * partition for the grid while `heroFigures` owned it for the board — two homes for one rule about
 * money, which is exactly what R15 forbids the browser from becoming. The grid is gone, so the rule
 * has one home: this function.
 *
 * ── THE LENS: CLOSING SOON, LED BY WHAT IS ACTUALLY CONTESTED ─────────────────────────────────
 * 🔴 THIS WAS `sortRows(open, { sort: "closing" })` AND IT LED THE WHOLE SITE WITH DEAD PRICES.
 * Measured on production 2026-09-24: of the 54 market cards readable on /markets only 19 were priced
 * at all, and 6 of those sat at exactly 0% or 100%. Those degenerate markets are almost always the
 * ones closing soonest — money lands on one side and nothing moves it back before the cutoff — so a
 * pure "closing" order handed the loudest position on the site to the rows that show a prediction
 * market with nothing left to predict. Three of the four board rows read "100% NDIO", each drawing a
 * full-width lean rule that reads as a divider rather than a price.
 *
 * ⭐ NO NEW ORDERING WAS INVENTED. `close` already exists in `discovery.ts` — "distance from an even
 * market", null when there is no price — and its null partition puts unpriced rows last in BOTH
 * directions, as do `closing`, `pool` and `new`. So every branch below is a composition of predicates
 * this module already borrows, and `/markets` can still be sorted the same way by hand. Writing a
 * private sort here is exactly what this file's header forbids: the hero and the board would start
 * disagreeing.
 *
 * 🔴 A PRICE-QUALITY FLOOR, ADDED AFTER THE FIRST VERSION SHIPPED AND FAILED IN PUBLIC.
 * The first lens ordered the markets closing TODAY by distance from even and then topped the board up
 * from the rest of the book by closing time. It guaranteed "never short" and never guaranteed "never
 * degenerate" — so on a day when only two markets closed within 24h, three of the five seats came
 * from the fallback, which had no price filter at all. Measured live on 2026-09-24 at 16:08: the board
 * read 79 · 0 · — · — while NINE contested markets sat unshown, including 71% on TZS 72,000 and 66%
 * on TZS 53,000. The defect the lens was written to remove walked back in through the branch the lens
 * added. The same thing happened to the grid from the other direction: production led "Pick a side
 * now" with two ONE-SIDED cards reading "YES 100%", because the biggest pools on the book were the
 * ones with money on one side only.
 *
 * ⭐ QUALITY IS A PARTITION, NOT A SORT KEY, and it is applied BEFORE position. A market with no price
 * and a market with one side of its pool empty are not "slightly worse" than a contested one — they
 * are a different kind of thing to put in front of a first-time visitor, and no amount of closing
 * sooner (or holding a bigger pool) should promote them past a real question.
 * ⛔ TIERED RATHER THAN FILTERED, so the board is never SHORT either. Within each tier the lens's own
 * order still applies. A degenerate row can therefore still appear — but only once every contested
 * market in the entire open book is already on screen, which is the honest ordering of a thin day,
 * and it appears where its own lens puts it, so a heading that states the order stays true of the
 * screen. A partition, never a filter.
 * ⭐ WP6 (2026-09-27): THE TIER IS READ FROM THE POOLS (`priceTier`), no longer from the rounded
 * `yesPct === 0 || === 100`. The rounded test put a two-sided 199-vs-1 market with the one-sided ones
 * and its mirror image 1-vs-199 with the contested ones; and ruling 13 forbids inferring one-sidedness
 * from a rounded figure at all. A two-sided market is tier 0 now, shown within 1–99.
 *
 * ⚠️ The `closing` branch's eyebrow claim stays true — everything in its leading group is closing
 * within 24h — and the fallback is explicit rather than emergent: when fewer markets close today than
 * the board has rows, the rest of the open book follows in the old "closing soonest" order.
 */
export function boardOrdering(open: readonly HeroRow[], nowMs: number, lens: BoardLens): HeroRow[] {
  const order = (rows: readonly HeroRow[]): HeroRow[] => {
    if (lens !== "closing") return sortRows(rows, { sort: lens, dir: null });
    const today = rows.filter((r) => matchesStatus(r, "today", nowMs));
    const todayIds = new Set(today.map((r) => r.id));
    return [
      ...sortRows(today, { sort: "close", dir: null }),
      ...sortRows(rows.filter((r) => !todayIds.has(r.id)), { sort: "closing", dir: null }),
    ];
  };
  return [0, 1, 2].flatMap((tier) => order(open.filter((r) => priceTier(r) === tier)));
}

/**
 * A `DiscoveryRow` plus what the hero has to RENDER: the question itself, and the raw pools.
 *
 * ⚠️ `yesPool`/`noPool` are carried raw and are not optional. The aggregate share must be
 * computed from summed shillings; reconstructing them from the row's already-rounded `yesPct`
 * would make the headline figure a weighted average of rounded percentages — the same class of
 * error as averaging the percentages outright, just harder to spot.
 */
export type HeroRow = DiscoveryRow & {
  titleEn: string;
  titleSw: string;
  titleZh?: string | null;
  yesPool: number;
  noPool: number;
  sourceUrl?: string;
  /**
   * The NAME of the source this market settles on — the registry's label, else the host — resolved on
   * the server by `sourceNameFor` (landing v3 WP3/WP4, gate V18). Absent when the URL does not parse.
   * Optional on purpose: `fixtureIsComplete` checks `DiscoveryRow` keys only, and a market with no
   * `sourceUrl` has no name to state (the gate reports it; nothing invents one).
   */
  sourceName?: string;
};

export type HeroFigures = {
  /** Markets a player can place a bet on at this instant. The board's `Open` count, exactly. */
  openCount: number;
  /** Σ of every open market's pool, TZS. */
  poolTzs: number;
  /** Σ predictorCount over the open book — one person on two markets is two predictions. */
  openPredictions: number;
  /** Open markets whose betting shuts within 24h. */
  closingToday: number;
  /**
   * Volume-weighted YES share of the whole open book, or **null when nothing is staked**.
   *
   * ⛔ NOT the mean of per-market percentages: a market with TZS 200,000 on it and one with
   * TZS 1,000 on it do not carry equal weight in what "the board thinks". And ⛔ never 50 on an
   * empty book — that is licence condition 1, and `impliedYesPct` hands out exactly that number.
   */
  yesShare: number | null;
  /**
   * Which ordering `board` is in — the ONE variable the section's toggle and its heading both read,
   * so the pill that says "Biggest pools first" and the list under it cannot disagree (WP9).
   */
  lens: BoardLens;
  /**
   * The question board: the open markets EXCEPT the featured one, in `lens` (WP9 · R15).
   *
   * 🔴 IT EXCLUDES THE FEATURED MARKET, AND THAT IS DELIBERATE. While the board began at the first
   * row of the ordering, the hero stated its lead market TWICE — once as row 1 and again, 400px
   * lower, as the featured card, same title and same price. Caught by reading a whole-page frame;
   * every gate was green over it and the per-band clips could not show it either.
   * ⚠️ IT IS AN EXCLUSION BY ID, NOT A SLICE, SINCE WP9 — and the change is not cosmetic. With a
   * toggle the board may be ordered by `pool` while the featured card is still the most contested
   * market (R4(4)), so the card is no longer guaranteed to be row 0 of the list the board slices.
   * `slice(1, …)` would then drop an innocent row and show the card twice, which is the exact defect
   * above, re-arriving through the feature that was supposed to be a re-ordering. Both still come
   * from ONE read and ONE rule (`boardOrdering`), which is what the kit means by "the same query"
   * and what stops anyone pinning a favourite here.
   */
  board: HeroRow[];
  /**
   * The card beside the lede: the first market in the `closing` ordering, at every lens.
   * ⛔ IT DOES NOT FOLLOW THE TOGGLE. The featured market is the most contested open market (R4(4)),
   * which is a claim about the book, not about the order a reader chose for the list below it.
   */
  featured: HeroRow | null;
};

export function heroFigures(rows: readonly HeroRow[], nowMs: number, requested: BoardLens = "closing"): HeroFigures {
  const open = rows.filter((r) => matchesStatus(r, "open", nowMs));

  let sumYes = 0;
  let sumNo = 0;
  let predictions = 0;
  for (const r of open) {
    sumYes += r.yesPool;
    sumNo += r.noPool;
    predictions += r.predictors;
  }

  // ⛔ THE REQUESTED LENS IS NARROWED HERE, WHERE THE POOL SUM IS KNOWN — never trusted off a URL.
  // `boardLenses` decides what this book can honestly offer, and anything else falls back to the
  // default rather than being rendered as an ordering no pill claims. The narrowing lives at the one
  // point that has the figure it depends on, so a caller cannot get it subtly wrong.
  const lens: BoardLens = boardLenses(sumYes + sumNo).includes(requested) ? requested : "closing";

  // ── THE TWO ORDERINGS, BOTH FROM ONE READ AND ONE RULE (WP9 · R15) ─────────────────────────
  // The lens and its price-quality floor live in `boardOrdering` above — read its header before
  // changing anything here. ⛔ The FEATURED card is always the `closing` ordering's lead, at every
  // lens: it is the most contested open market (R4(4)), which is a fact about the book rather than
  // about the order a reader chose for the list. So `closing` is computed even when it is not the
  // lens on screen, and it costs nothing — both are folds over the same in-memory `open` array.
  const closing = boardOrdering(open, nowMs, "closing");
  const featured = closing[0] ?? null;
  const ordered = lens === "closing" ? closing : boardOrdering(open, nowMs, lens);

  return {
    openCount: open.length,
    poolTzs: sumYes + sumNo,
    openPredictions: predictions,
    // Reuses the board's own `today` predicate rather than re-testing the 24h window here.
    closingToday: rows.filter((r) => matchesStatus(r, "today", nowMs)).length,
    yesShare: pricedYesPct(sumYes, sumNo),
    lens,
    // ⛔ THE CARD IS SUBTRACTED BY ID, NEVER BY A SLICE OFFSET — see the note on `board` above for
    // why `slice(1, …)` stopped being correct the moment the board could be ordered independently.
    board: ordered.filter((r) => r.id !== featured?.id).slice(0, QUESTION_BOARD_SIZE),
    featured,
  };
}
