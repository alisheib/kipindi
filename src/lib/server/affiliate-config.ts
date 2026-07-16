/**
 * Affiliate / referral program config — the admin money-lever.
 *
 * One global config object. A master `enabled` switch plus three
 * independently-toggleable reward modes (commission / bonus / prize), each
 * with its own rates, amounts and caps. Every mutation is HMAC-audited for the
 * GBT inspector trail, and the object is DB-persisted + cached across
 * hot-reloads by the shared `defineConfig` factory (same eager write-through
 * hydration + ADMIN `{ before, after, changes }` audit as bonus/proposals). The
 * only affiliate-specific piece is the deep `merge` for its nested modes.
 *
 * Brand/compliance note: referral rewards are a regulated inducement under
 * Gaming Board of Tanzania guidance. The master switch lets the operator run
 * the whole program dark, or enable only the modes they've cleared.
 */
import { defineConfig } from "./define-config";

const AFFILIATE_CONFIG_KEY = "affiliate.config";

export type BonusRecipient = "NEW" | "REFERRER" | "BOTH";
export type BonusTrigger = "SIGNUP" | "FIRST_DEPOSIT";
export type PrizeMilestone = "FIRST_BET" | "DEPOSIT_THRESHOLD";
export type InviteTrigger = "SIGNUP" | "FIRST_BET";

export type AffiliateConfig = {
  /** Master switch. When false, links still resolve (recruits still bind to
   *  their referrer) but NO new rewards accrue and players see a paused
   *  banner. This is the lever the operator flips to run the program dark. */
  enabled: boolean;

  commission: {
    enabled: boolean;
    /** Share of the operator margin a recruit generates that the referrer
     *  earns, as a fraction 0..1 (e.g. 0.50 = 50%). */
    rate: number;
    /** How long after a recruit joins commission keeps accruing, in months. */
    windowMonths: number;
    /** Max total commission earnable from a single recruit, in TZS. 0 = uncapped. */
    capPerRecruitTzs: number;
  };

  bonus: {
    enabled: boolean;
    recipient: BonusRecipient;
    /** Credit to the newly-recruited player, in TZS. */
    newAmountTzs: number;
    /** Credit to the referrer, in TZS. */
    referrerAmountTzs: number;
    trigger: BonusTrigger;
  };

  prize: {
    enabled: boolean;
    milestone: PrizeMilestone;
    /** Only used when milestone === DEPOSIT_THRESHOLD. */
    depositThresholdTzs: number;
    /** Fixed prize paid to the referrer when a recruit hits the milestone. */
    amountTzs: number;
    /** Max number of milestone prizes a single referrer can earn. 0 = uncapped. */
    capPerReferrer: number;
    /** Minimum bet amount the recruit must place to trigger the FIRST_BET milestone.
     *  Per Management Bonus Rules §4.2c: at least one position ≥ TZS 20,000. */
    minBetAmountTzs: number;
    /** When true, the recruit must have deposited funds before the milestone triggers.
     *  Per Management Bonus Rules §4.2b. */
    requireDeposit: boolean;
  };
};

/**
 * Defaults per 50pick Management Bonus Rules §4 (2026-07-01):
 *   - Invite bonus: TZS 10,000 to REFERRER
 *   - Triggers when the recruit: registers + deposits + places ≥1 position ≥ TZS 20,000
 *   - This maps to prize mode (FIRST_BET milestone) with deposit requirement
 *   - Signup bonus disabled (was testing-only)
 *   - Commission disabled (not in management rules)
 *
 * All values are admin-adjustable at /admin/affiliate. The defaults here are the
 * management-approved starting point.
 */
export const DEFAULT_AFFILIATE_CONFIG: AffiliateConfig = {
  enabled: true,
  commission: { enabled: false, rate: 0.5, windowMonths: 24, capPerRecruitTzs: 250_000 },
  bonus: { enabled: false, recipient: "REFERRER", newAmountTzs: 2_000, referrerAmountTzs: 10_000, trigger: "SIGNUP" },
  prize: { enabled: true, milestone: "FIRST_BET", depositThresholdTzs: 10_000, amountTzs: 10_000, capPerReferrer: 20, minBetAmountTzs: 20_000, requireDeposit: true },
};

