import { MillioneaHowGhost } from "./how-ghost";

/**
 * /millionea/how loading skeleton — the drawing is `how-ghost.tsx` (this folder); it draws no word of the product
 * (`maswali-ghost.tsx`), so this file asks the server nothing (`page-loader.tsx`'s convention).
 */
export default function MillioneaHowLoading() {
  return <MillioneaHowGhost />;
}
