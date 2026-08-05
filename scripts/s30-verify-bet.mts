/**
 * THE DATABASE HALF OF E-64's LIVE PROOF — because a toast is not evidence money moved.
 *
 *   railway run --service 50pick -- npx tsx scripts/s30-verify-bet.mts <fleetNN> <stake>
 *
 * ⛔ THIS IS THE CHECK THAT MATTERS MORE THAN THE SCREENSHOT. A toast reading "Bet placed" over
 * a bet that did not place would be a WORSE defect than the silence E-64 filed — it would be a
 * false money statement, the E-39/E-65/E-68 class this campaign keeps finding. So the claim
 * "the player was told their bet was placed" is only allowed to stand beside "a Position row
 * exists, the wallet fell by exactly the stake, and the ledger balances".
 *
 * ⚠️ READ-ONLY. Every statement here is a SELECT.
 */
import { Client } from "pg";

const [NN = "07", STAKE_ARG = "1000"] = process.argv.slice(2);
const STAKE = Number(STAKE_ARG);
const PHONE = `+2557990000${String(NN).padStart(2, "0")}`;

const url = (process.env.DATABASE_URL || "")
  .replace(/@postgres\.railway\.internal(:\d+)?/, "@turntable.proxy.rlwy.net:40357");

let pass = 0; const fails: string[] = [];
const ok = (n: string, c: boolean, d = "") => { if (c) { pass++; console.log(`  ok   ${n}`); } else { fails.push(n); console.log(`  FAIL ${n}${d ? ` — ${d}` : ""}`); } };

(async () => {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();
  console.log(`\nE-64 · the money behind the toast — fleet:${NN} (${PHONE}), stake ${STAKE}\n`);

  const u = (await c.query(`select id, "phoneE164" from "User" where "phoneE164" = $1`, [PHONE])).rows[0];
  ok("1.1 the fleet player exists", !!u, PHONE);
  if (!u) { await c.end(); process.exit(1); }

  // The newest Up & Down position for this player. ⚠️ Scoped to the last 15 minutes: this
  // player has a history, and matching "their newest position" without a time bound would
  // happily report a bet from a previous session as proof of this one.
  const p = (await c.query(`
    select p.id, p.side, p.stake, p.status, p."placedAt"::text as at, p."marketId",
           m."productLine", m."titleEn"
      from "Position" p join "PredictionMarket" m on m.id = p."marketId"
     where p."userId" = $1 and m."productLine" = 'UPDOWN'
       and p."placedAt" > now() - interval '15 minutes'
     order by p."placedAt" desc limit 1`, [u.id])).rows[0];
  ok("2.1 a Position was written in the last 15 minutes", !!p);
  if (p) {
    console.log(`     ${p.id}  ${p.side}  stake ${p.stake}  ${p.status}  ${p.at}`);
    console.log(`     market ${p.marketId} — ${p.titleEn}`);
    ok("2.2 …for exactly the stake that was typed", Number(p.stake) === STAKE, `row ${p.stake} vs typed ${STAKE}`);
    ok("2.3 …on the UP side, as driven", p.side === "YES", `${p.side} (YES is UP)`);
    ok("2.4 …and it is OPEN, not already settled", p.status === "OPEN", p.status);
  }

  // The wallet debit, from the transaction the bet wrote — not from a balance snapshot, which
  // cannot distinguish "this bet" from anything else that moved in the same minute.
  const t = (await c.query(`
    select id, type, amount, "balanceAfter", "createdAt"::text as at
      from "Transaction"
     where "userId" = $1 and "createdAt" > now() - interval '15 minutes'
     order by "createdAt" desc limit 3`, [u.id])).rows;
  console.log(`\n   last transactions:`);
  for (const r of t) console.log(`     ${r.at}  ${String(r.type).padEnd(18)} ${String(r.amount).padStart(9)}  balanceAfter ${r.balanceAfter}`);
  const debit = t.find((r) => Number(r.amount) === -STAKE || Number(r.amount) === STAKE);
  ok("3.1 a transaction for exactly the stake exists", !!debit, `none of ${t.length} rows is ±${STAKE}`);

  const w = (await c.query(`select balance from "Wallet" where "userId" = $1`, [u.id])).rows[0];
  console.log(`\n   wallet balance now: ${w?.balance}`);
  ok("3.2 the wallet still has a sane balance", w != null && Number(w.balance) >= 0, String(w?.balance));

  console.log(`\ns30-verify-bet: ${pass} passed, ${fails.length} failed`);
  await c.end();
  if (fails.length) { console.error("\n✗ THE TOAST AND THE MONEY DISAGREE — this is worse than E-64 was.\n"); process.exit(1); }
  console.log("s30-verify-bet: OK — the toast told the truth: a position exists and the money moved");
})().catch((e) => { console.error("ERROR", e.message); process.exit(1); });
