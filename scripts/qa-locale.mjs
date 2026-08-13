/**
 * ONE place that knows how a QA driver makes 50pick speak a language.
 *
 * 🔴 WHY THIS EXISTS — measured 2026-08-13. Two drivers written for the round-2 discovery work
 * set the cookies `locale` and `NEXT_LOCALE`. **The product reads neither.** Language comes from
 * `kp-locale` and nothing else (`src/lib/i18n-server.ts`, `src/lib/i18n.tsx:39`,
 * `src/app/layout.tsx:97`). The consequences were not cosmetic:
 *
 *   - `qa:discovery-shots` captured twelve frames labelled en/sw/zh. **Eight of them were
 *     English.** They were then read as trilingual evidence.
 *   - `qa:discovery-board` asserted "the sticky bar stays under a third of a 780px phone viewport
 *     **in Swahili**" and reported 116px. It was measuring **English** — the easy case. Swahili
 *     short labels run 1.74× p90 / 2.25× p95 against English, and a 448px wrapped bar at 360 in
 *     Swahili is the single worst defect batch 1 found. Its guard could not have seen it.
 *
 * This is E-106 recurring: the same wrong cookie, four sessions apart. So the name lives here
 * once, and `assertLang` makes the failure LOUD — a sweep that silently shoots the wrong language
 * is worse than one that crashes, because its output looks like evidence.
 */

/** The only cookie the product reads for language. */
export const LOCALE_COOKIE = "kp-locale";

/** `<html lang>` carries exactly these values — layout.tsx narrows anything else to "en". */
export const LOCALES = ["en", "sw", "zh"];

/** Browser-level locale, so `Intl` formatting matches what a real visitor in that locale gets. */
const BROWSER_LOCALE = { en: "en-US", sw: "sw-TZ", zh: "zh-CN" };

/**
 * A Playwright context that will speak `locale` on its FIRST request. The cookie must be on the
 * context, not set after a navigation: the server renders from the cookie, so a cookie added
 * later only affects the second page load — and the shot is usually taken on the first.
 *
 * ⭐ `reducedMotion` IS FORWARDED, AND IT USED TO BE SILENTLY DROPPED — measured 2026-08-13, the
 * third instrument bug of that session and the same shape as the two above. A ticker probe passed
 * `reducedMotion: "reduce"` to read the marquee at its RESTING position; this function accepted
 * the object, ignored the key, and handed back a normal context. The probe then measured a
 * running marquee, found item 1 legitimately scrolled off the left edge, and reported a clip in
 * all three locales over a strip that was fine. **A shared helper that quietly discards an option
 * is worse than one that never offered it**, because the caller's code reads as if the option took
 * effect. So it is passed through, and an unrecognised VALUE throws rather than degrading to
 * "no preference" — which is exactly the reading that would make a calm-motion probe report on
 * the animated page.
 */
export async function localisedContext(browser, { locale, width, height, baseUrl, reducedMotion }) {
  if (!LOCALES.includes(locale)) throw new Error(`unknown locale "${locale}" — one of: ${LOCALES.join(", ")}`);
  if (reducedMotion !== undefined && reducedMotion !== "reduce" && reducedMotion !== "no-preference") {
    throw new Error(`unknown reducedMotion "${reducedMotion}" — "reduce" or "no-preference"`);
  }
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    locale: BROWSER_LOCALE[locale],
    ...(reducedMotion ? { reducedMotion } : {}),
  });
  await ctx.addCookies([{ name: LOCALE_COOKIE, value: locale, url: baseUrl }]);
  return ctx;
}

/**
 * Read `<html lang>` back and REFUSE to continue on a mismatch. Call this after every navigation
 * that is supposed to be in a given language, before measuring or capturing anything.
 */
export async function assertLang(page, locale) {
  const got = await page.evaluate(() => document.documentElement.lang);
  if (got !== locale) {
    throw new Error(
      `locale mismatch: asked for "${locale}" but <html lang="${got}">. The cookie is ${LOCALE_COOKIE}; ` +
        `refusing to report a measurement taken in the wrong language.`,
    );
  }
  return got;
}
