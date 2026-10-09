import type { Metadata } from "next";
import { getServerT } from "@/lib/i18n-server";
import { NotFoundView } from "@/components/ui/not-found-view";
import { NOT_FOUND_WORDS, notFoundTitle } from "@/components/ui/not-found-words";

/**
 * The page's title and robots, in the visitor's language — the visitor's chosen language (the `kp-locale` cookie), else
 * Swahili, the platform default, the rule every other page uses (`getServerT` → `localeOrDefault`). The browser's
 * Accept-Language is not consulted: a 404 must not speak a different language from the page the visitor just left.
 *
 * ⭐ EVERY NOT-FOUND IN THE APP ANSWERS WITH THIS (2026-10-09, the visual pass's round 4, E47). `/markets/[id]` and
 * `/proposals/[id]` export it from their own not-found files — the error convention reads the DEEPEST not-found's
 * metadata, and theirs had none, so a missing market kept the root layout's English "50pick — Predict events. Not
 * chance." — and `/account` imports it for everybody the journey is not shown to.
 * ⭐ AND IT SAYS `noindex` IN THE HEAD. Under a `loading.tsx` the response is committed (200) before `notFound()` runs;
 * Next then streams `<meta name="robots" content="noindex">` with the not-found UI, but the head still carried the root
 * layout's "index, follow" beside it (measured on a dev server, `/markets/mkt_doesnotexist`). The page's own robots now
 * replace the root's, so the head and the stream agree.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getServerT();
  return { title: notFoundTitle(NOT_FOUND_WORDS[locale]), robots: { index: false, follow: false } };
}

/**
 * Global 404 page — caught by Next.js App Router whenever a request hits a URL that doesn't match a route, and whenever
 * a segment with no not-found of its own calls `notFound()` (`/updown/[roundId]`). We give the player a branded landing
 * with three explicit next-steps so they can keep moving instead of bouncing off the platform. Industry standard for
 * licensed operators: the 404 must NOT look like a system error and must offer a clear path back to the play surfaces.
 *
 * No PII is rendered here — the URL the player tried is not echoed back, so the page is safe to log + cache.
 */
export default async function NotFound() {
  const { t, locale } = await getServerT();
  return <NotFoundView words={NOT_FOUND_WORDS[locale]} recoveryLabel={t.error.recoveryLinks} />;
}
