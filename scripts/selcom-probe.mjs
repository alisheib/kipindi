#!/usr/bin/env node
/**
 * Selcom capability probe — WHICH PAYOUT RAILS ARE ACTUALLY ENABLED FOR THIS VENDOR.
 *
 * ⚠️ MOVES NO MONEY. Every call here is a signed *status query* for a transid that
 * does not exist, plus one float-balance read. Nothing is created, nothing is paid.
 *
 * WHY THIS EXISTS. On 2026-07-29 every payout failed and we could not tell whether
 * the cause was a national-switch (TIPS) outage, a bad request, or a vendor account
 * that simply never had disbursement switched on. Selcom's own credentials email
 * ("Credentials for Collections (Customer to Business)") lists only the four
 * collection endpoints — but that had to be confirmed against the live gateway
 * rather than inferred, because the answer decides whether the fix is code or a
 * phone call. This script is that confirmation, and it re-runs in seconds whenever
 * Selcom claims to have enabled something.
 *
 * HOW A RAIL IS JUDGED. Ask the rail's own status endpoint about a probe transid:
 *   HTTP 401/403 (esp. resultcode 403 / "not enabled for the vendor (4035)")
 *        → NOT ENABLED — refused at the door, the product isn't provisioned.
 *   anything else — including "transaction not found"
 *        → ENABLED — the endpoint answered us on its merits, which is all we need.
 * A network error is reported as UNKNOWN, never as "not enabled" — we must not
 * record a transient timeout as a provisioning fact.
 *
 * Run it where the credentials are allow-listed (Railway egress):
 *   railway ssh node scripts/selcom-probe.mjs
 *
 * Never prints the API secret or the float PIN.
 */
import { createHmac } from "node:crypto";

// ── Credentials (names only — values stay in the environment) ──────────────────
const BASE = (process.env.PAYMENT_API_URL || "").replace(/\/+$/, "");
const KEY = process.env.PAYMENT_API_KEY || "";
const SECRET = process.env.PAYMENT_API_SECRET || "";
const VENDOR = process.env.PAYMENT_VENDOR_ID || "";
const PIN = process.env.PAYMENT_VENDOR_PIN || "";
const TIMEOUT_MS = Number(process.env.PAYMENT_TIMEOUT_MS) || 45_000;

if (!BASE || !KEY || !SECRET || !VENDOR) {
  console.error("[probe] missing credentials — need PAYMENT_API_URL, PAYMENT_API_KEY, PAYMENT_API_SECRET, PAYMENT_VENDOR_ID");
  process.exit(1);
}

// ── Signing — must stay byte-identical to src/lib/server/selcom.ts ─────────────
// This is a deliberate duplicate: the probe is a plain .mjs so it can run inside
// the deployed container, where the TypeScript client cannot be imported. The
// duplication is held honest by scripts/selcom-adapter.test.mts, which asserts
// this file's signing string against the same golden vector as the real signer.
/** ISO-8601 in Africa/Dar_es_Salaam (UTC+3, no DST), no milliseconds. */
function eatTimestamp(now = Date.now()) {
  return new Date(now + 3 * 3_600_000).toISOString().slice(0, 19) + "+03:00";
}

/** `timestamp=<TS>&k1=v1&k2=v2…` — timestamp first, body fields in insertion order. */
export function signingString(body, timestamp) {
  let s = `timestamp=${timestamp}`;
  for (const k of Object.keys(body)) s += `&${k}=${String(body[k])}`;
  return s;
}

function signedHeaders(body, timestamp = eatTimestamp()) {
  return {
    "Content-Type": "application/json",
    Authorization: `SELCOM ${Buffer.from(KEY).toString("base64")}`,
    "Digest-Method": "HS256",
    Digest: createHmac("sha256", SECRET).update(signingString(body, timestamp), "utf8").digest("base64"),
    Timestamp: timestamp,
    "Signed-Fields": Object.keys(body).join(","),
  };
}

async function call(method, path, body) {
  const headers = signedHeaders(body);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    let url = `${BASE}${path}`;
    const init = { method, headers, signal: controller.signal };
    if (method === "GET") {
      url += `?${new URLSearchParams(Object.fromEntries(Object.entries(body).map(([k, v]) => [k, String(v)]))).toString()}`;
    } else {
      init.body = JSON.stringify(body);
    }
    const res = await fetch(url, init);
    let json = {};
    try { json = await res.json(); } catch { /* non-JSON body */ }
    return { ok: res.ok, httpStatus: res.status, json };
  } finally {
    clearTimeout(timer);
  }
}

