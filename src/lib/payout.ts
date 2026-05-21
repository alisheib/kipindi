/**
 * Shared pari-mutuel payout math — client and server.
 *
 * Single source of truth for "how much do I get if I'm right" across:
 *   • ConvictionDial (live projection)
 *   • BetConfirmModal (locked quote)
 *   • PositionCard (current-value preview)
 *   • Server settlement (final payout)
 *
 * Math (whole-pool model):
 *   grossPool   = yesPool + noPool + stake   // stake is added to chosen side
 *   netPool     = grossPool × (1 − tax − commission)
 *   share       = stake / winningPool        // winningPool already includes my stake
 *   payout      = round(share × netPool)     // includes return-of-stake
 *
 * Under heavy lean (winning side dominates), payout/stake can drop below 1.0 —
 * that's the `negative` lean state surfaced by HouseLeanWarning.
 *
 * Default fee = 0.04 tax + 0.05 commission = 0.09 (9%). Matches the kit spec
 * and the server's DEFAULT_GLOBAL_CONFIG.
 */

export const DEFAULT_TAX_RATE = 0.04;
export const DEFAULT_COMMISSION_RATE = 0.05;
export const THIN_PROFIT_RATIO = 1.05;

export type Side = "YES" | "NO";
export type LeanLevel = "fair" | "thin" | "negative";

export interface PayoutInput {
  stake: number;
  side: Side;
  yesPool: number;
  noPool: number;
  taxRate?: number;
  commissionRate?: number;
}

export interface PayoutResult {
  /** TZS payout (rounded), including return of stake. */
  payout: number;
  /** Net profit (payout − stake). */
  net: number;
  /** This player's share of the winning pool (after their stake is added). */
  share: number;
  /** payout / stake. Below 1.0 → user loses money even though their side won. */
  ratio: number;
}

/** Whole-pool pari-mutuel projection (stake is added to chosen side). */
export function payoutFor(input: PayoutInput): PayoutResult {
  const tax = input.taxRate ?? DEFAULT_TAX_RATE;
  const commission = input.commissionRate ?? DEFAULT_COMMISSION_RATE;
  const yesPool = input.side === "YES" ? input.yesPool + input.stake : input.yesPool;
  const noPool = input.side === "NO" ? input.noPool + input.stake : input.noPool;
  const grossPool = yesPool + noPool;
  const winningPool = input.side === "YES" ? yesPool : noPool;
  const fee = Math.min(0.99, Math.max(0, tax + commission));
  const netPool = grossPool * (1 - fee);
  if (winningPool <= 0 || input.stake <= 0) return { payout: 0, net: 0, share: 0, ratio: 0 };
  const share = input.stake / winningPool;
  const payout = Math.round(share * netPool);
  return { payout, net: payout - input.stake, share, ratio: payout / input.stake };
}

/** Categorise payout-to-stake ratio for the inline warning. */
export function leanFor(ratio: number, thinRatio = THIN_PROFIT_RATIO): LeanLevel {
  if (ratio < 1.0) return "negative";
  if (ratio < thinRatio) return "thin";
  return "fair";
}
