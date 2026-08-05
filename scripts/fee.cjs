/**
 * THE FEE, LEG BY LEG — is `fee <= feeCeilingRate x smallerSide` actually held on a real pool?
 *
 *   node .qa-s28/fee.cjs <marketId>
 *
 * ⛔ AGGREGATES HID THIS. Summing `LedgerEntry` by account said HOUSE took 3,668 while the
 * ceiling is 11,000/3 = 3,666.67 — but an aggregate cannot say whether that is one fee that
 * breached the cap or many per-position fees each rounded up. Those are a defect and a
 * rounding policy respectively, and they are not the same finding. So: read the LEGS.
 */
const { Client } = require("pg");

const market = (process.argv[2] || "").replace(/[^a-z0-9_]/gi, "");
if (!market) { console.error("usage: node .qa-s28/fee.cjs <marketId>"); process.exit(2); }
const url = (process.env.DATABASE_URL || "")
  .replace(/@postgres\.railway\.internal(:\d+)?/, "@turntable.proxy.rlwy.net:40357");

(async () => {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const q = (sql, a) => c.query(sql, a).then((r) => r.rows);

  console.log(`\n── who actually holds the positions on ${market} ──`);
  for (const u of await q(`
    select p."userId", coalesce(u."displayName",'(null name)') as name, u."phoneE164" as phone,
           u.role::text as role, count(*) as positions, sum(p.stake)::text as staked,
           string_agg(distinct p.side::text, ',') as sides
      from "Position" p join "User" u on u.id = p."userId"
     where p."marketId" = $1 group by p."userId", u."displayName", u."phoneE164", u.role
     order by sum(p.stake) desc`, [market]))
    console.log(`   ${u.userId}  ${String(u.name).padEnd(16)} ${String(u.phone ?? "-").padEnd(15)} ${String(u.role).padEnd(7)} ${String(u.positions).padStart(3)} pos  ${Number(u.staked).toLocaleString().padStart(8)}  sides=${u.sides}`);

  console.log(`\n── the market's own frozen rate profile ──`);
  // ⭐ THE RATES ARE FROZEN ONTO THE MARKET (`feeSnapshot`), not read live at settlement —
  // so this is the ONLY authority on what this pool was priced at. Reading the admin config
  // instead would answer a different question, and that difference is a whole finding class.
  for (const m of await q(`
    select id, "titleEn" as title, status::text as status, "resolvedOutcome" as outcome,
           "yesPool"::text as yes_pool, "noPool"::text as no_pool,
           "predictorCount" as predictors, "feeSnapshot"::text as snap, "settledAt"::text as settled
      from "PredictionMarket" where id = $1`, [market])) {
    console.log(`   ${m.title}`);
    console.log(`   status=${m.status} outcome=${m.outcome} settled=${m.settled}`);
    console.log(`   yesPool=${m.yes_pool} noPool=${m.no_pool} predictorCount=${m.predictors}`);
    console.log(`   feeSnapshot=${m.snap}`);
  }

  console.log(`\n── every HOUSE leg on this market's pool ──`);
  const house = await q(`
    select l.account, l.amount::text as amount, l.memo, l."groupId" as grp, l."createdAt"::text as at
      from "LedgerEntry" l
     where l."groupId" in (select distinct "groupId" from "LedgerEntry" where account = $1)
       and l.account like 'HOUSE:%'
     order by l."createdAt", l.account`, [`POOL:${market}`]);
  let houseTotal = 0;
  for (const h of house) { houseTotal += Number(h.amount); console.log(`   ${h.account.padEnd(20)} ${Number(h.amount).toLocaleString().padStart(9)}  grp=${h.grp}  ${h.memo ?? ""}`); }
  console.log(`   HOUSE total: ${houseTotal.toLocaleString()}  (${house.length} legs)`);

  console.log(`\n── the POOL account's own running balance ──`);
  const pool = await q(`
    select "entryType"::text as t, amount::text as amount, "groupId" as grp, "createdAt"::text as at
      from "LedgerEntry" where account = $1 order by "createdAt"`, [`POOL:${market}`]);
  const inflow = pool.filter((p) => Number(p.amount) > 0).reduce((s, p) => s + Number(p.amount), 0);
  const outflow = pool.filter((p) => Number(p.amount) < 0).reduce((s, p) => s + Number(p.amount), 0);
  console.log(`   ${pool.length} legs · in ${inflow.toLocaleString()} · out ${outflow.toLocaleString()} · NET ${(inflow + outflow).toLocaleString()}`);
  const byType = new Map();
  for (const p of pool) byType.set(p.t, (byType.get(p.t) ?? 0) + Number(p.amount));
  for (const [t, v] of byType) console.log(`     ${t.padEnd(14)} ${v.toLocaleString().padStart(10)}`);

  console.log(`\n── the ceiling, checked against what was actually charged ──`);
  const [tot] = await q(`
    select sum(case when side::text='YES' then stake else 0 end)::text as yes,
           sum(case when side::text='NO'  then stake else 0 end)::text as no,
           sum("finalPayout")::text as paid
      from "Position" where "marketId" = $1`, [market]);
  const yes = Number(tot.yes), no = Number(tot.no), poolTotal = yes + no, smaller = Math.min(yes, no);
  console.log(`   YES/UP ${yes.toLocaleString()} · NO/DOWN ${no.toLocaleString()} · pool ${poolTotal.toLocaleString()} · smaller ${smaller.toLocaleString()}`);
  console.log(`   13%·pool      = ${(0.13 * poolTotal).toFixed(2)}`);
  console.log(`   ⅓·smaller     = ${(smaller / 3).toFixed(2)}   <- THE CEILING`);
  console.log(`   charged       = ${houseTotal.toFixed(2)}`);
  console.log(`   paid to players = ${Number(tot.paid).toLocaleString()}`);
  console.log(`   paid + charged  = ${(Number(tot.paid) + houseTotal).toLocaleString()}  vs pool ${poolTotal.toLocaleString()}  ` +
    `-> ${(poolTotal - Number(tot.paid) - houseTotal).toFixed(2)} left in POOL`);
  const breach = houseTotal - smaller / 3;
  console.log(`\n   ${breach > 0.005 ? `🔴 the charge EXCEEDS the ceiling by ${breach.toFixed(2)}` : `✅ within the ceiling (headroom ${(-breach).toFixed(2)})`}`);

  await c.end();
})().catch((e) => { console.error("ERROR", e.message); process.exit(1); });
