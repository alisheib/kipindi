/**
 * ⭐ THE NUMBERS ON `/admin/insights`, CHECKED AGAINST THE DATABASE — not against each other.
 *
 * Ali's instruction for session 29: *"With a funded fleet the roster, cohorts, insights and
 * reports finally have data in them — check those numbers against the DB, not against each
 * other."* This computes each headline and each funnel stage from raw rows, so the console can
 * be compared against a source that does not share its code.
 */
const { Client } = require("pg");
const url = (process.env.DATABASE_URL || "")
  .replace(/@postgres\.railway\.internal(:\d+)?/, "@turntable.proxy.rlwy.net:40357");

(async () => {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const one = async (sql) => Number((await c.query(sql)).rows[0].n);

  const players     = await one(`select count(*) n from "User" where "role" = 'PLAYER'`);
  const kycApproved = await one(`select count(distinct k."userId") n from "KycSubmission" k join "User" u on u.id = k."userId" where k."status" = 'APPROVED' and u."role" = 'PLAYER'`);
  const deposited   = await one(`select count(distinct t."userId") n from "Transaction" t join "User" u on u.id = t."userId" where t."type" = 'DEPOSIT' and t."status" = 'CONFIRMED' and u."role" = 'PLAYER'`);
  const bettors     = await one(`select count(distinct p."userId") n from "Position" p join "User" u on u.id = p."userId" where u."role" = 'PLAYER'`);

  console.log("── the funnel's four stages, from raw rows ──");
  console.log(`   REGISTERED    ${String(players).padStart(5)}`);
  console.log(`   KYC APPROVED  ${String(kycApproved).padStart(5)}   ${((kycApproved / players) * 100).toFixed(0)}% of registered`);
  console.log(`   DEPOSITED     ${String(deposited).padStart(5)}   ${((deposited / players) * 100).toFixed(0)}% of registered   ${((deposited / Math.max(1, kycApproved)) * 100).toFixed(0)}% of the stage above`);
  console.log(`   PLACED A BET  ${String(bettors).padStart(5)}   ${((bettors / players) * 100).toFixed(0)}% of registered   ${((bettors / Math.max(1, deposited)) * 100).toFixed(0)}% of the stage above`);

  // ⭐ THE POINT. These stages are NOT nested on this platform, so "conversion from the previous
  // stage" is not a quantity that exists — and the console prints it anyway.
  const notNested = [];
  const betNoDeposit = await one(`
    select count(*) n from (
      select p."userId" from "Position" p join "User" u on u.id = p."userId" where u."role" = 'PLAYER'
      except
      select t."userId" from "Transaction" t where t."type" = 'DEPOSIT' and t."status" = 'CONFIRMED'
    ) x`);
  const depositNoKyc = await one(`
    select count(*) n from (
      select t."userId" from "Transaction" t join "User" u on u.id = t."userId"
       where t."type" = 'DEPOSIT' and t."status" = 'CONFIRMED' and u."role" = 'PLAYER'
      except
      select k."userId" from "KycSubmission" k where k."status" = 'APPROVED'
    ) x`);
  if (betNoDeposit) notNested.push(`${betNoDeposit} player(s) PLACED A BET without a confirmed DEPOSIT`);
  if (depositNoKyc) notNested.push(`${depositNoKyc} player(s) DEPOSITED without APPROVED KYC`);

  console.log("\n── are the stages actually nested? (a funnel's whole premise) ──");
  if (!notNested.length) console.log("   yes — every stage is a subset of the one above it");
  for (const s of notNested) console.log(`   🔴 NO — ${s}`);

  console.log("\n── headline KPIs ──");
  const ltv = await one(`
    select coalesce(sum(case when t."type" = 'BET_PLACED' then abs(t."amount")
                             when t."type" in ('BET_PAYOUT','BET_REFUND','CASHOUT') then -abs(t."amount")
                             else 0 end), 0) n
      from "Transaction" t join "User" u on u.id = t."userId"
     where u."role" = 'PLAYER' and t."status" = 'CONFIRMED'`);
  console.log(`   PLAYERS        ${players}`);
  console.log(`   HAVE BET       ${bettors}`);
  console.log(`   LIFETIME GGR   ${ltv.toLocaleString()}   (stakes − payouts − refunds − cashouts, CONFIRMED only)`);
  console.log(`   GGR PER PLAYER ${players ? Math.round(ltv / players).toLocaleString() : 0}`);

  await c.end();
})().catch((e) => { console.error("ERROR", e.message); process.exit(1); });
