/**
 * U47b-2 · THE LIVE PAGE'S GEOMETRY — one set of boxes for the figures and their ghost, so the swap cannot move the page
 * (the audience card's own rule, `audience-split-card.tsx`: "one set of boxes for the figures and their ghost").
 *
 * ⛔ WHY A FILE OF ITS OWN. The figures are drawn by a client component (`live-client.tsx`) and the ghost by a server one
 * (`loading.tsx`); a server component that imports a VALUE from a `"use client"` file is handed a reference to it, not the
 * value. So the strings both draw from live here, in a module with no directive.
 * ⛔ Literals, never an interpolated scale key: this repo's spacing scale is overridden, and Tailwind reads source text.
 */

/** A figure tile — the kit's `Stat` in its card box, at a floor tall enough for a two-line label at 360. */
export const LIVE_TILE = "min-h-[84px]";
/** The tiles' grid: two across on a phone, three from the small breakpoint, six across at the console's width. */
export const LIVE_TILES = "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6";
/** How many tiles a viewer who may read every figure is shown: On campaign, Handed over, Failed, Not sent, No answer, Waiting. */
export const LIVE_TILE_COUNT = 6;
/** How many reasons "Not sent" always lists (U38b's five words) — the ghost draws this many rows. */
export const LIVE_REASON_ROWS = 5;
