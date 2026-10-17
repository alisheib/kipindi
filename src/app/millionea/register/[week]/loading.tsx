import { MillioneaRegisterWeekGhost } from "./register-week-ghost";

/**
 * /millionea/register/[week] loading skeleton — the drawing is `register-week-ghost.tsx` (this folder); it reads its own
 * words in the browser, so this file asks the server nothing (`page-loader.tsx`'s convention).
 */
export default function MillioneaRegisterWeekLoading() {
  return <MillioneaRegisterWeekGhost />;
}
