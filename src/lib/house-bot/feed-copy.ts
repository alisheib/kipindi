/**
 * FEED COPY — the words for every engine outcome, target end and refused press (PLAN §8, 04 N1 §8, N2 §8).
 *
 * ⛔ A RECORD PER CLOSED LIST. Each table is `satisfies Record<…, string>` over its union, so an engine code, end
 * cause or press code added without a sentence is a compile error — never a blank cell or a raw enum in the
 * console (03 §L3). Placeholders are `{bot}`, `{name}`, `{entry}`, `{limit}`, `{caption}` and `{title}`, filled
 * by `fillCopy`; a sentence never carries a player's name or phone, only the "Player #…" handle.
 *
 * Pure: imports `./constants` only.
 */
import type { CapCode, EngineCode, HouseBotEventKind, PressState, TargetEndCause } from "./constants";

/** Why an automatic row was not placed — the clause after "Not placed: ". */
export const ENGINE_CODE_SENTENCE = {
  OUTSIDE_SCHEDULE: "it was outside {bot}'s schedule",
  POOL_BAND: "the pool was outside {bot}'s pool band",
  NOT_REACTING: "{bot} did not react this time (react probability)",
  TRIGGER_STAKE_RANGE: "the player's stake was outside {bot}'s trigger range",
  NO_REACT_ZONE: "the stake came too close to betting close",
  EXIT_WINDOW_TOO_LATE: "the player's exit window closes too late to react before betting close",
  UD_CLOSENESS: "the price had already moved too far from the round's open",
  UD_NO_PRICE: "the round has no open price or targets",
  PENALTY_BOX: "this player is in today's penalty box",
  MARKET_HELD: "another bot, or a queued stake, already holds this market",
  NO_ELIGIBLE_BOT: "no bot could take it",
  STAKE_BELOW_MIN: "the stake left after the limits was below the minimum",
  MAINTENANCE: "50pick was in maintenance",
  CUTOFF: "it was too close to betting close",
  MARKET_NOT_LIVE: "the market was no longer open",
  MARKET_GONE: "the market no longer exists",
  MASTER_OFF: "house bots were switched off",
  BOT_NOT_ACTIVE: "{bot} was not running",
  TRIGGER_EXITED: "the player cashed out first",
  CONDITION_GONE: "the market's money changed before the stake, so its side no longer held",
  BUSY_TIMEOUT: "50pick stayed busy until it was too late",
  UNMAPPED: "the bet was refused for a reason the engine does not know",
  INTERNAL: "an internal error stopped it",
  STAKE_BOUNDS_CHANGED: "the platform's stake limits changed",
  POISON: "it failed three times",
  NO_CUTOFF: "the poll has no betting close",
  UD_NO_ROUND: "the Up & Down market has no round",
  PRODUCT_NOT_SUPPORTED: "house bots do not stake on this product",
  UD_STALE_PRICE: "no fresh price was available",
  MARKET_REOPENED: "the market was reopened",
  CHAIN_NOT_RUNNING: "the Up & Down chain was not running",
  OUT_OF_SCOPE: "{bot}'s rules no longer cover this market",
  HOLDER_RECRUIT: "the player was recruited by a bot holder",
  STALE: "50pick was busy until the time limit passed",
  CANCELLED_BY_ADMIN: "{name} cancelled it before it was placed (recorded as a veto)",
  INFO_BLACKOUT: "an AI result check is recorded on this market, or it was reopened after one",
  TARGET_REMOVED: "the target was stopped by {name}",
  TARGET_ENDED: "the target ended ({caption})",
  COUNTERPARTY_CONCENTRATION: "one player held more than {limit}% of the locked money",
  CAP_OPPOSITE_SIDE: "{bot} already held the other side of this market",
  CAP_STAKE_MIN: "the stake was below {bot}'s minimum",
  CAP_STAKE_MAX: "the stake was above {bot}'s maximum",
  CAP_PER_MARKET: "{bot}'s per-market TZS limit was reached",
  CAP_BALANCE_FLOOR: "{bot}'s balance was too low",
  CAP_DAILY_STAKE: "{bot}'s daily stake limit was reached",
  CAP_DAILY_LOSS_PROJECTED: "{bot}'s daily loss limit could have been passed",
  CAP_EXPOSURE: "{bot}'s open exposure limit was reached",
  CAP_STAFF_CHOSEN_PER_DAY: "{bot} had used its staff-chosen stakes for today",
  CAP_STAFF_CHOSEN_DAILY_STAKE: "{bot}'s staff-chosen TZS limit for today was reached",
  CAP_TARGET_ONCE: "the target reacts to the first stake only, and one reaction is already placed",
  CAP_MIN_GAP: "{bot}'s minimum gap between bets applied",
  CAP_PER_HOUR: "{bot}'s hourly bet limit was reached",
  CAP_PER_DAY: "{bot}'s daily bet limit was reached",
  CAP_PER_MARKET_COUNT: "{bot}'s bets-per-market limit was reached",
  CAP_GLOBAL_PER_MARKET: "house bots' per-market TZS limit was reached",
  CAP_GLOBAL_DAILY_STAKE: "house bots' daily stake limit was reached",
  CAP_GLOBAL_LOSS_PROJECTED: "house bots' daily loss limit could have been passed",
  CAP_GLOBAL_EXPOSURE: "house bots' open exposure limit was reached",
  CAP_GLOBAL_BETS_PER_MINUTE: "house bots' bets-per-minute limit applied",
  CAP_GLOBAL_BETS_PER_DAY: "house bots' daily bet limit was reached",
  CAP_COUNTERPARTY_COUNT: "this player had been countered as often as allowed today",
  CAP_COUNTERPARTY_TZS: "the TZS set against this player today reached its limit",
  CAP_GLOBAL_STAFF_CHOSEN_PER_DAY: "house bots had used today's staff-chosen stakes",
  CAP_GLOBAL_STAFF_CHOSEN_DAILY_STAKE: "house bots' staff-chosen TZS limit for today was reached",
} as const satisfies Record<EngineCode, string>;

