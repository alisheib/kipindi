/**
 * HOUSE BOTS DAL — the eight house tables, their in-memory twins, and the house book's store.
 *
 * Mirrors `updown-dal.ts`: the domain types live HERE, one interface per entity, a Prisma
 * implementation and an in-memory implementation selected by whether a DATABASE_URL is
 * configured. Tests drive the in-memory pair; production always uses Prisma.
 *
 * ⚠️ NOTHING HERE MOVES MONEY. A house stake is placed by the money seam (commit 2) through the
 * same bet path players use; these tables carry the decision, the switch, the counters and the
 * records around it. There is no wallet member in this file and no writer of a wallet's status
 * or freeze reasons. If you find yourself adding a balance here, stop — it belongs in the seam.
 *
 * ⛔ WHY EVERY STATEMENT IS RAW SQL (N1 §2, MON-12). The exactly-once guarantees are PARTIAL unique
 * indexes, which the Prisma DSL cannot declare, and Prisma reports a raw partial-index violation
 * with an unreliable `meta.target`. Issued as raw SQL, Postgres names the constraint in the error
 * message, so `uniqueViolation()` can say WHICH guarantee fired. An unknown violation is rethrown,
 * never swallowed.
 *
 * ⛔ WHY THE MEMORY MAPS LIVE IN THIS FILE and not under `server/house-bot/`: that folder may hold
 * no module-scope Map (the engine's per-process state rule, 04 F7).
 *
 * ⭐ THE TWIN IS THE SAME CONTRACT, NOT A FRIENDLIER ONE. Every partial unique index and every
 * named CHECK in the two house migrations has a memory mirror (`MEM_UNIQUES`, `MEM_CHECKS`) with
 * the same name and predicate, raising the same error shape Prisma raises for raw SQL. A fake that
 * accepts rows Postgres refuses makes a green suite mean nothing about production.
 * `test:house-bot-migrations` runs one case list against both and requires identical outcomes.
 *
 * Three database facts this file leans on:
 *   · `$queryRaw` binds JS numbers as bigint, so every parameter carries an explicit cast.
 *   · BIGINT columns come back as JS bigint; `big()` converts (every value is ≤ 1e9, so exact).
 *   · `@updatedAt` fires only through the Prisma client; `updateSql()` appends
 *     `"updatedAt" = now()` for every table that has the column, so no raw UPDATE forgets it.
 */
import { prisma, hasDatabase } from "./prisma";
import type { Prisma, PrismaClient } from "@prisma/client";
import { randomId } from "./crypto";
import { marketStore, positionStore } from "./market-dal";
import { assetStore, chainStore, roundStore } from "./updown-dal";
import { snapshotOrLegacy } from "./market-config";
import { db } from "./store";
import {
  HOUSE_ID_PREFIX, houseIntentKey, SUBMIT_ID_RE, RUNTIME_KEY, HOUSE_CONTROL_ID, TARGET_ARMING_SEC,
  PRESS_AUDIT_LEASE_MS, PRESS_AUDIT_REPAIR_AFTER_MS, PRESS_INTERRUPTED_AFTER_MS, PRESS_REFUSAL_INTERRUPTED,
  HOUSEBOT_ALERT_ONCE_RETENTION_DAYS, HOUSEBOT_ALERT_ONCE_PURGE_BATCH,
  CLAIM_TTL_SEC, PLANNER_STALE_EXPIRY_GRACE_SEC, LOCK_MARGIN_MS, ALERT_REPAIR_AFTER_MS, MAX_NON_TRANSIENT_ATTEMPTS,
  BOT_STATUSES, PAUSED_FROM_STATUSES, OFF_CAUSES, PASSWORD_SET_VIA, INTENT_KINDS, INTENT_STATUSES,
  LIVE_INTENT_STATUSES, INTENT_SIDES, ENTRY_CONDITIONS, TARGET_STATUSES, TARGET_END_CAUSES, TIMING_FROM,
  REACT_TO, PRESS_PURPOSES, PRESS_STATES, EVENT_KINDS,
} from "@/lib/house-bot/constants";
import type {
  HouseBotStatus, PausedFromStatus, OffCause, IntentKind, IntentStatus, IntentSide, EntryCondition,
  TargetStatus, TargetEndCause, TimingFrom, ReactTo, PressPurpose, PressState, HouseBotEventKind,
} from "@/lib/house-bot/constants";
import { PAUSE_REASONS, REMOVE_CAUSES, CONSENT_VOID_CAUSES, CREDENTIAL_CHANGED_VIA } from "@/lib/house-bot/pause-reasons";
import type {
  PauseReason, RemoveCause, ConsentVoidCause, CredentialChangedVia, PauseDetail,
} from "@/lib/house-bot/pause-reasons";
import {
  EAT_SQL, EAT_SQL_BY_UNIT, EAT_SQL_TIMEZONE, eatDayKey, eatDayWindow, eatHourKey, eatKeyFor, type EatKeyUnit,
} from "@/lib/house-bot/clock";
import { CAP_FIELDS, LIMIT_FIELDS, type LimitField } from "@/lib/house-bot/rules";

// ---------------------------------------------------------------------------
// Domain types (times are ISO strings; a nullable cap is `number | null`, NULL = not set)
// ---------------------------------------------------------------------------

/** The transaction a write joins: a lock's transaction, or null/absent for autocommit. */
export type HouseTx = Prisma.TransactionClient | null;

/** Keyset position for every paginated read: `("createdAt", id)` descending (C7). */
export type KeysetCursor = { createdAt: string; id: string };
export type Page<T> = { rows: T[]; nextCursor: KeysetCursor | null };

/** A compare-and-set write: the new row, or the row as it is now (null when it is gone). */
export type CasResult<T> = { ok: true; row: T } | { ok: false; current: T | null };

export type IntentProductLine = "MARKET" | "UPDOWN";
export type OpenerDrawnFor = "ENTER_NOW_PREVIEW" | "ENTER_NOW" | "OPENER_PLAN";
/** The Targets tab filter (N2 §8): `ended` includes removed targets. */
export type TargetListStatus = "active" | "ended" | "all";

export type StoredHouseBot = {
  id: string;
  userId: string;
  /** 2–32 code points, normalised (C2). Erasure rewrites it to "Erased <id tail>". */
  label: string;
  /** The case-insensitive live-uniqueness key (C2). */
  labelKey: string;
  note: string | null;
  status: HouseBotStatus;
  /** History only — live gating recomputes the holder's causes (A3). */
  pauseReason: PauseReason | null;
  pauseDetail: PauseDetail | null;
  /** The status before the latest auto-pause; the console reads `wasActive` from it. */
  pausedFromStatus: PausedFromStatus | null;
  passwordFingerprint: string;
  verifiedAt: string;
  verifiedById: string;
  /** A password change seen while the bot was not ACTIVE (02 §2.2). Re-verify clears both. */
  credentialChangedAt: string | null;
  credentialChangedVia: CredentialChangedVia | null;
  consentVoidAt: string | null;
  consentVoidCause: ConsentVoidCause | null;
  designatedAt: string;
  designatedById: string;
  removedAt: string | null;
  removedById: string | null;
  /** Coded, never pseudonymised. `removedReason` is the officer's free text. */
  removedCause: RemoveCause | null;
  removedReason: string | null;
  /** Raw JSON — read it only through `parseHouseBotRules` (F4). */
  rules: unknown;
  rulesVersion: number;
  stakeMinTzs: number | null;
  stakeMaxTzs: number | null;
  capPerMarketTzs: number | null;
  capDailyStakeTzs: number | null;
  capDailyLossTzs: number | null;
  capOpenExposureTzs: number | null;
  balanceFloorTzs: number | null;
  freqMinGapSec: number | null;
  freqMaxPerHour: number | null;
  freqMaxPerDay: number | null;
  freqMaxPerMarket: number | null;
  capStaffChosenPerDay: number | null;
  capStaffChosenDailyTzs: number | null;
  targetsMaxActive: number | null;
  createdAt: string;
  updatedAt: string;
};

export type StoredHouseBotControl = {
  id: string;
  enabled: boolean;
  switchedAt: string | null;
  switchedById: string | null;
  switchedReason: string | null;
  offCause: OffCause | null;
  limitsVersion: number;
  limitsSchemaVersion: number;
  gCapDailyStakeTzs: number | null;
  gCapDailyLossTzs: number | null;
  gCapOpenExposureTzs: number | null;
  gCapPerMarketTzs: number | null;
  gMaxBetsPerMinute: number | null;
  gMaxBetsPerDay: number | null;
  gCounterPerPlayerPerDay: number | null;
  gCounterPerPlayerTzsPerDay: number | null;
  maxDesignatedBots: number;
  bellAlertsPerHour: number;
  gCapStaffChosenPerDay: number | null;
  gCapStaffChosenDailyTzs: number | null;
  gTargetsMaxActive: number | null;
  gStaffChosenMaxCounterpartyShare: number | null;
  createdAt: string;
  updatedAt: string;
};

export type StoredHouseBotRuntime = {
  key: string;
  hourKey: string | null;
  countInHour: number;
  rateLimitedHourKey: string | null;
  rateLimitedCount: number;
  sweepPlacedAt: string | null;
  sweepPositionId: string | null;
  /** ⛔ NULL means OUT of scope, never "no lower bound" (A11) — otherwise the first switch-on
   *  would replay history. */
  scopeFrom: string | null;
  errorStreak: number;
  transientSince: string | null;
  boundsHash: string | null;
  exitConfigHash: string | null;
  rulesFutureSince: string | null;
  engineEnabled: boolean | null;
  bootAt: string | null;
  beatAt: string | null;
  pollerErrorAt: string | null;
  pollerErrorCode: string | null;
  pollerErrorStreak: number;
  skewMs: number | null;
  updatedAt: string;
};

export type StoredHouseBotAlertOnce = {
  key: string;
  createdAt: string;
};

export type StoredHouseBotEvent = {
  id: string;
  houseBotId: string | null;
  userId: string | null;
  marketId: string | null;
  kind: HouseBotEventKind;
  fromStatus: string | null;
  toStatus: string | null;
  /** Officer reasons live HERE, never in `payload` (INT-10); erasure rewrites them. */
  reason: string | null;
  actorId: string | null;
  payload: Record<string, unknown> | null;
  auditId: string | null;
  createdAt: string;
};

export type StoredHouseBotIntent = {
  id: string;
  houseBotId: string;
  botUserId: string;
  kind: IntentKind;
  anchorKey: string;
  marketId: string;
  productLine: IntentProductLine;
  triggerPositionId: string | null;
  triggerUserId: string | null;
  targetId: string | null;
  requestedById: string | null;
  entryCondition: EntryCondition | null;
  side: IntentSide;
  stakeTzs: number;
  dueAt: string;
  deadlineAt: string;
  /** No stake lands after this instant, checked on the database clock (N1 §2). */
  staleAt: string;
  status: IntentStatus;
  reasonCode: string | null;
  why: string | null;
  decision: Record<string, unknown>;
  /** Non-transient outcomes only; the claim filter is `attempts < MAX_NON_TRANSIENT_ATTEMPTS` (N1 §4.3). */
  attempts: number;
  transientAttempts: number;
  nextAttemptAt: string | null;
  claimedBy: string | null;
  claimedUntil: string | null;
  positionId: string | null;
  /** Always `houseIntentKey(id)` — the DAL writes it, the CHECK enforces it (PLAN I4). */
  idempotencyKey: string;
  finishedAt: string | null;
  alertedAt: string | null;
  createdAt: string;
};

export type HouseTargetSnapshot = { titleEn: string; category: string; cutoff: string; rawYes: number; rawNo: number };

export type StoredHouseBotTarget = {
  id: string;
  houseBotId: string;
  marketId: string;
  productLine: "MARKET";
  status: TargetStatus;
  delayMinSec: number;
  delayMaxSec: number;
  timingFrom: TimingFrom;
  reactTo: ReactTo;
  /** DB `now()` at insert. */
  createdAt: string;
  /** `createdAt` + TARGET_ARMING_SEC, written in the same insert (N2 §2). */
  effectiveFrom: string;
  createdById: string;
  updatedAt: string;
  updatedById: string;
  version: number;
  endedAt: string | null;
  endCause: TargetEndCause | null;
  removedAt: string | null;
  removedById: string | null;
  snapshot: HouseTargetSnapshot;
};

export type StoredHouseBotPress = {
  id: string;
  actorId: string;
  submitId: string;
  purpose: PressPurpose;
  houseBotId: string;
  marketId: string | null;
  targetId: string | null;
  intentId: string | null;
  state: PressState;
  code: string | null;
  reason: string | null;
  auditId: string | null;
  auditClaimUntil: string | null;
  createdAt: string;
  updatedAt: string;
};

/** A designation as the service builds it. The lifecycle columns are not in it: `designate`
 *  always writes PAUSED(NEW), version 1, and no removal, void or credential change. */
export type NewHouseBot = Omit<StoredHouseBot,
  | "status" | "pauseReason" | "pauseDetail" | "pausedFromStatus" | "rulesVersion"
  | "credentialChangedAt" | "credentialChangedVia" | "consentVoidAt" | "consentVoidCause"
  | "removedAt" | "removedById" | "removedCause" | "removedReason" | "createdAt" | "updatedAt">;

/** An event as a caller appends it; the DAL mints the id and the database stamps the time. */
export type NewHouseBotEvent = Omit<StoredHouseBotEvent, "id" | "createdAt" | "auditId">;

/** An intent as a planner or action decides it; the DAL writes `idempotencyKey`, the database
 *  stamps `createdAt`. */
export type NewHouseBotIntent = Omit<StoredHouseBotIntent, "idempotencyKey" | "createdAt">;

/** A target as the add action builds it. Status, version, the timestamps and `effectiveFrom`
 *  come from the database clock inside the insert (N2 §2, CC-10). */
export type NewHouseBotTarget = Pick<StoredHouseBotTarget,
  "id" | "houseBotId" | "marketId" | "delayMinSec" | "delayMaxSec" | "timingFrom" | "reactTo" | "createdById" | "snapshot">;

/** A press as step 2 of the press flow inserts it — always CHECKING, no code, no audit yet. */
export type NewHouseBotPress = Pick<StoredHouseBotPress,
  "id" | "actorId" | "submitId" | "purpose" | "houseBotId" | "marketId" | "targetId" | "intentId" | "reason">;

/**
 * The per-bot caps the rules form saves (PLAN §6: engine code never writes them). ONE list, owned by
 * `rules.ts` (`CAP_FIELDS`); a copy here would drift without an error. The typed constant below
 * fails the typecheck the day a name there is not a `HouseBot` column.
 */
export const BOT_CAP_FIELDS = CAP_FIELDS;
const _capsFit: readonly (keyof StoredHouseBot)[] = CAP_FIELDS;
export type BotCapField = (typeof BOT_CAP_FIELDS)[number];
export type HouseBotRulesPatch = { rules?: unknown } & Partial<Pick<StoredHouseBot, BotCapField>>;

/** The global limits form's columns (02 §3.8; N1 §2) — `rules.ts`'s list, re-exported, checked the same way. */
export { LIMIT_FIELDS };
export type { LimitField };
const _limitsFit: readonly (keyof StoredHouseBotControl)[] = LIMIT_FIELDS;
export type HouseBotLimitsPatch = Partial<Pick<StoredHouseBotControl, LimitField>>;

/** Everything `houseBotRuntimeStore.upsert` may write: every column but the key and the stamp. */
export type HouseBotRuntimePatch = Partial<Omit<StoredHouseBotRuntime, "key" | "updatedAt">>;

/** The timing fields an officer may change on an ACTIVE target (N2 §6). */
export const TARGET_TIMING_FIELDS = ["delayMinSec", "delayMaxSec", "timingFrom", "reactTo"] as const;
export type TargetTimingPatch = Partial<Pick<StoredHouseBotTarget, (typeof TARGET_TIMING_FIELDS)[number]>>;

export type SetStatusInput = {
  /** The statuses the row must be in; anything else is a 0-row no-op. */
  from: readonly HouseBotStatus[];
  to: HouseBotStatus;
  pauseReason: PauseReason | null;
  /** Omitted = keep the stored detail. */
  pauseDetail?: PauseDetail | null;
  pausedFromStatus: PausedFromStatus | null;
  /** Required when `to` is REMOVED (the removed-pair CHECK). */
  removal?: { byId: string | null; reason: string | null; cause: RemoveCause };
};

export type IntentFeedFilter = {
  houseBotId?: string;
  productLine?: IntentProductLine;
  kinds?: readonly IntentKind[];
  statuses?: readonly IntentStatus[];
  targetId?: string;
  fromIso?: string;
  toIso?: string;
  cursor?: KeysetCursor | null;
  /**
   * ⭐ C7 STEP 5 (ruling 345). `AdminPagination` draws a NUMBERED `?page=N` link for every page in its window, so
   * the feed's page N must be reachable without walking N−1 cursors. `offset` is what makes that link resolve.
   * ⛔ It does not replace the cursor: both twins still order by `("createdAt","id") DESC` and a cursor read is
   * still what the engine's own walkers use. A caller passes one or the other.
   */
  offset?: number;
  limit: number;
  /**
   * ⭐ STEP 9 (2026-09-26, Ali: "all desk tables and grids got the paging … and sorting") · THE ORDER A NUMBERED PAGE
   * IS CUT FROM. Absent is the feed's own `("createdAt","id") DESC`, byte for byte the order every caller had before
   * this word existed — so the default address, the engine's cursor walkers and every anchor count are unchanged.
   * ⛔ A PAGE ONLY: a keyset `cursor` is a position in the DEFAULT order, so the two together are refused, never guessed.
   * ⛔ ONE NAMED ORDER PER TWIN (`memFeedOrder` / `feedOrderSql`), shared by this member and by `rankInFeed`, so the
   * page a row is served on and the rank a bell is resolved by can never be two different orders.
   */
  order?: IntentFeedOrder;
};

/**
 * What `countFeed` takes: the feed's population WITHOUT any of the three paging words (ruling 345).
 * ⛔ Stated as an `Omit` of the filter itself, deliberately — a hand-copied twin of the facet list is how a badge
 * ends up counting a different population from the rows beside it, which is the whole defect 344 and 345 exist for.
 * ⭐ AND WITHOUT THE ORDER (step 9): a count has no order, and a population that moved when a header was clicked would be
 * a pager drawn over a different set from the rows beside it.
 */
export type IntentFeedCount = Omit<IntentFeedFilter, "cursor" | "limit" | "offset" | "order">;

/** A sort direction, as a closed pair. ⛔ Never interpolated from an address: each twin maps it to its own words. */
export type ListSortDir = "asc" | "desc";

/**
 * ⭐ STEP 9 · THE ORDERS A NUMBERED ACTIVITY PAGE MAY BE CUT FROM, and nothing else — a closed union, so no caller can
 * hand either twin a column name.
 * · `when` — the instant, the id breaking a tie in the SAME direction: `desc` IS the default order.
 * · `stake` and `outcome` — the key, then the default order (newest first, the id last) for every tie, in both
 *   directions, so the order is TOTAL on either store.
 * · `outcome` ranks each row by the chip the console paints for it: the position's own RESULT when it has one
 *   (`FEED_RESULT_STATUSES`), otherwise the intent's status — both placed in `FEED_OUTCOME_ORDER`, the one table the
 *   two twins read. A key outside the table sorts LAST in both directions.
 * · `account` carries its own direction: `accountIds` IS the order (the console ranks the roster by label and hands the
 *   ids over), and a row whose account is not in it — removed, or no account at all — sorts LAST in both directions.
 */
export type IntentFeedOrder =
  | { key: "when" | "stake" | "outcome"; dir: ListSortDir }
  | { key: "account"; accountIds: readonly string[] };

/**
 * The lifecycle a row's Outcome chip runs through: queued → in flight → placed → how it ended — and then the four ways a
 * stake ends without being placed. ⛔ ONE TABLE FOR BOTH TWINS: the memory comparator indexes it and the SQL receives it as
 * a bound array, so the two can never rank one row two ways.
 */
export const FEED_OUTCOME_ORDER = ["PENDING", "CLAIMED", "PLACED", "WIN", "LOSS", "VOID", "CASHED_OUT", "SKIPPED", "EXPIRED", "FAILED", "CANCELLED"] as const;
/** The position statuses that ARE a result — the console's own `CONSOLE_POSITION_RESULT` paints a word for exactly these. */
export const FEED_RESULT_STATUSES = ["WIN", "LOSS", "VOID", "CASHED_OUT"] as const;

/** ⭐ STEP 9 · the history's orders: the instant (the default is `desc`), or the account ranking the console hands over. */
export type EventListOrder =
  | { key: "when"; dir: ListSortDir }
  | { key: "account"; accountIds: readonly string[] };

/**
 * ⭐ STEP 9 · the Targets grid's orders. `poll` is the target's own stored title (A–Z ignoring the case of A–Z, then
 * code point, which is Postgres's `COLLATE "C"`), `status` the lifecycle ACTIVE → ENDED → REMOVED, `lastChange` the
 * instant the grid paints (`endedAt`, else `createdAt`). Every tie falls to the default order, newest first, the id last;
 * a title that is not a string sorts LAST in both directions.
 */
export type TargetListOrder = { key: "poll" | "status" | "lastChange"; dir: ListSortDir };

export type PressRegisterFilter = {
  fromIso: string;
  toIso: string;
  actorId?: string;
  houseBotId?: string;
  cursor?: KeysetCursor | null;
  limit: number;
};

/** One bot's raw sums for a cohort window; `server/house-bot/book.ts` folds them. */
export type HouseBookRawRow = {
  houseBotId: string;
  bets: number;
  staked: number;
  openStake: number;
  settledStake: number;
  returned: number;
};

// ---------------------------------------------------------------------------
// Ids, column maps and the table registry
// ---------------------------------------------------------------------------

/** House ids are minted in code with a fixed prefix (`hb_`, `hbi_`, `hbe_`, `hbt_`, `hbp_`);
 *  the schema has no `@default` on any house id. */
export function newHouseId(kind: keyof typeof HOUSE_ID_PREFIX): string {
  return `${HOUSE_ID_PREFIX[kind]}${randomId(12)}`;
}

export type ColumnKind = "text" | "int" | "bigint" | "bool" | "ts" | "json" | "textArray";
export type ColumnSpec = { col: string; kind: ColumnKind };

/** The Postgres cast every bound parameter of a kind carries. Mandatory, not tidy: `$queryRaw`
 *  binds JS numbers as bigint, and an uncast parameter picks the wrong overload on Postgres only. */
const CAST: Record<ColumnKind, string> = {
  text: "text", int: "int", bigint: "bigint", bool: "boolean", ts: "timestamptz", json: "jsonb", textArray: "text[]",
};

// ⛔ One line per column, typed by the Stored shape, so tsc refuses a missing key and
// `test:dal-parity` can see each one. `bigint` is exactly the BIGINT columns of the migration.
export const HOUSE_BOT_COLUMNS: Record<keyof StoredHouseBot, ColumnSpec> = {
  id: { col: "id", kind: "text" },
  userId: { col: "userId", kind: "text" },
  label: { col: "label", kind: "text" },
  labelKey: { col: "labelKey", kind: "text" },
  note: { col: "note", kind: "text" },
  status: { col: "status", kind: "text" },
  pauseReason: { col: "pauseReason", kind: "text" },
  pauseDetail: { col: "pauseDetail", kind: "json" },
  pausedFromStatus: { col: "pausedFromStatus", kind: "text" },
  passwordFingerprint: { col: "passwordFingerprint", kind: "text" },
  verifiedAt: { col: "verifiedAt", kind: "ts" },
  verifiedById: { col: "verifiedById", kind: "text" },
  credentialChangedAt: { col: "credentialChangedAt", kind: "ts" },
  credentialChangedVia: { col: "credentialChangedVia", kind: "text" },
  consentVoidAt: { col: "consentVoidAt", kind: "ts" },
  consentVoidCause: { col: "consentVoidCause", kind: "text" },
  designatedAt: { col: "designatedAt", kind: "ts" },
  designatedById: { col: "designatedById", kind: "text" },
  removedAt: { col: "removedAt", kind: "ts" },
  removedById: { col: "removedById", kind: "text" },
  removedCause: { col: "removedCause", kind: "text" },
  removedReason: { col: "removedReason", kind: "text" },
  rules: { col: "rules", kind: "json" },
  rulesVersion: { col: "rulesVersion", kind: "int" },
  stakeMinTzs: { col: "stakeMinTzs", kind: "bigint" },
  stakeMaxTzs: { col: "stakeMaxTzs", kind: "bigint" },
  capPerMarketTzs: { col: "capPerMarketTzs", kind: "bigint" },
  capDailyStakeTzs: { col: "capDailyStakeTzs", kind: "bigint" },
  capDailyLossTzs: { col: "capDailyLossTzs", kind: "bigint" },
  capOpenExposureTzs: { col: "capOpenExposureTzs", kind: "bigint" },
  balanceFloorTzs: { col: "balanceFloorTzs", kind: "bigint" },
  freqMinGapSec: { col: "freqMinGapSec", kind: "int" },
  freqMaxPerHour: { col: "freqMaxPerHour", kind: "int" },
  freqMaxPerDay: { col: "freqMaxPerDay", kind: "int" },
  freqMaxPerMarket: { col: "freqMaxPerMarket", kind: "int" },
  capStaffChosenPerDay: { col: "capStaffChosenPerDay", kind: "int" },
  capStaffChosenDailyTzs: { col: "capStaffChosenDailyTzs", kind: "bigint" },
  targetsMaxActive: { col: "targetsMaxActive", kind: "int" },
  createdAt: { col: "createdAt", kind: "ts" },
  updatedAt: { col: "updatedAt", kind: "ts" },
};

export const HOUSE_BOT_CONTROL_COLUMNS: Record<keyof StoredHouseBotControl, ColumnSpec> = {
  id: { col: "id", kind: "text" },
  enabled: { col: "enabled", kind: "bool" },
  switchedAt: { col: "switchedAt", kind: "ts" },
  switchedById: { col: "switchedById", kind: "text" },
  switchedReason: { col: "switchedReason", kind: "text" },
  offCause: { col: "offCause", kind: "text" },
  limitsVersion: { col: "limitsVersion", kind: "int" },
  limitsSchemaVersion: { col: "limitsSchemaVersion", kind: "int" },
  gCapDailyStakeTzs: { col: "gCapDailyStakeTzs", kind: "bigint" },
  gCapDailyLossTzs: { col: "gCapDailyLossTzs", kind: "bigint" },
  gCapOpenExposureTzs: { col: "gCapOpenExposureTzs", kind: "bigint" },
  gCapPerMarketTzs: { col: "gCapPerMarketTzs", kind: "bigint" },
  gMaxBetsPerMinute: { col: "gMaxBetsPerMinute", kind: "int" },
  gMaxBetsPerDay: { col: "gMaxBetsPerDay", kind: "int" },
  gCounterPerPlayerPerDay: { col: "gCounterPerPlayerPerDay", kind: "int" },
  gCounterPerPlayerTzsPerDay: { col: "gCounterPerPlayerTzsPerDay", kind: "bigint" },
  maxDesignatedBots: { col: "maxDesignatedBots", kind: "int" },
  bellAlertsPerHour: { col: "bellAlertsPerHour", kind: "int" },
  gCapStaffChosenPerDay: { col: "gCapStaffChosenPerDay", kind: "int" },
  gCapStaffChosenDailyTzs: { col: "gCapStaffChosenDailyTzs", kind: "bigint" },
  gTargetsMaxActive: { col: "gTargetsMaxActive", kind: "int" },
  gStaffChosenMaxCounterpartyShare: { col: "gStaffChosenMaxCounterpartyShare", kind: "int" },
  createdAt: { col: "createdAt", kind: "ts" },
  updatedAt: { col: "updatedAt", kind: "ts" },
};

export const HOUSE_BOT_RUNTIME_COLUMNS: Record<keyof StoredHouseBotRuntime, ColumnSpec> = {
  key: { col: "key", kind: "text" },
  hourKey: { col: "hourKey", kind: "text" },
  countInHour: { col: "countInHour", kind: "int" },
  rateLimitedHourKey: { col: "rateLimitedHourKey", kind: "text" },
  rateLimitedCount: { col: "rateLimitedCount", kind: "int" },
  sweepPlacedAt: { col: "sweepPlacedAt", kind: "ts" },
  sweepPositionId: { col: "sweepPositionId", kind: "text" },
  scopeFrom: { col: "scopeFrom", kind: "ts" },
  errorStreak: { col: "errorStreak", kind: "int" },
  transientSince: { col: "transientSince", kind: "ts" },
  boundsHash: { col: "boundsHash", kind: "text" },
  exitConfigHash: { col: "exitConfigHash", kind: "text" },
  rulesFutureSince: { col: "rulesFutureSince", kind: "ts" },
  engineEnabled: { col: "engineEnabled", kind: "bool" },
  bootAt: { col: "bootAt", kind: "ts" },
  beatAt: { col: "beatAt", kind: "ts" },
  pollerErrorAt: { col: "pollerErrorAt", kind: "ts" },
  pollerErrorCode: { col: "pollerErrorCode", kind: "text" },
  pollerErrorStreak: { col: "pollerErrorStreak", kind: "int" },
  skewMs: { col: "skewMs", kind: "int" },
  updatedAt: { col: "updatedAt", kind: "ts" },
};

export const HOUSE_BOT_ALERT_ONCE_COLUMNS: Record<keyof StoredHouseBotAlertOnce, ColumnSpec> = {
  key: { col: "key", kind: "text" },
  createdAt: { col: "createdAt", kind: "ts" },
};

export const HOUSE_BOT_EVENT_COLUMNS: Record<keyof StoredHouseBotEvent, ColumnSpec> = {
  id: { col: "id", kind: "text" },
  houseBotId: { col: "houseBotId", kind: "text" },
  userId: { col: "userId", kind: "text" },
  marketId: { col: "marketId", kind: "text" },
  kind: { col: "kind", kind: "text" },
  fromStatus: { col: "fromStatus", kind: "text" },
  toStatus: { col: "toStatus", kind: "text" },
  reason: { col: "reason", kind: "text" },
  actorId: { col: "actorId", kind: "text" },
  payload: { col: "payload", kind: "json" },
  auditId: { col: "auditId", kind: "text" },
  createdAt: { col: "createdAt", kind: "ts" },
};

export const HOUSE_BOT_INTENT_COLUMNS: Record<keyof StoredHouseBotIntent, ColumnSpec> = {
  id: { col: "id", kind: "text" },
  houseBotId: { col: "houseBotId", kind: "text" },
  botUserId: { col: "botUserId", kind: "text" },
  kind: { col: "kind", kind: "text" },
  anchorKey: { col: "anchorKey", kind: "text" },
  marketId: { col: "marketId", kind: "text" },
  productLine: { col: "productLine", kind: "text" },
  triggerPositionId: { col: "triggerPositionId", kind: "text" },
  triggerUserId: { col: "triggerUserId", kind: "text" },
  targetId: { col: "targetId", kind: "text" },
  requestedById: { col: "requestedById", kind: "text" },
  entryCondition: { col: "entryCondition", kind: "text" },
  side: { col: "side", kind: "text" },
  stakeTzs: { col: "stakeTzs", kind: "bigint" },
  dueAt: { col: "dueAt", kind: "ts" },
  deadlineAt: { col: "deadlineAt", kind: "ts" },
  staleAt: { col: "staleAt", kind: "ts" },
  status: { col: "status", kind: "text" },
  reasonCode: { col: "reasonCode", kind: "text" },
  why: { col: "why", kind: "text" },
  decision: { col: "decision", kind: "json" },
  attempts: { col: "attempts", kind: "int" },
  transientAttempts: { col: "transientAttempts", kind: "int" },
  nextAttemptAt: { col: "nextAttemptAt", kind: "ts" },
  claimedBy: { col: "claimedBy", kind: "text" },
  claimedUntil: { col: "claimedUntil", kind: "ts" },
  positionId: { col: "positionId", kind: "text" },
  idempotencyKey: { col: "idempotencyKey", kind: "text" },
  finishedAt: { col: "finishedAt", kind: "ts" },
  alertedAt: { col: "alertedAt", kind: "ts" },
  createdAt: { col: "createdAt", kind: "ts" },
};

export const HOUSE_BOT_TARGET_COLUMNS: Record<keyof StoredHouseBotTarget, ColumnSpec> = {
  id: { col: "id", kind: "text" },
  houseBotId: { col: "houseBotId", kind: "text" },
  marketId: { col: "marketId", kind: "text" },
  productLine: { col: "productLine", kind: "text" },
  status: { col: "status", kind: "text" },
  delayMinSec: { col: "delayMinSec", kind: "int" },
  delayMaxSec: { col: "delayMaxSec", kind: "int" },
  timingFrom: { col: "timingFrom", kind: "text" },
  reactTo: { col: "reactTo", kind: "text" },
  createdAt: { col: "createdAt", kind: "ts" },
  effectiveFrom: { col: "effectiveFrom", kind: "ts" },
  createdById: { col: "createdById", kind: "text" },
  updatedAt: { col: "updatedAt", kind: "ts" },
  updatedById: { col: "updatedById", kind: "text" },
  version: { col: "version", kind: "int" },
  endedAt: { col: "endedAt", kind: "ts" },
  endCause: { col: "endCause", kind: "text" },
  removedAt: { col: "removedAt", kind: "ts" },
  removedById: { col: "removedById", kind: "text" },
  snapshot: { col: "snapshot", kind: "json" },
};

export const HOUSE_BOT_PRESS_COLUMNS: Record<keyof StoredHouseBotPress, ColumnSpec> = {
  id: { col: "id", kind: "text" },
  actorId: { col: "actorId", kind: "text" },
  submitId: { col: "submitId", kind: "text" },
  purpose: { col: "purpose", kind: "text" },
  houseBotId: { col: "houseBotId", kind: "text" },
  marketId: { col: "marketId", kind: "text" },
  targetId: { col: "targetId", kind: "text" },
  intentId: { col: "intentId", kind: "text" },
  state: { col: "state", kind: "text" },
  code: { col: "code", kind: "text" },
  reason: { col: "reason", kind: "text" },
  auditId: { col: "auditId", kind: "text" },
  auditClaimUntil: { col: "auditClaimUntil", kind: "ts" },
  createdAt: { col: "createdAt", kind: "ts" },
  updatedAt: { col: "updatedAt", kind: "ts" },
};

type HouseRows = {
  HouseBot: StoredHouseBot;
  HouseBotControl: StoredHouseBotControl;
  HouseBotRuntime: StoredHouseBotRuntime;
  HouseBotAlertOnce: StoredHouseBotAlertOnce;
  HouseBotEvent: StoredHouseBotEvent;
  HouseBotIntent: StoredHouseBotIntent;
  HouseBotTarget: StoredHouseBotTarget;
  HouseBotPress: StoredHouseBotPress;
};
export type HouseTable = keyof HouseRows;

const TABLE_COLUMNS: { [T in HouseTable]: Record<keyof HouseRows[T], ColumnSpec> } = {
  HouseBot: HOUSE_BOT_COLUMNS,
  HouseBotControl: HOUSE_BOT_CONTROL_COLUMNS,
  HouseBotRuntime: HOUSE_BOT_RUNTIME_COLUMNS,
  HouseBotAlertOnce: HOUSE_BOT_ALERT_ONCE_COLUMNS,
  HouseBotEvent: HOUSE_BOT_EVENT_COLUMNS,
  HouseBotIntent: HOUSE_BOT_INTENT_COLUMNS,
  HouseBotTarget: HOUSE_BOT_TARGET_COLUMNS,
  HouseBotPress: HOUSE_BOT_PRESS_COLUMNS,
};

/** Each table's primary key column (`<Table>_pkey` in the migration). */
const TABLE_PK: { [T in HouseTable]: keyof HouseRows[T] & string } = {
  HouseBot: "id", HouseBotControl: "id", HouseBotRuntime: "key", HouseBotAlertOnce: "key",
  HouseBotEvent: "id", HouseBotIntent: "id", HouseBotTarget: "id", HouseBotPress: "id",
};

// ---------------------------------------------------------------------------
// The named uniques and CHECKs, and their memory mirrors
// ---------------------------------------------------------------------------

/**
 * ⭐ EVERY UNIQUE INDEX ON A HOUSE TABLE, BY ITS FIXED NAME, in the migration's creation order
 * (which is the order Postgres checks them in). The primary keys are not listed: a duplicate id
 * is a bug, and `uniqueViolation` returning null makes the caller rethrow it.
 */
export const HOUSE_UNIQUE_INDEXES = [
  "HouseBot_userId_live_key",
  "HouseBot_labelKey_live_key",
  "hbe_opener_draw_uq",
  "HouseBotIntent_positionId_key",
  "HouseBotIntent_idempotencyKey_key",
  "hbi_counter_anchor_uq",
  "hbi_fill_opener_anchor_uq",
  "hbi_manual_anchor_uq",
  "hbi_manual_live_market_uq",
  "hbt_active_market_uq",
  "hbp_actor_submit_uq",
] as const;
export type HouseUniqueIndex = (typeof HOUSE_UNIQUE_INDEXES)[number];

type MemUnique<R> = { name: HouseUniqueIndex; cols: readonly (keyof R & string)[]; where: (row: R) => boolean };
type MemCheck<R> = { name: string; ok: (row: R) => boolean };

const LIVE_STATUSES: readonly string[] = LIVE_INTENT_STATUSES;

/** The memory stand-in for every unique index above — the same columns and the same partial
 *  predicate. A NULL in any indexed column never clashes, as in Postgres. */
