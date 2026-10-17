import { MillioneaSlipGhost } from "./slip-ghost";

/**
 * /millionea/slip loading skeleton — the drawing is `slip-ghost.tsx` (this folder), which the journey's root loading state
 * draws too. It reads its own words in the browser, so this file asks the server nothing (`page-loader.tsx`'s convention).
 */
export default function MillioneaSlipLoading() {
  return <MillioneaSlipGhost />;
}
