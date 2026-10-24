/**
 * THE JOURNEY'S ESTIMATE — the "≈{mult}× dau lako" the bet sheet prints, and the states a card's words come from (the Vodacom plan S3,
 * `docs/VODACOM-PLAN.md` §3.1; rulings SJ-1, SJ-2, SJ-3 in the v5 INHERIT-MANIFEST).
 *
 * ── WHAT EACH SURFACE SHOWS ──────────────────────────────────────────────────────────────────────────────────────
 *  · THE CARD (stake 0, SJ-1): the ZERO-STAKE pool multiple, 1 + (1 − loser-share)·opposite/own — what TZS 1 on this
 *    side returns if it wins and nobody else bets — rounded HALF-UP to tenths in EXACT integer arithmetic. The deck:
 *    Dodoma YES 24,825 / NO 50,462 at 13% reads ≈2.8× on the YES button and ≈1.4× on the NO one.
 *    ⭐ UNDER `stake-share` (FEE-TAX-2026-10, R2c) the fee comes out of every stake and a tax out of the prize, so the card's
 *    multiple is (1 − f) + (1 − f)(1 − t)·opposite/own — f and t the market's frozen fee and winnings tax, in the whole
 *    basis points the split charges, the same exact half-up — and it CAN be under 1×: 100,000 against 10,000 reads ≈0.9×
 *    (ruling 1). Its `lean` is then `below`, and the sheet warns before the bet (`stake-share-notice.ts`).
 *    ⚠️ PRINTED NOWHERE SINCE ALI'S RULING OF 2026-10-19 (COMPLIANCE-DECISIONS, MOBILE-VISUAL U43: no odds on any card
 *    choice). A card reads only this estimate's `state` and `emptySide` (`card-face.ts`) and says words.
 *  · THE SHEET (the entered stake, SJ-2): the whole-TZS figure is `payoutFor()` at that stake — the SAME call
 *    `projectedPayout` makes on the server and settlement pays with, so it equals the stored `potentialPayout` — and
 *    "≈N.N×" is derived from THAT figure, half-up. Dodoma at TZS 1,000 → TZS 2,700 ≈2.7×; at 5,000 → TZS 12,360 ≈2.5×.
 *    The stake-0 ≈2.8× and the sheet's ≈2.7× differ on purpose: the player's own stake dilutes their side.
 *
 * ⛔ HALF-UP IS A SCOPED EXCEPTION (SJ-2). The platform's rule for a payout estimate is to FLOOR (never nudge a
 * figure upwards — the rule Up & Down's printed `× N` followed until Ali's ruling of 2026-10-14 took every multiple
 * off its surfaces). The journey's figures carry "≈" and must read exactly as the deck, which is half-up; that
 * exception is ruled, and it lives only here.
 *
 * ── WHEN THERE IS NO FIGURE ───────────────────────────────────────────────────────────────────────────────────────
 * `state` says why, and the surface prints words instead of a number — never a guess:
 *   closed          the market takes no bets now;
 *   emptyPool       nobody has bet on either side — any stake would come back;
 *   oneSidedRefund  the OTHER side is empty: if nothing changes the market refunds everyone ("Upande mmoja tu");
 *   fillsEmptySide  THIS side is empty: the card says "Kuwa wa kwanza", never a figure; the sheet, at a real stake,
 *                   does show one (after the bet both sides hold money) unless the figure is hidden;
 *   hidden          a legacy capped-commission market (its surfaces show the `describeFeeModel` caption, SJ-3), or
 *                   the market's frozen display switch `showEstimatedWinnings` is off, or it carries no rates — or rates
 *                   the engine refuses (a corrupt snapshot, a stake-share one without its tax): never a guess;
 *   invalidStake    the sheet's stake is not a whole number inside the market's bounds;
 *   priced          a figure.
 * `emptySide` is a FACT about the pool, reported whatever the display switch says (the Up & Down rule: a switch that
 * hides a multiplier may never hide that a side is empty).
 *
 * ⚠️ ABOVE `ESTIMATE_DISPLAY_CAP` (100) the multiple is not printed: `overCap` is set, and {cap} is read from here — never
 * typed into the dictionary (`test:rate-copy`). What each surface prints over the cap (S8-PLAN Correction 20):
 *   · THE CARD prints no number at all — its side word alone (its over-cap words, `journey.cardOverCap`, left with every
 *     card figure on 2026-10-19);
 *   · THE SHEET prints the whole-TZS `payout` (still `payoutFor`'s figure) and `journey.estimatePillOver`
 *     ("≈ zaidi ya {cap}× dau lako") in place of the multiple's pill.
 *
 * ── WHY IT IMPORTS `payout.ts` (a recorded deviation from §3.1's "import-free") ─────────────────────────────────
 * §3.1 asked for an import-free module so the card can run it on the client. `@/lib/payout` is itself import-free and
 * isomorphic, and routing through it is the only way the sheet's figure IS the server's figure rather than a second
 * formula that agrees today — the lesson `updown-pricing.ts` records ("ONE FUNCTION, NOT A SECOND OPINION"). The file
 * stays client-safe and is pinned in `test:client-graph-safe`.
 *
 * Up & Down rounds are not cards and are out of the journey's estimate: an UPDOWN market gets `null`.
 */
