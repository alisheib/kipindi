"use client";

/**
 * useModalLock — body scroll lock + viewport zoom reset for modals.
 *
 * Fixes two Android-specific issues:
 *
 *   1. Pinch-zoom: users accidentally zoom the page. Modals render at the
 *      layout viewport but the visual viewport is zoomed in — buttons are
 *      off-screen. Fix: snap maximum-scale=1 on open.
 *
 *   2. Horizontal overflow: if any page element bleeds wider than the
 *      viewport (e.g. SVG overflow-visible, wide table), `fixed inset-0`
 *      fills the layout viewport (wider than screen), and the modal card
 *      appears shifted/clipped. Fix: reset horizontal scroll to 0 and
 *      lock overflow on both <html> and <body>.
 *
 * Call with `useModalLock(open)` in every portaled modal component.
 */
import { useEffect } from "react";

let lockCount = 0;
let savedMaxScale: string | null = null;
let savedScrollX = 0;

function getViewportMeta(): HTMLMetaElement | null {
  return document.querySelector('meta[name="viewport"]');
}

export function useModalLock(open: boolean) {
  useEffect(() => {
    if (!open) return;

    lockCount++;
    const html = document.documentElement;
    const body = document.body;

    if (lockCount === 1) {
      // --- Kill horizontal scroll FIRST ---
      // On Android, horizontal overflow makes `fixed inset-0` position
      // relative to the wider layout viewport, not the visible screen.
      // Scrolling back to x=0 before locking ensures the modal is
      // centered on the actual screen.
      savedScrollX = window.scrollX;
      if (window.scrollX !== 0) {
        window.scrollTo(0, window.scrollY);
      }

      // --- Lock scroll on both html AND body ---
      // Some Android browsers (Samsung Internet, older Chrome) only
      // respect overflow:hidden on <body>, not <html>. Belt and braces.
      html.style.overflow = "hidden";
      body.style.overflow = "hidden";

      // --- Viewport zoom reset ---
      const meta = getViewportMeta();
      if (meta) {
        const content = meta.getAttribute("content") ?? "";
        const match = content.match(/maximum-scale\s*=\s*([\d.]+)/);
        savedMaxScale = match ? match[1] : null;
        if (savedMaxScale && savedMaxScale !== "1") {
          meta.setAttribute(
            "content",
            content.replace(/maximum-scale\s*=\s*[\d.]+/, "maximum-scale=1"),
          );
        }
      }
    }

    return () => {
      lockCount--;
      if (lockCount <= 0) {
        lockCount = 0;
        html.style.overflow = "";
        body.style.overflow = "";

        // Restore horizontal scroll position
        if (savedScrollX !== 0) {
          window.scrollTo(savedScrollX, window.scrollY);
          savedScrollX = 0;
        }

        // Restore original maximum-scale
        if (savedMaxScale && savedMaxScale !== "1") {
          const meta = getViewportMeta();
          if (meta) {
            const content = meta.getAttribute("content") ?? "";
            meta.setAttribute(
              "content",
              content.replace(/maximum-scale\s*=\s*[\d.]+/, `maximum-scale=${savedMaxScale}`),
            );
          }
          savedMaxScale = null;
        }
      }
    };
  }, [open]);
}