/** Every CAP_ code has its own row above — `CapCode` is closed, so this is a compile-time proof too. */
export type CapSentenceKey = `CAP_${CapCode}`;

/**
 * N1 §8: staff-chosen rows. These codes use their own sentence; every other code reads
 * "{entry} not placed: " + `ENGINE_CODE_SENTENCE`. `{entry}` is "Enter now by {name}".
 */
export const STAFF_CHOSEN_SENTENCE = {
  INFO_BLACKOUT: "{entry} not placed: an AI result check is recorded on this poll, or it was reopened after one.",
  STALE: "{entry} not placed: 50pick was busy until the time limit (15 s) passed.",
  CONDITION_GONE: "{entry} not placed: the poll's money changed before the stake, so its side no longer held.",
  COUNTERPARTY_CONCENTRATION: "{entry} not placed: one player held more than {limit}% of the locked money.",
  CAP_STAFF_CHOSEN_PER_DAY: "{entry} not placed: {bot} had used its staff-chosen stakes for today.",
  CAP_STAFF_CHOSEN_DAILY_STAKE: "{entry} not placed: {bot}'s staff-chosen TZS limit for today was reached.",
  CAP_GLOBAL_STAFF_CHOSEN_PER_DAY: "{entry} not placed: house bots had used today's staff-chosen stakes.",
  CAP_GLOBAL_STAFF_CHOSEN_DAILY_STAKE: "{entry} not placed: house bots' staff-chosen TZS limit for today was reached.",
  CAP_OPPOSITE_SIDE: "{entry} not placed: {bot} already held the other side of this poll.",
  CANCELLED_BY_ADMIN: "{entry} cancelled by {name} before it was placed (recorded as a veto).",
} as const satisfies Partial<Record<EngineCode, string>>;

export function staffChosenSentence(code: EngineCode): string {
  return (STAFF_CHOSEN_SENTENCE as Partial<Record<EngineCode, string>>)[code] ?? `{entry} not placed: ${ENGINE_CODE_SENTENCE[code]}.`;
}

/** N2 §8: end-cause captions. */
export const TARGET_END_CAPTION = {
  DONE: "Reacted once — done",
  MARKET_CLOSED: "Poll closed",
  CUTOFF_PASSED: "Too close to betting close",
  MARKET_REOPENED: "Poll was reopened",
  MARKET_GONE: "Poll no longer exists",
  OUT_OF_SCOPE: "No longer in {bot}'s scope",
  INFO_BLACKOUT: "An AI result check was recorded",
  BOT_REMOVED: "Bot removed",
  SUNSET: "House bots withdrawn",
  VETOED: "Stopped by staff (veto) — can't be targeted again",
  CONSENT_VOID: "Holder's permission ended",
} as const satisfies Record<TargetEndCause, string>;