import {
  DEFAULT_FEE_MODEL, DEFAULT_OPERATOR_FEE_RATE, DEFAULT_PLATFORM_FEE_RATE, DEFAULT_SHOW_ESTIMATED_WINNINGS,
  leanFor, loserSharePct, loserShareRate, payoutFor, resolveFeeModel, stakeFeeBp, stakeSharePct, THIN_PROFIT_RATIO,
  winningsTaxBp, winningsTaxPct, type FeeModel, type LeanLevel, type PollRates, type Side,
} from "@/lib/payout";

/** Above this multiple no figure is printed — "zaidi ya {cap}×" (SJ-1). The ONE place the cap is written. */
export const ESTIMATE_DISPLAY_CAP = 100;

/**
 * EXACTLY the frozen rates the estimate reads — nothing more crosses to the browser. A `Pick` of the poll's own
 * snapshot fields, so it cannot drift from the real rate names.
 * ⭐ `winningsTaxRate` (FEE-TAX-2026-10): a stake-share market's projection REFUSES without its frozen tax, so it crosses
 * too — on a stake-share snapshot only; every other pick is exactly what it was.
 */
export type EstimateRates = Partial<Pick<
  PollRates,
  "feeModel" | "commissionRate" | "feeCeilingRate" | "platformFeeRate" | "operatorFeeRate" | "showEstimatedWinnings" | "thinProfitRatio"
  | "winningsTaxRate"
>>;

/** The estimate's rates out of a poll's frozen rates (`market.feeSnapshot`, or the `PollRates` a page already holds). */
export function pickEstimateRates(src: Partial<PollRates> | null | undefined): EstimateRates | null {
  if (!src || typeof src !== "object") return null;
  return {
    feeModel: src.feeModel,
    commissionRate: src.commissionRate,
    feeCeilingRate: src.feeCeilingRate,
    platformFeeRate: src.platformFeeRate,
    operatorFeeRate: src.operatorFeeRate,
    showEstimatedWinnings: src.showEstimatedWinnings,
    thinProfitRatio: src.thinProfitRatio,
    // Only a stake-share snapshot carries it (`snapshotFromConfig`), so an older market's pick — and the seed a card
    // renders from it — is byte for byte what it was.
    ...(src.winningsTaxRate !== undefined ? { winningsTaxRate: src.winningsTaxRate } : {}),
  };
}

/** The model a rate set resolves to, or null when the engine refuses it (an unknown model, a corrupt stake-share set). */
function modelOf(rates: EstimateRates | null): FeeModel | null {
  if (!rates) return null;
  try { return resolveFeeModel(rates); } catch { return null; }
}

