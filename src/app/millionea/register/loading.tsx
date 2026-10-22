import { MillioneaRegisterGhostPick } from "./register-ghost";

/**
 * /millionea/register loading skeleton — the drawing of the page being opened: the index's, or a week's (this file's boundary
 * wraps the week pages too). The pick is the browser's (`MillioneaRegisterGhostPick`, `register-ghost.tsx` says why), so
 * this file hands one client reference and asks the server nothing; neither drawing states a word of the product
 * (`maswali-ghost.tsx`).
 */
export default function MillioneaRegisterLoading() {
  return <MillioneaRegisterGhostPick />;
}
