#!/usr/bin/env node
/**
 * loser-share-settled.cjs — READ-ONLY. A4's three questions, asked of PRODUCTION.
 *
 *   KP_REPO=F:/kipindi-main node scripts/live/ops/loser-share-settled.cjs
 *
 * A2 moved Up & Down to `loser-share` on 2026-08-14 13:06. A4 asks what that did to real
 * money, on real rounds — not on a fixture:
 *
 *   §1  every SETTLED round frozen at `loser-share`: is the fee EXACTLY 13% of the losing
 *       pool, and does Σ payouts + fee == pool to the shilling?
 *   §2  a ONE-SIDED round charges nothing and refunds every stake in full
 *   §3  a VOIDED round charges nothing and refunds both sides in full
 *   §4  and the legacy rounds beside them still settle by `capped-commission` — the no-mix
 *       guarantee, on the 4,220 rows that must never move
 *
 * ⛔ THE PRODUCT CANNOT BE ITS OWN WITNESS. Every figure here is recomputed in THIS FILE
 * from the pool columns and the frozen snapshot, then compared against the LEDGER — never
 * against another rendering of the same number by the same code.
 *
 * ⚠️ `Transaction` has no `marketId`. The money side of a market is reached through its
 * POOL ledger account (`POOL:<marketId>`) and through its positions, never directly.
 *
 * ⚠️ A RESOLVED market is not a SETTLED one. `settledAt` is when the money moved; a
 * RESOLVED row with `settledAt = null` is inside its objection window and its pool is
 * CORRECTLY still full. Reading those as failures produced a false 🔴 once already.
 */
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require(path.join(process.env.KP_REPO || "F:/kipindi-main", "node_modules", "pg"));
for (const l of fs.readFileSync(path.join(__dirname, ".env"), "utf8").split("\n")) {
  const i = l.indexOf("="); if (i > 0) process.env[l.slice(0, i)] = l.slice(i + 1).trim();
}

