/**
 * HOW LONG AFTER THE TIMER HITS 00:00 DOES THE RESULT APPEAR? — Ali's question, measured.
 *
 * Every gap is computed IN SQL from the server's own columns. ⛔ Never from `new Date()` on
 * this laptop: its clock is ~93 seconds slow and that has already produced one phantom
 * fairness defect (E-81).
 *
 *   node .qa-s28/lag.cjs
 */
const { Client } = require("pg");

const url = (process.env.DATABASE_URL || "")
  .replace(/@postgres\.railway\.internal(:\d+)?/, "@turntable.proxy.rlwy.net:40357");

(async () => {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();

  const { rows } = await c.query(`
    select a.key as asset, ch."durationMinutes" as mins,
           r."roundNumber" as n,
           r."boundaryAt"::text as boundary,
           r."resolvedAt"::text as resolved,
           extract(epoch from (r."resolvedAt" - r."boundaryAt"))::numeric(10,1) as resolve_lag,
           extract(epoch from (r."settledAt"  - r."resolvedAt"))::numeric(10,1) as settle_lag,
           extract(epoch from (r."boundaryAt" - r."opensAt"))::numeric(10,0)    as span_s,
           extract(epoch from (r."closesAt"   - r."opensAt"))::numeric(10,0)    as betting_s,
           r.outcome::text as outcome, r."voidReason" as void
      from "UpDownRound" r
      join "UpDownChain" ch on ch.id = r."chainId"
      join "UpDownAsset" a  on a.id  = ch."assetId"
     where r."resolvedAt" is not null
     order by r."boundaryAt" desc limit 40`);

  console.log(`\n  asset dur  #    boundary               resolve  settle   span  betting  outcome`);
  for (const r of rows)
    console.log(`  ${String(r.asset).padEnd(5)} ${String(r.mins + "m").padEnd(4)} ${String(r.n).padStart(3)}  ${r.boundary.slice(0, 19)}  ` +
      `+${String(r.resolve_lag).padStart(6)}s  +${String(r.settle_lag).padStart(4)}s  ${String(r.span_s).padStart(4)}s  ${String(r.betting_s).padStart(5)}s  ${r.outcome}${r.void ? ` (${r.void})` : ""}`);

  const lags = rows.map((r) => Number(r.resolve_lag)).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  const pick = (p) => lags[Math.min(lags.length - 1, Math.floor(p * lags.length))];
  console.log(`\n  RESOLVE LAG after the timer hits 00:00 — ${lags.length} rounds`);
  console.log(`    min ${lags[0]}s · median ${pick(0.5)}s · p90 ${pick(0.9)}s · max ${lags[lags.length - 1]}s`);

  // ⭐ Does the BETTING window equal the advertised length, or the whole span? T-1 says the
  // advertised length IS the betting time and the result phase is ADDED. Read it, don't assume.
  const shapes = new Map();
  for (const r of rows) {
    const k = `${r.mins}m chain: span ${r.span_s}s, betting ${r.betting_s}s`;
    shapes.set(k, (shapes.get(k) ?? 0) + 1);
  }
  console.log(`\n  ROUND SHAPES seen:`);
  for (const [k, n] of shapes) console.log(`    ${k}   (${n} rounds)`);

  await c.end();
})().catch((e) => { console.error("ERROR", e.message); process.exit(1); });
