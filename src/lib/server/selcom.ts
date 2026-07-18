/**
 * Selcom Mobile (BoT-licensed aggregator) — the raw gateway client.
 *
 * This module owns everything Selcom-specific: the request signer, the credential
 * reader, phone/MNO normalisation, and the four HTTP calls we make (create-order →
 * wallet-payment for a deposit; wallet-cashin for a payout; order-status for
 * authoritative reconciliation). `payments.ts` `selcomAdapter` and the payment
 * webhook route are thin wrappers over these.
 *
 * ⚠️ REAL-MONEY SIGNING — every detail here was verified against the official docs
 * + the official PHP/Node SDKs + community SDKs and independently reproduced
 * against Selcom's own worked example (see docs/SELCOM-API-DIGEST.md; the golden
 * vector is asserted in scripts/selcom-adapter.test.mts). Do NOT "tidy" the signing
 * string, the header casing, or the timestamp format without re-verifying — a
 * one-byte change is a 401 and every payment fails.
 *
 * Signing (per request):
 *   Authorization: `SELCOM ` + base64(API_KEY)
 *   Digest-Method: HS256
 *   Digest:        base64( HMAC_SHA256( signing_string, API_SECRET ) )
 *   Timestamp:     ISO-8601 with +03:00 (Africa/Dar_es_Salaam), no millis
 *   Signed-Fields: comma-joined body keys, in order
 *   signing_string = `timestamp=<TS>&<k1>=<v1>&<k2>=<v2>…` (timestamp first; raw values)
 *
 * ⛔ Uncertain items still to confirm with Selcom before flipping to prod are
 * catalogued in docs/SELCOM-API-DIGEST.md §8. The safe reconciliation design here
 * (deposits settle from the signed order-status re-query, not the callback body)
 * is deliberately robust against the ones that touch the callback format.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { PaymentProvider } from "./payments";

// ── Credentials ───────────────────────────────────────────────────────────────
export type SelcomEnv = {
  baseUrl: string;    // e.g. https://apigwtest.selcommobile.com/v1  (sandbox) — no trailing slash
  apiKey: string;
  apiSecret: string;
  vendor: string;     // Selcom vendor/till id
  pin?: string;       // float-account PIN — required for wallet-cashin (payouts)
  webhookUrl?: string;// per-order callback URL (base64-encoded on the wire)
  timeoutMs: number;
};

/** Read Selcom creds from env. Returns null if the mandatory four are absent
 *  (base URL, API key, API secret, vendor) — the caller treats that as PROVIDER_DOWN. */
export function selcomEnv(): SelcomEnv | null {
  const baseUrl = process.env.PAYMENT_API_URL;
  const apiKey = process.env.PAYMENT_API_KEY;
  const apiSecret = process.env.PAYMENT_API_SECRET;
  const vendor = process.env.PAYMENT_VENDOR_ID;
  if (!baseUrl || !apiKey || !apiSecret || !vendor) return null;
  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    apiKey,
    apiSecret,
    vendor,
    pin: process.env.PAYMENT_VENDOR_PIN || undefined,
    webhookUrl: process.env.PAYMENT_WEBHOOK_URL || undefined,
    timeoutMs: Number(process.env.PAYMENT_TIMEOUT_MS) || 45_000,
  };
}

// ── Signing ───────────────────────────────────────────────────────────────────

/** ISO-8601 timestamp in Africa/Dar_es_Salaam (UTC+3, no DST), no milliseconds —
 *  matches PHP `date('c')` under that timezone (e.g. `2026-07-17T14:05:09+03:00`). */
export function eatTimestamp(now: number = Date.now()): string {
  // Shift the epoch by +3h, render as ISO (which labels it `Z`), then relabel +03:00.
  return new Date(now + 3 * 3_600_000).toISOString().slice(0, 19) + "+03:00";
}

/** Build the exact signing string Selcom HMACs: `timestamp=<TS>&k=v&…` (timestamp
 *  first and NOT itself a signed field; body fields in insertion order; raw values). */
export function selcomSigningString(body: Record<string, string | number>, timestamp: string): string {
  let s = `timestamp=${timestamp}`;
  for (const k of Object.keys(body)) s += `&${k}=${String(body[k])}`;
  return s;
}

/** The five signed headers for a Selcom request (+ Content-Type). `timestamp`
 *  defaults to now-in-EAT; pass a fixed value only for tests. */
export function selcomSignedHeaders(
  body: Record<string, string | number>,
  creds: { apiKey: string; apiSecret: string },
  timestamp: string = eatTimestamp(),
): Record<string, string> {
  const signedFields = Object.keys(body);
  const digest = createHmac("sha256", creds.apiSecret)
    .update(selcomSigningString(body, timestamp), "utf8")
    .digest("base64");
  return {
    "Content-Type": "application/json",
    Authorization: `SELCOM ${Buffer.from(creds.apiKey).toString("base64")}`,
    "Digest-Method": "HS256",
    Digest: digest,
    Timestamp: timestamp,
    "Signed-Fields": signedFields.join(","),
  };
}

