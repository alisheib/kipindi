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
import { useEffect, useRef } from "react";
import { centredScrollLeft } from "@/lib/strip-scroll";

export function StripAutoScroll() {
  /**
   * 🔴 WHICH LENS EACH RAIL HAS ALREADY BEEN FRAMED FOR — added 2026-09-06 after an adversarial
   * audit confirmed the first version fought the reader.
   *
   * The effect deliberately has NO dependency array (this component takes no props, so there is
   * nothing to key on, and `[]` would stop it re-framing after a client-side navigation to a new
   * lens). But `/markets` mounts `<RefreshPoller intervalMs={30_000}/>`, whose `router.refresh()`
   * re-renders this tree every thirty seconds — and `centredScrollLeft` is INVARIANT of the
   * current scroll (`itemLeft` moves by exactly what `scrollLeft` moves), so each re-render
   * rewrote the same absolute position. A player who dragged the six-chip strip sideways to
   * reach `Watching` or `All` had it snapped back, every 30s, for as long as the page was open —
   * on the very control the sixth lens made harder to reach, and in direct contradiction of the
   * poller's own documented contract: "no flash, no scroll reset, no layout shift".
   *
   * ⭐ SO THE GUARD IS IDENTITY, NOT TIME. Each rail is framed ONCE per pressed lens. Tap a
   * different chip and the identity changes, so it re-frames; poll thirty times on the same lens
   * and it does nothing at all. ⛔ A `useRef` and not module state: two boards on one page must
   * not share a memory, and a remount (a real navigation) SHOULD re-frame.
   */
  const framed = useRef(new WeakMap<HTMLElement, string>());

  useEffect(() => {
    for (const rail of Array.from(document.querySelectorAll<HTMLElement>("[data-strip-autoscroll]"))) {
      // Nothing to correct when everything already fits — and this is also what makes the
      // component inert at `lg`+, where the strip wraps instead of scrolling.
      if (rail.scrollWidth <= rail.clientWidth) continue;
      const active = rail.querySelector<HTMLElement>('[aria-pressed="true"], [aria-current="page"]');
      if (!active) continue;
      // ⛔ ONCE PER LENS. After this, the horizontal scroll belongs to the reader.
      const lens = active.getAttribute("data-chip") ?? active.textContent ?? "";
      if (framed.current.get(rail) === lens) continue;
      framed.current.set(rail, lens);
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