function deepClone(c: AffiliateConfig): AffiliateConfig {
  return {
    enabled: c.enabled,
    commission: { ...c.commission },
    bonus: { ...c.bonus },
    prize: { ...c.prize },
  };
}

// The shared factory owns the globalThis cache, eager DB hydration, write-through
// persistence and the ADMIN `{ before, after, changes }` audit. Affiliate's only
// specialisations are the deep `merge` (three nested reward-mode objects) and the
// `validate` guard below. Getters are sync (58 call sites), matching the factory.
const _config = defineConfig<AffiliateConfig, DeepPartial<AffiliateConfig>>({
  key: AFFILIATE_CONFIG_KEY,
  defaults: DEFAULT_AFFILIATE_CONFIG,
  validate,
  audit: { action: "affiliate.config.updated", targetType: "AffiliateConfig" },
  merge: (current, updates) => mergeConfig(current, updates),
});

/** Sync read. Deep-cloned so a caller can't mutate a nested mode in the cache. */
export function getAffiliateConfig(): AffiliateConfig {
  return deepClone(_config.get());
}

/** Deep-merge a partial update onto the current config. */
function mergeConfig(base: AffiliateConfig, u: DeepPartial<AffiliateConfig>): AffiliateConfig {
  return {
    enabled: u.enabled ?? base.enabled,
    commission: { ...base.commission, ...(u.commission ?? {}) },
    bonus: { ...base.bonus, ...(u.bonus ?? {}) },
    prize: { ...base.prize, ...(u.prize ?? {}) },
  };
}

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? Partial<T[K]> : T[K] };

function validate(c: AffiliateConfig): { ok: true } | { ok: false; reason: string } {
  // Commission rate is a hard regulated ceiling: never let the referrer cut
  // exceed 100% of margin, and keep the demo guidance at ≤ 100%.
  if (c.commission.rate < 0 || c.commission.rate > 1) return { ok: false, reason: "Commission rate must be 0–100%." };
  if (c.commission.windowMonths < 1 || c.commission.windowMonths > 60) return { ok: false, reason: "Commission window must be 1–60 months." };
  if (c.commission.capPerRecruitTzs < 0 || c.commission.capPerRecruitTzs > 50_000_000) return { ok: false, reason: "Per-recruit cap must be 0–50,000,000 TZS." };
  if (c.bonus.newAmountTzs < 0 || c.bonus.newAmountTzs > 1_000_000) return { ok: false, reason: "New-player bonus must be 0–1,000,000 TZS." };
  if (c.bonus.referrerAmountTzs < 0 || c.bonus.referrerAmountTzs > 1_000_000) return { ok: false, reason: "Referrer bonus must be 0–1,000,000 TZS." };
  if (c.prize.amountTzs < 0 || c.prize.amountTzs > 1_000_000) return { ok: false, reason: "Prize amount must be 0–1,000,000 TZS." };
  if (c.prize.depositThresholdTzs < 0 || c.prize.depositThresholdTzs > 50_000_000) return { ok: false, reason: "Deposit threshold must be 0–50,000,000 TZS." };
  if (c.prize.capPerReferrer < 0 || c.prize.capPerReferrer > 10_000) return { ok: false, reason: "Prize cap must be 0–10,000." };
  if (c.prize.minBetAmountTzs < 0 || c.prize.minBetAmountTzs > 10_000_000) return { ok: false, reason: "Min bet amount must be 0–10,000,000 TZS." };
  return { ok: true };
}

export function setAffiliateConfig(updates: DeepPartial<AffiliateConfig>, officerId: string):
  | { ok: true; config: AffiliateConfig }
  | { ok: false; error: string } {
  return _config.set(updates, officerId);
}
