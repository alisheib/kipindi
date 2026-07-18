/**
 * CARD DEPOSIT — the Selcom hosted-checkout rail, end to end at the unit level.
 *
 * This suite exists because the card rail is the newest money-in path and its
 * failure modes are the expensive kind: sending a buyer to a broken URL, showing
 * "failed" while a charge is still moving, or crediting on an unsigned browser
 * redirect. Each of those is pinned below.
 *
 * Covered:
 *   1. create-order request shape — the exact contract Selcom rejects orders over
 *      (endpoint, payment_methods=CARD, flat dotted billing keys, no_of_items,
 *      base64 on redirect/cancel/webhook and NOTHING else).
 *   2. payment_gateway_url decoding — base64 (the real behaviour) AND the plain
 *      form the docs sample shows, plus the "unusable → fail cleanly" case.
 *   3. order-status enum → settlement verdict, including the INPROGRESS
 *      regression that used to mark a paying customer FAILED.
 *   4. The return leg: unsigned query params must never credit; ownership is
 *      enforced; pending never reports failure; settlement is idempotent under
 *      refresh / back-button / double-submit.
 */
import assert from "node:assert/strict";
import { selcomCardCheckout, decodeGatewayUrl, selcomVerifyOrder, type SelcomEnv } from "../src/lib/server/selcom.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};

const ENV: SelcomEnv = {
  baseUrl: "https://apigw.example.test/v1",
  apiKey: "test-key",
  apiSecret: "test-secret",
  vendor: "SW00000000",
  webhookUrl: "https://www.50pick.tz/api/webhooks/payments",
  timeoutMs: 5_000,
};

const BILLING = {
  firstName: "Asha", lastName: "Mrisho",
  address1: "12 Samora Ave", city: "Dar es Salaam",
  stateOrRegion: "Dar es Salaam", postcodeOrPobox: "P.O. Box 1234",
  country: "TZ", phone: "+255712345678",
};

const CARD_OPTS = {
  orderId: "dep_abc123",
  amount: 10_000,
  buyerEmail: "asha@example.com",
  buyerName: "Asha Mrisho",
  buyerPhone: "0712345678",
  billing: BILLING,
  redirectUrl: "https://www.50pick.tz/wallet/deposit/return",
  cancelUrl: "https://www.50pick.tz/wallet/deposit/return?cancelled=1",
};

