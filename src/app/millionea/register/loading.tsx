import { RoutePick } from "@/components/ui/route-pick";
import { MILLIONEA_HREF } from "../millionea-parts";
import { MillioneaRegisterWeekGhost } from "./[week]/register-week-ghost";
import { MillioneaRegisterGhost } from "./register-ghost";

/** A week's page under the register, as `RoutePick` reads an address: anchored, the product's own constant. */
const WEEK_PAGE = "^" + MILLIONEA_HREF.register + "/[^/]+$";

/**
 * /millionea/register loading skeleton — the drawing of the page being opened, picked by its address (`RoutePick`: during
 * a move `usePathname()` already names it): the index's (`register-ghost.tsx`) or a week's (`[week]/register-week-ghost.tsx`).
 * ⭐ S5-R2-REGISTER (the lead's ruling, 2026-10-22): a segment's loading file wraps its child routes as well, so on a client
 * move from the index to a week this is the boundary that paints — it drew the INDEX's drawing there for seconds and the
 * week's own never (measured on a throttled hop; `qa:millionea-ghost-hops` holds every Millionea hop to it). Neither
 * drawing states a word of the product (`maswali-ghost.tsx`), so this file asks the server nothing.
 */
export default function MillioneaRegisterLoading() {
  return (
    <RoutePick
      routes={{ [MILLIONEA_HREF.register]: <MillioneaRegisterGhost /> }}
      patterns={[[WEEK_PAGE, <MillioneaRegisterWeekGhost />]]}
      other={<MillioneaRegisterGhost />}
    />
  );
}
