import { getServerT } from "@/lib/i18n-server";
import { DepositGhost } from "@/app/wallet/deposit/deposit-ghost";

/**
 * /wallet/deposit loading skeleton — the drawing is `deposit-ghost.tsx` (round 5, review G1: the journey's root loading
 * state draws the same one in the browser). This file reads the words on the server.
 */
export default async function DepositLoading() {
  const { t } = await getServerT();
  return <DepositGhost t={t} />;
}
