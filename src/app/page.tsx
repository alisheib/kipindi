import type { Metadata } from "next";
import { Suspense } from "react";
import { ROOT_OPEN_GRAPH } from "./layout";

import { LegacyLanding } from "@/components/home/legacy-landing";
import { JourneyHome } from "@/components/journey/home/journey-home";
import { JourneyHomeGhost } from "@/components/journey/home/journey-home-ghost";
import { getServerT } from "@/lib/i18n-server";
import { resolveSimpleJourney } from "@/lib/server/journey-preview";

export const dynamic = "force-dynamic";

/**
 * The landing page had NO canonical URL and NO og:url, so every variant a link picked up on the
 * way here — a utm tag, a cache-buster, a trailing slash — was a separate page to a crawler and
 * an unnamed page to a link preview.
 *
 * ⛔ DECLARED HERE, ON THE ROUTE, AND NOT IN THE ROOT LAYOUT. A canonical in the layout is
 * inherited by every page under it, so the whole site would claim to be "/" — which is worse than
 * having none at all. Metadata that names a URL belongs to exactly one route.
 * `metadataBase` in the layout resolves these to the absolute site URL, which is why they are
 * written relative and there is no second copy of the base URL here to drift.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerT();
  return {
    // ⭐ THE TAB SPEAKS THE READER'S LANGUAGE (round 4 of the visual pass, 2026-10-09, edges E5): the home's title was the
    // layout's English default, "50pick — Predict events. Not chance.", in Swahili and Chinese too (38 sw and 37 zh tiles),
    // while every other page names itself in the reader's words. The same composition, its line from the dictionary's own
    // tagline (`auth.railTagline`: "Tabiri matukio. Si bahati." · "预测事件，而非运气。"); `absolute`, because the
    // layout's template would add " · 50pick" to a title that already opens with the name. No new words.
    title: { absolute: `50pick — ${t.auth.railTagline}` },
    alternates: { canonical: "/" },
    // ⛔ SPREAD, NEVER REPLACE. `openGraph: { url: "/" }` on its own wiped og:image, og:locale,
    // og:site_name and og:type from this page — Next merges metadata per FIELD, so a partial
    // openGraph object replaces the layout’s entire one. Measured 0 of each on "/" against 6 on
    // /markets, on the same deploy.
    // ⚠️ `url` is KEPT rather than dropped: nothing here isolates whether Next synthesises og:url
    // from `alternates.canonical`, and dropping it would risk re-deleting the tag this replaces.
    openGraph: { ...ROOT_OPEN_GRAPH, url: "/" },
  };
}

export default async function LandingPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  /* ⭐ THE JOURNEY HOME, FOR A JOURNEY REQUEST ALONE (the Vodacom plan S7, S7-PLAN WP7 step 1; A17 item 2, A24 items 1-2).
     The one per-request answer AppShell is given too (React-cached, so the page and its chrome cannot disagree about one
     render) — never the pass cookie, never `simpleJourneyFor`. A journey request is drawn the deck's home, its own ghost
     standing while the list is on its way (a Suspense boundary of the home's own: the root loading file stays as it is);
     every other request takes the one classic return below, today's element after one cached await. The tab's title is
     the one `generateMetadata` gives every reader (Open point 25's decision). */
  const { journey } = await resolveSimpleJourney();
  if (journey) {
    const { t } = await getServerT();
    return (
      <Suspense fallback={<JourneyHomeGhost t={t} />}>
        <JourneyHome searchParams={searchParams} />
      </Suspense>
    );
  }
  return <LegacyLanding searchParams={searchParams} />;
}
