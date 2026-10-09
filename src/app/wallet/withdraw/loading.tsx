import { resolveSimpleJourney } from "@/lib/server/journey-preview";
import { WithdrawGhost } from "./withdraw-ghost";

/**
 * /wallet/withdraw loading skeleton — the drawing is `withdraw-ghost.tsx` (this folder), client code that reads its own
 * words (round 5's follow-up, R5-H · G-2: a refresh carries one reference — `components/ui/page-loader.tsx` has the
 * convention). This file asks the server the one thing the browser cannot read (R5-G, G-1): whether this reader is in the
 * journey, whose withdraw screen is "Toa pesa" under the Wallet (`money-names.ts`) — the shell's own cached answer, as
 * `positions/loading.tsx` asks it — and hands the drawing only that.
 */
export default async function WithdrawLoading() {
  const { journey } = await resolveSimpleJourney();
  return <WithdrawGhost journey={journey} />;
}
