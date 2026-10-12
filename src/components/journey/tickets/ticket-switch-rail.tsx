"use client";

/**
 * THE MASWALI | JUU/CHINI RAIL, LOADED ONLY WHERE IT IS DRAWN (the Vodacom plan S6, S6-PLAN WP9 step 3; VODACOM-PLAN
 * §0h point 20).
 *
 * ⭐ WHY A WRAPPER. `TicketSwitch` is a server component on two routes every reader opens, `/positions` and
 * `/updown/history`, and a client module a server file imports joins that route's first-load JavaScript for every
 * visitor — production showed it for AppShell's lazy imports (§0h point 20). So the server file imports only this small
 * client module, and this one asks for the kit's `Tabs` through `next/dynamic`: the kit's code is fetched when a journey
 * request draws the rail, and a reader the journey is not shown to never downloads it.
 * ⛔ THE SERVER RENDER STAYS ON — no option object, so no `ssr: false`. The rail is in the server's HTML, its current
 * link marked, so a journey reader's first paint already has it and nothing moves when the script lands. The precedent,
 * `layout/lazy-overlays.tsx`, turns it off only for overlays no first paint shows.
 * ⛔ The kit's item type is imported as a TYPE: erased at build, it loads nothing.
 * ⭐ A RAIL WHOSE CODE NEVER ARRIVES IS LEFT OUT, NOT FATAL (the Vodacom plan S7, S7-PLAN A13(a), 2026-10-12). The tabs'
 * chunk is a fetch of its own, and a `ChunkLoadError` with nothing to catch it took the page to the critical-error
 * screen. The loader ends in the app's one lost-chunk guard (`layout/lost-chunk.ts`), as the shell's parts do: the rail
 * is left out for the rest of that page's life (the page's heading and its list still stand), reported once per page;
 * any other error is thrown on. Only a journey request draws this rail, so no classic reader's page changes but by the
 * name of this module's chunk (`/positions`, `/updown/history`). `test:journey-tickets` 5.lazy holds the loader line.
 */
import dynamic from "next/dynamic";
import type { TabItem } from "@/components/ui/tabs";
import { nothingIfLost } from "@/components/layout/lost-chunk";

const Tabs = dynamic(() => import("@/components/ui/tabs").then((m) => m.Tabs).catch(nothingIfLost));

export function TicketSwitchRail({ ariaLabel, value, tabs }: { ariaLabel: string; value: string; tabs: TabItem[] }) {
  return <Tabs variant="line" ariaLabel={ariaLabel} value={value} tabs={tabs} />;
}
