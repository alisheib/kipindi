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

/**
 * ⭐ A STRIP THAT HIDES SOMETHING ALWAYS SHOWS A WORD BEING CUT (round 10 of the visual pass, 2026-10-11, R10-D — tiles 171
 * 204). The lens strips scroll below `lg` and fade their hidden ends (`.kp-strip-fade`: transparent 8px inside the trailing
 * edge after a 64px ramp; transparent 12px inside the leading edge before a 32px ramp). WHERE THEIR ITEMS STOP IS DECIDED BY
 * NOTHING BUT THE STRIP'S WIDTH: the edge falls wherever the row runs out of room, so it can fall in a gap between two
 * pills — /results at sw 390 read "Zote 6 · NDIO 3 · HAPANA 2" and then nothing, its fourth lens ("Imebatilishwa 1")
 * starting exactly on the clip, the ramp dimming only HAPANA's grey count; the row read as finished. No width, gap or
 * padding can prevent that for every label in every language (the words decide), so the fade answers it: when the first
 * item past the trailing edge shows less than `STRIP_PEEK` of itself, the fade's end moves in to the middle of the item
 * before it, and that word is visibly cut under the ramp — the strip never ends on a gap. The leading edge, once scrolled,
 * the same way round. ⛔ The pressed lens is never the one cut: it is the answer to "which lens am I in" (StripAutoScroll
 * frames it centred, so it reaches an edge only at either end of the strip, where nothing beyond it is hidden).
 * `test:visual-pass-r10` §10 drives this against the /results strip of tile 171 and against every geometry it can build.
 */
/** The fade's geometry, as `.kp-strip-fade` draws it (globals.css). */
export const STRIP_FADE = { endInset: 8, endRamp: 64, startInset: 12, startRamp: 32 } as const;
/** How much of the first hidden item a strip shows before its fade's transparent end, at least: a pill's 16px padding and
 *  16px of its word — two letters at 13px. */
export const STRIP_PEEK = 32;
/** How long a strip must be still before its cut is read again (ms). While the reader scrolls the cut is lifted — read on
 *  every scroll, its end would ride on one pill and then jump to the next (StripAutoScroll) — and a touch fling fires a scroll
 *  event every frame until it stops, so a strip that has not moved for this long has come to rest. */
export const STRIP_PEEK_REST_MS = 150;

/** An item of the strip, in its content coordinates. `pressed`: the lens the reader is on — pressed, current, or holding
 *  keyboard focus — which a cut never fades. */
export type StripItem = { left: number; right: number; pressed?: boolean };

/**
 * How far each fade's transparent end moves inward (px) so that a strip with something hidden past an edge shows a word
 * being cut there. Items are in the strip's content coordinates (the padding box's left at scroll 0), in order.
 */
export function stripPeekCut(opts: { items: readonly StripItem[]; scrollLeft: number; clientWidth: number; scrollWidth: number }): { end: number; start: number } {
  const { items, scrollLeft, clientWidth, scrollWidth } = opts;
  let end = 0, start = 0;
  // Trailing: something hidden past the right edge?
  if (scrollLeft + clientWidth < scrollWidth - 1) {
    const r = scrollLeft + clientWidth - STRIP_FADE.endInset;
    const k = items.findIndex((it) => it.right > r);
    if (k > 0 && items[k].left > r - STRIP_PEEK && !items[k - 1].pressed) {
      end = Math.max(0, r - (items[k - 1].left + items[k - 1].right) / 2);
    }
  }
  // Leading: once scrolled, something hidden past the left edge?
  if (scrollLeft > 1) {
    const l = scrollLeft + STRIP_FADE.startInset;
    let j = -1;
    for (let i = 0; i < items.length; i++) if (items[i].left < l) j = i;
    if (j >= 0 && j < items.length - 1 && items[j].right < l + STRIP_PEEK && !items[j + 1].pressed) {
      start = Math.max(0, (items[j + 1].left + items[j + 1].right) / 2 - l);
    }
  }
  return { end: Math.round(end * 100) / 100, start: Math.round(start * 100) / 100 };
}
