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

console.log(`\nselcom-adapter: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
