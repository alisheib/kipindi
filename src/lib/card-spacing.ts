/**
 * CARD SPACING — the phone board's density setting (docs/MOBILE-VISUAL-PLAN.md §4 decision 1, §9 U2).
 *
 * Ali, 2026-09-15: Compact is the phone default, with a "Card spacing: Comfortable / Compact" switch that returns
 * today's look. It changes SPACING ONLY — nothing is hidden, and it is never a list view (`MarketListRow` is still not
 * built; the unrelated grid/list `Density` in `markets/discovery.ts` stays unwired).
 *
 * ⭐ HOW IT REACHES THE PAGE WITHOUT A FLASH. The choice is a cookie, read by the root layout on the server, which
 * stamps `data-density="comfortable"` on `<html>` in the served markup — so the first paint is already right and no
 * script runs before paint (plan §12: never a render-blocking script). No cookie means Compact, and Compact is the
 * ABSENCE of the attribute: every Compact rule is gated `html:not([data-density="comfortable"])` inside the phone
 * query, which `test:density-contract` enforces.
 *
 * ⛔ A NEW COOKIE IS A LEGAL ACT. Privacy §7 describes it in all three languages (v2026-09-22, Ali's approval the same
 * day) and `test:privacy-notice` pins the census — rename or add a cookie here and that suite fails until §7 says so.
 *
 * No "use client": the layout (server) and the rail menu (client) both import it.
 */
export const CARD_SPACING_COOKIE = "kp-density";

export type CardSpacing = "compact" | "comfortable";

/** Only the literal "comfortable" selects Comfortable; anything else — absent, stale, tampered — is the default. */
export function cardSpacingFromCookie(raw: string | undefined | null): CardSpacing {
  return raw === "comfortable" ? "comfortable" : "compact";
}

/** What the `<html>` element carries right now (client only; the server answers from the cookie). */
export function currentCardSpacing(): CardSpacing {
  if (typeof document === "undefined") return "compact";
  return document.documentElement.getAttribute("data-density") === "comfortable" ? "comfortable" : "compact";
}

/**
 * Save a choice and apply it at once: the cookie (same shape as the language cookie, `i18n.tsx` writeCookie — one
 * year, path /, samesite=lax) so the NEXT server render agrees, and the attribute so THIS page reflows now. No
 * `router.refresh()`: the attribute is the whole effect, and the root layout never re-renders on soft navigation.
 */
export function applyCardSpacing(v: CardSpacing) {
  if (typeof document === "undefined") return;
  document.cookie = `${CARD_SPACING_COOKIE}=${v}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  if (v === "comfortable") document.documentElement.setAttribute("data-density", "comfortable");
  else document.documentElement.removeAttribute("data-density");
}
