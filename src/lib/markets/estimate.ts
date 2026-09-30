/**
 * THE JOURNEY'S ESTIMATE — the "Shinda ≈{mult}× dau" a card and the bet sheet print (the Vodacom plan S3,
 * `docs/VODACOM-PLAN.md` §3.1; rulings SJ-1, SJ-2, SJ-3 in the v5 INHERIT-MANIFEST).
 *
 * ── WHAT EACH SURFACE SHOWS ──────────────────────────────────────────────────────────────────────────────────────
 *  · THE CARD (stake 0, SJ-1): the ZERO-STAKE pool multiple, 1 + (1 − loser-share)·opposite/own — what TZS 1 on this
 *    side returns if it wins and nobody else bets — rounded HALF-UP to tenths in EXACT integer arithmetic. The deck:
 *    Dodoma YES 24,825 / NO 50,462 at 13% reads ≈2.8× on the YES button and ≈1.4× on the NO one.
 *  · THE SHEET (the entered stake, SJ-2): the whole-TZS figure is `payoutFor()` at that stake — the SAME call
 *    `projectedPayout` makes on the server and settlement pays with, so it equals the stored `potentialPayout` — and
 *    "≈N.N×" is derived from THAT figure, half-up. Dodoma at TZS 1,000 → TZS 2,700 ≈2.7×; at 5,000 → TZS 12,360 ≈2.5×.
 *    The card's ≈2.8× and the sheet's ≈2.7× differ on purpose: the player's own stake dilutes their side.
 *
 * ⛔ HALF-UP IS A SCOPED EXCEPTION (SJ-2). The platform's rule for a payout estimate is to FLOOR (never nudge a
 * figure upwards — `formatMultiplier` in `updown-pricing.ts`), and Up & Down keeps it. The journey's figures carry
 * "≈" and must read exactly as the deck, which is half-up; that exception is ruled, and it lives only here.
 *
 * ── WHEN THERE IS NO FIGURE ───────────────────────────────────────────────────────────────────────────────────────
 * `state` says why, and the surface prints words instead of a number — never a guess:
 *   closed          the market takes no bets now;
 *   emptyPool       nobody has bet on either side — any stake would come back;
 *   oneSidedRefund  the OTHER side is empty: if nothing changes the market refunds everyone ("Upande mmoja tu");
 *   fillsEmptySide  THIS side is empty: the card says "Kuwa wa kwanza", never a figure; the sheet, at a real stake,
 *                   does show one (after the bet both sides hold money) unless the figure is hidden;
 *   hidden          a legacy capped-commission market (its surfaces show the `describeFeeModel` caption, SJ-3), or
 *                   the market's frozen display switch `showEstimatedWinnings` is off, or it carries no rates;
 *   invalidStake    the sheet's stake is not a whole number inside the market's bounds;
 *   priced          a figure.
 * `emptySide` is a FACT about the pool, reported whatever the display switch says (the Up & Down rule: a switch that
 * hides a multiplier may never hide that a side is empty).
 *
 * ⚠️ ABOVE `ESTIMATE_DISPLAY_CAP` (100) the figure is not printed: `overCap` is set and the surface says "Shinda
 * zaidi ya {cap}× dau", with {cap} read from here — never typed into the dictionary (`test:rate-copy`).
 *
 * ── WHY IT IMPORTS `payout.ts` (a recorded deviation from §3.1's "import-free") ─────────────────────────────────
 * §3.1 asked for an import-free module so the card can run it on the client. `@/lib/payout` is itself import-free and
 * isomorphic, and routing through it is the only way the sheet's figure IS the server's figure rather than a second
 * formula that agrees today — the lesson `updown-pricing.ts` records ("ONE FUNCTION, NOT A SECOND OPINION"). The file
 * stays client-safe and is pinned in `test:client-graph-safe`.
 *
 * Up & Down rounds are not cards and are out of the journey's estimate: an UPDOWN market gets `null`.
 */
import { leanFor, loserSharePct, loserShareRate, payoutFor, resolveFeeModel, THIN_PROFIT_RATIO, type LeanLevel, type PollRates, type Side } from "@/lib/payout";

