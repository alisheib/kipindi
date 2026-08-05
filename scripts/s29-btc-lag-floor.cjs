/**
 * E-99 · THE FLOOR THAT MAKES THE `—:—` READING IMPOSSIBLE.
 *
 * `resultClock` shows `—:—` only when the measured target has ALREADY PASSED. So a `—:—` two
 * seconds after a boundary requires BTC's median lag to be under two seconds. This prints the
 * MINIMUM lag BTC has ever recorded — if that floor is far above 2s, the reading §6av recorded
 * could not have come from the countdown pod, and the transcript needs re-reading rather than
 * the product needing a fix.
 */
const { Client } = require("pg");
const url = (process.env.DATABASE_URL || "")
  .replace(/@postgres\.railway\.internal(:\d+)?/, "@turntable.proxy.rlwy.net:40357");

(async () => {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const q = `
    select a."key" as key,
           count(*)                                                          as n,
           min(extract(epoch from (o."confirmedAt" - o."boundaryAt")))        as min_s,
           percentile_disc(0.5) within group (
             order by extract(epoch from (o."confirmedAt" - o."boundaryAt"))) as median_s,
           max(extract(epoch from (o."confirmedAt" - o."boundaryAt")))        as max_s
      from "UpDownObservation" o join "UpDownAsset" a on a.id = o."assetId"
     where o."state" = 'CONFIRMED'
     group by a."key" order by a."key"`;
  for (const r of (await c.query(q)).rows)
    console.log(`   ${String(r.key).padEnd(4)} confirmed ${String(r.n).padStart(4)}  min ${String(r.min_s).padStart(8)}s  median ${String(r.median_s).padStart(8)}s  max ${r.max_s}s`);
  await c.end();
})().catch((e) => { console.error("ERROR", e.message); process.exit(1); });