const MEM_UNIQUES: { [T in HouseTable]: ReadonlyArray<MemUnique<HouseRows[T]>> } = {
  HouseBot: [
    { name: "HouseBot_userId_live_key", cols: ["userId"], where: (r) => r.status !== "REMOVED" },
    { name: "HouseBot_labelKey_live_key", cols: ["labelKey"], where: (r) => r.status !== "REMOVED" },
  ],
  HouseBotControl: [],
  HouseBotRuntime: [],
  HouseBotAlertOnce: [],
  HouseBotEvent: [
    { name: "hbe_opener_draw_uq", cols: ["marketId"], where: (r) => r.kind === "OPENER_SIDE_DRAWN" },
  ],
  HouseBotIntent: [
    { name: "HouseBotIntent_positionId_key", cols: ["positionId"], where: () => true },
    { name: "HouseBotIntent_idempotencyKey_key", cols: ["idempotencyKey"], where: () => true },
    { name: "hbi_counter_anchor_uq", cols: ["anchorKey"], where: (r) => r.kind === "COUNTER" },
    { name: "hbi_fill_opener_anchor_uq", cols: ["kind", "anchorKey"], where: (r) => (r.kind === "FILL" || r.kind === "OPENER") && r.status !== "CANCELLED" },
    { name: "hbi_manual_anchor_uq", cols: ["anchorKey"], where: (r) => r.kind === "MANUAL" },
    { name: "hbi_manual_live_market_uq", cols: ["marketId"], where: (r) => r.kind === "MANUAL" && LIVE_STATUSES.includes(r.status) },
  ],
  HouseBotTarget: [
    { name: "hbt_active_market_uq", cols: ["marketId"], where: (r) => r.status === "ACTIVE" },
  ],
  HouseBotPress: [
    { name: "hbp_actor_submit_uq", cols: ["actorId", "submitId"], where: () => true },
  ],
};

// SQL CHECK semantics: a predicate that is TRUE or NULL passes. Every helper below returns true
// exactly where Postgres would let the row through.
const inList = (list: readonly string[], v: unknown): boolean => typeof v === "string" && list.includes(v);
const nullOrIn = (list: readonly string[], v: unknown): boolean => v == null || inList(list, v);
const between = (v: number | null, lo: number, hi: number): boolean => v == null || (v >= lo && v <= hi);
const nullOrMax = (s: string | null, max: number): boolean => s == null || codePoints(s) <= max;
/** `char_length` counts code points, not UTF-16 units (C2). */
const codePoints = (s: string): number => [...s].length;
const TZS_MAX = 1_000_000_000;

/**
 * ⭐ ONE ENTRY PER NAMED CHECK IN THE TWO HOUSE MIGRATIONS — the same name, the same predicate.
 * `HOUSE_CHECK_NAMES` is derived from this map, so it is the single list the migrations suite
 * compares with `pg_constraint`.
 *
 * The `User` entry mirrors `User_passwordSetVia_check` for the name list only: the memory user
 * store lives in `store.ts` and does not run it, so that CHECK is proven on Postgres alone.
 */
const MEM_CHECKS: { [T in HouseTable]: ReadonlyArray<MemCheck<HouseRows[T]>> } & {
  User: ReadonlyArray<MemCheck<{ passwordSetVia?: string | null }>>;
} = {
  HouseBot: [
    { name: "HouseBot_label_check", ok: (r) => { const n = codePoints(r.label); return n >= 2 && n <= 32; } },
    { name: "HouseBot_labelKey_check", ok: (r) => r.labelKey !== "" },
    { name: "HouseBot_note_check", ok: (r) => nullOrMax(r.note, 300) },
    { name: "HouseBot_status_check", ok: (r) => inList(BOT_STATUSES, r.status) },
    { name: "HouseBot_pauseReason_check", ok: (r) => nullOrIn(PAUSE_REASONS, r.pauseReason) },
    { name: "HouseBot_paused_reason_check", ok: (r) => !(r.status === "PAUSED" || r.status === "AUTO_PAUSED") || r.pauseReason != null },
    { name: "HouseBot_pausedFromStatus_check", ok: (r) => nullOrIn(PAUSED_FROM_STATUSES, r.pausedFromStatus) },
    { name: "HouseBot_credentialChangedVia_check", ok: (r) => nullOrIn(CREDENTIAL_CHANGED_VIA, r.credentialChangedVia) },
    { name: "HouseBot_credentialChanged_pair_check", ok: (r) => (r.credentialChangedAt == null) === (r.credentialChangedVia == null) },
    { name: "HouseBot_consentVoidCause_check", ok: (r) => nullOrIn(CONSENT_VOID_CAUSES, r.consentVoidCause) },
    { name: "HouseBot_consentVoid_pair_check", ok: (r) => (r.consentVoidAt == null) === (r.consentVoidCause == null) },
    { name: "HouseBot_removedCause_check", ok: (r) => nullOrIn(REMOVE_CAUSES, r.removedCause) },
    { name: "HouseBot_removed_pair_check", ok: (r) => (r.status === "REMOVED") === (r.removedAt != null && r.removedCause != null) },
    { name: "HouseBot_removedReason_check", ok: (r) => nullOrMax(r.removedReason, 300) },
    { name: "HouseBot_rulesVersion_check", ok: (r) => r.rulesVersion >= 1 },
    { name: "HouseBot_stakeMinTzs_check", ok: (r) => between(r.stakeMinTzs, 0, TZS_MAX) },
    { name: "HouseBot_stakeMaxTzs_check", ok: (r) => between(r.stakeMaxTzs, 0, TZS_MAX) },
    { name: "HouseBot_capPerMarketTzs_check", ok: (r) => between(r.capPerMarketTzs, 0, TZS_MAX) },
    { name: "HouseBot_capDailyStakeTzs_check", ok: (r) => between(r.capDailyStakeTzs, 0, TZS_MAX) },
    { name: "HouseBot_capDailyLossTzs_check", ok: (r) => between(r.capDailyLossTzs, 0, TZS_MAX) },
    { name: "HouseBot_capOpenExposureTzs_check", ok: (r) => between(r.capOpenExposureTzs, 0, TZS_MAX) },
    { name: "HouseBot_balanceFloorTzs_check", ok: (r) => between(r.balanceFloorTzs, 0, TZS_MAX) },
    { name: "HouseBot_freqMinGapSec_check", ok: (r) => between(r.freqMinGapSec, 0, 86400) },
    { name: "HouseBot_freqMaxPerHour_check", ok: (r) => between(r.freqMaxPerHour, 1, 60) },
    { name: "HouseBot_freqMaxPerDay_check", ok: (r) => between(r.freqMaxPerDay, 1, 1440) },
    { name: "HouseBot_freqMaxPerMarket_check", ok: (r) => between(r.freqMaxPerMarket, 1, 6) },
    { name: "HouseBot_capStaffChosenPerDay_check", ok: (r) => between(r.capStaffChosenPerDay, 1, 50) },
    { name: "HouseBot_capStaffChosenDailyTzs_check", ok: (r) => between(r.capStaffChosenDailyTzs, 0, TZS_MAX) },
    { name: "HouseBot_targetsMaxActive_check", ok: (r) => between(r.targetsMaxActive, 1, 50) },
  ],
  HouseBotControl: [
    { name: "HouseBotControl_id_check", ok: (r) => r.id === "global" },
    { name: "HouseBotControl_offCause_check", ok: (r) => nullOrIn(OFF_CAUSES, r.offCause) },
    { name: "HouseBotControl_switchedReason_check", ok: (r) => nullOrMax(r.switchedReason, 300) },
    { name: "HouseBotControl_versions_check", ok: (r) => r.limitsVersion >= 1 && r.limitsSchemaVersion >= 1 },
    { name: "HouseBotControl_gCapDailyStakeTzs_check", ok: (r) => between(r.gCapDailyStakeTzs, 0, TZS_MAX) },
    { name: "HouseBotControl_gCapDailyLossTzs_check", ok: (r) => between(r.gCapDailyLossTzs, 0, TZS_MAX) },
    { name: "HouseBotControl_gCapOpenExposureTzs_check", ok: (r) => between(r.gCapOpenExposureTzs, 0, TZS_MAX) },
    { name: "HouseBotControl_gCapPerMarketTzs_check", ok: (r) => between(r.gCapPerMarketTzs, 0, TZS_MAX) },
    { name: "HouseBotControl_gMaxBetsPerMinute_check", ok: (r) => between(r.gMaxBetsPerMinute, 1, 20) },
    { name: "HouseBotControl_gMaxBetsPerDay_check", ok: (r) => between(r.gMaxBetsPerDay, 1, 28800) },
    { name: "HouseBotControl_gCounterPerPlayerPerDay_check", ok: (r) => between(r.gCounterPerPlayerPerDay, 1, 1440) },
    { name: "HouseBotControl_gCounterPerPlayerTzsPerDay_check", ok: (r) => between(r.gCounterPerPlayerTzsPerDay, 0, TZS_MAX) },
    { name: "HouseBotControl_maxDesignatedBots_check", ok: (r) => between(r.maxDesignatedBots, 1, 20) },
    { name: "HouseBotControl_bellAlertsPerHour_check", ok: (r) => between(r.bellAlertsPerHour, 0, 60) },
    { name: "HouseBotControl_gCapStaffChosenPerDay_check", ok: (r) => between(r.gCapStaffChosenPerDay, 1, 200) },
    { name: "HouseBotControl_gCapStaffChosenDailyTzs_check", ok: (r) => between(r.gCapStaffChosenDailyTzs, 0, TZS_MAX) },
    { name: "HouseBotControl_gTargetsMaxActive_check", ok: (r) => between(r.gTargetsMaxActive, 1, 200) },
    { name: "HouseBotControl_gStaffChosenMaxCounterpartyShare_check", ok: (r) => between(r.gStaffChosenMaxCounterpartyShare, 10, 100) },
  ],
  HouseBotRuntime: [
    { name: "HouseBotRuntime_key_check", ok: (r) => r.key === "global" || r.key === "beat:planner"
      || r.key.startsWith("bot:") || r.key.startsWith("engine:") || r.key.startsWith("beat:poller:") },
    { name: "HouseBotRuntime_counts_check", ok: (r) => r.countInHour >= 0 && r.rateLimitedCount >= 0
      && r.errorStreak >= 0 && r.pollerErrorStreak >= 0 },
  ],
  HouseBotAlertOnce: [],
  HouseBotEvent: [
    { name: "HouseBotEvent_kind_check", ok: (r) => inList(EVENT_KINDS, r.kind) },
    { name: "HouseBotEvent_reason_check", ok: (r) => nullOrMax(r.reason, 300) },
  ],
  HouseBotIntent: [
    { name: "HouseBotIntent_kind_check", ok: (r) => inList(INTENT_KINDS, r.kind) },
    { name: "HouseBotIntent_status_check", ok: (r) => inList(INTENT_STATUSES, r.status) },
    { name: "HouseBotIntent_productLine_check", ok: (r) => r.productLine === "MARKET" || r.productLine === "UPDOWN" },
    { name: "HouseBotIntent_side_check", ok: (r) => inList(INTENT_SIDES, r.side) },
    { name: "HouseBotIntent_stakeTzs_check", ok: (r) => between(r.stakeTzs, 1, TZS_MAX) },
    { name: "HouseBotIntent_attempts_check", ok: (r) => r.attempts >= 0 && r.transientAttempts >= 0 },
    { name: "HouseBotIntent_requestedById_check", ok: (r) => (r.kind === "MANUAL") === (r.requestedById != null) },
    { name: "HouseBotIntent_entryCondition_check", ok: (r) => nullOrIn(ENTRY_CONDITIONS, r.entryCondition) },
    { name: "HouseBotIntent_entryCondition_manual_check", ok: (r) => (r.kind === "MANUAL") === (r.entryCondition != null) },
    { name: "HouseBotIntent_targetId_check", ok: (r) => r.targetId == null || r.kind === "COUNTER" },
    { name: "HouseBotIntent_manual_polls_check", ok: (r) => r.kind !== "MANUAL" || r.productLine === "MARKET" },
    { name: "HouseBotIntent_counter_anchor_check", ok: (r) => r.kind !== "COUNTER"
      || (r.triggerPositionId != null && r.anchorKey === r.triggerPositionId) },
    { name: "HouseBotIntent_market_anchor_check", ok: (r) => !(r.kind === "FILL" || r.kind === "OPENER") || r.anchorKey === r.marketId },
    { name: "HouseBotIntent_manual_anchor_check", ok: (r) => r.kind !== "MANUAL" || manualAnchorOk(r.anchorKey, r.requestedById) },
    { name: "HouseBotIntent_idempotencyKey_check", ok: (r) => r.idempotencyKey === `hb:${r.id}` },
    { name: "HouseBotIntent_placed_check", ok: (r) => r.status !== "PLACED" || r.positionId != null },
  ],
  HouseBotTarget: [
    { name: "HouseBotTarget_productLine_check", ok: (r) => r.productLine === "MARKET" },
    { name: "HouseBotTarget_status_check", ok: (r) => inList(TARGET_STATUSES, r.status) },
    { name: "HouseBotTarget_delayMinSec_check", ok: (r) => between(r.delayMinSec, 5, 600) },
    { name: "HouseBotTarget_delayMaxSec_check", ok: (r) => between(r.delayMaxSec, 5, 600) },
    { name: "HouseBotTarget_delay_order_check", ok: (r) => r.delayMinSec <= r.delayMaxSec },
    { name: "HouseBotTarget_timingFrom_check", ok: (r) => inList(TIMING_FROM, r.timingFrom) },
    { name: "HouseBotTarget_reactTo_check", ok: (r) => inList(REACT_TO, r.reactTo) },
    { name: "HouseBotTarget_endCause_check", ok: (r) => nullOrIn(TARGET_END_CAUSES, r.endCause) },
    { name: "HouseBotTarget_ended_pair_check", ok: (r) => (r.status === "ENDED") === (r.endedAt != null && r.endCause != null) },
    { name: "HouseBotTarget_removed_pair_check", ok: (r) => (r.status === "REMOVED") === (r.removedAt != null && r.removedById != null) },
    { name: "HouseBotTarget_effectiveFrom_check", ok: (r) => Date.parse(r.effectiveFrom) >= Date.parse(r.createdAt) },
    { name: "HouseBotTarget_version_check", ok: (r) => r.version >= 1 },
  ],
  HouseBotPress: [
    { name: "HouseBotPress_submitId_check", ok: (r) => SUBMIT_ID_RE.test(r.submitId) },
    { name: "HouseBotPress_purpose_check", ok: (r) => inList(PRESS_PURPOSES, r.purpose) },
    { name: "HouseBotPress_state_check", ok: (r) => inList(PRESS_STATES, r.state) },
    { name: "HouseBotPress_refused_code_check", ok: (r) => (r.state === "REFUSED") === (r.code != null) },
    { name: "HouseBotPress_queued_check", ok: (r) => r.state !== "QUEUED" || (r.purpose === "ENTER_NOW" && r.intentId != null) },
    { name: "HouseBotPress_reason_check", ok: (r) => nullOrMax(r.reason, 300) },
  ],
  User: [
    { name: "User_passwordSetVia_check", ok: (r) => nullOrIn(PASSWORD_SET_VIA, r.passwordSetVia) },
  ],
};

/**
 * `"anchorKey" = 'manual:' || "requestedById" || ':' || right("anchorKey", 36)
 *   AND right("anchorKey", 36) ~ '^[0-9a-f-]{36}$'` under SQL's three-valued logic: a NULL
 * `requestedById` makes the comparison NULL, and NULL AND true is NULL, which a CHECK lets
 * through. (The requestedById CHECK refuses that row anyway; this keeps the twin exact.)
 */
function manualAnchorOk(anchorKey: string, requestedById: string | null): boolean {
  const tail = [...anchorKey].slice(-36).join("");
  const shapeOk = /^[0-9a-f-]{36}$/.test(tail);
  if (!shapeOk) return false;
  if (requestedById == null) return true;
  return anchorKey === `manual:${requestedById}:${tail}`;
}

/** Every named CHECK, derived from `MEM_CHECKS` — house tables plus the one User CHECK. */
export const HOUSE_CHECK_NAMES: readonly string[] = Object.values(MEM_CHECKS).flatMap((list) =>
  (list as ReadonlyArray<{ name: string }>).map((c) => c.name));

/** Postgres evaluates a row's CHECKs in constraint-name order and reports the first failure;
 *  the twin does the same so both stores name the same constraint for a doubly bad row. */
const byName = (a: { name: string }, b: { name: string }) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);

// ---------------------------------------------------------------------------
// Violations: reading them, and raising them from memory
// ---------------------------------------------------------------------------

type DbError = { code?: string; meta?: { code?: string; target?: unknown; message?: string }; message?: string };

/** The one name from `names` the error text mentions as a whole identifier, or null for none or
 *  several. Token match, not substring: a name inside a longer identifier is a different name. */
function namedIn(err: DbError, names: ReadonlySet<string>): string | null {
  const text = `${err.message ?? ""} ${err.meta?.message ?? ""} ${JSON.stringify(err.meta?.target ?? "")}`;
  const found = new Set((text.match(/[A-Za-z0-9_]+/g) ?? []).filter((t) => names.has(t)));
  return found.size === 1 ? [...found][0] : null;
}

const UNIQUE_NAME_SET: ReadonlySet<string> = new Set(HOUSE_UNIQUE_INDEXES);
const CHECK_NAME_SET: ReadonlySet<string> = new Set(HOUSE_CHECK_NAMES);

/**
 * Which house unique index an error violated (MON-12) — or null.
 *
 * ⚠️ Prisma does NOT name the index for raw SQL. Probed on the scratch Postgres 18.3 with
 * @prisma/client 6.19.3 (2026-09-14): a unique violation arrives as P2010 with `meta.code` "23505"
 * and `meta.message` holding only Postgres's DETAIL, `Key ("marketId")=(m1) already exists.` — in
 * `$queryRawUnsafe`, `$executeRawUnsafe` and interactive transactions alike (a 23514 CHECK
 * violation does carry its name). So every house statement runs through `sql()` / `exec()`, which
 * resolve the index from the table written and the DETAIL's key columns (`uniqueFromDetail`) and
 * re-raise the memory twin's shape, naming it. This reader then finds the name in that message.
 * A P2002 whose `meta.target` is a field list names nothing and returns null.
 *
 * ⛔ NULL MEANS RETHROW. A caller that swallows an unrecognised violation turns a real defect
 * into a silent no-op on a money path.
 */
export function uniqueViolation(err: unknown): HouseUniqueIndex | null {
  if (!err || typeof err !== "object") return null;
  const e = err as DbError;
  const isUnique = e.code === "P2002" || e.code === "P2010" || e.code === "23505" || e.meta?.code === "23505";
  if (!isUnique) return null;
  return namedIn(e, UNIQUE_NAME_SET) as HouseUniqueIndex | null;
}

/** Which named CHECK an error violated (Postgres 23514), or null. Same reading as above. */
export function checkViolation(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  const e = err as DbError;
  const isCheck = e.code === "23514" || e.meta?.code === "23514";
  if (!isCheck) return null;
  return namedIn(e, CHECK_NAME_SET);
}

/**
 * Each house unique index by the table it lives on and the key columns Postgres's DETAIL lists
 * (in index order). Two indexes share `("anchorKey")` on intents; the key's value tells them apart,
 * because a MANUAL anchor always starts "manual:" (`HouseBotIntent_manual_anchor_check`) and a
 * COUNTER anchor is a position id.
 */
const UNIQUE_BY_KEY: Readonly<Partial<Record<HouseTable, readonly { cols: string; name: HouseUniqueIndex; value?: (v: string) => boolean }[]>>> = {
  HouseBot: [
    { cols: "userId", name: "HouseBot_userId_live_key" },
    { cols: "labelKey", name: "HouseBot_labelKey_live_key" },
  ],
  HouseBotIntent: [
    { cols: "anchorKey", name: "hbi_manual_anchor_uq", value: (v) => v.startsWith("manual:") },
    { cols: "anchorKey", name: "hbi_counter_anchor_uq", value: (v) => !v.startsWith("manual:") },
    { cols: "kind,anchorKey", name: "hbi_fill_opener_anchor_uq" },
    { cols: "marketId", name: "hbi_manual_live_market_uq" },
    { cols: "positionId", name: "HouseBotIntent_positionId_key" },
    { cols: "idempotencyKey", name: "HouseBotIntent_idempotencyKey_key" },
  ],
  HouseBotEvent: [{ cols: "marketId", name: "hbe_opener_draw_uq" }],
  HouseBotTarget: [{ cols: "marketId", name: "hbt_active_market_uq" }],
  HouseBotPress: [{ cols: "actorId,submitId", name: "hbp_actor_submit_uq" }],
};

/**
 * The house unique index a 23505 DETAIL (`Key ("actorId", "submitId")=(…) already exists.`) names
 * through its key columns, for a statement whose text writes one or more house tables. ⛔ Exactly
 * one match or null: an unresolvable violation is rethrown as it came, never guessed.
 */
function uniqueFromDetail(sqlText: string, detail: string | undefined): HouseUniqueIndex | null {
  const m = /Key \(([^)]*)\)=\(([\s\S]*)\) already exists/.exec(detail ?? "");
  if (!m) return null;
  const cols = m[1].split(",").map((c) => c.trim().replace(/^"|"$/g, "")).join(",");
  const tables = new Set(
    (sqlText.match(/\b(?:INSERT\s+INTO|UPDATE)\s+"HouseBot\w*"/gi) ?? []).map((s) => s.slice(s.indexOf('"') + 1, -1) as HouseTable),
  );
  const hits = [...tables].flatMap((t) => (UNIQUE_BY_KEY[t] ?? []).filter((u) => u.cols === cols && (!u.value || u.value(m[2]))));
  return hits.length === 1 ? hits[0].name : null;
}

/** A raw-SQL error as the house callers read it: a 23505 Prisma left unnamed is re-raised naming its
 *  index (the original kept as `cause`); every other error passes through untouched. */
function withUniqueName(e: unknown, sqlText: string): unknown {
  if (!e || typeof e !== "object") return e;
  const x = e as DbError;
  if (x.meta?.code !== "23505" || uniqueViolation(x)) return e;
  const name = uniqueFromDetail(sqlText, x.meta?.message);
  return name ? Object.assign(houseUniqueError(name), { cause: e }) : e;
}

/** The error Prisma raises for a raw-SQL unique violation, raised by the memory twin. */
function houseUniqueError(name: string): Error {
  const message = `duplicate key value violates unique constraint "${name}"`;
  return Object.assign(new Error(`Raw query failed. Code: \`23505\`. Message: \`${message}\``), {
    code: "P2010", meta: { code: "23505", message },
  });
}

/** The error Prisma raises for a raw-SQL CHECK violation, raised by the memory twin. */
function houseCheckError(table: string, name: string): Error {
  const message = `new row for relation "${table}" violates check constraint "${name}"`;
  return Object.assign(new Error(`Raw query failed. Code: \`23514\`. Message: \`${message}\``), {
    code: "P2010", meta: { code: "23514", message },
  });
}

/** Thrown when the seeded `global` rows are missing: the house migrations have not been applied
 *  to this database (A23). Never caught into a default — a missing switch row is not "off". */
export class HouseSchemaNotReady extends Error {
  constructor(what: string) {
    super(`house-bot-dal: ${what} is missing — apply the house bot migrations first`);
    this.name = "HouseSchemaNotReady";
  }
}

// ---------------------------------------------------------------------------
// SQL building
// ---------------------------------------------------------------------------

/**
 * Validate one value for its column and return the bound parameter.
 *
 * ⛔ A NON-WHOLE NUMBER THROWS HERE, IN BOTH STORES. Bound as a double and cast `::bigint`,
 * Postgres would ROUND 1.5 to 2 — a silently different stake. Memory runs the same check so
 * the twin refuses what production refuses.
 */
function bindValue(table: string, key: string, spec: ColumnSpec, v: unknown): unknown {
  if (v === null) return null;
  const bad = (want: string) => new Error(`house-bot-dal: ${table}.${key} must be ${want}`);
  switch (spec.kind) {
    case "int":
    case "bigint":
      if (typeof v !== "number" || !Number.isSafeInteger(v)) throw bad("a whole number");
      return v;
    case "bool":
      if (typeof v !== "boolean") throw bad("a boolean");
      return v;
    case "ts": {
      const at = typeof v === "string" ? Date.parse(v) : NaN;
      if (!Number.isFinite(at)) throw bad("an ISO timestamp");
      return new Date(at).toISOString();
    }
    case "json":
      return JSON.stringify(v);
    case "textArray":
      if (!Array.isArray(v) || v.some((x) => typeof x !== "string")) throw bad("a list of strings");
      return v;
    default:
      if (typeof v !== "string") throw bad("text");
      return v;
  }
}

/** Positional parameters with their casts, in order. */
class Params {
  readonly values: unknown[] = [];
  /** A raw value with an explicit cast. */
  raw(v: unknown, cast: string): string {
    this.values.push(v);
    return `$${this.values.length}::${cast}`;
  }
  /** A column value, validated and cast by its column kind. */
  col(table: HouseTable, key: string, v: unknown): string {
    const spec = (TABLE_COLUMNS[table] as Record<string, ColumnSpec>)[key];
    if (!spec) throw new Error(`house-bot-dal: '${key}' is not a writable column`);
    return this.raw(bindValue(table, key, spec, v), CAST[spec.kind]);
  }
}

/** `INSERT INTO "<table>" (…) VALUES (…) <tail>` from the row's defined keys. */
function insertSql(table: HouseTable, row: Record<string, unknown>, p: Params, tail = "RETURNING *"): string {
  const cols: string[] = [];
  const vals: string[] = [];
  for (const [k, v] of Object.entries(row)) {
    if (v === undefined) continue;
    vals.push(p.col(table, k, v));
    cols.push(`"${(TABLE_COLUMNS[table] as Record<string, ColumnSpec>)[k].col}"`);
  }
  return `INSERT INTO "${table}" (${cols.join(", ")}) VALUES (${vals.join(", ")}) ${tail}`;
}

/**
 * `UPDATE "<table>" SET … WHERE … RETURNING …`.
 *
 * ⭐ THE ONE PLACE `"updatedAt" = now()` IS WRITTEN (CC-24): appended for every table whose
 * column map has `updatedAt`, because `@updatedAt` never fires for raw SQL. A hand-written SET
 * list that forgot it would leave the column frozen at insert time with nothing going red.
 */
function updateSql(table: HouseTable, sets: readonly string[], where: string,
  opts: { with?: string; from?: string; returning?: string } = {}): string {
  const all = "updatedAt" in TABLE_COLUMNS[table] ? [...sets, `"updatedAt" = now()`] : [...sets];
  return `${opts.with ? `WITH ${opts.with} ` : ""}UPDATE "${table}" SET ${all.join(", ")}`
    + `${opts.from ? ` FROM ${opts.from}` : ""} WHERE ${where} RETURNING ${opts.returning ?? `"${table}".*`}`;
}

/** SET fragments for a patch, refusing any key outside `allow` (the writable-column law). */
function patchSets(table: HouseTable, patch: Record<string, unknown>, allow: readonly string[], p: Params): string[] {
  const sets: string[] = [];
  for (const [k, v] of Object.entries(patch)) {
    if (!allow.includes(k)) throw new Error(`house-bot-dal: '${k}' is not a writable column`);
    if (v === undefined) continue;
    sets.push(`"${k}" = ${p.col(table, k, v)}`);
  }
  return sets;
}

/** Throw on a patch key outside `allow` — the memory half of `patchSets`, same message. */
function assertWritable(table: HouseTable, patch: Record<string, unknown>, allow: readonly string[]): void {
  for (const [k, v] of Object.entries(patch)) {
    if (!allow.includes(k)) throw new Error(`house-bot-dal: '${k}' is not a writable column`);
    if (v === undefined) continue;
    bindValue(table, k, (TABLE_COLUMNS[table] as Record<string, ColumnSpec>)[k], v);
  }
}

function pc(): PrismaClient {
  const c = prisma();
  if (!c) throw new Error("house-bot-dal: DATABASE_URL required");
  return c;
}

type Db = Pick<PrismaClient, "$queryRawUnsafe" | "$executeRawUnsafe">;
const q = (tx?: HouseTx): Db => tx ?? pc();

