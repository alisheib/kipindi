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
  if (locale === "sw") return sw || en;
  if (locale === "zh") return zh || en;
  return en;
}
