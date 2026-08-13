/**
 * ONE localised label per market category.
 *
 * ⛔ WHY THIS IS A MODULE. The eight-item category list was re-declared in five places, and the
 * label mapping lived as a private function inside `src/app/markets/page.tsx` — so `/results`
 * carried its own hand-written copy of both. A list that exists twice drifts: `MARKET_CATEGORIES`
 * holds SEVEN categories (politics is licence-excluded, `market-service.ts:74`), and any surface
 * spelling its own list can silently gain or lose one. Derive the ids from `MARKET_CATEGORIES` and
 * the labels from here.
 *
 * The type import is type-only, so nothing server-side is pulled into a client bundle by it.
 */
import type { MarketCategory } from "@/lib/server/market-service";
import type { Dict } from "@/lib/i18n-dict";

/** The dict group is `market` (singular) — there is no `markets.*`. */
export function categoryLabel(t: Dict, c: MarketCategory): string {
  switch (c) {
    case "sports": return t.market.catSports;
    case "macro": return t.market.catMacro;
    case "weather": return t.market.catWeather;
    case "crypto": return t.market.catCrypto;
    case "culture": return t.market.catCulture;
    case "tech": return t.market.catTech;
    case "other": return t.market.catOther;
  }
}

/**
 * `all` plus every real category, in `MARKET_CATEGORIES` order.
 * The caller passes the list so this file needs no runtime import from the server module.
 */
export function categoryOptions(
  t: Dict,
  categories: readonly MarketCategory[],
): Array<{ id: "all" | MarketCategory; label: string }> {
  return [
    { id: "all", label: t.market.catAll },
    ...categories.map((c) => ({ id: c, label: categoryLabel(t, c) })),
  ];
}