/**
 * `{pct}` — the market's own fee as its copy prints it, per its frozen model: the loser-share total (13 · 12.5), or the
 * stake-share fee on every stake (13 · 12.75); null under capped-commission (its surfaces show the `describeFeeModel`
 * caption, SJ-3) and for a rate set the engine refuses. ⛔ Never `commissionRate`, never a default.
 */
export function feePctFor(rates: EstimateRates | null | undefined): number | null {
  const r = rates ?? null;
  const model = modelOf(r);
  try {
    return model === "loser-share" ? loserSharePct(r ?? undefined) : model === "stake-share" ? stakeSharePct(r ?? undefined) : null;
  } catch {
    return null;
  }
}

/** `{tax}` — a stake-share market's frozen winnings tax (15); null under every other model and when none is frozen. */
export function taxPctFor(rates: EstimateRates | null | undefined): number | null {
  try { return winningsTaxPct(rates ?? undefined); } catch { return null; }
}

export type EstimateState = "priced" | "fillsEmptySide" | "oneSidedRefund" | "emptyPool" | "hidden" | "closed" | "invalidStake";

export type Estimate = {
  state: EstimateState;
  /** Whole TZS the stake returns if the side wins (`payoutFor`) — the sheet only; null on a card and with no figure. */
  payout: number | null;
  /** The multiple in tenths, half-up (28 ⇒ ≈2.8×); null when no figure is printed (and when `overCap`). */
  multTenths: number | null;
  /** The multiple as printed ("2.8"); the cap ("100") when `overCap`; null when no figure is printed. */
  multText: string | null;
  /** The multiple is above `ESTIMATE_DISPLAY_CAP`: print "zaidi ya {cap}×", not a figure. */
  overCap: boolean;
  /** `{pct}` — the market's frozen fee per its model (`feePctFor`): the loser-share total (13 · 12.5), or under `stake-share`
   *  the fee on every stake (13); null under capped-commission (SJ-3). */
  feePct: number | null;
  /** `{tax}` — a stake-share market's frozen winnings tax (15); null under every other model (FEE-TAX-2026-10). */
  taxPct: number | null;
  /** `leanFor` over the multiple — the thin-upside notice's trigger, and under `stake-share` `below` when the multiple is
   *  under 1×; null when no figure is printed. */
  lean: LeanLevel | null;
  /** The side nobody has backed ("BOTH" = an empty pool) — a fact, never hidden by the display switch. */
  emptySide: Side | "BOTH" | null;
};

export type EstimateInput = {
  yesPool: number;
  noPool: number;
  rates: EstimateRates | null | undefined;
  side: Side;
  /** 0 = the card's zero-stake figure (SJ-1); a positive whole number = the sheet at that stake (SJ-2). */
  stake: number;
  /** The market takes bets now (LIVE and selection not closed) — decided by the caller, which holds the clock. */
  bettable: boolean;
  /** The market's stake bounds (`stakeBoundsForMarket`) — the sheet only. */
  bounds?: { min: number; max: number } | null;
  /** An UPDOWN round gets no journey estimate. */
  productLine?: string | null;
};

/** Rate precision for the exact card arithmetic: parts per million (13% = 130,000). */
const RATE_SCALE = 1_000_000;
/** The stake-share card's precision: WHOLE BASIS POINTS, the unit its split charges in (13% = 1,300 of 10,000). */
const BP_SCALE = 10_000;

/** floor(10·num/den + ½) — half-up tenths, EXACT for any whole numbers (BigInt: no float can round it the wrong way). */
function halfUpTenths(num: bigint, den: bigint): number {
  return Number((BigInt(20) * num + den) / (BigInt(2) * den));
}

/** A pool as the arithmetic reads it: a non-negative whole number of shillings. */
const tzs = (n: number): number => (Number.isFinite(n) && n > 0 ? Math.round(n) : 0);

const text = (tenths: number): string => `${Math.floor(tenths / 10)}.${tenths % 10}`;

