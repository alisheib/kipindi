/**
 * WHAT EVERY BET-PATH ANSWER DOES TO AN INTENT — the outcome table (PLAN §4.6, amended by 04 A7, A10, N1 §4.6).
 *
 * ⛔ EXHAUSTIVE BY TYPE. The table is `satisfies Record<HouseBetOutcomeKey, OutcomeAction>` over `BET_PATH_REASONS`
 * and the bare codes, so a refusal added to the bet path without a row here is a compile error, not a stream of
 * FAILED rows at 3 a.m. A reason that still arrives unknown at runtime (a stale build, a string cast) is handled by
 * `outcomes.ts` as FAILED(UNMAPPED) + AUTO_PAUSED(UNMAPPED_REFUSAL) and one alert (A10).
 *
 * Pure: the table and the lookup only. The writes — the conditional status updates, the auto-pause order (A19),
 * the alerts — live in `outcomes.ts`.
 */
import type { HouseBetOutcomeKey } from "@/lib/house-bot/bet-path";
import type { EngineCode } from "@/lib/house-bot/constants";
import type { PauseReason } from "@/lib/house-bot/pause-reasons";

export type OutcomeAction =
  /** `markPlaced` already wrote PLACED in the bet's transaction; take the A8 `alertedAt` claim, then alert. */
  | { kind: "placed" }
  /** The row is already terminal (cancelled or re-queued mid-fire). Write nothing, alert nothing. */
  | { kind: "noop" }
  /** Back to PENDING with the transient backoff (N1 §4.3, MON-10). Never counts toward POISON or the error streak. */
  | { kind: "transient" }
  | {
      kind: "terminal";
      status: "SKIPPED" | "EXPIRED" | "CANCELLED" | "FAILED";
      reasonCode: EngineCode;
      /** `botDaily`: AlertOnce per bot, code and EAT day. `stakeNotWhole`: AlertOnce per bot per day. */
      alert?: "botDaily" | "stakeNotWhole";
      /** SECURITY alert and master OFF(ENGINE_FAULT). */
      engineFault?: true;
      /** A trigger exit puts the trigger account in today's penalty box (PLAN §4.3, R5). */
      penalty?: true;
    }
  /** AUTO_PAUSED with this cause; `anomaly` adds one alert (a refusal A7 makes unreachable). */
  | { kind: "autoPause"; cause: PauseReason; anomaly?: true }
  /** `account_blocked` names five states: re-read the holder and pause with the cause found (A10). */
  | { kind: "rereadAccount" }
  /** `house_consent_stale`: recompute the holder's causes — a password change or a consent void (A3, PLAN §14). */
  | { kind: "rereadConsent" }
  /** Re-read the market: gone → SKIPPED(MARKET_GONE), else AUTO_PAUSED(ACCOUNT_MISSING) (PLAN §4.6 NOT_FOUND). */
  | { kind: "rereadMarketOrAccount" }
  /** Re-read the market: not LIVE → SKIPPED(MARKET_NOT_LIVE), else EXPIRED(CUTOFF) (A10). */
  | { kind: "rereadMarketLive" }
  /** `house_market_conflict{…}`: OPPOSITE_SIDE → SKIPPED(CAP_OPPOSITE_SIDE), the others → MARKET_HELD (N1 §4.6). */
  | { kind: "conflict" }
  /** `house_cap_reached{code}`: a rate cap defers when its window frees before `staleAt`, else SKIPPED(CAP_<code>). */
  | { kind: "cap" };

