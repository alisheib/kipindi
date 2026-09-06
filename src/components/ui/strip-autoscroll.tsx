"use client";

/**
 * Bring the PRESSED chip of a horizontally-scrolling strip into view on load.
 *
 * 🔴 THE DEFECT THIS CLOSES, MEASURED AT 360 ON 2026-09-06 AND FOUND BY LOOKING AT THE PICTURE,
 * not by any gate. `/markets`'s status strip is `overflow-x-auto` below `lg` — the kit's ruling,
 * because status and sort must never cost a tap — and it opened at `scrollLeft: 0` regardless of
 * which lens was active. With six statuses the fourth one starts past the fold, so a player who
 * tapped **In progress** landed on a board whose strip read `Open · Closing today · Mpy…` with
 * the chip they had just pressed entirely off-screen. Nothing on the page said which lens they
 * were in. In Swahili the clipped label collided with the result count.
 *
 * ⚠️ It was PRE-EXISTING for `Watching` and `All`, and adding a sixth chip is what made it land
 * on the feature this session shipped. Both are fixed by the same three lines.
 *
 * ⛔ THE ARITHMETIC IS NOT HERE. `centredScrollLeft` in `src/lib/strip-scroll.ts` is shared with
 * `Tabs`, which solved this first (DG-S-07) and whose header records the three traps — rects not
 * `offsetLeft`, `scrollLeft` not `scrollIntoView`, and no smooth behaviour. A second copy is how
 * two surfaces start disagreeing about where "centred" is.
 *
 * ⭐ IT TAKES NO PROPS AND HOLDS NO REF. `discovery-bar.tsx` is a SERVER component, so a ref
 * cannot cross to it; this leaf finds its targets by the `data-strip-autoscroll` attribute the
 * strip already carries. That keeps the boundary one-directional — a client leaf inside a server
 * tree — rather than turning the bar itself into a client component and pulling the whole
 * discovery contract into the browser bundle.
 */
import { useEffect } from "react";
import { centredScrollLeft } from "@/lib/strip-scroll";

export function StripAutoScroll() {
  useEffect(() => {
    for (const rail of Array.from(document.querySelectorAll<HTMLElement>("[data-strip-autoscroll]"))) {
      // Nothing to correct when everything already fits — and this is also what makes the
      // component inert at `lg`+, where the strip wraps instead of scrolling.
      if (rail.scrollWidth <= rail.clientWidth) continue;
      const active = rail.querySelector<HTMLElement>('[aria-pressed="true"], [aria-current="page"]');
      if (!active) continue;
      const railBox = rail.getBoundingClientRect();
      const itemBox = active.getBoundingClientRect();
      rail.scrollLeft = centredScrollLeft({
        railLeft: railBox.left,
        scrollLeft: rail.scrollLeft,
        clientWidth: rail.clientWidth,
        scrollWidth: rail.scrollWidth,
        itemLeft: itemBox.left,
        itemWidth: itemBox.width,
      });
    }
  });
  return null;
}
