/**
 * RE-MARK THE LEDGER ROWS A ROLLBACK WINDOW LEFT UNMARKED — drift leg (a)'s only fix (04 S3).
 *
 *   npm run ops:house-bots-remark                          # dry run: counts, lists, writes NOTHING
 *   npm run ops:house-bots-remark -- --apply               # NULL-fill, reconciled, inside ONE transaction
 *   npm run ops:house-bots-remark -- --apply --since 90 --max 500 --bot hb_…
 *
 * ⛔ THIS IS THE ONLY OPS SCRIPT IN THE PROGRAMME THAT WRITES TO A MONEY TABLE, and the single
 * sanctioned exception to "markers are written on create only". Read the guards before the code.
 *
 * ── ⛔ IT RE-MARKS **TRANSACTIONS**, NEVER POSITIONS. THE SPEC SENTENCE IS A TRAP ───────────────
 * `04-amendments.md`'s fix line reads "sets NULL→`position.houseBotId` only", which parses as "writes
 * the POSITION's column". THAT READING IS A MONEY-CORRUPTING BUILD. Two lines settle it: drift leg (a)
 * defines the offending row as a TRANSACTION whose marker is null on a Position that is ALREADY marked
 * — the Position is the JOIN KEY and the SOURCE of the value — and `C5-SPEC.md` says it without
 * ambiguity: *"`ops:house-bots-remark` re-marks TRANSACTIONS only"*. A marker written onto the wrong
 * Position corrupts the caps, the exports and the idempotency of every later house bet.
 *
 * ── WHY RAW SQL IS MANDATORY HERE, WHERE EVERY OTHER MONEY CHANGE GOES THROUGH THE SERVICE ──────
 * The data layer PHYSICALLY DISCARDS this key: both twins skip `houseBotId` (and `positionId`) in
 * `txn.update`, because a row an update could re-mark — or newly POSITION — becomes permanently
 * unmarkable, invisible in the holder's `excludeHouseBets` feed and absent from the house book's
 * returned money. A remark written through `db.txn.update` would run, report success and change
 * NOTHING. The "sanctioned exception" is therefore not an exception to those pins at all — it cannot
 * be — which is exactly why the `scripts/` marker gate was armed before this file was written.
 *
 * ── THE GUARDS, IN THE ORDER THEY FAIL ─────────────────────────────────────────────────────────
 * G1 · `t."houseBotId" IS NULL` in the WHERE. This is what makes it NULL-FILLING rather than
 *      re-marking, and what makes a second run a no-op. Paired with `p."houseBotId" IS NOT NULL`, so
 *      an unmarked position can never write NULL over a marker that is already there.
 * G2 · THE VALUE COMES FROM THE JOIN, NEVER FROM A PARAMETER. No flag can reach the SET clause. A
 *      `--bot` id may FILTER the population (`AND p."houseBotId" = $1`); it can never ASSIGN. A marker
 *      copied from another position in scope is silent corruption, and silence is the danger.
 * G3 · `"Transaction"` is the only UPDATE target, `"Position"` appears only in FROM, and `positionId`
 *      appears in no SET clause anywhere in this file.
 * G4 · COUNT RECONCILIATION INSIDE ONE TRANSACTION: the plan is counted, the UPDATE RETURNS its rows
 *      in the same transaction, and the work is ROLLED BACK if the written count differs from the
 *      counted one or exceeds `--max`. Then drift leg (a) is re-run INSIDE that transaction and must
 *      report 0 before the COMMIT. Nothing is committed that was not reconciled twice.
 * G5 · ⛔ `--apply` IS REFUSED WHILE THE MASTER SWITCH IS ON. This repairs a ledger the live seam is
 *      still writing to; the neighbouring procedure already requires the switch off and 0 open marked
 *      positions. It is a READ of that column — this script never writes it, in either direction, and
 *      there is no flag here that could.
 * ⛔ AND THE PINNED CORE CAN ONLY EVER NARROW. Everything appended to `REMARK_UPDATE_SQL` is joined
 * with AND, so a later edit can shrink the population it touches but cannot widen it without changing
 * the pinned string itself — which is asserted byte-for-byte by `test:house-bot-ops`.
 *
 * ── ⛔ D-OPS-3 · IT WRITES NO COMPLIANCE ROW, AND THAT IS A DECISION WITH A REASON ──────────────
 * S3 names no audit row for this script, and there is no honest one to write: `HOUSE_AUDIT` has no
 * `house_bot.remark` action and `EVENT_KINDS` has no REMARK kind — both are CHECK constraints in SQL,
 * owned by Commit 1, whose own migration says *"an event kind a later commit needs has to be here
 * already"*. Inventing one now would mean widening a CHECK on a live money database inside a commit
 * that is expand-only, and recording the act under an action that names something else would put a
 * false statement into the one artefact that exists to be trusted. So the record is the REPORT: this
 * script prints every row it will touch BEFORE it touches it, and the runbook tells the officer to
 * file the compliance note with that output attached — exactly what 04 already requires for drift
 * legs (b) and (c). ⛔ If a future commit adds the action, add the row HERE; do not reuse another one.
 *
 * ⛔ D19: prints to a TERMINAL, names the feature there, writes nothing into any shared artefact.
 */
