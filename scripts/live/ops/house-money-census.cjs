#!/usr/bin/env node
/**
 * house-money-census.cjs — QUANTIFY THE HOUSE'S MONEY ON THE LIVE PRODUCTION DB.
 *
 * ⭐ THE QUESTION THIS ANSWERS. "How much money does the platform have?" has no single
 * answer, because the platform HOLDS far more than it OWNS. This probe reports the two
 * separately and never adds them together:
 *
 *   EQUITY  — money the house owns.  HOUSE:COMMISSION (already net of TRA + GBT).
 *   HELD    — money the house merely holds and owes to somebody else:
 *               PLAYER:*          → owed to players (their wallet balance)
 *               PLAYER_BONUS:*    → non-withdrawable bonus liability
 *               POOL:*            → stakes in escrow until a market settles
 *               HOUSE:TRA_LEVY    → owed to the Tanzania Revenue Authority
 *               HOUSE:GBT_LEVY    → owed to the Gaming Board
 *               HOUSE:AGGREGATOR  → the payment gateway's earned fee share
 *               HOUSE:RG_SUSPENSE → a deposit that landed after a self-exclusion; owed BACK to a player
 *   CONTRA  — SYSTEM:BONUS / SYSTEM:ADJUSTMENT / SYSTEM:VOID / EXTERNAL:* are source-and-sink
 *             accounts. Their balances are the MIRROR of money that moved, not a pot of money.
 *
 * ⛔ READ-ONLY. Issues nothing but SELECT.
 *
 * Conventions copied verbatim from census.cjs / rbac-census.cjs, each learned the hard way:
 *  - loads scripts/live/ops/.env (the minted PUBLIC-proxy URL);
 *  - prints an IDENTITY block first — a probe that cannot prove which database it read is
 *    not evidence;
 *  - ASSERTS every table it names exists, rather than trusting a `0` that is really
 *    "relation does not exist" swallowed by a try/catch;
 *  - every timestamp is ::text-cast, because this laptop's clock is ~93s slow;
 *  - it prints ENTRY COUNTS beside every balance, so "0.00" from an account that exists
 *    is distinguishable from "0.00" from an account that was never written.
 *
 *   node scripts/live/ops/house-money-census.cjs
 */
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require(path.join(process.env.KP_REPO || "F:/kipindi-main", "node_modules", "pg"));

