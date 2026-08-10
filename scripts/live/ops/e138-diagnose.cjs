#!/usr/bin/env node
/**
 * e138-diagnose.cjs — WHY do 37 markets show a pool with no positions, and what is honest?
 *
 * ⛔ The answer decides the remedy, so measure before choosing:
 *   · if the LEDGER still holds BET_PLACED rows for them, the money history is intact and only
 *     the Position rows were purged — the pool is TRUE and hiding it would destroy real history
 *   · if there are no transactions either, the pool is a number with nothing behind it
 *   · and either way: are these markets VISIBLE to a player today?
 */
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require(path.join(process.env.KP_REPO || "F:/kipindi-main", "node_modules", "pg"));
for (const line of fs.readFileSync(path.join(__dirname, ".env"), "utf8").split("\n")) {
  const i = line.indexOf("="); if (i > 0) process.env[line.slice(0, i)] = line.slice(i + 1).trim();
}
const q = (c, s, p) => c.query(s, p).then((r) => r.rows);

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  const IDS = `
    select m.id from "PredictionMarket" m
     where m."yesPool" + m."noPool" > 0
       and not exists (select 1 from "Position" p where p."marketId" = m.id)`;

  console.log("=== the set ===");
  const [n] = await q(c, `select count(*)::int as n, sum(m."yesPool"+m."noPool")::text as pool
                            from "PredictionMarket" m where m.id in (${IDS})`);
  console.log(`  ${n.n} markets, pool total ${n.pool}`);

  console.log("\n=== 1 · does the LEDGER still hold their bets? (the decisive question) ===");
  const [led] = await q(c, `
    select count(*)::int as txns,
           count(*) filter (where t.type='BET_PLACED')::int as placed,
           count(*) filter (where t.type='BET_PAYOUT')::int as payouts,
           count(*) filter (where t.type='BET_REFUND')::int as refunds,
           coalesce(sum(abs(t.amount)) filter (where t.type='BET_PLACED'),0)::text as staked
      from "Transaction" t
     where t."positionId" in (
       select p.id from "Position" p where 1=0)  -- positions are gone, so this is empty by construction
  `);
  console.log(`  via positionId: ${led.txns} (0 expected — the positions are gone, so the FK is unusable)`);

  // The ledger links a wager to a POSITION, not a market. If positions are deleted the link is
  // severed, so ask a different way: were these markets ever settled, and is there an audit trail?
  console.log("\n=== 2 · what does the AUDIT CHAIN say happened to them? ===");
  const aud = await q(c, `
    select a.action, count(*)::int as n
      from "AuditLog" a
     where a."targetId" in (${IDS})
     group by a.action order by n desc limit 12`);
  if (!aud.length) console.log("  (no audit rows reference these markets at all)");
  aud.forEach((r) => console.log(`  ${String(r.n).padStart(5)}  ${r.action}`));

  console.log("\n=== 3 · are they VISIBLE to a player today? ===");
  const vis = await q(c, `
    select m.status::text as status, count(*)::int as n,
           sum(m."yesPool"+m."noPool")::text as pool,
           min(m."resolutionAt")::text as earliest, max(m."resolutionAt")::text as latest
      from "PredictionMarket" m where m.id in (${IDS})
     group by m.status order by n desc`);
  vis.forEach((r) => console.log(`  ${r.status.padEnd(9)} n=${String(r.n).padStart(3)} pool=${String(r.pool).padStart(12)}  ${String(r.earliest).slice(0,10)} → ${String(r.latest).slice(0,10)}`));

  console.log("\n=== 4 · do they carry a settledAt / resolvedOutcome? (did money ever move?) ===");
  const [s] = await q(c, `
    select count(*) filter (where m."settledAt" is not null)::int as settled,
           count(*) filter (where m."resolvedOutcome" is not null)::int as with_outcome,
           count(*)::int as total
      from "PredictionMarket" m where m.id in (${IDS})`);
  console.log(`  settledAt set: ${s.settled} of ${s.total}   ·   resolvedOutcome set: ${s.with_outcome} of ${s.total}`);

  console.log("\n=== 5 · COMPARISON — markets that DO have positions, same era ===");
  const [cmp] = await q(c, `
    select count(*)::int as n
      from "PredictionMarket" m
     where exists (select 1 from "Position" p where p."marketId"=m.id)
       and m."resolutionAt" < timestamp '2026-07-20'`);
  console.log(`  markets older than 2026-07-20 that still HAVE positions: ${cmp.n}`);
  console.log(`  (if this is ~0, positions from that era were purged wholesale and the 37 are not special)`);

  console.log("\n=== 6 · total Position rows by month, to see any purge boundary ===");
  const mo = await q(c, `
    select to_char(date_trunc('month', p."placedAt"),'YYYY-MM') as month, count(*)::int as positions
      from "Position" p group by 1 order by 1`);
  mo.forEach((r) => console.log(`  ${r.month}  ${r.positions}`));

  await c.end();
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
