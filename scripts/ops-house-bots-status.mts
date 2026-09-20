/**
 * HOUSE BOTS — THE STATUS READ, AND THE DRIFT LEGS THE RE-RELEASE LAW TURNS ON (04 S3, A23, R5).
 *
 *   npm run ops:house-bots-status                       # the release figures, each with its population
 *   npm run ops:house-bots-status -- --drift            # …plus the three drift legs, 30-day bound
 *   npm run ops:house-bots-status -- --drift --since 7  # a narrower bound, printed with its plan
 *
 * ⛔ IT WRITES NOTHING. No DDL, no DML, no transaction. It is the one command an officer runs before a
 * deploy and after a rollback, so it must be safe to run at any moment, including mid-incident.
 *
 * ⛔ EVERY FIGURE PRINTS THE POPULATION IT COUNTS. "0 bots" and "0 marked rows" are different zeros from
 * different tables, and R5's five-figure release line is only evidence if each figure says what it counted.
 * A number without its population is how "not applicable" gets read as "fine".
 *
 * ── WHY IT IS BUILT ON THE DAL, WHERE `ops-house-bots-off.mts` IS NOT ───────────────────────────
 * The OFF script exists for a database the app cannot reach (ENG-18), so it cannot use the app's pool.
 * This is a READ, run when things work, and the register requires it to run as a unit on the MEMORY
 * store too (ENG-21) — which only the DAL can do. The drift legs are raw SQL through the Prisma client
 * and are Postgres-only, because a join between two tables has no meaning on the memory twin.
 *
 * ⛔ IT DOES NOT IMPORT `loadWorld`. That fixture's FIRST statement is `process.env.MARKET_SCHEDULER =
 * "false"`, unconditionally — an ops script that imported it to borrow an API would silently disable the
 * market scheduler in whatever process ran it.
 *
 * ── ⛔ THE ENGINE FIGURES COME FROM DURABLE ROWS, NEVER FROM THIS PROCESS ───────────────────────
 * `houseBotEngineHealth()` reports the in-memory state of the process that CALLS it, so an ops process
 * would print `started: false` and call a perfectly healthy production engine dead. `houseEngineHealthFor()`
 * is worse for this purpose: it takes a viewer id and gates on the house-alert audience, and an ops script
 * has no viewer and must not manufacture an admin id to get past a gate. So the rows are read with
 * `listInstances()` and folded by `houseEngineBeats()` — C5-SPEC ruling 172's "the same durable facts",
 * which is a DEVIATION from reusing the audience-gated wrapper, recorded here on purpose.
 *
 * ⛔ "ENGINE ENABLED" IS NOT A FACT THIS DATABASE HOLDS. `engineEnabled` has exactly ONE writer in the
 * tree — a successful boot — and a refused start writes no row at all, so `false` is unreachable and
 * "disabled by configuration" is indistinguishable from "never booted". This script therefore prints
 * "an engine booted here at <instant>" and never "the engine is not disabled".
 *
 * ⛔ AND THE VERDICT ALONE PRINTS NOTHING WHEN THE SWITCH IS OFF (`houseEngineVerdict` returns null for
 * any state but ON) — which is the shipped state and REL-5's exact state. So the raw planner-beat age is
 * printed against `ENGINE_STALE_MS` whatever the switch says, and the boot grace is `BOOT_GRACE_MS`,
 * imported rather than typed.
 *
 * ── THE THREE DRIFT LEGS (04's re-release law) ─────────────────────────────────────────────────
 * (a) a Transaction whose `positionId` names a MARKED Position while its own marker is NULL;
 * (b) CASHOUT rows on marked positions;
 * (c) wagering or AGENT_COMMISSION on marked positions.
 *
 * ⛔ LEG (a) IS TIME-BOUNDED AND SAYS SO. `Transaction` has NO index on `positionId`, and the one marker
 * index it carries is `WHERE "houseBotId" IS NOT NULL` — the wrong polarity for finding NULL markers. So
 * the join starts from `Position` (served by `Position_houseBotId_placedAt_marked_idx`) inside a `--since`
 * window, the bound is printed, the EXPLAIN plan is printed, and an unbounded run is REFUSED rather than
 * left to seq-scan the ledger of a live money platform.
 *
 * ⛔ LEG (c) IS SPLIT, BECAUSE ONE HALF CANNOT BE MEASURED ON THIS SCHEMA. AGENT_COMMISSION is countable
 * two ways (a ledger row carrying the positionId, and the deterministic `ReferralReward.sourceRef` the
 * commission writer mints). WAGERING IS NOT: it is a counter on `BonusGrant`, and that model carries no
 * positionId at all — measured, not assumed. Printing `wagering: 0` would be a true measurement of the
 * wrong population, which is the most dangerous silent verdict there is, so it prints the reason instead.
 *
 * ⛔ D19: this prints to a TERMINAL and may name the feature. It writes nothing anywhere else.
 */
