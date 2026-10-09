import { UpDownGhost } from "./updown-ghost";

/**
 * /updown loading skeleton — the drawing is `updown-ghost.tsx` (round 5, review G1: the journey's root loading state
 * draws the same one). It reads its own words in the browser since round 5's follow-up (R5-H · G-2), so this file asks
 * the server nothing and a refresh of /updown carries one reference — `components/ui/page-loader.tsx` has the convention.
 */
export default function UpDownLoading() {
  return <UpDownGhost />;
}
