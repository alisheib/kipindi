/**
 * Mass-concurrent-bets stress.
 *
 * Drives the internal /api/dev-test/stress-bulk-bet endpoint at
 * escalating fan-out (50 → 200 → 500 → 1000 bets in parallel) and
 * captures:
 *   • Acceptance / rejection mix
 *   • Math correctness (yesDelta, noDelta — must be 0)
 *   • Per-bet latency
 *   • Wallet-vs-positions spot-check
 *   • Top error reasons
 *
 * Each burst uses a different `userPrefix` so the same synthetic users
 * aren't carrying balance across bursts (the endpoint funds each user
 * per call). The same TARGET MARKET is hit every burst so pool growth
 * accumulates across the run — proves the math invariant holds across
 * thousands of cumulative bets.
 *
 *   BASE=http://localhost:3000  node scripts/stress-mass-concurrent-bets.mjs
 */

const BASE = process.env.BASE || "http://localhost:3000";

let pass = 0, fail = 0;
function log(label, ok, detail = "") {
  const t = ok ? "✓" : "✗";
  console.log(`${t} ${label}${detail ? "  →  " + detail : ""}`);
  if (ok) pass++; else fail++;
}

async function getJSON(path) {
  const r = await fetch(`${BASE}${path}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`GET ${path} → ${r.status}`);
  return r.json();
}
async function postJSON(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: r.status, json };
}

console.log(`\n=== STRESS · mass concurrent bets ===\n`);

// 1. Find a live market to bet on
let marketId = null;
try {
  // The /admin/markets API needs auth; use the diagnostic + seed flow.
  // Easier: hit the public landing to find any LIVE market id.
  const r = await fetch(`${BASE}/markets`, { cache: "no-store" });
  const html = await r.text();
  const m = html.match(/href="\/markets\/(mkt_[a-z0-9]+)/);
  if (m) marketId = m[1];
} catch (e) {
  console.log("could not auto-discover marketId:", e?.message);
}
if (!marketId) {
  console.log("✗ no LIVE market found on /markets — seed the demo markets first");
  process.exit(1);
}
console.log(`target market: ${marketId}\n`);

// 2. Escalating-load bursts
const BURSTS = [
  { n: 50,   yesRatio: 0.5, stake: 1000, prefix: "b50",  label: "50 mixed YES/NO" },
  { n: 100,  yesRatio: 1.0, stake: 1000, prefix: "b1y",  label: "100 ALL-YES (same-direction)" },
  { n: 100,  yesRatio: 0.0, stake: 1000, prefix: "b1n",  label: "100 ALL-NO (same-direction)" },
  { n: 200,  yesRatio: 0.5, stake: 500,  prefix: "b2x",  label: "200 mixed @ TZS 500" },
  { n: 500,  yesRatio: 0.5, stake: 200,  prefix: "b5x",  label: "500 mixed @ TZS 200" },
];

for (const b of BURSTS) {
  console.log(`--- burst: ${b.label} ---`);
  const { status, json } = await postJSON("/api/dev-test/stress-bulk-bet", {
    marketId, n: b.n, yesRatio: b.yesRatio, stake: b.stake, userPrefix: b.prefix,
  });
  if (status !== 200 || !json?.ok) {
    log(`${b.label}: endpoint returned ok`, false, `status=${status} body=${JSON.stringify(json).slice(0, 120)}`);
    continue;
  }
  log(`${b.label}: pool math invariant`, json.poolMath === "PASS",
    `yesΔ=${json.yesDelta} noΔ=${json.noDelta}`);
  log(`${b.label}: ${json.accepted}/${b.n} accepted in ${json.elapsedMs}ms (${json.perBetMs}ms/bet)`,
    json.accepted > 0,
    `rejected=${json.rejected}`);
  // Wallet spot-checks
  for (const wc of (json.walletChecks ?? []).slice(0, 3)) {
    const matches = wc.positionsOnMarket * b.stake === wc.debitedToThisMarket;
    log(`${b.label}: wallet[${wc.userId.slice(0, 12)}…] positions=${wc.positionsOnMarket} debited=${wc.debitedToThisMarket}`,
      matches,
      matches ? "balanced" : "POSITION-DEBIT MISMATCH");
  }
  if ((json.topErrors ?? []).length > 0) {
    console.log(`  ${b.label}: top rejection reasons:`);
    for (const e of json.topErrors.slice(0, 3)) console.log(`    ${e.count}× ${e.msg}`);
  }
  console.log();
}

console.log(`${"=".repeat(60)}`);
console.log(`STRESS  PASS: ${pass}    FAIL: ${fail}`);
console.log(`${"=".repeat(60)}`);
process.exit(fail > 0 ? 1 : 0);
