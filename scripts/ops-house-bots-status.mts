/**
 * HOUSE BOTS — THE STATUS READ, AND THE DRIFT LEGS THE RE-RELEASE LAW TURNS ON (04 S3, A23, R5).
 *
 *   npm run ops:house-bots-status                       # the release figures, each with its population
 *   npm run ops:house-bots-status -- --drift            # …plus the three drift legs, 30-day bound
 *   npm run ops:house-bots-status -- --drift --since 7  # a narrower bound, printed with its plan
 *   npm run ops:house-bots-status -- --watch            # …and the +10 min recheck the runbook asks for
 *   npm run ops:house-bots-status -- --watch 2          # a shorter wait, printed with the figures it re-read
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
 * ── COMMIT 8's OWN DUTIES (figures 6-9 and `--watch`) ──────────────────────────────────────────
 * R5's release line is five figures. The ROLLBACK runbook (ENG-21) and FS-06 ask this same command for
 * four more, and they must come from ONE invocation: an officer mid-rollback who has to run two
 * commands to answer "is it safe yet" will run one of them.
 *   6 · open house positions — the rollback runbook's step 2. Unbounded in time, across every bot.
 *   7 · live intents — ⛔ THERE IS NO GLOBAL READER FOR THIS IN THE DAL: `countLiveForTarget` and
 *       `listLiveOnMarket` are both scoped. The statuses are IMPORTED (`LIVE_INTENT_STATUSES`), never
 *       typed here, so this count and the seam's own `LIVE_SQL` cannot drift apart — the suite pins
 *       that the DAL's predicate names exactly those statuses.
 *   8 · open house exposure PER MARKET — FS-06's "TZS X across N markets". Printed beside the per-BOT
 *       total from `openExposure(null)`, because two groupings of the same money that disagree is a
 *       fact an operator must see, not one a script should hide by printing only one of them.
 *   9 · the settlement-blocked condition (HB-LC-10): a bot with open house money whose holder wallet is
 *       gone. ⛔ THIS IS A READ AND ONLY A READ. The planner's 7e pass stops such a bot and alerts;
 *       this names it and changes nothing, because an ops read run mid-incident must never move the
 *       desk underneath the officer looking at it.
 *   `--watch` is PLAN §12's "recheck 0 marked rows after 10 minutes", made a command rather than an
 *   instruction. It re-reads exactly the figures the rollback runbook watches and prints the DELTA:
 *   "still 0" and "0, unchanged since 10 minutes ago" are different statements, and only the second is
 *   evidence.
 *
 * ⛔ AND THE DRIFT VERDICT IS NAMED AT EVERY INVOCATION, even when it was not run. A status that simply
 * omits drift lets an operator read a clean five-figure line while leg (a) is non-zero. Without
 * `--drift` it prints NOT MEASURED and the command that measures it — never nothing.
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
const WATCH = has("--watch");
/** Minutes before the recheck. PLAN §12 says ten; a number may follow the flag so the suite can drive it. */
const WATCH_MIN = (() => {
  const v = valueOf("--watch");
  const n = v === null || v.startsWith("-") ? NaN : Number(v);
  return Number.isFinite(n) && n > 0 && n <= 60 ? n : 10;
})();
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
const { db } = await import("../src/lib/server/store.ts");
const { prisma } = await import("../src/lib/server/prisma.ts");
const { BOOT_GRACE_MS, ENGINE_STALE_MS, LIVE_INTENT_STATUSES } = await import("../src/lib/house-bot/constants.ts");
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
/**
 * The four figures the rollback runbook re-reads. ⛔ ONE READER, used by the first pass and by
 * `--watch`'s recheck, so the two can never quietly measure different things.
 * ⛔ Live intents have NO global reader in the DAL and the statuses are IMPORTED, never typed.
 */
