/**
 * HOUSE-BOT CONSTANTS — the closed lists, keys, locks, codes and timings every house-bot layer shares.
 *
 * ⛔ EVERY CLOSED LIST HERE HAS A TWIN IN THE DATABASE. Status, cause, kind and purpose columns are
 * TEXT with a CHECK (PLAN §2: no Postgres enums), and each CHECK's IN-list must equal the tuple below
 * value for value and in the same order. `test:house-bot-migrations` reads the migration and compares
 * them, so a value added here without a migration — or the other way round — is a red suite, not a
 * row the database silently refuses at 2 a.m.
 *
 * ⛔ PURE. No server value import (a type-only `ProductLine` and `AuditCategory` are erased), no
 * `node:` import, nothing that runs at load. The rules form and the console import this from the
 * browser; the engine, the DAL and the seam import it on the server. Import order inside the folder
 * is clock → constants → pause-reasons → rules, never back up the chain.
 *
 * ⚠️ VALUES ARE PINNED BEFORE THEIR CONSUMERS EXIST. Most timings below are read by the engine,
 * which lands in build commit 4; they are fixed now so the pins in `test:house-bot-rules` hold from
 * the first commit and a later "quick tweak" has to argue with a test.
 */
import type { AuditCategory } from "@/lib/server/audit";
import type { ProductLine } from "@/lib/server/market-service";
import type { EatKeyUnit } from "./clock";

/** A type guard for one closed list. Every `isX` below is this, so no two guards disagree. */
export function closedListGuard<T extends string>(list: readonly T[]): (v: unknown) => v is T {
  return (v: unknown): v is T => typeof v === "string" && (list as readonly string[]).includes(v);
}

// ---------------------------------------------------------------------------
// Identity, locks and keys
// ---------------------------------------------------------------------------

/** The one control row (`HouseBotControl_id_check`). */
export const HOUSE_CONTROL_ID = "global";

/**
 * The innermost house lock (PLAN §3 lock order `wallet:<bot> → market:<id> → house:control`).
 * Held only through a house bet's final writes; control writes take it briefly.
 */
export const HOUSE_CONTROL_LOCK = "house:control";

/**
 * Serialises target add, update and remove (N2 §6, PLAN §18 A19 row). ⛔ Bets never take it, and
 * no target action takes `house:control` — a target edit must never queue behind a bet.
 */
export const HOUSE_TARGETS_LOCK = "house:targets";

/** The `acquireLeadership` task name for the planner (PLAN §4.2). */
export const HOUSE_PLANNER_TASK = "house-bot";

/** The audit actor of engine-written rows (04 A19). */
export const SYSTEM_HOUSE_BOT_ACTOR = "system_house_bot";

/** Engine state lives on `globalThis` under this key, so a second module instance finds it (04 A24). */
export const HOUSE_BOT_ENGINE_GLOBAL_KEY = "__50PICK_HOUSE_BOT_ENGINE";

/** `HOUSE_BOT_ENGINE=false` starts no timers and makes the hook return before its import. */
export const HOUSE_BOT_ENGINE_ENV = "HOUSE_BOT_ENGINE";

/**
 * Id prefixes. The house tables cannot lean on `@default(cuid())`: raw inserts mint their own ids,
 * and the prefix is what makes an id in a log line say which table it came from.
 */
export const HOUSE_ID_PREFIX = {
  bot: "hb_",
  intent: "hbi_",
  event: "hbe_",
  target: "hbt_",
  press: "hbp_",
} as const;

/** The idempotency-key prefix of a house bet. `buyPositionAction` refuses any key that starts with it. */
export const HOUSE_INTENT_KEY_PREFIX = "hb:";

/** The bet idempotency key of an intent — `HouseBotIntent_idempotencyKey_check` pins it in SQL too. */
export const houseIntentKey = (intentId: string): string => `${HOUSE_INTENT_KEY_PREFIX}${intentId}`;

export const isHouseIntentKey = (key: string): boolean => key.startsWith(HOUSE_INTENT_KEY_PREFIX);

/**
 * The anchor of an Enter now intent: one press id, used once, ever (`hbi_manual_anchor_uq`,
 * `HouseBotIntent_manual_anchor_check`).
 */
export const manualAnchorKey = (requestedById: string, submitId: string): string =>
  `manual:${requestedById}:${submitId}`;

/** A press `submitId` — the browser's `crypto.randomUUID()`; `HouseBotPress_submitId_check` is the SQL twin. */
export const SUBMIT_ID_RE = /^[0-9a-f-]{36}$/;

/**
 * `HouseBotRuntime` keys (`HouseBotRuntime_key_check`). `engine:<instance>` and `beat:poller:<instance>`
 * are per boot — the instance id is random — which is why those rows are pruned after 24 h.
 */
/**
 * ⭐ A BOOT REFUSAL THE DESK CAN READ (C8 minor M4, 2026-09-23) — written the way `CLAIMS_BLOCKED_CODE` is,
 * for the same reason its own note gives: **the bell alone was never enough.**
 *
 * 🔴 WHAT IT REPLACES. A database whose `TimeZone` is not UTC makes the engine refuse to start (04 A4). That
 * refusal set an in-process flag, logged, and rang ONE alert per EAT day — and wrote nothing durable at all,
 * because it returns BEFORE the boot row is written. So the desk, which reads durable rows on purpose, saw no
 * boot and no beat and said "The engine is not running" with no cause named, while `/admin/system` could only
 * answer for the replica that happened to render it. An officer was left to find a time-zone setting by guessing.
 * ⛔ IT RIDES THE `engine:<instance>` ROW'S `pollerErrorCode`, WHICH NOTHING ELSE READS: `pollerErrorAtMs`,
 * `pollerErrorStreak` and `claimsBlockedReason` are all taken from `beat:poller:*` rows and the failed-duty list
 * from `beat:planner`. No new key prefix (352), no migration, and `listInstances()` already selects `engine:%`.
 * ⛔ AND IT IS CLEARED BY A SUCCESSFUL BOOT, in `boot()` itself — a current state that survives its own end is
 * a lie, which is exactly what `clearClaimsBlocked` exists to prevent one layer down.
 * ⚠️ ONLY `DB_TIMEZONE` IS RECORDED, and the other four refusals are named here rather than left to be wondered
 * about: `SCHEMA_NOT_READY` and `BOOT_FAILED` cannot write (there is no schema, or the write is the thing that
 * failed), and `FEATURE_WITHDRAWN` / `ENV_DISABLED` are DELIBERATE — one replica with the engine switched off is
 * a normal deployment, and marking the whole desk danger over it would be a false alarm nobody could clear.
 */