/**
 * Verify the Digest on an INBOUND Selcom callback. We reconstruct the signing
 * string from the header's `Signed-Fields` (reading each value from the parsed
 * body) + the received `Timestamp` verbatim (so its exact format doesn't matter),
 * HMAC with our secret, and constant-time compare. Best-effort by design: the
 * authoritative deposit settlement comes from the signed order-status re-query,
 * not from trusting this — see the webhook route.
 */
export function verifySelcomCallback(opts: {
  signedFields: string;
  timestamp: string;
  digestB64: string;
  body: Record<string, unknown>;
  apiSecret: string;
}): boolean {
  if (!opts.signedFields || !opts.timestamp || !opts.digestB64) return false;
  const fields = opts.signedFields.split(",").map((f) => f.trim()).filter(Boolean);
  let s = `timestamp=${opts.timestamp}`;
  for (const k of fields) s += `&${k}=${String((opts.body as Record<string, unknown>)[k] ?? "")}`;
  const expected = createHmac("sha256", opts.apiSecret).update(s, "utf8").digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(opts.digestB64, "base64");
  } catch {
    return false;
  }
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// ── Phone / MNO normalisation ─────────────────────────────────────────────────

/** Normalise a Tanzanian MSISDN to Selcom's `255XXXXXXXXX` (12 digits, no `+`,
 *  no leading 0). Accepts `07…`, `+2557…`, `2557…`, `7…`. */
export function toSelcomMsisdn(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.startsWith("255")) return d;
  if (d.startsWith("0")) return "255" + d.slice(1);
  if (d.length === 9) return "255" + d;
  return d;
}

/** Map our MNO enum → Selcom wallet-cashin `utilitycode` (disbursement/payout).
 *  Returns null for rails Selcom mobile-money cash-in can't serve (card/bank/internal). */
export function mnoToSelcomCashin(provider: PaymentProvider): string | null {
  switch (provider) {
    case "MPESA":        return "VMCASHIN"; // Vodacom M-Pesa
    case "AIRTEL_MONEY": return "AMCASHIN"; // Airtel Money
    case "TIGO_PESA":    return "TPCASHIN"; // Tigo Pesa
    case "MIXX":         return "TPCASHIN"; // Mixx by Yas (formerly Tigo Pesa)
    case "HALO_PESA":    return "HPCASHIN"; // HaloPesa (single-source — verify)
    case "TTCL_PESA":    return "TTCASHIN"; // TTCL T-Pesa (single-source — verify)
    default:             return null;       // CARD / BANK_TRANSFER / INTERNAL
  }
}

// ── HTTP ──────────────────────────────────────────────────────────────────────

type SelcomResponse = { ok: boolean; httpStatus: number; json: SelcomEnvelope };
type SelcomEnvelope = {
  reference?: string;
  resultcode?: string;
  result?: string;
  message?: string;
  data?: Array<Record<string, unknown>>;
  [k: string]: unknown;
};

async function selcomFetch(env: SelcomEnv, method: "POST" | "GET", path: string, body: Record<string, string | number>): Promise<SelcomResponse> {
  const headers = selcomSignedHeaders(body, env);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.timeoutMs);
  try {
    let url = `${env.baseUrl}${path}`;
    const init: RequestInit = { method, headers, signal: controller.signal };
    if (method === "GET") {
      const qs = new URLSearchParams(Object.fromEntries(Object.entries(body).map(([k, v]) => [k, String(v)])));
      url += `?${qs.toString()}`;
    } else {
      init.body = JSON.stringify(body);
    }
    const res = await fetch(url, init);
    let json: SelcomEnvelope = {};
    try { json = (await res.json()) as SelcomEnvelope; } catch { /* non-JSON body */ }
    return { ok: res.ok, httpStatus: res.status, json };
  } finally {
    clearTimeout(timer);
  }
}

/** Selcom envelope → our terminal verdict at INITIATE time. Per the docs:
 *  `000`=SUCCESS · `111`/`927`=INPROGRESS · `999`=AMBIGUOUS (status unknown, wait
 *  for recon) · everything else = FAIL. We treat SUCCESS/INPROGRESS/AMBIGUOUS all
 *  as ACCEPTED → the money movement stays PROCESSING and is resolved by the status
 *  re-query / reconcile sweep. ⚠️ Money-safety: 999 must NOT be a hard fail — the
 *  request may have gone through, so failing it could reverse a real payout. */
