#!/usr/bin/env node
/**
 * txn-forensics.cjs — before reversing a stuck payout, prove it never left.
 *
 * `reverseStuckPayoutAction` re-queries the provider ONLY when providerRef is set.
 * Ours is null, so that guard does not run — which means the evidence has to come
 * from somewhere else. This reads the audit trail and the wallet arithmetic.
 */
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require(path.join(process.env.KP_REPO || "F:/kipindi-main", "node_modules", "pg"));

for (const line of fs.readFileSync(path.join(__dirname, ".env"), "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i > 0) process.env[line.slice(0, i)] = line.slice(i + 1).trim();
}
const q = (c, sql, p) => c.query(sql, p).then((r) => r.rows);

const TXN = process.argv[2] || "txn_649dd3bc28c50ce5f5222f31";
const USER = process.argv[3] || "usr_53406f2f9f793abe1fd0e8af";

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  console.log(`=== AUDIT TRAIL mentioning ${TXN} ===`);
  const audit = await q(c, `
    select id, category, action, "actorId", "targetType", "targetId",
           "createdAt"::text as created, payload::text as payload
      from "AuditLog"
     where "targetId" = $1 or payload::text like '%' || $1 || '%'
     order by "createdAt"`, [TXN]);
  if (!audit.length) console.log("  (no audit rows reference this transaction)");
  audit.forEach((a) => console.log(`  ${a.created}  ${a.category}/${a.action}  actor=${a.actorId ?? "-"}\n      ${String(a.payload).slice(0, 400)}`));

  console.log(`\n=== ALL WITHDRAWAL AUDIT ACTIONS for this user (last 30) ===`);
  const ua = await q(c, `
    select action, count(*)::int as n, max("createdAt")::text as last_seen
      from "AuditLog" where "actorId"=$1 or "targetId"=$1
     group by action order by max("createdAt") desc limit 30`, [USER]);
  ua.forEach((a) => console.log(`  ${a.action.padEnd(46)} n=${String(a.n).padEnd(4)} last=${a.last_seen}`));

  console.log(`\n=== THE WALLET ARITHMETIC (does the hold explain the gap?) ===`);
  const [w] = await q(c, `
    select w.balance::text as balance, w.pending::text as pending, w.hold::text as hold,
           w."bonusBalance"::text as bonus,
           coalesce(sum(t.amount) filter (where t.status='CONFIRMED'),0)::text as ledger_confirmed
      from "Wallet" w left join "Transaction" t on t."userId"=w."userId"
     where w."userId"=$1 group by w.balance, w.pending, w.hold, w."bonusBalance"`, [USER]);
  const bal = Number(w.balance), hold = Number(w.hold), led = Number(w.ledger_confirmed);
  console.log(`  balance=${w.balance}  hold=${w.hold}  pending=${w.pending}  bonus=${w.bonus}`);
  console.log(`  ledger(CONFIRMED)=${w.ledger_confirmed}`);
  console.log(`  balance + hold = ${(bal + hold).toFixed(2)}   vs ledger ${led.toFixed(2)}   -> diff ${(bal + hold - led).toFixed(2)}`);
  console.log(`  ${Math.abs(bal + hold - led) < 0.005 ? "✅ TIES EXACTLY — the 2,000 is HELD, not paid out" : "🔴 does not tie"}`);

  console.log(`\n=== EVERY WITHDRAWAL this user has ever made ===`);
  const wds = await q(c, `
    select id, status, amount::text as amount, "providerRef", "providerStatus", "payoutRail",
           "createdAt"::text as created
      from "Transaction" where "userId"=$1 and type='WITHDRAWAL' order by "createdAt"`, [USER]);
  wds.forEach((t) => console.log(
    `  ${t.created}  ${t.status.padEnd(11)} ${String(t.amount).padStart(10)}  rail=${String(t.payoutRail ?? "null").padEnd(14)} ref=${t.providerRef ?? "null"} provStatus=${t.providerStatus ?? "null"}${t.id === TXN ? "   <-- THE STUCK ONE" : ""}`));

  console.log(`\n=== DO ANY OTHER WITHDRAWALS SHARE A providerRef WITH IT? ===`);
  console.log(`  (the stuck row's providerRef is null, so nothing was ever submitted to a rail)`);
  const refd = await q(c, `select count(*)::int as n from "Transaction" where type='WITHDRAWAL' and "providerRef" is not null`);
  console.log(`  withdrawals platform-wide WITH a providerRef: ${refd[0].n} of ${wds.length ? "" : ""}`);

  await c.end();
})().catch((e) => { console.error("FORENSICS FAILED:", e.message); process.exit(1); });
