/**
 * THE THREE INSTANTS A PLAYER LIVES THROUGH, read from the columns that actually decide them.
 *
 * ⛔ `UpDownRound.closesAt` IS THE BOUNDARY, not the lock — the schema says so in as many words
 * ("For a price round this equals boundaryAt"). The instant bets stop is
 * `PredictionMarket.selectionClosedAt`. Measuring the wrong column made a correct platform look
 * like it had lost E-72, and it is the "derived values lie" trap almost exactly.
 *
 *   open ──── betting ────> LOCK ──── result phase ────> CLOSE ──── ??? ────> result visible
 *
 *   node .qa-s28/phase.cjs
 */
const { Client } = require("pg");

const url = (process.env.DATABASE_URL || "")
  .replace(/@postgres\.railway\.internal(:\d+)?/, "@turntable.proxy.rlwy.net:40357");

(async () => {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();

  const { rows } = await c.query(`
    select a.key as asset, ch."durationMinutes" as mins, r."roundNumber" as n,
           r."opensAt"::text as opens,
           m."selectionClosedAt"::text as lock,
           r."boundaryAt"::text as close,
           r."resolvedAt"::text as resolved,
           extract(epoch from (m."selectionClosedAt" - r."opensAt"))::numeric(10,0)  as betting_s,
           extract(epoch from (r."boundaryAt" - m."selectionClosedAt"))::numeric(10,0) as phase_s,
           extract(epoch from (r."resolvedAt" - r."boundaryAt"))::numeric(10,1)      as after_close_s,
           r.outcome::text as outcome, r."voidReason" as void
      from "UpDownRound" r
      join "UpDownChain" ch on ch.id = r."chainId"
      join "UpDownAsset" a  on a.id  = ch."assetId"
      join "PredictionMarket" m on m.id = r."marketId"
     where r."resolvedAt" is not null
     order by r."boundaryAt" desc limit 24`);

  console.log(`\n  asset dur  #   betting  resultPhase   result arrives AFTER close   outcome`);
  for (const r of rows)
    console.log(`  ${String(r.asset).padEnd(5)} ${String(r.mins + "m").padEnd(4)} ${String(r.n).padStart(3)}  ` +
      `${String(r.betting_s ?? "null").padStart(6)}s  ${String(r.phase_s ?? "null").padStart(7)}s  ` +
      `${String(r.after_close_s).padStart(12)}s   ${r.outcome}${r.void ? ` (${r.void})` : ""}`);

  const withLock = rows.filter((r) => r.lock != null);
  console.log(`\n  rounds carrying a selectionClosedAt: ${withLock.length} of ${rows.length}`);
  if (withLock.length) {
    const shapes = new Map();
    for (const r of withLock) {
      const k = `${r.mins}m chain -> betting ${r.betting_s}s + result phase ${r.phase_s}s`;
      shapes.set(k, (shapes.get(k) ?? 0) + 1);
    }
    for (const [k, n] of shapes) console.log(`    ${k}   (${n} rounds)`);
  }

  // ⭐ THE NUMBER ALI IS ASKING ABOUT: after the RESULT-PHASE timer also reaches 00:00, how
  // much longer does a player wait with nothing counting down?
  const after = rows.map((r) => Number(r.after_close_s)).filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
  const pick = (p) => after[Math.min(after.length - 1, Math.floor(p * after.length))];
  console.log(`\n  ⏳ DEAD AIR after the result-phase timer hits 00:00 — ${after.length} rounds`);
  console.log(`     min ${after[0]}s · median ${pick(0.5)}s · p90 ${pick(0.9)}s · max ${after[after.length - 1]}s`);

  await c.end();
})().catch((e) => { console.error("ERROR", e.message); process.exit(1); });
