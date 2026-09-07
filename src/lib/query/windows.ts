/**
 * THE DATE-WINDOW VOCABULARY — one set of preset ids, shared by every surface that has a window.
 *
 * ⛔ WHY THEY LEFT `components/ui/datetime-range-filter.tsx` (2026-09-07). They were correct
 * there and nothing about them changed; what changed is who needs them. That file is a
 * `"use client"` component, and a pure server-rendered contract importing a VALUE from it drags a
 * client module into the server graph. `CLAUDE.md` records the shape of that failure on this
 * codebase — `tsc` clean, `next build` green, and every page down at runtime, because the
 * client/server boundary is a runtime contract a typechecker cannot see.
 *
 * ⭐ `datetime-range-filter.tsx` re-exports both, so every existing import keeps working and
 * there is still ONE definition (§0a).
 *
 * ⚠️ **"LAST 30 DAYS" MUST MEAN THE SAME SPAN EVERYWHERE.** That is the whole point of a shared
 * vocabulary rather than a per-page list, and it is why `/profile/activity` adopts it (task 4.13)
 * even though it gains no other control. A player who reads "last 30 days" on their wallet and
 * "last 30 days" on their positions is entitled to the same window.
 *
 * ⛔ NO IMPORTS.
 */

/** Full precise set for admin / finance / reports / transactions / analytics / logs. */
export const FULL_PRESETS = ["1h", "6h", "24h", "today", "yesterday", "7d", "30d", "mtd"] as const;

/**
 * Compact set for player-facing surfaces (still with Custom).
 *
 * ⚠️ `all` IS THE PLAYER DEFAULT and the admin set has no equivalent — an operator opens a
 * console to look at a period, a player opens their own history to see everything they have done.
 * A window that defaults to narrowing would hide a player's own money behind a control they never
 * touched.
 */
export const PLAYER_PRESETS = ["today", "yesterday", "7d", "30d", "all"] as const;

export type FullPresetId = (typeof FULL_PRESETS)[number];
export type PlayerPresetId = (typeof PLAYER_PRESETS)[number];
