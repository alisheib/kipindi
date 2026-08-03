/**
 * THE QA FLEET — create, fund, inspect and DELETE a tagged set of test players on production.
 *
 *   railway run --service 50pick -- npx tsx scripts/ops-qa-fleet.mts create [count]
 *   railway run --service 50pick -- npx tsx scripts/ops-qa-fleet.mts fund [amountEach]
 *   railway run --service 50pick -- npx tsx scripts/ops-qa-fleet.mts list
 *   railway run --service 50pick -- npx tsx scripts/ops-qa-fleet.mts destroy --yes
 *
 * Ali, 2026-08-03: *"create all users you need, even 10s and 10s, with as much money…
 * then delete after tests"*, and *"when money ends, mint — it's our db"*.
 *
 * ── HOW THIS MINTS, AND WHY NOT THE OBVIOUS WAY ──────────────────────────────────
 *
 * ⛔ It does NOT raise `Wallet.balance` directly. `scripts/seed-test-float.mjs` does that,
 * and it REFUSES outright when NODE_ENV=production — a refusal added deliberately after
 * go-live because "one mis-set Railway variable would mint TZS 1,000,000 into every real
 * wallet and permanently unbalance the ledger". That rail is not routed around here. The
 * repo also carries `ops-clear-unledgered-credit.mjs`, which exists because unledgered
 * credit has already had to be cleaned up once.
 *
 * ✅ Instead every credit is a BALANCED DOUBLE ENTRY through the app's own accounts:
 * `SYSTEM:ADJUSTMENT` is debited and `PLAYER:{id}` credited — the two halves of
 * `adjustmentEntries()` in `src/lib/server/ledger.ts` — with a real `Transaction` row
 * alongside. Three consequences that matter:
 *   · `reconcileLedger()` / `trialBalance()` stay balanced — the books are never wrong;
 *   · the money reads as an ADJUSTMENT, not as deposit revenue, so it does NOT inflate
 *     GGR — which feeds the TRA and GBT levies;
 *   · it reverses exactly, because every entry carries the fleet's own txn group.
 *
 * ── HOW THE FLEET IS TAGGED, AND WHY ─────────────────────────────────────────────
 * Reserved phone block `+2557990000NN` and displayName `QA Fleet NN`. ONE predicate finds
 * the whole fleet — for funding, for report-exclusion, and for deletion. ⛔ `destroy`
 * refuses to touch any row outside that block, and refuses any account that is not role
 * PLAYER; the guard reads the ROLE BACK OFF THE ROW rather than trusting a remembered list.
 */
import { Client } from "pg";
import { hashPassword, randomId } from "../src/lib/server/crypto.ts";

const PHONE_PREFIX = "+2557990000";          // +25579900001 … +25579900030
const NAME_PREFIX = "QA Fleet";
const FLEET_SECRET = process.env.QA_FLEET_PASSWORD ?? "qa-fleet-2026-08-03-Xk7";

const cmd = process.argv[2] ?? "list";
const arg = process.argv[3];

const url = (process.env.DATABASE_URL || "")
  .replace(/@postgres\.railway\.internal(:\d+)?/, "@turntable.proxy.rlwy.net:40357");
if (!url) { console.error("no DATABASE_URL — run under `railway run --service 50pick --`"); process.exit(2); }

const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await c.connect();

/** The ONE predicate that defines the fleet. Everything keys off this. */
const FLEET_WHERE = `u."phoneE164" LIKE '${PHONE_PREFIX}%'`;

async function list() {
  const r = await c.query(`
    select u.id, u."phoneE164", u."displayName", u.role::text as role, u.status::text as status,
           u.locale::text as locale, coalesce(w.balance, 0)::text as balance,
           (select count(*) from "Position" p where p."userId" = u.id) as positions
      from "User" u left join "Wallet" w on w."userId" = u.id
     where ${FLEET_WHERE}
     order by u."phoneE164"`);
  console.log(`\nFLEET: ${r.rowCount} player(s)\n`);
  for (const x of r.rows) {
    console.log(`  ${x.phoneE164}  ${String(x.displayName).padEnd(14)} ${x.role.padEnd(7)} ${x.status.padEnd(8)} ${x.locale}  TZS ${Number(x.balance).toLocaleString()}  ${x.positions} pos`);
  }
  console.log(`\n  total held: TZS ${r.rows.reduce((s, x) => s + Number(x.balance), 0).toLocaleString()}`);
}

async function create(count: number) {
  // Spread the locales — an all-English fleet cannot surface a Swahili or Chinese
  // rendering bug, and every player surface here ships three languages.
  const LOCALES = ["EN", "SW", "ZH"];
  let made = 0, existed = 0;

  for (let i = 1; i <= count; i++) {
    const nn = String(i).padStart(2, "0");
    const phone = `${PHONE_PREFIX}${nn}`;
    if ((await c.query(`select 1 from "User" where "phoneE164" = $1`, [phone])).rowCount) { existed++; continue; }

    const salt = randomId(32);
    const hash = await hashPassword(FLEET_SECRET, salt);
    const userId = `usr_${randomId(24)}`;

    await c.query("begin");
    try {
      await c.query(
        `insert into "User" (id, "phoneE164", "displayName", "passwordHash", "passwordSalt",
                             role, status, locale, "createdAt", "updatedAt")
         values ($1,$2,$3,$4,$5,'PLAYER','ACTIVE',$6, now(), now())`,
        [userId, phone, `${NAME_PREFIX} ${nn}`, hash, salt, LOCALES[i % LOCALES.length]],
      );
      await c.query(
        `insert into "Wallet" (id, "userId", status, balance, pending, hold, "bonusBalance", currency, "createdAt", "updatedAt")
         values ($1,$2,'ACTIVE',0,0,0,0,'TZS', now(), now())`,
        [`wal_${randomId(24)}`, userId],
      );
      await c.query("commit");
      made++;
    } catch (e) { await c.query("rollback"); throw e; }
  }
  console.log(`created ${made}, already present ${existed}`);
}

