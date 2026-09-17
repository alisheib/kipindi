/**
 * THE HOUSE DAL CASE LIST — one script, run twice by `test:house-bot-migrations` §d: once against a
 * migrated Postgres, once against the in-memory twin. The parent requires every outcome to equal
 * `EXPECTED` on BOTH runs, and the two runs to be identical.
 *
 * ⭐ WHY ONE CASE LIST AND NOT TWO SUITES. The house DAL's exactly-once guarantees are partial unique
 * indexes and named CHECKs. The memory twin mirrors each by name (`MEM_UNIQUES`, `MEM_CHECKS`), and a
 * mirror nobody compares with the original drifts: every memory-backed suite goes green while
 * Postgres refuses the row, or — worse — memory refuses a row production accepts. Running the SAME
 * cases on both stores and diffing the outcomes is the only proof the twin is the same contract.
 * `test:dal-parity` proves the twins EXIST, at source level; this proves they BEHAVE alike.
 *
 * ⛔ OUTCOMES ARE NAMES, NEVER TIMES OR RANDOM IDS. Every fixture id is fixed, every outcome is a
 * status, a count, a boolean or a violation name (`unique:<index>`, `check:<constraint>`), so a
 * difference between the two runs is a difference in behaviour and nothing else.
 *
 * ⛔ FIXTURES DO NOT LEAK BETWEEN CASES. Every intent is due an hour from now unless its case needs
 * it due, so the claim case (c13) sees only its own rows; every market, trigger and press id is
 * unique to its case. Case order still matters where a case says so (c06 runs the STALE pass).
 *
 * Two places a fixture is PLANTED differently per store, because the DAL offers no way to write a
 * backdated row (and must not): the old AlertOnce keys in c18. The behaviour under test — the purge —
 * is the DAL's on both sides.
 *
 * Not covered here, on purpose:
 *   · `houseBotSchemaReady()` lands in build commit 4; its cases join this list then.
 *   · `HouseBotIntent_idempotencyKey_key` cannot fire: the CHECK ties the key to the primary key,
 *     so a duplicate key is a duplicate id and the primary key refuses it first.
 *   · The User CHECK is proven on Postgres only (the memory user store does not run it); the parent
 *     does that outside the parity comparison.
 *
 * Run: npm run test:house-bot-migrations (never directly: the parent sets the environment)
 */
import { writeFileSync } from "node:fs";

export type CaseLine = { case: string; outcome: string };
export type CaseRun = { store: "postgres" | "memory"; lines: CaseLine[]; pgOnly: CaseLine[] };

/**
 * Every numeric CHECK on a bot row: `[column, min, max]`, exactly as the tables migration writes it.
 * ⚠️ Stated a SECOND time on purpose — the migration and `MEM_CHECKS` are the two things under test,
 * so neither may be the source of the expected bounds.
 */
export const BOT_CAP_BOUNDS: ReadonlyArray<readonly [string, number, number]> = [
  ["stakeMinTzs", 0, 1_000_000_000],
  ["stakeMaxTzs", 0, 1_000_000_000],
  ["capPerMarketTzs", 0, 1_000_000_000],
  ["capDailyStakeTzs", 0, 1_000_000_000],
  ["capDailyLossTzs", 0, 1_000_000_000],
  ["capOpenExposureTzs", 0, 1_000_000_000],
  ["balanceFloorTzs", 0, 1_000_000_000],
  ["freqMinGapSec", 0, 86_400],
  ["freqMaxPerHour", 1, 60],
  ["freqMaxPerDay", 1, 1_440],
  ["freqMaxPerMarket", 1, 6],
  ["capStaffChosenPerDay", 1, 50],
  ["capStaffChosenDailyTzs", 0, 1_000_000_000],
  ["targetsMaxActive", 1, 50],
];

/** Every numeric CHECK on the control row. `gCounterPerPlayerPerDay` is 1–1,440: a per-player daily
 *  counter above the minutes in a day means nothing. */
export const LIMIT_BOUNDS: ReadonlyArray<readonly [string, number, number]> = [
  ["gCapDailyStakeTzs", 0, 1_000_000_000],
  ["gCapDailyLossTzs", 0, 1_000_000_000],
  ["gCapOpenExposureTzs", 0, 1_000_000_000],
  ["gCapPerMarketTzs", 0, 1_000_000_000],
  ["gMaxBetsPerMinute", 1, 20],
  ["gMaxBetsPerDay", 1, 28_800],
  ["gCounterPerPlayerPerDay", 1, 1_440],
  ["gCounterPerPlayerTzsPerDay", 0, 1_000_000_000],
  ["maxDesignatedBots", 1, 20],
  ["bellAlertsPerHour", 0, 60],
  ["gCapStaffChosenPerDay", 1, 200],
  ["gCapStaffChosenDailyTzs", 0, 1_000_000_000],
  ["gTargetsMaxActive", 1, 200],
  ["gStaffChosenMaxCounterpartyShare", 10, 100],
];

/** A press id in the browser's `crypto.randomUUID()` shape, fixed per case. */
export const submitIdFor = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const OFFICER = "usr_hb_officer";

/** The book rows c20 expects, spelled once so the key order matches `foldDayBook`. */
const BOOK_DAY_14 = JSON.stringify({
  houseBotId: "hb_c20", dayKey: "2026-09-14", bets: 1, stakedTzs: 1000, openStakeTzs: 0,
  settledStakeTzs: 1000, returnedTzs: 1800, realisedLossTzs: -800, projectedLossTzs: -800,
});
const BOOK_DAY_15 = JSON.stringify({
  houseBotId: "hb_c20", dayKey: "2026-09-15", bets: 1, stakedTzs: 2000, openStakeTzs: 2000,
  settledStakeTzs: 0, returnedTzs: 0, realisedLossTzs: 0, projectedLossTzs: 2000,
});

/**
 * ⭐ THE SPEC. One entry per recorded outcome. A case the runner records but this list does not name
 * fails the parent as loudly as a wrong outcome — an unlisted case is an unchecked one.
 */
export const EXPECTED: Readonly<Record<string, string>> = buildExpected();