export const BOOT_REFUSED_CODE = "BOOT_REFUSED";

export const RUNTIME_KEY = {
  global: "global",
  plannerBeat: "beat:planner",
  bot: (botId: string) => `bot:${botId}`,
  engine: (instanceId: string) => `engine:${instanceId}`,
  pollerBeat: (instanceId: string) => `beat:poller:${instanceId}`,
} as const;

/** The exact runtime keys the CHECK lists, and the prefixes it admits. */
export const RUNTIME_KEY_EXACT = ["global", "beat:planner"] as const;
export const RUNTIME_KEY_PREFIXES = ["bot:", "engine:", "beat:poller:"] as const;

export function isRuntimeKey(key: string): boolean {
  return (
    (RUNTIME_KEY_EXACT as readonly string[]).includes(key) ||
    RUNTIME_KEY_PREFIXES.some((p) => key.startsWith(p) && key.length > p.length)
  );
}

// ---------------------------------------------------------------------------
// Typed confirmation words (04 C3)
// ---------------------------------------------------------------------------

/**
 * ⛔ RETIRED 2026-09-20, AND THE RETIREMENT IS ASSERTED RATHER THAN ASSUMED — see
 * `test:house-bot-rules` §7, which is the same checks in the opposite direction.
 *
 * WHAT USED TO BE HERE: `TYPED_WORD` (`BOTS_ON` / `REMOVE`), `normaliseTypedWord`,
 * `isTypedWord` and `TYPED_WORD_COPY` — an NFKC + whitespace-collapse + upper-case
 * normaliser for ceremony words, written for C3 and never wired to anything. Measured
 * before deletion: ZERO callers under `src/`; the only hits in the tree were their own
 * definitions and a truth table in `test:house-bot-rules` §7 that was GREEN while
 * measuring a module the product did not contain.
 *
 * ⛔ WHY DELETED RATHER THAN ADOPTED — the direction matters, because adopting them was
 * the other half of the choice and it would have WEAKENED two gates:
 *   · The shipped ceremonies are `CONSOLE_SWITCH_ON_WORD` ("SWITCH ON") and
 *     `CONSOLE_REMOVE_WORD` ("REMOVE") in `house-console-read.ts`, and both compare with a
 *     plain `.trim()` — deliberately, so the word cannot be armed by habit. Routing them
 *     through `normaliseTypedWord` would have made "switch on", "remove" and " SWITCH  ON "
 *     all arm, on an irreversible removal and on the master switch of a live money feature.
 *   · The refusal an officer reads PROMISES capitals — "Type SWITCH ON exactly, in
 *     capitals, to confirm." — so adopting the normaliser would have made a shipped
 *     sentence false.
 *   · `TYPED_WORD.BOTS_ON` was "BOTS ON", a word this product has never used, and
 *     `TYPED_WORD_COPY.refused` spelled out "…to switch house bots on." — a D19 sentence
 *     one prop away from a screen, kept alive by nothing but a test.
 */

// ---------------------------------------------------------------------------
// Closed lists — each mirrors a migration CHECK exactly
// ---------------------------------------------------------------------------

/** `HouseBot.status` (PLAN §2). */
export const BOT_STATUSES = ["ACTIVE", "PAUSED", "AUTO_PAUSED", "REMOVED"] as const;
export type HouseBotStatus = (typeof BOT_STATUSES)[number];
export const isHouseBotStatus = closedListGuard(BOT_STATUSES);

/**
 * `HouseBot.pausedFromStatus` — what the bot was before an auto-pause (02 §2.2). Set on every
 * auto-pause; cleared by Start, Pause, Remove and every successful re-verify.
 */
export const PAUSED_FROM_STATUSES = ["ACTIVE", "PAUSED"] as const;
export type PausedFromStatus = (typeof PAUSED_FROM_STATUSES)[number];
export const isPausedFromStatus = closedListGuard(PAUSED_FROM_STATUSES);

/** `HouseBotControl.offCause` (PLAN §2, F2 adds SUNSET). */
export const OFF_CAUSES = ["MANUAL", "GLOBAL_LOSS_STOP", "ENGINE_FAULT", "ENGINE_ERRORS", "SUNSET"] as const;
export type OffCause = (typeof OFF_CAUSES)[number];
export const isOffCause = closedListGuard(OFF_CAUSES);

/**
 * `User.passwordSetVia` (04 A4) — written in the same update as the hash. NULL on accounts older
 * than the column; eligibility then falls back to an awaited audit read that fails closed.
 */
export const PASSWORD_SET_VIA = ["REGISTRATION", "SELF_CHANGE", "RESET_LINK", "OFFICER_TEMP", "REHASH"] as const;
export type PasswordSetVia = (typeof PASSWORD_SET_VIA)[number];
export const isPasswordSetVia = closedListGuard(PASSWORD_SET_VIA);

/** `HouseBotIntent.kind` (N1 §2 adds MANUAL — an Enter now press). */
export const INTENT_KINDS = ["COUNTER", "FILL", "OPENER", "MANUAL"] as const;
export type IntentKind = (typeof INTENT_KINDS)[number];
export const isIntentKind = closedListGuard(INTENT_KINDS);

/** `HouseBotIntent.status` (PLAN §2). */
export const INTENT_STATUSES = ["PENDING", "CLAIMED", "PLACED", "SKIPPED", "EXPIRED", "FAILED", "CANCELLED"] as const;
export type IntentStatus = (typeof INTENT_STATUSES)[number];
export const isIntentStatus = closedListGuard(INTENT_STATUSES);

/** The statuses that still hold a market (`hbi_manual_live_market_uq`, MARKET_HELD, cancels). */
export const LIVE_INTENT_STATUSES = ["PENDING", "CLAIMED"] as const satisfies readonly IntentStatus[];

/** `HouseBotIntent.productLine` — the raw product line, never the data layer's folded one (04 A12). */
export const INTENT_PRODUCT_LINES = ["MARKET", "UPDOWN"] as const satisfies readonly ProductLine[];

/** `HouseBotIntent.side`. */
export const INTENT_SIDES = ["YES", "NO"] as const;
export type IntentSide = (typeof INTENT_SIDES)[number];
export const isIntentSide = closedListGuard(INTENT_SIDES);

