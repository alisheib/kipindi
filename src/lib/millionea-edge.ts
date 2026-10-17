/**
 * MASWALI MILLIONEA AT THE EDGE — A REAL 404 WHILE THE CEILING HIDES IT (MASWALI-BUILD S5 composition; MASWALI-PLAN §7b
 * S1 item 5 "every /millionea route 404s", and `qa:live`'s dark section, `scripts/live/millionea-dark.mjs`).
 *
 * ⭐ WHY THE EDGE AND NOT ONLY THE PAGE. The root `app/loading.tsx` streams first, so a page's `notFound()` lands after the
 *    status line has gone out as 200 (the proxy's own header says the same of `redirect()`). Every Millionea page still
 *    asks its gate first (`millioneaGate`, `millioneaTicketGate`) and answers the identical not-found body — this belt
 *    only makes the STATUS true where the server's environment already settles the answer.
 * ⭐ WHAT IT KNOWS: the ceiling (`FEATURE_MILLIONEA`, `millioneaCeiling`) and the session cookie's own claims, verified by
 *    the proxy. ⛔ It never reads the Owner's stored switch (a store read in front of every request) and never decides a
 *    view: a request it lets through still meets the page's gate, which re-reads the stored role and the stored switch.
 * ⭐ HOW A HIDDEN ADDRESS ANSWERS: rewritten to `MILLIONEA_DARK_PATH`, a private segment (`_` — never a route), so the
 *    router's own 404 answers it, the same document any unknown address gets, under the same request headers.
 * ⛔ L5 (the lead's decision): a kill hides the PRODUCT, never a player's own tickets — `/millionea/tickets…` passes for
 *    any verified session, and the page's holder-aware gate answers a non-holder with the same not-found body. A
 *    signed-out reader gets the 404 at every state below ACTIVE.
 * ⏳ The STAFF_PREVIEW pass for non-staff readers (`server/millionea-preview.ts`) has no reader yet; when it lands, this
 *    belt admits its holders too, in the same commit, or they meet a 404 here before the page that would admit them.
 * Pure and isomorphic: it imports the rollout's own pure module and nothing else.
 */
import { millioneaCeiling, type RolloutState } from "@/lib/millionea-rollout";

/** Every address Millionea answers at: the product's pages and its rules (`qa:live` reads the same list). */
export function isMillioneaPath(pathname: string): boolean {
  return pathname === "/millionea" || pathname.startsWith("/millionea/")
    || pathname === "/legal/rules/millionea" || pathname.startsWith("/legal/rules/millionea/");
}

/** The reader's own tickets — the list and one ticket (L5). */
export function isMillioneaTicketsPath(pathname: string): boolean {
  return pathname === "/millionea/tickets" || pathname.startsWith("/millionea/tickets/");
}

/** The one cheap question the proxy asks first: a Millionea address, under a ceiling below ACTIVE (else nothing is read). */
export function millioneaEdgeAsks(pathname: string, ceiling: RolloutState = millioneaCeiling().ceiling): boolean {
  return isMillioneaPath(pathname) && ceiling !== "ACTIVE";
}

/** Where a hidden Millionea address is rewritten: a private segment, so no route can ever answer it but the 404. */
export const MILLIONEA_DARK_PATH = "/_millionea-dark";

/** The request as the edge can know it: a verified session cookie, and whether its role claim is a staff role. */
export type MillioneaEdgeViewer = { signedIn: boolean; staff: boolean };

/**
 * ⭐ THE EDGE'S ANSWER: true when the ceiling hides this Millionea address from this request, so it answers 404.
 *   · ACTIVE — never (the stored switch may still hide it: the page's gate answers that).
 *   · STAFF_PREVIEW — hidden but to a staff session (the page re-reads the STORED role) and, on the tickets, a session.
 *   · WITHDRAWN — hidden but the tickets, to a session (L5).
 * ⛔ An unknown ceiling hides, as `composeMillionea` does.
 */
export function millioneaDarkAtEdge(
  pathname: string,
  viewer: MillioneaEdgeViewer,
  ceiling: RolloutState = millioneaCeiling().ceiling,
): boolean {
  if (!isMillioneaPath(pathname)) return false;
  if (ceiling === "ACTIVE") return false;
  if (viewer.signedIn && isMillioneaTicketsPath(pathname)) return false;
  if (ceiling === "STAFF_PREVIEW" && viewer.signedIn && viewer.staff) return false;
  return true;
}
