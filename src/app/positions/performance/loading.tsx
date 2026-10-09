import { resolveSimpleJourney } from "@/lib/server/journey-preview";
import { PerformanceGhost } from "./performance-ghost";

/**
 * /positions/performance loading skeleton — the drawing is `performance-ghost.tsx` (this folder), client code that reads
 * its own words (R5-H · G-2: a refresh carries one reference — `components/ui/page-loader.tsx` has the convention). This
 * file asks the server the one thing the browser cannot read (round 6, review C14): whether this reader is in the journey,
 * where the page's section is "Tiketi zangu" — the shell's own cached answer, as `positions/loading.tsx` and
 * `wallet/withdraw/loading.tsx` ask it — and hands the drawing only that.
 */
export default async function PerformanceLoading() {
  const { journey } = await resolveSimpleJourney();
  return <PerformanceGhost journey={journey} />;
}