/** `HouseBotIntent.entryCondition` — set on MANUAL rows only (N1 §2). */
export const ENTRY_CONDITIONS = ["OPENER", "THIN"] as const;
export type EntryCondition = (typeof ENTRY_CONDITIONS)[number];
export const isEntryCondition = closedListGuard(ENTRY_CONDITIONS);

/** `HouseBotTarget.productLine` — polls only (N2 §2, W13). */
export const TARGET_PRODUCT_LINES = ["MARKET"] as const satisfies readonly ProductLine[];

/** `HouseBotTarget.status` (N2 §2). */
export const TARGET_STATUSES = ["ACTIVE", "ENDED", "REMOVED"] as const;
export type TargetStatus = (typeof TARGET_STATUSES)[number];
export const isTargetStatus = closedListGuard(TARGET_STATUSES);

/** `HouseBotTarget.endCause` (N2 §2). An ended target never re-arms. */
export const TARGET_END_CAUSES = [
  "DONE",
  "MARKET_CLOSED",
  "CUTOFF_PASSED",
  "MARKET_REOPENED",
  "MARKET_GONE",
  "OUT_OF_SCOPE",
  "INFO_BLACKOUT",
  "BOT_REMOVED",
  "SUNSET",
  "VETOED",
  "CONSENT_VOID",
] as const;
export type TargetEndCause = (typeof TARGET_END_CAUSES)[number];
export const isTargetEndCause = closedListGuard(TARGET_END_CAUSES);

/** `HouseBotTarget.timingFrom` — the delay counts from the stake, or from the player's exit closing. */
export const TIMING_FROM = ["STAKE", "EXIT_CLOSE"] as const;
export type TimingFrom = (typeof TIMING_FROM)[number];
export const isTimingFrom = closedListGuard(TIMING_FROM);

/** `HouseBotTarget.reactTo`. */
export const REACT_TO = ["FIRST", "EVERY"] as const;
export type ReactTo = (typeof REACT_TO)[number];
export const isReactTo = closedListGuard(REACT_TO);

/** `HouseBotPress.purpose` (N1 §2). */
export const PRESS_PURPOSES = ["ENTER_NOW", "TARGET_ADD", "TARGET_UPDATE", "TARGET_REMOVE", "STAFF_CANCEL"] as const;
export type PressPurpose = (typeof PRESS_PURPOSES)[number];
export const isPressPurpose = closedListGuard(PRESS_PURPOSES);

/**
 * `HouseBotPress.state`. Only an ENTER_NOW press is ever QUEUED; target and cancel presses go
 * CHECKING → DONE inside their own transaction (`HouseBotPress_queued_check`).
 */
export const PRESS_STATES = ["CHECKING", "REFUSED", "QUEUED", "DONE"] as const;
export type PressState = (typeof PRESS_STATES)[number];
export const isPressState = closedListGuard(PRESS_STATES);

/**
 * `HouseBotEvent.kind` — the whole list, now.
 *
 * ⛔ THE CHECK CANNOT GROW LATER. Commit 1 owns the only two house migrations, so an event kind a
 * later commit needs has to be here already. SUNSET is one global event (no `houseBotId`) written by
 * the sunset script; each bot's own record of a sunset is its REMOVED event with `removedCause`
 * SUNSET. HOLDER_EMAIL_CHANGED and the 2FA pair are the "event plus info row" of 04 A2 rows 17–18.
 */
export const EVENT_KINDS = [
  "DESIGNATED",
  "VERIFIED",
  "STARTED",
  "PAUSED",
  "AUTO_PAUSED",
  "RULES_SAVED",
  "REMOVED",
  "SWITCH_ON",
  "SWITCH_OFF",
  "LIMITS_SAVED",
  "OWNER_MONEY",
  "CREDENTIAL_CHANGED",
  "HOLDER_CAUSE_ADDED",
  "CONSENT_VOIDED",
  "HOLDER_AGAINST_BOT",
  "HOLDER_EMAIL_CHANGED",
  "HOLDER_2FA_ON",
  "HOLDER_2FA_OFF",
  "PENALTY_BOXED",
  "REIMBURSEMENT_RECORDED",
  "BOARD_DISCLOSURE_RECORDED",
  "SUNSET",
  "ENTER_NOW_PREVIEWED",
  "ENTER_NOW_REQUESTED",
  "OPENER_SIDE_DRAWN",
  "TARGET_ADDED",
  "TARGET_UPDATED",
  "TARGET_REMOVED",
  "TARGET_ENDED",
  "STAFF_INTENT_CANCELLED",
] as const;
export type HouseBotEventKind = (typeof EVENT_KINDS)[number];
export const isHouseBotEventKind = closedListGuard(EVENT_KINDS);

/**
 * The event kinds a HOLDER's data-rights export may show, rendered as `{kind, at, actor}` only —
 * no reason text, no market id — and filtered to that holder's own bots (R5, N1 §9).
 *
 * ⛔ AN ALLOWLIST, NEVER "EVERYTHING EXCEPT". SWITCH_ON/OFF and LIMITS_SAVED are global and say nothing
 * about the holder; PENALTY_BOXED is a TRIGGER player's record and belongs in their projection only;
 * previews, draws, staff cancels, reimbursements and Board disclosures are officer records. A kind
 * added to `EVENT_KINDS` stays out of the export until someone decides it belongs.
 */
export const DSAR_HOLDER_EVENT_KINDS = [
  "DESIGNATED",
  "VERIFIED",
  "STARTED",
  "PAUSED",
  "AUTO_PAUSED",
  "RULES_SAVED",
  "REMOVED",
  "CREDENTIAL_CHANGED",
  "HOLDER_CAUSE_ADDED",
  "CONSENT_VOIDED",
  "HOLDER_2FA_ON",
  "HOLDER_2FA_OFF",
  "HOLDER_EMAIL_CHANGED",
  "ENTER_NOW_REQUESTED",
  "TARGET_ADDED",
  "TARGET_REMOVED",
  "TARGET_ENDED",
] as const satisfies readonly HouseBotEventKind[];

// ---------------------------------------------------------------------------
// Engine codes and cap codes
// ---------------------------------------------------------------------------

/**
 * Why an intent was not placed, or why a trigger was not countered. Every code gets a feed sentence
 * in commit 4's `feed-copy.ts`, typed as a Record over this union, so a code with no sentence fails
 * tsc rather than rendering blank.
 */
