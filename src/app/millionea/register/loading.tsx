import { MillioneaRegisterGhost } from "./register-ghost";

/**
 * /millionea/register loading skeleton — the drawing is `register-ghost.tsx` (this folder); it draws no word of the
 * product (`maswali-ghost.tsx`), so this file asks the server nothing (`page-loader.tsx`'s convention).
 */
export default function MillioneaRegisterLoading() {
  return <MillioneaRegisterGhost />;
}