function buildExpected(): Record<string, string> {
  const e: Record<string, string> = {
    // c01 · one live bot per account
    "c01.a first live bot": "PAUSED",
    "c01.b second live bot for the same account": "unique:HouseBot_userId_live_key",
    "c01.c remove the first": "REMOVED",
    "c01.d designate again after REMOVED": "PAUSED",
    // c02 · case-insensitive live labels
    "c02.a live Bot A": "PAUSED",
    "c02.b bot a beside a live Bot A": "unique:HouseBot_labelKey_live_key",
    "c02.c full-width BOT A beside a live Bot A": "unique:HouseBot_labelKey_live_key",
    "c02.d remove Bot A": "REMOVED",
    "c02.e Bot A again after REMOVED": "PAUSED",
    "c02.control lower() alone would miss the full-width label": "true:false",
    // c03 · one decision per trigger, for ever
    "c03.a COUNTER on a trigger": "PENDING",
    "c03.b claim and skip it": "CLAIMED:true",
    "c03.c a second COUNTER on the trigger, even after SKIPPED": "unique:hbi_counter_anchor_uq",
    "c03.d the sweep insert swallows the same clash": "null",
    // c04 · FILL/OPENER re-plan only after CANCELLED
    "c04.a FILL planned": "PENDING",
    "c04.b cancel it": "CANCELLED",
    "c04.c re-plan after CANCELLED": "PENDING",
    "c04.d claim and skip the re-plan": "CLAIMED:true",
    "c04.e re-plan after SKIPPED": "unique:hbi_fill_opener_anchor_uq",
    "c04.f an OPENER on the same market is its own anchor": "PENDING",
    // c05 · a press id is used once, ever
    "c05.a Enter now queued": "PENDING",
    "c05.b cancel it": "CANCELLED",
    "c05.c the same press id again, even after CANCELLED": "unique:hbi_manual_anchor_uq",
    // c06 · one live Enter now per market
    "c06.a Enter now with a passed staleAt": "PENDING",
    "c06.b a second live Enter now on the market": "unique:hbi_manual_live_market_uq",
    "c06.c the STALE pass expires the first": "true:1",
    "c06.d the next Enter now on the market is accepted": "PENDING",
    "c06.e the expired row reads EXPIRED STALE": "EXPIRED:STALE",
    // c07 · one opener draw per market
    "c07.a first draw": "YES:true",
    "c07.b a second draw returns the first side": "YES:false",
    "c07.c a raw second draw event": "unique:hbe_opener_draw_uq",
    "c07.d findOpenerDraw reads the stored side": "YES",
    // c08 · targets
    "c08.a add a target": "ACTIVE:1:12000:true",
    "c08.b a second ACTIVE target on the poll": "unique:hbt_active_market_uq",
    "c08.c end the first": "ENDED:DONE",
    "c08.d an ENDED DONE target is not a stop": "false",
    "c08.e the poll can be targeted again": "ACTIVE",
    "c08.f remove it": `REMOVED:${OFFICER}`,
    "c08.g a removed target is a stop": "true",
    "c08.h veto the ENDED DONE target": "ENDED:VETOED:DONE",
    "c08.i a second veto is a no-op": "null",
    "c08.j CAS update": "true:2:usr_hb_officer2|false:2",
    "c08.k a timing patch may not touch other columns": "error:house-bot-dal: 'status' is not a writable column",
    "c08.l the share-locked insert on an ACTIVE target": "true:true",
    "c08.m the same trigger again is already decided": "false:true",
    "c08.n live reactions on the target": "1",
    "c08.o after removal nothing is inserted": "false:false",
    "c08.p the row must name the target it is inserted under": "error:house-bot-dal: insertTargetedIfActive row.targetId must equal targetId",
    "c08.q consent void ends every ACTIVE target of the bot": "hbt_c08c,hbt_c08d:CONSENT_VOID",
    "c08.r active, ended and counted for the bot": "0:5:0",
    "c08.s delay min 4": "check:HouseBotTarget_delayMinSec_check",
    "c08.t delay max 601": "check:HouseBotTarget_delayMaxSec_check",
    "c08.u min 30 above max 10": "check:HouseBotTarget_delay_order_check",
    "c08.v min equal to max, at both bounds": "ACTIVE:ACTIVE",
    // c09 · presses
    "c09.a a press is recorded CHECKING": "ok:CHECKING:null",
    "c09.b the same press again reads the existing row": "existing:hbp_c09a:CHECKING",
    "c09.c refuse": "REFUSED:OWNER_POSITION",
    "c09.d a second refuse is a no-op": "null",
    "c09.e a malformed submit id": "check:HouseBotPress_submitId_check",
    "c09.f an unknown purpose": "check:HouseBotPress_purpose_check",
    "c09.g a target press can never be QUEUED": "check:HouseBotPress_queued_check",
    "c09.h Enter now CHECKING then QUEUED then DONE": "QUEUED:hbi_c09f|DONE|true",
    "c09.i a target press goes CHECKING then DONE in its transaction": "DONE:hbt_c09|true",
    "c09.j the audit lease is taken once, the audit id written once": "true:false:true:false",
    "c09.k nothing fresh is interrupted or due for audit repair": "0:0",
    // c10 · CHECKs on intents
    "c10.a MANUAL without requestedById": "check:HouseBotIntent_requestedById_check",
    "c10.b MANUAL on Up and Down": "check:HouseBotIntent_manual_polls_check",
    "c10.c targetId on a FILL": "check:HouseBotIntent_targetId_check",
    "c10.d requestedById on a COUNTER": "check:HouseBotIntent_requestedById_check",
    "c10.e entryCondition on a FILL": "check:HouseBotIntent_entryCondition_manual_check",
    "c10.f a malformed Enter now anchor": "check:HouseBotIntent_manual_anchor_check",
    "c10.g a zero stake": "check:HouseBotIntent_stakeTzs_check",
    "c10.h a PLACED row without its position": "check:HouseBotIntent_placed_check",
    "c10.i a fractional stake is refused before the database could round it": "error:house-bot-dal: HouseBotIntent.stakeTzs must be a whole number",
    // c11 · BIGINT round trip
    "c11.a a BIGINT bot cap reads back as a number": "true:number:1000000000",
    "c11.b BIGINT limits read back as numbers": "number:1000000000:number:1000000000",
    "c11.c an intent stake reads back as a number": "number:1000000000",
    "c11.d the struck columns are not writable on either twin (D20: staff edge, Board disclosure)": "gStaffEdgeNetTzs:refused|gStaffEdgeWinRatePts:refused|boardDisclosureSections:refused|boardDisclosureSentAt:refused|map:|row:|kept:3",
    // c12 · reading violations (pure)
    "c12.a an unknown unique violation names nothing": "null",
    "c12.b a raw-SQL violation names its index": "hbt_active_market_uq",
    "c12.c P2002 with the index in meta.target": "hbp_actor_submit_uq",
    "c12.d P2002 with a field list names nothing": "null",
    "c12.e a message naming two house indexes names nothing": "null",
    "c12.f a name inside a longer identifier is not that name": "null",
    "c12.g a CHECK violation names its constraint": "HouseBot_label_check",
    "c12.h a unique violation is not a CHECK": "null",
    // c13 · the claim
    "c13.a claimBatch takes exactly the two fresh rows": "hbi_c13a,hbi_c13b",
    "c13.b a claimed row carries the worker and one attempt": "CLAIMED:w_c13:1",
    "c13.c no free slot claims nothing": "0",
    // c14 · transient requeue and deferral
    "c14.a a transient requeue gives the attempt back": "0:1:0:1:PENDING:null",
    "c14.b no time left before staleAt: the requeue refuses": "claimed:null",
    "c14.c another worker cannot requeue a claim": "null",
    "c14.d a rate-cap deferral keeps the attempt": "PENDING:0:0",
    // c15 · markPlaced, clamp, cancel
    "c15.a markPlaced on a CANCELLED row": "false",
    "c15.b the clamp never grows a stake": "null",
    "c15.c the clamp shrinks and records the fired stake": "3000:3000",
    "c15.d markPlaced on the claimed row": "true:PLACED:pos_c15b:true",
    "c15.e markPlaced again is superseded": "false",
    "c15.f one position backs one intent": "unique:HouseBotIntent_positionId_key",
    "c15.g cancelLive takes exactly one scope": "error:house-bot-dal: cancelLive takes exactly one scope",
    "c15.h cancelLive by bot cancels only its live rows": "hbi_c15d:CANCELLED:BOT_REMOVED",
    // c16 · consent void and re-verification
    "c16.a void consent": "HOLDER_WITHDREW",
    "c16.b a second void since the last verification is a no-op": "null",
    "c16.c a password change is recorded on a paused bot": "UNKNOWN",
    "c16.d re-verify clears the credential change": "fp_c16b:null:null",
    "c16.e after re-verify consent can be voided again": "COOLING_OFF",
    "c16.f an ACTIVE bot cannot be re-verified": "null",
    // c17 · compare-and-set, updatedAt
    "c17.a saveRules on a stale version": "false:1",
    "c17.b saveRules on the current version": "true:2:5",
    "c17.c saveRules refuses a column outside the rules form": "error:house-bot-dal: 'label' is not a writable column",
    "c17.d saveLimits on a stale version": "false:true",
    "c17.e saveLimits on the current version": "true:1:10",
    "c17.f every raw UPDATE stamps updatedAt": "ACTIVE:true",
    "c17.g a status move from the wrong status is a no-op": "null",
    // c18 · once-only claims and their purge
    "c18.a claim once": "true",
    "c18.b claim twice": "false",
    "c18.c a day-suffixed claim is one row per EAT day": "true:false:true:true",
    "c18.d purge in batches": "2,2,1,0",
    "c18.e the purge keeps fresh claims": "false",
    "c18.f a previous-month claim is one row per judged month": "true:false:true:true:true",
    // c19 · erasure
    "c19.a erasure refuses while a bot is live": "false:house_bot_live:hb_c19",
    "c19.b after removal every label and officer reason is rewritten": "true:1:1:1",
    "c19.c the stored bot reads erased": "Erased HB_C19|erased hb_c19|[erased]|MANUAL",
    "c19.d a second erasure rewrites nothing new": "true:1:0:0",
    // c20 · the house book cohort
    "c20.a a stake placed at 20:59:59.999Z belongs to that EAT day": `1|${BOOK_DAY_14}`,
    "c20.b a stake placed at 21:00:00.000Z belongs to the next EAT day": `1|${BOOK_DAY_15}`,
    "c20.c open exposure counts only the open marked stake": "2000",
    "c20.d a malformed day key throws": "error:house book: '2026-9-14' is not an EAT day key (YYYY-MM-DD)",
    // c21 · markers are create-only
    "c21.a a patch cannot un-mark a ledger row": "hb_1:x",
    "c21.b a full-row position write cannot un-mark a stake": "hb_1:CASHED_OUT",
    "c21.c a full-row position write cannot mark an unmarked stake": "null:OPEN",
    // c22 · the reopen stamp
    "c22.a both reopen fields survive a full-row write": "2026-09-14T10:00:00.000Z:1",
    "c22.b a market never reopened reads null": "null:null",
  };
  // c10 bounds · each numeric CHECK at min − 1, min, max and max + 1, through the rules and limits forms.
  for (const [f] of BOT_CAP_BOUNDS) {
    e[`c10.bot.${f}.below`] = `check:HouseBot_${f}_check`;
    e[`c10.bot.${f}.min`] = "ok";
    e[`c10.bot.${f}.max`] = "ok";
    e[`c10.bot.${f}.above`] = `check:HouseBot_${f}_check`;
  }
  for (const [f] of LIMIT_BOUNDS) {
    e[`c10.limit.${f}.below`] = `check:HouseBotControl_${f}_check`;
    e[`c10.limit.${f}.min`] = "ok";
    e[`c10.limit.${f}.max`] = "ok";
    e[`c10.limit.${f}.above`] = `check:HouseBotControl_${f}_check`;
  }
  return e;
}