/**
 * ⭐ THE ESTIMATE for one side of one market. Total: never throws — a figure it cannot honestly print is a state.
 * `null` only for an Up & Down round.
 */
export function estimateFor(input: EstimateInput): Estimate | null {
  // A poll only (S0.5): never a round, and never a Millionea ticket — a held ticket never shows a figure it might win.
  if (input.productLine === "UPDOWN" || input.productLine === "MASWALI") return null;
  const yes = tzs(input.yesPool);
  const no = tzs(input.noPool);
  const own = input.side === "YES" ? yes : no;
  const opp = input.side === "YES" ? no : yes;
  const rates = input.rates ?? null;
  const emptySide: Estimate["emptySide"] = yes === 0 && no === 0 ? "BOTH" : yes === 0 ? "YES" : no === 0 ? "NO" : null;
  const feePct = feePctFor(rates);
  const taxPct = taxPctFor(rates);
  const none = (state: EstimateState): Estimate =>
    ({ state, payout: null, multTenths: null, multText: null, overCap: false, feePct, taxPct, lean: null, emptySide });

  if (!input.bettable) return none("closed");
  if (own === 0 && opp === 0) return none("emptyPool");
  if (opp === 0) return none("oneSidedRefund");

  const card = input.stake === 0;
  // FEE-TAX-2026-10 · two models price a figure: loser-share (SJ-1/SJ-2) and stake-share (its own card arithmetic below,
  // and the same `payoutFor` on the sheet). Capped-commission, an unknown model and a rate set the engine refuses are
  // `hidden` — and so is a stake-share set with no frozen tax (`winningsTaxBp` null), whose projection the engine refuses.
  const model = modelOf(rates);
  const stakeShare = model === "stake-share";
  const ssBp = stakeShare ? stakeShareBp(rates) : null;
  const hidden = !rates || (model !== "loser-share" && !(stakeShare && ssBp !== null)) || rates.showEstimatedWinnings === false;
  const stakeOk = card || (
    Number.isSafeInteger(input.stake) && input.stake > 0
    && (!input.bounds || (input.stake >= input.bounds.min && input.stake <= input.bounds.max))
  );

  // THIS side is empty. The card never prints a figure for it ("Kuwa wa kwanza"); the sheet prints one at a real stake.
  if (own === 0 && (card || hidden || !stakeOk)) return none("fillsEmptySide");
  if (hidden) return none("hidden");
  if (!stakeOk) return none("invalidStake");

  const state: EstimateState = own === 0 ? "fillsEmptySide" : "priced";
  const thin = rates?.thinProfitRatio ?? THIN_PROFIT_RATIO;
  let payout: number | null = null;
  let tenths: number;
  let ratio: number;
  if (card && ssBp !== null) {
    // stake-share (FEE-TAX-2026-10), exactly: (1 − f) + (1 − f)(1 − t)·opp/own, in whole basis points —
    // 10·((S − f)·S·own + (S − f)(S − t)·opp) / (S·S·own), half-up. It can be under 1× (ruling 1).
    const S = BigInt(BP_SCALE);
    const f = BigInt(ssBp.feeBp);
    const t = BigInt(ssBp.taxBp);
    const num = (S - f) * S * BigInt(own) + (S - f) * (S - t) * BigInt(opp);
    const den = S * S * BigInt(own);
    tenths = halfUpTenths(num, den);
    ratio = Number(num) / Number(den);
  } else if (card) {
    // SJ-1, exactly: 10·(own·S + (S − k)·opp) / (own·S), half-up, where k/S is the loser-share rate `poolFee` uses.
    const k = BigInt(Math.round((loserShareRate(rates) ?? 0) * RATE_SCALE));
    const S = BigInt(RATE_SCALE);
    const num = BigInt(own) * S + (S - k) * BigInt(opp);
    const den = BigInt(own) * S;
    tenths = halfUpTenths(num, den);
    ratio = Number(num) / Number(den);
  } else {
    // SJ-2: the server's own figure, then the multiple FROM that whole-TZS figure. Under stake-share it is the same call:
    // the projection `projectedPayout` makes, net of the fee on every stake and of the winnings tax.
    try {
      payout = payoutFor({ yesPool: yes, noPool: no, side: input.side, stake: input.stake }, rates).payout;
    } catch {
      return none("hidden"); // the engine refused the inputs — a figure it will not give is never printed, never a dark sheet
    }
    tenths = halfUpTenths(BigInt(payout), BigInt(input.stake));
    ratio = payout / input.stake;
  }
  const overCap = tenths > ESTIMATE_DISPLAY_CAP * 10;
  return {
    state,
    payout,
    multTenths: overCap ? null : tenths,
    multText: overCap ? String(ESTIMATE_DISPLAY_CAP) : text(tenths),
    overCap,
    feePct,
    taxPct,
    // Under stake-share a multiple under 1× is `below` (`leanFor`); under the older models it never is.
    lean: leanFor(ratio, thin),
    emptySide,
  };
}

