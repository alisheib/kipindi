#!/usr/bin/env node
/**
 * handover-gap-census.cjs — READ-ONLY. When round N settles, where is round N+1?
 *
 *   KP_REPO=F:/kipindi-main node scripts/live/ops/handover-gap-census.cjs
 *
 * ⭐ WHY THIS EXISTS. The handover feature (round N ends → round N+1 takes the screen) was
 * briefed around a countdown — *"NEXT MATCH IN 0:47"*. Whether that countdown is the common
 * case or a corner case is a question about PRODUCTION TIMING, not about the UI, and the answer
 * decides the whole design: a ticker that is almost never counting must not be built as a
 * ticker with an exception.
 *
 * `advanceChain` closes the round that ENDS at a boundary (step 2) and opens the round that
 * STARTS at the same boundary (step 3) in ONE call, both gated on the same confirmed
 * observation. If that reading is right, the successor is born at the same instant its
 * predecessor settles, and its `opensAt` is already in the PAST — so `successorOpensAt − now`
 * is negative from the first tick and a naive countdown would render a dead or negative clock.
 *
 * This measures the claim on real rounds instead of trusting the read:
 *   · `settleToOpenSec`  = successor.opensAt − predecessor.resolvedAt  (negative ⇒ already live)
 *   · `settleToBirthSec` = successor.createdAt − predecessor.resolvedAt (≈0 ⇒ same call)
 *   · `overrunSec`       = predecessor.resolvedAt − predecessor.closesAt (the wait E-99 counts)
 *
 * 🔴 EVERY TIMESTAMP IS READ AS `::text`. Prisma maps `DateTime` to `timestamp(3)` WITHOUT
 * time zone and node-postgres parses a naive timestamp in the CLIENT's zone — on this laptop
 * (EAT, UTC+3) that shifts every reading three hours and would report a same-instant handover
 * as a three-hour gap. See `scripts/live/db.cjs` for the full account of that trap.
 *
 * ⚠️ Read-only, per this directory's rules. It runs SELECTs and nothing else.
 */
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require(path.join(process.env.KP_REPO || "F:/kipindi-main", "node_modules", "pg"));

for (const line of fs.readFileSync(path.join(__dirname, ".env"), "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i > 0) process.env[line.slice(0, i)] = line.slice(i + 1).trim();
}

const q = (c, sql, params) => c.query(sql, params).then((r) => r.rows);
/** A naive `timestamp` rendered by `::text`, read as the UTC it is stored as. */
const ms = (t) => (t == null ? null : Date.parse(t.replace(" ", "T") + "Z"));
const pct = (xs, p) => (xs.length === 0 ? null : xs.slice().sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(xs.length * p))]);
const f1 = (n) => (n == null ? "—" : n.toFixed(1));

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  const [{ now }] = await q(c, `select now()::text as now`);
  console.log(`=== IDENTITY ===\nserver now ${now} UTC\n`);

  // Every settled round in the last 24h, with the NEXT round on the same chain by roundNumber.
  const rows = await q(c, `
    select ch."durationMinutes" as dur, a.symbol,
           r.id as rid, r."roundNumber" as rn,
           r."closesAt"::text as closes, r."resolvedAt"::text as resolved, r.outcome,
           n.id as nid, n."opensAt"::text as nopens, n."createdAt"::text as nborn, n."resolvedAt"::text as nresolved
      from "UpDownRound" r
      join "UpDownChain" ch on ch.id = r."chainId"
      join "UpDownAsset" a on a.id = ch."assetId"
      left join "UpDownRound" n
             on n."chainId" = r."chainId" and n."roundNumber" = r."roundNumber" + 1
     where r."resolvedAt" is not null
       and r."resolvedAt" > now() - interval '24 hours'
     order by r."resolvedAt" desc
  `);

  const gaps = [], births = [], overruns = [];
  let alreadyLive = 0, futureOpen = 0, noSuccessor = 0;
  const orphanExamples = [];

  for (const r of rows) {
    const resolved = ms(r.resolved), closes = ms(r.closes);
    if (resolved != null && closes != null) overruns.push((resolved - closes) / 1000);
    if (!r.nid) {
      noSuccessor++;
      if (orphanExamples.length < 8) orphanExamples.push(`${r.symbol} ${r.dur}m #${r.rn} settled ${r.resolved} — NO round #${r.rn + 1}`);
      continue;
    }
    const g = (ms(r.nopens) - resolved) / 1000;
    gaps.push(g);
    births.push((ms(r.nborn) - resolved) / 1000);
    if (g <= 0) alreadyLive++; else futureOpen++;
  }

  console.log(`=== SETTLED ROUNDS, LAST 24H ===`);
  console.log(`${rows.length} settled · ${alreadyLive} successor ALREADY OPEN at settle · ${futureOpen} successor opens in the FUTURE · ${noSuccessor} NO successor row\n`);

  console.log(`=== settleToOpenSec  (successor.opensAt − predecessor.resolvedAt) ===`);
  console.log(`  negative ⇒ the successor was already live when the result landed`);
  console.log(`  min ${f1(pct(gaps, 0))}  p10 ${f1(pct(gaps, 0.1))}  median ${f1(pct(gaps, 0.5))}  p90 ${f1(pct(gaps, 0.9))}  max ${f1(pct(gaps, 0.999))}\n`);

  console.log(`=== settleToBirthSec (successor.createdAt − predecessor.resolvedAt) ===`);
  console.log(`  ≈0 ⇒ closed and opened inside ONE advanceChain call`);
  console.log(`  min ${f1(pct(births, 0))}  median ${f1(pct(births, 0.5))}  p90 ${f1(pct(births, 0.9))}  max ${f1(pct(births, 0.999))}\n`);

  console.log(`=== overrunSec (resolvedAt − closesAt) — the wait E-99's clock counts ===`);
  console.log(`  min ${f1(pct(overruns, 0))}  median ${f1(pct(overruns, 0.5))}  p90 ${f1(pct(overruns, 0.9))}  max ${f1(pct(overruns, 0.999))}\n`);

  if (orphanExamples.length) {
    console.log(`=== SETTLED WITH NO SUCCESSOR ROW (the dead-end case the UI must name honestly) ===`);
    for (const e of orphanExamples) console.log(`  ${e}`);
    console.log("");
  }

  // The most recent handful, spelled out, so the aggregate can be checked by eye.
  console.log(`=== TEN MOST RECENT, IN FULL ===`);
  for (const r of rows.slice(0, 10)) {
    const g = r.nid ? ((ms(r.nopens) - ms(r.resolved)) / 1000).toFixed(0) : "—";
    const b = r.nid ? ((ms(r.nborn) - ms(r.resolved)) / 1000).toFixed(0) : "—";
    console.log(`  ${r.symbol.padEnd(8)} ${String(r.dur).padStart(2)}m #${String(r.rn).padStart(5)} ${r.outcome ?? "—"} closes ${r.closes} resolved ${r.resolved} → next opensAt ${r.nopens ?? "—"} (${g}s) born (${b}s) next-resolved ${r.nresolved ?? "open"}`);
  }

  await c.end();
})().catch((e) => { console.error(e); process.exit(1); });