const N = (v) => Number(v ?? 0);
const tzs = (v) => N(v).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
let pass = 0; const fails = [];
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? ` — ${detail}` : ""}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
  return cond;
};

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  const [meta] = (await c.query(`select current_database() db, now()::text server_now,
      (select count(*) from "User")::int users,
      (select count(*) from "PredictionMarket" where status='LIVE')::int live`)).rows;
  console.log("=== IDENTITY ===");
  console.log(`db=${meta.db}  server_now=${meta.server_now}  users=${meta.users}  marketsLive=${meta.live}`);
  console.log("⭐ cross-check users/marketsLive against https://www.50pick.tz/api/health\n");

  // Every UPDOWN round frozen at loser-share, with its pools, outcome, and the money that
  // actually moved. `settledAt` — not `status` — is the gate: the pool is only expected to
  // be empty once settlement has run.
  const rounds = (await c.query(`
    select m.id,
           m."resolvedOutcome"                                   as outcome,
           m."yesPool"::numeric                                  as yes_pool,
           m."noPool"::numeric                                   as no_pool,
           m."feeSnapshot"                                       as snap,
           m."settledAt"::text                                   as settled_at,
           m."createdAt"::text                                   as created_at,
           r."voidReason"                                        as void_reason,
           (select coalesce(sum(p.stake),0)::numeric  from "Position" p where p."marketId" = m.id) as staked,
           (select coalesce(sum(p."finalPayout"),0)::numeric from "Position" p where p."marketId" = m.id) as paid,
           (select count(*)::int from "Position" p where p."marketId" = m.id) as n_pos,
           (select coalesce(sum(le.amount),0)::numeric from "LedgerEntry" le
              where le."marketId" = m.id and le.account = 'HOUSE:COMMISSION'
                and le."entryType" = 'SETTLEMENT_COMMISSION')                    as ledger_fee,
           (select coalesce(sum(le.amount),0)::numeric from "LedgerEntry" le
              where le.account = 'POOL:' || m.id)                                as pool_residual
      from "PredictionMarket" m
      left join "UpDownRound" r on r."marketId" = m.id
     where m."productLine" = 'UPDOWN'
       and m."feeSnapshot"->>'feeModel' = 'loser-share'
     order by m."createdAt"`)).rows;

  const settled = rounds.filter((r) => r.settled_at);
  console.log(`=== POPULATION ===`);
  console.log(`UPDOWN rounds frozen at loser-share: ${rounds.length}   of which SETTLED: ${settled.length}`);
  if (rounds.length) console.log(`first ${rounds[0].created_at}  last ${rounds[rounds.length - 1].created_at}`);
  const byOutcome = {};
  for (const r of settled) byOutcome[r.outcome ?? "(null)"] = (byOutcome[r.outcome ?? "(null)"] ?? 0) + 1;
  console.log(`settled outcomes: ${JSON.stringify(byOutcome)}\n`);

  // ── §1 · the fee is 13% of the LOSING pool, and the money ties out ──────────
  console.log("=== §1 · every settled loser-share round ===");
  if (!settled.length) {
    fails.push("§1 — NO settled loser-share round exists yet. A4 cannot be answered from production; re-run after one settles.");
    console.log("  FAIL no settled loser-share round exists yet — nothing to measure");
  }
  let twoSided = 0, oneSided = 0, voided = 0, emptyRounds = 0;
  for (const r of settled) {
    const yes = N(r.yes_pool), no = N(r.no_pool), pool = yes + no;
    const snap = typeof r.snap === "string" ? JSON.parse(r.snap) : r.snap;
    // Recomputed HERE, from the row's own frozen rates — not read back from the product.
    const rate = N(snap.platformFeeRate) + N(snap.operatorFeeRate);
    const losing = r.outcome === "YES" ? no : r.outcome === "NO" ? yes : 0;
    // ⚠️ FLOOR, NOT ROUND. `allocateFeeShares` books `Math.floor(fee)` and distributes
    // exactly that by largest remainder, so the house can never over-collect a shilling.
    // A probe that compared against the unrounded figure reported three perfectly correct
    // legacy rounds as defects (166.67 expected vs 166 booked) — the instrument, not the
    // product. The same expression is used here as in the product so the floats agree.
    const expectFee = r.outcome === "VOID" || r.outcome == null ? 0 : Math.floor(rate * losing);
    const gotFee = N(r.ledger_fee);
    const paid = N(r.paid), staked = N(r.staked);

    // ⛔ EMPTY IS NOT ONE-SIDED. A round nobody bet on has both pools at zero and proves
    // nothing about refunding a one-sided round in full — counting it as one is how a
    // population of 16 empty rounds could have read as "16 one-sided rounds verified".
    const empty = staked === 0;
    const oneSidedRound = !empty && (yes === 0 || no === 0);
    if (empty) emptyRounds++;
    else if (r.outcome === "VOID") voided++;
    else if (oneSidedRound) oneSided++;
    else twoSided++;

    // ⚠️ THE DUST IS REAL AND IT IS BOUNDED. `allocateFeeShares` books each winner's
    // share by largest remainder so the shares sum to the poll's fee EXACTLY, but the
    // per-winner payout is an integer number of shillings, so a settled pool can finish
    // a shilling or two off zero. `money-invariants` bounds that at winners + 2. A
    // tolerance wider than that would hide a real leak; tighter would flag the dust.
    const dust = N(r.n_pos) + 2;
    const feeOk = Math.abs(gotFee - expectFee) <= 1;                   // fee is rounded to TZS
    const conservationOk = Math.abs(paid + gotFee - pool) <= dust;
    const poolEmptyOk = Math.abs(N(r.pool_residual)) <= dust;
    const shape = empty ? "EMPTY  " : oneSidedRound ? "1-sided" : "2-sided";
    const label = `${r.id.slice(0, 18)} ${String(r.outcome).padEnd(4)} ${shape}`;
    if (!feeOk || !conservationOk || !poolEmptyOk) {
      ok(`1.x ${label}`, false,
         `pool ${tzs(pool)} · fee expected ${tzs(expectFee)} got ${tzs(gotFee)} · paid ${tzs(paid)} · residual ${tzs(r.pool_residual)}`);
    } else {
      pass++;
    }
    // Keep the console readable: print the rounds that actually moved money. An empty
    // round has nothing to show and 28 of them scrolled the interesting line off the top.
    if (!empty) {
      console.log(`  · ${label}  yes ${tzs(yes)} no ${tzs(no)}  → fee ${tzs(gotFee)} = ${(rate * 100).toFixed(0)}% × ${tzs(losing)}  paid ${tzs(paid)}  residual ${tzs(r.pool_residual)}`);
    }
  }
  console.log(`  ${settled.length} settled rounds checked: ${twoSided} two-sided · ${oneSided} one-sided · ${voided} void · ${emptyRounds} EMPTY (nobody bet)`);
  ok("1.★ ALL settled loser-share rounds: fee == 13% of the losing pool, Σ payouts + fee == pool, pool empty",
     fails.filter((f) => f.startsWith("1.")).length === 0, `${settled.length} rounds`);
  // ⛔ AND THE ONE THAT MATTERS. A population made entirely of empty rounds satisfies every
  // assertion above without exercising a single shilling. Say so, loudly, rather than
  // reporting a green that means nothing.
  ok("1.★★ …and at least ONE of them had real money on it",
     twoSided + oneSided + voided > 0,
     twoSided + oneSided + voided > 0
       ? `${twoSided + oneSided + voided} of ${settled.length} carried a stake`
       : `${emptyRounds}/${settled.length} settled rounds had NO stake at all — this section proves nothing until a real bet settles`);

  // ── §2 · a one-sided round charges nothing and refunds in full ──────────────
  console.log("\n=== §2 · a REAL one-sided round ===");
  const oneSidedRows = settled.filter((r) => (N(r.yes_pool) === 0 || N(r.no_pool) === 0) && r.outcome !== "VOID" && N(r.staked) > 0);
  if (!oneSidedRows.length) {
    console.log("  (none yet under loser-share — see the note printed at the end)");
  }
  for (const r of oneSidedRows.slice(0, 5)) {
    ok(`2.${r.id.slice(0, 18)} charges NOTHING`, N(r.ledger_fee) === 0, `fee ${tzs(r.ledger_fee)}`);
    ok(`2.${r.id.slice(0, 18)} refunds every stake IN FULL`,
       Math.abs(N(r.paid) - N(r.staked)) <= 0.5, `staked ${tzs(r.staked)} → paid ${tzs(r.paid)} over ${r.n_pos} positions`);
  }

  // ── §3 · a VOID charges nothing ────────────────────────────────────────────
  console.log("\n=== §3 · a REAL voided round ===");
  const voidRows = settled.filter((r) => r.outcome === "VOID" && N(r.staked) > 0);
  if (!voidRows.length) console.log("  (none yet under loser-share with money on it — see the note at the end)");
  for (const r of voidRows.slice(0, 5)) {
    ok(`3.${r.id.slice(0, 18)} (${r.void_reason ?? "—"}) charges NOTHING`, N(r.ledger_fee) === 0, `fee ${tzs(r.ledger_fee)}`);
    ok(`3.${r.id.slice(0, 18)} refunds BOTH sides in full`,
       Math.abs(N(r.paid) - N(r.staked)) <= 0.5, `staked ${tzs(r.staked)} → paid ${tzs(r.paid)} over ${r.n_pos} positions`);
  }

  // ── §4 · the no-mix guarantee, on the rows that must never move ─────────────
  console.log("\n=== §4 · history did not move ===");
  const legacy = (await c.query(`
    select count(*)::int n,
           min(m."createdAt")::text lo, max(m."createdAt")::text hi,
           count(*) filter (where m."settledAt" is not null)::int settled
      from "PredictionMarket" m
     where m."productLine" = 'UPDOWN' and m."feeSnapshot"->>'feeModel' = 'capped-commission'`)).rows[0];
  console.log(`  ${legacy.n} UPDOWN rounds still frozen at capped-commission (${legacy.settled} settled)  ${legacy.lo} → ${legacy.hi}`);
  ok("4.1 · the legacy rounds are still on capped-commission", legacy.n > 0, `${legacy.n} rows`);

  // A settled legacy round must still tie out under the OLD arithmetic — recomputed here.
  const legacySample = (await c.query(`
    select m.id, m."resolvedOutcome" outcome, m."yesPool"::numeric yes_pool, m."noPool"::numeric no_pool,
           m."feeSnapshot" snap,
           (select coalesce(sum(le.amount),0)::numeric from "LedgerEntry" le
              where le."marketId" = m.id and le.account = 'HOUSE:COMMISSION'
                and le."entryType" = 'SETTLEMENT_COMMISSION') as ledger_fee
      from "PredictionMarket" m
     where m."productLine" = 'UPDOWN' and m."feeSnapshot"->>'feeModel' = 'capped-commission'
       and m."settledAt" is not null and m."yesPool" > 0 and m."noPool" > 0
       and m."resolvedOutcome" in ('YES','NO')
     order by m."createdAt" desc limit 10`)).rows;
  let legacyOk = 0;
  for (const r of legacySample) {
    const snap = typeof r.snap === "string" ? JSON.parse(r.snap) : r.snap;
    const yes = N(r.yes_pool), no = N(r.no_pool);
    // The OLD arithmetic, written out here: min(commission × pool, ceiling × smaller).
    const expect = Math.floor(Math.min(N(snap.commissionRate) * (yes + no), N(snap.feeCeilingRate) * Math.min(yes, no)));
    if (Math.abs(N(r.ledger_fee) - expect) <= 0.5) legacyOk++;
    else console.log(`  ⚠️  ${r.id.slice(0, 18)} legacy fee expected ${tzs(expect)} got ${tzs(r.ledger_fee)}`);
  }
  ok("4.2 · ★ a sample of settled LEGACY rounds still settles by min(commission × pool, ⅓ × smaller)",
     legacySample.length > 0 && legacyOk === legacySample.length, `${legacyOk}/${legacySample.length}`);

  console.log(`\n${pass} passed, ${fails.length} failed\n`);
  for (const f of fails) console.log(`  · ${f}`);
  if (!oneSidedRows.length || !voidRows.length) {
    console.log("\n⚠️ NOT EVERY A4 QUESTION COULD BE ANSWERED FROM PRODUCTION YET:");
    if (!oneSidedRows.length) console.log("   · no SETTLED one-sided loser-share round with money on it");
    if (!voidRows.length) console.log("   · no SETTLED voided loser-share round with money on it");
    console.log("   Both are proven on the real settlement path by `npm run test:updown-cutover` §5.");
    console.log("   ⛔ A passing suite is not production. Re-run this probe until it can answer them.");
  }
  await c.end();
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