const argv = process.argv.slice(2);
const has = (f: string): boolean => argv.includes(f);
const valueOf = (f: string): string | null => {
  const i = argv.indexOf(f);
  return i === -1 ? null : (argv[i + 1] ?? null);
};

const DRIFT = has("--drift");
const RAW_SINCE = valueOf("--since");
/** Days of `Position.placedAt` the drift legs look back over. */
const SINCE_DAYS = RAW_SINCE === null ? 30 : Number(RAW_SINCE);
const DRIFT_LIMIT = 200;

/** The byte-for-byte sentence leg (c) prints where a number would be a lie. Pinned by the suite. */
export const WAGERING_NOT_MEASURABLE =
  "wagering: NOT MEASURABLE — wagering is a counter on BonusGrant, which carries no positionId on this schema";

/**
 * The backend, computed exactly as the house-bot suites compute it. Read BEFORE the first store import,
 * because every store picks its backend when its module is first imported.
 */
const onPostgres = !!process.env.DATABASE_URL && process.env.USE_PRISMA_DAL !== "false";

const dal = await import("../src/lib/server/house-bot-dal.ts");
const { prisma } = await import("../src/lib/server/prisma.ts");
const { BOOT_GRACE_MS, ENGINE_STALE_MS } = await import("../src/lib/house-bot/constants.ts");
const { houseEngineBeats, houseEngineVerdict } = await import("../src/lib/server/house-bot/engine-health.ts");

const age = (atMs: number | null, nowMs: number): string => (atMs === null ? "never" : `${Math.round((nowMs - atMs) / 1000)} s ago`);

console.log(`\n══ house bots · status ══`);
console.log(`   store            ${onPostgres ? "postgres (the app's own data layer)" : "memory (no database — the unit run, ENG-21)"}`);

// ── 1 · the master switch ──────────────────────────────────────────────────────────────────────
let control: Awaited<ReturnType<typeof dal.houseBotControlStore.get>> | null = null;
try {
  control = await dal.houseBotControlStore.get();
} catch (e) {
  console.log(`   ⛔ the control row could not be read: ${String((e as Error)?.message ?? e).slice(0, 200)}`);
}
console.log(`1  master switch    ${control === null ? "UNREADABLE" : control.enabled ? "ON" : "OFF"}`
  + (control === null ? "" : `  · off cause ${control.offCause ?? "—"} · switched ${control.switchedAt ?? "never"} by ${control.switchedById ?? "—"}`));

// ── 2 · the roster ─────────────────────────────────────────────────────────────────────────────
// ⛔ `countLive()` counts every NON-REMOVED bot — a different population from the engine verdict's
// ACTIVE-only count, and the label says which.
let bots: number | null = null;
try {
  bots = await dal.houseBotStore.countLive();
} catch (e) {
  console.log(`   ⛔ the roster could not be counted: ${String((e as Error)?.message ?? e).slice(0, 200)}`);
}
console.log(`2  bots             ${bots ?? "UNREADABLE"}   · population: non-REMOVED designations (PAUSED and AUTO_PAUSED included, REMOVED excluded)`);

// ── 3 · marked rows, ALL TIME ──────────────────────────────────────────────────────────────────
// ⛔ UNBOUNDED ON PURPOSE. `houseSeam.globalUsage` is bounded to the last day and would print 0 on a
// database holding older marked rows — the exact shape that makes a release figure meaningless.
let markedPositions: number | null = null;
let markedTxns: number | null = null;
if (onPostgres) {
  const db = prisma();
  if (db) {
    const [p] = (await db.$queryRawUnsafe(`SELECT count(*)::int AS "n" FROM "Position" WHERE "houseBotId" IS NOT NULL`)) as Array<{ n: number }>;
    const [t] = (await db.$queryRawUnsafe(`SELECT count(*)::int AS "n" FROM "Transaction" WHERE "houseBotId" IS NOT NULL`)) as Array<{ n: number }>;
    markedPositions = Number(p?.n ?? 0);
    markedTxns = Number(t?.n ?? 0);
  }
  console.log(`3  marked rows      Position ${markedPositions ?? "—"} · Transaction ${markedTxns ?? "—"}   · population: every row whose marker is set, ALL TIME (never a 24-hour window)`);
} else {
  console.log(`3  marked rows      NOT MEASURABLE on the memory store — it has no whole-table reader for the ledger, and a`);
  console.log(`                    partial count would be a true number over the wrong population. Run with DATABASE_URL set.`);
}

