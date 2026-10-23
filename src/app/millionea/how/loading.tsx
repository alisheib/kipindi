import { MillioneaHowGhost } from "./how-ghost";

/**
 * /millionea/how loading skeleton — the drawing is `how-ghost.tsx` (this folder). It names no word itself: its static
 * paragraphs' words are set unseen through the kit's `GhostWords`, which the shell lets set words only while Millionea is
 * visible to the request (`maswali-ghost-words.tsx`), so this file asks the server nothing (`page-loader.tsx`'s convention).
 */
export default function MillioneaHowLoading() {
  return <MillioneaHowGhost />;
}
