#!/usr/bin/env node
/**
 * chain-by-id.cjs — READ-ONLY. Everything about ONE Up & Down chain: its row, its asset, its
 * last rounds and its last observations. The follow-up to `chain-stall-census.cjs` once that
 * has named a chain worth looking at.
 *
 *   KP_REPO=F:/kipindi-main node scripts/live/ops/chain-by-id.cjs udc_xxxxxxxx
 *
 * 🔴 EVERY TIMESTAMP IS `::text`. Prisma maps `DateTime` to `timestamp` WITHOUT time zone and
 * node-postgres parses a naive timestamp in the CLIENT's zone — on a laptop in EAT that is a
 * silent three-hour shift, which is exactly how the first read of this outage concluded the
 * whole platform had stopped. See the header of `chain-stall-census.cjs`.
 *
 * ⚠️ `UpDownRound` has no `status` column — a round's state is `outcome` + `resolvedAt` +
 * `settledAt`, and asking for `status` is an error, not an empty column.
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
  const id = process.argv[2];
  if (!id) { console.error("usage: chain-by-id.cjs <chainId>"); process.exit(2); }
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  console.log("server now (UTC):", (await q(c, `select (now() at time zone 'utc')::text as t`))[0].t);

  console.log("\n--- chain ---");
  console.table(await q(c, `
    select ch.id, a.symbol, a.category, ch."durationMinutes" as dur, ch.state,
           ch."nextBoundaryAt"::text as next_boundary, ch."gridAnchorAt"::text as grid_anchor,
           ch."currentRoundId" as current_round, ch."updatedAt"::text as updated
      from "UpDownChain" ch join "UpDownAsset" a on a.id = ch."assetId" where ch.id = $1`, [id]));

  console.log("\n--- last 8 rounds ---");
  console.table(await q(c, `
    select "roundNumber" as n, "boundaryAt"::text as boundary, "opensAt"::text as opens,
           "closesAt"::text as closes, outcome, "voidReason" as void_reason,
           "resolvedAt"::text as resolved, "settledAt"::text as settled
      from "UpDownRound" where "chainId" = $1 order by "boundaryAt" desc limit 8`, [id]));

  console.log("\n--- last 8 observations for this chain's asset ---");
  console.table(await q(c, `
    select o."boundaryAt"::text as boundary, o.state, o.price, o.attempts,
           o."lastAttemptAt"::text as last_attempt, left(coalesce(o."failReason", ''), 70) as fail_reason
      from "UpDownObservation" o join "UpDownChain" ch on ch."assetId" = o."assetId"
     where ch.id = $1 order by o."boundaryAt" desc limit 8`, [id]));

  await c.end();
})().catch((e) => { console.error(e); process.exit(2); });
