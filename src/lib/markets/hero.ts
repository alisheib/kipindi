/**
 * The landing hero's figures — the proof rail, the aggregate conviction bar, the question board
 * and the featured card, all derived from ONE board read.
 *
 * ⭐ WHY THIS IS PURE, AND WHY IT REUSES `discovery.ts`. The hero states numbers about the live
 * book: "44 open", "TZS 185,500 in play", "57% YES". `/markets` states numbers about the same
 * book. If the hero counted "open" its own way, the landing and the board could contradict each
 * other about how many markets a player can bet on right now — on the two most-visited surfaces
 * of a licensed money product. So `open` here IS `matchesStatus(row, "open")`, and "closing
 * soonest" IS `sortRows(..., "closing")`: the hero cannot drift from the board because it has no
 * definitions of its own to drift with.
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
   * The question board: the open markets closing soonest AFTER the featured one.
   *
   * 🔴 IT STARTS AT THE SECOND MARKET, AND THAT IS DELIBERATE. While the board began at the first,
   * the hero stated its lead market TWICE — once as row 1 and again, 400px lower, as the featured
   * card, same title and same price. Caught by reading a whole-page frame; every gate was green
   * over it and the per-band clips could not show it either. The card and the board still come from
   * ONE ordering, which is what the kit means by "the same query" and what stops anyone pinning a
   * favourite here — they are consecutive slices of it, not two queries.
   */
  board: HeroRow[];
  /** The card beside the lede: the single soonest-closing open market. */
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

  // `dir: null` = the sort's natural direction, which for `closing` is ascending — soonest first.
  const ordered = sortRows(open, { sort: "closing", dir: null });

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
