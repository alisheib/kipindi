#!/usr/bin/env node
/**
 * poll-census.cjs — read the LIVE state of the POLL product line off production.
 *
 * `census.cjs` answers "is money stuck". This answers "is the long-form poll lane
 * actually working end to end" — creation, publication, the selection/resolution
 * clocks, the three notification sweeps, settlement, and the three dictionaries.
 *
 * Rules it obeys, each inherited from the probes beside it:
 *  - every comparison is made by POSTGRES against `now()`, never by this laptop.
 *    The dev machine's clock has run ~93s slow and a client-side Date comparison
 *    silently invents drift.
 *  - it prints an IDENTITY block first. A probe that cannot prove which database
 *    it read is not evidence.
 *  - ⛔ it filters `productLine = 'MARKET'` on EVERY query. The Up & Down rounds
 *    live in the same table and outnumber the polls ~20:1, so a forgotten filter
 *    reads as a healthy poll lane built entirely out of price rounds.
 *  - ⛔ read-only. Nothing here writes.
 */
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require(path.join(process.env.KP_REPO || "C:/kipindi-main", "node_modules", "pg"));

for (const line of fs.readFileSync(path.join(__dirname, ".env"), "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i > 0) process.env[line.slice(0, i)] = line.slice(i + 1).trim();
}

const q = (c, sql, params) => c.query(sql, params).then((r) => r.rows);
const POLL = `"productLine" = 'MARKET'`;

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  const [meta] = await q(c, `select current_database() as db, inet_server_addr()::text as addr, now()::text as server_now`);
  console.log("=== IDENTITY ===");
  console.log(`db=${meta.db}  server=${meta.addr}  server_now=${meta.server_now}`);

  // ---- 1. the lane, by status ---------------------------------------------------
  console.log("\n=== POLL LANE (productLine='MARKET') ===");
  const spread = await q(c, `select status, count(*)::int as n from "PredictionMarket" where ${POLL} group by status order by n desc`);
  const total = spread.reduce((a, r) => a + r.n, 0);
  console.log(`${total} poll rows: ${spread.map((r) => `${r.status}=${r.n}`).join("  ")}`);

  const [ud] = await q(c, `select count(*)::int as n from "PredictionMarket" where "productLine" <> 'MARKET'`);
  console.log(`(Up & Down rows in the same table, excluded from everything below: ${ud.n})`);

  // ---- 2. the clocks ------------------------------------------------------------
  // Every one of these is a question about a sweep that is supposed to have fired.
  console.log("\n=== CLOCKS — is anything overdue? ===");

  const overdue = await q(c, `
    select id, status, "titleEn", "resolutionAt"::text as "resolutionAt",
           round(extract(epoch from (now() - "resolutionAt"))/3600.0, 1) as hours_overdue,
           "resolveClaimedAt"::text as claimed, "sentinelClosedAt"::text as sentinel
      from "PredictionMarket"
     where ${POLL} and status = 'LIVE' and "resolutionAt" < now()
     order by "resolutionAt" limit 25`);
  console.log(`LIVE polls whose resolutionAt has PASSED (should have closed): ${overdue.length}`);
  overdue.forEach((m) => console.log(
    `  ${m.hours_overdue > 1 ? "🔴" : "⏳"} ${m.id} overdue=${m.hours_overdue}h claimed=${m.claimed ?? "-"} sentinel=${m.sentinel ?? "-"} · ${m.titleEn.slice(0, 60)}`));

  const stuckClosed = await q(c, `
    select id, "titleEn", "resolutionAt"::text as "resolutionAt",
           round(extract(epoch from (now() - "resolutionAt"))/3600.0, 1) as hours_since,
           "resolutionStage1At"::text as stage1, "resolutionNotifiedAt"::text as notified
      from "PredictionMarket"
     where ${POLL} and status = 'CLOSED'
     order by "resolutionAt" limit 25`);
  console.log(`\nPolls sitting in CLOSED (awaiting an officer's verdict): ${stuckClosed.length}`);
  stuckClosed.forEach((m) => console.log(
    `  ${m.hours_since > 24 ? "🔴" : "⏳"} ${m.id} since=${m.hours_since}h stage1=${m.stage1 ?? "-"} officersNotified=${m.notified ?? "-"} · ${m.titleEn.slice(0, 60)}`));

  // A LIVE poll whose selection window has closed is CORRECT — bets stop, the market
  // stays live until resolutionAt. The defect would be the inverse: selectionClosedAt
  // in the future but AFTER resolutionAt, which would mean bets never close at all.
  const badWindow = await q(c, `
    select id, "titleEn", "selectionClosedAt"::text as sel, "resolutionAt"::text as res
      from "PredictionMarket"
     where ${POLL} and "selectionClosedAt" is not null and "selectionClosedAt" >= "resolutionAt"`);
  console.log(`\n🔴 Polls where selectionClosedAt >= resolutionAt (bets never close): ${badWindow.length}`);
  badWindow.forEach((m) => console.log(`  🔴 ${m.id} sel=${m.sel} res=${m.res} · ${m.titleEn.slice(0, 60)}`));

  // ---- 3. the three notification sweeps -----------------------------------------
  // Each column is "set once by its sweep". A null on a row whose moment has passed
  // means that sweep did not reach that player.
  console.log("\n=== NOTIFICATION SWEEPS — did they reach the player? ===");

  const [sel] = await q(c, `
    select count(*)::int as due,
           count(*) filter (where "selectionClosedNotifiedAt" is null)::int as missed
      from "PredictionMarket"
     where ${POLL} and "selectionClosedAt" is not null and "selectionClosedAt" < now()
       and exists (select 1 from "Position" p where p."marketId" = "PredictionMarket".id)`);
  console.log(`selection-closed sweep : ${sel.due - sel.missed}/${sel.due} staked polls notified` + (sel.missed ? `  🔴 ${sel.missed} MISSED` : ""));

  const [rn] = await q(c, `
    select count(*)::int as due,
           count(*) filter (where "resolutionNotifiedAt" is null)::int as missed
      from "PredictionMarket"
     where ${POLL} and status in ('CLOSED','RESOLVED') and "resolutionAt" < now()`);
  console.log(`resolution-due sweep   : ${rn.due - rn.missed}/${rn.due} polls alerted officers` + (rn.missed ? `  ⚠️ ${rn.missed} without a stamp` : ""));

  const [cs] = await q(c, `
    select count(*)::int as due,
           count(*) filter (where m."closingSoonNotifiedAt" is null)::int as missed
      from "PredictionMarket" m
     where ${POLL} and m."resolutionAt" < now()
       and exists (select 1 from "Watchlist" w where w."marketId" = m.id)`);
  console.log(`closing-soon sweep     : ${cs.due - cs.missed}/${cs.due} watched polls nudged` + (cs.missed ? `  ⚠️ ${cs.missed} without a stamp` : ""));

  // ---- 4. settlement ------------------------------------------------------------
  console.log("\n=== SETTLEMENT ===");
  const unsettled = await q(c, `
    select m.id, m.status, m."resolvedOutcome", m."titleEn",
           m."objectionsClosedAt"::text as "objClosed",
           (m."objectionsClosedAt" > now()) as window_open,
           round(extract(epoch from (now() - m."objectionsClosedAt"))/3600.0, 1) as hours_overdue,
           (select count(*) from "Position" p where p."marketId" = m.id and p.status = 'OPEN')::int as open_positions,
           (m."yesPool" + m."noPool")::text as pool
      from "PredictionMarket" m
     where ${POLL} and m.status in ('RESOLVED','VOIDED') and m."settledAt" is null
     order by m."resolutionAt" desc limit 25`);
  console.log(`RESOLVED/VOIDED polls with settledAt = NULL: ${unsettled.length}`);
  unsettled.forEach((m) => console.log(
    `  ${m.window_open ? "⏳ window open" : `🔴 OVERDUE ${m.hours_overdue}h`} ${m.id} ${m.status}/${m.resolvedOutcome ?? "-"} pool=${m.pool} open=${m.open_positions} objClosed=${m.objClosed ?? "NULL"}`));

  // A settled poll whose positions never left OPEN is money that was declared paid
  // and never was. This is the inverse of the check above and nothing else runs it.
  const settledButOpen = await q(c, `
    select m.id, m.status, m."settledAt"::text as settled,
           (select count(*) from "Position" p where p."marketId" = m.id and p.status = 'OPEN')::int as open_positions
      from "PredictionMarket" m
     where ${POLL} and m."settledAt" is not null
       and exists (select 1 from "Position" p where p."marketId" = m.id and p.status = 'OPEN')
     order by m."settledAt" desc limit 25`);
  console.log(`🔴 SETTLED polls that still hold OPEN positions: ${settledButOpen.length}`);
  settledButOpen.forEach((m) => console.log(`  🔴 ${m.id} settled=${m.settled} open=${m.open_positions}`));

  // ---- 5. truth on the card -----------------------------------------------------
  console.log("\n=== WHAT THE CARD CLAIMS vs WHAT THE ROWS SAY ===");
  // ⛔ Split by STATUS. A RESOLVED poll with a stale count is E-138 — closed by Ali,
  // "the data gets reset before launch", do not re-raise. A LIVE poll with a stale
  // count is a false statement on a card a player can open RIGHT NOW, and is not the
  // same finding wearing the same shape.
  const predictor = await q(c, `
    select m.id, m.status, m."predictorCount" as claimed,
           (select count(distinct p."userId") from "Position" p where p."marketId" = m.id)::int as actual
      from "PredictionMarket" m
     where ${POLL}
       and m."predictorCount" <> (select count(distinct p."userId") from "Position" p where p."marketId" = m.id)
     order by (m.status = 'LIVE') desc, abs(m."predictorCount" - (select count(distinct p."userId") from "Position" p where p."marketId" = m.id)) desc`);
  const liveWrong = predictor.filter((m) => m.status === "LIVE");
  console.log(`predictorCount disagreeing with distinct bettors: ${predictor.length} total, ${liveWrong.length} of them LIVE`);
  predictor.slice(0, 20).forEach((m) => console.log(
    `  ${m.status === "LIVE" ? "🔴 LIVE  " : "⚪ " + m.status.padEnd(8)} ${m.id} card says ${m.claimed}, rows say ${m.actual}`));

  // ⛔ SUM ONLY **OPEN** POSITIONS. A cash-out debits the pool (market-service.ts:1923)
  // and moves the row to CASHED_OUT, so summing every position regardless of status
  // makes a correctly cashed-out market look like it is missing money — and the error
  // points the OPPOSITE way from a data purge, which is what exposed it. The pool is
  // the sum of the stakes still IN it, and nothing else.
  const poolVsPositions = await q(c, `
    select m.id, m.status, (m."yesPool" + m."noPool")::text as pool,
           coalesce((select sum(p.stake) from "Position" p where p."marketId" = m.id and p.status = 'OPEN'), 0)::text as staked,
           (select count(*) from "Position" p where p."marketId" = m.id and p.status = 'CASHED_OUT')::int as cashed_out
      from "PredictionMarket" m
     where ${POLL} and m.status = 'LIVE'
       and (m."yesPool" + m."noPool") <> coalesce((select sum(p.stake) from "Position" p where p."marketId" = m.id and p.status = 'OPEN'), 0)
     order by abs((m."yesPool" + m."noPool") - coalesce((select sum(p.stake) from "Position" p where p."marketId" = m.id and p.status = 'OPEN'), 0)) desc`);
  console.log(`LIVE polls whose pool disagrees with the sum of its OPEN stakes: ${poolVsPositions.length}`);
  poolVsPositions.forEach((m) => console.log(
    `  ⚠️ ${m.id} pool=${m.pool} openStakes=${m.staked} (cashedOut rows=${m.cashed_out})`));

  // ---- 6. content integrity — can this poll even be resolved? --------------------
  console.log("\n=== CONTENT INTEGRITY (LIVE polls only) ===");
  const [content] = await q(c, `
    select count(*)::int as live,
           count(*) filter (where "titleZh" is null or "titleZh" = '')::int as no_zh,
           count(*) filter (where "titleSw" is null or "titleSw" = '')::int as no_sw,
           count(*) filter (where "resolutionCriterion" is null or length(trim("resolutionCriterion")) < 10)::int as thin_criterion,
           count(*) filter (where "sourceUrl" is null or "sourceUrl" = '')::int as no_source,
           count(*) filter (where "feeSnapshot" is null)::int as no_fee_snapshot,
           count(*) filter (where "selectionClosedAt" is null)::int as no_selection_close
      from "PredictionMarket" where ${POLL} and status = 'LIVE'`);
  console.log(`of ${content.live} LIVE polls:`);
  console.log(`  missing Chinese title      : ${content.no_zh}${content.no_zh ? "  🔴 renders the English string to a zh player" : ""}`);
  console.log(`  missing Swahili title      : ${content.no_sw}${content.no_sw ? "  🔴" : ""}`);
  console.log(`  resolution criterion <10ch : ${content.thin_criterion}${content.thin_criterion ? "  🔴 unresolvable" : ""}`);
  console.log(`  no source URL              : ${content.no_source}${content.no_source ? "  🔴 nothing to resolve against" : ""}`);
  console.log(`  no feeSnapshot (legacy)    : ${content.no_fee_snapshot}${content.no_fee_snapshot ? "  ⚠️ priced by snapshotOrLegacy()" : ""}`);
  console.log(`  no selectionClosedAt       : ${content.no_selection_close}  (legacy = bets close at resolutionAt)`);

  // ---- 7. the AI poll pipeline --------------------------------------------------
  console.log("\n=== AI POLL PIPELINE ===");
  const ai = await q(c, `select state, count(*)::int as n from "AIPoll" group by state order by n desc`);
  console.log(ai.length ? ai.map((r) => `  ${String(r.state).padEnd(12)} n=${r.n}`).join("\n") : "  (no AIPoll rows)");

  const aiStale = await q(c, `
    select id, state, "createdAt"::text as created,
           round(extract(epoch from (now() - "createdAt"))/3600.0, 1) as hours_old
      from "AIPoll"
     where state not in ('PUBLISHED','REJECTED','FILTERED','VALIDATION_FAILED')
       and "createdAt" < now() - interval '48 hours'
     order by "createdAt" limit 15`);
  console.log(`AI polls stuck mid-pipeline >48h: ${aiStale.length}`);
  aiStale.forEach((p) => console.log(`  ⚠️ ${p.id} ${p.state} age=${p.hours_old}h`));

  // ---- 8. the objection window --------------------------------------------------
  const obj = await q(c, `
    select o.status, count(*)::int as n from "Objection" o
      join "PredictionMarket" m on m.id = o."marketId"
     where m."productLine" = 'MARKET' group by o.status order by n desc`);
  console.log(`\n=== OBJECTIONS ===`);
  console.log(obj.length ? obj.map((r) => `  ${String(r.status).padEnd(12)} n=${r.n}`).join("\n") : "  (none ever raised)");

  await c.end();
})().catch((e) => { console.error("PROBE FAILED:", e.message); process.exit(1); });
