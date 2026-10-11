/**
 * THE PREDICTOR COUNT PLAYERS SEE — one rule, in one place (owner ruling, 2026-10-11: docs/COMPLIANCE-DECISIONS.md,
 * "A desk account may count as more than one predictor in the count players see").
 *
 * A market holds two numbers:
 *   · `predictorCount` — the TRUE count of accounts that have bet (+1 at an account's first bet, never decremented).
 *     Every admin page, report, statutory figure and audit row reads it, and only it (D20a).
 *     ⛔ Admin code never calls this helper (`test:predictor-shown` census B).
 *   · `predictorExtra` — what players see on top of it, added by a desk account's "Counts as" weight.
 *
 * Every player surface builds its count HERE, where its rows are built: the board rows, the cards, the detail page,
 * /results, /watchlist, /live, the Up & Down card and round page, the share image and its description. Everything
 * downstream — the HOT badge, the featured floor, the sorts, the "New" filter, "No bets yet" — reads the built
 * number, so no two parts of the board can disagree. ⛔ Only the built number crosses to the browser: no player
 * payload carries either column (`test:predictor-shown` census A).
 *
 * ⭐ THE SHOWN COUNT IS 0 ONLY WHEN THE TRUE COUNT IS 0. An extra is written inside a stake that also counts its
 * account, so it never exists alone — but one that arrives without a counted account (a fixture, drift) is not shown,
 * because "No bets yet" must stay true. A missing, negative or non-finite extra reads as 0.
 *
 * ⚠️ NO IMPORTS, NO "use client": server pages and the guard import it, and a client component may.
 */
export function shownPredictors(m: { predictorCount: number; predictorExtra?: number | null }): number {
  const count = Number.isFinite(m.predictorCount) && m.predictorCount > 0 ? Math.trunc(m.predictorCount) : 0;
  if (count === 0) return 0;
  const extra = m.predictorExtra;
  return typeof extra === "number" && Number.isFinite(extra) && extra > 0 ? count + Math.trunc(extra) : count;
}
