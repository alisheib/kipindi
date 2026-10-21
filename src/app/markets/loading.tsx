import { headers } from "next/headers";
import { LazyJourneyRouteGhost } from "@/components/journey/route-ghost-lazy";
import { resolveSimpleJourney } from "@/lib/server/journey-preview";
import { millioneaCardShown, millioneaDoor } from "@/lib/server/millionea-doors";
import MarketsGhost from "./markets-ghost";

/** The parent segment also loads the board; only a question gets the journey question picture. MASWALI-BUILD
 *  S5-DESIGN-DOORS H1: the board's picture holds the Millionea card's slot on the board's own door answer — the card is
 *  offered (`millioneaCardShown`: the rollout shows it and the reader is on no break), and its preview's mark — handed to
 *  the drawing as two booleans, as the wallet's picture is handed the bonus answer. Hidden (WITHDRAWN), no slot. */
export default async function MarketsLoading() {
  const { journey } = await resolveSimpleJourney();
  const pathname = (await headers()).get("x-pathname") ?? "";
  if (journey && /^\/markets\/[^/]+$/.test(pathname)) return <LazyJourneyRouteGhost rails={[]} at="/markets/[id]" />;
  const millionea = await millioneaCardShown();
  return <MarketsGhost millionea={millionea} preview={millionea && (await millioneaDoor()).preview} />;
}
