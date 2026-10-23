import { MillioneaRegisterGhostPick } from "./register-ghost";

/**
 * /millionea/register loading skeleton — the drawing of the page being opened: the index's, or a week's (this file's boundary
 * wraps the week pages too). The pick is the browser's (`MillioneaRegisterGhostPick`, `register-ghost.tsx` says why), so
 * this file hands one client reference and asks the server nothing; neither drawing names a word itself — their static
 * paragraphs' words are set unseen through the kit's `GhostWords`, only while Millionea is visible to the request
 * (`maswali-ghost-words.tsx`).
 */
export default function MillioneaRegisterLoading() {
  return <MillioneaRegisterGhostPick />;
}
