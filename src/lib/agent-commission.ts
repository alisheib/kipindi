/**
 * AGENT COMMISSION — THE WATERFALL, AND THE ONE FUNCTION THE ENGINE PAYS FROM.
 *
 * ⭐ WHY THIS FILE EXISTS. Management's feedback on Agent v1 (2026-09-08, "Feedback for the
 * Agent v1") struck out the prose paragraph that explained commission and replaced it with a
 * FINANCIAL WATERFALL — winnings → 13% fee → TRA → GBT → net fee → the agent's 10% →
 * withholding tax → the cash that reaches the wallet. A table of money is a promise in a way
 * a paragraph is not, so the table may not be typed out anywhere: it is DERIVED, here, from
 * the same rates the settlement engine uses and by the same arithmetic the accrual performs.
 *
 * ⛔ SO NO SURFACE MAY WRITE A ROW OF THAT TABLE BY HAND. `/agent` renders
 * `commissionWaterfall(...)`; `onRecruitSettlement` pays `agentCommissionSplit(...)`; and
 * `test:agent-waterfall` asserts the two cannot disagree. The alternative — a page that
 * states 10,497 while the engine credits something else — is the exact class of defect
 * `docs/PLAYER_VIEW_AUDIT_2026-06-28.md` records five of.
 *
 * ⚠️ ISOMORPHIC ON PURPOSE. `/agent` is a server component but the waterfall is also read by
 * a guard that runs outside Next, so this module imports NOTHING. No config, no db, no
 * `server-only`. Every rate arrives as an argument, which is also what makes the guard able
 * to drive it with the live snapshot AND with a hostile one.
 *
 * ⚠️ WHOLE SHILLINGS, AND THAT IS WHY THE TABLE IS NOT MANAGEMENT'S SPREADSHEET TO THE CENT.
 * TZS has no circulating subunit and every money column in this platform is a whole number of
 * shillings. Management's worked example carries two decimals, so its last two rows read
 * 552.50 and 10,497.50 where this function — and therefore the wallet — produces 553 and
 * 10,497. That half-shilling is a PRESENTATION difference, not an economics one, and it is
 * recorded in docs/AGENT-PROGRAMME.md §5a rather than papered over by rendering a decimal the
 * ledger cannot pay.
 */

/**
 * The rates the waterfall needs, all of them read from live config by the caller.
 *
 * ⚠️ TWO SCALES, DELIBERATELY NAMED APART. The four fee/levy numbers are FRACTIONS
 * (`0.13` = 13%) because that is how `market-config` stores them; the two agent numbers are
 * PERCENTS (`10` = 10%) because that is how `agent-config` stores them and how an officer
 * types them. Mixing the two is a 100× error on a money path, so the suffix is part of the
 * name at every boundary and the conversion happens once, below.
 */
export type WaterfallRates = {
  /** loser-share: the "platform" slice of the fee, as a fraction of the losing pool. */
  platformFeeRate: number;
  /** loser-share: the "operator" slice of the fee, as a fraction of the losing pool. */
  operatorFeeRate: number;
  /** TRA's statutory deduction, as a fraction OF OUR FEE. */
  traTaxOnCommissionRate: number;
  /** GBT's compliance levy, as a fraction OF OUR FEE. */
  gbtLevyOnCommissionRate: number;
  /** The agent's share of the NET fee, as a PERCENT. */
  agentPct: number;
  /** Local withholding tax on the agent's own earnings, as a PERCENT. */
  withholdingPct: number;
};

/** The eight rows of management's table, in order. The id is what a surface keys copy off. */
export type WaterfallStepId =
  | "winnings"
  | "grossFee"
  | "tra"
  | "gbt"
  | "netFee"
  | "agentShare"
  | "withholding"
  | "netPayout";

export type WaterfallStep = {
  id: WaterfallStepId;
  /** Whole TZS. */
  amountTzs: number;
  /** The rate this row applies, as a PERCENT — or `null` on the base and the subtotals,
   *  which are sums rather than rates and must not render a meaningless "0%". */
  ratePct: number | null;
  /** An indented statutory deduction from the line above it (TRA, GBT, withholding). */
  deduction: boolean;
  /** A carried-forward subtotal (net fee) or the final total (net payout). */
  subtotal: boolean;
};

