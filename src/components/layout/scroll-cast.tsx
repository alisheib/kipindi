"use client";

/**
 * The header's scrolled state: no cast at rest, `--shadow-2` once the page has moved
 * (kit §2 — "none at rest · `var(--shadow-2)` scrolled, 140ms ease-out").
 *
 * ⭐ WHY A CLASS TOGGLE AND NOT A SCROLL-DRIVEN STYLE. It writes one class, once, on each side of
 * `scrollY > 0` — so it is not a per-frame style write on the element the browser is already
 * compositing every frame while the page scrolls. The listener is passive for the same reason. On
 * the low-end Android this product targets, the cheap version of a shadow is the only version
 * worth having.
 *
 * ⚠️ It reads the CURRENT scroll position on mount, not just on the first event: a page restored
 * mid-scroll (back button, a `#anchor` load, a refresh partway down) would otherwise render a flat
 * bar over scrolled content until the reader happened to move.
 *
 * The transition lives in `globals.css` beside the class, so the duration comes from the motion
 * ladder rather than from a number typed here (`test:motion-ladder`).
 */
import { useEffect } from "react";

/**
 * ⭐ THE FLAG GOES ON `<html>`, NOT ON THE HEADER — and that is not a style choice.
 * `.app-topbar` is rendered by `TopAppBar`, so REACT OWNS ITS `className`: a class toggled onto it
 * from outside would be wiped by the next reconcile of that component, and writing it during
 * hydration is how the sibling reveal effect produced a real hydration mismatch on 9 of 12
 * width×locale frames. A data attribute on the document element is outside React's tree
 * altogether, which is exactly how this codebase already drives `[data-motion="reduced"]`.
 */
export function HeaderScrollCast() {
  useEffect(() => {
    const root = document.documentElement;
    let on: boolean | null = null;
    let moving = false;
    let idle: ReturnType<typeof setTimeout> | undefined;
    const apply = () => {
      const should = window.scrollY > 0;
      if (should !== on) {            // one attribute write per crossing, not per frame
        on = should;
        if (should) root.setAttribute("data-scrolled", "");
        else root.removeAttribute("data-scrolled");
      }
      /**
       * 🔴 D3 · `data-scrolling` — TRUE WHILE THE READER IS MOVING, GONE 250ms AFTER THEY STOP.
       * The chat bubble covers content on nine surfaces, and a player reported it. It cannot simply be
       * moved: wherever it sits, it sits on something. So it gets out of the way while the page is in
       * motion — which is exactly when nobody is reaching for it — and returns the moment the reader
       * settles, which is when they might want it.
       * ⭐ ONE WRITE PER BURST, NOT PER FRAME, for the same reason `data-scrolled` is written that way:
       * this listener runs while the browser is compositing every frame, on a low-end Android. The
       * `moving` flag is what keeps a burst to a single `setAttribute`.
       * ⚠️ The timer is cleared on unmount as well as on each event, or a route change mid-scroll leaves
       * the attribute set on `<html>` forever and the bubble never comes back.
       */
      if (!moving) {
        moving = true;
        root.setAttribute("data-scrolling", "");
      }
      clearTimeout(idle);
      idle = setTimeout(() => {
        moving = false;
        root.removeAttribute("data-scrolling");
      }, 250);
    };
    apply();                          // a page restored mid-scroll starts cast
    window.addEventListener("scroll", apply, { passive: true });
    return () => {
      window.removeEventListener("scroll", apply);
      clearTimeout(idle);
      root.removeAttribute("data-scrolling");
    };
  }, []);
  return null;
}
