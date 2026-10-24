#!/usr/bin/env node
/**
 * stake-share-settled.cjs — READ-ONLY. The new fee law's money, asked of PRODUCTION (programme FEE-TAX-2026-10, release
 * R5: the instrument the plan's go-live step 7 reads after the first settlements).
 *
 *   node scripts/live/ops/stake-share-settled.cjs
 *
 * Every market frozen at `stake-share` — a poll or an Up & Down round — once settled:
 *   §1  the fee is EXACTLY 13% of every stake (per side, half-up) and the tax EXACTLY 15% of the prize fund (the losing
 *       side's stakes less their fee, half-up), each RECOMPUTED HERE from the market's pools and its frozen snapshot;
 *   §2  the four records of each figure agree — the ledger (HOUSE:COMMISSION · SETTLEMENT_COMMISSION and
 *       HOUSE:WINNINGS_TAX · SETTLEMENT_WINNINGS_TAX), the positions (`feeTzs`, `winningsTaxTzs`) and the winners'
 *       BET_PAYOUT rows (`taxWithheld`) — and the money is conserved: Σ paid + fee + tax = Σ staked, the POOL account at
 *       EXACTLY 0 (stake-share leaves no rounding dust);
 *   §3  no winner is paid less than their own stake net of its fee (the law's floor), and a one-sided or VOID market
 *       charged nothing and refunded every stake in full;
 *   §4  the switch record, and no market created after it froze an older model (a container of the previous release
 *       still running for a minute after the deploy may have made one: reported, never failed).
 *
 * ⛔ THE PRODUCT CANNOT BE ITS OWN WITNESS (loser-share-settled.cjs's rule): every expected figure is recomputed in THIS
 *    FILE, then compared with what the product wrote. ⚠️ `Transaction` has no `marketId`: a payout row is reached through
 *    its `positionId`. ⚠️ A RESOLVED market is not a SETTLED one — `settledAt` is the gate.
 */
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require(path.join(process.env.KP_REPO || path.resolve(__dirname, "..", "..", ".."), "node_modules", "pg"));
for (const l of fs.readFileSync(process.env.KP_ENV || path.join(__dirname, ".env"), "utf8").split("\n")) {
  const i = l.indexOf("="); if (i > 0) process.env[l.slice(0, i)] = l.slice(i + 1).trim();
}

