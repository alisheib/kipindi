/**
 * WHAT IS ON THE BOARD RIGHT NOW — read from the DB, never from a page.
 *
 * ⛔ `UpDownChain.state` and the audit log are the only board facts worth trusting; the
 * handoff's description of a board goes stale the moment another operator touches it, and
 * two operators are on this one.
 */
const { Client } = require("pg");
const url = (process.env.DATABASE_URL || "")
  .replace(/@postgres\.railway\.internal(:\d+)?/, "@turntable.proxy.rlwy.net:40357");

(async () => {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();

  console.log("── server clock ──");
  console.log("   now(): " + (await c.query(`select now()::text as t`)).rows[0].t);

  console.log("\n── assets (key CASING matters: feedHistoryFor is keyed on it) ──");
  for (const r of (await c.query(`select id, "key", "nameEn", enabled from "UpDownAsset" order by "key"`)).rows)
    console.log(`   ${String(r.key).padEnd(6)} ${r.enabled ? "enabled " : "disabled"} ${r.id}  ${r.nameEn}`);

  console.log("\n── chains ──");
  for (const r of (await c.query(`
     select ch.id, a."key" as asset, ch."durationMinutes" as mins, ch.state,
            ch."createdAt"::text as created,
            (select count(*) from "UpDownRound" r where r."chainId" = ch.id) as rounds
       from "UpDownChain" ch join "UpDownAsset" a on a.id = ch."assetId"
      order by ch."createdAt"`)).rows)
    console.log(`   ${r.id}  ${String(r.asset).padEnd(4)} ${String(r.mins).padStart(3)}m  ${String(r.state).padEnd(8)} rounds ${String(r.rounds).padStart(4)}  created ${r.created}`);

  console.log("\n── the last 12 rounds, newest first ──");
  for (const r of (await c.query(`
     select r.id, a."key" as asset, ch."durationMinutes" as mins,
            r."opensAt"::text as opens, r."closesAt"::text as closes,
            r.outcome, r."settledAt"::text as settled,
            r."openPrice", r."closePrice"
       from "UpDownRound" r
       join "UpDownChain" ch on ch.id = r."chainId"
       join "UpDownAsset" a on a.id = ch."assetId"
      order by r."closesAt" desc limit 12`)).rows)
    console.log(`   ${r.id}  ${String(r.asset).padEnd(4)}${String(r.mins).padStart(3)}m  closes ${r.closes.slice(0, 19)}  ${String(r.outcome ?? "—").padEnd(5)} ${r.settled ? "settled" : "UNSETTLED"}`);

  console.log("\n── rounds past their close with NO outcome (the `confirming` state) ──");
  const conf = (await c.query(`
     select r.id, a."key" as asset, r."closesAt"::text as closes,
            extract(epoch from (now() - r."closesAt")) as age_s
       from "UpDownRound" r
       join "UpDownChain" ch on ch.id = r."chainId"
       join "UpDownAsset" a on a.id = ch."assetId"
      where r.outcome is null and r."closesAt" <= now()
      order by r."closesAt" desc limit 10`)).rows;
  if (!conf.length) console.log("   (none)");
  for (const r of conf) console.log(`   ${r.id}  ${r.asset}  closed ${r.closes.slice(0, 19)}  ${Math.round(r.age_s)}s ago`);

  await c.end();
})().catch((e) => { console.error("ERROR", e.message); process.exit(1); });
