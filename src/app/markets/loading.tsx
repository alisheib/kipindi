import { headers } from "next/headers";
import { LazyJourneyRouteGhost } from "@/components/journey/route-ghost-lazy";
import { resolveSimpleJourney } from "@/lib/server/journey-preview";
import { millioneaCardShown, millioneaDoor } from "@/lib/server/millionea-doors";
import MarketsGhost from "./markets-ghost";

/** The parent segment also loads the board; only a question gets the journey question picture. MASWALI-BUILD
 *  S5-DESIGN-DOORS H1: the board's picture holds the Millionea card's slot on the board's own door answer — the card is
 *  offered (`millioneaCardShown`: the rollout shows it and the reader is on no break), and its preview's mark — handed to
 *  the drawing as two booleans, as the wallet's picture is handed the bonus answer. Hidden (WITHDRAWN), no slot.
 *  ⛔ HANDED ONLY WHEN TRUE (S5-DESIGN-DOORS round 2, the dark-safety blocker; S5-FIX-PLATFORM D3's rule, the root loading
 *  file's shape): the drawing is client code, so every prop handed here is written into the payload of /markets and of
 *  every page under it — `millionea={false}` put `"millionea":false` into every visitor's board, which qa:live's dark
 *  section refuses below ACTIVE. A reader the card is not offered to is handed `<MarketsGhost />`, the element main
 *  serves; `test:maswali-doors` §5 runs this file for each reader and holds what it hands. */
export default async function MarketsLoading() {
  const { journey } = await resolveSimpleJourney();
  const pathname = (await headers()).get("x-pathname") ?? "";
  if (journey && /^\/markets\/[^/]+$/.test(pathname)) return <LazyJourneyRouteGhost rails={[]} at="/markets/[id]" />;
  const millionea = await millioneaCardShown();
  const preview = millionea && (await millioneaDoor()).preview;
  return <MarketsGhost {...(millionea ? { millionea: true as const, ...(preview ? { preview: true as const } : {}) } : {})} />;
}
