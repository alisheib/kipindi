import { MillioneaRegisterGhost } from "./register-ghost";

/**
 * /millionea/register loading skeleton — the drawing is `register-ghost.tsx` (this folder); it reads its own words in the
 * browser, so this file asks the server nothing (`page-loader.tsx`'s convention).
 */
export default function MillioneaRegisterLoading() {
  return <MillioneaRegisterGhost />;
}
