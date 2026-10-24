/**
 * THE STAKE-SHARE NOTICE — what every bet screen says, BEFORE the bet, on a market frozen under `stake-share` (programme
 * FEE-TAX-2026-10, release R2c; `docs/FEE-TAX-PLAN.md` §2 ruling 1: "a winner can get back less than their stake — the
 * bet screen warns before the bet").
 *
 * ⭐ ONE VIEW MODEL FOR EVERY BET SCREEN. The classic dial and its confirm (polls), the journey bet sheet, and Up & Down's
 * stake panels (the round page's confirm panel, the two-way control on the board and the round page, the journey arm)
 * each ask `stakeShareNotice` and draw what it answers, so no screen can warn on a market another screen calls fair, and
 * none can forget the standing line. `test:below-stake-warning` drives this function with each screen's own inputs and
 * reads each screen's source for the call.
 *   · `null` — the market froze another model (`loser-share`, `capped-commission`, or a snapshot with no model at all):
 *     NOTHING new is said, so a legacy market keeps today's figures and words byte for byte.
 *   · otherwise the screen ALWAYS draws the standing line (`market.ssStanding`: a winning bet can return less than its
 *     stake when its side ends much bigger), and:
 *       `noTaker` — the other side holds nothing yet: if nobody takes it the market is one-sided and every stake comes
 *                   back in full at no fee (ruling 2), so the screen says so (`market.ssNoTaker`);
 *       `quote`   — this stake's figures: our fee on it, its net stake in the pool, and — if its side wins — its payout
 *                   and its share of the winnings tax withheld for TRA;
 *       `below`   — the AMBER warning, exactly when that payout is under the stake: "if this side wins you get back about
 *                   TZS X for your TZS Y — less than you bet — because the other side is small". Never on a book with no
 *                   taker (it refunds), never red, never "you may lose".
 *
 * ⛔ EVERY FIGURE IS THE ENGINE'S. The payout is `payoutFor` — the projection the bet path quotes (`projectedPayout`) and
 * the very arithmetic settlement is built on (`stakeShareTotals`); the fee is `roundHalfUpBp` at the market's frozen rate,
 * in the whole basis points the split charges; the tax is this stake's share of the market's T. Nothing here restates a
 * rate, and no figure is printed that the engine did not give.
 * ⛔ TOTAL: IT NEVER THROWS (the review of R2a, finding 2: a projection must never take a screen down). A rate set the
 * engine refuses — a corrupt snapshot, a stake-share profile with no tax — answers the standing line and no figure.
 *
 * Pure and client-safe: it imports `@/lib/payout` and nothing else (`test:client-graph-safe`).
 */
import { payoutFor, roundHalfUpBp, stakeFeeBp, stakeSharePct, winningsTaxPct, type FeeRates, type Side } from "@/lib/payout";

/** One stake's figures on a stake-share market, all whole shillings. */
export type StakeShareQuote = {
  /** The stake as the player chose it. */
  stake: number;
  /** Our fee on it: the market's frozen rate of every stake, rounded half up (13% of 1,000 = 130). */
  fee: number;
  /** stake − fee: what enters the pool. */
  net: number;
  /** If this side wins: `payoutFor`'s projection — the net stake back plus its share of the prize after the tax. */
  payout: number;
  /** If this side wins: this stake's share of the winnings tax withheld for TRA (0 on a book with no taker). */
  tax: number;
};

export type StakeShareNotice = {
  /** `{fee}` — the market's frozen fee on every stake, as copy prints it (13); null for a rate set the engine refuses. */
  feePct: number | null;
  /** `{tax}` — the market's frozen winnings tax (15); null when it carries none or the engine refuses it. */
  taxPct: number | null;
  /** The other side holds nothing yet: a full refund if nobody takes it (ruling 2). */
  noTaker: boolean;
  /** This stake's figures, or null (no usable stake, or a rate set the engine refuses). */
  quote: StakeShareQuote | null;
  /** The amber warning: the projected payout is under the stake. Null otherwise — and always on a book with no taker. */
  below: { payout: number; stake: number } | null;
};