export function selcomInitiateVerdict(json: SelcomEnvelope): "ACCEPTED" | "FAILED" {
  const code = String(json.resultcode ?? "").trim();
  const result = String(json.result ?? "").toUpperCase();
  if (code === "000" || code === "111" || code === "927" || code === "999" || ["SUCCESS", "PENDING", "INPROGRESS", "AMBIGOUS", "AMBIGUOUS"].includes(result)) return "ACCEPTED";
  return "FAILED";
}

/** Map a Selcom status-query envelope (order-status / walletcashin query) to a
 *  terminal settlement verdict. `000`/SUCCESS = done; a hard-fail code = failed;
 *  INPROGRESS/AMBIGUOUS = null (not terminal — query again later). */
function envelopeSettlementVerdict(json: SelcomEnvelope): "CONFIRMED" | "FAILED" | null {
  const code = String(json.resultcode ?? "").trim();
  const result = String(json.result ?? "").toUpperCase();
  if (code === "000" || result === "SUCCESS") return "CONFIRMED";
  if (code === "111" || code === "927" || code === "999" || ["INPROGRESS", "PENDING", "AMBIGOUS", "AMBIGUOUS"].includes(result)) return null;
  return "FAILED";
}

// ── Deposit (collection): create-order-minimal → wallet-payment (USSD push) ─────
// Reason taxonomy is MONEY-SAFETY load-bearing:
//   PROVIDER_DOWN / DECLINED = DEFINITIVE — the customer was NOT charged (order
//     never created, or Selcom cleanly rejected the push) → safe to fail the txn.
//   AMBIGUOUS = the USSD push MAY have reached the handset (network timeout / HTTP
//     error AFTER the request left) → the customer might still approve + pay, so we
//     must NOT declare failure. The caller keeps the deposit PROCESSING and lets the
//     authoritative order-status re-query (webhook + reconcile sweep) settle it.
export async function selcomDeposit(env: SelcomEnv, opts: { orderId: string; amount: number; msisdn: string; userId: string }): Promise<{ ok: true } | { ok: false; reason: "PROVIDER_DOWN" | "DECLINED" | "AMBIGUOUS" }> {
  const phone = toSelcomMsisdn(opts.msisdn);
  // 1) Create the order. Field order is load-bearing (== Signed-Fields order).
  const createBody: Record<string, string | number> = {
    vendor: env.vendor,
    order_id: opts.orderId,
    buyer_email: `${opts.userId}@users.50pick.tz`,
    buyer_name: opts.userId,
    buyer_phone: phone,
    amount: Math.round(opts.amount),
    currency: "TZS",
  };
  if (env.webhookUrl) createBody.webhook = Buffer.from(env.webhookUrl).toString("base64");
  let create: SelcomResponse;
  try {
    // Before any USSD push — the customer cannot have been charged yet, so a
    // failure/timeout here is DEFINITIVE (safe to fail the deposit).
    create = await selcomFetch(env, "POST", "/checkout/create-order-minimal", createBody);
  } catch {
    return { ok: false, reason: "PROVIDER_DOWN" };
  }
  if (!create.ok || selcomInitiateVerdict(create.json) === "FAILED") return { ok: false, reason: "PROVIDER_DOWN" };

  // 2) Push the USSD PIN prompt to the handset for that order. From here on a
  //    timeout/HTTP error is AMBIGUOUS — the prompt may have gone out and the
  //    customer may pay — so never hard-fail it.
  const payBody = { transid: opts.orderId, order_id: opts.orderId, msisdn: phone };
  let pay: SelcomResponse;
  try {
    pay = await selcomFetch(env, "POST", "/checkout/wallet-payment", payBody);
  } catch {
    return { ok: false, reason: "AMBIGUOUS" };
  }
  if (!pay.ok) return { ok: false, reason: "AMBIGUOUS" };                          // HTTP error after send — push may have happened
  if (selcomInitiateVerdict(pay.json) === "FAILED") return { ok: false, reason: "DECLINED" }; // clean Selcom rejection
  return { ok: true }; // async — the webhook/order-status settles it
}