export const OUTCOME_TABLE = {
  ok: { kind: "placed" },
  // The player's own gates.
  rate_limited: { kind: "transient" },
  maintenance: { kind: "terminal", status: "SKIPPED", reasonCode: "MAINTENANCE" },
  self_excluded: { kind: "autoPause", cause: "SELF_EXCLUDED" },
  cooling_off: { kind: "autoPause", cause: "COOLING_OFF" },
  // C4-SPEC ruling 20: unreachable for a house stake (A7 — no session clock rides along).
  session_limit_reached: { kind: "autoPause", cause: "ACCOUNT_BLOCKED", anomaly: true },
  account_blocked: { kind: "rereadAccount" },
  // A7: not whole is a bug in the engine; bounds that moved after the decision are routine.
  stake_not_whole: { kind: "terminal", status: "FAILED", reasonCode: "INTERNAL", alert: "stakeNotWhole" },
  stake_below_min: { kind: "terminal", status: "SKIPPED", reasonCode: "STAKE_BOUNDS_CHANGED" },
  stake_above_max: { kind: "terminal", status: "SKIPPED", reasonCode: "STAKE_BOUNDS_CHANGED" },
  // On the bet path this reason is the INVALID SIDE refusal (`buyPositionInner`), which a stored intent cannot
  // produce: a defect, so the engine stops (PLAN §4.6, C4-SPEC ruling 7).
  market_not_live: { kind: "terminal", status: "FAILED", reasonCode: "INTERNAL", engineFault: true },
  // H0 runs the key checks first; reaching this means the key belongs to another bet — the same defect class.
  idempotency_key_conflict: { kind: "terminal", status: "FAILED", reasonCode: "INTERNAL", engineFault: true },
  wallet_frozen: { kind: "autoPause", cause: "WALLET_FROZEN" },
  wallet_missing: { kind: "autoPause", cause: "WALLET_MISSING" },
  loss_limit_daily: { kind: "autoPause", cause: "OWNER_LOSS_LIMIT" },
  balance_insufficient: { kind: "terminal", status: "SKIPPED", reasonCode: "CAP_BALANCE_FLOOR", alert: "botDaily" },
  selection_closed: { kind: "rereadMarketLive" },
  system_busy: { kind: "transient" },
  // The house gates.
  house_key_mismatch: { kind: "terminal", status: "FAILED", reasonCode: "INTERNAL", engineFault: true },
  house_gate_unreadable: { kind: "transient" },
  house_disabled: { kind: "terminal", status: "CANCELLED", reasonCode: "MASTER_OFF" },
  house_bot_inactive: { kind: "terminal", status: "CANCELLED", reasonCode: "BOT_NOT_ACTIVE" },
  house_account_ineligible: { kind: "autoPause", cause: "ROLE_CHANGED" },
  house_consent_stale: { kind: "rereadConsent" },
  house_cash_only: { kind: "terminal", status: "SKIPPED", reasonCode: "CAP_BALANCE_FLOOR", alert: "botDaily" },
  house_market_conflict: { kind: "conflict" },
  house_cap_reached: { kind: "cap" },
  house_trigger_gone: { kind: "terminal", status: "SKIPPED", reasonCode: "TRIGGER_EXITED", penalty: true },
  house_condition_gone: { kind: "terminal", status: "SKIPPED", reasonCode: "CONDITION_GONE" },
  house_intent_superseded: { kind: "noop" },
  house_product_not_allowed: { kind: "terminal", status: "SKIPPED", reasonCode: "PRODUCT_NOT_SUPPORTED" },
  house_round_locked: { kind: "terminal", status: "EXPIRED", reasonCode: "CUTOFF" },
  house_info_blackout: { kind: "terminal", status: "SKIPPED", reasonCode: "INFO_BLACKOUT" },
  house_intent_stale: { kind: "terminal", status: "EXPIRED", reasonCode: "STALE" },
  house_counterparty_concentration: { kind: "terminal", status: "SKIPPED", reasonCode: "COUNTERPARTY_CONCENTRATION" },
  // The bare codes (no reason).
  "code:NOT_FOUND": { kind: "rereadMarketOrAccount" },
  "code:INVALID": { kind: "rereadMarketLive" },
  "code:SELECTION_CLOSED": { kind: "rereadMarketLive" },
  "code:BUSY": { kind: "transient" },
} as const satisfies Record<HouseBetOutcomeKey, OutcomeAction>;

/** The table key for a bet-path answer, or null when the reason is unknown (A10 UNMAPPED). */
export function outcomeKey(result: { ok: true } | { ok: false; code: string; reason?: string }): HouseBetOutcomeKey | null {
  if (result.ok) return "ok";
  if (result.reason != null) {
    return Object.prototype.hasOwnProperty.call(OUTCOME_TABLE, result.reason) && !result.reason.startsWith("code:")
      ? (result.reason as HouseBetOutcomeKey)
      : null;
  }
  const bare = `code:${result.code}`;
  return Object.prototype.hasOwnProperty.call(OUTCOME_TABLE, bare) ? (bare as HouseBetOutcomeKey) : null;
}
