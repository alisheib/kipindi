#!/usr/bin/env node
/**
 * house-money.cjs — WHERE THE PLATFORM'S OWN MONEY LIVES, and how much is in it.
 *
 * The question "where is the profit stored" has a precise answer on this platform, and
 * it is NOT a wallet: the house never holds a Wallet row. Every shilling the platform
 * earns is a LEDGER BALANCE on a `HOUSE:*` account, computed as the sum of its entries.
 *
 * ⛔ Read-only. Reads `LedgerEntry` only.
 *
 * The accounts (src/lib/server/ledger.ts `acct`):
 *   HOUSE:COMMISSION  — the fee charged at settlement and on cash-out. THE REVENUE LINE.
 *                       The statutory levies are DEBITED out of it, so its balance is
 *                       already net of TRA and GBT.
 *   HOUSE:TRA_LEVY    — tax withheld for the Tanzania Revenue Authority. Owed, not owned.
 *   HOUSE:GBT_LEVY    — the Gaming Board levy. Owed, not owned.
 *   HOUSE:TAX         — withholding taken at payout where it applies.
 *   HOUSE:RESERVE     — the operator's own seeded liquidity.
 *   HOUSE:AGGREGATOR  — money in flight at the payment provider.
 *   HOUSE:RG_SUSPENSE — money HELD BUT NOT OWNED: a deposit that landed after a player
 *                       self-excluded. ⚠️ A non-zero balance here is a DEBT to a player.
 *   POOL:<marketId>   — an open market's stakes. Not revenue: it is players' money
 *                       sitting in escrow until the market settles.
 */
const fs = require("node:fs");
// ⚠️ PLAIN `require`, resolved from THIS file's directory upward — never a machine's checkout
// path. This line read `require("C:/kipindi-main/node_modules/pg")`, and `scripts/live/q.cjs`
// already carries the note explaining why that is wrong: the repo lives at `F:\kipindi-main` on
// the other laptop, so the script threw MODULE_NOT_FOUND there and *"the DB half of every live
// claim was simply unavailable"*. 🔴 The fix was applied to `q.cjs` and to nothing else, so
// three of the four money instruments — this one, `pool-residual.cjs` and `poll-census.cjs` —
// still could not run on half the machines that own this repo. ⛔ This one was the worst of the
// three: it had no `KP_REPO` fallback at all, so no environment variable could rescue it.
const { Client } = require("pg");
for (const l of fs.readFileSync(require("node:path").join(__dirname, ".env"), "utf8").split("\n")) {
  const i = l.indexOf("="); if (i > 0) process.env[l.slice(0, i)] = l.slice(i + 1).trim();
}
const tzs = (n) => "TZS " + Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 });

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  console.log("=== HOUSE ACCOUNTS — the platform's own money ===\n");
  const house = (await c.query(`
    select account, sum(amount)::numeric as balance, count(*)::int as entries
      from "LedgerEntry" where account like 'HOUSE:%' or account like 'SYSTEM:%'
     group by account order by account`)).rows;
  for (const r of house) {
    const owned = /COMMISSION|RESERVE/.test(r.account) ? "OWNED"
      : /TRA_LEVY|GBT_LEVY|TAX/.test(r.account) ? "OWED to the state"
      : /RG_SUSPENSE/.test(r.account) ? "OWED to a player"
      : "internal";
    console.log(`  ${r.account.padEnd(20)} ${tzs(r.balance).padStart(18)}   ${String(r.entries).padStart(5)} entries   ${owned}`);
  }

  console.log("\n=== REVENUE BY SOURCE (what earned it) ===\n");
  for (const r of (await c.query(`
    select "entryType", sum(amount)::numeric as total, count(*)::int as n
      from "LedgerEntry" where account = 'HOUSE:COMMISSION'
     group by "entryType" order by sum(amount) desc`)).rows) {
    console.log(`  ${String(r.entryType).padEnd(28)} ${tzs(r.total).padStart(16)}   ${r.n} entries`);
  }

  console.log("\n=== PLAYER MONEY STILL IN ESCROW (open market pools) ===\n");
  const [pools] = (await c.query(`
    select coalesce(sum(amount),0)::numeric as bal, count(distinct account)::int as n
      from "LedgerEntry" where account like 'POOL:%'`)).rows;
  console.log(`  ${pools.n} pool accounts holding ${tzs(pools.bal)} — players' stakes, NOT revenue`);

  console.log("\n=== THE CHECK THAT MATTERS ===\n");
  const [all] = (await c.query(`select coalesce(sum(amount),0)::numeric as s from "LedgerEntry"`)).rows;
  console.log(`  every ledger entry ever written sums to ${tzs(all.s)}`);
  console.log(`  ${Number(all.s) === 0 ? "✓ the books balance — every shilling has a source and a destination" : "🔴 THE BOOKS DO NOT BALANCE"}`);

  await c.end();
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
