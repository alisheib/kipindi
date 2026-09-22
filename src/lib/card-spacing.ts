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

/** Subscribe to changes of the attribute — for `useSyncExternalStore`, so a reader always shows the committed value. */
export function subscribeCardSpacing(onChange: () => void) {
  const mo = new MutationObserver(onChange);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-density"] });
  return () => mo.disconnect();
}

/** What the `<html>` element carries right now (client only; the server answers from the cookie). */
export function currentCardSpacing(): CardSpacing {
  if (typeof document === "undefined") return "compact";
  return document.documentElement.getAttribute("data-density") === "comfortable" ? "comfortable" : "compact";
}

/**
 * Save a choice and apply it at once: the cookie so the NEXT server render agrees, and the attribute so THIS page
 * reflows now (no `router.refresh()` — the attribute is the whole effect).
 *
 * ⭐ COMPACT DELETES THE COOKIE rather than writing `compact`, so "no cookie means Compact" is literally true and the
 * browser keeps nothing at all for the default — which is what Privacy §7 and COMPLIANCE-DECISIONS "Privacy v2026-09-22"
 * say. Comfortable is the one value ever stored (same shape as the language cookie: one year, path /, samesite=lax).
 */
export function applyCardSpacing(v: CardSpacing) {
  if (typeof document === "undefined") return;
  if (v === "comfortable") {
    document.cookie = `${CARD_SPACING_COOKIE}=comfortable; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    document.documentElement.setAttribute("data-density", "comfortable");
  } else {
    document.cookie = `${CARD_SPACING_COOKIE}=; path=/; max-age=0; samesite=lax`;
    document.documentElement.removeAttribute("data-density");
  }
}

/** The choice the browser holds right now (client only). */
function cookieCardSpacing(): CardSpacing {
  const m = document.cookie.match(new RegExp(`(?:^|; )${CARD_SPACING_COOKIE}=([^;]*)`));
  return cardSpacingFromCookie(m?.[1]);
}

/**
 * Make `<html>` agree with the cookie again. Called after every commit that brings a new server value
 * (`theme-provider.tsx`, keyed on the layout's `initialDensity`).
 *
 * ⛔ WHY IT EXISTS (review of U2, 2026-09-22). The attribute is a React prop on `<html>`, and `applyCardSpacing` also
 * changes it behind React's back. React rewrites a host prop only when the NEW server value differs from the last one
 * it committed — and the board pages call `router.refresh()` on a timer (/markets every 30s, /updown 20s, /live 15s).
 * So a refresh that left while the cookie said Comfortable, and lands after the player switched back to Compact, would
 * write the OLD choice onto the page. The cookie is always right, so the fix is to re-read it the moment such a commit
 * lands — in a layout effect, i.e. before the browser paints, so the stale value is never seen.
 */
export function syncCardSpacingFromCookie() {
  if (typeof document === "undefined") return;
  const want = cookieCardSpacing();
  const has = document.documentElement.getAttribute("data-density") === "comfortable" ? "comfortable" : "compact";
  if (want === has) return;
  if (want === "comfortable") document.documentElement.setAttribute("data-density", "comfortable");
  else document.documentElement.removeAttribute("data-density");
}
