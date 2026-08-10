#!/usr/bin/env node
/**
 * orphan-stakes.cjs — is anyone actually out of pocket?
 *
 * A pool with no Position is only a bookkeeping curiosity IF the money was never taken.
 * The ledger is the arbiter: a `BET_PLACED` row whose `positionId` no longer resolves means a
 * wallet WAS debited for a position that no longer exists. On a LIVE market that is a player
 * with money staked and no claim on the payout.
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

  console.log("=== BET_PLACED rows whose position no longer exists ===");
  const [o] = await q(c, `
    select count(*)::int as n, coalesce(sum(abs(t.amount)),0)::text as staked
      from "Transaction" t
     where t.type='BET_PLACED' and t."positionId" is not null
       and not exists (select 1 from "Position" p where p.id = t."positionId")`);
  console.log(`  orphaned BET_PLACED: ${o.n}   staked: ${o.staked}`);

  console.log("\n=== of those, how many were later PAID or REFUNDED? (i.e. squared up) ===");
  const [sq] = await q(c, `
    select count(distinct t."positionId")::int as positions,
           count(*) filter (where t.type='BET_PAYOUT')::int as payouts,
           count(*) filter (where t.type='BET_REFUND')::int as refunds
      from "Transaction" t
     where t."positionId" is not null
       and not exists (select 1 from "Position" p where p.id = t."positionId")
       and t.type in ('BET_PAYOUT','BET_REFUND')`);
  console.log(`  orphaned positions with a payout/refund row: ${sq.positions}  (payouts ${sq.payouts}, refunds ${sq.refunds})`);

  console.log("\n=== ⭐ THE ONE THAT MATTERS — the LIVE market with a pool and no positions ===");
  const MKT = "mkt_0d271bde3ae784abe12b";
  const t = await q(c, `
    select t.id, t.type::text as type, t.status::text as status, t.amount::text as amount,
           t."positionId", t."createdAt"::text as created, u."phoneE164"
      from "Transaction" t join "User" u on u.id=t."userId"
     where t."positionId" in (
       select tt."positionId" from "Transaction" tt where tt."positionId" is not null
     ) and t.description ilike '%Manchester%'
     order by t."createdAt" limit 10`);
  console.log(`  transactions mentioning that market: ${t.length}`);
  t.forEach((r) => console.log(`    ${r.created}  ${r.type} ${r.status} ${r.amount}  pos=${r.positionId}  ${r.phoneE164}`));

  // Direct: any ledger row at all naming a position that belonged to this market is gone with it,
  // so ask the other way — is the pool reconcilable against ANY surviving evidence?
  const [mk] = await q(c, `
    select m."yesPool"::text as yes, m."noPool"::text as no, m."predictorCount"::int as pc,
           m.status::text as status, m."resolutionAt"::text as res
      from "PredictionMarket" m where m.id=$1`, [MKT]);
  console.log(`\n  market pool: yes=${mk.yes} no=${mk.no}  predictorCount=${mk.pc}  ${mk.status}  resolves ${mk.res}`);
  console.log(`  ⛔ If this market resolves NO, settlement would pay a pool of ${mk.no} to ZERO positions.`);

  console.log("\n=== does settleMarket cope with a pool and no positions? ===");
  console.log("  (checked in code, not guessed — see the finding row)");

  console.log("\n=== overall: are ANY live/open markets exposed this way? ===");
  const live = await q(c, `
    select m.id, m.status::text as status, (m."yesPool"+m."noPool")::text as pool,
           m."resolutionAt"::text as res
      from "PredictionMarket" m
     where m.status in ('LIVE','CLOSED') and m."yesPool"+m."noPool" > 0
       and not exists (select 1 from "Position" p where p."marketId"=m.id)`);
  console.log(`  ${live.length} live/closed market(s) with a pool and no positions`);
  live.forEach((r) => console.log(`    ${r.id}  ${r.status}  pool=${r.pool}  resolves ${r.res}`));

  await c.end();
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
