#!/usr/bin/env node
/**
 * e134-timeline.cjs — did the flood stop, and is the window even readable?
 *
 * ⚠️ I RETURNED THE STUCK PAYOUT IN THE MIDDLE OF MY OWN MEASUREMENT. `reconcile_sweep`
 * only writes `if (stale.length)`, so with zero stale rows BOTH counters go quiet — and a
 * silent `needs_review` then proves nothing about the fix. This prints the timeline so the
 * confounded part is visible instead of being read as success.
 */
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require(path.join(process.env.KP_REPO || path.resolve(__dirname, "..", "..", ".."), "node_modules", "pg"));
for (const line of fs.readFileSync(path.join(__dirname, ".env"), "utf8").split("\n")) {
  const i = line.indexOf("="); if (i > 0) process.env[line.slice(0, i)] = line.slice(i + 1).trim();
}
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  const q = (sql) => c.query(sql).then((r) => r.rows);

  console.log("=== when was the payout reversed? (the confound) ===");
  (await q(`select "createdAt"::text as t, action from "AuditLog"
             where action in ('payments.payout_reversed','payments.payout_reverse_refused')
             order by "createdAt" desc limit 3`)).forEach((r) => console.log(`  ${r.t}  ${r.action}`));

  console.log("\n=== last 12 needs_review rows ===");
  (await q(`select "createdAt"::text as t from "AuditLog" where action='payments.reconcile_needs_review'
             order by "createdAt" desc limit 12`)).forEach((r) => console.log(`  ${r.t}`));

  console.log("\n=== last 12 reconcile_sweep rows (writes ONLY when something is stale) ===");
  (await q(`select "createdAt"::text as t from "AuditLog" where action='payments.reconcile_sweep'
             order by "createdAt" desc limit 12`)).forEach((r) => console.log(`  ${r.t}`));

  console.log("\n=== per-minute pairing over the last 2h ===");
  (await q(`
    select to_char(date_trunc('minute',"createdAt"),'HH24:MI') as m,
           count(*) filter (where action='payments.reconcile_sweep')::int as sweeps,
           count(*) filter (where action='payments.reconcile_needs_review')::int as announces
      from "AuditLog"
     where action in ('payments.reconcile_sweep','payments.reconcile_needs_review')
       and "createdAt" > now() - interval '2 hours'
     group by 1 order by 1 desc limit 30`))
    .forEach((r) => console.log(`  ${r.m}  sweeps=${r.sweeps}  announces=${r.announces}${r.sweeps > 0 && r.announces === 0 ? "   <- sweep ran, said nothing" : ""}`));

  await c.end();
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
