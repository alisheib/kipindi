/**
 * The market card's height — as a CSS custom property, not a number.
 *
 * ONE DEFINITION, FOUR SKELETONS. This was a hand-measured constant that the two /markets
 * skeletons imported, and before that it was 220 in one of them while the real card measured
 * 349.4px in a browser. The board committed to a layout ~129px per row too short and two rows
 * too few, then grew by well over 500px as the real grid arrived under a reader whose eye was
 * already moving. A skeleton that lies about the page is worse than no skeleton (B-29).
 *
 * WHY IT IS NO LONGER A NUMBER (U3, docs/MOBILE-VISUAL-PLAN.md). The Card spacing setting
 * gives the card TWO heights — Compact on a phone, Comfortable everywhere else — and a
 * JavaScript constant cannot know which one is rendering. Worse, /results was STILL carrying
 * the literal 220 against a real card of 278: the exact B-29 defect above, alive in the tree.
 * So the height is now `--mcard-h`, a calc() of the six rhythm tokens the card itself reads
 * (globals.css, :root). The skeleton follows the card by construction — change a token and
 * both move together, in both densities, with nothing to remember.
 *
 * Measured on production at 360 SW, 2026-09-23, and re-measured after the change:
 *   --mcard-h         347px comfortable · 303px compact   (the /markets cold-start card:
 *                     347.44 → 303.44, so the skeleton matches the card within half a pixel)
 *   --mcard-h-closed  278px comfortable · 242px compact   (the /results resolved card)
 *
 * Do not re-type either number anywhere. If the card's CONTENT changes, re-measure in a real
 * browser and move `--mcard-base` / `--mcard-base-closed`, which is where the one measured
 * constant now lives.
 */

/** The LIVE market card (/markets, /live, /watchlist, the landing). */
export const MARKET_CARD_H = "var(--mcard-h)";

/** The CLOSED / resolved market card (/results) — two children fewer, so a shorter box. */
export const MARKET_CARD_H_CLOSED = "var(--mcard-h-closed)";
