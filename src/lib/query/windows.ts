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

export const DAY_MS = 24 * 3600_000;

/**
 * ⭐ THE SPAN ITSELF, AND NOT MERELY THE NAME OF IT.
 *
 * 🔴 THIS FILE OWNED THE VOCABULARY AND NOT THE ARITHMETIC, WHICH IS HALF A RULE. Its own header
 * says *"'LAST 30 DAYS' MUST MEAN THE SAME SPAN EVERYWHERE"* — and the span was then hand-written
 * FIVE times, once per contract, plus a sixth range-shaped copy in `app/wallet/page.tsx`.
 * Re-derive what it was:
 *
 *     grep -rn "const startOfToday" src/lib src/app
 *
 * The five predicates were byte-identical but for the field they read, and each carried its own
 * `24 * 3600_000` under a different name (`DAY_MS` · `BOARD_DAY_MS` · `ARCHIVE_DAY_MS` ·
 * `UD_DAY_MS` · `LEDGER_DAY_MS`), none of which had a single reader outside its own file. Sharing
 * a LIST of ids while copying the arithmetic is precisely how "last 30 days" comes to mean two
 * spans: nothing would have gone red if one copy had been retuned, because no gate compares them.
 * §0a — one fact, one home.
 *
 * ⛔ `today` AND `yesterday` ARE CALENDAR DAYS; `7d` AND `30d` ARE ROLLING. That asymmetry is the
 * shipped behaviour of all five copies and is preserved verbatim — it is also what the words mean:
 * "today" is a day on a calendar, "7 days" is a length of time. ⚠️ Do not "regularise" one into the
 * other; `/profile/activity` labelled a rolling 30-day window *"This month"* and that is a false
 * statement about a span, not a naming preference (task 4.13).
 *
 * ⚠️ THE DAY BOUNDARY IS THE SERVER'S LOCAL MIDNIGHT, via `new Date(y, m, d)`. That is what every
 * copy did and it is not re-decided here. It is NOT the EAT-anchored `startOfEatDay` that
 * `lib/server/date-range.ts` uses for the admin range vocabulary — a difference that matters only
 * for a deployment whose server clock is not on EAT, and one that must be changed in a single
 * commit for every surface if it is ever changed at all. Recording it is the point: it now has one
 * home to change.
 *
 * ⛔ TAKES A NUMBER, NOT A ROW. Each contract keeps its own one-line predicate naming WHICH date it
 * windows over — `placedAt` on `/positions`, `createdAt` on `/wallet`, `resolvedAt` on `/results`
 * — because that choice is real per-page knowledge and is argued in each file. What they no longer
 * each own is the arithmetic.
 */
export function inWindow(ms: number, when: PlayerPresetId, nowMs: number): boolean {
  if (when === "all") return true;
  const d = new Date(nowMs);
  const startOfToday = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  switch (when) {
    case "today": return ms >= startOfToday;
    case "yesterday": return ms >= startOfToday - DAY_MS && ms < startOfToday;
    case "7d": return ms >= nowMs - 7 * DAY_MS;
    case "30d": return ms >= nowMs - 30 * DAY_MS;
  }
}
