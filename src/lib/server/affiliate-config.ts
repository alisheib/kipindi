/**
 * Affiliate / referral program config — the admin money-lever.
 *
 * One global config object. A master `enabled` switch plus three
 * independently-toggleable reward modes (commission / bonus / prize), each
 * with its own rates, amounts and caps. Mirrors `market-config.ts`: every
 * mutation is HMAC-audited for the GBT inspector trail and the object
 * persists across hot-reloads via `globalThis.__50PICK_AFFILIATE_CONFIG`,
 * which the backup module snapshots alongside the store.
 *
 * Brand/compliance note: referral rewards are a regulated inducement under
 * Gaming Board of Tanzania guidance. The master switch lets the operator run
 * the whole program dark, or enable only the modes they've cleared.
 */
import { audit } from "./audit";
import { loadConfig, saveConfig } from "./config-store";

const AFFILIATE_CONFIG_KEY = "affiliate.config";

export type BonusRecipient = "NEW" | "REFERRER" | "BOTH";
export type BonusTrigger = "SIGNUP" | "FIRST_DEPOSIT";
export type PrizeMilestone = "FIRST_BET" | "DEPOSIT_THRESHOLD";

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
  };
};

/**
 * Testing config (Ali, 2026-06-28): the referral reward fires the moment an
 * invited friend JOINS (signs up) — no deposit or bet required — because deposits
 * aren't wired yet, so we can't gate the reward on play/funding. ONE clear line:
 * TZS 10,000 to the REFERRER when a friend signs up with their link. The reward
 * lands in the referrer's bonus wallet (non-withdrawable, plays through), so no
 * real cash is created. The play-required prize and the deposit-bonus modes ship
 * disabled; the operator can retune any of them at /admin/affiliate.
 */
export const DEFAULT_AFFILIATE_CONFIG: AffiliateConfig = {
  enabled: true,
  commission: { enabled: false, rate: 0.5, windowMonths: 24, capPerRecruitTzs: 250_000 },
  bonus: { enabled: true, recipient: "REFERRER", newAmountTzs: 2_000, referrerAmountTzs: 10_000, trigger: "SIGNUP" },
  prize: { enabled: false, milestone: "FIRST_BET", depositThresholdTzs: 10_000, amountTzs: 10_000, capPerReferrer: 20 },
};

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_AFFILIATE_CONFIG: AffiliateConfig | undefined;
}

function deepClone(c: AffiliateConfig): AffiliateConfig {
  return {
    enabled: c.enabled,
    commission: { ...c.commission },
    bonus: { ...c.bonus },
    prize: { ...c.prize },
  };
}

const stored =
  globalThis.__50PICK_AFFILIATE_CONFIG ??
  (globalThis.__50PICK_AFFILIATE_CONFIG = deepClone(DEFAULT_AFFILIATE_CONFIG));

// Restore the persisted config into the cache on boot. Getters are sync (58 call
// sites), so rather than make them async we hydrate eagerly at module load and
// write through on every set — admin retunes now survive deploys. The only race
// is a read in the first moments after a cold boot, which harmlessly returns
// defaults until this resolves. No-ops without a DB (dev/tests).
void loadConfig<AffiliateConfig>(AFFILIATE_CONFIG_KEY)
  .then((persisted) => { if (persisted) globalThis.__50PICK_AFFILIATE_CONFIG = mergeConfig(DEFAULT_AFFILIATE_CONFIG, persisted); })
  .catch(() => {});

export function getAffiliateConfig(): AffiliateConfig {
  return deepClone(globalThis.__50PICK_AFFILIATE_CONFIG ?? stored);
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
  return { ok: true };
}

export function setAffiliateConfig(updates: DeepPartial<AffiliateConfig>, officerId: string):
  | { ok: true; config: AffiliateConfig }
  | { ok: false; error: string } {
  const before = getAffiliateConfig();
  const merged = mergeConfig(before, updates);
  const v = validate(merged);
  if (!v.ok) return { ok: false, error: v.reason };
  globalThis.__50PICK_AFFILIATE_CONFIG = merged;
  void saveConfig(AFFILIATE_CONFIG_KEY, merged);
  audit({
    category: "ADMIN",
    action: "affiliate.config.updated",
    actorId: officerId,
    targetType: "AffiliateConfig",
    targetId: "global",
    payload: { before, after: merged, changes: updates },
  });
  return { ok: true, config: deepClone(merged) };
}
