#!/usr/bin/env node
/**
 * Selcom wire capture — the FULL request and response, headers included.
 *
 * WHY: nothing in the app has ever kept them. `selcomFetch` in
 * src/lib/server/selcom.ts returns { ok, httpStatus, json } — `res.headers` is
 * never read — and request headers are recomputed per call and discarded. The
 * Digest cannot be rebuilt afterwards because it signs a timestamp we do not
 * store. So the capture has to be taken live.
 *
 * MONEY SAFETY: default mode sends signed STATUS QUERIES only — no money moves.
 * The dispatch call is behind --process --i-understand-this-may-pay-real-money.
 *
 * Copy into the repo and run where the egress IP is allow-listed:
 *   railway ssh node scripts/selcom-capture.mjs > capture.txt
 */
import { createHmac } from "node:crypto";

const BASE = (process.env.PAYMENT_API_URL || "").replace(/\/+$/, "");
const KEY = process.env.PAYMENT_API_KEY || "";
const SECRET = process.env.PAYMENT_API_SECRET || "";
const VENDOR = process.env.PAYMENT_VENDOR_ID || "";
const PIN = process.env.PAYMENT_VENDOR_PIN || "";
const TIMEOUT_MS = Number(process.env.PAYMENT_TIMEOUT_MS) || 45_000;

const ARGV = new Set(process.argv.slice(2));
const UNMASK_PIN = ARGV.has("--unmask-pin");
const DO_PROCESS = ARGV.has("--process");
const CONFIRMED = ARGV.has("--i-understand-this-may-pay-real-money");

if (!BASE || !KEY || !SECRET || !VENDOR) {
  console.error("[capture] missing credentials");
  process.exit(1);
}

const eatTimestamp = (now = Date.now()) =>
  new Date(now + 3 * 3_600_000).toISOString().slice(0, 19) + "+03:00";

const signingString = (body, ts) => {
  let s = `timestamp=${ts}`;
  for (const k of Object.keys(body)) s += `&${k}=${String(body[k])}`;
  return s;
};

const signedHeaders = (body, ts) => ({
  "Content-Type": "application/json",
  Authorization: `SELCOM ${Buffer.from(KEY).toString("base64")}`,
  "Digest-Method": "HS256",
  Digest: createHmac("sha256", SECRET).update(signingString(body, ts), "utf8").digest("base64"),
  Timestamp: ts,
  "Signed-Fields": Object.keys(body).join(","),
});

const maskPin = (t) => (UNMASK_PIN || !PIN ? t : t.split(PIN).join("<PIN-REDACTED>"));

async function capture(title, method, path, body) {
  const ts = eatTimestamp();
  const headers = signedHeaders(body, ts);
  let url = `${BASE}${path}`;
  const init = { method, headers };
  if (method === "GET") {
    url += `?${new URLSearchParams(Object.fromEntries(Object.entries(body).map(([k, v]) => [k, String(v)]))).toString()}`;
  } else {
    init.body = JSON.stringify(body);
  }

  console.log("\n" + "=".repeat(78) + `\n${title}\n` + "=".repeat(78));
  console.log("\n--- REQUEST ---");
  console.log(`${method} ${maskPin(url)}`);
  for (const [k, v] of Object.entries(headers)) console.log(`${k}: ${v}`);
  if (init.body) console.log(`\n${maskPin(init.body)}`);
  console.log(`\n[signing string] ${maskPin(signingString(body, ts))}`);

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  const t0 = Date.now();
  try {
    const res = await fetch(url, { ...init, signal: ac.signal });
    // TEXT not JSON — a non-JSON body (HTML error page, empty 403) is itself
    // diagnostic, and res.json() would throw it away.
    const raw = await res.text();
    console.log("\n--- RESPONSE ---");
    console.log(`HTTP ${res.status} ${res.statusText}   (${Date.now() - t0} ms)`);
    // The lines nobody has ever seen. Selcom's trace/correlation headers live
    // here and their support can look those up directly.
    for (const [k, v] of res.headers.entries()) console.log(`${k}: ${v}`);
    console.log(`\n${raw || "(empty body)"}`);
  } catch (err) {
    console.log("\n--- RESPONSE ---");
    console.log(`NETWORK ERROR after ${Date.now() - t0} ms: ${err?.message ?? String(err)}`);
  } finally {
    clearTimeout(timer);
  }
}

const STUCK = (process.env.PROBE_STUCK_TRANSIDS || "wdr_11d8552cb75b420d4bc3,wdr_9d9e565e61ce8ec1c0d4")
  .split(",").map((s) => s.trim()).filter(Boolean);

async function main() {
  console.log("=".repeat(78));
  console.log("SELCOM WIRE CAPTURE — full request + response headers");
  console.log(`vendor=${VENDOR}  base=${BASE}  pin=${PIN ? (UNMASK_PIN ? "set (UNMASKED)" : "set (masked)") : "MISSING"}`);
  console.log(`generated=${eatTimestamp()} EAT`);
  console.log("=".repeat(78));

  for (const transid of STUCK) {
    await capture(`STUCK PAYOUT — status query ${transid}`, "GET", "/walletcashin/query", { transid });
  }
  await capture("CONTROL — status query, transid that does not exist", "GET", "/walletcashin/query", { transid: "50pick-capture-control" });
  if (PIN) await capture("FLOAT BALANCE", "POST", "/vendor/balance", { vendor: VENDOR, pin: PIN, transid: "50pick-capture-bal" });

  if (DO_PROCESS) {
    if (!CONFIRMED) {
      console.log("\n" + "!".repeat(78));
      console.log("--process REFUSED. This sends a REAL walletcashin/process. If the float has");
      console.log("been funded since the incident it PAYS OUT — there is no test mode on this");
      console.log("endpoint. Re-run with --i-understand-this-may-pay-real-money.");
      console.log("!".repeat(78));
    } else {
      const amount = Number(process.env.CAPTURE_AMOUNT || 1000);
      const msisdn = process.env.CAPTURE_MSISDN || "255757619808";
      await capture(`DISPATCH — walletcashin/process (REAL, ${amount} TZS to ${msisdn})`, "POST", "/walletcashin/process",
        { transid: `cap_${Date.now().toString(36)}`, utilitycode: "VMCASHIN", utilityref: msisdn, amount, vendor: VENDOR, pin: PIN });
    }
  }

  console.log("\n" + "=".repeat(78) + "\nEND OF CAPTURE");
  if (!UNMASK_PIN && PIN) console.log("NOTE: PIN redacted — Selcom cannot re-verify a Digest that signs it. Use --unmask-pin if they ask.");
  console.log("=".repeat(78));
}

main().catch((e) => { console.error("[capture] fatal", e?.message ?? e); process.exit(1); });
