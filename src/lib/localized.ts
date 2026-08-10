import type { Locale } from "./i18n-dict";

/**
 * Pick the SINGLE display string for the active locale from multilingual entity
 * data (e.g. a market's titleEn / titleSw / titleZh). Markets, proposals and
 * notifications store English + Swahili + (optionally) Chinese display titles.
 *
 * English is the CANONICAL language: any missing or empty translation falls
 * back to English, so the UI always renders exactly ONE language and never a
 * blank. Resolution (who wins / gets paid) is judged against the English
 * criterion regardless of which title a player reads.
 *
 * Use this wherever entity copy is shown so the UI renders exactly ONE
 * language — never English with a translation beside it.
 */
export function pickLocalized(
  locale: Locale,
  en: string,
  sw?: string | null,
  zh?: string | null,
): string {
  // Treat null / "" / whitespace-only translations as absent so we never render
  // a blank or whitespace title — always fall back to the canonical English.
  if (locale === "sw") return sw && sw.trim() ? sw : en;
  if (locale === "zh") return zh && zh.trim() ? zh : en;
  return en;
}

/**
 * The localised label for a market CATEGORY.
 *
 * ⛔ ONE DEFINITION, because there were two and one of them was raw. The card built
 * this map inline (correctly, with an `other` arm that the older `categoryLabel()`
 * helper lacks), while the market DETAIL page rendered `{m.category}` straight into a
 * chip — so a Swahili player read "MICHEZO" on the filter rail, "MICHEZO" on the card,
 * and then "sports" on the page they had just opened from it. The detail page is also
 * where the same header shows a fully localised status chip beside it, which made the
 * untranslated one read as a rendering fault rather than a missing translation.
 *
 * Accepts any casing and falls back to "Other" for an unknown category rather than
 * rendering blank — an unrecognised value must not produce an empty chip.
 */
export function marketCategoryLabel(
  t: { market: { catSports: string; catMacro: string; catWeather: string; catCrypto: string; catCulture: string; catTech: string; catOther: string } },
  category: string | null | undefined,
): string {
  const map: Record<string, string> = {
    SPORTS: t.market.catSports, MACRO: t.market.catMacro, WEATHER: t.market.catWeather,
    CRYPTO: t.market.catCrypto, CULTURE: t.market.catCulture, TECH: t.market.catTech,
    OTHER: t.market.catOther,
  };
  return map[(category ?? "").toUpperCase()] ?? t.market.catOther;
}
