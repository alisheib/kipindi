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
 * ⛔ ONE IMPORT, AND ONLY ONE: `lib/eat-day.ts`. That file is itself import-free and is the single
 * home of the EAT offset — its own header forbids copying it — so taking the day boundary from it
 * is the rule being followed rather than an exception to "no imports". ⛔ Nothing else may be
 * imported here: this module is read by pure contracts that must not drag a server or client
 * module into the wrong graph.
 */
import { eatDayKey, eatDayStartMs } from "@/lib/eat-day";

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
 * 🔴 THE DAY BOUNDARY IS EAT, AND REPAIRING THAT IS WHY THIS FUNCTION EARNS ITS EXISTENCE RATHER
 * THAN MERELY TIDYING FIVE COPIES. Every copy computed `new Date(d.getFullYear(), d.getMonth(),
 * d.getDate())` — midnight in whatever zone the SERVER happens to run in. No `TZ` is set anywhere
 * in this repo, so on Railway that is UTC, while every timestamp on the same page is rendered
 * through `formatDateTime`, which uses the platform timezone (`Africa/Dar_es_Salaam`, `utils.ts`).
 * The two disagree by three hours and the failure is concrete:
 *
 *     a deposit at 01:00 EAT on the 8th  ==  22:00 UTC on the 7th
 *     the row RENDERS "8 Sep" (EAT) and the `Today` pill EXCLUDES it,
 *     because the UTC day does not begin until 03:00 EAT
 *
 * ⛔ So a player looking for what they did an hour ago pressed `Today` and was told it had not
 * happened — on the one axis this campaign exists to make trustworthy, on five shipped routes at
 * once. ⚠️ `lib/eat-day.ts` states the rule and it was not followed: *"If you need EAT day maths
 * anywhere else, import it; do not copy the offset."* It was copied five times.
 *
 * ⭐ `utils.ts:289-295` records the SAME defect class already fixed once, for RENDERING — three
 * player-facing surfaces formatted "in whatever zone the server happens to run in — three hours off
 * EAT". The render was repaired and the FILTER was not, so the page went on printing an EAT date
 * beside a UTC-bucketed pill. ⛔ A date that is displayed in one calendar and filtered in another
 * is not a smaller bug than a wrong number; it is the same bug twice.
 *
 * ⚠️ `7d` AND `30d` ARE UNAFFECTED and stay rolling from `nowMs`: "7 days" is a length of time, not
 * a calendar span, so it has no day boundary to get wrong. Only `today` and `yesterday` are
 * calendar days — which is exactly why only those two were wrong.
 *
 * ⛔ TAKES A NUMBER, NOT A ROW. Each contract keeps its own one-line predicate naming WHICH date it
 * windows over — `placedAt` on `/positions`, `createdAt` on `/wallet`, `resolvedAt` on `/results`
 * — because that choice is real per-page knowledge and is argued in each file. What they no longer
 * each own is the arithmetic.
 */
export function inWindow(ms: number, when: PlayerPresetId, nowMs: number): boolean {
  if (when === "all") return true;
  // ⛔ THE EAT DAY, through the one module that owns the offset — never `new Date(y, m, d)`, which
  //    is the server's zone, and never a re-typed `3 * 60 * 60 * 1000`.
  const startOfToday = eatDayStartMs(eatDayKey(nowMs));
  switch (when) {
    case "today": return ms >= startOfToday;
    case "yesterday": return ms >= startOfToday - DAY_MS && ms < startOfToday;
    case "7d": return ms >= nowMs - 7 * DAY_MS;
    case "30d": return ms >= nowMs - 30 * DAY_MS;
  }
}