// ── Withdrawal (disbursement): wallet-cashin ────────────────────────────────────
// Reason taxonomy is MONEY-SAFETY load-bearing (a payout must NEVER be reversed
// while it might still be in flight — that double-pays the player):
//   FAILED    = DEFINITIVE Selcom rejection (res.ok && a hard-fail resultcode) →
//               the disbursement did not happen → safe to reverse the hold.
//   AMBIGUOUS = network timeout, connection error, or non-2xx HTTP → the request
//               may have reached Selcom and the payout may be processing → the
//               caller keeps the withdrawal PROCESSING (hold intact) and lets the
//               authoritative walletcashin/query re-query resolve it.
export async function selcomWithdraw(env: SelcomEnv, opts: { transid: string; amount: number; msisdn: string; utilityCode: string }): Promise<{ ok: true } | { ok: false; reason: "FAILED" | "AMBIGUOUS" }> {
  // Field order is load-bearing. `utilityref` = the PAYEE msisdn (not `msisdn`).
  const body: Record<string, string | number> = {
    transid: opts.transid,
    utilitycode: opts.utilityCode,
    utilityref: toSelcomMsisdn(opts.msisdn),
    amount: Math.round(opts.amount),
    vendor: env.vendor,
    pin: env.pin ?? "",
  };
  let res: SelcomResponse;
  try {
    res = await selcomFetch(env, "POST", "/walletcashin/process", body);
  } catch {
    return { ok: false, reason: "AMBIGUOUS" }; // timeout / network after send — payout may be in flight
  }
  if (!res.ok) return { ok: false, reason: "AMBIGUOUS" };                          // HTTP error — ambiguous, may have been accepted
  if (selcomInitiateVerdict(res.json) === "FAILED") return { ok: false, reason: "FAILED" }; // definitive reject — safe to reverse
  return { ok: true }; // async (incl. 999/INPROGRESS) — the payout query confirms/reverses
}

// ── Order-status: the AUTHORITATIVE reconciliation for a collection ─────────────
/** Re-query a checkout order's real state with a signed request. This is the
 *  authority the deposit webhook settles on — it does not trust the callback body.
 *  Returns CONFIRMED only when Selcom itself reports payment_status=COMPLETED. */
export async function selcomVerifyOrder(env: SelcomEnv, orderId: string): Promise<{ status: "CONFIRMED" | "FAILED" | null; amount?: number }> {
  let res: SelcomResponse;
  try {
    res = await selcomFetch(env, "GET", "/checkout/order-status", { order_id: orderId });
  } catch {
    return { status: null }; // transient — leave PROCESSING for the reconcile sweep
  }
  if (!res.ok) return { status: null };
  const row = res.json.data?.[0] ?? {};
  const ps = String(row.payment_status ?? "").toUpperCase();
  const rawAmt = row.amount;
  const amount = rawAmt != null && !Number.isNaN(Number(rawAmt)) ? Number(rawAmt) : undefined;
  if (ps === "COMPLETED") return { status: "CONFIRMED", amount };
  if (ps === "PENDING" || ps === "") return { status: null }; // not terminal yet
  return { status: "FAILED", amount }; // any other terminal value = not paid
}

/**
 * Authoritative status of a wallet-cashin (disbursement/payout), via the docs'
 * `GET /v1/walletcashin/query?transid=` (Signed-Fields: transid). This lets a
 * withdrawal settle from a SIGNED re-query rather than trusting the inbound
 * callback — the same money-safe posture as deposits. Returns null while the
 * payout is still in progress / ambiguous, so we simply query again later.
 */
export async function selcomVerifyCashin(env: SelcomEnv, transid: string): Promise<{ status: "CONFIRMED" | "FAILED" | null }> {
  let res: SelcomResponse;
  try {
    res = await selcomFetch(env, "GET", "/walletcashin/query", { transid });
  } catch {
    return { status: null };
  }
  if (!res.ok) return { status: null };
  return { status: envelopeSettlementVerdict(res.json) };
}

/**
 * Connectivity + credential check that moves NO money: a signed order-status query
 * for a fixed probe id. Valid creds/signature/IP → a normal envelope (e.g. "order
 * not found"); wrong creds or a non-allow-listed IP → an auth/network rejection.
 * No order is created and nothing is charged. Backs the admin "Test Selcom
 * connection" button — which must run from an allow-listed IP (Railway egress).
 */
export async function selcomPing(env: SelcomEnv): Promise<{ reachable: boolean; authOk: boolean; httpStatus: number; resultcode?: string; message?: string; error?: string }> {
  try {
    const res = await selcomFetch(env, "GET", "/checkout/order-status", { order_id: "50pick-conn-probe" });
    // Auth is accepted unless Selcom explicitly rejects it (401/403). A 200/404
    // with a normal envelope means the signature was accepted (the order just
    // doesn't exist) — exactly what we want to confirm without moving money.
    const authOk = res.httpStatus !== 401 && res.httpStatus !== 403;
    return { reachable: true, authOk, httpStatus: res.httpStatus, resultcode: String(res.json.resultcode ?? "") || undefined, message: String(res.json.message ?? "") || undefined };
  } catch (err) {
    return { reachable: false, authOk: false, httpStatus: 0, error: isAbort(err) ? "timeout" : "connection-failed" };
  }
}

function isAbort(err: unknown): boolean {
  return err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError");
}