/** Run `fn` on the caller's transaction, or open one when there is none. */
function inTx<T>(tx: HouseTx | undefined, fn: (t: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return tx ? fn(tx) : pc().$transaction((t) => fn(t));
}

// ---------------------------------------------------------------------------
// Row mappers — one mapper serves Prisma delegate rows and raw rows alike
// ---------------------------------------------------------------------------

function iso(d: Date): string;
function iso(d: Date | string | null | undefined): string | null;
function iso(d: Date | string | null | undefined): string | null {
  if (d == null) return null;
  return (d instanceof Date ? d : new Date(d)).toISOString();
}
/** BIGINT arrives as JS bigint from raw SQL; every house value is ≤ 1e9, so Number is exact. */
const big = (x: unknown): number | null => (x == null ? null : Number(x));
const int = (x: unknown): number | null => (x == null ? null : Number(x));

/* eslint-disable @typescript-eslint/no-explicit-any */
function toHouseBot(r: any): StoredHouseBot {
  return {
    id: r.id,
    userId: r.userId,
    label: r.label,
    labelKey: r.labelKey,
    note: r.note ?? null,
    status: r.status,
    pauseReason: r.pauseReason ?? null,
    pauseDetail: r.pauseDetail ?? null,
    pausedFromStatus: r.pausedFromStatus ?? null,
    passwordFingerprint: r.passwordFingerprint,
    verifiedAt: iso(r.verifiedAt),
    verifiedById: r.verifiedById,
    credentialChangedAt: iso(r.credentialChangedAt),
    credentialChangedVia: r.credentialChangedVia ?? null,
    consentVoidAt: iso(r.consentVoidAt),
    consentVoidCause: r.consentVoidCause ?? null,
    designatedAt: iso(r.designatedAt),
    designatedById: r.designatedById,
    removedAt: iso(r.removedAt),
    removedById: r.removedById ?? null,
    removedCause: r.removedCause ?? null,
    removedReason: r.removedReason ?? null,
    rules: r.rules,
    rulesVersion: Number(r.rulesVersion),
    stakeMinTzs: big(r.stakeMinTzs),
    stakeMaxTzs: big(r.stakeMaxTzs),
    capPerMarketTzs: big(r.capPerMarketTzs),
    capDailyStakeTzs: big(r.capDailyStakeTzs),
    capDailyLossTzs: big(r.capDailyLossTzs),
    capOpenExposureTzs: big(r.capOpenExposureTzs),
    balanceFloorTzs: big(r.balanceFloorTzs),
    freqMinGapSec: int(r.freqMinGapSec),
    freqMaxPerHour: int(r.freqMaxPerHour),
    freqMaxPerDay: int(r.freqMaxPerDay),
    freqMaxPerMarket: int(r.freqMaxPerMarket),
    capStaffChosenPerDay: int(r.capStaffChosenPerDay),
    capStaffChosenDailyTzs: big(r.capStaffChosenDailyTzs),
    targetsMaxActive: int(r.targetsMaxActive),
    createdAt: iso(r.createdAt),
    updatedAt: iso(r.updatedAt),
  };
}

function toHouseBotControl(r: any): StoredHouseBotControl {
  return {
    id: r.id,
    enabled: r.enabled === true,
    switchedAt: iso(r.switchedAt),
    switchedById: r.switchedById ?? null,
    switchedReason: r.switchedReason ?? null,
    offCause: r.offCause ?? null,
    limitsVersion: Number(r.limitsVersion),
    limitsSchemaVersion: Number(r.limitsSchemaVersion),
    gCapDailyStakeTzs: big(r.gCapDailyStakeTzs),
    gCapDailyLossTzs: big(r.gCapDailyLossTzs),
    gCapOpenExposureTzs: big(r.gCapOpenExposureTzs),
    gCapPerMarketTzs: big(r.gCapPerMarketTzs),
    gMaxBetsPerMinute: int(r.gMaxBetsPerMinute),
    gMaxBetsPerDay: int(r.gMaxBetsPerDay),
    gCounterPerPlayerPerDay: int(r.gCounterPerPlayerPerDay),
    gCounterPerPlayerTzsPerDay: big(r.gCounterPerPlayerTzsPerDay),
    maxDesignatedBots: Number(r.maxDesignatedBots),
    bellAlertsPerHour: Number(r.bellAlertsPerHour),
    gCapStaffChosenPerDay: int(r.gCapStaffChosenPerDay),
    gCapStaffChosenDailyTzs: big(r.gCapStaffChosenDailyTzs),
    gTargetsMaxActive: int(r.gTargetsMaxActive),
    gStaffChosenMaxCounterpartyShare: int(r.gStaffChosenMaxCounterpartyShare),
    createdAt: iso(r.createdAt),
    updatedAt: iso(r.updatedAt),
  };
}

function toHouseBotRuntime(r: any): StoredHouseBotRuntime {
  return {
    key: r.key,
    hourKey: r.hourKey ?? null,
    countInHour: Number(r.countInHour),
    rateLimitedHourKey: r.rateLimitedHourKey ?? null,
    rateLimitedCount: Number(r.rateLimitedCount),
    sweepPlacedAt: iso(r.sweepPlacedAt),
    sweepPositionId: r.sweepPositionId ?? null,
    scopeFrom: iso(r.scopeFrom),
    errorStreak: Number(r.errorStreak),
    transientSince: iso(r.transientSince),
    boundsHash: r.boundsHash ?? null,
    exitConfigHash: r.exitConfigHash ?? null,
    rulesFutureSince: iso(r.rulesFutureSince),
    engineEnabled: r.engineEnabled ?? null,
    bootAt: iso(r.bootAt),
    beatAt: iso(r.beatAt),
    pollerErrorAt: iso(r.pollerErrorAt),
    pollerErrorCode: r.pollerErrorCode ?? null,
    pollerErrorStreak: Number(r.pollerErrorStreak),
    skewMs: int(r.skewMs),
    updatedAt: iso(r.updatedAt),
  };
}

function toHouseBotAlertOnce(r: any): StoredHouseBotAlertOnce {
  return {
    key: r.key,
    createdAt: iso(r.createdAt),
  };
}

function toHouseBotEvent(r: any): StoredHouseBotEvent {
  return {
    id: r.id,
    houseBotId: r.houseBotId ?? null,
    userId: r.userId ?? null,
    marketId: r.marketId ?? null,
    kind: r.kind,
    fromStatus: r.fromStatus ?? null,
    toStatus: r.toStatus ?? null,
    reason: r.reason ?? null,
    actorId: r.actorId ?? null,
    payload: r.payload ?? null,
    auditId: r.auditId ?? null,
    createdAt: iso(r.createdAt),
  };
}

function toHouseBotIntent(r: any): StoredHouseBotIntent {
  return {
    id: r.id,
    houseBotId: r.houseBotId,
    botUserId: r.botUserId,
    kind: r.kind,
    anchorKey: r.anchorKey,
    marketId: r.marketId,
    productLine: r.productLine,
    triggerPositionId: r.triggerPositionId ?? null,
    triggerUserId: r.triggerUserId ?? null,
    targetId: r.targetId ?? null,
    requestedById: r.requestedById ?? null,
    entryCondition: r.entryCondition ?? null,
    side: r.side,
    stakeTzs: Number(r.stakeTzs),
    dueAt: iso(r.dueAt),
    deadlineAt: iso(r.deadlineAt),
    staleAt: iso(r.staleAt),
    status: r.status,
    reasonCode: r.reasonCode ?? null,
    why: r.why ?? null,
    decision: r.decision ?? {},
    attempts: Number(r.attempts),
    transientAttempts: Number(r.transientAttempts),
    nextAttemptAt: iso(r.nextAttemptAt),
    claimedBy: r.claimedBy ?? null,
    claimedUntil: iso(r.claimedUntil),
    positionId: r.positionId ?? null,
    idempotencyKey: r.idempotencyKey,
    finishedAt: iso(r.finishedAt),
    alertedAt: iso(r.alertedAt),
    createdAt: iso(r.createdAt),
  };
}

function toHouseBotTarget(r: any): StoredHouseBotTarget {
  return {
    id: r.id,
    houseBotId: r.houseBotId,
    marketId: r.marketId,
    productLine: r.productLine,
    status: r.status,
    delayMinSec: Number(r.delayMinSec),
    delayMaxSec: Number(r.delayMaxSec),
    timingFrom: r.timingFrom,
    reactTo: r.reactTo,
    createdAt: iso(r.createdAt),
    effectiveFrom: iso(r.effectiveFrom),
    createdById: r.createdById,
    updatedAt: iso(r.updatedAt),
    updatedById: r.updatedById,
    version: Number(r.version),
    endedAt: iso(r.endedAt),
    endCause: r.endCause ?? null,
    removedAt: iso(r.removedAt),
    removedById: r.removedById ?? null,
    snapshot: r.snapshot,
  };
}

function toHouseBotPress(r: any): StoredHouseBotPress {
  return {
    id: r.id,
    actorId: r.actorId,
    submitId: r.submitId,
    purpose: r.purpose,
    houseBotId: r.houseBotId,
    marketId: r.marketId ?? null,
    targetId: r.targetId ?? null,
    intentId: r.intentId ?? null,
    state: r.state,
    code: r.code ?? null,
    reason: r.reason ?? null,
    auditId: r.auditId ?? null,
    auditClaimUntil: iso(r.auditClaimUntil),
    createdAt: iso(r.createdAt),
    updatedAt: iso(r.updatedAt),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// Store interfaces
// ---------------------------------------------------------------------------
//
// Every conditional write returns null, false, 0 or [] exactly where Postgres returns no rows,
// and the memory twin mirrors the predicate. A `tx` joins the caller's lock transaction; without
// one the statement autocommits.

/**
 * The TERMINAL off cause (F2). Spelled once, typed as `OffCause`, and used by both `markSunset` twins and by
 * their predicates — so if the string ever left `OFF_CAUSES` (or the CHECK that mirrors it), this file stops
 * compiling instead of writing a cause the database refuses at run time.
 */
const SUNSET_CAUSE: OffCause = "SUNSET";

export interface HouseBotControlStore {
  /** Fresh read of the `global` row. A missing row throws `HouseSchemaNotReady`. */
  get(tx?: HouseTx): Promise<StoredHouseBotControl>;
  /**
   * A9 step 1: OFF, written FIRST, in autocommit, under no lock — so a hung bet can never delay
   * it. Conditional on the switch being ON: null means it was already off, and the caller writes
   * no second SWITCH_OFF event (two workers faulting at once produce one).
   */
  switchOff(input: { cause: OffCause; byId: string | null; reason: string | null }): Promise<StoredHouseBotControl | null>;
  /**
   * F2 SUNSET: OFF with the TERMINAL cause, written in autocommit under no lock.
   *
   * ⛔ NOT `switchOff({ cause: "SUNSET" })`, AND THAT IS THE WHOLE REASON THIS MEMBER EXISTS. `switchOff` is
   * conditional on `"enabled" = true`, and that predicate is load-bearing: it is what makes two workers faulting
   * at once write ONE event and one alert, and `kill-switch.ts` depends on the null to return ALREADY_OFF. On
   * today's SHIPPED state the control row is `enabled BOOLEAN NOT NULL DEFAULT false` and was inserted with its
   * defaults, so the desk is OFF with `offCause` NULL — and `switchOff` there matches NOTHING. A sunset run
   * through it would remove every bot and end every target while leaving no terminal marker, `switch-on.ts`'s
   * WITHDRAWN refusal would never fire, and any admin could switch a stripped desk back on.
   *
   * Conditional on `"offCause" IS DISTINCT FROM 'SUNSET'` instead, so it lands from EITHER starting state (ON,
   * or OFF for any other cause) and a second run changes nothing and returns null. ⛔ The memory twin mirrors
   * that predicate exactly — `IS DISTINCT FROM` is true for a NULL `offCause`, which is precisely the shipped
   * state it has to move.
   *
   * ⛔ IRREVERSIBLE BY DESIGN. There is no member that clears `offCause = 'SUNSET'`: the state this writes is
   * the one state `switchOnHouseBots` refuses (`switch-on.ts`, code WITHDRAWN). Nothing here turns anything on.
   */
  markSunset(input: { byId: string | null; reason: string | null }): Promise<StoredHouseBotControl | null>;
  /**
   * ON, conditional on OFF; clears `offCause`. Null means it was already on. ⛔ The same transaction writes
   * `global.scopeFrom = now()` (04 A11, C4-SPEC ruling 92): a switch-on that left scope NULL would put every stake out
   * of scope, and one that left an old instant would replay history.
   */
  switchOn(input: { byId: string; reason: string | null }, tx?: HouseTx): Promise<StoredHouseBotControl | null>;
  /** CAS on `limitsVersion` (+1). Only `LIMIT_FIELDS` are writable; anything else throws. */
  saveLimits(baseVersion: number, patch: HouseBotLimitsPatch, tx?: HouseTx): Promise<CasResult<StoredHouseBotControl>>;
}

export interface HouseBotStore {
  /**
   * One transaction: the bot as PAUSED(NEW), its `bot:<id>` runtime row (scope NULL — nothing in
   * scope until Start), and the DESIGNATED event. A live-uniqueness clash rethrows the raw error;
   * the caller names it with `uniqueViolation`.
   */
  designate(input: { bot: NewHouseBot; event: { actorId: string | null; reason: string | null; payload: Record<string, unknown> | null } }, tx?: HouseTx): Promise<StoredHouseBot>;
  get(id: string, tx?: HouseTx): Promise<StoredHouseBot | null>;
  /** The account's non-REMOVED bot, if any — one indexed read for the holder hook. */
  findLiveByUserId(userId: string, tx?: HouseTx): Promise<StoredHouseBot | null>;
  /** Every designation of the account, REMOVED included, newest first (erasure, data rights). */
  listByUserId(userId: string, tx?: HouseTx): Promise<StoredHouseBot[]>;
  /** Every non-REMOVED bot, oldest designation first. */
  listNonRemoved(tx?: HouseTx): Promise<StoredHouseBot[]>;
  countLive(tx?: HouseTx): Promise<number>;
  /** Status move conditional on `from`. A removal stamps `removedAt` on the database clock. */
  setStatus(id: string, input: SetStatusInput, tx?: HouseTx): Promise<StoredHouseBot | null>;
  /** CAS on `rulesVersion` (+1). Only `rules` and `BOT_CAP_FIELDS`; engine code never calls it. */
  saveRules(id: string, baseVersion: number, patch: HouseBotRulesPatch, tx?: HouseTx): Promise<CasResult<StoredHouseBot>>;
  /**
   * Re-verify: new fingerprint, the credential change and `pausedFromStatus` cleared. Paused bots only.
   * ⛔ `verifiedAt` is the caller's CHECK time (taken before the password was checked), never the write
   * time: a void or a responsible-gambling episode that lands while the owner types is then later than it,
   * so it still stands (review MC-1/LI-3).
   */
  setVerified(id: string, input: { fingerprint: string; verifiedById: string; verifiedAt: string }, tx?: HouseTx): Promise<StoredHouseBot | null>;
  /** A password change seen while the bot is paused (02 §2.2). Paused bots only. Stamped on the lock-time clock. */
  setCredentialChanged(id: string, input: { via: CredentialChangedVia }, tx?: HouseTx): Promise<StoredHouseBot | null>;
  /**
   * Void consent (A3, C8). Null means consent is already void since the last verification. The stamp is
   * `GREATEST(clock_timestamp(), verifiedAt + 1 ms)`: taken when the lock is held (never the transaction's start),
   * and always later than the verification it voids (review MC-2).
   */
  setConsentVoid(id: string, cause: ConsentVoidCause, tx?: HouseTx): Promise<StoredHouseBot | null>;
  /**
   * The holder's own "stop" on a bot whose consent is already void for another cause (review LI-4): the standing
   * void's cause becomes HOLDER_WITHDREW — the one no detector clears. Null when no void stands or it already is.
   */
  upgradeConsentVoidCause(id: string, tx?: HouseTx): Promise<StoredHouseBot | null>;
  /**
   * Erasure (A5, R6): refuses while any bot of the account is not REMOVED and writes nothing.
   * Otherwise rewrites every label to "Erased <id tail>" (and its key, so a name-shaped label
   * cannot survive as the key) and every officer reason on the bots, their events and presses
   * to "[erased]".
   */
  pseudonymiseForUser(userId: string, tx?: HouseTx): Promise<
    { ok: true; bots: number; events: number; presses: number } | { ok: false; code: "house_bot_live"; botId: string }>;
}

export interface HouseBotRuntimeStore {
  get(key: string, tx?: HouseTx): Promise<StoredHouseBotRuntime | null>;
  /** INSERT … ON CONFLICT (key) DO UPDATE with the patch's columns; unknown keys throw. */
  upsert(key: string, patch: HouseBotRuntimePatch, tx?: HouseTx): Promise<StoredHouseBotRuntime>;
  /** Atomic `errorStreak + 1` on `global` (A10); returns the new streak. */
  bumpErrorStreak(): Promise<number>;
  /** An ok result: streak 0 and no transient run. */
  resetErrorStreak(): Promise<void>;
  /** The first transient failure of a run keeps its time (A10's 2-minute alert). */
  markTransient(): Promise<StoredHouseBotRuntime>;
  /** Atomic per-EAT-hour counter; the hour key is computed from DB `now()` (A24). */
  bumpHourCount(key: string): Promise<{ hourKey: string; count: number }>;
  /** The same shape for the rate-limited counter. */
  bumpRateLimited(key: string): Promise<{ hourKey: string; count: number }>;
  /** A heartbeat on the database clock (`beat:poller:<id>`, `beat:planner`). */
  beat(key: string, extra?: Pick<HouseBotRuntimePatch, "pollerErrorAt" | "pollerErrorCode" | "pollerErrorStreak" | "skewMs">): Promise<StoredHouseBotRuntime>;
  /** `engine:<INSTANCE_ID>`: whether the engine runs here, and the boot time (A23, A24). */
  boot(key: string, input: { engineEnabled: boolean }): Promise<StoredHouseBotRuntime>;
  /** Monotonic sweep watermark on `global`: moves only forward in `(placedAt, positionId)`. */
  advanceSweep(placedAt: string, positionId: string): Promise<boolean>;
  /** Scope starts now (A11) — in the same transaction as SWITCH_ON or STARTED. */
  setScopeFrom(key: string, tx?: HouseTx): Promise<StoredHouseBotRuntime>;
  /** Every `engine:%` and `beat:%` row (engine health, A23 "latest boot"). */
  listInstances(): Promise<StoredHouseBotRuntime[]>;
  /** Deletes per-instance rows not refreshed for 24 hours — INSTANCE_ID is new on every boot. */
  pruneInstanceRows(): Promise<number>;
  /** The database clock, for skew (A24). */
  dbClock(): Promise<{ nowMs: number }>;
}

/** `clock.ts`'s unit list under the name this store has always used. */
export type EatSuffixUnit = EatKeyUnit;

export interface HouseBotAlertOnceStore {
  /** Once-only claim: true for exactly one caller across every replica. */
  claim(key: string, tx?: HouseTx): Promise<boolean>;
  /** Gives a claim back when the send it guarded delivered nothing, so the next attempt tells someone (review LI-8). */
  release(key: string, tx?: HouseTx): Promise<void>;
  /**
   * `<prefix>:<EAT day|hour|month|minute>` with the suffix computed INSIDE the insert from DB
   * `now()` (A24, CC-23), so two replicas either side of midnight claim one row. ⛔ Never build
   * a suffixed key in JS and pass it to `claim`.
   */
  claimWithEatSuffix(prefix: string, unit: EatSuffixUnit, tx?: HouseTx): Promise<{ claimed: boolean; key: string }>;
  /** One purge batch (A20, P3); the caller loops until a batch comes back short. */
  purgeBatch(olderThanDays?: number, batch?: number): Promise<number>;
}

export interface HouseBotEventStore {
  /** Officer reasons go in `reason`, never in `payload` (INT-10). */
  append(e: NewHouseBotEvent, tx?: HouseTx): Promise<StoredHouseBotEvent>;
  /** Links an engine audit (A19); only an unlinked event is written. */
  setAuditId(id: string, auditId: string, tx?: HouseTx): Promise<boolean>;
  get(id: string, tx?: HouseTx): Promise<StoredHouseBotEvent | null>;
  /** One bot's history, newest first, keyset-paged. */
  listByBot(houseBotId: string, opts: { limit: number; cursor?: KeysetCursor | null; kinds?: readonly HouseBotEventKind[] }, tx?: HouseTx): Promise<Page<StoredHouseBotEvent>>;
  /** Events of the given kinds, newest first. */
  listByKinds(kinds: readonly HouseBotEventKind[], opts: { houseBotId?: string; userId?: string; marketId?: string; sinceIso?: string; limit: number }, tx?: HouseTx): Promise<StoredHouseBotEvent[]>;
  /** The events a target or cancel press wrote (`payload.pressId`), for the audit repair. */
  listForPress(press: Pick<StoredHouseBotPress, "id" | "houseBotId" | "createdAt">, tx?: HouseTx): Promise<StoredHouseBotEvent[]>;
  /**
   * ⭐ ONE DRAW PER MARKET (N1 §4.1). Inserts OPENER_SIDE_DRAWN unless one exists, and returns
   * the stored side either way (`drawn: false` when an earlier draw won). The DAL never
   * randomises: the caller passes the drawn side. Its own autocommit statement, never in a lock.
   */
  drawOpenerSide(input: { marketId: string; houseBotId: string | null; side: IntentSide; actorId: string | null; drawnFor: OpenerDrawnFor }): Promise<{ side: IntentSide; eventId: string; drawn: boolean }>;
  findOpenerDraw(marketId: string, tx?: HouseTx): Promise<StoredHouseBotEvent | null>;
  /**
   * ⭐ THE CONSOLE'S HISTORY TAB (C7 step 5, ruling 317). EVERY bot's events and the control row's together,
   * newest first, `offset`-paged for a numbered pager.
   * ⛔ IT IS NOT `listByBot` WITH A WIDER SCOPE AND IT IS NOT A CAPPED `listByKinds`. `listByBot` is keyset-paged,
   * and `Pagination` requires a `total` that a keyset reader structurally cannot give (ruling 317); a cap presented
   * as a page is a list that silently ends, and these events are the only durable record of who switched what.
   *
   * ⭐ `houseBotId` IS THE ACCOUNT PAGE'S OWN FACET (C7 step 5, the account half), AND IT IS A FACET OF THE SHARED
   * PREDICATE RATHER THAN A SECOND READER. The account page's history is the same list narrowed to one record and
   * it needs the same `total` for the same numbered pager, so narrowing `listByBot` would have meant a keyset
   * reader with no total — the exact shape ruling 317 refuses one paragraph above. ⛔ It narrows `countAll` by the
   * SAME word through the SAME predicate function (`memEventMatches` / `eventWhere`), which is what keeps the
   * badge, the total and the rows measuring one population (`test:dal-parity` 16.eventsShared, 16.eventsBot).
   * ⚠️ The control row's own events (`houseBotId: null` — SWITCH_ON, SWITCH_OFF, LIMITS_SAVED, SUNSET) fall OUT of
   * a narrowed read, and that is correct: they are the desk's events, not the account's.
   *
   * ⭐ `fromIso` IS THE ANCHOR'S FACET, AND IT EXISTS SO A BELL LANDS ON THE RIGHT PAGE. A delivered alert links to
   * `?tab=history&event=<id>`; under a NUMBERED pager that link can only be honoured by counting the rows at or
   * newer than that event and turning the rank into a page number. ⛔ That is a COUNT of the same population, which
   * is why the facet is a word of the shared predicate and not a second ordering: a rank measured over a different
   * condition from the rows is the 317 defect wearing a different hat. `>=`, matching `feedWhere`'s own `fromIso`
   * so the two panels resolve an anchor by one rule.
   */
  listAll(opts: { limit: number; offset?: number; kinds?: readonly HouseBotEventKind[]; houseBotId?: string; fromIso?: string; order?: EventListOrder }, tx?: HouseTx): Promise<StoredHouseBotEvent[]>;
  /**
   * That list's population, from ONE named predicate shared with `listAll` in each twin — `memEventMatches` in
   * memory, `eventWhere` on Postgres (ruling 317, pinned by `test:dal-parity` 16.eventsShared).
   * ⛔ A counting reader, never `listAll(...).length`: `pageLimit` clamps the page to 500 and the count must not be
   * clamped with it (ruling 344).
   */
  countAll(opts: { kinds?: readonly HouseBotEventKind[]; houseBotId?: string; fromIso?: string }, tx?: HouseTx): Promise<number>;
  /**
   * ⭐ STEP 9 · WHERE ONE EVENT STANDS in that population under a given order — its 1-based position, or `null` when it
   * is not in it. It is how a bell's `&event=` lands on the right page of a SORTED history: the default order keeps its
   * counting rank (`countAll` with `fromIso`), and any other order is ranked here, over the SAME predicate
   * (`memEventMatches` / `eventWhere`) and the SAME named order (`memEventOrder` / `eventOrderSql`) `listAll` pages by.
   */
  rankInAll(opts: { kinds?: readonly HouseBotEventKind[]; houseBotId?: string; fromIso?: string }, order: EventListOrder, id: string, tx?: HouseTx): Promise<number | null>;
}

export interface HouseBotIntentStore {
  /** Raw insert; a unique violation rethrows for `uniqueViolation`. */
  insert(row: NewHouseBotIntent, tx?: HouseTx): Promise<StoredHouseBotIntent>;
  /**
   * The sweep's and planner's insert: a clash on the row's OWN anchor index is "already decided" and returns null —
   * `hbi_counter_anchor_uq` for a COUNTER, `hbi_fill_opener_anchor_uq` for FILL and OPENER. ⛔ Any other unique
   * violation (the id, the idempotency key) is a defect and raises (C4-SPEC ruling 97, TGT-26(e)). MANUAL throws.
   */
  insertIgnoringConflict(row: NewHouseBotIntent, tx?: HouseTx): Promise<StoredHouseBotIntent | null>;
  /**
   * ⭐ THE INSERT HOLDS THE TARGET ROW (N2 §4 step 4.6). `FOR SHARE` on the target, then the
   * intent insert, in one transaction: a removal that commits first is always seen; one that
   * waits on the share lock sees the new reaction and becomes a veto.
   */
  insertTargetedIfActive(targetId: string, row: NewHouseBotIntent, tx?: HouseTx): Promise<{ inserted: boolean; targetActive: boolean; row: StoredHouseBotIntent | null }>;
  get(id: string, tx?: HouseTx): Promise<StoredHouseBotIntent | null>;
  /** The newest intent with this kind and anchor. */
  findByAnchor(kind: IntentKind, anchorKey: string, tx?: HouseTx): Promise<StoredHouseBotIntent | null>;
  /** PENDING or CLAIMED intents on a market (MARKET_HELD). */
  listLiveOnMarket(marketId: string, tx?: HouseTx): Promise<StoredHouseBotIntent[]>;
  countLiveForTarget(targetId: string, tx?: HouseTx): Promise<number>;
  countPlacedForTarget(targetId: string, tx?: HouseTx): Promise<number>;
  /**
   * R5 BOTH_SIDES (C4-SPEC ruling 106): the newest PLACED COUNTER whose trigger account is `userId` on this market —
   * "the house countered this account here" — through `HouseBotIntent_triggerUserId_createdAt_idx`. Null when none.
   */
  placedCounterFor(userId: string, marketId: string, tx?: HouseTx): Promise<StoredHouseBotIntent | null>;
  /** The poller's claim (N1 §4.3). `skewGuardMs` = max(0, skew) + 2 s (A24). */
  claimBatch(input: { me: string; freeSlots: number; skewGuardMs: number }): Promise<StoredHouseBotIntent[]>;
  /** The inline Enter now claim — no skew term, because `dueAt` is the database's own now(). */
  claimById(id: string, me: string): Promise<StoredHouseBotIntent | null>;
  heartbeat(id: string, me: string): Promise<boolean>;
  /**
   * The first money statement (PLAN H4). False means `house_intent_superseded`: the row was
   * cancelled, expired or placed by someone else. `counterparties` is MANUAL THIN's pro-rata
   * attribution, written in the same statement (N1 §3 H4).
   */
  markPlaced(id: string, positionId: string, tx: HouseTx, opts?: { counterparties?: ReadonlyArray<Record<string, unknown>> }): Promise<boolean>;
  /** Transient requeue (MON-10): `attempts` back, `transientAttempts` up. Null means no time is
   *  left before `staleAt` or the deadline, and the caller writes it terminal. */
  requeueTransient(id: string, me: string, backoffMs: number): Promise<StoredHouseBotIntent | null>;
  /** A rate-cap deferral: back to PENDING until `untilIso`, neither a failure nor transient. */
  defer(id: string, me: string, untilIso: string): Promise<StoredHouseBotIntent | null>;
  /** Terminal outcome for the row this worker claimed. */
  finish(id: string, me: string, input: { status: "SKIPPED" | "EXPIRED" | "FAILED" | "CANCELLED"; reasonCode: string; why?: string | null }): Promise<boolean>;
  /** The console cancel and the staff cancel: PENDING only (02 §3.9). */
  cancelPending(id: string, reasonCode: string, tx?: HouseTx): Promise<StoredHouseBotIntent | null>;
  /** Cancels every PENDING or CLAIMED row in exactly one scope (A9, auto-pause, Remove, target
   *  removal) and returns them. A later `markPlaced` on one of them returns false. */
  cancelLive(scope: { houseBotId: string } | { targetId: string } | { all: true }, reasonCode: string, tx?: HouseTx): Promise<StoredHouseBotIntent[]>;
  /** The write-back clamp (MON-02): shrink only, conditional on this worker's claim. */
  clampStake(id: string, me: string, stakeTzs: number): Promise<StoredHouseBotIntent | null>;
  /**
   * Planner pass 1: past `deadlineAt` → EXPIRED(CUTOFF) — PENDING rows, and CLAIMED rows whose claim has expired
   * (ENG-16: "an in-flight claim is never expired"; C4-SPEC ruling 72).
   */
  expirePastDeadline(): Promise<string[]>;
  /** Planner pass 2, before POISON: → EXPIRED(STALE) (N1 §4.3 pass order). */
  expireStale(): Promise<string[]>;
  /** Planner pass 3: an expired claim with 3 attempts → FAILED(POISON). */
  poison(): Promise<string[]>;
  /** Planner A16 sweep (C4-SPEC ruling 88): the distinct markets holding PENDING rows, oldest row first, at most `limit`. */
  listPendingMarketIds(limit: number): Promise<string[]>;
  /**
   * PENDING rows on one market → SKIPPED(`code`), conditional on PENDING; returns the ids. `automatedOnly` leaves MANUAL
   * and targeted rows alone (a reopened market: fire's blackout decides those).
   */
  skipPendingOnMarket(marketId: string, code: string, opts?: { automatedOnly?: boolean }): Promise<string[]>;
  /** Oversight (ruling 79): PLACED staff-chosen rows finished at or after `sinceIso`, oldest first, at most `limit`. */
  staffChosenPlacedSince(input: { sinceIso: string; limit: number }): Promise<StoredHouseBotIntent[]>;
  /** Hourly summaries (ruling 80): PLACED rows finished in `[fromIso, toIso)`, per bot, bots in id order. */
  placedInWindow(input: { fromIso: string; toIso: string }): Promise<PlacedInWindow[]>;
  /**
   * SIGTERM (A24, C4-SPEC ruling 70): this worker's CLAIMED rows, except `excludeIds` (the fires still in flight), back
   * to PENDING with the claim's attempt handed back. Conditional on the claim; returns the released ids.
   */
  releaseClaims(me: string, excludeIds: readonly string[]): Promise<string[]>;
  /** The A8 alert claim: true for exactly one sender. */
  markAlerted(id: string): Promise<boolean>;
  /** PLACED rows whose alert never went out, finished more than 30 s ago (A8). */
  listAlertRepair(limit: number): Promise<StoredHouseBotIntent[]>;
  /** Staff-chosen PLACED stakes (MANUAL or targeted) finished in `[fromIso, toIso)`. */
  staffChosenPlaced(input: { houseBotId: string | null; fromIso: string; toIso: string }, tx?: HouseTx): Promise<{ count: number; stakeTzs: number }>;
  /**
   * The same for ONE EAT day. With no `dayKey` it is the CURRENT day, each twin on its own clock — the memory
   * twin's `eatDayKey(Date.now())`, the Prisma twin's DB `now()` (N1 §2) — which is what the seam and
   * `cap-precheck` ask for at the moment they refuse a stake.
   * ⛔ `dayKey` IS FOR A READER THAT HAS ALREADY DERIVED ITS DAY (C7-SPEC ruling 348). The console derives the
   * EAT day ONCE per render and every figure on the page is measured over it; this read used to derive a SECOND
   * day of its own — a second `eatDayKey(Date.now())` in the memory twin and the DATABASE CLOCK in the Prisma
   * one — so across EAT midnight, or under app/DB clock skew, ONE card could show two days. Passing the render's
   * key removes the second derivation for that path. Both twins answer the same window for the same key, which
   * `test:dal-parity` holds.
   */
  staffChosenPlacedToday(input: { houseBotId: string | null; dayKey?: string }, tx?: HouseTx): Promise<{ count: number; stakeTzs: number }>;
  /** The activity feed, newest first, keyset-paged, and `offset`-paged for a numbered pager (C7, ruling 345). */
  listFeed(filter: IntentFeedFilter, tx?: HouseTx): Promise<Page<StoredHouseBotIntent>>;
  /**
   * ⭐ THE ACTIVITY FEED'S POPULATION (C7 step 5, ruling 345). The count badge on the `activity` tab and the
   * `total` its `AdminPagination` requires both come from here.
   * ⛔ IT SHARES ONE NAMED PREDICATE WITH `listFeed` IN EACH TWIN — `memFeedMatches` in memory, `feedWhere` on
   * Postgres (ruling 177's shape, pinned by `test:dal-parity` 16.feedShared). A count whose condition is written a
   * second time is a badge that can disagree with the rows underneath it on the same screen.
   * ⛔ AND IT IS A COUNTING READER, NEVER A PAGED ONE (ruling 344): `pageLimit` clamps every page to 500, so a
   * total assembled from `listFeed` rows is a confident wrong number that links a pager at pages nothing serves.
   */
  countFeed(filter: IntentFeedCount, tx?: HouseTx): Promise<number>;
  /**
   * ⭐ STEP 9 · WHERE ONE INTENT STANDS in the feed's population under a given order — its 1-based position, or `null`
   * when it is not in it. A bell's `&intent=` on a SORTED activity panel lands by this; the default order keeps its
   * counting rank. ⛔ SAME predicate (`memFeedMatches` / `feedWhere`) and SAME named order (`memFeedOrder` /
   * `feedOrderSql`) as `listFeed`, so the rank and the page it names cannot be measured over two different things.
   */
  rankInFeed(filter: IntentFeedCount, order: IntentFeedOrder, id: string, tx?: HouseTx): Promise<number | null>;
}

export interface HouseBotTargetStore {
  /** Hand-written insert: ACTIVE, version 1, and `createdAt`, `updatedAt` and `effectiveFrom`
   *  from DB `now()` (N2 §2). `hbt_active_market_uq` rethrows. */
  insert(row: NewHouseBotTarget, tx?: HouseTx): Promise<StoredHouseBotTarget>;
  get(id: string, tx?: HouseTx): Promise<StoredHouseBotTarget | null>;
  /** The in-lock re-read of N2 §6 step 2. */
  getForUpdate(id: string, tx: HouseTx): Promise<StoredHouseBotTarget | null>;
  /** CAS on `version` (+1) for an ACTIVE target; only the timing fields are writable. */
  casUpdate(id: string, baseVersion: number, patch: TargetTimingPatch, byId: string, tx?: HouseTx): Promise<CasResult<StoredHouseBotTarget>>;
  /** ACTIVE → REMOVED (a removal with no live reaction, N2 §6). */
  remove(id: string, byId: string, tx?: HouseTx): Promise<StoredHouseBotTarget | null>;
  /** ACTIVE → ENDED(cause). */
  endActive(targetId: string, cause: TargetEndCause, tx?: HouseTx): Promise<StoredHouseBotTarget | null>;
  /** Every ACTIVE target of a bot → ENDED(cause): consent void, Remove, sunset (N2 §4). */
  endAllForBot(houseBotId: string, cause: TargetEndCause, tx?: HouseTx): Promise<StoredHouseBotTarget[]>;
  /**
   * A veto (N1 §6 staff cancel step 3): ACTIVE → ENDED(VETOED), or ENDED with another cause →
   * VETOED keeping its `endedAt`. Returns the cause it replaced; null when REMOVED or already
   * vetoed.
   */
  veto(targetId: string, tx?: HouseTx): Promise<{ row: StoredHouseBotTarget; previousEndCause: TargetEndCause | null } | null>;
  /** The Targets tab: newest first, 20 by default, keyset-paged — or `offset`-skipped for a numbered pager. */
  listForBot(botId: string, status: TargetListStatus, cursor: KeysetCursor | null, opts?: { limit?: number; offset?: number; order?: TargetListOrder }, tx?: HouseTx): Promise<Page<StoredHouseBotTarget>>;
  /**
   * ⛔ THE COUNTING READER THE TARGETS PAGER NEEDS, AND WHY IT IS A SECOND MEMBER RATHER THAN A FIELD ON THE PAGE.
   * `AdminPagination` needs a REAL total to draw "page 3 of 9", and `pageLimit` clamps every list reader in this
   * DAL at 500 rows — so a total taken from `listForBot` would read 500 for ever on the day an account passes it,
   * and the pager would silently stop at a page that is not the last. This counts the whole filtered set, in one
   * statement, and returns no row to anybody.
   * ⚠️ `countActive` is NOT this: it counts ACTIVE targets only (and across all accounts when `botId` is omitted),
   * while the Targets tab lists `all` — every target the account has ever had, which is the set that grows.
   */
  countForBot(botId: string, status: TargetListStatus, tx?: HouseTx): Promise<number>;
  /** ACTIVE targets, optionally only those created at or before a pass's DB now (N2 §4). */
  listActive(opts?: { createdAtOrBefore?: string }, tx?: HouseTx): Promise<StoredHouseBotTarget[]>;
  activeForMarket(marketId: string, tx?: HouseTx): Promise<StoredHouseBotTarget | null>;
  /** ⛔ The never-retarget rule: true once any target on the poll was REMOVED or VETOED. */
  everStopped(marketId: string, tx?: HouseTx): Promise<boolean>;
  /* ⛔ `lastStoppedAt` WAS HERE AND IS DELETED (replan ruling 504, decided at C7 step 4). It had ZERO occurrences
   * anywhere outside this file — no `src/` caller, no behavioural case, and no entry in `dal-parity`'s own sealed
   * list — while `everStopped`, the predicate the never-retarget rule actually decides on, has both twins and two
   * cases. 504 gave step 4 one choice: call it by name with a behavioural case, or delete it from the interface and
   * both twins with its name in `dal-parity.test.mts`'s `NEVER` array. The console cannot be the caller that saves
   * it: the figure is PER MARKET, so a targets panel would have to issue one read per row on a page render, which is
   * the per-bot loop ruling 351 refuses in as many words. Ruling 350 had already put it in its NOT-NEEDED half.
   * A paged house READ wired into both twins with no consumer is ruling 259's own shape. */
  countActive(input: { botId?: string }, tx?: HouseTx): Promise<number>;
}

export interface HouseBotPressStore {
  /** Press flow step 2. A repeat of the same `(actorId, submitId)` returns the existing row;
   *  any other violation rethrows. */
  insertChecking(row: NewHouseBotPress, tx?: HouseTx): Promise<{ ok: true; row: StoredHouseBotPress } | { ok: false; existing: StoredHouseBotPress }>;
  get(id: string, tx?: HouseTx): Promise<StoredHouseBotPress | null>;
  findByActorSubmit(actorId: string, submitId: string, tx?: HouseTx): Promise<StoredHouseBotPress | null>;
  /** CHECKING → REFUSED(code). */
  refuse(id: string, code: string, tx?: HouseTx): Promise<StoredHouseBotPress | null>;
  /** CHECKING → QUEUED with its intent; null means roll the queue transaction back. */
  queue(id: string, intentId: string, tx: HouseTx): Promise<StoredHouseBotPress | null>;
  /** An Enter now press whose intent is terminal: QUEUED → DONE. Repeats are no-ops. */
  doneEnterNow(intentId: string, tx?: HouseTx): Promise<StoredHouseBotPress | null>;
  /** A target or cancel press, inside its write transaction: CHECKING → DONE. */
  doneInTx(id: string, tx: HouseTx, patch?: { targetId?: string | null }): Promise<StoredHouseBotPress | null>;
  /** Planner press pass: every QUEUED press whose intent is terminal → DONE. */
  doneTerminalQueued(): Promise<string[]>;
  /** Planner: a press still CHECKING 120 s after it was created → REFUSED(INTERRUPTED). */
  interruptStale(): Promise<string[]>;
  /** The audit lease (press flow step 6). Append the audit only when a row returns. */
  claimAuditLease(id: string): Promise<StoredHouseBotPress | null>;
  setAuditId(id: string, auditId: string): Promise<boolean>;
  /** Presses the planner must audit (press flow step 6, sealed scope). */
  listAuditRepair(limit: number): Promise<StoredHouseBotPress[]>;
  /** The R1 register, newest first, keyset-paged. */
  listRegister(filter: PressRegisterFilter, tx?: HouseTx): Promise<Page<StoredHouseBotPress>>;
}

export interface HouseBookStore {
  /** Raw per-bot sums for positions placed in `[fromIso, toIso)`; a null bot means every bot. */
  dayRows(input: { fromIso: string; toIso: string; houseBotId: string | null }, tx?: HouseTx): Promise<HouseBookRawRow[]>;
  /** Open stake per bot right now. */
  openExposure(houseBotId: string | null, tx?: HouseTx): Promise<Array<{ houseBotId: string; openStakeTzs: number }>>;
  /**
   * Open house stake per MARKET right now, with how many distinct bots hold it — ordered by `marketId`.
   *
   * ⛔ A DIFFERENT POPULATION FROM `openExposure`, NOT A RELABELLING OF IT. That one groups by BOT and
   * `HouseMarketUsage` covers ONE market, so F2's audit payload key `openExposureByMarket` (already allowlisted
   * in `HOUSE_AUDIT_PAYLOAD_KEYS`) and FS-06's "TZS X across N markets" alert have no number behind them today.
   * The two answers differ whenever one bot stakes two markets or two bots stake one, which is why the suite
   * asserts they DIFFER on the same fixture: otherwise this could be the old member wearing a new name.
   *
   * ⛔ ONE STATEMENT FOR THE WHOLE BOOK, never a per-market loop — the seam's shape rule, and the reason
   * `Position_marketId_marked_idx` exists. `bots` is `count(DISTINCT "houseBotId")`, so a market one bot staked
   * three times reads 1.
   */
  openExposureByMarket(tx?: HouseTx): Promise<Array<{ marketId: string; openStakeTzs: number; bots: number }>>;
}

/** One bot's PLACED rows in a window (hourly summaries, C4-SPEC ruling 80). Staff-chosen = MANUAL or targeted. */
export type PlacedInWindow = { houseBotId: string; count: number; stakeTzs: number; staffChosenCount: number; staffChosenTzs: number };

export type PlannableMarketsInput = {
  kind: "FILL" | "OPENER";
  productLine: "MARKET" | "UPDOWN";
  fromIso: string;
  toIso: string | null;
  after: { cutoff: string; id: string } | null;
  limit: number;
};

/** One sweep candidate (C4-SPEC ruling 104). Only what a trigger decision reads (I2); no market row. */
export type TriggerRow = { id: string; userId: string; marketId: string; side: IntentSide; stake: number; placedAt: string; status: string };

export type TriggerPageInput = {
  fromIso: string;
  beforeIso: string;
  after: { placedAt: string; id: string } | null;
  limit: number;
};

/** The trigger filter's facts about the staking account (PLAN §4.3; C4-SPEC ruling 36). */
export type TriggerAccount = { role: string; recruitedBy: string | null; penaltyToday: boolean };

/** One bot's marked stakes, for the H2 rate and per-market caps (04 A24: rolling windows). */
export type HouseBotUsage = {
  /** The newest marked position of this bot, any market (MIN_GAP). */
  lastPlacedAt: string | null;
  /** Marked positions of this bot placed in the last 3,600 s / 86,400 s (PER_HOUR, PER_DAY). */
  placedLastHour: number;
  placedLastDay: number;
  /** This bot's marked positions on this market, any status (PER_MARKET_COUNT), and their stake (PER_MARKET). */
  countOnMarket: number;
  stakeOnMarket: number;
};

/** Every bot's marked stakes on one market (H3). */
export type HouseMarketUsage = {
  /** Another bot holds an OPEN marked position here (OTHER_BOT, PLAN I3). */
  otherBotOpen: boolean;
  /** All bots' OPEN marked stake here (GLOBAL_PER_MARKET). */
  houseOpenStakeTzs: number;
};

/** Every bot's marked positions in rolling windows (H4 GLOBAL_BETS_PER_MINUTE / _PER_DAY). */
export type HouseGlobalUsage = { betsLastMinute: number; betsLastDay: number };

/**
 * One bot's MARKET-FREE rate usage — the same rolling windows `botUsage` counts, without a market (C7-SPEC ruling 351).
 *
 * ⛔ WHY IT IS NOT `botUsage` WITH AN OPTIONAL MARKET. `botUsage`'s `marketId` stays REQUIRED and undefaulted: a caller
 * with no market would read `countOnMarket: 0` and `stakeOnMarket: 0`, which are the PER_MARKET and PER_MARKET_COUNT
 * gate figures, so an optional market would turn a gate reader into one that waves a stake through.
 */
export type HouseBotRateUsage = {
  houseBotId: string;
  /** Marked positions of this bot placed in the last 3,600 s / 86,400 s, on the DATABASE clock. */
  placedLastHour: number;
  placedLastDay: number;
  /** The newest marked position of this bot, any market, any day. `null` when it has never placed. */
  lastPlacedAt: string | null;
};

/** What house stakes have been set against one player today (H4 COUNTERPARTY_COUNT / _TZS). */
export type CounterpartyToday = { userId: string; count: number; tzs: number };

/** One side of `lockedForHouse` (N1 §4.1). Ids appear only in `accounts`. */
export type LockedPoolSide = {
  /** The market row's raw pool on this side, house money included. */
  raw: number;
  /** Every OPEN unmarked stake. */
  nonHouse: number;
  /** Eligible stakes whose exit closed at least LOCK_MARGIN_MS ago. */
  locked: number;
  /** Eligible stakes not yet past the margin. */
  unlocked: number;
  /** Earliest `exitCloseAt + LOCK_MARGIN_MS` among eligible unlocked stakes. */
  earliestLockAt: string | null;
  /** OPEN unmarked stakes of ineligible accounts. */
  excluded: number;
  /** Every OPEN unmarked stake whose exit has closed — no filter, no margin (A15, untargeted COUNTER only). */
  lockedA15: number;
  /** The top eligible account plus every eligible account holding ≥ 25% of `locked`, largest first. */
  accounts: Array<{ userId: string; lockedTzs: number }>;
};
export type LockedPool = { YES: LockedPoolSide; NO: LockedPoolSide };

/** One Up & Down round as the engine may see it (04 A13). */
export type HouseViewRound = {
  roundId: string;
  chainId: string;
  /** `<assetId>:<durationMinutes>`, the rules' chain key — the asset's ID, never its symbol (C4-SPEC rulings 45, 99). */
  chainKey: string;
  roundNumber: number;
  opensAt: string;
  durationMinutes: number;
  openPrice: number | null;
  upTarget: number | null;
  downTarget: number | null;
  chainRunning: boolean;
  assetEnabled: boolean;
};

/** The engine's one market read (04 A13): `HOUSE_MARKET_FIELDS`, and the round columns when a round exists. */
export type HouseMarketViewRow = {
  id: string;
  /** RAW — `market-dal` coerces anything but UPDOWN to MARKET, which A12 must not trust. */
  productLine: string;
  category: string;
  status: string;
  yesPool: number;
  noPool: number;
  selectionClosedAt: string | null;
  resolutionAt: string;
  createdAt: string;
  titleEn: string;
  /** Frozen exit rates in minutes, resolved from the fee snapshot (legacy rows included). */
  exitGraceMin: number;
  exitPaidMin: number;
  reopenedAt: string | null;
  round: HouseViewRound | null;
};

/** The columns the information blackout reads (N1 §3) — and nothing else. */
export type HouseBlackoutRow = {
  status: string;
  sentinelOutcome: string | null;
  sentinelConfidence: number | null;
  sentinelDetermined: boolean | null;
  sentinelClosedAt: string | null;
  resolvedOutcome: string | null;
  resolutionStage1By: string | null;
  resolveClaimedAt: string | null;
  reopenedAt: string | null;
};

/**
 * ⭐ THE MONEY SEAM'S READS (build commit 2). Every cap the seam enforces inside the bet's locks reads
 * here, on the lock's transaction, so the two stores give the same answer to the same question.
 * ⛔ PLAIN SELECTs ONLY (04 A9): no FOR UPDATE and no write, so a house bet never holds a row lock a
 * player's bet could queue behind. The single write-shaped member is `revertPlacedInMemory`, which
 * exists only because the memory store has no rollback.
 */
export interface HouseSeamStore {
  botUsage(input: { houseBotId: string; marketId: string }, tx?: HouseTx): Promise<HouseBotUsage>;
  marketUsage(input: { houseBotId: string; marketId: string }, tx?: HouseTx): Promise<HouseMarketUsage>;
  globalUsage(tx?: HouseTx): Promise<HouseGlobalUsage>;
  /**
   * ⭐ C7 STEP 4 (C7-SPEC ruling 351). Every bot's market-free rate usage in ONE statement, ordered by `houseBotId`:
   * one bot's (`houseBotId`), or every bot's (`null`). The console's per-account count rows ("bets this hour",
   * "bets today") and its "Last bet" column read this.
   * ⛔ ONE STATEMENT FOR THE WHOLE ROSTER, never a per-bot LOOP of `botUsage` calls — `openExposure(null)` and
   * `dayRows({houseBotId: null})` already set that shape, and a loop on a page render is N reads for one answer.
   * ⛔ AND NEVER `placedTimes(...).length`: BOTH twins of that member are unbounded (the memory twin collects every
   * matching instant into an array and sorts it; the Prisma twin is `SELECT "placedAt" … ORDER BY … DESC` with NO
   * `LIMIT`), so `.length` as a count is an unbounded row read on a page render.
   */
  botRateUsage(input: { houseBotId: string | null }, tx?: HouseTx): Promise<HouseBotRateUsage[]>;
  /**
   * The placement instants of marked positions in the last `withinSec` seconds (1–86,400) on the database clock,
   * newest first: one bot's (`houseBotId`), or every bot's (null). The Enter now rate facts (N1 §4.2 step 11) read
   * the same rolling windows H2's `botUsage` and H4's `globalUsage` count, as instants rather than counts.
   */
  placedTimes(input: { houseBotId: string | null; withinSec: number }, tx?: HouseTx): Promise<string[]>;
  /** PLACED COUNTER rows keyed on each player, plus PLACED MANUAL rows attributing a share to them,
   *  finished in the current EAT day (from DB `now()`). A player with none is returned with zeros. */
  counterpartyToday(userIds: readonly string[], tx?: HouseTx): Promise<CounterpartyToday[]>;
  /**
   * `lockedForHouse` (N1 §4.1) — ONE statement. `graceMs`/`paidMs`/`closesAt` come from the market's frozen
   * rates in JS, so the SQL never re-implements the fee-snapshot fallback. `asOf` replaces the clock term
   * (only the targeted COUNTER's decision-time cut passes it); otherwise the DATABASE clock, never `now()`.
   */
  lockedPool(input: { marketId: string; graceMs: number; paidMs: number; closesAt: string; asOf?: string | null }, tx?: HouseTx): Promise<LockedPool>;
  blackoutRow(marketId: string, tx?: HouseTx): Promise<HouseBlackoutRow | null>;
  /** The RAW product line — `market-dal` coerces anything but UPDOWN to MARKET, which A12 must not trust. */
  rawProductLine(marketId: string, tx?: HouseTx): Promise<string | null>;
  /** A12: the Up & Down round's open time and its chain's duration, in one statement; null when no round. */
  roundLock(marketId: string, tx?: HouseTx): Promise<{ opensAt: string; durationMinutes: number } | null>;
  /**
   * 04 A13: the engine's ONE market read — exactly `HOUSE_MARKET_FIELDS` (`server/house-bot/market-view.ts`) plus
   * the round, its chain's duration and state and its asset's id and switch, in one statement. The product line
   * is raw; the exit rates come from the frozen fee snapshot. ⛔ No result-check column is selected.
   */
  marketView(marketId: string, tx?: HouseTx): Promise<HouseMarketViewRow | null>;
  /**
   * The planner's FILL/OPENER scan (C4-SPEC ruling 91): `{id, cutoff}` of LIVE, not reopened, not demo markets of one
   * raw product line that are in A12 scope (a poll with a cutoff; a round on a RUNNING chain of an enabled asset),
   * with the cutoff in `(fromIso, toIso]` (`toIso` null = no upper bound), OPENER only on two empty pools, and no
   * intent of that kind anchored on the market unless CANCELLED by something other than an officer (02 X11).
   * Keyset-paged on `(cutoff, id)`; at most 200 rows. ⛔ Ids and cutoffs only — the planner reads each market through
   * `marketView` (A13).
   */
  plannableMarkets(input: PlannableMarketsInput, tx?: HouseTx): Promise<Array<{ id: string; cutoff: string }>>;
  /**
   * The sweep's keyset page (C4-SPEC rulings 103–104): unmarked positions on a LIVE market placed in `[fromIso,
   * beforeIso]`, after `after` in `(placedAt, id)`, that no COUNTER intent is anchored on — oldest first, at most 200.
   * ⛔ A plain SELECT through `Position_placedAt_id_idx`; the product line is NOT filtered here, so the trigger can raise
   * A12's once-only product alert (ruling 90).
   */
  triggerPage(input: TriggerPageInput, tx?: HouseTx): Promise<TriggerRow[]>;
  /**
   * The trigger filter's account facts (PLAN §4.3), the predicates `lockedPool` applies: the role, the recruiter, and
   * whether today's penalty box row exists (`penalty:<userId>:<EAT day from DB now()>`). Null when no such user.
   */
  triggerAccount(userId: string, tx?: HouseTx): Promise<TriggerAccount | null>;
  /** N1 §3: status, and whether `staleAt` is still ahead of the database clock (`clock_timestamp()`). */
  intentFreshness(id: string, tx?: HouseTx): Promise<{ status: IntentStatus; fresh: boolean } | null>;
  /**
   * ⛔ MEMORY ONLY. The memory store cannot roll back, so a NO_FUNDS abort after `markPlaced` puts the
   * intent back to CLAIMED with no position (PLAN H4). On Postgres the transaction rollback does it, and
   * calling this throws.
   */
  revertPlacedInMemory(id: string, positionId: string): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Shared helpers for both stores
// ---------------------------------------------------------------------------

/** Page sizes are whole and bounded in both stores, so a bad caller cannot scan a table. */
function pageLimit(limit: number): number {
  if (!Number.isFinite(limit)) return 50;
  return Math.max(1, Math.min(500, Math.floor(limit)));
}

/** A whole, non-negative count or duration argument, refused identically by both stores. */
function wholeArg(name: string, v: number): number {
  if (!Number.isSafeInteger(v) || v < 0) throw new Error(`house-bot-dal: ${name} must be a whole number ≥ 0`);
  return v;
}

/** `placedTimes`' window: whole seconds, 1 to 86,400 (the longest rate window, PER_DAY), refused identically. */
function placedWindowSec(v: number): number {
  if (wholeArg("withinSec", v) < 1 || v > 86_400) throw new Error("house-bot-dal: withinSec must be 1 to 86400");
  return v;
}

const STAFF_CHOSEN_SQL = `("kind" = 'MANUAL' OR "targetId" IS NOT NULL)`;
const isStaffChosen = (i: Pick<StoredHouseBotIntent, "kind" | "targetId">): boolean => i.kind === "MANUAL" || i.targetId != null;
const RUNTIME_WRITABLE = Object.keys(HOUSE_BOT_RUNTIME_COLUMNS).filter((k) => k !== "key" && k !== "updatedAt");
const RULES_WRITABLE: readonly string[] = ["rules", ...BOT_CAP_FIELDS];

// ---------------------------------------------------------------------------
// In-memory implementations (dev + tests)
// ---------------------------------------------------------------------------

declare global {
  /* eslint-disable no-var */
  var __50PICK_HB_BOTS: Map<string, StoredHouseBot> | undefined;
  var __50PICK_HB_CONTROL: Map<string, StoredHouseBotControl> | undefined;
  var __50PICK_HB_RUNTIME: Map<string, StoredHouseBotRuntime> | undefined;
  var __50PICK_HB_ALERT_ONCE: Map<string, StoredHouseBotAlertOnce> | undefined;
  var __50PICK_HB_EVENTS: Map<string, StoredHouseBotEvent> | undefined;
  var __50PICK_HB_INTENTS: Map<string, StoredHouseBotIntent> | undefined;
  var __50PICK_HB_TARGETS: Map<string, StoredHouseBotTarget> | undefined;
  var __50PICK_HB_PRESSES: Map<string, StoredHouseBotPress> | undefined;
  /* eslint-enable no-var */
}
const memBots = globalThis.__50PICK_HB_BOTS ?? (globalThis.__50PICK_HB_BOTS = new Map());
const memControl = globalThis.__50PICK_HB_CONTROL ?? (globalThis.__50PICK_HB_CONTROL = new Map());
const memRuntime = globalThis.__50PICK_HB_RUNTIME ?? (globalThis.__50PICK_HB_RUNTIME = new Map());
const memAlertOnce = globalThis.__50PICK_HB_ALERT_ONCE ?? (globalThis.__50PICK_HB_ALERT_ONCE = new Map());
const memEvents = globalThis.__50PICK_HB_EVENTS ?? (globalThis.__50PICK_HB_EVENTS = new Map());
const memIntents = globalThis.__50PICK_HB_INTENTS ?? (globalThis.__50PICK_HB_INTENTS = new Map());
const memTargets = globalThis.__50PICK_HB_TARGETS ?? (globalThis.__50PICK_HB_TARGETS = new Map());
const memPresses = globalThis.__50PICK_HB_PRESSES ?? (globalThis.__50PICK_HB_PRESSES = new Map());

const MEM: { [T in HouseTable]: Map<string, HouseRows[T]> } = {
  HouseBot: memBots, HouseBotControl: memControl, HouseBotRuntime: memRuntime, HouseBotAlertOnce: memAlertOnce,
  HouseBotEvent: memEvents, HouseBotIntent: memIntents, HouseBotTarget: memTargets, HouseBotPress: memPresses,
};

const nowIso = (): string => new Date().toISOString();
const ms = (s: string | null): number => (s == null ? NaN : Date.parse(s));
const field = (row: object, key: string): unknown => (row as Record<string, unknown>)[key];
/** Rows go in and come out as copies, like rows read from a database: a caller mutating a
 *  returned object must not change the store. */
const clone = <R>(row: R): R => structuredClone(row);
const defined = <R extends object>(o: R): Partial<R> =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<R>;

/** The migration's seed values: disabled, every cap NULL, 5 / 20 / 6, versions 1, nothing
 *  disclosed. */
function seededControl(now: string): StoredHouseBotControl {
  return {
    id: HOUSE_CONTROL_ID, enabled: false, switchedAt: null, switchedById: null, switchedReason: null, offCause: null,
    limitsVersion: 1, limitsSchemaVersion: 1,
    gCapDailyStakeTzs: null, gCapDailyLossTzs: null, gCapOpenExposureTzs: null, gCapPerMarketTzs: null,
    gMaxBetsPerMinute: null, gMaxBetsPerDay: null, gCounterPerPlayerPerDay: null, gCounterPerPlayerTzsPerDay: null,
    maxDesignatedBots: 5, bellAlertsPerHour: 20,
    gCapStaffChosenPerDay: null, gCapStaffChosenDailyTzs: null, gTargetsMaxActive: null,
    gStaffChosenMaxCounterpartyShare: null,
    createdAt: now, updatedAt: now,
  };
}

/** A runtime row as the column defaults make it. */
function blankRuntime(key: string, now: string): StoredHouseBotRuntime {
  return {
    key, hourKey: null, countInHour: 0, rateLimitedHourKey: null, rateLimitedCount: 0,
    sweepPlacedAt: null, sweepPositionId: null, scopeFrom: null, errorStreak: 0, transientSince: null,
    boundsHash: null, exitConfigHash: null, rulesFutureSince: null, engineEnabled: null, bootAt: null, beatAt: null,
    pollerErrorAt: null, pollerErrorCode: null, pollerErrorStreak: 0, skewMs: null, updatedAt: now,
  };
}

/** The lazy seed, run on first access: control `global`, and runtime `global` with its sweep
 *  watermark at seed time (A11 — the first sweep never replays history). */
function memSeed(): void {
  const now = nowIso();
  if (!memControl.has(HOUSE_CONTROL_ID)) memControl.set(HOUSE_CONTROL_ID, seededControl(now));
  if (!memRuntime.has(RUNTIME_KEY.global)) memRuntime.set(RUNTIME_KEY.global, { ...blankRuntime(RUNTIME_KEY.global, now), sweepPlacedAt: now });
}

const SORTED_CHECKS: { [T in HouseTable]: ReadonlyArray<MemCheck<HouseRows[T]>> } = Object.fromEntries(
  (Object.keys(MEM) as HouseTable[]).map((t) => [t, [...MEM_CHECKS[t]].sort(byName)]),
  // Object.fromEntries widens to a string index; every HouseTable key is present by construction.
) as unknown as { [T in HouseTable]: ReadonlyArray<MemCheck<HouseRows[T]>> };

/**
 * The one memory write. In Postgres order: column types, then the CHECKs (by name), then the
 * primary key, then every unique index — each raising Prisma's error shape BEFORE anything
 * changes. Always stores a new object, so `memAtomic`'s shallow snapshot stays valid.
 */
function memWrite<T extends HouseTable>(table: T, row: HouseRows[T], mode: "insert" | "update"): HouseRows[T] {
  const cols = TABLE_COLUMNS[table] as Record<string, ColumnSpec>;
  for (const [k, spec] of Object.entries(cols)) {
    const v = field(row, k);
    if (v !== undefined) bindValue(table, k, spec, v);
  }
  for (const c of SORTED_CHECKS[table] as ReadonlyArray<MemCheck<HouseRows[T]>>) {
    if (!c.ok(row)) throw houseCheckError(table, c.name);
  }
  const map = MEM[table] as Map<string, HouseRows[T]>;
  const pk = String(field(row, TABLE_PK[table]));
  if (mode === "insert" && map.has(pk)) throw houseUniqueError(`${table}_pkey`);
  for (const u of MEM_UNIQUES[table] as ReadonlyArray<MemUnique<HouseRows[T]>>) {
    if (!u.where(row)) continue;
    const vals = u.cols.map((c) => field(row, c));
    if (vals.some((v) => v == null)) continue;
    for (const [otherPk, other] of map) {
      if (otherPk === pk || !u.where(other)) continue;
      if (u.cols.every((c, i) => field(other, c) === vals[i])) throw houseUniqueError(u.name);
    }
  }
  const stored = clone(row);
  map.set(pk, stored);
  return clone(stored);
}

/** An update through `memWrite`, stamping `updatedAt` for every table that has it (CC-24). */
function memUpdate<T extends HouseTable>(table: T, cur: HouseRows[T], changes: Partial<HouseRows[T]>): HouseRows[T] {
  const next = { ...cur, ...changes } as HouseRows[T];
  if ("updatedAt" in TABLE_COLUMNS[table]) (next as { updatedAt: string }).updatedAt = nowIso();
  return memWrite(table, next, "update");
}

/**
 * Run a synchronous multi-row write as one unit: on a throw, every house map is restored.
 * Synchronous on purpose — with no `await` inside, nothing else can interleave, which is the
 * memory twin of a transaction and of the claim's "no await between select and mark" (A24).
 */
function memAtomic<R>(fn: () => R): R {
  const restore = memSnapshot();
  try {
    return fn();
  } catch (e) {
    restore();
    throw e;
  }
}

/** A shallow copy of every house map, and the function that puts it back. Valid because
 *  `memWrite` always stores a new object and never mutates a stored one. */
function memSnapshot(): () => void {
  const saved = (Object.keys(MEM) as HouseTable[]).map((t) => [t, new Map(MEM[t] as Map<string, unknown>)] as const);
  return () => {
    for (const [t, rows] of saved) {
      const live = MEM[t] as Map<string, unknown>;
      live.clear();
      for (const [k, v] of rows) live.set(k, v);
    }
  };
}

/** Newest first by `(createdAt, id)`, strictly after the cursor — the memory keyset (C7). */
function memPage<R extends { createdAt: string; id: string }>(rows: R[], cursor: KeysetCursor | null | undefined, limit: number, offset = 0): Page<R> {
  const n = pageLimit(limit);
  const skip = wholeArg("offset", offset);
  const sorted = rows.sort((a, b) => ms(b.createdAt) - ms(a.createdAt) || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0));
  const after = cursor
    ? sorted.filter((r) => ms(r.createdAt) < ms(cursor.createdAt) || (ms(r.createdAt) === ms(cursor.createdAt) && r.id < cursor.id))
    : sorted;
  const page = after.slice(skip, skip + n + 1);
  const more = page.length > n;
  const out = page.slice(0, n).map(clone);
  const last = out[out.length - 1];
  return { rows: out, nextCursor: more && last ? { createdAt: last.createdAt, id: last.id } : null };
}

/* ═══ STEP 9 (2026-09-26) · A SORTED NUMBERED PAGE, AND THE ORDERS IT MAY BE CUT FROM — MEMORY SIDE ═══════════════
 * Ali, as typed: "all desk tbale sand grid sgot th erug tpaging pleas enad sroting etc.. to prveent vey rlong grids".
 * ⛔ THE DEFAULT ORDER NEVER COMES THROUGH HERE. A caller that passes no `order` gets `memPage` above, unchanged, so the
 * default address, the engine's keyset walkers and every anchor count read exactly what they read before.
 * ⛔ EVERY ORDER IS TOTAL: the key, then the default order (newest first, the id last) for every tie, in BOTH directions
 * — the Postgres twin writes the same tail — so two renders, and the two twins, cannot page one population two ways.
 * ⛔ A MISSING KEY SORTS LAST IN BOTH DIRECTIONS, which is Postgres's `NULLS LAST` written out on this side. */

/** The refusal both twins raise for a keyset cursor handed to a SORTED page — a cursor is a position in the default order. */
const SORTED_CURSOR_REFUSAL = "house-bot-dal: a keyset cursor is a position in the default order and cannot page a sorted list";

/** Newest first by `(createdAt, id)` — the default order, and the tail every other order falls back to on a tie. */
const memNewestFirst = <R extends { createdAt: string; id: string }>(a: R, b: R): number =>
  ms(b.createdAt) - ms(a.createdAt) || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0);

/** A key that may be missing, then the default order: a missing key sorts LAST in both directions (`NULLS LAST`). */
function memKeyed<R extends { createdAt: string; id: string }>(key: (r: R) => number | null, dir: ListSortDir): (a: R, b: R) => number {
  return (a, b) => {
    const ka = key(a), kb = key(b);
    if (ka === null || kb === null) return ka === kb ? memNewestFirst(a, b) : ka === null ? 1 : -1;
    return (dir === "asc" ? ka - kb : kb - ka) || memNewestFirst(a, b);
  };
}

/**
 * ⭐ ONE TEXT ORDER FOR THE WHOLE CONSOLE: A–Z ignoring the case of A–Z, then CODE POINT for everything else — which is
 * Postgres's `translate(…) COLLATE "C"` and then `COLLATE "C"` (UTF-8 byte order IS code-point order). Written ONCE,
 * exported, and read by the console for the labels it ranks in memory, so a title sorted in SQL and a label sorted in
 * the reader follow one rule. ⛔ Never `localeCompare`: its answer depends on the runtime's locale data, and a sort the
 * two twins could disagree on is not a sort.
 */
export function foldedCodePointOrder(a: string, b: string): number {
  const fold = (s: string) => s.replace(/[A-Z]/g, (c) => c.toLowerCase());
  return codePointOrder(fold(a), fold(b)) || codePointOrder(a, b);
}
function codePointOrder(a: string, b: string): number {
  const x = [...a], y = [...b];
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    const d = (x[i].codePointAt(0) ?? 0) - (y[i].codePointAt(0) ?? 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return x.length === y.length ? 0 : x.length < y.length ? -1 : 1;
}

/** One sorted numbered page. ⛔ No cursor — see `SORTED_CURSOR_REFUSAL` — and no `nextCursor` out of it either. */
function memOrderedPage<R extends { createdAt: string; id: string }>(rows: R[], order: (a: R, b: R) => number, cursor: KeysetCursor | null | undefined, limit: number, offset = 0): Page<R> {
  if (cursor) throw new Error(SORTED_CURSOR_REFUSAL);
  const n = pageLimit(limit);
  const skip = wholeArg("offset", offset);
  return { rows: rows.sort(order).slice(skip, skip + n).map(clone), nextCursor: null };
}

/**
 * ⭐ THE ACTIVITY FEED'S ONE ORDER, MEMORY SIDE — read by `listFeed` and by `rankInFeed`, so the page a row is served on
 * and the rank a bell lands by are one order. `outcome` reads each row's POSITION for the chip the console paints (the
 * position's result when it has one, else the intent's status); it is the only key that needs a read, and it reads only
 * the positions of the rows it was handed.
 */
async function memFeedOrder(order: IntentFeedOrder, rows: readonly StoredHouseBotIntent[]): Promise<(a: StoredHouseBotIntent, b: StoredHouseBotIntent) => number> {
  if (order.key === "when") return order.dir === "desc" ? memNewestFirst : (a, b) => -memNewestFirst(a, b);
  if (order.key === "stake") return memKeyed((r) => r.stakeTzs, order.dir);
  if (order.key === "account") {
    const at = new Map(order.accountIds.map((id, k) => [id, k] as const));
    return memKeyed((r) => at.get(r.houseBotId) ?? null, "asc");
  }
  const positionIds = [...new Set(rows.map((r) => r.positionId).filter((v): v is string => v != null))];
  const statuses = new Map<string, string>();
  for (const [k, p] of (await Promise.all(positionIds.map((id) => positionStore.get(id)))).entries()) {
    if (p != null) statuses.set(positionIds[k], String(p.status));
  }
  const results: readonly string[] = FEED_RESULT_STATUSES;
  const lifecycle: readonly string[] = FEED_OUTCOME_ORDER;
  const chip = (r: StoredHouseBotIntent): string => {
    const st = r.positionId == null ? undefined : statuses.get(r.positionId);
    return st !== undefined && results.includes(st) ? st : r.status;
  };
  return memKeyed((r) => { const k = lifecycle.indexOf(chip(r)); return k < 0 ? null : k; }, order.dir);
}

/** ⭐ THE HISTORY'S ONE ORDER, MEMORY SIDE — `listAll` and `rankInAll` both. Absent is the default, newest first. */
function memEventOrder(order: EventListOrder | undefined): (a: StoredHouseBotEvent, b: StoredHouseBotEvent) => number {
  if (order === undefined || (order.key === "when" && order.dir === "desc")) return memNewestFirst;
  if (order.key === "when") return (a, b) => -memNewestFirst(a, b);
  const at = new Map(order.accountIds.map((id, k) => [id, k] as const));
  return memKeyed((e) => (e.houseBotId == null ? null : at.get(e.houseBotId) ?? null), "asc");
}

/** ⭐ THE TARGETS GRID'S ONE ORDER, MEMORY SIDE. A title that is not a string sorts LAST in both directions. */
function memTargetOrder(order: TargetListOrder): (a: StoredHouseBotTarget, b: StoredHouseBotTarget) => number {
  if (order.key === "status") {
    const lifecycle: readonly string[] = TARGET_STATUSES;
    return memKeyed((t) => { const k = lifecycle.indexOf(t.status); return k < 0 ? null : k; }, order.dir);
  }
  if (order.key === "lastChange") return memKeyed((t) => ms(t.endedAt ?? t.createdAt), order.dir);
  const title = (t: StoredHouseBotTarget): string | null => {
    const v: unknown = (t.snapshot as { titleEn?: unknown } | null)?.titleEn;
    return typeof v === "string" ? v : null;
  };
  return (a, b) => {
    const ta = title(a), tb = title(b);
    if (ta === null || tb === null) return ta === tb ? memNewestFirst(a, b) : ta === null ? 1 : -1;
    return (order.dir === "asc" ? foldedCodePointOrder(ta, tb) : foldedCodePointOrder(tb, ta)) || memNewestFirst(a, b);
  };
}

const memoryHouseBotControl: HouseBotControlStore = {
  async get() {
    memSeed();
    return clone(memControl.get(HOUSE_CONTROL_ID)!);
  },
  async switchOff(input) {
    memSeed();
    const cur = memControl.get(HOUSE_CONTROL_ID)!;
    if (!cur.enabled) return null;
    return memUpdate("HouseBotControl", cur, {
      enabled: false, offCause: input.cause, switchedAt: nowIso(), switchedById: input.byId, switchedReason: input.reason,
    });
  },
  async markSunset(input) {
    memSeed();
    const cur = memControl.get(HOUSE_CONTROL_ID)!;
    // The Postgres predicate, mirrored: `"offCause" IS DISTINCT FROM 'SUNSET'` — true for NULL, which is the
    // shipped state this has to move, and false only once the terminal marker is already there.
    if (cur.offCause === SUNSET_CAUSE) return null;
    return memUpdate("HouseBotControl", cur, {
      enabled: false, offCause: SUNSET_CAUSE, switchedAt: nowIso(), switchedById: input.byId, switchedReason: input.reason,
    });
  },
  async switchOn(input) {
    memSeed();
    // One synchronous body: the control write and the scope start land together (ruling 92).
    return memAtomic(() => {
      const cur = memControl.get(HOUSE_CONTROL_ID)!;
      if (cur.enabled) return null;
      const row = memUpdate("HouseBotControl", cur, {
        enabled: true, offCause: null, switchedAt: nowIso(), switchedById: input.byId, switchedReason: input.reason,
      });
      memRuntimeUpsert(RUNTIME_KEY.global, { scopeFrom: nowIso() });
      return row;
    });
  },
  async saveLimits(baseVersion, patch) {
    memSeed();
    assertWritable("HouseBotControl", patch, LIMIT_FIELDS);
    const cur = memControl.get(HOUSE_CONTROL_ID)!;
    if (cur.limitsVersion !== baseVersion) return { ok: false, current: clone(cur) };
    return { ok: true, row: memUpdate("HouseBotControl", cur, { ...defined(patch), limitsVersion: cur.limitsVersion + 1 }) };
  },
};

/** The initial lifecycle `designate` always writes. */
function designatedBot(bot: NewHouseBot, now: string): StoredHouseBot {
  return {
    ...bot,
    status: "PAUSED", pauseReason: "NEW", pauseDetail: null, pausedFromStatus: null, rulesVersion: 1,
    credentialChangedAt: null, credentialChangedVia: null, consentVoidAt: null, consentVoidCause: null,
    removedAt: null, removedById: null, removedCause: null, removedReason: null,
    createdAt: now, updatedAt: now,
  };
}

const PAUSED_ONLY: readonly HouseBotStatus[] = ["PAUSED", "AUTO_PAUSED"];
const ERASED = "[erased]";
const erasedTail = (id: string): string => id.slice(-6).toUpperCase();

const memoryHouseBots: HouseBotStore = {
  async designate(input) {
    return memAtomic(() => {
      const now = nowIso();
      const bot = memWrite("HouseBot", designatedBot(input.bot, now), "insert");
      const rk = RUNTIME_KEY.bot(bot.id);
      if (!memRuntime.has(rk)) memWrite("HouseBotRuntime", blankRuntime(rk, now), "insert");
      memWrite("HouseBotEvent", {
        id: newHouseId("event"), houseBotId: bot.id, userId: bot.userId, marketId: null, kind: "DESIGNATED",
        fromStatus: null, toStatus: "PAUSED", reason: input.event.reason, actorId: input.event.actorId,
        payload: input.event.payload, auditId: null, createdAt: now,
      }, "insert");
      return bot;
    });
  },
  async get(id) {
    const r = memBots.get(id);
    return r ? clone(r) : null;
  },
  async findLiveByUserId(userId) {
    const r = [...memBots.values()].find((b) => b.userId === userId && b.status !== "REMOVED");
    return r ? clone(r) : null;
  },
  async listByUserId(userId) {
    return [...memBots.values()].filter((b) => b.userId === userId)
      .sort((a, b) => ms(b.designatedAt) - ms(a.designatedAt)).map(clone);
  },
  async listNonRemoved() {
    return [...memBots.values()].filter((b) => b.status !== "REMOVED")
      .sort((a, b) => ms(a.designatedAt) - ms(b.designatedAt)).map(clone);
  },
  async countLive() {
    return [...memBots.values()].filter((b) => b.status !== "REMOVED").length;
  },
  async setStatus(id, input) {
    const cur = memBots.get(id);
    if (!cur || !input.from.includes(cur.status)) return null;
    const changes: Partial<StoredHouseBot> = {
      status: input.to, pauseReason: input.pauseReason, pausedFromStatus: input.pausedFromStatus,
    };
    if (input.pauseDetail !== undefined) changes.pauseDetail = input.pauseDetail;
    if (input.removal) {
      Object.assign(changes, {
        removedAt: nowIso(), removedById: input.removal.byId, removedReason: input.removal.reason, removedCause: input.removal.cause,
      });
    }
    return memUpdate("HouseBot", cur, changes);
  },
  async saveRules(id, baseVersion, patch) {
    assertWritable("HouseBot", patch, RULES_WRITABLE);
    const cur = memBots.get(id);
    if (!cur) return { ok: false, current: null };
    if (cur.rulesVersion !== baseVersion) return { ok: false, current: clone(cur) };
    return { ok: true, row: memUpdate("HouseBot", cur, { ...defined(patch), rulesVersion: cur.rulesVersion + 1 }) };
  },
  async setVerified(id, input) {
    const cur = memBots.get(id);
    if (!cur || !PAUSED_ONLY.includes(cur.status)) return null;
    return memUpdate("HouseBot", cur, {
      passwordFingerprint: input.fingerprint, verifiedAt: new Date(ms(input.verifiedAt)).toISOString(), verifiedById: input.verifiedById,
      pausedFromStatus: null, credentialChangedAt: null, credentialChangedVia: null,
    });
  },
  async setCredentialChanged(id, input) {
    const cur = memBots.get(id);
    if (!cur || !PAUSED_ONLY.includes(cur.status)) return null;
    return memUpdate("HouseBot", cur, { credentialChangedAt: nowIso(), credentialChangedVia: input.via });
  },
  async setConsentVoid(id, cause) {
    const cur = memBots.get(id);
    if (!cur) return null;
    if (!(cur.consentVoidAt == null || ms(cur.verifiedAt) > ms(cur.consentVoidAt))) return null;
    return memUpdate("HouseBot", cur, { consentVoidAt: new Date(Math.max(Date.now(), ms(cur.verifiedAt) + 1)).toISOString(), consentVoidCause: cause });
  },
  async upgradeConsentVoidCause(id) {
    const cur = memBots.get(id);
    if (!cur || cur.consentVoidAt == null || ms(cur.verifiedAt) > ms(cur.consentVoidAt) || cur.consentVoidCause === "HOLDER_WITHDREW") return null;
    return memUpdate("HouseBot", cur, { consentVoidCause: "HOLDER_WITHDREW" });
  },
  async pseudonymiseForUser(userId) {
    return memAtomic(() => {
      const bots = [...memBots.values()].filter((b) => b.userId === userId);
      const live = bots.find((b) => b.status !== "REMOVED");
      if (live) return { ok: false as const, code: "house_bot_live" as const, botId: live.id };
      const ids = new Set(bots.map((b) => b.id));
      for (const b of bots) {
        memUpdate("HouseBot", b, {
          label: `Erased ${erasedTail(b.id)}`, labelKey: `erased ${erasedTail(b.id)}`.toLowerCase(),
          note: b.note == null ? null : ERASED, removedReason: b.removedReason == null ? null : ERASED,
        });
      }
      let events = 0;
      for (const e of [...memEvents.values()]) {
        if (e.houseBotId != null && ids.has(e.houseBotId) && e.reason != null && e.reason !== ERASED) {
          memWrite("HouseBotEvent", { ...e, reason: ERASED }, "update");
          events++;
        }
      }
      let presses = 0;
      for (const p of [...memPresses.values()]) {
        if (ids.has(p.houseBotId) && p.reason != null && p.reason !== ERASED) {
          memUpdate("HouseBotPress", p, { reason: ERASED });
          presses++;
        }
      }
      return { ok: true as const, bots: bots.length, events, presses };
    });
  },
};

/** Shared by the runtime writers: insert the row from its defaults, or update it, with `patch`. */
function memRuntimeUpsert(key: string, patch: Partial<StoredHouseBotRuntime>): StoredHouseBotRuntime {
  memSeed();
  const cur = memRuntime.get(key);
  if (!cur) return memWrite("HouseBotRuntime", { ...blankRuntime(key, nowIso()), ...defined(patch) }, "insert");
  return memUpdate("HouseBotRuntime", cur, defined(patch));
}

/** The one counter shape behind `bumpHourCount` and `bumpRateLimited`. */
function memBumpHour(key: string, keyCol: "hourKey" | "rateLimitedHourKey", countCol: "countInHour" | "rateLimitedCount"): { hourKey: string; count: number } {
  memSeed();
  const h = eatHourKey(Date.now());
  const cur = memRuntime.get(key);
  const count = cur && cur[keyCol] === h ? cur[countCol] + 1 : 1;
  memRuntimeUpsert(key, { [keyCol]: h, [countCol]: count } as Partial<StoredHouseBotRuntime>);
  return { hourKey: h, count };
}

const INSTANCE_ROW = (key: string): boolean => key.startsWith("engine:") || key.startsWith("beat:poller:");
const DAY_MS = 24 * 60 * 60 * 1000;

const memoryHouseBotRuntime: HouseBotRuntimeStore = {
  async get(key) {
    memSeed();
    const r = memRuntime.get(key);
    return r ? clone(r) : null;
  },
  async upsert(key, patch) {
    assertWritable("HouseBotRuntime", patch, RUNTIME_WRITABLE);
    return memRuntimeUpsert(key, patch);
  },
  async bumpErrorStreak() {
    memSeed();
    const cur = memRuntime.get(RUNTIME_KEY.global)!;
    return memUpdate("HouseBotRuntime", cur, { errorStreak: cur.errorStreak + 1 }).errorStreak;
  },
  async resetErrorStreak() {
    memSeed();
    memUpdate("HouseBotRuntime", memRuntime.get(RUNTIME_KEY.global)!, { errorStreak: 0, transientSince: null });
  },
  async markTransient() {
    memSeed();
    const cur = memRuntime.get(RUNTIME_KEY.global)!;
    return memUpdate("HouseBotRuntime", cur, { transientSince: cur.transientSince ?? nowIso() });
  },
  async bumpHourCount(key) {
    return memBumpHour(key, "hourKey", "countInHour");
  },
  async bumpRateLimited(key) {
    return memBumpHour(key, "rateLimitedHourKey", "rateLimitedCount");
  },
  async beat(key, extra) {
    if (extra) assertWritable("HouseBotRuntime", extra, RUNTIME_WRITABLE);
    return memRuntimeUpsert(key, { ...(extra ?? {}), beatAt: nowIso() });
  },
  async boot(key, input) {
    /* ⛔ `pollerErrorCode: null` CLEARS A BOOT REFUSAL (M4). This row's code carries only `BOOT_REFUSED:*`, and a
       boot that LANDED is the end of that state — a current state outliving its cause is the lie
       `clearClaimsBlocked` exists against one layer down. */
    return memRuntimeUpsert(key, { engineEnabled: input.engineEnabled, bootAt: nowIso(), pollerErrorCode: null });
  },
  async advanceSweep(placedAt, positionId) {
    memSeed();
    const cur = memRuntime.get(RUNTIME_KEY.global)!;
    const to = ms(placedAt);
    const forward = cur.sweepPlacedAt == null || ms(cur.sweepPlacedAt) < to
      || (ms(cur.sweepPlacedAt) === to && (cur.sweepPositionId == null || cur.sweepPositionId < positionId));
    if (!forward) return false;
    memUpdate("HouseBotRuntime", cur, { sweepPlacedAt: new Date(to).toISOString(), sweepPositionId: positionId });
    return true;
  },
  async setScopeFrom(key) {
    return memRuntimeUpsert(key, { scopeFrom: nowIso() });
  },
  async listInstances() {
    return [...memRuntime.values()].filter((r) => r.key.startsWith("engine:") || r.key.startsWith("beat:"))
      .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)).map(clone);
  },
  async pruneInstanceRows() {
    const cutoff = Date.now() - DAY_MS;
    let n = 0;
    for (const r of [...memRuntime.values()]) {
      if (INSTANCE_ROW(r.key) && ms(r.beatAt ?? r.bootAt ?? r.updatedAt) < cutoff) {
        memRuntime.delete(r.key);
        n++;
      }
    }
    return n;
  },
  async dbClock() {
    return { nowMs: Date.now() };
  },
};

const memoryHouseBotAlertOnce: HouseBotAlertOnceStore = {
  async claim(key) {
    if (memAlertOnce.has(key)) return false;
    memWrite("HouseBotAlertOnce", { key, createdAt: nowIso() }, "insert");
    return true;
  },
  async release(key) {
    memAlertOnce.delete(key);
  },
  async claimWithEatSuffix(prefix, unit) {
    const key = `${prefix}:${eatKeyFor(unit, Date.now())}`;
    return { claimed: await memoryHouseBotAlertOnce.claim(key), key };
  },
  async purgeBatch(olderThanDays = HOUSEBOT_ALERT_ONCE_RETENTION_DAYS, batch = HOUSEBOT_ALERT_ONCE_PURGE_BATCH) {
    const cutoff = Date.now() - wholeArg("olderThanDays", olderThanDays) * DAY_MS;
    const max = wholeArg("batch", batch);
    let n = 0;
    for (const r of [...memAlertOnce.values()]) {
      if (n >= max) break;
      if (ms(r.createdAt) < cutoff) {
        memAlertOnce.delete(r.key);
        n++;
      }
    }
    return n;
  },
};

/**
 * ⭐ THE HISTORY TAB'S ONE PREDICATE, MEMORY SIDE (C7 step 5, ruling 317; ruling 177's shape).
 * `listAll` and `countAll` both derive their population from here and nowhere else. ⛔ Writing the condition a
 * second time inside the count is exactly what `test:dal-parity` 16.eventsShared reports: a pager whose total was
 * measured over a different population than its rows links at pages that render nothing.
 */
function memEventMatches(opts: { kinds?: readonly HouseBotEventKind[]; houseBotId?: string; fromIso?: string }): (e: StoredHouseBotEvent) => boolean {
  const kinds: readonly string[] | undefined = opts.kinds;
  return (e) =>
    (!kinds || kinds.includes(e.kind))
    && (opts.houseBotId === undefined || e.houseBotId === opts.houseBotId)
    && (opts.fromIso === undefined || ms(e.createdAt) >= ms(opts.fromIso));
}

const memoryHouseBotEvents: HouseBotEventStore = {
  async append(e) {
    return memWrite("HouseBotEvent", { ...e, id: newHouseId("event"), auditId: null, createdAt: nowIso() }, "insert");
  },
  async setAuditId(id, auditId) {
    const cur = memEvents.get(id);
    if (!cur || cur.auditId != null) return false;
    memWrite("HouseBotEvent", { ...cur, auditId }, "update");
    return true;
  },
  async get(id) {
    const r = memEvents.get(id);
    return r ? clone(r) : null;
  },
  async listByBot(houseBotId, opts) {
    const kinds: readonly string[] | undefined = opts.kinds;
    return memPage([...memEvents.values()].filter((e) => e.houseBotId === houseBotId && (!kinds || kinds.includes(e.kind))),
      opts.cursor, opts.limit);
  },
  async listAll(opts) {
    return [...memEvents.values()]
      .filter(memEventMatches(opts))
      .sort(memEventOrder(opts.order))
      .slice(wholeArg("offset", opts.offset ?? 0), wholeArg("offset", opts.offset ?? 0) + pageLimit(opts.limit))
      .map(clone);
  },
  async countAll(opts) {
    return [...memEvents.values()].filter(memEventMatches(opts)).length;
  },
  async rankInAll(opts, order, id) {
    const at = [...memEvents.values()].filter(memEventMatches(opts)).sort(memEventOrder(order)).findIndex((e) => e.id === id);
    return at < 0 ? null : at + 1;
  },
  async listByKinds(kinds, opts) {
    const want: readonly string[] = kinds;
    return [...memEvents.values()]
      .filter((e) => want.includes(e.kind))
      .filter((e) => opts.houseBotId === undefined || e.houseBotId === opts.houseBotId)
      .filter((e) => opts.userId === undefined || e.userId === opts.userId)
      .filter((e) => opts.marketId === undefined || e.marketId === opts.marketId)
      .filter((e) => opts.sinceIso === undefined || ms(e.createdAt) >= ms(opts.sinceIso))
      .sort((a, b) => ms(b.createdAt) - ms(a.createdAt) || (a.id < b.id ? 1 : -1))
      .slice(0, pageLimit(opts.limit))
      .map(clone);
  },
  async listForPress(press) {
    return [...memEvents.values()]
      .filter((e) => e.houseBotId === press.houseBotId && ms(e.createdAt) >= ms(press.createdAt) && field(e.payload ?? {}, "pressId") === press.id)
      .sort((a, b) => ms(a.createdAt) - ms(b.createdAt) || (a.id < b.id ? -1 : 1))
      .slice(0, 50)
      .map(clone);
  },
  async drawOpenerSide(input) {
    const existing = [...memEvents.values()].find((e) => e.kind === "OPENER_SIDE_DRAWN" && e.marketId === input.marketId);
    if (existing) return { side: field(existing.payload ?? {}, "side") as IntentSide, eventId: existing.id, drawn: false };
    const row = memWrite("HouseBotEvent", {
      id: newHouseId("event"), houseBotId: input.houseBotId, userId: null, marketId: input.marketId, kind: "OPENER_SIDE_DRAWN",
      fromStatus: null, toStatus: null, reason: null, actorId: input.actorId,
      payload: { side: input.side, drawnFor: input.drawnFor }, auditId: null, createdAt: nowIso(),
    }, "insert");
    return { side: input.side, eventId: row.id, drawn: true };
  },
  async findOpenerDraw(marketId) {
    const r = [...memEvents.values()].find((e) => e.kind === "OPENER_SIDE_DRAWN" && e.marketId === marketId);
    return r ? clone(r) : null;
  },
};

/** Any unique violation, primary key included — what `ON CONFLICT DO NOTHING` absorbs. */
const isUniqueError = (e: unknown): boolean => !!e && typeof e === "object" && (e as DbError).meta?.code === "23505";

// The claim lease (`CLAIM_TTL_SEC`), the staff-chosen stale grace (`PLANNER_STALE_EXPIRY_GRACE_SEC`),
// the alert-repair age (`ALERT_REPAIR_AFTER_MS`) and the poison threshold (`MAX_NON_TRANSIENT_ATTEMPTS`)
// are `constants.ts`'s, pinned by `test:house-bot-rules`. Both stores read them from there and the
// SQL binds them, so the pin reaches the lease the database actually grants.

const toIntentRow = (row: NewHouseBotIntent, createdAt: string): StoredHouseBotIntent =>
  ({ ...row, idempotencyKey: houseIntentKey(row.id), createdAt });

/**
 * Ruling 97 · the memory twin of `ON CONFLICT (<the row's anchor index>) DO NOTHING`: is the row's OWN anchor taken?
 * `hbi_counter_anchor_uq` covers every COUNTER; `hbi_fill_opener_anchor_uq` a FILL/OPENER that is not CANCELLED.
 */
function memAnchorTaken(row: NewHouseBotIntent): boolean {
  if (row.kind === "COUNTER") return [...memIntents.values()].some((i) => i.kind === "COUNTER" && i.anchorKey === row.anchorKey);
  if (row.kind === "FILL" || row.kind === "OPENER") {
    return [...memIntents.values()].some((i) => i.kind === row.kind && i.anchorKey === row.anchorKey && i.status !== "CANCELLED");
  }
  throw new Error("house-bot-dal: an engine insert takes COUNTER, FILL or OPENER rows only (C4-SPEC ruling 97)");
}

/** Ruling 97 · the anchor index a Postgres engine insert may treat as "already decided" — partial-index inference. */
function anchorConflictSql(kind: IntentKind): string {
  if (kind === "COUNTER") return `ON CONFLICT ("anchorKey") WHERE "kind" = 'COUNTER' DO NOTHING RETURNING *`;
  if (kind === "FILL" || kind === "OPENER") {
    return `ON CONFLICT ("kind", "anchorKey") WHERE "kind" IN ('FILL','OPENER') AND "status" <> 'CANCELLED' DO NOTHING RETURNING *`;
  }
  throw new Error("house-bot-dal: an engine insert takes COUNTER, FILL or OPENER rows only (C4-SPEC ruling 97)");
}

/** A planner scan row's market is out of every house scope when its title marks a demo (`isDemoMarket`'s prefix). */
const DEMO_PREFIX = "Demo · ";

/**
 * ⭐ THE ACTIVITY FEED'S ONE PREDICATE, MEMORY SIDE (C7 step 5, ruling 345; ruling 177's shape).
 * `listFeed` and `countFeed` both derive their population from here. ⛔ The six facets live in ONE place because
 * the count badge and the rows it sits above are read separately: a condition written twice is a badge that says
 * 41 over a table that can only ever show 38, and nothing on the screen reveals which one is wrong.
 * `test:dal-parity` 16.feedShared pins that both members name this function.
 */
function memFeedMatches(filter: IntentFeedCount): (i: StoredHouseBotIntent) => boolean {
  const kinds: readonly string[] | undefined = filter.kinds;
  const statuses: readonly string[] | undefined = filter.statuses;
  return (i) =>
    (filter.houseBotId === undefined || i.houseBotId === filter.houseBotId)
    && (filter.productLine === undefined || i.productLine === filter.productLine)
    && (!kinds || kinds.includes(i.kind))
    && (!statuses || statuses.includes(i.status))
    && (filter.targetId === undefined || i.targetId === filter.targetId)
    && (filter.fromIso === undefined || ms(i.createdAt) >= ms(filter.fromIso))
    && (filter.toIso === undefined || ms(i.createdAt) < ms(filter.toIso));
}

const memoryHouseBotIntents: HouseBotIntentStore = {
  async insert(row) {
    return memWrite("HouseBotIntent", toIntentRow(row, nowIso()), "insert");
  },
  async insertIgnoringConflict(row) {
    // ⛔ No await between the anchor check and the write (ruling 97): any OTHER unique clash raises from memWrite.
    if (memAnchorTaken(row)) return null;
    return memWrite("HouseBotIntent", toIntentRow(row, nowIso()), "insert");
  },
  async insertTargetedIfActive(targetId, row) {
    if (row.targetId !== targetId) throw new Error("house-bot-dal: insertTargetedIfActive row.targetId must equal targetId");
    // ⛔ No await between the status check and the insert: this synchronous body is the memory
    // twin of FOR SHARE on the target row.
    return memAtomic(() => {
      const t = memTargets.get(targetId);
      if (!t || t.status !== "ACTIVE") return { inserted: false, targetActive: false, row: null };
      if (memAnchorTaken(row)) return { inserted: false, targetActive: true, row: null };
      return { inserted: true, targetActive: true, row: memWrite("HouseBotIntent", toIntentRow(row, nowIso()), "insert") };
    });
  },
  async get(id) {
    const r = memIntents.get(id);
    return r ? clone(r) : null;
  },
  async findByAnchor(kind, anchorKey) {
    const r = [...memIntents.values()].filter((i) => i.kind === kind && i.anchorKey === anchorKey)
      .sort((a, b) => ms(b.createdAt) - ms(a.createdAt) || (a.id < b.id ? 1 : -1))[0];
    return r ? clone(r) : null;
  },
  async listLiveOnMarket(marketId) {
    return [...memIntents.values()].filter((i) => i.marketId === marketId && LIVE_STATUSES.includes(i.status))
      .sort((a, b) => ms(a.createdAt) - ms(b.createdAt)).map(clone);
  },
  async countLiveForTarget(targetId) {
    return [...memIntents.values()].filter((i) => i.targetId === targetId && LIVE_STATUSES.includes(i.status)).length;
  },
  async countPlacedForTarget(targetId) {
    return [...memIntents.values()].filter((i) => i.targetId === targetId && i.status === "PLACED").length;
  },
  async placedCounterFor(userId, marketId) {
    const r = [...memIntents.values()]
      .filter((i) => i.kind === "COUNTER" && i.status === "PLACED" && i.triggerUserId === userId && i.marketId === marketId)
      // L7: the same newest-first order as `findByAnchor`, spelled on its own so a mutation can target this twin alone.
      .sort((a, b) => ms(b.createdAt) - ms(a.createdAt) || (b.id > a.id ? 1 : -1))[0];
    return r ? clone(r) : null;
  },
  async claimBatch({ me, freeSlots, skewGuardMs }) {
    if (freeSlots <= 0) return [];
    const guard = wholeArg("skewGuardMs", skewGuardMs);
    const now = Date.now();
    // ⛔ Select and mark in one synchronous body — no await in between (A24).
    const due = [...memIntents.values()].filter((i) =>
      ((i.status === "PENDING" && ms(i.dueAt) <= now - guard && (i.nextAttemptAt == null || ms(i.nextAttemptAt) <= now))
        || (i.status === "CLAIMED" && i.claimedUntil != null && ms(i.claimedUntil) < now))
      && ms(i.deadlineAt) > now && ms(i.staleAt) > now && i.attempts < MAX_NON_TRANSIENT_ATTEMPTS)
      .sort((a, b) => ms(a.dueAt) - ms(b.dueAt))
      .slice(0, Math.floor(freeSlots));
    return due.map((i) => memWrite("HouseBotIntent", {
      ...i, status: "CLAIMED", claimedBy: me, claimedUntil: new Date(now + CLAIM_TTL_SEC * 1000).toISOString(), attempts: i.attempts + 1,
    }, "update"));
  },
  async claimById(id, me) {
    const now = Date.now();
    const i = memIntents.get(id);
    if (!i || i.status !== "PENDING" || !(ms(i.staleAt) > now) || !(ms(i.deadlineAt) > now) || i.attempts >= MAX_NON_TRANSIENT_ATTEMPTS) return null;
    return memWrite("HouseBotIntent", {
      ...i, status: "CLAIMED", claimedBy: me, claimedUntil: new Date(now + CLAIM_TTL_SEC * 1000).toISOString(), attempts: i.attempts + 1,
    }, "update");
  },
  async heartbeat(id, me) {
    const i = memIntents.get(id);
    if (!i || i.status !== "CLAIMED" || i.claimedBy !== me) return false;
    memWrite("HouseBotIntent", { ...i, claimedUntil: new Date(Date.now() + CLAIM_TTL_SEC * 1000).toISOString() }, "update");
    return true;
  },
  async markPlaced(id, positionId, _tx, opts) {
    const i = memIntents.get(id);
    if (!i || i.status !== "CLAIMED" || i.positionId != null) return false;
    const decision = opts?.counterparties ? { ...i.decision, counterparties: opts.counterparties } : i.decision;
    memWrite("HouseBotIntent", { ...i, status: "PLACED", positionId, finishedAt: nowIso(), decision }, "update");
    return true;
  },
  async requeueTransient(id, me, backoffMs) {
    const backoff = wholeArg("backoffMs", backoffMs);
    const now = Date.now();
    const i = memIntents.get(id);
    if (!i || i.status !== "CLAIMED" || i.claimedBy !== me) return null;
    if (!(ms(i.staleAt) - 1000 > now) || !(ms(i.deadlineAt) > now)) return null;
    return memWrite("HouseBotIntent", {
      ...i, status: "PENDING", claimedBy: null, claimedUntil: null,
      attempts: i.attempts - 1, transientAttempts: i.transientAttempts + 1,
      nextAttemptAt: new Date(Math.min(now + backoff, ms(i.staleAt) - 1000)).toISOString(),
    }, "update");
  },
  async defer(id, me, untilIso) {
    const i = memIntents.get(id);
    if (!i || i.status !== "CLAIMED" || i.claimedBy !== me || !(ms(i.staleAt) > ms(untilIso))) return null;
    return memWrite("HouseBotIntent", {
      ...i, status: "PENDING", claimedBy: null, claimedUntil: null, attempts: i.attempts - 1,
      nextAttemptAt: new Date(ms(untilIso)).toISOString(),
    }, "update");
  },
  async finish(id, me, input) {
    const i = memIntents.get(id);
    if (!i || i.status !== "CLAIMED" || i.claimedBy !== me) return false;
    memWrite("HouseBotIntent", {
      ...i, status: input.status, reasonCode: input.reasonCode, finishedAt: nowIso(),
      ...(input.why !== undefined ? { why: input.why } : {}),
    }, "update");
    return true;
  },
  async cancelPending(id, reasonCode) {
    const i = memIntents.get(id);
    if (!i || i.status !== "PENDING") return null;
    return memWrite("HouseBotIntent", { ...i, status: "CANCELLED", reasonCode, finishedAt: nowIso() }, "update");
  },
  async cancelLive(scope, reasonCode) {
    const inScope = liveScopeFilter(scope);
    return memAtomic(() => [...memIntents.values()]
      .filter((i) => LIVE_STATUSES.includes(i.status) && inScope(i))
      .sort((a, b) => ms(a.createdAt) - ms(b.createdAt))
      .map((i) => memWrite("HouseBotIntent", { ...i, status: "CANCELLED", reasonCode, finishedAt: nowIso() }, "update")));
  },
  async releaseClaims(me, excludeIds) {
    const skip = new Set(excludeIds);
    return memAtomic(() => [...memIntents.values()]
      .filter((i) => i.status === "CLAIMED" && i.claimedBy === me && !skip.has(i.id))
      .map((i) => memWrite("HouseBotIntent", { ...i, status: "PENDING", claimedBy: null, claimedUntil: null, attempts: Math.max(0, i.attempts - 1) }, "update").id));
  },
  async clampStake(id, me, stakeTzs) {
    const c = wholeArg("stakeTzs", stakeTzs);
    const i = memIntents.get(id);
    if (!i || i.status !== "CLAIMED" || i.claimedBy !== me || !(i.stakeTzs > c)) return null;
    return memWrite("HouseBotIntent", { ...i, stakeTzs: c, decision: { ...i.decision, firedStakeTzs: c } }, "update");
  },
  async expirePastDeadline() {
    const now = Date.now();
    return memAtomic(() => [...memIntents.values()]
      .filter((i) => ms(i.deadlineAt) <= now
        && (i.status === "PENDING" || (i.status === "CLAIMED" && i.claimedUntil != null && ms(i.claimedUntil) < now)))
      .map((i) => memWrite("HouseBotIntent", { ...i, status: "EXPIRED", reasonCode: "CUTOFF", finishedAt: nowIso() }, "update").id));
  },
  async expireStale() {
    const now = Date.now();
    return memAtomic(() => [...memIntents.values()]
      .filter((i) => (i.status === "PENDING" && ms(i.staleAt) <= now)
        || (i.status === "CLAIMED" && isStaffChosen(i) && ms(i.staleAt) + PLANNER_STALE_EXPIRY_GRACE_SEC * 1000 < now)
        || (i.status === "CLAIMED" && !isStaffChosen(i) && i.claimedUntil != null && ms(i.claimedUntil) < now && ms(i.staleAt) <= now))
      .map((i) => memWrite("HouseBotIntent", { ...i, status: "EXPIRED", reasonCode: "STALE", finishedAt: nowIso() }, "update").id));
  },
  async poison() {
    const now = Date.now();
    return memAtomic(() => [...memIntents.values()]
      .filter((i) => i.status === "CLAIMED" && i.claimedUntil != null && ms(i.claimedUntil) < now && i.attempts >= MAX_NON_TRANSIENT_ATTEMPTS)
      .map((i) => memWrite("HouseBotIntent", { ...i, status: "FAILED", reasonCode: "POISON", finishedAt: nowIso() }, "update").id));
  },
  async listPendingMarketIds(limit) {
    const first = new Map<string, number>();
    for (const i of memIntents.values()) {
      if (i.status !== "PENDING") continue;
      const at = ms(i.createdAt);
      if (!first.has(i.marketId) || at < first.get(i.marketId)!) first.set(i.marketId, at);
    }
    return [...first.entries()].sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1)).slice(0, pageLimit(limit)).map(([id]) => id);
  },
  async skipPendingOnMarket(marketId, code, opts) {
    return memAtomic(() => [...memIntents.values()]
      .filter((i) => i.status === "PENDING" && i.marketId === marketId && (!opts?.automatedOnly || !isStaffChosen(i)))
      .map((i) => memWrite("HouseBotIntent", { ...i, status: "SKIPPED", reasonCode: code, finishedAt: nowIso() }, "update").id));
  },
  async staffChosenPlacedSince({ sinceIso, limit }) {
    const since = ms(sinceIso);
    return [...memIntents.values()]
      .filter((i) => i.status === "PLACED" && isStaffChosen(i) && i.finishedAt != null && ms(i.finishedAt) >= since)
      .sort((a, b) => ms(a.finishedAt) - ms(b.finishedAt) || (a.id < b.id ? -1 : 1))
      .slice(0, pageLimit(limit))
      .map(clone);
  },
  async placedInWindow({ fromIso, toIso }) {
    const from = ms(fromIso), to = ms(toIso);
    const acc = new Map<string, PlacedInWindow>();
    for (const i of memIntents.values()) {
      if (i.status !== "PLACED" || i.finishedAt == null || ms(i.finishedAt) < from || ms(i.finishedAt) >= to) continue;
      const row = acc.get(i.houseBotId) ?? { houseBotId: i.houseBotId, count: 0, stakeTzs: 0, staffChosenCount: 0, staffChosenTzs: 0 };
      row.count += 1;
      row.stakeTzs += i.stakeTzs;
      if (isStaffChosen(i)) { row.staffChosenCount += 1; row.staffChosenTzs += i.stakeTzs; }
      acc.set(i.houseBotId, row);
    }
    return [...acc.values()].sort((a, b) => (a.houseBotId < b.houseBotId ? -1 : 1));
  },
  async markAlerted(id) {
    const i = memIntents.get(id);
    if (!i || i.status !== "PLACED" || i.alertedAt != null) return false;
    memWrite("HouseBotIntent", { ...i, alertedAt: nowIso() }, "update");
    return true;
  },
  async listAlertRepair(limit) {
    const cutoff = Date.now() - ALERT_REPAIR_AFTER_MS;
    return [...memIntents.values()]
      .filter((i) => i.status === "PLACED" && i.alertedAt == null && i.finishedAt != null && ms(i.finishedAt) < cutoff)
      .sort((a, b) => ms(a.finishedAt) - ms(b.finishedAt))
      .slice(0, pageLimit(limit))
      .map(clone);
  },
  async staffChosenPlaced({ houseBotId, fromIso, toIso }) {
    const from = ms(fromIso), to = ms(toIso);
    const rows = [...memIntents.values()].filter((i) => isStaffChosen(i) && i.status === "PLACED" && i.finishedAt != null
      && ms(i.finishedAt) >= from && ms(i.finishedAt) < to && (houseBotId == null || i.houseBotId === houseBotId));
    return { count: rows.length, stakeTzs: rows.reduce((s, i) => s + i.stakeTzs, 0) };
  },
  async staffChosenPlacedToday({ houseBotId, dayKey }) {
    /* ⛔ THE CALLER'S DAY WHEN IT HAS ONE (ruling 348). Deriving one here as well is a SECOND derivation, and a
       render that straddles EAT midnight then paints two days on one card. */
    const w = eatDayWindow(dayKey ?? eatDayKey(Date.now()));
    if (!w) throw new Error(`house-bot-dal: could not compute the EAT day ${JSON.stringify(dayKey ?? "(now)")}`);
    return memoryHouseBotIntents.staffChosenPlaced({
      houseBotId, fromIso: new Date(w.fromMs).toISOString(), toIso: new Date(w.toMs).toISOString(),
    });
  },
  async listFeed(filter) {
    const rows = [...memIntents.values()].filter(memFeedMatches(filter));
    if (filter.order === undefined) return memPage(rows, filter.cursor, filter.limit, filter.offset ?? 0);
    return memOrderedPage(rows, await memFeedOrder(filter.order, rows), filter.cursor, filter.limit, filter.offset ?? 0);
  },
  async countFeed(filter) {
    return [...memIntents.values()].filter(memFeedMatches(filter)).length;
  },
  async rankInFeed(filter, order, id) {
    const rows = [...memIntents.values()].filter(memFeedMatches(filter));
    const at = rows.sort(await memFeedOrder(order, rows)).findIndex((i) => i.id === id);
    return at < 0 ? null : at + 1;
  },
};

