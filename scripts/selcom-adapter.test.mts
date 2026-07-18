/**
 * Selcom adapter — signing + normalisation proofs.
 *
 * The load-bearing assertion is the GOLDEN VECTOR: our signer must reproduce the
 * exact Digest + Authorization from Selcom's own documented worked example (see
 * docs/SELCOM-API-DIGEST.md §1). If this passes, the HMAC scheme is byte-correct
 * and real requests will authenticate. The rest pin phone/MNO/status normalisation
 * and the inbound-callback verifier. Pure functions — no DB, no network.
 */
import {
  selcomSignedHeaders,
  selcomSigningString,
  eatTimestamp,
  toSelcomMsisdn,
  mnoToSelcomCashin,
  selcomInitiateVerdict,
  verifySelcomCallback,
  selcomPing,
  selcomDeposit,
  selcomWithdraw,
} from "../src/lib/server/selcom.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean) => { if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}`); } };

// ── GOLDEN VECTOR (Selcom's own sample creds + documented digest) ─────────────
const SAMPLE_KEY = "202cb962ac59075b964b07152d234b70";
const SAMPLE_SECRET = "81dc9bdb52d04dc20036dbd8313ed055";
const GOLDEN_TS = "2019-02-26T09:30:46+03:00";
const goldenBody = { utilityref: "12345", transid: "transid", amount: 5000 };

const signStr = selcomSigningString(goldenBody, GOLDEN_TS);
ok("signing string exact", signStr === "timestamp=2019-02-26T09:30:46+03:00&utilityref=12345&transid=transid&amount=5000");

const h = selcomSignedHeaders(goldenBody, { apiKey: SAMPLE_KEY, apiSecret: SAMPLE_SECRET }, GOLDEN_TS);
ok("GOLDEN Digest matches Selcom docs", h.Digest === "TFHAyQ1k1d601bVfimp+GJsgiBPzMmmV0QJl0bX1c1Q=");
ok("GOLDEN Authorization = SELCOM base64(key)", h.Authorization === "SELCOM MjAyY2I5NjJhYzU5MDc1Yjk2NGIwNzE1MmQyMzRiNzA=");
ok("Digest-Method HS256", h["Digest-Method"] === "HS256");
ok("Signed-Fields in body order", h["Signed-Fields"] === "utilityref,transid,amount");
ok("Timestamp echoed", h.Timestamp === GOLDEN_TS);
ok("Content-Type json", h["Content-Type"] === "application/json");

// A single byte change in the secret must change the digest (sanity that it's real HMAC).
const h2 = selcomSignedHeaders(goldenBody, { apiKey: SAMPLE_KEY, apiSecret: SAMPLE_SECRET + "x" }, GOLDEN_TS);
ok("different secret → different digest", h2.Digest !== h.Digest);

// ── eatTimestamp format ───────────────────────────────────────────────────────
const ts = eatTimestamp(Date.UTC(2026, 6, 17, 11, 5, 9)); // 11:05:09 UTC → 14:05:09 EAT
ok("eatTimestamp EAT +03:00 exact", ts === "2026-07-17T14:05:09+03:00");
ok("eatTimestamp no millis", !/\.\d/.test(ts));
ok("eatTimestamp ends +03:00", ts.endsWith("+03:00"));

// ── Phone normalisation → 255XXXXXXXXX ────────────────────────────────────────
ok("07… → 2557…", toSelcomMsisdn("0712345678") === "255712345678");
ok("+2557… → 2557…", toSelcomMsisdn("+255712345678") === "255712345678");
ok("2557… stays", toSelcomMsisdn("255712345678") === "255712345678");
ok("9-digit 7… → 2557…", toSelcomMsisdn("712345678") === "255712345678");
ok("spaces/dashes stripped", toSelcomMsisdn("0712 345-678") === "255712345678");

// ── MNO → cashin code ─────────────────────────────────────────────────────────
ok("MPESA → VMCASHIN", mnoToSelcomCashin("MPESA") === "VMCASHIN");
ok("AIRTEL_MONEY → AMCASHIN", mnoToSelcomCashin("AIRTEL_MONEY") === "AMCASHIN");
ok("TIGO_PESA → TPCASHIN", mnoToSelcomCashin("TIGO_PESA") === "TPCASHIN");
ok("MIXX → TPCASHIN", mnoToSelcomCashin("MIXX") === "TPCASHIN");
ok("HALO_PESA → HPCASHIN", mnoToSelcomCashin("HALO_PESA") === "HPCASHIN");
ok("TTCL_PESA → TTCASHIN", mnoToSelcomCashin("TTCL_PESA") === "TTCASHIN");
ok("CARD → null (unsupported by MNO cash-in)", mnoToSelcomCashin("CARD") === null);
ok("INTERNAL → null", mnoToSelcomCashin("INTERNAL") === null);

