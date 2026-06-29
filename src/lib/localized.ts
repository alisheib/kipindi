import type { Locale } from "./i18n-dict";

/**
 * Pick the SINGLE display string for the active locale from bilingual entity
 * data (e.g. a market's titleEn + titleSw). Markets, proposals and
 * notifications store only English + Swahili text; Chinese and any missing
 * value fall back to English.
 *
 * Use this wherever entity copy is shown so the UI renders exactly ONE
 * language — never English with a Swahili gloss beside it.
 */
export function pickLocalized(locale: Locale, en: string, sw?: string | null): string {
  if (locale === "sw") return sw || en;
  return en; // en + zh (no Chinese entity data) fall back to English
}
