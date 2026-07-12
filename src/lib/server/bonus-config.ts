/**
 * Bonus-wallet program config — admin-controlled.
 *
 * One global config: a master `enabled` switch, the platform-default wagering
 * multiplier + expiry, and routing toggles that decide whether affiliate rewards
 * and proposal prizes land in the BONUS wallet (must be played through) or the
 * REAL balance. Mirrors `proposals-config.ts`: HMAC-audited mutations, an
 * in-memory cache that survives hot-reloads via `globalThis`, and write-through
 * persistence to SystemConfig so admin changes survive deploys.
 *
 * Defaults reflect the 50pick Management Bonus Rules (2026-07-01):
 *   - 5× wagering, 30-day expiry
 *   - affiliate rewards  → bonus wallet (affiliateToBonus = true)
 *   - proposal prizes    → bonus wallet (proposalToBonus  = true)
 *   - no monthly cap (monthlyCapTzs = 0 → unlimited; admins have full discretion)
 *   - cashback is REQUEST-based (player loses deposit, submits request, management approves)
 *   - bonuses are used SEQUENTIALLY (one at a time, not stacked)
 */
import { defineConfig } from "./define-config";

const BONUS_CONFIG_KEY = "bonus.config";

export type CashbackMode = "AUTO" | "REQUEST";

export type BonusConfig = {
  /** Master switch. When false, no new bonus grants are issued from any source
   *  (existing grants keep running until fulfilled/expired). */
  enabled: boolean;
  /** Platform-default turnover multiplier: a grant becomes withdrawable once the
   *  player has wagered amountTzs × this value. Admin-overridable per grant. */
  defaultWagerMultiplier: number;
  /** Platform-default validity window (days) before an unfulfilled grant expires. */
  defaultExpiryDays: number;
  /** Route affiliate rewards (COMMISSION / BONUS / PRIZE) to the bonus wallet
   *  instead of crediting real balance directly. */
  affiliateToBonus: boolean;
  /** Route player-proposal prizes to the bonus wallet instead of real balance. */
  proposalToBonus: boolean;
  /** Optional ceiling on total bonus TZS granted per calendar month across all
   *  sources. 0 = no cap (default — admins have full discretion). */
  monthlyCapTzs: number;
  /** Deposit cashback master switch. */
  cashbackEnabled: boolean;
  /** Cashback rate as a whole/fractional percent of the deposit (e.g. 10 = 10%).
   *  Floored to whole TZS when credited. */
  cashbackPercentage: number;
  /** Cashback delivery mode per Management Bonus Rules §2:
   *  - "REQUEST": player must lose entire deposit, submit a request, management
   *    reviews and approves. 10% of the qualifying deposit.
   *  - "AUTO": legacy mode — 10% credited automatically on every confirmed deposit.
   *  Default: REQUEST (per 50pick Management Bonus Rules 2026-07-01). */
  cashbackMode: CashbackMode;
  /** When true (default), bonuses are used ONE AT A TIME per Management Bonus
   *  Rules §6. A player cannot have two active bonuses simultaneously; new grants
   *  enter QUEUED status and activate only when the current one fulfills or expires.
   *  When false, bonuses accumulate and are played FIFO (legacy behavior). */
  sequentialBonuses: boolean;
};

export const DEFAULT_BONUS_CONFIG: BonusConfig = {
  enabled: true,
  defaultWagerMultiplier: 5,
  defaultExpiryDays: 30,
  affiliateToBonus: true,
  proposalToBonus: true,
  monthlyCapTzs: 0,
  cashbackEnabled: true,
  cashbackPercentage: 10,
  cashbackMode: "REQUEST",
  sequentialBonuses: true,
};

function validate(c: BonusConfig): { ok: true } | { ok: false; reason: string } {
  if (!Number.isFinite(c.defaultWagerMultiplier) || c.defaultWagerMultiplier < 1 || c.defaultWagerMultiplier > 100)
    return { ok: false, reason: "Wagering multiplier must be 1–100×." };
  if (!Number.isInteger(c.defaultExpiryDays) || c.defaultExpiryDays < 1 || c.defaultExpiryDays > 365)
    return { ok: false, reason: "Expiry must be 1–365 days." };
  if (!Number.isFinite(c.monthlyCapTzs) || c.monthlyCapTzs < 0 || c.monthlyCapTzs > 1_000_000_000)
    return { ok: false, reason: "Monthly cap must be 0 (unlimited) – 1,000,000,000 TZS." };
  if (!Number.isFinite(c.cashbackPercentage) || c.cashbackPercentage < 0 || c.cashbackPercentage > 100)
    return { ok: false, reason: "Cashback percentage must be 0–100%." };
  return { ok: true };
}

// Boilerplate (globalThis cache + eager hydrate + get/set + audit) via the
// shared factory. Behaviour identical to the prior hand-rolled version.
const _config = defineConfig<BonusConfig>({
  key: BONUS_CONFIG_KEY,
  defaults: DEFAULT_BONUS_CONFIG,
  validate,
  audit: { action: "bonus.config.updated", targetType: "BonusConfig" },
});

export function getBonusConfig(): BonusConfig {
  return _config.get();
}

export function setBonusConfig(updates: Partial<BonusConfig>, officerId: string):
  | { ok: true; config: BonusConfig }
  | { ok: false; error: string } {
  return _config.set(updates, officerId);
}