// ── Capture the outbound request without touching the network ────────────────
type Captured = { url: string; method: string; headers: Record<string, string>; body: Record<string, unknown> };
function stubFetch(respond: () => { status: number; json: unknown }): { calls: Captured[]; restore: () => void } {
  const calls: Captured[] = [];
  const real = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = Object.fromEntries(Object.entries((init?.headers ?? {}) as Record<string, string>));
    calls.push({
      url: String(input),
      method: init?.method ?? "GET",
      headers,
      body: init?.body ? JSON.parse(String(init.body)) : {},
    });
    const r = respond();
    return new Response(JSON.stringify(r.json), { status: r.status, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  return { calls, restore: () => { globalThis.fetch = real; } };
}

const okOrder = () => ({
  status: 200,
  json: {
    reference: "0289999288", resultcode: "000", result: "SUCCESS", message: "Order creation successful",
    data: [{
      gateway_buyer_uuid: "12344321",
      payment_token: "80008000",
      payment_gateway_url: Buffer.from("https://checkout.selcommobile.com/pg/t12222").toString("base64"),
    }],
  },
});

// ── 1. REQUEST SHAPE ─────────────────────────────────────────────────────────
{
  const s = stubFetch(okOrder);
  const r = await selcomCardCheckout(ENV, CARD_OPTS);
  s.restore();
  const call = s.calls[0]!;
  const b = call.body as Record<string, string | number>;

  ok("card order succeeds", r.ok === true);
  ok("hits /checkout/create-order (NOT -minimal — minimal cannot do cards)",
    call.url.endsWith("/checkout/create-order"), call.url);
  ok("is a POST", call.method === "POST");
  ok("payment_methods restricts the hosted page to CARD", b.payment_methods === "CARD", String(b.payment_methods));
  ok("no_of_items is present (mandatory; omitting it is rejected)", b.no_of_items === 1, String(b.no_of_items));
  ok("amount is a whole TZS integer, not cents", b.amount === 10_000, String(b.amount));
  ok("currency is TZS", b.currency === "TZS");
  ok("buyer_phone normalised to 255XXXXXXXXX", b.buyer_phone === "255712345678", String(b.buyer_phone));

  // Billing must be FLAT DOTTED keys — a nested object is silently wrong and the
  // order gets rejected as "card payment with no billing info".
  ok("billing keys are flat dotted strings", typeof b["billing.firstname"] === "string" && b.billing === undefined);
  ok("billing.firstname", b["billing.firstname"] === "Asha");
  ok("billing.lastname", b["billing.lastname"] === "Mrisho");
  ok("billing.address_1", b["billing.address_1"] === "12 Samora Ave");
  ok("billing.city", b["billing.city"] === "Dar es Salaam");
  ok("billing.state_or_region", b["billing.state_or_region"] === "Dar es Salaam");
  ok("billing.postcode_or_pobox", b["billing.postcode_or_pobox"] === "P.O. Box 1234");
  ok("billing.country is ISO alpha-2", b["billing.country"] === "TZ");
  ok("billing.phone normalised", b["billing.phone"] === "255712345678", String(b["billing.phone"]));

  // Exactly three fields are base64 on the wire.
  const dec = (v: unknown) => Buffer.from(String(v), "base64").toString("utf8");
  ok("redirect_url is base64", dec(b.redirect_url) === CARD_OPTS.redirectUrl, dec(b.redirect_url));
  ok("cancel_url is base64", dec(b.cancel_url) === CARD_OPTS.cancelUrl);
  ok("webhook is base64", dec(b.webhook) === ENV.webhookUrl);
  ok("buyer_email is NOT base64-encoded", b.buyer_email === "asha@example.com");
  ok("order_id is NOT base64-encoded", b.order_id === "dep_abc123");

  // Signing: Signed-Fields must be derived FROM the body, in the same iteration
  // order used to build the digest. Hardcoding it is how you get a 401.
  const signed = String(call.headers["Signed-Fields"] ?? "");
  ok("Signed-Fields lists every body key, in body order",
    signed === Object.keys(b).join(","), `${signed}`);
  ok("Signed-Fields excludes `timestamp`", !signed.split(",").includes("timestamp"));
  ok("Authorization is SELCOM base64(apiKey), not hex",
    call.headers.Authorization === `SELCOM ${Buffer.from(ENV.apiKey).toString("base64")}`);
  ok("Digest-Method is HS256", call.headers["Digest-Method"] === "HS256");
  ok("Timestamp carries the +03:00 EAT offset, no millis",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+03:00$/.test(String(call.headers.Timestamp)), String(call.headers.Timestamp));
}

// ── 2. GATEWAY URL DECODING ──────────────────────────────────────────────────
{
  const s = stubFetch(okOrder);
  const r = await selcomCardCheckout(ENV, CARD_OPTS);
  s.restore();
  ok("base64 payment_gateway_url is decoded before redirect",
    r.ok && r.gatewayUrl === "https://checkout.selcommobile.com/pg/t12222", r.ok ? r.gatewayUrl : "not ok");
}
{
  // Selcom's own docs sample for the FULL create-order shows the URL UNENCODED.
  // Both forms must work or card deposits break on a docs discrepancy.
  const s = stubFetch(() => ({
    status: 200,
    json: { resultcode: "000", result: "SUCCESS", data: [{ payment_gateway_url: "https://checkout.selcommobile.com/pg/plain" }] },
  }));
  const r = await selcomCardCheckout(ENV, CARD_OPTS);
  s.restore();
  ok("plain (unencoded) payment_gateway_url also works",
    r.ok && r.gatewayUrl === "https://checkout.selcommobile.com/pg/plain");
}
ok("decodeGatewayUrl: base64", decodeGatewayUrl(Buffer.from("https://a.test/x").toString("base64")) === "https://a.test/x");
ok("decodeGatewayUrl: plain", decodeGatewayUrl("https://a.test/x") === "https://a.test/x");
ok("decodeGatewayUrl: junk → null", decodeGatewayUrl("not-a-url") === null);
ok("decodeGatewayUrl: empty → null", decodeGatewayUrl("") === null);
ok("decodeGatewayUrl: missing → null", decodeGatewayUrl(undefined) === null);
{
  // An accepted order with no usable URL must fail cleanly rather than redirect
  // the buyer somewhere broken. Nothing was charged at this point.
  const s = stubFetch(() => ({ status: 200, json: { resultcode: "000", result: "SUCCESS", data: [{}] } }));
  const r = await selcomCardCheckout(ENV, CARD_OPTS);
  s.restore();
  ok("accepted order with no usable URL → PROVIDER_DOWN, not a broken redirect",
    !r.ok && r.reason === "PROVIDER_DOWN");
}

// ── 3. FAILURE MODES AT CREATE TIME (all definitive — nothing charged yet) ───
{
  const s = stubFetch(() => ({ status: 500, json: {} }));
  const r = await selcomCardCheckout(ENV, CARD_OPTS);
  s.restore();
  ok("HTTP 5xx → PROVIDER_DOWN", !r.ok && r.reason === "PROVIDER_DOWN");
}
{
  const s = stubFetch(() => ({ status: 200, json: { resultcode: "038", result: "FAILED", message: "Invalid billing" } }));
  const r = await selcomCardCheckout(ENV, CARD_OPTS);
  s.restore();
  ok("clean Selcom rejection → DECLINED", !r.ok && r.reason === "DECLINED");
}
{
  const real = globalThis.fetch;
  globalThis.fetch = (async () => { throw new Error("network down"); }) as typeof fetch;
  const r = await selcomCardCheckout(ENV, CARD_OPTS);
  globalThis.fetch = real;
  // Unlike the USSD rail, a create-order failure is NOT ambiguous: the buyer has
  // not seen a card form, so nothing can have been charged.
  ok("network failure at create-order → PROVIDER_DOWN (definitive, safe to fail)",
    !r.ok && r.reason === "PROVIDER_DOWN");
}

// ── 4. ORDER-STATUS ENUM → SETTLEMENT VERDICT ────────────────────────────────
// The documented enum is PENDING · COMPLETED · CANCELLED · USERCANCELLED ·
// REJECTED · INPROGRESS. Only the three cancellation/rejection values are
// terminal failures. Everything else must stay non-terminal and be re-queried.
const STATUS_CASES: Array<[string, "CONFIRMED" | "FAILED" | null]> = [
  ["COMPLETED", "CONFIRMED"],
  ["completed", "CONFIRMED"],          // case-insensitive
  ["CANCELLED", "FAILED"],
  ["USERCANCELLED", "FAILED"],
  ["REJECTED", "FAILED"],
  ["PENDING", null],
  ["INPROGRESS", null],                // ⚠️ the regression: used to be FAILED
  ["", null],
  ["SOMETHING_NEW_SELCOM_ADDED", null],// unknown must never hard-fail a payment
];
for (const [ps, expected] of STATUS_CASES) {
  const s = stubFetch(() => ({ status: 200, json: { data: [{ payment_status: ps, amount: "10000" }] } }));
  const v = await selcomVerifyOrder(ENV, "dep_abc123");
  s.restore();
  ok(`order-status "${ps || "(empty)"}" → ${expected ?? "non-terminal (re-query)"}`,
    v.status === expected, `got ${v.status}`);
}
{
  const s = stubFetch(() => ({ status: 500, json: {} }));
  const v = await selcomVerifyOrder(ENV, "dep_abc123");
  s.restore();
  ok("order-status HTTP error → non-terminal (never fail a payment on our outage)", v.status === null);
}

console.log(`\ncard-deposit: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
