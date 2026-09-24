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
/**
 * 🔴 D75 · HOW LONG THE BUBBLE STAYS UP AFTER THE READER STOPS TOUCHING THE PAGE.
 * D3 got it out of the way while the page MOVES. It still covered content AT REST, which is
 * where it was measured doing real damage: on production at 360, **100% of a market card's
 * `NDIO` probability cap**; at 414, **16% of a `HAPANA @ 12%` button** — a betting control.
 * Ali's call (2026-09-24), against the alternatives of insetting every price on every phone or
 * accepting it: the bubble shows itself, then gets out of the way until it is asked for.
 */
const FAB_IDLE_MS = 3000;
/**
 * ⛔ AND THIS DELAY IS THE WHOLE SAFETY OF THE FEATURE. Waking on `pointerdown` would make the
 * bubble interactive again DURING the gesture, so the `click` the browser then synthesises could
 * hit the bubble instead of the control the finger actually went for — which is D66's defect
 * exactly (a state change on pointerdown, a navigation from the click that followed) and, worse,
 * it would re-create the very tap-theft D30 fixed. The wake is therefore deferred past the whole
 * pointerdown → pointerup → click sequence. 250ms is the same settle this file already uses.
 */
const FAB_WAKE_MS = 250;

export function HeaderScrollCast() {
  useEffect(() => {
    const root = document.documentElement;
    let on: boolean | null = null;
    let moving = false;
    let idle: ReturnType<typeof setTimeout> | undefined;

    /**
     * 🔴 D75 · `data-fab-idle` — SET WHEN THE READER HAS NOT TOUCHED THE PAGE FOR 3s.
     *
     * ⚠️ WHEN IT IS SET THE BUBBLE IS NOT MERELY FADED, IT IS `pointer-events: none` (globals.css).
     * That is the point rather than a detail: a 44px square that is invisible and still takes taps
     * is strictly worse than a visible one, and it is the defect D30 documented — a player aiming
     * at a control and opening a support chat.
     *
     * ⭐ WAKING IS DELIBERATELY CHEAP TO TRIGGER: any scroll, any tap anywhere, any key. A reader
     * who wants the bubble does not have to know the rule — touching the screen at all brings it
     * back. And a keyboard user never loses it, because `:focus-within` overrides this the same
     * way it overrides D3's scroll rule.
     *
     * ⛔ THE CHAT BEING OPEN NEEDS NO SPECIAL CASE HERE. `.cm-fab--open` is already excluded by
     * the CSS selector, so an open panel cannot be faded out by a sleeping timer. Adding a JS
     * guard for it would be a second definition of the same rule, free to drift from the first.
     */
    let asleep = false;
    let wake: ReturnType<typeof setTimeout> | undefined;
    const sleep = () => {
      if (asleep) return;             // one attribute write per transition, never per event
      asleep = true;
      root.setAttribute("data-fab-idle", "");
    };
    const rouse = (delay: number) => {
      clearTimeout(wake);
      wake = setTimeout(() => {
        if (asleep) {
          asleep = false;
          root.removeAttribute("data-fab-idle");
        }
        clearTimeout(nap);
        nap = setTimeout(sleep, FAB_IDLE_MS);
      }, delay);
    };
    let nap: ReturnType<typeof setTimeout> = setTimeout(sleep, FAB_IDLE_MS);
    const rouseNow = () => rouse(0);
    const rouseLater = () => rouse(FAB_WAKE_MS);
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
    // ⚠️ Scroll may rouse IMMEDIATELY because `data-scrolling` is keeping the bubble hidden
    // anyway for another 250ms — there is no frame in which a moving page shows an interactive
    // bubble. A tap and a key must wait out the click; see FAB_WAKE_MS.
    window.addEventListener("scroll", rouseNow, { passive: true });
    window.addEventListener("pointerup", rouseLater, { passive: true });
    window.addEventListener("keydown", rouseLater, { passive: true });
    return () => {
      window.removeEventListener("scroll", apply);
      window.removeEventListener("scroll", rouseNow);
      window.removeEventListener("pointerup", rouseLater);
      window.removeEventListener("keydown", rouseLater);
      clearTimeout(idle);
      clearTimeout(nap);
      clearTimeout(wake);
      // ⛔ BOTH attributes are cleared on unmount, and for the same reason: a route change
      // mid-scroll, or mid-nap, would otherwise leave the flag on `<html>` for good and the
      // bubble would never come back on any page.
      root.removeAttribute("data-scrolling");
      root.removeAttribute("data-fab-idle");
    };
  }, []);
  return null;
}