export const ENGINE_CODES = [
  // PLAN §4.4
  "OUTSIDE_SCHEDULE",
  "POOL_BAND",
  "NOT_REACTING",
  "TRIGGER_STAKE_RANGE",
  "NO_REACT_ZONE",
  "EXIT_WINDOW_TOO_LATE",
  "UD_CLOSENESS",
  "UD_NO_PRICE",
  "PENALTY_BOX",
  "MARKET_HELD",
  "NO_ELIGIBLE_BOT",
  "STAKE_BELOW_MIN",
  "MAINTENANCE",
  "CUTOFF",
  "MARKET_NOT_LIVE",
  "MARKET_GONE",
  "MASTER_OFF",
  "BOT_NOT_ACTIVE",
  "TRIGGER_EXITED",
  "CONDITION_GONE",
  "BUSY_TIMEOUT",
  "UNMAPPED",
  "INTERNAL",
  // 04 A7, A10, A12, A15, A16, A21, A24
  "STAKE_BOUNDS_CHANGED",
  "POISON",
  "NO_CUTOFF",
  "UD_NO_ROUND",
  "PRODUCT_NOT_SUPPORTED",
  "UD_STALE_PRICE",
  "MARKET_REOPENED",
  "CHAIN_NOT_RUNNING",
  "HOLDER_RECRUIT",
  "STALE",
  // 02 X11
  "CANCELLED_BY_ADMIN",
  // N1 §4.6, N2 §4
  "INFO_BLACKOUT",
  "TARGET_REMOVED",
  "TARGET_ENDED",
  "COUNTERPARTY_CONCENTRATION",
  "CAP_OPPOSITE_SIDE",
  // C4-SPEC ruling 66: the bot's saved scope no longer covers the market at fire
  "OUT_OF_SCOPE",
] as const;

/**
 * H2 cap codes, in the DECLARED ORDER the seam checks them (N1 §3, MON-09): money caps, then the
 * staff-chosen caps and TARGET_ONCE, then the rate caps. The seam's own order is pinned in its
 * anchors file; this list must read the same.
 */
export const H2_CAP_CODES = [
  "STAKE_MIN",
  "STAKE_MAX",
  "PER_MARKET",
  "BALANCE_FLOOR",
  "DAILY_STAKE",
  "DAILY_LOSS_PROJECTED",
  "EXPOSURE",
  "STAFF_CHOSEN_PER_DAY",
  "STAFF_CHOSEN_DAILY_STAKE",
  "TARGET_ONCE",
  "MIN_GAP",
  "PER_HOUR",
  "PER_DAY",
  "PER_MARKET_COUNT",
] as const;

/** H3 cap codes (inside `market:<id>`). */
export const H3_CAP_CODES = ["GLOBAL_PER_MARKET"] as const;

/** H4 cap codes (inside `house:control`). */
export const H4_CAP_CODES = [
  "GLOBAL_DAILY_STAKE",
  "GLOBAL_LOSS_PROJECTED",
  "GLOBAL_EXPOSURE",
  "GLOBAL_BETS_PER_MINUTE",
  "GLOBAL_BETS_PER_DAY",
  "COUNTERPARTY_COUNT",
  "COUNTERPARTY_TZS",
  "GLOBAL_STAFF_CHOSEN_PER_DAY",
  "GLOBAL_STAFF_CHOSEN_DAILY_STAKE",
] as const;

export type CapCode = (typeof H2_CAP_CODES)[number] | (typeof H3_CAP_CODES)[number] | (typeof H4_CAP_CODES)[number];
export const CAP_CODES: readonly CapCode[] = [...H2_CAP_CODES, ...H3_CAP_CODES, ...H4_CAP_CODES];
export const isCapCode = closedListGuard(CAP_CODES);

/**
 * Rate caps defer to the moment their window frees when that is before `staleAt` and no terminal
 * cap applies (N1 §4.6). Every other cap skips. PER_MARKET_COUNT is terminal even though it counts.
 */
export const DEFERRABLE_CAP_CODES = [
  "MIN_GAP",
  "PER_HOUR",
  "PER_DAY",
  "GLOBAL_BETS_PER_MINUTE",
] as const satisfies readonly CapCode[];

/** `house_market_conflict{…}` details (PLAN §3). */
export const CONFLICT_CODES = ["OWNER_POSITION", "OPPOSITE_SIDE", "OTHER_BOT", "TRIGGER_BOTH_SIDES"] as const;
export type ConflictCode = (typeof CONFLICT_CODES)[number];

export type EngineCode = (typeof ENGINE_CODES)[number] | `CAP_${CapCode}`;

export const capEngineCode = (code: CapCode): EngineCode => `CAP_${code}`;

export function isEngineCode(v: unknown): v is EngineCode {
  if (typeof v !== "string") return false;
  if ((ENGINE_CODES as readonly string[]).includes(v)) return true;
  return v.startsWith("CAP_") && isCapCode(v.slice(4));
}

// ---------------------------------------------------------------------------
// Product policy — default deny (04 F1, A12)
// ---------------------------------------------------------------------------

export type HouseProductPolicy = "polls" | "updown" | "denied";

/**
 * ⛔ A NEW PRODUCT LINE HAS TO BE DECIDED, NOT INHERITED. `satisfies Record<ProductLine, …>` makes
 * widening `ProductLine` a compile error here until someone writes a row — and "denied" is a valid
 * row. Enabling a product for house bots needs a COMPLIANCE-DECISIONS entry and a code change.
 */
export const HOUSE_PRODUCT_POLICY = {
  MARKET: "polls",
  UPDOWN: "updown",
} as const satisfies Record<ProductLine, HouseProductPolicy>;

/** The product lines house bots may touch — derived, so there is one list (04 A12 `inScope`). */
export const HOUSE_PRODUCTS: readonly ProductLine[] = (Object.keys(HOUSE_PRODUCT_POLICY) as ProductLine[]).filter(
  (p) => (HOUSE_PRODUCT_POLICY[p] as HouseProductPolicy) !== "denied",
);

/** The alert and HOUSE-BOTS.md rule for a stake on a product line no policy row admits (04 F1). */
export const PRODUCT_DENIED_COPY = (value: string): string =>
  `House bots ignored a stake on an unsupported product (${value}). No stake moved. Enabling it needs a COMPLIANCE-DECISIONS entry and a code change.`;

// ---------------------------------------------------------------------------
// Timing — pinned now, read by the seam (commit 2) and the engine (commit 4)
// ---------------------------------------------------------------------------

/** The largest clock skew a container may carry before it stops claiming and alerts (04 A24). */
export const MAX_TOLERATED_SKEW_MS = 5_000;

/** Claims wait `max(0, skew) + this` past `dueAt` (04 A24). */
export const CLAIM_SKEW_GUARD_MS = 2_000;

