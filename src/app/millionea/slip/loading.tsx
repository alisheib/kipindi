import { MillioneaSlipGhost } from "./slip-ghost";

/**
 * /millionea/slip loading skeleton — the drawing is `slip-ghost.tsx` (this folder), which the journey's root loading state
 * draws too. It draws no word of the product (`maswali-ghost.tsx`), so this file asks the server nothing (`page-loader.tsx`).
 */
export default function MillioneaSlipLoading() {
  return <MillioneaSlipGhost />;
}
