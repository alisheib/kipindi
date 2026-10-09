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
import { useEffect, useLayoutEffect, useRef } from "react";
import { centredScrollLeft } from "@/lib/strip-scroll";

/**
 * ⭐ WHICH EDGES HAVE MORE CHIPS BEYOND THEM — 2026-10-08 · G1 [220 221 223 224 226 227 249 250 · 193 191].
 *
 * The strip's fade (`.kp-strip-fade`) was ONE static mask on the trailing edge. So a strip this leaf had
 * scrolled to frame the pressed chip showed the chips it had pushed off the LEADING edge cut mid-letter —
 * "te" of "Zote" at the left of Tiketi zangu at 320, with nothing to say more lay that way — while a strip
 * scrolled to its end, or one with nothing hidden at all, still dimmed its last chip on the right.
 * `data-edges` says which edges hide something ("start", "end", "both" or "none"), and the CSS fades exactly
 * those. ⛔ No attribute (no JavaScript yet, or a skeleton) reads as "end" — the trailing fade alone, which
 * is what a strip at scroll 0 with more to its right needs — so nothing changes when the script lands.
 * ⚠️ 1px of slack each way: `scrollLeft` is fractional on a high-density screen and a strip scrolled to its
 * end can stop half a pixel short of `scrollWidth - clientWidth`.
 */
function markEdges(rail: HTMLElement) {
  const max = rail.scrollWidth - rail.clientWidth;
  const before = max > 1 && rail.scrollLeft > 1;
  const after = max > 1 && rail.scrollLeft < max - 1;
  const edges = before && after ? "both" : before ? "start" : after ? "end" : "none";
  if (rail.getAttribute("data-edges") !== edges) rail.setAttribute("data-edges", edges);
}

/** Rails that already carry a scroll listener — a fact about the ELEMENT, so it lives and dies with it. ⛔ Not
 *  the per-lens framing memory below, which must stay per-board and so stays a ref. */
const watched = new WeakSet<HTMLElement>();

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

  /* ⭐ THE EDGES ARE MARKED BEFORE THE FIRST PAINT (round 5's follow-up, R5-H · G-3 — the journey flag's phases, for every
     DOM mark a first paint reads). `data-edges` decides the strip's fade, and the effect below runs after a
     transition's paint: after every move, a strip whose chips all fit drew its first frame with its end faded (the
     CSS's default for `.kp-strip-fade` with no mark, below lg), the last chip dimmed for a frame. So the mark is read
     here, in the layout phase, against the strip's real width; the effect below still frames the pressed chip (a scroll
     position, on the same phase as `Tabs`' framing) and reads the mark again after it scrolls. */
  useLayoutEffect(() => {
    for (const rail of Array.from(document.querySelectorAll<HTMLElement>("[data-strip-autoscroll]"))) markEdges(rail);
  });

  useEffect(() => {
    for (const rail of Array.from(document.querySelectorAll<HTMLElement>("[data-strip-autoscroll]"))) {
      // The edge fades follow the reader's own scrolling from here on (one listener per rail, ever),
      // and are set now, so a strip that needs no framing is right on this render too.
      if (!watched.has(rail)) {
        watched.add(rail);
        rail.addEventListener("scroll", () => markEdges(rail), { passive: true });
      }
      markEdges(rail);
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
      // The frame just moved the strip: its edges are read again in the same task, so the frame that
      // first shows the new scroll position shows its fades too.
      markEdges(rail);
    }
  });

  /* The edges also change when nothing scrolls: the viewport turns or resizes (the strip's own width), and the
     web fonts land (every chip's width). Each re-reads every rail; reading is idempotent, so two strips on one
     page each doing it costs nothing. */
  useEffect(() => {
    const all = () => {
      for (const rail of Array.from(document.querySelectorAll<HTMLElement>("[data-strip-autoscroll]"))) markEdges(rail);
    };
    window.addEventListener("resize", all);
    let live = true;
    document.fonts?.ready.then(() => { if (live) all(); }).catch(() => {});
    return () => { live = false; window.removeEventListener("resize", all); };
  }, []);
  return null;
}
