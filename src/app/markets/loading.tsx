import { headers } from "next/headers";
import { LazyJourneyRouteGhost } from "@/components/journey/route-ghost-lazy";
import { resolveSimpleJourney } from "@/lib/server/journey-preview";
import MarketsGhost from "./markets-ghost";

/** The parent segment also loads the board; only a question gets the journey question picture. */
export default async function MarketsLoading() {
  const { journey } = await resolveSimpleJourney();
  const pathname = (await headers()).get("x-pathname") ?? "";
  if (journey && /^\/markets\/[^/]+$/.test(pathname)) return <LazyJourneyRouteGhost rails={[]} at="/markets/[id]" />;
  return <MarketsGhost />;
}
