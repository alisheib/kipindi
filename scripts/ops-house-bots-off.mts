/**
 * SWITCH HOUSE BOTS OFF FROM A TERMINAL — the fallback for a console that cannot be used AT ALL (04 A9).
 *
 *   npx tsx scripts/ops-house-bots-off.mts                      # dry run: reads, prints, writes nothing
 *   npx tsx scripts/ops-house-bots-off.mts --apply --reason "…" # two writes, no lock
 *
 * ⛔ THE OWNER ALONE TURNS HOUSE BETS ON. This script only turns them OFF, and it has no inverse flag,
 * because refusing to stop is never the safe default while refusing to start always is.
 *
 * ── WHY IT DOES NOT GO THROUGH THE SERVICE, WHICH IS THIS CAMPAIGN'S STANDING RULE ──────────────
 * `scripts/ops-stop-updown-chains.mts` states the rule this repo works to: *"IT GOES THROUGH
 * `setChainState`, THE SAME CALL THE CONSOLE'S STOP BUTTON MAKES."* ⛔ THIS SCRIPT IS THE ONE
 * DELIBERATE EXCEPTION, and the exception is the whole reason it exists. A9 names exactly two
 * situations for it, and the DAL cannot serve either:
 *   · ENG-02 — a deploy changed the Server Action ids under an open tab, so every press in the console
 *     posts to an id that no longer exists;
 *   · ENG-18 — the app's Prisma pool is exhausted, or the database is unreachable from the app.
 * The Postgres twin of the DAL runs every statement through Prisma — `$queryRawUnsafe` on the app's
 * own client — which is precisely the pool ENG-18 says is gone. A fallback built on the thing that
 * failed is not a fallback. So: a direct `pg.Client`, its own connection, two statements.
 * ⛔ DO NOT "FIX" THIS INTO THE DAL. Doing so would delete the only path that survives ENG-18.
 *
 * ── ⛔ NO ADVISORY LOCK, DELIBERATELY (A9 step 1) ───────────────────────────────────────────────
 * `kill-switch.ts` says it in its own header: H4 re-reads the control row INSIDE each bet's own lock,
 * so an OFF that has committed already binds every bet not yet holding `house:control`. Taking the
 * lock first would let one hung bet hold the switch open for the whole 30 s transaction timeout —
 * the stall A9 exists to remove. There is no `pg_advisory_lock` here and there must never be one.
 *
 * ── ⛔ D-OPS-1 · IT DOES NOT CANCEL LIVE INTENTS, AND IT SAYS SO ────────────────────────────────
 * The console's OFF cancels every live intent (`kill-switch.ts` step 3). This script does not, and
 * that is a decision, not an omission. A9 names exactly TWO writes in three separate places; the
 * rollback-lever table's "same" column summarises a lever, it does not specify one. Cancelling is a
 * table-wide conditional UPDATE, and A9's entire purpose is to take NO lock and hold nothing — a
 * sweeping write re-introduces exactly the exposure the script was written against. Nothing can stake
 * once the OFF commits, because every fire re-reads the control row inside its own lock.
 * ⭐ BUT LEAVING PENDING ROWS UNCANCELLED AND UNMENTIONED WOULD BE A SILENT LIE: they sit in the feed
 * looking like queued stakes. So the count is printed in both modes, it is written into the
 * SWITCH_OFF event's payload as `liveIntentsLeft`, and the exact statement that cancels them is
 * printed for an officer who wants them gone.
 *
 * ── ⛔ D-OPS-2 · IT WRITES NO COMPLIANCE AUDIT ROW, DELIBERATELY ────────────────────────────────
 * `audit()` takes a database-wide advisory lock, reads the true chain head and HMAC-chains the entry.
 * A hand-written `AuditLog` INSERT from a direct-pg script would BREAK THE CHAIN — the one artefact
 * whose whole purpose is to prove nothing was rewritten. The durable record of this act is the
 * SWITCH_OFF event row; the officer files the compliance note by hand, and the runbook says so.
 * ⛔ Nobody may "fix" this later by adding an INSERT here.
 *
 * ── THE CONNECTION ─────────────────────────────────────────────────────────────────────────────
 * SSL is required by a managed proxy and REFUSED by a plain local Postgres, so it is decided by host
 * — `ops-preflight-ai-cycles.mts`'s split, whose own comment is the argument: *"an ops script nobody
 * can rehearse is an ops script whose first run is on the real thing."* ⛔ NO HOST REWRITE IS HARD
 * CODED here (`ops-preflight-notification-idx.mts` pins one proxy hostname and forces SSL, which makes
 * it unrunnable against a local cluster and stale the day the proxy moves). If `DATABASE_URL` names a
 * host only reachable from inside the platform's private network, the operator is told to export the
 * public URL instead.
 *
 * ⛔ D19: this prints to a TERMINAL, so it may name the feature. Nothing it writes into a shared
 * artefact does: the event row's payload carries causes and counts, never a holder or a bot's name.
 */
