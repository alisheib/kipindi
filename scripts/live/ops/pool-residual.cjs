#!/usr/bin/env node
/**
 * pool-residual.cjs — does every SETTLED market's POOL account return to zero?
 *
 * A pool account is escrow: stakes in, payouts + fee out. Once a market has settled it
 * must hold exactly nothing. A NEGATIVE residual means more money left the pool than
 * ever entered it — the platform paid out money nobody staked.
 *
 * ⛔ Read-only.
 */
const fs = require("node:fs");
const path = require("node:path");
// ⚠️ PLAIN require, resolved from THIS file's directory upward — never a machine's checkout
// path and never an env var that has to be remembered. This read
// `require(path.join(process.env.KP_REPO || "C:/kipindi-main", "node_modules", "pg"))`, so on a
// checkout at F:kipindi-main it threw MODULE_NOT_FOUND unless KP_REPO happened to be set.
// `scripts/live/q.cjs` already carries the full note; the fix was applied there and propagated
// to nothing else.
const { Client } = require("pg");
for (const l of fs.readFileSync(path.join(__dirname, ".env"), "utf8").split("\n")) {
  const i = l.indexOf("="); if (i > 0) process.env[l.slice(0, i)] = l.slice(i + 1).trim();
}
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  const rows = (await c.query(`
    select le.account, sum(le.amount)::numeric as residual,
           m.status, m."productLine" as line, m."settledAt" is not null as settled
      from "LedgerEntry" le
      join "PredictionMarket" m on ('POOL:' || m.id) = le.account
     where le.account like 'POOL:%'
     group by le.account, m.status, m."productLine", m."settledAt"
    having sum(le.amount) <> 0
     order by sum(le.amount)`)).rows;

  const settled = rows.filter((r) => r.settled);
  const open = rows.filter((r) => !r.settled);

  console.log(`SETTLED markets whose pool did NOT return to zero: ${settled.length}`);
  let neg = 0, tot = 0;
  for (const r of settled.slice(0, 25)) {
    const v = Number(r.residual);
    if (v < 0) neg++;
    tot += v;
    console.log(`  ${v < 0 ? "🔴" : "⚠️ "} ${r.account.padEnd(34)} ${String(v).padStart(10)}  ${r.status}  ${r.line}`);
  }
  if (settled.length > 25) console.log(`  … ${settled.length - 25} more`);
  console.log(`\n  ${neg} of them NEGATIVE (paid out more than was staked). Net residual across all settled pools: ${tot}`);
  console.log(`\nOPEN markets with a non-zero pool (expected — stakes are still in escrow): ${open.length}`);
  await c.end();
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
