"use client";

/**
 * useModalLock — body scroll lock + viewport zoom reset for modals.
 *
 * On Android, users accidentally pinch-zoom the page. When a `fixed inset-0`
 * modal opens, it renders at the full layout viewport, but the user's visual
 * viewport is zoomed in — they only see a portion of the modal and have to
 * zoom out to reach the buttons. This hook:
 *
 *   1. Temporarily sets `maximum-scale=1` on the viewport meta tag to snap
 *      the zoom back to 1× when the modal opens.
 *   2. Adds `overflow: hidden` to `<html>` to prevent background scroll.
 *   3. Restores both on close.
 *
 * Call with `useModalLock(open)` in every portaled modal component.
 */
import { useEffect } from "react";

// Track nested modal count so we only restore when the LAST modal closes.
let lockCount = 0;
let savedMaxScale: string | null = null;

function getViewportMeta(): HTMLMetaElement | null {
  return document.querySelector('meta[name="viewport"]');
}

export function useModalLock(open: boolean) {
  useEffect(() => {
    if (!open) return;

    lockCount++;

    // --- Body scroll lock ---
    const html = document.documentElement;
    // Only apply on first lock (don't double-set)
    if (lockCount === 1) {
      html.style.overflow = "hidden";

      // --- Viewport zoom reset (Android pinch-zoom fix) ---
      const meta = getViewportMeta();
      if (meta) {
        const content = meta.getAttribute("content") ?? "";
        // Save original maximum-scale value
        const match = content.match(/maximum-scale\s*=\s*([\d.]+)/);
        savedMaxScale = match ? match[1] : null;
        // Set maximum-scale=1 to snap zoom back to 1×
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