/**
 * Every disagreement between an expected and an actual outcome map: wrong values, missing cases and
 * cases nobody expected. Pure, so the parent can prove on planted maps that it CAN report each kind.
 */
export function diffOutcomes(expected: Readonly<Record<string, string>>, actual: Readonly<Record<string, string>>): string[] {
  const out: string[] = [];
  for (const [k, want] of Object.entries(expected)) {
    if (!(k in actual)) out.push(`${k}: missing (expected ${want})`);
    else if (actual[k] !== want) out.push(`${k}: expected ${want}, got ${actual[k]}`);
  }
  for (const k of Object.keys(actual)) if (!(k in expected)) out.push(`${k}: not expected (got ${actual[k]})`);
  return out;
}

/** A run's case lines as a map; a key recorded twice is itself a defect and is reported. */
export function outcomesOf(run: CaseRun): { map: Record<string, string>; duplicates: string[] } {
  const map: Record<string, string> = {};
  const duplicates: string[] = [];
  for (const l of run.lines) {
    if (l.case in map) duplicates.push(l.case);
    map[l.case] = l.outcome;
  }
  return { map, duplicates };
}

// ─── the runner (only the child runs it; the parent imports the data above) ──────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const msOf = (iso: string | null | undefined): number => (iso == null ? NaN : Date.parse(iso));
const fromNow = (ms: number): string => new Date(Date.now() + ms).toISOString();

/** An outcome as one string: undefined is "ok", objects are JSON. */
function show(v: unknown): string {
  if (v === undefined) return "ok";
  if (v === null) return "null";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v);
}