// ── Initiate verdict ──────────────────────────────────────────────────────────
ok("000 → ACCEPTED", selcomInitiateVerdict({ resultcode: "000", result: "SUCCESS" }) === "ACCEPTED");
ok("111 PENDING → ACCEPTED", selcomInitiateVerdict({ resultcode: "111", result: "PENDING" }) === "ACCEPTED");
ok("927 INPROGRESS → ACCEPTED", selcomInitiateVerdict({ resultcode: "927" }) === "ACCEPTED");
ok("999 AMBIGUOUS → ACCEPTED (never hard-fail a maybe-successful movement)", selcomInitiateVerdict({ resultcode: "999", result: "AMBIGOUS" }) === "ACCEPTED");
ok("failure code → FAILED", selcomInitiateVerdict({ resultcode: "038", result: "FAIL" }) === "FAILED");
ok("403 FAIL → FAILED", selcomInitiateVerdict({ resultcode: "403", result: "FAIL" }) === "FAILED");
ok("empty → FAILED", selcomInitiateVerdict({}) === "FAILED");

// ── Inbound callback verifier ─────────────────────────────────────────────────
// Build a genuine signed callback with a known secret, then verify it round-trips.
const cbSecret = "test-callback-secret";
const cbBody = { transid: "T1", order_id: "dep_abc", reference: "0281121212", result: "SUCCESS", resultcode: "000", payment_status: "COMPLETED" };
const cbTs = "2026-07-17T14:05:09+03:00";
const cbHeaders = selcomSignedHeaders(cbBody, { apiKey: "k", apiSecret: cbSecret }, cbTs);
ok("valid callback digest verifies", verifySelcomCallback({ signedFields: cbHeaders["Signed-Fields"], timestamp: cbTs, digestB64: cbHeaders.Digest, body: cbBody, apiSecret: cbSecret }) === true);
ok("wrong secret → rejected", verifySelcomCallback({ signedFields: cbHeaders["Signed-Fields"], timestamp: cbTs, digestB64: cbHeaders.Digest, body: cbBody, apiSecret: "other" }) === false);
ok("tampered body → rejected", verifySelcomCallback({ signedFields: cbHeaders["Signed-Fields"], timestamp: cbTs, digestB64: cbHeaders.Digest, body: { ...cbBody, payment_status: "PENDING" }, apiSecret: cbSecret }) === false);
ok("missing digest → rejected", verifySelcomCallback({ signedFields: cbHeaders["Signed-Fields"], timestamp: cbTs, digestB64: "", body: cbBody, apiSecret: cbSecret }) === false);
ok("missing timestamp → rejected", verifySelcomCallback({ signedFields: cbHeaders["Signed-Fields"], timestamp: "", digestB64: cbHeaders.Digest, body: cbBody, apiSecret: cbSecret }) === false);

