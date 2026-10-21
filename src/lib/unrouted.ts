/**
 * AN ADDRESS THE EDGE ANSWERS AS UNROUTED — the router's own 404, and nothing of its own (MASWALI-BUILD S5-FIX-PLATFORM,
 * the S5 dark-release review D1). `lib/millionea-edge.ts` decides WHICH addresses; this is HOW they answer.
 *
 * ⛔ WHY NOT `NextResponse.rewrite()` IN THE PROXY. Next 16 copies a proxy rewrite's target into the response: every one
 *    carries `x-middleware-rewrite: <target>` (`next/dist/server/lib/router-utils/resolve-routes.js`). A hidden Millionea
 *    address answered the not-found page PLUS a header no unknown address carries, and that header named the product
 *    (`/_millionea-dark`) — on `/legal/rules/millionea` too, an address no route answers at all.
 * ⭐ HOW INSTEAD. The proxy MARKS THE REQUEST (`UNROUTED_HEADER`: a request header — Next applies the proxy's request
 *    headers to the request, never to the response) and next.config.ts's one `beforeFiles` rewrite (`UNROUTED_REWRITE`),
 *    conditioned on that mark, sends it to `UNROUTED_PATH`, which no route answers. A config rewrite writes nothing into a
 *    document's response, so the document is the one any unknown address gets: its status, its headers, its body.
 * ⚠️ WHAT IS LEFT, STATED: a FLIGHT (the client router's `RSC: 1` fetch) answered through ANY rewrite carries
 *    `x-nextjs-rewritten-path` naming the target (resolve-routes.js: config rewrites set it too, so the router knows which
 *    route answered). It names `UNROUTED_PATH` — nothing of the product — and only a hand-made flight meets it: no page
 *    links an address while it is hidden.
 * ⛔ THE MARK IS THE PROXY'S ALONE. The proxy deletes a client's copy from every request it sees, and the rewrite's source
 *    leaves out exactly what the proxy's matcher skips (Next's static output, public/'s static folders, the two favicons),
 *    so a forged mark can never turn a cacheable static file into a 404 for the next visitor (`test:millionea-dark-edge`
 *    holds the pair with Next's own matchers). Its group is UNNAMED on purpose: Next appends a rewrite source's NAMED
 *    params to the target's query (`prepare-destination.js`), and the address must not ride along.
 * Import-free and alias-free: next.config.ts loads it through Next's own TypeScript hook, where `@/` does not exist.
 */

/** The request header the proxy sets on a request the edge answers as unrouted. Never sent to, or by, a browser. */
export const UNROUTED_HEADER = "x-kp-unrouted";

/** Where an unrouted request is sent: a private segment (`_`), which no route under `src/app` can ever answer. */
export const UNROUTED_PATH = "/_kp-404";

/** next.config.ts's `beforeFiles` rewrite: a request the proxy marked goes to `UNROUTED_PATH`, and only such a request. */
export const UNROUTED_REWRITE = {
  // ⛔ The proxy matcher's static skip list, letter for letter (src/proxy.ts `config.matcher`; the suite above holds it).
  source: "/((?!_next/static|_next/image|favicon\\.ico$|favicon\\.svg$|icons/|brand/|pay/|og/|screenshots/|email-signatures/).*)",
  has: [{ type: "header" as const, key: UNROUTED_HEADER, value: "1" }],
  destination: UNROUTED_PATH,
};
