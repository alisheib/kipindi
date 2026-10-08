/**
 * The card deposit's RETURN LEG: which deposit is coming back (MONEY-GATE §3.2; the Vodacom plan §2, S9).
 *
 * Selcom returns the buyer from its hosted card page to OUR `redirect_url` (or `cancel_url`), and appends only
 * `payment_status` and `transid` to it, never our order id. So the order id has to travel inside the URL we hand
 * the gateway: `withOrderId` puts it there (`selcomCardCheckout`), and `cardReturnOrderId` reads it back on
 * `/wallet/deposit/return`.
 *
 * 🔴 THE DEFECT THIS CLOSES (2026-10-09). Since the card rail's first day (2026-07-18) the URL handed to Selcom was the
 * bare `/wallet/deposit/return`, so a card payer who had just been charged landed on "We couldn't find that payment":
 * the page had no order id to look up, and its ten-second re-check could never find one either. The credit itself was
 * never at risk (the webhook, the fast-credit poll and the reconcile sweep in `lifecycle.ts` all settle from Selcom's
 * signed order status), but the player was told
 * we could not find money they had just paid, which is how a player pays twice. Every test passed meanwhile, because
 * the test gateway (`scripts/selcom-stub-gateway.mjs`) appended an `order_id` of its own, which the real one does not.
 *
 * Pure and import-free: the server and the page share it, and `test:card-return-order` drives it directly.
 */

/** `url` with `order_id=<orderId>` set: an `order_id` already there is replaced, never doubled, and every other
 *  parameter (the cancel leg's `cancelled=1`) is kept. */
export function withOrderId(url: string, orderId: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set("order_id", orderId);
    return u.toString();
  } catch {
    // Not an absolute URL. The deposit action always builds one (`NEXT_PUBLIC_APP_URL`, else the production origin),
    // so this is a configuration fault; the id still travels rather than the deposit failing on it.
    return `${url}${url.includes("?") ? "&" : "?"}order_id=${encodeURIComponent(orderId)}`;
  }
}

/** The order id a return leg carries, read as the page reads it: trimmed, at most 64 characters, and cut at a `?`.
 *  A gateway that appends its own parameters with a second `?` (to a URL that already has a query) would otherwise
 *  glue `?payment_status=…` onto the id, and the lookup would miss. Our order ids never contain a `?`. */
export function cardReturnOrderId(raw: string | null | undefined): string {
  return String(raw ?? "").split("?")[0].trim().slice(0, 64);
}
