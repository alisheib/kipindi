import { MillioneaHubGhost } from "./hub-ghost";

/**
 * /millionea loading skeleton — the drawing is `hub-ghost.tsx` (this folder), which the journey's root loading state draws
 * too. It reads its own words in the browser, so this file asks the server nothing and a refresh of the hub carries one
 * reference (`components/ui/page-loader.tsx` has the convention).
 */
export default function MillioneaHubLoading() {
  return <MillioneaHubGhost />;
}
