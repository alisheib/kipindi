import { LazyJourneyRouteGhost } from "@/components/journey/route-ghost-lazy";
import { resolveSimpleJourney } from "@/lib/server/journey-preview";
import { heroRailNames } from "@/lib/server/payout-rails";
import { UpDownHistoryGhost } from "./history-ghost";

export default async function UpDownHistoryLoading() {
  /* ⭐ S6 WP9 (VODACOM-PLAN §0h point 21): the picture is chosen on the server, from the answer the page will give —
     Tiketi zangu's name and switch for a journey request, today's two lines for everybody else; the rest is everybody's.
     ⭐ DRAWN IN THE BROWSER, BOTH (round 5's follow-up, R5-H · G-2): the server asks only what the browser cannot, so a
     refresh (every 20 s while a round is live) carries a reference, not a tree. A journey reader is handed the journey's
     route ghost pinned to this page — R5-D's binding, whose code their browser already holds and a classic reader's
     never fetches — and everybody else `UpDownHistoryGhost` with today's head, whose module loads nothing of the
     journey's. `components/ui/page-loader.tsx` has the convention. */
  const { journey } = await resolveSimpleJourney();
  if (journey) return <LazyJourneyRouteGhost rails={heroRailNames(null)} at="/updown/history" />;
  return <UpDownHistoryGhost />;
}
