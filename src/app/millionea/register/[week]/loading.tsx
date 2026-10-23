import { MillioneaRegisterWeekGhost } from "./register-week-ghost";

/**
 * /millionea/register/[week] loading skeleton — the drawing is `register-week-ghost.tsx` (this folder). It names no word
 * itself: its static words are set unseen through the kit's `GhostWords`, only while Millionea is visible to the request
 * (`maswali-ghost-words.tsx`), so this file asks the server nothing (`page-loader.tsx`'s convention).
 */
export default function MillioneaRegisterWeekLoading() {
  return <MillioneaRegisterWeekGhost />;
}
