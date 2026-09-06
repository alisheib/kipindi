/**
 * ONE definition of "bring the active option of a horizontal strip into view".
 *
 * ⭐ WHY IT IS A SHARED PURE FUNCTION AND NOT A SECOND COPY. `Tabs` (DG-S-07, 2026-08-31) already
 * solved this, and the solution is four lines of arithmetic wrapped around three separate traps
 * that were each paid for once. A second surface needing the same behaviour is exactly the case
 * DESIGN_AUTHORITY §B9 / law 81 names: a derived value on more than one surface is defined once,
 * or the two drift and one of them is quietly wrong. So the ARITHMETIC lives here and each
 * caller keeps its own effect, because the DOM plumbing differs and the maths does not.
 *
 * ⛔ THE THREE TRAPS, KEPT WITH THE CODE THAT AVOIDS THEM:
 *
 *  1. RECTS, NEVER `offsetLeft`. `offsetLeft` measures from the nearest POSITIONED ancestor. A
 *     strip typically sets no `position` while its items carry `relative` for an underline, so
 *     `offsetLeft` is an offset into some card further up the tree — landing the strip at a
 *     plausible but WRONG position, which is worse than not scrolling at all because it looks
 *     deliberate. Rect deltas are relative to nothing and cannot drift.
 *  2. `scrollLeft`, NEVER `scrollIntoView()`. The latter scrolls every ancestor too, so a strip
 *     sitting ~400px down the page drags the whole document on first paint.
 *  3. NO `behavior: "smooth"`. An instant correction is not motion, so it owes §M6 nothing and
 *     cannot animate for a reader who asked it not to.
 *
 * The clamp keeps both ends flush: a first or last item is not floated into the middle with
 * empty space beside it.
 */
export function centredScrollLeft(opts: {
  /** `rail.getBoundingClientRect().left` */
  railLeft: number;
  /** `rail.scrollLeft` at the moment of measuring */
  scrollLeft: number;
  /** `rail.clientWidth` */
  clientWidth: number;
  /** `rail.scrollWidth` */
  scrollWidth: number;
  /** `active.getBoundingClientRect().left` */
  itemLeft: number;
  /** `active.getBoundingClientRect().width` */
  itemWidth: number;
}): number {
  const { railLeft, scrollLeft, clientWidth, scrollWidth, itemLeft, itemWidth } = opts;
  const leftWithinRail = itemLeft - railLeft + scrollLeft;
  const target = leftWithinRail - (clientWidth - itemWidth) / 2;
  return Math.max(0, Math.min(target, scrollWidth - clientWidth));
}