// ── 4 and 5 · the engine's durable beats ───────────────────────────────────────────────────────
const nowMs = Date.now();
let beats: ReturnType<typeof houseEngineBeats> | null = null;
try {
  beats = houseEngineBeats(await dal.houseBotRuntimeStore.listInstances());
} catch (e) {
  console.log(`   ⛔ the runtime rows could not be read: ${String((e as Error)?.message ?? e).slice(0, 200)}`);
}
if (beats === null) {
  console.log(`4  engine           UNREADABLE — no instance row could be read`);
  console.log(`5  planner beat     UNREADABLE`);
} else {
  console.log(`4  engine           ${beats.bootAtMs === null ? "no engine has booted against this database" : `an engine booted here at ${new Date(beats.bootAtMs).toISOString()}`}`
    + `   · ${beats.instances} instance row(s)`);
  console.log(`                    ⛔ "enabled" is not a fact this database holds: a refused start writes no row, so a`);
  console.log(`                    disabled engine and one that never booted are the same absence.`);
  console.log(`5  planner beat     ${age(beats.plannerBeatAtMs, nowMs)}   · stale past ${ENGINE_STALE_MS / 1000} s · boot grace ${BOOT_GRACE_MS / 1000} s`);
  console.log(`                    poller beat ${age(beats.pollerBeatAtMs, nowMs)} · poller error ${age(beats.pollerErrorAtMs, nowMs)} (streak ${beats.pollerErrorStreak})`
    + ` · failed duties ${beats.plannerFailedDuties.length === 0 ? "none" : beats.plannerFailedDuties.join(", ")} · skew ${beats.skewMs ?? "unmeasured"} ms`);
}

let activeAccounts: number | null = null;
try {
  activeAccounts = (await dal.houseBotStore.listNonRemoved()).filter((b) => b.status === "ACTIVE").length;
} catch { /* reported as null below; a failed roster read is not zero */ }
const verdict = houseEngineVerdict({ on: control === null ? null : control.enabled, beats, activeAccounts, nowMs });
console.log(`   verdict          ${verdict ?? "— (no verdict: it is computed only while the switch is ON, which is why figure 5 is printed raw)"}`
  + `   · ACTIVE accounts ${activeAccounts ?? "UNREADABLE"}`);

