"use client";

/**
 * JUU/CHINI'S JOURNEY ARM, DEFERRED — the parts a journey reader's Up & Down pages draw, each loaded only when a render
 * uses it (the Vodacom plan S12, WP9–WP11; the shell's pattern, `layout/shell-lazy.tsx`, VODACOM-PLAN §0h point 20).
 *
 * ⭐ WHY A LOADER. The board card (`updown-card.tsx`) and the round page's stake panel (`round-stake-panel.tsx`) are client
 * modules every visitor downloads; each gains ONE prop and ONE same-slot ternary whose else arm is the classic element,
 * and imports only these declarations. The arm itself (`jud-arm.tsx`) is a chunk of its own, fetched when a journey
 * request renders it, so a classic first load carries the declarations and nothing of the arm.
 * ⛔ THE SERVER RENDER STAYS ON, AND NO OPTION OBJECT (the WP6c finding): with neither `ssr: false` nor `loading`,
 * `next/dynamic` adds no Suspense boundary of its own, so a journey reader's controls are in the first HTML.
 * ⭐ A PART WHOSE CODE NEVER ARRIVES IS LEFT OUT, NOT FATAL: each loader ends in the app's one lost-chunk guard.
 * ⭐ EACH PART IS NAMED (`displayName`) — "JudArm.TwoWay" where React's tools would read "LoadableComponent"; the first
 * name is also the marker `qa:first-load` finds this module's chunk by.
 */
import dynamic from "next/dynamic";
import { nothingIfLost } from "@/components/layout/lost-chunk";

// The board card's signed-in control, and the round page with no side chosen (WP9).
export const LazyJudTwoWay = dynamic(() => import("@/components/journey/updown/jud-arm").then((m) => m.JudTwoWay).catch(nothingIfLost));
// The round page's `?side=` panel, and the way back from a deposit, preset (WP9, WP10).
export const LazyJudConfirm = dynamic(() => import("@/components/journey/updown/jud-arm").then((m) => m.JudConfirm).catch(nothingIfLost));
// The round that closed while the player was away, and the way to the next one (WP11).
export const LazyJudRoundClosed = dynamic(() => import("@/components/journey/updown/jud-arm").then((m) => m.JudRoundClosed).catch(nothingIfLost));

LazyJudTwoWay.displayName = "JudArm.TwoWay";
LazyJudConfirm.displayName = "JudArm.Confirm";
LazyJudRoundClosed.displayName = "JudArm.RoundClosed";
