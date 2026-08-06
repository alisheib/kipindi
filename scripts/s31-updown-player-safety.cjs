/**
 * ⭐ IS UP & DOWN SAFE FOR PLAYERS, RIGHT NOW? — read from production, not from the tracker.
 *
 * "Safe" is not one question, so this answers the four it actually decomposes into, and keeps
 * them apart because they have different answers:
 *
 *   1. MONEY — can a round strand, mint or lose a player's stake?
 *   2. EXPOSURE — is anyone's money sitting in a round that will never resolve?
 *   3. FAIRNESS — does a player who wins get paid, and paid the advertised way?
 *   4. EXPERIENCE — a game that is money-safe can still be a bad deal. Measured separately
 *      and NEVER folded into "safe", because the honest answer to Ali differs per question.
 *
 * ⛔ Reads only. Nothing here writes.
 */
const { Client } = require("pg");
const url = (process.env.DATABASE_URL || "")
  .replace(/@postgres\.railway\.internal(:\d+)?/, "@turntable.proxy.rlwy.net:40357");

const n = (v) => Number(v ?? 0);
const tzs = (v) => n(v).toLocaleString();

(async () => {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const q = async (sql) => (await c.query(sql)).rows;

  console.log("═══ 0 · WHAT IS EXPOSED TO PLAYERS AT ALL ═══");
  for (const a of await q(`select "key", "nameEn", enabled from "UpDownAsset" order by "key"`))
    console.log(`   ${a.key.padEnd(5)} ${a.enabled ? "🟢 ENABLED " : "⚪ disabled"}  ${a.nameEn}`);
  for (const ch of await q(`
      select a."key" as asset, ch."durationMinutes" as mins, ch.state
        from "UpDownChain" ch join "UpDownAsset" a on a.id = ch."assetId" order by ch."createdAt"`))
    console.log(`   chain ${String(ch.asset).padEnd(4)} ${String(ch.mins).padStart(3)}m  ${ch.state}`);

  console.log("\n═══ 1 · MONEY — is any player stake stranded or unsettled? ═══");
  const stuck = await q(`
    select r.id, a."key" as asset, r."closesAt"::text as closes,
           round(extract(epoch from (now() - r."closesAt"))/60) as mins_ago,
           (select count(*) from "Position" p where p."marketId" = r."marketId") as positions,
           (select coalesce(sum(p.stake),0) from "Position" p where p."marketId" = r."marketId") as staked
      from "UpDownRound" r
      join "UpDownChain" ch on ch.id = r."chainId"
      join "UpDownAsset" a on a.id = ch."assetId"
     where r.outcome is null and r."closesAt" < now() - interval '10 minutes'
     order by r."closesAt"`);
  console.log(stuck.length === 0
    ? "   ✅ no round is more than 10 minutes past its close without an outcome"
    : `   🔴 ${stuck.length} round(s) past close with NO outcome:`);
  for (const s of stuck) console.log(`      ${s.id} ${s.asset} ${s.mins_ago}m ago · ${s.positions} positions · TZS ${tzs(s.staked)}`);

  const openPos = await q(`
    select count(*) n, coalesce(sum(p.stake),0) staked
      from "Position" p
      join "PredictionMarket" m on m.id = p."marketId"
     where m."productLine" = 'UPDOWN' and p.status = 'OPEN'`);
  console.log(`   OPEN Up & Down positions: ${openPos[0].n} · TZS ${tzs(openPos[0].staked)} at risk`);

  console.log("\n═══ 2 · FAIRNESS — was every winner paid AT LEAST their stake? ═══");
  const belowStake = await q(`
    select p.id, p.stake::text, p."finalPayout"::text
      from "Position" p join "PredictionMarket" m on m.id = p."marketId"
     where m."productLine" = 'UPDOWN' and p.status = 'WIN' and p."finalPayout" < p.stake`);
  console.log(belowStake.length === 0
    ? "   ✅ no winning Up & Down position was ever paid below its stake (the winner floor holds)"
    : `   🔴 ${belowStake.length} winner(s) paid BELOW stake`);
  for (const x of belowStake) console.log(`      ${x.id} stake ${x.stake} → ${x.finalPayout}`);

  const negative = await q(`select count(*) n from "Wallet" where balance < 0`);
  console.log(`   wallets with a NEGATIVE balance: ${negative[0].n}  ${n(negative[0].n) === 0 ? "✅" : "🔴"}`);

  console.log("\n═══ 3 · THE ⅓ PRINTED PROMISE — 'we never take more than a third of what you win' ═══");
  // Per settled UPDOWN market: house take vs one third of the WINNING side's stake.
  const ceiling = await q(`
    with mk as (
      select m.id,
             coalesce(sum(case when p.status='WIN' then p.stake end),0) as win_stake,
             coalesce(sum(case when p.status='LOSS' then p.stake end),0) as lose_stake,
             coalesce(sum(case when p.status='WIN' then p."finalPayout" end),0) as paid
        from "PredictionMarket" m join "Position" p on p."marketId" = m.id
       where m."productLine" = 'UPDOWN' and m.status = 'RESOLVED'
       group by m.id)
    select id, win_stake::text, lose_stake::text, paid::text,
           (win_stake + lose_stake - paid)::text as house_take,
           round(win_stake/3.0, 2)::text as one_third
      from mk
     where win_stake > 0 and (win_stake + lose_stake - paid) > round(win_stake/3.0, 2)
     order by (win_stake + lose_stake - paid) - round(win_stake/3.0,2) desc limit 10`);
  console.log(ceiling.length === 0
    ? "   ✅ no settled round took more than a third of the winning side's stake"
    : `   🟠 ${ceiling.length} round(s) where the house take EXCEEDS ⅓ of the winning stake:`);
  for (const x of ceiling)
    console.log(`      ${x.id}  won ${x.win_stake} lost ${x.lose_stake} paid ${x.paid} → house ${x.house_take} vs ⅓ = ${x.one_third}`);

  console.log("\n═══ 4 · EXPERIENCE — money-safe is not the same as a good deal ═══");
  const outcome = await q(`
    select coalesce(r.outcome::text,'(unresolved)') as outcome, count(*) n
      from "UpDownRound" r group by 1 order by 2 desc`);
  for (const o of outcome) console.log(`   rounds ${String(o.outcome).padEnd(13)} ${o.n}`);
  const paid = await q(`
    select count(*) filter (where w > 0) as paid_a_winner,
           count(*) as settled_with_stake
      from (select m.id, count(*) filter (where p.status='WIN') w
              from "PredictionMarket" m join "Position" p on p."marketId" = m.id
             where m."productLine"='UPDOWN' and m.status='RESOLVED' group by m.id) x`);
  const pw = n(paid[0].paid_a_winner), sw = n(paid[0].settled_with_stake);
  console.log(`   settled rounds that HAD a stake on them: ${sw}`);
  console.log(`   …of those, rounds that PAID A WINNER:    ${pw}  (${sw ? Math.round((pw / sw) * 100) : 0}%)`);
  console.log("   ⚠️ the rest refunded — nobody took the other side. That is the house-float");
  console.log("      decision Ali took on 2026-08-04 and it is NOT BUILT. It is not a money");
  console.log("      defect; it is the reason the game feels empty.");

  await c.end();
})().catch((e) => { console.error("ERROR", e.message); process.exit(1); });