// ── Connectivity probe hits the REAL signed endpoint ──────────────────────────
// Regression guard: the "Test Selcom" probe MUST target /checkout/order-status
// (the same endpoint the deposit reconciliation uses) — never the bare
// /order-status, which doesn't exist on the gateway and would make a 404 "auth
// OK" reading a false positive (any unsigned request to a missing path 404s too).
{
  const realFetch = globalThis.fetch;
  let capturedUrl = "";
  globalThis.fetch = (async (url: unknown) => {
    capturedUrl = String(url);
    return new Response(JSON.stringify({ resultcode: "000", message: "order not found" }), { status: 404, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  await selcomPing({ baseUrl: "https://apigw.selcommobile.com/v1", apiKey: "k", apiSecret: "s", vendor: "v", timeoutMs: 5_000 });
  globalThis.fetch = realFetch;
  ok("probe targets /checkout/order-status", /\/v1\/checkout\/order-status\?/.test(capturedUrl));
  ok("probe does NOT hit bare /order-status", !/\/v1\/order-status\?/.test(capturedUrl));
}

// ── MONEY-SAFETY: initiate outcome classification (never reverse a maybe-sent payout) ──
// A network timeout / HTTP error AFTER the request left must be AMBIGUOUS, not a hard
// failure — the payout may be in flight and the deposit push may have reached the
// handset. Only a DEFINITIVE Selcom rejection is FAILED/DECLINED. Regression guard for
// the double-pay / charged-not-credited bug.
const FAKE_ENV = { baseUrl: "https://apigw.selcommobile.com/v1", apiKey: "k", apiSecret: "s", vendor: "v", pin: "1234", timeoutMs: 5_000 };
const jsonResp = (code: string, status = 200) =>
  new Response(JSON.stringify({ resultcode: code, result: code === "000" ? "SUCCESS" : (["111", "927", "999"].includes(code) ? "PENDING" : "FAIL") }), { status, headers: { "content-type": "application/json" } });

async function withFetch(handler: (url: string, method: string) => Promise<Response> | Response, fn: () => Promise<void>) {
  const real = globalThis.fetch;
  globalThis.fetch = (async (url: unknown, init?: { method?: string }) => handler(String(url), init?.method ?? "GET")) as typeof fetch;
  try { await fn(); } finally { globalThis.fetch = real; }
}

// selcomWithdraw — the disbursement submit
await withFetch(() => { throw Object.assign(new Error("aborted"), { name: "AbortError" }); }, async () => {
  const r = await selcomWithdraw(FAKE_ENV, { transid: "t1", amount: 1000, msisdn: "0712345678", utilityCode: "VMCASHIN" });
  ok("withdraw timeout → AMBIGUOUS (do NOT reverse)", !r.ok && r.reason === "AMBIGUOUS");
});
await withFetch(() => jsonResp("500", 500), async () => {
  const r = await selcomWithdraw(FAKE_ENV, { transid: "t2", amount: 1000, msisdn: "0712345678", utilityCode: "VMCASHIN" });
  ok("withdraw HTTP 500 → AMBIGUOUS", !r.ok && r.reason === "AMBIGUOUS");
});
await withFetch(() => jsonResp("038", 200), async () => {
  const r = await selcomWithdraw(FAKE_ENV, { transid: "t3", amount: 1000, msisdn: "0712345678", utilityCode: "VMCASHIN" });
  ok("withdraw definitive FAIL code → FAILED (safe to reverse)", !r.ok && r.reason === "FAILED");
});
await withFetch(() => jsonResp("999", 200), async () => {
  const r = await selcomWithdraw(FAKE_ENV, { transid: "t4", amount: 1000, msisdn: "0712345678", utilityCode: "VMCASHIN" });
  ok("withdraw 999 AMBIGUOUS envelope → accepted/pending (never FAILED)", r.ok === true);
});
await withFetch(() => jsonResp("000", 200), async () => {
  const r = await selcomWithdraw(FAKE_ENV, { transid: "t5", amount: 1000, msisdn: "0712345678", utilityCode: "VMCASHIN" });
  ok("withdraw 000 → accepted", r.ok === true);
});

// selcomDeposit — create-order then wallet-payment (USSD push)
await withFetch((u) => u.includes("create-order") ? jsonResp("000") : (() => { throw Object.assign(new Error("x"), { name: "AbortError" }); })(), async () => {
  const r = await selcomDeposit(FAKE_ENV, { orderId: "o1", amount: 1000, msisdn: "0712345678", userId: "u" });
  ok("deposit: order ok but pay-push times out → AMBIGUOUS (leave PROCESSING)", !r.ok && r.reason === "AMBIGUOUS");
});
await withFetch((u) => u.includes("create-order") ? jsonResp("000") : jsonResp("500", 500), async () => {
  const r = await selcomDeposit(FAKE_ENV, { orderId: "o2", amount: 1000, msisdn: "0712345678", userId: "u" });
  ok("deposit: pay-push HTTP 500 → AMBIGUOUS", !r.ok && r.reason === "AMBIGUOUS");
});
await withFetch((u) => u.includes("create-order") ? jsonResp("000") : jsonResp("038"), async () => {
  const r = await selcomDeposit(FAKE_ENV, { orderId: "o3", amount: 1000, msisdn: "0712345678", userId: "u" });
  ok("deposit: pay-push clean reject → DECLINED", !r.ok && r.reason === "DECLINED");
});
await withFetch(() => { throw Object.assign(new Error("x"), { name: "AbortError" }); }, async () => {
  const r = await selcomDeposit(FAKE_ENV, { orderId: "o4", amount: 1000, msisdn: "0712345678", userId: "u" });
  ok("deposit: create-order fails (before any push) → PROVIDER_DOWN (safe fail)", !r.ok && r.reason === "PROVIDER_DOWN");
});
await withFetch((u) => u.includes("create-order") ? jsonResp("000") : jsonResp("000"), async () => {
  const r = await selcomDeposit(FAKE_ENV, { orderId: "o5", amount: 1000, msisdn: "0712345678", userId: "u" });
  ok("deposit: both steps ok → accepted", r.ok === true);
});

console.log(`\nselcom-adapter: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
