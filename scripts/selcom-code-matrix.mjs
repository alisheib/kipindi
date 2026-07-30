#!/usr/bin/env node
/**
 * Selcom utilitycode MATRIX — which code actually routes to this payee?
 *
 * ⚠️ MOVES NO MONEY. Every call here is a signed **GET** to
 * `/walletcashin/namelookup`, the same endpoint `selcomCashinNameLookup()` already uses to
 * show a payee's registered name in the withdraw confirm modal. Nothing is dispatched,
 * nothing is debited, no float is touched.
 *
 * WHY THIS EXISTS. On 2026-07-30 the disbursement float was funded — TZS 100,000, confirmed
 * by `scripts/selcom-probe.mjs` — the PIN was set, and Wallet Cashin was ENABLED. And a
 * payout to a valid, active Vodacom number STILL answered:
 *
 *     resultcode=010  "Invalid mobile number or operator not supported"
 *
 * That killed the earlier theory that `010` was Selcom dressing up an empty float. It is a
 * real routing failure, and the wrong variable is somewhere in the request shape — most
 * likely the per-MNO `utilitycode`.
 *
 * `mnoToSelcomCashin()` in selcom.ts already treats two of these codes as unverified:
 * HaloPesa and TTCL route through the universal `CASHIN` because `HPCASHIN`/`TTCASHIN` were
 * single-source and never confirmed against the live gateway. After a funded-float `010`,
 * `VMCASHIN` belongs in exactly that category — which is what this script settles.
 *
 * A name lookup that RESOLVES proves the gateway can route that code to that number. One
 * that refuses tells you the code is wrong or unprovisioned, without spending a shilling
 * to find out.
 *
 * Run it where the egress IP is allow-listed:
 *   railway ssh "node scripts/selcom-code-matrix.mjs"
 *   railway ssh "node scripts/selcom-code-matrix.mjs --payee=255XXXXXXXXX"
 *
 * Never prints the API secret or the float PIN.
 */
import { createHmac, randomBytes } from "node:crypto";

const BASE = (process.env.PAYMENT_API_URL || "").replace(/\/+$/, "");
const KEY = process.env.PAYMENT_API_KEY || "";
const SECRET = process.env.PAYMENT_API_SECRET || "";
const VENDOR = process.env.PAYMENT_VENDOR_ID || "";
const PIN = process.env.PAYMENT_VENDOR_PIN || "";
const TIMEOUT_MS = Number(process.env.PAYMENT_TIMEOUT_MS) || 45_000;

const ARGV = process.argv.slice(2);
const val = (k, d) => {
  const hit = ARGV.find((a) => a.startsWith(`--${k}=`));
  return hit ? hit.slice(k.length + 3) : d;
};
const PAYEE = val("payee", "255757619808");
const VERBOSE = ARGV.includes("--verbose");

if (!BASE || !KEY || !SECRET || !VENDOR) {
  console.error("[matrix] missing credentials — need PAYMENT_API_URL/KEY/SECRET/VENDOR_ID");
  process.exit(1);
}

// ── Signing — byte-identical to src/lib/server/selcom.ts ──────────────────────
const eatTimestamp = () => new Date(Date.now() + 3 * 3_600_000).toISOString().slice(0, 19) + "+03:00";
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
const maskPin = (t) => (PIN && t ? t.split(PIN).join("<PIN-REDACTED>") : t);

/** Normalise to Selcom's 255XXXXXXXXX, same rule as toSelcomMsisdn(). */
function toSelcomMsisdn(raw) {
  const d = String(raw).replace(/\D/g, "");
  if (d.startsWith("255")) return d;
  if (d.startsWith("0")) return "255" + d.slice(1);
  if (d.length === 9) return "255" + d;
  return d;
}

async function get(path, body) {
  const ts = eatTimestamp();
  const headers = signedHeaders(body, ts);
  const url = `${BASE}${path}?${new URLSearchParams(
    Object.fromEntries(Object.entries(body).map(([k, v]) => [k, String(v)])),
  ).toString()}`;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  const t0 = Date.now();
  try {
    const res = await fetch(url, { method: "GET", headers, signal: ac.signal });
    const raw = await res.text();
    let json = {};
    try { json = JSON.parse(raw); } catch { /* non-JSON body is itself evidence */ }
    return { httpStatus: res.status, json, raw, headers, url, signing: signingString(body, ts), ms: Date.now() - t0 };
  } finally {
    clearTimeout(timer);
  }
}

const describe = (r) => [
  `HTTP ${r.httpStatus}`,
  r.json?.resultcode != null ? `resultcode=${r.json.resultcode}` : null,
  r.json?.result != null ? `result=${r.json.result}` : null,
  r.json?.message != null ? `message=${String(r.json.message).slice(0, 160)}` : null,
].filter(Boolean).join(" · ");