/**
 * How long after its free exit closes a player's stake counts as locked money (N1 §4.1).
 *
 * = the largest tolerated skew (5 s) + 2 s, so a house stake never counts money a skewed container
 * could still let the player cash out. ⛔ It applies to `lockedForHouse` — Enter now, FILL and every
 * TARGETED counter. The untargeted COUNTER keeps 04 A15's condition with no margin (N1 §4.1, N2 §4
 * step 12), and moving it onto this margin is a regression the engine suite (commit 4) pins.
 */
export const LOCK_MARGIN_MS = MAX_TOLERATED_SKEW_MS + CLAIM_SKEW_GUARD_MS;

/** The sweep decides only positions older than this (04 A24). */
export const SWEEP_MIN_AGE_MS = 5_000;

/**
 * A new target reacts only to stakes placed at least this long after it was created (N2 §2).
 *
 * ≥ the largest tolerated skew (5 s) + 2 s + the sweep's 5 s age filter: poll triggers are decided
 * only in the sweep (N2 §4), and the sweep only decides positions older than `SWEEP_MIN_AGE_MS`, so
 * no trigger at or after `effectiveFrom` can be decided before its target row exists.
 * `effectiveFrom = createdAt + 12 s` is written from DB `now()` in the insert.
 */
export const TARGET_ARMING_SEC = 12;

/** The post-commit hook's soft cache of "switch on and any bot ACTIVE" (PLAN §4.3). */
export const HOOK_SOFT_CACHE_MS = 5_000;

/** Concurrent hook calls per process; overflow is dropped and counted — the sweep catches it (04 A24). */
export const HOOK_SEMAPHORE = 4;

/**
 * `staleAt = dueAt + this`, written on every intent (N1 §2). No stake lands after its `staleAt` —
 * the seam re-reads it on the database clock inside `house:control`.
 */
export const STALE_AFTER_SEC = {
  /** COUNTER without a target, FILL and OPENER on Up & Down. */
  updown: 30,
  /** COUNTER without a target, FILL and OPENER on polls. */
  polls: 600,
  /** A targeted COUNTER (W12). */
  targetedCounter: 60,
  /** An Enter now press. */
  manual: 15,
} as const;

/** MANUAL and targeted CLAIMED rows expire this long past `staleAt`, whatever `claimedUntil` says (N1 §4.5). */
export const PLANNER_STALE_EXPIRY_GRACE_SEC = 5;

/** The sweep re-reads this far behind its watermark (04 A11); pinned ≥ 60 s. */
export const SWEEP_LOOKBACK_MS = 90_000;
/** …and never further back than this. */
export const SWEEP_MAX_LOOKBACK_MS = 600_000;
export const SWEEP_PAGE_SIZE = 200;
/**
 * The sweep's own timer, on the planner's leader only (C4-SPEC ruling 103): a 15 s cadence would land a targeted
 * reaction due at +7 s up to ~20 s late.
 */
export const SWEEP_INTERVAL_MS = 5_000;

/**
 * A claim's lease. ≥ 15 s admission wait + 4 × (10 s pool wait + 30 s transaction) + 5 s (04 A10), so
 * a fire that retries its lock four times still owns its row.
 */
export const CLAIM_TTL_SEC = 180;

/** Non-transient attempts before a claimed row is POISON (04 A10). Transient requeues never count. */
export const MAX_NON_TRANSIENT_ATTEMPTS = 3;

export const REQUEUE_BACKOFF_SEC = [1, 5, 15, 45] as const;

export const POLLER_INTERVAL_MS = 2_000;
export const POLLER_JITTER_MS = 300;
export const MAX_FIRES_PER_PROCESS = 2;
export const PLANNER_INTERVAL_MS = 15_000;
export const PLANNER_LEASE_MS = 45_000;
export const FIRE_HEARTBEAT_MS = 30_000;
export const FIRST_TICK_DELAY_MS = 20_000;
export const ENGINE_STALE_MS = 30_000;
export const BOOT_GRACE_MS = 90_000;
export const POLLER_FAILURE_ALERT_AFTER = 10;

/**
 * ⭐ THE MARKER THAT MAKES A BLOCKED CLAIM VISIBLE (register:1218, 2026-09-21).
 *
 * ⛔ THE DESK COULD BE PERFECTLY SILENT WHILE NOTHING WAS STAKED. `claimGate` refuses every claim when this
 * container's skew is unknown or over `MAX_TOLERATED_SKEW_MS`, and `pollerPass` then returned early writing
 * NOTHING — no beat and no error row. The planner kept beating regardless, so `houseEngineVerdict` saw a fresh
 * planner beat (not STALE), no poller error (not POLLER_FAILING), no failed duties and active accounts (not
 * IDLE) and returned `null` — and the Desk renders no Callout at all for a `null` verdict. Switch ON, green
 * chip, populated tiles, and every stake refused.
 * ⛔ A STALE POLLER BEAT CANNOT CARRY THIS. `pollerPass` writes its beat only when it actually CLAIMED rows
 * (`if (rows.length === 0) return …`), so a quiet healthy desk and a blocked one have the same stale beat.
 * Using it would cry wolf on every idle hour, which is how a real alarm gets ignored.
 * ⭐ SO THE FACT IS WRITTEN POSITIVELY, as a CODE rather than an instant. A code needs no clock — which matters
 * enormously here, because the one condition it reports is *the clock cannot be trusted*, and a timestamp
 * written by a skewed container is exactly the thing that cannot be compared.
 */
export const CLAIMS_BLOCKED_CODE = "CLAIMS_BLOCKED";
export const ERROR_STREAK_OFF_AT = 3;
export const TRANSIENT_ALERT_AFTER_MS = 120_000;
export const ALERT_REPAIR_AFTER_MS = 30_000;

/** `minTimeToCutoff` never goes below this, to absorb container skew (PLAN §4.7). */
export const MIN_TIME_TO_CUTOFF_FLOOR_SEC = 10;

/** A claimed bet usually lands this long after `dueAt` — the "Usually lands" copy (04 A24, N2 §5). */
export const USUAL_LATENESS_SEC = { min: 2, max: 5 } as const;

/** Up & Down price freshness for the closeness rule (04 A15). */
export const UD_VENDOR_BAR_MAX_AGE_SEC = 120;
export const UD_OBSERVATION_MAX_AGE_SEC = 60;

