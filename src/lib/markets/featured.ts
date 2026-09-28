/**
 * The landing's FEATURED card — the rules that are its own (landing v3 WP3).
 *
 * ⭐ THE PREDICTOR FLOOR (INHERIT-MANIFEST R7, "not asked, defaults applied": the featured card stays the
 * most contested market, R4(4), and WP3 hides the predictor count below a floor). The featured card is the
 * page's lead market, the first thing a visitor reads after the headline, and "2 watabiri" there reads as a
 * dead market on a page whose job is to show a live one. So below the floor the featured card states no
 * count and draws no crest row; the pool beside it still states the market's depth in shillings.
 *
 * WHY 10: a count in single digits reads as "nobody is here"; from two digits it reads as a crowd. It is
 * the smallest figure that does, so the count is withheld only where it would work against the page.
 *
 * ⛔ FEATURED ONLY. Every grid card, board row and every other surface still states its count at any
 * size (K48): a player comparing markets needs it, and the grid is a claim about the whole book.
 * ⛔ NEVER A DIFFERENT NUMBER — the count is shown true or not at all.
 * ⭐ "Be the first to predict" is an invitation, not a count, so a fresh featured card keeps it.
 * The gate reads the same rule: a featured card that withholds its count says so
 * (`data-market-predictors` below `data-market-depth-floor`), and V18 accepts that and nothing else.
 * Guard: `test:featured-card` §1 + §2.
 *
 * ⚠️ NO IMPORTS, NO "use client": the market card (a client component) reads it, and so does the test.
 */
export const FEATURED_PREDICTOR_FLOOR = 10;

/** Does the featured card state its predictor count? A fresh card keeps its invitation. */
export function featuredShowsPredictors(predictors: number, fresh: boolean): boolean {
  return fresh || predictors >= FEATURED_PREDICTOR_FLOOR;
}
