#!/usr/bin/env node
/**
 * pool-orphans.cjs — does every POOL:* account belong to a market row that still EXISTS?
 *
 * 🔴 WHY THIS EXISTS, MEASURED ON PRODUCTION 2026-08-28. A teardown script refunded open
 * positions and then deleted the markets. The positions cascade-deleted with them, and two
 * `STAKE_DEBIT` ledger pairs were left standing — so the books claimed TZS 2,000 was held in
 * escrow for a market that no longer existed. `house-money.cjs` STILL PRINTED "the books
 * balance", because both halves of each pair were present and the grand total was still zero.
 *
 * ⛔ "THE BOOKS BALANCE" ONLY SAYS EVERY ENTRY HAS A COUNTERPART. It does not say every account
 * MEANS something. Those are different statements and only the first one was ever checked.
 *
 * ⛔ AND `pool-residual.cjs` CANNOT SEE THIS EITHER, by construction — which is the part worth
 * reading. Its query is:
 *
 *     from "LedgerEntry" le
 *     join "PredictionMarket" m on ('POOL:' || m.id) = le.account
 *
 * an INNER JOIN. An orphaned pool account has no market row to join to, so it is silently
 * DROPPED FROM THE RESULT rather than reported. The one instrument aimed at pool accounts
 * excludes precisely the pool accounts that have lost their market — the population it would
 * most want to name. That is not a bug in its SQL; it is the question it was written to ask.
 * This asks the other one.
 *
 * ⭐ AND IT IS THE GUARD THE CHAIN-PURGE FEATURE MAKES LOAD-BEARING. The purge deliberately
 * does NOT delete markets — they survive as stamped tombstones — precisely so this class
 * cannot be manufactured at the scale of a whole chain. This check is how that claim stays
 * true: if a purge ever starts deleting market rows again, the number below moves.
 *
 * ⛔ READ-ONLY. Runs SELECTs and nothing else.
 *
 * Run: npm run ops:pool-orphans
 */
const fs = require("node:fs");
const path = require("node:path");
// ⚠️ PLAIN require, resolved from THIS file's directory upward — never a machine's checkout
// path and never an env var that has to be remembered. See the note in pool-residual.cjs.
const { Client } = require("pg");
for (const l of fs.readFileSync(path.join(__dirname, ".env"), "utf8").split("\n")) {
  const i = l.indexOf("="); if (i > 0) process.env[l.slice(0, i)] = l.slice(i + 1).trim();
}

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  /* ⭐ A LEFT JOIN, and the whole finding is in that one word. Every POOL:* account is listed
     and the market is looked for; the ones where nothing was found are the answer. */
  const orphans = (await c.query(`
    select le.account,
           count(*)::int            as entries,
           sum(le.amount)::numeric  as net,
           min(le."createdAt")      as first_at,
           max(le."createdAt")      as last_at
      from "LedgerEntry" le
      left join "PredictionMarket" m on ('POOL:' || m.id) = le.account
     where le.account like 'POOL:%'
       and m.id is null
     group by le.account
     order by min(le."createdAt")`)).rows;

  /* The same question for the house-pool ledger, whose marketId is also a loose string. */
  const houseOrphans = (await c.query(`
    select hpl."marketId", count(*)::int as entries, sum(hpl.amount)::numeric as net
      from "HousePoolLedger" hpl
      left join "PredictionMarket" m on m.id = hpl."marketId"
     where hpl."marketId" is not null
       and m.id is null
     group by hpl."marketId"
     order by count(*) desc`)).rows;

  /* ⭐ AND THE POPULATION, so a zero cannot be read as "clean" when it means "found nothing to
     look at". A run that reports 0 orphans against 0 pool accounts has measured nothing. */
  const totals = (await c.query(`
    select count(distinct le.account)::int as pool_accounts,
           (select count(*)::int from "PredictionMarket") as markets,
           (select count(*)::int from "PredictionMarket" where "purgedAt" is not null) as purged
      from "LedgerEntry" le
     where le.account like 'POOL:%'`)).rows[0];

  console.log(`pool accounts: ${totals.pool_accounts} · markets: ${totals.markets} · purged tombstones: ${totals.purged}\n`);

  if (totals.pool_accounts === 0) {
    console.log("⛔ PROVING NOTHING — there are no POOL:* accounts at all, so this run measured nothing.");
    await c.end();
    process.exit(1);
  }

  console.log(`POOL:* accounts whose market row NO LONGER EXISTS: ${orphans.length}`);
  let net = 0;
  for (const r of orphans) {
    const v = Number(r.net);
    net += v;
    console.log(`  🔴 ${r.account.padEnd(38)} ${String(v).padStart(10)}  ${r.entries} entries  first ${String(r.first_at).slice(0, 10)}`);
  }
  if (orphans.length) console.log(`\n  net across orphaned pools: ${net} — money the books account for against a market that is gone`);

  console.log(`\nHousePoolLedger rows whose market row NO LONGER EXISTS: ${houseOrphans.length}`);
  for (const r of houseOrphans.slice(0, 25)) {
    console.log(`  🔴 ${String(r.marketId).padEnd(38)} ${String(Number(r.net)).padStart(10)}  ${r.entries} entries`);
  }

  const bad = orphans.length + houseOrphans.length;
  console.log(`\n${bad === 0
    ? "✅ every POOL:* account and house-pool row names a market that exists"
    : `🔴 ${bad} account(s)/row(s) name a market that does not exist`}`);
  await c.end();
  process.exit(bad === 0 ? 0 : 1);
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