/**
 * ⭐ THE FLOOR UNDER THE CLOSENESS BAND (04 A15), AND WHY IT EXISTS.
 *
 * A15 scales "has the price run away from the open?" by the round's OWN winning margin, which is right
 * whenever that margin describes the asset. It does not when the margin is a bare tick: `computeTargets`
 * is `max(openPrice × marginBps/10_000, tick)`, so a chain whose `marginBps` is 0 freezes a band of ONE
 * TICK, and a tick is a property of the price's DECIMALS, not of how far the price moves.
 *
 * 🔴 MEASURED ON PRODUCTION 2026-09-23. The live desk had run 23 hours, switched on, funded (TZS 70,000),
 * ACTIVE, correctly scoped to BTC/USD 5, 10 and 15 — and had placed NOTHING, ever. All three BTC chains
 * carry `marginBps = 0`, so each round's band was `tick` = 0.02 on an open price of 86,379.20: a margin
 * of 0.23 PARTS PER MILLION. A15 then demanded the live price sit within `closenessPct%` of two cents —
 * 0.005 at the default 25, and 0.02 even at 100, which is the highest the field admits. Three rounds open
 * at the same instant carried opens of 86,329.34, 86,361.07 and 86,379.20: BTC moved fifty dollars inside
 * fifteen minutes. So every FILL and OPENER was refused UD_CLOSENESS on every round, for ever, and NO
 * setting an officer could choose would have changed it.
 *
 * ⛔ THE FLOOR BELONGS TO THIS TEST, NOT TO THE GAME. `computeTargets`, the frozen targets and settlement
 * are untouched: what a player wins is decided by the round's own band exactly as before. This constant
 * only stops a degenerate band from standing in as the ruler of a house bet's own judgement.
 *
 * 5 bps is the value the one chain with a deliberate margin already uses (XAU/USD 15-min), and it leaves
 * every band that was ever meaningful unchanged — a floor, never a cap.
 */
export const UD_CLOSENESS_FLOOR_BPS = 5;

/** Postgres `lock_timeout` for the OFF drain and for a house bet's market and control locks (04 A9). */
export const OFF_DRAIN_LOCK_TIMEOUT = "3s";
export const HOUSE_BET_LOCK_TIMEOUT = "2s";

// ---------------------------------------------------------------------------
// Presses — the officer decision record (N1 §2)
// ---------------------------------------------------------------------------

/** The audit lease on a press row: `auditClaimUntil = now() + 5 minutes`. */
export const PRESS_AUDIT_LEASE_MS = 300_000;

/** The planner repairs a missing press audit this long after the press's `updatedAt`. */
export const PRESS_AUDIT_REPAIR_AFTER_MS = 60_000;

/**
 * A press still CHECKING this long after `createdAt` is REFUSED with `PRESS_REFUSAL_INTERRUPTED`
 * (N1 §2 step 10). Safe against a late request, because every later press write is conditional on
 * `state='CHECKING'`.
 */
export const PRESS_INTERRUPTED_AFTER_MS = 120_000;
export const PRESS_REFUSAL_INTERRUPTED = "INTERRUPTED";
export const PRESS_INTERRUPTED_COPY = "This press was interrupted before anything was saved. Nothing moved. You can try again.";

/** An Enter now preview's figures are good for this long (`validUntilIso`, N1 §6). */
export const ENTER_NOW_PREVIEW_VALID_MS = 60_000;

/** The target timing preview is requested this long after the last field change (N2 §6). */
export const TARGET_PREVIEW_DEBOUNCE_MS = 250;

// ---------------------------------------------------------------------------
// Oversight, compliance windows and retention
// ---------------------------------------------------------------------------

/** A staff-chosen stake is attributed to every opposite account holding at least this share (N1 §3). */
export const COUNTERPARTY_ATTRIBUTION_MIN_PCT = 25;

/** The voided and self-decided oversight passes look back this far (N1 §4.5). */
export const OVERSIGHT_LOOKBACK_DAYS = 30;

/** Rules from a newer build that last this long raise one alert (04 F4). */
export const RULES_FUTURE_ALERT_AFTER_MS = 600_000;

/** A reset link within this many days of an officer-set email blocks re-verify (04 A4, C9). */
export const OFFICER_EMAIL_WINDOW_DAYS = 30;

/** AlertOnce throttle rows are operational only (P3); `retention.ts` re-exports this in commit 4. */
export const HOUSEBOT_ALERT_ONCE_RETENTION_DAYS = 30;
export const HOUSEBOT_ALERT_ONCE_PURGE_BATCH = 5_000;
/** One nightly run purges at most this many batches; the rest waits for the next night (C4-SPEC ruling 86). */
export const HOUSEBOT_ALERT_ONCE_PURGE_MAX_BATCHES = 20;

/** Bots, events, intents, targets and presses: never deleted (04 A20). */
export const HOUSEBOT_RECORD_RETENTION_YEARS = 7;

// ---------------------------------------------------------------------------
// AlertOnce keys — the only key formats allowed
// ---------------------------------------------------------------------------

/**
 * A key whose last part is an EAT day, hour, month or minute. ⛔ The suffix is computed by the
 * claim INSIDE its INSERT from DB `now()` (04 A24), as `prefix + ":" + <EAT_SQL fragment>` — so a
 * builder here returns the prefix and the unit, never a finished key.
 */
export type EatSuffixedKey = { readonly prefix: string; readonly unit: EatKeyUnit };

const suffixed = (prefix: string, unit: EatKeyUnit): EatSuffixedKey => ({ prefix, unit });

/** `staff-stake-self-decided:<marketId>:<action>` actions (N1 §4.5). */
export const STAFF_SELF_DECIDED_ACTIONS = [
  "resolved",
  "voided",
  "reopened",
  "objection_upheld",
  "objection_rejected",
] as const;
export type StaffSelfDecidedAction = (typeof STAFF_SELF_DECIDED_ACTIONS)[number];

/**
 * Every AlertOnce key the house writes. A throttle whose key is built anywhere else is a throttle
 * two call sites can spell differently — which is a throttle that fires twice.
 */
