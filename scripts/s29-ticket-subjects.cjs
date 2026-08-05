/**
 * WHICH FLEET PLAYER CAN PROVE E-101, AND ON WHICH TICKET?
 *
 * A live drive needs a real transaction that carries a `positionId`, on an account we can sign
 * into. It must find BOTH product lines if they exist — the whole finding is that the two go to
 * different places, so proving one proves half.
 */
const { Client } = require("pg");
const url = (process.env.DATABASE_URL || "")
  .replace(/@postgres\.railway\.internal(:\d+)?/, "@turntable.proxy.rlwy.net:40357");

(async () => {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();

  const rows = (await c.query(`
    select u."phoneE164" as phone,
           u."displayName"                                as name,
           m."productLine"                                as line,
           p."id"                                         as position_id,
           p."status",
           p."stake"::text                                as stake,
           t."id"                                         as txn_id,
           t."type"                                       as txn_type,
           r."id"                                         as round_id,
           m."id"                                         as market_id
      from "Transaction" t
      join "Position" p          on p."id" = t."positionId"
      join "PredictionMarket" m  on m."id" = p."marketId"
      join "User" u              on u."id" = p."userId"
 left join "UpDownRound" r       on r."marketId" = m."id"
     where u."phoneE164" like any (array['+2557990000%','+255712000%'])
       and t."positionId" is not null
     order by m."productLine", t."createdAt" desc
  `)).rows;

  if (!rows.length) { console.log("no fleet transaction carries a positionId — nothing to drive"); await c.end(); return; }

  const byLine = new Map();
  for (const r of rows) if (!byLine.has(r.line)) byLine.set(r.line, r);

  console.log(`${rows.length} fleet transactions carry a position id.\n`);
  console.log("── one subject per product line (what the drive should use) ──");
  for (const [line, r] of byLine) {
    const dest = line === "UPDOWN"
      ? (r.round_id ? `/updown/${r.round_id}#${r.position_id}` : `/updown/history#${r.position_id}`)
      : `/markets/${r.market_id}#${r.position_id}`;
    console.log(`   ${line.padEnd(7)} ${r.phone}  ${String(r.name).padEnd(13)} txn ${r.txn_type.padEnd(11)} ${r.position_id}  ${r.status}`);
    console.log(`             expected destination: ${dest}`);
  }

  console.log("\n── every distinct fleet account with a ticket, and how many ──");
  const per = new Map();
  for (const r of rows) per.set(r.phone, (per.get(r.phone) ?? 0) + 1);
  for (const [phone, n] of [...per].sort()) console.log(`   ${phone}  ${n}`);

  await c.end();
})().catch((e) => { console.error("ERROR", e.message); process.exit(1); });
