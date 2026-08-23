/**
 * BACKFILL the spend-cycle ledger from the AI usage history.
 *
 *   railway run --service 50pick -- npx tsx scripts/ops-backfill-ai-cycles.mts          # dry run
 *   railway run --service 50pick -- npx tsx scripts/ops-backfill-ai-cycles.mts --apply
 *
 * ── ⛔ WHY BACKFILL AT ALL, AND WHY THIS IS THE DECISION ────────────────────────────────
 *
 * `docs/SESSION-PROMPT-AI-CYCLES.md` §10(o) says a gap where cycles did not yet exist must
 * either be BACKFILLED or LABELLED "pre-cycle" and excluded — and demands the choice be
 * stated. It is backfill, and here is the reason:
 *
 * Production holds **4,271 metered calls totalling $243.32, from 2026-06-25 onward**
 * (measured 2026-08-23 by `npm run ops:preflight-ai-cycles`). At Ali's $100 denomination
 * that is two whole cycles of real history. Excluding it would make the FIRST answer the
 * platform ever gives to "how many cycles a year?" wrong by two — on a base of two — and it
 * would take a year of running before the number recovered. A ledger that starts empty is
 * not neutral; it is a ledger that under-reports for its first year.
 *
 * ⛔ AND THE BACKFILLED CYCLES CARRY REAL TIMESTAMPS. `openedAt` and `closedAt` are the
 * instants of the calls that opened and closed them, so "how long did each cycle last" — the
 * figure Ali asked for by name — is true for the historical rows too, not a flat line.
 *
 * ── ⛔ IDEMPOTENT, AND IT REFUSES RATHER THAN GUESSES ───────────────────────────────────
 *
 * §10(s): a backfill run twice would double-count. Two things stop that:
 *   ① it REFUSES outright if any cycle already exists, rather than trying to merge;
 *   ② the `@unique` index on `index` would reject a duplicate even if ① were bypassed.
 *
 * ⛔ RUN IT BEFORE THE CODE THAT PAUSES ON A CYCLE BOUNDARY IS LIVE, in the same maintenance
 * step as the migration. If the app opens cycle 1 first, this script correctly refuses, and
 * the history is then unrecoverable in cycle terms — the events are still there, but the
 * numbering would start from a live cycle rather than from June.
 */
import { Client } from "pg";

const APPLY = process.argv.includes("--apply");
const SIZE_USD = Number(process.env.CYCLE_SIZE_USD ?? "100"); // Ali, 2026-08-23
const url = (process.env.DATABASE_URL || "")
  .replace(/@postgres\.railway\.internal(:\d+)?/, "@turntable.proxy.rlwy.net:40357");
if (!url) { console.error("DATABASE_URL empty — run through `railway run`."); process.exit(1); }
if (!Number.isFinite(SIZE_USD) || SIZE_USD <= 0) { console.error(`CYCLE_SIZE_USD=${SIZE_USD} is not a usable size.`); process.exit(1); }

const EPS = 1e-6;
const round6 = (n: number) => Math.round(n * 1_000_000) / 1_000_000;

const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await c.connect();

console.log(`── backfill AI spend cycles ── ${APPLY ? "APPLY" : "DRY RUN"} · $${SIZE_USD}/cycle`);
console.log(`   server clock ${(await c.query("select now()::text as t")).rows[0].t}\n`);

// ── ① refuse if the ledger is not empty ────────────────────────────────────────────────
const existing = await c.query(`SELECT count(*)::int AS n, max("index")::int AS mx FROM "AiSpendCycle"`);
if (existing.rows[0].n > 0) {
  console.error(`🔴 REFUSING — the cycle ledger already holds ${existing.rows[0].n} row(s), highest index ${existing.rows[0].mx}.`);
  console.error("   A backfill on top of live cycles would double-count. Nothing was written.");
  await c.end();
  process.exit(1);
}

// ── ② read the history, oldest first ───────────────────────────────────────────────────
const events = await c.query<{ createdAt: Date; costUsd: string }>(`
  SELECT "createdAt", "costUsd"
  FROM "AiUsageEvent"
  WHERE "costUsd" > 0
  ORDER BY "createdAt" ASC, id ASC`);
console.log(`① ${events.rowCount} metered calls with a non-zero cost`);
if (events.rowCount === 0) {
  console.log("   nothing to backfill — the app will open cycle 1 on the first metered call.");
  await c.end();
  process.exit(0);
}

const totalUsd = round6(events.rows.reduce((s, r) => s + Number(r.costUsd), 0));
console.log(`   totalling $${totalUsd.toFixed(6)} from ${events.rows[0].createdAt.toISOString()} to ${events.rows[events.rowCount - 1].createdAt.toISOString()}`);

// ── ③ denominate — THE SAME LOOP THE LIVE METER RUNS ───────────────────────────────────
// ⛔ Deliberately the same shape as `accrueSpendToCycles`: fill, close on full, carry the
// remainder into the next. A backfill that denominated differently from the live meter
// would put a seam in the history exactly where the two met, and nothing would flag it.
type Row = { index: number; openedAt: string; closedAt: string | null; costUsd: number; status: "OPEN" | "CLOSED" };
const cycles: Row[] = [];
let cur: Row = { index: 1, openedAt: events.rows[0].createdAt.toISOString(), closedAt: null, costUsd: 0, status: "OPEN" };
cycles.push(cur);