export const ALERT_KEY = {
  /** One alert per bot, code and EAT day (PLAN §4.6: balance and cash-only skips). */
  botDaily: (botId: string, code: string) => suffixed(`bot:${botId}:${code}`, "day"),
  /** The penalty box: an account is boxed for the EAT day (PLAN §4.3). */
  penalty: (userId: string) => suffixed(`penalty:${userId}`, "day"),
  /** One password-pause alert per new fingerprint (02 §2.3, X4). */
  password: (botId: string, fingerprint: string) => `pw:${botId}:${fingerprint}`,
  /** Transient database failures lasting 2 min (04 A10). */
  engineDb: () => suffixed("engine:db", "hour"),
  /** Ten poller failures in a row (04 A24). */
  pollerFailing: () => suffixed("engine:poller_failing", "hour"),
  clockSkew: () => suffixed("engine:clock_skew", "day"),
  dbTimezone: () => suffixed("engine:db_timezone", "day"),
  poison: (intentId: string) => `poison:${intentId}`,
  stakeNotWhole: (botId: string) => suffixed(`stake-not-whole:${botId}`, "day"),
  /** Existing player-side holes the engine reports once each (04 A12). */
  udBornUnlocked: (roundId: string) => `ud-born-unlocked:${roundId}`,
  udOrphanMarket: (marketId: string) => `ud-orphan-market:${marketId}`,
  chainInScope: (botId: string, chainId: string) => `chain-in-scope:${botId}:${chainId}`,
  settleBlocked: (botId: string) => suffixed(`settle-blocked:${botId}`, "day"),
  /** Exit rules changed (04 A16); the hash is of the exit config. */
  exitConfig: (hash: string) => `exit-config:${hash}`,
  /** The holder staked against their own bot on this market (04 A21, C13) — alert, never refuse. */
  holderAgainst: (botId: string, marketId: string) => `holder-against:${botId}:${marketId}`,
  /** The holder was locked out by wrong sign-ins (04 C13). */
  holderLocked: (botId: string) => suffixed(`holder-locked:${botId}`, "day"),
  /** A cooling-off break ended (04 C8). */
  rgEnded: (botId: string, coolingOffUntilIso: string) => `bot:${botId}:RG_ENDED:${coolingOffUntilIso}`,
  /** A display name that can reveal the account (04 C9); the hash is computed server-side. */
  nameRisk: (botId: string, nameHash: string) => `bot:${botId}:NAME_RISK:${nameHash}`,
  /** A holder cause cleared (04 C13). */
  cleared: (botId: string, cause: string, clearedAtIso: string) => `bot:${botId}:CLEARED:${cause}:${clearedAtIso}`,
  /**
   * Hourly summaries, built from PLACED intents (04 C13). The suffix names the hour SUMMARISED — the one just ended
   * (C4-SPEC ruling 80) — not the hour the summary was sent in.
   */
  /**
   * ⛔ THE AUDIENCE IS `"admins"` AND NOTHING ELSE (C4 ruling 149, owner ruling D19c; narrowed in C5-8, 2026-09-21).
   * It read `"admins" | "holder"` for five commits after the holder's hourly summary was DELETED, so the type went on
   * describing a recipient the platform must never have. A widened union on a key builder is not harmless: it is an
   * invitation, and the next caller to accept it would mint a summary key whose audience segment is the holder — a
   * house-bot notice addressed to the holder, the exact thing D19c forbids. `test:house-bot-rules` §11.27 pins this.
   */
  summary: (audience: "admins", botId: string | "all") => suffixed(`summary:${audience}:${botId}`, "previousHour"),
  productDenied: (value: string) => suffixed(`product-denied:${value}`, "day"),
  rulesFuture: (botId: string | "global", version: number) => `rules-future:${botId}:${version}`,
  /** Live stake bounds moved (04 F5): the bot can no longer bet, or a stake is clamped. */
  boundsInvalid: (botId: string, hash: string) => `bounds-invalid:${botId}:${hash}`,
  boundsClamp: (botId: string, hash: string) => `bounds-clamp:${botId}:${hash}`,
  /** An Enter now stake or staff-chosen cap below the live minimum — one per bot, field and hash (N1 §5). */
  boundsCantFit: (botId: string, field: string, hash: string) => `bounds-cant-fit:${botId}:${field}:${hash}`,
  erasureBlocked: (botId: string) => `erasure-blocked:${botId}`,
  /** Oversight (N1 §4.5). */
  staffStakeVoided: (marketId: string) => `staff-stake-voided:${marketId}`,
  staffStakeSelfDecided: (marketId: string, action: StaffSelfDecidedAction) =>
    `staff-stake-self-decided:${marketId}:${action}`,
  /** `ENTER_NOW_PREVIEWED` at most once per officer, bot and poll per EAT minute (N1 §6). */
  preview: (actorId: string, botId: string, marketId: string) =>
    suffixed(`preview:${actorId}:${botId}:${marketId}`, "minute"),
  /**
   * The double-tap claim for presses that are NOT Enter now, target or staff-cancel presses —
   * those write a `HouseBotPress` row instead (N1 §2, PLAN §18 C4 row).
   */
  submit: (actorId: string, submitId: string) => `submit:${actorId}:${submitId}`,
} as const;

// ---------------------------------------------------------------------------
// Audit — one category table and one payload allowlist (R7)
// ---------------------------------------------------------------------------

/**
 * The category of every house audit action. ⛔ A house action written with any other name, or any
 * other category, is a row no reader of this table can find — the console's action feed, the erasure
 * routine's rewrites and every absence proof read it, and owner ruling D20 (2026-09-17) struck the
 * regulator index that also did. The rules suite pins that every quoted house audit literal under
 * `src/` is a key here.
 */
export const HOUSE_AUDIT = {
  "house_bot.designated": "COMPLIANCE",
  "house_bot.started": "COMPLIANCE",
  "house_bot.removed": "COMPLIANCE",
  "house_bot.switch_on": "COMPLIANCE",
  "house_bot.switch_off": "COMPLIANCE",
  "house_bot.rules_saved": "COMPLIANCE",
  "house_bot.limits_saved": "COMPLIANCE",
  "house_bot.overwrote": "COMPLIANCE",
  "house_bot.auto_paused": "COMPLIANCE",
  "house_bot.loss_stop": "COMPLIANCE",
  "house_bot.engine_fault": "COMPLIANCE",
  "house_bot.poison": "COMPLIANCE",
  "house_bot.holder_withdrew_consent": "COMPLIANCE",
  "house_bot.reimbursement_recorded": "COMPLIANCE",
  "house_bot.sunset": "COMPLIANCE",
  "house_bot.board_disclosure_recorded": "COMPLIANCE",
  "house_bot.enter_now": "COMPLIANCE",
  "house_bot.enter_now_refused": "COMPLIANCE",
  "house_bot.staff_intent_cancelled": "COMPLIANCE",
  "house_bot.target_added": "COMPLIANCE",
  "house_bot.target_updated": "COMPLIANCE",
  "house_bot.target_removed": "COMPLIANCE",
  "house_bot.paused": "ADMIN",
  "house_bot.intent_cancelled": "ADMIN",
  "house_bot.exported": "ADMIN",
  "house_bot.password_verified": "SECURITY",
  "house_bot.password_rejected": "SECURITY",
  "house_bot.verify_rate_limited": "SECURITY",
  "house_bot.verify_account_locked": "SECURITY",
  "house_bot.verify_reserved": "SECURITY",
  "house_bot.credential_changed": "SECURITY",
} as const satisfies Record<string, AuditCategory>;

