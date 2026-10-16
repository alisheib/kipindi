/**
 * WHERE THE BET SHEET'S MIDDLE STANDS WHEN THE SHEET ITSELF MOVES IT — pure (the Vodacom plan S8, round V2;
 * `docs/design-system/v5-2026-09-29-simplified-journey/S8-PLAN.md` A25 items 4 and 8).
 *
 * 🔴 WHAT THE TILES SHOWED. On a 320×640 or 360×640 phone the low frame is taller than the sheet's middle, and at rest it
 * showed the question, the stake, the estimate and the callout's top: "CHOOSE WHAT TO DO" over one option, its second
 * option and the deposit amounts under the footer, the deposit door half under the bottom fade (tiles 034, 035, 041, 062).
 * Where something had scrolled the middle — a focused field revealed, the browser's minimum scroll — the first visible line
 * was cut through its glyphs under the header (034, 035, and the keyboard tiles).
 *
 * ⭐ THE RULE. When a low, loss-room or pending frame arrives (and whenever the keyboard goes while one stands), the middle
 * stands so the frame's own block — its callout, then every option — is in view from its top (`want`: the block's top less
 * the column's gap). Then the top edge never cuts a row: a line of text or a control that straddles it pushes the edge
 * down to its foot. Where that runs past the middle's range, the middle gives up exactly that much at its foot (`trim`):
 * the sheet is that much shorter, and its bottom edge is still the end of the content — nothing is cut there either, and
 * no empty band opens inside the sheet. A reader's own scroll is never moved: this answers only the sheet's own moves.
 *
 * Client-safe and pure: numbers in, numbers out. The DOM reading is the caller's (`bet-sheet.tsx`).
 */

/** A row the top edge must not cut: a line box of text, or a control's box — in the middle's content coordinates. */
export type SheetRow = { top: number; bottom: number };

/** Half a pixel either way: a box's edges are fractional on a high-density screen. */
const SLACK = 0.5;

/** Whether a top edge at `top` cuts a row (the drives and the guard read the same answer). */
export function cutsRow(top: number, rows: readonly SheetRow[]): boolean {
  return rows.some((r) => r.top < top - SLACK && r.bottom > top + SLACK);
}

/**
 * ⭐ WHERE THE LOW BLOCK'S TOP STANDS — from its top less the column's gap, unless its foot would then be hidden (the round
 * V2 drive at 320×640 in sw: a priced "bet instead" grew the block to 404px in a 414px middle, and its last 2px went under
 * the footer, its estimate line under the end fade). A block that fits only without the whole gap stands the middle at
 * its END — the column's own padding included, so no end fade dims its last option; one that fits only with that padding
 * hidden stands from its very top; one taller than the middle stands from its top less the gap, the rest a scroll away.
 * The callout's top is never passed. Content coordinates: `blockTop` is the block's top (its callout), `foot` the
 * content's end (`scrollHeight`: the low block is the middle's last content), `view` the middle's height, `padEnd` its
 * padding at the foot.
 */
export function lowBlockWant(blockTop: number, foot: number, view: number, gap: number, padEnd = 0): number {
  const preferred = blockTop - gap, atEnd = foot - view;
  if (atEnd <= blockTop) return Math.max(preferred, atEnd);
  if (atEnd - padEnd <= blockTop) return blockTop;
  return preferred;
}

/**
 * The middle's scroll offset for a wanted top, and the height it gives up: the wanted top clamped to the middle's range
 * (`max` = scrollHeight − clientHeight), then pushed down past every row that straddles it; `trim` is how far that push
 * runs past `max` — the middle shortened by it reaches the pushed offset with its foot still on the content's end.
 */
export function settledScrollTop(want: number, max: number, rows: readonly SheetRow[]): { top: number; trim: number } {
  const range = Math.max(0, max);
  let top = Math.max(0, Math.min(Number.isFinite(want) ? want : 0, range));
  // Each push lands on a row's foot; a row beside it (the same line in another column) may still straddle it — at most
  // one more push per row, so the loop is bounded by the rows.
  for (let i = 0; i <= rows.length; i++) {
    const cut = rows.find((r) => r.top < top - SLACK && r.bottom > top + SLACK);
    if (!cut) break;
    top = cut.bottom;
  }
  return { top, trim: Math.max(0, top - range) };
}