export type StakeShareNoticeInput = {
  /** The pools BEFORE this bet (a pre-bet screen): `payoutFor` adds the stake to its side. */
  yesPool: number;
  noPool: number;
  side: Side;
  /** The stake as the screen holds it; anything but a whole positive number prices nothing. */
  stake: number | null | undefined;
  /** The market's FROZEN rates (`feeSnapshot`), never the live config. */
  rates: Partial<FeeRates> | null | undefined;
};

/** A pool as the arithmetic reads it: never negative. A fractional one stays fractional, and the engine refuses it. */
const pool = (n: number): number => (Number.isFinite(n) && n > 0 ? n : 0);

/**
 * Is this rate set FROZEN under `stake-share`? Read off the snapshot's own model, which is exact for this one model: a
 * snapshot names `stake-share` only when `snapshotFromConfig` stamped it, and an ABSENT model is `capped-commission`
 * (the no-mix rule, `payout.ts → readFeeModel`) — never this one. Unlike `resolveFeeModel` it cannot throw, so a corrupt
 * stake-share snapshot still gets its standing line.
 */
export function isStakeShareRates(rates: Partial<FeeRates> | null | undefined): boolean {
  return rates?.feeModel === "stake-share";
}

/** ⭐ THE NOTICE for one side of one market at one stake — null unless the market froze `stake-share`. Never throws. */
export function stakeShareNotice(input: StakeShareNoticeInput): StakeShareNotice | null {
  const rates = input.rates ?? null;
  if (!rates || !isStakeShareRates(rates)) return null;
  const yes = pool(input.yesPool);
  const no = pool(input.noPool);
  const noTaker = (input.side === "YES" ? no : yes) <= 0;

  let feeBp: number | null = null;
  let feePct: number | null = null;
  let taxPct: number | null = null;
  try {
    feeBp = stakeFeeBp(rates);
    feePct = stakeSharePct(rates);
    taxPct = winningsTaxPct(rates);
  } catch {
    // A rate set the engine refuses: the standing line alone, no figure.
    return { feePct: null, taxPct: null, noTaker, quote: null, below: null };
  }

  const stake = input.stake;
  let quote: StakeShareQuote | null = null;
  if (feeBp !== null && typeof stake === "number" && Number.isSafeInteger(stake) && stake > 0) {
    try {
      const r = payoutFor({ yesPool: yes, noPool: no, side: input.side, stake }, rates);
      const fee = roundHalfUpBp(stake, feeBp);
      // The tax this stake would carry if its side won: its share of the winning side, times the market's T. On a book
      // with no taker there is no T — the one-sided mirror quotes the stake back, as settlement refunds it (ruling 2).
      const tax = noTaker ? 0 : Math.round(r.share * (r.fee.winningsTax ?? 0));
      quote = { stake, fee, net: stake - fee, payout: r.payout, tax };
    } catch {
      quote = null;
    }
  }
  const below = quote && !noTaker && quote.payout < quote.stake ? { payout: quote.payout, stake: quote.stake } : null;
  return { feePct, taxPct, noTaker, quote, below };
}

/**
 * The notice for a TWO-WAY control — one that offers both sides at one stake (Up & Down's board card and the round page
 * with no side chosen). The standing line and the refund line are the round's; the warning names the side whose win
 * would pay back less than the stake, if either would. (Only the bigger side can: the smaller one's prize is the bigger
 * side's net stakes.) Null unless the market froze `stake-share`. Never throws.
 */
export function stakeShareNoticeEitherSide(input: Omit<StakeShareNoticeInput, "side">): (StakeShareNotice & { belowSide: Side | null }) | null {
  const yes = stakeShareNotice({ ...input, side: "YES" });
  const no = stakeShareNotice({ ...input, side: "NO" });
  if (!yes || !no) return null;
  const pick = yes.below ? { side: "YES" as const, n: yes } : no.below ? { side: "NO" as const, n: no } : null;
  return {
    feePct: yes.feePct,
    taxPct: yes.taxPct,
    // A two-way control's refund line is the round's: true when EITHER side is empty (one-sided, or nobody yet).
    noTaker: yes.noTaker || no.noTaker,
    quote: pick ? pick.n.quote : null,
    below: pick ? pick.n.below : null,
    belowSide: pick ? pick.side : null,
  };
}
