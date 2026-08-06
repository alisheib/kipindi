/**
 * ⭐ IS THE PRICE PROVIDER ACTUALLY RETURNING DATA? — the evidence you would send them.
 *
 * Ali, 2026-08-06: *"is 12 data being reponsive with data? or not giving back? lets check
 * history. if 12 data is not giving data we can follow up with them."*
 *
 * Every reading the platform has ever taken is on `UpDownObservation` — `boundaryAt` (the grid
 * instant it is FOR), `confirmedAt` (when it became usable), `state`, `attempts`, `failReason`.
 * That is a complete, timestamped record of the provider's behaviour at no extra cost, and it
 * is the difference between "it feels flaky" and a support ticket with numbers in it.
 *
 * ⛔ TWO QUANTITIES THAT ARE NOT THE SAME, AND CONFLATING THEM WOULD BLAME THE WRONG PARTY:
 *   · a FAILED reading  — we asked and got nothing usable. That is the provider (or our
 *     request), and it is what you would raise with them.
 *   · a VOID round      — the round refunded. Most voids are the GAME'S OWN RULES firing
 *     (`no-move`: the price did not clear the band), not a feed problem. Only
 *     `source-failed` / `source-mismatch` implicate the feed.
 *
 * ⛔ Reads only.
 */
const { Client } = require("pg");
const url = (process.env.DATABASE_URL || "")
  .replace(/@postgres\.railway\.internal(:\d+)?/, "@turntable.proxy.rlwy.net:40357");

(async () => {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const q = async (sql) => (await c.query(sql)).rows;
  const pc = (a, b) => (b ? ((a / b) * 100).toFixed(1) + "%" : "—");

  console.log("═══ WHICH READER IS LIVE ═══");
  for (const r of await q(`select key, value::text from "SystemConfig" where key ilike '%feed%' or key ilike '%updown%' order by key`))
    console.log(`   ${r.key.padEnd(34)} ${String(r.value).slice(0, 80)}`);

  console.log("\n═══ 1 · EVERY READING EVER TAKEN, BY ASSET ═══");
  console.log("   asset  total  CONFIRMED   FAILED  PENDING   ok%");
  for (const r of await q(`
      select a."key" as asset, count(*) total,
             count(*) filter (where o.state='CONFIRMED') ok,
             count(*) filter (where o.state='FAILED')    bad,
             count(*) filter (where o.state='PENDING')   pend
        from "UpDownObservation" o join "UpDownAsset" a on a.id=o."assetId"
       group by 1 order by 1`))
    console.log(`   ${String(r.asset).padEnd(5)} ${String(r.total).padStart(6)} ${String(r.ok).padStart(10)} ${String(r.bad).padStart(8)} ${String(r.pend).padStart(8)}  ${pc(Number(r.ok), Number(r.total))}`);

  console.log("\n═══ 2 · WHY DID A READING FAIL? — the provider's own words ═══");
  const fails = await q(`
      select a."key" as asset, coalesce(o."failReason",'(none recorded)') as reason,
             count(*) n, max(o.attempts) max_attempts, max(o."boundaryAt")::text as latest
        from "UpDownObservation" o join "UpDownAsset" a on a.id=o."assetId"
       where o.state <> 'CONFIRMED'
       group by 1,2 order by n desc`);
  if (!fails.length) console.log("   ✅ no non-confirmed reading exists at all");
  for (const f of fails)
    console.log(`   ${String(f.asset).padEnd(5)} ${String(f.n).padStart(4)} × ${String(f.reason).slice(0, 62).padEnd(62)} attempts≤${f.max_attempts} · latest ${String(f.latest).slice(0, 16)}`);

  console.log("\n═══ 3 · HOW LATE IS THE DATA WHEN IT DOES ARRIVE? (seconds after the boundary) ═══");
  console.log("   asset      n     min     p50     p90     max   ·  attempts to get it");
  for (const r of await q(`
      select a."key" as asset, count(*) n,
             min(extract(epoch from (o."confirmedAt"-o."boundaryAt")))::int mn,
             percentile_disc(0.5) within group (order by extract(epoch from (o."confirmedAt"-o."boundaryAt")))::int p50,
             percentile_disc(0.9) within group (order by extract(epoch from (o."confirmedAt"-o."boundaryAt")))::int p90,
             max(extract(epoch from (o."confirmedAt"-o."boundaryAt")))::int mx,
             round(avg(o.attempts),2) avg_att, max(o.attempts) max_att
        from "UpDownObservation" o join "UpDownAsset" a on a.id=o."assetId"
       where o.state='CONFIRMED' group by 1 order by 1`))
    console.log(`   ${String(r.asset).padEnd(5)} ${String(r.n).padStart(5)} ${String(r.mn).padStart(7)} ${String(r.p50).padStart(7)} ${String(r.p90).padStart(7)} ${String(r.mx).padStart(7)}   ·  avg ${r.avg_att}, max ${r.max_att}`);

  console.log("\n═══ 4 · IS IT GETTING WORSE? — by day ═══");
  console.log("   day          total   ok  failed   ok%   p50 lag");
  for (const r of await q(`
      select date_trunc('day', o."boundaryAt")::date::text d, count(*) total,
             count(*) filter (where o.state='CONFIRMED') ok,
             count(*) filter (where o.state<>'CONFIRMED') bad,
             percentile_disc(0.5) within group (order by extract(epoch from (o."confirmedAt"-o."boundaryAt")))
               filter (where o.state='CONFIRMED')::int p50
        from "UpDownObservation" o group by 1 order by 1`))
    console.log(`   ${r.d}  ${String(r.total).padStart(6)} ${String(r.ok).padStart(4)} ${String(r.bad).padStart(7)}  ${pc(Number(r.ok), Number(r.total)).padStart(6)}   ${r.p50 == null ? "—" : r.p50 + "s"}`);

  console.log("\n═══ 5 · VOIDED ROUNDS — how many are the FEED, and how many are the GAME'S RULES? ═══");
  const voids = await q(`
      select coalesce(r."voidReason",'(none)') reason, count(*) n
        from "UpDownRound" r where r.outcome='VOID' group by 1 order by n desc`);
  const total = voids.reduce((s, v) => s + Number(v.n), 0);
  for (const v of voids) {
    const feed = /source/.test(v.reason);
    console.log(`   ${feed ? "🔴 FEED " : "⚪ rules"}  ${String(v.n).padStart(4)}  ${v.reason}   ${pc(Number(v.n), total)} of voids`);
  }
  const feedVoids = voids.filter((v) => /source/.test(v.reason)).reduce((s, v) => s + Number(v.n), 0);
  console.log(`\n   ⭐ ${feedVoids} of ${total} voids are the FEED. The rest are the game working as designed.`);

  await c.end();
})().catch((e) => { console.error("ERROR", e.message); process.exit(1); });
