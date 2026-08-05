/**
 * Wait for a round to RESOLVE and SETTLE, reading the DB rather than the clock.
 *
 *   node .qa-s28/await-settle.cjs <roundId> [maxMinutes]
 *
 * ⛔ NEVER `new Date()` ON THIS LAPTOP. Its clock is ~93 seconds slow and that has already
 * produced one phantom fairness defect (E-81). Every instant here comes from the SERVER.
 * ⛔ And a DB read gives STATE, not REASON — this prints `voidReason`, it never infers one.
 */
const { Client } = require("pg");

const round = (process.argv[2] || "").replace(/[^a-z0-9_]/gi, "");
const maxMin = Number(process.argv[3] ?? 10);
if (!round) { console.error("usage: node .qa-s28/await-settle.cjs <roundId> [maxMinutes]"); process.exit(2); }

const url = (process.env.DATABASE_URL || "")
  .replace(/@postgres\.railway\.internal(:\d+)?/, "@turntable.proxy.rlwy.net:40357");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const deadline = Date.now() + maxMin * 60_000;

  while (Date.now() < deadline) {
    const [r] = (await c.query(`
      select r.id, r."roundNumber" as n, r.outcome::text as outcome, r."voidReason" as void_reason,
             r."closePrice"::text as close, r."resolvedAt"::text as resolved,
             r."settledAt"::text as settled, r."boundaryAt"::text as boundary,
             now()::text as now,
             (select count(*) from "Position" p where p."marketId" = r."marketId" and p.status::text = 'OPEN') as still_open
        from "UpDownRound" r where r.id = $1`, [round])).rows;
    if (!r) { console.error(`no such round ${round}`); process.exit(1); }

    console.log(`   ${r.now}  boundary ${r.boundary}  outcome=${r.outcome ?? "-"} ` +
      `void=${r.void_reason ?? "-"} close=${r.close ?? "-"} settled=${r.settled ?? "-"} openPos=${r.still_open}`);

    // ⭐ SETTLED, not merely RESOLVED. `resolvedAt` says the direction is decided; the money
    // has not necessarily moved. Waiting on the wrong one is how a run reads half-paid wallets
    // and reports a shortfall that fills in two seconds later.
    if (r.settled && Number(r.still_open) === 0) {
      console.log(`\n✅ round #${r.n} SETTLED — outcome ${r.outcome ?? "VOID"}${r.void_reason ? ` (${r.void_reason})` : ""}, no OPEN positions left`);
      await c.end();
      process.exit(0);
    }
    await sleep(15_000);
  }
  console.log(`\n⏳ still not settled after ${maxMin} minutes — NOT a pass; read the healer's audit rows`);
  await c.end();
  process.exit(1);
})().catch((e) => { console.error("ERROR", e.message); process.exit(1); });
