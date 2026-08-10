#!/usr/bin/env node
/**
 * ONE-OFF · recompute `PredictionMarket.predictorCount` as DISTINCT PLAYERS.
 *
 * 🔴 WHY. `buyPosition` added +1 on every bet until 2026-08-10, and repeat taps are repeat
 * bets by design — so one player tapping twice read as "2 players". Measured on the live
 * drive: **2 real humans, 16 bets → the card said "16 PLAYERS"**. The forward fix landed in
 * `market-service.ts`; this closes the history, because a corpus where new markets count
 * people and old ones count bets is a worse number than either — nobody can tell which they
 * are reading, and the field feeds a **regulator-facing** match-integrity report as well as
 * the public share card.
 *
 * ⛔ THIS MOVES NO MONEY AND TOUCHES NO MONEY COLUMN. It writes exactly one integer per
 * market. Pools, positions, wallets, transactions and payouts are not read for write and not
 * written. The truth it writes is derived from `Position` rows, which are themselves the
 * ledger's own record of who bet.
 *
 * ⚠️ DRY RUN BY DEFAULT. It prints every change and writes nothing without `--commit`.
 *
 *   DATABASE_URL=<public proxy> node scripts/ops-backfill-predictor-count.mjs
 *   DATABASE_URL=<public proxy> node scripts/ops-backfill-predictor-count.mjs --commit
 */
import pg from "pg";

const DB = process.env.DATABASE_URL;
if (!DB) { console.error("FATAL: DATABASE_URL is not set."); process.exit(1); }
const COMMIT = process.argv.includes("--commit");
const host = (() => { try { return new URL(DB).host; } catch { return "unparseable"; } })();

const c = new pg.Client({ connectionString: DB, ssl: { rejectUnauthorized: false } });
await c.connect();

const line = () => console.log("-".repeat(74));
line();
console.log(`  predictorCount backfill — ${COMMIT ? "🔴 COMMIT" : "🟡 DRY RUN"} — ${host}`);
line();

// The truth: distinct users holding a position on each market. A position is created once per
// bet, so DISTINCT userId is exactly "how many people took part".
//
// ⛔ MARKETS WITH **ZERO** SURVIVING POSITIONS ARE DELIBERATELY EXCLUDED, AND FINDING OUT WHY
// CHANGED THIS SCRIPT. The first dry run wanted to correct 107 markets — but 40 of them have
// no `Position` rows at all, and **37 of those still display a pool, TZS 13.8M between them**.
// For those, `predictorCount` is not overstated in the way the rest are: their positions were
// purged at some point and this increment-only counter simply outlived them. Writing 0 there
// would leave a card reading *"TZS 500,000 volume · 0 predictors"* — a WORSE statement than
// the one being fixed, and a new inconsistency of my own making.
//
// ⭐ So this corrects only markets whose positions still exist, where the derived number is
// genuinely better than the stored one. **The 37 pool-without-positions markets are a
// SEPARATE finding (E-138) and are left untouched for someone who can decide what should
// happen to them** — the honest answer there is about the POOL, not about this counter.
// ⚠️ `HAVING COUNT(p.id) > 0` is the whole of that exclusion; it is not an optimisation.
const { rows } = await c.query(`
  SELECT m.id,
         m."predictorCount"::int                         AS stored,
         COUNT(DISTINCT p."userId")::int                  AS people,
         COUNT(p.id)::int                                 AS bets,
         m.status::text                                   AS status
    FROM "PredictionMarket" m
    JOIN "Position" p ON p."marketId" = m.id
   GROUP BY m.id, m."predictorCount", m.status
  HAVING COUNT(p.id) > 0
   ORDER BY (m."predictorCount" - COUNT(DISTINCT p."userId")) DESC
`);

const drift = rows.filter((r) => r.stored !== r.people);
console.log(`  markets ................. ${rows.length}`);
console.log(`  already correct ......... ${rows.length - drift.length}`);
console.log(`  need correcting ......... ${drift.length}`);

const overstated = drift.filter((r) => r.stored > r.people);
const understated = drift.filter((r) => r.stored < r.people);
console.log(`    ...overstated ......... ${overstated.length}`);
console.log(`    ...understated ........ ${understated.length}   ⚠️ (unexpected — investigate before committing)`);

if (drift.length) {
  line();
  console.log("  worst 15 by overstatement:");
  for (const r of drift.slice(0, 15)) {
    console.log(`    ${r.id}  ${String(r.status).padEnd(9)} stored=${String(r.stored).padStart(5)} → people=${String(r.people).padStart(4)}  (bets=${r.bets})`);
  }
}

if (!COMMIT) {
  line();
  console.log("  🟡 DRY RUN — nothing written. Re-run with --commit to apply.");
  line();
  await c.end();
  process.exit(0);
}

// ⛔ One statement, set-based, derived in the database. A row-by-row loop would leave the
// table half-corrected if it died midway, and this is a number people read off a report.
const res = await c.query(`
  UPDATE "PredictionMarket" m
     SET "predictorCount" = sub.people
    FROM (SELECT m2.id, COUNT(DISTINCT p."userId")::int AS people
            FROM "PredictionMarket" m2
            JOIN "Position" p ON p."marketId" = m2.id
           GROUP BY m2.id
          HAVING COUNT(p.id) > 0) sub
   WHERE m.id = sub.id AND m."predictorCount" <> sub.people
`);
line();
console.log(`  ✅ corrected ${res.rowCount} market(s).`);

// Prove it, by re-asking the same question rather than trusting the rowCount.
const { rows: after } = await c.query(`
  SELECT COUNT(*)::int AS still_wrong FROM (
    SELECT m.id FROM "PredictionMarket" m
      JOIN "Position" p ON p."marketId" = m.id
     GROUP BY m.id, m."predictorCount"
    HAVING m."predictorCount" <> COUNT(DISTINCT p."userId") AND COUNT(p.id) > 0) q
`);
console.log(`  re-measured: ${after[0].still_wrong} market(s) still disagree  ${after[0].still_wrong === 0 ? "✅" : "🔴"}`);
line();

await c.end();
process.exit(after[0].still_wrong === 0 ? 0 : 1);
