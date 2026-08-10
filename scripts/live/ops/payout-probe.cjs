#!/usr/bin/env node
/**
 * payout-probe.cjs — everything needed to decide the stuck-payout action SAFELY.
 *
 * Answers, with evidence rather than inference:
 *  1. WHO owns the stuck withdrawal — QA persona or a real customer?
 *  2. Did the 12 FAILED withdrawals actually give the money back? (a FAILED payout that
 *     debited and never credited is a player short of cash, and no status field says so —
 *     only the ledger arithmetic does.)
 *  3. What is the wallet balance of everyone involved, so a return can be verified after.
 */
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require(path.join(process.env.KP_REPO || "F:/kipindi-main", "node_modules", "pg"));

for (const line of fs.readFileSync(path.join(__dirname, ".env"), "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i > 0) process.env[line.slice(0, i)] = line.slice(i + 1).trim();
}
const q = (c, sql, p) => c.query(sql, p).then((r) => r.rows);

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  const bypass = process.env.PAYOUT_TEST_BYPASS_MSISDN || "";
  console.log(`=== PAYOUT_TEST_BYPASS_MSISDN (live) === "${bypass}"\n`);

  // ---- 1. the stuck row and its owner -------------------------------------------
  console.log("=== STUCK WITHDRAWAL — WHO OWNS IT ===");
  const stuck = await q(c, `
    select t.id, t.status, t.amount::text as amount, t."createdAt"::text as created,
           t."providerRef", t."providerStatus", t."payoutRail", t.msisdn, t.description,
           u.id as uid, u."phoneE164", u.email, u."displayName" as name, u.role,
           w.balance::text as balance, w.pending::text as pending, w.hold::text as hold,
           round(extract(epoch from (now() - t."createdAt"))/3600.0, 1) as age_hours
      from "Transaction" t
      join "User" u on u.id = t."userId"
      join "Wallet" w on w."userId" = u.id
     where t.type='WITHDRAWAL' and t.status in ('PENDING','PROCESSING','AML_REVIEW')
     order by t."createdAt"`);
  for (const r of stuck) {
    console.log(`  txn=${r.id}`);
    console.log(`    status=${r.status} amount=${r.amount} age=${r.age_hours}h created=${r.created}`);
    console.log(`    rail=${r.payoutRail ?? "null"} providerRef=${r.providerRef ?? "null"} providerStatus=${r.providerStatus ?? "null"}`);
    console.log(`    OWNER: ${r.uid}  phone=${r.phoneE164}  email=${r.email ?? "-"}  name=${r.name ?? "-"}  role=${r.role}`);
    console.log(`    WALLET NOW: balance=${r.balance} pending=${r.pending} hold=${r.hold}`);
    console.log(`    msisdn=${r.msisdn ?? "-"} desc=${r.description ?? "-"}`);
  }

  // ---- 2. did the FAILED withdrawals give the money back? -----------------------
  // A withdrawal debits on request. If it FAILS, a reversing credit must exist.
  // Statuses REVERSED/CANCELLED are the bookkeeping; the ARITHMETIC is the proof.
  console.log("\n=== FAILED WITHDRAWALS — WAS THE MONEY RETURNED? ===");
  const failed = await q(c, `
    select t.id, t."userId", t.amount::text as amount, t.status, t."createdAt"::text as created,
           u."phoneE164"
      from "Transaction" t join "User" u on u.id=t."userId"
     where t.type='WITHDRAWAL' and t.status='FAILED' order by t."createdAt"`);
  console.log(`FAILED withdrawal rows: ${failed.length}`);

  // For every user who has a FAILED withdrawal, recompute the wallet from the ledger.
  const users = [...new Set(failed.map((f) => f.userId).concat(stuck.map((s) => s.uid)))];
  console.log(`\n=== LEDGER RECONCILIATION for ${users.length} affected users ===`);
  console.log("(sum of CONFIRMED ledger amounts vs the wallet balance the player sees)");
  for (const uid of users) {
    const [row] = await q(c, `
      select u."phoneE164", w.balance::text as balance,
             coalesce(sum(t.amount) filter (where t.status='CONFIRMED'),0)::text as ledger_confirmed,
             count(*) filter (where t.status='FAILED' and t.type='WITHDRAWAL')::int as failed_wd
        from "User" u
        join "Wallet" w on w."userId"=u.id
        left join "Transaction" t on t."userId"=u.id
       where u.id=$1
       group by u."phoneE164", w.balance`, [uid]);
    const drift = (Number(row.balance) - Number(row.ledger_confirmed)).toFixed(2);
    const flag = Math.abs(Number(drift)) > 0.005 ? "🔴 DRIFT" : "✅";
    console.log(`  ${flag} ${uid} ${row.phoneE164}  wallet=${row.balance}  ledgerCONFIRMED=${row.ledger_confirmed}  drift=${drift}  failedWd=${row.failed_wd}`);
  }

  // ---- 3. is this user a QA persona? --------------------------------------------
  console.log("\n=== QA PERSONA CHECK (campaign personas are 71200010x) ===");
  const personas = await q(c, `
    select id, "phoneE164", email, "displayName" as name, role, "createdAt"::text as created
      from "User" where "phoneE164" like '+2557120001%' order by "phoneE164"`);
  personas.forEach((p) => console.log(`  ${p.phoneE164}  ${p.id}  ${p.email ?? "-"}  role=${p.role}`));

  await c.end();
})().catch((e) => { console.error("PROBE FAILED:", e.message); process.exit(1); });
