"use client";

/**
 * THE JOURNEY FLAG — renders nothing; while it is mounted, the html element carries `data-journey` (the Vodacom plan S6;
 * S6-PLAN WP2 step 5). `useJourneyOn` (`lib/journey/journey-on.ts`) is how the overlays read it.
 *
 * ⛔ AppShell mounts it ONLY behind `journeyShown` (WP7) — the one per-request resolver's answer — so a page the server
 * did not put in the journey never carries the attribute — lazily, in its own chunk, so a classic page never loads it:
 * `next/dynamic` in `layout/shell-lazy.tsx` (WP6c). AppShell's own `React.lazy` binding had split nothing, so until
 * WP6c this file rode in every page's first load with the shell's other lazy parts (VODACOM-PLAN §0h point 20).
 * ⭐ The cleanup lowers the flag and announces it: an Owner Stop or a pass ending swaps the shell on `router.refresh()`,
 * this unmounts, and every overlay comes back without a reload.
 */
import { useEffect } from "react";
import { raiseJourneyFlag } from "@/lib/journey/journey-on";

export function JourneyFlag() {
  useEffect(() => raiseJourneyFlag(), []);
  return null;
}