/** Credit each fleet wallet up to `target`, as a BALANCED LEDGER GROUP. */
async function fund(target: number) {
  const fleet = await c.query(`
    select u.id, u."phoneE164", w.id as wallet_id, coalesce(w.balance,0)::numeric as balance
      from "User" u join "Wallet" w on w."userId" = u.id
     where ${FLEET_WHERE}`);

  let credited = 0, total = 0;
  for (const p of fleet.rows) {
    const gap = target - Number(p.balance);
    if (gap <= 0) continue;

    const txnId = `txn_${randomId(20)}`;
    const memo = "QA fleet float (session 18) — reverses at fleet destroy";

    await c.query("begin");
    try {
      await c.query(
        `insert into "Transaction" (id, "walletId", "userId", type, status, amount, fee,
                                    "taxWithheld", "balanceAfter", currency, "createdAt", "updatedAt")
         values ($1,$2,$3,'ADJUSTMENT_CREDIT','CONFIRMED',$4,0,0,$5,'TZS', now(), now())`,
        [txnId, p.wallet_id, p.id, gap, target],
      );
      // The two halves of `adjustmentEntries()` — they must sum to zero.
      for (const [account, amount] of [["SYSTEM:ADJUSTMENT", -gap], [`PLAYER:${p.id}`, gap]] as const) {
        await c.query(
          `insert into "LedgerEntry" (id, "groupId", account, "entryType", amount, currency, memo, "txnId", "userId", "createdAt")
           values ($1,$2,$3,'ADJUSTMENT',$4,'TZS',$5,$6,$7, now())`,
          [`led_${randomId(20)}`, txnId, account, amount, memo, txnId, p.id],
        );
      }
      await c.query(`update "Wallet" set balance = $1, "updatedAt" = now() where id = $2`, [target, p.wallet_id]);
      await c.query("commit");
      credited++; total += gap;
    } catch (e) { await c.query("rollback"); throw e; }
  }
  console.log(`funded ${credited} wallet(s) to TZS ${target.toLocaleString()} — TZS ${total.toLocaleString()} minted, fully ledgered`);

  // ⭐ Prove the books still balance. A mint that unbalances the ledger is a defect,
  // not a fixture — and this is the assertion that would catch a half-written group.
  const bad = await c.query(`select "groupId", sum(amount)::text as delta
                               from "LedgerEntry" group by "groupId" having sum(amount) <> 0`);
  console.log(bad.rowCount === 0
    ? "  ledger reconciles — every group sums to zero"
    : `  🔴 ${bad.rowCount} IMBALANCED group(s): ${JSON.stringify(bad.rows.slice(0, 5))}`);
}

async function destroy(confirmed: boolean) {
  if (!confirmed) { console.log("refusing without --yes"); return; }

  // ⛔ Read the rows back and refuse anything that is not a PLAYER in the reserved block.
  const fleet = await c.query(`select u.id, u."phoneE164", u.role::text as role from "User" u where ${FLEET_WHERE}`);
  const notPlayers = fleet.rows.filter((r) => r.role !== "PLAYER");
  if (notPlayers.length) {
    console.error(`REFUSING — ${notPlayers.length} row(s) in the fleet block are not PLAYER:`);
    for (const r of notPlayers) console.error(`  ${r.phoneE164} role=${r.role}`);
    process.exit(1);
  }
  const ids = fleet.rows.map((r) => r.id);
  if (!ids.length) { console.log("no fleet to destroy"); return; }

  const counts: Record<string, number> = {};
  for (const [label, sql] of [
    ["positions",     `select count(*) from "Position" where "userId" = any($1)`],
    ["transactions",  `select count(*) from "Transaction" where "userId" = any($1)`],
    ["ledger",        `select count(*) from "LedgerEntry" where "userId" = any($1)`],
    ["notifications", `select count(*) from "Notification" where "userId" = any($1)`],
  ] as const) counts[label] = Number((await c.query(sql, [ids])).rows[0].count);

  await c.query("begin");
  try {
    // LedgerEntry holds only SOFT refs (no FK), so it is deleted explicitly; Position,
    // Transaction and Wallet cascade from User. Counted first so deletion is REPORTED
    // rather than assumed.
    await c.query(`delete from "LedgerEntry" where "userId" = any($1)`, [ids]);
    const del = await c.query(`delete from "User" where id = any($1)`, [ids]);
    await c.query("commit");
    console.log(`destroyed ${del.rowCount} fleet player(s) — ${JSON.stringify(counts)}`);
  } catch (e) { await c.query("rollback"); throw e; }

  const bad = await c.query(`select "groupId" from "LedgerEntry" group by "groupId" having sum(amount) <> 0`);
  console.log(bad.rowCount === 0 ? "  ledger still reconciles" : `  🔴 ${bad.rowCount} imbalanced group(s) left behind`);
}

try {
  if (cmd === "create") { await create(Number(arg ?? 30)); await list(); }
  else if (cmd === "fund") { await fund(Number(arg ?? 500_000)); await list(); }
  else if (cmd === "destroy") await destroy(process.argv.includes("--yes"));
  else await list();
} finally {
  await c.end();
}