import { Client } from "pg";
import { HOUSE_CONTROL_ID } from "../src/lib/house-bot/constants.ts";

/**
 * ⛔ THE ONE STATEMENT. Pinned byte-for-byte by `test:house-bot-ops` (`ops.remark.10`). Every clause is
 * load-bearing: the target table, the value taken from the JOIN, `p."houseBotId" IS NOT NULL` (never
 * write NULL over a marker) and `t."houseBotId" IS NULL` (NULL-filling only, and a second run is a
 * no-op). Anything appended to it is joined with AND and can only narrow.
 */
export const REMARK_UPDATE_SQL = `UPDATE "Transaction" t SET "houseBotId" = p."houseBotId" FROM "Position" p WHERE t."positionId" = p."id" AND p."houseBotId" IS NOT NULL AND t."houseBotId" IS NULL`;

/** The same population, counted. ⛔ Built from the SAME predicate text, so the count and the write can never drift apart. */
export const REMARK_COUNT_SQL = `SELECT count(*)::int AS "n" FROM "Transaction" t JOIN "Position" p ON t."positionId" = p."id" WHERE p."houseBotId" IS NOT NULL AND t."houseBotId" IS NULL`;

const argv = process.argv.slice(2);
const has = (f: string): boolean => argv.includes(f);
const valueOf = (f: string): string | null => { const i = argv.indexOf(f); return i === -1 ? null : (argv[i + 1] ?? null); };

const APPLY = has("--apply");
const SINCE_DAYS = valueOf("--since") === null ? 30 : Number(valueOf("--since"));
const MAX = valueOf("--max") === null ? 10_000 : Number(valueOf("--max"));
/** ⛔ A FILTER, NEVER AN ASSIGNMENT (G2). It narrows which marked positions are in scope; the value written is still the join's. */
const ONLY_BOT = valueOf("--bot");

const url = process.env.DATABASE_URL ?? "";
if (!url) { console.error("DATABASE_URL is empty. Export the database URL for the environment you mean to repair, then re-run."); process.exit(2); }
if (!Number.isFinite(SINCE_DAYS) || SINCE_DAYS <= 0) {
  console.error("--since must be a positive number of days. An unbounded run is refused: \"Transaction\" has no index on");
  console.error("\"positionId\", so an unbounded join seq-scans the ledger of a live money platform.");
  process.exit(2);
}
if (!Number.isFinite(MAX) || MAX <= 0) { console.error("--max must be a positive number of rows."); process.exit(2); }

const isLocal = /(?:127[.]0[.]0[.]1|localhost|\[::1\])/.test(url);
const c = new Client({ connectionString: url, ssl: isLocal ? undefined : { rejectUnauthorized: false } });
await c.connect();

const bound = `p."placedAt" >= (now() AT TIME ZONE 'UTC') - (${SINCE_DAYS}::int * interval '1 day')`;
const botFilter = ONLY_BOT === null ? "" : ` AND p."houseBotId" = $1::text`;
const args = ONLY_BOT === null ? [] : [ONLY_BOT];
/** ⛔ The same tail on the count, the write and the re-check, so all three measure one population. */
const tail = ` AND ${bound}${botFilter}`;

const fail = (why: string, code = 1): never => { console.error(`\n⛔ ${why}\n`); process.exit(code); };

// ── what is there, and what would be written ───────────────────────────────────────────────────
const control = (await c.query(`SELECT "enabled" FROM "HouseBotControl" WHERE "id" = $1::text`, [HOUSE_CONTROL_ID])).rows[0];
if (!control) fail(`No "${HOUSE_CONTROL_ID}" control row — this database has not run the house-bot migration.`, 2);

const planned = (await c.query(
  `SELECT t."id" AS "txnId", t."type"::text AS "type", t."positionId", p."houseBotId" AS "willWrite", t."createdAt"::text AS "createdAt"`
  + ` FROM "Transaction" t JOIN "Position" p ON t."positionId" = p."id"`
  + ` WHERE p."houseBotId" IS NOT NULL AND t."houseBotId" IS NULL${tail}`
  + ` ORDER BY t."createdAt" LIMIT 500`, args)).rows;
