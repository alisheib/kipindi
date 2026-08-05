/**
 * What does `feedHistoryFor` ACTUALLY return for BTC — the number E-99's clock counts to?
 *
 * ⛔ Read with the SAME SQL the product uses, not a hand-written approximation. The whole point
 * is to see the value the code sees.
 */
const { Client } = require("pg");
const url = (process.env.DATABASE_URL || "")
  .replace(/@postgres\.railway\.internal(:\d+)?/, "@turntable.proxy.rlwy.net:40357");

(async () => {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();

  console.log("\n── the median the product computes, per asset ──");
  for (const r of (await c.query(`
    select a.key,
           count(*)                                                        as readings,
           count(*) filter (where o."state" = 'CONFIRMED')                 as confirmed,
           percentile_disc(0.5) within group (
             order by extract(epoch from (o."confirmedAt" - o."boundaryAt"))
           ) filter (where o."state" = 'CONFIRMED')                        as median_lag_s,
           max(extract(epoch from (o."confirmedAt" - o."boundaryAt")))
             filter (where o."state" = 'CONFIRMED')                        as max_lag_s
      from "UpDownObservation" o join "UpDownAsset" a on a.id = o."assetId"
     group by a.key order by a.key`)).rows)
    console.log(`   ${String(r.key).padEnd(5)} readings ${String(r.readings).padStart(4)} · confirmed ${String(r.confirmed).padStart(4)} · median ${String(r.median_lag_s).padStart(6)}s · max ${r.max_lag_s}s`);

  // ⭐ THE HYPOTHESIS: an observation taken to OPEN a round is read at once (lag ~0), while the
  // one that CLOSES a round waits for its dated bar (~92s). Both live in the same table, so a
  // median over ALL of them is not "how long after a boundary does its bar arrive".
  console.log("\n── split by how the observation was USED ──");
  for (const r of (await c.query(`
    select case
             when exists (select 1 from "UpDownRound" r where r."openObservationId"  = o.id) then 'opened a round'
             when exists (select 1 from "UpDownRound" r where r."closeObservationId" = o.id) then 'closed a round'
             else 'unused'
           end as role,
           count(*) as n,
           percentile_disc(0.5) within group (order by extract(epoch from (o."confirmedAt" - o."boundaryAt"))) as median_lag_s,
           min(extract(epoch from (o."confirmedAt" - o."boundaryAt"))) as min_lag_s,
           max(extract(epoch from (o."confirmedAt" - o."boundaryAt"))) as max_lag_s
      from "UpDownObservation" o
     where o."state" = 'CONFIRMED'
     group by 1 order by 1`)).rows)
    console.log(`   ${String(r.role).padEnd(16)} n=${String(r.n).padStart(4)}  median ${String(r.median_lag_s).padStart(6)}s  min ${String(r.min_lag_s).padStart(6)}s  max ${r.max_lag_s}s`);

  await c.end();
})().catch((e) => { console.error("ERROR", e.message); process.exit(1); });
