#!/usr/bin/env node
/**
 * census.cjs — read the LIVE money position straight off the production DB.
 *
 * Rules this obeys, each learned the hard way:
 *  - every timestamp is ::text-cast, because this laptop's clock is ~93s slow and a
 *    client-side Date comparison silently invents drift.
 *  - it prints an IDENTITY block first, so the numbers can be cross-checked against
 *    /api/health. A probe that cannot prove which database it read is not evidence.
 *  - it asserts the tables it names actually exist, rather than trusting a 0 that is
 *    really "relation does not exist" swallowed by a try/catch.
 */
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require(path.join(process.env.KP_REPO || "F:/kipindi-main", "node_modules", "pg"));

// load scratchpad env
for (const line of fs.readFileSync(path.join(__dirname, ".env"), "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i > 0) process.env[line.slice(0, i)] = line.slice(i + 1).trim();
}

const q = (c, sql, params) => c.query(sql, params).then((r) => r.rows);

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  // ---- 0. identity: prove which database this is -------------------------------
  const [meta] = await q(c, `select current_database() as db, inet_server_addr()::text as addr, now()::text as server_now`);
  console.log("=== IDENTITY ===");
  console.log(`db=${meta.db}  server=${meta.addr}  server_now=${meta.server_now}`);

  const tables = (await q(c, `select table_name from information_schema.tables where table_schema='public'`)).map((r) => r.table_name);
  const need = ["User", "Wallet", "Transaction", "Position", "PredictionMarket", "UpDownRound"];
  const missing = need.filter((t) => !tables.includes(t));
  if (missing.length) {
    console.log(`⛔ MISSING TABLES: ${missing.join(", ")}`);
    console.log(`   (public schema has ${tables.length} tables; sample: ${tables.slice(0, 8).join(", ")})`);
    await c.end();
    process.exit(2);
  }
  console.log(`tables: ${tables.length} in public, all ${need.length} expected present`);

  // ---- 1. cross-check against /api/health --------------------------------------
  const [counts] = await q(c, `
    select (select count(*) from "User")::int as users,
           (select count(*) from "PredictionMarket" where status='LIVE')::int as markets_live,
           (select count(*) from "PredictionMarket" where status='RESOLVED')::int as markets_resolved`);
  console.log("\n=== CROSS-CHECK vs /api/health ===");
  console.log(`users=${counts.users}  markets_live=${counts.markets_live}  markets_resolved=${counts.markets_resolved}`);
  console.log(`(health at 06:09Z said users=71 marketsLive=41 marketsResolved=744)`);

  const mkt = await q(c, `select status, count(*)::int as n from "PredictionMarket" group by status order by n desc`);
  console.log(`market status spread: ${mkt.map((r) => `${r.status}=${r.n}`).join("  ")}`);

  // ---- 2. money census ----------------------------------------------------------
  console.log("\n=== MONEY CENSUS ===");

  const neg = await q(c, `select id, "userId", balance::text, pending::text, hold::text, "bonusBalance"::text
                            from "Wallet" where balance < 0 or pending < 0 or hold < 0 or "bonusBalance" < 0`);
  console.log(`negative wallet components: ${neg.length}`);
  neg.forEach((w) => console.log(`  🔴 ${w.userId} bal=${w.balance} pend=${w.pending} hold=${w.hold} bonus=${w.bonusBalance}`));

  const openPos = await q(c, `select p.id, p."userId", p.status, p."marketId"
                                from "Position" p where p.status='OPEN'`);
  console.log(`OPEN positions: ${openPos.length}`);

  // stranded = an OPEN position whose market already resolved
  // ⚠️ "OPEN position on a RESOLVED/VOIDED market" IS NOT STRANDING ON ITS OWN, and reading it
  // that way produced a false 🔴 on 2026-08-10. `settleMarket` REFUSES to move money until the
  // objection window closes — 24h by default — so between adjudication and settlement a market
  // legitimately sits VOIDED with its positions still OPEN and its pool intact. That is the
  // system working, and it is the very window DA-5's `settledAt` requirement was built around.
  // ⛔ The honest test is whether the window has CLOSED and settlement still has not run.
  const inFlight = await q(c, `
    select p.id, p."userId", p."marketId", p.stake::text as stake, m.status as market_status,
           m."objectionsClosedAt"::text as "objClosed",
           (m."objectionsClosedAt" > now()) as window_open,
           round(extract(epoch from (now() - m."objectionsClosedAt"))/3600.0, 1) as hours_overdue
      from "Position" p join "PredictionMarket" m on m.id = p."marketId"
     where p.status='OPEN' and m.status in ('RESOLVED','VOIDED')`);
  const waiting = inFlight.filter((r) => r.window_open);
  const stranded = inFlight.filter((r) => !r.window_open);
  console.log(`IN FLIGHT (settled market, objection window still OPEN — correct): ${waiting.length}`);
  console.log(`🔴 STRANDED (window CLOSED and settlement has not run): ${stranded.length}`);
  stranded.forEach((s) => console.log(`  🔴 pos=${s.id} mkt=${s.marketId} ${s.market_status} stake=${s.stake} overdue=${s.hours_overdue}h`));

  // A market that RESOLVED but never settled still holds its pool (schema comment, line ~1085).
  const unsettled = await q(c, `
    select m.id, m.status, m."resolutionAt"::text as "resolutionAt", m."resolvedOutcome",
           (select count(*) from "Position" p where p."marketId"=m.id and p.status='OPEN')::int as open_positions
      from "PredictionMarket" m
     where m.status in ('RESOLVED','VOIDED') and m."settledAt" is null
     order by m."resolutionAt" desc limit 25`);
  console.log(`RESOLVED/VOIDED markets with settledAt = NULL: ${unsettled.length}`);
  unsettled.forEach((m) => console.log(`  ⏳ ${m.id} ${m.status} outcome=${m.resolvedOutcome ?? "-"} openPositions=${m.open_positions} resolutionAt=${m.resolutionAt}`));

  // ---- 3. withdrawals: the item-2 stuck payouts ---------------------------------
  console.log("\n=== WITHDRAWALS BY STATUS ===");
  const wd = await q(c, `select status, count(*)::int as n, sum(amount)::text as total
                           from "Transaction" where type='WITHDRAWAL' group by status order by n desc`);
  wd.forEach((r) => console.log(`  ${r.status.padEnd(12)} n=${String(r.n).padEnd(4)} total=${r.total}`));

  const stuck = await q(c, `
    select id, "userId", status, amount::text, "providerRef", "providerStatus", "payoutRail",
           msisdn, "createdAt"::text as created, "updatedAt"::text as updated
      from "Transaction"
     where type='WITHDRAWAL' and status in ('PENDING','PROCESSING','AML_REVIEW')
     order by "createdAt"`);
  console.log(`\nSTUCK withdrawals (PENDING/PROCESSING/AML_REVIEW): ${stuck.length}`);
  stuck.forEach((t) => console.log(
    `  ⏳ ${t.id} user=${t.userId} ${t.status} amount=${t.amount} rail=${t.payoutRail} ref=${t.providerRef} provStatus=${t.providerStatus} created=${t.created}`));

  // ---- 4. Up & Down ---------------------------------------------------------------
  console.log("\n=== UP & DOWN ===");
  const udr = await q(c, `
    select m.status as market_status, r.outcome, count(*)::int as n
      from "UpDownRound" r join "PredictionMarket" m on m.id = r."marketId"
     group by m.status, r.outcome order by n desc`);
  udr.forEach((r) => console.log(`  market=${String(r.market_status).padEnd(9)} outcome=${String(r.outcome ?? "-").padEnd(10)} n=${r.n}`));

  // A round whose boundary has passed but which has not settled is money in limbo.
  const udStuck = await q(c, `
    select r.id, r."roundNumber", m.status as market_status, r."boundaryAt"::text as "boundaryAt",
           r."settledAt"::text as "settledAt", r.outcome,
           (select count(*) from "Position" p where p."marketId"=r."marketId")::int as positions
      from "UpDownRound" r join "PredictionMarket" m on m.id = r."marketId"
     where r."settledAt" is null and r."boundaryAt" < now() - interval '10 minutes'
     order by r."boundaryAt" desc limit 20`);
  console.log(`\nUP&DOWN rounds past boundary +10min with NO settledAt: ${udStuck.length}`);
  udStuck.forEach((r) => console.log(
    `  ⏳ #${r.roundNumber} ${r.id} mkt=${r.market_status} boundary=${r.boundaryAt} positions=${r.positions} outcome=${r.outcome ?? "-"}`));

  await c.end();
})().catch((e) => { console.error("PROBE FAILED:", e.message); process.exit(1); });