const plannedCount = Number((await c.query(`${REMARK_COUNT_SQL}${tail}`, args)).rows[0].n);

console.log(`\n══ house bots · re-mark the ledger ══   ${APPLY ? "APPLY" : "DRY RUN — nothing will be written"}`);
console.log(`   target           "Transaction" ONLY. ⛔ No "Position" row is written by this script, ever.`);
console.log(`   value            copied from the JOINED Position's own marker — never from a flag`);
console.log(`   bound            ${SINCE_DAYS} day(s) of Position.placedAt${ONLY_BOT === null ? "" : ` · only bot ${ONLY_BOT} (a FILTER, not the value)`}`);
console.log(`   ceiling          --max ${MAX}`);
console.log(`   master switch    ${control.enabled === true ? "ON" : "OFF"}`);
console.log(`\n   ${plannedCount} ledger row(s) would be NULL-filled${plannedCount > planned.length ? ` (first ${planned.length} shown)` : ""}:`);
for (const r of planned.slice(0, 40)) console.log(`     ${r.txnId}  ${r.type}  position ${r.positionId}  →  ${r.willWrite}  (${r.createdAt})`);
console.log(`\n   the statement:\n     ${REMARK_UPDATE_SQL}${tail}`);

if (!APPLY) {
  console.log(`\nNOTHING WRITTEN — re-run with --apply. A second --apply after a successful one changes 0 rows.\n`);
  await c.end();
  process.exit(0);
}

// ── G5 · the switch must be off ────────────────────────────────────────────────────────────────
if (control.enabled === true) {
  await c.end();
  fail("REFUSED: the master switch is ON. This repairs a ledger the live seam is still writing to — switch house\n"
    + "   bets off first (npm run ops:house-bots-off -- --apply, or the console), then re-run. 0 rows were written.", 2);
}
if (plannedCount > MAX) {
  await c.end();
  fail(`REFUSED: ${plannedCount} rows exceeds the --max ceiling of ${MAX}. 0 rows were written. Widen --max deliberately,\n   or narrow --since / --bot.`, 2);
}
if (plannedCount === 0) {
  console.log(`\nNothing to do — 0 rows matched. Drift leg (a) is already clean for this bound.\n`);
  await c.end();
  process.exit(0);
}

// ── G4 · one transaction: count, write, reconcile, re-check, and only then commit ───────────────
let written: Array<Record<string, unknown>> = [];
try {
  await c.query("BEGIN");
  // ⛔ THE COUNT IS TAKEN AGAIN INSIDE THE TRANSACTION. The one above was for the operator to read; this
  // one is what the write is reconciled against, so a row that arrived between the two cannot pass unseen.
  const inTx = Number((await c.query(`${REMARK_COUNT_SQL}${tail}`, args)).rows[0].n);
  written = (await c.query(`${REMARK_UPDATE_SQL}${tail} RETURNING t."id", t."houseBotId"`, args)).rows;
  if (written.length !== inTx) {
    await c.query("ROLLBACK");
    await c.end();
    fail(`RECONCILIATION FAILED: counted ${inTx} rows, wrote ${written.length}. ROLLED BACK — 0 rows changed.`, 1);
  }
  if (written.length > MAX) {
    await c.query("ROLLBACK");
    await c.end();
    fail(`RECONCILIATION FAILED: ${written.length} rows exceeds --max ${MAX}. ROLLED BACK — 0 rows changed.`, 1);
  }
  const left = Number((await c.query(`${REMARK_COUNT_SQL}${tail}`, args)).rows[0].n);
  if (left !== 0) {
    await c.query("ROLLBACK");
    await c.end();
    fail(`RECONCILIATION FAILED: drift leg (a) still reports ${left} row(s) inside the same transaction. ROLLED BACK.`, 1);
  }
  await c.query("COMMIT");
} catch (e) {
  await c.query("ROLLBACK").catch(() => {});
  await c.end();
  fail(`the repair threw and was ROLLED BACK — 0 rows changed: ${String((e as Error)?.message ?? e).replace(/\s+/g, " ").slice(0, 300)}`, 1);
}

console.log(`\n   ${written.length} ledger row(s) NULL-filled, reconciled against the count taken in the same transaction,`);
console.log(`   and drift leg (a) reported 0 inside that transaction before it committed.`);
console.log(`   ⛔ No compliance row was written (D-OPS-3, see this file's header): file the note by hand with the`);
console.log(`   report above attached. See docs/HOUSE-BOTS.md §11 "Rollback levers".`);
console.log(`   Verify independently: npm run ops:house-bots-status -- --drift --since ${SINCE_DAYS}\n`);
await c.end();
process.exit(0);