/** A stake-share rate set's fee and tax in whole basis points, or null when the engine refuses it or it freezes no tax. */
function stakeShareBp(rates: EstimateRates | null): { feeBp: number; taxBp: number } | null {
  try {
    const feeBp = stakeFeeBp(rates ?? undefined);
    const taxBp = winningsTaxBp(rates ?? undefined);
    return feeBp === null || taxBp === null ? null : { feeBp, taxBp };
  } catch {
    return null;
  }
}

/**
 * The card's estimate (SJ-1): the zero-stake multiple, whose STATE and `emptySide` decide a journey card's words (it
 * prints no figure since Ali's ruling of 2026-10-19). `null` for an Up & Down round.
 */
export function cardEstimate(
  market: { yesPool: number; noPool: number; productLine?: string | null },
  rates: EstimateRates | null | undefined,
  side: Side,
  bettable: boolean,
): Estimate | null {
  return estimateFor({ yesPool: market.yesPool, noPool: market.noPool, productLine: market.productLine, rates, side, stake: 0, bettable });
}

/** The How to Play example's shape: a fixed illustrative pool, a side, a stake, and the rates it is priced at. */
export type HowToExample = Readonly<{ yesPool: number; noPool: number; side: Side; stake: number; rates: EstimateRates }>;

/**
 * The How to Play example (SJ-21): a FIXED illustrative pool and stake — the deck's Dodoma market, YES 24,825 / NO 50,462,
 * TZS 1,000 on YES — PRICED AT THE RATES IT IS HANDED (FEE-TAX-2026-10, R2c): the live config's, which is what a market
 * created now would freeze, so the example teaches the law new markets carry and never a rate typed here. Under today's
 * loser-share 3% + 10% it renders TZS 1,000 → ≈2.7× → TZS 2,700; under stake-share it renders that law's own figure,
 * net of the fee on every stake and the winnings tax. `estimateFor` prices it — never a second formula.
 * ⛔ No rate is written here: a rate set with nothing usable in it is handed back as given, and the engine prices it or
 * hides it (`hidden`), exactly as it would a market's.
 */
export function howToExampleFor(rates: EstimateRates | null | undefined): HowToExample {
  return { yesPool: 24_825, noPool: 50_462, side: "YES", stake: 1_000, rates: rates ?? {} };
}

/**
 * The example at the platform's COLD-START rates (`payout.ts`'s named defaults — the rates a config that has never been
 * saved holds), for a surface that has no live config in hand. `test:journey-estimate` pins what it renders:
 * TZS 1,000 → ≈2.7× → TZS 2,700. ⚠️ Not the live rates: a surface that can read them passes them to `howToExampleFor`.
 */
export const HOW_TO_EXAMPLE: HowToExample = howToExampleFor({
  feeModel: DEFAULT_FEE_MODEL,
  platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
  operatorFeeRate: DEFAULT_OPERATOR_FEE_RATE,
  showEstimatedWinnings: DEFAULT_SHOW_ESTIMATED_WINNINGS,
});
