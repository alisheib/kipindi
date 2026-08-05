/**
 * A round on OUR BTC 5m chain, PAIRED TO THE SHILLING — positions, wallets and every
 * ledger leg that touched its pool.
 *
 *   node .qa-s28/round.cjs [roundId]
 *
 * ⚠️ Every timestamp is `::text`-cast: node-postgres builds a JS Date from a
 * `timestamp WITHOUT time zone` using the LAPTOP's zone, shifting UTC by −3h here (§3).
 * ⛔ And a DB read gives STATE, not REASON — `voidReason` is printed, never inferred.
 */
const { Client } = require("pg");

const OUR_CHAIN = "udc_2ba58e2e2c13a7f8";      // BTC 5m, created by this campaign
const want = (process.argv[2] || "").replace(/[^a-z0-9_]/gi, "");
const tzs = (n) => Number(n).toLocaleString();

const url = (process.env.DATABASE_URL || "")
  .replace(/@postgres\.railway\.internal(:\d+)?/, "@turntable.proxy.rlwy.net:40357");

(async () => {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const q = (sql, a) => c.query(sql, a).then((r) => r.rows);

  console.log(`\nserver now: ${(await q(`select now()::text as at`))[0].at}`);

  const rounds = await q(`
    select r.id, r."roundNumber" as n, r."marketId" as market,
           r."opensAt"::text as opens, r."closesAt"::text as closes, r."boundaryAt"::text as boundary,
           r."openPrice"::text as open_price, r."closePrice"::text as close_price,
           r."upTarget"::text as up_t, r."downTarget"::text as down_t, r."marginBps" as margin,
           r.outcome::text as outcome, r."voidReason" as void_reason,
           r."resolvedAt"::text as resolved, r."settledAt"::text as settled
      from "UpDownRound" r
     where r."chainId" = $1 ${want ? `and r.id = '${want}'` : ""}
     order by r."roundNumber" desc limit ${want ? 1 : 2}`, [OUR_CHAIN]);

  for (const r of rounds) {
    console.log(`\n══ round #${r.n} ${r.id} ══════════════════════════════════`);
    console.log(`   market ${r.market}`);
    console.log(`   opens ${r.opens} · lock ${r.closes} · boundary ${r.boundary}`);
    console.log(`   margin=${r.margin}bps  open=${r.open_price ?? "-"}  close=${r.close_price ?? "-"}`);
    console.log(`   targets  UP ≥ ${r.up_t ?? "-"}   DOWN ≤ ${r.down_t ?? "-"}`);
    console.log(`   outcome=${r.outcome ?? "(unresolved)"} void=${r.void_reason ?? "-"} resolved=${r.resolved ?? "-"} settled=${r.settled ?? "-"}`);

    const pos = await q(`
      select u."phoneE164" as phone, u."displayName" as name, p.side::text as side,
             p.stake::text as stake, p.status::text as status,
             p."finalPayout"::text as payout, p."potentialPayout"::text as potential,
             coalesce(w.balance,0)::text as balance
        from "Position" p
        join "User" u on u.id = p."userId"
        left join "Wallet" w on w."userId" = u.id
       where p."marketId" = $1 order by p.side, p.stake::numeric desc`, [r.market]);

    let yes = 0, no = 0, paid = 0;
    if (pos.length) {
      console.log(`\n   positions (${pos.length}) — YES = UP, NO = DOWN:`);
      for (const p of pos) {
        if (p.side === "YES") yes += Number(p.stake); else no += Number(p.stake);
        paid += Number(p.payout ?? 0);
        console.log(`     ${String(p.name).padEnd(13)} ${p.side === "YES" ? "UP  " : "DOWN"} ` +
          `stake ${tzs(p.stake).padStart(7)}  ${String(p.status).padEnd(9)} ` +
          `payout ${(p.payout == null ? "—" : tzs(p.payout)).padStart(8)}  wallet ${tzs(p.balance).padStart(9)}`);
      }
      const pool = yes + no, smaller = Math.min(yes, no);
      console.log(`\n   UP ${tzs(yes)} · DOWN ${tzs(no)} · POOL ${tzs(pool)} · smaller side ${tzs(smaller)}`);
      console.log(`   fee model: min(13%·pool = ${tzs(Math.floor(0.13 * pool))}, ⅓·smaller = ${tzs(Math.floor(smaller / 3))}) ` +
        `= ${tzs(Math.min(Math.floor(0.13 * pool), Math.floor(smaller / 3)))}  ` +
        `[${0.13 * pool <= smaller / 3 ? "the 13% BINDS" : "the ⅓ CEILING BINDS"}]`);
      console.log(`   total paid out: ${tzs(paid)}`);
    } else {
      console.log(`   positions: NONE`);
    }

    // ── every ledger leg in any group that touched THIS market's pool ─────────
    const led = await q(`
      select l.account, l."entryType"::text as t, l.amount::text as amount,
             l."groupId" as grp, l.memo, l."createdAt"::text as at
        from "LedgerEntry" l
       where l."groupId" in (select distinct "groupId" from "LedgerEntry" where account = $1)
       order by l."createdAt", l.account`, [`POOL:${r.market}`]);

    if (led.length) {
      console.log(`\n   ledger legs touching POOL:${r.market} (${led.length}):`);
      const byAccount = new Map(); const byGroup = new Map();
      for (const l of led) {
        const key = l.account.startsWith("PLAYER:") ? "PLAYER:*" : l.account;
        byAccount.set(key, (byAccount.get(key) ?? 0) + Number(l.amount));
        byGroup.set(l.grp, (byGroup.get(l.grp) ?? 0) + Number(l.amount));
      }
      for (const [a, v] of [...byAccount].sort()) console.log(`     ${a.padEnd(34)} ${tzs(v).padStart(12)}`);
      const total = [...byAccount.values()].reduce((s, v) => s + v, 0);
      const badGroups = [...byGroup].filter(([, v]) => Math.abs(v) > 0.005);
      console.log(`     ${"".padEnd(34)} ${"—".padStart(12)}`);
      console.log(`     ${"TOTAL".padEnd(34)} ${tzs(total).padStart(12)}  ${Math.abs(total) < 0.005 ? "✅ balanced" : "🔴 NOT ZERO"}`);
      console.log(`     ${byGroup.size} ledger group(s); ${badGroups.length === 0 ? "every one sums to zero ✅" : `🔴 ${badGroups.length} imbalanced`}`);
    } else {
      console.log(`\n   ledger: no legs yet (nothing has settled)`);
    }
  }

  await c.end();
})().catch((e) => { console.error("ERROR", e.message); process.exit(1); });
