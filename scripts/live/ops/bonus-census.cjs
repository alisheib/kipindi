#!/usr/bin/env node
/**
 * bonus-census.cjs — READ-ONLY. Every bonus grant on production, and the turnover each has
 * actually accrued.
 *
 *   KP_REPO=F:/kipindi-main node scripts/live/ops/bonus-census.cjs [phoneSuffix]
 *
 * ⭐ WHY THIS EXISTS. `docs/RULES.md` §2.5 — *only one side of a market counts toward a bonus
 * requirement* — has carried a ⏳ for one reason: **production has ZERO grants**, so the rule
 * has never been exercised in a wallet. `npm run test:bonus-one-side` proves it on the real
 * service path, and a suite is not production. This is the instrument for the live proof.
 *
 * ⛔ IT READS `wageredTzs` OFF THE GRANT ROW, never a service return value. A rule about
 * turnover checked against the function that computes turnover proves only that the function
 * is self-consistent — the same reason `bonus-one-side.test.mts` reads the row too.
 *
 * ⚠️ Every timestamp is `::text`: Prisma maps `DateTime` to `timestamp` WITHOUT time zone and
 * node-postgres reads a naive value in the CLIENT's zone. See `chain-stall-census.cjs`.
 */
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require(path.join(process.env.KP_REPO || "F:/kipindi-main", "node_modules", "pg"));

for (const line of fs.readFileSync(path.join(__dirname, ".env"), "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i > 0) process.env[line.slice(0, i)] = line.slice(i + 1).trim();
}

const N = (v) => Number(v ?? 0);
const tzs = (v) => N(v).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

(async () => {
  const suffix = process.argv[2] ?? "";
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  const [meta] = (await c.query(`select current_database() db, (now() at time zone 'utc')::text utc_now,
    (select count(*) from "User")::int users`)).rows;
  console.log(`=== IDENTITY ===\ndb=${meta.db}  now=${meta.utc_now} UTC  users=${meta.users}`);
  console.log("⭐ cross-check users against https://www.50pick.tz/api/health\n");

  const cols = (await c.query(
    `select column_name from information_schema.columns where table_name='BonusGrant' order by ordinal_position`
  )).rows.map((r) => r.column_name);
  console.log(`BonusGrant columns: ${cols.join(", ")}\n`);

  const grants = (await c.query(`
    select g.*, u."phoneE164" phone, u."displayName" who,
           w."bonusBalance"::numeric bonus_bal, w.balance::numeric cash_bal
      from "BonusGrant" g
      join "User" u on u.id = g."userId"
      left join "Wallet" w on w."userId" = u.id
     where ($1 = '' or u."phoneE164" like '%' || $1)
     order by g."createdAt" desc limit 20`, [suffix])).rows;

  console.log(`=== GRANTS (${grants.length}) ===`);
  if (!grants.length) {
    console.log("  (none) — production has never issued a bonus grant, which is exactly why");
    console.log("  RULES.md §2.5 still carries its ⏳.");
  }
  for (const g of grants) {
    // ⛔ `wagerRequiredTzs` IS THE REQUIREMENT — the frozen figure the grant was issued with.
    // Recomputing it as amount × multiplier would silently re-derive it from today's settings
    // and could disagree with the row the product actually enforces.
    const need = N(g.wagerRequiredTzs);
    const done = N(g.wageredTzs);
    console.log(
      `  ${g.who ?? g.phone}  ${g.status}  granted ${tzs(g.amountTzs)} x${g.wagerMultiplier ?? "—"}` +
      `  wagered ${tzs(done)} / ${tzs(need)}  remaining ${tzs(Math.max(0, need - done))}` +
      `  | wallet cash ${tzs(g.cash_bal)} bonus ${tzs(g.bonus_bal)}`);
    console.log(`      id=${g.id}  source=${g.source}  created=${String(g.createdAt)}  note=${(g.note ?? "").slice(0, 70)}`);
  }
  await c.end();
})().catch((e) => { console.error(e); process.exit(2); });
