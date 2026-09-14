/**
 * GATE PARITY (04 F3, A7) — one row for every reason in `BET_PATH_REASONS`.
 *
 * ⛔ THIS FILE IS `.ts`, NOT `.mts`, ON PURPOSE: the repo typecheck includes `scripts/**\/*.ts`, so the
 * `satisfies Record<BetPathReason, …>` below makes a new bet-path reason without a parity row a tsc
 * error. `test:house-bot-seam` §3 runs every fixture through `buyPosition` AND `placeHouseBet` with the
 * same account state and requires the same code and reason, with nothing moved.
 *
 * A fixture names the state to create; the suite owns how. An exemption says why the two paths cannot
 * (or must not) give the same answer.
 */
import type { BetPathReason } from "../../src/lib/house-bot/bet-path";

export type ParityFixture = {
  fixture:
    | "maintenance"
    | "self_excluded"
    | "cooling_off"
    | "account_suspended"
    | "account_closed"
    | "wallet_frozen"
    | "loss_limit_daily"
    | "stake_below_min"
    | "stake_above_max"
    | "rate_limited";
};
export type ParityExempt = { exempt: string };

export const GATE_PARITY = {
  rate_limited: { fixture: "rate_limited" },
  maintenance: { fixture: "maintenance" },
  self_excluded: { fixture: "self_excluded" },
  cooling_off: { fixture: "cooling_off" },
  session_limit_reached: { exempt: "player session clock only — a house stake neither advances nor is refused by it (04 A7 ruling)" },
  account_blocked: { fixture: "account_suspended" },
  stake_not_whole: { exempt: "the engine only ever decides whole-TZS stakes; H0 compares the stake to the intent row" },
  stake_below_min: { fixture: "stake_below_min" },
  stake_above_max: { fixture: "stake_above_max" },
  market_not_live: { exempt: "emitted for an invalid side token, which the typed house call cannot carry" },
  idempotency_key_conflict: { exempt: "a house key that is not its own is house_key_mismatch (H0, sanctioned change (b))" },
  wallet_frozen: { fixture: "wallet_frozen" },
  wallet_missing: { exempt: "a designated holder always has a wallet; its loss is an A16 auto-pause, proven in the engine suite" },
  loss_limit_daily: { fixture: "loss_limit_daily" },
  balance_insufficient: { exempt: "a house stake is cash only by construction: H2 refuses house_cash_only first (04 A7)" },
  selection_closed: { exempt: "reached only by a close racing into the market lock; the pre-lock close is a bare SELECTION_CLOSED code" },
  system_busy: { exempt: "admission and lock-timeout BUSY — proven for the house path in test:house-bot-caps §6" },
  house_key_mismatch: { exempt: "house context only" },
  house_gate_unreadable: { exempt: "house context only" },
  house_disabled: { exempt: "house context only" },
  house_bot_inactive: { exempt: "house context only" },
  house_account_ineligible: { exempt: "house context only" },
  house_consent_stale: { exempt: "house context only" },
  house_cash_only: { exempt: "house context only" },
  house_market_conflict: { exempt: "house context only" },
  house_cap_reached: { exempt: "house context only" },
  house_trigger_gone: { exempt: "house context only" },
  house_condition_gone: { exempt: "house context only" },
  house_intent_superseded: { exempt: "house context only" },
  house_product_not_allowed: { exempt: "house context only" },
  house_round_locked: { exempt: "house context only" },
  house_info_blackout: { exempt: "house context only" },
  house_intent_stale: { exempt: "house context only" },
  house_counterparty_concentration: { exempt: "house context only" },
} as const satisfies Record<BetPathReason, ParityFixture | ParityExempt>;

/** The account-state fixture for `account_blocked` also runs as CLOSED. */
export const EXTRA_PARITY_FIXTURES: ReadonlyArray<ParityFixture["fixture"]> = ["account_closed"];
