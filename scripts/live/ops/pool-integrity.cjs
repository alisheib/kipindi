#!/usr/bin/env node
/**
 * pool-integrity.cjs — READ-ONLY. Does every market's DECLARED pool match the escrow the
 * ledger actually holds, and has any pool been paid out below zero?
 *
 *   node scripts/live/ops/pool-integrity.cjs        (npm run ops:pool-integrity)
 *
 * 🔴 THE DEFECT CLASS THIS EXISTS FOR (money-gate `LEAD-G.4`, CONFIRMED; §7.18).
 * `trialBalance()` has three terms and two of them cannot fail by construction —
 * `postLedgerEntries` refuses an imbalanced group *before* insert, so "every group sums to
 * zero" and "the global sum is zero" are entailed by the writer. The only live invariant is
 * the per-wallet PLAYER drift check. **`POOL:*` and `HOUSE:*` are checked by nothing on a
 * schedule**, and `ops:pool-orphans` — the one instrument aimed here — is run by hand.
 *
 * ⛔ AND THE GAP WAS NOT THEORETICAL. Run against production 2026-09-09, with the per-wallet
 * trial balance GREEN on all 113 wallets and the global ledger summing to exactly zero:
 *   · **9 pools were NEGATIVE, totalling −20,008 TZS** — more paid out than was ever staked in.
 *     `mkt_037b284976b9dd2bd9e2` alone is −19,999: three positions totalling 10,500 went in,
 *     and settlement distributed 30,499 because the market's own `yesPool` column declared
 *     23,500 against 3,500 of actual YES positions.
 *   · **3 markets were still LIVE with a declared pool ABOVE the escrow held**, 164,600 TZS
 *     short in total. Each is a loss waiting for its own settlement.
 *
 * ⭐ "The books balance" says every entry has a counterpart. It does not say every account
 * means something. The shortfall landed in `POOL:*` and every existing check stayed green.
 *
 * ⚠️ READ THE BUCKETS, NOT THE HEADLINE. 37 further markets declare pools totalling ~13.8M
 * with ZERO positions and a ZERO pool balance — seeded display columns where no stake ever
 * arrived and no payout ever left. Reporting that as exposure would be a fabrication; this
 * script separates it out and labels it INERT for exactly that reason.
 */
const fs = require("node:fs");
const path = require("node:path");
const REPO = process.env.KP_REPO || path.resolve(__dirname, "..", "..", "..");
const { Client } = require(path.join(REPO, "node_modules", "pg"));

const ENV = path.join(__dirname, ".env");
if (!fs.existsSync(ENV)) {
  console.error("No scripts/live/ops/.env — run: railway run -s 50pick -- node scripts/live/ops/mkenv.cjs");
  process.exit(1);
}
for (const l of fs.readFileSync(ENV, "utf8").split("\n")) {
  const i = l.indexOf("="); if (i > 0) process.env[l.slice(0, i)] = l.slice(i + 1).trim();
}
// ⛔ `railway run`'s DATABASE_URL is the INTERNAL host and returns DEFAULTS off-platform.
if (/railway\.internal/.test(process.env.DATABASE_URL || "")) {
  console.error("FAIL: DATABASE_URL is the INTERNAL host — re-run mkenv.cjs under `railway run`.");
  process.exit(1);
}

const TOL = 0.005;
const tzs = (n) => Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 });

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const q = (sql) => c.query(sql).then((r) => r.rows);
  console.log(`db=${(await q("select current_database() d"))[0].d}  ${new Date().toISOString()}\n`);

  const rows = await q(`
    WITH pos AS (
      SELECT "marketId", SUM(stake)::numeric AS pos_stake, COUNT(*)::int AS n
        FROM "Position" GROUP BY "marketId"),
    led AS (
      SELECT REPLACE(account,'POOL:','') AS mid, SUM(amount)::numeric AS pool_bal
        FROM "LedgerEntry" WHERE account LIKE 'POOL:%' GROUP BY 1)
    SELECT m.id, m.status,
           (m."yesPool"::numeric + m."noPool"::numeric) AS declared,
           COALESCE(pos.pos_stake,0) AS positions, COALESCE(pos.n,0) AS n,
           COALESCE(led.pool_bal,0)  AS pool_bal
      FROM "PredictionMarket" m
      LEFT JOIN pos ON pos."marketId" = m.id
      LEFT JOIN led ON led.mid = m.id
     WHERE ABS((m."yesPool"::numeric + m."noPool"::numeric) - COALESCE(pos.pos_stake,0)) > ${TOL}
        OR COALESCE(led.pool_bal,0) < -${TOL}`);

  const negative = rows.filter((r) => Number(r.pool_bal) < -TOL);
  const inert    = rows.filter((r) => Number(r.n) === 0 && Math.abs(Number(r.pool_bal)) <= TOL);
  const atRisk   = rows.filter((r) => r.status === "LIVE" && Number(r.declared) - Number(r.pool_bal) > TOL);

  const sum = (a, f) => a.reduce((s, r) => s + Number(f(r)), 0);

  console.log("=== 🔴 REALISED — pools paid out below zero ===");
  for (const r of negative.sort((a, b) => Number(a.pool_bal) - Number(b.pool_bal))) {
    console.log(`  ${r.id}  ${tzs(r.pool_bal).padStart(12)}  status=${r.status}  positions=${tzs(r.positions)} declared=${tzs(r.declared)}`);
  }
  console.log(`  Σ REALISED: ${tzs(sum(negative, (r) => r.pool_bal))} TZS over ${negative.length} market(s)\n`);

  console.log("=== ⚠️ AT RISK — still LIVE, declared pool exceeds the escrow held ===");
  for (const r of atRisk.sort((a, b) => (Number(b.declared) - Number(b.pool_bal)) - (Number(a.declared) - Number(a.pool_bal)))) {
    console.log(`  ${r.id}  declared=${tzs(r.declared).padStart(12)} escrow=${tzs(r.pool_bal).padStart(12)}` +
      `  SHORT BY ${tzs(Number(r.declared) - Number(r.pool_bal)).padStart(12)}`);
  }
  console.log(`  Σ AT RISK: ${tzs(sum(atRisk, (r) => Number(r.declared) - Number(r.pool_bal)))} TZS over ${atRisk.length} market(s)\n`);

  console.log(`=== ✅ INERT — declared columns with NO positions and NO escrow (no money moved) ===`);
  console.log(`  ${inert.length} market(s), declared Σ ${tzs(sum(inert, (r) => r.declared))} TZS`);
  console.log(`  ⛔ This is NOT exposure. Counting it as such would overstate by ~100×.\n`);

  const bad = negative.length + atRisk.length;
  console.log(`⭐ VERDICT: ${bad === 0 ? "CLEAN — every pool holds what it declares" : `${bad} market(s) need a decision`}`);
  process.exitCode = bad === 0 ? 0 : 1;
  await c.end();
})().catch((e) => { console.error("FAILED:", e.message); process.exit(2); });