const LIVE_IN = LIVE_INTENT_STATUSES.map((s) => `'${s}'`).join(", ");
type Recheck = { markedPositions: number | null; markedTxns: number | null; openHouse: number | null; liveIntents: number | null };
async function readRecheck(): Promise<Recheck> {
  const none: Recheck = { markedPositions: null, markedTxns: null, openHouse: null, liveIntents: null };
  if (!onPostgres) return none;
  const pdb = prisma();
  if (!pdb) return none;
  const one = async (sql: string): Promise<number> => {
    const [r] = (await pdb.$queryRawUnsafe(sql)) as Array<{ n: number }>;
    return Number(r?.n ?? 0);
  };
  return {
    markedPositions: await one(`SELECT count(*)::int AS "n" FROM "Position" WHERE "houseBotId" IS NOT NULL`),
    markedTxns: await one(`SELECT count(*)::int AS "n" FROM "Transaction" WHERE "houseBotId" IS NOT NULL`),
    openHouse: await one(`SELECT count(*)::int AS "n" FROM "Position" WHERE "houseBotId" IS NOT NULL AND "status"::text = 'OPEN'`),
    liveIntents: await one(`SELECT count(*)::int AS "n" FROM "HouseBotIntent" WHERE "status" IN (${LIVE_IN})`),
  };
}
const first = await readRecheck();
const { markedPositions, markedTxns } = first;
if (onPostgres) {
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

// ── 6 and 7 · the rollback runbook's own two figures (ENG-21 step 2) ───────────────────────────
if (onPostgres) {
  console.log(`6  open house pos   ${first.openHouse ?? "—"}   · population: MARKED positions whose status is OPEN, every bot, ALL TIME — the figure the rollback runbook waits on`);
  console.log(`7  live intents     ${first.liveIntents ?? "—"}   · population: HouseBotIntent rows whose status is ${LIVE_INTENT_STATUSES.join(" or ")} — imported from the constant the seam's own predicate is built from, never typed here`);
} else {
  console.log(`6  open house pos   NOT MEASURABLE on the memory store (no whole-table reader) — run with DATABASE_URL set`);
  console.log(`7  live intents     NOT MEASURABLE on the memory store: the DAL's live-intent readers are scoped to ONE market or ONE target,`);
  console.log(`                    and a sum of the scopes somebody remembered is not a global count.`);
}

// ── 8 · open house exposure PER MARKET (FS-06) ─────────────────────────────────────────────────
// ⛔ BOTH GROUPINGS ARE PRINTED. The per-BOT total is the number every existing reader gives; the
// per-MARKET rows are FS-06's "TZS X across N markets". If the two ever disagree, that is a fact an
// operator must see — a script that printed only one of them would hide exactly the defect that makes
// printing both worth the two lines.
let byMarket: Array<{ marketId: string; openStakeTzs: number; bots: number }> = [];
let byBot: Array<{ houseBotId: string; openStakeTzs: number }> = [];
try {
  byMarket = await dal.houseBookStore.openExposureByMarket();
  byBot = await dal.houseBookStore.openExposure(null);
} catch (e) {
  console.log(`   ⛔ open exposure could not be read: ${String((e as Error)?.message ?? e).slice(0, 200)}`);
}
const marketTotal = byMarket.reduce((s, r) => s + r.openStakeTzs, 0);
const botTotal = byBot.reduce((s, r) => s + r.openStakeTzs, 0);
console.log(`8  open exposure    TZS ${marketTotal.toLocaleString("en-US")} across ${byMarket.length} market(s)`
  + `   · population: OPEN marked positions grouped by MARKET`);
for (const r of byMarket.slice(0, 20)) console.log(`                    ${r.marketId}  TZS ${r.openStakeTzs.toLocaleString("en-US")}  · ${r.bots} bot(s)`);
console.log(`                    the same money grouped by BOT: TZS ${botTotal.toLocaleString("en-US")} across ${byBot.length} account(s)`
  + `   · ${marketTotal === botTotal ? "the two groupings agree" : "⛔ THE TWO GROUPINGS DISAGREE — one of these readers is wrong; do not deploy on this figure"}`);

// ── 9 · settlement-blocked: open house money with no holder wallet (HB-LC-10) ───────────────────
// ⛔ A READ, AND ONLY A READ. The planner's 7e pass AUTO_PAUSEs such an account and alerts; this
// names it and changes nothing. An ops read run mid-incident must not move the desk under the officer.
const blocked: Array<{ botId: string; userId: string; openStakeTzs: number; status: string }> = [];
let walletProbeFailed = 0;
for (const row of byBot) {
  let bot: Awaited<ReturnType<typeof dal.houseBotStore.get>> | null = null;
  try { bot = await dal.houseBotStore.get(row.houseBotId); } catch { walletProbeFailed++; continue; }
  if (!bot) continue;
  try {
    if (await db.wallet.findByUserId(bot.userId)) continue;
  } catch {
    walletProbeFailed++; // ⛔ a read that FAILED is never reported as a missing wallet (planner 7e's own rule)
    continue;
  }
  blocked.push({ botId: bot.id, userId: bot.userId, openStakeTzs: row.openStakeTzs, status: bot.status });
}
console.log(`9  settle-blocked   ${blocked.length}   · population: accounts with OPEN house money whose holder WALLET is absent (HB-LC-10 / WALLET_MISSING)`
  + (walletProbeFailed ? `  · ${walletProbeFailed} account(s) could not be read and are NOT counted as missing` : ""));
for (const b of blocked) {
  console.log(`                    ⛔ ${b.botId} (holder ${b.userId}, ${b.status}) holds TZS ${b.openStakeTzs.toLocaleString("en-US")} and CANNOT be settled — restore the wallet;`);
  console.log(`                       this command changed nothing (the planner's own pass is what pauses the account).`);
}

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
} else {
  // ⛔ NAMED, NEVER OMITTED. A status that simply leaves drift out lets an officer read a clean
  // five-figure line while leg (a) is non-zero — a true report of the wrong question.
  console.log(`\n   drift            NOT MEASURED in this run — 04's re-release law requires all three legs at 0 before any`);
  console.log(`                    later house deploy. Measure it: npm run ops:house-bots-status -- --drift`);
}

// ── the +10 minute recheck (PLAN §12) ──────────────────────────────────────────────────────────
if (WATCH) {
  console.log(`\n══ recheck ══  waiting ${WATCH_MIN} minute(s), then re-reading the four figures the rollback runbook watches.`);
  await new Promise((r) => setTimeout(r, Math.round(WATCH_MIN * 60_000)));
  const again = await readRecheck();
  const line = (label: string, a: number | null, b: number | null): void => {
    const delta = a === null || b === null ? "—" : b === a ? "unchanged" : `${b > a ? "+" : ""}${b - a}`;
    console.log(`   ${label.padEnd(18)}${a ?? "—"} → ${b ?? "—"}   · ${delta}`);
  };
  console.log(`   (a figure that is still 0 and a figure that is 0 AND UNCHANGED over ${WATCH_MIN} minute(s) are different statements)`);
  line("marked Position", first.markedPositions, again.markedPositions);
  line("marked Transaction", first.markedTxns, again.markedTxns);
  line("open house pos", first.openHouse, again.openHouse);
  line("live intents", first.liveIntents, again.liveIntents);
  const moved = (["markedPositions", "markedTxns", "openHouse", "liveIntents"] as const).filter((k) => first[k] !== again[k]);
  console.log(`   ${moved.length === 0 ? `nothing moved in ${WATCH_MIN} minute(s) — the desk is quiet` : `⛔ ${moved.join(", ")} MOVED — something is still writing house rows`}`);
}

console.log("");
process.exit(drifted === 0 ? 0 : 1);
