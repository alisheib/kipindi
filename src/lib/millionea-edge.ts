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
 * ⭐ HOW A HIDDEN ADDRESS ANSWERS: as an UNROUTED address (`lib/unrouted.ts`): the proxy marks the request and next.config's
 *    one rewrite sends it where no route stands, so the router's own 404 answers it — the status, the headers and the
 *    document any unknown address gets, under the same request headers. ~~Rewritten by the proxy to `/_millionea-dark`~~
 *    (S5-FIX-PLATFORM, the dark-release review D1): Next copied that target into every response
 *    (`x-middleware-rewrite: /_millionea-dark`), a header no unknown address carries, and it named the product.
 * ⭐ READ AS TYPED, AS NEXT ROUTES IT. Next 16.4 serves a percent-encoded spelling of a page (`/%6Darkets`, `/%6Dillionea`)
 *    as an UNKNOWN address — a 404 identical to its twin's, on `next start` and on `next dev` alike (measured 2026-10-21,
 *    S5-FIX-PLATFORM D2: the review read a decode into `resolve-routes.js`, which only the proxy's MATCHER does) — and a
 *    browser sends `/millionea` for `/%6Dillionea` anyway. So the edge reads the address as typed and darkens nothing Next
 *    does not route to Millionea; the case is kept for the same reason (`/Millionea` is an unknown address already).
 *    `qa:live` fetches the encoded spellings beside their twins, so a Next that starts routing them is seen at once.
 * ⭐ ITS ADDRESSES: the product's pages, its rules and its share image (`/api/og/millionea/…`; D4: that route's own refusal
 *    is a plain-text 404, where an unknown `/api` address gets the platform's not-found page).
 * ⛔ L5 (the lead's decision): a kill hides the PRODUCT, never a player's own tickets — the proxy checks ticket
 *    ownership before rendering. A non-holder and an unknown serial get the same real 404, including when signed in.
 * ⏳ The STAFF_PREVIEW pass for non-staff readers (`server/millionea-preview.ts`) has no reader yet; when it lands, this
 *    belt admits its holders too, in the same commit, or they meet a 404 here before the page that would admit them.
 * Pure and isomorphic: it imports the rollout's own pure module and nothing else.
 */
import { millioneaCeiling, type RolloutState } from "@/lib/millionea-rollout";

/** The roots Millionea answers under: its pages, its rules, its share image (`qa:live` reads every one, `MILLIONEA_ROUTES`). */
const MILLIONEA_ROOTS = ["/millionea", "/legal/rules/millionea", "/api/og/millionea"] as const;

/** The root itself or an address below it — never a look-alike that only shares its letters (`/millioneas`). */
const isAtOrUnder = (pathname: string, root: string) => pathname === root || pathname.startsWith(`${root}/`);

/** Every address Millionea answers at — its pages, its rules and its share image — as typed (as Next routes it). */
export function isMillioneaPath(pathname: string): boolean {
  return MILLIONEA_ROOTS.some((root) => isAtOrUnder(pathname, root));
}

/** The reader's own tickets — the list and one ticket (L5). */
export function isMillioneaTicketsPath(pathname: string): boolean {
  return isAtOrUnder(pathname, "/millionea/tickets");
}

/** The one cheap question the proxy asks first: a Millionea address, under a ceiling below ACTIVE (else nothing is read). */
export function millioneaEdgeAsks(pathname: string, ceiling: RolloutState = millioneaCeiling().ceiling): boolean {
  return isMillioneaPath(pathname) && ceiling !== "ACTIVE";
}

/** The request as the edge can know it: a verified session cookie, and whether its role claim is a staff role. */
export type MillioneaEdgeViewer = { signedIn: boolean; staff: boolean; holder: boolean };

/**
 * ⭐ THE EDGE'S ANSWER: true when the ceiling hides this Millionea address from this request, so it answers 404.
 *   · ACTIVE — never (the stored switch may still hide it: the page's gate answers that).
 *   · STAFF_PREVIEW — hidden but to a staff session (the page re-reads the STORED role) or a ticket owner.
 *   · WITHDRAWN — hidden but the owner's own tickets (L5).
 * ⛔ An unknown ceiling hides, as `composeMillionea` does.
 */
export function millioneaDarkAtEdge(
  pathname: string,
  viewer: MillioneaEdgeViewer,
  ceiling: RolloutState = millioneaCeiling().ceiling,
): boolean {
  if (!isMillioneaPath(pathname)) return false;
  if (ceiling === "ACTIVE") return false;
  if (viewer.signedIn && viewer.holder && isMillioneaTicketsPath(pathname)) return false;
  if (ceiling === "STAFF_PREVIEW" && viewer.signedIn && viewer.staff) return false;
  return true;
}
