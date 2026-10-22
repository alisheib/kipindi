import { LazyJourneyRouteGhost } from "@/components/journey/route-ghost-lazy";
import { resolveSimpleJourney } from "@/lib/server/journey-preview";
import { millioneaDoor } from "@/lib/server/millionea-doors";
import { MillioneaGhostPick } from "./hub-ghost";

/**
 * Millionea's segment loading state. This file wraps EVERY Millionea page, so on a hop between them it is what the reader
 * sees until the page lands — and it drew the hub for all of them (REGISTER's measure: on a 400 ms / 12 KB/s link the
 * hub's drawing stood 14–22 s on the way to How to play or the register). It now draws the page being opened
 * (`MillioneaGhostPick`, `hub-ghost.tsx`: the path picked in the browser, each page's own drawing; the hub's for the hub).
 * It asks the server one answer, as the market page's loading file does: a journey reader is handed the journey's own
 * route ghost (R5-D's binding), which draws Tiketi zangu's Millionea kind under Tiketi zangu's journey head — and only while
 * Millionea is visible to the reader (S5-FIX-PLATFORM D6: to anyone else its address is an unknown one). Every element is
 * a client reference and that one answer; no drawing is written into the payload (`components/ui/page-loader.tsx`).
 */
export default async function MillioneaLoading() {
  // Both answers before the drawing (a drawing file holds no word of the product, `test:maswali-ui` 1.3).
  const { journey } = await resolveSimpleJourney();
  const visible = journey && (await millioneaDoor()).visible;
  if (!journey) return <MillioneaGhostPick />;
  return <MillioneaGhostPick journey={<LazyJourneyRouteGhost rails={[]} {...(visible ? { millionea: true } : {})} />} />;
}
