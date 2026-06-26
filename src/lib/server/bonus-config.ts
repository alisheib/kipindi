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
 * Defaults reflect Ali's 2026-06-26 decisions:
 *   - 5× wagering, 30-day expiry
 *   - affiliate rewards  → bonus wallet (affiliateToBonus = true)
 *   - proposal prizes    → bonus wallet (proposalToBonus  = true)
 *   - no monthly cap (monthlyCapTzs = 0 → unlimited; admins have full discretion)
 */
import { audit } from "./audit";
import { loadConfig, saveConfig } from "./config-store";

const BONUS_CONFIG_KEY = "bonus.config";

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
};

export const DEFAULT_BONUS_CONFIG: BonusConfig = {
  enabled: true,
  defaultWagerMultiplier: 5,
  defaultExpiryDays: 30,
  affiliateToBonus: true,
  proposalToBonus: true,
  monthlyCapTzs: 0,
};

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_BONUS_CONFIG: BonusConfig | undefined;
}

const stored =
  globalThis.__50PICK_BONUS_CONFIG ??
  (globalThis.__50PICK_BONUS_CONFIG = { ...DEFAULT_BONUS_CONFIG });

// Restore persisted config on boot (eager; sync getters keep zero ripple). Write
// through on set so admin changes survive deploys. No-ops without a DB.
void loadConfig<BonusConfig>(BONUS_CONFIG_KEY)
  .then((persisted) => { if (persisted) globalThis.__50PICK_BONUS_CONFIG = { ...DEFAULT_BONUS_CONFIG, ...persisted }; })
  .catch(() => {});

export function getBonusConfig(): BonusConfig {
  return { ...(globalThis.__50PICK_BONUS_CONFIG ?? stored) };
}

function validate(c: BonusConfig): { ok: true } | { ok: false; reason: string } {
  if (!Number.isFinite(c.defaultWagerMultiplier) || c.defaultWagerMultiplier < 1 || c.defaultWagerMultiplier > 100)
    return { ok: false, reason: "Wagering multiplier must be 1–100×." };
  if (!Number.isInteger(c.defaultExpiryDays) || c.defaultExpiryDays < 1 || c.defaultExpiryDays > 365)
    return { ok: false, reason: "Expiry must be 1–365 days." };
  if (!Number.isFinite(c.monthlyCapTzs) || c.monthlyCapTzs < 0 || c.monthlyCapTzs > 1_000_000_000)
    return { ok: false, reason: "Monthly cap must be 0 (unlimited) – 1,000,000,000 TZS." };
  return { ok: true };
}

export function setBonusConfig(updates: Partial<BonusConfig>, officerId: string):
  | { ok: true; config: BonusConfig }
  | { ok: false; error: string } {
  const before = getBonusConfig();
  const merged: BonusConfig = { ...before, ...updates };
  const v = validate(merged);
  if (!v.ok) return { ok: false, error: v.reason };
  globalThis.__50PICK_BONUS_CONFIG = merged;
  void saveConfig(BONUS_CONFIG_KEY, merged);
  audit({
    category: "ADMIN",
    action: "bonus.config.updated",
    actorId: officerId,
    targetType: "BonusConfig",
    targetId: "global",
    payload: { before, after: merged, changes: updates },
  });
  return { ok: true, config: { ...merged } };
}
