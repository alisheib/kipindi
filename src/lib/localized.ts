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
 * ALL THREE LANGUAGES AT ONCE — the shape the NOTIFICATION path needs.
 *
 * ⛔ WHY `pickLocalized` CANNOT SERVE HERE. That helper answers *"which string do I render?"*
 * for ONE reader. `notify()` writes the EN, SW and ZH body of one message in a single call, so
 * it has no single reader and no `locale` to pick with. Every emitter that embedded a market
 * title therefore took a bare `marketTitle: string`, and every caller passed `m.titleEn` —
 * so a Chinese player's inbox read a Chinese sentence wrapped around an ENGLISH question,
 * and a Swahili player's the same. `docs/FAILURE-INVENTORY.md` §7.2c filed it as needing "the
 * notify signature to carry all three titles — a shape change, not a word change". This is
 * that shape.
 *
 * ⭐ The ticker fixed exactly this for its own titles (`ticker-feed.ts`); the notification path
 * never did. Same defect, one channel over.
 *
 * ⚠️ THE FALLBACK IS `pickLocalized`'S, DELIBERATELY. A missing or whitespace-only translation
 * falls back to English rather than rendering blank — English is canonical, and a blank title
 * in an inbox is worse than an untranslated one.
 */
export type LocalizedText = { en: string; sw: string; zh: string };

/** Build the three-language shape from an entity's stored columns. */
export function localizedText(en: string, sw?: string | null, zh?: string | null): LocalizedText {
  return {
    en,
    sw: sw && sw.trim() ? sw : en,
    zh: zh && zh.trim() ? zh : en,
  };
}

/**
 * The resolution criterion for ONE locale, WITH ITS PROVENANCE.
 *
 * ⛔ WHY THIS IS NOT `pickLocalized`, WHICH IS RIGHT ABOVE IT AND LOOKS SUFFICIENT.
 * That helper answers *"which string do I render?"* and deliberately DISCARDS the
 * fact that it fell back — correct for a title, where a Chinese player reading the
 * English question has lost nothing they can act on. The resolution criterion is the
 * sentence the PAYOUT TURNS ON. A player who cannot read it cannot check whether the
 * rule that took their money was the rule they agreed to, and a Swahili page that
 * prints English with no comment is claiming a translation it does not have.
 *
 * So this returns the FACT alongside the text, and the surface is obliged to say it.
 *
 * ⭐ ENGLISH STAYS CANONICAL, AND THAT IS THE RESOLUTION CONTRACT RATHER THAN A GAP.
 * Officers resolve against `resolutionCriterion` (`/admin/resolver/[id]`) and the
 * sentinel reads the same column — so a translation is an aid to READING the rule,
 * never the rule itself. `shownIn` is what lets a surface tell the player which of
 * those two things is currently on their screen.
 */
export type CriterionForLocale = {
  /** What to render: the translation when one exists, else the canonical English. */
  text: string;
  /** The language `text` is actually written in — NOT the language that was asked for. */
  shownIn: Locale;
  /** `true` when the reader's language was asked for and we do not have it. */
  fellBack: boolean;
};

export function pickCriterion(
  locale: Locale,
  en: string,
  sw?: string | null,
  zh?: string | null,
): CriterionForLocale {
  // Same absence rule as pickLocalized: null / "" / whitespace-only is ABSENT.
  // ⚠️ A whitespace-only column would otherwise render a BLANK rule and report it as
  // a successful translation — the worst of the three outcomes, because it neither
  // shows the rule nor admits that it hasn't.
  const wanted = locale === "sw" ? sw : locale === "zh" ? zh : null;
  const have = wanted && wanted.trim() ? wanted : null;
  if (locale === "en" || !have) {
    return { text: en, shownIn: "en", fellBack: locale !== "en" };
  }
  return { text: have, shownIn: locale, fellBack: false };
}

/**
 * THE ONE RULE FOR STORING A CRITERION TRANSLATION — shared by every writer.
 *
 * ⛔ IT LIVES HERE, NOT IN THE SERVER ACTION, BECAUSE THE WIZARD MUST APPLY THE SAME
 * ONE. E-145 was exactly this shape reached from the other end: the proposal form
 * enabled Submit on a cutoff three hours later than the server's, so for a window
 * every night the form lit up a date the server then refused. A client and a server
 * disagreeing about what is acceptable is a defect even when the server wins.
 *
 * Two ways a "translation" is worse than none, and both are refusals rather than
 * silent corrections — an officer who thinks they saved one and did not is exactly
 * the state this whole finding is about:
 *   · TOO_SHORT      — "n/a", "TODO", "-". A stub renders as the rule.
 *   · SAME_AS_ENGLISH — the F8 shape. Storing the English makes "untranslated" and
 *     "translated identically" indistinguishable forever, and blank ALREADY renders
 *     the English (with a note saying so), so it buys nothing and costs the audit.
 */
export const MIN_CRITERION_TRANSLATION = 10;

export type CriterionTranslationIssue = "TOO_SHORT" | "SAME_AS_ENGLISH";

/** Whitespace-insensitive, case-insensitive — "pasted the English then title-cased it" is still the English. */
const sameText = (a: string, b: string) =>
  a.trim().replace(/\s+/g, " ").toLowerCase() === b.trim().replace(/\s+/g, " ").toLowerCase();

export function criterionTranslationIssue(
  value: string | null | undefined,
  en: string,
): CriterionTranslationIssue | null {
  const v = (value ?? "").trim();
  if (!v) return null;                                   // absent is legitimate
  if (v.length < MIN_CRITERION_TRANSLATION) return "TOO_SHORT";
  if (sameText(v, en)) return "SAME_AS_ENGLISH";
  return null;
}

/**
 * What to STORE. Returns `null` for absent — and also for anything
 * `criterionTranslationIssue` rejects, so a caller that skipped validation still
 * cannot write the English into a translation column. Defence in depth: the refusal
 * is the message to the officer, this is the guarantee about the data.
 */
export function normaliseCriterionTranslation(
  value: string | null | undefined,
  en: string,
): string | null {
  const v = (value ?? "").trim();
  if (!v || criterionTranslationIssue(v, en)) return null;
  return v;
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
