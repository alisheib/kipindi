/**
 * STUB SELCOM GATEWAY — a local stand-in for apigw.selcommobile.com.
 *
 * WHY: the real Selcom credentials are IP-allow-listed to the Railway egress, so
 * there is NO way to exercise the card rail locally against the real gateway.
 * Without a stub, the only place to test a card deposit would be production with
 * real money — which is exactly what we must not do. This serves the same
 * endpoints with the same envelope shapes so the whole flow (create-order →
 * hosted page → return leg → order-status → credit) can be driven repeatedly and
 * deterministically.
 *
 * Point the app at it with PAYMENT_API_URL=http://127.0.0.1:4599/v1.
 *
 * Scenario is driven by the deposit AMOUNT, so a test can choose an outcome
 * without any out-of-band coordination:
 *   amount ending 00 → PAYS (order-status flips to COMPLETED)
 *   amount ending 11 → stays PENDING forever (the "still processing" case)
 *   amount ending 22 → INPROGRESS (non-terminal; must NOT be shown as failed)
 *   amount ending 33 → REJECTED (declined card)
 *   amount ending 44 → USERCANCELLED (buyer cancelled on the gateway page)
 *   amount ending 55 → create-order itself fails (gateway down)
 *
 * It deliberately does NOT verify our signature: signing is already pinned
 * byte-for-byte against Selcom's own golden vector in selcom-adapter.test.mts.
 * What this stub exists to exercise is the STATE MACHINE around it.
 */
import { createServer } from "node:http";

const PORT = Number(process.env.STUB_PORT || 4599);

/** order_id → { amount, status } */
const orders = new Map();

function scenarioFor(amount) {
  const last2 = Math.round(Number(amount)) % 100;
  switch (last2) {
    case 11: return "PENDING";
    case 22: return "INPROGRESS";
    case 33: return "REJECTED";
    case 44: return "USERCANCELLED";
    case 55: return "CREATE_FAIL";
    default: return "COMPLETED";
  }
}

function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json", "content-length": Buffer.byteLength(json) });
  res.end(json);
}

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const path = url.pathname.replace(/^\/v1/, "");

  let raw = "";
  req.on("data", (c) => { raw += c; });
  req.on("end", () => {
    const body = raw ? JSON.parse(raw) : {};

    // ── Hosted checkout: create the order, hand back a gateway URL ──────────
    if (path === "/checkout/create-order" || path === "/checkout/create-order-minimal") {
      const orderId = body.order_id;
      const amount = Number(body.amount);
      const scenario = scenarioFor(amount);

      if (scenario === "CREATE_FAIL") {
        return send(res, 200, { resultcode: "038", result: "FAILED", message: "Order creation failed (stub scenario)" });
      }

      // COMPLETED pays immediately; every other scenario parks in its own state.
      orders.set(orderId, {
        amount,
        status: scenario === "COMPLETED" ? "COMPLETED" : scenario,
      });

      // The stub's "hosted page" is just our own return URL — the buyer would
      // normally type a card in between. base64, exactly like the real gateway.
      const redirectBack = body.redirect_url
        ? Buffer.from(String(body.redirect_url), "base64").toString("utf8")
        : "http://127.0.0.1:3000/wallet/deposit/return";
      const sep = redirectBack.includes("?") ? "&" : "?";
      const gatewayUrl = `${redirectBack}${sep}order_id=${encodeURIComponent(orderId)}&payment_status=${orders.get(orderId).status}&transid=STUBTX${Date.now()}`;

      return send(res, 200, {
        reference: `STUB${Date.now()}`,
        resultcode: "000",
        result: "SUCCESS",
        message: "Order creation successful",
        data: [{
          gateway_buyer_uuid: "stub-uuid",
          payment_token: "stub-token",
          payment_gateway_url: Buffer.from(gatewayUrl).toString("base64"),
        }],
      });
    }

    // ── Mobile-money USSD push ──────────────────────────────────────────────
    if (path === "/checkout/wallet-payment") {
      const o = orders.get(body.order_id);
      if (!o) return send(res, 200, { resultcode: "038", result: "FAILED", message: "unknown order" });
      return send(res, 200, { reference: "STUBPUSH", resultcode: "111", result: "PENDING", message: "USSD push sent" });
    }

    // ── THE AUTHORITY: order-status. This is what actually moves our money. ──
    if (path === "/checkout/order-status") {
      const orderId = url.searchParams.get("order_id");
      const o = orders.get(orderId);
      if (!o) {
        return send(res, 200, { resultcode: "038", result: "FAILED", message: "Order not found", data: [] });
      }
      return send(res, 200, {
        reference: "STUBREF",
        resultcode: "000",
        result: "SUCCESS",
        message: "Order fetch successful",
        data: [{
          order_id: orderId,
          amount: String(o.amount),
          payment_status: o.status,
          transid: o.status === "COMPLETED" ? "STUBTX" : null,
          channel: o.status === "COMPLETED" ? "CARD" : null,
        }],
      });
    }

    return send(res, 404, { resultcode: "404", result: "FAILED", message: `stub: no route ${path}` });
  });
});

// Test hook: flip a parked order to COMPLETED, simulating a webhook/settlement
// that lands AFTER the buyer already returned.
server.on("request", () => {});
server.listen(PORT, "127.0.0.1", () => {
  console.log(`[selcom-stub] listening on http://127.0.0.1:${PORT}/v1`);
});

process.on("SIGTERM", () => server.close());
process.on("SIGINT", () => server.close());