export type HouseAuditAction = keyof typeof HOUSE_AUDIT;

export function isHouseAuditAction(v: unknown): v is HouseAuditAction {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(HOUSE_AUDIT, v);
}

/** The actions the engine itself writes, as `SYSTEM_HOUSE_BOT_ACTOR`, outside every lock (04 A19). */
export const HOUSE_ENGINE_AUDIT_ACTIONS = [
  "house_bot.auto_paused",
  "house_bot.removed",
  "house_bot.loss_stop",
  "house_bot.switch_off",
  "house_bot.engine_fault",
  "house_bot.poison",
] as const satisfies readonly HouseAuditAction[];

/** The only keys a house audit payload may carry. */
export const HOUSE_AUDIT_PAYLOAD_KEYS = [
  "botId",
  "holderUserId",
  "from",
  "to",
  "cause",
  "rulesVersion",
  "limitsVersion",
  "changes",
  "counts",
  "eventId",
  /* ⛔ "reason" WAS HERE AND IS GONE (C5-6's review, 2026-09-20). This list is what R7 permits in a house audit
     payload, and it permitted the one key that carried an officer's free text — `press-audit.ts` put
     `reason: press.reason` into all four of its payloads. The audit log cannot be rewritten (no update, no delete
     anywhere in src/; every row HMAC-chained), so a holder's name typed into that box outlived the holder's own
     erasure. This guard tests KEY NAMES and never inspects a value, so permitting the key was permitting the text.
     ⭐ Removing it is what makes the regression impossible rather than merely fixed: a future payload that adds
     `reason` back now fails `isAllowedHouseAuditPayload` and the press goes unaudited-and-counted instead of
     silently recording something erasure cannot reach. The reason still lives on the press row and the event,
     both rewritten to `[erased]` by `pseudonymiseForUser`. */
  "marketId",
  "intentId",
  "targetId",
  "side",
  "stakeTzs",
  "entryCondition",
  "outcome",
  "code",
  "delayMinSec",
  "delayMaxSec",
  "timingFrom",
  "reactTo",
  "bots",
  "cancelled",
  "openExposureByMarket",
  "sections",
  "amountTzs",
] as const;

/**
 * ⛔ Never in a payload, at any depth. The audit chain is kept seven years and cannot be redacted,
 * so a label or a holder's name written into it survives the holder's erasure (R7, `erasure.ts`).
 */
export const HOUSE_AUDIT_FORBIDDEN_KEYS = [
  "label",
  "labelKey",
  "note",
  "passwordFingerprint",
  "fingerprint",
  "phone",
  "phoneE164",
  "displayName",
  "name",
  "email",
] as const;

/** The hint under every reason field that lands in the audit log (R7). */
/**
 * ⚠️ THE SENTENCE WAS TRUE AND IS NOT ANY MORE, so it is reworded rather than left to be wired by a later form
 * author (C5-6's review, 2026-09-20). The reason no longer reaches the audit log at all — `press-audit.ts` stopped
 * putting it there because the log cannot be rewritten and erasure could not follow it. It IS still kept on the
 * press row and the event, which is where a compliance reader finds it and where `pseudonymiseForUser` can rewrite
 * it to `[erased]`. So the warning stands, for a smaller and truthful reason: an erasure can reach this text, but a
 * screenshot of it cannot, and a holder's name has no business in an operator's note either way.
 * ⛔ This constant has NO READER anywhere in src/ or scripts/ — measured. It is wired by the Commit 7 form that
 * takes the reason, and it must say something true on the day that happens.
 */
export const HOUSE_REASON_HINT = "Kept on the record until the account is erased — don't write the holder's name or number.";

/** `changes[].before/after` are numbers or null, except these, which carry their enum strings. */
const ENUM_CHANGE_FIELDS: readonly string[] = ["timingFrom", "reactTo"];

function hasForbiddenKey(v: unknown, depth: number): boolean {
  if (v === null || typeof v !== "object") return false;
  if (depth > 8) return true; // fail closed: too deep to prove clean is refused (R7)
  if (Array.isArray(v)) return v.some((item) => hasForbiddenKey(item, depth + 1));
  return Object.entries(v as Record<string, unknown>).some(
    ([k, inner]) => (HOUSE_AUDIT_FORBIDDEN_KEYS as readonly string[]).includes(k) || hasForbiddenKey(inner, depth + 1),
  );
}

function isChangeValue(field: string, v: unknown): boolean {
  if (ENUM_CHANGE_FIELDS.includes(field)) {
    return v === null || (typeof v === "string" && ([...TIMING_FROM, ...REACT_TO] as readonly string[]).includes(v));
  }
  return v === null || (typeof v === "number" && Number.isFinite(v));
}

/**
 * Is this payload allowed on a house audit row?
 *
 * - every top-level key is in `HOUSE_AUDIT_PAYLOAD_KEYS`;
 * - no forbidden key appears at any depth, and a payload nested deeper than 8 levels is refused;
 * - `changes`, when present, is an array of `{field, before, after}` whose values are numbers or
 *   null — except `timingFrom` and `reactTo`, which carry their enum strings.
 */
export function isAllowedHouseAuditPayload(p: Record<string, unknown>): boolean {
  if (p === null || typeof p !== "object" || Array.isArray(p)) return false;
  const allowed = HOUSE_AUDIT_PAYLOAD_KEYS as readonly string[];
  if (!Object.keys(p).every((k) => allowed.includes(k))) return false;
  if (hasForbiddenKey(p, 0)) return false;
  if (p.changes !== undefined) {
    if (!Array.isArray(p.changes)) return false;
    for (const c of p.changes) {
      if (c === null || typeof c !== "object" || Array.isArray(c)) return false;
      const row = c as Record<string, unknown>;
      if (!Object.keys(row).every((k) => k === "field" || k === "before" || k === "after")) return false;
      if (typeof row.field !== "string") return false;
      if (!isChangeValue(row.field, row.before) || !isChangeValue(row.field, row.after)) return false;
    }
  }
  return true;
}
