#!/usr/bin/env node
/**
 * rates-census.cjs — READ-ONLY. What the LIVE platform actually charges, and where.
 *
 *   node scripts/live/ops/rates-census.cjs
 *
 * ⛔ A CODE DEFAULT IS NOT A LIVE SETTING. Every number below is read from the persisted
 * SystemConfig rows and from the per-chain / per-market frozen snapshots — never from a
 * constant in the source. That distinction has already cost this project a session.
 *
 * ⛔ AND A SNAPSHOT IS NOT A CONFIG. A market freezes its rates at creation and settles by
 * them forever, so changing config cannot reprice a bet already placed. This prints both,
 * separately, and counts how many rows are frozen at each model — the number that says how
 * much history a rate change does NOT touch.
 *
 * Cross-check `users` / `marketsLive` against https://www.50pick.tz/api/health before
 * believing any of it: three matching numbers is what proves you read production.
 */
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require(path.join(process.env.KP_REPO || path.resolve(__dirname, "..", "..", ".."), "node_modules", "pg"));

for (const line of fs.readFileSync(path.join(__dirname, ".env"), "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i > 0) process.env[line.slice(0, i)] = line.slice(i + 1).trim();
}

const q = (c, sql, params) => c.query(sql, params).then((r) => r.rows);
const pct = (v) => (v == null ? "—" : `${(Number(v) * 100).toFixed(2)}%`);

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  const [meta] = await q(c, `select current_database() as db, inet_server_addr()::text as addr, now()::text as server_now`);
  const [n] = await q(c, `
    select (select count(*) from "User")::int as users,
           (select count(*) from "PredictionMarket" where status='LIVE')::int as live,
           (select count(*) from "PredictionMarket" where status='RESOLVED')::int as resolved`);
  console.log("=== IDENTITY ===");
  console.log(`db=${meta.db} server=${meta.addr} server_now=${meta.server_now}`);
  console.log(`users=${n.users}  marketsLive=${n.live}  marketsResolved=${n.resolved}`);
  console.log("⭐ cross-check against https://www.50pick.tz/api/health\n");

  // ---- 1. the two persisted config rows ----------------------------------------
  const cfgs = await q(c, `select key, value, "updatedAt"::text as at from "SystemConfig" where key in ('market.config','updown.config') order by key`);
  for (const row of cfgs) {
    const v = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
    console.log(`=== SystemConfig["${row.key}"]   (updated ${row.at}) ===`);
    if (row.key === "market.config") {
      const g = v.global ?? v;
      console.log(`  feeModel              ${g.feeModel}`);
      console.log(`  platformFeeRate       ${pct(g.platformFeeRate)}`);
      console.log(`  operatorFeeRate       ${pct(g.operatorFeeRate)}`);
      console.log(`  → loser-share total   ${pct((g.platformFeeRate ?? 0) + (g.operatorFeeRate ?? 0))}`);
      console.log(`  commissionRate        ${pct(g.commissionRate)}   (capped-commission only)`);
      console.log(`  feeCeilingRate        ${pct(g.feeCeilingRate)}   (capped-commission only)`);
      console.log(`  minStake              ${g.minStake}`);
      console.log(`  maxStake              ${g.maxStake}`);
      console.log(`  withdrawalFeeRate     ${pct(g.withdrawalFeeRate)}`);
      console.log(`  withdrawalGatewayShareRate ${pct(g.withdrawalGatewayShareRate)}`);
      console.log(`  freeExitGraceMinutes  ${g.freeExitGraceMinutes}   paidExitWindowMinutes ${g.paidExitWindowMinutes}`);
      console.log(`  cashOutFeeRate        ${pct(g.cashOutFeeRate)}`);
      console.log(`  traTaxOnCommissionRate ${pct(g.traTaxOnCommissionRate)}  gbtLevyOnCommissionRate ${pct(g.gbtLevyOnCommissionRate)}`);
      console.log(`  estimatedWinningsRate ${g.estimatedWinningsRate}  showEstimatedWinnings ${g.showEstimatedWinnings}`);
      console.log(`  version               ${v.version ?? "(none)"}`);
      if (v.perMarket && Object.keys(v.perMarket).length) console.log(`  ⚠️ perMarket overrides: ${Object.keys(v.perMarket).length}`);
    } else {
      const p = v.defaultRateProfile ?? {};
      console.log(`  defaultMinStake       ${v.defaultMinStake}`);
      console.log(`  defaultMaxStake       ${v.defaultMaxStake}`);
      console.log(`  defaultRateProfile.feeModel        ${p.feeModel}`);
      console.log(`  defaultRateProfile.commissionRate  ${pct(p.commissionRate)}`);
      console.log(`  defaultRateProfile.feeCeilingRate  ${pct(p.feeCeilingRate)}`);
      console.log(`  defaultRateProfile.platformFeeRate ${pct(p.platformFeeRate)}`);
      console.log(`  defaultRateProfile.operatorFeeRate ${pct(p.operatorFeeRate)}`);
      console.log(`  version               ${v.version ?? "(none)"}`);
    }
    console.log("");
  }
  if (cfgs.length !== 2) console.log(`⚠️ expected 2 config rows, found ${cfgs.length}\n`);

  // ---- 2. the 16 chains, which carry their OWN copy and do NOT inherit ---------
  // ⚠️ UpDownChain has no `symbol` and no `status`: the ticker lives on the joined
  // UpDownAsset and the lifecycle column is `state`. Guessing a column name is how a
  // census turns into a crash — or worse, joins the wrong thing and reports confidently.
  const chains = await q(c, `
    select ch.id, a.symbol, ch."durationMinutes", ch.state,
           ch."minStake"::text as min_stake, ch."maxStake"::text as max_stake, ch."rateProfile"
      from "UpDownChain" ch join "UpDownAsset" a on a.id = ch."assetId"
     order by a.symbol, ch."durationMinutes"`);
  console.log(`=== UpDownChain · ${chains.length} row(s) — each carries its OWN rateProfile ===`);
  const byModel = {};
  for (const ch of chains) {
    const p = typeof ch.rateProfile === "string" ? JSON.parse(ch.rateProfile) : (ch.rateProfile ?? {});
    const model = p.feeModel ?? "(inherit)";
    byModel[model] = (byModel[model] ?? 0) + 1;
    console.log(`  ${ch.symbol.padEnd(6)} ${String(ch.durationMinutes).padStart(3)}m ${ch.state.padEnd(8)} ` +
      `model=${String(model).padEnd(18)} comm=${pct(p.commissionRate)} ceil=${pct(p.feeCeilingRate)} ` +
      `plat=${pct(p.platformFeeRate)} oper=${pct(p.operatorFeeRate)} min=${ch.min_stake ?? "NULL"} max=${ch.max_stake ?? "NULL"}`);
  }
  console.log(`  → by model: ${JSON.stringify(byModel)}`);
  const nullStakes = chains.filter((ch) => ch.min_stake == null && ch.max_stake == null).length;
  console.log(`  → ${nullStakes}/${chains.length} chains have NULL min/max and therefore INHERIT the config bounds\n`);

  // ---- 3. FROZEN HISTORY — how much a rate change does NOT touch ---------------
  const frozen = await q(c, `
    select "productLine",
           coalesce("feeSnapshot"->>'feeModel','(none)') as model,
           count(*)::int as n,
           min("createdAt")::text as first_at,
           max("createdAt")::text as last_at
      from "PredictionMarket"
     group by 1,2 order by 1,3 desc`);
  console.log(`=== FROZEN feeSnapshot BY PRODUCT (⛔ never rewritten, never migrated) ===`);
  for (const r of frozen) {
    console.log(`  ${String(r.productLine).padEnd(8)} ${r.model.padEnd(20)} ${String(r.n).padStart(6)}   ${r.first_at.slice(0, 16)} → ${r.last_at.slice(0, 16)}`);
  }

  const rates = await q(c, `
    select coalesce("feeSnapshot"->>'feeModel','(none)') as model,
           coalesce("feeSnapshot"->>'commissionRate','—')  as comm,
           coalesce("feeSnapshot"->>'feeCeilingRate','—')  as ceil,
           coalesce("feeSnapshot"->>'platformFeeRate','—') as plat,
           coalesce("feeSnapshot"->>'operatorFeeRate','—') as oper,
           "productLine", count(*)::int as n
      from "PredictionMarket" group by 1,2,3,4,5,6 order by n desc`);
  console.log(`\n=== THE DISTINCT FROZEN RATE SETS ===`);
  for (const r of rates) {
    console.log(`  ${String(r.n).padStart(6)} × ${String(r.productLine).padEnd(8)} ${r.model.padEnd(20)} comm=${r.comm} ceil=${r.ceil} plat=${r.plat} oper=${r.oper}`);
  }

  // ---- 4. LIVE rows a change WOULD reach, and rows it would not ----------------
  const openNow = await q(c, `
    select "productLine", status, coalesce("feeSnapshot"->>'feeModel','(none)') as model, count(*)::int as n
      from "PredictionMarket" where status in ('LIVE','CLOSED','DRAFT')
     group by 1,2,3 order by 1,2`);
  console.log(`\n=== STILL OPEN (these keep whatever they already froze) ===`);
  for (const r of openNow) console.log(`  ${String(r.productLine).padEnd(8)} ${r.status.padEnd(7)} ${r.model.padEnd(20)} ${r.n}`);

  await c.end();
})().catch((e) => { console.error(e); process.exit(1); });
