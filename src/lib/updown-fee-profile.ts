/**
 * THE UP & DOWN FEE PROFILE, AS `/admin/config`'s FEES & TAXES CARD BUILDS IT AND COUNTS IT (FEE-TAX-2026-10, R2c).
 *
 * Two pure halves, so `test:updown-config` drives the card's path without a page or a session:
 *   · `feeProfileFromForm` — the profile "Apply to every chain" sends to `applyFeeProfileToEveryChain`: the officer's model
 *     and two rates over the product's CURRENT default profile (its ceiling and display fields kept), and never a winnings
 *     tax (a profile may not carry one: a round takes the platform's when it is stamped — `market-config.ts → validate`).
 *   · `chainFeeCensus` — every chain counted by the fee model its profile resolves to, per chain state: what the card shows
 *     before the act, the same rule `boardFeeSummary` and the act's dry run read (`rateProfileOf`, then the model).
 * ⛔ No rate is defaulted here: a blank rate is refused, never filled in. The act itself validates the profile again and
 * is refused by `fee-law-gate.ts` while the new law is not in force.
 * Isomorphic: it imports `@/lib/payout`'s types alone.
 */
import type { FeeModel, FeeRates } from "@/lib/payout";

/** The fee models a chain may be moved to — every pool model; never Millionea's `jackpot-payout`. */
export const APPLY_MODELS: readonly FeeModel[] = ["loser-share", "stake-share", "capped-commission"];

/** A form's percentage ("3", "10.5") as a rate (0.03, 0.105): null when blank, NaN when it is not a number (refused). */
export function rateFromPercent(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n / 100 : Number.NaN;
}

/**
 * ⭐ THE PROFILE THE ACT SENDS — the officer's model and its two rates laid over the product's current default profile.
 * A pool model needs both rates (Platform + Operator); capped-commission reads neither and keeps the default's commission
 * and ceiling. A winnings tax and a Millionea jackpot share are dropped: a profile never carries either.
 */
export function feeProfileFromForm(
  fields: { feeModel: unknown; platformFeeRate: unknown; operatorFeeRate: unknown },
  current: Partial<FeeRates> & Record<string, unknown>,
): { ok: true; profile: Partial<FeeRates> & Record<string, unknown> } | { ok: false; error: string } {
  const model = fields.feeModel;
  if (typeof model !== "string" || !(APPLY_MODELS as readonly string[]).includes(model)) {
    return { ok: false, error: "Choose the fee model to apply: loser-share, stake-share or capped commission." };
  }
  const platform = rateFromPercent(fields.platformFeeRate);
  const operator = rateFromPercent(fields.operatorFeeRate);
  if (model !== "capped-commission") {
    if (platform === null || operator === null) return { ok: false, error: "Enter both the Platform and the Operator rate, in %." };
    if (Number.isNaN(platform) || Number.isNaN(operator)) return { ok: false, error: "The Platform and Operator rates must be numbers, in %." };
  }
  const { winningsTaxRate: _tax, jackpotFeeRate: _jackpot, ...base } = current;
  void _tax; void _jackpot;
  const profile: Partial<FeeRates> & Record<string, unknown> = { ...base, feeModel: model as FeeModel };
  if (model !== "capped-commission") {
    profile.platformFeeRate = platform as number;
    profile.operatorFeeRate = operator as number;
  }
  return { ok: true, profile };
}

/** A chain as the census reads it: its state, and the model its profile resolves to ("unreadable" for one the engine refuses). */
export type CensusChain = { state: string; model: FeeModel | "unreadable" };

export type ChainFeeCensus = {
  total: number;
  /** Chains per fee model, every state together. */
  byModel: Partial<Record<FeeModel | "unreadable", number>>;
  /** Chains per state, and per model within it. */
  byState: Record<string, { total: number; byModel: Partial<Record<FeeModel | "unreadable", number>> }>;
};

/** The four chain states, in the order the card lists them (`ChainState`). */
export const CHAIN_STATES_IN_ORDER: readonly string[] = ["RUNNING", "PAUSED", "STOPPED", "ARCHIVED"];

/** ⭐ EVERY CHAIN, BY FEE MODEL AND BY STATE — archived ones included (one restarted freezes its profile on its next round). */
export function chainFeeCensus(chains: readonly CensusChain[]): ChainFeeCensus {
  const byModel: ChainFeeCensus["byModel"] = {};
  const byState: ChainFeeCensus["byState"] = {};
  for (const s of CHAIN_STATES_IN_ORDER) byState[s] = { total: 0, byModel: {} };
  for (const c of chains) {
    byModel[c.model] = (byModel[c.model] ?? 0) + 1;
    const row = byState[c.state] ?? (byState[c.state] = { total: 0, byModel: {} });
    row.total++;
    row.byModel[c.model] = (row.byModel[c.model] ?? 0) + 1;
  }
  return { total: chains.length, byModel, byState };
}
