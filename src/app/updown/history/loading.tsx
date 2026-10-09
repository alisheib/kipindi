import { getServerT } from "@/lib/i18n-server";
import { resolveSimpleJourney } from "@/lib/server/journey-preview";
import { UpDownHistoryGhost } from "@/app/updown/history/history-ghost";

export default async function UpDownHistoryLoading() {
  /* ⭐ S6 WP9 (VODACOM-PLAN §0h point 21): the head is chosen on the server, from the answer the page will give —
     Tiketi zangu's name and switch for a journey request, today's two lines for everybody else; the rest is everybody's.
     ⛔ The drawing (`history-ghost.tsx`, round 5, review G1: the journey's root loading state draws it in the browser)
     swaps only those two lines, each a sibling ternary where it stood, so a reader the journey is not shown to is
     served today's tree. */
  const [{ t }, { journey }] = await Promise.all([getServerT(), resolveSimpleJourney()]);
  return <UpDownHistoryGhost t={t} journey={journey} />;
}
