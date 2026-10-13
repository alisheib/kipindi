import { LazyJourneyRouteGhost } from "@/components/journey/route-ghost-lazy";
import { resolveSimpleJourney } from "@/lib/server/journey-preview";
import MarketDetailGhost from "./market-detail-ghost";

/** The server selects one picture; each drawing stays in its own client module. */
export default async function MarketDetailLoading() {
  const { journey } = await resolveSimpleJourney();
  if (journey) return <LazyJourneyRouteGhost rails={[]} at="/markets/[id]" />;
  return <MarketDetailGhost />;
}
