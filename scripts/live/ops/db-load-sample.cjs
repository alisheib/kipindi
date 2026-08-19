#!/usr/bin/env node
/**
 * db-load-sample.cjs — READ-ONLY. Transactions per second against the LIVE database,
 * sampled over a window, from `pg_stat_database`.
 *
 *   node scripts/live/ops/db-load-sample.cjs [seconds]
 *
 * ⭐ WHY THIS EXISTS (2026-08-14). `armChain` re-arms a fired chain with `minDelayMs: 0`,
 * and computes `delay = 0` whenever the boundary is already in the past — which it always
 * is on the two paths that decline to advance (a price bar that has not published yet, and
 * a market-hours closure). So the scheduler BUSY-WAITS: fire → decline → re-arm at 0ms →
 * fire, as fast as the database answers, for the whole ~90–130s a bar takes to appear, on
 * every boundary of every chain.
 *
 * ⛔ THE LOG LINES ONLY SHOW HALF OF IT. `fireChain` logs only when the observation reads
 * `pending`, so the session-closed spin (the stalled Gold chains, pinned since 2026-08-10)
 * turns the same loop with NO log line at all. Counting transactions is what sees both.
 *
 * ⚠️ This measures the WHOLE database, so it includes player traffic and every other chore.
 * It is a before/after instrument, not an attribution: read it either side of a deploy, with
 * the round-opening cadence unchanged, and the delta is the spin.
 */
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require(path.join(process.env.KP_REPO || path.resolve(__dirname, "..", "..", ".."), "node_modules", "pg"));

for (const line of fs.readFileSync(path.join(__dirname, ".env"), "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i > 0) process.env[line.slice(0, i)] = line.slice(i + 1).trim();
}

const SECONDS = Number(process.argv[2] || 30);

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const read = async () => (await c.query(
    `select now() as t, xact_commit, xact_rollback, tup_returned, tup_fetched, tup_updated, tup_inserted
       from pg_stat_database where datname = current_database()`)).rows[0];

  const a = await read();
  console.log(`sampling ${SECONDS}s from ${new Date(a.t).toISOString()} …`);
  await new Promise((r) => setTimeout(r, SECONDS * 1000));
  const b = await read();

  const dt = (Date.parse(b.t) - Date.parse(a.t)) / 1000;
  const per = (k) => ((Number(b[k]) - Number(a[k])) / dt);
  console.log(`window ${dt.toFixed(1)}s`);
  console.log(`  commits/sec      ${per("xact_commit").toFixed(1)}`);
  console.log(`  rollbacks/sec    ${per("xact_rollback").toFixed(1)}`);
  console.log(`  rows returned/s  ${per("tup_returned").toFixed(0)}`);
  console.log(`  rows fetched/s   ${per("tup_fetched").toFixed(0)}`);
  console.log(`  rows inserted/s  ${per("tup_inserted").toFixed(1)}`);
  console.log(`  rows updated/s   ${per("tup_updated").toFixed(1)}`);
  await c.end();
})().catch((e) => { console.error(e); process.exit(2); });