for (const line of fs.readFileSync(path.join(__dirname, ".env"), "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i > 0) process.env[line.slice(0, i)] = line.slice(i + 1).trim();
}

const q = (c, sql, params) => c.query(sql, params).then((r) => r.rows);
const n = (v) => Number(v ?? 0);
const tzs = (v) => "TZS " + n(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pad = (s, w) => String(s).padEnd(w);
const rpad = (s, w) => String(s).padStart(w);

/**
 * CLASSIFICATION, transcribed from the `acct` object + its docstring (src/lib/server/ledger.ts:168-189).
 * ⛔ It is a COPY and a copy can drift — so the probe prints every live account that this
 * map does NOT recognise, rather than silently bucketing it as "internal".
 */
const CLASS = {
  "HOUSE:COMMISSION": ["EQUITY", "operator revenue, NET of TRA+GBT (they are debited out of it)"],
  "HOUSE:RESERVE": ["EQUITY (retired)", "RETIRED 2026-07; never credited again"],
  "HOUSE:TAX": ["HELD (retired)", "RETIRED 2026-07; historical rows only"],
  "HOUSE:TRA_LEVY": ["HELD — owed to the state", "TRA tax, levied on our commission"],
  "HOUSE:GBT_LEVY": ["HELD — owed to the state", "Gaming Board levy, levied on our commission"],
  "HOUSE:AGGREGATOR": ["HELD — owed to the gateway", "the payment gateway's slice of the withdrawal fee"],
  "HOUSE:RG_SUSPENSE": ["HELD — owed to a PLAYER", "deposit that arrived after a self-exclusion"],
  "SYSTEM:BONUS": ["CONTRA", "bonus issuance source (mirror of granted bonus)"],
  "SYSTEM:ADJUSTMENT": ["CONTRA", "admin adjustments / internal credits source"],
  "SYSTEM:VOID": ["CONTRA", "expired/cancelled bonus sink"],
};

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  // ---- 0. IDENTITY: prove which database this is ---------------------------------------
  const [meta] = await q(c, `select current_database() as db, inet_server_addr()::text as addr,
                                    now()::text as server_now, current_user as who,
                                    pg_is_in_recovery() as replica`);
  console.log("=== IDENTITY ===");
  console.log(`db=${meta.db}  server=${meta.addr}  user=${meta.who}  replica=${meta.replica}`);
  console.log(`server_now=${meta.server_now}   (::text-cast — never compared to this laptop's clock)`);

  const tables = (await q(c, `select table_name from information_schema.tables where table_schema='public'`)).map((r) => r.table_name);
  const need = ["LedgerEntry", "Wallet", "User", "Transaction", "Position", "PredictionMarket", "BonusGrant"];
  const missing = need.filter((t) => !tables.includes(t));
  if (missing.length) {
    console.log(`\n⛔ MISSING TABLES: ${missing.join(", ")} — refusing to report money I cannot read.`);
    console.log(`   (public schema has ${tables.length} tables)`);
    await c.end();
    process.exit(2);
  }
  console.log(`tables: ${tables.length} in public, all ${need.length} required present`);
  console.log(`HousePoolLedger present in DB: ${tables.includes("HousePoolLedger") ? "YES" : "no"}  (the dead abandoned-feature table)`);

  const [le] = await q(c, `select count(*)::int as n, min("createdAt")::text as first, max("createdAt")::text as last
                             from "LedgerEntry"`);
  console.log(`LedgerEntry rows: ${le.n}   first=${le.first ?? "—"}   last=${le.last ?? "—"}`);
  if (le.n === 0) {
    console.log("\n⛔ THE LEDGER IS EMPTY. Every figure below would be a vacuous zero. Stopping.");
    await c.end();
    process.exit(3);
  }

  // ---- 1. THE ACCOUNT NAMESPACE, MEASURED (not assumed) ---------------------------------
  // `LedgerEntry.account` is a free-form String — there is no enum and no constraint. So the
  // only honest way to know which accounts exist is to ask the data.
  console.log("\n=== 1. ACCOUNT NAMESPACE ON PRODUCTION (prefix census) ===");
  const prefixes = await q(c, `
    select split_part(account, ':', 1) as prefix, count(distinct account)::int as accounts,
           count(*)::int as entries, sum(amount)::numeric as balance
      from "LedgerEntry" group by 1 order by 1`);
  console.log(`  ${pad("prefix", 16)}${rpad("accounts", 10)}${rpad("entries", 10)}${rpad("net balance", 22)}`);
  for (const r of prefixes) {
    console.log(`  ${pad(r.prefix, 16)}${rpad(r.accounts, 10)}${rpad(r.entries, 10)}${rpad(tzs(r.balance), 22)}`);
  }

  // ---- 2. HOUSE + SYSTEM ACCOUNTS — the exact query the /admin/finance card runs ---------
  console.log("\n=== 2. HOUSE & SYSTEM ACCOUNT BALANCES (all-time; the houseAccountBalances() query) ===");
  const house = await q(c, `
    select account, sum(amount)::numeric as balance, count(*)::int as entries,
           min("createdAt")::text as first, max("createdAt")::text as last
      from "LedgerEntry" where account like 'HOUSE:%' or account like 'SYSTEM:%'
     group by account order by account`);
  let equity = 0, heldHouse = 0;
  const unknown = [];
  console.log(`  ${pad("account", 20)}${rpad("balance", 20)}${rpad("entries", 9)}  classification`);
  for (const r of house) {
    const k = CLASS[r.account];
    if (!k) unknown.push(r.account);
    const cls = k ? k[0] : "⚠️ UNRECOGNISED";
    if (cls.startsWith("EQUITY")) equity += n(r.balance);
    else if (cls.startsWith("HELD")) heldHouse += n(r.balance);
    console.log(`  ${pad(r.account, 20)}${rpad(tzs(r.balance), 20)}${rpad(r.entries, 9)}  ${cls}`);
    if (k) console.log(`  ${" ".repeat(20)}${" ".repeat(29)}  ${k[1]}`);
    console.log(`  ${" ".repeat(20)}${" ".repeat(29)}  first=${r.first}  last=${r.last}`);
  }
  // An account defined in `acct` but never written has NO ROW here — say so explicitly rather
  // than letting its absence read as zero-by-measurement.
  const seen = new Set(house.map((r) => r.account));
  const neverWritten = Object.keys(CLASS).filter((a) => !seen.has(a));
  console.log(`\n  accounts defined in acct{} but with ZERO entries on prod: ${neverWritten.length ? neverWritten.join(", ") : "none"}`);
  if (unknown.length) console.log(`  ⚠️ accounts on prod that this probe's copy of acct{} does not know: ${unknown.join(", ")}`);

  // ---- 3. REVENUE BY MECHANISM ----------------------------------------------------------
  // Every earning mechanism credits the SAME account (HOUSE:COMMISSION); only `entryType`
  // distinguishes them. No query in src/ has ever grouped by it.
  console.log("\n=== 3. HOUSE:COMMISSION DECOMPOSED BY MECHANISM (entryType) ===");
  const byType = await q(c, `
    select "entryType"::text as t, sum(amount)::numeric as total, count(*)::int as n,
           min("createdAt")::text as first, max("createdAt")::text as last
      from "LedgerEntry" where account = 'HOUSE:COMMISSION'
     group by "entryType" order by sum(amount) desc`);
  if (byType.length === 0) {
    console.log("  (no HOUSE:COMMISSION entries at all)");
  } else {
    let gross = 0, levy = 0;
    for (const r of byType) {
      const sign = n(r.total) < 0 ? "  ← DEBIT (levy taken out of commission)" : "";
      if (n(r.total) < 0) levy += n(r.total); else gross += n(r.total);
      console.log(`  ${pad(r.t, 26)}${rpad(tzs(r.total), 20)}${rpad(r.n, 8)} entries   ${r.first} → ${r.last}${sign}`);
    }
    console.log(`  ${"-".repeat(74)}`);
    console.log(`  ${pad("GROSS revenue earned", 26)}${rpad(tzs(gross), 20)}`);
    console.log(`  ${pad("less statutory levies", 26)}${rpad(tzs(levy), 20)}`);
    console.log(`  ${pad("= NET (the account balance)", 26)}${rpad(tzs(gross + levy), 20)}`);
  }

  // ---- 3b. REVENUE BY PRODUCT LINE — LedgerEntry.marketId → PredictionMarket.productLine --
  console.log("\n=== 3b. SETTLEMENT COMMISSION BY PRODUCT LINE (join marketId → PredictionMarket) ===");
  const byPl = await q(c, `
    select coalesce(m."productLine", '(marketId not found)') as pl,
           count(distinct l."marketId")::int as markets, count(*)::int as entries,
           sum(l.amount)::numeric as total
      from "LedgerEntry" l left join "PredictionMarket" m on m.id = l."marketId"
     where l.account = 'HOUSE:COMMISSION' and l."marketId" is not null
     group by 1 order by sum(l.amount) desc`);
  if (byPl.length === 0) console.log("  (no market-attributed commission entries)");
  for (const r of byPl) console.log(`  ${pad(r.pl, 24)}${rpad(tzs(r.total), 20)}  ${r.markets} markets, ${r.entries} entries`);
  const [orphanComm] = await q(c, `
    select count(*)::int as n, coalesce(sum(amount),0)::numeric as total
      from "LedgerEntry" where account='HOUSE:COMMISSION' and "marketId" is null`);
  console.log(`  commission entries with NO marketId (withdrawal fees): ${orphanComm.n} entries, ${tzs(orphanComm.total)}`);

  // ---- 3c. REVENUE OVER TIME ------------------------------------------------------------
  console.log("\n=== 3c. HOUSE:COMMISSION BY MONTH (EAT = UTC+3) ===");
  const byMonth = await q(c, `
    select to_char(date_trunc('month', "createdAt" + interval '3 hours'), 'YYYY-MM') as month,
           sum(amount)::numeric as total, count(*)::int as n
      from "LedgerEntry" where account='HOUSE:COMMISSION' group by 1 order by 1`);
  for (const r of byMonth) console.log(`  ${pad(r.month, 10)}${rpad(tzs(r.total), 20)}  ${r.n} entries`);

  // ---- 4. PLAYER LIABILITY — the wallet table ------------------------------------------
  console.log("\n=== 4. PLAYER WALLET LIABILITY (the Wallet table — what we owe players) ===");
  const wal = await q(c, `
    select status::text as status, count(*)::int as wallets,
           sum(balance)::numeric as balance, sum(pending)::numeric as pending,
           sum(hold)::numeric as hold, sum("bonusBalance")::numeric as bonus
      from "Wallet" group by status order by status`);
  console.log(`  ${pad("status", 10)}${rpad("wallets", 9)}${rpad("balance", 18)}${rpad("hold", 16)}${rpad("pending", 14)}${rpad("bonus", 16)}`);
  let liabActive = 0, liabAll = 0, bonusAll = 0, holdAll = 0;
  for (const r of wal) {
    const owed = n(r.balance) + n(r.hold);
    liabAll += owed; bonusAll += n(r.bonus); holdAll += n(r.hold);
    if (r.status === "ACTIVE") liabActive = owed;
    console.log(`  ${pad(r.status, 10)}${rpad(r.wallets, 9)}${rpad(tzs(r.balance), 18)}${rpad(tzs(r.hold), 16)}${rpad(tzs(r.pending), 14)}${rpad(tzs(r.bonus), 16)}`);
  }
  console.log(`  ${"-".repeat(83)}`);
  console.log(`  liability as the console reports it (ACTIVE only, balance+hold): ${tzs(liabActive)}`);
  console.log(`  liability across ALL wallet statuses (balance+hold):             ${tzs(liabAll)}`);
  console.log(`  understatement caused by excluding FROZEN/CLOSED:                ${tzs(liabAll - liabActive)}`);
  console.log(`  bonus liability (bonusBalance, non-withdrawable, excluded above): ${tzs(bonusAll)}`);
  console.log(`  of the balance above, ${tzs(holdAll)} is in HOLD (in-flight withdrawals)`);

  // wallet count vs user count — a User with no Wallet row is money that cannot be held
  const [wc] = await q(c, `select (select count(*) from "User")::int as users,
                                  (select count(*) from "Wallet")::int as wallets,
                                  (select count(*) from "User" u where not exists
                                     (select 1 from "Wallet" w where w."userId"=u.id))::int as walletless`);
  console.log(`  users=${wc.users}  wallets=${wc.wallets}  users with NO wallet row=${wc.walletless}`);

  // ---- 5. ESCROW — money in market pools ------------------------------------------------
  console.log("\n=== 5. ESCROW: POOL:{marketId} — players' stakes the house is HOLDING ===");
  const [poolAll] = await q(c, `
    select count(distinct account)::int as accounts, count(*)::int as entries,
           coalesce(sum(amount),0)::numeric as bal
      from "LedgerEntry" where account like 'POOL:%'`);
  console.log(`  ${poolAll.accounts} pool accounts, ${poolAll.entries} entries, net ${tzs(poolAll.bal)}`);

  // Split by the state of the market the pool belongs to. A pool on an unsettled market is
  // live escrow; a NON-ZERO pool on a SETTLED market is a residual — stranded money.
  const poolByState = await q(c, `
    with pools as (
      select replace(account, 'POOL:', '') as market_id, sum(amount)::numeric as bal
        from "LedgerEntry" where account like 'POOL:%' group by 1
    )
    select case when m.id is null then '(market row missing)'
                when m."settledAt" is not null then 'SETTLED'
                else m.status::text end as state,
           count(*)::int as pools, sum(p.bal)::numeric as total,
           count(*) filter (where p.bal <> 0)::int as nonzero,
           sum(p.bal) filter (where p.bal <> 0)::numeric as nonzero_total
      from pools p left join "PredictionMarket" m on m.id = p.market_id
     group by 1 order by 3 desc nulls last`);
  console.log(`  ${pad("market state", 24)}${rpad("pools", 8)}${rpad("net held", 20)}${rpad("non-zero", 10)}${rpad("of which", 18)}`);
  let liveEscrow = 0, residual = 0;
  for (const r of poolByState) {
    const isLive = !["SETTLED", "(market row missing)"].includes(r.state);
    if (isLive) liveEscrow += n(r.total); else residual += n(r.nonzero_total);
    console.log(`  ${pad(r.state, 24)}${rpad(r.pools, 8)}${rpad(tzs(r.total), 20)}${rpad(r.nonzero, 10)}${rpad(tzs(r.nonzero_total), 18)}`);
  }
  console.log(`  ${"-".repeat(80)}`);
  console.log(`  LIVE ESCROW (unsettled markets — players' money, not ours): ${tzs(liveEscrow)}`);
  console.log(`  RESIDUAL on SETTLED markets (should be 0.00):               ${tzs(residual)}`);

  const residuals = await q(c, `
    with pools as (
      select replace(account, 'POOL:', '') as market_id, sum(amount)::numeric as bal, count(*)::int as entries
        from "LedgerEntry" where account like 'POOL:%' group by 1
    )
    select p.market_id, p.bal::text as bal, p.entries, m.status::text as status,
           m."productLine" as pl, m."settledAt"::text as settled
      from pools p join "PredictionMarket" m on m.id = p.market_id
     where m."settledAt" is not null and p.bal <> 0
     order by p.bal limit 30`);
  console.log(`\n  settled markets with a NON-ZERO pool residual: ${residuals.length}${residuals.length === 30 ? " (capped at 30)" : ""}`);
  for (const r of residuals) {
    console.log(`    ${n(r.bal) < 0 ? "🔴" : "⚠️ "} POOL:${r.market_id}  bal=${r.bal}  ${r.pl}/${r.status}  settled=${r.settled}`);
  }

  // ---- 6. THE PLAYER-SIDE LEDGER ACCOUNTS ----------------------------------------------
  console.log("\n=== 6. PLAYER LEDGER ACCOUNTS (the ledger's own view of what we owe) ===");
  const pl = await q(c, `
    select case when account like 'PLAYER_BONUS:%' then 'PLAYER_BONUS' else 'PLAYER' end as kind,
           count(distinct account)::int as accounts, count(*)::int as entries, sum(amount)::numeric as bal
      from "LedgerEntry" where account like 'PLAYER:%' or account like 'PLAYER_BONUS:%'
     group by 1 order by 1`);
  for (const r of pl) console.log(`  ${pad(r.kind, 14)}${rpad(r.accounts, 8)} accounts  ${rpad(r.entries, 8)} entries  ${rpad(tzs(r.bal), 20)}`);

  console.log("\n=== 6b. EXTERNAL:{provider} — the CONTRA account for money crossing the boundary ===");
  console.log("  ⚠️ This is NOT a cash balance. It is the negative mirror of net deposits-minus-withdrawals.");
  const ext = await q(c, `
    select account, sum(amount)::numeric as bal, count(*)::int as entries
      from "LedgerEntry" where account like 'EXTERNAL:%' group by account order by sum(amount)`);
  for (const r of ext) console.log(`  ${pad(r.account, 26)}${rpad(tzs(r.bal), 20)}  ${r.entries} entries`);

  // ---- 7. DEPOSITS vs WITHDRAWALS, CONFIRMED ONLY --------------------------------------
  console.log("\n=== 7. DEPOSITS vs WITHDRAWALS — CONFIRMED ONLY (Transaction table) ===");
  const dw = await q(c, `
    select type::text as type, count(*)::int as n, sum(amount)::numeric as gross,
           sum(fee)::numeric as fee, sum("taxWithheld")::numeric as tax,
           min("createdAt")::text as first, max("createdAt")::text as last
      from "Transaction" where status='CONFIRMED' and type in ('DEPOSIT','WITHDRAWAL')
     group by type order by type`);
  let dep = 0, wdr = 0, wdrFee = 0;
  for (const r of dw) {
    if (r.type === "DEPOSIT") dep = n(r.gross); else { wdr = n(r.gross); wdrFee = n(r.fee); }
    console.log(`  ${pad(r.type, 12)}n=${rpad(r.n, 5)}  gross=${rpad(tzs(r.gross), 18)}  fee=${rpad(tzs(r.fee), 14)}  tax=${rpad(tzs(r.tax), 12)}`);
    console.log(`  ${" ".repeat(12)}${r.first} → ${r.last}`);
  }
  console.log(`  ${"-".repeat(78)}`);
  console.log(`  NET CASH IN (confirmed deposits − confirmed withdrawals): ${tzs(dep - wdr)}`);
  console.log(`  total fee charged on confirmed withdrawals:               ${tzs(wdrFee)}`);
  console.log(`    ⚠️ that fee is SPLIT: gateway share → HOUSE:AGGREGATOR, remainder → HOUSE:COMMISSION.`);
  console.log(`       The split is NOT stored on the txn row — only the total is. It is recomputed at confirm.`);

  const dwAll = await q(c, `
    select type::text as type, status::text as status, count(*)::int as n, sum(amount)::numeric as gross
      from "Transaction" where type in ('DEPOSIT','WITHDRAWAL') group by 1,2 order by 1,2`);
  console.log(`\n  every deposit/withdrawal by status (so CONFIRMED-only is not read as the whole story):`);
  for (const r of dwAll) console.log(`    ${pad(r.type, 12)}${pad(r.status, 12)}n=${rpad(r.n, 5)}  ${rpad(tzs(r.gross), 18)}`);

  // ---- 8. UNCLAIMED / STRANDED MONEY ----------------------------------------------------
  console.log("\n=== 8. UNCLAIMED / STRANDED MONEY ===");

  const [rg] = await q(c, `select coalesce(sum(amount),0)::numeric as bal, count(*)::int as n
                             from "LedgerEntry" where account='HOUSE:RG_SUSPENSE'`);
  console.log(`  HOUSE:RG_SUSPENSE (deposits after self-exclusion, owed BACK to a player): ${tzs(rg.bal)} across ${rg.n} entries`);

  const stuckWd = await q(c, `
    select status::text as status, count(*)::int as n, sum(amount)::numeric as total,
           min("createdAt")::text as oldest
      from "Transaction" where type='WITHDRAWAL' and status in ('PENDING','PROCESSING','AML_REVIEW')
     group by status order by status`);
  const stuckTotal = stuckWd.reduce((s, r) => s + n(r.total), 0);
  console.log(`  in-flight withdrawals (money in Wallet.hold, left the balance, not yet paid): ${tzs(stuckTotal)}`);
  for (const r of stuckWd) console.log(`    ${pad(r.status, 12)}n=${rpad(r.n, 4)} ${rpad(tzs(r.total), 18)}  oldest=${r.oldest}`);

  const [openPos] = await q(c, `
    select count(*)::int as n, coalesce(sum(stake),0)::numeric as stake
      from "Position" where status='OPEN'`);
  console.log(`  OPEN positions: ${openPos.n} holding ${tzs(openPos.stake)} of stake`);

  const overdue = await q(c, `
    select m.id, m.status::text as status, m."productLine" as pl,
           m."objectionsClosedAt"::text as obj_closed,
           round(extract(epoch from (now() - m."objectionsClosedAt"))/3600.0, 1)::text as hours_overdue,
           (select count(*) from "Position" p where p."marketId"=m.id and p.status='OPEN')::int as open_pos,
           (select coalesce(sum(p.stake),0) from "Position" p where p."marketId"=m.id and p.status='OPEN')::numeric as stake
      from "PredictionMarket" m
     where m.status in ('RESOLVED','VOIDED') and m."settledAt" is null
       and (m."objectionsClosedAt" is null or m."objectionsClosedAt" < now())
     order by m."objectionsClosedAt" nulls first limit 30`);
  const overdueMoney = overdue.reduce((s, r) => s + n(r.stake), 0);
  console.log(`  🔴 markets adjudicated, objection window CLOSED, still NOT settled: ${overdue.length} holding ${tzs(overdueMoney)}`);
  for (const r of overdue.slice(0, 15)) {
    console.log(`    ${r.id}  ${r.pl}/${r.status}  openPos=${r.open_pos}  stake=${tzs(r.stake)}  overdue=${r.hours_overdue}h  objClosed=${r.obj_closed}`);
  }

  const [frozen] = await q(c, `
    select count(*)::int as n, coalesce(sum(balance + hold),0)::numeric as owed
      from "Wallet" where status <> 'ACTIVE'`);
  console.log(`  money in FROZEN/CLOSED wallets (owed, but excluded from the console's liability): ${tzs(frozen.owed)} across ${frozen.n} wallets`);

  const [orphanBonus] = await q(c, `
    select coalesce(sum("remainingTzs"),0)::numeric as remaining, count(*)::int as n
      from "BonusGrant" where status='ACTIVE'`);
  console.log(`  ACTIVE BonusGrant remaining: ${tzs(orphanBonus.remaining)} across ${orphanBonus.n} grants`);
  console.log(`    (schema invariant: this must equal Σ Wallet.bonusBalance = ${tzs(bonusAll)} → drift ${tzs(n(orphanBonus.remaining) - bonusAll)})`);

  // ---- 9. THE CONSERVATION / TRIAL-BALANCE CHECK ----------------------------------------
  console.log("\n=== 9. TRIAL BALANCE — the conservation checks trialBalance() runs ===");

  const [glob] = await q(c, `select coalesce(sum(amount),0)::numeric as s, count(*)::int as n from "LedgerEntry"`);
  const globOk = Math.abs(n(glob.s)) <= 0.5;
  console.log(`  §1 GLOBAL CONSERVATION  Σ(every ledger amount) = ${tzs(glob.s)} over ${glob.n} entries`);
  console.log(`     ${globOk ? "✓ balanced (|Σ| ≤ 0.5 TZS, the DRIFT_TOL in ledger.ts:610)" : "🔴 THE BOOKS DO NOT BALANCE"}`);

  const bad = await q(c, `
    select "groupId", sum(amount)::numeric as s, count(*)::int as lines,
           min("createdAt")::text as at, string_agg(distinct "entryType"::text, ',') as types
      from "LedgerEntry" group by "groupId" having abs(sum(amount)) > 0.005
     order by abs(sum(amount)) desc limit 20`);
  console.log(`  §2 IMBALANCED GROUPS (|Σ| > 0.005 within one groupId): ${bad.length}`);
  for (const b of bad) console.log(`     🔴 ${b.groupId}  Σ=${b.s}  lines=${b.lines}  types=${b.types}  at=${b.at}`);

  // ledger(PLAYER:{userId}) must equal Wallet.balance + Wallet.hold
  const drift = await q(c, `
    with lp as (
      select replace(account, 'PLAYER:', '') as user_id, sum(amount)::numeric as bal
        from "LedgerEntry" where account like 'PLAYER:%' group by 1
    )
    select coalesce(lp.user_id, w."userId") as user_id,
           coalesce(lp.bal, 0)::text as ledger,
           coalesce(w.balance + w.hold, 0)::text as wallet,
           (coalesce(lp.bal,0) - coalesce(w.balance + w.hold,0))::numeric as diff,
           w.status::text as wstatus
      from lp full outer join "Wallet" w on w."userId" = lp.user_id
     where abs(coalesce(lp.bal,0) - coalesce(w.balance + w.hold,0)) > 0.005
     order by abs(coalesce(lp.bal,0) - coalesce(w.balance + w.hold,0)) desc limit 25`);
  const [checked] = await q(c, `select count(distinct account)::int as n from "LedgerEntry" where account like 'PLAYER:%'`);
  console.log(`  §3 ledger(PLAYER:{u}) == Wallet.balance + Wallet.hold — accounts checked: ${checked.n}, drifting: ${drift.length}`);
  for (const d of drift) console.log(`     🔴 ${d.user_id} ledger=${d.ledger} wallet=${d.wallet} diff=${d.diff} status=${d.wstatus ?? "NO WALLET"}`);

  const bdrift = await q(c, `
    with lb as (
      select replace(account, 'PLAYER_BONUS:', '') as user_id, sum(amount)::numeric as bal
        from "LedgerEntry" where account like 'PLAYER_BONUS:%' group by 1
    )
    select coalesce(lb.user_id, w."userId") as user_id, coalesce(lb.bal,0)::text as ledger,
           coalesce(w."bonusBalance",0)::text as wallet
      from lb full outer join "Wallet" w on w."userId" = lb.user_id
     where abs(coalesce(lb.bal,0) - coalesce(w."bonusBalance",0)) > 0.005 limit 25`);
  console.log(`  §4 ledger(PLAYER_BONUS:{u}) == Wallet.bonusBalance — drifting: ${bdrift.length}`);
  for (const d of bdrift) console.log(`     🔴 ${d.user_id} ledger=${d.ledger} wallet=${d.wallet}`);

  // ---- 9b. THE TWO MEASURES OF HOUSE REVENUE, RECONCILED --------------------------------
  // The console derives GGR from the Transaction table (report-money `summarise`); the ledger
  // derives commission from LedgerEntry. Nothing in src/ has ever compared them.
  console.log("\n=== 9b. GGR (Transaction table) vs COMMISSION (ledger) — never compared in src/ ===");
  const [g] = await q(c, `select
    (select coalesce(sum(abs(amount)),0) from "Transaction" where status='CONFIRMED' and type='BET_PLACED')::numeric as stakes,
    (select coalesce(sum(abs(amount)),0) from "Transaction" where status='CONFIRMED' and type in ('BET_PAYOUT','CASHOUT'))::numeric as payouts,
    (select coalesce(sum(abs(amount)),0) from "Transaction" where status='CONFIRMED' and type='BET_REFUND')::numeric as refunds,
    (select coalesce(sum(amount),0) from "Transaction" where status='CONFIRMED' and type='BONUS_CREDIT')::numeric as bonuscost,
    (select coalesce(sum(fee),0) from "Transaction" where status='CONFIRMED' and type in ('DEPOSIT','WITHDRAWAL'))::numeric as fees`);
  const ggr = n(g.stakes) - n(g.payouts) - n(g.refunds);
  const settleComm = n(byType.find((r) => r.t === "SETTLEMENT_COMMISSION")?.total);
  console.log(`  stakes ${tzs(g.stakes)}  − payouts ${tzs(g.payouts)}  − refunds ${tzs(g.refunds)}`);
  console.log(`  GGR (the canonical console figure, all-time)      = ${tzs(ggr)}`);
  console.log(`  NGR = GGR − bonusCost ${tzs(g.bonuscost)} − fees ${tzs(g.fees)} = ${tzs(ggr - n(g.bonuscost) - n(g.fees))}`);
  console.log(`  LEDGER SETTLEMENT_COMMISSION (what was actually booked) = ${tzs(settleComm)}`);
  console.log(`  ⚠️ GGR − open-position stake still in escrow = ${tzs(ggr)} − ${tzs(liveEscrow)} = ${tzs(ggr - liveEscrow)}`);
  console.log(`     against booked settlement commission ${tzs(settleComm)} → residual ${tzs(ggr - liveEscrow - settleComm)}`);
  console.log(`  ⛔ GGR counts an UNSETTLED stake as revenue. It only equals the booked commission`);
  console.log(`     after the money still sitting in open pools is taken out.`);

  // ---- 9c. PROVENANCE THAT HAS BEEN DESTROYED -------------------------------------------
  // LedgerEntry is append-only; PredictionMarket is not. A deleted market takes the "where
  // did this come from" answer with it, and the ledger row survives pointing at nothing.
  console.log("\n=== 9c. DANGLING PROVENANCE — ledger rows pointing at markets that no longer exist ===");
  const [dang] = await q(c, `
    select count(distinct l."marketId")::int as markets, count(*)::int as entries,
           coalesce(sum(case when l.account like 'POOL:%' and l.amount > 0 then l.amount else 0 end),0)::numeric as staked,
           coalesce(sum(case when l.account='HOUSE:COMMISSION' then l.amount else 0 end),0)::numeric as commission
      from "LedgerEntry" l left join "PredictionMarket" m on m.id = l."marketId"
     where l."marketId" is not null and m.id is null`);
  console.log(`  markets referenced by the ledger but ABSENT from PredictionMarket: ${dang.markets}`);
  console.log(`  ledger entries stranded on them: ${dang.entries}, carrying ${tzs(dang.staked)} of stake`);
  console.log(`  HOUSE:COMMISSION booked against a market that no longer exists: ${tzs(dang.commission)}`);
  const commByMkt = n(byType.find((r) => r.t === "SETTLEMENT_COMMISSION")?.total);
  if (commByMkt > 0) console.log(`  = ${((n(dang.commission) / commByMkt) * 100).toFixed(1)}% of all settlement commission is UNATTRIBUTABLE`);

  // ---- 9d. HOW MUCH OF THE PLAYER LIABILITY IS REAL MONEY -------------------------------
  console.log("\n=== 9d. WHERE PLAYER MONEY CAME FROM — real deposits vs synthetic admin credit ===");
  const flows = await q(c, `
    select "entryType"::text as t, case when amount > 0 then 'IN' else 'OUT' end as dir,
           sum(amount)::numeric as total, count(*)::int as n
      from "LedgerEntry" where account like 'PLAYER:%'
     group by 1,2 order by 2 desc, abs(sum(amount)) desc`);
  for (const r of flows) console.log(`  ${pad(r.dir, 4)}${pad(r.t, 24)}${rpad(tzs(r.total), 20)}  ${r.n} entries`);
  const depIn = n(flows.find((r) => r.t === "DEPOSIT" && r.dir === "IN")?.total);
  const adjIn = n(flows.find((r) => r.t === "ADJUSTMENT" && r.dir === "IN")?.total);
  console.log(`  ${"-".repeat(70)}`);
  console.log(`  real money in (confirmed DEPOSIT):            ${rpad(tzs(depIn), 20)}`);
  console.log(`  synthetic money in (admin ADJUSTMENT credit): ${rpad(tzs(adjIn), 20)}`);
  if (depIn + adjIn > 0) console.log(`  ⛔ ${((adjIn / (depIn + adjIn)) * 100).toFixed(1)}% of the money ever credited to a player wallet never came from a payment provider.`);
  console.log(`     The ${tzs(liabAll)} player liability is therefore NOT ${tzs(liabAll)} of real cash owed.`);

  // ---- 9e. THE DEAD HousePoolLedger TABLE — does it hold data? --------------------------
  if (tables.includes("HousePoolLedger")) {
    const [hp] = await q(c, `select count(*)::int as n, min("createdAt")::text as first, max("createdAt")::text as last from "HousePoolLedger"`);
    console.log(`\n=== 9e. HousePoolLedger (no reader, no writer in src/) — rows on prod: ${hp.n} ===`);
    if (hp.n > 0) {
      console.log(`  ⚠️ NOT EMPTY. ${hp.first} → ${hp.last}. It is a real historical record of an abandoned`);
      console.log(`     house-liquidity feature, and it is NOT part of the double-entry ledger's conservation.`);
      for (const r of await q(c, `select type::text as t, count(*)::int as n, sum(amount)::numeric as total from "HousePoolLedger" group by 1 order by 3`)) {
        console.log(`     ${pad(r.t, 16)}${rpad(tzs(r.total), 20)}  ${r.n} rows`);
      }
      const [last] = await q(c, `select "balanceAfter"::text as ba, "createdAt"::text as at from "HousePoolLedger" order by "createdAt" desc limit 1`);
      console.log(`     last balanceAfter = TZS ${last.ba} at ${last.at} — frozen, nothing has written since.`);
    }
  }

  // ---- 10. THE BALANCE SHEET ------------------------------------------------------------
  console.log("\n=== 10. THE BALANCE SHEET — what the house OWNS vs what it merely HOLDS ===");
  const playerLedger = n(pl.find((r) => r.kind === "PLAYER")?.bal);
  const bonusLedger = n(pl.find((r) => r.kind === "PLAYER_BONUS")?.bal);
  console.log(`  HOUSE EQUITY (money the house OWNS)`);
  console.log(`    HOUSE:COMMISSION, net of TRA+GBT, lifetime, never drawn down   ${rpad(tzs(equity), 20)}`);
  console.log(`\n  MONEY THE HOUSE HOLDS BUT OWES`);
  console.log(`    to players — wallet balances + holds (ALL statuses)            ${rpad(tzs(liabAll), 20)}`);
  console.log(`    to players — bonus liability (non-withdrawable)                ${rpad(tzs(bonusAll), 20)}`);
  console.log(`    in escrow  — live market pools (unsettled)                     ${rpad(tzs(liveEscrow), 20)}`);
  console.log(`    to the state + gateway + RG suspense (HOUSE:* non-equity)      ${rpad(tzs(heldHouse), 20)}`);
  console.log(`    ${"-".repeat(64)}`);
  console.log(`    TOTAL OWED                                                     ${rpad(tzs(liabAll + bonusAll + liveEscrow + heldHouse), 20)}`);
  console.log(`\n  ⛔ EQUITY AND HELD ARE NOT ADDED. They are not the same kind of number, and`);
  console.log(`     HOUSE:COMMISSION is an ACCRUED lifetime position, not cash on hand.`);
  console.log(`\n  ⛔ THERE IS NO CASH POSITION IN THIS DATABASE. No table holds a bank balance, a`);
  console.log(`     mobile-money float, or a provider settlement balance. EXTERNAL:{provider} is a`);
  console.log(`     contra account, not cash. So none of the above can be checked against real money.`);

  await c.end();
})().catch((e) => { console.error("PROBE FAILED:", e.message); process.exit(1); });