/** Above this multiple no figure is printed — "zaidi ya {cap}×" (SJ-1). The ONE place the cap is written. */
export const ESTIMATE_DISPLAY_CAP = 100;

/**
 * EXACTLY the frozen rates the estimate reads — nothing more crosses to the browser. A `Pick` of the poll's own
 * snapshot fields, so it cannot drift from the real rate names.
 */
export type EstimateRates = Partial<Pick<
  PollRates,
  "feeModel" | "commissionRate" | "feeCeilingRate" | "platformFeeRate" | "operatorFeeRate" | "showEstimatedWinnings" | "thinProfitRatio"
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
  };
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
  /** `{pct}` — the market's frozen loser-share total (13 · 12.5); null under capped-commission (SJ-3). */
  feePct: number | null;
  /** `leanFor` over the multiple — the thin-upside notice's trigger; null when no figure is printed. */
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
  if (input.productLine === "UPDOWN") return null;
  const yes = tzs(input.yesPool);
  const no = tzs(input.noPool);
  const own = input.side === "YES" ? yes : no;
  const opp = input.side === "YES" ? no : yes;
  const rates = input.rates ?? null;
  const emptySide: Estimate["emptySide"] = yes === 0 && no === 0 ? "BOTH" : yes === 0 ? "YES" : no === 0 ? "NO" : null;
  const feePct = rates ? loserSharePct(rates) : null;
  const none = (state: EstimateState): Estimate =>
    ({ state, payout: null, multTenths: null, multText: null, overCap: false, feePct, lean: null, emptySide });

  if (!input.bettable) return none("closed");
  if (own === 0 && opp === 0) return none("emptyPool");
  if (opp === 0) return none("oneSidedRefund");

  const card = input.stake === 0;
  const hidden = !rates || resolveFeeModel(rates) !== "loser-share" || rates.showEstimatedWinnings === false;
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
  if (card) {
    // SJ-1, exactly: 10·(own·S + (S − k)·opp) / (own·S), half-up, where k/S is the loser-share rate `poolFee` uses.
    const k = BigInt(Math.round((loserShareRate(rates) ?? 0) * RATE_SCALE));
    const S = BigInt(RATE_SCALE);
    const num = BigInt(own) * S + (S - k) * BigInt(opp);
    const den = BigInt(own) * S;
    tenths = halfUpTenths(num, den);
    ratio = Number(num) / Number(den);
  } else {
    // SJ-2: the server's own figure, then the multiple FROM that whole-TZS figure.
    try {
      payout = payoutFor({ yesPool: yes, noPool: no, side: input.side, stake: input.stake }, rates).payout;
    } catch {
      return none("hidden"); // `assertWinnerFloor` threw — unreachable under the clamped rates; never a dark sheet
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
    lean: leanFor(ratio, thin),
    emptySide,
  };
}

/** The card's figure (SJ-1): the zero-stake multiple. `null` for an Up & Down round. */
export function cardEstimate(
  market: { yesPool: number; noPool: number; productLine?: string | null },
  rates: EstimateRates | null | undefined,
  side: Side,
  bettable: boolean,
): Estimate | null {
  return estimateFor({ yesPool: market.yesPool, noPool: market.noPool, productLine: market.productLine, rates, side, stake: 0, bettable });
}

/**
 * The How to Play example (SJ-21): a FIXED illustrative pool that renders TZS 1,000 → ≈2.7× → TZS 2,700 — the deck's
 * Dodoma market at the default 13% loser-share. `test:journey-estimate` pins what it renders.
 */
export const HOW_TO_EXAMPLE: Readonly<{
  yesPool: number; noPool: number; side: Side; stake: number; rates: EstimateRates;
}> = {
  yesPool: 24_825,
  noPool: 50_462,
  side: "YES",
  stake: 1_000,
  rates: { feeModel: "loser-share", platformFeeRate: 0.03, operatorFeeRate: 0.10, showEstimatedWinnings: true },
};