/**
 * `cancelLive` takes EXACTLY ONE scope. ⛔ There is no empty or combined scope: an unscoped
 * cancel would take every live intent on the platform, and that must be asked for by name
 * (`{ all: true }`, master OFF).
 */
function liveScopeFilter(scope: { houseBotId: string } | { targetId: string } | { all: true }): (i: StoredHouseBotIntent) => boolean {
  const keys = Object.keys(scope);
  if (keys.length !== 1) throw new Error("house-bot-dal: cancelLive takes exactly one scope");
  if ("all" in scope && scope.all === true) return () => true;
  if ("houseBotId" in scope && typeof scope.houseBotId === "string") return (i) => i.houseBotId === scope.houseBotId;
  if ("targetId" in scope && typeof scope.targetId === "string") return (i) => i.targetId === scope.targetId;
  throw new Error("house-bot-dal: cancelLive takes exactly one scope");
}

const TARGET_LIST_STATUSES: Record<TargetListStatus, readonly TargetStatus[]> = {
  active: ["ACTIVE"], ended: ["ENDED", "REMOVED"], all: ["ACTIVE", "ENDED", "REMOVED"],
};
const TARGET_PAGE_SIZE = 20;
const stoppedTarget = (t: StoredHouseBotTarget): boolean => t.status === "REMOVED" || t.endCause === "VETOED";

