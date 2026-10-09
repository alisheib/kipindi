import { getServerT } from "@/lib/i18n-server";
import { NotFoundView } from "@/components/ui/not-found-view";
import { NOT_FOUND_WORDS } from "@/components/ui/not-found-words";
import { generateMetadata as notFoundMetadata } from "@/app/not-found";

/**
 * Colocated not-found page for the /markets/[id] segment — the app's one not-found view (`not-found-view.tsx`), in the
 * one card order, with the one way out (the open markets).
 *
 * 🔴 IT DOES NOT MAKE THE STATUS 404, WHATEVER THIS NOTE USED TO SAY. Measured (2026-10-09, a dev server, curl):
 * `/markets/mkt_doesnotexist` answers HTTP **200**. This segment has a `loading.tsx` (and the root has one), so Next
 * flushes the shell — and commits the status — before `MarketDetail` reads the market and calls `notFound()`: the
 * error lands inside a Suspense boundary, is caught by the HTML renderer (`createHTMLErrorHandler`,
 * next/dist/esm/server/app-render/create-error-handler.js:107) and only adds `<meta name="robots" content="noindex">`
 * to the stream (make-get-server-inserted-html.js:29–36). A 404 status is set only when the error escapes the shell
 * (app-render.js:1894–1897). ⛔ Do not buy a 404 by deleting a `loading.tsx` (every async route keeps one); the head
 * says `noindex` through the metadata below, which is what a crawler acts on.
 *
 * ⭐ THE TITLE IS THE NOT-FOUND'S, IN THE PAGE'S LANGUAGE (E47). Whenever Next resolves this segment's metadata under
 * the not-found convention it reads the DEEPEST not-found's — this file's; with no export here the tab kept the root's
 * English default. ⚠️ CORRECTED IN ROUND 5 (review F1): the page's own metadata no longer calls `notFound()` (thrown
 * there, it replaced a REAL market with this page whenever its read failed) — for a market the read did not find, it
 * answers this same metadata itself, so the tab says the same either way.
 */
export async function generateMetadata() {
  return notFoundMetadata();
}

export default async function MarketNotFound() {
  const { t, locale } = await getServerT();
  return <NotFoundView words={NOT_FOUND_WORDS[locale]} recoveryLabel={t.error.recoveryLinks} />;
}