import { Client } from "pg";
import {
  EVENT_KINDS,
  HOUSE_CONTROL_ID,
  HOUSE_ID_PREFIX,
  LIVE_INTENT_STATUSES,
  OFF_CAUSES,
  isOffCause,
  type HouseBotEventKind,
  type OffCause,
} from "../src/lib/house-bot/constants.ts";
import { SWITCH_OFF_COPY } from "../src/lib/house-bot/feed-copy.ts";
import { randomId } from "../src/lib/server/crypto.ts";

/**
 * ⛔ SPELLED ONCE AND TYPED BY THE CLOSED LISTS. If `MANUAL` ever leaves `OFF_CAUSES`, or `SWITCH_OFF`
 * leaves `EVENT_KINDS`, this file stops COMPILING — rather than writing a value the table's CHECK
 * constraint refuses at run time, on the night somebody needed the fallback.
 */
const CAUSE: OffCause = "MANUAL";
const KIND: HouseBotEventKind = "SWITCH_OFF";

/** The control write — the SAME predicate the console's `switchOff` uses, so a 0 rowcount means ALREADY OFF. */
export const OFF_UPDATE_SQL =
  `UPDATE "HouseBotControl" SET "enabled" = false, "offCause" = $1::text, "switchedAt" = now(),`
  + ` "switchedById" = $2::text, "switchedReason" = $3::text`
  + ` WHERE "id" = $4::text AND "enabled" = true`
  + ` RETURNING "id", "enabled", "offCause", "switchedAt"::text AS "switchedAt"`;

/** The second and last write: one append-only event row. */
export const EVENT_INSERT_SQL =
  `INSERT INTO "HouseBotEvent" ("id", "houseBotId", "userId", "marketId", "kind", "fromStatus", "toStatus", "reason", "actorId", "payload")`
  + ` VALUES ($1::text, NULL, NULL, NULL, $2::text, 'ON', 'OFF', $3::text, $4::text, $5::jsonb)`
  + ` RETURNING "id"`;

/** What an officer runs to cancel what this script left standing. Built from the closed list, never typed. */
export const CANCEL_LIVE_SQL =
  `UPDATE "HouseBotIntent" SET "status" = 'CANCELLED', "reasonCode" = 'MASTER_OFF', "finishedAt" = now()`
  + ` WHERE "status" = ANY(ARRAY[${LIVE_INTENT_STATUSES.map((s) => `'${s}'`).join(", ")}]::text[])`;

const LIVE_COUNT_SQL = `SELECT count(*)::int AS "n" FROM "HouseBotIntent" WHERE "status" = ANY($1::text[])`;
const CONTROL_READ_SQL =
  `SELECT "id", "enabled", "offCause", "switchedAt"::text AS "switchedAt", "switchedById", "switchedReason"`
  + ` FROM "HouseBotControl" WHERE "id" = $1::text`;

const APPLY = process.argv.includes("--apply");
const reasonAt = process.argv.indexOf("--reason");
const RAW_REASON = reasonAt === -1 ? null : (process.argv[reasonAt + 1] ?? null);
/** `HouseBotEvent_reason_check` and `HouseBotControl_switchedReason_check` both cap at 300. */
const REASON = RAW_REASON === null ? null : RAW_REASON.slice(0, 300);
/** An operator decision is attributed to an operator, never to "system". */
const OFFICER = process.env.OPS_OFFICER_ID ?? null;

const url = process.env.DATABASE_URL ?? "";
if (!url) {
  console.error("DATABASE_URL is empty. Export the database URL for the environment you mean to stop, then re-run.");
  process.exit(2);
}
if (/\.railway\.internal/.test(url)) {
  console.error(
    "DATABASE_URL names a host that resolves only inside the platform's private network.\n"
    + "Export the PUBLIC database URL from the provider's dashboard and re-run — this script deliberately\n"
    + "hard-codes no proxy hostname, so it can be rehearsed against a local cluster and cannot go stale.",
  );
  process.exit(2);
}

// SSL is required by a managed proxy and refused by a plain local Postgres: decide by host.
const isLocal = /(?:127[.]0[.]0[.]1|localhost|\[::1\])/.test(url);
const c = new Client({ connectionString: url, ssl: isLocal ? undefined : { rejectUnauthorized: false } });

/** ⛔ The one failure that leaves house bets running. It says so, in the words the console uses, and exits non-zero. */
function writeFailed(e: unknown): never {
  console.error(`\n${SWITCH_OFF_COPY.WRITE_FAILED}`);
  console.error("House bets are STILL RUNNING. Never an optimistic off.");
  console.error("If you cannot reach the database at all: Maintenance mode refuses every bet, including house bets.");
  console.error(`\n   ${String((e as Error)?.message ?? e).replace(/\s+/g, " ").slice(0, 300)}`);
  process.exit(1);
}

