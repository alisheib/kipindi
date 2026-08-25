#!/usr/bin/env node
/**
 * ud-open-round.cjs — READ-ONLY. The Up & Down round with the LONGEST remaining selection
 * window, so a browser drive bets into a window it can actually finish inside.
 *
 *   node scripts/live/ops/ud-open-round.cjs [minSecondsLeft]
 *
 * ⭐ WHY THIS EXISTS. A 3-minute chain's selection window is ~1–2 minutes, and a Playwright
 * drive spends most of that logging in. Betting into the FIRST open round it finds is a race
 * it loses often enough to look like a broken bet form. The 15/30/60-minute chains carry the
 * same product and settle inside a session, so the honest fix is to CHOOSE the round rather
 * than take whatever `order by closesAt` returns first.
 *
 * ⚠️ Every timestamp is read `::text` (§3's first trap) and "now" is read from the DATABASE,
 * never from this laptop's clock — which runs ~93s slow.
 */
const fs = require("node:fs");
const path = require("node:path");
const REPO = process.env.KP_REPO || path.resolve(__dirname, "..", "..", "..");
for (const line of fs.readFileSync(path.join(__dirname, ".env"), "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i > 0) process.env[line.slice(0, i)] = line.slice(i + 1).trim();
}
const { connect } = require(path.join(REPO, "scripts", "live", "db.cjs"));

(async () => {
  const minLeft = Number(process.argv[2] ?? 180);
  const c = await connect();
  const { rows } = await c.query(`
    select r."marketId", r."chainId", a.symbol, ch."durationMinutes" mins,
           m."selectionClosedAt"::text sel, r."boundaryAt"::text boundary,
           extract(epoch from (m."selectionClosedAt" - (now() at time zone 'utc')))::int secs_left,
           extract(epoch from (r."boundaryAt"    - (now() at time zone 'utc')))::int secs_to_boundary,
           coalesce(ch."minStake", 0)::numeric minstake, coalesce(ch."maxStake", 0)::numeric maxstake,
           m."yesPool"::numeric yes, m."noPool"::numeric no
      from "UpDownRound" r
      join "PredictionMarket" m on m.id = r."marketId"
      join "UpDownChain" ch on ch.id = r."chainId"
      left join "UpDownAsset" a on a.id = ch."assetId"
     where m.status = 'LIVE'
       and ch.state = 'RUNNING'
       and m."selectionClosedAt" > (now() at time zone 'utc')
     order by (m."selectionClosedAt" - (now() at time zone 'utc')) desc`);

  const usable = rows.filter((r) => r.secs_left >= minLeft);
  if (process.env.QUIET === "1") {
    // One line the caller can parse: the best round, or nothing at all.
    if (usable[0]) console.log(`${usable[0].marketId} ${usable[0].secs_left} ${usable[0].secs_to_boundary} ${usable[0].symbol} ${usable[0].mins}`);
    process.exit(usable[0] ? 0 : 3);
  }
  console.log(`=== OPEN UP & DOWN ROUNDS (${rows.length}; ${usable.length} with >= ${minLeft}s left) ===`);
  for (const r of rows) {
    console.log(`  ${r.marketId}  ${String(r.symbol).padEnd(8)} ${String(r.mins).padStart(3)}m  ` +
      `selection closes in ${String(r.secs_left).padStart(5)}s (${r.sel})  boundary in ${String(r.secs_to_boundary).padStart(5)}s  ` +
      `pools Y=${r.yes} N=${r.no}`);
  }
  await c.end();
})().catch((e) => { console.error(e.message ?? e); process.exit(2); });
