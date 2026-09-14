/**
 * EVERY REFUSAL THE BET PATH CAN RETURN TO A HOUSE STAKE — one list (04 A10, F3).
 *
 * ⛔ WHY A LIST. The house engine maps each refusal to an action (skip, pause, requeue, fail), and a
 * refusal it has never heard of must be a compile error there, not a surprise at 3 a.m. So the reasons
 * `buyPositionInner`, the house gates (`server/house-bot/seam.ts`) and `placeHouseBet` emit are
 * enumerated here, and `test:house-bot-seam` reads those sources and fails in BOTH directions: a reason
 * literal the list lacks, or a list entry nothing emits. The engine's mapper (build commit 4) is typed
 * `satisfies Record<HouseBetOutcomeKey, Action>` over this list.
 *
 * ⛔ AND WHY PARITY. Every entry has a row in `scripts/lib/house-bot-gate-parity.ts`: either a fixture
 * proving `placeHouseBet` and `buyPosition` give the SAME answer for the same account state, or an
 * explicit exemption with its reason. A new gate that forgot house context (the "no opinion when the
 * context is missing" pattern) fails there first.
 *
 * Pure: no server import, so the console and the engine can both read it.
 */
export const BET_PATH_REASONS = [
  // The player's own gates, which a house stake meets unchanged.
  "rate_limited",
  "maintenance",
  "self_excluded",
  "cooling_off",
  "session_limit_reached",
  "account_blocked",
  "stake_not_whole",
  "stake_below_min",
  "stake_above_max",
  "market_not_live",
  "idempotency_key_conflict",
  "wallet_frozen",
  "wallet_missing",
  "loss_limit_daily",
  "balance_insufficient",
  "selection_closed",
  "system_busy",
  // The house gates (PLAN §3, 04 A12, N1 §3).
  "house_key_mismatch",
  "house_gate_unreadable",
  "house_disabled",
  "house_bot_inactive",
  "house_account_ineligible",
  "house_consent_stale",
  "house_cash_only",
  "house_market_conflict",
  "house_cap_reached",
  "house_trigger_gone",
  "house_condition_gone",
  "house_intent_superseded",
  "house_product_not_allowed",
  "house_round_locked",
  "house_info_blackout",
  "house_intent_stale",
  "house_counterparty_concentration",
] as const;

export type BetPathReason = (typeof BET_PATH_REASONS)[number];

/** Codes the bet path returns WITHOUT a reason (the pre-lock market and account checks). */
export const BET_PATH_BARE_CODES = ["NOT_FOUND", "INVALID", "SELECTION_CLOSED", "BUSY"] as const;
export type BetPathBareCode = (typeof BET_PATH_BARE_CODES)[number];

/** What the house engine's mapper must cover: a placement, every reason, every bare code. */
export type HouseBetOutcomeKey = "ok" | BetPathReason | `code:${BetPathBareCode}`;

export const isBetPathReason = (v: unknown): v is BetPathReason =>
  typeof v === "string" && (BET_PATH_REASONS as readonly string[]).includes(v);
