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
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
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

/**
 * Read Selcom creds for DISBURSEMENT (payouts / Wallet Cashin).
 *
 * Selcom confirmed (email 2026-07-27, Masanja Paul) that **the same API credentials
 * used for collection are used for disbursement**, so by default this is identical to
 * `selcomEnv()` — no separate account. The optional `PAYMENT_DISBURSE_*` overrides
 * exist only for the future case where an operator moves payouts to a separate float
 * account/creds: each override falls back to the corresponding deposit var, so leaving
 * them all unset ⇒ disbursement runs on exactly the deposit credentials.
 *
 * The `pin` (float-account PIN) resolves `PAYMENT_DISBURSE_PIN` → `PAYMENT_VENDOR_PIN`;
 * `selcomAdapter.withdraw` treats a missing pin as PROVIDER_DOWN (Wallet Cashin requires it).
 */
export function selcomDisburseEnv(): SelcomEnv | null {
  const base = selcomEnv();
  if (!base) return null;
  const url = process.env.PAYMENT_DISBURSE_URL?.replace(/\/+$/, "");
  return {
    baseUrl: url || base.baseUrl,
    apiKey: process.env.PAYMENT_DISBURSE_API_KEY || base.apiKey,
    apiSecret: process.env.PAYMENT_DISBURSE_API_SECRET || base.apiSecret,
    vendor: process.env.PAYMENT_DISBURSE_VENDOR_ID || base.vendor,
    pin: process.env.PAYMENT_DISBURSE_PIN || base.pin,
    webhookUrl: base.webhookUrl,
    timeoutMs: base.timeoutMs,
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
 *  Returns null for rails Selcom mobile-money cash-in can't serve (card/bank/internal).
 *
 *  The MPESA/Airtel/Tigo codes are confirmed. HaloPesa (`HPCASHIN`) and TTCL (`TTCASHIN`)
 *  were single-source and NOT verified against the live gateway, so they route through the
 *  universal `CASHIN` code instead: Selcom auto-routes it by MNP lookup on the payee number
 *  (docs — "All wallet cashin … automatically route the traffic based on MNP Lookup"), which
 *  is correct regardless of the exact per-MNO code. Pin them back to `HPCASHIN`/`TTCASHIN`
 *  only once Selcom confirms those codes.
 *
 *  ✅ VERIFIED 2026-07-30 against the live gateway with `scripts/selcom-code-matrix.mjs`
 *  (name lookup, no money): on a real Vodacom number `VMCASHIN` and `CASHIN` BOTH resolve
 *  the correct registered payee name, while `AMCASHIN`/`TPCASHIN`/`EZCASHIN` all refuse.
 *  So the operator codes here are right, Selcom does validate the operator on lookup, and
 *  the universal-`CASHIN` fallback above is now evidence-backed rather than assumed.
 *
 *  ⚠️ That same run is why a wrong `utilitycode` is NOT the cause of the `010` failures:
 *  `/walletcashin/namelookup` accepts the exact code + number that `/walletcashin/process`
 *  rejects. Do not "fix" a payout outage by changing this map — see
 *  docs/SELCOM-010-INVESTIGATION.md. */
export function mnoToSelcomCashin(provider: PaymentProvider): string | null {
  switch (provider) {
    case "MPESA":        return "VMCASHIN"; // Vodacom M-Pesa (confirmed)
    case "AIRTEL_MONEY": return "AMCASHIN"; // Airtel Money (confirmed)
    case "TIGO_PESA":    return "TPCASHIN"; // Tigo Pesa (confirmed)
    case "MIXX":         return "TPCASHIN"; // Mixx by Yas (formerly Tigo Pesa)
    case "HALO_PESA":    return "CASHIN";   // universal MNP auto-route (HPCASHIN unverified)
    case "TTCL_PESA":    return "CASHIN";   // universal MNP auto-route (TTCASHIN unverified)
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

/**
 * FULL-WIRE CAPTURE — the request and response Selcom's support asks for.
 *
 * WHY THIS EXISTS. On 2026-07-30 Selcom asked us for "the request and the response,
 * with headers" for the failed payouts, and we could not produce a single one. Not
 * because a log had rotated — because no version of this code ever kept them.
 * `selcomFetch` read `res.status` and `res.json()` and dropped `res.headers` on the
 * floor, and the request headers were recomputed per call and discarded. The `Digest`
 * cannot even be reconstructed after the fact: it signs a `Timestamp` we never stored.
 * `describeSelcom()` gave us the envelope, which is the right default — but the
 * envelope is not what a gateway's engineer needs to trace a call on their side.
 *
 * OFF BY DEFAULT, because this prints the `Authorization` header (base64 of the API
 * key) and that should not sit in a log forever. Turn it on only for a diagnostic
 * window, and turn it off after:
 *
 *   SELCOM_WIRE_LOG=payouts   payout rails only — what you want for a withdrawal test
 *   SELCOM_WIRE_LOG=all       every Selcom call, deposits included
 *   (unset | 0 | off)         nothing (default)
 *
 * ⛔ The float PIN is ALWAYS redacted, in the body and in the signing string, on
 * every setting. There is no flag to unmask it here — it would end up in Railway's
 * log retention. Use scripts/selcom-capture.mjs --unmask-pin for the one case that
 * needs it (Selcom re-verifying a Digest), where the output goes to a file you control.
 */
function wireLogMode(): "off" | "payouts" | "all" {
  const v = (process.env.SELCOM_WIRE_LOG || "").trim().toLowerCase();
  if (v === "all" || v === "1" || v === "true") return "all";
  if (v === "payouts") return "payouts";
  return "off";
}

/**
 * Payout endpoints — the money-OUT half, which is the half that has been failing.
 *
 * Derived from PAYOUT_RAILS rather than string-matched. A substring test looked
 * obvious and was wrong: `/selcompesa/query` contains no "cashin", so a Selcom Pesa
 * status re-query — the exact call whose endpoint the double-pay regression is
 * about — would have been silently omitted from the capture. Reading the rail table
 * means a rail added later cannot be forgotten here.
 */
export function isPayoutPath(path: string): boolean {
  if (path.includes("/vendor/balance")) return true; // float read — same diagnosis
  if (path.includes("/qwiksend/")) return true;      // documented, not yet integrated
  return Object.values(PAYOUT_RAILS).some((r) => path.includes(r.process) || path.includes(r.query));
}

function redactPin(text: string, pin: string | undefined): string {
  if (!pin || !text) return text;
  return text.split(pin).join("<PIN-REDACTED>");
}

function wireLog(
  env: SelcomEnv,
  parts: { method: string; url: string; headers: Record<string, string>; reqBody?: string; signing: string },
  outcome: { res?: Response; rawBody?: string; elapsedMs: number; error?: unknown },
): void {
  const mode = wireLogMode();
  if (mode === "off") return;

  // ⚠️ EVERY LINE CARRIES THE SAME SHORT ID, and that is not decoration.
  // The first live capture proved why: the 15s payout lane re-queries both stuck
  // payouts at once, the log platform splits a multi-line console.log into separate
  // entries, and the two captures interleaved — a response header landed in the
  // middle of the other call's request headers. A scrambled capture is worse than
  // none, because it invites the reader to draw conclusions from lines that were
  // never part of the same exchange. `grep cap=<id>` reassembles one clean call.
  const cap = randomBytes(3).toString("hex");
  const lines: string[] = [];
  lines.push(`[cap=${cap}] ───── SELCOM WIRE ────────────────────────────────────────`);
  lines.push(`[cap=${cap}] >> ${parts.method} ${redactPin(parts.url, env.pin)}`);
  for (const [k, v] of Object.entries(parts.headers)) lines.push(`[cap=${cap}] >> ${k}: ${v}`);
  if (parts.reqBody) lines.push(`[cap=${cap}] >> ${redactPin(parts.reqBody, env.pin)}`);
  lines.push(`[cap=${cap}] >> [signing string] ${redactPin(parts.signing, env.pin)}`);

  if (outcome.error) {
    lines.push(`[cap=${cap}] << NETWORK ERROR after ${outcome.elapsedMs} ms: ${(outcome.error as Error)?.message ?? String(outcome.error)}`);
  } else if (outcome.res) {
    lines.push(`[cap=${cap}] << HTTP ${outcome.res.status} ${outcome.res.statusText}   (${outcome.elapsedMs} ms)`);
    // The half nobody has ever seen. Selcom's own trace/correlation headers live
    // here, and those are what their support can look up directly.
    for (const [k, v] of outcome.res.headers.entries()) lines.push(`[cap=${cap}] << ${k}: ${redactPin(v, env.pin)}`);
    // Redacted on the way back too: a gateway that echoes the offending request
    // into its own error message is an ordinary pattern, and that would put the
    // float PIN in the logs by a route nobody was watching.
    lines.push(`[cap=${cap}] << ${redactPin(outcome.rawBody || "(empty body)", env.pin)}`);
  }
  lines.push(`[cap=${cap}] ──────────────────────────────────────────────────────────`);
  console.log(lines.join("\n"));
}

async function selcomFetch(env: SelcomEnv, method: "POST" | "GET", path: string, body: Record<string, string | number>): Promise<SelcomResponse> {
  // Capture the timestamp we sign with, so the wire log can print the exact signing
  // string. Without it the Digest is unverifiable after the fact — which is precisely
  // the gap that left us unable to answer Selcom on 2026-07-29.
  const timestamp = eatTimestamp();
  const headers = selcomSignedHeaders(body, env, timestamp);
  const capture = wireLogMode() === "all" || (wireLogMode() === "payouts" && isPayoutPath(path));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.timeoutMs);
  const startedAt = Date.now();
  try {
    let url = `${env.baseUrl}${path}`;
    const init: RequestInit = { method, headers, signal: controller.signal };
    if (method === "GET") {
      const qs = new URLSearchParams(Object.fromEntries(Object.entries(body).map(([k, v]) => [k, String(v)])));
      url += `?${qs.toString()}`;
    } else {
      init.body = JSON.stringify(body);
    }
    let res: Response;
    try {
      res = await fetch(url, init);
    } catch (err) {
      // A network failure is itself diagnostic — and it is the AMBIGUOUS arm, the one
      // that holds a player's money. Log it before rethrowing so the caller's
      // timeout/abort handling is completely unchanged.
      if (capture) {
        wireLog(env, { method, url, headers, reqBody: init.body as string | undefined, signing: selcomSigningString(body, timestamp) },
          { elapsedMs: Date.now() - startedAt, error: err });
      }
      throw err;
    }
    // Read as TEXT, then parse. `res.json()` is text+parse anyway, so this is
    // behaviour-identical — but it keeps the raw body, and a non-JSON reply (an HTML
    // error page, an empty 403) is exactly the case where the raw body is the evidence.
    const rawBody = await res.text();
    let json: SelcomEnvelope = {};
    try { json = JSON.parse(rawBody) as SelcomEnvelope; } catch { /* non-JSON body */ }
    if (capture) {
      wireLog(env, { method, url, headers, reqBody: init.body as string | undefined, signing: selcomSigningString(body, timestamp) },
        { res, rawBody, elapsedMs: Date.now() - startedAt });
    }
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
/** One-line, log-safe summary of a Selcom reply: HTTP status, result code, result
 *  and message. Contains no credentials — the whole point is that a failed
 *  money movement must be explainable after the fact. */
export function describeSelcom(r: SelcomResponse): string {
  const j = r.json ?? {};
  const parts = [
    `HTTP ${r.httpStatus}`,
    j.resultcode != null ? `resultcode=${String(j.resultcode)}` : null,
    j.result != null ? `result=${String(j.result)}` : null,
    j.message != null ? `message=${String(j.message).slice(0, 200)}` : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

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
export async function selcomDeposit(env: SelcomEnv, opts: { orderId: string; amount: number; msisdn: string; userId: string }): Promise<{ ok: true } | { ok: false; reason: "PROVIDER_DOWN" | "DECLINED" | "AMBIGUOUS"; detail?: string }> {
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
    // MANDATORY. Selcom rejects create-order-minimal without it:
    //   HTTP 412 · resultcode=412 · "Parameter no_of_items is invalid or missing"
    // Confirmed against the live gateway on 2026-07-20 — every mobile-money deposit
    // failed here. The card path (selcomCardCheckout) always sent it; this one never
    // did, and the API digest's field list elides it behind a trailing "...".
    // Position matters: key order IS the Signed-Fields order, and this mirrors the
    // card path, where no_of_items sits last before `webhook`.
    no_of_items: 1,
  };
  if (env.webhookUrl) createBody.webhook = Buffer.from(env.webhookUrl).toString("base64");
  let create: SelcomResponse;
  try {
    // Before any USSD push — the customer cannot have been charged yet, so a
    // failure/timeout here is DEFINITIVE (safe to fail the deposit).
    create = await selcomFetch(env, "POST", "/checkout/create-order-minimal", createBody);
  } catch (err) {
    // A real deposit failed in production (2026-07-20, order dep_bdd96021d0e07638cd5c)
    // and this branch discarded the reason entirely — there was nothing in the logs,
    // nothing in the audit payload beyond "PROVIDER_DOWN", and the failure was
    // therefore undiagnosable. Never swallow a money-path error silently.
    const detail = `transport: ${(err as Error)?.message ?? String(err)}`;
    console.error("[selcom] create-order failed", { orderId: opts.orderId, detail });
    return { ok: false, reason: "PROVIDER_DOWN", detail };
  }
  if (!create.ok || selcomInitiateVerdict(create.json) === "FAILED") {
    // Selcom's own words. resultcode/message carry the actionable cause (missing
    // field, unknown vendor, IP not allow-listed, MNO not enabled); none of it is
    // secret, and without it a failed deposit cannot be explained to the player.
    const detail = describeSelcom(create);
    console.error("[selcom] create-order rejected", { orderId: opts.orderId, detail });
    return { ok: false, reason: "PROVIDER_DOWN", detail };
  }

  // 2) Push the USSD PIN prompt to the handset for that order. From here on a
  //    timeout/HTTP error is AMBIGUOUS — the prompt may have gone out and the
  //    customer may pay — so never hard-fail it.
  const payBody = { transid: opts.orderId, order_id: opts.orderId, msisdn: phone };
  let pay: SelcomResponse;
  try {
    pay = await selcomFetch(env, "POST", "/checkout/wallet-payment", payBody);
  } catch (err) {
    const detail = `transport after push: ${(err as Error)?.message ?? String(err)}`;
    console.error("[selcom] wallet-payment transport error", { orderId: opts.orderId, detail });
    return { ok: false, reason: "AMBIGUOUS", detail };
  }
  if (!pay.ok) {
    // HTTP error AFTER the push — the prompt may have reached the handset, so this
    // stays ambiguous and the deposit remains PROCESSING. Log it: an ambiguous
    // outcome is exactly the case an operator will have to reconcile by hand.
    const detail = describeSelcom(pay);
    console.error("[selcom] wallet-payment HTTP error", { orderId: opts.orderId, detail });
    return { ok: false, reason: "AMBIGUOUS", detail };
  }
  if (selcomInitiateVerdict(pay.json) === "FAILED") {
    const detail = describeSelcom(pay);
    console.error("[selcom] wallet-payment declined", { orderId: opts.orderId, detail });
    return { ok: false, reason: "DECLINED", detail };
  }
  return { ok: true }; // async — the webhook/order-status settles it
}

// ── Card deposit (collection): hosted checkout redirect ────────────────────────
/**
 * Billing details for a card order. Selcom REJECTS card payments with no billing
 * info ("Card payments with no billing info will get rejected"), and these fields
 * feed the acquirer's AVS/fraud screening — so they are collected from the player
 * on the deposit form and passed through verbatim. We deliberately do NOT invent
 * or default them: a fabricated billing address is both a lie to the acquirer and
 * a reason for the issuer to decline.
 */
export type SelcomBilling = {
  firstName: string;
  lastName: string;
  address1: string;
  city: string;
  stateOrRegion: string;
  postcodeOrPobox: string;
  /** ISO-3166 alpha-2, e.g. "TZ". */
  country: string;
  phone: string;
};

/**
 * Create a HOSTED-CHECKOUT order and return the gateway URL to send the buyer to.
 *
 * ⚠️ This is a DIFFERENT rail from the mobile-money USSD push above:
 *   - endpoint is `/checkout/create-order`, NOT `create-order-minimal` — the
 *     minimal endpoint cannot be used for cards and silently hides the card
 *     option on the gateway page;
 *   - `payment_methods` restricts the hosted page to CARD;
 *   - `billing.*` keys are FLAT DOTTED STRINGS (not a nested object);
 *   - `no_of_items` is mandatory;
 *   - `redirect_url` / `cancel_url` / `webhook` are base64 on the wire (and ONLY
 *     those three).
 *
 * Failure here is DEFINITIVE and safe to fail the deposit on: nothing can have
 * been charged, because the buyer has not yet reached the card form. (Contrast the
 * USSD path, where a timeout after the push is genuinely ambiguous.)
 */
export async function selcomCardCheckout(
  env: SelcomEnv,
  opts: {
    orderId: string;
    amount: number;
    buyerEmail: string;
    buyerName: string;
    buyerPhone: string;
    billing: SelcomBilling;
    /** Where Selcom returns the buyer after the card form. We pre-seed `order_id`
     *  ourselves — Selcom does NOT append it (it appends payment_status + transid). */
    redirectUrl: string;
    cancelUrl: string;
  },
): Promise<{ ok: true; gatewayUrl: string } | { ok: false; reason: "PROVIDER_DOWN" | "DECLINED" }> {
  const phone = toSelcomMsisdn(opts.buyerPhone);
  const b = opts.billing;
  const body: Record<string, string | number> = {
    vendor: env.vendor,
    order_id: opts.orderId,
    buyer_email: opts.buyerEmail,
    buyer_name: opts.buyerName,
    buyer_phone: phone,
    amount: Math.round(opts.amount),
    currency: "TZS",
    payment_methods: "CARD",
    redirect_url: Buffer.from(opts.redirectUrl).toString("base64"),
    cancel_url: Buffer.from(opts.cancelUrl).toString("base64"),
    "billing.firstname": b.firstName,
    "billing.lastname": b.lastName,
    "billing.address_1": b.address1,
    "billing.city": b.city,
    "billing.state_or_region": b.stateOrRegion,
    "billing.postcode_or_pobox": b.postcodeOrPobox,
    "billing.country": b.country,
    "billing.phone": toSelcomMsisdn(b.phone),
    no_of_items: 1,
  };
  if (env.webhookUrl) body.webhook = Buffer.from(env.webhookUrl).toString("base64");

  let res: SelcomResponse;
  try {
    res = await selcomFetch(env, "POST", "/checkout/create-order", body);
  } catch {
    return { ok: false, reason: "PROVIDER_DOWN" }; // nothing charged — buyer never saw a card form
  }
  if (!res.ok) return { ok: false, reason: "PROVIDER_DOWN" };
  if (selcomInitiateVerdict(res.json) === "FAILED") return { ok: false, reason: "DECLINED" };

  const gatewayUrl = decodeGatewayUrl(res.json.data?.[0]?.payment_gateway_url);
  // An accepted order with no usable URL is useless to the buyer — fail cleanly
  // rather than redirect them somewhere broken. Nothing was charged.
  if (!gatewayUrl) return { ok: false, reason: "PROVIDER_DOWN" };
  return { ok: true, gatewayUrl };
}

/**
 * `data[0].payment_gateway_url` is base64-encoded on the wire — every official
 * Selcom client (WooCommerce plugin, Laravel demo) base64-decodes it. But Selcom's
 * own docs sample for the FULL create-order shows it *unencoded*, so we handle
 * both: decode, and if the result doesn't look like a URL, fall back to the raw
 * value. Returns null when neither form is usable.
 */
export function decodeGatewayUrl(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  try {
    const decoded = Buffer.from(s, "base64").toString("utf8").trim();
    if (/^https?:\/\//i.test(decoded)) return decoded;
  } catch { /* not base64 — fall through */ }
  if (/^https?:\/\//i.test(s)) return s;
  return null;
}

// ── Disbursement: THE PAYOUT RAILS ──────────────────────────────────────────────
/**
 * Selcom exposes several ways to push money out, and they are NOT interchangeable
 * plumbing — each is a separately provisioned product with its own endpoint, its own
 * status query, and a materially different experience for the person receiving the
 * money. We model them as one table so the signer, the verdict taxonomy and the
 * logging are written once.
 *
 * 🔴 WHY MORE THAN ONE. 2026-07-29: `walletcashin` answered every call with
 * `HTTP 403 · 4035 · "API endpoint not enabled for the vendor"`, and Selcom's own
 * credentials email turned out to be titled "Credentials for **Collections**" — the
 * disbursement product had never been switched on. A platform whose only payout rail
 * is one third-party product that can be switched off (or, as Selcom later claimed,
 * knocked out by a TIPS outage) has no payout capability at all. Hence a ladder.
 *
 * ⚠️ `WALLET_CASHIN` is the only rail proven against the live gateway. The other two
 * are built from the published API reference and are gated behind `selcomProbeRails`
 * — we do not point real money at an unverified endpoint on a guess.
 */
export type PayoutRail = "WALLET_CASHIN" | "SELCOM_PESA" | "HUDUMA_AGENT";

export const PAYOUT_RAIL_IDS: readonly PayoutRail[] = ["WALLET_CASHIN", "SELCOM_PESA", "HUDUMA_AGENT"] as const;

export function isPayoutRail(v: unknown): v is PayoutRail {
  return typeof v === "string" && (PAYOUT_RAIL_IDS as readonly string[]).includes(v);
}

/**
 * A withdrawal row written before rails existed has no `payoutRail`, and every one of
 * those went out on wallet-cashin because it was the only rail that ever ran. Reading
 * the default here — rather than back-filling the live money table — keeps the fix to
 * code and means a wrong guess can never be baked into the ledger.
 */
export function railOf(payoutRail: string | null | undefined): PayoutRail {
  return isPayoutRail(payoutRail) ? payoutRail : "WALLET_CASHIN";
}

/**
 * Human name for the rail that carried a payout — for receipts, emails and the admin
 * console. Returns null for WALLET_CASHIN: money arriving in the mobile-money account
 * the player typed is the expected outcome, and labelling it adds noise to every
 * ordinary receipt. A label appears precisely when the destination was NOT the obvious
 * one, which is the case worth explaining.
 */
export function payoutRailLabel(rail: string | null | undefined): string | null {
  const r = railOf(rail);
  return r === "WALLET_CASHIN" ? null : PAYOUT_RAILS[r].label;
}

/**
 * What the player must actually DO to get their money, when it is not simply sitting
 * in their wallet. Huduma is the case that matters: the cash is waiting at an agent and
 * nothing arrives on the phone, so a payout email that says "should arrive within
 * moments" would be a plain lie. Bilingual because these are the instructions someone
 * follows standing in a shop.
 */
export function payoutRailNote(rail: string | null | undefined): { en: string; sw: string } | null {
  if (railOf(rail) !== "HUDUMA_AGENT") return null;
  return {
    en: "Your cash is waiting at any Selcom Huduma agent. Dial *150*50#, choose Selcom → Huduma Cashout, then give the agent code and amount to collect it. Nothing will arrive on your phone.",
    sw: "Pesa yako inakusubiri kwa wakala yeyote wa Selcom Huduma. Piga *150*50#, chagua Selcom → Huduma Cashout, kisha mpe wakala namba na kiasi ili uichukue. Hakuna kitakachofika kwenye simu yako.",
  };
}

type RailSpec = {
  /** POST endpoint that moves the money. */
  process: string;
  /** GET endpoint that authoritatively re-states it. Asking the WRONG one is a double-pay. */
  query: string;
  /** Selcom `utilitycode`, or null for rails whose body carries none. */
  utilityCode: string | null;
  /** Human label for logs and the admin console. */
  label: string;
  /**
   * Build the request body. **Key insertion order IS the `Signed-Fields` order** —
   * reordering after signing is a 401, so these mirror the API reference samples
   * field for field.
   */
  body(env: SelcomEnv, opts: PayoutOpts): Record<string, string | number>;
};

export type PayoutOpts = {
  transid: string;
  amount: number;
  /** Payee MSISDN — becomes `utilityref` on every rail. */
  msisdn: string;
  /** Per-MNO cash-in code. Only `WALLET_CASHIN` uses it; ignored elsewhere. */
  utilityCode?: string;
  /** Payee name — Huduma prints it on the agent's screen. Optional everywhere. */
  name?: string;
};

export const PAYOUT_RAILS: Record<PayoutRail, RailSpec> = {
  // Docs: POST /v1/walletcashin/process — Signed-Fields transid,utilitycode,utilityref,amount,vendor,pin
  // `utilityref` = the PAYEE msisdn (NOT `msisdn`, which is the optional sender).
  WALLET_CASHIN: {
    process: "/walletcashin/process",
    query: "/walletcashin/query",
    utilityCode: null, // supplied per-MNO by mnoToSelcomCashin()
    label: "Mobile money (Wallet Cashin)",
    body: (env, o) => ({
      transid: o.transid,
      utilitycode: o.utilityCode ?? "CASHIN",
      utilityref: toSelcomMsisdn(o.msisdn),
      amount: Math.round(o.amount),
      vendor: env.vendor,
      pin: env.pin ?? "",
    }),
  },
  // Docs: POST /v1/selcompesa/cashin — Signed-Fields transid,utilityref,amount,vendor,pin,msisdn
  // ⚠️ The reference is self-contradictory here: its parameter TABLE lists a static
  // `utilitycode: SPSCASHIN`, but the worked curl sample carries no such field and its
  // Signed-Fields omits it. We follow the WIRE SAMPLE, because that is the thing Selcom
  // actually signed. If this rail 401s on first contact, that contradiction is the first
  // suspect — add `utilitycode: "SPSCASHIN"` immediately after `transid`.
  SELCOM_PESA: {
    process: "/selcompesa/cashin",
    query: "/selcompesa/query",
    utilityCode: "SPSCASHIN",
    label: "Selcom Pesa wallet",
    body: (env, o) => ({
      transid: o.transid,
      utilityref: toSelcomMsisdn(o.msisdn),
      amount: Math.round(o.amount),
      vendor: env.vendor,
      pin: env.pin ?? "",
    }),
  },
  // Docs: POST /v1/hudumacashin/process — Signed-Fields transid,utilitycode,utilityref,amount,vendor,pin,name
  // Debits our float into a TEMPORARY wallet on Selcom's own platform; the payee dials
  // *150*50# and collects CASH from any Selcom Huduma agent. No MNO, no national switch.
  HUDUMA_AGENT: {
    process: "/hudumacashin/process",
    query: "/hudumacashin/query",
    utilityCode: "HUDUMACI",
    label: "Cash at a Selcom agent",
    body: (env, o) => {
      const b: Record<string, string | number> = {
        transid: o.transid,
        utilitycode: "HUDUMACI",
        utilityref: toSelcomMsisdn(o.msisdn),
        amount: Math.round(o.amount),
        vendor: env.vendor,
        pin: env.pin ?? "",
      };
      // Optional — appended last to match the reference sample's field order. Omitted
      // entirely when absent so it never appears in Signed-Fields as an empty value.
      if (o.name?.trim()) b.name = o.name.trim();
      return b;
    },
  },
};

// Reason taxonomy is MONEY-SAFETY load-bearing (a payout must NEVER be reversed
// while it might still be in flight — that double-pays the player):
//   FAILED    = DEFINITIVE Selcom rejection (401/403, or res.ok && a hard-fail
//               resultcode) → the disbursement did not happen → safe to reverse.
//   AMBIGUOUS = network timeout, connection error, or any other non-2xx → the request
//               may have reached Selcom and the payout may be processing → the
//               caller keeps the withdrawal PROCESSING (hold intact) and lets the
//               authoritative per-rail re-query resolve it.
/**
 * Send a payout on ONE named rail.
 *
 * 🔴 EVERY OUTCOME CARRIES `detail` — WHAT SELCOM ACTUALLY SAID.
 *
 * This used to return a bare `{ok:true}` and throw the envelope away. On 2026-07-29
 * two real payouts (10,000 and 5,000 TZS) sat in PROCESSING and nobody could say why:
 * Selcom had accepted both and issued references, no callback ever came, and
 * `Transaction.providerStatus` was empty because nothing ever wrote it. An hour went
 * into guessing between a dry float, a disabled product and a wrong utility code — a
 * question Selcom's own reply answers in one line.
 *
 * `detail` is returned on the SUCCESS arm too, not just failures: "accepted" is
 * precisely the state that stalled, and `resultcode=111 INPROGRESS` versus
 * `resultcode=000 SUCCESS` is the difference between "queued" and "paid". It is
 * log-safe by construction (no credentials, message truncated, payee masked).
 *
 * ⚠️ The caller must NEVER advance to another rail on `AMBIGUOUS` — see the ladder in
 * `payments.ts`. That is the one move that turns a fallback into a double payment.
 */
export async function selcomPayout(env: SelcomEnv, rail: PayoutRail, opts: PayoutOpts): Promise<{ ok: true; detail: string } | { ok: false; reason: "FAILED" | "AMBIGUOUS"; detail: string }> {
  const spec = PAYOUT_RAILS[rail];
  const body = spec.body(env, opts);
  // The request shape too — a payout rejected for a wrong utilitycode looks identical
  // from the outside to one rejected for an empty float. Never logs `pin`, and the
  // payee number is masked.
  const shape = `rail=${rail} utilitycode=${String(body.utilitycode ?? spec.utilityCode ?? "n/a")} payee=${maskMsisdn(toSelcomMsisdn(opts.msisdn))} amount=${Math.round(opts.amount)} vendor=${env.vendor} pin=${env.pin ? "set" : "MISSING"}`;
  let res: SelcomResponse;
  try {
    res = await selcomFetch(env, "POST", spec.process, body);
  } catch (err) {
    const detail = `network: ${(err as Error)?.message ?? "unknown"} · ${shape}`;
    console.error(`[selcom] ${spec.process} AMBIGUOUS (${opts.transid}) — ${detail}`);
    return { ok: false, reason: "AMBIGUOUS", detail }; // timeout / network after send — payout may be in flight
  }
  const detail = `${describeSelcom(res)} · ${shape}`;
  if (!res.ok) {
    // ⛔ 401/403 IS DEFINITIVE — the request was REFUSED AT THE DOOR.
    //
    // Selcom rejected the call before it could reach any disbursement logic, so no
    // payout can possibly be in flight and reversing the hold cannot double-pay.
    // That distinction is what makes this safe, and it is not a generalisation to
    // other HTTP errors: a 502 or a timeout genuinely might have been processed.
    //
    // 🔴 WHY THIS EXISTS. 2026-07-29: Selcom answered every wallet-cashin call with
    //   HTTP 403 · resultcode=403 · "API endpoint not enabled for the vendor (4035)"
    // because the disbursement product was never actually switched on for the
    // vendor account. Classifying that as AMBIGUOUS parked two REAL payouts
    // (10,000 + 5,000 TZS) in PROCESSING with the player's money held — and since a
    // 403 never becomes terminal, the stale sweep could never resolve them either.
    // The money would have stayed frozen indefinitely, on an error that was never
    // going to change on its own. A player must get their balance back and a plain
    // "withdrawals are unavailable", not an eternal spinner.
    //
    // It is ALSO what makes the fallback ladder possible: "refused at the door" is
    // exactly the condition under which trying the next rail cannot double-pay.
    if (res.httpStatus === 401 || res.httpStatus === 403) {
      console.error(`[selcom] ${spec.process} REFUSED — not enabled/unauthorised (${opts.transid}) — ${detail}`);
      return { ok: false, reason: "FAILED", detail };
    }
    console.error(`[selcom] ${spec.process} AMBIGUOUS (${opts.transid}) — ${detail}`);
    return { ok: false, reason: "AMBIGUOUS", detail };                             // other HTTP error — may have been accepted
  }
  if (selcomInitiateVerdict(res.json) === "FAILED") {
    console.error(`[selcom] ${spec.process} REJECTED (${opts.transid}) — ${detail}`);
    return { ok: false, reason: "FAILED", detail };                                // definitive reject — safe to reverse
  }
  console.log(`[selcom] ${spec.process} accepted (${opts.transid}) — ${detail}`);
  return { ok: true, detail }; // async (incl. 999/INPROGRESS) — the payout query confirms/reverses
}

/** Mobile-money payout — the original rail, kept as a named entry point. */
export async function selcomWithdraw(env: SelcomEnv, opts: { transid: string; amount: number; msisdn: string; utilityCode: string }): Promise<{ ok: true; detail: string } | { ok: false; reason: "FAILED" | "AMBIGUOUS"; detail: string }> {
  return selcomPayout(env, "WALLET_CASHIN", opts);
}

/** Mask a payee number for logs: keep the country prefix and last two digits. */
function maskMsisdn(m: string): string {
  return m.length > 6 ? `${m.slice(0, 5)}***${m.slice(-2)}` : "***";
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
  // Documented order-status enum: PENDING · COMPLETED · CANCELLED · USERCANCELLED
  // · REJECTED · INPROGRESS. Only CANCELLED/USERCANCELLED/REJECTED are terminal
  // failures.
  //
  // ⚠️ MONEY-SAFETY: `INPROGRESS` used to fall through to the catch-all FAILED
  // below. A customer who had approved the charge but whose settlement was still
  // moving would have had their deposit marked FAILED — money taken by Selcom
  // with no credit on our side, and the reconcile sweep would never revisit it
  // because FAILED is terminal. Non-terminal states must ALWAYS return null so
  // the deposit stays PROCESSING and is re-queried. Anything unrecognised is
  // treated as non-terminal too: waiting is recoverable, a wrong FAILED is not.
  if (ps === "CANCELLED" || ps === "USERCANCELLED" || ps === "REJECTED") return { status: "FAILED", amount };
  return { status: null }; // PENDING · INPROGRESS · empty · anything unknown → re-query
}

/**
 * Authoritative status of a payout, ON THE RAIL IT ACTUALLY WENT OUT ON.
 *
 * 🔴 THE RAIL ARGUMENT IS MONEY-SAFETY CRITICAL — IT IS NOT A TIDY-UP.
 *
 * Every rail has its own status endpoint, and each only knows its own transids. Ask
 * `/walletcashin/query` about a payout that went out on `/selcompesa/cashin` and you
 * get an envelope for a transaction it has never heard of. Any resultcode that is not
 * `000/111/927/999` falls through `envelopeSettlementVerdict` to **FAILED** — and the
 * stale reconcile sweep treats FAILED as "the payout definitively did not happen" and
 * refunds the player. The money is already gone. That is a double payment, caused by
 * nothing but asking the wrong endpoint.
 *
 * So the rail is threaded from the `Transaction` row (`payoutRail`, defaulted through
 * `railOf()`) all the way here. A missing rail resolves to WALLET_CASHIN, which is
 * true for every row written before rails existed.
 *
 * Returns null while the payout is still in progress or the question could not be
 * asked — the caller must then leave the withdrawal PROCESSING and try again later.
 */
export async function selcomVerifyPayout(env: SelcomEnv, rail: PayoutRail, transid: string): Promise<{ status: "CONFIRMED" | "FAILED" | null; detail: string }> {
  let res: SelcomResponse;
  try {
    res = await selcomFetch(env, "GET", PAYOUT_RAILS[rail].query, { transid });
  } catch (err) {
    // ⚠️ A null here is indistinguishable from "still in progress" to the caller,
    // and that ambiguity is deliberate (never auto-reverse on a failed question).
    // But it MUST be distinguishable to a human, or an unreachable gateway reads
    // as a healthy pending payout forever — which is exactly how a stalled payout
    // looked for 38 minutes on 2026-07-29.
    return { status: null, detail: `network: ${(err as Error)?.message ?? "unknown"}` };
  }
  const detail = describeSelcom(res);
  if (!res.ok) return { status: null, detail };
  return { status: envelopeSettlementVerdict(res.json), detail };
}

/**
 * Wallet-Cashin NAME LOOKUP — resolve the registered account holder for a payee
 * mobile number BEFORE a payout, so the player can confirm they're paying the right
 * person. Docs: GET /v1/walletcashin/namelookup (Signed-Fields: utilitycode,utilityref,transid).
 *
 * Best-effort by design: lookup availability varies by MNO (e.g. M-Pesa/VMCASHIN has
 * none), so this returns null whenever a name can't be resolved — the caller shows the
 * number alone and NEVER blocks the withdrawal on it. `transid` must be a fresh id
 * (not a payout transid). Field insertion order IS the Signed-Fields order.
 */
export async function selcomCashinNameLookup(env: SelcomEnv, opts: { utilityCode: string; msisdn: string; transid: string }): Promise<{ name: string } | null> {
  let res: SelcomResponse;
  try {
    res = await selcomFetch(env, "GET", "/walletcashin/namelookup", {
      utilitycode: opts.utilityCode,
      utilityref: toSelcomMsisdn(opts.msisdn),
      transid: opts.transid,
    });
  } catch {
    return null;
  }
  if (!res.ok || String(res.json.resultcode ?? "").trim() !== "000") return null;
  const name = res.json.data?.[0]?.name;
  return typeof name === "string" && name.trim() ? { name: name.trim() } : null;
}

/**
 * Float-account BALANCE — the disbursement float's available balance. Docs:
 * POST /v1/vendor/balance {vendor, pin, transid} (Signed-Fields: vendor,pin,transid).
 *
 * Requires the float PIN. A dry float makes every payout FAIL, so this backs the
 * operator's low-float warning on /admin/payments. Returns null when unavailable
 * (no PIN, network error, or a non-success envelope) rather than a misleading zero.
 */
export async function selcomFloatBalance(env: SelcomEnv, transid: string): Promise<{ balance: number } | null> {
  return (await selcomFloatBalanceDetailed(env, transid)).balance;
}

/**
 * The same query, but it says WHY it could not answer.
 *
 * `selcomFloatBalance` returns a bare null for four completely different causes —
 * no PIN, network failure, a non-success envelope, or an unparseable number — and
 * on 2026-07-29 that made an operator (and me) read "Selcom refused our IP" as
 * "the PIN is missing", while a real payout stalled. A dry float makes every payout
 * fail, so the ONE number an operator needs during a payout incident must never be
 * ambiguous about whether it is zero or unknown.
 */
export async function selcomFloatBalanceDetailed(
  env: SelcomEnv,
  transid: string,
): Promise<{ balance: { balance: number } | null; reason: string }> {
  if (!env.pin) return { balance: null, reason: "float PIN not set (PAYMENT_VENDOR_PIN)" };
  let res: SelcomResponse;
  try {
    res = await selcomFetch(env, "POST", "/vendor/balance", { vendor: env.vendor, pin: env.pin, transid });
  } catch (err) {
    return { balance: null, reason: `network: ${(err as Error)?.message ?? "unknown"}` };
  }
  const detail = describeSelcom(res);
  if (!res.ok) return { balance: null, reason: `HTTP error — ${detail}` };
  if (String(res.json.resultcode ?? "").trim() !== "000") return { balance: null, reason: `rejected — ${detail}` };
  const raw = res.json.data?.[0]?.balance;
  const n = Number(raw);
  if (!Number.isFinite(n)) return { balance: null, reason: `unparseable balance ${JSON.stringify(raw)} — ${detail}` };
  return { balance: { balance: n }, reason: `ok — ${detail}` };
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

// ── Rail capability probe ───────────────────────────────────────────────────────
export type RailProbe = {
  rail: PayoutRail;
  /** ENABLED = provisioned. NOT_ENABLED = Selcom refused at the door. UNKNOWN = we could not ask. */
  verdict: "ENABLED" | "NOT_ENABLED" | "UNKNOWN";
  detail: string;
};

/**
 * Is this rail switched on for our vendor? Asks the rail's OWN status endpoint about
 * a transid that does not exist. **Moves no money** — nothing is created, nothing is
 * paid; the same trick `selcomPing` already uses for the collection side.
 *
 * 🔴 WHY IT EXISTS. Rails are provisioned per product, per vendor, and we cannot see
 * that from our side. On 2026-07-29 we burned an evening unable to distinguish "the
 * national switch is down" from "this product was never switched on" — the answers
 * are a phone call apart but they look identical from a failed payout. On 2026-07-30
 * this probe answered it in seconds: WALLET_CASHIN and QWIKSEND enabled, SELCOM_PESA
 * and HUDUMA_AGENT both `4035`, and — the actual blocker nobody had checked — a float
 * balance of TZS 0.
 *
 * ⚠️ `UNKNOWN` is deliberately NOT `NOT_ENABLED`. A timeout must never be recorded as
 * a provisioning fact, or one bad minute permanently disables a working rail. The
 * ladder treats UNKNOWN as "try it anyway": attempting a live rail costs one refused
 * request, while skipping one costs the player their payout.
 */
export async function selcomProbeRail(env: SelcomEnv, rail: PayoutRail): Promise<RailProbe> {
  try {
    const res = await selcomFetch(env, "GET", PAYOUT_RAILS[rail].query, { transid: "50pick-probe-0001" });
    // Refused at the door (401/403, typically resultcode 403 "not enabled for the
    // vendor (4035)") = not provisioned. ANY other answer — including "no such
    // transaction" — means the endpoint engaged with us on its merits, which is all
    // "enabled" has to mean here.
    const enabled = res.httpStatus !== 401 && res.httpStatus !== 403;
    return { rail, verdict: enabled ? "ENABLED" : "NOT_ENABLED", detail: describeSelcom(res) };
  } catch (err) {
    return { rail, verdict: "UNKNOWN", detail: `network: ${isAbort(err) ? "timeout" : ((err as Error)?.message ?? "connection-failed")}` };
  }
}

/** Probe every rail. Serial by design — this is diagnostics, not a hot path, and we
 *  would rather be gentle with a gateway that is already having a bad night. */
export async function selcomProbeRails(env: SelcomEnv): Promise<RailProbe[]> {
  const out: RailProbe[] = [];
  for (const rail of PAYOUT_RAIL_IDS) out.push(await selcomProbeRail(env, rail));
  return out;
}
