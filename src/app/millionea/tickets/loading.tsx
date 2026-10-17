import { LazyJourneyRouteGhost } from "@/components/journey/route-ghost-lazy";
import { resolveSimpleJourney } from "@/lib/server/journey-preview";
import { heroRailNames } from "@/lib/server/payout-rails";
import { MillioneaTicketsGhost } from "./tickets-ghost";

/**
 * /millionea/tickets loading skeleton — the question is asked here, on the server; both pictures are drawn in the browser
 * (`/positions`' convention, R5-H · G-2): a journey reader is handed the journey's route ghost pinned to this page (Tiketi
 * zangu's head over the list), everybody else `tickets-ghost.tsx` with the page's own head — which loads nothing of the
 * journey's (VODACOM-PLAN §0h point 21).
 */
export default async function MillioneaTicketsLoading() {
  const { journey } = await resolveSimpleJourney();
  if (journey) return <LazyJourneyRouteGhost rails={heroRailNames(null)} at="/millionea/tickets" />;
  return <MillioneaTicketsGhost />;
}