async function runCases(): Promise<void> {
  const outFile = process.env.HB_DAL_CASES_OUT;
  if (!outFile) {
    console.error("!! house-bot-dal-cases: HB_DAL_CASES_OUT is not set — run it through test:house-bot-migrations.");
    process.exit(2);
  }
  const only = (process.env.HB_DAL_CASES_ONLY ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  // Imported here, after the parent has set DATABASE_URL and USE_PRISMA_DAL: the stores choose
  // their backend at import time.
  const dal: Any = await import("../../src/lib/server/house-bot-dal.ts");
  const { db }: Any = await import("../../src/lib/server/store.ts");
  const { marketStore, positionStore }: Any = await import("../../src/lib/server/market-dal.ts");
  const book: Any = await import("../../src/lib/server/house-bot/book.ts");
  const { labelKey }: Any = await import("../../src/lib/house-bot/rules.ts");
  const { manualAnchorKey }: Any = await import("../../src/lib/house-bot/constants.ts");
  const { eatPreviousMonthKey }: Any = await import("../../src/lib/house-bot/clock.ts");
  const { prisma }: Any = await import("../../src/lib/server/prisma.ts");
  const onPostgres = !!process.env.DATABASE_URL && process.env.USE_PRISMA_DAL !== "false";

  const bots = dal.houseBotStore, control = dal.houseBotControlStore, events = dal.houseBotEventStore;
  const intents = dal.houseBotIntentStore, targets = dal.targetStore, presses = dal.pressStore;
  const alertOnce = dal.houseBotAlertOnceStore;

  const lines: CaseLine[] = [];
  const pgOnly: CaseLine[] = [];

  /** A thrown error as an outcome: the house violation it names, or its first line. */
  const outcomeOf = (e: unknown): string => {
    const u = dal.uniqueViolation(e);
    if (u) return `unique:${u}`;
    const c = dal.checkViolation(e);
    if (c) return `check:${c}`;
    return `error:${e instanceof Error ? e.message.split("\n")[0] : String(e)}`;
  };
  const rec = async (key: string, fn: () => Promise<unknown>): Promise<void> => {
    try {
      lines.push({ case: key, outcome: show(await fn()) });
    } catch (e) {
      lines.push({ case: key, outcome: outcomeOf(e) });
    }
  };
  /** A group of cases. A fixture that throws outside `rec` is recorded as `<id>.crashed`, which no
   *  expected entry names, so the parent fails on it instead of silently losing the rest. */
  const group = async (id: string, fn: () => Promise<void>): Promise<void> => {
    if (only.length && !only.includes(id)) return;
    try {
      await fn();
    } catch (e) {
      lines.push({ case: `${id}.crashed`, outcome: outcomeOf(e) });
    }
  };

  // ── fixtures ──────────────────────────────────────────────────────────────────────────────
  let phoneSeq = 0;
  const mkUser = async (id: string): Promise<void> => {
    const now = new Date().toISOString();
    await db.user.create({
      id, phoneE164: `+2557009${String(++phoneSeq).padStart(5, "0")}`, email: null, passwordHash: null, passwordSalt: null,
      failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
      displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
      marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null, recruitedBy: null,
      createdAt: now, updatedAt: now, lastLoginAt: null, closedAt: null,
    } as never);
  };
  const mkWallet = async (userId: string): Promise<void> => {
    const now = new Date().toISOString();
    await db.wallet.create({
      id: `wal_${userId}`, userId, balance: 0, pending: 0, hold: 0, bonusBalance: 0,
      currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now,
    } as never);
  };
  const CAPS_NULL = Object.fromEntries(BOT_CAP_BOUNDS.map(([f]) => [f, null]));
  const designate = (id: string, userId: string, label: string): Promise<Any> => {
    const now = new Date().toISOString();
    return bots.designate({
      bot: {
        id, userId, label, labelKey: labelKey(label), note: null, passwordFingerprint: "fp_case",
        verifiedAt: now, verifiedById: OFFICER, designatedAt: now, designatedById: OFFICER,
        rules: { schemaVersion: 1 }, ...CAPS_NULL,
      },
      event: { actorId: OFFICER, reason: null, payload: null },
    });
  };
  const removeBot = (id: string): Promise<Any> => bots.setStatus(id, {
    from: ["ACTIVE", "PAUSED", "AUTO_PAUSED"], to: "REMOVED", pauseReason: null, pausedFromStatus: null,
    removal: { byId: OFFICER, reason: null, cause: "MANUAL" },
  });
  /** A valid intent: due in an hour, stale in two, so no other case's claim can take it. */
  const intent = (o: Record<string, unknown>): Any => ({
    houseBotId: "hb_intent_owner", botUserId: "usr_intent_owner", productLine: "MARKET",
    triggerPositionId: null, triggerUserId: null, targetId: null, requestedById: null, entryCondition: null,
    side: "YES", stakeTzs: 1000, dueAt: fromNow(3_600_000), deadlineAt: fromNow(7_200_000), staleAt: fromNow(7_200_000),
    status: "PENDING", reasonCode: null, why: null, decision: {}, attempts: 0, transientAttempts: 0,
    nextAttemptAt: null, claimedBy: null, claimedUntil: null, positionId: null, finishedAt: null, alertedAt: null,
    ...o,
  });
  const counter = (id: string, pos: string, o: Record<string, unknown> = {}) =>
    intent({ id, kind: "COUNTER", anchorKey: pos, triggerPositionId: pos, marketId: `mkt_${id}`, ...o });
  const fill = (id: string, marketId: string, o: Record<string, unknown> = {}) =>
    intent({ id, kind: "FILL", anchorKey: marketId, marketId, ...o });
  const manual = (id: string, marketId: string, submitId: string, o: Record<string, unknown> = {}) =>
    intent({ id, kind: "MANUAL", anchorKey: manualAnchorKey(OFFICER, submitId), marketId, requestedById: OFFICER, entryCondition: "THIN", ...o });
  const claimAndSkip = async (id: string, me: string): Promise<string> => {
    const c = await intents.claimById(id, me);
    const f = await intents.finish(id, me, { status: "SKIPPED", reasonCode: "CASE" });
    return `${c?.status ?? null}:${f}`;
  };
  const target = (id: string, marketId: string, o: Record<string, unknown> = {}): Any => ({
    id, houseBotId: "hb_c08", marketId, delayMinSec: 10, delayMaxSec: 20, timingFrom: "STAKE", reactTo: "FIRST",
    createdById: OFFICER, snapshot: { titleEn: "Case", category: "sports", cutoff: "2026-12-31T00:00:00.000Z", rawYes: 0, rawNo: 0 },
    ...o,
  });
  const press = (id: string, submitId: string, o: Record<string, unknown> = {}): Any => ({
    id, actorId: OFFICER, submitId, purpose: "ENTER_NOW", houseBotId: "hb_c09", marketId: "mkt_c09",
    targetId: null, intentId: null, reason: null, ...o,
  });
  const showPress = (r: Any): string => (r.ok ? `ok:${r.row.state}:${r.row.code}` : `existing:${r.existing.id}:${r.existing.state}`);
  const market = (id: string, o: Record<string, unknown> = {}): Any => {
    const now = new Date().toISOString();
    return {
      id, titleEn: "Case market", titleSw: "Soko la jaribio", titleZh: null, category: "sports", sourceUrl: "https://example.com",
      resolutionCriterion: "Case", resolutionCriterionSw: null, resolutionCriterionZh: null,
      resolutionAt: "2026-12-31T00:00:00.000Z", selectionClosedAt: null, status: "LIVE", yesPool: 0, noPool: 0,
      predictorCount: 0, feeSnapshot: null, resolvedOutcome: null, resolutionStage1By: null, resolutionStage1At: null,
      resolutionStage2By: null, resolutionStage2At: null, objectionsClosedAt: null, settledAt: null,
      reopenedAt: null, reopenCount: null, productLine: "MARKET", proposedBy: OFFICER, createdAt: now, updatedAt: now,
      ...o,
    };
  };
  const position = (id: string, placedAt: string, stake: number, status: string, houseBotId: string | null): Any => ({
    id, userId: "usr_c20", marketId: "mkt_c20", side: "YES", stake, bonusStakeTzs: 0, potentialPayout: stake * 2,
    status, finalPayout: status === "WIN" ? stake * 1.8 : null, placedAt,
    settledAt: status === "OPEN" ? null : "2026-09-14T22:00:00.000Z", idempotencyKey: null, houseBotId,
  });
  const txn = (id: string, positionId: string, type: string, status: string, amount: number, houseBotId: string | null, createdAt: string): Any => ({
    id, walletId: "wal_usr_c20", userId: "usr_c20", type, status, amount, fee: 0, taxWithheld: 0, balanceAfter: null,
    currency: "TZS", provider: "INTERNAL", providerRef: null, msisdn: null, description: null, positionId, amlReason: null,
    createdAt, updatedAt: createdAt, completedAt: null, idempotencyKey: null, houseBotId,
  });

  // ── c01 · one live bot per account ───────────────────────────────────────────────────────
  await group("c01", async () => {
    await mkUser("usr_c01");
    await rec("c01.a first live bot", async () => (await designate("hb_c01a", "usr_c01", "Case one A")).status);
    await rec("c01.b second live bot for the same account", async () => (await designate("hb_c01b", "usr_c01", "Case one B")).status);
    await rec("c01.c remove the first", async () => (await removeBot("hb_c01a"))?.status ?? null);
    await rec("c01.d designate again after REMOVED", async () => (await designate("hb_c01c", "usr_c01", "Case one C")).status);
  });

  // ── c02 · case-insensitive live labels (04 C2) ───────────────────────────────────────────
  await group("c02", async () => {
    for (const u of ["usr_c02a", "usr_c02b", "usr_c02c"]) await mkUser(u);
    await rec("c02.a live Bot A", async () => (await designate("hb_c02a", "usr_c02a", "Bot A")).status);
    await rec("c02.b bot a beside a live Bot A", async () => (await designate("hb_c02b", "usr_c02b", "bot a")).status);
    await rec("c02.c full-width BOT A beside a live Bot A", async () => (await designate("hb_c02c", "usr_c02c", "ＢＯＴ A")).status);
    await rec("c02.d remove Bot A", async () => (await removeBot("hb_c02a"))?.status ?? null);
    await rec("c02.e Bot A again after REMOVED", async () => (await designate("hb_c02d", "usr_c02b", "Bot A")).status);
    // ⛔ CONTROL: an index on lower(label) would let the full-width label through, so c02.c
    // proves the key column is the one doing the work.
    await rec("c02.control lower() alone would miss the full-width label", async () =>
      `${labelKey("ＢＯＴ A") === labelKey("Bot A")}:${"ＢＯＴ A".toLowerCase() === "Bot A".toLowerCase()}`);
  });

  // ── c03 · one decision per trigger, for ever ─────────────────────────────────────────────
  await group("c03", async () => {
    await rec("c03.a COUNTER on a trigger", async () => (await intents.insert(counter("hbi_c03a", "pos_c03"))).status);
    await rec("c03.b claim and skip it", () => claimAndSkip("hbi_c03a", "w_c03"));
    await rec("c03.c a second COUNTER on the trigger, even after SKIPPED", async () => (await intents.insert(counter("hbi_c03b", "pos_c03"))).status);
    await rec("c03.d the sweep insert swallows the same clash", () => intents.insertIgnoringConflict(counter("hbi_c03c", "pos_c03")));
  });

  // ── c04 · FILL/OPENER may be planned again only after CANCELLED ──────────────────────────
  await group("c04", async () => {
    await rec("c04.a FILL planned", async () => (await intents.insert(fill("hbi_c04a", "mkt_c04"))).status);
    await rec("c04.b cancel it", async () => (await intents.cancelPending("hbi_c04a", "CASE"))?.status ?? null);
    await rec("c04.c re-plan after CANCELLED", async () => (await intents.insert(fill("hbi_c04b", "mkt_c04"))).status);
    await rec("c04.d claim and skip the re-plan", () => claimAndSkip("hbi_c04b", "w_c04"));
    await rec("c04.e re-plan after SKIPPED", async () => (await intents.insert(fill("hbi_c04c", "mkt_c04"))).status);
    await rec("c04.f an OPENER on the same market is its own anchor", async () =>
      (await intents.insert(intent({ id: "hbi_c04d", kind: "OPENER", anchorKey: "mkt_c04", marketId: "mkt_c04" }))).status);
  });

  // ── c05 · a press id is used once, ever ──────────────────────────────────────────────────
  await group("c05", async () => {
    const s = submitIdFor(5);
    await rec("c05.a Enter now queued", async () => (await intents.insert(manual("hbi_c05a", "mkt_c05", s))).status);
    await rec("c05.b cancel it", async () => (await intents.cancelPending("hbi_c05a", "CASE"))?.status ?? null);
    await rec("c05.c the same press id again, even after CANCELLED", async () => (await intents.insert(manual("hbi_c05b", "mkt_c05", s))).status);
  });

  // ── c06 · one live Enter now per market ──────────────────────────────────────────────────
  // ⚠️ Runs the planner's STALE pass, which sweeps the whole table: every earlier fixture is stale
  // in two hours, so only this case's row is taken.
  await group("c06", async () => {
    await rec("c06.a Enter now with a passed staleAt", async () =>
      (await intents.insert(manual("hbi_c06a", "mkt_c06", submitIdFor(61), { staleAt: fromNow(-1_000) }))).status);
    await rec("c06.b a second live Enter now on the market", async () =>
      (await intents.insert(manual("hbi_c06b", "mkt_c06", submitIdFor(62)))).status);
    await rec("c06.c the STALE pass expires the first", async () => {
      const ids: string[] = await intents.expireStale();
      return `${ids.includes("hbi_c06a")}:${ids.length}`;
    });
    await rec("c06.d the next Enter now on the market is accepted", async () =>
      (await intents.insert(manual("hbi_c06c", "mkt_c06", submitIdFor(63)))).status);
    await rec("c06.e the expired row reads EXPIRED STALE", async () => {
      const r = await intents.get("hbi_c06a");
      return `${r?.status}:${r?.reasonCode}`;
    });
  });

  // ── c07 · one opener draw per market ─────────────────────────────────────────────────────
  await group("c07", async () => {
    const draw = (side: string) => events.drawOpenerSide({ marketId: "mkt_c07", houseBotId: null, side, actorId: null, drawnFor: "OPENER_PLAN" });
    await rec("c07.a first draw", async () => { const r = await draw("YES"); return `${r.side}:${r.drawn}`; });
    await rec("c07.b a second draw returns the first side", async () => { const r = await draw("NO"); return `${r.side}:${r.drawn}`; });
    await rec("c07.c a raw second draw event", async () => (await events.append({
      houseBotId: null, userId: null, marketId: "mkt_c07", kind: "OPENER_SIDE_DRAWN", fromStatus: null, toStatus: null,
      reason: null, actorId: null, payload: { side: "NO", drawnFor: "OPENER_PLAN" },
    })).kind);
    await rec("c07.d findOpenerDraw reads the stored side", async () => (await events.findOpenerDraw("mkt_c07"))?.payload?.side ?? null);
  });
  // ── c08 · targets (N2 §2) ────────────────────────────────────────────────────────────────
  await group("c08", async () => {
    await mkUser("usr_c08");
    await designate("hb_c08", "usr_c08", "Case eight");
    await mkUser("usr_c08z");
    await designate("hb_c08z", "usr_c08z", "Case eight Z");
    await rec("c08.a add a target", async () => {
      const t = await targets.insert(target("hbt_c08a", "mkt_c08"));
      return `${t.status}:${t.version}:${msOf(t.effectiveFrom) - msOf(t.createdAt)}:${t.updatedById === t.createdById}`;
    });
    await rec("c08.b a second ACTIVE target on the poll", async () => (await targets.insert(target("hbt_c08b", "mkt_c08"))).status);
    await rec("c08.c end the first", async () => { const t = await targets.endActive("hbt_c08a", "DONE"); return `${t?.status}:${t?.endCause}`; });
    await rec("c08.d an ENDED DONE target is not a stop", () => targets.everStopped("mkt_c08"));
    await rec("c08.e the poll can be targeted again", async () => (await targets.insert(target("hbt_c08b", "mkt_c08"))).status);
    await rec("c08.f remove it", async () => { const t = await targets.remove("hbt_c08b", OFFICER); return `${t?.status}:${t?.removedById}`; });
    await rec("c08.g a removed target is a stop", () => targets.everStopped("mkt_c08"));
    await rec("c08.h veto the ENDED DONE target", async () => {
      const v = await targets.veto("hbt_c08a");
      return v ? `${v.row.status}:${v.row.endCause}:${v.previousEndCause}` : null;
    });
    await rec("c08.i a second veto is a no-op", () => targets.veto("hbt_c08a"));
    await rec("c08.j CAS update", async () => {
      await targets.insert(target("hbt_c08c", "mkt_c08c"));
      const a = await targets.casUpdate("hbt_c08c", 1, { delayMaxSec: 30 }, "usr_hb_officer2");
      const b = await targets.casUpdate("hbt_c08c", 1, { delayMaxSec: 40 }, OFFICER);
      return `${a.ok}:${a.ok ? a.row.version : "-"}:${a.ok ? a.row.updatedById : "-"}|${b.ok}:${b.ok ? "-" : b.current?.version}`;
    });
    await rec("c08.k a timing patch may not touch other columns", () => targets.casUpdate("hbt_c08c", 2, { status: "ENDED" }, OFFICER));
    await rec("c08.l the share-locked insert on an ACTIVE target", async () => {
      await targets.insert(target("hbt_c08t", "mkt_c08t"));
      const r = await intents.insertTargetedIfActive("hbt_c08t", counter("hbi_c08t1", "pos_c08t1", { targetId: "hbt_c08t" }));
      return `${r.inserted}:${r.targetActive}`;
    });
    await rec("c08.m the same trigger again is already decided", async () => {
      const r = await intents.insertTargetedIfActive("hbt_c08t", counter("hbi_c08t2", "pos_c08t1", { targetId: "hbt_c08t" }));
      return `${r.inserted}:${r.targetActive}`;
    });
    await rec("c08.n live reactions on the target", () => intents.countLiveForTarget("hbt_c08t"));
    await rec("c08.o after removal nothing is inserted", async () => {
      await targets.remove("hbt_c08t", OFFICER);
      const r = await intents.insertTargetedIfActive("hbt_c08t", counter("hbi_c08t3", "pos_c08t3", { targetId: "hbt_c08t" }));
      return `${r.inserted}:${r.targetActive}`;
    });
    await rec("c08.p the row must name the target it is inserted under", () =>
      intents.insertTargetedIfActive("hbt_c08t", counter("hbi_c08t4", "pos_c08t4")));
    await rec("c08.q consent void ends every ACTIVE target of the bot", async () => {
      await targets.insert(target("hbt_c08d", "mkt_c08d"));
      const ended: Any[] = await targets.endAllForBot("hb_c08", "CONSENT_VOID");
      return `${ended.map((t) => t.id).join(",")}:${[...new Set(ended.map((t) => t.endCause))].join(",")}`;
    });
    await rec("c08.r active, ended and counted for the bot", async () => {
      const a = await targets.listForBot("hb_c08", "active", null);
      const e = await targets.listForBot("hb_c08", "ended", null);
      return `${a.rows.length}:${e.rows.length}:${await targets.countActive({ botId: "hb_c08" })}`;
    });
    const z = { houseBotId: "hb_c08z" };
    await rec("c08.s delay min 4", async () => (await targets.insert(target("hbt_c08s1", "mkt_c08s1", { ...z, delayMinSec: 4 }))).status);
    await rec("c08.t delay max 601", async () => (await targets.insert(target("hbt_c08s2", "mkt_c08s2", { ...z, delayMinSec: 5, delayMaxSec: 601 }))).status);
    await rec("c08.u min 30 above max 10", async () => (await targets.insert(target("hbt_c08s3", "mkt_c08s3", { ...z, delayMinSec: 30, delayMaxSec: 10 }))).status);
    await rec("c08.v min equal to max, at both bounds", async () => {
      const a = await targets.insert(target("hbt_c08s4", "mkt_c08s4", { ...z, delayMinSec: 5, delayMaxSec: 5 }));
      const b = await targets.insert(target("hbt_c08s5", "mkt_c08s5", { ...z, delayMinSec: 600, delayMaxSec: 600 }));
      return `${a.status}:${b.status}`;
    });
  });

  // ── c09 · presses (N1 §2 press flow) ─────────────────────────────────────────────────────
  await group("c09", async () => {
    await rec("c09.a a press is recorded CHECKING", async () => showPress(await presses.insertChecking(press("hbp_c09a", submitIdFor(91)))));
    await rec("c09.b the same press again reads the existing row", async () => showPress(await presses.insertChecking(press("hbp_c09b", submitIdFor(91)))));
    await rec("c09.c refuse", async () => { const p = await presses.refuse("hbp_c09a", "OWNER_POSITION"); return `${p?.state}:${p?.code}`; });
    await rec("c09.d a second refuse is a no-op", () => presses.refuse("hbp_c09a", "INFO_BLACKOUT"));
    await rec("c09.e a malformed submit id", async () => showPress(await presses.insertChecking(press("hbp_c09c", "x"))));
    await rec("c09.f an unknown purpose", async () => showPress(await presses.insertChecking(press("hbp_c09d", submitIdFor(94), { purpose: "BOGUS" }))));
    await rec("c09.g a target press can never be QUEUED", async () => {
      await presses.insertChecking(press("hbp_c09e", submitIdFor(95), { purpose: "TARGET_ADD" }));
      return presses.queue("hbp_c09e", "hbi_c09x", null);
    });
    await rec("c09.h Enter now CHECKING then QUEUED then DONE", async () => {
      await presses.insertChecking(press("hbp_c09f", submitIdFor(96)));
      const q = await presses.queue("hbp_c09f", "hbi_c09f", null);
      const d1 = await presses.doneEnterNow("hbi_c09f");
      const d2 = await presses.doneEnterNow("hbi_c09f");
      return `${q?.state}:${q?.intentId}|${d1?.state}|${d2 === null}`;
    });
    await rec("c09.i a target press goes CHECKING then DONE in its transaction", async () => {
      await presses.insertChecking(press("hbp_c09g", submitIdFor(97), { purpose: "TARGET_REMOVE" }));
      const d1 = await presses.doneInTx("hbp_c09g", null, { targetId: "hbt_c09" });
      const d2 = await presses.doneInTx("hbp_c09g", null);
      return `${d1?.state}:${d1?.targetId}|${d2 === null}`;
    });
    await rec("c09.j the audit lease is taken once, the audit id written once", async () => {
      const a = await presses.claimAuditLease("hbp_c09f");
      const b = await presses.claimAuditLease("hbp_c09f");
      const s1 = await presses.setAuditId("hbp_c09f", "aud_c09");
      const s2 = await presses.setAuditId("hbp_c09f", "aud_c09b");
      return `${a !== null}:${b !== null}:${s1}:${s2}`;
    });
    await rec("c09.k nothing fresh is interrupted or due for audit repair", async () =>
      `${(await presses.interruptStale()).length}:${(await presses.listAuditRepair(50)).length}`);
  });

  // ── c10 · CHECKs on intents, and every numeric bound through the two forms ───────────────
  await group("c10", async () => {
    const st = async (row: Any) => (await intents.insert(row)).status;
    await rec("c10.a MANUAL without requestedById", () => st(manual("hbi_c10a", "mkt_c10a", submitIdFor(101), { requestedById: null })));
    await rec("c10.b MANUAL on Up and Down", () => st(manual("hbi_c10b", "mkt_c10b", submitIdFor(102), { productLine: "UPDOWN" })));
    await rec("c10.c targetId on a FILL", () => st(fill("hbi_c10c", "mkt_c10c", { targetId: "hbt_x" })));
    await rec("c10.d requestedById on a COUNTER", () => st(counter("hbi_c10d", "pos_c10d", { requestedById: OFFICER })));
    await rec("c10.e entryCondition on a FILL", () => st(fill("hbi_c10e", "mkt_c10e", { entryCondition: "THIN" })));
    await rec("c10.f a malformed Enter now anchor", () =>
      st(intent({ id: "hbi_c10f", kind: "MANUAL", anchorKey: `manual:${OFFICER}:x`, marketId: "mkt_c10f", requestedById: OFFICER, entryCondition: "THIN" })));
    await rec("c10.g a zero stake", () => st(fill("hbi_c10g", "mkt_c10g", { stakeTzs: 0 })));
    await rec("c10.h a PLACED row without its position", () => st(fill("hbi_c10h", "mkt_c10h", { status: "PLACED" })));
    await rec("c10.i a fractional stake is refused before the database could round it", () => st(fill("hbi_c10i", "mkt_c10i", { stakeTzs: 1.5 })));

    await mkUser("usr_c10");
    await designate("hb_c10", "usr_c10", "Case ten");
    const rule = async (field: string, v: number): Promise<string> => {
      const cur = await bots.get("hb_c10");
      const r = await bots.saveRules("hb_c10", cur.rulesVersion, { [field]: v });
      return r.ok ? "ok" : "cas-miss";
    };
    for (const [f, lo, hi] of BOT_CAP_BOUNDS) {
      await rec(`c10.bot.${f}.below`, () => rule(f, lo - 1));
      await rec(`c10.bot.${f}.min`, () => rule(f, lo));
      await rec(`c10.bot.${f}.max`, () => rule(f, hi));
      await rec(`c10.bot.${f}.above`, () => rule(f, hi + 1));
    }
    const limit = async (field: string, v: number): Promise<string> => {
      const cur = await control.get();
      const r = await control.saveLimits(cur.limitsVersion, { [field]: v });
      return r.ok ? "ok" : "cas-miss";
    };
    for (const [f, lo, hi] of LIMIT_BOUNDS) {
      await rec(`c10.limit.${f}.below`, () => limit(f, lo - 1));
      await rec(`c10.limit.${f}.min`, () => limit(f, lo));
      await rec(`c10.limit.${f}.max`, () => limit(f, hi));
      await rec(`c10.limit.${f}.above`, () => limit(f, hi + 1));
    }
  });

  // ── c11 · BIGINT columns come back as numbers ────────────────────────────────────────────
  await group("c11", async () => {
    await rec("c11.a a BIGINT bot cap reads back as a number", async () => {
      const cur = await bots.get("hb_c10");
      const r = await bots.saveRules("hb_c10", cur.rulesVersion, { capOpenExposureTzs: 1_000_000_000 });
      const back = await bots.get("hb_c10");
      return `${r.ok}:${typeof back.capOpenExposureTzs}:${back.capOpenExposureTzs}`;
    });
    await rec("c11.b BIGINT limits read back as numbers", async () => {
      const cur = await control.get();
      await control.saveLimits(cur.limitsVersion, { gCapDailyStakeTzs: 1_000_000_000, gCounterPerPlayerTzsPerDay: 1_000_000_000 });
      const back = await control.get();
      return `${typeof back.gCapDailyStakeTzs}:${back.gCapDailyStakeTzs}:${typeof back.gCounterPerPlayerTzsPerDay}:${back.gCounterPerPlayerTzsPerDay}`;
    });
    await rec("c11.c an intent stake reads back as a number", async () => {
      const r = await intents.insert(fill("hbi_c11", "mkt_c11", { stakeTzs: 1_000_000_000 }));
      return `${typeof r.stakeTzs}:${r.stakeTzs}`;
    });
    // ⛔ OWNER RULING D20 (rulings 265, 273 (a)) · the staff-edge and Board-disclosure columns are un-built. The same
    // answer on both stores is the un-build's guard: a re-added column is not writable, whichever twin is asked.
    // ⛔ TWO LAYERS, BECAUSE ONE REFUSES FOR THE WRONG REASON (C5-5b review, test-strength-03). `saveLimits` refuses an
    // unknown key from the LIMIT_FIELDS whitelist, so the refusal alone would stay the same while the COLUMN came back to
    // `HOUSE_BOT_CONTROL_COLUMNS` and `StoredHouseBotControl`. The column map itself is therefore recorded too, by name.
    await rec("c11.d the struck columns are not writable on either twin (D20: staff edge, Board disclosure)", async () => {
      const cur = await control.get();
      const STRUCK = ["gStaffEdgeNetTzs", "gStaffEdgeWinRatePts", "boardDisclosureSections", "boardDisclosureSentAt"];
      const tried = await Promise.all(STRUCK.map(async (col) => {
        try {
          await control.saveLimits(cur.limitsVersion, { [col]: col.startsWith("board") ? [] : 1 } as Any);
          return `${col}:WRITTEN`;
        } catch (e) {
          return `${col}:${String((e as Error).message).includes("not a writable column") ? "refused" : "other"}`;
        }
      }));
      const cols = dal.HOUSE_BOT_CONTROL_COLUMNS as Record<string, unknown>;
      const mapped = STRUCK.filter((c) => c in cols);
      const onRow = STRUCK.filter((c) => c in cur);
      const kept = ["gCapDailyStakeTzs", "gStaffChosenMaxCounterpartyShare", "limitsVersion"].filter((c) => c in cols);
      return `${tried.join("|")}|map:${mapped.join(",")}|row:${onRow.join(",")}|kept:${kept.length}`;
    });
  });

  // ── c12 · reading a violation (pure: the same function on both stores) ──────────────────
  await group("c12", async () => {
    const planted = (message: string, metaCode = "23505"): Error =>
      Object.assign(new Error(`Raw query failed. Code: \`${metaCode}\`. Message: \`${message}\``), { code: "P2010", meta: { code: metaCode, message } });
    const dup = (name: string) => `duplicate key value violates unique constraint "${name}"`;
    await rec("c12.a an unknown unique violation names nothing", async () => dal.uniqueViolation(planted(dup("not_house_uq"))));
    await rec("c12.b a raw-SQL violation names its index", async () => dal.uniqueViolation(planted(dup("hbt_active_market_uq"))));
    await rec("c12.c P2002 with the index in meta.target", async () => dal.uniqueViolation({ code: "P2002", meta: { target: "hbp_actor_submit_uq" } }));
    await rec("c12.d P2002 with a field list names nothing", async () => dal.uniqueViolation({ code: "P2002", meta: { target: ["marketId"] } }));
    await rec("c12.e a message naming two house indexes names nothing", async () =>
      dal.uniqueViolation(planted(`${dup("hbi_counter_anchor_uq")} ${dup("hbi_manual_anchor_uq")}`)));
    await rec("c12.f a name inside a longer identifier is not that name", async () => dal.uniqueViolation(planted(dup("hbt_active_market_uq_old"))));
    await rec("c12.g a CHECK violation names its constraint", async () =>
      dal.checkViolation(planted('new row for relation "HouseBot" violates check constraint "HouseBot_label_check"', "23514")));
    await rec("c12.h a unique violation is not a CHECK", async () => dal.checkViolation(planted(dup("hbt_active_market_uq"))));
  });

  // ── c13 · the claim (N1 §4.3) — also run alone under an EAT session time zone ───────────
  await group("c13", async () => {
    const due = fromNow(-60_000);
    await intents.insert(fill("hbi_c13a", "mkt_c13a", { dueAt: due }));
    await intents.insert(fill("hbi_c13b", "mkt_c13b", { dueAt: due }));
    await intents.insert(fill("hbi_c13c", "mkt_c13c", { dueAt: due, staleAt: fromNow(-1_000) }));
    await intents.insert(fill("hbi_c13d", "mkt_c13d", { dueAt: due, attempts: 3 }));
    await rec("c13.a claimBatch takes exactly the two fresh rows", async () => {
      const rows: Any[] = await intents.claimBatch({ me: "w_c13", freeSlots: 5, skewGuardMs: 2_000 });
      return rows.map((r) => r.id).sort().join(",");
    });
    await rec("c13.b a claimed row carries the worker and one attempt", async () => {
      const r = await intents.get("hbi_c13a");
      return `${r?.status}:${r?.claimedBy}:${r?.attempts}`;
    });
    await rec("c13.c no free slot claims nothing", async () => (await intents.claimBatch({ me: "w_c13b", freeSlots: 0, skewGuardMs: 2_000 })).length);
  });

  // ── c14 · transient requeue and rate-cap deferral ────────────────────────────────────────
  await group("c14", async () => {
    await rec("c14.a a transient requeue gives the attempt back", async () => {
      await intents.insert(fill("hbi_c14a", "mkt_c14a"));
      const before = (await intents.get("hbi_c14a"))?.attempts;
      const c = await intents.claimById("hbi_c14a", "w_c14");
      const r = await intents.requeueTransient("hbi_c14a", "w_c14", 1_000);
      return `${before}:${c?.attempts}:${r?.attempts}:${r?.transientAttempts}:${r?.status}:${r?.claimedBy}`;
    });
    await rec("c14.b no time left before staleAt: the requeue refuses", async () => {
      // staleAt 0.9 s away: the claim still fits, a requeue can never land 1 s before it.
      await intents.insert(fill("hbi_c14b", "mkt_c14b", { staleAt: fromNow(900) }));
      const c = await intents.claimById("hbi_c14b", "w_c14");
      const r = await intents.requeueTransient("hbi_c14b", "w_c14", 1_000);
      return `${c ? "claimed" : "not-claimed"}:${r === null ? "null" : r.status}`;
    });
    await rec("c14.c another worker cannot requeue a claim", async () => {
      await intents.insert(fill("hbi_c14c", "mkt_c14c"));
      await intents.claimById("hbi_c14c", "w_c14");
      return intents.requeueTransient("hbi_c14c", "w_other", 1_000);
    });
    await rec("c14.d a rate-cap deferral keeps the attempt", async () => {
      await intents.insert(fill("hbi_c14d", "mkt_c14d"));
      await intents.claimById("hbi_c14d", "w_c14");
      const r = await intents.defer("hbi_c14d", "w_c14", fromNow(60_000));
      return `${r?.status}:${r?.attempts}:${r?.transientAttempts}`;
    });
  });

  // ── c15 · markPlaced, the clamp, cancelLive ──────────────────────────────────────────────
  await group("c15", async () => {
    await rec("c15.a markPlaced on a CANCELLED row", async () => {
      await intents.insert(fill("hbi_c15a", "mkt_c15a"));
      await intents.cancelPending("hbi_c15a", "CASE");
      return intents.markPlaced("hbi_c15a", "pos_c15a", null);
    });
    await rec("c15.b the clamp never grows a stake", async () => {
      await intents.insert(fill("hbi_c15b", "mkt_c15b", { stakeTzs: 5_000 }));
      await intents.claimById("hbi_c15b", "w_c15");
      return intents.clampStake("hbi_c15b", "w_c15", 6_000);
    });
    await rec("c15.c the clamp shrinks and records the fired stake", async () => {
      const r = await intents.clampStake("hbi_c15b", "w_c15", 3_000);
      return r ? `${r.stakeTzs}:${r.decision?.firedStakeTzs}` : null;
    });
    await rec("c15.d markPlaced on the claimed row", async () => {
      const okPlaced = await intents.markPlaced("hbi_c15b", "pos_c15b", null);
      const r = await intents.get("hbi_c15b");
      return `${okPlaced}:${r?.status}:${r?.positionId}:${r?.finishedAt != null}`;
    });
    await rec("c15.e markPlaced again is superseded", () => intents.markPlaced("hbi_c15b", "pos_c15b2", null));
    await rec("c15.f one position backs one intent", async () => {
      await intents.insert(fill("hbi_c15c", "mkt_c15c"));
      await intents.claimById("hbi_c15c", "w_c15");
      return intents.markPlaced("hbi_c15c", "pos_c15b", null);
    });
    await rec("c15.g cancelLive takes exactly one scope", () => intents.cancelLive({ houseBotId: "hb_c15", targetId: "hbt_c15" }, "CASE"));
    await rec("c15.h cancelLive by bot cancels only its live rows", async () => {
      await intents.insert(fill("hbi_c15d", "mkt_c15d", { houseBotId: "hb_c15" }));
      await intents.insert(fill("hbi_c15e", "mkt_c15e", { houseBotId: "hb_c15" }));
      await intents.cancelPending("hbi_c15e", "CASE");
      const rows: Any[] = await intents.cancelLive({ houseBotId: "hb_c15" }, "BOT_REMOVED");
      return rows.map((r) => `${r.id}:${r.status}:${r.reasonCode}`).join(",");
    });
  });

  // ── c16 · consent void and re-verification (04 A3, C8) ───────────────────────────────────
  await group("c16", async () => {
    await mkUser("usr_c16");
    await designate("hb_c16", "usr_c16", "Case sixteen");
    await rec("c16.a void consent", async () => (await bots.setConsentVoid("hb_c16", "HOLDER_WITHDREW"))?.consentVoidCause ?? null);
    await rec("c16.b a second void since the last verification is a no-op", () => bots.setConsentVoid("hb_c16", "COOLING_OFF"));
    await rec("c16.c a password change is recorded on a paused bot", async () =>
      (await bots.setCredentialChanged("hb_c16", { via: "UNKNOWN" }))?.credentialChangedVia ?? null);
    // Millisecond clocks: without a gap, verifiedAt could EQUAL consentVoidAt and the void would
    // (correctly) still count.
    await sleep(25);
    await rec("c16.d re-verify clears the credential change", async () => {
      const r = await bots.setVerified("hb_c16", { fingerprint: "fp_c16b", verifiedById: OFFICER, verifiedAt: new Date().toISOString() });
      return r ? `${r.passwordFingerprint}:${r.credentialChangedAt}:${r.credentialChangedVia}` : null;
    });
    await sleep(25);
    await rec("c16.e after re-verify consent can be voided again", async () => (await bots.setConsentVoid("hb_c16", "COOLING_OFF"))?.consentVoidCause ?? null);
    await rec("c16.f an ACTIVE bot cannot be re-verified", async () => {
      await mkUser("usr_c16b");
      await designate("hb_c16b", "usr_c16b", "Case sixteen B");
      await bots.setStatus("hb_c16b", { from: ["PAUSED"], to: "ACTIVE", pauseReason: null, pausedFromStatus: null });
      return bots.setVerified("hb_c16b", { fingerprint: "fp_other", verifiedById: OFFICER, verifiedAt: new Date().toISOString() });
    });
  });

  // ── c17 · compare-and-set, and updatedAt on raw updates ──────────────────────────────────
  await group("c17", async () => {
    await rec("c17.a saveRules on a stale version", async () => {
      const r = await bots.saveRules("hb_c16", 99, { freqMaxPerHour: 5 });
      return `${r.ok}:${r.ok ? r.row.rulesVersion : r.current?.rulesVersion}`;
    });
    await rec("c17.b saveRules on the current version", async () => {
      const r = await bots.saveRules("hb_c16", 1, { freqMaxPerHour: 5 });
      return r.ok ? `true:${r.row.rulesVersion}:${r.row.freqMaxPerHour}` : `false:${r.current?.rulesVersion}`;
    });
    await rec("c17.c saveRules refuses a column outside the rules form", () => bots.saveRules("hb_c16", 2, { label: "Renamed" }));
    await rec("c17.d saveLimits on a stale version", async () => {
      const v = (await control.get()).limitsVersion;
      const r = await control.saveLimits(v + 99, { bellAlertsPerHour: 10 });
      return `${r.ok}:${r.ok ? "-" : r.current?.limitsVersion === v}`;
    });
    await rec("c17.e saveLimits on the current version", async () => {
      const v = (await control.get()).limitsVersion;
      const r = await control.saveLimits(v, { bellAlertsPerHour: 10 });
      return r.ok ? `true:${r.row.limitsVersion - v}:${r.row.bellAlertsPerHour}` : "false";
    });
    await rec("c17.f every raw UPDATE stamps updatedAt", async () => {
      await mkUser("usr_c17");
      const b = await designate("hb_c17", "usr_c17", "Case seventeen");
      await sleep(25);
      const s = await bots.setStatus("hb_c17", { from: ["PAUSED"], to: "ACTIVE", pauseReason: null, pausedFromStatus: null });
      return s ? `${s.status}:${msOf(s.updatedAt) > msOf(b.createdAt)}` : null;
    });
    await rec("c17.g a status move from the wrong status is a no-op", () =>
      bots.setStatus("hb_c17", { from: ["PAUSED"], to: "AUTO_PAUSED", pauseReason: "MANUAL", pausedFromStatus: "ACTIVE" }));
  });

  // ── c18 · once-only claims and the 30-day purge (04 A20, A24) ────────────────────────────
  await group("c18", async () => {
    await rec("c18.a claim once", () => alertOnce.claim("case:c18"));
    await rec("c18.b claim twice", () => alertOnce.claim("case:c18"));
    await rec("c18.c a day-suffixed claim is one row per EAT day", async () => {
      const a = await alertOnce.claimWithEatSuffix("case:c18:day", "day");
      const b = await alertOnce.claimWithEatSuffix("case:c18:day", "day");
      return `${a.claimed}:${b.claimed}:${a.key === b.key}:${/^case:c18:day:\d{4}-\d{2}-\d{2}$/.test(a.key)}`;
    });
    await rec("c18.d purge in batches", async () => {
      // ⚠️ PLANTED PER STORE: the DAL has no way to write a backdated claim, and must not grow one.
      const keys = [1, 2, 3, 4, 5].map((n) => `case:c18:old${n}`);
      if (onPostgres) {
        for (const k of keys) {
          await prisma().$executeRawUnsafe(`INSERT INTO "HouseBotAlertOnce" ("key", "createdAt") VALUES ($1::text, now() - interval '31 days')`, k);
        }
      } else {
        const map = (globalThis as Any).__50PICK_HB_ALERT_ONCE as Map<string, { key: string; createdAt: string }>;
        for (const k of keys) map.set(k, { key: k, createdAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString() });
      }
      const n: number[] = [];
      for (let i = 0; i < 4; i++) n.push(await alertOnce.purgeBatch(30, 2));
      return n.join(",");
    });
    await rec("c18.e the purge keeps fresh claims", () => alertOnce.claim("case:c18"));
    await rec("c18.f a previous-month claim is one row per judged month", async () => {
      const a = await alertOnce.claimWithEatSuffix("case:c18:prev", "previousMonth");
      const b = await alertOnce.claimWithEatSuffix("case:c18:prev", "previousMonth");
      // ⭐ The last field ties the store's key to the JS twin: on Postgres it proves the SQL fragment
      // computes the month just ended, not merely a YYYY-MM.
      const judged = `case:c18:prev:${eatPreviousMonthKey(Date.now())}`;
      return `${a.claimed}:${b.claimed}:${a.key === b.key}:${/^case:c18:prev:\d{4}-\d{2}$/.test(a.key)}:${a.key === judged}`;
    });
  });

  // ── c19 · erasure (04 A5, R6) ────────────────────────────────────────────────────────────
  await group("c19", async () => {
    await mkUser("usr_c19");
    await designate("hb_c19", "usr_c19", "Case nineteen");
    const showErase = (r: Any) => (r.ok ? `true:${r.bots}:${r.events}:${r.presses}` : `false:${r.code}:${r.botId}`);
    await rec("c19.a erasure refuses while a bot is live", async () => showErase(await bots.pseudonymiseForUser("usr_c19")));
    await rec("c19.b after removal every label and officer reason is rewritten", async () => {
      await bots.setStatus("hb_c19", {
        from: ["ACTIVE", "PAUSED", "AUTO_PAUSED"], to: "REMOVED", pauseReason: null, pausedFromStatus: null,
        removal: { byId: OFFICER, reason: "Removed at the holder's request", cause: "MANUAL" },
      });
      await events.append({
        houseBotId: "hb_c19", userId: "usr_c19", marketId: null, kind: "RULES_SAVED", fromStatus: null, toStatus: null,
        reason: "typed by an officer", actorId: OFFICER, payload: null,
      });
      await presses.insertChecking(press("hbp_c19", submitIdFor(191), { purpose: "TARGET_REMOVE", houseBotId: "hb_c19", marketId: null, reason: "officer note" }));
      return showErase(await bots.pseudonymiseForUser("usr_c19"));
    });
    await rec("c19.c the stored bot reads erased", async () => {
      const b = await bots.get("hb_c19");
      return b ? `${b.label}|${b.labelKey}|${b.removedReason}|${b.removedCause}` : null;
    });
    await rec("c19.d a second erasure rewrites nothing new", async () => showErase(await bots.pseudonymiseForUser("usr_c19")));
  });

  // ── c20 · the house book: the EAT day a stake was PLACED owns it (R3) ────────────────────
  await group("c20", async () => {
    await mkUser("usr_c20");
    await mkWallet("usr_c20");
    await marketStore.set(market("mkt_c20"));
    await positionStore.set(position("pos_c20a", "2026-09-14T20:59:59.999Z", 1000, "WIN", "hb_c20"));
    await positionStore.set(position("pos_c20b", "2026-09-14T21:00:00.000Z", 2000, "OPEN", "hb_c20"));
    await positionStore.set(position("pos_c20c", "2026-09-14T20:00:00.000Z", 5000, "LOSS", null));
    const later = "2026-09-14T22:00:00.000Z";
    await db.txn.create(txn("txn_c20a", "pos_c20a", "BET_PAYOUT", "CONFIRMED", 1800, "hb_c20", later));
    // Excluded, each for its own reason: unmarked · not CONFIRMED · marked but on an unmarked stake.
    await db.txn.create(txn("txn_c20b", "pos_c20a", "BET_PAYOUT", "CONFIRMED", 700, null, later));
    await db.txn.create(txn("txn_c20c", "pos_c20a", "BET_PAYOUT", "PENDING", 999, "hb_c20", later));
    await db.txn.create(txn("txn_c20d", "pos_c20c", "BET_PAYOUT", "CONFIRMED", 4000, "hb_c20", later));
    const dayBook = async (dayKey: string) => {
      const m: Map<string, unknown> = await book.houseDayBooks(dayKey);
      return `${m.size}|${JSON.stringify(m.get("hb_c20") ?? null)}`;
    };
    await rec("c20.a a stake placed at 20:59:59.999Z belongs to that EAT day", () => dayBook("2026-09-14"));
    await rec("c20.b a stake placed at 21:00:00.000Z belongs to the next EAT day", () => dayBook("2026-09-15"));
    await rec("c20.c open exposure counts only the open marked stake", () => book.houseOpenExposure("hb_c20"));
    await rec("c20.d a malformed day key throws", () => book.houseDayBook("2026-9-14", null));
  });

  // ── c21 · the markers are create-only (PLAN §2 I8) ───────────────────────────────────────
  await group("c21", async () => {
    await rec("c21.a a patch cannot un-mark a ledger row", async () => {
      await db.txn.create(txn("txn_c21", "pos_c21", "BET_PLACED", "CONFIRMED", 1000, "hb_1", "2026-01-05T10:00:00.000Z"));
      await db.txn.update("txn_c21", { houseBotId: null, description: "x" });
      const t = await db.txn.findById("txn_c21");
      return `${t?.houseBotId}:${t?.description}`;
    });
    await rec("c21.b a full-row position write cannot un-mark a stake", async () => {
      const p = position("pos_c21", "2026-01-05T10:00:00.000Z", 1000, "OPEN", "hb_1");
      await positionStore.set(p);
      await positionStore.set({ ...p, houseBotId: null, status: "CASHED_OUT" });
      const back = await positionStore.get("pos_c21");
      return `${back?.houseBotId}:${back?.status}`;
    });
    await rec("c21.c a full-row position write cannot mark an unmarked stake", async () => {
      const p = position("pos_c21c", "2026-01-05T10:00:00.000Z", 1000, "OPEN", null);
      await positionStore.set(p);
      await positionStore.set({ ...p, houseBotId: "hb_1" });
      const back = await positionStore.get("pos_c21c");
      return `${back?.houseBotId}:${back?.status}`;
    });
  });

  // ── c22 · the reopen stamp survives a full-row write (N1 §2) ─────────────────────────────
  await group("c22", async () => {
    await rec("c22.a both reopen fields survive a full-row write", async () => {
      const m = market("mkt_c22", { reopenedAt: "2026-09-14T10:00:00.000Z", reopenCount: 1 });
      await marketStore.set(m);
      await marketStore.set(m);
      const back = await marketStore.get("mkt_c22");
      return `${back?.reopenedAt}:${back?.reopenCount}`;
    });
    await rec("c22.b a market never reopened reads null", async () => {
      const back = await marketStore.get("mkt_c20");
      return `${back?.reopenedAt ?? null}:${back?.reopenCount ?? null}`;
    });
  });

  // ── Postgres-only facts, outside the parity comparison ───────────────────────────────────
  if (onPostgres) {
    try {
      const rows: Any[] = await prisma().$queryRawUnsafe(`SELECT current_setting('TimeZone') AS "tz"`);
      pgOnly.push({ case: "session.timezone", outcome: String(rows[0]?.tz) });
    } catch (e) {
      pgOnly.push({ case: "session.timezone", outcome: outcomeOf(e) });
    }
  }

  const run: CaseRun = { store: onPostgres ? "postgres" : "memory", lines, pgOnly };
  writeFileSync(outFile, JSON.stringify(run, null, 1), "utf8");
  console.log(`house-bot-dal-cases: ${lines.length} outcome(s) on ${run.store} → ${outFile}`);
  if (onPostgres) await prisma()?.$disconnect().catch(() => {});
  process.exit(0);
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// Last line on purpose: everything the runner closes over is declared above it.
if (process.env.HB_DAL_CASES_RUN === "1") await runCases();