// ── The codes ─────────────────────────────────────────────────────────────────
// Mirrors mnoToSelcomCashin() plus the universal auto-route. The wrong-operator
// codes are included ON PURPOSE: if a Vodacom number resolves under AMCASHIN, the
// gateway is not validating the operator at all and `010` means something else
// entirely. A control that cannot fail teaches you nothing.
const CODES = [
  { code: "VMCASHIN", note: "Vodacom M-Pesa — what production sends today (the one returning 010)" },
  { code: "CASHIN",   note: "universal — Selcom auto-routes by MNP lookup (PRIME SUSPECT)" },
  { code: "AMCASHIN", note: "Airtel — wrong operator on purpose; a PASS here means no operator validation" },
  { code: "TPCASHIN", note: "Tigo/Mixx — wrong operator on purpose, same reasoning" },
  { code: "EZCASHIN", note: "Zantel — wrong operator on purpose, same reasoning" },
];

async function main() {
  const payee = toSelcomMsisdn(PAYEE);
  console.log("=".repeat(78));
  console.log("SELCOM UTILITYCODE MATRIX — name lookup only, NO MONEY MOVES");
  console.log(`vendor=${VENDOR}  base=${BASE}`);
  console.log(`payee=${payee}${payee !== String(PAYEE) ? `  (normalised from ${PAYEE})` : ""}`);
  console.log(`generated=${eatTimestamp()} EAT`);
  console.log("=".repeat(78));

  const results = [];
  for (const c of CODES) {
    const transid = `nlk_${randomBytes(8).toString("hex")}`;
    let r;
    try {
      r = await get("/walletcashin/namelookup", { utilitycode: c.code, utilityref: payee, transid });
    } catch (err) {
      console.log(`\n${c.code.padEnd(10)} NETWORK  ${err?.message ?? err}`);
      results.push({ ...c, verdict: "NETWORK", detail: String(err?.message ?? err), name: null });
      continue;
    }

    const ok = String(r.json?.resultcode ?? "").trim() === "000";
    const name = r.json?.data?.[0]?.name;
    const verdict = ok && typeof name === "string" && name.trim() ? "RESOLVES" : "REFUSED";
    results.push({ ...c, verdict, detail: describe(r), name: verdict === "RESOLVES" ? name.trim() : null, transid });

    console.log(`\n${"─".repeat(78)}`);
    console.log(`${c.code}  →  ${verdict}${verdict === "RESOLVES" ? `  (${name.trim()})` : ""}`);
    console.log(`  ${c.note}`);
    console.log(`  ${describe(r)}   [${r.ms} ms]  transid=${transid}`);
    if (VERBOSE) {
      console.log(`  >> GET ${maskPin(r.url)}`);
      for (const [k, v] of Object.entries(r.headers)) console.log(`  >> ${k}: ${v}`);
      console.log(`  >> [signing string] ${maskPin(r.signing)}`);
      console.log(`  << ${maskPin(r.raw || "(empty body)")}`);
    }
  }

  const winners = results.filter((r) => r.verdict === "RESOLVES");
  const rightOperator = winners.filter((r) => r.code === "VMCASHIN" || r.code === "CASHIN");
  const wrongOperator = winners.filter((r) => !["VMCASHIN", "CASHIN"].includes(r.code));

  console.log("\n" + "=".repeat(78));
  console.log("SUMMARY");
  for (const r of results) console.log(`  ${r.code.padEnd(10)} ${r.verdict.padEnd(9)} ${r.name ?? r.detail}`);
  console.log("=".repeat(78));

  if (!winners.length) {
    console.log("\n❌ NO code resolves this number.");
    console.log("   The payee is not reachable by wallet-cashin name lookup at all, so the");
    console.log("   problem is upstream of the utilitycode — provisioning, or Selcom's own");
    console.log("   MNO connection. This is the evidence pack for their support team.");
  } else if (wrongOperator.length) {
    console.log("\n⚠️  A WRONG-OPERATOR code resolved this number.");
    console.log(`   (${wrongOperator.map((r) => r.code).join(", ")})`);
    console.log("   The gateway is NOT validating operator on lookup, so a RESOLVES here does");
    console.log("   not prove a payout would route. Treat these results as weak evidence and");
    console.log("   confirm with one small real payout before changing the mapping.");
  } else if (rightOperator.length) {
    const pick = rightOperator.find((r) => r.code === "CASHIN") ?? rightOperator[0];
    console.log(`\n✅ USE: ${pick.code}   (registered name: ${pick.name})`);
    console.log("   Pin this in mnoToSelcomCashin() for MPESA, then have one small REAL payout");
    console.log("   confirm it end to end before opening withdrawals to anyone.");
  }
  console.log();
}

main().catch((e) => { console.error("[matrix] fatal", e?.message ?? e); process.exit(1); });