/** N2 §8: targeted rows. Any other code reads "Target on “{title}”: not placed — {sentence}. Nothing moved." */
export const TARGET_SENTENCE = {
  CAP_TARGET_ONCE: "Target on “{title}”: {bot} didn't react to {handle} — it reacts to the first stake only, and one reaction is already placed.",
  TARGET_REMOVED: "Target on “{title}”: queued reaction cancelled — the target was stopped by {name}.",
  TARGET_ENDED: "Target on “{title}”: queued reaction cancelled — the target ended ({caption}).",
  INFO_BLACKOUT: "Target on “{title}”: not placed — an AI result check is recorded on this market. Nothing moved.",
  STALE: "Target on “{title}”: not placed — 50pick couldn't place it within 60 s of its time. Nothing moved.",
} as const satisfies Partial<Record<EngineCode, string>>;

export function targetSentence(code: EngineCode): string {
  return (TARGET_SENTENCE as Partial<Record<EngineCode, string>>)[code] ?? `Target on “{title}”: not placed — ${ENGINE_CODE_SENTENCE[code]}. Nothing moved.`;
}

/** N1 §8: refused Enter now presses, rendered as "Not placed: {sentence}. Nothing moved." */
export const PRESS_REFUSAL_CODES = [
  "WITHDRAWN", "ENGINE_DISABLED", "ENGINE_STALE", "MASTER_OFF", "SWITCHED_OFF_SINCE", "STAFF_LIMITS_UNSET",
  "BOT_MISSING", "BOT_REMOVED", "BOT_NOT_ACTIVE", "BOT_PAUSED_SINCE", "HOLDER_CAUSE", "RULES_FROM_FUTURE",
  "RULES_REVIEW", "ENTER_NOW_OFF", "OPTION_UNSET", "MARKET_MISSING", "UPDOWN_NOT_ALLOWED", "PRODUCT_NOT_ALLOWED",
  "MARKET_NOT_LIVE", "NO_CUTOFF", "SCOPE_PRODUCT", "SCOPE_CATEGORY", "INFO_BLACKOUT", "TOO_LATE", "OWNER_POSITION",
  "OTHER_BOT", "OWN_INTENT", "PER_MARKET_COUNT", "MANUAL_LIVE", "ONLY_SELLABLE", "HOUSE_ONLY", "BALANCED",
  "OWN_OTHER_SIDE", "STAKE_BELOW_MIN", "COUNTERPARTY_CONCENTRATION", "COUNTERPARTY_LIMIT", "PREVIEW_STALE",
  "PREVIEW_EXPIRED", "STAFF_CHOSEN_PER_DAY", "GLOBAL_STAFF_CHOSEN", "MIN_GAP", "PER_HOUR", "PER_DAY",
  "GLOBAL_BETS_PER_MINUTE", "BUSY", "INTERRUPTED", "SUBMIT_ID_REUSED",
] as const;
export type PressRefusalCode = (typeof PRESS_REFUSAL_CODES)[number];

const NOT_RUNNING = "the bot wasn't running";
const NOT_TAKEABLE = "this market couldn't take a house stake";
const HELD = "the market was already held or queued";
const NO_ROOM = "there was no room for a stake";
const TOO_MUCH = "one player held too much of the money";
const RATE = "a bet rate limit applied";

