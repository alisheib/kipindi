import { getServerT } from "@/lib/i18n-server";
import { UpDownGhost } from "@/app/updown/updown-ghost";

/**
 * /updown loading skeleton — the drawing is `updown-ghost.tsx` (round 5, review G1: the journey's root loading state
 * draws the same one in the browser). This file reads the words on the server.
 */
export default async function UpDownLoading() {
  const { t } = await getServerT();
  return <UpDownGhost t={t} />;
}
