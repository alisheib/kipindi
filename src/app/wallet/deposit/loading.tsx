import { getServerT } from "@/lib/i18n-server";
import { resolveSimpleJourney } from "@/lib/server/journey-preview";
import { DepositGhost } from "@/app/wallet/deposit/deposit-ghost";

/**
 * /wallet/deposit loading skeleton — the drawing is `deposit-ghost.tsx` (round 5, review G1: the journey's root loading
 * state draws the same one in the browser). This file reads the words on the server, and since R5-G (G-1) the one answer
 * the page's head turns on, asked beside them as `updown/history/loading.tsx` asks it: a journey reader's deposit screen
 * is "Weka pesa" under the Wallet (`money-names.ts`), so its ghost is; everybody else's ghost keeps today's words.
 */
export default async function DepositLoading() {
  const [{ t }, { journey }] = await Promise.all([getServerT(), resolveSimpleJourney()]);
  return <DepositGhost t={t} journey={journey} />;
}
