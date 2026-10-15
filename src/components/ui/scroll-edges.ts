"use client";

/**
 * WHICH EDGES OF A SCROLLING BOX HIDE SOMETHING — the one rule behind every faded scroller (`data-edges`).
 *
 * Born twice: the scrolling strip's fade (`strip-autoscroll.tsx`, the inline axis, 2026-10-08 · G1) and the How to Play
 * sheet's steps (`how-to-play-sheet.tsx`, the block axis, the Vodacom plan S7 WP6) each read the same four states from
 * their own copy of the same arithmetic. The bet sheet's middle (`.kp-bsheet__scroll`) needed it a third time (the visual
 * audit of 2026-10-14, F50: the sheet's scroll body was cut hard at both edges, so at 320 the first screen ended through
 * the projected win, "≈ TZS 1,153" sliced by the commit button, and a scrolled stake box was cut under the header), so
 * the arithmetic lives here once and every faded scroller reads it.
 *
 * ⭐ THE STATES: "start", "end", "both" or "none" — which edges have more beyond them — and the stylesheet fades exactly
 * those (`.kp-strip-fade[data-edges]`, `.kp-howto__scroll[data-edges]` / `.kp-bsheet__scroll[data-edges]`), so a box that
 * fits draws no fade. ⚠️ 1px of slack each way: a scroll offset is fractional on a high-density screen, and a box
 * scrolled to its end can stop half a pixel short of its range.
 *
 * ⭐ `useBlockScrollEdges` MARKS A BLOCK-AXIS BOX WITHOUT READING LAYOUT INSIDE THE COMMIT. Its first mark is the
 * ResizeObserver's first report, which a browser delivers after it lays the frame out and before it paints it — so the
 * first painted frame already fades the right edges, and the tap that opens a sheet pays for no layout read of its own
 * (the bet sheet's tap-to-first-frame budget, S8 A21: a read in a layout effect forces the whole sheet's layout inside the
 * tap's task). It marks again on every scroll, on any change of the box's size or a child's, and when a child comes or
 * goes (a MutationObserver re-observes the children: a child added to a box held at its cap changes what it hides without
 * changing any observed size). A mark only writes an attribute, and only when it changed — a paint, never a layout.
 * The optional gutter variable is also written from the size report. This lets the bet sheet's pinned footer align to
 * its scroller in engines whose scrollbar is 8px at some widths and an overlay (0px) at others, without a layout read in
 * the opening tap or a fixed 8px inset that misaligns WebKit.
 */
import { useLayoutEffect, type RefObject } from "react";

export type ScrollEdges = "start" | "end" | "both" | "none";

/** The edges that hide something, from a box's scroll offset and its scroll and client lengths on one axis. */
export function scrollEdges(offset: number, scrollLength: number, clientLength: number): ScrollEdges {
  const max = scrollLength - clientLength;
  const before = max > 1 && offset > 1;
  const after = max > 1 && offset < max - 1;
  return before && after ? "both" : before ? "start" : after ? "end" : "none";
}

/** Writes a block-axis box's `data-edges` when it changed, and returns it. */
export function markBlockEdges(box: HTMLElement): ScrollEdges {
  const edges = scrollEdges(box.scrollTop, box.scrollHeight, box.clientHeight);
  if (box.getAttribute("data-edges") !== edges) box.setAttribute("data-edges", edges);
  return edges;
}

/** Keeps `data-edges` on the box `ref` holds for as long as it is mounted (see the header). */
export function useBlockScrollEdges(ref: RefObject<HTMLElement | null>, gutterVar?: string): void {
  useLayoutEffect(() => {
    const box = ref.current;
    if (!box) return;
    const markScrollEdges = () => { markBlockEdges(box); };
    const markSize = () => {
      markScrollEdges();
      if (gutterVar && box.parentElement) {
        const gutter = Math.max(0, box.offsetWidth - box.clientWidth - box.clientLeft * 2);
        const value = `${gutter}px`;
        if (box.parentElement.style.getPropertyValue(gutterVar) !== value) box.parentElement.style.setProperty(gutterVar, value);
      }
    };
    box.addEventListener("scroll", markScrollEdges, { passive: true });
    // No observer (an engine older than 2020): one mark now, and the scroll keeps it.
    if (typeof ResizeObserver === "undefined") {
      markSize();
      return () => box.removeEventListener("scroll", markScrollEdges);
    }
    const sizes = new ResizeObserver(markSize);
    const watchChildren = () => {
      sizes.disconnect();
      sizes.observe(box);
      for (const child of Array.from(box.children)) sizes.observe(child);
    };
    watchChildren();
    const kids = typeof MutationObserver === "undefined" ? null : new MutationObserver(watchChildren);
    kids?.observe(box, { childList: true });
    return () => {
      box.removeEventListener("scroll", markScrollEdges);
      sizes.disconnect();
      kids?.disconnect();
    };
  }, [ref, gutterVar]);
}