export const PRESS_REFUSAL_SENTENCE = {
  WITHDRAWN: "house bots are withdrawn",
  ENGINE_DISABLED: "the bot engine wasn't running",
  ENGINE_STALE: "the bot engine wasn't running",
  MASTER_OFF: "house bots were off",
  SWITCHED_OFF_SINCE: "house bots were off",
  STAFF_LIMITS_UNSET: "the staff-chosen limits weren't set",
  BOT_MISSING: NOT_RUNNING,
  BOT_REMOVED: NOT_RUNNING,
  BOT_NOT_ACTIVE: NOT_RUNNING,
  BOT_PAUSED_SINCE: NOT_RUNNING,
  HOLDER_CAUSE: "the holder's account needed attention",
  RULES_FROM_FUTURE: "the bot's rules needed review",
  RULES_REVIEW: "the bot's rules needed review",
  ENTER_NOW_OFF: "Enter now wasn't set up for this bot",
  OPTION_UNSET: "Enter now wasn't set up for this bot",
  MARKET_MISSING: NOT_TAKEABLE,
  UPDOWN_NOT_ALLOWED: NOT_TAKEABLE,
  PRODUCT_NOT_ALLOWED: NOT_TAKEABLE,
  MARKET_NOT_LIVE: NOT_TAKEABLE,
  NO_CUTOFF: NOT_TAKEABLE,
  SCOPE_PRODUCT: "the poll wasn't in the bot's scope",
  SCOPE_CATEGORY: "the poll wasn't in the bot's scope",
  INFO_BLACKOUT: "an AI result check was recorded, or the market was reopened after one",
  TOO_LATE: "it was too close to betting close",
  OWNER_POSITION: "the holder had their own stake here",
  OTHER_BOT: HELD,
  OWN_INTENT: HELD,
  PER_MARKET_COUNT: HELD,
  MANUAL_LIVE: HELD,
  ONLY_SELLABLE: NO_ROOM,
  HOUSE_ONLY: NO_ROOM,
  BALANCED: NO_ROOM,
  OWN_OTHER_SIDE: NO_ROOM,
  STAKE_BELOW_MIN: NO_ROOM,
  COUNTERPARTY_CONCENTRATION: TOO_MUCH,
  COUNTERPARTY_LIMIT: TOO_MUCH,
  PREVIEW_STALE: "the figures had changed",
  PREVIEW_EXPIRED: "the figures had changed",
  STAFF_CHOSEN_PER_DAY: "today's staff-chosen limit was used",
  GLOBAL_STAFF_CHOSEN: "today's staff-chosen limit was used",
  MIN_GAP: RATE,
  PER_HOUR: RATE,
  PER_DAY: RATE,
  GLOBAL_BETS_PER_MINUTE: RATE,
  BUSY: "50pick was busy",
  INTERRUPTED: "the press was interrupted before anything was saved",
  SUBMIT_ID_REUSED: "the request id was reused",
} as const satisfies Record<PressRefusalCode, string>;

/** N1 §8: the words for the event kinds N1 and N2 added. */
export const STAFF_EVENT_WORD = {
  ENTER_NOW_PREVIEWED: "Enter now checked",
  ENTER_NOW_REQUESTED: "Enter now pressed",
  OPENER_SIDE_DRAWN: "Opener side drawn",
  TARGET_ADDED: "Target added",
  TARGET_UPDATED: "Target changed",
  TARGET_REMOVED: "Target removed",
  TARGET_ENDED: "Target ended",
  STAFF_INTENT_CANCELLED: "Staff-chosen stake cancelled",
} as const satisfies Partial<Record<HouseBotEventKind, string>>;

/**
 * What an operator is told when house bots are switched off (04 A9 F9 steps 2 and 4). One home for the words the
 * console action and its ops script both print (both land in commit 7); only BUSY and DRAINED differ, and only in
 * the second sentence.
 */
export const SWITCH_OFF_COPY = {
  DRAINED: "House bots are off. No bot will place a bet.",
  BUSY: "Switched off. A bet already in its final step may still complete.",
  ALREADY_OFF: "House bots were already off. No bot will place a bet.",
  WRITE_FAILED: "Could not reach the database. House bots were NOT switched off. Try again, or turn on Maintenance mode.",
} as const;

export const ENTRY_WORD = { AUTO: "Automatic", TARGET: "Targeted", MANUAL: "Enter now" } as const;

export const PRESS_STATE_WORD = { CHECKING: "Checking", REFUSED: "Refused", QUEUED: "Queued", DONE: "Done" } as const satisfies Record<PressState, string>;

/** Fill `{name}` placeholders. An unknown placeholder is left as written, so a missing value is visible in review. */
export function fillCopy(template: string, vars: Readonly<Record<string, string | number>>): string {
  return template.replace(/\{([a-z]+)\}/g, (whole, key: string) => (key in vars ? String(vars[key]) : whole));
}
