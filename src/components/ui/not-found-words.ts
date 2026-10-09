import type { Locale } from "@/lib/i18n-dict";

/**
 * THE NOT-FOUND'S WORDS AND ITS TAB TITLE — data, with no directive: the server's not-found files pick the page's language
 * (`app/not-found.tsx`: the reader's chosen language, else Swahili) and hand that language's words to the one view
 * (`not-found-view.tsx`), and the metadata titles the tab with them.
 *
 * ⭐ THE WORDS ARE THE ROOT PAGE'S, in every language (2026-10-09, the visual pass's round 4, E43 E44) — the market page
 * used the dictionary's twin of these sentences, whose English h1 types a straight apostrophe ("couldn't", E44; S12 owns
 * that key).
 * ⛔ NOT IN THE VIEW'S MODULE (2026-10-09, the visual pass's round 5, R5-D — review G1's sibling). The view is client code,
 * and on the server a "use client" module's exports are references: a component can be rendered, but
 * `NOT_FOUND_WORDS[locale]` would throw ("cannot dot into a client module") and `notFoundTitle()` could not be called.
 * `test:visual-pass-r5d` §4 walks the server graph and holds every import of a client module to its components.
 */
export const NOT_FOUND_WORDS = {
  en: {
    notFoundCode: "404",
    notFound: "Page not found",
    notFoundBody: "We couldn’t find that page",
    notFoundHint: "The link may be stale, the market may have resolved, or the URL was typed in slightly off. Pick a destination below to keep going.",
    home: "Home",
    markets: "Markets",
    help: "Help",
    browseOpenMarkets: "Browse open markets",
  },
  sw: {
    notFoundCode: "404",
    notFound: "Hakuna ukurasa",
    notFoundBody: "Hatukupata ukurasa huo",
    notFoundHint: "Kiungo kinaweza kuwa kimepitwa na wakati, soko linaweza kuwa limetatuliwa, au URL imeandikwa vibaya. Chagua mahali pa kwenda hapa chini.",
    home: "Mwanzo",
    markets: "Masoko",
    help: "Msaada",
    browseOpenMarkets: "Tazama masoko yaliyo wazi",
  },
  zh: {
    notFoundCode: "404",
    notFound: "页面未找到",
    notFoundBody: "我们找不到该页面",
    notFoundHint: "链接可能已失效，市场可能已结算，或URL输入有误。请选择以下目的地继续。",
    home: "首页",
    markets: "市场",
    help: "帮助",
    browseOpenMarkets: "浏览开放市场",
  },
} as const satisfies Record<Locale, Record<string, string>>;

export type NotFoundWords = (typeof NOT_FOUND_WORDS)[Locale];

/** The page's tab title, in its language: "Hakuna ukurasa · 404" (the root layout's template adds " · 50pick"). */
export const notFoundTitle = (w: NotFoundWords) => `${w.notFound} · ${w.notFoundCode}`;