for (const ev of events.rows) {
  const at = ev.createdAt.toISOString();
  let remaining = round6(Number(ev.costUsd));
  while (remaining > EPS) {
    const room = round6(SIZE_USD - cur.costUsd);
    const take = Math.min(room, remaining);
    cur.costUsd = round6(cur.costUsd + take);
    remaining = round6(remaining - take);
    if (cur.costUsd >= SIZE_USD - EPS) {
      cur.closedAt = Date.parse(at) >= Date.parse(cur.openedAt) ? at : cur.openedAt;
      cur.status = "CLOSED";
      cur = { index: cur.index + 1, openedAt: cur.closedAt, closedAt: null, costUsd: 0, status: "OPEN" };
      cycles.push(cur);
    }
  }
}

const closed = cycles.filter((x) => x.status === "CLOSED");
const ledgerTotal = round6(cycles.reduce((s, x) => s + x.costUsd, 0));
console.log(`\n② ${closed.length} closed cycle(s) + 1 open, holding $${ledgerTotal.toFixed(6)}`);

// ⛔ CONSERVATION, CHECKED BEFORE ANYTHING IS WRITTEN. If the two do not agree there is no
// safe way to proceed, and writing anyway would put a drift into the ledger on day one.
if (Math.abs(ledgerTotal - totalUsd) > EPS) {
  console.error(`🔴 CONSERVATION FAILED before writing: ledger $${ledgerTotal} vs events $${totalUsd}. Nothing written.`);
  await c.end();
  process.exit(1);
}
console.log(`   ✓ conservation holds: ledger == events to within ${EPS}`);

for (const x of closed) {
  const days = ((Date.parse(x.closedAt as string) - Date.parse(x.openedAt)) / 86_400_000).toFixed(2);
  console.log(`   cycle ${String(x.index).padStart(3)} · $${x.costUsd.toFixed(2)} · ${x.openedAt.slice(0, 10)} → ${(x.closedAt as string).slice(0, 10)} · lasted ${days}d`);
}
console.log(`   cycle ${String(cur.index).padStart(3)} · $${cur.costUsd.toFixed(2)} · ${cur.openedAt.slice(0, 10)} → OPEN`);

if (!APPLY) {
  console.log("\nDRY RUN — nothing written. Re-run with --apply to write these rows.");
  await c.end();
  process.exit(0);
}

// ── ④ write, in one transaction ────────────────────────────────────────────────────────
// `priceRev` is the CURRENT table's revision. That is honest: the historical `costUsd`
// values were computed by whatever table was live at the time, and only today's is
// recoverable — the stamp records what these rows can be reconciled against, not a claim
// about the past. Every backfilled row is marked, so it can never be mistaken for a
// cycle the live meter observed.
const PRICE_REV = (await import("../src/lib/server/ai-usage.ts")).PRICE_REV;
await c.query("BEGIN");
try {
  for (const x of cycles) {
    await c.query(
      `INSERT INTO "AiSpendCycle" (id, "index", "sizeUsd", "priceRev", "openedAt", "closedAt", "costUsd", status, "openedBy", note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL, $9)`,
      [`aic_bf_${String(x.index).padStart(6, "0")}`, x.index, SIZE_USD, PRICE_REV,
       x.openedAt, x.closedAt, x.costUsd, x.status, "backfilled from usage history 2026-08-23"],
    );
  }
  await c.query("COMMIT");
} catch (err) {
  await c.query("ROLLBACK");
  console.error("🔴 write failed, rolled back:", (err as Error).message);
  await c.end();
  process.exit(1);
}

// ── ⑤ read it back — never trust the write ─────────────────────────────────────────────
const back = await c.query(`
  SELECT count(*)::int AS n,
         count(*) FILTER (WHERE status = 'OPEN')::int AS open_n,
         round(sum("costUsd")::numeric, 6)::float8 AS total,
         min("index")::int AS lo, max("index")::int AS hi
  FROM "AiSpendCycle"`);
const r = back.rows[0];
console.log(`\n③ read back: ${r.n} rows, index ${r.lo}..${r.hi}, ${r.open_n} open, $${r.total}`);
const problems: string[] = [];
if (r.n !== cycles.length) problems.push(`row count ${r.n} != ${cycles.length}`);
if (r.open_n !== 1) problems.push(`${r.open_n} open cycles — must be exactly 1`);
if (r.lo !== 1 || r.hi !== cycles.length) problems.push(`index range ${r.lo}..${r.hi} is not 1..${cycles.length}`);
if (Math.abs(Number(r.total) - totalUsd) > EPS) problems.push(`stored total ${r.total} != events ${totalUsd}`);

await c.end();
if (problems.length) {
  console.error("\n🔴 BACKFILL WROTE, BUT THE READ-BACK DISAGREES:");
  for (const p of problems) console.error(`   · ${p}`);
  process.exit(1);
}
console.log("🟢 backfill complete and verified.");
