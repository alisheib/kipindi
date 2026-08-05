/**
 * DOES EVERY SETTLED POOL DRAIN TO EXACTLY ZERO ON PRODUCTION?
 *
 * `POOL:{marketId}` receives every stake and pays out every payout and the fee. After a
 * market settles it must hold EXACTLY 0 — anything else is money created (negative) or
 * stranded (positive).
 *
 * ⛔ WHY NO EXISTING GATE SEES THIS. `reconcileLedger()` / `trialBalance()` assert that every
 * ledger GROUP sums to zero, and every group here does: a settlement group is (POOL −x,
 * PLAYER +x) and balances by construction. A POOL account closing at −1 is invisible to that
 * check, because the −1 is offset by the HOUSE legs elsewhere in the same books. The invariant
 * "in = out + house" is a statement about ONE ACCOUNT, and nothing was measuring it.
 *
 *   node .qa-s28/pool-drain.cjs
 */
const { Client } = require("pg");

const url = (process.env.DATABASE_URL || "")
  .replace(/@postgres\.railway\.internal(:\d+)?/, "@turntable.proxy.rlwy.net:40357");

(async () => {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();

  const { rows } = await c.query(`
    select l.account,
           sum(l.amount)::text            as net,
           count(*)                       as legs,
           m.status::text                 as status,
           m."resolvedOutcome"            as outcome,
           m."settledAt"::text            as settled,
           m."productLine"                as product,
           (m."yesPool" + m."noPool")::text as pool,
           (select count(*) from "Position" p where p."marketId" = m.id) as positions
      from "LedgerEntry" l
      join "PredictionMarket" m on ('POOL:' || m.id) = l.account
     where l.account like 'POOL:%'
     group by l.account, m.status, m."resolvedOutcome", m."settledAt", m."productLine", m."yesPool", m."noPool", m.id
     having m."settledAt" is not null
     order by abs(sum(l.amount)) desc, m."settledAt" desc`);

  const bad = rows.filter((r) => Math.abs(Number(r.net)) > 0.004);
  console.log(`\nSETTLED markets with a POOL ledger account: ${rows.length}`);
  console.log(`🔴 NOT drained to zero: ${bad.length}\n`);

  let created = 0, stranded = 0;
  for (const r of bad.slice(0, 40)) {
    const n = Number(r.net);
    if (n < 0) created += -n; else stranded += n;
    console.log(`  ${r.account}  net ${String(n).padStart(8)}  ${n < 0 ? "MONEY CREATED " : "STRANDED      "}` +
      `pool ${String(Number(r.pool).toLocaleString()).padStart(9)}  ${String(r.positions).padStart(3)} pos  ` +
      `${String(r.product ?? "-").padEnd(7)} ${r.outcome ?? "-"}  ${r.settled}`);
  }
  if (bad.length > 40) console.log(`  … and ${bad.length - 40} more`);

  console.log(`\n  total created (pool overdrawn): ${created.toFixed(2)} TZS`);
  console.log(`  total stranded (pool residue):  ${stranded.toFixed(2)} TZS`);

  // ⭐ Does it scale with POSITION COUNT? That is the difference between a one-off and a
  // rounding policy: per-position rounding accumulates, a single bad divide does not.
  console.log(`\n── by position count (settled markets) ──`);
  const byN = new Map();
  for (const r of rows) {
    const k = Number(r.positions);
    const e = byN.get(k) ?? { n: 0, off: 0 };
    e.n++; if (Math.abs(Number(r.net)) > 0.004) e.off++;
    byN.set(k, e);
  }
  for (const [k, e] of [...byN].sort((a, b) => a[0] - b[0]))
    console.log(`   ${String(k).padStart(3)} position(s): ${String(e.off).padStart(4)} of ${String(e.n).padStart(4)} markets do not drain to zero`);

  await c.end();
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error("ERROR", e.message); process.exit(1); });
