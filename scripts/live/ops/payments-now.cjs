#!/usr/bin/env node
/** payments-now.cjs — what has the payout rail actually done since withdrawals reopened? */
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require(path.join(process.env.KP_REPO || path.resolve(__dirname, "..", "..", ".."), "node_modules", "pg"));
for (const line of fs.readFileSync(path.join(__dirname, ".env"), "utf8").split("\n")) {
  const i = line.indexOf("="); if (i > 0) process.env[line.slice(0, i)] = line.slice(i + 1).trim();
}
const q = (c, s, p) => c.query(s, p).then((r) => r.rows);

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const [{ t }] = await q(c, `select now()::text as t`);
  console.log(`server_now ${t}\n`);

  console.log("=== WITHDRAWALS since the reopen (08:10 UTC today) ===");
  const wd = await q(c, `
    select t.id, t.status, t.amount::text as amount, t."payoutRail", t."providerRef", t."providerStatus",
           t."createdAt"::text as created, u."phoneE164"
      from "Transaction" t join "User" u on u.id=t."userId"
     where t.type='WITHDRAWAL' and t."createdAt" > timestamp '2026-08-10 08:10:00'
     order by t."createdAt"`);
  if (!wd.length) console.log("  (none yet — nobody has requested a withdrawal since it reopened)");
  wd.forEach((r) => console.log(`  ${r.created}  ${r.status.padEnd(11)} ${String(r.amount).padStart(10)}  ${r.phoneE164}  rail=${r.payoutRail ?? "-"} ref=${r.providerRef ?? "-"} provStatus=${r.providerStatus ?? "-"}`));

  console.log("\n=== CASHOUTS (early exit from a position) — last 24h ===");
  const co = await q(c, `
    select t.id, t.status, t.amount::text as amount, t."createdAt"::text as created, u."phoneE164"
      from "Transaction" t join "User" u on u.id=t."userId"
     where t.type='CASHOUT' and t."createdAt" > now() - interval '24 hours'
     order by t."createdAt" desc limit 20`);
  console.log(`  ${co.length} cashout(s) in 24h`);
  co.forEach((r) => console.log(`  ${r.created}  ${r.status.padEnd(11)} ${String(r.amount).padStart(10)}  ${r.phoneE164}`));

  console.log("\n=== ALL money movements, last 24h, by type+status ===");
  const all = await q(c, `
    select type, status, count(*)::int as n, sum(amount)::text as total
      from "Transaction" where "createdAt" > now() - interval '24 hours'
     group by type, status order by type, status`);
  all.forEach((r) => console.log(`  ${r.type.padEnd(18)} ${r.status.padEnd(11)} n=${String(r.n).padStart(4)} total=${r.total}`));

  console.log("\n=== CASHED_OUT positions, last 24h ===");
  const cp = await q(c, `
    select count(*)::int as n, coalesce(sum(p."finalPayout"),0)::text as paid
      from "Position" p where p.status='CASHED_OUT' and p."settledAt" > now() - interval '24 hours'`);
  console.log(`  ${cp[0].n} position(s) cashed out, total paid ${cp[0].paid}`);

  console.log("\n=== payout status inputs RIGHT NOW ===");
  const stuck = await q(c, `
    select count(*)::int as n from "Transaction"
     where type='WITHDRAWAL' and status in ('PENDING','PROCESSING')`);
  console.log(`  stuck withdrawals: ${stuck[0].n}  -> derived status: ${stuck[0].n === 0 ? "operational" : "delayed/unavailable"}`);

  await c.end();
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