/**
 * ⭐ THE SPLIT THE ENGINE PAYS FROM — gross commission, the tax withheld, and the cash.
 *
 * `onRecruitSettlement` calls exactly this, so the number on `/agent` and the number in the
 * wallet come out of one function. It takes the position's share of the fee the house KEPT
 * (after TRA and GBT), which is the only base an agent is ever paid on.
 *
 * 🔴 `Math.floor` ON THE AGENT'S SHARE, AND THAT IS NOT A STYLE CHOICE. The platform floors
 * its own fee shares (`payout.ts` → `allocateFeeShares`) because independent half-up rounding
 * over-collects: the parts sum to more than the whole and escrow finishes settlement
 * negative. Commission rounding half-up in the AGENT's favour against a platform that floors
 * its own is a systematic leak in one direction — a shilling per accrual, on every settled
 * position of every recruit, lifetime and uncapped.
 *
 * 🔴 `Math.round` ON THE TAX, MATCHING `levySplit`. TRA and GBT are already rounded half-up
 * where they are computed (`payout.ts` → `levySplit`), and the withholding tax is the same
 * kind of statutory deduction on the same fee. Flooring it would under-withhold — an
 * operator liability, not an agent saving — and ceiling it would over-withhold from the
 * partner. Rounding it the way the other two levies round is the only choice that needs no
 * special pleading.
 *
 * ⛔ THE TAX IS COMPUTED ON THE GROSS AFTER THE PER-RECRUIT CAP HAS BEEN APPLIED, so the
 * caller must clamp first and call this with the amount it actually intends to accrue.
 * Withholding on a figure the cap then reduced would remit tax on money nobody earned.
 */
export function agentCommissionSplit(
  operatorNetFeeTzs: number,
  agentPct: number,
  withholdingPct: number,
): { grossTzs: number; taxWithheldTzs: number; netTzs: number } {
  if (!Number.isFinite(operatorNetFeeTzs) || operatorNetFeeTzs <= 0) {
    return { grossTzs: 0, taxWithheldTzs: 0, netTzs: 0 };
  }
  if (!Number.isFinite(agentPct) || agentPct <= 0) {
    return { grossTzs: 0, taxWithheldTzs: 0, netTzs: 0 };
  }
  const grossTzs = Math.floor(operatorNetFeeTzs * (agentPct / 100));
  return splitWithholding(grossTzs, withholdingPct);
}

/**
 * The withholding leg on its own, for a gross figure already decided.
 *
 * ⭐ SEPARATE FROM `agentCommissionSplit` BECAUSE THE CAP RUNS BETWEEN THEM. The accrual
 * computes the gross, clamps it against the per-recruit budget, and only then withholds — so
 * it needs the tax step without re-deriving the gross from a fee it has already left behind.
 *
 * ⚠️ A withholding rate of 0 is a legitimate configuration (the tax is repealed, or the
 * operator is exempt) and must return the gross untouched rather than a zero payout.
 */
export function splitWithholding(
  grossTzs: number,
  withholdingPct: number,
): { grossTzs: number; taxWithheldTzs: number; netTzs: number } {
  const gross = Number.isFinite(grossTzs) && grossTzs > 0 ? Math.floor(grossTzs) : 0;
  if (gross <= 0) return { grossTzs: 0, taxWithheldTzs: 0, netTzs: 0 };
  if (!Number.isFinite(withholdingPct) || withholdingPct <= 0) {
    return { grossTzs: gross, taxWithheldTzs: 0, netTzs: gross };
  }
  // Clamped at 100: a rate above it would produce a negative payout, and a wallet credit of
  // a negative number is refused downstream — so it would surface as "no commission at all"
  // rather than as the misconfiguration it is.
  const pct = Math.min(withholdingPct, 100);
  const taxWithheldTzs = Math.round(gross * (pct / 100));
  return { grossTzs: gross, taxWithheldTzs, netTzs: gross - taxWithheldTzs };
}