// ── the three drift legs ───────────────────────────────────────────────────────────────────────
let drifted = 0;
if (DRIFT) {
  console.log(`\n══ drift ══  (04's re-release law: every leg must report 0 before any later house deploy)`);
  if (!onPostgres) {
    console.log(`   ⛔ REFUSED on the memory store: every leg is a join between two tables, which the memory twin has no`);
    console.log(`      meaning for. Run with DATABASE_URL set. Nothing was measured — this is not a clean result.`);
    process.exit(2);
  }
  if (!Number.isFinite(SINCE_DAYS) || SINCE_DAYS <= 0) {
    console.log(`   ⛔ REFUSED: --since must be a positive number of days. An UNBOUNDED run is refused on purpose —`);
    console.log(`      "Transaction" has no index on "positionId" and its only marker index is WHERE "houseBotId" IS NOT`);
    console.log(`      NULL, the wrong polarity for finding NULL markers, so an unbounded join seq-scans the ledger.`);
    process.exit(2);
  }
  const db = prisma();
  if (!db) {
    console.log(`   ⛔ REFUSED: no Prisma client.`);
    process.exit(2);
  }
  const bound = `p."placedAt" >= (now() AT TIME ZONE 'UTC') - (${SINCE_DAYS}::int * interval '1 day')`;
  console.log(`   bound            ${SINCE_DAYS} day(s) of Position.placedAt — the join starts from "Position", served by`);
  console.log(`                    "Position_houseBotId_placedAt_marked_idx". Widen it with --since <days>.`);

  const LEG_A = `SELECT t."id" AS "txnId", t."type"::text AS "type", t."positionId", p."houseBotId", t."createdAt"::text AS "createdAt"`
    + ` FROM "Position" p JOIN "Transaction" t ON t."positionId" = p."id"`
    + ` WHERE p."houseBotId" IS NOT NULL AND t."houseBotId" IS NULL AND ${bound}`
    + ` ORDER BY t."createdAt" LIMIT ${DRIFT_LIMIT}`;
  const legA = (await db.$queryRawUnsafe(LEG_A)) as Array<Record<string, unknown>>;
  console.log(`\n   (a) unmarked ledger rows on MARKED positions … ${legA.length}${legA.length === DRIFT_LIMIT ? ` (capped at ${DRIFT_LIMIT})` : ""}`);
  for (const r of legA.slice(0, 20)) console.log(`       ${r.txnId}  ${r.type}  position ${r.positionId}  marker ${r.houseBotId}  ${r.createdAt}`);
  console.log(`       fix: npm run ops:house-bots-remark -- --apply   (NULL-filling only; a second run changes 0 rows)`);
  // ⛔ THE PLAN IS PRINTED, not promised: a bounded query that fell back to a sequential scan is a
  // different command from the one this header argues for, and only EXPLAIN can tell you which ran.
  const plan = (await db.$queryRawUnsafe(`EXPLAIN ${LEG_A}`)) as Array<Record<string, string>>;
  console.log(`       plan:`);
  for (const row of plan) console.log(`         ${Object.values(row)[0]}`);

  const LEG_B = `SELECT t."id" AS "txnId", t."positionId", p."houseBotId", t."amount"::text AS "amount"`
    + ` FROM "Position" p JOIN "Transaction" t ON t."positionId" = p."id"`
    + ` WHERE p."houseBotId" IS NOT NULL AND t."type"::text = 'CASHOUT' AND ${bound}`
    + ` ORDER BY t."createdAt" LIMIT ${DRIFT_LIMIT}`;
  const legB = (await db.$queryRawUnsafe(LEG_B)) as Array<Record<string, unknown>>;
  console.log(`\n   (b) CASHOUT rows on MARKED positions … ${legB.length}`);
  for (const r of legB.slice(0, 20)) console.log(`       ${r.txnId}  position ${r.positionId}  marker ${r.houseBotId}  ${r.amount}`);
  console.log(`       ⛔ never clawed back automatically: amounts go into a COMPLIANCE-DECISIONS note (04's re-release law).`);

  const LEG_C1 = `SELECT t."id" AS "txnId", t."positionId", p."houseBotId", t."amount"::text AS "amount"`
    + ` FROM "Position" p JOIN "Transaction" t ON t."positionId" = p."id"`
    + ` WHERE p."houseBotId" IS NOT NULL AND t."type"::text = 'AGENT_COMMISSION' AND ${bound}`
    + ` ORDER BY t."createdAt" LIMIT ${DRIFT_LIMIT}`;
  const legC1 = (await db.$queryRawUnsafe(LEG_C1)) as Array<Record<string, unknown>>;
  // ⛔ THE SECOND HALF OF (c) IS NOT A LEDGER ROW AT ALL. The commission writer mints a DETERMINISTIC
  // `sourceRef` — `referral:commission:<marketId>:<positionId>` — so the reward row is found by
  // rebuilding that string from the marked Position, never by a LIKE over the whole table.
  const LEG_C2 = `SELECT r."id" AS "rewardId", r."sourceRef", p."houseBotId", r."amountTzs"::text AS "amountTzs"`
    + ` FROM "Position" p JOIN "ReferralReward" r ON r."sourceRef" = 'referral:commission:' || p."marketId" || ':' || p."id"`
    + ` WHERE p."houseBotId" IS NOT NULL AND ${bound}`
    + ` ORDER BY r."id" LIMIT ${DRIFT_LIMIT}`;
  const legC2 = (await db.$queryRawUnsafe(LEG_C2)) as Array<Record<string, unknown>>;
  console.log(`\n   (c) AGENT_COMMISSION on MARKED positions … ${legC1.length} ledger row(s), ${legC2.length} referral reward row(s)`);
  for (const r of [...legC1, ...legC2].slice(0, 20)) console.log(`       ${JSON.stringify(r)}`);
  console.log(`       ${WAGERING_NOT_MEASURABLE}`);

  drifted = legA.length + legB.length + legC1.length + legC2.length;
  console.log(`\n   drift total      ${drifted}${drifted === 0 ? "  · the re-release law is satisfied for the bound above" : "  · ⛔ NOT ZERO — do not deploy the house SHA over this database yet"}`);
}

console.log("");
process.exit(drifted === 0 ? 0 : 1);
