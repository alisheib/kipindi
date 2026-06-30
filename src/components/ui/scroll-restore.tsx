"use client";

/**
 * ScrollRestore — opts into native browser scroll restoration.
 *
 * Next.js App Router sets `history.scrollRestoration = "manual"` which
 * can lose scroll position on mobile back/forward navigation. This
 * component restores the browser's native behaviour so the user lands
 * back where they were when they tap the back button.
 */

import { useEffect } from "react";

export function ScrollRestore() {
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "auto";
    }
  }, []);
  return null;
}
