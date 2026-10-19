import { MillioneaRegisterWeekGhost } from "./register-week-ghost";

/**
 * /millionea/register/[week] loading skeleton — the drawing is `register-week-ghost.tsx` (this folder); it draws no word
 * of the product (`maswali-ghost.tsx`), so this file asks the server nothing (`page-loader.tsx`'s convention).
 */
export default function MillioneaRegisterWeekLoading() {
  return <MillioneaRegisterWeekGhost />;
}
