/**
 * THE EXPECTED DESTINATION FOR EVERY TICKET A QA ACCOUNT HOLDS — computed from the DATABASE.
 *
 * ⛔ The live drive must not derive its own expectation from the page it is testing. This
 * writes `positionId -> pathname` from the schema's own relations, so the browser run compares
 * against the database rather than against itself.
 */
const { Client } = require("pg");
const { writeFileSync } = require("node:fs");
const url = (process.env.DATABASE_URL || "")
  .replace(/@postgres\.railway\.internal(:\d+)?/, "@turntable.proxy.rlwy.net:40357");
(async () => {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const rows = (await c.query(`
    select u."phoneE164" as phone, p."id" as pid, m."productLine" as line,
           m."id" as market_id, r."id" as round_id
      from "Transaction" t
      join "Position" p         on p."id" = t."positionId"
      join "PredictionMarket" m on m."id" = p."marketId"
      join "User" u             on u."id" = p."userId"
 left join "UpDownRound" r      on r."marketId" = m."id"
     where u."phoneE164" like any (array['+2557990000%','+255712000%'])`)).rows;
  const map = {};
  for (const r of rows) {
    map[r.pid] = {
      phone: r.phone, line: r.line,
      path: r.line === "UPDOWN"
        ? (r.round_id ? `/updown/${r.round_id}` : "/updown/history")
        : `/markets/${r.market_id}`,
    };
  }
  writeFileSync(".qa-s29/ticket-map.json", JSON.stringify(map, null, 1));
  console.log(`wrote ${Object.keys(map).length} expected destinations to .qa-s29/ticket-map.json`);
  await c.end();
})().catch((e) => { console.error("ERROR", e.message); process.exit(1); });
