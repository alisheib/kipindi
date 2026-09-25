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
 * The cold-start rule (DESIGN_AUTHORITY §B6 / law 81) has FOUR consumers now: the board, the
 * market card, the detail page, and this file. The rule is `pricedYesPct` — one function, and it
 * returns null rather than a number when nobody has staked.
 */
import { matchesStatus, pricedYesPct, sortRows, type DiscoveryRow } from "./discovery";

/** Rows in the hero's question board. Four fits the kit's grid at every width we ship. */
export const QUESTION_BOARD_SIZE = 4;

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
   * The question board: the open markets AFTER the featured one, in the hero's own lens —
   * closing today, most contested first, then the rest of the book by closing time.
   *
   * 🔴 IT STARTS AT THE SECOND MARKET, AND THAT IS DELIBERATE. While the board began at the first,
   * the hero stated its lead market TWICE — once as row 1 and again, 400px lower, as the featured
   * card, same title and same price. Caught by reading a whole-page frame; every gate was green
   * over it and the per-band clips could not show it either. The card and the board still come from
   * ONE ordering, which is what the kit means by "the same query" and what stops anyone pinning a
   * favourite here — they are consecutive slices of it, not two queries.
   */
  board: HeroRow[];
  /** The card beside the lede: the first market in the lens the board shares. */
  featured: HeroRow | null;
};

export function heroFigures(rows: readonly HeroRow[], nowMs: number): HeroFigures {
  const open = rows.filter((r) => matchesStatus(r, "open", nowMs));

  let sumYes = 0;
  let sumNo = 0;
  let predictions = 0;
  for (const r of open) {
    sumYes += r.yesPool;
    sumNo += r.noPool;
    predictions += r.predictors;
  }

  // ── THE LENS: CLOSING SOON, LED BY WHAT IS ACTUALLY CONTESTED ─────────────────────────────
  // 🔴 THIS WAS `sortRows(open, { sort: "closing" })` AND IT LED THE WHOLE SITE WITH DEAD PRICES.
  // Measured on production 2026-09-24: of the 54 market cards readable on /markets only 19 were
  // priced at all, and 6 of those sat at exactly 0% or 100%. Those degenerate markets are almost
  // always the ones closing soonest — money lands on one side and nothing moves it back before
  // the cutoff — so a pure "closing" order handed the loudest position on the site to the rows
  // that show a prediction market with nothing left to predict. Three of the four board rows read
  // "100% NDIO", each drawing a full-width lean rule that reads as a divider rather than a price.
  //
  // ⭐ NO NEW ORDERING WAS INVENTED. `close` already exists in `discovery.ts` — "distance from an
  // even market", null when there is no price — and its null partition puts unpriced rows last in
  // BOTH directions. So the fix is a composition of two predicates this module already borrows,
  // and `/markets` can still be sorted the same way by hand. Writing a private sort here is
  // exactly what this file's header forbids: the hero and the board would start disagreeing.
  //
  // The eyebrow's claim stays true — everything in the leading group is closing within 24h — and
  // the fallback is explicit rather than emergent: when fewer than five markets close today, the
  // rest of the open book follows in the old "closing soonest" order, so the board is never short.
  // 🔴 A PRICE-QUALITY FLOOR, ADDED AFTER THE FIRST VERSION SHIPPED AND FAILED IN PUBLIC.
  // The first lens ordered the markets closing TODAY by distance from even and then topped the
  // board up from the rest of the book by closing time. It guaranteed "never short" and never
  // guaranteed "never degenerate" — so on a day when only two markets closed within 24h, three of
  // the five seats came from the fallback, which had no price filter at all. Measured live on
  // 2026-09-24 at 16:08: the board read 79 · 0 · — · — while NINE contested markets sat unshown,
  // including 71% on TZS 72,000 and 66% on TZS 53,000. The defect the lens was written to remove
  // walked back in through the branch the lens added.
  //
  // ⭐ QUALITY IS A PARTITION, NOT A SORT KEY, and it is applied BEFORE position. A market with no
  // price and a market priced 0 or 100 are not "slightly worse" than a contested one — they are a
  // different kind of thing to put in front of a first-time visitor, and no amount of closing
  // sooner should promote them past a real question.
  // ⛔ TIERED RATHER THAN FILTERED, so the board is never SHORT either. Within each tier the
  // original lens still applies: closing today by distance from even, then the rest by closing
  // time. A degenerate row can therefore still appear — but only once every contested market in
  // the entire open book is already on screen, which is the honest ordering of a thin day.
  const degeneracy = (r: HeroRow): number =>
    r.yesPct == null ? 2 : (r.yesPct === 0 || r.yesPct === 100) ? 1 : 0;
  const lens = (rows: readonly HeroRow[]): HeroRow[] => {
    const today = rows.filter((r) => matchesStatus(r, "today", nowMs));
    const todayIds = new Set(today.map((r) => r.id));
    return [
      ...sortRows(today, { sort: "close", dir: null }),
      ...sortRows(rows.filter((r) => !todayIds.has(r.id)), { sort: "closing", dir: null }),
    ];
  };
  const ordered = [0, 1, 2].flatMap((tier) => lens(open.filter((r) => degeneracy(r) === tier)));

  return {
    openCount: open.length,
    poolTzs: sumYes + sumNo,
    openPredictions: predictions,
    // Reuses the board's own `today` predicate rather than re-testing the 24h window here.
    closingToday: rows.filter((r) => matchesStatus(r, "today", nowMs)).length,
    yesShare: pricedYesPct(sumYes, sumNo),
    // ⛔ Consecutive slices of ONE ordering: [0] is the card, [1..4] are the rows. Never overlapping
    // — see the note on `board` above.
    board: ordered.slice(1, 1 + QUESTION_BOARD_SIZE),
    featured: ordered[0] ?? null,
  };
}
