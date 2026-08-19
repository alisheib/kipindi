#!/usr/bin/env node
/**
 * e63-window.cjs — is E-63 a LIVE regression, or is the guard failing on dead history?
 *
 * ops-updown-open-guard.mjs counts EVERY 'updown.round.opened' audit row ever written,
 * with no time window and no join to a round that still exists. The board was cleared of
 * ~2,515 rounds on 2026-08-04; their audit rows survived the deletion. So an all-time
 * count can never return to zero once a bad era exists — the guard would fail forever
 * on a product that was fixed.
 *
 * The honest question is: are rounds opened RECENTLY still priceless?
 */
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require(path.join(process.env.KP_REPO || path.resolve(__dirname, "..", "..", ".."), "node_modules", "pg"));

for (const line of fs.readFileSync(path.join(__dirname, ".env"), "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i > 0) process.env[line.slice(0, i)] = line.slice(i + 1).trim();
}
const q = (c, sql, p) => c.query(sql, p).then((r) => r.rows);

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  console.log("=== 'updown.round.opened' audit rows — priceless BY DAY ===");
  const byDay = await q(c, `
    select to_char("createdAt",'YYYY-MM-DD') as day,
           count(*)::int as total,
           count(*) filter (where payload ->> 'openPrice' is null)::int as priceless
      from "AuditLog" where action='updown.round.opened'
     group by 1 order by 1 desc limit 20`);
  byDay.forEach((r) => {
    const pct = r.total ? ((100 * r.priceless) / r.total).toFixed(0) : "0";
    const flag = r.priceless > 0 ? "🔴" : "✅";
    console.log(`  ${flag} ${r.day}  total=${String(r.total).padStart(5)}  priceless=${String(r.priceless).padStart(5)}  (${pct}%)`);
  });

  console.log("\n=== FIRST and LAST priceless open ===");
  const [span] = await q(c, `
    select min("createdAt")::text as first_seen, max("createdAt")::text as last_seen, count(*)::int as n
      from "AuditLog" where action='updown.round.opened' and payload ->> 'openPrice' is null`);
  console.log(`  n=${span.n}  first=${span.first_seen}  last=${span.last_seen}`);

  console.log("\n=== DO THOSE AUDIT ROWS STILL HAVE A ROUND? ===");
  // targetId on the audit row should be the round (or market) id.
  const [orphan] = await q(c, `
    select count(*)::int as total,
           count(*) filter (where not exists (select 1 from "UpDownRound" r where r.id = a."targetId"))::int as no_round
      from "AuditLog" a
     where a.action='updown.round.opened' and a.payload ->> 'openPrice' is null`);
  console.log(`  priceless audit rows: ${orphan.total}`);
  console.log(`  ...whose UpDownRound no longer exists: ${orphan.no_round}`);
  console.log(`  ...still backed by a live round: ${orphan.total - orphan.no_round}`);

  console.log("\n=== OF THE SURVIVING ROUNDS, DO THEY NOW HAVE AN openPrice? (the healer's job) ===");
  const surv = await q(c, `
    select r."openPrice" is null as still_null, count(*)::int as n
      from "AuditLog" a join "UpDownRound" r on r.id = a."targetId"
     where a.action='updown.round.opened' and a.payload ->> 'openPrice' is null
     group by 1`);
  if (!surv.length) console.log("  (no surviving rounds among the priceless opens)");
  surv.forEach((r) => console.log(`  ${r.still_null ? "🔴 openPrice STILL NULL" : "✅ healed (openPrice set)"}: ${r.n}`));

  console.log("\n=== SANITY: total UpDownRound rows vs total opened-audit rows ===");
  const [n1] = await q(c, `select count(*)::int as n from "UpDownRound"`);
  const [n2] = await q(c, `select count(*)::int as n from "AuditLog" where action='updown.round.opened'`);
  console.log(`  UpDownRound rows: ${n1.n}   opened-audit rows: ${n2.n}   difference: ${n2.n - n1.n}`);

  await c.end();
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
