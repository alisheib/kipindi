/**
 * /live's "n tipping" count and "Most contested" carousel, through the ONE price rule (landing v3 C1).
 *
 * An empty or one-sided pool has no price (MOBILE-VISUAL ruling 13, D29), so it is not a contest: never
 * counted, never featured, however thin the wall. A lopsided two-sided market stays, at its 1–99 price
 * (INHERIT-MANIFEST L14). "Tipping" is the platform's one rule, `isTipping` (R6(2), |YES − 50| ≤ 3).
 *
 * 🔴 THE HISTORY THIS REPLACES (PV-06, 2026-09-03, then C1). The wall first scored an untouched pool at a
 * hardcoded 50, so a market NOBODY had bet on sorted first and was promoted into the hero carousel as the
 * most contested question, under a 32px bar drawn at a perfect half-and-half; PV-06 dropped the EMPTY pool.
 * Until C1 a ONE-SIDED pool still passed (the raw share is 100 or 0, never null), so a market with money on
 * one side could be featured as a "100% · 0%" pill, and the header counted "tipping" within 8 points while
 * every other surface used 3 or 4.
 *
 * Pure: it imports only `./price-state` — no server code, no "use client".
 */
import { isTipping, shownYesPct } from "./price-state";

export function liveContest<T extends { yesPool: number; noPool: number }>(rows: readonly T[], take = 6) {
  const priced = rows.flatMap((row) => {
    const yesPct = shownYesPct(row.yesPool, row.noPool);
    return yesPct === null ? [] : [{ row, yesPct }];
  });
  return {
    tipping: priced.filter((p) => isTipping(p.yesPct)).length,
    // Closest to an even split first; ties go to the bigger pool, as /markets' "Closest call" does.
    mostContested: [...priced]
      .sort((a, b) => Math.abs(a.yesPct - 50) - Math.abs(b.yesPct - 50) || (b.row.yesPool + b.row.noPool) - (a.row.yesPool + a.row.noPool))
      .slice(0, take),
  };
}