try {
  await c.connect();
} catch (e) {
  writeFailed(e);
}

let control: Record<string, unknown> | undefined;
let live = 0;
try {
  control = (await c.query(CONTROL_READ_SQL, [HOUSE_CONTROL_ID])).rows[0];
  live = Number((await c.query(LIVE_COUNT_SQL, [[...LIVE_INTENT_STATUSES]])).rows[0]?.n ?? 0);
} catch (e) {
  writeFailed(e);
}

if (!control) {
  console.error(`No "${HOUSE_CONTROL_ID}" control row — this database has not run the house-bot migration.`);
  await c.end();
  process.exit(1);
}

console.log(`\n── the control row, as it stands ──`);
console.log(`   running       ${control.enabled === true ? "YES" : "no"}`);
console.log(`   off cause     ${control.offCause ?? "—"}`);
console.log(`   switched at   ${control.switchedAt ?? "—"}  by ${control.switchedById ?? "—"}`);
console.log(`   cause to write ${CAUSE}   (of ${OFF_CAUSES.join(", ")})`);
console.log(`   event kind     ${KIND}   (of ${EVENT_KINDS.length} kinds the table's CHECK allows)`);
console.log(`   reason         ${REASON === null ? "— (none given: --reason \"…\")" : JSON.stringify(REASON)}`);
console.log(`   officer        ${OFFICER ?? "— (none given: OPS_OFFICER_ID=…)"}`);

// ⛔ D-OPS-1, ON SCREEN AND NOT ONLY IN THE HEADER.
console.log(`\n── live intents (${LIVE_INTENT_STATUSES.join(" or ")}) ──`);
console.log(`   ${live} live intent(s) — ⛔ THIS SCRIPT DOES NOT CANCEL THEM, and takes no lock, by design (A9).`);
console.log(`   Nothing can stake once the switch is off: every fire re-reads the control row inside its own lock.`);
if (live > 0) {
  console.log(`   They will keep SHOWING as queued until they are cancelled or they expire. To cancel them, run:\n`);
  console.log(`     ${CANCEL_LIVE_SQL};\n`);
  console.log(`   …or use the console's own Switch off once the console is usable again — it cancels them for you.`);
}

console.log(`\n── the exact statements ──`);
console.log(`   1  ${OFF_UPDATE_SQL}`);
console.log(`   2  ${EVENT_INSERT_SQL}`);
console.log(`\n⛔ NO compliance audit row is written (D-OPS-2): audit() HMAC-chains under a database-wide advisory`);
console.log(`   lock, and a hand-written INSERT from here would break that chain. The SWITCH_OFF event row IS the`);
console.log(`   record — file the compliance note by hand. See docs/HOUSE-BOTS.md §11 "Rollback levers".`);

if (!APPLY) {
  console.log(`\nNOTHING WRITTEN — re-run with --apply to switch house bets off.\n`);
  await c.end();
  process.exit(0);
}

if (!isOffCause(CAUSE)) writeFailed(new Error(`${CAUSE} is not one of OFF_CAUSES`));

let offRow: Record<string, unknown> | undefined;
try {
  offRow = (await c.query(OFF_UPDATE_SQL, [CAUSE, OFFICER, REASON, HOUSE_CONTROL_ID])).rows[0];
} catch (e) {
  writeFailed(e);
}

if (!offRow) {
  // The conditional update matched nothing: it was already off. Nothing written, nobody told, exit 0.
  console.log(`\n${SWITCH_OFF_COPY.ALREADY_OFF}`);
  console.log(`   0 rows changed, 0 events appended.\n`);
  await c.end();
  process.exit(0);
}

let eventId = "";
try {
  const payload = { cause: CAUSE, cancelled: 0, liveIntentsLeft: live, drain: "skipped", via: "ops:house-bots-off" };
  eventId = String((await c.query(EVENT_INSERT_SQL, [
    `${HOUSE_ID_PREFIX.event}${randomId(12)}`, KIND, REASON, OFFICER, JSON.stringify(payload),
  ])).rows[0]?.id ?? "");
} catch (e) {
  // The switch IS off by this line. Say both halves rather than reporting a landed write as a failed one.
  console.error(`\nHouse bets are OFF — the control row was written. The event row was NOT.`);
  console.error(`   ${String((e as Error)?.message ?? e).replace(/\s+/g, " ").slice(0, 300)}`);
  await c.end();
  process.exit(1);
}

console.log(`\n${SWITCH_OFF_COPY.BUSY}`);
console.log(`   1 control row changed → off cause ${offRow.offCause}, at ${offRow.switchedAt}`);
console.log(`   1 event appended      → ${eventId}`);
console.log(`   ${live} live intent(s) left standing, uncancelled (D-OPS-1).`);
console.log(`   ⛔ This script has no drain step and cannot know whether a bet was mid-flight — hence the sentence above.\n`);
await c.end();
process.exit(0);
