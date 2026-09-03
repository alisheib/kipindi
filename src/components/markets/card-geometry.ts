/**
 * The MEASURED height of a rendered market card, in px.
 *
 * 🔴 ONE DEFINITION, TWO SKELETONS. This number was hard-coded in two places — the route
 * skeleton (`markets/loading.tsx`) and the Suspense fallback the first HTML response actually
 * carries (`markets/page.tsx`) — and before that it was 220 in one of them while the real card
 * measured 349.4px in a browser at 1280. The board committed to a layout ~129px per row too
 * short and two rows too few, then grew by well over 500px as the real grid arrived under a
 * reader whose eye was already moving. A skeleton that lies about the page is worse than no
 * skeleton (B-29).
 *
 * ⛔ Both skeletons import THIS. Do not re-type the number anywhere. If the card's height
 * genuinely changes, re-measure in a real browser at 1280 and change it here — one edit moves
 * both, which is the whole point.
 *
 * ⚠️ 349 → 347, 2026-09-03 (PV-13b). `.mcardp-info` ("How it works") shrank from a hand-typed
 * 46px to the `--h-control-md` rung (44px) — §K1, `test:tap-target` §6 — and it is the tallest
 * child of the card's meta row on a LIVE card, so the whole card moved by exactly that 2px.
 * Re-measured in a real browser at 1280 (`.mcardp` `getBoundingClientRect().height`), before and
 * after, on the SAME board: cold-start cards 349 → 347, priced cards with a sparkline 356 → 354.
 * The details-row clearance this number's neighbours depend on (`.mcardp-details::after`'s
 * 10px-above/14px-below margin, `globals.css` ~L3958) is UNCHANGED — the row above it absorbed
 * the shrink, not the gap — confirmed by measurement, not assumed.
 */
export const MARKET_CARD_H = 347;