const N = (v) => Number(v ?? 0);
/** Round half up of `bp` basis points of a whole-shilling amount — `payout.ts → roundHalfUpBp`, written again here. */
const rhu = (amount, bp) => Math.floor((amount * bp + 5000) / 10000);
const bpOf = (rate) => Math.round(Number(rate) * 10000);
let pass = 0; const fails = []; const notes = [];
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? ` — ${detail}` : ""}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
  return cond;
};

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, options: "-c default_transaction_read_only=on" });
  await c.connect();
  const [meta] = (await c.query(`select current_database() db, now()::text server_now, current_setting('transaction_read_only') ro`)).rows;
  console.log(`=== IDENTITY === db=${meta.db}  server_now=${meta.server_now}  read_only=${meta.ro}\n`);

  // ── §4 first: the switch record ──
  const [sw] = (await c.query(`select value from "SystemConfig" where key = 'fee_law.switch'`)).rows;
  const at = sw && sw.value && sw.value.state === "done" ? sw.value.at : null;
  console.log(`=== THE SWITCH === ${sw ? `state=${sw.value && sw.value.state}  at=${at ?? "—"}` : "no record: the new law has not been switched on"}\n`);

  const markets = (await c.query(`
    select m.id, m."productLine" as line, m."resolvedOutcome" as outcome, m."settledAt"::text as settled_at,
           m."yesPool"::numeric as yes_pool, m."noPool"::numeric as no_pool, m."feeSnapshot" as snap, m."createdAt"::text as created_at,
           (select coalesce(sum(le.amount),0)::numeric from "LedgerEntry" le
             where le."marketId" = m.id and le.account = 'HOUSE:COMMISSION' and le."entryType" = 'SETTLEMENT_COMMISSION') as ledger_fee,
           (select coalesce(sum(le.amount),0)::numeric from "LedgerEntry" le
             where le."marketId" = m.id and le.account = 'HOUSE:WINNINGS_TAX' and le."entryType" = 'SETTLEMENT_WINNINGS_TAX') as ledger_tax,
           (select coalesce(sum(le.amount),0)::numeric from "LedgerEntry" le where le.account = 'POOL:' || m.id) as pool_residual
      from "PredictionMarket" m
     where m."feeSnapshot"->>'feeModel' = 'stake-share' and m."settledAt" is not null
     order by m."settledAt"`)).rows;
  console.log(`=== ${markets.length} settled stake-share market(s) ===`);

  for (const m of markets) {
    const pos = (await c.query(`
      select p.id, p.side, p.status, p.stake::numeric as stake, p."finalPayout"::numeric as paid,
             p."feeTzs" as fee, p."winningsTaxTzs" as tax,
             (select coalesce(sum(t."taxWithheld"),0)::numeric from "Transaction" t
               where t."positionId" = p.id and t.type = 'BET_PAYOUT' and t.status = 'CONFIRMED') as txn_tax
        from "Position" p where p."marketId" = m.id and p.status <> 'CASHED_OUT'`)).rows;
    // ⚠️ A CASHED_OUT position left the pool before the close (its stake with it) and is no part of the settlement.
    const fBp = bpOf(N(m.snap.platformFeeRate) + N(m.snap.operatorFeeRate)), tBp = bpOf(m.snap.winningsTaxRate);
    const yes = N(m.yes_pool), no = N(m.no_pool), staked = pos.reduce((s, p) => s + N(p.stake), 0);
    const tag = `${m.line} ${m.id} (${m.outcome}, YES ${yes} / NO ${no}, ${fBp} bp + ${tBp} bp)`;
    console.log(`\n  ${tag}`);
    const oneSided = yes === 0 || no === 0;
    if (m.outcome === "VOID" || oneSided) {
      ok(`§3 ${m.id} · ${m.outcome === "VOID" ? "VOID" : "one-sided"}: no fee, no tax, every stake refunded in full`,
        N(m.ledger_fee) === 0 && N(m.ledger_tax) === 0 && pos.every((p) => N(p.paid) === N(p.stake) && !N(p.fee) && !N(p.tax)) && N(m.pool_residual) === 0,
        `fee ${m.ledger_fee} · tax ${m.ledger_tax} · residual ${m.pool_residual}`);
      continue;
    }
    // §1 — recomputed here.
    const F = rhu(yes, fBp) + rhu(no, fBp);
    const losing = m.outcome === "YES" ? no : yes;
    const P = losing - rhu(losing, fBp), T = rhu(P, tBp);
    ok(`§1 ${m.id} · ★ the fee is ${fBp / 100}% of every stake (${F}) and the tax ${tBp / 100}% of the prize fund ${P} (${T}) — the ledger's own`,
      N(m.ledger_fee) === F && N(m.ledger_tax) === T, `ledger fee ${m.ledger_fee} · ledger tax ${m.ledger_tax}`);
    // §2 — the four records, and conservation.
    const posFee = pos.reduce((s, p) => s + N(p.fee), 0), posTax = pos.reduce((s, p) => s + N(p.tax), 0), txnTax = pos.reduce((s, p) => s + N(p.txn_tax), 0);
    const paid = pos.reduce((s, p) => s + N(p.paid), 0);
    ok(`§2 ${m.id} · the positions' fee (${posFee}) and tax (${posTax}) and the payout rows' tax (${txnTax}) match the ledger`,
      posFee === N(m.ledger_fee) && posTax === N(m.ledger_tax) && txnTax === N(m.ledger_tax));
    ok(`§2 ${m.id} · ★ conserved: paid ${paid} + fee ${m.ledger_fee} + tax ${m.ledger_tax} = staked ${staked}, and the POOL is at exactly 0`,
      paid + N(m.ledger_fee) + N(m.ledger_tax) === staked && staked === yes + no && N(m.pool_residual) === 0, `residual ${m.pool_residual}`);
    // §3 — the floor.
    const winners = pos.filter((p) => p.status === "WIN");
    const under = winners.filter((p) => N(p.paid) < N(p.stake) - N(p.fee));
    ok(`§3 ${m.id} · no winner paid below their stake net of its fee (${winners.length} winners)`, winners.length > 0 && under.length === 0,
      under.map((p) => `${p.id}: ${p.paid} < ${N(p.stake) - N(p.fee)}`).join(" · "));
    const below = winners.filter((p) => N(p.paid) < N(p.stake));
    if (below.length) notes.push(`${m.id}: ${below.length} winner(s) paid back less than their stake — the law's ruling 1, disclosed before the bet`);
  }

  // §4 — no older model created after the switch.
  if (at) {
    const late = (await c.query(`
      select m.id, m."productLine" as line, m."feeSnapshot"->>'feeModel' as model, m."createdAt"::text as created
        from "PredictionMarket" m
       where m."createdAt" > $1::timestamptz and coalesce(m."feeSnapshot"->>'feeModel','') not in ('stake-share','ticket-share')
       order by m."createdAt"`, [at])).rows;
    console.log(`\n=== §4 · markets created after the switch on an older model: ${late.length} ===`);
    for (const r of late.slice(0, 20)) console.log(`  ⚠️  ${r.line} ${r.id} ${r.model} ${r.created}`);
    if (late.length) notes.push(`${late.length} market(s) created after the switch froze an older model — a container of the previous release (the deploy's overlap)? They settle under the law they froze.`);
  }

  console.log(`\n=== RESULT === ${pass} ok · ${fails.length} failed`);
  for (const n of notes) console.log(`  note · ${n}`);
  for (const f of fails) console.log(`  🔴 ${f}`);
  await c.end();
  if (fails.length) process.exit(1);
})().catch((e) => { console.error("FAILED:", String(e && e.message || e).replace(/:\/\/[^@]*@/g, "://***@")); process.exit(1); });