/** One-line, secret-free summary of a Selcom envelope. */
function describe(r) {
  const j = r.json ?? {};
  return [
    `HTTP ${r.httpStatus}`,
    j.resultcode != null ? `resultcode=${j.resultcode}` : null,
    j.result != null ? `result=${j.result}` : null,
    j.message != null ? `message=${String(j.message).slice(0, 160)}` : null,
  ].filter(Boolean).join(" · ");
}

// ── The rails ──────────────────────────────────────────────────────────────────
// `query` is each rail's own status endpoint. Asking it about a transid it has
// never seen is the cheapest possible "are you switched on?" question.
const RAILS = [
  { rail: "WALLET_CASHIN", label: "Wallet Cashin (mobile money — rides TIPS)", query: "/walletcashin/query" },
  { rail: "SELCOM_PESA",   label: "Selcom Pesa (Selcom-internal wallet)",      query: "/selcompesa/query" },
  { rail: "HUDUMA_AGENT",  label: "Huduma Agent Cashout (cash at an agent)",   query: "/hudumacashin/query" },
  { rail: "QWIKSEND",      label: "Qwiksend (bank transfer — not integrated)", query: "/qwiksend/query" },
];

const PROBE_TRANSID = "50pick-probe-0001";

/**
 * A 401/403 is the gateway refusing us at the door — that is the provisioning
 * signal. Everything else means the endpoint engaged with the request, which is
 * exactly what "enabled" means here, even when the answer is "no such transaction".
 */
function verdictFor(r) {
  if (r.httpStatus === 401 || r.httpStatus === 403) return "NOT ENABLED";
  return "ENABLED";
}

async function probeRail(r) {
  try {
    const res = await call("GET", r.query, { transid: PROBE_TRANSID });
    return { ...r, verdict: verdictFor(res), detail: describe(res) };
  } catch (err) {
    // Never let a timeout masquerade as a provisioning fact.
    return { ...r, verdict: "UNKNOWN", detail: `network: ${err?.message ?? String(err)}` };
  }
}

async function probeFloat() {
  if (!PIN) return { verdict: "NO PIN", detail: "PAYMENT_VENDOR_PIN is not set — cannot read the float" };
  try {
    const res = await call("POST", "/vendor/balance", { vendor: VENDOR, pin: PIN, transid: `${PROBE_TRANSID}-bal` });
    const bal = res.json?.data?.[0]?.balance;
    if (String(res.json?.resultcode ?? "").trim() === "000" && bal != null) {
      return { verdict: `TZS ${Number(bal).toLocaleString("en-US")}`, detail: describe(res) };
    }
    return { verdict: verdictFor(res), detail: describe(res) };
  } catch (err) {
    return { verdict: "UNKNOWN", detail: `network: ${err?.message ?? String(err)}` };
  }
}

/** Transactions stuck on resultcode 999 that we still owe the player an answer on. */
const STUCK = (process.env.PROBE_STUCK_TRANSIDS || "wdr_11d8552cb75b420d4bc3,wdr_9d9e565e61ce8ec1c0d4")
  .split(",").map((s) => s.trim()).filter(Boolean);

async function main() {
  console.log("=".repeat(78));
  console.log("SELCOM CAPABILITY PROBE — no money moves");
  console.log(`vendor=${VENDOR}  base=${BASE}  pin=${PIN ? "set" : "MISSING"}`);
  console.log("=".repeat(78));

  const results = [];
  for (const r of RAILS) results.push(await probeRail(r)); // serial: kinder to the gateway

  console.log("\nPAYOUT RAILS");
  for (const r of results) {
    console.log(`  ${r.verdict.padEnd(12)} ${r.rail.padEnd(14)} ${r.label}`);
    console.log(`  ${" ".repeat(12)} └─ ${r.detail}`);
  }

  const float = await probeFloat();
  console.log("\nFLOAT ACCOUNT");
  console.log(`  ${float.verdict}`);
  console.log(`  └─ ${float.detail}`);

  if (STUCK.length) {
    console.log("\nSTUCK PAYOUTS (re-query)");
    for (const transid of STUCK) {
      try {
        const res = await call("GET", "/walletcashin/query", { transid });
        console.log(`  ${transid} → ${describe(res)}`);
      } catch (err) {
        console.log(`  ${transid} → network: ${err?.message ?? String(err)}`);
      }
    }
  }

  const enabled = results.filter((r) => r.verdict === "ENABLED").map((r) => r.rail);
  console.log("\n" + "=".repeat(78));
  console.log(enabled.length ? `USABLE RAILS: ${enabled.join(", ")}` : "USABLE RAILS: NONE — disbursement is not provisioned for this vendor");
  console.log("=".repeat(78));
}

main().catch((err) => { console.error("[probe] fatal", err?.message ?? err); process.exit(1); });
