#!/usr/bin/env node
/**
 * READ-ONLY. Does the LIVE ledger's TRA/GBT actually equal levySplit of each market's fee?
 *
 * settleMarket computes the levies ONCE via levySplit(settleFee.fee) for its audit payload
 * and for the agent-commission base, but the LEDGER books them PER WINNER inside
 * settlementPayoutEntries: Math.round(thisWinnersFeeShare * rate). Independent rounding of
 * N shares need not sum to one rounding of the whole.
 *
 * SELECT only. Nothing here writes.
 */
const fs = require("node:fs");
const path = require("node:path");
const REPO = process.env.KP_REPO || path.resolve(__dirname, "..", "..", "..");
const { Client } = require(path.join(REPO, "node_modules", "pg"));

const ENV = process.env.KP_ENV || path.join(__dirname, ".env");
for (const line of fs.readFileSync(ENV, "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i > 0) process.env[line.slice(0, i)] = line.slice(i + 1).trim();
}

const N = (v) => (v == null ? 0 : Number(v));

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  const id = (await c.query(`select current_database() db, now() at time zone 'utc' as t`)).rows[0];
  console.log(`db=${id.db}  now=${id.t}`);

  // Per SETTLEMENT group set, per market: the fee actually booked, the levies actually booked,
  // and how many winner groups the market settled across.
  const sql = `
    with s as (
      select
        e."marketId"                                             as market_id,
        count(distinct e."groupId") filter (where e."entryType" = 'SETTLEMENT_COMMISSION') as winner_groups,
        sum(e.amount) filter (where e.account = 'HOUSE:COMMISSION' and e."entryType" = 'SETTLEMENT_COMMISSION') as fee_booked,
        sum(e.amount) filter (where e.account = 'HOUSE:TRA_LEVY'   and e."entryType" = 'SETTLEMENT_TRA_LEVY')   as tra_booked,
        sum(e.amount) filter (where e.account = 'HOUSE:GBT_LEVY'   and e."entryType" = 'SETTLEMENT_GBT_LEVY')   as gbt_booked
      from "LedgerEntry" e
      where e."groupId" like 'settle\\_%'
        and e."marketId" is not null
      group by e."marketId"
    )
    select s.*, m."productLine", m."feeSnapshot"
    from s join "PredictionMarket" m on m.id = s.market_id
    where s.fee_booked is not null and s.fee_booked > 0
  `;
  const rows = (await c.query(sql)).rows;
  console.log(`\nsettled markets with a booked fee: ${rows.length}`);

  // Fall back to live config rates when a snapshot carries none.
  const cfg = (await c.query(`select value from "SystemConfig" where key = 'market.config'`)).rows[0];
  const g = (cfg && (cfg.value.global || cfg.value)) || {};
  const CFG_TRA = g.traTaxOnCommissionRate ?? 0.10;
  const CFG_GBT = g.gbtLevyOnCommissionRate ?? 0.05;
  console.log(`config levy rates: TRA ${CFG_TRA} · GBT ${CFG_GBT}`);

  let traOff = 0, gbtOff = 0, marketsOff = 0, gbtZeroOwed = 0;
  let traDeltaSum = 0, gbtDeltaSum = 0;
  const worst = [];
  const byWinners = new Map();

  for (const r of rows) {
    const snap = r.feeSnapshot || {};
    const tra = snap.traTaxOnCommissionRate ?? CFG_TRA;
    const gbt = snap.gbtLevyOnCommissionRate ?? CFG_GBT;
    const fee = N(r.fee_booked);
    const expTra = Math.round(Math.round(fee) * tra);   // levySplit's regime
    const expGbt = Math.round(Math.round(fee) * gbt);
    const gotTra = N(r.tra_booked);
    const gotGbt = N(r.gbt_booked);
    const dT = gotTra - expTra;
    const dG = gotGbt - expGbt;
    const w = Number(r.winner_groups);
    if (!byWinners.has(w)) byWinners.set(w, { n: 0, off: 0 });
    const bw = byWinners.get(w); bw.n++;
    if (dT !== 0 || dG !== 0) {
      marketsOff++; bw.off++;
      traDeltaSum += dT; gbtDeltaSum += dG;
      if (dT !== 0) traOff++;
      if (dG !== 0) gbtOff++;
      if (gotGbt === 0 && expGbt > 0) gbtZeroOwed++;
      worst.push({ id: r.market_id, pl: r.productLine, w, fee, expTra, gotTra, dT, expGbt, gotGbt, dG });
    }
  }

  console.log(`\n=== DIVERGENCE: ledger levies vs levySplit(fee) ===`);
  console.log(`  markets where the two regimes disagree : ${marketsOff} / ${rows.length}`);
  console.log(`  · TRA differs                          : ${traOff}   net ${traDeltaSum >= 0 ? "+" : ""}${traDeltaSum} TZS`);
  console.log(`  · GBT differs                          : ${gbtOff}   net ${gbtDeltaSum >= 0 ? "+" : ""}${gbtDeltaSum} TZS`);
  console.log(`  · GBT booked ZERO on a market that owed it : ${gbtZeroOwed}`);

  console.log(`\n=== BY WINNER COUNT (the discriminating variable) ===`);
  [...byWinners.entries()].sort((a, b) => a[0] - b[0]).slice(0, 25).forEach(([w, v]) => {
    console.log(`  ${String(w).padStart(4)} winner group(s): ${String(v.n).padStart(6)} markets, ${String(v.off).padStart(6)} diverge  (${((v.off / v.n) * 100).toFixed(1)}%)`);
  });

  worst.sort((a, b) => (Math.abs(b.dT) + Math.abs(b.dG)) - (Math.abs(a.dT) + Math.abs(a.dG)));
  console.log(`\n=== 15 WORST ===`);
  for (const x of worst.slice(0, 15)) {
    console.log(`  ${x.pl.padEnd(6)} ${x.id}  winners=${String(x.w).padStart(3)} fee=${String(x.fee).padStart(9)}  TRA exp ${x.expTra} got ${x.gotTra} (${x.dT >= 0 ? "+" : ""}${x.dT})  GBT exp ${x.expGbt} got ${x.gotGbt} (${x.dG >= 0 ? "+" : ""}${x.dG})`);
  }

  // House account totals — what the state is actually owed on the books today.
  const tot = (await c.query(`
    select account, sum(amount) amt, count(*) n
    from "LedgerEntry"
    where account in ('HOUSE:COMMISSION','HOUSE:TRA_LEVY','HOUSE:GBT_LEVY','HOUSE:TAX','HOUSE:AGENT_COMMISSION','HOUSE:AGENT_FEE','HOUSE:RG_SUSPENSE','HOUSE:AGGREGATOR','HOUSE:RESERVE')
    group by account order by account
  `)).rows;
  console.log(`\n=== HOUSE ACCOUNTS (live) ===`);
  for (const t of tot) console.log(`  ${t.account.padEnd(24)} ${String(N(t.amt)).padStart(14)} TZS   (${t.n} entries)`);

  await c.end();
})().catch((e) => { console.error("FAIL:", e.message); process.exit(1); });
