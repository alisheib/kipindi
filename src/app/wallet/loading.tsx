import { bonusIsLiveFor } from "@/lib/feature-state";
import { WalletGhost } from "./wallet-ghost";

/**
 * /wallet loading skeleton — the question is asked here, on the server; the picture, `wallet-ghost.tsx` (this folder),
 * is drawn in the browser (round 5's follow-up, R5-H · G-2: a refresh of /wallet and of every page below it carries a
 * reference, not the tree — `components/ui/page-loader.tsx` has the convention). The one answer the browser cannot
 * read is whether the bonus programme is live: `feature-state.ts` is server code, never imported into a client file.
 */
export default function WalletLoading() {
  return <WalletGhost bonusLive={bonusIsLiveFor()} />;
}