const memoryHouseBotTargets: HouseBotTargetStore = {
  async insert(row) {
    // One clock reading for both columns, as the SQL uses one now() (CC-10).
    const now = Date.now();
    return memWrite("HouseBotTarget", {
      ...row, productLine: "MARKET", status: "ACTIVE",
      createdAt: new Date(now).toISOString(), updatedAt: new Date(now).toISOString(),
      effectiveFrom: new Date(now + TARGET_ARMING_SEC * 1000).toISOString(),
      updatedById: row.createdById, version: 1, endedAt: null, endCause: null, removedAt: null, removedById: null,
    }, "insert");
  },
  async get(id) {
    const r = memTargets.get(id);
    return r ? clone(r) : null;
  },
  async getForUpdate(id) {
    const r = memTargets.get(id);
    return r ? clone(r) : null;
  },
  async casUpdate(id, baseVersion, patch, byId) {
    assertWritable("HouseBotTarget", patch, TARGET_TIMING_FIELDS);
    const cur = memTargets.get(id);
    if (!cur) return { ok: false, current: null };
    if (cur.status !== "ACTIVE" || cur.version !== baseVersion) return { ok: false, current: clone(cur) };
    return { ok: true, row: memUpdate("HouseBotTarget", cur, { ...defined(patch), version: cur.version + 1, updatedById: byId }) };
  },
  async remove(id, byId) {
    const cur = memTargets.get(id);
    if (!cur || cur.status !== "ACTIVE") return null;
    return memUpdate("HouseBotTarget", cur, { status: "REMOVED", removedAt: nowIso(), removedById: byId, updatedById: byId });
  },
  async endActive(targetId, cause) {
    const cur = memTargets.get(targetId);
    if (!cur || cur.status !== "ACTIVE") return null;
    return memUpdate("HouseBotTarget", cur, { status: "ENDED", endedAt: nowIso(), endCause: cause });
  },
  async endAllForBot(houseBotId, cause) {
    return memAtomic(() => [...memTargets.values()]
      .filter((t) => t.houseBotId === houseBotId && t.status === "ACTIVE")
      .sort((a, b) => ms(a.createdAt) - ms(b.createdAt))
      .map((t) => memUpdate("HouseBotTarget", t, { status: "ENDED", endedAt: nowIso(), endCause: cause })));
  },
  async veto(targetId) {
    const cur = memTargets.get(targetId);
    if (!cur) return null;
    if (cur.status === "ACTIVE") {
      return { row: memUpdate("HouseBotTarget", cur, { status: "ENDED", endedAt: nowIso(), endCause: "VETOED" }), previousEndCause: null };
    }
    if (cur.status === "ENDED" && cur.endCause !== "VETOED") {
      return { row: memUpdate("HouseBotTarget", cur, { endCause: "VETOED" }), previousEndCause: cur.endCause };
    }
    return null;
  },
  async listForBot(botId, status, cursor, opts) {
    const want = TARGET_LIST_STATUSES[status];
    const rows = [...memTargets.values()].filter((t) => t.houseBotId === botId && want.includes(t.status));
    if (opts?.order === undefined) return memPage(rows, cursor, opts?.limit ?? TARGET_PAGE_SIZE, opts?.offset ?? 0);
    return memOrderedPage(rows, memTargetOrder(opts.order), cursor, opts.limit ?? TARGET_PAGE_SIZE, opts.offset ?? 0);
  },
  async countForBot(botId, status) {
    const want = TARGET_LIST_STATUSES[status];
    return [...memTargets.values()].filter((t) => t.houseBotId === botId && want.includes(t.status)).length;
  },
  async listActive(opts) {
    return [...memTargets.values()]
      .filter((t) => t.status === "ACTIVE" && (opts?.createdAtOrBefore === undefined || ms(t.createdAt) <= ms(opts.createdAtOrBefore)))
      .sort((a, b) => ms(a.createdAt) - ms(b.createdAt))
      .map(clone);
  },
  async activeForMarket(marketId) {
    const r = [...memTargets.values()].find((t) => t.marketId === marketId && t.status === "ACTIVE");
    return r ? clone(r) : null;
  },
  async everStopped(marketId) {
    return [...memTargets.values()].some((t) => t.marketId === marketId && stoppedTarget(t));
  },
  async countActive({ botId }) {
    return [...memTargets.values()].filter((t) => t.status === "ACTIVE" && (botId === undefined || t.houseBotId === botId)).length;
  },
};

/** ENTER_NOW refusals whose press is audited (press flow step 6). */
const AUDITED_REFUSAL_CODES: readonly string[] = ["INFO_BLACKOUT", "OWNER_POSITION"];

const memoryHouseBotPresses: HouseBotPressStore = {
  async insertChecking(row) {
    const now = nowIso();
    try {
      return {
        ok: true,
        row: memWrite("HouseBotPress", {
          ...row, state: "CHECKING", code: null, auditId: null, auditClaimUntil: null, createdAt: now, updatedAt: now,
        }, "insert"),
      };
    } catch (e) {
      if (uniqueViolation(e) !== "hbp_actor_submit_uq") throw e;
      const existing = [...memPresses.values()].find((p) => p.actorId === row.actorId && p.submitId === row.submitId);
      if (!existing) throw e;
      return { ok: false, existing: clone(existing) };
    }
  },
  async get(id) {
    const r = memPresses.get(id);
    return r ? clone(r) : null;
  },
  async findByActorSubmit(actorId, submitId) {
    const r = [...memPresses.values()].find((p) => p.actorId === actorId && p.submitId === submitId);
    return r ? clone(r) : null;
  },
  async refuse(id, code) {
    const cur = memPresses.get(id);
    if (!cur || cur.state !== "CHECKING") return null;
    return memUpdate("HouseBotPress", cur, { state: "REFUSED", code });
  },
  async queue(id, intentId) {
    const cur = memPresses.get(id);
    if (!cur || cur.state !== "CHECKING") return null;
    return memUpdate("HouseBotPress", cur, { state: "QUEUED", intentId });
  },
  async doneEnterNow(intentId) {
    const cur = [...memPresses.values()].find((p) => p.intentId === intentId && p.state === "QUEUED");
    if (!cur) return null;
    return memUpdate("HouseBotPress", cur, { state: "DONE" });
  },
  async doneInTx(id, _tx, patch) {
    const cur = memPresses.get(id);
    if (!cur || cur.state !== "CHECKING") return null;
    return memUpdate("HouseBotPress", cur, { state: "DONE", ...(patch?.targetId !== undefined ? { targetId: patch.targetId } : {}) });
  },
  async doneTerminalQueued() {
    return memAtomic(() => [...memPresses.values()]
      .filter((p) => {
        if (p.state !== "QUEUED" || p.intentId == null) return false;
        const i = memIntents.get(p.intentId);
        return !!i && !LIVE_STATUSES.includes(i.status);
      })
      .map((p) => memUpdate("HouseBotPress", p, { state: "DONE" }).id));
  },
  async interruptStale() {
    const cutoff = Date.now() - PRESS_INTERRUPTED_AFTER_MS;
    return memAtomic(() => [...memPresses.values()]
      .filter((p) => p.state === "CHECKING" && ms(p.createdAt) < cutoff)
      .map((p) => memUpdate("HouseBotPress", p, { state: "REFUSED", code: PRESS_REFUSAL_INTERRUPTED }).id));
  },
  async claimAuditLease(id) {
    const now = Date.now();
    const cur = memPresses.get(id);
    if (!cur || cur.auditId != null || !(cur.auditClaimUntil == null || ms(cur.auditClaimUntil) < now)) return null;
    return memUpdate("HouseBotPress", cur, { auditClaimUntil: new Date(now + PRESS_AUDIT_LEASE_MS).toISOString() });
  },
  async setAuditId(id, auditId) {
    const cur = memPresses.get(id);
    if (!cur || cur.auditId != null) return false;
    memUpdate("HouseBotPress", cur, { auditId });
    return true;
  },
  async listAuditRepair(limit) {
    const now = Date.now();
    const events = [...memEvents.values()];
    return [...memPresses.values()]
      .filter((p) => p.auditId == null && (p.auditClaimUntil == null || ms(p.auditClaimUntil) < now)
        && ms(p.updatedAt) < now - PRESS_AUDIT_REPAIR_AFTER_MS)
      .filter((p) => p.purpose === "ENTER_NOW"
        ? p.state === "QUEUED" || p.state === "DONE" || (p.state === "REFUSED" && p.code != null && AUDITED_REFUSAL_CODES.includes(p.code))
        : p.state === "DONE" && events.some((e) => e.houseBotId === p.houseBotId && ms(e.createdAt) >= ms(p.createdAt)
          && field(e.payload ?? {}, "pressId") === p.id))
      .sort((a, b) => ms(a.updatedAt) - ms(b.updatedAt))
      .slice(0, pageLimit(limit))
      .map(clone);
  },
  async listRegister(filter) {
    return memPage([...memPresses.values()].filter((p) =>
      ms(p.createdAt) >= ms(filter.fromIso) && ms(p.createdAt) < ms(filter.toIso)
      && (filter.actorId === undefined || p.actorId === filter.actorId)
      && (filter.houseBotId === undefined || p.houseBotId === filter.houseBotId)), filter.cursor, filter.limit);
  },
};

/** The ledger rows that return money to a stake (R3). Payout, refund and cash-out amounts are
 *  positive. */
const RETURN_TXN_TYPES: readonly string[] = ["BET_PAYOUT", "BET_REFUND", "CASHOUT"];

/**
 * ⚠️ MEMORY ONLY, AND IT READS WHOLE TABLES — positions and transactions filtered in JS. It never
 * runs under Prisma, where the book is one GROUP BY over the marker indexes.
 */
const memoryHouseBook: HouseBookStore = {
  async dayRows({ fromIso, toIso, houseBotId }) {
    const from = ms(fromIso), to = ms(toIso);
    const pos = (await positionStore.values()).filter((p) => p.houseBotId != null
      && (houseBotId == null || p.houseBotId === houseBotId) && ms(p.placedAt) >= from && ms(p.placedAt) < to);
    const ids = new Set(pos.map((p) => p.id));
    const returned = new Map<string, number>();
    for (const t of await db.txn.listAll()) {
      if (t.houseBotId == null || t.status !== "CONFIRMED" || !RETURN_TXN_TYPES.includes(t.type)) continue;
      if (ms(t.createdAt) < from || t.positionId == null || !ids.has(t.positionId)) continue;
      returned.set(t.positionId, (returned.get(t.positionId) ?? 0) + t.amount);
    }
    const acc = new Map<string, HouseBookRawRow>();
    for (const p of pos) {
      const bot = p.houseBotId as string;
      const row = acc.get(bot) ?? { houseBotId: bot, bets: 0, staked: 0, openStake: 0, settledStake: 0, returned: 0 };
      row.bets += 1;
      row.staked += p.stake;
      if (p.status === "OPEN") row.openStake += p.stake;
      else row.settledStake += p.stake;
      row.returned += returned.get(p.id) ?? 0;
      acc.set(bot, row);
    }
    return [...acc.values()].sort((a, b) => (a.houseBotId < b.houseBotId ? -1 : 1));
  },
  async openExposure(houseBotId) {
    const acc = new Map<string, number>();
    for (const p of await positionStore.values()) {
      if (p.houseBotId == null || p.status !== "OPEN" || (houseBotId != null && p.houseBotId !== houseBotId)) continue;
      acc.set(p.houseBotId, (acc.get(p.houseBotId) ?? 0) + p.stake);
    }
    return [...acc.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([id, openStakeTzs]) => ({ houseBotId: id, openStakeTzs }));
  },
  async openExposureByMarket() {
    const acc = new Map<string, { openStakeTzs: number; bots: Set<string> }>();
    for (const p of await positionStore.values()) {
      if (p.houseBotId == null || p.status !== "OPEN") continue;
      const row = acc.get(p.marketId) ?? { openStakeTzs: 0, bots: new Set<string>() };
      row.openStakeTzs += p.stake;
      row.bots.add(p.houseBotId);
      acc.set(p.marketId, row);
    }
    return [...acc.entries()].sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([marketId, r]) => ({ marketId, openStakeTzs: r.openStakeTzs, bots: r.bots.size }));
  },
};

const HOUR_MS = 60 * 60 * 1000;
function emptyPoolSide(raw: number): LockedPoolSide {
  return { raw, nonHouse: 0, locked: 0, unlocked: 0, earliestLockAt: null, excluded: 0, lockedA15: 0, accounts: [] };
}

/** The ≥ 25% list plus the top account, largest first, ties by id (N1 §4.1: at most 4 rows). */
function pickAccounts(rows: Array<{ userId: string; lockedTzs: number }>, locked: number): Array<{ userId: string; lockedTzs: number }> {
  const sorted = rows.filter((r) => r.lockedTzs > 0).sort((a, b) => b.lockedTzs - a.lockedTzs || (a.userId < b.userId ? -1 : 1));
  return sorted.filter((r, i) => i === 0 || r.lockedTzs * 4 >= locked).slice(0, 4);
}

/**
 * ⚠️ MEMORY ONLY — whole-map scans, exactly like `memoryHouseBook`. Under Prisma each member is one
 * statement over the marker and `(marketId, status)` indexes.
 */
