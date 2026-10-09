import { LazyJourneyRouteGhost } from "@/components/journey/route-ghost-lazy";
import { resolveSimpleJourney } from "@/lib/server/journey-preview";
import { heroRailNames } from "@/lib/server/payout-rails";
import { PositionsGhost } from "./positions-ghost";

/**
 * /positions loading skeleton — the question is asked here, on the server; both pictures are drawn in the browser.
 * Today's is `positions-ghost.tsx` (this folder), which says why it is shaped as it is.
 */
export default async function PositionsLoading() {
  /* ⭐ S6 WP9 — THE GHOST IS CHOSEN ON THE SERVER (VODACOM-PLAN §0h point 21), from the same per-request answer the page
     and the shell read: a journey reader is drawn Tiketi zangu's ghost, everybody else today's, unchanged — and neither
     is drawn the other's. The answer is React-cached per request: a document
     load has already asked it for the shell, and a move inside the app costs a reader without a preview pass a cookie
     and header read and the journey switch's in-process snapshot.
     ⭐ DRAWN IN THE BROWSER (round 5's follow-up, R5-H · G-2): the server asks only what the browser cannot, so a refresh
     (every 20 s here) carries a reference, not a tree. A journey reader is handed the journey's route ghost pinned to
     this page — R5-D's binding, whose code their browser already holds and a classic reader's never fetches — and
     everybody else `PositionsGhost`, which loads nothing of the journey's. `components/ui/page-loader.tsx` has the
     convention. */
  const { journey } = await resolveSimpleJourney();
  if (journey) return <LazyJourneyRouteGhost rails={heroRailNames(null)} at="/positions" />;
  return <PositionsGhost />;
}
