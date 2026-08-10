#!/usr/bin/env node
/** e134-count.cjs — the needs-review row count on production, with its recent rate. */
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require(path.join(process.env.KP_REPO || "F:/kipindi-main", "node_modules", "pg"));
for (const line of fs.readFileSync(path.join(__dirname, ".env"), "utf8").split("\n")) {
  const i = line.indexOf("="); if (i > 0) process.env[line.slice(0, i)] = line.slice(i + 1).trim();
}
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const [r] = (await c.query(`
    select count(*)::int as total,
           count(*) filter (where "createdAt" > now() - interval '60 minutes')::int as last_60m,
           count(*) filter (where "createdAt" > now() - interval '15 minutes')::int as last_15m,
           max("createdAt")::text as newest
      from "AuditLog" where action='payments.reconcile_needs_review'`)).rows;
  const [s] = (await c.query(`
    select count(*) filter (where "createdAt" > now() - interval '15 minutes')::int as sweeps_15m
      from "AuditLog" where action='payments.reconcile_sweep'`)).rows;
  const [n] = (await c.query(`select now()::text as t`)).rows;
  console.log(`server_now      ${n.t}`);
  console.log(`needs_review    total=${r.total}  last60m=${r.last_60m}  last15m=${r.last_15m}`);
  console.log(`newest row      ${r.newest}`);
  console.log(`reconcile_sweep last15m=${s.sweeps_15m}   <- the sweep IS running; needs_review should stay flat beside it`);
  await c.end();
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