/** The total fee rate the loser-share model charges, as a fraction. 3% + 10% = 13%. */
export function totalFeeRate(rates: Pick<WaterfallRates, "platformFeeRate" | "operatorFeeRate">): number {
  return rates.platformFeeRate + rates.operatorFeeRate;
}

/**
 * ⭐ MANAGEMENT'S TABLE, DERIVED — the eight rows, for a worked example of `winningsTzs`.
 *
 * ⚠️ IT IS AN ILLUSTRATION AND THE SURFACE MUST SAY SO. Nothing here is a forecast of what
 * any particular agent will earn: it is arithmetic on a round number, shown so a partner can
 * follow where each deduction comes from. `/agent` labels it as a worked example and — per
 * the gold discipline in `DESIGN_AUTHORITY.md` §B4 — renders every figure FLAT, because
 * gilding a projected amount promises in ink what no round has decided.
 *
 * ⚠️ THE BASE IS THE WINNINGS POOL, WHICH IS THE LOSING POOL. In a two-sided pool the losing
 * side's stakes are what the winners are paid from, so "the aggregate winnings your recruits
 * generated" and "the pool our fee is charged on" are the same shillings seen from two
 * sides. That is why management's 13%-of-winnings framing and the engine's
 * 13%-of-the-losing-pool implementation describe one number and not two.
 *
 * ⛔ THE ROWS ARE NOT INDEPENDENTLY ROUNDED FROM THE BASE. Each deduction is taken from the
 * figure the row above it actually carries, so the column adds up when a reader checks it
 * with a calculator. Deriving every row from `winningsTzs` in isolation is how a printed
 * table ends up off by a shilling and reads as a mistake in the money rather than in the
 * presentation.
 */
export function commissionWaterfall(
  winningsTzs: number,
  rates: WaterfallRates,
): { steps: WaterfallStep[]; netPayoutTzs: number; effectivePctOfWinnings: number } {
  const winnings = Number.isFinite(winningsTzs) && winningsTzs > 0 ? Math.floor(winningsTzs) : 0;
  const feeRate = totalFeeRate(rates);

  const grossFee = Math.round(winnings * feeRate);
  const tra = Math.round(grossFee * rates.traTaxOnCommissionRate);
  const gbt = Math.round(grossFee * rates.gbtLevyOnCommissionRate);
  const netFee = grossFee - tra - gbt;

  // ⭐ THE SAME FUNCTION THE WALLET IS CREDITED BY. Not a re-implementation of it.
  const split = agentCommissionSplit(netFee, rates.agentPct, rates.withholdingPct);

  const steps: WaterfallStep[] = [
    { id: "winnings", amountTzs: winnings, ratePct: null, deduction: false, subtotal: false },
    { id: "grossFee", amountTzs: grossFee, ratePct: feeRate * 100, deduction: false, subtotal: false },
    { id: "tra", amountTzs: tra, ratePct: rates.traTaxOnCommissionRate * 100, deduction: true, subtotal: false },
    { id: "gbt", amountTzs: gbt, ratePct: rates.gbtLevyOnCommissionRate * 100, deduction: true, subtotal: false },
    { id: "netFee", amountTzs: netFee, ratePct: null, deduction: false, subtotal: true },
    { id: "agentShare", amountTzs: split.grossTzs, ratePct: rates.agentPct, deduction: false, subtotal: false },
    { id: "withholding", amountTzs: split.taxWithheldTzs, ratePct: rates.withholdingPct, deduction: true, subtotal: false },
    { id: "netPayout", amountTzs: split.netTzs, ratePct: null, deduction: false, subtotal: true },
  ];

  return {
    steps,
    netPayoutTzs: split.netTzs,
    // What the partner actually keeps, per shilling of winnings their recruits generate. The
    // headline rate is a share of the NET FEE, which is a much smaller base than the pool —
    // so this is the number that answers "what does 10% really mean?" without anyone having
    // to divide two figures out of a table themselves.
    effectivePctOfWinnings: winnings > 0 ? (split.netTzs / winnings) * 100 : 0,
  };
}