const memoryHouseSeam: HouseSeamStore = {
  async botUsage({ houseBotId, marketId }) {
    const now = Date.now();
    let lastPlacedAt: string | null = null;
    let placedLastHour = 0, placedLastDay = 0, countOnMarket = 0, stakeOnMarket = 0;
    for (const p of await positionStore.values()) {
      if (p.houseBotId !== houseBotId) continue;
      const at = ms(p.placedAt);
      if (lastPlacedAt == null || at > ms(lastPlacedAt)) lastPlacedAt = p.placedAt;
      if (at > now - HOUR_MS) placedLastHour++;
      if (at > now - DAY_MS) placedLastDay++;
      if (p.marketId === marketId) { countOnMarket++; stakeOnMarket += p.stake; }
    }
    return { lastPlacedAt: lastPlacedAt == null ? null : new Date(ms(lastPlacedAt)).toISOString(), placedLastHour, placedLastDay, countOnMarket, stakeOnMarket };
  },
  async marketUsage({ houseBotId, marketId }) {
    let otherBotOpen = false, houseOpenStakeTzs = 0;
    for (const p of await positionStore.listForMarket(marketId)) {
      if (p.houseBotId == null || p.status !== "OPEN") continue;
      houseOpenStakeTzs += p.stake;
      if (p.houseBotId !== houseBotId) otherBotOpen = true;
    }
    return { otherBotOpen, houseOpenStakeTzs };
  },
  async globalUsage() {
    const now = Date.now();
    let betsLastMinute = 0, betsLastDay = 0;
    for (const p of await positionStore.values()) {
      if (p.houseBotId == null) continue;
      const at = ms(p.placedAt);
      if (at > now - 60_000) betsLastMinute++;
      if (at > now - DAY_MS) betsLastDay++;
    }
    return { betsLastMinute, betsLastDay };
  },
  /**
   * ⛔ ONE PASS, AND NO PER-ROW ARRAY (ruling 351). The accumulator is a Map keyed by bot; nothing collects the
   * matching positions themselves, which is what separates this from `placedTimes`.
   */
  async botRateUsage({ houseBotId }) {
    const now = Date.now();
    const acc = new Map<string, HouseBotRateUsage>();
    for (const p of await positionStore.values()) {
      if (p.houseBotId == null || (houseBotId != null && p.houseBotId !== houseBotId)) continue;
      const at = ms(p.placedAt);
      const row = acc.get(p.houseBotId) ?? { houseBotId: p.houseBotId, placedLastHour: 0, placedLastDay: 0, lastPlacedAt: null };
      if (row.lastPlacedAt == null || at > ms(row.lastPlacedAt)) row.lastPlacedAt = new Date(at).toISOString();
      if (at > now - HOUR_MS) row.placedLastHour++;
      if (at > now - DAY_MS) row.placedLastDay++;
      acc.set(p.houseBotId, row);
    }
    return [...acc.values()].sort((a, b) => (a.houseBotId < b.houseBotId ? -1 : 1));
  },
  async placedTimes({ houseBotId, withinSec }) {
    const since = Date.now() - placedWindowSec(withinSec) * 1000;
    const out: number[] = [];
    for (const p of await positionStore.values()) {
      if (p.houseBotId == null || (houseBotId != null && p.houseBotId !== houseBotId)) continue;
      const at = ms(p.placedAt);
      if (at > since) out.push(at);
    }
    return out.sort((a, b) => b - a).map((t) => new Date(t).toISOString());
  },
  async counterpartyToday(userIds) {
    const w = eatDayWindow(eatDayKey(Date.now()));
    if (!w) throw new Error("house-bot-dal: could not compute the current EAT day");
    const acc = new Map<string, CounterpartyToday>(userIds.map((u) => [u, { userId: u, count: 0, tzs: 0 }]));
    for (const i of memIntents.values()) {
      if (i.status !== "PLACED" || i.finishedAt == null || ms(i.finishedAt) < w.fromMs || ms(i.finishedAt) >= w.toMs) continue;
      if (i.kind === "COUNTER" && i.triggerUserId != null && acc.has(i.triggerUserId)) {
        const e = acc.get(i.triggerUserId)!;
        e.count += 1; e.tzs += i.stakeTzs;
      } else if (i.kind === "MANUAL" && Array.isArray(i.decision.counterparties)) {
        for (const c of i.decision.counterparties as Array<{ userId?: unknown; attributedTzs?: unknown }>) {
          const e = typeof c.userId === "string" ? acc.get(c.userId) : undefined;
          if (!e) continue;
          e.count += 1; e.tzs += Number(c.attributedTzs ?? 0);
        }
      }
    }
    return userIds.map((u) => acc.get(u)!);
  },
  async lockedPool({ marketId, graceMs, paidMs, closesAt, asOf }) {
    const m = await marketStore.get(marketId);
    const out: LockedPool = { YES: emptyPoolSide(m?.yesPool ?? 0), NO: emptyPoolSide(m?.noPool ?? 0) };
    const clockMs = asOf ? ms(asOf) : Date.now();
    const closesMs = ms(closesAt);
    const liveHolders = new Set([...memBots.values()].filter((b) => b.status !== "REMOVED").map((b) => b.userId));
    const today = eatDayKey(Date.now());
    const perAccount: Record<"YES" | "NO", Map<string, number>> = { YES: new Map(), NO: new Map() };
    for (const p of await positionStore.listForMarket(marketId)) {
      if (p.status !== "OPEN" || p.houseBotId != null) continue;
      const s = out[p.side];
      const placedMs = ms(p.placedAt);
      const exitMs = graceMs > 0 && closesMs - placedMs >= graceMs ? placedMs + graceMs + paidMs : placedMs;
      s.nonHouse += p.stake;
      if (exitMs <= clockMs) s.lockedA15 += p.stake;
      const u = await db.user.findById(p.userId);
      const eligible = !!u && u.role === "PLAYER" && !liveHolders.has(u.id)
        && !memAlertOnce.has(`penalty:${u.id}:${today}`)
        && !(u.recruitedBy != null && liveHolders.has(u.recruitedBy));
      if (!eligible) { s.excluded += p.stake; continue; }
      if (exitMs <= clockMs - LOCK_MARGIN_MS) {
        s.locked += p.stake;
        perAccount[p.side].set(p.userId, (perAccount[p.side].get(p.userId) ?? 0) + p.stake);
      } else {
        s.unlocked += p.stake;
        const lockAt = new Date(exitMs + LOCK_MARGIN_MS).toISOString();
        if (s.earliestLockAt == null || lockAt < s.earliestLockAt) s.earliestLockAt = lockAt;
      }
    }
    for (const side of ["YES", "NO"] as const) {
      out[side].accounts = pickAccounts([...perAccount[side]].map(([userId, lockedTzs]) => ({ userId, lockedTzs })), out[side].locked);
    }
    return out;
  },
  async blackoutRow(marketId) {
    const m = await marketStore.get(marketId);
    if (!m) return null;
    return {
      status: m.status,
      sentinelOutcome: m.sentinelOutcome ?? null,
      sentinelConfidence: m.sentinelConfidence ?? null,
      sentinelDetermined: m.sentinelDetermined ?? null,
      sentinelClosedAt: m.sentinelClosedAt ?? null,
      resolvedOutcome: m.resolvedOutcome ?? null,
      resolutionStage1By: m.resolutionStage1By ?? null,
      resolveClaimedAt: m.resolveClaimedAt ?? null,
      reopenedAt: m.reopenedAt ?? null,
    };
  },
  async rawProductLine(marketId) {
    const m = await marketStore.get(marketId);
    return m ? (m.productLine as string) : null;
  },
  async roundLock(marketId) {
    const round = await roundStore.getByMarketId(marketId);
    const chain = round ? await chainStore.get(round.chainId) : null;
    return round && chain ? { opensAt: new Date(ms(round.opensAt)).toISOString(), durationMinutes: chain.durationMinutes } : null;
  },
  async marketView(marketId) {
    const m = await marketStore.get(marketId);
    if (!m) return null;
    const rates = snapshotOrLegacy(m.feeSnapshot);
    const round = await roundStore.getByMarketId(marketId);
    const chain = round ? await chainStore.get(round.chainId) : null;
    const asset = chain ? await assetStore.get(chain.assetId) : null;
    const at = (s: string | null | undefined) => (s ? new Date(ms(s)).toISOString() : null);
    return {
      id: m.id, productLine: m.productLine as string, category: m.category, status: m.status,
      yesPool: Number(m.yesPool), noPool: Number(m.noPool), selectionClosedAt: at(m.selectionClosedAt),
      resolutionAt: at(m.resolutionAt)!, createdAt: at(m.createdAt)!, titleEn: m.titleEn,
      exitGraceMin: rates.freeExitGraceMinutes, exitPaidMin: rates.paidExitWindowMinutes, reopenedAt: at(m.reopenedAt),
      round: round && chain ? {
        roundId: round.id, chainId: chain.id, chainKey: `${chain.assetId}:${chain.durationMinutes}`, roundNumber: round.roundNumber,
        opensAt: at(round.opensAt)!, durationMinutes: chain.durationMinutes, openPrice: round.openPrice, upTarget: round.upTarget,
        downTarget: round.downTarget, chainRunning: chain.state === "RUNNING", assetEnabled: asset?.enabled === true,
      } : null,
    };
  },
  async plannableMarkets({ kind, productLine, fromIso, toIso, after, limit }) {
    const from = ms(fromIso);
    const to = toIso == null ? Number.POSITIVE_INFINITY : ms(toIso);
    const out: Array<{ id: string; cutoff: string }> = [];
    for (const m of await marketStore.values()) {
      if (m.status !== "LIVE" || (m.productLine as string) !== productLine || m.reopenedAt != null || m.titleEn.startsWith(DEMO_PREFIX)) continue;
      let cutoffMs: number;
      if (productLine === "UPDOWN") {
        const round = await roundStore.getByMarketId(m.id);
        const chain = round ? await chainStore.get(round.chainId) : null;
        const asset = chain ? await assetStore.get(chain.assetId) : null;
        if (!round || !chain || chain.state !== "RUNNING" || asset?.enabled !== true) continue;
        cutoffMs = Math.min(ms(round.opensAt) + chain.durationMinutes * 60_000, ms(m.selectionClosedAt ?? m.resolutionAt));
      } else {
        if (!m.selectionClosedAt) continue;
        cutoffMs = ms(m.selectionClosedAt);
      }
      if (kind === "OPENER" && (Number(m.yesPool) !== 0 || Number(m.noPool) !== 0)) continue;
      if (!(cutoffMs > from) || cutoffMs > to) continue;
      const planned = [...memIntents.values()].some((i) => i.kind === kind && i.anchorKey === m.id && (i.status !== "CANCELLED" || i.reasonCode === "CANCELLED_BY_ADMIN"));
      if (planned) continue;
      out.push({ id: m.id, cutoff: new Date(cutoffMs).toISOString() });
    }
    const afterMs = after ? ms(after.cutoff) : null;
    return out
      .sort((a, b) => ms(a.cutoff) - ms(b.cutoff) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      .filter((r) => afterMs == null || ms(r.cutoff) > afterMs || (ms(r.cutoff) === afterMs && r.id > after!.id))
      .slice(0, Math.min(200, pageLimit(limit)));
  },
  async triggerPage({ fromIso, beforeIso, after, limit }) {
    const from = ms(fromIso);
    const before = ms(beforeIso);
    const anchored = new Set([...memIntents.values()].filter((i) => i.kind === "COUNTER").map((i) => i.anchorKey));
    const afterMs = after ? ms(after.placedAt) : null;
    const out: TriggerRow[] = [];
    for (const p of await positionStore.values()) {
      if (p.houseBotId != null || anchored.has(p.id)) continue;
      const at = ms(p.placedAt);
      if (!(at >= from && at <= before)) continue;
      if (afterMs != null && !(at > afterMs || (at === afterMs && p.id > after!.id))) continue;
      const m = await marketStore.get(p.marketId);
      if (!m || m.status !== "LIVE") continue;
      out.push({ id: p.id, userId: p.userId, marketId: p.marketId, side: p.side as IntentSide, stake: Number(p.stake), placedAt: new Date(at).toISOString(), status: p.status });
    }
    return out
      .sort((a, b) => ms(a.placedAt) - ms(b.placedAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      .slice(0, Math.min(200, pageLimit(limit)));
  },
  async triggerAccount(userId) {
    const u = await db.user.findById(userId);
    if (!u) return null;
    return { role: u.role, recruitedBy: u.recruitedBy ?? null, penaltyToday: memAlertOnce.has(`penalty:${u.id}:${eatDayKey(Date.now())}`) };
  },
  async intentFreshness(id) {
    const i = memIntents.get(id);
    return i ? { status: i.status, fresh: ms(i.staleAt) > Date.now() } : null;
  },
  async revertPlacedInMemory(id, positionId) {
    const i = memIntents.get(id);
    if (!i || i.status !== "PLACED" || i.positionId !== positionId) return false;
    memWrite("HouseBotIntent", { ...i, status: "CLAIMED", positionId: null, finishedAt: null }, "update");
    return true;
  },
};

// ---------------------------------------------------------------------------
// Prisma implementations
// ---------------------------------------------------------------------------

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
type RawRow = any;

// ⭐ The only two doors to Postgres in this file, so a unique violation always leaves named
// (`withUniqueName`; Prisma's raw 23505 message carries no index name).
async function sql(tx: HouseTx | undefined, text: string, values: readonly unknown[]): Promise<RawRow[]> {
  try {
    return await q(tx).$queryRawUnsafe<RawRow[]>(text, ...values);
  } catch (e) {
    throw withUniqueName(e, text);
  }
}
async function exec(tx: HouseTx | undefined, text: string, values: readonly unknown[]): Promise<number> {
  try {
    return await q(tx).$executeRawUnsafe(text, ...values);
  } catch (e) {
    throw withUniqueName(e, text);
  }
}

/** One keyset page, newest first by `("createdAt", "id")` (C7), optionally skipping `offset` rows first.
 *  ⛔ `offset` IS FOR A NUMBERED PAGER ONLY, and it is a SKIP, never a total: `pageLimit` clamps every list
 *  reader at 500 rows, so a caller that needs "how many are there" asks a COUNTING reader, never this one. */
async function sqlPage<R extends { createdAt: string; id: string }>(
  tx: HouseTx | undefined, table: HouseTable, where: string[], p: Params,
  cursor: KeysetCursor | null | undefined, limit: number, map: (r: RawRow) => R, offset = 0,
): Promise<Page<R>> {
  const n = pageLimit(limit);
  const skip = wholeArg("offset", offset);
  if (cursor) {
    where.push(`("createdAt", "id") < (${p.raw(new Date(ms(cursor.createdAt)).toISOString(), "timestamptz")}, ${p.raw(cursor.id, "text")})`);
  }
  const text = `SELECT * FROM "${table}" WHERE ${where.length ? where.join(" AND ") : "true"}`
    + ` ORDER BY "createdAt" DESC, "id" DESC LIMIT ${p.raw(n + 1, "int")} OFFSET ${p.raw(skip, "int")}`;
  const raws = await sql(tx, text, p.values);
  const rows = raws.slice(0, n).map(map);
  const last = rows[rows.length - 1];
  return { rows, nextCursor: raws.length > n && last ? { createdAt: last.createdAt, id: last.id } : null };
}

/**
 * ⭐ STEP 9 · ONE SORTED NUMBERED PAGE, POSTGRES SIDE — `memOrderedPage`'s twin. The order is a clause one of the named
 * builders below wrote (`feedOrderSql`, `eventOrderSql`, `targetOrderSql`) out of a CLOSED union: no caller's text reaches
 * it. ⛔ The DEFAULT order never comes through here — `sqlPage` above serves it, unchanged.
 * ⛔ No cursor, for the reason `SORTED_CURSOR_REFUSAL` states, refused with the memory twin's own words.
 */
async function sqlOrderedPage<R extends { createdAt: string; id: string }>(
  tx: HouseTx | undefined, table: HouseTable, where: string[], p: Params, orderSql: string,
  cursor: KeysetCursor | null | undefined, limit: number, map: (r: RawRow) => R, offset = 0,
): Promise<Page<R>> {
  if (cursor) throw new Error(SORTED_CURSOR_REFUSAL);
  const n = pageLimit(limit);
  const skip = wholeArg("offset", offset);
  const text = `SELECT * FROM "${table}" WHERE ${where.length ? where.join(" AND ") : "true"}`
    + ` ORDER BY ${orderSql} LIMIT ${p.raw(n, "int")} OFFSET ${p.raw(skip, "int")}`;
  return { rows: (await sql(tx, text, p.values)).map(map), nextCursor: null };
}

/** The Postgres words for a sort direction, from the closed pair and nothing else. */
const sqlDir = (d: ListSortDir): string => (d === "asc" ? "ASC" : "DESC");
/** The default order's clause — the tail every other order falls back to on a tie, exactly as `memNewestFirst`. */
const SQL_NEWEST_FIRST = `"createdAt" DESC, "id" DESC`;

/** An insert without the database-stamped times, so the column defaults write them. */
function withoutStamps<R extends object>(row: R): Record<string, unknown> {
  const copy = { ...row } as Record<string, unknown>;
  delete copy.createdAt;
  delete copy.updatedAt;
  return copy;
}

/**
 * `INSERT … ON CONFLICT ("key") DO UPDATE` for a runtime row: the patch's columns, plus `nowCols`
 * set to DB `now()`. ⚠️ This is the one write that does not go through `updateSql`, so it sets
 * `"updatedAt" = now()` itself on the update arm; the insert arm takes the column default.
 */
function runtimeUpsertSql(key: string, patch: Record<string, unknown>, nowCols: readonly string[], p: Params): string {
  const cols = [`"key"`];
  const vals = [p.raw(key, "text")];
  const sets: string[] = [];
  for (const [k, v] of Object.entries(patch)) {
    if (!RUNTIME_WRITABLE.includes(k)) throw new Error(`house-bot-dal: '${k}' is not a writable column`);
    if (v === undefined) continue;
    cols.push(`"${k}"`);
    vals.push(p.col("HouseBotRuntime", k, v));
    sets.push(`"${k}" = EXCLUDED."${k}"`);
  }
  for (const c of nowCols) {
    cols.push(`"${c}"`);
    vals.push("now()");
    sets.push(`"${c}" = EXCLUDED."${c}"`);
  }
  sets.push(`"updatedAt" = now()`);
  return `INSERT INTO "HouseBotRuntime" (${cols.join(", ")}) VALUES (${vals.join(", ")})`
    + ` ON CONFLICT ("key") DO UPDATE SET ${sets.join(", ")} RETURNING *`;
}

const prismaHouseBotControl: HouseBotControlStore = {
  async get(tx) {
    const rows = await sql(tx, `SELECT * FROM "HouseBotControl" WHERE "id" = $1::text`, [HOUSE_CONTROL_ID]);
    if (!rows[0]) throw new HouseSchemaNotReady(`HouseBotControl '${HOUSE_CONTROL_ID}'`);
    return toHouseBotControl(rows[0]);
  },
  async switchOff(input) {
    const p = new Params();
    const text = updateSql("HouseBotControl", [
      `"enabled" = false`,
      `"offCause" = ${p.col("HouseBotControl", "offCause", input.cause)}`,
      `"switchedAt" = now()`,
      `"switchedById" = ${p.col("HouseBotControl", "switchedById", input.byId)}`,
      `"switchedReason" = ${p.col("HouseBotControl", "switchedReason", input.reason)}`,
    ], `"id" = ${p.raw(HOUSE_CONTROL_ID, "text")} AND "enabled" = true`);
    const rows = await sql(null, text, p.values);
    return rows[0] ? toHouseBotControl(rows[0]) : null;
  },
  async markSunset(input) {
    const p = new Params();
    // ⛔ ONE placeholder for the cause, used by the SET and by the predicate, so the value written and the value
    // tested can never drift apart in a later edit.
    const sunset = p.col("HouseBotControl", "offCause", SUNSET_CAUSE);
    const text = updateSql("HouseBotControl", [
      `"enabled" = false`,
      `"offCause" = ${sunset}`,
      `"switchedAt" = now()`,
      `"switchedById" = ${p.col("HouseBotControl", "switchedById", input.byId)}`,
      `"switchedReason" = ${p.col("HouseBotControl", "switchedReason", input.reason)}`,
    ], `"id" = ${p.raw(HOUSE_CONTROL_ID, "text")} AND "offCause" IS DISTINCT FROM ${sunset}`);
    const rows = await sql(null, text, p.values);
    return rows[0] ? toHouseBotControl(rows[0]) : null;
  },
  async switchOn(input, tx) {
    const p = new Params();
    const text = updateSql("HouseBotControl", [
      `"enabled" = true`,
      `"offCause" = NULL`,
      `"switchedAt" = now()`,
      `"switchedById" = ${p.col("HouseBotControl", "switchedById", input.byId)}`,
      `"switchedReason" = ${p.col("HouseBotControl", "switchedReason", input.reason)}`,
    ], `"id" = ${p.raw(HOUSE_CONTROL_ID, "text")} AND "enabled" = false`);
    // One transaction: the control write and `global.scopeFrom` (ruling 92). A caller's tx is joined.
    return inTx(tx, async (t) => {
      const rows = await sql(t, text, p.values);
      if (!rows[0]) return null;
      await prismaHouseBotRuntime.setScopeFrom(RUNTIME_KEY.global, t);
      return toHouseBotControl(rows[0]);
    });
  },
  async saveLimits(baseVersion, patch, tx) {
    const p = new Params();
    const sets = patchSets("HouseBotControl", patch, LIMIT_FIELDS, p);
    sets.push(`"limitsVersion" = "limitsVersion" + 1`);
    const text = updateSql("HouseBotControl", sets,
      `"id" = ${p.raw(HOUSE_CONTROL_ID, "text")} AND "limitsVersion" = ${p.col("HouseBotControl", "limitsVersion", baseVersion)}`);
    const rows = await sql(tx, text, p.values);
    if (rows[0]) return { ok: true, row: toHouseBotControl(rows[0]) };
    return { ok: false, current: await prismaHouseBotControl.get(tx) };
  },
};

const PAUSED_ONLY_SQL = `"status" IN ('PAUSED', 'AUTO_PAUSED')`;

const prismaHouseBots: HouseBotStore = {
  async designate(input, tx) {
    return inTx(tx, async (t) => {
      const pb = new Params();
      const [raw] = await sql(t, insertSql("HouseBot", withoutStamps(designatedBot(input.bot, nowIso())), pb), pb.values);
      const bot = toHouseBot(raw);
      const pr = new Params();
      await sql(t, insertSql("HouseBotRuntime", { key: RUNTIME_KEY.bot(bot.id) }, pr, `ON CONFLICT ("key") DO NOTHING RETURNING "key"`), pr.values);
      const pe = new Params();
      await sql(t, insertSql("HouseBotEvent", {
        id: newHouseId("event"), houseBotId: bot.id, userId: bot.userId, marketId: null, kind: "DESIGNATED",
        fromStatus: null, toStatus: "PAUSED", reason: input.event.reason, actorId: input.event.actorId, payload: input.event.payload,
      }, pe), pe.values);
      return bot;
    });
  },
  async get(id, tx) {
    const rows = await sql(tx, `SELECT * FROM "HouseBot" WHERE "id" = $1::text`, [id]);
    return rows[0] ? toHouseBot(rows[0]) : null;
  },
  async findLiveByUserId(userId, tx) {
    const rows = await sql(tx, `SELECT * FROM "HouseBot" WHERE "userId" = $1::text AND "status" <> 'REMOVED' LIMIT 1`, [userId]);
    return rows[0] ? toHouseBot(rows[0]) : null;
  },
  async listByUserId(userId, tx) {
    const rows = await sql(tx, `SELECT * FROM "HouseBot" WHERE "userId" = $1::text ORDER BY "designatedAt" DESC`, [userId]);
    return rows.map(toHouseBot);
  },
  async listNonRemoved(tx) {
    const rows = await sql(tx, `SELECT * FROM "HouseBot" WHERE "status" <> 'REMOVED' ORDER BY "designatedAt" ASC`, []);
    return rows.map(toHouseBot);
  },
  async countLive(tx) {
    const rows = await sql(tx, `SELECT count(*)::int AS "n" FROM "HouseBot" WHERE "status" <> 'REMOVED'`, []);
    return Number(rows[0]?.n ?? 0);
  },
  async setStatus(id, input, tx) {
    const p = new Params();
    const sets = [
      `"status" = ${p.col("HouseBot", "status", input.to)}`,
      `"pauseReason" = ${p.col("HouseBot", "pauseReason", input.pauseReason)}`,
      `"pausedFromStatus" = ${p.col("HouseBot", "pausedFromStatus", input.pausedFromStatus)}`,
    ];
    if (input.pauseDetail !== undefined) sets.push(`"pauseDetail" = ${p.col("HouseBot", "pauseDetail", input.pauseDetail)}`);
    if (input.removal) {
      sets.push(
        `"removedAt" = now()`,
        `"removedById" = ${p.col("HouseBot", "removedById", input.removal.byId)}`,
        `"removedReason" = ${p.col("HouseBot", "removedReason", input.removal.reason)}`,
        `"removedCause" = ${p.col("HouseBot", "removedCause", input.removal.cause)}`,
      );
    }
    const text = updateSql("HouseBot", sets, `"id" = ${p.raw(id, "text")} AND "status" = ANY(${p.raw([...input.from], "text[]")})`);
    const rows = await sql(tx, text, p.values);
    return rows[0] ? toHouseBot(rows[0]) : null;
  },
  async saveRules(id, baseVersion, patch, tx) {
    const p = new Params();
    const sets = patchSets("HouseBot", patch, RULES_WRITABLE, p);
    sets.push(`"rulesVersion" = "rulesVersion" + 1`);
    const text = updateSql("HouseBot", sets,
      `"id" = ${p.raw(id, "text")} AND "rulesVersion" = ${p.col("HouseBot", "rulesVersion", baseVersion)}`);
    const rows = await sql(tx, text, p.values);
    if (rows[0]) return { ok: true, row: toHouseBot(rows[0]) };
    return { ok: false, current: await prismaHouseBots.get(id, tx) };
  },
  async setVerified(id, input, tx) {
    const p = new Params();
    const text = updateSql("HouseBot", [
      `"passwordFingerprint" = ${p.col("HouseBot", "passwordFingerprint", input.fingerprint)}`,
      `"verifiedAt" = ${p.col("HouseBot", "verifiedAt", input.verifiedAt)}`,
      `"verifiedById" = ${p.col("HouseBot", "verifiedById", input.verifiedById)}`,
      `"pausedFromStatus" = NULL`,
      `"credentialChangedAt" = NULL`,
      `"credentialChangedVia" = NULL`,
    ], `"id" = ${p.raw(id, "text")} AND ${PAUSED_ONLY_SQL}`);
    const rows = await sql(tx, text, p.values);
    return rows[0] ? toHouseBot(rows[0]) : null;
  },
  async setCredentialChanged(id, input, tx) {
    const p = new Params();
    const text = updateSql("HouseBot", [
      `"credentialChangedAt" = clock_timestamp()`,
      `"credentialChangedVia" = ${p.col("HouseBot", "credentialChangedVia", input.via)}`,
    ], `"id" = ${p.raw(id, "text")} AND ${PAUSED_ONLY_SQL}`);
    const rows = await sql(tx, text, p.values);
    return rows[0] ? toHouseBot(rows[0]) : null;
  },
  async setConsentVoid(id, cause, tx) {
    const p = new Params();
    const text = updateSql("HouseBot", [
      `"consentVoidAt" = GREATEST(clock_timestamp(), "verifiedAt" + interval '1 millisecond')`,
      `"consentVoidCause" = ${p.col("HouseBot", "consentVoidCause", cause)}`,
    ], `"id" = ${p.raw(id, "text")} AND ("consentVoidAt" IS NULL OR "verifiedAt" > "consentVoidAt")`);
    const rows = await sql(tx, text, p.values);
    return rows[0] ? toHouseBot(rows[0]) : null;
  },
  async upgradeConsentVoidCause(id, tx) {
    const p = new Params();
    const text = updateSql("HouseBot", [`"consentVoidCause" = 'HOLDER_WITHDREW'`],
      `"id" = ${p.raw(id, "text")} AND "consentVoidAt" IS NOT NULL AND NOT ("verifiedAt" > "consentVoidAt") AND "consentVoidCause" <> 'HOLDER_WITHDREW'`);
    const rows = await sql(tx, text, p.values);
    return rows[0] ? toHouseBot(rows[0]) : null;
  },
  async pseudonymiseForUser(userId, tx) {
    return inTx(tx, async (t) => {
      const bots = await sql(t, `SELECT "id", "status" FROM "HouseBot" WHERE "userId" = $1::text ORDER BY "designatedAt" FOR UPDATE`, [userId]);
      const live = bots.find((b) => b.status !== "REMOVED");
      if (live) return { ok: false as const, code: "house_bot_live" as const, botId: String(live.id) };
      if (bots.length === 0) return { ok: true as const, bots: 0, events: 0, presses: 0 };
      const ids = bots.map((b) => String(b.id));
      const pb = new Params();
      const erased = pb.raw(ERASED, "text");
      const botRows = await sql(t, updateSql("HouseBot", [
        `"label" = 'Erased ' || upper(right("id", 6))`,
        `"labelKey" = lower('erased ' || right("id", 6))`,
        `"note" = CASE WHEN "note" IS NULL THEN NULL ELSE ${erased} END`,
        `"removedReason" = CASE WHEN "removedReason" IS NULL THEN NULL ELSE ${erased} END`,
      ], `"userId" = ${pb.raw(userId, "text")}`, { returning: `"HouseBot"."id"` }), pb.values);
      const pe = new Params();
      const eventRows = await sql(t, updateSql("HouseBotEvent", [`"reason" = ${pe.raw(ERASED, "text")}`],
        `"houseBotId" = ANY(${pe.raw(ids, "text[]")}) AND "reason" IS NOT NULL AND "reason" <> $1::text`,
        { returning: `"HouseBotEvent"."id"` }), pe.values);
      const pp = new Params();
      const pressRows = await sql(t, updateSql("HouseBotPress", [`"reason" = ${pp.raw(ERASED, "text")}`],
        `"houseBotId" = ANY(${pp.raw(ids, "text[]")}) AND "reason" IS NOT NULL AND "reason" <> $1::text`,
        { returning: `"HouseBotPress"."id"` }), pp.values);
      return { ok: true as const, bots: botRows.length, events: eventRows.length, presses: pressRows.length };
    });
  },
};

/** The one counter statement behind `bumpHourCount` and `bumpRateLimited`: the EAT hour from DB
 *  `now()`, reset to 1 when the hour moved on, all in one atomic upsert (A24). */
function bumpHourSql(keyCol: "hourKey" | "rateLimitedHourKey", countCol: "countInHour" | "rateLimitedCount"): string {
  return `INSERT INTO "HouseBotRuntime" ("key", "${keyCol}", "${countCol}") VALUES ($1::text, ${EAT_SQL.hourKey}, 1)`
    + ` ON CONFLICT ("key") DO UPDATE SET`
    + ` "${countCol}" = CASE WHEN "HouseBotRuntime"."${keyCol}" = EXCLUDED."${keyCol}" THEN "HouseBotRuntime"."${countCol}" + 1 ELSE 1 END,`
    + ` "${keyCol}" = EXCLUDED."${keyCol}", "updatedAt" = now()`
    + ` RETURNING "${keyCol}" AS "hourKey", "${countCol}" AS "count"`;
}

const prismaHouseBotRuntime: HouseBotRuntimeStore = {
  async get(key, tx) {
    const rows = await sql(tx, `SELECT * FROM "HouseBotRuntime" WHERE "key" = $1::text`, [key]);
    return rows[0] ? toHouseBotRuntime(rows[0]) : null;
  },
  async upsert(key, patch, tx) {
    const p = new Params();
    const rows = await sql(tx, runtimeUpsertSql(key, patch, [], p), p.values);
    return toHouseBotRuntime(rows[0]);
  },
  async bumpErrorStreak() {
    const p = new Params();
    const rows = await sql(null, updateSql("HouseBotRuntime", [`"errorStreak" = "errorStreak" + 1`],
      `"key" = ${p.raw(RUNTIME_KEY.global, "text")}`, { returning: `"errorStreak"` }), p.values);
    if (!rows[0]) throw new HouseSchemaNotReady(`HouseBotRuntime '${RUNTIME_KEY.global}'`);
    return Number(rows[0].errorStreak);
  },
  async resetErrorStreak() {
    const p = new Params();
    const rows = await sql(null, updateSql("HouseBotRuntime", [`"errorStreak" = 0`, `"transientSince" = NULL`],
      `"key" = ${p.raw(RUNTIME_KEY.global, "text")}`, { returning: `"key"` }), p.values);
    if (!rows[0]) throw new HouseSchemaNotReady(`HouseBotRuntime '${RUNTIME_KEY.global}'`);
  },
  async markTransient() {
    const p = new Params();
    const rows = await sql(null, updateSql("HouseBotRuntime", [`"transientSince" = coalesce("transientSince", now())`],
      `"key" = ${p.raw(RUNTIME_KEY.global, "text")}`), p.values);
    if (!rows[0]) throw new HouseSchemaNotReady(`HouseBotRuntime '${RUNTIME_KEY.global}'`);
    return toHouseBotRuntime(rows[0]);
  },
  async bumpHourCount(key) {
    const rows = await sql(null, bumpHourSql("hourKey", "countInHour"), [key]);
    return { hourKey: String(rows[0].hourKey), count: Number(rows[0].count) };
  },
  async bumpRateLimited(key) {
    const rows = await sql(null, bumpHourSql("rateLimitedHourKey", "rateLimitedCount"), [key]);
    return { hourKey: String(rows[0].hourKey), count: Number(rows[0].count) };
  },
  async beat(key, extra) {
    const p = new Params();
    const rows = await sql(null, runtimeUpsertSql(key, extra ?? {}, ["beatAt"], p), p.values);
    return toHouseBotRuntime(rows[0]);
  },
  async boot(key, input) {
    const p = new Params();
    /* The twin of the memory store's own line, and the same reason: a landed boot ENDS a boot refusal (M4). */
    const rows = await sql(null, runtimeUpsertSql(key, { engineEnabled: input.engineEnabled, pollerErrorCode: null }, ["bootAt"], p), p.values);
    return toHouseBotRuntime(rows[0]);
  },
  async advanceSweep(placedAt, positionId) {
    const p = new Params();
    const at = p.col("HouseBotRuntime", "sweepPlacedAt", placedAt);
    const pid = p.col("HouseBotRuntime", "sweepPositionId", positionId);
    const text = updateSql("HouseBotRuntime", [`"sweepPlacedAt" = ${at}`, `"sweepPositionId" = ${pid}`],
      `"key" = ${p.raw(RUNTIME_KEY.global, "text")} AND ("sweepPlacedAt" IS NULL OR "sweepPlacedAt" < ${at}`
      + ` OR ("sweepPlacedAt" = ${at} AND ("sweepPositionId" IS NULL OR "sweepPositionId" < ${pid})))`,
      { returning: `"key"` });
    return (await sql(null, text, p.values)).length === 1;
  },
  async setScopeFrom(key, tx) {
    const p = new Params();
    const rows = await sql(tx, runtimeUpsertSql(key, {}, ["scopeFrom"], p), p.values);
    return toHouseBotRuntime(rows[0]);
  },
  async listInstances() {
    const rows = await sql(null, `SELECT * FROM "HouseBotRuntime" WHERE "key" LIKE 'engine:%' OR "key" LIKE 'beat:%' ORDER BY "key"`, []);
    return rows.map(toHouseBotRuntime);
  },
  async pruneInstanceRows() {
    return exec(null, `DELETE FROM "HouseBotRuntime" WHERE ("key" LIKE 'engine:%' OR "key" LIKE 'beat:poller:%')`
      + ` AND coalesce("beatAt", "bootAt", "updatedAt") < now() - interval '24 hours'`, []);
  },
  async dbClock() {
    const rows = await sql(null, `SELECT (extract(epoch FROM clock_timestamp()) * 1000)::float8 AS "nowMs"`, []);
    return { nowMs: Math.floor(Number(rows[0].nowMs)) };
  },
};

const prismaHouseBotAlertOnce: HouseBotAlertOnceStore = {
  async claim(key, tx) {
    const rows = await sql(tx, `INSERT INTO "HouseBotAlertOnce" ("key", "createdAt") VALUES ($1::text, now())`
      + ` ON CONFLICT ("key") DO NOTHING RETURNING "key"`, [key]);
    return rows.length === 1;
  },
  async release(key, tx) {
    await exec(tx ?? null, `DELETE FROM "HouseBotAlertOnce" WHERE "key" = $1::text`, [key]);
  },
  async claimWithEatSuffix(prefix, unit, tx) {
    // ⛔ The suffix is computed HERE, from DB now(), inside the same statement as the insert.
    const text = `WITH k AS (SELECT $1::text || ':' || ${EAT_SQL_BY_UNIT[unit]} AS "key"),`
      + ` ins AS (INSERT INTO "HouseBotAlertOnce" ("key", "createdAt") SELECT "key", now() FROM k`
      + ` ON CONFLICT ("key") DO NOTHING RETURNING "key")`
      + ` SELECT k."key" AS "key", (SELECT count(*) FROM ins)::int AS "claimed" FROM k`;
    const rows = await sql(tx, text, [prefix]);
    return { claimed: Number(rows[0].claimed) === 1, key: String(rows[0].key) };
  },
  async purgeBatch(olderThanDays = HOUSEBOT_ALERT_ONCE_RETENTION_DAYS, batch = HOUSEBOT_ALERT_ONCE_PURGE_BATCH) {
    return exec(null, `DELETE FROM "HouseBotAlertOnce" WHERE "key" IN (SELECT "key" FROM "HouseBotAlertOnce"`
      + ` WHERE "createdAt" < now() - ($1::int * interval '1 day') LIMIT $2::int)`,
      [wholeArg("olderThanDays", olderThanDays), wholeArg("batch", batch)]);
  },
};

/**
 * ⭐ THE HISTORY TAB'S ONE PREDICATE, POSTGRES SIDE (C7 step 5, ruling 317; ruling 177's shape).
 * `listAll` and `countAll` both build their `WHERE` from here, into the SAME `Params` the caller passes.
 * ⛔ The pager's `total` and the rows it pages are the one place a second-written condition is invisible: the
 * numbers agree on page 1 and disagree only at the end of the list. `test:dal-parity` 16.eventsShared pins it.
 */
function eventWhere(opts: { kinds?: readonly HouseBotEventKind[]; houseBotId?: string; fromIso?: string }, p: Params): string[] {
  const where: string[] = [];
  if (opts.kinds) where.push(`"kind" = ANY(${p.raw([...opts.kinds], "text[]")})`);
  if (opts.houseBotId !== undefined) where.push(`"houseBotId" = ${p.raw(opts.houseBotId, "text")}`);
  if (opts.fromIso !== undefined) where.push(`"createdAt" >= ${p.col("HouseBotEvent", "createdAt", opts.fromIso)}`);
  return where;
}

/**
 * ⭐ STEP 9 · THE HISTORY'S ONE ORDER, POSTGRES SIDE — `memEventOrder`'s twin, read by `listAll` and `rankInAll`. Absent
 * is the default clause the list always had. `account` ranks by the position of the row's account in the array the
 * console hands over; `array_position` of a NULL account (the desk's own events) or of one not in it is NULL, and
 * `NULLS LAST` puts both after every named account — the memory twin's `memKeyed` null.
 */
function eventOrderSql(order: EventListOrder | undefined, p: Params): string {
  if (order === undefined || (order.key === "when" && order.dir === "desc")) return SQL_NEWEST_FIRST;
  if (order.key === "when") return `"createdAt" ASC, "id" ASC`;
  return `array_position(${p.raw([...order.accountIds], "text[]")}, "houseBotId") ASC NULLS LAST, ${SQL_NEWEST_FIRST}`;
}

const prismaHouseBotEvents: HouseBotEventStore = {
  async append(e, tx) {
    const p = new Params();
    const rows = await sql(tx, insertSql("HouseBotEvent", { ...e, id: newHouseId("event") }, p), p.values);
    return toHouseBotEvent(rows[0]);
  },
  async setAuditId(id, auditId, tx) {
    const p = new Params();
    const text = updateSql("HouseBotEvent", [`"auditId" = ${p.col("HouseBotEvent", "auditId", auditId)}`],
      `"id" = ${p.raw(id, "text")} AND "auditId" IS NULL`, { returning: `"id"` });
    return (await sql(tx, text, p.values)).length === 1;
  },
  async get(id, tx) {
    const rows = await sql(tx, `SELECT * FROM "HouseBotEvent" WHERE "id" = $1::text`, [id]);
    return rows[0] ? toHouseBotEvent(rows[0]) : null;
  },
  async listByBot(houseBotId, opts, tx) {
    const p = new Params();
    const where = [`"houseBotId" = ${p.raw(houseBotId, "text")}`];
    if (opts.kinds) where.push(`"kind" = ANY(${p.raw([...opts.kinds], "text[]")})`);
    return sqlPage(tx, "HouseBotEvent", where, p, opts.cursor, opts.limit, toHouseBotEvent);
  },
  async listAll(opts, tx) {
    const p = new Params();
    const where = eventWhere(opts, p);
    const text = `SELECT * FROM "HouseBotEvent" WHERE ${where.length ? where.join(" AND ") : "true"}`
      + ` ORDER BY ${eventOrderSql(opts.order, p)} LIMIT ${p.raw(pageLimit(opts.limit), "int")}`
      + ` OFFSET ${p.raw(wholeArg("offset", opts.offset ?? 0), "int")}`;
    return (await sql(tx, text, p.values)).map(toHouseBotEvent);
  },
  async countAll(opts, tx) {
    const p = new Params();
    const where = eventWhere(opts, p);
    const rows = await sql(tx, `SELECT count(*)::int AS "n" FROM "HouseBotEvent" WHERE ${where.length ? where.join(" AND ") : "true"}`, p.values);
    return Number(rows[0]?.n ?? 0);
  },
  async rankInAll(opts, order, id, tx) {
    const p = new Params();
    const where = eventWhere(opts, p);
    const rows = await sql(tx, `SELECT r."n" FROM (SELECT "id", (row_number() OVER (ORDER BY ${eventOrderSql(order, p)}))::int AS "n"`
      + ` FROM "HouseBotEvent" WHERE ${where.length ? where.join(" AND ") : "true"}) r WHERE r."id" = ${p.raw(id, "text")}`, p.values);
    return rows[0] ? Number(rows[0].n) : null;
  },
  async listByKinds(kinds, opts, tx) {
    const p = new Params();
    const where = [`"kind" = ANY(${p.raw([...kinds], "text[]")})`];
    if (opts.houseBotId !== undefined) where.push(`"houseBotId" = ${p.raw(opts.houseBotId, "text")}`);
    if (opts.userId !== undefined) where.push(`"userId" = ${p.raw(opts.userId, "text")}`);
    if (opts.marketId !== undefined) where.push(`"marketId" = ${p.raw(opts.marketId, "text")}`);
    if (opts.sinceIso !== undefined) where.push(`"createdAt" >= ${p.col("HouseBotEvent", "createdAt", opts.sinceIso)}`);
    const text = `SELECT * FROM "HouseBotEvent" WHERE ${where.join(" AND ")}`
      + ` ORDER BY "createdAt" DESC, "id" DESC LIMIT ${p.raw(pageLimit(opts.limit), "int")}`;
    return (await sql(tx, text, p.values)).map(toHouseBotEvent);
  },
  async listForPress(press, tx) {
    // Bounded by the bot's (houseBotId, createdAt) index: the event is written in the
    // transaction that follows the press insert, so it is never older than the press.
    const rows = await sql(tx, `SELECT * FROM "HouseBotEvent" WHERE "houseBotId" = $1::text AND "createdAt" >= $2::timestamptz`
      + ` AND "payload"->>'pressId' = $3::text ORDER BY "createdAt", "id" LIMIT 50`,
    [press.houseBotId, bindValue("HouseBotPress", "createdAt", HOUSE_BOT_PRESS_COLUMNS.createdAt, press.createdAt), press.id]);
    return rows.map(toHouseBotEvent);
  },
  async drawOpenerSide(input) {
    const p = new Params();
    const text = insertSql("HouseBotEvent", {
      id: newHouseId("event"), houseBotId: input.houseBotId, userId: null, marketId: input.marketId, kind: "OPENER_SIDE_DRAWN",
      fromStatus: null, toStatus: null, reason: null, actorId: input.actorId,
      payload: { side: input.side, drawnFor: input.drawnFor },
    }, p, `ON CONFLICT ("marketId") WHERE "kind" = 'OPENER_SIDE_DRAWN' DO NOTHING RETURNING *`);
    const rows = await sql(null, text, p.values);
    if (rows[0]) return { side: input.side, eventId: String(rows[0].id), drawn: true };
    const existing = await prismaHouseBotEvents.findOpenerDraw(input.marketId);
    if (!existing) throw new Error("house-bot-dal: the opener draw conflicted but could not be read back");
    return { side: field(existing.payload ?? {}, "side") as IntentSide, eventId: existing.id, drawn: false };
  },
  async findOpenerDraw(marketId, tx) {
    const rows = await sql(tx, `SELECT * FROM "HouseBotEvent" WHERE "marketId" = $1::text AND "kind" = 'OPENER_SIDE_DRAWN' LIMIT 1`, [marketId]);
    return rows[0] ? toHouseBotEvent(rows[0]) : null;
  },
};

const LIVE_SQL = `"status" IN ('PENDING', 'CLAIMED')`;
const byCreatedAsc = <R extends { createdAt: string; id: string }>(a: R, b: R): number =>
  ms(a.createdAt) - ms(b.createdAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** The current EAT day as a `timestamptz` range computed from DB `now()` (N1 §2, A24). */
const EAT_TODAY_FROM_SQL = `(date_trunc('day', now() AT TIME ZONE '${EAT_SQL_TIMEZONE}') AT TIME ZONE '${EAT_SQL_TIMEZONE}')`;
const EAT_TODAY_TO_SQL = `((date_trunc('day', now() AT TIME ZONE '${EAT_SQL_TIMEZONE}') + interval '1 day') AT TIME ZONE '${EAT_SQL_TIMEZONE}')`;

async function staffChosenSums(tx: HouseTx | undefined, houseBotId: string | null, rangeSql: (p: Params) => string): Promise<{ count: number; stakeTzs: number }> {
  const p = new Params();
  const where = [STAFF_CHOSEN_SQL, `"status" = 'PLACED'`, rangeSql(p)];
  // A bot filter is a plain predicate, not `$n IS NULL OR …`, so the planner can use
  // hbi_staff_bot_finished_idx for one bot and hbi_staff_finished_idx for all.
  if (houseBotId != null) where.push(`"houseBotId" = ${p.raw(houseBotId, "text")}`);
  const rows = await sql(tx, `SELECT count(*)::int AS "n", coalesce(sum("stakeTzs"), 0)::text AS "tzs"`
    + ` FROM "HouseBotIntent" WHERE ${where.join(" AND ")}`, p.values);
  return { count: Number(rows[0]?.n ?? 0), stakeTzs: Number(rows[0]?.tzs ?? 0) };
}

/**
 * ⭐ THE ACTIVITY FEED'S ONE PREDICATE, POSTGRES SIDE (C7 step 5, ruling 345; ruling 177's shape).
 * `listFeed` and `countFeed` both build their `WHERE` from here, binding into the SAME `Params` the caller
 * passes — so the count and the page are measured over one condition with one set of bound values.
 * ⛔ Each facet is a plain predicate, never `$n IS NULL OR …`, for the reason `staffChosenSums` above states:
 * a three-valued disjunction hides the index from the planner. `test:dal-parity` 16.feedShared pins both members
 * onto this function.
 */
function feedWhere(filter: IntentFeedCount, p: Params): string[] {
  const where: string[] = [];
  if (filter.houseBotId !== undefined) where.push(`"houseBotId" = ${p.raw(filter.houseBotId, "text")}`);
  if (filter.productLine !== undefined) where.push(`"productLine" = ${p.raw(filter.productLine, "text")}`);
  if (filter.kinds) where.push(`"kind" = ANY(${p.raw([...filter.kinds], "text[]")})`);
  if (filter.statuses) where.push(`"status" = ANY(${p.raw([...filter.statuses], "text[]")})`);
  if (filter.targetId !== undefined) where.push(`"targetId" = ${p.raw(filter.targetId, "text")}`);
  if (filter.fromIso !== undefined) where.push(`"createdAt" >= ${p.col("HouseBotIntent", "createdAt", filter.fromIso)}`);
  if (filter.toIso !== undefined) where.push(`"createdAt" < ${p.col("HouseBotIntent", "createdAt", filter.toIso)}`);
  return where;
}

/**
 * ⭐ STEP 9 · THE ACTIVITY FEED'S ONE ORDER, POSTGRES SIDE — `memFeedOrder`'s twin, read by `listFeed` and `rankInFeed`.
 * ⛔ `outcome` ranks the chip the console paints: the row's POSITION result when it is one of `FEED_RESULT_STATUSES`,
 * otherwise the intent's own status, placed in `FEED_OUTCOME_ORDER` — both tables BOUND as arrays, so this clause and
 * the memory comparator read the same two lists. A key outside the table is NULL and sorts last, as in memory.
 */
function feedOrderSql(order: IntentFeedOrder, p: Params): string {
  if (order.key === "when") return order.dir === "desc" ? SQL_NEWEST_FIRST : `"createdAt" ASC, "id" ASC`;
  if (order.key === "stake") return `"stakeTzs" ${sqlDir(order.dir)}, ${SQL_NEWEST_FIRST}`;
  if (order.key === "account") return `array_position(${p.raw([...order.accountIds], "text[]")}, "houseBotId") ASC NULLS LAST, ${SQL_NEWEST_FIRST}`;
  const result = `(SELECT pos."status"::text FROM "Position" pos WHERE pos."id" = "HouseBotIntent"."positionId"`
    + ` AND pos."status"::text = ANY(${p.raw([...FEED_RESULT_STATUSES], "text[]")}))`;
  return `array_position(${p.raw([...FEED_OUTCOME_ORDER], "text[]")}, COALESCE(${result}, "status")) ${sqlDir(order.dir)} NULLS LAST, ${SQL_NEWEST_FIRST}`;
}

const prismaHouseBotIntents: HouseBotIntentStore = {
  async insert(row, tx) {
    const p = new Params();
    const rows = await sql(tx, insertSql("HouseBotIntent", withoutStamps(toIntentRow(row, "")), p), p.values);
    return toHouseBotIntent(rows[0]);
  },
  async insertIgnoringConflict(row, tx) {
    const p = new Params();
    const rows = await sql(tx, insertSql("HouseBotIntent", withoutStamps(toIntentRow(row, "")), p, anchorConflictSql(row.kind)), p.values);
    return rows[0] ? toHouseBotIntent(rows[0]) : null;
  },
  async insertTargetedIfActive(targetId, row, tx) {
    if (row.targetId !== targetId) throw new Error("house-bot-dal: insertTargetedIfActive row.targetId must equal targetId");
    return inTx(tx, async (t) => {
      const held = await sql(t, `SELECT 1 AS "ok" FROM "HouseBotTarget" WHERE "id" = $1::text AND "status" = 'ACTIVE' FOR SHARE`, [targetId]);
      if (held.length === 0) return { inserted: false, targetActive: false, row: null };
      const p = new Params();
      const rows = await sql(t, insertSql("HouseBotIntent", withoutStamps(toIntentRow(row, "")), p, anchorConflictSql(row.kind)), p.values);
      return rows[0]
        ? { inserted: true, targetActive: true, row: toHouseBotIntent(rows[0]) }
        : { inserted: false, targetActive: true, row: null };
    });
  },
  async get(id, tx) {
    const rows = await sql(tx, `SELECT * FROM "HouseBotIntent" WHERE "id" = $1::text`, [id]);
    return rows[0] ? toHouseBotIntent(rows[0]) : null;
  },
  async findByAnchor(kind, anchorKey, tx) {
    const rows = await sql(tx, `SELECT * FROM "HouseBotIntent" WHERE "kind" = $1::text AND "anchorKey" = $2::text`
      + ` ORDER BY "createdAt" DESC, "id" DESC LIMIT 1`, [kind, anchorKey]);
    return rows[0] ? toHouseBotIntent(rows[0]) : null;
  },
  async listLiveOnMarket(marketId, tx) {
    const rows = await sql(tx, `SELECT * FROM "HouseBotIntent" WHERE "marketId" = $1::text AND ${LIVE_SQL} ORDER BY "createdAt", "id"`, [marketId]);
    return rows.map(toHouseBotIntent);
  },
  async countLiveForTarget(targetId, tx) {
    const rows = await sql(tx, `SELECT count(*)::int AS "n" FROM "HouseBotIntent" WHERE "targetId" = $1::text AND ${LIVE_SQL}`, [targetId]);
    return Number(rows[0]?.n ?? 0);
  },
  async countPlacedForTarget(targetId, tx) {
    const rows = await sql(tx, `SELECT count(*)::int AS "n" FROM "HouseBotIntent" WHERE "targetId" = $1::text AND "status" = 'PLACED'`, [targetId]);
    return Number(rows[0]?.n ?? 0);
  },
  async placedCounterFor(userId, marketId, tx) {
    const rows = await sql(tx, `SELECT * FROM "HouseBotIntent" WHERE "triggerUserId" = $1::text AND "marketId" = $2::text`
      + ` AND "kind" = 'COUNTER' AND "status" = 'PLACED' ORDER BY "createdAt" DESC, "id" DESC LIMIT 1`, [userId, marketId]);
    return rows[0] ? toHouseBotIntent(rows[0]) : null;
  },
  async claimBatch({ me, freeSlots, skewGuardMs }) {
    if (freeSlots <= 0) return [];
    const p = new Params();
    const text = updateSql("HouseBotIntent", [
      `"status" = 'CLAIMED'`,
      `"claimedBy" = ${p.raw(me, "text")}`,
      `"claimedUntil" = now() + (${p.raw(CLAIM_TTL_SEC, "int")} * interval '1 second')`,
      `"attempts" = "attempts" + 1`,
    ], `"id" IN (SELECT "id" FROM "HouseBotIntent"`
      + ` WHERE (("status" = 'PENDING' AND "dueAt" <= now() - (${p.raw(wholeArg("skewGuardMs", skewGuardMs), "int")} * interval '1 millisecond')`
      + ` AND coalesce("nextAttemptAt", now()) <= now())`
      + ` OR ("status" = 'CLAIMED' AND "claimedUntil" < now()))`
      + ` AND "deadlineAt" > now() AND "staleAt" > now() AND "attempts" < ${p.raw(MAX_NON_TRANSIENT_ATTEMPTS, "int")}`
      + ` ORDER BY "dueAt" LIMIT ${p.raw(Math.floor(freeSlots), "int")} FOR UPDATE SKIP LOCKED)`);
    const rows = (await sql(null, text, p.values)).map(toHouseBotIntent);
    return rows.sort((a, b) => ms(a.dueAt) - ms(b.dueAt));
  },
  async claimById(id, me) {
    const p = new Params();
    const text = updateSql("HouseBotIntent", [
      `"status" = 'CLAIMED'`,
      `"claimedBy" = ${p.raw(me, "text")}`,
      `"claimedUntil" = now() + (${p.raw(CLAIM_TTL_SEC, "int")} * interval '1 second')`,
      `"attempts" = "attempts" + 1`,
    ], `"id" = ${p.raw(id, "text")} AND "status" = 'PENDING' AND "staleAt" > now() AND "deadlineAt" > now()`
      + ` AND "attempts" < ${p.raw(MAX_NON_TRANSIENT_ATTEMPTS, "int")}`);
    const rows = await sql(null, text, p.values);
    return rows[0] ? toHouseBotIntent(rows[0]) : null;
  },
  async heartbeat(id, me) {
    const p = new Params();
    const text = updateSql("HouseBotIntent", [`"claimedUntil" = now() + (${p.raw(CLAIM_TTL_SEC, "int")} * interval '1 second')`],
      `"id" = ${p.raw(id, "text")} AND "status" = 'CLAIMED' AND "claimedBy" = ${p.raw(me, "text")}`, { returning: `"id"` });
    return (await sql(null, text, p.values)).length === 1;
  },
  async markPlaced(id, positionId, tx, opts) {
    const p = new Params();
    const sets = [
      `"status" = 'PLACED'`,
      `"positionId" = ${p.col("HouseBotIntent", "positionId", positionId)}`,
      `"finishedAt" = now()`,
    ];
    if (opts?.counterparties) {
      sets.push(`"decision" = "decision" || jsonb_build_object('counterparties', ${p.raw(JSON.stringify(opts.counterparties), "jsonb")})`);
    }
    const text = updateSql("HouseBotIntent", sets,
      `"id" = ${p.raw(id, "text")} AND "status" = 'CLAIMED' AND "positionId" IS NULL`, { returning: `"id"` });
    return (await sql(tx, text, p.values)).length === 1;
  },
  async requeueTransient(id, me, backoffMs) {
    const p = new Params();
    const text = updateSql("HouseBotIntent", [
      `"status" = 'PENDING'`,
      `"claimedBy" = NULL`,
      `"claimedUntil" = NULL`,
      `"attempts" = "attempts" - 1`,
      `"transientAttempts" = "transientAttempts" + 1`,
      `"nextAttemptAt" = least(now() + (${p.raw(wholeArg("backoffMs", backoffMs), "int")} * interval '1 millisecond'), "staleAt" - interval '1 second')`,
    ], `"id" = ${p.raw(id, "text")} AND "status" = 'CLAIMED' AND "claimedBy" = ${p.raw(me, "text")}`
      + ` AND "staleAt" - interval '1 second' > now() AND "deadlineAt" > now()`);
    const rows = await sql(null, text, p.values);
    return rows[0] ? toHouseBotIntent(rows[0]) : null;
  },
  async defer(id, me, untilIso) {
    const p = new Params();
    const until = p.col("HouseBotIntent", "nextAttemptAt", untilIso);
    const text = updateSql("HouseBotIntent", [
      `"status" = 'PENDING'`,
      `"claimedBy" = NULL`,
      `"claimedUntil" = NULL`,
      `"attempts" = "attempts" - 1`,
      `"nextAttemptAt" = ${until}`,
    ], `"id" = ${p.raw(id, "text")} AND "status" = 'CLAIMED' AND "claimedBy" = ${p.raw(me, "text")} AND "staleAt" > ${until}`);
    const rows = await sql(null, text, p.values);
    return rows[0] ? toHouseBotIntent(rows[0]) : null;
  },
  async finish(id, me, input) {
    const p = new Params();
    const sets = [
      `"status" = ${p.col("HouseBotIntent", "status", input.status)}`,
      `"reasonCode" = ${p.col("HouseBotIntent", "reasonCode", input.reasonCode)}`,
      `"finishedAt" = now()`,
    ];
    if (input.why !== undefined) sets.push(`"why" = ${p.col("HouseBotIntent", "why", input.why)}`);
    const text = updateSql("HouseBotIntent", sets,
      `"id" = ${p.raw(id, "text")} AND "status" = 'CLAIMED' AND "claimedBy" = ${p.raw(me, "text")}`, { returning: `"id"` });
    return (await sql(null, text, p.values)).length === 1;
  },
  async cancelPending(id, reasonCode, tx) {
    const p = new Params();
    const text = updateSql("HouseBotIntent", [
      `"status" = 'CANCELLED'`,
      `"reasonCode" = ${p.col("HouseBotIntent", "reasonCode", reasonCode)}`,
      `"finishedAt" = now()`,
    ], `"id" = ${p.raw(id, "text")} AND "status" = 'PENDING'`);
    const rows = await sql(tx, text, p.values);
    return rows[0] ? toHouseBotIntent(rows[0]) : null;
  },
  async cancelLive(scope, reasonCode, tx) {
    liveScopeFilter(scope); // refuses an empty or combined scope before any SQL
    const p = new Params();
    const scopeSql = "all" in scope ? "true"
      : "houseBotId" in scope ? `"houseBotId" = ${p.raw(scope.houseBotId, "text")}`
        : `"targetId" = ${p.raw(scope.targetId, "text")}`;
    const text = updateSql("HouseBotIntent", [
      `"status" = 'CANCELLED'`,
      `"reasonCode" = ${p.col("HouseBotIntent", "reasonCode", reasonCode)}`,
      `"finishedAt" = now()`,
    ], `${LIVE_SQL} AND ${scopeSql}`);
    return (await sql(tx, text, p.values)).map(toHouseBotIntent).sort(byCreatedAsc);
  },
  async releaseClaims(me, excludeIds) {
    const p = new Params();
    const text = updateSql("HouseBotIntent", [
      `"status" = 'PENDING'`,
      `"claimedBy" = NULL`,
      `"claimedUntil" = NULL`,
      `"attempts" = greatest("attempts" - 1, 0)`,
    ], `"status" = 'CLAIMED' AND "claimedBy" = ${p.raw(me, "text")} AND NOT ("id" = ANY(${p.raw([...excludeIds], "text[]")}))`, { returning: `"id"` });
    return (await sql(null, text, p.values)).map((r) => String(r.id));
  },
  async clampStake(id, me, stakeTzs) {
    const p = new Params();
    const c = p.col("HouseBotIntent", "stakeTzs", stakeTzs);
    const text = updateSql("HouseBotIntent", [
      `"stakeTzs" = ${c}`,
      `"decision" = "decision" || jsonb_build_object('firedStakeTzs', ${c})`,
    ], `"id" = ${p.raw(id, "text")} AND "status" = 'CLAIMED' AND "claimedBy" = ${p.raw(me, "text")} AND "stakeTzs" > ${c}`);
    const rows = await sql(null, text, p.values);
    return rows[0] ? toHouseBotIntent(rows[0]) : null;
  },
  async expirePastDeadline() {
    const text = updateSql("HouseBotIntent", [`"status" = 'EXPIRED'`, `"reasonCode" = 'CUTOFF'`, `"finishedAt" = now()`],
      `"deadlineAt" <= now() AND ("status" = 'PENDING' OR ("status" = 'CLAIMED' AND "claimedUntil" < now()))`, { returning: `"id"` });
    return (await sql(null, text, [])).map((r) => String(r.id));
  },
  async expireStale() {
    const p = new Params();
    const text = updateSql("HouseBotIntent", [`"status" = 'EXPIRED'`, `"reasonCode" = 'STALE'`, `"finishedAt" = now()`],
      `("status" = 'PENDING' AND "staleAt" <= now())`
      + ` OR ("status" = 'CLAIMED' AND ${STAFF_CHOSEN_SQL}`
      + ` AND "staleAt" + (${p.raw(PLANNER_STALE_EXPIRY_GRACE_SEC, "int")} * interval '1 second') < now())`
      + ` OR ("status" = 'CLAIMED' AND NOT ${STAFF_CHOSEN_SQL} AND "claimedUntil" < now() AND "staleAt" <= now())`,
      { returning: `"id"` });
    return (await sql(null, text, p.values)).map((r) => String(r.id));
  },
  async poison() {
    const p = new Params();
    const text = updateSql("HouseBotIntent", [`"status" = 'FAILED'`, `"reasonCode" = 'POISON'`, `"finishedAt" = now()`],
      `"status" = 'CLAIMED' AND "claimedUntil" < now() AND "attempts" >= ${p.raw(MAX_NON_TRANSIENT_ATTEMPTS, "int")}`,
      { returning: `"id"` });
    return (await sql(null, text, p.values)).map((r) => String(r.id));
  },
  async listPendingMarketIds(limit) {
    const rows = await sql(null, `SELECT "marketId" FROM "HouseBotIntent" WHERE "status" = 'PENDING'`
      + ` GROUP BY "marketId" ORDER BY min("createdAt"), "marketId" LIMIT $1::int`, [pageLimit(limit)]);
    return rows.map((r) => String(r.marketId));
  },
  async skipPendingOnMarket(marketId, code, opts) {
    const p = new Params();
    const text = updateSql("HouseBotIntent", [
      `"status" = 'SKIPPED'`,
      `"reasonCode" = ${p.col("HouseBotIntent", "reasonCode", code)}`,
      `"finishedAt" = now()`,
    ], `"status" = 'PENDING' AND "marketId" = ${p.raw(marketId, "text")}${opts?.automatedOnly ? ` AND NOT ${STAFF_CHOSEN_SQL}` : ""}`,
    { returning: `"id"` });
    return (await sql(null, text, p.values)).map((r) => String(r.id));
  },
  async staffChosenPlacedSince({ sinceIso, limit }) {
    const p = new Params();
    const rows = await sql(null, `SELECT * FROM "HouseBotIntent" WHERE "status" = 'PLACED' AND ${STAFF_CHOSEN_SQL}`
      + ` AND "finishedAt" >= ${p.col("HouseBotIntent", "finishedAt", sinceIso)} ORDER BY "finishedAt", "id" LIMIT ${p.raw(pageLimit(limit), "int")}`, p.values);
    return rows.map(toHouseBotIntent);
  },
  async placedInWindow({ fromIso, toIso }) {
    const p = new Params();
    const rows = await sql(null, `SELECT "houseBotId", count(*)::int AS "n", coalesce(sum("stakeTzs"), 0)::text AS "tzs",`
      + ` (count(*) FILTER (WHERE ${STAFF_CHOSEN_SQL}))::int AS "sn", coalesce(sum("stakeTzs") FILTER (WHERE ${STAFF_CHOSEN_SQL}), 0)::text AS "stzs"`
      + ` FROM "HouseBotIntent" WHERE "status" = 'PLACED' AND "finishedAt" >= ${p.col("HouseBotIntent", "finishedAt", fromIso)}`
      + ` AND "finishedAt" < ${p.col("HouseBotIntent", "finishedAt", toIso)} GROUP BY "houseBotId" ORDER BY "houseBotId"`, p.values);
    return rows.map((r) => ({ houseBotId: String(r.houseBotId), count: Number(r.n), stakeTzs: Number(r.tzs), staffChosenCount: Number(r.sn), staffChosenTzs: Number(r.stzs) }));
  },
  async markAlerted(id) {
    const text = updateSql("HouseBotIntent", [`"alertedAt" = now()`],
      `"id" = $1::text AND "status" = 'PLACED' AND "alertedAt" IS NULL`, { returning: `"id"` });
    return (await sql(null, text, [id])).length === 1;
  },
  async listAlertRepair(limit) {
    const rows = await sql(null, `SELECT * FROM "HouseBotIntent" WHERE "status" = 'PLACED' AND "alertedAt" IS NULL`
      + ` AND "finishedAt" < now() - ($2::int * interval '1 millisecond') ORDER BY "finishedAt" LIMIT $1::int`,
      [pageLimit(limit), ALERT_REPAIR_AFTER_MS]);
    return rows.map(toHouseBotIntent);
  },
  async staffChosenPlaced({ houseBotId, fromIso, toIso }, tx) {
    return staffChosenSums(tx, houseBotId, (p) =>
      `"finishedAt" >= ${p.col("HouseBotIntent", "finishedAt", fromIso)} AND "finishedAt" < ${p.col("HouseBotIntent", "finishedAt", toIso)}`);
  },
  async staffChosenPlacedToday({ houseBotId, dayKey }, tx) {
    /* ⛔ A PASSED DAY IS BOUND, NOT RE-DERIVED (ruling 348). `EAT_TODAY_*_SQL` is the DATABASE CLOCK, which is
       the derivation 348 names by name as the wrong one for a console figure: the seam refuses on
       `eatDayKey(Date.now())`, so a console reading DB-today can disagree with the gate it is reporting on.
       With a key the window is the same one `staffChosenPlaced` binds, so the two twins cannot drift. */
    if (dayKey != null) {
      const w = eatDayWindow(dayKey);
      if (!w) throw new Error(`house-bot-dal: could not compute the EAT day ${JSON.stringify(dayKey)}`);
      const fromIso = new Date(w.fromMs).toISOString();
      const toIso = new Date(w.toMs).toISOString();
      return staffChosenSums(tx, houseBotId, (p) =>
        `"finishedAt" >= ${p.col("HouseBotIntent", "finishedAt", fromIso)} AND "finishedAt" < ${p.col("HouseBotIntent", "finishedAt", toIso)}`);
    }
    return staffChosenSums(tx, houseBotId, () => `"finishedAt" >= ${EAT_TODAY_FROM_SQL} AND "finishedAt" < ${EAT_TODAY_TO_SQL}`);
  },
  async listFeed(filter, tx) {
    const p = new Params();
    const where = feedWhere(filter, p);
    if (filter.order === undefined) return sqlPage(tx, "HouseBotIntent", where, p, filter.cursor, filter.limit, toHouseBotIntent, filter.offset ?? 0);
    return sqlOrderedPage(tx, "HouseBotIntent", where, p, feedOrderSql(filter.order, p), filter.cursor, filter.limit, toHouseBotIntent, filter.offset ?? 0);
  },
  async countFeed(filter, tx) {
    const p = new Params();
    const where = feedWhere(filter, p);
    const rows = await sql(tx, `SELECT count(*)::int AS "n" FROM "HouseBotIntent" WHERE ${where.length ? where.join(" AND ") : "true"}`, p.values);
    return Number(rows[0]?.n ?? 0);
  },
  async rankInFeed(filter, order, id, tx) {
    const p = new Params();
    const where = feedWhere(filter, p);
    const rows = await sql(tx, `SELECT r."n" FROM (SELECT "id", (row_number() OVER (ORDER BY ${feedOrderSql(order, p)}))::int AS "n"`
      + ` FROM "HouseBotIntent" WHERE ${where.length ? where.join(" AND ") : "true"}) r WHERE r."id" = ${p.raw(id, "text")}`, p.values);
    return rows[0] ? Number(rows[0].n) : null;
  },
};

const STOPPED_SQL = `("status" = 'REMOVED' OR "endCause" = 'VETOED')`;

/**
 * ⭐ STEP 9 · THE TARGETS GRID'S ONE ORDER, POSTGRES SIDE — `memTargetOrder`'s twin. The title is the target's own
 * stored snapshot, and only when it IS a JSON string (anything else is NULL and sorts last, as in memory); it is ordered
 * A–Z ignoring the case of A–Z (`translate`, which unlike `lower()` does not depend on the database's locale), then by
 * code point (`COLLATE "C"`) — `foldedCodePointOrder`, written in SQL.
 */
function targetOrderSql(order: TargetListOrder, p: Params): string {
  const d = sqlDir(order.dir);
  if (order.key === "status") return `array_position(${p.raw([...TARGET_STATUSES], "text[]")}, "status") ${d} NULLS LAST, ${SQL_NEWEST_FIRST}`;
  if (order.key === "lastChange") return `COALESCE("endedAt", "createdAt") ${d}, ${SQL_NEWEST_FIRST}`;
  const title = `(CASE WHEN jsonb_typeof("snapshot"->'titleEn') = 'string' THEN "snapshot"->>'titleEn' END)`;
  return `translate(${title}, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz') COLLATE "C" ${d} NULLS LAST,`
    + ` ${title} COLLATE "C" ${d} NULLS LAST, ${SQL_NEWEST_FIRST}`;
}

const prismaHouseBotTargets: HouseBotTargetStore = {
  async insert(row, tx) {
    // ⛔ Hand-written, not insertSql (CC-10): createdAt, updatedAt and effectiveFrom come from ONE
    // DB now() in this statement, so arming is measured on the same clock as the sweep's
    // watermark (N2 §4), never on this container's clock.
    const p = new Params();
    const by = p.col("HouseBotTarget", "createdById", row.createdById);
    const text = `INSERT INTO "HouseBotTarget" ("id", "houseBotId", "marketId", "productLine", "status", "delayMinSec", "delayMaxSec",`
      + ` "timingFrom", "reactTo", "createdAt", "effectiveFrom", "createdById", "updatedAt", "updatedById", "version", "snapshot")`
      + ` VALUES (${p.col("HouseBotTarget", "id", row.id)}, ${p.col("HouseBotTarget", "houseBotId", row.houseBotId)},`
      + ` ${p.col("HouseBotTarget", "marketId", row.marketId)}, 'MARKET', 'ACTIVE',`
      + ` ${p.col("HouseBotTarget", "delayMinSec", row.delayMinSec)}, ${p.col("HouseBotTarget", "delayMaxSec", row.delayMaxSec)},`
      + ` ${p.col("HouseBotTarget", "timingFrom", row.timingFrom)}, ${p.col("HouseBotTarget", "reactTo", row.reactTo)},`
      + ` now(), now() + (${p.raw(TARGET_ARMING_SEC, "int")} * interval '1 second'), ${by}, now(), ${by}, 1,`
      + ` ${p.col("HouseBotTarget", "snapshot", row.snapshot)}) RETURNING *`;
    const rows = await sql(tx, text, p.values);
    return toHouseBotTarget(rows[0]);
  },
  async get(id, tx) {
    const rows = await sql(tx, `SELECT * FROM "HouseBotTarget" WHERE "id" = $1::text`, [id]);
    return rows[0] ? toHouseBotTarget(rows[0]) : null;
  },
  async getForUpdate(id, tx) {
    const rows = await sql(tx, `SELECT * FROM "HouseBotTarget" WHERE "id" = $1::text FOR UPDATE`, [id]);
    return rows[0] ? toHouseBotTarget(rows[0]) : null;
  },
  async casUpdate(id, baseVersion, patch, byId, tx) {
    const p = new Params();
    const sets = patchSets("HouseBotTarget", patch, TARGET_TIMING_FIELDS, p);
    sets.push(`"version" = "version" + 1`, `"updatedById" = ${p.col("HouseBotTarget", "updatedById", byId)}`);
    const text = updateSql("HouseBotTarget", sets,
      `"id" = ${p.raw(id, "text")} AND "status" = 'ACTIVE' AND "version" = ${p.col("HouseBotTarget", "version", baseVersion)}`);
    const rows = await sql(tx, text, p.values);
    if (rows[0]) return { ok: true, row: toHouseBotTarget(rows[0]) };
    return { ok: false, current: await prismaHouseBotTargets.get(id, tx) };
  },
  async remove(id, byId, tx) {
    const p = new Params();
    const by = p.col("HouseBotTarget", "removedById", byId);
    const text = updateSql("HouseBotTarget", [`"status" = 'REMOVED'`, `"removedAt" = now()`, `"removedById" = ${by}`, `"updatedById" = ${by}`],
      `"id" = ${p.raw(id, "text")} AND "status" = 'ACTIVE'`);
    const rows = await sql(tx, text, p.values);
    return rows[0] ? toHouseBotTarget(rows[0]) : null;
  },
  async endActive(targetId, cause, tx) {
    const p = new Params();
    const text = updateSql("HouseBotTarget",
      [`"status" = 'ENDED'`, `"endedAt" = now()`, `"endCause" = ${p.col("HouseBotTarget", "endCause", cause)}`],
      `"id" = ${p.raw(targetId, "text")} AND "status" = 'ACTIVE'`);
    const rows = await sql(tx, text, p.values);
    return rows[0] ? toHouseBotTarget(rows[0]) : null;
  },
  async endAllForBot(houseBotId, cause, tx) {
    const p = new Params();
    const text = updateSql("HouseBotTarget",
      [`"status" = 'ENDED'`, `"endedAt" = now()`, `"endCause" = ${p.col("HouseBotTarget", "endCause", cause)}`],
      `"houseBotId" = ${p.raw(houseBotId, "text")} AND "status" = 'ACTIVE'`);
    return (await sql(tx, text, p.values)).map(toHouseBotTarget).sort(byCreatedAsc);
  },
  async veto(targetId, tx) {
    const text = updateSql("HouseBotTarget",
      [`"status" = 'ENDED'`, `"endCause" = 'VETOED'`, `"endedAt" = coalesce("HouseBotTarget"."endedAt", now())`],
      `"HouseBotTarget"."id" = prev."id" AND (prev."status" = 'ACTIVE' OR (prev."status" = 'ENDED' AND prev."endCause" <> 'VETOED'))`,
      {
        with: `prev AS (SELECT "id", "status", "endCause" FROM "HouseBotTarget" WHERE "id" = $1::text)`,
        from: "prev",
        returning: `"HouseBotTarget".*, prev."endCause" AS "previousEndCause"`,
      });
    const rows = await sql(tx, text, [targetId]);
    if (!rows[0]) return null;
    return { row: toHouseBotTarget(rows[0]), previousEndCause: rows[0].previousEndCause ?? null };
  },
  async listForBot(botId, status, cursor, opts, tx) {
    const p = new Params();
    const where = [`"houseBotId" = ${p.raw(botId, "text")}`, `"status" = ANY(${p.raw([...TARGET_LIST_STATUSES[status]], "text[]")})`];
    if (opts?.order === undefined) return sqlPage(tx, "HouseBotTarget", where, p, cursor, opts?.limit ?? TARGET_PAGE_SIZE, toHouseBotTarget, opts?.offset ?? 0);
    return sqlOrderedPage(tx, "HouseBotTarget", where, p, targetOrderSql(opts.order, p), cursor, opts.limit ?? TARGET_PAGE_SIZE, toHouseBotTarget, opts.offset ?? 0);
  },
  async countForBot(botId, status, tx) {
    const p = new Params();
    const where = [`"houseBotId" = ${p.raw(botId, "text")}`, `"status" = ANY(${p.raw([...TARGET_LIST_STATUSES[status]], "text[]")})`];
    const rows = await sql(tx, `SELECT count(*)::int AS "n" FROM "HouseBotTarget" WHERE ${where.join(" AND ")}`, p.values);
    return Number(rows[0]?.n ?? 0);
  },
  async listActive(opts, tx) {
    const p = new Params();
    const where = [`"status" = 'ACTIVE'`];
    if (opts?.createdAtOrBefore !== undefined) where.push(`"createdAt" <= ${p.col("HouseBotTarget", "createdAt", opts.createdAtOrBefore)}`);
    const rows = await sql(tx, `SELECT * FROM "HouseBotTarget" WHERE ${where.join(" AND ")} ORDER BY "createdAt", "id"`, p.values);
    return rows.map(toHouseBotTarget);
  },
  async activeForMarket(marketId, tx) {
    const rows = await sql(tx, `SELECT * FROM "HouseBotTarget" WHERE "marketId" = $1::text AND "status" = 'ACTIVE' LIMIT 1`, [marketId]);
    return rows[0] ? toHouseBotTarget(rows[0]) : null;
  },
  async everStopped(marketId, tx) {
    const rows = await sql(tx, `SELECT EXISTS (SELECT 1 FROM "HouseBotTarget" WHERE "marketId" = $1::text AND ${STOPPED_SQL}) AS "stopped"`, [marketId]);
    return rows[0]?.stopped === true;
  },
  async countActive({ botId }, tx) {
    const p = new Params();
    const where = [`"status" = 'ACTIVE'`];
    if (botId !== undefined) where.push(`"houseBotId" = ${p.raw(botId, "text")}`);
    const rows = await sql(tx, `SELECT count(*)::int AS "n" FROM "HouseBotTarget" WHERE ${where.join(" AND ")}`, p.values);
    return Number(rows[0]?.n ?? 0);
  },
};

const prismaHouseBotPresses: HouseBotPressStore = {
  async insertChecking(row, tx) {
    const p = new Params();
    try {
      const rows = await sql(tx, insertSql("HouseBotPress", { ...row, state: "CHECKING", code: null, auditId: null, auditClaimUntil: null }, p), p.values);
      return { ok: true, row: toHouseBotPress(rows[0]) };
    } catch (e) {
      if (uniqueViolation(e) !== "hbp_actor_submit_uq") throw e;
      // Read the winner on its own connection: a caller's transaction is aborted by the violation.
      const existing = await prismaHouseBotPresses.findByActorSubmit(row.actorId, row.submitId);
      if (!existing) throw e;
      return { ok: false, existing };
    }
  },
  async get(id, tx) {
    const rows = await sql(tx, `SELECT * FROM "HouseBotPress" WHERE "id" = $1::text`, [id]);
    return rows[0] ? toHouseBotPress(rows[0]) : null;
  },
  async findByActorSubmit(actorId, submitId, tx) {
    const rows = await sql(tx, `SELECT * FROM "HouseBotPress" WHERE "actorId" = $1::text AND "submitId" = $2::text`, [actorId, submitId]);
    return rows[0] ? toHouseBotPress(rows[0]) : null;
  },
  async refuse(id, code, tx) {
    const p = new Params();
    const text = updateSql("HouseBotPress", [`"state" = 'REFUSED'`, `"code" = ${p.col("HouseBotPress", "code", code)}`],
      `"id" = ${p.raw(id, "text")} AND "state" = 'CHECKING'`);
    const rows = await sql(tx, text, p.values);
    return rows[0] ? toHouseBotPress(rows[0]) : null;
  },
  async queue(id, intentId, tx) {
    const p = new Params();
    const text = updateSql("HouseBotPress", [`"state" = 'QUEUED'`, `"intentId" = ${p.col("HouseBotPress", "intentId", intentId)}`],
      `"id" = ${p.raw(id, "text")} AND "state" = 'CHECKING'`);
    const rows = await sql(tx, text, p.values);
    return rows[0] ? toHouseBotPress(rows[0]) : null;
  },
  async doneEnterNow(intentId, tx) {
    const p = new Params();
    const text = updateSql("HouseBotPress", [`"state" = 'DONE'`],
      `"intentId" = ${p.raw(intentId, "text")} AND "state" = 'QUEUED'`);
    const rows = await sql(tx, text, p.values);
    return rows[0] ? toHouseBotPress(rows[0]) : null;
  },
  async doneInTx(id, tx, patch) {
    const p = new Params();
    const sets = [`"state" = 'DONE'`];
    if (patch?.targetId !== undefined) sets.push(`"targetId" = ${p.col("HouseBotPress", "targetId", patch.targetId)}`);
    const text = updateSql("HouseBotPress", sets, `"id" = ${p.raw(id, "text")} AND "state" = 'CHECKING'`);
    const rows = await sql(tx, text, p.values);
    return rows[0] ? toHouseBotPress(rows[0]) : null;
  },
  async doneTerminalQueued() {
    const text = updateSql("HouseBotPress", [`"state" = 'DONE'`],
      `"state" = 'QUEUED' AND EXISTS (SELECT 1 FROM "HouseBotIntent" i WHERE i."id" = "HouseBotPress"."intentId"`
      + ` AND i."status" NOT IN ('PENDING', 'CLAIMED'))`, { returning: `"HouseBotPress"."id"` });
    return (await sql(null, text, [])).map((r) => String(r.id));
  },
  async interruptStale() {
    const p = new Params();
    const text = updateSql("HouseBotPress", [`"state" = 'REFUSED'`, `"code" = ${p.raw(PRESS_REFUSAL_INTERRUPTED, "text")}`],
      `"state" = 'CHECKING' AND "createdAt" < now() - (${p.raw(PRESS_INTERRUPTED_AFTER_MS, "int")} * interval '1 millisecond')`,
      { returning: `"HouseBotPress"."id"` });
    return (await sql(null, text, p.values)).map((r) => String(r.id));
  },
  async claimAuditLease(id) {
    const p = new Params();
    const text = updateSql("HouseBotPress",
      [`"auditClaimUntil" = now() + (${p.raw(PRESS_AUDIT_LEASE_MS, "int")} * interval '1 millisecond')`],
      `"id" = ${p.raw(id, "text")} AND "auditId" IS NULL AND ("auditClaimUntil" IS NULL OR "auditClaimUntil" < now())`);
    const rows = await sql(null, text, p.values);
    return rows[0] ? toHouseBotPress(rows[0]) : null;
  },
  async setAuditId(id, auditId) {
    const p = new Params();
    const text = updateSql("HouseBotPress", [`"auditId" = ${p.col("HouseBotPress", "auditId", auditId)}`],
      `"id" = ${p.raw(id, "text")} AND "auditId" IS NULL`, { returning: `"HouseBotPress"."id"` });
    return (await sql(null, text, p.values)).length === 1;
  },
  async listAuditRepair(limit) {
    // The sealed scope (N1 §2 press flow step 6): Enter now presses queued, done, or refused for
    // an audited code; target and cancel presses done with an event carrying their pressId.
    const text = `SELECT p.* FROM "HouseBotPress" p`
      + ` WHERE p."auditId" IS NULL AND (p."auditClaimUntil" IS NULL OR p."auditClaimUntil" < now())`
      + ` AND p."updatedAt" < now() - ($1::int * interval '1 millisecond')`
      + ` AND ((p."purpose" = 'ENTER_NOW' AND (p."state" IN ('QUEUED', 'DONE') OR (p."state" = 'REFUSED' AND p."code" = ANY($2::text[]))))`
      + ` OR (p."purpose" <> 'ENTER_NOW' AND p."state" = 'DONE' AND EXISTS (SELECT 1 FROM "HouseBotEvent" e`
      + ` WHERE e."houseBotId" = p."houseBotId" AND e."createdAt" >= p."createdAt" AND e."payload"->>'pressId' = p."id")))`
      + ` ORDER BY p."updatedAt" LIMIT $3::int`;
    const rows = await sql(null, text, [PRESS_AUDIT_REPAIR_AFTER_MS, [...AUDITED_REFUSAL_CODES], pageLimit(limit)]);
    return rows.map(toHouseBotPress);
  },
  async listRegister(filter, tx) {
    const p = new Params();
    const where = [
      `"createdAt" >= ${p.col("HouseBotPress", "createdAt", filter.fromIso)}`,
      `"createdAt" < ${p.col("HouseBotPress", "createdAt", filter.toIso)}`,
    ];
    if (filter.actorId !== undefined) where.push(`"actorId" = ${p.raw(filter.actorId, "text")}`);
    if (filter.houseBotId !== undefined) where.push(`"houseBotId" = ${p.raw(filter.houseBotId, "text")}`);
    return sqlPage(tx, "HouseBotPress", where, p, filter.cursor, filter.limit, toHouseBotPress);
  },
};

/**
 * The house book over the MARKERS (R3): stakes from marked positions, returned money only from
 * marked, CONFIRMED payout, refund and cash-out rows. One GROUP BY for every bot (A24), served by
 * the partial Position (houseBotId, placedAt) and Transaction (createdAt) marker indexes.
 * Position and Transaction times are naive UTC, hence `::timestamp` (as `market-dal.ts` does).
 * It writes nothing.
 */
const prismaHouseBook: HouseBookStore = {
  async dayRows({ fromIso, toIso, houseBotId }, tx) {
    const from = bindValue("HouseBotIntent", "createdAt", HOUSE_BOT_INTENT_COLUMNS.createdAt, fromIso);
    const to = bindValue("HouseBotIntent", "createdAt", HOUSE_BOT_INTENT_COLUMNS.createdAt, toIso);
    const text = `WITH pos AS (SELECT "id", "houseBotId", "stake", "status" FROM "Position"`
      + ` WHERE "houseBotId" IS NOT NULL AND "placedAt" >= $1::timestamp AND "placedAt" < $2::timestamp`
      + ` AND ($3::text IS NULL OR "houseBotId" = $3::text)),`
      + ` ret AS (SELECT t."positionId", sum(t."amount") AS "returned" FROM "Transaction" t`
      + ` WHERE t."houseBotId" IS NOT NULL AND t."createdAt" >= $1::timestamp AND t."status"::text = 'CONFIRMED'`
      + ` AND t."type"::text IN ('BET_PAYOUT', 'BET_REFUND', 'CASHOUT') AND t."positionId" IN (SELECT "id" FROM pos)`
      + ` GROUP BY t."positionId")`
      + ` SELECT pos."houseBotId" AS "houseBotId", count(*)::int AS "bets", coalesce(sum(pos."stake"), 0)::text AS "staked",`
      + ` coalesce(sum(pos."stake") FILTER (WHERE pos."status"::text = 'OPEN'), 0)::text AS "openStake",`
      + ` coalesce(sum(pos."stake") FILTER (WHERE pos."status"::text <> 'OPEN'), 0)::text AS "settledStake",`
      + ` coalesce(sum(ret."returned"), 0)::text AS "returned"`
      + ` FROM pos LEFT JOIN ret ON ret."positionId" = pos."id" GROUP BY pos."houseBotId" ORDER BY pos."houseBotId"`;
    const rows = await sql(tx, text, [from, to, houseBotId]);
    return rows.map((r) => ({
      houseBotId: String(r.houseBotId), bets: Number(r.bets), staked: Number(r.staked),
      openStake: Number(r.openStake), settledStake: Number(r.settledStake), returned: Number(r.returned),
    }));
  },
  async openExposure(houseBotId, tx) {
    const rows = await sql(tx, `SELECT "houseBotId" AS "houseBotId", coalesce(sum("stake"), 0)::text AS "open" FROM "Position"`
      + ` WHERE "houseBotId" IS NOT NULL AND "status"::text = 'OPEN' AND ($1::text IS NULL OR "houseBotId" = $1::text)`
      + ` GROUP BY "houseBotId" ORDER BY "houseBotId"`, [houseBotId]);
    return rows.map((r) => ({ houseBotId: String(r.houseBotId), openStakeTzs: Number(r.open) }));
  },
  async openExposureByMarket(tx) {
    const rows = await sql(tx, `SELECT "marketId" AS "marketId", coalesce(sum("stake"), 0)::text AS "open",`
      + ` count(DISTINCT "houseBotId")::int AS "bots" FROM "Position"`
      + ` WHERE "houseBotId" IS NOT NULL AND "status"::text = 'OPEN'`
      + ` GROUP BY "marketId" ORDER BY "marketId"`, []);
    return rows.map((r) => ({ marketId: String(r.marketId), openStakeTzs: Number(r.open), bots: Number(r.bots) }));
  },
};

/** The database clock as a naive-UTC timestamp, comparable with Position times (PLAN §2). */
const DB_CLOCK_UTC_SQL = `(clock_timestamp() AT TIME ZONE 'UTC')`;

/**
 * The money seam's reads. Plain SELECTs on the caller's transaction (04 A9). Position times are naive
 * UTC; the rolling windows compare them with the database clock, never the container's.
 */
const prismaHouseSeam: HouseSeamStore = {
  async botUsage({ houseBotId, marketId }, tx) {
    const rows = await sql(tx, `SELECT max("placedAt") AS "last",`
      + ` count(*) FILTER (WHERE "placedAt" > ${DB_CLOCK_UTC_SQL} - interval '1 hour')::int AS "hour",`
      + ` count(*) FILTER (WHERE "placedAt" > ${DB_CLOCK_UTC_SQL} - interval '1 day')::int AS "day",`
      + ` count(*) FILTER (WHERE "marketId" = $2::text)::int AS "onMarket",`
      + ` coalesce(sum("stake") FILTER (WHERE "marketId" = $2::text), 0)::text AS "stakeOnMarket"`
      + ` FROM "Position" WHERE "houseBotId" = $1::text`, [houseBotId, marketId]);
    const r = rows[0];
    return {
      lastPlacedAt: r.last == null ? null : iso(r.last),
      placedLastHour: Number(r.hour), placedLastDay: Number(r.day),
      countOnMarket: Number(r.onMarket), stakeOnMarket: Number(r.stakeOnMarket),
    };
  },
  async marketUsage({ houseBotId, marketId }, tx) {
    const rows = await sql(tx, `SELECT coalesce(bool_or("houseBotId" <> $2::text), false) AS "other",`
      + ` coalesce(sum("stake"), 0)::text AS "open"`
      + ` FROM "Position" WHERE "marketId" = $1::text AND "status"::text = 'OPEN' AND "houseBotId" IS NOT NULL`, [marketId, houseBotId]);
    return { otherBotOpen: rows[0].other === true, houseOpenStakeTzs: Number(rows[0].open) };
  },
  async globalUsage(tx) {
    const rows = await sql(tx, `SELECT count(*) FILTER (WHERE "placedAt" > ${DB_CLOCK_UTC_SQL} - interval '1 minute')::int AS "minute",`
      + ` count(*)::int AS "day"`
      + ` FROM "Position" WHERE "houseBotId" IS NOT NULL AND "placedAt" > ${DB_CLOCK_UTC_SQL} - interval '1 day'`, []);
    return { betsLastMinute: Number(rows[0].minute), betsLastDay: Number(rows[0].day) };
  },
  /**
   * ⛔ WRITTEN IN `globalUsage`'s OWN SHAPE (ruling 351): `count(*) FILTER (…)` over the DATABASE clock with a
   * `GROUP BY "houseBotId"`, never a row projection. The outer WHERE carries NO time bound, because `lastPlacedAt`
   * is all-time — the same term `botUsage`'s `max("placedAt")` reads.
   */
  async botRateUsage({ houseBotId }, tx) {
    const who = houseBotId == null ? `"houseBotId" IS NOT NULL` : `"houseBotId" = $1::text`;
    const rows = await sql(tx, `SELECT "houseBotId", max("placedAt") AS "last",`
      + ` count(*) FILTER (WHERE "placedAt" > ${DB_CLOCK_UTC_SQL} - interval '1 hour')::int AS "hour",`
      + ` count(*) FILTER (WHERE "placedAt" > ${DB_CLOCK_UTC_SQL} - interval '1 day')::int AS "day"`
      + ` FROM "Position" WHERE ${who} GROUP BY "houseBotId" ORDER BY "houseBotId"`,
      houseBotId == null ? [] : [houseBotId]);
    return rows.map((r) => ({
      houseBotId: String(r.houseBotId),
      placedLastHour: Number(r.hour),
      placedLastDay: Number(r.day),
      lastPlacedAt: r.last == null ? null : iso(r.last),
    }));
  },
  async placedTimes({ houseBotId, withinSec }, tx) {
    const secs = placedWindowSec(withinSec);
    const who = houseBotId == null ? `"houseBotId" IS NOT NULL` : `"houseBotId" = $2::text`;
    const rows = await sql(tx, `SELECT "placedAt" FROM "Position" WHERE ${who}`
      + ` AND "placedAt" > ${DB_CLOCK_UTC_SQL} - ($1::int * interval '1 second') ORDER BY "placedAt" DESC`,
      houseBotId == null ? [secs] : [secs, houseBotId]);
    return rows.map((r) => iso(r.placedAt as Date));
  },
  async counterpartyToday(userIds, tx) {
    if (userIds.length === 0) return [];
    const rows = await sql(tx, `WITH ids AS (SELECT unnest($1::text[]) AS "userId"),`
      + ` today AS (SELECT "kind", "triggerUserId", "stakeTzs", "decision" FROM "HouseBotIntent"`
      + ` WHERE "status" = 'PLACED' AND "finishedAt" >= ${EAT_TODAY_FROM_SQL} AND "finishedAt" < ${EAT_TODAY_TO_SQL}`
      + ` AND "kind" IN ('COUNTER', 'MANUAL')),`
      + ` counters AS (SELECT "triggerUserId" AS "userId", count(*)::int AS "n", sum("stakeTzs")::bigint AS "tzs" FROM today`
      + ` WHERE "kind" = 'COUNTER' AND "triggerUserId" = ANY($1::text[]) GROUP BY "triggerUserId"),`
      + ` manual AS (SELECT c->>'userId' AS "userId", count(*)::int AS "n", sum((c->>'attributedTzs')::bigint)::bigint AS "tzs"`
      + ` FROM today, jsonb_array_elements(coalesce(today."decision"->'counterparties', '[]'::jsonb)) AS c`
      + ` WHERE today."kind" = 'MANUAL' AND c->>'userId' = ANY($1::text[]) GROUP BY c->>'userId')`
      + ` SELECT ids."userId" AS "userId", (coalesce(counters."n", 0) + coalesce(manual."n", 0))::int AS "count",`
      + ` (coalesce(counters."tzs", 0) + coalesce(manual."tzs", 0))::text AS "tzs"`
      + ` FROM ids LEFT JOIN counters ON counters."userId" = ids."userId" LEFT JOIN manual ON manual."userId" = ids."userId"`,
      [[...userIds]]);
    const byId = new Map(rows.map((r) => [String(r.userId), { userId: String(r.userId), count: Number(r.count), tzs: Number(r.tzs) }]));
    return userIds.map((u) => byId.get(u) ?? { userId: u, count: 0, tzs: 0 });
  },
  async lockedPool({ marketId, graceMs, paidMs, closesAt, asOf }, tx) {
    // ⭐ ONE STATEMENT (N1 §4.1): per-account sums in a subquery, per-side totals outside, the raw pools
    // read in the same snapshot. `exitAt` mirrors `exitWindowFacts` term for term (A14); the SQL/JS
    // parity case runs this against the golden grid.
    const text = `WITH clock AS (SELECT coalesce($5::timestamp, ${DB_CLOCK_UTC_SQL}) AS "t"),`
      + ` live AS (SELECT DISTINCT "userId" FROM "HouseBot" WHERE "status" <> 'REMOVED'),`
      + ` pos AS (SELECT p."userId", p."side"::text AS "side", p."stake",`
      + ` CASE WHEN $2::bigint > 0 AND ($4::timestamp - p."placedAt") >= ($2::bigint * interval '1 millisecond')`
      + ` THEN p."placedAt" + (($2::bigint + $3::bigint) * interval '1 millisecond') ELSE p."placedAt" END AS "exitAt",`
      + ` (u."role"::text = 'PLAYER'`
      + ` AND NOT EXISTS (SELECT 1 FROM live WHERE live."userId" = u."id")`
      + ` AND NOT EXISTS (SELECT 1 FROM "HouseBotAlertOnce" a WHERE a."key" = 'penalty:' || u."id" || ':' || ${EAT_SQL.dayKey})`
      + ` AND (u."recruitedBy" IS NULL OR NOT EXISTS (SELECT 1 FROM live WHERE live."userId" = u."recruitedBy"))) AS "eligible"`
      + ` FROM "Position" p JOIN "User" u ON u."id" = p."userId"`
      + ` WHERE p."marketId" = $1::text AND p."status"::text = 'OPEN' AND p."houseBotId" IS NULL),`
      + ` marked AS (SELECT pos.*, (pos."exitAt" <= clock."t" - ($6::int * interval '1 millisecond')) AS "isLocked",`
      + ` (pos."exitAt" <= clock."t") AS "isLockedA15" FROM pos, clock),`
      + ` sides AS (SELECT "side", coalesce(sum("stake"), 0)::text AS "nonHouse",`
      + ` coalesce(sum("stake") FILTER (WHERE "eligible" AND "isLocked"), 0)::text AS "locked",`
      + ` coalesce(sum("stake") FILTER (WHERE "eligible" AND NOT "isLocked"), 0)::text AS "unlocked",`
      + ` min("exitAt") FILTER (WHERE "eligible" AND NOT "isLocked") AS "earliestExit",`
      + ` coalesce(sum("stake") FILTER (WHERE NOT "eligible"), 0)::text AS "excluded",`
      + ` coalesce(sum("stake") FILTER (WHERE "isLockedA15"), 0)::text AS "lockedA15"`
      + ` FROM marked GROUP BY "side"),`
      + ` accts AS (SELECT "side", "userId", sum("stake")::text AS "lockedTzs",`
      + ` row_number() OVER (PARTITION BY "side" ORDER BY sum("stake") DESC, "userId") AS "rank"`
      + ` FROM marked WHERE "eligible" AND "isLocked" GROUP BY "side", "userId")`
      + ` SELECT 'side' AS "row", s."side", s."nonHouse", s."locked", s."unlocked", s."earliestExit", s."excluded", s."lockedA15",`
      + ` NULL::text AS "userId", NULL::text AS "lockedTzs", m."yesPool"::text AS "yesPool", m."noPool"::text AS "noPool"`
      + ` FROM (SELECT "yesPool", "noPool" FROM "PredictionMarket" WHERE "id" = $1::text) m LEFT JOIN sides s ON true`
      + ` UNION ALL SELECT 'acct', a."side", NULL, NULL, NULL, NULL, NULL, NULL, a."userId", a."lockedTzs", NULL, NULL`
      + ` FROM accts a WHERE a."rank" <= 5`;
    const rows = await sql(tx, text, [marketId, wholeArg("graceMs", graceMs), wholeArg("paidMs", paidMs), closesAt, asOf ?? null, LOCK_MARGIN_MS]);
    const market = rows.find((r) => r.row === "side");
    const out: LockedPool = { YES: emptyPoolSide(Number(market?.yesPool ?? 0)), NO: emptyPoolSide(Number(market?.noPool ?? 0)) };
    const accounts: Record<"YES" | "NO", Array<{ userId: string; lockedTzs: number }>> = { YES: [], NO: [] };
    for (const r of rows) {
      if (r.side !== "YES" && r.side !== "NO") continue;
      if (r.row === "side") {
        const s = out[r.side as "YES" | "NO"];
        s.nonHouse = Number(r.nonHouse); s.locked = Number(r.locked); s.unlocked = Number(r.unlocked);
        s.excluded = Number(r.excluded); s.lockedA15 = Number(r.lockedA15);
        s.earliestLockAt = r.earliestExit == null ? null : new Date(ms(iso(r.earliestExit)) + LOCK_MARGIN_MS).toISOString();
      } else {
        accounts[r.side as "YES" | "NO"].push({ userId: String(r.userId), lockedTzs: Number(r.lockedTzs) });
      }
    }
    for (const side of ["YES", "NO"] as const) out[side].accounts = pickAccounts(accounts[side], out[side].locked);
    return out;
  },
  async blackoutRow(marketId, tx) {
    const rows = await sql(tx, `SELECT "status"::text AS "status", "sentinelOutcome"::text AS "sentinelOutcome", "sentinelConfidence",`
      + ` "sentinelDetermined", "sentinelClosedAt", "resolvedOutcome"::text AS "resolvedOutcome", "resolutionStage1By",`
      + ` "resolveClaimedAt", "reopenedAt" FROM "PredictionMarket" WHERE "id" = $1::text`, [marketId]);
    const r = rows[0];
    if (!r) return null;
    return {
      status: String(r.status),
      sentinelOutcome: r.sentinelOutcome ?? null,
      sentinelConfidence: r.sentinelConfidence == null ? null : Number(r.sentinelConfidence),
      sentinelDetermined: r.sentinelDetermined ?? null,
      sentinelClosedAt: iso(r.sentinelClosedAt),
      resolvedOutcome: r.resolvedOutcome ?? null,
      resolutionStage1By: r.resolutionStage1By ?? null,
      resolveClaimedAt: iso(r.resolveClaimedAt),
      reopenedAt: iso(r.reopenedAt),
    };
  },
  async rawProductLine(marketId, tx) {
    const rows = await sql(tx, `SELECT "productLine"::text AS "productLine" FROM "PredictionMarket" WHERE "id" = $1::text`, [marketId]);
    return rows[0] ? String(rows[0].productLine) : null;
  },
  async roundLock(marketId, tx) {
    const rows = await sql(tx, `SELECT r."opensAt" AS "opensAt", c."durationMinutes" AS "durationMinutes" FROM "UpDownRound" r`
      + ` JOIN "UpDownChain" c ON c."id" = r."chainId" WHERE r."marketId" = $1::text`, [marketId]);
    return rows[0] ? { opensAt: iso(rows[0].opensAt), durationMinutes: Number(rows[0].durationMinutes) } : null;
  },
  async marketView(marketId, tx) {
    const rows = await sql(tx, `SELECT m."id", m."productLine"::text AS "productLine", m."category", m."status"::text AS "status",`
      + ` m."yesPool"::float8 AS "yesPool", m."noPool"::float8 AS "noPool", m."selectionClosedAt", m."resolutionAt", m."createdAt",`
      + ` m."titleEn", m."feeSnapshot", m."reopenedAt",`
      + ` r."id" AS "roundId", r."chainId" AS "chainId", r."roundNumber" AS "roundNumber", r."opensAt" AS "opensAt",`
      + ` r."openPrice"::float8 AS "openPrice", r."upTarget"::float8 AS "upTarget", r."downTarget"::float8 AS "downTarget",`
      + ` c."durationMinutes" AS "durationMinutes", c."state"::text AS "chainState", c."assetId" AS "assetId", a."enabled" AS "assetEnabled"`
      + ` FROM "PredictionMarket" m LEFT JOIN "UpDownRound" r ON r."marketId" = m."id"`
      + ` LEFT JOIN "UpDownChain" c ON c."id" = r."chainId" LEFT JOIN "UpDownAsset" a ON a."id" = c."assetId"`
      + ` WHERE m."id" = $1::text`, [marketId]);
    const r = rows[0];
    if (!r) return null;
    const rates = snapshotOrLegacy(r.feeSnapshot);
    const num = (v: unknown) => (v == null ? null : Number(v));
    return {
      id: String(r.id), productLine: String(r.productLine), category: String(r.category), status: String(r.status),
      yesPool: Number(r.yesPool), noPool: Number(r.noPool), selectionClosedAt: iso(r.selectionClosedAt), resolutionAt: iso(r.resolutionAt),
      createdAt: iso(r.createdAt), titleEn: String(r.titleEn), exitGraceMin: rates.freeExitGraceMinutes, exitPaidMin: rates.paidExitWindowMinutes,
      reopenedAt: iso(r.reopenedAt),
      round: r.roundId != null && r.durationMinutes != null ? {
        roundId: String(r.roundId), chainId: String(r.chainId), chainKey: `${String(r.assetId)}:${Number(r.durationMinutes)}`,
        roundNumber: Number(r.roundNumber), opensAt: iso(r.opensAt), durationMinutes: Number(r.durationMinutes),
        openPrice: num(r.openPrice), upTarget: num(r.upTarget), downTarget: num(r.downTarget),
        chainRunning: r.chainState === "RUNNING", assetEnabled: r.assetEnabled === true,
      } : null,
    };
  },
  async plannableMarkets({ kind, productLine, fromIso, toIso, after, limit }, tx) {
    // Market and round times are naive UTC (as `dayRows`); ISO bounds are cast `::timestamp`.
    const text = `SELECT x."id", x."cutoff" FROM (SELECT m."id",`
      + ` CASE WHEN m."productLine"::text = 'UPDOWN'`
      + ` THEN least(r."opensAt" + (c."durationMinutes" * interval '1 minute'), coalesce(m."selectionClosedAt", m."resolutionAt"))`
      + ` ELSE m."selectionClosedAt" END AS "cutoff"`
      + ` FROM "PredictionMarket" m LEFT JOIN "UpDownRound" r ON r."marketId" = m."id"`
      + ` LEFT JOIN "UpDownChain" c ON c."id" = r."chainId" LEFT JOIN "UpDownAsset" a ON a."id" = c."assetId"`
      + ` WHERE m."status"::text = 'LIVE' AND m."productLine"::text = $1::text AND m."reopenedAt" IS NULL AND m."titleEn" NOT LIKE $8::text`
      + ` AND (($1::text = 'MARKET' AND m."selectionClosedAt" IS NOT NULL)`
      + ` OR ($1::text = 'UPDOWN' AND r."id" IS NOT NULL AND c."state"::text = 'RUNNING' AND a."enabled" = true))`
      + ` AND ($2::text <> 'OPENER' OR (m."yesPool" = 0 AND m."noPool" = 0))`
      + ` AND NOT EXISTS (SELECT 1 FROM "HouseBotIntent" i WHERE i."kind" = $2::text AND i."anchorKey" = m."id"`
      + ` AND (i."status" <> 'CANCELLED' OR i."reasonCode" = 'CANCELLED_BY_ADMIN'))) x`
      + ` WHERE x."cutoff" > $3::timestamp AND ($4::timestamp IS NULL OR x."cutoff" <= $4::timestamp)`
      + ` AND ($5::timestamp IS NULL OR (x."cutoff", x."id") > ($5::timestamp, $6::text))`
      + ` ORDER BY x."cutoff", x."id" LIMIT $7::int`;
    const rows = await sql(tx, text, [productLine, kind, fromIso, toIso, after?.cutoff ?? null, after?.id ?? "", Math.min(200, pageLimit(limit)), `${DEMO_PREFIX}%`]);
    return rows.map((r) => ({ id: String(r.id), cutoff: iso(r.cutoff) as string }));
  },
  async triggerPage({ fromIso, beforeIso, after, limit }, tx) {
    // Position times are naive UTC (as `plannableMarkets`); ISO bounds are cast `::timestamp`.
    const text = `SELECT p."id", p."userId", p."marketId", p."side"::text AS "side", p."stake"::text AS "stake", p."placedAt",`
      + ` p."status"::text AS "status"`
      + ` FROM "Position" p JOIN "PredictionMarket" m ON m."id" = p."marketId"`
      + ` WHERE p."houseBotId" IS NULL AND m."status"::text = 'LIVE'`
      + ` AND p."placedAt" >= $1::timestamp AND p."placedAt" <= $2::timestamp`
      + ` AND ($3::timestamp IS NULL OR (p."placedAt", p."id") > ($3::timestamp, $4::text))`
      + ` AND NOT EXISTS (SELECT 1 FROM "HouseBotIntent" i WHERE i."kind" = 'COUNTER' AND i."anchorKey" = p."id")`
      + ` ORDER BY p."placedAt", p."id" LIMIT $5::int`;
    const rows = await sql(tx, text, [fromIso, beforeIso, after?.placedAt ?? null, after?.id ?? "", Math.min(200, pageLimit(limit))]);
    return rows.map((r) => ({
      id: String(r.id), userId: String(r.userId), marketId: String(r.marketId), side: String(r.side) as IntentSide,
      stake: Number(r.stake), placedAt: iso(r.placedAt) as string, status: String(r.status),
    }));
  },
  async triggerAccount(userId, tx) {
    const rows = await sql(tx, `SELECT u."role"::text AS "role", u."recruitedBy",`
      + ` EXISTS (SELECT 1 FROM "HouseBotAlertOnce" a WHERE a."key" = 'penalty:' || u."id" || ':' || ${EAT_SQL.dayKey}) AS "penaltyToday"`
      + ` FROM "User" u WHERE u."id" = $1::text`, [userId]);
    const r = rows[0];
    return r ? { role: String(r.role), recruitedBy: r.recruitedBy == null ? null : String(r.recruitedBy), penaltyToday: r.penaltyToday === true } : null;
  },
  async intentFreshness(id, tx) {
    const rows = await sql(tx, `SELECT "status", ("staleAt" > clock_timestamp()) AS "fresh" FROM "HouseBotIntent" WHERE "id" = $1::text`, [id]);
    return rows[0] ? { status: rows[0].status as IntentStatus, fresh: rows[0].fresh === true } : null;
  },
  async revertPlacedInMemory() {
    throw new Error("house-bot-dal: revertPlacedInMemory is memory-only — Postgres rolls the transaction back");
  },
};

// ---------------------------------------------------------------------------
// Exports — Prisma whenever a database is configured (always in production)
// ---------------------------------------------------------------------------

const usePrisma = hasDatabase() && process.env.USE_PRISMA_DAL !== "false";

export const houseBotControlStore: HouseBotControlStore = usePrisma ? prismaHouseBotControl : memoryHouseBotControl;
export const houseBotStore: HouseBotStore = usePrisma ? prismaHouseBots : memoryHouseBots;
export const houseBotRuntimeStore: HouseBotRuntimeStore = usePrisma ? prismaHouseBotRuntime : memoryHouseBotRuntime;
export const houseBotAlertOnceStore: HouseBotAlertOnceStore = usePrisma ? prismaHouseBotAlertOnce : memoryHouseBotAlertOnce;
export const houseBotEventStore: HouseBotEventStore = usePrisma ? prismaHouseBotEvents : memoryHouseBotEvents;
export const houseBotIntentStore: HouseBotIntentStore = usePrisma ? prismaHouseBotIntents : memoryHouseBotIntents;
/** The sealed name (N2 §2). */
export const targetStore: HouseBotTargetStore = usePrisma ? prismaHouseBotTargets : memoryHouseBotTargets;
/** The sealed name (N1 §2). */
export const pressStore: HouseBotPressStore = usePrisma ? prismaHouseBotPresses : memoryHouseBotPresses;
export const houseBookStore: HouseBookStore = usePrisma ? prismaHouseBook : memoryHouseBook;
export const houseSeamStore: HouseSeamStore = usePrisma ? prismaHouseSeam : memoryHouseSeam;

/**
 * Run several house writes as one transaction outside any lock — Enter now's queue step (N1 §4.3
 * step 4) is the first caller. Inside a lock, pass the lock's `tx` to each store instead.
 *
 * ⚠️ The memory half restores every house map if `fn` throws. It cannot isolate a CONCURRENT
 * memory write made while `fn` is awaiting: that write would be rolled back with it. The
 * in-memory backend is dev and tests, single-flight; production is Postgres.
 */
export async function houseTransaction<R>(fn: (tx: HouseTx) => Promise<R>): Promise<R> {
  if (usePrisma) return pc().$transaction((t) => fn(t));
  const restore = memSnapshot();
  try {
    return await fn(null);
  } catch (e) {
    restore();
    throw e;
  }
}

/**
 * Several house writes as ONE unit, from inside a lock the caller already holds (the consent void, Start and
 * re-verify write under `wallet:<botUser>`). On Postgres a lock `tx` already is one transaction, so the writes
 * join it — a throw escapes the lock and rolls every one back; with no `tx` a transaction is opened. On the
 * memory store every house map is restored if `fn` throws (the same limit as `houseTransaction`: a concurrent
 * memory write made while `fn` awaits would be restored with it).
 *
 * ⛔ The caller must let the error escape its lock. Catching it inside `withLock` would commit the writes made
 * before the throw on Postgres while the memory store restored them.
 */
export async function houseAtomic<R>(tx: HouseTx, fn: (tx: HouseTx) => Promise<R>): Promise<R> {
  if (usePrisma) return tx ? fn(tx) : pc().$transaction((t) => fn(t));
  const restore = memSnapshot();
  try {
    return await fn(null);
  } catch (e) {
    restore();
    throw e;
  }
}

/** Test helper — wipe the in-memory house stores and re-seed the `global` rows. No-op against
 *  Prisma, so a test that forgets to guard it cannot truncate a real database. */
export function __resetHouseBotMemoryStores(): void {
  if (usePrisma) return;
  for (const map of Object.values(MEM)) (map as Map<string, unknown>).clear();
  memSeed();
}
