/**
 * THE MARKET CATEGORY LIST — one definition, and it is PURE.
 *
 * ⛔ WHY IT LEFT `market-service.ts` (2026-09-07). The list and its type were correct there and
 * nothing about them changed; what changed is who needs them. `lib/positions/portfolio.ts` — a
 * pure contract module, and every player-query contract after it — derives its topic filter from
 * this list, and reaching into `market-service` for a VALUE drags the whole server graph behind
 * it. `CLAUDE.md` records what that costs on this codebase: `audit.ts` was reachable from the
 * CLIENT graph, so importing `hashKey64` from `locks.ts` pulled `node:async_hooks` into a browser
 * chunk and **broke the build**. `category-label.ts` already imports the type `type`-only for
 * exactly this reason; a value cannot be erased that way.
 *
 * ⭐ `market-service.ts` re-exports both, so every existing import keeps working and there is
 * still ONE definition (§0a). ⛔ Do not re-declare this list anywhere — `category-label.ts`'s own
 * header records that it was re-declared in five places and the copies drifted.
 *
 * ⛔ NO IMPORTS. That is the property that makes it safe from either side of the boundary.
 */

// NOTE: Politics is intentionally NOT in this list — Tanzania Gaming Board
// licence terms exclude political-event markets. Operators caught listing
// political markets risk the licence. Do not add it back without a written
// regulator carve-out.
export type MarketCategory = "sports" | "macro" | "weather" | "crypto" | "culture" | "tech" | "other";

/** The canonical, ordered set of market categories — the ONE list every surface
 *  (source registry, admin filters, generation, player topic rails) derives from
 *  rather than re-declaring its own copy. */
export const MARKET_CATEGORIES: readonly MarketCategory[] = [
  "sports", "macro", "weather", "crypto", "culture", "tech", "other",
] as const;
